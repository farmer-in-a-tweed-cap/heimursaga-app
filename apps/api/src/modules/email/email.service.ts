import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OnEvent } from '@nestjs/event-emitter';
import { SponsorshipStatus, SponsorshipType } from '@repo/types';
import * as nodemailer from 'nodemailer';

import { getStaticMediaUrl } from '@/lib/upload';

import { EMAIL_TEMPLATES, getEmailTemplate } from '@/common/email-templates';
import { ServiceException } from '@/common/exceptions';
import { EVENTS, IEventSendEmail } from '@/modules/event';
import { Logger } from '@/modules/logger';
import { PrismaService } from '@/modules/prisma';

import { IEmailSendPayload } from './email.interface';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor(
    private config: ConfigService,
    private logger: Logger,
    private prisma: PrismaService,
  ) {
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD } = process.env;

    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: true,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASSWORD,
      },
    } as nodemailer.TransportOptions);

    this.transporter = transporter;
  }

  async send(options: IEmailSendPayload): Promise<void> {
    try {
      const { to, subject, text, html } = options;

      const from = process.env.SMTP_EMAIL_FROM;

      this.logger.log(
        JSON.stringify({ to, from, subject, text, html }, null, 2),
      );

      await this.transporter.sendMail({
        to,
        from,
        subject,
        text,
        html,
      });
    } catch (e) {
      this.logger.error(e);
      if (e.status) throw e;
    }
  }

  @OnEvent(EVENTS.SEND_EMAIL)
  async onSend(event: IEventSendEmail): Promise<void> {
    try {
      this.logger.log(`[SEND_EMAIL] Event received:`, {
        to: event.to,
        template: event.template,
      });

      const { to, vars } = event;

      // get the template
      const templateKey = event.template;
      const template = templateKey ? getEmailTemplate(templateKey, vars) : null;

      // send the email
      if (template) {
        const { subject, html } = template;
        this.logger.log(
          `[SEND_EMAIL] Sending templated email to: ${to}, subject: ${subject}`,
        );
        await this.send({
          to,
          subject,
          html,
        });
        this.logger.log(`[SEND_EMAIL] Email sent successfully to: ${to}`);
      } else {
        const { subject, text, html } = event;

        this.logger.log(
          `[SEND_EMAIL] Sending custom email to: ${to}, subject: ${subject}`,
        );
        await this.send({
          to,
          subject,
          text: html ? undefined : text,
          html: html ? html : undefined,
        });
        this.logger.log(`[SEND_EMAIL] Email sent successfully to: ${to}`);
      }
    } catch (e) {
      this.logger.error(`[SEND_EMAIL] Error sending email:`, e);
    }
  }

  @OnEvent(EVENTS.ENTRY_CREATED)
  async onEntryCreated(event: {
    entryId: string;
    creatorId: number;
    entryTitle: string;
    entryContent: string;
    entryPlace?: string;
    entryDate: Date;
  }): Promise<void> {
    try {
      const {
        entryId,
        creatorId,
        entryTitle,
        entryContent,
        entryPlace,
        entryDate,
      } = event;

      this.logger.log(
        `Processing entry delivery for entry ${entryId} from creator ${creatorId}`,
      );

      // Get creator info
      const creator = await this.prisma.explorer.findUnique({
        where: { id: creatorId },
        select: {
          username: true,
          profile: { select: { name: true, picture: true } },
        },
      });

      if (!creator) {
        this.logger.error(`Creator not found: ${creatorId}`);
        return;
      }

      // Get entry details with media and waypoint
      const entry = await this.prisma.entry.findFirst({
        where: { public_id: entryId },
        select: {
          id: true,
          public_id: true,
          title: true,
          content: true,
          place: true,
          date: true,
          sponsored: true,
          waypoint: {
            select: {
              lat: true,
              lon: true,
            },
          },
          media: {
            select: {
              upload: {
                select: {
                  public_id: true,
                  original: true,
                  file_type: true,
                },
              },
            },
          },
        },
      });

      if (!entry) {
        this.logger.error(`Entry not found: ${entryId}`);
        return;
      }

      // Get active monthly sponsors with email delivery enabled
      const sponsors = await this.prisma.sponsorship.findMany({
        where: {
          sponsored_explorer_id: creatorId,
          type: SponsorshipType.SUBSCRIPTION,
          status: SponsorshipStatus.ACTIVE,
          email_delivery_enabled: true,
          expiry: { gt: new Date() },
          deleted_at: null,
        },
        include: {
          sponsor: {
            select: {
              email: true,
              username: true,
              is_email_verified: true,
            },
          },
        },
      });

      if (sponsors.length === 0) {
        this.logger.log(`No eligible sponsors found for creator ${creatorId}`);
        return;
      }

      // Process images for email
      const entryImages = entry.media
        .filter((m) => m.upload.file_type === 'image')
        .map((m) => getStaticMediaUrl(m.upload.original));

      // Send emails to each sponsor
      for (const sponsorship of sponsors) {
        if (!sponsorship.sponsor.is_email_verified) {
          this.logger.log(
            `Skipping unverified email: ${sponsorship.sponsor.email}`,
          );
          continue;
        }

        const postUrl = `${process.env.WEB_URL}/entries/${entryId}`;
        const unsubscribeUrl = `${process.env.WEB_URL}/user/settings/sponsorships?action=unsubscribe&id=${sponsorship.public_id}`;
        const webViewUrl = `${process.env.WEB_URL}/entries/${entryId}?email=true`;

        // Format date
        const formattedDate = new Intl.DateTimeFormat('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }).format(new Date(entry.date));

        // Generate map URL with environment token
        const mapboxToken = process.env.MAPBOX_ACCESS_TOKEN;
        let mapUrl = '';
        if (entry.waypoint && mapboxToken) {
          const { lat, lon } = entry.waypoint;
          mapUrl = `https://api.mapbox.com/styles/v1/cnh1187/clikkzykm00wb01qf28pz4adt/static/pin-s+AA6C46(${lon},${lat})/${lon},${lat},6,0,0/600x300@2x?access_token=${mapboxToken}`;
          this.logger.log(`Generated map URL for entry ${entryId}: ${mapUrl}`);
        } else {
          this.logger.log(
            `No map URL generated for entry ${entryId}: waypoint=${!!entry.waypoint}, token=${!!mapboxToken}`,
          );
        }

        const template = getEmailTemplate(
          EMAIL_TEMPLATES.EXPLORER_PRO_NEW_ENTRY,
          {
            creatorUsername: creator.username,
            creatorPicture: creator.profile?.picture,
            postTitle: entry.title || 'Untitled Entry',
            postContent: entry.content || '',
            postPlace: entry.place,
            postDate: formattedDate,
            postJourney: null, // Trip relationship not directly available on posts
            postImages: entryImages,
            postWaypoint: entry.waypoint,
            mapUrl: mapUrl,
            postUrl,
            unsubscribeUrl,
            webViewUrl,
            sponsored: entry.sponsored || false,
          },
        );

        if (template) {
          await this.send({
            to: sponsorship.sponsor.email,
            subject: template.subject,
            html: template.html,
          });

          this.logger.log(
            `Sent entry delivery to ${sponsorship.sponsor.email} for entry ${entryId}`,
          );
        }
      }

      this.logger.log(
        `Entry delivery completed for ${sponsors.length} sponsors of creator ${creatorId}`,
      );
    } catch (e) {
      this.logger.error('Failed to send entry delivery emails:', e);
    }
  }
}
