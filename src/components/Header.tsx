import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  BarChart3, 
  Eye, 
  EyeOff, 
  Smartphone, 
  Settings as SettingsIcon,
  RefreshCw,
  Cloud,
  CloudOff
} from 'lucide-react';
import { Product } from '../types';
import { cloudSync, SyncStatus } from '../utils/cloudSync';
import { LogoEmblem } from './LogoEmblem';

interface HeaderProps {
  products: Product[];
  hideBuyingCost: boolean;
  onToggleHideBuyingCost: () => void;
  onViewLowStock: () => void;
  onOpenReports: () => void;
  onOpenSettings: () => void;
  onOpenInstallModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  products,
  hideBuyingCost,
  onToggleHideBuyingCost,
  onViewLowStock,
  onOpenReports,
  onOpenSettings,
  onOpenInstallModal
}) => {
  const lowStockCount = products.filter(p => p.currentStock <= p.minStock).length;
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(cloudSync.getStatus());
  const [isCloudUser, setIsCloudUser] = useState<boolean>(cloudSync.isLoggedIn());

  useEffect(() => {
    const unsub = cloudSync.subscribe((status) => {
      setSyncStatus(status);
      setIsCloudUser(cloudSync.isLoggedIn());
    });
    return unsub;
  }, []);

  const shopName = localStorage.getItem('ak_shop_name') || 'Hardware & Paints Store';
  const shopAddress = localStorage.getItem('ak_shop_address') || 'Main Market, Local City';
  const customLogoUrl = localStorage.getItem('ak_shop_logo');

  return (
    <header className="sticky top-0 z-30 bg-slate-900 text-white shadow-md">
      {/* Top Banner */}
      <div className="max-w-4xl mx-auto px-3.5 py-2.5 flex items-center justify-between">
        
        {/* Left: Emblem Logo & Dynamic Shop Branding */}
        <div 
          onClick={onOpenSettings} 
          className="flex items-center gap-2.5 min-w-0 cursor-pointer group"
          title="Click to customize shop name, address or logo"
        >
          {customLogoUrl ? (
            <img 
              src={customLogoUrl} 
              alt={shopName} 
              className="w-9 h-9 rounded-xl object-contain bg-white p-0.5 shadow-xs border border-amber-500/40 shrink-0 group-hover:scale-105 transition-transform" 
            />
          ) : (
            <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center p-1 shadow-inner border border-amber-500/30 shrink-0 group-hover:scale-105 transition-transform">
              <LogoEmblem className="w-full h-full" />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="font-black text-sm sm:text-base leading-tight tracking-tight text-white flex items-center gap-1.5 truncate">
              {shopName}
            </h1>
            <p className="text-[10px] sm:text-[11px] text-amber-400 font-medium leading-tight truncate">
              {shopAddress}
            </p>
          </div>
        </div>

        {/* Right: Actions and Live Cloud Sync Indicator */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Low Stock Alert Button */}
          {lowStockCount > 0 && (
            <button
              onClick={onViewLowStock}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-bold hover:bg-amber-500/30 transition-colors animate-pulse cursor-pointer"
              title="View low stock products"
            >
              <AlertTriangle className="w-3 h-3 text-amber-400" />
              <span>{lowStockCount} Low</span>
            </button>
          )}

          {/* Customer Mode (Hide Buying Cost) Toggle */}
          <button
            onClick={onToggleHideBuyingCost}
            className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              hideBuyingCost
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
            }`}
            title={hideBuyingCost ? 'Customer Mode Active: Buying costs hidden' : 'Tap to hide buying costs in front of customers'}
          >
            {hideBuyingCost ? <EyeOff className="w-3.5 h-3.5 text-emerald-400" /> : <Eye className="w-3.5 h-3.5 text-slate-400" />}
            <span className="hidden sm:inline text-[10px]">{hideBuyingCost ? 'Costs Hidden' : 'Show Cost'}</span>
          </button>

          {/* Install App on Phone button */}
          {onOpenInstallModal && (
            <button
              onClick={onOpenInstallModal}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-2xs transition-colors cursor-pointer"
              title="Install App on Phone / PWA"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden xs:inline text-[11px]">Install</span>
            </button>
          )}

          {/* Quick Reports Icon */}
          <button
            onClick={onOpenReports}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
            title="Reports & Analytics"
          >
            <BarChart3 className="w-4.5 h-4.5" />
          </button>

          {/* Dedicated Header Settings Gear Icon with Live Cloud Sync Status Element */}
          <div className="relative">
            <button
              onClick={onOpenSettings}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-amber-400 hover:bg-slate-700 transition-colors cursor-pointer flex items-center justify-center relative"
              title={
                isCloudUser
                  ? syncStatus === 'syncing'
                    ? 'Cloud Sync: Actively pushing changes...'
                    : syncStatus === 'synced'
                    ? 'Firebase Live Sync: Connected & up to date across all devices'
                    : syncStatus === 'offline'
                    ? 'Offline: Changes saved locally, auto-syncing when online'
                    : 'Cloud Sync: Error (tap to check settings)'
                  : 'Settings & Cloud Sync'
              }
            >
              <SettingsIcon className="w-4.5 h-4.5" />

              {/* Live Sync Status Indicator on Gear */}
              {isCloudUser && (
                <>
                  {syncStatus === 'syncing' && (
                    <span className="absolute -top-1 -right-1 flex items-center justify-center w-3.5 h-3.5 rounded-full bg-amber-500 text-slate-950 shadow-xs">
                      <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                    </span>
                  )}
                  {syncStatus === 'synced' && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border border-slate-900"></span>
                    </span>
                  )}
                  {syncStatus === 'offline' && (
                    <span className="absolute -top-1 -right-1 flex items-center justify-center w-3 h-3 rounded-full bg-slate-600 text-slate-300">
                      <CloudOff className="w-2 h-2" />
                    </span>
                  )}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
