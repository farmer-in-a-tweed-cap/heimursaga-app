import { ApiProperty } from '@nestjs/swagger';
import {
  IPostCreatePayload,
  IPostUpdatePayload,
  IWaypointCreatePayload,
} from '@repo/types';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  ValidateNested,
} from 'class-validator';

import { SanitizeContent, SanitizeText } from '@/lib/sanitizer';

export class PostCreateDto implements IPostCreatePayload {
  @ApiProperty({ required: false })
  @SanitizeText()
  @IsString()
  @IsOptional()
  @MaxLength(200, { message: 'Title must be less than 200 characters' })
  title: string;

  @ApiProperty({ required: false })
  @SanitizeContent()
  @IsString()
  @IsOptional()
  @MaxLength(10000, { message: 'Content must be less than 10,000 characters' })
  content: string;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  lat: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  lon: number;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  public: boolean;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  sponsored: boolean;

  @ApiProperty({ required: false })
  @SanitizeText()
  @IsString()
  @IsOptional()
  @MaxLength(250, { message: 'Place must be less than 250 characters' })
  place: string;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  date: Date;

  @ApiProperty({ required: false })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  uploads?: string[];

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  waypointId: number;

  @ApiProperty({ required: false })
  @SanitizeText()
  @IsString()
  @IsOptional()
  tripId: string;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  isDraft?: boolean;
}

export class PostUpdateDto implements IPostUpdatePayload {
  @ApiProperty({ required: false })
  @SanitizeText()
  @IsString()
  @IsOptional()
  @MaxLength(200, { message: 'Title must be less than 200 characters' })
  title: string;

  @ApiProperty({ required: false })
  @SanitizeContent()
  @IsString()
  @IsOptional()
  @MaxLength(10000, { message: 'Content must be less than 10,000 characters' })
  content: string;

  @ApiProperty({ required: false })
  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => PostWaypointCreateDto)
  waypoint?: IWaypointCreatePayload;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  public: boolean;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  sponsored: boolean;

  @ApiProperty({ required: false })
  @SanitizeText()
  @IsString()
  @IsOptional()
  @MaxLength(250, { message: 'Place must be less than 250 characters' })
  place: string;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  date: Date;

  @ApiProperty({ required: false })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  uploads?: string[];

  @ApiProperty({ required: false })
  @SanitizeText()
  @IsString()
  @IsOptional()
  tripId: string;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  isDraft?: boolean;
}

class PostWaypointCreateDto implements IWaypointCreatePayload {
  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  lat: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  lon: number;
}
