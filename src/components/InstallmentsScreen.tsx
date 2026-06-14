import React, { useState } from 'react';
import { ArrowLeft, Check, Trash2, Calendar, Target, RefreshCw, CheckCircle2, Circle, Type } from 'lucide-react';
import { InstallmentsModule, InstallmentPayment } from '../types';
import { generateUUID } from '../utils/uuid';

interface InstallmentsScreenProps {
  module: InstallmentsModule;
  onClose: () => void;
  onSave: (m: InstallmentsModule) => void;
  onDelete?: (id: string) => void;
}

export const InstallmentsScreen = ({ module, onClose, onSave, onDelete }: InstallmentsScreenProps) => {
  const [formData, setFormData] = useState<InstallmentsModule>({
    ...module,
    title: module.title || '',
    targetAmount: module.targetAmount || 0,
    finalDueDate: module.finalDueDate || new Date().toISOString().substring(0, 10),
    payments: module.payments || []
  });

  const [installmentsCount, setInstallmentsCount] = useState(
    module.payments?.length > 0 ? module.payments.length : 3
  );

  const [amountDisplay, setAmountDisplay] = useState(module.targetAmount ? String(module.targetAmount) : '');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const generateInstallments = () => {
    if (formData.targetAmount <= 0 || installmentsCount <= 0) return;
    
    const amountPerInstallment = formData.targetAmount / installmentsCount;
    const dueDateObj = new Date(formData.finalDueDate);
    const newPayments: InstallmentPayment[] = [];
    
    // Genera a ritroso a partire dalla data finale
    for (let i = 0; i < installmentsCount; i++) {
      const pDate = new Date(dueDateObj);
      pDate.setMonth(pDate.getMonth() - (installmentsCount - 1 - i));
      
      newPayments.push({
        id: generateUUID(),
        amount: Number(amountPerInstallment.toFixed(2)),
        dueDate: pDate.toISOString().substring(0, 10),
        isPaid: false
      });
    }
    
    setFormData(prev => ({ ...prev, payments: newPayments }));
  };

  const togglePayment = (id: string) => {
    setFormData(prev => ({
      ...prev,
      payments: prev.payments.map(p => 
        p.id === id ? { ...p, isPaid: !p.isPaid, paidDate: !p.isPaid ? new Date().toISOString() : undefined } : p
      )
    }));
  };

  const handleSave = () => {
    if (!formData.title || formData.targetAmount <= 0) {
      alert("Inserisci un nome e un importo valido.");
      return;
    }
    onSave(formData);
  };

  const paidAmount = formData.payments.filter(p => p.isPaid).reduce((acc, curr) => acc + curr.amount, 0);
  const remainingAmount = formData.targetAmount - paidAmount;
  const progress = formData.targetAmount > 0 ? (paidAmount / formData.targetAmount) * 100 : 0;

  return (
    <div className="fixed inset-0 z-[150] bg-[var(--bg)] flex flex-col h-[100dvh] overflow-hidden font-sans transition-colors duration-300">
      {/* Header */}
      <header className="h-20 border-b border-[var(--border)] bg-[var(--header-bg)] backdrop-blur-2xl px-6 flex items-center justify-between shrink-0 z-20 safe-area-header">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-3 bg-[var(--card-bg)] border border-[var(--border)] hover:bg-[var(--border)] rounded-2xl transition-all shadow-sm">
            <ArrowLeft className="w-6 h-6 text-[var(--text-main)]" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-[var(--text-main)]">Gestione Rate</h2>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Pianifica un pagamento</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onDelete && (
            <button 
              onClick={() => setShowDeleteConfirm(true)}
              className="p-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-2xl transition-all"
              title="Elimina"
            >
              <Trash2 className="w-6 h-6" />
            </button>
          )}
          <button 
            onClick={handleSave}
            className="flex items-center gap-2 bg-indigo-500 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-indigo-500/20 active:scale-95 transition-all"
          >
            <Check className="w-5 h-5" />
            <span>Salva</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto w-full max-w-2xl mx-auto p-6 space-y-8 custom-scrollbar">
        
        {/* Amount Section */}
        <div className="bg-[var(--card-bg)] p-8 rounded-[2.5rem] border border-[var(--border)] shadow-sm text-center">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mb-4 block">Importo da Raggiungere</label>
          <div className="relative flex items-center justify-center gap-3">
            <span className="text-3xl font-black text-indigo-500">€</span>
            <input 
              type="number" 
              step="0.01"
              value={amountDisplay}
              onChange={e => {
                const val = e.target.value;
                setAmountDisplay(val);
                setFormData(prev => ({ ...prev, targetAmount: val === '' ? 0 : Number(val) }));
              }}
              className="bg-transparent border-none text-5xl font-black text-[var(--text-main)] text-center outline-none w-48 placeholder:text-[var(--text-muted)]"
              placeholder="0"
            />
          </div>
          
          {formData.payments.length > 0 && (
            <div className="mt-6">
              <div className="flex justify-between text-xs font-bold text-[var(--text-muted)] mb-2">
                <span>Versato: €{paidAmount.toFixed(2)}</span>
                <span>Rimasto: €{remainingAmount.toFixed(2)}</span>
              </div>
              <div className="h-2 w-full bg-[var(--border)] rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: `${Math.min(100, progress)}%` }} />
              </div>
            </div>
          )}
        </div>

        {/* Details Form */}
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">
              <Type className="w-3.5 h-3.5" /> Nome Pagamento
            </label>
            <input 
              type="text"
              value={formData.title}
              onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Es. Assicurazione Auto, Vacanza..."
              className="w-full p-5 bg-[var(--card-bg)] border border-[var(--border)] rounded-3xl outline-none focus:border-indigo-500 transition-all font-bold text-[var(--text-main)] placeholder:text-[var(--text-muted)]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">
                <Calendar className="w-3.5 h-3.5" /> Scadenza Finale
              </label>
              <input 
                type="date"
                value={formData.finalDueDate}
                onChange={e => setFormData(prev => ({ ...prev, finalDueDate: e.target.value }))}
                className="w-full p-5 bg-[var(--card-bg)] border border-[var(--border)] rounded-3xl outline-none focus:border-indigo-500 transition-all font-bold text-[var(--text-main)]"
              />
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">
                <Target className="w-3.5 h-3.5" /> Numero di Rate
              </label>
              <div className="flex gap-2">
                <input 
                  type="number"
                  min="1"
                  max="120"
                  value={installmentsCount}
                  onChange={e => setInstallmentsCount(Number(e.target.value))}
                  className="w-full p-5 bg-[var(--card-bg)] border border-[var(--border)] rounded-3xl outline-none focus:border-indigo-500 transition-all font-bold text-[var(--text-main)]"
                />
                <button 
                  onClick={generateInstallments}
                  className="bg-indigo-500 text-white px-5 rounded-3xl font-bold hover:bg-indigo-600 active:scale-95 transition-all shadow-sm flex items-center justify-center shrink-0"
                  title="Genera Rate"
                >
                  <RefreshCw className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Timeline Rate */}
        {formData.payments.length > 0 && (
          <div className="space-y-4 pt-4 border-t border-[var(--border)]">
            <h3 className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)] ml-1 mb-4">Piano di Ammortamento</h3>
            
            <div className="flex flex-col gap-3">
              {formData.payments.map((p, idx) => (
                <div 
                  key={p.id}
                  onClick={() => togglePayment(p.id)}
                  className={`flex items-center justify-between p-5 rounded-3xl border transition-all cursor-pointer ${
                    p.isPaid 
                      ? 'bg-emerald-500/10 border-emerald-500/30' 
                      : 'bg-[var(--card-bg)] border-[var(--border)] hover:border-indigo-500/50'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    {p.isPaid ? (
                      <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                    ) : (
                      <Circle className="w-6 h-6 text-[var(--text-muted)]" />
                    )}
                    <div>
                      <p className={`font-bold text-sm ${p.isPaid ? 'text-emerald-700 dark:text-emerald-400' : 'text-[var(--text-main)]'}`}>
                        Rata {idx + 1} di {formData.payments.length}
                      </p>
                      <p className="text-[10px] text-[var(--text-muted)] font-semibold mt-0.5">
                        Scadenza: {new Date(p.dueDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className={`text-lg font-black ${p.isPaid ? 'text-emerald-600' : 'text-indigo-600'}`}>
                    €{p.amount.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {showDeleteConfirm && onDelete && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4">
          <div className="bg-[var(--card-bg)] rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-[var(--border)]">
            <h3 className="text-lg font-bold text-[var(--text-main)] mb-2">Elimina Rateizzazione</h3>
            <p className="text-sm text-[var(--text-muted)] mb-6">Vuoi davvero eliminare questo piano di pagamento? L'azione è irreversibile.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-3 bg-[var(--surface-variant)] rounded-xl font-bold text-[var(--text-main)]">Annulla</button>
              <button onClick={() => onDelete(module.id)} className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold">Elimina</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
