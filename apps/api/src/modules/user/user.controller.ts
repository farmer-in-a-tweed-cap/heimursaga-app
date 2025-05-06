import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { Public, Session } from '@/common/decorators';
import { ParamPublicIdDto, ParamUsernameDto } from '@/common/dto';
import { FileInterceptor } from '@/common/interceptors';
import { IRequest, ISession } from '@/common/interfaces';
import { IUploadedFile } from '@/modules/upload';

import {
  UserMembershipTierUpdateDto,
  UserSettingsProfileUpdateDto,
} from './user.dto';
import { SessionUserService, UserService } from './user.service';

@ApiTags('users')
@Controller('users')
export class UserController {
  constructor(private userService: UserService) {}

  @Public()
  @Get(':username')
  @HttpCode(HttpStatus.OK)
  async getByUsername(
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
    @Param() param: ParamUsernameDto,
    @Session() session: ISession,
  ) {
    const { username } = param;

    return await this.userService.getPosts({
      username,
      userId: session.userId,
    });
  }

  @Public()
  @Get(':username/map')
  @HttpCode(HttpStatus.OK)
  async getMap(@Param() param: ParamUsernameDto) {
    return await this.userService.getMap({
      username: param.username,
    });
  }

  @Public()
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

  @Public()
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

  @Public()
  @Get(':username/sponsorship-tiers')
  @HttpCode(HttpStatus.OK)
  async getSponsorshipTiers(
    @Param() param: ParamUsernameDto,
    @Session() session: ISession,
  ) {
    const { username } = param;

    return await this.userService.getSponsorshipTiers({
      username,
      available: true,
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
      payload: {
        context: 'profile',
        profile: body,
      },
      session,
    });
  }

  @Post('picture')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        files: 1,
        fileSize: 2 * 1024 * 1024,
      },
    }),
  )
  async updatePicture(
    @UploadedFile() file: IUploadedFile,
    @Session() session: ISession,
  ) {
    return await this.sessionUserService.updatePicture({
      payload: { file },
      session,
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

  @Get('notifications')
  @HttpCode(HttpStatus.OK)
  async getNotifications(@Session() session: ISession) {
    return await this.sessionUserService.getNotifications({
      session,
      query: {},
    });
  }

  @Get('sponsorship-tiers')
  @HttpCode(HttpStatus.OK)
  async getSponsorshipTiers(@Session() session: ISession) {
    return await this.sessionUserService.getSponsorshipTiers({
      query: {},
      session,
    });
  }

  @Put('sponsorship-tiers/:id')
  @HttpCode(HttpStatus.OK)
  async updateSponsorshipTier(
    @Param() param: ParamPublicIdDto,
    @Body() body: UserMembershipTierUpdateDto,
    @Session() session: ISession,
  ) {
    return await this.sessionUserService.updateSponsorshipTier({
      query: { id: param.id },
      payload: body,
      session,
    });
  }

  @Delete('sponsorship-tiers/:id')
  @HttpCode(HttpStatus.OK)
  async deleteSponsorshipTier(
    @Param() param: ParamPublicIdDto,
    @Session() session: ISession,
  ) {
    return await this.sessionUserService.deleteSponsorshipTier({
      query: { id: param.id },
      session,
    });
  }

  @Get('insights/post')
  @HttpCode(HttpStatus.OK)
  async getPostInsights(@Session() session: ISession) {
    return await this.sessionUserService.getPostInsights({
      query: {},
      session,
    });
  }
}
