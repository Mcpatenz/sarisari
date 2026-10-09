/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, CheckCircle2, Sliders, Layers, Percent, AlertTriangle, Sparkles } from 'lucide-react';
import { LocalProduct, BaseUnit, ProductPriceRule, ProductUnitConversion } from '../../types';
import { db } from '../../lib/db';
import {
  formatCentavos,
  pesosToCentavos,
  centavosToPesos,
  calculateRuleMargin,
  suggestPriceForTargetMargin,
  DEFAULT_PROFIT_MARGIN_THRESHOLD,
  PROFIT_MARGIN_CONFIG_KEY,
} from '../../lib/pricing';
import { syncCentralStockUpdate } from '../../lib/syncEngine';

interface ProductModalProps {
  product: LocalProduct | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  marginThreshold?: number;
}

export const ProductModal: React.FC<ProductModalProps> = ({
  product,
  isOpen,
  onClose,
  onSave,
  marginThreshold,
}) => {
  const isEditing = !!product;

  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [category, setCategory] = useState('Tingi & Yosi');
  const [baseUnit, setBaseUnit] = useState<BaseUnit>('PIECE');
  const [stockBaseUnits, setStockBaseUnits] = useState(100);
  const [costPesos, setCostPesos] = useState(2.5);
  const [lowStockThreshold, setLowStockThreshold] = useState(20);
  
  // Price Rules
  const [priceRules, setPriceRules] = useState<ProductPriceRule[]>([]);
  // Unit conversions
  const [unitConversions, setUnitConversions] = useState<ProductUnitConversion[]>([]);

  useEffect(() => {
    if (product) {
      setName(product.name);
      setSku(product.sku);
      setBarcode(product.barcode || '');
      setCategory(product.category);
      setBaseUnit(product.baseUnit);
      setStockBaseUnits(product.stockBaseUnits);
      setCostPesos(centavosToPesos(product.costPerBaseCentavos));
      setLowStockThreshold(product.lowStockThreshold);
      setPriceRules(product.priceRules);
      setUnitConversions(product.unitConversions || []);
    } else {
      setName('');
      setSku(`SKU-${Math.floor(1000 + Math.random() * 9000)}`);
      setBarcode('');
      setCategory('Tingi & Yosi');
      setBaseUnit('PIECE');
      setStockBaseUnits(100);
      setCostPesos(2.5);
      setLowStockThreshold(20);
      setPriceRules([
        { id: `rule-single-${Date.now()}`, name: 'Single Piece', quantityBase: 1, priceCentavos: 400 },
        { id: `rule-bundle-${Date.now()}`, name: '3 for ₱10 Bundle', quantityBase: 3, priceCentavos: 1000, isBundle: true },
      ]);
      setUnitConversions([]);
    }
  }, [product, isOpen]);

  if (!isOpen) return null;

  const handleAddPriceRule = () => {
    const newRule: ProductPriceRule = {
      id: `rule-${Date.now()}`,
      name: baseUnit === 'GRAM' ? '1 Kilogram' : 'Promo Bundle',
      quantityBase: baseUnit === 'GRAM' ? 1000 : 3,
      priceCentavos: baseUnit === 'GRAM' ? 6000 : 1000,
      isBundle: true,
    };
    setPriceRules([...priceRules, newRule]);
  };

  const handleUpdatePriceRule = (idx: number, updates: Partial<ProductPriceRule>) => {
    setPriceRules(prev => prev.map((r, i) => (i === idx ? { ...r, ...updates } : r)));
  };

  const handleRemovePriceRule = (idx: number) => {
    setPriceRules(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Product name is required');
      return;
    }

    const prodId = product ? product.id : `prod-${Date.now()}`;
    const costPerBaseCentavos = pesosToCentavos(costPesos);

    const updatedProduct: LocalProduct = {
      id: prodId,
      sku: sku.trim() || `SKU-${Date.now()}`,
      barcode: barcode.trim() || undefined,
      name: name.trim(),
      category: category.trim(),
      baseUnit,
      stockBaseUnits: Number(stockBaseUnits),
      costPerBaseCentavos,
      lowStockThreshold: Number(lowStockThreshold),
      priceRules: priceRules.length > 0 ? priceRules : [
        { id: `rule-${Date.now()}`, name: 'Standard Price', quantityBase: 1, priceCentavos: 100 },
      ],
      unitConversions,
      active: true,
      version: product ? product.version + 1 : 1,
      updatedAt: new Date().toISOString(),
    };

    if (isEditing) {
      await db.products.put(updatedProduct);
    } else {
      await db.products.add(updatedProduct);
    }

    // Keep central server in sync
    await syncCentralStockUpdate(prodId, Number(stockBaseUnits));

    onSave();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white">
              {isEditing ? 'Edit Product & Tingi Rules' : 'Add New Sari-Sari Product'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
          {/* General info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-slate-600 block mb-1">Product Name *</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Marlboro Red, Sinandomeng Rice, Maxx..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Category</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-hidden"
              >
                <option value="Tingi & Yosi">Tingi &amp; Yosi</option>
                <option value="Bigas & Feeds">Bigas &amp; Feeds</option>
                <option value="Kendi & Snacks">Kendi &amp; Snacks</option>
                <option value="Instant & Canned">Instant &amp; Canned</option>
                <option value="Inumin & Softdrinks">Inumin &amp; Softdrinks</option>
                <option value="Panlinis & Sabon">Panlinis &amp; Sabon</option>
                <option value="General Merch">General Merch</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Base Inventory Unit</label>
              <select
                value={baseUnit}
                onChange={e => setBaseUnit(e.target.value as BaseUnit)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-hidden"
              >
                <option value="PIECE">PIECE (Sticks, candies, sachets, cans)</option>
                <option value="GRAM">GRAM (Rice, feeds, sugar by weight)</option>
                <option value="MILLILITER">MILLILITER (Bulk oil, vinegar, liquids)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">SKU / Code</label>
              <input
                type="text"
                value={sku}
                onChange={e => setSku(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono text-slate-800"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Barcode (Optional)</label>
              <input
                type="text"
                value={barcode}
                onChange={e => setBarcode(e.target.value)}
                placeholder="48000..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono text-slate-800"
              />
            </div>
          </div>

          {/* Stock & Cost */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Stock &amp; Cost Settings
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="text-[11px] font-bold text-slate-500 block mb-1">
                  Current Stock ({baseUnit === 'PIECE' ? 'pieces' : baseUnit === 'GRAM' ? 'grams' : 'ml'})
                </label>
                <input
                  type="number"
                  min="0"
                  value={stockBaseUnits}
                  onChange={e => setStockBaseUnits(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-sm font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 block mb-1">
                  Cost per {baseUnit === 'PIECE' ? 'piece' : baseUnit === 'GRAM' ? 'kg' : 'Liter'} (₱)
                </label>
                <input
                  type="number"
                  step="0.05"
                  min="0"
                  value={baseUnit === 'GRAM' ? (costPesos * 1000).toFixed(2) : costPesos}
                  onChange={e => {
                    const val = Number(e.target.value);
                    setCostPesos(baseUnit === 'GRAM' ? val / 1000 : val);
                  }}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-sm font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 block mb-1">
                  Low Stock Alert Threshold
                </label>
                <input
                  type="number"
                  min="0"
                  value={lowStockThreshold}
                  onChange={e => setLowStockThreshold(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-sm font-bold text-slate-900"
                />
              </div>
            </div>
          </div>

          {/* Tingi Price Rules Section */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Tingi &amp; Bundle Pricing Rules
                </h4>
                <p className="text-[11px] text-slate-500">
                  Configure single price, 3 for ₱10 promos, or per-kilo rates.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddPriceRule}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold border border-emerald-200 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Rule</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {priceRules.map((rule, idx) => {
                const effectiveThreshold =
                  marginThreshold ??
                  (() => {
                    try {
                      const s = localStorage.getItem(PROFIT_MARGIN_CONFIG_KEY);
                      if (s) return Number(s);
                    } catch {}
                    return DEFAULT_PROFIT_MARGIN_THRESHOLD;
                  })();

                const costBaseCentavos = pesosToCentavos(costPesos);
                const marginInfo = calculateRuleMargin(
                  costBaseCentavos,
                  rule.priceCentavos,
                  rule.quantityBase || 1,
                  effectiveThreshold
                );

                const suggestedCentavos = suggestPriceForTargetMargin(
                  costBaseCentavos,
                  rule.quantityBase || 1,
                  effectiveThreshold
                );
                const suggestedPesos = centavosToPesos(suggestedCentavos);

                return (
                  <div
                    key={rule.id || idx}
                    className={`p-3 rounded-xl border flex flex-col gap-2 text-xs transition ${
                      marginInfo.isLoss
                        ? 'bg-rose-50/70 border-rose-300'
                        : marginInfo.isBelowThreshold
                        ? 'bg-amber-50/70 border-amber-300'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex-1 min-w-[140px]">
                        <label className="text-[10px] text-slate-400 font-bold block mb-0.5">
                          Rule Name
                        </label>
                        <input
                          type="text"
                          value={rule.name}
                          onChange={e => handleUpdatePriceRule(idx, { name: e.target.value })}
                          className="w-full px-2 py-1 bg-white border border-slate-200 rounded-md font-semibold text-slate-800"
                          placeholder="e.g. 3 for ₱10"
                        />
                      </div>

                      <div className="w-24">
                        <label className="text-[10px] text-slate-400 font-bold block mb-0.5">
                          Qty ({baseUnit === 'PIECE' ? 'pcs' : 'grams'})
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={rule.quantityBase}
                          onChange={e =>
                            handleUpdatePriceRule(idx, { quantityBase: Number(e.target.value) })
                          }
                          className="w-full px-2 py-1 bg-white border border-slate-200 rounded-md font-bold text-slate-800"
                        />
                      </div>

                      <div className="w-24">
                        <label className="text-[10px] text-slate-400 font-bold block mb-0.5">
                          Price (₱)
                        </label>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          value={centavosToPesos(rule.priceCentavos)}
                          onChange={e =>
                            handleUpdatePriceRule(idx, {
                              priceCentavos: pesosToCentavos(Number(e.target.value)),
                            })
                          }
                          className="w-full px-2 py-1 bg-white border border-slate-200 rounded-md font-black text-emerald-700"
                        />
                      </div>

                      <div className="pt-4">
                        <button
                          type="button"
                          onClick={() => handleRemovePriceRule(idx)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 transition"
                          title="Delete rule"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Live Automated Margin Calculation & Alert */}
                    <div className="pt-1.5 border-t border-slate-200/70 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-500">
                          Cost: <strong>{formatCentavos(marginInfo.totalCostCentavos)}</strong>
                        </span>
                        <span>·</span>
                        <span className="font-semibold text-slate-500">
                          Net Profit:{' '}
                          <strong
                            className={
                              marginInfo.isLoss
                                ? 'text-rose-600'
                                : marginInfo.isBelowThreshold
                                ? 'text-amber-700'
                                : 'text-emerald-700'
                            }
                          >
                            {formatCentavos(marginInfo.profitCentavos)}
                          </strong>
                        </span>
                        <span>·</span>
                        <span
                          className={`font-black ${
                            marginInfo.isLoss
                              ? 'text-rose-700'
                              : marginInfo.isBelowThreshold
                              ? 'text-amber-800'
                              : 'text-emerald-700'
                          }`}
                        >
                          Margin: {marginInfo.marginPercent}%
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {marginInfo.isLoss ? (
                          <span className="px-1.5 py-0.2 rounded font-extrabold text-[10px] bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-rose-600" />
                            <span>LUGI / SELLING AT LOSS</span>
                          </span>
                        ) : marginInfo.isBelowThreshold ? (
                          <span className="px-1.5 py-0.2 rounded font-extrabold text-[10px] bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            <span>Below {effectiveThreshold}% Target Margin</span>
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.2 rounded font-bold text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300">
                            Healthy Margin
                          </span>
                        )}

                        {marginInfo.isBelowThreshold && (
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdatePriceRule(idx, { priceCentavos: suggestedCentavos })
                            }
                            className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] shadow-2xs transition flex items-center gap-1"
                            title={`Adjust price to ₱${suggestedPesos.toFixed(2)} to achieve ${effectiveThreshold}% margin`}
                          >
                            <Sparkles className="w-3 h-3" />
                            <span>Set ₱{suggestedPesos.toFixed(2)} ({effectiveThreshold}%)</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer Save */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition active:scale-95"
            >
              Save Product
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
