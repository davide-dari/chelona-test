import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trash2, AlertTriangle } from 'lucide-react';

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  icon?: 'trash' | 'alert';
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Sì, Elimina',
  cancelText = 'Annulla',
  icon = 'trash'
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-sm bg-[var(--card-bg)] rounded-[2.5rem] p-8 shadow-2xl border border-[var(--border)] text-center overflow-hidden"
          >
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 ${
              icon === 'trash' ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-500'
            }`}>
              {icon === 'trash' ? <Trash2 className="w-8 h-8" /> : <AlertTriangle className="w-8 h-8" />}
            </div>
            <h3 className="text-xl font-bold text-[var(--text-main)] mb-2">{title}</h3>
            <div className="text-[var(--text-muted)] text-sm mb-8">
              {message}
            </div>
            
            <div className="flex flex-col gap-3">
              <button
                onClick={onConfirm}
                className={`w-full py-4 text-white rounded-2xl font-bold transition-all shadow-lg active:scale-[0.98] ${
                  icon === 'trash' ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20' : 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20'
                }`}
              >
                {confirmText}
              </button>
              <button
                onClick={onCancel}
                className="w-full py-4 bg-[var(--bg)] hover:bg-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-main)] rounded-2xl font-bold transition-all"
              >
                {cancelText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
