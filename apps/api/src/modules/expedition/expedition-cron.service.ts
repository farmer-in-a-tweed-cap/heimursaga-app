import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { Logger } from '@/modules/logger';
import { PrismaService } from '@/modules/prisma';

@Injectable()
export class ExpeditionCronService {
  constructor(
    private logger: Logger,
    private prisma: PrismaService,
  ) {}

  /**
   * Daily at 1:00 AM UTC — auto-activate planned expeditions whose start date has arrived.
   */
  @Cron('0 1 * * *')
  async handlePlannedActivation(): Promise<void> {
    this.logger.log('[CRON] Running planned expedition activation');

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const result = await this.prisma.expedition.updateMany({
        where: {
          status: 'planned',
          start_date: { lte: today },
          deleted_at: null,
        },
        data: {
          status: 'active',
        },
      });

      this.logger.log(
        `[CRON] Planned expedition activation complete. Activated ${result.count} expeditions.`,
      );
    } catch (e) {
      this.logger.error(
        `[CRON] Planned expedition activation failed: ${e.message}`,
      );
    }
  }
}
