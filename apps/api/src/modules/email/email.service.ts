import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OnEvent } from '@nestjs/event-emitter';
import * as nodemailer from 'nodemailer';

import { getEmailTemplate } from '@/common/email-templates';
import { ServiceException } from '@/common/exceptions';
import { EVENTS, IEmailSendEvent } from '@/modules/event';
import { Logger } from '@/modules/logger';

import { IEmailSendPayload } from './email.interface';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor(
    private config: ConfigService,
    private logger: Logger,
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
      if (e.status) throw new ServiceException(e.message, e.status);
    }
  }

  @OnEvent(EVENTS.SEND_EMAIL)
  async onSend(event: IEmailSendEvent): Promise<void> {
    try {
      const { to, vars } = event;

      // get the template
      const templateKey = event.template;
      const template = templateKey ? getEmailTemplate(templateKey, vars) : null;

      // send the email
      if (template) {
        const { subject, html } = template;
        await this.send({
          to,
          subject,
          html,
        });
      } else {
        const { subject, text, html } = event;

        await this.send({
          to,
          subject,
          text: html ? undefined : text,
          html: html ? html : undefined,
        });
      }
    } catch (e) {
      this.logger.error(e);
    }
  }
}
