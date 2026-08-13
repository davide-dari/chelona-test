import React from 'react';
import { Target, CheckCircle2, Pencil, Trash2, X, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { InstallmentsModule } from '../types';
import { isModuleSensitive } from '../utils/security';

interface InstallmentsCardProps {
  module: InstallmentsModule;
  onEdit: (module: import('../types').Module) => void;
  onDelete: (id: string) => void;
  onToggleSensitivity?: (module: import('../types').Module) => void;
}

export const InstallmentsCard = ({ module, onEdit, onDelete, onToggleSensitivity }: InstallmentsCardProps) => {
  const [showMenu, setShowMenu] = React.useState(false);
  const sensitive = isModuleSensitive(module);
  const payments = module.payments || [];
  const paidAmount = payments.filter(p => p.isPaid).reduce((acc, curr) => acc + curr.amount, 0);
  const progress = module.targetAmount > 0 ? (paidAmount / module.targetAmount) * 100 : 0;
  
  // Trova la prossima rata in scadenza
  const nextPayment = payments.find(p => !p.isPaid);

  const handleContextMenu = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setShowMenu(true);
  };

  return (
    <div 
      className="bg-[var(--card-bg)] rounded-[2.5rem] p-6 shadow-sm border border-[var(--border)] hover:shadow-lg hover:shadow-indigo-500/10 hover:border-indigo-500/30 transition-all cursor-pointer group h-full flex flex-col relative overflow-hidden"
      onClick={() => onEdit(module)}
      onContextMenu={handleContextMenu}
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-bl-[100px] -z-10 transition-transform group-hover:scale-110" />
      
      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center shrink-0">
          <Target className="w-6 h-6 text-indigo-500" />
        </div>
        <div>
          <h3 className="font-bold text-[var(--text-main)] text-lg line-clamp-1">{module.title || 'Nuove Rate'}</h3>
          <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-bold">Rate</p>
        </div>
        {onToggleSensitivity && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleSensitivity(module); }}
            className="p-2 rounded-lg hover:bg-[var(--bg)] text-[var(--text-muted)] hover:text-amber-500 transition-all ml-auto"
            title={sensitive ? "Rimuovi protezione impronta" : "Proteggi con impronta"}
          >
            <Lock className={`w-4 h-4 ${sensitive ? 'text-amber-500 fill-amber-500/20' : ''}`} />
          </button>
        )}
      </div>

      <div className="flex-1 space-y-4">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-black mb-1">Obiettivo Finale</p>
          <div className="text-2xl font-black text-[var(--text-main)]">
            €{module.targetAmount.toFixed(2)}
          </div>
        </div>

        <div>
          <div className="flex justify-between text-xs font-bold text-[var(--text-muted)] mb-2">
            <span>Versato: €{paidAmount.toFixed(2)}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-2 w-full bg-[var(--border)] rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: `${Math.min(100, progress)}%` }} />
          </div>
        </div>

        {nextPayment ? (
          <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-[10px] text-amber-600/80 uppercase font-black tracking-wider">Prossima Rata</p>
              <p className="font-bold text-amber-600 text-sm">€{nextPayment.amount.toFixed(2)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-amber-600/80">
                {new Date(nextPayment.dueDate).toLocaleDateString()}
              </p>
            </div>
          </div>
        ) : payments.length > 0 ? (
          <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-2 text-emerald-600">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-widest">Saldato!</span>
          </div>
        ) : null}
      </div>

      <AnimatePresence>
        {showMenu && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-6 gap-3"
            onClick={(e) => { e.stopPropagation(); setShowMenu(false); }}
          >
            <h4 className="text-white font-bold text-lg mb-2 text-center line-clamp-1">{module.title || 'Opzioni'}</h4>
            
            <button 
              onClick={(e) => { e.stopPropagation(); setShowMenu(false); onEdit(module); }}
              className="w-full flex items-center justify-center gap-2 bg-indigo-500 text-white py-3 px-4 rounded-xl font-bold shadow-lg active:scale-95 transition-transform"
            >
              <Pencil className="w-5 h-5" />
              <span>Modifica</span>
            </button>

            <button 
              onClick={(e) => { e.stopPropagation(); setShowMenu(false); onDelete(module.id); }}
              className="w-full flex items-center justify-center gap-2 bg-red-500/20 text-red-500 py-3 px-4 rounded-xl font-bold border border-red-500/30 active:scale-95 transition-transform"
            >
              <Trash2 className="w-5 h-5" />
              <span>Elimina</span>
            </button>
            
            <button 
              onClick={(e) => { e.stopPropagation(); setShowMenu(false); }}
              className="mt-4 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
