import { ApiProperty } from '@nestjs/swagger';
import {
  IExpeditionCreatePayload,
  IExpeditionUpdatePayload,
  IWaypointCreatePayload,
  IWaypointUpdatePayload,
} from '@repo/types';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDate,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  ValidateNested,
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
  @IsIn(['draft', 'planned', 'active', 'completed', 'cancelled'])
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
  @IsOptional()
  @IsUrl({}, { message: 'Cover image must be a valid URL' })
  coverImage?: string;

  @ApiProperty({ required: false })
  @IsNumber()
  @Min(1)
  @Max(999999.99)
  @IsOptional()
  goal?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @Min(0)
  @Max(999999.99)
  @IsOptional()
  notesAccessThreshold?: number;

  @ApiProperty({ required: false })
  @IsIn(['public', 'sponsor'])
  @IsOptional()
  notesVisibility?: 'public' | 'sponsor';

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
  @IsIn(['draft', 'planned', 'active', 'completed', 'cancelled'])
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
  @IsOptional()
  @IsUrl({}, { message: 'Cover image must be a valid URL' })
  coverImage?: string;

  @ApiProperty({ required: false })
  @IsNumber()
  @Min(1)
  @Max(999999.99)
  @IsOptional()
  goal?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @Min(0)
  @Max(999999.99)
  @IsOptional()
  notesAccessThreshold?: number;

  @ApiProperty({ required: false })
  @IsIn(['public', 'sponsor'])
  @IsOptional()
  notesVisibility?: 'public' | 'sponsor';

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

export class ExpeditionCompleteDto {
  @ApiProperty({ required: true })
  @IsDateString()
  @IsNotEmpty()
  actualEndDate: string;
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

class WaypointSyncItemDto {
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
  date?: string;

  @ApiProperty({ required: false })
  @SanitizeText()
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({ required: true })
  @IsNumber()
  sequence: number;
}

export class WaypointSyncDto {
  @ApiProperty({ required: true, type: [Object] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WaypointSyncItemDto)
  waypoints: WaypointSyncItemDto[];
}
