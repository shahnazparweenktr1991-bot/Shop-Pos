import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Plus, 
  Edit3, 
  Trash2, 
  AlertTriangle, 
  Package, 
  Tag, 
  Layers, 
  X, 
  Check, 
  PlusCircle, 
  DollarSign, 
  TrendingUp, 
  ArrowDownLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Camera,
  Image as ImageIcon,
  FolderTree,
  ZoomIn,
  Upload
} from 'lucide-react';
import { Product, Category, Contact, Purchase, Subcategory } from '../types';
import { formatCurrency, STANDARD_UNITS } from '../utils/formatters';
import { sounds } from '../utils/sound';
import { compressImageFile } from '../utils/imageCompressor';
import { PhotoLightboxModal } from './PhotoLightboxModal';

interface ProductsViewProps {
  products: Product[];
  categories: Category[];
  contacts: Contact[];
  hideBuyingCost?: boolean;
  onToggleHideBuyingCost?: () => void;
  onSaveProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => void;
  onSaveCategory: (category: Category) => void;
  onDeleteCategory: (categoryId: string) => { success: boolean; message?: string };
  onRecordPurchase: (purchase: Purchase) => void;
  filterLowStockInitial?: boolean;
}

export const ProductsView: React.FC<ProductsViewProps> = ({
  products,
  categories,
  contacts,
  hideBuyingCost = false,
  onToggleHideBuyingCost,
  onSaveProduct,
  onDeleteProduct,
  onSaveCategory,
  onDeleteCategory,
  onRecordPurchase,
  filterLowStockInitial = false
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>(filterLowStockInitial ? 'low' : 'all');

  // Subcategory & Image state
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string>('all');
  const [formSubcategoryId, setFormSubcategoryId] = useState<string>('');
  const [formImageUrl, setFormImageUrl] = useState<string>('');
  const [imagePreviewZoom, setImagePreviewZoom] = useState<{ url: string; title: string } | null>(null);

  // Category & Subcategory Modal State
  const [newCatImageUrl, setNewCatImageUrl] = useState<string>('');
  const [managingSubcategoriesForCat, setManagingSubcategoriesForCat] = useState<Category | null>(null);
  const [newSubcatName, setNewSubcatName] = useState<string>('');
  const [newSubcatImageUrl, setNewSubcatImageUrl] = useState<string>('');

  // Modals state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatName, setEditingCatName] = useState('');
  const [editingCatImageUrl, setEditingCatImageUrl] = useState('');
  const [catError, setCatError] = useState<string | null>(null);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);

  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);
  const [restockProduct, setRestockProduct] = useState<Product | null>(null);
  const [restockQty, setRestockQty] = useState('');
  const [restockPrice, setRestockPrice] = useState('');
  const [restockGstRate, setRestockGstRate] = useState('18');
  const [restockIsTaxInclusive, setRestockIsTaxInclusive] = useState(true);
  const [restockPaid, setRestockPaid] = useState('');
  const [restockSupplierId, setRestockSupplierId] = useState('');

  // Product Form State
  const [formName, setFormName] = useState('');
  const [formBrand, setFormBrand] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formPurchasePrice, setFormPurchasePrice] = useState('');
  const [formSellingPrice, setFormSellingPrice] = useState('');
  const [formGstRate, setFormGstRate] = useState('18');
  const [formIsTaxInclusive, setFormIsTaxInclusive] = useState(true);
  const [formHsnCode, setFormHsnCode] = useState('');
  const [formStock, setFormStock] = useState('');
  const [formMinStock, setFormMinStock] = useState('5');
  const [formUnit, setFormUnit] = useState('pieces');
  const [customUnit, setCustomUnit] = useState('');
  const [formPackageSize, setFormPackageSize] = useState('');
  const [formSupplierId, setFormSupplierId] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Filtered products list
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      // Category filter
      if (selectedCategoryId !== 'all' && p.categoryId !== selectedCategoryId) {
        return false;
      }
      // Subcategory filter
      if (selectedSubcategoryId !== 'all' && p.subcategoryId !== selectedSubcategoryId) {
        return false;
      }
      // Stock filter
      if (stockFilter === 'low' && p.currentStock > p.minStock) {
        return false;
      }
      if (stockFilter === 'out' && p.currentStock > 0) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesBrand = p.brand.toLowerCase().includes(q);
        const matchesCode = p.code.toLowerCase().includes(q);
        const matchesSubcat = p.subcategoryName?.toLowerCase().includes(q);
        const cat = categories.find(c => c.id === p.categoryId);
        const matchesCat = cat ? cat.name.toLowerCase().includes(q) : false;
        return matchesName || matchesBrand || matchesCode || matchesCat || matchesSubcat;
      }
      return true;
    });
  }, [products, categories, selectedCategoryId, selectedSubcategoryId, stockFilter, searchQuery]);

  // Open Product Modal
  const handleOpenAddProduct = () => {
    setEditingProduct(null);
    setFormName('');
    setFormBrand('');
    setFormCategory(categories[0]?.id || '');
    setFormSubcategoryId('');
    setFormImageUrl('');
    setFormCode(`PRD-${Math.floor(1000 + Math.random() * 9000)}`);
    setFormPurchasePrice('');
    setFormSellingPrice('');
    setFormGstRate('18');
    setFormIsTaxInclusive(true);
    setFormHsnCode('');
    setFormStock('10');
    setFormMinStock('5');
    setFormUnit('pieces');
    setCustomUnit('');
    setFormPackageSize('1 pc');
    setFormSupplierId('');
    setFormNotes('');
    setFormError(null);
    setIsProductModalOpen(true);
  };

  const handleOpenEditProduct = (prod: Product) => {
    setEditingProduct(prod);
    setFormName(prod.name);
    setFormBrand(prod.brand);
    setFormCategory(prod.categoryId);
    setFormSubcategoryId(prod.subcategoryId || '');
    setFormImageUrl(prod.imageUrl || '');
    setFormCode(prod.code);
    setFormPurchasePrice(prod.purchasePrice.toString());
    setFormSellingPrice(prod.sellingPrice.toString());
    setFormGstRate(prod.gstRate !== undefined ? prod.gstRate.toString() : '18');
    setFormIsTaxInclusive(prod.isTaxInclusive !== false);
    setFormHsnCode(prod.hsnCode || '');
    setFormStock(prod.currentStock.toString());
    setFormMinStock(prod.minStock.toString());
    
    const isStandard = STANDARD_UNITS.some(u => u.value === prod.unit);
    if (isStandard) {
      setFormUnit(prod.unit);
      setCustomUnit('');
    } else {
      setFormUnit('custom');
      setCustomUnit(prod.unit);
    }

    setFormPackageSize(prod.packageSize);
    setFormSupplierId(prod.supplierId || '');
    setFormNotes(prod.notes || '');
    setFormError(null);
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formName.trim()) {
      setFormError('Product name is required.');
      return;
    }
    if (!formCategory) {
      setFormError('Please select a category.');
      return;
    }
    const purchaseP = parseFloat(formPurchasePrice);
    const sellingP = parseFloat(formSellingPrice);
    if (isNaN(purchaseP) || purchaseP < 0) {
      setFormError('Please enter a valid purchase price.');
      return;
    }
    if (isNaN(sellingP) || sellingP < 0) {
      setFormError('Please enter a valid selling price.');
      return;
    }

    const unitToSave = formUnit === 'custom' ? (customUnit.trim() || 'pieces') : formUnit;
    const supplierContact = contacts.find(c => c.id === formSupplierId);
    const cat = categories.find(c => c.id === formCategory);
    const subcat = cat?.subcategories?.find(s => s.id === formSubcategoryId);

    const productData: Product = {
      id: editingProduct ? editingProduct.id : `prod-${Date.now()}`,
      code: formCode.trim() || `PRD-${Date.now().toString().slice(-4)}`,
      name: formName.trim(),
      brand: formBrand.trim() || 'General',
      categoryId: formCategory,
      subcategoryId: formSubcategoryId || undefined,
      subcategoryName: subcat ? subcat.name : undefined,
      imageUrl: formImageUrl.trim() || undefined,
      purchasePrice: purchaseP,
      sellingPrice: sellingP,
      gstRate: parseFloat(formGstRate) || 0,
      isTaxInclusive: formIsTaxInclusive,
      hsnCode: formHsnCode.trim() || undefined,
      currentStock: parseFloat(formStock) || 0,
      minStock: parseFloat(formMinStock) || 0,
      unit: unitToSave,
      packageSize: formPackageSize.trim() || '1 pc',
      supplierId: formSupplierId || undefined,
      supplierName: supplierContact ? supplierContact.name : undefined,
      notes: formNotes.trim() || undefined,
      isSample: editingProduct ? editingProduct.isSample : false,
      createdAt: editingProduct ? editingProduct.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onSaveProduct(productData);
    sounds.playItemAdded();
    setIsProductModalOpen(false);
  };

  // Restock Handling
  const handleOpenRestock = (prod: Product) => {
    setRestockProduct(prod);
    setRestockQty('10');
    setRestockPrice(prod.purchasePrice.toString());
    setRestockGstRate(prod.gstRate !== undefined ? prod.gstRate.toString() : '18');
    setRestockIsTaxInclusive(true);
    setRestockPaid('');
    setRestockSupplierId(prod.supplierId || '');
    setIsRestockModalOpen(true);
  };

  const handleSaveRestock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockProduct) return;

    const qty = parseFloat(restockQty);
    const price = parseFloat(restockPrice);
    if (isNaN(qty) || qty <= 0) return;
    if (isNaN(price) || price < 0) return;

    const gstPct = parseFloat(restockGstRate) || 0;
    const baseAmount = qty * price;
    let total = baseAmount;
    let taxAmount = 0;
    if (restockIsTaxInclusive) {
      total = baseAmount;
      taxAmount = gstPct > 0 ? (total * gstPct) / (100 + gstPct) : 0;
    } else {
      taxAmount = (baseAmount * gstPct) / 100;
      total = baseAmount + taxAmount;
    }

    const finalTotal = Math.round(total * 100) / 100;
    const finalTax = Math.round(taxAmount * 100) / 100;
    const paid = restockPaid === '' ? finalTotal : parseFloat(restockPaid) || 0;
    const remaining = Math.max(0, finalTotal - paid);

    const supplier = contacts.find(c => c.id === restockSupplierId);

    const purchase: Purchase = {
      id: `pur-${Date.now()}`,
      purchaseNumber: `PUR-${Date.now().toString().slice(-5)}`,
      date: new Date().toISOString(),
      supplierId: restockSupplierId || undefined,
      supplierName: supplier ? supplier.name : (restockProduct.supplierName || 'General Distributor'),
      productId: restockProduct.id,
      productName: restockProduct.name,
      quantity: qty,
      purchasePrice: price,
      gstRate: gstPct,
      taxAmount: finalTax,
      isTaxInclusive: restockIsTaxInclusive,
      totalAmount: finalTotal,
      amountPaid: paid,
      remainingBalance: Math.round(remaining * 100) / 100,
      notes: `Restocked ${qty} ${restockProduct.unit} (GST ${gstPct}%)`,
      createdAt: new Date().toISOString()
    };

    onRecordPurchase(purchase);
    sounds.playPaymentSuccess();
    setIsRestockModalOpen(false);
  };

  // Category & Subcategory Handlers
  const handleAddCategory = () => {
    if (!newCatName.trim()) return;
    const newCat: Category = {
      id: `cat-${Date.now()}`,
      name: newCatName.trim(),
      imageUrl: newCatImageUrl.trim() || undefined,
      subcategories: [],
      createdAt: new Date().toISOString()
    };
    onSaveCategory(newCat);
    setNewCatName('');
    setNewCatImageUrl('');
    sounds.playItemAdded();
  };

  const handleRenameCategory = (cat: Category) => {
    if (!editingCatName.trim()) return;
    onSaveCategory({
      ...cat,
      name: editingCatName.trim(),
      imageUrl: editingCatImageUrl.trim() || undefined
    });
    setEditingCatId(null);
    setEditingCatName('');
    setEditingCatImageUrl('');
    sounds.playItemAdded();
  };

  const handleUpdateCategoryPhoto = (cat: Category, imageUrl: string) => {
    onSaveCategory({
      ...cat,
      imageUrl: imageUrl.trim() || undefined
    });
  };

  const handleAddSubcategory = (cat: Category) => {
    if (!newSubcatName.trim()) return;
    const existing = cat.subcategories || [];
    const newSub: Subcategory = {
      id: `sub-${Date.now()}`,
      name: newSubcatName.trim(),
      imageUrl: newSubcatImageUrl.trim() || undefined
    };
    const updatedCat: Category = {
      ...cat,
      subcategories: [...existing, newSub]
    };
    onSaveCategory(updatedCat);
    setManagingSubcategoriesForCat(updatedCat);
    setNewSubcatName('');
    setNewSubcatImageUrl('');
    sounds.playItemAdded();
  };

  const handleDeleteSubcategory = (cat: Category, subId: string) => {
    const updatedSubcategories = (cat.subcategories || []).filter(s => s.id !== subId);
    const updatedCat: Category = {
      ...cat,
      subcategories: updatedSubcategories
    };
    onSaveCategory(updatedCat);
    setManagingSubcategoriesForCat(updatedCat);
    sounds.playItemRemoved();
  };

  const handleDeleteCategory = (catId: string) => {
    setCatError(null);
    const res = onDeleteCategory(catId);
    if (!res.success) {
      setCatError(res.message || 'Cannot delete this category.');
    }
  };

  const selectedCategoryObj = categories.find(c => c.id === selectedCategoryId);

  return (
    <div className="pb-28 pt-2 px-3 max-w-lg mx-auto space-y-3">
      
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

      {/* Top Controls: Add Product & Manage Categories */}
      <div className="flex gap-2">
        <button
          onClick={handleOpenAddProduct}
          className="flex-1 py-3 px-3 bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm active:scale-98 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4 text-amber-400 dark:text-slate-950 stroke-[3]" />
          <span>Add Product</span>
        </button>

        <button
          onClick={() => setIsCategoryModalOpen(true)}
          className="py-3 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
        >
          <Layers className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          Categories & Subs ({categories.length})
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by product name, brand, code, or subcategory..."
          className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
        />
      </div>

      {/* Category Pills Slider */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
        <button
          onClick={() => { setSelectedCategoryId('all'); setSelectedSubcategoryId('all'); }}
          className={`px-3 py-1.5 rounded-full font-bold whitespace-nowrap transition-all cursor-pointer ${
            selectedCategoryId === 'all'
              ? 'bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-950 shadow-xs'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          All ({products.length})
        </button>

        {categories.map((cat) => {
          const count = products.filter(p => p.categoryId === cat.id).length;
          return (
            <button
              key={cat.id}
              onClick={() => { setSelectedCategoryId(cat.id); setSelectedSubcategoryId('all'); }}
              className={`px-3 py-1.5 rounded-full font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                selectedCategoryId === cat.id
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {cat.imageUrl && (
                <img src={cat.imageUrl} alt="" className="w-3.5 h-3.5 rounded-full object-cover shrink-0" />
              )}
              <span>{cat.name} ({count})</span>
            </button>
          );
        })}
      </div>

      {/* Subcategory Filter Pills (if active category has subcategories) */}
      {selectedCategoryObj && selectedCategoryObj.subcategories && selectedCategoryObj.subcategories.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] bg-slate-50 dark:bg-slate-900/90 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase shrink-0 px-1">Subcategory:</span>
          <button
            onClick={() => setSelectedSubcategoryId('all')}
            className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition-colors cursor-pointer ${
              selectedSubcategoryId === 'all'
                ? 'bg-slate-800 dark:bg-slate-700 text-white shadow-2xs'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            All {selectedCategoryObj.name}
          </button>
          {selectedCategoryObj.subcategories.map(sub => (
            <button
              key={sub.id}
              onClick={() => setSelectedSubcategoryId(sub.id)}
              className={`px-2.5 py-1 rounded-lg font-bold shrink-0 flex items-center gap-1.5 transition-colors cursor-pointer ${
                selectedSubcategoryId === sub.id
                  ? 'bg-amber-500 text-slate-950 shadow-2xs'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              {sub.imageUrl && (
                <img src={sub.imageUrl} alt="" className="w-3.5 h-3.5 rounded-full object-cover" />
              )}
              <span>{sub.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Stock Quick Filter Tabs */}
      <div className="flex gap-1 text-[11px] font-bold bg-slate-100 dark:bg-slate-900 p-0.5 rounded-lg border border-transparent dark:border-slate-800">
        <button
          onClick={() => setStockFilter('all')}
          className={`flex-1 py-1 rounded text-center transition-all cursor-pointer ${
            stockFilter === 'all' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          All Stock
        </button>
        <button
          onClick={() => setStockFilter('low')}
          className={`flex-1 py-1 rounded text-center transition-all cursor-pointer ${
            stockFilter === 'low' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          Low Stock ({products.filter(p => p.currentStock <= p.minStock).length})
        </button>
        <button
          onClick={() => setStockFilter('out')}
          className={`flex-1 py-1 rounded text-center transition-all cursor-pointer ${
            stockFilter === 'out' ? 'bg-rose-500 text-white shadow-xs' : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          Out of Stock ({products.filter(p => p.currentStock === 0).length})
        </button>
      </div>

      {/* Product List */}
      <div className="space-y-2">
        {filteredProducts.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 text-center text-slate-400 dark:text-slate-500 text-xs border border-slate-200 dark:border-slate-800">
            No products match the selected criteria.
          </div>
        ) : (
          filteredProducts.map((product) => {
            const cat = categories.find(c => c.id === product.categoryId);
            const isLow = product.currentStock <= product.minStock;
            const isOut = product.currentStock === 0;

            return (
              <div
                key={product.id}
                className="bg-white dark:bg-slate-900 rounded-2xl p-3 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2 hover:border-amber-400 dark:hover:border-amber-500/60 transition-all"
              >
                {/* Header row with Photo */}
                <div className="flex items-start gap-2.5">
                  {product.imageUrl ? (
                    <div 
                      onClick={() => setImagePreviewZoom({ 
                        url: product.imageUrl!, 
                        title: product.name 
                      })}
                      className="relative w-14 h-14 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shrink-0 cursor-pointer group bg-slate-100 dark:bg-slate-800 shadow-2xs hover:opacity-90 active:scale-95 transition-all"
                      title="Tap to enlarge photo in full-screen"
                    >
                      <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                        <ZoomIn className="w-4 h-4" />
                      </div>
                    </div>
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 shrink-0">
                      <Package className="w-5 h-5" />
                      <span className="text-[8px] font-bold mt-0.5">Stock</span>
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-1">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-xs text-slate-900 dark:text-white">{product.name}</span>
                          {cat && (
                            <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.2 rounded font-medium">
                              {cat.name}
                            </span>
                          )}
                          {product.subcategoryName && (
                            <span className="text-[10px] bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 px-1.5 py-0.2 rounded font-semibold">
                              {product.subcategoryName}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          Brand: <span className="font-semibold text-slate-700 dark:text-slate-300">{product.brand}</span> • Code: <span className="font-mono text-slate-600 dark:text-slate-400">{product.code}</span>
                        </div>
                      </div>

                      {/* Stock Status Pill */}
                      <span className={`text-[11px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${
                        isOut
                          ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-900'
                          : isLow
                          ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                          : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                      }`}>
                        {product.currentStock} {product.unit}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Details Row: Package Size, Purchase & Selling Price */}
                <div className="grid grid-cols-3 gap-1 bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl text-[11px]">
                  <div>
                    <span className="text-slate-400 dark:text-slate-500 block text-[9px] uppercase font-bold">Pack Size</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-200">{product.packageSize}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 dark:text-slate-500 block text-[9px] uppercase font-bold">Purchase Rate</span>
                    <span className="font-medium text-slate-600 dark:text-slate-300">
                      {hideBuyingCost ? '••••••' : formatCurrency(product.purchasePrice)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 dark:text-slate-500 block text-[9px] uppercase font-bold">Selling Rate</span>
                    <span className="font-bold text-amber-700 dark:text-amber-400">{formatCurrency(product.sellingPrice)}</span>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="flex items-center justify-between pt-1 text-xs">
                  <div className="text-[10px] text-slate-400 dark:text-slate-500">
                    Min Alert: {product.minStock} {product.unit}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenRestock(product)}
                      className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg font-bold text-[11px] flex items-center gap-1 shadow-xs cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> + Stock
                    </button>
                    <button
                      onClick={() => handleOpenEditProduct(product)}
                      className="p-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                      title="Edit Product"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    {deletingProductId === product.id ? (
                      <div className="flex items-center gap-1 bg-rose-50 dark:bg-rose-950/60 p-0.5 rounded-lg border border-rose-200 dark:border-rose-900">
                        <button
                          onClick={() => {
                            onDeleteProduct(product.id);
                            setDeletingProductId(null);
                          }}
                          className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-bold cursor-pointer"
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => setDeletingProductId(null)}
                          className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded text-[10px] cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeletingProductId(product.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg cursor-pointer"
                        title="Delete Product"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* =======================================================
          MODAL: ADD / EDIT PRODUCT
         ======================================================= */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden my-auto border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95">
            <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between border-b border-slate-800">
              <span className="font-bold text-sm">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </span>
              <button onClick={() => setIsProductModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-4 space-y-3 max-h-[80vh] overflow-y-auto text-xs">
              {formError && (
                <div className="p-2.5 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 rounded-xl border border-rose-200 dark:border-rose-900 font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Name & Brand */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Tractor Emulsion White / Fevicol SH"
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Brand</label>
                  <input
                    type="text"
                    value={formBrand}
                    onChange={(e) => setFormBrand(e.target.value)}
                    placeholder="e.g. Asian Paints, Pidilite"
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Product Code / SKU</label>
                  <input
                    type="text"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    placeholder="e.g. PNT-001"
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 font-mono"
                  />
                </div>
              </div>

              {/* Category & Subcategory */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Category *</label>
                  <select
                    value={formCategory}
                    onChange={(e) => {
                      setFormCategory(e.target.value);
                      setFormSubcategoryId('');
                    }}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 text-xs"
                  >
                    <option value="">-- Select Category --</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Subcategory</label>
                  <select
                    value={formSubcategoryId}
                    onChange={(e) => setFormSubcategoryId(e.target.value)}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 text-xs"
                  >
                    <option value="">-- No Subcategory --</option>
                    {categories.find(c => c.id === formCategory)?.subcategories?.map(sub => (
                      <option key={sub.id} value={sub.id}>{sub.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Product Stock Photo */}
              <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                <label className="font-bold text-slate-700 dark:text-slate-300 text-xs block">
                  Product Stock Photo
                </label>
                <div className="flex items-center gap-3">
                  {formImageUrl ? (
                    <div className="relative w-16 h-16 rounded-xl border border-slate-300 dark:border-slate-600 overflow-hidden shrink-0 group bg-white dark:bg-slate-900 shadow-2xs">
                      <img src={formImageUrl} alt="Product preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setFormImageUrl('')}
                        className="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        title="Remove photo"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center text-slate-400 shrink-0 bg-white dark:bg-slate-800">
                      <Camera className="w-5 h-5 text-slate-400" />
                      <span className="text-[8px] font-bold mt-0.5">No Photo</span>
                    </div>
                  )}

                  <div className="flex-1 space-y-1.5">
                    <div className="flex gap-1.5">
                      <label className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold cursor-pointer border border-slate-200 dark:border-slate-700 shadow-2xs transition-colors">
                        <Camera className="w-3.5 h-3.5 text-amber-500" />
                        <span>Camera / Gallery</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              try {
                                const compressed = await compressImageFile(file, { maxDimension: 800, quality: 0.76 });
                                setFormImageUrl(compressed);
                              } catch (err) {
                                console.error('Error compressing image:', err);
                              }
                            }
                            e.target.value = '';
                          }}
                        />
                      </label>
                      {formImageUrl && (
                        <button
                          type="button"
                          onClick={() => setFormImageUrl('')}
                          className="px-2.5 py-1.5 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                          title="Remove photo"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <input
                      type="url"
                      placeholder="Or paste photo URL (https://...)"
                      value={formImageUrl}
                      onChange={(e) => setFormImageUrl(e.target.value)}
                      className="w-full p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] text-slate-800 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Unit & Package Size */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Unit</label>
                  <select
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value)}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-800"
                  >
                    {STANDARD_UNITS.map(u => (
                      <option key={u.value} value={u.value}>{u.label}</option>
                    ))}
                  </select>
                  {formUnit === 'custom' && (
                    <input
                      type="text"
                      placeholder="Enter custom unit (e.g. rolls)"
                      value={customUnit}
                      onChange={(e) => setCustomUnit(e.target.value)}
                      className="w-full mt-1.5 p-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg text-xs"
                    />
                  )}
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Package Size</label>
                  <input
                    type="text"
                    value={formPackageSize}
                    onChange={(e) => setFormPackageSize(e.target.value)}
                    placeholder="e.g. 20 Litres, 40 kg, 1 pc"
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-800"
                  />
                </div>
              </div>

              {/* Pricing */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Purchase Cost (₹) *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={formPurchasePrice}
                    onChange={(e) => setFormPurchasePrice(e.target.value)}
                    placeholder="0"
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Selling Price (₹) *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={formSellingPrice}
                    onChange={(e) => setFormSellingPrice(e.target.value)}
                    placeholder="0"
                    className="w-full p-2 bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-700 rounded-xl font-black text-amber-900 dark:text-amber-300 focus:bg-white dark:focus:bg-slate-800"
                  />
                </div>
              </div>

              {/* GST & Tax Configuration */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/70 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    GST & Tax Configuration
                  </span>
                  <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={formIsTaxInclusive}
                      onChange={(e) => setFormIsTaxInclusive(e.target.checked)}
                      className="rounded text-amber-500 focus:ring-amber-400 w-3.5 h-3.5"
                    />
                    <span>Selling Rate includes GST</span>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">GST Rate (%)</label>
                    <select
                      value={formGstRate}
                      onChange={(e) => setFormGstRate(e.target.value)}
                      className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-white"
                    >
                      <option value="0">0% (Nil / Exempt)</option>
                      <option value="5">5% (Building Materials)</option>
                      <option value="12">12% (Paints & Tools)</option>
                      <option value="18">18% (Standard Hardware)</option>
                      <option value="28">28% (Luxury / Cement)</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">HSN / SAC Code</label>
                    <input
                      type="text"
                      value={formHsnCode}
                      onChange={(e) => setFormHsnCode(e.target.value)}
                      placeholder="e.g. 7318, 3208"
                      className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="text-[10px] text-slate-500 dark:text-slate-400">
                  {formIsTaxInclusive
                    ? `Price ₹${formSellingPrice || '0'} already includes ${formGstRate}% GST.`
                    : `${formGstRate}% GST will be added on top of ₹${formSellingPrice || '0'} at billing.`}
                </div>
              </div>

              {/* Stock Levels */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Initial / Current Stock</label>
                  <input
                    type="number"
                    step="any"
                    value={formStock}
                    onChange={(e) => setFormStock(e.target.value)}
                    placeholder="0"
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Minimum Stock Alert</label>
                  <input
                    type="number"
                    step="any"
                    value={formMinStock}
                    onChange={(e) => setFormMinStock(e.target.value)}
                    placeholder="5"
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-800"
                  />
                </div>
              </div>

              {/* Supplier & Notes */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Supplier / Distributor</label>
                <select
                  value={formSupplierId}
                  onChange={(e) => setFormSupplierId(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-800"
                >
                  <option value="">-- Select or None --</option>
                  {contacts.filter(c => c.profession === 'supplier' || c.profession === 'other').map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Notes</label>
                <input
                  type="text"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Optional details, location in godown, etc."
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-800"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-slate-900 dark:bg-amber-500 hover:bg-slate-800 dark:hover:bg-amber-400 text-white dark:text-slate-950 rounded-xl font-bold shadow-md cursor-pointer"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =======================================================
          MODAL: MANAGE CATEGORIES
         ======================================================= */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden my-auto border border-slate-200">
            <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {managingSubcategoriesForCat && (
                  <button
                    onClick={() => setManagingSubcategoriesForCat(null)}
                    className="p-1 rounded-lg hover:bg-slate-800 text-amber-400 font-bold flex items-center gap-1 text-xs"
                  >
                    ← Back
                  </button>
                )}
                <span className="font-bold text-sm">
                  {managingSubcategoriesForCat 
                    ? `Subcategories: ${managingSubcategoriesForCat.name}`
                    : 'Categories & Subcategories'}
                </span>
              </div>
              <button onClick={() => { setIsCategoryModalOpen(false); setManagingSubcategoriesForCat(null); }} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs max-h-[80vh] overflow-y-auto">
              {catError && (
                <div className="p-2 bg-rose-50 text-rose-700 rounded-lg border border-rose-200 font-semibold">
                  {catError}
                </div>
              )}

              {managingSubcategoriesForCat ? (
                /* Subcategory management for active category */
                <div className="space-y-3">
                  <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-amber-800 font-bold block uppercase">Active Category</span>
                      <span className="font-bold text-slate-900 text-sm">{managingSubcategoriesForCat.name}</span>
                    </div>
                    {managingSubcategoriesForCat.imageUrl && (
                      <img src={managingSubcategoriesForCat.imageUrl} alt="" className="w-8 h-8 rounded-lg object-cover border border-amber-300" />
                    )}
                  </div>

                  {/* Add Subcategory Form */}
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <span className="font-bold text-slate-700 text-xs block">+ Add Subcategory</span>
                    <input
                      type="text"
                      value={newSubcatName}
                      onChange={(e) => setNewSubcatName(e.target.value)}
                      placeholder="Subcategory Name (e.g. Interior Emulsion, CPVC Pipes...)"
                      className="w-full p-2 bg-white border border-slate-200 rounded-xl font-medium focus:bg-white text-xs"
                    />
                    <div className="flex items-center gap-2">
                      {newSubcatImageUrl ? (
                        <div className="relative w-9 h-9 rounded-lg overflow-hidden border border-slate-300 shrink-0">
                          <img src={newSubcatImageUrl} alt="" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setNewSubcatImageUrl('')}
                            className="absolute inset-0 bg-black/60 text-white flex items-center justify-center text-xs"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="w-9 h-9 rounded-lg border border-dashed border-slate-300 flex items-center justify-center text-slate-400 shrink-0 bg-white">
                          <Camera className="w-4 h-4 text-slate-400" />
                        </div>
                      )}

                      <label className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 bg-white hover:bg-slate-100 text-slate-800 rounded-xl text-xs font-bold cursor-pointer border border-slate-200 shadow-2xs transition-colors">
                        <Camera className="w-3.5 h-3.5 text-amber-600" />
                        <span>Subcategory Photo</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              try {
                                const compressed = await compressImageFile(file, { maxDimension: 500 });
                                setNewSubcatImageUrl(compressed);
                              } catch (err) {
                                console.error('Error compressing subcategory image:', err);
                              }
                            }
                            e.target.value = '';
                          }}
                        />
                      </label>

                      <button
                        type="button"
                        onClick={() => handleAddSubcategory(managingSubcategoriesForCat)}
                        className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl whitespace-nowrap cursor-pointer text-xs"
                      >
                        + Add Sub
                      </button>
                    </div>
                  </div>

                  {/* Existing Subcategories List */}
                  <div className="space-y-1">
                    <span className="font-bold text-slate-500 text-[10px] uppercase block">
                      Existing Subcategories ({managingSubcategoriesForCat.subcategories?.length || 0})
                    </span>
                    {(!managingSubcategoriesForCat.subcategories || managingSubcategoriesForCat.subcategories.length === 0) ? (
                      <div className="py-4 text-center text-slate-400 bg-slate-50 rounded-xl">
                        No subcategories added yet. Create one above!
                      </div>
                    ) : (
                      <div className="border border-slate-100 rounded-xl divide-y divide-slate-100 max-h-56 overflow-y-auto">
                        {managingSubcategoriesForCat.subcategories.map(sub => (
                          <div key={sub.id} className="p-2.5 flex items-center justify-between bg-white">
                            <div className="flex items-center gap-2">
                              {sub.imageUrl ? (
                                <img src={sub.imageUrl} alt="" className="w-6 h-6 rounded-md object-cover" />
                              ) : (
                                <div className="w-6 h-6 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-400">
                                  #
                                </div>
                              )}
                              <span className="font-bold text-slate-800">{sub.name}</span>
                            </div>
                            <button
                              onClick={() => handleDeleteSubcategory(managingSubcategoriesForCat, sub.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded"
                              title="Delete Subcategory"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Category List & Add Category */
                <div className="space-y-3">
                  {/* Add New Category with Photo */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                    <span className="font-bold text-slate-700 text-xs block">+ Add Category</span>
                    <input
                      type="text"
                      value={newCatName}
                      onChange={(e) => { setNewCatName(e.target.value); setCatError(null); }}
                      placeholder="Category Name (e.g. Paint, Putty, Plumbing, Tools...)"
                      className="w-full p-2 bg-white border border-slate-200 rounded-xl font-medium focus:bg-white text-xs"
                    />

                    <div className="flex items-center gap-2">
                      {newCatImageUrl ? (
                        <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-slate-300 shrink-0">
                          <img src={newCatImageUrl} alt="" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setNewCatImageUrl('')}
                            className="absolute inset-0 bg-black/60 text-white flex items-center justify-center text-xs"
                            title="Remove photo"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-lg border border-dashed border-slate-300 flex items-center justify-center text-slate-400 shrink-0 bg-white">
                          <Camera className="w-4 h-4 text-slate-400" />
                        </div>
                      )}

                      <label className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 bg-white hover:bg-slate-100 text-slate-800 rounded-xl text-xs font-bold cursor-pointer border border-slate-200 shadow-2xs transition-colors">
                        <Camera className="w-3.5 h-3.5 text-amber-600" />
                        <span>Category Photo</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              try {
                                const compressed = await compressImageFile(file, { maxDimension: 600, quality: 0.75 });
                                setNewCatImageUrl(compressed);
                              } catch (err) {
                                console.error('Failed to compress category image:', err);
                              }
                            }
                            e.target.value = '';
                          }}
                        />
                      </label>

                      <button
                        onClick={handleAddCategory}
                        className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 font-black rounded-xl text-xs whitespace-nowrap cursor-pointer shadow-xs"
                      >
                        + Add
                      </button>
                    </div>

                    <input
                      type="url"
                      value={newCatImageUrl}
                      onChange={(e) => setNewCatImageUrl(e.target.value)}
                      placeholder="Or paste photo URL (https://...)"
                      className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-[10px]"
                    />
                  </div>

                  {/* Existing Categories List */}
                  <div className="border border-slate-100 rounded-xl divide-y divide-slate-100 max-h-64 overflow-y-auto">
                    {categories.map((cat) => {
                      const isEditingThis = editingCatId === cat.id;
                      const count = products.filter(p => p.categoryId === cat.id).length;
                      const subCount = cat.subcategories?.length || 0;

                      return (
                        <div key={cat.id} className="p-2.5 flex items-center justify-between">
                          {isEditingThis ? (
                            <div className="flex-1 flex flex-col gap-1.5 mr-2">
                              <div className="flex gap-1.5 items-center">
                                {editingCatImageUrl ? (
                                  <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-amber-300 shrink-0">
                                    <img src={editingCatImageUrl} alt="" className="w-full h-full object-cover" />
                                    <button
                                      type="button"
                                      onClick={() => setEditingCatImageUrl('')}
                                      className="absolute inset-0 bg-black/60 text-white flex items-center justify-center text-xs"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                ) : (
                                  <label className="w-8 h-8 rounded-lg border border-dashed border-amber-400 bg-amber-50 flex items-center justify-center text-amber-700 cursor-pointer shrink-0">
                                    <Camera className="w-3.5 h-3.5" />
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          const compressed = await compressImageFile(file, { maxDimension: 600 });
                                          setEditingCatImageUrl(compressed);
                                        }
                                        e.target.value = '';
                                      }}
                                    />
                                  </label>
                                )}
                                <input
                                  type="text"
                                  value={editingCatName}
                                  onChange={(e) => setEditingCatName(e.target.value)}
                                  className="flex-1 p-1.5 bg-amber-50 border border-amber-300 rounded-lg text-xs font-bold"
                                />
                                <button
                                  onClick={() => handleRenameCategory(cat)}
                                  className="p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 cursor-pointer"
                                  title="Save Category"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => { setEditingCatId(null); setEditingCatImageUrl(''); }}
                                  className="p-1.5 bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
                                  title="Cancel"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              {cat.imageUrl ? (
                                <img src={cat.imageUrl} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0 border border-slate-200" />
                              ) : (
                                <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                                  <Layers className="w-4 h-4 text-slate-400" />
                                </div>
                              )}
                              <div>
                                <span className="font-bold text-slate-800 text-xs">{cat.name}</span>
                                <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                                  <span>{count} products</span>
                                  <span>•</span>
                                  <span>{subCount} subcategories</span>
                                </div>
                              </div>
                            </div>
                          )}

                          {!isEditingThis && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => {
                                  setManagingSubcategoriesForCat(cat);
                                }}
                                className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                                title="Manage Subcategories"
                              >
                                <FolderTree className="w-3 h-3 text-amber-700" />
                                Subs ({subCount})
                              </button>
                              <button
                                onClick={() => {
                                  setEditingCatId(cat.id);
                                  setEditingCatName(cat.name);
                                  setEditingCatImageUrl(cat.imageUrl || '');
                                }}
                                className="p-1 text-slate-400 hover:text-slate-700 rounded cursor-pointer"
                                title="Rename"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteCategory(cat.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="pt-2">
                <button
                  onClick={() => { setIsCategoryModalOpen(false); setManagingSubcategoriesForCat(null); }}
                  className="w-full py-2.5 bg-slate-900 text-white rounded-xl font-bold cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =======================================================
          MODAL: PRODUCT IMAGE PREVIEW LIGHTBOX
         ======================================================= */}
      {imagePreviewZoom && (
        <PhotoLightboxModal
          isOpen={Boolean(imagePreviewZoom)}
          onClose={() => setImagePreviewZoom(null)}
          imageUrl={imagePreviewZoom.url}
          title={imagePreviewZoom.title}
          badge="Product Image"
        />
      )}


      {/* =======================================================
          MODAL: QUICK RESTOCK (PURCHASE)
         ======================================================= */}
      {isRestockModalOpen && restockProduct && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden my-auto border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95">
            <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between border-b border-slate-800">
              <div>
                <span className="font-bold text-sm block">Restock Product</span>
                <span className="text-[10px] text-amber-400">{restockProduct.name}</span>
              </div>
              <button onClick={() => setIsRestockModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRestock} className="p-4 space-y-3 text-xs">
              <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl text-slate-600 dark:text-slate-300 flex justify-between border border-slate-200 dark:border-slate-700">
                <span>Current Stock: <strong className="text-slate-900 dark:text-white">{restockProduct.currentStock} {restockProduct.unit}</strong></span>
                <span>Pack: <strong className="text-slate-900 dark:text-white">{restockProduct.packageSize}</strong></span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Quantity Adding *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={restockQty}
                    onChange={(e) => setRestockQty(e.target.value)}
                    placeholder="10"
                    className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-black text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Purchase Rate (₹) *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={restockPrice}
                    onChange={(e) => setRestockPrice(e.target.value)}
                    placeholder="0"
                    className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* GST Applied on Stock Purchase */}
              <div className="p-2.5 bg-slate-50 dark:bg-slate-800/70 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block text-xs">
                    GST on Purchase
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={restockIsTaxInclusive}
                      onChange={(e) => setRestockIsTaxInclusive(e.target.checked)}
                      className="rounded text-amber-500 focus:ring-amber-400 w-3.5 h-3.5"
                    />
                    <span>Rate is GST-Inclusive</span>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={restockGstRate}
                    onChange={(e) => setRestockGstRate(e.target.value)}
                    className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-white"
                  >
                    <option value="0">0% (Nil / Exempt)</option>
                    <option value="5">5% GST</option>
                    <option value="12">12% GST</option>
                    <option value="18">18% GST (Standard)</option>
                    <option value="28">28% GST</option>
                  </select>

                  <div className="flex flex-col justify-center text-[11px] font-bold text-slate-600 dark:text-slate-300 text-right pr-1">
                    {(() => {
                      const q = parseFloat(restockQty) || 0;
                      const p = parseFloat(restockPrice) || 0;
                      const g = parseFloat(restockGstRate) || 0;
                      const b = q * p;
                      const t = restockIsTaxInclusive 
                        ? (g > 0 ? (b * g) / (100 + g) : 0)
                        : (b * g) / 100;
                      return <span>GST: ₹{t.toFixed(2)}</span>;
                    })()}
                  </div>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Supplier</label>
                <select
                  value={restockSupplierId}
                  onChange={(e) => setRestockSupplierId(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-800"
                >
                  <option value="">-- General Supplier --</option>
                  {contacts.filter(c => c.profession === 'supplier' || c.profession === 'other').map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Amount Paid (₹)</label>
                <input
                  type="number"
                  step="any"
                  value={restockPaid}
                  onChange={(e) => setRestockPaid(e.target.value)}
                  placeholder={(() => {
                    const q = parseFloat(restockQty) || 0;
                    const p = parseFloat(restockPrice) || 0;
                    const g = parseFloat(restockGstRate) || 0;
                    const b = q * p;
                    const tot = restockIsTaxInclusive ? b : b + (b * g) / 100;
                    return `Total ₹${tot.toFixed(2)}`;
                  })()}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-800"
                />
              </div>

              <div className="p-2.5 bg-amber-50 dark:bg-amber-950/50 rounded-xl border border-amber-200 dark:border-amber-800 flex justify-between font-bold text-slate-900 dark:text-white">
                <span>New Total Stock:</span>
                <span className="text-amber-600 dark:text-amber-400 font-black">{(restockProduct.currentStock + (parseFloat(restockQty) || 0))} {restockProduct.unit}</span>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRestockModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl font-black shadow-md cursor-pointer"
                >
                  Confirm Restock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
