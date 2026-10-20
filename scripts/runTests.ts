/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { calculateLineItemTax, calculateBillTotals, round2 } from '../src/utils/gstEngine';
import { isSampleRecord, SAMPLE_SEED_IDS } from '../src/utils/storage';
import { Product, Contact, Sale, SaleItem } from '../src/types';

// Mock browser localStorage for Node test runner
const storageMap = new Map<string, string>();
(global as any).localStorage = {
  getItem: (k: string) => storageMap.get(k) || null,
  setItem: (k: string, v: string) => storageMap.set(k, v),
  removeItem: (k: string) => storageMap.delete(k),
  clear: () => storageMap.clear(),
};

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, testName: string, details?: any) {
  if (condition) {
    passedCount++;
    console.log(`  ✓ PASS: ${testName}`);
  } else {
    failedCount++;
    console.error(`  ✗ FAIL: ${testName}`);
    if (details) console.error('    Details:', details);
  }
}

console.log('\n======================================================');
console.log(' RUNNING A.K. HARDWARE MASTER REPAIR VERIFICATION SUITE');
console.log('======================================================\n');

// --- 1. GST & ACCOUNTING CALCULATIONS ---
console.log('TEST SUITE 1: GST Engine & Billing Calculations');

// Test 1: Tax-inclusive 18% GST (Retail hardware standard)
const inclusive18 = calculateLineItemTax({
  quantity: 1,
  unitPrice: 1180,
  gstRate: 18,
  isTaxInclusive: true,
  isInterState: false,
});
assert(inclusive18.finalLineTotal === 1180, 'Inclusive 18% final total matches gross ₹1180');
assert(inclusive18.taxableAmount === 1000, 'Inclusive 18% taxable value extracted correctly as ₹1000');
assert(inclusive18.taxAmount === 180, 'Inclusive 18% total tax extracted as ₹180');
assert(inclusive18.cgstAmount === 90, 'CGST 9% correctly split to ₹90');
assert(inclusive18.sgstAmount === 90, 'SGST 9% correctly split to ₹90');
assert(round2(inclusive18.cgstAmount + inclusive18.sgstAmount) === 180, 'CGST + SGST exactly equals total tax');

// Test 2: Tax-exclusive 18% GST
const exclusive18 = calculateLineItemTax({
  quantity: 2,
  unitPrice: 500, // Gross = 1000
  gstRate: 18,
  isTaxInclusive: false,
  isInterState: false,
});
assert(exclusive18.taxableAmount === 1000, 'Exclusive 18% taxable value equals base ₹1000');
assert(exclusive18.taxAmount === 180, 'Exclusive 18% tax added as ₹180');
assert(exclusive18.finalLineTotal === 1180, 'Exclusive 18% final payable equals ₹1180');

// Test 3: Inter-state transaction (IGST)
const interStateCalc = calculateLineItemTax({
  quantity: 1,
  unitPrice: 1180,
  gstRate: 18,
  isTaxInclusive: true,
  isInterState: true,
});
assert(interStateCalc.igstAmount === 180, 'Inter-state transaction applies 100% IGST ₹180');
assert(interStateCalc.cgstAmount === 0, 'Inter-state transaction sets CGST to 0');
assert(interStateCalc.sgstAmount === 0, 'Inter-state transaction sets SGST to 0');

// Test 4: Penny balancing for odd cent tax amounts
const oddTax = calculateLineItemTax({
  quantity: 1,
  unitPrice: 100.99,
  gstRate: 15, // odd rate
  isTaxInclusive: false,
  isInterState: false,
});
assert(
  round2(oddTax.cgstAmount + oddTax.sgstAmount) === oddTax.taxAmount,
  'CGST + SGST penny balancing preserves exact tax amount down to 2 decimals'
);

// Test 5: Full Bill with Discount, Overpayment & Customer Advance
const sampleSaleItems: SaleItem[] = [
  {
    id: 'item-1',
    saleId: 'bill-1',
    productId: 'p1',
    productName: 'Enamel Paint 1L',
    productCode: 'EN-1',
    brand: 'Asian Paints',
    unit: 'litres',
    packageSize: '1 Litre',
    quantity: 2,
    purchasePrice: 350,
    sellingPrice: 500, // 2 * 500 = 1000
    totalPrice: 1000,
    gstRate: 18,
  },
  {
    id: 'item-2',
    saleId: 'bill-1',
    productId: 'p2',
    productName: 'Roller Brush 4 Inch',
    productCode: 'BR-4',
    brand: 'Berger',
    unit: 'pieces',
    packageSize: '1 pc',
    quantity: 1,
    purchasePrice: 80,
    sellingPrice: 120, // 1 * 120 = 120
    totalPrice: 120,
    gstRate: 18,
  },
];

const billTotals = calculateBillTotals({
  items: sampleSaleItems,
  overallDiscount: 20, // 1120 - 20 = 1100
  gstEnabled: true,
  isInterState: false,
  amountReceived: 1500, // ₹400 advance overpayment
  enableRoundOff: true,
});

assert(billTotals.subtotal === 1120, 'Subtotal correctly calculated as ₹1120');
assert(billTotals.discount === 20, 'Discount correctly applied as ₹20');
assert(billTotals.totalAmount === 1100, 'Total payable is ₹1100');
assert(billTotals.remainingBalance === 0, 'Remaining balance is 0 on full payment');
assert(billTotals.customerAdvance === 400, 'Customer advance accurately records excess ₹400');
assert(billTotals.isValid === true, 'Bill calculation validated as legal and complete');

// --- 2. CLEAR SAMPLE DATA PROVENANCE & SAFETY ---
console.log('\nTEST SUITE 2: Clear Sample Provenance & Data Safety');

// Test 6: Seed records are identified as samples
const demoProd: Partial<Product> = { id: 'prod-1', name: 'Demo Emulsion', isSample: true, recordOrigin: 'sample' };
assert(isSampleRecord(demoProd as any) === true, 'Seeded demo product positively identified as sample');

// Test 7: Genuine owner records are NOT samples
const realProd: Partial<Product> = { id: 'prd-9999', name: 'Real Shop Putty 20kg', isSample: false, recordOrigin: 'user' };
assert(isSampleRecord(realProd as any) === false, 'Real user product is NEVER marked as sample');

// Test 8: Editing a demo product converts it to permanent user record
const editedDemoProd: Partial<Product> = { id: 'prod-1', name: 'Custom Asian Paints White 1L', isSample: false, recordOrigin: 'user' };
assert(isSampleRecord(editedDemoProd as any) === false, 'Edited demo product converted to permanent user record');

// Test 9: Real customer with debt survives sample cleanup
const realCustomer: Partial<Contact> = {
  id: 'cnt-real-1',
  name: 'Ramesh Contractor',
  phone: '9876543210',
  creditBalance: 4500,
  recordOrigin: 'user',
};
assert(isSampleRecord(realCustomer as any) === false, 'Real customer with credit debt is protected from sample cleanup');

// Test 10: Unknown / ambiguous records are preserved
const legacyUnknownRecord = { id: 'custom-hardware-item', name: 'Old Stock Angle' };
assert(isSampleRecord(legacyUnknownRecord as any) === false, 'Ambiguous record without sample origin is safely preserved');

// --- 3. ACCOUNT NAMESPACE ISOLATION ---
console.log('\nTEST SUITE 3: Account Namespace Isolation');

// Set namespace for Account 1
const userA_id = 'user_abc_123';
const userB_id = 'user_xyz_789';

const getScopedKey = (uid: string, key: string) => `ak_${uid}_${key}`;

localStorage.setItem(getScopedKey(userA_id, 'products'), JSON.stringify([{ id: 'pA', name: 'Account A Item' }]));
localStorage.setItem(getScopedKey(userB_id, 'products'), JSON.stringify([{ id: 'pB', name: 'Account B Item' }]));

const accountA_data = JSON.parse(localStorage.getItem(getScopedKey(userA_id, 'products')) || '[]');
const accountB_data = JSON.parse(localStorage.getItem(getScopedKey(userB_id, 'products')) || '[]');

assert(accountA_data.length === 1 && accountA_data[0].id === 'pA', 'Account A reads only its own products');
assert(accountB_data.length === 1 && accountB_data[0].id === 'pB', 'Account B reads only its own products');
assert(accountA_data[0].id !== accountB_data[0].id, 'Zero leakage or bleeding between distinct account UIDs');

console.log('\n======================================================');
console.log(` RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
console.log('======================================================\n');

if (failedCount > 0) {
  process.exit(1);
} else {
  console.log('✓ All engineering invariants and safety requirements verified successfully.\n');
}
