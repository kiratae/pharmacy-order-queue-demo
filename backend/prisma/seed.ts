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
    patientName: 'Somchai Jaidee',
    status: OrderStatus.RECEIVED,
    items: [{ name: 'Paracetamol 500mg', qty: 20, status: ItemStatus.PENDING }],
  },
  {
    consultationId: 'CS-102',
    unitId: 'u1',
    patientName: 'Nittaya Suksai',
    status: OrderStatus.PARTIALLY_ACCEPTED,
    items: [
      { name: 'Amoxicillin 500mg', qty: 14, status: ItemStatus.ACCEPTED },
      { name: 'Codeine 30mg', qty: 10, status: ItemStatus.REJECTED, rejectReason: 'Out of stock' },
    ],
  },
  {
    consultationId: 'CS-103',
    unitId: 'u1',
    patientName: 'Anong Wongsawat',
    status: OrderStatus.ACCEPTED,
    items: [
      { name: 'Ibuprofen 400mg', qty: 12, status: ItemStatus.ACCEPTED },
      { name: 'Domperidone 10mg', qty: 15, status: ItemStatus.ACCEPTED },
    ],
  },
  {
    consultationId: 'CS-104',
    unitId: 'u1',
    patientName: 'Boonmee Chaiyasit',
    status: OrderStatus.READY,
    items: [{ name: 'Loratadine 10mg', qty: 10, status: ItemStatus.ACCEPTED }],
  },
  {
    consultationId: 'CS-105',
    unitId: 'u1',
    patientName: 'Chai Rattanakul',
    status: OrderStatus.COMPLETED,
    items: [
      { name: 'Omeprazole 20mg', qty: 14, status: ItemStatus.ACCEPTED },
      { name: 'Ranitidine 150mg', qty: 14, status: ItemStatus.ACCEPTED },
      { name: 'Folic Acid 5mg', qty: 30, status: ItemStatus.ACCEPTED },
    ],
  },
  {
    consultationId: 'CS-106',
    unitId: 'u1',
    patientName: 'Ploy Sirikul',
    status: OrderStatus.REJECTED,
    items: [{ name: 'Tramadol 50mg', qty: 10, status: ItemStatus.REJECTED, rejectReason: 'Requires additional review' }],
  },
  {
    consultationId: 'CS-107',
    unitId: 'u1',
    patientName: 'Kanya Phetchara',
    status: OrderStatus.RECEIVED,
    items: [
      { name: 'Amlodipine 5mg', qty: 30, status: ItemStatus.PENDING },
      { name: 'Atorvastatin 20mg', qty: 30, status: ItemStatus.PENDING },
      { name: 'Aspirin 81mg', qty: 30, status: ItemStatus.PENDING },
    ],
  },
  {
    consultationId: 'CS-108',
    unitId: 'u1',
    patientName: 'Somsak Boonmee',
    status: OrderStatus.PARTIALLY_ACCEPTED,
    items: [
      { name: 'Losartan 50mg', qty: 30, status: ItemStatus.ACCEPTED },
      { name: 'Metoprolol 50mg', qty: 30, status: ItemStatus.ACCEPTED },
      { name: 'Diclofenac 50mg', qty: 20, status: ItemStatus.REJECTED, rejectReason: 'Contraindicated with current medication' },
    ],
  },
  {
    consultationId: 'CS-109',
    unitId: 'u1',
    patientName: 'Suda Intarasombat',
    status: OrderStatus.ACCEPTED,
    items: [{ name: 'Cetirizine 10mg', qty: 10, status: ItemStatus.ACCEPTED }],
  },
  {
    consultationId: 'CS-110',
    unitId: 'u1',
    patientName: 'Wichai Thongdee',
    status: OrderStatus.COMPLETED,
    items: [
      { name: 'Metformin 500mg', qty: 60, status: ItemStatus.ACCEPTED },
      { name: 'Simvastatin 20mg', qty: 30, status: ItemStatus.ACCEPTED },
    ],
  },
  {
    consultationId: 'CS-201',
    unitId: 'u2',
    patientName: 'Malee Sukhumvit',
    status: OrderStatus.RECEIVED,
    items: [
      { name: 'Metformin 500mg', qty: 30, status: ItemStatus.PENDING },
      { name: 'Simvastatin 20mg', qty: 30, status: ItemStatus.PENDING },
    ],
  },
  {
    consultationId: 'CS-202',
    unitId: 'u2',
    patientName: 'Pim Charoensuk',
    status: OrderStatus.REJECTED,
    items: [{ name: 'Tramadol 50mg', qty: 10, status: ItemStatus.REJECTED, rejectReason: 'Requires additional review' }],
  },
  {
    consultationId: 'CS-203',
    unitId: 'u2',
    patientName: 'Aroon Kittisak',
    status: OrderStatus.READY,
    items: [
      { name: 'Cetirizine 10mg', qty: 10, status: ItemStatus.ACCEPTED },
      { name: 'Salbutamol Inhaler', qty: 1, status: ItemStatus.ACCEPTED },
    ],
  },
  {
    consultationId: 'CS-204',
    unitId: 'u2',
    patientName: 'Napat Wattana',
    status: OrderStatus.PARTIALLY_ACCEPTED,
    items: [
      { name: 'Azithromycin 250mg', qty: 6, status: ItemStatus.ACCEPTED },
      { name: 'Prednisolone 5mg', qty: 20, status: ItemStatus.ACCEPTED },
      { name: 'Ciprofloxacin 500mg', qty: 14, status: ItemStatus.REJECTED, rejectReason: 'Duplicate therapy' },
      { name: 'Doxycycline 100mg', qty: 14, status: ItemStatus.REJECTED, rejectReason: 'Out of stock' },
    ],
  },
  {
    consultationId: 'CS-205',
    unitId: 'u2',
    patientName: 'Siriporn Chaiwong',
    status: OrderStatus.ACCEPTED,
    items: [
      { name: 'Calcium Carbonate 500mg', qty: 30, status: ItemStatus.ACCEPTED },
      { name: 'Vitamin B Complex', qty: 30, status: ItemStatus.ACCEPTED },
      { name: 'Folic Acid 5mg', qty: 30, status: ItemStatus.ACCEPTED },
    ],
  },
  {
    consultationId: 'CS-206',
    unitId: 'u2',
    patientName: 'Thanawat Prasert',
    status: OrderStatus.COMPLETED,
    items: [{ name: 'Omeprazole 20mg', qty: 14, status: ItemStatus.ACCEPTED }],
  },
  {
    consultationId: 'CS-207',
    unitId: 'u2',
    patientName: 'Kamon Srisawat',
    status: OrderStatus.RECEIVED,
    items: [{ name: 'Paracetamol 500mg', qty: 20, status: ItemStatus.PENDING }],
  },
  {
    consultationId: 'CS-208',
    unitId: 'u2',
    patientName: 'Duangjai Nakorn',
    status: OrderStatus.REJECTED,
    items: [
      { name: 'Diclofenac 50mg', qty: 20, status: ItemStatus.REJECTED, rejectReason: 'Dosage exceeds limit' },
      { name: 'Tramadol 50mg', qty: 10, status: ItemStatus.REJECTED, rejectReason: 'Prescription unclear' },
    ],
  },
  {
    consultationId: 'CS-209',
    unitId: 'u2',
    patientName: 'Preecha Sombat',
    status: OrderStatus.PARTIALLY_ACCEPTED,
    items: [
      { name: 'Amoxicillin 500mg', qty: 21, status: ItemStatus.ACCEPTED },
      { name: 'Codeine 30mg', qty: 10, status: ItemStatus.REJECTED, rejectReason: 'Requires additional review' },
    ],
  },
  {
    consultationId: 'CS-210',
    unitId: 'u2',
    patientName: 'Ratana Phongsathorn',
    status: OrderStatus.READY,
    items: [
      { name: 'Ibuprofen 400mg', qty: 12, status: ItemStatus.ACCEPTED },
      { name: 'Loratadine 10mg', qty: 10, status: ItemStatus.ACCEPTED },
      { name: 'Vitamin B Complex', qty: 30, status: ItemStatus.ACCEPTED },
    ],
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
