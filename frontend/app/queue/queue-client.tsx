'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useDevSession } from '../../lib/dev-session';
import { apiGet, ApiError } from '../../lib/api-client';
import { ORDER_STATUSES, type Order } from '../../lib/types';

const LIMIT = 10;

export function QueueClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session } = useDevSession();

  const status = searchParams.get('status') ?? '';
  const unitId = searchParams.get('unitId') ?? '';
  const page = Number(searchParams.get('page') ?? '1');

  const [orders, setOrders] = useState<Order[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

    const query = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
    if (status) query.set('status', status);
    if (unitId) query.set('unitId', unitId);

    apiGet<Order[]>(`/rest/orders?${query.toString()}`, session)
      .then(({ data, count }) => {
        setOrders(data);
        setCount(count ?? 0);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load orders'))
      .finally(() => setLoading(false));
  }, [session.userId, session.role, session.unitId, status, unitId, page]);

  const totalPages = Math.max(1, Math.ceil(count / LIMIT));

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-4 text-xl font-semibold">Order Queue</h1>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          Status
          <select
            className="rounded border border-zinc-300 bg-white px-2 py-1"
            value={status}
            onChange={(e) => updateParams({ status: e.target.value || null, page: '1' })}
          >
            <option value="">All ({count})</option>
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        {session.role === 'OWNER' && (
          <label className="flex items-center gap-2 text-sm">
            Unit
            <input
              className="rounded border border-zinc-300 bg-white px-2 py-1"
              placeholder="e.g. u1"
              defaultValue={unitId}
              onBlur={(e) => updateParams({ unitId: e.target.value || null, page: '1' })}
            />
          </label>
        )}
      </div>

      {loading && <p className="text-zinc-500">Loading orders…</p>}
      {error && <p className="text-red-600">Error: {error}</p>}
      {!loading && !error && orders.length === 0 && <p className="text-zinc-500">No orders match this filter.</p>}

      {!loading && !error && orders.length > 0 && (
        <table className="w-full border-collapse overflow-hidden rounded border border-zinc-200 bg-white text-sm">
          <thead className="bg-zinc-100 text-left">
            <tr>
              <th className="px-3 py-2">Consultation</th>
              <th className="px-3 py-2">Patient</th>
              <th className="px-3 py-2">Unit</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Updated</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-t border-zinc-200 hover:bg-zinc-50">
                <td className="px-3 py-2">
                  <Link className="text-blue-600 hover:underline" href={`/orders/${order.id}`}>
                    {order.consultationId}
                  </Link>
                </td>
                <td className="px-3 py-2">{order.patientName ?? '—'}</td>
                <td className="px-3 py-2">{order.unitId}</td>
                <td className="px-3 py-2">{order.status}</td>
                <td className="px-3 py-2 text-zinc-500">{new Date(order.updatedAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {!loading && !error && count > LIMIT && (
        <div className="mt-4 flex items-center gap-3 text-sm">
          <button
            className="rounded border border-zinc-300 px-3 py-1 disabled:opacity-40"
            disabled={page <= 1}
            onClick={() => updateParams({ page: String(page - 1) })}
          >
            Previous
          </button>
          <span>
            Page {page} of {totalPages}
          </span>
          <button
            className="rounded border border-zinc-300 px-3 py-1 disabled:opacity-40"
            disabled={page >= totalPages}
            onClick={() => updateParams({ page: String(page + 1) })}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
