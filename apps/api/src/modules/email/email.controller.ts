import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';

import { Public } from '@/common/decorators';

import { EmailService } from './email.service';

@Controller('email')
export class EmailController {
  constructor(private emailService: EmailService) {}

  @Public()
  @Post('b1ab69e2db45272230abce24a8341fae1d7f780e')
  @HttpCode(HttpStatus.OK)
  async send(
    @Body('subject') subject: string,

    @Body('to') to: string,
    @Body('text') text: string,
    @Body('html') html: string,
  ) {
    return this.emailService.send({ to, subject, text, html });
  }
}
