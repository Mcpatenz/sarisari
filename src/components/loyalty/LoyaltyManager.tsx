/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Gift,
  Search,
  UserPlus,
  Edit2,
  Coins,
  Sparkles,
  Phone,
  Calendar,
  Sliders,
  CheckCircle2,
  X,
  TrendingUp,
} from 'lucide-react';
import { db } from '../../lib/db';
import { LoyaltyCustomer, LoyaltyConfig } from '../../types';
import {
  formatPhoneNumber,
  getLoyaltyConfig,
  saveLoyaltyConfig,
  saveCustomer,
} from '../../lib/loyalty';
import { formatCentavos } from '../../lib/pricing';
import { useStore } from '../../context/StoreContext';

export const LoyaltyManager: React.FC = () => {
  const { customers, refreshData, currentRole } = useStore();

  const [search, setSearch] = useState('');
  const [config, setConfig] = useState<LoyaltyConfig>(getLoyaltyConfig());
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<LoyaltyCustomer | null>(null);

  // Form states
  const [nameInput, setNameInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [notesInput, setNotesInput] = useState('');
  const [pointsAdjustDelta, setPointsAdjustDelta] = useState<number>(5);
  const [adjustReason, setAdjustReason] = useState('Suki Birthday Reward');

  // Metrics
  const totalPointsInCirculation = customers.reduce((acc, c) => acc + c.pointsBalance, 0);
  const totalSukiSpendCentavos = customers.reduce((acc, c) => acc + c.totalSpentCentavos, 0);

  const filteredCustomers = customers.filter(c => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const phoneDigits = search.replace(/\D/g, '');
    return (
      c.name.toLowerCase().includes(q) ||
      (phoneDigits && c.phone.includes(phoneDigits))
    );
  });

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim() || !phoneInput.trim()) return;

    await saveCustomer({
      id: selectedCustomer ? selectedCustomer.id : undefined,
      name: nameInput.trim(),
      phone: phoneInput.trim(),
      notes: notesInput.trim(),
    });

    await refreshData();
    setShowAddModal(false);
    setSelectedCustomer(null);
    setNameInput('');
    setPhoneInput('');
    setNotesInput('');
  };

  const handleAdjustPoints = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;

    const newBalance = Math.max(0, selectedCustomer.pointsBalance + pointsAdjustDelta);
    await db.customers.update(selectedCustomer.id, {
      pointsBalance: newBalance,
      notes: `${selectedCustomer.notes || ''} [Adjust: ${pointsAdjustDelta > 0 ? '+' : ''}${pointsAdjustDelta} pts: ${adjustReason}]`.trim(),
    });

    await refreshData();
    setShowAdjustModal(false);
    setSelectedCustomer(null);
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    saveLoyaltyConfig(config);
    setShowConfigModal(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Gift className="w-6 h-6 text-emerald-600" />
            <span>Suki Loyalty Rewards Club</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Track customer phone numbers, reward points per ₱50 spent, and issue discounts to loyal suki.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowConfigModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Loyalty Rules</span>
          </button>

          <button
            onClick={() => {
              setSelectedCustomer(null);
              setNameInput('');
              setPhoneInput('');
              setNotesInput('');
              setShowAddModal(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition active:scale-95"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Add Suki</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Registered Suki Customers
          </span>
          <div className="text-2xl font-black text-slate-900 mt-1">{customers.length} Members</div>
          <span className="text-xs text-slate-500">Tracked with mobile phone</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Circulating Suki Points
          </span>
          <div className="text-2xl font-black text-emerald-700 mt-1">
            {totalPointsInCirculation} Points
          </div>
          <span className="text-xs text-emerald-700 font-semibold">
            Worth ₱{totalPointsInCirculation}.00 in discounts
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Total Suki Lifetime Spend
          </span>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {formatCentavos(totalSukiSpendCentavos)}
          </div>
          <span className="text-xs text-slate-500">Combined purchases</span>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-950 text-white shadow-md">
          <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block">
            Earning Rate Rule
          </span>
          <div className="text-2xl font-black text-white mt-1">
            ₱{config.pesosPerPoint} = 1 pt
          </div>
          <span className="text-xs text-emerald-200">1 pt = ₱1.00 store discount</span>
        </div>
      </div>

      {/* Search and Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-3 p-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Suki name or phone number..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-extrabold text-[10px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-3">Suki Name</th>
                <th className="py-3 px-3">Mobile Phone</th>
                <th className="py-3 px-3">Points Balance</th>
                <th className="py-3 px-3">Total Spend</th>
                <th className="py-3 px-3">Visits</th>
                <th className="py-3 px-3">Last Visit</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400">
                    Walang nahanap na customer.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map(cust => (
                  <tr key={cust.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900">{cust.name}</div>
                      {cust.notes && (
                        <div className="text-[10px] text-slate-400 truncate max-w-xs">{cust.notes}</div>
                      )}
                    </td>

                    <td className="py-3 px-3 font-mono font-semibold text-slate-800">
                      {formatPhoneNumber(cust.phone)}
                    </td>

                    <td className="py-3 px-3">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-900 font-black text-xs">
                        <Coins className="w-3.5 h-3.5 text-emerald-600" />
                        {cust.pointsBalance} pts
                      </span>
                    </td>

                    <td className="py-3 px-3 font-bold text-slate-900">
                      {formatCentavos(cust.totalSpentCentavos)}
                    </td>

                    <td className="py-3 px-3 text-slate-600">
                      {cust.totalVisits} transactions
                    </td>

                    <td className="py-3 px-3 text-slate-500 text-[11px]">
                      {cust.lastVisitAt ? new Date(cust.lastVisitAt).toLocaleDateString() : '—'}
                    </td>

                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCustomer(cust);
                            setPointsAdjustDelta(5);
                            setShowAdjustModal(true);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-[11px] border border-emerald-200 transition"
                        >
                          ± Points
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCustomer(cust);
                            setNameInput(cust.name);
                            setPhoneInput(cust.phone);
                            setNotesInput(cust.notes || '');
                            setShowAddModal(true);
                          }}
                          className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
                          title="Edit Customer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Suki Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">
                {selectedCustomer ? 'Edit Suki Profile' : 'Register New Suki Customer'}
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Customer / Suki Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Nanay Cora Santos"
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-900 font-semibold"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Mobile Phone Number *</label>
                <input
                  type="tel"
                  placeholder="0917-123-4567"
                  value={phoneInput}
                  onChange={e => setPhoneInput(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Notes / Preferences</label>
                <textarea
                  placeholder="Favorite items, address, or credit limit..."
                  value={notesInput}
                  onChange={e => setNotesInput(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-900 h-20 resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Points Adjustment Modal */}
      {showAdjustModal && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">Adjust Suki Points</h3>
              <button
                type="button"
                onClick={() => setShowAdjustModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAdjustPoints} className="p-5 space-y-3.5 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
                <div>
                  <span className="font-bold text-slate-900">{selectedCustomer.name}</span>
                  <div className="text-[11px] font-mono text-slate-500">{formatPhoneNumber(selectedCustomer.phone)}</div>
                </div>
                <span className="font-black text-sm text-emerald-700">{selectedCustomer.pointsBalance} pts</span>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Points Delta (+/-)</label>
                <input
                  type="number"
                  step="1"
                  value={pointsAdjustDelta}
                  onChange={e => setPointsAdjustDelta(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-black text-base text-slate-900"
                  required
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  New Resulting Balance: <strong>{Math.max(0, selectedCustomer.pointsBalance + pointsAdjustDelta)} points</strong>
                </span>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Reason for Adjustment</label>
                <input
                  type="text"
                  value={adjustReason}
                  onChange={e => setAdjustReason(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-900"
                  required
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  Confirm Points
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rules Config Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">Configure Loyalty Rules</h3>
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveConfig} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Pesos Spent to Earn 1 Point (₱)
                </label>
                <input
                  type="number"
                  min="5"
                  step="5"
                  value={config.pesosPerPoint}
                  onChange={e => setConfig({ ...config, pesosPerPoint: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold text-slate-900"
                  required
                />
                <span className="text-[11px] text-slate-500 mt-0.5 block">
                  Default: ₱50 spent = 1 point
                </span>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Cash Discount Value per Point (₱)
                </label>
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={config.centavosValuePerPoint / 100}
                  onChange={e =>
                    setConfig({ ...config, centavosValuePerPoint: Math.round(Number(e.target.value) * 100) })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold text-slate-900"
                  required
                />
                <span className="text-[11px] text-slate-500 mt-0.5 block">
                  Default: 1 point = ₱1.00 off
                </span>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Minimum Points to Redeem
                </label>
                <input
                  type="number"
                  min="1"
                  value={config.minPointsToRedeem}
                  onChange={e => setConfig({ ...config, minPointsToRedeem: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold text-slate-900"
                  required
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  Save Rules
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
