import { ArrowLeft, Lock, LogOut, ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import {
  getBackendReadinessStatus,
  validateAdminLoginInput,
} from '../../services/adminAuthService';

export function AdminLoginGate() {
  const {
    adminLogin,
    customerSession,
    customerLogout,
    navigate,
    showToast,
    websiteSettings,
  } = useStore();

  const [email, setEmail] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [emailError, setEmailError] = useState<string | undefined>();
  const [passphraseError, setPassphraseError] = useState<string | undefined>();
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const readiness = getBackendReadinessStatus();
  const isSignedInAsNonAdminCustomer =
    Boolean(customerSession?.isAuthenticated) &&
    (readiness.supabaseConfigured || customerSession?.role === 'customer');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateAdminLoginInput({
      email,
      passphrase,
      requireStrongPassword: readiness.supabaseConfigured,
    });

    if (!validation.isValid) {
      setEmailError(validation.emailError);
      setPassphraseError(validation.passphraseError);
      setAuthError(null);
      return;
    }

    setEmailError(undefined);
    setPassphraseError(undefined);
    setAuthError(null);
    setIsSubmitting(true);

    try {
      const session = await adminLogin({ email, passphrase });
      showToast(`Signed in to Admin Studio (${session.adminEmail})`);
    } catch (err) {
      setAuthError(
        err instanceof Error ? err.message : 'Unable to start admin session.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#171717] flex flex-col justify-center px-4 py-12">
      <div className="max-w-md w-full mx-auto space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 mx-auto bg-[#171717] text-[#C6A45C] flex items-center justify-center">
            <Lock className="w-5 h-5" aria-hidden="true" />
          </div>
          <p className="font-display text-2xl font-semibold tracking-[0.12em] text-[#171717]">
            {websiteSettings.brandName}
          </p>
          <p className="font-display italic text-base text-[#A68642]">
            {websiteSettings.tagline}
          </p>
          <h1 className="text-sm font-semibold uppercase tracking-[0.16em] text-[#171717]/75 pt-2">
            Private Admin Studio Sign-In
          </h1>
        </div>

        {isSignedInAsNonAdminCustomer && customerSession ? (
          <div
            role="alert"
            className="bg-white border border-red-300 p-6 sm:p-8 space-y-5 shadow-sm"
          >
            <div className="flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-red-700 shrink-0 mt-0.5" aria-hidden="true" />
              <div className="space-y-1">
                <h2 className="text-base font-semibold text-red-900">
                  Access Denied — Administrator Role Required
                </h2>
                <p className="text-xs sm:text-sm text-[#171717]/80 leading-relaxed">
                  You are currently signed in as customer{' '}
                  <strong className="text-[#171717]">{customerSession.email}</strong> (role:{' '}
                  <code className="font-mono">{customerSession.role}</code>). Only verified{' '}
                  <code className="font-mono">admin</code> or{' '}
                  <code className="font-mono">super_admin</code> accounts can enter the Admin
                  Studio.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => navigate('home')}
                className="w-full py-3 px-4 bg-[#171717] text-white text-xs sm:text-sm font-medium hover:bg-[#2a2a2a] transition-colors cursor-pointer"
              >
                Return to Storefront
              </button>
              <button
                type="button"
                onClick={async () => {
                  await customerLogout();
                  showToast('Signed out of customer account');
                }}
                className="w-full py-3 px-4 border border-[#171717]/20 bg-white text-[#171717] text-xs sm:text-sm font-medium hover:border-[#C6A45C] hover:bg-[#FAF7F2] transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogOut className="w-4 h-4 text-[#A68642]" aria-hidden="true" />
                <span>Sign Out &amp; Switch to Admin Account</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Security & Authentication Mode Disclosure */}
            <div className="p-4 bg-white border border-[#C6A45C]/50 flex items-start gap-3 text-xs text-[#171717]/80 leading-relaxed">
              <ShieldAlert className="w-4 h-4 text-[#A68642] shrink-0 mt-0.5" aria-hidden="true" />
              <div className="space-y-1">
                <p className="font-semibold text-[#171717]">
                  {readiness.supabaseConfigured
                    ? 'Supabase Authentication & RLS Active'
                    : 'Local Preview Authentication Mode'}
                </p>
                {readiness.supabaseConfigured ? (
                  <p>
                    Sign in with your Supabase administrator email and password. Server-side profile
                    role verification and PostgreSQL Row-Level Security (RLS) protect Admin routes and
                    business data.
                  </p>
                ) : (
                  <p>
                    No passwords are stored in client code. This preview gate protects Admin routes
                    inside your browser session (<code className="font-mono">sessionStorage</code>).
                    Connect Supabase Auth credentials in <code className="font-mono">.env</code> to
                    enable live administrator authentication and RLS.
                  </p>
                )}
              </div>
            </div>

            <form
              onSubmit={handleSubmit}
              noValidate
              className="bg-white border border-[#171717]/15 p-6 sm:p-8 space-y-5 shadow-sm"
            >
              {authError && (
                <div role="alert" className="p-3 bg-red-50 border border-red-200 text-xs text-red-800">
                  {authError}
                </div>
              )}

              <div>
                <label
                  htmlFor="admin-login-email"
                  className="block text-xs font-semibold text-[#171717] mb-1.5"
                >
                  Administrator Email <span className="text-[#A68642]">*</span>
                </label>
                <input
                  id="admin-login-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) setEmailError(undefined);
                  }}
                  placeholder="studio-owner@example.com"
                  aria-invalid={Boolean(emailError)}
                  className={`w-full px-3.5 py-2.5 text-sm border focus:outline-none ${
                    emailError
                      ? 'border-red-500 focus:border-red-600'
                      : 'border-[#171717]/20 focus:border-[#C6A45C]'
                  }`}
                />
                {emailError && <p className="mt-1 text-xs text-red-700">{emailError}</p>}
              </div>

              <div>
                <label
                  htmlFor="admin-login-passphrase"
                  className="block text-xs font-semibold text-[#171717] mb-1.5"
                >
                  {readiness.supabaseConfigured ? 'Administrator Password' : 'Session Passphrase'}{' '}
                  <span className="text-[#A68642]">*</span>
                </label>
                <input
                  id="admin-login-passphrase"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={passphrase}
                  onChange={(e) => {
                    setPassphrase(e.target.value);
                    if (passphraseError) setPassphraseError(undefined);
                  }}
                  placeholder={
                    readiness.supabaseConfigured
                      ? 'Enter your Supabase account password'
                      : 'Minimum 4 characters for preview session'
                  }
                  aria-invalid={Boolean(passphraseError)}
                  className={`w-full px-3.5 py-2.5 text-sm border focus:outline-none ${
                    passphraseError
                      ? 'border-red-500 focus:border-red-600'
                      : 'border-[#171717]/20 focus:border-[#C6A45C]'
                  }`}
                />
                {passphraseError && (
                  <p className="mt-1 text-xs text-red-700">{passphraseError}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-[#171717] text-white text-sm font-medium hover:bg-[#2a2a2a] disabled:opacity-60 transition-colors cursor-pointer"
              >
                {isSubmitting ? 'Signing In...' : 'Enter Admin Studio'}
              </button>
            </form>
          </>
        )}

        <div className="text-center">
          <button
            type="button"
            onClick={() => navigate('home')}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#171717]/75 hover:text-[#171717] cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#A68642]" aria-hidden="true" />
            <span>Return to Storefront</span>
          </button>
        </div>
      </div>
    </div>
  );
}
