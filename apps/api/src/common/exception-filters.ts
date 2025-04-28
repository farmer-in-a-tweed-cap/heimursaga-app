import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const url = request.url;
    const message = exception.message;

    // validate
    const exceptionResponse: any = exception.getResponse();

    const validation: string[] = exceptionResponse?.message;
    const isValidation = typeof validation === 'object' && !!validation?.length;

    const error = {
      status,
      url,
      message,
      validation: isValidation ? validation : undefined,
      // errors: [{ field: 'email', code: 'EMAIL_ALREADY_USED' }],
    };

    // logger.error(error);

    response.status(status).send(error);
  }
}
