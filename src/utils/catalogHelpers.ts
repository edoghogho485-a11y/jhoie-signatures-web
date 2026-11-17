import type { Product, ProductCategory, StockStatus } from '../types/fashion';

export type SortOption = 'newest' | 'oldest' | 'price-asc' | 'price-desc';

export interface CatalogFilterParams {
  products: Product[];
  category: ProductCategory | 'All';
  stockStatus?: StockStatus | 'All';
  searchQuery?: string;
  sortBy?: SortOption;
}

export function filterAndSortProducts({
  products,
  category,
  stockStatus = 'All',
  searchQuery = '',
  sortBy = 'newest',
}: CatalogFilterParams): Product[] {
  const query = searchQuery.trim().toLowerCase();

  const filtered = products.filter((product) => {
    const matchesCategory = category === 'All' || product.category === category;
    const matchesStock = stockStatus === 'All' || product.stockStatus === stockStatus;
    const matchesQuery =
      !query ||
      product.name.toLowerCase().includes(query) ||
      product.category.toLowerCase().includes(query) ||
      product.description.toLowerCase().includes(query) ||
      product.fabricAndCare.toLowerCase().includes(query);

    return matchesCategory && matchesStock && matchesQuery;
  });

  return [...filtered].sort((a, b) => {
    if (sortBy === 'price-asc') return a.priceNgn - b.priceNgn;
    if (sortBy === 'price-desc') return b.priceNgn - a.priceNgn;
    if (sortBy === 'oldest') {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

export function getCategoryCounts(
  products: Product[],
  categories: ProductCategory[]
): Record<string, number> {
  const counts: Record<string, number> = { All: products.length };
  for (const cat of categories) {
    counts[cat] = products.filter((p) => p.category === cat).length;
  }
  return counts;
}

export function findProductByIdOrSlug(
  products: Product[],
  idOrSlug?: string
): Product | undefined {
  if (!idOrSlug) return undefined;
  return products.find((p) => p.id === idOrSlug || p.slug === idOrSlug);
}
