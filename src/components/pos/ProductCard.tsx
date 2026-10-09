/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Plus, SlidersHorizontal, AlertCircle } from 'lucide-react';
import { LocalProduct } from '../../types';
import { formatCentavos } from '../../lib/pricing';

interface ProductCardProps {
  product: LocalProduct;
  onQuickAdd: (product: LocalProduct) => void;
  onOpenTingiModal: (product: LocalProduct) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onQuickAdd,
  onOpenTingiModal,
}) => {
  const isOutOfStock = product.stockBaseUnits <= 0;
  const isLowStock = !isOutOfStock && product.stockBaseUnits <= product.lowStockThreshold;

  // Primary price rule
  const singleRule = product.priceRules.find(r => r.quantityBase === 1 || r.quantityBase === 1000) || product.priceRules[0];
  const bundleRule = product.priceRules.find(r => r.isBundle || r.quantityBase > 1);

  // Formatted stock label
  const stockLabel =
    product.baseUnit === 'PIECE'
      ? `${product.stockBaseUnits} pcs`
      : `${(product.stockBaseUnits / 1000).toFixed(product.stockBaseUnits % 1000 === 0 ? 0 : 1)} kg`;

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'Tingi & Yosi':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Bigas & Feeds':
        return 'bg-lime-100 text-lime-800 border-lime-200';
      case 'Kendi & Snacks':
        return 'bg-pink-100 text-pink-800 border-pink-200';
      case 'Instant & Canned':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Inumin & Softdrinks':
        return 'bg-sky-100 text-sky-800 border-sky-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div
      className={`group relative flex flex-col justify-between rounded-2xl bg-white p-3.5 sm:p-4 border shadow-xs transition-all duration-150 hover:shadow-md ${
        isOutOfStock
          ? 'border-red-200 opacity-60 bg-red-50/20'
          : isLowStock
          ? 'border-amber-200 hover:border-amber-400'
          : 'border-slate-200 hover:border-emerald-300'
      }`}
    >
      <div>
        {/* Top Badges */}
        <div className="flex items-center justify-between gap-1.5 mb-2">
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${getCategoryColor(
              product.category
            )}`}
          >
            {product.category}
          </span>

          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
              isOutOfStock
                ? 'bg-rose-100 text-rose-700'
                : isLowStock
                ? 'bg-amber-100 text-amber-700'
                : 'bg-emerald-50 text-emerald-700'
            }`}
          >
            {isLowStock && <AlertCircle className="w-2.5 h-2.5" />}
            {isOutOfStock ? 'UBOS / 0' : stockLabel}
          </span>
        </div>

        {/* Product Name */}
        <h4 className="font-bold text-slate-900 text-sm line-clamp-2 leading-snug group-hover:text-emerald-700 transition">
          {product.name}
        </h4>

        {/* Price & Bundle Highlight */}
        <div className="mt-2.5 space-y-1">
          <div className="flex items-baseline gap-1.5">
            <span className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
              {singleRule ? formatCentavos(singleRule.priceCentavos) : '—'}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              /{product.baseUnit === 'PIECE' ? 'pc' : product.baseUnit === 'GRAM' ? 'kg' : 'L'}
            </span>
          </div>

          {/* Bundle Pill if exists */}
          {bundleRule && (
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200/80 text-[11px] font-bold">
              <span>🏷️</span>
              <span>
                {bundleRule.name}: {formatCentavos(bundleRule.priceCentavos)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center gap-2">
        <button
          type="button"
          onClick={() => onOpenTingiModal(product)}
          className="flex-1 flex items-center justify-center gap-1 py-2 px-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition active:scale-95"
          title="Customize tingi quantity or choose bundle"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
          <span>Tingi / Options</span>
        </button>

        <button
          type="button"
          disabled={isOutOfStock}
          onClick={() => onQuickAdd(product)}
          className="w-10 h-9 flex items-center justify-center rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold transition shadow-xs active:scale-95"
          title={
            product.baseUnit === 'PIECE'
              ? 'Quick Add 1 stick/pc'
              : 'Quick Add 1 kg'
          }
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
