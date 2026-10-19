import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  CheckCircle, 
  Zap, 
  Receipt, 
  User, 
  AlertTriangle, 
  CreditCard, 
  DollarSign, 
  Check, 
  History,
  Info,
  Clock,
  Eye,
  EyeOff,
  Volume2,
  Languages
} from 'lucide-react';
import { Product, Sale, SaleItem, Contact, PaymentMethod } from '../types';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import { sounds } from '../utils/sound';
import { voiceAssistant, VoiceLanguage } from '../utils/voiceAssistant';

interface BillingViewProps {
  products: Product[];
  contacts: Contact[];
  sales: Sale[];
  initialMode?: 'itemised' | 'amount_only';
  hideBuyingCost?: boolean;
  onToggleHideBuyingCost?: () => void;
  onFinaliseBill: (sale: Sale) => { success: boolean; error?: string };
  onSaveDraftBill: (sale: Sale) => void;
  onViewReceipt: (sale: Sale) => void;
  onCancelBill: (saleId: string) => void;
}

export const BillingView: React.FC<BillingViewProps> = ({
  products,
  contacts,
  sales,
  initialMode = 'itemised',
  hideBuyingCost = false,
  onToggleHideBuyingCost,
  onFinaliseBill,
  onSaveDraftBill,
  onViewReceipt,
  onCancelBill
}) => {
  const [activeTab, setActiveTab] = useState<'create' | 'history'>('create');
  const [billingMode, setBillingMode] = useState<'itemised' | 'amount_only'>(initialMode);
  const [voiceLang, setVoiceLang] = useState<VoiceLanguage>(voiceAssistant.getLanguage());

  const handleToggleVoiceLang = () => {
    const next = voiceAssistant.toggleLanguage();
    setVoiceLang(next);
    sounds.playTap();
    voiceAssistant.speak(
      next === 'hi' 
        ? 'हिंदी वॉइस उद्घोषणा चालू है' 
        : 'English voice announcement active', 
      true
    );
  };

  // --- ITEMISED BILL STATE ---
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Fast Checkout Shortcut: Press / or Ctrl+F to immediately focus product search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === '/' || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f')) &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const [cartItems, setCartItems] = useState<SaleItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customCustomerName, setCustomCustomerName] = useState<string>('');
  const [customCustomerPhone, setCustomCustomerPhone] = useState<string>('');
  const [discount, setDiscount] = useState<number>(0);
  const [amountReceived, setAmountReceived] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [billNotes, setBillNotes] = useState<string>('');
  const [preventNegativeStock, setPreventNegativeStock] = useState<boolean>(true);
  const [gstEnabled, setGstEnabled] = useState<boolean>(true);
  const [isInterState, setIsInterState] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // --- AMOUNT-ONLY BILL STATE ---
  const [amountOnlyValue, setAmountOnlyValue] = useState<string>('');
  const [amountOnlyCustomerId, setAmountOnlyCustomerId] = useState<string>('');
  const [amountOnlyCustomerName, setAmountOnlyCustomerName] = useState<string>('');
  const [amountOnlyCustomerPhone, setAmountOnlyCustomerPhone] = useState<string>('');
  const [amountOnlyReceived, setAmountOnlyReceived] = useState<string>('');
  const [amountOnlyMethod, setAmountOnlyMethod] = useState<PaymentMethod>('cash');
  const [amountOnlyNotes, setAmountOnlyNotes] = useState<string>('');

  // Filter products for fast search
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products.slice(0, 10);
    const q = searchQuery.toLowerCase();
    return products.filter(p => 
      p.name.toLowerCase().includes(q) ||
      p.code.toLowerCase().includes(q) ||
      p.brand.toLowerCase().includes(q)
    ).slice(0, 15);
  }, [products, searchQuery]);

  // Add product to cart
  const handleAddToCart = (product: Product) => {
    setErrorMsg(null);
    const existingIndex = cartItems.findIndex(i => i.productId === product.id);

    if (existingIndex >= 0) {
      const currentQty = cartItems[existingIndex].quantity;
      if (preventNegativeStock && currentQty + 1 > product.currentStock) {
        setErrorMsg(`Cannot add more: Only ${product.currentStock} ${product.unit} available in stock.`);
        sounds.playWarning();
        return;
      }
      const updated = [...cartItems];
      updated[existingIndex].quantity += 1;
      updated[existingIndex].totalPrice = updated[existingIndex].quantity * updated[existingIndex].sellingPrice;
      setCartItems(updated);
      sounds.playItemAdded();
    } else {
      if (preventNegativeStock && product.currentStock < 1) {
        setErrorMsg(`"${product.name}" is out of stock (${product.currentStock} ${product.unit}).`);
        sounds.playWarning();
        return;
      }
      const newItem: SaleItem = {
        id: `si-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        saleId: '',
        productId: product.id,
        productName: product.name,
        productCode: product.code,
        brand: product.brand,
        unit: product.unit,
        packageSize: product.packageSize,
        quantity: 1,
        purchasePrice: product.purchasePrice, // preserve historical cost
        sellingPrice: product.sellingPrice,
        totalPrice: product.sellingPrice,
        gstRate: product.gstRate !== undefined ? product.gstRate : 18,
        hsnCode: product.hsnCode
      };
      setCartItems([...cartItems, newItem]);
      sounds.playItemAdded();
    }
  };

  const handleUpdateQuantity = (index: number, newQty: number) => {
    setErrorMsg(null);
    if (newQty <= 0) {
      handleRemoveItem(index);
      return;
    }
    const item = cartItems[index];
    const product = products.find(p => p.id === item.productId);
    if (preventNegativeStock && product && newQty > product.currentStock) {
      setErrorMsg(`Stock limit: Only ${product.currentStock} ${product.unit} in stock.`);
      sounds.playWarning();
      return;
    }
    const updated = [...cartItems];
    const wasIncrease = newQty > item.quantity;
    updated[index].quantity = newQty;
    updated[index].totalPrice = newQty * updated[index].sellingPrice;
    setCartItems(updated);
    if (wasIncrease) {
      sounds.playItemAdded();
    } else {
      sounds.playItemRemoved();
    }
  };

  const handleUpdatePrice = (index: number, newPrice: number) => {
    const updated = [...cartItems];
    updated[index].sellingPrice = newPrice;
    updated[index].totalPrice = updated[index].quantity * newPrice;
    setCartItems(updated);
  };

  const handleUpdateGstRate = (index: number, newRate: number) => {
    const updated = [...cartItems];
    updated[index].gstRate = newRate;
    setCartItems(updated);
  };

  const handleRemoveItem = (index: number) => {
    setCartItems(cartItems.filter((_, i) => i !== index));
    sounds.playItemRemoved();
  };

  // Calculations for Itemised Bill
  const subtotal = useMemo(() => {
    return cartItems.reduce((acc, item) => acc + item.totalPrice, 0);
  }, [cartItems]);

  const totalAmount = Math.max(0, subtotal - (Number(discount) || 0));

  // Dynamic GST calculation breakdown
  const gstBreakup = useMemo(() => {
    let taxable = 0;
    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    cartItems.forEach((item) => {
      const rate = gstEnabled ? (item.gstRate !== undefined ? item.gstRate : 18) : 0;
      const prod = products.find(p => p.id === item.productId);
      const isInclusive = prod?.isTaxInclusive !== false;

      let itemTaxable = 0;
      let itemTax = 0;
      if (isInclusive) {
        itemTaxable = rate > 0 ? item.totalPrice / (1 + rate / 100) : item.totalPrice;
        itemTax = item.totalPrice - itemTaxable;
      } else {
        itemTaxable = item.totalPrice;
        itemTax = (itemTaxable * rate) / 100;
      }

      taxable += itemTaxable;
      if (isInterState) {
        igst += itemTax;
      } else {
        cgst += itemTax / 2;
        sgst += itemTax / 2;
      }
    });

    return {
      taxable: Math.round(taxable * 100) / 100,
      cgst: Math.round(cgst * 100) / 100,
      sgst: Math.round(sgst * 100) / 100,
      igst: Math.round(igst * 100) / 100,
      totalTax: Math.round((cgst + sgst + igst) * 100) / 100
    };
  }, [cartItems, gstEnabled, isInterState, products]);

  // Default received: if paymentMethod is credit, default is 0 (all udhar). Otherwise full totalAmount.
  const defaultReceived = paymentMethod === 'credit' ? 0 : totalAmount;
  const finalReceived = amountReceived === '' 
    ? defaultReceived 
    : Math.max(0, Number(amountReceived) || 0);
  const remainingBalance = Math.max(0, totalAmount - finalReceived);

  // Selected customer info
  const selectedCustomer = contacts.find(c => c.id === selectedCustomerId);
  const customerDisplayName = selectedCustomer ? selectedCustomer.name : (customCustomerName.trim() || '');
  const customerDisplayPhone = selectedCustomer ? selectedCustomer.phone : customCustomerPhone.trim();

  // Finalise Itemised Bill
  const handleSubmitItemisedBill = (isDraft: boolean = false) => {
    setErrorMsg(null);
    if (cartItems.length === 0) {
      setErrorMsg('Please add at least one product to the bill.');
      sounds.playWarning();
      return;
    }

    // Require customer for credit/udhar billing so their balance is accurately tracked
    if ((paymentMethod === 'credit' || remainingBalance > 0) && !selectedCustomerId && !customCustomerName.trim()) {
      setErrorMsg('⚠️ For Udhar (Credit) billing, please select a contact or enter the customer name so their Khata balance is credited.');
      sounds.playWarning();
      return;
    }

    const billNumber = `INV-${Date.now().toString().slice(-6)}`;
    const saleId = `sale-${Date.now()}`;

    const effectiveCustomerName = customerDisplayName || 'Walk-in Customer';

    const newSale: Sale = {
      id: saleId,
      billNumber,
      date: new Date().toISOString(),
      type: 'itemised',
      status: isDraft ? 'draft' : 'finalised',
      customerId: selectedCustomerId || undefined,
      customerName: effectiveCustomerName,
      customerPhone: customerDisplayPhone || undefined,
      items: cartItems.map(item => ({
        ...item,
        saleId,
        gstRate: gstEnabled ? (item.gstRate !== undefined ? item.gstRate : 18) : 0,
        taxableAmount: item.gstRate ? Math.round((item.totalPrice / (1 + (item.gstRate || 0) / 100)) * 100) / 100 : item.totalPrice
      })),
      subtotal,
      discount: Number(discount) || 0,
      taxableAmount: gstEnabled ? gstBreakup.taxable : subtotal,
      cgstTotal: gstEnabled && !isInterState ? gstBreakup.cgst : undefined,
      sgstTotal: gstEnabled && !isInterState ? gstBreakup.sgst : undefined,
      igstTotal: gstEnabled && isInterState ? gstBreakup.igst : undefined,
      isInterState,
      totalAmount,
      amountReceived: isDraft ? 0 : finalReceived,
      remainingBalance: isDraft ? totalAmount : remainingBalance,
      paymentMethod,
      notes: billNotes.trim() || undefined,
      stockDeducted: false, // will be set by processBill if finalised
      createdAt: new Date().toISOString()
    };

    if (isDraft) {
      onSaveDraftBill(newSale);
      resetItemisedForm();
      return;
    }

    const res = onFinaliseBill(newSale);
    if (!res.success) {
      setErrorMsg(res.error || 'Failed to finalise bill.');
    } else {
      resetItemisedForm();
    }
  };

  const resetItemisedForm = () => {
    setCartItems([]);
    setSelectedCustomerId('');
    setCustomCustomerName('');
    setCustomCustomerPhone('');
    setDiscount(0);
    setAmountReceived('');
    setBillNotes('');
    setSearchQuery('');
    setErrorMsg(null);
  };

  // Submit Amount-Only Quick Sale
  const handleSubmitAmountOnlySale = () => {
    setErrorMsg(null);
    const amt = parseFloat(amountOnlyValue);
    if (isNaN(amt) || amt <= 0) {
      setErrorMsg('Please enter a valid sale amount.');
      sounds.playWarning();
      return;
    }

    const defaultReceived = amountOnlyMethod === 'credit' ? 0 : amt;
    const received = amountOnlyReceived === '' ? defaultReceived : parseFloat(amountOnlyReceived) || 0;
    const balance = Math.max(0, amt - received);

    // Require customer for credit/udhar entry so their balance is accurately tracked
    if ((amountOnlyMethod === 'credit' || balance > 0) && !amountOnlyCustomerId && !amountOnlyCustomerName.trim()) {
      setErrorMsg('For Udhar (Credit) entry, please select a contact or enter customer name so their Khata balance is updated.');
      sounds.playWarning();
      return;
    }

    const selCust = contacts.find(c => c.id === amountOnlyCustomerId);
    const cName = selCust ? selCust.name : (amountOnlyCustomerName.trim() || 'Cash Customer');
    const cPhone = selCust ? selCust.phone : amountOnlyCustomerPhone.trim();

    const newSale: Sale = {
      id: `sale-qs-${Date.now()}`,
      billNumber: `QS-${Date.now().toString().slice(-6)}`,
      date: new Date().toISOString(),
      type: 'amount_only',
      status: 'finalised',
      customerId: amountOnlyCustomerId || undefined,
      customerName: cName,
      customerPhone: cPhone || undefined,
      items: [], // NO arbitrary products guessed!
      subtotal: amt,
      discount: 0,
      totalAmount: amt,
      amountReceived: received,
      remainingBalance: balance,
      paymentMethod: amountOnlyMethod,
      notes: amountOnlyNotes.trim() || 'Quick counter sale (no stock itemised)',
      stockDeducted: false, // ZERO stock deducted!
      createdAt: new Date().toISOString()
    };

    const res = onFinaliseBill(newSale);
    if (!res.success) {
      setErrorMsg(res.error || 'Failed to record quick sale.');
    } else {
      setAmountOnlyValue('');
      setAmountOnlyCustomerId('');
      setAmountOnlyCustomerName('');
      setAmountOnlyCustomerPhone('');
      setAmountOnlyReceived('');
      setAmountOnlyNotes('');
      setErrorMsg(null);
    }
  };

  return (
    <div className="pb-28 pt-2 px-3 max-w-lg mx-auto space-y-3">
      
      {/* Top Header Mode Toggle & Bilingual Voice Selector */}
      <div className="flex items-center gap-2">
        <div className="flex-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl flex items-center text-xs font-bold border border-transparent dark:border-slate-800">
          <button
            onClick={() => setActiveTab('create')}
            className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'create' 
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs' 
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Receipt className="w-4 h-4 text-amber-500" />
            Create Bill
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'history' 
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs' 
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <History className="w-4 h-4 text-slate-500" />
            Bill History ({sales.length})
          </button>
        </div>

        {/* Bilingual Hindi/English Voice Toggle Button */}
        <button
          type="button"
          onClick={handleToggleVoiceLang}
          className={`px-2.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 border shadow-2xs transition-all active:scale-95 cursor-pointer shrink-0 ${
            voiceLang === 'hi'
              ? 'bg-amber-500 text-slate-950 border-amber-600 font-black'
              : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-800 hover:border-amber-400'
          }`}
          title={voiceLang === 'hi' ? 'Voice set to Hindi (Click for English)' : 'Voice set to English (Click for Hindi)'}
        >
          <Languages className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          <span>{voiceLang === 'hi' ? '🇮🇳 हिंदी' : '🇬🇧 ENG'}</span>
        </button>
      </div>

      {/* Customer Mode (Hide Buying Cost) Banner */}
      <div className="flex items-center justify-between px-3 py-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs text-xs">
        <div className="flex items-center gap-2">
          {hideBuyingCost ? (
            <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-bold">
              <EyeOff className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              Customer Mode: Buy Rates Hidden
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 font-medium">
              <Eye className="w-4 h-4 text-slate-400 shrink-0" />
              Shopkeeper Mode (Buy Costs Visible)
            </span>
          )}
        </div>
        {onToggleHideBuyingCost && (
          <button
            type="button"
            onClick={onToggleHideBuyingCost}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all shadow-2xs cursor-pointer ${
              hideBuyingCost
                ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700'
            }`}
          >
            {hideBuyingCost ? 'Show Buy Rates' : 'Hide Cost From Customer'}
          </button>
        )}
      </div>

      {activeTab === 'create' ? (
        <div className="space-y-3">
          
          {/* Sub-toggle: Itemised vs Amount-Only */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => { setBillingMode('itemised'); setErrorMsg(null); }}
              className={`p-2.5 rounded-xl border text-left transition-all flex items-center gap-2.5 cursor-pointer ${
                billingMode === 'itemised'
                  ? 'border-amber-500 bg-amber-50/70 dark:bg-amber-950/40 text-slate-900 dark:text-white shadow-xs ring-1 ring-amber-500'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300'
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                billingMode === 'itemised' ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}>
                <Receipt className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-xs text-slate-900 dark:text-white">Itemised Bill</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">Deduct stock automatically</div>
              </div>
            </button>

            <button
              onClick={() => { setBillingMode('amount_only'); setErrorMsg(null); }}
              className={`p-2.5 rounded-xl border text-left transition-all flex items-center gap-2.5 cursor-pointer ${
                billingMode === 'amount_only'
                  ? 'border-amber-500 bg-amber-50/70 dark:bg-amber-950/40 text-slate-900 dark:text-white shadow-xs ring-1 ring-amber-500'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300'
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                billingMode === 'amount_only' ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}>
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-xs text-slate-900 dark:text-white">Quick Amount Sale</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">Fast entry, no stock</div>
              </div>
            </button>
          </div>

          {/* Error Banner */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-xs font-semibold flex items-center gap-2 animate-shake">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* =======================================================
              MODE A: ITEMISED BILL
             ======================================================= */}
          {billingMode === 'itemised' && (
            <div className="space-y-3">
              
              {/* Product Search & Select */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-3 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search paint, pipe, adhesive, screws, tools... (Press /)"
                    className="w-full pl-9 pr-9 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 rounded-xl text-xs focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  />
                  <kbd className="hidden sm:inline-flex items-center justify-center absolute right-3 top-2.5 h-4 px-1.5 text-[9px] font-mono font-bold bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-300 rounded shadow-2xs">
                    /
                  </kbd>
                </div>

                {/* Search Results Dropdown/List */}
                {searchQuery.trim() && (
                  <div className="border border-slate-100 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800 max-h-48 overflow-y-auto bg-slate-50/50 dark:bg-slate-800/50">
                    {filteredProducts.length === 0 ? (
                      <div className="p-3 text-center text-xs text-slate-400 dark:text-slate-500">
                        No product matches "{searchQuery}".
                      </div>
                    ) : (
                      filteredProducts.map((p) => {
                        const inStock = p.currentStock > 0;
                        return (
                          <div
                            key={p.id}
                            onClick={() => handleAddToCart(p)}
                            className="p-2 hover:bg-amber-50 dark:hover:bg-amber-950/40 flex items-center justify-between cursor-pointer transition-colors"
                          >
                            <div>
                              <div className="font-bold text-xs text-slate-800 dark:text-slate-200">{p.name}</div>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400">
                                {p.brand} • {p.packageSize} • Rate: {formatCurrency(p.sellingPrice)}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                                inStock 
                                  ? (p.currentStock <= p.minStock ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300' : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300')
                                  : 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300'
                              }`}>
                                {p.currentStock} {p.unit}
                              </span>
                              <button className="w-7 h-7 bg-amber-500 text-slate-950 rounded-lg flex items-center justify-center font-bold text-xs hover:bg-amber-600 cursor-pointer">
                                <Plus className="w-4 h-4 stroke-[2.5]" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* Cart / Selected Items Table */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-3 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Selected Items ({cartItems.length})
                  </span>
                  {cartItems.length > 0 && (
                    <button
                      onClick={() => setCartItems([])}
                      className="text-[11px] text-rose-600 dark:text-rose-400 hover:text-rose-800 dark:hover:text-rose-300 font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" /> Clear
                    </button>
                  )}
                </div>

                {cartItems.length === 0 ? (
                  <div className="py-6 text-center text-slate-400 text-xs">
                    Search and tap items above to add to this bill.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 space-y-1">
                    {cartItems.map((item, idx) => {
                      const prod = products.find(p => p.id === item.productId);
                      const maxStock = prod ? prod.currentStock : 999;
                      const hasStockWarning = item.quantity > maxStock;

                      return (
                        <div key={item.id} className="pt-2 pb-1 space-y-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="font-bold text-xs text-slate-800 dark:text-slate-200">{item.productName}</div>
                              <div className="text-[10px] text-slate-400 dark:text-slate-500">
                                {item.packageSize} • In stock: {maxStock} {item.unit}
                              </div>
                            </div>
                            <button
                              onClick={() => handleRemoveItem(idx)}
                              className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Controls: Quantity & Unit Selling Price */}
                          <div className="flex items-center justify-between text-xs pt-1">
                            {/* Quantity Stepper */}
                            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                              <button
                                onClick={() => handleUpdateQuantity(idx, item.quantity - 1)}
                                className="w-6 h-6 rounded bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-600 cursor-pointer"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => handleUpdateQuantity(idx, Math.max(1, parseInt(e.target.value) || 1))}
                                className="w-10 text-center font-black text-xs bg-transparent text-slate-900 dark:text-white focus:outline-hidden"
                              />
                              <button
                                onClick={() => handleUpdateQuantity(idx, item.quantity + 1)}
                                className="w-6 h-6 rounded bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-600 cursor-pointer"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 pr-1">{item.unit}</span>
                            </div>

                            {/* Adjustable Selling Price */}
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-slate-400 dark:text-slate-500">Rate: ₹</span>
                              <input
                                type="number"
                                value={item.sellingPrice}
                                onChange={(e) => handleUpdatePrice(idx, Math.max(0, parseFloat(e.target.value) || 0))}
                                className="w-16 px-1.5 py-1 text-right font-bold text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-800"
                                title="Adjust selling price per unit"
                              />
                            </div>

                            {/* Item Total */}
                            <div className="font-black text-xs text-slate-900 dark:text-white w-16 text-right">
                              {formatCurrency(item.totalPrice)}
                            </div>
                          </div>

                          {/* Option to Edit GST Percentage per item */}
                          <div className="flex items-center justify-between text-[11px] pt-1 text-slate-500 dark:text-slate-400">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-bold">GST:</span>
                              <select
                                value={item.gstRate !== undefined ? item.gstRate : 18}
                                onChange={(e) => handleUpdateGstRate(idx, parseFloat(e.target.value) || 0)}
                                className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[10px] font-bold text-slate-800 dark:text-slate-200"
                                title="Edit GST Percentage for this product"
                              >
                                <option value="0">0% (Nil)</option>
                                <option value="5">5%</option>
                                <option value="12">12%</option>
                                <option value="18">18%</option>
                                <option value="28">28%</option>
                              </select>
                              {item.hsnCode && (
                                <span className="text-[9px] text-slate-400 dark:text-slate-500 font-mono">HSN: {item.hsnCode}</span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500">
                              GST Tax: ₹{(((item.totalPrice * (item.gstRate !== undefined ? item.gstRate : 18)) / (100 + (item.gstRate !== undefined ? item.gstRate : 18)))).toFixed(1)}
                            </span>
                          </div>

                          {hasStockWarning && (
                            <p className="text-[10px] text-rose-600 dark:text-rose-400 font-bold">
                              Exceeds current stock ({maxStock} {item.unit})!
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Customer Selection & Bill Details */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-3 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2.5">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                  Customer & Payment
                </span>

                {/* Warning if Udhar but no customer selected */}
                {(paymentMethod === 'credit' || remainingBalance > 0) && (
                  <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-900 text-xs text-rose-900 dark:text-rose-200 space-y-1">
                    <div className="flex items-center justify-between font-bold">
                      <span className="flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                        Udhaar / Credit Mode Active
                      </span>
                      <span className="bg-rose-200 dark:bg-rose-900 text-rose-900 dark:text-rose-200 px-2 py-0.5 rounded font-black">
                        ₹{remainingBalance} Khata Due
                      </span>
                    </div>
                    <p className="text-[11px] text-rose-700 dark:text-rose-300">
                      {!selectedCustomerId && !customCustomerName.trim()
                        ? '⚠️ Please select a customer from the dropdown or enter their name below to add this credit balance to their Khata.'
                        : `Remaining ₹${remainingBalance} will be credited to ${customerDisplayName || 'Customer'}'s Khata balance.`}
                    </p>
                  </div>
                )}

                {/* Customer Picker */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                    Select Contact (Khata / Painter / Contractor)
                  </label>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-xs font-medium focus:bg-white dark:focus:bg-slate-800"
                  >
                    <option value="">-- Walk-in / New Customer --</option>
                    {contacts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.profession.toUpperCase()}) {c.creditBalance !== 0 ? `[Bal: ${formatCurrency(c.creditBalance)}]` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {!selectedCustomerId && (
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Customer Name (required for Udhar)"
                      value={customCustomerName}
                      onChange={(e) => setCustomCustomerName(e.target.value)}
                      className="p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-xs focus:bg-white dark:focus:bg-slate-800"
                    />
                    <input
                      type="tel"
                      placeholder="Phone (for WhatsApp bill)"
                      value={customCustomerPhone}
                      onChange={(e) => setCustomCustomerPhone(e.target.value)}
                      className="p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-xs focus:bg-white dark:focus:bg-slate-800"
                    />
                  </div>
                )}

                {/* Discount & Payment Method */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase block mb-1">Discount (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={discount || ''}
                      onChange={(e) => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                      placeholder="0"
                      className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-xs font-bold focus:bg-white dark:focus:bg-slate-800"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase block mb-1">Payment Method</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => {
                        const method = e.target.value as PaymentMethod;
                        setPaymentMethod(method);
                        if (method === 'credit') {
                          setAmountReceived('0');
                        } else if (amountReceived === '0') {
                          setAmountReceived(totalAmount.toString());
                        }
                      }}
                      className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-xs font-semibold focus:bg-white dark:focus:bg-slate-800 uppercase"
                    >
                      <option value="cash">Cash</option>
                      <option value="upi">UPI / GPay / PhonePe</option>
                      <option value="credit">Udhaar / Credit</option>
                      <option value="bank_transfer">Bank Transfer</option>
                    </select>
                  </div>
                </div>

                {/* Amount Received & Quick Presets */}
                <div className="pt-1">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Amount Received (₹)</label>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => setAmountReceived(totalAmount.toString())}
                        className="text-[10px] bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-2 py-0.5 rounded font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
                      >
                        Full (₹{totalAmount})
                      </button>
                      <button
                        type="button"
                        onClick={() => setAmountReceived('0')}
                        className="text-[10px] bg-rose-100 dark:bg-rose-950/60 hover:bg-rose-200 dark:hover:bg-rose-900 px-2 py-0.5 rounded font-semibold text-rose-700 dark:text-rose-300 cursor-pointer"
                      >
                        Nil / Udhar (₹0)
                      </button>
                    </div>
                  </div>
                  <input
                    type="number"
                    value={amountReceived}
                    onChange={(e) => setAmountReceived(e.target.value)}
                    placeholder={paymentMethod === 'credit' ? '0 (Full Udhaar)' : `Total ₹${totalAmount}`}
                    className="w-full p-2.5 bg-emerald-50/50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 rounded-xl text-sm font-black text-emerald-900 dark:text-emerald-300 focus:bg-white dark:focus:bg-slate-800"
                  />
                </div>

                {/* Bill Note */}
                <input
                  type="text"
                  placeholder="Optional note (e.g. site location, delivery)"
                  value={billNotes}
                  onChange={(e) => setBillNotes(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-xs focus:bg-white dark:focus:bg-slate-800"
                />

                {/* Stock Protection Checkbox */}
                <label className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400 font-medium cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={preventNegativeStock}
                    onChange={(e) => setPreventNegativeStock(e.target.checked)}
                    className="rounded text-amber-600 focus:ring-amber-500"
                  />
                  <span>Prevent sales beyond available stock</span>
                </label>
              </div>

              {/* Bill Totals & Submit Action Bar */}
              <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-xl space-y-3">
                {/* GST Configuration & Breakup */}
                <div className="pb-1 border-b border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 font-semibold">
                      <input
                        type="checkbox"
                        checked={gstEnabled}
                        onChange={(e) => setGstEnabled(e.target.checked)}
                        className="rounded text-amber-500 w-3.5 h-3.5"
                      />
                      <span>GST Invoice</span>
                    </label>

                    {gstEnabled && (
                      <div className="flex items-center gap-1 text-[10px]">
                        <button
                          type="button"
                          onClick={() => setIsInterState(false)}
                          className={`px-2 py-0.5 rounded font-bold transition-colors cursor-pointer ${
                            !isInterState ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          Intra-State (CGST+SGST)
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsInterState(true)}
                          className={`px-2 py-0.5 rounded font-bold transition-colors cursor-pointer ${
                            isInterState ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          Inter-State (IGST)
                        </button>
                      </div>
                    )}
                  </div>

                  {gstEnabled && (
                    <div className="bg-slate-800/60 p-2 rounded-lg space-y-0.5 text-[11px] text-slate-300 font-mono">
                      <div className="flex justify-between text-slate-400">
                        <span>Taxable Value:</span>
                        <span>{formatCurrency(gstBreakup.taxable)}</span>
                      </div>
                      {!isInterState ? (
                        <>
                          <div className="flex justify-between text-slate-400">
                            <span>CGST:</span>
                            <span>{formatCurrency(gstBreakup.cgst)}</span>
                          </div>
                          <div className="flex justify-between text-slate-400">
                            <span>SGST:</span>
                            <span>{formatCurrency(gstBreakup.sgst)}</span>
                          </div>
                        </>
                      ) : (
                        <div className="flex justify-between text-slate-400">
                          <span>IGST:</span>
                          <span>{formatCurrency(gstBreakup.igst)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold text-amber-300 border-t border-slate-700/60 pt-0.5">
                        <span>Total GST:</span>
                        <span>{formatCurrency(gstBreakup.totalTax)}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-emerald-400">
                      <span>Discount:</span>
                      <span>-{formatCurrency(discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-black text-white pt-1 border-t border-slate-800">
                    <span>Total Amount:</span>
                    <span className="text-amber-400 text-lg">{formatCurrency(totalAmount)}</span>
                  </div>
                  {remainingBalance > 0 && (
                    <div className="flex justify-between text-rose-400 font-bold bg-rose-950/40 p-2 rounded-lg mt-1 border border-rose-800/40">
                      <span>Customer Due (Udhar):</span>
                      <span>{formatCurrency(remainingBalance)}</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1">
                  <button
                    onClick={() => handleSubmitItemisedBill(true)}
                    disabled={cartItems.length === 0}
                    className="py-2.5 px-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 rounded-xl text-xs font-semibold"
                  >
                    Save Draft
                  </button>
                  <button
                    onClick={() => handleSubmitItemisedBill(false)}
                    disabled={cartItems.length === 0}
                    className={`col-span-2 py-3 px-3 disabled:opacity-40 rounded-xl text-sm font-black flex items-center justify-center gap-1.5 shadow-md active:scale-98 transition-all ${
                      paymentMethod === 'credit' || remainingBalance > 0
                        ? 'bg-rose-600 hover:bg-rose-700 text-white'
                        : 'bg-amber-500 hover:bg-amber-600 text-slate-950'
                    }`}
                  >
                    <CheckCircle className="w-5 h-5" />
                    {paymentMethod === 'credit' || remainingBalance > 0
                      ? `Finalise & Add to Khata (₹${remainingBalance} Due)`
                      : 'Finalise & Deduct Stock'}
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* =======================================================
              MODE B: AMOUNT-ONLY QUICK SALE
             ======================================================= */}
          {billingMode === 'amount_only' && (
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3.5">
              
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p>
                  <strong>Quick Amount Sale:</strong> Records daily sales cash/UPI instantly without touching inventory. Ideal for loose screws, small hardware bundles, and untracked items.
                </p>
              </div>

              {/* Amount Input */}
              <div>
                <label className="text-xs font-bold uppercase text-slate-700 block mb-1">
                  Sale Amount (₹) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-lg font-bold text-slate-400">₹</span>
                  <input
                    type="number"
                    step="any"
                    min="1"
                    value={amountOnlyValue}
                    onChange={(e) => setAmountOnlyValue(e.target.value)}
                    placeholder="0"
                    className="w-full pl-9 pr-3 py-3 bg-slate-50 border-2 border-slate-200 focus:border-amber-500 rounded-xl text-2xl font-black text-slate-900 focus:bg-white focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Quick Amount Quick-Picks */}
              <div className="flex gap-1.5 flex-wrap">
                {[50, 100, 200, 350, 500, 1000].map((quickAmt) => (
                  <button
                    key={quickAmt}
                    type="button"
                    onClick={() => setAmountOnlyValue(quickAmt.toString())}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700"
                  >
                    ₹{quickAmt}
                  </button>
                ))}
              </div>

              {/* Customer (Optional) */}
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Customer (Optional)
                </label>
                <select
                  value={amountOnlyCustomerId}
                  onChange={(e) => setAmountOnlyCustomerId(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white"
                >
                  <option value="">-- Cash Walk-in Customer --</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.profession.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>

              {!amountOnlyCustomerId && (
                <input
                  type="text"
                  placeholder="Customer name (optional)"
                  value={amountOnlyCustomerName}
                  onChange={(e) => setAmountOnlyCustomerName(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white"
                />
              )}

              {/* Payment Method */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Payment Method</label>
                  <select
                    value={amountOnlyMethod}
                    onChange={(e) => {
                      const method = e.target.value as PaymentMethod;
                      setAmountOnlyMethod(method);
                      if (method === 'credit') {
                        setAmountOnlyReceived('0');
                      } else if (amountOnlyReceived === '0') {
                        setAmountOnlyReceived(amountOnlyValue);
                      }
                    }}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white uppercase"
                  >
                    <option value="cash">Cash</option>
                    <option value="upi">UPI / Online</option>
                    <option value="credit">Credit (Udhar)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Received (₹)</label>
                  <input
                    type="number"
                    value={amountOnlyReceived}
                    onChange={(e) => setAmountOnlyReceived(e.target.value)}
                    placeholder={amountOnlyValue ? `₹${amountOnlyValue}` : '0'}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white"
                  />
                </div>
              </div>

              {/* Udhar info for Quick Sale */}
              {amountOnlyMethod === 'credit' && (
                <div className="p-2.5 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-900 space-y-1">
                  <div className="flex items-center justify-between font-bold">
                    <span className="flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      Quick Udhaar Entry Active
                    </span>
                    <span className="bg-rose-200 text-rose-900 px-2 py-0.5 rounded font-black">
                      ₹{Math.max(0, (parseFloat(amountOnlyValue) || 0) - (amountOnlyReceived === '' ? 0 : (parseFloat(amountOnlyReceived) || 0)))} Due
                    </span>
                  </div>
                  <p className="text-[11px] text-rose-700">
                    {!amountOnlyCustomerId && !amountOnlyCustomerName.trim()
                      ? '⚠️ Please enter customer name above so this credit is added to their Khata balance.'
                      : 'This Udhaar amount will be recorded directly into the customer\'s Khata ledger.'}
                  </p>
                </div>
              )}

              {/* Note */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Items Description / Note</label>
                <input
                  type="text"
                  placeholder="e.g. Screws, tape, sandpaper, teflon tape"
                  value={amountOnlyNotes}
                  onChange={(e) => setAmountOnlyNotes(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white"
                />
              </div>

              <button
                onClick={handleSubmitAmountOnlySale}
                className={`w-full py-3.5 text-white rounded-xl text-sm font-black flex items-center justify-center gap-2 shadow-md active:scale-98 transition-all ${
                  amountOnlyMethod === 'credit'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-slate-900 hover:bg-slate-800'
                }`}
              >
                <Check className="w-5 h-5 text-amber-400" />
                {amountOnlyMethod === 'credit'
                  ? `Record Udhaar & Add to Khata (₹${Math.max(0, (parseFloat(amountOnlyValue) || 0) - (amountOnlyReceived === '' ? 0 : (parseFloat(amountOnlyReceived) || 0)))})`
                  : `Record Quick Sale (${formatCurrency(parseFloat(amountOnlyValue) || 0)})`}
              </button>

            </div>
          )}

        </div>
      ) : (
        /* =======================================================
            TAB 2: BILL HISTORY
           ======================================================= */
        <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">All Past Invoices</span>
            <span className="text-xs text-slate-400">{sales.length} records</span>
          </div>

          {sales.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              No bills recorded yet.
            </div>
          ) : (
            <div className="space-y-2 divide-y divide-slate-100">
              {sales.map((sale) => (
                <div
                  key={sale.id}
                  onClick={() => onViewReceipt(sale)}
                  className="pt-2 pb-1 hover:bg-amber-50/50 p-2 rounded-xl transition-colors cursor-pointer flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-800">{sale.customerName}</span>
                      <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                        sale.status === 'cancelled' 
                          ? 'bg-red-100 text-red-800' 
                          : (sale.type === 'amount_only' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800')
                      }`}>
                        {sale.status === 'cancelled' ? 'Cancelled' : (sale.type === 'amount_only' ? 'Quick' : 'Itemised')}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {sale.billNumber} • {formatDateTime(sale.date)} • {sale.paymentMethod.toUpperCase()}
                    </div>
                    {sale.type === 'itemised' && (
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {sale.items.length} items ({sale.items.map(i => `${i.productName} (${i.quantity})`).slice(0, 2).join(', ')}{sale.items.length > 2 ? '...' : ''})
                      </div>
                    )}
                  </div>

                  <div className="text-right">
                    <div className="font-black text-xs text-slate-900">{formatCurrency(sale.totalAmount)}</div>
                    {sale.remainingBalance > 0 ? (
                      <span className="text-[10px] text-rose-600 font-bold block">
                        Due: {formatCurrency(sale.remainingBalance)}
                      </span>
                    ) : (
                      <span className="text-[10px] text-emerald-600 font-semibold block">Paid in Full</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
};
