import { BRAND_CONTACT_CONFIG } from '../config/brandContactConfig';
import { WHATSAPP_CONFIG } from '../config/whatsappConfig';
import { SAMPLE_PRODUCTS } from '../data/sampleCatalog';
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabaseClient';
import type {
  CartItem,
  ContactInquiryPayload,
  CustomOrderPayload,
  CustomOutfitType,
  CustomRequestStatus,
  EnquiryStatus,
  OrderRequestPayload,
  OrderStatus,
  PaymentStatus,
  Product,
  ProductCategory,
  ProductColorOption,
  StockStatus,
  WebsiteSettings,
} from '../types/fashion';
import type { Database, Json } from '../types/supabase';
import { normalizeCustomRequestStatus } from '../utils/customRequestHelpers';
import { normalizeEnquiryStatus } from '../utils/enquiryHelpers';
import {
  calculateOrderTotalNgn,
  normalizeOrderStatus,
  normalizePaymentStatus,
} from '../utils/orderHelpers';
import { supabaseStorageService } from './supabaseStorageService';

/**
 * Repository abstraction layer for JHOIE SIGNATURES.
 *
 * - When `VITE_SUPABASE_URL` & `VITE_SUPABASE_ANON_KEY` are configured:
 *   Reads and writes directly against Supabase Postgres (`products`, `orders`,
 *   `order_items`, `custom_orders`, `contact_inquiries`, `website_settings`)
 *   using server-side RLS policies and verified RPC functions.
 * - When Supabase env vars are absent (local preview / automated unit tests):
 *   Uses localStorage persistence cleanly without crashing.
 */

export const STORAGE_KEYS = {
  PRODUCTS: 'jhoie_signatures_products_v1',
  CART: 'jhoie_signatures_cart_v1',
  ORDERS: 'jhoie_signatures_orders_v1',
  CUSTOM_ORDERS: 'jhoie_signatures_custom_orders_v1',
  CONTACT_INQUIRIES: 'jhoie_signatures_inquiries_v1',
  SETTINGS: 'jhoie_signatures_settings_v1',
} as const;

export const DEFAULT_WEBSITE_SETTINGS: WebsiteSettings = {
  brandName: BRAND_CONTACT_CONFIG.brandName,
  tagline: BRAND_CONTACT_CONFIG.tagline,
  whatsappNumberRaw: BRAND_CONTACT_CONFIG.whatsapp.numberRaw,
  whatsappDisplayLabel: BRAND_CONTACT_CONFIG.whatsapp.displayLabel,
  whatsappIsPlaceholder: BRAND_CONTACT_CONFIG.whatsapp.isPlaceholder,
  businessEmail: BRAND_CONTACT_CONFIG.businessEmailPlaceholder,
  businessPhone: BRAND_CONTACT_CONFIG.businessPhonePlaceholder,
  instagramHandle: BRAND_CONTACT_CONFIG.instagram.handle,
  instagramUrl: BRAND_CONTACT_CONFIG.instagram.profileUrl,
  businessLocation: BRAND_CONTACT_CONFIG.businessLocationPlaceholder,
  businessHours: BRAND_CONTACT_CONFIG.businessHoursPlaceholder,
  currencyCode: 'NGN',
  currencySymbol: '₦',
  currencyLabel: 'Nigerian naira (₦)',
};

function generateReferenceCode(prefix: string): string {
  const randomPart = Math.floor(1000 + Math.random() * 9000);
  const timePart = Date.now().toString().slice(-4);
  return `${prefix}-${timePart}${randomPart}`;
}

function slugifyProductName(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  const suffix = Date.now().toString(36).slice(-4);
  return `${base || 'jhoie-item'}-${suffix}`;
}

function readStorageArray<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStorageArray<T>(key: string, data: T[]): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

function normalizeAssetPath(url: string): string {
  return url.startsWith('/src/assets/images/')
    ? url.replace('/src/assets/images/', '/images/')
    : url;
}

function normalizeProductImages(product: Product): Product {
  return {
    ...product,
    images: Array.isArray(product.images) ? product.images.map(normalizeAssetPath) : [],
  };
}

function cloneSampleProducts(): Product[] {
  return SAMPLE_PRODUCTS.map((product) => ({
    ...product,
    images: [...product.images],
    sizes: [...product.sizes],
    colors: product.colors.map((c) => ({ ...c })),
  }));
}

type DbProductRow = Database['public']['Tables']['products']['Row'];
type DbOrderRow = Database['public']['Tables']['orders']['Row'];
type DbOrderItemRow = Database['public']['Tables']['order_items']['Row'];
type DbCustomOrderRow = Database['public']['Tables']['custom_orders']['Row'];
type DbInquiryRow = Database['public']['Tables']['contact_inquiries']['Row'];
type DbSettingsRow = Database['public']['Tables']['website_settings']['Row'];

function parseColorsJson(raw: Json): ProductColorOption[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return null;
      const obj = entry as Record<string, unknown>;
      const name = typeof obj.name === 'string' ? obj.name.trim() : '';
      const hex = typeof obj.hex === 'string' ? obj.hex.trim() : '#171717';
      return name ? { name, hex: hex || '#171717' } : null;
    })
    .filter((c): c is ProductColorOption => c !== null);
}

function mapDbProductToDomain(row: DbProductRow): Product {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    isSample: Boolean(row.is_sample),
    category: row.category as ProductCategory,
    priceNgn: Number(row.price_ngn),
    description: row.description,
    fabricAndCare: row.fabric_and_care || '',
    images: Array.isArray(row.images) ? row.images.map(normalizeAssetPath) : [],
    sizes: Array.isArray(row.sizes) ? row.sizes : [],
    colors: parseColorsJson(row.colors),
    stockStatus: row.stock_status as StockStatus,
    stockQuantity: Number(row.stock_quantity),
    isFeatured: Boolean(row.is_featured),
    isNewArrival: Boolean(row.is_new_arrival),
    isBestSeller: Boolean(row.is_best_seller),
    isPublished: row.is_published,
    createdAt: row.created_at,
  };
}

function mapDbOrderToDomain(
  row: DbOrderRow & { order_items?: DbOrderItemRow[] }
): OrderRequestPayload {
  const items: CartItem[] = Array.isArray(row.order_items)
    ? row.order_items.map((item) => ({
        id: item.id,
        productId: item.product_id || '',
        name: item.product_name,
        category: item.category as ProductCategory,
        image: item.product_image ? normalizeAssetPath(item.product_image) : '',
        priceNgn: Number(item.unit_price_ngn),
        selectedSize: item.selected_size,
        selectedColor: item.selected_color,
        quantity: Number(item.quantity),
      }))
    : [];

  return normalizeOrderRecord({
    id: row.id,
    referenceCode: row.reference_code,
    customerName: row.customer_name,
    phoneNumber: row.phone_number,
    email: row.email || undefined,
    deliveryAddress: row.delivery_address,
    cityState: row.city_state,
    deliveryNotes: row.delivery_notes || undefined,
    items,
    subtotalNgn: Number(row.subtotal_ngn),
    deliveryFeeNgn: Number(row.delivery_fee_ngn),
    totalAmountNgn: Number(row.total_amount_ngn),
    status: row.status as OrderStatus,
    paymentStatus: row.payment_status as PaymentStatus,
    internalNotes: row.internal_notes || undefined,
    isDemo: Boolean(row.is_demo),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

function mapDbCustomOrderToDomain(
  row: DbCustomOrderRow,
  signedUrlMap?: Record<string, string>
): CustomOrderPayload {
  const rawMeasurements =
    row.measurements && typeof row.measurements === 'object' && !Array.isArray(row.measurements)
      ? (row.measurements as Record<string, unknown>)
      : {};

  const refPath = row.reference_image_path || undefined;
  const signedPreview = refPath && signedUrlMap ? signedUrlMap[refPath] : undefined;

  return normalizeCustomOrderRecord({
    id: row.id,
    referenceCode: row.reference_code,
    customerName: row.customer_name,
    contactNumber: row.contact_number,
    email: row.email || undefined,
    outfitType: row.outfit_type as CustomOutfitType,
    outfitDescription: row.outfit_description,
    preferredFabric: row.preferred_fabric || undefined,
    preferredColor: row.preferred_color,
    preferredOccasion: row.preferred_occasion || undefined,
    preferredDeliveryDate: row.preferred_delivery_date,
    budgetNgn: row.budget_ngn !== null ? Number(row.budget_ngn) : undefined,
    standardSizeReference: row.standard_size_reference || undefined,
    measurementUnit: row.measurement_unit === 'cm' ? 'cm' : 'inches',
    measurements: {
      bust: typeof rawMeasurements.bust === 'string' ? rawMeasurements.bust : '',
      waist: typeof rawMeasurements.waist === 'string' ? rawMeasurements.waist : '',
      hips: typeof rawMeasurements.hips === 'string' ? rawMeasurements.hips : '',
      shoulder: typeof rawMeasurements.shoulder === 'string' ? rawMeasurements.shoulder : '',
      length: typeof rawMeasurements.length === 'string' ? rawMeasurements.length : '',
      notes: typeof rawMeasurements.notes === 'string' ? rawMeasurements.notes : '',
    },
    additionalNotes: row.additional_notes || undefined,
    referenceImageName: row.reference_image_name || undefined,
    referenceImagePath: refPath,
    referenceImagePreviewUrl: signedPreview,
    status: row.status as CustomRequestStatus,
    internalNotes: row.internal_notes || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

function mapDbInquiryToDomain(row: DbInquiryRow): ContactInquiryPayload {
  return normalizeEnquiryRecord({
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone || '',
    subject: row.subject,
    message: row.message,
    status: row.status as EnquiryStatus,
    internalNotes: row.internal_notes || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

function mapDbSettingsToDomain(row: DbSettingsRow): WebsiteSettings {
  return {
    brandName: row.brand_name || DEFAULT_WEBSITE_SETTINGS.brandName,
    tagline: row.tagline || DEFAULT_WEBSITE_SETTINGS.tagline,
    whatsappNumberRaw: row.whatsapp_number_raw || DEFAULT_WEBSITE_SETTINGS.whatsappNumberRaw,
    whatsappDisplayLabel: row.whatsapp_display_label || DEFAULT_WEBSITE_SETTINGS.whatsappDisplayLabel,
    whatsappIsPlaceholder: Boolean(row.whatsapp_is_placeholder),
    businessEmail: row.business_email || DEFAULT_WEBSITE_SETTINGS.businessEmail,
    businessPhone: row.business_phone || DEFAULT_WEBSITE_SETTINGS.businessPhone,
    instagramHandle: row.instagram_handle || DEFAULT_WEBSITE_SETTINGS.instagramHandle,
    instagramUrl: row.instagram_url || DEFAULT_WEBSITE_SETTINGS.instagramUrl,
    businessLocation: row.business_location || DEFAULT_WEBSITE_SETTINGS.businessLocation,
    businessHours: row.business_hours || DEFAULT_WEBSITE_SETTINGS.businessHours,
    currencyCode: 'NGN',
    currencySymbol: '₦',
    currencyLabel: row.currency_label || DEFAULT_WEBSITE_SETTINGS.currencyLabel,
    updatedAt: row.updated_at,
  };
}

export type ProductInputPayload = Omit<Product, 'id' | 'slug' | 'createdAt'>;

export const catalogRepository = {
  /**
   * Synchronous local loader for initial hydration when Supabase is not configured.
   */
  loadProducts(): Product[] {
    if (isSupabaseConfigured()) {
      return [];
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      if (raw === null) {
        return cloneSampleProducts();
      }
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return (parsed as Product[]).map(normalizeProductImages);
      }
      return cloneSampleProducts();
    } catch {
      return cloneSampleProducts();
    }
  },

  saveProducts(products: Product[]): boolean {
    if (isSupabaseConfigured()) return true;
    return writeStorageArray(STORAGE_KEYS.PRODUCTS, products);
  },

  async listProducts(): Promise<Product[]> {
    const client = getSupabaseClient();
    if (client && isSupabaseConfigured()) {
      const { data, error } = await client
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Unable to load products from Supabase: ${error.message}`);
      }
      return (data || []).map(mapDbProductToDomain);
    }

    return this.loadProducts();
  },

  async getProductById(id: string): Promise<Product | undefined> {
    const client = getSupabaseClient();
    if (client && isSupabaseConfigured()) {
      const { data, error } = await client
        .from('products')
        .select('*')
        .or(`id.eq.${id},slug.eq.${id}`)
        .maybeSingle();

      if (error || !data) return undefined;
      return mapDbProductToDomain(data);
    }
    return this.loadProducts().find((item) => item.id === id);
  },

  async createProduct(
    payload: ProductInputPayload,
    currentProducts?: Product[]
  ): Promise<{ product: Product; products: Product[]; persisted: boolean }> {
    const client = getSupabaseClient();
    if (client && isSupabaseConfigured()) {
      const slug = slugifyProductName(payload.name);
      const { data, error } = await client
        .from('products')
        .insert({
          slug,
          name: payload.name,
          is_sample: Boolean(payload.isSample),
          category: payload.category,
          price_ngn: payload.priceNgn,
          description: payload.description,
          fabric_and_care: payload.fabricAndCare,
          images: payload.images,
          sizes: payload.sizes,
          colors: payload.colors as unknown as Json,
          stock_status: payload.stockStatus,
          stock_quantity: payload.stockQuantity,
          is_featured: payload.isFeatured,
          is_new_arrival: payload.isNewArrival,
          is_best_seller: payload.isBestSeller,
          is_published: payload.isPublished ?? true,
        })
        .select('*')
        .single();

      if (error || !data) {
        throw new Error(error?.message || 'Unable to create product in Supabase.');
      }

      const product = mapDbProductToDomain(data);
      const existing = currentProducts ?? [];
      return { product, products: [product, ...existing], persisted: true };
    }

    const existing = currentProducts ?? this.loadProducts();
    const newProduct: Product = {
      ...payload,
      id:
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? `prod_${crypto.randomUUID().slice(0, 8)}`
          : `prod_${Date.now()}`,
      slug: slugifyProductName(payload.name),
      createdAt: new Date().toISOString(),
    };
    const nextProducts = [newProduct, ...existing];
    const persisted = this.saveProducts(nextProducts);
    return { product: newProduct, products: nextProducts, persisted };
  },

  async updateProduct(
    id: string,
    updates: Partial<ProductInputPayload>,
    currentProducts?: Product[]
  ): Promise<{ product: Product; products: Product[]; persisted: boolean }> {
    const client = getSupabaseClient();
    if (client && isSupabaseConfigured()) {
      const patch: Database['public']['Tables']['products']['Update'] = {};
      if (updates.name !== undefined) patch.name = updates.name;
      if (updates.description !== undefined) patch.description = updates.description;
      if (updates.fabricAndCare !== undefined) patch.fabric_and_care = updates.fabricAndCare;
      if (updates.category !== undefined) patch.category = updates.category;
      if (updates.priceNgn !== undefined) patch.price_ngn = updates.priceNgn;
      if (updates.images !== undefined) patch.images = updates.images;
      if (updates.sizes !== undefined) patch.sizes = updates.sizes;
      if (updates.colors !== undefined) patch.colors = updates.colors as unknown as Json;
      if (updates.stockStatus !== undefined) patch.stock_status = updates.stockStatus;
      if (updates.stockQuantity !== undefined) patch.stock_quantity = updates.stockQuantity;
      if (updates.isFeatured !== undefined) patch.is_featured = updates.isFeatured;
      if (updates.isNewArrival !== undefined) patch.is_new_arrival = updates.isNewArrival;
      if (updates.isBestSeller !== undefined) patch.is_best_seller = updates.isBestSeller;
      if (updates.isSample !== undefined) patch.is_sample = updates.isSample;
      if (updates.isPublished !== undefined) patch.is_published = updates.isPublished;

      const { data, error } = await client
        .from('products')
        .update(patch)
        .eq('id', id)
        .select('*')
        .single();

      if (error || !data) {
        throw new Error(error?.message || `Unable to update product "${id}" in Supabase.`);
      }

      const updated = mapDbProductToDomain(data);
      const nextProducts = (currentProducts ?? []).map((item) => (item.id === id ? updated : item));
      return { product: updated, products: nextProducts, persisted: true };
    }

    const existing = currentProducts ?? this.loadProducts();
    let updatedProduct: Product | undefined;

    const nextProducts = existing.map((item) => {
      if (item.id !== id) return item;
      updatedProduct = {
        ...item,
        ...updates,
        id: item.id,
        slug:
          updates.name && updates.name !== item.name ? slugifyProductName(updates.name) : item.slug,
        createdAt: item.createdAt,
      };
      return updatedProduct;
    });

    if (!updatedProduct) {
      throw new Error(`Product with id "${id}" was not found.`);
    }

    const persisted = this.saveProducts(nextProducts);
    return { product: updatedProduct, products: nextProducts, persisted };
  },

  async deleteProduct(
    id: string,
    currentProducts?: Product[]
  ): Promise<{ products: Product[]; persisted: boolean }> {
    const client = getSupabaseClient();
    if (client && isSupabaseConfigured()) {
      const { error } = await client.rpc('delete_product_safely', {
        p_product_id: id,
      });

      if (error) {
        throw new Error(error.message || 'Unable to delete product in Supabase.');
      }

      const nextProducts = (currentProducts ?? []).filter((item) => item.id !== id);
      return { products: nextProducts, persisted: true };
    }

    const existing = currentProducts ?? this.loadProducts();
    const nextProducts = existing.filter((item) => item.id !== id);
    const persisted = this.saveProducts(nextProducts);
    return { products: nextProducts, persisted };
  },

  resetToSampleCatalog(): { products: Product[]; persisted: boolean } {
    const samples = cloneSampleProducts();
    const persisted = this.saveProducts(samples);
    return { products: samples, persisted };
  },
};

export const cartStorage = {
  load(): CartItem[] {
    return readStorageArray<CartItem>(STORAGE_KEYS.CART).map((item) => ({
      ...item,
      image: item.image ? normalizeAssetPath(item.image) : '',
    }));
  },
  save(items: CartItem[]): void {
    writeStorageArray(STORAGE_KEYS.CART, items);
  },
};

function normalizeOrderRecord(record: OrderRequestPayload): OrderRequestPayload {
  const deliveryFeeNgn =
    typeof record.deliveryFeeNgn === 'number' && Number.isFinite(record.deliveryFeeNgn)
      ? Math.max(0, record.deliveryFeeNgn)
      : 0;
  return {
    ...record,
    items: Array.isArray(record.items)
      ? record.items.map((item) => ({
          ...item,
          image: item.image ? normalizeAssetPath(item.image) : '',
        }))
      : [],
    deliveryFeeNgn,
    totalAmountNgn: calculateOrderTotalNgn({
      subtotalNgn: record.subtotalNgn,
      deliveryFeeNgn,
    }),
    status: normalizeOrderStatus(record.status),
    paymentStatus: normalizePaymentStatus(record.paymentStatus),
  };
}

export interface OrderUpdateInput {
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  deliveryFeeNgn?: number;
  internalNotes?: string;
}

export const ordersRepository = {
  loadOrders(): OrderRequestPayload[] {
    if (isSupabaseConfigured()) return [];
    return readStorageArray<OrderRequestPayload>(STORAGE_KEYS.ORDERS).map(normalizeOrderRecord);
  },

  saveOrders(orders: OrderRequestPayload[]): boolean {
    if (isSupabaseConfigured()) return true;
    return writeStorageArray(STORAGE_KEYS.ORDERS, orders);
  },

  async createOrderRequest(payload: OrderRequestPayload): Promise<OrderRequestPayload> {
    const client = getSupabaseClient();
    if (client && isSupabaseConfigured()) {
      const rpcItems = payload.items.map((item) => ({
        product_id: item.productId,
        selected_size: item.selectedSize,
        selected_color: item.selectedColor,
        quantity: item.quantity,
      }));

      const { data, error } = await client.rpc('create_verified_order', {
        p_customer_name: payload.customerName,
        p_phone_number: payload.phoneNumber,
        p_email: payload.email || null,
        p_delivery_address: payload.deliveryAddress,
        p_city_state: payload.cityState,
        p_delivery_notes: payload.deliveryNotes || null,
        p_items: rpcItems as unknown as Json,
      });

      if (error || !data || typeof data !== 'object' || Array.isArray(data)) {
        throw new Error(
          error?.message || 'Unable to submit order request to Supabase. Please verify your bag and try again.'
        );
      }

      const raw = data as unknown as OrderRequestPayload;
      return normalizeOrderRecord(raw);
    }

    const now = new Date().toISOString();
    const deliveryFeeNgn =
      typeof payload.deliveryFeeNgn === 'number' && Number.isFinite(payload.deliveryFeeNgn)
        ? Math.max(0, payload.deliveryFeeNgn)
        : 0;

    const record = normalizeOrderRecord({
      ...payload,
      id:
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? `ord_${crypto.randomUUID().slice(0, 8)}`
          : `ord_${Date.now()}`,
      referenceCode: generateReferenceCode('JS-ORD'),
      deliveryFeeNgn,
      status: payload.status || 'New',
      paymentStatus: payload.paymentStatus || 'Unpaid',
      createdAt: now,
      updatedAt: now,
    });

    const existing = this.loadOrders();
    this.saveOrders([record, ...existing]);
    return record;
  },

  async listOrders(): Promise<OrderRequestPayload[]> {
    const client = getSupabaseClient();
    if (client && isSupabaseConfigured()) {
      const { data, error } = await client
        .from('orders')
        .select('*, order_items(*)')
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Unable to load orders from Supabase: ${error.message}`);
      }
      return (data || []).map((row) =>
        mapDbOrderToDomain(row as DbOrderRow & { order_items?: DbOrderItemRow[] })
      );
    }

    return this.loadOrders();
  },

  async updateOrder(
    id: string,
    updates: OrderUpdateInput,
    currentOrders?: OrderRequestPayload[]
  ): Promise<{ order: OrderRequestPayload; orders: OrderRequestPayload[]; persisted: boolean }> {
    const client = getSupabaseClient();
    if (client && isSupabaseConfigured()) {
      const currentTarget = currentOrders?.find(
        (o) => o.id === id || o.referenceCode === id
      );
      const nextDeliveryFee =
        typeof updates.deliveryFeeNgn === 'number' && Number.isFinite(updates.deliveryFeeNgn)
          ? Math.max(0, Math.round(updates.deliveryFeeNgn))
          : currentTarget?.deliveryFeeNgn ?? 0;

      const patch: Database['public']['Tables']['orders']['Update'] = {};
      if (updates.status !== undefined) patch.status = updates.status;
      if (updates.paymentStatus !== undefined) patch.payment_status = updates.paymentStatus;
      if (updates.deliveryFeeNgn !== undefined) {
        patch.delivery_fee_ngn = nextDeliveryFee;
        if (currentTarget) {
          patch.total_amount_ngn = calculateOrderTotalNgn({
            subtotalNgn: currentTarget.subtotalNgn,
            deliveryFeeNgn: nextDeliveryFee,
          });
        }
      }
      if (updates.internalNotes !== undefined) {
        patch.internal_notes = updates.internalNotes || null;
      }

      const { data, error } = await client
        .from('orders')
        .update(patch)
        .eq('id', id)
        .select('*, order_items(*)')
        .single();

      if (error || !data) {
        throw new Error(error?.message || `Unable to update order "${id}" in Supabase.`);
      }

      const updatedOrder = mapDbOrderToDomain(
        data as DbOrderRow & { order_items?: DbOrderItemRow[] }
      );
      const nextOrders = (currentOrders ?? []).map((item) =>
        item.id === id || item.referenceCode === id ? updatedOrder : item
      );
      return { order: updatedOrder, orders: nextOrders, persisted: true };
    }

    const existing = currentOrders ? currentOrders.map(normalizeOrderRecord) : this.loadOrders();
    let updatedOrder: OrderRequestPayload | undefined;

    const nextOrders = existing.map((item) => {
      if (item.id !== id && item.referenceCode !== id) return item;
      const nextDeliveryFee =
        typeof updates.deliveryFeeNgn === 'number' && Number.isFinite(updates.deliveryFeeNgn)
          ? Math.max(0, Math.round(updates.deliveryFeeNgn))
          : item.deliveryFeeNgn ?? 0;

      updatedOrder = normalizeOrderRecord({
        ...item,
        status: updates.status ?? item.status,
        paymentStatus: updates.paymentStatus ?? item.paymentStatus,
        deliveryFeeNgn: nextDeliveryFee,
        internalNotes:
          updates.internalNotes !== undefined ? updates.internalNotes : item.internalNotes,
        updatedAt: new Date().toISOString(),
      });
      return updatedOrder;
    });

    if (!updatedOrder) {
      throw new Error(`Order with id "${id}" was not found.`);
    }

    const persisted = this.saveOrders(nextOrders);
    return { order: updatedOrder, orders: nextOrders, persisted };
  },
};

function normalizeCustomOrderRecord(record: CustomOrderPayload): CustomOrderPayload {
  return {
    ...record,
    status: normalizeCustomRequestStatus(record.status),
  };
}

export interface CustomOrderUpdateInput {
  status?: CustomRequestStatus;
  internalNotes?: string;
}

export const customOrdersRepository = {
  loadCustomOrders(): CustomOrderPayload[] {
    if (isSupabaseConfigured()) return [];
    return readStorageArray<CustomOrderPayload>(STORAGE_KEYS.CUSTOM_ORDERS).map(
      normalizeCustomOrderRecord
    );
  },

  saveCustomOrders(requests: CustomOrderPayload[]): boolean {
    if (isSupabaseConfigured()) return true;
    return writeStorageArray(STORAGE_KEYS.CUSTOM_ORDERS, requests);
  },

  async submitCustomOrder(payload: CustomOrderPayload): Promise<CustomOrderPayload> {
    const client = getSupabaseClient();
    if (client && isSupabaseConfigured()) {
      const { data, error } = await client.rpc('submit_custom_order', {
        p_customer_name: payload.customerName,
        p_contact_number: payload.contactNumber,
        p_email: payload.email || null,
        p_outfit_type: payload.outfitType,
        p_outfit_description: payload.outfitDescription,
        p_preferred_fabric: payload.preferredFabric || null,
        p_preferred_color: payload.preferredColor,
        p_preferred_occasion: payload.preferredOccasion || null,
        p_preferred_delivery_date: payload.preferredDeliveryDate,
        p_budget_ngn: payload.budgetNgn ?? null,
        p_standard_size_reference: payload.standardSizeReference || null,
        p_measurement_unit: payload.measurementUnit,
        p_measurements: payload.measurements as unknown as Json,
        p_additional_notes: payload.additionalNotes || null,
        p_reference_image_name: payload.referenceImageName || null,
        p_reference_image_path: payload.referenceImagePath || null,
      });

      if (error || !data || typeof data !== 'object' || Array.isArray(data)) {
        throw new Error(
          error?.message || 'Unable to submit custom tailoring request right now. Please try again.'
        );
      }

      const rpcMeta = data as { id?: string; referenceCode?: string; status?: string; createdAt?: string };
      return normalizeCustomOrderRecord({
        ...payload,
        id: rpcMeta.id || payload.id,
        referenceCode: rpcMeta.referenceCode || payload.referenceCode,
        status: normalizeCustomRequestStatus(rpcMeta.status),
        createdAt: rpcMeta.createdAt || new Date().toISOString(),
        updatedAt: rpcMeta.createdAt || new Date().toISOString(),
      });
    }

    const now = new Date().toISOString();
    const record: CustomOrderPayload = normalizeCustomOrderRecord({
      ...payload,
      id:
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? `cust_${crypto.randomUUID().slice(0, 8)}`
          : `cust_${Date.now()}`,
      referenceCode: generateReferenceCode('JS-FIT'),
      status: 'New Request',
      createdAt: now,
      updatedAt: now,
    });

    const existing = this.loadCustomOrders();
    const savedWithImage = this.saveCustomOrders([record, ...existing]);

    if (!savedWithImage && record.referenceImagePreviewUrl) {
      const storageSafeRecord: CustomOrderPayload = {
        ...record,
        referenceImagePreviewUrl: record.referenceImageName
          ? `[Uploaded File: ${record.referenceImageName}]`
          : undefined,
      };
      this.saveCustomOrders([storageSafeRecord, ...existing]);
    }

    return record;
  },

  async listCustomOrders(): Promise<CustomOrderPayload[]> {
    const client = getSupabaseClient();
    if (client && isSupabaseConfigured()) {
      const { data, error } = await client
        .from('custom_orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Unable to load custom requests from Supabase: ${error.message}`);
      }

      const rows = data || [];
      const paths = rows
        .map((r) => r.reference_image_path)
        .filter((p): p is string => Boolean(p));
      const signedUrlMap = await supabaseStorageService.getSignedCustomReferenceUrls(paths);

      return rows.map((row) => mapDbCustomOrderToDomain(row, signedUrlMap));
    }

    return this.loadCustomOrders();
  },

  async updateCustomOrder(
    id: string,
    updates: CustomOrderUpdateInput,
    currentRequests?: CustomOrderPayload[]
  ): Promise<{
    request: CustomOrderPayload;
    requests: CustomOrderPayload[];
    persisted: boolean;
  }> {
    const client = getSupabaseClient();
    if (client && isSupabaseConfigured()) {
      const patch: Database['public']['Tables']['custom_orders']['Update'] = {};
      if (updates.status !== undefined) patch.status = updates.status;
      if (updates.internalNotes !== undefined) {
        patch.internal_notes = updates.internalNotes || null;
      }

      const { data, error } = await client
        .from('custom_orders')
        .update(patch)
        .eq('id', id)
        .select('*')
        .single();

      if (error || !data) {
        throw new Error(error?.message || `Unable to update custom request "${id}" in Supabase.`);
      }

      const existingMatch = currentRequests?.find((r) => r.id === id || r.referenceCode === id);
      const signedMap =
        data.reference_image_path && existingMatch?.referenceImagePreviewUrl
          ? { [data.reference_image_path]: existingMatch.referenceImagePreviewUrl }
          : data.reference_image_path
          ? await supabaseStorageService.getSignedCustomReferenceUrls([data.reference_image_path])
          : {};

      const updatedRequest = mapDbCustomOrderToDomain(data, signedMap);
      const nextRequests = (currentRequests ?? []).map((item) =>
        item.id === id || item.referenceCode === id ? updatedRequest : item
      );
      return { request: updatedRequest, requests: nextRequests, persisted: true };
    }

    const existing = currentRequests
      ? currentRequests.map(normalizeCustomOrderRecord)
      : this.loadCustomOrders();
    let updatedRequest: CustomOrderPayload | undefined;

    const nextRequests = existing.map((item) => {
      if (item.id !== id && item.referenceCode !== id) return item;
      updatedRequest = normalizeCustomOrderRecord({
        ...item,
        status: updates.status ?? item.status,
        internalNotes:
          updates.internalNotes !== undefined ? updates.internalNotes : item.internalNotes,
        updatedAt: new Date().toISOString(),
      });
      return updatedRequest;
    });

    if (!updatedRequest) {
      throw new Error(`Custom request with id "${id}" was not found.`);
    }

    const persisted = this.saveCustomOrders(nextRequests);
    return { request: updatedRequest, requests: nextRequests, persisted };
  },
};

function normalizeEnquiryRecord(record: ContactInquiryPayload): ContactInquiryPayload {
  return {
    ...record,
    status: normalizeEnquiryStatus(record.status),
  };
}

export interface EnquiryUpdateInput {
  status?: EnquiryStatus;
  internalNotes?: string;
}

export const contactRepository = {
  loadInquiries(): ContactInquiryPayload[] {
    if (isSupabaseConfigured()) return [];
    return readStorageArray<ContactInquiryPayload>(STORAGE_KEYS.CONTACT_INQUIRIES).map(
      normalizeEnquiryRecord
    );
  },

  saveInquiries(enquiries: ContactInquiryPayload[]): boolean {
    if (isSupabaseConfigured()) return true;
    return writeStorageArray(STORAGE_KEYS.CONTACT_INQUIRIES, enquiries);
  },

  async submitInquiry(payload: ContactInquiryPayload): Promise<ContactInquiryPayload> {
    const client = getSupabaseClient();
    if (client && isSupabaseConfigured()) {
      const { data, error } = await client.rpc('submit_contact_inquiry', {
        p_name: payload.name,
        p_email: payload.email,
        p_phone: payload.phone || null,
        p_subject: payload.subject,
        p_message: payload.message,
      });

      if (error || !data || typeof data !== 'object' || Array.isArray(data)) {
        throw new Error(error?.message || 'Unable to submit enquiry right now.');
      }

      const rpcMeta = data as { id?: string; status?: string; createdAt?: string };
      return normalizeEnquiryRecord({
        ...payload,
        id: rpcMeta.id || payload.id,
        status: normalizeEnquiryStatus(rpcMeta.status),
        createdAt: rpcMeta.createdAt || new Date().toISOString(),
        updatedAt: rpcMeta.createdAt || new Date().toISOString(),
      });
    }

    const now = new Date().toISOString();
    const record: ContactInquiryPayload = normalizeEnquiryRecord({
      ...payload,
      id:
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? `inq_${crypto.randomUUID().slice(0, 8)}`
          : `inq_${Date.now()}`,
      status: 'Unread',
      createdAt: now,
      updatedAt: now,
    });

    const existing = this.loadInquiries();
    this.saveInquiries([record, ...existing]);
    return record;
  },

  async listInquiries(): Promise<ContactInquiryPayload[]> {
    const client = getSupabaseClient();
    if (client && isSupabaseConfigured()) {
      const { data, error } = await client
        .from('contact_inquiries')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Unable to load customer enquiries from Supabase: ${error.message}`);
      }
      return (data || []).map(mapDbInquiryToDomain);
    }

    return this.loadInquiries();
  },

  async updateInquiry(
    id: string,
    updates: EnquiryUpdateInput,
    currentInquiries?: ContactInquiryPayload[]
  ): Promise<{
    enquiry: ContactInquiryPayload;
    enquiries: ContactInquiryPayload[];
    persisted: boolean;
  }> {
    const client = getSupabaseClient();
    if (client && isSupabaseConfigured()) {
      const patch: Database['public']['Tables']['contact_inquiries']['Update'] = {};
      if (updates.status !== undefined) patch.status = updates.status;
      if (updates.internalNotes !== undefined) {
        patch.internal_notes = updates.internalNotes || null;
      }

      const { data, error } = await client
        .from('contact_inquiries')
        .update(patch)
        .eq('id', id)
        .select('*')
        .single();

      if (error || !data) {
        throw new Error(error?.message || `Unable to update enquiry "${id}" in Supabase.`);
      }

      const updatedEnquiry = mapDbInquiryToDomain(data);
      const nextEnquiries = (currentInquiries ?? []).map((item) =>
        item.id === id ? updatedEnquiry : item
      );
      return { enquiry: updatedEnquiry, enquiries: nextEnquiries, persisted: true };
    }

    const existing = currentInquiries
      ? currentInquiries.map(normalizeEnquiryRecord)
      : this.loadInquiries();
    let updatedEnquiry: ContactInquiryPayload | undefined;

    const nextEnquiries = existing.map((item) => {
      if (item.id !== id) return item;
      updatedEnquiry = normalizeEnquiryRecord({
        ...item,
        status: updates.status ?? item.status,
        internalNotes:
          updates.internalNotes !== undefined ? updates.internalNotes : item.internalNotes,
        updatedAt: new Date().toISOString(),
      });
      return updatedEnquiry;
    });

    if (!updatedEnquiry) {
      throw new Error(`Customer enquiry with id "${id}" was not found.`);
    }

    const persisted = this.saveInquiries(nextEnquiries);
    return { enquiry: updatedEnquiry, enquiries: nextEnquiries, persisted };
  },
};

function normalizeWebsiteSettings(settings: WebsiteSettings): WebsiteSettings {
  return {
    ...DEFAULT_WEBSITE_SETTINGS,
    ...settings,
    brandName: settings.brandName.trim() || DEFAULT_WEBSITE_SETTINGS.brandName,
    tagline: settings.tagline.trim() || DEFAULT_WEBSITE_SETTINGS.tagline,
    whatsappNumberRaw:
      settings.whatsappNumberRaw.replace(/\D/g, '') || DEFAULT_WEBSITE_SETTINGS.whatsappNumberRaw,
    whatsappDisplayLabel:
      settings.whatsappDisplayLabel.trim() || DEFAULT_WEBSITE_SETTINGS.whatsappDisplayLabel,
    businessEmail: settings.businessEmail.trim() || DEFAULT_WEBSITE_SETTINGS.businessEmail,
    businessPhone: settings.businessPhone.trim() || DEFAULT_WEBSITE_SETTINGS.businessPhone,
    instagramHandle: settings.instagramHandle.trim() || DEFAULT_WEBSITE_SETTINGS.instagramHandle,
    instagramUrl: settings.instagramUrl.trim() || DEFAULT_WEBSITE_SETTINGS.instagramUrl,
    businessLocation:
      settings.businessLocation.trim() || DEFAULT_WEBSITE_SETTINGS.businessLocation,
    businessHours: settings.businessHours.trim() || DEFAULT_WEBSITE_SETTINGS.businessHours,
    currencyCode: 'NGN',
    currencySymbol: '₦',
    currencyLabel: 'Nigerian naira (₦)',
    updatedAt: new Date().toISOString(),
  };
}

export const settingsRepository = {
  loadSettings(): WebsiteSettings {
    if (isSupabaseConfigured()) {
      return { ...DEFAULT_WEBSITE_SETTINGS };
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (!raw) return { ...DEFAULT_WEBSITE_SETTINGS };
      const parsed = JSON.parse(raw) as Partial<WebsiteSettings>;
      return {
        ...DEFAULT_WEBSITE_SETTINGS,
        ...parsed,
        currencyCode: 'NGN',
        currencySymbol: '₦',
        currencyLabel: parsed.currencyLabel || DEFAULT_WEBSITE_SETTINGS.currencyLabel,
      };
    } catch {
      return { ...DEFAULT_WEBSITE_SETTINGS };
    }
  },

  async fetchSettings(): Promise<WebsiteSettings> {
    const client = getSupabaseClient();
    if (client && isSupabaseConfigured()) {
      const { data, error } = await client
        .from('website_settings')
        .select('*')
        .eq('id', 1)
        .maybeSingle();

      if (error || !data) {
        return { ...DEFAULT_WEBSITE_SETTINGS };
      }
      return mapDbSettingsToDomain(data);
    }
    return this.loadSettings();
  },

  saveSettings(settings: WebsiteSettings): { settings: WebsiteSettings; persisted: boolean } {
    const normalized = normalizeWebsiteSettings(settings);
    if (isSupabaseConfigured()) {
      return { settings: normalized, persisted: true };
    }

    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(normalized));
      return { settings: normalized, persisted: true };
    } catch {
      return { settings: normalized, persisted: false };
    }
  },

  async saveSettingsAsync(
    settings: WebsiteSettings
  ): Promise<{ settings: WebsiteSettings; persisted: boolean }> {
    const normalized = normalizeWebsiteSettings(settings);
    const client = getSupabaseClient();
    if (client && isSupabaseConfigured()) {
      const { data, error } = await client
        .from('website_settings')
        .upsert(
          {
            id: 1,
            brand_name: normalized.brandName,
            tagline: normalized.tagline,
            whatsapp_number_raw: normalized.whatsappNumberRaw,
            whatsapp_display_label: normalized.whatsappDisplayLabel,
            whatsapp_is_placeholder: normalized.whatsappIsPlaceholder,
            business_email: normalized.businessEmail,
            business_phone: normalized.businessPhone,
            instagram_handle: normalized.instagramHandle,
            instagram_url: normalized.instagramUrl,
            business_location: normalized.businessLocation,
            business_hours: normalized.businessHours,
            currency_code: 'NGN',
            currency_symbol: '₦',
            currency_label: 'Nigerian naira (₦)',
          },
          { onConflict: 'id' }
        )
        .select('*')
        .single();

      if (error || !data) {
        throw new Error(error?.message || 'Unable to save website settings to Supabase.');
      }
      return { settings: mapDbSettingsToDomain(data), persisted: true };
    }

    return this.saveSettings(normalized);
  },

  resetSettings(): { settings: WebsiteSettings; persisted: boolean } {
    const defaults = { ...DEFAULT_WEBSITE_SETTINGS, updatedAt: new Date().toISOString() };
    if (isSupabaseConfigured()) {
      return { settings: defaults, persisted: true };
    }
    try {
      localStorage.removeItem(STORAGE_KEYS.SETTINGS);
      return { settings: defaults, persisted: true };
    } catch {
      return { settings: defaults, persisted: false };
    }
  },
};

export function buildWhatsAppLink(message: string, customNumberRaw?: string): string {
  const digits = (customNumberRaw || '').replace(/\D/g, '');
  if (digits.length >= 10) {
    return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
  }
  return WHATSAPP_CONFIG.buildChatUrl(message);
}
