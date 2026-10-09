/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ShoppingBag, ArrowRight } from 'lucide-react';
import { ProductGrid } from './ProductGrid';
import { CartPanel } from './CartPanel';
import { useStore } from '../../context/StoreContext';
import { formatCentavos } from '../../lib/pricing';

export const POSScreen: React.FC = () => {
  const { cart, cartSummary } = useStore();
  const [mobileCartOpen, setMobileCartOpen] = useState(false);

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4 py-3 sm:py-4 pb-20 lg:pb-4 min-h-[calc(100vh-100px)]">
      {/* Grid container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 items-start">
        {/* Left Column: Product Catalog & Search */}
        <div className="lg:col-span-7 xl:col-span-8 min-w-0">
          <ProductGrid />
        </div>

        {/* Right Column: Cart Panel (Sticky on Desktop/Tablet) */}
        <div className="hidden lg:block lg:col-span-5 xl:col-span-4 sticky top-16 h-[calc(100vh-80px)]">
          <CartPanel />
        </div>
      </div>

      {/* Mobile Persistent Floating Cart Bar (for Android phones / small screens) */}
      {cart.length > 0 && (
        <div className="lg:hidden fixed bottom-3 left-3 right-3 z-30">
          <button
            onClick={() => setMobileCartOpen(true)}
            className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl flex items-center justify-between font-bold text-sm transition active:scale-98 border border-emerald-400/40"
          >
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-800 flex items-center justify-center text-xs">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <span>
                {cart.length} {cart.length === 1 ? 'item' : 'items'} in basket
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-base font-black">
                {formatCentavos(cartSummary.totalCentavos)}
              </span>
              <div className="p-1 rounded-lg bg-emerald-500 text-white">
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </button>
        </div>
      )}

      {/* Mobile Cart Drawer Backdrop */}
      {mobileCartOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end">
          <div className="h-[90vh] w-full max-w-lg mx-auto">
            <CartPanel
              isMobileDrawer
              onCloseMobileDrawer={() => setMobileCartOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};
