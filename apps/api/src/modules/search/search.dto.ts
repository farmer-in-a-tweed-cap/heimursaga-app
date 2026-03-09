import { ApiProperty } from '@nestjs/swagger';
import { ISearchQueryPayload } from '@repo/types';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class SearchQueryDto implements ISearchQueryPayload {
  @ApiProperty({ required: true })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  search: string;
}
