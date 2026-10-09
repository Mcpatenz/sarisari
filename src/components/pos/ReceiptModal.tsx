/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef } from 'react';
import {
  X,
  Printer,
  Share2,
  CheckCircle2,
  Sparkles,
  Wifi,
  WifiOff,
  Copy,
} from 'lucide-react';
import { LocalSale } from '../../types';
import { formatCentavos } from '../../lib/pricing';
import { DEFAULT_SETTINGS } from '../../lib/db';
import { useStore } from '../../context/StoreContext';
import { PrinterModal } from '../printer/PrinterModal';
import { formatPhoneNumber } from '../../lib/loyalty';
import { Bluetooth, Usb, Zap, Sliders } from 'lucide-react';

interface ReceiptModalProps {
  sale: LocalSale | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  sale,
  isOpen,
  onClose,
}) => {
  const receiptRef = useRef<HTMLDivElement>(null);
  const { printThermalReceipt, printerSettings } = useStore();
  const [showPrinterModal, setShowPrinterModal] = React.useState(false);
  const [isSendingThermal, setIsSendingThermal] = React.useState(false);

  if (!isOpen || !sale) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDirectThermalPrint = async () => {
    try {
      setIsSendingThermal(true);
      const res = await printThermalReceipt(sale);
      alert(res.message);
    } catch (err: any) {
      alert(`Thermal print error: ${err.message || 'Printer write failed'}`);
    } finally {
      setIsSendingThermal(false);
    }
  };

  const handleCopyText = () => {
    const lines = [
      `================================`,
      DEFAULT_SETTINGS.storeName,
      DEFAULT_SETTINGS.tagline,
      DEFAULT_SETTINGS.address,
      `Contact: ${DEFAULT_SETTINGS.contactNumber}`,
      `================================`,
      `Receipt: ${sale.receiptNumber}`,
      `Date: ${new Date(sale.createdAt).toLocaleString()}`,
      `Cashier: ${sale.cashierName}`,
      `Device: ${sale.deviceName}`,
      `Customer: ${sale.customerName || 'Walk-in'}`,
      `--------------------------------`,
      ...sale.items.map(
        i =>
          `${i.productName}\n  ${i.displayQuantity} @ ${formatCentavos(i.unitPriceCentavos)} = ${formatCentavos(i.lineTotalCentavos)}`
      ),
      `--------------------------------`,
      `Subtotal: ${formatCentavos(sale.subtotalCentavos + sale.discountCentavos)}`,
      sale.discountCentavos > 0
        ? `Tingi Savings: -${formatCentavos(sale.discountCentavos)}`
        : '',
      `TOTAL: ${formatCentavos(sale.totalCentavos)}`,
      `Payment: ${sale.paymentMethod}`,
      sale.paymentMethod === 'CASH'
        ? `Cash Received: ${formatCentavos(sale.cashReceivedCentavos)}\nSukli (Change): ${formatCentavos(sale.changeAmountCentavos)}`
        : '',
      `================================`,
      `Salamat po sa pagbili! Balik po kayo!`,
    ]
      .filter(Boolean)
      .join('\n');

    navigator.clipboard.writeText(lines);
    alert('Receipt copied to clipboard!');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Action Bar */}
        <div className="p-3 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold">Transaction Recorded</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Printable Thermal Receipt Container */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-100/70 flex justify-center">
          <div
            ref={receiptRef}
            className="w-full max-w-[320px] bg-white p-5 rounded-xl shadow-xs border border-slate-300 font-mono text-xs text-slate-900 space-y-3 leading-tight"
          >
            {/* Header */}
            <div className="text-center space-y-0.5">
              <h2 className="font-extrabold text-sm uppercase tracking-tight text-slate-950">
                {DEFAULT_SETTINGS.storeName}
              </h2>
              <p className="text-[10px] text-slate-600 italic">{DEFAULT_SETTINGS.tagline}</p>
              <p className="text-[10px] text-slate-500">{DEFAULT_SETTINGS.address}</p>
              <p className="text-[10px] text-slate-500">Tel: {DEFAULT_SETTINGS.contactNumber}</p>
              <p className="text-[9px] text-slate-400 pt-0.5 border-b border-dashed border-slate-300 pb-2">
                {DEFAULT_SETTINGS.taxRegistrationText}
              </p>
            </div>

            {/* Meta */}
            <div className="text-[10px] space-y-0.5 text-slate-600 border-b border-dashed border-slate-300 pb-2">
              <div className="flex justify-between">
                <span>Receipt:</span>
                <span className="font-bold text-slate-900">{sale.receiptNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>Date:</span>
                <span>{new Date(sale.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Time:</span>
                <span>{new Date(sale.createdAt).toLocaleTimeString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Cashier:</span>
                <span>{sale.cashierName}</span>
              </div>
              <div className="flex justify-between">
                <span>Device:</span>
                <span>{sale.deviceName}</span>
              </div>
              {sale.customerName && (
                <div className="flex justify-between">
                  <span>Customer:</span>
                  <span className="font-semibold">{sale.customerName}</span>
                </div>
              )}
              {sale.customerPhone && (
                <div className="flex justify-between">
                  <span>Suki Phone:</span>
                  <span className="font-mono">{formatPhoneNumber(sale.customerPhone)}</span>
                </div>
              )}
            </div>

            {/* Items Table */}
            <div className="space-y-1.5 border-b border-dashed border-slate-300 pb-2">
              <div className="flex justify-between text-[10px] font-bold uppercase text-slate-500">
                <span>Item / Qty</span>
                <span>Amount</span>
              </div>
              {sale.items.map(item => (
                <div key={item.id} className="text-[11px] leading-tight">
                  <div className="font-semibold text-slate-950">{item.productName}</div>
                  <div className="flex justify-between text-[10px] text-slate-600">
                    <span>
                      {item.displayQuantity} ({item.pricingRuleName || 'Standard'})
                    </span>
                    <span className="font-bold">{formatCentavos(item.lineTotalCentavos)}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="space-y-1 text-[11px] border-b border-dashed border-slate-300 pb-2">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span>{formatCentavos(sale.subtotalCentavos + sale.discountCentavos)}</span>
              </div>

              {sale.discountCentavos > 0 && (
                <div className="flex justify-between text-emerald-700 font-bold">
                  <span>Tingi Promo Savings:</span>
                  <span>-{formatCentavos(sale.discountCentavos)}</span>
                </div>
              )}

              {sale.pointsDiscountCentavos !== undefined && sale.pointsDiscountCentavos > 0 && (
                <div className="flex justify-between text-emerald-700 font-bold">
                  <span>Suki Points Discount:</span>
                  <span>-{formatCentavos(sale.pointsDiscountCentavos)} ({sale.pointsRedeemed} pts)</span>
                </div>
              )}

              <div className="flex justify-between text-sm font-black text-slate-950 pt-1">
                <span>TOTAL:</span>
                <span>{formatCentavos(sale.totalCentavos)}</span>
              </div>

              <div className="flex justify-between text-slate-600 text-[10px] pt-1">
                <span>Payment Mode:</span>
                <span className="font-bold">{sale.paymentMethod}</span>
              </div>

              {sale.paymentMethod === 'CASH' && (
                <>
                  <div className="flex justify-between text-slate-600 text-[10px]">
                    <span>Cash Received:</span>
                    <span>{formatCentavos(sale.cashReceivedCentavos)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-emerald-800 text-xs">
                    <span>Sukli (Change):</span>
                    <span>{formatCentavos(sale.changeAmountCentavos)}</span>
                  </div>
                </>
              )}
            </div>

            {/* Suki Loyalty Points Block (if applicable) */}
            {(sale.pointsEarned !== undefined || sale.customerNewPointsBalance !== undefined) && (
              <div className="space-y-0.5 text-[10px] border-b border-dashed border-slate-300 pb-2 bg-emerald-50/50 p-2 rounded-lg">
                <div className="font-bold text-center text-emerald-900 uppercase tracking-wider pb-0.5">
                  ★ Suki Loyalty Rewards ★
                </div>
                {sale.pointsEarned !== undefined && sale.pointsEarned > 0 && (
                  <div className="flex justify-between text-emerald-800 font-semibold">
                    <span>Points Earned Today:</span>
                    <span className="font-bold">+{sale.pointsEarned} pts</span>
                  </div>
                )}
                {sale.pointsRedeemed !== undefined && sale.pointsRedeemed > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Points Redeemed:</span>
                    <span>-{sale.pointsRedeemed} pts</span>
                  </div>
                )}
                {sale.customerNewPointsBalance !== undefined && (
                  <div className="flex justify-between text-emerald-950 font-bold pt-0.5 border-t border-emerald-200/60">
                    <span>New Points Balance:</span>
                    <span className="text-emerald-700">{sale.customerNewPointsBalance} pts (₱{sale.customerNewPointsBalance}.00)</span>
                  </div>
                )}
              </div>
            )}

            {/* Sync Badge on Receipt */}
            <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
              <span>Sync State:</span>
              <span
                className={`px-1.5 py-0.2 rounded font-bold uppercase ${
                  sale.syncStatus === 'SYNCED'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {sale.syncStatus === 'SYNCED' ? '☁️ Synced to Central' : '💾 Offline (Queued)'}
              </span>
            </div>

            {/* Barcode & Footer Greeting */}
            <div className="text-center pt-2 space-y-1">
              <div className="font-mono text-[9px] tracking-widest text-slate-400">
                ||| | |||| || ||| |||| | ||||| ||
              </div>
              <p className="text-[10px] font-bold text-slate-800">
                Maraming salamat po sa pagbili!
              </p>
              <p className="text-[9px] text-slate-500">Ang hindi marunong magsukli, malulugi!</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-3 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleCopyText}
              className="px-2.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
              title="Copy receipt as text"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1 px-2.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
              title="Standard browser print dialog"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Browser</span>
            </button>

            {/* Dedicated ESC/POS Thermal Print Button */}
            <button
              type="button"
              onClick={handleDirectThermalPrint}
              disabled={isSendingThermal}
              className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold transition shadow-xs ${
                printerSettings.connected
                  ? 'bg-blue-600 hover:bg-blue-700 text-white active:scale-95'
                  : 'bg-slate-800 hover:bg-slate-700 text-white'
              }`}
              title="Print directly to ESC/POS thermal printer via USB or Bluetooth"
            >
              {printerSettings.type === 'BLUETOOTH' ? (
                <Bluetooth className="w-3.5 h-3.5" />
              ) : printerSettings.type === 'USB' ? (
                <Usb className="w-3.5 h-3.5" />
              ) : (
                <Zap className="w-3.5 h-3.5 text-amber-400" />
              )}
              <span>{isSendingThermal ? 'Sending...' : 'Thermal Print'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowPrinterModal(true)}
              className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition"
              title="Printer pairing and hardware settings"
            >
              <Sliders className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex-1 min-w-[120px] py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs text-center"
          >
            Done &rarr;
          </button>
        </div>
      </div>

      {/* Printer Pairing & Settings Modal */}
      <PrinterModal isOpen={showPrinterModal} onClose={() => setShowPrinterModal(false)} />
    </div>
  );
};
