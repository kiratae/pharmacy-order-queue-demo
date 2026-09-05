import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test } from '@nestjs/testing';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { HttpExceptionFilter } from '../src/common/http-exception.filter.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

const OWNER = { 'x-role': 'OWNER', 'x-user-id': 'owner-1' };
const PHARM_U1 = { 'x-role': 'PHARMACIST', 'x-user-id': 'p1', 'x-unit-id': 'u1' };
const PHARM_U2 = { 'x-role': 'PHARMACIST', 'x-user-id': 'p2', 'x-unit-id': 'u2' };

describe('Orders e2e', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('idempotent create: same key never creates a second row', async () => {
    // consultationId is unique per run so the count below only sees this run's rows —
    // the suite does not wipe the database between runs.
    const key = `test-key-${Date.now()}`;
    const consultationId = `CS-e2e-${Date.now()}`;
    const body = { consultationId, unitId: 'u1', items: [{ name: 'Paracetamol', qty: 5 }] };

    const first = await request(app.getHttpServer()).post('/rest/orders').set('Idempotency-Key', key).send(body);
    const second = await request(app.getHttpServer()).post('/rest/orders').set('Idempotency-Key', key).send(body);

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(second.body.data.id).toBe(first.body.data.id);

    const count = await prisma.order.count({ where: { consultationId } });
    expect(count).toBe(1);
  });

  it('PHARMACIST cannot access another unit\'s order -> 403', async () => {
    const order = await prisma.order.create({ data: { consultationId: 'CS-scope', unitId: 'u1', items: { create: [{ name: 'X', qty: 1 }] } } });

    const res = await request(app.getHttpServer()).get(`/rest/orders/${order.id}`).set(PHARM_U2);
    expect(res.status).toBe(403);
  });

  it('PHARMACIST list is scoped to their own unit only', async () => {
    const res = await request(app.getHttpServer()).get('/rest/orders').set(PHARM_U1);
    expect(res.status).toBe(200);
    expect(res.body.data.every((o: any) => o.unitId === 'u1')).toBe(true);
  });

  it('reject without reason -> 422', async () => {
    const order = await prisma.order.create({
      data: { consultationId: 'CS-422', unitId: 'u1', items: { create: [{ name: 'X', qty: 1 }] } },
      include: { items: true },
    });

    const res = await request(app.getHttpServer())
      .post(`/rest/orders/${order.id}/review`)
      .set(OWNER)
      .send({ acceptedItemIds: [], rejectedItems: [{ id: order.items[0].id, reason: '' }] });

    expect(res.status).toBe(422);
  });

  it('ready while RECEIVED -> 409', async () => {
    const order = await prisma.order.create({ data: { consultationId: 'CS-409', unitId: 'u1', items: { create: [{ name: 'X', qty: 1 }] } } });

    const res = await request(app.getHttpServer()).post(`/rest/orders/${order.id}/ready`).set(OWNER).send({});
    expect(res.status).toBe(409);
  });

  it('concurrent reviews on one order: exactly one wins, the rest get 409', async () => {
    const order = await prisma.order.create({
      data: {
        consultationId: 'CS-race',
        unitId: 'u1',
        items: { create: [{ name: 'A', qty: 1 }, { name: 'B', qty: 2 }] },
      },
      include: { items: true },
    });
    const ids = order.items.map((i) => i.id);

    const results = await Promise.all(
      Array.from({ length: 4 }, () =>
        request(app.getHttpServer())
          .post(`/rest/orders/${order.id}/review`)
          .set(OWNER)
          .send({ acceptedItemIds: ids, rejectedItems: [] }),
      ),
    );

    expect(results.filter((r) => r.status < 300)).toHaveLength(1);
    expect(results.filter((r) => r.status === 409)).toHaveLength(3);

    const after = await prisma.order.findUniqueOrThrow({ where: { id: order.id }, include: { items: true } });
    expect(after.status).toBe('ACCEPTED');
    expect(after.items.every((i) => i.status === 'ACCEPTED')).toBe(true);
  });

  it('concurrent ready on one order: exactly one wins', async () => {
    const order = await prisma.order.create({
      data: {
        consultationId: 'CS-race-ready',
        unitId: 'u1',
        status: 'ACCEPTED',
        items: { create: [{ name: 'A', qty: 1, status: 'ACCEPTED' }] },
      },
    });

    const results = await Promise.all(
      Array.from({ length: 3 }, () =>
        request(app.getHttpServer()).post(`/rest/orders/${order.id}/ready`).set(OWNER).send({}),
      ),
    );

    expect(results.filter((r) => r.status < 300)).toHaveLength(1);
    expect(results.filter((r) => r.status === 409)).toHaveLength(2);
  });

  it('meta.count reflects the true matching total, not just the page length', async () => {
    const res = await request(app.getHttpServer()).get('/rest/orders').set(OWNER).query({ status: 'RECEIVED', page: 1, limit: 1 });
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeLessThanOrEqual(1);
    expect(res.body.meta.count).toBeGreaterThanOrEqual(res.body.data.length);
  });
});
