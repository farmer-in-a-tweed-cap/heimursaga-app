import { ApiProperty } from '@nestjs/swagger';
import {
  ISponsorCheckoutPayload,
  ISponsorshipTierCreatePayload,
  ISponsorshipTierUpdatePayload,
  SponsorshipBillingPeriod,
  SponsorshipType,
} from '@repo/types';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class SponsorCheckoutDto implements ISponsorCheckoutPayload {
  @ApiProperty({ required: true })
  @IsString()
  @IsEnum(SponsorshipType)
  @IsNotEmpty()
  sponsorshipType: string;

  @ApiProperty({ required: true })
  @IsString()
  @IsNotEmpty()
  creatorId: string;

  @ApiProperty({ required: true })
  @IsString()
  @IsNotEmpty()
  paymentMethodId: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  sponsorshipTierId?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsEnum(SponsorshipBillingPeriod)
  @IsOptional()
  billingPeriod?: SponsorshipBillingPeriod;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  oneTimePaymentAmount?: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  message?: string;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  emailDelivery?: boolean;
}

export class SponsorshipTierUpdateDto implements ISponsorshipTierUpdatePayload {
  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  price: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description: string;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  isAvailable: boolean;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  priority: number;
}

export class SponsorshipTierCreateDto implements ISponsorshipTierCreatePayload {
  @ApiProperty({ required: true })
  @IsNumber()
  @IsNotEmpty()
  price: number;

  @ApiProperty({ required: true })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  isAvailable: boolean;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  priority: number;
}
