import React, { useState } from 'react';
import { Book, Eye, Search as SearchIcon, FileDown, X } from 'lucide-react';
import { Module } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface DocumentArchiveProps {
  modules: Module[];
  onClose: () => void;
}

export const DocumentArchive = ({ modules, onClose }: DocumentArchiveProps) => {
  const [archiveSearch, setArchiveSearch] = useState('');
  const [viewingDoc, setViewingDoc] = useState<string | null>(null);
  const [viewingTitle, setViewingTitle] = useState('');

  const filteredModules = modules.filter(m => {
    const hasPdf = (m as any).pdfAttachment || (m as any).receiptAttachment;
    if (!hasPdf) return false;
    const title = (m.title || '').toLowerCase();
    const search = archiveSearch.toLowerCase();
    return title.includes(search);
  });

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed inset-0 z-[100001] bg-[var(--bg)]/95 backdrop-blur-xl flex flex-col p-4 lg:p-10"
    >
      <div className="max-w-[1200px] mx-auto w-full flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500 shadow-sm">
              <Book className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl lg:text-3xl font-extrabold text-[var(--text-main)] tracking-tight">Archivio Documenti</h2>
              <p className="text-[var(--text-muted)] text-sm font-bold uppercase tracking-widest mt-0.5">Gestione Allegati PDF</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-3 bg-[var(--card-bg)] hover:bg-red-500/10 border border-[var(--border)] rounded-2xl text-[var(--text-muted)] hover:text-red-500 transition-all shadow-sm"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 flex flex-col min-h-0 bg-[var(--card-bg)] border border-[var(--border)] rounded-[2.5rem] shadow-2xl p-6 lg:p-10">
          <div className="relative group mb-8">
            <SearchIcon className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)] group-focus-within:text-amber-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Cerca tra i tuoi documenti salvati..." 
              value={archiveSearch}
              onChange={(e) => setArchiveSearch(e.target.value)}
              className="w-full pl-16 pr-8 py-5 bg-[var(--bg)] border border-[var(--border)] rounded-[2rem] outline-none focus:ring-4 focus:ring-amber-500/5 transition-all font-bold text-lg text-[var(--text-main)]"
            />
          </div>

          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredModules.map(m => (
                <div 
                  key={m.id} 
                  onClick={() => {
                    setViewingDoc((m as any).pdfAttachment || (m as any).receiptAttachment);
                    setViewingTitle(m.title || 'Documento senza titolo');
                  }}
                  className="bg-[var(--bg)] p-5 rounded-3xl border border-[var(--border)] hover:border-amber-500/50 shadow-sm transition-all cursor-pointer group hover:bg-[var(--bg)]/50"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform">
                      <Book className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-[var(--text-main)] truncate text-sm">{m.title || 'Senza Titolo'}</h4>
                      <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase mt-1">
                        {new Date(m.createdAt || Date.now()).toLocaleDateString('it-IT')}
                      </p>
                    </div>
                    <Eye className="w-4 h-4 text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              ))}
              
              {filteredModules.length === 0 && (
                <div className="col-span-full py-24 text-center">
                  <div className="w-20 h-20 bg-[var(--bg)] border border-[var(--border)] rounded-3xl flex items-center justify-center mx-auto mb-6">
                    <Book className="w-10 h-10 text-[var(--text-muted)] opacity-30" />
                  </div>
                  <h3 className="text-xl font-bold text-[var(--text-main)] mb-2">Nessun documento trovato</h3>
                  <p className="text-[var(--text-muted)] text-sm max-w-xs mx-auto">Non abbiamo trovato PDF che corrispondono alla tua ricerca nell'archivio.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Document Preview Modal */}
      {viewingDoc && (
        <div className="fixed inset-0 z-[100003] bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[var(--card-bg)] border border-[var(--border)] rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between p-6 border-b border-[var(--border)]">
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-[var(--text-main)] truncate uppercase tracking-wider">{viewingTitle}</h3>
                <p className="text-[9px] font-bold text-amber-500 uppercase tracking-widest mt-0.5">Visualizzatore Interno</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const base64 = viewingDoc.split(',')[1] || viewingDoc;
                    const binary = atob(base64);
                    const bytes = new Uint8Array(binary.length);
                    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
                    const blob = new Blob([bytes], { type: 'application/pdf' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `documento_${Date.now()}.pdf`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="p-2.5 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 rounded-xl transition-all"
                  title="Scarica"
                >
                  <FileDown className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewingDoc(null)}
                  className="p-2.5 hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-500 rounded-xl transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center p-10 bg-black/5">
              <div className="w-24 h-24 mb-6 bg-amber-500/10 rounded-3xl flex items-center justify-center text-amber-500">
                <Book className="w-12 h-12" />
              </div>
              <p className="text-sm font-bold text-[var(--text-main)] text-center mb-8">
                Documento pronto per la visualizzazione
              </p>
              <button
                onClick={() => {
                  const base64 = viewingDoc.split(',')[1] || viewingDoc;
                  const binary = atob(base64);
                  const bytes = new Uint8Array(binary.length);
                  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
                  const blob = new Blob([bytes], { type: 'application/pdf' });
                  const url = URL.createObjectURL(blob);
                  window.open(url, '_blank');
                  setTimeout(() => URL.revokeObjectURL(url), 60000);
                }}
                className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg"
              >
                <Eye className="w-5 h-5" /> Apri PDF Intero
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};
