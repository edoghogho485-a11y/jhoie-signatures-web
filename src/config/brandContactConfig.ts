/**
 * Central Editable Contact, Social & Brand Configuration for JHOIE SIGNATURES.
 *
 * Update all placeholder contact details, WhatsApp number, Instagram link,
 * and editable story/feedback slots in this single file before going live.
 */
export const BRAND_CONTACT_CONFIG = {
  brandName: 'JHOIE SIGNATURES',
  tagline: "Let's talk fashion....",

  whatsapp: {
    // International format digits only (no '+'), e.g. '2348012345678'
    numberRaw: '2348000000000',
    displayLabel: '+234 800 000 0000 (Placeholder Studio WhatsApp)',
    isPlaceholder: true,
  },

  instagram: {
    handle: '@jhoiesignatures',
    profileUrl: 'https://instagram.com/jhoiesignatures',
  },

  businessEmailPlaceholder: 'hello@jhoiesignatures.example (Placeholder Business Email)',
  businessPhonePlaceholder: '+234 800 000 0000 (Placeholder Business Phone)',
  businessLocationPlaceholder: 'Studio Showroom Address (Placeholder — To Be Updated)',
  businessHoursPlaceholder: 'Monday – Saturday · 10:00 AM – 6:00 PM WAT (Placeholder Hours)',

  /**
   * Editable designer story space — replace with the designer's genuine biography when ready.
   * No biography, years of experience, or awards are invented here.
   */
  designerStoryEditableSlot: {
    heading: 'Designer Story & Creative Background (Editable Placeholder)',
    paragraphs: [
      '[Editable Designer Biography Placeholder] — Reserve this space for the founder and creative director to share her genuine journey into fashion, her design training, and her personal inspirations.',
      '[Editable Studio Note Placeholder] — Reserve this space for authentic behind-the-scenes studio details, craftsmanship heritage, and brand milestones.',
    ],
  },

  /**
   * Empty editable testimonials store.
   * Populate with verified client reviews when genuine feedback is collected.
   */
  genuineTestimonials: [] as Array<{
    id: string;
    quote: string;
    clientName: string;
    outfitCategory: string;
  }>,
} as const;
