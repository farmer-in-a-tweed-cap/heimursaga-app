import { Injectable, OnModuleInit } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  IGoogleCompleteSignupPayload,
  ILoginResponse,
  UserRole,
} from '@repo/types';
import { OAuth2Client } from 'google-auth-library';
import * as crypto from 'node:crypto';

import { Prisma } from '@prisma/client';

import { hashPassword } from '@/lib/utils';

import {
  BANNED_USERNAMES,
  BANNED_USERNAME_SUBSTRINGS,
  DISPOSABLE_EMAIL_DOMAINS,
} from '@/common/constants';
import { EMAIL_TEMPLATES } from '@/common/email-templates';
import {
  ServiceBadRequestException,
  ServiceForbiddenException,
  ServiceInternalException,
  ServiceUnauthorizedException,
} from '@/common/exceptions';
import { ISessionQueryWithPayload } from '@/common/interfaces';
import {
  EVENTS,
  EventService,
  IEventAdminNewUserSignup,
  IEventSendEmail,
} from '@/modules/event';
import { Logger } from '@/modules/logger';
import { PrismaService } from '@/modules/prisma';

import { AuthService } from './auth.service';

const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/;
const PENDING_TOKEN_EXPIRY = '10m';
const PENDING_TOKEN_PURPOSE = 'google_signup';

interface PendingSignupToken {
  purpose: typeof PENDING_TOKEN_PURPOSE;
  sub: string; // Google `sub` (stable user id)
  email: string;
  emailVerified: boolean;
  name?: string;
  picture?: string;
}

@Injectable()
export class GoogleAuthService implements OnModuleInit {
  private client: OAuth2Client | null = null;
  private clientId: string | null = null;
  private clientSecret: string | null = null;

  constructor(
    private readonly logger: Logger,
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
    private readonly eventService: EventService,
  ) {}

  onModuleInit() {
    const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
    if (!clientId || !clientSecret) {
      this.logger.warn(
        '[GOOGLE_AUTH] GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is not set — Google Sign-In is disabled',
      );
      return;
    }
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.client = new OAuth2Client(clientId);
  }

  isEnabled(): boolean {
    return this.client !== null;
  }

  /**
   * Exchange the authorization code from the popup OAuth flow for tokens.
   * Uses `redirect_uri=postmessage` because Google's popup code client
   * communicates the code back via postMessage instead of a redirect.
   */
  private async exchangeCodeForIdToken(code: string): Promise<string> {
    if (!this.clientId || !this.clientSecret) {
      throw new ServiceForbiddenException('Google Sign-In is not configured');
    }
    const body = new URLSearchParams({
      code,
      client_id: this.clientId,
      client_secret: this.clientSecret,
      redirect_uri: 'postmessage',
      grant_type: 'authorization_code',
    });
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    }).catch((err) => {
      this.logger.warn(
        `[GOOGLE_AUTH] Token endpoint unreachable: ${err.message}`,
      );
      throw new ServiceInternalException();
    });
    if (!res.ok) {
      // Only log the status + error code. The raw body can echo back the
      // submitted `code` in `error_description` and we don't want auth codes
      // in log aggregators (short-lived but still a credential).
      let errorCode = 'unknown';
      try {
        const data = (await res.json()) as { error?: string };
        errorCode = data?.error || 'unknown';
      } catch {
        // ignore parse errors
      }
      this.logger.warn(
        `[GOOGLE_AUTH] Code exchange failed: ${res.status} ${errorCode}`,
      );
      throw new ServiceUnauthorizedException('Google sign-in failed');
    }
    const data = (await res.json()) as { id_token?: string };
    if (!data.id_token) {
      throw new ServiceUnauthorizedException('Google sign-in failed');
    }
    return data.id_token;
  }

  async authenticate({
    payload,
    session,
  }: ISessionQueryWithPayload<{}, { code: string }>): Promise<
    | {
        status: 'logged_in';
        session: { sid: string; expiredAt: Date };
      }
    | {
        status: 'needs_username';
        pendingToken: string;
        suggestedUsername: string;
        email: string;
        name?: string;
        picture?: string;
      }
  > {
    if (!this.client || !this.clientId) {
      throw new ServiceForbiddenException('Google Sign-In is not configured');
    }

    const idToken = await this.exchangeCodeForIdToken(payload.code);

    const ticket = await this.client
      .verifyIdToken({
        idToken,
        audience: this.clientId,
      })
      .catch((err) => {
        this.logger.warn(`[GOOGLE_AUTH] Invalid ID token: ${err.message}`);
        throw new ServiceUnauthorizedException('Invalid Google credential');
      });

    const googlePayload = ticket.getPayload();
    if (!googlePayload?.sub || !googlePayload.email) {
      throw new ServiceUnauthorizedException(
        'Google credential missing fields',
      );
    }
    if (!googlePayload.email_verified) {
      throw new ServiceForbiddenException(
        'Google account email is not verified',
      );
    }

    const googleId = googlePayload.sub;
    const email = googlePayload.email.trim().toLowerCase();

    // Defense in depth: if a user with this google_id is blocked, reject
    // explicitly rather than falling through to Branch 3 (which would try to
    // create a new row and hit the unique constraint with an opaque 500).
    const blockedMatch = await this.prisma.explorer.findFirst({
      where: { google_id: googleId, blocked: true },
      select: { id: true },
    });
    if (blockedMatch) {
      throw new ServiceForbiddenException('This account has been suspended');
    }

    // Branch 1: known google_id → log in
    const byGoogleId = await this.prisma.explorer.findFirst({
      where: { google_id: googleId, blocked: false },
      select: { id: true },
    });
    if (byGoogleId) {
      const userSession = await this.authService.createSession({
        sid: session?.sid,
        userId: byGoogleId.id,
        ip: session?.ip,
        userAgent: session?.userAgent,
        remember: true,
      });
      return {
        status: 'logged_in',
        session: { sid: userSession.sid, expiredAt: userSession.expiredAt },
      };
    }

    // Branch 2: email match (no google_id yet) → link + log in
    const byEmail = await this.prisma.explorer.findFirst({
      where: { email, blocked: false },
      select: { id: true, google_id: true },
    });
    if (byEmail) {
      if (byEmail.google_id && byEmail.google_id !== googleId) {
        // Email somehow collides with a different Google account — refuse.
        throw new ServiceForbiddenException(
          'An account with this email already exists',
        );
      }
      await this.prisma.explorer.update({
        where: { id: byEmail.id },
        data: { google_id: googleId, is_email_verified: true },
      });
      const userSession = await this.authService.createSession({
        sid: session?.sid,
        userId: byEmail.id,
        ip: session?.ip,
        userAgent: session?.userAgent,
        remember: true,
      });
      return {
        status: 'logged_in',
        session: { sid: userSession.sid, expiredAt: userSession.expiredAt },
      };
    }

    // Branch 3: brand-new user → issue pending-signup token
    const pendingToken = this.jwtService.sign(
      {
        purpose: PENDING_TOKEN_PURPOSE,
        sub: googleId,
        email,
        emailVerified: true,
        name: googlePayload.name,
        picture: googlePayload.picture,
      } satisfies PendingSignupToken,
      { expiresIn: PENDING_TOKEN_EXPIRY },
    );

    const suggestedUsername = await this.suggestUsername(
      googlePayload.given_name || googlePayload.name || email,
      email,
    );

    return {
      status: 'needs_username',
      pendingToken,
      suggestedUsername,
      email,
      name: googlePayload.name,
      picture: googlePayload.picture,
    };
  }

  async completeSignup({
    payload,
    session,
  }: ISessionQueryWithPayload<
    {},
    IGoogleCompleteSignupPayload
  >): Promise<ILoginResponse> {
    const { pendingToken, username: rawUsername, inviteCode } = payload;

    // Verify and decode the pending token
    let pending: PendingSignupToken;
    try {
      pending = this.jwtService.verify<PendingSignupToken>(pendingToken);
    } catch {
      throw new ServiceUnauthorizedException(
        'Signup session expired, please try again',
      );
    }
    if (pending.purpose !== PENDING_TOKEN_PURPOSE) {
      throw new ServiceUnauthorizedException('Invalid signup session');
    }

    const username = rawUsername.trim().toLowerCase();
    const email = pending.email.trim().toLowerCase();

    // Reject disposable/throwaway email domains — matches the password
    // signup policy (auth.service.detectSuspiciousRegistration).
    const emailDomain = email.split('@')[1];
    if (emailDomain && DISPOSABLE_EMAIL_DOMAINS.has(emailDomain)) {
      throw new ServiceForbiddenException(
        'Disposable email addresses are not allowed',
      );
    }

    // Validate username shape
    const availability = await this.checkUsernameAvailability(username);
    if (!availability.available) {
      const message =
        availability.reason === 'invalid'
          ? 'Username is invalid'
          : availability.reason === 'reserved'
            ? 'This username is not available'
            : 'This username is already taken';
      throw new ServiceBadRequestException(message);
    }

    // Between issuing the pending token and now, somebody else could have
    // registered this Google account via a different flow — double-check.
    const existingByGoogle = await this.prisma.explorer.findFirst({
      where: { google_id: pending.sub },
      select: { id: true },
    });
    if (existingByGoogle) {
      throw new ServiceForbiddenException('Account already exists');
    }
    const existingByEmail = await this.prisma.explorer.findFirst({
      where: { email },
      select: { id: true },
    });
    if (existingByEmail) {
      throw new ServiceForbiddenException(
        'An account with this email already exists',
      );
    }

    // The DB requires a non-null password hash, but Google users don't pick a
    // password. Hash 64 bytes of entropy — no one can ever log in with it,
    // and if the user later runs the password-reset flow it gets overwritten.
    const unguessablePassword = hashPassword(
      crypto.randomBytes(64).toString('hex'),
    );

    // Translate the Prisma unique-constraint error (P2002) into a friendly
    // 403. This covers the race where a concurrent signup (password or
    // Google) creates the same email/google_id between our check above and
    // the actual insert below — the check is best-effort, the DB is truth.
    const mapUniqueViolation = (e: unknown): never => {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ServiceForbiddenException('Account already exists');
      }
      throw e;
    };

    // Invite-code path (Guide signup) — reuse same semantics as password signup
    const isGuideSignup = !!inviteCode?.trim();
    let explorerId: number;
    if (isGuideSignup) {
      const code = inviteCode!.trim();
      const invite = await this.prisma.inviteCode.findUnique({
        where: { code },
      });
      if (!invite || invite.used_by !== null) {
        throw new ServiceBadRequestException(
          'Invite code is invalid or has already been used',
        );
      }
      if (invite.expires_at && invite.expires_at < new Date()) {
        throw new ServiceBadRequestException('This invite code has expired');
      }

      const created = await this.prisma
        .$transaction(async (tx) => {
          const codeFresh = await tx.inviteCode.findUnique({ where: { code } });
          if (!codeFresh || codeFresh.used_by !== null) {
            throw new ServiceBadRequestException(
              'Invite code is invalid or has already been used',
            );
          }
          const user = await tx.explorer.create({
            data: {
              email,
              username,
              role: UserRole.CREATOR,
              is_guide: true,
              password: unguessablePassword,
              google_id: pending.sub,
              is_email_verified: true,
              profile: { create: { picture: '' } },
            },
            select: { id: true },
          });
          await tx.inviteCode.update({
            where: { code, used_by: null },
            data: { used_by: user.id, used_at: new Date() },
          });
          return user;
        })
        .catch(mapUniqueViolation);
      explorerId = created.id;
    } else {
      const user = await this.prisma.explorer
        .create({
          data: {
            email,
            username,
            role: UserRole.USER,
            password: unguessablePassword,
            google_id: pending.sub,
            is_email_verified: true,
            profile: { create: { picture: '' } },
          },
          select: { id: true },
        })
        .catch(mapUniqueViolation);
      explorerId = user.id;
    }

    // Skip the SIGNUP_COMPLETE event because it auto-triggers the email-verification
    // flow — Google already verified the address, so send the welcome email directly.
    this.eventService.trigger<IEventSendEmail>({
      event: EVENTS.SEND_EMAIL,
      data: { to: email, template: EMAIL_TEMPLATES.WELCOME },
    });
    this.eventService.trigger<IEventAdminNewUserSignup>({
      event: EVENTS.ADMIN_NEW_USER_SIGNUP,
      data: {
        username,
        email,
        signupDate: new Date().toISOString(),
        userProfileUrl: `${process.env.APP_BASE_URL || 'https://heimursaga.com'}/${username}`,
      },
    });

    // Create a session
    const userSession = await this.authService.createSession({
      sid: session?.sid,
      userId: explorerId,
      ip: session?.ip,
      userAgent: session?.userAgent,
      remember: true,
    });

    return {
      session: { sid: userSession.sid, expiredAt: userSession.expiredAt },
    };
  }

  async checkUsernameAvailability(username: string): Promise<{
    available: boolean;
    reason?: 'invalid' | 'reserved' | 'taken';
  }> {
    const candidate = username.trim().toLowerCase();

    if (
      !candidate ||
      candidate.length < 3 ||
      candidate.length > 30 ||
      !USERNAME_REGEX.test(candidate)
    ) {
      return { available: false, reason: 'invalid' };
    }
    if (BANNED_USERNAMES.has(candidate)) {
      return { available: false, reason: 'reserved' };
    }
    if (BANNED_USERNAME_SUBSTRINGS.some((w) => candidate.includes(w))) {
      return { available: false, reason: 'reserved' };
    }
    const taken = await this.prisma.explorer
      .count({ where: { username: candidate } })
      .then((n) => n > 0);
    if (taken) {
      return { available: false, reason: 'taken' };
    }
    return { available: true };
  }

  /**
   * Derive a plausible unique username from a Google profile.
   * The user can always override this in the picker.
   */
  private async suggestUsername(
    sourceName: string,
    email: string,
  ): Promise<string> {
    const normalize = (s: string): string =>
      s
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{M}/gu, '') // strip diacritics (combining marks)
        .replace(/[^a-z0-9_]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 20);

    const candidates: string[] = [];
    const fromName = normalize(sourceName);
    if (fromName && fromName.length >= 3) candidates.push(fromName);
    const fromEmail = normalize(email.split('@')[0] || '');
    if (fromEmail && fromEmail.length >= 3) candidates.push(fromEmail);
    candidates.push('explorer');

    for (const base of candidates) {
      const check = await this.checkUsernameAvailability(base);
      if (check.available) return base;
      // try suffixes
      for (let i = 1; i < 10; i++) {
        const suffixed = `${base.slice(0, 20 - String(i).length)}${i}`;
        const avail = await this.checkUsernameAvailability(suffixed);
        if (avail.available) return suffixed;
      }
    }
    // Fall back to a random-ish but valid value — user will edit it
    return `explorer${Date.now().toString().slice(-6)}`;
  }
}
