"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const faker_1 = require("@faker-js/faker");
const utils_1 = require("./../src/lib/utils");
const prisma = new client_1.PrismaClient();
async function main() {
    const users = (0, utils_1.array)(10).map(() => ({
        username: faker_1.faker.internet.username(),
        email: faker_1.faker.internet.email(),
        password: '12345678',
        role: 'user',
        is_premium: false,
        is_email_verified: true,
    }));
    const usersCreated = await prisma.$transaction(users.map((data) => prisma.user.create({ data })));
    console.log('users:', usersCreated.length);
    const profiles = usersCreated.map(({ id }) => ({
        first_name: faker_1.faker.person.firstName(),
        last_name: faker_1.faker.person.lastName(),
        user_id: id,
    }));
    const profilesCreated = await prisma.$transaction(profiles.map((data) => prisma.userProfile.create({ data })));
    console.log('profiles:', profilesCreated.length);
    const posts = [];
    for (const { id } of usersCreated) {
        posts.push(...(0, utils_1.array)(20).map(() => ({
            title: faker_1.faker.lorem.paragraph({ min: 1, max: 1 }),
            content: faker_1.faker.lorem.paragraphs({ min: 1, max: 3 }),
            author_id: id,
        })));
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
//# sourceMappingURL=seed.js.map