import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Search, ChevronRight, Car } from 'lucide-react';
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
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="relative bg-[var(--card-bg)] border-t border-[var(--border)] rounded-t-[2.5rem] flex flex-col max-h-[85vh] h-[85vh] shadow-2xl"
      >
        <div className="flex items-center justify-between p-6 pb-4 shrink-0">
          <div>
            <h3 className="text-xl font-bold text-[var(--text-main)]">
              {type === 'brand' ? 'Seleziona Marca' : `Seleziona Modello ${brand || ''}`}
            </h3>
            <p className="text-[10px] uppercase font-black tracking-widest text-[var(--text-muted)] mt-1">Scegli dalla lista</p>
          </div>
          <button onClick={onClose} className="p-3 bg-[var(--surface-variant)] rounded-2xl text-[var(--text-muted)]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 pb-4 shrink-0">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cerca..."
              className="w-full pl-12 pr-4 py-4 bg-[var(--bg)] border border-[var(--border)] rounded-2xl outline-none focus:border-[var(--accent)] font-bold text-[var(--text-main)] transition-all"
              autoFocus
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-8 custom-scrollbar">
          {filtered.length === 0 ? (
             <div className="py-12 text-center text-[var(--text-muted)] text-sm font-bold flex flex-col items-center">
                 <Car className="w-8 h-8 mb-4 opacity-50" />
                 Nessun risultato. Scegli "Usa testo libero" sotto.
             </div>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {filtered.map(opt => (
                <button
                  key={opt}
                  onClick={() => onSelect(opt)}
                  className="flex items-center justify-between p-4 bg-[var(--bg)] hover:bg-[var(--surface-variant)] border border-[var(--border)] rounded-2xl transition-all text-left group"
                >
                  <span className="font-bold text-[var(--text-main)]">{opt}</span>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-[var(--accent)] transition-colors" />
                </button>
              ))}
            </div>
          )}
          
          {search.length > 0 && (
             <button
                onClick={() => onSelect(search)}
                className="mt-6 w-full p-4 bg-[var(--accent-bg)] border border-[var(--accent)]/30 rounded-2xl font-bold text-[var(--accent)]"
             >
                Usa testo libero: "{search}"
             </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};
