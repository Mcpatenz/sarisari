/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, CheckCircle2, AlertTriangle, PackagePlus, RefreshCcw } from 'lucide-react';
import { LocalProduct, MovementType, InventoryMovement } from '../../types';
import { db } from '../../lib/db';
import { syncCentralStockUpdate } from '../../lib/syncEngine';

interface StockAdjustmentModalProps {
  product: LocalProduct | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export const StockAdjustmentModal: React.FC<StockAdjustmentModalProps> = ({
  product,
  isOpen,
  onClose,
  onSaved,
}) => {
  if (!isOpen || !product) return null;

  const [adjustmentType, setAdjustmentType] = useState<MovementType>('PURCHASE');
  const [deltaQuantity, setDeltaQuantity] = useState<number>(
    product.baseUnit === 'GRAM' ? 5000 : 20
  );
  const [reason, setReason] = useState('Supplier Delivery / Restock');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isGram = product.baseUnit === 'GRAM';

  const newProjectedStock =
    adjustmentType === 'WASTE'
      ? Math.max(0, product.stockBaseUnits - deltaQuantity)
      : product.stockBaseUnits + deltaQuantity;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (deltaQuantity <= 0) return;

    try {
      setIsSubmitting(true);
      const appliedDelta = adjustmentType === 'WASTE' ? -deltaQuantity : deltaQuantity;
      const finalStock = Math.max(0, product.stockBaseUnits + appliedDelta);

      // 1. Update product in local DB
      await db.products.update(product.id, {
        stockBaseUnits: finalStock,
        version: product.version + 1,
        updatedAt: new Date().toISOString(),
      });

      // 2. Add inventory movement log
      const movement: InventoryMovement = {
        id: `mov-${Date.now()}-${product.id}`,
        productId: product.id,
        productName: product.name,
        type: adjustmentType,
        quantityDeltaBase: appliedDelta,
        reason: reason.trim() || 'Manual stock adjustment',
        createdAt: new Date().toISOString(),
      };
      await db.movements.add(movement);

      // 3. Sync to central store
      await syncCentralStockUpdate(product.id, finalStock);

      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
      alert('Failed to update stock');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
              Inventory Ledger Adjustment
            </span>
            <h3 className="text-base font-bold text-white mt-0.5">{product.name}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Current Stock on Record:</span>
            <span className="font-extrabold text-sm text-slate-900">
              {isGram
                ? `${(product.stockBaseUnits / 1000).toFixed(1)} kg (${product.stockBaseUnits}g)`
                : `${product.stockBaseUnits} pcs`}
            </span>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
              Adjustment Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setAdjustmentType('PURCHASE');
                  setReason('Supplier Delivery / Restock');
                }}
                className={`py-2 px-2 text-xs font-bold rounded-xl border transition ${
                  adjustmentType === 'PURCHASE'
                    ? 'bg-emerald-50 border-emerald-600 text-emerald-900 ring-2 ring-emerald-500/20'
                    : 'bg-white border-slate-200 text-slate-700'
                }`}
              >
                + Restock
              </button>

              <button
                type="button"
                onClick={() => {
                  setAdjustmentType('ADJUSTMENT');
                  setReason('Physical Inventory Count Correction');
                }}
                className={`py-2 px-2 text-xs font-bold rounded-xl border transition ${
                  adjustmentType === 'ADJUSTMENT'
                    ? 'bg-blue-50 border-blue-600 text-blue-900 ring-2 ring-blue-500/20'
                    : 'bg-white border-slate-200 text-slate-700'
                }`}
              >
                ± Count Fix
              </button>

              <button
                type="button"
                onClick={() => {
                  setAdjustmentType('WASTE');
                  setReason('Damage / Expired / Spoilage');
                }}
                className={`py-2 px-2 text-xs font-bold rounded-xl border transition ${
                  adjustmentType === 'WASTE'
                    ? 'bg-rose-50 border-rose-600 text-rose-900 ring-2 ring-rose-500/20'
                    : 'bg-white border-slate-200 text-slate-700'
                }`}
              >
                - Waste / Damage
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">
              Quantity to {adjustmentType === 'WASTE' ? 'Deduct' : 'Add'} ({isGram ? 'grams' : 'pcs'})
            </label>
            <input
              type="number"
              min="1"
              value={deltaQuantity}
              onChange={e => setDeltaQuantity(Math.max(1, Number(e.target.value)))}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-base font-black text-slate-900 focus:outline-hidden"
              required
            />
            {isGram && (
              <p className="text-[11px] text-slate-400 mt-1">
                = {(deltaQuantity / 1000).toFixed(2)} kilograms
              </p>
            )}
          </div>

          <div>
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">
              Reason / Notes
            </label>
            <input
              type="text"
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-hidden"
              required
            />
          </div>

          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between text-xs">
            <span className="text-emerald-900 font-bold">New Resulting Stock:</span>
            <span className="font-black text-sm text-emerald-800">
              {isGram
                ? `${(newProjectedStock / 1000).toFixed(1)} kg (${newProjectedStock}g)`
                : `${newProjectedStock} pcs`}
            </span>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs"
            >
              Confirm Adjustment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
