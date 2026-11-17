import type { CustomOrderPayload } from '../types/fashion';

export type CustomOrderFieldErrors = Partial<
  Record<
    | 'customerName'
    | 'contactNumber'
    | 'email'
    | 'outfitType'
    | 'outfitDescription'
    | 'preferredColor'
    | 'preferredDeliveryDate'
    | 'measurements',
    string
  >
>;

export interface ValidationResult {
  isValid: boolean;
  errors: CustomOrderFieldErrors;
  firstErrorMessage: string | null;
}

export function isValidPhoneNumber(phone: string): boolean {
  const trimmed = phone.trim();
  if (!trimmed) return false;
  // Allow digits, spaces, hyphens, parentheses, and an optional leading +
  if (!/^\+?[\d\s\-()]+$/.test(trimmed)) return false;
  const digitsOnly = trimmed.replace(/\D/g, '');
  return digitsOnly.length >= 10 && digitsOnly.length <= 15;
}

export function isValidOptionalEmail(email?: string): boolean {
  if (!email || !email.trim()) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function validateCustomOrderForm(
  payload: CustomOrderPayload,
  todayIsoDate?: string
): ValidationResult {
  const errors: CustomOrderFieldErrors = {};

  if (!payload.customerName.trim() || payload.customerName.trim().length < 2) {
    errors.customerName = 'Please enter your full name (at least 2 characters).';
  }

  if (!payload.contactNumber.trim()) {
    errors.contactNumber = 'Please enter your WhatsApp phone number.';
  } else if (!isValidPhoneNumber(payload.contactNumber)) {
    errors.contactNumber =
      'Enter a valid WhatsApp phone number with 10–15 digits (e.g. +234 801 234 5678 or 08012345678).';
  }

  if (!isValidOptionalEmail(payload.email)) {
    errors.email = 'Please enter a valid email address or leave this optional field blank.';
  }

  if (!payload.outfitType) {
    errors.outfitType = 'Please select the type of outfit you want.';
  }

  if (!payload.outfitDescription.trim() || payload.outfitDescription.trim().length < 10) {
    errors.outfitDescription =
      'Please describe the outfit you would like (at least 10 characters).';
  }

  if (!payload.preferredColor.trim()) {
    errors.preferredColor = 'Please specify your preferred colour or palette.';
  }

  const hasStandardSize = Boolean(
    payload.standardSizeReference && payload.standardSizeReference !== 'Exact Measurements'
  );
  const hasAnyMeasurement = Boolean(
    payload.measurements.bust.trim() ||
      payload.measurements.waist.trim() ||
      payload.measurements.hips.trim() ||
      payload.measurements.shoulder.trim() ||
      payload.measurements.length.trim()
  );

  if (!hasStandardSize && !hasAnyMeasurement) {
    errors.measurements =
      'Please provide at least one body measurement (e.g. Bust, Waist, Hips) or select a standard reference size.';
  }

  if (!payload.preferredDeliveryDate.trim()) {
    errors.preferredDeliveryDate = 'Please select your preferred delivery date.';
  } else {
    const today = todayIsoDate || new Date().toISOString().split('T')[0];
    if (payload.preferredDeliveryDate < today) {
      errors.preferredDeliveryDate = 'Preferred delivery date cannot be in the past.';
    }
  }

  const errorKeys = Object.keys(errors) as (keyof CustomOrderFieldErrors)[];
  return {
    isValid: errorKeys.length === 0,
    errors,
    firstErrorMessage: errorKeys.length > 0 ? errors[errorKeys[0]] || null : null,
  };
}
