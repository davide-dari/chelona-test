import React, { useState, useMemo, useEffect } from 'react';
import { ArrowLeft, Lock, FileDown, Share2, Clock, QrCode, Shield, RefreshCw, Eye, Check, Copy, ShieldCheck, SunDim } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Module } from '../types';
import JSZip from 'jszip';
import { encryption } from '../services/encryption';
import { motion, AnimatePresence } from 'motion/react';

interface ShareScreenProps {
  module: Module;
  onClose: () => void;
}

// Generazione array per il selettore "a ruota"
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);
const SECONDS = Array.from({ length: 60 }, (_, i) => i);

export const ShareScreen = ({ module, onClose }: ShareScreenProps) => {
  // Stati per il timer in stile "Sveglia/Timer" telefono
  const [timerH, setTimerH] = useState(0);
  const [timerM, setTimerM] = useState(12); // Default 12 min come in immagine
  const [timerS, setTimerS] = useState(0);
  const [isAutodestruct, setIsAutodestruct] = useState(false);
  const [isAntiGlare, setIsAntiGlare] = useState(false);

  const [zipPassword, setZipPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportDone, setExportDone] = useState(false);
  const [qrKey, setQrKey] = useState(0); 
  const [passwordCopied, setPasswordCopied] = useState(false);
  
  // Stati per il timer di autodistruzione avanzato
  const [startTime, setStartTime] = useState(Date.now());
  const [timeLeft, setTimeLeft] = useState(0);
  const [progress, setProgress] = useState(1); // da 1 a 0

  // Generazione chiave sicura AES-256
  const generateSecureKey = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789+-#%&';
    const array = new Uint8Array(20);
    crypto.getRandomValues(array);
    let pass = '';
    for (let i = 0; i < array.length; i++) {
        pass += chars[array[i] % chars.length];
    }
    setZipPassword(pass);
  };

  // Genera la prima chiave al mount
  useEffect(() => {
    generateSecureKey();
  }, []);

  const typeLabel = module.type === 'document' ? 'Documento'
    : module.type === 'auto' ? 'Auto' : module.type === 'split' ? 'Spese' : 'Modulo';

  const handleCopyPassword = () => {
    navigator.clipboard.writeText(zipPassword);
    setPasswordCopied(true);
    setTimeout(() => setPasswordCopied(false), 2000);
  };

  // Calcola la durata totale in ms dai selettori
  const totalDurationMs = useMemo(() => (
    (timerH * 3600 + timerM * 60 + timerS) * 1000
  ), [timerH, timerM, timerS]);

  const qrData = useMemo(() => {
    // Rimuoviamo allegati pesanti e campi vuoti per ridurre la densità del QR e facilitare la scansione da lontano
    const cleanData = Object.fromEntries(
      Object.entries(module).filter(([key, value]) => {
        if (key === 'pdfAttachment' || key === 'photo') return false;
        if (value === null || value === undefined || value === '') return false;
        // Rimuoviamo anche campi di posizionamento griglia non necessari per la condivisione
        if (['x', 'y', 'w', 'h'].includes(key)) return false;
        return true;
      })
    );
    
    /**
     * SHORTHAND MAPPING for QR density optimization:
     * t = type
     * d = data
     * a = isAutodestruct
     * e = qrExpiresAt
     */
    const expiryMs = Date.now() + totalDurationMs;
    
    const payload: any = {
      t: `shared_${module.type}`,
      d: cleanData
    };

    if (isAutodestruct) {
      payload.a = true;
      payload.e = expiryMs;
    }

    return JSON.stringify(payload);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [module, totalDurationMs, qrKey, isAutodestruct]);

  // Gestione timer e progresso
  useEffect(() => {
    if (!isAutodestruct) {
        setTimeLeft(0);
        setProgress(1);
        return;
    }
    const end = Date.now() + totalDurationMs;
    setStartTime(Date.now());
    setTimeLeft(totalDurationMs);
    setProgress(1);

    const timer = setInterval(() => {
        const now = Date.now();
        const remaining = Math.max(0, end - now);
        setTimeLeft(remaining);
        
        if (totalDurationMs > 0) {
            setProgress(remaining / totalDurationMs);
        } else {
            setProgress(0);
        }

        if (remaining <= 0) clearInterval(timer);
    }, 1000);

    return () => clearInterval(timer);
  }, [totalDurationMs, qrKey, isAutodestruct]);

  // Refs per lo scrolling iniziale dei selettori
  const hoursRef = React.useRef<HTMLDivElement>(null);
  const minutesRef = React.useRef<HTMLDivElement>(null);
  const secondsRef = React.useRef<HTMLDivElement>(null);

  // Scroll iniziale in posizione corretta
  useEffect(() => {
    const scrollTo = (ref: React.RefObject<HTMLDivElement>, val: number) => {
        if (ref.current) ref.current.scrollTop = val * 40;
    };
    // Piccolo timeout per assicurarsi che il DOM sia pronto
    const timer = setTimeout(() => {
        scrollTo(hoursRef, timerH);
        scrollTo(minutesRef, timerM);
        scrollTo(secondsRef, timerS);
    }, 100);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleExport = async () => {
    if (!zipPassword) {
      alert('Chiave non generata.');
      return;
    }
    setIsExporting(true);
    try {
      const salt = encryption.generateSalt();
      const key = await encryption.deriveKey(zipPassword, salt);
      const encryptedPayload = await encryption.encrypt(module, key);
      const zipData = JSON.stringify({ salt, encryptedPayload, version: 1 });

      const zip = new JSZip();
      zip.file('data.json', zipData);
      const blob = await zip.generateAsync({ type: 'blob' });
      const filename = `${(module.title || 'appunto').replace(/[^a-z0-9]/gi, '_').toLowerCase()}.zip`;

      let shared = false;
      if (navigator.share && navigator.canShare) {
        const file = new File([blob], filename, { type: 'application/zip' });
        if (navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({ title: `Appunto: ${module.title || 'Senza titolo'}`, files: [file] });
            shared = true;
          } catch (e: any) {
            if (e.name === 'AbortError') shared = true;
          }
        }
      }
      if (!shared) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename;
        document.body.appendChild(a); a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }

      setExportDone(true);
      // Non resettiamo zipPassword per permettere la copia post-export
    } catch (e) {
      console.error(e);
      alert("Errore durante l'esportazione.");
    }
    setIsExporting(false);
  };

  const isExpired = timeLeft <= 0 && isAutodestruct;

  // Formatta il tempo rimasto in formato HH:MM:SS, stile timer da telefono
  const formatTime = (ms: number) => {
    if (ms <= 0) return '00:00:00';
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      transition={{ type: 'spring', damping: 28, stiffness: 300 }}
      className="fixed inset-0 z-[150] bg-[var(--bg)] flex flex-col overflow-hidden"
    >
      {/* ── Header ── */}
      <header className="flex items-center gap-3 px-4 py-4 border-b border-[var(--border)] bg-[var(--header-bg)] backdrop-blur-2xl shrink-0">
        <button
          onClick={onClose}
          className="p-2.5 hover:bg-[var(--card-bg)] border border-[var(--border)] rounded-xl text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold text-[var(--text-main)] leading-tight">Condividi {typeLabel}</h1>
          <p className="text-[11px] text-[var(--text-muted)] truncate">{module.title || 'Senza titolo'}</p>
        </div>
        <div className="p-2 bg-[var(--info-bg)] border border-[var(--info)]/30 rounded-xl">
          <Share2 className="w-5 h-5 text-[var(--info)]" />
        </div>
      </header>

      {/* ── Body scrollabile ── */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-lg mx-auto px-4 py-6 space-y-6">

          <div className="relative bg-[var(--card-bg)] border border-[var(--border)] rounded-3xl p-5 flex flex-col items-center shadow-xl overflow-hidden">
            
            {/* Background Animated Particles (simulati con radial gradient) */}
            <div className="absolute inset-0 opacity-10 pointer-events-none">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,var(--info)_0%,transparent_70%)]" />
            </div>

            <div className="flex items-center justify-between w-full mb-6 z-10">
              <div className="flex items-center gap-2">
                <QrCode className="w-4 h-4 text-[var(--info)]" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--info)]">Condivisione</span>
              </div>
            </div>

            {/* QR Wrapper */}
            <div className="relative group/qr">


                {/* QR Container con Dissolve Varianti */}
                <motion.div 
                    animate={isExpired ? { 
                        filter: ["contrast(1) blur(0px)", "contrast(3) blur(2px)", "contrast(0) blur(10px)"],
                        scale: [1, 1.05, 0.95],
                        opacity: [1, 0.8, 0],
                    } : { 
                        filter: "blur(0px)",
                        scale: 1,
                        opacity: 1
                    }}
                    transition={isExpired ? { duration: 0.8, ease: "easeInOut" } : {}}
                    className={`p-5 rounded-3xl shadow-2xl relative z-10 border transition-all duration-500 ${isAntiGlare ? 'bg-gray-300 border-gray-400' : 'bg-[var(--card-bg)] border-[var(--border)]'}`}
                >
                    <QRCodeSVG 
                        value={qrData} 
                        size={320} 
                        level="L" 
                        includeMargin={true}
                        bgColor={isAntiGlare ? "#d1d5db" : "#FFFFFF"}
                        fgColor="#000000"
                        className="rounded-2xl transition-all duration-500 max-w-full h-auto"
                    />
                </motion.div>

                {/* Pulsante Anti-Abbaglio */}
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onClick={() => setIsAntiGlare(!isAntiGlare)}
                  className={`mt-6 px-5 py-2.5 rounded-2xl flex items-center gap-2.5 text-[10px] font-black uppercase tracking-widest transition-all shadow-lg ${
                    isAntiGlare 
                    ? 'bg-amber-500 text-white shadow-amber-500/20' 
                    : 'bg-[var(--bg)] text-[var(--text-muted)] border border-[var(--border)]'
                  }`}
                >
                  <SunDim className={`w-4 h-4 ${isAntiGlare ? 'animate-pulse' : ''}`} />
                  {isAntiGlare ? 'Anti-Abbagliamento Attivo' : 'Riduci Abbaglio'}
                </motion.button>

                {/* Overlay di Distruzione */}
                <AnimatePresence>
                    {isExpired && (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.8, backdropFilter: "blur(0px)" }}
                            animate={{ opacity: 1, scale: 1, backdropFilter: "blur(8px)" }}
                            className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/40 rounded-3xl border border-red-500/30"
                        >
                            <motion.div
                                initial={{ y: 10 }}
                                animate={{ y: 0 }}
                                className="p-3 bg-red-500/20 rounded-full mb-3"
                            >
                                <Lock className="w-8 h-8 text-red-500" />
                            </motion.div>
                            <span className="text-xs font-black text-white uppercase tracking-tighter mb-1">Dati Distrutti</span>
                            <span className="text-[9px] text-white/60 font-bold uppercase tracking-widest">Session Expired</span>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Configurazione Scadenza (Integrata) */}
            <div className="w-full space-y-4 z-10">
                
                {/* Autodestruction Toggle */}
                <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-3 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg transition-colors ${isAutodestruct ? 'bg-amber-500/10 text-amber-500' : 'bg-[var(--text-muted)]/10 text-[var(--text-muted)]'}`}>
                            <Lock className="w-4 h-4" />
                        </div>
                        <div>
                            <span className="text-[11px] font-black uppercase tracking-wider text-[var(--text-main)] block">Autodistruzione</span>
                            <p className="text-[9px] text-[var(--text-muted)] font-bold">Distruggi dopo l'importazione</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => setIsAutodestruct(!isAutodestruct)}
                        className={`relative w-12 h-6 rounded-full transition-colors ${isAutodestruct ? 'bg-amber-500' : 'bg-[var(--bg)] border border-[var(--border)]'}`}
                    >
                        <motion.div 
                            animate={{ x: isAutodestruct ? 24 : 4 }}
                            className={`absolute top-1 w-4 h-4 rounded-full shadow-sm ${isAutodestruct ? 'bg-white' : 'bg-[var(--text-muted)]'}`}
                        />
                    </button>
                </div>

                {/* Wheel Picker UI (iOS-style) */}
                <div className={`transition-all duration-500 ${!isAutodestruct ? 'opacity-20 grayscale pointer-events-none' : 'opacity-100'}`}>
                    <div className="bg-black/90 border border-white/10 rounded-[32px] p-4 shadow-2xl relative overflow-hidden ring-1 ring-white/5 backdrop-blur-3xl">
                        <style>{`
                            .no-scrollbar::-webkit-scrollbar { display: none; }
                            .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                        `}</style>
                        
                        {/* Header Labels */}
                        <div className="grid grid-cols-3 mb-6">
                            <span className="text-[11px] font-black uppercase tracking-widest text-white/30 text-center">Hours</span>
                            <span className="text-[11px] font-black uppercase tracking-widest text-white/30 text-center">Minutes</span>
                            <span className="text-[11px] font-black uppercase tracking-widest text-white/30 text-center">Seconds</span>
                        </div>

                        <div className="relative h-32 flex justify-between gap-1 overflow-hidden px-2">
                            {/* Selected Indicator overlay */}
                            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-10 bg-white/5 border-y border-white/10 pointer-events-none rounded-xl mx-4" />
                            
                            {/* Fade Masks */}
                            <div className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-black to-transparent pointer-events-none z-10" />
                            <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black to-transparent pointer-events-none z-10" />

                            {/* Hours Column */}
                            <div 
                                ref={hoursRef}
                                className="flex-1 h-full overflow-y-scroll scroll-smooth no-scrollbar snap-y snap-mandatory"
                                onScroll={(e) => {
                                    const el = e.currentTarget;
                                    const index = Math.round(el.scrollTop / 40);
                                    if (HOURS[index] !== undefined && HOURS[index] !== timerH) setTimerH(HOURS[index]);
                                }}
                            >
                                <div className="py-12">
                                    {HOURS.map(h => (
                                        <div key={h} className="h-10 flex items-center justify-center snap-center">
                                            <span className={`text-2xl font-mono font-black transition-all ${timerH === h ? 'text-white scale-110' : 'text-white/10 scale-90'}`}>
                                                {String(h).padStart(2, '0')}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Minutes Column */}
                            <div 
                                ref={minutesRef}
                                className="flex-1 h-full overflow-y-scroll scroll-smooth no-scrollbar snap-y snap-mandatory"
                                onScroll={(e) => {
                                    const el = e.currentTarget;
                                    const index = Math.round(el.scrollTop / 40);
                                    if (MINUTES[index] !== undefined && MINUTES[index] !== timerM) setTimerM(MINUTES[index]);
                                }}
                            >
                                <div className="py-16">
                                    {MINUTES.map(m => (
                                        <div key={m} className="h-16 flex items-center justify-center snap-center">
                                            <span className={`text-4xl font-mono font-black transition-all ${timerM === m ? 'text-white scale-110 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]' : 'text-white/20 scale-90'}`}>
                                                {String(m).padStart(2, '0')}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Seconds Column */}
                            <div 
                                ref={secondsRef}
                                className="flex-1 h-full overflow-y-scroll scroll-smooth no-scrollbar snap-y snap-mandatory"
                                onScroll={(e) => {
                                    const el = e.currentTarget;
                                    const index = Math.round(el.scrollTop / 40);
                                    if (SECONDS[index] !== undefined && SECONDS[index] !== timerS) setTimerS(SECONDS[index]);
                                }}
                            >
                                <div className="py-16">
                                    {SECONDS.map(s => (
                                        <div key={s} className="h-16 flex items-center justify-center snap-center">
                                            <span className={`text-4xl font-mono font-black transition-all ${timerS === s ? 'text-white scale-110 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]' : 'text-white/20 scale-90'}`}>
                                                {String(s).padStart(2, '0')}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col items-center gap-1 p-3 bg-white/5 rounded-2xl border border-white/5 shadow-inner">
                    <p className="text-[9px] text-white/40 font-bold uppercase tracking-widest flex items-center gap-1.5">
                        <Clock className={`w-2.5 h-2.5 ${isAutodestruct ? 'text-amber-500' : 'text-gray-500'}`} /> {isAutodestruct ? 'Tempo Rimanente' : 'Stato Sessione'}
                    </p>
                    <span className={`text-xl font-mono font-black transition-colors ${isAutodestruct ? 'text-white' : 'text-white/20'}`}>
                        {isAutodestruct ? formatTime(timeLeft) : 'PERMANENTE'}
                    </span>
                </div>
            </div>
          </div>



          {/* ── Esporta ZIP ── */}
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-3xl p-5 shadow-sm relative overflow-hidden">
            
            <div className="flex items-center gap-2 mb-1">
              <FileDown className="w-4 h-4 text-emerald-500" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-500 font-mono">Download</span>
            </div>
            <p className="text-[11px] text-[var(--text-muted)] mb-5 leading-relaxed">
              Dati cifrati in locale. La chiave viene generata solo su questo dispositivo.
            </p>
            
            {/* Password Generata */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-1.5">
                  <Lock className="w-3 h-3" /> Chiave Generata
                </label>
                <button 
                    onClick={generateSecureKey}
                    className="flex items-center gap-1.5 text-[11px] font-black text-amber-500 hover:text-amber-600 transition-colors bg-amber-500/5 px-2.5 py-1 rounded-lg border border-amber-500/10"
                >
                    <RefreshCw className="w-3.5 h-3.5" /> Rigenera
                </button>
              </div>

              <div className="relative group/pass">
                <input
                  type={showPassword ? 'text' : 'password'}
                  readOnly
                  value={zipPassword}
                  className="w-full p-4 pr-24 bg-[var(--bg)] border border-[var(--border)] rounded-2xl outline-none text-base font-mono font-bold text-[var(--text-main)] shadow-inner"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <button
                        type="button"
                        onClick={() => setShowPassword(v => !v)}
                        className="p-2 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
                        title="Mostra chiave"
                    >
                        <Eye className="w-4 h-4" />
                    </button>
                    <button
                        onClick={handleCopyPassword}
                        className={`p-2 rounded-xl transition-all ${passwordCopied ? 'bg-emerald-500 text-white shadow-md' : 'text-emerald-500 hover:bg-emerald-500/10'}`}
                        title="Copia chiave"
                    >
                        {passwordCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                </div>
              </div>
            </div>

            <button
              onClick={handleExport}
              disabled={isExporting}
              className={`w-full flex items-center justify-center gap-2 py-4 mt-6 rounded-2xl font-bold text-sm transition-all ${
                exportDone
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 scale-[0.98]'
                  : 'bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] text-white shadow-lg shadow-emerald-500/20'
              }`}
            >
              {isExporting ? (
                  <div className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Protocollo AES...
                  </div>
              ) : exportDone ? (
                  <div className="flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5" /> ZIP Condiviso
                  </div>
              ) : (
                  <div className="flex items-center gap-2">
                       <FileDown className="w-5 h-5" /> Esporta ZIP Protetto
                  </div>
              )}
            </button>

            {exportDone && (
                <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl"
                >
                    <p className="text-[11px] text-amber-500 font-bold mb-2 flex items-center gap-2">
                        <ArrowLeft className="w-3.5 h-3.5 rotate-90" /> Non dimenticare!
                    </p>
                    <p className="text-[10px] text-amber-500/80 leading-relaxed font-medium">
                        Copia la chiave qui sopra e consegnala al destinatario. Senza di essa, lo ZIP rimarrà inaccessibile.
                    </p>
                    <button 
                        onClick={handleCopyPassword}
                        className="w-full mt-3 flex items-center justify-center gap-2 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[11px] font-bold transition-all shadow-sm"
                    >
                        <Copy className="w-3.5 h-3.5" />
                        Copia Chiave per il Destinatario
                    </button>
                </motion.div>
            )}
          </div>

          {/* Padding bottom */}
          <div className="h-6" />
        </div>
      </div>
    </motion.div>
  );
};
