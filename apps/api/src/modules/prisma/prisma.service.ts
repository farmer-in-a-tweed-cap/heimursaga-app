// import { Injectable, OnModuleInit } from '@nestjs/common';
// import { PrismaClient } from '@prisma/client';

// import { Logger } from '@/modules/logger';

// @Injectable()
// export class PrismaService extends PrismaClient implements OnModuleInit {
//   constructor(private logger: Logger) {
//     super();
//   }

//   async onModuleInit() {
//     await this.$connect()
//       .then(() => {
//         this.logger.log('prisma: database connected');
//       })
//       .catch((e) => {
//         this.logger.log('prisma error', e);
//       });
//   }

//   // @todo
//   // async enableShutdownHooks(app: INestApplication) {
//   //   this.$on()
//   //   this.$on('beforeExit', async () => {
//   //     await app.close();
//   //   });
//   // }
// }
