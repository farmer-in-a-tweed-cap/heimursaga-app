export enum AppErrorCode {
  EMAIL_ALREADY_IN_USE = 'email_already_in_use',
  USERNAME_ALREADY_IN_USE = 'username_already_in_use',
}

export enum UserRole {
  ADMIN = 'admin',
  CREATOR = 'creator', // Displayed to users as "Explorer Pro"
  USER = 'user',
}

// Alias for new naming convention
export const ExplorerRole = UserRole;
export type ExplorerRole = UserRole;

export enum CheckoutMode {
  UPGRADE = 'upgrade',
  MEMBERSHIP = 'membership',
  DONATION = 'donation',
}

export enum CheckoutStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CANCELED = 'canceled',
  REQUIRES_ACTION = 'requires_action',
}

export enum PayoutStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CANCELED = 'canceled',
}

export enum PlanExpiryPeriod {
  MONTH = 'month',
  YEAR = 'year',
}

export enum UserNotificationContext {
  LIKE = 'like',
  FOLLOW = 'follow',
  SPONSORSHIP = 'sponsorship',
  COMMENT = 'comment',
  COMMENT_REPLY = 'comment_reply',
  ENTRY_MILESTONE = 'entry_milestone',
  EXPEDITION_STARTED = 'expedition_started',
  EXPEDITION_COMPLETED = 'expedition_completed',
  SPONSORSHIP_MILESTONE = 'sponsorship_milestone',
  EXPEDITION_OFF_GRID = 'expedition_off_grid',
  SYSTEM = 'system',
  // Passport notifications
  PASSPORT_COUNTRY = 'passport_country',
  PASSPORT_CONTINENT = 'passport_continent',
  PASSPORT_STAMP = 'passport_stamp',
}

// Alias for new naming convention
export const ExplorerNotificationContext = UserNotificationContext;
export type ExplorerNotificationContext = UserNotificationContext;

export enum PayoutMethodPlatform {
  STRIPE = 'stripe',
  PAYPAL = 'paypal',
}

export enum SponsorshipStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  CONFIRMED = 'confirmed',
  PAUSED = 'paused',
  CANCELED = 'canceled',
  PAST_DUE = 'past_due',
  UNPAID = 'unpaid',
}

export enum SponsorshipType {
  ONE_TIME_PAYMENT = 'one_time_payment',
  SUBSCRIPTION = 'subscription',
}

export enum SponsorshipBillingPeriod {
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
}

export enum SponsorshipTierType {
  ONE_TIME = 'ONE_TIME',
  MONTHLY = 'MONTHLY',
}
export enum CurrencyCode {
  USD = 'usd',
}

export enum CountryCode {
  UNITED_STATES = 'us',
}

export enum MapQueryContext {
  GLOBAL = 'global',
  FOLLOWING = 'following',
  USER = 'user',
  TRIP = 'journey',
}

export enum MapQueryFilterParam {
  POST = 'post',
  TRIP = 'trip',
}

export enum FlagCategory {
  AI_GENERATED_CONTENT = 'ai_generated_content',
  OBSCENE_LANGUAGE = 'obscene_language',
  SEXUALLY_EXPLICIT = 'sexually_explicit',
  GRAPHIC_VIOLENCE = 'graphic_violence',
  POLITICAL_CONTENT = 'political_content',
  UNAUTHORIZED_MARKETING = 'unauthorized_marketing',
  PLAGIARISM = 'plagiarism',
  SPAM = 'spam',
  COPYRIGHT_VIOLATION = 'copyright_violation',
  HARASSMENT = 'harassment',
  AI_GENERATED_IMAGES = 'ai_generated_images',
  SEXUALLY_GRAPHIC_MEDIA = 'sexually_graphic_media',
  VIOLENCE_GORE_IMAGERY = 'violence_gore_imagery',
  COMMERCIAL_BRANDING = 'commercial_branding',
  PRIVACY_VIOLATION = 'privacy_violation',
}

export enum FlagStatus {
  PENDING = 'pending',
  REVIEWED = 'reviewed',
  DISMISSED = 'dismissed',
  ACTION_TAKEN = 'action_taken',
}

export enum FlagActionType {
  CONTENT_DELETED = 'content_deleted',
  USER_WARNED = 'user_warned',
  USER_BLOCKED = 'user_blocked',
  NO_ACTION = 'no_action',
}
