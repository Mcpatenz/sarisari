/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Package,
  Plus,
  Edit2,
  AlertTriangle,
  Layers,
  Search,
  Filter,
  ArrowUpDown,
  Coins,
  ShieldAlert,
  Percent,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Sliders,
  TrendingDown,
  Info,
  Sparkles,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { LocalProduct } from '../../types';
import {
  formatCentavos,
  centavosToPesos,
  calculateProductMargins,
  DEFAULT_PROFIT_MARGIN_THRESHOLD,
  PROFIT_MARGIN_CONFIG_KEY,
} from '../../lib/pricing';
import { ProductModal } from './ProductModal';
import { StockAdjustmentModal } from './StockAdjustmentModal';

export const InventoryList: React.FC = () => {
  const { products, currentRole, refreshData } = useStore();

  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState<
    'ALL' | 'LOW_MARGIN' | 'SELLING_LOSS' | 'LOW_STOCK' | 'OUT_OF_STOCK'
  >('ALL');

  // Configurable profit margin percentage threshold
  const [marginThreshold, setMarginThreshold] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(PROFIT_MARGIN_CONFIG_KEY);
      if (saved) return Number(saved);
    } catch {
      // fallback
    }
    return DEFAULT_PROFIT_MARGIN_THRESHOLD;
  });

  const [expandedMarginProductId, setExpandedMarginProductId] = useState<string | null>(null);
  const [selectedProductForEdit, setSelectedProductForEdit] = useState<LocalProduct | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [selectedProductForAdjust, setSelectedProductForAdjust] = useState<LocalProduct | null>(null);

  // Update margin threshold & persist to localStorage
  const handleUpdateMarginThreshold = (newThreshold: number) => {
    const clamped = Math.max(1, Math.min(90, newThreshold));
    setMarginThreshold(clamped);
    try {
      localStorage.setItem(PROFIT_MARGIN_CONFIG_KEY, clamped.toString());
    } catch {
      // ignore
    }
  };

  const categories = useMemo(() => {
    return ['ALL', ...Array.from(new Set(products.map(p => p.category)))];
  }, [products]);

  // Compute margin analysis and counts for all products
  const productsWithMarginAnalysis = useMemo(() => {
    return products.map(p => ({
      product: p,
      analysis: calculateProductMargins(p, marginThreshold),
    }));
  }, [products, marginThreshold]);

  // Summary counts
  const {
    totalCostValuationCentavos,
    lowStockCount,
    outOfStockCount,
    lowMarginCount,
    sellingLossCount,
  } = useMemo(() => {
    let costTotal = 0;
    let lowStock = 0;
    let outStock = 0;
    let lowMargin = 0;
    let lossCount = 0;

    for (const { product, analysis } of productsWithMarginAnalysis) {
      costTotal += product.stockBaseUnits * product.costPerBaseCentavos;
      if (product.stockBaseUnits <= 0) outStock++;
      else if (product.stockBaseUnits <= product.lowStockThreshold) lowStock++;

      if (analysis.hasLossRule) lossCount++;
      if (analysis.isFlaggedBelowThreshold) lowMargin++;
    }

    return {
      totalCostValuationCentavos: costTotal,
      lowStockCount: lowStock,
      outOfStockCount: outStock,
      lowMarginCount: lowMargin,
      sellingLossCount: lossCount,
    };
  }, [productsWithMarginAnalysis]);

  // Filter products by search query, category, and status filter
  const filteredProducts = useMemo(() => {
    return productsWithMarginAnalysis.filter(({ product, analysis }) => {
      const matchCat = filterCategory === 'ALL' || product.category === filterCategory;

      const query = search.trim().toLowerCase();
      const matchSearch =
        !query ||
        product.name.toLowerCase().includes(query) ||
        product.sku.toLowerCase().includes(query) ||
        (product.barcode && product.barcode.includes(query)) ||
        product.category.toLowerCase().includes(query);

      let matchStatus = true;
      if (filterStatus === 'LOW_MARGIN') {
        matchStatus = analysis.isFlaggedBelowThreshold;
      } else if (filterStatus === 'SELLING_LOSS') {
        matchStatus = analysis.hasLossRule;
      } else if (filterStatus === 'LOW_STOCK') {
        matchStatus = product.stockBaseUnits > 0 && product.stockBaseUnits <= product.lowStockThreshold;
      } else if (filterStatus === 'OUT_OF_STOCK') {
        matchStatus = product.stockBaseUnits <= 0;
      }

      return matchCat && matchSearch && matchStatus;
    });
  }, [productsWithMarginAnalysis, filterCategory, search, filterStatus]);

  const handleOpenAdd = () => {
    if (currentRole !== 'OWNER') {
      alert('Only store Owners can add products or modify pricing rules. Switch role to Owner in the top header.');
      return;
    }
    setSelectedProductForEdit(null);
    setIsProductModalOpen(true);
  };

  const handleOpenEdit = (p: LocalProduct) => {
    if (currentRole !== 'OWNER') {
      alert('Only store Owners can edit products. Switch role to Owner in the top header.');
      return;
    }
    setSelectedProductForEdit(p);
    setIsProductModalOpen(true);
  };

  const handleOpenAdjust = (p: LocalProduct) => {
    setSelectedProductForAdjust(p);
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6 space-y-6">
      {/* Top Banner & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Package className="w-6 h-6 text-emerald-600" />
            <span>Store Inventory &amp; Tingi Catalog</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage base stock units, tingi bundles, capital costs, and automated profit margin protection.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {currentRole !== 'OWNER' && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 text-xs font-semibold border border-amber-200">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
              <span>Cashier Mode (View-Only)</span>
            </div>
          )}

          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add Paninda</span>
          </button>
        </div>
      </div>

      {/* Automated Margin Calculation Configuration Bar */}
      <div className="p-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl text-white shadow-md border border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Percent className="w-4 h-4" />
            </div>
            <h3 className="font-extrabold text-sm text-white">
              Automated Profit Margin Protection
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              Target: {marginThreshold}%
            </span>
          </div>
          <p className="text-xs text-slate-300 max-w-xl">
            Flags products in your catalog if their current selling price or bundle promo drops below your minimum profit margin percentage.
          </p>
        </div>

        {/* Threshold Controls & Presets */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
            Preset Targets:
          </span>
          {[10, 15, 20, 25, 30].map(pct => (
            <button
              key={pct}
              type="button"
              onClick={() => handleUpdateMarginThreshold(pct)}
              className={`px-2.5 py-1 rounded-lg font-bold transition active:scale-95 ${
                marginThreshold === pct
                  ? 'bg-emerald-500 text-slate-950 shadow-xs'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
              }`}
            >
              {pct}%
            </button>
          ))}

          <div className="flex items-center gap-1.5 pl-2 border-l border-slate-700">
            <span className="text-slate-400 font-semibold">Custom:</span>
            <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg px-2 py-1">
              <input
                type="number"
                min="1"
                max="80"
                value={marginThreshold}
                onChange={e => handleUpdateMarginThreshold(Number(e.target.value))}
                className="w-10 bg-transparent text-center font-bold text-white text-xs focus:outline-hidden"
              />
              <span className="text-slate-400 font-bold">%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards with Low Margin Flag Highlight */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Total Paninda
          </span>
          <div className="text-2xl font-black text-slate-900 mt-1">{products.length} Items</div>
          <span className="text-xs text-slate-500">In local &amp; cloud catalog</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Estimated Inventory Value
          </span>
          <div className="text-2xl font-black text-emerald-700 mt-1">
            {formatCentavos(totalCostValuationCentavos)}
          </div>
          <span className="text-xs text-slate-500">Capital cost basis</span>
        </div>

        {/* Low Margin Alert Stat Card */}
        <div
          onClick={() => setFilterStatus(filterStatus === 'LOW_MARGIN' ? 'ALL' : 'LOW_MARGIN')}
          className={`p-4 rounded-2xl border shadow-2xs cursor-pointer transition active:scale-98 ${
            lowMarginCount > 0
              ? 'bg-amber-50/80 border-amber-300 hover:bg-amber-100/80'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
          title="Click to toggle filter for low profit margin items"
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-[11px] font-bold uppercase tracking-wider block ${
                lowMarginCount > 0 ? 'text-amber-800' : 'text-slate-400'
              }`}
            >
              Below Target Margin
            </span>
            {lowMarginCount > 0 && (
              <span className="p-1 rounded-md bg-amber-200/80 text-amber-900">
                <AlertTriangle className="w-3.5 h-3.5" />
              </span>
            )}
          </div>
          <div
            className={`text-2xl font-black mt-1 ${
              lowMarginCount > 0 ? 'text-amber-700' : 'text-slate-700'
            }`}
          >
            {lowMarginCount} Items
          </div>
          <div className="flex items-center justify-between mt-0.5">
            <span
              className={`text-xs font-semibold ${
                lowMarginCount > 0 ? 'text-amber-800' : 'text-emerald-700'
              }`}
            >
              {lowMarginCount > 0 ? `Below ${marginThreshold}% target` : 'All healthy margins'}
            </span>
            <span className="text-[10px] text-amber-700 font-bold underline">
              {filterStatus === 'LOW_MARGIN' ? 'Showing' : 'Filter'}
            </span>
          </div>
        </div>

        {/* Low Stock / Ubos Stat Card */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Low Stock / Ubos
          </span>
          <div className="text-2xl font-black text-rose-600 mt-1">
            {outOfStockCount + lowStockCount} Items
          </div>
          <span className="text-xs text-rose-600 font-semibold">
            {outOfStockCount} out of stock · {lowStockCount} low
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col space-y-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, SKU, category, or barcode..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
            />
          </div>

          {/* Status Quick Filter Chips */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <button
              onClick={() => setFilterStatus('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                filterStatus === 'ALL'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              All Items ({products.length})
            </button>

            <button
              onClick={() => setFilterStatus('LOW_MARGIN')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                filterStatus === 'LOW_MARGIN'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                  : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
              <span>Low Margin (&lt;{marginThreshold}%)</span>
              <span className="px-1.5 py-0.2 rounded-full bg-amber-200 text-amber-900 text-[10px] font-black">
                {lowMarginCount}
              </span>
            </button>

            {sellingLossCount > 0 && (
              <button
                onClick={() => setFilterStatus('SELLING_LOSS')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                  filterStatus === 'SELLING_LOSS'
                    ? 'bg-rose-600 text-white font-black'
                    : 'bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200'
                }`}
              >
                <span>🚨 Selling At Loss ({sellingLossCount})</span>
              </button>
            )}

            <button
              onClick={() => setFilterStatus('LOW_STOCK')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                filterStatus === 'LOW_STOCK'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              Low Stock ({lowStockCount})
            </button>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pt-1 border-t border-slate-100">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
            Category:
          </span>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold whitespace-nowrap transition ${
                filterCategory === cat
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Products Table with Automated Margin Column & Flags */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-extrabold text-[11px]">
              <tr>
                <th className="py-3 px-4">Paninda &amp; SKU</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Current Stock</th>
                <th className="py-3 px-3">Capital Cost</th>
                <th className="py-3 px-3">Tingi Pricing &amp; Promos</th>
                <th className="py-3 px-3">
                  <div className="flex items-center gap-1">
                    <span>Profit Margin</span>
                    <span className="px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 text-[10px] font-bold">
                      &ge; {marginThreshold}%
                    </span>
                  </div>
                </th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-bold text-slate-600">No products match the selected criteria.</p>
                    <p className="text-xs text-slate-400 mt-0.5">Try resetting the status filter or search query.</p>
                  </td>
                </tr>
              ) : (
                filteredProducts.map(({ product: prod, analysis }) => {
                  const isOutOfStock = prod.stockBaseUnits <= 0;
                  const isLowStock = !isOutOfStock && prod.stockBaseUnits <= prod.lowStockThreshold;
                  const isExpanded = expandedMarginProductId === prod.id;

                  return (
                    <React.Fragment key={prod.id}>
                      <tr
                        className={`transition ${
                          analysis.hasLossRule
                            ? 'bg-rose-50/50 hover:bg-rose-50/80 border-l-4 border-l-rose-500'
                            : analysis.isFlaggedBelowThreshold
                            ? 'bg-amber-50/40 hover:bg-amber-50/70 border-l-4 border-l-amber-500'
                            : 'hover:bg-slate-50/80 border-l-4 border-l-transparent'
                        }`}
                      >
                        {/* Paninda Name & Status */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-900 text-sm">{prod.name}</span>
                            {analysis.hasLossRule && (
                              <span className="px-1.5 py-0.2 rounded font-black text-[9px] bg-rose-600 text-white uppercase tracking-wider">
                                Lugi
                              </span>
                            )}
                            {!analysis.hasLossRule && analysis.isFlaggedBelowThreshold && (
                              <span className="px-1.5 py-0.2 rounded font-black text-[9px] bg-amber-500 text-slate-950 uppercase tracking-wider">
                                Low Margin
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                            {prod.sku} {prod.barcode ? `· ${prod.barcode}` : ''}
                          </div>
                        </td>

                        {/* Category */}
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold">
                            {prod.category}
                          </span>
                        </td>

                        {/* Stock */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`font-black text-sm ${
                                isOutOfStock
                                  ? 'text-rose-600'
                                  : isLowStock
                                  ? 'text-amber-600'
                                  : 'text-emerald-700'
                              }`}
                            >
                              {prod.baseUnit === 'PIECE'
                                ? `${prod.stockBaseUnits} pcs`
                                : prod.baseUnit === 'GRAM'
                                ? `${(prod.stockBaseUnits / 1000).toFixed(1)} kg (${prod.stockBaseUnits}g)`
                                : `${(prod.stockBaseUnits / 1000).toFixed(1)} L`}
                            </span>
                            {isLowStock && (
                              <span
                                className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-700"
                                title="Below low stock alert"
                              >
                                LOW
                              </span>
                            )}
                            {isOutOfStock && (
                              <span
                                className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-100 text-rose-700"
                                title="Out of stock"
                              >
                                UBOS
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Capital Cost */}
                        <td className="py-3 px-3">
                          <span className="font-mono text-slate-700 font-bold">
                            {prod.baseUnit === 'GRAM'
                              ? `${formatCentavos(prod.costPerBaseCentavos * 1000)}/kg`
                              : prod.baseUnit === 'MILLILITER'
                              ? `${formatCentavos(prod.costPerBaseCentavos * 1000)}/L`
                              : `${formatCentavos(prod.costPerBaseCentavos)}/pc`}
                          </span>
                        </td>

                        {/* Tingi Price Rules */}
                        <td className="py-3 px-3">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {prod.priceRules.map(r => (
                              <span
                                key={r.id}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                  r.isBundle
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    : 'bg-slate-100 text-slate-700 border-slate-200'
                                }`}
                              >
                                {r.name}: {formatCentavos(r.priceCentavos)}
                              </span>
                            ))}
                          </div>
                        </td>

                        {/* Automated Profit Margin Column with Automated Flagging */}
                        <td className="py-3 px-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              {analysis.hasLossRule ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-black bg-rose-100 text-rose-800 border border-rose-300">
                                  <AlertTriangle className="w-3 h-3 text-rose-600" />
                                  <span>{analysis.lowestMarginPercent}% Loss</span>
                                </span>
                              ) : analysis.isFlaggedBelowThreshold ? (
                                <span
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-black bg-amber-100 text-amber-900 border border-amber-300"
                                  title={`Flagged: ${analysis.lowestMarginPercent}% margin is below your ${marginThreshold}% target`}
                                >
                                  <AlertTriangle className="w-3 h-3 text-amber-600" />
                                  <span>
                                    {analysis.primaryMarginPercent}% (Min: {analysis.lowestMarginPercent}%)
                                  </span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  <span>{analysis.primaryMarginPercent}%</span>
                                </span>
                              )}

                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedMarginProductId(isExpanded ? null : prod.id)
                                }
                                className="text-slate-400 hover:text-slate-700 p-0.5 rounded"
                                title="Toggle breakdown of margins per price rule"
                              >
                                {isExpanded ? (
                                  <ChevronUp className="w-3.5 h-3.5" />
                                ) : (
                                  <ChevronDown className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>

                            {/* Subtitle breakdown */}
                            <div className="text-[10px] text-slate-500 font-medium">
                              {analysis.primaryRule && (
                                <span>
                                  Net: <strong>{formatCentavos(analysis.primaryRule.profitCentavos)}</strong>/unit
                                  {analysis.lowestMarginRule &&
                                    analysis.lowestMarginRule.ruleId !== analysis.primaryRule.ruleId && (
                                      <span className="text-amber-800 font-bold ml-1">
                                        · Bundle: {analysis.lowestMarginPercent}%
                                      </span>
                                    )}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {analysis.isFlaggedBelowThreshold && (
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(prod)}
                                className="px-2 py-1 rounded-lg text-[11px] font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 transition flex items-center gap-1 shadow-2xs"
                                title={`Fix price to reach ${marginThreshold}% target margin`}
                              >
                                <Sparkles className="w-3 h-3" />
                                <span>Fix Margin</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleOpenAdjust(prod)}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                              title="Restock or adjust inventory count"
                            >
                              ± Stock
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenEdit(prod)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition"
                              title="Edit product details and pricing"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expandable Detailed Margin Breakdown Accordion */}
                      {isExpanded && (
                        <tr className="bg-slate-50/90 border-b border-slate-200">
                          <td colSpan={7} className="py-3 px-6">
                            <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2">
                              <div className="flex items-center justify-between text-xs border-b border-slate-100 pb-2">
                                <span className="font-extrabold text-slate-800 flex items-center gap-1.5">
                                  <Percent className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Automated Margin Breakdown for "{prod.name}"</span>
                                </span>
                                <span className="text-[11px] text-slate-500">
                                  Capital Cost:{' '}
                                  <strong className="text-slate-800 font-mono">
                                    {formatCentavos(prod.costPerBaseCentavos)} / base unit
                                  </strong>
                                </span>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1 text-xs">
                                {analysis.rules.map(rule => (
                                  <div
                                    key={rule.ruleId}
                                    className={`p-2.5 rounded-lg border space-y-1 ${
                                      rule.isLoss
                                        ? 'bg-rose-50 border-rose-300'
                                        : rule.isBelowThreshold
                                        ? 'bg-amber-50 border-amber-300'
                                        : 'bg-slate-50 border-slate-200'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="font-bold text-slate-900 truncate">
                                        {rule.ruleName}
                                      </span>
                                      <span
                                        className={`px-1.5 py-0.2 rounded font-black text-[10px] ${
                                          rule.isLoss
                                            ? 'bg-rose-600 text-white'
                                            : rule.isBelowThreshold
                                            ? 'bg-amber-500 text-slate-950'
                                            : 'bg-emerald-600 text-white'
                                        }`}
                                      >
                                        {rule.marginPercent}%
                                      </span>
                                    </div>

                                    <div className="text-[11px] text-slate-600 space-y-0.5">
                                      <div className="flex justify-between">
                                        <span>Selling Price:</span>
                                        <strong className="font-mono text-slate-900">
                                          {formatCentavos(rule.priceCentavos)}
                                        </strong>
                                      </div>
                                      <div className="flex justify-between">
                                        <span>Total Cost Basis:</span>
                                        <span className="font-mono text-slate-600">
                                          {formatCentavos(rule.totalCostCentavos)}
                                        </span>
                                      </div>
                                      <div className="flex justify-between pt-0.5 border-t border-slate-200">
                                        <span className="font-bold">Net Profit:</span>
                                        <strong
                                          className={`font-mono ${
                                            rule.isLoss
                                              ? 'text-rose-600'
                                              : rule.isBelowThreshold
                                              ? 'text-amber-800'
                                              : 'text-emerald-700'
                                          }`}
                                        >
                                          {formatCentavos(rule.profitCentavos)}
                                        </strong>
                                      </div>
                                      <div className="flex justify-between text-[10px] text-slate-500">
                                        <span>Markup on Cost:</span>
                                        <span>+{rule.markupPercent}%</span>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit / Add Modal with Margin Threshold passed in */}
      <ProductModal
        product={selectedProductForEdit}
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        onSave={() => refreshData()}
        marginThreshold={marginThreshold}
      />

      {/* Stock Adjustment Modal */}
      <StockAdjustmentModal
        product={selectedProductForAdjust}
        isOpen={!!selectedProductForAdjust}
        onClose={() => setSelectedProductForAdjust(null)}
        onSaved={() => refreshData()}
      />
    </div>
  );
};
