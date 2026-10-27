/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CashierShift, DenominationBreakdown, LocalSale, StoreExpense } from '../types';
import { formatCentavos } from './pricing';
import { thermalPrinterService } from './thermalPrinter';

export const DENOMINATION_CONFIG = [
  { key: 'p1000' as const, label: '₱1,000', centavos: 100000, type: 'BILL' },
  { key: 'p500' as const, label: '₱500', centavos: 50000, type: 'BILL' },
  { key: 'p200' as const, label: '₱200', centavos: 20000, type: 'BILL' },
  { key: 'p100' as const, label: '₱100', centavos: 10000, type: 'BILL' },
  { key: 'p50' as const, label: '₱50', centavos: 5000, type: 'BILL' },
  { key: 'p20' as const, label: '₱20', centavos: 2000, type: 'BILL_COIN' },
  { key: 'p10' as const, label: '₱10', centavos: 1000, type: 'COIN' },
  { key: 'p5' as const, label: '₱5', centavos: 500, type: 'COIN' },
  { key: 'p1' as const, label: '₱1', centavos: 100, type: 'COIN' },
  { key: 'p025' as const, label: '₱0.25', centavos: 25, type: 'COIN' },
];

export const INITIAL_DENOMINATIONS: DenominationBreakdown = {
  p1000: 0,
  p500: 0,
  p200: 0,
  p100: 0,
  p50: 0,
  p20: 0,
  p10: 0,
  p5: 0,
  p1: 0,
  p025: 0,
};

/**
 * Calculates total centavos from a physical cash count breakdown
 */
export function calculateDenominationsTotalCentavos(denominations: DenominationBreakdown): number {
  let total = 0;
  for (const item of DENOMINATION_CONFIG) {
    const count = denominations[item.key] || 0;
    total += count * item.centavos;
  }
  return total;
}

/**
 * Calculates shift summary totals from sales and expenses during the shift interval
 */
export function calculateShiftTotals(
  shift: CashierShift,
  sales: LocalSale[],
  expenses: StoreExpense[]
) {
  const shiftStart = new Date(shift.openedAt).getTime();
  const shiftEnd = shift.closedAt ? new Date(shift.closedAt).getTime() : Date.now();

  // Filter sales matching this shiftId or within time bounds if shiftId not tagged
  const shiftSales = sales.filter(s => {
    if (s.status !== 'COMPLETED') return false;
    if (s.shiftId === shift.id) return true;
    if (!s.shiftId) {
      const saleTime = new Date(s.createdAt).getTime();
      return saleTime >= shiftStart && saleTime <= shiftEnd;
    }
    return false;
  });

  let cashSalesCentavos = 0;
  let gcashSalesCentavos = 0;
  let utangSalesCentavos = 0;
  let totalSalesCentavos = 0;

  for (const s of shiftSales) {
    totalSalesCentavos += s.totalCentavos;
    if (s.paymentMethod === 'CASH') cashSalesCentavos += s.totalCentavos;
    else if (s.paymentMethod === 'GCASH') gcashSalesCentavos += s.totalCentavos;
    else if (s.paymentMethod === 'UTANG') utangSalesCentavos += s.totalCentavos;
  }

  // Filter cash expenses recorded during the shift
  const shiftExpenses = expenses.filter(e => {
    const expTime = new Date(e.createdAt).getTime();
    return expTime >= shiftStart && expTime <= shiftEnd;
  });

  const cashExpensesCentavos = shiftExpenses.reduce((sum, e) => sum + e.amountCentavos, 0);

  // Expected Cash = Opening Float + Cash Sales - Cash Expenses
  const expectedCashCentavos = shift.openingFloatCentavos + cashSalesCentavos - cashExpensesCentavos;

  return {
    shiftSales,
    transactionCount: shiftSales.length,
    cashSalesCentavos,
    gcashSalesCentavos,
    utangSalesCentavos,
    totalSalesCentavos,
    cashExpensesCentavos,
    shiftExpenses,
    expectedCashCentavos,
  };
}

/**
 * Builds printable ESC/POS shift reconciliation report receipt
 */
export function buildShiftReportReceiptText(shift: CashierShift): string {
  const isSobra = (shift.discrepancyCentavos || 0) > 0;
  const isKulang = (shift.discrepancyCentavos || 0) < 0;

  return [
    '--------------------------------',
    '       TINGIPOS SARI-SARI STORE ',
    '       CASHIER SHIFT SUMMARY    ',
    '--------------------------------',
    `Shift ID : ${shift.id}`,
    `Cashier  : ${shift.cashierName}`,
    `Device   : ${shift.deviceName}`,
    `Status   : ${shift.status}`,
    `Opened   : ${new Date(shift.openedAt).toLocaleString('en-PH')}`,
    shift.closedAt ? `Closed   : ${new Date(shift.closedAt).toLocaleString('en-PH')}` : 'Closed   : (Active)',
    '--------------------------------',
    `Opening Cash Float : ${formatCentavos(shift.openingFloatCentavos)}`,
    `(+) Cash Sales     : ${formatCentavos(shift.cashSalesCentavos)}`,
    `(-) Cash Expenses  : ${formatCentavos(shift.cashExpensesCentavos)}`,
    '--------------------------------',
    `EXPECTED CASH      : ${formatCentavos(shift.expectedCashCentavos)}`,
    shift.countedCashCentavos !== undefined
      ? `ACTUAL BLIND COUNT : ${formatCentavos(shift.countedCashCentavos)}`
      : 'ACTUAL BLIND COUNT : (Not yet counted)',
    shift.discrepancyCentavos !== undefined
      ? `RECONCILIATION     : ${isSobra ? 'SOBRA ' : isKulang ? 'KULANG ' : 'EXACT '}${formatCentavos(Math.abs(shift.discrepancyCentavos))}`
      : 'RECONCILIATION     : PENDING',
    '--------------------------------',
    'SALES BREAKDOWN BY PAYMENT:',
    `  Cash Sales       : ${formatCentavos(shift.cashSalesCentavos)}`,
    `  GCash Sales      : ${formatCentavos(shift.gcashSalesCentavos)}`,
    `  Utang (Credit)   : ${formatCentavos(shift.utangSalesCentavos)}`,
    `TOTAL SALES        : ${formatCentavos(shift.totalSalesCentavos)}`,
    `Transactions Count : ${shift.transactionCount}`,
    '--------------------------------',
    shift.notes ? `Notes: ${shift.notes}` : '',
    'Printed via TingiPOS Thermal Printer',
    '================================',
  ].filter(Boolean).join('\n');
}

/**
 * Sends shift reconciliation report to connected thermal printer
 */
export async function printShiftReportThermal(shift: CashierShift) {
  const text = buildShiftReportReceiptText(shift);
  return thermalPrinterService.printReceiptText(text);
}
