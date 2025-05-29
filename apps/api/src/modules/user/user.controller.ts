import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { Public, Session } from '@/common/decorators';
import { ParamUsernameDto } from '@/common/dto';
import { FileInterceptor } from '@/common/interceptors';
import { ISession } from '@/common/interfaces';
import { SponsorService } from '@/modules/sponsor';
import { IUploadedFile } from '@/modules/upload';

import { UserSettingsProfileUpdateDto } from './user.dto';
import { SessionUserService, UserService } from './user.service';

@ApiTags('users')
@Controller('users')
export class UserController {
  constructor(private userService: UserService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async getUsers(@Session() session: ISession) {
    return await this.userService.getUsers({
      query: {},
      session,
    });
  }

  @Public()
  @Get(':username')
  @HttpCode(HttpStatus.OK)
  async getByUsername(
    @Param() param: ParamUsernameDto,
    @Session() session: ISession,
  ) {
    return await this.userService.getByUsername({
      query: { username: param.username },
      session,
    });
  }

  @Post(':username/block')
  @HttpCode(HttpStatus.OK)
  async blockUser(
    @Param() param: ParamUsernameDto,
    @Session() session: ISession,
  ) {
    return await this.userService.blockUser({
      query: { username: param.username },
      session,
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
  constructor(
    private sessionUserService: SessionUserService,
    private sponsorService: SponsorService,
  ) {}

  @Get('settings/profile')
  @HttpCode(HttpStatus.OK)
  async getProfileSettings(@Session() session: ISession) {
    return await this.sessionUserService.getSettings({
      query: { context: 'profile' },
      session,
    });
  }

  @Put('settings/profile')
  @HttpCode(HttpStatus.OK)
  async updateProfileSettings(
    @Body() body: UserSettingsProfileUpdateDto,
    @Session() session: ISession,
  ) {
    return await this.sessionUserService.updateSettings({
      query: { context: 'profile' },
      payload: body,
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
      query: {},
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

  @Get('insights/post')
  @HttpCode(HttpStatus.OK)
  async getPostInsights(@Session() session: ISession) {
    return await this.sessionUserService.getPostInsights({
      query: {},
      session,
    });
  }

  @Get('sponsorships')
  @HttpCode(HttpStatus.OK)
  async getSponsorships(@Session() session: ISession) {
    return await this.sponsorService.getUserSponsorships({
      session,
      query: {},
    });
  }
}
