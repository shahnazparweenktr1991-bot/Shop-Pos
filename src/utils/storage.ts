/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  Category, 
  Product, 
  Sale, 
  Purchase, 
  Contact, 
  Payment, 
  Expense, 
  MaterialEstimate, 
  Professional 
} from '../types';
import { 
  SAMPLE_CATEGORIES, 
  SAMPLE_CONTACTS, 
  SAMPLE_PRODUCTS, 
  SAMPLE_SALES, 
  SAMPLE_PURCHASES, 
  SAMPLE_PAYMENTS, 
  SAMPLE_EXPENSES, 
  SAMPLE_ESTIMATES,
  SAMPLE_PROFESSIONALS
} from '../data/sampleData';
import { generateBillNumber } from './gstEngine';

export const STORAGE_KEYS = {
  CATEGORIES: 'hsm_categories_v2',
  PRODUCTS: 'hsm_products_v2',
  SALES: 'hsm_sales_v2',
  PURCHASES: 'hsm_purchases_v2',
  CONTACTS: 'hsm_contacts_v2',
  PAYMENTS: 'hsm_payments_v2',
  EXPENSES: 'hsm_expenses_v2',
  ESTIMATES: 'hsm_estimates_v2',
  PROFESSIONALS: 'hsm_professionals_v2',
  INITIALIZED: 'hsm_initialized_v2',
};

// Known seed IDs for demonstration records
export const SAMPLE_SEED_IDS = new Set([
  'prod-1', 'prod-2', 'prod-3', 'prod-4', 'prod-5', 'prod-6', 
  'prod-7', 'prod-8', 'prod-9', 'prod-10', 'prod-11', 'prod-12',
  'cnt-1', 'cnt-2', 'cnt-3', 'cnt-4', 'cnt-5', 'cnt-6', 'cnt-7',
  'sale-101', 'sale-102', 'sale-103',
  'pur-101', 'pur-102',
  'pay-1', 'pay-2',
  'exp-1', 'exp-2', 'exp-3',
  'est-1',
  'prof-1', 'prof-2', 'prof-3', 'prof-4', 'prof-5',
]);

let currentNamespaceUid: string | null = null;
type MutationListener = (action: 'upsert' | 'delete', collection: string, id: string, data?: any) => void;
let mutationListener: MutationListener | null = null;

/**
 * Resolved storage key partitioned strictly by active account UID.
 * Prevents account cross-contamination.
 */
function getScopedKey(baseKey: string): string {
  if (currentNamespaceUid && currentNamespaceUid.trim()) {
    return `ak_${currentNamespaceUid.trim()}_${baseKey}`;
  }
  return `ak_guest_${baseKey}`;
}

/**
 * Safe JSON loader from active scoped namespace
 */
function loadFromStorage<T>(baseKey: string, fallback: T): T {
  try {
    const scopedKey = getScopedKey(baseKey);
    const item = localStorage.getItem(scopedKey);
    if (!item) return fallback;
    const parsed = JSON.parse(item);
    return Array.isArray(fallback) && !Array.isArray(parsed) ? fallback : parsed;
  } catch (err) {
    console.error(`Failed to load ${baseKey} from storage:`, err);
    return fallback;
  }
}

/**
 * Safe JSON writer to active scoped namespace
 */
function saveToStorage<T>(baseKey: string, data: T): void {
  try {
    const scopedKey = getScopedKey(baseKey);
    localStorage.setItem(scopedKey, JSON.stringify(data));
  } catch (err) {
    console.error(`Failed to save ${baseKey} to storage:`, err);
  }
}

/**
 * Positive identification of a sample/demo record
 */
export function isSampleRecord(item: { id: string; isSample?: boolean; recordOrigin?: string }): boolean {
  if (!item) return false;
  // If explicitly converted to user-owned record, it is NEVER a sample
  if (item.recordOrigin === 'user') return false;
  if (item.recordOrigin === 'sample') return true;
  if (item.isSample === true) return true;
  return SAMPLE_SEED_IDS.has(item.id);
}

export class ShopStorage {
  /**
   * Set active account namespace and clear cached references
   */
  static setActiveNamespace(uid: string | null): void {
    currentNamespaceUid = uid && uid.trim() ? uid.trim() : null;
  }

  static getActiveNamespace(): string | null {
    return currentNamespaceUid;
  }

  static registerMutationListener(listener: MutationListener | null): void {
    mutationListener = listener;
  }

  private static notifyMutation(action: 'upsert' | 'delete', collection: string, id: string, data?: any): void {
    if (mutationListener) {
      try {
        mutationListener(action, collection, id, data);
      } catch (err) {
        console.warn('Mutation listener warning:', err);
      }
    }
  }

  /**
   * Check if un-scoped legacy data exists on this device
   */
  static hasLegacyUnscopedData(): boolean {
    try {
      const legacyKeys = [
        'hsm_products_v1', 'hsm_sales_v1', 'hsm_contacts_v1',
        'ak_products_v1', 'ak_sales_v1', 'ak_contacts_v1',
      ];
      for (const k of legacyKeys) {
        const val = localStorage.getItem(k);
        if (val) {
          const parsed = JSON.parse(val);
          if (Array.isArray(parsed) && parsed.length > 0) {
            // Check if there are non-sample items
            const hasReal = parsed.some(item => !isSampleRecord(item));
            if (hasReal) return true;
          }
        }
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Explicitly migrate legacy local data into the active account namespace
   */
  static migrateLegacyDataToActiveAccount(mode: 'import' | 'dismiss'): { success: boolean; importedCount: number } {
    if (mode === 'dismiss') {
      try {
        localStorage.setItem('ak_legacy_migrated_v2', 'dismissed');
      } catch {}
      return { success: true, importedCount: 0 };
    }

    let count = 0;
    try {
      const legacyProds = localStorage.getItem('hsm_products_v1') || localStorage.getItem('ak_products_v1');
      if (legacyProds) {
        const parsed = JSON.parse(legacyProds);
        if (Array.isArray(parsed)) {
          const realProds = parsed.filter(p => !isSampleRecord(p)).map(p => ({
            ...p,
            recordOrigin: 'user' as const,
            isSample: false,
          }));
          if (realProds.length > 0) {
            const current = this.getProducts();
            const merged = [...realProds, ...current.filter(c => !realProds.some(r => r.id === c.id))];
            saveToStorage(STORAGE_KEYS.PRODUCTS, merged);
            count += realProds.length;
          }
        }
      }

      const legacyContacts = localStorage.getItem('hsm_contacts_v1') || localStorage.getItem('ak_contacts_v1');
      if (legacyContacts) {
        const parsed = JSON.parse(legacyContacts);
        if (Array.isArray(parsed)) {
          const realContacts = parsed.filter(c => !isSampleRecord(c)).map(c => ({
            ...c,
            recordOrigin: 'user' as const,
            isSample: false,
          }));
          if (realContacts.length > 0) {
            const current = this.getContacts();
            const merged = [...realContacts, ...current.filter(c => !realContacts.some(r => r.id === c.id))];
            saveToStorage(STORAGE_KEYS.CONTACTS, merged);
            count += realContacts.length;
          }
        }
      }

      const legacySales = localStorage.getItem('hsm_sales_v1') || localStorage.getItem('ak_sales_v1');
      if (legacySales) {
        const parsed = JSON.parse(legacySales);
        if (Array.isArray(parsed)) {
          const realSales = parsed.filter(s => !isSampleRecord(s)).map(s => ({
            ...s,
            recordOrigin: 'user' as const,
            isSample: false,
          }));
          if (realSales.length > 0) {
            const current = this.getSales();
            const merged = [...realSales, ...current.filter(c => !realSales.some(r => r.id === c.id))];
            saveToStorage(STORAGE_KEYS.SALES, merged);
            count += realSales.length;
          }
        }
      }

      localStorage.setItem('ak_legacy_migrated_v2', 'imported');
      return { success: true, importedCount: count };
    } catch (err) {
      console.error('Error during legacy migration:', err);
      return { success: false, importedCount: count };
    }
  }

  /**
   * Initialize starter data for unauthenticated guest or newly requested demo
   */
  static init(): void {
    const isInit = localStorage.getItem(getScopedKey(STORAGE_KEYS.INITIALIZED));
    if (!isInit) {
      // Populate clean default starter categories
      const categories = this.getCategories();
      if (categories.length === 0) {
        saveToStorage(STORAGE_KEYS.CATEGORIES, SAMPLE_CATEGORIES);
      }
      const profs = this.getProfessionals();
      if (profs.length === 0) {
        saveToStorage(STORAGE_KEYS.PROFESSIONALS, SAMPLE_PROFESSIONALS);
      }
      localStorage.setItem(getScopedKey(STORAGE_KEYS.INITIALIZED), 'true');
    }
  }

  /**
   * Load / Reload demo demonstration data (tags every seeded record explicitly as sample)
   */
  static loadDemoData(): void {
    const existingCategories = this.getCategories().filter(c => !isSampleRecord(c));
    const existingContacts = this.getContacts().filter(c => !isSampleRecord(c));
    const existingProducts = this.getProducts().filter(p => !isSampleRecord(p));
    const existingSales = this.getSales().filter(s => !isSampleRecord(s));
    const existingPurchases = this.getPurchases().filter(p => !isSampleRecord(p));
    const existingPayments = this.getPayments().filter(p => !isSampleRecord(p));
    const existingExpenses = this.getExpenses().filter(e => !isSampleRecord(e));
    const existingEstimates = this.getEstimates().filter(e => !isSampleRecord(e));
    const existingProfessionals = this.getProfessionals().filter(p => !isSampleRecord(p));

    saveToStorage(STORAGE_KEYS.CATEGORIES, [...SAMPLE_CATEGORIES, ...existingCategories]);
    saveToStorage(STORAGE_KEYS.CONTACTS, [...SAMPLE_CONTACTS, ...existingContacts]);
    saveToStorage(STORAGE_KEYS.PRODUCTS, [...SAMPLE_PRODUCTS, ...existingProducts]);
    saveToStorage(STORAGE_KEYS.SALES, [...SAMPLE_SALES, ...existingSales]);
    saveToStorage(STORAGE_KEYS.PURCHASES, [...SAMPLE_PURCHASES, ...existingPurchases]);
    saveToStorage(STORAGE_KEYS.PAYMENTS, [...SAMPLE_PAYMENTS, ...existingPayments]);
    saveToStorage(STORAGE_KEYS.EXPENSES, [...SAMPLE_EXPENSES, ...existingExpenses]);
    saveToStorage(STORAGE_KEYS.ESTIMATES, [...SAMPLE_ESTIMATES, ...existingEstimates]);
    saveToStorage(STORAGE_KEYS.PROFESSIONALS, [...SAMPLE_PROFESSIONALS, ...existingProfessionals]);
    localStorage.setItem(getScopedKey(STORAGE_KEYS.INITIALIZED), 'true');
  }

  /**
   * Audit and count verified sample records across all collections
   */
  static getSampleCounts(): {
    total: number;
    products: number;
    sales: number;
    contacts: number;
    purchases: number;
    payments: number;
    expenses: number;
    estimates: number;
    professionals: number;
    categories: number;
  } {
    const products = this.getProducts().filter(isSampleRecord).length;
    const sales = this.getSales().filter(isSampleRecord).length;
    const contacts = this.getContacts().filter(isSampleRecord).length;
    const purchases = this.getPurchases().filter(isSampleRecord).length;
    const payments = this.getPayments().filter(isSampleRecord).length;
    const expenses = this.getExpenses().filter(isSampleRecord).length;
    const estimates = this.getEstimates().filter(isSampleRecord).length;
    const professionals = this.getProfessionals().filter(isSampleRecord).length;
    const categories = this.getCategories().filter(isSampleRecord).length;

    const total = products + sales + contacts + purchases + payments + expenses + estimates + professionals;
    return {
      total,
      products,
      sales,
      contacts,
      purchases,
      payments,
      expenses,
      estimates,
      professionals,
      categories,
    };
  }

  static hasDemoData(): boolean {
    return this.getSampleCounts().total > 0;
  }

  /**
   * Remove ONLY verified demonstration/sample records.
   * Real products, invoices, payments, khata, and settings are 100% PRESERVED.
   */
  static clearDemoData(): {
    clearedTotal: number;
    details: ReturnType<typeof ShopStorage.getSampleCounts>;
    sampleDocIds: { [collection: string]: string[] };
  } {
    const counts = this.getSampleCounts();
    const sampleDocIds: { [collection: string]: string[] } = {};

    const findSampleIds = <T extends { id: string }>(items: T[]): string[] => {
      return items.filter(isSampleRecord).map(i => i.id);
    };

    sampleDocIds['products'] = findSampleIds(this.getProducts());
    sampleDocIds['sales'] = findSampleIds(this.getSales());
    sampleDocIds['contacts'] = findSampleIds(this.getContacts());
    sampleDocIds['purchases'] = findSampleIds(this.getPurchases());
    sampleDocIds['payments'] = findSampleIds(this.getPayments());
    sampleDocIds['expenses'] = findSampleIds(this.getExpenses());
    sampleDocIds['estimates'] = findSampleIds(this.getEstimates());
    sampleDocIds['professionals'] = findSampleIds(this.getProfessionals());

    // Filter local storage keeping only real records
    const realCategories = this.getCategories().filter(c => !isSampleRecord(c));
    const realContacts = this.getContacts().filter(c => !isSampleRecord(c));
    const realProducts = this.getProducts().filter(p => !isSampleRecord(p));
    const realSales = this.getSales().filter(s => !isSampleRecord(s));
    const realPurchases = this.getPurchases().filter(p => !isSampleRecord(p));
    const realPayments = this.getPayments().filter(p => !isSampleRecord(p));
    const realExpenses = this.getExpenses().filter(e => !isSampleRecord(e));
    const realEstimates = this.getEstimates().filter(e => !isSampleRecord(e));
    const realProfessionals = this.getProfessionals().filter(p => !isSampleRecord(p));

    const fallbackCategories: Category[] = realCategories.length > 0 ? realCategories : [
      { id: 'cat-paint', name: 'Paint', recordOrigin: 'user', createdAt: new Date().toISOString() },
      { id: 'cat-primer', name: 'Primer', recordOrigin: 'user', createdAt: new Date().toISOString() },
      { id: 'cat-putty', name: 'Putty', recordOrigin: 'user', createdAt: new Date().toISOString() },
      { id: 'cat-pop', name: 'POP', recordOrigin: 'user', createdAt: new Date().toISOString() },
      { id: 'cat-adhesive', name: 'Adhesive', recordOrigin: 'user', createdAt: new Date().toISOString() },
      { id: 'cat-plumbing', name: 'Plumbing', recordOrigin: 'user', createdAt: new Date().toISOString() },
      { id: 'cat-electrical', name: 'Electrical', recordOrigin: 'user', createdAt: new Date().toISOString() },
      { id: 'cat-hardware', name: 'Hardware', recordOrigin: 'user', createdAt: new Date().toISOString() },
    ];

    saveToStorage(STORAGE_KEYS.CATEGORIES, fallbackCategories);
    saveToStorage(STORAGE_KEYS.CONTACTS, realContacts);
    saveToStorage(STORAGE_KEYS.PRODUCTS, realProducts);
    saveToStorage(STORAGE_KEYS.SALES, realSales);
    saveToStorage(STORAGE_KEYS.PURCHASES, realPurchases);
    saveToStorage(STORAGE_KEYS.PAYMENTS, realPayments);
    saveToStorage(STORAGE_KEYS.EXPENSES, realExpenses);
    saveToStorage(STORAGE_KEYS.ESTIMATES, realEstimates);
    saveToStorage(STORAGE_KEYS.PROFESSIONALS, realProfessionals);

    return {
      clearedTotal: counts.total,
      details: counts,
      sampleDocIds,
    };
  }

  // --- CATEGORIES ---
  static getCategories(): Category[] {
    return loadFromStorage<Category[]>(STORAGE_KEYS.CATEGORIES, []);
  }

  static saveCategory(category: Category): void {
    const categories = this.getCategories();
    const index = categories.findIndex(c => c.id === category.id);
    const updated: Category = {
      ...category,
      recordOrigin: 'user',
      isSample: false,
    };
    if (index >= 0) {
      categories[index] = updated;
    } else {
      categories.push(updated);
    }
    saveToStorage(STORAGE_KEYS.CATEGORIES, categories);
    this.notifyMutation('upsert', 'categories', updated.id, updated);
  }

  static deleteCategory(categoryId: string): { success: boolean; message?: string } {
    const products = this.getProducts();
    const isUsed = products.some(p => p.categoryId === categoryId);
    if (isUsed) {
      return { success: false, message: 'Cannot delete: Products are still assigned to this category.' };
    }
    const categories = this.getCategories().filter(c => c.id !== categoryId);
    saveToStorage(STORAGE_KEYS.CATEGORIES, categories);
    this.notifyMutation('delete', 'categories', categoryId);
    return { success: true };
  }

  // --- PRODUCTS ---
  static getProducts(): Product[] {
    return loadFromStorage<Product[]>(STORAGE_KEYS.PRODUCTS, []);
  }

  static getProductById(id: string): Product | undefined {
    return this.getProducts().find(p => p.id === id);
  }

  static saveProduct(product: Product): void {
    const products = this.getProducts();
    const index = products.findIndex(p => p.id === product.id);
    // User edits convert demo record to permanent user record
    const updated: Product = {
      ...product,
      recordOrigin: 'user',
      isSample: false,
      updatedAt: new Date().toISOString(),
      createdAt: product.createdAt || new Date().toISOString(),
    };

    if (index >= 0) {
      products[index] = updated;
    } else {
      products.unshift(updated);
    }
    saveToStorage(STORAGE_KEYS.PRODUCTS, products);
    this.notifyMutation('upsert', 'products', updated.id, updated);
  }

  static deleteProduct(productId: string): void {
    const products = this.getProducts().filter(p => p.id !== productId);
    saveToStorage(STORAGE_KEYS.PRODUCTS, products);
    this.notifyMutation('delete', 'products', productId);
  }

  // --- PURCHASES ---
  static getPurchases(): Purchase[] {
    return loadFromStorage<Purchase[]>(STORAGE_KEYS.PURCHASES, []);
  }

  static recordPurchase(purchase: Purchase): void {
    const purchases = this.getPurchases();
    // Idempotency check: don't double record identical purchase ID
    const existingIndex = purchases.findIndex(p => p.id === purchase.id);
    if (existingIndex >= 0) return;

    const record: Purchase = {
      ...purchase,
      recordOrigin: 'user',
      isSample: false,
    };
    purchases.unshift(record);
    saveToStorage(STORAGE_KEYS.PURCHASES, purchases);

    // Increase product stock
    const products = this.getProducts();
    const prodIndex = products.findIndex(p => p.id === purchase.productId);
    if (prodIndex >= 0) {
      products[prodIndex].currentStock += purchase.quantity;
      products[prodIndex].purchasePrice = purchase.purchasePrice;
      products[prodIndex].updatedAt = new Date().toISOString();
      saveToStorage(STORAGE_KEYS.PRODUCTS, products);
      this.notifyMutation('upsert', 'products', products[prodIndex].id, products[prodIndex]);
    }

    // Update supplier ledger if balance is due
    if (purchase.supplierId && purchase.remainingBalance > 0) {
      const contacts = this.getContacts();
      const contactIndex = contacts.findIndex(c => c.id === purchase.supplierId);
      if (contactIndex >= 0) {
        contacts[contactIndex].creditBalance -= purchase.remainingBalance;
        saveToStorage(STORAGE_KEYS.CONTACTS, contacts);
        this.notifyMutation('upsert', 'contacts', contacts[contactIndex].id, contacts[contactIndex]);
      }
    }

    this.notifyMutation('upsert', 'purchases', record.id, record);
  }

  // --- SALES / BILLING ---
  static getSales(): Sale[] {
    return loadFromStorage<Sale[]>(STORAGE_KEYS.SALES, []);
  }

  static getSaleById(id: string): Sale | undefined {
    return this.getSales().find(s => s.id === id);
  }

  /**
   * Idempotent bill processing with single-deduction stock guarantee
   */
  static processBill(
    sale: Sale, 
    preventNegativeStock: boolean = true
  ): { success: boolean; error?: string; sale: Sale } {
    const products = this.getProducts();
    const contacts = this.getContacts();
    const sales = this.getSales();

    const existingIndex = sales.findIndex(s => s.id === sale.id);
    const existingSale = existingIndex >= 0 ? sales[existingIndex] : null;

    // Idempotency: If already finalized and stock deducted, do not deduct again
    if (existingSale && existingSale.status === 'finalised' && existingSale.stockDeducted) {
      return { success: true, sale: existingSale };
    }

    // 1. Stock check if itemised and finalising
    if (sale.type === 'itemised' && sale.status === 'finalised' && !sale.stockDeducted) {
      if (preventNegativeStock) {
        for (const item of sale.items) {
          const product = products.find(p => p.id === item.productId);
          if (!product) {
            return { success: false, error: `Product "${item.productName}" not found in inventory.`, sale };
          }
          if (product.currentStock < item.quantity) {
            return { 
              success: false, 
              error: `Insufficient stock for "${product.name}". Available: ${product.currentStock} ${product.unit}, Requested: ${item.quantity} ${product.unit}.`, 
              sale 
            };
          }
        }
      }

      // Deduct stock exactly once
      for (const item of sale.items) {
        const prodIndex = products.findIndex(p => p.id === item.productId);
        if (prodIndex >= 0) {
          products[prodIndex].currentStock -= item.quantity;
          products[prodIndex].updatedAt = new Date().toISOString();
          this.notifyMutation('upsert', 'products', products[prodIndex].id, products[prodIndex]);
        }
      }
      sale.stockDeducted = true;
      saveToStorage(STORAGE_KEYS.PRODUCTS, products);
    }

    // 2. Customer credit balance update if finalised and has remaining balance
    if (sale.status === 'finalised' && sale.remainingBalance > 0) {
      let contactIndex = -1;
      if (sale.customerId) {
        contactIndex = contacts.findIndex(c => c.id === sale.customerId);
      }
      if (contactIndex < 0 && sale.customerPhone && sale.customerPhone.trim()) {
        contactIndex = contacts.findIndex(c => c.phone && c.phone.trim() === sale.customerPhone!.trim());
      }
      if (contactIndex < 0 && sale.customerName && sale.customerName.trim() && sale.customerName !== 'Walk-in Customer' && sale.customerName !== 'Cash Customer') {
        contactIndex = contacts.findIndex(c => c.name.trim().toLowerCase() === sale.customerName.trim().toLowerCase());
      }

      if (contactIndex >= 0) {
        contacts[contactIndex].creditBalance += sale.remainingBalance;
        if (sale.customerPhone && !contacts[contactIndex].phone) {
          contacts[contactIndex].phone = sale.customerPhone;
        }
        sale.customerId = contacts[contactIndex].id;
        sale.customerName = contacts[contactIndex].name;
        this.notifyMutation('upsert', 'contacts', contacts[contactIndex].id, contacts[contactIndex]);
      } else {
        const effectiveName = (sale.customerName && sale.customerName !== 'Walk-in Customer' && sale.customerName !== 'Cash Customer')
          ? sale.customerName.trim()
          : `Customer (${sale.customerPhone ? sale.customerPhone : sale.billNumber})`;

        const newContact: Contact = {
          id: `cnt-${Date.now()}`,
          name: effectiveName,
          phone: sale.customerPhone || '',
          profession: 'customer',
          location: '',
          creditBalance: sale.remainingBalance,
          recordOrigin: 'user',
          isSample: false,
          notes: `Added from Udhar bill ${sale.billNumber} (${new Date().toLocaleDateString()})`,
          createdAt: new Date().toISOString()
        };
        contacts.unshift(newContact);
        sale.customerId = newContact.id;
        sale.customerName = effectiveName;
        this.notifyMutation('upsert', 'contacts', newContact.id, newContact);
      }
      saveToStorage(STORAGE_KEYS.CONTACTS, contacts);
    }

    const finalizedSale: Sale = {
      ...sale,
      recordOrigin: 'user',
      isSample: false,
    };

    if (existingIndex >= 0) {
      sales[existingIndex] = finalizedSale;
    } else {
      sales.unshift(finalizedSale);
    }
    saveToStorage(STORAGE_KEYS.SALES, sales);
    this.notifyMutation('upsert', 'sales', finalizedSale.id, finalizedSale);

    return { success: true, sale: finalizedSale };
  }

  /**
   * Cancel bill and restore stock + credit balance atomically
   */
  static cancelBill(saleId: string): { success: boolean; message: string } {
    const sales = this.getSales();
    const saleIndex = sales.findIndex(s => s.id === saleId);
    if (saleIndex < 0) return { success: false, message: 'Sale not found.' };

    const sale = sales[saleIndex];
    if (sale.status === 'cancelled') {
      return { success: false, message: 'Bill is already cancelled.' };
    }

    // Restore stock if previously deducted
    if (sale.stockDeducted && sale.items && sale.items.length > 0) {
      const products = this.getProducts();
      for (const item of sale.items) {
        const pIndex = products.findIndex(p => p.id === item.productId);
        if (pIndex >= 0) {
          products[pIndex].currentStock += item.quantity;
          products[pIndex].updatedAt = new Date().toISOString();
          this.notifyMutation('upsert', 'products', products[pIndex].id, products[pIndex]);
        }
      }
      saveToStorage(STORAGE_KEYS.PRODUCTS, products);
      sale.stockDeducted = false;
    }

    // Reverse customer credit if balance was pending
    if (sale.customerId && sale.remainingBalance > 0) {
      const contacts = this.getContacts();
      const cIndex = contacts.findIndex(c => c.id === sale.customerId);
      if (cIndex >= 0) {
        contacts[cIndex].creditBalance -= sale.remainingBalance;
        saveToStorage(STORAGE_KEYS.CONTACTS, contacts);
        this.notifyMutation('upsert', 'contacts', contacts[cIndex].id, contacts[cIndex]);
      }
    }

    sale.status = 'cancelled';
    sales[saleIndex] = sale;
    saveToStorage(STORAGE_KEYS.SALES, sales);
    this.notifyMutation('upsert', 'sales', sale.id, sale);

    return { success: true, message: 'Bill cancelled and stock restored successfully.' };
  }

  // --- CONTACTS ---
  static getContacts(): Contact[] {
    return loadFromStorage<Contact[]>(STORAGE_KEYS.CONTACTS, []);
  }

  static getContactById(id: string): Contact | undefined {
    return this.getContacts().find(c => c.id === id);
  }

  static saveContact(contact: Contact): void {
    const contacts = this.getContacts();
    const index = contacts.findIndex(c => c.id === contact.id);
    const updated: Contact = {
      ...contact,
      recordOrigin: 'user',
      isSample: false,
    };
    if (index >= 0) {
      contacts[index] = updated;
    } else {
      contacts.unshift(updated);
    }
    saveToStorage(STORAGE_KEYS.CONTACTS, contacts);
    this.notifyMutation('upsert', 'contacts', updated.id, updated);
  }

  static deleteContact(contactId: string): void {
    const contacts = this.getContacts().filter(c => c.id !== contactId);
    saveToStorage(STORAGE_KEYS.CONTACTS, contacts);
    this.notifyMutation('delete', 'contacts', contactId);
  }

  // --- PAYMENTS ---
  static getPayments(): Payment[] {
    return loadFromStorage<Payment[]>(STORAGE_KEYS.PAYMENTS, []);
  }

  static getInvoicePrefix(): string {
    const uid = currentNamespaceUid;
    const key = uid ? `ak_${uid}_invoice_prefix` : 'ak_invoice_prefix';
    return localStorage.getItem(key) || 'AK';
  }

  static generateNextBillNumber(customPrefix?: string): string {
    const prefix = customPrefix || this.getInvoicePrefix() || 'AK';
    const year = new Date().getFullYear();
    const sales = this.getSales();
    const countThisYear = sales.filter(s => {
      try {
        return new Date(s.date).getFullYear() === year;
      } catch {
        return false;
      }
    }).length;
    return generateBillNumber(prefix, countThisYear);
  }

  static recordPayment(payment: Payment): void {
    const payments = this.getPayments();
    const record: Payment = {
      ...payment,
      recordOrigin: 'user',
      isSample: false,
    };
    payments.unshift(record);
    saveToStorage(STORAGE_KEYS.PAYMENTS, payments);

    // Update contact balance and apply FIFO debt allocation across unpaid customer bills
    const contacts = this.getContacts();
    const cIndex = contacts.findIndex(c => c.id === payment.contactId);
    if (cIndex >= 0) {
      if (payment.type === 'customer_payment') {
        contacts[cIndex].creditBalance -= payment.amount;

        // FIFO invoice allocation: Settle oldest unpaid customer bills first (Decision 3)
        let unallocated = payment.amount;
        const sales = this.getSales();
        let salesUpdated = false;

        // Sort customer's finalised unpaid bills chronologically (oldest first)
        const customerUnpaidIndices = sales
          .map((s, idx) => ({ s, idx }))
          .filter(({ s }) => s.customerId === payment.contactId && s.status === 'finalised' && s.remainingBalance > 0)
          .sort((a, b) => new Date(a.s.date).getTime() - new Date(b.s.date).getTime());

        for (const { s, idx } of customerUnpaidIndices) {
          if (unallocated <= 0) break;
          const toApply = Math.min(unallocated, s.remainingBalance);
          s.amountReceived = Math.round((s.amountReceived + toApply) * 100) / 100;
          s.remainingBalance = Math.max(0, Math.round((s.remainingBalance - toApply) * 100) / 100);
          sales[idx] = s;
          salesUpdated = true;
          this.notifyMutation('upsert', 'sales', s.id, s);
          unallocated = Math.round((unallocated - toApply) * 100) / 100;
        }

        if (salesUpdated) {
          saveToStorage(STORAGE_KEYS.SALES, sales);
        }
      } else {
        contacts[cIndex].creditBalance += payment.amount;
      }
      saveToStorage(STORAGE_KEYS.CONTACTS, contacts);
      this.notifyMutation('upsert', 'contacts', contacts[cIndex].id, contacts[cIndex]);
    }

    this.notifyMutation('upsert', 'payments', record.id, record);
  }

  // --- EXPENSES ---
  static getExpenses(): Expense[] {
    return loadFromStorage<Expense[]>(STORAGE_KEYS.EXPENSES, []);
  }

  static recordExpense(expense: Expense): void {
    const expenses = this.getExpenses();
    const record: Expense = {
      ...expense,
      recordOrigin: 'user',
      isSample: false,
    };
    expenses.unshift(record);
    saveToStorage(STORAGE_KEYS.EXPENSES, expenses);
    this.notifyMutation('upsert', 'expenses', record.id, record);
  }

  static deleteExpense(expenseId: string): void {
    const expenses = this.getExpenses().filter(e => e.id !== expenseId);
    saveToStorage(STORAGE_KEYS.EXPENSES, expenses);
    this.notifyMutation('delete', 'expenses', expenseId);
  }

  // --- ESTIMATES ---
  static getEstimates(): MaterialEstimate[] {
    return loadFromStorage<MaterialEstimate[]>(STORAGE_KEYS.ESTIMATES, []);
  }

  static saveEstimate(estimate: MaterialEstimate): void {
    const estimates = this.getEstimates();
    const index = estimates.findIndex(e => e.id === estimate.id);
    const updated: MaterialEstimate = {
      ...estimate,
      recordOrigin: 'user',
      isSample: false,
    };
    if (index >= 0) {
      estimates[index] = updated;
    } else {
      estimates.unshift(updated);
    }
    saveToStorage(STORAGE_KEYS.ESTIMATES, estimates);
    this.notifyMutation('upsert', 'estimates', updated.id, updated);
  }

  static deleteEstimate(estimateId: string): void {
    const estimates = this.getEstimates().filter(e => e.id !== estimateId);
    saveToStorage(STORAGE_KEYS.ESTIMATES, estimates);
    this.notifyMutation('delete', 'estimates', estimateId);
  }

  // --- PROFESSIONALS ---
  static getProfessionals(): Professional[] {
    return loadFromStorage<Professional[]>(STORAGE_KEYS.PROFESSIONALS, []);
  }

  static saveProfessional(prof: Professional): void {
    const list = this.getProfessionals();
    const index = list.findIndex(p => p.id === prof.id);
    const updated: Professional = {
      ...prof,
      recordOrigin: 'user',
      isSample: false,
    };
    if (index >= 0) {
      list[index] = updated;
    } else {
      list.unshift(updated);
    }
    saveToStorage(STORAGE_KEYS.PROFESSIONALS, list);
    this.notifyMutation('upsert', 'professionals', updated.id, updated);
  }

  static deleteProfessional(profId: string): void {
    const list = this.getProfessionals().filter(p => p.id !== profId);
    saveToStorage(STORAGE_KEYS.PROFESSIONALS, list);
    this.notifyMutation('delete', 'professionals', profId);
  }

  /**
   * Bulk load authoritative dataset (used during initial cloud hydration)
   */
  static loadCustomData(data: {
    categories?: Category[];
    products?: Product[];
    sales?: Sale[];
    purchases?: Purchase[];
    contacts?: Contact[];
    payments?: Payment[];
    expenses?: Expense[];
    estimates?: MaterialEstimate[];
    professionals?: Professional[];
  }): void {
    if (data.categories) saveToStorage(STORAGE_KEYS.CATEGORIES, data.categories);
    if (data.products) saveToStorage(STORAGE_KEYS.PRODUCTS, data.products);
    if (data.sales) saveToStorage(STORAGE_KEYS.SALES, data.sales);
    if (data.purchases) saveToStorage(STORAGE_KEYS.PURCHASES, data.purchases);
    if (data.contacts) saveToStorage(STORAGE_KEYS.CONTACTS, data.contacts);
    if (data.payments) saveToStorage(STORAGE_KEYS.PAYMENTS, data.payments);
    if (data.expenses) saveToStorage(STORAGE_KEYS.EXPENSES, data.expenses);
    if (data.estimates) saveToStorage(STORAGE_KEYS.ESTIMATES, data.estimates);
    if (data.professionals) saveToStorage(STORAGE_KEYS.PROFESSIONALS, data.professionals);
    localStorage.setItem(getScopedKey(STORAGE_KEYS.INITIALIZED), 'true');
  }

  /**
   * Export full JSON backup
   */
  static exportBackupJSON(): string {
    const categories = this.getCategories();
    const products = this.getProducts();
    const sales = this.getSales();
    const purchases = this.getPurchases();
    const contacts = this.getContacts();
    const payments = this.getPayments();
    const expenses = this.getExpenses();
    const estimates = this.getEstimates();
    const professionals = this.getProfessionals();

    const backup = {
      version: '3.0',
      exportedAt: new Date().toISOString(),
      shopName: localStorage.getItem('ak_shop_name') || 'Hardware Store',
      shopAddress: localStorage.getItem('ak_shop_address') || '',
      shopPhone: localStorage.getItem('ak_shop_phone') || '',
      shopUpiId: localStorage.getItem('ak_shop_upi_id') || '',
      stats: {
        categoriesCount: categories.length,
        productsCount: products.length,
        salesCount: sales.length,
        purchasesCount: purchases.length,
        contactsCount: contacts.length,
        paymentsCount: payments.length,
        expensesCount: expenses.length,
        estimatesCount: estimates.length,
        professionalsCount: professionals.length,
      },
      categories,
      products,
      sales,
      purchases,
      contacts,
      payments,
      expenses,
      estimates,
      professionals,
    };
    return JSON.stringify(backup, null, 2);
  }

  /**
   * Reset local partition for current account
   */
  static factoryReset(): { success: boolean; error?: string } {
    try {
      const keys = Object.values(STORAGE_KEYS);
      for (const k of keys) {
        localStorage.removeItem(getScopedKey(k));
      }
      this.init();
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Failed to reset application.' };
    }
  }
}
