import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';

import { Public } from '@/common/decorators';
import {
  EMAIL_TEMPLATE_KEYS,
  getEmailTemplate,
} from '@/common/email-templates';

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
    const template = getEmailTemplate(EMAIL_TEMPLATE_KEYS.WELCOME, {
      first_name: 'peter',
    });

    if (!template) throw new BadRequestException();

    return this.emailService.send({
      to,
      subject: template.subject,
      html: template.html,
    });
  }
}
