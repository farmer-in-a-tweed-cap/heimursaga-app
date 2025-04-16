import { ApiProperty } from '@nestjs/swagger';
import {
  CheckoutMode,
  ICheckoutPayload,
  IPaymentMethodCreatePayload,
  IPlanUpgradeCheckoutPayload,
  IPlanUpgradeCompletePayload,
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

export class PlanUpgradeCheckoutDto implements IPlanUpgradeCheckoutPayload {
  @ApiProperty({ required: true })
  @IsString()
  @IsNotEmpty()
  planId: string;

  @ApiProperty({ required: true })
  @IsEnum(PlanExpiryPeriod)
  @IsNotEmpty()
  period: PlanExpiryPeriod;
}

export class PlanUpgradeCompleteDto implements IPlanUpgradeCompletePayload {
  @ApiProperty({ required: true })
  @IsString()
  @IsNotEmpty()
  checkoutId: string;
}
