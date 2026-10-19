import React, { useState } from 'react';
import { 
  Calculator, 
  Plus, 
  Trash2, 
  Share2, 
  Save, 
  Layers, 
  Package, 
  Check, 
  ChevronDown, 
  FileText,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { WallDimension, MaterialRequirement, MaterialEstimate } from '../types';
import { formatCurrency, formatDateTime, formatWhatsAppNumber } from '../utils/formatters';

interface MaterialCalcViewProps {
  savedEstimates: MaterialEstimate[];
  onSaveEstimate: (estimate: MaterialEstimate) => void;
  onDeleteEstimate: (estimateId: string) => void;
}

export const MaterialCalcView: React.FC<MaterialCalcViewProps> = ({
  savedEstimates,
  onSaveEstimate,
  onDeleteEstimate
}) => {
  const [activeTab, setActiveTab] = useState<'calculator' | 'saved'>('calculator');
  const [deletingEstimateId, setDeletingEstimateId] = useState<string | null>(null);

  // Estimate Metadata
  const [title, setTitle] = useState('New Room Painting Estimate');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [notes, setNotes] = useState('');

  // Walls / Surfaces List
  const [walls, setWalls] = useState<WallDimension[]>([
    { id: 'w-1', name: 'Wall 1 (Main Front)', lengthFeet: 20, heightFeet: 10, deductionsSqFt: 21, netSqFt: 179 },
    { id: 'w-2', name: 'Wall 2 (Side)', lengthFeet: 15, heightFeet: 10, deductionsSqFt: 15, netSqFt: 135 },
    { id: 'w-3', name: 'Wall 3 (Back)', lengthFeet: 20, heightFeet: 10, deductionsSqFt: 0, netSqFt: 200 },
    { id: 'w-4', name: 'Wall 4 (Side)', lengthFeet: 15, heightFeet: 10, deductionsSqFt: 20, netSqFt: 130 },
  ]);

  // Extra Allowance / Wastage (%)
  const [extraAllowance, setExtraAllowance] = useState<number>(10);

  // Material configurations
  const [materials, setMaterials] = useState<MaterialRequirement[]>([
    {
      id: 'm-1',
      materialType: 'putty',
      materialName: 'Wall Care Putty (2 Coats)',
      coats: 2,
      coverageSqFtPerUnit: 16, // 16 sq.ft/kg
      extraAllowancePercent: 10,
      totalRequiredQty: 44, // kg
      unit: 'kg',
      packSizes: [{ size: 40, label: '40 kg bag' }, { size: 20, label: '20 kg bag' }, { size: 5, label: '5 kg bag' }, { size: 1, label: '1 kg' }],
      packRecommendation: '1 x 40kg + 1 x 5kg (Total 45kg)',
      estimatedRatePerUnit: 24,
      estimatedCost: 1080
    },
    {
      id: 'm-2',
      materialType: 'primer',
      materialName: 'Interior Primer (1 Coat)',
      coats: 1,
      coverageSqFtPerUnit: 120, // 120 sq.ft/L
      extraAllowancePercent: 10,
      totalRequiredQty: 6, // Litres
      unit: 'litres',
      packSizes: [{ size: 20, label: '20L' }, { size: 10, label: '10L' }, { size: 4, label: '4L' }, { size: 1, label: '1L' }],
      packRecommendation: '1 x 4L + 2 x 1L (Total 6L)',
      estimatedRatePerUnit: 110,
      estimatedCost: 660
    },
    {
      id: 'm-3',
      materialType: 'paint',
      materialName: 'Interior Emulsion Paint (2 Coats)',
      coats: 2,
      coverageSqFtPerUnit: 65, // 65 sq.ft/L for 2 coats
      extraAllowancePercent: 10,
      totalRequiredQty: 11, // Litres
      unit: 'litres',
      packSizes: [{ size: 20, label: '20L' }, { size: 10, label: '10L' }, { size: 4, label: '4L' }, { size: 1, label: '1L' }],
      packRecommendation: '1 x 10L + 1 x 1L (Total 11L)',
      estimatedRatePerUnit: 165,
      estimatedCost: 1815
    }
  ]);

  // Compute Total Net Area
  const totalAreaSqFt = walls.reduce((acc, w) => acc + w.netSqFt, 0);

  // Recalculate material quantities whenever area or allowance changes
  const calculatePackBreakdown = (
    totalQty: number,
    packSizes: { size: number; label: string }[],
    unit: string
  ): string => {
    if (packSizes.length === 0) return `${Math.ceil(totalQty)} ${unit}`;
    
    // Sort pack sizes descending
    const sorted = [...packSizes].sort((a, b) => b.size - a.size);
    let remaining = Math.ceil(totalQty);
    const breakdown: string[] = [];

    for (const p of sorted) {
      if (remaining >= p.size) {
        const count = Math.floor(remaining / p.size);
        breakdown.push(`${count} x ${p.label}`);
        remaining -= count * p.size;
      }
    }

    if (remaining > 0) {
      // Pick smallest pack that covers remaining
      const smallest = sorted[sorted.length - 1];
      const count = Math.ceil(remaining / smallest.size);
      breakdown.push(`${count} x ${smallest.label}`);
    }

    return breakdown.join(' + ') || `${Math.ceil(totalQty)} ${unit}`;
  };

  const recomputeMaterialsForArea = (newArea: number, allowance: number) => {
    setMaterials(prev => prev.map(mat => {
      const baseQty = (newArea / mat.coverageSqFtPerUnit) * (mat.materialType === 'putty' || mat.materialType === 'paint' ? 1 : mat.coats);
      const withBuffer = baseQty * (1 + allowance / 100);
      const roundedQty = Math.round(withBuffer * 10) / 10;
      const packRec = calculatePackBreakdown(roundedQty, mat.packSizes, mat.unit);
      const cost = Math.round(roundedQty * mat.estimatedRatePerUnit);

      return {
        ...mat,
        extraAllowancePercent: allowance,
        totalRequiredQty: roundedQty,
        packRecommendation: packRec,
        estimatedCost: cost
      };
    }));
  };

  // Wall manipulation
  const handleUpdateWall = (index: number, field: keyof WallDimension, value: any) => {
    const updated = [...walls];
    const w = { ...updated[index], [field]: value };
    const gross = (parseFloat(w.lengthFeet as any) || 0) * (parseFloat(w.heightFeet as any) || 0);
    const ded = parseFloat(w.deductionsSqFt as any) || 0;
    w.netSqFt = Math.max(0, gross - ded);
    updated[index] = w;
    setWalls(updated);

    const newTotal = updated.reduce((acc, item) => acc + item.netSqFt, 0);
    recomputeMaterialsForArea(newTotal, extraAllowance);
  };

  const handleAddWall = () => {
    const newWall: WallDimension = {
      id: `w-${Date.now()}`,
      name: `Wall ${walls.length + 1}`,
      lengthFeet: 12,
      heightFeet: 10,
      deductionsSqFt: 0,
      netSqFt: 120
    };
    const updated = [...walls, newWall];
    setWalls(updated);
    const newTotal = updated.reduce((acc, item) => acc + item.netSqFt, 0);
    recomputeMaterialsForArea(newTotal, extraAllowance);
  };

  const handleRemoveWall = (index: number) => {
    const updated = walls.filter((_, i) => i !== index);
    setWalls(updated);
    const newTotal = updated.reduce((acc, item) => acc + item.netSqFt, 0);
    recomputeMaterialsForArea(newTotal, extraAllowance);
  };

  // Allowance change
  const handleAllowanceChange = (newAllowance: number) => {
    setExtraAllowance(newAllowance);
    recomputeMaterialsForArea(totalAreaSqFt, newAllowance);
  };

  // Material item update with editable coverage
  const handleUpdateMaterial = (index: number, field: keyof MaterialRequirement, val: any) => {
    const updated = [...materials];
    const mat = { ...updated[index] };

    if (field === 'coverageSqFtPerUnit') {
      const cov = Math.max(0.1, parseFloat(val) || 1);
      mat.coverageSqFtPerUnit = cov;
      const multiplier = (mat.materialType === 'primer' || mat.materialType === 'pop' || mat.materialType === 'custom') ? mat.coats : 1;
      const baseQty = (totalAreaSqFt / cov) * multiplier;
      mat.totalRequiredQty = Math.round(baseQty * (1 + extraAllowance / 100) * 10) / 10;
      mat.packRecommendation = calculatePackBreakdown(mat.totalRequiredQty, mat.packSizes, mat.unit);
      mat.estimatedCost = Math.round(mat.totalRequiredQty * mat.estimatedRatePerUnit);
    } else if (field === 'coats') {
      const coats = Math.max(1, parseInt(val) || 1);
      mat.coats = coats;
      const multiplier = (mat.materialType === 'primer' || mat.materialType === 'pop' || mat.materialType === 'custom') ? coats : 1;
      const baseQty = (totalAreaSqFt / (mat.coverageSqFtPerUnit || 1)) * multiplier;
      mat.totalRequiredQty = Math.round(baseQty * (1 + extraAllowance / 100) * 10) / 10;
      mat.packRecommendation = calculatePackBreakdown(mat.totalRequiredQty, mat.packSizes, mat.unit);
      mat.estimatedCost = Math.round(mat.totalRequiredQty * mat.estimatedRatePerUnit);
    } else if (field === 'estimatedRatePerUnit') {
      const rate = Math.max(0, parseFloat(val) || 0);
      mat.estimatedRatePerUnit = rate;
      mat.estimatedCost = Math.round(mat.totalRequiredQty * rate);
    } else {
      (mat as any)[field] = val;
    }

    updated[index] = mat;
    setMaterials(updated);
  };

  const handleAddMaterialPreset = (type: 'putty' | 'primer' | 'paint' | 'pop' | 'custom') => {
    let newMat: MaterialRequirement;
    if (type === 'putty') {
      newMat = {
        id: `mat-${Date.now()}`,
        materialType: 'putty',
        materialName: 'Acrylic Wall Putty',
        coats: 2,
        coverageSqFtPerUnit: 18,
        extraAllowancePercent: extraAllowance,
        totalRequiredQty: Math.round((totalAreaSqFt / 18) * (1 + extraAllowance / 100)),
        unit: 'kg',
        packSizes: [{ size: 40, label: '40kg bag' }, { size: 20, label: '20kg bag' }, { size: 5, label: '5kg' }],
        packRecommendation: '',
        estimatedRatePerUnit: 25,
        estimatedCost: 0
      };
    } else if (type === 'pop') {
      newMat = {
        id: `mat-${Date.now()}`,
        materialType: 'pop',
        materialName: 'Plaster of Paris (POP)',
        coats: 1,
        coverageSqFtPerUnit: 2.2, // ~2.2 sqft/kg for 12mm
        extraAllowancePercent: extraAllowance,
        totalRequiredQty: Math.round((totalAreaSqFt / 2.2) * (1 + extraAllowance / 100)),
        unit: 'kg',
        packSizes: [{ size: 25, label: '25kg bag' }, { size: 2, label: '2kg packet' }],
        packRecommendation: '',
        estimatedRatePerUnit: 14,
        estimatedCost: 0
      };
    } else if (type === 'primer') {
      newMat = {
        id: `mat-${Date.now()}`,
        materialType: 'primer',
        materialName: 'Exterior Wall Primer',
        coats: 1,
        coverageSqFtPerUnit: 110,
        extraAllowancePercent: extraAllowance,
        totalRequiredQty: Math.round((totalAreaSqFt / 110) * (1 + extraAllowance / 100)),
        unit: 'litres',
        packSizes: [{ size: 20, label: '20L' }, { size: 4, label: '4L' }, { size: 1, label: '1L' }],
        packRecommendation: '',
        estimatedRatePerUnit: 130,
        estimatedCost: 0
      };
    } else {
      newMat = {
        id: `mat-${Date.now()}`,
        materialType: 'paint',
        materialName: 'Apex Exterior Weatherproof',
        coats: 2,
        coverageSqFtPerUnit: 60,
        extraAllowancePercent: extraAllowance,
        totalRequiredQty: Math.round((totalAreaSqFt / 60) * (1 + extraAllowance / 100)),
        unit: 'litres',
        packSizes: [{ size: 20, label: '20L' }, { size: 10, label: '10L' }, { size: 4, label: '4L' }, { size: 1, label: '1L' }],
        packRecommendation: '',
        estimatedRatePerUnit: 295,
        estimatedCost: 0
      };
    }

    newMat.packRecommendation = calculatePackBreakdown(newMat.totalRequiredQty, newMat.packSizes, newMat.unit);
    newMat.estimatedCost = Math.round(newMat.totalRequiredQty * newMat.estimatedRatePerUnit);
    setMaterials([...materials, newMat]);
  };

  const handleRemoveMaterial = (index: number) => {
    setMaterials(materials.filter((_, i) => i !== index));
  };

  const totalEstimateCost = materials.reduce((acc, m) => acc + m.estimatedCost, 0);

  // Save Estimate
  const handleSave = () => {
    const estimate: MaterialEstimate = {
      id: `est-${Date.now()}`,
      title: title.trim() || 'Wall Material Estimate',
      date: new Date().toISOString(),
      clientName: clientName.trim() || undefined,
      clientPhone: clientPhone.trim() || undefined,
      walls,
      totalAreaSqFt,
      materials,
      totalEstimatedCost: totalEstimateCost,
      notes: notes.trim() || undefined,
      createdAt: new Date().toISOString()
    };
    onSaveEstimate(estimate);
    // Switch to saved tab to clearly show the saved estimate
    setActiveTab('saved');
  };

  // WhatsApp Share
  const handleWhatsAppShare = () => {
    let msg = `*A.K. HARDWARE - MATERIAL ESTIMATE*\n`;
    msg += `Jhulaniya Chowk, Near Dehariya Masjid\n`;
    msg += `--------------------------\n`;
    msg += `Project: ${title}\n`;
    if (clientName) msg += `Client: ${clientName}\n`;
    msg += `Total Surface Area: *${Math.round(totalAreaSqFt)} sq.ft*\n`;
    msg += `Wastage Buffer: +${extraAllowance}%\n`;
    msg += `--------------------------\n`;
    
    materials.forEach((m, idx) => {
      msg += `*${idx + 1}. ${m.materialName}*\n`;
      msg += `   Qty: ${m.totalRequiredQty} ${m.unit} (${m.coats} coat${m.coats > 1 ? 's' : ''})\n`;
      if (m.packRecommendation) msg += `   Packs: ${m.packRecommendation}\n`;
      if (m.estimatedCost > 0) msg += `   Approx Cost: ${formatCurrency(m.estimatedCost)}\n`;
    });

    msg += `--------------------------\n`;
    msg += `*Total Material Cost: ${formatCurrency(totalEstimateCost)}*\n`;
    const calcShopName = localStorage.getItem('ak_shop_name') || 'Hardware POS';
    msg += `_Calculated via ${calcShopName}_`;

    const encoded = encodeURIComponent(msg);
    const cleanPhone = formatWhatsAppNumber(clientPhone);
    const url = cleanPhone 
      ? `https://wa.me/${cleanPhone}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;
    window.open(url, '_blank');
  };

  // Load Saved Estimate
  const handleLoadEstimate = (est: MaterialEstimate) => {
    setTitle(est.title);
    setClientName(est.clientName || '');
    setClientPhone(est.clientPhone || '');
    setNotes(est.notes || '');
    setWalls(est.walls);
    setMaterials(est.materials);
    setActiveTab('calculator');
  };

  return (
    <div className="pb-28 pt-2 px-3 max-w-lg mx-auto space-y-3">
      
      {/* Tab Switcher */}
      <div className="bg-slate-100 p-1 rounded-xl flex items-center text-xs font-bold">
        <button
          onClick={() => setActiveTab('calculator')}
          className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'calculator' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
          }`}
        >
          <Calculator className="w-4 h-4 text-emerald-600" />
          Material Calculator
        </button>
        <button
          onClick={() => setActiveTab('saved')}
          className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'saved' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
          }`}
        >
          <FileText className="w-4 h-4 text-slate-500" />
          Saved Estimates ({savedEstimates.length})
        </button>
      </div>

      {activeTab === 'calculator' ? (
        <div className="space-y-3">
          
          {/* Project Header Info */}
          <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-xs space-y-2.5">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Estimate Title (e.g. 3BHK Rameshji Flat)"
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white"
            />
            <div className="grid grid-cols-2 gap-2 text-xs">
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Client / Contractor Name"
                className="p-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white font-medium"
              />
              <input
                type="tel"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                placeholder="Client WhatsApp No."
                className="p-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white font-medium"
              />
            </div>
          </div>

          {/* 1. WALL DIMENSIONS (AREA CALCULATOR) */}
          <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-600" />
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Surface / Wall Dimensions
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                  {Math.round(totalAreaSqFt)} sq.ft
                </span>
              </div>
            </div>

            {/* Wall Rows */}
            <div className="space-y-2">
              {walls.map((w, idx) => (
                <div key={w.id} className="p-2 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <input
                      type="text"
                      value={w.name}
                      onChange={(e) => handleUpdateWall(idx, 'name', e.target.value)}
                      className="font-bold text-slate-800 bg-transparent border-none p-0 focus:outline-hidden w-40"
                    />
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-xs">
                        {Math.round(w.netSqFt)} sq.ft
                      </span>
                      {walls.length > 1 && (
                        <button
                          onClick={() => handleRemoveWall(idx)}
                          className="text-slate-400 hover:text-rose-600 p-0.5"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-400 block text-[9px]">Length (ft)</span>
                      <input
                        type="number"
                        step="any"
                        value={w.lengthFeet}
                        onChange={(e) => handleUpdateWall(idx, 'lengthFeet', e.target.value)}
                        className="w-full p-1 bg-white border border-slate-200 rounded font-semibold text-center"
                      />
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px]">Height (ft)</span>
                      <input
                        type="number"
                        step="any"
                        value={w.heightFeet}
                        onChange={(e) => handleUpdateWall(idx, 'heightFeet', e.target.value)}
                        className="w-full p-1 bg-white border border-slate-200 rounded font-semibold text-center"
                      />
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px]">Deductions (sq.ft)</span>
                      <input
                        type="number"
                        step="any"
                        value={w.deductionsSqFt}
                        onChange={(e) => handleUpdateWall(idx, 'deductionsSqFt', e.target.value)}
                        placeholder="Doors/windows"
                        className="w-full p-1 bg-white border border-slate-200 rounded font-semibold text-center"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center pt-1">
              <button
                onClick={handleAddWall}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> + Add Wall / Ceiling
              </button>

              {/* Extra Allowance Presets */}
              <div className="flex items-center gap-1 text-[11px]">
                <span className="text-slate-400">Buffer:</span>
                {[5, 10, 15].map((pct) => (
                  <button
                    key={pct}
                    onClick={() => handleAllowanceChange(pct)}
                    className={`px-2 py-0.5 rounded font-bold ${
                      extraAllowance === pct
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    +{pct}%
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 2. MATERIALS CALCULATION */}
          <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Material Requirements
                </span>
              </div>
              <span className="text-xs font-bold text-slate-500">{materials.length} materials</span>
            </div>

            <div className="space-y-2.5">
              {materials.map((mat, idx) => (
                <div key={mat.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                  <div className="flex items-start justify-between">
                    <div>
                      <input
                        type="text"
                        value={mat.materialName}
                        onChange={(e) => handleUpdateMaterial(idx, 'materialName', e.target.value)}
                        className="font-bold text-slate-900 text-xs bg-transparent border-none p-0 focus:outline-hidden"
                      />
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        Brand / Material: <span className="font-semibold text-slate-700">{mat.unit}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveMaterial(idx)}
                      className="text-slate-400 hover:text-rose-600 p-0.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Editable Coverage and Coats Settings */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-white p-2 rounded-lg border border-slate-200 text-[11px]">
                    <div>
                      <span className="text-[9px] text-slate-500 font-bold block uppercase">Coverage (sq.ft / {mat.unit}) *</span>
                      <div className="flex items-center gap-1 mt-0.5">
                        <input
                          type="number"
                          step="any"
                          min="0.1"
                          value={mat.coverageSqFtPerUnit}
                          onChange={(e) => handleUpdateMaterial(idx, 'coverageSqFtPerUnit', e.target.value)}
                          className="w-full p-1 bg-amber-50/70 border border-amber-300 rounded font-black text-amber-950 text-xs focus:bg-white"
                          title="Edit square feet coverage per unit"
                        />
                        <span className="text-[10px] text-slate-400 font-semibold shrink-0">sq.ft</span>
                      </div>
                    </div>

                    <div>
                      <span className="text-[9px] text-slate-500 font-bold block uppercase">No. of Coats</span>
                      <div className="flex items-center gap-1 mt-0.5">
                        <input
                          type="number"
                          min="1"
                          max="6"
                          value={mat.coats}
                          onChange={(e) => handleUpdateMaterial(idx, 'coats', e.target.value)}
                          className="w-full p-1 bg-slate-50 border border-slate-200 rounded font-bold text-slate-800 text-xs text-center"
                        />
                        <span className="text-[10px] text-slate-400 font-semibold shrink-0">coat{mat.coats > 1 ? 's' : ''}</span>
                      </div>
                    </div>

                    <div className="col-span-2 sm:col-span-1">
                      <span className="text-[9px] text-slate-500 font-bold block uppercase">Rate (₹ / {mat.unit})</span>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-slate-400 text-xs">₹</span>
                        <input
                          type="number"
                          value={mat.estimatedRatePerUnit}
                          onChange={(e) => handleUpdateMaterial(idx, 'estimatedRatePerUnit', e.target.value)}
                          className="w-full p-1 bg-slate-50 border border-slate-200 rounded font-bold text-slate-800 text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Quantity & Pack Recommendation Highlight */}
                  <div className="bg-amber-50 p-2 rounded-lg border border-amber-200 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-amber-800 font-bold block uppercase">Recommended Packs</span>
                      <span className="font-bold text-slate-900 text-xs">{mat.packRecommendation}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-black text-amber-700">{mat.totalRequiredQty} {mat.unit}</span>
                      <div className="text-[10px] text-slate-500 font-bold">{formatCurrency(mat.estimatedCost)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Material Preset Buttons */}
            <div className="flex gap-1.5 flex-wrap pt-1 text-xs">
              <span className="text-[11px] text-slate-400 self-center">Add:</span>
              <button
                onClick={() => handleAddMaterialPreset('putty')}
                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold text-[11px]"
              >
                + Putty
              </button>
              <button
                onClick={() => handleAddMaterialPreset('primer')}
                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold text-[11px]"
              >
                + Primer
              </button>
              <button
                onClick={() => handleAddMaterialPreset('paint')}
                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold text-[11px]"
              >
                + Paint
              </button>
              <button
                onClick={() => handleAddMaterialPreset('pop')}
                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold text-[11px]"
              >
                + POP
              </button>
            </div>
          </div>

          {/* 3. NOTES & TOTAL ESTIMATE SUMMARY */}
          <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-xl space-y-3">
            <div className="flex justify-between items-center text-sm font-bold border-b border-slate-800 pb-2">
              <span className="text-slate-400">Total Material Cost:</span>
              <span className="text-amber-400 text-xl font-black">{formatCurrency(totalEstimateCost)}</span>
            </div>

            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes for contractor (e.g. valid for 15 days)"
              className="w-full p-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400"
            />

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={handleSave}
                className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
              >
                <Save className="w-4 h-4 text-amber-400" />
                Save Estimate
              </button>
              <button
                onClick={handleWhatsAppShare}
                className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md"
              >
                <Share2 className="w-4 h-4" />
                Share WhatsApp
              </button>
            </div>
          </div>

        </div>
      ) : (
        /* Saved Estimates Tab */
        <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Saved Quotations</span>
            <span className="text-xs text-slate-400">{savedEstimates.length} saved</span>
          </div>

          {savedEstimates.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              No saved estimates yet.
            </div>
          ) : (
            <div className="space-y-2">
              {savedEstimates.map((est) => (
                <div
                  key={est.id}
                  className="p-3 bg-slate-50 hover:bg-amber-50/50 rounded-xl border border-slate-200 space-y-1.5 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-bold text-xs text-slate-900">{est.title}</div>
                      <div className="text-[11px] text-slate-500">
                        {est.clientName ? `${est.clientName} • ` : ''}{Math.round(est.totalAreaSqFt)} sq.ft • {formatDateTime(est.date)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-black text-xs text-amber-600">{formatCurrency(est.totalEstimatedCost)}</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 text-xs">
                    <button
                      onClick={() => handleLoadEstimate(est)}
                      className="text-amber-700 hover:text-amber-900 font-bold text-[11px] flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" /> Load & Edit
                    </button>
                    {deletingEstimateId === est.id ? (
                      <div className="flex items-center gap-1 bg-rose-50 p-0.5 rounded border border-rose-200">
                        <button
                          onClick={() => {
                            onDeleteEstimate(est.id);
                            setDeletingEstimateId(null);
                          }}
                          className="px-1.5 py-0.5 bg-rose-600 text-white rounded text-[10px] font-bold"
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => setDeletingEstimateId(null)}
                          className="px-1 py-0.5 bg-slate-200 text-slate-700 rounded text-[10px]"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeletingEstimateId(est.id)}
                        className="text-slate-400 hover:text-rose-600 p-1"
                        title="Delete estimate"
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
      )}

    </div>
  );
};
