import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { FastifyReply } from 'fastify';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();

    const statusCode =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const message = exception.message;

    // validate
    const exceptionResponse: any = exception.getResponse();

    const validation: string[] = exceptionResponse?.message;
    const isValidation = typeof validation === 'object' && !!validation?.length;

    const error = exceptionResponse?.error || HttpStatus[statusCode] || 'Error';

    const body = {
      statusCode,
      message,
      error,
      validation: isValidation ? validation : undefined,
    };

    response.status(statusCode).send(body);
  }
}
