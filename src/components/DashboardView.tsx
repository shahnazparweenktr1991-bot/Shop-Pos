import React from 'react';
import { 
  Package, 
  AlertTriangle, 
  Receipt, 
  ArrowUpRight, 
  PlusCircle, 
  Zap, 
  Calculator, 
  CreditCard, 
  Plus, 
  TrendingUp, 
  ChevronRight,
  Clock,
  Wrench
} from 'lucide-react';
import { Product, Sale, Contact } from '../types';
import { formatCurrency, formatDateTime } from '../utils/formatters';

interface DashboardViewProps {
  products: Product[];
  sales: Sale[];
  contacts: Contact[];
  onNewBill: (type: 'itemised' | 'amount_only') => void;
  onAddProduct: () => void;
  onOpenCalculator: () => void;
  onOpenKhata: () => void;
  onOpenRestock: (product: Product) => void;
  onViewProductStock: (filter?: 'low') => void;
  onViewSale: (sale: Sale) => void;
  onOpenReports: () => void;
  onOpenDirectory?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  products,
  sales,
  contacts,
  onNewBill,
  onAddProduct,
  onOpenCalculator,
  onOpenKhata,
  onOpenRestock,
  onViewProductStock,
  onViewSale,
  onOpenReports,
  onOpenDirectory
}) => {
  // Today's Date Calculation
  const todayDateString = new Date().toDateString();
  const todaySales = sales.filter(s => {
    return new Date(s.date).toDateString() === todayDateString && s.status === 'finalised';
  });

  const todayRevenue = todaySales.reduce((acc, s) => acc + s.totalAmount, 0);
  const todayReceived = todaySales.reduce((acc, s) => acc + s.amountReceived, 0);
  const todayCreditGiven = todaySales.reduce((acc, s) => acc + s.remainingBalance, 0);

  // Stock calculations
  const totalProducts = products.length;
  const lowStockProducts = products.filter(p => p.currentStock <= p.minStock);

  // Customer credit receivable (positive balance on non-suppliers)
  const totalCustomerCredit = contacts
    .filter(c => c.profession !== 'supplier' && c.creditBalance > 0)
    .reduce((acc, c) => acc + c.creditBalance, 0);

  // Supplier dues payable (negative balance on suppliers)
  const totalSupplierDues = contacts
    .filter(c => c.creditBalance < 0)
    .reduce((acc, c) => acc + Math.abs(c.creditBalance), 0);

  return (
    <div className="pb-24 pt-3 px-3 max-w-lg mx-auto space-y-4">
      
      {/* 1. KEY METRICS GRID */}
      <div className="grid grid-cols-2 gap-2.5">
        
        {/* Today's Sales Card */}
        <div 
          onClick={onOpenReports}
          className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl p-3.5 text-white shadow-md relative overflow-hidden cursor-pointer hover:shadow-lg transition-all"
        >
          <div className="flex items-center justify-between text-amber-100 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Today's Sales</span>
            <TrendingUp className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black tracking-tight">{formatCurrency(todayRevenue)}</div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-amber-400/30 text-[11px] text-amber-100">
            <span>{todaySales.length} bills today</span>
            <span className="font-semibold underline flex items-center">
              Reports <ChevronRight className="w-3 h-3 ml-0.5 inline" />
            </span>
          </div>
        </div>

        {/* Low Stock Alert Card */}
        <div 
          onClick={() => onViewProductStock('low')}
          className={`rounded-2xl p-3.5 shadow-md relative overflow-hidden cursor-pointer transition-all ${
            lowStockProducts.length > 0 
              ? 'bg-gradient-to-br from-rose-500 to-rose-600 text-white' 
              : 'bg-gradient-to-br from-emerald-600 to-emerald-700 text-white'
          }`}
        >
          <div className="flex items-center justify-between text-rose-100 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Low Stock</span>
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black tracking-tight">
            {lowStockProducts.length} <span className="text-xs font-normal opacity-80">items</span>
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/20 text-[11px]">
            <span>{totalProducts} total products</span>
            <span className="font-semibold underline flex items-center">
              View <ChevronRight className="w-3 h-3 ml-0.5 inline" />
            </span>
          </div>
        </div>

        {/* Customer Credit (Udhar) */}
        <div 
          onClick={onOpenKhata}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 text-slate-800 dark:text-slate-100 shadow-xs cursor-pointer hover:border-amber-400 transition-all"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-semibold">Customer Udhar</span>
            <CreditCard className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="text-lg font-bold text-rose-600 dark:text-rose-400">{formatCurrency(totalCustomerCredit)}</div>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Pending to collect</p>
        </div>

        {/* Supplier Dues */}
        <div 
          onClick={onOpenKhata}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 text-slate-800 dark:text-slate-100 shadow-xs cursor-pointer hover:border-amber-400 transition-all"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-semibold">Supplier Dues</span>
            <Package className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="text-lg font-bold text-slate-800 dark:text-white">{formatCurrency(totalSupplierDues)}</div>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">To pay to distributors</p>
        </div>

      </div>

      {/* 2. BIG QUICK ACTION BUTTONS */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-3.5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2.5">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-0.5">Quick Actions</h2>
        
        <div className="grid grid-cols-2 gap-2">
          {/* Create Itemised Bill Button */}
          <button
            onClick={() => onNewBill('itemised')}
            className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-900 dark:bg-slate-800 text-white hover:bg-slate-800 dark:hover:bg-slate-700 active:scale-98 transition-all shadow-sm text-left cursor-pointer"
          >
            <div className="w-9 h-9 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center shrink-0">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-xs leading-tight">New Bill</div>
              <div className="text-[10px] text-slate-400">Itemised + stock</div>
            </div>
          </button>

          {/* Quick Amount-Only Sale */}
          <button
            onClick={() => onNewBill('amount_only')}
            className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-950 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/40 active:scale-98 transition-all shadow-xs text-left cursor-pointer"
          >
            <div className="w-9 h-9 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <div className="font-bold text-xs leading-tight">Quick Amount</div>
              <div className="text-[10px] text-amber-700 dark:text-amber-400">No stock deduction</div>
            </div>
          </button>
        </div>

        <div className="grid grid-cols-4 gap-1.5 pt-1">
          {/* Add Product */}
          <button
            onClick={onAddProduct}
            className="flex flex-col items-center justify-center p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 active:scale-95 transition-all cursor-pointer"
          >
            <PlusCircle className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400 mb-1" />
            <span className="text-[10px] font-semibold text-center leading-tight">Add Item</span>
          </button>

          {/* Karigar Directory */}
          <button
            onClick={onOpenDirectory}
            className="flex flex-col items-center justify-center p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 active:scale-95 transition-all cursor-pointer"
          >
            <Wrench className="w-4.5 h-4.5 text-amber-500 mb-1" />
            <span className="text-[10px] font-semibold text-center leading-tight">Karigars</span>
          </button>

          {/* Material Calculator */}
          <button
            onClick={onOpenCalculator}
            className="flex flex-col items-center justify-center p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 active:scale-95 transition-all cursor-pointer"
          >
            <Calculator className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-400 mb-1" />
            <span className="text-[10px] font-semibold text-center leading-tight">Estimator</span>
          </button>

          {/* Khata / Udhar */}
          <button
            onClick={onOpenKhata}
            className="flex flex-col items-center justify-center p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 active:scale-95 transition-all cursor-pointer"
          >
            <CreditCard className="w-4.5 h-4.5 text-purple-600 dark:text-purple-400 mb-1" />
            <span className="text-[10px] font-semibold text-center leading-tight">Khata</span>
          </button>
        </div>
      </div>

      {/* 3. LOW STOCK WARNING LIST (If any) */}
      {lowStockProducts.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-rose-800 font-bold text-xs uppercase tracking-wider">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>Restock Needed ({lowStockProducts.length})</span>
            </div>
            <button
              onClick={() => onViewProductStock('low')}
              className="text-xs font-semibold text-rose-700 hover:text-rose-900"
            >
              View All
            </button>
          </div>

          <div className="space-y-1.5">
            {lowStockProducts.slice(0, 3).map((prod) => (
              <div 
                key={prod.id} 
                className="bg-white p-2.5 rounded-xl border border-rose-200 flex items-center justify-between"
              >
                <div className="pr-2">
                  <div className="font-bold text-xs text-slate-800 leading-tight">{prod.name}</div>
                  <div className="text-[11px] text-slate-500">
                    {prod.brand} • {prod.packageSize}
                  </div>
                  <div className="text-[11px] text-rose-600 font-semibold mt-0.5">
                    Stock: {prod.currentStock} {prod.unit} (Min: {prod.minStock})
                  </div>
                </div>
                <button
                  onClick={() => onOpenRestock(prod)}
                  className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold flex items-center gap-1 shrink-0 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Restock
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. TODAY'S SALES / RECENT TRANSACTIONS */}
      <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-xs space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-slate-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">Recent Sales</h3>
          </div>
          <span className="text-xs text-slate-400">{todaySales.length} today</span>
        </div>

        {todaySales.length === 0 ? (
          <div className="text-center py-6 text-slate-400 text-xs">
            No sales recorded today yet.
            <div className="mt-2">
              <button
                onClick={() => onNewBill('itemised')}
                className="px-3 py-1.5 bg-slate-900 text-white rounded-lg font-semibold text-xs"
              >
                Create First Bill
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {todaySales.slice(0, 5).map((sale) => (
              <div
                key={sale.id}
                onClick={() => onViewSale(sale)}
                className="p-2.5 rounded-xl border border-slate-100 hover:border-amber-300 bg-slate-50/50 hover:bg-amber-50/30 flex items-center justify-between cursor-pointer transition-all"
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-slate-800">{sale.customerName}</span>
                    <span className={`text-[9px] px-1.5 py-0.2 rounded font-semibold uppercase ${
                      sale.type === 'amount_only' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {sale.type === 'amount_only' ? 'Quick' : 'Itemised'}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {sale.billNumber} • {formatDateTime(sale.date)}
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-black text-xs text-slate-900">{formatCurrency(sale.totalAmount)}</div>
                  {sale.remainingBalance > 0 ? (
                    <span className="text-[10px] text-rose-600 font-bold block">
                      Due: {formatCurrency(sale.remainingBalance)}
                    </span>
                  ) : (
                    <span className="text-[10px] text-emerald-600 font-semibold block">
                      Paid ({sale.paymentMethod.toUpperCase()})
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
