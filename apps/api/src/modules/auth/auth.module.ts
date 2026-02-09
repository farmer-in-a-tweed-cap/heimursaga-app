import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';

import { ExplorerModule } from '@/modules/explorer/explorer.module';
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
    forwardRef(() => ExplorerModule),
    JwtModule.register({
      secret: (() => {
        if (!process.env.JWT_SECRET) {
          throw new Error('JWT_SECRET environment variable is required');
        }
        return process.env.JWT_SECRET;
      })(),
      signOptions: { expiresIn: '24h' },
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
