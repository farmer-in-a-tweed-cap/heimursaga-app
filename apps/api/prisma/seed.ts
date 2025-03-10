import { PrismaClient, Post, User, UserProfile } from '@prisma/client';
import { faker } from '@faker-js/faker';

import { array } from './../src/lib/utils';

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
        first_name: faker.person.firstName(),
        last_name: faker.person.lastName(),
        user_id: id,
      }) as UserProfile,
  );

  const profilesCreated = await prisma.$transaction(
    profiles.map((data) => prisma.userProfile.create({ data })),
  );

  console.log('profiles:', profilesCreated.length);

  // create posts
  const posts: Post[] = [];

  for (const { id } of usersCreated) {
    posts.push(
      ...array(20).map(
        () =>
          ({
            title: faker.lorem.paragraph({ min: 1, max: 1 }),
            content: faker.lorem.paragraphs({ min: 1, max: 3 }),
            author_id: id,
          }) as Post,
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
    process.exit(1);
  });
