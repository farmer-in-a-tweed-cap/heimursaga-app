import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { Public, Session } from '@/common/decorators';
import { ParamUsernameDto } from '@/common/dto';
import { IRequest, ISession } from '@/common/interfaces';

import { UserService } from './user.service';

@ApiTags('users')
@Controller('users')
export class UserController {
  constructor(private userService: UserService) {}

  @Public()
  @Get(':username')
  @HttpCode(HttpStatus.OK)
  async getByUsername(
    @Req() req: IRequest,
    @Param() param: ParamUsernameDto,
    @Session() session: ISession,
  ) {
    const { username } = param;

    return await this.userService.getByUsername({
      username,
      userId: session.userId,
    });
  }
}
