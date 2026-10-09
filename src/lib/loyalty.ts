/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LoyaltyCustomer, LoyaltyConfig } from '../types';
import { db, DEFAULT_LOYALTY_CONFIG } from './db';
import { centavosToPesos } from './pricing';

const LOYALTY_CONFIG_KEY = 'tingipos_loyalty_config';

/**
 * Normalizes phone numbers (removes spaces, hyphens, prefixes like +63)
 * e.g. "+63 917-123-4567" -> "09171234567"
 */
export function normalizePhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('63') && digits.length === 12) {
    return '0' + digits.substring(2);
  }
  return digits;
}

export function formatPhoneNumber(phone: string): string {
  const clean = normalizePhoneNumber(phone);
  if (clean.length === 11 && clean.startsWith('09')) {
    return `${clean.substring(0, 4)}-${clean.substring(4, 7)}-${clean.substring(7)}`;
  }
  return phone;
}

export function getLoyaltyConfig(): LoyaltyConfig {
  try {
    const raw = localStorage.getItem(LOYALTY_CONFIG_KEY);
    if (raw) return { ...DEFAULT_LOYALTY_CONFIG, ...JSON.parse(raw) };
  } catch {
    // fallback
  }
  return DEFAULT_LOYALTY_CONFIG;
}

export function saveLoyaltyConfig(config: LoyaltyConfig): void {
  try {
    localStorage.setItem(LOYALTY_CONFIG_KEY, JSON.stringify(config));
  } catch {
    // ignore
  }
}

/**
 * Calculates points earned on a purchase given total centavos paid
 * e.g. ₱240 spent at ₱50/point = 4 points earned
 */
export function calculatePointsEarned(totalCentavos: number, config: LoyaltyConfig = getLoyaltyConfig()): number {
  const totalPesos = centavosToPesos(totalCentavos);
  if (totalPesos <= 0 || config.pesosPerPoint <= 0) return 0;
  return Math.floor(totalPesos / config.pesosPerPoint);
}

/**
 * Converts points to discount centavos (e.g. 10 points = 1000 centavos = ₱10.00)
 */
export function calculatePointsDiscount(points: number, config: LoyaltyConfig = getLoyaltyConfig()): number {
  return Math.max(0, points * config.centavosValuePerPoint);
}

/**
 * Search customer by phone number or name in local IndexedDB
 */
export async function findCustomerByPhone(phone: string): Promise<LoyaltyCustomer | undefined> {
  const clean = normalizePhoneNumber(phone);
  if (!clean) return undefined;

  // Direct match or partial match
  const all = await db.customers.toArray();
  return all.find(c => normalizePhoneNumber(c.phone) === clean);
}

export async function searchCustomers(query: string): Promise<LoyaltyCustomer[]> {
  const cleanQuery = query.trim().toLowerCase();
  const digitsQuery = query.replace(/\D/g, '');
  const all = await db.customers.toArray();

  if (!cleanQuery) return all;

  return all.filter(c => {
    const nameMatch = c.name.toLowerCase().includes(cleanQuery);
    const phoneMatch = digitsQuery && normalizePhoneNumber(c.phone).includes(digitsQuery);
    return nameMatch || phoneMatch;
  });
}

/**
 * Creates or updates a Suki customer profile
 */
export async function saveCustomer(customer: Partial<LoyaltyCustomer> & { phone: string; name: string }): Promise<LoyaltyCustomer> {
  const cleanPhone = normalizePhoneNumber(customer.phone);
  const existing = await findCustomerByPhone(cleanPhone);

  if (existing) {
    const updated: LoyaltyCustomer = {
      ...existing,
      name: customer.name.trim() || existing.name,
      notes: customer.notes !== undefined ? customer.notes : existing.notes,
      pointsBalance: customer.pointsBalance !== undefined ? customer.pointsBalance : existing.pointsBalance,
    };
    await db.customers.put(updated);
    return updated;
  }

  const newCust: LoyaltyCustomer = {
    id: `cust-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    phone: cleanPhone,
    name: customer.name.trim(),
    pointsBalance: customer.pointsBalance || 0,
    totalSpentCentavos: 0,
    totalVisits: 0,
    createdAt: new Date().toISOString(),
    notes: customer.notes || '',
  };
  await db.customers.add(newCust);
  return newCust;
}

/**
 * Updates customer stats after completing a sale
 */
export async function recordCustomerSale(params: {
  customerId?: string;
  customerPhone?: string;
  customerName?: string;
  totalCentavos: number;
  pointsEarned: number;
  pointsRedeemed: number;
}): Promise<LoyaltyCustomer | undefined> {
  let customer: LoyaltyCustomer | undefined;

  if (params.customerId) {
    customer = await db.customers.get(params.customerId);
  } else if (params.customerPhone) {
    customer = await findCustomerByPhone(params.customerPhone);
  }

  // Auto-register if phone provided but not yet registered
  if (!customer && params.customerPhone && params.customerName) {
    customer = await saveCustomer({
      phone: params.customerPhone,
      name: params.customerName,
    });
  }

  if (!customer) return undefined;

  const newPointsBalance = Math.max(
    0,
    customer.pointsBalance - params.pointsRedeemed + params.pointsEarned
  );

  const updated: LoyaltyCustomer = {
    ...customer,
    pointsBalance: newPointsBalance,
    totalSpentCentavos: customer.totalSpentCentavos + params.totalCentavos,
    totalVisits: customer.totalVisits + 1,
    lastVisitAt: new Date().toISOString(),
  };

  await db.customers.put(updated);
  return updated;
}
