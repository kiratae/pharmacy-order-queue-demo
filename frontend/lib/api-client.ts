import type { DevSession } from './dev-session';
import { sessionHeaders } from './dev-session';

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

interface Envelope<T> {
  data?: T;
  error?: { code: string; message: string };
  meta: { requestId: string; count?: number };
}

async function apiFetch<T>(
  path: string,
  session: DevSession,
  init?: RequestInit,
): Promise<{ data: T; count?: number }> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...sessionHeaders(session),
      ...init?.headers,
    },
  });

  const body: Envelope<T> = await res.json();

  if (!res.ok || body.error) {
    throw new ApiError(res.status, body.error?.code ?? 'UNKNOWN', body.error?.message ?? 'Request failed');
  }

  return { data: body.data as T, count: body.meta.count };
}

export function apiGet<T>(path: string, session: DevSession) {
  return apiFetch<T>(path, session);
}

export function apiPost<T>(path: string, session: DevSession, body: unknown) {
  return apiFetch<T>(path, session, { method: 'POST', body: JSON.stringify(body) });
}
