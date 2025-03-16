import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { PrismaModule } from '@/modules/prisma';

import { SessionUserController, UserController } from './user.controller';
import { SessionUserService, UserService } from './user.service';

@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [UserController, SessionUserController],
  providers: [UserService, SessionUserService],
  exports: [UserService, SessionUserService],
})
export class UserModule {}
