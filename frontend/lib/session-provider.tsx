'use client';

import { useEffect, useState } from 'react';
import { DevSessionContext, DEFAULT_SESSION, loadSession, saveSession, type DevSession } from './dev-session';

export function DevSessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSessionState] = useState<DevSession>(DEFAULT_SESSION);

  useEffect(() => {
    setSessionState(loadSession());
  }, []);

  function setSession(next: DevSession) {
    setSessionState(next);
    saveSession(next);
  }

  return <DevSessionContext value={{ session, setSession }}>{children}</DevSessionContext>;
}
