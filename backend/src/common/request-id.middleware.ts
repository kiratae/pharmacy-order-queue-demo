import { Injectable, NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'node:crypto';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request & { requestId: string }, res: Response, next: NextFunction) {
    const requestId = req.header('x-request-id') || randomUUID();
    req.requestId = requestId;
    res.setHeader('x-request-id', requestId);
    next();
  }
}
