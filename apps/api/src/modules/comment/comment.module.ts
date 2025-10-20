import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { PrismaModule } from '@/modules/prisma';
import { EventModule } from '@/modules/event';

import { CommentController } from './comment.controller';
import { CommentService } from './comment.service';

@Module({
  imports: [ConfigModule, PrismaModule, EventModule],
  controllers: [CommentController],
  providers: [CommentService],
  exports: [CommentService],
})
export class CommentModule {}
