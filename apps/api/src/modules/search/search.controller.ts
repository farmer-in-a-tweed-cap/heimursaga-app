import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { Public, Session } from '@/common/decorators';
import { ParamPublicIdDto } from '@/common/dto';
import { ISession } from '@/common/interfaces';

import { SearchQueryDto } from './search.dto';
import { SearchService } from './search.service';

@ApiTags('Search')
@Controller('search')
export class SearchController {
  constructor(private searchService: SearchService) {}

  @Public()
  @Post()
  @HttpCode(HttpStatus.OK)
  async search(@Session() session: ISession, @Body() body: SearchQueryDto) {
    return await this.searchService.search({
      query: {},
      session,
      payload: body,
    });
  }
}
