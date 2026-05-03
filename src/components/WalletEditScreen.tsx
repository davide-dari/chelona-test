import React, { useState } from 'react';
import { motion } from 'motion/react';
import { WalletModule } from '../types';
import { Calendar } from 'lucide-react';

interface WalletEditScreenProps {
  module: WalletModule;
  onSave: (m: WalletModule) => void;
  onClose: () => void;
}

export const WalletEditScreen = ({ module, onSave, onClose }: WalletEditScreenProps) => {
  const [title, setTitle] = useState(module.title || '');
  const [totalAmount, setTotalAmount] = useState(module.totalAmount ? String(module.totalAmount) : '');
  const [dueDate, setDueDate] = useState(module.dueDate || '');
  const [addSavings, setAddSavings] = useState('');

  const handleSave = () => {
    if (!title || !totalAmount || !dueDate) return;
    const addedAmount = parseFloat(addSavings) || 0;
    const newSavedAmount = Math.min(parseFloat(totalAmount), (module.savedAmount || 0) + addedAmount);
    
    onSave({
      ...module,
      title,
      totalAmount: parseFloat(totalAmount),
      dueDate,
      savedAmount: newSavedAmount,
      updatedAt: new Date().toISOString()
    });
  };

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative bg-[var(--card-bg)] border border-[var(--border)] rounded-[2.5rem] p-7 shadow-2xl w-full max-w-md"
      >
        <h3 className="text-xl font-bold text-[var(--text-main)] mb-6">
          {module.title ? 'Modifica Rata' : 'Nuova Rata'}
        </h3>
        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2 block">Nome Scadenza</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="es. Assicurazione Casa"
              className="w-full p-4 bg-[var(--bg)] border border-[var(--border)] rounded-2xl outline-none focus:border-[var(--accent)] transition-all font-bold text-[var(--text-main)] h-14"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2 block">Importo Finale</label>
              <input
                type="number"
                value={totalAmount}
                onChange={e => setTotalAmount(e.target.value)}
                placeholder="€"
                className="w-full p-4 bg-[var(--bg)] border border-[var(--border)] rounded-2xl outline-none focus:border-[var(--accent)] transition-all font-bold text-[var(--text-main)] h-14"
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2 block">Data Scadenza</label>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="w-full p-4 bg-[var(--bg)] border border-[var(--border)] rounded-2xl outline-none focus:border-[var(--accent)] transition-all font-bold text-[var(--text-main)] h-14"
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between items-end mb-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] block">Aggiungi Risparmio</label>
              <span className="text-[10px] font-bold text-[var(--text-muted)]">Attuale: € {(module.savedAmount || 0).toLocaleString('it-IT')}</span>
            </div>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-[var(--text-muted)]">+ €</span>
              <input
                type="number"
                value={addSavings}
                onChange={e => setAddSavings(e.target.value)}
                placeholder="0"
                className="w-full pl-12 pr-4 py-4 bg-[var(--bg)] border border-[var(--border)] rounded-2xl outline-none focus:border-emerald-500 transition-all font-bold text-emerald-600 h-14"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 py-4 bg-[var(--bg)] border border-[var(--border)] rounded-2xl font-bold text-[var(--text-muted)] transition-all"
            >
              Annulla
            </button>
            <button
              onClick={handleSave}
              className="flex-1 py-4 bg-[var(--accent)] text-white rounded-2xl font-bold shadow-lg shadow-[var(--accent)]/20 transition-all"
            >
              Salva
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
