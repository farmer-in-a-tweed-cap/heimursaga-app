import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerModule } from '@nestjs/throttler';

import { AuthModule } from '@/modules/auth';
import { CommentModule } from '@/modules/comment';
import { DevModule } from '@/modules/dev';
import { EmailModule } from '@/modules/email';
import { EventModule } from '@/modules/event';
import { FlagModule } from '@/modules/flag';
import { LoggerModule } from '@/modules/logger';
import { MapModule } from '@/modules/map';
import { MessageModule } from '@/modules/message';
import { NotificationModule } from '@/modules/notification';
import { PaymentModule } from '@/modules/payment';
import { PayoutModule } from '@/modules/payout';
import { PostModule } from '@/modules/post';
import { PrismaModule } from '@/modules/prisma';
import { RecaptchaModule } from '@/modules/recaptcha/recaptcha.module';
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
    EventModule,
    EmailModule,
    StripeModule,
    PrismaModule,
    AuthModule,
    DevModule,
    PostModule,
    CommentModule,
    FlagModule,
    UploadModule,
    UserModule,
    MapModule,
    MessageModule,
    PaymentModule,
    SponsorModule,
    PayoutModule,
    TripModule,
    NotificationModule,
    SearchModule,
    RecaptchaModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
