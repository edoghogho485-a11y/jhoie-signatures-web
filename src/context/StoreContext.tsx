import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { SHOP_CATEGORIES } from '../data/sampleCatalog';
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabaseClient';
import { adminAuthService } from '../services/adminAuthService';
import {
  customerAuthService,
  requireAuthenticatedCustomerSession,
} from '../services/customerAuthService';
import {
  cartStorage,
  catalogRepository,
  contactRepository,
  customOrdersRepository,
  type CustomOrderUpdateInput,
  DEFAULT_WEBSITE_SETTINGS,
  type EnquiryUpdateInput,
  ordersRepository,
  type OrderUpdateInput,
  type ProductInputPayload,
  settingsRepository,
  STORAGE_KEYS,
} from '../services/storeRepository';
import type {
  AdminAuthSession,
  AdminSection,
  AppRoute,
  CartItem,
  ContactInquiryPayload,
  CustomerAuthSession,
  CustomerSignUpResult,
  CustomOrderPayload,
  OrderRequestPayload,
  PostAuthRedirectTarget,
  Product,
  ProductCategory,
  WebsiteSettings,
} from '../types/fashion';
import {
  addItemToCart,
  calculateCartTotals,
  getMaxAllowedQuantity,
  removeItemFromCart,
  updateItemQuantityInCart,
} from '../utils/cartHelpers';
import { findProductByIdOrSlug } from '../utils/catalogHelpers';
import {
  applyOrderInventoryUpdates,
  refreshCartItemsFromCatalog,
  validateCartStock,
} from '../utils/checkoutValidation';

interface WhatsAppModalPayload {
  title: string;
  message: string;
}

const VALID_ADMIN_SECTIONS: AdminSection[] = [
  'overview',
  'products',
  'orders',
  'custom-requests',
  'enquiries',
  'settings',
];

const POST_AUTH_REDIRECT_KEY = 'jhoie_signatures_post_auth_redirect_v1';

function readStoredPostAuthRedirect(): PostAuthRedirectTarget {
  try {
    if (typeof sessionStorage === 'undefined') return null;
    const raw = sessionStorage.getItem(POST_AUTH_REDIRECT_KEY);
    return raw === 'checkout' || raw === 'custom-orders' ? raw : null;
  } catch {
    return null;
  }
}

function writeStoredPostAuthRedirect(target: PostAuthRedirectTarget): void {
  try {
    if (typeof sessionStorage === 'undefined') return;
    if (!target) {
      sessionStorage.removeItem(POST_AUTH_REDIRECT_KEY);
    } else {
      sessionStorage.setItem(POST_AUTH_REDIRECT_KEY, target);
    }
  } catch {
    // Ignore storage errors gracefully
  }
}

function isSupabaseAuthCallbackHash(hashString: string): boolean {
  const cleaned = hashString.replace(/^#/, '');
  return (
    cleaned.startsWith('access_token=') ||
    cleaned.startsWith('refresh_token=') ||
    cleaned.startsWith('error=') ||
    cleaned.startsWith('error_description=')
  );
}

interface ParsedHashRoute {
  route: AppRoute;
  productId?: string;
  category?: ProductCategory | 'All';
  adminSection?: AdminSection;
  redirectAfterAuth?: PostAuthRedirectTarget;
}

function parseHashRoute(
  hashString: string,
  pathname = '',
  availableProducts: Product[] = []
): ParsedHashRoute {
  if (isSupabaseAuthCallbackHash(hashString)) {
    return { route: 'home' };
  }

  const cleaned = hashString.replace(/^#\/?/, '').trim();
  if (!cleaned && pathname.replace(/\/+$/, '') === '/admin') {
    return { route: 'admin', adminSection: 'overview' };
  }

  if (!cleaned || cleaned === 'home') {
    return { route: 'home' };
  }

  const [pathPart, queryPart] = cleaned.split('?');
  const segments = pathPart.split('/').filter(Boolean);
  const root = segments[0];

  if (root === 'admin') {
    const maybeSection = segments[1] as AdminSection | undefined;
    const adminSection =
      maybeSection && VALID_ADMIN_SECTIONS.includes(maybeSection) ? maybeSection : 'overview';
    return { route: 'admin', adminSection };
  }

  if (root === 'shop') {
    const params = new URLSearchParams(queryPart || '');
    const catParam = params.get('category');
    const validCat = SHOP_CATEGORIES.find((c) => c === catParam);
    return { route: 'shop', category: validCat || 'All' };
  }

  if (root === 'product') {
    const rawSegment = segments[1] ? decodeURIComponent(segments[1]) : '';
    const matched = rawSegment ? findProductByIdOrSlug(availableProducts, rawSegment) : undefined;
    return {
      route: 'product',
      productId: matched ? matched.id : rawSegment,
    };
  }

  if (root === 'login' || root === 'register') {
    const params = new URLSearchParams(queryPart || '');
    const redirectParam = params.get('redirect');
    const redirectAfterAuth: PostAuthRedirectTarget =
      redirectParam === 'checkout' || redirectParam === 'custom-orders' ? redirectParam : null;
    return { route: root, redirectAfterAuth };
  }

  if (
    root === 'custom-orders' ||
    root === 'about' ||
    root === 'contact' ||
    root === 'checkout' ||
    root === 'account'
  ) {
    return { route: root };
  }

  return { route: 'home' };
}

function buildHashUrl(
  route: AppRoute,
  options?: {
    productId?: string;
    category?: ProductCategory | 'All';
    adminSection?: AdminSection;
    redirectAfterAuth?: PostAuthRedirectTarget;
  }
): string {
  if (route === 'home') return '#home';
  if (route === 'admin') {
    if (options?.adminSection && options.adminSection !== 'overview') {
      return `#admin/${options.adminSection}`;
    }
    return '#admin';
  }
  if (route === 'shop') {
    if (options?.category && options.category !== 'All') {
      return `#shop?category=${encodeURIComponent(options.category)}`;
    }
    return '#shop';
  }
  if (route === 'product' && options?.productId) {
    return `#product/${encodeURIComponent(options.productId)}`;
  }
  if ((route === 'login' || route === 'register') && options?.redirectAfterAuth) {
    return `#${route}?redirect=${encodeURIComponent(options.redirectAfterAuth)}`;
  }
  return `#${route}`;
}

interface StoreContextValue {
  route: AppRoute;
  adminSection: AdminSection;
  selectedProductId: string;
  shopCategoryFilter: ProductCategory | 'All';
  isSupabaseMode: boolean;
  isCatalogLoading: boolean;
  catalogError: string | null;
  reloadCatalog: () => Promise<void>;
  isAdminDataLoading: boolean;
  adminDataError: string | null;
  reloadAdminData: () => Promise<void>;
  products: Product[];
  orders: OrderRequestPayload[];
  customOrders: CustomOrderPayload[];
  enquiries: ContactInquiryPayload[];
  websiteSettings: WebsiteSettings;
  adminSession: AdminAuthSession | null;
  customerSession: CustomerAuthSession | null;
  isAuthLoading: boolean;
  postAuthRedirect: PostAuthRedirectTarget;
  setPostAuthRedirect: (target: PostAuthRedirectTarget) => void;
  cart: CartItem[];
  cartCount: number;
  cartSubtotalNgn: number;
  isCartOpen: boolean;
  whatsAppModal: WhatsAppModalPayload | null;
  toastMessage: string | null;
  navigate: (
    route: AppRoute,
    options?: {
      productId?: string;
      category?: ProductCategory | 'All';
      adminSection?: AdminSection;
      redirectAfterAuth?: PostAuthRedirectTarget;
    }
  ) => void;
  setAdminSection: (section: AdminSection) => void;
  setShopCategoryFilter: (category: ProductCategory | 'All') => void;
  addProduct: (input: ProductInputPayload) => Promise<{ product: Product; persisted: boolean }>;
  updateProduct: (
    id: string,
    updates: Partial<ProductInputPayload>
  ) => Promise<{ product: Product; persisted: boolean }>;
  deleteProduct: (id: string) => Promise<{ persisted: boolean }>;
  resetCatalogToSamples: () => { persisted: boolean };
  submitOrderRequest: (payload: OrderRequestPayload) => Promise<OrderRequestPayload>;
  updateOrder: (
    id: string,
    updates: OrderUpdateInput
  ) => Promise<{ order: OrderRequestPayload; persisted: boolean }>;
  submitCustomOrder: (payload: CustomOrderPayload) => Promise<CustomOrderPayload>;
  updateCustomOrder: (
    id: string,
    updates: CustomOrderUpdateInput
  ) => Promise<{ request: CustomOrderPayload; persisted: boolean }>;
  submitContactInquiry: (payload: ContactInquiryPayload) => Promise<ContactInquiryPayload>;
  updateEnquiry: (
    id: string,
    updates: EnquiryUpdateInput
  ) => Promise<{ enquiry: ContactInquiryPayload; persisted: boolean }>;
  updateWebsiteSettings: (
    next: WebsiteSettings
  ) => Promise<{ settings: WebsiteSettings; persisted: boolean }>;
  resetWebsiteSettings: () => Promise<{ settings: WebsiteSettings; persisted: boolean }>;
  adminLogin: (params: { email: string; passphrase: string }) => Promise<AdminAuthSession>;
  adminLogout: () => Promise<void>;
  customerLogin: (params: { email: string; password: string }) => Promise<CustomerAuthSession>;
  customerRegister: (params: {
    fullName: string;
    email: string;
    password: string;
    confirmPassword?: string;
  }) => Promise<CustomerSignUpResult>;
  customerLogout: () => Promise<void>;
  resendCustomerConfirmation: (email: string) => Promise<void>;
  updateCustomerProfile: (params: {
    fullName: string;
    phone?: string;
  }) => Promise<CustomerAuthSession>;
  openCart: () => void;
  closeCart: () => void;
  addToCart: (params: {
    product: Product;
    selectedSize: string;
    selectedColor: string;
    quantity: number;
    openDrawer?: boolean;
  }) => void;
  updateCartQuantity: (cartItemId: string, quantity: number) => void;
  removeFromCart: (cartItemId: string) => void;
  replaceCart: (nextCart: CartItem[]) => void;
  clearCart: () => void;
  openWhatsAppModal: (title: string, message: string) => void;
  closeWhatsAppModal: () => void;
  showToast: (message: string) => void;
}

const StoreContext = createContext<StoreContextValue | undefined>(undefined);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const isSupabaseMode = isSupabaseConfigured();

  const [products, setProducts] = useState<Product[]>(() =>
    isSupabaseMode ? [] : catalogRepository.loadProducts()
  );
  const [orders, setOrders] = useState<OrderRequestPayload[]>(() =>
    isSupabaseMode ? [] : ordersRepository.loadOrders()
  );
  const [customOrders, setCustomOrders] = useState<CustomOrderPayload[]>(() =>
    isSupabaseMode ? [] : customOrdersRepository.loadCustomOrders()
  );
  const [enquiries, setEnquiries] = useState<ContactInquiryPayload[]>(() =>
    isSupabaseMode ? [] : contactRepository.loadInquiries()
  );
  const [websiteSettings, setWebsiteSettings] = useState<WebsiteSettings>(() =>
    settingsRepository.loadSettings()
  );
  const [adminSession, setAdminSession] = useState<AdminAuthSession | null>(() =>
    adminAuthService.loadSession()
  );
  const [customerSession, setCustomerSession] = useState<CustomerAuthSession | null>(() =>
    customerAuthService.loadPreviewSession()
  );
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(isSupabaseMode);

  const [isCatalogLoading, setIsCatalogLoading] = useState<boolean>(isSupabaseMode);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [isAdminDataLoading, setIsAdminDataLoading] = useState<boolean>(false);
  const [adminDataError, setAdminDataError] = useState<string | null>(null);

  const initialHash = useMemo(
    () => parseHashRoute(window.location.hash, window.location.pathname, products),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const [postAuthRedirect, setPostAuthRedirectState] = useState<PostAuthRedirectTarget>(() => {
    if (initialHash.redirectAfterAuth) {
      writeStoredPostAuthRedirect(initialHash.redirectAfterAuth);
      return initialHash.redirectAfterAuth;
    }
    return readStoredPostAuthRedirect();
  });

  const setPostAuthRedirect = useCallback((target: PostAuthRedirectTarget) => {
    writeStoredPostAuthRedirect(target);
    setPostAuthRedirectState(target);
  }, []);

  const [route, setRoute] = useState<AppRoute>(initialHash.route);
  const [adminSection, setAdminSectionState] = useState<AdminSection>(
    initialHash.adminSection || 'overview'
  );
  const [selectedProductId, setSelectedProductId] = useState<string>(
    initialHash.route === 'product'
      ? initialHash.productId || ''
      : initialHash.productId || products[0]?.id || ''
  );
  const [shopCategoryFilter, setShopCategoryFilterState] = useState<ProductCategory | 'All'>(
    initialHash.category || 'All'
  );
  const [cart, setCart] = useState<CartItem[]>(() => cartStorage.load());
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [whatsAppModal, setWhatsAppModal] = useState<WhatsAppModalPayload | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const reloadCatalog = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setProducts(catalogRepository.loadProducts());
      setWebsiteSettings(settingsRepository.loadSettings());
      setIsCatalogLoading(false);
      setCatalogError(null);
      return;
    }

    setIsCatalogLoading(true);
    setCatalogError(null);
    try {
      const [fetchedProducts, fetchedSettings] = await Promise.all([
        catalogRepository.listProducts(),
        settingsRepository.fetchSettings(),
      ]);
      setProducts(fetchedProducts);
      setWebsiteSettings(fetchedSettings);
      setSelectedProductId((prev) => prev || fetchedProducts[0]?.id || '');
    } catch (err) {
      setCatalogError(
        err instanceof Error && err.message
          ? err.message
          : 'Unable to connect to studio catalogue right now.'
      );
    } finally {
      setIsCatalogLoading(false);
    }
  }, []);

  const reloadAdminData = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setOrders(ordersRepository.loadOrders());
      setCustomOrders(customOrdersRepository.loadCustomOrders());
      setEnquiries(contactRepository.loadInquiries());
      setAdminDataError(null);
      setIsAdminDataLoading(false);
      return;
    }

    setIsAdminDataLoading(true);
    setAdminDataError(null);
    try {
      const [fetchedProducts, fetchedOrders, fetchedCustomOrders, fetchedInquiries] =
        await Promise.all([
          catalogRepository.listProducts(),
          ordersRepository.listOrders(),
          customOrdersRepository.listCustomOrders(),
          contactRepository.listInquiries(),
        ]);
      setProducts(fetchedProducts);
      setOrders(fetchedOrders);
      setCustomOrders(fetchedCustomOrders);
      setEnquiries(fetchedInquiries);
    } catch (err) {
      setAdminDataError(
        err instanceof Error && err.message
          ? err.message
          : 'Unable to load Admin Studio records from Supabase.'
      );
    } finally {
      setIsAdminDataLoading(false);
    }
  }, []);

  // Initial Supabase public hydration & Auth session restoration + listener
  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setIsAuthLoading(false);
      return;
    }

    let active = true;
    void reloadCatalog();

    const syncAuthSessions = async () => {
      try {
        const [restoredCustomer, restoredAdmin] = await Promise.all([
          customerAuthService.restoreSession(),
          adminAuthService.restoreSupabaseAdminSession(),
        ]);
        if (!active) return;
        setCustomerSession(restoredCustomer);
        setAdminSession(restoredAdmin?.isAuthenticated ? restoredAdmin : null);
      } finally {
        if (active) {
          setIsAuthLoading(false);
        }
      }
    };

    void syncAuthSessions();

    const client = getSupabaseClient();
    const authSub = client?.auth.onAuthStateChange((event) => {
      if (!active) return;
      if (event === 'SIGNED_OUT') {
        setCustomerSession(null);
        setAdminSession(null);
        setOrders([]);
        setCustomOrders([]);
        setEnquiries([]);
        setAdminDataError(null);
        setIsAuthLoading(false);
      } else if (
        event === 'SIGNED_IN' ||
        event === 'TOKEN_REFRESHED' ||
        event === 'USER_UPDATED'
      ) {
        void syncAuthSessions().then(() => {
          if (!active) return;
          if (event === 'SIGNED_IN' && isSupabaseAuthCallbackHash(window.location.hash)) {
            const pendingTarget = readStoredPostAuthRedirect() || 'home';
            writeStoredPostAuthRedirect(null);
            setPostAuthRedirectState(null);
            setRoute(pendingTarget);
            window.history.replaceState(null, '', buildHashUrl(pendingTarget));
            setToastMessage('Email verified. You are now signed in.');
          }
        });
      }
    });

    return () => {
      active = false;
      authSub?.data.subscription.unsubscribe();
    };
  }, [reloadCatalog]);

  // Fetch private Admin data whenever a verified admin session becomes active in Supabase mode
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    if (adminSession?.isAuthenticated) {
      void reloadAdminData();
    } else {
      setOrders([]);
      setCustomOrders([]);
      setEnquiries([]);
    }
  }, [adminSession?.isAuthenticated, adminSession?.userId, reloadAdminData]);

  // Persist cart to localStorage on every update
  useEffect(() => {
    cartStorage.save(cart);
  }, [cart]);

  // Sync shared state across browser tabs (local preview mode & cart)
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.CART) {
        setCart(cartStorage.load());
      }
      if (isSupabaseConfigured()) return;
      if (e.key === STORAGE_KEYS.PRODUCTS) {
        setProducts(catalogRepository.loadProducts());
      }
      if (e.key === STORAGE_KEYS.ORDERS) {
        setOrders(ordersRepository.loadOrders());
      }
      if (e.key === STORAGE_KEYS.CUSTOM_ORDERS) {
        setCustomOrders(customOrdersRepository.loadCustomOrders());
      }
      if (e.key === STORAGE_KEYS.CONTACT_INQUIRIES) {
        setEnquiries(contactRepository.loadInquiries());
      }
      if (e.key === STORAGE_KEYS.SETTINGS) {
        setWebsiteSettings(settingsRepository.loadSettings());
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Support browser Back/Forward hash navigation
  useEffect(() => {
    const handleHashChange = () => {
      if (isSupabaseAuthCallbackHash(window.location.hash)) {
        return;
      }
      const parsed = parseHashRoute(window.location.hash, window.location.pathname, products);
      setRoute(parsed.route);
      if (parsed.adminSection) {
        setAdminSectionState(parsed.adminSection);
      }
      if (parsed.redirectAfterAuth) {
        setPostAuthRedirect(parsed.redirectAfterAuth);
      }
      if (parsed.route === 'product') {
        setSelectedProductId(parsed.productId || '');
      } else if (parsed.productId) {
        setSelectedProductId(parsed.productId);
      }
      if (parsed.category) {
        setShopCategoryFilterState(parsed.category);
      }
      setIsCartOpen(false);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [products]);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => setToastMessage(null), 3400);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
  }, []);

  const requireVerifiedAdminInSupabaseMode = useCallback(() => {
    if (
      isSupabaseConfigured() &&
      (!adminSession?.isAuthenticated ||
        (adminSession.role !== 'admin' && adminSession.role !== 'super_admin'))
    ) {
      throw new Error('Administrator sign-in is required to perform this action.');
    }
  }, [adminSession?.isAuthenticated, adminSession?.role]);

  const setAdminSection = useCallback((section: AdminSection) => {
    setAdminSectionState(section);
    setRoute('admin');
    const nextHash = buildHashUrl('admin', { adminSection: section });
    if (window.location.hash !== nextHash) {
      window.location.hash = nextHash;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const setShopCategoryFilter = useCallback(
    (category: ProductCategory | 'All') => {
      setShopCategoryFilterState(category);
      if (route === 'shop') {
        const nextHash = buildHashUrl('shop', { category });
        if (window.location.hash !== nextHash) {
          window.history.replaceState(null, '', nextHash);
        }
      }
    },
    [route]
  );

  const navigate = useCallback(
    (
      nextRoute: AppRoute,
      options?: {
        productId?: string;
        category?: ProductCategory | 'All';
        adminSection?: AdminSection;
        redirectAfterAuth?: PostAuthRedirectTarget;
      }
    ) => {
      const targetProductId = options?.productId || selectedProductId;
      const targetCategory = options?.category ?? shopCategoryFilter;
      const targetAdminSection = options?.adminSection ?? adminSection;

      if (options?.productId) {
        setSelectedProductId(options.productId);
      }
      if (options?.category) {
        setShopCategoryFilterState(options.category);
      }
      if (options?.adminSection) {
        setAdminSectionState(options.adminSection);
      }
      if (options?.redirectAfterAuth !== undefined) {
        setPostAuthRedirect(options.redirectAfterAuth);
      }

      const activeRedirect =
        options?.redirectAfterAuth !== undefined ? options.redirectAfterAuth : postAuthRedirect;

      setRoute(nextRoute);
      setIsCartOpen(false);

      const nextHash = buildHashUrl(nextRoute, {
        productId: nextRoute === 'product' ? targetProductId : undefined,
        category: nextRoute === 'shop' ? targetCategory : undefined,
        adminSection: nextRoute === 'admin' ? targetAdminSection : undefined,
        redirectAfterAuth:
          nextRoute === 'login' || nextRoute === 'register' ? activeRedirect : undefined,
      });
      if (window.location.hash !== nextHash) {
        window.location.hash = nextHash;
      }

      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [adminSection, postAuthRedirect, selectedProductId, setPostAuthRedirect, shopCategoryFilter]
  );

  const addProduct = useCallback(
    async (input: ProductInputPayload) => {
      requireVerifiedAdminInSupabaseMode();
      const { product, products: nextProducts, persisted } = await catalogRepository.createProduct(
        input,
        products
      );
      setProducts(nextProducts);
      return { product, persisted };
    },
    [products, requireVerifiedAdminInSupabaseMode]
  );

  const updateProduct = useCallback(
    async (id: string, updates: Partial<ProductInputPayload>) => {
      requireVerifiedAdminInSupabaseMode();
      const { product, products: nextProducts, persisted } = await catalogRepository.updateProduct(
        id,
        updates,
        products
      );
      setProducts(nextProducts);
      // Sync matching items already in shopping cart
      setCart((prevCart) =>
        prevCart.map((item) => {
          if (item.productId !== id) return item;
          return {
            ...item,
            name: product.name,
            category: product.category,
            priceNgn: product.priceNgn,
            image: product.images[0] || item.image,
          };
        })
      );
      return { product, persisted };
    },
    [products, requireVerifiedAdminInSupabaseMode]
  );

  const deleteProduct = useCallback(
    async (id: string) => {
      requireVerifiedAdminInSupabaseMode();
      const { products: nextProducts, persisted } = await catalogRepository.deleteProduct(
        id,
        products
      );
      setProducts(nextProducts);
      setCart((prevCart) => prevCart.filter((item) => item.productId !== id));
      if (selectedProductId === id) {
        setSelectedProductId(nextProducts[0]?.id || '');
      }
      return { persisted };
    },
    [products, requireVerifiedAdminInSupabaseMode, selectedProductId]
  );

  const resetCatalogToSamples = useCallback(() => {
    if (isSupabaseConfigured()) {
      return { persisted: false };
    }
    const { products: samples, persisted } = catalogRepository.resetToSampleCatalog();
    setProducts(samples);
    if (samples[0]) {
      setSelectedProductId(samples[0].id);
    }
    return { persisted };
  }, []);

  const submitOrderRequest = useCallback(
    async (payload: OrderRequestPayload) => {
      requireAuthenticatedCustomerSession(customerSession, 'complete checkout');

      let currentCatalog = products;

      if (isSupabaseConfigured()) {
        currentCatalog = await catalogRepository.listProducts();
        setProducts(currentCatalog);
      } else {
        try {
          if (localStorage.getItem(STORAGE_KEYS.PRODUCTS) !== null) {
            currentCatalog = catalogRepository.loadProducts();
          }
        } catch {
          // Use in-memory products state when localStorage is unavailable
        }
      }

      const stockCheck = validateCartStock(payload.items, currentCatalog);
      if (!stockCheck.isValid) {
        throw new Error(
          stockCheck.summaryMessage ||
            'One or more items in your bag are out of stock or exceed available stock.'
        );
      }

      const verifiedItems = refreshCartItemsFromCatalog(payload.items, currentCatalog);
      const { subtotalNgn: verifiedSubtotal } = calculateCartTotals(verifiedItems);

      const saved = await ordersRepository.createOrderRequest({
        ...payload,
        items: verifiedItems,
        subtotalNgn: verifiedSubtotal,
      });

      if (isSupabaseConfigured()) {
        try {
          const refreshedProducts = await catalogRepository.listProducts();
          setProducts(refreshedProducts);
          if (adminSession?.isAuthenticated) {
            const refreshedOrders = await ordersRepository.listOrders();
            setOrders(refreshedOrders);
          }
        } catch {
          // Order already succeeded server-side; don't fail confirmation if background refresh fails
        }
      } else {
        const nextProducts = applyOrderInventoryUpdates(currentCatalog, verifiedItems);
        catalogRepository.saveProducts(nextProducts);
        setProducts(nextProducts);
        setOrders(ordersRepository.loadOrders());
      }

      return saved;
    },
    [adminSession?.isAuthenticated, customerSession, products]
  );

  const updateOrder = useCallback(
    async (id: string, updates: OrderUpdateInput) => {
      requireVerifiedAdminInSupabaseMode();
      const { order, orders: nextOrders, persisted } = await ordersRepository.updateOrder(
        id,
        updates,
        orders
      );
      setOrders(nextOrders);
      return { order, persisted };
    },
    [orders, requireVerifiedAdminInSupabaseMode]
  );

  const submitCustomOrder = useCallback(
    async (payload: CustomOrderPayload) => {
      requireAuthenticatedCustomerSession(customerSession, 'submit a custom outfit request');
      const saved = await customOrdersRepository.submitCustomOrder(payload);
      if (isSupabaseConfigured()) {
        if (adminSession?.isAuthenticated) {
          try {
            const latest = await customOrdersRepository.listCustomOrders();
            setCustomOrders(latest);
          } catch {
            // Keep confirmation cleanly even if admin reload fails
          }
        }
      } else {
        setCustomOrders(customOrdersRepository.loadCustomOrders());
      }
      return saved;
    },
    [adminSession?.isAuthenticated, customerSession]
  );

  const updateCustomOrder = useCallback(
    async (id: string, updates: CustomOrderUpdateInput) => {
      requireVerifiedAdminInSupabaseMode();
      const { request, requests, persisted } = await customOrdersRepository.updateCustomOrder(
        id,
        updates,
        customOrders
      );
      setCustomOrders(requests);
      return { request, persisted };
    },
    [customOrders, requireVerifiedAdminInSupabaseMode]
  );

  const submitContactInquiry = useCallback(
    async (payload: ContactInquiryPayload) => {
      const saved = await contactRepository.submitInquiry(payload);
      if (isSupabaseConfigured()) {
        if (adminSession?.isAuthenticated) {
          try {
            const latest = await contactRepository.listInquiries();
            setEnquiries(latest);
          } catch {
            // Ignore background refresh error
          }
        }
      } else {
        setEnquiries(contactRepository.loadInquiries());
      }
      return saved;
    },
    [adminSession?.isAuthenticated]
  );

  const updateEnquiry = useCallback(
    async (id: string, updates: EnquiryUpdateInput) => {
      requireVerifiedAdminInSupabaseMode();
      const { enquiry, enquiries: nextEnquiries, persisted } =
        await contactRepository.updateInquiry(id, updates, enquiries);
      setEnquiries(nextEnquiries);
      return { enquiry, persisted };
    },
    [enquiries, requireVerifiedAdminInSupabaseMode]
  );

  const updateWebsiteSettings = useCallback(
    async (next: WebsiteSettings) => {
      requireVerifiedAdminInSupabaseMode();
      const res = await settingsRepository.saveSettingsAsync(next);
      setWebsiteSettings(res.settings);
      return res;
    },
    [requireVerifiedAdminInSupabaseMode]
  );

  const resetWebsiteSettings = useCallback(async () => {
    requireVerifiedAdminInSupabaseMode();
    if (isSupabaseConfigured()) {
      const res = await settingsRepository.saveSettingsAsync({
        ...DEFAULT_WEBSITE_SETTINGS,
        updatedAt: new Date().toISOString(),
      });
      setWebsiteSettings(res.settings);
      return res;
    }
    const res = settingsRepository.resetSettings();
    setWebsiteSettings(res.settings);
    return res;
  }, [requireVerifiedAdminInSupabaseMode]);

  const adminLogin = useCallback(async (params: { email: string; passphrase: string }) => {
    const session = await adminAuthService.signIn(params);
    setAdminSession(session);
    if (isSupabaseConfigured()) {
      const syncedCustomer = await customerAuthService.restoreSession();
      setCustomerSession(syncedCustomer);
    }
    return session;
  }, []);

  const adminLogout = useCallback(async () => {
    await adminAuthService.signOut();
    setAdminSession(null);
    if (isSupabaseConfigured()) {
      setCustomerSession(null);
      setOrders([]);
      setCustomOrders([]);
      setEnquiries([]);
    }
  }, []);

  const customerLogin = useCallback(async (params: { email: string; password: string }) => {
    const session = await customerAuthService.signInCustomer(params);
    setCustomerSession(session);
    if (isSupabaseConfigured()) {
      const verifiedAdmin = await adminAuthService.restoreSupabaseAdminSession();
      setAdminSession(verifiedAdmin?.isAuthenticated ? verifiedAdmin : null);
    }
    return session;
  }, []);

  const customerRegister = useCallback(
    async (params: {
      fullName: string;
      email: string;
      password: string;
      confirmPassword?: string;
    }) => {
      const result = await customerAuthService.signUpCustomer(params);
      if (result.status === 'signed_in' && result.session) {
        setCustomerSession(result.session);
        setAdminSession(null);
      }
      return result;
    },
    []
  );

  const customerLogout = useCallback(async () => {
    await customerAuthService.signOut();
    setCustomerSession(null);
    if (isSupabaseConfigured()) {
      setAdminSession(null);
      setOrders([]);
      setCustomOrders([]);
      setEnquiries([]);
    }
  }, []);

  const resendCustomerConfirmation = useCallback(async (email: string) => {
    await customerAuthService.resendConfirmationEmail(email);
  }, []);

  const updateCustomerProfile = useCallback(
    async (params: { fullName: string; phone?: string }) => {
      const updated = await customerAuthService.updateProfile(customerSession, params);
      setCustomerSession(updated);
      return updated;
    },
    [customerSession]
  );

  const openCart = useCallback(() => setIsCartOpen(true), []);
  const closeCart = useCallback(() => setIsCartOpen(false), []);

  const addToCart = useCallback(
    ({
      product,
      selectedSize,
      selectedColor,
      quantity,
      openDrawer = true,
    }: {
      product: Product;
      selectedSize: string;
      selectedColor: string;
      quantity: number;
      openDrawer?: boolean;
    }) => {
      if (product.stockStatus === 'Out of Stock' || getMaxAllowedQuantity(product) <= 0) {
        showToast('This item is currently Out of Stock');
        return;
      }

      setCart((prev) => {
        const { nextCart } = addItemToCart(prev, {
          product,
          selectedSize,
          selectedColor,
          quantity,
        });
        return nextCart;
      });

      showToast(`Added ${product.name.split(' — ')[0]} to your bag`);
      if (openDrawer) {
        setIsCartOpen(true);
      }
    },
    [showToast]
  );

  const updateCartQuantity = useCallback(
    (cartItemId: string, quantity: number) => {
      setCart((prev) => updateItemQuantityInCart(prev, cartItemId, quantity, products));
    },
    [products]
  );

  const removeFromCart = useCallback(
    (cartItemId: string) => {
      setCart((prev) => removeItemFromCart(prev, cartItemId));
      showToast('Item removed from your bag');
    },
    [showToast]
  );

  const replaceCart = useCallback((nextCart: CartItem[]) => {
    setCart(nextCart);
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  const openWhatsAppModal = useCallback((title: string, message: string) => {
    setWhatsAppModal({ title, message });
  }, []);

  const closeWhatsAppModal = useCallback(() => {
    setWhatsAppModal(null);
  }, []);

  const { itemCount: cartCount, subtotalNgn: cartSubtotalNgn } = useMemo(
    () => calculateCartTotals(cart),
    [cart]
  );

  const value = useMemo<StoreContextValue>(
    () => ({
      route,
      adminSection,
      selectedProductId,
      shopCategoryFilter,
      isSupabaseMode,
      isCatalogLoading,
      catalogError,
      reloadCatalog,
      isAdminDataLoading,
      adminDataError,
      reloadAdminData,
      products,
      orders,
      customOrders,
      enquiries,
      websiteSettings,
      adminSession,
      customerSession,
      isAuthLoading,
      postAuthRedirect,
      setPostAuthRedirect,
      cart,
      cartCount,
      cartSubtotalNgn,
      isCartOpen,
      whatsAppModal,
      toastMessage,
      navigate,
      setAdminSection,
      setShopCategoryFilter,
      addProduct,
      updateProduct,
      deleteProduct,
      resetCatalogToSamples,
      submitOrderRequest,
      updateOrder,
      submitCustomOrder,
      updateCustomOrder,
      submitContactInquiry,
      updateEnquiry,
      updateWebsiteSettings,
      resetWebsiteSettings,
      adminLogin,
      adminLogout,
      customerLogin,
      customerRegister,
      customerLogout,
      resendCustomerConfirmation,
      updateCustomerProfile,
      openCart,
      closeCart,
      addToCart,
      updateCartQuantity,
      removeFromCart,
      replaceCart,
      clearCart,
      openWhatsAppModal,
      closeWhatsAppModal,
      showToast,
    }),
    [
      route,
      adminSection,
      selectedProductId,
      shopCategoryFilter,
      isSupabaseMode,
      isCatalogLoading,
      catalogError,
      reloadCatalog,
      isAdminDataLoading,
      adminDataError,
      reloadAdminData,
      products,
      orders,
      customOrders,
      enquiries,
      websiteSettings,
      adminSession,
      customerSession,
      isAuthLoading,
      postAuthRedirect,
      setPostAuthRedirect,
      cart,
      cartCount,
      cartSubtotalNgn,
      isCartOpen,
      whatsAppModal,
      toastMessage,
      navigate,
      setAdminSection,
      setShopCategoryFilter,
      addProduct,
      updateProduct,
      deleteProduct,
      resetCatalogToSamples,
      submitOrderRequest,
      updateOrder,
      submitCustomOrder,
      updateCustomOrder,
      submitContactInquiry,
      updateEnquiry,
      updateWebsiteSettings,
      resetWebsiteSettings,
      adminLogin,
      adminLogout,
      customerLogin,
      customerRegister,
      customerLogout,
      resendCustomerConfirmation,
      updateCustomerProfile,
      openCart,
      closeCart,
      addToCart,
      updateCartQuantity,
      removeFromCart,
      replaceCart,
      clearCart,
      openWhatsAppModal,
      closeWhatsAppModal,
      showToast,
    ]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) {
    throw new Error('useStore must be used inside StoreProvider');
  }
  return ctx;
}
