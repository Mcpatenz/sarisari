/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from './db';
import { LocalProduct, LocalSale, SyncPushResult, InventoryMovement } from '../types';

const SYNC_CHANNEL_NAME = 'sari_sari_pos_sync_channel';
const CENTRAL_STORE_KEY = 'sari_sari_central_server_db';

interface CentralServerState {
  products: Record<string, { stockBaseUnits: number; version: number }>;
  processedSaleIds: Record<string, { status: 'accepted' | 'conflict'; timestamp: string }>;
  conflicts: Array<{
    saleId: string;
    deviceId: string;
    receiptNumber: string;
    productId: string;
    productName: string;
    deficit: number;
    createdAt: string;
    resolved: boolean;
  }>;
}

/**
 * Helper to get central server state from localStorage (persists across reloads/tabs)
 */
function getCentralServerState(): CentralServerState {
  try {
    const raw = localStorage.getItem(CENTRAL_STORE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to read central server state', e);
  }
  return {
    products: {},
    processedSaleIds: {},
    conflicts: [],
  };
}

function saveCentralServerState(state: CentralServerState): void {
  try {
    localStorage.setItem(CENTRAL_STORE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save central server state', e);
  }
}

/**
 * Initializes central server stock from local DB if central state is empty
 */
export async function initializeCentralServer(): Promise<void> {
  const state = getCentralServerState();
  if (Object.keys(state.products).length === 0) {
    const localProducts = await db.products.toArray();
    for (const prod of localProducts) {
      state.products[prod.id] = {
        stockBaseUnits: prod.stockBaseUnits,
        version: prod.version || 1,
      };
    }
    saveCentralServerState(state);
  }
}

/**
 * Broadcast channel for live multi-tab notification
 */
let broadcastChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  broadcastChannel = new BroadcastChannel(SYNC_CHANNEL_NAME);
}

export function notifySyncEvent(type: 'SALES_PUSHED' | 'STOCK_UPDATED' | 'CONFLICT_RESOLVED') {
  if (broadcastChannel) {
    broadcastChannel.postMessage({ type, timestamp: Date.now() });
  }
}

export function onSyncEvent(callback: (type: string) => void): () => void {
  if (!broadcastChannel) return () => {};
  const handler = (event: MessageEvent) => {
    if (event.data?.type) callback(event.data.type);
  };
  broadcastChannel.addEventListener('message', handler);
  return () => {
    broadcastChannel?.removeEventListener('message', handler);
  };
}

/**
 * Simulates POST /api/sync/push
 * Server-side validation with transaction-like atomicity and idempotency
 */
export async function pushSalesToServer(sales: LocalSale[]): Promise<SyncPushResult[]> {
  await initializeCentralServer();
  const centralState = getCentralServerState();
  const results: SyncPushResult[] = [];

  for (const sale of sales) {
    // 1. Check idempotency: Already processed?
    if (centralState.processedSaleIds[sale.id]) {
      const prior = centralState.processedSaleIds[sale.id];
      results.push({
        saleId: sale.id,
        status: 'already_processed',
        message: `Sale ${sale.receiptNumber} was already committed previously.`,
      });
      continue;
    }

    // 2. Validate stock availability centrally
    let hasConflict = false;
    let conflictDetail: SyncPushResult['conflictDetails'] = undefined;

    for (const item of sale.items) {
      const centralProd = centralState.products[item.productId];
      const availableCentralStock = centralProd ? centralProd.stockBaseUnits : 0;

      if (availableCentralStock < item.quantityBase) {
        hasConflict = true;
        const deficit = item.quantityBase - availableCentralStock;
        conflictDetail = {
          productId: item.productId,
          productName: item.productName,
          requestedBaseUnits: item.quantityBase,
          centralAvailableBaseUnits: availableCentralStock,
          deficit,
        };
        break;
      }
    }

    if (hasConflict && conflictDetail) {
      // Record conflict centrally - sale remains recorded but flagged
      centralState.processedSaleIds[sale.id] = {
        status: 'conflict',
        timestamp: new Date().toISOString(),
      };
      centralState.conflicts.push({
        saleId: sale.id,
        deviceId: sale.deviceId,
        receiptNumber: sale.receiptNumber,
        productId: conflictDetail.productId,
        productName: conflictDetail.productName,
        deficit: conflictDetail.deficit,
        createdAt: new Date().toISOString(),
        resolved: false,
      });

      // Still decrement stock into negative to reflect reality
      if (centralState.products[conflictDetail.productId]) {
        centralState.products[conflictDetail.productId].stockBaseUnits -= conflictDetail.requestedBaseUnits;
        centralState.products[conflictDetail.productId].version += 1;
      }

      saveCentralServerState(centralState);

      results.push({
        saleId: sale.id,
        status: 'conflict',
        message: `Stock conflict: "${conflictDetail.productName}" was oversold by ${conflictDetail.deficit} units across offline devices!`,
        conflictDetails: conflictDetail,
      });
    } else {
      // 3. Accept sale and deduct central stock
      for (const item of sale.items) {
        if (centralState.products[item.productId]) {
          centralState.products[item.productId].stockBaseUnits -= item.quantityBase;
          centralState.products[item.productId].version += 1;
        }
      }

      centralState.processedSaleIds[sale.id] = {
        status: 'accepted',
        timestamp: new Date().toISOString(),
      };

      saveCentralServerState(centralState);

      results.push({
        saleId: sale.id,
        status: 'accepted',
        message: `Sale ${sale.receiptNumber} verified and saved centrally.`,
      });
    }
  }

  return results;
}

/**
 * Simulates GET /api/sync/pull
 * Pulls authoritative product stocks from central server to local device
 */
export async function pullCentralCatalog(): Promise<{ updatedCount: number }> {
  await initializeCentralServer();
  const centralState = getCentralServerState();
  let updatedCount = 0;

  for (const [prodId, centralData] of Object.entries(centralState.products)) {
    const local = await db.products.get(prodId);
    if (local && local.stockBaseUnits !== centralData.stockBaseUnits) {
      await db.products.update(prodId, {
        stockBaseUnits: centralData.stockBaseUnits,
        version: centralData.version,
      });
      updatedCount++;
    }
  }

  return { updatedCount };
}

/**
 * Get all active central conflicts requiring owner review
 */
export function getCentralConflicts() {
  const state = getCentralServerState();
  return state.conflicts.filter(c => !c.resolved);
}

/**
 * Resolve an inventory discrepancy (e.g. owner adds restock or reconciles physical count)
 */
export async function resolveConflict(
  saleId: string,
  resolutionMethod: 'RESTOCK' | 'ADJUST_LEDGER',
  notes: string
): Promise<void> {
  const state = getCentralServerState();
  const conflict = state.conflicts.find(c => c.saleId === saleId);
  if (!conflict) return;

  conflict.resolved = true;

  if (resolutionMethod === 'RESTOCK') {
    // Add restock back to central
    if (state.products[conflict.productId]) {
      state.products[conflict.productId].stockBaseUnits += conflict.deficit;
      state.products[conflict.productId].version += 1;
    }
    
    // Add local movement
    const movement: InventoryMovement = {
      id: `mov-res-${Date.now()}`,
      productId: conflict.productId,
      productName: conflict.productName,
      type: 'PURCHASE',
      quantityDeltaBase: conflict.deficit,
      reason: `Conflict Resolution (Restock): ${notes}`,
      createdAt: new Date().toISOString(),
    };
    await db.movements.add(movement);
  }

  saveCentralServerState(state);

  // Update local sale status to SYNCED
  await db.sales.update(saleId, {
    syncStatus: 'SYNCED',
    notes: `Resolved conflict: ${notes}`,
  });

  // Pull new stock
  await pullCentralCatalog();
  notifySyncEvent('CONFLICT_RESOLVED');
}

/**
 * Directly update central product stock (e.g. when Owner performs restock or adds product)
 */
export async function syncCentralStockUpdate(productId: string, newStockBaseUnits: number): Promise<void> {
  await initializeCentralServer();
  const state = getCentralServerState();
  if (!state.products[productId]) {
    state.products[productId] = { stockBaseUnits: newStockBaseUnits, version: 1 };
  } else {
    state.products[productId].stockBaseUnits = newStockBaseUnits;
    state.products[productId].version += 1;
  }
  saveCentralServerState(state);
  notifySyncEvent('STOCK_UPDATED');
}
