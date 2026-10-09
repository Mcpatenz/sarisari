/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import Dexie, { type Table } from 'dexie';
import {
  LocalProduct,
  LocalSale,
  InventoryMovement,
  StoreDevice,
  StoreExpense,
  StoreSettings,
  LoyaltyCustomer,
  LoyaltyConfig,
} from '../types';
import { SEED_PRODUCTS } from './seedData';

export const DEFAULT_LOYALTY_CONFIG: LoyaltyConfig = {
  pesosPerPoint: 50, // ₱50 spent = 1 point
  centavosValuePerPoint: 100, // 1 point = ₱1.00 discount
  minPointsToRedeem: 5,
};

export const SEED_CUSTOMERS: LoyaltyCustomer[] = [
  {
    id: 'cust-lorna',
    phone: '09185550192',
    name: 'Ate Lorna Santos',
    pointsBalance: 42,
    totalSpentCentavos: 215000, // ₱2,150.00
    totalVisits: 14,
    lastVisitAt: new Date(Date.now() - 86400000).toISOString(),
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    notes: 'Regular suki; bumibili ng Sinandomeng bigas at panlinis tuwing Sabado',
  },
  {
    id: 'cust-berto',
    phone: '09225554811',
    name: 'Tatay Berto Ramos',
    pointsBalance: 18,
    totalSpentCentavos: 98000, // ₱980.00
    totalVisits: 8,
    lastVisitAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
    notes: 'B-Meg pig feeds at Marlboro',
  },
  {
    id: 'cust-dennis',
    phone: '09085558329',
    name: 'Dennis Magno',
    pointsBalance: 8,
    totalSpentCentavos: 42000, // ₱420.00
    totalVisits: 3,
    lastVisitAt: new Date(Date.now() - 4 * 86400000).toISOString(),
    createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
    notes: 'Kopiko Black at Pancit Canton',
  },
];

export class SariSariDatabase extends Dexie {
  products!: Table<LocalProduct, string>;
  sales!: Table<LocalSale, string>; // Both local pending and completed
  movements!: Table<InventoryMovement, string>;
  devices!: Table<StoreDevice, string>;
  expenses!: Table<StoreExpense, string>;
  customers!: Table<LoyaltyCustomer, string>;

  constructor() {
    super('SariSariStoreDB_v1');

    this.version(1).stores({
      products: 'id, sku, barcode, name, category, active',
      sales: 'id, deviceId, receiptNumber, syncStatus, createdAt, status',
      movements: 'id, productId, type, createdAt',
      devices: 'id, name, active',
      expenses: 'id, category, createdAt',
    });

    this.version(2).stores({
      products: 'id, sku, barcode, name, category, active',
      sales: 'id, deviceId, receiptNumber, syncStatus, createdAt, status, customerPhone',
      movements: 'id, productId, type, createdAt',
      devices: 'id, name, active',
      expenses: 'id, category, createdAt',
      customers: 'id, phone, name, pointsBalance',
    });
  }
}

export const db = new SariSariDatabase();

export const DEFAULT_SETTINGS: StoreSettings = {
  storeName: 'Aling Nena Sari-Sari Store',
  tagline: 'Mura, Sariwa, at Kumpleto!',
  address: 'Brgy. San Roque, Antipolo, Rizal',
  contactNumber: '0917-555-SARI',
  taxRegistrationText: 'Barangay Micro-Business Enterprise (BMBE) Registered',
  offlineStockBufferPercent: 10,
};

export const DEFAULT_DEVICES: StoreDevice[] = [
  { id: 'dev-counter-phone', name: 'Counter 1 (Android Phone)', type: 'PHONE', active: true, isCurrent: true },
  { id: 'dev-main-tablet', name: 'Cashier 2 (Store Tablet)', type: 'TABLET', active: true, isCurrent: false },
  { id: 'dev-office-laptop', name: 'Back Office (Laptop)', type: 'LAPTOP', active: true, isCurrent: false },
];

/**
 * Initializes the local IndexedDB database with seed products if empty
 */
export async function initializeDatabase(): Promise<void> {
  const count = await db.products.count();
  if (count === 0) {
    await db.products.bulkAdd(SEED_PRODUCTS);
    
    // Seed initial devices
    await db.devices.bulkAdd(DEFAULT_DEVICES);

    // Initial movement log for starting inventory
    const movements: InventoryMovement[] = SEED_PRODUCTS.map(p => ({
      id: `mov-init-${p.id}`,
      productId: p.id,
      productName: p.name,
      type: 'PURCHASE',
      quantityDeltaBase: p.stockBaseUnits,
      reason: 'Initial store inventory seed',
      createdAt: new Date().toISOString(),
    }));
    await db.movements.bulkAdd(movements);
  } else {
    // Ensure any newly added seed items (e.g. Asukal Puti) are populated
    for (const seed of SEED_PRODUCTS) {
      const exists = await db.products.get(seed.id);
      if (!exists) {
        await db.products.add(seed);
      }
    }
  }

  // Ensure loyalty customers are initialized
  const customerCount = await db.customers.count();
  if (customerCount === 0) {
    await db.customers.bulkAdd(SEED_CUSTOMERS);
  }
}
