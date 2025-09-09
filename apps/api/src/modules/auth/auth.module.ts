import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';

import { PrismaModule } from '@/modules/prisma';
import { RecaptchaModule } from '@/modules/recaptcha/recaptcha.module';

import { AuthController } from './auth.controller';
import { AuthGuard, RolesGuard } from './auth.guard';
import { AuthService } from './auth.service';

@Module({
  imports: [ConfigModule, PrismaModule, RecaptchaModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
  exports: [AuthService],
})
export class AuthModule {}
