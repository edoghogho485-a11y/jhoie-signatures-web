import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabaseClient';
import type { CustomerAuthSession, CustomerSignUpResult } from '../types/fashion';

/**
 * Customer Authentication Service for JHOIE SIGNATURES.
 *
 * - When Supabase is configured:
 *   Uses Supabase Auth (`signUp`, `signInWithPassword`, `getSession`, `resend`, `signOut`)
 *   paired with `public.profiles` (provisioned automatically by the `handle_new_user()` trigger
 *   with `role = 'customer'`). Public registration can never self-assign admin roles.
 * - When Supabase is not configured (local preview / Node unit tests):
 *   Supports explicit `local_preview` sessions inside `sessionStorage`.
 */

const CUSTOMER_PREVIEW_SESSION_KEY = 'jhoie_signatures_customer_session_v1';
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface CustomerSignInValidation {
  isValid: boolean;
  emailError?: string;
  passwordError?: string;
}

export interface CustomerSignUpValidation {
  isValid: boolean;
  fullNameError?: string;
  emailError?: string;
  passwordError?: string;
  confirmPasswordError?: string;
}

export function validateCustomerSignInInput(params: {
  email: string;
  password: string;
}): CustomerSignInValidation {
  const email = params.email.trim();
  const password = params.password;

  const emailError = EMAIL_REGEX.test(email)
    ? undefined
    : 'Please enter a valid email address.';
  const passwordError =
    password.trim().length >= 6
      ? undefined
      : 'Please enter your password (minimum 6 characters).';

  return {
    isValid: !emailError && !passwordError,
    emailError,
    passwordError,
  };
}

export function validateCustomerSignUpInput(params: {
  fullName: string;
  email: string;
  password: string;
  confirmPassword?: string;
}): CustomerSignUpValidation {
  const fullName = params.fullName.trim();
  const email = params.email.trim();
  const password = params.password;

  const fullNameError =
    fullName.length >= 2 && fullName.length <= 100
      ? undefined
      : 'Please enter your full name (minimum 2 characters).';

  const emailError = EMAIL_REGEX.test(email)
    ? undefined
    : 'Please enter a valid email address.';

  const passwordError =
    password.length >= 6
      ? undefined
      : 'Password must be at least 6 characters long.';

  const confirmPasswordError =
    params.confirmPassword !== undefined && params.confirmPassword !== password
      ? 'Passwords do not match.'
      : undefined;

  return {
    isValid: !fullNameError && !emailError && !passwordError && !confirmPasswordError,
    fullNameError,
    emailError,
    passwordError,
    confirmPasswordError,
  };
}

export function requireAuthenticatedCustomerSession(
  session: CustomerAuthSession | null | undefined,
  actionLabel = 'complete this action'
): CustomerAuthSession {
  if (!session?.isAuthenticated) {
    throw new Error(`Please sign in or create a customer account to ${actionLabel}.`);
  }
  return session;
}

export interface CustomerProfileUpdateValidation {
  isValid: boolean;
  fullNameError?: string;
  phoneError?: string;
}

export function validateCustomerProfileUpdate(params: {
  fullName: string;
  phone?: string;
}): CustomerProfileUpdateValidation {
  const fullName = params.fullName.trim();
  const phone = (params.phone || '').trim();

  const fullNameError =
    fullName.length >= 2 && fullName.length <= 100
      ? undefined
      : 'Full name must be between 2 and 100 characters.';

  let phoneError: string | undefined;
  if (phone) {
    const digits = phone.replace(/\D/g, '');
    if (!/^\+?[\d\s\-()]+$/.test(phone) || digits.length < 10 || digits.length > 15) {
      phoneError = 'Enter a valid phone number (10 to 15 digits) or leave blank.';
    }
  }

  return {
    isValid: !fullNameError && !phoneError,
    fullNameError,
    phoneError,
  };
}

function getEmailRedirectUrl(): string | undefined {
  if (typeof window === 'undefined' || !window.location?.origin) {
    return undefined;
  }
  return `${window.location.origin}${window.location.pathname || '/'}`;
}

function mapSupabaseAuthErrorMessage(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('invalid login credentials')) {
    return 'Incorrect email address or password. Please check your details and try again.';
  }
  if (lower.includes('email not confirmed')) {
    return 'Please confirm your email address using the verification link sent to your inbox before signing in.';
  }
  if (lower.includes('user already registered') || lower.includes('already been registered')) {
    return 'An account with this email address already exists. Please sign in instead.';
  }
  if (lower.includes('rate limit') || lower.includes('too many requests')) {
    return 'Too many authentication attempts. Please wait a moment before trying again.';
  }
  return message;
}

function normalizeRole(role: unknown): 'customer' | 'admin' | 'super_admin' {
  if (role === 'admin' || role === 'super_admin') return role;
  return 'customer';
}

async function fetchOwnProfile(userId: string): Promise<{
  fullName?: string;
  phone?: string;
  email?: string;
  role: 'customer' | 'admin' | 'super_admin';
  isActive: boolean;
}> {
  const client = getSupabaseClient();
  if (!client) {
    return { role: 'customer', isActive: true };
  }

  const { data, error } = await client
    .from('profiles')
    .select('email, full_name, phone, role, is_active')
    .eq('id', userId)
    .maybeSingle();

  if (error || !data) {
    return { role: 'customer', isActive: true };
  }

  return {
    fullName: data.full_name || undefined,
    phone: data.phone || undefined,
    email: data.email || undefined,
    role: normalizeRole(data.role),
    isActive: data.is_active !== false,
  };
}

function persistPreviewSession(session: CustomerAuthSession | null): void {
  try {
    if (typeof sessionStorage === 'undefined') return;
    if (!session) {
      sessionStorage.removeItem(CUSTOMER_PREVIEW_SESSION_KEY);
    } else {
      sessionStorage.setItem(CUSTOMER_PREVIEW_SESSION_KEY, JSON.stringify(session));
    }
  } catch {
    // Ignore storage quota or private-mode errors gracefully
  }
}

export const customerAuthService = {
  loadPreviewSession(): CustomerAuthSession | null {
    if (isSupabaseConfigured()) {
      return null;
    }
    try {
      if (typeof sessionStorage === 'undefined') return null;
      const raw = sessionStorage.getItem(CUSTOMER_PREVIEW_SESSION_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as CustomerAuthSession;
      if (!parsed?.isAuthenticated || !parsed.email || !parsed.userId) return null;
      return parsed;
    } catch {
      return null;
    }
  },

  async restoreSession(): Promise<CustomerAuthSession | null> {
    if (!isSupabaseConfigured()) {
      return this.loadPreviewSession();
    }

    const client = getSupabaseClient();
    if (!client) return null;

    const {
      data: { session },
      error,
    } = await client.auth.getSession();

    if (error || !session?.user) {
      return null;
    }

    const profile = await fetchOwnProfile(session.user.id);
    if (!profile.isActive) {
      try {
        await client.auth.signOut();
      } catch {
        // Ignore cleanup failure
      }
      return null;
    }

    const email = profile.email || session.user.email || '';
    const metaName =
      typeof session.user.user_metadata?.full_name === 'string'
        ? session.user.user_metadata.full_name.trim()
        : '';

    return {
      isAuthenticated: true,
      mode: 'supabase_auth',
      userId: session.user.id,
      email,
      fullName: profile.fullName || metaName || email.split('@')[0] || 'Valued Client',
      phone: profile.phone,
      role: profile.role,
      emailConfirmed: Boolean(session.user.email_confirmed_at || session.user.confirmed_at),
      signedInAt: new Date().toISOString(),
    };
  },

  async signUpCustomer(params: {
    fullName: string;
    email: string;
    password: string;
    confirmPassword?: string;
  }): Promise<CustomerSignUpResult> {
    const validation = validateCustomerSignUpInput(params);
    if (!validation.isValid) {
      throw new Error(
        validation.fullNameError ||
          validation.emailError ||
          validation.passwordError ||
          validation.confirmPasswordError ||
          'Please check your registration details.'
      );
    }

    const cleanName = params.fullName.trim();
    const cleanEmail = params.email.trim().toLowerCase();

    if (!isSupabaseConfigured()) {
      const previewSession: CustomerAuthSession = {
        isAuthenticated: true,
        mode: 'local_preview',
        userId: `preview_${Date.now().toString(36)}`,
        email: cleanEmail,
        fullName: cleanName,
        role: 'customer',
        emailConfirmed: true,
        signedInAt: new Date().toISOString(),
      };
      persistPreviewSession(previewSession);
      return {
        status: 'signed_in',
        email: cleanEmail,
        session: previewSession,
        message: `Welcome to JHOIE SIGNATURES, ${cleanName}.`,
      };
    }

    const client = getSupabaseClient();
    if (!client) {
      throw new Error('Authentication service is unavailable right now.');
    }

    const { data, error } = await client.auth.signUp({
      email: cleanEmail,
      password: params.password,
      options: {
        data: {
          full_name: cleanName,
        },
        emailRedirectTo: getEmailRedirectUrl(),
      },
    });

    if (error) {
      throw new Error(mapSupabaseAuthErrorMessage(error.message));
    }

    if (!data.user) {
      throw new Error('Unable to create your account right now. Please try again.');
    }

    // Supabase returns an empty identities array when an already-confirmed email registers again
    if (Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      throw new Error('An account with this email address already exists. Please sign in instead.');
    }

    if (data.session?.user) {
      const profile = await fetchOwnProfile(data.session.user.id);
      if (!profile.isActive) {
        await client.auth.signOut();
        throw new Error('This account has been deactivated. Please contact the studio.');
      }

      const session: CustomerAuthSession = {
        isAuthenticated: true,
        mode: 'supabase_auth',
        userId: data.session.user.id,
        email: profile.email || data.session.user.email || cleanEmail,
        fullName: profile.fullName || cleanName,
        phone: profile.phone,
        role: profile.role,
        emailConfirmed: Boolean(
          data.session.user.email_confirmed_at || data.session.user.confirmed_at
        ),
        signedInAt: new Date().toISOString(),
      };

      return {
        status: 'signed_in',
        email: session.email,
        session,
        message: `Welcome to JHOIE SIGNATURES, ${session.fullName}.`,
      };
    }

    return {
      status: 'confirmation_required',
      email: cleanEmail,
      session: null,
      message: `We have sent a confirmation link to ${cleanEmail}. Please verify your email address before signing in.`,
    };
  },

  async signInCustomer(params: {
    email: string;
    password: string;
  }): Promise<CustomerAuthSession> {
    const validation = validateCustomerSignInInput(params);
    if (!validation.isValid) {
      throw new Error(
        validation.emailError || validation.passwordError || 'Invalid sign-in credentials.'
      );
    }

    const cleanEmail = params.email.trim().toLowerCase();

    if (!isSupabaseConfigured()) {
      const namePart = cleanEmail.split('@')[0] || 'Valued Client';
      const formattedName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
      const previewSession: CustomerAuthSession = {
        isAuthenticated: true,
        mode: 'local_preview',
        userId: `preview_${cleanEmail}`,
        email: cleanEmail,
        fullName: formattedName,
        role: 'customer',
        emailConfirmed: true,
        signedInAt: new Date().toISOString(),
      };
      persistPreviewSession(previewSession);
      return previewSession;
    }

    const client = getSupabaseClient();
    if (!client) {
      throw new Error('Authentication service is unavailable right now.');
    }

    const { data, error } = await client.auth.signInWithPassword({
      email: cleanEmail,
      password: params.password,
    });

    if (error || !data.user) {
      throw new Error(
        mapSupabaseAuthErrorMessage(error?.message || 'Unable to sign in with those credentials.')
      );
    }

    const profile = await fetchOwnProfile(data.user.id);
    if (!profile.isActive) {
      await client.auth.signOut();
      throw new Error(
        'This account is currently inactive. Please contact JHOIE SIGNATURES for assistance.'
      );
    }

    const metaName =
      typeof data.user.user_metadata?.full_name === 'string'
        ? data.user.user_metadata.full_name.trim()
        : '';

    const resolvedEmail = profile.email || data.user.email || cleanEmail;

    return {
      isAuthenticated: true,
      mode: 'supabase_auth',
      userId: data.user.id,
      email: resolvedEmail,
      fullName: profile.fullName || metaName || resolvedEmail.split('@')[0] || 'Valued Client',
      phone: profile.phone,
      role: profile.role,
      emailConfirmed: Boolean(data.user.email_confirmed_at || data.user.confirmed_at),
      signedInAt: new Date().toISOString(),
    };
  },

  async resendConfirmationEmail(email: string): Promise<void> {
    const cleanEmail = email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(cleanEmail)) {
      throw new Error('Please enter a valid email address.');
    }

    if (!isSupabaseConfigured()) {
      return;
    }

    const client = getSupabaseClient();
    if (!client) {
      throw new Error('Authentication service is unavailable right now.');
    }

    const { error } = await client.auth.resend({
      type: 'signup',
      email: cleanEmail,
      options: {
        emailRedirectTo: getEmailRedirectUrl(),
      },
    });

    if (error) {
      throw new Error(mapSupabaseAuthErrorMessage(error.message));
    }
  },

  async updateProfile(
    currentSession: CustomerAuthSession | null | undefined,
    params: { fullName: string; phone?: string }
  ): Promise<CustomerAuthSession> {
    const active = requireAuthenticatedCustomerSession(currentSession, 'update your profile');
    const validation = validateCustomerProfileUpdate(params);
    if (!validation.isValid) {
      throw new Error(
        validation.fullNameError || validation.phoneError || 'Please review your profile details.'
      );
    }

    const cleanName = params.fullName.trim();
    const cleanPhone = (params.phone || '').trim() || undefined;

    if (!isSupabaseConfigured()) {
      const updatedPreview: CustomerAuthSession = {
        ...active,
        fullName: cleanName,
        phone: cleanPhone,
      };
      persistPreviewSession(updatedPreview);
      return updatedPreview;
    }

    const client = getSupabaseClient();
    if (!client) {
      throw new Error('Authentication service is unavailable right now.');
    }

    const { error: profileErr } = await client
      .from('profiles')
      .update({
        full_name: cleanName,
        phone: cleanPhone ?? null,
      })
      .eq('id', active.userId);

    if (profileErr) {
      throw new Error(profileErr.message || 'Unable to update your profile right now.');
    }

    return {
      ...active,
      fullName: cleanName,
      phone: cleanPhone,
    };
  },

  async signOut(): Promise<void> {
    const client = getSupabaseClient();
    if (client) {
      try {
        await client.auth.signOut();
      } catch {
        // Ignore network errors while clearing session
      }
    }
    persistPreviewSession(null);
  },
};
