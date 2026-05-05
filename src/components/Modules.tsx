import React, { useState } from 'react';
import { CreditCard, ShieldCheck, Wallet, Fingerprint, Plus, Trash2, Calendar, DollarSign, Pencil, StickyNote, Copy, Check, GripVertical, Car, Wrench, AlertCircle, FileText, QrCode, FileDown, X, Clock, Eye, Lock, ChevronRight, Bell, BellOff, Gauge, Users, Paperclip, Receipt, Image as ImageIcon, MapPin, ChevronLeft } from 'lucide-react';
import { Module, GenericModule, AutoModule, DocumentModule, SplitModule, SingleExpenseModule, WalletModule, GalleryModule } from '../types';
import { EXPENSE_CATEGORIES } from '../constants/expenses';
import { motion, AnimatePresence } from 'motion/react';
import { CAR_BRANDS } from '../utils/carBrands';
import { notificationService } from '../services/notificationService';
import { DocumentViewer } from './DocumentViewer';

interface ModuleWrapperProps {
  module: Module;
  onDelete?: (id: string) => void;
  onEdit?: (module: Module) => void;
  children: React.ReactNode;
}

const ModuleWrapper = ({ module, onDelete, onEdit, children }: ModuleWrapperProps) => (
  <div className="module-card relative group flex flex-col bg-[var(--card-bg)] backdrop-blur-3xl rounded-[2.5rem] border border-[var(--border)] shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:shadow-[0_20px_50px_rgba(0,0,0,0.12)] transition-all p-5 sm:p-6 overflow-hidden">
    <div className="flex items-center justify-end mb-3 shrink-0">
      <div className="flex items-center gap-1.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all shrink-0">
        {onEdit && (
          <button
            onClick={() => onEdit(module)}
            className="p-2 sm:p-1.5 hover:bg-[var(--bg)] text-[var(--text-muted)] hover:text-[var(--accent)] rounded-lg transition-all"
            title="Gestisci"
          >
            <Pencil className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
          </button>
        )}
        {onDelete && (
          <button
            onClick={() => onDelete(module.id)}
            className="p-2 sm:p-1.5 hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-500 rounded-lg transition-all"
            title="Elimina"
          >
            <Trash2 className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
          </button>
        )}
      </div>
    </div>
    <div className="flex-1 min-h-0">
      {children}
    </div>
  </div>
);

export const DocumentCard = ({ module, onDelete, onEdit, onShare }: { module: DocumentModule; onDelete: (id: string) => void; onEdit: (m: Module) => void; onShare: (m: Module) => void; }) => {
  const getDocTypeLabel = (type: string) => {
    switch (type) {
      case 'identity': return 'Carta d\'Identità';
      case 'driving_license': return 'Patente di Guida';
      case 'tax_code': return 'Codice Fiscale';
      case 'generic': return 'Documento';
      default: return type || 'Documento';
    }
  };

  return (
    <ModuleWrapper module={module} onDelete={onDelete} onEdit={onEdit}>
      <div 
        className="h-full flex flex-col cursor-pointer group/card hover:bg-[var(--bg)] transition-colors p-4 -m-4 rounded-2xl active:scale-[0.98]"
        onClick={() => onEdit(module)}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-500 border border-indigo-500/20">
            <FileText className="w-6 h-6" />
          </div>
          <div className="text-right">
             <h4 className="font-bold text-[14px] text-[var(--text-main)] truncate max-w-[120px]">
               {module.title || getDocTypeLabel(module.documentType)}
             </h4>
             <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest mt-1">
               {getDocTypeLabel(module.documentType)}
             </p>
          </div>
        </div>

        <div className="mt-auto pt-4 border-t border-[var(--border)] flex items-center justify-between">
          <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Apri per gestire</span>
          <ChevronRight className="w-4 h-4 text-[var(--text-muted)] group-hover:translate-x-1 transition-transform" />
        </div>
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

export const WalletCard = ({ module, onDelete, onEdit }: { module: WalletModule; onDelete: (id: string) => void; onEdit: (m: Module) => void; }) => {
  const saved = Number(module.savedAmount) || 0;
  const total = Number(module.totalAmount) || 0;
  const progress = total > 0 ? Math.min(100, (saved / total) * 100) : 0;
  const isCompleted = progress >= 100;

  return (
    <ModuleWrapper module={module} onDelete={onDelete} onEdit={onEdit}>
      <div 
        className="h-full flex flex-col cursor-pointer group/card hover:bg-[var(--bg)] transition-colors p-4 -m-4 rounded-2xl active:scale-[0.98]"
        onClick={() => onEdit(module)}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-2xl border ${isCompleted ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600' : 'bg-purple-500/10 border-purple-500/20 text-purple-600'}`}>
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-[14px] text-[var(--text-main)] leading-tight">{module.title || 'Risparmio'}</h4>
              <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest mt-1">Obiettivo: € {total.toLocaleString('it-IT')}</p>
            </div>
          </div>
        </div>

        <div className="space-y-2 mt-auto">
          <div className="flex justify-between items-center text-[10px] font-bold mb-1">
             <span className="text-[var(--text-muted)]">Progressi</span>
             <span className={isCompleted ? 'text-emerald-500' : 'text-[var(--accent)]'}>{progress.toFixed(0)}%</span>
          </div>
          <div className="h-2 bg-[var(--surface-variant)] rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              className={`h-full rounded-full ${isCompleted ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]' : 'bg-[var(--accent)] shadow-[0_0_8px_rgba(var(--accent-rgb),0.3)]'}`}
            />
          </div>
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

          <div className="w-12 h-12 bg-[var(--bg)] border border-[var(--border)] rounded-2xl flex items-center justify-center shrink-0 shadow-sm relative">
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

export const SplitCard = ({ module, onDelete, onEdit }: { module: SplitModule; onDelete: (id: string) => void; onEdit: (m: Module) => void; }) => {
  const totalAmount = module.expenses.reduce((sum, exp) => sum + exp.amount, 0);
  
  return (
    <ModuleWrapper module={module} onDelete={onDelete} onEdit={onEdit}>
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
