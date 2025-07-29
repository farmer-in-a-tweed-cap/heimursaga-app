import { FastifyCorsOptions, fastifyCors } from '@fastify/cors';
// import { FastifyCsrfOptions, fastifyCsrf } from '@fastify/csrf-protection';
import fastifyHelmet, { FastifyHelmetOptions } from '@fastify/helmet';
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

// build the app
export async function app() {
  try {
    // Temporarily suppress Fastify deprecation warnings until NestJS updates
    const originalEmitWarning = process.emitWarning;
    process.emitWarning = function(warning, name?, code?) {
      if (typeof code === 'string' && code === 'FSTDEP012') {
        // Skip the request.context deprecation warning from NestJS platform-fastify
        return;
      }
      return originalEmitWarning.call(this, warning, name, code);
    };
    const ENV = getEnv();
    const IS_PRODUCTION = ENV === 'production';
    const IS_DEVELOPMENT = ENV === 'development';
    const HOST = process.env?.HOST || '0.0.0.0';
    const PORT = parseInt(process.env.PORT) || 5000;
    const API_VERSION = 1;
    const API_PREFIX = `v${API_VERSION}`;
    const { SESSION_SECRET, SESSION_MAX_AGE = 168, CORS_ORIGIN } = process.env;
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
          maxAge: SESSION_MAX_AGE * 60 * 60,
          secure: IS_PRODUCTION,
          sameSite: IS_PRODUCTION ? 'strict' : 'lax',
          domain: IS_PRODUCTION ? process.env.COOKIE_DOMAIN : undefined,
        },
      },
    );

    await fastify.register<FastifyMultipartOptions>(fastifyMultipart as any, {
      limits: {
        files: 1,
        fileSize: 2 * 1024 * 1024,
      },
    } satisfies FastifyMultipartOptions);

    // CSRF protection - temporarily disabled due to plugin loading issue
    // await fastify.register(fastifyCsrf as any, {
    //   sessionPlugin: '@fastify/secure-session',
    //   cookieOpts: {
    //     signed: false,
    //     secure: IS_PRODUCTION,
    //     httpOnly: false, // Allow frontend to read CSRF token
    //     sameSite: 'strict',
    //   },
    // });

    // security headers
    await fastify.register(fastifyHelmet as any, {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false,
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
    });

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
          path: 'stripe',
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
      // if (IS_DEVELOPMENT) await sleep(500);
      next();
    });

    // CSRF token endpoint - temporarily disabled
    // fastify.get('/csrf-token', async (request, reply) => {
    //   // The CSRF token is automatically set as a cookie by the plugin
    //   return { message: 'CSRF token available in _csrf cookie' };
    // });

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
