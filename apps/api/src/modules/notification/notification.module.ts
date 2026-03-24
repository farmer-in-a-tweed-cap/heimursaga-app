import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { PrismaModule } from '@/modules/prisma';

import { EmbargoLiftCronService } from './embargo-lift-cron.service';
import { FollowerNotificationListener } from './follower-notification.listener';
import { NotificationService } from './notification.service';

@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [],
  providers: [
    NotificationService,
    FollowerNotificationListener,
    EmbargoLiftCronService,
  ],
  exports: [NotificationService],
})
export class NotificationModule {}
