import { BRAND_CONTACT_CONFIG } from './brandContactConfig';

/**
 * Central WhatsApp Configuration bound to BRAND_CONTACT_CONFIG.
 * Edit `BRAND_CONTACT_CONFIG.whatsapp` in `src/config/brandContactConfig.ts`.
 */
export const WHATSAPP_CONFIG = {
  numberRaw: BRAND_CONTACT_CONFIG.whatsapp.numberRaw,
  displayLabel: BRAND_CONTACT_CONFIG.whatsapp.displayLabel,
  isPlaceholder: BRAND_CONTACT_CONFIG.whatsapp.isPlaceholder,
  buildChatUrl(message: string): string {
    const cleanDigits = this.numberRaw.replace(/\D/g, '');
    return `https://wa.me/${cleanDigits}?text=${encodeURIComponent(message)}`;
  },
} as const;
