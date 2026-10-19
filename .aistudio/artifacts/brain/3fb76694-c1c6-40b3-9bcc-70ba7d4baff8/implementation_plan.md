# Implementation Plan — A.K. Hardware Shop Manager

Transform the existing application into a polished, reliable, mobile-first shop management and billing system tailored for an Indian retail hardware shop, supporting single-owner multi-device live synchronization, editable GST rates, customer Khata, supplier ledgers, and accurate stock management.

---

## 1. User Answers & Core Specifications

Based on the clarifying questions:
* **GST & Tax Billing**: Provide configurable GST percentages (0%, 5%, 12%, 18%, 28%) with editable options on each product in the stock-adding menu, plus inline GST adjustment during checkout (supporting both tax-inclusive and tax-exclusive pricing).
* **Multi-Device Owner Sync**: When signing into the owner account on a second phone, pull cloud shop data and intelligently merge with local records using timestamp-based newest-record resolution.
* **Invoice & Print Priority**: 3-inch (80mm) thermal receipt format prioritized for fast customer printing, with direct WhatsApp invoice sharing and UPI payment links.
* **Inventory Stock Policy**: Prevent sales when stock is insufficient and display clear stock warnings (no accidental negative inventory).
* **Feature Scope Boundaries**: Strictly exclude barcode scanners, user-facing backup/restore files, Excel/CSV exports, returns/damaged-goods logs, and multi-user staff roles.

---

## 2. Proposed Changes & Architecture

### Phase 1: Critical Correctness, Account Isolation & Security

#### A. Per-User Local Storage Namespace & Account Isolation
* Scope `ShopStorage` keys by the authenticated user's Firebase UID (`hsm_${uid}_products_v1`, etc.) or clean cache isolation upon account switch/logout.
* Prevent any cross-account data leaks when logging in or out on shared or secondary phones.
* On initial registration, safely associate existing local records with the new owner account.

#### B. Cloud Synchronization & Multi-Device Realtime Consistency (`src/utils/cloudSync.ts`)
* Wire all entity subcollections in Firestore under `users/{uid}`:
  * `products`, `sales`, `contacts`, `professionals`, `categories`, `purchases`, `payments`, `expenses`, `estimates`, `settings`.
* Fix document persistence so real-time `onSnapshot` listeners update `ShopStorage` directly using unified storage keys.
* Implement deterministic conflict resolution (`mergeByNewest` and `mergeSalesByNewest`) so changes made on Phone A propagate to Phone B within 1 second without data loss.
* Maintain accurate sync states: `synced`, `syncing`, `offline`, and `error`, showing the exact timestamp of the last successful sync.

#### C. Financial Ledgers, Duplicate Submission Guards & Atomic Safety
* Ensure finalizing a bill, recording a payment, or cancelling a bill is completely idempotent:
  * Check existing bill/transaction IDs to prevent duplicate stock subtractions or double-counted debt.
  * Reconcile stock and customer balances accurately upon bill cancellation.
  * Prevent overpayment unless customer credit balance is explicitly recorded.

#### D. Secure Master Database Reset (`src/components/ResetModal.tsx`)
* Require both a dynamic 16-character confirmation code AND the owner's Firebase account password re-authentication.
* Ensure data is actually reset in both local storage and cloud collections before presenting a success notification.

---

### Phase 2: Indian GST, Billing & Core Retail Workflows

#### A. Comprehensive GST Configuration & Settings (`src/components/SettingsView.tsx`)
* Configurable fields for:
  * Shop Legal Name, Trade Name (A.K. Hardware), GSTIN (optional/configurable).
  * State & State Code (e.g., 23 - Madhya Pradesh).
  * Shop Address, Contact Numbers, UPI ID for payments.
  * Default GST Calculation Mode (Tax Inclusive vs. Tax Exclusive).
  * Invoice numbering prefix (e.g., `AK/2026/`) and auto-incrementing serial sequence.

#### B. Product Inventory & Stock Management (`src/components/ProductsView.tsx`)
* Product fields: Name, SKU/Code, Category, Subcategory, Purchase Cost, Selling Price, GST Rate (0%, 5%, 12%, 18%, 28%), HSN/SAC Code, Current Stock, Min Stock Threshold, Unit of Measurement.
* Hardware Unit Support & Conversion: Pieces (pcs), Tins, Litres (L), Kilograms (kg), Bags (bori), Boxes, Metres (m).
* Support box-to-piece or secondary unit conversions with per-product conversion ratios.
* Strict stock validation: block finalization if items exceed available stock.

#### C. Billing & Invoicing Screen (`src/components/BillingView.tsx` & `src/components/InvoiceModal.tsx`)
* Fast product search with keyboard shortcut (`/` or `Ctrl+F`).
* Select customer from Khata Contacts or Karigar Directory, or enter walk-in customer details.
* Editable GST rate and discount at item and bill levels.
* Clear tax breakup: Taxable Amount, CGST, SGST (or IGST for inter-state), Round-off, and Final Payable Amount.
* 3-inch 80mm thermal receipt layout with shop header, GSTIN, itemized rates, payment status, and UPI QR code / link.
* One-tap WhatsApp bill dispatch with clickable UPI link (`upi://pay?pa=...`).

#### D. Customer Khata & Credit Ledger (`src/components/ContactsView.tsx`)
* Full customer ledger with running balance, credit limit, and transaction history.
* Partial payment recording allocated to outstanding bills.
* One-tap WhatsApp payment reminder with pre-filled message including current balance and UPI ID.
* Seamless Karigar directory link to quickly view craftsmen and bill to them.

#### E. Supplier Purchases & Dues Tracking
* Record supplier purchases with invoice number, date, product quantities, purchase costs, and tax.
* Increase product stock exactly once upon purchase entry.
* Track supplier dues and payment history.

#### F. Business Expenses & Accurate Reports (`src/components/ReportsView.tsx`)
* Expense logging categories: Rent, Electricity, Transport, Wages, Repairs, Miscellaneous.
* Accurate financial reporting:
  * Revenue (tax-exclusive or tax-inclusive as configured).
  * Cost of Goods Sold (COGS).
  * Gross Profit = Revenue - COGS (preserves negative profit if sold at a loss).
  * Net Operating Result = Gross Profit - Operating Expenses.
  * GST Collected report broken down by rate (CGST/SGST/IGST).

---

### Phase 3: Mobile Touch Ergonomics & UI Refinements

* Mobile-first responsive design conforming to the Frontend Design Constitution (clean typography, no static pill enclosures, 44px minimum touch targets).
* Pinned Bottom Navigation: Home, Billing, Stock, Karigars, Khata, Calculator, Settings.
* Indian currency formatting (₹ and Indian commas, e.g., ₹1,25,000) and standard date format (`DD/MM/YYYY`).
* Seamless light/dark mode honoring system preferences.

---

## 3. Verification & Testing Plan

1. **Compilation & Type Safety**:
   - Run `lint_applet` (`tsc --noEmit`) to verify zero TypeScript errors.
   - Run `compile_applet` (`npm run build`) to ensure successful Vite bundling.
2. **Billing & Tax Verification**:
   - Verify tax-inclusive and tax-exclusive price calculations.
   - Verify CGST + SGST split for intra-state and IGST for inter-state transactions.
   - Verify round-off logic to nearest rupee.
3. **Stock & Ledger Consistency**:
   - Test that finalizing a bill deducts stock exactly once.
   - Test that canceling a bill restores stock and reverses customer debt accurately.
   - Verify that attempts to sell out-of-stock items are properly blocked.
4. **Multi-Device Sync & Account Isolation**:
   - Verify that Firestore listeners update local state without dummy storage keys.
   - Verify that signing out removes cached sensitive records and signing in pulls cloud records.
   - Verify that Firestore rules enforce `isOwner(userId)` across all subcollections.
