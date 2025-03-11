import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

import { ToBoolean } from '@/common/decorators';

import { IUploadMediaQueryDto } from './upload.interface';

export class UploadMediaQueryDto implements IUploadMediaQueryDto {
  @ApiProperty({ required: false })
  @ToBoolean()
  @IsBoolean()
  @IsOptional()
  thumbnail: boolean;
}
