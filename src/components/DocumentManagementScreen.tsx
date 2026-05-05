import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DocumentModule } from '../types';
import { ArrowLeft, FileText, Calendar, Shield, Trash2, Edit2, Save, Download, Eye, QrCode, Share2, MoreVertical, X, Clock, MapPin, Building2, Hash } from 'lucide-react';

interface DocumentManagementScreenProps {
  module: DocumentModule;
  onSave: (m: DocumentModule) => void;
  onCancel: () => void;
  onDelete?: (id: string) => void;
  onShare?: (m: DocumentModule) => void;
}

export const DocumentManagementScreen = ({ module, onSave, onCancel, onDelete, onShare }: DocumentManagementScreenProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [data, setData] = useState<DocumentModule>({ ...module });
  const [showViewer, setShowViewer] = useState(false);

  const handleSave = () => {
    onSave({
      ...data,
      updatedAt: new Date().toISOString()
    });
    setIsEditing(false);
  };

  const getDocTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      identity: 'Carta d\'Identità',
      driving_license: 'Patente di Guida',
      tax_code: 'Codice Fiscale',
      generic: 'Documento Generico'
    };
    return labels[type] || type;
  };

  const isExpired = data.expiryDate && new Date(data.expiryDate) < new Date();
  const expiresSoon = data.expiryDate && !isExpired && (new Date(data.expiryDate).getTime() - new Date().getTime()) < (30 * 24 * 60 * 60 * 1000);

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
          <div>
            <h2 className="text-lg font-black text-[var(--text-main)] uppercase tracking-tight leading-none">
              {data.title || getDocTypeLabel(data.documentType)}
            </h2>
            <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mt-1">
              Archivio Documentale Digitale
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
           {!isEditing ? (
             <button 
               onClick={() => setIsEditing(true)}
               className="p-2 bg-[var(--accent-bg)] text-[var(--accent)] border border-[var(--accent)]/20 rounded-xl hover:bg-[var(--accent)] hover:text-white transition-all"
             >
               <Edit2 className="w-4 h-4" />
             </button>
           ) : (
             <button 
               onClick={handleSave}
               className="p-2 bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
             >
               <Save className="w-4 h-4" />
             </button>
           )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-2xl mx-auto p-6 space-y-8">
          
          {/* Document Preview Card */}
          <div className="relative aspect-[1.6/1] bg-[var(--card-bg)] border border-[var(--border)] rounded-[2.5rem] overflow-hidden shadow-2xl group cursor-pointer" onClick={() => setShowViewer(true)}>
             <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5" />
             
             {/* Document "Chip" Style Layout */}
             <div className="relative h-full p-8 flex flex-col justify-between">
                <div className="flex justify-between items-start">
                   <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-indigo-500 text-white rounded-2xl flex items-center justify-center shadow-lg">
                         <FileText className="w-6 h-6" />
                      </div>
                      <div>
                         <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">{getDocTypeLabel(data.documentType)}</p>
                         <h3 className="text-xl font-black text-[var(--text-main)] tracking-tight">{data.number || '--- --- ---'}</h3>
                      </div>
                   </div>
                   {isExpired ? (
                     <div className="bg-red-500 text-white px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-red-500/20">Scaduto</div>
                   ) : expiresSoon ? (
                     <div className="bg-amber-500 text-white px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-amber-500/20">In Scadenza</div>
                   ) : (
                     <div className="bg-emerald-500 text-white px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20">Valido</div>
                   )}
                </div>

                <div className="grid grid-cols-2 gap-8">
                   <div>
                      <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">Rilasciato il</p>
                      <p className="text-sm font-bold text-[var(--text-main)]">{data.issueDate ? new Date(data.issueDate).toLocaleDateString('it-IT') : '---'}</p>
                   </div>
                   <div>
                      <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">Scadenza</p>
                      <p className="text-sm font-bold text-[var(--text-main)]">{data.expiryDate ? new Date(data.expiryDate).toLocaleDateString('it-IT') : '---'}</p>
                   </div>
                </div>

                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                   <div className="bg-white text-black px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-xl">
                      <Eye className="w-4 h-4" />
                      Visualizza PDF
                   </div>
                </div>
             </div>
          </div>

          {/* Details & Metadata Grid */}
          <div className="space-y-6">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-5 flex items-center gap-4">
                   <div className="w-10 h-10 bg-[var(--bg)] rounded-xl flex items-center justify-center text-[var(--text-muted)] border border-[var(--border)]">
                      <Building2 className="w-5 h-5" />
                   </div>
                   <div>
                      <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-0.5">Ente Emissione</p>
                      <p className="text-xs font-bold text-[var(--text-main)]">{data.issuedBy || 'Non specificato'}</p>
                   </div>
                </div>
                <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-5 flex items-center gap-4">
                   <div className="w-10 h-10 bg-[var(--bg)] rounded-xl flex items-center justify-center text-[var(--text-muted)] border border-[var(--border)]">
                      <Hash className="w-5 h-5" />
                   </div>
                   <div>
                      <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-0.5">Numero Doc</p>
                      <p className="text-xs font-bold text-[var(--text-main)]">{data.number || '---'}</p>
                   </div>
                </div>
             </div>

             <div className="flex gap-4">
                <button 
                  onClick={() => onShare && onShare(data)}
                  className="flex-1 bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-4 flex items-center justify-center gap-3 hover:bg-[var(--surface-variant)] transition-all group"
                >
                   <QrCode className="w-5 h-5 text-indigo-500 group-hover:scale-110 transition-transform" />
                   <span className="text-xs font-bold text-[var(--text-main)] uppercase tracking-widest">Condividi QR</span>
                </button>
                {data.pdfAttachment && (
                  <button className="flex-1 bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-4 flex items-center justify-center gap-3 hover:bg-[var(--surface-variant)] transition-all group">
                     <Download className="w-5 h-5 text-emerald-500 group-hover:scale-110 transition-transform" />
                     <span className="text-xs font-bold text-[var(--text-main)] uppercase tracking-widest">Esporta</span>
                  </button>
                )}
             </div>
          </div>

          {/* Edit View Inline */}
          {isEditing && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[var(--card-bg)] border border-[var(--accent)]/30 rounded-3xl p-6 space-y-6 shadow-lg"
            >
               <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
                  <h4 className="font-black text-[10px] uppercase tracking-[0.2em] text-[var(--accent)]">Editor Documento</h4>
                  <X className="w-4 h-4 text-[var(--text-muted)] cursor-pointer" onClick={() => setIsEditing(false)} />
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2 block">Titolo</label>
                    <input 
                      type="text" 
                      value={data.title} 
                      onChange={e => setData({...data, title: e.target.value})} 
                      className="w-full p-4 bg-[var(--bg)] border border-[var(--border)] rounded-2xl outline-none focus:border-[var(--accent)] transition-all font-bold text-[var(--text-main)]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2 block">Numero</label>
                    <input 
                      type="text" 
                      value={data.number} 
                      onChange={e => setData({...data, number: e.target.value})} 
                      className="w-full p-4 bg-[var(--bg)] border border-[var(--border)] rounded-2xl outline-none focus:border-[var(--accent)] transition-all font-bold text-[var(--text-main)]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2 block">Tipo</label>
                    <select 
                      value={data.documentType} 
                      onChange={e => setData({...data, documentType: e.target.value})} 
                      className="w-full p-4 bg-[var(--bg)] border border-[var(--border)] rounded-2xl outline-none focus:border-[var(--accent)] transition-all font-bold text-[var(--text-main)]"
                    >
                       <option value="identity">Carta Identità</option>
                       <option value="driving_license">Patente</option>
                       <option value="tax_code">Codice Fiscale</option>
                       <option value="generic">Altro</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2 block">Data Emissione</label>
                    <input type="date" value={data.issueDate} onChange={e => setData({...data, issueDate: e.target.value})} className="w-full p-4 bg-[var(--bg)] border border-[var(--border)] rounded-2xl outline-none focus:border-[var(--accent)] transition-all font-bold text-[var(--text-main)]" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2 block">Data Scadenza</label>
                    <input type="date" value={data.expiryDate} onChange={e => setData({...data, expiryDate: e.target.value})} className="w-full p-4 bg-[var(--bg)] border border-[var(--border)] rounded-2xl outline-none focus:border-[var(--accent)] transition-all font-bold text-[var(--text-main)]" />
                  </div>
               </div>
               <div className="pt-4 flex gap-3">
                  <button onClick={handleSave} className="flex-1 py-4 bg-[var(--accent)] text-white rounded-2xl font-bold uppercase tracking-widest">Applica Modifiche</button>
                  {onDelete && (
                    <button 
                      onClick={() => { if(window.confirm('Eliminare questo documento?')) { onDelete(data.id); onCancel(); } }} 
                      className="p-4 bg-red-500/10 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all"
                    >
                      <Trash2 className="w-6 h-6" />
                    </button>
                  )}
               </div>
            </motion.div>
          )}

        </div>
      </div>

      {/* PDF Viewer Modal Override */}
      <AnimatePresence>
         {showViewer && data.pdfAttachment && (
           <div className="fixed inset-0 z-[200] bg-black flex flex-col animate-fade-in">
              <div className="p-4 flex items-center justify-between border-b border-white/10 shrink-0">
                 <h4 className="text-white font-bold">{data.title || 'Anteprima PDF'}</h4>
                 <button onClick={() => setShowViewer(false)} className="p-2 bg-white/10 rounded-xl text-white">
                    <X className="w-6 h-6" />
                 </button>
              </div>
              <iframe src={data.pdfAttachment} className="flex-1 w-full border-none" title="PDF Viewer" />
           </div>
         )}
      </AnimatePresence>
    </motion.div>
  );
};
