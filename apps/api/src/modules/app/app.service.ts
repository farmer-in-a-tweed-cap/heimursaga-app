import { Injectable } from '@nestjs/common';

import { PrismaService } from '@/modules/prisma';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  async test() {
    try {
      const results = {
        posts: await this.prisma.post
          .findMany({
            select: {
              id: true,
              title: true,
              created_at: true,
              author: {
                select: {
                  id: true,
                  profile: {
                    select: { name: true },
                  },
                },
              },
            },
            orderBy: [{ id: 'desc' }],
          })
          .then((posts) =>
            posts.map((post) => ({
              id: post.id,
              title: post.title,
              author: post?.author
                ? {
                    name: post?.author?.profile?.name,
                  }
                : undefined,
              date: post.created_at,
            })),
          ),
      };

      return results;
    } catch (error) {
      console.log(error);
    }
  }
}
