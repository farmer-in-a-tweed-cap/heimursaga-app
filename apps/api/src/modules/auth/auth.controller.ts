import {
  Body,
  Controller,
  Delete,
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
import { SkipThrottle, Throttle } from '@nestjs/throttler';

import { SESSION_KEYS } from '@/common/constants';
import { Public, Session } from '@/common/decorators';
import { BotDetectionGuard } from '@/common/guards/bot-detection.guard';
import { IRequest, IResponse, ISession } from '@/common/interfaces';
import { SessionExplorerService } from '@/modules/explorer/explorer.service';

import {
  LoginDto,
  MobileRefreshDto,
  PasswordResetDto,
  PasswordUpdateDto,
  SendEmailVerificationDto,
  SignupDto,
  VerifyEmailDto,
} from './auth.dto';
import { AuthService } from './auth.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private sessionExplorerService: SessionExplorerService,
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
  @Throttle({
    short: { limit: 5, ttl: 60000 },
    medium: { limit: 20, ttl: 600000 },
    long: { limit: 50, ttl: 3600000 },
  })
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
  @Throttle({
    short: { limit: 2, ttl: 300000 },
    medium: { limit: 2, ttl: 300000 },
    long: { limit: 2, ttl: 300000 },
  })
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
  @Throttle({
    short: { limit: 3, ttl: 300000 },
    medium: { limit: 3, ttl: 300000 },
    long: { limit: 3, ttl: 300000 },
  })
  async resetPassword(@Body() body: PasswordResetDto) {
    return this.authService.resetPassword(body);
  }

  @Public()
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({
    short: { limit: 3, ttl: 300000 },
    medium: { limit: 3, ttl: 300000 },
    long: { limit: 3, ttl: 300000 },
  })
  async updatePassword(@Body() body: PasswordUpdateDto) {
    return this.authService.updatePassword(body);
  }

  // Mobile-specific endpoints using JWT tokens
  @Public()
  @Post('mobile/login')
  @HttpCode(HttpStatus.OK)
  @Throttle({
    short: { limit: 5, ttl: 60000 },
    medium: { limit: 15, ttl: 600000 },
    long: { limit: 30, ttl: 3600000 },
  })
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
  @Throttle({
    short: { limit: 30, ttl: 60000 },
    medium: { limit: 30, ttl: 60000 },
    long: { limit: 30, ttl: 60000 },
  })
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
  @Throttle({
    short: { limit: 10, ttl: 60000 },
    medium: { limit: 10, ttl: 60000 },
    long: { limit: 10, ttl: 60000 },
  })
  async mobileRefresh(@Body() body: MobileRefreshDto) {
    const result = await this.authService.mobileRefresh(body.refreshToken);

    return {
      success: true,
      data: result,
    };
  }

  @Public()
  @Get('mobile/bookmarks')
  @HttpCode(HttpStatus.OK)
  @Throttle({
    short: { limit: 30, ttl: 60000 },
    medium: { limit: 30, ttl: 60000 },
    long: { limit: 30, ttl: 60000 },
  })
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

    const result = await this.sessionExplorerService.getEntries({
      explorerId: tokenData.userId,
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
  @Throttle({
    short: { limit: 30, ttl: 60000 },
    medium: { limit: 30, ttl: 60000 },
    long: { limit: 30, ttl: 60000 },
  })
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

    const result = await this.sessionExplorerService.getNotifications({
      session: {
        sid: 'mobile-jwt-session',
        userId: tokenData.userId,
        explorerId: tokenData.userId,
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
  @Throttle({
    short: { limit: 10, ttl: 60000 },
    medium: { limit: 10, ttl: 60000 },
    long: { limit: 10, ttl: 60000 },
  })
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

    await this.sessionExplorerService.markNotificationsAsRead({
      session: {
        sid: 'mobile-jwt-session',
        userId: tokenData.userId,
        explorerId: tokenData.userId,
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
  @Throttle({
    short: { limit: 30, ttl: 60000 },
    medium: { limit: 30, ttl: 60000 },
    long: { limit: 30, ttl: 60000 },
  })
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

    const result = await this.sessionExplorerService.getBadgeCount({
      session: {
        sid: 'mobile-jwt-session',
        userId: tokenData.userId,
        explorerId: tokenData.userId,
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
  @Post('mobile/push-token')
  @HttpCode(HttpStatus.OK)
  @Throttle({
    short: { limit: 10, ttl: 60000 },
    medium: { limit: 10, ttl: 60000 },
    long: { limit: 10, ttl: 60000 },
  })
  async registerPushToken(
    @Headers('authorization') authHeader: string,
    @Body() body: { token: string; platform: string },
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException(
        'Authorization header missing or invalid',
      );
    }
    const jwt = authHeader.substring(7);
    const tokenData = await this.authService.verifyToken(jwt);
    if (!tokenData) {
      throw new UnauthorizedException('Invalid or expired token');
    }
    if (
      !body.token ||
      typeof body.token !== 'string' ||
      body.token.length > 250
    ) {
      return { success: false, message: 'Valid token is required' };
    }
    if (!body.platform || !['ios', 'android'].includes(body.platform)) {
      return { success: false, message: 'Platform must be ios or android' };
    }

    await this.authService.registerPushToken(
      tokenData.userId,
      body.token,
      body.platform,
    );

    return { success: true };
  }

  @Public()
  @Post('mobile/push-token/remove')
  @HttpCode(HttpStatus.OK)
  @Throttle({
    short: { limit: 10, ttl: 60000 },
    medium: { limit: 10, ttl: 60000 },
    long: { limit: 10, ttl: 60000 },
  })
  async removePushToken(
    @Headers('authorization') authHeader: string,
    @Body() body: { token: string },
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException(
        'Authorization header missing or invalid',
      );
    }
    const jwt = authHeader.substring(7);
    const tokenData = await this.authService.verifyToken(jwt);
    if (!tokenData) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    if (body.token) {
      await this.authService.removePushToken(tokenData.userId, body.token);
    }

    return { success: true };
  }

  @Public()
  @Delete('mobile/account')
  @HttpCode(HttpStatus.OK)
  @Throttle({
    short: { limit: 3, ttl: 300000 },
    medium: { limit: 3, ttl: 300000 },
    long: { limit: 3, ttl: 300000 },
  })
  async deleteMobileAccount(@Headers('authorization') authHeader: string) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException(
        'Authorization header missing or invalid',
      );
    }
    const jwt = authHeader.substring(7);
    const tokenData = await this.authService.verifyToken(jwt);
    if (!tokenData) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    await this.authService.deleteAccount(tokenData.userId);

    return { success: true };
  }

  @Delete('account')
  @HttpCode(HttpStatus.OK)
  @Throttle({
    short: { limit: 3, ttl: 300000 },
    medium: { limit: 3, ttl: 300000 },
    long: { limit: 3, ttl: 300000 },
  })
  async deleteAccount(@Session() session: ISession) {
    await this.authService.deleteAccount(session.userId);
    return { success: true };
  }

  @Public()
  @Get('tokens/:token')
  @HttpCode(HttpStatus.OK)
  @Throttle({
    short: { limit: 10, ttl: 60000 },
    medium: { limit: 10, ttl: 60000 },
    long: { limit: 10, ttl: 60000 },
  })
  async validateToken(@Param('token') token: string) {
    return this.authService.validateToken(token);
  }

  @Public()
  @Post('send-email-verification')
  @HttpCode(HttpStatus.OK)
  @Throttle({
    short: { limit: 3, ttl: 300000 },
    medium: { limit: 3, ttl: 300000 },
    long: { limit: 3, ttl: 300000 },
  })
  async sendEmailVerification(@Body() body: SendEmailVerificationDto) {
    return this.authService.sendEmailVerification(body.email);
  }

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @Throttle({
    short: { limit: 5, ttl: 60000 },
    medium: { limit: 5, ttl: 60000 },
    long: { limit: 5, ttl: 60000 },
  })
  async verifyEmail(@Body() body: VerifyEmailDto) {
    return this.authService.verifyEmail(body.token);
  }

  @Post('resend-email-verification')
  @HttpCode(HttpStatus.OK)
  @Throttle({
    short: { limit: 2, ttl: 300000 },
    medium: { limit: 2, ttl: 300000 },
    long: { limit: 2, ttl: 300000 },
  })
  async resendEmailVerification(@Session() session: ISession) {
    return this.authService.resendEmailVerification(session);
  }
}
