import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class TrackStartDto {
  @ApiProperty({ required: true, enum: ['mobile'] })
  @IsIn(['mobile']) // 'spot' | 'inreach' will be added in V2
  source: 'mobile';

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  @MaxLength(60)
  sourceDeviceId?: string;
}

export class TrackPointInputDto {
  @ApiProperty({ required: true })
  @IsDateString()
  recordedAt: string;

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
  @IsNumber()
  @Min(0)
  @IsOptional()
  accuracyM?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  speedMps?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  altitudeM?: number;

  @ApiProperty({ required: false })
  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  batteryPct?: number;

  @ApiProperty({ required: false })
  @IsString()
  @MaxLength(40)
  @IsOptional()
  clientUuid?: string;
}

export class TrackPointsAppendDto {
  @ApiProperty({ required: true, type: [TrackPointInputDto] })
  @IsArray()
  @ArrayMaxSize(200) // matches the mobile uploader's batch ceiling
  @ValidateNested({ each: true })
  @Type(() => TrackPointInputDto)
  points: TrackPointInputDto[];
}
