import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  async test() {
    try {
      const results = {
        users: 0,
        posts: 0,
      };

      return results;
    } catch (error) {
      console.log(error);
    }
  }
}
