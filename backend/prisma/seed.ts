import { PrismaClient, OrderStatus, ItemStatus } from '@prisma/client';

const prisma = new PrismaClient();

type SeedItem = { name: string; qty: number; status: ItemStatus; rejectReason?: string };
type SeedOrder = {
  consultationId: string;
  unitId: string;
  patientName: string;
  status: OrderStatus;
  items: SeedItem[];
};

const orders: SeedOrder[] = [
  {
    consultationId: 'CS-101',
    unitId: 'u1',
    patientName: 'Somchai',
    status: OrderStatus.RECEIVED,
    items: [{ name: 'Paracetamol 500mg', qty: 20, status: ItemStatus.PENDING }],
  },
  {
    consultationId: 'CS-102',
    unitId: 'u1',
    patientName: 'Nid',
    status: OrderStatus.PARTIALLY_ACCEPTED,
    items: [
      { name: 'Amoxicillin 500mg', qty: 14, status: ItemStatus.ACCEPTED },
      { name: 'Codeine 30mg', qty: 10, status: ItemStatus.REJECTED, rejectReason: 'Out of stock' },
    ],
  },
  {
    consultationId: 'CS-103',
    unitId: 'u1',
    patientName: 'Anong',
    status: OrderStatus.ACCEPTED,
    items: [{ name: 'Ibuprofen 400mg', qty: 12, status: ItemStatus.ACCEPTED }],
  },
  {
    consultationId: 'CS-104',
    unitId: 'u1',
    patientName: 'Boonmee',
    status: OrderStatus.READY,
    items: [{ name: 'Loratadine 10mg', qty: 10, status: ItemStatus.ACCEPTED }],
  },
  {
    consultationId: 'CS-105',
    unitId: 'u1',
    patientName: 'Chai',
    status: OrderStatus.COMPLETED,
    items: [{ name: 'Omeprazole 20mg', qty: 14, status: ItemStatus.ACCEPTED }],
  },
  {
    consultationId: 'CS-201',
    unitId: 'u2',
    patientName: 'Malee',
    status: OrderStatus.RECEIVED,
    items: [
      { name: 'Metformin 500mg', qty: 30, status: ItemStatus.PENDING },
      { name: 'Simvastatin 20mg', qty: 30, status: ItemStatus.PENDING },
    ],
  },
  {
    consultationId: 'CS-202',
    unitId: 'u2',
    patientName: 'Pim',
    status: OrderStatus.REJECTED,
    items: [{ name: 'Tramadol 50mg', qty: 10, status: ItemStatus.REJECTED, rejectReason: 'Requires additional review' }],
  },
  {
    consultationId: 'CS-203',
    unitId: 'u2',
    patientName: 'Aroon',
    status: OrderStatus.READY,
    items: [{ name: 'Cetirizine 10mg', qty: 10, status: ItemStatus.ACCEPTED }],
  },
];

const units = [
  { id: 'u1', name: 'Unit 1' },
  { id: 'u2', name: 'Unit 2' },
];

async function main() {
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.idempotencyKey.deleteMany();

  for (const unit of units) {
    await prisma.unit.upsert({ where: { id: unit.id }, create: unit, update: unit });
  }

  for (const seedOrder of orders) {
    await prisma.order.create({
      data: {
        consultationId: seedOrder.consultationId,
        unitId: seedOrder.unitId,
        patientName: seedOrder.patientName,
        status: seedOrder.status,
        items: {
          create: seedOrder.items.map(({ name, qty, status, rejectReason }) => ({ name, qty, status, rejectReason })),
        },
      },
    });
  }

  console.log(`Seeded ${orders.length} orders across u1/u2.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
