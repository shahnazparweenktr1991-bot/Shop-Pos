import React, { useRef, useState } from 'react';
import { 
  X, 
  Printer, 
  Share2, 
  CheckCircle2, 
  AlertOctagon, 
  RotateCcw, 
  Copy, 
  Check, 
  AlertTriangle,
  MessageCircle,
  QrCode
} from 'lucide-react';
import { Sale } from '../types';
import { formatCurrency, formatDateTime, formatWhatsAppNumber } from '../utils/formatters';
import { sounds } from '../utils/sound';
import { LogoEmblem } from './LogoEmblem';

interface InvoiceModalProps {
  sale: Sale;
  onClose: () => void;
  onCancelBill?: (saleId: string) => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({
  sale,
  onClose,
  onCancelBill
}) => {
  const isFinalised = sale.status === 'finalised';
  const isCancelled = sale.status === 'cancelled';
  const isUdhar = sale.paymentMethod === 'credit' || sale.remainingBalance > 0;

  const receiptRef = useRef<HTMLDivElement>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

  const shopName = localStorage.getItem('ak_shop_name') || 'Hardware Store';
  const shopAddress = localStorage.getItem('ak_shop_address') || 'Main Market, City Center';
  const shopPhone = localStorage.getItem('ak_shop_phone') || '';
  const shopUpi = localStorage.getItem('ak_shop_upi_id') || '';
  const shopGstin = localStorage.getItem('ak_shop_gstin') || '';

  const handlePrint = () => {
    window.print();
  };

  const generateWhatsAppText = (): string => {
    let text = `🧾 *${shopName.toUpperCase()}*\n`;
    text += `${shopAddress}\n`;
    if (shopPhone) text += `📞 Phone: ${shopPhone}\n`;
    if (shopGstin) text += `🏷️ GSTIN: ${shopGstin}\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `*INVOICE: #${sale.billNumber}*\n`;
    text += `📅 Date: ${formatDateTime(sale.date)}\n`;
    text += `👤 Customer: *${sale.customerName}*\n`;
    if (sale.customerPhone) text += `📱 Phone: ${sale.customerPhone}\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━\n`;

    if (sale.type === 'itemised' && sale.items.length > 0) {
      sale.items.forEach((item, idx) => {
        text += `${idx + 1}. *${item.productName}* (${item.packageSize})\n`;
        text += `   ${item.quantity} ${item.unit} × ${formatCurrency(item.sellingPrice)} = *${formatCurrency(item.totalPrice)}*\n`;
      });
      text += `─────────────────────\n`;
      if (sale.discount > 0) {
        text += `Subtotal: ${formatCurrency(sale.subtotal)}\n`;
        text += `Discount: -${formatCurrency(sale.discount)}\n`;
      }
      if (sale.taxableAmount && (sale.cgstTotal || sale.sgstTotal || sale.igstTotal)) {
        text += `Taxable Value: ${formatCurrency(sale.taxableAmount)}\n`;
        if (sale.cgstTotal) text += `CGST: ${formatCurrency(sale.cgstTotal)}\n`;
        if (sale.sgstTotal) text += `SGST: ${formatCurrency(sale.sgstTotal)}\n`;
        if (sale.igstTotal) text += `IGST: ${formatCurrency(sale.igstTotal)}\n`;
      }
    } else {
      text += `Items: ${sale.notes || 'Hardware & building materials'}\n`;
      text += `─────────────────────\n`;
    }

    text += `💰 *TOTAL AMOUNT: ${formatCurrency(sale.totalAmount)}*\n`;
    text += `💵 Amount Received: ${formatCurrency(sale.amountReceived)} (${sale.paymentMethod.toUpperCase()})\n`;
    
    if (sale.remainingBalance > 0) {
      text += `⚠️ *REMAINING DUE (UDHAAR): ${formatCurrency(sale.remainingBalance)}*\n`;
      if (shopUpi) {
        text += `💳 *Pay Online via UPI:* ${shopUpi}\n`;
        text += `🔗 *Quick UPI Pay:* upi://pay?pa=${shopUpi}&pn=${encodeURIComponent(shopName)}&am=${sale.remainingBalance}&cu=INR\n`;
      }
    } else {
      text += `✅ *STATUS: PAID IN FULL*\n`;
      if (shopUpi) {
        text += `💳 Shop UPI: ${shopUpi}\n`;
      }
    }

    if (sale.notes && sale.type === 'itemised') {
      text += `📝 Note: ${sale.notes}\n`;
    }

    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `Thank you for shopping with ${shopName}!`;
    return text;
  };

  // Direct WhatsApp sending
  const handleSendWhatsApp = () => {
    sounds.playTap();
    const text = generateWhatsAppText();
    const encoded = encodeURIComponent(text);
    const cleanPhone = formatWhatsAppNumber(sale.customerPhone);

    const waUrl = cleanPhone 
      ? `https://wa.me/${cleanPhone}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;
    
    const link = document.createElement('a');
    link.href = waUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Copy text to clipboard
  const handleCopyText = () => {
    const text = generateWhatsAppText();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        setCopiedText(true);
        sounds.playPaymentSuccess();
        setTimeout(() => setCopiedText(false), 2500);
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden my-auto border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95">
        
        {/* Modal Top Bar */}
        <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isFinalised && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
            {isCancelled && <AlertOctagon className="w-5 h-5 text-red-400" />}
            <div>
              <span className="font-bold text-sm tracking-wide">
                {sale.billNumber}
              </span>
              <span className={`ml-2 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                isCancelled ? 'bg-red-500/20 text-red-300' : 'bg-emerald-500/20 text-emerald-300'
              }`}>
                {sale.status}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Receipt Paper (80mm Thermal Receipt format) */}
        <div id="printable-receipt" ref={receiptRef} className="p-4 sm:p-5 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-sans print:bg-white print:text-black max-w-[80mm] mx-auto">
          
          {/* Shop Header */}
          <div className="text-center pb-3 border-b border-dashed border-slate-300 dark:border-slate-700">
            <div className="flex justify-center mb-1.5 print:mb-1">
              <LogoEmblem size="sm" />
            </div>
            <h2 className="text-base font-black tracking-tight text-slate-900 dark:text-white print:text-black uppercase">{shopName}</h2>
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 print:text-slate-700">{shopAddress}</p>
            {shopPhone && <p className="text-[11px] text-slate-500 dark:text-slate-400 print:text-slate-600">Phone / WhatsApp: {shopPhone}</p>}
            {shopGstin && <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300 print:text-black">GSTIN: {shopGstin}</p>}
            {shopUpi && <p className="text-[10px] text-slate-500 dark:text-slate-400 print:text-slate-600">UPI: {shopUpi}</p>}
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{formatDateTime(sale.date)} • 80mm Slip</p>
          </div>

          {/* Customer & Bill Details */}
          <div className="py-2.5 border-b border-dashed border-slate-300 dark:border-slate-700 text-xs flex justify-between items-start">
            <div>
              <span className="text-slate-400 dark:text-slate-500 block text-[10px] uppercase font-semibold">Customer</span>
              <span className="font-bold text-slate-800 dark:text-white print:text-black text-sm">{sale.customerName}</span>
              {sale.customerPhone && (
                <span className="text-slate-500 dark:text-slate-400 block">{sale.customerPhone}</span>
              )}
            </div>
            <div className="text-right">
              <span className="text-slate-400 dark:text-slate-500 block text-[10px] uppercase font-semibold">Status / Mode</span>
              {sale.remainingBalance > 0 ? (
                <span className="font-black uppercase text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 px-2 py-0.5 rounded text-[11px] inline-block">
                  UDHAAR ({formatCurrency(sale.remainingBalance)})
                </span>
              ) : (
                <span className="font-bold uppercase text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-1.5 py-0.5 rounded text-[11px] inline-block">
                  PAID ({sale.paymentMethod})
                </span>
              )}
            </div>
          </div>

          {/* Udhaar / Khata Debit Alert */}
          {isUdhar && (
            <div className="my-2 p-2 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 rounded-xl text-xs text-rose-900 dark:text-rose-200 flex items-center justify-between">
              <span className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                Khata Debit (Udhaar):
              </span>
              <span className="font-black text-rose-700">
                {formatCurrency(sale.remainingBalance)} Added to Ledger
              </span>
            </div>
          )}

          {/* Items or Quick Sale */}
          <div className="py-3 border-b border-dashed border-slate-300 dark:border-slate-700">
            {sale.type === 'itemised' && sale.items.length > 0 ? (
              <div className="space-y-2 text-xs">
                <div className="grid grid-cols-12 text-[10px] font-bold text-slate-400 uppercase pb-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="col-span-6">Item</span>
                  <span className="col-span-2 text-center">Qty</span>
                  <span className="col-span-2 text-right">Rate</span>
                  <span className="col-span-2 text-right">Amount</span>
                </div>
                {sale.items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 items-center text-xs py-1 border-b border-slate-50 dark:border-slate-800/60">
                    <div className="col-span-6 pr-1">
                      <p className="font-medium text-slate-900 dark:text-white print:text-black leading-tight">{item.productName}</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">{item.packageSize}</p>
                    </div>
                    <div className="col-span-2 text-center font-semibold text-slate-700 dark:text-slate-300 print:text-black">
                      {item.quantity} <span className="text-[10px] text-slate-400">{item.unit}</span>
                    </div>
                    <div className="col-span-2 text-right text-slate-600 dark:text-slate-400 print:text-black">
                      {formatCurrency(item.sellingPrice)}
                    </div>
                    <div className="col-span-2 text-right font-bold text-slate-900 dark:text-white print:text-black">
                      {formatCurrency(item.totalPrice)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-2 text-center bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Quick Amount Entry</span>
                <p className="text-base font-bold text-slate-800 dark:text-slate-100 print:text-black mt-1">{sale.notes || 'Hardware & building materials'}</p>
              </div>
            )}
          </div>

          {/* Calculation Summary */}
          <div className="py-2.5 space-y-1 text-xs">
            {sale.discount > 0 && (
              <>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(sale.subtotal)}</span>
                </div>
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-medium">
                  <span>Discount:</span>
                  <span>-{formatCurrency(sale.discount)}</span>
                </div>
              </>
            )}

            {sale.taxableAmount !== undefined && (sale.cgstTotal || sale.sgstTotal || sale.igstTotal) ? (
              <div className="py-1 border-t border-dashed border-slate-200 dark:border-slate-800 space-y-0.5 text-[11px] text-slate-600 dark:text-slate-400 font-mono">
                <div className="flex justify-between">
                  <span>Taxable Value:</span>
                  <span>{formatCurrency(sale.taxableAmount)}</span>
                </div>
                {sale.cgstTotal ? (
                  <div className="flex justify-between">
                    <span>CGST:</span>
                    <span>{formatCurrency(sale.cgstTotal)}</span>
                  </div>
                ) : null}
                {sale.sgstTotal ? (
                  <div className="flex justify-between">
                    <span>SGST:</span>
                    <span>{formatCurrency(sale.sgstTotal)}</span>
                  </div>
                ) : null}
                {sale.igstTotal ? (
                  <div className="flex justify-between">
                    <span>IGST:</span>
                    <span>{formatCurrency(sale.igstTotal)}</span>
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="flex justify-between text-sm font-black text-slate-900 dark:text-white print:text-black pt-1 border-t border-slate-200 dark:border-slate-700">
              <span>Total Bill:</span>
              <span className="text-base text-amber-600 dark:text-amber-400 print:text-black">{formatCurrency(sale.totalAmount)}</span>
            </div>

            <div className="flex justify-between text-slate-700 dark:text-slate-300 pt-1">
              <span>Amount Received Now:</span>
              <span className={`font-bold ${sale.amountReceived > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}`}>
                {formatCurrency(sale.amountReceived)} {sale.amountReceived === 0 && '(Zero Advance)'}
              </span>
            </div>

            {sale.remainingBalance > 0 ? (
              <div className="flex justify-between text-rose-700 dark:text-rose-400 font-black bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 p-2 rounded-lg mt-1">
                <span>Remaining Due (Udhaar):</span>
                <span>{formatCurrency(sale.remainingBalance)}</span>
              </div>
            ) : (
              <div className="flex justify-between text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 p-2 rounded-lg mt-1">
                <span>Payment:</span>
                <span>PAID IN FULL</span>
              </div>
            )}
          </div>

          {/* Dynamic UPI Payment QR Code (Decision 9) */}
          {shopUpi && (
            <div className="my-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 flex flex-col items-center justify-center text-center print:bg-white print:border-slate-300">
              <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200 print:text-black mb-1 flex items-center gap-1.5">
                <QrCode className="w-3.5 h-3.5 text-amber-500" />
                <span>Scan to Pay via UPI ({formatCurrency(sale.remainingBalance > 0 ? sale.remainingBalance : sale.totalAmount)})</span>
              </div>
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`upi://pay?pa=${shopUpi}&pn=${encodeURIComponent(shopName)}&am=${sale.remainingBalance > 0 ? sale.remainingBalance : sale.totalAmount}&cu=INR`)}&margin=6`} 
                alt="UPI Payment QR Code"
                className="w-28 h-28 rounded-xl bg-white p-1.5 shadow-xs border border-slate-200 print:w-24 print:h-24"
                referrerPolicy="no-referrer"
              />
              <span className="text-[10px] text-slate-500 dark:text-slate-400 print:text-slate-600 mt-1 font-mono font-medium">UPI: {shopUpi}</span>
            </div>
          )}

          {/* Notes */}
          {sale.notes && sale.type === 'itemised' && (
            <div className="mt-2 p-2 bg-slate-50 dark:bg-slate-800/60 rounded text-[11px] text-slate-600 dark:text-slate-300">
              <span className="font-semibold text-slate-700 dark:text-slate-200">Note: </span>
              {sale.notes}
            </div>
          )}

          <div className="text-center text-[10px] text-slate-500 dark:text-slate-400 mt-4 pt-2 border-t border-dashed border-slate-300 dark:border-slate-700 space-y-0.5">
            <p className="font-bold text-slate-800 dark:text-slate-200">Thank you for shopping with {shopName}!</p>
            <p>Goods once sold can be exchanged within 7 days with bill.</p>
            <p className="text-[9px] text-slate-400">Stock Deducted: {sale.stockDeducted ? 'Yes' : 'No'}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 space-y-2">
          <div className="flex flex-wrap gap-2">
            {/* WhatsApp Direct 1-Tap Send */}
            <button
              onClick={handleSendWhatsApp}
              className="flex-1 min-w-[150px] flex items-center justify-center gap-1.5 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-black shadow-md transition-all active:scale-98 cursor-pointer"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Send WhatsApp Bill</span>
            </button>

            {/* Copy Text */}
            <button
              onClick={handleCopyText}
              className={`flex items-center justify-center gap-1 py-2.5 px-3 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                copiedText 
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700' 
                  : 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700'
              }`}
              title="Copy bill text to clipboard"
            >
              {copiedText ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copiedText ? 'Copied!' : 'Copy Text'}</span>
            </button>

            {/* Print / Save PDF */}
            <button
              onClick={handlePrint}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-slate-800 hover:bg-slate-900 active:bg-slate-950 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              title="Print bill or save as PDF"
            >
              <Printer className="w-4 h-4" />
              <span>Print / PDF</span>
            </button>
          </div>

          {/* Cancel Bill (Restoring inventory) */}
          {isFinalised && onCancelBill && (
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-slate-500">Need to void bill?</span>
              {confirmCancel ? (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      onCancelBill(sale.id);
                      onClose();
                    }}
                    className="py-1 px-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    Confirm Cancel
                  </button>
                  <button
                    onClick={() => setConfirmCancel(false)}
                    className="py-1 px-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-medium cursor-pointer"
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmCancel(true)}
                  className="flex items-center justify-center gap-1 py-1 px-2 text-rose-600 hover:text-rose-800 text-xs font-semibold cursor-pointer"
                  title="Cancel bill and restore inventory"
                >
                  <RotateCcw className="w-3 h-3" />
                  Cancel Bill & Return Stock
                </button>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
