import { Check } from 'lucide-react';
import { CartDrawer } from './components/CartDrawer';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Footer } from './components/Footer';
import { Navbar } from './components/Navbar';
import { WhatsAppOrderModal } from './components/WhatsAppOrderModal';
import { StoreProvider, useStore } from './context/StoreContext';
import { AboutPage } from './pages/AboutPage';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { ContactPage } from './pages/ContactPage';
import { CustomerAuthPage } from './pages/CustomerAuthPage';
import { CustomOrdersPage } from './pages/CustomOrdersPage';
import { HomePage } from './pages/HomePage';
import { ProductDetailsPage } from './pages/ProductDetailsPage';
import { ShopPage } from './pages/ShopPage';

function StorefrontShell() {
  const { route, toastMessage } = useStore();

  const renderPublicPage = () => {
    switch (route) {
      case 'shop':
        return <ShopPage />;
      case 'product':
        return <ProductDetailsPage />;
      case 'custom-orders':
        return <CustomOrdersPage />;
      case 'about':
        return <AboutPage />;
      case 'contact':
        return <ContactPage />;
      case 'checkout':
        return <CheckoutPage />;
      case 'login':
        return <CustomerAuthPage mode="login" />;
      case 'register':
        return <CustomerAuthPage mode="register" />;
      case 'home':
      default:
        return <HomePage />;
    }
  };

  return (
    <>
      {route === 'admin' ? (
        <AdminDashboardPage />
      ) : (
        <div className="min-h-screen flex flex-col bg-white text-[#171717]">
          <Navbar />

          <main className="flex-1">{renderPublicPage()}</main>

          <Footer />

          <CartDrawer />
          <WhatsAppOrderModal />
        </div>
      )}

      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 right-5 z-50 bg-[#171717] text-white px-4 py-3 text-xs sm:text-sm font-medium shadow-lg border border-[#C6A45C]/40 inline-flex items-center gap-2.5"
        >
          <Check className="w-4 h-4 text-[#C6A45C] shrink-0" aria-hidden="true" />
          <span>{toastMessage}</span>
        </div>
      )}
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <StoreProvider>
        <StorefrontShell />
      </StoreProvider>
    </ErrorBoundary>
  );
}
