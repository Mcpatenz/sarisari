/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { StoreProvider, useStore } from './context/StoreContext';
import { Header } from './components/layout/Header';
import { OfflineIndicator } from './components/layout/OfflineIndicator';
import { POSScreen } from './components/pos/POSScreen';
import { PricingSimulator } from './components/pricing/PricingSimulator';
import { InventoryList } from './components/inventory/InventoryList';
import { SyncCenter } from './components/sync/SyncCenter';
import { SalesHistory } from './components/history/SalesHistory';
import { ReportsView } from './components/reports/ReportsView';
import { LoyaltyManager } from './components/loyalty/LoyaltyManager';

const MainAppContent: React.FC = () => {
  const { activeTab } = useStore();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Header />

      <main className="flex-1">
        {activeTab === 'pos' && <POSScreen />}
        {activeTab === 'loyalty' && <LoyaltyManager />}
        {activeTab === 'pricing' && <PricingSimulator />}
        {activeTab === 'inventory' && <InventoryList />}
        {activeTab === 'sync' && <SyncCenter />}
        {activeTab === 'history' && <SalesHistory />}
        {activeTab === 'reports' && <ReportsView />}
      </main>

      <OfflineIndicator />

      {/* Subtle store footer */}
      <footer className="bg-slate-900 border-t border-slate-800 py-4 px-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            <span className="font-bold text-slate-400">TingiPOS</span> · Offline-First Sari-Sari Store POS &amp; Inventory Engine
          </div>
          <div className="text-[11px] text-slate-500">
            Powered by IndexedDB + Dexie.js · Central PostgreSQL Ledger Sync · Integer Centavo Precision
          </div>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <StoreProvider>
      <MainAppContent />
    </StoreProvider>
  );
}
