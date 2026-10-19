import React, { useState, useEffect } from 'react';
import { ShieldAlert, AlertTriangle, X, Lock, KeyRound, Copy, Check } from 'lucide-react';
import { sounds } from '../utils/sound';

import { auth } from '../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';

interface ResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmReset?: () => void;
  onResetSuccess?: () => void;
}

function generateRandomSecurityCode(length: number = 16): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid ambiguous 0, O, 1, I
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  // Format as 4 groups of 4: XXXX-XXXX-XXXX-XXXX
  return `${result.slice(0, 4)}-${result.slice(4, 8)}-${result.slice(8, 12)}-${result.slice(12, 16)}`;
}

export const ResetModal: React.FC<ResetModalProps> = ({
  isOpen,
  onClose,
  onConfirmReset,
  onResetSuccess
}) => {
  const [securityCode, setSecurityCode] = useState('');
  const [userInput, setUserInput] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  // Generate a brand-new random 16-character security code every time the modal opens
  useEffect(() => {
    if (isOpen) {
      setSecurityCode(generateRandomSecurityCode(16));
      setUserInput('');
      setUserPassword('');
      setError(null);
      setCopied(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(securityCode).then(() => {
        setCopied(true);
        sounds.playTap();
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // 1. Verify 16-character verification code
    const cleanGenerated = securityCode.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    const cleanUser = userInput.replace(/[^A-Za-z0-9]/g, '').toUpperCase();

    if (cleanUser !== cleanGenerated) {
      sounds.playWarning();
      setError('Incorrect 16-character verification code. Please enter the exact code shown above.');
      return;
    }

    // 2. Verify account password or owner PIN
    if (!userPassword.trim()) {
      sounds.playWarning();
      setError('Account password is required for security verification.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (auth.currentUser && auth.currentUser.email) {
        // Authenticate password with Firebase Auth
        await signInWithEmailAndPassword(auth, auth.currentUser.email, userPassword);
      } else {
        // Fallback check against configured cashier PIN or store owner secret
        const configuredPin = localStorage.getItem('ak_cashier_pin');
        if (configuredPin && configuredPin.trim() !== '') {
          if (userPassword !== configuredPin) {
            throw new Error('Incorrect owner PIN/password.');
          }
        }
      }

      sounds.playPaymentSuccess();
      setTimeout(() => {
        if (onConfirmReset) onConfirmReset();
        if (onResetSuccess) onResetSuccess();
        setIsSubmitting(false);
        onClose();
      }, 400);
    } catch (err: any) {
      sounds.playWarning();
      setIsSubmitting(false);
      const code = err?.code || '';
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setError('Incorrect account password. Master reset access denied.');
      } else {
        setError(err?.message || 'Password authorization failed.');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div 
        className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-red-200 dark:border-red-900/60 space-y-4 animate-in fade-in zoom-in-95 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-black text-sm">
            <ShieldAlert className="w-5 h-5" />
            <span>Master Reset Authorization</span>
          </div>
          <button 
            onClick={onClose} 
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Lock Icon */}
        <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto shadow-inner">
          <Lock className="w-6 h-6" />
        </div>

        {/* Warning text */}
        <div className="text-center space-y-1">
          <h3 className="font-black text-base text-slate-900 dark:text-white">Reset Entire Shop Database?</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            This will clear all transactions, credits (udhaar), products, contacts, and stock records.
          </p>
        </div>

        {/* Dynamic 16-character Security Code Box */}
        <div className="p-3 bg-red-50 dark:bg-red-950/40 rounded-xl border border-red-200 dark:border-red-800/60 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-bold text-red-800 dark:text-red-300">
            <span className="flex items-center gap-1">
              <KeyRound className="w-3.5 h-3.5" />
              Dynamic 16-Digit Verification Code:
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className="text-[10px] text-red-700 dark:text-red-300 hover:underline flex items-center gap-1 cursor-pointer"
              title="Copy code"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <div className="py-2 px-3 bg-white dark:bg-slate-800 rounded-lg border border-red-300 dark:border-red-700 text-center font-mono font-black text-sm text-red-600 dark:text-red-400 tracking-wider select-all shadow-inner">
            {securityCode}
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 text-center">
            Type or paste this random 16-character code below to confirm reset:
          </p>
        </div>

        {/* Form input */}
        <form onSubmit={handleReset} className="space-y-3 pt-1">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Confirm 16-Character Code
            </label>
            <input
              type="text"
              value={userInput}
              onChange={(e) => {
                setUserInput(e.target.value);
                if (error) setError(null);
              }}
              placeholder="e.g. XXXX-XXXX-XXXX-XXXX"
              autoFocus
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono uppercase tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-red-500 shadow-xs"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Shop Account Password / Master PIN
            </label>
            <input
              type="password"
              value={userPassword}
              onChange={(e) => {
                setUserPassword(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Enter your login password or master PIN"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-red-500 shadow-xs"
            />
            {error && (
              <p className="text-xs font-semibold text-red-600 dark:text-red-400 mt-1.5 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>{error}</span>
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="py-2.5 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !userInput.trim()}
              className="py-2.5 px-3 bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-md transition-colors flex items-center justify-center gap-1 cursor-pointer"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Confirm Reset</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
