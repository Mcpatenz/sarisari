/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  Banknote,
  Smartphone,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Coins,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useStore } from '../../context/StoreContext';
import { formatCentavos, pesosToCentavos, centavosToPesos } from '../../lib/pricing';
import { LocalSale, LoyaltyCustomer } from '../../types';
import { SukiPicker } from '../loyalty/SukiPicker';
import { calculatePointsDiscount, getLoyaltyConfig } from '../../lib/loyalty';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerName: string;
  onSaleCompleted: (sale: LocalSale) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  customerName: initialCustomerName,
  onSaleCompleted,
}) => {
  const { cartSummary, completeSale, currentDevice, currentRole } = useStore();

  const [selectedCustomer, setSelectedCustomer] = useState<LoyaltyCustomer | null>(null);
  const [pointsToRedeem, setPointsToRedeem] = useState<number>(0);

  const pointsDiscountCentavos = calculatePointsDiscount(pointsToRedeem, getLoyaltyConfig());
  const effectiveTotalCentavos = Math.max(0, cartSummary.totalCentavos - pointsDiscountCentavos);
  const effectiveTotalPesos = centavosToPesos(effectiveTotalCentavos);

  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'GCASH' | 'UTANG'>('CASH');
  const [cashReceivedPesos, setCashReceivedPesos] = useState<number>(effectiveTotalPesos);
  const [customerName, setCustomerName] = useState(initialCustomerName || 'Walk-in Suki');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedCustomer(null);
      setPointsToRedeem(0);
      setCustomerName(initialCustomerName || 'Walk-in Suki');
      setPaymentMethod('CASH');
      setNotes('');
      setIsSubmitting(false);
    }
  }, [isOpen, initialCustomerName]);

  // Keep cashReceived aligned with effective total if untouched
  useEffect(() => {
    setCashReceivedPesos(effectiveTotalPesos);
  }, [effectiveTotalPesos]);

  if (!isOpen) return null;

  const cashReceivedCentavos = pesosToCentavos(cashReceivedPesos);
  const changeCentavos = Math.max(0, cashReceivedCentavos - effectiveTotalCentavos);
  const isShortPayment = paymentMethod === 'CASH' && cashReceivedCentavos < effectiveTotalCentavos;

  // Bill presets in PHP
  const quickBills = [
    { label: 'Exact', value: effectiveTotalPesos },
    { label: '₱20', value: 20 },
    { label: '₱50', value: 50 },
    { label: '₱100', value: 100 },
    { label: '₱200', value: 200 },
    { label: '₱500', value: 500 },
    { label: '₱1,000', value: 1000 },
  ];

  const handleComplete = async () => {
    if (isShortPayment) {
      alert('Kulang ang ibinayad na pera! Please enter adequate cash or record as Utang.');
      return;
    }

    try {
      setIsSubmitting(true);
      const sale = await completeSale({
        paymentMethod,
        cashReceivedCentavos: paymentMethod === 'CASH' ? cashReceivedCentavos : effectiveTotalCentavos,
        customerName: (selectedCustomer ? selectedCustomer.name : customerName).trim() || 'Walk-in Suki',
        customerId: selectedCustomer?.id,
        customerPhone: selectedCustomer?.phone,
        pointsRedeemed: pointsToRedeem,
        pointsDiscountCentavos,
        notes: notes.trim() || undefined,
      });

      // Confetti burst for successful sale
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 },
        });
      } catch {
        // safe ignore if canvas not supported
      }

      onSaleCompleted(sale);
    } catch (e: unknown) {
      console.error(e);
      alert('Error recording sale: ' + (e instanceof Error ? e.message : 'Unknown error'));
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
              Payment Checkout
            </span>
            <h3 className="text-base font-bold text-white mt-0.5">Complete Transaction</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Total Due Banner */}
          <div className="p-4 rounded-xl bg-slate-900 text-white flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Total Amount Due
              </span>
              <div className="text-3xl sm:text-4xl font-black text-emerald-400 tracking-tight mt-0.5">
                {formatCentavos(effectiveTotalCentavos)}
              </div>
              {pointsDiscountCentavos > 0 && (
                <div className="text-[11px] text-amber-300 font-semibold mt-0.5">
                  Applied Suki Discount: -{formatCentavos(pointsDiscountCentavos)} ({pointsToRedeem} pts)
                </div>
              )}
            </div>
            <div className="text-right text-xs text-slate-400">
              <div className="font-semibold text-slate-300">{currentDevice.name}</div>
              <div>{currentRole === 'OWNER' ? 'Aling Nena (Owner)' : 'Cashier'}</div>
            </div>
          </div>

          {/* Suki Loyalty Points Picker (Phone search & Points Redemption) */}
          <SukiPicker
            selectedCustomer={selectedCustomer}
            onSelectCustomer={cust => {
              setSelectedCustomer(cust);
              if (cust) setCustomerName(cust.name);
            }}
            cartTotalCentavos={cartSummary.totalCentavos}
            pointsToRedeem={pointsToRedeem}
            onChangePointsToRedeem={setPointsToRedeem}
          />

          {/* Payment Method Selector */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
              Payment Method
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('CASH')}
                className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition ${
                  paymentMethod === 'CASH'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/20 font-bold'
                    : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                }`}
              >
                <Banknote className="w-5 h-5 text-emerald-600" />
                <span className="text-xs">Cash</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('GCASH')}
                className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition ${
                  paymentMethod === 'GCASH'
                    ? 'border-blue-600 bg-blue-50 text-blue-900 ring-2 ring-blue-500/20 font-bold'
                    : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                }`}
              >
                <Smartphone className="w-5 h-5 text-blue-600" />
                <span className="text-xs">GCash</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('UTANG')}
                className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition ${
                  paymentMethod === 'UTANG'
                    ? 'border-amber-600 bg-amber-50 text-amber-900 ring-2 ring-amber-500/20 font-bold'
                    : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                }`}
              >
                <BookOpen className="w-5 h-5 text-amber-600" />
                <span className="text-xs">Utang / Credit</span>
              </button>
            </div>
          </div>

          {/* Cash Keypad Section */}
          {paymentMethod === 'CASH' && (
            <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Cash Received (Bayad)
                </label>
                <div className="flex items-center gap-1 text-xs">
                  <span className="text-slate-500">₱:</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={cashReceivedPesos}
                    onChange={e => setCashReceivedPesos(Math.max(0, Number(e.target.value)))}
                    className="w-28 px-2.5 py-1 text-sm font-black bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Philippine peso bills quick buttons */}
              <div className="flex flex-wrap gap-1.5">
                {quickBills.map(bill => (
                  <button
                    key={bill.label}
                    type="button"
                    onClick={() => setCashReceivedPesos(bill.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                      cashReceivedPesos === bill.value
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    {bill.label}
                  </button>
                ))}
              </div>

              {/* Sukli (Change) Display */}
              <div
                className={`p-3.5 rounded-xl border flex items-center justify-between ${
                  isShortPayment
                    ? 'bg-rose-50 border-rose-200 text-rose-800'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Coins className={`w-5 h-5 ${isShortPayment ? 'text-rose-600' : 'text-emerald-600'}`} />
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider block">
                      {isShortPayment ? 'Kulang na Halaga' : 'Sukli (Change)'}
                    </span>
                    <p className="text-[11px] opacity-80">
                      {isShortPayment ? 'Insufficient payment' : 'Give to customer'}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span
                    className={`text-2xl font-black ${
                      isShortPayment ? 'text-rose-700' : 'text-emerald-700'
                    }`}
                  >
                    {isShortPayment
                      ? `-${formatCentavos(effectiveTotalCentavos - cashReceivedCentavos)}`
                      : formatCentavos(changeCentavos)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* GCash Details */}
          {paymentMethod === 'GCASH' && (
            <div className="p-3.5 bg-blue-50 rounded-xl border border-blue-200 space-y-2 text-xs">
              <span className="font-bold text-blue-900 block">GCash QR / Mobile Payment</span>
              <p className="text-blue-800">
                Confirm customer transfer to <strong>0917-555-SARI (Aling Nena)</strong> for{' '}
                <strong>{formatCentavos(effectiveTotalCentavos)}</strong>.
              </p>
              <input
                type="text"
                placeholder="Optional GCash Reference No. (e.g. 1029384756)..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-blue-300 rounded-lg text-slate-900 focus:outline-hidden"
              />
            </div>
          )}

          {/* Utang Details */}
          {paymentMethod === 'UTANG' && (
            <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 space-y-2 text-xs">
              <span className="font-bold text-amber-900 block">Listahan ng Utang (Store Credit)</span>
              <p className="text-amber-800">
                This transaction will be recorded on the customer&apos;s ledger. Please confirm customer name:
              </p>
              <input
                type="text"
                placeholder="Suki / Debtor Name (required for Utang)..."
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-amber-300 rounded-lg text-slate-900 font-bold focus:outline-hidden"
                required
              />
            </div>
          )}

          {/* Customer / Notes */}
          {paymentMethod !== 'UTANG' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div>
                <label className="text-slate-500 font-medium block mb-1">Customer / Suki:</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="text-slate-500 font-medium block mb-1">Sale Notes (optional):</label>
                <input
                  type="text"
                  placeholder="e.g. Inabot ni Nanay..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleComplete}
            disabled={isSubmitting || (paymentMethod === 'UTANG' && !customerName.trim())}
            className="flex-1 max-w-xs py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-md transition active:scale-98"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Confirm &amp; Issue Receipt</span>
          </button>
        </div>
      </div>
    </div>
  );
};
