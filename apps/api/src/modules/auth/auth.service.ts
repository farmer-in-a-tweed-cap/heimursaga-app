import { Injectable } from '@nestjs/common';
import {
  ILoginPayload,
  ILoginResponse,
  IPasswordResetPayload,
  IPasswordUpdatePayload,
  ISessionUserGetResponse,
  ISignupPayload,
} from '@repo/types';

import { dateformat } from '@/lib/date-format';
import { generator } from '@/lib/generator';
import { getStaticMediaUrl } from '@/lib/upload';
import { hashPassword } from '@/lib/utils';

import { EMAIL_TEMPLATE_KEYS } from '@/common/email-templates';
import { Role } from '@/common/enums';
import {
  ServiceBadRequestException,
  ServiceException,
  ServiceForbiddenException,
  ServiceNotFoundException,
  ServiceUnauthorizedException,
} from '@/common/exceptions';
import { IPayloadWithSession, ISession } from '@/common/interfaces';
import { config } from '@/config';
import { IPasswordResetEmailTemplateData } from '@/modules/email';
import { EVENTS, EventService, IEmailSendEvent } from '@/modules/event';
import { Logger } from '@/modules/logger';
import { PrismaService } from '@/modules/prisma';

import { ISessionCreateOptions } from './auth.interface';

@Injectable()
export class AuthService {
  constructor(
    private logger: Logger,
    private prisma: PrismaService,
    private eventService: EventService,
  ) {}

  async getSessionUser(payload: ISession): Promise<ISessionUserGetResponse> {
    try {
      const { userId } = payload;
      if (!userId) throw new ServiceNotFoundException('user not found');

      // get the user
      const user = await this.prisma.user.findFirstOrThrow({
        where: {
          id: userId,
        },
        select: {
          id: true,
          role: true,
          username: true,
          email: true,
          is_email_verified: true,
          is_premium: true,
          profile: {
            select: {
              name: true,
              picture: true,
            },
          },
        },
      });
      if (!user) throw new ServiceForbiddenException('user not found');

      const {
        email,
        role,
        username,
        is_email_verified: isEmailVerified,
        is_premium: isPremium,
      } = user;
      const { name, picture } = user?.profile || {};

      return {
        email,
        username,
        role,
        name,
        picture: getStaticMediaUrl(picture),
        isEmailVerified,
        isPremium,
      };
    } catch (e) {
      this.logger.error(e);
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceForbiddenException('user not found');
      throw exception;
    }
  }

  async login({
    payload,
    session,
  }: IPayloadWithSession<ILoginPayload>): Promise<ILoginResponse> {
    try {
      const { email } = payload;
      const { sid, ip, userAgent } = session || {};

      const password = hashPassword(payload.password);

      // @todo
      // const method: 'username' | 'email' | 'unknown' = email
      //   ? 'email'
      //   : username
      //     ? 'username'
      //     : 'unknown';

      // validate the user
      const user = await this.prisma.user
        .findFirstOrThrow({ where: { email, password } })
        .catch(() => null);
      if (!user) throw new ServiceBadRequestException('bad email or password');

      // create a session
      const userSession = await this.createSession({
        sid,
        userId: user.id,
        ip,
        userAgent,
      });

      // @todo
      // trigger the login event

      return {
        session: userSession,
      };
    } catch (e) {
      this.logger.error(e);
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceForbiddenException('login failed');
      throw exception;
    }
  }

  async signup(payload: ISignupPayload): Promise<void> {
    try {
      const { name } = payload;

      // format email and username
      const username = payload.username.trim().toLowerCase();
      const email = payload.email.trim().toLowerCase();

      // hash password
      const password = hashPassword(payload.password);

      // check if the email is available
      const isEmailAvailable = await this.prisma.user
        .count({ where: { email } })
        .then((count) => count <= 0);
      if (!isEmailAvailable)
        throw new ServiceForbiddenException('email already in use');

      // check if the username is available
      const isUsernameAvailable = await this.prisma.user
        .count({ where: { username } })
        .then((count) => count <= 0);
      if (!isUsernameAvailable)
        throw new ServiceForbiddenException('username already in use');

      // create a user
      await this.prisma.user.create({
        data: {
          email,
          username,
          role: Role.USER,
          password,
          profile: {
            create: { name, picture: '' },
          },
        },
        select: {
          id: true,
          email: true,
        },
      });

      // @todo
      // trigger the sign up event
    } catch (e) {
      this.logger.error(e);
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceForbiddenException('sign up failed');
      throw exception;
    }
  }

  async logout(payload: ISession): Promise<void> {
    try {
      const { sid } = payload;

      // invalidate the session
      await this.prisma.userSession
        .updateMany({
          where: { sid },
          data: { expired: true, expires_at: dateformat().toDate() },
        })
        .catch(() => {
          throw new ServiceForbiddenException('session not found');
        });
    } catch (e) {
      this.logger.error(e);
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceForbiddenException('session not found');
      throw exception;
    }
  }

  async createSession(options: ISessionCreateOptions) {
    try {
      const { ip, userAgent, userId, sid } = options || {};

      // validate the session
      const session = await this.validateSession({ sid });
      if (session)
        throw new ServiceBadRequestException('session already exists');

      const sessionId = sid ? sid : generator.sessionId();
      const expiredAt = dateformat().add(168, 'h').toDate();

      // create a session
      await this.prisma.userSession.create({
        data: {
          sid: sessionId,
          expires_at: expiredAt,
          ip_address: ip,
          user_agent: userAgent,
          user_id: userId,
        },
      });

      const response = {
        sid: sessionId,
        expiredAt,
      };

      return response;
    } catch (e) {
      this.logger.error(e);
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceForbiddenException('session not created');
      throw exception;
    }
  }

  async validateSession(payload: { sid: string }): Promise<{
    sid: string;
    userId: number;
    role: Role;
  } | null> {
    try {
      const { sid } = payload;

      if (!sid) throw new ServiceUnauthorizedException();

      // check the session
      const session = await this.prisma.userSession.findFirstOrThrow({
        where: { sid },
        select: {
          id: true,
          sid: true,
          user: {
            select: {
              id: true,
              email: true,
              role: true,
            },
          },
        },
      });

      const response = {
        sid: session.sid,
        role: session.user.role as Role,
        userId: session.user.id,
      };

      return response;
    } catch (e) {
      return null;
    }
  }

  async resetPassword(payload: IPasswordResetPayload): Promise<void> {
    try {
      const { APP_BASE_URL } = process.env;

      const { email } = payload || {};
      const maxRequests = config.verification_request_limit || 0;

      // check if the user exists
      const user = await this.prisma.user
        .findFirstOrThrow({ where: { email } })
        .catch(() => null);
      if (!user)
        throw new ServiceBadRequestException('user with this email not found');

      // generate a token
      const token = generator.verificationToken();

      // check if there are too many verifications
      const limited = await this.prisma.emailVerification
        .count({
          where: {
            email,
            expired: false,
          },
        })
        .then((count) => (count >= maxRequests ? true : false));
      if (limited)
        throw new ServiceForbiddenException(
          'you requested too many verifications, try later again',
        );

      // set expiration date (3 hours)
      const expiresAt = dateformat().add(3, 'h').toDate();

      // create a verification
      const verification = await this.prisma.emailVerification.create({
        data: {
          token,
          email,
          expired_at: expiresAt,
        },
      });
      if (!verification)
        throw new ServiceBadRequestException('password can not be reset');

      // generate a link
      const link = new URL(
        `reset-password?token=${token}`,
        APP_BASE_URL,
      ).toString();

      // send the email
      this.eventService.trigger<
        IEmailSendEvent<IPasswordResetEmailTemplateData>
      >({
        event: EVENTS.SEND_EMAIL,
        data: {
          to: email,
          template: EMAIL_TEMPLATE_KEYS.PASSWORD_RESET,
          vars: { reset_link: link },
        },
      });
    } catch (e) {
      this.logger.error(e);
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceForbiddenException('password can not be reset');
      throw exception;
    }
  }

  async updatePassword(payload: IPasswordUpdatePayload): Promise<void> {
    try {
      const { password, token } = payload || {};

      if (!token)
        throw new ServiceBadRequestException('token is expired or invalid');

      // validate the token
      const verification = await this.prisma.emailVerification.findFirstOrThrow(
        {
          where: { token, expired: false },
          select: { email: true },
        },
      );

      // update the user and expire the token
      await this.prisma.$transaction(async (tx) => {
        const hashedPassword = hashPassword(password);

        // update the user
        await tx.user.update({
          where: { email: verification.email },
          data: { password: hashedPassword },
        });

        // expire the token
        await tx.emailVerification.updateMany({
          where: { email: verification.email },
          data: {
            expired: true,
            expired_at: dateformat().toDate(),
          },
        });
      });
    } catch (e) {
      this.logger.error(e);
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceForbiddenException('token is expired or invalid');
      throw exception;
    }
  }

  async validateToken(token: string) {
    try {
      if (!token)
        throw new ServiceBadRequestException('token is expired or invalid');

      // validate the token
      await this.prisma.emailVerification.findFirstOrThrow({
        where: { token, expired: false },
      });
    } catch (e) {
      this.logger.error(e);
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceForbiddenException('token is expired or invalid');
      throw exception;
    }
  }
}
