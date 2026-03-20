import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { Logger } from '@/modules/logger';
import { PrismaService } from '@/modules/prisma';

@Injectable()
export class AuthCronService {
  constructor(
    private logger: Logger,
    private prisma: PrismaService,
  ) {}

  /**
   * Daily at 2:00 AM UTC — delete expired sessions to prevent unbounded table growth.
   */
  @Cron('0 2 * * *')
  async handleExpiredSessionCleanup(): Promise<void> {
    this.logger.log('[CRON] Running expired session cleanup');

    try {
      const result = await this.prisma.explorerSession.deleteMany({
        where: {
          OR: [{ expires_at: { lt: new Date() } }, { expired: true }],
        },
      });

      this.logger.log(
        `[CRON] Expired session cleanup complete. Removed ${result.count} sessions.`,
      );
    } catch (e) {
      this.logger.error(`[CRON] Expired session cleanup failed: ${e.message}`);
    }
  }
}
