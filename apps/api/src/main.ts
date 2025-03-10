import * as dotenv from 'dotenv';

import { getEnv, getEnvFilePath } from '@/lib/utils';

// import env variables from env file
dotenv.config({ path: getEnvFilePath() });

import { NestFactory } from '@nestjs/core';
import { RequestMethod } from '@nestjs/common';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';

import { fastifyCors, FastifyCorsOptions } from '@fastify/cors';
import { fastifyCookie, FastifyCookieOptions } from '@fastify/cookie';
import { fastifyMultipart, FastifyMultipartOptions } from '@fastify/multipart';
import fastifyHelmet, { FastifyHelmetOptions } from '@fastify/helmet';

import { AppModule } from '@/modules/app';

async function main() {
  const ENV = getEnv();
  const IS_PRODUCTION = ENV === 'production';
  const IS_DEVELOPMENT = ENV === 'development';

  const HOST = process.env?.HOST || '0.0.0.0';
  const PORT = parseInt(process.env.PORT) || 5000;
  const API_VERSION = 1;
  const API_PREFIX = `v${API_VERSION}`;
  const COOKIE_SECRET = process.env.COOKIE_SECRET;
  const CORS_ORIGIN = process.env.CORS_ORIGIN.split(';') || [];

  // create a fastify adapter
  const adapter = new FastifyAdapter({
    trustProxy: true,
    bodyLimit: 2 * 1024 * 1024,
  });

  // create a fastify instance
  const fastify = adapter.getInstance();

  // set fastify plugins
  await fastify.register<FastifyCorsOptions>(fastifyCors as any, {
    origin: CORS_ORIGIN,
    credentials: true,
    methods: 'GET,POST,PATCH,PUT,DELETE',
  } satisfies FastifyCorsOptions);

  await fastify.register<FastifyCookieOptions>(fastifyCookie as any, {
    secret: COOKIE_SECRET,
    parseOptions: {
      httpOnly: true,
      path: '/',
    },
  } satisfies FastifyCookieOptions);

  await fastify.register<FastifyMultipartOptions>(
    fastifyMultipart as any,
    {} satisfies FastifyMultipartOptions,
  );

  await fastify.register<FastifyHelmetOptions>(fastifyHelmet as any);

  // create an app instance
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    adapter,
    { rawBody: true, snapshot: true },
  );

  // set a global prefix (e.g. /v1/*)
  app.setGlobalPrefix(API_PREFIX, {
    exclude: [
      {
        path: '',
        method: RequestMethod.GET,
      },
    ],
  });

  // run the app
  await app.listen(PORT, HOST, () => {
    console.log('api running', { env: ENV });
  });
}

// build the app
main();

// handle exceptions
process.on('uncaughtException', (e) => {
  console.log('uncaughtException', e);
});
