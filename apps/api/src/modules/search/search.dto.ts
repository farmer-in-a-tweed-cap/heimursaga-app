import { ApiProperty } from '@nestjs/swagger';
import { ISearchQueryPayload } from '@repo/types';
import { IsNotEmpty, IsString } from 'class-validator';

export class SearchQueryDto implements ISearchQueryPayload {
  @ApiProperty({ required: true })
  @IsString()
  @IsNotEmpty()
  search: string;
}
