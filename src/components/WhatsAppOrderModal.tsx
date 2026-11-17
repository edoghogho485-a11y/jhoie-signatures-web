import { Check, Copy, ExternalLink, Info, MessageCircle, X } from 'lucide-react';
import { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { buildWhatsAppLink } from '../services/storeRepository';

export function WhatsAppOrderModal() {
  const { whatsAppModal, closeWhatsAppModal, showToast, websiteSettings } = useStore();
  const [copied, setCopied] = useState(false);

  if (!whatsAppModal) return null;

  const waHref = buildWhatsAppLink(whatsAppModal.message, websiteSettings.whatsappNumberRaw);
  const mentionsManualPhoto = whatsAppModal.message.includes('Reference Photo:');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(whatsAppModal.message);
      setCopied(true);
      showToast('WhatsApp message copied to clipboard');
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast('Unable to copy automatically — please select and copy the text');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={whatsAppModal.title}
    >
      <div
        onClick={closeWhatsAppModal}
        className="fixed inset-0 bg-[#171717]/60 backdrop-blur-[2px]"
      />

      <div className="relative z-10 w-full max-w-lg bg-white border border-[#171717]/15 shadow-2xl p-6 sm:p-7 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-[#A68642] font-medium">
              <MessageCircle className="w-4 h-4" aria-hidden="true" />
              <span>WhatsApp Message Prepared</span>
            </div>
            <h3 className="font-display text-2xl font-semibold text-[#171717]">
              {whatsAppModal.title}
            </h3>
          </div>
          <button
            type="button"
            onClick={closeWhatsAppModal}
            aria-label="Close modal"
            className="w-9 h-9 inline-flex items-center justify-center text-[#171717]/65 hover:text-[#171717] hover:bg-[#F6F1E8] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="text-xs text-[#171717]/75 leading-relaxed space-y-1.5">
          <p>
            Destination number:{' '}
            <span className="font-semibold text-[#171717]">
              {websiteSettings.whatsappDisplayLabel}
            </span>
          </p>
          {websiteSettings.whatsappIsPlaceholder && (
            <p className="text-[11px] text-[#A68642]">
              Placeholder studio number active — update it anytime in Admin Website Settings, or
              review/copy your formatted message below.
            </p>
          )}
        </div>

        {mentionsManualPhoto && (
          <div className="p-3 bg-[#F6F1E8] border border-[#C6A45C]/40 flex items-start gap-2.5 text-xs text-[#171717]/85">
            <Info className="w-4 h-4 text-[#A68642] shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              <strong>Image Attachment Reminder:</strong> WhatsApp chat links cannot transfer image
              files automatically. After WhatsApp opens, please attach your uploaded inspiration
              photo directly in the chat.
            </span>
          </div>
        )}

        <pre className="bg-[#FAF7F2] border border-[#171717]/10 p-4 text-xs text-[#171717] whitespace-pre-wrap font-sans leading-relaxed max-h-60 overflow-y-auto">
          {whatsAppModal.message}
        </pre>

        <div className="flex flex-col sm:flex-row gap-3 pt-1">
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-3 px-4 bg-[#171717] text-white text-xs sm:text-sm font-medium hover:bg-[#2a2a2a] transition-colors inline-flex items-center justify-center gap-2"
          >
            <span>Continue to WhatsApp</span>
            <ExternalLink className="w-4 h-4 text-[#C6A45C]" aria-hidden="true" />
          </a>
          <button
            type="button"
            onClick={handleCopy}
            className="py-3 px-4 border border-[#171717]/20 text-[#171717] text-xs sm:text-sm font-medium hover:bg-[#F6F1E8] transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-700" aria-hidden="true" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" aria-hidden="true" />
                <span>Copy Message</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
