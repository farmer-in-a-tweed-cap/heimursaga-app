import { Module } from '@nestjs/common';

import { AuthModule } from '@/modules/auth';
import { LoggerModule } from '@/modules/logger';
import { PrismaModule } from '@/modules/prisma';

import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [LoggerModule, PrismaModule, AuthModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
