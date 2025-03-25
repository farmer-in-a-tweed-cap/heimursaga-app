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

import { Public } from '@/common/decorators';
import { FileInterceptor } from '@/common/interceptors';
import { ISession } from '@/common/interfaces';

import { UploadContext } from './upload.enum';
import { IUploadedFile } from './upload.interface';
import { UploadService } from './upload.service';

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
        fileSize: 2 * 1024 * 1024,
      },
    }),
  )
  async upload(
    @UploadedFile() file: IUploadedFile,
    @Session() session: ISession,
  ) {
    return this.uploadService.upload({
      file,
      context: UploadContext.UPLOAD,
      user: { id: session?.userId },
    });
  }
}
