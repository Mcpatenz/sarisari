/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  LocalProduct,
  CartItem,
  LocalSale,
  UserRole,
  StoreDevice,
  InventoryMovement,
  SaleItemRecord,
  LoyaltyCustomer,
  ThermalPrinterSettings,
} from '../types';
import { db, initializeDatabase, DEFAULT_DEVICES } from '../lib/db';
import {
  calculateProductPrice,
  calculateGramsFromBudget,
  formatQuantityWithUnit,
} from '../lib/pricing';
import {
  pushSalesToServer,
  pullCentralCatalog,
  notifySyncEvent,
  onSyncEvent,
  syncCentralStockUpdate,
  getCentralConflicts,
} from '../lib/syncEngine';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { calculatePointsEarned, recordCustomerSale } from '../lib/loyalty';
import { thermalPrinterService } from '../lib/thermalPrinter';
import { buildThermalReceipt } from '../lib/escpos';

export type ActiveTab = 'pos' | 'inventory' | 'loyalty' | 'sync' | 'pricing' | 'reports' | 'history';

interface CartSummary {
  subtotalCentavos: number;
  discountCentavos: number;
  totalCentavos: number;
  totalCostCentavos: number;
  savingsCentavos: number;
  itemCount: number;
}

interface StoreContextType {
  products: LocalProduct[];
  cart: CartItem[];
  cartSummary: CartSummary;
  currentDevice: StoreDevice;
  allDevices: StoreDevice[];
  currentRole: UserRole;
  activeTab: ActiveTab;
  isOnline: boolean;
  browserOnline: boolean;
  simulatedOffline: boolean;
  pendingSalesCount: number;
  conflictSalesCount: number;
  isSyncing: boolean;
  lastSyncTime: string | null;
  recentSales: LocalSale[];
  customers: LoyaltyCustomer[];
  printerSettings: ThermalPrinterSettings;
  
  // Actions
  setActiveTab: (tab: ActiveTab) => void;
  setCurrentRole: (role: UserRole) => void;
  switchDevice: (deviceId: string) => Promise<void>;
  addDevice: (name: string, type: StoreDevice['type']) => Promise<void>;
  toggleSimulateOffline: () => void;
  
  // Cart Actions
  addToCart: (product: LocalProduct, quantityBase: number, customBudgetPesos?: number) => void;
  updateCartItemQty: (cartItemId: string, newQuantityBase: number) => void;
  removeCartItem: (cartItemId: string) => void;
  clearCart: () => void;
  
  // Sale Completion
  completeSale: (params: {
    paymentMethod: 'CASH' | 'GCASH' | 'UTANG';
    cashReceivedCentavos: number;
    customerName?: string;
    customerId?: string;
    customerPhone?: string;
    pointsRedeemed?: number;
    pointsDiscountCentavos?: number;
    notes?: string;
  }) => Promise<LocalSale>;
  
  // Thermal Printer
  printThermalReceipt: (sale: LocalSale) => Promise<{ success: boolean; simulated: boolean; message: string }>;
  
  // Sync
  triggerSync: () => Promise<{ pushedCount: number; conflictsCount: number }>;
  
  // Refresh data
  refreshData: () => Promise<void>;
}

const StoreContext = createContext<StoreContextType | null>(null);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isOnline, browserOnline, simulatedOffline, toggleSimulateOffline } = useOnlineStatus();

  const [products, setProducts] = useState<LocalProduct[]>([]);
  const [allDevices, setAllDevices] = useState<StoreDevice[]>(DEFAULT_DEVICES);
  const [currentDevice, setCurrentDevice] = useState<StoreDevice>(DEFAULT_DEVICES[0]);
  const [currentRole, setCurrentRole] = useState<UserRole>('OWNER');
  const [activeTab, setActiveTab] = useState<ActiveTab>('pos');

  const [cart, setCart] = useState<CartItem[]>([]);
  const [recentSales, setRecentSales] = useState<LocalSale[]>([]);
  const [customers, setCustomers] = useState<LoyaltyCustomer[]>([]);
  const [printerSettings, setPrinterSettings] = useState<ThermalPrinterSettings>(
    thermalPrinterService.getSettings()
  );
  const [pendingSalesCount, setPendingSalesCount] = useState(0);
  const [conflictSalesCount, setConflictSalesCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  // Subscribe to printer settings
  useEffect(() => {
    const unsub = thermalPrinterService.onSettingsChange(s => setPrinterSettings(s));
    return () => unsub();
  }, []);

  // Load all products and data from Dexie
  const refreshData = useCallback(async () => {
    try {
      await initializeDatabase();
      const prods = await db.products.toArray();
      setProducts(prods);

      const devs = await db.devices.toArray();
      if (devs.length > 0) {
        setAllDevices(devs);
        const cur = devs.find(d => d.isCurrent) || devs[0];
        setCurrentDevice(cur);
      }

      const sales = await db.sales.orderBy('createdAt').reverse().limit(50).toArray();
      setRecentSales(sales);

      const custs = await db.customers.toArray();
      setCustomers(custs);

      const pending = await db.sales.where('syncStatus').equals('PENDING').count();
      setPendingSalesCount(pending);

      const conflicts = await db.sales.where('syncStatus').equals('CONFLICT').count();
      const centralConflicts = getCentralConflicts();
      setConflictSalesCount(Math.max(conflicts, centralConflicts.length));
    } catch (err) {
      console.error('Error refreshing local database:', err);
    }
  }, []);

  // Initialize on mount
  useEffect(() => {
    refreshData();

    // Listen to sync broadcast from other tabs
    const unsubscribe = onSyncEvent(() => {
      refreshData();
    });

    return () => unsubscribe();
  }, [refreshData]);

  // Compute Cart Summary
  const cartSummary: CartSummary = React.useMemo(() => {
    let subtotalCentavos = 0;
    let totalCostCentavos = 0;
    let regularCentavos = 0;
    let savingsCentavos = 0;

    for (const item of cart) {
      subtotalCentavos += item.lineTotalCentavos;
      totalCostCentavos += item.costTotalCentavos;
      regularCentavos += (item.savingsCentavos || 0) + item.lineTotalCentavos;
      savingsCentavos += item.savingsCentavos || 0;
    }

    return {
      subtotalCentavos,
      discountCentavos: savingsCentavos,
      totalCentavos: subtotalCentavos,
      totalCostCentavos,
      savingsCentavos,
      itemCount: cart.reduce((acc, item) => acc + (item.baseUnit === 'PIECE' ? item.quantityBase : 1), 0),
    };
  }, [cart]);

  // Switch Active Device
  const switchDevice = async (deviceId: string) => {
    const devs = await db.devices.toArray();
    const updated = devs.map(d => ({
      ...d,
      isCurrent: d.id === deviceId,
    }));
    await db.devices.clear();
    await db.devices.bulkAdd(updated);
    setAllDevices(updated);
    const cur = updated.find(d => d.id === deviceId) || updated[0];
    setCurrentDevice(cur);
  };

  // Add new device
  const addDevice = async (name: string, type: StoreDevice['type']) => {
    const newDev: StoreDevice = {
      id: `dev-${Date.now()}`,
      name,
      type,
      active: true,
      isCurrent: false,
    };
    await db.devices.add(newDev);
    await refreshData();
  };

  // Add to Cart
  const addToCart = (product: LocalProduct, quantityBase: number, customBudgetPesos?: number) => {
    if (quantityBase <= 0) return;

    setCart(prevCart => {
      const existingIdx = prevCart.findIndex(i => i.productId === product.id);

      // If custom budget
      if (customBudgetPesos && product.baseUnit === 'GRAM') {
        const customCalc = calculateGramsFromBudget(product, customBudgetPesos);
        const newItem: CartItem = {
          id: `cart-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          productId: product.id,
          productName: product.name,
          baseUnit: product.baseUnit,
          quantityBase: customCalc.grams,
          displayQuantity: `${customCalc.grams}g`,
          lineTotalCentavos: customCalc.actualCentavos,
          costTotalCentavos: Math.round(customCalc.grams * product.costPerBaseCentavos),
          appliedRuleDescription: customCalc.formattedDescription,
          unitPriceCentavos: customCalc.actualCentavos,
          savingsCentavos: 0,
        };
        return [...prevCart, newItem];
      }

      const totalQty = existingIdx >= 0 ? prevCart[existingIdx].quantityBase + quantityBase : quantityBase;
      const calc = calculateProductPrice(product, totalQty);

      const updatedItem: CartItem = {
        id: existingIdx >= 0 ? prevCart[existingIdx].id : `cart-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        productId: product.id,
        productName: product.name,
        baseUnit: product.baseUnit,
        quantityBase: totalQty,
        displayQuantity: formatQuantityWithUnit(totalQty, product.baseUnit),
        lineTotalCentavos: calc.totalCentavos,
        costTotalCentavos: calc.totalCostCentavos,
        appliedRuleDescription: calc.ruleDescription,
        unitPriceCentavos: Math.round(calc.totalCentavos / totalQty),
        savingsCentavos: calc.savingsCentavos,
      };

      if (existingIdx >= 0) {
        const copy = [...prevCart];
        copy[existingIdx] = updatedItem;
        return copy;
      }
      return [...prevCart, updatedItem];
    });
  };

  // Update Cart Quantity
  const updateCartItemQty = (cartItemId: string, newQuantityBase: number) => {
    if (newQuantityBase <= 0) {
      removeCartItem(cartItemId);
      return;
    }

    setCart(prevCart =>
      prevCart.map(item => {
        if (item.id !== cartItemId) return item;
        const product = products.find(p => p.id === item.productId);
        if (!product) return item;

        const calc = calculateProductPrice(product, newQuantityBase);
        return {
          ...item,
          quantityBase: newQuantityBase,
          displayQuantity: formatQuantityWithUnit(newQuantityBase, item.baseUnit),
          lineTotalCentavos: calc.totalCentavos,
          costTotalCentavos: calc.totalCostCentavos,
          appliedRuleDescription: calc.ruleDescription,
          unitPriceCentavos: Math.round(calc.totalCentavos / newQuantityBase),
          savingsCentavos: calc.savingsCentavos,
        };
      })
    );
  };

  // Remove from Cart
  const removeCartItem = (cartItemId: string) => {
    setCart(prev => prev.filter(i => i.id !== cartItemId));
  };

  // Clear Cart
  const clearCart = () => {
    setCart([]);
  };

  // Trigger Sync
  const triggerSync = async (): Promise<{ pushedCount: number; conflictsCount: number }> => {
    setIsSyncing(true);
    let pushedCount = 0;
    let conflictsCount = 0;

    try {
      // Find all pending sales
      const pendingSales = await db.sales.where('syncStatus').equals('PENDING').toArray();

      if (pendingSales.length > 0) {
        const results = await pushSalesToServer(pendingSales);

        for (const res of results) {
          if (res.status === 'accepted' || res.status === 'already_processed') {
            await db.sales.update(res.saleId, {
              syncStatus: 'SYNCED',
              syncedAt: new Date().toISOString(),
            });
            pushedCount++;
          } else if (res.status === 'conflict') {
            await db.sales.update(res.saleId, {
              syncStatus: 'CONFLICT',
              conflictReason: res.message,
            });
            conflictsCount++;
          }
        }
      }

      // Pull central catalog updates
      await pullCentralCatalog();

      setLastSyncTime(new Date().toLocaleTimeString());
      notifySyncEvent('SALES_PUSHED');
      await refreshData();
    } catch (e) {
      console.error('Sync failed:', e);
    } finally {
      setIsSyncing(false);
    }

    return { pushedCount, conflictsCount };
  };

  // Complete Sale with Loyalty Points support
  const completeSale = async ({
    paymentMethod,
    cashReceivedCentavos,
    customerName,
    customerId,
    customerPhone,
    pointsRedeemed = 0,
    pointsDiscountCentavos = 0,
    notes,
  }: {
    paymentMethod: 'CASH' | 'GCASH' | 'UTANG';
    cashReceivedCentavos: number;
    customerName?: string;
    customerId?: string;
    customerPhone?: string;
    pointsRedeemed?: number;
    pointsDiscountCentavos?: number;
    notes?: string;
  }): Promise<LocalSale> => {
    if (cart.length === 0) {
      throw new Error('Cart is empty.');
    }

    const saleId = `sale-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const receiptNum = `RCPT-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;

    const saleItems: SaleItemRecord[] = cart.map(c => ({
      id: `si-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      saleId,
      productId: c.productId,
      productName: c.productName,
      quantityBase: c.quantityBase,
      unitPriceCentavos: c.unitPriceCentavos,
      lineTotalCentavos: c.lineTotalCentavos,
      costTotalCentavos: c.costTotalCentavos,
      pricingRuleName: c.appliedRuleDescription,
      displayQuantity: c.displayQuantity,
    }));

    const finalTotalCentavos = Math.max(0, cartSummary.totalCentavos - pointsDiscountCentavos);
    const changeAmountCentavos = Math.max(0, cashReceivedCentavos - finalTotalCentavos);

    // Calculate Suki Points Earned
    const pointsEarned = (customerId || customerPhone) ? calculatePointsEarned(finalTotalCentavos) : 0;

    let updatedCustomer: LoyaltyCustomer | undefined = undefined;
    if (customerId || customerPhone) {
      updatedCustomer = await recordCustomerSale({
        customerId,
        customerPhone,
        customerName: customerName || undefined,
        totalCentavos: finalTotalCentavos,
        pointsEarned,
        pointsRedeemed,
      });
    }

    const newSale: LocalSale = {
      id: saleId,
      storeId: 'store-aling-nena-main',
      deviceId: currentDevice.id,
      deviceName: currentDevice.name,
      cashierId: currentRole === 'OWNER' ? 'usr-owner-01' : 'usr-cashier-02',
      cashierName: currentRole === 'OWNER' ? 'Aling Nena (Owner)' : 'Maria Santos (Cashier)',
      receiptNumber: receiptNum,
      status: 'COMPLETED',
      subtotalCentavos: cartSummary.subtotalCentavos,
      discountCentavos: cartSummary.discountCentavos + pointsDiscountCentavos,
      totalCentavos: finalTotalCentavos,
      totalCostCentavos: cartSummary.totalCostCentavos,
      cashReceivedCentavos,
      changeAmountCentavos,
      paymentMethod,
      customerName: customerName || (updatedCustomer ? updatedCustomer.name : 'Walk-in Suki'),
      customerId: updatedCustomer?.id || customerId,
      customerPhone: updatedCustomer?.phone || customerPhone,
      pointsEarned,
      pointsRedeemed,
      pointsDiscountCentavos,
      customerNewPointsBalance: updatedCustomer?.pointsBalance,
      notes,
      createdAt: new Date().toISOString(),
      items: saleItems,
      syncStatus: 'PENDING',
    };

    // 1. Save sale locally in IndexedDB
    await db.sales.add(newSale);

    // 2. Update local inventory & log inventory movements
    for (const item of cart) {
      const prod = await db.products.get(item.productId);
      if (prod) {
        const newStock = Math.max(0, prod.stockBaseUnits - item.quantityBase);
        await db.products.update(item.productId, { stockBaseUnits: newStock });

        const movement: InventoryMovement = {
          id: `mov-${Date.now()}-${item.productId}`,
          productId: item.productId,
          productName: item.productName,
          type: 'SALE',
          quantityDeltaBase: -item.quantityBase,
          referenceId: saleId,
          deviceId: currentDevice.id,
          reason: `Sale ${receiptNum}`,
          createdAt: new Date().toISOString(),
        };
        await db.movements.add(movement);
      }
    }

    // 3. Clear cart
    clearCart();

    // 4. Auto print if thermal printer connected
    if (printerSettings.connected) {
      try {
        const rawBytes = buildThermalReceipt(newSale, printerSettings);
        thermalPrinterService.printRaw(rawBytes).catch(e => console.warn('Auto print err:', e));
      } catch (err) {
        console.warn('Auto print failed:', err);
      }
    }

    // 5. If online, attempt immediate sync push in background
    if (isOnline) {
      setTimeout(async () => {
        try {
          const results = await pushSalesToServer([newSale]);
          const res = results[0];
          if (res) {
            if (res.status === 'accepted' || res.status === 'already_processed') {
              await db.sales.update(saleId, {
                syncStatus: 'SYNCED',
                syncedAt: new Date().toISOString(),
              });
            } else if (res.status === 'conflict') {
              await db.sales.update(saleId, {
                syncStatus: 'CONFLICT',
                conflictReason: res.message,
              });
            }
          }
          await pullCentralCatalog();
          setLastSyncTime(new Date().toLocaleTimeString());
          notifySyncEvent('SALES_PUSHED');
          await refreshData();
        } catch (e) {
          console.error('Auto sync error:', e);
        }
      }, 300);
    }

    await refreshData();
    return newSale;
  };

  // Thermal Print Receipt
  const printThermalReceipt = async (sale: LocalSale) => {
    const rawBytes = buildThermalReceipt(sale, printerSettings);
    return thermalPrinterService.printRaw(rawBytes);
  };

  return (
    <StoreContext.Provider
      value={{
        products,
        cart,
        cartSummary,
        currentDevice,
        allDevices,
        currentRole,
        activeTab,
        isOnline,
        browserOnline,
        simulatedOffline,
        pendingSalesCount,
        conflictSalesCount,
        isSyncing,
        lastSyncTime,
        recentSales,
        customers,
        printerSettings,
        printThermalReceipt,
        setActiveTab,
        setCurrentRole,
        switchDevice,
        addDevice,
        toggleSimulateOffline,
        addToCart,
        updateCartItemQty,
        removeCartItem,
        clearCart,
        completeSale,
        triggerSync,
        refreshData,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};
