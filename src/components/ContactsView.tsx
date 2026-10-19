import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  Phone, 
  MessageCircle, 
  CreditCard, 
  PlusCircle, 
  Trash2, 
  Edit3, 
  X, 
  Check, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Clock, 
  Receipt, 
  FileText,
  Share2
} from 'lucide-react';
import { Contact, ContactProfession, Payment, PaymentMethod, Sale, Purchase } from '../types';
import { formatCurrency, formatDateTime, formatWhatsAppNumber, PROFESSION_LABELS } from '../utils/formatters';
import { sounds } from '../utils/sound';

interface ContactsViewProps {
  contacts: Contact[];
  sales: Sale[];
  purchases: Purchase[];
  payments: Payment[];
  onSaveContact: (contact: Contact) => void;
  onDeleteContact: (contactId: string) => void;
  onRecordPayment: (payment: Payment) => void;
}

export const ContactsView: React.FC<ContactsViewProps> = ({
  contacts,
  sales,
  purchases,
  payments,
  onSaveContact,
  onDeleteContact,
  onRecordPayment
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [professionFilter, setProfessionFilter] = useState<string>('all');
  const [deletingContactId, setDeletingContactId] = useState<string | null>(null);
  
  // Modals state
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedContactForPayment, setSelectedContactForPayment] = useState<Contact | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [paymentNotes, setPaymentNotes] = useState('');

  // Ledger / Statement Modal
  const [selectedContactForLedger, setSelectedContactForLedger] = useState<Contact | null>(null);

  // Form State for Contact
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formProfession, setFormProfession] = useState<string>('customer');
  const [formLocation, setFormLocation] = useState('');
  const [formCreditBalance, setFormCreditBalance] = useState('0');
  const [formNotes, setFormNotes] = useState('');

  // Filtered contacts
  const filteredContacts = useMemo(() => {
    return contacts.filter(c => {
      if (professionFilter !== 'all' && c.profession !== professionFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return c.name.toLowerCase().includes(q) ||
               c.phone.toLowerCase().includes(q) ||
               c.location.toLowerCase().includes(q) ||
               c.profession.toLowerCase().includes(q);
      }
      return true;
    });
  }, [contacts, professionFilter, searchQuery]);

  // Overall totals
  const totalReceivables = contacts
    .filter(c => c.profession !== 'supplier' && c.creditBalance > 0)
    .reduce((acc, c) => acc + c.creditBalance, 0);

  const totalPayables = contacts
    .filter(c => c.creditBalance < 0)
    .reduce((acc, c) => acc + Math.abs(c.creditBalance), 0);

  // Add / Edit Contact Modal
  const handleOpenAddContact = () => {
    setEditingContact(null);
    setFormName('');
    setFormPhone('');
    setFormProfession('customer');
    setFormLocation('');
    setFormCreditBalance('0');
    setFormNotes('');
    setIsContactModalOpen(true);
  };

  const handleOpenEditContact = (c: Contact) => {
    setEditingContact(c);
    setFormName(c.name);
    setFormPhone(c.phone);
    setFormProfession(c.profession);
    setFormLocation(c.location);
    setFormCreditBalance(c.creditBalance.toString());
    setFormNotes(c.notes || '');
    setIsContactModalOpen(true);
  };

  const handleSaveContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    const newContact: Contact = {
      id: editingContact ? editingContact.id : `cnt-${Date.now()}`,
      name: formName.trim(),
      phone: formPhone.trim(),
      profession: formProfession.trim() || 'customer',
      location: formLocation.trim(),
      creditBalance: parseFloat(formCreditBalance) || 0,
      notes: formNotes.trim() || undefined,
      isSample: editingContact ? editingContact.isSample : false,
      createdAt: editingContact ? editingContact.createdAt : new Date().toISOString()
    };

    onSaveContact(newContact);
    sounds.playItemAdded();
    setIsContactModalOpen(false);
  };

  // Payment Recording Modal
  const handleOpenPayment = (contact: Contact) => {
    setSelectedContactForPayment(contact);
    setPaymentAmount(Math.abs(contact.creditBalance).toString());
    setPaymentMethod('cash');
    setPaymentNotes('');
    setIsPaymentModalOpen(true);
  };

  const handleSavePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContactForPayment) return;

    const amt = parseFloat(paymentAmount);
    if (isNaN(amt) || amt <= 0) return;

    const isSupplier = selectedContactForPayment.profession === 'supplier';

    const payment: Payment = {
      id: `pay-${Date.now()}`,
      date: new Date().toISOString(),
      contactId: selectedContactForPayment.id,
      contactName: selectedContactForPayment.name,
      type: isSupplier ? 'supplier_payment' : 'customer_payment',
      amount: amt,
      paymentMethod,
      notes: paymentNotes.trim() || undefined,
      createdAt: new Date().toISOString()
    };

    onRecordPayment(payment);
    sounds.playPaymentSuccess();
    setIsPaymentModalOpen(false);
  };

  const handleSendReminderWhatsApp = (contact: Contact) => {
    sounds.playTap();
    const rawShopName = localStorage.getItem('ak_shop_name') || 'Hardware Store';
    const shopName = rawShopName.trim();
    const shopUpi = localStorage.getItem('ak_shop_upi_id') || '';

    let text = `🙏 Namaste ${contact.name} ji,\n\n`;
    text += `This is a friendly payment reminder from *${shopName}* regarding your pending Khata balance of *${formatCurrency(contact.creditBalance)}*.\n\n`;
    if (shopUpi) {
      text += `💳 *You can pay via UPI to:*\n${shopUpi}\n\n`;
    }
    text += `Please let us know once paid or visit our shop counter. Thank you for your continued business!`;

    const encoded = encodeURIComponent(text);
    const url = `https://wa.me/${formatWhatsAppNumber(contact.phone)}?text=${encoded}`;
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Build ledger for selected contact
  const contactLedger = useMemo(() => {
    if (!selectedContactForLedger) return [];

    const cid = selectedContactForLedger.id;
    const list: Array<{
      id: string;
      date: string;
      type: 'bill' | 'purchase' | 'payment';
      title: string;
      amount: number;
      paidOrDue: number;
      method?: string;
    }> = [];

    // Sales for this customer
    sales.filter(s => s.customerId === cid).forEach(s => {
      list.push({
        id: s.id,
        date: s.date,
        type: 'bill',
        title: `Bill ${s.billNumber} (${s.items.length} items)`,
        amount: s.totalAmount,
        paidOrDue: s.remainingBalance,
        method: s.paymentMethod
      });
    });

    // Purchases for this supplier
    purchases.filter(p => p.supplierId === cid).forEach(p => {
      list.push({
        id: p.id,
        date: p.date,
        type: 'purchase',
        title: `Purchase ${p.purchaseNumber}: ${p.productName}`,
        amount: p.totalAmount,
        paidOrDue: p.remainingBalance
      });
    });

    // Payments
    payments.filter(p => p.contactId === cid).forEach(p => {
      list.push({
        id: p.id,
        date: p.date,
        type: 'payment',
        title: `Payment: ${p.type === 'customer_payment' ? 'Received from customer' : 'Paid to supplier'}`,
        amount: p.amount,
        paidOrDue: 0,
        method: p.paymentMethod
      });
    });

    // Sort descending by date
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [selectedContactForLedger, sales, purchases, payments]);

  return (
    <div className="pb-28 pt-2 px-3 max-w-lg mx-auto space-y-3 animate-in fade-in duration-150">
      
      {/* 1. KHATA SUMMARY BAR */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
            Customer Udhar (To Collect)
          </span>
          <span className="text-lg font-black text-rose-600 dark:text-rose-400 block mt-0.5">
            {formatCurrency(totalReceivables)}
          </span>
          <span className="text-[10px] text-slate-500 dark:text-slate-400">From painters & clients</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
            Supplier Dues (To Pay)
          </span>
          <span className="text-lg font-black text-slate-800 dark:text-white block mt-0.5">
            {formatCurrency(totalPayables)}
          </span>
          <span className="text-[10px] text-slate-500 dark:text-slate-400">To distributors</span>
        </div>
      </div>

      {/* 2. ADD CONTACT BUTTON */}
      <div className="flex gap-2">
        <button
          onClick={handleOpenAddContact}
          className="flex-1 py-3 px-3 bg-slate-900 dark:bg-amber-500 hover:bg-slate-800 dark:hover:bg-amber-400 text-white dark:text-slate-950 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-sm active:scale-98 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4 text-amber-400 dark:text-slate-950 stroke-[3]" />
          <span>Add Contact (Customer / Painter / Supplier)</span>
        </button>
      </div>

      {/* 3. QUICK SEARCH INPUT */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Quick search name, phone, area, profession..."
          className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
        />
      </div>

      {/* 4. PROFESSION FILTER PILLS */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
        <button
          onClick={() => setProfessionFilter('all')}
          className={`px-3 py-1.5 rounded-full font-bold whitespace-nowrap transition-all cursor-pointer ${
            professionFilter === 'all'
              ? 'bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-950'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          All ({contacts.length})
        </button>
        {Object.entries(PROFESSION_LABELS).map(([key, config]) => {
          const count = contacts.filter(c => c.profession === key).length;
          return (
            <button
              key={key}
              onClick={() => setProfessionFilter(key)}
              className={`px-3 py-1.5 rounded-full font-semibold whitespace-nowrap transition-all cursor-pointer ${
                professionFilter === key
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {config.badge} ({count})
            </button>
          );
        })}
      </div>

      {/* 5. CONTACTS LIST */}
      <div className="space-y-2">
        {filteredContacts.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 text-center text-slate-400 dark:text-slate-500 text-xs border border-slate-200 dark:border-slate-800">
            No contacts match the search.
          </div>
        ) : (
          filteredContacts.map((contact) => {
            const prof = (PROFESSION_LABELS as any)[contact.profession] || {
              label: contact.profession.charAt(0).toUpperCase() + contact.profession.slice(1),
              badge: `👷 ${contact.profession}`,
              color: 'bg-blue-50 text-blue-700 border-blue-200'
            };
            const isSupplier = contact.profession === 'supplier';
            const hasCredit = contact.creditBalance > 0;
            const hasSupplierDebt = contact.creditBalance < 0;

            return (
              <div
                key={contact.id}
                className="bg-white dark:bg-slate-900 rounded-2xl p-3 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2 hover:border-amber-400 transition-all"
              >
                {/* Header Row */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-xs text-slate-900 dark:text-white">{contact.name}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${prof.color} dark:bg-slate-800 dark:border-slate-700`}>
                        {prof.label}
                      </span>
                    </div>
                    {contact.location && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{contact.location}</p>
                    )}
                  </div>

                  {/* Credit / Balance Display */}
                  <div className="text-right">
                    {hasCredit ? (
                      <div className="bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 px-2 py-0.5 rounded-lg text-right">
                        <span className="text-[9px] text-rose-600 dark:text-rose-400 font-bold uppercase block">Udhar (Due)</span>
                        <span className="text-xs font-black text-rose-700 dark:text-rose-300">{formatCurrency(contact.creditBalance)}</span>
                      </div>
                    ) : hasSupplierDebt ? (
                      <div className="bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-900 px-2 py-0.5 rounded-lg text-right">
                        <span className="text-[9px] text-purple-600 dark:text-purple-400 font-bold uppercase block">To Pay</span>
                        <span className="text-xs font-black text-purple-700 dark:text-purple-300">{formatCurrency(Math.abs(contact.creditBalance))}</span>
                      </div>
                    ) : (
                      <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-lg">
                        All Clear
                      </span>
                    )}
                  </div>
                </div>

                {/* Contact actions & phone */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <div className="flex items-center gap-1.5">
                    {contact.phone ? (
                      <>
                        <a
                          href={`tel:${contact.phone}`}
                          className="flex items-center gap-1 px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-[11px] font-semibold"
                        >
                          <Phone className="w-3 h-3 text-emerald-600" /> Call
                        </a>
                        <a
                          href={`https://wa.me/${formatWhatsAppNumber(contact.phone)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 px-2 py-1 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 rounded-lg text-[11px] font-semibold border border-emerald-200 dark:border-emerald-800"
                        >
                          <MessageCircle className="w-3 h-3" /> WhatsApp
                        </a>
                        {hasCredit && (
                          <button
                            type="button"
                            onClick={() => handleSendReminderWhatsApp(contact)}
                            className="flex items-center gap-1 px-2 py-1 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 text-rose-700 dark:text-rose-300 rounded-lg text-[11px] font-semibold border border-rose-200 dark:border-rose-900 cursor-pointer"
                            title="Send WhatsApp Payment Reminder"
                          >
                            <Share2 className="w-3 h-3 text-rose-600" /> Reminder
                          </button>
                        )}
                      </>
                    ) : (
                      <span className="text-[10px] text-slate-400">No phone</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Record Payment Button */}
                    <button
                      onClick={() => handleOpenPayment(contact)}
                      className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-[11px] flex items-center gap-1 shadow-xs cursor-pointer"
                    >
                      <CreditCard className="w-3 h-3" />
                      {isSupplier ? 'Pay' : 'Collect'}
                    </button>

                    {/* View Ledger */}
                    <button
                      onClick={() => setSelectedContactForLedger(contact)}
                      className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-[11px] font-semibold cursor-pointer"
                      title="View Khata Ledger"
                    >
                      Khata
                    </button>

                    <button
                      onClick={() => handleOpenEditContact(contact)}
                      className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded"
                      title="Edit"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    {deletingContactId === contact.id ? (
                      <div className="flex items-center gap-1 bg-rose-50 dark:bg-rose-950/60 p-0.5 rounded border border-rose-200 dark:border-rose-900">
                        <button
                          onClick={() => {
                            onDeleteContact(contact.id);
                            setDeletingContactId(null);
                          }}
                          className="px-1.5 py-0.5 bg-rose-600 text-white rounded text-[10px] font-bold cursor-pointer"
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => setDeletingContactId(null)}
                          className="px-1 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded text-[10px] cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeletingContactId(contact.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                        title="Delete"
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
          MODAL: ADD / EDIT CONTACT (HYBRID PROFESSION SUPPORT)
         ======================================================= */}
      {isContactModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden my-auto border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95">
            <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
              <span className="font-bold text-sm">
                {editingContact ? 'Edit Contact Details' : 'Add New Contact (Khata / Karigar)'}
              </span>
              <button onClick={() => setIsContactModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveContactSubmit} className="p-4 space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Ramesh Painter / Rajesh Contractor"
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl font-medium focus:bg-white dark:focus:bg-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl font-medium focus:bg-white dark:focus:bg-slate-800"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Profession <span className="text-[10px] text-slate-400 font-normal">(select or type)</span>
                  </label>
                  <input
                    type="text"
                    required
                    list="khata-professions"
                    value={formProfession}
                    onChange={(e) => setFormProfession(e.target.value)}
                    placeholder="e.g. customer, painter, electrician..."
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl font-bold focus:bg-white dark:focus:bg-slate-800 text-xs"
                  />
                  <datalist id="khata-professions">
                    <option value="customer" />
                    <option value="painter" />
                    <option value="contractor" />
                    <option value="electrician" />
                    <option value="plumber" />
                    <option value="supplier" />
                    <option value="carpenter" />
                    <option value="mason" />
                    <option value="pop_artisan" />
                    <option value="other" />
                  </datalist>

                  <div className="flex flex-wrap gap-1 mt-1">
                    {['customer', 'painter', 'contractor', 'plumber', 'supplier'].map((p) => (
                      <button
                        type="button"
                        key={p}
                        onClick={() => setFormProfession(p)}
                        className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800 hover:bg-amber-100 dark:hover:bg-amber-950/40 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 cursor-pointer"
                      >
                        +{p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Location / Site Address</label>
                <input
                  type="text"
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  placeholder="e.g. Model Town, Near Clock Tower"
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl font-medium focus:bg-white dark:focus:bg-slate-800"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Opening Credit Balance (₹)</label>
                <input
                  type="number"
                  step="any"
                  value={formCreditBalance}
                  onChange={(e) => setFormCreditBalance(e.target.value)}
                  placeholder="0 (+ if customer owes you, - if you owe supplier)"
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl font-medium focus:bg-white dark:focus:bg-slate-800"
                />
                <span className="text-[10px] text-slate-400 dark:text-slate-500 block mt-0.5">
                  Positive = customer owes shop; Negative = shop owes supplier.
                </span>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Notes</label>
                <input
                  type="text"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Special terms, discount agreement, etc."
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl font-medium focus:bg-white dark:focus:bg-slate-800"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsContactModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-slate-900 dark:bg-amber-500 hover:bg-slate-800 dark:hover:bg-amber-400 text-white dark:text-slate-950 rounded-xl font-bold shadow-md cursor-pointer"
                >
                  Save Contact
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =======================================================
          MODAL: RECORD PAYMENT
         ======================================================= */}
      {isPaymentModalOpen && selectedContactForPayment && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden my-auto border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95">
            <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
              <div>
                <span className="font-bold text-sm block">
                  {selectedContactForPayment.profession === 'supplier' ? 'Pay Supplier Dues' : 'Receive Customer Payment (Jama)'}
                </span>
                <span className="text-[10px] text-amber-400">{selectedContactForPayment.name}</span>
              </div>
              <button onClick={() => setIsPaymentModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePaymentSubmit} className="p-4 space-y-3 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl flex justify-between items-center text-xs">
                <span className="text-slate-600 dark:text-slate-400">Current Balance:</span>
                <span className="font-black text-sm text-slate-900 dark:text-white">
                  {selectedContactForPayment.creditBalance >= 0 
                    ? `Due: ${formatCurrency(selectedContactForPayment.creditBalance)}`
                    : `We owe: ${formatCurrency(Math.abs(selectedContactForPayment.creditBalance))}`
                  }
                </span>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Payment Amount (₹) *</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="0"
                  className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-black text-lg text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl font-semibold uppercase"
                >
                  <option value="cash">Cash</option>
                  <option value="upi">UPI (GPay / PhonePe / Paytm)</option>
                  <option value="bank_transfer">Bank Transfer / NEFT</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Notes / Remarks</label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="e.g. Cleared for last week site supplies"
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl font-black shadow-md cursor-pointer"
                >
                  Record Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =======================================================
          MODAL: KHATA LEDGER / STATEMENT
         ======================================================= */}
      {selectedContactForLedger && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden my-auto border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95">
            <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
              <div>
                <span className="font-bold text-sm block">Khata Statement</span>
                <span className="text-[10px] text-amber-400">{selectedContactForLedger.name}</span>
              </div>
              <button onClick={() => setSelectedContactForLedger(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-3 max-h-[75vh] overflow-y-auto text-xs">
              <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl flex justify-between items-center">
                <div>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold block">Current Balance</span>
                  <span className={`text-base font-black ${
                    selectedContactForLedger.creditBalance > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-400'
                  }`}>
                    {selectedContactForLedger.creditBalance >= 0 
                      ? `${formatCurrency(selectedContactForLedger.creditBalance)} (Due)` 
                      : `${formatCurrency(Math.abs(selectedContactForLedger.creditBalance))} (We owe)`
                    }
                  </span>
                </div>
                <button
                  onClick={() => {
                    const c = selectedContactForLedger;
                    setSelectedContactForLedger(null);
                    handleOpenPayment(c);
                  }}
                  className="px-3 py-1.5 bg-amber-500 text-slate-950 font-bold rounded-lg text-xs cursor-pointer"
                >
                  Record Payment
                </button>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 pb-1 block">
                  Transaction History
                </span>
                {contactLedger.length === 0 ? (
                  <div className="py-6 text-center text-slate-400 dark:text-slate-500 text-xs">
                    No transactions recorded for this contact yet.
                  </div>
                ) : (
                  contactLedger.map((tx) => (
                    <div key={tx.id} className="py-2 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-slate-800 dark:text-white">{tx.title}</div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500">
                          {formatDateTime(tx.date)} {tx.method ? `• ${tx.method.toUpperCase()}` : ''}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-black ${tx.type === 'payment' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}`}>
                          {tx.type === 'payment' ? `-${formatCurrency(tx.amount)}` : formatCurrency(tx.amount)}
                        </div>
                        {tx.paidOrDue > 0 && (
                          <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold block">
                            Due: {formatCurrency(tx.paidOrDue)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="pt-2">
                <button
                  onClick={() => setSelectedContactForLedger(null)}
                  className="w-full py-2.5 bg-slate-900 dark:bg-slate-800 text-white rounded-xl font-bold cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
