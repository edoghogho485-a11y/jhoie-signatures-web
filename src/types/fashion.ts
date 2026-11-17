export type ProductCategory =
  | 'Dresses'
  | 'Gowns'
  | 'Two-Piece Outfits'
  | 'Traditional Wear'
  | 'Modern Styles';

export type StockStatus = 'In Stock' | 'Low Stock' | 'Made to Order' | 'Out of Stock';

export type CustomOutfitType =
  | 'Dress'
  | 'Gown'
  | 'Two-Piece'
  | 'Traditional Outfit'
  | 'Other';

export interface ProductColorOption {
  name: string;
  hex: string;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  isSample: boolean;
  category: ProductCategory;
  priceNgn: number;
  description: string;
  fabricAndCare: string;
  images: string[];
  sizes: string[];
  colors: ProductColorOption[];
  stockStatus: StockStatus;
  stockQuantity: number;
  isFeatured: boolean;
  isNewArrival: boolean;
  isBestSeller: boolean;
  isPublished?: boolean;
  createdAt: string;
}

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  category: ProductCategory;
  image: string;
  priceNgn: number;
  selectedSize: string;
  selectedColor: string;
  quantity: number;
}

export type CustomRequestStatus =
  | 'New Request'
  | 'Under Review'
  | 'Awaiting Customer Response'
  | 'Accepted'
  | 'In Progress'
  | 'Completed'
  | 'Declined';

export interface CustomOrderPayload {
  id?: string;
  referenceCode?: string;
  customerName: string;
  contactNumber: string;
  email?: string;
  outfitType: CustomOutfitType;
  outfitDescription: string;
  preferredFabric?: string;
  preferredColor: string;
  preferredOccasion?: string;
  preferredDeliveryDate: string;
  budgetNgn?: number;
  standardSizeReference?: string;
  measurementUnit: 'inches' | 'cm';
  measurements: {
    bust: string;
    waist: string;
    hips: string;
    shoulder: string;
    length: string;
    notes: string;
  };
  additionalNotes?: string;
  referenceImageName?: string;
  referenceImagePath?: string;
  referenceImagePreviewUrl?: string;
  status?: CustomRequestStatus;
  internalNotes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type OrderStatus =
  | 'New'
  | 'Pending'
  | 'Confirmed'
  | 'Processing'
  | 'Ready'
  | 'Completed'
  | 'Cancelled';

export type PaymentStatus =
  | 'Unpaid'
  | 'Awaiting Confirmation'
  | 'Partially Paid'
  | 'Paid'
  | 'Refunded';

export interface OrderRequestPayload {
  id?: string;
  referenceCode?: string;
  customerName: string;
  phoneNumber: string;
  email?: string;
  deliveryAddress: string;
  cityState: string;
  deliveryNotes?: string;
  items: CartItem[];
  subtotalNgn: number;
  deliveryFeeNgn?: number;
  totalAmountNgn?: number;
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  internalNotes?: string;
  isDemo?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type EnquiryStatus = 'Unread' | 'Read' | 'Replied';

export interface ContactInquiryPayload {
  id?: string;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  status?: EnquiryStatus;
  internalNotes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface WebsiteSettings {
  brandName: string;
  tagline: string;
  whatsappNumberRaw: string;
  whatsappDisplayLabel: string;
  whatsappIsPlaceholder: boolean;
  businessEmail: string;
  businessPhone: string;
  instagramHandle: string;
  instagramUrl: string;
  businessLocation: string;
  businessHours: string;
  currencyCode: 'NGN';
  currencySymbol: '₦';
  currencyLabel: string;
  updatedAt?: string;
}

export interface AdminAuthSession {
  isAuthenticated: boolean;
  mode: 'local_preview' | 'supabase_auth';
  userId?: string;
  role?: 'admin' | 'super_admin';
  adminEmail: string;
  displayName: string;
  signedInAt: string;
}

export interface CustomerAuthSession {
  isAuthenticated: boolean;
  mode: 'local_preview' | 'supabase_auth';
  userId: string;
  email: string;
  fullName: string;
  phone?: string;
  role: 'customer' | 'admin' | 'super_admin';
  emailConfirmed: boolean;
  signedInAt: string;
}

export interface CustomerSignUpResult {
  status: 'signed_in' | 'confirmation_required';
  email: string;
  session: CustomerAuthSession | null;
  message: string;
}

export type PostAuthRedirectTarget = 'checkout' | 'custom-orders' | null;

export interface SampleTestimonial {
  id: string;
  quote: string;
  authorLabel: string;
  occasionLabel: string;
}

export interface InstagramShowcaseItem {
  id: string;
  image: string;
  caption: string;
  category: ProductCategory | 'Atelier';
}

export type AppRoute =
  | 'home'
  | 'shop'
  | 'product'
  | 'custom-orders'
  | 'about'
  | 'contact'
  | 'checkout'
  | 'login'
  | 'register'
  | 'account'
  | 'admin';

export type AdminSection =
  | 'overview'
  | 'products'
  | 'orders'
  | 'custom-requests'
  | 'enquiries'
  | 'settings';

