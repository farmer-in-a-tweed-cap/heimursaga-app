import {
  ExplorerNotificationContext,
  UserNotificationContext,
} from '@repo/types';

export interface IUserNotificationCreatePayload {
  context: UserNotificationContext;
  userId: number;
  mentionUserId?: number;
  body?: string;
  mentionPostId?: number;
  mentionPostTitle?: string;
  sponsorshipType?: string;
  sponsorshipAmount?: number;
  sponsorshipCurrency?: string;
  // Passport fields
  passportCountryCode?: string;
  passportCountryName?: string;
  passportContinentCode?: string;
  passportContinentName?: string;
  passportStampId?: string;
  passportStampName?: string;
}

// Alias for new naming convention
export type IExplorerNotificationCreatePayload = IUserNotificationCreatePayload;
