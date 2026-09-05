'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useDevSession } from '../../../lib/dev-session';
import { apiGet, apiPost, ApiError } from '../../../lib/api-client';
import {
  STATUS_COLORS,
  STATUS_DOT_COLORS,
  ITEM_STATUS_COLORS,
  ITEM_STATUS_DOT_COLORS,
  type Order,
} from '../../../lib/types';

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

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-center rounded-xl border border-zinc-200 bg-white py-16 text-sm text-zinc-500 shadow-sm">
          Loading order…
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
          Error: {error}
        </div>
      </div>
    );
  }
  if (!order) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-white py-16 text-sm text-zinc-500">
          Order not found.
        </div>
      </div>
    );
  }

  const canReview = order.status === 'RECEIVED';
  const canReady = order.status === 'ACCEPTED' || order.status === 'PARTIALLY_ACCEPTED';
  const canComplete = order.status === 'READY';
  const hasRejectedWithoutReason = order.items.some(
    (item) => choices[item.id] === 'reject' && !reasons[item.id]?.trim(),
  );

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/queue" className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline">
        ← Back to queue
      </Link>

      <div className="mt-3 mb-5 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <h1 className="text-xl font-semibold tracking-tight text-zinc-900">
          {order.consultationId} — {order.patientName ?? 'Unknown patient'}
        </h1>
        <p className="mt-2 flex items-center gap-2 text-sm text-zinc-500">
          <span className="font-medium text-zinc-600">Unit:</span> {order.unitName}
          <span className="ml-3 font-medium text-zinc-600">Status:</span>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[order.status]}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT_COLORS[order.status]}`} />
            {order.status}
          </span>
        </p>
      </div>

      {actionError && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
          Error: {actionError}
        </div>
      )}

      <div className="mb-6 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <ul className="divide-y divide-zinc-100">
          {order.items.map((item) => (
            <li key={item.id} className="flex flex-col gap-2 p-4">
              <div className="flex items-center justify-between">
                <span className="font-medium text-zinc-800">
                  {item.name} × {item.qty}
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${ITEM_STATUS_COLORS[item.status]}`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${ITEM_STATUS_DOT_COLORS[item.status]}`} />
                  {item.status}
                </span>
              </div>

              {canReview && (
                <div className="flex items-center gap-4 text-sm">
                  <label className="flex items-center gap-1.5 text-zinc-700">
                    <input
                      type="radio"
                      name={`choice-${item.id}`}
                      checked={choices[item.id] === 'accept'}
                      onChange={() => setChoices((c) => ({ ...c, [item.id]: 'accept' }))}
                    />
                    Accept
                  </label>
                  <label className="flex items-center gap-1.5 text-zinc-700">
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
                      className="flex-1 rounded-lg border border-zinc-300 px-2 py-1 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
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
      </div>

      <div className="flex gap-3">
        {canReview && (
          <button
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:pointer-events-none disabled:opacity-50"
            disabled={submitting || hasRejectedWithoutReason}
            onClick={submitReview}
          >
            Submit review
          </button>
        )}
        {canReady && (
          <button
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:pointer-events-none disabled:opacity-50"
            disabled={submitting}
            onClick={() => runAction('ready')}
          >
            Mark ready
          </button>
        )}
        {canComplete && (
          <button
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:pointer-events-none disabled:opacity-50"
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
