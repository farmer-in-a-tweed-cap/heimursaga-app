import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

import {
  ISearchQueryLocation,
  ISearchQueryLocationBound,
  ISearchQueryLocationBounds,
  ISearchQueryPayload,
} from './search.interface';

export class SearchQueryPayloadDto implements ISearchQueryPayload {
  @ApiProperty({ required: false })
  @IsObject()
  @ValidateNested()
  @Type(() => SearchQueryLocationDto)
  @IsOptional()
  location: ISearchQueryLocation;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  limit: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  page: number;
}

class SearchQueryLocationDto implements ISearchQueryLocation {
  @ApiProperty({ required: true })
  @IsObject()
  @ValidateNested()
  @Type(() => SearchQueryLocationBoundsDto)
  bounds: ISearchQueryLocationBounds;
}

class SearchQueryLocationBoundsDto {
  @ApiProperty({ required: true })
  @IsObject()
  @ValidateNested()
  @Type(() => SearchQueryLocationBoundDto)
  sw: ISearchQueryLocationBound;

  @ApiProperty({ required: true })
  @IsObject()
  @ValidateNested()
  @Type(() => SearchQueryLocationBoundDto)
  ne: ISearchQueryLocationBound;
}

class SearchQueryLocationBoundDto implements ISearchQueryLocationBound {
  @ApiProperty({ required: true })
  @IsNumber()
  @IsNotEmpty()
  lat: number;

  @ApiProperty({ required: true })
  @IsNumber()
  @IsNotEmpty()
  lon: number;
}
