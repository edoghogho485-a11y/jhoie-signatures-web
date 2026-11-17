import type { CustomOrderPayload, CustomRequestStatus } from '../types/fashion';

export const CUSTOM_REQUEST_STATUS_OPTIONS: CustomRequestStatus[] = [
  'New Request',
  'Under Review',
  'Awaiting Customer Response',
  'Accepted',
  'In Progress',
  'Completed',
  'Declined',
];

export type CustomRequestSortOption = 'newest' | 'oldest' | 'delivery-soonest';

export function normalizeCustomRequestStatus(raw?: string): CustomRequestStatus {
  if (raw && (CUSTOM_REQUEST_STATUS_OPTIONS as string[]).includes(raw)) {
    return raw as CustomRequestStatus;
  }
  const lowered = (raw || '').toLowerCase();
  if (lowered === 'pending_review' || lowered === 'new') return 'New Request';
  if (lowered === 'in_atelier' || lowered === 'in progress') return 'In Progress';
  if (lowered === 'completed') return 'Completed';
  if (lowered === 'accepted') return 'Accepted';
  if (lowered === 'declined') return 'Declined';
  if (lowered === 'under review') return 'Under Review';
  if (lowered === 'awaiting customer response') return 'Awaiting Customer Response';
  return 'New Request';
}

export interface CustomRequestFilterParams {
  requests: CustomOrderPayload[];
  searchQuery?: string;
  status?: CustomRequestStatus | 'All';
  sortBy?: CustomRequestSortOption;
}

export function filterAndSortCustomRequests({
  requests,
  searchQuery = '',
  status = 'All',
  sortBy = 'newest',
}: CustomRequestFilterParams): CustomOrderPayload[] {
  const query = searchQuery.trim().toLowerCase();

  const filtered = requests.filter((req) => {
    const normalized = normalizeCustomRequestStatus(req.status);
    const matchesStatus = status === 'All' || normalized === status;
    const matchesQuery =
      !query ||
      (req.referenceCode || '').toLowerCase().includes(query) ||
      req.customerName.toLowerCase().includes(query) ||
      req.contactNumber.toLowerCase().includes(query) ||
      req.outfitType.toLowerCase().includes(query) ||
      req.preferredColor.toLowerCase().includes(query) ||
      (req.preferredFabric || '').toLowerCase().includes(query) ||
      req.outfitDescription.toLowerCase().includes(query);

    return matchesStatus && matchesQuery;
  });

  return [...filtered].sort((a, b) => {
    if (sortBy === 'delivery-soonest') {
      const dateA = a.preferredDeliveryDate ? new Date(a.preferredDeliveryDate).getTime() : Infinity;
      const dateB = b.preferredDeliveryDate ? new Date(b.preferredDeliveryDate).getTime() : Infinity;
      return dateA - dateB;
    }
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return sortBy === 'oldest' ? timeA - timeB : timeB - timeA;
  });
}

export function getNewCustomRequestsCount(requests: CustomOrderPayload[]): number {
  return requests.filter((r) => normalizeCustomRequestStatus(r.status) === 'New Request').length;
}

export function isRenderableReferenceImage(url?: string): boolean {
  if (!url) return false;
  return url.startsWith('data:image/') || url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/');
}

export function buildAdminToCustomClientWhatsAppMessage(req: CustomOrderPayload): string {
  const status = normalizeCustomRequestStatus(req.status);
  return [
    `Hello ${req.customerName},`,
    `Thank you for submitting your custom outfit request to JHOIE SIGNATURES.`,
    '',
    `Request Reference: ${req.referenceCode || req.id || 'Custom Brief'}`,
    `Outfit Type: ${req.outfitType}`,
    `Preferred Colour: ${req.preferredColor}`,
    `Preferred Delivery Date: ${req.preferredDeliveryDate || 'To be confirmed'}`,
    `Current Status: ${status}`,
    '',
    'We would love to discuss fabric options, measurements, and atelier timelines with you.',
  ].join('\n');
}
