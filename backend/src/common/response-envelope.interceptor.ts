import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import type { Request } from 'express';
import { map, Observable } from 'rxjs';

/**
 * List-returning service methods return `{ data, count }` so this interceptor
 * can lift `count` into `meta` while every other response is wrapped as-is.
 */
@Injectable()
export class ResponseEnvelopeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request & { requestId: string }>();

    return next.handle().pipe(
      map((payload: unknown) => {
        const meta: Record<string, unknown> = { requestId: request.requestId };

        if (payload && typeof payload === 'object' && 'data' in payload && 'count' in payload) {
          const { data, count } = payload as { data: unknown; count: number };
          meta.count = count;
          return { data, meta };
        }

        return { data: payload, meta };
      }),
    );
  }
}
