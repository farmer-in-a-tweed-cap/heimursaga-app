import { ApiProperty } from '@nestjs/swagger';
import {
  ISponsorshipTierUpdatePayload,
  IUserSettingsProfileUpdateQuery,
} from '@repo/types';
import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

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
