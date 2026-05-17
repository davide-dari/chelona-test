import React, { useState } from 'react';
import { ArrowLeft, Save, Car, Wrench, Calendar, Fuel, User, Hash, Gauge, FileText, Smartphone, Scan, Check, QrCode, Bell, ChevronRight, X, ShieldCheck, Edit2, Trash2, Plus } from 'lucide-react';
import { AutoModule } from '../types';
import { DocumentScanner } from './DocumentScanner';
import { CAR_BRANDS } from '../utils/carBrands';
import { CAR_MODELS } from '../constants/carModels';
import { BrandModelPicker } from './BrandModelPicker';
import { motion, AnimatePresence } from 'motion/react';
import { notificationService } from '../services/notificationService';

interface AutoManagementScreenProps {
  module: AutoModule;
  onSave: (updated: AutoModule) => void;
  onCancel: () => void;
  onDelete?: (id: string) => void;
  onShare?: (module: any) => void;
}

const Field = ({
  label,
  children,
  colSpan = 1,
  onAttach,
  hasDoc,
}: {
  label: string;
  children: React.ReactNode;
  colSpan?: 1 | 2;
  onAttach?: () => void;
  hasDoc?: boolean;
}) => (
  <div className={colSpan === 2 ? 'col-span-2 relative' : 'col-span-1 relative'}>
    <div className="flex items-center justify-between mb-1.5">
      <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest block">
        {label}
      </label>
      {onAttach && (
        <button 
          type="button" 
          onClick={onAttach}
          className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg border transition-all text-[9px] font-bold uppercase tracking-widest ${hasDoc ? 'bg-[var(--success-bg)] border-[var(--success)]/20 text-[var(--success)]' : 'bg-[var(--card-bg)] border-[var(--border)] text-[var(--text-muted)] hover:text-amber-600 hover:border-amber-200 shadow-sm'}`}
        >
          {hasDoc ? <Check className="w-2.5 h-2.5" /> : <Scan className="w-2.5 h-2.5" />}
          {hasDoc ? 'Documento Allegato' : 'Allega/Scan'}
        </button>
      )}
    </div>
    {children}
  </div>
);

const inputCls =
  'w-full p-4 bg-[var(--bg)] border border-[var(--border)] rounded-2xl outline-none focus:border-amber-400 transition-all text-sm font-semibold text-[var(--text-main)] placeholder:text-[var(--text-muted)]/50';

const SectionTitle = ({ icon: Icon, label }: { icon: React.ElementType; label: string }) => (
  <div className="flex items-center gap-2 mb-4 mt-8 first:mt-0">
    <div className="p-1.5 bg-[var(--accent-bg)] rounded-lg">
      <Icon className="w-3.5 h-3.5 text-[var(--accent)]" />
    </div>
    <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--accent)]">{label}</span>
    <div className="flex-1 h-px bg-[var(--border)]" />
  </div>
);

export const AutoManagementScreen = ({ module, onSave, onCancel, onDelete }: AutoManagementScreenProps) => {
  const [data, setData] = useState<AutoModule>({ ...module });
  const [capturingField, setCapturingField] = useState<{ key: keyof AutoModule; title: string } | null>(null);
  const [picker, setPicker] = useState<'brand' | 'model' | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);

  const set = (key: keyof AutoModule, value: string | undefined) =>
    setData(prev => ({ ...prev, [key]: value }));

  const handleSubmit = () => {
    const title = `${data.brand || ''} ${data.model || ''}`.trim() || 'Auto';
    onSave({ ...data, title, lastKmUpdatedAt: new Date().toISOString() });
    setIsEditing(false);
  };

  const brandLogo = data.brand ? data.brand.toLowerCase().replace(/ /g, '-') : '';
  const hasLogo = CAR_BRANDS.includes(brandLogo);

  const isValidDate = (dateStr: any) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    return !isNaN(d.getTime());
  };

  const addYears = (dateStr: string, years: number) => {
    if (!isValidDate(dateStr)) return '';
    const d = new Date(dateStr);
    d.setFullYear(d.getFullYear() + years);
    try { return d.toISOString().split('T')[0]; } catch(e) { return ''; }
  };

  const getEndOfMonth = (dateStr: string, years: number) => {
    if (!isValidDate(dateStr)) return '';
    const d = new Date(dateStr);
    d.setFullYear(d.getFullYear() + years);
    const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    try { return endOfMonth.toISOString().split('T')[0]; } catch(e) { return ''; }
  };

  const deadlines = (() => {
    const list: Array<{ label: string; date: string; field: string; daysLeft: number }> = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const addDeadline = (label: string, dateStr: string | undefined, field: string) => {
      if (!dateStr || !isValidDate(dateStr)) return;
      const d = new Date(dateStr);
      d.setHours(0, 0, 0, 0);
      const daysLeft = Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      list.push({ label, date: dateStr, field, daysLeft });
    };

    addDeadline('Assicurazione', data.lastInsurance, 'lastInsurance');
    addDeadline('Bollo', data.lastTax, 'lastTax');
    addDeadline('Revisione', data.lastRevision, 'lastRevision');
    addDeadline('Batteria 12V', data.battery12vExpiryDate, 'battery12vExpiryDate');
    addDeadline('Batteria Ibrida (revisione)', data.hybridBatteryExpiryDate, 'hybridBatteryExpiryDate');
    addDeadline('Garanzia Batteria Ibrida', data.hybridBatteryWarrantyDate, 'hybridBatteryWarrantyDate');
    addDeadline('Bombola GPL', data.lastGplCylinder, 'lastGplCylinder');
    addDeadline('Bombola Metano', data.lastMethaneCylinder, 'lastMethaneCylinder');

    // Prima revisione calcolata da anno di immatricolazione se non c'è data revisione
    if (!data.lastRevision && data.registrationYear && !isNaN(Number(data.registrationYear))) {
      const firstRevYear = Number(data.registrationYear) + 4;
      const firstRevDate = `${firstRevYear}-12-31`;
      const d = new Date(firstRevDate);
      d.setHours(0, 0, 0, 0);
      const daysLeft = Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      list.push({ label: 'Prima Revisione', date: firstRevDate, field: 'registrationYear', daysLeft });
    }

    return list.filter(a => a.daysLeft <= 30).sort((a, b) => a.daysLeft - b.daysLeft);
  })();

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="fixed inset-0 z-[150] bg-[var(--bg)] flex flex-col"
    >
      {/* Top Header */}
      <div className="bg-[var(--card-bg)] border-b border-[var(--border)] px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onCancel} className="p-2 hover:bg-[var(--surface-variant)] rounded-xl transition-colors">
            <ArrowLeft className="w-6 h-6 text-[var(--text-main)]" />
          </button>
          <div>
            <h2 className="text-lg font-black text-[var(--text-main)] uppercase tracking-tight leading-none">
              {data.brand} {data.model}
            </h2>
            <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mt-1">
              Gestione Veicolo
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
           {onDelete && (
             <button 
               onClick={() => { if(window.confirm('Eliminare definitivamente questo veicolo?')) { onDelete(module.id); onCancel(); } }}
               className="p-2.5 text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
               title="Elimina"
             >
               <Trash2 className="w-5 h-5" />
             </button>
           )}
           {!isEditing ? (
             <button 
               onClick={() => setIsEditing(true)}
               className="px-4 py-2 bg-[var(--accent-bg)] text-[var(--accent)] border border-[var(--accent)]/20 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-[var(--accent)] hover:text-white transition-all"
             >
               Modifica
             </button>
           ) : (
             <button 
               onClick={handleSubmit}
               className="px-4 py-2 bg-emerald-500 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
             >
               Salva
             </button>
           )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-2xl mx-auto p-6 space-y-8">
          
          {/* Hero Section (Card Style) */}
          <div className="bg-gradient-to-br from-zinc-900 to-zinc-800 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl border border-white/5">
             <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl" />
             <div className="relative z-10 flex items-start justify-between">
               <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-1">Dettagli Targa</p>
                  <div className="inline-flex items-center border border-white/20 rounded-lg bg-white/10 backdrop-blur-md px-3 py-1.5 gap-3 shadow-lg">
                    <div className="w-1.5 h-6 bg-blue-600 rounded-sm" />
                    <span className="text-2xl font-black font-mono tracking-[0.2em]">{data.plate || '---'}</span>
                    <div className="w-1.5 h-6 bg-blue-600 rounded-sm" />
                  </div>
                  <div className="mt-6 space-y-1">
                    <p className="text-sm font-bold text-white/80">{data.driverName || 'Nessun intestatario'}</p>
                    <p className="text-[10px] font-medium text-white/40 uppercase tracking-widest">Registrata nel {data.registrationYear || '---'}</p>
                  </div>
               </div>
               <div className="w-20 h-20 bg-white/10 backdrop-blur-xl rounded-3xl flex items-center justify-center border border-white/10">
                 {hasLogo ? (
                   <img src={`/logo_auto/${brandLogo}.png`} alt={data.brand} className="w-12 h-12 object-contain" />
                 ) : (
                   <Car className="w-8 h-8 text-white/50" />
                 )}
               </div>
             </div>
             
             {/* Simple Stats Row */}
             <div className="mt-10 flex gap-6">
                <div>
                   <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1">Chilometri</p>
                   <p className="text-xl font-black text-white">{Number(data.currentKm || 0).toLocaleString('it-IT')} <span className="text-xs font-bold opacity-50">km</span></p>
                </div>
                <div>
                   <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1">Alimentazione</p>
                   <p className="text-xl font-black text-white capitalize">{data.fuelType}</p>
                </div>
             </div>
          </div>

          {/* Quick Actions Bar */}
          <div className="grid grid-cols-2 gap-4">
             <button 
               onClick={() => onShare?.(module)}
               className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-4 flex items-center justify-center gap-3 hover:bg-[var(--surface-variant)] transition-all group active:scale-95"
             >
                <QrCode className="w-5 h-5 text-[var(--accent)] group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold text-[var(--text-main)] uppercase tracking-widest">Condividi</span>
             </button>
             <button 
                onClick={() => setShowNotifMenu(true)}
               className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-4 flex items-center justify-center gap-3 hover:bg-[var(--surface-variant)] transition-all group active:scale-95"
             >
                <Bell className="w-5 h-5 text-amber-500 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold text-[var(--text-main)] uppercase tracking-widest">Notifiche</span>
             </button>
          </div>

          {!isEditing ? (
            <div className="space-y-8 animate-fade-in">
              {/* Deadline Summary */}
              {deadlines.length > 0 && (
                <div>
                  <SectionTitle icon={Calendar} label="Prossime Scadenze" />
                  <div className="space-y-3">
                    {deadlines.map((d, i) => {
                      const isExpired = d.daysLeft < 0;
                      const isUrgent = d.daysLeft >= 0 && d.daysLeft <= 30;
                      const statusColor = isExpired
                        ? 'text-red-500 bg-red-500/10 border-red-500/20'
                        : isUrgent
                        ? 'text-amber-500 bg-amber-500/10 border-amber-500/20'
                        : 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
                      const statusLabel = isExpired
                        ? 'Scaduta'
                        : isUrgent
                        ? `${d.daysLeft}gg`
                        : 'Attiva';

                      return (
                        <div key={i} className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-5 flex items-center justify-between group hover:border-[var(--accent)] transition-all">
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${statusColor}`}>
                               <Calendar className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-[var(--text-main)]">{d.label}</p>
                              <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{new Date(d.date).toLocaleDateString('it-IT')}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                             <span className={`text-[10px] font-black px-2 py-1 rounded-lg border uppercase tracking-widest ${statusColor}`}>{statusLabel}</span>
                             <ChevronRight className="w-4 h-4 text-[var(--text-muted)] group-hover:translate-x-1 transition-transform" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Maintenance View */}
              <div>
                <SectionTitle icon={Wrench} label="Stato Manutenzione" />
                <div className="grid grid-cols-2 gap-4">
                   <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-3xl p-6 shadow-sm">
                      <div className="flex items-center gap-2 text-rose-500 mb-3">
                         <Gauge className="w-4 h-4" />
                         <span className="text-[10px] font-black uppercase tracking-widest">Ultimo Tagliando</span>
                      </div>
                      <p className="text-2xl font-black text-[var(--text-main)]">{data.lastServiceKm ? Number(data.lastServiceKm).toLocaleString('it-IT') : '---'} <span className="text-xs font-bold opacity-50">km</span></p>
                      <p className="text-[10px] font-bold text-[var(--text-muted)] mt-2">Prossimo suggerito: {data.lastServiceKm ? (Number(data.lastServiceKm) + 15000).toLocaleString('it-IT') : '---'} km</p>
                   </div>
                   <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-3xl p-6 shadow-sm">
                       <div className="flex items-center gap-2 text-indigo-500 mb-3">
                          <ShieldCheck className="w-4 h-4" />
                          <span className="text-[10px] font-black uppercase tracking-widest flex-1">Controllo Gomme</span>
                       </div>
                       <p className="text-2xl font-black text-[var(--text-main)]">{data.tiresKmSnoozeUntil ? Number(data.tiresKmSnoozeUntil).toLocaleString('it-IT') : (data.tiresKm ? Number(data.tiresKm).toLocaleString('it-IT') : '---')} <span className="text-xs font-bold opacity-50">km</span></p>
                       <p className="text-[10px] font-bold text-[var(--text-muted)] mt-1">
                         {data.tiresKmSnoozeUntil ? 'Prossimo controllo posticipato' : 'Km ultimo controllo gommista'}
                       </p>
                       {/* Tasto: gommista ha detto OK → posticipa il controllo di 10.000 km */}
                       <button
                         onClick={() => {
                           const base = Number(data.tiresKmSnoozeUntil || data.tiresKm || data.currentKm || 0);
                           const next = base + 10000;
                           setData(prev => ({ ...prev, tiresKmSnoozeUntil: String(next) }));
                         }}
                         className="mt-3 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 rounded-xl hover:bg-indigo-500 hover:text-white active:scale-95 transition-all"
                       >
                         <Plus className="w-3 h-3" />
                         +10.000 km (gommista OK)
                       </button>
                    </div>
                </div>
                {(data.fuelType === 'ibrida' || data.fuelType === 'elettrica') && (
                  <div className="grid grid-cols-1 mt-4">
                     <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-3xl p-6 shadow-sm">
                        <div className="flex items-center gap-2 text-emerald-500 mb-4">
                           <Gauge className="w-4 h-4" />
                           <span className="text-[10px] font-black uppercase tracking-widest">Batteria Ibrida / EV</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-xl font-black text-[var(--text-main)]">
                              {data.hybridBatteryExpiryDate ? new Date(data.hybridBatteryExpiryDate).toLocaleDateString('it-IT') : '---'}
                            </p>
                            <p className="text-[10px] font-bold text-[var(--text-muted)] mt-1 uppercase tracking-widest">Data Scadenza</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-black text-[var(--text-main)]">
                              {data.hybridBatteryWarranty || '---'}
                            </p>
                            <p className="text-[10px] font-bold text-[var(--text-muted)] mt-1 uppercase tracking-widest">Garanzia / Km</p>
                          </div>
                        </div>
                     </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="animate-fade-in pb-20">
              <SectionTitle icon={Edit2} label="Editor Veicolo" />
              <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-3xl p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Intestatario" colSpan={2}>
                    <input type="text" value={data.driverName || ''} onChange={e => set('driverName', e.target.value)} placeholder="Es. Mario Rossi" className={inputCls} />
                  </Field>
                  <Field label="Marca">
                    <button type="button" onClick={() => setPicker('brand')} className={`${inputCls} text-left`}>{data.brand || 'Seleziona...'}</button>
                  </Field>
                  <Field label="Modello">
                    <button type="button" onClick={() => setPicker('model')} className={`${inputCls} text-left`}>{data.model || 'Seleziona...'}</button>
                  </Field>
                  <Field label="Targa">
                    <input type="text" value={data.plate || ''} onChange={e => set('plate', e.target.value.toUpperCase())} placeholder="Es. AB 123 CD" className={`${inputCls} font-mono uppercase`} />
                  </Field>
                  <Field label="Alimentazione">
                    <select 
                      value={data.fuelType} 
                      onChange={e => set('fuelType', e.target.value as FuelType)} 
                      className={inputCls}
                    >
                      <option value="benzina">Benzina</option>
                      <option value="diesel">Diesel</option>
                      <option value="gpl">GPL</option>
                      <option value="metano">Metano</option>
                      <option value="ibrida">Ibrida</option>
                      <option value="elettrica">Elettrica</option>
                    </select>
                  </Field>
                  <Field label="Anno Immatricolazione">
                    <input type="number" value={data.registrationYear || ''} onChange={e => set('registrationYear', e.target.value)} placeholder="Es. 2021" className={inputCls} />
                  </Field>
                  <Field label="Km Attuali">
                    <input type="text" inputMode="numeric" value={data.currentKm || ''} onChange={e => set('currentKm', e.target.value.replace(/\D/g, ''))} placeholder="Es. 45000" className={inputCls} />
                  </Field>
                  <Field label="Km Ultimo Tagliando">
                    <input type="text" inputMode="numeric" value={data.lastServiceKm || ''} onChange={e => set('lastServiceKm', e.target.value.replace(/\D/g, ''))} placeholder="Es. 30000" className={inputCls} />
                  </Field>
                  <Field label="Km Ultimo Cambio Gomme">
                    <input type="text" inputMode="numeric" value={data.tiresKm || ''} onChange={e => set('tiresKm', e.target.value.replace(/\D/g, ''))} placeholder="Es. 15000" className={inputCls} />
                  </Field>
                  <Field label="Scadenza Assicurazione">
                    <input type="date" value={data.lastInsurance || ''} onChange={e => set('lastInsurance', e.target.value)} className={inputCls} />
                  </Field>
                  <Field label="Scadenza Bollo">
                    <input type="date" value={data.lastTax || ''} onChange={e => set('lastTax', e.target.value)} className={inputCls} />
                  </Field>
                  <Field label="Scadenza Revisione">
                    <input type="date" value={data.lastRevision || ''} onChange={e => set('lastRevision', e.target.value)} className={inputCls} />
                  </Field>
                  <Field label="Garanzia e Scadenza Batteria 12V" colSpan={2}>
                    <div className="flex gap-2">
                      <input type="text" value={data.battery12vWarranty || ''} onChange={e => set('battery12vWarranty', e.target.value)} placeholder="Es. Garanzia fino al 2027" className={`flex-1 ${inputCls}`} />
                      <input type="date" value={data.battery12vExpiryDate || ''} onChange={e => set('battery12vExpiryDate', e.target.value)} className={`w-40 ${inputCls}`} />
                    </div>
                  </Field>
                  {(data.fuelType === 'ibrida' || data.fuelType === 'elettrica') && (
                    <Field label="Batteria Ibrida / EV" colSpan={2}>
                      <div className="flex flex-col gap-2">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={data.hybridBatteryWarranty || ''}
                          onChange={e => set('hybridBatteryWarranty', e.target.value.replace(/\D/g, ''))}
                          placeholder="Km prossimo controllo batteria (es. 99180)"
                          className={inputCls}
                        />
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest whitespace-nowrap">Scad. Revisione:</span>
                          <input type="date" value={data.hybridBatteryExpiryDate || ''} onChange={e => set('hybridBatteryExpiryDate', e.target.value)} className={`flex-1 ${inputCls}`} />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest whitespace-nowrap">Scad. Garanzia:</span>
                          <input type="date" value={data.hybridBatteryWarrantyDate || ''} onChange={e => set('hybridBatteryWarrantyDate', e.target.value)} className={`flex-1 ${inputCls}`} />
                        </div>
                      </div>
                    </Field>
                  )}
                  {data.fuelType === 'gpl' && (
                    <Field label="Scadenza Bombola GPL">
                      <input type="date" value={data.lastGplCylinder || ''} onChange={e => set('lastGplCylinder', e.target.value)} className={inputCls} />
                    </Field>
                  )}
                  {data.fuelType === 'metano' && (
                    <>
                      <Field label="Scadenza Bombola Metano">
                        <input type="date" value={data.lastMethaneCylinder || ''} onChange={e => set('lastMethaneCylinder', e.target.value)} className={inputCls} />
                      </Field>
                      <Field label="Omologazione Bombola" colSpan={2}>
                        <select value={data.methaneType || 'standard'} onChange={e => set('methaneType', e.target.value)} className={inputCls}>
                          <option value="standard">Standard (4 anni)</option>
                          <option value="r110">Europea R110 (5 anni)</option>
                        </select>
                      </Field>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      <AnimatePresence>
        {showNotifMenu && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-6"
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setShowNotifMenu(false)} />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-[var(--card-bg)] rounded-[2rem] p-6 w-full max-w-sm border border-[var(--border)] shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center">
                       <Bell className="w-5 h-5 text-amber-500" />
                    </div>
                    <h3 className="text-lg font-black text-[var(--text-main)]">Imposta Notifica</h3>
                 </div>
                 <button onClick={() => setShowNotifMenu(false)} className="p-2 hover:bg-[var(--surface-variant)] rounded-xl transition-colors">
                    <X className="w-5 h-5 text-[var(--text-muted)]" />
                 </button>
              </div>
              <div className="space-y-3">
                 <button 
                   onClick={() => {
                     notificationService.requestPermission().then(granted => {
                       if (granted) {
                         let scheduled = 0;
                         const allDeadlines: any[] = [];
                         const today = new Date();
                         today.setHours(0, 0, 0, 0);
                         const addD = (lbl: string, dt: string|undefined) => { if (dt) allDeadlines.push({label: lbl, date: dt}) };
                         addD('Assicurazione', data.lastInsurance);
                         addD('Bollo', data.lastTax);
                         addD('Revisione', data.lastRevision);
                         addD('Batteria 12V', data.battery12vExpiryDate);
                         addD('Batteria Ibrida', data.hybridBatteryExpiryDate);
                         addD('Bombola GPL', data.lastGplCylinder);
                         addD('Bombola Metano', data.lastMethaneCylinder);
                         allDeadlines.forEach(d => {
                            const nd = new Date(d.date);
                            if (nd.getTime() > today.getTime()) {
                               nd.setHours(9, 0, 0, 0);
                               notificationService.scheduleNotification('Scadenza Veicolo', `La scadenza ${d.label} per la tua ${data.brand} è il ${nd.toLocaleDateString('it-IT')}!`, nd);
                               scheduled++;
                            }
                         });
                         alert(scheduled > 0 ? `Programmate ${scheduled} notifiche temporali.` : 'Nessuna scadenza futura trovata.');
                         setShowNotifMenu(false);
                       }
                     });
                   }}
                   className="w-full flex items-center gap-3 p-4 bg-[var(--bg)] border border-[var(--border)] hover:border-amber-400 rounded-2xl transition-all text-left group"
                 >
                    <Calendar className="w-5 h-5 text-blue-500 group-hover:scale-110 transition-transform" />
                    <div>
                       <p className="text-sm font-bold text-[var(--text-main)]">Scadenze Temporali</p>
                       <p className="text-[10px] font-medium text-[var(--text-muted)] mt-0.5">Bollo, assicurazione, revisione...</p>
                    </div>
                 </button>

                 <button 
                   onClick={() => {
                     notificationService.requestPermission().then(granted => {
                       if (granted) {
                         const nd = new Date();
                         nd.setMonth(nd.getMonth() + 6);
                         nd.setHours(9, 0, 0, 0);
                         notificationService.scheduleNotification('Controllo KM', `Ricordati di controllare i KM della tua ${data.brand} per eventuale tagliando o gomme!`, nd);
                         alert(`Promemoria KM programmato per il ${nd.toLocaleDateString('it-IT')}.`);
                         setShowNotifMenu(false);
                       }
                     });
                   }}
                   className="w-full flex items-center gap-3 p-4 bg-[var(--bg)] border border-[var(--border)] hover:border-amber-400 rounded-2xl transition-all text-left group"
                 >
                    <Gauge className="w-5 h-5 text-emerald-500 group-hover:scale-110 transition-transform" />
                    <div>
                       <p className="text-sm font-bold text-[var(--text-main)]">Manutenzione (Km)</p>
                       <p className="text-[10px] font-medium text-[var(--text-muted)] mt-0.5">Promemoria tra 6 mesi per controlli</p>
                    </div>
                 </button>
              </div>
            </motion.div>
          </motion.div>
        )}
        {capturingField && (
          <DocumentScanner
            onCapture={(pdf) => {
              set(capturingField.key as keyof AutoModule, pdf);
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
               if (picker === 'brand') setPicker('model');
               else setPicker(null);
            }}
            onClose={() => setPicker(null)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};
