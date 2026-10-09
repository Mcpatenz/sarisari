/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Printer,
  Bluetooth,
  Usb,
  X,
  CheckCircle2,
  AlertCircle,
  FileText,
  DollarSign,
  Scissors,
  RefreshCw,
  Power,
} from 'lucide-react';
import { thermalPrinterService } from '../../lib/thermalPrinter';
import { ThermalPrinterSettings, PaperWidth } from '../../types';

interface PrinterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrinterModal: React.FC<PrinterModalProps> = ({ isOpen, onClose }) => {
  const [settings, setSettings] = useState<ThermalPrinterSettings>(
    thermalPrinterService.getSettings()
  );
  const [isConnecting, setIsConnecting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isTestPrinting, setIsTestPrinting] = useState(false);

  useEffect(() => {
    const unsub = thermalPrinterService.onSettingsChange(s => setSettings(s));
    return () => unsub();
  }, []);

  if (!isOpen) return null;

  const handleConnectBluetooth = async () => {
    try {
      setIsConnecting(true);
      setStatusMessage('Pairing Bluetooth thermal printer...');
      const name = await thermalPrinterService.connectBluetooth();
      setStatusMessage(`Connected successfully to "${name}"!`);
    } catch (err: any) {
      if (err.name !== 'NotFoundError') {
        setStatusMessage(`Bluetooth error: ${err.message || 'Connection failed'}`);
      } else {
        setStatusMessage(null);
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const handleConnectUsb = async () => {
    try {
      setIsConnecting(true);
      setStatusMessage('Scanning USB POS printers...');
      const name = await thermalPrinterService.connectUsb();
      setStatusMessage(`Connected successfully to "${name}"!`);
    } catch (err: any) {
      if (err.name !== 'NotFoundError') {
        setStatusMessage(`USB error: ${err.message || 'Connection failed'}`);
      } else {
        setStatusMessage(null);
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    await thermalPrinterService.disconnect();
    setStatusMessage('Printer disconnected.');
  };

  const handleTestPrint = async () => {
    try {
      setIsTestPrinting(true);
      const res = await thermalPrinterService.printTestReceipt();
      setStatusMessage(res.message);
    } catch (err: any) {
      setStatusMessage(`Print error: ${err.message}`);
    } finally {
      setIsTestPrinting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-600 text-white">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Thermal POS Printer Service</h3>
              <p className="text-[11px] text-slate-400">ESC/POS Bluetooth &amp; USB Direct Printing</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto text-xs">
          {/* Active Status Card */}
          <div
            className={`p-3.5 rounded-xl border flex items-center justify-between ${
              settings.connected
                ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${
                  settings.connected
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-200 text-slate-500'
                }`}
              >
                {settings.type === 'BLUETOOTH' ? (
                  <Bluetooth className="w-4 h-4" />
                ) : settings.type === 'USB' ? (
                  <Usb className="w-4 h-4" />
                ) : (
                  <Printer className="w-4 h-4" />
                )}
              </div>
              <div>
                <div className="font-extrabold text-sm text-slate-900">
                  {settings.connected ? settings.name : 'No Thermal Printer Linked'}
                </div>
                <div className="text-[11px] text-slate-500">
                  {settings.connected
                    ? `Active on ${settings.type} · ${settings.paperWidth}`
                    : 'Use Web Bluetooth or WebUSB to connect'}
                </div>
              </div>
            </div>

            {settings.connected && (
              <button
                type="button"
                onClick={handleDisconnect}
                className="px-2.5 py-1 rounded-lg bg-slate-200 hover:bg-rose-100 hover:text-rose-700 text-slate-700 font-bold text-[11px] transition"
              >
                Disconnect
              </button>
            )}
          </div>

          {/* Connection Actions */}
          <div className="space-y-2">
            <span className="font-bold text-slate-600 uppercase tracking-wider block text-[10px]">
              Pair POS Printer Device
            </span>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleConnectBluetooth}
                disabled={isConnecting}
                className="p-3 rounded-xl border border-blue-200 bg-blue-50/70 hover:bg-blue-100 text-blue-900 font-bold flex flex-col items-center justify-center gap-1.5 transition active:scale-95 disabled:opacity-50"
              >
                <Bluetooth className="w-5 h-5 text-blue-600" />
                <span>Pair Bluetooth</span>
                <span className="text-[10px] text-blue-600 font-normal">BLE ESC/POS</span>
              </button>

              <button
                type="button"
                onClick={handleConnectUsb}
                disabled={isConnecting}
                className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100 text-emerald-900 font-bold flex flex-col items-center justify-center gap-1.5 transition active:scale-95 disabled:opacity-50"
              >
                <Usb className="w-5 h-5 text-emerald-600" />
                <span>Connect USB</span>
                <span className="text-[10px] text-emerald-600 font-normal">Plug &amp; Play</span>
              </button>
            </div>
          </div>

          {/* Paper & Hardware Settings */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <span className="font-bold text-slate-700 uppercase tracking-wider block text-[10px]">
              Printer Hardware Options
            </span>

            {/* Paper Width */}
            <div className="flex items-center justify-between">
              <span className="text-slate-600 font-medium">Paper Roll Width:</span>
              <div className="flex rounded-lg bg-white border border-slate-200 p-0.5">
                {(['58mm', '80mm'] as PaperWidth[]).map(pw => (
                  <button
                    key={pw}
                    type="button"
                    onClick={() => thermalPrinterService.updateSettings({ paperWidth: pw })}
                    className={`px-3 py-1 rounded-md font-bold text-xs transition ${
                      settings.paperWidth === pw
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {pw}
                  </button>
                ))}
              </div>
            </div>

            {/* Auto Cut */}
            <div className="flex items-center justify-between">
              <span className="text-slate-600 font-medium flex items-center gap-1.5">
                <Scissors className="w-3.5 h-3.5 text-slate-500" />
                <span>Auto Paper Cut (GS V):</span>
              </span>
              <input
                type="checkbox"
                checked={settings.autoCut}
                onChange={e => thermalPrinterService.updateSettings({ autoCut: e.target.checked })}
                className="accent-emerald-600 rounded w-4 h-4 cursor-pointer"
              />
            </div>

            {/* Cash Drawer Kick */}
            <div className="flex items-center justify-between">
              <span className="text-slate-600 font-medium flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                <span>Kick Open Cash Drawer (ESC p):</span>
              </span>
              <input
                type="checkbox"
                checked={settings.openCashDrawer}
                onChange={e =>
                  thermalPrinterService.updateSettings({ openCashDrawer: e.target.checked })
                }
                className="accent-emerald-600 rounded w-4 h-4 cursor-pointer"
              />
            </div>
          </div>

          {/* Status Message Box */}
          {statusMessage && (
            <div className="p-3 rounded-xl bg-slate-900 text-emerald-300 font-mono text-[11px] leading-relaxed border border-slate-800">
              {statusMessage}
            </div>
          )}

          {/* Test Print Action */}
          <button
            type="button"
            onClick={handleTestPrint}
            disabled={isTestPrinting}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition active:scale-98"
          >
            <FileText className="w-4 h-4 text-emerald-400" />
            <span>{isTestPrinting ? 'Printing...' : 'Print Test Receipt (ESC/POS)'}</span>
          </button>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-100 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
