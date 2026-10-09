/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  User,
  Phone,
  Sparkles,
  Gift,
  CheckCircle2,
  X,
  Search,
  UserPlus,
  Coins,
} from 'lucide-react';
import { LoyaltyCustomer, LoyaltyConfig } from '../../types';
import {
  searchCustomers,
  formatPhoneNumber,
  calculatePointsEarned,
  calculatePointsDiscount,
  getLoyaltyConfig,
  saveCustomer,
} from '../../lib/loyalty';
import { formatCentavos, centavosToPesos } from '../../lib/pricing';

interface SukiPickerProps {
  selectedCustomer: LoyaltyCustomer | null;
  onSelectCustomer: (customer: LoyaltyCustomer | null) => void;
  cartTotalCentavos: number;
  pointsToRedeem: number;
  onChangePointsToRedeem: (points: number) => void;
}

export const SukiPicker: React.FC<SukiPickerProps> = ({
  selectedCustomer,
  onSelectCustomer,
  cartTotalCentavos,
  pointsToRedeem,
  onChangePointsToRedeem,
}) => {
  const loyaltyConfig = useMemo(() => getLoyaltyConfig(), []);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<LoyaltyCustomer[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');

  // Search when query changes
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    let isMounted = true;
    searchCustomers(searchQuery).then(results => {
      if (isMounted) {
        setSearchResults(results.slice(0, 5));
      }
    });

    return () => {
      isMounted = false;
    };
  }, [searchQuery]);

  // Points that will be earned on this cart
  const pointsEarnedPreview = calculatePointsEarned(
    Math.max(0, cartTotalCentavos - calculatePointsDiscount(pointsToRedeem, loyaltyConfig)),
    loyaltyConfig
  );

  // Maximum points customer can redeem
  const maxRedeemablePoints = selectedCustomer
    ? Math.min(
        selectedCustomer.pointsBalance,
        Math.floor(centavosToPesos(cartTotalCentavos))
      )
    : 0;

  const handleRegisterNewCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerName.trim() || !newCustomerPhone.trim()) return;

    const saved = await saveCustomer({
      name: newCustomerName.trim(),
      phone: newCustomerPhone.trim(),
    });

    onSelectCustomer(saved);
    setShowRegisterModal(false);
    setSearchQuery('');
    setNewCustomerName('');
    setNewCustomerPhone('');
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
          <Gift className="w-3.5 h-3.5 text-emerald-600" />
          <span>Suki Loyalty Points (Phone Search)</span>
        </label>
        {selectedCustomer && (
          <button
            type="button"
            onClick={() => {
              onSelectCustomer(null);
              onChangePointsToRedeem(0);
              setSearchQuery('');
            }}
            className="text-[11px] font-semibold text-rose-600 hover:underline"
          >
            Remove Suki
          </button>
        )}
      </div>

      {/* When NO customer selected: search bar */}
      {!selectedCustomer ? (
        <div className="relative">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3" />
            <input
              type="text"
              placeholder="Search phone number (09XX...) or Suki name..."
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              className="w-full pl-9 pr-24 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
            />
            <button
              type="button"
              onClick={() => {
                setNewCustomerPhone(searchQuery.replace(/\D/g, ''));
                setShowRegisterModal(true);
              }}
              className="absolute right-1.5 px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold transition flex items-center gap-1"
            >
              <UserPlus className="w-3 h-3" />
              <span>+ New</span>
            </button>
          </div>

          {/* Search Dropdown */}
          {showDropdown && searchQuery && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-30 overflow-hidden divide-y divide-slate-100 max-h-56 overflow-y-auto">
              {searchResults.length === 0 ? (
                <div className="p-3 text-center text-xs text-slate-500">
                  <p>Walang nahanap na Suki para sa &quot;{searchQuery}&quot;.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setNewCustomerPhone(searchQuery.replace(/\D/g, ''));
                      setNewCustomerName(searchQuery.replace(/\d/g, '').trim());
                      setShowRegisterModal(true);
                      setShowDropdown(false);
                    }}
                    className="mt-1 text-emerald-700 hover:underline font-bold text-xs"
                  >
                    + I-rehistro si &quot;{searchQuery}&quot; as New Suki
                  </button>
                </div>
              ) : (
                searchResults.map(cust => (
                  <button
                    key={cust.id}
                    type="button"
                    onClick={() => {
                      onSelectCustomer(cust);
                      setShowDropdown(false);
                      setSearchQuery('');
                    }}
                    className="w-full p-2.5 text-left hover:bg-emerald-50 flex items-center justify-between text-xs transition"
                  >
                    <div>
                      <div className="font-bold text-slate-900">{cust.name}</div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {formatPhoneNumber(cust.phone)}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                        <Coins className="w-3 h-3 text-emerald-600" />
                        {cust.pointsBalance} pts
                      </span>
                      <div className="text-[10px] text-slate-400">
                        {cust.totalVisits} visits
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      ) : (
        /* When customer IS selected: Suki Profile Badge & Points Redemption */
        <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/90 space-y-2.5 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold">
                <User className="w-4 h-4" />
              </div>
              <div>
                <h5 className="font-extrabold text-slate-900">{selectedCustomer.name}</h5>
                <span className="text-[11px] font-mono text-slate-600">
                  {formatPhoneNumber(selectedCustomer.phone)}
                </span>
              </div>
            </div>

            <div className="text-right">
              <div className="flex items-center gap-1 font-black text-sm text-emerald-800">
                <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                <span>{selectedCustomer.pointsBalance} Points</span>
              </div>
              <span className="text-[10px] text-emerald-600 font-semibold block">
                Worth {formatCentavos(calculatePointsDiscount(selectedCustomer.pointsBalance, loyaltyConfig))} discount
              </span>
            </div>
          </div>

          {/* Points Redemption Slider / Toggle */}
          {selectedCustomer.pointsBalance >= loyaltyConfig.minPointsToRedeem && maxRedeemablePoints > 0 ? (
            <div className="pt-2 border-t border-emerald-200/60 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-emerald-950 flex items-center gap-1">
                  <Coins className="w-3 h-3 text-emerald-700" />
                  <span>Redeem Suki Points:</span>
                </label>
                <span className="font-black text-emerald-800 text-xs">
                  {pointsToRedeem} pts (-{formatCentavos(calculatePointsDiscount(pointsToRedeem, loyaltyConfig))})
                </span>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="0"
                  max={maxRedeemablePoints}
                  step="1"
                  value={pointsToRedeem}
                  onChange={e => onChangePointsToRedeem(Number(e.target.value))}
                  className="flex-1 accent-emerald-600 cursor-pointer"
                />
                <button
                  type="button"
                  onClick={() => onChangePointsToRedeem(pointsToRedeem > 0 ? 0 : maxRedeemablePoints)}
                  className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-200/80 hover:bg-emerald-300 text-emerald-900"
                >
                  {pointsToRedeem > 0 ? 'Clear' : 'Use Max'}
                </button>
              </div>
            </div>
          ) : (
            <div className="text-[11px] text-slate-500 italic pt-1 border-t border-emerald-200/60">
              {selectedCustomer.pointsBalance < loyaltyConfig.minPointsToRedeem
                ? `Need at least ${loyaltyConfig.minPointsToRedeem} points to redeem (currently ${selectedCustomer.pointsBalance} pts).`
                : 'Points balance is 0.'}
            </div>
          )}

          {/* Points to be earned on this purchase */}
          <div className="pt-1.5 border-t border-emerald-200/60 flex items-center justify-between text-[11px] text-emerald-900 font-semibold">
            <span>Points Earned on This Basket:</span>
            <span className="font-extrabold text-emerald-700 bg-emerald-100/90 px-2 py-0.5 rounded-full">
              +{pointsEarnedPreview} pts (Spend ₱{loyaltyConfig.pesosPerPoint} = 1 pt)
            </span>
          </div>
        </div>
      )}

      {/* New Customer Registration Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-sm">Register New Suki Customer</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowRegisterModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRegisterNewCustomer} className="p-4 space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Mobile Phone Number *</label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    placeholder="0917-123-4567"
                    value={newCustomerPhone}
                    onChange={e => setNewCustomerPhone(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl font-mono text-slate-900"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Customer / Suki Name *</label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="e.g. Nanay Cora, Kuya Boyet..."
                    value={newCustomerName}
                    onChange={e => setNewCustomerName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-slate-900 font-semibold"
                    required
                  />
                </div>
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-slate-700 text-[11px]">
                <p className="font-bold text-emerald-900 mb-0.5">Suki Rewards Benefits:</p>
                Earns 1 point for every ₱{loyaltyConfig.pesosPerPoint} spent. Points can be redeemed for
                direct cash discounts on future sari-sari store purchases.
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="px-3 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  Save &amp; Select Suki
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
