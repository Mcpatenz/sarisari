/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, ShoppingBag, Plus, Minus, Sparkles, TrendingDown } from 'lucide-react';
import { LocalProduct } from '../../types';
import { formatCentavos, calculateProductPrice, calculateGramsFromBudget } from '../../lib/pricing';

interface TingiDialogProps {
  product: LocalProduct | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (product: LocalProduct, quantityBase: number, customBudgetPesos?: number) => void;
}

export const TingiDialog: React.FC<TingiDialogProps> = ({
  product,
  isOpen,
  onClose,
  onAddToCart,
}) => {
  if (!isOpen || !product) return null;

  const isPiece = product.baseUnit === 'PIECE';
  const isGram = product.baseUnit === 'GRAM';

  const [quantity, setQuantity] = useState<number>(isGram ? 1000 : 1);
  const [isCustomPesoMode, setIsCustomPesoMode] = useState(false);
  const [customPeso, setCustomPeso] = useState<number>(20);

  const priceResult = calculateProductPrice(product, quantity);

  // For custom peso mode
  const customGramsResult = isGram && isCustomPesoMode
    ? calculateGramsFromBudget(product, customPeso)
    : null;

  const handleConfirm = () => {
    if (isCustomPesoMode && isGram && customGramsResult) {
      onAddToCart(product, customGramsResult.grams, customPeso);
    } else {
      onAddToCart(product, quantity);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
              {product.category}
            </span>
            <h3 className="text-base font-bold text-white mt-1">{product.name}</h3>
            <p className="text-xs text-slate-400">
              In Stock:{' '}
              {isPiece
                ? `${product.stockBaseUnits} pcs`
                : `${(product.stockBaseUnits / 1000).toFixed(1)} kg (${product.stockBaseUnits}g)`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Mode Switch for weight products */}
          {isGram && (
            <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200">
              <button
                type="button"
                onClick={() => setIsCustomPesoMode(false)}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                  !isCustomPesoMode
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                By Weight (Grams / Kilos)
              </button>
              <button
                type="button"
                onClick={() => setIsCustomPesoMode(true)}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                  isCustomPesoMode
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Pabili ng Peso (&quot;₱20 Bigas&quot;)
              </button>
            </div>
          )}

          {/* Piece Quantity Presets */}
          {isPiece && (
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
                Quick Tingi Presets
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[1, 3, 5, 10, 20].map(val => {
                  const preview = calculateProductPrice(product, val);
                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setQuantity(val)}
                      className={`p-2.5 rounded-xl border text-center transition ${
                        quantity === val
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/20'
                          : 'border-slate-200 hover:border-slate-300 bg-white text-slate-800'
                      }`}
                    >
                      <div className="text-xs font-bold">
                        {val} {val === 1 ? 'stick/pc' : val === 20 ? 'pack' : 'pcs'}
                      </div>
                      <div className="text-xs font-black text-emerald-700 mt-0.5">
                        {formatCentavos(preview.totalCentavos)}
                      </div>
                      {preview.savingsCentavos > 0 && (
                        <span className="text-[10px] text-emerald-600 font-bold block">
                          Save {formatCentavos(preview.savingsCentavos)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Weight Presets */}
          {isGram && !isCustomPesoMode && (
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
                Weight Presets
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: '1/4 kg (250g)', grams: 250 },
                  { label: '1/2 kg (500g)', grams: 500 },
                  { label: '1 kg', grams: 1000 },
                  { label: '1.5 kg', grams: 1500 },
                  { label: '2 kg', grams: 2000 },
                  { label: '5 kg', grams: 5000 },
                ].map(item => {
                  const preview = calculateProductPrice(product, item.grams);
                  return (
                    <button
                      key={item.grams}
                      type="button"
                      onClick={() => setQuantity(item.grams)}
                      className={`p-2.5 rounded-xl border text-center transition ${
                        quantity === item.grams
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/20'
                          : 'border-slate-200 hover:border-slate-300 bg-white text-slate-800'
                      }`}
                    >
                      <div className="text-xs font-bold">{item.label}</div>
                      <div className="text-xs font-black text-emerald-700 mt-0.5">
                        {formatCentavos(preview.totalCentavos)}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Custom Peso Budget Controls (e.g. Pabili ng ₱20) */}
          {isGram && isCustomPesoMode && (
            <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 space-y-3">
              <label className="text-xs font-bold text-amber-900 uppercase tracking-wider block">
                Target Peso Budget
              </label>
              <div className="flex flex-wrap gap-2">
                {[10, 20, 30, 50, 100].map(pVal => (
                  <button
                    key={pVal}
                    type="button"
                    onClick={() => setCustomPeso(pVal)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                      customPeso === pVal
                        ? 'bg-amber-600 text-white border-amber-600'
                        : 'bg-white text-amber-900 border-amber-300 hover:bg-amber-100'
                    }`}
                  >
                    ₱{pVal}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-amber-800 font-bold">Custom ₱:</span>
                <input
                  type="number"
                  min="5"
                  step="5"
                  value={customPeso}
                  onChange={e => setCustomPeso(Math.max(1, Number(e.target.value)))}
                  className="w-24 px-2.5 py-1 text-sm font-bold bg-white border border-amber-300 rounded-lg text-slate-900"
                />
              </div>

              {customGramsResult && (
                <div className="text-xs text-amber-950 font-medium pt-2 border-t border-amber-200/60 flex items-center justify-between">
                  <span>Calculated weight:</span>
                  <span className="font-extrabold text-sm text-amber-900 bg-amber-200/80 px-2 py-0.5 rounded">
                    ~{customGramsResult.grams} grams
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Stepper / Manual Input */}
          {!isCustomPesoMode && (
            <div className="pt-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                Exact Quantity
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setQuantity(prev => Math.max(isGram ? 50 : 1, prev - (isGram ? 100 : 1)))
                  }
                  className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center font-bold text-slate-700 transition active:scale-95"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <div className="flex-1 flex items-center justify-center gap-1.5 bg-slate-50 border border-slate-200 py-2 rounded-xl">
                  <input
                    type="number"
                    min={isGram ? 50 : 1}
                    step={isGram ? 50 : 1}
                    value={quantity}
                    onChange={e =>
                      setQuantity(Math.max(isGram ? 50 : 1, Number(e.target.value)))
                    }
                    className="w-20 text-center font-black text-lg bg-transparent border-none focus:outline-hidden text-slate-900"
                  />
                  <span className="text-xs font-bold text-slate-500">
                    {isPiece ? 'pcs' : isGram ? 'grams' : 'ml'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setQuantity(prev => prev + (isGram ? 100 : 1))}
                  className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center font-bold text-slate-700 transition active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Total & Summary Box */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Total Price
              </span>
              <div className="text-2xl font-black text-emerald-700">
                {isCustomPesoMode && customGramsResult
                  ? formatCentavos(customGramsResult.actualCentavos)
                  : formatCentavos(priceResult.totalCentavos)}
              </div>
              {!isCustomPesoMode && priceResult.savingsCentavos > 0 && (
                <div className="flex items-center gap-1 text-[11px] text-emerald-600 font-bold">
                  <TrendingDown className="w-3 h-3" />
                  <span>Bundle savings: {formatCentavos(priceResult.savingsCentavos)}</span>
                </div>
              )}
            </div>

            <div className="text-right text-xs text-slate-500 font-medium">
              <div>
                {isCustomPesoMode && customGramsResult
                  ? customGramsResult.formattedDescription
                  : priceResult.ruleDescription}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition active:scale-95"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Add to Cart</span>
          </button>
        </div>
      </div>
    </div>
  );
};
