/**
 * One-off backfill: populate `posts.slug` and `trips.slug` for existing rows.
 *
 * Run:
 *   pnpm --filter api exec env-cmd -f ./.env.development \
 *     tsx ../api/scripts/backfill-slugs.ts
 *
 * Or from apps/api:
 *   npx tsx scripts/backfill-slugs.ts
 *
 * Idempotent — rows with an existing slug are skipped.
 */

import { PrismaClient } from '@prisma/client';

import {
  buildEntrySlugBase,
  buildExpeditionSlugBase,
  ensureUniqueSlug,
} from '../src/lib/slug';

const prisma = new PrismaClient();

async function backfillEntries() {
  const candidates = await prisma.entry.findMany({
    where: { slug: null, public_id: { not: null }, deleted_at: null },
    select: {
      id: true,
      public_id: true,
      title: true,
      entry_type: true,
      date: true,
      published_at: true,
    },
  });
  console.log(`[entries] ${candidates.length} rows to backfill`);

  let ok = 0;
  let skipped = 0;
  let failed = 0;

  for (const e of candidates) {
    const base = buildEntrySlugBase({
      publicId: e.public_id,
      title: e.title || '',
      entryType: e.entry_type || 'standard',
      date: e.date,
      publishedAt: e.published_at,
    });
    if (!base) {
      skipped += 1;
      continue;
    }
    try {
      const slug = await ensureUniqueSlug(base, async (cand) => {
        const hit = await prisma.entry.findFirst({
          where: { slug: cand, NOT: { id: e.id } },
          select: { id: true },
        });
        return !!hit;
      });
      await prisma.entry.update({
        where: { id: e.id },
        data: { slug },
      });
      ok += 1;
      if (ok % 50 === 0) console.log(`  …${ok} entries done`);
    } catch (err) {
      failed += 1;
      console.error(`  ! entry id=${e.id} publicId=${e.public_id}:`, err);
    }
  }
  console.log(`[entries] done — ok=${ok} skipped=${skipped} failed=${failed}`);
}

async function backfillExpeditions() {
  const candidates = await prisma.expedition.findMany({
    where: { slug: null, deleted_at: null },
    select: {
      id: true,
      public_id: true,
      title: true,
      end_date: true,
    },
  });
  console.log(`[expeditions] ${candidates.length} rows to backfill`);

  let ok = 0;
  let skipped = 0;
  let failed = 0;

  for (const x of candidates) {
    const base = buildExpeditionSlugBase({
      publicId: x.public_id,
      title: x.title || '',
      endDate: x.end_date,
    });
    if (!base) {
      skipped += 1;
      continue;
    }
    try {
      const slug = await ensureUniqueSlug(base, async (cand) => {
        const hit = await prisma.expedition.findFirst({
          where: { slug: cand, NOT: { id: x.id } },
          select: { id: true },
        });
        return !!hit;
      });
      await prisma.expedition.update({
        where: { id: x.id },
        data: { slug },
      });
      ok += 1;
      if (ok % 25 === 0) console.log(`  …${ok} expeditions done`);
    } catch (err) {
      failed += 1;
      console.error(`  ! expedition id=${x.id} publicId=${x.public_id}:`, err);
    }
  }
  console.log(
    `[expeditions] done — ok=${ok} skipped=${skipped} failed=${failed}`,
  );
}

async function main() {
  console.log('Starting slug backfill…');
  await backfillEntries();
  await backfillExpeditions();
  console.log('Done.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
