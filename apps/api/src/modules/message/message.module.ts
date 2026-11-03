import { Module } from '@nestjs/common';

import { AuthModule } from '@/modules/auth';
import { LoggerModule } from '@/modules/logger';
import { PrismaModule } from '@/modules/prisma';

import { MessageController } from './message.controller';
import { MessageService } from './message.service';

@Module({
  imports: [AuthModule, LoggerModule, PrismaModule],
  controllers: [MessageController],
  providers: [MessageService],
  exports: [MessageService],
})
export class MessageModule {}
