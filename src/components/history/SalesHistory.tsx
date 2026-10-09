/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { History, Search, FileText, Eye, Printer, Calendar, ArrowUpDown } from 'lucide-react';
import { db } from '../../lib/db';
import { LocalSale } from '../../types';
import { formatCentavos } from '../../lib/pricing';
import { ReceiptModal } from '../pos/ReceiptModal';
import { useStore } from '../../context/StoreContext';

export const SalesHistory: React.FC = () => {
  const { recentSales } = useStore();

  const [sales, setSales] = useState<LocalSale[]>([]);
  const [search, setSearch] = useState('');
  const [selectedSale, setSelectedSale] = useState<LocalSale | null>(null);

  useEffect(() => {
    const fetchSales = async () => {
      const all = await db.sales.orderBy('createdAt').reverse().limit(100).toArray();
      setSales(all);
    };
    fetchSales();
  }, [recentSales]);

  const filteredSales = sales.filter(s => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      s.receiptNumber.toLowerCase().includes(q) ||
      (s.customerName && s.customerName.toLowerCase().includes(q)) ||
      s.deviceName.toLowerCase().includes(q) ||
      s.items.some(i => i.productName.toLowerCase().includes(q))
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <History className="w-6 h-6 text-emerald-600" />
            <span>Store Sales History &amp; Receipts</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit log of all offline and synced transactions recorded across all stations.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search receipt #, customer, item..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-hidden"
          />
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredSales.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs">
            Walang naitalang benta. Record your first sale on the POS Counter screen.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-extrabold text-[11px]">
                <tr>
                  <th className="py-3 px-4">Receipt #</th>
                  <th className="py-3 px-3">Date &amp; Time</th>
                  <th className="py-3 px-3">Customer / Suki</th>
                  <th className="py-3 px-3">Items Sold</th>
                  <th className="py-3 px-3">Payment</th>
                  <th className="py-3 px-3">Total Amount</th>
                  <th className="py-3 px-3">Sync State</th>
                  <th className="py-3 px-4 text-right">View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredSales.map(sale => (
                  <tr key={sale.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{sale.receiptNumber}</div>
                      <div className="text-[10px] text-slate-400">{sale.deviceName}</div>
                    </td>

                    <td className="py-3 px-3 text-slate-600">
                      <div>{new Date(sale.createdAt).toLocaleDateString()}</div>
                      <div className="text-[10px] text-slate-400">
                        {new Date(sale.createdAt).toLocaleTimeString()}
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <span className="font-bold text-slate-800">
                        {sale.customerName || 'Walk-in'}
                      </span>
                    </td>

                    <td className="py-3 px-3 max-w-xs truncate text-slate-600">
                      {sale.items.map(i => `${i.productName} (${i.displayQuantity})`).join(', ')}
                    </td>

                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-slate-100 text-slate-700">
                        {sale.paymentMethod}
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      <div className="font-black text-sm text-slate-900">
                        {formatCentavos(sale.totalCentavos)}
                      </div>
                      {sale.discountCentavos > 0 && (
                        <div className="text-[10px] text-emerald-600 font-bold">
                          Promo: -{formatCentavos(sale.discountCentavos)}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          sale.syncStatus === 'SYNCED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : sale.syncStatus === 'CONFLICT'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {sale.syncStatus === 'SYNCED'
                          ? 'SYNCED'
                          : sale.syncStatus === 'CONFLICT'
                          ? 'CONFLICT'
                          : 'PENDING'}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedSale(sale)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
                        title="View and reprint receipt"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-500" />
                        <span>Receipt</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Thermal Receipt Preview Modal */}
      <ReceiptModal
        sale={selectedSale}
        isOpen={!!selectedSale}
        onClose={() => setSelectedSale(null)}
      />
    </div>
  );
};
