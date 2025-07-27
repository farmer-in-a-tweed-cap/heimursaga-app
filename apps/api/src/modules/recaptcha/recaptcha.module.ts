import { Module } from '@nestjs/common';
import { LoggerModule } from '@/modules/logger';
import { RecaptchaService } from './recaptcha.service';

@Module({
  imports: [LoggerModule],
  providers: [RecaptchaService],
  exports: [RecaptchaService],
})
export class RecaptchaModule {}