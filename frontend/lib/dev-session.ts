'use client';

import { createContext, useContext } from 'react';

export interface DevSession {
  userId: string;
  role: 'OWNER' | 'PHARMACIST';
  unitId?: string;
}

export const PRESETS: Record<string, DevSession> = {
  'OWNER': { userId: 'owner-1', role: 'OWNER' },
  'PHARMACIST (u1)': { userId: 'pharm-1', role: 'PHARMACIST', unitId: 'u1' },
  'PHARMACIST (u2)': { userId: 'pharm-2', role: 'PHARMACIST', unitId: 'u2' },
};

export const DEFAULT_SESSION = PRESETS['OWNER'];

const STORAGE_KEY = 'pharmacy-dev-session';

export function loadSession(): DevSession {
  if (typeof window === 'undefined') return DEFAULT_SESSION;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : DEFAULT_SESSION;
  } catch {
    return DEFAULT_SESSION;
  }
}

export function saveSession(session: DevSession) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function sessionHeaders(session: DevSession): Record<string, string> {
  const headers: Record<string, string> = { 'x-user-id': session.userId, 'x-role': session.role };
  if (session.unitId) headers['x-unit-id'] = session.unitId;
  return headers;
}

export const DevSessionContext = createContext<{ session: DevSession; setSession: (s: DevSession) => void }>({
  session: DEFAULT_SESSION,
  setSession: () => {},
});

export function useDevSession() {
  return useContext(DevSessionContext);
}
