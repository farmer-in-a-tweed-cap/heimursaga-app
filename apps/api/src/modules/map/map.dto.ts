import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import {
  IMapQueryLocation,
  IMapQueryLocationBound,
  IMapQueryLocationBounds,
  IMapQueryPayload,
  IWaypointCreatePayload,
  IWaypointUpdatePayload,
  MapQueryContext,
} from '@repo/types';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class MapQueryDto implements IMapQueryPayload {
  @ApiProperty({ required: false })
  @IsObject()
  @ValidateNested()
  @Type(() => MapQueryLocationDto)
  @IsOptional()
  location: IMapQueryLocation;

  @ApiProperty({ required: false })
  @IsEnum(MapQueryContext)
  @IsString()
  @IsOptional()
  context?: MapQueryContext;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  limit?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  page?: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  username?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  tripId?: string;
}

class MapQueryLocationDto implements IMapQueryLocation {
  @ApiProperty({ required: true })
  @IsObject()
  @ValidateNested()
  @Type(() => MapQueryLocationBoundsDto)
  bounds: IMapQueryLocationBounds;
}

class MapQueryLocationBoundsDto {
  @ApiProperty({ required: true })
  @IsObject()
  @ValidateNested()
  @Type(() => MapQueryLocationBoundDto)
  sw: IMapQueryLocationBound;

  @ApiProperty({ required: true })
  @IsObject()
  @ValidateNested()
  @Type(() => MapQueryLocationBoundDto)
  ne: IMapQueryLocationBound;
}

class MapQueryLocationBoundDto implements IMapQueryLocationBound {
  @ApiProperty({ required: true })
  @IsNumber()
  @IsNotEmpty()
  lat: number;

  @ApiProperty({ required: true })
  @IsNumber()
  @IsNotEmpty()
  lon: number;
}

export class WaypointCreateDto implements IWaypointCreatePayload {
  @ApiProperty({ required: true, default: 0 })
  @IsNumber()
  @IsNotEmpty()
  lat: number;

  @ApiProperty({ required: true, default: 0 })
  @IsNumber()
  @IsNotEmpty()
  lon: number;

  @ApiProperty({ required: false, default: '' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({ required: false, default: new Date() })
  @IsDateString()
  @IsOptional()
  date?: Date;

  @ApiProperty({ required: false, default: '' })
  @IsString()
  @IsOptional()
  tripId?: string;
}

export class WaypointUpdateDto implements IWaypointUpdatePayload {
  @ApiProperty({ required: false, default: 0 })
  @IsNumber()
  @IsOptional()
  lat?: number;

  @ApiProperty({ required: false, default: 0 })
  @IsNumber()
  @IsOptional()
  lon?: number;

  @ApiProperty({ required: false, default: '' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({ required: false, default: new Date() })
  @IsDateString()
  @IsOptional()
  date?: Date;

  @ApiProperty({ required: false, default: '' })
  @IsString()
  @IsOptional()
  tripId?: string;
}
