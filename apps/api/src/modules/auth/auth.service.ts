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
import * as crypto from 'node:crypto';

import { dateformat } from '@/lib/date-format';
import { generator } from '@/lib/generator';
import { getStaticMediaUrl } from '@/lib/upload';
import { hashPassword, verifyPassword } from '@/lib/utils';

import {
  BANNED_USERNAMES,
  BANNED_USERNAME_SUBSTRINGS,
} from '@/common/constants';
import { EMAIL_TEMPLATES } from '@/common/email-templates';
import {
  ServiceBadRequestException,
  ServiceException,
  ServiceForbiddenException,
  ServiceInternalException,
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
import { StripeService } from '@/modules/stripe';

import { ISessionCreateOptions } from './auth.interface';

@Injectable()
export class AuthService {
  constructor(
    private logger: Logger,
    private prisma: PrismaService,
    private eventService: EventService,
    private recaptchaService: RecaptchaService,
    private jwtService: JwtService,
    private stripeService: StripeService,
  ) {}

  async getSessionUser(payload: ISession): Promise<ISessionUserGetResponse> {
    try {
      const { userId } = payload;
      if (!userId) throw new ServiceNotFoundException('user not found');

      // get the user
      const user = await this.prisma.explorer.findFirstOrThrow({
        where: {
          id: userId,
          blocked: false,
        },
        select: {
          id: true,
          role: true,
          admin: true,
          username: true,
          email: true,
          is_email_verified: true,
          is_premium: true,
          is_guide: true,
          is_stripe_account_connected: true,
          created_at: true,
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
        id,
        email,
        role,
        admin,
        username,
        is_email_verified: isEmailVerified,
        is_premium: isPremium,
        is_guide: isGuide,
        created_at: createdAt,
      } = user;
      const { picture } = user?.profile || {};

      // Dynamically check if explorer has a verified Stripe Connect payout method
      const verifiedPayoutMethod = await this.prisma.payoutMethod.findFirst({
        where: {
          explorer_id: userId,
          deleted_at: null,
          stripe_account_id: { not: null },
        },
        select: { stripe_account_id: true },
      });

      let isStripeAccountConnected = false;
      if (verifiedPayoutMethod?.stripe_account_id) {
        try {
          const stripeAccount = await this.stripeService.accounts.retrieve(
            verifiedPayoutMethod.stripe_account_id,
          );
          isStripeAccountConnected =
            stripeAccount.charges_enabled === true &&
            stripeAccount.payouts_enabled === true;
        } catch {
          // Stripe account not accessible (wrong mode, deleted, etc.)
          isStripeAccountConnected = false;
        }
      }

      // Sync DB column if live Stripe status disagrees with cached value
      if (user.is_stripe_account_connected !== isStripeAccountConnected) {
        await this.prisma.explorer.update({
          where: { id: userId },
          data: { is_stripe_account_connected: isStripeAccountConnected },
        });
      }

      // Check for an active or planned expedition owned by this user (exclude blueprints)
      const currentExpedition = await this.prisma.expedition.findFirst({
        where: {
          author_id: userId,
          status: { in: ['active', 'planned'] },
          deleted_at: null,
          is_blueprint: { not: true },
        },
        select: { id: true, public_id: true, title: true, status: true },
        orderBy: { status: 'asc' }, // 'active' sorts before 'planned'
      });

      return {
        id,
        email,
        username,
        role,
        admin,
        // name,
        picture: getStaticMediaUrl(picture),
        isEmailVerified,
        isPremium,
        isGuide: isGuide ?? false,
        stripeAccountConnected: isStripeAccountConnected,
        createdAt,
        activeExpedition: currentExpedition
          ? {
              id: currentExpedition.id,
              publicId: currentExpedition.public_id,
              title: currentExpedition.title,
              status: currentExpedition.status as 'active' | 'planned',
            }
          : null,
      };
    } catch (e) {
      this.logger.error(e);
      if (e.status) throw e;
      throw new ServiceInternalException();
    }
  }

  async login({
    payload,
    session,
  }: ISessionQueryWithPayload<{}, ILoginPayload>): Promise<ILoginResponse> {
    try {
      const { login, password: plainPassword, remember } = payload;
      const { sid, ip, userAgent } = session || {};

      // First find the user by login (email or username)
      const user = await this.prisma.explorer.findFirst({
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
        await this.prisma.explorer.update({
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
        remember,
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
      if (e.status) throw e;
      throw new ServiceInternalException();
    }
  }

  // New method for mobile JWT-based login
  async mobileLogin({
    payload,
    session,
  }: ISessionQueryWithPayload<{}, ILoginPayload>): Promise<{
    token: string;
    refreshToken: string;
    user: ISessionUserGetResponse;
  }> {
    try {
      const { login, password: plainPassword } = payload;
      const { ip, userAgent } = session || {};

      // Find the user by login (email or username)
      const user = await this.prisma.explorer.findFirst({
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
          admin: true,
          is_email_verified: true,
          is_premium: true,
          is_guide: true,
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
        await this.prisma.explorer.update({
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
      };

      // Generate access token (1 hour expiration)
      const token = this.jwtService.sign(jwtPayload, { expiresIn: '1h' });

      // Generate refresh token (30 days expiration)
      const refreshToken = this.jwtService.sign(
        { sub: user.id, type: 'refresh' },
        { expiresIn: '30d' },
      );

      // Check Stripe Connect status
      const verifiedPayout = await this.prisma.payoutMethod.findFirst({
        where: {
          explorer_id: user.id,
          deleted_at: null,
          stripe_account_id: { not: null },
        },
        select: { stripe_account_id: true },
      });

      let stripeConnected = false;
      if (verifiedPayout?.stripe_account_id) {
        try {
          const acct = await this.stripeService.accounts.retrieve(
            verifiedPayout.stripe_account_id,
          );
          stripeConnected =
            acct.charges_enabled === true && acct.payouts_enabled === true;
        } catch {
          stripeConnected = false;
        }
      }

      // Sync DB column if live Stripe status disagrees with cached value
      await this.prisma.explorer.update({
        where: { id: user.id },
        data: { is_stripe_account_connected: stripeConnected },
      });

      // Format user response
      const userResponse: ISessionUserGetResponse = {
        id: user.id,
        role: user.role as UserRole,
        admin: user.admin,
        username: user.username,
        email: user.email,
        picture: user.profile?.picture
          ? getStaticMediaUrl(user.profile.picture)
          : undefined,
        isEmailVerified: user.is_email_verified,
        isPremium: user.is_premium,
        isGuide: user.is_guide ?? false,
        stripeAccountConnected: stripeConnected,
      };

      return {
        token,
        refreshToken,
        user: userResponse,
      };
    } catch (e) {
      this.logger.error(e);
      if (e.status) throw e;
      throw new ServiceInternalException();
    }
  }

  // New method for mobile JWT token refresh
  async mobileRefresh(refreshToken: string): Promise<{
    token: string;
  }> {
    try {
      // Verify the refresh token
      const decoded = this.jwtService.verify(refreshToken);

      // Check if it's actually a refresh token
      if (decoded.type !== 'refresh') {
        throw new ServiceForbiddenException('Invalid refresh token');
      }

      // Find the user
      const user = await this.prisma.explorer.findUnique({
        where: { id: decoded.sub },
        select: {
          id: true,
          email: true,
          username: true,
          role: true,
          blocked: true,
        },
      });

      if (!user || user.blocked) {
        throw new ServiceForbiddenException('User not found or blocked');
      }

      // Create new JWT payload
      const jwtPayload = {
        sub: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
      };

      // Generate new access token (1 hour expiration)
      const token = this.jwtService.sign(jwtPayload, { expiresIn: '1h' });

      return {
        token,
      };
    } catch (e) {
      this.logger.error(e);
      if (e.status) throw e;
      throw new ServiceInternalException();
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

      // Check if user is blocked since token was issued
      const user = await this.prisma.explorer.findUnique({
        where: { id: payload.sub },
        select: { blocked: true },
      });
      if (!user || user.blocked) return null;

      return {
        userId: payload.sub,
        role: payload.role,
        email: payload.email,
        username: payload.username,
      };
    } catch (error) {
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

      const user = await this.prisma.explorer.findUnique({
        where: { id: tokenData.userId },
        select: {
          id: true,
          role: true,
          admin: true,
          username: true,
          email: true,
          is_email_verified: true,
          is_premium: true,
          is_guide: true,
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

      // Dynamically check Stripe Connect status
      const verifiedPayout = await this.prisma.payoutMethod.findFirst({
        where: {
          explorer_id: tokenData.userId,
          deleted_at: null,
          stripe_account_id: { not: null },
        },
        select: { stripe_account_id: true },
      });

      let stripeConnected = false;
      if (verifiedPayout?.stripe_account_id) {
        try {
          const acct = await this.stripeService.accounts.retrieve(
            verifiedPayout.stripe_account_id,
          );
          stripeConnected =
            acct.charges_enabled === true && acct.payouts_enabled === true;
        } catch {
          stripeConnected = false;
        }
      }

      // Sync DB column if live Stripe status disagrees with cached value
      await this.prisma.explorer.update({
        where: { id: user.id },
        data: { is_stripe_account_connected: stripeConnected },
      });

      return {
        id: user.id,
        role: user.role as UserRole,
        admin: user.admin,
        username: user.username,
        email: user.email,
        picture: user.profile?.picture
          ? getStaticMediaUrl(user.profile.picture)
          : undefined,
        isEmailVerified: user.is_email_verified,
        isPremium: user.is_premium,
        isGuide: user.is_guide ?? false,
        stripeAccountConnected: stripeConnected,
      };
    } catch (e) {
      this.logger.error(e);
      throw e.status ? e : new ServiceInternalException();
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

      // Check for banned/reserved usernames
      if (BANNED_USERNAMES.has(username)) {
        throw new ServiceForbiddenException('This username is not available');
      }
      const hasBannedSubstring = BANNED_USERNAME_SUBSTRINGS.some((word) =>
        username.includes(word),
      );
      if (hasBannedSubstring) {
        throw new ServiceForbiddenException('This username is not available');
      }

      // Check for suspicious registration patterns
      await this.detectSuspiciousRegistration(email, username);

      // Verify reCAPTCHA token when configured (skip in development)
      const isDevelopment = process.env.NODE_ENV === 'development';
      if (this.recaptchaService.isConfigured() && !isDevelopment) {
        if (!payload.recaptchaToken) {
          throw new ServiceForbiddenException(
            'reCAPTCHA verification is required',
          );
        } else {
          const isValidRecaptcha = await this.recaptchaService.verifyToken(
            payload.recaptchaToken,
          );
          if (!isValidRecaptcha) {
            throw new ServiceForbiddenException(
              'reCAPTCHA verification failed',
            );
          }
        }
      }

      // hash password
      const password = hashPassword(payload.password);

      // check if the email is available
      const isEmailAvailable = await this.prisma.explorer
        .count({ where: { email } })
        .then((count) => count <= 0);
      if (!isEmailAvailable)
        throw new ServiceForbiddenException(AppErrorCode.EMAIL_ALREADY_IN_USE);

      // check if the username is available
      const isUsernameAvailable = await this.prisma.explorer
        .count({ where: { username } })
        .then((count) => count <= 0);
      if (!isUsernameAvailable)
        throw new ServiceForbiddenException(
          AppErrorCode.USERNAME_ALREADY_IN_USE,
        );

      // validate invite code if provided (early check for fast UX feedback)
      const isGuideSignup = !!payload.inviteCode;
      if (isGuideSignup) {
        const inviteCode = await this.prisma.inviteCode.findUnique({
          where: { code: payload.inviteCode!.trim() },
        });
        if (!inviteCode) {
          throw new ServiceBadRequestException('Invalid invite code');
        }
        if (inviteCode.used_by !== null) {
          throw new ServiceBadRequestException(
            'This invite code has already been used',
          );
        }
        if (inviteCode.expires_at && inviteCode.expires_at < new Date()) {
          throw new ServiceBadRequestException('This invite code has expired');
        }
      }

      // create a user (guide signup uses transaction to atomically consume invite code)
      if (isGuideSignup) {
        await this.prisma.$transaction(async (tx) => {
          // Re-validate inside transaction to prevent race conditions
          const code = await tx.inviteCode.findUnique({
            where: { code: payload.inviteCode!.trim() },
          });
          if (!code || code.used_by !== null) {
            throw new ServiceBadRequestException(
              'Invite code is invalid or has already been used',
            );
          }
          if (code.expires_at && code.expires_at < new Date()) {
            throw new ServiceBadRequestException(
              'This invite code has expired',
            );
          }

          const user = await tx.explorer.create({
            data: {
              email,
              username,
              role: UserRole.CREATOR,
              is_guide: true,
              password,
              profile: {
                create: { picture: '' },
              },
            },
            select: { id: true, email: true },
          });

          await tx.inviteCode.update({
            where: { code: payload.inviteCode!.trim(), used_by: null },
            data: {
              used_by: user.id,
              used_at: new Date(),
            },
          });
        });
      } else {
        await this.prisma.explorer.create({
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
      }

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
      if (e.status) throw e;
      throw new ServiceInternalException();
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
        }).catch((err) => {
          this.logger.error('Login after signup failed', err);
          throw err;
        });

        if (login) {
          const response: ILoginResponse = { ...login };
          return response;
        }
      }
    } catch (e) {
      this.logger.error(e);
      if (e.status) throw e;
      throw new ServiceInternalException();
    }
  }

  async logout(payload: ISession): Promise<void> {
    try {
      const { sid } = payload;

      // invalidate the session
      await this.prisma.explorerSession
        .updateMany({
          where: { sid },
          data: { expired: true, expires_at: dateformat().toDate() },
        })
        .catch(() => {
          throw new ServiceForbiddenException('session not found');
        });
    } catch (e) {
      this.logger.error(e);
      if (e.status) throw e;
      throw new ServiceInternalException();
    }
  }

  async createSession(options: ISessionCreateOptions) {
    try {
      const { ip, userAgent, userId, sid, remember } = options || {};

      // Check if session already exists - if so, delete it and create a new one
      const existingSession = await this.validateSession({ sid });
      if (existingSession) {
        // Delete the existing session record to allow creating a new one
        await this.prisma.explorerSession.deleteMany({
          where: { sid },
        });
      }

      // Always generate a new session ID to avoid unique constraint issues
      const sessionId = generator.sessionId();
      const sessionDurationHours = remember ? 720 : 168; // 30 days or 7 days
      const expiredAt = dateformat().add(sessionDurationHours, 'h').toDate();

      // create a session
      await this.prisma.explorerSession.create({
        data: {
          sid: sessionId,
          expires_at: expiredAt,
          ip_address: ip,
          user_agent: userAgent,
          explorer_id: userId,
        },
      });

      const response = {
        sid: sessionId,
        expiredAt,
      };

      return response;
    } catch (e) {
      this.logger.error(e);
      if (e.status) throw e;
      throw new ServiceInternalException();
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

      // check the session (must exist, not expired, and not past expiration date)
      const session = await this.prisma.explorerSession.findFirstOrThrow({
        where: {
          sid,
          expired: { not: true },
          expires_at: { gt: new Date() },
        },
        select: {
          id: true,
          sid: true,
          explorer: {
            select: {
              id: true,
              email: true,
              role: true,
              blocked: true,
            },
          },
        },
      });

      // reject blocked users
      if (session.explorer.blocked) return null;

      const response = {
        sid: session.sid,
        role: session.explorer.role as UserRole,
        userId: session.explorer.id,
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

      // check if the user exists — return silently if not found to prevent enumeration
      const user = await this.prisma.explorer
        .findFirstOrThrow({ where: { email } })
        .catch(() => null);
      if (!user) {
        this.logger.warn('Password reset requested for non-existent email');
        return;
      }

      // generate a token
      const token = generator.verificationToken();

      // set expiration date (3 hours)
      const expiresAt = dateformat().add(3, 'h').toDate();

      // Expire stale verification records whose expiry has passed
      await this.prisma.emailVerification.updateMany({
        where: {
          email,
          expired: false,
          expired_at: { lt: new Date() },
        },
        data: { expired: true },
      });

      // check if there are too many active (non-expired) verifications
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
        `password-reset-confirm?token=${token}&email=${encodeURIComponent(email)}`,
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
          vars: {
            reset_link: link,
            username: user.username,
            expiresInMinutes: 180,
          },
        },
      });
    } catch (e) {
      this.logger.error(e);
      if (e.status) throw e;
      throw new ServiceInternalException();
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
        await tx.explorer.update({
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
      if (e.status) throw e;
      throw new ServiceInternalException();
    }
  }

  async validateToken(token: string) {
    try {
      if (!token)
        throw new ServiceBadRequestException('token is expired or invalid');

      // Fetch all active (non-expired) verifications and compare using
      // constant-time comparison to avoid leaking token validity via timing.
      const activeVerifications = await this.prisma.emailVerification.findMany({
        where: { expired: false },
        select: { token: true },
      });

      const tokenBuffer = Buffer.from(token);
      const match = activeVerifications.some((v) => {
        const storedBuffer = Buffer.from(v.token);
        if (tokenBuffer.length !== storedBuffer.length) return false;
        return crypto.timingSafeEqual(tokenBuffer, storedBuffer);
      });

      if (!match) {
        throw new ServiceBadRequestException('token is expired or invalid');
      }
    } catch (e) {
      this.logger.error(e);
      if (e.status) throw e;
      throw new ServiceInternalException();
    }
  }

  async sendEmailVerification(email: string): Promise<void> {
    try {
      const { APP_BASE_URL } = process.env;
      const maxRequests = config.verification_request_limit || 0;

      // check if the user exists
      const user = await this.prisma.explorer
        .findFirstOrThrow({ where: { email } })
        .catch(() => null);
      if (!user) {
        // Return silently to prevent user enumeration (same pattern as resetPassword)
        this.logger.warn(
          '[EMAIL_VERIFICATION] Requested for non-existent email',
        );
        return;
      }

      // generate a token
      const token = generator.verificationToken();

      // set expiration date (24 hours for email verification)
      const expiresAt = dateformat().add(24, 'h').toDate();

      // Expire stale verification records whose expiry has passed
      await this.prisma.emailVerification.updateMany({
        where: {
          email,
          expired: false,
          expired_at: { lt: new Date() },
        },
        data: { expired: true },
      });

      // check if there are too many active (non-expired) verifications
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
      this.logger.log(`[EMAIL_VERIFICATION] Triggering email verification`);

      this.eventService.trigger<IEventSendEmail>({
        event: EVENTS.SEND_EMAIL,
        data: {
          to: email,
          template: EMAIL_TEMPLATES.EMAIL_VERIFICATION,
          vars: { verification_link: link },
        },
      });

      this.logger.log(`[EMAIL_VERIFICATION] Event triggered`);
    } catch (e) {
      this.logger.error(`[EMAIL_VERIFICATION] Error:`, e);
      if (e.status) throw e;
      throw new ServiceInternalException();
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
        await tx.explorer.update({
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
      if (e.status) throw e;
      throw new ServiceInternalException();
    }
  }

  @OnEvent(EVENTS.SIGNUP_COMPLETE)
  async onSignupComplete(payload: IEventSignupComplete): Promise<void> {
    try {
      const { email } = payload;

      this.logger.log(`[SIGNUP_COMPLETE] Event received for email: ${email}`);

      // send email verification
      await this.sendEmailVerification(email);

      this.logger.log(`[SIGNUP_COMPLETE] Email verification sent to: ${email}`);
    } catch (e) {
      this.logger.error(`[SIGNUP_COMPLETE] Error:`, e);
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
    const similarEmailCount = await this.prisma.explorer.count({
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
      const similarUsernameCount = await this.prisma.explorer.count({
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
      const user = await this.prisma.explorer.findFirst({
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
      if (e.status) throw e;
      throw new ServiceInternalException();
    }
  }

  async registerPushToken(
    userId: number,
    token: string,
    platform: string,
  ): Promise<void> {
    await this.prisma.deviceToken.upsert({
      where: {
        explorer_id_token: { explorer_id: userId, token },
      },
      update: { platform, active: true, updated_at: new Date() },
      create: {
        explorer_id: userId,
        token,
        platform,
      },
    });
  }

  async removePushToken(userId: number, token: string): Promise<void> {
    await this.prisma.deviceToken.updateMany({
      where: { explorer_id: userId, token },
      data: { active: false },
    });
  }

  async deleteAccount(userId: number): Promise<void> {
    try {
      const user = await this.prisma.explorer.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          username: true,
          stripe_customer_id: true,
          stripe_account_id: true,
        },
      });

      if (!user) {
        throw new ServiceNotFoundException('User not found');
      }

      this.logger.log(`[DELETE_ACCOUNT] Starting account deletion for user ${userId} (${user.username})`);

      // Cancel active Stripe subscriptions (Explorer Pro)
      if (user.stripe_customer_id) {
        try {
          const subscriptions = await this.stripeService.subscriptions.list({
            customer: user.stripe_customer_id,
            status: 'active',
          });
          for (const sub of subscriptions.data) {
            await this.stripeService.subscriptions.cancel(sub.id);
            this.logger.log(`[DELETE_ACCOUNT] Cancelled Stripe subscription ${sub.id}`);
          }
        } catch (e) {
          this.logger.error(`[DELETE_ACCOUNT] Error cancelling subscriptions: ${e.message}`);
        }
      }

      // Cancel active sponsorships the user has given
      const givenSponsorships = await this.prisma.sponsorship.findMany({
        where: { sponsor_id: userId, status: 'active', stripe_subscription_id: { not: null } },
        select: { id: true, stripe_subscription_id: true },
      });
      for (const sp of givenSponsorships) {
        try {
          if (sp.stripe_subscription_id) {
            await this.stripeService.subscriptions.cancel(sp.stripe_subscription_id);
          }
          await this.prisma.sponsorship.update({
            where: { id: sp.id },
            data: { status: 'cancelled' },
          });
        } catch (e) {
          this.logger.error(`[DELETE_ACCOUNT] Error cancelling given sponsorship ${sp.id}: ${e.message}`);
        }
      }

      // Cancel active sponsorships the user is receiving (so sponsors stop being charged)
      const receivedSponsorships = await this.prisma.sponsorship.findMany({
        where: { sponsored_explorer_id: userId, status: 'active', stripe_subscription_id: { not: null } },
        select: { id: true, stripe_subscription_id: true },
      });
      for (const sp of receivedSponsorships) {
        try {
          if (sp.stripe_subscription_id) {
            await this.stripeService.subscriptions.cancel(sp.stripe_subscription_id);
          }
          await this.prisma.sponsorship.update({
            where: { id: sp.id },
            data: { status: 'cancelled' },
          });
        } catch (e) {
          this.logger.error(`[DELETE_ACCOUNT] Error cancelling received sponsorship ${sp.id}: ${e.message}`);
        }
      }

      // Deactivate Stripe Connect account
      if (user.stripe_account_id) {
        try {
          // Reject the account to prevent further payouts and deactivate it
          await this.stripeService.accounts.del(user.stripe_account_id);
          this.logger.log(`[DELETE_ACCOUNT] Deleted Stripe Connect account ${user.stripe_account_id}`);
        } catch (e) {
          this.logger.error(`[DELETE_ACCOUNT] Error deleting Stripe Connect account: ${e.message}`);
        }
      }

      // Anonymize the user record
      const deletedEmail = `deleted_${userId}@deleted.heimursaga.com`;
      const deletedUsername = `deleted_${userId}`;

      await this.prisma.$transaction(async (tx) => {
        // Anonymize explorer
        await tx.explorer.update({
          where: { id: userId },
          data: {
            email: deletedEmail,
            username: deletedUsername,
            password: 'DELETED',
            blocked: true,
            is_premium: false,
            role: UserRole.USER,
            stripe_customer_id: null,
            stripe_account_id: null,
            is_stripe_account_connected: false,
          },
        });

        // Clear profile
        await tx.explorerProfile.updateMany({
          where: { explorer_id: userId },
          data: {
            name: 'Deleted Explorer',
            bio: null,
            picture: null,
            cover_photo: null,
            location_from: null,
            location_lives: null,
            location_from_lat: null,
            location_from_lon: null,
            location_lives_lat: null,
            location_lives_lon: null,
            website: null,
            twitter: null,
            instagram: null,
            youtube: null,
            portfolio: null,
            sponsors_fund: null,
            sponsors_fund_expedition_id: null,
            sponsors_fund_type: null,
          },
        });

        // Delete user-generated content (cascades to comments, likes, bookmarks, media, views, flags)
        await tx.entry.deleteMany({ where: { author_id: userId } });
        await tx.expedition.deleteMany({ where: { author_id: userId } });
        await tx.waypoint.deleteMany({ where: { author_id: userId } });
        await tx.upload.deleteMany({ where: { explorer_id: userId } });

        // Delete social data
        await tx.explorerFollow.deleteMany({ where: { OR: [{ follower_id: userId }, { followee_id: userId }] } });
        await tx.explorerBookmark.deleteMany({ where: { OR: [{ explorer_id: userId }, { bookmarked_explorer_id: userId }] } });
        await tx.explorerNotification.deleteMany({ where: { OR: [{ explorer_id: userId }, { mention_explorer_id: userId }] } });
        await tx.comment.deleteMany({ where: { author_id: userId } });
        await tx.expeditionNote.deleteMany({ where: { author_id: userId } });
        await tx.expeditionNoteReply.deleteMany({ where: { author_id: userId } });
        await tx.expeditionVoiceNote.deleteMany({ where: { author_id: userId } });
        await tx.blueprintReview.deleteMany({ where: { explorer_id: userId } });
        await tx.entryLike.deleteMany({ where: { explorer_id: userId } });
        await tx.entryBookmark.deleteMany({ where: { explorer_id: userId } });
        await tx.expeditionBookmark.deleteMany({ where: { explorer_id: userId } });
        await tx.entryView.deleteMany({ where: { viewer_id: userId } });
        await tx.message.deleteMany({ where: { OR: [{ sender_id: userId }, { recipient_id: userId }] } });
        await tx.flag.deleteMany({ where: { OR: [{ reporter_id: userId }, { flagged_explorer_id: userId }] } });
        await tx.explorerPlan.deleteMany({ where: { explorer_id: userId } });
        await tx.explorerSubscription.deleteMany({ where: { explorer_id: userId } });

        // Disable sponsorship tiers
        await tx.sponsorshipTier.updateMany({
          where: { explorer_id: userId },
          data: { is_available: false, deleted_at: new Date() },
        });

        // Deactivate device tokens
        await tx.deviceToken.updateMany({
          where: { explorer_id: userId },
          data: { active: false },
        });

        // Expire all sessions
        await tx.explorerSession.deleteMany({
          where: { explorer_id: userId },
        });
      });

      this.logger.log(`[DELETE_ACCOUNT] Account deletion complete for user ${userId}`);
    } catch (e) {
      this.logger.error(`[DELETE_ACCOUNT] Error: ${e.message}`);
      if (e.status) throw e;
      throw new ServiceInternalException();
    }
  }
}
