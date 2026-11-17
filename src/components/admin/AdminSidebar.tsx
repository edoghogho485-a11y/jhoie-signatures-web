import {
  LayoutDashboard,
  LogOut,
  Mail,
  Package,
  Scissors,
  Settings,
  ShoppingBag,
  X,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import type { AdminSection } from '../../types/fashion';

export const ADMIN_NAV_ITEMS: {
  id: AdminSection;
  label: string;
  icon: typeof LayoutDashboard;
}[] = [
  { id: 'overview', label: 'Dashboard Overview', icon: LayoutDashboard },
  { id: 'products', label: 'Products', icon: Package },
  { id: 'orders', label: 'Orders', icon: ShoppingBag },
  { id: 'custom-requests', label: 'Custom Requests', icon: Scissors },
  { id: 'enquiries', label: 'Customer Enquiries', icon: Mail },
  { id: 'settings', label: 'Website Settings', icon: Settings },
];

interface AdminSidebarProps {
  activeSection: AdminSection;
  onSelectSection: (section: AdminSection) => void;
  onLogout: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  newCustomRequestsCount?: number;
  unreadEnquiriesCount?: number;
}

export function AdminSidebar({
  activeSection,
  onSelectSection,
  onLogout,
  mobileOpen,
  onCloseMobile,
  newCustomRequestsCount = 0,
  unreadEnquiriesCount = 0,
}: AdminSidebarProps) {
  const { websiteSettings, adminSession } = useStore();

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#171717] text-white w-64 shrink-0 border-r border-white/10">
      {/* Studio Brand Header */}
      <div className="px-6 py-6 border-b border-white/10 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-xl font-semibold tracking-[0.12em] text-white truncate">
            {websiteSettings.brandName}
          </p>
          <p className="font-display italic text-sm text-[#C6A45C] mt-0.5 truncate">
            {websiteSettings.tagline}
          </p>
          <p className="mt-2 text-[11px] uppercase tracking-[0.14em] text-white/50">
            Admin Studio
          </p>
        </div>
        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Close admin menu"
          className="lg:hidden p-1.5 text-white/70 hover:text-white cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Primary Admin Navigation (6 Sections) */}
      <nav aria-label="Admin Navigation" className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
        {ADMIN_NAV_ITEMS.map((item) => {
          const IconComponent = item.icon;
          const isActive = activeSection === item.id;
          const count =
            item.id === 'custom-requests'
              ? newCustomRequestsCount
              : item.id === 'enquiries'
              ? unreadEnquiriesCount
              : 0;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onSelectSection(item.id);
                onCloseMobile();
              }}
              aria-current={isActive ? 'page' : undefined}
              className={`w-full flex items-center justify-between gap-2 px-3.5 py-2.5 text-sm font-medium transition-colors cursor-pointer text-left whitespace-nowrap ${
                isActive
                  ? 'bg-[#C6A45C]/15 text-[#C6A45C] border border-[#C6A45C]/30'
                  : 'text-white/75 hover:bg-white/5 hover:text-white border border-transparent'
              }`}
            >
              <span className="flex items-center gap-3 min-w-0">
                <IconComponent
                  className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#C6A45C]' : 'text-white/55'}`}
                  aria-hidden="true"
                />
                <span className="truncate">{item.label}</span>
              </span>
              {count > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] font-semibold tabular-nums bg-[#C6A45C] text-[#171717] shrink-0">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom Action: Signed-in status + Logout */}
      <div className="px-3 py-4 border-t border-white/10 space-y-2">
        {adminSession && (
          <div className="px-3.5 py-1.5 text-[11px] text-white/60">
            <p className="truncate font-medium text-white/85">{adminSession.adminEmail}</p>
            <p className="text-[10px] text-[#C6A45C]/80 mt-0.5">
              {adminSession.mode === 'supabase_auth'
                ? 'Verified Supabase Session'
                : 'Local Preview Session'}
            </p>
          </div>
        )}
        <button
          type="button"
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium text-white/75 hover:bg-white/5 hover:text-white transition-colors cursor-pointer text-left"
        >
          <LogOut className="w-4 h-4 text-[#C6A45C] shrink-0" aria-hidden="true" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:sticky lg:top-0 lg:h-screen">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 flex lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Admin Navigation Menu"
        >
          <div
            onClick={onCloseMobile}
            className="fixed inset-0 bg-[#171717]/60 backdrop-blur-[2px]"
          />
          <div className="relative z-10 h-full">{sidebarContent}</div>
        </div>
      )}
    </>
  );
}
