# CLAUDE.md

This file guides Claude Code when working in this repository: a fullstack take-home implementing a **Pharmacy Order Queue**.

## Project Summary

A pharmacy receives prescriptions from a consultation. A pharmacist reviews each drug line (accept/reject), then the order is prepared and completed. This is a senior-level assessment — correctness on state machine, query scoping, and idempotency matters more than UI polish.

## Stack (required)

| Layer | Use | Do NOT use |
|---|---|---|
| Frontend | Next.js (App Router) + TypeScript + Tailwind | Ant Design |
| Backend | NestJS + Prisma + Postgres | Bun / Elysia |
| Auth | Headers `x-user-id` + `x-role` (+ `x-unit-id` for pharmacists) | Real login / JWT |

**Fullstack requirement**: a Next.js-only app with API routes and no separate backend service does NOT count as fullstack. The backend must be a real, separate NestJS service.

## Architecture

- Two separate services: NestJS API (backend) and Next.js app (frontend), calling the API over HTTP.
- All API routes live under `/rest`.
- JSON fields are `camelCase`. Timestamps are ISO 8601. IDs are opaque strings.
- Use SQLite only for the optional 90-min live variant — otherwise Postgres via Prisma.

## API Response Envelopes

Success:
```json
{ "data": {}, "meta": { "requestId": "..." } }
```

Error:
```json
{ "error": { "code": "...", "message": "..." }, "meta": { "requestId": "..." } }
```

- List endpoints also return `meta.count`.
- Honor `x-request-id` when the client sends it; otherwise generate one and echo it back.

## Roles & Scope

| Role | Scope |
|---|---|
| OWNER | Sees every `unitId` |
| PHARMACIST | Sees only their own unit (`x-unit-id`) |

Role/unit scoping MUST happen in the database query (WHERE clause), never as a post-fetch filter in application code or in the UI.

## Order Status Machine

```
RECEIVED → PARTIALLY_ACCEPTED | ACCEPTED | REJECTED
ACCEPTED / PARTIALLY_ACCEPTED → READY → COMPLETED
REJECTED = terminal
```

- Accept/reject is per line item, not the whole order.
- Mixed review outcome → `PARTIALLY_ACCEPTED`. All accepted → `ACCEPTED`. All rejected → `REJECTED`.

## Endpoints

| Method | Path | Behavior |
|---|---|---|
| POST | `/rest/orders` | Inbound create (as if consult sent it). Idempotent via `Idempotency-Key` |
| GET | `/rest/orders` | Server-side list: `status`, `unitId`, `page`, `limit`, `sort=updatedAt` |
| GET | `/rest/orders/:id` | Detail + items |
| POST | `/rest/orders/:id/review` | `{ acceptedItemIds, rejectedItems: [{ id, reason }] }` |
| POST | `/rest/orders/:id/ready` | Dispensing finished |
| POST | `/rest/orders/:id/complete` | Patient received the meds |

Example `POST /rest/orders` body:
```json
{
  "consultationId": "CS-1",
  "unitId": "u1",
  "patientName": "Somchai",
  "items": [
    { "name": "Paracetamol 500mg", "qty": 20 },
    { "name": "Amoxicillin 500mg", "qty": 14 }
  ]
}
```

Example review body:
```json
{
  "acceptedItemIds": ["item_1"],
  "rejectedItems": [{ "id": "item_2", "reason": "Out of stock" }]
}
```

## Hard Rules (wrong if missing — do not skip these)

- PHARMACIST accessing another unit → **403**
- Reviewing an item twice, or an illegal status transition → **409**
- Reject without a reason → **422**
- Same `Idempotency-Key` on `POST /rest/orders` → same response returned, no duplicate row created
- List pagination/filter/sort happen in the database query, never via in-memory filtering after `findMany()` of the whole table

Suggested status codes: 200 success, 403 forbidden, 404 missing, 409 conflict, 422 validation.

## Frontend (2 pages)

- **Queue** — table view, status filter, server-side pagination, counts per status.
- **Detail** — line items, accept/reject controls, reject reason input, `Ready`/`Complete` buttons that are only enabled/shown when the current order status allows that transition.
- Empty, loading, and error states are required on both pages.
- Filter changes must trigger a real refetch against the API — never fetch everything once and filter client-side in React.

## Seed Data

At least 8 orders across 2 units, with mixed statuses. Verify manually that a pharmacist scoped to unit A cannot see unit B's orders.

## Out of Scope

Docker, real auth, realtime, file upload, pixel-perfect UI, 100% test coverage.

**Nice-to-have (optional, not required)**: optimistic lock on `updatedAt`, tests for the state machine, Zod (or equivalent) validation at the API boundary.

## Local Dev Headers

OWNER:
```
x-user-id: owner-1
x-role: OWNER
```

PHARMACIST:
```
x-user-id: pharm-1
x-role: PHARMACIST
x-unit-id: u1
```

## Smoke Checks (run these before considering anything done)

```bash
# 1. Create twice with the same key — same id both times
curl -s -X POST localhost:3001/rest/orders \
  -H 'Idempotency-Key: abc' \
  -H 'content-type: application/json' \
  -H 'x-request-id: req_1' \
  -d '{"consultationId":"CS-1","unitId":"u1","items":[{"name":"Paracetamol","qty":10}]}'

# 2. Pharmacist of another unit — must be 403
curl -s localhost:3001/rest/orders \
  -H 'x-role: PHARMACIST' \
  -H 'x-unit-id: u2' \
  -H 'x-user-id: p1'

# 3. Reject with no reason — must be 422
# 4. Ready while still RECEIVED — must be 409
# 5. GET /rest/orders?status=RECEIVED&page=1&limit=5 — meta.count must be correct
```

## README Requirements

The final README must include: how to run the project, which headers to send for each role, and ~5 lines on the key design decisions made.

## Fail-Fast Checklist (self-review before submitting)

Immediately wrong if any of these are true:
- [ ] List is filtered in memory instead of in the DB query
- [ ] No 409 on illegal transitions or double review
- [ ] Role/unit scope is checked only in the UI, not the query
- [ ] A duplicate POST (same Idempotency-Key) creates a new order
- [ ] Every action button is always clickable regardless of order status

## Notes for Claude Code

- Prioritize correctness on the state machine, role scoping, and idempotency (65% of scoring) over frontend polish (20%) and code quality (15%).
- When implementing the review endpoint, always compute the new order status server-side from the resulting item states — never trust a client-supplied order status.
- Keep unit/role scoping logic in one shared place (e.g., a query helper or guard) rather than repeating WHERE-clause logic across endpoints.
- Be ready to explain trade-offs and the state machine diagram in the 45-minute walkthrough — this is not primarily a demo of the UI.
