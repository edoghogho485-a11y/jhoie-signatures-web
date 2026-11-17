import {
  AlertCircle,
  ArrowLeft,
  ImagePlus,
  Info,
  Plus,
  Star,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { PRODUCT_IMAGE_SLOTS, SHOP_CATEGORIES } from '../../data/sampleCatalog';
import { isSupabaseConfigured } from '../../lib/supabaseClient';
import { supabaseStorageService } from '../../services/supabaseStorageService';
import type { Product, ProductColorOption, StockStatus } from '../../types/fashion';
import {
  normalizeProductFormInput,
  type ProductFormInput,
  type ProductValidationErrors,
  VALID_STOCK_STATUSES,
  validateProductForm,
} from '../../utils/productValidation';
import { BrandImage } from '../BrandImage';

interface ProductFormModalProps {
  isOpen: boolean;
  editingProduct: Product | null;
  onClose: () => void;
  onSubmit: (
    normalized: ReturnType<typeof normalizeProductFormInput>,
    editingId: string | null
  ) => Promise<void>;
}

const STANDARD_SIZE_OPTIONS = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Custom Fit'] as const;

const PRESET_COLOR_OPTIONS: ProductColorOption[] = [
  { name: 'Midnight Black', hex: '#171717' },
  { name: 'Warm Ivory', hex: '#F6F1E8' },
  { name: 'Champagne Gold', hex: '#C6A45C' },
  { name: 'Soft Gold', hex: '#D4B978' },
  { name: 'Emerald Silk', hex: '#1D4D3E' },
  { name: 'Burgundy Velvet', hex: '#631D28' },
];

const STUDIO_FRAME_OPTIONS = [
  { label: 'Ivory Gold Gown Frame', url: PRODUCT_IMAGE_SLOTS.ivoryGoldGown },
  { label: 'Midnight Cape Set Frame', url: PRODUCT_IMAGE_SLOTS.midnightTwoPiece },
  { label: 'Heritage Jacquard Frame', url: PRODUCT_IMAGE_SLOTS.traditionalJacquard },
  { label: 'Pleated Contrast Dress Frame', url: PRODUCT_IMAGE_SLOTS.pleatedContrastDress },
  { label: 'Editorial Couture Frame', url: PRODUCT_IMAGE_SLOTS.heroEditorial },
  { label: 'Atelier Craftsmanship Frame', url: PRODUCT_IMAGE_SLOTS.atelierCraftsmanship },
] as const;

function buildInitialFormState(editingProduct: Product | null): ProductFormInput {
  if (editingProduct) {
    return {
      name: editingProduct.name,
      description: editingProduct.description,
      fabricAndCare: editingProduct.fabricAndCare,
      category: editingProduct.category,
      priceNgn: String(editingProduct.priceNgn),
      images: [...editingProduct.images],
      sizes: [...editingProduct.sizes],
      colors: editingProduct.colors.map((c) => ({ ...c })),
      stockQuantity: String(editingProduct.stockQuantity),
      stockStatus: editingProduct.stockStatus,
      isFeatured: editingProduct.isFeatured,
      isNewArrival: editingProduct.isNewArrival,
      isBestSeller: editingProduct.isBestSeller,
      isSample: editingProduct.isSample,
    };
  }

  return {
    name: '',
    description: '',
    fabricAndCare: '',
    category: 'Dresses',
    priceNgn: '',
    images: [],
    sizes: ['S', 'M', 'L'],
    colors: [{ name: 'Midnight Black', hex: '#171717' }],
    stockQuantity: '5',
    stockStatus: 'In Stock',
    isFeatured: false,
    isNewArrival: true,
    isBestSeller: false,
    isSample: false,
  };
}

export function ProductFormModal({
  isOpen,
  editingProduct,
  onClose,
  onSubmit,
}: ProductFormModalProps) {
  const [form, setForm] = useState<ProductFormInput>(() => buildInitialFormState(editingProduct));
  const [errors, setErrors] = useState<ProductValidationErrors>({});
  const [formBannerError, setFormBannerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessingImages, setIsProcessingImages] = useState(false);

  // Auxiliary input states for custom image URL, custom size, custom colour
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [selectedStudioSlot, setSelectedStudioSlot] = useState<string>(STUDIO_FRAME_OPTIONS[0].url);
  const [customSizeInput, setCustomSizeInput] = useState('');
  const [customColorName, setCustomColorName] = useState('');
  const [customColorHex, setCustomColorHex] = useState('#C6A45C');

  useEffect(() => {
    if (!isOpen) return;
    setForm(buildInitialFormState(editingProduct));
    setErrors({});
    setFormBannerError(null);
    setImageUrlInput('');
    setCustomSizeInput('');
    setCustomColorName('');
  }, [editingProduct, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const clearFieldError = (field: keyof ProductValidationErrors) => {
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
    if (formBannerError) {
      setFormBannerError(null);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsProcessingImages(true);
    try {
      const validImageFiles = files.filter((f) => f.type.startsWith('image/'));
      if (validImageFiles.length === 0) {
        setErrors((prev) => ({
          ...prev,
          images: 'Please choose valid image files (JPG, PNG, or WEBP).',
        }));
        return;
      }

      const uploadedUrls = await Promise.all(
        validImageFiles.map((file) => supabaseStorageService.uploadProductImage(file))
      );
      setForm((prev) => ({
        ...prev,
        images: [...prev.images, ...uploadedUrls],
      }));
      clearFieldError('images');
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        images:
          err instanceof Error && err.message
            ? err.message
            : 'One or more uploaded photos could not be processed. Please try again.',
      }));
    } finally {
      setIsProcessingImages(false);
      e.target.value = '';
    }
  };

  const handleAddImageUrl = () => {
    const trimmed = imageUrlInput.trim();
    if (!trimmed) return;
    if (form.images.includes(trimmed)) {
      setImageUrlInput('');
      return;
    }
    setForm((prev) => ({ ...prev, images: [...prev.images, trimmed] }));
    setImageUrlInput('');
    clearFieldError('images');
  };

  const handleAddStudioFrame = () => {
    if (!selectedStudioSlot) return;
    if (!form.images.includes(selectedStudioSlot)) {
      setForm((prev) => ({ ...prev, images: [...prev.images, selectedStudioSlot] }));
    }
    clearFieldError('images');
  };

  const handleSetCoverImage = (index: number) => {
    if (index === 0) return;
    setForm((prev) => {
      const next = [...prev.images];
      const [chosen] = next.splice(index, 1);
      return { ...prev, images: [chosen, ...next] };
    });
  };

  const handleRemoveImage = (index: number) => {
    setForm((prev) => ({
      ...prev,
      images: prev.images.filter((_, idx) => idx !== index),
    }));
  };

  const toggleSize = (size: string) => {
    setForm((prev) => {
      const exists = prev.sizes.includes(size);
      const nextSizes = exists ? prev.sizes.filter((s) => s !== size) : [...prev.sizes, size];
      return { ...prev, sizes: nextSizes };
    });
    clearFieldError('sizes');
  };

  const handleAddCustomSize = () => {
    const trimmed = customSizeInput.trim();
    if (!trimmed) return;
    if (!form.sizes.includes(trimmed)) {
      setForm((prev) => ({ ...prev, sizes: [...prev.sizes, trimmed] }));
    }
    setCustomSizeInput('');
    clearFieldError('sizes');
  };

  const togglePresetColor = (preset: ProductColorOption) => {
    setForm((prev) => {
      const exists = prev.colors.some(
        (c) => c.name.toLowerCase() === preset.name.toLowerCase()
      );
      const nextColors = exists
        ? prev.colors.filter((c) => c.name.toLowerCase() !== preset.name.toLowerCase())
        : [...prev.colors, preset];
      return { ...prev, colors: nextColors };
    });
    clearFieldError('colors');
  };

  const handleAddCustomColor = () => {
    const trimmed = customColorName.trim();
    if (!trimmed) return;
    if (!form.colors.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) {
      setForm((prev) => ({
        ...prev,
        colors: [...prev.colors, { name: trimmed, hex: customColorHex }],
      }));
    }
    setCustomColorName('');
    clearFieldError('colors');
  };

  const handleRemoveColor = (colorName: string) => {
    setForm((prev) => ({
      ...prev,
      colors: prev.colors.filter((c) => c.name !== colorName),
    }));
  };

  const handleStockStatusChange = (status: StockStatus) => {
    setForm((prev) => ({
      ...prev,
      stockStatus: status,
      stockQuantity: status === 'Out of Stock' ? '0' : prev.stockQuantity === '0' ? '1' : prev.stockQuantity,
    }));
    clearFieldError('stockStatus');
    clearFieldError('stockQuantity');
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateProductForm(form);
    if (!validation.isValid) {
      setErrors(validation.errors);
      setFormBannerError(
        validation.firstErrorMessage || 'Please complete all required product fields before saving.'
      );
      return;
    }

    setIsSubmitting(true);
    setFormBannerError(null);
    try {
      const normalized = normalizeProductFormInput(form);
      await onSubmit(normalized, editingProduct ? editingProduct.id : null);
    } catch (err) {
      setFormBannerError(
        err instanceof Error && err.message
          ? err.message
          : 'Unable to save product changes right now. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const supabaseActive = isSupabaseConfigured();

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-form-modal-title"
      className="fixed inset-0 z-50 bg-[#171717]/65 flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
    >
      <div className="bg-white w-full max-w-3xl max-h-[92vh] flex flex-col border border-[#171717]/15">
        {/* Modal Header */}
        <div className="px-5 sm:px-7 py-4 border-b border-[#171717]/10 bg-[#FAF7F2] flex items-center justify-between gap-4 shrink-0">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#A68642]">
              {editingProduct ? 'Edit Catalogue Item' : 'Add Catalogue Item'}
            </p>
            <h2
              id="product-form-modal-title"
              className="font-display text-2xl font-medium text-[#171717]"
            >
              {editingProduct ? `Edit: ${editingProduct.name}` : 'Add New Product'}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close product form"
            className="w-9 h-9 border border-[#171717]/15 bg-white flex items-center justify-center text-[#171717]/70 hover:text-[#171717] hover:border-[#171717] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleFormSubmit} noValidate className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6">
          {/* Storage mode notice */}
          <div className="p-3.5 bg-[#F6F1E8] border border-[#C6A45C]/45 flex items-start gap-2.5 text-xs text-[#171717]/80">
            <Info className="w-4 h-4 text-[#A68642] shrink-0 mt-0.5" aria-hidden="true" />
            <p>
              {supabaseActive ? (
                <>
                  <strong>Supabase Database &amp; Storage:</strong> Product details and uploaded
                  photographs are stored directly in your Supabase PostgreSQL table and{' '}
                  <code className="font-mono">product-images</code> bucket, updating the live Shop
                  immediately.
                </>
              ) : (
                <>
                  <strong>Temporary Local Storage:</strong> Product details and uploaded
                  photographs are saved in your browser and reflected immediately on the customer
                  Shop &amp; Product Details pages until Supabase Database &amp; Storage are
                  connected.
                </>
              )}
            </p>
          </div>

          {formBannerError && (
            <div
              role="alert"
              className="p-3.5 bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-800"
            >
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{formBannerError}</span>
            </div>
          )}

          {/* Core Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label
                htmlFor="admin-product-name"
                className="block text-xs font-semibold text-[#171717] mb-1.5"
              >
                Product Name <span className="text-red-600">*</span>
              </label>
              <input
                id="admin-product-name"
                type="text"
                value={form.name}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, name: e.target.value }));
                  clearFieldError('name');
                }}
                placeholder="e.g. Ivory Silk Draped Evening Gown"
                className={`w-full px-3.5 py-2.5 text-sm border bg-white focus:outline-none ${
                  errors.name
                    ? 'border-red-500 focus:border-red-600'
                    : 'border-[#171717]/20 focus:border-[#C6A45C]'
                }`}
              />
              {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
            </div>

            <div>
              <label
                htmlFor="admin-product-category"
                className="block text-xs font-semibold text-[#171717] mb-1.5"
              >
                Category <span className="text-red-600">*</span>
              </label>
              <select
                id="admin-product-category"
                value={form.category}
                onChange={(e) => {
                  setForm((prev) => ({
                    ...prev,
                    category: e.target.value as ProductFormInput['category'],
                  }));
                  clearFieldError('category');
                }}
                className={`w-full px-3.5 py-2.5 text-sm border bg-white focus:outline-none ${
                  errors.category
                    ? 'border-red-500 focus:border-red-600'
                    : 'border-[#171717]/20 focus:border-[#C6A45C]'
                }`}
              >
                {SHOP_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              {errors.category && <p className="mt-1 text-xs text-red-600">{errors.category}</p>}
            </div>

            <div>
              <label
                htmlFor="admin-product-price"
                className="block text-xs font-semibold text-[#171717] mb-1.5"
              >
                Price in Nigerian Naira (₦) <span className="text-red-600">*</span>
              </label>
              <div className="relative">
                <span
                  aria-hidden="true"
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-medium text-[#171717]/60"
                >
                  ₦
                </span>
                <input
                  id="admin-product-price"
                  type="number"
                  min={1}
                  step="500"
                  value={form.priceNgn}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, priceNgn: e.target.value }));
                    clearFieldError('priceNgn');
                  }}
                  placeholder="145000"
                  className={`w-full pl-8 pr-3.5 py-2.5 text-sm border bg-white tabular-nums focus:outline-none ${
                    errors.priceNgn
                      ? 'border-red-500 focus:border-red-600'
                      : 'border-[#171717]/20 focus:border-[#C6A45C]'
                  }`}
                />
              </div>
              {errors.priceNgn && <p className="mt-1 text-xs text-red-600">{errors.priceNgn}</p>}
            </div>

            <div>
              <label
                htmlFor="admin-product-stock-qty"
                className="block text-xs font-semibold text-[#171717] mb-1.5"
              >
                Stock Quantity <span className="text-red-600">*</span>
              </label>
              <input
                id="admin-product-stock-qty"
                type="number"
                min={0}
                step={1}
                value={form.stockQuantity}
                onChange={(e) => {
                  const val = e.target.value;
                  setForm((prev) => ({ ...prev, stockQuantity: val }));
                  clearFieldError('stockQuantity');
                }}
                className={`w-full px-3.5 py-2.5 text-sm border bg-white tabular-nums focus:outline-none ${
                  errors.stockQuantity
                    ? 'border-red-500 focus:border-red-600'
                    : 'border-[#171717]/20 focus:border-[#C6A45C]'
                }`}
              />
              {errors.stockQuantity && (
                <p className="mt-1 text-xs text-red-600">{errors.stockQuantity}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="admin-product-status"
                className="block text-xs font-semibold text-[#171717] mb-1.5"
              >
                Availability Status <span className="text-red-600">*</span>
              </label>
              <select
                id="admin-product-status"
                value={form.stockStatus}
                onChange={(e) => handleStockStatusChange(e.target.value as StockStatus)}
                className={`w-full px-3.5 py-2.5 text-sm border bg-white focus:outline-none ${
                  errors.stockStatus
                    ? 'border-red-500 focus:border-red-600'
                    : 'border-[#171717]/20 focus:border-[#C6A45C]'
                }`}
              >
                {VALID_STOCK_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
              {errors.stockStatus && (
                <p className="mt-1 text-xs text-red-600">{errors.stockStatus}</p>
              )}
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="admin-product-description"
                className="block text-xs font-semibold text-[#171717] mb-1.5"
              >
                Product Description <span className="text-red-600">*</span>
              </label>
              <textarea
                id="admin-product-description"
                rows={3}
                value={form.description}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, description: e.target.value }));
                  clearFieldError('description');
                }}
                placeholder="Describe silhouette, tailoring details, occasion suitability, and finish..."
                className={`w-full px-3.5 py-2.5 text-sm border bg-white focus:outline-none ${
                  errors.description
                    ? 'border-red-500 focus:border-red-600'
                    : 'border-[#171717]/20 focus:border-[#C6A45C]'
                }`}
              />
              {errors.description && (
                <p className="mt-1 text-xs text-red-600">{errors.description}</p>
              )}
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="admin-product-fabric"
                className="block text-xs font-semibold text-[#171717] mb-1.5"
              >
                Fabric &amp; Care Instructions <span className="text-[#171717]/50 font-normal">(Optional)</span>
              </label>
              <input
                id="admin-product-fabric"
                type="text"
                value={form.fabricAndCare}
                onChange={(e) => setForm((prev) => ({ ...prev, fabricAndCare: e.target.value }))}
                placeholder="e.g. Duchesse silk blend · Specialist dry clean only"
                className="w-full px-3.5 py-2.5 text-sm border border-[#171717]/20 bg-white focus:border-[#C6A45C] focus:outline-none"
              />
            </div>
          </div>

          {/* Product Photographs (Multiple) */}
          <div className="pt-4 border-t border-[#171717]/10 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold text-[#171717]">
                  Product Photographs <span className="text-red-600">*</span>
                </p>
                <p className="text-xs text-[#171717]/60">
                  Upload multiple photos, add image URLs, or pick a temporary lookbook frame. The
                  first image is the cover photo.
                </p>
              </div>
              <label className="px-3.5 py-2 bg-[#171717] text-white text-xs font-medium hover:bg-[#2a2a2a] transition-colors inline-flex items-center gap-2 cursor-pointer">
                <Upload className="w-3.5 h-3.5 text-[#C6A45C]" aria-hidden="true" />
                <span>{isProcessingImages ? 'Processing...' : 'Upload Photos'}</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileUpload}
                  className="sr-only"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              <div className="flex gap-2">
                <input
                  type="url"
                  value={imageUrlInput}
                  onChange={(e) => setImageUrlInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddImageUrl();
                    }
                  }}
                  placeholder="Paste image URL or /images/..."
                  aria-label="Image URL"
                  className="flex-1 min-w-0 px-3 py-2 text-xs border border-[#171717]/20 focus:border-[#C6A45C] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddImageUrl}
                  className="px-3 py-2 border border-[#171717]/20 bg-[#FAF7F2] text-xs font-medium text-[#171717] hover:border-[#171717] cursor-pointer whitespace-nowrap"
                >
                  Add URL
                </button>
              </div>

              <div className="flex gap-2">
                <select
                  value={selectedStudioSlot}
                  onChange={(e) => setSelectedStudioSlot(e.target.value)}
                  aria-label="Studio placeholder photograph"
                  className="flex-1 min-w-0 px-3 py-2 text-xs border border-[#171717]/20 bg-white focus:border-[#C6A45C] focus:outline-none"
                >
                  {STUDIO_FRAME_OPTIONS.map((slot) => (
                    <option key={slot.url} value={slot.url}>
                      {slot.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleAddStudioFrame}
                  className="px-3 py-2 border border-[#171717]/20 bg-[#FAF7F2] text-xs font-medium text-[#171717] hover:border-[#171717] inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <ImagePlus className="w-3.5 h-3.5 text-[#A68642]" aria-hidden="true" />
                  <span>Use Frame</span>
                </button>
              </div>
            </div>

            {form.images.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                {form.images.map((imgUrl, index) => (
                  <div
                    key={`${imgUrl.slice(0, 32)}-${index}`}
                    className="border border-[#171717]/15 bg-[#FAF7F2] flex flex-col"
                  >
                    <div className="relative aspect-[3/4] bg-[#F6F1E8] overflow-hidden">
                      <BrandImage
                        src={imgUrl}
                        alt={`Product photo ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      {index === 0 && (
                        <span className="absolute top-2 left-2 px-2 py-0.5 bg-[#171717] text-[#C6A45C] text-[10px] font-semibold uppercase tracking-wider">
                          Cover
                        </span>
                      )}
                    </div>
                    <div className="p-1.5 flex items-center justify-between gap-1 border-t border-[#171717]/10 bg-white">
                      {index > 0 ? (
                        <button
                          type="button"
                          onClick={() => handleSetCoverImage(index)}
                          className="text-[11px] font-medium text-[#171717]/80 hover:text-[#A68642] inline-flex items-center gap-1 cursor-pointer"
                        >
                          <ArrowLeft className="w-3 h-3" aria-hidden="true" />
                          <span>Make Cover</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-[#171717]/50">Primary</span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(index)}
                        aria-label={`Remove photograph ${index + 1}`}
                        className="p-1 text-[#171717]/55 hover:text-red-600 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 px-4 border border-dashed border-[#171717]/20 bg-[#FAF7F2] text-center text-xs text-[#171717]/60">
                No product photographs added yet. Upload one or more photos or select a lookbook
                frame above.
              </div>
            )}
            {errors.images && <p className="text-xs text-red-600">{errors.images}</p>}
          </div>

          {/* Available Sizes */}
          <div className="pt-4 border-t border-[#171717]/10 space-y-2.5">
            <label className="block text-xs font-semibold text-[#171717]">
              Available Sizes <span className="text-red-600">*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {STANDARD_SIZE_OPTIONS.map((size) => {
                const active = form.sizes.includes(size);
                return (
                  <button
                    key={size}
                    type="button"
                    onClick={() => toggleSize(size)}
                    className={`px-3 py-1.5 text-xs font-medium border transition-colors cursor-pointer ${
                      active
                        ? 'bg-[#171717] text-white border-[#171717]'
                        : 'bg-white text-[#171717]/80 border-[#171717]/20 hover:border-[#171717]'
                    }`}
                  >
                    {size}
                  </button>
                );
              })}
              {form.sizes
                .filter((s) => !(STANDARD_SIZE_OPTIONS as readonly string[]).includes(s))
                .map((customSize) => (
                  <button
                    key={customSize}
                    type="button"
                    onClick={() => toggleSize(customSize)}
                    className="px-3 py-1.5 text-xs font-medium bg-[#171717] text-white border border-[#171717] inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>{customSize}</span>
                    <X className="w-3 h-3" aria-hidden="true" />
                  </button>
                ))}
            </div>
            <div className="flex gap-2 max-w-xs pt-1">
              <input
                type="text"
                value={customSizeInput}
                onChange={(e) => setCustomSizeInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomSize();
                  }
                }}
                placeholder="Add custom size (e.g. UK 14)"
                aria-label="Custom size"
                className="flex-1 min-w-0 px-3 py-1.5 text-xs border border-[#171717]/20 focus:border-[#C6A45C] focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddCustomSize}
                className="px-3 py-1.5 border border-[#171717]/20 bg-[#FAF7F2] text-xs font-medium hover:border-[#171717] inline-flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" aria-hidden="true" />
                <span>Add</span>
              </button>
            </div>
            {errors.sizes && <p className="text-xs text-red-600">{errors.sizes}</p>}
          </div>

          {/* Available Colours */}
          <div className="pt-4 border-t border-[#171717]/10 space-y-3">
            <label className="block text-xs font-semibold text-[#171717]">
              Available Colours <span className="text-red-600">*</span>
            </label>

            <div className="flex flex-wrap gap-2">
              {PRESET_COLOR_OPTIONS.map((preset) => {
                const selected = form.colors.some(
                  (c) => c.name.toLowerCase() === preset.name.toLowerCase()
                );
                return (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => togglePresetColor(preset)}
                    className={`px-3 py-1.5 text-xs border inline-flex items-center gap-2 transition-colors cursor-pointer ${
                      selected
                        ? 'border-[#171717] bg-[#F6F1E8] text-[#171717] font-medium'
                        : 'border-[#171717]/20 bg-white text-[#171717]/75 hover:border-[#171717]/50'
                    }`}
                  >
                    <span
                      className="w-3 h-3 border border-[#171717]/25 shrink-0"
                      style={{ backgroundColor: preset.hex }}
                      aria-hidden="true"
                    />
                    <span>{preset.name}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                type="color"
                value={customColorHex}
                onChange={(e) => setCustomColorHex(e.target.value)}
                aria-label="Custom colour swatch"
                className="w-9 h-8 p-0.5 border border-[#171717]/20 bg-white cursor-pointer"
              />
              <input
                type="text"
                value={customColorName}
                onChange={(e) => setCustomColorName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomColor();
                  }
                }}
                placeholder="Custom colour name (e.g. Champagne Silk)"
                aria-label="Custom colour name"
                className="flex-1 min-w-[180px] max-w-xs px-3 py-1.5 text-xs border border-[#171717]/20 focus:border-[#C6A45C] focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddCustomColor}
                className="px-3 py-1.5 border border-[#171717]/20 bg-[#FAF7F2] text-xs font-medium hover:border-[#171717] inline-flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" aria-hidden="true" />
                <span>Add Colour</span>
              </button>
            </div>

            {form.colors.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {form.colors.map((color) => (
                  <span
                    key={color.name}
                    className="inline-flex items-center gap-2 px-2.5 py-1 bg-white border border-[#171717]/15 text-xs text-[#171717]"
                  >
                    <span
                      className="w-3 h-3 border border-[#171717]/25"
                      style={{ backgroundColor: color.hex }}
                      aria-hidden="true"
                    />
                    <span>{color.name}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveColor(color.name)}
                      aria-label={`Remove ${color.name}`}
                      className="text-[#171717]/50 hover:text-red-600 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            {errors.colors && <p className="text-xs text-red-600">{errors.colors}</p>}
          </div>

          {/* Storefront Visibility Toggles */}
          <div className="pt-4 border-t border-[#171717]/10 space-y-3">
            <p className="text-xs font-semibold text-[#171717]">Storefront Merchandising</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className="flex items-start gap-2.5 p-3 border border-[#171717]/15 bg-[#FAF7F2] cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isFeatured}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, isFeatured: e.target.checked }))
                  }
                  className="mt-0.5 accent-[#171717]"
                />
                <span className="text-xs">
                  <span className="font-semibold text-[#171717] inline-flex items-center gap-1">
                    <Star className="w-3 h-3 text-[#A68642]" aria-hidden="true" />
                    Featured Product
                  </span>
                  <span className="block text-[#171717]/60 mt-0.5">
                    Highlight in editorial showcase
                  </span>
                </span>
              </label>

              <label className="flex items-start gap-2.5 p-3 border border-[#171717]/15 bg-[#FAF7F2] cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isNewArrival}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, isNewArrival: e.target.checked }))
                  }
                  className="mt-0.5 accent-[#171717]"
                />
                <span className="text-xs">
                  <span className="font-semibold text-[#171717] block">New Arrival</span>
                  <span className="block text-[#171717]/60 mt-0.5">
                    Display in Homepage New Arrivals
                  </span>
                </span>
              </label>

              <label className="flex items-start gap-2.5 p-3 border border-[#171717]/15 bg-[#FAF7F2] cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isBestSeller}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, isBestSeller: e.target.checked }))
                  }
                  className="mt-0.5 accent-[#171717]"
                />
                <span className="text-xs">
                  <span className="font-semibold text-[#171717] block">Best Seller</span>
                  <span className="block text-[#171717]/60 mt-0.5">
                    Show in Best-Selling Outfits
                  </span>
                </span>
              </label>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="pt-4 border-t border-[#171717]/10 flex flex-col-reverse sm:flex-row sm:items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-5 py-2.5 border border-[#171717]/20 bg-white text-xs font-medium text-[#171717] hover:border-[#171717] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-[#171717] text-white text-xs font-medium hover:bg-[#2a2a2a] transition-colors cursor-pointer disabled:opacity-60"
            >
              {isSubmitting
                ? 'Saving...'
                : editingProduct
                ? 'Save Product Changes'
                : 'Add Product to Catalogue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
