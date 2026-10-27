/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LocalProduct, LocalSale, Supplier, AutoOrderSuggestion } from '../types';

export interface AutoOrderOptions {
  lookbackDays?: number; // Days of historical sales to evaluate (default 7)
  targetCoverageDays?: number; // Target days of inventory buffer to hold (default 7)
}

/**
 * Calculates auto-order replenishment suggestions based on sales velocity and current stock
 */
export function calculateAutoOrderSuggestions(
  products: LocalProduct[],
  sales: LocalSale[],
  suppliers: Supplier[],
  options: AutoOrderOptions = {}
): AutoOrderSuggestion[] {
  const lookbackDays = options.lookbackDays ?? 7;
  const targetCoverageDays = options.targetCoverageDays ?? 7;

  // Filter sales within the lookback window
  const now = Date.now();
  const windowStart = now - lookbackDays * 86400000;
  const recentSales = sales.filter(s => {
    const saleTime = new Date(s.createdAt).getTime();
    return saleTime >= windowStart && s.status === 'COMPLETED';
  });

  // Calculate total units sold per product in the lookback window
  const unitsSoldMap = new Map<string, number>();
  for (const sale of recentSales) {
    for (const item of sale.items) {
      const current = unitsSoldMap.get(item.productId) || 0;
      unitsSoldMap.set(item.productId, current + item.quantityBase);
    }
  }

  // Map suppliers by ID
  const supplierMap = new Map<string, Supplier>();
  for (const s of suppliers) {
    supplierMap.set(s.id, s);
  }

  const suggestions: AutoOrderSuggestion[] = [];

  for (const product of products) {
    if (!product.active) continue;

    const totalSold = unitsSoldMap.get(product.id) || 0;
    const dailyRunRate = totalSold / Math.max(1, lookbackDays);

    // Days of inventory (DOI)
    let daysOfInventory = 999;
    if (dailyRunRate > 0) {
      daysOfInventory = product.stockBaseUnits / dailyRunRate;
    } else if (product.stockBaseUnits <= 0) {
      daysOfInventory = 0;
    }

    // Determine supplier lead time
    const linkedSupplier = product.supplierId ? supplierMap.get(product.supplierId) : undefined;
    const leadTimeDays = linkedSupplier ? linkedSupplier.leadTimeDays : 1;

    // Determine suggested order quantity
    let suggestedOrderQty = 0;
    if (dailyRunRate > 0) {
      // Reorder up to (leadTime + targetCoverageDays) of run-rate minus current stock
      const targetStock = Math.ceil((leadTimeDays + targetCoverageDays) * dailyRunRate);
      if (product.stockBaseUnits < targetStock) {
        suggestedOrderQty = targetStock - Math.max(0, product.stockBaseUnits);
      }
    } else if (product.stockBaseUnits <= product.lowStockThreshold) {
      // If no recent sales but stock is below threshold, order back up to 2x threshold
      suggestedOrderQty = Math.max(1, product.lowStockThreshold * 2 - Math.max(0, product.stockBaseUnits));
    }

    // Urgency classification
    let urgency: AutoOrderSuggestion['urgency'] = 'HEALTHY';
    if (product.stockBaseUnits <= 0 || daysOfInventory <= 1.0) {
      urgency = 'CRITICAL';
    } else if (product.stockBaseUnits <= product.lowStockThreshold || daysOfInventory <= 3.0) {
      urgency = 'REORDER_NOW';
    } else if (daysOfInventory > 20.0 && product.stockBaseUnits > product.lowStockThreshold * 2) {
      urgency = 'SURPLUS';
    }

    // Estimated order cost
    const estimatedCostCentavos = Math.round(suggestedOrderQty * product.costPerBaseCentavos);

    suggestions.push({
      productId: product.id,
      productName: product.name,
      category: product.category,
      baseUnit: product.baseUnit,
      currentStock: product.stockBaseUnits,
      lowStockThreshold: product.lowStockThreshold,
      dailyRunRate: Number(dailyRunRate.toFixed(2)),
      daysOfInventory: Number(daysOfInventory.toFixed(1)),
      suggestedOrderQty,
      costPerBaseCentavos: product.costPerBaseCentavos,
      estimatedCostCentavos,
      urgency,
      supplierId: linkedSupplier?.id,
      supplierName: linkedSupplier?.name,
    });
  }

  // Sort by urgency priority (CRITICAL -> REORDER_NOW -> HEALTHY -> SURPLUS)
  const urgencyWeight: Record<AutoOrderSuggestion['urgency'], number> = {
    CRITICAL: 4,
    REORDER_NOW: 3,
    HEALTHY: 2,
    SURPLUS: 1,
  };

  return suggestions.sort((a, b) => {
    if (urgencyWeight[b.urgency] !== urgencyWeight[a.urgency]) {
      return urgencyWeight[b.urgency] - urgencyWeight[a.urgency];
    }
    return a.daysOfInventory - b.daysOfInventory;
  });
}
