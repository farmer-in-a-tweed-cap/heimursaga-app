import { ApiProperty } from '@nestjs/swagger';
import {
  IExpeditionCreatePayload,
  IExpeditionUpdatePayload,
  IWaypointCreatePayload,
  IWaypointUpdatePayload,
} from '@repo/types';
import {
  IsBoolean,
  IsDate,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

import { SanitizeContent, SanitizeText } from '@/lib/sanitizer';

import { ToNumber } from '@/common/decorators';

export class ExpeditionCreateDto implements IExpeditionCreatePayload {
  @ApiProperty({ required: true })
  @SanitizeText()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @ApiProperty({ required: false })
  @SanitizeContent()
  @IsString()
  @IsOptional()
  @MaxLength(5000)
  description?: string;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  public?: boolean;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  visibility?: 'public' | 'off-grid' | 'private';

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  startDate?: Date;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  endDate?: Date;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  coverImage?: string;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  goal?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  notesAccessThreshold?: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  region?: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  tags?: string[];

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  isRoundTrip?: boolean;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  routeMode?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  routeGeometry?: number[][];
}

export class ExpeditionUpdateDto implements IExpeditionUpdatePayload {
  @ApiProperty({ required: true })
  @SanitizeText()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  public?: boolean;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  visibility?: 'public' | 'off-grid' | 'private';

  @ApiProperty({ required: false })
  @SanitizeContent()
  @IsString()
  @IsOptional()
  @MaxLength(5000)
  description?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  startDate?: Date;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  endDate?: Date;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  coverImage?: string;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  goal?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  notesAccessThreshold?: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  region?: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  tags?: string[];

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  isRoundTrip?: boolean;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  routeMode?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  routeGeometry?: number[][];
}

export class ExpeditionCancelDto {
  @ApiProperty({ required: true, maxLength: 500 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  cancellationReason: string;
}

export class ExpeditionParamDto {
  @IsString()
  @IsNotEmpty()
  trip_id: string;
}

export class ExpeditionWaypointParamDto {
  @IsString()
  @IsNotEmpty()
  trip_id: string;

  @IsNumber()
  @ToNumber()
  @IsNotEmpty()
  waypoint_id: number;
}

export class ExpeditionUpdateLocationDto {
  @IsString()
  @IsNotEmpty()
  source: string; // 'waypoint' | 'entry'

  @IsString()
  @IsNotEmpty()
  locationId: string;

  @IsString()
  @IsOptional()
  visibility?: 'public' | 'off-grid' | 'private'; // 'public' | 'sponsors' | 'private'
}

export class WaypointCreateDto implements IWaypointCreatePayload {
  @ApiProperty({ required: true })
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat: number;

  @ApiProperty({ required: true })
  @IsNumber()
  @Min(-180)
  @Max(180)
  lon: number;

  @ApiProperty({ required: false })
  @SanitizeText()
  @IsString()
  @IsOptional()
  @MaxLength(200)
  title?: string;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  date: Date;

  @ApiProperty({ required: false })
  @SanitizeText()
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  sequence?: number;
}

export class WaypointUpdateDto implements IWaypointUpdatePayload {
  @ApiProperty({ required: false })
  @SanitizeText()
  @IsString()
  @IsOptional()
  @MaxLength(200)
  title?: string;

  @ApiProperty({ required: false })
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @Min(-180)
  @Max(180)
  lon?: number;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  date?: Date;

  @ApiProperty({ required: false })
  @SanitizeText()
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  sequence?: number;
}
