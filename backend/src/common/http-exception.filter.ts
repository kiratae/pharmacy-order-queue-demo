import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import type { Request, Response } from 'express';

const CODE_BY_STATUS: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
  [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
  [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
  [HttpStatus.CONFLICT]: 'CONFLICT',
  [HttpStatus.UNPROCESSABLE_ENTITY]: 'UNPROCESSABLE_ENTITY',
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request & { requestId: string }>();

    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? extractMessage(exception)
        : 'Internal server error';

    const code = CODE_BY_STATUS[status] ?? 'INTERNAL_SERVER_ERROR';

    response.status(status).json({
      error: { code, message },
      meta: { requestId: request.requestId },
    });
  }
}

function extractMessage(exception: HttpException): string {
  const body = exception.getResponse();
  if (typeof body === 'string') return body;
  if (body && typeof body === 'object' && 'message' in body) {
    const m = (body as { message: unknown }).message;
    return Array.isArray(m) ? m.join('; ') : String(m);
  }
  return exception.message;
}
