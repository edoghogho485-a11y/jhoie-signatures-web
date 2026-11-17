import type { CustomRequestStatus, EnquiryStatus } from '../../types/fashion';

export function getCustomRequestStatusStyle(status: CustomRequestStatus): {
  badgeClass: string;
  dotClass: string;
} {
  switch (status) {
    case 'New Request':
      return {
        badgeClass: 'text-[#171717] border-[#C6A45C] bg-[#F6F1E8]',
        dotClass: 'bg-[#C6A45C]',
      };
    case 'Under Review':
      return {
        badgeClass: 'text-amber-900 border-amber-200 bg-amber-50',
        dotClass: 'bg-amber-500',
      };
    case 'Awaiting Customer Response':
      return {
        badgeClass: 'text-orange-900 border-orange-200 bg-orange-50',
        dotClass: 'bg-orange-500',
      };
    case 'Accepted':
      return {
        badgeClass: 'text-sky-900 border-sky-200 bg-sky-50',
        dotClass: 'bg-sky-600',
      };
    case 'In Progress':
      return {
        badgeClass: 'text-indigo-900 border-indigo-200 bg-indigo-50',
        dotClass: 'bg-indigo-600',
      };
    case 'Completed':
      return {
        badgeClass: 'text-emerald-900 border-emerald-200 bg-emerald-50',
        dotClass: 'bg-emerald-600',
      };
    case 'Declined':
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

export function getEnquiryStatusStyle(status: EnquiryStatus): {
  badgeClass: string;
  dotClass: string;
} {
  switch (status) {
    case 'Unread':
      return {
        badgeClass: 'text-[#171717] border-[#C6A45C] bg-[#F6F1E8]',
        dotClass: 'bg-[#C6A45C]',
      };
    case 'Read':
      return {
        badgeClass: 'text-sky-900 border-sky-200 bg-sky-50',
        dotClass: 'bg-sky-600',
      };
    case 'Replied':
      return {
        badgeClass: 'text-emerald-900 border-emerald-200 bg-emerald-50',
        dotClass: 'bg-emerald-600',
      };
    default:
      return {
        badgeClass: 'text-[#171717] border-[#171717]/20 bg-[#FAF7F2]',
        dotClass: 'bg-[#171717]',
      };
  }
}
