'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useDevSession } from '../../../lib/dev-session';
import { apiGet, apiPost, ApiError } from '../../../lib/api-client';
import type { Order } from '../../../lib/types';

type ReviewChoice = 'accept' | 'reject';

export function OrderDetailClient({ orderId }: { orderId: string }) {
  const { session } = useDevSession();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [choices, setChoices] = useState<Record<string, ReviewChoice>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});

  function load() {
    if (!session.userId) return;
    setLoading(true);
    setError(null);
    apiGet<Order>(`/rest/orders/${orderId}`, session)
      .then(({ data }) => {
        setOrder(data);
        setChoices(Object.fromEntries(data.items.map((item) => [item.id, 'accept' as ReviewChoice])));
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load order'))
      .finally(() => setLoading(false));
  }

  useEffect(load, [orderId, session.userId, session.role, session.unitId]);

  async function submitReview() {
    if (!order) return;
    setActionError(null);
    setSubmitting(true);
    const acceptedItemIds = order.items.filter((item) => choices[item.id] === 'accept').map((item) => item.id);
    const rejectedItems = order.items
      .filter((item) => choices[item.id] === 'reject')
      .map((item) => ({ id: item.id, reason: reasons[item.id] ?? '' }));

    try {
      const { data } = await apiPost<Order>(`/rest/orders/${order.id}/review`, session, {
        acceptedItemIds,
        rejectedItems,
        expectedUpdatedAt: order.updatedAt,
      });
      setOrder(data);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Review failed');
      load();
    } finally {
      setSubmitting(false);
    }
  }

  async function runAction(action: 'ready' | 'complete') {
    if (!order) return;
    setActionError(null);
    setSubmitting(true);
    try {
      const { data } = await apiPost<Order>(`/rest/orders/${order.id}/${action}`, session, {
        expectedUpdatedAt: order.updatedAt,
      });
      setOrder(data);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : `${action} failed`);
      load();
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <p className="text-zinc-500">Loading order…</p>;
  if (error) return <p className="text-red-600">Error: {error}</p>;
  if (!order) return <p className="text-zinc-500">Order not found.</p>;

  const canReview = order.status === 'RECEIVED';
  const canReady = order.status === 'ACCEPTED' || order.status === 'PARTIALLY_ACCEPTED';
  const canComplete = order.status === 'READY';
  const hasRejectedWithoutReason = order.items.some(
    (item) => choices[item.id] === 'reject' && !reasons[item.id]?.trim(),
  );

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/queue" className="text-sm text-blue-600 hover:underline">
        ← Back to queue
      </Link>

      <h1 className="mt-2 mb-1 text-xl font-semibold">
        {order.consultationId} — {order.patientName ?? 'Unknown patient'}
      </h1>
      <p className="mb-4 text-sm text-zinc-500">
        Unit {order.unitId} · Status <span className="font-medium">{order.status}</span>
      </p>

      {actionError && <p className="mb-4 text-red-600">Error: {actionError}</p>}

      <ul className="mb-6 divide-y divide-zinc-200 rounded border border-zinc-200 bg-white">
        {order.items.map((item) => (
          <li key={item.id} className="flex flex-col gap-2 p-3">
            <div className="flex items-center justify-between">
              <span>
                {item.name} × {item.qty}
              </span>
              <span className="text-sm text-zinc-500">{item.status}</span>
            </div>

            {canReview && (
              <div className="flex items-center gap-4 text-sm">
                <label className="flex items-center gap-1">
                  <input
                    type="radio"
                    name={`choice-${item.id}`}
                    checked={choices[item.id] === 'accept'}
                    onChange={() => setChoices((c) => ({ ...c, [item.id]: 'accept' }))}
                  />
                  Accept
                </label>
                <label className="flex items-center gap-1">
                  <input
                    type="radio"
                    name={`choice-${item.id}`}
                    checked={choices[item.id] === 'reject'}
                    onChange={() => setChoices((c) => ({ ...c, [item.id]: 'reject' }))}
                  />
                  Reject
                </label>
                {choices[item.id] === 'reject' && (
                  <input
                    className="flex-1 rounded border border-zinc-300 px-2 py-1"
                    placeholder="Reason"
                    value={reasons[item.id] ?? ''}
                    onChange={(e) => setReasons((r) => ({ ...r, [item.id]: e.target.value }))}
                  />
                )}
              </div>
            )}

            {!canReview && item.status === 'REJECTED' && item.rejectReason && (
              <p className="text-sm text-zinc-500">Reason: {item.rejectReason}</p>
            )}
          </li>
        ))}
      </ul>

      <div className="flex gap-3">
        {canReview && (
          <button
            className="rounded bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50"
            disabled={submitting || hasRejectedWithoutReason}
            onClick={submitReview}
          >
            Submit review
          </button>
        )}
        {canReady && (
          <button
            className="rounded bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50"
            disabled={submitting}
            onClick={() => runAction('ready')}
          >
            Mark ready
          </button>
        )}
        {canComplete && (
          <button
            className="rounded bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50"
            disabled={submitting}
            onClick={() => runAction('complete')}
          >
            Complete
          </button>
        )}
      </div>
    </div>
  );
}
