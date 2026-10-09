import React, { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, Shield, Plus, Camera, Upload, Search, 
  X, Copy, Check, Eye, Trash2, Edit2, Share2, 
  AlertTriangle, Clock, Calendar, CheckCircle2, ChevronRight, 
  Sparkles, Download, Filter, LayoutGrid, List, FileSpreadsheet,
  QrCode, Barcode, ExternalLink, RefreshCw, Lock, Unlock, FileCheck,
  ArrowLeft, FileSignature
} from 'lucide-react';
import { DocumentModule, Module } from '../types';
import { getExpirationCountdown } from '../utils/documentOcrParser';
import { BarcodeSVG } from '../utils/barcodeGenerator';
import { QRCodeSVG } from 'qrcode.react';
import { DocumentViewer } from './DocumentViewer';
import { DocumentScanner } from './DocumentScanner';
import { ConfirmDialog } from './ConfirmDialog';

interface DocumentSectionViewProps {
  modules: DocumentModule[];
  allModules: Module[];
  selectedFolderId?: string | null;
  onBack?: () => void;
  onOpenDocument: (doc: DocumentModule) => void;
  onCreateDocument: (doc: DocumentModule) => void;
  onDeleteDocument: (id: string) => void;
  onToggleSensitivity?: (module: Module) => void;
  onShareDocument?: (module: Module) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onOpenRecesso?: () => void;
  onSaveToSandbox?: (title: string, base64: string) => Promise<void>;
}

// Microchip stile Smartcard EMV dorato
const EmvChip: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`w-10 h-7 sm:w-11 sm:h-8 rounded-lg bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600 p-[1.5px] shadow-sm border border-amber-300/40 relative overflow-hidden shrink-0 select-none ${className}`}>
    <div className="w-full h-full rounded-[5px] bg-gradient-to-br from-amber-300 via-amber-400 to-yellow-500 relative flex items-center justify-center">
      <div className="absolute inset-x-0 top-1/2 h-[1px] bg-amber-800/40 -translate-y-1/2" />
      <div className="absolute inset-y-0 left-1/3 w-[1px] bg-amber-800/40" />
      <div className="absolute inset-y-0 right-1/3 w-[1px] bg-amber-800/40" />
      <div className="w-3.5 h-3 rounded-[2.5px] border border-amber-800/50 bg-amber-200/50 shadow-inner flex items-center justify-center">
        <div className="w-1.5 h-1 rounded-[1px] border border-amber-800/30 bg-amber-300/30" />
      </div>
    </div>
  </div>
);

// Simbolo NFC Contactless wave
const NfcWave: React.FC<{ className?: string }> = ({ className = 'w-4 h-4 text-white/70' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 16.5a5.5 5.5 0 0 1 0-9" />
    <path d="M10.5 19a9 9 0 0 1 0-14" />
    <path d="M14 21.5a12.5 12.5 0 0 1 0-19" />
  </svg>
);

export const DocumentSectionView: React.FC<DocumentSectionViewProps> = ({
  modules,
  selectedFolderId,
  onBack,
  onOpenDocument,
  onCreateDocument,
  onDeleteDocument,
  onToggleSensitivity,
  onShareDocument,
  showToast,
  onOpenRecesso,
  onSaveToSandbox,
}) => {
  // Stati di filtro e visualizzazione
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'identity' | 'license' | 'tax_code' | 'passport' | 'generic' | 'expiring' | 'with_attachment'>('all');
  const [viewMode, setViewMode] = useState<'wallet' | 'list' | 'archive'>('wallet');
  const [sortBy, setSortBy] = useState<'expiry' | 'title' | 'recent'>('expiry');

  // Stati modali e visualizzatori
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [viewingAttachment, setViewingAttachment] = useState<{ title: string; data: string } | null>(null);
  const [barcodeModalDoc, setBarcodeModalDoc] = useState<DocumentModule | null>(null);
  const [barcodeCodeType, setBarcodeCodeType] = useState<'barcode' | 'qrcode'>('barcode');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // File picker rapido per importazione
  const quickFileInputRef = useRef<HTMLInputElement>(null);

  // Filtro documenti per cartella corrente
  const folderDocuments = useMemo(() => {
    return modules.filter(m => !selectedFolderId || m.folderId === selectedFolderId);
  }, [modules, selectedFolderId]);

  // Statistiche del portafoglio documenti
  const stats = useMemo(() => {
    const total = folderDocuments.length;
    let expiringSoon = 0;
    let expired = 0;
    let withPdf = 0;
    let protectedCount = 0;

    folderDocuments.forEach(doc => {
      if (doc.isSensitive) protectedCount++;
      if (doc.pdfAttachment) withPdf++;

      const cd = getExpirationCountdown(doc.expiryDate);
      if (cd.status === 'urgent' || cd.status === 'warning') expiringSoon++;
      if (cd.status === 'expired') expired++;
    });

    return { total, expiringSoon, expired, withPdf, protectedCount };
  }, [folderDocuments]);

  // Documenti filtrati e ordinati
  const filteredDocuments = useMemo(() => {
    return folderDocuments.filter(doc => {
      // Filtro per ricerca testuale
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = (doc.title || '').toLowerCase().includes(q);
        const matchNumber = (doc.number || '').toLowerCase().includes(q);
        const matchIssuer = (doc.issuedBy || '').toLowerCase().includes(q);
        const matchContent = (doc.content || '').toLowerCase().includes(q);
        if (!matchTitle && !matchNumber && !matchIssuer && !matchContent) return false;
      }

      // Filtro per categoria
      switch (activeFilter) {
        case 'identity':
          return doc.documentType === 'identity';
        case 'license':
          return doc.documentType === 'driving_license';
        case 'tax_code':
          return doc.documentType === 'tax_code';
        case 'passport':
          return doc.documentType === 'passport' || (doc.title || '').toLowerCase().includes('passaport');
        case 'generic':
          return doc.documentType === 'generic' || (!['identity', 'driving_license', 'tax_code', 'passport'].includes(doc.documentType || '') && !(doc.title || '').toLowerCase().includes('passaport'));
        case 'expiring': {
          const cd = getExpirationCountdown(doc.expiryDate);
          return cd.status === 'urgent' || cd.status === 'warning' || cd.status === 'expired';
        }
        case 'with_attachment':
          return Boolean(doc.pdfAttachment);
        case 'all':
        default:
          return true;
      }
    }).sort((a, b) => {
      if (sortBy === 'title') {
        return (a.title || '').localeCompare(b.title || '');
      }
      if (sortBy === 'recent') {
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      }
      // Ordinamento per scadenza (predefinito: prima i più vicini a scadere)
      const dateA = a.expiryDate ? new Date(a.expiryDate).getTime() : Infinity;
      const dateB = b.expiryDate ? new Date(b.expiryDate).getTime() : Infinity;
      return dateA - dateB;
    });
  }, [folderDocuments, searchQuery, activeFilter, sortBy]);

  // Copia con feedback
  const handleCopyText = (text: string, id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!text) return;

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
      showToast('Copiato negli appunti!', 'success');
    } catch {
      showToast('Impossibile copiare il testo', 'error');
    }
  };

  // Caricamento rapido file / PDF da computer o telefono
  const handleQuickFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      const cleanTitle = file.name.replace(/\.[^/.]+$/, '');

      const newDoc: DocumentModule = {
        id: 'mod_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        type: 'document',
        title: cleanTitle || `Documento ${new Date().toLocaleDateString('it-IT')}`,
        documentType: isPdf ? 'generic' : 'generic',
        pdfAttachment: base64,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        x: 0, y: 0, w: 2, h: 2,
        folderId: selectedFolderId || undefined
      };

      onCreateDocument(newDoc);
      showToast(`Documento "${newDoc.title}" aggiunto con allegato!`, 'success');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8 font-sans">
      {/* Hidden file input per importazione file rapida */}
      <input
        ref={quickFileInputRef}
        type="file"
        accept="application/pdf,image/*"
        onChange={handleQuickFileUpload}
        className="hidden"
      />

      {/* =====================================================================
          1. HERO HEADER & SUMMARY CARDS
         ===================================================================== */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 lg:p-10 shadow-2xl border border-indigo-500/20">
        {/* Glow ambient background effects */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-indigo-500/15 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              {onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  className="px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-xs"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Home</span>
                </button>
              )}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-bold uppercase tracking-wider">
                <Shield className="w-3.5 h-3.5 text-indigo-400" />
                <span>Portafoglio Digitale Sicuro</span>
              </div>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white">
              Documenti & Identità Digitali
            </h1>
            <p className="text-slate-300 text-sm sm:text-base font-normal leading-relaxed">
              Tessere sanitarie, patenti, carte d'identità e contratti PDF protetti con crittografia e codici a barre farmacia pronti all'uso.
            </p>
          </div>

          {/* Quick Actions Header Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-emerald-500/25 active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nuovo Documento</span>
            </button>

            <button
              onClick={() => setShowScanner(true)}
              className="px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-bold text-xs sm:text-sm flex items-center gap-2 backdrop-blur-md active:scale-95 transition-all cursor-pointer"
              title="Scansiona un documento con la fotocamera"
            >
              <Camera className="w-4 h-4 text-indigo-300" />
              <span className="hidden sm:inline">Scansiona</span>
            </button>

            <button
              onClick={() => quickFileInputRef.current?.click()}
              className="px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-bold text-xs sm:text-sm flex items-center gap-2 backdrop-blur-md active:scale-95 transition-all cursor-pointer"
              title="Carica un PDF o un'immagine dal dispositivo"
            >
              <Upload className="w-4 h-4 text-emerald-300" />
              <span className="hidden sm:inline">Carica File</span>
            </button>

            {onOpenRecesso && (
              <button
                onClick={onOpenRecesso}
                className="px-4 py-3 rounded-2xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/30 text-rose-200 font-bold text-xs sm:text-sm flex items-center gap-2 backdrop-blur-md active:scale-95 transition-all cursor-pointer"
                title="Generatore disdette e recessi legali PEC"
              >
                <FileSignature className="w-4 h-4 text-rose-400" />
                <span className="hidden sm:inline">Disdette PEC</span>
              </button>
            )}
          </div>
        </div>

        {/* Mini Stats Ribbon */}
        <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8 pt-6 border-t border-white/10">
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xl font-black text-white leading-none">{stats.total}</p>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-1">Salvati</p>
            </div>
          </div>

          <div className={`p-3.5 rounded-2xl border flex items-center gap-3 transition-colors ${
            stats.expiringSoon > 0 || stats.expired > 0
              ? 'bg-rose-500/15 border-rose-500/30 text-rose-300'
              : 'bg-white/5 border-white/10 text-slate-400'
          }`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              stats.expiringSoon > 0 || stats.expired > 0
                ? 'bg-rose-500/25 text-rose-400'
                : 'bg-white/10 text-slate-300'
            }`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xl font-black text-white leading-none">
                {stats.expiringSoon + stats.expired}
              </p>
              <p className="text-[11px] font-bold uppercase tracking-wider mt-1">
                {stats.expired > 0 ? `${stats.expired} Scaduti` : 'In Scadenza'}
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-300 flex items-center justify-center shrink-0">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xl font-black text-white leading-none">{stats.withPdf}</p>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-1">Con Copia PDF</p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xl font-black text-white leading-none">{stats.protectedCount}</p>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-1">Biometria</p>
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================================
          2. FILTRI, RICERCA E VISTA (CONTROLLI INTERATTIVI)
         ===================================================================== */}
      <div className="bg-[var(--card-bg)]/80 backdrop-blur-2xl border border-[var(--border)] rounded-[2rem] p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Barra di ricerca full width / flessibile */}
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] group-focus-within:text-indigo-500 transition-colors" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cerca per titolo, codice fiscale, numero documento o ente..."
              className="w-full pl-11 pr-10 py-3 bg-[var(--surface-variant)]/60 border border-[var(--border)] focus:border-indigo-500 rounded-2xl text-sm font-semibold text-[var(--text-main)] placeholder:text-[var(--text-muted)] outline-none transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-[var(--text-muted)] hover:text-[var(--text-main)] rounded-full hover:bg-[var(--border)] transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Selettori di Vista & Ordinamento */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Ordinamento */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="py-3 px-3.5 bg-[var(--surface-variant)]/60 border border-[var(--border)] rounded-2xl text-xs font-bold text-[var(--text-main)] outline-none cursor-pointer hover:border-indigo-500 transition-all"
            >
              <option value="expiry">📅 Per Scadenza</option>
              <option value="title">🔤 Titolo (A-Z)</option>
              <option value="recent">⏱️ Più Recenti</option>
            </select>

            {/* Toggle visualizzazione */}
            <div className="flex items-center p-1 bg-[var(--surface-variant)]/60 border border-[var(--border)] rounded-2xl">
              <button
                onClick={() => setViewMode('wallet')}
                className={`p-2 rounded-xl transition-all cursor-pointer ${
                  viewMode === 'wallet'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
                title="Vista Carte Digitali Wallet"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>

              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-xl transition-all cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
                title="Vista Elenco Compatto"
              >
                <List className="w-4 h-4" />
              </button>

              <button
                onClick={() => setViewMode('archive')}
                className={`p-2 rounded-xl transition-all cursor-pointer ${
                  viewMode === 'archive'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
                title="Vista Archivio Copie PDF"
              >
                <FileSpreadsheet className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Categorie Pill Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {[
            { id: 'all', label: '🗂️ Tutti', count: folderDocuments.length },
            { id: 'tax_code', label: '💳 Tessera Sanitaria', count: folderDocuments.filter(d => d.documentType === 'tax_code').length },
            { id: 'identity', label: '🆔 Identità (CIE)', count: folderDocuments.filter(d => d.documentType === 'identity').length },
            { id: 'license', label: '🚗 Patente Guida', count: folderDocuments.filter(d => d.documentType === 'driving_license').length },
            { id: 'passport', label: '📘 Passaporto', count: folderDocuments.filter(d => d.documentType === 'passport' || (d.title || '').toLowerCase().includes('passaport')).length },
            { id: 'generic', label: '📄 Contratti & Altro', count: folderDocuments.filter(d => d.documentType === 'generic' || !['identity', 'driving_license', 'tax_code', 'passport'].includes(d.documentType || '')).length },
            { id: 'expiring', label: '⚠️ In Scadenza', count: stats.expiringSoon + stats.expired },
            { id: 'with_attachment', label: '📎 Con Copia PDF', count: stats.withPdf },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id as any)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 border cursor-pointer ${
                activeFilter === tab.id
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-500/20'
                  : 'bg-[var(--surface-variant)]/60 border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:border-indigo-500/30'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                activeFilter === tab.id ? 'bg-white/20 text-white' : 'bg-[var(--border)] text-[var(--text-muted)]'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* =====================================================================
          3. GRIGLIA / LISTA / ARCHIVIO DOCUMENTI
         ===================================================================== */}
      {filteredDocuments.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center text-center p-8 bg-[var(--card-bg)]/40 border border-dashed border-[var(--border)] rounded-[2.5rem]">
          <div className="w-20 h-20 bg-indigo-500/10 text-indigo-500 rounded-3xl flex items-center justify-center mb-5">
            <FileText className="w-10 h-10 opacity-70" />
          </div>
          <h3 className="text-xl font-bold text-[var(--text-main)] mb-1">
            {searchQuery ? 'Nessun documento corrisponde alla ricerca' : 'Nessun documento in questa sezione'}
          </h3>
          <p className="text-xs text-[var(--text-muted)] max-w-sm mb-6">
            {searchQuery 
              ? 'Prova a cercare un termine diverso o azzera i filtri di ricerca.' 
              : 'Aggiungi il tuo primo documento o scansiona una carta d\'identità o tessera sanitaria.'}
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-indigo-500/20 active:scale-95 cursor-pointer transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Nuovo Documento</span>
            </button>
            <button
              onClick={() => setShowScanner(true)}
              className="px-5 py-3 rounded-2xl bg-[var(--surface-variant)] hover:bg-[var(--border)] text-[var(--text-main)] font-bold text-xs uppercase tracking-wider flex items-center gap-2 active:scale-95 cursor-pointer transition-all border border-[var(--border)]"
            >
              <Camera className="w-4 h-4" />
              <span>Scansiona con Fotocamera</span>
            </button>
          </div>
        </div>
      ) : viewMode === 'wallet' ? (
        /* VISTA WALLET: Card 3D digitali ad alta fedeltà */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDocuments.map((doc) => {
            const isTaxCode = doc.documentType === 'tax_code';
            const isIdentity = doc.documentType === 'identity';
            const isLicense = doc.documentType === 'driving_license';
            const isPassport = doc.documentType === 'passport' || (doc.title || '').toLowerCase().includes('passaport');
            const countdown = getExpirationCountdown(doc.expiryDate);

            return (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="group relative flex flex-col"
              >
                {/* Visual Pass Card */}
                <div
                  onClick={() => onOpenDocument(doc)}
                  className="w-full aspect-[1.586/1] rounded-[2rem] p-5 flex flex-col justify-between relative overflow-hidden shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 cursor-pointer border select-none group/card"
                  style={{
                    background: isTaxCode
                      ? 'linear-gradient(135deg, #042f2e 0%, #0d5f57 45%, #02201d 100%)'
                      : isIdentity
                      ? 'linear-gradient(135deg, #0c1c38 0%, #173366 50%, #08142a 100%)'
                      : isLicense
                      ? 'linear-gradient(135deg, #702632 0%, #993d4c 45%, #4f1722 100%)'
                      : isPassport
                      ? 'linear-gradient(135deg, #3f0d1a 0%, #61182a 50%, #26060e 100%)'
                      : 'linear-gradient(135deg, #1e293b 0%, #334155 50%, #0f172a 100%)',
                    borderColor: 'rgba(255, 255, 255, 0.15)'
                  }}
                >
                  {/* Gloss Specular Reflection Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.08] to-white/[0.22] pointer-events-none rounded-[2rem]" />
                  <div className="absolute top-0 inset-x-0 h-1/2 bg-gradient-to-b from-white/[0.12] to-transparent pointer-events-none" />

                  {/* Card Header */}
                  <div className="relative z-10 flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {isTaxCode ? (
                        <div className="w-6 h-4 bg-[#003399] rounded-[3px] flex items-center justify-center border border-white/20 shrink-0">
                          <span className="text-[7px] text-white font-black leading-none">IT</span>
                        </div>
                      ) : isLicense ? (
                        <div className="w-6 h-4 rounded-[3px] border border-amber-300/40 bg-blue-900/80 flex items-center justify-center shrink-0">
                          <span className="text-[6.5px] text-amber-300 font-black">★ IT ★</span>
                        </div>
                      ) : isIdentity ? (
                        <div className="w-6 h-4 bg-[#003399] rounded-[3px] flex items-center justify-center border border-white/20 shrink-0">
                          <span className="text-[7px] text-white font-black leading-none">IT</span>
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center text-white/80">
                          <FileText className="w-3.5 h-3.5" />
                        </div>
                      )}

                      <div className="leading-tight">
                        <p className="text-[8px] font-black uppercase tracking-widest text-white/60">
                          {isTaxCode ? 'REPUBBLICA ITALIANA' : isLicense ? 'PATENTE DI GUIDA' : isIdentity ? 'CARTA DI IDENTITÀ' : isPassport ? 'REPUBBLICA ITALIANA' : 'DOCUMENTO DIGITALE'}
                        </p>
                        <p className="text-[10px] font-black text-white uppercase tracking-wider truncate max-w-[140px]">
                          {doc.title || (isTaxCode ? 'Tessera Sanitaria' : isLicense ? 'Patente UE' : isIdentity ? 'Identità CIE' : 'Documento')}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {doc.isSensitive && (
                        <div className="p-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30" title="Protetto da impronta">
                          <Lock className="w-3 h-3" />
                        </div>
                      )}
                      {doc.pdfAttachment && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setViewingAttachment({ title: doc.title || 'Documento', data: doc.pdfAttachment! });
                          }}
                          className="p-1 rounded-full bg-white/15 text-white hover:bg-white/30 transition-colors"
                          title="Visualizza allegato digitale"
                        >
                          <Eye className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Card Body: Chip + Main Code / Number */}
                  <div className="relative z-10 my-auto py-1">
                    <div className="flex items-center justify-between gap-3">
                      {(isTaxCode || isIdentity || isLicense) && <EmvChip />}
                      
                      <div className="flex-1 min-w-0">
                        <p className="text-[8px] font-black uppercase tracking-wider text-white/50 mb-0.5">
                          {isTaxCode ? 'CODICE FISCALE' : 'NUMERO DOCUMENTO'}
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-sm sm:text-base text-white tracking-widest uppercase truncate drop-shadow-sm">
                            {doc.number || '---'}
                          </span>
                          {doc.number && (
                            <button
                              onClick={(e) => handleCopyText(doc.number!, doc.id, e)}
                              className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-all shrink-0 active:scale-95"
                              title="Copia codice"
                            >
                              {copiedId === doc.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </div>
                      </div>

                      {isIdentity && <NfcWave />}
                    </div>
                  </div>

                  {/* Card Footer: Expiry Badge + Quick Barcode Trigger */}
                  <div className="relative z-10 flex items-center justify-between border-t border-white/10 pt-2 text-white">
                    <div className="text-[9px] font-bold text-white/70">
                      SCADENZA: <span className="text-white font-black">{doc.expiryDate ? new Date(doc.expiryDate).toLocaleDateString('it-IT') : '---'}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {Boolean(doc.number) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setBarcodeModalDoc(doc);
                            setBarcodeCodeType(isTaxCode ? 'barcode' : 'qrcode');
                          }}
                          className="px-2 py-0.5 rounded-full bg-white/15 hover:bg-white/25 text-[8px] font-black uppercase text-white flex items-center gap-1 transition-all active:scale-95"
                          title="Mostra codice a barre o QR Code"
                        >
                          <Barcode className="w-3 h-3" />
                          <span>Ottico</span>
                        </button>
                      )}

                      <div className={`px-2 py-0.5 rounded-full border text-[8px] font-black uppercase flex items-center gap-1 ${countdown.badgeClass}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${countdown.dotClass}`} />
                        <span>{countdown.label}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sub-Card Quick Action Bar */}
                <div className="flex items-center justify-between px-3 py-2 mt-1.5 text-xs text-[var(--text-muted)]">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onOpenDocument(doc)}
                      className="px-2.5 py-1 rounded-xl hover:bg-[var(--surface-variant)] text-[var(--text-main)] font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-3 h-3 text-indigo-500" />
                      <span>Modifica</span>
                    </button>

                    {onShareDocument && (
                      <button
                        onClick={() => onShareDocument(doc)}
                        className="p-1.5 rounded-xl hover:bg-[var(--surface-variant)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
                        title="Condividi documento"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {onToggleSensitivity && (
                      <button
                        onClick={() => onToggleSensitivity(doc)}
                        className={`p-1.5 rounded-xl hover:bg-[var(--surface-variant)] transition-colors cursor-pointer ${
                          doc.isSensitive ? 'text-amber-500' : 'text-[var(--text-muted)]'
                        }`}
                        title={doc.isSensitive ? 'Rimuovi protezione impronta' : 'Proteggi con impronta'}
                      >
                        {doc.isSensitive ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => setDeleteConfirmId(doc.id)}
                    className="p-1.5 rounded-xl hover:bg-rose-500/10 text-[var(--text-muted)] hover:text-rose-500 transition-colors cursor-pointer"
                    title="Elimina documento"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : viewMode === 'list' ? (
        /* VISTA LISTA: Elenco compatto ad alta efficienza */
        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[2.5rem] overflow-hidden shadow-sm">
          <div className="divide-y divide-[var(--border)]">
            {filteredDocuments.map((doc) => {
              const countdown = getExpirationCountdown(doc.expiryDate);
              const isTaxCode = doc.documentType === 'tax_code';

              return (
                <div
                  key={doc.id}
                  onClick={() => onOpenDocument(doc)}
                  className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-[var(--surface-variant)]/40 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0 border border-indigo-500/20 group-hover:scale-105 transition-transform">
                      {isTaxCode ? <Barcode className="w-6 h-6 text-emerald-500" /> : <FileText className="w-6 h-6" />}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm sm:text-base text-[var(--text-main)] truncate">
                          {doc.title || 'Documento senza titolo'}
                        </h4>
                        {doc.isSensitive && <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                        {doc.pdfAttachment && (
                          <span className="px-1.5 py-0.5 rounded-md bg-teal-500/10 text-teal-600 dark:text-teal-400 text-[10px] font-black uppercase">
                            PDF
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-[var(--text-muted)]">
                        {doc.number && (
                          <span className="font-mono font-bold text-[var(--text-main)]">
                            {doc.number}
                          </span>
                        )}
                        {doc.issuedBy && <span>• {doc.issuedBy}</span>}
                        {doc.expiryDate && (
                          <span>• Scade: {new Date(doc.expiryDate).toLocaleDateString('it-IT')}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className={`px-2.5 py-1 rounded-full border text-[10px] font-black uppercase hidden sm:flex items-center gap-1.5 ${countdown.badgeClass}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${countdown.dotClass}`} />
                      <span>{countdown.label}</span>
                    </div>

                    {doc.number && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setBarcodeModalDoc(doc);
                            setBarcodeCodeType(isTaxCode ? 'barcode' : 'qrcode');
                          }}
                          className="p-2 rounded-xl bg-[var(--surface-variant)] hover:bg-[var(--border)] text-[var(--text-muted)] hover:text-indigo-500 transition-colors"
                          title="Mostra codice a barre / QR Code"
                        >
                          <Barcode className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => handleCopyText(doc.number!, doc.id, e)}
                          className="p-2 rounded-xl bg-[var(--surface-variant)] hover:bg-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
                          title="Copia numero"
                        >
                          {copiedId === doc.id ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </>
                    )}

                    {doc.pdfAttachment && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setViewingAttachment({ title: doc.title || 'Documento', data: doc.pdfAttachment! });
                        }}
                        className="p-2 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 hover:bg-teal-500 hover:text-white transition-colors"
                        title="Visualizza allegato"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    )}

                    <ChevronRight className="w-5 h-5 text-[var(--text-muted)] group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* VISTA ARCHIVIO: Muro delle copie digitali e file PDF allegati */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {filteredDocuments.filter(d => Boolean(d.pdfAttachment)).map((doc) => {
            const isPdf = doc.pdfAttachment?.startsWith('data:application/pdf') || doc.pdfAttachment?.includes('application/pdf');

            return (
              <div
                key={doc.id}
                className="bg-[var(--card-bg)] border border-[var(--border)] rounded-3xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div>
                  <div 
                    onClick={() => setViewingAttachment({ title: doc.title || 'Documento', data: doc.pdfAttachment! })}
                    className="w-full aspect-[4/3] rounded-2xl bg-[var(--surface-variant)] mb-4 flex items-center justify-center relative overflow-hidden cursor-pointer group/thumb border border-[var(--border)]"
                  >
                    {!isPdf && doc.pdfAttachment?.startsWith('data:image') ? (
                      <img src={doc.pdfAttachment} alt={doc.title} className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform" />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-rose-500">
                        <FileText className="w-10 h-10 group-hover/thumb:scale-110 transition-transform" />
                        <span className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)]">File PDF</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center text-white transition-opacity">
                      <Eye className="w-6 h-6" />
                    </div>
                  </div>

                  <h4 className="font-bold text-sm text-[var(--text-main)] truncate">
                    {doc.title || 'Senza Titolo'}
                  </h4>
                  <p className="text-[11px] text-[var(--text-muted)] font-semibold mt-0.5">
                    {doc.number || 'Nessun codice'}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-4 mt-4 border-t border-[var(--border)]">
                  <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase">
                    {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString('it-IT') : 'Salvato'}
                  </span>

                  <div className="flex items-center gap-1">
                    {onSaveToSandbox && (
                      <button
                        onClick={async () => {
                          try {
                            await onSaveToSandbox(doc.title || 'Documento', doc.pdfAttachment!);
                            showToast('Allegato salvato in sandbox!', 'success');
                          } catch {
                            showToast('Errore salvataggio file', 'error');
                          }
                        }}
                        className="p-1.5 rounded-lg hover:bg-[var(--surface-variant)] text-emerald-500"
                        title="Salva copia in sandbox"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => setViewingAttachment({ title: doc.title || 'Documento', data: doc.pdfAttachment! })}
                      className="p-1.5 rounded-lg hover:bg-[var(--surface-variant)] text-indigo-500"
                      title="Apri file"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onOpenDocument(doc)}
                      className="p-1.5 rounded-lg hover:bg-[var(--surface-variant)] text-[var(--text-muted)] hover:text-[var(--text-main)]"
                      title="Dettaglio documento"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* =====================================================================
          4. MODALE INGRANDIMENTO BARCODE (PER FARMACIA / LETTORI OTTICI)
         ===================================================================== */}
      <AnimatePresence>
        {barcodeModalDoc && (
          <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white text-slate-900 rounded-[2.5rem] p-6 sm:p-8 max-w-lg w-full text-center shadow-2xl relative"
            >
              <button
                onClick={() => setBarcodeModalDoc(null)}
                className="absolute top-5 right-5 p-2 rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                {barcodeCodeType === 'barcode' ? <Barcode className="w-6 h-6" /> : <QrCode className="w-6 h-6" />}
              </div>

              <h3 className="text-xl font-black text-slate-900">
                {barcodeCodeType === 'barcode' ? 'Codice a Barre (Farmacia)' : 'QR Code Digitale'}
              </h3>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                {barcodeCodeType === 'barcode' 
                  ? 'Standard Code 39 ad alto contrasto per lettori ottici e laser da banco' 
                  : 'Matrice 2D ad alta risoluzione scansionabile da smartphone e fotocamere'}
              </p>

              {/* Selettore Barcode vs QR Code */}
              <div className="inline-flex p-1 bg-slate-100 rounded-2xl mb-4 border border-slate-200">
                <button
                  type="button"
                  onClick={() => setBarcodeCodeType('barcode')}
                  className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    barcodeCodeType === 'barcode' 
                      ? 'bg-white text-slate-900 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Barcode 1D
                </button>
                <button
                  type="button"
                  onClick={() => setBarcodeCodeType('qrcode')}
                  className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    barcodeCodeType === 'qrcode' 
                      ? 'bg-white text-slate-900 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  QR Code 2D
                </button>
              </div>

              {/* Riquadro ad alto contrasto per scanner */}
              <div className="p-6 bg-white border-2 border-slate-200 rounded-3xl shadow-inner flex flex-col items-center justify-center my-2 overflow-hidden">
                {barcodeCodeType === 'barcode' ? (
                  <BarcodeSVG
                    value={barcodeModalDoc.number || ''}
                    height={84}
                    barWidth={1.8}
                    showText={true}
                    color="#000000"
                    bgColor="#ffffff"
                    className="w-full"
                  />
                ) : (
                  <div className="p-2 bg-white rounded-2xl flex flex-col items-center">
                    <QRCodeSVG
                      value={barcodeModalDoc.number || barcodeModalDoc.title}
                      size={180}
                      level="M"
                      includeMargin={true}
                    />
                    <span className="font-mono font-bold text-xs text-slate-700 mt-2 tracking-widest">
                      {barcodeModalDoc.number}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-center gap-2 mt-5">
                <button
                  onClick={() => handleCopyText(barcodeModalDoc.number || '', barcodeModalDoc.id)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copia Valore</span>
                </button>
                <button
                  onClick={() => setBarcodeModalDoc(null)}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-all cursor-pointer"
                >
                  Chiudi
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* =====================================================================
          5. MODALE CREAZIONE NUOVO DOCUMENTO
         ===================================================================== */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <CreateDocumentModal
            onClose={() => setIsCreateModalOpen(false)}
            onSave={(newDoc) => {
              onCreateDocument(newDoc);
              setIsCreateModalOpen(false);
              showToast(`Documento "${newDoc.title}" salvato nel portafoglio!`, 'success');
            }}
            onLaunchScanner={() => {
              setIsCreateModalOpen(false);
              setShowScanner(true);
            }}
            folderId={selectedFolderId || undefined}
          />
        )}
      </AnimatePresence>

      {/* Visualizzatore Allegati Full Screen */}
      {viewingAttachment && (
        <DocumentViewer
          isOpen={true}
          title={viewingAttachment.title}
          data={viewingAttachment.data}
          onClose={() => setViewingAttachment(null)}
        />
      )}

      {/* Scanner Fotocamera integrato */}
      <AnimatePresence>
        {showScanner && (
          <DocumentScanner
            onCapture={(base64Pdf) => {
              const newDoc: DocumentModule = {
                id: 'mod_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
                type: 'document',
                title: `Scansione ${new Date().toLocaleDateString('it-IT')}`,
                documentType: 'generic',
                pdfAttachment: base64Pdf,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                x: 0, y: 0, w: 2, h: 2,
                folderId: selectedFolderId || undefined
              };
              onCreateDocument(newDoc);
              setShowScanner(false);
              showToast('Documento scansionato e salvato con successo!', 'success');
            }}
            onClose={() => setShowScanner(false)}
          />
        )}
      </AnimatePresence>

      {/* Dialogo conferma eliminazione */}
      <ConfirmDialog
        isOpen={Boolean(deleteConfirmId)}
        title="Elimina Documento"
        message="Sei sicuro di voler eliminare questo documento dal tuo portafoglio? L'azione non può essere annullata."
        confirmText="Elimina"
        cancelText="Annulla"
        onConfirm={() => {
          if (deleteConfirmId) {
            onDeleteDocument(deleteConfirmId);
            setDeleteConfirmId(null);
            showToast('Documento eliminato', 'info');
          }
        }}
        onCancel={() => setDeleteConfirmId(null)}
      />
    </div>
  );
};

// =============================================================================
// SUB-COMPONENTE: MODALE CREAZIONE NUOVO DOCUMENTO SMART
// =============================================================================
interface CreateDocumentModalProps {
  onClose: () => void;
  onSave: (doc: DocumentModule) => void;
  onLaunchScanner: () => void;
  folderId?: string;
}

const CreateDocumentModal: React.FC<CreateDocumentModalProps> = ({
  onClose,
  onSave,
  onLaunchScanner,
  folderId,
}) => {
  const [docType, setDocType] = useState<'tax_code' | 'identity' | 'driving_license' | 'passport' | 'generic'>('tax_code');
  const [title, setTitle] = useState('');
  const [number, setNumber] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [issuedBy, setIssuedBy] = useState('');
  const [notes, setNotes] = useState('');
  const [pdfAttachment, setPdfAttachment] = useState<string | null>(null);
  const [isSensitive, setIsSensitive] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Aggiornamento predefiniti in base al tipo selezionato
  const handleTypeSelect = (type: typeof docType) => {
    setDocType(type);
    if (!title || title === 'Tessera Sanitaria' || title === 'Carta d\'Identità' || title === 'Patente di Guida' || title === 'Passaporto' || title === 'Documento Generico') {
      switch (type) {
        case 'tax_code': setTitle('Tessera Sanitaria'); break;
        case 'identity': setTitle('Carta d\'Identità'); break;
        case 'driving_license': setTitle('Patente di Guida'); break;
        case 'passport': setTitle('Passaporto'); break;
        case 'generic': setTitle('Documento Personale'); break;
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setPdfAttachment(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newDoc: DocumentModule = {
      id: 'mod_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      type: 'document',
      documentType: docType,
      title: title.trim() || 'Documento',
      number: number.trim().toUpperCase() || undefined,
      issueDate: issueDate || undefined,
      expiryDate: expiryDate || undefined,
      issuedBy: issuedBy.trim() || undefined,
      content: notes.trim() || undefined,
      pdfAttachment: pdfAttachment || undefined,
      isSensitive,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      x: 0, y: 0, w: 2, h: 2,
      folderId
    };

    onSave(newDoc);
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/75 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,image/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[2.5rem] p-6 sm:p-8 max-w-xl w-full shadow-2xl relative my-8"
      >
        <div className="flex items-center justify-between pb-4 border-b border-[var(--border)] mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-bold">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-[var(--text-main)]">Aggiungi Documento</h3>
              <p className="text-xs text-[var(--text-muted)]">Salva una nuova tessera o file nel portafoglio</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--surface-variant)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pulsanti Rapidi: Scanner o Selettore Preset */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            type="button"
            onClick={onLaunchScanner}
            className="p-3 rounded-2xl bg-gradient-to-r from-indigo-500/10 to-purple-500/10 hover:from-indigo-500/20 hover:to-purple-500/20 border border-indigo-500/30 text-indigo-500 flex items-center justify-center gap-2 text-xs font-bold transition-all active:scale-95 cursor-pointer"
          >
            <Camera className="w-4 h-4" />
            <span>Scansiona con Fotocamera</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-3 rounded-2xl bg-[var(--surface-variant)] hover:bg-[var(--border)] border border-[var(--border)] text-[var(--text-main)] flex items-center justify-center gap-2 text-xs font-bold transition-all active:scale-95 cursor-pointer"
          >
            <Upload className="w-4 h-4 text-emerald-500" />
            <span>{pdfAttachment ? 'Allegato Pronto ✓' : 'Carica File / PDF'}</span>
          </button>
        </div>

        {/* Tipo Documento (Preset Buttons) */}
        <div className="space-y-2 mb-6">
          <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider block">
            Tipo di Documento
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              { id: 'tax_code', label: '💳 Tessera Sanitaria' },
              { id: 'identity', label: '🆔 Carta Identità CIE' },
              { id: 'driving_license', label: '🚗 Patente Guida' },
              { id: 'passport', label: '📘 Passaporto' },
              { id: 'generic', label: '📄 Contratto / Altro' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => handleTypeSelect(t.id as any)}
                className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center ${
                  docType === t.id
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                    : 'bg-[var(--surface-variant)]/60 border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Form Campi Documento */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-1">
              Titolo / Intestatario *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="es. Mario Rossi / Tessera Sanitaria"
              className="w-full px-4 py-3 bg-[var(--surface-variant)] border border-[var(--border)] focus:border-indigo-500 rounded-2xl text-sm font-semibold text-[var(--text-main)] outline-none transition-all"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-1">
              {docType === 'tax_code' ? 'Codice Fiscale (16 caratteri)' : 'Numero Documento'} *
            </label>
            <input
              type="text"
              required
              value={number}
              onChange={(e) => setNumber(e.target.value.toUpperCase())}
              placeholder={docType === 'tax_code' ? 'RSSMRA80A01F205X' : 'es. CA12345AA o U1D987654Z'}
              className="w-full px-4 py-3 bg-[var(--surface-variant)] border border-[var(--border)] focus:border-indigo-500 rounded-2xl text-sm font-mono font-bold uppercase text-[var(--text-main)] outline-none transition-all"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-1">
                Data di Rilascio
              </label>
              <input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="w-full px-4 py-3 bg-[var(--surface-variant)] border border-[var(--border)] focus:border-indigo-500 rounded-2xl text-sm font-semibold text-[var(--text-main)] outline-none transition-all"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-1">
                Data di Scadenza
              </label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full px-4 py-3 bg-[var(--surface-variant)] border border-[var(--border)] focus:border-indigo-500 rounded-2xl text-sm font-semibold text-[var(--text-main)] outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-1">
              Rilasciato Da (Ente o Comune)
            </label>
            <input
              type="text"
              value={issuedBy}
              onChange={(e) => setIssuedBy(e.target.value)}
              placeholder="es. Ministero delle Finanze / Comune di Roma / MIT"
              className="w-full px-4 py-3 bg-[var(--surface-variant)] border border-[var(--border)] focus:border-indigo-500 rounded-2xl text-sm font-semibold text-[var(--text-main)] outline-none transition-all"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-1">
              Note Aggiuntive
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Note, dettagli o categorie abilitate..."
              className="w-full px-4 py-2.5 bg-[var(--surface-variant)] border border-[var(--border)] focus:border-indigo-500 rounded-2xl text-sm font-medium text-[var(--text-main)] outline-none resize-none transition-all"
            />
          </div>

          {/* Opzione Dati Protetti con PIN/Biometria */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[var(--surface-variant)] border border-[var(--border)]">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${isSensitive ? 'bg-amber-500/10 text-amber-500' : 'bg-slate-500/10 text-slate-400'}`}>
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-[var(--text-main)] block">Proteggi con Impronta / PIN</span>
                <span className="text-[10px] text-[var(--text-muted)]">I dati saranno oscurati finché non sblocchi la sezione protetta</span>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isSensitive}
              onClick={() => setIsSensitive(!isSensitive)}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                isSensitive ? 'bg-amber-500' : 'bg-gray-300 dark:bg-gray-700'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  isSensitive ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border)] mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 rounded-2xl bg-[var(--surface-variant)] hover:bg-[var(--border)] text-[var(--text-main)] font-bold text-xs uppercase tracking-wider transition-all"
            >
              Annulla
            </button>

            <button
              type="submit"
              className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-indigo-500/25 active:scale-95 transition-all"
            >
              Salva Documento
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
