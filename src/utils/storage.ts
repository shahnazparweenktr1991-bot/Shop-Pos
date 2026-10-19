import { 
  Category, 
  Product, 
  Sale, 
  Purchase, 
  Contact, 
  Payment, 
  Expense, 
  MaterialEstimate,
  SaleItem,
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

const STORAGE_KEYS = {
  CATEGORIES: 'hsm_categories_v1',
  PRODUCTS: 'hsm_products_v1',
  SALES: 'hsm_sales_v1',
  PURCHASES: 'hsm_purchases_v1',
  CONTACTS: 'hsm_contacts_v1',
  PAYMENTS: 'hsm_payments_v1',
  EXPENSES: 'hsm_expenses_v1',
  ESTIMATES: 'hsm_estimates_v1',
  PROFESSIONALS: 'hsm_professionals_v1',
  INITIALIZED: 'hsm_initialized_v1',
};

// Safe per-user account key resolver to prevent cross-account data leakage
function getScopedKey(baseKey: string): string {
  try {
    const activeUid = localStorage.getItem('ak_auth_token_v1');
    if (activeUid && activeUid.trim()) {
      return `${baseKey}_${activeUid.trim()}`;
    }
  } catch {}
  return baseKey;
}

// Safe JSON loader with automatic legacy migration
function loadFromStorage<T>(baseKey: string, fallback: T): T {
  try {
    const scopedKey = getScopedKey(baseKey);
    let item = localStorage.getItem(scopedKey);
    // If not found in scoped key and we are signed into an account, migrate un-scoped legacy records
    if (!item && scopedKey !== baseKey) {
      const legacyItem = localStorage.getItem(baseKey);
      if (legacyItem) {
        localStorage.setItem(scopedKey, legacyItem);
        item = legacyItem;
      }
    }
    if (!item) return fallback;
    return JSON.parse(item) as T;
  } catch (err) {
    console.error(`Failed to load ${baseKey} from storage:`, err);
    return fallback;
  }
}

// Safe JSON writer to scoped storage
function saveToStorage<T>(baseKey: string, data: T): void {
  try {
    const scopedKey = getScopedKey(baseKey);
    localStorage.setItem(scopedKey, JSON.stringify(data));
  } catch (err) {
    console.error(`Failed to save ${baseKey} to storage:`, err);
  }
}

export class ShopStorage {
  // Check if initial sample data should be populated
  static init(): void {
    const isInit = localStorage.getItem(STORAGE_KEYS.INITIALIZED);
    if (!isInit) {
      this.loadDemoData();
      localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
    } else {
      // Ensure professionals/karigars are populated if existing storage was initialized prior
      const profs = this.getProfessionals();
      if (!profs || profs.length === 0) {
        saveToStorage(STORAGE_KEYS.PROFESSIONALS, SAMPLE_PROFESSIONALS);
      }
    }
  }

  // Load / Reload demo data (adds sample items)
  static loadDemoData(): void {
    // Preserve existing real (non-sample) records, merge or set sample records
    const existingCategories = this.getCategories().filter(c => !c.isSample);
    const existingContacts = this.getContacts().filter(c => !c.isSample);
    const existingProducts = this.getProducts().filter(p => !p.isSample);
    const existingSales = this.getSales().filter(s => !s.isSample);
    const existingPurchases = this.getPurchases().filter(p => !p.isSample);
    const existingPayments = this.getPayments().filter(p => !p.isSample);
    const existingExpenses = this.getExpenses().filter(e => !e.isSample);
    const existingEstimates = this.getEstimates().filter(e => !e.isSample);
    const existingProfessionals = this.getProfessionals().filter(p => !p.isSample);

    saveToStorage(STORAGE_KEYS.CATEGORIES, [...SAMPLE_CATEGORIES, ...existingCategories]);
    saveToStorage(STORAGE_KEYS.CONTACTS, [...SAMPLE_CONTACTS, ...existingContacts]);
    saveToStorage(STORAGE_KEYS.PRODUCTS, [...SAMPLE_PRODUCTS, ...existingProducts]);
    saveToStorage(STORAGE_KEYS.SALES, [...SAMPLE_SALES, ...existingSales]);
    saveToStorage(STORAGE_KEYS.PURCHASES, [...SAMPLE_PURCHASES, ...existingPurchases]);
    saveToStorage(STORAGE_KEYS.PAYMENTS, [...SAMPLE_PAYMENTS, ...existingPayments]);
    saveToStorage(STORAGE_KEYS.EXPENSES, [...SAMPLE_EXPENSES, ...existingExpenses]);
    saveToStorage(STORAGE_KEYS.ESTIMATES, [...SAMPLE_ESTIMATES, ...existingEstimates]);
    saveToStorage(STORAGE_KEYS.PROFESSIONALS, [...SAMPLE_PROFESSIONALS, ...existingProfessionals]);
  }

  // Remove all demo/sample records, leaving only real shop records
  static clearDemoData(): void {
    const isSampleId = (id: string) => {
      const sampleIds = [
        'prod-1', 'prod-2', 'prod-3', 'prod-4', 'prod-5', 'prod-6', 
        'prod-7', 'prod-8', 'prod-9', 'prod-10', 'prod-11', 'prod-12',
        'cnt-1', 'cnt-2', 'cnt-3', 'cnt-4', 'cnt-5', 'cnt-6', 'cnt-7',
        'sale-101', 'sale-102', 'sale-103',
        'pur-101', 'pur-102',
        'pay-1', 'pay-2',
        'exp-1', 'exp-2', 'exp-3',
        'est-1'
      ];
      return sampleIds.includes(id);
    };

    const realCategories = this.getCategories().filter(c => !c.isSample);
    const realContacts = this.getContacts().filter(c => !c.isSample && !isSampleId(c.id));
    const realProducts = this.getProducts().filter(p => !p.isSample && !isSampleId(p.id));
    const realSales = this.getSales().filter(s => !s.isSample && !isSampleId(s.id));
    const realPurchases = this.getPurchases().filter(p => !p.isSample && !isSampleId(p.id));
    const realPayments = this.getPayments().filter(p => !p.isSample && !isSampleId(p.id));
    const realExpenses = this.getExpenses().filter(e => !e.isSample && !isSampleId(e.id));
    const realEstimates = this.getEstimates().filter(e => !e.isSample && !isSampleId(e.id));
    const realProfessionals = this.getProfessionals().filter(p => !p.isSample && !p.id.startsWith('prof-'));

    // Keep core categories if user hasn't created their own yet
    const fallbackCategories: Category[] = realCategories.length > 0 ? realCategories : [
      { id: 'cat-paint', name: 'Paint', createdAt: new Date().toISOString() },
      { id: 'cat-primer', name: 'Primer', createdAt: new Date().toISOString() },
      { id: 'cat-putty', name: 'Putty', createdAt: new Date().toISOString() },
      { id: 'cat-pop', name: 'POP', createdAt: new Date().toISOString() },
      { id: 'cat-adhesive', name: 'Adhesive', createdAt: new Date().toISOString() },
      { id: 'cat-plumbing', name: 'Plumbing', createdAt: new Date().toISOString() },
      { id: 'cat-electrical', name: 'Electrical', createdAt: new Date().toISOString() },
      { id: 'cat-hardware', name: 'Hardware', createdAt: new Date().toISOString() },
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
  }

  static hasDemoData(): boolean {
    const products = this.getProducts();
    const contacts = this.getContacts();
    const sales = this.getSales();
    const sampleIds = ['prod-1', 'cnt-1', 'sale-101'];
    return products.some(p => p.isSample || sampleIds.includes(p.id)) ||
           contacts.some(c => c.isSample || sampleIds.includes(c.id)) ||
           sales.some(s => s.isSample || sampleIds.includes(s.id));
  }

  // CATEGORIES
  static getCategories(): Category[] {
    return loadFromStorage<Category[]>(STORAGE_KEYS.CATEGORIES, []);
  }

  static saveCategory(category: Category): void {
    const categories = this.getCategories();
    const index = categories.findIndex(c => c.id === category.id);
    if (index >= 0) {
      categories[index] = category;
    } else {
      categories.push(category);
    }
    saveToStorage(STORAGE_KEYS.CATEGORIES, categories);
  }

  static deleteCategory(categoryId: string): { success: boolean; message?: string } {
    const products = this.getProducts();
    const isUsed = products.some(p => p.categoryId === categoryId);
    if (isUsed) {
      return { success: false, message: 'Cannot delete: Products are still assigned to this category.' };
    }
    const categories = this.getCategories().filter(c => c.id !== categoryId);
    saveToStorage(STORAGE_KEYS.CATEGORIES, categories);
    return { success: true };
  }

  // PRODUCTS
  static getProducts(): Product[] {
    return loadFromStorage<Product[]>(STORAGE_KEYS.PRODUCTS, []);
  }

  static getProductById(id: string): Product | undefined {
    return this.getProducts().find(p => p.id === id);
  }

  static saveProduct(product: Product): void {
    const products = this.getProducts();
    const index = products.findIndex(p => p.id === product.id);
    if (index >= 0) {
      products[index] = { ...product, updatedAt: new Date().toISOString() };
    } else {
      products.unshift({ ...product, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }
    saveToStorage(STORAGE_KEYS.PRODUCTS, products);
  }

  static deleteProduct(productId: string): void {
    const products = this.getProducts().filter(p => p.id !== productId);
    saveToStorage(STORAGE_KEYS.PRODUCTS, products);
  }

  // PURCHASES / RESTOCKING
  static getPurchases(): Purchase[] {
    return loadFromStorage<Purchase[]>(STORAGE_KEYS.PURCHASES, []);
  }

  static recordPurchase(purchase: Purchase): void {
    const purchases = this.getPurchases();
    purchases.unshift(purchase);
    saveToStorage(STORAGE_KEYS.PURCHASES, purchases);

    // Increase product stock
    const products = this.getProducts();
    const prodIndex = products.findIndex(p => p.id === purchase.productId);
    if (prodIndex >= 0) {
      products[prodIndex].currentStock += purchase.quantity;
      products[prodIndex].purchasePrice = purchase.purchasePrice; // update latest cost
      products[prodIndex].updatedAt = new Date().toISOString();
      saveToStorage(STORAGE_KEYS.PRODUCTS, products);
    }

    // If purchase has an unpaid balance and a supplier is specified, update supplier dues (negative balance = we owe them)
    if (purchase.supplierId && purchase.remainingBalance > 0) {
      const contacts = this.getContacts();
      const contactIndex = contacts.findIndex(c => c.id === purchase.supplierId);
      if (contactIndex >= 0) {
        contacts[contactIndex].creditBalance -= purchase.remainingBalance;
        saveToStorage(STORAGE_KEYS.CONTACTS, contacts);
      }
    }
  }

  // SALES / BILLING
  static getSales(): Sale[] {
    return loadFromStorage<Sale[]>(STORAGE_KEYS.SALES, []);
  }

  static getSaleById(id: string): Sale | undefined {
    return this.getSales().find(s => s.id === id);
  }

  /**
   * Finalises or creates a bill with strict inventory validation.
   * If itemised:
   *  - Checks stock availability (unless allowNegativeStock is explicitly allowed).
   *  - Deducts sold quantities exactly once.
   *  - Updates customer credit if unpaid balance.
   * If amount-only:
   *  - Deducts zero stock.
   *  - Records transaction amount and customer balance if applicable.
   */
  static processBill(
    sale: Sale, 
    preventNegativeStock: boolean = true
  ): { success: boolean; error?: string; sale: Sale } {
    const products = this.getProducts();
    const contacts = this.getContacts();

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
        }
      }
      sale.stockDeducted = true;
      saveToStorage(STORAGE_KEYS.PRODUCTS, products);
    }

    // 2. Customer credit balance update if finalised and has remaining due (Udhaar)
    if (sale.status === 'finalised' && sale.remainingBalance > 0) {
      let contactIndex = -1;

      if (sale.customerId) {
        contactIndex = contacts.findIndex(c => c.id === sale.customerId);
      }
      
      // If not found by ID, try matching by phone or exact name
      if (contactIndex < 0 && sale.customerPhone && sale.customerPhone.trim()) {
        contactIndex = contacts.findIndex(c => c.phone && c.phone.trim() === sale.customerPhone!.trim());
      }

      if (contactIndex < 0 && sale.customerName && sale.customerName.trim() && sale.customerName !== 'Walk-in Customer' && sale.customerName !== 'Cash Customer') {
        contactIndex = contacts.findIndex(c => c.name.trim().toLowerCase() === sale.customerName.trim().toLowerCase());
      }

      if (contactIndex >= 0) {
        // Customer owes us the remaining balance
        contacts[contactIndex].creditBalance += sale.remainingBalance;
        if (sale.customerPhone && !contacts[contactIndex].phone) {
          contacts[contactIndex].phone = sale.customerPhone;
        }
        sale.customerId = contacts[contactIndex].id;
        sale.customerName = contacts[contactIndex].name;
      } else {
        // Automatically create customer record so Udhar is immediately visible in Khata
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
          notes: `Added from Udhar bill ${sale.billNumber} (${new Date().toLocaleDateString()})`,
          createdAt: new Date().toISOString()
        };
        contacts.unshift(newContact);
        sale.customerId = newContact.id;
        sale.customerName = effectiveName;
      }
      saveToStorage(STORAGE_KEYS.CONTACTS, contacts);
    }

    // Save or update sale
    const sales = this.getSales();
    const existingIndex = sales.findIndex(s => s.id === sale.id);
    if (existingIndex >= 0) {
      sales[existingIndex] = sale;
    } else {
      sales.unshift(sale);
    }
    saveToStorage(STORAGE_KEYS.SALES, sales);

    return { success: true, sale };
  }

  /**
   * Reset all app data for current account.
   * Authorized by ResetModal via Firebase reauthentication + dynamic verification code.
   */
  static factoryReset(): { success: boolean; error?: string } {
    try {
      const keys = Object.values(STORAGE_KEYS);
      for (const k of keys) {
        localStorage.removeItem(k);
        const scopedKey = getScopedKey(k);
        if (scopedKey !== k) {
          localStorage.removeItem(scopedKey);
        }
      }

      // Re-initialize starter state
      this.init();
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Failed to reset application.' };
    }
  }

  /**
   * Cancel a bill.
   * If stock was deducted, restores it back to inventory exactly once.
   * If customer credit was applied, reverses it.
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
      }
    }

    sale.status = 'cancelled';
    sales[saleIndex] = sale;
    saveToStorage(STORAGE_KEYS.SALES, sales);

    return { success: true, message: 'Bill cancelled and stock restored successfully.' };
  }

  // CONTACTS & KHATA (CREDIT)
  static getContacts(): Contact[] {
    return loadFromStorage<Contact[]>(STORAGE_KEYS.CONTACTS, []);
  }

  static getContactById(id: string): Contact | undefined {
    return this.getContacts().find(c => c.id === id);
  }

  static saveContact(contact: Contact): void {
    const contacts = this.getContacts();
    const index = contacts.findIndex(c => c.id === contact.id);
    if (index >= 0) {
      contacts[index] = contact;
    } else {
      contacts.unshift(contact);
    }
    saveToStorage(STORAGE_KEYS.CONTACTS, contacts);
  }

  static deleteContact(contactId: string): void {
    const contacts = this.getContacts().filter(c => c.id !== contactId);
    saveToStorage(STORAGE_KEYS.CONTACTS, contacts);
  }

  // PAYMENTS
  static getPayments(): Payment[] {
    return loadFromStorage<Payment[]>(STORAGE_KEYS.PAYMENTS, []);
  }

  static recordPayment(payment: Payment): void {
    const payments = this.getPayments();
    payments.unshift(payment);
    saveToStorage(STORAGE_KEYS.PAYMENTS, payments);

    // Update contact balance
    const contacts = this.getContacts();
    const cIndex = contacts.findIndex(c => c.id === payment.contactId);
    if (cIndex >= 0) {
      if (payment.type === 'customer_payment') {
        // Customer paid us -> decreases their outstanding debit
        contacts[cIndex].creditBalance -= payment.amount;
      } else {
        // We paid supplier -> reduces our debt (makes creditBalance less negative)
        contacts[cIndex].creditBalance += payment.amount;
      }
      saveToStorage(STORAGE_KEYS.CONTACTS, contacts);
    }
  }

  // EXPENSES
  static getExpenses(): Expense[] {
    return loadFromStorage<Expense[]>(STORAGE_KEYS.EXPENSES, []);
  }

  static recordExpense(expense: Expense): void {
    const expenses = this.getExpenses();
    expenses.unshift(expense);
    saveToStorage(STORAGE_KEYS.EXPENSES, expenses);
  }

  static deleteExpense(expenseId: string): void {
    const expenses = this.getExpenses().filter(e => e.id !== expenseId);
    saveToStorage(STORAGE_KEYS.EXPENSES, expenses);
  }

  // MATERIAL ESTIMATES
  static getEstimates(): MaterialEstimate[] {
    return loadFromStorage<MaterialEstimate[]>(STORAGE_KEYS.ESTIMATES, []);
  }

  static saveEstimate(estimate: MaterialEstimate): void {
    const estimates = this.getEstimates();
    const index = estimates.findIndex(e => e.id === estimate.id);
    if (index >= 0) {
      estimates[index] = estimate;
    } else {
      estimates.unshift(estimate);
    }
    saveToStorage(STORAGE_KEYS.ESTIMATES, estimates);
  }

  static deleteEstimate(estimateId: string): void {
    const estimates = this.getEstimates().filter(e => e.id !== estimateId);
    saveToStorage(STORAGE_KEYS.ESTIMATES, estimates);
  }

  // PROFESSIONALS & CRAFTSMEN DIRECTORY
  static getProfessionals(): Professional[] {
    return loadFromStorage<Professional[]>(STORAGE_KEYS.PROFESSIONALS, []);
  }

  static getProfessionalById(id: string): Professional | undefined {
    return this.getProfessionals().find(p => p.id === id);
  }

  static saveProfessional(prof: Professional): void {
    const list = this.getProfessionals();
    const index = list.findIndex(p => p.id === prof.id);
    if (index >= 0) {
      list[index] = prof;
    } else {
      list.unshift(prof);
    }
    saveToStorage(STORAGE_KEYS.PROFESSIONALS, list);
  }

  static deleteProfessional(profId: string): void {
    const list = this.getProfessionals().filter(p => p.id !== profId);
    saveToStorage(STORAGE_KEYS.PROFESSIONALS, list);
  }

  // Load custom dataset (used for cloud sync and JSON import)
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
    localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
  }

  // Export full JSON database for local or cloud backup
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
      version: '2.2',
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

  // Inspect and preview a backup file before importing
  static inspectBackupJSON(jsonString: string): {
    isValid: boolean;
    error?: string;
    details?: {
      version: string;
      exportedAt: string;
      shopName: string;
      productsCount: number;
      salesCount: number;
      contactsCount: number;
      categoriesCount: number;
      professionalsCount: number;
      parsedData: any;
    };
  } {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed || typeof parsed !== 'object') {
        return { isValid: false, error: 'File is not a valid JSON database.' };
      }

      const products = Array.isArray(parsed.products) ? parsed.products : [];
      const sales = Array.isArray(parsed.sales) ? parsed.sales : [];
      const contacts = Array.isArray(parsed.contacts) ? parsed.contacts : [];
      const categories = Array.isArray(parsed.categories) ? parsed.categories : [];
      const professionals = Array.isArray(parsed.professionals) ? parsed.professionals : [];

      if (products.length === 0 && sales.length === 0 && contacts.length === 0) {
        return { isValid: false, error: 'Backup file contains no recognizable shop records.' };
      }

      return {
        isValid: true,
        details: {
          version: parsed.version || '1.0',
          exportedAt: parsed.exportedAt || new Date().toISOString(),
          shopName: parsed.shopName || 'Unknown Store',
          productsCount: products.length,
          salesCount: sales.length,
          contactsCount: contacts.length,
          categoriesCount: categories.length,
          professionalsCount: professionals.length,
          parsedData: parsed,
        },
      };
    } catch (err: any) {
      return { isValid: false, error: err?.message || 'Failed to parse JSON backup.' };
    }
  }

  // Import JSON database backup with either 'merge' or 'replace' mode
  static importBackupJSON(jsonString: string, mode: 'merge' | 'replace' = 'replace'): { success: boolean; error?: string } {
    try {
      const inspect = this.inspectBackupJSON(jsonString);
      if (!inspect.isValid || !inspect.details) {
        return { success: false, error: inspect.error || 'Invalid backup file.' };
      }

      const data = inspect.details.parsedData;

      if (mode === 'replace') {
        // Complete point-in-time replacement
        this.loadCustomData(data);
      } else {
        // Intelligent merge: combine existing items with backup items using ID matching
        const mergeArrays = <T extends { id: string }>(current: T[], incoming?: T[]): T[] => {
          if (!incoming || !Array.isArray(incoming)) return current;
          const map = new Map<string, T>();
          current.forEach(item => map.set(item.id, item));
          incoming.forEach(item => {
            // Incoming item updates or adds
            map.set(item.id, item);
          });
          return Array.from(map.values());
        };

        const mergedCategories = mergeArrays(this.getCategories(), data.categories);
        const mergedProducts = mergeArrays(this.getProducts(), data.products);
        const mergedSales = mergeArrays(this.getSales(), data.sales);
        const mergedPurchases = mergeArrays(this.getPurchases(), data.purchases);
        const mergedContacts = mergeArrays(this.getContacts(), data.contacts);
        const mergedPayments = mergeArrays(this.getPayments(), data.payments);
        const mergedExpenses = mergeArrays(this.getExpenses(), data.expenses);
        const mergedEstimates = mergeArrays(this.getEstimates(), data.estimates);
        const mergedProfessionals = mergeArrays(this.getProfessionals(), data.professionals);

        this.loadCustomData({
          categories: mergedCategories,
          products: mergedProducts,
          sales: mergedSales,
          purchases: mergedPurchases,
          contacts: mergedContacts,
          payments: mergedPayments,
          expenses: mergedExpenses,
          estimates: mergedEstimates,
          professionals: mergedProfessionals,
        });
      }

      if (data.shopName && mode === 'replace') {
        localStorage.setItem('ak_shop_name', data.shopName);
      }
      if (data.shopAddress && mode === 'replace') {
        localStorage.setItem('ak_shop_address', data.shopAddress);
      }
      if (data.shopPhone && mode === 'replace') {
        localStorage.setItem('ak_shop_phone', data.shopPhone);
      }
      if (data.shopUpiId && mode === 'replace') {
        localStorage.setItem('ak_shop_upi_id', data.shopUpiId);
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to import backup.' };
    }
  }

  // Export tables as clean Excel-compatible CSV with UTF-8 BOM
  static exportCSV(type: 'products' | 'sales' | 'contacts'): string {
    const escapeCsv = (val: any): string => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    let headers: string[] = [];
    let rows: string[][] = [];

    if (type === 'products') {
      headers = [
        'Item ID',
        'Product Name',
        'Brand',
        'Item Code',
        'Category ID',
        'Buying Price (INR)',
        'Selling Price (INR)',
        'Current Stock',
        'Unit',
        'Min Stock Alert'
      ];
      const products = this.getProducts();
      rows = products.map(p => [
        p.id,
        p.name,
        p.brand || '',
        p.code || '',
        p.categoryId,
        String(p.purchasePrice || 0),
        String(p.sellingPrice || 0),
        String(p.currentStock || 0),
        p.unit,
        String(p.minStock || 0)
      ]);
    } else if (type === 'sales') {
      headers = [
        'Sale ID',
        'Bill Number',
        'Date & Time',
        'Customer Name',
        'Customer Phone',
        'Payment Method',
        'Subtotal (INR)',
        'Discount (INR)',
        'Total Amount (INR)',
        'Amount Received (INR)',
        'Pending Balance (INR)',
        'Items Count',
        'Notes'
      ];
      const sales = this.getSales();
      rows = sales.map(s => [
        s.id,
        s.billNumber || '',
        s.createdAt || s.date || '',
        s.customerName,
        s.customerPhone || '',
        s.paymentMethod,
        String(s.subtotal || 0),
        String(s.discount || 0),
        String(s.totalAmount || 0),
        String(s.amountReceived || 0),
        String(s.remainingBalance || 0),
        String(s.items?.length || 0),
        s.notes || ''
      ]);
    } else if (type === 'contacts') {
      headers = [
        'Contact ID',
        'Full Name',
        'Phone Number',
        'Alternate Phone',
        'Profession / Role',
        'Credit Balance / Udhar (INR)',
        'Location / Address',
        'GST Number',
        'Created Date'
      ];
      const contacts = this.getContacts();
      rows = contacts.map(c => [
        c.id,
        c.name,
        c.phone,
        c.alternatePhone || '',
        c.profession,
        String(c.creditBalance || 0),
        c.address || c.location || '',
        c.gstNumber || '',
        c.createdAt || ''
      ]);
    }

    const bom = '\uFEFF';
    const csvContent = [
      headers.map(escapeCsv).join(','),
      ...rows.map(row => row.map(escapeCsv).join(','))
    ].join('\r\n');

    return bom + csvContent;
  }
}

