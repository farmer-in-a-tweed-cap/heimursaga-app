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
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { Public, Session } from '@/common/decorators';
import { ParamPublicIdDto } from '@/common/dto';
import { ISession } from '@/common/interfaces';

import { PostCreateDto, PostUpdateDto } from './post.dto';
import { PostService } from './post.service';

@ApiTags('posts')
@Controller('posts')
export class PostController {
  constructor(private postService: PostService) {}

  @Public()
  @Get()
  @HttpCode(HttpStatus.OK)
  async search(@Session() session: ISession) {
    return await this.postService.search({ query: {}, session });
  }

  @Public()
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getById(
    @Param() param: ParamPublicIdDto,
    @Session() session: ISession,
  ) {
    return await this.postService.getById({
      query: { publicId: param.id },
      session,
    });
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() body: PostCreateDto, @Session() session: ISession) {
    return await this.postService.create({
      payload: body,
      session,
    });
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param() param: ParamPublicIdDto,
    @Body() body: PostUpdateDto,
    @Session() session: ISession,
  ) {
    return await this.postService.update(
      {
        query: { publicId: param.id },
        session,
      },
      body,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async delete(@Param() param: ParamPublicIdDto, @Session() session: ISession) {
    return await this.postService.delete({
      query: { publicId: param.id },
      session,
    });
  }

  @Post(':id/like')
  @HttpCode(HttpStatus.OK)
  async like(@Param() param: ParamPublicIdDto, @Session() session: ISession) {
    return await this.postService.like({
      query: { publicId: param.id },
      session,
    });
  }

  @Post(':id/bookmark')
  @HttpCode(HttpStatus.OK)
  async bookmark(
    @Param() param: ParamPublicIdDto,
    @Session() session: ISession,
  ) {
    return await this.postService.bookmark({
      query: { publicId: param.id },
      session,
    });
  }
}
