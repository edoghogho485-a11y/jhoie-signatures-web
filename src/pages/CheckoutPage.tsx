import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Lock,
  LogOut,
  MessageCircle,
  Trash2,
  UserCheck,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { BrandImage } from '../components/BrandImage';
import { useStore } from '../context/StoreContext';
import { catalogRepository, STORAGE_KEYS } from '../services/storeRepository';
import type { OrderRequestPayload, Product } from '../types/fashion';
import {
  type CheckoutFieldErrors,
  reconcileCartQuantitiesWithStock,
  validateCartStock,
  validateCheckoutForm,
} from '../utils/checkoutValidation';
import { buildCartWhatsAppMessage, formatNaira } from '../utils/formatters';

export function CheckoutPage() {
  const {
    products,
    cart,
    cartSubtotalNgn,
    removeFromCart,
    replaceCart,
    clearCart,
    navigate,
    openWhatsAppModal,
    showToast,
    submitOrderRequest,
    isSupabaseMode,
    customerSession,
    isAuthLoading,
    customerLogout,
  } = useStore();

  const [customerName, setCustomerName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [cityState, setCityState] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');

  const [fieldErrors, setFieldErrors] = useState<CheckoutFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [stockAlertMessages, setStockAlertMessages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<OrderRequestPayload | null>(null);

  const liveStockCheck = useMemo(() => validateCartStock(cart, products), [cart, products]);

  const showSampleCopy = !isSupabaseMode && products.some((p) => p.isSample);

  useEffect(() => {
    if (!customerSession?.isAuthenticated) return;
    if (!customerName && customerSession.fullName) {
      setCustomerName(customerSession.fullName);
    }
    if (!email && customerSession.email) {
      setEmail(customerSession.email);
    }
    if (!phoneNumber && customerSession.phone) {
      setPhoneNumber(customerSession.phone);
    }
  }, [
    customerName,
    customerSession?.email,
    customerSession?.fullName,
    customerSession?.isAuthenticated,
    customerSession?.phone,
    email,
    phoneNumber,
  ]);

  const getLatestProducts = async (): Promise<Product[] | null> => {
    if (isSupabaseMode) {
      try {
        return await catalogRepository.listProducts();
      } catch {
        return null;
      }
    }
    try {
      if (localStorage.getItem(STORAGE_KEYS.PRODUCTS) !== null) {
        return catalogRepository.loadProducts();
      }
    } catch {
      // Fallback to context products if localStorage is unavailable
    }
    return products;
  };

  const verifyAndReconcileCartStock = async (): Promise<boolean> => {
    const latestCatalog = await getLatestProducts();
    if (!latestCatalog) {
      setFormError(
        'Unable to verify live studio inventory right now. Please check your connection and submit again — your bag and details are preserved.'
      );
      showToast('Connection error while checking live stock');
      return false;
    }

    const check = validateCartStock(cart, latestCatalog);
    if (check.isValid) {
      setStockAlertMessages([]);
      return true;
    }

    const reconciled = reconcileCartQuantitiesWithStock(cart, latestCatalog);
    if (reconciled.quantitiesAdjusted) {
      replaceCart(reconciled.nextCart);
    }

    setStockAlertMessages(reconciled.adjustmentMessages);
    setFormError(
      reconciled.quantitiesAdjusted && !reconciled.hasBlockingUnavailableItems
        ? 'Stock changed since you added items to your bag. We updated your quantities to match available stock — please review your updated summary and submit again.'
        : 'One or more items in your shopping bag are out of stock or exceed current studio inventory. Please review the flagged items in your Order Summary.'
    );
    showToast('Please review updated item availability in your bag');
    return false;
  };

  const handleAdjustItemToStock = (cartItemId: string, maxAvailable: number) => {
    if (maxAvailable <= 0) {
      removeFromCart(cartItemId);
      return;
    }
    const nextCart = cart.map((item) =>
      item.id === cartItemId ? { ...item, quantity: maxAvailable } : item
    );
    replaceCart(nextCart);
    setStockAlertMessages([]);
    setFormError(null);
    showToast(`Updated bag quantity to ${maxAvailable}`);
  };

  const handleRemoveUnavailableItems = () => {
    const issueMap = liveStockCheck.issuesByCartItemId;
    const nextCart = cart.filter((item) => {
      const issue = issueMap[item.id];
      return !issue || (issue.reason !== 'unavailable' && issue.reason !== 'out_of_stock');
    });
    replaceCart(nextCart);
    setStockAlertMessages([]);
    setFormError(null);
    showToast('Removed unavailable items from your bag');
  };

  const handleSubmitOrderRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setStockAlertMessages([]);

    if (!customerSession?.isAuthenticated) {
      setFormError('Please sign in or create a customer account to submit an order request.');
      return;
    }

    if (cart.length === 0) {
      setFormError('Your shopping bag is currently empty.');
      return;
    }

    const validation = validateCheckoutForm({
      customerName,
      phoneNumber,
      email,
      deliveryAddress,
      cityState,
    });

    if (!validation.isValid) {
      setFieldErrors(validation.errors);
      setFormError(
        validation.firstErrorMessage || 'Please review the highlighted required fields.'
      );
      return;
    }

    setFieldErrors({});

    // Re-check every cart item's current availability and stock quantity before submission
    if (!(await verifyAndReconcileCartStock())) {
      return;
    }

    setIsSubmitting(true);
    try {
      const saved = await submitOrderRequest({
        customerName: customerName.trim(),
        phoneNumber: phoneNumber.trim(),
        email: email.trim() || undefined,
        deliveryAddress: deliveryAddress.trim(),
        cityState: cityState.trim(),
        deliveryNotes: deliveryNotes.trim() || undefined,
        items: cart,
        subtotalNgn: cartSubtotalNgn,
      });

      setConfirmedOrder(saved);
      clearCart();
      showToast(`Order request ${saved.referenceCode} recorded`);
    } catch (err) {
      const latestCatalog = await getLatestProducts();
      if (latestCatalog) {
        const stockAfterError = validateCartStock(cart, latestCatalog);
        if (!stockAfterError.isValid) {
          const reconciled = reconcileCartQuantitiesWithStock(cart, latestCatalog);
          if (reconciled.quantitiesAdjusted) {
            replaceCart(reconciled.nextCart);
          }
          setStockAlertMessages(reconciled.adjustmentMessages);
        }
      }
      setFormError(
        err instanceof Error && err.message
          ? err.message
          : 'Unable to submit order request right now. Please review your bag and try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOrderViaWhatsApp = async () => {
    setFormError(null);
    if (!(await verifyAndReconcileCartStock())) {
      return;
    }

    openWhatsAppModal(
      'Order via WhatsApp',
      buildCartWhatsAppMessage({
        items: cart,
        subtotalNgn: cartSubtotalNgn,
        customerName: customerName.trim() || undefined,
        phoneNumber: phoneNumber.trim() || undefined,
        deliveryAddress: deliveryAddress.trim() || undefined,
        cityState: cityState.trim() || undefined,
        isSample: showSampleCopy,
      })
    );
  };

  if (confirmedOrder) {
    const whatsappConfirmMessage = buildCartWhatsAppMessage({
      items: confirmedOrder.items,
      subtotalNgn: confirmedOrder.subtotalNgn,
      customerName: confirmedOrder.customerName,
      phoneNumber: confirmedOrder.phoneNumber,
      deliveryAddress: confirmedOrder.deliveryAddress,
      cityState: confirmedOrder.cityState,
      referenceCode: confirmedOrder.referenceCode,
      isSample: showSampleCopy,
    });

    return (
      <div className="bg-white min-h-[70vh]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
          <div className="bg-[#FAF7F2] border border-[#171717]/15 p-6 sm:p-10 space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 bg-[#171717] text-[#C6A45C] flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs font-medium text-[#A68642] uppercase tracking-wider">
                  Order Request Recorded
                </p>
                <h1 className="font-display text-3xl sm:text-4xl font-medium text-[#171717] mt-1">
                  Order #{confirmedOrder.referenceCode} — Awaiting Confirmation
                </h1>
                <p className="text-sm text-[#171717]/70 mt-1">
                  No online payment was charged. Our studio concierge will confirm item
                  availability, delivery fee, and payment instructions directly with you.
                </p>
              </div>
            </div>

            <div className="bg-white border border-[#171717]/10 p-5 space-y-4">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[#171717]/65">
                Itemized Summary
              </h2>
              <ul className="divide-y divide-[#171717]/10 text-sm">
                {confirmedOrder.items.map((item) => (
                  <li key={item.id} className="py-3 flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium text-[#171717]">{item.name}</p>
                      <p className="text-xs text-[#171717]/60">
                        Size: {item.selectedSize} · Colour: {item.selectedColor} · Qty:{' '}
                        {item.quantity}
                      </p>
                    </div>
                    <span className="font-semibold tabular-nums">
                      {formatNaira(item.priceNgn * item.quantity)}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="pt-3 border-t border-[#171717]/10 flex items-center justify-between">
                <span className="text-sm font-semibold text-[#171717]">
                  {showSampleCopy ? 'Estimated Sample Subtotal' : 'Order Subtotal'}
                </span>
                <span className="text-lg font-semibold text-[#171717] tabular-nums">
                  {formatNaira(confirmedOrder.subtotalNgn)}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() =>
                  openWhatsAppModal('Confirm Order via WhatsApp', whatsappConfirmMessage)
                }
                className="px-6 py-3 bg-[#171717] text-white text-sm font-medium hover:bg-[#2a2a2a] transition-colors inline-flex items-center gap-2 cursor-pointer"
              >
                <MessageCircle className="w-4 h-4 text-[#C6A45C]" aria-hidden="true" />
                <span>Send Order Summary on WhatsApp</span>
              </button>
              <button
                type="button"
                onClick={() => navigate('shop', { category: 'All' })}
                className="px-6 py-3 border border-[#171717]/20 text-[#171717] text-sm font-medium hover:bg-white transition-colors cursor-pointer"
              >
                Continue Browsing
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-[70vh]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-10 lg:py-14">
        <button
          type="button"
          onClick={() => navigate('shop')}
          className="inline-flex items-center gap-2 text-xs font-medium text-[#171717]/70 hover:text-[#171717] mb-6 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          <span>Continue Shopping</span>
        </button>

        <h1 className="font-display text-3xl sm:text-4xl font-medium text-[#171717] pb-6 border-b border-[#171717]/10">
          Order Reservation &amp; Checkout
        </h1>

        {cart.length === 0 ? (
          <div className="py-16 text-center space-y-4">
            <p className="font-display text-2xl text-[#171717]">Your shopping bag is empty</p>
            <p className="text-sm text-[#171717]/65">
              {showSampleCopy
                ? 'Add ready-to-wear sample pieces to your bag before proceeding to checkout.'
                : 'Add ready-to-wear pieces to your bag before proceeding to checkout.'}
            </p>
            <button
              type="button"
              onClick={() => navigate('shop', { category: 'All' })}
              className="px-6 py-3 bg-[#171717] text-white text-xs font-medium cursor-pointer"
            >
              Go to Shop
            </button>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
            {/* Delivery & Client Form OR Mandatory Customer Account Gate */}
            {isAuthLoading ? (
              <div className="lg:col-span-7 bg-[#FAF7F2] border border-[#171717]/15 p-8 text-center space-y-3">
                <div className="w-10 h-10 mx-auto bg-[#171717] text-[#C6A45C] flex items-center justify-center">
                  <Lock className="w-4 h-4" aria-hidden="true" />
                </div>
                <p className="font-display text-2xl text-[#171717]">Verifying Account Session</p>
                <p className="text-xs text-[#171717]/65">
                  Checking your authentication status before loading checkout...
                </p>
              </div>
            ) : !customerSession?.isAuthenticated ? (
              <div className="lg:col-span-7 bg-[#FAF7F2] border border-[#171717]/15 p-6 sm:p-9 space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 bg-[#171717] text-[#C6A45C] flex items-center justify-center shrink-0">
                    <Lock className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#A68642]">
                      Customer Account Required
                    </p>
                    <h2 className="font-display text-2xl sm:text-3xl font-medium text-[#171717]">
                      Sign In to Complete Website Checkout
                    </h2>
                    <p className="text-sm text-[#171717]/75 leading-relaxed">
                      For secure order tracking and verified delivery reservations, guest website
                      checkout is disabled. Your shopping bag is preserved and you will return
                      straight here after signing in.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={() => navigate('login', { redirectAfterAuth: 'checkout' })}
                    className="flex-1 py-3.5 px-6 bg-[#171717] text-white text-sm font-medium hover:bg-[#2a2a2a] transition-colors cursor-pointer"
                  >
                    Sign In to Continue
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('register', { redirectAfterAuth: 'checkout' })}
                    className="flex-1 py-3.5 px-6 border border-[#171717]/25 bg-white text-[#171717] text-sm font-medium hover:border-[#C6A45C] hover:bg-white transition-colors cursor-pointer"
                  >
                    Create Customer Account
                  </button>
                </div>

                <div className="pt-4 border-t border-[#171717]/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <p className="text-xs text-[#171717]/65">
                    Prefer to enquire directly with a stylist first?
                  </p>
                  <button
                    type="button"
                    onClick={handleOrderViaWhatsApp}
                    className="py-2.5 px-4 border border-[#171717]/20 bg-white text-[#171717] text-xs font-medium hover:border-[#C6A45C] transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-[#A68642]" aria-hidden="true" />
                    <span>Order via WhatsApp</span>
                  </button>
                </div>
              </div>
            ) : (
            <form
              onSubmit={handleSubmitOrderRequest}
              noValidate
              className="lg:col-span-7 space-y-6"
            >
              <div className="p-3.5 bg-white border border-[#171717]/15 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <UserCheck className="w-4 h-4 text-[#A68642] shrink-0" aria-hidden="true" />
                  <span className="text-[#171717]/75 truncate">
                    Checking out as <strong className="text-[#171717]">{customerSession.fullName}</strong>{' '}
                    ({customerSession.email})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    await customerLogout();
                    showToast('Signed out — your bag remains saved');
                  }}
                  className="inline-flex items-center gap-1 text-[#171717]/70 hover:text-red-700 font-medium cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Sign Out</span>
                </button>
              </div>

              {formError && (
                <div
                  role="alert"
                  className="p-4 bg-red-50 border border-red-200 text-red-900 text-sm space-y-2"
                >
                  <p className="font-medium">{formError}</p>
                  {stockAlertMessages.length > 0 && (
                    <ul className="list-disc pl-5 text-xs space-y-1 text-red-800">
                      {stockAlertMessages.map((msg, idx) => (
                        <li key={idx}>{msg}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              <div className="p-4 bg-[#F6F1E8] border border-[#171717]/10 text-xs text-[#171717]/80 leading-relaxed">
                <strong>Concierge Order Flow:</strong> This storefront does not process online card
                payments. Submit your delivery details to reserve your pieces or send your bag
                directly to our WhatsApp concierge.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label
                    htmlFor="checkout-name"
                    className="block text-xs font-semibold text-[#171717] mb-1.5"
                  >
                    Full Name <span className="text-[#A68642]">*</span>
                  </label>
                  <input
                    id="checkout-name"
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => {
                      setCustomerName(e.target.value);
                      if (fieldErrors.customerName) {
                        setFieldErrors((prev) => ({ ...prev, customerName: undefined }));
                      }
                    }}
                    placeholder="Enter your full name"
                    aria-invalid={Boolean(fieldErrors.customerName)}
                    className={`w-full px-3.5 py-2.5 text-sm border bg-white focus:outline-none ${
                      fieldErrors.customerName
                        ? 'border-red-500 focus:border-red-600'
                        : 'border-[#171717]/20 focus:border-[#C6A45C]'
                    }`}
                  />
                  {fieldErrors.customerName && (
                    <p className="mt-1 text-xs text-red-700">{fieldErrors.customerName}</p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="checkout-phone"
                    className="block text-xs font-semibold text-[#171717] mb-1.5"
                  >
                    Phone / WhatsApp Number <span className="text-[#A68642]">*</span>
                  </label>
                  <input
                    id="checkout-phone"
                    type="tel"
                    required
                    value={phoneNumber}
                    onChange={(e) => {
                      setPhoneNumber(e.target.value);
                      if (fieldErrors.phoneNumber) {
                        setFieldErrors((prev) => ({ ...prev, phoneNumber: undefined }));
                      }
                    }}
                    placeholder="+234 801 234 5678 or 08012345678"
                    aria-invalid={Boolean(fieldErrors.phoneNumber)}
                    className={`w-full px-3.5 py-2.5 text-sm border bg-white focus:outline-none ${
                      fieldErrors.phoneNumber
                        ? 'border-red-500 focus:border-red-600'
                        : 'border-[#171717]/20 focus:border-[#C6A45C]'
                    }`}
                  />
                  {fieldErrors.phoneNumber && (
                    <p className="mt-1 text-xs text-red-700">{fieldErrors.phoneNumber}</p>
                  )}
                </div>
              </div>

              <div>
                <label
                  htmlFor="checkout-email"
                  className="block text-xs font-semibold text-[#171717] mb-1.5"
                >
                  Email Address{' '}
                  <span className="font-normal text-[#171717]/55">(Optional)</span>
                </label>
                <input
                  id="checkout-email"
                  type="email"
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
                  htmlFor="checkout-address"
                  className="block text-xs font-semibold text-[#171717] mb-1.5"
                >
                  Delivery Street Address <span className="text-[#A68642]">*</span>
                </label>
                <input
                  id="checkout-address"
                  type="text"
                  required
                  value={deliveryAddress}
                  onChange={(e) => {
                    setDeliveryAddress(e.target.value);
                    if (fieldErrors.deliveryAddress) {
                      setFieldErrors((prev) => ({ ...prev, deliveryAddress: undefined }));
                    }
                  }}
                  placeholder="Street address, apartment or landmark"
                  aria-invalid={Boolean(fieldErrors.deliveryAddress)}
                  className={`w-full px-3.5 py-2.5 text-sm border bg-white focus:outline-none ${
                    fieldErrors.deliveryAddress
                      ? 'border-red-500 focus:border-red-600'
                      : 'border-[#171717]/20 focus:border-[#C6A45C]'
                  }`}
                />
                {fieldErrors.deliveryAddress && (
                  <p className="mt-1 text-xs text-red-700">{fieldErrors.deliveryAddress}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label
                    htmlFor="checkout-city"
                    className="block text-xs font-semibold text-[#171717] mb-1.5"
                  >
                    City &amp; State <span className="text-[#A68642]">*</span>
                  </label>
                  <input
                    id="checkout-city"
                    type="text"
                    required
                    value={cityState}
                    onChange={(e) => {
                      setCityState(e.target.value);
                      if (fieldErrors.cityState) {
                        setFieldErrors((prev) => ({ ...prev, cityState: undefined }));
                      }
                    }}
                    placeholder="e.g. Lagos, Abuja, Port Harcourt"
                    aria-invalid={Boolean(fieldErrors.cityState)}
                    className={`w-full px-3.5 py-2.5 text-sm border bg-white focus:outline-none ${
                      fieldErrors.cityState
                        ? 'border-red-500 focus:border-red-600'
                        : 'border-[#171717]/20 focus:border-[#C6A45C]'
                    }`}
                  />
                  {fieldErrors.cityState && (
                    <p className="mt-1 text-xs text-red-700">{fieldErrors.cityState}</p>
                  )}
                </div>
                <div>
                  <label
                    htmlFor="checkout-notes"
                    className="block text-xs font-semibold text-[#171717] mb-1.5"
                  >
                    Delivery Notes{' '}
                    <span className="font-normal text-[#171717]/55">(Optional)</span>
                  </label>
                  <input
                    id="checkout-notes"
                    type="text"
                    value={deliveryNotes}
                    onChange={(e) => setDeliveryNotes(e.target.value)}
                    placeholder="Preferred delivery window"
                    className="w-full px-3.5 py-2.5 text-sm border border-[#171717]/20 focus:border-[#C6A45C] focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3.5 px-6 bg-[#171717] text-white text-sm font-medium hover:bg-[#2a2a2a] disabled:opacity-60 transition-colors cursor-pointer"
                >
                  {isSubmitting ? 'Submitting Order Request...' : 'Submit Order Request'}
                </button>
                <button
                  type="button"
                  onClick={handleOrderViaWhatsApp}
                  className="py-3.5 px-6 border border-[#171717]/20 bg-white text-[#171717] text-sm font-medium hover:border-[#C6A45C] hover:bg-[#F6F1E8] transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4 text-[#A68642]" aria-hidden="true" />
                  <span>Order via WhatsApp</span>
                </button>
              </div>
            </form>
            )}

            {/* Order Summary Sidebar */}
            <aside className="lg:col-span-5 bg-[#FAF7F2] border border-[#171717]/10 p-6 sm:p-7 space-y-5">
              <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#171717]/10">
                <h2 className="font-display text-2xl font-medium text-[#171717]">Order Summary</h2>
                {!liveStockCheck.isValid && (
                  <span className="px-2 py-0.5 text-[11px] font-semibold bg-red-100 text-red-800 border border-red-200">
                    Action Needed
                  </span>
                )}
              </div>

              {!liveStockCheck.isValid && (
                <div className="p-3.5 bg-red-50 border border-red-200 text-xs text-red-900 space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" aria-hidden="true" />
                    <p>
                      Availability changed for {liveStockCheck.issues.length} item
                      {liveStockCheck.issues.length === 1 ? '' : 's'} in your bag. Please adjust or
                      remove flagged items before submitting.
                    </p>
                  </div>
                  {liveStockCheck.issues.some(
                    (i) => i.reason === 'unavailable' || i.reason === 'out_of_stock'
                  ) && (
                    <button
                      type="button"
                      onClick={handleRemoveUnavailableItems}
                      className="px-3 py-1.5 bg-white border border-red-300 text-red-800 font-medium hover:bg-red-100 transition-colors cursor-pointer"
                    >
                      Remove Unavailable Items
                    </button>
                  )}
                </div>
              )}

              <ul className="divide-y divide-[#171717]/10">
                {cart.map((item) => {
                  const issue = liveStockCheck.issuesByCartItemId[item.id];
                  return (
                    <li
                      key={item.id}
                      className={`py-3.5 space-y-2 ${
                        issue ? 'bg-red-50/60 -mx-2 px-2 border-l-2 border-red-500' : ''
                      }`}
                    >
                      <div className="flex gap-3.5">
                        <div className="w-16 h-20 bg-[#F6F1E8] shrink-0 overflow-hidden">
                          <BrandImage
                            src={item.image}
                            alt={item.name}
                            className="w-full h-full object-cover object-top"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#171717] truncate">{item.name}</p>
                          <p className="text-xs text-[#171717]/60 mt-0.5">
                            {item.selectedSize} · {item.selectedColor} · Qty {item.quantity}
                          </p>
                          <p className="text-sm font-semibold text-[#171717] mt-1 tabular-nums">
                            {formatNaira(item.priceNgn * item.quantity)}
                          </p>
                        </div>
                      </div>

                      {issue && (
                        <div className="text-xs text-red-800 space-y-1.5 pt-1">
                          <p>{issue.message}</p>
                          <div className="flex flex-wrap gap-2">
                            {issue.reason === 'exceeds_stock' && issue.suggestedQuantity >= 1 && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleAdjustItemToStock(item.id, issue.suggestedQuantity)
                                }
                                className="px-2.5 py-1 bg-[#171717] text-white text-[11px] font-medium hover:bg-[#2a2a2a] cursor-pointer"
                              >
                                Update to {issue.suggestedQuantity}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => removeFromCart(item.id)}
                              className="px-2.5 py-1 border border-red-300 bg-white text-red-800 text-[11px] font-medium hover:bg-red-100 inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" aria-hidden="true" />
                              <span>Remove Item</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
              <div className="pt-4 border-t border-[#171717]/10 space-y-2 text-sm">
                <div className="flex justify-between text-[#171717]/75">
                  <span>{showSampleCopy ? 'Subtotal (Sample Pricing)' : 'Subtotal'}</span>
                  <span className="tabular-nums font-medium">{formatNaira(cartSubtotalNgn)}</span>
                </div>
                <div className="flex justify-between text-[#171717]/60 text-xs">
                  <span>Delivery Fee</span>
                  <span>Calculated after location confirmation</span>
                </div>
                <div className="pt-2 border-t border-[#171717]/10 flex justify-between font-semibold text-[#171717] text-base">
                  <span>Estimated Total</span>
                  <span className="tabular-nums">{formatNaira(cartSubtotalNgn)}</span>
                </div>
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
