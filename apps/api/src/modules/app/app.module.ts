import { Module } from '@nestjs/common';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { LoggerModule } from '@/modules/logger';
// import { PrismaModule } from '@/modules/prisma';

@Module({
  imports: [
    LoggerModule,
    //  PrismaModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
