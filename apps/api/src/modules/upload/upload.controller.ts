import {
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';

import { Session } from '@/common/decorators';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { MediaUploadContext } from '@repo/types';

import { FileInterceptor } from '@/common/interceptors';
import { ISession } from '@/common/interfaces';

import { IUploadedFile } from './upload.interface';
import { UploadService } from './upload.service';

const UPLOAD_MAX_FILE_SIZE = 25; // mb - supports iPhone photo sizes

@ApiTags('upload')
@Controller('upload')
export class UploadController {
  constructor(private uploadService: UploadService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { limit: 10, ttl: 60000 }, medium: { limit: 10, ttl: 60000 }, long: { limit: 10, ttl: 60000 } })
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

  @Post('audio')
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { limit: 5, ttl: 60000 }, medium: { limit: 5, ttl: 60000 }, long: { limit: 5, ttl: 60000 } })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        files: 1,
        fileSize: 5 * 1024 * 1024, // 5MB
      },
    }),
  )
  async uploadAudio(
    @UploadedFile() file: IUploadedFile,
    @Session() session: ISession,
  ) {
    return this.uploadService.uploadAudio({
      query: {},
      payload: { file },
      session,
    });
  }
}
