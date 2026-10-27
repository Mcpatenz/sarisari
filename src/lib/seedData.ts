/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LocalProduct, Supplier, LocalSale, CashierShift } from '../types';

export const SEED_SUPPLIERS: Supplier[] = [
  {
    id: 'supp-puregold',
    name: 'Puregold Price Club Antipolo',
    contactPerson: 'Arnel Mendoza (Wholesale Desk)',
    phone: '0917-888-1234',
    viber: '0917-888-1234',
    email: 'wholesale.antipolo@puregold.com.ph',
    address: 'Circumferential Rd, Brgy. San Roque, Antipolo City',
    paymentTerms: 'Cash on Delivery (COD)',
    leadTimeDays: 1,
    notes: 'Free store drop-off for orders ₱5,000+. Cut-off 2:00 PM for next-morning delivery.',
    productIds: [
      'prod-white-sugar',
      'prod-cooking-oil',
      'prod-pancit-canton',
      'prod-kopiko-black',
      'prod-mega-sardines',
      'prod-maxx',
      'prod-xo',
    ],
    active: true,
    createdAt: new Date(Date.now() - 60 * 86400000).toISOString(),
  },
  {
    id: 'supp-sanmiguel',
    name: 'San Miguel & B-Meg Feeds Trading',
    contactPerson: 'Kuya Jun Bautista',
    phone: '0920-999-5678',
    viber: '0920-999-5678',
    email: 'jun.bmegfeeds@gmail.com',
    address: 'Marcos Highway, Cogeo, Antipolo City',
    paymentTerms: '7 Days Net',
    leadTimeDays: 2,
    notes: 'Delivers sacks of B-Meg feeds and Nueva Ecija Sinandomeng/Dinorado rice every Tuesday and Friday.',
    productIds: ['prod-feeds-bmeg', 'prod-rice-sinandomeng', 'prod-rice-dinorado'],
    active: true,
    createdAt: new Date(Date.now() - 45 * 86400000).toISOString(),
  },
  {
    id: 'supp-pmftc',
    name: 'PMFTC Tobacco Direct Distributor',
    contactPerson: 'Ms. Cynthia Reyes',
    phone: '0918-777-9012',
    viber: '0918-777-9012',
    email: 'pmftc.distributor.rizal@gmail.com',
    address: 'Ortigas Ave Ext, Cainta, Rizal',
    paymentTerms: 'Cash on Delivery (COD)',
    leadTimeDays: 1,
    notes: 'Weekly rolling van visits sari-sari stores every Wednesday morning.',
    productIds: ['prod-marlboro', 'prod-winston'],
    active: true,
    createdAt: new Date(Date.now() - 50 * 86400000).toISOString(),
  },
  {
    id: 'supp-coke-unilever',
    name: 'Alfonso Beverages & Grocery Distro',
    contactPerson: 'Kuya Romy Alfonso',
    phone: '0998-111-2233',
    viber: '0998-111-2233',
    email: 'alfonso.distro@yahoo.com',
    address: 'M.L. Quezon St, Antipolo City',
    paymentTerms: '15 Days Net',
    leadTimeDays: 2,
    notes: 'Coca-Cola bottler agent & Unilever personal care sachets (Sunsilk, Safeguard).',
    productIds: ['prod-coke-mismo', 'prod-sunsilk-pink'],
    active: true,
    createdAt: new Date(Date.now() - 40 * 86400000).toISOString(),
  },
];

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
    supplierId: 'supp-pmftc',
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
    supplierId: 'supp-pmftc',
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
    supplierId: 'supp-puregold',
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
    supplierId: 'supp-puregold',
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
    supplierId: 'supp-sanmiguel',
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
    supplierId: 'supp-sanmiguel',
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
    supplierId: 'supp-sanmiguel',
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
    supplierId: 'supp-puregold',
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
    supplierId: 'supp-puregold',
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
    supplierId: 'supp-puregold',
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
    supplierId: 'supp-coke-unilever',
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
    supplierId: 'supp-coke-unilever',
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
    supplierId: 'supp-puregold',
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
      { id: 'rule-sugar-1kg', name: 'Per Kilogram', quantityBase: 1000, priceCentavos: 8800 }, // ₱88.00 / kg
      { id: 'rule-sugar-500g', name: '1/2 Kilogram', quantityBase: 500, priceCentavos: 4500 }, // ₱45.00
      { id: 'rule-sugar-250g', name: '1/4 Kilogram', quantityBase: 250, priceCentavos: 2300 }, // ₱23.00
    ],
    unitConversions: [
      { id: 'conv-sugar-sack', name: 'Sack (50 kg)', baseUnitsPerUnit: 50000 },
    ],
    supplierId: 'supp-puregold',
    active: true,
    version: 1,
    updatedAt: new Date().toISOString(),
  },
];

export const SEED_SHIFTS: CashierShift[] = [
  {
    id: 'shift-prev-001',
    cashierId: 'cashier-alona',
    cashierName: 'Ate Alona (Morning Shift)',
    deviceId: 'dev-counter-phone',
    deviceName: 'Counter 1 (Android Phone)',
    status: 'CLOSED',
    openedAt: new Date(Date.now() - 36 * 3600000).toISOString(),
    closedAt: new Date(Date.now() - 24 * 3600000).toISOString(),
    openingFloatCentavos: 100000, // ₱1,000.00
    cashSalesCentavos: 425000, // ₱4,250.00
    gcashSalesCentavos: 110000, // ₱1,100.00
    utangSalesCentavos: 35000, // ₱350.00
    totalSalesCentavos: 570000, // ₱5,700.00
    transactionCount: 28,
    cashExpensesCentavos: 15000, // ₱150.00 ice & plastic
    expectedCashCentavos: 510000, // ₱1,000 + ₱4,250 - ₱150 = ₱5,100.00
    countedCashCentavos: 512000, // ₱5,120.00 counted
    discrepancyCentavos: 2000, // +₱20.00 sobra
    denominations: {
      p1000: 3,
      p500: 2,
      p200: 3,
      p100: 4,
      p50: 1,
      p20: 3,
      p10: 1,
      p5: 0,
      p1: 0,
      p025: 0,
    },
    notes: 'Smooth morning shift. Sobra ₱20 from customer tip / rounded coins.',
  },
];

/**
 * Generates realistic seed sales across recent days and peak hours
 * (Morning 7-9am, Lunch 12-1pm, Merienda 3-5pm, Evening 7-9pm)
 */
export function generateSeedSales(): LocalSale[] {
  const sales: LocalSale[] = [];
  const now = Date.now();

  const salePresets = [
    {
      items: [
        { productId: 'prod-kopiko-black', name: 'Kopiko Black 3-in-1 Coffee', qty: 3, price: 4000, cost: 3300, display: '3 sachets (Bundle)' },
        { productId: 'prod-pancit-canton', name: 'Lucky Me! Pancit Canton Kalamansi', qty: 2, price: 3200, cost: 2700, display: '2 packs' },
      ],
      payment: 'CASH' as const,
      cashier: 'Ate Alona',
      customerName: 'Ate Lorna Santos',
      customerPhone: '09185550192',
    },
    {
      items: [
        { productId: 'prod-rice-sinandomeng', name: 'Well-Milled Rice (Sinandomeng)', qty: 2000, price: 12000, cost: 9600, display: '2 Kilograms' },
        { productId: 'prod-cooking-oil', name: 'Golden Fiesta Cooking Oil (Tingi)', qty: 500, price: 4500, cost: 3250, display: '1/2 Liter' },
      ],
      payment: 'CASH' as const,
      cashier: 'Nena (Owner)',
      customerName: 'Dennis Magno',
      customerPhone: '09085558329',
    },
    {
      items: [
        { productId: 'prod-coke-mismo', name: 'Coca-Cola Mismo 290ml (Chilled)', qty: 2, price: 4000, cost: 3100, display: '2 bottles' },
        { productId: 'prod-maxx', name: 'Maxx Menthol Candy', qty: 4, price: 1000, cost: 640, display: '4 candies' },
      ],
      payment: 'GCASH' as const,
      cashier: 'Ate Alona',
      customerName: 'Tatay Berto Ramos',
      customerPhone: '09225554811',
    },
    {
      items: [
        { productId: 'prod-marlboro', name: 'Marlboro Red (Cigarettes)', qty: 3, price: 1000, cost: 750, display: '3 sticks (Bundle)' },
        { productId: 'prod-kopiko-black', name: 'Kopiko Black 3-in-1 Coffee', qty: 1, price: 1400, cost: 1100, display: '1 sachet' },
      ],
      payment: 'CASH' as const,
      cashier: 'Nena (Owner)',
    },
    {
      items: [
        { productId: 'prod-white-sugar', name: 'Refined White Sugar (Asukal Puti)', qty: 1000, price: 8800, cost: 8000, display: '1 Kilogram' },
        { productId: 'prod-mega-sardines', name: 'Mega Sardines Red Tomato 155g', qty: 2, price: 5200, cost: 4300, display: '2 cans' },
      ],
      payment: 'UTANG' as const,
      cashier: 'Nena (Owner)',
      customerName: 'Tatay Berto Ramos',
      customerPhone: '09225554811',
    },
    {
      items: [
        { productId: 'prod-feeds-bmeg', name: 'B-Meg Hog Grower Feeds', qty: 5000, price: 17500, cost: 14000, display: '5 Kilograms' },
      ],
      payment: 'CASH' as const,
      cashier: 'Nena (Owner)',
      customerName: 'Tatay Berto Ramos',
      customerPhone: '09225554811',
    },
    {
      items: [
        { productId: 'prod-sunsilk-pink', name: 'Sunsilk Smooth & Manageable Pink Sachet', qty: 3, price: 2200, cost: 1860, display: '3 sachets' },
        { productId: 'prod-pancit-canton', name: 'Lucky Me! Pancit Canton Kalamansi', qty: 3, price: 4600, cost: 4050, display: '3 packs promo' },
      ],
      payment: 'GCASH' as const,
      cashier: 'Ate Alona',
      customerName: 'Ate Lorna Santos',
      customerPhone: '09185550192',
    },
  ];

  // Distribute over last 6 days with peak hours: 7am, 8am, 12pm, 1pm, 4pm, 5pm, 8pm
  const peakHours = [7, 8, 8, 12, 13, 16, 17, 17, 19, 20];
  let receiptCounter = 1001;

  for (let dayOffset = 5; dayOffset >= 0; dayOffset--) {
    const dayDate = new Date(now - dayOffset * 86400000);
    
    // Pick 4 to 7 sales per day
    const salesCountForDay = 5 + (dayOffset % 3);
    for (let i = 0; i < salesCountForDay; i++) {
      const preset = salePresets[(dayOffset * 3 + i) % salePresets.length];
      const hour = peakHours[(i * 2 + dayOffset) % peakHours.length];
      const minute = (i * 17) % 60;
      
      const saleDate = new Date(dayDate);
      saleDate.setHours(hour, minute, 15, 0);

      const itemsTotal = preset.items.reduce((acc, it) => acc + it.price, 0);
      const itemsCost = preset.items.reduce((acc, it) => acc + it.cost, 0);
      const saleId = `sale-seed-${dayOffset}-${i}`;

      sales.push({
        id: saleId,
        storeId: 'store-main',
        deviceId: 'dev-counter-phone',
        deviceName: 'Counter 1 (Android Phone)',
        cashierId: 'cashier-main',
        cashierName: preset.cashier,
        receiptNumber: `TNG-${receiptCounter++}`,
        status: 'COMPLETED',
        subtotalCentavos: itemsTotal,
        discountCentavos: 0,
        totalCentavos: itemsTotal,
        totalCostCentavos: itemsCost,
        cashReceivedCentavos: preset.payment === 'CASH' ? itemsTotal + 5000 : itemsTotal,
        changeAmountCentavos: preset.payment === 'CASH' ? 5000 : 0,
        paymentMethod: preset.payment,
        customerName: preset.customerName,
        customerPhone: preset.customerPhone,
        createdAt: saleDate.toISOString(),
        shiftId: dayOffset > 1 ? 'shift-prev-001' : undefined,
        syncStatus: 'SYNCED',
        items: preset.items.map((it, idx) => ({
          id: `${saleId}-item-${idx}`,
          saleId: saleId,
          productId: it.productId,
          productName: it.name,
          quantityBase: it.qty,
          unitPriceCentavos: it.price,
          lineTotalCentavos: it.price,
          costTotalCentavos: it.cost,
          displayQuantity: it.display,
        })),
      });
    }
  }

  return sales;
}
