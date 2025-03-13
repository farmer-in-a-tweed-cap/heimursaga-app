import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { COOKIE_KEYS, SESSION_KEYS } from '@/common/constants';
import { Public, Session } from '@/common/decorators';
import { IRequest, IResponse, IUserSession } from '@/common/interfaces';

import { LoginPayloadDto, SignupPayloadDto } from './auth.dto';
import { AuthService } from './auth.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Get('user')
  @HttpCode(HttpStatus.OK)
  async getSessionUser(@Session() session: IUserSession) {
    return await this.authService.getSessionUser(session);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Req() req: IRequest,
    @Res() res: IResponse,
    @Body() body: LoginPayloadDto,
    @Session() session: IUserSession,
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
  async signup(
    @Req() req: IRequest,
    @Res() res: IResponse,
    @Body() body: SignupPayloadDto,
    // @Session() session: IUserSession,
  ) {
    // @todo

    await this.authService.signup({
      ...body,
      // session,
    });

    // @todo
    req.session.set(SESSION_KEYS.SID, 'user.session.sid');
    res.send();
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: IRequest,
    @Res() res: IResponse,
    @Session() session: IUserSession,
  ) {
    try {
      await this.authService.logout(session);
    } finally {
      // clear the session
      req.session.delete();
      res.send();
    }
  }
}
