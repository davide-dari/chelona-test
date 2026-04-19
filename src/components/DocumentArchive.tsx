import React, { useState } from 'react';
import { Book, Eye, Search as SearchIcon, FileDown, X } from 'lucide-react';
import { Module } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { DocumentViewer } from './DocumentViewer';

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
      className="fixed inset-0 z-[100001] bg-[var(--bg)]/95 backdrop-blur-xl flex flex-col p-4 lg:p-10 h-[100dvh] overflow-hidden"
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

      <DocumentViewer
        isOpen={!!viewingDoc}
        onClose={() => setViewingDoc(null)}
        title={viewingTitle}
        data={viewingDoc || ''}
        type="pdf"
      />
    </motion.div>
  );
};
