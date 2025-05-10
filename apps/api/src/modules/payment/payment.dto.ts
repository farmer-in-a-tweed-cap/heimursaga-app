import { ApiProperty } from '@nestjs/swagger';
import {
  CheckoutMode,
  ICheckoutPayload,
  IPaymentMethodCreatePayload,
  ISubscriptionPlanUpgradeCheckoutPayload,
  PlanExpiryPeriod,
} from '@repo/types';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

export class PaymentMethodCreateDto implements IPaymentMethodCreatePayload {
  @ApiProperty({ required: true })
  @IsString()
  @IsNotEmpty()
  stripePaymentMethodId: string;
}

export class CheckoutDto implements ICheckoutPayload {
  @ApiProperty({ required: true })
  @IsEnum(CheckoutMode)
  @IsNotEmpty()
  mode: CheckoutMode;
}

export class PlanUpgradeCheckoutDto
  implements ISubscriptionPlanUpgradeCheckoutPayload
{
  @ApiProperty({ required: true })
  @IsString()
  @IsNotEmpty()
  planId: string;

  @ApiProperty({ required: true })
  @IsEnum(PlanExpiryPeriod)
  @IsNotEmpty()
  period: PlanExpiryPeriod;
}
