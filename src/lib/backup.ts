/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from './db';

export interface DatabaseBackup {
  version: number;
  exportedAt: string;
  storeName: string;
  data: {
    products: unknown[];
    sales: unknown[];
    movements: unknown[];
    devices: unknown[];
    expenses: unknown[];
    customers: unknown[];
    shifts: unknown[];
    suppliers: unknown[];
    purchaseOrders: unknown[];
  };
}

/**
 * Exports the entire IndexedDB state to a downloadable JSON file
 */
export async function exportDatabaseBackup(): Promise<{ success: boolean; filename: string }> {
  try {
    const [
      products,
      sales,
      movements,
      devices,
      expenses,
      customers,
      shifts,
      suppliers,
      purchaseOrders,
    ] = await Promise.all([
      db.products.toArray(),
      db.sales.toArray(),
      db.movements.toArray(),
      db.devices.toArray(),
      db.expenses.toArray(),
      db.customers.toArray(),
      db.shifts.toArray(),
      db.suppliers.toArray(),
      db.purchaseOrders.toArray(),
    ]);

    const backupPayload: DatabaseBackup = {
      version: 3,
      exportedAt: new Date().toISOString(),
      storeName: 'TingiPOS - Aling Nena Sari-Sari Store',
      data: {
        products,
        sales,
        movements,
        devices,
        expenses,
        customers,
        shifts,
        suppliers,
        purchaseOrders,
      },
    };

    const jsonString = JSON.stringify(backupPayload, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `TingiPOS-Backup-${dateStr}.json`;

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return { success: true, filename };
  } catch (error) {
    console.error('Failed to export database backup:', error);
    throw error;
  }
}

/**
 * Restores the IndexedDB database from a backup JSON string
 */
export async function restoreDatabaseBackup(
  jsonString: string
): Promise<{ success: boolean; counts: Record<string, number> }> {
  const parsed = JSON.parse(jsonString) as Partial<DatabaseBackup>;

  if (!parsed.data || typeof parsed.data !== 'object') {
    throw new Error('Invalid backup file format: missing data container.');
  }

  const {
    products = [],
    sales = [],
    movements = [],
    devices = [],
    expenses = [],
    customers = [],
    shifts = [],
    suppliers = [],
    purchaseOrders = [],
  } = parsed.data;

  // Use a Dexie transaction to ensure atomic replacement
  await db.transaction(
    'rw',
    [
      db.products,
      db.sales,
      db.movements,
      db.devices,
      db.expenses,
      db.customers,
      db.shifts,
      db.suppliers,
      db.purchaseOrders,
    ],
    async () => {
      // Clear current tables
      await Promise.all([
        db.products.clear(),
        db.sales.clear(),
        db.movements.clear(),
        db.devices.clear(),
        db.expenses.clear(),
        db.customers.clear(),
        db.shifts.clear(),
        db.suppliers.clear(),
        db.purchaseOrders.clear(),
      ]);

      // Populate restored tables
      if (products.length > 0) await db.products.bulkAdd(products as never[]);
      if (sales.length > 0) await db.sales.bulkAdd(sales as never[]);
      if (movements.length > 0) await db.movements.bulkAdd(movements as never[]);
      if (devices.length > 0) await db.devices.bulkAdd(devices as never[]);
      if (expenses.length > 0) await db.expenses.bulkAdd(expenses as never[]);
      if (customers.length > 0) await db.customers.bulkAdd(customers as never[]);
      if (shifts.length > 0) await db.shifts.bulkAdd(shifts as never[]);
      if (suppliers.length > 0) await db.suppliers.bulkAdd(suppliers as never[]);
      if (purchaseOrders.length > 0) await db.purchaseOrders.bulkAdd(purchaseOrders as never[]);
    }
  );

  return {
    success: true,
    counts: {
      products: products.length,
      sales: sales.length,
      customers: customers.length,
      shifts: shifts.length,
      suppliers: suppliers.length,
    },
  };
}
