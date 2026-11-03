import { Prisma } from '@prisma/client';
import {
  DEFAULT_MONTHLY_TIERS,
  DEFAULT_ONE_TIME_TIERS,
  TierSlotConfig,
} from '@repo/types';

import { generator } from '@/lib/generator';

type TierClient = Pick<Prisma.TransactionClient, 'sponsorshipTier'>;

/**
 * Create any missing default sponsorship tier slots for an explorer.
 * Idempotent — slots that already exist (by type + priority) are left alone,
 * so explorers keep their own prices and availability.
 */
export async function ensureDefaultSponsorshipTiers(
  client: TierClient,
  explorerId: number,
): Promise<void> {
  const existing = await client.sponsorshipTier.findMany({
    where: { explorer_id: explorerId, deleted_at: null },
    select: { type: true, priority: true },
  });
  const has = new Set(existing.map((t) => `${t.type}:${t.priority}`));

  const defaults: Array<['ONE_TIME' | 'MONTHLY', TierSlotConfig[]]> = [
    ['ONE_TIME', DEFAULT_ONE_TIME_TIERS],
    ['MONTHLY', DEFAULT_MONTHLY_TIERS],
  ];

  for (const [type, slots] of defaults) {
    for (const slot of slots) {
      if (has.has(`${type}:${slot.slot}`)) continue;
      await client.sponsorshipTier.create({
        data: {
          public_id: generator.publicId(),
          type,
          price: slot.defaultPrice * 100, // cents
          description: slot.label,
          priority: slot.slot,
          is_available: true,
          explorer_id: explorerId,
        },
      });
    }
  }
}
