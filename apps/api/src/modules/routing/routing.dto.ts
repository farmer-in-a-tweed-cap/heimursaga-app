import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsNumber,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

class RouteLocationDto {
  @ApiProperty({ example: 64.1355 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat: number;

  @ApiProperty({ example: -21.8954 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  lon: number;
}

export class TrailRouteDto {
  @ApiProperty({ type: [RouteLocationDto] })
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => RouteLocationDto)
  locations: RouteLocationDto[];
}

export class WaterwayRouteDto {
  @ApiProperty({ type: [RouteLocationDto] })
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => RouteLocationDto)
  locations: RouteLocationDto[];

  @ApiProperty({ enum: ['canoe', 'motorboat'], example: 'canoe' })
  @IsString()
  @IsIn(['canoe', 'motorboat'])
  profile: 'canoe' | 'motorboat';
}
