import React, { useState, useRef } from 'react';
import { 
  ArrowLeft, Save, Car, Wrench, Calendar, Fuel, User, Gauge, 
  FileText, Scan, Check, X, ShieldCheck, Eye, Trash2, Zap, 
  Droplets, Flame, AlertCircle, Info, Paperclip, Sparkles 
} from 'lucide-react';
import { AutoModule, FuelType, AutoKmRecord } from '../types';
import { DocumentScanner } from './DocumentScanner';
import { DocumentViewer } from './DocumentViewer';
import { CAR_BRANDS } from '../utils/carBrands';
import { BrandModelPicker } from './BrandModelPicker';
import { getAutoDeadlineTargetDate, calculateBolloAuto } from '../utils/autoDeadlines';
import { motion, AnimatePresence } from 'motion/react';

interface AutoEditScreenProps {
  module: AutoModule;
  onSave: (updated: AutoModule) => void;
  onCancel: () => void;
}

const inputCls =
  'w-full p-3.5 bg-[var(--bg)] border border-[var(--border)] rounded-2xl outline-none focus:border-[var(--accent)] transition-all text-sm font-semibold text-[var(--text-main)] placeholder:text-[var(--text-muted)]/50';

const SectionTitle = ({ icon: Icon, label, subtitle }: { icon: React.ElementType; label: string; subtitle?: string }) => (
  <div className="flex items-center gap-2.5 mb-4 mt-8 first:mt-0">
    <div className="p-2 bg-[var(--accent-bg)] rounded-xl text-[var(--accent)] shrink-0">
      <Icon className="w-4 h-4" />
    </div>
    <div className="flex-1 min-w-0">
      <span className="text-[11px] font-black uppercase tracking-wider text-[var(--text-main)] block truncate">{label}</span>
      {subtitle && <p className="text-[10px] text-[var(--text-muted)] mt-0.5 truncate">{subtitle}</p>}
    </div>
    <div className="flex-1 h-px bg-[var(--border)]" />
  </div>
);

export const AutoEditScreen = ({ module, onSave, onCancel }: AutoEditScreenProps) => {
  const [data, setData] = useState<AutoModule>({ ...module });
  const [capturingField, setCapturingField] = useState<{ key: keyof AutoModule; title: string } | null>(null);
  const [viewingDoc, setViewingDoc] = useState<{ title: string; data: string } | null>(null);
  const [picker, setPicker] = useState<'brand' | 'model' | null>(null);

  // Hidden File Input for Direct Uploads
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileTargetKey, setFileTargetKey] = useState<keyof AutoModule | null>(null);

  const set = (key: keyof AutoModule, value: any) =>
    setData(prev => ({ ...prev, [key]: value }));

  const triggerFileUpload = (key: keyof AutoModule) => {
    setFileTargetKey(key);
    fileInputRef.current?.click();
  };

  const handleDirectFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !fileTargetKey) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      set(fileTargetKey, ev.target?.result as string);
      setFileTargetKey(null);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const title = `${data.brand || ''} ${data.model || ''}`.trim() || 'Auto';
    const cleanPlate = (data.plate || '').toUpperCase().trim();

    // Check if currentKm changed compared to initial module.currentKm
    const oldKmNum = module.currentKm ? Number(String(module.currentKm).replace(/\D/g, '')) : undefined;
    const cleanNewKm = data.currentKm ? String(data.currentKm).replace(/\D/g, '') : '';
    const newKmNum = cleanNewKm ? Number(cleanNewKm) : undefined;

    let updatedKmHistory = [...(data.kmHistory || [])];
    let updatedLastKmAt = data.lastKmUpdatedAt;

    if (newKmNum !== undefined && !isNaN(newKmNum) && newKmNum !== oldKmNum) {
      updatedLastKmAt = new Date().toISOString();
      updatedKmHistory.push({
        id: `km_${Date.now()}`,
        date: new Date().toISOString(),
        km: newKmNum,
        note: 'Aggiornamento da modifica veicolo',
      });
    }

    onSave({
      ...data,
      title,
      plate: cleanPlate,
      currentKm: cleanNewKm || undefined,
      lastKmUpdatedAt: updatedLastKmAt,
      kmHistory: updatedKmHistory,
    });
  };

  const brandLogo = data.brand ? data.brand.toLowerCase().replace(/ /g, '-') : '';
  const hasLogo = CAR_BRANDS.includes(brandLogo);

  const fuelOptions: Array<{ type: FuelType; label: string; icon: React.ElementType; color: string }> = [
    { type: 'benzina', label: 'Benzina', icon: Droplets, color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' },
    { type: 'diesel', label: 'Diesel', icon: Droplets, color: 'text-blue-500 bg-blue-500/10 border-blue-500/20' },
    { type: 'ibrida', label: 'Ibrida', icon: Zap, color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' },
    { type: 'elettrica', label: 'Elettrica', icon: Zap, color: 'text-cyan-500 bg-cyan-500/10 border-cyan-500/20' },
    { type: 'gpl', label: 'GPL', icon: Flame, color: 'text-orange-500 bg-orange-500/10 border-orange-500/20' },
    { type: 'metano', label: 'Metano', icon: Flame, color: 'text-sky-500 bg-sky-500/10 border-sky-500/20' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }}
      className="max-w-2xl mx-auto h-full flex flex-col w-full overflow-hidden"
    >
      {/* Hidden File Input for Direct Uploads */}
      <input
        type="file"
        ref={fileInputRef}
        accept="application/pdf,image/*"
        className="hidden"
        onChange={handleDirectFileUpload}
      />

      {/* Top Header */}
      <div className="flex items-center justify-between gap-3 p-4 sm:p-6 pb-4 border-b border-[var(--border)] shrink-0 bg-[var(--card-bg)] rounded-3xl m-4 mb-2 shadow-xs">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onCancel}
            className="p-2.5 hover:bg-[var(--surface-variant)] border border-[var(--border)] rounded-2xl text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all cursor-pointer shrink-0"
            title="Annulla"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h2 className="text-lg sm:text-2xl font-black text-[var(--text-main)] uppercase tracking-tight leading-tight truncate">
              Modifica Veicolo
            </h2>
            <p className="text-[11px] font-semibold text-[var(--text-muted)] tracking-wider truncate">
              {data.brand || 'Nuovo Veicolo'} {data.model || ''}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => handleSubmit()}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 active:scale-95 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-md shadow-emerald-500/20 cursor-pointer shrink-0"
        >
          <Save className="w-4 h-4" />
          <span>Salva</span>
        </button>
      </div>

      {/* Main Form Scroll Area */}
      <form
        onSubmit={handleSubmit}
        className="flex-1 overflow-y-auto px-4 sm:px-6 pb-36 custom-scrollbar space-y-6 pt-2"
      >
        {/* Live Plate & Brand Hero Preview */}
        <div className="bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 rounded-3xl p-6 text-white border border-zinc-800 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-44 h-44 bg-teal-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
          
          <div className="relative z-10 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[0.25em] text-zinc-400 mb-2">Anteprima Targa & Veicolo</p>
              
              {/* Italian Plate Badge */}
              <div className="inline-flex items-center border border-zinc-400/30 rounded-lg bg-white shadow-xl h-10 px-0.5 overflow-hidden max-w-full">
                <div className="bg-blue-700 h-full px-2 flex flex-col items-center justify-center shrink-0">
                  <div className="w-2.5 h-2.5 border border-yellow-300 rounded-full opacity-90 scale-90" />
                  <span className="text-[7.5px] text-white font-black leading-none mt-0.5">I</span>
                </div>
                <span className="px-3.5 text-zinc-950 font-black font-mono text-xl sm:text-2xl tracking-[0.2em] uppercase select-none truncate">
                  {data.plate || 'AA 000 AA'}
                </span>
                <div className="bg-blue-700 h-full w-4 flex flex-col items-center justify-center shrink-0">
                  <div className="w-2 h-2 rounded-full border border-yellow-300/60" />
                </div>
              </div>

              <div className="mt-3 flex items-center gap-3">
                <span className="text-xs font-bold text-zinc-300 truncate">
                  {data.driverName || 'Intestatario non specificato'}
                </span>
                {data.registrationYear && (
                  <span className="text-[10px] font-semibold text-zinc-400 bg-white/10 px-2 py-0.5 rounded-md shrink-0">
                    Anno {data.registrationYear}
                  </span>
                )}
              </div>
            </div>

            {/* Brand Logo Container */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/10 shrink-0 car-logo-bg">
              {hasLogo ? (
                <img src={`/logo_auto/${brandLogo}.png`} alt={data.brand} className="w-10 h-10 sm:w-12 sm:h-12 object-contain" />
              ) : (
                <Car className="w-8 h-8 text-zinc-400" />
              )}
            </div>
          </div>
        </div>

        {/* ── Section 1: Anagrafica Veicolo ── */}
        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
          <SectionTitle icon={Car} label="1. Dati Principali Veicolo" subtitle="Marca, modello, targa e alimentazione" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-1.5">
                Intestatario / Conducente
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={data.driverName || ''}
                  onChange={e => set('driverName', e.target.value)}
                  placeholder="Es. Mario Rossi"
                  className={`${inputCls} pl-10`}
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-1.5">
                Marca
              </label>
              <button
                type="button"
                onClick={() => setPicker('brand')}
                className={`${inputCls} text-left flex items-center justify-between cursor-pointer`}
              >
                <span className={data.brand ? 'text-[var(--text-main)]' : 'text-[var(--text-muted)]'}>
                  {data.brand || 'Seleziona marca...'}
                </span>
                <span className="text-[10px] uppercase font-bold text-[var(--accent)]">Scegli</span>
              </button>
            </div>

            <div>
              <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-1.5">
                Modello
              </label>
              <button
                type="button"
                onClick={() => setPicker('model')}
                className={`${inputCls} text-left flex items-center justify-between cursor-pointer`}
              >
                <span className={data.model ? 'text-[var(--text-main)]' : 'text-[var(--text-muted)]'}>
                  {data.model || 'Seleziona modello...'}
                </span>
                <span className="text-[10px] uppercase font-bold text-[var(--accent)]">Scegli</span>
              </button>
            </div>

            <div>
              <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-1.5">
                Targa
              </label>
              <input
                type="text"
                value={data.plate || ''}
                onChange={e => set('plate', e.target.value.toUpperCase())}
                placeholder="Es. AB 123 CD"
                className={`${inputCls} font-mono uppercase tracking-widest text-base`}
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-1.5">
                Anno Immatricolazione
              </label>
              <input
                type="number"
                value={data.registrationYear || ''}
                onChange={e => set('registrationYear', e.target.value)}
                placeholder="Es. 2022"
                min={1970}
                max={new Date().getFullYear() + 1}
                className={inputCls}
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-1.5">
                Potenza Motore (kW)
              </label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  value={data.powerKw !== undefined ? String(data.powerKw) : ''}
                  onChange={e => set('powerKw', e.target.value.replace(/[^\d.]/g, ''))}
                  placeholder="Es. 70"
                  className={`${inputCls} pr-10 font-bold`}
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--text-muted)]">
                  kW
                </span>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-1.5">
                Classe Ambientale Euro
              </label>
              <select
                value={data.euroClass || 'Euro 6'}
                onChange={e => set('euroClass', e.target.value)}
                className={inputCls}
              >
                <option value="Euro 6">Euro 6 (Recente)</option>
                <option value="Euro 5">Euro 5</option>
                <option value="Euro 4">Euro 4</option>
                <option value="Euro 3">Euro 3</option>
                <option value="Euro 2">Euro 2</option>
                <option value="Euro 1">Euro 1</option>
                <option value="Euro 0">Euro 0</option>
              </select>
            </div>

            {/* Alimentazione Selector */}
            <div className="sm:col-span-2">
              <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-2">
                Tipo di Alimentazione
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {fuelOptions.map(fo => {
                  const Icon = fo.icon;
                  const isSelected = (data.fuelType || '').toLowerCase() === fo.type;
                  return (
                    <button
                      key={fo.type}
                      type="button"
                      onClick={() => set('fuelType', fo.type)}
                      className={`flex items-center gap-2.5 p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? `${fo.color} border-current ring-1 ring-current shadow-xs`
                          : 'bg-[var(--bg)] border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--accent)]/40 hover:text-[var(--text-main)]'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="text-xs font-bold capitalize">{fo.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ── Section 2: Chilometri & Manutenzione ── */}
        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
          <SectionTitle icon={Gauge} label="2. Chilometraggio & Tagliandi" subtitle="Monitora lo stato d'uso e la periodicità degli interventi" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-1.5">
                Chilometri Attuali (Lettura Contachilometri)
              </label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  value={data.currentKm || ''}
                  onChange={e => set('currentKm', e.target.value.replace(/\D/g, ''))}
                  placeholder="Es. 45000"
                  className={`${inputCls} font-mono font-bold text-lg pr-12`}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--text-muted)]">
                  km
                </span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">
                  Km Ultimo Tagliando
                </label>
                <div className="flex items-center gap-1.5">
                  {data.serviceDoc && (
                    <button
                      type="button"
                      onClick={() => setViewingDoc({ title: 'Fattura Tagliando', data: data.serviceDoc! })}
                      className="text-[9px] font-bold text-emerald-500 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3 h-3" /> Vedi
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => triggerFileUpload('serviceDoc')}
                    className="text-[9px] font-bold text-[var(--accent)] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Paperclip className="w-3 h-3" /> {data.serviceDoc ? 'Cambia' : 'Allega'}
                  </button>
                </div>
              </div>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  value={data.lastServiceKm || ''}
                  onChange={e => set('lastServiceKm', e.target.value.replace(/\D/g, ''))}
                  placeholder="Es. 30000"
                  className={`${inputCls} font-mono pr-10`}
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-[var(--text-muted)]">
                  km
                </span>
              </div>
              {data.lastServiceKm ? (
                <p className="text-[10px] text-teal-600 dark:text-teal-400 font-semibold mt-1 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 shrink-0" />
                  Prossimo tagliando a {(Number(String(data.lastServiceKm).replace(/\D/g, '')) + 15000).toLocaleString('it-IT')} km
                </p>
              ) : (
                <p className="text-[10px] text-[var(--text-muted)] mt-1">Intervallo standard: ogni 15.000 km</p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">
                  Km Ultimo Controllo Gomme
                </label>
                <div className="flex items-center gap-1.5">
                  {data.tireDoc && (
                    <button
                      type="button"
                      onClick={() => setViewingDoc({ title: 'Controllo Gomme', data: data.tireDoc! })}
                      className="text-[9px] font-bold text-emerald-500 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3 h-3" /> Vedi
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => triggerFileUpload('tireDoc')}
                    className="text-[9px] font-bold text-[var(--accent)] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Paperclip className="w-3 h-3" /> {data.tireDoc ? 'Cambia' : 'Allega'}
                  </button>
                </div>
              </div>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  value={data.tiresKm || ''}
                  onChange={e => set('tiresKm', e.target.value.replace(/\D/g, ''))}
                  placeholder="Es. 35000"
                  className={`${inputCls} font-mono pr-10`}
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-[var(--text-muted)]">
                  km
                </span>
              </div>
              {data.tiresKm ? (
                <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold mt-1 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 shrink-0" />
                  Prossimo controllo a {(Number(String(data.tiresKm).replace(/\D/g, '')) + 10000 + (data.tiresSuggestedOffsetKm || 0)).toLocaleString('it-IT')} km
                </p>
              ) : (
                <p className="text-[10px] text-[var(--text-muted)] mt-1">Intervallo standard: ogni 10.000 km</p>
              )}
            </div>

            <div className="sm:col-span-2">
              <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-1.5">
                Tolleranza / Estensione Gomme Opzionale (+ Km)
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={data.tiresSuggestedOffsetKm !== undefined ? String(data.tiresSuggestedOffsetKm) : ''}
                onChange={e => {
                  const cleaned = e.target.value.replace(/\D/g, '');
                  set('tiresSuggestedOffsetKm', cleaned ? Number(cleaned) : undefined);
                }}
                placeholder="Es. 2000 (aggiunge km all'intervallo)"
                className={inputCls}
              />
            </div>
          </div>
        </div>

        {/* ── Section 3: Scadenze Legali & Amministrative ── */}
        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
          <SectionTitle icon={Calendar} label="3. Scadenze & Date Amministrative" subtitle="Assicurazione, bollo, revisione e controlli tecnici" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Assicurazione */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">
                  Scadenza Assicurazione (RCA)
                </label>
                <div className="flex items-center gap-1.5">
                  {data.insuranceDoc && (
                    <button
                      type="button"
                      onClick={() => setViewingDoc({ title: 'Polizza Assicurativa', data: data.insuranceDoc! })}
                      className="text-[9px] font-bold text-emerald-500 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3 h-3" /> Vedi
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => triggerFileUpload('insuranceDoc')}
                    className="text-[9px] font-bold text-[var(--accent)] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Paperclip className="w-3 h-3" /> {data.insuranceDoc ? 'Cambia' : 'Allega'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCapturingField({ key: 'insuranceDoc', title: 'Polizza Assicurazione' })}
                    className="text-[9px] font-bold text-[var(--text-muted)] hover:text-[var(--accent)] cursor-pointer"
                    title="Scansiona fotocamera"
                  >
                    <Scan className="w-3 h-3" />
                  </button>
                </div>
              </div>
              <input
                type="date"
                value={data.lastInsurance || ''}
                onChange={e => set('lastInsurance', e.target.value)}
                className={inputCls}
              />
            </div>

            {/* Bollo */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">
                  Scadenza Bollo Auto
                </label>
                <div className="flex items-center gap-1.5">
                  {data.taxDoc && (
                    <button
                      type="button"
                      onClick={() => setViewingDoc({ title: 'Ricevuta Bollo', data: data.taxDoc! })}
                      className="text-[9px] font-bold text-emerald-500 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3 h-3" /> Vedi
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => triggerFileUpload('taxDoc')}
                    className="text-[9px] font-bold text-[var(--accent)] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Paperclip className="w-3 h-3" /> {data.taxDoc ? 'Cambia' : 'Allega'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCapturingField({ key: 'taxDoc', title: 'Ricevuta Bollo' })}
                    className="text-[9px] font-bold text-[var(--text-muted)] hover:text-[var(--accent)] cursor-pointer"
                    title="Scansiona fotocamera"
                  >
                    <Scan className="w-3 h-3" />
                  </button>
                </div>
              </div>
              <input
                type="date"
                value={data.lastTax || ''}
                onChange={e => set('lastTax', e.target.value)}
                className={inputCls}
              />
              {(() => {
                const kw = data.powerKw ? Number(String(data.powerKw).replace(/[^\d.]/g, '')) : undefined;
                if (kw !== undefined && !isNaN(kw) && kw > 0) {
                  const targetYear = data.lastTax ? new Date(data.lastTax).getFullYear() : 2026;
                  const calc = calculateBolloAuto(kw, data.euroClass || 'Euro 6', data.fuelType || 'benzina', targetYear);
                  return (
                    <div className="mt-2 p-2.5 rounded-xl bg-[var(--surface-variant)]/70 border border-[var(--border)] text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[var(--text-main)]">Stima Bollo ({targetYear}):</span>
                        <span className="font-black text-emerald-600 dark:text-emerald-400">
                          {calc.amount === 0 ? '0,00 € (Esente)' : `€ ${calc.amount.toFixed(2)}`}
                        </span>
                      </div>
                      {calc.isExempt2027 ? (
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                          <ShieldCheck className="w-3 h-3" />
                          <span>Esenzione Bollo 2027: veicolo sotto 80 kW ({kw} kW)</span>
                        </div>
                      ) : (
                        <p className="text-[10px] text-[var(--text-muted)]">
                          Tariffa ordinaria ({kw} kW {data.euroClass || 'Euro 6'}). Soglia di esenzione 2027: 80 kW.
                        </p>
                      )}
                    </div>
                  );
                }
                return (
                  <p className="text-[10px] text-[var(--text-muted)] mt-1">
                    Imposta i kW del veicolo sopra per visualizzare il calcolo del bollo e l'esenzione 2027.
                  </p>
                );
              })()}
            </div>

            {/* Revisione */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">
                  Data Ultima Revisione
                </label>
                <div className="flex items-center gap-1.5">
                  {data.revisionDoc && (
                    <button
                      type="button"
                      onClick={() => setViewingDoc({ title: 'Certificato Revisione', data: data.revisionDoc! })}
                      className="text-[9px] font-bold text-emerald-500 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3 h-3" /> Vedi
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => triggerFileUpload('revisionDoc')}
                    className="text-[9px] font-bold text-[var(--accent)] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Paperclip className="w-3 h-3" /> {data.revisionDoc ? 'Cambia' : 'Allega'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCapturingField({ key: 'revisionDoc', title: 'Certificato Revisione' })}
                    className="text-[9px] font-bold text-[var(--text-muted)] hover:text-[var(--accent)] cursor-pointer"
                    title="Scansiona fotocamera"
                  >
                    <Scan className="w-3 h-3" />
                  </button>
                </div>
              </div>
              <input
                type="date"
                value={data.lastRevision || ''}
                onChange={e => set('lastRevision', e.target.value)}
                className={inputCls}
              />
              {data.lastRevision ? (
                <p className="text-[10px] text-teal-600 dark:text-teal-400 font-semibold mt-1 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 shrink-0" />
                  Prossima scadenza calcolata: {getAutoDeadlineTargetDate('lastRevision', data.lastRevision, data)?.toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}
                </p>
              ) : (
                <p className="text-[10px] text-[var(--text-muted)] mt-1">Validità biennale (4 anni se nuova immatricolazione)</p>
              )}
            </div>

            {/* Batteria 12V */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">
                  Scadenza Batteria 12V
                </label>
                <div className="flex items-center gap-1.5">
                  {data.battery12vDoc && (
                    <button
                      type="button"
                      onClick={() => setViewingDoc({ title: 'Garanzia Batteria 12V', data: data.battery12vDoc! })}
                      className="text-[9px] font-bold text-emerald-500 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3 h-3" /> Vedi
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => triggerFileUpload('battery12vDoc')}
                    className="text-[9px] font-bold text-[var(--accent)] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Paperclip className="w-3 h-3" /> {data.battery12vDoc ? 'Cambia' : 'Allega'}
                  </button>
                </div>
              </div>
              <input
                type="date"
                value={data.battery12vExpiryDate || ''}
                onChange={e => set('battery12vExpiryDate', e.target.value)}
                className={inputCls}
              />
            </div>

            {/* Ibrida / EV Specifica */}
            {(data.fuelType === 'ibrida' || data.fuelType === 'elettrica') && (
              <div className="sm:col-span-2 p-4 bg-[var(--surface-variant)]/60 rounded-2xl border border-[var(--border)] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-500">
                    <Zap className="w-4 h-4" />
                    <span className="text-xs font-black uppercase tracking-wider">Garanzia Batteria Ibrida / Elettrica</span>
                  </div>
                  {data.hybridBatteryDoc ? (
                    <button
                      type="button"
                      onClick={() => setViewingDoc({ title: 'Garanzia Batteria Ibrida', data: data.hybridBatteryDoc! })}
                      className="text-[9px] font-bold text-emerald-500 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3 h-3" /> Documento
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => triggerFileUpload('hybridBatteryDoc')}
                      className="text-[9px] font-bold text-[var(--accent)] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Paperclip className="w-3 h-3" /> Allega File
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-1">
                      Data Scadenza Garanzia
                    </label>
                    <input
                      type="date"
                      value={data.hybridBatteryExpiryDate || ''}
                      onChange={e => set('hybridBatteryExpiryDate', e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-1">
                      Limite Km Garanzia (es. 100000)
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={data.hybridBatteryWarranty || ''}
                      onChange={e => set('hybridBatteryWarranty', e.target.value.replace(/\D/g, ''))}
                      placeholder="Es. 100000"
                      className={inputCls}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* GPL Specifica */}
            {data.fuelType === 'gpl' && (
              <div className="sm:col-span-2 p-4 bg-orange-500/5 rounded-2xl border border-orange-500/20 space-y-2">
                <div className="flex items-center gap-2 text-orange-500">
                  <Flame className="w-4 h-4" />
                  <span className="text-xs font-black uppercase tracking-wider">Bombola GPL</span>
                </div>
                <div>
                  <label className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-1">
                    Data Sostituzione Bombola (Validità 10 anni)
                  </label>
                  <input
                    type="date"
                    value={data.lastGplCylinder || ''}
                    onChange={e => set('lastGplCylinder', e.target.value)}
                    className={inputCls}
                  />
                  {data.lastGplCylinder && (
                    <p className="text-[10px] text-orange-600 dark:text-orange-400 font-semibold mt-1 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 shrink-0" />
                      Prossima sostituzione decennale: {getAutoDeadlineTargetDate('lastGplCylinder', data.lastGplCylinder, data)?.toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Metano Specifica */}
            {data.fuelType === 'metano' && (
              <div className="sm:col-span-2 p-4 bg-sky-500/5 rounded-2xl border border-sky-500/20 space-y-3">
                <div className="flex items-center gap-2 text-sky-500">
                  <Flame className="w-4 h-4" />
                  <span className="text-xs font-black uppercase tracking-wider">Bombola Metano</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-1">
                      Data Ultima Revisione Bombola
                    </label>
                    <input
                      type="date"
                      value={data.lastMethaneCylinder || ''}
                      onChange={e => set('lastMethaneCylinder', e.target.value)}
                      className={inputCls}
                    />
                    {data.lastMethaneCylinder && (
                      <p className="text-[10px] text-sky-600 dark:text-sky-400 font-semibold mt-1 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 shrink-0" />
                        Prossima revisione bombola: {getAutoDeadlineTargetDate('lastMethaneCylinder', data.lastMethaneCylinder, data)?.toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-1">
                      Omologazione
                    </label>
                    <select
                      value={data.methaneType || 'standard'}
                      onChange={e => set('methaneType', e.target.value as 'standard' | 'r110')}
                      className={inputCls}
                    >
                      <option value="standard">Standard Nazionale (4 anni)</option>
                      <option value="r110">Europea R110 (5 anni)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Section 4: Documenti Principali del Veicolo (Libretto & CDP) ── */}
        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
          <SectionTitle icon={FileText} label="4. Documenti Essenziali" subtitle="Libretto di circolazione e certificato di proprietà" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Libretto di circolazione */}
            <div className="p-4 bg-[var(--bg)] border border-[var(--border)] rounded-2xl flex flex-col justify-between">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-[var(--text-main)]">
                    Libretto di Circolazione
                  </h4>
                  <p className="text-[10px] text-[var(--text-muted)]">Documento Unico di Circolazione</p>
                </div>
                {data.librettoDoc ? (
                  <span className="px-2 py-0.5 text-[8.5px] font-black uppercase tracking-wider rounded-md bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    Presente
                  </span>
                ) : (
                  <span className="px-2 py-0.5 text-[8.5px] font-bold uppercase tracking-wider rounded-md bg-[var(--surface-variant)] text-[var(--text-muted)]">
                    Mancante
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-[var(--border)]">
                {data.librettoDoc ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setViewingDoc({ title: 'Libretto di Circolazione', data: data.librettoDoc! })}
                      className="flex-1 py-1.5 px-3 bg-[var(--card-bg)] border border-[var(--border)] rounded-xl text-xs font-bold text-[var(--text-main)] hover:bg-[var(--surface-variant)] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" /> Visualizza
                    </button>
                    <button
                      type="button"
                      onClick={() => triggerFileUpload('librettoDoc')}
                      className="p-1.5 text-[var(--text-muted)] hover:text-[var(--accent)] rounded-xl transition-colors cursor-pointer"
                      title="Carica da file"
                    >
                      <Paperclip className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setCapturingField({ key: 'librettoDoc', title: 'Libretto di Circolazione' })}
                      className="p-1.5 text-[var(--text-muted)] hover:text-[var(--accent)] rounded-xl transition-colors cursor-pointer"
                      title="Scansiona con fotocamera"
                    >
                      <Scan className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => set('librettoDoc', undefined)}
                      className="p-1.5 text-red-400 hover:text-red-500 rounded-xl transition-colors cursor-pointer"
                      title="Rimuovi"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <div className="flex items-center gap-2 w-full">
                    <button
                      type="button"
                      onClick={() => triggerFileUpload('librettoDoc')}
                      className="flex-1 py-2 px-3 bg-[var(--accent-bg)] border border-[var(--accent)]/20 rounded-xl text-xs font-bold text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Paperclip className="w-3.5 h-3.5" /> Scegli File
                    </button>
                    <button
                      type="button"
                      onClick={() => setCapturingField({ key: 'librettoDoc', title: 'Libretto di Circolazione' })}
                      className="p-2 bg-[var(--surface-variant)] hover:bg-[var(--border)] text-[var(--text-main)] rounded-xl transition-colors cursor-pointer"
                      title="Scansiona fotocamera"
                    >
                      <Scan className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Certificato di Proprietà (CDP) */}
            <div className="p-4 bg-[var(--bg)] border border-[var(--border)] rounded-2xl flex flex-col justify-between">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-[var(--text-main)]">
                    Certificato di Proprietà
                  </h4>
                  <p className="text-[10px] text-[var(--text-muted)]">CDP Digitale o Atto di vendita</p>
                </div>
                {data.cdpDoc ? (
                  <span className="px-2 py-0.5 text-[8.5px] font-black uppercase tracking-wider rounded-md bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    Presente
                  </span>
                ) : (
                  <span className="px-2 py-0.5 text-[8.5px] font-bold uppercase tracking-wider rounded-md bg-[var(--surface-variant)] text-[var(--text-muted)]">
                    Mancante
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-[var(--border)]">
                {data.cdpDoc ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setViewingDoc({ title: 'Certificato di Proprietà', data: data.cdpDoc! })}
                      className="flex-1 py-1.5 px-3 bg-[var(--card-bg)] border border-[var(--border)] rounded-xl text-xs font-bold text-[var(--text-main)] hover:bg-[var(--surface-variant)] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" /> Visualizza
                    </button>
                    <button
                      type="button"
                      onClick={() => triggerFileUpload('cdpDoc')}
                      className="p-1.5 text-[var(--text-muted)] hover:text-[var(--accent)] rounded-xl transition-colors cursor-pointer"
                      title="Carica da file"
                    >
                      <Paperclip className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setCapturingField({ key: 'cdpDoc', title: 'Certificato di Proprietà' })}
                      className="p-1.5 text-[var(--text-muted)] hover:text-[var(--accent)] rounded-xl transition-colors cursor-pointer"
                      title="Scansiona con fotocamera"
                    >
                      <Scan className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => set('cdpDoc', undefined)}
                      className="p-1.5 text-red-400 hover:text-red-500 rounded-xl transition-colors cursor-pointer"
                      title="Rimuovi"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <div className="flex items-center gap-2 w-full">
                    <button
                      type="button"
                      onClick={() => triggerFileUpload('cdpDoc')}
                      className="flex-1 py-2 px-3 bg-[var(--accent-bg)] border border-[var(--accent)]/20 rounded-xl text-xs font-bold text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Paperclip className="w-3.5 h-3.5" /> Scegli File
                    </button>
                    <button
                      type="button"
                      onClick={() => setCapturingField({ key: 'cdpDoc', title: 'Certificato di Proprietà' })}
                      className="p-2 bg-[var(--surface-variant)] hover:bg-[var(--border)] text-[var(--text-main)] rounded-xl transition-colors cursor-pointer"
                      title="Scansiona fotocamera"
                    >
                      <Scan className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Save Action Button */}
        <div className="pt-2 pb-6">
          <button
            type="submit"
            className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 active:scale-[0.99] text-white rounded-2xl font-black text-sm uppercase tracking-wider transition-all shadow-xl shadow-emerald-500/20 cursor-pointer"
          >
            Salva Modifiche Veicolo
          </button>
        </div>
      </form>

      {/* Modals & Pickers */}
      <AnimatePresence>
        {capturingField && (
          <DocumentScanner
            onCapture={(pdf) => {
              set(capturingField.key, pdf);
              setCapturingField(null);
            }}
            onClose={() => setCapturingField(null)}
          />
        )}

        {picker && (
          <BrandModelPicker
            type={picker}
            brand={data.brand}
            onSelect={(v) => {
              set(picker, v);
              if (picker === 'brand') {
                setPicker('model');
              } else {
                setPicker(null);
              }
            }}
            onClose={() => setPicker(null)}
          />
        )}

        {viewingDoc && (
          <DocumentViewer
            isOpen={!!viewingDoc}
            title={viewingDoc.title}
            data={viewingDoc.data}
            onClose={() => setViewingDoc(null)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};
