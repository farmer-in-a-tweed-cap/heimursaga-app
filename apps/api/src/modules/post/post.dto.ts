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
  ValidateNested,
} from 'class-validator';

export class PostCreateDto implements IPostCreatePayload {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  title: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
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
  @IsString()
  @IsOptional()
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
  @IsString()
  @IsOptional()
  title: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
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
  @IsString()
  @IsOptional()
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
