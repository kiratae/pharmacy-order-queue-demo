'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useDevSession } from '../../lib/dev-session';
import { apiGet, ApiError } from '../../lib/api-client';
import {
  ORDER_STATUSES,
  STATUS_COLORS,
  STATUS_DOT_COLORS,
  formatDateTime,
  type Order,
  type StatusCounts,
  type Unit,
} from '../../lib/types';

const DEFAULT_LIMIT = 10;
const PAGE_SIZE_OPTIONS = [10, 20, 50];

function buildPageList(current: number, total: number): (number | '...')[] {
  const boundary = 3;
  const shown = new Set<number>();
  for (let i = 1; i <= Math.min(boundary, total); i++) shown.add(i);
  for (let i = Math.max(1, total - boundary + 1); i <= total; i++) shown.add(i);
  for (let i = Math.max(1, current - 1); i <= Math.min(total, current + 1); i++) shown.add(i);

  const sorted = [...shown].sort((a, b) => a - b);
  const result: (number | '...')[] = [];
  let prev = 0;
  for (const n of sorted) {
    if (prev && n - prev === 2) result.push(prev + 1);
    else if (prev && n - prev > 1) result.push('...');
    result.push(n);
    prev = n;
  }
  return result;
}

export function QueueClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session } = useDevSession();

  const status = searchParams.get('status') ?? '';
  const unitId = searchParams.get('unitId') ?? '';
  const page = Number(searchParams.get('page') ?? '1');
  const limit = Number(searchParams.get('limit') ?? String(DEFAULT_LIMIT));

  const [orders, setOrders] = useState<Order[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [statusCounts, setStatusCounts] = useState<StatusCounts | null>(null);

  function updateParams(next: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    router.push(`/queue?${params.toString()}`);
  }

  useEffect(() => {
    if (!session.userId) return;
    setLoading(true);
    setError(null);

    const query = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (status) query.set('status', status);
    if (unitId) query.set('unitId', unitId);

    apiGet<Order[]>(`/rest/orders?${query.toString()}`, session)
      .then(({ data, count }) => {
        setOrders(data);
        setCount(count ?? 0);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load orders'))
      .finally(() => setLoading(false));
  }, [session.userId, session.role, session.unitId, status, unitId, page, limit]);

  useEffect(() => {
    if (!session.userId || session.role !== 'OWNER') return;
    apiGet<Unit[]>('/rest/units', session)
      .then(({ data }) => setUnits(data))
      .catch(() => {});
  }, [session.userId, session.role]);

  useEffect(() => {
    if (!session.userId) return;
    const query = new URLSearchParams();
    if (unitId) query.set('unitId', unitId);
    apiGet<StatusCounts>(`/rest/orders/summary?${query.toString()}`, session)
      .then(({ data }) => setStatusCounts(data))
      .catch(() => {});
  }, [session.userId, session.role, session.unitId, unitId, orders]);

  const totalPages = Math.max(1, Math.ceil(count / limit));
  const rangeStart = count === 0 ? 0 : (page - 1) * limit + 1;
  const rangeEnd = Math.min(page * limit, count);

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-5 text-2xl font-semibold tracking-tight text-zinc-900">Order Queue</h1>

      {statusCounts && (
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
          {ORDER_STATUSES.map((s) => {
            const active = status === s;
            return (
              <button
                key={s}
                onClick={() => updateParams({ status: active ? null : s, page: '1' })}
                className={`relative overflow-hidden rounded-xl border bg-white p-4 text-left shadow-sm transition hover:shadow-md ${
                  active ? 'border-blue-500 ring-2 ring-blue-500/30' : 'border-zinc-200'
                }`}
              >
                <span className={`absolute inset-y-0 left-0 w-1 ${STATUS_DOT_COLORS[s]}`} />
                <div className="text-2xl font-bold text-zinc-900">{statusCounts[s]}</div>
                <div className="mt-1 text-xs font-medium text-zinc-500">{s.replaceAll('_', ' ')}</div>
              </button>
            );
          })}
        </div>
      )}

      <div className="mb-5 flex flex-wrap items-center gap-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        {session.role === 'OWNER' && (
          <label className="flex items-center gap-2 text-sm font-medium text-zinc-600">
            Unit
            <select
              className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-800 shadow-sm focus:border-blue-500 focus:outline-none"
              value={unitId}
              onChange={(e) => updateParams({ unitId: e.target.value || null, page: '1' })}
            >
              <option value="">All units</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="flex items-center gap-2 text-sm font-medium text-zinc-600">
          Status
          <select
            className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-800 shadow-sm focus:border-blue-500 focus:outline-none"
            value={status}
            onChange={(e) => updateParams({ status: e.target.value || null, page: '1' })}
          >
            <option value="">All statuses</option>
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        <span className="ml-auto text-sm text-zinc-400">{count} total</span>
      </div>

      {loading && (
        <div className="flex items-center justify-center rounded-xl border border-zinc-200 bg-white py-16 text-sm text-zinc-500 shadow-sm">
          Loading orders…
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
          Error: {error}
        </div>
      )}
      {!loading && !error && orders.length === 0 && (
        <div className="flex items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-white py-16 text-sm text-zinc-500">
          No orders match this filter.
        </div>
      )}

      {!loading && !error && orders.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-zinc-50 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-3">Consultation</th>
                <th className="px-4 py-3">Patient</th>
                <th className="px-4 py-3">Unit</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Updated</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {orders.map((order) => (
                <tr key={order.id} className="transition hover:bg-zinc-50">
                  <td className="px-4 py-3 font-medium text-zinc-800">{order.consultationId}</td>
                  <td className="px-4 py-3 text-zinc-700">{order.patientName ?? '—'}</td>
                  <td className="px-4 py-3 text-zinc-700">{order.unitName}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[order.status]}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT_COLORS[order.status]}`} />
                      {order.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-500">{formatDateTime(order.updatedAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      className="inline-flex rounded-lg border border-zinc-300 p-1.5 text-zinc-500 transition hover:border-zinc-400 hover:bg-zinc-100 hover:text-zinc-900"
                      href={`/orders/${order.id}`}
                      title={order.status === 'RECEIVED' ? 'Edit' : 'View'}
                      aria-label={order.status === 'RECEIVED' ? 'Edit' : 'View'}
                    >
                      {order.status === 'RECEIVED' ? (
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M11 4h-6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5Z"
                          />
                        </svg>
                      ) : (
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"
                          />
                          <circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !error && count > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-3 text-sm shadow-sm">
          <span className="text-zinc-500">
            Showing <span className="font-medium text-zinc-700">{rangeStart}–{rangeEnd}</span> of{' '}
            <span className="font-medium text-zinc-700">{count}</span>
          </span>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-zinc-600">
              Page size
              <select
                className="rounded-lg border border-zinc-300 bg-white px-2 py-1 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
                value={limit}
                onChange={(e) => updateParams({ limit: e.target.value, page: '1' })}
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>

            <nav className="flex items-center gap-1">
              <button
                className="rounded-lg border border-zinc-300 px-2 py-1 text-zinc-500 transition hover:bg-zinc-100 disabled:pointer-events-none disabled:opacity-40"
                disabled={page <= 1}
                aria-label="Previous page"
                onClick={() => updateParams({ page: String(page - 1) })}
              >
                ‹
              </button>
              {buildPageList(page, totalPages).map((p, i) =>
                p === '...' ? (
                  <span key={`ellipsis-${i}`} className="px-2 py-1 text-zinc-400">
                    …
                  </span>
                ) : (
                  <button
                    key={p}
                    className={`min-w-[2rem] rounded-lg border px-2 py-1 font-medium transition ${
                      p === page
                        ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                        : 'border-zinc-300 text-zinc-600 hover:bg-zinc-100'
                    }`}
                    aria-current={p === page ? 'page' : undefined}
                    onClick={() => updateParams({ page: String(p) })}
                  >
                    {p}
                  </button>
                ),
              )}
              <button
                className="rounded-lg border border-zinc-300 px-2 py-1 text-zinc-500 transition hover:bg-zinc-100 disabled:pointer-events-none disabled:opacity-40"
                disabled={page >= totalPages}
                aria-label="Next page"
                onClick={() => updateParams({ page: String(page + 1) })}
              >
                ›
              </button>
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}
