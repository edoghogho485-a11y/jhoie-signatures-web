import { RefreshCw, Search, SlidersHorizontal, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { ProductCard } from '../components/ProductCard';
import { useStore } from '../context/StoreContext';
import { SHOP_CATEGORIES } from '../data/sampleCatalog';
import type { StockStatus } from '../types/fashion';
import {
  filterAndSortProducts,
  getCategoryCounts,
  type SortOption,
} from '../utils/catalogHelpers';

export function ShopPage() {
  const {
    products,
    shopCategoryFilter,
    setShopCategoryFilter,
    navigate,
    isSupabaseMode,
    isCatalogLoading,
    catalogError,
    reloadCatalog,
  } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [stockFilter, setStockFilter] = useState<StockStatus | 'All'>('All');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const showSampleCopy = !isSupabaseMode && products.some((p) => p.isSample);

  const categoryCounts = useMemo(
    () => getCategoryCounts(products, SHOP_CATEGORIES),
    [products]
  );

  const filteredProducts = useMemo(
    () =>
      filterAndSortProducts({
        products,
        category: shopCategoryFilter,
        stockStatus: stockFilter,
        searchQuery,
        sortBy,
      }),
    [products, shopCategoryFilter, stockFilter, searchQuery, sortBy]
  );

  const hasActiveFilters =
    shopCategoryFilter !== 'All' || stockFilter !== 'All' || searchQuery.trim() !== '';

  const resetAllFilters = () => {
    setShopCategoryFilter('All');
    setStockFilter('All');
    setSearchQuery('');
    setSortBy('newest');
  };

  return (
    <div className="bg-white min-h-[70vh]">
      {/* Page Header */}
      <section className="bg-[#FAF7F2] border-b border-[#171717]/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-12 lg:py-16">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div>
              <p className="text-xs font-medium text-[#A68642] tracking-[0.16em] uppercase">
                {showSampleCopy
                  ? 'Sample Ready-to-Wear Catalogue'
                  : 'Ready-to-Wear Atelier Collection'}
              </p>
              <h1 className="mt-2 font-display text-4xl sm:text-5xl font-medium text-[#171717]">
                Shop JHOIE SIGNATURES
              </h1>
              <p className="mt-3 text-sm sm:text-base text-[#171717]/70 max-w-2xl leading-relaxed">
                {showSampleCopy
                  ? 'Browse ready-made dresses, evening gowns, two-piece outfits, traditional wear, and modern styles. All items shown are clearly labelled sample products with placeholder photographs and sample Nigerian Naira (₦) pricing until final collection imagery arrives.'
                  : 'Browse ready-made dresses, evening gowns, two-piece outfits, traditional wear, and contemporary styles tailored by JHOIE SIGNATURES with Nigerian naira (₦) pricing.'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate('custom-orders')}
              className="self-start lg:self-auto px-5 py-2.5 border border-[#171717]/20 bg-white text-xs font-medium text-[#171717] hover:border-[#C6A45C] hover:bg-[#F6F1E8] transition-colors cursor-pointer whitespace-nowrap"
            >
              Looking for Bespoke Fit? Request Custom Order
            </button>
          </div>
        </div>
      </section>

      {/* Filter & Search Toolbar */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-8">
        <div className="flex flex-col gap-5 pb-6 border-b border-[#171717]/10">
          {/* Category Filter Tabs */}
          <div
            className="flex flex-wrap items-center gap-2"
            role="group"
            aria-label="Filter by category"
          >
            {(['All', ...SHOP_CATEGORIES] as const).map((category) => {
              const active = shopCategoryFilter === category;
              const count = categoryCounts[category] ?? 0;
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => setShopCategoryFilter(category)}
                  className={`px-3.5 py-2 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap tabular-nums ${
                    active
                      ? 'bg-[#171717] text-white'
                      : 'bg-[#F6F1E8] text-[#171717]/80 hover:bg-[#ebe3d4] hover:text-[#171717]'
                  }`}
                >
                  {category} ({count})
                </button>
              );
            })}
          </div>

          {/* Search, Availability & Price Sort Controls */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search
                className="w-4 h-4 text-[#171717]/45 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search dresses, gowns, two-piece, fabrics..."
                aria-label="Search outfits"
                className="w-full pl-9 pr-8 py-2.5 text-xs sm:text-sm bg-white border border-[#171717]/15 text-[#171717] placeholder:text-[#171717]/45 focus:border-[#C6A45C] focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#171717]/45 hover:text-[#171717] cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <label htmlFor="stock-filter" className="text-xs text-[#171717]/65 sr-only">
                  Filter by availability
                </label>
                <select
                  id="stock-filter"
                  value={stockFilter}
                  onChange={(e) => setStockFilter(e.target.value as StockStatus | 'All')}
                  aria-label="Filter by availability"
                  className="px-3 py-2.5 text-xs sm:text-sm bg-white border border-[#171717]/15 text-[#171717] focus:border-[#C6A45C] focus:outline-none cursor-pointer"
                >
                  <option value="All">Availability: All</option>
                  <option value="In Stock">In Stock</option>
                  <option value="Low Stock">Low Stock</option>
                  <option value="Made to Order">Made to Order</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-[#171717]/55 shrink-0" aria-hidden="true" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  aria-label="Sort products"
                  className="px-3 py-2.5 text-xs sm:text-sm bg-white border border-[#171717]/15 text-[#171717] focus:border-[#C6A45C] focus:outline-none cursor-pointer"
                >
                  <option value="newest">Sort: Newest Arrivals</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Result Count & Active Reset */}
        <div className="py-4 flex flex-wrap items-center justify-between gap-2 text-xs text-[#171717]/65">
          <span className="tabular-nums">
            {isCatalogLoading && products.length === 0 ? (
              'Loading collection...'
            ) : (
              <>
                Showing {filteredProducts.length}{' '}
                {filteredProducts.length === 1
                  ? showSampleCopy
                    ? 'sample piece'
                    : 'piece'
                  : showSampleCopy
                  ? 'sample pieces'
                  : 'pieces'}
                {shopCategoryFilter !== 'All' ? ` in ${shopCategoryFilter}` : ''}
                {stockFilter !== 'All' ? ` · ${stockFilter}` : ''}
              </>
            )}
          </span>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetAllFilters}
              className="text-[#171717] font-medium underline underline-offset-4 hover:text-[#A68642] cursor-pointer"
            >
              Reset all filters
            </button>
          )}
        </div>

        {catalogError && products.length > 0 && (
          <div
            role="alert"
            className="mb-6 p-3.5 bg-red-50 border border-red-200 text-xs text-red-900 flex flex-wrap items-center justify-between gap-3"
          >
            <span>{catalogError}</span>
            <button
              type="button"
              onClick={() => void reloadCatalog()}
              className="px-3 py-1.5 bg-white border border-red-300 text-red-900 font-medium inline-flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" aria-hidden="true" />
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* Catalog Grid */}
        {isCatalogLoading && products.length === 0 ? (
          <div
            aria-label="Loading shop catalogue"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 pb-12"
          >
            {[0, 1, 2, 3, 4, 5].map((slot) => (
              <div
                key={slot}
                className="border border-[#171717]/10 bg-[#FAF7F2] animate-pulse"
              >
                <div className="aspect-[3/4] bg-[#F6F1E8]" />
                <div className="p-5 space-y-3 bg-white">
                  <div className="h-3 w-24 bg-[#F6F1E8]" />
                  <div className="h-5 w-3/4 bg-[#F6F1E8]" />
                  <div className="h-4 w-28 bg-[#F6F1E8]" />
                </div>
              </div>
            ))}
          </div>
        ) : catalogError && products.length === 0 ? (
          <div className="py-16 px-6 text-center space-y-4 border border-red-200 bg-red-50/70">
            <p className="font-display text-2xl text-[#171717]">
              Unable to Load Ready-to-Wear Catalogue
            </p>
            <p className="text-sm text-[#171717]/75 max-w-md mx-auto">{catalogError}</p>
            <div className="pt-1 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => void reloadCatalog()}
                className="px-5 py-2.5 bg-[#171717] text-white text-xs font-medium inline-flex items-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[#C6A45C]" aria-hidden="true" />
                <span>Retry</span>
              </button>
              <button
                type="button"
                onClick={() => navigate('custom-orders')}
                className="px-5 py-2.5 border border-[#171717]/20 bg-white text-[#171717] text-xs font-medium cursor-pointer"
              >
                Request Custom Order
              </button>
            </div>
          </div>
        ) : products.length === 0 ? (
          <div className="py-20 px-6 text-center space-y-3 border border-[#171717]/10 bg-[#FAF7F2]">
            <p className="font-display text-2xl text-[#171717]">
              Ready-to-Wear Catalogue Coming Soon
            </p>
            <p className="text-sm text-[#171717]/65 max-w-md mx-auto">
              There are currently no published ready-to-wear pieces in the studio database. Please
              check back shortly or commission a bespoke outfit through Custom Orders.
            </p>
            <div className="pt-2 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => navigate('custom-orders')}
                className="px-5 py-2.5 bg-[#171717] text-white text-xs font-medium cursor-pointer"
              >
                Request Custom Order
              </button>
              <button
                type="button"
                onClick={() => navigate('contact')}
                className="px-5 py-2.5 border border-[#171717]/20 bg-white text-[#171717] text-xs font-medium cursor-pointer"
              >
                Contact Atelier
              </button>
            </div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="py-20 text-center space-y-3 border border-[#171717]/10 bg-[#FAF7F2]">
            <p className="font-display text-2xl text-[#171717]">
              {showSampleCopy ? 'No matching sample pieces found' : 'No matching pieces found'}
            </p>
            <p className="text-sm text-[#171717]/65 max-w-md mx-auto">
              Try clearing your search term or selecting a different category, or request a bespoke
              design through Custom Orders.
            </p>
            <div className="pt-2 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={resetAllFilters}
                className="px-5 py-2.5 bg-[#171717] text-white text-xs font-medium cursor-pointer"
              >
                {showSampleCopy ? 'Show All Sample Pieces' : 'Show All Pieces'}
              </button>
              <button
                type="button"
                onClick={() => navigate('custom-orders')}
                className="px-5 py-2.5 border border-[#171717]/20 bg-white text-[#171717] text-xs font-medium cursor-pointer"
              >
                Request Custom Order
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 pb-12">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
