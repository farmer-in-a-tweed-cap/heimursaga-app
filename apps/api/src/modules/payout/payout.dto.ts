import { ApiProperty } from '@nestjs/swagger';
import {
  IPayoutCreatePayload,
  IPayoutMethodCreatePayload,
  IStripePlatformAccountLinkGeneratePayload,
  StripePlayformAccountLinkMode,
} from '@repo/types';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';

export class PayoutMethodCreateDto implements IPayoutMethodCreatePayload {
  @ApiProperty({ required: true })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  country: string;
}

export class PayoutCreateDto implements IPayoutCreatePayload {
  @ApiProperty({ required: true })
  @IsNumber()
  amount: number;
}

export class StripePlatformAccountLinkGenerateDto
  implements IStripePlatformAccountLinkGeneratePayload
{
  @ApiProperty({ required: true })
  @IsString()
  @IsNotEmpty()
  payoutMethodId: string;

  @ApiProperty({ required: true })
  @IsString()
  @IsEnum(StripePlayformAccountLinkMode)
  @IsNotEmpty()
  mode: StripePlayformAccountLinkMode;

  @ApiProperty({ required: true })
  @IsString()
  @IsNotEmpty()
  @IsUrl(
    { require_tld: true, protocols: ['https'] },
    { message: 'backUrl must be a valid HTTPS URL' },
  )
  @MaxLength(500)
  backUrl: string;
}
