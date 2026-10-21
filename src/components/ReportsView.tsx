import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  AlertTriangle, 
  Receipt, 
  Plus, 
  Trash2, 
  Calendar, 
  PieChart, 
  ChevronRight, 
  ArrowDownLeft, 
  ArrowUpRight,
  Package
} from 'lucide-react';
import { Sale, Expense, Product } from '../types';
import { formatCurrency, formatDateTime } from '../utils/formatters';

interface ReportsViewProps {
  sales: Sale[];
  expenses: Expense[];
  products: Product[];
  onAddExpense: (expense: Expense) => void;
  onDeleteExpense: (expenseId: string) => void;
  onViewProductStock: (filter?: 'low') => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  sales,
  expenses,
  products,
  onAddExpense,
  onDeleteExpense,
  onViewProductStock
}) => {
  const [timeframe, setTimeframe] = useState<'today' | 'yesterday' | 'week' | 'month' | 'all'>('today');
  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null);

  // Expense modal
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseCategory, setExpenseCategory] = useState<'rent' | 'electricity' | 'tea_snacks' | 'staff' | 'transport' | 'maintenance' | 'other'>('tea_snacks');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseNotes, setExpenseNotes] = useState('');

  // Filter sales and expenses by timeframe
  const { filteredSales, filteredExpenses } = useMemo(() => {
    const now = new Date();
    const todayStr = now.toDateString();

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();

    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const matchDate = (iso: string) => {
      const d = new Date(iso);
      if (timeframe === 'today') return d.toDateString() === todayStr;
      if (timeframe === 'yesterday') return d.toDateString() === yesterdayStr;
      if (timeframe === 'week') return d >= startOfWeek;
      if (timeframe === 'month') return d >= startOfMonth;
      return true; // all
    };

    return {
      filteredSales: sales.filter(s => s.status === 'finalised' && matchDate(s.date)),
      filteredExpenses: expenses.filter(e => matchDate(e.date))
    };
  }, [sales, expenses, timeframe]);

  // Calculations
  const totalRevenue = filteredSales.reduce((acc, s) => acc + s.totalAmount, 0);
  const itemisedSalesCount = filteredSales.filter(s => s.type === 'itemised').length;
  const amountOnlySalesCount = filteredSales.filter(s => s.type === 'amount_only').length;

  // Decision 15: COGS & Profit analysis
  // If wholesale purchase cost is zero or unrecorded, mark profit as "Unavailable" rather than fabricating misleading 100% margins
  const cogsData = useMemo(() => {
    let totalCost = 0;
    let costRecordedItemCount = 0;

    for (const sale of filteredSales) {
      if (sale.type === 'itemised' && sale.items && sale.items.length > 0) {
        for (const item of sale.items) {
          if (item.purchasePrice !== undefined && item.purchasePrice > 0) {
            totalCost += item.purchasePrice * (item.quantity || 0);
            costRecordedItemCount++;
          }
        }
      }
    }

    const hasRecordedCost = costRecordedItemCount > 0;
    return {
      totalCost,
      hasRecordedCost,
      costRecordedItemCount,
    };
  }, [filteredSales]);

  // When sales exist but wholesale cost is unknown or zero, mark profit as Unavailable per Decision 15
  const isCostRecorded = cogsData.hasRecordedCost;
  const costOfGoodsSold = isCostRecorded ? cogsData.totalCost : null;
  const grossProfit = isCostRecorded ? Math.max(0, totalRevenue - cogsData.totalCost) : null;
  const totalExpenses = filteredExpenses.reduce((acc, e) => acc + e.amount, 0);
  const netProfit = grossProfit !== null ? grossProfit - totalExpenses : null;
  const grossMarginPct = (grossProfit !== null && totalRevenue > 0) ? Math.round((grossProfit / totalRevenue) * 100) : null;

  // Low stock products
  const lowStockProducts = products.filter(p => p.currentStock <= p.minStock);

  // Submit Expense
  const [customCategoryName, setCustomCategoryName] = useState('');

  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(expenseAmount);
    if (isNaN(amt) || amt <= 0) return;

    const effectiveNotes = customCategoryName.trim()
      ? `[${customCategoryName.trim()}] ${expenseNotes.trim()}`.trim()
      : expenseNotes.trim() || undefined;

    const newExp: Expense = {
      id: `exp-${Date.now()}`,
      date: new Date().toISOString(),
      category: expenseCategory,
      amount: amt,
      notes: effectiveNotes,
      createdAt: new Date().toISOString()
    };

    onAddExpense(newExp);
    setExpenseAmount('');
    setExpenseNotes('');
    setCustomCategoryName('');
    setIsExpenseModalOpen(false);
  };

  return (
    <div className="pb-28 pt-2 px-3 max-w-lg mx-auto space-y-3.5">
      
      {/* Timeframe Selector Pills */}
      <div className="flex gap-1 overflow-x-auto p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold scrollbar-none">
        {[
          { id: 'today', label: 'Today' },
          { id: 'yesterday', label: 'Yesterday' },
          { id: 'week', label: 'This Week' },
          { id: 'month', label: 'This Month' },
          { id: 'all', label: 'All Time' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTimeframe(t.id as any)}
            className={`flex-1 py-1.5 px-2 rounded-lg transition-all text-center whitespace-nowrap cursor-pointer ${
              timeframe === t.id
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 1. FINANCIAL PROFIT & LOSS DASHBOARD */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-xl space-y-3">
        <div className="flex justify-between items-center text-xs text-slate-400 border-b border-slate-800 pb-2">
          <span className="uppercase tracking-wider font-semibold">Financial Summary</span>
          <span className="capitalize text-amber-400 font-bold">{timeframe}</span>
        </div>

        {/* Big Net Profit Display */}
        <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700">
          <div className="flex justify-between items-center">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                Net Profit
              </span>
              {netProfit !== null ? (
                <span className={`text-2xl font-black tracking-tight ${
                  netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {formatCurrency(netProfit)}
                </span>
              ) : (
                <div className="mt-0.5">
                  <span className="text-xl font-black text-amber-400">Unavailable</span>
                  <span className="text-[10px] text-slate-400 block">Wholesale purchase cost not recorded</span>
                </div>
              )}
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Gross Margin</span>
              <span className="text-lg font-black text-amber-400">
                {grossMarginPct !== null ? `${grossMarginPct}%` : 'Unavailable'}
              </span>
            </div>
          </div>
        </div>

        {/* Detailed Breakdown Grid */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2.5 bg-slate-800/40 rounded-xl">
            <span className="text-[10px] text-slate-400 uppercase block font-semibold">Total Revenue</span>
            <span className="text-sm font-black text-white mt-0.5 block">{formatCurrency(totalRevenue)}</span>
            <span className="text-[10px] text-slate-400">
              {filteredSales.length} bills ({itemisedSalesCount} itemised, {amountOnlySalesCount} quick)
            </span>
          </div>

          <div className="p-2.5 bg-slate-800/40 rounded-xl">
            <span className="text-[10px] text-slate-400 uppercase block font-semibold">Cost of Goods (COGS)</span>
            <span className="text-sm font-black text-rose-300 mt-0.5 block">
              {costOfGoodsSold !== null ? formatCurrency(costOfGoodsSold) : 'Unavailable'}
            </span>
            <span className="text-[10px] text-slate-400">
              {costOfGoodsSold !== null ? 'Inventory cost' : 'Purchase cost unrecorded'}
            </span>
          </div>

          <div className="p-2.5 bg-slate-800/40 rounded-xl">
            <span className="text-[10px] text-slate-400 uppercase block font-semibold">Gross Profit</span>
            <span className="text-sm font-black text-emerald-400 mt-0.5 block">
              {grossProfit !== null ? formatCurrency(grossProfit) : 'Unavailable'}
            </span>
            <span className="text-[10px] text-slate-400">
              {grossProfit !== null ? 'Revenue minus COGS' : 'Cost not recorded'}
            </span>
          </div>

          <div className="p-2.5 bg-slate-800/40 rounded-xl">
            <span className="text-[10px] text-slate-400 uppercase block font-semibold">Shop Expenses</span>
            <span className="text-sm font-black text-amber-300 mt-0.5 block">{formatCurrency(totalExpenses)}</span>
            <span className="text-[10px] text-slate-400">{filteredExpenses.length} entries</span>
          </div>
        </div>
      </div>

      {/* 2. EXPENSES TRACKER */}
      <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-xs space-y-2.5">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div>
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
              Shop Expenses ({formatCurrency(totalExpenses)})
            </span>
            <span className="text-[10px] text-slate-400">Tea, rent, electricity, freight, staff</span>
          </div>
          <button
            onClick={() => setIsExpenseModalOpen(true)}
            className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5 text-amber-400" />
            + Expense
          </button>
        </div>

        {filteredExpenses.length === 0 ? (
          <div className="py-4 text-center text-slate-400 text-xs">
            No expenses recorded for this timeframe.
          </div>
        ) : (
          <div className="space-y-1.5 divide-y divide-slate-100">
            {filteredExpenses.map((exp) => (
              <div key={exp.id} className="pt-1.5 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-slate-800 capitalize">
                    {exp.category.replace('_', ' ')}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {formatDateTime(exp.date)} {exp.notes ? `• ${exp.notes}` : ''}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-black text-slate-900 text-xs">{formatCurrency(exp.amount)}</span>
                  {deletingExpenseId === exp.id ? (
                    <div className="flex items-center gap-1 bg-rose-50 p-0.5 rounded border border-rose-200">
                      <button
                        onClick={() => {
                          onDeleteExpense(exp.id);
                          setDeletingExpenseId(null);
                        }}
                        className="px-1.5 py-0.5 bg-rose-600 text-white rounded text-[10px] font-bold"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => setDeletingExpenseId(null)}
                        className="px-1 py-0.5 bg-slate-200 text-slate-700 rounded text-[10px]"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeletingExpenseId(exp.id)}
                      className="text-slate-400 hover:text-rose-600 p-1"
                      title="Delete expense"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. LOW STOCK ALERT SUMMARY */}
      <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-xs space-y-2.5">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Low Stock Alerts ({lowStockProducts.length})
            </span>
          </div>
          <button
            onClick={() => onViewProductStock('low')}
            className="text-xs font-bold text-amber-600 hover:text-amber-800"
          >
            Manage Inventory
          </button>
        </div>

        {lowStockProducts.length === 0 ? (
          <div className="py-4 text-center text-emerald-600 font-semibold text-xs bg-emerald-50 rounded-xl">
            All items are adequately stocked!
          </div>
        ) : (
          <div className="divide-y divide-slate-100 space-y-1">
            {lowStockProducts.map((p) => (
              <div key={p.id} className="pt-1.5 pb-1 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-slate-800">{p.name}</div>
                  <div className="text-[10px] text-slate-500">
                    {p.brand} • {p.packageSize}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black text-rose-600 block">
                    {p.currentStock} {p.unit}
                  </span>
                  <span className="text-[10px] text-slate-400">Min: {p.minStock}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* =======================================================
          MODAL: ADD EXPENSE
         ======================================================= */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden my-auto border border-slate-200">
            <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
              <span className="font-bold text-sm">Add Shop Expense</span>
              <button onClick={() => setIsExpenseModalOpen(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="p-4 space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Expense Category *</label>
                <select
                  value={expenseCategory}
                  onChange={(e) => setExpenseCategory(e.target.value as any)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:bg-white capitalize"
                >
                  <option value="tea_snacks">☕ Tea & Snacks</option>
                  <option value="transport">🚚 Transport / Freight</option>
                  <option value="electricity">💡 Electricity Bill</option>
                  <option value="rent">🏠 Shop Rent</option>
                  <option value="staff">👥 Staff Salary / Wages</option>
                  <option value="maintenance">🔧 Maintenance & Repair</option>
                  <option value="other">📋 Other Expenses (Custom)</option>
                </select>
                {expenseCategory === 'other' && (
                  <input
                    type="text"
                    value={customCategoryName}
                    onChange={(e) => setCustomCategoryName(e.target.value)}
                    placeholder="Enter custom category name (e.g. Packaging, Printing)"
                    className="mt-2 w-full p-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white text-xs"
                  />
                )}
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Amount (₹) *</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  placeholder="0"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-black text-lg text-slate-900 focus:bg-white"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Description / Notes</label>
                <input
                  type="text"
                  value={expenseNotes}
                  onChange={(e) => setExpenseNotes(e.target.value)}
                  placeholder="e.g. Tempo freight from transport depot"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold shadow-md"
                >
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
