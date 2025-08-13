import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

import { AuthGuard } from '@/modules/auth/auth.guard';
import { Session } from '@/common/decorators';
import { ISession } from '@/common/interfaces';
import { CreatorRoleGuard } from './creator-role.guard';
import { MessageService } from './message.service';
import { SendMessageDto, GetMessagesDto, MarkMessageReadDto } from './message.dto';

@ApiTags('Explorer Pro Messages')
@Controller('messages')
@UseGuards(AuthGuard, CreatorRoleGuard)
export class MessageController {
  constructor(private readonly messageService: MessageService) {
    console.log('MessageController initialized');
  }

  @Post('send')
  @ApiOperation({ 
    summary: 'Send message to another Explorer Pro member',
    description: 'Send a private message to another Explorer Pro member'
  })
  @ApiResponse({ status: 201, description: 'Message sent successfully' })
  @ApiResponse({ status: 403, description: 'Only Explorer Pro members can send messages' })
  @ApiResponse({ status: 404, description: 'Explorer Pro member not found' })
  async sendMessage(@Body() payload: SendMessageDto, @Session() session: ISession) {
    return this.messageService.sendMessage({
      payload,
      session,
      query: {},
    });
  }

  @Get('conversations')
  @ApiOperation({ 
    summary: 'Get all conversations',
    description: 'Get all conversations for the current Explorer Pro member'
  })
  @ApiResponse({ status: 200, description: 'Conversations retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Only Explorer Pro members can access conversations' })
  async getConversations(@Session() session: ISession) {
    console.log('getConversations endpoint called');
    return this.messageService.getConversations({
      session,
    });
  }

  @Get('conversations/:username')
  @ApiOperation({ 
    summary: 'Get conversation with specific Explorer Pro member',
    description: 'Get all messages in a conversation with another Explorer Pro member'
  })
  @ApiResponse({ status: 200, description: 'Messages retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Only Explorer Pro members can access messages' })
  @ApiResponse({ status: 404, description: 'Explorer Pro member not found' })
  async getConversation(@Param('username') username: string, @Session() session: ISession) {
    return this.messageService.getConversation({
      payload: { recipientUsername: username },
      session,
      query: {},
    });
  }

  @Patch('mark-read/:messageId')
  @ApiOperation({ 
    summary: 'Mark message as read',
    description: 'Mark a specific message as read'
  })
  @ApiResponse({ status: 200, description: 'Message marked as read' })
  @ApiResponse({ status: 403, description: 'Only Explorer Pro members can mark messages as read' })
  @ApiResponse({ status: 404, description: 'Message not found or not recipient' })
  async markMessageAsRead(@Param('messageId') messageId: string, @Session() session: ISession) {
    return this.messageService.markMessageAsRead({
      payload: { messageId },
      session,
      query: {},
    });
  }

  @Get('unread-count')
  @ApiOperation({ 
    summary: 'Get unread message count',
    description: 'Get the number of unread messages for the current Explorer Pro member'
  })
  @ApiResponse({ status: 200, description: 'Unread count retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Only Explorer Pro members can access message counts' })
  async getUnreadCount(@Session() session: ISession) {
    return this.messageService.getUnreadCount({
      session,
    });
  }
}