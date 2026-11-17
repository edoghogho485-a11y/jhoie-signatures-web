import { AlertTriangle, X } from 'lucide-react';
import { useEffect } from 'react';
import type { Product } from '../../types/fashion';
import { formatNaira } from '../../utils/formatters';
import { BrandImage } from '../BrandImage';

interface DeleteProductConfirmModalProps {
  product: Product | null;
  isDeleting?: boolean;
  errorMessage?: string | null;
  onCancel: () => void;
  onConfirm: (product: Product) => void;
}

export function DeleteProductConfirmModal({
  product,
  isDeleting = false,
  errorMessage = null,
  onCancel,
  onConfirm,
}: DeleteProductConfirmModalProps) {
  useEffect(() => {
    if (!product) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isDeleting) {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [product, isDeleting, onCancel]);

  if (!product) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-product-modal-title"
      className="fixed inset-0 z-50 bg-[#171717]/65 flex items-center justify-center p-4"
    >
      <div className="bg-white w-full max-w-md border border-[#171717]/15">
        <div className="px-6 py-4 border-b border-[#171717]/10 bg-[#FAF7F2] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
            <h2
              id="delete-product-modal-title"
              className="font-display text-xl font-medium text-[#171717]"
            >
              Confirm Product Deletion
            </h2>
          </div>

          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            aria-label="Close delete confirmation"
            className="w-8 h-8 flex items-center justify-center text-[#171717]/60 hover:text-[#171717] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {errorMessage && (
            <div
              role="alert"
              className="p-3 bg-red-50 border border-red-200 text-xs text-red-800 leading-relaxed"
            >
              {errorMessage}
            </div>
          )}

          <p className="text-sm text-[#171717]/75 leading-relaxed">
            Are you sure you want to remove this item? It will also be removed immediately from the
            customer-facing Shop and any active shopping bag.
          </p>

          <div className="p-3 bg-[#FAF7F2] border border-[#171717]/10 flex items-center gap-3.5">
            <div className="w-14 h-16 bg-[#F6F1E8] border border-[#171717]/10 shrink-0 overflow-hidden">
              <BrandImage
                src={product.images[0] || ''}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-[#171717] truncate">{product.name}</p>
              <p className="text-xs text-[#171717]/60 mt-0.5">
                {product.category} · <span className="tabular-nums">{formatNaira(product.priceNgn)}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onCancel}
              disabled={isDeleting}
              className="px-4 py-2.5 border border-[#171717]/20 bg-white text-xs font-medium text-[#171717] hover:border-[#171717] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onConfirm(product)}
              disabled={isDeleting}
              className="px-5 py-2.5 bg-red-700 text-white text-xs font-medium hover:bg-red-800 transition-colors cursor-pointer disabled:opacity-60"
            >
              {isDeleting ? 'Deleting...' : 'Delete Product'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
