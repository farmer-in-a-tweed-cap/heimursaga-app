import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { Session } from '@/common/decorators';
import { ISession } from '@/common/interfaces';

import { SponsorCheckoutDto } from './sponsor.dto';
import { SponsorService } from './sponsor.service';

@ApiTags('sponsor')
@Controller('sponsor')
export class SponsorController {
  constructor(private sponsorService: SponsorService) {}

  @Post('checkout')
  @HttpCode(HttpStatus.OK)
  async checkout(
    @Session() session: ISession,
    @Body() body: SponsorCheckoutDto,
  ) {
    return await this.sponsorService.checkout({
      query: {},
      payload: body,
      session,
    });
  }
}
