import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Wallet, Plus, Trash2, Calendar, CreditCard, ArrowLeft, TrendingUp, Info } from 'lucide-react';
import { WalletModule, ScheduledPayment } from '../types';
import { generateUUID } from '../utils/uuid';

interface WalletScreenProps {
  module: WalletModule;
  onSave: (m: WalletModule) => void;
  onClose: () => void;
}

export const WalletScreen = ({ module, onSave, onClose }: WalletScreenProps) => {
  const [balance, setBalance] = useState(module.balance || 0);
  const [payments, setPayments] = useState<ScheduledPayment[]>(module.payments || []);
  const [isAddingPayment, setIsAddingPayment] = useState(false);
  
  // Form per nuovo pagamento
  const [newName, setNewName] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newDate, setNewDate] = useState('');

  // Calcolo allocazione
  const allocatedBalance = useMemo(() => {
    return payments.reduce((acc, p) => acc + (p.savedAmount || 0), 0);
  }, [payments]);

  const freeBalance = Math.max(0, balance - allocatedBalance);

  // Logica calcolo rate mensili
  const monthlyRates = useMemo(() => {
    const ratesByMonth: Record<string, number> = {};
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();

    payments.forEach(p => {
      const due = new Date(p.dueDate);
      const monthsDiff = (due.getFullYear() - currentYear) * 12 + (due.getMonth() - currentMonth);
      
      const installments = Math.max(1, monthsDiff + 1);
      const remainingToSave = Math.max(0, p.totalAmount - (p.savedAmount || 0));
      const monthlyAmount = remainingToSave / installments;

      for (let i = 0; i < installments; i++) {
        const monthDate = new Date(currentYear, currentMonth + i, 1);
        const monthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;
        ratesByMonth[monthKey] = (ratesByMonth[monthKey] || 0) + monthlyAmount;
      }
    });

    return Object.entries(ratesByMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(0, 12);
  }, [payments]);

  const handleAddPayment = () => {
    if (!newName || !newAmount || !newDate) return;
    const payment: ScheduledPayment = {
      id: generateUUID(),
      name: newName,
      totalAmount: parseFloat(newAmount),
      dueDate: newDate,
      isPaid: false,
      savedAmount: 0
    };
    setPayments([...payments, payment]);
    setIsAddingPayment(false);
    setNewName('');
    setNewAmount('');
    setNewDate('');
  };

  const handleUpdateAllocation = (id: string, amount: number) => {
    // Non possiamo allocare più del saldo libero (a meno che non stiamo togliendo soldi)
    if (amount > 0 && freeBalance < amount) return;
    
    setPayments(payments.map(p => {
      if (p.id === id) {
        const currentSaved = p.savedAmount || 0;
        const newSaved = Math.max(0, Math.min(p.totalAmount, currentSaved + amount));
        // Se stiamo togliendo più di quanto c'è, newSaved sarà 0
        return { ...p, savedAmount: newSaved };
      }
      return p;
    }));
  };

  // Funzione per accantonare automaticamente le quote del mese
  const handleAutoAllocate = () => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    
    let tempBalance = freeBalance;
    const updatedPayments = payments.map(p => {
      const due = new Date(p.dueDate);
      const monthsDiff = (due.getFullYear() - currentYear) * 12 + (due.getMonth() - currentMonth);
      const installments = Math.max(1, monthsDiff + 1);
      const remainingToSave = Math.max(0, p.totalAmount - (p.savedAmount || 0));
      const monthlyQuote = Math.min(remainingToSave, remainingToSave / installments);
      
      if (tempBalance >= monthlyQuote) {
        tempBalance -= monthlyQuote;
        return { ...p, savedAmount: (p.savedAmount || 0) + monthlyQuote };
      } else if (tempBalance > 0) {
        const partial = tempBalance;
        tempBalance = 0;
        return { ...p, savedAmount: (p.savedAmount || 0) + partial };
      }
      return p;
    });
    
    setPayments(updatedPayments);
  };

  const handleRemovePayment = (id: string) => {
    setPayments(payments.filter(p => p.id !== id));
  };

  const handleSave = () => {
    onSave({
      ...module,
      balance,
      payments,
      updatedAt: new Date().toISOString()
    });
  };

  const currentMonthRate = monthlyRates.length > 0 ? monthlyRates[0][1] : 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      className="fixed inset-0 z-[150] bg-[var(--bg)] flex flex-col overflow-hidden pt-[var(--safe-top)]"
    >
      {/* Header */}
      <header className="flex items-center gap-4 px-6 py-5 border-b border-[var(--border)] bg-[var(--header-bg)] backdrop-blur-3xl shrink-0">
        <button onClick={onClose} className="p-2.5 hover:bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl text-[var(--text-muted)] transition-all">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-[var(--text-main)]">Gestione Portafoglio</h2>
          <p className="text-[10px] text-[var(--text-muted)] font-black uppercase tracking-widest">{module.title}</p>
        </div>
        <button
          onClick={handleSave}
          className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-bold text-sm transition-all shadow-lg shadow-emerald-500/20"
        >
          Salva
        </button>
      </header>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-3xl mx-auto px-6 py-8 space-y-8 pb-32">
          
          {/* Dashboard Portafoglio */}
          <div className="space-y-4">
            <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[2.5rem] p-7 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-[var(--accent-bg)] rounded-2xl text-[var(--accent)] border border-[var(--accent)]/20">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Saldo Totale</span>
                    <div className="flex items-baseline gap-1">
                       <span className="text-4xl font-black text-[var(--text-main)] tracking-tight">€</span>
                       <input
                         type="number"
                         value={balance}
                         onChange={e => setBalance(parseFloat(e.target.value) || 0)}
                         className="bg-transparent border-none text-4xl font-black text-[var(--text-main)] outline-none w-full tracking-tight"
                       />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-[var(--bg)] border border-[var(--border)] rounded-3xl">
                  <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">Libero</p>
                  <p className="text-xl font-black text-[var(--text-main)]">€ {freeBalance.toLocaleString('it-IT')}</p>
                </div>
                <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-3xl">
                  <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600/70 mb-1">Allocato</p>
                  <p className="text-xl font-black text-emerald-600">€ {allocatedBalance.toLocaleString('it-IT')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Pagamenti Programmati (Mini Wallets) */}
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-[var(--text-main)] flex items-center gap-2">
                <Calendar className="w-5 h-5 text-purple-500" />
                Mini-Portafogli
              </h3>
              <button
                onClick={() => setIsAddingPayment(true)}
                className="p-2 bg-[var(--accent-bg)] text-[var(--accent)] border border-[var(--accent)]/30 rounded-xl hover:scale-110 transition-transform"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <AnimatePresence>
                {payments.map(p => {
                  const progress = Math.min(100, ((p.savedAmount || 0) / p.totalAmount) * 100);
                  const isCompleted = progress >= 100;

                  return (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className={`bg-[var(--card-bg)] border ${isCompleted ? 'border-emerald-500/50 shadow-lg shadow-emerald-500/5' : 'border-[var(--border)]'} rounded-[2rem] p-6 relative group overflow-hidden`}
                    >
                      {/* Sub-bg per completato */}
                      {isCompleted && <div className="absolute inset-0 bg-emerald-500/5 pointer-events-none" />}

                      <div className="relative z-10 space-y-5">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-bold text-[var(--text-main)] text-lg leading-tight">{p.name}</h4>
                            <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mt-1">Scade: {new Date(p.dueDate).toLocaleDateString('it-IT')}</p>
                          </div>
                          <button
                            onClick={() => handleRemovePayment(p.id)}
                            className="p-2 text-[var(--text-muted)] hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Progress Bar Container */}
                        <div className="space-y-2">
                          <div className="flex justify-between items-end">
                            <span className={`text-[10px] font-black uppercase tracking-widest ${isCompleted ? 'text-emerald-600' : 'text-[var(--text-muted)]'}`}>
                              {isCompleted ? 'Obiettivo Raggiunto' : `Risparmiato: € ${(p.savedAmount || 0).toLocaleString('it-IT')}`}
                            </span>
                            <span className={`text-xs font-bold ${isCompleted ? 'text-emerald-600' : 'text-[var(--text-main)]'}`}>
                              {progress.toFixed(0)}%
                            </span>
                          </div>
                          <div className="h-3 bg-[var(--surface-variant)] rounded-full overflow-hidden shadow-inner">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${progress}%` }}
                              className={`h-full rounded-full ${isCompleted ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]' : 'bg-[var(--accent)]'}`}
                            />
                          </div>
                          <div className="flex justify-between items-center text-[10px] font-bold text-[var(--text-muted)] px-1">
                            <span>€ 0</span>
                            <span className="text-[var(--text-main)]">Target: € {p.totalAmount.toLocaleString('it-IT')}</span>
                          </div>
                        </div>

                        {/* Controlli Allocazione */}
                        <div className="flex items-center gap-3 pt-2">
                           <button 
                             onClick={() => handleUpdateAllocation(p.id, -10)}
                             className="w-10 h-10 bg-[var(--bg)] border border-[var(--border)] rounded-xl flex items-center justify-center font-bold text-[var(--text-muted)] hover:border-red-500/30 hover:text-red-500 transition-all"
                           >
                             -10
                           </button>
                           <button 
                             onClick={() => handleUpdateAllocation(p.id, 10)}
                             disabled={freeBalance < 10 || isCompleted}
                             className={`flex-1 h-10 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${isCompleted ? 'bg-emerald-500/10 text-emerald-600 cursor-not-allowed' : 'bg-[var(--accent)] text-white shadow-lg shadow-[var(--accent)]/10 active:scale-95'}`}
                           >
                              {isCompleted ? 'Completato' : `+ €10`}
                           </button>
                           <button 
                             onClick={() => handleUpdateAllocation(p.id, 50)}
                             disabled={freeBalance < 50 || isCompleted}
                             className="w-14 h-10 bg-[var(--bg)] border border-[var(--border)] rounded-xl flex items-center justify-center font-bold text-[var(--text-main)] text-xs hover:border-[var(--accent)] transition-all disabled:opacity-50"
                           >
                             +50
                           </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              {payments.length === 0 && !isAddingPayment && (
                <div className="py-12 text-center border-2 border-dashed border-[var(--border)] rounded-[2.5rem]">
                  <p className="text-sm text-[var(--text-muted)] font-medium">Crea un mini-portafoglio per iniziare</p>
                  <button onClick={() => setIsAddingPayment(true)} className="mt-3 text-[var(--accent)] font-bold text-xs uppercase tracking-widest">Aggiungi</button>
                </div>
              )}
            </div>
          </div>

          {/* Piano Mensile & Smart Allocator */}
          {monthlyRates.length > 0 && (
            <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[2.5rem] p-7 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-purple-500/10 rounded-2xl text-purple-600 border border-purple-500/20">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[var(--text-main)]">Quota Mensile Attesa</h3>
                    <p className="text-[10px] text-[var(--text-muted)] font-black uppercase tracking-widest">Basata sui target rimanenti</p>
                  </div>
                </div>
                <p className="text-2xl font-black text-emerald-600 tracking-tight">€ {currentMonthRate.toLocaleString('it-IT', { maximumFractionDigits: 0 })}</p>
              </div>

              {freeBalance >= currentMonthRate && currentMonthRate > 0 && (
                <button
                  onClick={handleAutoAllocate}
                  className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-bold flex items-center justify-center gap-3 transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
                >
                  <CreditCard className="w-5 h-5" />
                  Accantona Quote del Mese (€ {currentMonthRate.toFixed(0)})
                </button>
              )}
              
              <div className="space-y-3">
                {monthlyRates.map(([month, amount], idx) => (
                  <div key={month} className={`flex items-center justify-between p-3.5 rounded-2xl border ${idx === 0 ? 'bg-[var(--accent-bg)] border-[var(--accent)]/30' : 'bg-[var(--bg)] border-[var(--border)]'}`}>
                    <span className={`text-xs font-bold uppercase tracking-widest ${idx === 0 ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'}`}>
                      {new Date(month + '-01').toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}
                    </span>
                    <span className="font-black text-[var(--text-main)] text-sm">
                      € {amount.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Modal Nuovo Pagamento */}
      <AnimatePresence>
        {isAddingPayment && (
          <div className="fixed inset-0 z-[160] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddingPayment(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-[var(--card-bg)] border border-[var(--border)] rounded-[2.5rem] p-7 shadow-2xl w-full max-w-md"
            >
              <h3 className="text-xl font-bold text-[var(--text-main)] mb-6">Nuovo Mini-Portafoglio</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2 block">Nome Scadenza</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    placeholder="es. Assicurazione Casa"
                    className="w-full p-4 bg-[var(--bg)] border border-[var(--border)] rounded-2xl outline-none focus:border-[var(--accent)] transition-all font-bold text-[var(--text-main)] h-14"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2 block">Importo Finale</label>
                    <input
                      type="number"
                      value={newAmount}
                      onChange={e => setNewAmount(e.target.value)}
                      placeholder="€"
                      className="w-full p-4 bg-[var(--bg)] border border-[var(--border)] rounded-2xl outline-none focus:border-[var(--accent)] transition-all font-bold text-[var(--text-main)] h-14"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2 block">Data Scadenza</label>
                    <input
                      type="date"
                      value={newDate}
                      onChange={e => setNewDate(e.target.value)}
                      className="w-full p-4 bg-[var(--bg)] border border-[var(--border)] rounded-2xl outline-none focus:border-[var(--accent)] transition-all font-bold text-[var(--text-main)] h-14"
                    />
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setIsAddingPayment(false)}
                    className="flex-1 py-4 bg-[var(--bg)] border border-[var(--border)] rounded-2xl font-bold text-[var(--text-muted)] transition-all"
                  >
                    Annulla
                  </button>
                  <button
                    onClick={handleAddPayment}
                    className="flex-1 py-4 bg-[var(--accent)] text-white rounded-2xl font-bold shadow-lg shadow-[var(--accent)]/20 transition-all"
                  >
                    Crea
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
