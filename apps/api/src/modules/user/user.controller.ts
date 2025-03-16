import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
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

  @Public()
  @Get(':username/posts')
  @HttpCode(HttpStatus.OK)
  async getPosts(
    @Req() req: IRequest,
    @Param() param: ParamUsernameDto,
    @Session() session: ISession,
  ) {
    const { username } = param;

    return await this.userService.getPosts({
      username,
      userId: session.userId,
    });
  }

  @Get(':username/followers')
  @HttpCode(HttpStatus.OK)
  async getFollowers(
    @Param() param: ParamUsernameDto,
    @Session() session: ISession,
  ) {
    const { username } = param;

    return await this.userService.getFollowers({
      username,
      userId: session.userId,
    });
  }

  @Get(':username/following')
  @HttpCode(HttpStatus.OK)
  async getFollowing(
    @Param() param: ParamUsernameDto,
    @Session() session: ISession,
  ) {
    const { username } = param;

    return await this.userService.getFollowing({
      username,
      userId: session.userId,
    });
  }

  @Post(':username/follow')
  @HttpCode(HttpStatus.OK)
  async follow(@Param() param: ParamUsernameDto, @Session() session: ISession) {
    const { username } = param;

    return await this.userService.follow({
      username,
      userId: session.userId,
    });
  }

  @Post(':username/unfollow')
  @HttpCode(HttpStatus.OK)
  async unfollow(
    @Param() param: ParamUsernameDto,
    @Session() session: ISession,
  ) {
    const { username } = param;

    return await this.userService.unfollow({
      username,
      userId: session.userId,
    });
  }
}
