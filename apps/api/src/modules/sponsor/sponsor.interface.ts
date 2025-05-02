export interface ISponsorCheckoutCompletePayload {
  userId: number;
  creatorId: number;
  checkoutId: number;
}

export interface IOnSponsorCheckoutCompleteEvent
  extends ISponsorCheckoutCompletePayload {}
