import React from 'react';
import { LayoutDashboard, Receipt, Package, Calculator, Users, Settings, Wrench } from 'lucide-react';

export type NavTab = 'dashboard' | 'billing' | 'products' | 'directory' | 'contacts' | 'calculator' | 'reports' | 'settings';

interface BottomNavProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  lowStockCount: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onTabChange,
  lowStockCount
}) => {
  const tabs = [
    { id: 'dashboard' as NavTab, label: 'Home', icon: LayoutDashboard },
    { id: 'billing' as NavTab, label: 'Billing', icon: Receipt },
    { id: 'products' as NavTab, label: 'Stock', icon: Package, badge: lowStockCount > 0 ? lowStockCount : undefined },
    { id: 'directory' as NavTab, label: 'Karigars', icon: Wrench },
    { id: 'contacts' as NavTab, label: 'Khata', icon: Users },
    { id: 'calculator' as NavTab, label: 'Calc', icon: Calculator },
    { id: 'settings' as NavTab, label: 'Settings', icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shadow-lg px-1 py-1 safe-area-bottom">
      <div className="max-w-md mx-auto grid grid-cols-7 gap-0.5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center py-1.5 px-0.5 rounded-xl transition-all relative cursor-pointer ${
                isActive
                  ? 'text-amber-600 dark:text-amber-400 font-black bg-amber-50/90 dark:bg-amber-950/40 scale-102'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium'
              }`}
            >
              <div className="relative">
                <Icon className={`w-4.5 h-4.5 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
                {tab.badge !== undefined && (
                  <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[9px] font-bold rounded-full h-3.5 min-w-[14px] px-1 flex items-center justify-center">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight leading-none">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
