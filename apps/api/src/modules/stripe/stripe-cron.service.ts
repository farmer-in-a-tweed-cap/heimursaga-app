import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { Logger } from '@/modules/logger';
import { PrismaService } from '@/modules/prisma';

@Injectable()
export class StripeCronService {
  constructor(
    private logger: Logger,
    private prisma: PrismaService,
  ) {}

  /**
   * Sundays at 5:00 AM UTC — delete processed webhook events older than 30 days.
   */
  @Cron('0 5 * * 0')
  async handleWebhookEventCleanup(): Promise<void> {
    this.logger.log('[CRON] Running processed webhook event cleanup');

    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const result = await this.prisma.processedWebhookEvent.deleteMany({
        where: { processed_at: { lt: thirtyDaysAgo } },
      });

      this.logger.log(
        `[CRON] Webhook event cleanup complete. Removed ${result.count} events.`,
      );
    } catch (e) {
      this.logger.error(
        `[CRON] Webhook event cleanup failed: ${e.message}`,
      );
    }
  }
}
