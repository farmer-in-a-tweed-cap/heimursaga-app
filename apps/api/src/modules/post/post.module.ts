import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { EventModule } from '@/modules/event';
import { PrismaModule } from '@/modules/prisma';

import { PostController } from './post.controller';
import { PostService } from './post.service';

@Module({
  imports: [ConfigModule, PrismaModule, EventModule],
  controllers: [PostController],
  providers: [PostService],
  exports: [PostService],
})
export class PostModule {}
