import React, { useState } from 'react';
import { CreditCard, ShieldCheck, Wallet, Fingerprint, Plus, Trash2, Calendar, DollarSign, Pencil, StickyNote, Copy, Check, GripVertical, Car, Wrench, AlertCircle, FileText, QrCode, FileDown, X, Clock, Eye, Lock, ChevronRight, Bell, BellOff, Gauge, Users, Paperclip, Receipt, Image as ImageIcon, MapPin, ChevronLeft, Bus, Activity, BookOpen } from 'lucide-react';
import { Module, GenericModule, AutoModule, DocumentModule, SplitModule, SingleExpenseModule, WalletModule, GalleryModule, TravelModule, TransportModule } from '../types';
import { isModuleSensitive } from '../utils/security';
import { EXPENSE_CATEGORIES } from '../constants/expenses';
import { motion, AnimatePresence } from 'motion/react';
import { CAR_BRANDS } from '../utils/carBrands';
import { notificationService } from '../services/notificationService';
import { DocumentViewer } from './DocumentViewer';

interface ModuleWrapperProps {
  module: Module;
  onDelete?: (id: string) => void;
  onEdit?: (module: Module) => void;
  onShare?: (module: Module) => void;
  onToggleSensitivity?: (module: Module) => void;
  children: React.ReactNode;
}

const ModuleWrapper = ({ module, onDelete, onEdit, onShare, onToggleSensitivity, children }: ModuleWrapperProps) => {
  const [showMenu, setShowMenu] = useState(false);
  const sensitive = isModuleSensitive(module);

  const handleContextMenu = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setShowMenu(true);
  };

  return (
    <div 
      className="module-card relative group flex flex-col bg-[var(--card-bg)] backdrop-blur-3xl rounded-[2.5rem] border border-[var(--border)] shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:shadow-[0_20px_50px_rgba(0,0,0,0.12)] transition-all p-5 sm:p-6 overflow-hidden"
      onContextMenu={handleContextMenu}
    >
      <div className="flex items-center justify-between mb-3 shrink-0">
        <div className="flex items-center gap-1">
          {sensitive && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] font-black uppercase tracking-wider" title="Modulo protetto da Impronta / Biometria">
              <Lock className="w-3 h-3" />
              <span>Sensibile</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 opacity-0 md:group-hover:opacity-100 transition-all shrink-0">
          {onShare && (
            <button
              onClick={(e) => { e.stopPropagation(); onShare(module); }}
              className="p-2 sm:p-1.5 hover:bg-[var(--bg)] text-[var(--text-muted)] hover:text-indigo-500 rounded-lg transition-all"
              title="Condividi via QR"
            >
              <QrCode className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
            </button>
          )}
          {onToggleSensitivity && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleSensitivity(module); }}
              className="p-2 sm:p-1.5 hover:bg-[var(--bg)] text-[var(--text-muted)] hover:text-amber-500 rounded-lg transition-all"
              title={sensitive ? "Rimuovi protezione impronta" : "Proteggi con impronta"}
            >
              <Lock className={`w-4 h-4 sm:w-3.5 sm:h-3.5 ${sensitive ? 'text-amber-500 fill-amber-500/20' : ''}`} />
            </button>
          )}
          {onEdit && (
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(module); }}
              className="p-2 sm:p-1.5 hover:bg-[var(--bg)] text-[var(--text-muted)] hover:text-[var(--accent)] rounded-lg transition-all"
              title="Gestisci"
            >
              <Pencil className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(module.id); }}
              className="p-2 sm:p-1.5 hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-500 rounded-lg transition-all"
              title="Elimina"
            >
              <Trash2 className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
            </button>
          )}
        </div>
      </div>
      
      <div className="flex-1 min-h-0 pointer-events-auto">
        {children}
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
            
            {onEdit && (
              <button 
                onClick={(e) => { e.stopPropagation(); setShowMenu(false); onEdit(module); }}
                className="w-full flex items-center justify-center gap-2 bg-indigo-500 text-white py-3 px-4 rounded-xl font-bold shadow-lg active:scale-95 transition-transform"
              >
                <Pencil className="w-5 h-5" />
                <span>Modifica</span>
              </button>
            )}

            {onShare && (
              <button 
                onClick={(e) => { e.stopPropagation(); setShowMenu(false); onShare(module); }}
                className="w-full flex items-center justify-center gap-2 bg-emerald-500 text-white py-3 px-4 rounded-xl font-bold shadow-lg active:scale-95 transition-transform"
              >
                <QrCode className="w-5 h-5" />
                <span>Condividi</span>
              </button>
            )}

            {onDelete && (
              <button 
                onClick={(e) => { e.stopPropagation(); setShowMenu(false); onDelete(module.id); }}
                className="w-full flex items-center justify-center gap-2 bg-red-500/20 text-red-500 py-3 px-4 rounded-xl font-bold border border-red-500/30 active:scale-95 transition-transform"
              >
                <Trash2 className="w-5 h-5" />
                <span>Elimina</span>
              </button>
            )}
            
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

export const DocumentCard = ({ module, onDelete, onEdit, onShare }: { module: DocumentModule; onDelete: (id: string) => void; onEdit: (m: Module) => void; onShare: (m: Module) => void; }) => {
  const isTaxCode = module.documentType === 'tax_code';
  const isIdentity = module.documentType === 'identity';
  const isLicense = module.documentType === 'driving_license';

  const getDocTypeLabel = (type: string) => {
    switch (type) {
      case 'identity': return 'Carta d\'Identità';
      case 'driving_license': return 'Patente di Guida';
      case 'tax_code': return 'Codice Fiscale';
      case 'generic': return 'Documento';
      default: return type || 'Documento';
    }
  };

  const isExpired = module.expiryDate && new Date(module.expiryDate) < new Date();
  const expiresSoon = module.expiryDate && !isExpired && (new Date(module.expiryDate).getTime() - new Date().getTime()) < (30 * 24 * 60 * 60 * 1000);

  return (
    <ModuleWrapper module={module} onDelete={onDelete} onEdit={onEdit}>
      <div 
        className="w-full aspect-[1.58/1] rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer relative active:scale-[0.98]"
        onClick={() => onEdit(module)}
      >
        {/* === CODICE FISCALE === */}
        {isTaxCode && (
          <div className="absolute inset-0 p-3.5 flex flex-col justify-between text-white" style={{ background: 'linear-gradient(135deg, #0f766e 0%, #115e59 40%, #042f2e 100%)' }}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-3.5 bg-[#003399] rounded-sm flex items-center justify-center border border-white/10 shrink-0">
                  <span className="text-[5px] text-white font-black leading-none">IT</span>
                </div>
                <div className="leading-none">
                  <p className="text-[5px] font-black text-teal-200 uppercase tracking-widest m-0">REPUBBLICA ITALIANA</p>
                  <p className="text-[6.5px] font-black text-white uppercase tracking-wider mt-0.5 m-0">TESSERA SANITARIA</p>
                </div>
              </div>
              <div className="text-[4px] font-bold text-white/40 uppercase tracking-wider leading-none">
                MIN. FINANZE
              </div>
            </div>

            <div className="my-auto w-full bg-emerald-50/95 rounded-lg border border-emerald-600/30 px-2 py-1 flex items-center justify-center">
              <span className="text-emerald-950 font-mono font-black text-[9.5px] sm:text-[10px] md:text-[11px] tracking-[0.1em] uppercase truncate">
                {module.number || 'RSSMRA80A01F205X'}
              </span>
            </div>

            <div className="flex items-center justify-between border-t border-white/10 pt-1">
              <div className="text-[5px] font-bold text-white/60">
                SCAD: <span className="text-white font-black">{module.expiryDate ? new Date(module.expiryDate).toLocaleDateString('it-IT') : '---'}</span>
              </div>
              {isExpired ? (
                <div className="bg-red-500 text-white px-1 py-0.5 rounded text-[5px] font-black uppercase">SCADUTO</div>
              ) : expiresSoon ? (
                <div className="bg-amber-400 text-black px-1 py-0.5 rounded text-[5px] font-black uppercase">IN SCADENZA</div>
              ) : (
                <div className="bg-emerald-400 text-black px-1 py-0.5 rounded text-[5px] font-black uppercase">VALIDO</div>
              )}
            </div>
          </div>
        )}

        {/* === CARTA D'IDENTITA === */}
        {isIdentity && (
          <div className="absolute inset-0 flex text-white" style={{ background: 'linear-gradient(135deg, #1a3a6b 0%, #0d255c 50%, #061540 100%)' }}>
            <div className="w-6 flex flex-col items-center justify-between py-1.5 shrink-0" style={{ background: 'rgba(0,47,135,0.8)' }}>
              <div className="flex flex-col items-center gap-0.5">
                <div className="text-yellow-300 text-[3px]">★</div>
                <div className="text-yellow-300 text-[3px]">★</div>
              </div>
              <span className="text-[4px] font-black text-white/80 uppercase tracking-widest rotate-[-90deg] whitespace-nowrap">ITALIA</span>
              <div className="flex flex-col items-center gap-0.5">
                <div className="text-yellow-300 text-[3px]">★</div>
                <div className="text-yellow-300 text-[3px]">★</div>
              </div>
            </div>

            <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[4.5px] font-black text-blue-200/70 uppercase tracking-wider leading-none m-0">CARTA D'IDENTITÀ</p>
                  <p className="text-[4px] text-white/50 uppercase tracking-widest mt-0.5 leading-none m-0">IDENTITY CARD</p>
                </div>
                <span className="text-[8px] leading-none">🇮🇹</span>
              </div>

              <div className="my-auto flex items-center justify-between gap-1.5 min-w-0">
                <div className="min-w-0 flex-1">
                  <p className="text-[4.5px] text-white/50 uppercase tracking-wider leading-none m-0">COGNOME / SURNAME</p>
                  <p className="text-[9px] font-black text-white tracking-wide truncate mt-0.5 m-0 leading-none">{module.title || '---'}</p>
                  
                  <p className="text-[4.5px] text-white/50 uppercase tracking-wider leading-none mt-1 m-0">NUMERO / NUMBER</p>
                  <p className="text-[8px] font-black text-white font-mono tracking-wider mt-0.5 m-0 leading-none truncate">{module.number || '---'}</p>
                </div>

                <div className="w-6 h-4.5 rounded border border-yellow-400/40 bg-gradient-to-br from-yellow-300/20 to-yellow-500/10 flex items-center justify-center shrink-0">
                  <div className="w-3.5 h-2 border border-yellow-400/60 rounded-sm bg-yellow-400/10" />
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-white/10 pt-1">
                <span className="text-[5px] text-white/50 font-bold leading-none">SCAD: <span className="text-white">{module.expiryDate ? new Date(module.expiryDate).toLocaleDateString('it-IT') : '---'}</span></span>
                {isExpired ? (
                  <div className="bg-red-500 text-white px-1 py-0.5 rounded text-[5px] font-black uppercase leading-none">SCADUTO</div>
                ) : expiresSoon ? (
                  <div className="bg-amber-400 text-black px-1 py-0.5 rounded text-[5px] font-black uppercase leading-none">IN SCADENZA</div>
                ) : (
                  <div className="bg-emerald-400 text-black px-1 py-0.5 rounded text-[5px] font-black uppercase leading-none">VALIDA</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* === PATENTE DI GUIDA === */}
        {isLicense && (
          <div className="absolute inset-0 p-3.5 flex flex-col justify-between text-white" style={{ background: 'linear-gradient(135deg, #5b1fa3 0%, #3b0f6e 50%, #21094a 100%)' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded-full bg-white/15 flex items-center justify-center text-[7px] shrink-0">🇮🇹</div>
                <div className="leading-none">
                  <p className="text-[5px] font-black text-purple-200/70 uppercase tracking-wider m-0">REPUBBLICA ITALIANA</p>
                  <p className="text-[6.5px] font-black text-white uppercase tracking-wider mt-0.5 m-0">PATENTE DI GUIDA</p>
                </div>
              </div>
              <div className="flex gap-0.5 shrink-0">
                {['B', 'AM'].map(cat => (
                  <div key={cat} className="w-3.5 h-3.5 rounded bg-white/20 border border-white/30 flex items-center justify-center">
                    <span className="text-[5.5px] font-black text-white">{cat}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="my-auto flex flex-col items-center">
              <p className="text-[4.5px] font-black text-purple-300/60 uppercase tracking-widest leading-none m-0">NUMERO PATENTE</p>
              <p className="text-[12px] font-black text-white font-mono tracking-wider mt-1 leading-none truncate max-w-full">
                {module.number || '--- --- ---'}
              </p>
            </div>

            <div className="flex items-center justify-between border-t border-white/10 pt-1">
              <div className="text-[5px] font-bold text-white/50 leading-none">
                SCAD: <span className="text-white font-black">{module.expiryDate ? new Date(module.expiryDate).toLocaleDateString('it-IT') : '---'}</span>
              </div>
              {isExpired ? (
                <div className="bg-red-500 text-white px-1 py-0.5 rounded text-[5px] font-black uppercase leading-none">SCADUTA</div>
              ) : expiresSoon ? (
                <div className="bg-amber-400 text-black px-1 py-0.5 rounded text-[5px] font-black uppercase leading-none">IN SCADENZA</div>
              ) : (
                <div className="bg-purple-300 text-purple-900 px-1 py-0.5 rounded text-[5px] font-black uppercase leading-none">VALIDA</div>
              )}
            </div>
          </div>
        )}

        {/* === DOCUMENTO GENERICO === */}
        {!isTaxCode && !isIdentity && !isLicense && (
          <div className="absolute inset-0 p-3.5 flex flex-col justify-between text-white" style={{ background: 'linear-gradient(135deg, #374151 0%, #1f2937 100%)' }}>
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-white shrink-0 border border-white/10">
                  <FileText className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[4.5px] font-black text-white/50 uppercase tracking-wider leading-none m-0">DOCUMENTO GENERICO</p>
                  <h4 className="text-[9.5px] font-black text-white tracking-wide truncate mt-0.5 m-0 leading-tight">
                    {module.title || getDocTypeLabel(module.documentType)}
                  </h4>
                </div>
              </div>
              {isExpired ? (
                <div className="bg-red-500 text-white px-1 py-0.5 rounded text-[5px] font-black uppercase leading-none">SCADUTO</div>
              ) : expiresSoon ? (
                <div className="bg-amber-500 text-white px-1 py-0.5 rounded text-[5px] font-black uppercase leading-none">IN SCADENZA</div>
              ) : (
                <div className="bg-emerald-500 text-white px-1 py-0.5 rounded text-[5px] font-black uppercase leading-none">VALIDO</div>
              )}
            </div>

            <div className="my-auto flex flex-col">
              <span className="text-[4.5px] font-bold text-white/50 uppercase tracking-wider leading-none m-0">NUMERO</span>
              <span className="text-[10px] font-black font-mono tracking-wider mt-0.5 text-white leading-none truncate">{module.number || '---'}</span>
            </div>

            <div className="flex items-center justify-between border-t border-white/10 pt-1">
              <span className="text-[5px] text-white/50 font-bold leading-none">SCAD: <span className="text-white font-black">{module.expiryDate ? new Date(module.expiryDate).toLocaleDateString('it-IT') : '---'}</span></span>
              <span className="text-[5px] text-white/50 font-bold leading-none">RIL: <span className="text-white font-black">{module.issueDate ? new Date(module.issueDate).toLocaleDateString('it-IT') : '---'}</span></span>
            </div>
          </div>
        )}
      </div>
    </ModuleWrapper>
  );
};

export const GenericCard = ({ module, onDelete, onEdit }: { module: GenericModule; onDelete: (id: string) => void; onEdit: (m: Module) => void; }) => {
  return (
    <ModuleWrapper module={module} onDelete={onDelete} onEdit={onEdit}>
      <div 
        className="h-full flex flex-col cursor-pointer group/card hover:bg-[var(--bg)] transition-colors p-4 -m-4 rounded-2xl active:scale-[0.98]"
        onClick={() => onEdit(module)}
      >
        <div className="flex items-start gap-3 mb-3">
           <div className="w-10 h-10 bg-[var(--accent-bg)] rounded-xl flex items-center justify-center text-[var(--accent)] shrink-0">
              <StickyNote className="w-5 h-5" />
           </div>
           <div className="min-w-0">
              <h4 className="font-bold text-[14px] text-[var(--text-main)] truncate">
                {module.title || 'Appunto'}
              </h4>
              <p className="text-[10px] font-bold text-[var(--text-muted)] line-clamp-2 mt-1 leading-snug">
                {module.content}
              </p>
           </div>
        </div>

        <div className="mt-auto pt-4 border-t border-[var(--border)] flex items-center justify-between">
          <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Dettagli</span>
          <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />
        </div>
      </div>
    </ModuleWrapper>
  );
};

export const AutoCard = ({ module, onDelete, onEdit }: { module: AutoModule; onDelete: (id: string) => void; onEdit: (m: Module) => void; }) => {
  const brandLogo = module.brand ? module.brand.toLowerCase().replace(/ /g, '-') : '';
  const hasLogo = CAR_BRANDS.includes(brandLogo);

  return (
    <ModuleWrapper module={module} onDelete={onDelete} onEdit={onEdit}>
      <div 
        className="h-full flex flex-col cursor-pointer group/card hover:bg-[var(--bg)] transition-colors p-4 -m-4 rounded-2xl active:scale-[0.98]"
        onClick={() => onEdit(module)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col flex-1">
            <h4 className="font-bold text-[14px] text-[var(--text-main)] leading-tight">
              {module.brand} {module.model}
            </h4>
            <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest mt-1 mb-3">
              {module.fuelType} {module.registrationYear ? `• ${module.registrationYear}` : ''}
            </p>
            
            {module.plate && (
              <div className="inline-flex items-center border border-gray-300 rounded-md bg-white shadow-sm h-[24px] overflow-hidden self-start">
                <div className="bg-blue-700 h-full w-[14px] flex flex-col items-center justify-end pb-[1px] shrink-0">
                  <div className="w-1.5 h-1.5 border border-yellow-400 rounded-full mb-[1px] opacity-80" />
                  <span className="text-[6px] text-white font-bold leading-none">I</span>
                </div>
                <span className="px-2.5 text-black font-black font-mono text-[12px] tracking-widest uppercase mt-[0.5px]">
                  {module.plate}
                </span>
                <div className="bg-blue-700 h-full w-[14px] shrink-0" />
              </div>
            )}
          </div>

          <div className="w-12 h-12 bg-[var(--bg)] border border-[var(--border)] rounded-2xl flex items-center justify-center shrink-0 shadow-sm relative car-logo-bg">
            {hasLogo ? (
              <img src={`/logo_auto/${brandLogo}.png`} alt={module.brand} className="w-8 h-8 object-contain" />
            ) : (
              <Car className="w-6 h-6 text-[var(--text-muted)]" />
            )}
          </div>
        </div>

        <div className="mt-auto pt-4 border-t border-[var(--border)] flex items-center justify-between">
          <div className="flex items-center gap-1.5">
             <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
             <span className="text-[10px] font-bold text-[var(--text-muted)]">Gestione</span>
          </div>
          <ChevronRight className="w-4 h-4 text-[var(--text-muted)] group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </ModuleWrapper>
  );
};

export const SingleExpenseCard = ({ module, onDelete, onEdit }: { module: SingleExpenseModule; onDelete: (id: string) => void; onEdit: (m: Module) => void; }) => {
  const getCategoryTheme = (cat: string) => {
    switch (cat) {
      case 'food':          return { icon: '🛒', color: 'text-orange-500', bg: 'bg-orange-500/10' };
      case 'transport':     return { icon: '🚗', color: 'text-blue-500', bg: 'bg-blue-500/10' };
      case 'housing':       return { icon: '🏠', color: 'text-emerald-500', bg: 'bg-emerald-500/10' };
      case 'health':        return { icon: '🏥', color: 'text-red-500', bg: 'bg-red-500/10' };
      case 'entertainment': return { icon: '🎬', color: 'text-purple-500', bg: 'bg-purple-500/10' };
      case 'shopping':      return { icon: '🛍️', color: 'text-pink-500', bg: 'bg-pink-500/10' };
      default:               return { icon: '✨', color: 'text-gray-500', bg: 'bg-gray-500/10' };
    }
  };

  const catTheme = getCategoryTheme(module.category);

  return (
    <ModuleWrapper module={module} onDelete={onDelete} onEdit={onEdit}>
      <div 
        className="h-full flex flex-col cursor-pointer group/card hover:bg-[var(--bg)] transition-colors p-4 -m-4 rounded-2xl active:scale-[0.98]"
        onClick={() => onEdit(module)}
      >
        <div className="flex items-center gap-3 mb-4">
           <div className={`w-12 h-12 ${catTheme.bg} rounded-2xl flex items-center justify-center text-xl border border-white/10 shadow-inner`}>
              {catTheme.icon}
           </div>
           <div className="min-w-0">
              <h4 className="font-bold text-[14px] text-[var(--text-main)] truncate">{module.description || 'Spesa'}</h4>
              <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest mt-0.5">
                 {new Date(module.date).toLocaleDateString('it-IT')}
              </p>
           </div>
        </div>

        <div className="mt-auto bg-[var(--bg)] p-3 rounded-xl border border-[var(--border)] flex items-baseline justify-center gap-1">
           <span className="text-[10px] font-bold text-[var(--text-muted)]">{module.currency || 'EUR'}</span>
           <span className="text-xl font-black text-[var(--text-main)]">{module.amount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</span>
        </div>
      </div>
    </ModuleWrapper>
  );
};

export const SplitCard = ({ module, onDelete, onEdit, onShare }: { module: SplitModule; onDelete: (id: string) => void; onEdit: (m: Module) => void; onShare?: (m: Module) => void; }) => {
  const totalAmount = module.expenses.reduce((sum, exp) => sum + exp.amount, 0);
  
  return (
    <ModuleWrapper module={module} onDelete={onDelete} onEdit={onEdit} onShare={onShare}>
      <div 
        className="h-full flex flex-col cursor-pointer group/card hover:bg-[var(--bg)] transition-colors p-4 -m-4 rounded-2xl active:scale-[0.98]"
        onClick={() => onEdit(module)}
      >
        <div className="flex items-center gap-3 mb-4">
           <div className="w-12 h-12 bg-purple-500/10 rounded-2xl flex items-center justify-center text-purple-500 border border-purple-500/20">
              <Users className="w-6 h-6" />
           </div>
           <div className="min-w-0">
              <h4 className="font-bold text-[14px] text-[var(--text-main)] truncate">{module.title || 'Gruppo Spese'}</h4>
              <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest mt-1">
                 {module.participants.length} Partecipanti • {module.expenses.length} Spese
              </p>
           </div>
        </div>

        <div className="mt-auto bg-[var(--bg)] p-4 rounded-xl border border-purple-500/10">
           <p className="text-[9px] font-black text-purple-500 uppercase tracking-widest mb-1">Totale Gruppo</p>
           <div className="flex items-baseline gap-1.5">
              <span className="text-[10px] font-bold text-[var(--text-muted)]">{module.currency || 'EUR'}</span>
              <span className="text-2xl font-black text-[var(--text-main)]">{totalAmount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</span>
           </div>
        </div>
      </div>
    </ModuleWrapper>
  );
};

export const GalleryCard = ({ module, onEdit }: { module: GalleryModule; onEdit?: (m: Module) => void; }) => {
  const images: any[] = [];
  if (module.images && module.images.length > 0) {
    images.push(...module.images);
  } else if (module.image) {
    images.push({ id: module.id, image: module.image, filterName: module.filterName });
  }

  const coverImage = images.length > 0 ? images[0].image : '';

  return (
    <ModuleWrapper module={module} onEdit={onEdit}>
      <div 
        className="h-full flex flex-col p-2 -m-2 rounded-2xl transition-all cursor-pointer"
        onClick={() => onEdit?.(module)}
      >
        <div className="relative aspect-square rounded-2xl overflow-hidden border border-[var(--border)] shadow-inner mb-3 bg-[var(--surface-variant)] flex items-center justify-center">
          {coverImage ? (
            <>
              <img src={coverImage} alt={module.title} className="w-full h-full object-cover" />
              <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-lg border border-white/20 flex items-center gap-1">
                <ImageIcon className="w-3 h-3 text-white" />
                <span className="text-[10px] font-black text-white">{images.length}</span>
              </div>
            </>
          ) : (
            <ImageIcon className="w-8 h-8 text-[var(--text-muted)] opacity-50" />
          )}
        </div>
        <div className="flex items-center gap-2">
           <div className="w-7 h-7 bg-indigo-500/10 rounded-lg flex items-center justify-center text-indigo-500">
              <ImageIcon className="w-4 h-4" />
           </div>
           <span className="text-[12px] font-bold text-[var(--text-main)] truncate">{module.title || 'Galleria'}</span>
        </div>
      </div>
    </ModuleWrapper>
  );
};

export const TravelCard = ({ module, onDelete, onEdit }: { module: TravelModule; onDelete?: (id: string) => void; onEdit?: (m: Module) => void; }) => {
  const count = module.destinations?.length || 0;
  return (
    <ModuleWrapper module={module} onDelete={onDelete} onEdit={onEdit}>
      <div
        className="h-full flex flex-col cursor-pointer group/card hover:bg-[var(--bg)] transition-colors p-4 -m-4 rounded-2xl active:scale-[0.98]"
        onClick={() => onEdit?.(module)}
      >
        {/* Globe preview */}
        <div className="relative aspect-square rounded-2xl overflow-hidden bg-[#060d1a] border border-blue-500/20 mb-3 flex items-center justify-center shadow-inner">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_#0f2744_0%,_#060d1a_80%)]" />
          {/* Stars */}
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="absolute w-px h-px rounded-full bg-white" style={{ top: `${Math.random() * 100}%`, left: `${Math.random() * 100}%`, opacity: Math.random() * 0.7 + 0.2 }} />
          ))}
          <div className="relative z-10 w-16 h-16 rounded-full bg-gradient-to-br from-blue-600/80 to-indigo-900 border border-blue-400/30 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <span className="text-3xl">🌍</span>
          </div>
          {count > 0 && (
            <div className="absolute bottom-2 right-2 bg-blue-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow">
              {count} {count === 1 ? 'luogo' : 'luoghi'}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-blue-500/10 rounded-lg flex items-center justify-center text-blue-400">
            <MapPin className="w-4 h-4" />
          </div>
          <span className="text-[12px] font-bold text-[var(--text-main)] truncate">{module.title || 'Viaggi'}</span>
        </div>
      </div>
    </ModuleWrapper>
  );
};

export const StudyCard = ({ module, onDelete, onEdit }: { module: any; onDelete?: (id: string) => void; onEdit?: (m: Module) => void; }) => {
  const topics = module.topics || [];
  const completed = topics.filter((t: any) => t.isCompleted).length;
  const progress = topics.length > 0 ? (completed / topics.length) * 100 : 0;

  return (
    <ModuleWrapper module={module} onDelete={onDelete} onEdit={onEdit}>
      <div
        className="h-full flex flex-col cursor-pointer group/card hover:bg-[var(--bg)] transition-colors p-4 -m-4 rounded-2xl active:scale-[0.98]"
        onClick={() => onEdit?.(module)}
      >
        <div className="relative aspect-square rounded-2xl overflow-hidden bg-[#0d0f1e] border border-indigo-500/20 mb-3 flex items-center justify-center shadow-inner">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_#181a30_0%,_#0d0f1e_80%)]" />
          
          <div className="relative z-10 w-16 h-16 rounded-full bg-gradient-to-br from-indigo-600/80 to-purple-900 border border-indigo-400/30 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover/card:scale-110 transition-transform">
            <BookOpen className="w-8 h-8 text-indigo-200" />
          </div>
        </div>

        <div className="flex-1 space-y-2 min-w-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-indigo-500/10 rounded-lg flex items-center justify-center text-indigo-400 shrink-0">
              <BookOpen className="w-4 h-4" />
            </div>
            <span className="text-[12px] font-bold text-[var(--text-main)] truncate">{module.title || 'Studio'}</span>
          </div>

          {topics.length > 0 ? (
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-bold text-[var(--text-muted)]">
                <span>{completed}/{topics.length} Argomenti</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="h-1.5 w-full bg-[var(--border)] rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: `${Math.min(100, progress)}%` }} />
              </div>
            </div>
          ) : (
            <p className="text-[10px] text-[var(--text-muted)] italic font-semibold">Nessun piano avviato</p>
          )}
        </div>
      </div>
    </ModuleWrapper>
  );
};

export const FitnessCard = ({ module, onDelete, onEdit }: { module: any; onDelete?: (id: string) => void; onEdit?: (m: Module) => void; }) => {
  const workoutPlan = module.workoutPlan || [];
  const completedDays = workoutPlan.filter((d: any) => d.isCompleted).length;
  const hasFitness = workoutPlan.length > 0;
  const hasDiet = !!module.mealPlan;
  const progress = workoutPlan.length > 0 ? (completedDays / workoutPlan.length) * 100 : 0;

  return (
    <ModuleWrapper module={module} onDelete={onDelete} onEdit={onEdit}>
      <div
        className="h-full flex flex-col cursor-pointer group/card hover:bg-[var(--bg)] transition-colors p-4 -m-4 rounded-2xl active:scale-[0.98]"
        onClick={() => onEdit?.(module)}
      >
        <div className="relative aspect-square rounded-2xl overflow-hidden bg-[#0a1a12] border border-emerald-500/20 mb-3 flex items-center justify-center shadow-inner">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_#0f2a1a_0%,_#0a1a12_80%)]" />
          
          <div className="relative z-10 w-16 h-16 rounded-full bg-gradient-to-br from-emerald-600/80 to-teal-900 border border-emerald-400/30 flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover/card:scale-110 transition-transform">
            <Activity className="w-8 h-8 text-emerald-200" />
          </div>
        </div>

        <div className="flex-1 space-y-2 min-w-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-emerald-500/10 rounded-lg flex items-center justify-center text-emerald-400 shrink-0">
              <Activity className="w-4 h-4" />
            </div>
            <span className="text-[12px] font-bold text-[var(--text-main)] truncate">{module.title || 'Fitness & Dieta'}</span>
          </div>

          {hasFitness ? (
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-bold text-[var(--text-muted)]">
                <span>{completedDays}/{workoutPlan.length} Allenamenti</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="h-1.5 w-full bg-[var(--border)] rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${Math.min(100, progress)}%` }} />
              </div>
            </div>
          ) : hasDiet ? (
            <p className="text-[10px] text-emerald-400 font-semibold">🥗 Piano alimentare attivo</p>
          ) : (
            <p className="text-[10px] text-[var(--text-muted)] italic font-semibold">Nessun piano avviato</p>
          )}
        </div>
      </div>
    </ModuleWrapper>
  );
};
