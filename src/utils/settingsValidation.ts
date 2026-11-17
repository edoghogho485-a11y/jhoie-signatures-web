import type { WebsiteSettings } from '../types/fashion';

export type WebsiteSettingsErrors = Partial<
  Record<
    | 'brandName'
    | 'tagline'
    | 'whatsappNumberRaw'
    | 'businessEmail'
    | 'instagramHandle'
    | 'instagramUrl'
    | 'businessLocation',
    string
  >
>;

export function validateWebsiteSettings(settings: WebsiteSettings): {
  isValid: boolean;
  errors: WebsiteSettingsErrors;
  firstErrorMessage?: string;
} {
  const errors: WebsiteSettingsErrors = {};

  if (!settings.brandName.trim()) {
    errors.brandName = 'Brand name is required.';
  }

  if (!settings.tagline.trim()) {
    errors.tagline = 'Tagline is required.';
  }

  const digits = settings.whatsappNumberRaw.replace(/\D/g, '');
  if (digits.length < 10) {
    errors.whatsappNumberRaw =
      'Please enter a valid international WhatsApp number with country code (at least 10 digits).';
  }

  if (!settings.businessEmail.trim()) {
    errors.businessEmail = 'Business email field cannot be blank.';
  }

  if (!settings.instagramHandle.trim()) {
    errors.instagramHandle = 'Instagram handle is required.';
  }

  if (
    !settings.instagramUrl.trim() ||
    (!settings.instagramUrl.startsWith('https://') && !settings.instagramUrl.startsWith('http://'))
  ) {
    errors.instagramUrl = 'Please enter a valid Instagram profile URL starting with https://.';
  }

  if (!settings.businessLocation.trim()) {
    errors.businessLocation = 'Business location field cannot be blank.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    firstErrorMessage: Object.values(errors)[0],
  };
}
