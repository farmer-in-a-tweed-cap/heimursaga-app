import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { LoggerModule } from '@/modules/logger';

import { EventService } from './event.service';

@Global()
@Module({
  imports: [ConfigModule, LoggerModule],
  controllers: [],
  providers: [EventService],
  exports: [EventService],
})
export class EventModule {}
