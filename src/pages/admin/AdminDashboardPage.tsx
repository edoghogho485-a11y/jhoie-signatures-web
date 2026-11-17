import {
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Database,
  Edit3,
  Eye,
  Info,
  Mail,
  Menu,
  MessageCircle,
  Package,
  PackageCheck,
  PackageX,
  Plus,
  RotateCcw,
  Save,
  Scissors,
  Search,
  ShoppingBag,
  Star,
  Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { AdminLoginGate } from '../../components/admin/AdminLoginGate';
import { ADMIN_NAV_ITEMS, AdminSidebar } from '../../components/admin/AdminSidebar';
import { CustomRequestDetailModal } from '../../components/admin/CustomRequestDetailModal';
import { DeleteProductConfirmModal } from '../../components/admin/DeleteProductConfirmModal';
import { EnquiryDetailModal } from '../../components/admin/EnquiryDetailModal';
import { OrderDetailModal } from '../../components/admin/OrderDetailModal';
import {
  getOrderStatusStyle,
  getPaymentStatusStyle,
} from '../../components/admin/orderStatusStyles';
import { ProductFormModal } from '../../components/admin/ProductFormModal';
import {
  getCustomRequestStatusStyle,
  getEnquiryStatusStyle,
} from '../../components/admin/requestStatusStyles';
import { BrandImage } from '../../components/BrandImage';
import { useStore } from '../../context/StoreContext';
import { SHOP_CATEGORIES } from '../../data/sampleCatalog';
import { getBackendReadinessStatus } from '../../services/adminAuthService';
import type {
  AdminSection,
  ContactInquiryPayload,
  CustomOrderPayload,
  CustomRequestStatus,
  EnquiryStatus,
  OrderRequestPayload,
  OrderStatus,
  PaymentStatus,
  Product,
  ProductCategory,
  StockStatus,
  WebsiteSettings,
} from '../../types/fashion';
import { filterAndSortProducts, type SortOption } from '../../utils/catalogHelpers';
import {
  buildAdminToCustomClientWhatsAppMessage,
  CUSTOM_REQUEST_STATUS_OPTIONS,
  type CustomRequestSortOption,
  filterAndSortCustomRequests,
  getNewCustomRequestsCount,
  isRenderableReferenceImage,
  normalizeCustomRequestStatus,
} from '../../utils/customRequestHelpers';
import {
  ENQUIRY_STATUS_OPTIONS,
  type EnquirySortOption,
  filterAndSortEnquiries,
  getUnreadEnquiriesCount,
  normalizeEnquiryStatus,
} from '../../utils/enquiryHelpers';
import { formatNaira } from '../../utils/formatters';
import {
  buildAdminToCustomerWhatsAppMessage,
  buildCustomerWhatsAppChatUrl,
  calculateOrderTotalNgn,
  filterAndSortOrders,
  formatOrderDate,
  getOrderSummaryMetrics,
  getOrderTotalQuantity,
  normalizeOrderStatus,
  normalizePaymentStatus,
  ORDER_STATUS_OPTIONS,
  type OrderSortOption,
  PAYMENT_STATUS_OPTIONS,
} from '../../utils/orderHelpers';
import { normalizeProductFormInput, VALID_STOCK_STATUSES } from '../../utils/productValidation';
import {
  validateWebsiteSettings,
  type WebsiteSettingsErrors,
} from '../../utils/settingsValidation';

function getAvailabilityToneClass(status: StockStatus): string {
  switch (status) {
    case 'Out of Stock':
      return 'text-red-700 border-red-200 bg-red-50';
    case 'Low Stock':
      return 'text-amber-800 border-amber-200 bg-amber-50';
    case 'Made to Order':
      return 'text-[#8C6E32] border-[#C6A45C]/40 bg-[#F6F1E8]';
    case 'In Stock':
    default:
      return 'text-emerald-800 border-emerald-200 bg-emerald-50';
  }
}

export function AdminDashboardPage() {
  const {
    adminSection,
    setAdminSection,
    navigate,
    showToast,
    isSupabaseMode,
    isAuthLoading,
    isAdminDataLoading,
    adminDataError,
    reloadAdminData,
    products,
    orders,
    customOrders,
    enquiries,
    websiteSettings,
    adminSession,
    adminLogout,
    addProduct,
    updateProduct,
    deleteProduct,
    resetCatalogToSamples,
    updateOrder,
    updateCustomOrder,
    updateEnquiry,
    updateWebsiteSettings,
    resetWebsiteSettings,
  } = useStore();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Overview recent orders filter states
  const [recentOrdersSearch, setRecentOrdersSearch] = useState('');
  const [recentOrdersFilter, setRecentOrdersFilter] = useState<
    'all' | 'pending' | 'confirmed' | 'completed'
  >('all');

  // Product management states
  const [productSearch, setProductSearch] = useState('');
  const [productCategoryFilter, setProductCategoryFilter] = useState<ProductCategory | 'All'>('All');
  const [productAvailabilityFilter, setProductAvailabilityFilter] = useState<StockStatus | 'All'>(
    'All'
  );
  const [productSortBy, setProductSortBy] = useState<SortOption>('newest');

  // Product modal states
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [isDeletingProduct, setIsDeletingProduct] = useState(false);
  const [deleteProductError, setDeleteProductError] = useState<string | null>(null);

  // Order management filter & modal states
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<OrderStatus | 'All'>('All');
  const [orderPaymentFilter, setOrderPaymentFilter] = useState<PaymentStatus | 'All'>('All');
  const [orderSortBy, setOrderSortBy] = useState<OrderSortOption>('newest');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // Custom request management states
  const [customSearch, setCustomSearch] = useState('');
  const [customStatusFilter, setCustomStatusFilter] = useState<CustomRequestStatus | 'All'>('All');
  const [customSortBy, setCustomSortBy] = useState<CustomRequestSortOption>('newest');
  const [selectedCustomRequestId, setSelectedCustomRequestId] = useState<string | null>(null);

  // Customer enquiries management states
  const [enquirySearch, setEnquirySearch] = useState('');
  const [enquiryStatusFilter, setEnquiryStatusFilter] = useState<EnquiryStatus | 'All'>('All');
  const [enquirySortBy, setEnquirySortBy] = useState<EnquirySortOption>('newest');
  const [selectedEnquiryId, setSelectedEnquiryId] = useState<string | null>(null);

  // Website settings form states
  const [settingsForm, setSettingsForm] = useState<WebsiteSettings>(websiteSettings);
  const [settingsErrors, setSettingsErrors] = useState<WebsiteSettingsErrors>({});
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  useEffect(() => {
    setSettingsForm(websiteSettings);
  }, [websiteSettings]);

  const backendReadiness = useMemo(() => getBackendReadinessStatus(), []);

  const activeNavItem =
    ADMIN_NAV_ITEMS.find((item) => item.id === adminSection) || ADMIN_NAV_ITEMS[0];

  const totalProductsCount = products.length;
  const availableProductsCount = useMemo(
    () => products.filter((p) => p.stockStatus !== 'Out of Stock').length,
    [products]
  );
  const outOfStockProductsCount = useMemo(
    () => products.filter((p) => p.stockStatus === 'Out of Stock').length,
    [products]
  );

  const orderMetrics = useMemo(() => getOrderSummaryMetrics(orders), [orders]);
  const newCustomRequestsCount = useMemo(
    () => getNewCustomRequestsCount(customOrders),
    [customOrders]
  );
  const unreadEnquiriesCount = useMemo(() => getUnreadEnquiriesCount(enquiries), [enquiries]);

  const overviewMetricCards = useMemo(
    () => [
      {
        id: 'total-products',
        label: 'Total Products',
        value: String(totalProductsCount),
        note: 'Shared studio catalogue',
        icon: Package,
        target: 'products' as AdminSection,
      },
      {
        id: 'available-products',
        label: 'Available Products',
        value: String(availableProductsCount),
        note: 'In stock, low stock, or made-to-order',
        icon: PackageCheck,
        target: 'products' as AdminSection,
      },
      {
        id: 'out-of-stock',
        label: 'Out-of-Stock Products',
        value: String(outOfStockProductsCount),
        note: 'Requires restock',
        icon: PackageX,
        target: 'products' as AdminSection,
      },
      {
        id: 'total-orders',
        label: 'Total Orders',
        value: String(orderMetrics.totalOrders),
        note: 'Storefront checkout orders',
        icon: ShoppingBag,
        target: 'orders' as AdminSection,
      },
      {
        id: 'pending-orders',
        label: 'Pending Orders',
        value: String(orderMetrics.pendingOrders),
        note: 'New, pending & active fulfilment',
        icon: Clock,
        target: 'orders' as AdminSection,
      },
      {
        id: 'completed-orders',
        label: 'Completed Orders',
        value: String(orderMetrics.completedOrders),
        note: 'Fulfilled & delivered',
        icon: CheckCircle2,
        target: 'orders' as AdminSection,
      },
      {
        id: 'new-custom-requests',
        label: 'New Custom Requests',
        value: String(newCustomRequestsCount),
        note: `${customOrders.length} total custom brief${customOrders.length === 1 ? '' : 's'}`,
        icon: Scissors,
        target: 'custom-requests' as AdminSection,
      },
      {
        id: 'unread-enquiries',
        label: 'Unread Enquiries',
        value: String(unreadEnquiriesCount),
        note: `${enquiries.length} total contact message${enquiries.length === 1 ? '' : 's'}`,
        icon: Mail,
        target: 'enquiries' as AdminSection,
      },
    ],
    [
      availableProductsCount,
      customOrders.length,
      enquiries.length,
      newCustomRequestsCount,
      orderMetrics,
      outOfStockProductsCount,
      totalProductsCount,
      unreadEnquiriesCount,
    ]
  );

  const filteredProducts = useMemo(
    () =>
      filterAndSortProducts({
        products,
        category: productCategoryFilter,
        stockStatus: productAvailabilityFilter,
        searchQuery: productSearch,
        sortBy: productSortBy,
      }),
    [products, productAvailabilityFilter, productCategoryFilter, productSearch, productSortBy]
  );

  const filteredOrders = useMemo(
    () =>
      filterAndSortOrders({
        orders,
        searchQuery: orderSearch,
        orderStatus: orderStatusFilter,
        paymentStatus: orderPaymentFilter,
        sortBy: orderSortBy,
      }),
    [orderPaymentFilter, orderSearch, orderSortBy, orderStatusFilter, orders]
  );

  const recentOrders = useMemo(() => {
    const searched = filterAndSortOrders({
      orders,
      searchQuery: recentOrdersSearch,
      sortBy: 'newest',
    });

    const matched = searched.filter((order) => {
      const status = normalizeOrderStatus(order.status);
      if (recentOrdersFilter === 'all') return true;
      if (recentOrdersFilter === 'pending') return status === 'New' || status === 'Pending';
      if (recentOrdersFilter === 'confirmed') {
        return status === 'Confirmed' || status === 'Processing' || status === 'Ready';
      }
      return status === 'Completed';
    });

    return matched.slice(0, 8);
  }, [orders, recentOrdersFilter, recentOrdersSearch]);

  const selectedOrder = useMemo<OrderRequestPayload | null>(() => {
    if (!selectedOrderId) return null;
    return (
      orders.find((o) => o.id === selectedOrderId || o.referenceCode === selectedOrderId) || null
    );
  }, [orders, selectedOrderId]);

  const filteredCustomRequests = useMemo(
    () =>
      filterAndSortCustomRequests({
        requests: customOrders,
        searchQuery: customSearch,
        status: customStatusFilter,
        sortBy: customSortBy,
      }),
    [customOrders, customSearch, customSortBy, customStatusFilter]
  );

  const filteredEnquiries = useMemo(
    () =>
      filterAndSortEnquiries({
        enquiries,
        searchQuery: enquirySearch,
        status: enquiryStatusFilter,
        sortBy: enquirySortBy,
      }),
    [enquiries, enquirySearch, enquirySortBy, enquiryStatusFilter]
  );

  const selectedCustomRequest = useMemo<CustomOrderPayload | null>(() => {
    if (!selectedCustomRequestId) return null;
    return (
      customOrders.find(
        (r) => r.id === selectedCustomRequestId || r.referenceCode === selectedCustomRequestId
      ) || null
    );
  }, [customOrders, selectedCustomRequestId]);

  const selectedEnquiry = useMemo<ContactInquiryPayload | null>(() => {
    if (!selectedEnquiryId) return null;
    return enquiries.find((e) => e.id === selectedEnquiryId) || null;
  }, [enquiries, selectedEnquiryId]);

  const hasActiveProductFilters =
    productSearch.trim().length > 0 ||
    productCategoryFilter !== 'All' ||
    productAvailabilityFilter !== 'All' ||
    productSortBy !== 'newest';

  const hasActiveOrderFilters =
    orderSearch.trim().length > 0 ||
    orderStatusFilter !== 'All' ||
    orderPaymentFilter !== 'All' ||
    orderSortBy !== 'newest';

  const hasActiveCustomFilters =
    customSearch.trim().length > 0 ||
    customStatusFilter !== 'All' ||
    customSortBy !== 'newest';

  const hasActiveEnquiryFilters =
    enquirySearch.trim().length > 0 ||
    enquiryStatusFilter !== 'All' ||
    enquirySortBy !== 'newest';

  const clearProductFilters = () => {
    setProductSearch('');
    setProductCategoryFilter('All');
    setProductAvailabilityFilter('All');
    setProductSortBy('newest');
  };

  const clearOrderFilters = () => {
    setOrderSearch('');
    setOrderStatusFilter('All');
    setOrderPaymentFilter('All');
    setOrderSortBy('newest');
  };

  const clearCustomFilters = () => {
    setCustomSearch('');
    setCustomStatusFilter('All');
    setCustomSortBy('newest');
  };

  const clearEnquiryFilters = () => {
    setEnquirySearch('');
    setEnquiryStatusFilter('All');
    setEnquirySortBy('newest');
  };

  const handleSaveOrderUpdates = async (
    orderId: string,
    updates: {
      status: OrderStatus;
      paymentStatus: PaymentStatus;
      deliveryFeeNgn: number;
      internalNotes: string;
    }
  ) => {
    const { order, persisted } = await updateOrder(orderId, updates);
    showToast(
      persisted
        ? `Saved updates for order ${order.referenceCode || orderId}`
        : `Updated order ${order.referenceCode || orderId} in session`
    );
  };

  const handleSaveCustomRequestUpdates = async (
    requestId: string,
    updates: {
      status: CustomRequestStatus;
      internalNotes: string;
    }
  ) => {
    const { request, persisted } = await updateCustomOrder(requestId, updates);
    showToast(
      persisted
        ? `Updated custom request ${request.referenceCode || requestId}`
        : `Updated custom request ${request.referenceCode || requestId} in session`
    );
  };

  const handleOpenEnquiry = async (enquiry: ContactInquiryPayload) => {
    const id = enquiry.id || '';
    setSelectedEnquiryId(id);
    if (normalizeEnquiryStatus(enquiry.status) === 'Unread' && id) {
      try {
        await updateEnquiry(id, { status: 'Read' });
      } catch {
        // Keep modal open even if status update fails transiently
      }
    }
  };

  const handleSaveEnquiryUpdates = async (
    enquiryId: string,
    updates: {
      status: EnquiryStatus;
      internalNotes: string;
    }
  ) => {
    const { persisted } = await updateEnquiry(enquiryId, updates);
    showToast(
      persisted
        ? `Enquiry marked as ${updates.status}`
        : `Updated enquiry in session (${updates.status})`
    );
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateWebsiteSettings(settingsForm);
    if (!validation.isValid) {
      setSettingsErrors(validation.errors);
      showToast(validation.firstErrorMessage || 'Please review highlighted settings fields');
      return;
    }

    setSettingsErrors({});
    setIsSavingSettings(true);
    try {
      const { persisted } = await updateWebsiteSettings(settingsForm);
      showToast(
        persisted
          ? 'Website settings saved and applied across the storefront'
          : 'Settings applied for this session'
      );
    } catch (err) {
      showToast(
        err instanceof Error && err.message
          ? err.message
          : 'Unable to save website settings right now'
      );
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleResetSettings = async () => {
    setIsSavingSettings(true);
    try {
      const { settings } = await resetWebsiteSettings();
      setSettingsForm(settings);
      setSettingsErrors({});
      showToast('Restored default JHOIE SIGNATURES website settings');
    } catch (err) {
      showToast(
        err instanceof Error && err.message
          ? err.message
          : 'Unable to reset website settings right now'
      );
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleLogout = async () => {
    setMobileMenuOpen(false);
    await adminLogout();
    showToast('Signed out of Admin Studio');
  };

  const handleOpenAddProduct = () => {
    setEditingProduct(null);
    setIsProductModalOpen(true);
  };

  const handleOpenEditProduct = (product: Product) => {
    setEditingProduct(product);
    setIsProductModalOpen(true);
  };

  const handleSubmitProductForm = async (
    normalized: ReturnType<typeof normalizeProductFormInput>,
    editingId: string | null
  ) => {
    if (editingId) {
      const { persisted } = await updateProduct(editingId, {
        ...normalized,
        isSample: editingProduct?.isSample ?? false,
      });
      setIsProductModalOpen(false);
      setEditingProduct(null);
      showToast(
        persisted
          ? 'Product updated and synced with Shop'
          : 'Product updated in session (browser storage quota exceeded for large images)'
      );
      return;
    }

    const { persisted } = await addProduct({
      ...normalized,
      isSample: false,
    });
    setIsProductModalOpen(false);
    setEditingProduct(null);
    showToast(
      persisted
        ? 'New product added and published to Shop'
        : 'Product added for this session (browser storage quota exceeded for large images)'
    );
  };

  const handleConfirmDeleteProduct = async (product: Product) => {
    setIsDeletingProduct(true);
    setDeleteProductError(null);
    try {
      await deleteProduct(product.id);
      setDeletingProduct(null);
      showToast(`Deleted "${product.name}" from catalogue`);
    } catch (err) {
      setDeleteProductError(
        err instanceof Error && err.message
          ? err.message
          : 'Unable to delete this product right now.'
      );
    } finally {
      setIsDeletingProduct(false);
    }
  };

  const handleResetSampleCatalog = () => {
    if (isSupabaseMode) return;
    resetCatalogToSamples();
    clearProductFilters();
    showToast('Restored initial sample catalogue');
  };

  const renderOverview = () => (
    <div className="space-y-8">
      {/* Welcoming Dashboard Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-[#171717]/10">
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-[#A68642] tracking-[0.16em] uppercase">
            Studio Management Console
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-medium text-[#171717]">
            Welcome back to {websiteSettings.brandName}
          </h1>
          <p className="text-sm text-[#171717]/70 max-w-2xl">
            Manage ready-to-wear outfits, customer orders, custom tailoring briefs, enquiries, and
            storefront settings from one workspace.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setAdminSection('products')}
          className="self-start sm:self-auto px-4 py-2.5 bg-[#171717] text-white text-xs font-medium hover:bg-[#2a2a2a] transition-colors inline-flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
        >
          <Plus className="w-3.5 h-3.5 text-[#C6A45C]" aria-hidden="true" />
          <span>Manage Products</span>
        </button>
      </div>

      {/* Backend Mode Notice */}
      <div className="p-4 bg-[#F6F1E8] border border-[#C6A45C]/40 flex items-start gap-3 text-xs sm:text-sm text-[#171717]/80">
        <Info className="w-4 h-4 text-[#A68642] shrink-0 mt-0.5" aria-hidden="true" />
        <p>
          {isSupabaseMode ? (
            <>
              <strong>Live Supabase Backend Active:</strong> Metrics, catalogue items, customer
              orders, bespoke requests, enquiries, and settings below sync directly with your
              Supabase PostgreSQL database, Authentication, and Storage buckets.
            </>
          ) : (
            <>
              <strong>Shared Local Preview Mode:</strong> All dashboard numbers reflect live shared
              catalog items, customer checkout orders, custom outfit requests, and contact enquiries
              stored in your browser (<code className="font-mono">localStorage</code>) until Supabase
              Database, Auth, and Storage are connected.
            </>
          )}
        </p>
      </div>

      {/* 8 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5">
        {overviewMetricCards.map((card) => {
          const IconComponent = card.icon;
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => setAdminSection(card.target)}
              className="bg-white border border-[#171717]/10 p-5 flex items-start justify-between gap-4 text-left hover:border-[#C6A45C] transition-colors cursor-pointer"
            >
              <div className="space-y-1.5 min-w-0">
                <p className="text-xs font-medium text-[#171717]/65 truncate">{card.label}</p>
                <p className="font-display text-3xl sm:text-4xl font-semibold text-[#171717] tabular-nums">
                  {card.value}
                </p>
                <p className="text-[11px] text-[#171717]/55">{card.note}</p>
              </div>
              <div className="w-10 h-10 bg-[#FAF7F2] border border-[#171717]/10 flex items-center justify-center shrink-0">
                <IconComponent className="w-4 h-4 text-[#A68642]" aria-hidden="true" />
              </div>
            </button>
          );
        })}
      </div>

      {/* Recent Orders Table */}
      <div className="bg-white border border-[#171717]/10">
        <div className="px-5 sm:px-6 py-4 border-b border-[#171717]/10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-medium text-[#171717]">Recent Orders</h2>
            <p className="text-xs text-[#171717]/60 mt-0.5">
              Latest ready-to-wear order requests submitted through the storefront checkout
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative">
              <Search
                className="w-3.5 h-3.5 text-[#171717]/45 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="search"
                value={recentOrdersSearch}
                onChange={(e) => setRecentOrdersSearch(e.target.value)}
                placeholder="Search order ref or client..."
                aria-label="Search recent orders"
                className="w-full sm:w-52 pl-8 pr-3 py-2 text-xs border border-[#171717]/15 bg-white focus:border-[#C6A45C] focus:outline-none"
              />
            </div>

            <div
              role="group"
              aria-label="Filter recent orders by status"
              className="inline-flex bg-[#F6F1E8] p-0.5 self-start sm:self-auto"
            >
              {(['all', 'pending', 'confirmed', 'completed'] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setRecentOrdersFilter(status)}
                  className={`px-3 py-1.5 text-xs font-medium capitalize transition-colors cursor-pointer whitespace-nowrap ${
                    recentOrdersFilter === status
                      ? 'bg-[#171717] text-white'
                      : 'text-[#171717]/75 hover:text-[#171717]'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#171717]/10 bg-[#FAF7F2] text-[11px] font-semibold uppercase tracking-wider text-[#171717]/65">
                <th className="py-3 px-5">Order Ref</th>
                <th className="py-3 px-5">Customer</th>
                <th className="py-3 px-5">Items</th>
                <th className="py-3 px-5 text-right">Total (₦)</th>
                <th className="py-3 px-5">Status</th>
                <th className="py-3 px-5 text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#171717]/10 text-sm">
              {recentOrders.length > 0 ? (
                recentOrders.map((order) => {
                  const status = normalizeOrderStatus(order.status);
                  const style = getOrderStatusStyle(status);
                  const totalQty = getOrderTotalQuantity(order);
                  const totalNgn = calculateOrderTotalNgn(order);

                  return (
                    <tr
                      key={order.id || order.referenceCode}
                      onClick={() => setSelectedOrderId(order.id || order.referenceCode || null)}
                      className="hover:bg-[#FAF7F2]/70 transition-colors cursor-pointer"
                    >
                      <td className="py-3.5 px-5 font-medium text-[#171717] whitespace-nowrap">
                        {order.referenceCode || order.id}
                      </td>
                      <td className="py-3.5 px-5">
                        <p className="font-medium text-[#171717]">{order.customerName}</p>
                        <p className="text-xs text-[#171717]/60 tabular-nums">{order.phoneNumber}</p>
                      </td>
                      <td className="py-3.5 px-5 text-xs text-[#171717]/80">
                        <span className="tabular-nums font-medium">{totalQty}</span> item
                        {totalQty === 1 ? '' : 's'} · {order.items[0]?.name || 'Order items'}
                        {order.items.length > 1 ? ` +${order.items.length - 1} more` : ''}
                      </td>
                      <td className="py-3.5 px-5 text-right font-semibold text-[#171717] tabular-nums whitespace-nowrap">
                        {formatNaira(totalNgn)}
                      </td>
                      <td className="py-3.5 px-5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium border ${style.badgeClass}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${style.dotClass}`}
                            aria-hidden="true"
                          />
                          <span>{status}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-right text-xs text-[#171717]/65 whitespace-nowrap">
                        {formatOrderDate(order.createdAt)}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 px-6 text-center">
                    <div className="max-w-md mx-auto space-y-2.5">
                      <p className="font-display text-xl font-medium text-[#171717]">
                        {orders.length === 0
                          ? 'No customer orders placed yet'
                          : `No recent orders match "${recentOrdersFilter}"`}
                      </p>
                      <p className="text-xs text-[#171717]/65 leading-relaxed">
                        {orders.length === 0
                          ? 'Orders originate from the website Shopping Bag and Checkout flow. Once a customer submits an order request, it will appear here immediately.'
                          : 'Try adjusting your recent order search or switching status filter.'}
                      </p>
                      {orders.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setAdminSection('orders')}
                          className="px-4 py-2 border border-[#171717]/20 bg-white text-xs font-medium text-[#171717] hover:border-[#171717] cursor-pointer"
                        >
                          View All Orders
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Architecture & Backend Readiness Card */}
      <div className="bg-white border border-[#171717]/10 p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#171717]/10">
          <div className="flex items-center gap-2.5">
            <Database className="w-4 h-4 text-[#A68642]" aria-hidden="true" />
            <h2 className="font-display text-xl font-medium text-[#171717]">
              Backend &amp; Supabase Readiness
            </h2>
          </div>
          <span className="px-2.5 py-0.5 text-[11px] font-medium border border-[#C6A45C]/50 bg-[#F6F1E8] text-[#171717]">
            {backendReadiness.supabaseConfigured
              ? 'Supabase Connected (Postgres, Auth & Storage)'
              : 'Local Preview Storage Active'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-3.5 bg-[#FAF7F2] border border-[#171717]/10 space-y-1">
            <p className="font-semibold text-[#171717]">Database Persistence</p>
            <p className="text-[#171717]/70">
              {backendReadiness.supabaseConfigured ? (
                <>
                  Connected to Supabase PostgreSQL via{' '}
                  <code className="font-mono">storeRepository.ts</code> with strict Row-Level
                  Security.
                </>
              ) : (
                <>
                  Currently stored locally in browser <code className="font-mono">localStorage</code>{' '}
                  via <code className="font-mono">storeRepository.ts</code>.
                </>
              )}
            </p>
          </div>
          <div className="p-3.5 bg-[#FAF7F2] border border-[#171717]/10 space-y-1">
            <p className="font-semibold text-[#171717]">Admin Authentication</p>
            <p className="text-[#171717]/70">
              {backendReadiness.supabaseConfigured ? (
                <>
                  Verified via Supabase Auth &amp; <code className="font-mono">profiles.role</code>{' '}
                  (<code className="font-mono">{adminSession?.role || 'admin'}</code>).
                </>
              ) : (
                <>
                  Client session preview via <code className="font-mono">sessionStorage</code>; server
                  RLS enforcement activates with Supabase Auth.
                </>
              )}
            </p>
          </div>
          <div className="p-3.5 bg-[#FAF7F2] border border-[#171717]/10 space-y-1">
            <p className="font-semibold text-[#171717]">Image File Storage</p>
            <p className="text-[#171717]/70">
              {backendReadiness.supabaseConfigured ? (
                <>
                  Product photos upload to <code className="font-mono">product-images</code>;
                  bespoke references upload to private{' '}
                  <code className="font-mono">custom-references</code>.
                </>
              ) : (
                <>
                  Product and custom reference photos compress locally; cloud buckets require
                  Supabase Storage.
                </>
              )}
            </p>
          </div>
        </div>

        {backendReadiness.missingRequirements.length > 0 && (
          <ul className="space-y-1 text-xs text-[#171717]/70 pt-1">
            {backendReadiness.missingRequirements.map((req) => (
              <li key={req}>• Pending integration: {req}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );

  const renderProductsSection = () => (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-5 border-b border-[#171717]/10">
        <div>
          <h1 className="font-display text-3xl font-medium text-[#171717]">Products</h1>
          <p className="text-sm text-[#171717]/65 mt-1">
            Add, edit, price (₦), and manage stock availability for ready-to-wear outfits.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          {!isSupabaseMode && (
            <button
              type="button"
              onClick={handleResetSampleCatalog}
              className="px-3.5 py-2.5 border border-[#171717]/20 bg-white text-xs font-medium text-[#171717] hover:border-[#171717] inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#A68642]" aria-hidden="true" />
              <span>Reset Sample Catalogue</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleOpenAddProduct}
            className="px-4 py-2.5 bg-[#171717] text-white text-xs font-medium hover:bg-[#2a2a2a] inline-flex items-center gap-2 cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5 text-[#C6A45C]" aria-hidden="true" />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* Storage Persistence Notice */}
      <div className="p-3.5 bg-[#F6F1E8] border border-[#C6A45C]/40 flex items-start gap-2.5 text-xs text-[#171717]/80">
        <Info className="w-4 h-4 text-[#A68642] shrink-0 mt-0.5" aria-hidden="true" />
        <p>
          {isSupabaseMode ? (
            <>
              <strong>Live Supabase Catalogue:</strong> Additions, edits, and deletions sync directly
              with your Supabase <code className="font-mono">products</code> table and{' '}
              <code className="font-mono">product-images</code> Storage bucket, updating the
              customer Shop immediately.
            </>
          ) : (
            <>
              <strong>Shared Local Catalogue:</strong> Additions, edits, and deletions update the
              customer-facing Shop and Product Details pages right away. Data and uploaded photos are
              temporarily saved in your browser (<code className="font-mono">localStorage</code>)
              until Supabase Database and Storage are integrated.
            </>
          )}
        </p>
      </div>

      {/* Filters, Search, Sorting & Product List Container */}
      <div className="bg-white border border-[#171717]/10">
        {/* Search & Select Controls */}
        <div className="p-4 sm:p-5 border-b border-[#171717]/10 space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search
                className="w-4 h-4 text-[#171717]/45 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="search"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Search products by name..."
                aria-label="Search admin products"
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm border border-[#171717]/15 bg-white focus:border-[#C6A45C] focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <select
                value={productAvailabilityFilter}
                onChange={(e) =>
                  setProductAvailabilityFilter(e.target.value as StockStatus | 'All')
                }
                aria-label="Filter products by availability"
                className="px-3 py-2 text-xs border border-[#171717]/15 bg-white focus:border-[#C6A45C] focus:outline-none cursor-pointer"
              >
                <option value="All">All Availability</option>
                {VALID_STOCK_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>

              <select
                value={productSortBy}
                onChange={(e) => setProductSortBy(e.target.value as SortOption)}
                aria-label="Sort products"
                className="px-3 py-2 text-xs border border-[#171717]/15 bg-white focus:border-[#C6A45C] focus:outline-none cursor-pointer"
              >
                <option value="newest">Sort: Date Added (Newest)</option>
                <option value="oldest">Sort: Date Added (Oldest)</option>
                <option value="price-asc">Sort: Price (Low to High)</option>
                <option value="price-desc">Sort: Price (High to Low)</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1.5">
              {(['All', ...SHOP_CATEGORIES] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setProductCategoryFilter(cat)}
                  className={`px-3 py-1.5 text-xs font-medium cursor-pointer transition-colors ${
                    productCategoryFilter === cat
                      ? 'bg-[#171717] text-white'
                      : 'bg-[#F6F1E8] text-[#171717]/75 hover:text-[#171717]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <p className="text-xs text-[#171717]/60 tabular-nums">
              Showing {filteredProducts.length} of {products.length} products
            </p>
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#171717]/10 bg-[#FAF7F2] text-[11px] font-semibold uppercase tracking-wider text-[#171717]/65">
                <th className="py-3 px-4">Product</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-right">Price (₦)</th>
                <th className="py-3 px-4">Sizes</th>
                <th className="py-3 px-4 text-right">Stock</th>
                <th className="py-3 px-4">Availability</th>
                <th className="py-3 px-4">Featured</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#171717]/10 text-sm">
              {filteredProducts.length > 0 ? (
                filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-[#FAF7F2]/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3 min-w-[220px]">
                        <div className="w-12 h-14 bg-[#F6F1E8] border border-[#171717]/10 shrink-0 overflow-hidden">
                          <BrandImage
                            src={product.images[0] || ''}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-[#171717] line-clamp-1">{product.name}</p>
                          <p className="text-xs text-[#171717]/55 mt-0.5">
                            {product.images.length} photo{product.images.length === 1 ? '' : 's'}
                            {product.isNewArrival ? ' · New Arrival' : ''}
                            {product.isSample ? ' · Sample' : ''}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-[#171717]/80 whitespace-nowrap">
                      {product.category}
                    </td>
                    <td className="py-3.5 px-4 text-right font-medium text-[#171717] tabular-nums whitespace-nowrap">
                      {formatNaira(product.priceNgn)}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-[#171717]/75 max-w-[160px]">
                      {product.sizes.join(', ')}
                    </td>
                    <td className="py-3.5 px-4 text-right text-xs font-medium text-[#171717] tabular-nums">
                      {product.stockQuantity}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`inline-block px-2 py-0.5 text-[11px] font-medium border ${getAvailabilityToneClass(
                          product.stockStatus
                        )}`}
                      >
                        {product.stockStatus}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap text-xs">
                      {product.isFeatured ? (
                        <span className="inline-flex items-center gap-1 font-medium text-[#8C6E32]">
                          <Star className="w-3.5 h-3.5 fill-[#C6A45C] text-[#C6A45C]" aria-hidden="true" />
                          Featured
                        </span>
                      ) : (
                        <span className="text-[#171717]/45">Standard</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenEditProduct(product)}
                          className="px-2.5 py-1.5 border border-[#171717]/20 bg-white text-xs font-medium text-[#171717] hover:border-[#171717] inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Edit3 className="w-3 h-3" aria-hidden="true" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDeleteProductError(null);
                            setDeletingProduct(product);
                          }}
                          className="px-2.5 py-1.5 border border-red-200 bg-white text-xs font-medium text-red-700 hover:bg-red-50 inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" aria-hidden="true" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-14 px-6 text-center">
                    <div className="max-w-md mx-auto space-y-3">
                      <p className="font-display text-xl font-medium text-[#171717]">
                        {products.length === 0
                          ? 'Your catalogue has no products yet'
                          : 'No products match the current search or filters'}
                      </p>
                      <p className="text-xs text-[#171717]/65 leading-relaxed">
                        {products.length === 0
                          ? 'Add your first ready-to-wear outfit or restore the sample catalogue to preview the Shop.'
                          : 'Try clearing your search or switching category and availability filters.'}
                      </p>
                      <div className="flex justify-center gap-2 pt-1">
                        {hasActiveProductFilters && (
                          <button
                            type="button"
                            onClick={clearProductFilters}
                            className="px-4 py-2 border border-[#171717]/20 bg-white text-xs font-medium text-[#171717] hover:border-[#171717] cursor-pointer"
                          >
                            Clear Filters
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={handleOpenAddProduct}
                          className="px-4 py-2 bg-[#171717] text-white text-xs font-medium hover:bg-[#2a2a2a] cursor-pointer"
                        >
                          Add Product
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-[#171717]/10">
          {filteredProducts.length > 0 ? (
            filteredProducts.map((product) => (
              <div key={product.id} className="p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-16 h-20 bg-[#F6F1E8] border border-[#171717]/10 shrink-0 overflow-hidden">
                    <BrandImage
                      src={product.images[0] || ''}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-sm font-medium text-[#171717]">{product.name}</p>
                    <p className="text-xs text-[#171717]/60">{product.category}</p>
                    <p className="text-sm font-semibold text-[#171717] tabular-nums">
                      {formatNaira(product.priceNgn)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs bg-[#FAF7F2] p-3 border border-[#171717]/10">
                  <div>
                    <span className="text-[#171717]/55 block">Sizes</span>
                    <span className="text-[#171717] font-medium">{product.sizes.join(', ')}</span>
                  </div>
                  <div>
                    <span className="text-[#171717]/55 block">Stock Qty</span>
                    <span className="text-[#171717] font-medium tabular-nums">
                      {product.stockQuantity}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#171717]/55 block">Availability</span>
                    <span className="text-[#171717] font-medium">{product.stockStatus}</span>
                  </div>
                  <div>
                    <span className="text-[#171717]/55 block">Featured</span>
                    <span className="text-[#171717] font-medium">
                      {product.isFeatured ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenEditProduct(product)}
                    className="px-3 py-1.5 border border-[#171717]/20 bg-white text-xs font-medium text-[#171717] inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteProductError(null);
                      setDeletingProduct(product);
                    }}
                    className="px-3 py-1.5 border border-red-200 bg-white text-xs font-medium text-red-700 inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="py-12 px-4 text-center space-y-3">
              <p className="font-display text-xl font-medium text-[#171717]">
                {products.length === 0
                  ? 'Your catalogue has no products yet'
                  : 'No products match your filters'}
              </p>
              {hasActiveProductFilters && (
                <button
                  type="button"
                  onClick={clearProductFilters}
                  className="px-4 py-2 border border-[#171717]/20 bg-white text-xs font-medium text-[#171717] cursor-pointer"
                >
                  Clear Filters
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      <ProductFormModal
        isOpen={isProductModalOpen}
        editingProduct={editingProduct}
        onClose={() => {
          setIsProductModalOpen(false);
          setEditingProduct(null);
        }}
        onSubmit={handleSubmitProductForm}
      />

      {/* Delete Confirmation Modal */}
      <DeleteProductConfirmModal
        product={deletingProduct}
        isDeleting={isDeletingProduct}
        errorMessage={deleteProductError}
        onCancel={() => {
          setDeleteProductError(null);
          setDeletingProduct(null);
        }}
        onConfirm={handleConfirmDeleteProduct}
      />
    </div>
  );

  const renderOrdersSection = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-5 border-b border-[#171717]/10">
        <div>
          <h1 className="font-display text-3xl font-medium text-[#171717]">Orders</h1>
          <p className="text-sm text-[#171717]/65 mt-1">
            Review storefront customer orders, update fulfilment and payment statuses, and contact
            customers on WhatsApp.
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs text-[#171717]/70 tabular-nums">
          <span>
            Total: <strong className="text-[#171717]">{orderMetrics.totalOrders}</strong>
          </span>
          <span>
            Active: <strong className="text-[#171717]">{orderMetrics.pendingOrders}</strong>
          </span>
          <span>
            Completed: <strong className="text-[#171717]">{orderMetrics.completedOrders}</strong>
          </span>
        </div>
      </div>

      {/* Data & Storefront Connection Notice */}
      <div className="p-3.5 bg-[#F6F1E8] border border-[#C6A45C]/40 flex items-start gap-2.5 text-xs text-[#171717]/80">
        <Info className="w-4 h-4 text-[#A68642] shrink-0 mt-0.5" aria-hidden="true" />
        <p>
          {isSupabaseMode ? (
            <>
              <strong>Live Supabase Orders:</strong> Orders shown here come from server-verified
              Checkout submissions stored in Supabase PostgreSQL. New orders default to{' '}
              <strong>New</strong> / <strong>Unpaid</strong> and payment statuses are confirmed
              manually by you.
            </>
          ) : (
            <>
              <strong>Checkout-Connected Temporary Storage:</strong> Orders shown here come directly
              from customer submissions on the website Checkout page and are temporarily stored in
              your browser (<code className="font-mono">localStorage</code>) until Supabase is
              connected. Payment statuses are updated manually by you.
            </>
          )}
        </p>
      </div>

      <div className="bg-white border border-[#171717]/10">
        {/* Search, Filter & Sort Toolbar */}
        <div className="p-4 sm:p-5 border-b border-[#171717]/10 space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search
                className="w-4 h-4 text-[#171717]/45 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="search"
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                placeholder="Search by order ref or customer name..."
                aria-label="Search orders by reference or customer name"
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm border border-[#171717]/15 bg-white focus:border-[#C6A45C] focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <select
                value={orderStatusFilter}
                onChange={(e) => setOrderStatusFilter(e.target.value as OrderStatus | 'All')}
                aria-label="Filter by order status"
                className="px-3 py-2 text-xs border border-[#171717]/15 bg-white focus:border-[#C6A45C] focus:outline-none cursor-pointer"
              >
                <option value="All">All Order Statuses</option>
                {ORDER_STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>

              <select
                value={orderPaymentFilter}
                onChange={(e) => setOrderPaymentFilter(e.target.value as PaymentStatus | 'All')}
                aria-label="Filter by payment status"
                className="px-3 py-2 text-xs border border-[#171717]/15 bg-white focus:border-[#C6A45C] focus:outline-none cursor-pointer"
              >
                <option value="All">All Payment Statuses</option>
                {PAYMENT_STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>

              <select
                value={orderSortBy}
                onChange={(e) => setOrderSortBy(e.target.value as OrderSortOption)}
                aria-label="Sort orders"
                className="px-3 py-2 text-xs border border-[#171717]/15 bg-white focus:border-[#C6A45C] focus:outline-none cursor-pointer"
              >
                <option value="newest">Sort: Newest Orders</option>
                <option value="oldest">Sort: Oldest Orders</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#171717]/60">
            <span className="tabular-nums">
              Showing {filteredOrders.length} of {orders.length} order
              {orders.length === 1 ? '' : 's'}
            </span>
            {hasActiveOrderFilters && (
              <button
                type="button"
                onClick={clearOrderFilters}
                className="text-xs font-medium text-[#A68642] hover:text-[#171717] underline underline-offset-4 cursor-pointer"
              >
                Clear Order Filters
              </button>
            )}
          </div>
        </div>

        {/* Desktop Orders Table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#171717]/10 bg-[#FAF7F2] text-[11px] font-semibold uppercase tracking-wider text-[#171717]/65">
                <th className="py-3 px-4">Order Ref</th>
                <th className="py-3 px-4">Customer &amp; Phone</th>
                <th className="py-3 px-4">Products, Sizes &amp; Colours</th>
                <th className="py-3 px-4 text-right">Qty</th>
                <th className="py-3 px-4 text-right">Total (₦)</th>
                <th className="py-3 px-4">Order Date</th>
                <th className="py-3 px-4">Payment</th>
                <th className="py-3 px-4">Fulfilment</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#171717]/10 text-sm">
              {filteredOrders.length > 0 ? (
                filteredOrders.map((order) => {
                  const orderId = order.id || order.referenceCode || '';
                  const status = normalizeOrderStatus(order.status);
                  const payment = normalizePaymentStatus(order.paymentStatus);
                  const statusStyle = getOrderStatusStyle(status);
                  const paymentStyle = getPaymentStatusStyle(payment);
                  const totalQty = getOrderTotalQuantity(order);
                  const totalNgn = calculateOrderTotalNgn(order);
                  const waUrl = buildCustomerWhatsAppChatUrl(
                    order.phoneNumber,
                    buildAdminToCustomerWhatsAppMessage(order)
                  );

                  return (
                    <tr key={orderId} className="hover:bg-[#FAF7F2]/60 transition-colors">
                      <td className="py-3.5 px-4 font-medium text-[#171717] whitespace-nowrap">
                        <span>{order.referenceCode || order.id}</span>
                        {order.isDemo && (
                          <span className="block text-[10px] font-semibold uppercase tracking-wider text-[#8C6E32] mt-0.5">
                            Demo Order
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <p className="font-medium text-[#171717]">{order.customerName}</p>
                        <p className="text-xs text-[#171717]/60 tabular-nums mt-0.5">
                          {order.phoneNumber}
                        </p>
                      </td>
                      <td className="py-3.5 px-4 max-w-[260px]">
                        <ul className="space-y-1 text-xs text-[#171717]/80">
                          {order.items.slice(0, 2).map((item) => (
                            <li key={item.id} className="truncate">
                              <span className="font-medium text-[#171717]">{item.name}</span>{' '}
                              <span className="text-[#171717]/60">
                                ({item.selectedSize}, {item.selectedColor} × {item.quantity})
                              </span>
                            </li>
                          ))}
                          {order.items.length > 2 && (
                            <li className="text-[11px] text-[#A68642] font-medium">
                              +{order.items.length - 2} more item
                              {order.items.length - 2 === 1 ? '' : 's'}
                            </li>
                          )}
                        </ul>
                      </td>
                      <td className="py-3.5 px-4 text-right text-xs font-medium text-[#171717] tabular-nums">
                        {totalQty}
                      </td>
                      <td className="py-3.5 px-4 text-right font-semibold text-[#171717] tabular-nums whitespace-nowrap">
                        {formatNaira(totalNgn)}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-[#171717]/70 whitespace-nowrap">
                        {formatOrderDate(order.createdAt)}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 text-[11px] font-medium border ${paymentStyle}`}
                        >
                          {payment}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium border ${statusStyle.badgeClass}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${statusStyle.dotClass}`}
                            aria-hidden="true"
                          />
                          <span>{status}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedOrderId(orderId)}
                            className="px-2.5 py-1.5 border border-[#171717]/20 bg-white text-xs font-medium text-[#171717] hover:border-[#171717] inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 text-[#A68642]" aria-hidden="true" />
                            <span>Open</span>
                          </button>
                          {waUrl && (
                            <a
                              href={waUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={`WhatsApp ${order.customerName}`}
                              aria-label={`Contact ${order.customerName} on WhatsApp`}
                              className="p-1.5 border border-[#171717]/20 bg-white text-[#171717] hover:border-[#C6A45C] hover:bg-[#F6F1E8]"
                            >
                              <MessageCircle className="w-3.5 h-3.5 text-[#A68642]" />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="py-14 px-6 text-center">
                    <div className="max-w-md mx-auto space-y-3">
                      <p className="font-display text-xl font-medium text-[#171717]">
                        {orders.length === 0
                          ? 'No customer orders placed yet'
                          : 'No orders match the current search or filters'}
                      </p>
                      <p className="text-xs text-[#171717]/65 leading-relaxed">
                        {orders.length === 0
                          ? 'Real customer orders placed through the Shopping Bag and Checkout page will appear here automatically.'
                          : 'Try clearing your search or switching order and payment status filters.'}
                      </p>
                      <div className="flex justify-center gap-2 pt-1">
                        {hasActiveOrderFilters && (
                          <button
                            type="button"
                            onClick={clearOrderFilters}
                            className="px-4 py-2 border border-[#171717]/20 bg-white text-xs font-medium text-[#171717] hover:border-[#171717] cursor-pointer"
                          >
                            Clear Filters
                          </button>
                        )}
                        {orders.length === 0 && (
                          <button
                            type="button"
                            onClick={() => navigate('shop', { category: 'All' })}
                            className="px-4 py-2 bg-[#171717] text-white text-xs font-medium hover:bg-[#2a2a2a] cursor-pointer"
                          >
                            Open Storefront Shop
                          </button>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile & Tablet Card View */}
        <div className="lg:hidden divide-y divide-[#171717]/10">
          {filteredOrders.length > 0 ? (
            filteredOrders.map((order) => {
              const orderId = order.id || order.referenceCode || '';
              const status = normalizeOrderStatus(order.status);
              const payment = normalizePaymentStatus(order.paymentStatus);
              const statusStyle = getOrderStatusStyle(status);
              const paymentStyle = getPaymentStatusStyle(payment);
              const totalQty = getOrderTotalQuantity(order);
              const totalNgn = calculateOrderTotalNgn(order);
              const waUrl = buildCustomerWhatsAppChatUrl(
                order.phoneNumber,
                buildAdminToCustomerWhatsAppMessage(order)
              );

              return (
                <div key={orderId} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[#171717]">
                        {order.referenceCode || order.id}
                      </p>
                      <p className="text-sm font-medium text-[#171717] mt-0.5">
                        {order.customerName}
                      </p>
                      <p className="text-xs text-[#171717]/60 tabular-nums">{order.phoneNumber}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-[#171717] tabular-nums">
                        {formatNaira(totalNgn)}
                      </p>
                      <p className="text-xs text-[#171717]/55 mt-0.5">
                        {formatOrderDate(order.createdAt)}
                      </p>
                    </div>
                  </div>

                  <div className="bg-[#FAF7F2] border border-[#171717]/10 p-3 space-y-1.5 text-xs">
                    <p className="font-medium text-[#171717]">
                      Items Ordered ({totalQty} qty):
                    </p>
                    {order.items.map((item) => (
                      <p key={item.id} className="text-[#171717]/75">
                        • {item.name} ({item.selectedSize}, {item.selectedColor}) × {item.quantity}
                      </p>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium border ${statusStyle.badgeClass}`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${statusStyle.dotClass}`}
                          aria-hidden="true"
                        />
                        <span>{status}</span>
                      </span>
                      <span
                        className={`inline-block px-2 py-0.5 text-[11px] font-medium border ${paymentStyle}`}
                      >
                        {payment}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {waUrl && (
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 border border-[#171717]/20 bg-white text-xs font-medium text-[#171717] inline-flex items-center gap-1"
                        >
                          <MessageCircle className="w-3.5 h-3.5 text-[#A68642]" aria-hidden="true" />
                          <span>WhatsApp</span>
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => setSelectedOrderId(orderId)}
                        className="px-3 py-1.5 bg-[#171717] text-white text-xs font-medium inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-[#C6A45C]" aria-hidden="true" />
                        <span>Open Order</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-12 px-4 text-center space-y-3">
              <p className="font-display text-xl font-medium text-[#171717]">
                {orders.length === 0
                  ? 'No customer orders placed yet'
                  : 'No orders match your filters'}
              </p>
              <p className="text-xs text-[#171717]/65">
                {orders.length === 0
                  ? 'Orders submitted from the Checkout page appear here automatically.'
                  : 'Try clearing your search or status filters.'}
              </p>
              {hasActiveOrderFilters && (
                <button
                  type="button"
                  onClick={clearOrderFilters}
                  className="px-4 py-2 border border-[#171717]/20 bg-white text-xs font-medium text-[#171717] cursor-pointer"
                >
                  Clear Filters
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderCustomRequestsSection = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-5 border-b border-[#171717]/10">
        <div>
          <h1 className="font-display text-3xl font-medium text-[#171717]">Custom Requests</h1>
          <p className="text-sm text-[#171717]/65 mt-1">
            Inspect made-to-measure outfit briefs submitted from the Custom Orders page, review
            measurements and reference photos, and follow up on WhatsApp.
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs text-[#171717]/70 tabular-nums">
          <span>
            Total: <strong className="text-[#171717]">{customOrders.length}</strong>
          </span>
          <span>
            New: <strong className="text-[#171717]">{newCustomRequestsCount}</strong>
          </span>
        </div>
      </div>

      {/* Data Connection Notice */}
      <div className="p-3.5 bg-[#F6F1E8] border border-[#C6A45C]/40 flex items-start gap-2.5 text-xs text-[#171717]/80">
        <Info className="w-4 h-4 text-[#A68642] shrink-0 mt-0.5" aria-hidden="true" />
        <p>
          {isSupabaseMode ? (
            <>
              <strong>Live Supabase Custom Briefs:</strong> Bespoke requests submitted on the public
              Custom Orders page are stored in Supabase PostgreSQL, with reference photos secured
              in the private <code className="font-mono">custom-references</code> bucket via
              admin-only signed links.
            </>
          ) : (
            <>
              <strong>Connected to Custom Orders Form:</strong> Bespoke briefs submitted on the
              public Custom Orders page appear here automatically (stored in browser{' '}
              <code className="font-mono">localStorage</code> until Supabase Database &amp; Storage
              are connected).
            </>
          )}
        </p>
      </div>

      <div className="bg-white border border-[#171717]/10">
        {/* Toolbar */}
        <div className="p-4 sm:p-5 border-b border-[#171717]/10 space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search
                className="w-4 h-4 text-[#171717]/45 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="search"
                value={customSearch}
                onChange={(e) => setCustomSearch(e.target.value)}
                placeholder="Search by ref, client name, outfit type, or colour..."
                aria-label="Search custom requests"
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm border border-[#171717]/15 bg-white focus:border-[#C6A45C] focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <select
                value={customStatusFilter}
                onChange={(e) =>
                  setCustomStatusFilter(e.target.value as CustomRequestStatus | 'All')
                }
                aria-label="Filter custom requests by status"
                className="px-3 py-2 text-xs border border-[#171717]/15 bg-white focus:border-[#C6A45C] focus:outline-none cursor-pointer"
              >
                <option value="All">All Request Statuses</option>
                {CUSTOM_REQUEST_STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>

              <select
                value={customSortBy}
                onChange={(e) => setCustomSortBy(e.target.value as CustomRequestSortOption)}
                aria-label="Sort custom requests"
                className="px-3 py-2 text-xs border border-[#171717]/15 bg-white focus:border-[#C6A45C] focus:outline-none cursor-pointer"
              >
                <option value="newest">Sort: Newest Briefs</option>
                <option value="oldest">Sort: Oldest Briefs</option>
                <option value="delivery-soonest">Sort: Earliest Delivery Date</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#171717]/60">
            <span className="tabular-nums">
              Showing {filteredCustomRequests.length} of {customOrders.length} request
              {customOrders.length === 1 ? '' : 's'}
            </span>
            {hasActiveCustomFilters && (
              <button
                type="button"
                onClick={clearCustomFilters}
                className="text-xs font-medium text-[#A68642] hover:text-[#171717] underline underline-offset-4 cursor-pointer"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Desktop Table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#171717]/10 bg-[#FAF7F2] text-[11px] font-semibold uppercase tracking-wider text-[#171717]/65">
                <th className="py-3 px-4">Request Ref</th>
                <th className="py-3 px-4">Client &amp; Contact</th>
                <th className="py-3 px-4">Outfit Brief</th>
                <th className="py-3 px-4">Reference Photo</th>
                <th className="py-3 px-4">Delivery Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#171717]/10 text-sm">
              {filteredCustomRequests.length > 0 ? (
                filteredCustomRequests.map((req) => {
                  const reqId = req.id || req.referenceCode || '';
                  const status = normalizeCustomRequestStatus(req.status);
                  const style = getCustomRequestStatusStyle(status);
                  const hasImg = isRenderableReferenceImage(req.referenceImagePreviewUrl);
                  const waUrl = buildCustomerWhatsAppChatUrl(
                    req.contactNumber,
                    buildAdminToCustomClientWhatsAppMessage(req)
                  );

                  return (
                    <tr key={reqId} className="hover:bg-[#FAF7F2]/60 transition-colors">
                      <td className="py-3.5 px-4 whitespace-nowrap font-semibold text-xs text-[#171717]">
                        <div>{req.referenceCode || req.id}</div>
                        <div className="text-[11px] font-normal text-[#171717]/55 mt-0.5">
                          {formatOrderDate(req.createdAt)}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-medium text-[#171717]">{req.customerName}</p>
                        <p className="text-xs text-[#171717]/65 tabular-nums">{req.contactNumber}</p>
                        {req.email && (
                          <p className="text-[11px] text-[#171717]/55 truncate max-w-[180px]">
                            {req.email}
                          </p>
                        )}
                      </td>
                      <td className="py-3.5 px-4 max-w-[260px]">
                        <p className="text-xs font-semibold text-[#171717]">
                          {req.outfitType} · {req.preferredColor}
                        </p>
                        <p className="text-xs text-[#171717]/70 line-clamp-2 mt-0.5">
                          {req.outfitDescription}
                        </p>
                        {typeof req.budgetNgn === 'number' && req.budgetNgn > 0 && (
                          <p className="text-[11px] font-medium text-[#A68642] mt-0.5 tabular-nums">
                            Budget: {formatNaira(req.budgetNgn)}
                          </p>
                        )}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {hasImg ? (
                          <img
                            src={req.referenceImagePreviewUrl}
                            alt={req.referenceImageName || 'Reference'}
                            className="w-10 h-12 object-cover border border-[#171717]/15 bg-[#FAF7F2]"
                          />
                        ) : (
                          <span className="text-xs text-[#171717]/50">
                            {req.referenceImagePath
                              ? 'Stored privately'
                              : req.referenceImageName
                              ? 'Filename only'
                              : 'None'}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-[#171717] tabular-nums whitespace-nowrap">
                        {req.preferredDeliveryDate || '—'}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium border ${style.badgeClass}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${style.dotClass}`}
                            aria-hidden="true"
                          />
                          <span>{status}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedCustomRequestId(reqId)}
                            className="px-2.5 py-1.5 border border-[#171717]/20 bg-white text-xs font-medium text-[#171717] hover:border-[#171717] inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 text-[#A68642]" aria-hidden="true" />
                            <span>Review</span>
                          </button>
                          {waUrl && (
                            <a
                              href={waUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={`WhatsApp ${req.customerName}`}
                              aria-label={`Contact ${req.customerName} on WhatsApp`}
                              className="p-1.5 border border-[#171717]/20 bg-white text-[#171717] hover:border-[#C6A45C] hover:bg-[#F6F1E8]"
                            >
                              <MessageCircle className="w-3.5 h-3.5 text-[#A68642]" />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-14 px-6 text-center">
                    <div className="max-w-md mx-auto space-y-3">
                      <p className="font-display text-xl font-medium text-[#171717]">
                        {customOrders.length === 0
                          ? 'No custom sewing requests submitted yet'
                          : 'No custom requests match your filters'}
                      </p>
                      <p className="text-xs text-[#171717]/65 leading-relaxed">
                        {customOrders.length === 0
                          ? 'Made-to-measure briefs submitted on the public Custom Orders page will appear here immediately.'
                          : 'Try clearing your search or switching status filter.'}
                      </p>
                      <div className="flex justify-center gap-2 pt-1">
                        {hasActiveCustomFilters && (
                          <button
                            type="button"
                            onClick={clearCustomFilters}
                            className="px-4 py-2 border border-[#171717]/20 bg-white text-xs font-medium text-[#171717] cursor-pointer"
                          >
                            Clear Filters
                          </button>
                        )}
                        {customOrders.length === 0 && (
                          <button
                            type="button"
                            onClick={() => navigate('custom-orders')}
                            className="px-4 py-2 bg-[#171717] text-white text-xs font-medium hover:bg-[#2a2a2a] cursor-pointer"
                          >
                            Open Custom Orders Page
                          </button>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="lg:hidden divide-y divide-[#171717]/10">
          {filteredCustomRequests.length > 0 ? (
            filteredCustomRequests.map((req) => {
              const reqId = req.id || req.referenceCode || '';
              const status = normalizeCustomRequestStatus(req.status);
              const style = getCustomRequestStatusStyle(status);
              const waUrl = buildCustomerWhatsAppChatUrl(
                req.contactNumber,
                buildAdminToCustomClientWhatsAppMessage(req)
              );

              return (
                <div key={reqId} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-[#A68642]">
                        {req.referenceCode || req.id}
                      </p>
                      <p className="text-sm font-medium text-[#171717] mt-0.5">
                        {req.customerName}
                      </p>
                      <p className="text-xs text-[#171717]/60 tabular-nums">{req.contactNumber}</p>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium border ${style.badgeClass}`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${style.dotClass}`}
                        aria-hidden="true"
                      />
                      <span>{status}</span>
                    </span>
                  </div>

                  <p className="text-xs text-[#171717]/80">
                    <strong>{req.outfitType}</strong> · {req.preferredColor} · Delivery:{' '}
                    {req.preferredDeliveryDate || '—'}
                  </p>

                  <div className="flex items-center justify-end gap-2">
                    {waUrl && (
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 border border-[#171717]/20 bg-white text-xs font-medium text-[#171717] inline-flex items-center gap-1"
                      >
                        <MessageCircle className="w-3.5 h-3.5 text-[#A68642]" aria-hidden="true" />
                        <span>WhatsApp</span>
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => setSelectedCustomRequestId(reqId)}
                      className="px-3 py-1.5 bg-[#171717] text-white text-xs font-medium inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-[#C6A45C]" aria-hidden="true" />
                      <span>Review Brief</span>
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-12 px-4 text-center space-y-3">
              <p className="font-display text-xl font-medium text-[#171717]">
                {customOrders.length === 0
                  ? 'No custom sewing requests yet'
                  : 'No requests match your filters'}
              </p>
              {hasActiveCustomFilters && (
                <button
                  type="button"
                  onClick={clearCustomFilters}
                  className="px-4 py-2 border border-[#171717]/20 bg-white text-xs font-medium text-[#171717] cursor-pointer"
                >
                  Clear Filters
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderEnquiriesSection = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-5 border-b border-[#171717]/10">
        <div>
          <h1 className="font-display text-3xl font-medium text-[#171717]">Customer Enquiries</h1>
          <p className="text-sm text-[#171717]/65 mt-1">
            Read and respond to customer messages submitted through the public Contact page.
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs text-[#171717]/70 tabular-nums">
          <span>
            Total: <strong className="text-[#171717]">{enquiries.length}</strong>
          </span>
          <span>
            Unread: <strong className="text-[#171717]">{unreadEnquiriesCount}</strong>
          </span>
        </div>
      </div>

      {/* Data Connection Notice */}
      <div className="p-3.5 bg-[#F6F1E8] border border-[#C6A45C]/40 flex items-start gap-2.5 text-xs text-[#171717]/80">
        <Info className="w-4 h-4 text-[#A68642] shrink-0 mt-0.5" aria-hidden="true" />
        <p>
          {isSupabaseMode ? (
            <>
              <strong>Live Supabase Inbox:</strong> Customer messages submitted through the public
              Contact page are saved directly to your protected Supabase PostgreSQL inbox.
            </>
          ) : (
            <>
              <strong>Connected to Contact Page Form:</strong> Customer messages appear here
              immediately after submission (stored in browser{' '}
              <code className="font-mono">localStorage</code> until Supabase Database persistence is
              connected).
            </>
          )}
        </p>
      </div>

      <div className="bg-white border border-[#171717]/10">
        <div className="p-4 sm:p-5 border-b border-[#171717]/10 space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search
                className="w-4 h-4 text-[#171717]/45 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="search"
                value={enquirySearch}
                onChange={(e) => setEnquirySearch(e.target.value)}
                placeholder="Search sender, email, subject, or message..."
                aria-label="Search customer enquiries"
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm border border-[#171717]/15 focus:border-[#C6A45C] focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <select
                value={enquiryStatusFilter}
                onChange={(e) => setEnquiryStatusFilter(e.target.value as EnquiryStatus | 'All')}
                aria-label="Filter enquiries by status"
                className="px-3 py-2 text-xs border border-[#171717]/15 bg-white focus:border-[#C6A45C] focus:outline-none cursor-pointer"
              >
                <option value="All">All Statuses</option>
                {ENQUIRY_STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>

              <select
                value={enquirySortBy}
                onChange={(e) => setEnquirySortBy(e.target.value as EnquirySortOption)}
                aria-label="Sort enquiries"
                className="px-3 py-2 text-xs border border-[#171717]/15 bg-white focus:border-[#C6A45C] focus:outline-none cursor-pointer"
              >
                <option value="newest">Sort: Newest First</option>
                <option value="oldest">Sort: Oldest First</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#171717]/60">
            <span className="tabular-nums">
              Showing {filteredEnquiries.length} of {enquiries.length} enquir
              {enquiries.length === 1 ? 'y' : 'ies'}
            </span>
            {hasActiveEnquiryFilters && (
              <button
                type="button"
                onClick={clearEnquiryFilters}
                className="text-xs font-medium text-[#A68642] hover:text-[#171717] underline underline-offset-4 cursor-pointer"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Desktop Enquiries Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#171717]/10 bg-[#FAF7F2] text-[11px] font-semibold uppercase tracking-wider text-[#171717]/65">
                <th className="py-3 px-4">Sender</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Subject &amp; Message</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Received</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#171717]/10 text-sm">
              {filteredEnquiries.length > 0 ? (
                filteredEnquiries.map((item) => {
                  const status = normalizeEnquiryStatus(item.status);
                  const style = getEnquiryStatusStyle(status);

                  return (
                    <tr key={item.id} className="hover:bg-[#FAF7F2]/60 transition-colors">
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <p className="font-medium text-[#171717]">{item.name}</p>
                        {item.phone && (
                          <p className="text-xs text-[#171717]/60 tabular-nums">{item.phone}</p>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-[#171717]/80 break-all max-w-[180px]">
                        {item.email}
                      </td>
                      <td className="py-3.5 px-4 max-w-[280px]">
                        <p className="text-xs font-semibold text-[#171717]">{item.subject}</p>
                        <p className="text-xs text-[#171717]/70 line-clamp-2 mt-0.5">
                          {item.message}
                        </p>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium border ${style.badgeClass}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${style.dotClass}`}
                            aria-hidden="true"
                          />
                          <span>{status}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-[#171717]/65 whitespace-nowrap">
                        {formatOrderDate(item.createdAt)}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEnquiry(item)}
                            className="px-2.5 py-1.5 border border-[#171717]/20 bg-white text-xs font-medium text-[#171717] hover:border-[#171717] inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 text-[#A68642]" aria-hidden="true" />
                            <span>Open</span>
                          </button>
                          {status !== 'Replied' && item.id && (
                            <button
                              type="button"
                              onClick={() =>
                                updateEnquiry(item.id!, { status: 'Replied' })
                                  .then(() =>
                                    showToast(`Marked enquiry from ${item.name} as Replied`)
                                  )
                                  .catch((err) =>
                                    showToast(
                                      err instanceof Error && err.message
                                        ? err.message
                                        : 'Unable to update enquiry status right now'
                                    )
                                  )
                              }
                              className="px-2.5 py-1.5 border border-emerald-200 bg-white text-xs font-medium text-emerald-800 hover:bg-emerald-50 cursor-pointer"
                            >
                              Mark Replied
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-14 px-6 text-center">
                    <div className="max-w-md mx-auto space-y-3">
                      <p className="font-display text-xl font-medium text-[#171717]">
                        {enquiries.length === 0
                          ? 'No customer enquiries submitted yet'
                          : 'No enquiries match your search or filter'}
                      </p>
                      <p className="text-xs text-[#171717]/65 leading-relaxed">
                        {enquiries.length === 0
                          ? 'Messages sent through the public Contact page will appear here immediately.'
                          : 'Try clearing your search or status filter.'}
                      </p>
                      <div className="flex justify-center gap-2 pt-1">
                        {hasActiveEnquiryFilters && (
                          <button
                            type="button"
                            onClick={clearEnquiryFilters}
                            className="px-4 py-2 border border-[#171717]/20 bg-white text-xs font-medium text-[#171717] cursor-pointer"
                          >
                            Clear Filters
                          </button>
                        )}
                        {enquiries.length === 0 && (
                          <button
                            type="button"
                            onClick={() => navigate('contact')}
                            className="px-4 py-2 bg-[#171717] text-white text-xs font-medium hover:bg-[#2a2a2a] cursor-pointer"
                          >
                            Open Contact Page
                          </button>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Enquiry Cards */}
        <div className="md:hidden divide-y divide-[#171717]/10">
          {filteredEnquiries.length > 0 ? (
            filteredEnquiries.map((item) => {
              const status = normalizeEnquiryStatus(item.status);
              const style = getEnquiryStatusStyle(status);

              return (
                <div key={item.id} className="p-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-[#171717]">{item.name}</p>
                      <p className="text-xs text-[#171717]/60 break-all">{item.email}</p>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium border ${style.badgeClass}`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${style.dotClass}`}
                        aria-hidden="true"
                      />
                      <span>{status}</span>
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-[#171717]">{item.subject}</p>
                  <p className="text-xs text-[#171717]/75 line-clamp-2">{item.message}</p>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-[#171717]/55">
                      {formatOrderDate(item.createdAt)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleOpenEnquiry(item)}
                      className="px-3 py-1.5 bg-[#171717] text-white text-xs font-medium inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-[#C6A45C]" aria-hidden="true" />
                      <span>Open Message</span>
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-12 px-4 text-center space-y-2">
              <p className="font-display text-xl font-medium text-[#171717]">
                {enquiries.length === 0 ? 'No customer enquiries yet' : 'No matching enquiries'}
              </p>
              {hasActiveEnquiryFilters && (
                <button
                  type="button"
                  onClick={clearEnquiryFilters}
                  className="px-4 py-2 border border-[#171717]/20 bg-white text-xs font-medium text-[#171717] cursor-pointer"
                >
                  Clear Filters
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderSettingsSection = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-5 border-b border-[#171717]/10">
        <div>
          <h1 className="font-display text-3xl font-medium text-[#171717]">Website Settings</h1>
          <p className="text-sm text-[#171717]/65 mt-1">
            Centrally update brand details, WhatsApp concierge number, contact info, and Instagram
            links across the public website and Admin Studio.
          </p>
        </div>

        <button
          type="button"
          disabled={isSavingSettings}
          onClick={handleResetSettings}
          className="self-start sm:self-auto px-3.5 py-2 border border-[#171717]/20 bg-white text-xs font-medium text-[#171717] hover:border-[#171717] disabled:opacity-60 inline-flex items-center gap-1.5 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5 text-[#A68642]" aria-hidden="true" />
          <span>Reset Defaults</span>
        </button>
      </div>

      <div className="p-3.5 bg-[#F6F1E8] border border-[#C6A45C]/40 flex items-start gap-2.5 text-xs text-[#171717]/80 max-w-4xl">
        <Info className="w-4 h-4 text-[#A68642] shrink-0 mt-0.5" aria-hidden="true" />
        <p>
          {isSupabaseMode ? (
            <>
              <strong>Live Storefront Sync (Supabase Database):</strong> Changes saved here persist
              to the Supabase <code className="font-mono">website_settings</code> table and update
              the Navbar, Footer, Homepage, About page, Contact page, WhatsApp Order modal, and
              Admin Sidebar across all visitors.
            </>
          ) : (
            <>
              <strong>Live Storefront Sync (Local Storage):</strong> Changes saved here update the
              Navbar, Footer, Homepage, About page, Contact page, WhatsApp Order modal, and Admin
              Sidebar immediately. Until Supabase <code className="font-mono">website_settings</code>{' '}
              table is connected, edits are saved locally in your browser.
            </>
          )}
        </p>
      </div>

      <form
        onSubmit={handleSaveSettings}
        noValidate
        className="bg-white border border-[#171717]/10 p-6 sm:p-8 max-w-4xl space-y-6"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label
              htmlFor="setting-brand-name"
              className="block text-xs font-semibold text-[#171717] mb-1.5"
            >
              Brand Name <span className="text-[#A68642]">*</span>
            </label>
            <input
              id="setting-brand-name"
              type="text"
              value={settingsForm.brandName}
              onChange={(e) => {
                setSettingsForm((prev) => ({ ...prev, brandName: e.target.value }));
                if (settingsErrors.brandName) {
                  setSettingsErrors((prev) => ({ ...prev, brandName: undefined }));
                }
              }}
              className="w-full px-3.5 py-2.5 text-sm border border-[#171717]/20 bg-white text-[#171717] focus:border-[#C6A45C] focus:outline-none"
            />
            {settingsErrors.brandName && (
              <p className="mt-1 text-xs text-red-700">{settingsErrors.brandName}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="setting-tagline"
              className="block text-xs font-semibold text-[#171717] mb-1.5"
            >
              Brand Tagline <span className="text-[#A68642]">*</span>
            </label>
            <input
              id="setting-tagline"
              type="text"
              value={settingsForm.tagline}
              onChange={(e) => {
                setSettingsForm((prev) => ({ ...prev, tagline: e.target.value }));
                if (settingsErrors.tagline) {
                  setSettingsErrors((prev) => ({ ...prev, tagline: undefined }));
                }
              }}
              className="w-full px-3.5 py-2.5 text-sm border border-[#171717]/20 bg-white text-[#171717] focus:border-[#C6A45C] focus:outline-none"
            />
            {settingsErrors.tagline && (
              <p className="mt-1 text-xs text-red-700">{settingsErrors.tagline}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="setting-wa-raw"
              className="block text-xs font-semibold text-[#171717] mb-1.5"
            >
              WhatsApp Number (International Digits) <span className="text-[#A68642]">*</span>
            </label>
            <input
              id="setting-wa-raw"
              type="text"
              inputMode="numeric"
              value={settingsForm.whatsappNumberRaw}
              onChange={(e) => {
                setSettingsForm((prev) => ({ ...prev, whatsappNumberRaw: e.target.value }));
                if (settingsErrors.whatsappNumberRaw) {
                  setSettingsErrors((prev) => ({ ...prev, whatsappNumberRaw: undefined }));
                }
              }}
              placeholder="e.g. 2348012345678"
              className="w-full px-3.5 py-2.5 text-sm border border-[#171717]/20 bg-white text-[#171717] tabular-nums focus:border-[#C6A45C] focus:outline-none"
            />
            {settingsErrors.whatsappNumberRaw && (
              <p className="mt-1 text-xs text-red-700">{settingsErrors.whatsappNumberRaw}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="setting-wa-label"
              className="block text-xs font-semibold text-[#171717] mb-1.5"
            >
              WhatsApp Display Label
            </label>
            <input
              id="setting-wa-label"
              type="text"
              value={settingsForm.whatsappDisplayLabel}
              onChange={(e) =>
                setSettingsForm((prev) => ({ ...prev, whatsappDisplayLabel: e.target.value }))
              }
              className="w-full px-3.5 py-2.5 text-sm border border-[#171717]/20 bg-white text-[#171717] focus:border-[#C6A45C] focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="setting-email"
              className="block text-xs font-semibold text-[#171717] mb-1.5"
            >
              Business Email <span className="text-[#A68642]">*</span>
            </label>
            <input
              id="setting-email"
              type="text"
              value={settingsForm.businessEmail}
              onChange={(e) => {
                setSettingsForm((prev) => ({ ...prev, businessEmail: e.target.value }));
                if (settingsErrors.businessEmail) {
                  setSettingsErrors((prev) => ({ ...prev, businessEmail: undefined }));
                }
              }}
              className="w-full px-3.5 py-2.5 text-sm border border-[#171717]/20 bg-white text-[#171717] focus:border-[#C6A45C] focus:outline-none"
            />
            {settingsErrors.businessEmail && (
              <p className="mt-1 text-xs text-red-700">{settingsErrors.businessEmail}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="setting-phone"
              className="block text-xs font-semibold text-[#171717] mb-1.5"
            >
              Business Phone
            </label>
            <input
              id="setting-phone"
              type="text"
              value={settingsForm.businessPhone}
              onChange={(e) =>
                setSettingsForm((prev) => ({ ...prev, businessPhone: e.target.value }))
              }
              className="w-full px-3.5 py-2.5 text-sm border border-[#171717]/20 bg-white text-[#171717] focus:border-[#C6A45C] focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="setting-ig-handle"
              className="block text-xs font-semibold text-[#171717] mb-1.5"
            >
              Instagram Handle <span className="text-[#A68642]">*</span>
            </label>
            <input
              id="setting-ig-handle"
              type="text"
              value={settingsForm.instagramHandle}
              onChange={(e) => {
                setSettingsForm((prev) => ({ ...prev, instagramHandle: e.target.value }));
                if (settingsErrors.instagramHandle) {
                  setSettingsErrors((prev) => ({ ...prev, instagramHandle: undefined }));
                }
              }}
              className="w-full px-3.5 py-2.5 text-sm border border-[#171717]/20 bg-white text-[#171717] focus:border-[#C6A45C] focus:outline-none"
            />
            {settingsErrors.instagramHandle && (
              <p className="mt-1 text-xs text-red-700">{settingsErrors.instagramHandle}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="setting-ig-url"
              className="block text-xs font-semibold text-[#171717] mb-1.5"
            >
              Instagram Profile URL <span className="text-[#A68642]">*</span>
            </label>
            <input
              id="setting-ig-url"
              type="url"
              value={settingsForm.instagramUrl}
              onChange={(e) => {
                setSettingsForm((prev) => ({ ...prev, instagramUrl: e.target.value }));
                if (settingsErrors.instagramUrl) {
                  setSettingsErrors((prev) => ({ ...prev, instagramUrl: undefined }));
                }
              }}
              className="w-full px-3.5 py-2.5 text-sm border border-[#171717]/20 bg-white text-[#171717] focus:border-[#C6A45C] focus:outline-none"
            />
            {settingsErrors.instagramUrl && (
              <p className="mt-1 text-xs text-red-700">{settingsErrors.instagramUrl}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="setting-location"
              className="block text-xs font-semibold text-[#171717] mb-1.5"
            >
              Business Location <span className="text-[#A68642]">*</span>
            </label>
            <input
              id="setting-location"
              type="text"
              value={settingsForm.businessLocation}
              onChange={(e) => {
                setSettingsForm((prev) => ({ ...prev, businessLocation: e.target.value }));
                if (settingsErrors.businessLocation) {
                  setSettingsErrors((prev) => ({ ...prev, businessLocation: undefined }));
                }
              }}
              className="w-full px-3.5 py-2.5 text-sm border border-[#171717]/20 bg-white text-[#171717] focus:border-[#C6A45C] focus:outline-none"
            />
            {settingsErrors.businessLocation && (
              <p className="mt-1 text-xs text-red-700">{settingsErrors.businessLocation}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="setting-hours"
              className="block text-xs font-semibold text-[#171717] mb-1.5"
            >
              Studio Hours
            </label>
            <input
              id="setting-hours"
              type="text"
              value={settingsForm.businessHours}
              onChange={(e) =>
                setSettingsForm((prev) => ({ ...prev, businessHours: e.target.value }))
              }
              className="w-full px-3.5 py-2.5 text-sm border border-[#171717]/20 bg-white text-[#171717] focus:border-[#C6A45C] focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="setting-currency"
              className="block text-xs font-semibold text-[#171717] mb-1.5"
            >
              Storefront Currency
            </label>
            <input
              id="setting-currency"
              type="text"
              readOnly
              value={`${settingsForm.currencyLabel} — ${settingsForm.currencyCode}`}
              className="w-full px-3.5 py-2.5 text-sm border border-[#171717]/15 bg-[#FAF7F2] text-[#171717]/80"
            />
          </div>

          <div className="flex items-end pb-2">
            <label className="inline-flex items-center gap-2.5 text-xs text-[#171717] cursor-pointer">
              <input
                type="checkbox"
                checked={settingsForm.whatsappIsPlaceholder}
                onChange={(e) =>
                  setSettingsForm((prev) => ({
                    ...prev,
                    whatsappIsPlaceholder: e.target.checked,
                  }))
                }
                className="w-4 h-4 accent-[#171717]"
              />
              <span>Mark WhatsApp number as placeholder notice in customer modal</span>
            </label>
          </div>
        </div>

        <div className="pt-4 border-t border-[#171717]/10 flex flex-wrap items-center justify-between gap-4">
          <p className="text-xs text-[#171717]/60">
            {websiteSettings.updatedAt
              ? `Last saved: ${formatOrderDate(websiteSettings.updatedAt)}`
              : 'Using initial studio defaults'}
          </p>
          <button
            type="submit"
            disabled={isSavingSettings}
            className="px-5 py-2.5 bg-[#171717] text-white text-xs font-medium hover:bg-[#2a2a2a] disabled:opacity-60 transition-colors inline-flex items-center gap-2 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5 text-[#C6A45C]" aria-hidden="true" />
            <span>{isSavingSettings ? 'Saving Settings...' : 'Save Settings'}</span>
          </button>
        </div>
      </form>
    </div>
  );

  const renderSection = (section: AdminSection) => {
    switch (section) {
      case 'products':
        return renderProductsSection();
      case 'orders':
        return renderOrdersSection();
      case 'custom-requests':
        return renderCustomRequestsSection();
      case 'enquiries':
        return renderEnquiriesSection();
      case 'settings':
        return renderSettingsSection();
      case 'overview':
      default:
        return renderOverview();
    }
  };

  // Wait for initial Supabase session & server-side admin verification before showing gate
  if (isSupabaseMode && isAuthLoading) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] text-[#171717] flex items-center justify-center px-4">
        <div className="max-w-sm w-full bg-white border border-[#171717]/15 p-8 text-center space-y-2 shadow-sm">
          <p className="font-display text-2xl font-medium text-[#171717]">
            {websiteSettings.brandName}
          </p>
          <p className="text-xs text-[#171717]/70">
            Verifying administrator credentials &amp; session...
          </p>
        </div>
      </div>
    );
  }

  // Protect entire Admin workspace behind AdminLoginGate
  if (!adminSession?.isAuthenticated) {
    return <AdminLoginGate />;
  }

  return (
    <div className="min-h-screen flex bg-[#FAF7F2] text-[#171717]">
      <AdminSidebar
        activeSection={adminSection}
        onSelectSection={setAdminSection}
        onLogout={handleLogout}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        newCustomRequestsCount={newCustomRequestsCount}
        unreadEnquiriesCount={unreadEnquiriesCount}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Admin Top Header */}
        <header className="sticky top-0 z-30 h-16 bg-white border-b border-[#171717]/10 px-4 sm:px-6 lg:px-10 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open admin sidebar"
              className="lg:hidden w-10 h-10 inline-flex items-center justify-center border border-[#171717]/15 text-[#171717] hover:bg-[#F6F1E8] cursor-pointer shrink-0"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-xs sm:text-sm min-w-0">
              <span className="text-[#171717]/55 whitespace-nowrap">Admin</span>
              <span aria-hidden="true" className="text-[#171717]/35">
                /
              </span>
              <span className="font-semibold text-[#171717] truncate">{activeNavItem.label}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('home')}
            className="px-3.5 py-2 border border-[#171717]/20 bg-white text-xs font-medium text-[#171717] hover:border-[#C6A45C] hover:bg-[#F6F1E8] transition-colors inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
          >
            <span>View Storefront</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-[#A68642]" aria-hidden="true" />
          </button>
        </header>

        {/* Main Workspace Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-10 max-w-7xl w-full mx-auto space-y-6">
          {isSupabaseMode && adminDataError && (
            <div
              role="alert"
              className="p-4 bg-red-50 border border-red-200 text-xs sm:text-sm text-red-900 flex flex-wrap items-center justify-between gap-3"
            >
              <span>{adminDataError}</span>
              <button
                type="button"
                onClick={() => void reloadAdminData()}
                className="px-3.5 py-1.5 bg-white border border-red-300 text-xs font-medium text-red-900 hover:bg-red-100 cursor-pointer"
              >
                Retry Sync
              </button>
            </div>
          )}

          {isSupabaseMode && isAdminDataLoading && (
            <div className="p-3 bg-[#F6F1E8] border border-[#C6A45C]/40 text-xs text-[#171717]/75">
              Syncing studio records from Supabase...
            </div>
          )}

          {renderSection(adminSection)}
        </main>
      </div>

      {/* Order Details & Status Management Modal */}
      <OrderDetailModal
        order={selectedOrder}
        onClose={() => setSelectedOrderId(null)}
        onSaveUpdates={handleSaveOrderUpdates}
        onNotify={showToast}
      />

      {/* Custom Request Details & Status Modal */}
      <CustomRequestDetailModal
        request={selectedCustomRequest}
        onClose={() => setSelectedCustomRequestId(null)}
        onSaveUpdates={handleSaveCustomRequestUpdates}
      />

      {/* Customer Enquiry Reader & Status Modal */}
      <EnquiryDetailModal
        enquiry={selectedEnquiry}
        onClose={() => setSelectedEnquiryId(null)}
        onSaveUpdates={handleSaveEnquiryUpdates}
      />
    </div>
  );
}
