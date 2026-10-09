/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { WifiOff, Database } from 'lucide-react';
import { useStore } from '../../context/StoreContext';

export const OfflineIndicator: React.FC = () => {
  const { isOnline, pendingSalesCount } = useStore();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-40 flex items-center gap-2.5 rounded-xl bg-amber-600/95 backdrop-blur-md px-3.5 py-2 text-xs font-semibold text-white shadow-xl border border-amber-400/40 animate-in fade-in slide-in-from-bottom-2">
      <span className="relative flex h-2.5 w-2.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
      </span>
      <div className="flex items-center gap-1.5">
        <WifiOff className="w-3.5 h-3.5" />
        <span>Offline Mode</span>
        <span className="text-amber-200">|</span>
        <Database className="w-3.5 h-3.5 text-amber-200" />
        <span className="font-normal">
          IndexedDB Active {pendingSalesCount > 0 ? `(${pendingSalesCount} sale${pendingSalesCount === 1 ? '' : 's'} queued)` : ''}
        </span>
      </div>
    </div>
  );
};
