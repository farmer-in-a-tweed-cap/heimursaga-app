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
import { ParamNumberIdDto } from '@/common/dto';
import { IUserSession } from '@/common/interfaces';

import { PostCreatePayloadDto, PostUpdatePayloadDto } from './post.dto';
import { PostService } from './post.service';

@ApiTags('posts')
@Controller('posts')
export class PostController {
  constructor(private postService: PostService) {}

  @Public()
  @Get()
  @HttpCode(HttpStatus.OK)
  async search() {
    return await this.postService.search({});
  }

  @Public()
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getById(@Param() param: ParamNumberIdDto) {
    const { id } = param;
    return await this.postService.getById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() body: PostCreatePayloadDto,
    @Session() session: IUserSession,
  ) {
    return await this.postService.create({
      ...body,
      userId: session.userId,
    });
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param() param: ParamNumberIdDto,
    @Body() body: PostUpdatePayloadDto,
    @Session() session: IUserSession,
  ) {
    console.log('delete', { ...param, ...body });

    return await this.postService.update({
      ...body,
      id: param.id,
      userId: session.userId,
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async delete(
    @Param() param: ParamNumberIdDto,
    @Session() session: IUserSession,
  ) {
    console.log('delete', param);

    return await this.postService.delete({
      id: param.id,
      userId: session.userId,
    });
  }

  @Post(':id/like')
  @HttpCode(HttpStatus.OK)
  async like(
    @Param() param: ParamNumberIdDto,
    @Session() session: IUserSession,
  ) {
    return await this.postService.like({
      id: param.id,
      userId: session.userId,
    });
  }

  @Post(':id/bookmark')
  @HttpCode(HttpStatus.OK)
  async bookmark(
    @Param() param: ParamNumberIdDto,
    @Session() session: IUserSession,
  ) {
    return await this.postService.bookmark({
      id: param.id,
      userId: session.userId,
    });
  }
}
