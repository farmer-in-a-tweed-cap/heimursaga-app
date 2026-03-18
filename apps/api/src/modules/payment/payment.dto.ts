import { ApiProperty } from '@nestjs/swagger';
import {
  CheckoutMode,
  ICheckoutPayload,
  IPaymentMethodCreatePayload,
  ISubscriptionPlanUpgradeCheckoutPayload,
  PlanExpiryPeriod,
} from '@repo/types';
import {
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

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

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  promoCode?: string;
}

export class AppleReceiptDto {
  @ApiProperty({ required: true })
  @IsString()
  @IsNotEmpty()
  receiptData: string;

  @ApiProperty({ required: true })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ required: true, enum: ['ios', 'android'] })
  @IsIn(['ios', 'android'])
  @IsNotEmpty()
  platform: 'ios' | 'android';

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  transactionId?: string;
}

export class ValidatePromoCodeDto {
  @ApiProperty({ required: true })
  @IsString()
  @IsNotEmpty()
  promoCode: string;

  @ApiProperty({ required: true })
  @IsString()
  @IsNotEmpty()
  planId: string;

  @ApiProperty({ required: true })
  @IsString()
  @IsNotEmpty()
  period: string;
}
