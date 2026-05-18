import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DocumentModule } from '../types';
import { ArrowLeft, FileText, Calendar, Shield, Trash2, Edit2, Save, Download, Eye, QrCode, Share2, MoreVertical, X, Clock, MapPin, Building2, Hash, Copy, CheckCheck } from 'lucide-react';

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
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!data.number) return;
    const text = data.number;
    
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }).catch(() => {
          bulletproofCopy(text);
        });
      } else {
        bulletproofCopy(text);
      }
    } catch (err) {
      bulletproofCopy(text);
    }
  };

  const bulletproofCopy = (text: string) => {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.top = '0';
    textarea.style.left = '0';
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    textarea.style.width = '2em';
    textarea.style.height = '2em';
    textarea.style.padding = '0';
    textarea.style.border = 'none';
    textarea.style.outline = 'none';
    textarea.style.boxShadow = 'none';
    textarea.style.background = 'transparent';
    
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, 99999);
    
    let successful = false;
    try {
      successful = document.execCommand('copy');
    } catch (err) {
      successful = false;
    }
    
    if (successful) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      const result = window.prompt("Copia il codice fiscale:", text);
      if (result !== null) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
    document.body.removeChild(textarea);
  };

  const isTaxCode = data.documentType === 'tax_code';
  const isIdentity = data.documentType === 'identity';
  const isLicense = data.documentType === 'driving_license';
  const isColorCard = isTaxCode || isIdentity || isLicense;

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
          
          {/* === CODICE FISCALE CARD === */}
          {isTaxCode && (
            <div className="relative aspect-[1.6/1] rounded-[2rem] overflow-hidden shadow-2xl cursor-pointer group"
              style={{ background: 'linear-gradient(135deg, #0f766e 0%, #115e59 40%, #042f2e 100%)' }}
              onClick={() => setShowViewer(true)}
            >
              {/* Sfondo trama ministeriale e stellone italiano sfumato */}
              <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 0, transparent 50%)', backgroundSize: '8px 8px' }} />
              
              {/* Stellone d'Italia / Emblem Watermark in background */}
              <div className="absolute right-4 top-1/2 -translate-y-1/2 w-32 h-32 opacity-10 pointer-events-none text-white">
                <svg viewBox="0 0 100 100" fill="currentColor" className="w-full h-full">
                  <path d="M50 15 L58 38 L83 38 L63 53 L70 76 L50 61 L30 76 L37 53 L17 38 L42 38 Z" />
                  <circle cx="50" cy="50" r="22" fill="none" stroke="currentColor" strokeWidth="4" />
                </svg>
              </div>

              {/* Upper Section */}
              <div className="absolute top-4 left-4 right-4 flex items-start justify-between z-10">
                <div className="flex items-center gap-3">
                  {/* EU Band / Italian flag */}
                  <div className="w-7 h-5 bg-[#003399] rounded flex flex-col items-center justify-center relative overflow-hidden border border-white/10 shrink-0">
                    <span className="text-[7px] text-white font-black z-10 leading-none">IT</span>
                  </div>
                  <div>
                    <p className="text-[6.5px] font-black text-teal-200 uppercase tracking-[0.2em] leading-tight m-0">REPUBBLICA ITALIANA</p>
                    <p className="text-[8px] font-black text-white uppercase tracking-widest leading-tight m-0">TESSERA SANITARIA</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[6px] font-bold text-white/45 uppercase tracking-widest leading-none m-0">MINISTERO DELL'ECONOMIA</p>
                  <p className="text-[6px] font-bold text-white/45 uppercase tracking-widest leading-none m-0">E DELLE FINANZE</p>
                </div>
              </div>

              {/* Middle Section: Smart-Card Chip & Codice Fiscale */}
              <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 flex items-center justify-between gap-4 z-10">
                {/* Microchip dorato realistico */}
                <div className="w-9 h-7 bg-gradient-to-br from-amber-300 via-yellow-400 to-amber-500 rounded-md border border-amber-600/30 relative overflow-hidden shadow-md flex flex-wrap p-0.5 opacity-90 shrink-0">
                  <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_45%,#d97706_45%,#d97706_55%,transparent_55%)] opacity-20" />
                  <div className="w-1/2 h-1/3 border-r border-b border-amber-700/20" />
                  <div className="w-1/2 h-1/3 border-b border-amber-700/20" />
                  <div className="w-1/2 h-1/3 border-r border-b border-amber-700/20" />
                  <div className="w-1/2 h-1/3 border-b border-amber-700/20" />
                  <div className="w-1/2 h-1/3 border-r border-amber-700/20" />
                  <div className="w-1/2 h-1/3" />
                </div>

                {/* Tactile strip containing the text-code */}
                <div className="flex-1 bg-emerald-50/95 rounded-xl border border-emerald-600/20 shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)] px-3 py-1.5 flex items-center justify-between min-w-0">
                  <span className="text-emerald-950 font-mono font-black text-xs sm:text-sm tracking-[0.12em] uppercase select-all truncate">
                    {data.number || 'RSSMRA80A01F205X'}
                  </span>
                  {data.number && (
                    <button
                      onClick={handleCopy}
                      className="p-1 rounded-lg hover:bg-emerald-500/10 text-emerald-800 hover:text-emerald-950 transition-colors active:scale-90 relative z-30 shrink-0"
                      title="Copia codice fiscale"
                    >
                      {copied
                        ? <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                        : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
              </div>

              {/* Lower Section (Barra Bassa) */}
              <div className="absolute bottom-0 left-0 right-0 h-10 bg-black/20 border-t border-white/5 backdrop-blur-sm flex items-center px-4 justify-between z-10">
                <div className="flex gap-4">
                  <div>
                    <p className="text-[6px] text-white/50 font-bold uppercase tracking-widest m-0">SCADENZA</p>
                    <p className="text-[8px] text-white font-black m-0">{data.expiryDate ? new Date(data.expiryDate).toLocaleDateString('it-IT') : '---'}</p>
                  </div>
                  <div>
                    <p className="text-[6px] text-white/50 font-bold uppercase tracking-widest m-0">RILASCIO</p>
                    <p className="text-[8px] text-white font-black m-0">{data.issueDate ? new Date(data.issueDate).toLocaleDateString('it-IT') : '---'}</p>
                  </div>
                </div>
                {isExpired
                  ? <div className="bg-red-500 text-white px-2 py-0.5 rounded-md text-[7px] font-black uppercase tracking-wider">SCADUTO</div>
                  : expiresSoon
                  ? <div className="bg-amber-400 text-black px-2 py-0.5 rounded-md text-[7px] font-black uppercase tracking-wider">IN SCADENZA</div>
                  : <div className="bg-emerald-400 text-black px-2 py-0.5 rounded-md text-[7px] font-black uppercase tracking-wider">VALIDO</div>
                }
              </div>

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm rounded-[2rem] z-20">
                <div className="bg-white text-black px-5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-xl">
                  <Eye className="w-4 h-4" /> Visualizza PDF
                </div>
              </div>
            </div>
          )}

          {/* === CARTA D'IDENTITÀ CARD === */}
          {isIdentity && (
            <div className="relative aspect-[1.6/1] rounded-[1.8rem] overflow-hidden shadow-2xl cursor-pointer group"
              style={{ background: 'linear-gradient(135deg, #1a3a6b 0%, #0d255c 50%, #061540 100%)' }}
              onClick={() => setShowViewer(true)}
            >
              {/* Pattern fondo */}
              <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '18px 18px' }} />

              {/* Fascia blu EU a sinistra */}
              <div className="absolute left-0 top-0 bottom-0 w-12 flex flex-col items-center justify-between py-3"
                style={{ background: 'rgba(0,47,135,0.8)' }}>
                <div className="flex flex-col items-center gap-0.5">
                  {/* Stelle EU */}
                  {Array.from({length: 6}).map((_,i) => (
                    <div key={i} className="text-yellow-300 text-[6px]">★</div>
                  ))}
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-[6px] font-black text-white/80 uppercase tracking-widest rotate-[-90deg] whitespace-nowrap" style={{transformOrigin:'center', writingMode: 'vertical-rl', textOrientation: 'mixed'}}>ITALIA</span>
                </div>
                <div className="flex flex-col items-center gap-0.5">
                  {Array.from({length: 6}).map((_,i) => (
                    <div key={i} className="text-yellow-300 text-[6px]">★</div>
                  ))}
                </div>
              </div>

              {/* Contenuto principale */}
              <div className="absolute left-14 right-3 top-3 bottom-10">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[6px] font-black text-blue-200/70 uppercase tracking-[0.2em]">CARTA D'IDENTITÀ ELETTRONICA</p>
                    <p className="text-[6px] text-white/50 uppercase tracking-widest">ELECTRONIC IDENTITY CARD</p>
                  </div>
                  <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
                    <span className="text-sm">🇮🇹</span>
                  </div>
                </div>

                <div className="mt-2 flex items-center gap-2">
                  <div>
                    <p className="text-[7px] text-white/50 uppercase tracking-widest">COGNOME / SURNAME</p>
                    <p className="text-sm font-black text-white tracking-wide">{data.title || '---'}</p>
                    <p className="text-[7px] text-white/50 uppercase tracking-widest mt-1">NUMERO / NUMBER</p>
                    <div className="flex items-center gap-1">
                      <p className="text-[11px] font-black text-white font-mono tracking-wider">{data.number || '---'}</p>
                      {data.number && (
                        <button onClick={handleCopy} className="p-1 rounded hover:bg-white/20 transition-colors relative z-30" title="Copia">
                          {copied ? <CheckCheck className="w-3 h-3 text-emerald-300" /> : <Copy className="w-3 h-3 text-white/60" />}
                        </button>
                      )}
                    </div>
                  </div>
                  {/* Chip NFC simulato */}
                  <div className="ml-auto w-10 h-8 rounded-md border border-yellow-400/40 bg-gradient-to-br from-yellow-300/20 to-yellow-500/10 flex items-center justify-center">
                    <div className="w-6 h-4 border border-yellow-400/60 rounded-sm bg-yellow-400/10" />
                  </div>
                </div>
              </div>

              {/* Barra bassa */}
              <div className="absolute bottom-0 left-0 right-0 h-8 bg-black/40 flex items-center px-4 justify-between">
                <p className="text-[7px] text-white/50 font-bold uppercase tracking-widest">SCAD: <span className="text-white">{data.expiryDate ? new Date(data.expiryDate).toLocaleDateString('it-IT') : '---'}</span></p>
                <p className="text-[7px] text-white/50 font-bold uppercase tracking-widest">RIL: <span className="text-white">{data.issueDate ? new Date(data.issueDate).toLocaleDateString('it-IT') : '---'}</span></p>
                {isExpired
                  ? <div className="bg-red-500 text-white px-2 py-0.5 rounded-lg text-[7px] font-black uppercase">SCADUTO</div>
                  : expiresSoon
                  ? <div className="bg-amber-400 text-black px-2 py-0.5 rounded-lg text-[7px] font-black uppercase">IN SCADENZA</div>
                  : <div className="bg-emerald-400 text-black px-2 py-0.5 rounded-lg text-[7px] font-black uppercase">VALIDA</div>
                }
              </div>

              {/* Hover */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm rounded-[1.8rem]">
                <div className="bg-white text-black px-5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2">
                  <Eye className="w-4 h-4" /> Visualizza PDF
                </div>
              </div>
            </div>
          )}

          {/* === PATENTE DI GUIDA CARD === */}
          {isLicense && (
            <div className="relative aspect-[1.6/1] rounded-[1.8rem] overflow-hidden shadow-2xl cursor-pointer group"
              style={{ background: 'linear-gradient(135deg, #5b1fa3 0%, #3b0f6e 50%, #21094a 100%)' }}
              onClick={() => setShowViewer(true)}
            >
              <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'repeating-linear-gradient(-45deg, #fff 0, #fff 1px, transparent 0, transparent 8px)', backgroundSize: '12px 12px' }} />

              {/* Header */}
              <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center"><span className="text-base">🇮🇹</span></div>
                  <div>
                    <p className="text-[6px] font-black text-purple-200/70 uppercase tracking-[0.15em]">REPUBBLICA ITALIANA</p>
                    <p className="text-[7px] font-black text-white/50 uppercase tracking-widest">PATENTE DI GUIDA</p>
                    <p className="text-[6px] text-white/40 uppercase">DRIVING LICENCE</p>
                  </div>
                </div>
                {/* Categorie patente */}
                <div className="flex gap-1">
                  {['B', 'AM'].map(cat => (
                    <div key={cat} className="w-6 h-6 rounded-md bg-white/20 border border-white/30 flex items-center justify-center">
                      <span className="text-[8px] font-black text-white">{cat}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Centro */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-[8px] font-black text-purple-300/60 uppercase tracking-widest mb-1">NUMERO PATENTE</p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-black text-white font-mono tracking-[0.2em] drop-shadow-lg">
                    {data.number || '--- --- ---'}
                  </p>
                  {data.number && (
                    <button onClick={handleCopy} className="p-1.5 rounded-lg hover:bg-white/20 transition-colors relative z-30" title="Copia">
                      {copied ? <CheckCheck className="w-4 h-4 text-purple-200" /> : <Copy className="w-4 h-4 text-white/60" />}
                    </button>
                  )}
                </div>
                {copied && <p className="text-[9px] text-purple-300 font-bold mt-1 animate-pulse">Copiato!</p>}
              </div>

              {/* Barra bassa */}
              <div className="absolute bottom-0 left-0 right-0 h-10 bg-black/30 backdrop-blur-sm flex items-center px-4 justify-between">
                <div>
                  <p className="text-[7px] text-white/40 uppercase tracking-widest">SCADENZA</p>
                  <p className="text-[9px] text-white font-black">{data.expiryDate ? new Date(data.expiryDate).toLocaleDateString('it-IT') : '---'}</p>
                </div>
                <div>
                  <p className="text-[7px] text-white/40 uppercase tracking-widest">RILASCIO</p>
                  <p className="text-[9px] text-white font-black">{data.issueDate ? new Date(data.issueDate).toLocaleDateString('it-IT') : '---'}</p>
                </div>
                {isExpired
                  ? <div className="bg-red-500 text-white px-2 py-0.5 rounded-lg text-[7px] font-black uppercase">SCADUTA</div>
                  : expiresSoon
                  ? <div className="bg-amber-400 text-black px-2 py-0.5 rounded-lg text-[7px] font-black uppercase">IN SCADENZA</div>
                  : <div className="bg-purple-300 text-purple-900 px-2 py-0.5 rounded-lg text-[7px] font-black uppercase">VALIDA</div>
                }
              </div>

              {/* Hover */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm rounded-[1.8rem]">
                <div className="bg-white text-black px-5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2">
                  <Eye className="w-4 h-4" /> Visualizza PDF
                </div>
              </div>
            </div>
          )}

          {/* === DOCUMENTO GENERICO CARD === */}
          {!isColorCard && (
            <div className={`relative aspect-[1.6/1] border border-[var(--border)] rounded-[2.5rem] overflow-hidden shadow-2xl group cursor-pointer bg-[var(--card-bg)]`} onClick={() => setShowViewer(true)}>
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5" />
              <div className="relative h-full p-8 flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg bg-indigo-500 text-white">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">{getDocTypeLabel(data.documentType)}</p>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-black tracking-tight text-[var(--text-main)]">{data.number || '--- --- ---'}</h3>
                        {data.number && (
                          <button onClick={handleCopy} className="p-1.5 rounded-lg hover:bg-[var(--bg)] transition-colors relative z-30" title="Copia">
                            {copied ? <CheckCheck className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-[var(--text-muted)]" />}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  {isExpired
                    ? <div className="bg-red-500 text-white px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest">Scaduto</div>
                    : expiresSoon
                    ? <div className="bg-amber-500 text-white px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest">In Scadenza</div>
                    : <div className="bg-emerald-500 text-white px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest">Valido</div>
                  }
                </div>
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest mb-1 text-[var(--text-muted)]">Rilasciato il</p>
                    <p className="text-sm font-bold text-[var(--text-main)]">{data.issueDate ? new Date(data.issueDate).toLocaleDateString('it-IT') : '---'}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest mb-1 text-[var(--text-muted)]">Scadenza</p>
                    <p className="text-sm font-bold text-[var(--text-main)]">{data.expiryDate ? new Date(data.expiryDate).toLocaleDateString('it-IT') : '---'}</p>
                  </div>
                </div>
              </div>
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm rounded-[2.5rem]">
                <div className="bg-white text-black px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-xl">
                  <Eye className="w-4 h-4" /> Visualizza PDF
                </div>
              </div>
            </div>
          )}

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
