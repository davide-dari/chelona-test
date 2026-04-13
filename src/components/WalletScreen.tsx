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
  const [balance, setBalance] = useState(Number(module.balance) || 0);
  const [payments, setPayments] = useState<ScheduledPayment[]>(module.payments || []);
  const [isAddingPayment, setIsAddingPayment] = useState(false);
  const [longPressId, setLongPressId] = useState<string | null>(null);
  
  // Form per nuovo pagamento
  const [newName, setNewName] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newDate, setNewDate] = useState('');

  // Calcolo allocazione con sicurezza numerica
  const allocatedBalance = useMemo(() => {
    return payments.reduce((acc, p) => acc + (Number(p.savedAmount) || 0), 0);
  }, [payments]);

  const freeBalance = Math.max(0, Number(balance) - allocatedBalance);

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
      const remainingToSave = Math.max(0, Number(p.totalAmount) - (Number(p.savedAmount) || 0));
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

  const [tempAmounts, setTempAmounts] = useState<Record<string, string>>({});

  const handleApplySaving = (id: string) => {
    const value = tempAmounts[id];
    if (value === undefined) return;
    
    let numValue = parseFloat(value) || 0;
    numValue = Math.max(0, numValue);
    
    setPayments(prev => {
      const updated = prev.map(p => {
        if (p.id === id) {
          const total = Number(p.totalAmount);
          const currentSaved = Number(p.savedAmount) || 0;
          // Sommiamo il nuovo valore a quello esistente
          const newSaved = Math.min(total, currentSaved + numValue);
          return { ...p, savedAmount: newSaved };
        }
        return p;
      });
      
      // Auto-save dopo la conferma
      onSave({
        ...module,
        balance: Number(balance),
        payments: updated,
        updatedAt: new Date().toISOString()
      });
      
      return updated;
    });
    
    // Rimuoviamo il valore temporaneo dopo l'applicazione
    setTempAmounts(prev => {
      const { [id]: _, ...rest } = prev;
      return rest;
    });
    
    if (window.navigator.vibrate) window.navigator.vibrate(20);
  };

  const handleUpdateAllocationManual = (id: string, value: string) => {
    setTempAmounts(prev => ({ ...prev, [id]: value }));
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
      const remainingToSave = Math.max(0, Number(p.totalAmount) - (Number(p.savedAmount) || 0));
      const monthlyQuote = Math.min(remainingToSave, remainingToSave / installments);
      
      if (tempBalance >= monthlyQuote) {
        tempBalance -= monthlyQuote;
        return { ...p, savedAmount: (Number(p.savedAmount) || 0) + monthlyQuote };
      } else if (tempBalance > 0) {
        const partial = tempBalance;
        tempBalance = 0;
        return { ...p, savedAmount: (Number(p.savedAmount) || 0) + partial };
      }
      return p;
    });
    
    setPayments(updatedPayments);
    
    // Auto-save
    onSave({
      ...module,
      balance: Number(balance),
      payments: updatedPayments,
      updatedAt: new Date().toISOString()
    });
  };

  const handleRemovePayment = (id: string) => {
    const updated = payments.filter(p => p.id !== id);
    setPayments(updated);
    setLongPressId(null);
    
    // Auto-save
    onSave({
      ...module,
      balance: Number(balance),
      payments: updated,
      updatedAt: new Date().toISOString()
    });
  };

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
    
    const updated = [...payments, payment];
    setPayments(updated);
    setIsAddingPayment(false);
    setNewName('');
    setNewAmount('');
    setNewDate('');
    
    // Auto-save immediato dopo la creazione
    onSave({
      ...module,
      balance: Number(balance),
      payments: updated,
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
      onClick={() => setLongPressId(null)}
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
        <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
           <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
           <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600">Auto-Save</span>
        </div>
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
                         value={balance === 0 ? '' : balance}
                         placeholder="0"
                         onChange={e => setBalance(parseFloat(e.target.value) || 0)}
                         onFocus={(e) => e.target.select()}
                         onBlur={() => {
                           onSave({
                             ...module,
                             balance: Number(balance),
                             payments,
                             updatedAt: new Date().toISOString()
                           });
                         }}
                         className="bg-transparent border-none text-4xl font-black text-[var(--text-main)] outline-none w-full tracking-tight"
                       />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-[var(--bg)] border border-[var(--border)] rounded-3xl">
                  <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">Libero</p>
                  <p className={`text-xl font-black transition-colors ${freeBalance < 0 ? 'text-red-500' : 'text-[var(--text-main)]'}`}>€ {Number(freeBalance).toLocaleString('it-IT')}</p>
                </div>
                <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-3xl">
                  <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600/70 mb-1">Allocato</p>
                  <p className="text-xl font-black text-emerald-600">€ {Number(allocatedBalance).toLocaleString('it-IT')}</p>
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
                onClick={(e) => { e.stopPropagation(); setIsAddingPayment(true); }}
                className="p-2 bg-[var(--accent-bg)] text-[var(--accent)] border border-[var(--accent)]/30 rounded-xl hover:scale-110 transition-transform"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <AnimatePresence>
                {payments.map(p => {
                  const saved = Number(p.savedAmount) || 0;
                  const total = Number(p.totalAmount);
                  const progress = Math.min(100, (saved / total) * 100);
                  const isCompleted = progress >= 100;
                  const isLongPressed = longPressId === p.id;
                  
                  const hasChanges = tempAmounts[p.id] !== undefined;
                  const displayValue = tempAmounts[p.id] !== undefined 
                    ? tempAmounts[p.id] 
                    : (p.savedAmount === 0 ? '' : p.savedAmount);

                  return (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ 
                        opacity: 1, 
                        y: 0,
                        scale: isLongPressed ? 1.02 : 1
                      }}
                      transition={{ duration: 0.2 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setLongPressId(p.id);
                        if (window.navigator.vibrate) window.navigator.vibrate(30);
                      }}
                      className={`bg-[var(--card-bg)] border ${isCompleted ? 'border-emerald-500/50 shadow-lg shadow-emerald-500/5' : 'border-[var(--border)]'} rounded-[2rem] p-6 relative group overflow-hidden select-none touch-none`}
                    >
                      {/* Tasto Cancella discreto che appare col long-press */}
                      <AnimatePresence>
                        {isLongPressed && (
                          <motion.button
                            initial={{ opacity: 0, scale: 0.8, x: 20 }}
                            animate={{ opacity: 1, scale: 1, x: 0 }}
                            exit={{ opacity: 0, scale: 0.8, x: 20 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm(`Svuotare ed eliminare "${p.name}"?`)) {
                                handleRemovePayment(p.id);
                              }
                            }}
                            className="absolute top-4 right-4 z-20 p-4 bg-red-500 text-white rounded-2xl shadow-xl shadow-red-500/30 flex items-center gap-2 hover:bg-red-600 transition-colors"
                          >
                            <Trash2 className="w-5 h-5" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Elimina</span>
                          </motion.button>
                        )}
                      </AnimatePresence>

                      <div className="relative z-10 space-y-5">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-bold text-[var(--text-main)] text-lg leading-tight">{p.name}</h4>
                            <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mt-1">Scade: {new Date(p.dueDate).toLocaleDateString('it-IT')}</p>
                          </div>
                        </div>

                        {/* Progress Bar Container */}
                        <div className="space-y-2">
                          <div className="flex justify-between items-end">
                            <span className={`text-[10px] font-black uppercase tracking-widest ${isCompleted ? 'text-emerald-600' : 'text-[var(--text-muted)]'}`}>
                              {isCompleted ? 'Obiettivo Raggiunto' : `Progressi Risparmio`}
                            </span>
                            <span className={`text-xs font-bold ${isCompleted ? 'text-emerald-600' : 'text-[var(--text-main)]'}`}>
                              {progress.toFixed(0)}%
                            </span>
                          </div>
                          <div className="h-2.5 bg-[var(--surface-variant)] rounded-full overflow-hidden shadow-inner">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${progress}%` }}
                              className={`h-full rounded-full ${isCompleted ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.3)]' : 'bg-[var(--accent)]'}`}
                            />
                          </div>
                          <div className="flex justify-between items-center text-[10px] font-bold text-[var(--text-muted)] px-1">
                            <span>€ 0</span>
                            <span className="text-[var(--text-main)]">Target: € {total.toLocaleString('it-IT')}</span>
                          </div>
                        </div>

                        {/* Input Manuale Allocazione (Somma) */}
                        <div className="flex flex-col gap-2 pt-1">
                           <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Aggiungi Risparmio</label>
                           <div className="relative group/input flex items-center gap-3">
                              <div className="relative flex-1">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-[var(--text-muted)] group-focus-within/input:text-[var(--accent)] transition-colors">+ €</span>
                                <input
                                  type="number"
                                  value={displayValue}
                                  placeholder="0"
                                  onPointerDown={(e) => e.stopPropagation()}
                                  onContextMenu={(e) => e.stopPropagation()}
                                  onChange={(e) => handleUpdateAllocationManual(p.id, e.target.value)}
                                  onFocus={(e) => e.target.select()}
                                  className={`w-full pl-12 pr-4 py-3.5 bg-[var(--bg)] border ${hasChanges ? 'border-amber-500/50 outline outline-4 outline-amber-500/5' : freeBalance < 0 ? 'border-red-500/50' : 'border-[var(--border)]'} rounded-2xl text-sm font-black text-[var(--text-main)] outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/5 transition-all`}
                                />
                              </div>
                              
                              <AnimatePresence>
                                {hasChanges && (
                                  <motion.button
                                    initial={{ opacity: 0, scale: 0.5, x: 20 }}
                                    animate={{ opacity: 1, scale: 1, x: 0 }}
                                    exit={{ opacity: 0, scale: 0.5, x: 20 }}
                                    onClick={() => handleApplySaving(p.id)}
                                    className="p-3.5 bg-emerald-500 text-white rounded-2xl shadow-lg shadow-emerald-500/20 active:scale-90 transition-all"
                                  >
                                    <TrendingUp className="w-5 h-5" />
                                  </motion.button>
                                )}
                              </AnimatePresence>
                           </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              {payments.length === 0 && !isAddingPayment && (
                <div className="py-12 text-center border-2 border-dashed border-[var(--border)] rounded-[2.5rem]">
                  <p className="text-sm text-[var(--text-muted)] font-medium">Crea un mini-portafoglio per iniziare</p>
                  <button onClick={(e) => { e.stopPropagation(); setIsAddingPayment(true); }} className="mt-3 text-[var(--accent)] font-bold text-xs uppercase tracking-widest">Aggiungi</button>
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
