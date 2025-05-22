import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';

import { Logger } from '@/modules/logger';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(private logger: Logger) {
    const isProduction = process.env.NODE_ENV === 'production';
    const isStaging = process.env.NODE_ENV === 'staging';

    super({
      log: isStaging ? [{ emit: 'event', level: 'query' }] : [],
    });

    this.$on('query' as never, (event: Prisma.QueryEvent) => {
      const { query, duration } = event;

      this.logger.log(JSON.stringify({ q: query, d: duration }, null, 2));
    });
  }

  async onModuleInit() {
    await this.$connect()
      .then(() => {
        this.logger.log('prisma: database connected');
      })
      .catch((e) => {
        this.logger.log(`prisma error\n${e}`);
      });
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
