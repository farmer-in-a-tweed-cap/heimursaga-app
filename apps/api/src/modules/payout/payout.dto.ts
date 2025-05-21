import { ApiProperty } from '@nestjs/swagger';
import { IPayoutCreatePayload, IPayoutMethodCreatePayload } from '@repo/types';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

import { ToNumber } from '@/common/decorators';

export class PayoutMethodCreateDto implements IPayoutMethodCreatePayload {
  @ApiProperty({ required: true })
  @IsString()
  @IsNotEmpty()
  platform: string;

  @ApiProperty({ required: true })
  @IsString()
  @IsNotEmpty()
  country: string;
}

export class PayoutCreateDto implements IPayoutCreatePayload {
  @ApiProperty({ required: true })
  @IsNumber()
  amount: number;
}
