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

export interface Unit {
  id: string;
  name: string;
}

export const ORDER_STATUSES: OrderStatus[] = [
  'RECEIVED',
  'PARTIALLY_ACCEPTED',
  'ACCEPTED',
  'REJECTED',
  'READY',
  'COMPLETED',
];

// blue = in progress, green = success, amber = partial, red = terminal (rejected)
export const STATUS_COLORS: Record<OrderStatus, string> = {
  RECEIVED: ' bg-blue-100 text-blue-800',
  READY: 'bg-cyan-100 text-cyan-800',
  ACCEPTED: 'bg-green-100 text-green-800',
  COMPLETED: 'bg-green-100 text-green-800',
  PARTIALLY_ACCEPTED: 'bg-amber-100 text-amber-800',
  REJECTED: 'bg-red-100 text-red-800',
};
