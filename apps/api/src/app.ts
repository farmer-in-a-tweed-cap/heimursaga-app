import fastifyCors, { FastifyCorsOptions } from '@fastify/cors';
import fastifyCsrf from '@fastify/csrf-protection';
import fastifyHelmet, { FastifyHelmetOptions } from '@fastify/helmet';
import fastifyMultipart, { FastifyMultipartOptions } from '@fastify/multipart';
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
import { execSync } from 'child_process';

import { getEnv, sleep } from '@/lib/utils';

import { HttpExceptionFilter } from '@/common/exception-filters';
import { SentryExceptionFilter } from '@/common/filters/sentry-exception.filter';
import { ServiceExceptionInterceptor } from '@/common/interceptors';
import { AppModule } from '@/modules/app';
import { Logger } from '@/modules/logger';

import { IRequest, IResponse } from './common/interfaces';

// Store app reference for graceful shutdown
let appInstance: NestFastifyApplication | null = null;

export function getAppInstance(): NestFastifyApplication | null {
  return appInstance;
}

// build the app
export async function app() {
  try {
    // Temporarily suppress Fastify deprecation warnings until NestJS updates
    const originalEmitWarning = process.emitWarning;
    process.emitWarning = function (warning, name?, code?) {
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
    const { SESSION_SECRET, SESSION_MAX_AGE = 720, CORS_ORIGIN } = process.env;
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
      origin: CORS_ORIGIN?.split(';') || (IS_DEVELOPMENT ? true : []),
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

    // CSRF protection
    await fastify.register(fastifyCsrf as any, {
      sessionPlugin: '@fastify/secure-session',
      cookieOpts: {
        signed: false,
        secure: IS_PRODUCTION,
        httpOnly: false, // Allow frontend to read CSRF token
        sameSite: 'strict',
      },
    });

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
        {
          path: 'sitemap.xml',
          method: RequestMethod.GET,
        },
      ],
    });

    // set global filters, interceptors and pipes
    app.useGlobalFilters(
      new SentryExceptionFilter(),
      new HttpExceptionFilter(),
    );
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

    // CSRF token endpoint — frontend fetches this once to get a token for mutations
    fastify.get('/csrf-token', async (request, reply) => {
      const token = (reply as any).generateCsrf();
      return { csrfToken: token };
    });

    // CSRF validation hook — validates token on state-changing requests
    fastify.addHook('onRequest', async (request, reply) => {
      // Only validate non-safe methods (POST, PUT, PATCH, DELETE)
      if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return;

      // Skip CSRF for JWT-authenticated mobile requests (they don't use cookies)
      if (request.headers.authorization?.startsWith('Bearer ')) return;

      // Skip CSRF for Stripe webhooks (they use signature verification)
      if (request.url.startsWith('/stripe')) return;

      // Skip CSRF for auth endpoints — no authenticated session to protect.
      // Login/signup establish sessions, password reset uses tokens.
      const authPaths = [
        '/v1/auth/login',
        '/v1/auth/signup',
        '/v1/auth/reset-password',
        '/v1/auth/change-password',
        '/v1/auth/verify-email',
      ];
      if (authPaths.some((p) => request.url.startsWith(p))) return;

      // Skip CSRF if no session secret exists (e.g. after logout destroys session).
      // The csrf plugin calls reply.send(error) instead of throwing, so we must
      // check before calling it to avoid an unhandled Fastify error response.
      if (!(request as any).session?.get('_csrf')) {
        return reply
          .status(403)
          .send({ statusCode: 403, message: 'Invalid CSRF token' });
      }

      // Validate CSRF token from x-csrf-token header
      await new Promise<void>((resolve, reject) => {
        (fastify as any).csrfProtection(request, reply, (err: Error) => {
          if (err) reject(err);
          else resolve();
        });
      }).catch(() => {
        return reply
          .status(403)
          .send({ statusCode: 403, message: 'Invalid CSRF token' });
      });
    });

    // swagger
    const config = new DocumentBuilder()
      .setTitle('saga api')
      .setVersion(`${API_VERSION}`)
      .build();
    SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, config));

    // Enable graceful shutdown hooks (releases port on SIGTERM/SIGINT)
    app.enableShutdownHooks();

    // Store reference for signal handlers
    appInstance = app;

    // In dev mode, kill any stale process on the port before listening
    if (IS_DEVELOPMENT) {
      try {
        const pids = execSync(`lsof -ti:${PORT}`, { encoding: 'utf-8' }).trim();
        if (pids) {
          console.log(
            `Killing stale process(es) on port ${PORT}: ${pids.replace(/\n/g, ', ')}`,
          );
          execSync(`kill -9 ${pids.replace(/\n/g, ' ')}`);
          await sleep(500);
        }
      } catch {
        // No process on the port — good
      }
    }

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
