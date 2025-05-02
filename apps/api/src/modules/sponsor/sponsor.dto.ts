import { ApiProperty } from '@nestjs/swagger';
import { ISponsorCheckoutPayload, SponsorshipType } from '@repo/types';
import {
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
