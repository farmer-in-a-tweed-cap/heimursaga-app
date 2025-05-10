import { ApiProperty } from '@nestjs/swagger';
import { IPayoutMethodCreatePayload } from '@repo/types';
import { IsNotEmpty, IsString } from 'class-validator';

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
