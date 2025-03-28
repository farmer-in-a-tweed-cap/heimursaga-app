export interface IPaymentMethodQueryOptions {
  userId?: number;
}

export interface IPaymentMethodGetByIdOptions {
  publicId: string;
  userId?: number;
}

export interface IPaymentMethodCreateOptions {
  userId?: number;
  data: IPaymentMethodCreatePayload;
}

export interface IPaymentMethodCreatePayload {
  stripe_payment_method_id: string;
  label: string;
}

export interface IPaymentMethodDeleteOptions {
  publicId: string;
  userId?: number;
}
