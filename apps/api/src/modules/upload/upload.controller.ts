import {
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Session,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { Public } from '@/common/decorators';
import { FileInterceptor } from '@/common/interceptors';
import { IUserSession } from '@/common/interfaces';

import { UploadMediaQueryDto } from './upload.dto';
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
    @Query() query: UploadMediaQueryDto,
    @UploadedFile() file: IUploadedFile,
    @Session() session: IUserSession,
  ) {
    return this.uploadService.upload({ file, userId: session?.userId });
  }
}
