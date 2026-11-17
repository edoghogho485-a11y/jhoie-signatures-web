import {
  Download,
  Info,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Printer,
  Save,
  User,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { OrderRequestPayload, OrderStatus, PaymentStatus } from '../../types/fashion';
import { formatNaira } from '../../utils/formatters';
import {
  buildAdminToCustomerWhatsAppMessage,
  buildCustomerWhatsAppChatUrl,
  buildPrintableOrderSummaryText,
  formatOrderDateTime,
  getOrderTotalQuantity,
  normalizeOrderStatus,
  normalizePaymentStatus,
  ORDER_STATUS_OPTIONS,
  PAYMENT_STATUS_OPTIONS,
} from '../../utils/orderHelpers';
import { BrandImage } from '../BrandImage';
import { CancelOrderConfirmModal } from './CancelOrderConfirmModal';
import { getOrderStatusStyle, getPaymentStatusStyle } from './orderStatusStyles';

interface OrderDetailModalProps {
  order: OrderRequestPayload | null;
  onClose: () => void;
  onSaveUpdates: (
    orderId: string,
    updates: {
      status: OrderStatus;
      paymentStatus: PaymentStatus;
      deliveryFeeNgn: number;
      internalNotes: string;
    }
  ) => Promise<void>;
  onNotify?: (message: string) => void;
}

export function OrderDetailModal({
  order,
  onClose,
  onSaveUpdates,
  onNotify,
}: OrderDetailModalProps) {
  const [status, setStatus] = useState<OrderStatus>('New');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('Unpaid');
  const [deliveryFeeInput, setDeliveryFeeInput] = useState<string>('0');
  const [internalNotes, setInternalNotes] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [pendingCancelPrompt, setPendingCancelPrompt] = useState(false);

  useEffect(() => {
    if (!order) return;
    setStatus(normalizeOrderStatus(order.status));
    setPaymentStatus(normalizePaymentStatus(order.paymentStatus));
    setDeliveryFeeInput(String(order.deliveryFeeNgn ?? 0));
    setInternalNotes(order.internalNotes || '');
    setPendingCancelPrompt(false);
  }, [order]);

  useEffect(() => {
    if (!order || pendingCancelPrompt) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSaving) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [order, pendingCancelPrompt, isSaving, onClose]);

  const parsedDeliveryFee = useMemo(() => {
    const num = Number(deliveryFeeInput);
    if (!Number.isFinite(num) || num < 0) return 0;
    return Math.round(num);
  }, [deliveryFeeInput]);

  if (!order) return null;

  const orderId = order.id || order.referenceCode || '';
  const computedTotal = order.subtotalNgn + parsedDeliveryFee;
  const totalQuantity = getOrderTotalQuantity(order);

  const draftOrderForExports: OrderRequestPayload = {
    ...order,
    status,
    paymentStatus,
    deliveryFeeNgn: parsedDeliveryFee,
    totalAmountNgn: computedTotal,
    internalNotes,
  };

  const customerWhatsAppMessage = buildAdminToCustomerWhatsAppMessage(draftOrderForExports);
  const customerWhatsAppUrl = buildCustomerWhatsAppChatUrl(
    order.phoneNumber,
    customerWhatsAppMessage
  );

  const statusStyle = getOrderStatusStyle(status);
  const paymentStyle = getPaymentStatusStyle(paymentStatus);

  const handleStatusSelect = (nextStatus: OrderStatus) => {
    if (nextStatus === 'Cancelled' && status !== 'Cancelled') {
      setPendingCancelPrompt(true);
      return;
    }
    setStatus(nextStatus);
  };

  const handleConfirmCancel = async () => {
    setIsSaving(true);
    try {
      await onSaveUpdates(orderId, {
        status: 'Cancelled',
        paymentStatus,
        deliveryFeeNgn: parsedDeliveryFee,
        internalNotes: internalNotes.trim(),
      });
      setStatus('Cancelled');
      setPendingCancelPrompt(false);
      onNotify?.(`Order ${order.referenceCode || orderId} marked as Cancelled`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSaveUpdates(orderId, {
        status,
        paymentStatus,
        deliveryFeeNgn: parsedDeliveryFee,
        internalNotes: internalNotes.trim(),
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadSummary = () => {
    const content = buildPrintableOrderSummaryText(draftOrderForExports);
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `JHOIE-SIGNATURES-${order.referenceCode || orderId}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    onNotify?.('Order summary downloaded');
  };

  const handlePrintSummary = () => {
    window.print();
  };

  return (
    <>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-detail-modal-title"
        className="fixed inset-0 z-50 bg-[#171717]/65 flex items-center justify-center p-3 sm:p-6 overflow-y-auto print:static print:bg-white print:p-0"
      >
        <div className="bg-white w-full max-w-4xl max-h-[92vh] flex flex-col border border-[#171717]/15 print:max-h-none print:border-0">
          {/* Header */}
          <div className="px-5 sm:px-7 py-4 border-b border-[#171717]/10 bg-[#FAF7F2] flex flex-wrap items-center justify-between gap-4 shrink-0 print:bg-white">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#A68642]">
                  Customer Order Details
                </p>
                {order.isDemo && (
                  <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider border border-[#C6A45C] bg-[#F6F1E8] text-[#8C6E32]">
                    Demonstration Order
                  </span>
                )}
              </div>
              <h2
                id="order-detail-modal-title"
                className="font-display text-2xl sm:text-3xl font-medium text-[#171717]"
              >
                Order {order.referenceCode || orderId}
              </h2>
              <p className="text-xs text-[#171717]/60">
                Placed on {formatOrderDateTime(order.createdAt)} · {totalQuantity} item
                {totalQuantity === 1 ? '' : 's'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 print:hidden">
              <button
                type="button"
                onClick={handlePrintSummary}
                className="px-3 py-2 border border-[#171717]/20 bg-white text-xs font-medium text-[#171717] hover:border-[#171717] inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-[#A68642]" aria-hidden="true" />
                <span>Print Summary</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadSummary}
                className="px-3 py-2 border border-[#171717]/20 bg-white text-xs font-medium text-[#171717] hover:border-[#171717] inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-[#A68642]" aria-hidden="true" />
                <span>Save Summary</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                aria-label="Close order details"
                className="w-9 h-9 border border-[#171717]/15 bg-white flex items-center justify-center text-[#171717]/70 hover:text-[#171717] hover:border-[#171717] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Body */}
          <form
            onSubmit={handleSave}
            className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6 print:overflow-visible"
          >
            {/* Status Strip */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#171717]/10">
              <div className="flex flex-wrap items-center gap-2.5">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium border ${statusStyle.badgeClass}`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${statusStyle.dotClass}`}
                    aria-hidden="true"
                  />
                  <span>Order: {status}</span>
                </span>
                <span
                  className={`inline-flex items-center px-2.5 py-1 text-xs font-medium border ${paymentStyle}`}
                >
                  Payment: {paymentStatus}
                </span>
              </div>

              {customerWhatsAppUrl ? (
                <a
                  href={customerWhatsAppUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 bg-[#171717] text-white text-xs font-medium hover:bg-[#2a2a2a] transition-colors inline-flex items-center gap-2 print:hidden"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-[#C6A45C]" aria-hidden="true" />
                  <span>Contact Customer on WhatsApp</span>
                </a>
              ) : (
                <span className="text-xs text-[#171717]/50">
                  Valid WhatsApp phone number unavailable
                </span>
              )}
            </div>

            {/* Customer & Delivery Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-[#FAF7F2] border border-[#171717]/10 space-y-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#171717]/60">
                  Customer Information
                </p>
                <div className="space-y-2 text-sm text-[#171717]">
                  <p className="font-medium flex items-center gap-2">
                    <User className="w-4 h-4 text-[#A68642] shrink-0" aria-hidden="true" />
                    <span>{order.customerName}</span>
                  </p>
                  <p className="text-xs text-[#171717]/80 flex items-center gap-2 tabular-nums">
                    <Phone className="w-3.5 h-3.5 text-[#A68642] shrink-0" aria-hidden="true" />
                    <span>{order.phoneNumber}</span>
                  </p>
                  <p className="text-xs text-[#171717]/80 flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-[#A68642] shrink-0" aria-hidden="true" />
                    <span>{order.email || 'No email address provided'}</span>
                  </p>
                </div>
              </div>

              <div className="p-4 bg-[#FAF7F2] border border-[#171717]/10 space-y-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#171717]/60">
                  Delivery Information
                </p>
                <div className="space-y-2 text-xs text-[#171717]/80 leading-relaxed">
                  <p className="flex items-start gap-2 text-sm text-[#171717]">
                    <MapPin
                      className="w-4 h-4 text-[#A68642] shrink-0 mt-0.5"
                      aria-hidden="true"
                    />
                    <span>
                      {order.deliveryAddress}
                      <span className="block text-xs text-[#171717]/70 mt-0.5">
                        {order.cityState}
                      </span>
                    </span>
                  </p>
                  <div className="pt-1 border-t border-[#171717]/10">
                    <span className="font-semibold text-[#171717] block">
                      Additional Customer Notes:
                    </span>
                    <span>{order.deliveryNotes || 'No delivery notes provided.'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Ordered Items */}
            <div className="border border-[#171717]/10 bg-white">
              <div className="px-4 py-3 border-b border-[#171717]/10 bg-[#FAF7F2] flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#171717]/70">
                  Ordered Items ({totalQuantity})
                </h3>
                <span className="text-xs text-[#171717]/60">Prices in Nigerian Naira (₦)</span>
              </div>

              <ul className="divide-y divide-[#171717]/10">
                {order.items.map((item) => (
                  <li
                    key={item.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-3.5 min-w-0">
                      <div className="w-14 h-18 bg-[#F6F1E8] border border-[#171717]/10 shrink-0 overflow-hidden">
                        <BrandImage
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover object-top"
                        />
                      </div>
                      <div className="min-w-0 space-y-1">
                        <p className="text-sm font-medium text-[#171717]">{item.name}</p>
                        <p className="text-xs text-[#171717]/60">{item.category}</p>
                        <p className="text-xs text-[#171717]/80">
                          Size: <span className="font-medium">{item.selectedSize}</span> · Colour:{' '}
                          <span className="font-medium">{item.selectedColor}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between gap-1 text-right shrink-0">
                      <p className="text-xs text-[#171717]/65 tabular-nums">
                        {formatNaira(item.priceNgn)} × {item.quantity}
                      </p>
                      <p className="text-sm font-semibold text-[#171717] tabular-nums">
                        {formatNaira(item.priceNgn * item.quantity)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>

              {/* Totals Breakdown */}
              <div className="p-4 sm:p-5 border-t border-[#171717]/10 bg-[#FAF7F2] space-y-3">
                <div className="flex items-center justify-between text-sm text-[#171717]/80">
                  <span>Items Subtotal</span>
                  <span className="font-medium text-[#171717] tabular-nums">
                    {formatNaira(order.subtotalNgn)}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm text-[#171717]/80">
                  <label htmlFor="order-delivery-fee" className="text-sm">
                    Delivery Fee (₦)
                    <span className="block text-[11px] text-[#171717]/55">
                      Set after confirming courier cost for {order.cityState}
                    </span>
                  </label>
                  <div className="relative w-full sm:w-44 print:hidden">
                    <span
                      aria-hidden="true"
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#171717]/60"
                    >
                      ₦
                    </span>
                    <input
                      id="order-delivery-fee"
                      type="number"
                      min={0}
                      step={500}
                      value={deliveryFeeInput}
                      onChange={(e) => setDeliveryFeeInput(e.target.value)}
                      className="w-full pl-7 pr-3 py-1.5 text-sm text-right border border-[#171717]/20 bg-white tabular-nums focus:border-[#C6A45C] focus:outline-none"
                    />
                  </div>
                  <span className="hidden print:inline font-medium tabular-nums">
                    {formatNaira(parsedDeliveryFee)}
                  </span>
                </div>

                <div className="pt-3 border-t border-[#171717]/10 flex items-center justify-between">
                  <span className="text-base font-semibold text-[#171717]">Total Amount</span>
                  <span className="font-display text-2xl font-semibold text-[#171717] tabular-nums">
                    {formatNaira(computedTotal)}
                  </span>
                </div>
              </div>
            </div>

            {/* Admin Management Controls */}
            <div className="p-4 sm:p-5 border border-[#171717]/10 bg-white space-y-4 print:hidden">
              <div className="flex items-start gap-2.5 p-3 bg-[#F6F1E8] border border-[#C6A45C]/40 text-xs text-[#171717]/80">
                <Info className="w-4 h-4 text-[#A68642] shrink-0 mt-0.5" aria-hidden="true" />
                <p>
                  Order and payment statuses are updated manually for studio record-keeping. No
                  automated payment gateway is connected.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="admin-order-status-select"
                    className="block text-xs font-semibold text-[#171717] mb-1.5"
                  >
                    Order Fulfilment Status
                  </label>
                  <select
                    id="admin-order-status-select"
                    value={status}
                    onChange={(e) => handleStatusSelect(e.target.value as OrderStatus)}
                    className="w-full px-3.5 py-2.5 text-sm border border-[#171717]/20 bg-white focus:border-[#C6A45C] focus:outline-none cursor-pointer"
                  >
                    {ORDER_STATUS_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="admin-payment-status-select"
                    className="block text-xs font-semibold text-[#171717] mb-1.5"
                  >
                    Payment Status
                  </label>
                  <select
                    id="admin-payment-status-select"
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
                    className="w-full px-3.5 py-2.5 text-sm border border-[#171717]/20 bg-white focus:border-[#C6A45C] focus:outline-none cursor-pointer"
                  >
                    {PAYMENT_STATUS_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="admin-internal-order-notes"
                  className="block text-xs font-semibold text-[#171717] mb-1.5"
                >
                  Internal Order Notes (Admin Only)
                </label>
                <textarea
                  id="admin-internal-order-notes"
                  rows={3}
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  placeholder="Record payment confirmation details, courier tracking, alteration requests, or follow-up dates..."
                  className="w-full px-3.5 py-2.5 text-sm border border-[#171717]/20 bg-white focus:border-[#C6A45C] focus:outline-none"
                />
              </div>
            </div>

            {/* Footer Actions */}
            <div className="pt-2 flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3 print:hidden">
              {status !== 'Cancelled' ? (
                <button
                  type="button"
                  onClick={() => setPendingCancelPrompt(true)}
                  disabled={isSaving}
                  className="px-4 py-2.5 border border-red-200 bg-white text-xs font-medium text-red-700 hover:bg-red-50 transition-colors cursor-pointer self-start sm:self-auto"
                >
                  Cancel Order
                </button>
              ) : (
                <span className="text-xs text-red-700 font-medium">
                  This order is marked as Cancelled
                </span>
              )}

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSaving}
                  className="px-5 py-2.5 border border-[#171717]/20 bg-white text-xs font-medium text-[#171717] hover:border-[#171717] cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 bg-[#171717] text-white text-xs font-medium hover:bg-[#2a2a2a] transition-colors inline-flex items-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  <Save className="w-3.5 h-3.5 text-[#C6A45C]" aria-hidden="true" />
                  <span>{isSaving ? 'Saving...' : 'Save Order Updates'}</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Confirmation prompt before cancelling */}
      <CancelOrderConfirmModal
        order={pendingCancelPrompt ? draftOrderForExports : null}
        isProcessing={isSaving}
        onKeepOrder={() => setPendingCancelPrompt(false)}
        onConfirmCancel={handleConfirmCancel}
      />
    </>
  );
}
