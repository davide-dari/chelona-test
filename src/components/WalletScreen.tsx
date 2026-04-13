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
      const monthlyAmount = p.totalAmount / installments;

      for (let i = 0; i < installments; i++) {
        const monthDate = new Date(currentYear, currentMonth + i, 1);
        const monthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;
        ratesByMonth[monthKey] = (ratesByMonth[monthKey] || 0) + monthlyAmount;
      }
    });

    return Object.entries(ratesByMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(0, 12); // Mostriamo i prossimi 12 mesi
  }, [payments]);

  const handleAddPayment = () => {
    if (!newName || !newAmount || !newDate) return;
    const payment: ScheduledPayment = {
      id: generateUUID(),
      name: newName,
      totalAmount: parseFloat(newAmount),
      dueDate: newDate,
      isPaid: false
    };
    setPayments([...payments, payment]);
    setIsAddingPayment(false);
    setNewName('');
    setNewAmount('');
    setNewDate('');
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
      className="fixed inset-0 z-[150] bg-[var(--bg)] flex flex-col overflow-hidden"
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
        <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">
          
          {/* Dashboard Portafoglio */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[2.5rem] p-7 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 bg-[var(--accent-bg)] rounded-2xl text-[var(--accent)] border border-[var(--accent)]/20">
                  <Wallet className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-black uppercase tracking-widest text-[var(--text-muted)]">Saldo Attuale</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black text-[var(--text-main)] tracking-tight">€</span>
                <input
                  type="number"
                  value={balance}
                  onChange={e => setBalance(parseFloat(e.target.value) || 0)}
                  className="bg-transparent border-none text-4xl font-black text-[var(--text-main)] outline-none w-full tracking-tight"
                />
              </div>
            </div>

            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-[2.5rem] p-7 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 bg-emerald-500/10 rounded-2xl text-emerald-600 border border-emerald-500/20">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-black uppercase tracking-widest text-emerald-600/70">Quota Mensile (Adesso)</span>
              </div>
              <p className="text-4xl font-black text-emerald-600 tracking-tight">
                € {currentMonthRate.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {/* Pagamenti Programmati */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-[var(--text-main)] flex items-center gap-2">
                <Calendar className="w-5 h-5 text-purple-500" />
                Pagamenti Programmati
              </h3>
              <button
                onClick={() => setIsAddingPayment(true)}
                className="p-2 bg-[var(--accent-bg)] text-[var(--accent)] border border-[var(--accent)]/30 rounded-xl hover:scale-110 transition-transform"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <AnimatePresence>
                {payments.map(p => (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-[var(--card-bg)] border border-[var(--border)] rounded-3xl p-5 flex flex-col group relative"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-bold text-[var(--text-main)] leading-tight">{p.name}</h4>
                        <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mt-1">Scade: {new Date(p.dueDate).toLocaleDateString('it-IT')}</p>
                      </div>
                      <button
                        onClick={() => handleRemovePayment(p.id)}
                        className="p-1 text-[var(--text-muted)] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="mt-auto flex items-baseline gap-1">
                      <span className="text-xs font-bold text-[var(--text-muted)]">Totale:</span>
                      <span className="text-xl font-black text-[var(--text-main)] tracking-tight">€ {p.totalAmount.toLocaleString('it-IT')}</span>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              {payments.length === 0 && !isAddingPayment && (
                <div className="col-span-full py-12 text-center border-2 border-dashed border-[var(--border)] rounded-3xl">
                  <p className="text-sm text-[var(--text-muted)] font-medium">Nessun pagamento programmato</p>
                  <button onClick={() => setIsAddingPayment(true)} className="mt-3 text-[var(--accent)] font-bold text-xs uppercase tracking-widest">Aggiungi il primo</button>
                </div>
              )}
            </div>
          </div>

          {/* Piano Mensile Riepilogativo */}
          {monthlyRates.length > 0 && (
            <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[2.5rem] p-7 space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-purple-500/10 rounded-2xl text-purple-600 border border-purple-500/20">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-[var(--text-main)]">Piano di Accantonamento</h3>
                  <p className="text-[10px] text-[var(--text-muted)] font-black uppercase tracking-widest">Riepilogo quote mensili</p>
                </div>
              </div>
              
              <div className="space-y-3">
                {monthlyRates.map(([month, amount], idx) => (
                  <div key={month} className={`flex items-center justify-between p-3.5 rounded-2xl border ${idx === 0 ? 'bg-[var(--accent-bg)] border-[var(--accent)]/30' : 'bg-[var(--bg)] border-[var(--border)]'}`}>
                    <span className={`text-xs font-bold uppercase tracking-widest ${idx === 0 ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'}`}>
                      {new Date(month + '-01').toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}
                    </span>
                    <span className="font-black text-[var(--text-main)]">
                      € {amount.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
              </div>
              
              <div className="p-4 bg-[var(--bg)] border border-[var(--border)] rounded-2xl flex gap-3">
                <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">
                  Questo piano divide automaticamente il costo totale di ogni impegno per i mesi rimanenti fino alla data di scadenza, permettendoti di sapere esattamente quanto dovresti riservare ogni mese.
                </p>
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
              <h3 className="text-xl font-bold text-[var(--text-main)] mb-6">Nuovo Pagamento</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2 block">Nome Pagamento</label>
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
                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2 block">Importo Totale</label>
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
                    Aggiungi
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
