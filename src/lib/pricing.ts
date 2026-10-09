/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BaseUnit, LocalProduct, ProductPriceRule } from '../types';

/**
 * Formats integer centavos to Philippine Peso currency string
 * e.g. 1000 -> "₱10.00", 2550 -> "₱25.50"
 */
export function formatCentavos(centavos: number): string {
  const isNegative = centavos < 0;
  const abs = Math.abs(centavos);
  const pesos = Math.floor(abs / 100);
  const cents = abs % 100;
  const formatted = `₱${pesos.toLocaleString('en-PH')}.${cents.toString().padStart(2, '0')}`;
  return isNegative ? `-${formatted}` : formatted;
}

/**
 * Converts Philippine Peso float to integer centavos safely
 * e.g. 10.50 -> 1050
 */
export function pesosToCentavos(pesos: number): number {
  return Math.round(pesos * 100);
}

/**
 * Converts centavos to floating pesos
 */
export function centavosToPesos(centavos: number): number {
  return centavos / 100;
}

export interface PricingCalculationResult {
  totalCentavos: number;
  totalCostCentavos: number;
  regularCentavosWithoutBundle: number;
  savingsCentavos: number;
  ruleDescription: string;
  bundleAppliedCount: number;
  remainingSinglesCount: number;
}

/**
 * Calculates optimal pricing for a product given quantity in base units
 * Handles:
 * 1. Piece-based tingi bundle rules (e.g. 1 for ₱4, 3 for ₱10)
 * 2. Weight-based gram rules (e.g. ₱60/kg = 6 centavos/gram)
 * 3. Volume-based milliliter rules
 */
export function calculateProductPrice(
  product: LocalProduct,
  quantityBase: number
): PricingCalculationResult {
  if (quantityBase <= 0) {
    return {
      totalCentavos: 0,
      totalCostCentavos: 0,
      regularCentavosWithoutBundle: 0,
      savingsCentavos: 0,
      ruleDescription: 'None',
      bundleAppliedCount: 0,
      remainingSinglesCount: 0,
    };
  }

  const costTotal = Math.round(quantityBase * product.costPerBaseCentavos);

  // If base unit is GRAM
  if (product.baseUnit === 'GRAM') {
    // Find per-kg or per-gram rule
    const kgRule = product.priceRules.find(r => r.quantityBase === 1000) || product.priceRules[0];
    const centavosPerGram = kgRule
      ? kgRule.priceCentavos / (kgRule.quantityBase || 1000)
      : (product.costPerBaseCentavos * 1.25); // fallback markup

    const totalCentavos = Math.round(quantityBase * centavosPerGram);
    const kgFormatted = (quantityBase / 1000).toFixed(quantityBase % 1000 === 0 ? 0 : 2);
    
    return {
      totalCentavos,
      totalCostCentavos: costTotal,
      regularCentavosWithoutBundle: totalCentavos,
      savingsCentavos: 0,
      ruleDescription: `${kgFormatted}kg @ ${formatCentavos(kgRule ? kgRule.priceCentavos : 0)}/kg`,
      bundleAppliedCount: 0,
      remainingSinglesCount: 0,
    };
  }

  // If base unit is MILLILITER
  if (product.baseUnit === 'MILLILITER') {
    const literRule = product.priceRules.find(r => r.quantityBase === 1000) || product.priceRules[0];
    const centavosPerMl = literRule
      ? literRule.priceCentavos / (literRule.quantityBase || 1000)
      : (product.costPerBaseCentavos * 1.25);

    const totalCentavos = Math.round(quantityBase * centavosPerMl);
    return {
      totalCentavos,
      totalCostCentavos: costTotal,
      regularCentavosWithoutBundle: totalCentavos,
      savingsCentavos: 0,
      ruleDescription: `${quantityBase}ml @ ${formatCentavos(literRule?.priceCentavos || 0)}/L`,
      bundleAppliedCount: 0,
      remainingSinglesCount: 0,
    };
  }

  // PIECE base unit: Tingi & Bundle evaluation
  // Sort rules: bundle rules first (highest quantity base to lowest)
  const singleRule = product.priceRules.find(r => r.quantityBase === 1) || product.priceRules[0];
  const singlePrice = singleRule ? singleRule.priceCentavos : 100;
  const regularTotal = quantityBase * singlePrice;

  // Find bundle rules (quantity > 1 and isBundle or better rate than single * qty)
  const bundleRules = product.priceRules
    .filter(r => r.quantityBase > 1)
    .sort((a, b) => b.quantityBase - a.quantityBase); // greedily try largest bundles first

  if (bundleRules.length === 0) {
    return {
      totalCentavos: regularTotal,
      totalCostCentavos: costTotal,
      regularCentavosWithoutBundle: regularTotal,
      savingsCentavos: 0,
      ruleDescription: `${quantityBase}x @ ${formatCentavos(singlePrice)}`,
      bundleAppliedCount: 0,
      remainingSinglesCount: quantityBase,
    };
  }

  // Greedy bundle calculation
  let remaining = quantityBase;
  let totalCentavos = 0;
  const appliedDescriptions: string[] = [];
  let totalBundlesApplied = 0;

  for (const bundle of bundleRules) {
    if (remaining >= bundle.quantityBase) {
      const bundlesCount = Math.floor(remaining / bundle.quantityBase);
      totalCentavos += bundlesCount * bundle.priceCentavos;
      remaining = remaining % bundle.quantityBase;
      totalBundlesApplied += bundlesCount;
      appliedDescriptions.push(`${bundlesCount} bundle (${bundle.quantityBase} for ${formatCentavos(bundle.priceCentavos)})`);
    }
  }

  if (remaining > 0) {
    totalCentavos += remaining * singlePrice;
    appliedDescriptions.push(`${remaining} single @ ${formatCentavos(singlePrice)}`);
  }

  const savingsCentavos = Math.max(0, regularTotal - totalCentavos);

  return {
    totalCentavos,
    totalCostCentavos: costTotal,
    regularCentavosWithoutBundle: regularTotal,
    savingsCentavos,
    ruleDescription: appliedDescriptions.join(' + ') || `${quantityBase} pcs`,
    bundleAppliedCount: totalBundlesApplied,
    remainingSinglesCount: remaining,
  };
}

/**
 * Calculates grams from a target peso budget (e.g. "Pabili ₱20 na bigas")
 * rounds to nearest scale increment (default 5 grams)
 */
export function calculateGramsFromBudget(
  product: LocalProduct,
  budgetPesos: number,
  roundToNearestGrams: number = 5
): {
  grams: number;
  actualCentavos: number;
  formattedDescription: string;
} {
  const kgRule = product.priceRules.find(r => r.quantityBase === 1000) || product.priceRules[0];
  const pricePerKgCentavos = kgRule ? kgRule.priceCentavos : 6000; // default ₱60/kg
  const pricePerGramCentavos = pricePerKgCentavos / 1000;

  const targetCentavos = pesosToCentavos(budgetPesos);
  const rawGrams = targetCentavos / pricePerGramCentavos;

  // Round to nearest increment
  const roundedGrams = Math.max(
    roundToNearestGrams,
    Math.round(rawGrams / roundToNearestGrams) * roundToNearestGrams
  );

  const actualCentavos = Math.round(roundedGrams * pricePerGramCentavos);

  return {
    grams: roundedGrams,
    actualCentavos,
    formattedDescription: `₱${budgetPesos} budget (~${roundedGrams}g @ ${formatCentavos(pricePerKgCentavos)}/kg)`,
  };
}

/**
 * Format quantity with base unit
 */
export function formatQuantityWithUnit(quantityBase: number, unit: BaseUnit): string {
  if (unit === 'PIECE') {
    return `${quantityBase.toLocaleString()} pc${quantityBase === 1 ? '' : 's'}`;
  }
  if (unit === 'GRAM') {
    if (quantityBase >= 1000) {
      const kg = quantityBase / 1000;
      return `${kg % 1 === 0 ? kg.toFixed(0) : kg.toFixed(2)} kg (${quantityBase.toLocaleString()}g)`;
    }
    return `${quantityBase.toLocaleString()} g`;
  }
  if (unit === 'MILLILITER') {
    if (quantityBase >= 1000) {
      const l = quantityBase / 1000;
      return `${l % 1 === 0 ? l.toFixed(0) : l.toFixed(2)} L (${quantityBase.toLocaleString()}ml)`;
    }
    return `${quantityBase.toLocaleString()} ml`;
  }
  return `${quantityBase}`;
}

export const DEFAULT_PROFIT_MARGIN_THRESHOLD = 15;
export const PROFIT_MARGIN_CONFIG_KEY = 'tingipos_min_profit_margin_percent';

export interface RuleMarginInfo {
  ruleId: string;
  ruleName: string;
  quantityBase: number;
  priceCentavos: number;
  totalCostCentavos: number;
  profitCentavos: number;
  marginPercent: number; // (profit / revenue) * 100
  markupPercent: number; // (profit / cost) * 100
  isLoss: boolean;
  isBelowThreshold: boolean;
}

export interface ProductMarginAnalysis {
  productId: string;
  productName: string;
  costPerBaseCentavos: number;
  baseUnit: BaseUnit;
  rules: RuleMarginInfo[];
  primaryRule: RuleMarginInfo | null;
  lowestMarginRule: RuleMarginInfo | null;
  lowestMarginPercent: number;
  primaryMarginPercent: number;
  isFlaggedBelowThreshold: boolean;
  hasLossRule: boolean;
  thresholdPercent: number;
}

/**
 * Calculates margin and markup for a specific pricing rule
 */
export function calculateRuleMargin(
  costPerBaseCentavos: number,
  priceCentavos: number,
  quantityBase: number = 1,
  thresholdPercent: number = DEFAULT_PROFIT_MARGIN_THRESHOLD
): RuleMarginInfo {
  const totalCostCentavos = Math.round(costPerBaseCentavos * quantityBase);
  const profitCentavos = priceCentavos - totalCostCentavos;
  const isLoss = profitCentavos < 0;

  // Margin = (Price - Cost) / Price * 100
  const marginPercent =
    priceCentavos > 0
      ? Number(((profitCentavos / priceCentavos) * 100).toFixed(1))
      : isLoss
      ? -100
      : 0;

  // Markup = (Price - Cost) / Cost * 100
  const markupPercent =
    totalCostCentavos > 0
      ? Number(((profitCentavos / totalCostCentavos) * 100).toFixed(1))
      : priceCentavos > 0
      ? 100
      : 0;

  const isBelowThreshold = marginPercent < thresholdPercent;

  return {
    ruleId: '',
    ruleName: '',
    quantityBase,
    priceCentavos,
    totalCostCentavos,
    profitCentavos,
    marginPercent,
    markupPercent,
    isLoss,
    isBelowThreshold,
  };
}

/**
 * Calculates comprehensive profit margin analysis for a product across all its pricing rules
 */
export function calculateProductMargins(
  product: LocalProduct,
  thresholdPercent: number = DEFAULT_PROFIT_MARGIN_THRESHOLD
): ProductMarginAnalysis {
  const rules: RuleMarginInfo[] = (product.priceRules || []).map(r => {
    const margin = calculateRuleMargin(
      product.costPerBaseCentavos,
      r.priceCentavos,
      r.quantityBase || 1,
      thresholdPercent
    );
    return {
      ...margin,
      ruleId: r.id,
      ruleName: r.name,
    };
  });

  const primaryRule =
    rules.find(
      r =>
        r.quantityBase === 1 ||
        (product.baseUnit === 'GRAM' && r.quantityBase === 1000) ||
        (product.baseUnit === 'MILLILITER' && r.quantityBase === 1000)
    ) ||
    rules[0] ||
    null;

  let lowestMarginRule: RuleMarginInfo | null = null;
  let lowestMarginPercent = 100;
  let hasLossRule = false;
  let isFlaggedBelowThreshold = false;

  for (const r of rules) {
    if (lowestMarginRule === null || r.marginPercent < lowestMarginPercent) {
      lowestMarginPercent = r.marginPercent;
      lowestMarginRule = r;
    }
    if (r.isLoss) hasLossRule = true;
    if (r.isBelowThreshold) isFlaggedBelowThreshold = true;
  }

  if (rules.length === 0) {
    lowestMarginPercent = 0;
  }

  return {
    productId: product.id,
    productName: product.name,
    costPerBaseCentavos: product.costPerBaseCentavos,
    baseUnit: product.baseUnit,
    rules,
    primaryRule,
    lowestMarginRule: lowestMarginRule || primaryRule,
    lowestMarginPercent: lowestMarginRule ? lowestMarginRule.marginPercent : 0,
    primaryMarginPercent: primaryRule ? primaryRule.marginPercent : 0,
    isFlaggedBelowThreshold,
    hasLossRule,
    thresholdPercent,
  };
}

/**
 * Calculates suggested selling price in centavos given cost and desired margin percent
 * Formula: Selling Price = Cost / (1 - (marginPercent / 100))
 */
export function suggestPriceForTargetMargin(
  costPerBaseCentavos: number,
  quantityBase: number,
  targetMarginPercent: number
): number {
  const totalCost = costPerBaseCentavos * quantityBase;
  if (targetMarginPercent >= 100) return Math.round(totalCost * 2);
  const factor = 1 - targetMarginPercent / 100;
  if (factor <= 0) return Math.round(totalCost * 1.5);
  return Math.round(totalCost / factor);
}
