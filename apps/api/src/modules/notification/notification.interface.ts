import { UserNotificationContext } from '@repo/types';

export interface IUserNotificationCreatePayload {
  context: UserNotificationContext;
  userId: number;
  mentionUserId: number;
  body?: string;
  mentionPostId?: number;
}
