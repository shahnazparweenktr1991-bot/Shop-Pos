import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  Phone, 
  MessageCircle, 
  Star,
  StarHalf,
  MapPin, 
  Wrench, 
  Share2, 
  Edit3, 
  Trash2, 
  Check, 
  X, 
  Camera, 
  Clock, 
  Tag, 
  Sparkles,
  Award,
  DollarSign
} from 'lucide-react';
import { Professional } from '../types';
import { compressImageFile } from '../utils/imageCompressor';
import { sounds } from '../utils/sound';
import { formatWhatsAppNumber } from '../utils/formatters';
import { PhotoLightboxModal } from './PhotoLightboxModal';

interface DirectoryViewProps {
  professionals: Professional[];
  onSaveProfessional: (prof: Professional) => void;
  onDeleteProfessional: (profId: string) => void;
  showToast: (msg: string) => void;
}

const STANDARD_PROFESSIONS = [
  'All',
  'Painter',
  'Plumber',
  'Electrician',
  'Carpenter',
  'POP Artisan',
  'Mason / Mistri',
  'Welder',
  'Contractor',
];

export const DirectoryView: React.FC<DirectoryViewProps> = ({
  professionals,
  onSaveProfessional,
  onDeleteProfessional,
  showToast,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProfession, setSelectedProfession] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<{ url: string; title: string; subtitle?: string; badge?: string } | null>(null);
  const [editingProf, setEditingProf] = useState<Professional | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formProfession, setFormProfession] = useState('Painter');
  const [formCustomProfession, setFormCustomProfession] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formAltPhone, setFormAltPhone] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formCityArea, setFormCityArea] = useState('');
  const [formRating, setFormRating] = useState<number>(5);
  const [formPriceRange, setFormPriceRange] = useState('');
  const [formExperience, setFormExperience] = useState('');
  const [formPhotoUrl, setFormPhotoUrl] = useState('');
  const [formSkills, setFormSkills] = useState('');
  const [formBio, setFormBio] = useState('');
  const [formIsAvailable, setFormIsAvailable] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  // Filtered list
  const filteredProfessionals = useMemo(() => {
    return professionals
      .filter((prof) => {
        // Profession filter
        if (selectedProfession !== 'All') {
          const p1 = prof.profession.toLowerCase();
          const p2 = selectedProfession.toLowerCase();
          if (!p1.includes(p2) && !p2.includes(p1)) {
            return false;
          }
        }

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchesName = prof.name.toLowerCase().includes(q);
          const matchesPhone = prof.phone.includes(q) || (prof.alternatePhone && prof.alternatePhone.includes(q));
          const matchesAddress = prof.address.toLowerCase().includes(q) || prof.cityArea.toLowerCase().includes(q);
          const matchesProfession = prof.profession.toLowerCase().includes(q);
          const matchesSkills = prof.skills?.some(s => s.toLowerCase().includes(q));
          return matchesName || matchesPhone || matchesAddress || matchesProfession || matchesSkills;
        }

        return true;
      })
      // Decision 18: Sort Karigars and contractors by ratings (highest first)
      .sort((a, b) => (b.rating || 0) - (a.rating || 0) || a.name.localeCompare(b.name));
  }, [professionals, selectedProfession, searchQuery]);

  const handleOpenAdd = () => {
    setEditingProf(null);
    setFormName('');
    setFormProfession('Painter');
    setFormCustomProfession('');
    setFormPhone('');
    setFormAltPhone('');
    setFormAddress('');
    setFormCityArea('');
    setFormRating(5);
    setFormPriceRange('₹500 - ₹750 / day');
    setFormExperience('5');
    setFormPhotoUrl('');
    setFormSkills('');
    setFormBio('');
    setFormIsAvailable(true);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (prof: Professional) => {
    setEditingProf(prof);
    setFormName(prof.name);
    const isStandard = STANDARD_PROFESSIONS.includes(prof.profession);
    if (isStandard) {
      setFormProfession(prof.profession);
      setFormCustomProfession('');
    } else {
      setFormProfession('Other');
      setFormCustomProfession(prof.profession);
    }
    setFormPhone(prof.phone);
    setFormAltPhone(prof.alternatePhone || '');
    setFormAddress(prof.address);
    setFormCityArea(prof.cityArea);
    setFormRating(prof.rating || 5);
    setFormPriceRange(prof.priceRange || '');
    setFormExperience(prof.experienceYears ? String(prof.experienceYears) : '');
    setFormPhotoUrl(prof.photoUrl || '');
    setFormSkills(prof.skills ? prof.skills.join(', ') : '');
    setFormBio(prof.bio || '');
    setFormIsAvailable(prof.isAvailable !== false);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formName.trim()) {
      setFormError('Please enter full name.');
      return;
    }
    if (!formPhone.trim()) {
      setFormError('Please enter phone number.');
      return;
    }

    const effectiveProfession = formProfession === 'Other' 
      ? (formCustomProfession.trim() || 'Technician') 
      : formProfession;

    const skillsArray = formSkills
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    const profData: Professional = {
      id: editingProf ? editingProf.id : `prof-${Date.now()}`,
      name: formName.trim(),
      profession: effectiveProfession,
      phone: formPhone.trim(),
      alternatePhone: formAltPhone.trim() || undefined,
      address: formAddress.trim(),
      cityArea: formCityArea.trim() || 'Local',
      rating: formRating,
      priceRange: formPriceRange.trim() || 'Contact for quote',
      experienceYears: formExperience ? parseInt(formExperience, 10) : undefined,
      photoUrl: formPhotoUrl.trim() || undefined,
      skills: skillsArray,
      bio: formBio.trim() || undefined,
      isAvailable: formIsAvailable,
      isSample: editingProf ? editingProf.isSample : false,
      createdAt: editingProf ? editingProf.createdAt : new Date().toISOString(),
    };

    onSaveProfessional(profData);
    sounds.playItemAdded();
    showToast(editingProf ? 'Professional profile updated!' : 'New professional added to Directory!');
    setIsModalOpen(false);
  };

  // Share professional with customer on WhatsApp
  const handleShareWithCustomer = (prof: Professional) => {
    sounds.playTap();
    const shopName = localStorage.getItem('ak_shop_name') || 'A.K. HARDWARE';
    const shopPhone = localStorage.getItem('ak_shop_phone') || '';

    let text = `👷 *RECOMMENDED PROFESSIONAL DIRECTORY*\n`;
    text += `*${shopName}* (Jhulaniya Chowk)\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `👤 *Name:* ${prof.name}\n`;
    text += `🛠️ *Work / Profession:* ${prof.profession}\n`;
    text += `⭐ *Rating:* ${prof.rating} / 5 Stars\n`;
    text += `📞 *Direct Call:* ${prof.phone}\n`;
    if (prof.alternatePhone) text += `📱 *Alternate:* ${prof.alternatePhone}\n`;
    text += `📍 *Area / Location:* ${prof.address} (${prof.cityArea})\n`;
    if (prof.priceRange) text += `💰 *Estimated Rate:* ${prof.priceRange}\n`;
    if (prof.experienceYears) text += `⏳ *Experience:* ${prof.experienceYears} Years\n`;
    if (prof.skills && prof.skills.length > 0) {
      text += `✨ *Specialties:* ${prof.skills.join(', ')}\n`;
    }
    if (prof.bio) {
      text += `📝 *Notes:* ${prof.bio}\n`;
    }
    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `Shared for your service requirement by ${shopName}. ${shopPhone ? `Call shop: ${shopPhone}` : ''}`;

    const encoded = encodeURIComponent(text);
    const waUrl = `https://wa.me/?text=${encoded}`;
    window.open(waUrl, '_blank');
    showToast('WhatsApp opened to share with customer!');
  };

  return (
    <div className="pb-28 pt-3 px-3 max-w-lg mx-auto space-y-4 animate-in fade-in duration-150">
      
      {/* Top Header & Add Action */}
      <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Wrench className="w-5 h-5 text-amber-500" />
            Karigar & Contractor Directory
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Painters, plumbers, electricians & technicians to recommend to customers
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 py-2 px-3 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all active:scale-95 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Add Karigar</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name, skill, phone, area..."
          className="w-full pl-9 pr-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 shadow-2xs focus:border-amber-500 focus:outline-hidden"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Profession Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
        {STANDARD_PROFESSIONS.map((prof) => {
          const isActive = selectedProfession === prof;
          return (
            <button
              key={prof}
              onClick={() => setSelectedProfession(prof)}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {prof}
            </button>
          );
        })}
      </div>

      {/* Results Count & Available Status */}
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
        <span>{filteredProfessionals.length} professionals found</span>
        <span className="text-[11px]">Tap WhatsApp icon to share profile</span>
      </div>

      {/* Professionals List */}
      {filteredProfessionals.length === 0 ? (
        <div className="py-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
            <Users className="w-6 h-6" />
          </div>
          <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">No professionals matched</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
            Try searching another name or tap below to add a new electrician, plumber, or painter.
          </p>
          <button
            onClick={handleOpenAdd}
            className="py-2 px-4 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Add Professional</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredProfessionals.map((prof) => (
            <div
              key={prof.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-3 hover:border-slate-300 dark:hover:border-slate-700 transition-all"
            >
              {/* Header row: Photo, Name, Profession badge, Availability */}
              <div className="flex items-start gap-3">
                {/* Photo Thumbnail with Tap to Expand */}
                <div 
                  onClick={() => {
                    if (prof.photoUrl) {
                      setLightboxImage({
                        url: prof.photoUrl,
                        title: prof.name,
                        subtitle: `${prof.profession} • Phone: ${prof.phone} • ${prof.cityArea || prof.address}`,
                        badge: prof.isAvailable ? 'AVAILABLE' : 'BUSY'
                      });
                    }
                  }}
                  className={`relative w-14 h-14 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0 ${prof.photoUrl ? 'cursor-pointer hover:opacity-90 active:scale-95 transition-transform' : ''}`}
                  title={prof.photoUrl ? 'Tap to view full-screen photo' : undefined}
                >
                  {prof.photoUrl ? (
                    <img
                      src={prof.photoUrl}
                      alt={prof.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                      <Wrench className="w-5 h-5 text-slate-400" />
                      <span className="text-[8px] font-bold mt-0.5 uppercase">{prof.profession.slice(0, 4)}</span>
                    </div>
                  )}
                  {prof.isAvailable ? (
                    <div className="absolute bottom-0 inset-x-0 bg-emerald-600 text-[8px] font-black text-white text-center py-0.5 leading-none">
                      AVAILABLE
                    </div>
                  ) : (
                    <div className="absolute bottom-0 inset-x-0 bg-slate-600 text-[8px] font-black text-white text-center py-0.5 leading-none">
                      BUSY
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-1">
                    <h3 className="font-black text-sm text-slate-900 dark:text-white leading-tight truncate">
                      {prof.name}
                    </h3>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleOpenEdit(prof)}
                        className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                        title="Edit Profile"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeletingId(prof.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40"
                        title="Delete Profile"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Profession, Rating & Price */}
                  <div className="flex flex-wrap items-center gap-1.5 text-xs mt-1">
                    <span className="font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-md text-[11px]">
                      {prof.profession}
                    </span>
                    <div className="flex items-center text-amber-500 font-bold text-xs gap-0.5" title={`${prof.rating} Stars`}>
                      <div className="flex items-center">
                        {[1, 2, 3, 4, 5].map((starIdx) => {
                          if (prof.rating >= starIdx) {
                            return <Star key={starIdx} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />;
                          } else if (prof.rating >= starIdx - 0.5) {
                            return <StarHalf key={starIdx} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />;
                          } else {
                            return <Star key={starIdx} className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600" />;
                          }
                        })}
                      </div>
                      <span className="ml-1 text-[11px] font-black">{prof.rating % 1 === 0 ? prof.rating.toFixed(1) : prof.rating}</span>
                    </div>
                    {prof.experienceYears && (
                      <span className="text-[11px] text-slate-400 dark:text-slate-500">
                        • {prof.experienceYears} yrs exp
                      </span>
                    )}
                  </div>

                  {/* Price Rate */}
                  {prof.priceRange && (
                    <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 mt-1 flex items-center gap-1">
                      <DollarSign className="w-3 h-3 text-emerald-600" />
                      <span>{prof.priceRange}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Address / Location */}
              <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{prof.address} ({prof.cityArea})</span>
              </div>

              {/* Skills Tags */}
              {prof.skills && prof.skills.length > 0 && (
                <div className="flex flex-wrap gap-1 text-[10px]">
                  {prof.skills.map((skill, idx) => (
                    <span
                      key={idx}
                      className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              )}

              {/* Bio summary */}
              {prof.bio && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 italic line-clamp-2 leading-relaxed">
                  "{prof.bio}"
                </p>
              )}

              {/* Action Buttons: Direct Call, WhatsApp, and Share with Customer */}
              <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                <a
                  href={`tel:${prof.phone}`}
                  className="py-2 px-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  title="Call Phone"
                >
                  <Phone className="w-3.5 h-3.5 text-blue-600" />
                  <span>Call</span>
                </a>

                <a
                  href={`https://wa.me/${formatWhatsAppNumber(prof.phone)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2 px-2 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  title="Chat on WhatsApp"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span>WhatsApp</span>
                </a>

                <button
                  type="button"
                  onClick={() => handleShareWithCustomer(prof)}
                  className="py-2 px-2 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-2xs transition-all active:scale-95 cursor-pointer"
                  title="Send profile card to customer via WhatsApp"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Send Card</span>
                </button>
              </div>

              {/* Delete Confirmation */}
              {deletingId === prof.id && (
                <div className="p-2.5 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 rounded-xl text-xs flex items-center justify-between">
                  <span className="font-bold text-rose-800 dark:text-rose-200">Delete this professional?</span>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => {
                        onDeleteProfessional(prof.id);
                        setDeletingId(null);
                        showToast('Professional removed from directory');
                      }}
                      className="py-1 px-2.5 bg-rose-600 text-white rounded-lg font-bold"
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => setDeletingId(null)}
                      className="py-1 px-2 bg-slate-200 text-slate-700 rounded-lg font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Professional Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden my-auto border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 max-h-[92vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Wrench className="w-5 h-5 text-amber-500" />
                <h3 className="font-black text-sm">
                  {editingProf ? 'Edit Professional Profile' : 'Add New Local Professional'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleFormSubmit} className="p-4 space-y-3 overflow-y-auto flex-1 text-xs">
              {formError && (
                <div className="p-2.5 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 rounded-xl text-rose-700 dark:text-rose-300 font-semibold">
                  {formError}
                </div>
              )}

              {/* Photo Upload with Compressor */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-2">
                <label className="font-bold text-slate-700 dark:text-slate-300 block text-xs">
                  Professional Photo
                </label>
                <div className="flex items-center gap-3">
                  {formPhotoUrl ? (
                    <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-slate-300 dark:border-slate-600 shrink-0">
                      <img src={formPhotoUrl} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setFormPhotoUrl('')}
                        className="absolute inset-0 bg-black/60 text-white flex items-center justify-center text-xs"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-14 h-14 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-400 shrink-0 bg-white dark:bg-slate-900">
                      <Camera className="w-5 h-5 text-slate-400" />
                    </div>
                  )}

                  <div className="flex-1 space-y-1.5">
                    <label className="flex items-center justify-center gap-1.5 py-2 px-3 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-xl font-bold cursor-pointer border border-slate-200 dark:border-slate-700 shadow-2xs transition-colors">
                      <Camera className="w-3.5 h-3.5 text-amber-600" />
                      <span>Take or Choose Photo</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            try {
                              const compressed = await compressImageFile(file, { maxDimension: 600, quality: 0.78 });
                              setFormPhotoUrl(compressed);
                            } catch (err) {
                              console.error('Failed to compress image:', err);
                            }
                          }
                          e.target.value = '';
                        }}
                      />
                    </label>
                    <input
                      type="url"
                      placeholder="Or paste photo URL"
                      value={formPhotoUrl}
                      onChange={(e) => setFormPhotoUrl(e.target.value)}
                      className="w-full p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] text-slate-800 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Full Name & Profession */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Ramesh Painter"
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Profession * <span className="text-[10px] text-slate-400 font-normal">(select or type)</span>
                  </label>
                  <input
                    type="text"
                    required
                    list="directory-professions"
                    value={formProfession === 'Other' ? formCustomProfession : formProfession}
                    onChange={(e) => {
                      setFormProfession(e.target.value);
                      setFormCustomProfession(e.target.value);
                    }}
                    placeholder="e.g. Painter, Electrician, Tile Mistri..."
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white text-xs"
                  />
                  <datalist id="directory-professions">
                    <option value="Painter" />
                    <option value="Plumber" />
                    <option value="Electrician" />
                    <option value="Carpenter" />
                    <option value="POP Artisan" />
                    <option value="Mason / Mistri" />
                    <option value="Welder" />
                    <option value="Contractor" />
                    <option value="Tile & Marble Mistri" />
                    <option value="Aluminium & Glass Fabricator" />
                  </datalist>

                  {/* Quick Select Preset Badges */}
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {['Painter', 'Plumber', 'Electrician', 'Carpenter', 'POP', 'Mistri', 'Contractor'].map(p => (
                      <button
                        type="button"
                        key={p}
                        onClick={() => {
                          const full = p === 'Mistri' ? 'Mason / Mistri' : p === 'POP' ? 'POP Artisan' : p;
                          setFormProfession(full);
                          setFormCustomProfession(full);
                        }}
                        className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800 hover:bg-amber-100 dark:hover:bg-amber-950/40 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-medium cursor-pointer"
                      >
                        +{p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Phone Numbers */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Primary Phone *</label>
                  <input
                    type="tel"
                    required
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="e.g. 9876543210"
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Alternate Phone</label>
                  <input
                    type="tel"
                    value={formAltPhone}
                    onChange={(e) => setFormAltPhone(e.target.value)}
                    placeholder="Optional secondary"
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Address & City Area */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Address / Landmark</label>
                  <input
                    type="text"
                    value={formAddress}
                    onChange={(e) => setFormAddress(e.target.value)}
                    placeholder="e.g. Near Dehariya Masjid"
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">City / Area</label>
                  <input
                    type="text"
                    value={formCityArea}
                    onChange={(e) => setFormCityArea(e.target.value)}
                    placeholder="e.g. Jhulaniya Chowk"
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Rating & Price Range */}
              <div className="space-y-2">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300 block">Rating (Stars) *</label>
                    <span className="font-black text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-md">
                      {formRating.toFixed(1)} / 5.0 Stars
                    </span>
                  </div>

                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl space-y-2">
                    {/* Stars and Stepper */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => {
                          const isFull = formRating >= star;
                          const isHalf = !isFull && formRating >= star - 0.5;

                          return (
                            <button
                              type="button"
                              key={star}
                              onClick={() => {
                                // Toggle between full star and half star
                                if (formRating === star) {
                                  setFormRating(star - 0.5);
                                } else if (formRating === star - 0.5) {
                                  setFormRating(star);
                                } else {
                                  setFormRating(star);
                                }
                              }}
                              className="p-0.5 text-amber-400 hover:scale-110 active:scale-95 transition-transform cursor-pointer"
                              title={`Click to set ${formRating === star ? star - 0.5 : star} stars`}
                            >
                              {isFull ? (
                                <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                              ) : isHalf ? (
                                <StarHalf className="w-5 h-5 fill-amber-400 text-amber-400" />
                              ) : (
                                <Star className="w-5 h-5 text-slate-300 dark:text-slate-600" />
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {/* Precision -0.5 / +0.5 Stepper */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setFormRating(prev => Math.max(1, Math.round((prev - 0.5) * 10) / 10))}
                          className="px-2 py-1 rounded-lg bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors cursor-pointer"
                          title="Decrease rating by 0.5"
                        >
                          -0.5
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormRating(prev => Math.min(5, Math.round((prev + 0.5) * 10) / 10))}
                          className="px-2 py-1 rounded-lg bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors cursor-pointer"
                          title="Increase rating by 0.5"
                        >
                          +0.5
                        </button>
                      </div>
                    </div>

                    {/* Quick Presets: 3.0, 3.5, 4.0, 4.5, 5.0 */}
                    <div className="flex items-center gap-1.5 pt-1.5 border-t border-slate-200 dark:border-slate-700/60 text-[11px]">
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Presets:</span>
                      {[3.0, 3.5, 4.0, 4.5, 5.0].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setFormRating(preset)}
                          className={`px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer ${
                            formRating === preset
                              ? 'bg-amber-500 text-slate-950 shadow-2xs'
                              : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600'
                          }`}
                        >
                          {preset.toFixed(1)}★
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Estimated Rate / Price</label>
                  <input
                    type="text"
                    value={formPriceRange}
                    onChange={(e) => setFormPriceRange(e.target.value)}
                    placeholder="e.g. ₹600/day or ₹15/sq.ft"
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Experience & Availability */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Experience (Years)</label>
                  <input
                    type="number"
                    min={0}
                    max={60}
                    value={formExperience}
                    onChange={(e) => setFormExperience(e.target.value)}
                    placeholder="e.g. 8"
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Current Availability</label>
                  <button
                    type="button"
                    onClick={() => setFormIsAvailable(!formIsAvailable)}
                    className={`w-full p-2 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border ${
                      formIsAvailable
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <Check className={`w-3.5 h-3.5 ${formIsAvailable ? 'text-emerald-600' : 'opacity-0'}`} />
                    <span>{formIsAvailable ? 'Available for Work' : 'Currently Busy'}</span>
                  </button>
                </div>
              </div>

              {/* Skills / Specialties */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Specialties & Skills</label>
                <input
                  type="text"
                  value={formSkills}
                  onChange={(e) => setFormSkills(e.target.value)}
                  placeholder="e.g. Texture Paint, Waterproofing, CPVC piping (comma separated)"
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white"
                />
              </div>

              {/* Biography / Notes */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Biography / Customer Notes</label>
                <textarea
                  rows={2}
                  value={formBio}
                  onChange={(e) => setFormBio(e.target.value)}
                  placeholder="e.g. Trustworthy painter with 5 team members. Good finishing and fast delivery."
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white resize-none"
                />
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 px-4 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 rounded-2xl font-black text-sm shadow-md transition-all active:scale-98 cursor-pointer"
                >
                  {editingProf ? 'Update Professional Record' : 'Save to Karigar Directory'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Full-Screen Photo Lightbox */}
      {lightboxImage && (
        <PhotoLightboxModal
          isOpen={Boolean(lightboxImage)}
          onClose={() => setLightboxImage(null)}
          imageUrl={lightboxImage.url}
          title={lightboxImage.title}
          subtitle={lightboxImage.subtitle}
          badge={lightboxImage.badge}
        />
      )}
    </div>
  );
};
