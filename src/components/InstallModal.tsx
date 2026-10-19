import React, { useState, useEffect } from 'react';
import { 
  Smartphone, 
  Download, 
  Share, 
  PlusSquare, 
  CheckCircle, 
  ExternalLink, 
  X, 
  ShieldCheck, 
  QrCode, 
  MessageCircle, 
  Globe 
} from 'lucide-react';
import { sounds } from '../utils/sound';
import { getPublicAppUrl, getQrCodeUrl } from '../utils/appUrl';
import { LogoEmblem } from './LogoEmblem';

interface InstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  deferredPrompt?: any;
  onInstalled?: () => void;
}

export const InstallModal: React.FC<InstallModalProps> = ({
  isOpen,
  onClose,
  deferredPrompt,
  onInstalled
}) => {
  const [copied, setCopied] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showQr, setShowQr] = useState(false);

  useEffect(() => {
    const ua = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(ua);
    setIsIOS(isIosDevice);

    const standalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    setIsStandalone(Boolean(standalone));
  }, []);

  if (!isOpen) return null;

  // Always use the public preview link so other phones open without permission error
  const publicUrl = getPublicAppUrl();
  const qrUrl = getQrCodeUrl(publicUrl);

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(publicUrl).then(() => {
        setCopied(true);
        sounds.playPaymentSuccess();
        setTimeout(() => setCopied(false), 2500);
      });
    }
  };

  const rawShopName = localStorage.getItem('ak_shop_name') || 'Hardware POS';
  const shopName = rawShopName.trim();

  const handleNativeShare = async () => {
    sounds.playTap();
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${shopName} App`,
          text: `Open and install ${shopName} shop management & billing app:`,
          url: publicUrl,
        });
        return;
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
      }
    }
    handleShareWhatsApp();
  };

  const handleShareWhatsApp = () => {
    sounds.playTap();
    const text = encodeURIComponent(
      `📲 *Install ${shopName} App*\n` +
      `Tap this link on your phone to open and install the shop management app (Free, no Play Store login needed):\n` +
      `${publicUrl}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          sounds.playPaymentSuccess();
          if (onInstalled) onInstalled();
          onClose();
        }
      } catch (err) {
        console.error('Install prompt error:', err);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 overflow-y-auto">
      <div 
        className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-4 sm:p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-3.5 animate-in fade-in zoom-in-95 my-auto max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-black text-sm">
            <Smartphone className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span>Install on Any Phone</span>
          </div>
          <button 
            onClick={onClose} 
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Public Permission Notice */}
        <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl text-[11px] text-emerald-800 dark:text-emerald-300 space-y-1">
          <div className="font-bold flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Public Open-Access Link Configured:</span>
          </div>
          <p className="text-[10px] text-emerald-700 dark:text-emerald-400 leading-relaxed">
            This public link works on <strong>any phone or tablet</strong> without requiring permission or Google developer accounts.
          </p>
        </div>

        {/* App Banner */}
        <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border border-amber-200 dark:border-amber-800/60">
          <div className="shrink-0">
            <LogoEmblem size="md" />
          </div>
          <div className="min-w-0">
            <h4 className="font-black text-slate-900 dark:text-white text-sm leading-tight truncate">{shopName}</h4>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 truncate">Store Management & Billing POS</p>
            <div className="flex items-center gap-1 text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold mt-0.5">
              <ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0" />
              <span>Full PWA • Works full screen</span>
            </div>
          </div>
        </div>

        {/* Standalone already installed notice */}
        {isStandalone && (
          <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>You are running {shopName} in standalone phone app mode!</span>
          </div>
        )}

        {/* Native 1-click Install Prompt button if available */}
        {deferredPrompt && (
          <button
            onClick={handleInstallClick}
            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-2xl font-black text-xs shadow-md flex items-center justify-center gap-2 transition-transform active:scale-98 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Install One-Tap on This Phone</span>
          </button>
        )}

        {/* 1-Tap Share Actions */}
        <div className="grid grid-cols-3 gap-1.5">
          <button
            onClick={handleNativeShare}
            className="py-2 px-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 shadow-2xs transition-colors cursor-pointer"
            title="Share to any app or device"
          >
            <Share className="w-3.5 h-3.5" />
            <span>Share</span>
          </button>

          <button
            onClick={handleShareWhatsApp}
            className="py-2 px-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 shadow-2xs transition-colors cursor-pointer"
            title="Send on WhatsApp"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>WhatsApp</span>
          </button>

          <button
            onClick={() => setShowQr(!showQr)}
            className="py-2 px-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
          >
            <QrCode className="w-3.5 h-3.5 text-amber-500" />
            <span>{showQr ? 'Hide QR' : 'Scan QR'}</span>
          </button>
        </div>

        {/* Clean URL Input with Copy & Open */}
        <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-1.5">
          <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block uppercase tracking-wider">
            App Web Link (Paste in browser on any phone):
          </label>
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              readOnly
              value={publicUrl}
              className="flex-1 p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] font-mono text-slate-700 dark:text-slate-300 select-all"
            />
            <button
              onClick={handleCopyLink}
              className={`py-1.5 px-2.5 rounded-lg text-xs font-bold shrink-0 transition-colors cursor-pointer ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-amber-500 hover:bg-amber-600 text-slate-950'
              }`}
            >
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>

        {/* QR Code Scan View */}
        {showQr && (
          <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-center space-y-2 animate-in fade-in">
            <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
              Point your other phone's camera at this QR code:
            </p>
            <div className="w-44 h-44 mx-auto bg-white p-2 rounded-xl shadow-inner border border-slate-200">
              <img src={qrUrl} alt="Scan QR code to install" className="w-full h-full object-contain" />
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              It will instantly open the public website on your phone without asking for permission!
            </p>
          </div>
        )}

        {/* Instructions by Platform */}
        <div className="space-y-2 text-xs">
          <h5 className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[10px]">
            How to install on any device:
          </h5>

          {/* Android instructions */}
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1">
            <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 text-xs">
              <span className="w-4 h-4 rounded-full bg-slate-800 dark:bg-slate-700 text-white flex items-center justify-center text-[10px]">1</span>
              <span>Android (Chrome / Samsung Internet):</span>
            </div>
            <p className="text-slate-600 dark:text-slate-400 text-[11px] pl-5 leading-relaxed">
              Open the link, tap <strong>three dots (⋮)</strong> in Chrome, then tap <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.
            </p>
          </div>

          {/* iPhone instructions */}
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1">
            <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 text-xs">
              <span className="w-4 h-4 rounded-full bg-slate-800 dark:bg-slate-700 text-white flex items-center justify-center text-[10px]">2</span>
              <span>iPhone (Safari):</span>
            </div>
            <p className="text-slate-600 dark:text-slate-400 text-[11px] pl-5 leading-relaxed">
              Open link in Safari, tap <strong>Share <Share className="w-3 h-3 inline text-blue-500" /></strong>, scroll and tap <strong>"Add to Home Screen" <PlusSquare className="w-3 h-3 inline" /></strong>.
            </p>
          </div>
        </div>

        {/* Copy App Link */}
        <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={handleCopyLink}
            className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
              copied
                ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200'
            }`}
          >
            {copied ? <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> : <ExternalLink className="w-3.5 h-3.5 text-slate-500" />}
            <span>{copied ? 'Public Link Copied!' : 'Copy Public Link (Works on all phones)'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
