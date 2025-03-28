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

import { getEnv, sleep } from '@/lib/utils';

import { HttpExceptionFilter } from '@/common/exception-filters';
import { ServiceExceptionInterceptor } from '@/common/interceptors';
import { AppModule } from '@/modules/app';
import { Logger } from '@/modules/logger';

import { IRequest, IResponse } from './common/interfaces';
import { generator } from './lib/generator';

// build the app
export async function app() {
  try {
    const ENV = getEnv();
    const IS_PRODUCTION = ENV === 'production';
    const IS_DEVELOPMENT = ENV === 'development';
    const HOST = process.env?.HOST || '0.0.0.0';
    const PORT = parseInt(process.env.PORT) || 5000;
    const API_VERSION = 1;
    const API_PREFIX = `v${API_VERSION}`;
    const SESSION_SECRET = process.env.SESSION_SECRET;
    const CORS_ORIGIN = process.env.CORS_ORIGIN;
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
      origin: CORS_ORIGIN?.split(';') || [],
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
    } satisfies FastifyCorsOptions);

    await fastify.register<FastifySecureSessionOptions>(
      fastifySecureSession as any,
      {
        key: Buffer.from(SESSION_SECRET, 'hex'),
        sessionName: 'session',
        cookieName: 'sid',
        cookie: {
          httpOnly: true,
          path: '/',
          maxAge: 60 * 60 * 24,
          secure: IS_PRODUCTION,
        },
      },
    );

    await fastify.register<FastifyMultipartOptions>(fastifyMultipart as any, {
      limits: {
        files: 1,
        fileSize: 2 * 1024 * 1024,
      },
    } satisfies FastifyMultipartOptions);

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
        {
          path: 'webhook/stripe',
          method: RequestMethod.POST,
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

    app.use(async (req: IRequest, res: IResponse, next: () => void) => {
      if (IS_DEVELOPMENT) await sleep(500);
      next();
    });

    // swagger
    const config = new DocumentBuilder()
      .setTitle('saga api')
      .setVersion(`${API_VERSION}`)
      .build();
    SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, config));

    // run the app
    await app
      .listen(PORT, HOST, () => {
        console.log('api running', {
          env: ENV,
        });
      })
      .catch((e) => {
        console.log('api failed', e);
      });
  } catch (e) {
    console.log('api error', e);
  }
}
