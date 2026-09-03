import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Marks a route as not requiring x-user-id/x-role headers (e.g. inbound system calls). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
