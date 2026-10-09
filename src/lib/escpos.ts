/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LocalSale, PaperWidth, ThermalPrinterSettings } from '../types';
import { formatCentavos } from './pricing';
import { DEFAULT_SETTINGS } from './db';

// ESC/POS Command Byte constants
const ESC = 0x1b;
const GS = 0x1d;

export class EscPosBuilder {
  private buffer: number[] = [];
  private widthChars: number;

  constructor(paperWidth: PaperWidth = '58mm') {
    this.widthChars = paperWidth === '80mm' ? 48 : 32;
  }

  // Initialize printer
  init(): this {
    this.buffer.push(ESC, 0x40); // ESC @
    return this;
  }

  // Alignment: 0 = Left, 1 = Center, 2 = Right
  align(alignment: 'left' | 'center' | 'right'): this {
    const val = alignment === 'center' ? 1 : alignment === 'right' ? 2 : 0;
    this.buffer.push(ESC, 0x61, val);
    return this;
  }

  // Bold
  bold(enable: boolean = true): this {
    this.buffer.push(ESC, 0x45, enable ? 1 : 0);
    return this;
  }

  // Double size for headers
  doubleSize(enable: boolean = true): this {
    this.buffer.push(GS, 0x21, enable ? 0x11 : 0x00);
    return this;
  }

  // Raw text string (ASCII converted)
  text(str: string): this {
    // Replace non-ascii peso symbol with P or PHP for universal thermal printer compatibility
    const safeStr = str.replace(/₱/g, 'P');
    for (let i = 0; i < safeStr.length; i++) {
      const code = safeStr.charCodeAt(i);
      this.buffer.push(code > 127 ? 63 : code); // replace non-ascii with ?
    }
    return this;
  }

  // Text with newline
  textLine(str: string = ''): this {
    this.text(str);
    this.buffer.push(0x0a); // LF
    return this;
  }

  // Left and Right justified line (e.g. "Rice (1kg)             P60.00")
  leftRight(left: string, right: string): this {
    const safeLeft = left.replace(/₱/g, 'P');
    const safeRight = right.replace(/₱/g, 'P');
    const totalSpaces = this.widthChars - safeLeft.length - safeRight.length;

    if (totalSpaces <= 0) {
      // If too long, print left on one line, right aligned on next
      this.align('left').textLine(safeLeft);
      this.align('right').textLine(safeRight);
      this.align('left');
    } else {
      const line = safeLeft + ' '.repeat(totalSpaces) + safeRight;
      this.textLine(line);
    }
    return this;
  }

  // Separator divider
  divider(char: '-' | '=' = '-'): this {
    this.textLine(char.repeat(this.widthChars));
    return this;
  }

  // Feed lines
  feed(lines: number = 2): this {
    this.buffer.push(ESC, 0x64, lines);
    return this;
  }

  // Kick cash drawer open (pin 2 pulse)
  kickCashDrawer(): this {
    this.buffer.push(ESC, 0x70, 0x00, 0x19, 0xfa);
    return this;
  }

  // Cut paper (GS V 0 = full, GS V 1 = partial)
  cut(partial: boolean = true): this {
    this.feed(3);
    this.buffer.push(GS, 0x56, partial ? 1 : 0);
    return this;
  }

  // Build final Uint8Array buffer
  getBuffer(): Uint8Array {
    return new Uint8Array(this.buffer);
  }
}

/**
 * Builds an authentic ESC/POS thermal receipt payload for a sale
 */
export function buildThermalReceipt(
  sale: LocalSale,
  settings: ThermalPrinterSettings
): Uint8Array {
  const b = new EscPosBuilder(settings.paperWidth);

  b.init();

  if (settings.openCashDrawer) {
    b.kickCashDrawer();
  }

  // Header
  b.align('center')
    .doubleSize(true)
    .bold(true)
    .textLine(DEFAULT_SETTINGS.storeName)
    .doubleSize(false)
    .bold(false)
    .textLine(DEFAULT_SETTINGS.tagline)
    .textLine(DEFAULT_SETTINGS.address)
    .textLine(`Tel: ${DEFAULT_SETTINGS.contactNumber}`)
    .textLine(DEFAULT_SETTINGS.taxRegistrationText)
    .divider('=');

  // Transaction Meta
  b.align('left')
    .leftRight('Receipt No:', sale.receiptNumber)
    .leftRight('Date & Time:', new Date(sale.createdAt).toLocaleString())
    .leftRight('Cashier:', sale.cashierName)
    .leftRight('Station:', sale.deviceName);

  if (sale.customerName) {
    b.leftRight('Customer:', sale.customerName);
  }
  if (sale.customerPhone) {
    b.leftRight('Suki Phone:', sale.customerPhone);
  }

  b.divider('-');

  // Item lines
  b.bold(true).leftRight('ITEM / QTY', 'AMOUNT').bold(false);

  for (const item of sale.items) {
    b.bold(true).textLine(item.productName).bold(false);
    const qtyDesc = `  ${item.displayQuantity}`;
    const priceDesc = formatCentavos(item.lineTotalCentavos);
    b.leftRight(qtyDesc, priceDesc);
    if (item.pricingRuleName) {
      b.textLine(`  (${item.pricingRuleName})`);
    }
  }

  b.divider('-');

  // Totals
  const subtotalBeforeDiscounts = sale.subtotalCentavos + sale.discountCentavos;
  b.leftRight('Subtotal:', formatCentavos(subtotalBeforeDiscounts));

  if (sale.discountCentavos > 0) {
    b.leftRight('Tingi Bundle Savings:', `-${formatCentavos(sale.discountCentavos)}`);
  }

  if (sale.pointsDiscountCentavos && sale.pointsDiscountCentavos > 0) {
    b.bold(true).leftRight('Suki Points Discount:', `-${formatCentavos(sale.pointsDiscountCentavos)}`).bold(false);
  }

  b.divider('=');
  b.doubleSize(true).bold(true).leftRight('TOTAL:', formatCentavos(sale.totalCentavos)).doubleSize(false).bold(false);
  b.divider('=');

  // Payment Breakdown
  b.leftRight('Payment Mode:', sale.paymentMethod);
  if (sale.paymentMethod === 'CASH') {
    b.leftRight('Cash Received:', formatCentavos(sale.cashReceivedCentavos));
    b.bold(true).leftRight('Sukli (Change):', formatCentavos(sale.changeAmountCentavos)).bold(false);
  }

  // Loyalty Points Summary (if applicable)
  if (sale.pointsEarned !== undefined || sale.customerNewPointsBalance !== undefined) {
    b.divider('-');
    b.align('center').bold(true).textLine('** SUKI LOYALTY REWARDS **').bold(false).align('left');
    if (sale.pointsEarned && sale.pointsEarned > 0) {
      b.leftRight('Points Earned Today:', `+${sale.pointsEarned} pts`);
    }
    if (sale.pointsRedeemed && sale.pointsRedeemed > 0) {
      b.leftRight('Points Redeemed:', `-${sale.pointsRedeemed} pts`);
    }
    if (sale.customerNewPointsBalance !== undefined) {
      b.bold(true).leftRight('New Points Balance:', `${sale.customerNewPointsBalance} pts`).bold(false);
      b.align('center').textLine('(P1.00 discount per point)').align('left');
    }
  }

  // Footer Greeting
  b.divider('-');
  b.align('center')
    .textLine('Maraming salamat po sa inyong pagbili!')
    .textLine('Balik po kayo muli sa Aling Nena!')
    .feed(2);

  if (settings.autoCut) {
    b.cut(true);
  }

  return b.getBuffer();
}

/**
 * Builds a quick test print payload to verify USB/Bluetooth printer communication
 */
export function buildTestPrintReceipt(settings: ThermalPrinterSettings): Uint8Array {
  const b = new EscPosBuilder(settings.paperWidth);
  b.init();

  if (settings.openCashDrawer) {
    b.kickCashDrawer();
  }

  b.align('center')
    .doubleSize(true)
    .bold(true)
    .textLine('PRINTER CONNECTED')
    .doubleSize(false)
    .bold(false)
    .textLine('TingiPOS Thermal ESC/POS Service')
    .textLine(new Date().toLocaleString())
    .divider('=')
    .align('left')
    .leftRight('Printer Name:', settings.name)
    .leftRight('Connection:', settings.type)
    .leftRight('Paper Width:', settings.paperWidth)
    .leftRight('Cash Drawer:', settings.openCashDrawer ? 'Enabled' : 'Disabled')
    .leftRight('Auto Cut:', settings.autoCut ? 'Enabled' : 'Disabled')
    .divider('-')
    .align('center')
    .bold(true)
    .textLine('TEST RECEIPT SUCCESSFUL')
    .bold(false)
    .textLine('Aling Nena Sari-Sari Store POS')
    .feed(2);

  if (settings.autoCut) {
    b.cut(true);
  }

  return b.getBuffer();
}
