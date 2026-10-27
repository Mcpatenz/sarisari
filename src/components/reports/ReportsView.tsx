/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  TrendingUp,
  Coins,
  DollarSign,
  Receipt,
  Plus,
  Trash2,
  Calendar,
  Layers,
  Sparkles,
} from 'lucide-react';
import { db } from '../../lib/db';
import { LocalSale, StoreExpense } from '../../types';
import { formatCentavos, pesosToCentavos, centavosToPesos } from '../../lib/pricing';
import { useStore } from '../../context/StoreContext';

export const ReportsView: React.FC = () => {
  const { currentRole, setActiveTab } = useStore();

  const [sales, setSales] = useState<LocalSale[]>([]);
  const [expenses, setExpenses] = useState<StoreExpense[]>([]);
  const [startingCashDrawerPesos, setStartingCashDrawerPesos] = useState<number>(1000); // ₱1,000 initial panukli
  
  // New Expense Modal
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseCat, setExpenseCat] = useState<StoreExpense['category']>('PACKAGING');
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseAmountPesos, setExpenseAmountPesos] = useState<number>(50);

  const loadReportData = async () => {
    const allSales = await db.sales.toArray();
    setSales(allSales);

    const allExpenses = await db.expenses.toArray();
    setExpenses(allExpenses);
  };

  useEffect(() => {
    loadReportData();
  }, []);

  // Compute Metrics
  let totalGrossCentavos = 0;
  let totalCostCentavos = 0;
  let totalDiscountCentavos = 0;
  let totalCashSalesCentavos = 0;
  let totalGcashSalesCentavos = 0;
  let totalUtangSalesCentavos = 0;

  for (const s of sales) {
    totalGrossCentavos += s.totalCentavos;
    totalCostCentavos += s.totalCostCentavos;
    totalDiscountCentavos += s.discountCentavos;

    if (s.paymentMethod === 'CASH') totalCashSalesCentavos += s.totalCentavos;
    else if (s.paymentMethod === 'GCASH') totalGcashSalesCentavos += s.totalCentavos;
    else if (s.paymentMethod === 'UTANG') totalUtangSalesCentavos += s.totalCentavos;
  }

  const grossProfitCentavos = totalGrossCentavos - totalCostCentavos;
  const totalExpensesCentavos = expenses.reduce((acc, e) => acc + e.amountCentavos, 0);
  const netProfitCentavos = grossProfitCentavos - totalExpensesCentavos;
  const marginPercent = totalGrossCentavos > 0 ? Math.round((grossProfitCentavos / totalGrossCentavos) * 100) : 0;

  // Expected Cash on Hand
  const startingCashCentavos = pesosToCentavos(startingCashDrawerPesos);
  const expectedCashDrawerCentavos = startingCashCentavos + totalCashSalesCentavos - totalExpensesCentavos;

  // Product popularity
  const productSalesMap = new Map<string, { name: string; qty: number; revenueCentavos: number }>();
  for (const s of sales) {
    for (const item of s.items) {
      const prev = productSalesMap.get(item.productId) || {
        name: item.productName,
        qty: 0,
        revenueCentavos: 0,
      };
      prev.qty += item.quantityBase;
      prev.revenueCentavos += item.lineTotalCentavos;
      productSalesMap.set(item.productId, prev);
    }
  }
  const topProducts = Array.from(productSalesMap.values())
    .sort((a, b) => b.revenueCentavos - a.revenueCentavos)
    .slice(0, 8);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseDesc.trim() || expenseAmountPesos <= 0) return;

    const newExp: StoreExpense = {
      id: `exp-${Date.now()}`,
      category: expenseCat,
      description: expenseDesc.trim(),
      amountCentavos: pesosToCentavos(expenseAmountPesos),
      createdAt: new Date().toISOString(),
      recordedBy: currentRole === 'OWNER' ? 'Aling Nena' : 'Cashier',
    };

    await db.expenses.add(newExp);
    setExpenseDesc('');
    setExpenseAmountPesos(50);
    setShowExpenseModal(false);
    await loadReportData();
  };

  const handleDeleteExpense = async (id: string) => {
    await db.expenses.delete(id);
    await loadReportData();
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
            <span>Store Reports &amp; Financial Ledger</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Gross revenue, capital cost (COGS), gross margin, daily expenses, and drawer cash.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveTab('analytics')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition active:scale-95"
          >
            <TrendingUp className="w-4 h-4" />
            <span>Peak Hour &amp; Revenue Trends &rarr;</span>
          </button>

          <button
            onClick={() => setShowExpenseModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Record Store Expense</span>
          </button>
        </div>
      </div>

      {/* Main KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Gross Sales Revenue
          </span>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {formatCentavos(totalGrossCentavos)}
          </div>
          <span className="text-xs text-slate-500">{sales.length} transactions recorded</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Gross Profit (Tubo)
          </span>
          <div className="text-2xl font-black text-emerald-700 mt-1">
            {formatCentavos(grossProfitCentavos)}
          </div>
          <span className="text-xs text-emerald-700 font-semibold">{marginPercent}% Margin</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Store Expenses (Gastusin)
          </span>
          <div className="text-2xl font-black text-rose-600 mt-1">
            {formatCentavos(totalExpensesCentavos)}
          </div>
          <span className="text-xs text-slate-500">{expenses.length} expense logs</span>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-900 text-white shadow-md">
          <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider block">
            Net Store Profit (Malinis)
          </span>
          <div className="text-2xl font-black text-white mt-1">
            {formatCentavos(netProfitCentavos)}
          </div>
          <span className="text-xs text-emerald-200">After deducting capital &amp; expenses</span>
        </div>
      </div>

      {/* Cash Drawer Calculator & Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Cash Drawer Reconciliation */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wider">
                Drawer Cash Audit (Sukat ng Benta)
              </h3>
              <p className="text-xs text-slate-500">
                Opening petty cash + Cash benta - Cash expenses paid
              </p>
            </div>
            <Coins className="w-5 h-5 text-emerald-600" />
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Starting Panukli (Opening Cash):</span>
              <div className="flex items-center gap-1">
                <span className="text-slate-400 font-bold">₱</span>
                <input
                  type="number"
                  value={startingCashDrawerPesos}
                  onChange={e => setStartingCashDrawerPesos(Number(e.target.value))}
                  className="w-24 px-2 py-1 text-xs font-black text-right border border-slate-200 rounded-lg"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-600">+ Total Cash Sales:</span>
              <span className="font-bold text-emerald-700">
                +{formatCentavos(totalCashSalesCentavos)}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-600">- Store Expenses Deducted:</span>
              <span className="font-bold text-rose-600">
                -{formatCentavos(totalExpensesCentavos)}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900 text-white flex items-center justify-between pt-3">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Expected Drawer Cash
                </span>
                <p className="text-[10px] text-slate-400">Total physical bills &amp; coins in drawer</p>
              </div>
              <div className="text-2xl font-black text-emerald-400">
                {formatCentavos(expectedCashDrawerCentavos)}
              </div>
            </div>

            {/* Other Payment Methods */}
            <div className="pt-2 border-t border-slate-100 space-y-1.5 text-slate-500">
              <div className="flex justify-between">
                <span>GCash E-Wallet Balance Collected:</span>
                <span className="font-bold text-blue-600">
                  {formatCentavos(totalGcashSalesCentavos)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Total Utang / Listahan (Receivables):</span>
                <span className="font-bold text-amber-600">
                  {formatCentavos(totalUtangSalesCentavos)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Expenses Ledger */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wider">
                Store Expenses Log ({expenses.length})
              </h3>
              <p className="text-xs text-slate-500">Daily overhead, packaging, and supplies</p>
            </div>
            <button
              onClick={() => setShowExpenseModal(true)}
              className="text-xs font-bold text-emerald-700 hover:underline"
            >
              + Add Expense
            </button>
          </div>

          {expenses.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400">
              No store expenses recorded yet today.
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {expenses.map(exp => (
                <div
                  key={exp.id}
                  className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-bold text-slate-800">{exp.description}</span>
                    <div className="text-[10px] text-slate-400">
                      {exp.category} · {new Date(exp.createdAt).toLocaleTimeString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-black text-rose-600">
                      -{formatCentavos(exp.amountCentavos)}
                    </span>
                    <button
                      onClick={() => handleDeleteExpense(exp.id)}
                      className="text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Top Tingi Products */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
          Top-Selling Paninda &amp; Tingi Revenue
        </h3>
        {topProducts.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-400">
            No sales data available yet to rank products.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {topProducts.map((p, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <span className="font-black text-slate-400 text-xs">#{idx + 1}</span>
                <h5 className="font-bold text-slate-900 text-sm mt-0.5 truncate">{p.name}</h5>
                <div className="mt-2 pt-2 border-t border-slate-200 flex justify-between items-center">
                  <span className="text-slate-500">Total Revenue:</span>
                  <span className="font-black text-emerald-700">
                    {formatCentavos(p.revenueCentavos)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Expense Modal */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">Record Store Expense</h3>
              <button onClick={() => setShowExpenseModal(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>
            <form onSubmit={handleAddExpense} className="p-5 space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-600 block mb-1">Expense Category</label>
                <select
                  value={expenseCat}
                  onChange={e => setExpenseCat(e.target.value as StoreExpense['category'])}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800"
                >
                  <option value="PACKAGING">Packaging (Sando bags, plastic supot)</option>
                  <option value="RESTOCK_TRIP">Restock Trip (Pamasahe / gas to market)</option>
                  <option value="UTILITIES">Utilities (Yelo / ice blocks, kuryente)</option>
                  <option value="SNACKS">Helper / Tindero snacks &amp; meals</option>
                  <option value="OTHER">Other operating expense</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-600 block mb-1">Description</label>
                <input
                  type="text"
                  placeholder="e.g. 1 bundle medium sando bag..."
                  value={expenseDesc}
                  onChange={e => setExpenseDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-600 block mb-1">Amount in Pesos (₱)</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={expenseAmountPesos}
                  onChange={e => setExpenseAmountPesos(Math.max(1, Number(e.target.value)))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold text-sm text-slate-900"
                  required
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
