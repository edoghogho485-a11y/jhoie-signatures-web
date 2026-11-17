import { AlertTriangle, X } from 'lucide-react';
import { useEffect } from 'react';
import type { OrderRequestPayload } from '../../types/fashion';
import { formatNaira } from '../../utils/formatters';
import { calculateOrderTotalNgn } from '../../utils/orderHelpers';

interface CancelOrderConfirmModalProps {
  order: OrderRequestPayload | null;
  isProcessing?: boolean;
  onKeepOrder: () => void;
  onConfirmCancel: () => void;
}

export function CancelOrderConfirmModal({
  order,
  isProcessing = false,
  onKeepOrder,
  onConfirmCancel,
}: CancelOrderConfirmModalProps) {
  useEffect(() => {
    if (!order) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isProcessing) {
        onKeepOrder();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [order, isProcessing, onKeepOrder]);

  if (!order) return null;

  const totalNgn = calculateOrderTotalNgn(order);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cancel-order-confirm-title"
      className="fixed inset-0 z-[60] bg-[#171717]/70 flex items-center justify-center p-4"
    >
      <div className="bg-white w-full max-w-md border border-[#171717]/15">
        <div className="px-6 py-4 border-b border-[#171717]/10 bg-[#FAF7F2] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
            <h2
              id="cancel-order-confirm-title"
              className="font-display text-xl font-medium text-[#171717]"
            >
              Confirm Order Cancellation
            </h2>
          </div>

          <button
            type="button"
            onClick={onKeepOrder}
            disabled={isProcessing}
            aria-label="Close cancellation prompt"
            className="w-8 h-8 flex items-center justify-center text-[#171717]/60 hover:text-[#171717] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-[#171717]/80 leading-relaxed">
            Are you sure you want to mark this order as <strong>Cancelled</strong>? This updates the
            order status only and does not process or refund any external payment automatically.
          </p>

          <div className="p-3.5 bg-[#FAF7F2] border border-[#171717]/10 space-y-1 text-xs">
            <p className="font-semibold text-[#171717]">
              Order Ref: {order.referenceCode || order.id}
            </p>
            <p className="text-[#171717]/75">
              Customer: {order.customerName} ({order.phoneNumber})
            </p>
            <p className="text-[#171717]/75 tabular-nums">
              Total Amount: {formatNaira(totalNgn)}
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onKeepOrder}
              disabled={isProcessing}
              className="px-4 py-2.5 border border-[#171717]/20 bg-white text-xs font-medium text-[#171717] hover:border-[#171717] cursor-pointer"
            >
              Keep Order
            </button>
            <button
              type="button"
              onClick={onConfirmCancel}
              disabled={isProcessing}
              className="px-5 py-2.5 bg-red-700 text-white text-xs font-medium hover:bg-red-800 transition-colors cursor-pointer disabled:opacity-60"
            >
              {isProcessing ? 'Cancelling...' : 'Confirm Cancellation'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
