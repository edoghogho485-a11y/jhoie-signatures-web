import { Plus } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import type { Product } from '../types/fashion';
import { formatNaira } from '../utils/formatters';
import { BrandImage } from './BrandImage';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { navigate, addToCart } = useStore();

  const handleOpenProduct = () => {
    navigate('product', { productId: product.id });
  };

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToCart({
      product,
      selectedSize: product.sizes[0] || 'M',
      selectedColor: product.colors[0]?.name || 'Default',
      quantity: 1,
      openDrawer: true,
    });
  };

  return (
    <article className="group flex flex-col bg-white border border-[#171717]/10 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      {/* 3:4 Portrait Media Frame */}
      <div
        onClick={handleOpenProduct}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleOpenProduct();
          }
        }}
        aria-label={`View details for ${product.name}`}
        className="relative aspect-[3/4] w-full overflow-hidden bg-[#F6F1E8] cursor-pointer"
      >
        <BrandImage
          src={product.images[0]}
          alt={product.name}
          fallbackLabel={product.category}
          className="w-full h-full object-cover object-top transition-transform duration-500 ease-out group-hover:scale-[1.03]"
        />

        {product.stockStatus !== 'Out of Stock' && (
          <div className="absolute inset-x-3 bottom-3 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-200 hidden sm:block">
            <button
              type="button"
              onClick={handleQuickAdd}
              className="w-full py-2.5 px-4 bg-[#171717]/95 text-white text-xs font-medium tracking-wide hover:bg-[#171717] transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-[#C6A45C]" aria-hidden="true" />
              <span>Quick Add ({product.sizes[0]})</span>
            </button>
          </div>
        )}
      </div>

      {/* Product Metadata — clean unboxed typography */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between gap-3">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs text-[#171717]/60">
            <span>{product.category}</span>
            <span aria-hidden="true">·</span>
            <span
              className={
                product.stockStatus === 'Out of Stock'
                  ? 'text-red-700 font-medium'
                  : product.stockStatus === 'Low Stock'
                  ? 'text-[#A68642] font-medium'
                  : 'text-[#171717]/65'
              }
            >
              {product.stockStatus}
            </span>
          </div>

          <h3 className="font-display text-lg sm:text-xl font-medium text-[#171717] leading-snug">
            <button
              type="button"
              onClick={handleOpenProduct}
              className="text-left hover:text-[#A68642] transition-colors cursor-pointer"
            >
              {product.name}
            </button>
          </h3>
        </div>

        <div className="pt-2 border-t border-[#171717]/8 flex items-center justify-between gap-3">
          <span className="text-[15px] font-semibold text-[#171717] tabular-nums">
            {formatNaira(product.priceNgn)}
          </span>
          <button
            type="button"
            onClick={handleOpenProduct}
            className="text-xs font-medium text-[#171717]/80 hover:text-[#A68642] underline underline-offset-4 transition-colors cursor-pointer whitespace-nowrap"
          >
            View Details
          </button>
        </div>
      </div>
    </article>
  );
}
