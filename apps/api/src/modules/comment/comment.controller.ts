import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { Public, Session } from '@/common/decorators';
import { ParamPublicIdDto } from '@/common/dto';
import { ISession } from '@/common/interfaces';

import {
  CommentCreateDto,
  CommentQueryDto,
  CommentUpdateDto,
} from './comment.dto';
import { CommentService } from './comment.service';

@ApiTags('comments')
@Controller()
export class CommentController {
  constructor(private commentService: CommentService) {}

  /**
   * Get all comments for a post
   */
  @Public()
  @Get('posts/:id/comments')
  @HttpCode(HttpStatus.OK)
  async getCommentsByPost(
    @Param() param: ParamPublicIdDto,
    @Query() query: CommentQueryDto,
    @Session() session: ISession,
  ) {
    return await this.commentService.getCommentsByPost(param.id, query, {
      query: {},
      session,
    });
  }

  /**
   * Create a new comment on a post
   */
  @Post('posts/:id/comments')
  @HttpCode(HttpStatus.CREATED)
  async createComment(
    @Param() param: ParamPublicIdDto,
    @Body() body: CommentCreateDto,
    @Session() session: ISession,
  ) {
    return await this.commentService.createComment(param.id, body, {
      query: {} as any,
      session,
      payload: body,
    });
  }

  /**
   * Update a comment
   */
  @Put('comments/:id')
  @HttpCode(HttpStatus.OK)
  async updateComment(
    @Param() param: ParamPublicIdDto,
    @Body() body: CommentUpdateDto,
    @Session() session: ISession,
  ) {
    return await this.commentService.updateComment(param.id, body, {
      query: {} as any,
      session,
      payload: body,
    });
  }

  /**
   * Delete a comment
   */
  @Delete('comments/:id')
  @HttpCode(HttpStatus.OK)
  async deleteComment(
    @Param() param: ParamPublicIdDto,
    @Session() session: ISession,
  ) {
    return await this.commentService.deleteComment(param.id, {
      query: {},
      session,
    });
  }

  /**
   * Toggle comments on/off for a post
   */
  @Patch('posts/:id/comments/toggle')
  @HttpCode(HttpStatus.OK)
  async toggleComments(
    @Param() param: ParamPublicIdDto,
    @Session() session: ISession,
  ) {
    return await this.commentService.toggleComments(param.id, {
      query: {},
      session,
    });
  }
}
