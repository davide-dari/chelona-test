import React, { useState } from 'react';
import { CreditCard, ShieldCheck, Wallet, Fingerprint, Plus, Trash2, Calendar, DollarSign, Pencil, StickyNote, Copy, Check, GripVertical, Car, Wrench, AlertCircle, FileText, QrCode, FileDown, X, Clock, Eye, Lock, ChevronRight, Bell, BellOff, Gauge, Users } from 'lucide-react';
import { Module, GenericModule, AutoModule, DocumentModule, SplitModule } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { CAR_BRANDS } from '../utils/carBrands';
import JSZip from 'jszip';
import { encryption } from '../services/encryption';
import { notificationService } from '../services/notificationService';

interface ModuleWrapperProps {
  module: Module;
  onDelete: (id: string) => void;
  onEdit: (module: Module) => void;
  children: React.ReactNode;
  dragHandleProps?: any;
}

const ModuleWrapper = ({ module, onDelete, onEdit, children }: ModuleWrapperProps) => (
  <div className="module-card relative group flex flex-col bg-[var(--card-bg)] backdrop-blur-3xl rounded-[2.5rem] border border-[var(--border)] shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:shadow-[0_20px_50px_rgba(0,0,0,0.12)] transition-all p-5 sm:p-6 overflow-hidden">
    <div className="flex items-center justify-end mb-3 shrink-0">
      <div className="flex items-center gap-1.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all shrink-0">
        <button
          onClick={() => onEdit(module)}
          className="p-2 sm:p-1.5 hover:bg-[var(--bg)] text-[var(--text-muted)] hover:text-[var(--accent)] rounded-lg transition-all"
          title="Modifica"
        >
          <Pencil className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
        </button>
        <button
          onClick={() => onDelete(module.id)}
          className="p-2 sm:p-1.5 hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-500 rounded-lg transition-all"
          title="Elimina"
        >
          <Trash2 className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
        </button>
      </div>
    </div>
    <div className="flex-1 min-h-0">
      {children}
    </div>
  </div>
);



export const DocumentCard = ({ module, onDelete, onEdit, onShare, dragHandleProps }: { module: DocumentModule; onDelete: (id: string) => void; onEdit: (m: Module) => void; onShare: (m: Module) => void; dragHandleProps?: any }) => {
  const [showFullDoc, setShowFullDoc] = useState(false);

  const getDocTypeLabel = (type: string) => {
    switch (type) {
      case 'identity': return 'Carta d\'Identità';
      case 'driving_license': return 'Patente di Guida';
      case 'tax_code': return 'Codice Fiscale';
      case 'generic': return 'Documento';
      default: return type || 'Documento';
    }
  };

  const handleDownloadPdf = () => {
    if (!module.pdfAttachment) return;
    const link = document.createElement('a');
    link.href = module.pdfAttachment;
    link.download = `${module.title || 'documento'}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleViewPdf = () => {
    if (!module.pdfAttachment) return;
    try {
      const base64Data = module.pdfAttachment.split(',')[1] || module.pdfAttachment;
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
      console.error('Error viewing PDF', e);
    }
  };

  return (
    <>
      <ModuleWrapper module={module} onDelete={onDelete} onEdit={onEdit} dragHandleProps={dragHandleProps}>
        <div className="h-full flex flex-col">
          <div 
            className="flex-1 min-h-[90px] flex flex-col cursor-pointer group/card hover:bg-[var(--bg)] transition-colors p-3 -m-3 rounded-2xl"
            onClick={() => setShowFullDoc(true)}
            title="Clicca per i dettagli"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[13px] font-bold text-[var(--text-main)] truncate max-w-[140px]">
                {getDocTypeLabel(module.documentType)}
              </span>
              {module.pdfAttachment && (
                <div className="p-1 px-1.5 bg-emerald-500/10 text-emerald-500 rounded-md border border-emerald-500/20">
                  <FileText className="w-3 h-3" />
                </div>
              )}
            </div>

            {module.number && (
              <div className="text-[11px] font-mono font-bold text-[var(--text-muted)] bg-[var(--bg)] px-2 py-1 rounded-lg border border-[var(--border)] self-start mb-2">
                {module.number}
              </div>
            )}

            <div className="mt-auto pt-2 border-t border-[var(--border)] flex items-center justify-between">
              {module.expiryDate ? (
                <div className="flex items-center gap-1.5 text-[9px] font-extrabold uppercase text-[var(--danger)]">
                  <Clock className="w-3 h-3" />
                  <span>Scad: {module.expiryDate}</span>
                </div>
              ) : (
                <div className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-tight">Vedi dettagli</div>
              )}
              <div className="text-[var(--text-muted)] group-hover/card:text-[var(--accent)] transition-colors">
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-[var(--border)] shrink-0">
            <button
              onClick={() => onShare(module)}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-[var(--info-bg)] hover:bg-[var(--info)]/20 text-[var(--info)] border border-[var(--info)]/30 rounded-xl text-[10px] font-bold transition-all shadow-sm"
            >
              <QrCode className="w-3.5 h-3.5" />
              Condividi
            </button>
          </div>
        </div>
      </ModuleWrapper>

      <AnimatePresence>
        {showFullDoc && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowFullDoc(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-[var(--card-bg)] border border-[var(--border)] rounded-[2.5rem] shadow-2xl p-6 lg:p-8 w-full max-w-lg flex flex-col h-auto max-h-[90vh]"
            >
              <div className="flex items-center justify-between mb-6 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                    <FileText className="w-6 h-6 text-emerald-500" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-[var(--text-main)] leading-tight">{module.title || getDocTypeLabel(module.documentType)}</h3>
                    {module.number && <p className="text-xs font-mono font-bold text-[var(--text-muted)] tracking-wider mt-0.5">{module.number}</p>}
                  </div>
                </div>
                <button onClick={() => setShowFullDoc(false)} className="p-2 bg-[var(--bg)] hover:bg-red-500/10 border border-[var(--border)] rounded-xl text-[var(--text-muted)] hover:text-red-500 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="overflow-y-auto custom-scrollbar space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {module.issueDate && (
                    <div className="bg-[var(--bg)] p-4 rounded-2xl border border-[var(--border)] shadow-sm">
                      <span className="text-[var(--text-muted)] block mb-1 uppercase tracking-widest text-[9px] font-bold">Rilascio</span>
                      <span className="font-bold text-[var(--text-main)]">{module.issueDate}</span>
                    </div>
                  )}
                  {module.expiryDate && (
                    <div className="bg-[var(--bg)] p-4 rounded-2xl border border-[var(--border)] shadow-sm">
                      <span className="text-[var(--text-muted)] block mb-1 uppercase tracking-widest text-[9px] font-bold">Scadenza</span>
                      <span className="font-bold text-[var(--text-main)]">{module.expiryDate}</span>
                    </div>
                  )}
                  {module.issuedBy && (
                    <div className="bg-[var(--bg)] p-4 rounded-2xl border border-[var(--border)] col-span-2 shadow-sm">
                      <span className="text-[var(--text-muted)] block mb-1 uppercase tracking-widest text-[9px] font-bold">Ente Rilascio</span>
                      <span className="font-bold text-[var(--text-main)]">{module.issuedBy}</span>
                    </div>
                  )}
                </div>

                {module.pdfAttachment && (
                  <div className="flex items-center gap-2 pt-2">
                    <button
                      onClick={handleViewPdf}
                      className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 border border-emerald-500/30 rounded-2xl text-xs font-bold transition-all"
                    >
                      <Eye className="w-4 h-4" />
                      Apri PDF
                    </button>
                    <button
                      onClick={handleDownloadPdf}
                      className="p-3.5 bg-[var(--bg)] hover:bg-[var(--border)] text-[var(--text-main)] rounded-2xl transition-colors border border-[var(--border)]"
                      title="Scarica PDF"
                    >
                      <FileDown className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export const GenericCard = ({ module, onDelete, onEdit, onShare, dragHandleProps }: { module: GenericModule; onDelete: (id: string) => void; onEdit: (m: Module) => void; onShare: (m: Module) => void; dragHandleProps?: any }) => {
  const [copied, setCopied] = React.useState(false);
  const [showFullNote, setShowFullNote] = useState(false);

  const handleCopy = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(module.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <ModuleWrapper module={module} onDelete={onDelete} onEdit={onEdit} dragHandleProps={dragHandleProps}>
        <div className="flex flex-col gap-3">
          <div 
            className="bg-[var(--bg)] p-3 rounded-2xl border border-[var(--border)] overflow-hidden relative group/content shadow-inner cursor-pointer hover:border-[var(--accent)]/50 transition-all active:scale-[0.98]"
            onClick={() => setShowFullNote(true)}
            title="Clicca per leggere tutto"
          >
            <p className="text-[13px] text-[var(--text-main)] whitespace-pre-wrap leading-relaxed font-medium line-clamp-3 relative z-10">{module.content}</p>
            <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-[var(--bg)] to-transparent pointer-events-none" />
          </div>
          
          <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between">
            {module.date ? (
              <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase text-[var(--danger)]">
                <Clock className="w-3 h-3" />
                <span>{module.date}</span>
              </div>
            ) : (
              <div className="text-[9px] font-bold uppercase text-[var(--text-muted)]">
                Nota Libera
              </div>
            )}
            <button
              onClick={() => onShare(module)}
              className="p-2 bg-[var(--info-bg)] hover:bg-[var(--info)]/20 text-[var(--info)] border border-[var(--info)]/30 rounded-lg transition-colors"
            >
              <QrCode className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </ModuleWrapper>

      <AnimatePresence>
        {showFullNote && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowFullNote(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-[var(--card-bg)] border border-[var(--border)] rounded-[2.5rem] shadow-2xl p-6 lg:p-8 w-full max-w-2xl flex flex-col h-auto max-h-[90vh]"
            >
              <div className="flex items-center justify-between mb-5 shrink-0">
                <h3 className="text-lg font-bold text-[var(--text-main)] flex items-center gap-2.5">
                  <div className="p-2 bg-[var(--accent-bg)] rounded-xl border border-[var(--accent)]/30">
                    <StickyNote className="w-5 h-5 text-[var(--accent)]" />
                  </div>
                  <span className="truncate max-w-[200px] sm:max-w-xs">{module.title || 'Nota'}</span>
                </h3>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-2 px-3 py-2 bg-[var(--bg)] hover:bg-[var(--accent-bg)] border border-[var(--border)] rounded-xl text-xs font-bold text-[var(--text-muted)] hover:text-[var(--accent)] transition-all"
                  >
                    {copied ? <><Check className="w-3.5 h-3.5" /> Copiato</> : <><Copy className="w-3.5 h-3.5" /> Copia</>}
                  </button>
                  <button onClick={() => setShowFullNote(false)} className="p-2 bg-[var(--bg)] hover:bg-red-500/10 border border-[var(--border)] rounded-xl text-[var(--text-muted)] hover:text-red-500 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="overflow-y-auto custom-scrollbar bg-[var(--bg)] p-5 rounded-2xl border border-[var(--border)] shadow-inner">
                <p className="text-[15px] text-[var(--text-main)] whitespace-pre-wrap leading-relaxed font-medium">{module.content}</p>
              </div>
              
              {(module.date) && (
                <div className="mt-5 flex justify-end shrink-0">
                  <span className="text-xs font-semibold px-3 py-1.5 bg-[var(--danger-bg)] border border-[var(--danger)]/30 text-[var(--danger)] rounded-lg flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5"/> Scadenza: {module.date}
                  </span>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export const AutoCard = ({ module, onDelete, onEdit, onDirectUpdate, onShare, dragHandleProps }: { module: AutoModule; onDelete: (id: string) => void; onEdit: (m: Module) => void; onDirectUpdate?: (m: Module) => void; onShare: (m: Module) => void; dragHandleProps?: any }) => {
  const [showFullData, setShowFullData] = useState(false);
  const [showTireSnooze, setShowTireSnooze] = useState(false);
  const [tireSnoozeKm, setTireSnoozeKm] = useState('5000');
  const [copiedPlate, setCopiedPlate] = useState(false);
  const [notifConfig, setNotifConfig] = useState<{ field: string; label: string; type: 'date' | 'km'; targetValue: string } | null>(null);
  const [notifOffset, setNotifOffset] = useState(14);
  const [notifRefresh, setNotifRefresh] = useState(0);

  const handleViewPdf = (pdfBase64?: string) => {
    if (!pdfBase64) return;
    try {
      const base64Data = pdfBase64.split(',')[1] || pdfBase64;
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) byteNumbers[i] = byteCharacters.charCodeAt(i);
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
      console.error('Error viewing PDF', e);
    }
  };

  const hasAnyDoc = !!(module.insuranceDoc || module.taxDoc || module.revisionDoc || module.serviceDoc || module.tireDoc || module.battery12vDoc || module.hybridBatteryDoc);

  // Campi notifiche attive
  const activeNotifFields = React.useMemo(() => {
    const prefs = notificationService.getAll().filter(p => p.moduleId === module.id && p.enabled);
    return new Set(prefs.map(p => p.field));
  }, [module.id, notifRefresh]);

  const openNotifConfig = (e: React.MouseEvent, field: string, label: string, type: 'date' | 'km', targetValue: string) => {
    e.stopPropagation();
    const existing = notificationService.get(module.id, field);
    setNotifOffset(existing?.reminderOffset ?? (type === 'date' ? 14 : 1000));
    setNotifConfig({ field, label, type, targetValue });
  };
  
  const addYears = (dateStr: string, years: number) => {
    const d = new Date(dateStr);
    d.setFullYear(d.getFullYear() + years);
    return d.toISOString().split('T')[0];
  };

  const getEndOfMonth = (dateStr: string, years: number) => {
    const d = new Date(dateStr);
    d.setFullYear(d.getFullYear() + years);
    const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    const year = endOfMonth.getFullYear();
    const month = String(endOfMonth.getMonth() + 1).padStart(2, '0');
    const day = String(endOfMonth.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getDeadlines = () => {
    const deadlines: Array<{ label: string; date: string; field: string }> = [];
    if (module.lastInsurance) deadlines.push({ label: 'Assicurazione', date: addYears(module.lastInsurance, 1), field: 'lastInsurance' });

    if (module.lastRevision) {
      deadlines.push({ label: 'Revisione', date: getEndOfMonth(module.lastRevision, 2), field: 'lastRevision' });
    } else if (module.registrationYear) {
      deadlines.push({ label: 'Prima Revisione (Entro)', date: `${Number(module.registrationYear) + 4}-12-31`, field: 'registrationYear' });
    }

    if (module.lastTax) deadlines.push({ label: 'Bollo', date: getEndOfMonth(module.lastTax, 1), field: 'lastTax' });
    if (module.lastGplCylinder) deadlines.push({ label: 'Bombola GPL', date: addYears(module.lastGplCylinder, 10), field: 'lastGplCylinder' });
    if (module.lastMethaneCylinder) deadlines.push({ label: 'Bombola Metano', date: addYears(module.lastMethaneCylinder, module.methaneType === 'r110' ? 5 : 4), field: 'lastMethaneCylinder' });

    return deadlines.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  const deadlines = getDeadlines();
  
  const brandLogo = module.brand ? module.brand.toLowerCase().replace(/ /g, '-') : '';
  const hasLogo = CAR_BRANDS.includes(brandLogo);

  const handleCopyPlate = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (module.plate) {
      navigator.clipboard.writeText(module.plate);
      setCopiedPlate(true);
      setTimeout(() => setCopiedPlate(false), 2000);
    }
  };

  // Logica snooze gomme
  const currentKmNum = module.currentKm ? Number(module.currentKm) : null;
  const tiresKmNum = module.tiresKm ? Number(module.tiresKm) : null;
  const tiresSnoozeNum = module.tiresKmSnoozeUntil ? Number(module.tiresKmSnoozeUntil) : null;
  const tiresSnoozed = tiresSnoozeNum !== null && currentKmNum !== null && currentKmNum < tiresSnoozeNum;
  const tiresNextCheck = tiresSnoozed ? tiresSnoozeNum! : (tiresKmNum !== null ? tiresKmNum + 15000 : null);

  const handleApplyTireSnooze = () => {
    const addKm = parseInt(tireSnoozeKm) || 5000;
    const base = currentKmNum ?? tiresKmNum ?? 0;
    const snoozeTarget = base + addKm;
    const updated = { ...module, tiresKmSnoozeUntil: String(snoozeTarget) } as AutoModule;
    if (onDirectUpdate) onDirectUpdate(updated); else onEdit(updated);
    setShowTireSnooze(false);
    setShowFullData(false);
  };

  return (
    <>
      <ModuleWrapper module={module} onDelete={onDelete} onEdit={onEdit} dragHandleProps={dragHandleProps}>
        <div className="flex flex-col gap-3">
          <div 
            className="flex flex-col cursor-pointer group/card hover:bg-[var(--bg)] transition-colors p-3 -m-3 rounded-2xl active:scale-[0.98]"
            onClick={() => setShowFullData(true)}
            title="Dettagli Auto"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col flex-1">
                <h4 className="font-bold text-[13px] text-[var(--text-main)] leading-tight max-w-[140px] break-words">
                  {module.brand} {module.model}
                </h4>
                <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest mt-0.5 mb-2">
                  {module.fuelType} {module.registrationYear ? `• ${module.registrationYear}` : ''}
                </p>
                
                {module.plate && (
                  <div 
                    onClick={handleCopyPlate}
                    className="inline-flex items-center border border-gray-300 rounded-md bg-white shadow-sm h-[22px] overflow-hidden self-start cursor-pointer hover:border-blue-400 hover:shadow-md transition-all active:scale-95"
                    title="Copia Targa"
                  >
                    <div className="bg-blue-700 h-full w-[12px] flex flex-col items-center justify-end pb-[1px] shrink-0 pointer-events-none">
                      <div className="w-1 h-1 border border-yellow-400 rounded-full mb-[0.5px] opacity-80"></div>
                      <span className="text-[5px] text-white font-bold leading-none">I</span>
                    </div>
                    <span className="px-2 text-black font-bold font-mono text-[11px] tracking-widest uppercase mt-[0.5px] pointer-events-none">
                      {copiedPlate ? 'COPIATA' : module.plate}
                    </span>
                    <div className="bg-blue-700 h-full w-[12px] flex flex-col items-center justify-end shrink-0 pointer-events-none"></div>
                  </div>
                )}
              </div>

              <div className="w-11 h-11 bg-[var(--bg)] border border-[var(--border)] rounded-xl flex items-center justify-center shrink-0 overflow-hidden shadow-sm pointer-events-none">
                {hasLogo ? (
                  <img 
                    src={`/logo_auto/${brandLogo}.png`} 
                    alt={module.brand} 
                    className="w-7 h-7 object-contain opacity-90 transition-all" 
                    style={{ filter: 'contrast(1.1) brightness(1.1) saturate(0.8) grayscale(0.1) drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}
                  />
                ) : (
                  <Car className="w-5 h-5 text-gray-400" />
                )}
                {hasAnyDoc && (
                  <div className="absolute top-1 right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white shadow-sm" title="Documenti allegati" />
                )}
              </div>
            </div>

            <div className="mt-3 pt-2 border-t border-[var(--border)] flex items-center justify-between">
              <div className="text-[10px] text-[var(--text-muted)] font-medium">
                Proprietario: <span className="text-[var(--text-main)] font-bold">{module.driverName}</span>
              </div>
              <div className="text-[var(--text-muted)] group-hover/card:text-[var(--accent)] transition-colors">
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-[var(--border)]">
            <button
              onClick={() => onShare(module)}
              className="w-full flex items-center justify-center gap-2 py-2 bg-[var(--info-bg)] hover:bg-[var(--info)]/20 text-[var(--info)] border border-[var(--info)]/30 rounded-xl text-[10px] font-bold transition-all shadow-sm"
            >
              <QrCode className="w-3.5 h-3.5" />
              Condividi
            </button>
          </div>
        </div>
      </ModuleWrapper>

      <AnimatePresence>
        {showFullData && (
          <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowFullData(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              className="relative bg-[var(--card-bg)] border border-[var(--border)] rounded-3xl shadow-2xl w-[95vw] max-w-lg flex flex-col max-h-[92vh] overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-[var(--border)] shrink-0">
                <div className="w-10 h-10 bg-[var(--bg)] border border-[var(--border)] rounded-2xl flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
                  {hasLogo ? (
                    <img src={`/logo_auto/${brandLogo}.png`} alt={module.brand} className="w-7 h-7 object-contain" />
                  ) : (
                    <Car className="w-4 h-4 text-gray-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold text-[var(--text-main)] leading-tight">{module.brand} {module.model}</h3>
                  <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{module.plate}{module.registrationYear ? ` • ${module.registrationYear}` : ''}</p>
                </div>
                <button onClick={() => setShowFullData(false)} className="p-2 bg-[var(--bg)] hover:bg-red-500/10 border border-[var(--border)] rounded-xl text-[var(--text-muted)] hover:text-red-500 transition-colors shrink-0">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Scrollable body */}
              <div className="overflow-y-auto custom-scrollbar px-5 py-4 space-y-4">

                {/* Scadenze — 2-col grid */}
                {deadlines.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-3.5 h-3.5 text-[var(--accent)]" />
                      <span className="text-[10px] font-bold text-[var(--accent)] uppercase tracking-wider">Scadenze</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {deadlines.map((d, i) => (
                        <div key={i} className="bg-[var(--bg)] border border-[var(--border)] rounded-2xl px-3 py-2.5">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider">{d.label}</p>
                              <div className="flex items-center gap-1">
                                {module[d.field + 'Doc' as keyof AutoModule] && (
                                  <button onClick={(e) => { e.stopPropagation(); handleViewPdf(module[d.field + 'Doc' as keyof AutoModule] as string); }} className="p-1 text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-all" title="Vedi documento">
                                    <FileText className="w-3 h-3" />
                                  </button>
                                )}
                                <button
                                  onClick={e => openNotifConfig(e, d.field, d.label, 'date', d.date)}
                                  className={`p-1 rounded-lg transition-all ${activeNotifFields.has(d.field) ? 'text-[var(--accent)] bg-[var(--accent-bg)]' : 'text-[var(--text-muted)]/40 hover:text-[var(--accent)] hover:bg-[var(--accent-bg)]'}`}
                                  title={activeNotifFields.has(d.field) ? 'Notifica attiva' : 'Imposta notifica'}
                                >
                                  <Bell className="w-3 h-3" />
                                </button>
                              </div>
                          </div>
                          <p className="text-sm font-bold text-[var(--text-main)]">{new Date(d.date).toLocaleDateString('it-IT')}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Manutenzione — 2-col grid */}
                {(module.currentKm || module.lastServiceKm || module.tiresKm || module.battery12vWarranty || module.hybridBatteryWarranty) && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Wrench className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                      <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Manutenzione</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {module.currentKm && (
                        <div className="bg-[var(--bg)] border border-[var(--border)] rounded-2xl px-4 py-3">
                          <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Km Attuali</p>
                          <p className="text-sm font-bold text-[var(--text-main)]">{Number(module.currentKm).toLocaleString('it-IT')} km</p>
                        </div>
                      )}
                      {module.lastServiceKm && (
                        <div className="bg-[var(--bg)] border border-[var(--border)] rounded-2xl px-3 py-2.5">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Prossimo Tagliando</p>
                              <div className="flex items-center gap-1">
                                {module.serviceDoc && (
                                  <button onClick={(e) => { e.stopPropagation(); handleViewPdf(module.serviceDoc); }} className="p-1 text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-all" title="Vedi tagliando">
                                    <FileText className="w-3 h-3" />
                                  </button>
                                )}
                                <button
                                  onClick={e => openNotifConfig(e, 'lastServiceKm', 'Tagliando', 'km', String(Number(module.lastServiceKm) + 15000))}
                                  className={`p-1 rounded-lg transition-all ${activeNotifFields.has('lastServiceKm') ? 'text-amber-500 bg-amber-500/10' : 'text-[var(--text-muted)]/40 hover:text-amber-400 hover:bg-amber-400/10'}`}
                                  title={activeNotifFields.has('lastServiceKm') ? 'Notifica attiva' : 'Imposta notifica'}
                                >
                                  <Bell className="w-3 h-3" />
                                </button>
                              </div>
                          </div>
                          <p className="text-sm font-bold text-[var(--accent)]">~ {Number(module.lastServiceKm) + 15000} km</p>
                        </div>
                      )}
                      {module.tiresKm && (
                        <div className="relative group/tire">
                          <button
                            onClick={() => setShowTireSnooze(true)}
                            className={`bg-[var(--bg)] border rounded-2xl px-4 py-3 text-left w-full transition-all hover:shadow-sm ${
                              tiresSnoozed
                                ? 'border-blue-400/40 hover:border-blue-400/70 shadow-sm shadow-blue-400/5'
                                : 'border-[var(--border)] hover:border-blue-400/40'
                            }`}
                            title={tiresSnoozed ? 'Modifica eccezione' : 'Posticipa controllo'}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <p className={`text-[9px] font-bold uppercase tracking-wider ${tiresSnoozed ? 'text-blue-400' : 'text-[var(--text-muted)]'}`}>
                                Controllo Gomme
                              </p>
                              {tiresSnoozed && (
                                <span className="text-[8px] font-bold bg-blue-400/10 text-blue-400 border border-blue-400/20 px-1.5 py-0.5 rounded-full">
                                  eccezione
                                </span>
                              )}
                            </div>
                            {tiresSnoozed ? (
                              <p className="text-sm font-bold text-blue-400">Ricontrolla a ~ {tiresNextCheck?.toLocaleString('it-IT')} km</p>
                            ) : (
                              <p className="text-sm font-bold text-[var(--success)]">~ {tiresNextCheck?.toLocaleString('it-IT')} km</p>
                            )}
                            <p className="text-[8px] mt-1.5 font-semibold text-[var(--text-muted)]/60">
                              {tiresSnoozed ? 'Tocca per modificare eccezione' : 'Tocca per posticipare'}
                            </p>
                          </button>
                          
                          {/* Campanella Notifica Gomme */}
                          <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover/tire:opacity-100 transition-opacity">
                              <div className="flex items-center gap-1">
                                {module.tireDoc && (
                                  <button onClick={(e) => { e.stopPropagation(); handleViewPdf(module.tireDoc); }} className="p-1 text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-all" title="Vedi controllo gomme">
                                    <FileText className="w-3 h-3" />
                                  </button>
                                )}
                                <button
                                    onClick={e => openNotifConfig(e, 'tiresKm', 'Controllo Gomme', 'km', String(tiresNextCheck))}
                                    className={`p-1.5 rounded-lg transition-all ${activeNotifFields.has('tiresKm') ? 'text-amber-500 bg-amber-500/10' : 'text-[var(--text-muted)] hover:text-amber-400 hover:bg-amber-400/10'}`}
                                    title={activeNotifFields.has('tiresKm') ? 'Notifica attiva' : 'Imposta notifica'}
                                >
                                    <Bell className="w-3 h-3" />
                                </button>
                              </div>
                          </div>
                        </div>
                      )}
                      {(module.battery12vWarranty || module.battery12vExpiryDate) && (
                        <div className="bg-[var(--bg)] border border-[var(--border)] rounded-2xl px-4 py-3 relative group/bat12">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Batteria 12v</p>
                              <div className="flex items-center gap-1">
                                {module.battery12vDoc && (
                                  <button onClick={(e) => { e.stopPropagation(); handleViewPdf(module.battery12vDoc); }} className="p-1 text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-all" title="Vedi batteria 12v">
                                    <FileText className="w-3 h-3" />
                                  </button>
                                )}
                                <button
                                  onClick={e => openNotifConfig(e, 'battery12vExpiryDate', 'Batteria 12v', 'date', module.battery12vExpiryDate || '')}
                                  className={`p-1 rounded-lg transition-all ${activeNotifFields.has('battery12vExpiryDate') ? 'text-amber-500 bg-amber-500/10' : 'text-[var(--text-muted)]/40 hover:text-amber-400 hover:bg-amber-400/10'}`}
                                  title={activeNotifFields.has('battery12vExpiryDate') ? 'Notifica attiva' : 'Imposta notifica'}
                                >
                                  <Bell className="w-3 h-3" />
                                </button>
                              </div>
                          </div>
                          <p className="text-sm font-bold text-[var(--text-main)] break-words">
                            {module.battery12vExpiryDate ? new Date(module.battery12vExpiryDate).toLocaleDateString('it-IT') : module.battery12vWarranty}
                          </p>
                        </div>
                      )}
                      {(module.hybridBatteryWarranty || module.hybridBatteryExpiryDate) && (
                        <div className="bg-[var(--bg)] border border-amber-500/10 rounded-2xl px-4 py-3 col-span-2 relative group/hybrid">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <ShieldCheck className="w-4 h-4 text-amber-500" />
                              <p className="text-[9px] font-bold text-amber-500 uppercase tracking-widest">Batteria Ibrida / EV</p>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="text-[9px] font-bold text-amber-500/40 uppercase">Notifiche km/data</span>
                                <div className="flex items-center gap-1">
                                    {module.hybridBatteryDoc && (
                                      <button onClick={(e) => { e.stopPropagation(); handleViewPdf(module.hybridBatteryDoc); }} className="p-1 text-emerald-600 hover:bg-emerald-500/10 rounded-lg transition-all" title="Vedi batteria ibrida">
                                        <FileText className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                    <button
                                        onClick={e => openNotifConfig(e, 'hybridBatteryWarranty', 'Controllo Ibrido (Km)', 'km', module.hybridBatteryWarranty || '')}
                                        className={`p-1.5 rounded-lg transition-all ${activeNotifFields.has('hybridBatteryWarranty') ? 'text-amber-500 bg-amber-500/10' : 'text-[var(--text-muted)]/40 hover:text-amber-400 hover:bg-amber-400/10'}`}
                                        title="Soglia KM"
                                    >
                                        <Gauge className="w-3 h-3" />
                                    </button>
                                    <button
                                        onClick={e => openNotifConfig(e, 'hybridBatteryExpiryDate', 'Controllo Ibrido (Data)', 'date', module.hybridBatteryExpiryDate || '')}
                                        className={`p-1.5 rounded-lg transition-all ${activeNotifFields.has('hybridBatteryExpiryDate') ? 'text-amber-500 bg-amber-500/10' : 'text-[var(--text-muted)]/40 hover:text-amber-400 hover:bg-amber-400/10'}`}
                                        title="Scadenza Temporale"
                                    >
                                        <Calendar className="w-3 h-3" />
                                    </button>
                                </div>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-0.5">Controllo a Km</p>
                                <p className="text-sm font-bold text-[var(--text-main)]">{module.hybridBatteryWarranty}</p>
                            </div>
                            {module.hybridBatteryExpiryDate && (
                                <div>
                                    <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-0.5">Data Scadenza</p>
                                    <p className="text-sm font-bold text-[var(--text-main)]">{new Date(module.hybridBatteryExpiryDate).toLocaleDateString('it-IT')}</p>
                                </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="text-[10px] text-center text-[var(--text-muted)] font-medium pb-1">
                  Proprietario: <span className="font-bold text-[var(--text-main)]">{module.driverName}</span>
                </div>


              </div>
            </motion.div>

            {/* Modal posticipa gomme */}
            <AnimatePresence>
              {showTireSnooze && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="absolute inset-0 bg-[var(--card-bg)] rounded-3xl flex flex-col p-6 z-10"
                >
                  <div className="flex items-center justify-between mb-5">
                    <h4 className="text-base font-bold text-[var(--text-main)]">Posticipa Controllo Gomme</h4>
                    <button onClick={() => setShowTireSnooze(false)} className="p-2 hover:bg-[var(--bg)] rounded-xl text-[var(--text-muted)] transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-sm text-[var(--text-muted)] mb-6">
                    Hai già controllato le gomme e sono a posto? Imposta tra quanti km ricordartelo di nuovo.
                    {currentKmNum && <span className="block mt-1 font-bold text-[var(--text-main)]">Km attuali: {currentKmNum.toLocaleString('it-IT')}</span>}
                  </p>
                  <label className="text-xs font-bold text-[var(--text-muted)] uppercase mb-2 block">Ricordamelo tra (km)</label>
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {['3000', '5000', '10000', '15000', '20000', '30000'].map(km => (
                      <button
                        key={km}
                        onClick={() => setTireSnoozeKm(km)}
                        className={`py-2.5 rounded-xl text-sm font-bold border transition-all ${
                          tireSnoozeKm === km
                            ? 'bg-blue-400 text-white border-blue-400 shadow-md'
                            : 'bg-[var(--bg)] text-[var(--text-muted)] border-[var(--border)] hover:border-blue-400/50'
                        }`}
                      >
                        +{Number(km).toLocaleString('it-IT')}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2 mb-4">
                    <input
                      type="number"
                      value={tireSnoozeKm}
                      onChange={e => setTireSnoozeKm(e.target.value)}
                      placeholder="Km personalizzati"
                      className="flex-1 p-3 bg-[var(--bg)] border border-[var(--border)] rounded-xl outline-none focus:border-blue-400 transition-all text-sm font-bold text-[var(--text-main)] placeholder:text-[var(--text-muted)]"
                    />
                    <span className="flex items-center text-sm font-bold text-[var(--text-muted)] pr-2">km</span>
                  </div>
                  {currentKmNum && tireSnoozeKm && (
                    <p className="text-xs text-center text-blue-400 font-bold mb-4">
                      Ti ricorderemo a ~ {(currentKmNum + (parseInt(tireSnoozeKm) || 0)).toLocaleString('it-IT')} km
                    </p>
                  )}
                  <button
                    onClick={handleApplyTireSnooze}
                    className="w-full py-3.5 bg-blue-500 hover:bg-blue-600 text-white rounded-2xl font-bold text-sm transition-all shadow-lg shadow-blue-500/20"
                  >
                    Imposta Eccezione
                  </button>
                  {tiresSnoozed && (
                    <button
                      onClick={() => {
                        const updated = { ...module, tiresKmSnoozeUntil: undefined } as AutoModule;
                        if (onDirectUpdate) onDirectUpdate(updated); else onEdit(updated);
                        setShowTireSnooze(false);
                        setShowFullData(false);
                      }}
                      className="w-full mt-2 py-2.5 text-[var(--text-muted)] hover:text-red-400 text-xs font-bold transition-colors"
                    >
                      Rimuovi eccezione
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Pannello configurazione notifica */}
            <AnimatePresence>
              {notifConfig && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="absolute inset-0 bg-[var(--card-bg)] rounded-3xl flex flex-col p-6 z-10 overflow-y-auto"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-[var(--accent-bg)] rounded-xl">
                        <Bell className="w-4 h-4 text-[var(--accent)]" />
                      </div>
                      <h4 className="text-base font-bold text-[var(--text-main)]">Notifica</h4>
                    </div>
                    <button onClick={() => setNotifConfig(null)} className="p-2 hover:bg-[var(--bg)] rounded-xl text-[var(--text-muted)] transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <p className="text-sm text-[var(--text-muted)] mb-1">
                    <span className="font-bold text-[var(--text-main)]">{notifConfig.label}</span>
                  </p>
                  <p className="text-xs text-[var(--text-muted)] mb-5">
                    {notifConfig.type === 'date'
                      ? `Scadenza: ${new Date(notifConfig.targetValue).toLocaleDateString('it-IT')}`
                      : `Soglia km: ~ ${Number(notifConfig.targetValue).toLocaleString('it-IT')} km`}
                  </p>

                  <label className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2 block">
                    {notifConfig.type === 'date' ? 'Avvisami X giorni prima' : 'Avvisami quando mancano X km'}
                  </label>

                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {(notifConfig.type === 'date' ? [7, 14, 30, 60] : [1000, 2000, 5000]).map(v => (
                      <button
                        key={v}
                        onClick={() => setNotifOffset(v)}
                        className={`py-2.5 rounded-xl text-sm font-bold border transition-all ${
                          notifOffset === v
                            ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-md'
                            : 'bg-[var(--bg)] text-[var(--text-muted)] border-[var(--border)] hover:border-[var(--accent)]/60'
                        }`}
                      >
                        {notifConfig.type === 'date' ? `${v}gg` : `${v >= 1000 ? `${v / 1000}k` : v}km`}
                      </button>
                    ))}
                  </div>

                  <input
                    type="number"
                    value={notifOffset}
                    onChange={e => setNotifOffset(Number(e.target.value))}
                    min={1}
                    className="w-full p-3 bg-[var(--bg)] border border-[var(--border)] rounded-xl outline-none focus:border-amber-400 transition-all text-sm font-bold text-[var(--text-main)] text-center mb-3"
                  />

                  <p className="text-xs text-center text-amber-500 font-bold mb-5">
                    {notifConfig.type === 'date'
                      ? (() => {
                          const d = new Date(notifConfig.targetValue);
                          d.setDate(d.getDate() - notifOffset);
                          return `Notifica il ${d.toLocaleDateString('it-IT')}`;
                        })()
                      : `Notifica a ~ ${(Number(notifConfig.targetValue) - notifOffset).toLocaleString('it-IT')} km`}
                  </p>

                  <button
                    onClick={async () => {
                      const granted = await notificationService.requestPermission();
                      if (!granted) { alert('Abilita le notifiche nelle impostazioni del browser.'); return; }
                      notificationService.upsert({
                        id: `${module.id}_${notifConfig.field}`,
                        moduleId: module.id,
                        field: notifConfig.field,
                        label: notifConfig.label,
                        type: notifConfig.type,
                        targetValue: notifConfig.targetValue,
                        reminderOffset: notifOffset,
                        enabled: true,
                      });
                      setNotifRefresh(n => n + 1);
                      setNotifConfig(null);
                    }}
                    className="w-full py-3.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] active:scale-[0.98] text-white rounded-2xl font-bold text-sm transition-all shadow-lg shadow-[var(--accent)]/20 flex items-center justify-center gap-2"
                  >
                    <Bell className="w-4 h-4" />
                    {activeNotifFields.has(notifConfig.field) ? 'Aggiorna notifica' : 'Attiva notifica'}
                  </button>

                  {activeNotifFields.has(notifConfig.field) && (
                    <button
                      onClick={() => {
                        notificationService.remove(module.id, notifConfig.field);
                        setNotifRefresh(n => n + 1);
                        setNotifConfig(null);
                      }}
                      className="w-full mt-2 py-2.5 text-[var(--text-muted)] hover:text-red-400 text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                    >
                      <BellOff className="w-3.5 h-3.5" /> Disattiva notifica
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export const SplitCard = ({ module, onDelete, onEdit, onShare, dragHandleProps }: { module: SplitModule; onDelete: (id: string) => void; onEdit: (m: Module) => void; onShare: (m: Module) => void; dragHandleProps?: any }) => {
  const totalAmount = module.expenses.reduce((sum, exp) => sum + exp.amount, 0);
  
  return (
    <ModuleWrapper module={module} onDelete={onDelete} onEdit={onEdit} dragHandleProps={dragHandleProps}>
      <div 
        className="flex flex-col cursor-pointer group/card hover:bg-[var(--bg)] transition-colors p-3 -m-3 rounded-2xl active:scale-[0.98] h-full"
        onClick={() => onEdit(module)} // Cliccando si apre la schermata specifica
      >
        <div className="flex items-center gap-3 mb-3 shrink-0">
          <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center border border-purple-500/20 shrink-0">
            <Users className="w-5 h-5 text-purple-500" />
          </div>
          <div className="min-w-0">
            <h4 className="font-bold text-[14px] text-[var(--text-main)] leading-tight truncate">{module.title || 'Gruppo Spese'}</h4>
            <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">{module.participants.length} partecipanti</p>
          </div>
        </div>

        <div className="flex-1 mt-2">
          <p className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">Spesa Totale</p>
          <div className="text-xl font-black text-[var(--text-main)] flex items-center">
             {new Intl.NumberFormat(undefined, { style: 'currency', currency: module.currency || 'EUR' }).format(totalAmount)}
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-[var(--border)] shrink-0" onClick={e => e.stopPropagation()}>
          <button
            onClick={() => onShare(module)}
            className="w-full flex items-center justify-center gap-2 py-2 bg-[var(--info-bg)] hover:bg-[var(--info)]/20 text-[var(--info)] border border-[var(--info)]/30 rounded-xl text-[10px] font-bold transition-all shadow-sm"
          >
            <QrCode className="w-3.5 h-3.5" />
            Condividi
          </button>
        </div>
      </div>
    </ModuleWrapper>
  );
};
