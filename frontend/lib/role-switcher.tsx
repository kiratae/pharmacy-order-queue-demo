'use client';

import { useDevSession, PRESETS } from './dev-session';

export function RoleSwitcher() {
  const { session, setSession } = useDevSession();
  const currentLabel =
    Object.entries(PRESETS).find(([, v]) => v.userId === session.userId)?.[0] ?? 'OWNER';

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-zinc-500">Viewing as</span>
      <select
        className="rounded border border-zinc-300 bg-white px-2 py-1"
        value={currentLabel}
        onChange={(e) => setSession(PRESETS[e.target.value])}
      >
        {Object.keys(PRESETS).map((label) => (
          <option key={label} value={label}>
            {label}
          </option>
        ))}
      </select>
    </div>
  );
}
