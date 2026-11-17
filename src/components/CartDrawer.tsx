import { AlertTriangle, MessageCircle, Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { getMaxAllowedQuantity } from '../utils/cartHelpers';
import { validateCartStock } from '../utils/checkoutValidation';
import { buildCartWhatsAppMessage, formatNaira } from '../utils/formatters';
import { BrandImage } from './BrandImage';

export function CartDrawer() {
  const {
    products,
    cart,
    cartCount,
    cartSubtotalNgn,
    isCartOpen,
    closeCart,
    updateCartQuantity,
    removeFromCart,
    clearCart,
    navigate,
    openWhatsAppModal,
    showToast,
    customerSession,
  } = useStore();

  const stockCheck = useMemo(() => validateCartStock(cart, products), [cart, products]);

  if (!isCartOpen) return null;

  const handleWhatsAppCheckout = () => {
    if (!stockCheck.isValid) {
      showToast('Please adjust or remove unavailable items in your bag first');
      return;
    }
    const msg = buildCartWhatsAppMessage({
      items: cart,
      subtotalNgn: cartSubtotalNgn,
    });
    openWhatsAppModal('Order Bag via WhatsApp', msg);
  };

  const handleClearCart = () => {
    clearCart();
    showToast('Shopping bag cleared');
  };

  const handleProceedToCheckout = () => {
    if (!customerSession?.isAuthenticated) {
      showToast('Please sign in or create an account to complete checkout — your bag is saved');
      navigate('login', { redirectAfterAuth: 'checkout' });
      return;
    }
    navigate('checkout');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label="Shopping Bag"
    >
      {/* Backdrop */}
      <div
        onClick={closeCart}
        className="fixed inset-0 bg-[#171717]/50 backdrop-blur-[2px] transition-opacity"
      />

      {/* Drawer Panel */}
      <div className="relative z-10 w-full max-w-md bg-white h-full flex flex-col shadow-2xl border-l border-[#171717]/10">
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#171717]/10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="w-5 h-5 text-[#A68642]" aria-hidden="true" />
            <h2 className="font-display text-2xl font-semibold text-[#171717] tabular-nums">
              Shopping Bag ({cartCount})
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {cart.length > 0 && (
              <button
                type="button"
                onClick={handleClearCart}
                className="text-xs text-[#171717]/55 hover:text-red-700 underline underline-offset-4 px-2 py-1 cursor-pointer"
              >
                Clear
              </button>
            )}
            <button
              type="button"
              onClick={closeCart}
              aria-label="Close shopping bag"
              className="w-10 h-10 inline-flex items-center justify-center text-[#171717]/70 hover:text-[#171717] hover:bg-[#F6F1E8] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-12 space-y-5">
              <div className="w-14 h-14 bg-[#F6F1E8] flex items-center justify-center">
                <ShoppingBag className="w-6 h-6 text-[#A68642]" aria-hidden="true" />
              </div>
              <div className="space-y-1.5 max-w-xs">
                <p className="font-display text-2xl text-[#171717]">Your shopping bag is empty</p>
                <p className="text-sm text-[#171717]/65">
                  Explore our ready-to-wear sample catalogue or request a made-to-measure outfit.
                </p>
              </div>
              <div className="pt-2 flex flex-wrap justify-center gap-2.5">
                <button
                  type="button"
                  onClick={() => navigate('shop', { category: 'All' })}
                  className="px-5 py-2.5 bg-[#171717] text-white text-xs font-medium hover:bg-[#2a2a2a] transition-colors cursor-pointer"
                >
                  Browse Shop
                </button>
                <button
                  type="button"
                  onClick={() => navigate('shop', { category: 'Gowns' })}
                  className="px-4 py-2.5 bg-[#F6F1E8] text-[#171717] text-xs font-medium hover:bg-[#ebe3d4] transition-colors cursor-pointer"
                >
                  Gowns
                </button>
                <button
                  type="button"
                  onClick={() => navigate('shop', { category: 'Dresses' })}
                  className="px-4 py-2.5 bg-[#F6F1E8] text-[#171717] text-xs font-medium hover:bg-[#ebe3d4] transition-colors cursor-pointer"
                >
                  Dresses
                </button>
                <button
                  type="button"
                  onClick={() => navigate('custom-orders')}
                  className="px-5 py-2.5 border border-[#171717]/20 text-[#171717] text-xs font-medium hover:border-[#171717] transition-colors cursor-pointer"
                >
                  Custom Orders
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {!stockCheck.isValid && (
                <div
                  role="alert"
                  className="p-3.5 bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-800"
                >
                  <AlertTriangle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" aria-hidden="true" />
                  <p className="leading-relaxed">
                    {stockCheck.summaryMessage ||
                      'Some items in your bag have updated availability or stock limits. Please review them below.'}
                  </p>
                </div>
              )}

              <ul className="divide-y divide-[#171717]/10">
                {cart.map((item) => {
                  const matchedProduct = products.find((p) => p.id === item.productId);
                  const maxQty = matchedProduct ? getMaxAllowedQuantity(matchedProduct) : 0;
                  const issue = stockCheck.issuesByCartItemId[item.id];

                  return (
                    <li
                      key={item.id}
                      className={`py-4 first:pt-0 flex gap-4 ${
                        issue ? 'bg-red-50/40 -mx-2 px-2' : ''
                      }`}
                    >
                      <div className="w-20 h-26 bg-[#F6F1E8] shrink-0 overflow-hidden">
                        <BrandImage
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover object-top"
                        />
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => navigate('product', { productId: item.productId })}
                              className="text-left font-display text-lg font-medium text-[#171717] leading-snug hover:text-[#A68642] transition-colors cursor-pointer"
                            >
                              {item.name}
                            </button>
                            <button
                              type="button"
                              onClick={() => removeFromCart(item.id)}
                              aria-label={`Remove ${item.name}`}
                              className="text-[#171717]/45 hover:text-red-700 p-1 transition-colors cursor-pointer shrink-0"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <p className="text-xs text-[#171717]/60 mt-1">
                            Size: {item.selectedSize} · Colour: {item.selectedColor}
                          </p>
                          <p className="text-[11px] text-[#171717]/50 mt-0.5 tabular-nums">
                            Unit: {formatNaira(item.priceNgn)}
                          </p>
                          {issue && (
                            <div className="mt-2 space-y-1.5">
                              <p className="text-xs text-red-700 leading-snug">{issue.message}</p>
                              <div className="flex flex-wrap gap-2">
                                {issue.reason === 'exceeds_stock' && issue.suggestedQuantity >= 1 ? (
                                  <button
                                    type="button"
                                    onClick={() => updateCartQuantity(item.id, issue.suggestedQuantity)}
                                    className="px-2.5 py-1 bg-[#171717] text-white text-[11px] font-medium hover:bg-[#2a2a2a] transition-colors cursor-pointer"
                                  >
                                    Update to {issue.suggestedQuantity}
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => removeFromCart(item.id)}
                                    className="px-2.5 py-1 bg-red-700 text-white text-[11px] font-medium hover:bg-red-800 transition-colors cursor-pointer"
                                  >
                                    Remove Item
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between gap-3 pt-3">
                          <div className="inline-flex items-center border border-[#171717]/15">
                            <button
                              type="button"
                              onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                              aria-label="Decrease quantity"
                              className="w-8 h-8 inline-flex items-center justify-center text-[#171717] hover:bg-[#F6F1E8] transition-colors cursor-pointer"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="w-9 text-center text-xs font-medium tabular-nums">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              disabled={item.quantity >= maxQty}
                              onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                              aria-label="Increase quantity"
                              className="w-8 h-8 inline-flex items-center justify-center text-[#171717] hover:bg-[#F6F1E8] disabled:opacity-40 transition-colors cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <span className="text-sm font-semibold text-[#171717] tabular-nums">
                            {formatNaira(item.priceNgn * item.quantity)}
                          </span>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        {/* Footer Totals & Actions */}
        {cart.length > 0 && (
          <div className="px-6 py-5 border-t border-[#171717]/10 bg-[#FAF7F2] space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-sm text-[#171717]/75">
                <span>Subtotal ({cartCount} items · Sample Pricing)</span>
                <span className="font-semibold text-[#171717] tabular-nums">
                  {formatNaira(cartSubtotalNgn)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-[#171717]/60">
                <span>Delivery</span>
                <span>Confirmed upon order review</span>
              </div>
              <div className="pt-2 border-t border-[#171717]/10 flex items-center justify-between">
                <span className="text-sm font-semibold text-[#171717]">Estimated Total</span>
                <span className="text-lg font-semibold text-[#171717] tabular-nums">
                  {formatNaira(cartSubtotalNgn)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              <button
                type="button"
                onClick={handleProceedToCheckout}
                className="w-full py-3 px-4 bg-[#171717] text-white text-sm font-medium hover:bg-[#2a2a2a] transition-colors cursor-pointer"
              >
                Proceed to Order Request
              </button>
              <button
                type="button"
                onClick={handleWhatsAppCheckout}
                className="w-full py-3 px-4 border border-[#171717]/20 bg-white text-[#171717] text-sm font-medium hover:border-[#C6A45C] hover:bg-[#F6F1E8] transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <MessageCircle className="w-4 h-4 text-[#A68642]" aria-hidden="true" />
                <span>Order via WhatsApp</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
