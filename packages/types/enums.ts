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
