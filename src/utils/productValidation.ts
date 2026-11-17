import { SHOP_CATEGORIES } from '../data/sampleCatalog';
import type { ProductCategory, ProductColorOption, StockStatus } from '../types/fashion';

export const VALID_STOCK_STATUSES: StockStatus[] = [
  'In Stock',
  'Low Stock',
  'Made to Order',
  'Out of Stock',
];

export interface ProductFormInput {
  name: string;
  description: string;
  fabricAndCare: string;
  category: ProductCategory | '';
  priceNgn: string | number;
  images: string[];
  sizes: string[];
  colors: ProductColorOption[];
  stockQuantity: string | number;
  stockStatus: StockStatus;
  isFeatured: boolean;
  isNewArrival: boolean;
  isBestSeller: boolean;
  isSample?: boolean;
}

export type ProductValidationErrors = Partial<
  Record<
    | 'name'
    | 'description'
    | 'category'
    | 'priceNgn'
    | 'images'
    | 'sizes'
    | 'colors'
    | 'stockQuantity'
    | 'stockStatus',
    string
  >
>;

export interface ProductValidationResult {
  isValid: boolean;
  errors: ProductValidationErrors;
  firstErrorMessage?: string;
}

export function validateProductForm(input: ProductFormInput): ProductValidationResult {
  const errors: ProductValidationErrors = {};

  const trimmedName = input.name.trim();
  if (trimmedName.length < 2) {
    errors.name = 'Please enter a product name (at least 2 characters).';
  }

  const trimmedDescription = input.description.trim();
  if (trimmedDescription.length < 10) {
    errors.description = 'Please enter a clear product description (at least 10 characters).';
  }

  if (!input.category || !SHOP_CATEGORIES.includes(input.category)) {
    errors.category = 'Please select a valid product category.';
  }

  const parsedPrice =
    typeof input.priceNgn === 'number' ? input.priceNgn : Number(String(input.priceNgn).trim());
  if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
    errors.priceNgn = 'Please enter a valid price in Nigerian naira (₦) greater than 0.';
  }

  const validImages = input.images.map((img) => img.trim()).filter(Boolean);
  if (validImages.length === 0) {
    errors.images = 'Please upload or add at least one product photograph.';
  }

  const validSizes = input.sizes.map((s) => s.trim()).filter(Boolean);
  if (validSizes.length === 0) {
    errors.sizes = 'Please select or add at least one available size.';
  }

  const validColors = input.colors.filter((c) => c.name.trim().length > 0 && c.hex.trim().length > 0);
  if (validColors.length === 0) {
    errors.colors = 'Please add at least one available colour.';
  }

  const rawStock = String(input.stockQuantity).trim();
  const parsedStock =
    typeof input.stockQuantity === 'number' ? input.stockQuantity : Number(rawStock);
  if (
    rawStock === '' ||
    !Number.isFinite(parsedStock) ||
    !Number.isInteger(parsedStock) ||
    parsedStock < 0
  ) {
    errors.stockQuantity = 'Please enter a valid whole-number stock quantity (0 or greater).';
  }

  if (!VALID_STOCK_STATUSES.includes(input.stockStatus)) {
    errors.stockStatus = 'Please select a valid availability status.';
  }

  const firstErrorMessage = Object.values(errors)[0];
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    firstErrorMessage,
  };
}

export function normalizeProductFormInput(input: ProductFormInput) {
  return {
    name: input.name.trim(),
    description: input.description.trim(),
    fabricAndCare:
      input.fabricAndCare.trim() || 'Specialist care recommended · Details pending studio specification.',
    category: input.category as ProductCategory,
    priceNgn: Math.round(Number(input.priceNgn)),
    images: input.images.map((img) => img.trim()).filter(Boolean),
    sizes: Array.from(new Set(input.sizes.map((s) => s.trim()).filter(Boolean))),
    colors: input.colors
      .map((c) => ({ name: c.name.trim(), hex: c.hex.trim() || '#171717' }))
      .filter((c) => c.name.length > 0),
    stockQuantity: Math.max(0, Math.floor(Number(input.stockQuantity))),
    stockStatus: input.stockStatus,
    isFeatured: Boolean(input.isFeatured),
    isNewArrival: Boolean(input.isNewArrival),
    isBestSeller: Boolean(input.isBestSeller),
    isSample: Boolean(input.isSample),
  };
}
