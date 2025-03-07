import { NestFactory } from '@nestjs/core';

import { AppModule } from './modules/app';

const HOST = process.env.HOST || '0.0.0.0';
const PORT = process.env.PORT || 5000;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(PORT, HOST, () => {
    console.log('api server running');
  });
}
bootstrap();

process.on('uncaughtException', (e) => {
  console.log('uncaughtException', e);
});
