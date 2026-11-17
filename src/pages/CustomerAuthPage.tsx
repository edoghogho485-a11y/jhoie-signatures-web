import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  LogOut,
  MailCheck,
  ShoppingBag,
  Sparkles,
  UserPlus,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useStore } from '../context/StoreContext';
import {
  validateCustomerProfileUpdate,
  validateCustomerSignInInput,
  validateCustomerSignUpInput,
} from '../services/customerAuthService';

interface CustomerAuthPageProps {
  mode: 'login' | 'register';
}

export function CustomerAuthPage({ mode }: CustomerAuthPageProps) {
  const {
    customerSession,
    isAuthLoading,
    isSupabaseMode,
    postAuthRedirect,
    setPostAuthRedirect,
    cartCount,
    navigate,
    customerLogin,
    customerRegister,
    customerLogout,
    resendCustomerConfirmation,
    updateCustomerProfile,
    showToast,
    websiteSettings,
  } = useStore();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [profileName, setProfileName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileErrors, setProfileErrors] = useState<{ fullName?: string; phone?: string }>({});
  const [profileSaveError, setProfileSaveError] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<{
    fullName?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(null);
  const [confirmationNote, setConfirmationNote] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    if (customerSession?.isAuthenticated) {
      setProfileName(customerSession.fullName || '');
      setProfilePhone(customerSession.phone || '');
      setProfileErrors({});
      setProfileSaveError(null);
    }
  }, [customerSession?.fullName, customerSession?.isAuthenticated, customerSession?.phone]);

  // Reset transient form errors when switching between login and register views
  useEffect(() => {
    setFieldErrors({});
    setAuthError(null);
  }, [mode]);

  const completeRedirectNavigation = (welcomeMessage: string) => {
    const target = postAuthRedirect;
    setPostAuthRedirect(null);
    showToast(welcomeMessage);
    if (target === 'checkout' || target === 'custom-orders') {
      navigate(target);
      return;
    }
    navigate(cartCount > 0 ? 'checkout' : 'shop', cartCount > 0 ? undefined : { category: 'All' });
  };

  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    const validation = validateCustomerSignInInput({ email, password });
    if (!validation.isValid) {
      setFieldErrors({
        email: validation.emailError,
        password: validation.passwordError,
      });
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);
    try {
      const session = await customerLogin({ email, password });
      completeRedirectNavigation(`Welcome back, ${session.fullName}`);
    } catch (err) {
      const msg =
        err instanceof Error && err.message
          ? err.message
          : 'Unable to sign in right now. Please try again.';
      setAuthError(msg);
      if (msg.toLowerCase().includes('confirm your email')) {
        setConfirmationEmail(email.trim().toLowerCase());
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    const validation = validateCustomerSignUpInput({
      fullName,
      email,
      password,
      confirmPassword,
    });
    if (!validation.isValid) {
      setFieldErrors({
        fullName: validation.fullNameError,
        email: validation.emailError,
        password: validation.passwordError,
        confirmPassword: validation.confirmPasswordError,
      });
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);
    try {
      const result = await customerRegister({
        fullName,
        email,
        password,
        confirmPassword,
      });

      if (result.status === 'signed_in' && result.session) {
        completeRedirectNavigation(`Account created. Welcome, ${result.session.fullName}`);
        return;
      }

      setConfirmationEmail(result.email);
      setConfirmationNote(result.message);
      setPassword('');
      setConfirmPassword('');
      showToast('Verification email sent — please check your inbox');
    } catch (err) {
      setAuthError(
        err instanceof Error && err.message
          ? err.message
          : 'Unable to create your account right now. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendConfirmation = async () => {
    const targetEmail = (confirmationEmail || email).trim().toLowerCase();
    if (!targetEmail) return;

    setIsResending(true);
    setAuthError(null);
    try {
      await resendCustomerConfirmation(targetEmail);
      showToast(`Verification email re-sent to ${targetEmail}`);
    } catch (err) {
      setAuthError(
        err instanceof Error && err.message
          ? err.message
          : 'Unable to resend verification email right now.'
      );
    } finally {
      setIsResending(false);
    }
  };

  const handleSignOut = async () => {
    await customerLogout();
    showToast('You have signed out');
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaveError(null);

    const validation = validateCustomerProfileUpdate({
      fullName: profileName,
      phone: profilePhone,
    });
    if (!validation.isValid) {
      setProfileErrors({
        fullName: validation.fullNameError,
        phone: validation.phoneError,
      });
      return;
    }

    setProfileErrors({});
    setIsSavingProfile(true);
    try {
      await updateCustomerProfile({
        fullName: profileName,
        phone: profilePhone,
      });
      showToast('Client profile details updated');
    } catch (err) {
      setProfileSaveError(
        err instanceof Error && err.message
          ? err.message
          : 'Unable to update your profile right now.'
      );
    } finally {
      setIsSavingProfile(false);
    }
  };

  const switchMode = (nextMode: 'login' | 'register') => {
    setConfirmationEmail(null);
    setConfirmationNote(null);
    navigate(nextMode, { redirectAfterAuth: postAuthRedirect });
  };

  return (
    <div className="bg-[#FAF7F2] min-h-[75vh] py-12 lg:py-16 px-4 sm:px-6">
      <div className="max-w-lg mx-auto space-y-6">
        <button
          type="button"
          onClick={() => navigate(postAuthRedirect || 'shop')}
          className="inline-flex items-center gap-2 text-xs font-medium text-[#171717]/75 hover:text-[#171717] cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-[#A68642]" aria-hidden="true" />
          <span>
            {postAuthRedirect === 'checkout'
              ? 'Back to Checkout'
              : postAuthRedirect === 'custom-orders'
              ? 'Back to Custom Orders'
              : 'Continue Shopping'}
          </span>
        </button>

        {/* Contextual Cart / Redirect Banner */}
        {postAuthRedirect === 'checkout' && !customerSession?.isAuthenticated && (
          <div className="p-4 bg-white border border-[#C6A45C]/60 flex items-start gap-3 text-xs sm:text-sm text-[#171717]/85">
            <ShoppingBag className="w-4 h-4 text-[#A68642] shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="font-semibold text-[#171717]">
                Your shopping bag is saved ({cartCount} {cartCount === 1 ? 'item' : 'items'})
              </p>
              <p className="text-xs text-[#171717]/70 mt-0.5 leading-relaxed">
                Sign in or create a customer account below to complete your website order request.
                You will return straight to checkout with your bag intact.
              </p>
            </div>
          </div>
        )}

        {postAuthRedirect === 'custom-orders' && !customerSession?.isAuthenticated && (
          <div className="p-4 bg-white border border-[#C6A45C]/60 flex items-start gap-3 text-xs sm:text-sm text-[#171717]/85">
            <Sparkles className="w-4 h-4 text-[#A68642] shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="font-semibold text-[#171717]">Customer Account Required for Custom Orders</p>
              <p className="text-xs text-[#171717]/70 mt-0.5 leading-relaxed">
                Sign in or register to submit your bespoke measurements and inspiration images to
                the {websiteSettings.brandName} atelier.
              </p>
            </div>
          </div>
        )}

        {isAuthLoading ? (
          <div className="bg-white border border-[#171717]/15 p-8 sm:p-10 text-center space-y-3 shadow-sm">
            <div className="w-10 h-10 mx-auto bg-[#171717] text-[#C6A45C] flex items-center justify-center">
              <Lock className="w-4 h-4" aria-hidden="true" />
            </div>
            <p className="font-display text-2xl text-[#171717]">Verifying Account Session</p>
            <p className="text-xs text-[#171717]/65">
              Checking your {websiteSettings.brandName} authentication status...
            </p>
          </div>
        ) : customerSession?.isAuthenticated ? (
          <div className="bg-white border border-[#171717]/15 p-7 sm:p-10 space-y-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 bg-[#171717] text-[#C6A45C] flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
              </div>
              <div className="space-y-1 min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#A68642]">
                  Signed In
                </p>
                <h1 className="font-display text-3xl font-medium text-[#171717] truncate">
                  {customerSession.fullName}
                </h1>
                <p className="text-sm text-[#171717]/70 break-all">{customerSession.email}</p>
              </div>
            </div>

            <div className="p-4 bg-[#FAF7F2] border border-[#171717]/10 text-xs text-[#171717]/80 leading-relaxed">
              Your customer account is active. You can complete website checkout, submit custom
              made-to-measure briefs, and keep your bag synced across refreshes.
            </div>

            <form
              onSubmit={handleSaveProfile}
              noValidate
              className="pt-4 border-t border-[#171717]/10 space-y-4"
            >
              <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-[#171717]/75">
                Saved Client Contact Details
              </h2>

              {profileSaveError && (
                <div role="alert" className="p-3 bg-red-50 border border-red-200 text-xs text-red-800">
                  {profileSaveError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="profile-full-name"
                    className="block text-xs font-semibold text-[#171717] mb-1.5"
                  >
                    Full Name <span className="text-[#A68642]">*</span>
                  </label>
                  <input
                    id="profile-full-name"
                    type="text"
                    value={profileName}
                    onChange={(e) => {
                      setProfileName(e.target.value);
                      if (profileErrors.fullName) {
                        setProfileErrors((prev) => ({ ...prev, fullName: undefined }));
                      }
                    }}
                    className={`w-full px-3 py-2 text-sm border bg-white focus:outline-none ${
                      profileErrors.fullName
                        ? 'border-red-500 focus:border-red-600'
                        : 'border-[#171717]/20 focus:border-[#C6A45C]'
                    }`}
                  />
                  {profileErrors.fullName && (
                    <p className="mt-1 text-xs text-red-700">{profileErrors.fullName}</p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="profile-phone"
                    className="block text-xs font-semibold text-[#171717] mb-1.5"
                  >
                    Phone / WhatsApp{' '}
                    <span className="font-normal text-[#171717]/55">(Optional)</span>
                  </label>
                  <input
                    id="profile-phone"
                    type="tel"
                    value={profilePhone}
                    onChange={(e) => {
                      setProfilePhone(e.target.value);
                      if (profileErrors.phone) {
                        setProfileErrors((prev) => ({ ...prev, phone: undefined }));
                      }
                    }}
                    placeholder="+234 801 234 5678"
                    className={`w-full px-3 py-2 text-sm border bg-white focus:outline-none ${
                      profileErrors.phone
                        ? 'border-red-500 focus:border-red-600'
                        : 'border-[#171717]/20 focus:border-[#C6A45C]'
                    }`}
                  />
                  {profileErrors.phone && (
                    <p className="mt-1 text-xs text-red-700">{profileErrors.phone}</p>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={isSavingProfile}
                className="px-4 py-2 border border-[#171717]/20 bg-[#FAF7F2] text-xs font-medium text-[#171717] hover:border-[#C6A45C] hover:bg-white disabled:opacity-60 transition-colors cursor-pointer"
              >
                {isSavingProfile ? 'Saving Details...' : 'Save Contact Details'}
              </button>
            </form>

            <div className="flex flex-col sm:flex-row flex-wrap gap-3 pt-2 border-t border-[#171717]/10">
              {postAuthRedirect ? (
                <button
                  type="button"
                  onClick={() => {
                    const target = postAuthRedirect;
                    setPostAuthRedirect(null);
                    navigate(target);
                  }}
                  className="flex-1 py-3 px-5 bg-[#171717] text-white text-xs sm:text-sm font-medium hover:bg-[#2a2a2a] transition-colors cursor-pointer"
                >
                  {postAuthRedirect === 'checkout'
                    ? 'Continue to Checkout'
                    : 'Continue to Custom Orders'}
                </button>
              ) : cartCount > 0 ? (
                <button
                  type="button"
                  onClick={() => navigate('checkout')}
                  className="flex-1 py-3 px-5 bg-[#171717] text-white text-xs sm:text-sm font-medium hover:bg-[#2a2a2a] transition-colors cursor-pointer"
                >
                  Proceed to Checkout ({cartCount})
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => navigate('shop', { category: 'All' })}
                  className="flex-1 py-3 px-5 bg-[#171717] text-white text-xs sm:text-sm font-medium hover:bg-[#2a2a2a] transition-colors cursor-pointer"
                >
                  Browse Shop
                </button>
              )}

              <button
                type="button"
                onClick={handleSignOut}
                className="py-3 px-5 border border-[#171717]/20 bg-white text-[#171717] text-xs sm:text-sm font-medium hover:border-red-400 hover:text-red-700 transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogOut className="w-4 h-4" aria-hidden="true" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        ) : confirmationEmail && mode === 'register' ? (
          <div className="bg-white border border-[#171717]/15 p-7 sm:p-10 space-y-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 bg-[#171717] text-[#C6A45C] flex items-center justify-center shrink-0">
                <MailCheck className="w-5 h-5" aria-hidden="true" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#A68642]">
                  Verify Your Email
                </p>
                <h1 className="font-display text-3xl font-medium text-[#171717]">
                  Check Your Inbox
                </h1>
              </div>
            </div>

            <p className="text-sm text-[#171717]/80 leading-relaxed">
              {confirmationNote ||
                `We sent a confirmation link to ${confirmationEmail}. Please verify your email address before signing in.`}
            </p>

            {authError && (
              <div role="alert" className="p-3 bg-red-50 border border-red-200 text-xs text-red-800">
                {authError}
              </div>
            )}

            <div className="p-4 bg-[#FAF7F2] border border-[#171717]/10 text-xs text-[#171717]/75 space-y-1.5">
              <p className="font-semibold text-[#171717]">After verifying your email:</p>
              <p>
                Return here and sign in with your email and password. Your shopping bag remains
                saved in this browser.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="flex-1 py-3 px-5 bg-[#171717] text-white text-sm font-medium hover:bg-[#2a2a2a] transition-colors cursor-pointer"
              >
                Go to Sign In
              </button>
              <button
                type="button"
                disabled={isResending}
                onClick={handleResendConfirmation}
                className="py-3 px-5 border border-[#171717]/20 bg-white text-[#171717] text-sm font-medium hover:border-[#C6A45C] hover:bg-[#FAF7F2] disabled:opacity-60 transition-colors cursor-pointer"
              >
                {isResending ? 'Sending...' : 'Resend Link'}
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-[#171717]/15 shadow-sm overflow-hidden">
            {/* Mode Tabs */}
            <div className="grid grid-cols-2 border-b border-[#171717]/10 bg-[#FAF7F2]">
              <button
                type="button"
                onClick={() => switchMode('login')}
                className={`py-4 text-xs sm:text-sm font-semibold tracking-wide uppercase transition-colors cursor-pointer ${
                  mode === 'login'
                    ? 'bg-white text-[#171717] border-b-2 border-[#C6A45C]'
                    : 'text-[#171717]/60 hover:text-[#171717]'
                }`}
              >
                Customer Sign In
              </button>
              <button
                type="button"
                onClick={() => switchMode('register')}
                className={`py-4 text-xs sm:text-sm font-semibold tracking-wide uppercase transition-colors cursor-pointer ${
                  mode === 'register'
                    ? 'bg-white text-[#171717] border-b-2 border-[#C6A45C]'
                    : 'text-[#171717]/60 hover:text-[#171717]'
                }`}
              >
                Create Account
              </button>
            </div>

            <div className="p-6 sm:p-9 space-y-6">
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-[#A68642] tracking-[0.16em] uppercase">
                  {websiteSettings.brandName} Client Access
                </p>
                <h1 className="font-display text-3xl font-medium text-[#171717]">
                  {mode === 'login' ? 'Welcome Back' : 'Create Your Client Account'}
                </h1>
                <p className="text-xs sm:text-sm text-[#171717]/70 leading-relaxed">
                  {mode === 'login'
                    ? 'Sign in with your email and password to place website order requests and bespoke briefs.'
                    : 'Register once for effortless checkout reservations and custom-tailored outfit requests.'}
                </p>
              </div>

              {!isSupabaseMode && (
                <div className="p-3.5 bg-[#FAF7F2] border border-[#C6A45C]/40 text-xs text-[#171717]/80">
                  <strong>Preview Mode:</strong> Customer sessions are stored locally in your
                  browser until Supabase credentials are active.
                </div>
              )}

              {authError && (
                <div
                  role="alert"
                  className="p-3.5 bg-red-50 border border-red-200 text-xs sm:text-sm text-red-800 space-y-2"
                >
                  <p>{authError}</p>
                  {confirmationEmail && mode === 'login' && (
                    <button
                      type="button"
                      disabled={isResending}
                      onClick={handleResendConfirmation}
                      className="text-xs font-semibold underline underline-offset-4 text-red-900 hover:text-red-700 cursor-pointer"
                    >
                      {isResending ? 'Sending confirmation link...' : 'Resend confirmation email'}
                    </button>
                  )}
                </div>
              )}

              {mode === 'login' ? (
                <form onSubmit={handleSignInSubmit} noValidate className="space-y-5">
                  <div>
                    <label
                      htmlFor="customer-login-email"
                      className="block text-xs font-semibold text-[#171717] mb-1.5"
                    >
                      Email Address <span className="text-[#A68642]">*</span>
                    </label>
                    <input
                      id="customer-login-email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (fieldErrors.email) {
                          setFieldErrors((prev) => ({ ...prev, email: undefined }));
                        }
                      }}
                      placeholder="you@example.com"
                      aria-invalid={Boolean(fieldErrors.email)}
                      className={`w-full px-3.5 py-2.5 text-sm border bg-white focus:outline-none ${
                        fieldErrors.email
                          ? 'border-red-500 focus:border-red-600'
                          : 'border-[#171717]/20 focus:border-[#C6A45C]'
                      }`}
                    />
                    {fieldErrors.email && (
                      <p className="mt-1 text-xs text-red-700">{fieldErrors.email}</p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="customer-login-password"
                      className="block text-xs font-semibold text-[#171717] mb-1.5"
                    >
                      Password <span className="text-[#A68642]">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="customer-login-password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        required
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (fieldErrors.password) {
                            setFieldErrors((prev) => ({ ...prev, password: undefined }));
                          }
                        }}
                        placeholder="Enter your password"
                        aria-invalid={Boolean(fieldErrors.password)}
                        className={`w-full pl-3.5 pr-10 py-2.5 text-sm border bg-white focus:outline-none ${
                          fieldErrors.password
                            ? 'border-red-500 focus:border-red-600'
                            : 'border-[#171717]/20 focus:border-[#C6A45C]'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#171717]/55 hover:text-[#171717] cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {fieldErrors.password && (
                      <p className="mt-1 text-xs text-red-700">{fieldErrors.password}</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3.5 px-6 bg-[#171717] text-white text-sm font-medium hover:bg-[#2a2a2a] disabled:opacity-60 transition-colors cursor-pointer"
                  >
                    {isSubmitting ? 'Signing In...' : 'Sign In'}
                  </button>

                  <p className="text-center text-xs text-[#171717]/70 pt-1">
                    New to {websiteSettings.brandName}?{' '}
                    <button
                      type="button"
                      onClick={() => switchMode('register')}
                      className="font-semibold text-[#171717] underline underline-offset-4 hover:text-[#A68642] cursor-pointer"
                    >
                      Create an account
                    </button>
                  </p>
                </form>
              ) : (
                <form onSubmit={handleRegisterSubmit} noValidate className="space-y-4">
                  <div>
                    <label
                      htmlFor="customer-register-name"
                      className="block text-xs font-semibold text-[#171717] mb-1.5"
                    >
                      Full Name <span className="text-[#A68642]">*</span>
                    </label>
                    <input
                      id="customer-register-name"
                      type="text"
                      autoComplete="name"
                      required
                      value={fullName}
                      onChange={(e) => {
                        setFullName(e.target.value);
                        if (fieldErrors.fullName) {
                          setFieldErrors((prev) => ({ ...prev, fullName: undefined }));
                        }
                      }}
                      placeholder="Enter your full name"
                      aria-invalid={Boolean(fieldErrors.fullName)}
                      className={`w-full px-3.5 py-2.5 text-sm border bg-white focus:outline-none ${
                        fieldErrors.fullName
                          ? 'border-red-500 focus:border-red-600'
                          : 'border-[#171717]/20 focus:border-[#C6A45C]'
                      }`}
                    />
                    {fieldErrors.fullName && (
                      <p className="mt-1 text-xs text-red-700">{fieldErrors.fullName}</p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="customer-register-email"
                      className="block text-xs font-semibold text-[#171717] mb-1.5"
                    >
                      Email Address <span className="text-[#A68642]">*</span>
                    </label>
                    <input
                      id="customer-register-email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (fieldErrors.email) {
                          setFieldErrors((prev) => ({ ...prev, email: undefined }));
                        }
                      }}
                      placeholder="you@example.com"
                      aria-invalid={Boolean(fieldErrors.email)}
                      className={`w-full px-3.5 py-2.5 text-sm border bg-white focus:outline-none ${
                        fieldErrors.email
                          ? 'border-red-500 focus:border-red-600'
                          : 'border-[#171717]/20 focus:border-[#C6A45C]'
                      }`}
                    />
                    {fieldErrors.email && (
                      <p className="mt-1 text-xs text-red-700">{fieldErrors.email}</p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="customer-register-password"
                      className="block text-xs font-semibold text-[#171717] mb-1.5"
                    >
                      Password <span className="text-[#A68642]">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="customer-register-password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        required
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (fieldErrors.password) {
                            setFieldErrors((prev) => ({ ...prev, password: undefined }));
                          }
                        }}
                        placeholder="Minimum 6 characters"
                        aria-invalid={Boolean(fieldErrors.password)}
                        className={`w-full pl-3.5 pr-10 py-2.5 text-sm border bg-white focus:outline-none ${
                          fieldErrors.password
                            ? 'border-red-500 focus:border-red-600'
                            : 'border-[#171717]/20 focus:border-[#C6A45C]'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#171717]/55 hover:text-[#171717] cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {fieldErrors.password && (
                      <p className="mt-1 text-xs text-red-700">{fieldErrors.password}</p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="customer-register-confirm"
                      className="block text-xs font-semibold text-[#171717] mb-1.5"
                    >
                      Confirm Password <span className="text-[#A68642]">*</span>
                    </label>
                    <input
                      id="customer-register-confirm"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (fieldErrors.confirmPassword) {
                          setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                        }
                      }}
                      placeholder="Re-enter your password"
                      aria-invalid={Boolean(fieldErrors.confirmPassword)}
                      className={`w-full px-3.5 py-2.5 text-sm border bg-white focus:outline-none ${
                        fieldErrors.confirmPassword
                          ? 'border-red-500 focus:border-red-600'
                          : 'border-[#171717]/20 focus:border-[#C6A45C]'
                      }`}
                    />
                    {fieldErrors.confirmPassword && (
                      <p className="mt-1 text-xs text-red-700">{fieldErrors.confirmPassword}</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3.5 px-6 bg-[#171717] text-white text-sm font-medium hover:bg-[#2a2a2a] disabled:opacity-60 transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4 text-[#C6A45C]" aria-hidden="true" />
                    <span>{isSubmitting ? 'Creating Account...' : 'Create Customer Account'}</span>
                  </button>

                  <p className="text-center text-xs text-[#171717]/70 pt-1">
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => switchMode('login')}
                      className="font-semibold text-[#171717] underline underline-offset-4 hover:text-[#A68642] cursor-pointer"
                    >
                      Sign in instead
                    </button>
                  </p>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
