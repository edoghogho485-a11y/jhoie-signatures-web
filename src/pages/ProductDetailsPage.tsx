import {
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Minus,
  Plus,
  RefreshCw,
  Ruler,
  ShoppingBag,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { BrandImage } from '../components/BrandImage';
import { ProductCard } from '../components/ProductCard';
import { useStore } from '../context/StoreContext';
import { SAMPLE_SIZE_GUIDE } from '../data/sampleCatalog';
import { getMaxAllowedQuantity } from '../utils/cartHelpers';
import { findProductByIdOrSlug } from '../utils/catalogHelpers';
import { buildProductWhatsAppMessage, formatNaira } from '../utils/formatters';

export function ProductDetailsPage() {
  const {
    products,
    selectedProductId,
    navigate,
    addToCart,
    openWhatsAppModal,
    isCatalogLoading,
    catalogError,
    reloadCatalog,
  } = useStore();

  const product = selectedProductId
    ? findProductByIdOrSlug(products, selectedProductId)
    : undefined;

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState(() => product?.sizes[0] || 'M');
  const [selectedColor, setSelectedColor] = useState(() => product?.colors[0]?.name || 'Default');
  const [quantity, setQuantity] = useState(1);
  const [showSizeGuide, setShowSizeGuide] = useState(false);

  useEffect(() => {
    if (!product) return;
    setActiveImageIndex(0);
    setSelectedSize(product.sizes[0] || 'M');
    setSelectedColor(product.colors[0]?.name || 'Default');
    setQuantity(1);
    setShowSizeGuide(false);
  }, [product]);

  if (!product && isCatalogLoading) {
    return (
      <div className="bg-white min-h-[70vh]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-10 lg:py-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 animate-pulse">
            <div className="lg:col-span-7 aspect-[3/4] bg-[#F6F1E8]" />
            <div className="lg:col-span-5 bg-[#FAF7F2] border border-[#171717]/10 p-8 space-y-5">
              <div className="h-3 w-32 bg-[#F6F1E8]" />
              <div className="h-9 w-3/4 bg-[#F6F1E8]" />
              <div className="h-7 w-40 bg-[#F6F1E8]" />
              <div className="h-24 w-full bg-[#F6F1E8]" />
              <div className="h-12 w-full bg-[#F6F1E8]" />
              <div className="h-12 w-full bg-[#F6F1E8]" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product && catalogError && products.length === 0) {
    return (
      <div className="bg-white min-h-[70vh]">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16">
          <div className="bg-red-50 border border-red-200 p-8 text-center space-y-4">
            <h1 className="font-display text-3xl font-medium text-[#171717]">
              Unable to Load Outfit Details
            </h1>
            <p className="text-sm text-[#171717]/75">{catalogError}</p>
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => void reloadCatalog()}
                className="px-6 py-3 bg-[#171717] text-white text-xs sm:text-sm font-medium inline-flex items-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4 text-[#C6A45C]" aria-hidden="true" />
                <span>Retry</span>
              </button>
              <button
                type="button"
                onClick={() => navigate('shop', { category: 'All' })}
                className="px-6 py-3 border border-[#171717]/20 bg-white text-[#171717] text-xs sm:text-sm font-medium cursor-pointer"
              >
                Back to Shop
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    const isCatalogueEmpty = products.length === 0;
    const suggestedProducts = products.slice(0, 3);

    return (
      <div className="bg-white min-h-[70vh]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-14 lg:py-20 space-y-14">
          <div className="max-w-2xl mx-auto bg-[#FAF7F2] border border-[#171717]/15 p-8 sm:p-10 text-center space-y-5">
            <div className="w-12 h-12 mx-auto bg-[#171717] text-[#C6A45C] flex items-center justify-center">
              <ShoppingBag className="w-5 h-5" aria-hidden="true" />
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-[#A68642] tracking-[0.16em] uppercase">
                {isCatalogueEmpty ? 'Catalogue Unavailable' : 'Piece Not Found'}
              </p>
              <h1 className="font-display text-3xl sm:text-4xl font-medium text-[#171717]">
                {isCatalogueEmpty
                  ? 'No Ready-to-Wear Pieces Available Right Now'
                  : 'We Could Not Find That Outfit'}
              </h1>
              <p className="text-sm text-[#171717]/70 leading-relaxed">
                {isCatalogueEmpty
                  ? 'Our ready-to-wear catalogue is currently empty or being updated. You can return to the Shop or request a bespoke made-to-measure design.'
                  : 'The product you requested may have been removed, updated, or its link is no longer available.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => navigate('shop', { category: 'All' })}
                className="px-6 py-3 bg-[#171717] text-white text-xs sm:text-sm font-medium hover:bg-[#2a2a2a] transition-colors inline-flex items-center gap-2 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 text-[#C6A45C]" aria-hidden="true" />
                <span>Back to Shop</span>
              </button>
              <button
                type="button"
                onClick={() => navigate('custom-orders')}
                className="px-6 py-3 border border-[#171717]/20 bg-white text-[#171717] text-xs sm:text-sm font-medium hover:border-[#C6A45C] hover:bg-[#F6F1E8] transition-colors cursor-pointer"
              >
                Request Custom Order
              </button>
            </div>
          </div>

          {suggestedProducts.length > 0 && (
            <section className="pt-10 border-t border-[#171717]/10 space-y-6">
              <div className="flex items-end justify-between gap-4">
                <h2 className="font-display text-2xl sm:text-3xl font-medium text-[#171717]">
                  Available Collection Pieces
                </h2>
                <button
                  type="button"
                  onClick={() => navigate('shop', { category: 'All' })}
                  className="text-xs font-medium text-[#171717] hover:text-[#A68642] underline underline-offset-4 cursor-pointer"
                >
                  View Full Shop
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                {suggestedProducts.map((item) => (
                  <ProductCard key={item.id} product={item} />
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    );
  }

  const maxQuantity = getMaxAllowedQuantity(product);
  const isOutOfStock = product.stockStatus === 'Out of Stock' || maxQuantity <= 0;
  const activeImageSrc = product.images[activeImageIndex] || product.images[0] || '';

  const relatedProducts = products
    .filter((p) => p.id !== product.id)
    .sort((a, b) => (a.category === product.category ? -1 : b.category === product.category ? 1 : 0))
    .slice(0, 3);

  const handlePrevImage = () => {
    if (product.images.length <= 1) return;
    setActiveImageIndex((prev) => (prev === 0 ? product.images.length - 1 : prev - 1));
  };

  const handleNextImage = () => {
    if (product.images.length <= 1) return;
    setActiveImageIndex((prev) => (prev === product.images.length - 1 ? 0 : prev + 1));
  };

  const handleAddToCart = () => {
    if (isOutOfStock) return;
    addToCart({
      product,
      selectedSize,
      selectedColor,
      quantity,
      openDrawer: true,
    });
  };

  const handleOrderViaWhatsApp = () => {
    const message = buildProductWhatsAppMessage({
      productName: product.name,
      priceNgn: product.priceNgn,
      size: selectedSize,
      color: selectedColor,
      quantity,
      isSample: product.isSample,
    });
    openWhatsAppModal('Order via WhatsApp', message);
  };

  return (
    <div className="bg-white pb-20 lg:pb-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-8 lg:py-12">
        {/* Breadcrumb */}
        <div className="pb-6 flex flex-wrap items-center justify-between gap-3 text-xs text-[#171717]/70">
          <button
            type="button"
            onClick={() => navigate('shop', { category: product.category })}
            className="inline-flex items-center gap-2 font-medium hover:text-[#171717] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            <span>Back to {product.category}</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('shop', { category: 'All' })}
            className="hover:text-[#A68642] underline underline-offset-4 cursor-pointer"
          >
            View Full Catalogue
          </button>
        </div>

        {/* Contiguous Purchase Module: Large Gallery Left + Sticky Purchase Module Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
          {/* Left: Product Photography Gallery */}
          <div className="lg:col-span-7 space-y-4">
            <div className="relative aspect-[3/4] w-full bg-[#F6F1E8] overflow-hidden border border-[#171717]/10">
              <BrandImage
                src={activeImageSrc}
                alt={`${product.name} — view ${activeImageIndex + 1}`}
                priority
                className="w-full h-full object-cover object-top"
              />

              {product.images.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={handlePrevImage}
                    aria-label="Previous product image"
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 hover:bg-white text-[#171717] flex items-center justify-center border border-[#171717]/15 transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNextImage}
                    aria-label="Next product image"
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 hover:bg-white text-[#171717] flex items-center justify-center border border-[#171717]/15 transition-colors cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>

            {product.images.length > 1 && (
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                {product.images.map((img, idx) => (
                  <button
                    key={`${img}-${idx}`}
                    type="button"
                    onClick={() => setActiveImageIndex(idx)}
                    aria-label={`View photograph ${idx + 1}`}
                    className={`aspect-[3/4] overflow-hidden bg-[#F6F1E8] border transition-colors cursor-pointer ${
                      activeImageIndex === idx
                        ? 'border-[#171717] ring-1 ring-[#171717]'
                        : 'border-[#171717]/15 opacity-75 hover:opacity-100'
                    }`}
                  >
                    <BrandImage
                      src={img}
                      alt={`${product.name} thumbnail ${idx + 1}`}
                      className="w-full h-full object-cover object-top"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: Contiguous Purchase Module */}
          <div className="lg:col-span-5 lg:sticky lg:top-24 space-y-6 bg-[#FAF7F2] border border-[#171717]/10 p-6 sm:p-8">
            <div className="space-y-2 pb-5 border-b border-[#171717]/10">
              <div className="flex flex-wrap items-center gap-2 text-xs text-[#171717]/65">
                <span>{product.category}</span>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1 font-medium text-[#171717]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#A68642]" aria-hidden="true" />
                  <span>
                    {product.stockStatus}
                    {product.stockStatus !== 'Out of Stock'
                      ? product.isSample
                        ? ` (${product.stockQuantity} sample units)`
                        : ` (${product.stockQuantity} available)`
                      : ''}
                  </span>
                </span>
              </div>

              <h1 className="font-display text-3xl sm:text-4xl font-medium text-[#171717] leading-tight">
                {product.name}
              </h1>

              <div className="pt-2 flex items-baseline gap-3">
                <span className="text-2xl font-semibold text-[#171717] tabular-nums">
                  {formatNaira(product.priceNgn)}
                </span>
                <span className="text-xs text-[#171717]/55">
                  {product.isSample ? 'Sample Public Price (NGN)' : 'Public Price (NGN)'}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-[#171717]/80 leading-relaxed">{product.description}</p>
              {product.isSample && (
                <p className="text-[11px] text-[#171717]/55">
                  Note: This is a clearly labelled sample entry with placeholder photography until
                  actual JHOIE SIGNATURES inventory images arrive.
                </p>
              )}
            </div>

            {/* Size Selector + Collapsible Sample Size Reference */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs gap-3">
                <span className="font-semibold text-[#171717]">
                  Size: <span className="font-normal text-[#171717]/75">{selectedSize}</span>
                </span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowSizeGuide((prev) => !prev)}
                    className="inline-flex items-center gap-1 text-[#171717]/75 hover:text-[#A68642] underline underline-offset-4 cursor-pointer"
                  >
                    <Ruler className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{showSizeGuide ? 'Hide Size Guide' : 'Size Guide'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('custom-orders')}
                    className="text-[#A68642] hover:underline underline-offset-4 cursor-pointer"
                  >
                    Custom Fit
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {product.sizes.map((size) => {
                  const active = selectedSize === size;
                  return (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setSelectedSize(size)}
                      className={`min-w-[48px] px-3.5 py-2 text-xs font-medium border transition-colors cursor-pointer ${
                        active
                          ? 'bg-[#171717] text-white border-[#171717]'
                          : 'bg-white text-[#171717] border-[#171717]/20 hover:border-[#171717]'
                      }`}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>

              {showSizeGuide && (
                <div className="mt-3 p-3.5 bg-white border border-[#171717]/10 space-y-2">
                  <p className="text-[11px] font-semibold text-[#171717]">
                    {product.isSample
                      ? 'Sample Size Reference (Inches)'
                      : 'Atelier Size Reference (Inches)'}
                  </p>
                  <table className="w-full text-left text-[11px] tabular-nums">
                    <thead>
                      <tr className="border-b border-[#171717]/10 text-[#171717]/60">
                        <th className="py-1 font-medium">Size</th>
                        <th className="py-1 font-medium">Bust</th>
                        <th className="py-1 font-medium">Waist</th>
                        <th className="py-1 font-medium">Hips</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#171717]/8">
                      {SAMPLE_SIZE_GUIDE.map((row) => (
                        <tr key={row.size}>
                          <td className="py-1 font-medium text-[#171717]">{row.size}</td>
                          <td className="py-1 text-[#171717]/75">{row.bustIn}</td>
                          <td className="py-1 text-[#171717]/75">{row.waistIn}</td>
                          <td className="py-1 text-[#171717]/75">{row.hipsIn}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Colour Selector */}
            <div className="space-y-2.5">
              <p className="text-xs font-semibold text-[#171717]">
                Colour: <span className="font-normal text-[#171717]/75">{selectedColor}</span>
              </p>
              <div className="flex flex-wrap gap-2.5">
                {product.colors.map((color) => {
                  const active = selectedColor === color.name;
                  return (
                    <button
                      key={color.name}
                      type="button"
                      onClick={() => setSelectedColor(color.name)}
                      className={`inline-flex items-center gap-2 px-3 py-2 text-xs border transition-colors cursor-pointer ${
                        active
                          ? 'bg-white border-[#171717] font-semibold text-[#171717]'
                          : 'bg-white/70 border-[#171717]/15 text-[#171717]/75 hover:border-[#171717]/40'
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className="w-3.5 h-3.5 rounded-full border border-[#171717]/20"
                        style={{ backgroundColor: color.hex }}
                      />
                      <span>{color.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quantity & Primary CTAs */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs font-semibold text-[#171717]">Quantity</span>
                <div className="inline-flex items-center border border-[#171717]/20 bg-white">
                  <button
                    type="button"
                    disabled={isOutOfStock || quantity <= 1}
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    aria-label="Decrease quantity"
                    className="w-10 h-10 inline-flex items-center justify-center hover:bg-[#F6F1E8] disabled:opacity-40 transition-colors cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-10 text-center text-sm font-medium tabular-nums">
                    {isOutOfStock ? 0 : quantity}
                  </span>
                  <button
                    type="button"
                    disabled={isOutOfStock || quantity >= maxQuantity}
                    onClick={() => setQuantity((q) => Math.min(maxQuantity, q + 1))}
                    aria-label="Increase quantity"
                    className="w-10 h-10 inline-flex items-center justify-center hover:bg-[#F6F1E8] disabled:opacity-40 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <button
                type="button"
                disabled={isOutOfStock}
                onClick={handleAddToCart}
                className="w-full py-3.5 px-6 bg-[#171717] text-white text-sm font-medium hover:bg-[#2a2a2a] disabled:opacity-50 transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4 text-[#C6A45C]" aria-hidden="true" />
                <span>
                  {isOutOfStock
                    ? 'Currently Out of Stock'
                    : `Add to Cart — ${formatNaira(product.priceNgn * quantity)}`}
                </span>
              </button>

              <button
                type="button"
                onClick={handleOrderViaWhatsApp}
                className="w-full py-3.5 px-6 border border-[#171717]/25 bg-white text-[#171717] text-sm font-medium hover:border-[#C6A45C] hover:bg-[#F6F1E8] transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <MessageCircle className="w-4 h-4 text-[#A68642]" aria-hidden="true" />
                <span>Order via WhatsApp</span>
              </button>
            </div>

            <div className="pt-4 border-t border-[#171717]/10 text-xs text-[#171717]/65 space-y-1">
              <p className="font-semibold text-[#171717]">Fabric &amp; Care</p>
              <p>{product.fabricAndCare}</p>
            </div>
          </div>
        </div>

        {/* Related Pieces */}
        <section className="mt-20 pt-12 border-t border-[#171717]/10 space-y-8">
          <div className="flex items-end justify-between gap-4">
            <h2 className="font-display text-2xl sm:text-3xl font-medium text-[#171717]">
              {product.isSample ? 'More Sample Pieces' : 'More from JHOIE SIGNATURES'}
            </h2>
            <button
              type="button"
              onClick={() => navigate('shop', { category: 'All' })}
              className="text-xs font-medium text-[#171717] hover:text-[#A68642] underline underline-offset-4 cursor-pointer"
            >
              View All
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {relatedProducts.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      </div>

      {/* Slim Mobile Bottom Sticky Action Bar (under 15% mobile height cap) */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur-md border-t border-[#171717]/10 px-4 py-2.5 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] text-[#171717]/60 truncate">
            {selectedSize} · {selectedColor}
          </p>
          <p className="text-sm font-semibold text-[#171717] tabular-nums">
            {formatNaira(product.priceNgn * quantity)}
          </p>
        </div>
        <button
          type="button"
          disabled={isOutOfStock}
          onClick={handleAddToCart}
          className="px-5 py-2.5 bg-[#171717] text-white text-xs font-medium hover:bg-[#2a2a2a] disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
        >
          {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
        </button>
      </div>
    </div>
  );
}
