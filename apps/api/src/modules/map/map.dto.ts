import { ApiProperty } from '@nestjs/swagger';
import {
  IMapQueryLocation,
  IMapQueryLocationBound,
  IMapQueryLocationBounds,
  IMapQueryPayload,
  MapQueryFilter,
} from '@repo/types';
import { Type } from 'class-transformer';
import {
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
  @IsEnum(MapQueryFilter)
  @IsString()
  @IsOptional()
  filter?: MapQueryFilter;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  limit?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  page?: number;
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
