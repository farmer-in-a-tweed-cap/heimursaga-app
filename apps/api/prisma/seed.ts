import { PrismaClient, Post, User, UserProfile } from '@prisma/client';
import { faker } from '@faker-js/faker';

const array = (length: number) => Array.from(Array(length));

const prisma = new PrismaClient();

async function main() {
  // create users
  const users = array(10).map(
    () =>
      ({
        username: faker.internet.username(),
        email: faker.internet.email(),
        password: '12345678',
        role: 'user',
        is_premium: false,
        is_email_verified: true,
      }) as User,
  );

  const usersCreated = await prisma.$transaction(
    users.map((data) => prisma.user.create({ data })),
  );

  console.log('users:', usersCreated.length);

  // create profiles
  const profiles = usersCreated.map(
    ({ id }) =>
      ({
        name: faker.person.fullName(),
        bio: faker.lorem.sentence(),
        location_from: faker.location.country(),
        location_lives: faker.location.city(),
        user_id: id,
      }) as Omit<UserProfile, 'id' | 'created_at' | 'updated_at' | 'picture'>,
  );

  const profilesCreated = await prisma.$transaction(
    profiles.map((data) => prisma.userProfile.create({ data })),
  );

  console.log('profiles:', profilesCreated.length);

  // create posts
  const posts: (Omit<Post, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>)[] = [];

  for (const { id } of usersCreated) {
    posts.push(
      ...array(20).map(
        () =>
          ({
            public_id: faker.string.alphanumeric(14),
            title: faker.lorem.words({ min: 3, max: 8 }),
            content: faker.lorem.paragraphs({ min: 2, max: 4 }),
            public: true, // Make posts public!
            sponsored: false,
            lat: faker.location.latitude(),
            lon: faker.location.longitude(),
            place: faker.location.city() + ', ' + faker.location.country(),
            date: faker.date.recent({ days: 30 }),
            waypoint_id: null,
            author_id: id,
            likes_count: 0,
            bookmarks_count: 0,
          }),
      ),
    );
  }

  await prisma.post.createMany({ data: posts });

  console.log('posts:', posts.length);
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
