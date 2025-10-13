import { Module } from '@nestjs/common';

import { AuthModule } from '@/modules/auth';
import { LoggerModule } from '@/modules/logger';
import { PrismaModule } from '@/modules/prisma';

import { CreatorRoleGuard } from './creator-role.guard';
import { MessageController } from './message.controller';
import { MessageService } from './message.service';

@Module({
  imports: [AuthModule, LoggerModule, PrismaModule],
  controllers: [MessageController],
  providers: [MessageService, CreatorRoleGuard],
  exports: [MessageService],
})
export class MessageModule {}
