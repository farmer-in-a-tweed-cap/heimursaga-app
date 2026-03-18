import { Controller } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';

import { EmailService } from './email.service';

@ApiExcludeController()
@Controller('email')
export class EmailController {
  constructor(private emailService: EmailService) {}
}
