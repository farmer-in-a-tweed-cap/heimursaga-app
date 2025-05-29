import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { AuthModule } from '@/modules/auth';
import { EmailModule } from '@/modules/email';
import { EventModule } from '@/modules/event';
import { LoggerModule } from '@/modules/logger';
import { MapModule } from '@/modules/map';
import { NotificationModule } from '@/modules/notification';
import { PaymentModule } from '@/modules/payment';
import { PayoutModule } from '@/modules/payout';
import { PostModule } from '@/modules/post';
import { PrismaModule } from '@/modules/prisma';
import { SearchModule } from '@/modules/search';
import { SponsorModule } from '@/modules/sponsor';
import { StripeModule } from '@/modules/stripe';
import { TripModule } from '@/modules/trip';
import { UploadModule } from '@/modules/upload';
import { UserModule } from '@/modules/user';

import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    EventEmitterModule.forRoot({
      wildcard: false,
      delimiter: '.',
      verboseMemoryLeak: false,
    }),
    LoggerModule,
    EventModule,
    EmailModule,
    StripeModule,
    PrismaModule,
    AuthModule,
    PostModule,
    UploadModule,
    UserModule,
    MapModule,
    PaymentModule,
    SponsorModule,
    PayoutModule,
    TripModule,
    NotificationModule,
    SearchModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
