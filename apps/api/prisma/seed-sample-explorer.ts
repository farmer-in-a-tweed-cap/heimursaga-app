/**
 * Seed script: generate a fully-populated sample explorer with expeditions,
 * waypoints, and entries that respect all schema constraints.
 *
 * Usage:
 *   cd apps/api
 *   npx env-cmd -f .env.development ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed-sample-explorer.ts
 */

import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';
import * as crypto from 'node:crypto';

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Mirror apps/api/src/lib/generator.ts publicId logic */
function publicId(): string {
  return crypto
    .randomBytes(Math.ceil((14 * 3) / 4))
    .toString('base64url')
    .slice(0, 14);
}

/** Mirror apps/api/src/lib/utils.ts hashPassword */
function hashPassword(password: string): string {
  const salt = crypto.randomBytes(32).toString('hex');
  const hash = crypto
    .pbkdf2Sync(password, salt, 100_000, 64, 'sha512')
    .toString('hex');
  return `${salt}:${hash}`;
}

/** Random float in range */
function randFloat(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/** Pick random element from array */
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Return array of `n` items produced by `fn` */
function times<T>(n: number, fn: (i: number) => T): T[] {
  return Array.from({ length: n }, (_, i) => fn(i));
}

// ---------------------------------------------------------------------------
// Constants — valid enum values & limits from schema
// ---------------------------------------------------------------------------

const EXPEDITION_STATUSES = ['planned', 'active', 'completed'] as const;
const EXPEDITION_MODES = ['hike', 'paddle', 'bike', 'sail', 'drive', 'mixed'] as const;
const ROUTE_MODES = ['straight', 'walking', 'cycling', 'driving'] as const;
const VISIBILITY = ['public'] as const; // keep sample data public
const CATEGORIES = [
  'hiking', 'cycling', 'sailing', 'backpacking', 'overlanding',
  'kayaking', 'mountaineering', 'trail-running',
] as const;

// Realistic expedition regions with bounding boxes [minLat, maxLat, minLon, maxLon]
const REGIONS: { name: string; country: string; cc: string; bbox: [number, number, number, number] }[] = [
  { name: 'Pacific Crest Trail',     country: 'United States', cc: 'US', bbox: [32.5, 49.0, -124.0, -115.0] },
  { name: 'Patagonia',               country: 'Argentina',     cc: 'AR', bbox: [-54.0, -40.0, -76.0, -63.0] },
  { name: 'Norwegian Fjords',        country: 'Norway',        cc: 'NO', bbox: [58.0, 71.0, 4.0, 16.0] },
  { name: 'Scottish Highlands',      country: 'United Kingdom',cc: 'GB', bbox: [56.0, 58.5, -7.5, -3.0] },
  { name: 'New Zealand South Island',country: 'New Zealand',   cc: 'NZ', bbox: [-47.0, -41.0, 166.0, 174.0] },
  { name: 'Hokkaido',                country: 'Japan',         cc: 'JP', bbox: [41.0, 45.5, 139.0, 146.0] },
];

// Sample entry content — realistic expedition journal paragraphs
const ENTRY_PARAGRAPHS = [
  'The trail opened up after the tree line, revealing a valley that stretched endlessly beneath a muted grey sky. Wind swept across the ridge in gusts strong enough to make me brace with my poles.',
  'Woke before dawn to catch the light on the water. The lake was perfectly still, mirroring the mountains so precisely it was hard to tell where rock ended and reflection began.',
  'Resupplied in the village today. The shopkeeper spoke no English but managed to communicate that the pass ahead is still snow-covered. Will need crampons.',
  'Legs are heavy after 32 km yesterday. Found a sheltered spot by the river to camp early and let the body recover. The sound of water over stones is the only thing I can hear.',
  'Crossed paths with a group of local shepherds moving their flock to higher pastures. They shared bread and cheese without a word of shared language. Hospitality is universal.',
  'Rain started mid-morning and never let up. Everything is soaked — tent, sleeping bag, morale. Pitched under an overhang and cooked a hot meal. Tomorrow will be better.',
  'The descent into the canyon was steeper than the map suggested. Loose scree for the last 400 metres made every step deliberate. Knees protesting.',
  'A rest day in town. Did laundry, charged devices, ate an obscene amount of food. The body craves calories at this pace — everything tastes incredible.',
  'Watched the sunset from a ridgeline tonight. The colours shifted through orange, pink, and a deep violet I have never seen outside of this latitude. No photograph could capture it.',
  'Navigation was tricky today — the trail markers were buried under fresh snow. Relied on compass and GPS for a few hours before picking up the path again on the southern slope.',
];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const USERNAME = `explorer_${Date.now().toString(36)}`;
  const PASSWORD = 'SamplePass123!';

  console.log(`\nCreating sample explorer: ${USERNAME}`);
  console.log(`Password: ${PASSWORD}\n`);

  // -------------------------------------------------------------------------
  // 1. Explorer + Profile
  // -------------------------------------------------------------------------

  const explorer = await prisma.explorer.create({
    data: {
      username: USERNAME,
      email: `${USERNAME}@sample.heimursaga.dev`,
      password: hashPassword(PASSWORD),
      role: 'user',
      is_premium: false,
      is_email_verified: true,
      admin: false,
      blocked: false,
      profile: {
        create: {
          name: faker.person.fullName(),
          bio: faker.lorem.sentence({ min: 8, max: 20 }),          // max 500 chars
          location_from: faker.location.country(),                   // max 200 chars
          location_lives: faker.location.city(),                     // max 200 chars
          location_visibility: 'public',                             // max 25 chars
          website: `https://${faker.internet.domainName()}`,
          equipment: JSON.stringify([
            'Osprey Exos 58L', 'MSR Hubba Hubba NX', 'Jetboil Flash',
          ]),
          notification_preferences: JSON.stringify({}),
        },
      },
    },
  });

  console.log(`  Explorer #${explorer.id} — @${explorer.username}`);

  // -------------------------------------------------------------------------
  // 2. Expeditions (3 total: 1 completed, 1 active, 1 planned)
  // -------------------------------------------------------------------------

  const expeditionConfigs = [
    { status: 'completed' as const, daysAgo: 90,  durationDays: 28 },
    { status: 'active'    as const, daysAgo: 10,  durationDays: 45 },
    { status: 'planned'   as const, daysAgo: -30, durationDays: 14 },
  ];

  const expeditions: Array<{ id: number; publicId: string; status: string; region: typeof REGIONS[number]; startDate: Date; endDate: Date }> = [];

  for (const cfg of expeditionConfigs) {
    const region = pick(REGIONS.filter(r => !expeditions.some(e => e.region.cc === r.cc)));
    const mode = pick([...EXPEDITION_MODES]);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - cfg.daysAgo);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + cfg.durationDays);

    const title = `${faker.word.adjective()} ${region.name} ${pick(['Traverse', 'Expedition', 'Circuit', 'Journey'])}`;

    const expedition = await prisma.expedition.create({
      data: {
        public_id: publicId(),
        title: title.slice(0, 100),                              // max 100 chars
        description: faker.lorem.sentences({ min: 2, max: 3 }).slice(0, 500), // max 500
        status: cfg.status,
        visibility: 'public',
        public: true,
        category: pick([...CATEGORIES]).slice(0, 50),            // max 50 chars
        mode: mode,                                               // max 20 chars
        start_date: startDate,
        end_date: cfg.status === 'planned' ? endDate : (cfg.status === 'completed' ? endDate : null),
        country_code: region.cc,                                  // max 2 chars
        country_name: region.country.slice(0, 100),               // max 100 chars
        region: region.name.slice(0, 100),                        // max 100 chars
        location_name: `${region.name}, ${region.country}`.slice(0, 200), // max 200
        is_round_trip: Math.random() > 0.6,
        route_mode: pick([...ROUTE_MODES]),                       // max 20 chars
        route_distance_km: randFloat(50, 800),
        elevation_gain_m: randFloat(500, 12000),
        elevation_min_m: randFloat(0, 500),
        elevation_max_m: randFloat(1500, 5000),
        estimated_duration_h: cfg.durationDays * randFloat(4, 8),
        goal: Math.round(randFloat(50, 500)) * 100,              // cents, $50-$500
        raised: 0,
        sponsors_count: 0,
        entries_count: 0,                                         // will update after entries
        bookmarks_count: 0,
        author_id: explorer.id,
      },
    });

    expeditions.push({
      id: expedition.id,
      publicId: expedition.public_id,
      status: cfg.status,
      region,
      startDate,
      endDate,
    });

    console.log(`  Expedition #${expedition.id} — "${expedition.title}" [${cfg.status}]`);
  }

  // -------------------------------------------------------------------------
  // 3. Waypoints per expedition (4-8 each)
  // -------------------------------------------------------------------------

  for (const exp of expeditions) {
    const waypointCount = 4 + Math.floor(Math.random() * 5); // 4-8
    const [minLat, maxLat, minLon, maxLon] = exp.region.bbox;

    const waypointIds: number[] = [];

    for (let seq = 0; seq < waypointCount; seq++) {
      // Distribute waypoints roughly along a path through the bbox
      const progress = seq / (waypointCount - 1);
      const lat = minLat + (maxLat - minLat) * progress + randFloat(-0.5, 0.5);
      const lon = minLon + (maxLon - minLon) * progress + randFloat(-0.5, 0.5);

      const wp = await prisma.waypoint.create({
        data: {
          lat,
          lon,
          title: faker.location.city().slice(0, 200),                   // max 200 chars
          description: faker.lorem.sentence({ min: 4, max: 12 }).slice(0, 500), // max 500
          public: true,
          date: new Date(exp.startDate.getTime() + (exp.endDate.getTime() - exp.startDate.getTime()) * progress),
          author_id: explorer.id,
        },
      });

      // Link waypoint to expedition via join table
      await prisma.expeditionWaypoint.create({
        data: {
          expedition_id: exp.id,
          waypoint_id: wp.id,
          sequence: seq,
        },
      });

      waypointIds.push(wp.id);
    }

    console.log(`    ${waypointCount} waypoints for expedition #${exp.id}`);

    // -----------------------------------------------------------------------
    // 4. Entries per expedition (5-12 for completed/active, 0 for planned)
    // -----------------------------------------------------------------------

    if (exp.status === 'planned') continue;

    const entryCount = exp.status === 'completed'
      ? 8 + Math.floor(Math.random() * 5)    // 8-12
      : 3 + Math.floor(Math.random() * 5);   // 3-7 for active

    const entries = [];

    for (let i = 0; i < entryCount; i++) {
      const progress = i / (entryCount - 1);
      const entryDate = new Date(
        exp.startDate.getTime() +
        (exp.endDate.getTime() - exp.startDate.getTime()) * progress
      );

      // Pick nearest waypoint
      const nearestWpIdx = Math.min(
        Math.floor(progress * waypointIds.length),
        waypointIds.length - 1
      );

      const [minLat, maxLat, minLon, maxLon] = exp.region.bbox;
      const lat = minLat + (maxLat - minLat) * progress + randFloat(-0.3, 0.3);
      const lon = minLon + (maxLon - minLon) * progress + randFloat(-0.3, 0.3);

      // Build content: 2-4 paragraphs from sample content
      const paragraphCount = 2 + Math.floor(Math.random() * 3);
      const content = times(paragraphCount, () => pick(ENTRY_PARAGRAPHS)).join('\n\n');

      entries.push({
        public_id: publicId(),
        title: `Day ${i + 1}: ${faker.lorem.words({ min: 3, max: 6 })}`.slice(0, 200), // max 200
        content,
        entry_type: 'standard',                                    // max 20 chars
        visibility: 'public',                                     // max 20 chars
        public: true,
        is_draft: false,
        is_milestone: i === 0 || i === entryCount - 1,            // first & last are milestones
        date: entryDate,
        published_at: entryDate,
        lat,
        lon,
        place: `${faker.location.city()}, ${exp.region.country}`.slice(0, 250), // max 250
        country_code: exp.region.cc,                               // max 2 chars
        comments_enabled: true,
        author_id: explorer.id,
        expedition_id: exp.id,
        waypoint_id: waypointIds[nearestWpIdx],
      });
    }

    await prisma.entry.createMany({ data: entries });

    // Update expedition entries_count
    await prisma.expedition.update({
      where: { id: exp.id },
      data: { entries_count: entryCount },
    });

    // Update explorer entries_count
    await prisma.explorer.update({
      where: { id: explorer.id },
      data: {
        entries_count: {
          increment: entryCount,
        },
      },
    });

    console.log(`    ${entryCount} entries for expedition #${exp.id}`);
  }

  // -------------------------------------------------------------------------
  // 5. A standalone entry (not attached to any expedition)
  // -------------------------------------------------------------------------

  await prisma.entry.create({
    data: {
      public_id: publicId(),
      title: 'Reflections on the Road'.slice(0, 200),
      content: times(3, () => pick(ENTRY_PARAGRAPHS)).join('\n\n'),
      entry_type: 'standard',
      visibility: 'public',
      public: true,
      is_draft: false,
      date: new Date(),
      published_at: new Date(),
      lat: randFloat(-60, 60),
      lon: randFloat(-180, 180),
      place: `${faker.location.city()}, ${faker.location.country()}`.slice(0, 250),
      comments_enabled: true,
      author_id: explorer.id,
    },
  });

  await prisma.explorer.update({
    where: { id: explorer.id },
    data: { entries_count: { increment: 1 } },
  });

  console.log(`  1 standalone entry`);

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------

  const totalEntries = await prisma.entry.count({ where: { author_id: explorer.id } });
  const totalWaypoints = await prisma.waypoint.count({ where: { author_id: explorer.id } });
  const totalExpeditions = await prisma.expedition.count({ where: { author_id: explorer.id } });

  console.log(`\n  Summary:`);
  console.log(`    Explorer:    @${explorer.username} (id: ${explorer.id})`);
  console.log(`    Email:       ${explorer.email}`);
  console.log(`    Password:    ${PASSWORD}`);
  console.log(`    Expeditions: ${totalExpeditions}`);
  console.log(`    Waypoints:   ${totalWaypoints}`);
  console.log(`    Entries:     ${totalEntries}`);
  console.log();
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
