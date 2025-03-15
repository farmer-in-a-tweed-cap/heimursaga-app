import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { Public, Session } from '@/common/decorators';
import { ISession } from '@/common/interfaces';

import { SearchQueryPayloadDto } from './search.dto';
import { SearchService } from './search.service';

@ApiTags('search')
@Controller('search')
export class SearchController {
  constructor(private searchService: SearchService) {}

  @Public()
  @Post()
  @HttpCode(HttpStatus.OK)
  async search(
    @Body() body: SearchQueryPayloadDto,
    @Session() session: ISession,
  ) {
    return await this.searchService.search({
      ...body,
      userId: session?.userId,
    });
  }
}
