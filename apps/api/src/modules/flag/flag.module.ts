import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { PrismaModule } from '@/modules/prisma';

import { FlagController } from './flag.controller';
import { FlagService } from './flag.service';

@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [FlagController],
  providers: [FlagService],
  exports: [FlagService],
})
export class FlagModule {}
