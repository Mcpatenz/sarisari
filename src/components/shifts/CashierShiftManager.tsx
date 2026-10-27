/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Clock,
  Coins,
  DollarSign,
  Receipt,
  Printer,
  CheckCircle2,
  AlertTriangle,
  Play,
  StopCircle,
  FileText,
  History,
  Lock,
  Eye,
  EyeOff,
  ChevronRight,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { CashierShift, DenominationBreakdown } from '../../types';
import { formatCentavos, centavosToPesos, pesosToCentavos } from '../../lib/pricing';
import {
  DENOMINATION_CONFIG,
  INITIAL_DENOMINATIONS,
  calculateDenominationsTotalCentavos,
  calculateShiftTotals,
  printShiftReportThermal,
} from '../../lib/shiftManager';

export const CashierShiftManager: React.FC = () => {
  const {
    activeShift,
    allShifts,
    openNewShift,
    closeActiveShift,
    recentSales,
    currentDevice,
    currentRole,
  } = useStore();

  // Open Shift Form State
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [cashierNameInput, setCashierNameInput] = useState('');
  const [openingFloatPesos, setOpeningFloatPesos] = useState<number>(1000); // ₱1,000 default float

  // Close Shift & Blind Count State
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [denominations, setDenominations] = useState<DenominationBreakdown>(INITIAL_DENOMINATIONS);
  const [closingNotes, setClosingNotes] = useState('');
  const [isCountSubmitted, setIsCountSubmitted] = useState(false);
  const [closedShiftResult, setClosedShiftResult] = useState<CashierShift | null>(null);

  // View Past Shift Detail Modal
  const [selectedShiftForDetail, setSelectedShiftForDetail] = useState<CashierShift | null>(null);

  // Live Denomination Total (Centavos)
  const currentCountedCentavos = useMemo(() => {
    return calculateDenominationsTotalCentavos(denominations);
  }, [denominations]);

  // Handle denomination count input
  const handleDenominationChange = (key: keyof DenominationBreakdown, val: string) => {
    const qty = Math.max(0, parseInt(val, 10) || 0);
    setDenominations(prev => ({
      ...prev,
      [key]: qty,
    }));
  };

  // Open new shift
  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (openingFloatPesos < 0) return;
    await openNewShift(cashierNameInput, openingFloatPesos);
    setShowOpenModal(false);
    setCashierNameInput('');
  };

  // Submit Blind Count and Close Shift
  const handleCloseShift = async () => {
    try {
      const closed = await closeActiveShift(denominations, closingNotes);
      setClosedShiftResult(closed);
      setIsCountSubmitted(true);
    } catch (err) {
      console.error('Failed to close shift:', err);
    }
  };

  // Print shift receipt
  const handlePrintReport = async (shift: CashierShift) => {
    await printShiftReportThermal(shift);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Top Banner: Shift Status Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                activeShift
                  ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
              }`}
            >
              <Clock className="w-6 h-6" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg text-slate-900">
                  Cashier Shift Management
                </span>
                <span
                  className={`px-2 py-0.5 rounded-md text-xs font-bold tracking-wide uppercase ${
                    activeShift
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-amber-100 text-amber-800 border border-amber-300'
                  }`}
                >
                  {activeShift ? 'Shift Active' : 'No Open Shift'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {activeShift
                  ? `Cashier: ${activeShift.cashierName} · Opened at ${new Date(activeShift.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · Panukli Float: ${formatCentavos(activeShift.openingFloatCentavos)}`
                  : 'Open a shift with your starting cash float (panukli) before processing cash sales.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto">
            {activeShift ? (
              <button
                type="button"
                onClick={() => {
                  setDenominations(INITIAL_DENOMINATIONS);
                  setClosingNotes('');
                  setIsCountSubmitted(false);
                  setShowCloseModal(true);
                }}
                className="w-full md:w-auto px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition active:scale-95 flex items-center justify-center gap-2"
              >
                <StopCircle className="w-4 h-4" />
                <span>End Shift &amp; Blind Cash Count</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowOpenModal(true)}
                className="w-full md:w-auto px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition active:scale-95 flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4" />
                <span>Open New Shift</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Shifts History Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-slate-600" />
            <h3 className="font-extrabold text-sm text-slate-900">Shift Reconciliation Log</h3>
          </div>
          <span className="text-xs text-slate-500">{allShifts.length} records</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-semibold">Shift / Cashier</th>
                <th className="px-4 py-3 font-semibold">Opened</th>
                <th className="px-4 py-3 font-semibold">Closed</th>
                <th className="px-4 py-3 font-semibold text-right">Opening Float</th>
                <th className="px-4 py-3 font-semibold text-right">Total Sales</th>
                <th className="px-4 py-3 font-semibold text-right">Actual Count</th>
                <th className="px-4 py-3 font-semibold text-center">Discrepancy</th>
                <th className="px-4 py-3 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {allShifts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                    No shift records yet. Open your first cashier shift above!
                  </td>
                </tr>
              ) : (
                allShifts.map(s => {
                  const isOpen = s.status === 'OPEN';
                  const isSobra = (s.discrepancyCentavos || 0) > 0;
                  const isKulang = (s.discrepancyCentavos || 0) < 0;

                  return (
                    <tr key={s.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-900">{s.cashierName}</div>
                        <div className="text-[11px] text-slate-400">{s.deviceName}</div>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600">
                        {new Date(s.openedAt).toLocaleDateString()}{' '}
                        <span className="text-slate-400">
                          {new Date(s.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600">
                        {s.closedAt ? (
                          <>
                            {new Date(s.closedAt).toLocaleDateString()}{' '}
                            <span className="text-slate-400">
                              {new Date(s.closedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            Active Shift
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right font-medium text-slate-700">
                        {formatCentavos(s.openingFloatCentavos)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold text-slate-900">
                        {formatCentavos(s.totalSalesCentavos)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-medium text-slate-700">
                        {s.countedCashCentavos !== undefined ? (
                          formatCentavos(s.countedCashCentavos)
                        ) : (
                          <span className="text-slate-400 italic">Not counted</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        {s.discrepancyCentavos !== undefined ? (
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                              isSobra
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : isKulang
                                ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {isSobra
                              ? `+${formatCentavos(s.discrepancyCentavos)} Sobra`
                              : isKulang
                              ? `-${formatCentavos(Math.abs(s.discrepancyCentavos))} Kulang`
                              : 'Exact Balanse'}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedShiftForDetail(s)}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] transition"
                            title="View shift reconciliation report"
                          >
                            Report
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePrintReport(s)}
                            className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                            title="Print thermal shift receipt"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Open New Shift */}
      {showOpenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Play className="w-5 h-5 text-emerald-400" />
                <h3 className="font-extrabold text-base">Open Cashier Shift</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowOpenModal(false)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleOpenShift} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Cashier Name / Assigned Person
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ate Alona, Maria, or Owner"
                  value={cashierNameInput}
                  onChange={e => setCashierNameInput(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Opening Cash Float (Panukli sa Drawer)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-sm">₱</span>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={openingFloatPesos}
                    onChange={e => setOpeningFloatPesos(Math.max(0, Number(e.target.value)))}
                    className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    required
                  />
                </div>
                <div className="flex gap-2 mt-2">
                  {[500, 1000, 1500, 2000].map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setOpeningFloatPesos(amt)}
                      className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
                    >
                      ₱{amt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowOpenModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition active:scale-95"
                >
                  Start Shift
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Close Shift & Blind Cash Counting */}
      {showCloseModal && activeShift && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="font-extrabold text-base">Blind Cash Drawer Count</h3>
                  <p className="text-[11px] text-slate-400">
                    Count bills and coins physically in your drawer without system bias
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowCloseModal(false)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                Close
              </button>
            </div>

            {!isCountSubmitted ? (
              <div className="p-5 space-y-4 overflow-y-auto flex-1">
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800">
                  <div className="font-bold flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-amber-600" />
                    <span>Blind Counting in Effect</span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-amber-700">
                    The POS system expected cash balance is hidden. Enter your counted pieces for each
                    denomination. Once submitted, the system will calculate any Sobra or Kulang.
                  </p>
                </div>

                {/* Denomination Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {DENOMINATION_CONFIG.map(denom => {
                    const count = denominations[denom.key] || 0;
                    const subtotal = count * denom.centavos;

                    return (
                      <div
                        key={denom.key}
                        className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-slate-50/50"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                              denom.type === 'BILL'
                                ? 'bg-blue-100 text-blue-700'
                                : denom.type === 'BILL_COIN'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            ₱
                          </span>
                          <div>
                            <div className="font-bold text-xs text-slate-800">{denom.label}</div>
                            <div className="text-[10px] text-slate-400">
                              Total: {formatCentavos(subtotal)}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={count === 0 ? '' : count}
                            onChange={e => handleDenominationChange(denom.key, e.target.value)}
                            className="w-16 px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-center font-bold text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                          />
                          <span className="text-[11px] text-slate-500">pcs</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Closing Notes */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Shift Notes / Handover Comments (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Paid ₱150 for tube ice, customer left ₱20 coin tip"
                    value={closingNotes}
                    onChange={e => setClosingNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>

                {/* Total Counted Banner */}
                <div className="p-3.5 bg-slate-900 text-white rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
                      Total Counted Cash on Hand
                    </span>
                    <div className="text-xl font-black text-emerald-400">
                      {formatCentavos(currentCountedCentavos)}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleCloseShift}
                    className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold text-xs shadow-md transition active:scale-95"
                  >
                    Submit Blind Count &amp; Reconcile
                  </button>
                </div>
              </div>
            ) : (
              /* Reconciliation Summary View after submission */
              <div className="p-5 space-y-4 overflow-y-auto flex-1">
                {closedShiftResult && (
                  <>
                    <div
                      className={`p-4 rounded-xl border text-center ${
                        (closedShiftResult.discrepancyCentavos || 0) > 0
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                          : (closedShiftResult.discrepancyCentavos || 0) < 0
                          ? 'bg-rose-50 border-rose-200 text-rose-900'
                          : 'bg-blue-50 border-blue-200 text-blue-900'
                      }`}
                    >
                      <div className="text-xs uppercase tracking-wider font-bold">
                        Reconciliation Result
                      </div>
                      <div className="text-2xl font-black mt-1">
                        {(closedShiftResult.discrepancyCentavos || 0) > 0
                          ? `+${formatCentavos(closedShiftResult.discrepancyCentavos!)} SOBRA (OVERAGE)`
                          : (closedShiftResult.discrepancyCentavos || 0) < 0
                          ? `-${formatCentavos(Math.abs(closedShiftResult.discrepancyCentavos!))} KULANG (SHORTAGE)`
                          : 'BALANSE / EXACT ₱0.00 DISCREPANCY'}
                      </div>
                    </div>

                    {/* Breakdown Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                        <div className="text-slate-500 text-[11px]">Opening Float</div>
                        <div className="font-extrabold text-slate-900 text-sm mt-0.5">
                          {formatCentavos(closedShiftResult.openingFloatCentavos)}
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                        <div className="text-slate-500 text-[11px]">(+) Cash Sales</div>
                        <div className="font-extrabold text-emerald-700 text-sm mt-0.5">
                          {formatCentavos(closedShiftResult.cashSalesCentavos)}
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                        <div className="text-slate-500 text-[11px]">(-) Cash Expenses</div>
                        <div className="font-extrabold text-rose-700 text-sm mt-0.5">
                          {formatCentavos(closedShiftResult.cashExpensesCentavos)}
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-blue-50/50 border border-blue-200">
                        <div className="text-blue-600 text-[11px] font-bold">System Expected Cash</div>
                        <div className="font-black text-blue-900 text-sm mt-0.5">
                          {formatCentavos(closedShiftResult.expectedCashCentavos)}
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-200">
                        <div className="text-emerald-600 text-[11px] font-bold">Actual Counted Cash</div>
                        <div className="font-black text-emerald-900 text-sm mt-0.5">
                          {formatCentavos(closedShiftResult.countedCashCentavos || 0)}
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-purple-50/50 border border-purple-200">
                        <div className="text-purple-600 text-[11px] font-bold">Total Sales (All Methods)</div>
                        <div className="font-black text-purple-900 text-sm mt-0.5">
                          {formatCentavos(closedShiftResult.totalSalesCentavos)}
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => handlePrintReport(closedShiftResult)}
                        className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-2"
                      >
                        <Printer className="w-4 h-4 text-emerald-400" />
                        <span>Print Thermal Shift Report</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setShowCloseModal(false);
                          setIsCountSubmitted(false);
                        }}
                        className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                      >
                        Done &amp; Close
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: Shift Detail / Reconciliation Report View */}
      {selectedShiftForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-400" />
                <h3 className="font-extrabold text-base">Shift Reconciliation Report</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedShiftForDetail(null)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                Close
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="space-y-1.5 pb-3 border-b border-slate-200">
                <div className="flex justify-between">
                  <span className="text-slate-500">Cashier:</span>
                  <span className="font-bold text-slate-900">{selectedShiftForDetail.cashierName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Device:</span>
                  <span className="font-medium text-slate-700">{selectedShiftForDetail.deviceName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Shift Started:</span>
                  <span className="text-slate-700">{new Date(selectedShiftForDetail.openedAt).toLocaleString()}</span>
                </div>
                {selectedShiftForDetail.closedAt && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Shift Closed:</span>
                    <span className="text-slate-700">{new Date(selectedShiftForDetail.closedAt).toLocaleString()}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-600">Opening Cash Float:</span>
                  <span className="font-bold text-slate-900">{formatCentavos(selectedShiftForDetail.openingFloatCentavos)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">(+) Cash Sales:</span>
                  <span className="font-bold text-emerald-700">{formatCentavos(selectedShiftForDetail.cashSalesCentavos)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">(-) Cash Expenses Paid:</span>
                  <span className="font-bold text-rose-700">{formatCentavos(selectedShiftForDetail.cashExpensesCentavos)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-200">
                  <span className="font-bold text-slate-800">System Expected Cash:</span>
                  <span className="font-black text-slate-900">{formatCentavos(selectedShiftForDetail.expectedCashCentavos)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold text-slate-800">Counted Cash on Hand:</span>
                  <span className="font-black text-emerald-700">{formatCentavos(selectedShiftForDetail.countedCashCentavos || 0)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-200">
                  <span className="font-black text-slate-900">Discrepancy (Sobra/Kulang):</span>
                  <span
                    className={`font-black ${
                      (selectedShiftForDetail.discrepancyCentavos || 0) > 0
                        ? 'text-emerald-600'
                        : (selectedShiftForDetail.discrepancyCentavos || 0) < 0
                        ? 'text-rose-600'
                        : 'text-slate-700'
                    }`}
                  >
                    {(selectedShiftForDetail.discrepancyCentavos || 0) > 0
                      ? `+${formatCentavos(selectedShiftForDetail.discrepancyCentavos!)} Sobra`
                      : (selectedShiftForDetail.discrepancyCentavos || 0) < 0
                      ? `-${formatCentavos(Math.abs(selectedShiftForDetail.discrepancyCentavos!))} Kulang`
                      : 'Exact Balanse'}
                  </span>
                </div>
              </div>

              {/* Denomination Breakdown details if present */}
              {selectedShiftForDetail.denominations && (
                <div className="pt-3 border-t border-slate-200">
                  <div className="font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-2">
                    Blind Physical Tally Breakdown
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                    {DENOMINATION_CONFIG.filter(
                      d => (selectedShiftForDetail.denominations![d.key] || 0) > 0
                    ).map(d => {
                      const count = selectedShiftForDetail.denominations![d.key] || 0;
                      return (
                        <div key={d.key} className="flex justify-between px-2 py-1 bg-slate-50 rounded">
                          <span className="text-slate-600">
                            {d.label} × {count}
                          </span>
                          <span className="font-bold text-slate-900">{formatCentavos(count * d.centavos)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handlePrintReport(selectedShiftForDetail)}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Receipt</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedShiftForDetail(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
