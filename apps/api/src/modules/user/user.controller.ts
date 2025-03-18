import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { Public, Session } from '@/common/decorators';
import { ParamUsernameDto } from '@/common/dto';
import { IRequest, ISession } from '@/common/interfaces';

import { UserSettingsProfileUpdateDto } from './user.dto';
import { SessionUserService, UserService } from './user.service';

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

@ApiTags('user')
@Controller('user')
export class SessionUserController {
  constructor(private sessionUserService: SessionUserService) {}

  @Get('settings/profile')
  @HttpCode(HttpStatus.OK)
  async getProfileSettings(@Session() session: ISession) {
    return await this.sessionUserService.getSettings({
      userId: session.userId,
      context: 'profile',
    });
  }

  @Put('settings/profile')
  @HttpCode(HttpStatus.OK)
  async updateProfileSettings(
    @Body() body: UserSettingsProfileUpdateDto,
    @Session() session: ISession,
  ) {
    return await this.sessionUserService.updateSettings({
      userId: session.userId,
      context: 'profile',
      profile: body,
    });
  }

  @Get('posts')
  @HttpCode(HttpStatus.OK)
  async getPosts(@Session() session: ISession) {
    return await this.sessionUserService.getPosts({
      userId: session.userId,
      context: 'feed',
    });
  }

  @Get('bookmarks')
  @HttpCode(HttpStatus.OK)
  async getBookmarks(@Session() session: ISession) {
    return await this.sessionUserService.getPosts({
      userId: session.userId,
      context: 'bookmarks',
    });
  }

  @Get('drafts')
  @HttpCode(HttpStatus.OK)
  async getDrafts(@Session() session: ISession) {
    return await this.sessionUserService.getPosts({
      userId: session.userId,
      context: 'drafts',
    });
  }
}
