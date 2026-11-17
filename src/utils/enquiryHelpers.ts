import type { ContactInquiryPayload, EnquiryStatus } from '../types/fashion';

export const ENQUIRY_STATUS_OPTIONS: EnquiryStatus[] = ['Unread', 'Read', 'Replied'];

export type EnquirySortOption = 'newest' | 'oldest';

export function normalizeEnquiryStatus(raw?: string): EnquiryStatus {
  if (raw && (ENQUIRY_STATUS_OPTIONS as string[]).includes(raw)) {
    return raw as EnquiryStatus;
  }
  return 'Unread';
}

export interface EnquiryFilterParams {
  enquiries: ContactInquiryPayload[];
  searchQuery?: string;
  status?: EnquiryStatus | 'All';
  sortBy?: EnquirySortOption;
}

export function filterAndSortEnquiries({
  enquiries,
  searchQuery = '',
  status = 'All',
  sortBy = 'newest',
}: EnquiryFilterParams): ContactInquiryPayload[] {
  const query = searchQuery.trim().toLowerCase();

  const filtered = enquiries.filter((item) => {
    const normalized = normalizeEnquiryStatus(item.status);
    const matchesStatus = status === 'All' || normalized === status;
    const matchesQuery =
      !query ||
      item.name.toLowerCase().includes(query) ||
      item.email.toLowerCase().includes(query) ||
      (item.phone || '').toLowerCase().includes(query) ||
      item.subject.toLowerCase().includes(query) ||
      item.message.toLowerCase().includes(query);

    return matchesStatus && matchesQuery;
  });

  return [...filtered].sort((a, b) => {
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return sortBy === 'oldest' ? timeA - timeB : timeB - timeA;
  });
}

export function getUnreadEnquiriesCount(enquiries: ContactInquiryPayload[]): number {
  return enquiries.filter((item) => normalizeEnquiryStatus(item.status) === 'Unread').length;
}

export function buildAdminToEnquiryWhatsAppMessage(enquiry: ContactInquiryPayload): string {
  return [
    `Hello ${enquiry.name},`,
    `Thank you for contacting JHOIE SIGNATURES regarding "${enquiry.subject}".`,
    '',
    'We are following up on your message and are happy to assist you.',
  ].join('\n');
}
