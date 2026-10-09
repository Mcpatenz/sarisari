/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  Sparkles,
  ArrowRight,
  TrendingDown,
  User,
  X,
  CreditCard,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { formatCentavos } from '../../lib/pricing';
import { CheckoutModal } from './CheckoutModal';
import { ReceiptModal } from './ReceiptModal';
import { LocalSale } from '../../types';

interface CartPanelProps {
  isMobileDrawer?: boolean;
  onCloseMobileDrawer?: () => void;
}

export const CartPanel: React.FC<CartPanelProps> = ({
  isMobileDrawer,
  onCloseMobileDrawer,
}) => {
  const { cart, cartSummary, updateCartItemQty, removeCartItem, clearCart } = useStore();

  const [customerName, setCustomerName] = useState('');
  const [showCheckout, setShowCheckout] = useState(false);
  const [completedSale, setCompletedSale] = useState<LocalSale | null>(null);

  const handleOpenCheckout = () => {
    if (cart.length === 0) return;
    setShowCheckout(true);
  };

  const handleSaleFinished = (sale: LocalSale) => {
    setShowCheckout(false);
    setCompletedSale(sale);
    setCustomerName('');
    if (onCloseMobileDrawer) onCloseMobileDrawer();
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Cart Header */}
      <div className="p-3.5 bg-slate-900 text-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center font-bold text-xs text-white">
            <ShoppingBag className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-white">Current Basket</h3>
            <p className="text-[11px] text-slate-400">
              {cart.length} {cart.length === 1 ? 'item' : 'items'} ({cartSummary.itemCount} units)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {cart.length > 0 && (
            <button
              type="button"
              onClick={clearCart}
              className="text-[11px] font-semibold text-rose-300 hover:text-rose-100 px-2 py-1 rounded bg-rose-950/60 hover:bg-rose-900/60 border border-rose-800/60 transition"
              title="Clear all items in cart"
            >
              Clear
            </button>
          )}

          {isMobileDrawer && (
            <button
              onClick={onCloseMobileDrawer}
              className="p-1 rounded-lg text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Customer / Suki Field */}
      <div className="p-2.5 bg-slate-50 border-b border-slate-100 flex items-center gap-2 text-xs">
        <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <input
          type="text"
          placeholder="Customer / Suki name (optional)..."
          value={customerName}
          onChange={e => setCustomerName(e.target.value)}
          className="w-full bg-transparent border-none text-xs text-slate-800 focus:outline-hidden placeholder-slate-400"
        />
      </div>

      {/* Cart Items List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 divide-y divide-slate-100">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-400">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-300 mb-2">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <p className="text-xs font-semibold text-slate-600">Basket is empty</p>
            <p className="text-[11px] text-slate-400 mt-0.5 max-w-[200px]">
              Tap products from the catalog to add tingi items or customized weights.
            </p>
          </div>
        ) : (
          cart.map(item => {
            const step = item.baseUnit === 'GRAM' ? 250 : 1;
            return (
              <div key={item.id} className="pt-2 first:pt-0 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h5 className="font-bold text-xs text-slate-900 truncate">
                      {item.productName}
                    </h5>
                    <p className="text-[11px] text-slate-500 font-medium truncate">
                      {item.appliedRuleDescription}
                    </p>
                    {item.savingsCentavos !== undefined && item.savingsCentavos > 0 && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded">
                        <TrendingDown className="w-2.5 h-2.5" />
                        Save {formatCentavos(item.savingsCentavos)}
                      </span>
                    )}
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-black text-sm text-slate-900">
                      {formatCentavos(item.lineTotalCentavos)}
                    </span>
                  </div>
                </div>

                {/* Quantity Controls & Delete */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-1.5 bg-slate-100 rounded-lg p-0.5">
                    <button
                      type="button"
                      onClick={() => updateCartItemQty(item.id, item.quantityBase - step)}
                      className="w-6 h-6 rounded-md bg-white hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold shadow-2xs transition active:scale-95"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-xs font-extrabold text-slate-800 min-w-[50px] text-center">
                      {item.displayQuantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateCartItemQty(item.id, item.quantityBase + step)}
                      className="w-6 h-6 rounded-md bg-white hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold shadow-2xs transition active:scale-95"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeCartItem(item.id)}
                    className="p-1 rounded-md text-slate-400 hover:text-rose-600 transition"
                    title="Remove item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Cart Summary & Checkout */}
      {cart.length > 0 && (
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 space-y-3">
          {/* Subtotal & Discounts */}
          <div className="space-y-1 text-xs">
            <div className="flex justify-between text-slate-500">
              <span>Subtotal:</span>
              <span className="font-semibold text-slate-700">
                {formatCentavos(cartSummary.subtotalCentavos + cartSummary.savingsCentavos)}
              </span>
            </div>
            {cartSummary.savingsCentavos > 0 && (
              <div className="flex justify-between text-emerald-700 font-bold">
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Tingi Bundle Discounts:
                </span>
                <span>-{formatCentavos(cartSummary.savingsCentavos)}</span>
              </div>
            )}
            <div className="flex justify-between items-baseline pt-2 border-t border-slate-200">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Total Due:
              </span>
              <span className="text-2xl font-black text-emerald-700 tracking-tight">
                {formatCentavos(cartSummary.totalCentavos)}
              </span>
            </div>
          </div>

          {/* Checkout Button */}
          <button
            type="button"
            onClick={handleOpenCheckout}
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-md transition active:scale-98"
          >
            <CreditCard className="w-4 h-4" />
            <span>Charge {formatCentavos(cartSummary.totalCentavos)}</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </button>
        </div>
      )}

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={showCheckout}
        onClose={() => setShowCheckout(false)}
        customerName={customerName}
        onSaleCompleted={handleSaleFinished}
      />

      {/* Receipt Modal */}
      <ReceiptModal
        sale={completedSale}
        isOpen={!!completedSale}
        onClose={() => setCompletedSale(null)}
      />
    </div>
  );
};
