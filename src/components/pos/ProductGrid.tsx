/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Search, ScanBarcode, X, Layers, Filter, Camera } from 'lucide-react';
import { LocalProduct } from '../../types';
import { ProductCard } from './ProductCard';
import { TingiDialog } from './TingiDialog';
import { CameraBarcodeScanner } from '../scanner/CameraBarcodeScanner';
import { useStore } from '../../context/StoreContext';

export const ProductGrid: React.FC = () => {
  const { products, addToCart } = useStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [activeModalProduct, setActiveModalProduct] = useState<LocalProduct | null>(null);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [showBarcodeSim, setShowBarcodeSim] = useState(false);
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);

  // Extract distinct categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach(p => set.add(p.category));
    return ['ALL', ...Array.from(set)];
  }, [products]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      if (!p.active) return false;
      const matchesCat = selectedCategory === 'ALL' || p.category === selectedCategory;
      const query = searchQuery.trim().toLowerCase();
      if (!query) return matchesCat;

      const matchesSearch =
        p.name.toLowerCase().includes(query) ||
        p.sku.toLowerCase().includes(query) ||
        (p.barcode && p.barcode.toLowerCase().includes(query)) ||
        p.category.toLowerCase().includes(query);

      return matchesCat && matchesSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  // Handle Quick Add
  const handleQuickAdd = (product: LocalProduct) => {
    if (product.baseUnit === 'GRAM') {
      addToCart(product, 1000); // 1kg
    } else {
      addToCart(product, 1); // 1 piece
    }
  };

  // Simulate Barcode Scanner input
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    const matched = products.find(
      p =>
        p.barcode === barcodeInput.trim() ||
        p.sku.toLowerCase() === barcodeInput.trim().toLowerCase()
    );

    if (matched) {
      handleQuickAdd(matched);
      setBarcodeInput('');
      setShowBarcodeSim(false);
    } else {
      alert(`No product found with barcode or SKU "${barcodeInput}"`);
    }
  };

  return (
    <div className="flex-1 flex flex-col space-y-3 min-w-0">
      {/* Search & Barcode Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        {/* Search input with camera quick scan button */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search bigas, yosi, kape, kendi, sabon, or barcode..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-16 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 shadow-2xs"
          />
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsCameraScannerOpen(true)}
              className="p-1.5 rounded-lg text-emerald-700 hover:bg-emerald-50 transition"
              title="Open camera to scan barcode"
            >
              <Camera className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Camera Scanner button */}
        <button
          type="button"
          onClick={() => setIsCameraScannerOpen(true)}
          className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition active:scale-95"
          title="Open camera barcode scanner"
        >
          <Camera className="w-4 h-4" />
          <span>Scan Barcode</span>
        </button>

        {/* Barcode manual simulator toggle button */}
        <button
          type="button"
          onClick={() => setShowBarcodeSim(!showBarcodeSim)}
          className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border text-xs font-bold transition ${
            showBarcodeSim
              ? 'bg-slate-900 text-white border-slate-900'
              : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
          }`}
          title="Type barcode number or select quick sample"
        >
          <ScanBarcode className="w-4 h-4" />
          <span className="hidden sm:inline">Keypad / Sim</span>
        </button>
      </div>

      {/* Barcode Simulator Drawer if active */}
      {showBarcodeSim && (
        <form
          onSubmit={handleBarcodeSubmit}
          className="p-3 bg-emerald-950/80 rounded-xl text-white border border-emerald-800 flex flex-wrap items-center gap-2 text-xs"
        >
          <div className="flex items-center gap-1.5 font-bold text-emerald-300">
            <ScanBarcode className="w-4 h-4" />
            <span>Barcode Simulator:</span>
          </div>
          <input
            type="text"
            placeholder="Type or click sample barcode..."
            value={barcodeInput}
            onChange={e => setBarcodeInput(e.target.value)}
            className="flex-1 min-w-[180px] px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:ring-2 focus:ring-emerald-400 focus:outline-hidden"
            autoFocus
          />
          <button
            type="submit"
            className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold transition"
          >
            Scan &amp; Add
          </button>

          {/* Quick sample barcode clicks */}
          <div className="w-full flex flex-wrap items-center gap-1.5 pt-1 text-[11px] text-emerald-200">
            <span>Quick Samples:</span>
            {[
              { label: 'Marlboro', code: '480001600101' },
              { label: 'Sinandomeng Rice', code: '480003000101' },
              { label: 'Maxx Candy', code: '480002500101' },
              { label: 'Coke Mismo', code: '480008000101' },
              { label: 'Kopiko Black', code: '480005000101' },
            ].map(sample => (
              <button
                key={sample.code}
                type="button"
                onClick={() => setBarcodeInput(sample.code)}
                className="px-2 py-0.5 rounded bg-emerald-900/60 hover:bg-emerald-800 text-emerald-300 font-mono border border-emerald-700/60"
              >
                {sample.label}
              </button>
            ))}
          </div>
        </form>
      )}

      {/* Category Filter Horizontal Scroll */}
      <div className="overflow-x-auto scrollbar-none pb-1">
        <div className="flex items-center gap-1.5 min-w-max">
          {categories.map(cat => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  isSelected
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                {cat === 'ALL' ? '🌟 All Products' : cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-slate-200 text-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-800 text-sm">Walang nahanap na paninda</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-xs">
            No products match &quot;{searchQuery}&quot; in category &quot;{selectedCategory}&quot;. Try adjusting your search.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-3.5">
          {filteredProducts.map(product => (
            <ProductCard
              key={product.id}
              product={product}
              onQuickAdd={handleQuickAdd}
              onOpenTingiModal={prod => setActiveModalProduct(prod)}
            />
          ))}
        </div>
      )}

      {/* Tingi & Quantity Dialog */}
      <TingiDialog
        product={activeModalProduct}
        isOpen={!!activeModalProduct}
        onClose={() => setActiveModalProduct(null)}
        onAddToCart={addToCart}
      />

      {/* Camera Barcode Scanner Viewport Modal */}
      <CameraBarcodeScanner
        isOpen={isCameraScannerOpen}
        onClose={() => setIsCameraScannerOpen(false)}
        onProductFound={prod => handleQuickAdd(prod)}
      />
    </div>
  );
};
