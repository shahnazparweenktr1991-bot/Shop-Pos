import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  Cloud, 
  CloudCheck, 
  RefreshCw, 
  Moon, 
  Sun, 
  Volume2, 
  VolumeX, 
  Store, 
  Smartphone, 
  Download, 
  Upload, 
  Trash2, 
  RotateCcw, 
  ShieldAlert, 
  Lock, 
  Mail, 
  User, 
  LogOut, 
  Check, 
  AlertCircle,
  FileText,
  Phone,
  QrCode,
  Sliders,
  Printer,
  CreditCard,
  Bell,
  Sparkles,
  KeyRound,
  FileSpreadsheet,
  Database,
  Globe,
  FolderArchive,
  History,
  CloudUpload,
  Activity,
  Copy,
  CheckCheck
} from 'lucide-react';
import { cloudSync, UserProfile, SyncStatus } from '../utils/cloudSync';
import { ShopStorage } from '../utils/storage';
import { sounds } from '../utils/sound';
import { voiceAssistant, VoicePersona, VoiceLanguage } from '../utils/voiceAssistant';
import { getPublicAppUrl, getQrCodeUrl } from '../utils/appUrl';

interface SettingsViewProps {
  darkMode: boolean;
  onToggleDarkMode: () => void;
  hideBuyingCost: boolean;
  onToggleHideBuyingCost: () => void;
  hasDemoData: boolean;
  onClearDemoData: () => void;
  onLoadDemoData: () => void;
  onOpenResetModal: () => void;
  onOpenInstallModal: () => void;
  onDataRefresh: () => void;
  showToast: (msg: string) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  darkMode,
  onToggleDarkMode,
  hideBuyingCost,
  onToggleHideBuyingCost,
  hasDemoData,
  onClearDemoData,
  onLoadDemoData,
  onOpenResetModal,
  onOpenInstallModal,
  onDataRefresh,
  showToast,
}) => {
  // Cloud Sync state
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(cloudSync.getUser());
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(cloudSync.getLastSyncTime());
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [autoSync, setAutoSync] = useState<boolean>(cloudSync.isAutoSyncEnabled());

  // Auth form state
  const [authMode, setAuthMode] = useState<'login' | 'register'>('register');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authShopName, setAuthShopName] = useState(() => localStorage.getItem('ak_shop_name') || 'Hardware & Tools');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Shop Profile state
  const [shopName, setShopName] = useState(() => localStorage.getItem('ak_shop_name') || 'Hardware & Tools');
  const [shopAddress, setShopAddress] = useState(() => localStorage.getItem('ak_shop_address') || 'Main Market, City Center');
  const [shopPhone, setShopPhone] = useState(() => localStorage.getItem('ak_shop_phone') || '');
  const [isShopSaved, setIsShopSaved] = useState(false);

  // FEATURE 1: AI Voice Announcements
  const [voiceEnabled, setVoiceEnabled] = useState(() => voiceAssistant.getIsEnabled());
  const [voiceRate, setVoiceRate] = useState(() => voiceAssistant.getRate());
  const [voiceLanguage, setVoiceLanguage] = useState<VoiceLanguage>(() => voiceAssistant.getLanguage());
  const [voicePersona, setVoicePersona] = useState<VoicePersona>(() => voiceAssistant.getPersona());



  // FEATURE 2: UPI QR Code & Payment Info
  const [shopUpiId, setShopUpiId] = useState(() => localStorage.getItem('ak_shop_upi_id') || '');
  const [showUpiQrOnInvoice, setShowUpiQrOnInvoice] = useState(() => localStorage.getItem('ak_show_upi_qr') !== 'false');

  // FEATURE 3: Low Stock Threshold Default
  const [lowStockThreshold, setLowStockThreshold] = useState<number>(() => {
    try {
      return parseInt(localStorage.getItem('ak_low_stock_threshold') || '5', 10);
    } catch {
      return 5;
    }
  });

  // FEATURE 4: Invoice Slip Format (Thermal vs Standard)
  const [invoiceFormat, setInvoiceFormat] = useState<'thermal' | 'standard'>(() => {
    return (localStorage.getItem('ak_invoice_format') as any) || 'thermal';
  });
  const [shopGstNumber, setShopGstNumber] = useState(() => localStorage.getItem('ak_shop_gst') || '');

  // FEATURE 5: Default Billing Payment Mode
  const [defaultPaymentMethod, setDefaultPaymentMethod] = useState<'cash' | 'upi' | 'credit'>(() => {
    return (localStorage.getItem('ak_default_payment_mode') as any) || 'cash';
  });

  // FEATURE 6: Cashier PIN Lock Protection
  const [cashierPin, setCashierPin] = useState(() => localStorage.getItem('ak_cashier_pin') || '');
  const [isPinLockEnabled, setIsPinLockEnabled] = useState(() => localStorage.getItem('ak_pin_lock_enabled') === 'true');

  // Sound state
  const [soundEnabled, setSoundEnabled] = useState(() => sounds.getSoundEnabled());

  // Listen for sync updates
  useEffect(() => {
    const unsubscribe = cloudSync.subscribe((status, lastSync, err) => {
      setSyncStatus(status);
      setLastSyncTime(lastSync);
      if (err) setSyncError(err);
      if (status === 'synced') setSyncError(null);
    });
    return unsubscribe;
  }, []);

  const handleToggleSound = () => {
    const next = sounds.toggleSound();
    setSoundEnabled(next);
    showToast(next ? 'Sound effects enabled' : 'Sound effects muted');
  };

  const handleToggleVoice = () => {
    const next = !voiceEnabled;
    setVoiceEnabled(next);
    voiceAssistant.setIsEnabled(next);
    showToast(next ? 'AI Voice announcements ON' : 'AI Voice announcements muted');
    if (next) {
      voiceAssistant.speak(voiceLanguage === 'hi' ? 'आवाज उद्घोषणाएं चालू कर दी गई हैं।' : 'Voice announcements enabled.');
    }
  };

  const handleLanguageChange = (lang: VoiceLanguage) => {
    setVoiceLanguage(lang);
    voiceAssistant.setLanguage(lang);
    showToast(lang === 'hi' ? 'Voice set to Hindi (हिंदी)' : 'Voice set to English');
    voiceAssistant.announcePurchase('Ramesh Kumar');
  };

  const handlePersonaChange = (p: VoicePersona) => {
    setVoicePersona(p);
    voiceAssistant.setPersona(p);
    setVoiceRate(voiceAssistant.getRate());
    voiceAssistant.announcePurchase('Ramesh Kumar');
    const label = p === 'polite_customer_care' ? 'Polite Customer Care' : p === 'friendly_retail' ? 'Energetic Retail Counter' : 'Fast Billing Register';
    showToast(`Voice style: ${label}`);
  };

  const handleTestVoice = () => {
    sounds.playTap();
    voiceAssistant.announcePurchase('Ramesh Kumar');
    showToast(voiceLanguage === 'hi' ? 'हिंदी में उद्घोषणा सुनाई जा रही है...' : 'Playing customer greeting announcement...');
  };

  const handleVoiceRateChange = (rate: number) => {
    setVoiceRate(rate);
    voiceAssistant.setRate(rate);
    voiceAssistant.announcePurchase('Ramesh Kumar');
  };

  const handleSaveShopProfile = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('ak_shop_name', shopName);
    localStorage.setItem('ak_shop_address', shopAddress);
    localStorage.setItem('ak_shop_phone', shopPhone);
    localStorage.setItem('ak_shop_upi_id', shopUpiId);
    localStorage.setItem('ak_show_upi_qr', String(showUpiQrOnInvoice));
    localStorage.setItem('ak_shop_gst', shopGstNumber);
    localStorage.setItem('ak_low_stock_threshold', String(lowStockThreshold));
    localStorage.setItem('ak_invoice_format', invoiceFormat);
    localStorage.setItem('ak_default_payment_mode', defaultPaymentMethod);
    localStorage.setItem('ak_cashier_pin', cashierPin);
    localStorage.setItem('ak_pin_lock_enabled', String(isPinLockEnabled));

    setIsShopSaved(true);
    setTimeout(() => setIsShopSaved(false), 2000);
    showToast('Settings & preferences saved successfully!');
    sounds.playTap();
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    const cleanEmail = authEmail.trim();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setAuthError('Please enter a valid email address.');
      return;
    }
    if (authPassword.length < 6) {
      setAuthError('Password must be at least 6 characters long.');
      return;
    }

    setAuthLoading(true);

    try {
      if (authMode === 'register') {
        const res = await cloudSync.register({
          email: cleanEmail,
          password: authPassword,
          name: authName,
          shopName: authShopName,
        });
        if (res.success) {
          setCurrentUser(res.user || null);
          showToast('Account registered! Live cloud sync is active.');
          sounds.playPaymentSuccess();
          onDataRefresh();
        } else {
          setAuthError(res.error || 'Registration failed');
        }
      } else {
        const res = await cloudSync.login({
          email: cleanEmail,
          password: authPassword,
        });
        if (res.success) {
          setCurrentUser(res.user || null);
          showToast('Logged in! Synchronized with your cloud database.');
          sounds.playPaymentSuccess();
          onDataRefresh();
        } else {
          setAuthError(res.error || 'Login failed');
        }
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    setAuthLoading(true);
    try {
      const res = await cloudSync.loginWithGoogle();
      if (res.success) {
        setCurrentUser(res.user || null);
        showToast('Signed in with Google! Cloud sync is active.');
        sounds.playPaymentSuccess();
        onDataRefresh();
      } else {
        setAuthError(res.error || 'Google Sign-In failed');
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const [copiedDiag, setCopiedDiag] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  const handleLogout = async () => {
    await cloudSync.logout();
    setCurrentUser(null);
    onDataRefresh();
    showToast('Signed out successfully. Previous account records detached.');
    sounds.playTap();
  };

  const handleSendPasswordReset = async () => {
    const cleanEmail = authEmail.trim();
    if (!cleanEmail) {
      setAuthError('Please enter your account email address above first, then click "Forgot Password".');
      return;
    }
    setAuthLoading(true);
    setAuthError(null);
    try {
      const res = await cloudSync.sendPasswordReset(cleanEmail);
      if (res.success) {
        showToast(`Password reset link sent to ${cleanEmail}! Please check your inbox or spam.`);
      } else {
        setAuthError(res.error || 'Failed to send reset email');
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleCopyDiagnostics = () => {
    const diag = cloudSync.getDiagnostics();
    const text = [
      '--- A.K. HARDWARE DIAGNOSTICS REPORT ---',
      `Timestamp: ${new Date().toISOString()}`,
      `App Version: ${diag.appVersion}`,
      `Auth Status: ${diag.authStatus}`,
      `Account Masked: ${diag.userEmailMasked || 'None (Guest)'} (${diag.userIdMasked || 'None'})`,
      `Sync Status: ${diag.syncStatus}`,
      `Network Online: ${diag.isOnline ? 'Yes' : 'No'}`,
      `Initial Hydration: ${diag.initialHydrationComplete ? 'Complete' : 'In Progress / Pending'}`,
      `Last Sync: ${diag.lastSuccessfulSync || 'Never'}`,
      `Pending Writes: ${diag.pendingWritesCount}`,
      `Products: ${diag.collectionCounts.products} | Bills: ${diag.collectionCounts.sales} | Contacts: ${diag.collectionCounts.contacts}`,
      `Purchases: ${diag.collectionCounts.purchases} | Payments: ${diag.collectionCounts.payments} | Expenses: ${diag.collectionCounts.expenses}`,
      `Verified Sample Records: ${diag.sampleRecordsCount}`,
      `Last Error: ${diag.lastError || 'None'}`,
      '----------------------------------------'
    ].join('\n');

    navigator.clipboard.writeText(text).then(() => {
      setCopiedDiag(true);
      setTimeout(() => setCopiedDiag(false), 2500);
      showToast('Sanitized diagnostics report copied to clipboard!');
      sounds.playTap();
    }).catch(() => {
      showToast('Could not copy report to clipboard.');
    });
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    sounds.playTap();
    try {
      const res = await cloudSync.syncNow();
      if (res.success) {
        showToast('Database synced across devices!');
        sounds.playPaymentSuccess();
        onDataRefresh();
      } else {
        showToast(`Sync warning: ${res.error}`);
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const handleToggleAutoSync = () => {
    const next = !autoSync;
    setAutoSync(next);
    cloudSync.setAutoSyncEnabled(next);
    showToast(next ? 'Automatic background sync ON' : 'Automatic sync OFF');
  };



  return (
    <div className="pb-28 pt-3 px-3 max-w-lg mx-auto space-y-4 animate-in fade-in duration-150">
      
      {/* Top Header */}
      <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-amber-500" />
            Shop Settings & Features
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Cloud database sync, AI voice, UPI QR code, print formats & appearance
          </p>
        </div>
      </div>

      {/* 1. CLOUD SYNC & MULTI-DEVICE ACCOUNTS */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Cloud className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Multi-Device Cloud Sync</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Live database synchronization across phones & computers
              </p>
            </div>
          </div>
          {currentUser && (
            <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full">
              <CloudCheck className="w-3.5 h-3.5" />
              Connected
            </span>
          )}
        </div>

        {currentUser ? (
          /* Logged In State */
          <div className="space-y-3 pt-1">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-slate-400">Active Account:</span>
                <span className="font-bold text-xs text-slate-900 dark:text-white truncate max-w-[180px]">
                  {currentUser.email}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-slate-400">Owner Name:</span>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {currentUser.name || 'Shop Owner'}
                </span>
              </div>
              {lastSyncTime && (
                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                  <span>Last Cloud Sync:</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {new Date(lastSyncTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
              )}
            </div>

            {syncError && (
              <div className="p-2 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{syncError}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleManualSync}
                disabled={isSyncing}
                className="py-2.5 px-3 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all active:scale-98 disabled:opacity-60 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="py-2.5 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>

            <div className="flex items-center justify-between pt-1 text-xs text-slate-600 dark:text-slate-400">
              <span className="font-medium">Auto-sync when online:</span>
              <button
                type="button"
                onClick={handleToggleAutoSync}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                  autoSync ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform absolute top-1 ${
                    autoSync ? 'left-6' : 'left-1'
                  }`}
                />
              </button>
            </div>
          </div>
        ) : (
          /* Registration / Login Tabs */
          <div className="space-y-3 pt-1">
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => { setAuthMode('register'); setAuthError(null); }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  authMode === 'register'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Register Shop Account
              </button>
              <button
                type="button"
                onClick={() => { setAuthMode('login'); setAuthError(null); }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  authMode === 'login'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Sign In
              </button>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Create an account with email and password so your shop data automatically syncs across every phone and computer you log into.
            </p>

            {authError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 rounded-xl text-xs text-rose-700 dark:text-rose-300 space-y-1.5">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                  <span className="font-semibold leading-relaxed">{authError}</span>
                </div>
                {authError.includes('Firebase') && (
                  <div className="text-[11px] bg-white/70 dark:bg-slate-900/70 p-2.5 rounded-lg text-slate-700 dark:text-slate-300 space-y-1 border border-rose-100 dark:border-rose-900/60">
                    <p className="font-bold text-slate-900 dark:text-white">To enable Email/Password in Firebase Console:</p>
                    <ol className="list-decimal list-inside space-y-0.5 text-[10px] text-slate-600 dark:text-slate-300">
                      <li>Open <span className="font-mono font-semibold">console.firebase.google.com</span></li>
                      <li>Select project <span className="font-mono font-semibold">persuasive-campus-3pqwl</span></li>
                      <li>Go to <strong>Authentication</strong> → <strong>Sign-in method</strong> tab</li>
                      <li>Click <strong>Email/Password</strong> and toggle <strong>Enable</strong>, then save</li>
                      <li>Or tap <strong>"Continue with Google"</strong> below to sign in directly!</li>
                    </ol>
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-2.5">
              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Email Address *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder="shop@akware.com"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Password *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900"
                  />
                </div>
                {authMode === 'login' && (
                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={handleSendPasswordReset}
                      className="text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                    >
                      Forgot Password?
                    </button>
                  </div>
                )}
              </div>

              {authMode === 'register' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Owner Name
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
                      <input
                        type="text"
                        value={authName}
                        onChange={(e) => setAuthName(e.target.value)}
                        placeholder="e.g. Atif Khan"
                        className="w-full pl-8 pr-2 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Shop Title
                    </label>
                    <input
                      type="text"
                      value={authShopName}
                      onChange={(e) => setAuthShopName(e.target.value)}
                      placeholder="e.g. Metro Hardware & Electricals"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 rounded-xl text-xs font-black shadow-md transition-all active:scale-98 disabled:opacity-60 cursor-pointer"
              >
                {authLoading
                  ? 'Connecting...'
                  : authMode === 'register'
                  ? 'Create Account & Enable Cloud Sync'
                  : 'Sign In & Load Cloud Data'}
              </button>

              <div className="relative my-3 flex items-center justify-center">
                <div className="border-t border-slate-200 dark:border-slate-800 w-full"></div>
                <span className="bg-white dark:bg-slate-900 px-2 text-[10px] uppercase font-bold text-slate-400 absolute">
                  OR
                </span>
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={authLoading}
                className="w-full py-2.5 px-4 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold shadow-2xs flex items-center justify-center gap-2.5 transition-all active:scale-98 disabled:opacity-60 cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Continue with Google</span>
              </button>
            </form>
          </div>
        )}
      </div>

      {/* 2. AI VOICE ASSISTANT SETTINGS */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">AI Voice Announcements</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Speaks "Thank you for shopping with {shopName}" upon checkout
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleToggleVoice}
            className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
              voiceEnabled ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-700'
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform absolute top-1 ${
                voiceEnabled ? 'left-6' : 'left-1'
              }`}
            />
          </button>
        </div>

        {voiceEnabled && (
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-3 text-xs animate-in fade-in">
            {/* Language Switcher: English vs Hindi */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-amber-500" />
                  Voice Language:
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">Bilingual Support</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleLanguageChange('en')}
                  className={`py-2 px-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    voiceLanguage === 'en'
                      ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  <span>English (Natural Retail)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleLanguageChange('hi')}
                  className={`py-2 px-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    voiceLanguage === 'hi'
                      ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  <span>हिंदी (Hindi Greeting)</span>
                </button>
              </div>
            </div>

            {/* Voice Style / Persona (3 options) */}
            <div className="space-y-1.5 pt-1 border-t border-slate-200 dark:border-slate-700/60">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700 dark:text-slate-300">Tone & Personality:</span>
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold truncate max-w-[150px]">
                  {voiceAssistant.getSelectedVoiceName()}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'polite_customer_care' as VoicePersona, label: 'Polite Care', desc: 'Soft & courteous' },
                  { id: 'friendly_retail' as VoicePersona, label: 'Energetic Counter', desc: 'Warm & natural' },
                  { id: 'fast_register' as VoicePersona, label: 'Fast Register', desc: 'Swift & concise' },
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handlePersonaChange(p.id)}
                    className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                      voicePersona === p.id
                        ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-2xs font-bold'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    <div className="font-bold text-[11px] leading-tight">{p.label}</div>
                    <div className={`text-[9px] mt-0.5 leading-tight ${voicePersona === p.id ? 'text-slate-900/80' : 'text-slate-400'}`}>{p.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-slate-200 dark:border-slate-700/60">
              <span className="font-medium text-slate-700 dark:text-slate-300">Voice Speed:</span>
              <div className="flex gap-1.5">
                {[
                  { label: 'Slow (0.8x)', val: 0.8 },
                  { label: 'Normal (0.95x)', val: 0.95 },
                  { label: 'Fast (1.1x)', val: 1.1 }
                ].map((s) => (
                  <button
                    key={s.val}
                    type="button"
                    onClick={() => handleVoiceRateChange(s.val)}
                    className={`py-1 px-2 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                      Math.abs(voiceRate - s.val) < 0.05
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={handleTestVoice}
              className="w-full py-2 px-3 bg-amber-500/20 hover:bg-amber-500/30 text-amber-900 dark:text-amber-200 border border-amber-400/40 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Volume2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Test Customer Care Announcement</span>
            </button>
          </div>
        )}
      </div>

      {/* 3. UPI QR CODE & PAYMENT CONFIGURATION */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-3">
        <div className="flex items-center gap-2">
          <QrCode className="w-4 h-4 text-emerald-500" />
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">UPI QR Code & Digital Payments</h3>
        </div>
        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          Enter your Google Pay, PhonePe, or Paytm UPI ID to display a payment QR code directly on invoices for instant customer scanning.
        </p>

        <div className="space-y-2.5 text-xs">
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Shop UPI ID (VPA)
            </label>
            <input
              type="text"
              value={shopUpiId}
              onChange={(e) => setShopUpiId(e.target.value)}
              placeholder="e.g. ak_hardware@okhdfcbank or 9876543210@paytm"
              className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex items-center justify-between py-1">
            <span className="font-medium text-slate-700 dark:text-slate-300">
              Display UPI QR Code on invoices:
            </span>
            <button
              type="button"
              onClick={() => setShowUpiQrOnInvoice(!showUpiQrOnInvoice)}
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                showUpiQrOnInvoice ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform absolute top-1 ${
                  showUpiQrOnInvoice ? 'left-6' : 'left-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* 4. BILLING PREFERENCES & LOW STOCK THRESHOLD */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-3">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-purple-500" />
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">Billing & Inventory Rules</h3>
        </div>

        <div className="space-y-3 text-xs">
          {/* Low Stock Alert Threshold */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-slate-700 dark:text-slate-300">
                Low Stock Alert Quantity:
              </label>
              <span className="font-black text-rose-600 dark:text-rose-400">
                Alert when ≤ {lowStockThreshold} units
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {[2, 5, 8, 10].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setLowStockThreshold(num)}
                  className={`py-1.5 rounded-xl font-bold transition-colors cursor-pointer ${
                    lowStockThreshold === num
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {num} Units
                </button>
              ))}
            </div>
          </div>

          {/* Default Payment Method */}
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Default Payment Mode for New Bills:
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: 'cash', label: 'Cash' },
                { id: 'upi', label: 'UPI / Online' },
                { id: 'credit', label: 'Udhar / Khata' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setDefaultPaymentMethod(m.id as any)}
                  className={`py-1.5 rounded-xl font-bold text-xs transition-colors cursor-pointer ${
                    defaultPaymentMethod === m.id
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Invoice Print Layout */}
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Receipt & Print Slip Layout:
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => setInvoiceFormat('standard')}
                className={`py-2 px-2.5 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  invoiceFormat === 'standard'
                    ? 'bg-slate-900 dark:bg-slate-700 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Standard Invoice</span>
              </button>

              <button
                type="button"
                onClick={() => setInvoiceFormat('thermal')}
                className={`py-2 px-2.5 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  invoiceFormat === 'thermal'
                    ? 'bg-slate-900 dark:bg-slate-700 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                }`}
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Thermal Slip (58/80mm)</span>
              </button>
            </div>
          </div>

          {/* GST / Tax Number */}
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
              GST / Trade Tax Number (Optional)
            </label>
            <input
              type="text"
              value={shopGstNumber}
              onChange={(e) => setShopGstNumber(e.target.value)}
              placeholder="e.g. 24AAAAA0000A1Z5"
              className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* 5. SHOP PROFILE & INVOICE HEADER FORM */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-3">
        <div className="flex items-center gap-2">
          <Store className="w-4 h-4 text-amber-500" />
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">Shop Profile & Address</h3>
        </div>

        <form onSubmit={handleSaveShopProfile} className="space-y-2.5 text-xs">
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Shop Name</label>
            <input
              type="text"
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Shop Address</label>
            <input
              type="text"
              value={shopAddress}
              onChange={(e) => setShopAddress(e.target.value)}
              className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Shop Phone / WhatsApp</label>
            <input
              type="tel"
              value={shopPhone}
              onChange={(e) => setShopPhone(e.target.value)}
              placeholder="e.g. +91 9876543210"
              className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 px-3 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            {isShopSaved ? <Check className="w-4 h-4 text-emerald-400" /> : <FileText className="w-4 h-4" />}
            <span>{isShopSaved ? 'Settings Saved Successfully!' : 'Save All Settings & Profile'}</span>
          </button>
        </form>
      </div>

      {/* 6. THEME & APPEARANCE */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-3">
        <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
          {darkMode ? <Moon className="w-4 h-4 text-purple-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
          Display & Appearance
        </h3>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {/* Dark Mode Toggle */}
          <div className="py-2.5 flex items-center justify-between">
            <div>
              <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block">Dark Mode</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                High-contrast dark theme for night billing
              </span>
            </div>
            <button
              type="button"
              onClick={onToggleDarkMode}
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                darkMode ? 'bg-purple-600' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform absolute top-1 ${
                  darkMode ? 'left-6' : 'left-1'
                }`}
              />
            </button>
          </div>

          {/* Customer Mode Toggle */}
          <div className="py-2.5 flex items-center justify-between">
            <div>
              <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block">Customer Mode</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Hides wholesale purchase costs in front of customers
              </span>
            </div>
            <button
              type="button"
              onClick={onToggleHideBuyingCost}
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                hideBuyingCost ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform absolute top-1 ${
                  hideBuyingCost ? 'left-6' : 'left-1'
                }`}
              />
            </button>
          </div>

          {/* Sound Effects Toggle */}
          <div className="py-2.5 flex items-center justify-between">
            <div>
              <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block">Touch & Chime Sounds</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Audio feedback for button taps and bill completion
              </span>
            </div>
            <button
              type="button"
              onClick={handleToggleSound}
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                soundEnabled ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform absolute top-1 ${
                  soundEnabled ? 'left-6' : 'left-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* 7. INSTALL PHONE APP (PWA) */}
      <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 dark:from-emerald-950/40 dark:to-teal-950/30 rounded-2xl border border-emerald-500/30 p-4 shadow-xs space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Install Phone App (PWA)</h3>
              <p className="text-[11px] text-slate-600 dark:text-slate-300">
                Works on any Android or iPhone without permission errors
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenInstallModal}
          className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>Open Public Link & QR Code Setup</span>
        </button>
      </div>



      {/* 9. SAMPLE DATA & MASTER RESET */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-rose-200 dark:border-rose-950 p-4 shadow-xs space-y-3">
        <h3 className="font-bold text-sm text-rose-700 dark:text-rose-400 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-rose-500" />
          Database Management & Master Reset
        </h3>

        <div className="flex flex-wrap gap-2 pt-1">
          {hasDemoData ? (
            <button
              type="button"
              onClick={onClearDemoData}
              className="flex-1 py-2 px-3 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 text-amber-600" />
              <span>Clear Sample Records</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onLoadDemoData}
              className="flex-1 py-2 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Load Sample Demo Data</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenResetModal}
            className="flex-1 py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Master Reset (Password)</span>
          </button>
        </div>
      </div>

      {/* 10. SYSTEM DIAGNOSTICS & SYNC MONITOR */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">System Diagnostics & Sync Monitor</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Real-time connection, UID account partition & sync health
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowDiagnostics(!showDiagnostics)}
            className="py-1 px-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold cursor-pointer transition-colors"
          >
            {showDiagnostics ? 'Hide' : 'Inspect'}
          </button>
        </div>

        {showDiagnostics && (
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 block font-semibold uppercase">Auth State</span>
                <span className="font-bold text-slate-900 dark:text-white capitalize">
                  {cloudSync.getDiagnostics().authStatus}
                </span>
              </div>
              <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 block font-semibold uppercase">Account Partition</span>
                <span className="font-bold text-slate-900 dark:text-white font-mono text-[11px]">
                  {cloudSync.getDiagnostics().userIdMasked || 'Guest (Local)'}
                </span>
              </div>
              <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 block font-semibold uppercase">Sync Status</span>
                <span className="font-bold text-slate-900 dark:text-white capitalize flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${cloudSync.getDiagnostics().syncStatus === 'synced' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  {cloudSync.getDiagnostics().syncStatus}
                </span>
              </div>
              <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 block font-semibold uppercase">Write Queue</span>
                <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                  {cloudSync.getDiagnostics().pendingWritesCount} pending
                </span>
              </div>
            </div>

            <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-500 dark:text-slate-400">Owner Email:</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{cloudSync.getDiagnostics().userEmailMasked || 'None (Guest Mode)'}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-500 dark:text-slate-400">Last Synced:</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {cloudSync.getDiagnostics().lastSuccessfulSync
                    ? new Date(cloudSync.getDiagnostics().lastSuccessfulSync!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                    : 'Awaiting sync'}
                </span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-500 dark:text-slate-400">Verified Sample Items:</span>
                <span className="font-black text-amber-600 dark:text-amber-400">{cloudSync.getDiagnostics().sampleRecordsCount} records</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCopyDiagnostics}
              className="w-full py-2 px-3 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              {copiedDiag ? <CheckCheck className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
              <span>{copiedDiag ? 'Copied to Clipboard!' : 'Copy Sanitized Diagnostic Report'}</span>
            </button>
          </div>
        )}
      </div>

      {/* App info */}
      <div className="text-center text-[10px] text-slate-400 dark:text-slate-600 pt-2 pb-4">
        {shopName} • Cloud POS v3.0 • Multi-Device Real-Time Sync Active
      </div>
    </div>
  );
};
