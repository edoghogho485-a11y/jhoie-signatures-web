import { ArrowUpRight, Instagram, MessageCircle } from 'lucide-react';
import { useStore } from '../context/StoreContext';

export function Footer() {
  const { navigate, openWhatsAppModal, websiteSettings, customerSession, customerLogout, showToast } =
    useStore();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#171717] text-white border-t border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-14 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 lg:gap-12 pb-12 border-b border-white/10">
          {/* Brand summary */}
          <div className="md:col-span-5 space-y-4">
            <div>
              <button
                type="button"
                onClick={() => navigate('home')}
                className="font-display text-2xl sm:text-3xl tracking-[0.12em] text-white hover:text-[#C6A45C] transition-colors text-left cursor-pointer"
              >
                {websiteSettings.brandName}
              </button>
              <p className="font-display italic text-lg text-[#C6A45C] mt-1">
                {websiteSettings.tagline}
              </p>
            </div>
            <p className="text-sm text-white/70 leading-relaxed max-w-md">
              Women&apos;s fashion house uniting luxury, modern trends, and African elegance across
              ready-to-wear and made-to-measure pieces for women of different ages.
            </p>
          </div>

          {/* Quick Navigation Links */}
          <div className="md:col-span-3 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-[#C6A45C]">
              Quick Links
            </h3>
            <ul className="space-y-2.5 text-sm text-white/75">
              <li>
                <button
                  type="button"
                  onClick={() => navigate('home')}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Home
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigate('shop', { category: 'All' })}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Shop
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigate('custom-orders')}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Custom Orders
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigate('about')}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  About Us
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigate('contact')}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Contact
                </button>
              </li>
              {customerSession?.isAuthenticated ? (
                <li>
                  <button
                    type="button"
                    onClick={async () => {
                      await customerLogout();
                      showToast('Signed out');
                    }}
                    className="hover:text-[#C6A45C] transition-colors cursor-pointer"
                  >
                    Sign Out ({customerSession.fullName.split(/\s+/)[0]})
                  </button>
                </li>
              ) : (
                <li>
                  <button
                    type="button"
                    onClick={() => navigate('login', { redirectAfterAuth: null })}
                    className="hover:text-[#C6A45C] transition-colors cursor-pointer"
                  >
                    Sign In / Register
                  </button>
                </li>
              )}
            </ul>
          </div>

          {/* Contact & Socials */}
          <div className="md:col-span-4 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-[#C6A45C]">
              Connect &amp; Enquiries
            </h3>
            <div className="space-y-2 text-sm text-white/75">
              <p>{websiteSettings.businessLocation}</p>
              <p className="break-all">{websiteSettings.businessEmail}</p>
              <p>{websiteSettings.businessPhone}</p>
            </div>
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() =>
                  openWhatsAppModal(
                    `Message ${websiteSettings.brandName} on WhatsApp`,
                    `Hello ${websiteSettings.brandName}, I would like to enquire about your collections and custom tailoring.`
                  )
                }
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium bg-[#C6A45C] text-[#171717] hover:bg-[#d5b571] transition-colors cursor-pointer whitespace-nowrap"
              >
                <MessageCircle className="w-3.5 h-3.5" aria-hidden="true" />
                <span>WhatsApp Contact</span>
              </button>
              <a
                href={websiteSettings.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium border border-white/20 text-white hover:border-[#C6A45C] hover:text-[#C6A45C] transition-colors whitespace-nowrap"
              >
                <Instagram className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{websiteSettings.instagramHandle}</span>
                <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-white/55">
          <p>
            &copy; {currentYear} {websiteSettings.brandName}. All rights reserved.
          </p>
          <p>
            {websiteSettings.tagline} · Sample Storefront Preview
          </p>
        </div>
      </div>
    </footer>
  );
}
