export enum UploadedFileType {
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  DOCUMENT = 'DOCUMENT',
}

export enum CurrencyCode {
  USD = 'usd',
}

export enum CurrencySymbol {
  USD = '$',
}

export enum PaymentTransactionType {
  SUBSCRIPTION = 'subscription',
  SPONSORSHIP = 'sponsorship',
  DONATION = 'donation',
}

export enum StripeMetadataKey {
  USER_ID = 'user_id',
  TRANSACTION = 'transaction',
  CHECKOUT_ID = 'checkout_id',
  SUBSCRIPTION_ID = 'subscription_id',
  SUBSCRIPTION_PLAN_ID = 'subscription_plan_id',
}
