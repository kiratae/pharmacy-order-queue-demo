# Pharmacy Order Queue

A pharmacy receives prescriptions from a consultation, a pharmacist reviews each drug line (accept/reject), and the order is prepared and completed. Backend is a NestJS + Prisma + Postgres service; frontend is a Next.js (App Router) app calling it over HTTP. Full spec in `CLAUDE.md`.

## Running it

### Backend

```bash
cd backend
npm install
cp .env.example .env        # set DATABASE_URL to your Postgres/Supabase connection string
npx prisma migrate dev --name init
npm run seed
npm run start:dev            # listens on :3001
```

### Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev                  # listens on :3000
```

## Environment variables

### Backend (`backend/.env`, copied from `backend/.env.example`)

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | Postgres connection string Prisma uses for both migrations and the running app. |
| `PORT` | No (defaults to `3001`) | Port the NestJS API listens on. |

### Frontend (`frontend/.env.local`, copied from `frontend/.env.local.example`)

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | No (defaults to `http://localhost:3001`) | Base URL the browser calls for all `/rest/*` requests. Prefixed `NEXT_PUBLIC_` so Next.js inlines it into client bundles — only needed if the API isn't on `localhost:3001` (e.g. a deployed backend). |

### Tests

```bash
cd backend
npm run test        # unit: full status-machine matrix, 403/409/422 cases, stale-lock 409
npm run test:e2e     # e2e: idempotent create, cross-unit 403, list scoping, 422, 409, meta.count accuracy
```

## Headers per role

The frontend has a "Viewing as" switcher in the header that sends these for you; for manual `curl` testing:

**OWNER** — sees every unit
```
x-user-id: owner-1
x-role: OWNER
```

**PHARMACIST** — scoped to their own unit
```
x-user-id: pharm-1
x-role: PHARMACIST
x-unit-id: u1
```

## Design decisions

- **Optimistic locking** uses an `expectedUpdatedAt` field on the review/ready/complete request bodies rather than an `If-Unmodified-Since` header or a separate `version` column — Prisma's built-in `@updatedAt` timestamp already carries that signal, so no schema field is duplicated, and a body field avoids HTTP-date parsing edge cases.
- **Idempotency** is enforced by a `IdempotencyKey` table with the key as primary key, written in the same transaction as the order. A concurrent duplicate request that loses the unique-constraint race just re-reads and replays the winner's stored order instead of erroring.
- **State transitions run under a `SELECT … FOR UPDATE` row lock** (`withLockedOrder` in `orders.service.ts`). Checking the current status with a value read *outside* the transaction is racy: two concurrent reviews both read `RECEIVED`, both pass the guard, and both write. The lock is taken first and the status is re-read inside the transaction, so a racing request blocks, sees the committed status, and gets its 409. This is separate from `expectedUpdatedAt`, which catches "the order changed since the page was loaded"; the lock is what makes the guard itself atomic.
- **Role/unit scoping** lives in one place, `backend/src/orders/order-scope.util.ts` — `buildScopeWhere` feeds the Prisma `WHERE` clause for the list endpoint, `assertUnitAccess` guards the single-resource endpoints. Nothing else touches scoping logic.
- **Order status is always recomputed server-side** from the resulting item states after a review — the client never gets to assert a status directly.
- **Queue counts** come from two places: `meta.count` on the list endpoint reflects whatever `status`/`unitId` filter is active, and a dedicated `GET /rest/orders/summary` (Prisma `groupBy` on `status`, scoped through the same `buildScopeWhere`) powers the per-status count cards — one extra query instead of fetching every order client-side to tally them.
