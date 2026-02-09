import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

const DEFAULT_PER_PAGE = 50;
const MAX_PER_PAGE = 100;

export class AdminPaginationDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiProperty({ required: false, default: DEFAULT_PER_PAGE })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(MAX_PER_PAGE)
  limit?: number;

  @ApiProperty({ required: false, default: 0 })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  @Min(0)
  offset?: number;
}

export class AdminExplorerQueryDto extends AdminPaginationDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  blocked?: boolean;
}
