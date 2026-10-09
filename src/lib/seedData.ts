/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LocalProduct } from '../types';

export const SEED_PRODUCTS: LocalProduct[] = [
  {
    id: 'prod-marlboro',
    sku: 'YOSI-001',
    barcode: '480001600101',
    name: 'Marlboro Red (Cigarettes)',
    category: 'Tingi & Yosi',
    baseUnit: 'PIECE',
    stockBaseUnits: 200, // 200 sticks in stock
    costPerBaseCentavos: 250, // ₱2.50 per stick cost
    lowStockThreshold: 30,
    priceRules: [
      { id: 'rule-marl-1', name: 'Single Stick', quantityBase: 1, priceCentavos: 400 }, // ₱4.00
      { id: 'rule-marl-3', name: '3 Sticks Bundle', quantityBase: 3, priceCentavos: 1000, isBundle: true }, // 3 for ₱10.00
    ],
    unitConversions: [
      { id: 'conv-marl-pack', name: 'Pack (20 sticks)', baseUnitsPerUnit: 20, barcode: '480001600120' },
    ],
    active: true,
    version: 1,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-winston',
    sku: 'YOSI-002',
    barcode: '480001600201',
    name: 'Winston Lights (Cigarettes)',
    category: 'Tingi & Yosi',
    baseUnit: 'PIECE',
    stockBaseUnits: 150,
    costPerBaseCentavos: 250,
    lowStockThreshold: 25,
    priceRules: [
      { id: 'rule-win-1', name: 'Single Stick', quantityBase: 1, priceCentavos: 400 },
      { id: 'rule-win-3', name: '3 Sticks Bundle', quantityBase: 3, priceCentavos: 1000, isBundle: true },
    ],
    unitConversions: [
      { id: 'conv-win-pack', name: 'Pack (20 sticks)', baseUnitsPerUnit: 20 },
    ],
    active: true,
    version: 1,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-maxx',
    sku: 'KENDI-001',
    barcode: '480002500101',
    name: 'Maxx Menthol Candy',
    category: 'Kendi & Snacks',
    baseUnit: 'PIECE',
    stockBaseUnits: 180,
    costPerBaseCentavos: 160, // ₱1.60 cost
    lowStockThreshold: 30,
    priceRules: [
      { id: 'rule-maxx-1', name: 'Single Candy', quantityBase: 1, priceCentavos: 300 }, // ₱3.00
      { id: 'rule-maxx-2', name: '2 for ₱5 Bundle', quantityBase: 2, priceCentavos: 500, isBundle: true }, // 2 for ₱5.00
    ],
    unitConversions: [
      { id: 'conv-maxx-pack', name: 'Pack (50 pcs)', baseUnitsPerUnit: 50 },
    ],
    active: true,
    version: 1,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-xo',
    sku: 'KENDI-002',
    barcode: '480002500201',
    name: 'XO Coffee Candy',
    category: 'Kendi & Snacks',
    baseUnit: 'PIECE',
    stockBaseUnits: 140,
    costPerBaseCentavos: 160,
    lowStockThreshold: 25,
    priceRules: [
      { id: 'rule-xo-1', name: 'Single Candy', quantityBase: 1, priceCentavos: 300 },
      { id: 'rule-xo-2', name: '2 for ₱5 Bundle', quantityBase: 2, priceCentavos: 500, isBundle: true },
    ],
    unitConversions: [
      { id: 'conv-xo-pack', name: 'Pack (50 pcs)', baseUnitsPerUnit: 50 },
    ],
    active: true,
    version: 1,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-rice-sinandomeng',
    sku: 'BIGAS-001',
    barcode: '480003000101',
    name: 'Well-Milled Rice (Sinandomeng)',
    category: 'Bigas & Feeds',
    baseUnit: 'GRAM',
    stockBaseUnits: 45000, // 45 kg = 45,000 grams
    costPerBaseCentavos: 4.8, // ₱48/kg cost = 4.8 centavos/g
    lowStockThreshold: 5000, // 5kg alert
    priceRules: [
      { id: 'rule-rice-1kg', name: 'Per Kilogram', quantityBase: 1000, priceCentavos: 6000 }, // ₱60.00 / kg
      { id: 'rule-rice-500g', name: '1/2 Kilogram', quantityBase: 500, priceCentavos: 3000 }, // ₱30.00
      { id: 'rule-rice-250g', name: '1/4 Kilogram', quantityBase: 250, priceCentavos: 1500 }, // ₱15.00
    ],
    unitConversions: [
      { id: 'conv-rice-sack', name: 'Sack (25 kg)', baseUnitsPerUnit: 25000 },
      { id: 'conv-rice-half', name: 'Kilo (1,000 g)', baseUnitsPerUnit: 1000 },
    ],
    active: true,
    version: 1,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-rice-dinorado',
    sku: 'BIGAS-002',
    barcode: '480003000201',
    name: 'Dinorado Special Fragrant Rice',
    category: 'Bigas & Feeds',
    baseUnit: 'GRAM',
    stockBaseUnits: 30000, // 30 kg
    costPerBaseCentavos: 5.4, // ₱54/kg cost
    lowStockThreshold: 5000,
    priceRules: [
      { id: 'rule-dino-1kg', name: 'Per Kilogram', quantityBase: 1000, priceCentavos: 6800 }, // ₱68.00 / kg
    ],
    unitConversions: [
      { id: 'conv-dino-sack', name: 'Sack (25 kg)', baseUnitsPerUnit: 25000 },
    ],
    active: true,
    version: 1,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-feeds-bmeg',
    sku: 'FEEDS-001',
    barcode: '480004000101',
    name: 'B-Meg Hog Grower Feeds',
    category: 'Bigas & Feeds',
    baseUnit: 'GRAM',
    stockBaseUnits: 25000, // 25 kg
    costPerBaseCentavos: 2.8, // ₱28/kg cost
    lowStockThreshold: 4000,
    priceRules: [
      { id: 'rule-bmeg-1kg', name: 'Per Kilogram', quantityBase: 1000, priceCentavos: 3500 }, // ₱35.00 / kg
    ],
    unitConversions: [
      { id: 'conv-bmeg-sack', name: 'Sack (50 kg)', baseUnitsPerUnit: 50000 },
    ],
    active: true,
    version: 1,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-kopiko-black',
    sku: 'KAPE-001',
    barcode: '480005000101',
    name: 'Kopiko Black 3-in-1 Coffee',
    category: 'Instant & Canned',
    baseUnit: 'PIECE',
    stockBaseUnits: 60,
    costPerBaseCentavos: 1100, // ₱11.00 cost
    lowStockThreshold: 12,
    priceRules: [
      { id: 'rule-kop-1', name: 'Single Sachet', quantityBase: 1, priceCentavos: 1400 }, // ₱14.00
      { id: 'rule-kop-3', name: '3 Sachets Bundle', quantityBase: 3, priceCentavos: 4000, isBundle: true }, // 3 for ₱40.00 (save ₱2)
    ],
    unitConversions: [
      { id: 'conv-kop-strip', name: 'Hanger Strip (10 pcs)', baseUnitsPerUnit: 10 },
    ],
    active: true,
    version: 1,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-pancit-canton',
    sku: 'NOODLE-001',
    barcode: '480006000101',
    name: 'Lucky Me! Pancit Canton Kalamansi',
    category: 'Instant & Canned',
    baseUnit: 'PIECE',
    stockBaseUnits: 48,
    costPerBaseCentavos: 1350, // ₱13.50 cost
    lowStockThreshold: 10,
    priceRules: [
      { id: 'rule-pc-1', name: '1 Pack', quantityBase: 1, priceCentavos: 1600 }, // ₱16.00
      { id: 'rule-pc-3', name: '3 Packs Promo', quantityBase: 3, priceCentavos: 4600, isBundle: true }, // 3 for ₱46.00
    ],
    unitConversions: [
      { id: 'conv-pc-box', name: 'Box (72 packs)', baseUnitsPerUnit: 72 },
    ],
    active: true,
    version: 1,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-mega-sardines',
    sku: 'CANNED-001',
    barcode: '480007000101',
    name: 'Mega Sardines Red Tomato 155g',
    category: 'Instant & Canned',
    baseUnit: 'PIECE',
    stockBaseUnits: 24,
    costPerBaseCentavos: 2150, // ₱21.50
    lowStockThreshold: 6,
    priceRules: [
      { id: 'rule-mega-1', name: '1 Can', quantityBase: 1, priceCentavos: 2600 }, // ₱26.00
    ],
    unitConversions: [],
    active: true,
    version: 1,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-coke-mismo',
    sku: 'DRINK-001',
    barcode: '480008000101',
    name: 'Coca-Cola Mismo 290ml (Chilled)',
    category: 'Inumin & Softdrinks',
    baseUnit: 'PIECE',
    stockBaseUnits: 36,
    costPerBaseCentavos: 1550, // ₱15.50
    lowStockThreshold: 8,
    priceRules: [
      { id: 'rule-coke-1', name: '1 Bottle', quantityBase: 1, priceCentavos: 2000 }, // ₱20.00
    ],
    unitConversions: [
      { id: 'conv-coke-case', name: 'Case (12 bottles)', baseUnitsPerUnit: 12 },
    ],
    active: true,
    version: 1,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-sunsilk-pink',
    sku: 'SABON-001',
    barcode: '480009000101',
    name: 'Sunsilk Smooth & Manageable Pink Sachet',
    category: 'Panlinis & Sabon',
    baseUnit: 'PIECE',
    stockBaseUnits: 50,
    costPerBaseCentavos: 620, // ₱6.20
    lowStockThreshold: 12,
    priceRules: [
      { id: 'rule-sun-1', name: 'Single Sachet', quantityBase: 1, priceCentavos: 800 }, // ₱8.00
      { id: 'rule-sun-3', name: '3 Sachets Bundle', quantityBase: 3, priceCentavos: 2200, isBundle: true }, // 3 for ₱22.00
    ],
    unitConversions: [
      { id: 'conv-sun-dozen', name: 'Dozen Hanger (12 pcs)', baseUnitsPerUnit: 12 },
    ],
    active: true,
    version: 1,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-cooking-oil',
    sku: 'OIL-001',
    barcode: '480010000101',
    name: 'Golden Fiesta Cooking Oil (Tingi)',
    category: 'Bigas & Feeds',
    baseUnit: 'MILLILITER',
    stockBaseUnits: 15000, // 15 Liters = 15,000 ml
    costPerBaseCentavos: 6.5, // ₱65/L cost
    lowStockThreshold: 2000,
    priceRules: [
      { id: 'rule-oil-1000', name: '1 Liter (1,000 ml)', quantityBase: 1000, priceCentavos: 8500 }, // ₱85.00
      { id: 'rule-oil-500', name: '1/2 Liter (500 ml)', quantityBase: 500, priceCentavos: 4500 }, // ₱45.00
      { id: 'rule-oil-250', name: 'Tingi Cup (250 ml)', quantityBase: 250, priceCentavos: 2500 }, // ₱25.00
    ],
    unitConversions: [
      { id: 'conv-oil-container', name: 'Bulk Container (20 L)', baseUnitsPerUnit: 20000 },
    ],
    active: true,
    version: 1,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-white-sugar',
    sku: 'ASUKAL-001',
    barcode: '480011000101',
    name: 'Refined White Sugar (Asukal Puti)',
    category: 'Bigas & Feeds',
    baseUnit: 'GRAM',
    stockBaseUnits: 20000, // 20 kg
    costPerBaseCentavos: 8.0, // ₱80.00/kg cost (8 centavos/g)
    lowStockThreshold: 4000,
    priceRules: [
      { id: 'rule-sugar-1kg', name: 'Per Kilogram', quantityBase: 1000, priceCentavos: 8800 }, // ₱88.00 / kg (9.1% profit margin - flags alert at 15%)
      { id: 'rule-sugar-500g', name: '1/2 Kilogram', quantityBase: 500, priceCentavos: 4500 }, // ₱45.00 (11.1% profit margin)
      { id: 'rule-sugar-250g', name: '1/4 Kilogram', quantityBase: 250, priceCentavos: 2300 }, // ₱23.00 (13.0% profit margin)
    ],
    unitConversions: [
      { id: 'conv-sugar-sack', name: 'Sack (50 kg)', baseUnitsPerUnit: 50000 },
    ],
    active: true,
    version: 1,
    updatedAt: new Date().toISOString(),
  },
];
