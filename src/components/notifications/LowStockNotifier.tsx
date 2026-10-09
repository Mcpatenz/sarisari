/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Bell,
  AlertTriangle,
  X,
  Sliders,
  PackagePlus,
  Volume2,
  VolumeX,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { LocalProduct } from '../../types';
import { StockAdjustmentModal } from '../inventory/StockAdjustmentModal';

const THRESHOLD_CONFIG_KEY = 'tingipos_threshold_config';

export interface ThresholdConfig {
  useCustomGlobalThreshold: boolean;
  globalThresholdUnits: number; // e.g. 15 pieces or 5000 grams
  soundAlerts: boolean;
  toastAlerts: boolean;
}

const DEFAULT_CONFIG: ThresholdConfig = {
  useCustomGlobalThreshold: false,
  globalThresholdUnits: 15,
  soundAlerts: true,
  toastAlerts: true,
};

export const LowStockNotifier: React.FC = () => {
  const { products, setActiveTab, refreshData } = useStore();

  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<ThresholdConfig>(() => {
    try {
      const saved = localStorage.getItem(THRESHOLD_CONFIG_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return DEFAULT_CONFIG;
  });

  const [selectedProductForRestock, setSelectedProductForRestock] = useState<LocalProduct | null>(
    null
  );
  const [activeToast, setActiveToast] = useState<{
    productName: string;
    currentStock: number;
    threshold: number;
    baseUnit: string;
  } | null>(null);

  // Save config
  const updateConfig = (updates: Partial<ThresholdConfig>) => {
    setConfig(prev => {
      const next = { ...prev, ...updates };
      localStorage.setItem(THRESHOLD_CONFIG_KEY, JSON.stringify(next));
      return next;
    });
  };

  // Determine which products are low or out of stock based on the configurable threshold
  const lowStockItems = useMemo(() => {
    return products
      .filter(p => p.active)
      .map(p => {
        const effectiveThreshold = config.useCustomGlobalThreshold
          ? p.baseUnit === 'GRAM'
            ? config.globalThresholdUnits * 100 // Scale grams accordingly (e.g. 15 -> 1500g)
            : config.globalThresholdUnits
          : p.lowStockThreshold;

        const isOut = p.stockBaseUnits <= 0;
        const isLow = !isOut && p.stockBaseUnits <= effectiveThreshold;

        return {
          product: p,
          effectiveThreshold,
          isOut,
          isLow,
          deficit: effectiveThreshold - p.stockBaseUnits,
        };
      })
      .filter(item => item.isOut || item.isLow)
      .sort((a, b) => {
        if (a.isOut && !b.isOut) return -1;
        if (!a.isOut && b.isOut) return 1;
        return a.product.stockBaseUnits - b.product.stockBaseUnits;
      });
  }, [products, config]);

  // Audio beep
  const playAlertSound = () => {
    if (!config.soundAlerts) return;
    try {
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(520, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.25);
    } catch {
      // safe ignore
    }
  };

  // Trigger toast alert when an item is critically low
  useEffect(() => {
    if (lowStockItems.length > 0 && config.toastAlerts) {
      const mostCritical = lowStockItems[0];
      if (mostCritical) {
        setActiveToast({
          productName: mostCritical.product.name,
          currentStock: mostCritical.product.stockBaseUnits,
          threshold: mostCritical.effectiveThreshold,
          baseUnit: mostCritical.product.baseUnit,
        });
        playAlertSound();
      }
    }
  }, [lowStockItems.length]);

  return (
    <>
      {/* Header Notification Bell Trigger */}
      <button
        onClick={() => setIsOpen(true)}
        className={`relative p-2 rounded-xl border transition active:scale-95 flex items-center justify-center ${
          lowStockItems.length > 0
            ? 'bg-amber-950/80 text-amber-300 border-amber-700/80 hover:bg-amber-900/80'
            : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
        }`}
        title={`${lowStockItems.length} items below inventory threshold`}
      >
        <Bell className="w-4 h-4" />
        {lowStockItems.length > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white shadow-xs">
            {lowStockItems.length}
          </span>
        )}
      </button>

      {/* Floating Low-Stock Toast Notification */}
      {activeToast && !isOpen && (
        <div className="fixed top-16 right-4 z-50 max-w-sm rounded-2xl bg-slate-900 text-white p-3.5 shadow-2xl border border-amber-500/50 flex items-start gap-3 animate-in slide-in-from-top-3">
          <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-amber-400 uppercase tracking-wider text-[10px]">
                Low Inventory Alert
              </span>
              <button
                onClick={() => setActiveToast(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <h5 className="font-bold text-white text-sm truncate mt-0.5">
              {activeToast.productName}
            </h5>
            <p className="text-slate-300 text-[11px] mt-0.5">
              Stock reached{' '}
              <strong className="text-amber-300">
                {activeToast.baseUnit === 'GRAM'
                  ? `${activeToast.currentStock / 1000}kg`
                  : `${activeToast.currentStock} units`}
              </strong>{' '}
              (Alert threshold: {activeToast.baseUnit === 'GRAM' ? `${activeToast.threshold / 1000}kg` : `${activeToast.threshold}`})
            </p>
            <div className="mt-2 flex items-center gap-2">
              <button
                onClick={() => {
                  setActiveToast(null);
                  setIsOpen(true);
                }}
                className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-[11px] transition"
              >
                View All Alerts ({lowStockItems.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Alert Drawer / Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white">Low Stock Alerts Center</h3>
                  <p className="text-xs text-slate-400">
                    {lowStockItems.length} paninda below threshold levels
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Threshold Configuration Section */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Configurable Alert Thresholds</span>
                </span>

                <button
                  onClick={() => updateConfig({ soundAlerts: !config.soundAlerts })}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md font-semibold transition ${
                    config.soundAlerts ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                  }`}
                  title="Toggle sound chime"
                >
                  {config.soundAlerts ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                  <span>{config.soundAlerts ? 'Sound ON' : 'Muted'}</span>
                </button>
              </div>

              {/* Mode Toggle */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={config.useCustomGlobalThreshold}
                    onChange={e => updateConfig({ useCustomGlobalThreshold: e.target.checked })}
                    className="accent-emerald-600 rounded"
                  />
                  <span>Override with Global Threshold:</span>
                </label>

                {config.useCustomGlobalThreshold && (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="1"
                      max="200"
                      value={config.globalThresholdUnits}
                      onChange={e =>
                        updateConfig({ globalThresholdUnits: Math.max(1, Number(e.target.value)) })
                      }
                      className="w-16 px-2 py-1 bg-white border border-slate-300 rounded-lg font-bold text-center text-slate-900"
                    />
                    <span className="text-slate-500 font-semibold">units / pcs</span>
                  </div>
                )}
              </div>

              {!config.useCustomGlobalThreshold && (
                <p className="text-[11px] text-slate-500 italic">
                  Currently using individual threshold per product (configured in Catalog/Inventory).
                </p>
              )}
            </div>

            {/* List of Low Stock Items */}
            <div className="p-4 space-y-2.5 overflow-y-auto flex-1 divide-y divide-slate-100">
              {lowStockItems.length === 0 ? (
                <div className="py-10 text-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-slate-800 text-sm">Lahat ng Paninda ay Kumpleto!</h4>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    No items are currently below the inventory threshold.
                  </p>
                </div>
              ) : (
                lowStockItems.map(({ product, isOut, effectiveThreshold }) => (
                  <div
                    key={product.id}
                    className="pt-2.5 first:pt-0 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`px-1.5 py-0.2 rounded font-extrabold text-[10px] ${
                            isOut
                              ? 'bg-rose-100 text-rose-800 border border-rose-300'
                              : 'bg-amber-100 text-amber-800 border border-amber-300'
                          }`}
                        >
                          {isOut ? 'UBOS / 0' : 'LOW STOCK'}
                        </span>
                        <h5 className="font-bold text-slate-900 text-sm truncate">{product.name}</h5>
                      </div>

                      <div className="text-slate-500 text-[11px] mt-0.5 flex items-center gap-2">
                        <span>
                          Current:{' '}
                          <strong className={isOut ? 'text-rose-600 font-black' : 'text-amber-700 font-bold'}>
                            {product.baseUnit === 'PIECE'
                              ? `${product.stockBaseUnits} pcs`
                              : `${(product.stockBaseUnits / 1000).toFixed(1)} kg`}
                          </strong>
                        </span>
                        <span>·</span>
                        <span>
                          Threshold:{' '}
                          {product.baseUnit === 'PIECE'
                            ? `${effectiveThreshold} pcs`
                            : `${(effectiveThreshold / 1000).toFixed(1)} kg`}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedProductForRestock(product)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-2xs transition active:scale-95 flex items-center gap-1"
                    >
                      <PackagePlus className="w-3.5 h-3.5" />
                      <span>Restock</span>
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs">
              <button
                onClick={() => {
                  setIsOpen(false);
                  setActiveTab('inventory');
                }}
                className="text-emerald-700 hover:underline font-bold flex items-center gap-1"
              >
                <span>Go to Inventory Management</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restock Modal Trigger */}
      {selectedProductForRestock && (
        <StockAdjustmentModal
          product={selectedProductForRestock}
          isOpen={!!selectedProductForRestock}
          onClose={() => setSelectedProductForRestock(null)}
          onSaved={() => {
            refreshData();
            setSelectedProductForRestock(null);
          }}
        />
      )}
    </>
  );
};
