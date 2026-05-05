import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { WalletModule } from '../types';
import { Calendar, Wallet, ArrowLeft, Plus, TrendingUp, Info, Check, Edit2, Save, Trash2, PieChart } from 'lucide-react';

interface WalletManagementScreenProps {
  module: WalletModule;
  onSave: (m: WalletModule) => void;
  onCancel: () => void;
  onDelete?: (id: string) => void;
}

export const WalletManagementScreen = ({ module, onSave, onCancel, onDelete }: WalletManagementScreenProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [data, setData] = useState<WalletModule>({ ...module });
  const [addAmount, setAddAmount] = useState('');

  const handleSave = () => {
    onSave({
      ...data,
      updatedAt: new Date().toISOString()
    });
    setIsEditing(false);
  };

  const handleAddSavings = () => {
    const amount = parseFloat(addAmount) || 0;
    if (amount <= 0) return;
    
    const newSaved = Math.min(data.totalAmount, (data.savedAmount || 0) + amount);
    const updated = { ...data, savedAmount: newSaved };
    setData(updated);
    onSave(updated);
    setAddAmount('');
  };

  const progress = Math.min(100, (data.savedAmount / data.totalAmount) * 100);
  const remaining = Math.max(0, data.totalAmount - data.savedAmount);

  // Calculate monthly advice
  const today = new Date();
  const targetDate = new Date(data.dueDate);
  let months = (targetDate.getFullYear() - today.getFullYear()) * 12 + targetDate.getMonth() - today.getMonth();
  if (targetDate.getDate() > today.getDate() && months === 0) months = 1;
  months = Math.max(1, months);
  const monthlyAdvice = remaining / months;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="fixed inset-0 z-[150] bg-[var(--bg)] flex flex-col"
    >
      {/* Header */}
      <div className="bg-[var(--card-bg)] border-b border-[var(--border)] px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onCancel} className="p-2 hover:bg-[var(--surface-variant)] rounded-xl transition-colors">
            <ArrowLeft className="w-6 h-6 text-[var(--text-main)]" />
          </button>
          <div>
            <h2 className="text-lg font-black text-[var(--text-main)] uppercase tracking-tight leading-none">
              {data.title || 'Dettaglio Rata'}
            </h2>
            <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mt-1">
              Pianificazione Finanziaria
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
           {!isEditing ? (
             <button 
               onClick={() => setIsEditing(true)}
               className="p-2 bg-[var(--accent-bg)] text-[var(--accent)] border border-[var(--accent)]/20 rounded-xl hover:bg-[var(--accent)] hover:text-white transition-all"
             >
               <Edit2 className="w-4 h-4" />
             </button>
           ) : (
             <button 
               onClick={handleSave}
               className="p-2 bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
             >
               <Save className="w-4 h-4" />
             </button>
           )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-2xl mx-auto p-6 space-y-8">
          
          {/* Main Financial Hero */}
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[2.5rem] p-8 shadow-xl relative overflow-hidden">
             <div className="relative z-10">
                <div className="flex justify-between items-start mb-8">
                   <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Totale Obiettivo</p>
                      <h3 className="text-5xl font-black text-[var(--text-main)] tracking-tighter">
                         € {data.totalAmount.toLocaleString('it-IT')}
                      </h3>
                   </div>
                   <div className="w-14 h-14 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-500 border border-indigo-500/20">
                      <Wallet className="w-7 h-7" />
                   </div>
                </div>

                <div className="space-y-4">
                   <div className="flex justify-between items-end">
                      <p className="text-[11px] font-bold text-[var(--text-main)] uppercase tracking-widest">Progresso Risparmio</p>
                      <p className="text-xs font-black text-emerald-500">{progress.toFixed(1)}%</p>
                   </div>
                   <div className="h-4 bg-[var(--bg)] border border-[var(--border)] rounded-full overflow-hidden p-1 shadow-inner">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                      />
                   </div>
                   <div className="flex justify-between text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
                      <span>Accantonato: € {data.savedAmount.toLocaleString('it-IT')}</span>
                      <span>Residuo: € {remaining.toLocaleString('it-IT')}</span>
                   </div>
                </div>
             </div>
          </div>

          {/* Quick Actions & Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-3xl p-6 shadow-sm flex flex-col justify-between">
                <div>
                   <div className="flex items-center gap-2 text-emerald-500 mb-4">
                      <TrendingUp className="w-4 h-4" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Aggiungi Risparmio</span>
                   </div>
                   <div className="relative mb-6">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-black text-[var(--text-muted)]">€</span>
                      <input 
                        type="number"
                        value={addAmount}
                        onChange={e => setAddAmount(e.target.value)}
                        placeholder="0"
                        className="w-full pl-10 pr-4 py-4 bg-[var(--bg)] border border-[var(--border)] rounded-2xl outline-none focus:border-emerald-500 transition-all font-black text-xl text-emerald-600 h-16"
                      />
                   </div>
                </div>
                <button 
                  onClick={handleAddSavings}
                  className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-bold uppercase tracking-widest shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
                >
                  Conferma Deposito
                </button>
             </div>

             <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-3xl p-6 text-white shadow-xl flex flex-col justify-between">
                <div>
                   <div className="flex items-center gap-2 text-white/60 mb-4">
                      <Info className="w-4 h-4" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Pianificazione</span>
                   </div>
                   <h4 className="text-xl font-bold mb-2">Consiglio Mensile</h4>
                   <p className="text-sm text-white/80 leading-relaxed mb-4">
                      Metti da parte <strong className="text-white">€ {monthlyAdvice.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</strong> al mese per raggiungere l'obiettivo entro il {new Date(data.dueDate).toLocaleDateString('it-IT')}.
                   </p>
                </div>
                <div className="flex items-center gap-2 bg-white/10 rounded-xl p-3 border border-white/10">
                   <Calendar className="w-4 h-4 text-white/70" />
                   <span className="text-[10px] font-bold uppercase tracking-widest text-white/70">Scadenza: {new Date(data.dueDate).toLocaleDateString('it-IT')}</span>
                </div>
             </div>
          </div>

          {/* Edit Form (Inline) */}
          {isEditing && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[var(--card-bg)] border border-[var(--accent)]/30 rounded-3xl p-6 space-y-6 animate-pulse-subtle shadow-lg"
            >
               <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
                  <h4 className="font-black text-[10px] uppercase tracking-[0.2em] text-[var(--accent)]">Dettagli Modificabili</h4>
                  <X className="w-4 h-4 text-[var(--text-muted)] cursor-pointer" onClick={() => setIsEditing(false)} />
               </div>
               <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2 block">Nome Scadenza</label>
                    <input 
                      type="text" 
                      value={data.title} 
                      onChange={e => setData({...data, title: e.target.value})} 
                      className="w-full p-4 bg-[var(--bg)] border border-[var(--border)] rounded-2xl outline-none focus:border-[var(--accent)] transition-all font-bold text-[var(--text-main)]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2 block">Importo Finale</label>
                      <input 
                        type="number" 
                        value={data.totalAmount} 
                        onChange={e => setData({...data, totalAmount: parseFloat(e.target.value) || 0})} 
                        className="w-full p-4 bg-[var(--bg)] border border-[var(--border)] rounded-2xl outline-none focus:border-[var(--accent)] transition-all font-bold text-[var(--text-main)]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2 block">Data Scadenza</label>
                      <input 
                        type="date" 
                        value={data.dueDate} 
                        onChange={e => setData({...data, dueDate: e.target.value})} 
                        className="w-full p-4 bg-[var(--bg)] border border-[var(--border)] rounded-2xl outline-none focus:border-[var(--accent)] transition-all font-bold text-[var(--text-main)]"
                      />
                    </div>
                  </div>
               </div>
               <div className="pt-4 flex gap-3">
                  <button onClick={handleSave} className="flex-1 py-4 bg-[var(--accent)] text-white rounded-2xl font-bold uppercase tracking-widest">Salva Modifiche</button>
                  {onDelete && (
                    <button 
                      onClick={() => { if(window.confirm('Eliminare questa rata?')) { onDelete(data.id); onCancel(); } }} 
                      className="p-4 bg-red-500/10 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all"
                    >
                      <Trash2 className="w-6 h-6" />
                    </button>
                  )}
               </div>
            </motion.div>
          )}

          {/* Stats / Archive Footer */}
          <div className="pt-10 flex flex-col items-center text-center opacity-40">
             <PieChart className="w-8 h-8 text-[var(--text-muted)] mb-3" />
             <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[var(--text-muted)]">Analisi Storica Disponibile in Dashboard</p>
          </div>

        </div>
      </div>
    </motion.div>
  );
};
