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

export enum PlanExpiryPeriod {
  MONTH = 'month',
  YEAR = 'year',
}
