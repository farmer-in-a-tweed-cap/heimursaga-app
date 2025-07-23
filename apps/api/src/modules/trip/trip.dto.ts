import { ApiProperty } from '@nestjs/swagger';
import {
  ITripCreatePayload,
  ITripUpdatePayload,
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
  Min,
} from 'class-validator';

import { ToNumber } from '@/common/decorators';

export class TripCreateDto implements ITripCreatePayload {
  @ApiProperty({ required: true })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  public?: boolean;
}

export class TripUpdateDto implements ITripUpdatePayload {
  @ApiProperty({ required: true })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  public?: boolean;
}

export class TripParamDto {
  @IsString()
  @IsNotEmpty()
  trip_id: string;
}

export class TripWaypointParamDto {
  @IsString()
  @IsNotEmpty()
  trip_id: string;

  @IsNumber()
  @ToNumber()
  @IsNotEmpty()
  waypoint_id: number;
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
  @Max(80)
  lon: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  date: Date;
}

export class WaypointUpdateDto implements IWaypointUpdatePayload {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({ required: false })
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @Min(-180)
  @Max(80)
  lon?: number;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  date?: Date;
}
