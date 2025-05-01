export interface IStripeCreatePaymentIntentPayload {
  userId: number;
  amount: number;
}

export interface IStripeCreatePaymentIntentDto {
  amount: number;
}

export interface IStripeAccountCreateResponse {
  accountId: string;
}

export interface IStripeAccountLinkPayload {
  accountId: string;
}

export interface IStripeAccountLinkResponse {
  url: string;
  expiry: Date;
}
