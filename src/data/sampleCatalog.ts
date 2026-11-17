import { BRAND_CONTACT_CONFIG } from '../config/brandContactConfig';
import { WHATSAPP_CONFIG } from '../config/whatsappConfig';
import type {
  InstagramShowcaseItem,
  Product,
  ProductCategory,
  SampleTestimonial,
} from '../types/fashion';

/**
 * Brand contact references bound to centralized `BRAND_CONTACT_CONFIG`.
 */
export const BRAND_INFO = {
  name: BRAND_CONTACT_CONFIG.brandName,
  tagline: BRAND_CONTACT_CONFIG.tagline,
  whatsappDisplay: WHATSAPP_CONFIG.displayLabel,
  whatsappNumberRaw: WHATSAPP_CONFIG.numberRaw,
  emailPlaceholder: BRAND_CONTACT_CONFIG.businessEmailPlaceholder,
  phonePlaceholder: BRAND_CONTACT_CONFIG.businessPhonePlaceholder,
  instagramHandle: BRAND_CONTACT_CONFIG.instagram.handle,
  instagramUrl: BRAND_CONTACT_CONFIG.instagram.profileUrl,
  studioLocationPlaceholder: BRAND_CONTACT_CONFIG.businessLocationPlaceholder,
  studioHoursPlaceholder: BRAND_CONTACT_CONFIG.businessHoursPlaceholder,
} as const;

export const SHOP_CATEGORIES: ProductCategory[] = [
  'Dresses',
  'Gowns',
  'Two-Piece Outfits',
  'Traditional Wear',
  'Modern Styles',
];

/**
 * Centralized replaceable image slots.
 * Swap these paths once the designer's studio photographs are ready.
 */
export const PRODUCT_IMAGE_SLOTS = {
  heroEditorial: '/images/hero_editorial_luxury_1794776391258.jpg',
  ivoryGoldGown: '/images/sample_gown_ivory_gold_1794776391039.jpg',
  midnightTwoPiece: '/images/sample_twopiece_midnight_1794776390997.jpg',
  traditionalJacquard: '/images/sample_traditional_asoebi_1794776391116.jpg',
  pleatedContrastDress: '/images/sample_dress_modern_1794776392065.jpg',
  atelierCraftsmanship: '/images/atelier_custom_tailoring_1794776392733.jpg',
} as const;

export const EDITORIAL_IMAGES = {
  heroEditorial: PRODUCT_IMAGE_SLOTS.heroEditorial,
  atelierCraftsmanship: PRODUCT_IMAGE_SLOTS.atelierCraftsmanship,
};

/**
 * Standard Sample Size Reference Chart (for guidance alongside Custom Fit).
 */
export const SAMPLE_SIZE_GUIDE = [
  { size: 'XS', bustIn: '32"', waistIn: '25"', hipsIn: '35"' },
  { size: 'S', bustIn: '34"', waistIn: '27"', hipsIn: '37"' },
  { size: 'M', bustIn: '36"', waistIn: '29"', hipsIn: '39"' },
  { size: 'L', bustIn: '39"', waistIn: '32"', hipsIn: '42"' },
  { size: 'XL', bustIn: '42"', waistIn: '35"', hipsIn: '45"' },
];

/**
 * Clearly labelled sample product catalog for initial storefront setup.
 *
 * HOW TO MANAGE PRODUCTS:
 * - Add a new product object to `SAMPLE_PRODUCTS` following the `Product` interface.
 * - Replace `images` array entries with real studio photography paths or Supabase Storage URLs.
 * - Update `priceNgn`, `stockStatus`, and `stockQuantity` once real inventory is ready.
 * - Later, `catalogRepository.listProducts()` in `src/services/storeRepository.ts`
 *   will fetch these exact records from Supabase.
 */
export const SAMPLE_PRODUCTS: Product[] = [
  {
    id: 'sample-gown-01',
    slug: 'sample-gown-01-ivory-silk',
    name: 'Sample Gown 01 — Ivory Silk Silhouette (Placeholder)',
    isSample: true,
    category: 'Gowns',
    priceNgn: 185000,
    description:
      'Sample catalog entry illustrating a floor-length evening gown silhouette with delicate hand-beaded bodice detailing. Placeholder description pending final studio copy and verified pricing.',
    fabricAndCare: 'Sample specification: Silk satin blend · Dry clean only.',
    images: [
      PRODUCT_IMAGE_SLOTS.ivoryGoldGown,
      PRODUCT_IMAGE_SLOTS.heroEditorial,
      PRODUCT_IMAGE_SLOTS.atelierCraftsmanship,
    ],
    sizes: ['XS', 'S', 'M', 'L', 'XL', 'Custom Fit'],
    colors: [
      { name: 'Warm Ivory', hex: '#F6F1E8' },
      { name: 'Midnight Black', hex: '#171717' },
      { name: 'Champagne Gold', hex: '#C6A45C' },
    ],
    stockStatus: 'In Stock',
    stockQuantity: 6,
    isFeatured: true,
    isNewArrival: true,
    isBestSeller: true,
    createdAt: '2026-11-12T10:00:00Z',
  },
  {
    id: 'sample-twopiece-01',
    slug: 'sample-twopiece-01-midnight-cape',
    name: 'Sample Two-Piece 01 — Asymmetric Cape Set (Placeholder)',
    isSample: true,
    category: 'Two-Piece Outfits',
    priceNgn: 120000,
    description:
      'Sample catalog entry showcasing a tailored wide-leg trouser and draped asymmetric cape top. Placeholder copy and sample pricing awaiting final collection inventory.',
    fabricAndCare: 'Sample specification: Structured crepe suiting · Gentle dry clean.',
    images: [
      PRODUCT_IMAGE_SLOTS.midnightTwoPiece,
      PRODUCT_IMAGE_SLOTS.pleatedContrastDress,
      PRODUCT_IMAGE_SLOTS.atelierCraftsmanship,
    ],
    sizes: ['XS', 'S', 'M', 'L', 'XL', 'Custom Fit'],
    colors: [
      { name: 'Midnight Black', hex: '#171717' },
      { name: 'Warm Ivory', hex: '#F6F1E8' },
    ],
    stockStatus: 'In Stock',
    stockQuantity: 9,
    isFeatured: true,
    isNewArrival: true,
    isBestSeller: false,
    createdAt: '2026-11-11T10:00:00Z',
  },
  {
    id: 'sample-traditional-01',
    slug: 'sample-traditional-01-jacquard-edition',
    name: 'Sample Traditional Wear 01 — Sculpted Jacquard (Placeholder)',
    isSample: true,
    category: 'Traditional Wear',
    priceNgn: 210000,
    description:
      'Sample catalog entry demonstrating contemporary African luxury heritage tailoring in woven gold and onyx jacquard. Placeholder product entry until final lookbook launch.',
    fabricAndCare: 'Sample specification: Woven jacquard silk blend · Specialist clean only.',
    images: [
      PRODUCT_IMAGE_SLOTS.traditionalJacquard,
      PRODUCT_IMAGE_SLOTS.heroEditorial,
      PRODUCT_IMAGE_SLOTS.atelierCraftsmanship,
    ],
    sizes: ['S', 'M', 'L', 'XL', 'Custom Fit'],
    colors: [
      { name: 'Champagne & Onyx', hex: '#C6A45C' },
      { name: 'Midnight Black', hex: '#171717' },
    ],
    stockStatus: 'Made to Order',
    stockQuantity: 4,
    isFeatured: true,
    isNewArrival: false,
    isBestSeller: true,
    createdAt: '2026-11-08T10:00:00Z',
  },
  {
    id: 'sample-dress-01',
    slug: 'sample-dress-01-pleated-midi',
    name: 'Sample Dress 01 — Pleated Contrast Midi (Placeholder)',
    isSample: true,
    category: 'Dresses',
    priceNgn: 95000,
    description:
      'Sample catalog entry presenting a refined midi dress with architectural waist pleating and contrast paneling. Placeholder garment details and sample pricing.',
    fabricAndCare: 'Sample specification: Cotton-silk twill · Steam gently or dry clean.',
    images: [
      PRODUCT_IMAGE_SLOTS.pleatedContrastDress,
      PRODUCT_IMAGE_SLOTS.ivoryGoldGown,
      PRODUCT_IMAGE_SLOTS.atelierCraftsmanship,
    ],
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    colors: [
      { name: 'Warm Ivory & Onyx', hex: '#F6F1E8' },
      { name: 'Midnight Black', hex: '#171717' },
    ],
    stockStatus: 'In Stock',
    stockQuantity: 11,
    isFeatured: false,
    isNewArrival: true,
    isBestSeller: true,
    createdAt: '2026-11-10T10:00:00Z',
  },
  {
    id: 'sample-gown-02',
    slug: 'sample-gown-02-draped-evening',
    name: 'Sample Gown 02 — Midnight & Gold Drape (Placeholder)',
    isSample: true,
    category: 'Gowns',
    priceNgn: 245000,
    description:
      'Sample catalog entry featuring an off-shoulder draped evening silhouette merging modern couture structure with African embroidery accents. Placeholder sample entry.',
    fabricAndCare: 'Sample specification: Duchesse silk & gold motif · Specialist dry clean.',
    images: [
      PRODUCT_IMAGE_SLOTS.heroEditorial,
      PRODUCT_IMAGE_SLOTS.traditionalJacquard,
      PRODUCT_IMAGE_SLOTS.ivoryGoldGown,
    ],
    sizes: ['S', 'M', 'L', 'Custom Fit'],
    colors: [
      { name: 'Midnight & Gold', hex: '#171717' },
      { name: 'Champagne Gold', hex: '#C6A45C' },
    ],
    stockStatus: 'Low Stock',
    stockQuantity: 2,
    isFeatured: false,
    isNewArrival: true,
    isBestSeller: false,
    createdAt: '2026-11-14T10:00:00Z',
  },
  {
    id: 'sample-modern-01',
    slug: 'sample-modern-01-tailored-ensemble',
    name: 'Sample Modern Style 01 — Structured Tailored Look (Placeholder)',
    isSample: true,
    category: 'Modern Styles',
    priceNgn: 135000,
    description:
      'Sample catalog entry representing contemporary executive and evening-ready silhouettes crafted with clean architectural lines. Placeholder item until final photography arrives.',
    fabricAndCare: 'Sample specification: Breathable wool-silk blend · Dry clean recommended.',
    images: [
      PRODUCT_IMAGE_SLOTS.midnightTwoPiece,
      PRODUCT_IMAGE_SLOTS.atelierCraftsmanship,
    ],
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    colors: [
      { name: 'Midnight Black', hex: '#171717' },
      { name: 'Soft Gold', hex: '#C6A45C' },
    ],
    stockStatus: 'In Stock',
    stockQuantity: 7,
    isFeatured: false,
    isNewArrival: false,
    isBestSeller: true,
    createdAt: '2026-11-05T10:00:00Z',
  },
  {
    id: 'sample-dress-02',
    slug: 'sample-dress-02-ivory-column',
    name: 'Sample Dress 02 — Beaded Bodice Column Dress (Placeholder)',
    isSample: true,
    category: 'Dresses',
    priceNgn: 148000,
    description:
      'Sample catalog entry illustrating a refined column dress with delicate gold beadwork for cocktail receptions and formal dinners. Placeholder item and sample pricing.',
    fabricAndCare: 'Sample specification: Soft silk crepe with beaded trim · Dry clean only.',
    images: [
      PRODUCT_IMAGE_SLOTS.ivoryGoldGown,
      PRODUCT_IMAGE_SLOTS.pleatedContrastDress,
    ],
    sizes: ['XS', 'S', 'M', 'L', 'Custom Fit'],
    colors: [
      { name: 'Warm Ivory', hex: '#F6F1E8' },
      { name: 'Champagne Gold', hex: '#C6A45C' },
    ],
    stockStatus: 'In Stock',
    stockQuantity: 5,
    isFeatured: false,
    isNewArrival: true,
    isBestSeller: false,
    createdAt: '2026-11-13T10:00:00Z',
  },
  {
    id: 'sample-twopiece-02',
    slug: 'sample-twopiece-02-heritage-set',
    name: 'Sample Two-Piece 02 — Heritage Wrap & Skirt Set (Placeholder)',
    isSample: true,
    category: 'Two-Piece Outfits',
    priceNgn: 162000,
    description:
      'Sample catalog entry highlighting a coordinated two-piece luxury wrap blouse and draped skirt crafted for celebratory events. Placeholder copy and pricing.',
    fabricAndCare: 'Sample specification: Woven jacquard silk · Specialist clean only.',
    images: [
      PRODUCT_IMAGE_SLOTS.traditionalJacquard,
      PRODUCT_IMAGE_SLOTS.midnightTwoPiece,
    ],
    sizes: ['S', 'M', 'L', 'XL', 'Custom Fit'],
    colors: [
      { name: 'Champagne Gold', hex: '#C6A45C' },
      { name: 'Midnight Black', hex: '#171717' },
    ],
    stockStatus: 'Made to Order',
    stockQuantity: 3,
    isFeatured: false,
    isNewArrival: false,
    isBestSeller: false,
    createdAt: '2026-11-06T10:00:00Z',
  },
];

/**
 * Clearly labelled placeholder testimonials to avoid inventing real customer quotes.
 */
export const SAMPLE_TESTIMONIALS: SampleTestimonial[] = [
  {
    id: 'sample-testimonial-1',
    quote:
      'Placeholder client review slot — reserved for verified feedback on ready-to-wear fit, silk drape, and finishing quality once studio client reviews are published.',
    authorLabel: 'Sample Client Placeholder 01',
    occasionLabel: 'Sample Entry · Ready-to-Wear Gown',
  },
  {
    id: 'sample-testimonial-2',
    quote:
      'Placeholder client review slot — reserved for verified bespoke tailoring experience, measurement precision, and occasion delivery notes.',
    authorLabel: 'Sample Client Placeholder 02',
    occasionLabel: 'Sample Entry · Bespoke Traditional Wear',
  },
  {
    id: 'sample-testimonial-3',
    quote:
      'Placeholder client review slot — reserved for verified styling consultation and custom two-piece tailoring feedback.',
    authorLabel: 'Sample Client Placeholder 03',
    occasionLabel: 'Sample Entry · Custom Two-Piece',
  },
];

export const INSTAGRAM_SHOWCASE: InstagramShowcaseItem[] = [
  {
    id: 'ig-1',
    image: PRODUCT_IMAGE_SLOTS.heroEditorial,
    caption: 'Sample Lookbook Frame 01 — Evening Couture (Placeholder)',
    category: 'Gowns',
  },
  {
    id: 'ig-2',
    image: PRODUCT_IMAGE_SLOTS.traditionalJacquard,
    caption: 'Sample Lookbook Frame 02 — Heritage Jacquard (Placeholder)',
    category: 'Traditional Wear',
  },
  {
    id: 'ig-3',
    image: PRODUCT_IMAGE_SLOTS.midnightTwoPiece,
    caption: 'Sample Lookbook Frame 03 — Modern Tailoring (Placeholder)',
    category: 'Two-Piece Outfits',
  },
  {
    id: 'ig-4',
    image: PRODUCT_IMAGE_SLOTS.atelierCraftsmanship,
    caption: 'Sample Lookbook Frame 04 — Inside the Atelier (Placeholder)',
    category: 'Atelier',
  },
];
