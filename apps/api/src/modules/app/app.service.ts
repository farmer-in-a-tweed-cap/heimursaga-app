import { Injectable } from '@nestjs/common';

// import { PrismaService } from '@/modules/prisma';

@Injectable()
export class AppService {
  constructor() {} // private readonly prisma: PrismaService

  async test() {
    try {
      const results = {
        // users: await this.prisma.user.count(),
        // posts: await this.prisma.post.count(),
      };

      return results;
    } catch (error) {
      console.log(error);
    }
  }
}
