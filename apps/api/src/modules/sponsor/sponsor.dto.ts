import { ApiProperty } from '@nestjs/swagger';
import {
  ISponsorCheckoutPayload,
  ISponsorshipTierUpdatePayload,
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
  @IsNumber()
  @IsOptional()
  oneTimePaymentAmount?: number;
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
}
