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
- **Role/unit scoping** lives in one place, `backend/src/orders/order-scope.util.ts` — `buildScopeWhere` feeds the Prisma `WHERE` clause for the list endpoint, `assertUnitAccess` guards the single-resource endpoints. Nothing else touches scoping logic.
- **Order status is always recomputed server-side** from the resulting item states after a review — the client never gets to assert a status directly.
- **Queue counts are scoped to the current filter** (`meta.count` for whatever `status`/`unitId` is selected) rather than fetching a full per-status tally bar, which would mean either N extra requests or a fetch-all anti-pattern.
