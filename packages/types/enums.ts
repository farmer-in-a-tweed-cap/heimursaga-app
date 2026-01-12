export enum AppErrorCode {
  EMAIL_ALREADY_IN_USE = 'email_already_in_use',
  USERNAME_ALREADY_IN_USE = 'username_already_in_use',
}

export enum UserRole {
  ADMIN = 'admin',
  CREATOR = 'creator',
  USER = 'user',
}

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
}

export enum PayoutMethodPlatform {
  STRIPE = 'stripe',
  PAYPAL = 'paypal',
}

export enum SponsorshipStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  CONFIRMED = 'confirmed',
  CANCELED = 'canceled',
}

export enum SponsorshipType {
  ONE_TIME_PAYMENT = 'one_time_payment',
  SUBSCRIPTION = 'subscription',
}

export enum SponsorshipBillingPeriod {
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
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
