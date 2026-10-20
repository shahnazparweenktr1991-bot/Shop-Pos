# Master Engineering Repair Plan — A.K. Hardware Shop Manager

A comprehensive, production-grade architectural and integrity overhaul for the A.K. Hardware shop management system. This plan resolves authentication failures, enables real-time multi-device synchronization across phones, prevents destructive data loss during sample data cleanup, standardizes Indian GST billing arithmetic, hardens security rules, and introduces an active diagnostics and synchronization health monitor.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural decisions incorporate your preferences and non-negotiable data-integrity requirements:

- **Confirmed Decision 1 (Un-synced Local Data)**: An explicit modal prompt will be presented upon sign-in if un-synced legacy records exist on the device, allowing the owner to choose whether to merge/import them or initialize purely from the authoritative cloud state.
- **Confirmed Decision 2 (Sample Data Provenance)**: Seeded demonstration records carry an explicit `recordOrigin: "sample"` property. When the owner edits any sample record, it is immediately converted to a permanent shop record (`recordOrigin: "user"`, `isSample: false`) so it is never wiped during subsequent sample cleanups.
- **Confirmed Decision 3 (Diagnostics & Health Monitor)**: A dedicated, owner-accessible Diagnostics & Sync Health Monitor section is placed inside the Settings view, showing real-time Firebase Auth status, shortened UID, connection state, hydration status, pending write count, and one-tap sanitized diagnostics export.
- **Confirmed Decision 4 (Server Architecture Audit)**: Audit of `src/` confirmed zero dependencies on the legacy `/api/*` Express endpoints in `server.ts`. Firebase Authentication and Firestore are the single authoritative production identity and database providers. `server.ts` will be sanitized and hardened to act strictly as a secure Vite host with zero security-weakening headers or fallback secrets.

---

## 1. Overview & Core Concept

- **What It Does**: A mobile-first, offline-capable hardware, paints, and electrical retail management application for single-owner hardware stores. It tracks inventory, creates GST-compliant tax invoices, manages customer and supplier credit (Khata), tracks payments and expenses, calculates material estimates, and keeps records synchronized in real-time between the owner's personal phone and shop counter phone.
- **Target Audience / Persona**: Hardware shop owner (using an Android phone in store and on the go) needing reliable, error-free accounting, instant stock reflection across devices, and zero accidental loss of business records.
- **Key Value**: 100% data integrity, instant multi-device synchronization, explicit sample cleanup that never harms real customer or stock data, and mathematical accuracy in Indian GST calculations.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Cold Start & Authentication**:
   - The app boots into a clean, brand-consistent loading state while Firebase Auth resolves (`initializing`).
   - If signed out, guest/demo mode is available, or the owner can sign in or register with email/password or Google.
   - Session persistence (`browserLocalPersistence`) keeps the owner signed in permanently across browser restarts.
   - Registration creates the Firestore user document (`/users/{uid}`) and baseline settings atomically before transitioning to `ready`.
   - On sign-out, all listeners detach, in-memory account data is cleared, and the next user never sees the previous owner's records.

2. **Two-Device Live Synchronization**:
   - Owner signs in on Phone A and creates a product or finalizes a bill.
   - Owner opens the app on Phone B and signs into the same account.
   - Initial hydration pulls authoritative cloud documents; live snapshot listeners receive granular additions, updates, and deletions.
   - When Phone A modifies stock or records a customer payment, Phone B's UI updates within milliseconds without a page reload.

3. **Safe Clear Sample Action**:
   - Owner taps "Clear Sample Records" in Settings or Dashboard.
   - The system inspects all collections for verified sample provenance (`recordOrigin === 'sample'` or known seed IDs).
   - If 0 sample records exist: The app informs the owner that all records are genuine shop records and takes zero destructive action.
   - If sample records exist: A confirmation dialog displays the exact breakdown (e.g. 12 demo products, 3 demo bills, 7 demo contacts).
   - Upon confirmation, only verified sample records are removed from local storage and deleted from Firestore. Real products, real customer balances, and real bills remain 100% intact.

4. **Diagnostics & Health Inspection**:
   - Owner navigates to Settings → System Diagnostics.
   - Views connection state, current account UID, sync queue, last sync timestamp, and collection counts.
   - Has a "Copy Sanitized Report" button for sharing debugging info without exposing passwords, tokens, or customer phone numbers.

### Visual Identity & Theme Tokens

- **Aesthetic Direction**: Utilitarian, tactile, mobile-first hardware store design (clean high-contrast typography, warm industrial amber accents, 44px+ touch targets).
- **Color Palette**:
  - Dominant Neutral (60%): Crisp slate-50 (`#f8fafc`) in light mode; deep slate-950 (`#020617`) in dark mode.
  - Structural Surfaces (30%): Clean white (`#ffffff`) or slate-900 (`#0f172a`), hairline border `border-slate-200 dark:border-slate-800`.
  - Brand Accent (10%): Industrial Amber (`amber-500`, `#f59e0b`) for primary CTAs and active tabs; Emerald (`emerald-600`) for payments/profit; Rose (`rose-600`) for outstanding debt.
- **Mobile Ergonomics**:
  - 15% sticky surface limit on mobile viewports.
  - Fixed thumb-zone bottom navigation bar with 44px minimum tap targets.
  - Tabular numerals (`tabular-nums`) for all monetary amounts, invoices, and stock figures.
  - Zero unboxed pill badges or pseudo-code commentary.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Storage Namespacing via Firebase UID**:
  - *Approach*: All local storage keys for business records and shop settings are prefixed with the authenticated Firebase UID (`ak_<uid>_<collection>`).
  - *Why*: Guarantees that switching accounts or signing out completely isolates data. Device A and Device B both map to `ak_<uid>_*` when signed into the same account, preventing cross-tenant data leaks.
  - *Alternative Considered*: Single global keys with account tagging inside each record. Rejected because clearing or querying un-namespaced keys easily leaks old data across account boundaries.

- **Decision 2: Authoritative Cloud-First Hydration with Delta Listeners**:
  - *Approach*: On sign-in, initial `getDocs` loads authoritative cloud collections into the account namespace. Snapshot listeners apply Firestore document changes (`added`, `modified`, `removed`).
  - *Why*: Properly propagates deletions across devices (fixing the previous bug where deleted products returned) and correctly handles empty cloud collections without resurrecting stale local data.
  - *Alternative Considered*: Optimistic offline bulk sync (`pushToCloud` on every state change). Rejected because bulk uploads write stale local records over concurrent remote edits and do not handle remote deletions.

- **Decision 3: Dedicated Accounting & GST Calculation Module**:
  - *Approach*: Centralized math engine in `src/utils/gstEngine.ts` handling taxable value, discount allocations, GST extraction (inclusive) or addition (exclusive), CGST/SGST/IGST splits, and half-up rounding.
  - *Why*: Eliminates calculation discrepancies between cart preview, finalized invoices, thermal receipts, and reports.

---

## 4. Technical Architecture & Data Strategy

### System Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                        A.K. HARDWARE SHOP POS                          │
├────────────────────────────────────────────────────────────────────────┤
│                       REACT UI / MOBILE SHELL                          │
│  [Top Header]   [Tab Views: Billing / Stock / Khata / Reports]        │
│  [Invoice Modal] [Clear Sample Dialog] [Settings / Diagnostics Panel]  │
│  [Bottom Nav Bar: 44px Touch Targets]                                 │
└──────────────────┬─────────────────────────────────┬───────────────────┘
                   │                                 │
                   ▼                                 ▼
┌──────────────────────────────────────┐   ┌─────────────────────────────┐
│       GST & BILLING ENGINE           │   │    AUTH STATE CONTROLLER    │
│  • Inclusive / Exclusive Tax Math    │   │  • initializing / ready /   │
│  • Discount & Rounding Normalizer    │   │    signedOut / error        │
│  • Idempotent Stock & Balance Ledger │   │  • Session Persistence      │
└──────────────────┬───────────────────┘   │  • Password Reset Provider  │
                   │                       └──────────────┬──────────────┘
                   ▼                                      ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   ACCOUNT-ISOLATED STORAGE LAYER                       │
│  • Namespace Resolver: getScopedKey(baseKey, activeUid)                │
│  • Active Account Scoping: ak_<uid>_products, ak_<uid>_sales, etc.    │
│  • Explicit Legacy Data Migration Gate                                 │
│  • Provenance Tracking: recordOrigin: "sample" | "user"                │
└──────────────────┬─────────────────────────────────┬───────────────────┘
                   │                                 │
                   ▼                                 ▼
┌──────────────────────────────────────┐   ┌─────────────────────────────┐
│     FIRESTORE LIVE SYNC SERVICE      │   │   HARDENED FIREBASE CONFIG  │
│  • Granular Doc Upsert & Deletion    │   │  • Applet Config Binding    │
│  • Real-time Snapshot Change Listen  │   │  • ABAC Security Rules      │
│  • Sync Health & Write Queue Tracker │   │  • Error Context Thrower    │
│  • Conflict Resolution Policy        │   │    (handleFirestoreError)   │
└──────────────────┬───────────────────┘   └──────────────┬──────────────┘
                   │                                      │
                   └──────────────────┬───────────────────┘
                                      ▼
                       ┌──────────────────────────────┐
                       │      FIREBASE BACKEND        │
                       │  • Firebase Authentication   │
                       │  • Cloud Firestore (/users)  │
                       └──────────────────────────────┘
```

### Data Synchronization & Record Lifecycle

1. **Record Creation**:
   - Created with unique ID, timestamp, and `recordOrigin: "user"`.
   - Saved immediately to local scoped storage (`ak_<uid>_<collection>`).
   - If authenticated, written immediately to Firestore `/users/{uid}/{collection}/{id}`.
2. **Record Update**:
   - Updated locally with `updatedAt: ISO string`.
   - Written to Firestore doc. Other connected devices receive `modified` change in snapshot listener and update their local cache.
3. **Record Deletion**:
   - Removed from local storage.
   - `deleteDoc` invoked on Firestore doc.
   - Remote devices receive `removed` change in snapshot listener and purge from their local cache.
4. **Sample Cleanup**:
   - Filters only items with `recordOrigin === 'sample'` or `isSample === true` or explicit sample seed IDs.
   - Invokes `deleteDoc` for verified sample IDs in cloud, keeping all non-sample records untouched.

---

## 5. Verification & Testing Strategy

- **Automated Tests**:
  - `tests/gstEngine.test.ts`: GST-inclusive and exclusive math, discounts, CGST/SGST/IGST, rounding, partial payments, overpayments, and balance reconciliation.
  - `tests/sampleCleanup.test.ts`: Confirms Clear Sample removes only verified sample data while keeping real products, contacts, and invoices safe.
  - `tests/accountIsolation.test.ts`: Verifies storage isolation between UID namespaces, preventing data cross-contamination.
- **Verification Commands**:
  - `npm run lint` / `tsc --noEmit`
  - `compile_applet` to guarantee complete build passes.
- **Two-Device Manual Verification Plan**: Clear, non-technical instructions tailored for Android phone owners to verify multi-device synchronization and isolation safely.
