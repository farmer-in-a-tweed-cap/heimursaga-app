import { ApiProperty } from '@nestjs/swagger';
import {
  ISponsorshipTierUpdatePayload,
  IUserSettingsProfileUpdatePayload,
} from '@repo/types';
import { IsOptional, IsString } from 'class-validator';

export class UserSettingsProfileUpdateDto
  implements IUserSettingsProfileUpdatePayload
{
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  name: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  bio: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  from: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  livesIn: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  sponsorsFund: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  sponsorsFundType: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  sponsorsFundJourneyId: string;
}
