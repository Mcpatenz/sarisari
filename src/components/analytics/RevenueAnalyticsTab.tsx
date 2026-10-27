/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp,
  Clock,
  Calendar,
  DollarSign,
  ShoppingBag,
  Zap,
  ArrowUpRight,
  Sun,
  Coffee,
  Utensils,
  Moon,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { formatCentavos, centavosToPesos } from '../../lib/pricing';

export const RevenueAnalyticsTab: React.FC = () => {
  const { recentSales } = useStore();
  const [timeframeDays, setTimeframeDays] = useState<7 | 14 | 30>(7);

  // Filter completed sales within timeframe
  const filteredSales = useMemo(() => {
    const cutoff = Date.now() - timeframeDays * 86400000;
    return recentSales.filter(s => {
      const saleTime = new Date(s.createdAt).getTime();
      return saleTime >= cutoff && s.status === 'COMPLETED';
    });
  }, [recentSales, timeframeDays]);

  // Hourly Revenue Distribution (00:00 to 23:00)
  const hourlyData = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => {
      const period = i >= 12 ? 'PM' : 'AM';
      const displayHour = i % 12 === 0 ? 12 : i % 12;
      return {
        hourIndex: i,
        hourLabel: `${displayHour}:00 ${period}`,
        shortLabel: `${displayHour}${period}`,
        revenuePesos: 0,
        revenueCentavos: 0,
        ordersCount: 0,
        cashPesos: 0,
        gcashPesos: 0,
      };
    });

    for (const sale of filteredSales) {
      const date = new Date(sale.createdAt);
      const h = date.getHours();
      if (hours[h]) {
        hours[h].revenueCentavos += sale.totalCentavos;
        hours[h].revenuePesos += centavosToPesos(sale.totalCentavos);
        hours[h].ordersCount += 1;
        if (sale.paymentMethod === 'CASH') {
          hours[h].cashPesos += centavosToPesos(sale.totalCentavos);
        } else if (sale.paymentMethod === 'GCASH') {
          hours[h].gcashPesos += centavosToPesos(sale.totalCentavos);
        }
      }
    }

    // Round pesos for chart display
    return hours.map(h => ({
      ...h,
      revenuePesos: Math.round(h.revenuePesos),
      cashPesos: Math.round(h.cashPesos),
      gcashPesos: Math.round(h.gcashPesos),
    }));
  }, [filteredSales]);

  // Peak Hour Calculation
  const peakHour = useMemo(() => {
    let best = hourlyData[0];
    for (const h of hourlyData) {
      if (h.revenueCentavos > (best?.revenueCentavos || 0)) {
        best = h;
      }
    }
    return best;
  }, [hourlyData]);

  // Daily Revenue Trends (Stacked: Cash vs GCash vs Utang)
  const dailyData = useMemo(() => {
    const daysMap = new Map<
      string,
      {
        dateKey: string;
        dayName: string;
        cashPesos: number;
        gcashPesos: number;
        utangPesos: number;
        totalPesos: number;
        ordersCount: number;
      }
    >();

    // Initialize all days in the range
    for (let i = timeframeDays - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const dateKey = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' });
      daysMap.set(dateKey, {
        dateKey,
        dayName,
        cashPesos: 0,
        gcashPesos: 0,
        utangPesos: 0,
        totalPesos: 0,
        ordersCount: 0,
      });
    }

    for (const sale of filteredSales) {
      const dateKey = sale.createdAt.split('T')[0];
      const entry = daysMap.get(dateKey);
      if (entry) {
        const pesos = centavosToPesos(sale.totalCentavos);
        entry.totalPesos += pesos;
        entry.ordersCount += 1;
        if (sale.paymentMethod === 'CASH') entry.cashPesos += pesos;
        else if (sale.paymentMethod === 'GCASH') entry.gcashPesos += pesos;
        else if (sale.paymentMethod === 'UTANG') entry.utangPesos += pesos;
      }
    }

    return Array.from(daysMap.values()).map(d => ({
      ...d,
      cashPesos: Math.round(d.cashPesos),
      gcashPesos: Math.round(d.gcashPesos),
      utangPesos: Math.round(d.utangPesos),
      totalPesos: Math.round(d.totalPesos),
    }));
  }, [filteredSales, timeframeDays]);

  // High-level KPI aggregates
  const totalRevenueCentavos = useMemo(() => {
    return filteredSales.reduce((acc, s) => acc + s.totalCentavos, 0);
  }, [filteredSales]);

  const totalCostCentavos = useMemo(() => {
    return filteredSales.reduce((acc, s) => acc + s.totalCostCentavos, 0);
  }, [filteredSales]);

  const grossProfitCentavos = totalRevenueCentavos - totalCostCentavos;
  const averageOrderValueCentavos =
    filteredSales.length > 0 ? Math.round(totalRevenueCentavos / filteredSales.length) : 0;

  // Digital vs Cash share
  const paymentBreakdown = useMemo(() => {
    let cash = 0;
    let gcash = 0;
    let utang = 0;
    for (const s of filteredSales) {
      if (s.paymentMethod === 'CASH') cash += s.totalCentavos;
      else if (s.paymentMethod === 'GCASH') gcash += s.totalCentavos;
      else if (s.paymentMethod === 'UTANG') utang += s.totalCentavos;
    }
    const total = cash + gcash + utang;
    return {
      cashPercent: total > 0 ? Math.round((cash / total) * 100) : 0,
      gcashPercent: total > 0 ? Math.round((gcash / total) * 100) : 0,
      utangPercent: total > 0 ? Math.round((utang / total) * 100) : 0,
    };
  }, [filteredSales]);

  // Top products by sales revenue
  const topProducts = useMemo(() => {
    const map = new Map<string, { name: string; revenueCentavos: number; units: number }>();
    for (const s of filteredSales) {
      for (const item of s.items) {
        const cur = map.get(item.productId) || { name: item.productName, revenueCentavos: 0, units: 0 };
        cur.revenueCentavos += item.lineTotalCentavos;
        cur.units += item.quantityBase;
        map.set(item.productId, cur);
      }
    }
    return Array.from(map.values())
      .sort((a, b) => b.revenueCentavos - a.revenueCentavos)
      .slice(0, 5);
  }, [filteredSales]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Top Header & Timeframe Selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            <h2 className="font-extrabold text-base text-slate-900">
              Revenue &amp; Peak Hour Analytics
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Identify rush hours, daily income trends, and payment method patterns
          </p>
        </div>

        {/* Timeframe Filter Buttons */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          {[7, 14, 30].map(days => (
            <button
              key={days}
              type="button"
              onClick={() => setTimeframeDays(days as 7 | 14 | 30)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                timeframeDays === days
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Last {days} Days
            </button>
          ))}
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Total Revenue</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-black text-slate-900 mt-1">
            {formatCentavos(totalRevenueCentavos)}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Gross profit: <strong className="text-emerald-700">{formatCentavos(grossProfitCentavos)}</strong>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Peak Business Hour</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-lg font-black text-slate-900 mt-1 truncate">
            {peakHour?.revenueCentavos > 0 ? peakHour.hourLabel : 'None yet'}
          </div>
          <div className="text-[11px] text-amber-700 font-semibold mt-0.5 truncate">
            {peakHour?.revenueCentavos > 0
              ? `${formatCentavos(peakHour.revenueCentavos)} (${peakHour.ordersCount} sales)`
              : 'Record more sales'}
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Average Order Value</span>
            <ShoppingBag className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl font-black text-slate-900 mt-1">
            {formatCentavos(averageOrderValueCentavos)}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {filteredSales.length} total orders completed
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Payment Mix</span>
            <Zap className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-sm font-black text-slate-900 mt-1 flex items-center gap-2">
            <span className="text-emerald-700">{paymentBreakdown.cashPercent}% Cash</span>
            <span className="text-slate-300">·</span>
            <span className="text-blue-700">{paymentBreakdown.gcashPercent}% GCash</span>
          </div>
          <div className="text-[11px] text-purple-700 font-medium mt-0.5">
            {paymentBreakdown.utangPercent}% Utang / credit
          </div>
        </div>
      </div>

      {/* Hourly Revenue Curve Chart (Peak Hours Visualization) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-600" />
              <span>Hourly Sales Trend &amp; Rush Hours (24-Hour Distribution)</span>
            </h3>
            <p className="text-xs text-slate-500">
              Helps sari-sari store owners schedule inventory prep and cashier shifts
            </p>
          </div>

          {/* Rush Hour Badges */}
          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
              <Coffee className="w-3 h-3 text-amber-600" />
              <span>Morning: 7-9 AM</span>
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-orange-50 text-orange-800 border border-orange-200">
              <Utensils className="w-3 h-3 text-orange-600" />
              <span>Lunch: 12-1 PM</span>
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
              <Sun className="w-3 h-3 text-emerald-600" />
              <span>Merienda: 3-5 PM</span>
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-purple-800 border border-purple-200">
              <Moon className="w-3 h-3 text-purple-600" />
              <span>Evening: 7-9 PM</span>
            </span>
          </div>
        </div>

        {/* Recharts Area / Bar Chart for Hours */}
        <div className="h-64 sm:h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={hourlyData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <defs>
                <linearGradient id="colorHourly" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#059669" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#059669" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="shortLabel" tick={{ fontSize: 10, fill: '#64748b' }} interval={1} />
              <YAxis
                tick={{ fontSize: 10, fill: '#64748b' }}
                tickFormatter={val => `₱${val}`}
                domain={['auto', 'auto']}
              />
              <Tooltip
                formatter={(value: any) => [`₱${Number(value).toLocaleString()}`, 'Revenue']}
                labelFormatter={(label, items) => {
                  const hourObj = items?.[0]?.payload;
                  return hourObj ? hourObj.hourLabel : label;
                }}
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '12px',
                }}
              />
              <Area
                type="monotone"
                dataKey="revenuePesos"
                stroke="#059669"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorHourly)"
                name="Hourly Revenue (₱)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Daily Revenue Trends (Stacked Bar: Cash, GCash, Utang) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span>Daily Revenue &amp; Payment Method Breakdown</span>
              </h3>
              <p className="text-xs text-slate-500">
                Comparing Cash sales vs GCash cashless adoption over time
              </p>
            </div>
          </div>

          <div className="h-64 sm:h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="dayName" tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  tickFormatter={val => `₱${val}`}
                />
                <Tooltip
                  formatter={(value: any, name: any) => [`₱${Number(value).toLocaleString()}`, name]}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                  iconType="circle"
                />
                <Bar dataKey="cashPesos" name="Cash (₱)" fill="#10b981" stackId="a" radius={[0, 0, 0, 0]} />
                <Bar dataKey="gcashPesos" name="GCash (₱)" fill="#3b82f6" stackId="a" radius={[0, 0, 0, 0]} />
                <Bar dataKey="utangPesos" name="Utang / Credit (₱)" fill="#a855f7" stackId="a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Velocity Items */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-emerald-600" />
              <h3 className="font-extrabold text-sm text-slate-900">Top Sales Velocity Items</h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Paninda driving the largest share of store income
            </p>

            <div className="space-y-3">
              {topProducts.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs italic">
                  No sales recorded in this period.
                </div>
              ) : (
                topProducts.map((p, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                        #{idx + 1}
                      </span>
                      <span className="font-bold text-slate-800 truncate">{p.name}</span>
                    </div>
                    <span className="font-extrabold text-emerald-700 ml-2 shrink-0">
                      {formatCentavos(p.revenueCentavos)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 text-[11px] text-slate-500">
            Tip: Keep extra stock of high velocity items during peak hours (e.g. cold drinks during 3-5 PM Merienda).
          </div>
        </div>
      </div>
    </div>
  );
};
