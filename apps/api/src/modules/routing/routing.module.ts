import { Module } from '@nestjs/common';

import { LoggerModule } from '@/modules/logger';

import { RoutingController } from './routing.controller';
import { RoutingService } from './routing.service';
import { WaterwayRoutingService } from './waterway-routing.service';

@Module({
  imports: [LoggerModule],
  controllers: [RoutingController],
  providers: [RoutingService, WaterwayRoutingService],
  exports: [RoutingService, WaterwayRoutingService],
})
export class RoutingModule {}
