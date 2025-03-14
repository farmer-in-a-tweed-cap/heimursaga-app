import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDate,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

import { IPostCreatePayloadDto, IPostUpdatePayloadDto } from './post.interface';

export class PostCreatePayloadDto implements IPostCreatePayloadDto {
  @ApiProperty({ required: true })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ required: true })
  @IsString()
  @IsNotEmpty()
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
  draft: boolean;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  place: string;

  @ApiProperty({ required: false })
  @IsDate()
  @IsOptional()
  date: Date;
}

export class PostUpdatePayloadDto implements IPostUpdatePayloadDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsNotEmpty()
  content: string;
}
