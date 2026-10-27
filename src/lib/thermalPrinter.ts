/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ThermalPrinterSettings, PaperWidth } from '../types';
import { buildTestPrintReceipt } from './escpos';

const PRINTER_STORAGE_KEY = 'tingipos_printer_settings';

export const DEFAULT_PRINTER_SETTINGS: ThermalPrinterSettings = {
  name: 'No Printer Connected',
  type: 'SYSTEM',
  paperWidth: '58mm',
  autoCut: true,
  openCashDrawer: true,
  connected: false,
};

// Known BLE Printer Service & Characteristic UUIDs
const BLE_PRINTER_SERVICES = [
  '000018f0-0000-1000-8000-00805f9b34fb',
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
  '49535343-fe7d-4ae5-8fa9-9fafd205e455',
  '0000ff00-0000-1000-8000-00805f9b34fb',
];

class ThermalPrinterService {
  private bluetoothDevice: any | null = null;
  private bluetoothCharacteristic: any | null = null;
  private usbDevice: any | null = null;
  private usbEndpointOut: number | null = null;
  private settings: ThermalPrinterSettings;
  private listeners: Array<(settings: ThermalPrinterSettings) => void> = [];

  constructor() {
    this.settings = this.loadSettings();
  }

  private loadSettings(): ThermalPrinterSettings {
    try {
      const raw = localStorage.getItem(PRINTER_STORAGE_KEY);
      if (raw) return { ...DEFAULT_PRINTER_SETTINGS, ...JSON.parse(raw) };
    } catch {
      // ignore
    }
    return DEFAULT_PRINTER_SETTINGS;
  }

  public getSettings(): ThermalPrinterSettings {
    return this.settings;
  }

  public updateSettings(partial: Partial<ThermalPrinterSettings>): void {
    this.settings = { ...this.settings, ...partial };
    try {
      localStorage.setItem(PRINTER_STORAGE_KEY, JSON.stringify(this.settings));
    } catch {
      // ignore
    }
    this.notify();
  }

  public onSettingsChange(callback: (s: ThermalPrinterSettings) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  private notify(): void {
    this.listeners.forEach(cb => cb(this.settings));
  }

  public isWebBluetoothSupported(): boolean {
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  }

  public isWebUsbSupported(): boolean {
    return typeof navigator !== 'undefined' && 'usb' in navigator;
  }

  /**
   * Connect to Bluetooth Thermal POS Printer via Web Bluetooth
   */
  public async connectBluetooth(): Promise<string> {
    if (!this.isWebBluetoothSupported()) {
      throw new Error(
        'Web Bluetooth is not supported in this browser or frame. Chrome or Edge on Android/Windows/Mac is recommended.'
      );
    }

    try {
      // Request device with printer service or accept all
      const device = await (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: BLE_PRINTER_SERVICES,
      });

      this.bluetoothDevice = device;
      const server = await device.gatt.connect();

      // Find writable characteristic across primary services
      let targetCharacteristic: any = null;
      for (const serviceUuid of BLE_PRINTER_SERVICES) {
        try {
          const service = await server.getPrimaryService(serviceUuid);
          const characteristics = await service.getCharacteristics();
          for (const char of characteristics) {
            if (char.properties.write || char.properties.writeWithoutResponse) {
              targetCharacteristic = char;
              break;
            }
          }
          if (targetCharacteristic) break;
        } catch {
          // continue checking other services
        }
      }

      // If specific service not found, query all services
      if (!targetCharacteristic) {
        try {
          const services = await server.getPrimaryServices();
          for (const s of services) {
            const chars = await s.getCharacteristics();
            for (const c of chars) {
              if (c.properties.write || c.properties.writeWithoutResponse) {
                targetCharacteristic = c;
                break;
              }
            }
            if (targetCharacteristic) break;
          }
        } catch {
          // fallback
        }
      }

      if (!targetCharacteristic) {
        throw new Error('Connected to Bluetooth device, but no writable printer characteristic was found.');
      }

      this.bluetoothCharacteristic = targetCharacteristic;
      const deviceName = device.name || 'Bluetooth Thermal Printer';

      this.updateSettings({
        name: deviceName,
        type: 'BLUETOOTH',
        connected: true,
        lastConnectedAt: new Date().toISOString(),
      });

      device.addEventListener('gattserverdisconnected', () => {
        this.updateSettings({ connected: false });
      });

      return deviceName;
    } catch (err: any) {
      console.error('Bluetooth connection failed:', err);
      throw err;
    }
  }

  /**
   * Connect to USB Thermal POS Printer via WebUSB
   */
  public async connectUsb(): Promise<string> {
    if (!this.isWebUsbSupported()) {
      throw new Error(
        'WebUSB is not supported in this browser. Chrome or Edge on Windows, Linux, or Android is recommended.'
      );
    }

    try {
      const device = await (navigator as any).usb.requestDevice({
        filters: [{ classCode: 7 }], // 7 = Printer Class
      });

      await device.open();
      if (device.configuration === null) {
        await device.selectConfiguration(1);
      }

      // Find interface with OUT endpoint
      let targetInterface = 0;
      let targetEndpointOut = 1;

      for (const iface of device.configuration.interfaces) {
        for (const alt of iface.alternates) {
          for (const ep of alt.endpoints) {
            if (ep.direction === 'out') {
              targetInterface = iface.interfaceNumber;
              targetEndpointOut = ep.endpointNumber;
              break;
            }
          }
        }
      }

      await device.claimInterface(targetInterface);
      this.usbDevice = device;
      this.usbEndpointOut = targetEndpointOut;

      const deviceName = device.productName || 'USB POS Thermal Printer';

      this.updateSettings({
        name: deviceName,
        type: 'USB',
        connected: true,
        lastConnectedAt: new Date().toISOString(),
      });

      return deviceName;
    } catch (err: any) {
      console.error('USB connection failed:', err);
      throw err;
    }
  }

  /**
   * Disconnect current active printer
   */
  public async disconnect(): Promise<void> {
    if (this.bluetoothDevice && this.bluetoothDevice.gatt?.connected) {
      this.bluetoothDevice.gatt.disconnect();
    }
    if (this.usbDevice && this.usbDevice.opened) {
      await this.usbDevice.close();
    }
    this.bluetoothDevice = null;
    this.bluetoothCharacteristic = null;
    this.usbDevice = null;
    this.usbEndpointOut = null;

    this.updateSettings({
      connected: false,
      name: 'No Printer Connected',
      type: 'SYSTEM',
    });
  }

  /**
   * Send text string to connected printer (or simulate if none)
   */
  public async printReceiptText(text: string): Promise<{ success: boolean; simulated: boolean; message: string }> {
    const encoder = new TextEncoder();
    const init = new Uint8Array([0x1b, 0x40]); // ESC @
    const body = encoder.encode(text + '\n\n\n');
    const cut = new Uint8Array([0x1d, 0x56, 0x41, 0x10]); // GS V A 16 (cut)
    const combined = new Uint8Array(init.length + body.length + cut.length);
    combined.set(init, 0);
    combined.set(body, init.length);
    combined.set(cut, init.length + body.length);
    return this.printRaw(combined);
  }

  /**
   * Send binary ESC/POS payload to connected printer (or simulate if none)
   */
  public async printRaw(data: Uint8Array): Promise<{ success: boolean; simulated: boolean; message: string }> {
    // 1. If connected via Web Bluetooth
    if (this.settings.connected && this.settings.type === 'BLUETOOTH' && this.bluetoothCharacteristic) {
      try {
        // Send in MTU chunks of 100 bytes
        const chunkSize = 100;
        for (let i = 0; i < data.length; i += chunkSize) {
          const chunk = data.slice(i, i + chunkSize);
          if (this.bluetoothCharacteristic.writeValueWithoutResponse) {
            await this.bluetoothCharacteristic.writeValueWithoutResponse(chunk);
          } else {
            await this.bluetoothCharacteristic.writeValue(chunk);
          }
          // tiny delay between chunks
          await new Promise(r => setTimeout(r, 20));
        }
        return {
          success: true,
          simulated: false,
          message: `Sent ${data.length} bytes to Bluetooth printer "${this.settings.name}".`,
        };
      } catch (err: any) {
        console.error('Bluetooth write error:', err);
        throw new Error('Bluetooth printer transfer failed: ' + err.message);
      }
    }

    // 2. If connected via WebUSB
    if (this.settings.connected && this.settings.type === 'USB' && this.usbDevice) {
      try {
        const ep = this.usbEndpointOut || 1;
        await this.usbDevice.transferOut(ep, data);
        return {
          success: true,
          simulated: false,
          message: `Sent ${data.length} bytes to USB printer "${this.settings.name}".`,
        };
      } catch (err: any) {
        console.error('USB write error:', err);
        throw new Error('USB printer transfer failed: ' + err.message);
      }
    }

    // 3. Fallback: Virtual / Simulated print log for testing
    console.log(
      `[TingiPOS Thermal ESC/POS Service] Generated ${data.length} bytes for ${this.settings.paperWidth} thermal printer.`
    );
    return {
      success: true,
      simulated: true,
      message: `ESC/POS receipt formatted successfully (${data.length} bytes, ${this.settings.paperWidth}). Pair a Bluetooth or USB printer to print directly to paper.`,
    };
  }

  /**
   * Sends a test print page
   */
  public async printTestReceipt(): Promise<{ success: boolean; simulated: boolean; message: string }> {
    const rawData = buildTestPrintReceipt(this.settings);
    return this.printRaw(rawData);
  }
}

export const thermalPrinterService = new ThermalPrinterService();
