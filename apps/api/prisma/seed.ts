import { PrismaClient, Explorer, ExplorerProfile } from '@prisma/client';
import { faker } from '@faker-js/faker';

const array = (length: number) => Array.from(Array(length));

const prisma = new PrismaClient();

async function main() {
  // ============================================
  // EXPLORER PRO PLAN
  // ============================================
  // Requires environment variables:
  // - STRIPE_PLAN_PRODUCT_ID
  // - STRIPE_PLAN_PRICE_MONTH_ID
  // - STRIPE_PLAN_PRICE_YEAR_ID

  const plan = await prisma.plan.upsert({
    where: { slug: 'explorer-pro' },
    update: {
      // Update Stripe IDs if they change
      stripe_product_id: process.env.STRIPE_PLAN_PRODUCT_ID || null,
      stripe_price_month_id: process.env.STRIPE_PLAN_PRICE_MONTH_ID || null,
      stripe_price_year_id: process.env.STRIPE_PLAN_PRICE_YEAR_ID || null,
    },
    create: {
      slug: 'explorer-pro',
      name: 'Explorer Pro',
      description: 'Unlock premium features for serious explorers',
      is_available: true,
      stripe_product_id: process.env.STRIPE_PLAN_PRODUCT_ID || null,
      stripe_price_month_id: process.env.STRIPE_PLAN_PRICE_MONTH_ID || null,
      stripe_price_year_id: process.env.STRIPE_PLAN_PRICE_YEAR_ID || null,
      price_month: 700,      // $7.00 in cents
      price_year: 5000,      // $50.00 in cents
      discount_year: 40,     // 40% off ($84 -> $50)
      features: JSON.stringify([
        'Receive sponsorships',
        'Customizable sponsorship tiers',
        'Expedition notes (280-char updates)',
        'Sponsor-only content',
        'Priority support',
        'Pro badge',
      ]),
    },
  });

  console.log('plan:', plan.slug, plan.id);

  // ============================================
  // SEED DATA (for development)
  // ============================================

  // create explorers
  const explorers = array(10).map(
    () =>
      ({
        username: faker.internet.username(),
        email: faker.internet.email(),
        password: '12345678',
        role: 'user',
        is_premium: false,
        is_email_verified: true,
      }) as Explorer,
  );

  const explorersCreated = await prisma.$transaction(
    explorers.map((data) => prisma.explorer.create({ data })),
  );

  console.log('explorers:', explorersCreated.length);

  // create profiles
  const profiles = explorersCreated.map(
    ({ id }) =>
      ({
        name: faker.person.fullName(),
        bio: faker.lorem.sentence(),
        location_from: faker.location.country(),
        location_lives: faker.location.city(),
        explorer_id: id,
      }) as Omit<ExplorerProfile, 'id' | 'created_at' | 'updated_at' | 'picture'>,
  );

  const profilesCreated = await prisma.$transaction(
    profiles.map((data) => prisma.explorerProfile.create({ data })),
  );

  console.log('profiles:', profilesCreated.length);

  // create entries
  const entries = [];

  for (const { id } of explorersCreated) {
    entries.push(
      ...array(20).map(() => ({
        public_id: faker.string.alphanumeric(14),
        title: faker.lorem.words({ min: 3, max: 8 }),
        content: faker.lorem.paragraphs({ min: 2, max: 4 }),
        public: true,
        sponsored: false,
        lat: faker.location.latitude(),
        lon: faker.location.longitude(),
        place: faker.location.city() + ', ' + faker.location.country(),
        date: faker.date.recent({ days: 30 }),
        author_id: id,
      })),
    );
  }

  await prisma.entry.createMany({ data: entries });

  console.log('entries:', entries.length);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    // @ts-ignore
    process.exit(1);
  });
