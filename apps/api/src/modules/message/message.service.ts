import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { UserRole } from '@repo/types';

import { generator } from '@/lib/generator';
import { getStaticMediaUrl } from '@/lib/upload';

import {
  ServiceBadRequestException,
  ServiceException,
  ServiceForbiddenException,
  ServiceInternalException,
  ServiceNotFoundException,
} from '@/common/exceptions';
import { ISession, ISessionQueryWithPayload } from '@/common/interfaces';
import { Logger } from '@/modules/logger';
import { PrismaService } from '@/modules/prisma';

import {
  IConversation,
  IMessage,
  IMessageGetPayload,
  IMessageReadPayload,
  IMessageSendPayload,
} from './message.interface';

@Injectable()
export class MessageService {
  constructor(
    private logger: Logger,
    private prisma: PrismaService,
  ) {}

  async sendMessage({
    payload,
    session,
  }: ISessionQueryWithPayload<{}, IMessageSendPayload>): Promise<void> {
    try {
      const { userId, userRole } = session;
      const { content, recipientUsername } = payload;

      // Verify sender is Explorer Pro
      if (userRole !== UserRole.CREATOR) {
        throw new ServiceForbiddenException(
          'Only Explorer Pro members can send messages',
        );
      }

      // Get recipient and verify they're also Explorer Pro
      const recipient = await this.prisma.explorer.findFirst({
        where: {
          username: recipientUsername,
          role: UserRole.CREATOR, // Backend role check
          blocked: false,
        },
        select: { id: true, username: true },
      });

      if (!recipient) {
        throw new ServiceNotFoundException(
          'Explorer Pro member not found or not available for messaging',
        );
      }

      // Prevent self-messaging
      if (recipient.id === userId) {
        throw new ServiceBadRequestException(
          'You cannot send messages to yourself',
        );
      }

      // Create the message
      await this.prisma.message.create({
        data: {
          public_id: generator.publicId(),
          content: content.trim(),
          sender_id: userId,
          recipient_id: recipient.id,
        },
      });

      this.logger.log(
        `Message sent from Explorer Pro ${userId} to Explorer Pro ${recipient.id}`,
      );
    } catch (e) {
      this.logger.error(e);
      if (e.status) throw e;
      throw new ServiceInternalException();
    }
  }

  async getConversation({
    payload,
    session,
  }: ISessionQueryWithPayload<{}, IMessageGetPayload>): Promise<IMessage[]> {
    try {
      const { userId, userRole } = session;
      const { recipientUsername } = payload;

      // Verify user is Explorer Pro
      if (userRole !== UserRole.CREATOR) {
        throw new ServiceForbiddenException(
          'Only Explorer Pro members can access messages',
        );
      }

      // Get recipient
      const recipient = await this.prisma.explorer.findFirst({
        where: {
          username: recipientUsername,
          role: UserRole.CREATOR,
          blocked: false,
        },
        select: { id: true },
      });

      if (!recipient) {
        throw new ServiceNotFoundException('Explorer Pro member not found');
      }

      // Get messages between the two users
      const messages = await this.prisma.message.findMany({
        where: {
          OR: [
            { sender_id: userId, recipient_id: recipient.id },
            { sender_id: recipient.id, recipient_id: userId },
          ],
          deleted_at: null,
        },
        select: {
          public_id: true,
          content: true,
          sender_id: true,
          recipient_id: true,
          is_read: true,
          created_at: true,
          sender: {
            select: {
              username: true,
              profile: {
                select: {
                  name: true,
                  picture: true,
                },
              },
            },
          },
          recipient: {
            select: {
              username: true,
              profile: {
                select: {
                  name: true,
                  picture: true,
                },
              },
            },
          },
        },
        orderBy: { created_at: 'asc' },
      });

      const response: IMessage[] = messages.map((message) => ({
        id: message.public_id,
        content: message.content,
        senderUsername: message.sender.username,
        recipientUsername: message.recipient.username,
        isRead: message.is_read,
        createdAt: message.created_at,
        sender: {
          username: message.sender.username,
          name: message.sender.profile?.name,
          picture: message.sender.profile?.picture
            ? getStaticMediaUrl(message.sender.profile.picture)
            : undefined,
        },
        recipient: {
          username: message.recipient.username,
          name: message.recipient.profile?.name,
          picture: message.recipient.profile?.picture
            ? getStaticMediaUrl(message.recipient.profile.picture)
            : undefined,
        },
      }));

      return response;
    } catch (e) {
      this.logger.error(e);
      if (e.status) throw e;
      throw new ServiceInternalException();
    }
  }

  async getConversations({
    session,
  }: {
    session: ISession;
  }): Promise<IConversation[]> {
    try {
      const { userId, userRole } = session;

      // Verify user is Explorer Pro
      if (userRole !== UserRole.CREATOR) {
        throw new ServiceForbiddenException(
          'Only Explorer Pro members can access conversations',
        );
      }

      // Get latest message for each conversation
      const conversations = await this.prisma.$queryRaw<
        Array<{
          other_user_id: number;
          other_username: string;
          other_name: string;
          other_picture: string;
          last_content: string;
          last_created_at: Date;
          last_sender_id: number;
          unread_count: bigint;
        }>
      >`
        WITH conversation_partners AS (
          SELECT DISTINCT
            CASE 
              WHEN sender_id = ${userId} THEN recipient_id 
              ELSE sender_id 
            END as other_user_id
          FROM messages 
          WHERE (sender_id = ${userId} OR recipient_id = ${userId})
            AND deleted_at IS NULL
        ),
        latest_messages AS (
          SELECT 
            other_user_id,
            content as last_content,
            created_at as last_created_at,
            sender_id as last_sender_id,
            ROW_NUMBER() OVER (PARTITION BY other_user_id ORDER BY created_at DESC) as rn
          FROM (
            SELECT 
              CASE 
                WHEN sender_id = ${userId} THEN recipient_id 
                ELSE sender_id 
              END as other_user_id,
              content,
              created_at,
              sender_id
            FROM messages 
            WHERE (sender_id = ${userId} OR recipient_id = ${userId})
              AND deleted_at IS NULL
          ) sub
        ),
        unread_counts AS (
          SELECT 
            sender_id as other_user_id,
            COUNT(*) as unread_count
          FROM messages 
          WHERE recipient_id = ${userId} 
            AND is_read = false 
            AND deleted_at IS NULL
          GROUP BY sender_id
        )
        SELECT 
          cp.other_user_id,
          u.username as other_username,
          up.name as other_name,
          up.picture as other_picture,
          lm.last_content,
          lm.last_created_at,
          lm.last_sender_id,
          COALESCE(uc.unread_count, 0) as unread_count
        FROM conversation_partners cp
        JOIN users u ON u.id = cp.other_user_id
        LEFT JOIN user_profiles up ON up.user_id = u.id
        JOIN latest_messages lm ON lm.other_user_id = cp.other_user_id AND lm.rn = 1
        LEFT JOIN unread_counts uc ON uc.other_user_id = cp.other_user_id
        WHERE u.role = 'creator' AND u.blocked = false
        ORDER BY lm.last_created_at DESC
      `;

      const response: IConversation[] = conversations.map((conv) => ({
        recipientUsername: conv.other_username,
        recipientName: conv.other_name,
        recipientPicture: conv.other_picture
          ? getStaticMediaUrl(conv.other_picture)
          : undefined,
        lastMessage: {
          content: conv.last_content,
          createdAt: conv.last_created_at,
          isFromMe: conv.last_sender_id === userId,
        },
        unreadCount: Number(conv.unread_count),
      }));

      return response;
    } catch (e) {
      this.logger.error(e);
      if (e.status) throw e;
      throw new ServiceInternalException();
    }
  }

  async markMessageAsRead({
    payload,
    session,
  }: ISessionQueryWithPayload<{}, IMessageReadPayload>): Promise<void> {
    try {
      const { userId, userRole } = session;
      const { messageId } = payload;

      // Verify user is Explorer Pro
      if (userRole !== UserRole.CREATOR) {
        throw new ServiceForbiddenException(
          'Only Explorer Pro members can access messages',
        );
      }

      // Update message as read (only if user is the recipient)
      const result = await this.prisma.message.updateMany({
        where: {
          public_id: messageId,
          recipient_id: userId,
          deleted_at: null,
        },
        data: {
          is_read: true,
        },
      });

      if (result.count === 0) {
        throw new ServiceNotFoundException(
          'Message not found or you are not the recipient',
        );
      }

      this.logger.log(
        `Message ${messageId} marked as read by Explorer Pro ${userId}`,
      );
    } catch (e) {
      this.logger.error(e);
      if (e.status) throw e;
      throw new ServiceInternalException();
    }
  }

  async getUnreadCount({
    session,
  }: {
    session: ISession;
  }): Promise<{ count: number }> {
    try {
      const { userId, userRole } = session;

      // Verify user is Explorer Pro
      if (userRole !== UserRole.CREATOR) {
        throw new ServiceForbiddenException(
          'Only Explorer Pro members can access message counts',
        );
      }

      const count = await this.prisma.message.count({
        where: {
          recipient_id: userId,
          is_read: false,
          deleted_at: null,
        },
      });

      return { count };
    } catch (e) {
      this.logger.error(e);
      if (e.status) throw e;
      throw new ServiceInternalException();
    }
  }
}
