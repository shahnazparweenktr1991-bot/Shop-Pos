/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { ShopStorage } from './utils/storage';
import { cloudSync, AuthState } from './utils/cloudSync';
import { 
  Product, 
  Category, 
  Sale, 
  Purchase, 
  Contact, 
  Payment, 
  Expense, 
  MaterialEstimate,
  Professional
} from './types';
import { Header } from './components/Header';
import { BottomNav, NavTab } from './components/BottomNav';
import { DashboardView } from './components/DashboardView';
import { BillingView } from './components/BillingView';
import { ProductsView } from './components/ProductsView';
import { MaterialCalcView } from './components/MaterialCalcView';
import { DirectoryView } from './components/DirectoryView';
import { ContactsView } from './components/ContactsView';
import { ReportsView } from './components/ReportsView';
import { SettingsView } from './components/SettingsView';
import { InvoiceModal } from './components/InvoiceModal';
import { ResetModal } from './components/ResetModal';
import { InstallModal } from './components/InstallModal';
import { Trash2, AlertCircle, CheckCircle, X, ArrowDownToLine, Database } from 'lucide-react';
import { sounds } from './utils/sound';
import { voiceAssistant } from './utils/voiceAssistant';

export default function App() {
  // Authentication & Hydration State
  const [authStatus, setAuthStatus] = useState<AuthState>(cloudSync.getAuthStatus());
  const [isLegacyPromptOpen, setIsLegacyPromptOpen] = useState(false);
  const [clearingSample, setClearingSample] = useState(false);

  // Navigation & View state
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [billingInitialMode, setBillingInitialMode] = useState<'itemised' | 'amount_only'>('itemised');
  const [productFilterLowStock, setProductFilterLowStock] = useState<boolean>(false);
  const [viewingInvoice, setViewingInvoice] = useState<Sale | null>(null);
  const [isClearDemoModalOpen, setIsClearDemoModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<any>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Dark Mode Theme state with auto system matching
  const [themeMode, setThemeMode] = useState<'auto' | 'dark' | 'light'>(() => {
    try {
      const saved = localStorage.getItem('ak_theme_mode') as 'auto' | 'dark' | 'light' | null;
      if (saved) return saved;
      return 'auto';
    } catch {
      return 'auto';
    }
  });

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      const savedMode = localStorage.getItem('ak_theme_mode');
      if (savedMode === 'dark') return true;
      if (savedMode === 'light') return false;
      return typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const applyTheme = () => {
      let isDark = false;
      if (themeMode === 'dark') isDark = true;
      else if (themeMode === 'light') isDark = false;
      else if (typeof window !== 'undefined' && window.matchMedia) {
        isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      }
      setDarkMode(isDark);
      document.documentElement.classList.toggle('dark', isDark);
    };

    applyTheme();

    if (themeMode === 'auto' && typeof window !== 'undefined' && window.matchMedia) {
      const media = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = (e: MediaQueryListEvent) => {
        setDarkMode(e.matches);
        document.documentElement.classList.toggle('dark', e.matches);
      };
      media.addEventListener('change', listener);
      return () => media.removeEventListener('change', listener);
    }
  }, [themeMode]);

  const handleToggleDarkMode = () => {
    const nextDark = !darkMode;
    const nextMode = nextDark ? 'dark' : 'light';
    setThemeMode(nextMode);
    setDarkMode(nextDark);
    try {
      localStorage.setItem('ak_theme_mode', nextMode);
      localStorage.setItem('ak_dark_mode', String(nextDark));
    } catch {}
    document.documentElement.classList.toggle('dark', nextDark);
    sounds.playTap();
    setToastMessage(nextDark ? 'Dark Mode activated' : 'Light Mode activated');
  };

  // Customer Mode (Hide Buying Cost in front of customers)
  const [hideBuyingCost, setHideBuyingCost] = useState<boolean>(() => {
    try {
      return localStorage.getItem('ak_hide_buying_cost') === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleHideBuyingCost = () => {
    const next = !hideBuyingCost;
    setHideBuyingCost(next);
    try {
      localStorage.setItem('ak_hide_buying_cost', String(next));
    } catch {}
    sounds.playTap();
    setToastMessage(
      next
        ? 'Customer Mode ON: Buying/cost prices hidden'
        : 'Owner Mode ON: Buying/cost prices visible'
    );
  };

  // Database State
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [estimates, setEstimates] = useState<MaterialEstimate[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [hasDemoData, setHasDemoData] = useState<boolean>(false);

  // Auto-dismiss toast
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Synchronize state with storage and trigger background cloud sync if enabled
  const refreshAllState = useCallback(() => {
    setProducts(ShopStorage.getProducts());
    setCategories(ShopStorage.getCategories());
    setSales(ShopStorage.getSales());
    setPurchases(ShopStorage.getPurchases());
    setContacts(ShopStorage.getContacts());
    setPayments(ShopStorage.getPayments());
    setExpenses(ShopStorage.getExpenses());
    setEstimates(ShopStorage.getEstimates());
    setProfessionals(ShopStorage.getProfessionals());
    setHasDemoData(ShopStorage.hasDemoData());

    // Sync browser document title to configured shop name
    const configuredShopName = localStorage.getItem('ak_shop_name');
    if (configuredShopName) {
      document.title = configuredShopName;
    }

    // Auto sync to cloud if user is registered and logged in
    if (cloudSync.isLoggedIn() && cloudSync.isAutoSyncEnabled()) {
      cloudSync.pushToCloud().catch(() => {});
    }
  }, []);

  // Initialize on mount & subscribe to authoritative Auth State Machine
  useEffect(() => {
    ShopStorage.init();
    refreshAllState();

    // Subscribe to Firebase Auth state transitions
    const unsubAuth = cloudSync.subscribeAuth((user, status) => {
      setAuthStatus(status);
      refreshAllState();

      if (status === 'ready' && user) {
        // If un-migrated legacy local data exists on this phone, prompt the owner explicitly
        const hasLegacy = ShopStorage.hasLegacyUnscopedData();
        const alreadyMigrated = localStorage.getItem('ak_legacy_migrated_v2');
        if (hasLegacy && !alreadyMigrated) {
          setIsLegacyPromptOpen(true);
        }
      }
    });

    // Register live Firestore updates listener
    cloudSync.registerDataUpdateListener(() => {
      refreshAllState();
    });

    return () => {
      unsubAuth();
    };
  }, [refreshAllState]);

  // Capture PWA beforeinstallprompt event for phone installation
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleResetSuccess = () => {
    ShopStorage.init();
    refreshAllState();
    setToastMessage('Shop database reset successfully with dynamic verification code!');
  };

  // Handler: Finalise Bill with stock check
  const handleFinaliseBill = (sale: Sale): { success: boolean; error?: string } => {
    const res = ShopStorage.processBill(sale, true);
    if (res.success) {
      refreshAllState();
      setViewingInvoice(res.sale);
      setToastMessage(`Bill ${sale.billNumber} created successfully!`);
      sounds.playBillFinalised();
      voiceAssistant.announcePurchase(sale.customerName, sale.totalAmount);
      return { success: true };
    }
    sounds.playWarning();
    return { success: false, error: res.error };
  };

  // Handler: Save Draft Bill (without stock deduction)
  const handleSaveDraftBill = (sale: Sale) => {
    ShopStorage.processBill(sale, false);
    refreshAllState();
    setToastMessage(`Bill ${sale.billNumber} saved as draft.`);
  };

  // Handler: Cancel Bill (restoring stock)
  const handleCancelBill = (saleId: string) => {
    const res = ShopStorage.cancelBill(saleId);
    refreshAllState();
    setToastMessage(res.message);
  };

  // Handler: Product changes
  const handleSaveProduct = (product: Product) => {
    ShopStorage.saveProduct(product);
    refreshAllState();
  };

  const handleDeleteProduct = (productId: string) => {
    ShopStorage.deleteProduct(productId);
    refreshAllState();
  };

  // Handler: Category changes
  const handleSaveCategory = (category: Category) => {
    ShopStorage.saveCategory(category);
    refreshAllState();
  };

  const handleDeleteCategory = (categoryId: string) => {
    const res = ShopStorage.deleteCategory(categoryId);
    if (res.success) {
      refreshAllState();
    }
    return res;
  };

  // Handler: Record Purchase / Stock Replenishment
  const handleRecordPurchase = (purchase: Purchase) => {
    ShopStorage.recordPurchase(purchase);
    refreshAllState();
  };

  // Handler: Contacts & Khata
  const handleSaveContact = (contact: Contact) => {
    ShopStorage.saveContact(contact);
    refreshAllState();
  };

  const handleDeleteContact = (contactId: string) => {
    ShopStorage.deleteContact(contactId);
    refreshAllState();
  };

  const handleRecordPayment = (payment: Payment) => {
    ShopStorage.recordPayment(payment);
    refreshAllState();
    sounds.playPaymentSuccess();
    setToastMessage(`Payment of ₹${payment.amount} recorded successfully!`);
  };

  // Handler: Material Estimates
  const handleSaveEstimate = (estimate: MaterialEstimate) => {
    ShopStorage.saveEstimate(estimate);
    refreshAllState();
  };

  const handleDeleteEstimate = (estimateId: string) => {
    ShopStorage.deleteEstimate(estimateId);
    refreshAllState();
  };

  // Handler: Expenses
  const handleAddExpense = (expense: Expense) => {
    ShopStorage.recordExpense(expense);
    refreshAllState();
  };

  const handleDeleteExpense = (expenseId: string) => {
    ShopStorage.deleteExpense(expenseId);
    refreshAllState();
  };

  // Handler: Karigars & Local Professionals Directory
  const handleSaveProfessional = (prof: Professional) => {
    ShopStorage.saveProfessional(prof);
    refreshAllState();
  };

  const handleDeleteProfessional = (profId: string) => {
    ShopStorage.deleteProfessional(profId);
    refreshAllState();
  };

  // Safe Demo Data Management (Provenance-Based)
  const handleClearDemoData = () => {
    setIsClearDemoModalOpen(true);
  };

  const handleConfirmClearDemo = async () => {
    setClearingSample(true);
    try {
      const res = ShopStorage.clearDemoData();
      await cloudSync.clearCloudSampleData(res.sampleDocIds);
      refreshAllState();
      setIsClearDemoModalOpen(false);
      setToastMessage(`Cleared ${res.clearedTotal} sample records! Real shop data preserved.`);
      sounds.playPaymentSuccess();
    } catch (err: any) {
      setToastMessage('Error clearing sample records: ' + (err?.message || 'Try again'));
    } finally {
      setClearingSample(false);
    }
  };

  const handleMigrateLegacy = (mode: 'import' | 'dismiss') => {
    const res = ShopStorage.migrateLegacyDataToActiveAccount(mode);
    refreshAllState();
    setIsLegacyPromptOpen(false);
    if (mode === 'import') {
      setToastMessage(`Imported ${res.importedCount} local records into your account!`);
      sounds.playPaymentSuccess();
    } else {
      setToastMessage('Kept authoritative cloud database intact.');
    }
  };

  const handleLoadDemoData = () => {
    ShopStorage.loadDemoData();
    refreshAllState();
    setToastMessage('Realistic demo data loaded for testing.');
  };

  // Navigation helpers
  const handleNavigateToBill = (type: 'itemised' | 'amount_only') => {
    setBillingInitialMode(type);
    setCurrentTab('billing');
  };

  const handleViewLowStock = (filter?: 'low') => {
    setProductFilterLowStock(filter === 'low');
    setCurrentTab('products');
  };

  const lowStockCount = products.filter(p => p.currentStock <= p.minStock).length;

  if (authStatus === 'initializing') {
    return (
      <div className={`min-h-screen ${darkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'} flex flex-col items-center justify-center p-6 text-center select-none`}>
        <div className="w-16 h-16 rounded-3xl bg-amber-500 text-slate-950 flex items-center justify-center font-black text-2xl shadow-xl shadow-amber-500/20 mb-4 animate-bounce">
          AK
        </div>
        <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">A.K. Hardware & Tools</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs leading-relaxed">
          Verifying credentials and connecting shop database...
        </p>
        <div className="mt-6 flex items-center gap-2 text-xs font-semibold text-amber-600 dark:text-amber-400">
          <div className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
          <span>Connecting to cloud storage...</span>
        </div>
      </div>
    );
  }

  const sampleCounts = ShopStorage.getSampleCounts();

  return (
    <div className={`min-h-screen ${darkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'} flex flex-col font-sans antialiased selection:bg-amber-400 selection:text-slate-950 transition-colors duration-150`}>
      
      {/* Mobile Top Header */}
      <Header
        products={products}
        hideBuyingCost={hideBuyingCost}
        onToggleHideBuyingCost={handleToggleHideBuyingCost}
        onViewLowStock={() => handleViewLowStock('low')}
        onOpenReports={() => setCurrentTab('reports')}
        onOpenSettings={() => setCurrentTab('settings')}
        onOpenInstallModal={() => setIsInstallModalOpen(true)}
      />

      {/* Main Content View Container */}
      <main className="flex-1 w-full max-w-lg mx-auto">
        {currentTab === 'dashboard' && (
          <DashboardView
            products={products}
            sales={sales}
            contacts={contacts}
            onNewBill={handleNavigateToBill}
            onAddProduct={() => {
              setProductFilterLowStock(false);
              setCurrentTab('products');
            }}
            onOpenCalculator={() => setCurrentTab('calculator')}
            onOpenKhata={() => setCurrentTab('contacts')}
            onOpenRestock={() => {
              setProductFilterLowStock(false);
              setCurrentTab('products');
            }}
            onViewProductStock={handleViewLowStock}
            onViewSale={(sale) => setViewingInvoice(sale)}
            onOpenReports={() => setCurrentTab('reports')}
            onOpenDirectory={() => setCurrentTab('directory')}
          />
        )}

        {currentTab === 'billing' && (
          <BillingView
            products={products}
            contacts={contacts}
            sales={sales}
            initialMode={billingInitialMode}
            hideBuyingCost={hideBuyingCost}
            onToggleHideBuyingCost={handleToggleHideBuyingCost}
            onFinaliseBill={handleFinaliseBill}
            onSaveDraftBill={handleSaveDraftBill}
            onViewReceipt={(sale) => setViewingInvoice(sale)}
            onCancelBill={handleCancelBill}
          />
        )}

        {currentTab === 'products' && (
          <ProductsView
            products={products}
            categories={categories}
            contacts={contacts}
            hideBuyingCost={hideBuyingCost}
            onToggleHideBuyingCost={handleToggleHideBuyingCost}
            onSaveProduct={handleSaveProduct}
            onDeleteProduct={handleDeleteProduct}
            onSaveCategory={handleSaveCategory}
            onDeleteCategory={handleDeleteCategory}
            onRecordPurchase={handleRecordPurchase}
            filterLowStockInitial={productFilterLowStock}
          />
        )}

        {currentTab === 'directory' && (
          <DirectoryView
            professionals={professionals}
            onSaveProfessional={handleSaveProfessional}
            onDeleteProfessional={handleDeleteProfessional}
            showToast={(msg) => setToastMessage(msg)}
          />
        )}

        {currentTab === 'calculator' && (
          <MaterialCalcView
            savedEstimates={estimates}
            onSaveEstimate={handleSaveEstimate}
            onDeleteEstimate={handleDeleteEstimate}
          />
        )}

        {currentTab === 'contacts' && (
          <ContactsView
            contacts={contacts}
            sales={sales}
            purchases={purchases}
            payments={payments}
            onSaveContact={handleSaveContact}
            onDeleteContact={handleDeleteContact}
            onRecordPayment={handleRecordPayment}
          />
        )}

        {currentTab === 'reports' && (
          <ReportsView
            sales={sales}
            expenses={expenses}
            products={products}
            onAddExpense={handleAddExpense}
            onDeleteExpense={handleDeleteExpense}
            onViewProductStock={handleViewLowStock}
          />
        )}

        {currentTab === 'settings' && (
          <SettingsView
            darkMode={darkMode}
            onToggleDarkMode={handleToggleDarkMode}
            hideBuyingCost={hideBuyingCost}
            onToggleHideBuyingCost={handleToggleHideBuyingCost}
            hasDemoData={hasDemoData}
            onClearDemoData={handleClearDemoData}
            onLoadDemoData={handleLoadDemoData}
            onOpenResetModal={() => setIsResetModalOpen(true)}
            onOpenInstallModal={() => setIsInstallModalOpen(true)}
            onDataRefresh={refreshAllState}
            showToast={(msg) => setToastMessage(msg)}
          />
        )}
      </main>

      {/* Invoice Modal Popup (when bill created or clicked) */}
      {viewingInvoice && (
        <InvoiceModal
          sale={viewingInvoice}
          onClose={() => setViewingInvoice(null)}
          onCancelBill={handleCancelBill}
        />
      )}

      {/* In-App Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 max-w-sm w-[90%] bg-slate-900 text-white px-4 py-2.5 rounded-2xl shadow-2xl border border-slate-700 flex items-center justify-between gap-2 text-xs font-semibold animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button 
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-white p-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Safe Clear Sample Records Modal (Provenance-Based) */}
      {isClearDemoModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in fade-in zoom-in-95">
            {sampleCounts.total === 0 ? (
              <>
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="text-center space-y-1.5">
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">No Sample Data to Clear</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    All existing records belong to your genuine shop inventory, bills, and customers. No demonstration records exist in your database.
                  </p>
                </div>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setIsClearDemoModalOpen(false)}
                    className="w-full py-2.5 px-4 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    Got It (Keep Records Safe)
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center mx-auto">
                  <Trash2 className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                </div>

                <div className="text-center space-y-1">
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    Clear {sampleCounts.total} Sample Records?
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    This will remove only positively identified demo records so you can start clean:
                  </p>
                </div>

                {/* Itemized breakdown by type */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700/60 space-y-1 text-xs">
                  {sampleCounts.products > 0 && (
                    <div className="flex justify-between py-0.5">
                      <span className="text-slate-600 dark:text-slate-300">Demo Products:</span>
                      <span className="font-bold text-slate-900 dark:text-white">{sampleCounts.products} items</span>
                    </div>
                  )}
                  {sampleCounts.sales > 0 && (
                    <div className="flex justify-between py-0.5">
                      <span className="text-slate-600 dark:text-slate-300">Demo Invoices:</span>
                      <span className="font-bold text-slate-900 dark:text-white">{sampleCounts.sales} bills</span>
                    </div>
                  )}
                  {sampleCounts.contacts > 0 && (
                    <div className="flex justify-between py-0.5">
                      <span className="text-slate-600 dark:text-slate-300">Demo Customers/Suppliers:</span>
                      <span className="font-bold text-slate-900 dark:text-white">{sampleCounts.contacts} contacts</span>
                    </div>
                  )}
                  {sampleCounts.purchases > 0 && (
                    <div className="flex justify-between py-0.5">
                      <span className="text-slate-600 dark:text-slate-300">Demo Purchases:</span>
                      <span className="font-bold text-slate-900 dark:text-white">{sampleCounts.purchases} records</span>
                    </div>
                  )}
                  {sampleCounts.professionals > 0 && (
                    <div className="flex justify-between py-0.5">
                      <span className="text-slate-600 dark:text-slate-300">Demo Directory Craftsmen:</span>
                      <span className="font-bold text-slate-900 dark:text-white">{sampleCounts.professionals} contacts</span>
                    </div>
                  )}
                </div>

                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold text-center">
                  All real products, genuine customer debts, and actual bills you entered are 100% safe.
                </p>

                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button
                    type="button"
                    disabled={clearingSample}
                    onClick={() => setIsClearDemoModalOpen(false)}
                    className="py-2.5 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Keep Demo
                  </button>
                  <button
                    type="button"
                    disabled={clearingSample}
                    onClick={handleConfirmClearDemo}
                    className="py-2.5 px-3 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 rounded-xl text-xs font-black shadow-md transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {clearingSample ? 'Clearing...' : `Delete ${sampleCounts.total} Samples`}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Explicit Legacy Local Data Migration Modal */}
      {isLegacyPromptOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 flex items-center justify-center mx-auto">
              <ArrowDownToLine className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Local Records Found</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                We detected previously saved products or customer records on this phone. Would you like to import them into your authenticated shop account?
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleMigrateLegacy('dismiss')}
                className="py-2.5 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Start Fresh
              </button>
              <button
                type="button"
                onClick={() => handleMigrateLegacy('import')}
                className="py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-md transition-colors cursor-pointer"
              >
                Import to Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Master Factory Reset Modal (Requires password Atif@1979) */}
      <ResetModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        onResetSuccess={handleResetSuccess}
      />

      {/* Install Phone App PWA Modal */}
      <InstallModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
        deferredPrompt={deferredInstallPrompt}
        onInstalled={() => setDeferredInstallPrompt(null)}
      />

      {/* Bottom Thumb Navigation Bar with Settings tab */}
      <BottomNav
        currentTab={currentTab}
        onTabChange={(tab) => {
          if (tab === 'products') setProductFilterLowStock(false);
          setCurrentTab(tab);
        }}
        lowStockCount={lowStockCount}
      />
    </div>
  );
}
