import { FastifyCookieOptions, fastifyCookie } from '@fastify/cookie';
import { FastifyCorsOptions, fastifyCors } from '@fastify/cors';
import { FastifyMultipartOptions, fastifyMultipart } from '@fastify/multipart';
import {
  SecureSessionPluginOptions as FastifySecureSessionOptions,
  fastifySecureSession,
} from '@fastify/secure-session';
import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { getEnv } from '@/lib/utils';

import { HttpExceptionFilter } from '@/common/exception-filters';
import { ServiceExceptionInterceptor } from '@/common/interceptors';
import { AppModule } from '@/modules/app';
import { Logger } from '@/modules/logger';

// build the app
export async function app() {
  try {
    const ENV = getEnv();
    const IS_PRODUCTION = ENV === 'production';
    const HOST = process.env?.HOST || '0.0.0.0';
    const PORT = parseInt(process.env.PORT) || 5000;
    const API_VERSION = 1;
    const API_PREFIX = `v${API_VERSION}`;
    const COOKIE_SECRET = process.env.COOKIE_SECRET;
    const SESSION_SECRET = process.env.SESSION_SECRET;
    const CORS_ORIGIN = process.env.CORS_ORIGIN?.split(';') || [];
    const DISABLE_ERROR_MESSAGES = IS_PRODUCTION;

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

    await fastify.register<FastifySecureSessionOptions>(
      fastifySecureSession as any,
      {
        key: Buffer.from(SESSION_SECRET, 'hex'),
        cookieName: 'sid',
        cookie: {
          httpOnly: true,
          path: '/',
        },
      },
    );

    await fastify.register<FastifyMultipartOptions>(
      fastifyMultipart as any,
      {} satisfies FastifyMultipartOptions,
    );

    // @todo
    // await fastify.register<FastifyHelmetOptions>(fastifyHelmet as any);

    // create an app instance
    const app = await NestFactory.create<NestFastifyApplication>(
      AppModule,
      adapter,
      { logger: new Logger(), rawBody: true, snapshot: true },
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

    // set global filters, interceptors and pipes
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(new ServiceExceptionInterceptor());
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        disableErrorMessages: DISABLE_ERROR_MESSAGES,
      }),
    );

    // swagger
    const config = new DocumentBuilder()
      .setTitle('saga api')
      .setVersion(`${API_VERSION}`)
      .build();
    SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, config));

    // run the app
    await app
      .listen(PORT, HOST, () => {
        console.log('api running', { env: ENV });
      })
      .catch((e) => {
        console.log('api failed', e);
      });
  } catch (e) {
    console.log('api error', e);
  }
}
