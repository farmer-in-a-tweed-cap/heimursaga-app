import { ApiProperty } from '@nestjs/swagger';
import {
  ISponsorshipTierUpdatePayload,
  IUserSettingsProfileUpdatePayload,
} from '@repo/types';
import { IsOptional, IsString, MaxLength } from 'class-validator';

import { SanitizeContent, SanitizeText } from '@/lib/sanitizer';

export class UserSettingsProfileUpdateDto
  implements IUserSettingsProfileUpdatePayload
{
  @ApiProperty({ required: false })
  @SanitizeText()
  @IsString()
  @IsOptional()
  @MaxLength(50, { message: 'Name must be less than 50 characters' })
  name: string;

  @ApiProperty({ required: false })
  @SanitizeContent()
  @IsString()
  @IsOptional()
  @MaxLength(200, { message: 'Bio must be less than 200 characters' })
  bio: string;

  @ApiProperty({ required: false })
  @SanitizeText()
  @IsString()
  @IsOptional()
  @MaxLength(200, { message: 'Location must be less than 200 characters' })
  from: string;

  @ApiProperty({ required: false })
  @SanitizeText()
  @IsString()
  @IsOptional()
  @MaxLength(200, { message: 'Location must be less than 200 characters' })
  livesIn: string;

  @ApiProperty({ required: false })
  @SanitizeText()
  @IsString()
  @IsOptional()
  @MaxLength(500, {
    message: 'Sponsor fund description must be less than 500 characters',
  })
  sponsorsFund: string;

  @ApiProperty({ required: false })
  @SanitizeText()
  @IsString()
  @IsOptional()
  @MaxLength(50, {
    message: 'Sponsor fund type must be less than 50 characters',
  })
  sponsorsFundType: string;

  @ApiProperty({ required: false })
  @SanitizeText()
  @IsString()
  @IsOptional()
  @MaxLength(14, { message: 'Journey ID must be exactly 14 characters' })
  sponsorsFundJourneyId: string;

  @ApiProperty({ required: false })
  @SanitizeText()
  @IsString()
  @IsOptional()
  @MaxLength(500, { message: 'Portfolio URL must be less than 500 characters' })
  portfolio: string;
}
