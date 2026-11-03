import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { Session } from '@/common/decorators';
import { ISession } from '@/common/interfaces';
import { AuthGuard } from '@/modules/auth/auth.guard';

import {
  GetMessagesDto,
  MarkMessageReadDto,
  SendMessageDto,
} from './message.dto';
import { MessageService } from './message.service';

@ApiTags('Messages')
@Controller('messages')
@UseGuards(AuthGuard)
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  @Post('send')
  @Throttle({
    short: { limit: 20, ttl: 60000 },
    medium: { limit: 20, ttl: 60000 },
    long: { limit: 20, ttl: 60000 },
  })
  @ApiOperation({
    summary: 'Send message to another explorer',
    description: 'Send a private message to another explorer',
  })
  @ApiResponse({ status: 201, description: 'Message sent successfully' })
  @ApiResponse({
    status: 403,
    description: 'Not signed in',
  })
  @ApiResponse({ status: 404, description: 'Explorer not found' })
  async sendMessage(
    @Body() payload: SendMessageDto,
    @Session() session: ISession,
  ) {
    return this.messageService.sendMessage({
      payload,
      session,
      query: {},
    });
  }

  @Get('conversations')
  @ApiOperation({
    summary: 'Get all conversations',
    description: 'Get all conversations for the current explorer',
  })
  @ApiResponse({
    status: 200,
    description: 'Conversations retrieved successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Not signed in',
  })
  async getConversations(@Session() session: ISession) {
    return this.messageService.getConversations({
      session,
    });
  }

  @Get('conversations/:username')
  @ApiOperation({
    summary: 'Get conversation with a specific explorer',
    description: 'Get all messages in a conversation with another explorer',
  })
  @ApiResponse({ status: 200, description: 'Messages retrieved successfully' })
  @ApiResponse({
    status: 403,
    description: 'Not signed in',
  })
  @ApiResponse({ status: 404, description: 'Explorer not found' })
  async getConversation(
    @Param('username') username: string,
    @Session() session: ISession,
  ) {
    return this.messageService.getConversation({
      payload: { recipientUsername: username },
      session,
      query: {},
    });
  }

  @Patch('mark-read/:messageId')
  @ApiOperation({
    summary: 'Mark message as read',
    description: 'Mark a specific message as read',
  })
  @ApiResponse({ status: 200, description: 'Message marked as read' })
  @ApiResponse({
    status: 403,
    description: 'Not signed in',
  })
  @ApiResponse({
    status: 404,
    description: 'Message not found or not recipient',
  })
  async markMessageAsRead(
    @Param('messageId') messageId: string,
    @Session() session: ISession,
  ) {
    return this.messageService.markMessageAsRead({
      payload: { messageId },
      session,
      query: {},
    });
  }

  @Get('unread-count')
  @ApiOperation({
    summary: 'Get unread message count',
    description: 'Get the number of unread messages for the current explorer',
  })
  @ApiResponse({
    status: 200,
    description: 'Unread count retrieved successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Not signed in',
  })
  async getUnreadCount(@Session() session: ISession) {
    return this.messageService.getUnreadCount({
      session,
    });
  }
}
