export interface IStripeCreatePaymentIntentPayload {
  userId: number;
  amount: number;
}

export interface IStripeCreatePaymentIntentDto {
  amount: number;
}
