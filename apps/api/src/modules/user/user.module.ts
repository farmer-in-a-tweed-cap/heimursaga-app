import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { EventModule } from '@/modules/event';
import { PrismaModule } from '@/modules/prisma';
import { SponsorModule } from '@/modules/sponsor';
import { TripModule } from '@/modules/trip';
import { UploadModule } from '@/modules/upload';

import { SessionUserController, UserController } from './user.controller';
import { SessionUserService, UserService } from './user.service';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    EventModule,
    UploadModule,
    SponsorModule,
    TripModule,
  ],
  controllers: [UserController, SessionUserController],
  providers: [UserService, SessionUserService],
  exports: [UserService, SessionUserService],
})
export class UserModule {}
