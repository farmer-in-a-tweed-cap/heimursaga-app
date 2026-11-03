/**
 * One-off migration for the sponsorship fee change:
 *
 *   1. Existing connected accounts: daily payouts → weekly (Monday).
 *      Accounts on any other schedule (weekly, monthly, manual) are left alone.
 *   2. Existing active subscriptions: application_fee_percent from the flat
 *      platform fee to platform fee + Stripe processing (see
 *      packages/types/sponsorship-fees.ts), so renewals stop costing the
 *      platform money. Sponsors are charged the same amount as before.
 *
 * Dry run by default; pass --apply to write to Stripe.
 *
 * Run from apps/api:
 *   npx env-cmd -f ./.env.production ts-node -r tsconfig-paths/register \
 *     scripts/migrate-stripe-fees.ts [--apply]
 *
 * Idempotent — accounts and subscriptions already migrated are skipped.
 */

import { PrismaClient } from '@prisma/client';
import {
  PayoutMethodPlatform,
  SponsorshipStatus,
  SponsorshipType,
  applicationFeePercentFor,
} from '@repo/types';
import Stripe from 'stripe';

import { APPLICATION_FEE } from '../src/config';

// Mirrors STRIPE_API_VERSION in src/modules/stripe/stripe.service.ts (not
// imported, to avoid pulling the Nest module graph into a script).
const STRIPE_API_VERSION = '2025-02-24.acacia' as Stripe.LatestApiVersion;

const APPLY = process.argv.includes('--apply');

const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: STRIPE_API_VERSION,
});

async function migratePayoutSchedules() {
  const methods = await prisma.payoutMethod.findMany({
    where: {
      platform: PayoutMethodPlatform.STRIPE,
      stripe_account_id: { not: null },
      deleted_at: null,
    },
    select: { stripe_account_id: true },
  });
  console.log(`[payouts] ${methods.length} connected accounts`);

  let updated = 0;
  let skipped = 0;
  let failed = 0;
  for (const { stripe_account_id: accountId } of methods) {
    try {
      const account = await stripe.accounts.retrieve(accountId as string);
      const interval = account.settings?.payouts?.schedule?.interval;
      if (interval !== 'daily') {
        skipped++;
        continue;
      }
      console.log(`[payouts] ${accountId}: ${interval} → weekly`);
      if (APPLY) {
        await stripe.accounts.update(accountId as string, {
          settings: {
            payouts: {
              schedule: { interval: 'weekly', weekly_anchor: 'monday' },
            },
          },
        });
      }
      updated++;
    } catch (e) {
      failed++;
      console.error(`[payouts] ${accountId}: ${(e as Error).message}`);
    }
  }
  console.log(
    `[payouts] ${APPLY ? 'updated' : 'would update'} ${updated}, skipped ${skipped}, failed ${failed}`,
  );
}

async function migrateSubscriptionFees() {
  const sponsorships = await prisma.sponsorship.findMany({
    where: {
      type: SponsorshipType.SUBSCRIPTION,
      status: {
        in: [
          SponsorshipStatus.ACTIVE,
          SponsorshipStatus.PAST_DUE,
          SponsorshipStatus.PAUSED,
        ],
      },
      stripe_subscription_id: { not: null },
      deleted_at: null,
    },
    select: { id: true, stripe_subscription_id: true },
  });
  console.log(`[subscriptions] ${sponsorships.length} active subscriptions`);

  let updated = 0;
  let skipped = 0;
  let failed = 0;
  for (const { id, stripe_subscription_id: subId } of sponsorships) {
    try {
      const sub = await stripe.subscriptions.retrieve(subId as string);
      if (['canceled', 'incomplete_expired'].includes(sub.status)) {
        skipped++;
        continue;
      }
      const amount = sub.items.data.reduce(
        (sum, item) => sum + (item.price.unit_amount ?? 0) * (item.quantity ?? 1),
        0,
      );
      const percent = applicationFeePercentFor(amount, APPLICATION_FEE);
      if (sub.application_fee_percent === percent) {
        skipped++;
        continue;
      }
      console.log(
        `[subscriptions] sponsorship ${id} (${subId}): ${sub.application_fee_percent}% → ${percent}% on ${amount}¢`,
      );
      if (APPLY) {
        await stripe.subscriptions.update(subId as string, {
          application_fee_percent: percent,
        });
      }
      updated++;
    } catch (e) {
      failed++;
      console.error(`[subscriptions] ${subId}: ${(e as Error).message}`);
    }
  }
  console.log(
    `[subscriptions] ${APPLY ? 'updated' : 'would update'} ${updated}, skipped ${skipped}, failed ${failed}`,
  );
}

async function main() {
  console.log(APPLY ? 'APPLYING changes to Stripe' : 'DRY RUN (pass --apply to write)');
  await migratePayoutSchedules();
  await migrateSubscriptionFees();
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
