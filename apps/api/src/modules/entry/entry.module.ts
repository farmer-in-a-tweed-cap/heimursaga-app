import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { EventModule } from '@/modules/event';
import { PrismaModule } from '@/modules/prisma';
import { UploadModule } from '@/modules/upload/upload.module';

import { EntryController } from './entry.controller';
import { EntryService } from './entry.service';

@Module({
  imports: [ConfigModule, PrismaModule, EventModule, UploadModule],
  controllers: [EntryController],
  providers: [EntryService],
  exports: [EntryService],
})
export class EntryModule {}
