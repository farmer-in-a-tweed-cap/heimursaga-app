import { ApiProperty } from '@nestjs/swagger';
import {
  ISponsorshipTierUpdatePayload,
  IUserSettingsProfileUpdateQuery,
} from '@repo/types';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class UserSettingsProfileUpdateDto
  implements IUserSettingsProfileUpdateQuery
{
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  name: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  bio: string;
}

export class UserMembershipTierUpdateDto
  implements ISponsorshipTierUpdatePayload
{
  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  price: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description: string;
}
