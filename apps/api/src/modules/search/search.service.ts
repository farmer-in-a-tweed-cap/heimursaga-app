import { Injectable } from '@nestjs/common';
import { ISearchQueryPayload } from '@repo/types';

import {
  ServiceException,
  ServiceForbiddenException,
} from '@/common/exceptions';
import { ISessionQueryWithPayload } from '@/common/interfaces';
import { Logger } from '@/modules/logger';
import { PrismaService } from '@/modules/prisma';

@Injectable()
export class SearchService {
  constructor(
    private logger: Logger,
    private prisma: PrismaService,
  ) {}

  // @todo
  async search({
    session,
    payload,
  }: ISessionQueryWithPayload<{}, ISearchQueryPayload>) {
    try {
    } catch (e) {
      this.logger.error(e);
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceForbiddenException('search not available');
      throw exception;
    }
  }
}
