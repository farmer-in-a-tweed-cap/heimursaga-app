import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import {
  AppErrorCode,
  ILoginPayload,
  ILoginResponse,
  IPasswordResetPayload,
  IPasswordUpdatePayload,
  ISessionUserGetResponse,
  ISignupPayload,
  UserRole,
} from '@repo/types';

import { dateformat } from '@/lib/date-format';
import { generator } from '@/lib/generator';
import { getStaticMediaUrl } from '@/lib/upload';
import { hashPassword, verifyPassword } from '@/lib/utils';

import { EMAIL_TEMPLATES } from '@/common/email-templates';
import {
  ServiceBadRequestException,
  ServiceException,
  ServiceForbiddenException,
  ServiceNotFoundException,
  ServiceUnauthorizedException,
} from '@/common/exceptions';
import { ISession, ISessionQueryWithPayload } from '@/common/interfaces';
import { config } from '@/config';
import { IPasswordResetEmailTemplateData } from '@/modules/email';
import {
  EVENTS,
  EventService,
  IEventAdminNewUserSignup,
  IEventSendEmail,
  IEventSignupComplete,
} from '@/modules/event';
import { Logger } from '@/modules/logger';
import { PrismaService } from '@/modules/prisma';
import { RecaptchaService } from '@/modules/recaptcha/recaptcha.service';

import { ISessionCreateOptions } from './auth.interface';

@Injectable()
export class AuthService {
  constructor(
    private logger: Logger,
    private prisma: PrismaService,
    private eventService: EventService,
    private recaptchaService: RecaptchaService,
    private jwtService: JwtService,
  ) {}

  async getSessionUser(payload: ISession): Promise<ISessionUserGetResponse> {
    try {
      const { userId } = payload;
      if (!userId) throw new ServiceNotFoundException('user not found');

      // get the user
      const user = await this.prisma.user.findFirstOrThrow({
        where: {
          id: userId,
          blocked: false,
        },
        select: {
          id: true,
          role: true,
          username: true,
          email: true,
          is_email_verified: true,
          is_premium: true,
          is_stripe_account_connected: true,
          profile: {
            select: {
              // name: true,
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
        is_stripe_account_connected: isStripeAccountConnected,
      } = user;
      const { picture } = user?.profile || {};

      return {
        email,
        username,
        role,
        // name,
        picture: getStaticMediaUrl(picture),
        isEmailVerified,
        isPremium,
        stripeAccountConnected: isStripeAccountConnected,
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
  }: ISessionQueryWithPayload<{}, ILoginPayload>): Promise<ILoginResponse> {
    try {
      const { login, password: plainPassword } = payload;
      const { sid, ip, userAgent } = session || {};

      // First find the user by login (email or username)
      const user = await this.prisma.user.findFirst({
        where: {
          OR: [{ email: login }, { username: login }],
          blocked: false,
        },
        select: { id: true, password: true },
      });

      // Check if user exists and password is correct
      if (!user || !verifyPassword(plainPassword, user.password)) {
        throw new ServiceForbiddenException('login or password invalid');
      }

      // Migrate old password format to new secure format
      if (!user.password.includes(':')) {
        const newHashedPassword = hashPassword(plainPassword);
        await this.prisma.user.update({
          where: { id: user.id },
          data: { password: newHashedPassword },
        });
        this.logger.log(`Password upgraded to new format for user ${user.id}`);
      }

      // create a session
      const userSession = await this.createSession({
        sid,
        userId: user.id,
        ip,
        userAgent,
      }).catch(() => {
        throw new ServiceForbiddenException('login or password invalid');
      });

      const response: ILoginResponse = {
        session: {
          sid: userSession.sid,
          expiredAt: userSession.expiredAt,
        },
      };

      return response;
    } catch (e) {
      this.logger.error(e);
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceForbiddenException('login or password invalid');
      throw exception;
    }
  }

  // New method for mobile JWT-based login
  async mobileLogin({
    payload,
    session,
  }: ISessionQueryWithPayload<{}, ILoginPayload>): Promise<{
    token: string;
    user: ISessionUserGetResponse;
  }> {
    try {
      const { login, password: plainPassword } = payload;
      const { ip, userAgent } = session || {};

      // Find the user by login (email or username)
      const user = await this.prisma.user.findFirst({
        where: {
          OR: [{ email: login }, { username: login }],
          blocked: false,
        },
        select: {
          id: true,
          password: true,
          email: true,
          username: true,
          role: true,
          is_email_verified: true,
          is_premium: true,
          profile: {
            select: {
              picture: true,
            },
          },
        },
      });

      // Check if user exists and password is correct
      if (!user || !verifyPassword(plainPassword, user.password)) {
        throw new ServiceForbiddenException('login or password invalid');
      }

      // Migrate old password format to new secure format
      if (!user.password.includes(':')) {
        const newHashedPassword = hashPassword(plainPassword);
        await this.prisma.user.update({
          where: { id: user.id },
          data: { password: newHashedPassword },
        });
      }

      // Create JWT payload
      const jwtPayload = {
        sub: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        ip,
        userAgent,
      };

      // Generate JWT token
      const token = this.jwtService.sign(jwtPayload);

      // Format user response
      const userResponse: ISessionUserGetResponse = {
        role: user.role as UserRole,
        username: user.username,
        email: user.email,
        picture: user.profile?.picture
          ? getStaticMediaUrl(user.profile.picture)
          : undefined,
        isEmailVerified: user.is_email_verified,
        isPremium: user.is_premium,
      };

      return {
        token,
        user: userResponse,
      };
    } catch (e) {
      this.logger.error(e);
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceForbiddenException('login or password invalid');
      throw exception;
    }
  }

  // New method to verify JWT tokens
  async verifyToken(token: string): Promise<{
    userId: number;
    role: UserRole;
    email: string;
    username: string;
  } | null> {
    try {
      const payload = this.jwtService.verify(token);
      return {
        userId: payload.sub,
        role: payload.role,
        email: payload.email,
        username: payload.username,
      };
    } catch (error) {
      this.logger.error('JWT verification failed:', error);
      return null;
    }
  }

  // Method to get user data from JWT token (equivalent to getSessionUser for tokens)
  async getTokenUser(token: string): Promise<ISessionUserGetResponse> {
    try {
      const tokenData = await this.verifyToken(token);
      if (!tokenData) {
        throw new ServiceUnauthorizedException('Invalid token');
      }

      const user = await this.prisma.user.findUnique({
        where: { id: tokenData.userId },
        select: {
          role: true,
          username: true,
          email: true,
          is_email_verified: true,
          is_premium: true,
          is_stripe_account_connected: true,
          profile: {
            select: {
              picture: true,
            },
          },
        },
      });

      if (!user) {
        throw new ServiceNotFoundException('User not found');
      }

      return {
        role: user.role as UserRole,
        username: user.username,
        email: user.email,
        picture: user.profile?.picture
          ? getStaticMediaUrl(user.profile.picture)
          : undefined,
        isEmailVerified: user.is_email_verified,
        isPremium: user.is_premium,
        stripeAccountConnected: user.is_stripe_account_connected,
      };
    } catch (e) {
      this.logger.error(e);
      throw e.status ? e : new ServiceUnauthorizedException('Invalid token');
    }
  }

  async signup(
    payload: ISignupPayload,
    options?: { return?: boolean },
  ): Promise<void | { email: string; password: string }> {
    try {
      const returnCredentials = options?.return || false;

      // format email and username
      const username = payload.username.trim().toLowerCase();
      const email = payload.email.trim().toLowerCase();

      // Check for suspicious registration patterns
      await this.detectSuspiciousRegistration(email, username);

      // Verify reCAPTCHA token if provided (skip for localhost)
      const isDevelopment = process.env.NODE_ENV === 'development';
      const isLocalhost =
        process.env.HOST === 'localhost' ||
        process.env.HOST === '127.0.0.1' ||
        !process.env.HOST;

      if (!isDevelopment && !isLocalhost) {
        if (payload.recaptchaToken) {
          const isValidRecaptcha = await this.recaptchaService.verifyToken(
            payload.recaptchaToken,
          );
          if (!isValidRecaptcha) {
            throw new ServiceForbiddenException(
              'reCAPTCHA verification failed',
            );
          }
        } else if (this.recaptchaService.isConfigured()) {
          // If reCAPTCHA is configured but no token provided, reject
          throw new ServiceForbiddenException(
            'reCAPTCHA verification required',
          );
        }
      }

      // hash password
      const password = hashPassword(payload.password);

      // check if the email is available
      const isEmailAvailable = await this.prisma.user
        .count({ where: { email } })
        .then((count) => count <= 0);
      if (!isEmailAvailable)
        throw new ServiceForbiddenException(AppErrorCode.EMAIL_ALREADY_IN_USE);

      // check if the username is available
      const isUsernameAvailable = await this.prisma.user
        .count({ where: { username } })
        .then((count) => count <= 0);
      if (!isUsernameAvailable)
        throw new ServiceForbiddenException(
          AppErrorCode.USERNAME_ALREADY_IN_USE,
        );

      // create a user
      await this.prisma.user.create({
        data: {
          email,
          username,
          role: UserRole.USER,
          password,
          profile: {
            create: { picture: '' },
          },
        },
        select: {
          id: true,
          email: true,
        },
      });

      // trigger the sign up event
      this.eventService.trigger<IEventSignupComplete>({
        event: EVENTS.SIGNUP_COMPLETE,
        data: { email },
      });

      // trigger admin notification event
      this.eventService.trigger<IEventAdminNewUserSignup>({
        event: EVENTS.ADMIN_NEW_USER_SIGNUP,
        data: {
          username,
          email,
          signupDate: new Date().toISOString(),
          userProfileUrl: `${process.env.NEXT_PUBLIC_APP_BASE_URL || 'https://heimursaga.com'}/${username}`,
        },
      });

      if (returnCredentials) {
        return {
          email,
          password: payload.password,
        };
      }
    } catch (e) {
      this.logger.error(e);
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceForbiddenException('sign up failed');
      throw exception;
    }
  }

  async signupAndLogin(payload: ISignupPayload): Promise<ILoginResponse> {
    try {
      // sign up
      const signup = await this.signup(payload, { return: true });

      // log in
      if (signup) {
        const login = await this.login({
          query: {},
          payload: {
            login: signup.email,
            password: signup.password,
          },
        }).catch(() => {});

        if (login) {
          const response: ILoginResponse = { ...login };
          return response;
        }
      }
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
    role: UserRole;
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
        role: session.user.role as UserRole,
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
        IEventSendEmail<IPasswordResetEmailTemplateData>
      >({
        event: EVENTS.SEND_EMAIL,
        data: {
          to: email,
          template: EMAIL_TEMPLATES.PASSWORD_RESET,
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

  async sendEmailVerification(email: string): Promise<void> {
    try {
      const { APP_BASE_URL } = process.env;
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

      // set expiration date (24 hours for email verification)
      const expiresAt = dateformat().add(24, 'h').toDate();

      // create a verification
      const verification = await this.prisma.emailVerification.create({
        data: {
          token,
          email,
          expired_at: expiresAt,
        },
      });
      if (!verification)
        throw new ServiceBadRequestException(
          'email verification can not be sent',
        );

      // generate a link
      const link = new URL(
        `verify-email?token=${token}`,
        APP_BASE_URL,
      ).toString();

      // send the email
      this.eventService.trigger<IEventSendEmail>({
        event: EVENTS.SEND_EMAIL,
        data: {
          to: email,
          template: EMAIL_TEMPLATES.EMAIL_VERIFICATION,
          vars: { verification_link: link },
        },
      });
    } catch (e) {
      this.logger.error(e);
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceForbiddenException('email verification can not be sent');
      throw exception;
    }
  }

  async verifyEmail(token: string): Promise<void> {
    try {
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
        // update the user
        await tx.user.update({
          where: { email: verification.email },
          data: { is_email_verified: true },
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

      // send welcome email after successful verification
      this.eventService.trigger<IEventSendEmail>({
        event: EVENTS.SEND_EMAIL,
        data: {
          to: verification.email,
          template: EMAIL_TEMPLATES.WELCOME,
        },
      });
    } catch (e) {
      this.logger.error(e);
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceForbiddenException('token is expired or invalid');
      throw exception;
    }
  }

  @OnEvent(EVENTS.SIGNUP_COMPLETE)
  async onSignupComplete(payload: IEventSignupComplete): Promise<void> {
    try {
      const { email } = payload;

      // send email verification
      await this.sendEmailVerification(email);
    } catch (e) {
      this.logger.error(e);
    }
  }

  @OnEvent(EVENTS.ADMIN_NEW_USER_SIGNUP)
  async onAdminNewUserSignup(payload: IEventAdminNewUserSignup): Promise<void> {
    try {
      const { username, email, signupDate, userProfileUrl } = payload;

      // send admin notification email
      this.eventService.trigger<IEventSendEmail>({
        event: EVENTS.SEND_EMAIL,
        data: {
          to: 'admin@heimursaga.com',
          template: EMAIL_TEMPLATES.ADMIN_NEW_USER_SIGNUP,
          vars: {
            username,
            email,
            signupDate: new Date(signupDate).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              timeZoneName: 'short',
            }),
            userProfileUrl,
          },
        },
      });
    } catch (e) {
      this.logger.error(e);
    }
  }

  private async detectSuspiciousRegistration(
    email: string,
    username: string,
  ): Promise<void> {
    // Check for suspicious email patterns (more specific to avoid false positives)
    const suspiciousEmailPatterns = [
      /^(user|test|fake|bot|temp)\d+@/i, // Specific bot patterns like user123@, test456@
      /^\d{4,}@/, // Starting with 4+ numbers like 12345@
      /^[a-z]{1,2}\d{4,}@/i, // Very short letters + many numbers like ab1234@
      /^(admin|root|system)@/i, // System-like usernames
    ];

    // Check for suspicious username patterns
    const suspiciousUsernamePatterns = [
      /^user\d+$/i, // user123
      /^test\d+$/i, // test123
      /^bot\d+$/i, // bot123
      /^fake\d+$/i, // fake123
      /^temp\d+$/i, // temp123
      /^\d+$/, // All numbers
      /^[a-z]{1,3}\d{3,}$/i, // Short letters + many numbers
    ];

    // Check for disposable/temporary email domains
    const disposableEmailDomains = [
      '10minutemail.com',
      'tempmail.org',
      'guerrillamail.com',
      'maildrop.cc',
      'throwaway.email',
      'temp-mail.org',
      'getnada.com',
      'mailinator.com',
      'yopmail.com',
      '0-mail.com',
    ];

    const emailDomain = email.split('@')[1];

    // Check email patterns
    if (suspiciousEmailPatterns.some((pattern) => pattern.test(email))) {
      throw new ServiceForbiddenException('Invalid email format detected');
    }

    // Check username patterns
    if (suspiciousUsernamePatterns.some((pattern) => pattern.test(username))) {
      throw new ServiceForbiddenException('Invalid username format detected');
    }

    // Check disposable email domains
    if (disposableEmailDomains.includes(emailDomain.toLowerCase())) {
      throw new ServiceForbiddenException(
        'Disposable email addresses are not allowed',
      );
    }

    // Check for too many similar registrations (basic pattern)
    const similarEmailCount = await this.prisma.user.count({
      where: {
        email: {
          contains: email.split('@')[0].slice(0, -3), // Check similar email prefixes
        },
        created_at: {
          gte: dateformat().subtract(1, 'hour').toDate(), // Within last hour
        },
      },
    });

    if (similarEmailCount >= 3) {
      throw new ServiceForbiddenException(
        'Too many similar registrations detected',
      );
    }

    // Check for sequential username registrations
    const baseUsername = username.replace(/\d+$/, ''); // Remove trailing numbers
    if (baseUsername.length >= 3) {
      const similarUsernameCount = await this.prisma.user.count({
        where: {
          username: {
            startsWith: baseUsername,
          },
          created_at: {
            gte: dateformat().subtract(1, 'hour').toDate(),
          },
        },
      });

      if (similarUsernameCount >= 5) {
        throw new ServiceForbiddenException(
          'Suspicious registration pattern detected',
        );
      }
    }
  }

  async resendEmailVerification(session: ISession) {
    try {
      const { userId } = session;

      // check access
      const access = !!userId;
      if (!access) throw new ServiceForbiddenException();

      // Get user details
      const user = await this.prisma.user.findFirst({
        where: { id: userId },
        select: {
          email: true,
          is_email_verified: true,
        },
      });

      if (!user) {
        throw new ServiceNotFoundException('User not found');
      }

      if (user.is_email_verified) {
        throw new ServiceBadRequestException('Email is already verified');
      }

      // Send verification email using existing method
      await this.sendEmailVerification(user.email);

      return { success: true, message: 'Verification email sent' };
    } catch (e) {
      this.logger.error(e);
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceBadRequestException('Failed to send verification email');
      throw exception;
    }
  }
}
