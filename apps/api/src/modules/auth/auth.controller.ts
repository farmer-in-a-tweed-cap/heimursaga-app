import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SkipThrottle, Throttle, ThrottlerGuard } from '@nestjs/throttler';

import { SESSION_KEYS } from '@/common/constants';
import { Public, Session } from '@/common/decorators';
import { BotDetectionGuard } from '@/common/guards/bot-detection.guard';
import { IRequest, IResponse, ISession } from '@/common/interfaces';

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
  constructor(private authService: AuthService) {}

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
