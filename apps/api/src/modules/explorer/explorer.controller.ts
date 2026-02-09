import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { Public, Session } from '@/common/decorators';
import { ParamUsernameDto } from '@/common/dto';
import { FileInterceptor } from '@/common/interceptors';
import { ISession } from '@/common/interfaces';
import { ExpeditionService } from '@/modules/expedition';
import { SponsorService } from '@/modules/sponsor';
import { IUploadedFile } from '@/modules/upload';

import { ExplorerSettingsProfileUpdateDto } from './explorer.dto';
import { ExplorerService, SessionExplorerService } from './explorer.service';

@ApiTags('users')
@Controller('users')
export class ExplorerController {
  constructor(
    private explorerService: ExplorerService,
    private expeditionService: ExpeditionService,
  ) {}

  @Public()
  @Get()
  @HttpCode(HttpStatus.OK)
  async getExplorers(
    @Session() session: ISession,
    @Query('context') context?: string,
  ) {
    return await this.explorerService.getExplorers({
      query: { context },
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
    return await this.explorerService.getByUsername({
      query: { username: param.username },
      session,
    });
  }

  @Post(':username/block')
  @HttpCode(HttpStatus.OK)
  async blockExplorer(
    @Param() param: ParamUsernameDto,
    @Session() session: ISession,
  ) {
    return await this.explorerService.blockExplorer({
      query: { username: param.username },
      session,
    });
  }

  @Public()
  @Get(':username/posts')
  @HttpCode(HttpStatus.OK)
  async getEntries(
    @Param() param: ParamUsernameDto,
    @Session() session: ISession,
  ) {
    const { username } = param;

    return await this.explorerService.getEntries({
      username,
      explorerId: session.explorerId,
    });
  }

  @Public()
  @Get(':username/trips')
  @HttpCode(HttpStatus.OK)
  async getExpeditionsByUsername(
    @Param() param: ParamUsernameDto,
    @Session() session: ISession,
  ) {
    const { username } = param;

    return await this.expeditionService.getExpeditionsByUsername({
      query: { username },
      session,
    });
  }

  @Public()
  @Get(':username/map')
  @HttpCode(HttpStatus.OK)
  async getMap(@Param() param: ParamUsernameDto) {
    return await this.explorerService.getMap({
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

    return await this.explorerService.getFollowers({
      username,
      explorerId: session.explorerId,
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

    return await this.explorerService.getFollowing({
      username,
      explorerId: session.explorerId,
    });
  }

  @Post(':username/follow')
  @HttpCode(HttpStatus.OK)
  async follow(@Param() param: ParamUsernameDto, @Session() session: ISession) {
    const { username } = param;

    return await this.explorerService.follow({
      username,
      explorerId: session.explorerId,
    });
  }

  @Post(':username/unfollow')
  @HttpCode(HttpStatus.OK)
  async unfollow(
    @Param() param: ParamUsernameDto,
    @Session() session: ISession,
  ) {
    const { username } = param;

    return await this.explorerService.unfollow({
      username,
      explorerId: session.explorerId,
    });
  }

  @Post(':username/bookmark')
  @HttpCode(HttpStatus.OK)
  async bookmark(
    @Param() param: ParamUsernameDto,
    @Session() session: ISession,
  ) {
    return await this.explorerService.bookmarkExplorer({
      query: { username: param.username },
      session,
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

    return await this.explorerService.getSponsorshipTiers({
      username,
      available: true,
      explorerId: session.explorerId,
    });
  }
}

@ApiTags('user')
@Controller('user')
export class SessionExplorerController {
  constructor(
    private sessionExplorerService: SessionExplorerService,
    private sponsorService: SponsorService,
  ) {}

  @Get('settings/profile')
  @HttpCode(HttpStatus.OK)
  async getProfileSettings(@Session() session: ISession) {
    return await this.sessionExplorerService.getSettings({
      query: { context: 'profile' },
      session,
    });
  }

  @Put('settings/profile')
  @HttpCode(HttpStatus.OK)
  async updateProfileSettings(
    @Body() body: ExplorerSettingsProfileUpdateDto,
    @Session() session: ISession,
  ) {
    return await this.sessionExplorerService.updateSettings({
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
        fileSize: 10 * 1024 * 1024, // 10MB to support HEIC files
      },
    }),
  )
  async updatePicture(
    @UploadedFile() file: IUploadedFile,
    @Session() session: ISession,
  ) {
    return await this.sessionExplorerService.updatePicture({
      query: {},
      payload: { file },
      session,
    });
  }

  @Post('cover')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        files: 1,
        fileSize: 10 * 1024 * 1024, // 10MB for cover photos
      },
    }),
  )
  async updateCoverPhoto(
    @UploadedFile() file: IUploadedFile,
    @Session() session: ISession,
  ) {
    return await this.sessionExplorerService.updateCoverPhoto({
      query: {},
      payload: { file },
      session,
    });
  }

  @Get('posts')
  @HttpCode(HttpStatus.OK)
  async getEntries(@Session() session: ISession) {
    return await this.sessionExplorerService.getEntries({
      explorerId: session.explorerId,
      context: 'feed',
    });
  }

  @Get('bookmarks')
  @HttpCode(HttpStatus.OK)
  async getBookmarks(@Session() session: ISession) {
    return await this.sessionExplorerService.getEntries({
      explorerId: session.explorerId,
      context: 'bookmarks',
    });
  }

  @Get('bookmarks/expeditions')
  @HttpCode(HttpStatus.OK)
  async getBookmarkedExpeditions(@Session() session: ISession) {
    return await this.sessionExplorerService.getBookmarkedExpeditions({
      explorerId: session.explorerId,
    });
  }

  @Get('bookmarks/explorers')
  @HttpCode(HttpStatus.OK)
  async getBookmarkedExplorers(@Session() session: ISession) {
    return await this.sessionExplorerService.getBookmarkedExplorers({
      explorerId: session.explorerId,
    });
  }

  @Get('drafts')
  @HttpCode(HttpStatus.OK)
  async getDrafts(@Session() session: ISession) {
    return await this.sessionExplorerService.getEntries({
      explorerId: session.explorerId,
      context: 'drafts',
    });
  }

  @Get('notifications')
  @HttpCode(HttpStatus.OK)
  async getNotifications(@Session() session: ISession) {
    return await this.sessionExplorerService.getNotifications({
      session,
      query: {},
    });
  }

  @Post('notifications/mark-read')
  @HttpCode(HttpStatus.OK)
  async markNotificationsAsRead(@Session() session: ISession) {
    return await this.sessionExplorerService.markNotificationsAsRead({
      session,
      query: {},
    });
  }

  @Get('badge-count')
  @HttpCode(HttpStatus.OK)
  async getBadgeCount(@Session() session: ISession) {
    return await this.sessionExplorerService.getBadgeCount({
      session,
      query: {},
    });
  }

  @Get('insights/post')
  @HttpCode(HttpStatus.OK)
  async getEntryInsights(@Session() session: ISession) {
    return await this.sessionExplorerService.getEntryInsights({
      query: {},
      session,
    });
  }

  @Get('sponsorships')
  @HttpCode(HttpStatus.OK)
  async getSponsorships(@Session() session: ISession) {
    return await this.sponsorService.getSponsorships({
      session,
      query: {},
    });
  }

  @Get('trips')
  @HttpCode(HttpStatus.OK)
  async getExpeditions(@Session() session: ISession) {
    return await this.sessionExplorerService.getExpeditions({
      session,
      query: {},
    });
  }
}
