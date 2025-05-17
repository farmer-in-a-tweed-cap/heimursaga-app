import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { Session } from '@/common/decorators';
import { ParamPublicIdDto } from '@/common/dto';
import { ISession } from '@/common/interfaces';

import { SponsorCheckoutDto, SponsorshipTierUpdateDto } from './sponsor.dto';
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

@ApiTags('sponsorships')
@Controller('sponsorships')
export class SponsorshipController {
  constructor(private sponsorService: SponsorService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async getSponsorships(@Session() session: ISession) {
    return await this.sponsorService.getCreatorSponsorships({
      query: {},
      session,
    });
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelSponsorship(
    @Session() session: ISession,
    @Param() params: ParamPublicIdDto,
  ) {
    return await this.sponsorService.cancelSponsorship({
      query: { sponsorshipId: params.id },
      session,
    });
  }
}

@ApiTags('sponsorship-tiers')
@Controller('sponsorship-tiers')
export class SponsorshipTierController {
  constructor(private sponsorService: SponsorService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async getSponsorshipTiers(@Session() session: ISession) {
    return await this.sponsorService.getSponsorshipTiers({
      query: {},
      session,
    });
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  async updateSponsorshipTier(
    @Param() param: ParamPublicIdDto,
    @Body() body: SponsorshipTierUpdateDto,
    @Session() session: ISession,
  ) {
    return await this.sponsorService.updateSponsorshipTier({
      query: { id: param.id },
      payload: body,
      session,
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteSponsorshipTier(
    @Param() param: ParamPublicIdDto,
    @Session() session: ISession,
  ) {
    return await this.sponsorService.deleteSponsorshipTier({
      query: { id: param.id },
      session,
    });
  }
}
