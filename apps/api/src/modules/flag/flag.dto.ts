import { ApiProperty } from '@nestjs/swagger';
import { FlagActionType, FlagCategory, FlagStatus } from '@repo/types';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

import { SanitizeText } from '@/lib/sanitizer';

// Constants for validation
const MAX_DESCRIPTION_LENGTH = 1000;
const MAX_ADMIN_NOTES_LENGTH = 1000;
const DEFAULT_FLAGS_PER_PAGE = 50;
const MAX_FLAGS_PER_PAGE = 100;

export class FlagCreateDto {
  @ApiProperty({ enum: FlagCategory, required: true })
  @IsEnum(FlagCategory)
  @IsNotEmpty()
  category: FlagCategory;

  @ApiProperty({ required: false })
  @SanitizeText()
  @IsString()
  @IsOptional()
  @MaxLength(MAX_DESCRIPTION_LENGTH, {
    message: `Description must be less than ${MAX_DESCRIPTION_LENGTH} characters`,
  })
  description?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  flaggedPostId?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  flaggedCommentId?: string;
}

export class FlagUpdateDto {
  @ApiProperty({ enum: FlagStatus, required: true })
  @IsEnum(FlagStatus)
  @IsNotEmpty()
  status: FlagStatus;

  @ApiProperty({ enum: FlagActionType, required: false })
  @IsEnum(FlagActionType)
  @IsOptional()
  actionTaken?: FlagActionType;

  @ApiProperty({ required: false })
  @SanitizeText()
  @IsString()
  @IsOptional()
  @MaxLength(MAX_ADMIN_NOTES_LENGTH, {
    message: `Admin notes must be less than ${MAX_ADMIN_NOTES_LENGTH} characters`,
  })
  adminNotes?: string;
}

export class FlagQueryDto {
  @ApiProperty({ enum: FlagStatus, required: false })
  @IsEnum(FlagStatus)
  @IsOptional()
  status?: FlagStatus;

  @ApiProperty({ required: false, default: DEFAULT_FLAGS_PER_PAGE })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(MAX_FLAGS_PER_PAGE)
  limit?: number;

  @ApiProperty({ required: false, default: 0 })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  @Min(0)
  offset?: number;
}
