import type { OrderStatus, PaymentStatus } from '../../types/fashion';

export function getOrderStatusStyle(status: OrderStatus): {
  badgeClass: string;
  dotClass: string;
} {
  switch (status) {
    case 'New':
      return {
        badgeClass: 'text-[#171717] border-[#C6A45C] bg-[#F6F1E8]',
        dotClass: 'bg-[#C6A45C]',
      };
    case 'Pending':
      return {
        badgeClass: 'text-amber-900 border-amber-200 bg-amber-50',
        dotClass: 'bg-amber-500',
      };
    case 'Confirmed':
      return {
        badgeClass: 'text-sky-900 border-sky-200 bg-sky-50',
        dotClass: 'bg-sky-600',
      };
    case 'Processing':
      return {
        badgeClass: 'text-indigo-900 border-indigo-200 bg-indigo-50',
        dotClass: 'bg-indigo-600',
      };
    case 'Ready':
      return {
        badgeClass: 'text-teal-900 border-teal-200 bg-teal-50',
        dotClass: 'bg-teal-600',
      };
    case 'Completed':
      return {
        badgeClass: 'text-emerald-900 border-emerald-200 bg-emerald-50',
        dotClass: 'bg-emerald-600',
      };
    case 'Cancelled':
      return {
        badgeClass: 'text-red-800 border-red-200 bg-red-50',
        dotClass: 'bg-red-600',
      };
    default:
      return {
        badgeClass: 'text-[#171717] border-[#171717]/20 bg-[#FAF7F2]',
        dotClass: 'bg-[#171717]',
      };
  }
}

export function getPaymentStatusStyle(status: PaymentStatus): string {
  switch (status) {
    case 'Unpaid':
      return 'text-[#171717]/75 border-[#171717]/20 bg-[#FAF7F2]';
    case 'Awaiting Confirmation':
      return 'text-amber-900 border-amber-200 bg-amber-50';
    case 'Partially Paid':
      return 'text-sky-900 border-sky-200 bg-sky-50';
    case 'Paid':
      return 'text-emerald-900 border-emerald-200 bg-emerald-50';
    case 'Refunded':
      return 'text-red-800 border-red-200 bg-red-50';
    default:
      return 'text-[#171717] border-[#171717]/20 bg-[#FAF7F2]';
  }
}
