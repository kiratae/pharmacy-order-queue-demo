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
  unitName: string;
  patientName: string | null;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
}

export type StatusCounts = Record<OrderStatus, number>;

export interface Unit {
  id: string;
  name: string;
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
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

export const ITEM_STATUS_COLORS: Record<ItemStatus, string> = {
  PENDING: 'bg-blue-100 text-blue-800',
  ACCEPTED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
};

// solid dot color for each badge — the badge's own bg-*-100 is too pale to show as a dot
export const STATUS_DOT_COLORS: Record<OrderStatus, string> = {
  RECEIVED: 'bg-blue-500',
  READY: 'bg-cyan-500',
  ACCEPTED: 'bg-green-500',
  COMPLETED: 'bg-green-500',
  PARTIALLY_ACCEPTED: 'bg-amber-500',
  REJECTED: 'bg-red-500',
};

export const ITEM_STATUS_DOT_COLORS: Record<ItemStatus, string> = {
  PENDING: 'bg-blue-500',
  ACCEPTED: 'bg-green-500',
  REJECTED: 'bg-red-500',
};
