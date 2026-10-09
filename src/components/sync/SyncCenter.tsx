/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Layers,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Smartphone,
  Tablet,
  Laptop,
  Monitor,
  Plus,
  Play,
  Clock,
  ShieldCheck,
  FileText,
  Server,
  Zap,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import {
  getCentralConflicts,
  resolveConflict,
  pushSalesToServer,
  pullCentralCatalog,
  syncCentralStockUpdate,
} from '../../lib/syncEngine';
import { formatCentavos } from '../../lib/pricing';
import { db } from '../../lib/db';
import { LocalSale, StoreDevice } from '../../types';

export const SyncCenter: React.FC = () => {
  const {
    currentDevice,
    allDevices,
    switchDevice,
    addDevice,
    isOnline,
    toggleSimulateOffline,
    triggerSync,
    isSyncing,
    pendingSalesCount,
    lastSyncTime,
    currentRole,
    refreshData,
  } = useStore();

  const [pendingSales, setPendingSales] = useState<LocalSale[]>([]);
  const [conflictSales, setConflictSales] = useState<LocalSale[]>([]);
  const [centralConflicts, setCentralConflicts] = useState<ReturnType<typeof getCentralConflicts>>([]);

  const [newDeviceName, setNewDeviceName] = useState('');
  const [newDeviceType, setNewDeviceType] = useState<StoreDevice['type']>('PHONE');
  const [showAddDevice, setShowAddDevice] = useState(false);

  // Resolution state
  const [resolvingSaleId, setResolvingSaleId] = useState<string | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('Restocked from back storeroom');

  // Load sales
  const loadSyncData = async () => {
    const pend = await db.sales.where('syncStatus').equals('PENDING').toArray();
    setPendingSales(pend);

    const conf = await db.sales.where('syncStatus').equals('CONFLICT').toArray();
    setConflictSales(conf);

    const cConf = getCentralConflicts();
    setCentralConflicts(cConf);
  };

  useEffect(() => {
    loadSyncData();
  }, [pendingSalesCount, isSyncing]);

  const handleCreateDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeviceName.trim()) return;
    await addDevice(newDeviceName.trim(), newDeviceType);
    setNewDeviceName('');
    setShowAddDevice(false);
  };

  // Run the exact scenario from Blueprint Section 5
  const handleSimulateConflictScenario = async () => {
    try {
      // Find cigarette product (e.g. Marlboro)
      const cigarette = await db.products.where('sku').equals('YOSI-001').first();
      if (!cigarette) {
        alert('Cigarette product not found');
        return;
      }

      // Step 1: Set central and local stock to 10 sticks
      await db.products.update(cigarette.id, { stockBaseUnits: 10 });
      await syncCentralStockUpdate(cigarette.id, 10);

      // Step 2: Simulate Phone selling 7 sticks while offline
      const sale1: LocalSale = {
        id: `sale-sim-phone-${Date.now()}`,
        storeId: 'store-aling-nena-main',
        deviceId: 'dev-counter-phone',
        deviceName: 'Counter 1 (Android Phone)',
        cashierId: 'usr-cashier-phone',
        cashierName: 'Maria Santos (Phone)',
        receiptNumber: `SIM-RCPT-101`,
        status: 'COMPLETED',
        subtotalCentavos: 2400, // 7 sticks = 2x bundle (2000) + 1 single (400) = 2400
        discountCentavos: 400,
        totalCentavos: 2400,
        totalCostCentavos: 1750,
        cashReceivedCentavos: 3000,
        changeAmountCentavos: 600,
        paymentMethod: 'CASH',
        customerName: 'Suki Pedro',
        createdAt: new Date().toISOString(),
        items: [
          {
            id: `si-1`,
            saleId: `sale-sim-phone-${Date.now()}`,
            productId: cigarette.id,
            productName: cigarette.name,
            quantityBase: 7,
            unitPriceCentavos: 342,
            lineTotalCentavos: 2400,
            costTotalCentavos: 1750,
            pricingRuleName: '2 bundle (3 for ₱10) + 1 single @ ₱4',
            displayQuantity: '7 sticks',
          },
        ],
        syncStatus: 'PENDING',
      };
      await db.sales.add(sale1);

      // Step 3: Simulate Laptop selling 7 sticks while offline
      const sale2: LocalSale = {
        id: `sale-sim-laptop-${Date.now() + 1}`,
        storeId: 'store-aling-nena-main',
        deviceId: 'dev-office-laptop',
        deviceName: 'Back Office (Laptop)',
        cashierId: 'usr-cashier-laptop',
        cashierName: 'Juan Dela Cruz (Laptop)',
        receiptNumber: `SIM-RCPT-102`,
        status: 'COMPLETED',
        subtotalCentavos: 2400,
        discountCentavos: 400,
        totalCentavos: 2400,
        totalCostCentavos: 1750,
        cashReceivedCentavos: 2500,
        changeAmountCentavos: 100,
        paymentMethod: 'CASH',
        customerName: 'Suki Berto',
        createdAt: new Date().toISOString(),
        items: [
          {
            id: `si-2`,
            saleId: `sale-sim-laptop-${Date.now() + 1}`,
            productId: cigarette.id,
            productName: cigarette.name,
            quantityBase: 7,
            unitPriceCentavos: 342,
            lineTotalCentavos: 2400,
            costTotalCentavos: 1750,
            pricingRuleName: '2 bundle (3 for ₱10) + 1 single @ ₱4',
            displayQuantity: '7 sticks',
          },
        ],
        syncStatus: 'PENDING',
      };
      await db.sales.add(sale2);

      // Step 4: Now sync both sales to server
      const results = await pushSalesToServer([sale1, sale2]);

      for (const res of results) {
        if (res.status === 'accepted') {
          await db.sales.update(res.saleId, { syncStatus: 'SYNCED' });
        } else if (res.status === 'conflict') {
          await db.sales.update(res.saleId, {
            syncStatus: 'CONFLICT',
            conflictReason: res.message,
          });
        }
      }

      await pullCentralCatalog();
      await refreshData();
      await loadSyncData();

      alert(
        'Blueprint Conflict Scenario Simulated!\n\n1. Starting Cigarette stock was 10 sticks.\n2. Phone sold 7 sticks (accepted).\n3. Laptop also sold 7 sticks while offline.\n4. Central server detected 14 sold > 10 stock = 4 sticks deficit!\n5. Sale is preserved in history and flagged for Owner review below.'
      );
    } catch (e) {
      console.error(e);
      alert('Error running simulation: ' + e);
    }
  };

  const handleResolve = async (saleId: string, resolutionMethod: 'RESTOCK' | 'ADJUST_LEDGER') => {
    if (currentRole !== 'OWNER') {
      alert('Only store Owners can resolve inventory conflicts. Please switch role to Owner in the header.');
      return;
    }
    await resolveConflict(saleId, resolutionMethod, resolutionNotes);
    setResolvingSaleId(null);
    await refreshData();
    await loadSyncData();
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6 space-y-6">
      {/* Blueprint Header */}
      <div className="bg-slate-900 rounded-2xl p-6 text-white border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase tracking-wider">
              Blueprint Section 5
            </span>
            <span className="text-xs text-slate-400">PostgreSQL + IndexedDB Sync Engine</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Layers className="w-6 h-6 text-emerald-400" />
            <span>Multi-Device Synchronization &amp; Conflicts</span>
          </h1>
          <p className="text-xs text-slate-400 max-w-xl mt-1">
            Offline devices continue selling locally to IndexedDB outbox. When connected, transactions
            push idempotently to central PostgreSQL with automatic overselling conflict detection.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => triggerSync()}
            disabled={isSyncing || !isOnline}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 text-white font-bold text-xs shadow-md transition active:scale-95"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Cloud Now'}</span>
          </button>

          <button
            onClick={handleSimulateConflictScenario}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md transition active:scale-95"
            title="Run Blueprint cigarette overselling test"
          >
            <Play className="w-4 h-4" />
            <span>Simulate Conflict Scenario</span>
          </button>
        </div>
      </div>

      {/* Sync Status Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
              isOnline ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
            }`}
          >
            {isOnline ? <Zap className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Connection Status
            </span>
            <div className="text-sm font-black text-slate-900">
              {isOnline ? 'Connected to Central API' : 'Offline (Local IndexedDB)'}
            </div>
            <button
              onClick={toggleSimulateOffline}
              className="text-[11px] font-bold text-emerald-700 hover:underline"
            >
              Toggle Network Simulation
            </button>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Local Pending Outbox
            </span>
            <div className="text-sm font-black text-slate-900">
              {pendingSales.length} Transactions Queued
            </div>
            <span className="text-[11px] text-slate-500">
              {pendingSales.length > 0 ? 'Will sync upon connection' : 'All local sales synced'}
            </span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
              conflictSales.length > 0 || centralConflicts.length > 0
                ? 'bg-rose-100 text-rose-700 animate-pulse'
                : 'bg-emerald-100 text-emerald-700'
            }`}
          >
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Inventory Conflicts
            </span>
            <div className="text-sm font-black text-slate-900">
              {conflictSales.length + centralConflicts.length} Requiring Review
            </div>
            <span className="text-[11px] text-slate-500">
              {conflictSales.length > 0 ? 'Action required by Owner' : 'Ledger balanced'}
            </span>
          </div>
        </div>
      </div>

      {/* CONFLICTS REVIEW SECTION (Top Priority) */}
      {(conflictSales.length > 0 || centralConflicts.length > 0) && (
        <div className="p-5 rounded-2xl bg-rose-50 border-2 border-rose-300 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-rose-900">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
              <div>
                <h3 className="font-black text-base">
                  Action Required: Offline Stock Overselling Conflicts
                </h3>
                <p className="text-xs text-rose-700">
                  Multiple devices recorded sales offline that exceeded remaining stock. As per the
                  blueprint, sales are never silently discarded. Please review and reconcile below.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {conflictSales.map(sale => (
              <div
                key={sale.id}
                className="p-4 rounded-xl bg-white border border-rose-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900">
                      Receipt {sale.receiptNumber}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                      Stock Conflict
                    </span>
                    <span className="text-slate-400">·</span>
                    <span className="font-semibold text-slate-600">{sale.deviceName}</span>
                  </div>
                  <p className="text-slate-600 mt-1">{sale.conflictReason}</p>
                  <div className="text-slate-500 mt-0.5">
                    Items sold:{' '}
                    {sale.items.map(i => `${i.productName} (${i.displayQuantity})`).join(', ')} ·
                    Total: <strong className="text-slate-900">{formatCentavos(sale.totalCentavos)}</strong>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleResolve(sale.id, 'RESTOCK')}
                    className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition shadow-xs"
                    title="Owner records restock from reserve storeroom to clear deficit"
                  >
                    + Record Restock &amp; Resolve
                  </button>
                  <button
                    onClick={() => handleResolve(sale.id, 'ADJUST_LEDGER')}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold transition"
                    title="Acknowledge deficit and reconcile physical count"
                  >
                    Acknowledge &amp; Settle
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Device Registry */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Authorized Store Devices
            </h3>
            <p className="text-xs text-slate-500">
              Each cashier station maintains an independent IndexedDB cache and syncs to central PostgreSQL.
            </p>
          </div>
          <button
            onClick={() => setShowAddDevice(!showAddDevice)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Register Device</span>
          </button>
        </div>

        {/* Add Device form */}
        {showAddDevice && (
          <form
            onSubmit={handleCreateDevice}
            className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-center gap-2 text-xs"
          >
            <input
              type="text"
              placeholder="Device name (e.g. Counter 3 Android Phone)..."
              value={newDeviceName}
              onChange={e => setNewDeviceName(e.target.value)}
              className="flex-1 min-w-[200px] px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 font-medium"
              required
            />
            <select
              value={newDeviceType}
              onChange={e => setNewDeviceType(e.target.value as StoreDevice['type'])}
              className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 font-medium"
            >
              <option value="PHONE">Android Phone</option>
              <option value="TABLET">Tablet / iPad</option>
              <option value="LAPTOP">Laptop</option>
              <option value="DESKTOP">Desktop PC</option>
            </select>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition"
            >
              Add Device
            </button>
          </form>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {allDevices.map(dev => {
            const isCurrent = dev.id === currentDevice.id;
            return (
              <div
                key={dev.id}
                className={`p-4 rounded-xl border transition flex flex-col justify-between ${
                  isCurrent
                    ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 bg-slate-50/50'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                      {dev.type === 'PHONE' ? (
                        <Smartphone className="w-4 h-4 text-emerald-600" />
                      ) : dev.type === 'TABLET' ? (
                        <Tablet className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Laptop className="w-4 h-4 text-emerald-600" />
                      )}
                      {dev.name}
                    </span>
                    {isCurrent && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-600 text-white">
                        THIS DEVICE
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">
                    Type: {dev.type} · Active offline cache
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs">
                  {!isCurrent ? (
                    <button
                      onClick={() => switchDevice(dev.id)}
                      className="text-xs font-bold text-emerald-700 hover:underline"
                    >
                      Switch to This Device &rarr;
                    </button>
                  ) : (
                    <span className="text-emerald-700 font-semibold text-[11px]">
                      Currently Active Station
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pending Sales Outbox Table */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
          Local Sales Outbox Queue ({pendingSales.length})
        </h3>
        {pendingSales.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-400">
            No pending offline sales. All transactions are synced with the central server.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Receipt #</th>
                  <th className="py-2.5 px-3">Time</th>
                  <th className="py-2.5 px-3">Items</th>
                  <th className="py-2.5 px-3">Total</th>
                  <th className="py-2.5 px-3">Device</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pendingSales.map(sale => (
                  <tr key={sale.id} className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-bold text-slate-900">{sale.receiptNumber}</td>
                    <td className="py-2 px-3 text-slate-500">
                      {new Date(sale.createdAt).toLocaleTimeString()}
                    </td>
                    <td className="py-2 px-3 text-slate-700 max-w-xs truncate">
                      {sale.items.map(i => `${i.productName} (${i.displayQuantity})`).join(', ')}
                    </td>
                    <td className="py-2 px-3 font-black text-slate-900">
                      {formatCentavos(sale.totalCentavos)}
                    </td>
                    <td className="py-2 px-3 text-slate-500">{sale.deviceName}</td>
                    <td className="py-2 px-3">
                      <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-amber-100 text-amber-800">
                        PENDING SYNC
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
