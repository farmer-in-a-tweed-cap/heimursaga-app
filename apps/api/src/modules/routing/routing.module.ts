import { Module } from '@nestjs/common';

import { LoggerModule } from '@/modules/logger';

import { RoutingController } from './routing.controller';
import { RoutingService } from './routing.service';

@Module({
  imports: [LoggerModule],
  controllers: [RoutingController],
  providers: [RoutingService],
  exports: [RoutingService],
})
export class RoutingModule {}
