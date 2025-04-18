import { ApiProperty } from '@nestjs/swagger';
import { IUserSettingsProfileUpdateQuery } from '@repo/types';
import { IsOptional, IsString } from 'class-validator';

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
