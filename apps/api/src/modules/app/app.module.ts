import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { AuthModule } from '@/modules/auth';
import { EmailModule } from '@/modules/email';
import { EventModule } from '@/modules/event';
import { LoggerModule } from '@/modules/logger';
import { PostModule } from '@/modules/post';
import { PrismaModule } from '@/modules/prisma';
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
    PrismaModule,
    AuthModule,
    PostModule,
    UploadModule,
    UserModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
