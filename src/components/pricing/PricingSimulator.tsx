/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Calculator,
  Sparkles,
  Info,
  CheckCircle2,
  TrendingDown,
  Layers,
  ShoppingBag,
} from 'lucide-react';
import { formatCentavos, calculateProductPrice, calculateGramsFromBudget } from '../../lib/pricing';
import { useStore } from '../../context/StoreContext';
import { LocalProduct } from '../../types';

export const PricingSimulator: React.FC = () => {
  const { products, addToCart, setActiveTab } = useStore();

  // Find demo products
  const cigaretteProd = products.find(p => p.sku === 'YOSI-001') || products[0];
  const candyProd = products.find(p => p.sku === 'KENDI-001') || products[2];
  const riceProd = products.find(p => p.sku === 'BIGAS-001') || products[4];
  const feedsProd = products.find(p => p.sku === 'FEEDS-001') || products[6];

  const demoCatalog = [cigaretteProd, candyProd, riceProd, feedsProd].filter(Boolean);

  const [selectedProductId, setSelectedProductId] = useState<string>(
    cigaretteProd ? cigaretteProd.id : ''
  );

  const selectedProduct =
    demoCatalog.find(p => p.id === selectedProductId) || demoCatalog[0] || cigaretteProd;

  // Selected quantity
  const [quantity, setQuantity] = useState<number>(3);
  const [customPesoBudget, setCustomPesoBudget] = useState<number>(20);

  // When switching product, set a suitable initial quantity
  const handleSelectProduct = (prod: LocalProduct) => {
    setSelectedProductId(prod.id);
    if (prod.baseUnit === 'GRAM') {
      setQuantity(1000); // 1kg
    } else {
      setQuantity(3);
    }
  };

  const isWeightProduct = selectedProduct?.baseUnit === 'GRAM';

  const priceResult = selectedProduct
    ? calculateProductPrice(selectedProduct, quantity)
    : {
        totalCentavos: 0,
        totalCostCentavos: 0,
        regularCentavosWithoutBundle: 0,
        savingsCentavos: 0,
        ruleDescription: '',
        bundleAppliedCount: 0,
        remainingSinglesCount: 0,
      };

  const remainingStock = selectedProduct
    ? Math.max(0, selectedProduct.stockBaseUnits - quantity)
    : 0;

  // Custom budget preview for rice/weight
  const customBudgetPreview =
    isWeightProduct && selectedProduct
      ? calculateGramsFromBudget(selectedProduct, customPesoBudget)
      : null;

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-6 py-6 space-y-6">
      {/* Blueprint Header Callout */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-900 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-md">
            <Calculator className="w-6 h-6 text-emerald-300" />
          </div>
          <div>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-400/20 text-emerald-300 uppercase tracking-wider border border-emerald-400/30">
              Blueprint Section 2
            </span>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">
              Tingi Pricing Model &amp; Calculation Engine
            </h1>
          </div>
        </div>
        <p className="text-sm text-emerald-100/90 max-w-2xl mt-1">
          In a sari-sari store, the inventory engine separates the product&apos;s base unit,
          selling unit, and tingi bundle rules. All calculations run on{' '}
          <strong className="text-white underline decoration-emerald-400">integer centavos</strong>{' '}
          and integer base units to eliminate floating-point rounding errors.
        </p>
      </div>

      {/* Main Interactive Sandbox */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Product Picker & Quantity Controls */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2.5">
              1. Select a Product to Preview
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {demoCatalog.map(prod => {
                const isSelected = prod.id === selectedProduct?.id;
                return (
                  <button
                    key={prod.id}
                    onClick={() => handleSelectProduct(prod)}
                    className={`p-3.5 rounded-xl border text-left transition relative flex flex-col justify-between ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50/80 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-slate-900">{prod.name}</span>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {prod.baseUnit === 'PIECE'
                          ? prod.priceRules.map(r => r.name).join(' · ')
                          : `${formatCentavos(prod.priceRules[0]?.priceCentavos || 0)} per kg`}
                      </p>
                    </div>
                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-400">Stock:</span>
                      <span className="font-semibold text-slate-700">
                        {prod.baseUnit === 'PIECE'
                          ? `${prod.stockBaseUnits} sticks/pcs`
                          : `${prod.stockBaseUnits / 1000} kg (${prod.stockBaseUnits}g)`}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quantity Controls */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                2. Choose Quantity ({selectedProduct?.baseUnit === 'PIECE' ? 'Sticks / Pieces' : 'Grams / kg'})
              </label>
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                {selectedProduct?.baseUnit === 'PIECE'
                  ? `${quantity} sticks`
                  : `${(quantity / 1000).toFixed(quantity % 1000 === 0 ? 0 : 2)} kg (${quantity}g)`}
              </span>
            </div>

            {/* Quick preset buttons */}
            {selectedProduct?.baseUnit === 'PIECE' ? (
              <div className="flex flex-wrap gap-2 mb-4">
                {[1, 3, 5, 7, 10, 20].map(val => (
                  <button
                    key={val}
                    onClick={() => setQuantity(val)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                      quantity === val
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {val} {val === 1 ? 'stick' : val === 20 ? 'pack (20)' : val === 3 ? 'bundle (3)' : 'sticks'}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 mb-4">
                {[
                  { label: '250g (1/4 kg)', val: 250 },
                  { label: '500g (1/2 kg)', val: 500 },
                  { label: '1 kg', val: 1000 },
                  { label: '1.5 kg', val: 1500 },
                  { label: '2 kg', val: 2000 },
                  { label: '5 kg', val: 5000 },
                ].map(item => (
                  <button
                    key={item.val}
                    onClick={() => setQuantity(item.val)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                      quantity === item.val
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}

            {/* Range slider for manual adjustment */}
            <div className="space-y-1">
              <input
                type="range"
                min={selectedProduct?.baseUnit === 'PIECE' ? 1 : 100}
                max={selectedProduct?.baseUnit === 'PIECE' ? 50 : 10000}
                step={selectedProduct?.baseUnit === 'PIECE' ? 1 : 50}
                value={quantity}
                onChange={e => setQuantity(Number(e.target.value))}
                className="w-full accent-emerald-600 cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>{selectedProduct?.baseUnit === 'PIECE' ? '1 stick' : '100g'}</span>
                <span>{selectedProduct?.baseUnit === 'PIECE' ? '50 sticks' : '10 kg'}</span>
              </div>
            </div>
          </div>

          {/* Tingi Rice Custom Peso Feature (from Blueprint) */}
          {isWeightProduct && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-base">🍚</span>
                <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                  Filipino Sari-Sari Tingi Habit: &quot;Pabili ng ₱20 na Bigas&quot;
                </h4>
              </div>
              <p className="text-xs text-amber-800">
                Customers often request rice by peso budget rather than kilograms. The POS calculates
                exact grams and rounds to realistic weighing scale intervals:
              </p>
              <div className="flex flex-wrap items-center gap-2">
                {[10, 20, 30, 50, 100].map(pesoVal => (
                  <button
                    key={pesoVal}
                    onClick={() => {
                      setCustomPesoBudget(pesoVal);
                      if (customBudgetPreview) {
                        setQuantity(customBudgetPreview.grams);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                      customPesoBudget === pesoVal
                        ? 'bg-amber-600 text-white border-amber-600'
                        : 'bg-white text-amber-900 border-amber-200 hover:bg-amber-100'
                    }`}
                  >
                    ₱{pesoVal} Bigas
                  </button>
                ))}
              </div>
              {customBudgetPreview && (
                <div className="text-xs font-medium text-amber-900 flex items-center gap-2 pt-1">
                  <span>➡️ ₱{customPesoBudget} buys:</span>
                  <strong className="text-amber-950 font-bold bg-amber-200/70 px-2 py-0.5 rounded">
                    ~{customBudgetPreview.grams} grams
                  </strong>
                  <span className="text-amber-700">
                    (Exact: {formatCentavos(customBudgetPreview.actualCentavos)})
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Quick Add to Cart button */}
          <div className="pt-2">
            <button
              onClick={() => {
                if (selectedProduct) {
                  addToCart(selectedProduct, quantity);
                  setActiveTab('pos');
                }
              }}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition active:scale-98"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Add This Test Tingi Item to POS Cart &rarr;</span>
            </button>
          </div>
        </div>

        {/* Right Column: Live Calculation Output Card (matching Blueprint design) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl border border-slate-800 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Calculation Output
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Integer Centavos
              </span>
            </div>

            {/* Sale Total (Big Highlight) */}
            <div>
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">
                Sale Total
              </span>
              <div className="text-4xl sm:text-5xl font-black text-emerald-400 tracking-tight mt-1">
                {formatCentavos(priceResult.totalCentavos)}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Stored in database as:{' '}
                <code className="text-emerald-300 font-mono font-bold bg-slate-800 px-1.5 py-0.5 rounded">
                  {priceResult.totalCentavos} centavos
                </code>
              </div>
            </div>

            {/* Tingi Rule Breakdown */}
            <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                <Layers className="w-3.5 h-3.5 text-emerald-400" />
                <span>Pricing Policy Applied</span>
              </div>
              <p className="text-sm font-semibold text-white">
                {priceResult.ruleDescription || 'Standard rate'}
              </p>
              {priceResult.savingsCentavos > 0 && (
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-950/60 p-2 rounded-lg border border-emerald-800/60">
                  <TrendingDown className="w-3.5 h-3.5" />
                  <span>
                    Customer saves {formatCentavos(priceResult.savingsCentavos)} with Tingi Bundle!
                  </span>
                </div>
              )}
            </div>

            {/* Stock After Sale */}
            <div className="border-t border-slate-800 pt-4">
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">
                Stock After Sale (Central &amp; Local)
              </span>
              <div className="text-2xl sm:text-3xl font-black text-slate-200 mt-1">
                {selectedProduct?.baseUnit === 'PIECE'
                  ? `${remainingStock} sticks`
                  : `${(remainingStock / 1000).toFixed(remainingStock % 1000 === 0 ? 0 : 2)} kg (${remainingStock.toLocaleString()}g)`}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Starting stock was {selectedProduct?.stockBaseUnits.toLocaleString()} base units
              </p>
            </div>

            {/* Profit Margin Preview for Owner */}
            <div className="border-t border-slate-800 pt-3 text-xs flex justify-between items-center text-slate-400">
              <span>Estimated Cost (COGS):</span>
              <span className="font-mono text-slate-300">
                {formatCentavos(priceResult.totalCostCentavos)}
              </span>
            </div>
            <div className="text-xs flex justify-between items-center font-bold">
              <span className="text-slate-300">Gross Margin:</span>
              <span className="text-emerald-400">
                {formatCentavos(priceResult.totalCentavos - priceResult.totalCostCentavos)} (
                {priceResult.totalCentavos > 0
                  ? Math.round(
                      ((priceResult.totalCentavos - priceResult.totalCostCentavos) /
                        priceResult.totalCentavos) *
                        100
                    )
                  : 0}
                %)
              </span>
            </div>
          </div>

          {/* Blueprint Reference Note */}
          <div className="p-4 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-600 space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-slate-800">
              <Info className="w-3.5 h-3.5 text-blue-600" />
              <span>Blueprint Rule Enforcement</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-slate-600">
              <li>
                <strong>Cigarettes &amp; Candies:</strong> Always stored as whole integer pieces.
              </li>
              <li>
                <strong>Rice &amp; Feeds:</strong> Always stored in base integer grams.
              </li>
              <li>
                <strong>Bundles:</strong> 7 sticks at 3 for ₱10 &amp; ₱4/each = 2x bundles (₱20) + 1x
                single (₱4) = <strong>₱24.00</strong>.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
