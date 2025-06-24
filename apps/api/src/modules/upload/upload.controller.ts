import {
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Session,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { MediaUploadContext } from '@repo/types';

import { Public } from '@/common/decorators';
import { FileInterceptor } from '@/common/interceptors';
import { ISession } from '@/common/interfaces';

import { IUploadedFile } from './upload.interface';
import { UploadService } from './upload.service';

const UPLOAD_MAX_FILE_SIZE = 10; // mb

@ApiTags('upload')
@Controller('upload')
export class UploadController {
  constructor(private uploadService: UploadService) {}

  @Public()
  @Post()
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        files: 1,
        fileSize: UPLOAD_MAX_FILE_SIZE * 1024 * 1024,
      },
    }),
  )
  async upload(
    @UploadedFile() file: IUploadedFile,
    @Session() session: ISession,
  ) {
    return this.uploadService.upload({
      query: {},
      payload: {
        file,
        context: MediaUploadContext.UPLOAD,
      },
      session,
    });
  }
}
