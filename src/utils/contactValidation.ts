export interface ContactFormInput {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
}

export type ContactFieldErrors = Partial<
  Record<'name' | 'email' | 'subject' | 'message', string>
>;

export interface ContactValidationResult {
  isValid: boolean;
  errors: ContactFieldErrors;
  firstErrorMessage: string | null;
}

export function validateContactForm(input: ContactFormInput): ContactValidationResult {
  const errors: ContactFieldErrors = {};

  if (!input.name.trim() || input.name.trim().length < 2) {
    errors.name = 'Please enter your name (at least 2 characters).';
  }

  const trimmedEmail = input.email.trim();
  if (!trimmedEmail) {
    errors.email = 'Please enter your email address.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    errors.email = 'Please enter a valid email address.';
  }

  if (!input.subject.trim()) {
    errors.subject = 'Please select or enter a subject.';
  }

  if (!input.message.trim() || input.message.trim().length < 10) {
    errors.message = 'Please enter a message of at least 10 characters.';
  }

  const keys = Object.keys(errors) as (keyof ContactFieldErrors)[];
  return {
    isValid: keys.length === 0,
    errors,
    firstErrorMessage: keys.length > 0 ? errors[keys[0]] || null : null,
  };
}
