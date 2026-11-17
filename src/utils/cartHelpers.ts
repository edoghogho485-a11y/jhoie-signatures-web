import type { CartItem, Product } from '../types/fashion';

export function buildCartItemId(productId: string, size: string, color: string): string {
  return `${productId}__${size}__${color}`;
}

export function getMaxAllowedQuantity(product: Product): number {
  if (product.stockStatus === 'Out of Stock') return 0;
  if (product.stockStatus === 'Made to Order') return 20;
  return Math.max(0, product.stockQuantity);
}

export function addItemToCart(
  currentCart: CartItem[],
  params: {
    product: Product;
    selectedSize: string;
    selectedColor: string;
    quantity: number;
  }
): { nextCart: CartItem[]; addedQuantity: number } {
  const { product, selectedSize, selectedColor, quantity } = params;
  const maxAllowed = getMaxAllowedQuantity(product);
  if (product.stockStatus === 'Out of Stock' || maxAllowed <= 0) {
    return { nextCart: currentCart, addedQuantity: 0 };
  }

  const safeQty = Math.max(1, Math.min(quantity, maxAllowed));
  const itemKey = buildCartItemId(product.id, selectedSize, selectedColor);

  const existing = currentCart.find((item) => item.id === itemKey);
  if (existing) {
    const combinedQty = Math.min(existing.quantity + safeQty, maxAllowed);
    const nextCart = currentCart.map((item) =>
      item.id === itemKey ? { ...item, quantity: combinedQty } : item
    );
    return { nextCart, addedQuantity: Math.max(0, combinedQty - existing.quantity) };
  }

  const newItem: CartItem = {
    id: itemKey,
    productId: product.id,
    name: product.name,
    category: product.category,
    image: product.images[0] || '',
    priceNgn: product.priceNgn,
    selectedSize,
    selectedColor,
    quantity: safeQty,
  };

  return { nextCart: [...currentCart, newItem], addedQuantity: safeQty };
}

export function updateItemQuantityInCart(
  currentCart: CartItem[],
  cartItemId: string,
  nextQuantity: number,
  products?: Product[]
): CartItem[] {
  if (nextQuantity <= 0) {
    return currentCart.filter((item) => item.id !== cartItemId);
  }

  return currentCart.map((item) => {
    if (item.id !== cartItemId) return item;
    const product = products?.find((p) => p.id === item.productId);
    const maxAllowed = product ? getMaxAllowedQuantity(product) : 20;
    if (maxAllowed <= 0) {
      return nextQuantity < item.quantity ? { ...item, quantity: nextQuantity } : item;
    }
    const clampedQty = Math.min(nextQuantity, maxAllowed);
    return { ...item, quantity: clampedQty };
  });
}

export function removeItemFromCart(currentCart: CartItem[], cartItemId: string): CartItem[] {
  return currentCart.filter((item) => item.id !== cartItemId);
}

export function calculateCartTotals(cart: CartItem[]): {
  itemCount: number;
  subtotalNgn: number;
} {
  return cart.reduce(
    (acc, item) => ({
      itemCount: acc.itemCount + item.quantity,
      subtotalNgn: acc.subtotalNgn + item.priceNgn * item.quantity,
    }),
    { itemCount: 0, subtotalNgn: 0 }
  );
}
