import React, { useState } from 'react';
import { ArrowLeft, Save, Car, Wrench, Calendar, Fuel, User, Hash, Gauge, FileText, Smartphone, Scan, Check, QrCode, Bell, ChevronRight, X, ShieldCheck, Edit2, Trash2 } from 'lucide-react';
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
    const list: Array<{ label: string; date: string; field: string }> = [];
    if (data.lastInsurance && isValidDate(data.lastInsurance)) list.push({ label: 'Assicurazione', date: addYears(data.lastInsurance, 1), field: 'lastInsurance' });
    if (data.lastRevision && isValidDate(data.lastRevision)) {
      list.push({ label: 'Revisione', date: getEndOfMonth(data.lastRevision, 2), field: 'lastRevision' });
    } else if (data.registrationYear && !isNaN(Number(data.registrationYear))) {
      list.push({ label: 'Prima Revisione', date: `${Number(data.registrationYear) + 4}-12-31`, field: 'registrationYear' });
    }
    if (data.lastTax && isValidDate(data.lastTax)) list.push({ label: 'Bollo', date: getEndOfMonth(data.lastTax, 1), field: 'lastTax' });
    if (data.lastGplCylinder && isValidDate(data.lastGplCylinder)) list.push({ label: 'Bombola GPL', date: addYears(data.lastGplCylinder, 10), field: 'lastGplCylinder' });
    if (data.lastMethaneCylinder && isValidDate(data.lastMethaneCylinder)) list.push({ label: 'Bombola Metano', date: addYears(data.lastMethaneCylinder, data.methaneType === 'r110' ? 5 : 4), field: 'lastMethaneCylinder' });
    if (data.battery12vExpiryDate && isValidDate(data.battery12vExpiryDate)) list.push({ label: 'Batteria 12V', date: data.battery12vExpiryDate, field: 'battery12vExpiryDate' });
    if (data.hybridBatteryExpiryDate && isValidDate(data.hybridBatteryExpiryDate)) list.push({ label: 'Batteria Ibrida', date: data.hybridBatteryExpiryDate, field: 'hybridBatteryExpiryDate' });
    
    return list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
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
                onClick={() => {
                  notificationService.requestPermission().then(granted => {
                    if (granted) {
                      notificationService.scheduleNotification(
                        'Promemoria Veicolo',
                        `Le notifiche per la tua ${data.brand} sono attive!`,
                        new Date(Date.now() + 3000)
                      );
                    }
                  });
                }}
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
                    {deadlines.map((d, i) => (
                      <div key={i} className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-5 flex items-center justify-between group hover:border-[var(--accent)] transition-all">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-[var(--bg)] rounded-xl flex items-center justify-center text-[var(--accent)] border border-[var(--border)]">
                             <Calendar className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-[var(--text-main)]">{d.label}</p>
                            <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{new Date(d.date).toLocaleDateString('it-IT')}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                           <span className="text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20 uppercase tracking-widest">Attiva</span>
                           <ChevronRight className="w-4 h-4 text-[var(--text-muted)] group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    ))}
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
                         <span className="text-[10px] font-black uppercase tracking-widest">Controllo Gomme</span>
                      </div>
                      <p className="text-2xl font-black text-[var(--text-main)]">{data.tiresKm ? Number(data.tiresKm).toLocaleString('it-IT') : '---'} <span className="text-xs font-bold opacity-50">km</span></p>
                      <p className="text-[10px] font-bold text-[var(--text-muted)] mt-2">Stato: Ottimale</p>
                   </div>
                </div>
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
                  <Field label="Scadenza Batteria 12V">
                    <input type="date" value={data.battery12vExpiryDate || ''} onChange={e => set('battery12vExpiryDate', e.target.value)} className={inputCls} />
                  </Field>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      <AnimatePresence>
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
