import React, { useState, useEffect } from 'react';
import { ArrowLeft, Wallet, Receipt, Calendar, Tag, FileText, Camera, Paperclip, Check, X, Trash2, Eye, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SingleExpenseModule } from '../types';
import { EXPENSE_CATEGORIES, CURRENCIES } from '../constants/expenses';
import { DocumentScanner } from './DocumentScanner';
import { DocumentViewer } from './DocumentViewer';

interface SingleExpenseScreenProps {
  module: SingleExpenseModule;
  onClose: () => void;
  onSave: (m: SingleExpenseModule) => void;
  onSaveToSandbox?: (title: string, base64: string) => Promise<void>;
}



export const SingleExpenseScreen = ({ module, onClose, onSave, onSaveToSandbox }: SingleExpenseScreenProps) => {
  const [formData, setFormData] = useState<SingleExpenseModule>({
    ...module,
    amount: module.amount || 0,
    date: module.date || new Date().toISOString().substring(0, 10),
    category: module.category || 'other',
    description: module.description || '',
    currency: module.currency || 'EUR',
  });

  const [showScanner, setShowScanner] = useState(false);
  const [viewingAttachment, setViewingAttachment] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [shouldArchive, setShouldArchive] = useState(false);

  const handleSave = async () => {
    if (formData.amount <= 0 || !formData.description) {
      alert("Inserisci un importo valido e una descrizione.");
      return;
    }

    setIsProcessing(true);
    if (shouldArchive && formData.attachment && onSaveToSandbox) {
      await onSaveToSandbox(`Ricevuta: ${formData.description}`, formData.attachment);
    }
    
    onSave(formData);
    setIsProcessing(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setFormData(prev => ({ ...prev, attachment: ev.target?.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] bg-[var(--bg)] flex flex-col h-[100dvh] overflow-hidden font-sans transition-colors duration-300">
      {/* Header */}
      <header className="h-20 border-b border-[var(--border)] bg-[var(--header-bg)] backdrop-blur-2xl px-6 flex items-center justify-between shrink-0 z-20 safe-area-header">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-3 bg-[var(--card-bg)] border border-[var(--border)] hover:bg-[var(--border)] rounded-2xl transition-all shadow-sm">
            <ArrowLeft className="w-6 h-6 text-[var(--text-main)]" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-[var(--text-main)]">Dettaglio Spesa</h2>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Gestione Spesa Singola</p>
          </div>
        </div>
        <button 
          onClick={handleSave}
          disabled={isProcessing}
          className="flex items-center gap-2 bg-emerald-500 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-emerald-500/20 active:scale-95 transition-all disabled:opacity-50"
        >
          {isProcessing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
          <span>Salva</span>
        </button>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto w-full max-w-2xl mx-auto p-6 space-y-8 custom-scrollbar">
        
        {/* Amount Section */}
        <div className="bg-[var(--card-bg)] p-8 rounded-[2.5rem] border border-[var(--border)] shadow-sm text-center">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mb-4 block">Importo Spesa</label>
          <div className="relative flex items-center justify-center gap-3">
            <select 
              value={formData.currency}
              onChange={e => setFormData(prev => ({ ...prev, currency: e.target.value }))}
              className="bg-[var(--bg)] border border-[var(--border)] rounded-xl px-2 py-1 text-xs font-black text-amber-500 outline-none focus:border-amber-500 transition-all"
            >
              {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input 
              type="number" 
              step="0.01"
              value={formData.amount || ''}
              onChange={e => setFormData(prev => ({ ...prev, amount: Number(e.target.value) }))}
              className="bg-transparent border-none text-5xl font-black text-[var(--text-main)] text-center outline-none w-48 placeholder:text-[var(--text-muted)]"
              placeholder="0.00"
            />
          </div>
        </div>

        {/* Details Form */}
        <div className="space-y-6">
          {/* Description */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">
              <FileText className="w-3.5 h-3.5" /> Descrizione
            </label>
            <input 
              type="text"
              value={formData.description}
              onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Cosa hai comprato?"
              className="w-full p-5 bg-[var(--card-bg)] border border-[var(--border)] rounded-3xl outline-none focus:border-[var(--accent)] transition-all font-bold text-[var(--text-main)] placeholder:text-[var(--text-muted)]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Category */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">
                <Tag className="w-3.5 h-3.5" /> Categoria
              </label>
              <select 
                value={formData.category}
                onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))}
                className="w-full p-5 bg-[var(--card-bg)] border border-[var(--border)] rounded-3xl outline-none focus:border-[var(--accent)] transition-all font-bold text-[var(--text-main)] appearance-none"
              >
                {EXPENSE_CATEGORIES.map(c => (
                  <option key={c.id} value={c.id}>{c.icon} {c.label}</option>
                ))}
              </select>
            </div>

            {/* Date */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">
                <Calendar className="w-3.5 h-3.5" /> Data Spesa
              </label>
              <input 
                type="date"
                value={formData.date}
                onChange={e => setFormData(prev => ({ ...prev, date: e.target.value }))}
                className="w-full p-5 bg-[var(--card-bg)] border border-[var(--border)] rounded-3xl outline-none focus:border-[var(--accent)] transition-all font-bold text-[var(--text-main)]"
              />
            </div>

            {/* Expiry Date */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-amber-500 ml-1">
                <Calendar className="w-3.5 h-3.5" /> Scadenza (Opz.)
              </label>
              <input 
                type="date"
                value={formData.expiryDate || ''}
                onChange={e => setFormData(prev => ({ ...prev, expiryDate: e.target.value }))}
                className="w-full p-5 bg-[var(--card-bg)] border border-[var(--border)] rounded-3xl outline-none focus:border-amber-500 transition-all font-bold text-[var(--text-main)]"
              />
            </div>
          </div>

          {/* Attachments Section */}
          <div className="space-y-4">
            <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">
              <Paperclip className="w-3.5 h-3.5" /> Documenti e Scontrini
            </label>
            
            <div className="bg-[var(--card-bg)] p-6 rounded-[2.5rem] border border-[var(--border)] shadow-sm">
              {formData.attachment ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-[var(--bg)] rounded-3xl border border-[var(--border)]">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                        <Check className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[var(--text-main)]">Documento Allegato</p>
                        <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Pronto per il salvataggio</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setViewingAttachment(formData.attachment!)}
                        className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all text-[var(--text-main)]"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => setFormData(prev => ({ ...prev, attachment: undefined }))}
                        className="p-3 bg-red-500/5 hover:bg-red-500/10 rounded-xl transition-all text-red-500"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-4 bg-amber-500/5 rounded-3xl border border-amber-500/20">
                    <input 
                      type="checkbox"
                      id="singleArchive"
                      checked={shouldArchive}
                      onChange={e => setShouldArchive(e.target.checked)}
                      className="w-5 h-5 rounded-lg border-[var(--border)] text-amber-500 focus:ring-amber-500"
                    />
                    <label htmlFor="singleArchive" className="text-xs font-bold text-[var(--text-main)] cursor-pointer select-none">
                      Salva una copia nell'archivio documenti (Sandbox)
                    </label>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => setShowScanner(true)}
                    className="flex flex-col items-center justify-center gap-3 p-8 bg-[var(--bg)] border-2 border-dashed border-[var(--border)] hover:border-amber-500/50 hover:bg-amber-500/5 rounded-3xl transition-all group"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform">
                      <Camera className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Scansiona</span>
                  </button>

                  <label className="flex flex-col items-center justify-center gap-3 p-8 bg-[var(--bg)] border-2 border-dashed border-[var(--border)] hover:border-amber-500/50 hover:bg-amber-500/5 rounded-3xl transition-all group cursor-pointer">
                    <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                      <Paperclip className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Allega</span>
                    <input type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileUpload} />
                  </label>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showScanner && (
          <DocumentScanner 
            onCapture={(pdf) => { setFormData(prev => ({ ...prev, attachment: pdf })); setShowScanner(false); }}
            onClose={() => setShowScanner(false)}
          />
        )}
        {viewingAttachment && (
          <DocumentViewer 
            pdfBase64={viewingAttachment}
            title={formData.description || 'Allegato Spesa'}
            onClose={() => setViewingAttachment(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
