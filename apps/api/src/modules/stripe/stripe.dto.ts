import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

import {
  IStripeAccountLinkPayload,
  IStripeCreatePaymentIntentDto,
} from './stripe.interface';

export class StripeCreatePaymentIntentDto
  implements IStripeCreatePaymentIntentDto
{
  @ApiProperty({ required: true })
  @IsNumber()
  amount: number;
}

export class StripeAccountLinkDto implements IStripeAccountLinkPayload {
  @ApiProperty({ required: true })
  @IsString()
  @IsNotEmpty()
  accountId: string;
}
