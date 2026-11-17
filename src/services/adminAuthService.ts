import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabaseClient';
import type { AdminAuthSession } from '../types/fashion';

/**
 * Admin Authentication Layer for JHOIE SIGNATURES.
 *
 * - When `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are configured:
 *   Uses Supabase Authentication (`signInWithPassword`, `getSession`, `signOut`)
 *   and verifies administrator privileges server-side via `public.verify_admin_access()`
 *   against `public.profiles` (`role IN ('admin', 'super_admin') AND is_active = true`).
 *   Ordinary customer accounts are rejected and signed out immediately.
 * - When Supabase env vars are not yet configured:
 *   Operates strictly in explicit `local_preview` mode inside `sessionStorage`.
 */

const ADMIN_SESSION_STORAGE_KEY = 'jhoie_signatures_admin_session_v1';

export interface SupabaseReadinessStatus {
  supabaseConfigured: boolean;
  authMode: 'supabase_auth' | 'local_preview';
  storageMode: 'supabase_storage' | 'browser_local_storage';
  databaseMode: 'supabase_postgres' | 'browser_local_storage';
  missingRequirements: string[];
}

export function getBackendReadinessStatus(): SupabaseReadinessStatus {
  const supabaseConfigured = isSupabaseConfigured();

  return {
    supabaseConfigured,
    authMode: supabaseConfigured ? 'supabase_auth' : 'local_preview',
    storageMode: supabaseConfigured ? 'supabase_storage' : 'browser_local_storage',
    databaseMode: supabaseConfigured ? 'supabase_postgres' : 'browser_local_storage',
    missingRequirements: supabaseConfigured
      ? []
      : [
          'Connect Supabase project URL and anon key (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)',
          'Run SQL migrations in supabase/migrations/ (001 through 004) inside your Supabase SQL Editor',
          'Promote your studio owner user to role = \'admin\' in public.profiles',
          'Ensure Supabase Storage buckets product-images (public) and custom-references (private) are created',
        ],
  };
}

export function validateAdminLoginInput(params: {
  email: string;
  passphrase: string;
  requireStrongPassword?: boolean;
}): { isValid: boolean; emailError?: string; passphraseError?: string } {
  const email = params.email.trim();
  const passphrase = params.passphrase.trim();
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const minLength = params.requireStrongPassword ? 6 : 4;

  return {
    isValid: emailValid && passphrase.length >= minLength,
    emailError: emailValid ? undefined : 'Please enter a valid administrator email address.',
    passphraseError:
      passphrase.length >= minLength
        ? undefined
        : params.requireStrongPassword
        ? 'Please enter your administrator password (minimum 6 characters).'
        : 'Please enter a session passphrase (minimum 4 characters for preview; Supabase verifies real passwords).',
  };
}

interface VerifiedAdminRpcResult {
  is_admin?: boolean;
  role?: string;
  is_active?: boolean;
  email?: string;
  full_name?: string;
}

async function verifyCurrentUserIsAdmin(): Promise<{
  isAdmin: boolean;
  role?: 'admin' | 'super_admin';
  email?: string;
  fullName?: string;
}> {
  const client = getSupabaseClient();
  if (!client) return { isAdmin: false };

  const { data: rpcData, error: rpcError } = await client.rpc('verify_admin_access');
  if (!rpcError && rpcData && typeof rpcData === 'object') {
    const parsed = rpcData as VerifiedAdminRpcResult;
    const isAdmin =
      Boolean(parsed.is_admin) &&
      (parsed.role === 'admin' || parsed.role === 'super_admin');
    return {
      isAdmin,
      role: parsed.role === 'super_admin' ? 'super_admin' : parsed.role === 'admin' ? 'admin' : undefined,
      email: parsed.email || undefined,
      fullName: parsed.full_name || undefined,
    };
  }

  // Fallback direct profile query if RPC isn't accessible yet (protected by RLS: id = auth.uid())
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return { isAdmin: false };

  const { data: profile, error: profileError } = await client
    .from('profiles')
    .select('role, is_active, email, full_name')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError) {
    throw new Error(
      'Unable to verify administrator role against Supabase. Confirm migrations 001–003 have been executed.'
    );
  }

  if (!profile || !profile.is_active || (profile.role !== 'admin' && profile.role !== 'super_admin')) {
    return { isAdmin: false };
  }

  return {
    isAdmin: true,
    role: profile.role,
    email: profile.email || user.email || '',
    fullName: profile.full_name || undefined,
  };
}

export const adminAuthService = {
  loadSession(): AdminAuthSession | null {
    // When Supabase Auth is active, rely on verified server-backed session restoration rather than local storage
    if (isSupabaseConfigured()) {
      return null;
    }

    try {
      const storage = typeof sessionStorage !== 'undefined' ? sessionStorage : null;
      if (!storage) return null;
      const raw = storage.getItem(ADMIN_SESSION_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as AdminAuthSession;
      if (!parsed || !parsed.isAuthenticated || !parsed.adminEmail) return null;
      return parsed;
    } catch {
      return null;
    }
  },

  async restoreSupabaseAdminSession(): Promise<AdminAuthSession | null> {
    const client = getSupabaseClient();
    if (!client) return this.loadSession();

    const {
      data: { session },
      error,
    } = await client.auth.getSession();

    if (error || !session?.user) {
      return null;
    }

    try {
      const verification = await verifyCurrentUserIsAdmin();
      if (!verification.isAdmin) {
        return null;
      }

      const email = verification.email || session.user.email || '';
      return {
        isAuthenticated: true,
        mode: 'supabase_auth',
        userId: session.user.id,
        role: verification.role,
        adminEmail: email,
        displayName: verification.fullName || email.split('@')[0] || 'Studio Admin',
        signedInAt: new Date().toISOString(),
      };
    } catch {
      return null;
    }
  },

  async signIn(params: { email: string; passphrase: string }): Promise<AdminAuthSession> {
    const useSupabase = isSupabaseConfigured();
    const validation = validateAdminLoginInput({
      ...params,
      requireStrongPassword: useSupabase,
    });
    if (!validation.isValid) {
      throw new Error(validation.emailError || validation.passphraseError || 'Invalid login input.');
    }

    if (useSupabase) {
      const client = getSupabaseClient();
      if (!client) {
        throw new Error('Supabase client could not be initialized.');
      }

      const cleanEmail = params.email.trim().toLowerCase();
      const { data, error } = await client.auth.signInWithPassword({
        email: cleanEmail,
        password: params.passphrase,
      });

      if (error || !data.user) {
        throw new Error(
          error?.message || 'Invalid administrator email or password. Please try again.'
        );
      }

      let verification: Awaited<ReturnType<typeof verifyCurrentUserIsAdmin>>;
      try {
        verification = await verifyCurrentUserIsAdmin();
      } catch (verifyErr) {
        await client.auth.signOut();
        throw verifyErr;
      }

      if (!verification.isAdmin) {
        await client.auth.signOut();
        throw new Error(
          'Access denied: this account does not have administrator permissions for the Admin Studio.'
        );
      }

      const resolvedEmail = verification.email || data.user.email || cleanEmail;
      return {
        isAuthenticated: true,
        mode: 'supabase_auth',
        userId: data.user.id,
        role: verification.role,
        adminEmail: resolvedEmail,
        displayName: verification.fullName || resolvedEmail.split('@')[0] || 'Studio Admin',
        signedInAt: new Date().toISOString(),
      };
    }

    return this.signInPreviewSession(params);
  },

  async signInPreviewSession(params: {
    email: string;
    passphrase: string;
  }): Promise<AdminAuthSession> {
    const validation = validateAdminLoginInput(params);
    if (!validation.isValid) {
      throw new Error(validation.emailError || validation.passphraseError || 'Invalid login input.');
    }

    if (isSupabaseConfigured()) {
      return this.signIn(params);
    }

    const cleanEmail = params.email.trim().toLowerCase();
    const namePart = cleanEmail.split('@')[0] || 'Studio Admin';

    const session: AdminAuthSession = {
      isAuthenticated: true,
      mode: 'local_preview',
      adminEmail: cleanEmail,
      displayName: namePart,
      signedInAt: new Date().toISOString(),
    };

    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem(ADMIN_SESSION_STORAGE_KEY, JSON.stringify(session));
      }
    } catch {
      // Ignore storage failures gracefully
    }

    return session;
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

    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
      }
    } catch {
      // Ignore storage errors gracefully
    }
  },
};
