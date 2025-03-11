import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { LoggerModule } from '@/modules/logger';
import { PrismaModule } from '@/modules/prisma';

import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';

@Module({
  imports: [ConfigModule, LoggerModule, PrismaModule],
  controllers: [UploadController],
  providers: [UploadService],
  exports: [UploadService],
})
export class UploadModule {}
