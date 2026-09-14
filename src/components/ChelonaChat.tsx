import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, Send, Loader2, Brain, Download, WifiOff, User, Bot } from 'lucide-react';
import { chelonaAI, buildUserContext, CHELONA_SYSTEM_PROMPT, type ChelonaMessage } from '../services/chelonaAI';
import type { Module, Folder } from '../types';

interface ChelonaChatProps {
  onClose: () => void;
  modules: Module[];
  folders: Folder[];
  username: string;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const SUGGESTIONS = [
  'Cosa c\'è nella mia lista della spesa?',
  'Cosa ho nel frigo e nel freezer?',
  'Riassumi i miei appunti e documenti',
  'Cosa posso fare con l\'app Chelona?',
];

type ModelStatus = 'idle' | 'downloading' | 'ready' | 'error';

export function ChelonaChat({ onClose, modules, folders, username, showToast }: ChelonaChatProps) {
  const [messages, setMessages] = useState<ChelonaMessage[]>([
    { role: 'assistant', content: 'Ciao! Sono Chelona, la tua assistente personale. Chiedimi qualsiasi cosa sui tuoi dati o sull\'app.' },
  ]);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<ModelStatus>(() => chelonaAI.isLoaded() ? 'ready' : 'idle');
  const [progress, setProgress] = useState(0);
  const [progressFile, setProgressFile] = useState('');
  const [progressLoaded, setProgressLoaded] = useState(0);
  const [progressTotal, setProgressTotal] = useState(0);
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const contextRef = useRef<string>('');
  const lastProgressRef = useRef<number>(0);

  useEffect(() => {
    contextRef.current = buildUserContext(modules, folders, username);
  }, [modules, folders, username]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, status, busy]);

  /* Se il modello è già in cache (scaricato in precedenza), caricalo subito
     senza mostrare la schermata di download. */
  useEffect(() => {
    if (chelonaAI.isLoaded()) return;
    let cancelled = false;
    (async () => {
      const cached = await chelonaAI.isCached();
      if (cancelled || !cached) return;
      setStatus('downloading');
      try {
        await chelonaAI.loadModel();
        if (!cancelled) setStatus('ready');
      } catch {
        if (!cancelled) setStatus('idle');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const downloadModel = useCallback(async () => {
    setStatus('downloading');
    setProgress(0);
    try {
      await chelonaAI.loadModel((p) => {
        if (p.status === 'progress' || p.status === 'download') {
          // Throttle: aggiorna lo stato al massimo ogni 250ms per non bloccare la UI.
          const now = Date.now();
          if (p.status === 'progress' && now - lastProgressRef.current < 250) return;
          lastProgressRef.current = now;
          setProgressFile(p.file || '');
          if (typeof p.progress === 'number') setProgress(Math.round(p.progress));
          if (typeof p.loaded === 'number') setProgressLoaded(p.loaded);
          if (typeof p.total === 'number') setProgressTotal(p.total);
        }
      });
      setStatus('ready');
      showToast('Chelona è pronta! Funziona completamente offline.', 'success');
    } catch (e) {
      console.error('Chelona model error', e);
      setStatus('error');
      showToast('Errore durante il download del modello. Verifica la connessione e riprova.', 'error');
    }
  }, [showToast]);

  const send = useCallback(async (text?: string) => {
    const question = (text ?? input).trim();
    if (!question || busy || status !== 'ready') return;
    setInput('');
    const userMsg: ChelonaMessage = { role: 'user', content: question };
    const next = [...messages, userMsg];
    setMessages(next);
    setBusy(true);
    try {
      const system: ChelonaMessage = {
        role: 'system',
        content: `${CHELONA_SYSTEM_PROMPT}\n\nContesto:\n${contextRef.current}`,
      };
      const reply = await chelonaAI.generate([system, ...next.slice(-8)]);
      setMessages(prev => [...prev, { role: 'assistant', content: reply || 'Non ho capito, puoi riformulare?' }]);
    } catch (e) {
      console.error('Chelona generate error', e);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Si è verificato un errore. Riprova.' }]);
    } finally {
      setBusy(false);
    }
  }, [input, messages, busy, status]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed inset-0 z-[300] flex flex-col h-[100dvh] w-full bg-[var(--bg)] overflow-hidden"
    >
      {/* Header */}
      <header className="flex items-center gap-3 pt-[max(env(safe-area-inset-top),16px)] px-4 pb-3 bg-[var(--card-bg)] border-b border-[var(--border)] shrink-0 z-30">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-teal-500/25 shrink-0">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-black text-[var(--text-main)] flex items-center gap-1.5">
            Chelona
            <span className="text-[9px] font-bold text-emerald-600 bg-emerald-500/10 rounded-full px-2 py-0.5 flex items-center gap-1">
              <WifiOff className="w-2.5 h-2.5" /> locale
            </span>
          </h1>
          <p className="text-[11px] text-[var(--text-muted)] font-medium truncate">Assistente AI on-device · risposte dai tuoi dati, senza internet</p>
        </div>
        <button onClick={onClose} className="p-2.5 -mr-2 hover:bg-[var(--surface-variant)] rounded-full text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors shrink-0">
          <X className="w-6 h-6" />
        </button>
      </header>

      {/* Body */}
      {status === 'idle' ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-xl shadow-teal-500/25 mb-6">
            <Brain className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-xl font-black text-[var(--text-main)] mb-2">Chelona, la tua AI locale</h2>
          <p className="text-sm text-[var(--text-muted)] max-w-xs leading-relaxed mb-2">
            Un modello AI che gira <b>direttamente sul tuo telefono</b>, usando la sua potenza di calcolo.
          </p>
          <p className="text-xs text-[var(--text-muted)] max-w-xs leading-relaxed mb-6">
            Nessun dato viene inviato a server esterni. Il modello (~540 MB) va scaricato una sola volta; dopo funziona anche senza connessione.
          </p>
          <button
            onClick={downloadModel}
            className="px-8 py-3.5 bg-gradient-to-r from-teal-500 to-emerald-600 text-white rounded-2xl font-bold hover:opacity-90 transition-all flex items-center gap-2 shadow-lg shadow-teal-500/25"
          >
            <Download className="w-5 h-5" />
            Scarica il modello
          </button>
        </div>
      ) : status === 'downloading' ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <Loader2 className="w-12 h-12 text-teal-500 animate-spin mb-5" />
          <h2 className="text-lg font-black text-[var(--text-main)] mb-1">Caricamento del modello…</h2>
          <p className="text-xs text-[var(--text-muted)] max-w-xs mb-6 truncate">{progressFile || 'Preparazione…'}</p>
          <div className="w-full max-w-xs h-2.5 bg-[var(--surface-variant)] rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-teal-500 to-emerald-600 rounded-full transition-all duration-300" style={{ width: `${Math.max(progress, 3)}%` }} />
          </div>
          <p className="text-[11px] text-[var(--text-muted)] mt-2 font-bold">
            {progressLoaded > 0 || progressTotal > 0
              ? `${(progressLoaded / 1048576).toFixed(1)} MB / ${(progressTotal / 1048576).toFixed(1)} MB`
              : `${progress}%`}
          </p>
          <p className="text-[10px] text-[var(--text-muted)] mt-4">Il primo download (~540 MB) richiede diversi minuti a seconda della connessione. Non chiudere l'app durante il download.</p>
        </div>
      ) : status === 'error' ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <WifiOff className="w-12 h-12 text-red-500 mb-4" />
          <h2 className="text-lg font-black text-[var(--text-main)] mb-2">Download non riuscito</h2>
          <p className="text-sm text-[var(--text-muted)] max-w-xs mb-6">Serve una connessione internet solo per il primo download del modello.</p>
          <button onClick={downloadModel} className="px-6 py-3 bg-[var(--accent)] text-white rounded-2xl font-bold hover:opacity-90 transition-all flex items-center gap-2">
            <Download className="w-5 h-5" /> Riprova
          </button>
        </div>
      ) : (
        <>
          <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex items-start gap-2 max-w-[85%] ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${m.role === 'user' ? 'bg-[var(--surface-variant)] text-[var(--text-main)]' : 'bg-gradient-to-br from-teal-500 to-emerald-600 text-white'}`}>
                    {m.role === 'user' ? <User className="w-4 h-4" /> : <Sparkles className="w-3.5 h-3.5" />}
                  </div>
                  <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-[var(--accent)] text-white rounded-tr-sm'
                      : 'bg-[var(--card-bg)] border border-[var(--border)] text-[var(--text-main)] rounded-tl-sm'
                  }`}>
                    <p className="whitespace-pre-wrap break-words">{m.content}</p>
                  </div>
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 px-3.5 py-2.5 bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl">
                  <Loader2 className="w-4 h-4 text-teal-500 animate-spin" />
                  <span className="text-xs text-[var(--text-muted)] font-medium">Chelona sta pensando…</span>
                </div>
              </div>
            )}
          </div>

          {/* Suggerimenti (solo quando la chat è vuota) */}
          {messages.length <= 1 && !busy && (
            <div className="px-4 pb-2 flex gap-2 overflow-x-auto hide-scrollbar">
              {SUGGESTIONS.map(s => (
                <button key={s} onClick={() => send(s)} className="shrink-0 text-[11px] font-semibold text-[var(--text-muted)] bg-[var(--card-bg)] border border-[var(--border)] rounded-full px-3 py-1.5 hover:bg-[var(--surface-variant)] hover:text-[var(--text-main)] transition-colors">
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="px-4 pb-[max(env(safe-area-inset-bottom),12px)] pt-2 shrink-0">
            <form
              onSubmit={e => { e.preventDefault(); send(); }}
              className="flex items-center gap-2 bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl px-3 py-2 focus-within:border-teal-500/50 transition-colors"
            >
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Chiedi a Chelona…"
                className="flex-1 min-w-0 bg-transparent outline-none text-sm text-[var(--text-main)] placeholder:text-[var(--text-muted)]"
              />
              <button type="submit" disabled={busy || !input.trim()} className="p-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 text-white disabled:opacity-40 hover:opacity-90 transition-all shrink-0">
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </>
      )}
    </motion.div>
  );
}
