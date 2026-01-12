import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SkipThrottle, Throttle, ThrottlerGuard } from '@nestjs/throttler';

import { SESSION_KEYS } from '@/common/constants';
import { Public, Session } from '@/common/decorators';
import { BotDetectionGuard } from '@/common/guards/bot-detection.guard';
import { IRequest, IResponse, ISession } from '@/common/interfaces';
import { SessionUserService } from '@/modules/user/user.service';

import {
  LoginDto,
  PasswordResetDto,
  PasswordUpdateDto,
  SignupDto,
} from './auth.dto';
import { AuthService } from './auth.service';

@ApiTags('auth')
@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(
    private authService: AuthService,
    private sessionUserService: SessionUserService,
  ) {}

  @Get('user')
  @HttpCode(HttpStatus.OK)
  @SkipThrottle()
  async getSessionUser(@Session() session: ISession) {
    return await this.authService.getSessionUser(session);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 attempts per minute
  async login(
    @Req() req: IRequest,
    @Res() res: IResponse,
    @Body() body: LoginDto,
    @Session() session: ISession,
  ) {
    const user = await this.authService.login({
      query: {},
      payload: body,
      session,
    });

    req.session.set(SESSION_KEYS.SID, user.session.sid);
    res.send();
  }

  @Public()
  @Post('signup')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 2, ttl: 300000 } }) // 2 registrations per 5 minutes
  @UseGuards(BotDetectionGuard)
  async signup(
    @Req() req: IRequest,
    @Res() res: IResponse,
    @Body() body: SignupDto,
  ) {
    const user = await this.authService.signupAndLogin(body);

    req.session.set(SESSION_KEYS.SID, user.session.sid);
    res.send();
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: IRequest,
    @Res() res: IResponse,
    @Session() session: ISession,
  ) {
    try {
      await this.authService.logout(session);
    } finally {
      // clear the session
      req.session.delete();
      res.send();
    }
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 300000 } }) // 3 reset attempts per 5 minutes
  async resetPassword(@Body() body: PasswordResetDto) {
    return this.authService.resetPassword(body);
  }

  @Public()
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 300000 } }) // 3 password change attempts per 5 minutes
  async updatePassword(@Body() body: PasswordUpdateDto) {
    return this.authService.updatePassword(body);
  }

  // Mobile-specific endpoints using JWT tokens
  @Public()
  @Post('mobile/login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 attempts per minute
  async mobileLogin(
    @Req() req: IRequest,
    @Body() body: LoginDto,
    @Session() session: ISession,
  ) {
    const result = await this.authService.mobileLogin({
      query: {},
      payload: body,
      session,
    });

    return {
      success: true,
      data: result,
    };
  }

  @Public()
  @Get('mobile/user')
  @HttpCode(HttpStatus.OK)
  @SkipThrottle()
  async getMobileUser(@Headers('authorization') authHeader?: string) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException(
        'Authorization header missing or invalid',
      );
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const user = await this.authService.getTokenUser(token);

    return {
      success: true,
      data: user,
    };
  }

  @Public()
  @Post('mobile/refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 refresh attempts per minute
  async mobileRefresh(@Body() body: { refreshToken: string }) {
    const result = await this.authService.mobileRefresh(body.refreshToken);

    return {
      success: true,
      data: result,
    };
  }

  @Public()
  @Get('mobile/bookmarks')
  @HttpCode(HttpStatus.OK)
  @SkipThrottle()
  async getMobileBookmarks(@Headers('authorization') authHeader?: string) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException(
        'Authorization header missing or invalid',
      );
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const tokenData = await this.authService.verifyToken(token);

    if (!tokenData) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    const result = await this.sessionUserService.getPosts({
      userId: tokenData.userId,
      context: 'bookmarks',
    });

    return {
      success: true,
      data: result,
    };
  }

  @Public()
  @Get('mobile/notifications')
  @HttpCode(HttpStatus.OK)
  @SkipThrottle()
  async getMobileNotifications(@Headers('authorization') authHeader?: string) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException(
        'Authorization header missing or invalid',
      );
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const tokenData = await this.authService.verifyToken(token);

    if (!tokenData) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    const result = await this.sessionUserService.getNotifications({
      session: {
        sid: 'mobile-jwt-session',
        userId: tokenData.userId,
        userRole: tokenData.role,
      },
      query: {},
    });

    return {
      success: true,
      data: result,
    };
  }

  @Public()
  @Post('mobile/notifications/mark-read')
  @HttpCode(HttpStatus.OK)
  @SkipThrottle()
  async markMobileNotificationsAsRead(
    @Headers('authorization') authHeader?: string,
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException(
        'Authorization header missing or invalid',
      );
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const tokenData = await this.authService.verifyToken(token);

    if (!tokenData) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    await this.sessionUserService.markNotificationsAsRead({
      session: {
        sid: 'mobile-jwt-session',
        userId: tokenData.userId,
        userRole: tokenData.role,
      },
      query: {},
    });

    return {
      success: true,
    };
  }

  @Public()
  @Get('mobile/badge-count')
  @HttpCode(HttpStatus.OK)
  @SkipThrottle()
  async getMobileBadgeCount(@Headers('authorization') authHeader?: string) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException(
        'Authorization header missing or invalid',
      );
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const tokenData = await this.authService.verifyToken(token);

    if (!tokenData) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    const result = await this.sessionUserService.getBadgeCount({
      session: {
        sid: 'mobile-jwt-session',
        userId: tokenData.userId,
        userRole: tokenData.role,
      },
      query: {},
    });

    return {
      success: true,
      data: result,
    };
  }

  @Public()
  @Get('tokens/:token')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 token validations per minute
  async validateToken(@Param('token') token: string) {
    return this.authService.validateToken(token);
  }

  @Public()
  @Post('send-email-verification')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 300000 } }) // 3 verification emails per 5 minutes
  async sendEmailVerification(@Body() body: { email: string }) {
    return this.authService.sendEmailVerification(body.email);
  }

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 verification attempts per minute
  async verifyEmail(@Body() body: { token: string }) {
    return this.authService.verifyEmail(body.token);
  }

  @Post('resend-email-verification')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 2, ttl: 300000 } }) // 2 resend attempts per 5 minutes
  async resendEmailVerification(@Session() session: ISession) {
    return this.authService.resendEmailVerification(session);
  }
}
