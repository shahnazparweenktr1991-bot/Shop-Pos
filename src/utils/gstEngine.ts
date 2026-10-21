/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SaleItem, PaymentMethod } from '../types';

/**
 * Standard rounding to 2 decimal places using half-up method
 */
export function round2(num: number): number {
  if (isNaN(num) || !isFinite(num)) return 0;
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

export interface TaxCalculationParams {
  quantity: number;
  unitPrice: number;
  gstRate: number; // e.g. 0, 5, 12, 18, 28
  isTaxInclusive?: boolean;
  isInterState?: boolean;
  itemDiscount?: number;
}

export interface CalculatedItemTax {
  grossAmount: number;
  discountAmount: number;
  taxableAmount: number;
  taxAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  finalLineTotal: number;
}

/**
 * Mathematically sound GST line-item calculation
 */
export function calculateLineItemTax(params: TaxCalculationParams): CalculatedItemTax {
  const qty = Math.max(0, params.quantity || 0);
  const price = Math.max(0, params.unitPrice || 0);
  const rate = Math.max(0, params.gstRate || 0);
  const discount = Math.max(0, params.itemDiscount || 0);
  const isInclusive = Boolean(params.isTaxInclusive);
  const isInterState = Boolean(params.isInterState);

  const rawGross = round2(qty * price);
  const effectiveDiscount = Math.min(rawGross, discount);
  const netAfterDiscount = round2(rawGross - effectiveDiscount);

  let taxableAmount = 0;
  let taxAmount = 0;
  let finalLineTotal = 0;

  if (rate === 0) {
    taxableAmount = netAfterDiscount;
    taxAmount = 0;
    finalLineTotal = netAfterDiscount;
  } else if (isInclusive) {
    // Tax is included inside the gross price:
    // Taxable = Net / (1 + rate / 100)
    taxableAmount = round2(netAfterDiscount / (1 + rate / 100));
    taxAmount = round2(netAfterDiscount - taxableAmount);
    finalLineTotal = netAfterDiscount;
  } else {
    // Tax is added on top of the net discounted price:
    taxableAmount = netAfterDiscount;
    taxAmount = round2((taxableAmount * rate) / 100);
    finalLineTotal = round2(taxableAmount + taxAmount);
  }

  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;

  if (isInterState) {
    igstAmount = taxAmount;
  } else {
    cgstAmount = round2(taxAmount / 2);
    sgstAmount = round2(taxAmount - cgstAmount); // Exact penny balance
  }

  return {
    grossAmount: rawGross,
    discountAmount: effectiveDiscount,
    taxableAmount,
    taxAmount,
    cgstAmount,
    sgstAmount,
    igstAmount,
    finalLineTotal,
  };
}

export interface BillTotalsParams {
  items: SaleItem[];
  overallDiscount?: number;
  gstEnabled?: boolean;
  isInterState?: boolean;
  amountReceived?: number;
  enableRoundOff?: boolean;
}

export interface CalculatedBillTotals {
  subtotal: number;
  discount: number;
  taxableAmount: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
  totalTax: number;
  rawTotal: number;
  roundOff: number;
  totalAmount: number;
  amountReceived: number;
  remainingBalance: number;
  customerAdvance: number;
  isValid: boolean;
  validationError?: string;
}

/**
 * Complete, single source-of-truth bill totals calculation
 */
export function calculateBillTotals(params: BillTotalsParams): CalculatedBillTotals {
  const items = params.items || [];
  const discountInput = Math.max(0, params.overallDiscount || 0);
  const gstEnabled = params.gstEnabled !== false;
  const isInterState = Boolean(params.isInterState);
  const amountReceived = Math.max(0, params.amountReceived || 0);

  let subtotal = 0;
  let taxableAmount = 0;
  let cgstTotal = 0;
  let sgstTotal = 0;
  let igstTotal = 0;
  let totalTax = 0;
  let rawTotal = 0;

  for (const item of items) {
    const qty = Math.max(0, item.quantity || 0);
    const price = Math.max(0, item.sellingPrice || 0);
    const lineGross = round2(qty * price);
    subtotal = round2(subtotal + lineGross);

    const rate = gstEnabled ? Math.max(0, item.gstRate ?? 18) : 0;
    const calc = calculateLineItemTax({
      quantity: qty,
      unitPrice: price,
      gstRate: rate,
      isTaxInclusive: true, // Default retail hardware is MRP/tax-inclusive
      isInterState,
    });

    taxableAmount = round2(taxableAmount + calc.taxableAmount);
    cgstTotal = round2(cgstTotal + calc.cgstAmount);
    sgstTotal = round2(sgstTotal + calc.sgstAmount);
    igstTotal = round2(igstTotal + calc.igstAmount);
    totalTax = round2(totalTax + calc.taxAmount);
    rawTotal = round2(rawTotal + calc.finalLineTotal);
  }

  // Apply bill-level discount bounded by subtotal
  const effectiveDiscount = Math.min(subtotal, discountInput);
  const discountedTotal = Math.max(0, round2(rawTotal - effectiveDiscount));

  let roundOff = 0;
  let finalTotal = discountedTotal;

  if (params.enableRoundOff !== false) {
    finalTotal = Math.round(discountedTotal);
    roundOff = round2(finalTotal - discountedTotal);
  }

  const remainingBalance = Math.max(0, round2(finalTotal - amountReceived));
  const customerAdvance = Math.max(0, round2(amountReceived - finalTotal));

  return {
    subtotal,
    discount: effectiveDiscount,
    taxableAmount,
    cgstTotal,
    sgstTotal,
    igstTotal,
    totalTax,
    rawTotal: discountedTotal,
    roundOff,
    totalAmount: finalTotal,
    amountReceived,
    remainingBalance,
    customerAdvance,
    isValid: items.length > 0 && finalTotal >= 0,
    validationError: items.length === 0 ? 'Cart cannot be empty' : undefined,
  };
}

/**
 * Generate unique, durable bill number with shop prefix, year, and sequence
 * Format: {PREFIX}/{YYYY}/{0001} (e.g. AK/2026/0001)
 */
export function generateBillNumber(prefix: string = 'AK', countThisYear: number = 0): string {
  const cleanPrefix = prefix.replace(/\/+$/, '') || 'AK';
  const year = new Date().getFullYear();
  const seq = String(countThisYear + 1).padStart(4, '0');
  return `${cleanPrefix}/${year}/${seq}`;
}
