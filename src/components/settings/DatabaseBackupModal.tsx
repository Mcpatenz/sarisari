/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Download,
  Upload,
  Database,
  CheckCircle2,
  AlertTriangle,
  X,
  FileJson,
  RefreshCw,
  HardDrive,
} from 'lucide-react';
import { exportDatabaseBackup, restoreDatabaseBackup } from '../../lib/backup';
import { useStore } from '../../context/StoreContext';

interface DatabaseBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DatabaseBackupModal: React.FC<DatabaseBackupModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { refreshData } = useStore();

  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [exportSuccessMessage, setExportSuccessMessage] = useState<string | null>(null);
  const [importSummary, setImportSummary] = useState<Record<string, number> | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleExport = async () => {
    setIsExporting(true);
    setErrorMessage(null);
    setExportSuccessMessage(null);
    try {
      const res = await exportDatabaseBackup();
      setExportSuccessMessage(`Database backup downloaded successfully: ${res.filename}`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to export database backup.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async event => {
      const content = event.target?.result as string;
      if (!content) return;

      const confirmRestore = window.confirm(
        'Warning: Restoring a backup will replace your current store data (products, sales, customers, shifts). Do you wish to proceed?'
      );
      if (!confirmRestore) return;

      setIsImporting(true);
      setErrorMessage(null);
      setImportSummary(null);

      try {
        const result = await restoreDatabaseBackup(content);
        setImportSummary(result.counts);
        await refreshData();
      } catch (err: any) {
        setErrorMessage(err.message || 'Invalid backup file or restore failed.');
      } finally {
        setIsImporting(false);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-extrabold text-base">Store Database Backup &amp; Safe-Keeping</h3>
              <p className="text-[11px] text-slate-400">Export and restore offline IndexedDB store records</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5 text-xs">
          {/* Status feedback */}
          {exportSuccessMessage && (
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-800 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{exportSuccessMessage}</span>
            </div>
          )}

          {importSummary && (
            <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-blue-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
                <span>Backup Restored Successfully!</span>
              </div>
              <p className="text-[11px] text-blue-800">
                Restored: {importSummary.products} products, {importSummary.sales} sales,{' '}
                {importSummary.customers} suki customers, {importSummary.suppliers} suppliers.
              </p>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-rose-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Section 1: Export Backup */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Download Local Backup (JSON)</h4>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  Creates an offline archive of all your store products, shifts, transactions, and customers.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting}
              className="w-full px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition active:scale-95 flex items-center justify-center gap-2"
            >
              {isExporting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Generating Backup...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download Store Backup JSON</span>
                </>
              )}
            </button>
          </div>

          {/* Section 2: Restore from Backup */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
            <div>
              <h4 className="font-bold text-slate-900 text-sm">Restore from Backup File</h4>
              <p className="text-slate-500 text-[11px] mt-0.5">
                Upload a previously exported <code className="text-slate-700 font-mono">.json</code> backup to
                recover your store records on this device.
              </p>
            </div>

            <label className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs transition cursor-pointer flex items-center justify-center gap-2">
              <Upload className="w-4 h-4 text-slate-500" />
              <span>{isImporting ? 'Restoring records...' : 'Select Backup JSON File to Restore'}</span>
              <input
                type="file"
                accept=".json,application/json"
                onChange={handleFileChange}
                disabled={isImporting}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-100 border-t border-slate-200 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
