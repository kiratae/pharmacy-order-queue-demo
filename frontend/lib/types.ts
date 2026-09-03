export type OrderStatus = 'RECEIVED' | 'PARTIALLY_ACCEPTED' | 'ACCEPTED' | 'REJECTED' | 'READY' | 'COMPLETED';
export type ItemStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';

export interface OrderItem {
  id: string;
  orderId: string;
  name: string;
  qty: number;
  status: ItemStatus;
  rejectReason: string | null;
}

export interface Order {
  id: string;
  consultationId: string;
  unitId: string;
  patientName: string | null;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
}

export const ORDER_STATUSES: OrderStatus[] = [
  'RECEIVED',
  'PARTIALLY_ACCEPTED',
  'ACCEPTED',
  'REJECTED',
  'READY',
  'COMPLETED',
];
