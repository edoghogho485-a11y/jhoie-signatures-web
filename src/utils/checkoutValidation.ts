import type { CartItem, Product, StockStatus } from '../types/fashion';
import { getMaxAllowedQuantity } from './cartHelpers';
import { isValidOptionalEmail, isValidPhoneNumber } from './customOrderValidation';

export interface CheckoutFormInput {
  customerName: string;
  phoneNumber: string;
  email?: string;
  deliveryAddress: string;
  cityState: string;
}

export type CheckoutFieldErrors = Partial<Record<keyof CheckoutFormInput, string>>;

export interface CheckoutValidationResult {
  isValid: boolean;
  errors: CheckoutFieldErrors;
  firstErrorMessage: string | null;
}

export function validateCheckoutForm(input: CheckoutFormInput): CheckoutValidationResult {
  const errors: CheckoutFieldErrors = {};

  const trimmedName = input.customerName.trim();
  if (!trimmedName || trimmedName.length < 2) {
    errors.customerName = 'Please enter your full name (at least 2 characters).';
  }

  const trimmedPhone = input.phoneNumber.trim();
  if (!trimmedPhone) {
    errors.phoneNumber = 'Please enter your phone or WhatsApp number.';
  } else if (!isValidPhoneNumber(trimmedPhone)) {
    errors.phoneNumber =
      'Enter a valid phone or WhatsApp number with 10–15 digits (e.g. +234 801 234 5678 or 08012345678).';
  }

  if (!isValidOptionalEmail(input.email)) {
    errors.email = 'Please enter a valid email address or leave this optional field blank.';
  }

  const trimmedAddress = input.deliveryAddress.trim();
  if (!trimmedAddress || trimmedAddress.length < 5) {
    errors.deliveryAddress = 'Please enter your delivery street address (at least 5 characters).';
  }

  const trimmedCityState = input.cityState.trim();
  if (!trimmedCityState || trimmedCityState.length < 2) {
    errors.cityState = 'Please enter your city and state (e.g. Lagos, Abuja).';
  }

  const keys = Object.keys(errors) as (keyof CheckoutFieldErrors)[];
  return {
    isValid: keys.length === 0,
    errors,
    firstErrorMessage: keys.length > 0 ? errors[keys[0]] || null : null,
  };
}

export type CartStockIssueReason = 'unavailable' | 'out_of_stock' | 'exceeds_stock';

export interface CartStockIssue {
  cartItemId: string;
  productId: string;
  itemName: string;
  reason: CartStockIssueReason;
  availableStock: number;
  requestedQuantity: number;
  suggestedQuantity: number;
  message: string;
}

export interface CartStockValidationResult {
  isValid: boolean;
  issues: CartStockIssue[];
  issuesByCartItemId: Record<string, CartStockIssue>;
  summaryMessage: string | null;
}

export function validateCartStock(
  cart: CartItem[],
  products: Product[]
): CartStockValidationResult {
  const issues: CartStockIssue[] = [];
  const issuesByCartItemId: Record<string, CartStockIssue> = {};

  // Aggregate total requested per productId so splitting variants doesn't exceed shared product stock
  const totalRequestedByProduct = new Map<string, number>();
  for (const item of cart) {
    totalRequestedByProduct.set(
      item.productId,
      (totalRequestedByProduct.get(item.productId) || 0) + item.quantity
    );
  }

  const remainingCapacityByProduct = new Map<string, number>();

  for (const item of cart) {
    const product = products.find((p) => p.id === item.productId);

    if (!product) {
      const issue: CartStockIssue = {
        cartItemId: item.id,
        productId: item.productId,
        itemName: item.name,
        reason: 'unavailable',
        availableStock: 0,
        requestedQuantity: item.quantity,
        suggestedQuantity: 0,
        message: `"${item.name}" is no longer available in our catalogue. Please remove it from your bag before submitting.`,
      };
      issues.push(issue);
      issuesByCartItemId[item.id] = issue;
      continue;
    }

    const maxAllowed = getMaxAllowedQuantity(product);
    if (product.stockStatus === 'Out of Stock' || maxAllowed <= 0) {
      const issue: CartStockIssue = {
        cartItemId: item.id,
        productId: item.productId,
        itemName: product.name,
        reason: 'out_of_stock',
        availableStock: 0,
        requestedQuantity: item.quantity,
        suggestedQuantity: 0,
        message: `"${product.name}" is currently Out of Stock. Please remove it from your bag to proceed.`,
      };
      issues.push(issue);
      issuesByCartItemId[item.id] = issue;
      continue;
    }

    if (!remainingCapacityByProduct.has(product.id)) {
      remainingCapacityByProduct.set(product.id, maxAllowed);
    }

    const remaining = remainingCapacityByProduct.get(product.id) ?? 0;
    const totalRequested = totalRequestedByProduct.get(product.id) ?? item.quantity;

    if (item.quantity > remaining) {
      const clampedQty = Math.max(0, remaining);
      remainingCapacityByProduct.set(product.id, 0);

      const message =
        remaining === 0 && maxAllowed > 0
          ? `Only ${maxAllowed} unit${maxAllowed === 1 ? '' : 's'} of "${product.name}" ${
              maxAllowed === 1 ? 'is' : 'are'
            } available across your bag (total requested: ${totalRequested}). Please remove or reduce duplicate selections.`
          : totalRequested > maxAllowed && totalRequested !== item.quantity
          ? `Only ${maxAllowed} unit${maxAllowed === 1 ? '' : 's'} of "${product.name}" ${
              maxAllowed === 1 ? 'is' : 'are'
            } left in stock (combined across sizes/colours in your bag: ${totalRequested}).`
          : `Only ${maxAllowed} unit${maxAllowed === 1 ? '' : 's'} of "${product.name}" ${
              maxAllowed === 1 ? 'is' : 'are'
            } currently in stock (you have ${item.quantity} in your bag).`;

      const issue: CartStockIssue = {
        cartItemId: item.id,
        productId: item.productId,
        itemName: product.name,
        reason: remaining === 0 && maxAllowed > 0 ? 'exceeds_stock' : 'exceeds_stock',
        availableStock: maxAllowed,
        requestedQuantity: item.quantity,
        suggestedQuantity: clampedQty,
        message,
      };
      issues.push(issue);
      issuesByCartItemId[item.id] = issue;
    } else {
      remainingCapacityByProduct.set(product.id, remaining - item.quantity);
    }
  }

  return {
    isValid: issues.length === 0,
    issues,
    issuesByCartItemId,
    summaryMessage:
      issues.length === 0
        ? null
        : issues.length === 1
        ? issues[0].message
        : `${issues.length} items in your bag have updated availability or stock limits. Please review the highlighted items below before submitting.`,
  };
}

export interface ReconcileCartStockResult {
  nextCart: CartItem[];
  quantitiesAdjusted: boolean;
  hasBlockingUnavailableItems: boolean;
  adjustmentMessages: string[];
}

/**
 * Updates cart item quantities down to current available stock when stock decreased,
 * while flagging Out-of-Stock or deleted items visibly without silently deleting them.
 */
export function reconcileCartQuantitiesWithStock(
  cart: CartItem[],
  products: Product[]
): ReconcileCartStockResult {
  const validation = validateCartStock(cart, products);
  let quantitiesAdjusted = false;
  let hasBlockingUnavailableItems = false;
  const adjustmentMessages: string[] = [];

  const nextCart: CartItem[] = cart.map((item) => {
    const product = products.find((p) => p.id === item.productId);
    const issue = validation.issuesByCartItemId[item.id];

    const syncedBase: CartItem = product
      ? {
          ...item,
          name: product.name,
          category: product.category,
          priceNgn: product.priceNgn,
          image: product.images[0] || item.image,
        }
      : item;

    if (!issue) {
      return syncedBase;
    }

    if (issue.reason === 'unavailable' || issue.reason === 'out_of_stock') {
      hasBlockingUnavailableItems = true;
      adjustmentMessages.push(issue.message);
      return syncedBase;
    }

    // exceeds_stock: reduce to suggestedQuantity if >= 1; otherwise flag for removal
    if (issue.suggestedQuantity >= 1 && issue.suggestedQuantity < item.quantity) {
      quantitiesAdjusted = true;
      adjustmentMessages.push(
        `Adjusted quantity of "${syncedBase.name}" (${syncedBase.selectedSize}, ${syncedBase.selectedColor}) from ${item.quantity} to ${issue.suggestedQuantity} to match available stock.`
      );
      return { ...syncedBase, quantity: issue.suggestedQuantity };
    }

    hasBlockingUnavailableItems = true;
    adjustmentMessages.push(issue.message);
    return syncedBase;
  });

  return {
    nextCart,
    quantitiesAdjusted,
    hasBlockingUnavailableItems,
    adjustmentMessages,
  };
}

/**
 * Returns authoritative cart items refreshed from the current product catalogue.
 */
export function refreshCartItemsFromCatalog(cart: CartItem[], products: Product[]): CartItem[] {
  return cart.map((item) => {
    const product = products.find((p) => p.id === item.productId);
    if (!product) return item;
    return {
      ...item,
      name: product.name,
      category: product.category,
      priceNgn: product.priceNgn,
      image: product.images[0] || item.image,
    };
  });
}

/**
 * Applies post-order inventory decrements safely. Never produces negative stockQuantity.
 */
export function applyOrderInventoryUpdates(
  products: Product[],
  orderedItems: CartItem[]
): Product[] {
  const orderedTotals = new Map<string, number>();
  for (const item of orderedItems) {
    const safeQty = Math.max(0, Math.floor(item.quantity));
    if (safeQty > 0) {
      orderedTotals.set(item.productId, (orderedTotals.get(item.productId) || 0) + safeQty);
    }
  }

  if (orderedTotals.size === 0) return products;

  return products.map((product) => {
    const orderedQty = orderedTotals.get(product.id);
    if (!orderedQty) return product;

    const currentStock = Math.max(0, Math.floor(product.stockQuantity));
    const nextStock = Math.max(0, currentStock - orderedQty);

    if (product.stockStatus === 'Made to Order') {
      return {
        ...product,
        stockQuantity: nextStock,
      };
    }

    let nextStatus: StockStatus = product.stockStatus;
    if (nextStock === 0) {
      nextStatus = 'Out of Stock';
    } else if (nextStock <= 2) {
      nextStatus = 'Low Stock';
    }

    return {
      ...product,
      stockQuantity: nextStock,
      stockStatus: nextStatus,
    };
  });
}
