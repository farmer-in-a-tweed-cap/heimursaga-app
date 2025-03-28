import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

import { IPaymentMethodCreatePayload } from './payment.interface';

export class PaymentMethodCreatePayloadDto
  implements IPaymentMethodCreatePayload
{
  @ApiProperty({ required: true })
  @IsString()
  @IsNotEmpty()
  label: string;

  @ApiProperty({ required: true })
  @IsString()
  @IsNotEmpty()
  stripe_payment_method_id: string;
}
