import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { APP_GUARD } from '@nestjs/core';

import { PrismaModule } from '@/modules/prisma';
import { RecaptchaModule } from '@/modules/recaptcha/recaptcha.module';

import { AuthController } from './auth.controller';
import { AuthGuard, RolesGuard } from './auth.guard';
import { AuthService } from './auth.service';

@Module({
  imports: [
    ConfigModule, 
    PrismaModule, 
    RecaptchaModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'default-secret-key-for-development',
      signOptions: { expiresIn: '7d' }, // 7 days for mobile tokens
    }),
  ],
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
