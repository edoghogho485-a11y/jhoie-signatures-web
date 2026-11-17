import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { BRAND_CONTACT_CONFIG } from '../config/brandContactConfig.ts';
import { WHATSAPP_CONFIG } from '../config/whatsappConfig.ts';
import { PRODUCT_IMAGE_SLOTS, SAMPLE_PRODUCTS, SHOP_CATEGORIES } from '../data/sampleCatalog.ts';
import { getSupabaseEnvConfig, isSupabaseConfigured } from '../lib/supabaseClient.ts';
import {
  adminAuthService,
  getBackendReadinessStatus,
  validateAdminLoginInput,
} from '../services/adminAuthService.ts';
import {
  customerAuthService,
  requireAuthenticatedCustomerSession,
  validateCustomerProfileUpdate,
  validateCustomerSignInInput,
  validateCustomerSignUpInput,
} from '../services/customerAuthService.ts';
import {
  buildWhatsAppLink,
  cartStorage,
  catalogRepository,
  contactRepository,
  customOrdersRepository,
  ordersRepository,
  settingsRepository,
} from '../services/storeRepository.ts';
import type { CartItem, CustomOrderPayload } from '../types/fashion.ts';
import {
  buildAdminToCustomClientWhatsAppMessage,
  filterAndSortCustomRequests,
  getNewCustomRequestsCount,
  isRenderableReferenceImage,
} from '../utils/customRequestHelpers.ts';
import {
  filterAndSortEnquiries,
  getUnreadEnquiriesCount,
} from '../utils/enquiryHelpers.ts';
import { validateWebsiteSettings } from '../utils/settingsValidation.ts';
import {
  addItemToCart,
  calculateCartTotals,
  getMaxAllowedQuantity,
  removeItemFromCart,
  updateItemQuantityInCart,
} from '../utils/cartHelpers.ts';
import {
  filterAndSortProducts,
  findProductByIdOrSlug,
  getCategoryCounts,
} from '../utils/catalogHelpers.ts';
import {
  applyOrderInventoryUpdates,
  reconcileCartQuantitiesWithStock,
  validateCartStock,
  validateCheckoutForm,
} from '../utils/checkoutValidation.ts';
import { validateContactForm } from '../utils/contactValidation.ts';
import { validateCustomOrderForm } from '../utils/customOrderValidation.ts';
import {
  buildCustomOrderWhatsAppMessage,
  buildProductWhatsAppMessage,
  formatNaira,
} from '../utils/formatters.ts';
import {
  buildAdminToCustomerWhatsAppMessage,
  buildCustomerWhatsAppChatUrl,
  buildPrintableOrderSummaryText,
  filterAndSortOrders,
  getOrderSummaryMetrics,
  getOrderTotalQuantity,
  normalizeCustomerPhoneForWhatsApp,
} from '../utils/orderHelpers.ts';
import {
  normalizeProductFormInput,
  type ProductFormInput,
  validateProductForm,
} from '../utils/productValidation.ts';

function createMockLocalStorage(): Storage {
  const store = new Map<string, string>();
  return {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => {
      store.clear();
    },
    key: (idx: number) => Array.from(store.keys())[idx] ?? null,
    get length() {
      return store.size;
    },
  };
}

test('Sample catalog covers all 5 required categories and clearly marks sample items', () => {
  const counts = getCategoryCounts(SAMPLE_PRODUCTS, SHOP_CATEGORIES);
  assert.equal(counts.All, SAMPLE_PRODUCTS.length);

  for (const category of SHOP_CATEGORIES) {
    assert.ok(counts[category] >= 1, `Expected at least 1 product in ${category}`);
  }

  for (const product of SAMPLE_PRODUCTS) {
    assert.equal(product.isSample, true);
    assert.ok(product.name.toLowerCase().includes('sample'));
    assert.ok(product.images.length >= 2);
    assert.ok(product.priceNgn > 0);
  }
});

test('Shop filtering: category, search query, availability, and price/date sorting', () => {
  const gowns = filterAndSortProducts({
    products: SAMPLE_PRODUCTS,
    category: 'Gowns',
  });
  assert.ok(gowns.length >= 2);
  assert.ok(gowns.every((p) => p.category === 'Gowns'));

  const jacquardSearch = filterAndSortProducts({
    products: SAMPLE_PRODUCTS,
    category: 'All',
    searchQuery: 'jacquard',
  });
  assert.ok(jacquardSearch.length >= 1);
  assert.ok(jacquardSearch.some((p) => p.id === 'sample-traditional-01'));

  const lowToHigh = filterAndSortProducts({
    products: SAMPLE_PRODUCTS,
    category: 'All',
    sortBy: 'price-asc',
  });
  for (let i = 1; i < lowToHigh.length; i++) {
    assert.ok(lowToHigh[i].priceNgn >= lowToHigh[i - 1].priceNgn);
  }

  const highToLow = filterAndSortProducts({
    products: SAMPLE_PRODUCTS,
    category: 'All',
    sortBy: 'price-desc',
  });
  for (let i = 1; i < highToLow.length; i++) {
    assert.ok(highToLow[i].priceNgn <= highToLow[i - 1].priceNgn);
  }

  const oldestFirst = filterAndSortProducts({
    products: SAMPLE_PRODUCTS,
    category: 'All',
    sortBy: 'oldest',
  });
  for (let i = 1; i < oldestFirst.length; i++) {
    assert.ok(
      new Date(oldestFirst[i].createdAt).getTime() >=
        new Date(oldestFirst[i - 1].createdAt).getTime()
    );
  }

  const madeToOrder = filterAndSortProducts({
    products: SAMPLE_PRODUCTS,
    category: 'All',
    stockStatus: 'Made to Order',
  });
  assert.ok(madeToOrder.length >= 1);
  assert.ok(madeToOrder.every((p) => p.stockStatus === 'Made to Order'));
});

test('Product details lookup, Naira formatting, and WhatsApp message builder', () => {
  const product = findProductByIdOrSlug(SAMPLE_PRODUCTS, 'sample-gown-01');
  assert.ok(product);
  assert.equal(formatNaira(product.priceNgn), '₦185,000');

  const waMessage = buildProductWhatsAppMessage({
    productName: product.name,
    priceNgn: product.priceNgn,
    size: 'M',
    color: 'Warm Ivory',
    quantity: 2,
  });

  assert.ok(waMessage.includes(product.name));
  assert.ok(waMessage.includes('Size: M'));
  assert.ok(waMessage.includes('Colour: Warm Ivory'));
  assert.ok(waMessage.includes('Quantity: 2'));
  assert.ok(waMessage.includes('₦370,000'));
});

test('Shopping cart: add, merge duplicates, cap stock, update quantity, remove, totals, and persistence', () => {
  const gown = SAMPLE_PRODUCTS[0]; // stockQuantity: 6, priceNgn: 185000
  const twoPiece = SAMPLE_PRODUCTS[1]; // stockQuantity: 9, priceNgn: 120000

  let cart: CartItem[] = [];

  // Add first item
  cart = addItemToCart(cart, {
    product: gown,
    selectedSize: 'M',
    selectedColor: 'Warm Ivory',
    quantity: 2,
  }).nextCart;

  assert.equal(cart.length, 1);
  assert.equal(cart[0].quantity, 2);

  // Merge same product + size + color
  cart = addItemToCart(cart, {
    product: gown,
    selectedSize: 'M',
    selectedColor: 'Warm Ivory',
    quantity: 2,
  }).nextCart;

  assert.equal(cart.length, 1);
  assert.equal(cart[0].quantity, 4);

  // Adding different size creates separate line item
  cart = addItemToCart(cart, {
    product: twoPiece,
    selectedSize: 'L',
    selectedColor: 'Midnight Black',
    quantity: 1,
  }).nextCart;

  assert.equal(cart.length, 2);

  // Totals check: (4 * 185000) + (1 * 120000) = 860000
  const totals = calculateCartTotals(cart);
  assert.equal(totals.itemCount, 5);
  assert.equal(totals.subtotalNgn, 860000);

  // Update quantity respects stock cap (6 for gown)
  cart = updateItemQuantityInCart(cart, cart[0].id, 10, SAMPLE_PRODUCTS);
  assert.equal(cart[0].quantity, 6);

  // Simulate localStorage persistence across refresh
  (globalThis as unknown as { localStorage: Storage }).localStorage = createMockLocalStorage();

  cartStorage.save(cart);
  const reloadedCart = cartStorage.load();
  assert.equal(reloadedCart.length, 2);
  assert.equal(calculateCartTotals(reloadedCart).subtotalNgn, 6 * 185000 + 120000);

  // Remove item and verify empty state
  let afterRemove = removeItemFromCart(reloadedCart, reloadedCart[0].id);
  afterRemove = removeItemFromCart(afterRemove, afterRemove[0].id);
  assert.equal(afterRemove.length, 0);
  assert.deepEqual(calculateCartTotals(afterRemove), { itemCount: 0, subtotalNgn: 0 });
});

test('Custom order form validation rejects missing/invalid fields and accepts valid brief', () => {
  const invalidPayload: CustomOrderPayload = {
    customerName: 'A',
    contactNumber: '12345',
    email: 'not-an-email',
    outfitType: 'Gown',
    outfitDescription: 'Short',
    preferredColor: '',
    preferredDeliveryDate: '2026-11-01',
    standardSizeReference: 'Exact Measurements',
    measurementUnit: 'inches',
    measurements: {
      bust: '',
      waist: '',
      hips: '',
      shoulder: '',
      length: '',
      notes: '',
    },
  };

  const failed = validateCustomOrderForm(invalidPayload, '2026-11-15');
  assert.equal(failed.isValid, false);
  assert.ok(failed.errors.customerName);
  assert.ok(failed.errors.contactNumber);
  assert.ok(failed.errors.email);
  assert.ok(failed.errors.outfitDescription);
  assert.ok(failed.errors.preferredColor);
  assert.ok(failed.errors.preferredDeliveryDate);
  assert.ok(failed.errors.measurements);

  const validPayload: CustomOrderPayload = {
    customerName: 'Amaka Okafor',
    contactNumber: '+234 801 234 5678',
    email: 'amaka@example.com',
    outfitType: 'Traditional Outfit',
    outfitDescription: 'Floor-length champagne silk wrap dress with structured shoulder drape.',
    preferredFabric: 'Silk Jacquard',
    preferredColor: 'Champagne Gold & Midnight Black',
    preferredOccasion: 'Traditional Ceremony / Engagement',
    preferredDeliveryDate: '2026-12-20',
    standardSizeReference: 'M',
    measurementUnit: 'inches',
    measurements: {
      bust: '36',
      waist: '29',
      hips: '40',
      shoulder: '15',
      length: '58',
      notes: '',
    },
    additionalNotes: 'Wearing 3-inch heels',
    referenceImageName: 'gold-silk-inspo.jpg',
  };

  const passed = validateCustomOrderForm(validPayload, '2026-11-15');
  assert.equal(passed.isValid, true);
  assert.deepEqual(passed.errors, {});
});

test('Custom order WhatsApp message includes all details, manual photo reminder, and central URL encoding', () => {
  const payload: CustomOrderPayload = {
    referenceCode: 'JS-FIT-1234',
    customerName: 'Amaka Okafor',
    contactNumber: '+2348012345678',
    email: 'amaka@example.com',
    outfitType: 'Gown',
    outfitDescription: 'Draped evening gown with beaded waist detail.',
    preferredFabric: 'Duchesse Silk',
    preferredColor: 'Warm Ivory',
    preferredOccasion: 'Evening Gala / Red Carpet',
    preferredDeliveryDate: '2026-12-22',
    standardSizeReference: 'Exact Measurements',
    measurementUnit: 'inches',
    measurements: {
      bust: '36',
      waist: '28',
      hips: '39',
      shoulder: '15',
      length: '60',
      notes: '',
    },
    additionalNotes: 'Floor length with slight train',
    referenceImageName: 'inspiration-gown.png',
  };

  const message = buildCustomOrderWhatsAppMessage(payload);
  assert.ok(message.includes('JS-FIT-1234'));
  assert.ok(message.includes('Outfit Type: Gown'));
  assert.ok(message.includes('Preferred Colour: Warm Ivory'));
  assert.ok(message.includes('Preferred Fabric: Duchesse Silk'));
  assert.ok(message.includes('Preferred Delivery Date: 2026-12-22'));
  assert.ok(message.includes('Bust 36, Waist 28, Hips 39'));
  assert.ok(message.includes('inspiration-gown.png'));
  assert.ok(message.includes('attach it manually here in WhatsApp'));

  const chatUrl = buildWhatsAppLink(message);
  assert.ok(chatUrl.startsWith(`https://wa.me/${WHATSAPP_CONFIG.numberRaw}?text=`));
  assert.ok(chatUrl.includes(encodeURIComponent('Outfit Type: Gown')));
});

test('Contact form validation rejects invalid inputs and accepts valid enquiries', () => {
  const invalid = validateContactForm({
    name: 'A',
    email: 'invalid-email',
    subject: '',
    message: 'Hi',
  });

  assert.equal(invalid.isValid, false);
  assert.ok(invalid.errors.name);
  assert.ok(invalid.errors.email);
  assert.ok(invalid.errors.subject);
  assert.ok(invalid.errors.message);

  const valid = validateContactForm({
    name: 'Chidinma Adeyemi',
    email: 'chidinma@example.com',
    subject: 'Sizing & Availability',
    message: 'Hello, I would like to confirm measurements for Sample Gown 01.',
  });

  assert.equal(valid.isValid, true);
  assert.deepEqual(valid.errors, {});
});

test('Central brand contact configuration uses @jhoiesignatures, placeholders, and empty genuineTestimonials', () => {
  assert.equal(BRAND_CONTACT_CONFIG.brandName, 'JHOIE SIGNATURES');
  assert.equal(BRAND_CONTACT_CONFIG.tagline, "Let's talk fashion....");
  assert.equal(BRAND_CONTACT_CONFIG.instagram.handle, '@jhoiesignatures');
  assert.equal(
    BRAND_CONTACT_CONFIG.instagram.profileUrl,
    'https://instagram.com/jhoiesignatures'
  );
  assert.equal(BRAND_CONTACT_CONFIG.whatsapp.isPlaceholder, true);
  assert.equal(BRAND_CONTACT_CONFIG.genuineTestimonials.length, 0);
});

test('Admin product form validation enforces required fields and accepts valid outfit input', () => {
  const invalidInput: ProductFormInput = {
    name: 'A',
    description: 'Too short',
    fabricAndCare: '',
    category: '',
    priceNgn: '0',
    images: [],
    sizes: [],
    colors: [],
    stockQuantity: '-2',
    stockStatus: 'In Stock',
    isFeatured: false,
    isNewArrival: false,
    isBestSeller: false,
  };

  const invalidResult = validateProductForm(invalidInput);
  assert.equal(invalidResult.isValid, false);
  assert.ok(invalidResult.errors.name);
  assert.ok(invalidResult.errors.description);
  assert.ok(invalidResult.errors.category);
  assert.ok(invalidResult.errors.priceNgn);
  assert.ok(invalidResult.errors.images);
  assert.ok(invalidResult.errors.sizes);
  assert.ok(invalidResult.errors.colors);
  assert.ok(invalidResult.errors.stockQuantity);

  const validInput: ProductFormInput = {
    name: 'Onyx Silk Wrap Evening Dress',
    description: 'Tailored floor-length silk wrap dress with structured waist drape.',
    fabricAndCare: 'Pure mulberry silk · Dry clean only',
    category: 'Dresses',
    priceNgn: '195000',
    images: [PRODUCT_IMAGE_SLOTS.ivoryGoldGown, PRODUCT_IMAGE_SLOTS.heroEditorial],
    sizes: ['S', 'M', 'L', 'Custom Fit'],
    colors: [
      { name: 'Midnight Black', hex: '#171717' },
      { name: 'Champagne Gold', hex: '#C6A45C' },
    ],
    stockQuantity: '7',
    stockStatus: 'In Stock',
    isFeatured: true,
    isNewArrival: true,
    isBestSeller: false,
  };

  const validResult = validateProductForm(validInput);
  assert.equal(validResult.isValid, true);
  assert.deepEqual(validResult.errors, {});

  const normalized = normalizeProductFormInput(validInput);
  assert.equal(normalized.priceNgn, 195000);
  assert.equal(normalized.stockQuantity, 7);
  assert.equal(normalized.images.length, 2);
});

test('Shared catalog CRUD: add, edit, search/filter, and delete sync across Admin, Shop, and Product Details', async () => {
  (globalThis as unknown as { localStorage: Storage }).localStorage = createMockLocalStorage();

  // Initial load falls back to sample catalog
  const initial = catalogRepository.loadProducts();
  assert.equal(initial.length, SAMPLE_PRODUCTS.length);

  // 1. Add a new product via Admin repository
  const created = await catalogRepository.createProduct(
    {
      name: 'Zaria Champagne Silk Two-Piece',
      description: 'Sculpted asymmetric top and fluid wide-leg silk trouser ensemble.',
      fabricAndCare: '100% silk crepe · Specialist dry clean',
      category: 'Two-Piece Outfits',
      priceNgn: 175000,
      images: [PRODUCT_IMAGE_SLOTS.midnightTwoPiece, PRODUCT_IMAGE_SLOTS.atelierCraftsmanship],
      sizes: ['S', 'M', 'L'],
      colors: [{ name: 'Champagne Gold', hex: '#C6A45C' }],
      stockStatus: 'In Stock',
      stockQuantity: 8,
      isFeatured: true,
      isNewArrival: true,
      isBestSeller: false,
      isSample: false,
    },
    initial
  );

  assert.equal(created.persisted, true);
  assert.equal(created.products.length, SAMPLE_PRODUCTS.length + 1);

  // Verify persistence and visibility in Shop filter & Product Details lookup
  const reloadedAfterAdd = catalogRepository.loadProducts();
  const shopSearch = filterAndSortProducts({
    products: reloadedAfterAdd,
    category: 'Two-Piece Outfits',
    searchQuery: 'zaria',
  });
  assert.equal(shopSearch.length, 1);
  assert.equal(shopSearch[0].priceNgn, 175000);

  const detailMatch = findProductByIdOrSlug(reloadedAfterAdd, created.product.id);
  assert.ok(detailMatch);
  assert.equal(detailMatch.name, 'Zaria Champagne Silk Two-Piece');

  // 2. Edit product price, stock quantity, availability, and featured toggle
  const updated = await catalogRepository.updateProduct(
    created.product.id,
    {
      priceNgn: 189000,
      stockQuantity: 2,
      stockStatus: 'Low Stock',
      isFeatured: false,
    },
    reloadedAfterAdd
  );

  assert.equal(updated.persisted, true);
  assert.equal(updated.product.priceNgn, 189000);
  assert.equal(updated.product.stockStatus, 'Low Stock');
  assert.equal(updated.product.isFeatured, false);

  const lowStockList = filterAndSortProducts({
    products: catalogRepository.loadProducts(),
    category: 'All',
    stockStatus: 'Low Stock',
    searchQuery: 'zaria',
  });
  assert.equal(lowStockList.length, 1);
  assert.equal(formatNaira(lowStockList[0].priceNgn), '₦189,000');

  // 3. Delete product and confirm removal across shared catalog
  const deleted = await catalogRepository.deleteProduct(
    created.product.id,
    catalogRepository.loadProducts()
  );
  assert.equal(deleted.persisted, true);
  assert.equal(deleted.products.length, SAMPLE_PRODUCTS.length);
  assert.equal(
    findProductByIdOrSlug(catalogRepository.loadProducts(), created.product.id),
    undefined
  );

  // 4. Reset restores clean sample baseline
  const reset = catalogRepository.resetToSampleCatalog();
  assert.equal(reset.persisted, true);
  assert.equal(reset.products.length, SAMPLE_PRODUCTS.length);
});

test('Order management: checkout origin defaults to New & Unpaid, updates statuses/delivery/notes, filters/sorts, and computes overview metrics', async () => {
  (globalThis as unknown as { localStorage: Storage }).localStorage = createMockLocalStorage();

  const gown = SAMPLE_PRODUCTS[0];
  const twoPiece = SAMPLE_PRODUCTS[1];

  // 1. Create two orders originating from storefront checkout cart items
  const firstOrder = await ordersRepository.createOrderRequest({
    customerName: 'Ngozi Nwosu',
    phoneNumber: '08031234567',
    email: 'ngozi@example.com',
    deliveryAddress: '14 Admiralty Way, Lekki Phase 1',
    cityState: 'Lagos',
    deliveryNotes: 'Deliver after 2pm',
    items: [
      {
        id: `${gown.id}__M__Warm Ivory`,
        productId: gown.id,
        name: gown.name,
        category: gown.category,
        image: gown.images[0],
        priceNgn: gown.priceNgn,
        selectedSize: 'M',
        selectedColor: 'Warm Ivory',
        quantity: 1,
      },
    ],
    subtotalNgn: gown.priceNgn,
  });

  // Never auto-mark as Paid; starts as New + Unpaid
  assert.equal(firstOrder.status, 'New');
  assert.equal(firstOrder.paymentStatus, 'Unpaid');
  assert.equal(firstOrder.deliveryFeeNgn, 0);
  assert.equal(firstOrder.totalAmountNgn, gown.priceNgn);
  assert.ok(firstOrder.referenceCode?.startsWith('JS-ORD-'));

  // Ensure distinct timestamps for oldest/newest sort check
  await new Promise((resolve) => setTimeout(resolve, 10));

  const secondOrder = await ordersRepository.createOrderRequest({
    customerName: 'Tolu Adebola',
    phoneNumber: '+234 809 876 5432',
    deliveryAddress: '8 Maitama Crescent',
    cityState: 'Abuja',
    items: [
      {
        id: `${twoPiece.id}__L__Midnight Black`,
        productId: twoPiece.id,
        name: twoPiece.name,
        category: twoPiece.category,
        image: twoPiece.images[0],
        priceNgn: twoPiece.priceNgn,
        selectedSize: 'L',
        selectedColor: 'Midnight Black',
        quantity: 2,
      },
    ],
    subtotalNgn: twoPiece.priceNgn * 2,
  });

  assert.equal(getOrderTotalQuantity(secondOrder), 2);

  // 2. Admin updates order status, payment status, delivery fee, and internal notes
  const updatedFirst = await ordersRepository.updateOrder(firstOrder.id!, {
    status: 'Confirmed',
    paymentStatus: 'Partially Paid',
    deliveryFeeNgn: 5000,
    internalNotes: 'Deposit confirmed via bank transfer; dispatch scheduled.',
  });

  assert.equal(updatedFirst.persisted, true);
  assert.equal(updatedFirst.order.status, 'Confirmed');
  assert.equal(updatedFirst.order.paymentStatus, 'Partially Paid');
  assert.equal(updatedFirst.order.deliveryFeeNgn, 5000);
  assert.equal(updatedFirst.order.totalAmountNgn, gown.priceNgn + 5000);
  assert.equal(
    updatedFirst.order.internalNotes,
    'Deposit confirmed via bank transfer; dispatch scheduled.'
  );

  await ordersRepository.updateOrder(secondOrder.id!, {
    status: 'Completed',
    paymentStatus: 'Paid',
    deliveryFeeNgn: 8000,
  });

  const allOrders = ordersRepository.loadOrders();
  assert.equal(allOrders.length, 2);

  // 3. Overview metrics reflect real order statuses
  const metrics = getOrderSummaryMetrics(allOrders);
  assert.equal(metrics.totalOrders, 2);
  assert.equal(metrics.pendingOrders, 1); // Confirmed stays in active/pending bucket
  assert.equal(metrics.completedOrders, 1);
  assert.equal(metrics.cancelledOrders, 0);

  // 4. Search by reference, search by customer name, filter by order & payment status, sort newest/oldest
  const searchByRef = filterAndSortOrders({
    orders: allOrders,
    searchQuery: firstOrder.referenceCode,
  });
  assert.equal(searchByRef.length, 1);
  assert.equal(searchByRef[0].customerName, 'Ngozi Nwosu');

  const searchByName = filterAndSortOrders({
    orders: allOrders,
    searchQuery: 'tolu',
    orderStatus: 'Completed',
    paymentStatus: 'Paid',
  });
  assert.equal(searchByName.length, 1);
  assert.equal(searchByName[0].totalAmountNgn, twoPiece.priceNgn * 2 + 8000);

  const oldestFirst = filterAndSortOrders({
    orders: allOrders,
    sortBy: 'oldest',
  });
  assert.equal(oldestFirst[0].customerName, 'Ngozi Nwosu');
  assert.equal(oldestFirst[1].customerName, 'Tolu Adebola');

  const newestFirst = filterAndSortOrders({
    orders: allOrders,
    sortBy: 'newest',
  });
  assert.equal(newestFirst[0].customerName, 'Tolu Adebola');

  // 5. WhatsApp customer contact uses actual customer phone & builds printable order summary
  assert.equal(normalizeCustomerPhoneForWhatsApp('08031234567'), '2348031234567');
  assert.equal(normalizeCustomerPhoneForWhatsApp('+234 809 876 5432'), '2348098765432');

  const reloadedFirst = allOrders.find((o) => o.id === firstOrder.id)!;
  const waMsg = buildAdminToCustomerWhatsAppMessage(reloadedFirst);
  assert.ok(waMsg.includes('Ngozi Nwosu'));
  assert.ok(waMsg.includes(firstOrder.referenceCode!));
  assert.ok(waMsg.includes('Order Status: Confirmed'));
  assert.ok(waMsg.includes('Payment Status: Partially Paid'));
  assert.ok(waMsg.includes(formatNaira(gown.priceNgn + 5000)));

  const waUrl = buildCustomerWhatsAppChatUrl(reloadedFirst.phoneNumber, waMsg);
  assert.ok(waUrl.startsWith('https://wa.me/2348031234567?text='));

  const printableSummary = buildPrintableOrderSummaryText(reloadedFirst);
  assert.ok(printableSummary.includes('JHOIE SIGNATURES — ORDER SUMMARY'));
  assert.ok(printableSummary.includes('14 Admiralty Way, Lekki Phase 1'));
  assert.ok(printableSummary.includes('Deposit confirmed via bank transfer'));
});

test('Custom sewing requests: form submission syncs to Admin, preserves reference preview, updates status/notes, and builds WhatsApp reply', async () => {
  (globalThis as unknown as { localStorage: Storage }).localStorage = createMockLocalStorage();

  const saved = await customOrdersRepository.submitCustomOrder({
    customerName: 'Bisola Ogunleye',
    contactNumber: '08023456789',
    email: 'bisola@example.com',
    outfitType: 'Gown',
    outfitDescription: 'Champagne silk evening gown with structured bodice.',
    preferredFabric: 'Duchesse Silk',
    preferredColor: 'Champagne Gold',
    preferredOccasion: 'Evening Gala / Red Carpet',
    preferredDeliveryDate: '2026-12-18',
    standardSizeReference: 'Exact Measurements',
    measurementUnit: 'inches',
    measurements: {
      bust: '35',
      waist: '27',
      hips: '38',
      shoulder: '14.5',
      length: '59',
      notes: '',
    },
    referenceImageName: 'inspo-gown.jpg',
    referenceImagePreviewUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
  });

  assert.equal(saved.status, 'New Request');
  assert.ok(saved.referenceCode?.startsWith('JS-FIT-'));
  assert.equal(isRenderableReferenceImage(saved.referenceImagePreviewUrl), true);

  const loaded = customOrdersRepository.loadCustomOrders();
  assert.equal(loaded.length, 1);
  assert.equal(getNewCustomRequestsCount(loaded), 1);

  const updated = await customOrdersRepository.updateCustomOrder(saved.id!, {
    status: 'Accepted',
    internalNotes: 'Sourcing silk fabric; fitting scheduled for next week.',
  });
  assert.equal(updated.persisted, true);
  assert.equal(updated.request.status, 'Accepted');
  assert.equal(getNewCustomRequestsCount(updated.requests), 0);

  const filtered = filterAndSortCustomRequests({
    requests: updated.requests,
    searchQuery: 'bisola',
    status: 'Accepted',
  });
  assert.equal(filtered.length, 1);

  const waMsg = buildAdminToCustomClientWhatsAppMessage(updated.request);
  assert.ok(waMsg.includes('Bisola Ogunleye'));
  assert.ok(waMsg.includes('Current Status: Accepted'));
});

test('Customer enquiries: Contact submissions default to Unread, filter/search, and transition Read/Replied', async () => {
  (globalThis as unknown as { localStorage: Storage }).localStorage = createMockLocalStorage();

  const created = await contactRepository.submitInquiry({
    name: 'Folake Martins',
    email: 'folake@example.com',
    phone: '08051112233',
    subject: 'Custom Tailoring Consultation',
    message: 'Please advise on lead time for an Aso-Ebi two-piece.',
  });

  assert.equal(created.status, 'Unread');
  assert.equal(getUnreadEnquiriesCount(contactRepository.loadInquiries()), 1);

  const readRes = await contactRepository.updateInquiry(created.id!, {
    status: 'Read',
    internalNotes: 'Reviewing atelier calendar.',
  });
  assert.equal(readRes.enquiry.status, 'Read');
  assert.equal(getUnreadEnquiriesCount(readRes.enquiries), 0);

  const repliedRes = await contactRepository.updateInquiry(created.id!, {
    status: 'Replied',
  });
  assert.equal(repliedRes.enquiry.status, 'Replied');

  const searched = filterAndSortEnquiries({
    enquiries: repliedRes.enquiries,
    searchQuery: 'folake',
    status: 'Replied',
  });
  assert.equal(searched.length, 1);
});

test('Website settings: validates, persists reusable settings across storefront/WhatsApp links, and resets cleanly', () => {
  (globalThis as unknown as { localStorage: Storage }).localStorage = createMockLocalStorage();

  const defaults = settingsRepository.loadSettings();
  assert.equal(defaults.brandName, 'JHOIE SIGNATURES');
  assert.equal(defaults.currencySymbol, '₦');

  const invalid = validateWebsiteSettings({
    ...defaults,
    whatsappNumberRaw: '123',
    instagramUrl: 'invalid-url',
  });
  assert.equal(invalid.isValid, false);
  assert.ok(invalid.errors.whatsappNumberRaw);
  assert.ok(invalid.errors.instagramUrl);

  const validNext = {
    ...defaults,
    whatsappNumberRaw: '2348099988776',
    whatsappDisplayLabel: '+234 809 998 8776',
    whatsappIsPlaceholder: false,
    businessLocation: 'Victoria Island, Lagos',
  };
  assert.equal(validateWebsiteSettings(validNext).isValid, true);

  const saved = settingsRepository.saveSettings(validNext);
  assert.equal(saved.persisted, true);
  assert.equal(settingsRepository.loadSettings().businessLocation, 'Victoria Island, Lagos');

  const customWaUrl = buildWhatsAppLink('Hello', saved.settings.whatsappNumberRaw);
  assert.ok(customWaUrl.startsWith('https://wa.me/2348099988776?text='));

  const reset = settingsRepository.resetSettings();
  assert.equal(reset.settings.whatsappIsPlaceholder, true);
  assert.equal(settingsRepository.loadSettings().businessLocation, defaults.businessLocation);
});

test('Admin authentication & backend readiness report honest local preview mode without hardcoded passwords', async () => {
  const sessionStore = new Map<string, string>();
  (globalThis as unknown as { sessionStorage: Storage }).sessionStorage = {
    getItem: (k: string) => sessionStore.get(k) ?? null,
    setItem: (k: string, v: string) => sessionStore.set(k, v),
    removeItem: (k: string) => sessionStore.delete(k),
    clear: () => sessionStore.clear(),
    key: (idx: number) => Array.from(sessionStore.keys())[idx] ?? null,
    get length() {
      return sessionStore.size;
    },
  };

  const readiness = getBackendReadinessStatus();
  assert.equal(readiness.supabaseConfigured, false);
  assert.equal(readiness.authMode, 'local_preview');
  assert.ok(readiness.missingRequirements.length >= 3);

  const invalidLogin = validateAdminLoginInput({ email: 'bad', passphrase: '12' });
  assert.equal(invalidLogin.isValid, false);
  assert.ok(invalidLogin.emailError);
  assert.ok(invalidLogin.passphraseError);

  const session = await adminAuthService.signInPreviewSession({
    email: 'owner@jhoiesignatures.example',
    passphrase: 'studio-session-key',
  });
  assert.equal(session.isAuthenticated, true);
  assert.equal(session.mode, 'local_preview');
  assert.equal(adminAuthService.loadSession()?.adminEmail, 'owner@jhoiesignatures.example');

  await adminAuthService.signOut();
  assert.equal(adminAuthService.loadSession(), null);
});

test('Production image asset paths resolve to public/images files and exclude /src/assets strings', () => {
  const slotValues = Object.values(PRODUCT_IMAGE_SLOTS);
  assert.ok(slotValues.length >= 6);

  for (const imagePath of slotValues) {
    assert.ok(
      imagePath.startsWith('/images/'),
      `Expected public image path starting with /images/, got: ${imagePath}`
    );
    assert.equal(imagePath.includes('/src/assets/'), false);
    const diskPath = resolve(process.cwd(), 'public', imagePath.slice(1));
    assert.ok(existsSync(diskPath), `Expected image asset on disk at ${diskPath}`);
  }

  for (const product of SAMPLE_PRODUCTS) {
    for (const img of product.images) {
      assert.ok(img.startsWith('/images/'), `Unexpected product image path: ${img}`);
    }
  }
});

test('Safe product lookup returns undefined for empty catalogues or unknown IDs without falling back', () => {
  assert.equal(findProductByIdOrSlug([], 'any-id'), undefined);
  assert.equal(findProductByIdOrSlug(SAMPLE_PRODUCTS, 'non-existent-piece-999'), undefined);
  assert.equal(findProductByIdOrSlug(SAMPLE_PRODUCTS, undefined), undefined);
  assert.equal(findProductByIdOrSlug(SAMPLE_PRODUCTS, SAMPLE_PRODUCTS[1].id)?.id, SAMPLE_PRODUCTS[1].id);
});

test('Checkout form validation validates required fields, Nigerian phone numbers, and optional emails', () => {
  const invalid = validateCheckoutForm({
    customerName: 'A',
    phoneNumber: '12345',
    email: 'invalid-email',
    deliveryAddress: 'No 1',
    cityState: 'L',
  });
  assert.equal(invalid.isValid, false);
  assert.ok(invalid.errors.customerName);
  assert.ok(invalid.errors.phoneNumber);
  assert.ok(invalid.errors.email);
  assert.ok(invalid.errors.deliveryAddress);
  assert.ok(invalid.errors.cityState);

  const valid = validateCheckoutForm({
    customerName: 'Amaka Okafor',
    phoneNumber: '+234 801 234 5678',
    email: '',
    deliveryAddress: '14 Admiralty Way, Lekki Phase 1',
    cityState: 'Lagos',
  });
  assert.equal(valid.isValid, true);
  assert.deepEqual(valid.errors, {});
});

test('Stale stock protection validates limits, prevents negative stock, and caps zero-stock items', () => {
  const stockedProduct = {
    ...SAMPLE_PRODUCTS[0],
    id: 'prod-stocked',
    name: 'Sample Silk Gown',
    stockQuantity: 2,
    stockStatus: 'Low Stock' as const,
  };
  const outOfStockProduct = {
    ...SAMPLE_PRODUCTS[1],
    id: 'prod-oos',
    name: 'Sample Velvet Dress',
    stockQuantity: 0,
    stockStatus: 'In Stock' as const,
  };

  // Stocked item with 0 stock must return maxAllowed = 0
  assert.equal(getMaxAllowedQuantity(outOfStockProduct), 0);

  // Multi-variant cart lines sharing one productId must not exceed total available stock (2)
  const cart: CartItem[] = [
    {
      id: 'c1',
      productId: stockedProduct.id,
      name: stockedProduct.name,
      category: stockedProduct.category,
      priceNgn: stockedProduct.priceNgn,
      image: stockedProduct.images[0],
      selectedSize: 'M',
      selectedColor: 'Gold',
      quantity: 2,
    },
    {
      id: 'c2',
      productId: stockedProduct.id,
      name: stockedProduct.name,
      category: stockedProduct.category,
      priceNgn: stockedProduct.priceNgn,
      image: stockedProduct.images[0],
      selectedSize: 'L',
      selectedColor: 'Black',
      quantity: 1,
    },
    {
      id: 'c3',
      productId: outOfStockProduct.id,
      name: outOfStockProduct.name,
      category: outOfStockProduct.category,
      priceNgn: outOfStockProduct.priceNgn,
      image: outOfStockProduct.images[0],
      selectedSize: 'S',
      selectedColor: 'Ivory',
      quantity: 1,
    },
    {
      id: 'c4',
      productId: 'deleted-product-id',
      name: 'Removed Piece',
      category: 'Dresses',
      priceNgn: 85000,
      image: '/images/editorial-dress.jpg',
      selectedSize: 'M',
      selectedColor: 'Black',
      quantity: 1,
    },
  ];

  const stockValidation = validateCartStock(cart, [stockedProduct, outOfStockProduct]);
  assert.equal(stockValidation.isValid, false);
  assert.equal(stockValidation.issuesByCartItemId.c1, undefined);
  assert.equal(stockValidation.issuesByCartItemId.c2?.reason, 'exceeds_stock');
  assert.equal(stockValidation.issuesByCartItemId.c3?.reason, 'out_of_stock');
  assert.equal(stockValidation.issuesByCartItemId.c4?.reason, 'unavailable');

  // Reconciling a single excessive line clamps it down to current stock without deleting
  const singleExcessCart: CartItem[] = [{ ...cart[0], quantity: 5 }];
  const reconciled = reconcileCartQuantitiesWithStock(singleExcessCart, [stockedProduct]);
  assert.equal(reconciled.quantitiesAdjusted, true);
  assert.equal(reconciled.hasBlockingUnavailableItems, false);
  assert.equal(reconciled.nextCart[0].quantity, 2);

  // Applying inventory decrement clamps at 0 (never negative) and transitions status to Out of Stock
  const updatedCatalog = applyOrderInventoryUpdates([stockedProduct], [{ ...cart[0], quantity: 5 }]);
  assert.equal(updatedCatalog[0].stockQuantity, 0);
  assert.equal(updatedCatalog[0].stockStatus, 'Out of Stock');
});

test('Supabase client configuration rejects placeholders/missing env and exposes no service_role keys', () => {
  const config = getSupabaseEnvConfig();
  assert.equal(config.isConfigured, false);
  assert.equal(isSupabaseConfigured(), false);

  const clientSource = readFileSync(resolve(process.cwd(), 'src/lib/supabaseClient.ts'), 'utf8');
  assert.equal(clientSource.includes('SUPABASE_SERVICE_ROLE'), false);
  assert.equal(clientSource.includes('eyJ'), false);

  const migrationFiles = [
    'supabase/migrations/001_initial_schema.sql',
    'supabase/migrations/002_rls_policies.sql',
    'supabase/migrations/003_rpc_functions.sql',
    'supabase/migrations/004_storage_buckets.sql',
  ];

  for (const relPath of migrationFiles) {
    const absPath = resolve(process.cwd(), relPath);
    assert.ok(existsSync(absPath), `Expected SQL migration file at ${relPath}`);
  }
});

test('Admin login validation enforces 6-character minimum when Supabase Auth is active', () => {
  const weakForSupabase = validateAdminLoginInput({
    email: 'admin@jhoiesignatures.com',
    passphrase: '12345',
    requireStrongPassword: true,
  });
  assert.equal(weakForSupabase.isValid, false);
  assert.ok(weakForSupabase.passphraseError);

  const validForSupabase = validateAdminLoginInput({
    email: 'admin@jhoiesignatures.com',
    passphrase: 'strong-password-1',
    requireStrongPassword: true,
  });
  assert.equal(validForSupabase.isValid, true);
});

test('Custom order optional budgetNgn and referenceImagePath integrate cleanly with validation and WhatsApp brief', () => {
  const payload: CustomOrderPayload = {
    referenceCode: 'JS-FIT-8842',
    customerName: 'Kemi Babatunde',
    contactNumber: '+2348091112233',
    outfitType: 'Dress',
    outfitDescription: 'Structured ivory silk midi dress with sculpted collar detail.',
    preferredColor: 'Warm Ivory',
    preferredDeliveryDate: '2026-12-28',
    budgetNgn: 250000,
    standardSizeReference: 'M',
    measurementUnit: 'inches',
    measurements: {
      bust: '36',
      waist: '28',
      hips: '39',
      shoulder: '',
      length: '',
      notes: '',
    },
    referenceImageName: 'kemi-inspo.jpg',
    referenceImagePath: 'requests/1700000000_abc123.jpg',
  };

  const validation = validateCustomOrderForm(payload, '2026-11-15');
  assert.equal(validation.isValid, true);

  const msg = buildCustomOrderWhatsAppMessage(payload);
  assert.ok(msg.includes('Estimated Budget: ₦250,000'));
  assert.ok(msg.includes('kemi-inspo.jpg'));
});

test('Customer registration & login validation enforces full name, valid email, password length, and confirmation match', () => {
  const invalidSignUp = validateCustomerSignUpInput({
    fullName: 'A',
    email: 'invalid-email',
    password: '123',
    confirmPassword: '456',
  });
  assert.equal(invalidSignUp.isValid, false);
  assert.ok(invalidSignUp.fullNameError);
  assert.ok(invalidSignUp.emailError);
  assert.ok(invalidSignUp.passwordError);
  assert.ok(invalidSignUp.confirmPasswordError);

  const validSignUp = validateCustomerSignUpInput({
    fullName: 'Zainab Balogun',
    email: 'zainab@example.com',
    password: 'luxury-password-1',
    confirmPassword: 'luxury-password-1',
  });
  assert.equal(validSignUp.isValid, true);
  assert.equal(validSignUp.fullNameError, undefined);
  assert.equal(validSignUp.emailError, undefined);
  assert.equal(validSignUp.passwordError, undefined);
  assert.equal(validSignUp.confirmPasswordError, undefined);

  const invalidSignIn = validateCustomerSignInInput({
    email: 'bad-email',
    password: '123',
  });
  assert.equal(invalidSignIn.isValid, false);
  assert.ok(invalidSignIn.emailError);
  assert.ok(invalidSignIn.passwordError);

  const validSignIn = validateCustomerSignInInput({
    email: 'zainab@example.com',
    password: 'luxury-password-1',
  });
  assert.equal(validSignIn.isValid, true);
});

test('Mandatory customer session guard blocks guest checkout/custom orders and customer role never elevates to admin', async () => {
  const sessionStore = new Map<string, string>();
  (globalThis as unknown as { sessionStorage: Storage }).sessionStorage = {
    getItem: (k: string) => sessionStore.get(k) ?? null,
    setItem: (k: string, v: string) => sessionStore.set(k, v),
    removeItem: (k: string) => sessionStore.delete(k),
    clear: () => sessionStore.clear(),
    key: (idx: number) => Array.from(sessionStore.keys())[idx] ?? null,
    get length() {
      return sessionStore.size;
    },
  };

  assert.throws(
    () => requireAuthenticatedCustomerSession(null, 'complete checkout'),
    /Please sign in or create a customer account/
  );
  assert.throws(
    () => requireAuthenticatedCustomerSession(undefined, 'submit a custom outfit request'),
    /Please sign in or create a customer account/
  );

  const regResult = await customerAuthService.signUpCustomer({
    fullName: 'Adaeze Eze',
    email: 'adaeze@example.com',
    password: 'client-password-1',
    confirmPassword: 'client-password-1',
  });
  assert.equal(regResult.status, 'signed_in');
  assert.ok(regResult.session);
  assert.equal(regResult.session.role, 'customer');

  const verifiedSession = requireAuthenticatedCustomerSession(
    regResult.session,
    'complete checkout'
  );
  assert.equal(verifiedSession.email, 'adaeze@example.com');

  const restored = await customerAuthService.restoreSession();
  assert.equal(restored?.email, 'adaeze@example.com');
  assert.equal(restored?.role, 'customer');

  // Validate profile update checks & persistence
  const invalidProfile = validateCustomerProfileUpdate({
    fullName: 'A',
    phone: '123',
  });
  assert.equal(invalidProfile.isValid, false);
  assert.ok(invalidProfile.fullNameError);
  assert.ok(invalidProfile.phoneError);

  const updatedProfile = await customerAuthService.updateProfile(restored, {
    fullName: 'Adaeze Eze-Okonkwo',
    phone: '+234 803 555 0199',
  });
  assert.equal(updatedProfile.fullName, 'Adaeze Eze-Okonkwo');
  assert.equal(updatedProfile.phone, '+234 803 555 0199');
  assert.equal(updatedProfile.role, 'customer');

  await customerAuthService.signOut();
  assert.equal(await customerAuthService.restoreSession(), null);
});


