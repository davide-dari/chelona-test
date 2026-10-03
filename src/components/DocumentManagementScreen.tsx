import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DocumentModule } from '../types';
import { 
  ArrowLeft, FileText, Calendar, Shield, Trash2, Edit2, Save, Download, 
  Eye, QrCode, Share2, MoreVertical, X, Clock, MapPin, Building2, Hash, 
  Copy, CheckCheck, FileSignature, Camera, Sparkles, AlertTriangle, 
  CheckCircle2, RefreshCw, Upload, Smartphone, ExternalLink, ChevronRight,
  Scan, Image as ImageIcon
} from 'lucide-react';
import { ConfirmDialog } from './ConfirmDialog';
import { 
  getExpirationCountdown, 
  parseDocumentText, 
  ParsedDocumentData, 
  ExpirationCountdown 
} from '../utils/documentOcrParser';
import { loadExternalScript } from '../utils/loader';

interface DocumentManagementScreenProps {
  module: DocumentModule;
  onSave: (m: DocumentModule) => void;
  onCancel: () => void;
  onDelete?: (id: string) => void;
  onShare?: (m: DocumentModule) => void;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

// Microchip stile Apple Wallet / EMV Smartcard dorato debossed
const AppleWalletChip: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`w-11 h-8 sm:w-12 sm:h-9 rounded-lg bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600 p-[1.5px] shadow-md border border-amber-300/40 relative overflow-hidden shrink-0 select-none ${className}`}>
    <div className="w-full h-full rounded-[6px] bg-gradient-to-br from-amber-300 via-amber-400 to-yellow-500 relative flex items-center justify-center">
      {/* Circuit lines */}
      <div className="absolute inset-x-0 top-1/2 h-[1px] bg-amber-800/40 -translate-y-1/2" />
      <div className="absolute inset-y-0 left-1/3 w-[1px] bg-amber-800/40" />
      <div className="absolute inset-y-0 right-1/3 w-[1px] bg-amber-800/40" />
      <div className="w-4 h-3.5 rounded-[3px] border border-amber-800/50 bg-amber-200/50 shadow-inner flex items-center justify-center">
        <div className="w-2 h-1.5 rounded-[1px] border border-amber-800/30 bg-amber-300/30" />
      </div>
    </div>
  </div>
);

// Icona NFC Contactless wave Apple Wallet
const NfcWaveIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5 text-white/70' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 16.5a5.5 5.5 0 0 1 0-9" />
    <path d="M10.5 19a9 9 0 0 1 0-14" />
    <path d="M14 21.5a12.5 12.5 0 0 1 0-19" />
  </svg>
);

export const DocumentManagementScreen: React.FC<DocumentManagementScreenProps> = ({ 
  module, 
  onSave, 
  onCancel, 
  onDelete, 
  onShare,
  showToast 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [data, setData] = useState<DocumentModule>({ ...module });
  const [showViewer, setShowViewer] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [copied, setCopied] = useState(false);

  // Stati OCR & Fotocamera
  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [showOcrActionModal, setShowOcrActionModal] = useState<boolean>(false);
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [ocrStep, setOcrStep] = useState<string>('');
  const [ocrProgress, setOcrProgress] = useState<number>(0);
  const [ocrPreviewOpen, setOcrPreviewOpen] = useState(false);
  const [ocrCandidate, setOcrCandidate] = useState<ParsedDocumentData | null>(null);
  const [capturedImageDataUrl, setCapturedImageDataUrl] = useState<string | null>(null);
  const [attachImageAsDocument, setAttachImageAsDocument] = useState<boolean>(true);
  const [manualOcrTextInput, setManualOcrTextInput] = useState<string>('');
  const [showManualOcrFallback, setShowManualOcrFallback] = useState(false);

  const countdown = getExpirationCountdown(data.expiryDate);

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
    } catch {
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
    } catch {
      successful = false;
    }
    
    if (successful) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      const result = window.prompt("Copia il codice documento:", text);
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
  const isPassport = (data.title && data.title.toLowerCase().includes('passaporto')) || data.documentType === 'passport';
  const isColorCard = isTaxCode || isIdentity || isLicense || isPassport;

  const handleSave = () => {
    onSave({
      ...data,
      updatedAt: new Date().toISOString()
    });
    setIsEditing(false);
    if (showToast) showToast('Documento aggiornato con successo!', 'success');
  };

  const getDocTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      identity: 'Carta d\'Identità',
      driving_license: 'Patente di Guida',
      tax_code: 'Codice Fiscale / Tessera Sanitaria',
      passport: 'Passaporto',
      generic: 'Documento Personale'
    };
    return labels[type] || type;
  };

  // ---------------------------------------------------------------------------
  // GESTIONE CAMERA / OCR CON TEXT PARSING CLIENT-SIDE
  // ---------------------------------------------------------------------------
  const triggerCameraOcr = () => {
    setShowOcrActionModal(true);
  };

  const handleImageFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsOcrProcessing(true);
    setOcrProgress(5);
    setOcrStep('Caricamento immagine...');

    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
      });
      reader.readAsDataURL(file);
      const dataUrl = await base64Promise;
      setCapturedImageDataUrl(dataUrl);

      // Pre-elaborazione su canvas HTML5 per migliorare nitidezza testo ed eliminare rumore
      setOcrStep('Ottimizzazione nitidezza e contrasto...');
      setOcrProgress(20);

      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = dataUrl;
      });

      // Scala immagine adatta per OCR (max 1600px lato maggiore)
      const maxDim = 1600;
      let targetW = img.width;
      let targetH = img.height;
      if (targetW > maxDim || targetH > maxDim) {
        if (targetW > targetH) {
          targetH = Math.round((targetH * maxDim) / targetW);
          targetW = maxDim;
        } else {
          targetW = Math.round((targetW * maxDim) / targetH);
          targetH = maxDim;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context not available');

      ctx.drawImage(img, 0, 0, targetW, targetH);

      // Filtro di contrasto e binarizzazione scala di grigi
      const imgData = ctx.getImageData(0, 0, targetW, targetH);
      const d = imgData.data;
      for (let i = 0; i < d.length; i += 4) {
        // Luminanza standard Rec.709
        const lum = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
        // Contrasto aumentato
        const contrasted = lum < 120 ? Math.max(0, lum * 0.7) : Math.min(255, lum * 1.3);
        d[i] = contrasted;
        d[i + 1] = contrasted;
        d[i + 2] = contrasted;
      }
      ctx.putImageData(imgData, 0, 0);

      // Carica motore Tesseract.js da CDN
      setOcrStep('Caricamento motore OCR Tesseract...');
      setOcrProgress(40);

      let rawExtractedText = '';
      try {
        await loadExternalScript('https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js', 'tesseract-ocr-script');
        const Tesseract = (window as any).Tesseract;

        if (Tesseract && Tesseract.recognize) {
          setOcrStep('Scansione e riconoscimento caratteri...');
          const ocrResult = await Tesseract.recognize(canvas, 'ita+eng', {
            logger: (m: any) => {
              if (m.status === 'recognizing text') {
                const prog = Math.round(40 + m.progress * 50);
                setOcrProgress(prog);
                setOcrStep(`Riconoscimento caratteri... ${Math.round(m.progress * 100)}%`);
              }
            }
          });
          rawExtractedText = ocrResult?.data?.text || '';
        } else {
          throw new Error('Tesseract script non disponibile');
        }
      } catch (ocrErr) {
        console.warn('Tesseract fallback or offline:', ocrErr);
        // Fallback: apri dialog per incollare testo o compilare rapidamente se offline
        setShowManualOcrFallback(true);
        setIsOcrProcessing(false);
        return;
      }

      setOcrStep('Analisi intelligente dei campi del documento...');
      setOcrProgress(95);

      // Parsing semantico avanzato
      const parsed = parseDocumentText(rawExtractedText);
      setOcrCandidate(parsed);
      setOcrProgress(100);
      setIsOcrProcessing(false);
      setOcrPreviewOpen(true);

    } catch (err: any) {
      console.error('Errore durante elaborazione OCR:', err);
      setIsOcrProcessing(false);
      setShowManualOcrFallback(true);
    }
  };

  const handleManualOcrParse = () => {
    if (!manualOcrTextInput.trim()) return;
    const parsed = parseDocumentText(manualOcrTextInput);
    setOcrCandidate(parsed);
    setShowManualOcrFallback(false);
    setOcrPreviewOpen(true);
  };

  const applyOcrCandidate = () => {
    if (!ocrCandidate) return;

    const updated: DocumentModule = {
      ...data,
      documentType: ocrCandidate.documentType,
      title: ocrCandidate.title || data.title,
      number: ocrCandidate.number || data.number,
      issueDate: ocrCandidate.issueDate || data.issueDate,
      expiryDate: ocrCandidate.expiryDate || data.expiryDate,
      issuedBy: ocrCandidate.issuedBy || data.issuedBy,
      updatedAt: new Date().toISOString()
    };

    if (attachImageAsDocument && capturedImageDataUrl) {
      updated.pdfAttachment = capturedImageDataUrl;
    }

    setData(updated);
    onSave(updated);
    setOcrPreviewOpen(false);
    setCapturedImageDataUrl(null);
    setOcrCandidate(null);
    if (showToast) {
      showToast('Dati documento auto-compilati via OCR!', 'success');
    }
  };

  // Calcolo percentuale tempo trascorso (timeline tra rilascio e scadenza)
  const timelineProgress = (() => {
    if (!data.issueDate || !data.expiryDate) return null;
    const start = new Date(data.issueDate).getTime();
    const end = new Date(data.expiryDate).getTime();
    const now = Date.now();
    if (isNaN(start) || isNaN(end) || end <= start) return null;
    const total = end - start;
    const elapsed = now - start;
    const pct = Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
    return pct;
  })();

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="fixed inset-0 z-[150] bg-[var(--bg)] flex flex-col"
    >
      {/* Hidden file input per fotocamera e scansione foto */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleImageFileSelected}
        className="hidden"
      />
      {/* Hidden file input per selezione da galleria o file */}
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageFileSelected}
        className="hidden"
      />

      {/* Header Apple Wallet style */}
      <header className="bg-[var(--card-bg)] border-b border-[var(--border)] px-4 sm:px-6 py-3.5 flex items-center justify-between shrink-0 z-30">
        <div className="flex items-center gap-3">
          <button 
            onClick={onCancel} 
            className="p-2 hover:bg-[var(--surface-variant)] text-[var(--text-main)] rounded-2xl transition-colors border border-transparent hover:border-[var(--border)]"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-[var(--text-main)] uppercase tracking-tight leading-none">
                {data.title || getDocTypeLabel(data.documentType)}
              </h2>
            </div>
            <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mt-1">
              Apple Wallet • Documenti Digitali
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Pulsante OCR Fotocamera Rapido */}
          <button
            onClick={triggerCameraOcr}
            className="px-3 py-2 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 hover:from-indigo-500/20 hover:to-pink-500/20 text-indigo-500 border border-indigo-500/30 rounded-2xl flex items-center gap-1.5 text-xs font-black shadow-sm transition-all active:scale-95"
            title="Scansiona con Fotocamera / OCR"
          >
            <Camera className="w-4 h-4 text-indigo-500" />
            <span className="hidden sm:inline">OCR Smart</span>
            <Sparkles className="w-3 h-3 text-amber-500 animate-pulse" />
          </button>

          {/* Disdetta PEC */}
          <button 
            onClick={() => window.dispatchEvent(new CustomEvent('notificationRouteReceived', { detail: { route: 'recesso' } }))}
            className="p-2 sm:px-3 sm:py-2 bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 rounded-2xl hover:bg-rose-500/20 transition-all flex items-center gap-1.5 text-xs font-bold"
            title="Nuova Disdetta o Recesso PEC"
          >
            <FileSignature className="w-4 h-4" />
            <span className="hidden md:inline">Disdetta PEC</span>
          </button>

          {!isEditing ? (
            <button 
              onClick={() => setIsEditing(true)}
              className="p-2.5 bg-[var(--accent-bg)] text-[var(--accent)] border border-[var(--accent)]/30 rounded-2xl hover:bg-[var(--accent)] hover:text-white transition-all active:scale-95"
              title="Modifica documento"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          ) : (
            <button 
              onClick={handleSave}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center gap-1.5 text-xs font-black"
            >
              <Save className="w-4 h-4" />
              <span>Salva</span>
            </button>
          )}
        </div>
      </header>

      {/* Contenitore Principale */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-2xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">

          {/* ============================================================== */}
          {/* APPLE WALLET PASS CARD VISUAL RENDERER                          */}
          {/* ============================================================== */}
          <div className="relative group">
            
            {/* === 1. TESSERA SANITARIA / CODICE FISCALE === */}
            {isTaxCode && (
              <div 
                className="relative aspect-[1.586/1] w-full rounded-[2rem] overflow-hidden shadow-2xl transition-all duration-300 hover:shadow-emerald-950/40 border border-white/20 select-none cursor-pointer"
                style={{ background: 'linear-gradient(135deg, #042f2e 0%, #0d5f57 45%, #02201d 100%)' }}
                onClick={() => data.pdfAttachment && setShowViewer(true)}
              >
                {/* Gloss specular reflection overlay stile Apple Card */}
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.08] to-white/[0.25] pointer-events-none rounded-[2rem]" />
                <div className="absolute top-0 inset-x-0 h-1/2 bg-gradient-to-b from-white/[0.12] to-transparent pointer-events-none" />
                <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 0, transparent 8px)' }} />

                {/* Stellone d'Italia Watermark */}
                <div className="absolute right-4 top-1/2 -translate-y-1/2 w-40 h-40 opacity-[0.08] pointer-events-none text-white">
                  <svg viewBox="0 0 100 100" fill="currentColor" className="w-full h-full">
                    <path d="M50 15 L58 38 L83 38 L63 53 L70 76 L50 61 L30 76 L37 53 L17 38 L42 38 Z" />
                    <circle cx="50" cy="50" r="22" fill="none" stroke="currentColor" strokeWidth="4" />
                  </svg>
                </div>

                {/* Sezione Superiore (Header Pass) */}
                <div className="absolute top-4 sm:top-5 inset-x-4 sm:inset-x-6 flex items-start justify-between z-10">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-5 bg-[#003399] rounded flex flex-col items-center justify-center border border-white/20 shadow-sm shrink-0">
                      <span className="text-[7.5px] text-white font-black leading-none">IT</span>
                    </div>
                    <div>
                      <p className="text-[7px] sm:text-[8px] font-black text-teal-200 uppercase tracking-[0.2em] leading-tight m-0">REPUBBLICA ITALIANA</p>
                      <p className="text-[8.5px] sm:text-[10px] font-black text-white uppercase tracking-widest leading-tight m-0">TESSERA SANITARIA • CF</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <NfcWaveIcon className="w-5 h-5 text-teal-200/80" />
                    <div className="text-right">
                      <p className="text-[6.5px] font-black text-white/50 uppercase tracking-widest leading-none m-0">MINISTERO</p>
                      <p className="text-[6.5px] font-black text-white/50 uppercase tracking-widest leading-none m-0">DELL'ECONOMIA</p>
                    </div>
                  </div>
                </div>

                {/* Sezione Centrale: Chip Dorato + Box Codice Fiscale */}
                <div className="absolute inset-x-4 sm:inset-x-6 top-1/2 -translate-y-1/2 flex items-center gap-3 sm:gap-4 z-10">
                  <AppleWalletChip />

                  <div 
                    onClick={handleCopy}
                    className="flex-1 bg-emerald-50/95 hover:bg-white rounded-2xl border border-emerald-600/40 shadow-inner px-3.5 py-3 sm:py-3.5 flex items-center justify-between min-w-0 cursor-pointer transition-colors group/copy"
                    title="Tocca per copiare il codice fiscale"
                  >
                    <div className="flex-1 text-center min-w-0">
                      <p className="text-[6.5px] sm:text-[7px] font-black text-emerald-900/60 uppercase tracking-widest m-0 leading-none mb-0.5">CODICE FISCALE</p>
                      <span className="text-emerald-950 font-mono font-black text-sm sm:text-base md:text-lg tracking-[0.16em] uppercase truncate block">
                        {data.number || 'RSSMRA80A01F205X'}
                      </span>
                    </div>

                    <div className="p-1.5 rounded-xl bg-emerald-700/10 text-emerald-800 transition-colors shrink-0 border border-emerald-800/15 ml-2">
                      {copied ? (
                        <CheckCheck className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Copy className="w-4 h-4 opacity-50 group-hover/copy:opacity-100 transition-opacity" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Sezione Inferiore: Date e Chip Scadenza Apple Wallet */}
                <div className="absolute bottom-0 inset-x-0 h-11 sm:h-12 bg-black/30 border-t border-white/10 backdrop-blur-md flex items-center px-4 sm:px-6 justify-between z-10">
                  <div className="flex gap-4 sm:gap-6">
                    <div>
                      <p className="text-[6px] sm:text-[6.5px] text-teal-200/60 font-black uppercase tracking-widest m-0">SCADENZA</p>
                      <p className="text-[9px] sm:text-[10px] text-white font-black m-0">
                        {data.expiryDate ? new Date(data.expiryDate).toLocaleDateString('it-IT') : '---'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[6px] sm:text-[6.5px] text-teal-200/60 font-black uppercase tracking-widest m-0">RILASCIO</p>
                      <p className="text-[9px] sm:text-[10px] text-white font-black m-0">
                        {data.issueDate ? new Date(data.issueDate).toLocaleDateString('it-IT') : '---'}
                      </p>
                    </div>
                  </div>

                  {/* Expiration Countdown Chip */}
                  <div className={`px-2.5 py-1 rounded-full border text-[8px] sm:text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm ${countdown.badgeClass}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${countdown.dotClass}`} />
                    <span>{countdown.label}</span>
                  </div>
                </div>

                {/* PDF overlay al passaggio del mouse */}
                {data.pdfAttachment && (
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm rounded-[2rem] z-20">
                    <div className="bg-white text-black px-5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-2xl">
                      <Eye className="w-4 h-4" /> Visualizza PDF / Scansione
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* === 2. CARTA D'IDENTITÀ ELETTRONICA (CIE) === */}
            {isIdentity && (
              <div 
                className="relative aspect-[1.586/1] w-full rounded-[2rem] overflow-hidden shadow-2xl transition-all duration-300 hover:shadow-indigo-950/40 border border-white/20 select-none cursor-pointer"
                style={{ background: 'linear-gradient(135deg, #091b38 0%, #123166 50%, #040d1f 100%)' }}
                onClick={() => data.pdfAttachment && setShowViewer(true)}
              >
                {/* Specular highlights */}
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.08] to-white/[0.22] pointer-events-none rounded-[2rem]" />
                <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '16px 16px' }} />

                {/* Fascia UE laterale sinistra */}
                <div className="absolute left-0 top-0 bottom-0 w-12 sm:w-14 flex flex-col items-center justify-between py-3.5 z-10" style={{ background: 'rgba(0, 47, 135, 0.85)' }}>
                  <div className="flex flex-col items-center gap-0.5">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <span key={i} className="text-yellow-300 text-[6px]">★</span>
                    ))}
                  </div>
                  <span className="text-[6.5px] font-black text-white/90 uppercase tracking-[0.25em] rotate-[-90deg] whitespace-nowrap" style={{ writingMode: 'vertical-rl' }}>
                    ITALIA
                  </span>
                  <div className="flex flex-col items-center gap-0.5">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <span key={i} className="text-yellow-300 text-[6px]">★</span>
                    ))}
                  </div>
                </div>

                {/* Contenuto Carta CIE */}
                <div className="absolute left-14 sm:left-18 right-4 sm:right-6 top-4 bottom-12 z-10 flex flex-col justify-between">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[6.5px] sm:text-[7.5px] font-black text-blue-200 uppercase tracking-[0.2em] leading-tight m-0">CARTA D'IDENTITÀ ELETTRONICA</p>
                      <p className="text-[6px] text-white/50 uppercase tracking-widest leading-none mt-0.5 m-0">MINISTERO DELL'INTERNO</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <NfcWaveIcon className="w-4 h-4 text-blue-200/80" />
                      <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
                        <span className="text-xs">🇮🇹</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 my-auto">
                    <div className="min-w-0 flex-1">
                      <p className="text-[6.5px] text-blue-200/70 font-black uppercase tracking-widest m-0">INTESTATARIO</p>
                      <p className="text-xs sm:text-sm font-black text-white tracking-wide truncate m-0">
                        {data.title || 'ROSSI MARIO'}
                      </p>

                      <p className="text-[6.5px] text-blue-200/70 font-black uppercase tracking-widest mt-1.5 m-0">NUMERO C.I.E.</p>
                      <div 
                        onClick={handleCopy}
                        className="inline-flex items-center gap-2 px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded-xl border border-white/15 cursor-pointer transition-colors"
                        title="Tocca per copiare"
                      >
                        <span className="text-xs sm:text-sm font-black text-white font-mono tracking-wider">
                          {data.number || 'CA00000AA'}
                        </span>
                        {copied ? <CheckCheck className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-white/50" />}
                      </div>
                    </div>

                    <AppleWalletChip />
                  </div>
                </div>

                {/* Barra bassa con date e chip scadenza */}
                <div className="absolute bottom-0 inset-x-0 h-10 sm:h-11 bg-black/40 border-t border-white/10 backdrop-blur-md flex items-center px-4 sm:px-6 justify-between z-10 pl-14 sm:pl-18">
                  <div className="flex gap-4">
                    <p className="text-[7px] sm:text-[8px] text-white/60 font-bold uppercase tracking-widest m-0">
                      SCAD: <span className="text-white font-black">{data.expiryDate ? new Date(data.expiryDate).toLocaleDateString('it-IT') : '---'}</span>
                    </p>
                    <p className="text-[7px] sm:text-[8px] text-white/60 font-bold uppercase tracking-widest m-0">
                      RIL: <span className="text-white font-black">{data.issueDate ? new Date(data.issueDate).toLocaleDateString('it-IT') : '---'}</span>
                    </p>
                  </div>

                  <div className={`px-2 py-0.5 rounded-full border text-[8px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm ${countdown.badgeClass}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${countdown.dotClass}`} />
                    <span>{countdown.label}</span>
                  </div>
                </div>

                {data.pdfAttachment && (
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm rounded-[2rem] z-20">
                    <div className="bg-white text-black px-5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2">
                      <Eye className="w-4 h-4" /> Visualizza PDF / Scansione
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* === 3. PATENTE DI GUIDA === */}
            {isLicense && (
              <div 
                className="relative aspect-[1.586/1] w-full rounded-[2rem] overflow-hidden shadow-2xl transition-all duration-300 hover:shadow-purple-950/40 border border-white/20 select-none cursor-pointer"
                style={{ background: 'linear-gradient(135deg, #270845 0%, #431475 50%, #120324 100%)' }}
                onClick={() => data.pdfAttachment && setShowViewer(true)}
              >
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.08] to-white/[0.22] pointer-events-none rounded-[2rem]" />
                <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'repeating-linear-gradient(-45deg, #fff 0, #fff 1px, transparent 0, transparent 8px)' }} />

                {/* Header */}
                <div className="absolute top-4 inset-x-4 sm:inset-x-6 flex items-center justify-between z-10">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center border border-white/20">
                      <span className="text-sm">🇮🇹</span>
                    </div>
                    <div>
                      <p className="text-[7px] font-black text-purple-200 uppercase tracking-[0.2em] leading-tight m-0">REPUBBLICA ITALIANA</p>
                      <p className="text-[8.5px] font-black text-white/90 uppercase tracking-widest leading-tight m-0">PATENTE DI GUIDA</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {['AM', 'B'].map(cat => (
                      <span key={cat} className="px-2 py-0.5 rounded-lg bg-white/20 border border-white/30 text-[9px] font-black text-white">
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Centro Patente */}
                <div className="absolute inset-x-4 sm:inset-x-6 top-1/2 -translate-y-1/2 flex flex-col items-center justify-center text-center z-10">
                  <p className="text-[7px] sm:text-[8px] font-black text-purple-200/70 uppercase tracking-widest mb-1 m-0">NUMERO PATENTE (5)</p>
                  <div 
                    onClick={handleCopy}
                    className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-2xl border border-white/20 cursor-pointer transition-colors"
                  >
                    <span className="text-lg sm:text-2xl font-black text-white font-mono tracking-[0.2em] drop-shadow-md">
                      {data.number || 'U1XXXXXXXX'}
                    </span>
                    {copied ? <CheckCheck className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-white/50" />}
                  </div>
                  {data.issuedBy && (
                    <p className="text-[7px] text-white/50 uppercase tracking-wider mt-1 m-0">Rilasciata da: {data.issuedBy}</p>
                  )}
                </div>

                {/* Barra Bassa */}
                <div className="absolute bottom-0 inset-x-0 h-10 sm:h-11 bg-black/40 border-t border-white/10 backdrop-blur-md flex items-center px-4 sm:px-6 justify-between z-10">
                  <div className="flex gap-4">
                    <p className="text-[7px] sm:text-[8px] text-white/60 font-bold uppercase tracking-widest m-0">
                      4b. SCAD: <span className="text-white font-black">{data.expiryDate ? new Date(data.expiryDate).toLocaleDateString('it-IT') : '---'}</span>
                    </p>
                    <p className="text-[7px] sm:text-[8px] text-white/60 font-bold uppercase tracking-widest m-0">
                      4a. RIL: <span className="text-white font-black">{data.issueDate ? new Date(data.issueDate).toLocaleDateString('it-IT') : '---'}</span>
                    </p>
                  </div>

                  <div className={`px-2 py-0.5 rounded-full border text-[8px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm ${countdown.badgeClass}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${countdown.dotClass}`} />
                    <span>{countdown.label}</span>
                  </div>
                </div>

                {data.pdfAttachment && (
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm rounded-[2rem] z-20">
                    <div className="bg-white text-black px-5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2">
                      <Eye className="w-4 h-4" /> Visualizza PDF / Scansione
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* === 4. PASSAPORTO / DOCUMENTO GENERICO === */}
            {(!isTaxCode && !isIdentity && !isLicense) && (
              <div 
                className="relative aspect-[1.586/1] w-full rounded-[2rem] overflow-hidden shadow-2xl transition-all duration-300 hover:shadow-indigo-950/30 border border-[var(--border)] select-none cursor-pointer"
                style={{
                  background: isPassport 
                    ? 'linear-gradient(135deg, #3b0811 0%, #5c0d1c 50%, #1e0307 100%)'
                    : 'linear-gradient(135deg, #181a1f 0%, #242831 60%, #0d0e12 100%)'
                }}
                onClick={() => data.pdfAttachment && setShowViewer(true)}
              >
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.05] to-white/[0.18] pointer-events-none rounded-[2rem]" />

                {/* Header Pass */}
                <div className="absolute top-4 sm:top-5 inset-x-4 sm:inset-x-6 flex items-start justify-between z-10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center text-white shadow-inner">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[7.5px] font-black text-white/50 uppercase tracking-[0.2em] leading-tight m-0">
                        {isPassport ? 'UNIONE EUROPEA • PASSAPORTO' : getDocTypeLabel(data.documentType)}
                      </p>
                      <h3 className="text-base sm:text-lg font-black text-white tracking-tight m-0">
                        {data.title || 'Documento Personale'}
                      </h3>
                    </div>
                  </div>

                  <NfcWaveIcon className="w-5 h-5 text-white/60" />
                </div>

                {/* Centro */}
                <div className="absolute inset-x-4 sm:inset-x-6 top-1/2 -translate-y-1/2 flex items-center justify-between gap-4 z-10">
                  <div 
                    onClick={handleCopy}
                    className="flex-1 px-4 py-2.5 bg-white/10 hover:bg-white/15 rounded-2xl border border-white/15 flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <div>
                      <p className="text-[6.5px] font-black text-white/50 uppercase tracking-widest m-0">NUMERO IDENTIFICATIVO</p>
                      <p className="text-sm sm:text-base font-black text-white font-mono tracking-wider m-0">
                        {data.number || '--- --- ---'}
                      </p>
                    </div>
                    {data.number && (
                      <div className="p-1 rounded-lg bg-white/10 text-white/70">
                        {copied ? <CheckCheck className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </div>
                    )}
                  </div>
                  {isPassport && <AppleWalletChip />}
                </div>

                {/* Barra Bassa */}
                <div className="absolute bottom-0 inset-x-0 h-11 sm:h-12 bg-black/40 border-t border-white/10 backdrop-blur-md flex items-center px-4 sm:px-6 justify-between z-10">
                  <div className="flex gap-4">
                    <p className="text-[7.5px] text-white/60 font-bold uppercase tracking-widest m-0">
                      SCAD: <span className="text-white font-black">{data.expiryDate ? new Date(data.expiryDate).toLocaleDateString('it-IT') : '---'}</span>
                    </p>
                    <p className="text-[7.5px] text-white/60 font-bold uppercase tracking-widest m-0">
                      RIL: <span className="text-white font-black">{data.issueDate ? new Date(data.issueDate).toLocaleDateString('it-IT') : '---'}</span>
                    </p>
                  </div>

                  <div className={`px-2.5 py-0.5 rounded-full border text-[8.5px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm ${countdown.badgeClass}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${countdown.dotClass}`} />
                    <span>{countdown.label}</span>
                  </div>
                </div>

                {data.pdfAttachment && (
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm rounded-[2rem] z-20">
                    <div className="bg-white text-black px-5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2">
                      <Eye className="w-4 h-4" /> Visualizza Allegato
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ============================================================== */}
          {/* TIMELINE STATO SCADENZA APPLE WALLET (COUNTDOWN CHIP EXTENDED) */}
          {/* ============================================================== */}
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-3xl p-4 sm:p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">{countdown.icon}</span>
                <div>
                  <h4 className="text-xs sm:text-sm font-black text-[var(--text-main)]">
                    {countdown.detail}
                  </h4>
                  <p className="text-[10px] text-[var(--text-muted)] font-semibold">
                    {data.expiryDate ? `Scadenza prevista: ${new Date(data.expiryDate).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}` : 'Nessuna data di scadenza registrata'}
                  </p>
                </div>
              </div>

              <div className={`px-3 py-1 rounded-full border text-[10px] font-black tracking-wide ${countdown.badgeClass}`}>
                {countdown.label}
              </div>
            </div>

            {/* Barra di avanzamento timeline ciclo di vita documento */}
            {timelineProgress !== null && (
              <div className="pt-1">
                <div className="flex items-center justify-between text-[9px] font-black text-[var(--text-muted)] mb-1">
                  <span>Rilascio: {new Date(data.issueDate!).toLocaleDateString('it-IT')}</span>
                  <span>{timelineProgress}% vita trascorsa</span>
                  <span>Scadenza: {new Date(data.expiryDate!).toLocaleDateString('it-IT')}</span>
                </div>
                <div className="w-full h-2 bg-[var(--surface-variant)] rounded-full overflow-hidden border border-[var(--border)]">
                  <div 
                    className={`h-full transition-all duration-500 rounded-full ${
                      timelineProgress >= 100 
                        ? 'bg-rose-500' 
                        : timelineProgress > 85 
                          ? 'bg-amber-500' 
                          : 'bg-emerald-500'
                    }`}
                    style={{ width: `${timelineProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* ============================================================== */}
          {/* BARRA AZIONI RAPIDE (SCAN OCR, QR, CONDIVIDI, ALLEGATO)        */}
          {/* ============================================================== */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button
              onClick={triggerCameraOcr}
              className="p-3 bg-[var(--card-bg)] hover:bg-[var(--surface-variant)] border border-indigo-500/30 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all text-center group active:scale-95 shadow-sm"
            >
              <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Camera className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-black text-[var(--text-main)] uppercase tracking-wider">
                Scansiona OCR
              </span>
            </button>

            <button
              onClick={() => onShare && onShare(data)}
              className="p-3 bg-[var(--card-bg)] hover:bg-[var(--surface-variant)] border border-[var(--border)] rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all text-center group active:scale-95 shadow-sm"
            >
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                <QrCode className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-black text-[var(--text-main)] uppercase tracking-wider">
                Mostra QR
              </span>
            </button>

            {data.pdfAttachment ? (
              <button
                onClick={() => setShowViewer(true)}
                className="p-3 bg-[var(--card-bg)] hover:bg-[var(--surface-variant)] border border-emerald-500/30 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all text-center group active:scale-95 shadow-sm"
              >
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Eye className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-black text-[var(--text-main)] uppercase tracking-wider">
                  Vedi Copia
                </span>
              </button>
            ) : (
              <button
                onClick={triggerCameraOcr}
                className="p-3 bg-[var(--card-bg)] hover:bg-[var(--surface-variant)] border border-dashed border-[var(--border)] rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all text-center group active:scale-95 shadow-sm"
              >
                <div className="w-9 h-9 rounded-xl bg-zinc-500/10 text-[var(--text-muted)] flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Upload className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-wider">
                  Carica Foto
                </span>
              </button>
            )}

            <button
              onClick={() => setIsEditing(!isEditing)}
              className="p-3 bg-[var(--card-bg)] hover:bg-[var(--surface-variant)] border border-[var(--border)] rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all text-center group active:scale-95 shadow-sm"
            >
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Edit2 className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-black text-[var(--text-main)] uppercase tracking-wider">
                {isEditing ? 'Chiudi Edit' : 'Modifica'}
              </span>
            </button>
          </div>

          {/* ============================================================== */}
          {/* DETTAGLI METADATI DOCUMENTO                                   */}
          {/* ============================================================== */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-4 sm:p-5 flex items-center gap-4">
              <div className="w-10 h-10 bg-[var(--bg)] rounded-xl flex items-center justify-center text-[var(--text-muted)] border border-[var(--border)] shrink-0">
                <Building2 className="w-5 h-5 text-indigo-500" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-0.5">Ente Emissione</p>
                <p className="text-xs font-bold text-[var(--text-main)] truncate">{data.issuedBy || 'Non specificato'}</p>
              </div>
            </div>

            <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-4 sm:p-5 flex items-center gap-4">
              <div className="w-10 h-10 bg-[var(--bg)] rounded-xl flex items-center justify-center text-[var(--text-muted)] border border-[var(--border)] shrink-0">
                <Hash className="w-5 h-5 text-purple-500" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-0.5">Numero Documento</p>
                <p className="text-xs font-bold text-[var(--text-main)] font-mono truncate">{data.number || '---'}</p>
              </div>
            </div>
          </div>

          {/* ============================================================== */}
          {/* MODALITA EDITING INLINE                                        */}
          {/* ============================================================== */}
          {isEditing && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[var(--card-bg)] border border-[var(--accent)]/30 rounded-3xl p-6 space-y-6 shadow-xl"
            >
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[var(--accent)]" />
                  <h4 className="font-black text-xs uppercase tracking-[0.2em] text-[var(--accent)]">
                    Editor Documento
                  </h4>
                </div>
                <button
                  onClick={triggerCameraOcr}
                  className="px-2.5 py-1 rounded-xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 text-[10px] font-black flex items-center gap-1 hover:bg-indigo-500/20 transition-colors"
                >
                  <Camera className="w-3 h-3" /> Auto-compila con OCR
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-1 md:col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1.5 block">
                    Titolo / Intestatario
                  </label>
                  <input 
                    type="text" 
                    value={data.title} 
                    onChange={e => setData({ ...data, title: e.target.value })} 
                    placeholder="Es. Mario Rossi o Carta Identità Personale"
                    className="w-full p-3.5 bg-[var(--bg)] border border-[var(--border)] rounded-2xl outline-none focus:border-[var(--accent)] transition-all font-bold text-[var(--text-main)] text-sm"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1.5 block">
                    Tipo di Documento
                  </label>
                  <select 
                    value={data.documentType} 
                    onChange={e => setData({ ...data, documentType: e.target.value })} 
                    className="w-full p-3.5 bg-[var(--bg)] border border-[var(--border)] rounded-2xl outline-none focus:border-[var(--accent)] transition-all font-bold text-[var(--text-main)] text-sm"
                  >
                    <option value="tax_code">Tessera Sanitaria / Codice Fiscale</option>
                    <option value="identity">Carta d'Identità (CIE)</option>
                    <option value="driving_license">Patente di Guida</option>
                    <option value="passport">Passaporto</option>
                    <option value="generic">Altro Documento</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1.5 block">
                    Numero Documento / Seriale
                  </label>
                  <input 
                    type="text" 
                    value={data.number || ''} 
                    onChange={e => setData({ ...data, number: e.target.value.toUpperCase() })} 
                    placeholder="Es. CA12345AA o RSSMRA80A01F205X"
                    className="w-full p-3.5 bg-[var(--bg)] border border-[var(--border)] rounded-2xl outline-none focus:border-[var(--accent)] transition-all font-mono font-bold text-[var(--text-main)] text-sm"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1.5 block">
                    Data Emissione
                  </label>
                  <input 
                    type="date" 
                    value={data.issueDate || ''} 
                    onChange={e => setData({ ...data, issueDate: e.target.value })} 
                    className="w-full p-3.5 bg-[var(--bg)] border border-[var(--border)] rounded-2xl outline-none focus:border-[var(--accent)] transition-all font-bold text-[var(--text-main)] text-sm" 
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1.5 block">
                    Data Scadenza
                  </label>
                  <input 
                    type="date" 
                    value={data.expiryDate || ''} 
                    onChange={e => setData({ ...data, expiryDate: e.target.value })} 
                    className="w-full p-3.5 bg-[var(--bg)] border border-[var(--border)] rounded-2xl outline-none focus:border-[var(--accent)] transition-all font-bold text-[var(--text-main)] text-sm" 
                  />
                </div>

                <div className="col-span-1 md:col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1.5 block">
                    Ente di Emissione
                  </label>
                  <input 
                    type="text" 
                    value={data.issuedBy || ''} 
                    onChange={e => setData({ ...data, issuedBy: e.target.value })} 
                    placeholder="Es. Comune di Milano, Ministero dell'Interno, MCTC"
                    className="w-full p-3.5 bg-[var(--bg)] border border-[var(--border)] rounded-2xl outline-none focus:border-[var(--accent)] transition-all font-bold text-[var(--text-main)] text-sm" 
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button 
                  onClick={handleSave} 
                  className="flex-1 py-3.5 bg-[var(--accent)] text-white rounded-2xl font-black text-xs uppercase tracking-widest active:scale-98 transition-all shadow-md"
                >
                  Salva Modifiche
                </button>
                {onDelete && (
                  <button 
                    onClick={() => setShowDeleteConfirm(true)} 
                    className="p-3.5 bg-rose-500/10 text-rose-500 rounded-2xl hover:bg-rose-500 hover:text-white transition-all active:scale-95"
                    title="Elimina Documento"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
            </motion.div>
          )}

        </div>
      </div>

      {/* ================================================================ */}
      {/* OVERLAY CARICAMENTO OCR IN CORSO                                  */}
      {/* ================================================================ */}
      <AnimatePresence>
        {isOcrProcessing && (
          <div className="fixed inset-0 z-[220] bg-black/80 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in">
            <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center space-y-4 shadow-2xl">
              <div className="w-16 h-16 rounded-3xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center mx-auto border border-indigo-500/20 shadow-inner">
                <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
              </div>

              <div>
                <h3 className="font-black text-base text-[var(--text-main)] uppercase tracking-tight">
                  Scansione OCR Smart
                </h3>
                <p className="text-xs text-[var(--text-muted)] mt-1 font-semibold">
                  {ocrStep || 'Elaborazione del documento...'}
                </p>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-[var(--surface-variant)] h-2 rounded-full overflow-hidden border border-[var(--border)]">
                <div 
                  className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full transition-all duration-300 rounded-full"
                  style={{ width: `${ocrProgress}%` }}
                />
              </div>
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">
                {ocrProgress}% completato
              </p>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* ================================================================ */}
      {/* MODAL ANTEPRIMA & VERIFICA DATI OCR PRIMA DI APPLICARE            */}
      {/* ================================================================ */}
      <AnimatePresence>
        {ocrPreviewOpen && ocrCandidate && (
          <div className="fixed inset-0 z-[230] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-fade-in">
            <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[2.5rem] p-6 max-w-lg w-full space-y-5 shadow-2xl my-auto">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-sm sm:text-base text-[var(--text-main)] uppercase tracking-tight">
                      Dati Rilevati da OCR
                    </h3>
                    <p className="text-[10px] text-[var(--text-muted)] font-semibold">
                      Controlla e conferma i campi estratti dal documento
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setOcrPreviewOpen(false)}
                  className="p-2 rounded-xl text-[var(--text-muted)] hover:bg-[var(--surface-variant)]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Immagine catturata (thumbnail) */}
              {capturedImageDataUrl && (
                <div className="w-full h-28 rounded-2xl overflow-hidden border border-[var(--border)] relative bg-black/30">
                  <img 
                    src={capturedImageDataUrl} 
                    alt="Cattura OCR" 
                    className="w-full h-full object-cover opacity-85"
                  />
                  <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-lg bg-black/60 backdrop-blur-md text-[9px] font-black text-white uppercase">
                    Foto Scansionata
                  </div>
                </div>
              )}

              {/* Campi rilevati editabili al volo */}
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] block mb-1">
                    Tipo Riconosciuto
                  </label>
                  <select
                    value={ocrCandidate.documentType}
                    onChange={(e) => setOcrCandidate({ ...ocrCandidate, documentType: e.target.value as any })}
                    className="w-full p-2.5 bg-[var(--bg)] border border-[var(--border)] rounded-xl font-bold text-xs text-[var(--text-main)] outline-none"
                  >
                    <option value="tax_code">Tessera Sanitaria / Codice Fiscale</option>
                    <option value="identity">Carta d'Identità (CIE)</option>
                    <option value="driving_license">Patente di Guida</option>
                    <option value="generic">Passaporto / Generico</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] block mb-1">
                      Numero / Codice
                    </label>
                    <input
                      type="text"
                      value={ocrCandidate.number || ''}
                      onChange={(e) => setOcrCandidate({ ...ocrCandidate, number: e.target.value.toUpperCase() })}
                      className="w-full p-2.5 bg-[var(--bg)] border border-[var(--border)] rounded-xl font-mono font-bold text-xs text-[var(--text-main)] outline-none"
                      placeholder="Non rilevato"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] block mb-1">
                      Intestatario / Nome
                    </label>
                    <input
                      type="text"
                      value={ocrCandidate.title || ''}
                      onChange={(e) => setOcrCandidate({ ...ocrCandidate, title: e.target.value })}
                      className="w-full p-2.5 bg-[var(--bg)] border border-[var(--border)] rounded-xl font-bold text-xs text-[var(--text-main)] outline-none"
                      placeholder="Intestatario"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] block mb-1">
                      Data Scadenza
                    </label>
                    <input
                      type="date"
                      value={ocrCandidate.expiryDate || ''}
                      onChange={(e) => setOcrCandidate({ ...ocrCandidate, expiryDate: e.target.value })}
                      className="w-full p-2.5 bg-[var(--bg)] border border-[var(--border)] rounded-xl font-bold text-xs text-[var(--text-main)] outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] block mb-1">
                      Data Rilascio
                    </label>
                    <input
                      type="date"
                      value={ocrCandidate.issueDate || ''}
                      onChange={(e) => setOcrCandidate({ ...ocrCandidate, issueDate: e.target.value })}
                      className="w-full p-2.5 bg-[var(--bg)] border border-[var(--border)] rounded-xl font-bold text-xs text-[var(--text-main)] outline-none"
                    />
                  </div>
                </div>

                {ocrCandidate.expiryDate && (
                  <div className="p-2.5 rounded-xl bg-[var(--surface-variant)] border border-[var(--border)] flex items-center justify-between">
                    <span className="text-[10px] text-[var(--text-muted)] font-black uppercase tracking-widest">Anteprima Countdown:</span>
                    <div className={`px-2.5 py-0.5 rounded-full border text-[9px] font-black ${getExpirationCountdown(ocrCandidate.expiryDate).badgeClass}`}>
                      {getExpirationCountdown(ocrCandidate.expiryDate).detail}
                    </div>
                  </div>
                )}

                {/* Opzione allega foto al documento */}
                {capturedImageDataUrl && (
                  <label className="flex items-center gap-2.5 pt-1 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={attachImageAsDocument}
                      onChange={(e) => setAttachImageAsDocument(e.target.checked)}
                      className="rounded accent-indigo-500 w-4 h-4 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-[var(--text-main)]">
                      Salva questa foto come copia digitale del documento
                    </span>
                  </label>
                )}
              </div>

              {/* Bottoni azione */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setOcrPreviewOpen(false)}
                  className="flex-1 py-3 bg-[var(--surface-variant)] hover:bg-[var(--border)] text-[var(--text-main)] rounded-2xl font-bold text-xs uppercase tracking-widest transition-colors"
                >
                  Annulla
                </button>
                <button
                  onClick={applyOcrCandidate}
                  className="flex-2 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Conferma e Compila</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal di scelta Scansione OCR (Fotocamera vs Galleria vs Testo) */}
      <AnimatePresence>
        {showOcrActionModal && (
          <div className="fixed inset-0 z-[220] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in" onClick={() => setShowOcrActionModal(false)}>
            <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-t-[2.5rem] sm:rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                    <Scan className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-[var(--text-main)] uppercase tracking-tight">Riconoscimento OCR</h3>
                    <p className="text-[10px] text-[var(--text-muted)]">Autocompilazione dati documento</p>
                  </div>
                </div>
                <button onClick={() => setShowOcrActionModal(false)} className="p-1 rounded-lg hover:bg-[var(--surface-variant)] text-[var(--text-muted)]">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2 pt-1">
                <button
                  onClick={() => {
                    setShowOcrActionModal(false);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                      fileInputRef.current.click();
                    }
                  }}
                  className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-indigo-500/10 to-purple-500/10 hover:from-indigo-500 hover:to-purple-500 hover:text-white border border-indigo-500/25 text-left flex items-center gap-3 transition-all group cursor-pointer text-[var(--text-main)]"
                >
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/20 group-hover:bg-white/20 text-indigo-500 group-hover:text-white flex items-center justify-center shrink-0">
                    <Camera className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-bold text-xs block">Scatta con Fotocamera</span>
                    <span className="text-[10px] text-[var(--text-muted)] group-hover:text-white/80 block">Inquadra fronte/retro del documento</span>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setShowOcrActionModal(false);
                    if (galleryInputRef.current) {
                      galleryInputRef.current.value = '';
                      galleryInputRef.current.click();
                    }
                  }}
                  className="w-full p-3.5 rounded-2xl bg-[var(--surface-variant)] hover:bg-indigo-500 hover:text-white border border-[var(--border)] text-left flex items-center gap-3 transition-all group cursor-pointer text-[var(--text-main)]"
                >
                  <div className="w-10 h-10 rounded-xl bg-[var(--border)] group-hover:bg-white/20 text-[var(--text-muted)] group-hover:text-white flex items-center justify-center shrink-0">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-bold text-xs block">Scegli dalla Galleria</span>
                    <span className="text-[10px] text-[var(--text-muted)] group-hover:text-white/80 block">Carica una foto già salvata</span>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setShowOcrActionModal(false);
                    setShowManualOcrFallback(true);
                  }}
                  className="w-full p-3.5 rounded-2xl bg-[var(--surface-variant)] hover:bg-[var(--border)] border border-[var(--border)] text-left flex items-center gap-3 transition-all group cursor-pointer text-[var(--text-main)]"
                >
                  <div className="w-10 h-10 rounded-xl bg-[var(--border)] text-[var(--text-muted)] flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-bold text-xs block">Incolla Testo Manuale</span>
                    <span className="text-[10px] text-[var(--text-muted)] block">Inserisci testo copiato da email o file</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* ================================================================ */}
      {/* FALLBACK MANUALE INCOLLA TESTO SE OCR OFFLINE                   */}
      {/* ================================================================ */}
      <AnimatePresence>
        {showManualOcrFallback && (
          <div className="fixed inset-0 z-[230] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-fade-in">
            <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                <h3 className="font-black text-sm text-[var(--text-main)] uppercase tracking-tight flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-500" /> Compilazione da Testo
                </h3>
                <button onClick={() => setShowManualOcrFallback(false)}>
                  <X className="w-5 h-5 text-[var(--text-muted)]" />
                </button>
              </div>

              <p className="text-xs text-[var(--text-muted)]">
                Incolla qui qualsiasi testo contenente Codice Fiscale, date o dati del documento per estrarli automaticamente:
              </p>

              <textarea
                value={manualOcrTextInput}
                onChange={(e) => setManualOcrTextInput(e.target.value)}
                placeholder="Incolla testo del documento o codice fiscale..."
                rows={4}
                className="w-full p-3 bg-[var(--bg)] border border-[var(--border)] rounded-2xl font-mono text-xs text-[var(--text-main)] outline-none focus:border-indigo-500"
              />

              <div className="flex gap-2">
                <button
                  onClick={() => setShowManualOcrFallback(false)}
                  className="flex-1 py-2.5 bg-[var(--surface-variant)] text-[var(--text-main)] rounded-xl font-bold text-xs"
                >
                  Annulla
                </button>
                <button
                  onClick={handleManualOcrParse}
                  className="flex-1 py-2.5 bg-indigo-500 text-white rounded-xl font-black text-xs uppercase tracking-wider"
                >
                  Analizza Testo
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* ================================================================ */}
      {/* VISUALIZZATORE DOCUMENTO / ALLEGATO MODAL                        */}
      {/* ================================================================ */}
      <AnimatePresence>
        {showViewer && data.pdfAttachment && (
          <div className="fixed inset-0 z-[240] bg-black flex flex-col animate-fade-in">
            <div className="p-4 flex items-center justify-between border-b border-white/10 shrink-0 bg-zinc-950">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-400" />
                <h4 className="text-white font-bold text-sm truncate">{data.title || 'Copia Digitale Documento'}</h4>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={data.pdfAttachment}
                  download={`${data.title || 'documento'}.jpg`}
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors"
                  title="Scarica"
                >
                  <Download className="w-5 h-5" />
                </a>
                <button 
                  onClick={() => setShowViewer(false)} 
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-zinc-900">
              {data.pdfAttachment.startsWith('data:image/') || data.pdfAttachment.startsWith('blob:') ? (
                <img 
                  src={data.pdfAttachment} 
                  alt={data.title} 
                  className="max-h-full max-w-full object-contain rounded-xl shadow-2xl" 
                />
              ) : (
                <iframe src={data.pdfAttachment} className="w-full h-full border-none rounded-xl" title="PDF Viewer" />
              )}
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Conferma eliminazione */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Elimina Documento"
        message="Sei sicuro di voler eliminare definitivamente questo documento dall'archivio?"
        onConfirm={() => { onDelete?.(data.id); onCancel(); }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </motion.div>
  );
};
