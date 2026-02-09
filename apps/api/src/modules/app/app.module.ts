import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';

import { AdminModule } from '@/modules/admin';
import { AuthModule } from '@/modules/auth';
import { CommentModule } from '@/modules/comment';
import { DevModule } from '@/modules/dev';
import { EmailModule } from '@/modules/email';
import { EntryModule } from '@/modules/entry';
import { EventModule } from '@/modules/event';
import { ExpeditionModule } from '@/modules/expedition';
import { ExpeditionNoteModule } from '@/modules/expedition-note';
import { ExplorerModule } from '@/modules/explorer';
import { FlagModule } from '@/modules/flag';
import { LoggerModule } from '@/modules/logger';
import { MapModule } from '@/modules/map';
import { MessageModule } from '@/modules/message';
import { NotificationModule } from '@/modules/notification';
import { PaymentModule } from '@/modules/payment';
import { PayoutModule } from '@/modules/payout';
import { PrismaModule } from '@/modules/prisma';
import { RecaptchaModule } from '@/modules/recaptcha/recaptcha.module';
import { SearchModule } from '@/modules/search';
import { SponsorModule } from '@/modules/sponsor';
import { StripeModule } from '@/modules/stripe';
import { UploadModule } from '@/modules/upload';

import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot({
      wildcard: false,
      delimiter: '.',
      verboseMemoryLeak: false,
    }),
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000, // 1 second
        limit: 3,
      },
      {
        name: 'medium',
        ttl: 10000, // 10 seconds
        limit: 20,
      },
      {
        name: 'long',
        ttl: 60000, // 1 minute
        limit: 100,
      },
    ]),
    LoggerModule,
    AdminModule,
    EventModule,
    EmailModule,
    StripeModule,
    PrismaModule,
    AuthModule,
    DevModule,
    EntryModule,
    CommentModule,
    FlagModule,
    UploadModule,
    ExplorerModule,
    MapModule,
    MessageModule,
    PaymentModule,
    SponsorModule,
    PayoutModule,
    ExpeditionModule,
    ExpeditionNoteModule,
    NotificationModule,
    SearchModule,
    RecaptchaModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
