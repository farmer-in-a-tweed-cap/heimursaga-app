import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { SESSION_KEYS } from '@/common/constants';
import { Public, Session } from '@/common/decorators';
import { IRequest, IResponse, ISession } from '@/common/interfaces';

import {
  LoginPayloadDto,
  PasswordChangeDto,
  PasswordResetDto,
  SignupPayloadDto,
} from './auth.dto';
import { AuthService } from './auth.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Get('user')
  @HttpCode(HttpStatus.OK)
  async getSessionUser(@Session() session: ISession) {
    return await this.authService.getSessionUser(session);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Req() req: IRequest,
    @Res() res: IResponse,
    @Body() body: LoginPayloadDto,
    @Session() session: ISession,
  ) {
    const user = await this.authService.login({
      ...body,
      session,
    });

    req.session.set(SESSION_KEYS.SID, user.session.sid);
    res.send();
  }

  @Public()
  @Post('signup')
  @HttpCode(HttpStatus.OK)
  async signup(@Body() body: SignupPayloadDto) {
    return this.authService.signup({
      ...body,
    });
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
  async resetPassword(@Body() body: PasswordResetDto) {
    return this.authService.resetPassword(body);
  }

  @Public()
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(@Body() body: PasswordChangeDto) {
    return this.authService.changePassword(body);
  }

  @Public()
  @Get('tokens/:token')
  @HttpCode(HttpStatus.OK)
  async validateToken(@Param('token') token: string) {
    return this.authService.validateToken(token);
  }
}
