import { Module } from '@nestjs/common';

import { AuthModule } from '@/modules/auth';
import { LoggerModule } from '@/modules/logger';
import { PostModule } from '@/modules/post';
import { PrismaModule } from '@/modules/prisma';
import { UploadModule } from '@/modules/upload';

import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [LoggerModule, PrismaModule, AuthModule, PostModule, UploadModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
