import { ApiProperty } from '@nestjs/swagger';
import { IMediaUploadQueryParams } from '@repo/types';
import { IsBoolean, IsOptional } from 'class-validator';

import { ToBoolean } from '@/common/decorators';

export class MediaUploadQueryDto implements IMediaUploadQueryParams {
  @ApiProperty({ required: false })
  @ToBoolean()
  @IsBoolean()
  @IsOptional()
  thumbnail: boolean;
}
