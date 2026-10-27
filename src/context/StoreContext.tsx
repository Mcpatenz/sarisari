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
  CashierShift,
  DenominationBreakdown,
  Supplier,
} from '../types';
import { db, initializeDatabase, DEFAULT_DEVICES } from '../lib/db';
import {
  calculateProductPrice,
  calculateGramsFromBudget,
  formatQuantityWithUnit,
  pesosToCentavos,
} from '../lib/pricing';
import {
  pushSalesToServer,
  pullCentralCatalog,
  notifySyncEvent,
  onSyncEvent,
  getCentralConflicts,
} from '../lib/syncEngine';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { calculatePointsEarned, recordCustomerSale } from '../lib/loyalty';
import { thermalPrinterService } from '../lib/thermalPrinter';
import { buildThermalReceipt } from '../lib/escpos';
import { calculateDenominationsTotalCentavos, calculateShiftTotals } from '../lib/shiftManager';

export type ActiveTab =
  | 'pos'
  | 'inventory'
  | 'loyalty'
  | 'analytics'
  | 'shifts'
  | 'suppliers'
  | 'pricing'
  | 'sync'
  | 'history'
  | 'reports';

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
  activeShift: CashierShift | null;
  allShifts: CashierShift[];
  suppliers: Supplier[];
  
  // Actions
  setActiveTab: (tab: ActiveTab) => void;
  setCurrentRole: (role: UserRole) => void;
  switchDevice: (deviceId: string) => Promise<void>;
  addDevice: (name: string, type: StoreDevice['type']) => Promise<void>;
  toggleSimulateOffline: () => void;
  
  // Shift actions
  openNewShift: (cashierName: string, openingFloatPesos: number) => Promise<CashierShift>;
  closeActiveShift: (denominations: DenominationBreakdown, notes?: string) => Promise<CashierShift>;
  
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
  const [activeShift, setActiveShift] = useState<CashierShift | null>(null);
  const [allShifts, setAllShifts] = useState<CashierShift[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

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

      const sales = await db.sales.orderBy('createdAt').reverse().limit(100).toArray();
      setRecentSales(sales);

      const custs = await db.customers.toArray();
      setCustomers(custs);

      const sups = await db.suppliers.toArray();
      setSuppliers(sups);

      const shifts = await db.shifts.orderBy('openedAt').reverse().toArray();
      setAllShifts(shifts);
      const currentOpen = shifts.find(s => s.status === 'OPEN') || null;
      setActiveShift(currentOpen);

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

  // Shift Management: Open New Shift
  const openNewShift = async (cashierName: string, openingFloatPesos: number): Promise<CashierShift> => {
    const shiftId = `shift-${Date.now()}`;
    const newShift: CashierShift = {
      id: shiftId,
      cashierId: currentRole === 'OWNER' ? 'usr-owner-01' : 'usr-cashier-02',
      cashierName: cashierName.trim() || (currentRole === 'OWNER' ? 'Aling Nena (Owner)' : 'Cashier'),
      deviceId: currentDevice.id,
      deviceName: currentDevice.name,
      status: 'OPEN',
      openedAt: new Date().toISOString(),
      openingFloatCentavos: pesosToCentavos(openingFloatPesos),
      cashSalesCentavos: 0,
      gcashSalesCentavos: 0,
      utangSalesCentavos: 0,
      totalSalesCentavos: 0,
      transactionCount: 0,
      cashExpensesCentavos: 0,
      expectedCashCentavos: pesosToCentavos(openingFloatPesos),
    };

    await db.shifts.add(newShift);
    setActiveShift(newShift);
    await refreshData();
    return newShift;
  };

  // Shift Management: Close Shift with Blind Counting
  const closeActiveShift = async (
    denominations: DenominationBreakdown,
    notes?: string
  ): Promise<CashierShift> => {
    if (!activeShift) {
      throw new Error('No active shift to close.');
    }

    const allSales = await db.sales.toArray();
    const allExpenses = await db.expenses.toArray();
    const totals = calculateShiftTotals(activeShift, allSales, allExpenses);

    const countedCashCentavos = calculateDenominationsTotalCentavos(denominations);
    const discrepancyCentavos = countedCashCentavos - totals.expectedCashCentavos;

    const closedShift: CashierShift = {
      ...activeShift,
      status: 'CLOSED',
      closedAt: new Date().toISOString(),
      cashSalesCentavos: totals.cashSalesCentavos,
      gcashSalesCentavos: totals.gcashSalesCentavos,
      utangSalesCentavos: totals.utangSalesCentavos,
      totalSalesCentavos: totals.totalSalesCentavos,
      transactionCount: totals.transactionCount,
      cashExpensesCentavos: totals.cashExpensesCentavos,
      expectedCashCentavos: totals.expectedCashCentavos,
      countedCashCentavos,
      discrepancyCentavos,
      denominations,
      notes: notes?.trim() || undefined,
    };

    await db.shifts.put(closedShift);
    setActiveShift(null);
    await refreshData();
    return closedShift;
  };

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
      const pricing = calculateProductPrice(product, totalQty);

      const newItem: CartItem = {
        id: existingIdx >= 0 ? prevCart[existingIdx].id : `cart-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        productId: product.id,
        productName: product.name,
        baseUnit: product.baseUnit,
        quantityBase: totalQty,
        displayQuantity: formatQuantityWithUnit(totalQty, product.baseUnit),
        lineTotalCentavos: pricing.totalCentavos,
        costTotalCentavos: Math.round(totalQty * product.costPerBaseCentavos),
        appliedRuleDescription: pricing.ruleDescription,
        unitPriceCentavos: totalQty > 0 ? Math.round(pricing.totalCentavos / totalQty) : 0,
        savingsCentavos: pricing.savingsCentavos,
      };

      if (existingIdx >= 0) {
        const copy = [...prevCart];
        copy[existingIdx] = newItem;
        return copy;
      }
      return [...prevCart, newItem];
    });
  };

  // Update Cart Item Quantity
  const updateCartItemQty = (cartItemId: string, newQuantityBase: number) => {
    if (newQuantityBase <= 0) {
      removeCartItem(cartItemId);
      return;
    }

    setCart(prevCart =>
      prevCart.map(item => {
        if (item.id !== cartItemId) return item;
        const prod = products.find(p => p.id === item.productId);
        if (!prod) return item;

        const pricing = calculateProductPrice(prod, newQuantityBase);
        return {
          ...item,
          quantityBase: newQuantityBase,
          displayQuantity: formatQuantityWithUnit(newQuantityBase, prod.baseUnit),
          lineTotalCentavos: pricing.totalCentavos,
          costTotalCentavos: Math.round(newQuantityBase * prod.costPerBaseCentavos),
          appliedRuleDescription: pricing.ruleDescription,
          unitPriceCentavos: newQuantityBase > 0 ? Math.round(pricing.totalCentavos / newQuantityBase) : 0,
          savingsCentavos: pricing.savingsCentavos,
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

  // Complete Sale
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
      cashierId: activeShift ? activeShift.cashierId : currentRole === 'OWNER' ? 'usr-owner-01' : 'usr-cashier-02',
      cashierName: activeShift ? activeShift.cashierName : currentRole === 'OWNER' ? 'Aling Nena (Owner)' : 'Maria Santos (Cashier)',
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
      shiftId: activeShift?.id,
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

        // Native Browser Notification for low stock if granted
        if (newStock <= prod.lowStockThreshold && typeof window !== 'undefined' && 'Notification' in window) {
          if (Notification.permission === 'granted') {
            const formattedStock = prod.baseUnit === 'GRAM' ? `${newStock / 1000}kg` : `${newStock} pcs`;
            new Notification(`Low Stock Alert: ${prod.name}`, {
              body: `Remaining inventory dropped to ${formattedStock}. Time to replenish with supplier!`,
              icon: '/icon.svg',
            });
          }
        }
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

    // 5. If online, attempt background sync push
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
        activeShift,
        allShifts,
        suppliers,
        openNewShift,
        closeActiveShift,
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
