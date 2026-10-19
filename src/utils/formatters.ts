export function formatCurrency(amount: number): string {
  if (isNaN(amount)) return '₹0';
  return '₹' + Math.round(amount).toLocaleString('en-IN');
}

export function formatDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    const now = new Date();
    
    // Check if today
    if (d.toDateString() === now.toDateString()) {
      return `Today, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    // Check if yesterday
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) {
      return `Yesterday, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }

    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return isoString;
  }
}

export function formatDateTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return isoString;
  }
}

export const STANDARD_UNITS = [
  { value: 'pieces', label: 'Pieces (Pcs)' },
  { value: 'tins', label: 'Tins / Cans' },
  { value: 'litres', label: 'Litres (L / Ltr)' },
  { value: 'kilograms', label: 'Kilograms (Kg)' },
  { value: 'bags', label: 'Bags (Bori)' },
  { value: 'boxes', label: 'Boxes / Packets' },
  { value: 'metres', label: 'Metres (m)' },
  { value: 'custom', label: '+ Custom Unit...' }
];

export const PROFESSION_LABELS: Record<string, { label: string; color: string; badge: string }> = {
  karigar: { label: 'Karigar', color: 'text-orange-700 bg-orange-50 border-orange-200', badge: '🛠️ Karigar' },
  painter: { label: 'Painter', color: 'text-amber-700 bg-amber-50 border-amber-200', badge: '🎨 Painter' },
  contractor: { label: 'Contractor', color: 'text-blue-700 bg-blue-50 border-blue-200', badge: '🏗️ Contractor' },
  electrician: { label: 'Electrician', color: 'text-yellow-700 bg-yellow-50 border-yellow-200', badge: '⚡ Electrician' },
  plumber: { label: 'Plumber', color: 'text-cyan-700 bg-cyan-50 border-cyan-200', badge: '🔧 Plumber' },
  carpenter: { label: 'Carpenter', color: 'text-amber-800 bg-amber-50 border-amber-200', badge: '🪚 Carpenter' },
  mason: { label: 'Mason / Mistri', color: 'text-stone-700 bg-stone-50 border-stone-200', badge: '🧱 Mistri' },
  customer: { label: 'Customer', color: 'text-emerald-700 bg-emerald-50 border-emerald-200', badge: '👤 Customer' },
  supplier: { label: 'Supplier', color: 'text-purple-700 bg-purple-50 border-purple-200', badge: '🏭 Supplier' },
  other: { label: 'Other', color: 'text-gray-700 bg-gray-50 border-gray-200', badge: '📋 Other' }
};

export function formatWhatsAppNumber(phone?: string): string {
  if (!phone) return '';
  let clean = phone.replace(/[^0-9]/g, '');
  if (!clean) return '';
  // If user entered with leading 0 (e.g. 06201646524 -> 6201646524)
  if (clean.length === 11 && clean.startsWith('0')) {
    clean = clean.substring(1);
  }
  // If 10-digit number, prepend 91 for India so WhatsApp doesn't misinterpret 62... as Indonesia country code
  if (clean.length === 10) {
    clean = '91' + clean;
  }
  return clean;
}
