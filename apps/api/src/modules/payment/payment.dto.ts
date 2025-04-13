import { ApiProperty } from '@nestjs/swagger';
import { IPaymentMethodCreatePayload } from '@repo/types';
import { IsNotEmpty, IsString } from 'class-validator';

export class PaymentMethodCreateDto implements IPaymentMethodCreatePayload {
  @ApiProperty({ required: true })
  @IsString()
  @IsNotEmpty()
  stripePaymentMethodId: string;
}
