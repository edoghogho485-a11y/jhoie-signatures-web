import { Calendar, Mail, MessageCircle, Phone, Save, User, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ContactInquiryPayload, EnquiryStatus } from '../../types/fashion';
import {
  buildAdminToEnquiryWhatsAppMessage,
  ENQUIRY_STATUS_OPTIONS,
  normalizeEnquiryStatus,
} from '../../utils/enquiryHelpers';
import { buildCustomerWhatsAppChatUrl, formatOrderDateTime } from '../../utils/orderHelpers';
import { getEnquiryStatusStyle } from './requestStatusStyles';

interface EnquiryDetailModalProps {
  enquiry: ContactInquiryPayload | null;
  onClose: () => void;
  onSaveUpdates: (
    enquiryId: string,
    updates: {
      status: EnquiryStatus;
      internalNotes: string;
    }
  ) => Promise<void>;
}

export function EnquiryDetailModal({
  enquiry,
  onClose,
  onSaveUpdates,
}: EnquiryDetailModalProps) {
  const [status, setStatus] = useState<EnquiryStatus>('Unread');
  const [internalNotes, setInternalNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!enquiry) return;
    setStatus(normalizeEnquiryStatus(enquiry.status));
    setInternalNotes(enquiry.internalNotes || '');
  }, [enquiry]);

  useEffect(() => {
    if (!enquiry) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSaving) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enquiry, isSaving, onClose]);

  if (!enquiry) return null;

  const enquiryId = enquiry.id || '';
  const statusStyle = getEnquiryStatusStyle(status);
  const waUrl = enquiry.phone
    ? buildCustomerWhatsAppChatUrl(enquiry.phone, buildAdminToEnquiryWhatsAppMessage(enquiry))
    : null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSaveUpdates(enquiryId, {
        status,
        internalNotes: internalNotes.trim(),
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label={`Customer enquiry from ${enquiry.name}`}
    >
      <div
        onClick={() => !isSaving && onClose()}
        className="fixed inset-0 bg-[#171717]/65 backdrop-blur-[2px]"
      />

      <div className="relative z-10 w-full max-w-2xl bg-white border border-[#171717]/15 shadow-2xl my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-[#171717] text-white flex items-center justify-between gap-4 shrink-0">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.16em] text-[#C6A45C]">
              Customer Enquiry
            </p>
            <h2 className="font-display text-xl sm:text-2xl font-medium truncate mt-0.5">
              {enquiry.subject}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            aria-label="Close enquiry modal"
            className="p-1.5 text-white/70 hover:text-white cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="overflow-y-auto flex-1 p-6 space-y-5">
          {/* Sender Metadata */}
          <div className="p-4 bg-[#FAF7F2] border border-[#171717]/10 space-y-3 text-xs sm:text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-medium border ${statusStyle.badgeClass}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dotClass}`} aria-hidden="true" />
                <span>{status}</span>
              </span>
              <span className="text-xs text-[#171717]/60 inline-flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#A68642]" aria-hidden="true" />
                {formatOrderDateTime(enquiry.createdAt)}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#171717]/10">
              <div>
                <span className="text-xs text-[#171717]/55 block">Customer Name</span>
                <span className="font-medium text-[#171717] inline-flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-[#A68642]" aria-hidden="true" />
                  {enquiry.name}
                </span>
              </div>
              <div>
                <span className="text-xs text-[#171717]/55 block">Email Address</span>
                <a
                  href={`mailto:${enquiry.email}?subject=${encodeURIComponent(`Re: ${enquiry.subject}`)}`}
                  className="font-medium text-[#171717] hover:text-[#A68642] underline underline-offset-2 inline-flex items-center gap-1.5 break-all"
                >
                  <Mail className="w-3.5 h-3.5 text-[#A68642] shrink-0" aria-hidden="true" />
                  {enquiry.email}
                </a>
              </div>
              {enquiry.phone && (
                <div>
                  <span className="text-xs text-[#171717]/55 block">Phone / WhatsApp</span>
                  <span className="font-medium text-[#171717] inline-flex items-center gap-1.5 tabular-nums">
                    <Phone className="w-3.5 h-3.5 text-[#A68642]" aria-hidden="true" />
                    {enquiry.phone}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Message Body */}
          <div className="p-4 bg-white border border-[#171717]/10 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#A68642]">
              Customer Message
            </p>
            <p className="text-sm text-[#171717]/85 leading-relaxed whitespace-pre-wrap">
              {enquiry.message}
            </p>
          </div>

          {/* Reply Actions */}
          <div className="flex flex-wrap gap-2.5">
            <a
              href={`mailto:${enquiry.email}?subject=${encodeURIComponent(`Re: ${enquiry.subject}`)}`}
              className="px-4 py-2 border border-[#171717]/20 bg-white text-xs font-medium text-[#171717] hover:border-[#171717] inline-flex items-center gap-1.5"
            >
              <Mail className="w-3.5 h-3.5 text-[#A68642]" aria-hidden="true" />
              <span>Reply by Email</span>
            </a>
            {waUrl && (
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-[#171717] text-white text-xs font-medium hover:bg-[#2a2a2a] inline-flex items-center gap-1.5"
              >
                <MessageCircle className="w-3.5 h-3.5 text-[#C6A45C]" aria-hidden="true" />
                <span>Reply on WhatsApp</span>
              </a>
            )}
          </div>

          {/* Status Selector + Notes */}
          <div className="p-4 bg-[#FAF7F2] border border-[#171717]/10 space-y-4">
            <div>
              <span className="block text-xs font-semibold text-[#171717] mb-2">
                Mark Message Status
              </span>
              <div className="inline-flex flex-wrap gap-1.5">
                {ENQUIRY_STATUS_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setStatus(opt)}
                    className={`px-3.5 py-1.5 text-xs font-medium cursor-pointer transition-colors border ${
                      status === opt
                        ? 'bg-[#171717] text-white border-[#171717]'
                        : 'bg-white text-[#171717]/80 border-[#171717]/20 hover:border-[#C6A45C]'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label
                htmlFor="enquiry-internal-notes"
                className="block text-xs font-semibold text-[#171717] mb-1.5"
              >
                Private Studio Notes
              </label>
              <textarea
                id="enquiry-internal-notes"
                rows={3}
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                placeholder="Note follow-up outcome or customer response..."
                className="w-full px-3 py-2 text-xs sm:text-sm border border-[#171717]/20 bg-white focus:border-[#C6A45C] focus:outline-none"
              />
            </div>
          </div>

          {/* Save Bar */}
          <div className="pt-3 border-t border-[#171717]/10 flex items-center justify-end gap-3">
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
              <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
