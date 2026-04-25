import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Search, ChevronRight, Car, Plus } from 'lucide-react';
import { CAR_BRANDS } from '../utils/carBrands';
import { CAR_MODELS } from '../constants/carModels';

interface BrandModelPickerProps {
  type: 'brand' | 'model';
  brand?: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}

export const BrandModelPicker = ({ type, brand, onSelect, onClose }: BrandModelPickerProps) => {
  const [search, setSearch] = useState('');

  // Clear search when type changes to prevent carrying over search from brand to model
  useEffect(() => {
    setSearch('');
  }, [type]);

  const options = useMemo(() => {
    if (type === 'brand') return CAR_BRANDS;
    if (type === 'model') {
      if (!brand) return [];
      const m = CAR_MODELS[brand] || 
             CAR_MODELS[Object.keys(CAR_MODELS).find(b => b.toLowerCase() === brand?.toLowerCase()) || ''] || 
             [];
      return m;
    }
    return [];
  }, [type, brand]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return options.filter(o => o.toLowerCase().includes(q));
  }, [options, search]);

  return (
    <div className="fixed inset-0 z-[200] flex flex-col justify-end">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
      />
      
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="relative bg-[var(--card-bg)] border-t border-[var(--border)] rounded-t-[2.5rem] flex flex-col h-[85dvh] shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between p-6 pb-4 shrink-0 bg-gradient-to-b from-[var(--card-bg)] to-[var(--card-bg)]/80 relative z-10">
          <div>
            <h3 className="text-2xl font-black text-[var(--text-main)] tracking-tight">
              {type === 'brand' ? 'Seleziona Marca' : `Modello ${brand || ''}`}
            </h3>
            <p className="text-[10px] uppercase font-black tracking-widest text-[var(--accent)] mt-1">Scegli dalla lista</p>
          </div>
          <button onClick={onClose} className="p-3 bg-[var(--surface-variant)] hover:bg-[var(--border)] rounded-full text-[var(--text-muted)] transition-colors active:scale-95">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 pb-4 shrink-0 relative z-10">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)] group-focus-within:text-[var(--accent)] transition-colors" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cerca..."
              className="w-full pl-12 pr-4 py-4 bg-[var(--bg)] border-2 border-[var(--border)] rounded-2xl outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/10 font-bold text-[var(--text-main)] transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-8 custom-scrollbar relative z-0">
          {search.length > 0 && (
             <button
                onClick={() => onSelect(search)}
                className="mb-4 w-full p-4 bg-gradient-to-r from-[var(--accent-bg)] to-[var(--bg)] border border-[var(--accent)]/30 rounded-2xl flex items-center justify-between group hover:border-[var(--accent)] transition-all active:scale-[0.98]"
             >
                <div className="flex flex-col items-start overflow-hidden pr-4">
                  <span className="text-[10px] uppercase font-black tracking-widest text-[var(--accent)] opacity-80">Usa testo libero</span>
                  <span className="font-bold text-[var(--text-main)] text-lg truncate w-full text-left">"{search}"</span>
                </div>
                <div className="p-2 bg-[var(--accent)] text-white rounded-full scale-90 group-hover:scale-100 transition-transform shadow-md shadow-[var(--accent)]/20 shrink-0">
                  <Plus className="w-5 h-5" />
                </div>
             </button>
          )}

          {filtered.length === 0 ? (
             <div className="py-16 text-center flex flex-col items-center justify-center">
                 <div className="w-16 h-16 bg-[var(--surface-variant)] rounded-full flex items-center justify-center mb-4 border border-[var(--border)]">
                   <Car className="w-8 h-8 text-[var(--text-muted)] opacity-50" />
                 </div>
                 <h4 className="text-[var(--text-main)] font-bold text-lg mb-1">Nessun risultato</h4>
                 <p className="text-[var(--text-muted)] text-sm">
                   {search.length > 0 ? 'Tocca il bottone sopra per usare il testo libero.' : 'Prova a cercare qualcos\'altro.'}
                 </p>
             </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filtered.map((opt) => (
                <button
                  key={opt}
                  onClick={() => onSelect(opt)}
                  className="flex items-center justify-between p-4 bg-[var(--bg)] hover:bg-[var(--surface-variant)] border border-[var(--border)] rounded-2xl transition-all text-left group active:scale-[0.98]"
                >
                  <span className="font-bold text-[var(--text-main)]">{opt}</span>
                  <div className="w-8 h-8 rounded-full bg-[var(--surface-variant)] group-hover:bg-[var(--accent)] flex items-center justify-center transition-colors">
                    <ChevronRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-white transition-colors" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
