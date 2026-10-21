# Master Engineering Repair & Hardening Plan — A.K. Hardware Shop Manager

A comprehensive, production-grade architectural and domain-integrity roadmap for A.K. Hardware Shop Manager. This plan brings the application to genuine 10/10 production quality across authentication, multi-device real-time sync, Indian GST invoicing, stock integrity, Khata debt ledgers, and reporting while strictly preserving every working feature and existing user workflow.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following 20 core business, accounting, and technical policies were confirmed directly by the shop owner and serve as the binding ground truth for this engineering implementation:

- **1. GST Supply Type**: Intra-state (CGST 50% + SGST 50%) applied by default; inter-state IGST switch available on invoice toggle.
- **2. Invoice Rounding**: Grand total payable rounded to the nearest whole Rupee (`round(total)`), storing exact rounding difference (`roundOffAmount`).
- **3. Khata Payment Allocation**: Partial customer payments allocate strictly against the oldest unpaid invoice first (FIFO allocation).
- **4. Customer Advances**: Overpayments or advance payments are tracked as positive customer credit balances for future purchases.
- **5. POS Stock Validation**: Strictly block bill completion if any selected product has zero or insufficient stock, prompting stock replenishment.
- **6. Supplier Khata**: Supplier payments deduct directly from overall supplier balance dues.
- **7. Expense Categories**: Standard hardware shop categories (Rent, Transport, Tea/Refreshments, Electricity, Packaging, Labor, Miscellaneous) with custom additions.
- **8. Invoice Receipt Layout**: Standard 3-inch (80mm) thermal receipt format with clean typography and itemized tax breakdown.
- **9. UPI Payment QR**: Dynamic QR code embedded on invoices and screens with the exact bill amount pre-filled (`upi://pay?pa=...&am=...`).
- **10. Multi-Device Sync**: Instant real-time mutation sync to Firebase Firestore with zero lag between shop phone and personal phone.
- **11. Offline Queue Resilience**: Durable offline write queue backed by browser storage, automatically syncing with exponential backoff on reconnection.
- **12. Multi-Device Conflict Resolution**: Latest modification wins using server-verified timestamps (`updatedAt`) to prevent stale overwrites.
- **13. Bill Cancellation**: Automatically restores sold quantities back into live product stock upon idempotent cancellation.
- **14. Reports Default Period**: Initial report view defaults to "Today" with 1-tap switches for Week, Month, and Custom Date Range.
- **15. Cost of Goods Sold (COGS) & Profit**: If wholesale cost is unknown or zero, mark profit as "Unavailable" rather than fabricating misleading 100% margins.
- **16. Invoice Numbering**: Format `AK/{YYYY}/{0001}` with automatic sequential increment per shop calendar year.
- **17. Customer Credit Limits**: Visual warning badge when a customer's outstanding balance exceeds their defined credit limit.
- **18. Karigar & Professional Directory**: Karigars, masons, plumbers, and painters sorted primarily by customer rating (5-star scale).
- **19. Audio Feedback**: Integrated audio chime tone and localized voice announcement on bill finalization.
- **20. Low Stock Alerts**: Warning badges trigger when inventory quantity reaches 5 units or lower.

---

## 1. Overview & Core Concept

**A.K. Hardware — Hardware Shop Manager** is a mobile-first, offline-resilient retail POS, inventory, Khata debt ledger, and material estimation platform tailored for Indian hardware, paints, sanitary, and electrical stores. It runs seamlessly on the shop owner's Android phones (shop counter device and personal phone), sharing a single authoritative Firebase cloud database with zero cross-account data leakage.

### Target Persona
- **Shop Owner**: Solo proprietor managing counter billing, credit customer ledgers, supplier payments, and contractor connections without complex enterprise overhead.
- **Device Profile**: Android smartphones via modern mobile browsers and PWA standalone mode.

---

## 2. User Experience & Visual Design

Following the **Universal Frontend Design Constitution** and **Mobile & Touch-First Applications Design Reference**:

- **Ergonomic Thumb Zones**: Bottom navigation tab bar (Dashboard, Billing, Inventory, Khata, More) anchored in the natural thumb zone with minimum $44 \times 44\text{px}$ touch targets.
- **Top App Bar Contract**: Clean 1-row header with shop brand wordmark, live sync status badge (`Synced`, `Syncing`, `Offline`), and dark/light mode toggle.
- **Zero-Pill Metadata**: Stock counts, dates, and prices styled as clean unboxed text with subtle typographic separators (`·`, `/`) instead of candy badge sandwiches.
- **Color & Contrast**: High-contrast slate neutrals (`slate-900`/`slate-50`) paired with energetic amber accents (`amber-500`) for primary actions and emerald for positive cash inflows.
- **Dynamic Feedback**: Responsive micro-interactions ($\le 150\text{ms}$), smooth toast alerts, audio verification chime, and localized voice confirmation.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Client-Authoritative Local-First with Firestore Mutation Sync**
  - *Chosen Approach*: Writes persist immediately to the active account namespace in localStorage, queue in a durable offline queue, and sync document-by-document to Firestore.
  - *Why*: Guarantees instant sub-millisecond counter billing even when 4G/Wi-Fi drops in the shop, with background sync catching up automatically.
  - *Alternatives Considered*: Direct Firestore-first network writes were rejected because poor shop connectivity would freeze the counter during rush hours.

- **Decision 2: Strict Out-of-Stock Blocking in POS**
  - *Chosen Approach*: When a product quantity $\le 0$, the billing cart prevents finalization and alerts the user to update stock or purchase records first.
  - *Why*: Enforces physical inventory discipline and prevents negative inventory distortion.

- **Decision 3: FIFO Invoice Debt Allocation**
  - *Chosen Approach*: When a customer makes a partial payment against their Khata balance, the payment settles the oldest outstanding invoice first, carrying remaining balance forward.
  - *Why*: Follows standard Indian retail accounting rules and simplifies customer ledger reconciliation.

---

## 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        ANDROID MOBILE CLIENTS                         │
│   [Shop Counter Phone]                        [Owner Personal Phone]  │
│   • POS Fast Cart                             • Live Sync Monitor     │
│   • Stock Deduction                           • Ledger & Reports      │
└───────────────────┬───────────────────────────────────┬────────────────┘
                    │                                   │
                    ▼                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      LOCAL DATA & STORAGE ENGINE                       │
│   • Account Scoping (`ak_{uid}_*`)            • Durable Offline Queue  │
│   • ShopStorage Mutation Hook                 • Provenance Validation  │
└───────────────────┬───────────────────────────────────┬────────────────┘
                    │                                   │
                    ▼                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                    FIREBASE AUTHORITATIVE CLOUD                        │
│   • Firebase Auth (Single Owner Identity)                             │
│   • Firestore Security Rules (`isOwner(userId)`)                      │
│   • Subcollections: `/users/{uid}/products/{id}`                      │
│                     `/users/{uid}/sales/{id}`                         │
│                     `/users/{uid}/contacts/{id}`                      │
│                     `/users/{uid}/purchases/{id}`                     │
│                     `/users/{uid}/payments/{id}`                      │
│                     `/users/{uid}/expenses/{id}`                      │
│                     `/users/{uid}/categories/{id}`                    │
│                     `/users/{uid}/professionals/{id}`                 │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Phased Implementation Roadmap

### Phase 1: Repository Baseline & Integrity Verification
- Review existing modules and automated test fixtures (`scripts/runTests.ts`).
- Ensure all 27 existing baseline unit tests continue to pass.

### Phase 2: POS Inventory Guard & Out-of-Stock Enforcement
- Update `BillingView.tsx` to inspect available stock for every line item.
- Prevent checkout if item stock is $\le 0$ or requested quantity exceeds available physical stock, providing an inline prompt to adjust quantity or record incoming stock.

### Phase 3: Indian GST Calculation Hardening & Dynamic UPI QR
- Verify intra-state (CGST + SGST) vs inter-state (IGST) split in `src/utils/gstEngine.ts`.
- Format final payable to nearest whole Rupee with integer penny balancing.
- Integrate dynamic UPI payment QR with exact invoice amount pre-filled (`upi://pay?pa={upiId}&pn={shopName}&am={grandTotal}&cu=INR`).

### Phase 4: FIFO Khata Debt & Customer Advance Tracking
- Connect customer ledger partial payments to settle oldest unpaid sales first.
- Explicitly credit excess payments as customer advances for subsequent bills.

### Phase 5: Bill Cancellation & Safe Inventory Reversal
- In `App.tsx` and `ShopStorage.cancelSale()`, ensure cancelling a bill safely restores item quantities back into product stock and reverses customer credit balance.

### Phase 6: Reports & Date-Range Defaults
- Default Reports view to "Today", showing exact cash in hand, udhar sales, collections, and purchases.
- Mark gross profit as "Unavailable" if wholesale purchase cost is zero or unrecorded.

### Phase 7: Professional Directory Ratings Sorting
- Update `DirectoryView.tsx` to sort Karigars and contractors by rating (highest first) with filter by trade.

### Phase 8: Offline Queue Durability & Multi-Device Sync Hardening
- Strengthen offline mutation queue with browser persistence so un-synced bills retry cleanly when network restores.
- Verify timestamp-based conflict resolution (`updatedAt`).

### Phase 9: Automated Regression Test Expansion
- Add comprehensive test cases covering out-of-stock POS blocking, FIFO bill payment allocation, dynamic UPI URL generation, and cancellation stock restoration.
- Verify complete test suite execution with zero regressions.
