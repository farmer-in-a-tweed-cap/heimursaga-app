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
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { Public, Session } from '@/common/decorators';
import { ParamPublicIdDto } from '@/common/dto';
import { IRequest, ISession } from '@/common/interfaces';

import { PostCreatePayloadDto, PostUpdatePayloadDto } from './post.dto';
import { PostService } from './post.service';

@ApiTags('posts')
@Controller('posts')
export class PostController {
  constructor(private postService: PostService) {}

  @Public()
  @Get()
  @HttpCode(HttpStatus.OK)
  async search(@Session() session: ISession) {
    return await this.postService.search({ userId: session?.userId });
  }

  @Public()
  @Get('map')
  @HttpCode(HttpStatus.OK)
  async queryMap(@Session() session: ISession) {
    return await this.postService.queryMap({ userId: session?.userId });
  }

  @Public()
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getById(
    @Req() req: IRequest,
    @Param() param: ParamPublicIdDto,
    @Session() session: ISession,
  ) {
    const { id } = param;

    return await this.postService.getById({
      publicId: id,
      userId: session?.userId,
    });
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() body: PostCreatePayloadDto,
    @Session() session: ISession,
  ) {
    return await this.postService.create({
      ...body,
      userId: session.userId,
    });
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param() param: ParamPublicIdDto,
    @Body() body: PostUpdatePayloadDto,
    @Session() session: ISession,
  ) {
    return await this.postService.update({
      ...body,
      publicId: param.id,
      userId: session.userId,
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async delete(@Param() param: ParamPublicIdDto, @Session() session: ISession) {
    return await this.postService.delete({
      publicId: param.id,
      userId: session.userId,
    });
  }

  @Post(':id/like')
  @HttpCode(HttpStatus.OK)
  async like(@Param() param: ParamPublicIdDto, @Session() session: ISession) {
    return await this.postService.like({
      publicId: param.id,
      userId: session.userId,
    });
  }

  @Post(':id/bookmark')
  @HttpCode(HttpStatus.OK)
  async bookmark(
    @Param() param: ParamPublicIdDto,
    @Session() session: ISession,
  ) {
    return await this.postService.bookmark({
      publicId: param.id,
      userId: session.userId,
    });
  }
}
