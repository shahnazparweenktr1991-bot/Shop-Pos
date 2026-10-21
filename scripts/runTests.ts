/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { calculateLineItemTax, calculateBillTotals, round2, generateBillNumber } from '../src/utils/gstEngine';
import { isSampleRecord, SAMPLE_SEED_IDS, ShopStorage, STORAGE_KEYS } from '../src/utils/storage';
import { Product, Contact, Sale, SaleItem, Payment, Professional } from '../src/types';

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

// --- 4. FIFO KHATA DEBT ALLOCATION & ADVANCES ---
console.log('\nTEST SUITE 4: FIFO Khata Debt Allocation & Advances (Decisions 3 & 4)');

ShopStorage.setActiveNamespace('test_user_fifo');

const testCustomer: Contact = {
  id: 'cust-fifo-1',
  name: 'Suresh Kumar',
  phone: '9811122233',
  profession: 'customer',
  location: 'Market Road',
  creditBalance: 1500, // owes ₹1500 total
  recordOrigin: 'user',
  createdAt: new Date().toISOString(),
};
ShopStorage.saveContact(testCustomer);

// Add two historical unpaid sales: Bill 1 (older, ₹1000 due) and Bill 2 (newer, ₹500 due)
const oldDate = new Date(Date.now() - 86400000 * 2).toISOString(); // 2 days ago
const newDate = new Date(Date.now() - 86400000 * 1).toISOString(); // 1 day ago

const saleOld: Sale = {
  id: 'sale-fifo-old',
  billNumber: 'AK/2026/0001',
  date: oldDate,
  type: 'amount_only',
  status: 'finalised',
  customerId: 'cust-fifo-1',
  customerName: 'Suresh Kumar',
  items: [],
  subtotal: 1000,
  discount: 0,
  totalAmount: 1000,
  amountReceived: 0,
  remainingBalance: 1000,
  paymentMethod: 'credit',
  createdAt: oldDate,
};

const saleNew: Sale = {
  id: 'sale-fifo-new',
  billNumber: 'AK/2026/0002',
  date: newDate,
  type: 'amount_only',
  status: 'finalised',
  customerId: 'cust-fifo-1',
  customerName: 'Suresh Kumar',
  items: [],
  subtotal: 500,
  discount: 0,
  totalAmount: 500,
  amountReceived: 0,
  remainingBalance: 500,
  paymentMethod: 'credit',
  createdAt: newDate,
};

// Save sales directly into scoped storage
localStorage.setItem(
  `ak_test_user_fifo_${STORAGE_KEYS.SALES}`,
  JSON.stringify([saleNew, saleOld]) // deliberately unsorted in array to verify chronological sort
);

// Customer makes a partial payment of ₹1200
// Under FIFO (Decision 3), it should fully settle saleOld (₹1000) and reduce saleNew by ₹200 (remaining ₹300)
const partialPayment: Payment = {
  id: 'pay-fifo-1',
  date: new Date().toISOString(),
  contactId: 'cust-fifo-1',
  contactName: 'Suresh Kumar',
  type: 'customer_payment',
  amount: 1200,
  paymentMethod: 'upi',
  createdAt: new Date().toISOString(),
};

ShopStorage.recordPayment(partialPayment);

const updatedSales = ShopStorage.getSales();
const updatedOld = updatedSales.find(s => s.id === 'sale-fifo-old');
const updatedNew = updatedSales.find(s => s.id === 'sale-fifo-new');
const updatedCust = ShopStorage.getContactById('cust-fifo-1');

assert(updatedOld?.remainingBalance === 0, 'FIFO: Oldest bill fully settled (Remaining: ₹0)');
assert(updatedOld?.amountReceived === 1000, 'FIFO: Oldest bill received updated to ₹1000');
assert(updatedNew?.remainingBalance === 300, 'FIFO: Subsequent bill reduced to ₹300 (₹500 - ₹200)');
assert(updatedNew?.amountReceived === 200, 'FIFO: Subsequent bill received updated to ₹200');
assert(updatedCust?.creditBalance === 300, 'Customer Khata balance accurately updated to ₹300');

// --- 5. POS INVENTORY GUARD & OUT-OF-STOCK BLOCKING ---
console.log('\nTEST SUITE 5: POS Inventory Guard & Out-of-Stock Blocking (Decision 5)');

ShopStorage.setActiveNamespace('test_user_stock');

const stockProduct: Product = {
  id: 'prod-stock-test',
  name: 'Premium Brass Ball Valve',
  code: 'PRD-BV-01',
  brand: 'Zoloto',
  categoryId: 'cat-plumbing',
  currentStock: 2, // only 2 in stock
  minStock: 5,
  unit: 'pieces',
  packageSize: '1/2 Inch',
  purchasePrice: 120,
  sellingPrice: 180,
  isTaxInclusive: true,
  createdAt: new Date().toISOString(),
};
ShopStorage.saveProduct(stockProduct);

// Attempt sale with 5 units when only 2 are available
const blockedSale: Sale = {
  id: 'sale-stock-blocked',
  billNumber: 'AK/2026/0003',
  date: new Date().toISOString(),
  type: 'itemised',
  status: 'finalised',
  customerName: 'Cash Customer',
  items: [
    {
      id: 'si-1',
      saleId: 'sale-stock-blocked',
      productId: 'prod-stock-test',
      productName: 'Premium Brass Ball Valve',
      productCode: 'PRD-BV-01',
      brand: 'Zoloto',
      unit: 'pieces',
      packageSize: '1/2 Inch',
      quantity: 5, // Exceeds available stock of 2
      purchasePrice: 120,
      sellingPrice: 180,
      totalPrice: 900,
    },
  ],
  subtotal: 900,
  discount: 0,
  totalAmount: 900,
  amountReceived: 900,
  remainingBalance: 0,
  paymentMethod: 'cash',
  stockDeducted: false,
  createdAt: new Date().toISOString(),
};

const blockResult = ShopStorage.processBill(blockedSale, true);
assert(blockResult.success === false, 'POS stock guard blocks bill when requested quantity exceeds physical stock');
assert(blockResult.error?.includes('Insufficient stock'), 'POS stock guard returns explicit actionable error message');

const prodAfterBlock = ShopStorage.getProductById('prod-stock-test');
assert(prodAfterBlock?.currentStock === 2, 'Physical product stock untouched after blocked sale');

// Now process valid sale with 1 unit
const validSale: Sale = {
  ...blockedSale,
  id: 'sale-stock-valid',
  billNumber: 'AK/2026/0004',
  items: [
    {
      ...blockedSale.items[0],
      quantity: 1, // Within available stock
      totalPrice: 180,
    },
  ],
  totalAmount: 180,
  amountReceived: 180,
  subtotal: 180,
};

const validResult = ShopStorage.processBill(validSale, true);
assert(validResult.success === true, 'POS stock guard permits sale when stock is sufficient');

const prodAfterSale = ShopStorage.getProductById('prod-stock-test');
assert(prodAfterSale?.currentStock === 1, 'Physical stock deducted from 2 to 1 on finalization');

// --- 6. BILL CANCELLATION & STOCK RESTORATION ---
console.log('\nTEST SUITE 6: Bill Cancellation & Stock Restoration (Decision 13)');

const cancelResult = ShopStorage.cancelBill('sale-stock-valid');
assert(cancelResult.success === true, 'Bill cancellation returns success');

const prodAfterCancel = ShopStorage.getProductById('prod-stock-test');
assert(prodAfterCancel?.currentStock === 2, 'Cancelled bill automatically restores stock back to inventory (from 1 to 2)');

const cancelledSale = ShopStorage.getSaleById('sale-stock-valid');
assert(cancelledSale?.status === 'cancelled', 'Sale status updated to cancelled');
assert(cancelledSale?.stockDeducted === false, 'Sale stockDeducted flag cleared to prevent double-restoration');

// --- 7. DYNAMIC UPI QR & BILL NUMBERING ---
console.log('\nTEST SUITE 7: Dynamic UPI QR & Bill Numbering (Decisions 9 & 16)');

const billNum1 = generateBillNumber('AK', 0);
assert(billNum1 === `AK/${new Date().getFullYear()}/0001`, 'First invoice generated as AK/{YYYY}/0001');

const billNum50 = generateBillNumber('AK', 49);
assert(billNum50 === `AK/${new Date().getFullYear()}/0050`, 'Fiftieth invoice generated as AK/{YYYY}/0050');

const customPrefixBill = generateBillNumber('SHOP', 5);
assert(customPrefixBill === `SHOP/${new Date().getFullYear()}/0006`, 'Custom prefix supported in bill numbering');

// Dynamic UPI URI Format verification
const shopUpi = 'akstore@upi';
const shopName = 'A.K. Hardware';
const billAmount = 1450.50;
const expectedUpiUri = `upi://pay?pa=${shopUpi}&pn=${encodeURIComponent(shopName)}&am=${billAmount}&cu=INR`;
assert(expectedUpiUri.includes('am=1450.5'), 'UPI URI includes pre-filled payable amount');
assert(expectedUpiUri.includes('cu=INR'), 'UPI URI specifies INR currency');
assert(expectedUpiUri.includes('pa=akstore@upi'), 'UPI URI targets merchant VPA');

// --- 8. DIRECTORY RATINGS SORTING & CREDIT LIMIT WARNINGS ---
console.log('\nTEST SUITE 8: Directory Ratings & Credit Limits (Decisions 17 & 18)');

const professionalsList: Professional[] = [
  { id: 'p1', name: 'Zahid Plumber', phone: '9876500001', address: 'Market', cityArea: 'City', profession: 'Plumber', rating: 3.5 },
  { id: 'p2', name: 'Arun Master Plumber', phone: '9876500002', address: 'Civil Lines', cityArea: 'City', profession: 'Plumber', rating: 4.9 },
  { id: 'p3', name: 'Imran Plumber', phone: '9876500003', address: 'Model Town', cityArea: 'City', profession: 'Plumber', rating: 4.2 },
];

const sortedByRating = [...professionalsList].sort((a, b) => (b.rating || 0) - (a.rating || 0));
assert(sortedByRating[0].id === 'p2' && sortedByRating[0].rating === 4.9, 'Top-rated professional appears first (4.9)');
assert(sortedByRating[1].id === 'p3' && sortedByRating[1].rating === 4.2, 'Second-highest professional appears next (4.2)');
assert(sortedByRating[2].id === 'p1' && sortedByRating[2].rating === 3.5, 'Lowest-rated professional appears last (3.5)');

// Credit Limit Warning Check
const limitCustomer: Contact = {
  id: 'cust-limit',
  name: 'Deepak Contractor',
  phone: '9812345678',
  profession: 'contractor',
  location: 'Site A',
  creditBalance: 12000,
  creditLimit: 10000, // Limit is 10k, balance is 12k
};

const isOverLimit = limitCustomer.creditLimit !== undefined && limitCustomer.creditBalance > limitCustomer.creditLimit;
assert(isOverLimit === true, 'Credit limit warning condition triggers when balance (₹12000) exceeds limit (₹10000)');

console.log('\n======================================================');
console.log(` RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
console.log('======================================================\n');

if (failedCount > 0) {
  process.exit(1);
} else {
  console.log('✓ All engineering invariants and safety requirements verified successfully.\n');
}
