import type { OrderRequestPayload, OrderStatus, PaymentStatus } from '../types/fashion';
import { formatNaira } from './formatters';

export const ORDER_STATUS_OPTIONS: OrderStatus[] = [
  'New',
  'Pending',
  'Confirmed',
  'Processing',
  'Ready',
  'Completed',
  'Cancelled',
];

export const PAYMENT_STATUS_OPTIONS: PaymentStatus[] = [
  'Unpaid',
  'Awaiting Confirmation',
  'Partially Paid',
  'Paid',
  'Refunded',
];

export type OrderSortOption = 'newest' | 'oldest';

export function normalizeOrderStatus(raw?: string): OrderStatus {
  if (!raw) return 'New';
  if ((ORDER_STATUS_OPTIONS as string[]).includes(raw)) {
    return raw as OrderStatus;
  }
  const lowered = raw.toLowerCase();
  if (lowered === 'awaiting_confirmation') return 'New';
  if (lowered === 'confirmed') return 'Confirmed';
  if (lowered === 'dispatched') return 'Processing';
  if (lowered === 'completed') return 'Completed';
  if (lowered === 'cancelled') return 'Cancelled';
  if (lowered === 'pending') return 'Pending';
  if (lowered === 'ready') return 'Ready';
  return 'New';
}

export function normalizePaymentStatus(raw?: string): PaymentStatus {
  if (raw && (PAYMENT_STATUS_OPTIONS as string[]).includes(raw)) {
    return raw as PaymentStatus;
  }
  return 'Unpaid';
}

export function calculateOrderTotalNgn(
  order: Pick<OrderRequestPayload, 'subtotalNgn' | 'deliveryFeeNgn'>
): number {
  const subtotal = Number.isFinite(order.subtotalNgn) ? order.subtotalNgn : 0;
  const delivery =
    typeof order.deliveryFeeNgn === 'number' && Number.isFinite(order.deliveryFeeNgn)
      ? Math.max(0, order.deliveryFeeNgn)
      : 0;
  return subtotal + delivery;
}

export function getOrderTotalQuantity(order: Pick<OrderRequestPayload, 'items'>): number {
  return order.items.reduce((sum, item) => sum + item.quantity, 0);
}

export interface OrderFilterParams {
  orders: OrderRequestPayload[];
  searchQuery?: string;
  orderStatus?: OrderStatus | 'All';
  paymentStatus?: PaymentStatus | 'All';
  sortBy?: OrderSortOption;
}

export function filterAndSortOrders({
  orders,
  searchQuery = '',
  orderStatus = 'All',
  paymentStatus = 'All',
  sortBy = 'newest',
}: OrderFilterParams): OrderRequestPayload[] {
  const query = searchQuery.trim().toLowerCase();

  const filtered = orders.filter((order) => {
    const normalizedStatus = normalizeOrderStatus(order.status);
    const normalizedPayment = normalizePaymentStatus(order.paymentStatus);

    const matchesStatus = orderStatus === 'All' || normalizedStatus === orderStatus;
    const matchesPayment = paymentStatus === 'All' || normalizedPayment === paymentStatus;

    const matchesQuery =
      !query ||
      (order.referenceCode || '').toLowerCase().includes(query) ||
      order.customerName.toLowerCase().includes(query) ||
      order.phoneNumber.toLowerCase().includes(query) ||
      order.cityState.toLowerCase().includes(query) ||
      order.items.some((item) => item.name.toLowerCase().includes(query));

    return matchesStatus && matchesPayment && matchesQuery;
  });

  return [...filtered].sort((a, b) => {
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return sortBy === 'oldest' ? timeA - timeB : timeB - timeA;
  });
}

export function getOrderSummaryMetrics(orders: OrderRequestPayload[]) {
  let pendingOrders = 0;
  let completedOrders = 0;
  let cancelledOrders = 0;

  for (const order of orders) {
    const status = normalizeOrderStatus(order.status);
    if (status === 'Completed') {
      completedOrders += 1;
    } else if (status === 'Cancelled') {
      cancelledOrders += 1;
    } else {
      // New, Pending, Confirmed, Processing, Ready
      pendingOrders += 1;
    }
  }

  return {
    totalOrders: orders.length,
    pendingOrders,
    completedOrders,
    cancelledOrders,
  };
}

export function formatOrderDate(iso?: string): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-NG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatOrderDateTime(iso?: string): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-NG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function normalizeCustomerPhoneForWhatsApp(phoneNumber: string): string {
  const digits = phoneNumber.replace(/\D/g, '');
  if (!digits) return '';
  // Convert Nigerian local format e.g. 08031234567 -> 2348031234567
  if (digits.startsWith('0') && digits.length === 11) {
    return `234${digits.slice(1)}`;
  }
  return digits;
}

export function buildAdminToCustomerWhatsAppMessage(order: OrderRequestPayload): string {
  const status = normalizeOrderStatus(order.status);
  const paymentStatus = normalizePaymentStatus(order.paymentStatus);
  const total = calculateOrderTotalNgn(order);

  const itemSummary = order.items
    .map(
      (item, index) =>
        `${index + 1}. ${item.name} (${item.selectedSize}, ${item.selectedColor}) × ${item.quantity}`
    )
    .join('\n');

  return [
    `Hello ${order.customerName},`,
    `Thank you for your order with JHOIE SIGNATURES.`,
    '',
    `Order Reference: ${order.referenceCode || order.id || 'Pending Ref'}`,
    `Order Status: ${status}`,
    `Payment Status: ${paymentStatus}`,
    `Total Amount: ${formatNaira(total)}`,
    '',
    'Items:',
    itemSummary,
    '',
    'Please let us know if you have any questions regarding your order or delivery.',
  ].join('\n');
}

export function buildCustomerWhatsAppChatUrl(phoneNumber: string, message: string): string {
  const cleanDigits = normalizeCustomerPhoneForWhatsApp(phoneNumber);
  if (!cleanDigits) return '';
  return `https://wa.me/${cleanDigits}?text=${encodeURIComponent(message)}`;
}

export function buildPrintableOrderSummaryText(order: OrderRequestPayload): string {
  const status = normalizeOrderStatus(order.status);
  const payment = normalizePaymentStatus(order.paymentStatus);
  const deliveryFee = order.deliveryFeeNgn ?? 0;
  const total = calculateOrderTotalNgn(order);

  const lines = [
    'JHOIE SIGNATURES — ORDER SUMMARY',
    '========================================',
    `Order Reference: ${order.referenceCode || order.id || 'N/A'}`,
    `Order Date: ${formatOrderDateTime(order.createdAt)}`,
    `Fulfilment Status: ${status}`,
    `Payment Status: ${payment}`,
    '',
    'CUSTOMER & DELIVERY DETAILS',
    '----------------------------------------',
    `Name: ${order.customerName}`,
    `Phone / WhatsApp: ${order.phoneNumber}`,
    `Email: ${order.email || 'Not provided'}`,
    `Address: ${order.deliveryAddress}`,
    `City & State: ${order.cityState}`,
    `Customer Notes: ${order.deliveryNotes || 'None'}`,
    '',
    'ITEMS ORDERED',
    '----------------------------------------',
    ...order.items.map(
      (item, idx) =>
        `${idx + 1}. ${item.name}\n   Size: ${item.selectedSize} | Colour: ${item.selectedColor} | Qty: ${item.quantity} | Unit: ${formatNaira(
          item.priceNgn
        )} | Line Total: ${formatNaira(item.priceNgn * item.quantity)}`
    ),
    '',
    'TOTALS',
    '----------------------------------------',
    `Subtotal: ${formatNaira(order.subtotalNgn)}`,
    `Delivery Fee: ${formatNaira(deliveryFee)}`,
    `Total Amount: ${formatNaira(total)}`,
  ];

  if (order.internalNotes?.trim()) {
    lines.push('', 'INTERNAL NOTES', '----------------------------------------', order.internalNotes.trim());
  }

  return lines.join('\n');
}
