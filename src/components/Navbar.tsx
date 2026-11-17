import { LogOut, Menu, ShoppingBag, User, X } from 'lucide-react';
import { useState } from 'react';
import { useStore } from '../context/StoreContext';
import type { AppRoute } from '../types/fashion';

const NAV_ITEMS: { label: string; route: AppRoute }[] = [
  { label: 'Home', route: 'home' },
  { label: 'Shop', route: 'shop' },
  { label: 'Custom Orders', route: 'custom-orders' },
  { label: 'About', route: 'about' },
  { label: 'Contact', route: 'contact' },
];

export function Navbar() {
  const {
    route,
    cartCount,
    navigate,
    openCart,
    websiteSettings,
    customerSession,
    adminSession,
    customerLogout,
    showToast,
  } = useStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = (targetRoute: AppRoute) => {
    setMobileMenuOpen(false);
    navigate(targetRoute, targetRoute === 'shop' ? { category: 'All' } : undefined);
  };

  const handleCustomerLogout = async () => {
    setMobileMenuOpen(false);
    await customerLogout();
    showToast('Signed out');
  };

  const firstName = customerSession?.fullName?.split(/\s+/)[0] || 'Account';

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#171717]/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 h-16 flex items-center justify-between gap-4 lg:gap-8">
        {/* Zone 1: Single-line brand wordmark */}
        <button
          type="button"
          onClick={() => handleNavClick('home')}
          className="font-display text-xl sm:text-2xl font-semibold tracking-[0.12em] text-[#171717] whitespace-nowrap shrink-0 hover:text-[#A68642] transition-colors cursor-pointer"
        >
          {websiteSettings.brandName}
        </button>

        {/* Zone 2: 5 concise single-line navigation links */}
        <nav
          aria-label="Primary Navigation"
          className="hidden md:flex items-center gap-5 lg:gap-7 text-sm font-medium text-[#171717]/75"
        >
          {NAV_ITEMS.map((item) => {
            const isActive =
              route === item.route || (route === 'product' && item.route === 'shop');
            return (
              <button
                key={item.route}
                type="button"
                onClick={() => handleNavClick(item.route)}
                className={`relative py-1 whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  isActive
                    ? 'text-[#171717] font-semibold'
                    : 'hover:text-[#171717]'
                }`}
              >
                {item.label}
                <span
                  aria-hidden="true"
                  className={`absolute left-0 right-0 -bottom-0.5 h-[1.5px] bg-[#C6A45C] transition-transform duration-200 origin-left ${
                    isActive ? 'scale-x-100' : 'scale-x-0'
                  }`}
                />
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Customer Auth + Shopping Bag + mobile menu toggle */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {customerSession?.isAuthenticated ? (
            <div className="hidden md:flex items-center gap-2">
              {adminSession?.isAuthenticated && (
                <button
                  type="button"
                  onClick={() => navigate('admin')}
                  className="px-2.5 py-2 text-xs font-medium text-[#A68642] hover:text-[#171717] whitespace-nowrap cursor-pointer"
                >
                  Admin
                </button>
              )}
              <button
                type="button"
                onClick={() => navigate('account')}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-[#171717]/15 bg-[#FAF7F2] text-[#171717] hover:border-[#C6A45C] transition-colors whitespace-nowrap min-h-[40px] cursor-pointer"
                title={customerSession.email}
              >
                <User className="w-3.5 h-3.5 text-[#A68642]" aria-hidden="true" />
                <span className="max-w-[96px] truncate">{firstName}</span>
              </button>
              <button
                type="button"
                onClick={handleCustomerLogout}
                aria-label="Sign out"
                title="Sign out"
                className="inline-flex items-center justify-center w-10 h-10 border border-[#171717]/15 text-[#171717]/70 hover:text-red-700 hover:border-red-300 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate('login', { redirectAfterAuth: null })}
                className={`px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors min-h-[40px] cursor-pointer ${
                  route === 'login'
                    ? 'text-[#171717] font-semibold underline underline-offset-4 decoration-[#C6A45C]'
                    : 'text-[#171717]/80 hover:text-[#171717]'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => navigate('register', { redirectAfterAuth: null })}
                className={`hidden lg:inline-flex items-center px-3 py-2 text-xs font-medium border whitespace-nowrap transition-colors min-h-[40px] cursor-pointer ${
                  route === 'register'
                    ? 'border-[#C6A45C] bg-[#FAF7F2] text-[#171717]'
                    : 'border-[#171717]/20 text-[#171717] hover:border-[#C6A45C] hover:bg-[#FAF7F2]'
                }`}
              >
                Register
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={openCart}
            aria-label={`Open shopping bag with ${cartCount} items`}
            className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-medium bg-[#171717] text-white hover:bg-[#2a2a2a] transition-colors whitespace-nowrap shrink-0 cursor-pointer min-h-[40px]"
          >
            <ShoppingBag className="w-4 h-4 text-[#C6A45C]" aria-hidden="true" />
            <span className="tabular-nums">Bag ({cartCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
            className="md:hidden inline-flex items-center justify-center w-11 h-11 text-[#171717] hover:bg-[#F6F1E8] transition-colors cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile navigation drawer */}
      {mobileMenuOpen && (
        <nav
          aria-label="Mobile Navigation"
          className="md:hidden border-t border-[#171717]/10 bg-white px-4 py-4 space-y-1"
        >
          {NAV_ITEMS.map((item) => {
            const isActive =
              route === item.route || (route === 'product' && item.route === 'shop');
            return (
              <button
                key={item.route}
                type="button"
                onClick={() => handleNavClick(item.route)}
                className={`w-full text-left px-3 py-3 text-sm font-medium transition-colors flex items-center justify-between cursor-pointer ${
                  isActive
                    ? 'bg-[#F6F1E8] text-[#171717] font-semibold'
                    : 'text-[#171717]/80 hover:bg-[#FAF7F2]'
                }`}
              >
                <span>{item.label}</span>
                {isActive && (
                  <span className="text-xs text-[#A68642] font-normal">Current</span>
                )}
              </button>
            );
          })}

          <div className="pt-3 mt-2 border-t border-[#171717]/10 space-y-2">
            {customerSession?.isAuthenticated ? (
              <div className="px-3 py-2 bg-[#FAF7F2] border border-[#171717]/10 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[#171717] truncate">
                    {customerSession.fullName}
                  </p>
                  <p className="text-[11px] text-[#171717]/60 truncate">{customerSession.email}</p>
                </div>
                <button
                  type="button"
                  onClick={handleCustomerLogout}
                  className="px-3 py-1.5 border border-[#171717]/20 bg-white text-xs font-medium text-[#171717] hover:text-red-700 cursor-pointer shrink-0"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigate('login', { redirectAfterAuth: null });
                  }}
                  className="py-2.5 px-3 border border-[#171717]/20 text-xs font-medium text-[#171717] hover:bg-[#FAF7F2] cursor-pointer"
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigate('register', { redirectAfterAuth: null });
                  }}
                  className="py-2.5 px-3 bg-[#171717] text-white text-xs font-medium hover:bg-[#2a2a2a] cursor-pointer"
                >
                  Create Account
                </button>
              </div>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
