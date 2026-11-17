import {
  Calendar,
  ImageIcon,
  Info,
  Mail,
  MessageCircle,
  Phone,
  Ruler,
  Save,
  Scissors,
  User,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import type { CustomOrderPayload, CustomRequestStatus } from '../../types/fashion';
import {
  buildAdminToCustomClientWhatsAppMessage,
  CUSTOM_REQUEST_STATUS_OPTIONS,
  isRenderableReferenceImage,
  normalizeCustomRequestStatus,
} from '../../utils/customRequestHelpers';
import { formatNaira } from '../../utils/formatters';
import { buildCustomerWhatsAppChatUrl, formatOrderDateTime } from '../../utils/orderHelpers';
import { getCustomRequestStatusStyle } from './requestStatusStyles';

interface CustomRequestDetailModalProps {
  request: CustomOrderPayload | null;
  onClose: () => void;
  onSaveUpdates: (
    requestId: string,
    updates: {
      status: CustomRequestStatus;
      internalNotes: string;
    }
  ) => Promise<void>;
}

export function CustomRequestDetailModal({
  request,
  onClose,
  onSaveUpdates,
}: CustomRequestDetailModalProps) {
  const [status, setStatus] = useState<CustomRequestStatus>('New Request');
  const [internalNotes, setInternalNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!request) return;
    setStatus(normalizeCustomRequestStatus(request.status));
    setInternalNotes(request.internalNotes || '');
    setSaveError(null);
  }, [request]);

  useEffect(() => {
    if (!request) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSaving) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [request, isSaving, onClose]);

  if (!request) return null;

  const requestId = request.id || request.referenceCode || '';
  const statusStyle = getCustomRequestStatusStyle(status);
  const waMessage = buildAdminToCustomClientWhatsAppMessage({
    ...request,
    status,
  });
  const waUrl = buildCustomerWhatsAppChatUrl(request.contactNumber, waMessage);
  const hasRenderablePhoto = isRenderableReferenceImage(request.referenceImagePreviewUrl);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveError(null);
    try {
      await onSaveUpdates(requestId, {
        status,
        internalNotes: internalNotes.trim(),
      });
      onClose();
    } catch (err) {
      setSaveError(
        err instanceof Error && err.message
          ? err.message
          : 'Unable to save custom request updates right now.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label={`Custom request ${request.referenceCode || requestId}`}
    >
      <div
        onClick={() => !isSaving && onClose()}
        className="fixed inset-0 bg-[#171717]/65 backdrop-blur-[2px]"
      />

      <div className="relative z-10 w-full max-w-4xl bg-white border border-[#171717]/15 shadow-2xl my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-[#171717] text-white flex items-center justify-between gap-4 shrink-0">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.16em] text-[#C6A45C]">
              Bespoke Atelier Brief · {request.referenceCode || request.id}
            </p>
            <h2 className="font-display text-xl sm:text-2xl font-medium truncate mt-0.5">
              {request.customerName} — {request.outfitType}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            aria-label="Close custom request details"
            className="p-1.5 text-white/70 hover:text-white cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="overflow-y-auto flex-1 p-6 space-y-6">
          {/* Status Header Strip */}
          <div className="p-4 bg-[#FAF7F2] border border-[#171717]/10 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2.5 text-xs">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 font-medium border ${statusStyle.badgeClass}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dotClass}`} aria-hidden="true" />
                <span>{status}</span>
              </span>
              <span className="text-[#171717]/60">
                Submitted: {formatOrderDateTime(request.createdAt)}
              </span>
            </div>

            {waUrl && (
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 bg-[#171717] text-white text-xs font-medium hover:bg-[#2a2a2a] inline-flex items-center gap-1.5 whitespace-nowrap"
              >
                <MessageCircle className="w-3.5 h-3.5 text-[#C6A45C]" aria-hidden="true" />
                <span>Contact Client on WhatsApp</span>
              </a>
            )}
          </div>

          {/* Client Info + Request Specs */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 space-y-5">
              {/* Client Card */}
              <div className="p-4 bg-white border border-[#171717]/10 space-y-3 text-xs sm:text-sm">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#A68642] flex items-center gap-2">
                  <User className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Client Information</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <span className="text-xs text-[#171717]/55 block">Customer Name</span>
                    <span className="font-medium text-[#171717]">{request.customerName}</span>
                  </div>
                  <div>
                    <span className="text-xs text-[#171717]/55 block">WhatsApp Phone</span>
                    <span className="font-medium text-[#171717] inline-flex items-center gap-1.5 tabular-nums">
                      <Phone className="w-3 h-3 text-[#A68642]" aria-hidden="true" />
                      {request.contactNumber}
                    </span>
                  </div>
                  {request.email && (
                    <div>
                      <span className="text-xs text-[#171717]/55 block">Email Address</span>
                      <a
                        href={`mailto:${request.email}`}
                        className="font-medium text-[#171717] hover:text-[#A68642] underline underline-offset-2 inline-flex items-center gap-1.5 break-all"
                      >
                        <Mail className="w-3 h-3 text-[#A68642]" aria-hidden="true" />
                        {request.email}
                      </a>
                    </div>
                  )}
                  <div>
                    <span className="text-xs text-[#171717]/55 block">Requested Delivery Date</span>
                    <span className="font-medium text-[#171717] inline-flex items-center gap-1.5 tabular-nums">
                      <Calendar className="w-3 h-3 text-[#A68642]" aria-hidden="true" />
                      {request.preferredDeliveryDate || 'Not specified'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Design Brief */}
              <div className="p-4 bg-white border border-[#171717]/10 space-y-3 text-xs sm:text-sm">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#A68642] flex items-center gap-2">
                  <Scissors className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Outfit Design Brief</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <span className="text-xs text-[#171717]/55 block">Outfit Type</span>
                    <span className="font-medium text-[#171717]">{request.outfitType}</span>
                  </div>
                  <div>
                    <span className="text-xs text-[#171717]/55 block">Occasion</span>
                    <span className="font-medium text-[#171717]">
                      {request.preferredOccasion || 'Not specified'}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-[#171717]/55 block">Preferred Colour</span>
                    <span className="font-medium text-[#171717]">{request.preferredColor}</span>
                  </div>
                  <div>
                    <span className="text-xs text-[#171717]/55 block">Preferred Fabric</span>
                    <span className="font-medium text-[#171717]">
                      {request.preferredFabric || 'Open to recommendation'}
                    </span>
                  </div>
                  {typeof request.budgetNgn === 'number' && request.budgetNgn > 0 && (
                    <div>
                      <span className="text-xs text-[#171717]/55 block">Estimated Budget</span>
                      <span className="font-medium text-[#171717] tabular-nums">
                        {formatNaira(request.budgetNgn)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-[#171717]/10">
                  <span className="text-xs text-[#171717]/55 block mb-1">Description</span>
                  <p className="text-xs sm:text-sm text-[#171717]/85 leading-relaxed whitespace-pre-wrap">
                    {request.outfitDescription}
                  </p>
                </div>

                {request.additionalNotes && (
                  <div className="pt-2 border-t border-[#171717]/10">
                    <span className="text-xs text-[#171717]/55 block mb-1">Customer Notes</span>
                    <p className="text-xs sm:text-sm text-[#171717]/80 leading-relaxed whitespace-pre-wrap">
                      {request.additionalNotes}
                    </p>
                  </div>
                )}
              </div>

              {/* Measurements */}
              <div className="p-4 bg-[#FAF7F2] border border-[#171717]/10 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[#A68642] flex items-center gap-2">
                    <Ruler className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Measurements ({request.measurementUnit})</span>
                  </h3>
                  {request.standardSizeReference && (
                    <span className="text-xs text-[#171717]/75">
                      Size Ref: <strong>{request.standardSizeReference}</strong>
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs">
                  {[
                    { label: 'Bust', value: request.measurements?.bust },
                    { label: 'Waist', value: request.measurements?.waist },
                    { label: 'Hips', value: request.measurements?.hips },
                    { label: 'Shoulder', value: request.measurements?.shoulder },
                    { label: 'Length', value: request.measurements?.length },
                  ].map((item) => (
                    <div key={item.label} className="p-2.5 bg-white border border-[#171717]/10">
                      <span className="text-[#171717]/55 block text-[11px]">{item.label}</span>
                      <span className="font-semibold text-[#171717] tabular-nums">
                        {item.value || '—'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Reference Photo + Status + Internal Notes */}
            <div className="lg:col-span-5 space-y-5">
              {/* Reference Image */}
              <div className="p-4 bg-white border border-[#171717]/10 space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#A68642] flex items-center gap-2">
                  <ImageIcon className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Reference Image</span>
                </h3>

                {hasRenderablePhoto ? (
                  <div className="space-y-2">
                    <div className="aspect-[3/4] max-h-72 w-full bg-[#FAF7F2] border border-[#171717]/10 overflow-hidden">
                      <img
                        src={request.referenceImagePreviewUrl}
                        alt={request.referenceImageName || 'Customer outfit reference'}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    {request.referenceImageName && (
                      <p className="text-xs text-[#171717]/60 truncate">
                        File: {request.referenceImageName}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="p-4 bg-[#FAF7F2] border border-dashed border-[#171717]/20 text-xs text-[#171717]/65 leading-relaxed">
                    {request.referenceImagePath ? (
                      <p>
                        Private storage object{' '}
                        <strong className="break-all">{request.referenceImageName || request.referenceImagePath}</strong>{' '}
                        is stored in <code className="font-mono">custom-references</code>, but a
                        temporary signed preview link could not be generated. Ensure migration{' '}
                        <code className="font-mono">004_storage_buckets.sql</code> is active.
                      </p>
                    ) : request.referenceImageName ? (
                      <p>
                        Client attached filename <strong>{request.referenceImageName}</strong>,
                        but image preview data could not be kept in browser storage. Permanent file
                        storage will be available via Supabase Storage.
                      </p>
                    ) : (
                      <p>No reference inspiration photo was uploaded with this brief.</p>
                    )}
                  </div>
                )}
              </div>

              {/* Status & Private Notes */}
              <div className="p-4 bg-[#FAF7F2] border border-[#171717]/10 space-y-4">
                <div>
                  <label
                    htmlFor="custom-req-status"
                    className="block text-xs font-semibold text-[#171717] mb-1.5"
                  >
                    Request Status
                  </label>
                  <select
                    id="custom-req-status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as CustomRequestStatus)}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-[#171717]/20 bg-white focus:border-[#C6A45C] focus:outline-none cursor-pointer"
                  >
                    {CUSTOM_REQUEST_STATUS_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="custom-req-notes"
                    className="block text-xs font-semibold text-[#171717] mb-1.5"
                  >
                    Private Internal Notes
                  </label>
                  <textarea
                    id="custom-req-notes"
                    rows={4}
                    value={internalNotes}
                    onChange={(e) => setInternalNotes(e.target.value)}
                    placeholder="Record quoted price, fabric sourcing checks, fitting dates, or studio reminders..."
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-[#171717]/20 bg-white focus:border-[#C6A45C] focus:outline-none"
                  />
                </div>

                <div className="p-3 bg-white border border-[#C6A45C]/40 flex items-start gap-2 text-[11px] text-[#171717]/75">
                  <Info className="w-3.5 h-3.5 text-[#A68642] shrink-0 mt-0.5" aria-hidden="true" />
                  <span>Internal notes remain private in the Admin Studio.</span>
                </div>
              </div>
            </div>
          </div>

          {saveError && (
            <div role="alert" className="p-3 bg-red-50 border border-red-200 text-xs text-red-800">
              {saveError}
            </div>
          )}

          {/* Footer Save Bar */}
          <div className="pt-4 border-t border-[#171717]/10 flex flex-wrap items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2.5 border border-[#171717]/20 bg-white text-xs font-medium text-[#171717] hover:bg-[#FAF7F2] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 bg-[#171717] text-white text-xs font-medium hover:bg-[#2a2a2a] inline-flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5 text-[#C6A45C]" aria-hidden="true" />
              <span>{isSaving ? 'Saving...' : 'Save Request Updates'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
