import { ArrowRight, ArrowUpRight, Instagram, RefreshCw, Scissors } from 'lucide-react';
import { useMemo, useState } from 'react';
import { BrandImage } from '../components/BrandImage';
import { BrandTrustSection } from '../components/BrandTrustSection';
import { ProductCard } from '../components/ProductCard';
import { useStore } from '../context/StoreContext';
import {
  BRAND_INFO,
  EDITORIAL_IMAGES,
  INSTAGRAM_SHOWCASE,
  SHOP_CATEGORIES,
} from '../data/sampleCatalog';

type HomeShowcaseTab = 'featured' | 'new-arrivals' | 'best-sellers';

export function HomePage() {
  const {
    products,
    navigate,
    websiteSettings,
    isSupabaseMode,
    isCatalogLoading,
    catalogError,
    reloadCatalog,
  } = useStore();
  const [activeTab, setActiveTab] = useState<HomeShowcaseTab>('featured');
  const showSampleDisclaimer = !isSupabaseMode && products.some((p) => p.isSample);

  const showcasedProducts = useMemo(() => {
    if (activeTab === 'new-arrivals') {
      return products.filter((p) => p.isNewArrival).slice(0, 3);
    }
    if (activeTab === 'best-sellers') {
      return products.filter((p) => p.isBestSeller).slice(0, 3);
    }
    return products.filter((p) => p.isFeatured).slice(0, 3);
  }, [activeTab, products]);

  return (
    <div className="bg-white text-[#171717]">
      {/* 1. Editorial Hero Section */}
      <section className="relative bg-[#171717] text-white overflow-hidden">
        <div className="relative min-h-[540px] lg:min-h-[640px] max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 items-stretch">
          {/* Left Editorial Copy */}
          <div className="lg:col-span-6 px-4 sm:px-6 lg:px-10 py-14 lg:py-20 flex flex-col justify-center z-10 order-2 lg:order-1">
            <p className="font-display italic text-xl sm:text-2xl text-[#C6A45C] tracking-wide">
              {websiteSettings.tagline}
            </p>
            <h1 className="mt-3 font-display text-4xl sm:text-5xl lg:text-[56px] font-medium leading-[1.08] text-white text-balance">
              Modern African Elegance, Tailored for Women.
            </h1>
            <p className="mt-5 text-sm sm:text-base text-white/80 leading-relaxed max-w-lg">
              {websiteSettings.brandName} brings together refined luxury, contemporary silhouettes, and
              heritage craftsmanship across ready-to-wear and bespoke tailoring.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => navigate('shop', { category: 'All' })}
                className="px-7 py-3.5 bg-[#C6A45C] text-[#171717] text-sm font-semibold tracking-wide hover:bg-[#d5b571] transition-colors inline-flex items-center gap-2.5 cursor-pointer whitespace-nowrap"
              >
                <span>Shop Now</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => navigate('custom-orders')}
                className="px-6 py-3.5 border border-white/25 text-white text-sm font-medium hover:border-[#C6A45C] hover:text-[#C6A45C] transition-colors cursor-pointer whitespace-nowrap"
              >
                Request Custom Order
              </button>
            </div>

            <p className="mt-8 text-xs text-white/55">
              {showSampleDisclaimer
                ? 'Sample Catalog Preview · Ready-to-Wear & Made-to-Measure'
                : 'Atelier Collection · Ready-to-Wear & Made-to-Measure'}
            </p>
          </div>

          {/* Right Hero Photography */}
          <div className="lg:col-span-6 relative min-h-[340px] lg:min-h-full order-1 lg:order-2">
            <BrandImage
              src={EDITORIAL_IMAGES.heroEditorial}
              alt="JHOIE SIGNATURES luxury midnight black and champagne gold editorial gown"
              priority
              className="w-full h-full object-cover object-top"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-t from-[#171717] via-transparent to-transparent lg:bg-gradient-to-r lg:from-[#171717] lg:via-[#171717]/20 lg:to-transparent"
            />
          </div>
        </div>
      </section>

      {/* 2. Curated Collections: Featured, New Arrivals & Best Sellers */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-16 lg:py-24">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-8 border-b border-[#171717]/10">
          <div className="space-y-2 max-w-xl">
            <p className="text-xs font-medium text-[#A68642] tracking-[0.16em] uppercase">
              {showSampleDisclaimer ? 'Sample Curated Showcase' : 'Curated Atelier Showcase'}
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-medium text-[#171717] text-balance">
              Signature Pieces &amp; Seasonal Arrivals
            </h2>
          </div>

          {/* Segmented Collection Switcher */}
          <div
            role="tablist"
            aria-label="Collection Showcase Filter"
            className="inline-flex flex-wrap items-center gap-1 p-1 bg-[#F6F1E8] self-start lg:self-auto"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'featured'}
              onClick={() => setActiveTab('featured')}
              className={`px-4 py-2 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'featured'
                  ? 'bg-[#171717] text-white'
                  : 'text-[#171717]/75 hover:text-[#171717]'
              }`}
            >
              Featured Collection
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'new-arrivals'}
              onClick={() => setActiveTab('new-arrivals')}
              className={`px-4 py-2 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'new-arrivals'
                  ? 'bg-[#171717] text-white'
                  : 'text-[#171717]/75 hover:text-[#171717]'
              }`}
            >
              New Arrivals
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'best-sellers'}
              onClick={() => setActiveTab('best-sellers')}
              className={`px-4 py-2 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'best-sellers'
                  ? 'bg-[#171717] text-white'
                  : 'text-[#171717]/75 hover:text-[#171717]'
              }`}
            >
              Best Sellers
            </button>
          </div>
        </div>

        {/* Category Quick Links */}
        <div className="py-5 flex flex-wrap items-center justify-between gap-4 border-b border-[#171717]/8">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[#171717]/70">
            <span className="font-medium text-[#171717]">Categories:</span>
            {SHOP_CATEGORIES.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => navigate('shop', { category })}
                className="hover:text-[#A68642] underline-offset-4 hover:underline transition-colors cursor-pointer whitespace-nowrap"
              >
                {category}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => navigate('shop', { category: 'All' })}
            className="text-xs font-semibold text-[#171717] hover:text-[#A68642] inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
          >
            <span>Explore Full Shop</span>
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>

        {/* 3-Column Product Showcase Grid */}
        {isCatalogLoading && products.length === 0 ? (
          <div
            aria-label="Loading signature pieces"
            className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8"
          >
            {[0, 1, 2].map((slot) => (
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
          <div className="mt-8 p-8 border border-red-200 bg-red-50/70 text-center space-y-4">
            <p className="font-display text-2xl text-[#171717]">
              Unable to Load Featured Pieces
            </p>
            <p className="text-sm text-[#171717]/75 max-w-md mx-auto">{catalogError}</p>
            <button
              type="button"
              onClick={() => void reloadCatalog()}
              className="px-5 py-2.5 bg-[#171717] text-white text-xs font-medium inline-flex items-center gap-2 hover:bg-[#2a2a2a] cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#C6A45C]" aria-hidden="true" />
              <span>Retry Loading Catalogue</span>
            </button>
          </div>
        ) : showcasedProducts.length === 0 ? (
          <div className="mt-8 p-10 border border-[#171717]/10 bg-[#FAF7F2] text-center space-y-3">
            <p className="font-display text-2xl text-[#171717]">
              {products.length === 0
                ? 'Ready-to-Wear Pieces Coming Soon'
                : 'No Pieces Listed Under This Tab Yet'}
            </p>
            <p className="text-sm text-[#171717]/70 max-w-md mx-auto">
              {products.length === 0
                ? 'Our studio catalogue is currently being curated. Request a made-to-measure outfit below or explore bespoke tailoring.'
                : 'Explore all available pieces in the Shop or commission a made-to-measure design.'}
            </p>
            <div className="pt-2 flex flex-wrap justify-center gap-3">
              {products.length > 0 && (
                <button
                  type="button"
                  onClick={() => navigate('shop', { category: 'All' })}
                  className="px-5 py-2.5 bg-[#171717] text-white text-xs font-medium cursor-pointer"
                >
                  View Full Shop
                </button>
              )}
              <button
                type="button"
                onClick={() => navigate('custom-orders')}
                className="px-5 py-2.5 border border-[#171717]/20 bg-white text-[#171717] text-xs font-medium hover:border-[#C6A45C] cursor-pointer"
              >
                Request Custom Order
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {showcasedProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      {/* 3. Custom Tailoring Promotional Section */}
      <section className="bg-[#F6F1E8] border-y border-[#171717]/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-16 lg:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
            <div className="lg:col-span-6 overflow-hidden bg-white border border-[#171717]/10">
              <BrandImage
                src={EDITORIAL_IMAGES.atelierCraftsmanship}
                alt="JHOIE SIGNATURES bespoke tailoring atelier table with silk swatches and sketches"
                className="w-full h-full min-h-[320px] object-cover"
              />
            </div>

            <div className="lg:col-span-6 flex flex-col justify-center space-y-6">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 text-xs font-medium text-[#A68642] tracking-[0.16em] uppercase">
                  <Scissors className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Bespoke Atelier Service</span>
                </div>
                <h2 className="font-display text-3xl sm:text-4xl lg:text-[42px] font-medium text-[#171717] leading-tight text-balance">
                  Custom Tailoring Designed Around Your Silhouette
                </h2>
                <p className="text-sm sm:text-base text-[#171717]/75 leading-relaxed">
                  From milestone celebrations and traditional ceremonies to tailored evening gowns,
                  submit your preferred occasion, exact body measurements, and inspiration
                  photographs for a made-to-measure JHOIE SIGNATURES piece.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 pt-4 border-t border-[#171717]/12 text-xs">
                <div>
                  <p className="font-semibold text-[#171717]">01. Share Your Vision</p>
                  <p className="text-[#171717]/65 mt-1">
                    Describe your outfit and upload a reference photo.
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-[#171717]">02. Submit Measurements</p>
                  <p className="text-[#171717]/65 mt-1">
                    Provide bust, waist, hip, shoulder, and length specs.
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-[#171717]">03. Atelier Confirmation</p>
                  <p className="text-[#171717]/65 mt-1">
                    Receive timeline and pricing consultation directly.
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => navigate('custom-orders')}
                  className="px-7 py-3.5 bg-[#171717] text-white text-sm font-medium hover:bg-[#2a2a2a] transition-colors inline-flex items-center gap-2.5 cursor-pointer"
                >
                  <span>Start a Custom Order</span>
                  <ArrowRight className="w-4 h-4 text-[#C6A45C]" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Brand Story, Brand Trust & Instagram Showcase */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-16 lg:py-24 space-y-16">
        {/* Brand Introduction */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-8 border-b border-[#171717]/10">
          <div className="space-y-3 max-w-2xl">
            <p className="text-xs font-medium text-[#A68642] tracking-[0.16em] uppercase">
              The House
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-medium text-[#171717] leading-tight text-balance">
              Crafted for Confidence Across Every Generation
            </h2>
            <p className="text-sm sm:text-base text-[#171717]/75 leading-relaxed">
              JHOIE SIGNATURES celebrates women of every age through thoughtful tailoring, rich
              fabrics, and poised silhouettes that bridge modern global fashion and African
              elegance.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('about')}
            className="text-sm font-medium text-[#171717] hover:text-[#A68642] underline underline-offset-4 inline-flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 self-start lg:self-auto"
          >
            <span>Read About Us</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* Brand Trust & Empty Editable Feedback Slot */}
        <BrandTrustSection showTestimonialsSlot={true} />

        {/* Instagram Showcase */}
        <div className="pt-12 border-t border-[#171717]/10 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-[#A68642] tracking-[0.16em] uppercase">
                Editorial Feed
              </p>
              <h2 className="font-display text-2xl sm:text-3xl font-medium text-[#171717] mt-1">
                On Instagram · {websiteSettings.instagramHandle}
              </h2>
            </div>
            <a
              href={websiteSettings.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-xs font-medium text-[#171717] hover:text-[#A68642] transition-colors"
            >
              <Instagram className="w-4 h-4" aria-hidden="true" />
              <span>Follow {websiteSettings.instagramHandle}</span>
              <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
            </a>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {INSTAGRAM_SHOWCASE.map((post) => (
              <button
                key={post.id}
                type="button"
                onClick={() =>
                  post.category === 'Atelier'
                    ? navigate('custom-orders')
                    : navigate('shop', { category: post.category })
                }
                className="group text-left bg-[#F6F1E8] overflow-hidden border border-[#171717]/10 cursor-pointer"
              >
                <div className="aspect-[3/4] overflow-hidden">
                  <BrandImage
                    src={post.image}
                    alt={post.caption}
                    className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.04]"
                  />
                </div>
                <div className="p-3 bg-white">
                  <p className="text-xs text-[#171717]/75 truncate">{post.caption}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
