import React, { useState } from 'react';
import { ArrowLeft, Save, Car, Wrench, Calendar, Fuel, User, Hash, Gauge, FileText, Smartphone, Scan, Check } from 'lucide-react';
import { AutoModule } from '../types';
import { DocumentScanner } from './DocumentScanner';
import { CAR_BRANDS } from '../utils/carBrands';
import { CAR_MODELS } from '../constants/carModels';
import { BrandModelPicker } from './BrandModelPicker';
import { motion, AnimatePresence } from 'motion/react';

interface AutoEditScreenProps {
  module: AutoModule;
  onSave: (updated: AutoModule) => void;
  onCancel: () => void;
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
  'w-full p-3.5 bg-[var(--bg)] border border-[var(--border)] rounded-2xl outline-none focus:border-amber-400 transition-all text-sm font-semibold text-[var(--text-main)] placeholder:text-[var(--text-muted)]/50';

const SectionTitle = ({ icon: Icon, label }: { icon: React.ElementType; label: string }) => (
  <div className="flex items-center gap-2 mb-4 mt-8 first:mt-0">
    <div className="p-1.5 bg-[var(--accent-bg)] rounded-lg">
      <Icon className="w-3.5 h-3.5 text-[var(--accent)]" />
    </div>
    <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--accent)]">{label}</span>
    <div className="flex-1 h-px bg-[var(--border)]" />
  </div>
);

export const AutoEditScreen = ({ module, onSave, onCancel }: AutoEditScreenProps) => {
  const [data, setData] = useState<AutoModule>({ ...module });
  const [capturingField, setCapturingField] = useState<{ key: keyof AutoModule; title: string } | null>(null);
  const [picker, setPicker] = useState<'brand' | 'model' | null>(null);

  const set = (key: keyof AutoModule, value: string | undefined) =>
    setData(prev => ({ ...prev, [key]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const title = `${data.brand || ''} ${data.model || ''}`.trim() || 'Auto';
    onSave({ ...data, title, lastKmUpdatedAt: new Date().toISOString() });
  };

  // Car models autocomplete
  const modelOptions: string[] =
    data.brand
      ? (CAR_MODELS[data.brand] ||
          CAR_MODELS[
            Object.keys(CAR_MODELS).find(
              b => b.toLowerCase() === data.brand?.toLowerCase()
            ) ?? ''
          ] ||
          [])
      : [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 24 }}
      className="max-w-2xl mx-auto h-full flex flex-col w-full"
    >
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          type="button"
          onClick={onCancel}
          className="p-2.5 hover:bg-[var(--card-bg)] border border-[var(--border)] rounded-xl text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-[var(--text-main)] leading-tight">
            Modifica Auto
          </h2>
          <p className="text-xs text-[var(--text-muted)] font-medium mt-0.5">
            {data.brand} {data.model} {data.plate ? `· ${data.plate}` : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={handleSubmit}
          className="flex items-center gap-2 px-5 py-3 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white rounded-2xl font-bold text-sm transition-all shadow-lg shadow-amber-500/20"
        >
          <Save className="w-4 h-4" />
          Salva
        </button>
      </div>

      {/* Form body */}
      <form
        onSubmit={handleSubmit}
        className="flex-1 overflow-y-auto pb-48 custom-scrollbar space-y-0"
      >
        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-3xl p-6 shadow-sm space-y-0">

          {/* ── Anagrafica ── */}
          <SectionTitle icon={Car} label="Anagrafica" />
          <div className="grid grid-cols-2 gap-4">
            <Field label="Intestatario" colSpan={2}>
              <input
                type="text"
                value={data.driverName || ''}
                onChange={e => set('driverName', e.target.value)}
                placeholder="Es. Mario Rossi"
                className={inputCls}
              />
            </Field>

            <Field label="Marca">
              <button
                type="button"
                onClick={() => setPicker('brand')}
                className={`${inputCls} text-left flex justify-between items-center`}
              >
                {data.brand || 'Seleziona...'}
              </button>
            </Field>

            <Field label="Modello">
              <button
                type="button"
                onClick={() => setPicker('model')}
                className={`${inputCls} text-left flex justify-between items-center`}
              >
                {data.model || 'Seleziona...'}
              </button>
            </Field>

            <Field label="Targa">
              <input
                type="text"
                value={data.plate || ''}
                onChange={e => set('plate', e.target.value.toUpperCase())}
                placeholder="Es. AB 123 CD"
                className={`${inputCls} font-mono tracking-widest uppercase`}
              />
            </Field>

            <Field label="Anno Immatricolazione">
              <input
                type="number"
                value={data.registrationYear || ''}
                onChange={e => set('registrationYear', e.target.value)}
                placeholder="Es. 2021"
                min={1970}
                max={new Date().getFullYear() + 1}
                className={inputCls}
              />
            </Field>

            <Field label="Alimentazione" colSpan={2}>
              <select
                value={data.fuelType || ''}
                onChange={e => set('fuelType', e.target.value)}
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

            <Field label="Km Attuali" colSpan={2}>
              <input
                type="text"
                inputMode="numeric"
                value={data.currentKm ? Number(data.currentKm).toLocaleString('it-IT') : ''}
                onChange={e => set('currentKm', e.target.value.replace(/\\D/g, ''))}
                placeholder="Es. 45.000"
                className={inputCls}
              />
            </Field>
          </div>

          {/* ── Scadenze ── */}
          <SectionTitle icon={Calendar} label="Scadenze" />
          <div className="grid grid-cols-2 gap-4">
            <Field label="Scadenza Assicurazione" onAttach={() => setCapturingField({ key: 'insuranceDoc', title: 'Assicurazione' })} hasDoc={!!data.insuranceDoc}>
              <input
                type="date"
                value={data.lastInsurance || ''}
                onChange={e => set('lastInsurance', e.target.value)}
                className={inputCls}
              />
            </Field>

            <Field label="Scadenza Prossimo Bollo" onAttach={() => setCapturingField({ key: 'taxDoc', title: 'Bollo Auto' })} hasDoc={!!data.taxDoc}>
              <input
                type="date"
                value={data.lastTax || ''}
                onChange={e => set('lastTax', e.target.value)}
                className={inputCls}
              />
            </Field>

            <Field label="Data Ultima Revisione" colSpan={2} onAttach={() => setCapturingField({ key: 'revisionDoc', title: 'Revisione' })} hasDoc={!!data.revisionDoc}>
              <input
                type="date"
                value={data.lastRevision || ''}
                onChange={e => set('lastRevision', e.target.value)}
                className={inputCls}
              />
            </Field>
          </div>

          {/* ── Manutenzione ── */}
          <SectionTitle icon={Wrench} label="Manutenzione" />
          <div className="grid grid-cols-2 gap-4">
            <Field label="Km Ultimo Tagliando" onAttach={() => setCapturingField({ key: 'serviceDoc', title: 'Tagliando' })} hasDoc={!!data.serviceDoc}>
              <input
                type="text"
                inputMode="numeric"
                value={data.lastServiceKm ? Number(data.lastServiceKm).toLocaleString('it-IT') : ''}
                onChange={e => set('lastServiceKm', e.target.value.replace(/\\D/g, ''))}
                placeholder="Es. 30.000"
                className={inputCls}
              />
            </Field>

            <Field label="Km Ultimo Controllo Gomme" onAttach={() => setCapturingField({ key: 'tireDoc', title: 'Controllo Gomme' })} hasDoc={!!data.tireDoc}>
              <input
                type="text"
                inputMode="numeric"
                value={data.tiresKm ? Number(data.tiresKm).toLocaleString('it-IT') : ''}
                onChange={e => set('tiresKm', e.target.value.replace(/\\D/g, ''))}
                placeholder="Es. 40.000"
                className={inputCls}
              />
            </Field>

            <Field label="Garanzia/Scadenza Batteria 12v" colSpan={2} onAttach={() => setCapturingField({ key: 'battery12vDoc', title: 'Batteria 12v' })} hasDoc={!!data.battery12vDoc}>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={data.battery12vWarranty || ''}
                  onChange={e => set('battery12vWarranty', e.target.value)}
                  placeholder="Es. Garanzia fino al 2027"
                  className="flex-1 p-3.5 bg-[var(--bg)] border border-[var(--border)] rounded-2xl outline-none focus:border-amber-400 transition-all text-sm font-semibold text-[var(--text-main)] placeholder:text-[var(--text-muted)]/50"
                />
                <input
                  type="date"
                  value={data.battery12vExpiryDate || ''}
                  onChange={e => set('battery12vExpiryDate', e.target.value)}
                  className="w-40 p-3.5 bg-[var(--bg)] border border-[var(--border)] rounded-2xl outline-none focus:border-amber-400 transition-all text-sm font-semibold text-[var(--text-main)]"
                />
              </div>
            </Field>

            {(data.fuelType === 'ibrida' || data.fuelType === 'elettrica') && (
              <Field label="Batteria Ibrida / EV (Km e Scadenza)" colSpan={2} onAttach={() => setCapturingField({ key: 'hybridBatteryDoc', title: 'Batteria Ibrida' })} hasDoc={!!data.hybridBatteryDoc}>
                <div className="flex flex-col gap-2">
                  <input
                    type="text"
                    value={data.hybridBatteryWarranty || ''}
                    onChange={e => set('hybridBatteryWarranty', e.target.value)}
                    placeholder="Es. Km per prossimo controllo (es. 99180)"
                    className="w-full p-3.5 bg-[var(--bg)] border border-[var(--border)] rounded-2xl outline-none focus:border-amber-400 transition-all text-sm font-semibold text-[var(--text-main)] placeholder:text-[var(--text-muted)]/50"
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest whitespace-nowrap">Prossima Scadenza:</span>
                    <input
                        type="date"
                        value={data.hybridBatteryExpiryDate || ''}
                        onChange={e => set('hybridBatteryExpiryDate', e.target.value)}
                        className="flex-1 p-3.5 bg-[var(--bg)] border border-[var(--border)] rounded-2xl outline-none focus:border-amber-400 transition-all text-sm font-semibold text-[var(--text-main)]"
                    />
                  </div>
                </div>
              </Field>
            )}

            {data.fuelType === 'gpl' && (
              <Field label="Data Installazione Bombola GPL" colSpan={2}>
                <input
                  type="date"
                  value={data.lastGplCylinder || ''}
                  onChange={e => set('lastGplCylinder', e.target.value)}
                  className={inputCls}
                />
              </Field>
            )}

            {data.fuelType === 'metano' && (
              <>
                <Field label="Ultima Revisione Bombola Metano">
                  <input
                    type="date"
                    value={data.lastMethaneCylinder || ''}
                    onChange={e => set('lastMethaneCylinder', e.target.value)}
                    className={inputCls}
                  />
                </Field>
                <Field label="Omologazione Bombola">
                  <select
                    value={data.methaneType || 'standard'}
                    onChange={e => set('methaneType', e.target.value)}
                    className={inputCls}
                  >
                    <option value="standard">Standard (4 anni)</option>
                    <option value="r110">Europea R110 (5 anni)</option>
                  </select>
                </Field>
              </>
            )}
          </div>
        </div>

        {/* Bottom save button (mobile comfort) */}
        <div className="pt-6">
          <button
            type="submit"
            className="w-full py-4 bg-gradient-to-tr from-amber-500 to-amber-400 hover:from-amber-600 hover:to-amber-500 text-white rounded-2xl font-bold text-base transition-all shadow-xl shadow-amber-500/20 hover:scale-[1.01] active:scale-[0.99]"
          >
            Salva Modifiche
          </button>
        </div>
      </form>

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
               setPicker(null);
               // auto open model picker if brand is selected
               if (picker === 'brand') setTimeout(() => setPicker('model'), 300);
            }}
            onClose={() => setPicker(null)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};
