/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  X,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Volume2,
  VolumeX,
  Upload,
  Zap,
} from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { useStore } from '../../context/StoreContext';
import { formatCentavos } from '../../lib/pricing';
import { LocalProduct } from '../../types';

interface CameraBarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onProductFound: (product: LocalProduct) => void;
}

export const CameraBarcodeScanner: React.FC<CameraBarcodeScannerProps> = ({
  isOpen,
  onClose,
  onProductFound,
}) => {
  const { products } = useStore();

  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scannedResult, setScannedResult] = useState<{
    code: string;
    product: LocalProduct | null;
  } | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const containerId = 'interactive-barcode-reader-viewport';

  // Sound feedback using Web Audio API
  const playBeep = () => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1760, audioCtx.currentTime); // High pitch POS beep (A6)
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } catch {
      // AudioContext may be blocked before user interaction
    }
  };

  // Find camera devices
  useEffect(() => {
    if (!isOpen) return;

    Html5Qrcode.getCameras()
      .then(devices => {
        if (devices && devices.length > 0) {
          setCameras(devices);
          // Prefer back/environment camera on phones
          const backCam = devices.find(
            d =>
              d.label.toLowerCase().includes('back') ||
              d.label.toLowerCase().includes('rear') ||
              d.label.toLowerCase().includes('environment')
          );
          setSelectedCameraId(backCam ? backCam.id : devices[0].id);
        } else {
          setCameraError('No camera found on this device. You can upload a barcode picture or use manual input.');
        }
      })
      .catch(err => {
        console.warn('Error getting cameras:', err);
        setCameraError(
          'Camera access blocked or unsupported in this browser frame. You can upload an image file or test with sample barcodes.'
        );
      });
  }, [isOpen]);

  // Start scanner when camera is selected
  useEffect(() => {
    if (!isOpen || !selectedCameraId) return;

    let isMounted = true;
    setCameraError(null);

    const startScanner = async () => {
      try {
        if (html5QrCodeRef.current) {
          try {
            await html5QrCodeRef.current.stop();
          } catch {
            // ignore
          }
        }

        const qrScanner = new Html5Qrcode(containerId, {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.QR_CODE,
          ],
          verbose: false,
        });
        html5QrCodeRef.current = qrScanner;

        await qrScanner.start(
          selectedCameraId,
          {
            fps: 15,
            qrbox: { width: 260, height: 180 },
            aspectRatio: 1.333,
          },
          (decodedText: string) => {
            if (!isMounted) return;
            handleBarcodeScanned(decodedText);
          },
          () => {
            // Frame error - normal while scanning
          }
        );

        if (isMounted) {
          setIsScanning(true);
        }
      } catch (err: unknown) {
        console.error('Failed to start camera scanner:', err);
        if (isMounted) {
          setIsScanning(false);
          setCameraError(
            err instanceof Error
              ? err.message
              : 'Could not start camera feed. Please check camera permissions.'
          );
        }
      }
    };

    // Delay start slightly to allow DOM element to render
    const timeout = setTimeout(() => {
      startScanner();
    }, 200);

    return () => {
      isMounted = false;
      clearTimeout(timeout);
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current.stop().catch(() => {});
      }
    };
  }, [isOpen, selectedCameraId]);

  const handleBarcodeScanned = (decodedText: string) => {
    playBeep();
    const cleanCode = decodedText.trim();

    // Find in products
    const found = products.find(
      p =>
        (p.barcode && p.barcode.trim() === cleanCode) ||
        p.sku.toLowerCase() === cleanCode.toLowerCase()
    );

    setScannedResult({
      code: cleanCode,
      product: found || null,
    });

    if (found) {
      // Temporarily pause or trigger add
      onProductFound(found);
      // Auto-close after brief confirmation
      setTimeout(() => {
        onClose();
      }, 700);
    }
  };

  // File upload scan fallback
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const qrScanner = html5QrCodeRef.current || new Html5Qrcode(containerId);
      const decodedText = await qrScanner.scanFile(file, true);
      handleBarcodeScanned(decodedText);
    } catch (err) {
      alert('Could not detect a clear barcode in the uploaded image.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-600">
              <Camera className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Camera Barcode Scanner</h3>
              <p className="text-[11px] text-slate-400">Scan EAN-13, UPC, Code 128, or QR</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white transition"
              title={soundEnabled ? 'Mute beep' : 'Enable beep'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Viewport / Camera Body */}
        <div className="p-4 space-y-3 flex-1 overflow-y-auto">
          {/* Camera switcher if multiple */}
          {cameras.length > 1 && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Select Camera:</span>
              <select
                value={selectedCameraId}
                onChange={e => setSelectedCameraId(e.target.value)}
                className="px-2 py-1 bg-slate-100 rounded-lg border border-slate-200 text-xs font-semibold text-slate-800"
              >
                {cameras.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.label || `Camera ${c.id.substring(0, 5)}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Viewport Area */}
          <div className="relative rounded-2xl overflow-hidden bg-slate-950 min-h-[260px] flex items-center justify-center border-2 border-slate-800 shadow-inner">
            <div id={containerId} className="w-full h-full" />

            {/* Overlaid Animated Target Reticle */}
            {!cameraError && isScanning && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="relative w-64 h-40 border-2 border-emerald-400/80 rounded-xl shadow-2xl flex flex-col justify-between p-2">
                  {/* Laser scanning line */}
                  <div className="w-full h-0.5 bg-rose-500 shadow-md shadow-rose-500/80 animate-pulse my-auto" />
                  <div className="flex justify-between text-[10px] text-emerald-300 font-mono font-bold bg-black/40 px-1 rounded">
                    <span>ALIGN BARCODE</span>
                    <span>1D / 2D</span>
                  </div>
                </div>
              </div>
            )}

            {/* Error Fallback */}
            {cameraError && (
              <div className="absolute inset-0 p-6 flex flex-col items-center justify-center text-center text-slate-300 bg-slate-900/95 space-y-3">
                <AlertCircle className="w-10 h-10 text-amber-400" />
                <p className="text-xs text-slate-300 max-w-xs">{cameraError}</p>

                <div className="pt-2 w-full space-y-2">
                  <label className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs cursor-pointer border border-slate-700 transition">
                    <Upload className="w-4 h-4 text-emerald-400" />
                    <span>Upload Barcode Photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Scanned Feedback Card */}
          {scannedResult && (
            <div
              className={`p-3.5 rounded-xl border flex items-center justify-between text-xs animate-in zoom-in-95 ${
                scannedResult.product
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                  : 'bg-amber-50 border-amber-300 text-amber-950'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {scannedResult.product ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                )}
                <div>
                  <div className="font-extrabold text-sm">
                    {scannedResult.product ? scannedResult.product.name : 'Unknown Barcode'}
                  </div>
                  <div className="font-mono text-[11px] text-slate-500">
                    Code: {scannedResult.code}
                  </div>
                </div>
              </div>

              {scannedResult.product && (
                <div className="text-right">
                  <span className="font-black text-sm text-emerald-700 block">
                    {formatCentavos(scannedResult.product.priceRules[0]?.priceCentavos || 0)}
                  </span>
                  <span className="text-[10px] text-emerald-600 font-bold">Added to basket!</span>
                </div>
              )}
            </div>
          )}

          {/* Quick barcode test buttons */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
            <span className="font-bold text-slate-500 text-[11px] uppercase tracking-wider block">
              Quick Barcode Test Samples:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: 'Marlboro', code: '480001600101' },
                { label: 'Sinandomeng', code: '480003000101' },
                { label: 'Maxx Candy', code: '480002500101' },
                { label: 'Coke Mismo', code: '480008000101' },
              ].map(s => (
                <button
                  key={s.code}
                  onClick={() => handleBarcodeScanned(s.code)}
                  className="px-2 py-1 rounded-md bg-white hover:bg-slate-200 border border-slate-300 font-medium text-[11px] text-slate-700"
                >
                  {s.label} ({s.code.substring(8)})
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs">
          <label className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900 cursor-pointer font-semibold">
            <Upload className="w-3.5 h-3.5 text-emerald-600" />
            <span>Upload Photo Instead</span>
            <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
          </label>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
