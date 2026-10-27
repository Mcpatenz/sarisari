/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Store,
  Wifi,
  WifiOff,
  RefreshCw,
  AlertTriangle,
  Smartphone,
  Tablet,
  Laptop,
  Monitor,
  ShieldCheck,
  User,
  Sliders,
  ChevronDown,
  Layers,
  Package,
  History,
  FileSpreadsheet,
  Calculator,
  Gift,
  Printer,
  Bluetooth,
  Usb,
  Clock,
  TrendingUp,
  Truck,
  HardDrive,
} from 'lucide-react';
import { useStore, ActiveTab } from '../../context/StoreContext';
import { PWAInstallButton } from './PWAInstallButton';
import { LowStockNotifier } from '../notifications/LowStockNotifier';
import { PrinterModal } from '../printer/PrinterModal';
import { DatabaseBackupModal } from '../settings/DatabaseBackupModal';

export const Header: React.FC = () => {
  const {
    currentDevice,
    allDevices,
    switchDevice,
    currentRole,
    setCurrentRole,
    activeTab,
    setActiveTab,
    isOnline,
    simulatedOffline,
    toggleSimulateOffline,
    pendingSalesCount,
    conflictSalesCount,
    isSyncing,
    triggerSync,
    lastSyncTime,
    printerSettings,
    activeShift,
  } = useStore();

  const [showDeviceMenu, setShowDeviceMenu] = useState(false);
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showPrinterModal, setShowPrinterModal] = useState(false);
  const [showBackupModal, setShowBackupModal] = useState(false);

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'PHONE':
        return <Smartphone className="w-3.5 h-3.5" />;
      case 'TABLET':
        return <Tablet className="w-3.5 h-3.5" />;
      case 'LAPTOP':
        return <Laptop className="w-3.5 h-3.5" />;
      default:
        return <Monitor className="w-3.5 h-3.5" />;
    }
  };

  const navItems: { id: ActiveTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'pos', label: 'POS Counter', icon: <Store className="w-4 h-4" /> },
    { id: 'inventory', label: 'Inventory & Tingi', icon: <Package className="w-4 h-4" /> },
    { id: 'analytics', label: 'Revenue Trends', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'shifts', label: 'Cashier Shifts', icon: <Clock className="w-4 h-4" />, badge: activeShift ? 1 : undefined },
    { id: 'suppliers', label: 'Suppliers & PO', icon: <Truck className="w-4 h-4" /> },
    { id: 'loyalty', label: 'Suki Rewards', icon: <Gift className="w-4 h-4" /> },
    { id: 'pricing', label: 'Pricing Model', icon: <Calculator className="w-4 h-4" /> },
    {
      id: 'sync',
      label: 'Sync & Devices',
      icon: <Layers className="w-4 h-4" />,
      badge: conflictSalesCount > 0 ? conflictSalesCount : pendingSalesCount > 0 ? pendingSalesCount : undefined,
    },
    { id: 'history', label: 'Sales History', icon: <History className="w-4 h-4" /> },
    { id: 'reports', label: 'Reports & Expenses', icon: <FileSpreadsheet className="w-4 h-4" /> },
  ];

  return (
    <header className="sticky top-0 z-30 bg-slate-900 border-b border-slate-800 text-white shadow-md">
      {/* Top utility row */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-inner font-bold text-base text-white">
            ₱
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold tracking-tight text-sm text-white">
                TingiPOS
              </span>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Sari-Sari Store
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Offline-first &amp; Multi-device Inventory
            </p>
          </div>
        </div>

        {/* Status controls */}
        <div className="flex items-center gap-2">
          {/* Active Shift Indicator Button */}
          <button
            onClick={() => setActiveTab('shifts')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-semibold transition active:scale-95 ${
              activeShift
                ? 'bg-emerald-950/70 text-emerald-300 border-emerald-700/60 hover:bg-emerald-900/60'
                : 'bg-amber-950/70 text-amber-300 border-amber-700/60 hover:bg-amber-900/60'
            }`}
            title={
              activeShift
                ? `Shift open for ${activeShift.cashierName}. Tap to manage or blind count.`
                : 'No active shift open. Tap to start shift.'
            }
          >
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden xl:inline">
              {activeShift ? `Shift: ${activeShift.cashierName}` : 'No Shift'}
            </span>
            <span className="xl:hidden">{activeShift ? 'Shift Active' : 'Start Shift'}</span>
          </button>

          {/* Online/Offline Simulator Button */}
          <button
            onClick={toggleSimulateOffline}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-medium transition active:scale-95 ${
              isOnline
                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700/60 hover:bg-emerald-900/60'
                : 'bg-amber-950/60 text-amber-300 border-amber-700/60 hover:bg-amber-900/60'
            }`}
            title="Click to toggle simulated internet connection"
          >
            {isOnline ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden xs:inline">Online</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                <span>Offline {simulatedOffline ? '(Sim)' : ''}</span>
              </>
            )}
          </button>

          {/* Sync Trigger button */}
          <button
            onClick={() => triggerSync()}
            disabled={isSyncing || !isOnline}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-medium transition ${
              isSyncing
                ? 'bg-blue-950/80 text-blue-300 border-blue-700 cursor-wait'
                : !isOnline
                ? 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 active:scale-95'
            }`}
            title={lastSyncTime ? `Last synced at ${lastSyncTime}` : 'Trigger cloud synchronization'}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-blue-400' : ''}`} />
            <span className="hidden sm:inline">Sync</span>
            {pendingSalesCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-slate-950">
                {pendingSalesCount}
              </span>
            )}
          </button>

          {/* Conflict Alert indicator if any */}
          {conflictSalesCount > 0 && (
            <button
              onClick={() => setActiveTab('sync')}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-950/80 text-rose-300 border border-rose-700 animate-pulse font-bold"
              title="Inventory conflict detected across devices! Tap to review."
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              <span>{conflictSalesCount} Conflict</span>
            </button>
          )}

          {/* Device Selector */}
          <div className="relative">
            <button
              onClick={() => setShowDeviceMenu(!showDeviceMenu)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 transition"
            >
              {getDeviceIcon(currentDevice.type)}
              <span className="max-w-[110px] truncate hidden md:inline font-medium">
                {currentDevice.name}
              </span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {showDeviceMenu && (
              <div className="absolute right-0 mt-1 w-56 rounded-xl bg-slate-800 border border-slate-700 shadow-2xl p-1.5 z-50 text-xs">
                <div className="px-2 py-1 text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                  Select Active Device
                </div>
                {allDevices.map(dev => (
                  <button
                    key={dev.id}
                    onClick={() => {
                      switchDevice(dev.id);
                      setShowDeviceMenu(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left transition ${
                      dev.id === currentDevice.id
                        ? 'bg-emerald-600 text-white font-semibold'
                        : 'text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {getDeviceIcon(dev.type)}
                      <span>{dev.name}</span>
                    </div>
                    {dev.id === currentDevice.id && (
                      <span className="text-[10px] uppercase font-bold tracking-wider">Current</span>
                    )}
                  </button>
                ))}
                <div className="pt-1 mt-1 border-t border-slate-700">
                  <button
                    onClick={() => {
                      setShowDeviceMenu(false);
                      setActiveTab('sync');
                    }}
                    className="w-full text-center py-1.5 text-emerald-400 hover:text-emerald-300 font-medium"
                  >
                    Manage / Add Devices &rarr;
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Role Switcher (Owner vs Cashier) */}
          <div className="relative">
            <button
              onClick={() => setShowRoleMenu(!showRoleMenu)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition font-medium ${
                currentRole === 'OWNER'
                  ? 'bg-purple-950/70 text-purple-300 border-purple-700'
                  : 'bg-slate-800 text-slate-300 border-slate-700'
              }`}
            >
              {currentRole === 'OWNER' ? (
                <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
              ) : (
                <User className="w-3.5 h-3.5 text-slate-400" />
              )}
              <span className="hidden lg:inline">{currentRole === 'OWNER' ? 'Owner' : 'Cashier'}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {showRoleMenu && (
              <div className="absolute right-0 mt-1 w-44 rounded-xl bg-slate-800 border border-slate-700 shadow-2xl p-1.5 z-50 text-xs">
                <button
                  onClick={() => {
                    setCurrentRole('OWNER');
                    setShowRoleMenu(false);
                  }}
                  className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left ${
                    currentRole === 'OWNER'
                      ? 'bg-purple-600 text-white font-semibold'
                      : 'text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  <div>
                    <div>Owner Mode</div>
                    <div className="text-[10px] text-purple-200">Full pricing &amp; conflict access</div>
                  </div>
                </button>
                <button
                  onClick={() => {
                    setCurrentRole('CASHIER');
                    setShowRoleMenu(false);
                  }}
                  className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left mt-1 ${
                    currentRole === 'CASHIER'
                      ? 'bg-blue-600 text-white font-semibold'
                      : 'text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <User className="w-4 h-4" />
                  <div>
                    <div>Cashier Mode</div>
                    <div className="text-[10px] text-blue-200">Fast POS selling only</div>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Database Backup Button */}
          <button
            onClick={() => setShowBackupModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition active:scale-95"
            title="Export or Restore JSON Database Backup"
          >
            <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden md:inline">Backup</span>
          </button>

          {/* Low Stock Alerts Notifier with configurable threshold */}
          <LowStockNotifier />

          {/* Thermal POS Printer Button */}
          <button
            onClick={() => setShowPrinterModal(true)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-medium transition active:scale-95 ${
              printerSettings.connected
                ? 'bg-blue-950/80 text-blue-300 border-blue-600'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
            title={
              printerSettings.connected
                ? `ESC/POS Printer Connected (${printerSettings.name})`
                : 'Configure USB / Bluetooth Thermal Printer'
            }
          >
            {printerSettings.type === 'BLUETOOTH' ? (
              <Bluetooth className="w-3.5 h-3.5 text-blue-400" />
            ) : printerSettings.type === 'USB' ? (
              <Usb className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Printer className="w-3.5 h-3.5" />
            )}
            <span className="hidden sm:inline">
              {printerSettings.connected ? printerSettings.paperWidth : 'Printer'}
            </span>
            {printerSettings.connected && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>

          {/* PWA Install Button */}
          <PWAInstallButton />
        </div>
      </div>

      {/* Printer Configuration Modal */}
      <PrinterModal isOpen={showPrinterModal} onClose={() => setShowPrinterModal(false)} />

      {/* Database Backup & Restore Modal */}
      <DatabaseBackupModal isOpen={showBackupModal} onClose={() => setShowBackupModal(false)} />

      {/* Main Tab Navigation */}
      <div className="max-w-7xl mx-auto px-2 sm:px-4 overflow-x-auto scrollbar-none">
        <nav className="flex items-center gap-1 pb-1 pt-1 border-t border-slate-800/80">
          {navItems.map(item => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition relative ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      item.id === 'sync' && conflictSalesCount > 0
                        ? 'bg-rose-500 text-white'
                        : item.id === 'shifts'
                        ? 'bg-emerald-400 text-slate-950'
                        : 'bg-amber-400 text-slate-950'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
