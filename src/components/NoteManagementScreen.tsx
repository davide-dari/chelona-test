import React, { useState } from 'react';
import { motion } from 'motion/react';
import { GenericModule } from '../types';
import { ArrowLeft, StickyNote, Save, Trash2, Calendar, Share2, Copy, Check, Clock, Edit3, X } from 'lucide-react';

interface NoteManagementScreenProps {
  module: GenericModule;
  onSave: (m: GenericModule) => void;
  onCancel: () => void;
  onDelete?: (id: string) => void;
}

export const NoteManagementScreen = ({ module, onSave, onCancel, onDelete }: NoteManagementScreenProps) => {
  const [data, setData] = useState<GenericModule>({ ...module });
  const [copied, setCopied] = useState(false);

  const handleSave = () => {
    onSave({
      ...data,
      updatedAt: new Date().toISOString()
    });
    onCancel();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(data.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-[var(--accent-bg)] rounded-xl flex items-center justify-center text-[var(--accent)]">
                <StickyNote className="w-5 h-5" />
             </div>
             <div>
               <h2 className="text-lg font-black text-[var(--text-main)] uppercase tracking-tight leading-none">
                 Appunto
               </h2>
               <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mt-1">
                 {data.template === 'none' ? 'Note Libere' : data.template}
               </p>
             </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <button 
             onClick={handleSave}
             className="px-5 py-2.5 bg-[var(--accent)] text-white rounded-2xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-[var(--accent)]/20 active:scale-95 transition-all flex items-center gap-2"
           >
             <Save className="w-4 h-4" />
             Salva
           </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
        <div className="max-w-2xl mx-auto space-y-6">
           
           {/* Editor / Content */}
           <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[2.5rem] shadow-xl overflow-hidden flex flex-col min-h-[50vh]">
              <div className="p-6 border-b border-[var(--border)] flex items-center justify-between bg-[var(--surface-variant)]/30">
                 <div className="flex items-center gap-4">
                    <Edit3 className="w-4 h-4 text-[var(--text-muted)]" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">Contenuto Nota</span>
                 </div>
                 <div className="flex items-center gap-2">
                    <button onClick={handleCopy} className="p-2 hover:bg-[var(--bg)] rounded-xl transition-colors text-[var(--text-muted)]" title="Copia">
                       {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                 </div>
              </div>
              <textarea 
                value={data.content}
                onChange={e => setData({...data, content: e.target.value})}
                placeholder="Inizia a scrivere qui..."
                className="flex-1 p-8 bg-transparent outline-none text-base font-medium text-[var(--text-main)] leading-relaxed resize-none placeholder:text-[var(--text-muted)]/30"
              />
           </div>

           {/* Metadata Row */}
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-5 flex items-center gap-4">
                 <div className="w-10 h-10 bg-[var(--bg)] rounded-xl flex items-center justify-center text-[var(--text-muted)]">
                    <Clock className="w-5 h-5" />
                 </div>
                 <div>
                    <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-0.5">Ultima Modifica</p>
                    <p className="text-xs font-bold text-[var(--text-main)]">
                       {data.updatedAt ? new Date(data.updatedAt).toLocaleString('it-IT') : 'Adesso'}
                    </p>
                 </div>
              </div>
              <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-5 flex items-center gap-4">
                 <div className="w-10 h-10 bg-[var(--bg)] rounded-xl flex items-center justify-center text-[var(--text-muted)]">
                    <Calendar className="w-5 h-5" />
                 </div>
                 <div className="flex-1">
                    <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-0.5">Scadenza / Data</p>
                    <input 
                      type="date"
                      value={data.date || ''}
                      onChange={e => setData({...data, date: e.target.value})}
                      className="w-full bg-transparent outline-none text-xs font-bold text-[var(--text-main)]"
                    />
                 </div>
              </div>
           </div>

           {/* Delete Area */}
           {onDelete && (
             <div className="pt-10 flex justify-center">
                <button 
                  onClick={() => { if(window.confirm('Eliminare questo appunto?')) { onDelete(data.id); onCancel(); } }}
                  className="flex items-center gap-2 px-6 py-3 bg-red-500/10 text-red-500 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all shadow-sm shadow-red-500/10"
                >
                   <Trash2 className="w-4 h-4" />
                   Elimina Appunto
                </button>
             </div>
           )}

        </div>
      </div>
    </motion.div>
  );
};
