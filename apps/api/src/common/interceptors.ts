import {
  BadRequestException,
  CallHandler,
  ExecutionContext,
  HttpException,
  Inject,
  Injectable,
  NestInterceptor,
  Optional,
  PayloadTooLargeException,
  Type,
  mixin,
} from '@nestjs/common';
import FastifyMulter from 'fastify-multer';
import { Multer, Options } from 'multer';
import { Observable, catchError } from 'rxjs';

import { ServiceException } from './exceptions';

@Injectable()
export class ServiceExceptionInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      catchError((error) => {
        if (error instanceof ServiceException) {
          const { message, status } = error;

          throw new HttpException(message, status);
        } else {
          console.log('service error:', error);

          throw error;
        }
      }),
    );
  }
}

type MulterInstance = any;

export function FileInterceptor(
  fieldName: string,
  localOptions?: Options,
): Type<NestInterceptor> {
  class MixinInterceptor implements NestInterceptor {
    protected multer: MulterInstance;
    constructor(
      @Optional()
      @Inject({})
      options: Multer,
    ) {
      this.multer = (FastifyMulter as any)({ ...options, ...localOptions });
    }

    async intercept(
      context: ExecutionContext,
      next: CallHandler,
    ): Promise<Observable<any>> {
      const ctx = context.switchToHttp();

      await new Promise<void>((resolve, reject) =>
        this.multer.single(fieldName)(
          ctx.getRequest(),
          ctx.getResponse(),
          (err: any) => {
            if (err) {
              const error = transformException(err);
              return reject(error);
            }
            resolve();
          },
        ),
      );

      return next.handle();
    }
  }
  const Interceptor = mixin(MixinInterceptor);
  return Interceptor as Type<NestInterceptor>;
}

export function transformException(error: Error | undefined) {
  if (!error || error instanceof HttpException) {
    return error;
  }
  switch (error.message) {
    case multerExceptions.LIMIT_FILE_SIZE:
      return new PayloadTooLargeException(error.message);
    case multerExceptions.LIMIT_FILE_COUNT:
    case multerExceptions.LIMIT_FIELD_KEY:
    case multerExceptions.LIMIT_FIELD_VALUE:
    case multerExceptions.LIMIT_FIELD_COUNT:
    case multerExceptions.LIMIT_UNEXPECTED_FILE:
    case multerExceptions.LIMIT_PART_COUNT:
      return new BadRequestException(error.message);
  }
  return error;
}

export const multerExceptions = {
  LIMIT_PART_COUNT: 'Too many parts',
  LIMIT_FILE_SIZE: 'File too large',
  LIMIT_FILE_COUNT: 'Too many files',
  LIMIT_FIELD_KEY: 'Field name too long',
  LIMIT_FIELD_VALUE: 'Field value too long',
  LIMIT_FIELD_COUNT: 'Too many fields',
  LIMIT_UNEXPECTED_FILE: 'Unexpected field',
};
