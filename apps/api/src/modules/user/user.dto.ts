import { ApiProperty } from '@nestjs/swagger';
import { IUserSettingsProfileUpdateQuery } from '@repo/types';
import { IsOptional, IsString } from 'class-validator';

export class UserSettingsProfileUpdateDto
  implements IUserSettingsProfileUpdateQuery
{
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  username: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  firstName: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  lastName: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  bio: string;
}
