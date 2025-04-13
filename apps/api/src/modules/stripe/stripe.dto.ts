import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';

import { IStripeCreatePaymentIntentDto } from './stripe.interface';

export class StripeCreatePaymentIntentDto
  implements IStripeCreatePaymentIntentDto
{
  @ApiProperty({ required: true })
  @IsNumber()
  amount: number;
}
