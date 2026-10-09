/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'OWNER' | 'CASHIER';

export type BaseUnit = 'PIECE' | 'GRAM' | 'MILLILITER';

export type SaleStatus = 'COMPLETED' | 'VOIDED' | 'RETURNED';

export type SyncStatus = 'PENDING' | 'SYNCED' | 'CONFLICT' | 'REJECTED';

export type MovementType = 'PURCHASE' | 'SALE' | 'RETURN' | 'ADJUSTMENT' | 'WASTE';

export interface ProductPriceRule {
  id: string;
  name: string; // e.g. "Tingi Single", "3-Stick Bundle", "Per Kilogram", "1/2 Kilo"
  quantityBase: number; // In base units (e.g. 1 stick, 3 sticks, 1000 grams for 1kg, 500 grams for 1/2kg)
  priceCentavos: number; // In centavos (e.g. ₱10.00 = 1000)
  priority?: number;
  isBundle?: boolean;
}

export interface ProductUnitConversion {
  id: string;
  name: string; // e.g. "Pack (20 sticks)", "Sack (25kg)", "Box (24 pouches)"
  baseUnitsPerUnit: number;
  barcode?: string;
}

export interface LocalProduct {
  id: string;
  sku: string;
  barcode?: string;
  name: string;
  category: string;
  baseUnit: BaseUnit;
  stockBaseUnits: number;
  costPerBaseCentavos: number; // Cost in centavos per base unit
  lowStockThreshold: number; // in base units
  priceRules: ProductPriceRule[]; // Tingi bundle & standard rules
  unitConversions: ProductUnitConversion[];
  active: boolean;
  version: number;
  updatedAt: string;
  imageUrl?: string;
}

export interface CartItem {
  id: string; // cart item unique ID
  productId: string;
  productName: string;
  baseUnit: BaseUnit;
  quantityBase: number;
  displayQuantity: string; // e.g. "3 sticks", "500 grams (1/2 kg)", "2 candies"
  lineTotalCentavos: number;
  costTotalCentavos: number;
  appliedRuleDescription: string; // e.g. "1x Bundle (3 for ₱10)", "₱60/kg standard", "Custom ₱20 (~333g)"
  unitPriceCentavos: number;
  savingsCentavos?: number;
}

export interface SaleItemRecord {
  id: string;
  saleId: string;
  productId: string;
  productName: string;
  quantityBase: number;
  unitPriceCentavos: number;
  lineTotalCentavos: number;
  costTotalCentavos: number;
  pricingRuleName?: string;
  displayQuantity: string;
}

export interface LocalSale {
  id: string; // UUID generated locally
  storeId: string;
  deviceId: string;
  deviceName: string;
  cashierId: string;
  cashierName: string;
  receiptNumber: string;
  status: SaleStatus;
  subtotalCentavos: number;
  discountCentavos: number;
  totalCentavos: number;
  totalCostCentavos: number;
  cashReceivedCentavos: number;
  changeAmountCentavos: number;
  paymentMethod: 'CASH' | 'GCASH' | 'UTANG';
  customerName?: string;
  customerId?: string;
  customerPhone?: string;
  pointsEarned?: number;
  pointsRedeemed?: number;
  pointsDiscountCentavos?: number;
  customerNewPointsBalance?: number;
  notes?: string;
  createdAt: string;
  items: SaleItemRecord[];
  
  // Sync metadata
  syncStatus: SyncStatus;
  syncedAt?: string;
  conflictReason?: string;
}

export interface LoyaltyCustomer {
  id: string;
  phone: string; // primary identifier (e.g. 0917-123-4567)
  name: string;
  pointsBalance: number;
  totalSpentCentavos: number;
  totalVisits: number;
  lastVisitAt?: string;
  createdAt: string;
  notes?: string;
}

export interface LoyaltyConfig {
  pesosPerPoint: number; // e.g. 50 (Spend ₱50 = earn 1 point)
  centavosValuePerPoint: number; // e.g. 100 (1 pt = ₱1.00 discount)
  minPointsToRedeem: number; // e.g. 5 points minimum
}

export type PrinterConnectionType = 'BLUETOOTH' | 'USB' | 'SYSTEM';
export type PaperWidth = '58mm' | '80mm';

export interface ThermalPrinterSettings {
  name: string;
  type: PrinterConnectionType;
  paperWidth: PaperWidth;
  autoCut: boolean;
  openCashDrawer: boolean;
  connected: boolean;
  lastConnectedAt?: string;
}

export interface InventoryMovement {
  id: string;
  productId: string;
  productName: string;
  type: MovementType;
  quantityDeltaBase: number;
  referenceId?: string;
  deviceId?: string;
  reason?: string;
  createdAt: string;
}

export interface StoreDevice {
  id: string;
  name: string;
  type: 'PHONE' | 'TABLET' | 'LAPTOP' | 'DESKTOP';
  lastSyncAt?: string;
  active: boolean;
  isCurrent?: boolean;
}

export interface SyncPushResult {
  saleId: string;
  status: 'accepted' | 'already_processed' | 'conflict' | 'rejected';
  message: string;
  conflictDetails?: {
    productId: string;
    productName: string;
    requestedBaseUnits: number;
    centralAvailableBaseUnits: number;
    deficit: number;
  };
}

export interface StoreExpense {
  id: string;
  category: 'UTILITIES' | 'RESTOCK_TRIP' | 'PACKAGING' | 'SNACKS' | 'OTHER';
  description: string;
  amountCentavos: number;
  createdAt: string;
  recordedBy: string;
}

export interface StoreSettings {
  storeName: string;
  tagline: string;
  address: string;
  contactNumber: string;
  taxRegistrationText: string;
  offlineStockBufferPercent: number; // e.g. 10% reserve for offline selling safety
}
