/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Truck,
  Plus,
  Phone,
  MessageSquare,
  Mail,
  Package,
  Calendar,
  DollarSign,
  FileText,
  Copy,
  Printer,
  CheckCircle2,
  AlertTriangle,
  ShoppingCart,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Trash2,
  Edit2,
  Clock,
  Layers,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { Supplier, LocalProduct, PurchaseOrderItem, PurchaseOrder, AutoOrderSuggestion } from '../../types';
import { formatCentavos, centavosToPesos, pesosToCentavos } from '../../lib/pricing';
import { calculateAutoOrderSuggestions } from '../../lib/autoOrder';
import { db } from '../../lib/db';
import { thermalPrinterService } from '../../lib/thermalPrinter';

export const SupplierManager: React.FC = () => {
  const { suppliers, products, recentSales, refreshData } = useStore();

  const [activeSubView, setActiveSubView] = useState<'SUPPLIERS' | 'AUTO_ORDER' | 'ORDERS'>('AUTO_ORDER');

  // Supplier Add/Edit Modal
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supplierForm, setSupplierForm] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    viber: '',
    email: '',
    address: '',
    paymentTerms: 'Cash on Delivery (COD)',
    leadTimeDays: 1,
    notes: '',
    productIds: [] as string[],
  });

  // Replenishment PO Generator Modal
  const [showPOModal, setShowPOModal] = useState(false);
  const [selectedSupplierForPO, setSelectedSupplierForPO] = useState<Supplier | null>(null);
  const [poItems, setPoItems] = useState<PurchaseOrderItem[]>([]);
  const [poNotes, setPoNotes] = useState('');
  const [copiedSuccess, setCopiedSuccess] = useState(false);

  // Auto-Order Filter
  const [urgencyFilter, setUrgencyFilter] = useState<'ALL' | 'CRITICAL' | 'REORDER_NOW'>('ALL');

  // Calculate Auto-Order suggestions using historical run rate
  const autoOrderSuggestions = useMemo(() => {
    return calculateAutoOrderSuggestions(products, recentSales, suppliers, {
      lookbackDays: 7,
      targetCoverageDays: 7,
    });
  }, [products, recentSales, suppliers]);

  // Filtered auto order list
  const filteredSuggestions = useMemo(() => {
    if (urgencyFilter === 'ALL') return autoOrderSuggestions;
    return autoOrderSuggestions.filter(s => s.urgency === urgencyFilter);
  }, [autoOrderSuggestions, urgencyFilter]);

  // Open Replenishment PO Modal with auto-filled items
  const openReplenishmentModal = (supplier: Supplier, preselectProductId?: string) => {
    setSelectedSupplierForPO(supplier);
    setCopiedSuccess(false);

    // Find linked products that need reordering
    const linkedProducts = products.filter(
      p => supplier.productIds.includes(p.id) || p.supplierId === supplier.id
    );

    const items: PurchaseOrderItem[] = [];
    for (const p of linkedProducts) {
      const suggestion = autoOrderSuggestions.find(s => s.productId === p.id);
      const isPreselected = preselectProductId === p.id;
      const needsReorder = isPreselected || (suggestion && (suggestion.urgency === 'CRITICAL' || suggestion.urgency === 'REORDER_NOW'));

      if (needsReorder || linkedProducts.length <= 4) {
        const orderQty = suggestion?.suggestedOrderQty && suggestion.suggestedOrderQty > 0
          ? suggestion.suggestedOrderQty
          : p.baseUnit === 'GRAM' ? 10000 : 20;

        items.push({
          productId: p.id,
          productName: p.name,
          sku: p.sku,
          baseUnit: p.baseUnit,
          currentStock: p.stockBaseUnits,
          suggestedQty: suggestion?.suggestedOrderQty || 0,
          orderQty,
          costPerBaseCentavos: p.costPerBaseCentavos,
          totalCostCentavos: Math.round(orderQty * p.costPerBaseCentavos),
        });
      }
    }

    setPoItems(items);
    setPoNotes(`Auto-generated replenishment order based on 7-day sales run rate. Expected delivery lead time: ${supplier.leadTimeDays} day(s).`);
    setShowPOModal(true);
  };

  // Update quantity in replenishment PO
  const handlePOItemQtyChange = (productId: string, newQty: number) => {
    setPoItems(prev =>
      prev.map(it => {
        if (it.productId !== productId) return it;
        const validQty = Math.max(0, newQty);
        return {
          ...it,
          orderQty: validQty,
          totalCostCentavos: Math.round(validQty * it.costPerBaseCentavos),
        };
      })
    );
  };

  // Remove item from PO
  const handleRemovePOItem = (productId: string) => {
    setPoItems(prev => prev.filter(it => it.productId !== productId));
  };

  // Add any product to current PO
  const handleAddProductToPO = (productId: string) => {
    const prod = products.find(p => p.id === productId);
    if (!prod) return;
    if (poItems.some(it => it.productId === prod.id)) return;

    const defaultQty = prod.baseUnit === 'GRAM' ? 10000 : 20;
    setPoItems(prev => [
      ...prev,
      {
        productId: prod.id,
        productName: prod.name,
        sku: prod.sku,
        baseUnit: prod.baseUnit,
        currentStock: prod.stockBaseUnits,
        suggestedQty: 0,
        orderQty: defaultQty,
        costPerBaseCentavos: prod.costPerBaseCentavos,
        totalCostCentavos: Math.round(defaultQty * prod.costPerBaseCentavos),
      },
    ]);
  };

  // Total PO Estimated Cost
  const totalPOCostCentavos = useMemo(() => {
    return poItems.reduce((acc, it) => acc + it.totalCostCentavos, 0);
  }, [poItems]);

  // Format PO for copying to SMS or Viber
  const generatePOText = () => {
    if (!selectedSupplierForPO) return '';
    const dateStr = new Date().toLocaleDateString('en-PH', { dateStyle: 'medium' });
    const lines = [
      `📦 PURCHASE REPLENISHMENT ORDER`,
      `Store: Aling Nena Sari-Sari Store`,
      `To: ${selectedSupplierForPO.name} (Attn: ${selectedSupplierForPO.contactPerson})`,
      `Date: ${dateStr}`,
      `Payment Terms: ${selectedSupplierForPO.paymentTerms || 'COD'}`,
      `---------------------------------`,
      `ITEMS TO RESTOCK:`,
    ];

    poItems.forEach((it, idx) => {
      const qtyStr = it.baseUnit === 'GRAM' ? `${(it.orderQty / 1000).toFixed(1)} kg` : `${it.orderQty} pcs`;
      lines.push(`${idx + 1}. ${it.productName} - [${qtyStr}] @ ${formatCentavos(it.totalCostCentavos)}`);
    });

    lines.push(`---------------------------------`);
    lines.push(`ESTIMATED TOTAL: ${formatCentavos(totalPOCostCentavos)}`);
    if (poNotes) lines.push(`Notes: ${poNotes}`);
    lines.push(`Please confirm order receipt. Maraming salamat!`);

    return lines.join('\n');
  };

  const handleCopyPO = async () => {
    const text = generatePOText();
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSuccess(true);
      setTimeout(() => setCopiedSuccess(false), 3000);
    } catch {
      // fallback
    }
  };

  const handlePrintPOThermal = async () => {
    const text = generatePOText();
    await thermalPrinterService.printReceiptText(text);
  };

  const handleSavePO = async () => {
    if (!selectedSupplierForPO || poItems.length === 0) return;
    const poNumber = `PO-${Date.now().toString().slice(-6)}`;
    const newPO: PurchaseOrder = {
      id: `po-${Date.now()}`,
      poNumber,
      supplierId: selectedSupplierForPO.id,
      supplierName: selectedSupplierForPO.name,
      createdAt: new Date().toISOString(),
      items: poItems,
      totalCostCentavos: totalPOCostCentavos,
      status: 'SENT',
      notes: poNotes,
    };
    await db.purchaseOrders.add(newPO);
    setShowPOModal(false);
    alert(`Purchase Order ${poNumber} saved to database!`);
  };

  // Open Add Supplier Modal
  const openAddSupplier = () => {
    setEditingSupplier(null);
    setSupplierForm({
      name: '',
      contactPerson: '',
      phone: '',
      viber: '',
      email: '',
      address: '',
      paymentTerms: 'Cash on Delivery (COD)',
      leadTimeDays: 1,
      notes: '',
      productIds: [],
    });
    setShowSupplierModal(true);
  };

  // Open Edit Supplier Modal
  const openEditSupplier = (s: Supplier) => {
    setEditingSupplier(s);
    setSupplierForm({
      name: s.name,
      contactPerson: s.contactPerson,
      phone: s.phone,
      viber: s.viber || '',
      email: s.email || '',
      address: s.address || '',
      paymentTerms: s.paymentTerms || 'Cash on Delivery (COD)',
      leadTimeDays: s.leadTimeDays,
      notes: s.notes || '',
      productIds: s.productIds,
    });
    setShowSupplierModal(true);
  };

  // Save Supplier
  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierForm.name.trim() || !supplierForm.contactPerson.trim()) return;

    if (editingSupplier) {
      await db.suppliers.update(editingSupplier.id, {
        ...supplierForm,
      });
    } else {
      const newSup: Supplier = {
        id: `supp-${Date.now()}`,
        ...supplierForm,
        active: true,
        createdAt: new Date().toISOString(),
      };
      await db.suppliers.add(newSup);

      // Link selected products to this supplier
      for (const pid of supplierForm.productIds) {
        await db.products.update(pid, { supplierId: newSup.id });
      }
    }

    await refreshData();
    setShowSupplierModal(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Top Navigation & Subviews */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-emerald-600" />
            <h2 className="font-extrabold text-base text-slate-900">
              Suppliers &amp; Automated Replenishment
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Auto-order suggestions based on run rate and direct vendor purchase orders
          </p>
        </div>

        {/* View Switcher */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setActiveSubView('AUTO_ORDER')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeSubView === 'AUTO_ORDER'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Auto-Order Engine</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubView('SUPPLIERS')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeSubView === 'SUPPLIERS'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Truck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Vendor Directory ({suppliers.length})</span>
            </button>
          </div>

          {activeSubView === 'SUPPLIERS' && (
            <button
              type="button"
              onClick={openAddSupplier}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition active:scale-95 flex items-center gap-1.5 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Vendor</span>
            </button>
          )}
        </div>
      </div>

      {/* VIEW 1: AUTO-ORDER SUGGESTION LIST */}
      {activeSubView === 'AUTO_ORDER' && (
        <div className="space-y-4">
          {/* Subheader & Urgency Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-slate-800">
                  Stock Velocity &amp; Auto-Reorder Recommendations
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                  7-Day Sales Analysis
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Calculates daily velocity, days of inventory remaining (DOI), and auto-fills supplier purchase orders.
              </p>
            </div>

            <div className="flex items-center gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => setUrgencyFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg font-bold transition ${
                  urgencyFilter === 'ALL'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All Products ({autoOrderSuggestions.length})
              </button>
              <button
                type="button"
                onClick={() => setUrgencyFilter('CRITICAL')}
                className={`px-3 py-1.5 rounded-lg font-bold transition ${
                  urgencyFilter === 'CRITICAL'
                    ? 'bg-rose-600 text-white'
                    : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                }`}
              >
                Ubos / Critical ({autoOrderSuggestions.filter(s => s.urgency === 'CRITICAL').length})
              </button>
              <button
                type="button"
                onClick={() => setUrgencyFilter('REORDER_NOW')}
                className={`px-3 py-1.5 rounded-lg font-bold transition ${
                  urgencyFilter === 'REORDER_NOW'
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                }`}
              >
                Reorder Needed ({autoOrderSuggestions.filter(s => s.urgency === 'REORDER_NOW').length})
              </button>
            </div>
          </div>

          {/* Suggestions Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Product Name</th>
                    <th className="px-4 py-3 font-semibold text-center">Urgency</th>
                    <th className="px-4 py-3 font-semibold text-right">Current Stock</th>
                    <th className="px-4 py-3 font-semibold text-right">Daily Velocity</th>
                    <th className="px-4 py-3 font-semibold text-right">Days Left (DOI)</th>
                    <th className="px-4 py-3 font-semibold text-right">Suggested Order</th>
                    <th className="px-4 py-3 font-semibold">Linked Supplier</th>
                    <th className="px-4 py-3 font-semibold text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSuggestions.map(s => {
                    const isCritical = s.urgency === 'CRITICAL';
                    const isReorder = s.urgency === 'REORDER_NOW';
                    const linkedSup = suppliers.find(sup => sup.id === s.supplierId);

                    return (
                      <tr key={s.productId} className="hover:bg-slate-50/80 transition">
                        <td className="px-4 py-3.5">
                          <div className="font-bold text-slate-900">{s.productName}</div>
                          <div className="text-[11px] text-slate-400">{s.category}</div>
                        </td>

                        <td className="px-4 py-3.5 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                              isCritical
                                ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                : isReorder
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {isCritical ? 'CRITICAL' : isReorder ? 'REORDER NOW' : 'HEALTHY'}
                          </span>
                        </td>

                        <td className="px-4 py-3.5 text-right font-bold text-slate-900">
                          {s.baseUnit === 'GRAM' ? `${(s.currentStock / 1000).toFixed(1)} kg` : `${s.currentStock} pcs`}
                        </td>

                        <td className="px-4 py-3.5 text-right font-medium text-slate-600">
                          {s.dailyRunRate > 0
                            ? s.baseUnit === 'GRAM'
                              ? `${(s.dailyRunRate / 1000).toFixed(1)} kg/day`
                              : `${s.dailyRunRate}/day`
                            : '0 / low activity'}
                        </td>

                        <td className="px-4 py-3.5 text-right font-bold">
                          <span
                            className={
                              s.daysOfInventory <= 1
                                ? 'text-rose-600'
                                : s.daysOfInventory <= 3
                                ? 'text-amber-600'
                                : 'text-slate-700'
                            }
                          >
                            {s.daysOfInventory >= 999 ? '90+ days' : `${s.daysOfInventory} days`}
                          </span>
                        </td>

                        <td className="px-4 py-3.5 text-right font-black text-emerald-700">
                          {s.suggestedOrderQty > 0 ? (
                            s.baseUnit === 'GRAM'
                              ? `${(s.suggestedOrderQty / 1000).toFixed(1)} kg`
                              : `+${s.suggestedOrderQty} pcs`
                          ) : (
                            <span className="text-slate-400 font-normal">Sufficient</span>
                          )}
                        </td>

                        <td className="px-4 py-3.5">
                          {linkedSup ? (
                            <div className="font-semibold text-slate-800 truncate max-w-[140px]">
                              {linkedSup.name}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">No supplier linked</span>
                          )}
                        </td>

                        <td className="px-4 py-3.5 text-center">
                          {linkedSup ? (
                            <button
                              type="button"
                              onClick={() => openReplenishmentModal(linkedSup, s.productId)}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-2xs transition active:scale-95 flex items-center gap-1 mx-auto"
                            >
                              <ShoppingCart className="w-3.5 h-3.5" />
                              <span>Auto-Fill PO</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                if (suppliers.length > 0) openReplenishmentModal(suppliers[0], s.productId);
                                else openAddSupplier();
                              }}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px]"
                            >
                              Order via Vendor
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: SUPPLIER DIRECTORY */}
      {activeSubView === 'SUPPLIERS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {suppliers.length === 0 ? (
            <div className="col-span-2 bg-white rounded-2xl p-8 border border-slate-200 text-center space-y-3">
              <Truck className="w-10 h-10 text-slate-400 mx-auto" />
              <h4 className="font-bold text-slate-800 text-sm">No Suppliers Added Yet</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Add your wholesale grocery, poultry feeds, or beverage vendors to generate 1-click replenishment purchase orders.
              </p>
              <button
                type="button"
                onClick={openAddSupplier}
                className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Add Your First Supplier</span>
              </button>
            </div>
          ) : (
            suppliers.map(s => {
              const linkedProducts = products.filter(
                p => s.productIds.includes(p.id) || p.supplierId === s.id
              );
              const lowStockCount = linkedProducts.filter(
                p => p.stockBaseUnits <= p.lowStockThreshold
              ).length;

              return (
                <div
                  key={s.id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex flex-col justify-between hover:border-slate-300 transition space-y-4"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-extrabold text-sm text-slate-900">{s.name}</h4>
                        <div className="text-xs text-slate-500">
                          Attn: <strong className="text-slate-700">{s.contactPerson}</strong>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditSupplier(s)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                          title="Edit supplier details"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Contact Badges */}
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <a
                        href={`tel:${s.phone}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
                      >
                        <Phone className="w-3 h-3 text-emerald-600" />
                        <span>{s.phone}</span>
                      </a>

                      {s.viber && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 font-semibold border border-purple-200">
                          <MessageSquare className="w-3 h-3 text-purple-600" />
                          <span>Viber: {s.viber}</span>
                        </span>
                      )}

                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 text-slate-600">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>Lead Time: {s.leadTimeDays}d</span>
                      </span>

                      {s.paymentTerms && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 text-slate-600">
                          <DollarSign className="w-3 h-3 text-slate-400" />
                          <span>{s.paymentTerms}</span>
                        </span>
                      )}
                    </div>

                    {/* Address & Notes */}
                    {s.address && (
                      <p className="text-[11px] text-slate-500 italic truncate">{s.address}</p>
                    )}

                    {/* Linked Products Summary */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-500">
                        Supplies <strong className="text-slate-800">{linkedProducts.length} items</strong>
                      </span>
                      {lowStockCount > 0 ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-300">
                          {lowStockCount} items need reorder!
                        </span>
                      ) : (
                        <span className="text-emerald-600 font-semibold text-[11px]">All items stocked</span>
                      )}
                    </div>
                  </div>

                  {/* Replenishment Button */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => openReplenishmentModal(s)}
                      className="w-full px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-2xs transition active:scale-95 flex items-center justify-center gap-2"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      <span>Create Replenishment Order</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* MODAL: Replenishment Purchase Order Form */}
      {showPOModal && selectedSupplierForPO && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="font-extrabold text-base">
                    Replenishment Order: {selectedSupplierForPO.name}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Attn: {selectedSupplierForPO.contactPerson} · Lead Time: {selectedSupplierForPO.leadTimeDays} day(s)
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowPOModal(false)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                Close
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              {/* Order Items Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                    Order Items &amp; Quantities
                  </span>
                  <span className="text-slate-500 text-[11px]">
                    Auto-suggested based on sales velocity
                  </span>
                </div>

                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                  {poItems.length === 0 ? (
                    <div className="p-6 text-center text-slate-400 italic">
                      No items currently selected. Use the dropdown below to add products.
                    </div>
                  ) : (
                    poItems.map(item => (
                      <div key={item.productId} className="p-3 bg-white flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-slate-900 text-xs truncate">
                            {item.productName}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Current Stock:{' '}
                            {item.baseUnit === 'GRAM' ? `${item.currentStock / 1000}kg` : `${item.currentStock} pcs`}{' '}
                            · Unit Cost: {formatCentavos(item.costPerBaseCentavos)}
                          </div>
                        </div>

                        {/* Order Quantity Input */}
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="0"
                              step={item.baseUnit === 'GRAM' ? '1000' : '1'}
                              value={item.orderQty}
                              onChange={e => handlePOItemQtyChange(item.productId, Number(e.target.value))}
                              className="w-20 px-2 py-1 border border-slate-300 rounded-lg text-center font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                            />
                            <span className="text-[11px] text-slate-500">
                              {item.baseUnit === 'GRAM' ? 'grams' : 'pcs'}
                            </span>
                          </div>

                          <div className="font-black text-emerald-700 w-20 text-right">
                            {formatCentavos(item.totalCostCentavos)}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemovePOItem(item.productId)}
                            className="p-1 rounded-md text-slate-400 hover:text-rose-600 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Add More Items to this PO */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2">
                <span className="text-slate-600 font-semibold text-xs">Add more items to order:</span>
                <select
                  onChange={e => {
                    if (e.target.value) {
                      handleAddProductToPO(e.target.value);
                      e.target.value = '';
                    }
                  }}
                  className="w-full sm:w-auto px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium"
                >
                  <option value="">-- Select Product to Add --</option>
                  {products
                    .filter(p => !poItems.some(it => it.productId === p.id))
                    .map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.category})
                      </option>
                    ))}
                </select>
              </div>

              {/* Order Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Order Remarks / Instructions</label>
                <input
                  type="text"
                  value={poNotes}
                  onChange={e => setPoNotes(e.target.value)}
                  placeholder="e.g. Deliver before 10 AM, include receipt with TIN"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Total Estimated Cost Banner */}
              <div className="p-3.5 bg-slate-900 text-white rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
                    Total Estimated Order Cost
                  </span>
                  <div className="text-xl font-black text-emerald-400">
                    {formatCentavos(totalPOCostCentavos)}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyPO}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-1.5 border border-slate-700 transition"
                  >
                    <Copy className="w-3.5 h-3.5 text-purple-400" />
                    <span>{copiedSuccess ? 'Copied to Clipboard!' : 'Copy for Viber / SMS'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePrintPOThermal}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                    title="Print PO to thermal printer"
                  >
                    <Printer className="w-4 h-4 text-emerald-400" />
                  </button>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPOModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSavePO}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition active:scale-95"
                >
                  Save &amp; Confirm PO
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Add / Edit Supplier */}
      {showSupplierModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-emerald-400" />
                <h3 className="font-extrabold text-base">
                  {editingSupplier ? 'Edit Vendor Details' : 'Add New Vendor / Supplier'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSupplierModal(false)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleSaveSupplier} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Vendor / Company Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Puregold Price Club Antipolo"
                  value={supplierForm.name}
                  onChange={e => setSupplierForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Contact Person</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Kuya Jun"
                    value={supplierForm.contactPerson}
                    onChange={e => setSupplierForm(prev => ({ ...prev, contactPerson: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 0917-888-1234"
                    value={supplierForm.phone}
                    onChange={e => setSupplierForm(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Viber / Messaging</label>
                  <input
                    type="text"
                    placeholder="e.g. 0917-888-1234"
                    value={supplierForm.viber}
                    onChange={e => setSupplierForm(prev => ({ ...prev, viber: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Delivery Lead Time (Days)</label>
                  <input
                    type="number"
                    min="1"
                    max="14"
                    value={supplierForm.leadTimeDays}
                    onChange={e => setSupplierForm(prev => ({ ...prev, leadTimeDays: Math.max(1, Number(e.target.value)) }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Payment Terms</label>
                <select
                  value={supplierForm.paymentTerms}
                  onChange={e => setSupplierForm(prev => ({ ...prev, paymentTerms: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="Cash on Delivery (COD)">Cash on Delivery (COD)</option>
                  <option value="7 Days Net">7 Days Net</option>
                  <option value="15 Days Net">15 Days Net</option>
                  <option value="30 Days Net">30 Days Net</option>
                  <option value="Consignment">Consignment</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Store Address / Warehouse Location</label>
                <input
                  type="text"
                  placeholder="e.g. Circumferential Rd, Antipolo City"
                  value={supplierForm.address}
                  onChange={e => setSupplierForm(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Special Notes / Order Cutoff</label>
                <input
                  type="text"
                  placeholder="e.g. Free delivery for ₱5,000+ orders. Cutoff 2:00 PM."
                  value={supplierForm.notes}
                  onChange={e => setSupplierForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowSupplierModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition active:scale-95"
                >
                  {editingSupplier ? 'Update Vendor' : 'Save Vendor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
