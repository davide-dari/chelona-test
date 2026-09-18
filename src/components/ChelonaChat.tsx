import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, Send, Loader2, Brain, Download, WifiOff, User, Zap } from 'lucide-react';
import { chelonaAI, buildUserContext, CHELONA_SYSTEM_PROMPT, downloadState, type ChelonaMessage } from '../services/chelonaAI';
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

type ModelStatus = 'checking' | 'idle' | 'downloading' | 'loading_local' | 'ready' | 'error';

export function ChelonaChat({ onClose, modules, folders, username, showToast }: ChelonaChatProps) {
  const [messages, setMessages] = useState<ChelonaMessage[]>([
    { role: 'assistant', content: 'Ciao! Sono Chelona, la tua assistente personale. Chiedimi qualsiasi cosa sui tuoi dati o sull\'app.' },
  ]);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<ModelStatus>(() => chelonaAI.isLoaded() ? 'ready' : (downloadState.active ? 'downloading' : 'checking'));
  const [progress, setProgress] = useState(() => downloadState.progress);
  const [progressLoaded, setProgressLoaded] = useState(() => downloadState.loaded);
  const [progressTotal, setProgressTotal] = useState(() => downloadState.total);
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const contextRef = useRef<string>('');

  useEffect(() => {
    contextRef.current = buildUserContext(modules, folders, username);
  }, [modules, folders, username]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, status, busy]);

  /* Verifica se il modello è già presente nella cache locale oppure
     se c'è già un download in corso — in tal caso, agganciamoci. */
  useEffect(() => {
    if (chelonaAI.isLoaded()) {
      setStatus('ready');
      return;
    }

    // Se il download è già in corso (avviato da un'istanza precedente), agganciamoci
    if (downloadState.active) {
      setStatus('downloading');
      setProgress(downloadState.progress);
      setProgressLoaded(downloadState.loaded);
      setProgressTotal(downloadState.total);

      const unsub = downloadState.subscribe((e) => {
        if (e.type === 'progress') {
          setProgress(e.progress);
          setProgressLoaded(e.loaded);
          setProgressTotal(e.total);
        } else if (e.type === 'done') {
          setStatus('ready');
          showToast('Chelona è pronta! Il modello è memorizzato e funzionerà sempre offline.', 'success');
        } else if (e.type === 'error') {
          setStatus('error');
        }
      });
      return unsub;
    }

    let cancelled = false;
    (async () => {
      try {
        const cached = await chelonaAI.isCached();
        if (cancelled) return;
        if (cached) {
          setStatus('loading_local');
          await chelonaAI.loadModel(
            undefined,
            (phase) => {
              // Non mostrare nomi di file — lo stato globale gestisce
            },
          );
          if (!cancelled) setStatus('ready');
        } else {
          setStatus('idle');
        }
      } catch (err) {
        console.warn('[ChelonaChat] Errore verifica cache/auto-load', err);
        if (!cancelled) setStatus('idle');
      }
    })();
    return () => { cancelled = true; };
  }, [showToast]);

  const downloadModel = useCallback(async () => {
    setStatus('downloading');
    setProgress(0);
    setProgressLoaded(0);
    setProgressTotal(0);

    // Iscriviti allo stato globale per aggiornare la UI di questa sessione
    const unsub = downloadState.subscribe((e) => {
      if (e.type === 'progress') {
        setProgress(e.progress);
        setProgressLoaded(e.loaded);
        setProgressTotal(e.total);
      } else if (e.type === 'done') {
        setStatus('ready');
        showToast('Chelona è pronta! Il modello è memorizzato e funzionerà sempre offline.', 'success');
        unsub();
      } else if (e.type === 'error') {
        setStatus('error');
        showToast('Errore durante il download del modello. Verifica la connessione e riprova.', 'error');
        unsub();
      }
    });

    try {
      // avvia il download — il progresso è gestito tramite downloadState (nessun file name)
      await chelonaAI.loadModel();
    } catch (e) {
      console.error('Chelona model error', e);
      // L'errore è già notificato tramite subscriber
    }
  }, [showToast]);

  const send = useCallback(async (text?: string) => {
    const question = (text ?? input).trim();
    if (!question || busy || status !== 'ready') return;
    setInput('');

    const userMsg: ChelonaMessage = { role: 'user', content: question };
    const placeholderAssistantMsg: ChelonaMessage = { role: 'assistant', content: '' };
    const nextHistory = [...messages, userMsg];

    setMessages([...nextHistory, placeholderAssistantMsg]);
    setBusy(true);

    try {
      const system: ChelonaMessage = {
        role: 'system',
        content: `${CHELONA_SYSTEM_PROMPT}\n\n${contextRef.current}`,
      };

      // Limita la cronologia alle ultime 4 coppie per ridurre il context e prevenire OOM
      await chelonaAI.generateStream([system, ...nextHistory.slice(-8)], (token) => {
        setMessages(prev => {
          const updated = [...prev];
          const lastIdx = updated.length - 1;
          if (lastIdx >= 0 && updated[lastIdx].role === 'assistant') {
            updated[lastIdx] = {
              ...updated[lastIdx],
              content: updated[lastIdx].content + token,
            };
          }
          return updated;
        });
      });
    } catch (e) {
      console.error('Chelona generate error', e);
      setMessages(prev => {
        const updated = [...prev];
        const lastIdx = updated.length - 1;
        if (lastIdx >= 0 && updated[lastIdx].role === 'assistant') {
          updated[lastIdx] = {
            ...updated[lastIdx],
            content: updated[lastIdx].content || 'Si è verificato un errore durante la risposta. Riprova.',
          };
        }
        return updated;
      });
    } finally {
      setBusy(false);
    }
  }, [input, messages, busy, status]);

  const device = chelonaAI.getDevice();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed inset-0 z-[300] flex flex-col h-[100dvh] w-full bg-[var(--bg)] overflow-hidden font-sans"
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
              <WifiOff className="w-2.5 h-2.5" /> on-device
            </span>
            {status === 'ready' && (
              <span className={`text-[9px] font-bold rounded-full px-2 py-0.5 flex items-center gap-0.5 ${
                device === 'webgpu'
                  ? 'text-amber-600 bg-amber-500/10'
                  : 'text-teal-600 bg-teal-500/10'
              }`}>
                {device === 'webgpu' ? <Zap className="w-2.5 h-2.5" /> : null}
                {device === 'webgpu' ? 'GPU ARM' : 'CPU SIMD'}
              </span>
            )}
          </h1>
          <p className="text-[11px] text-[var(--text-muted)] font-medium truncate">
            Llama 3.2 (1B) · Ottimizzato ARM Mobile & Memoria Continua
          </p>
        </div>
        <button onClick={onClose} className="p-2.5 -mr-2 hover:bg-[var(--surface-variant)] rounded-full text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors shrink-0">
          <X className="w-6 h-6" />
        </button>
      </header>

      {/* Body */}
      {status === 'checking' ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <Loader2 className="w-10 h-10 text-teal-500 animate-spin mb-4" />
          <p className="text-sm font-semibold text-[var(--text-muted)]">Verifica disponibilità modello…</p>
        </div>
      ) : status === 'loading_local' ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <Loader2 className="w-12 h-12 text-teal-500 animate-spin mb-4" />
          <h2 className="text-lg font-black text-[var(--text-main)] mb-1">Caricamento da memoria locale…</h2>
          <p className="text-xs text-[var(--text-muted)] max-w-xs">Avvio del modello AI in corso</p>
          <span className="mt-4 text-[11px] font-medium text-emerald-600 bg-emerald-500/10 px-3 py-1 rounded-full">
            Pronto in 1-2 secondi · Nessun uso di dati
          </span>
        </div>
      ) : status === 'idle' ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-xl shadow-teal-500/25 mb-6">
            <Brain className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-xl font-black text-[var(--text-main)] mb-2">Chelona, la tua AI locale</h2>
          <p className="text-sm text-[var(--text-muted)] max-w-xs leading-relaxed mb-2">
            Modello <b>Qwen2.5 (0.5B Instruct)</b> ottimizzato per l'architettura ARM degli smartphone, con <b>memoria dinamica continua</b>.
          </p>
          <p className="text-xs text-[var(--text-muted)] max-w-xs leading-relaxed mb-6">
            Nessun dato viene inviato su internet. Il modello (~460 MB) va scaricato <b>una sola volta</b> e rimane memorizzato sul dispositivo per sempre.
          </p>
          <button
            onClick={downloadModel}
            className="px-8 py-3.5 bg-gradient-to-r from-teal-500 to-emerald-600 text-white rounded-2xl font-bold hover:opacity-90 transition-all flex items-center gap-2 shadow-lg shadow-teal-500/25 active:scale-95"
          >
            <Download className="w-5 h-5" />
            Scarica modello (~460 MB)
          </button>
        </div>
      ) : status === 'downloading' ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          {/* Icona animata */}
          <div className="relative mb-8">
            <div className="w-24 h-24 rounded-full bg-teal-500/10 flex items-center justify-center">
              <Brain className="w-12 h-12 text-teal-500" />
            </div>
            <div className="absolute inset-0 rounded-full border-4 border-teal-500/30 border-t-teal-500 animate-spin" />
          </div>
          <h2 className="text-xl font-black text-[var(--text-main)] mb-1">Download in corso…</h2>
          <p className="text-sm text-[var(--text-muted)] mb-8">
            Il download continua anche se esci dall'app
          </p>
          {/* Barra di avanzamento grande e pulita */}
          <div className="w-full max-w-xs">
            <div className="flex justify-between items-baseline mb-2">
              <span className="text-3xl font-black text-teal-500">{progress}%</span>
              <span className="text-xs text-[var(--text-muted)] font-medium">
                {progressTotal > 0
                  ? `${(progressLoaded / (1024 * 1024)).toFixed(0)} / ${(progressTotal / (1024 * 1024)).toFixed(0)} MB`
                  : '~460 MB totali'}
              </span>
            </div>
            <div className="w-full h-3 bg-[var(--surface-variant)] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${Math.max(progress, 2)}%` }}
              />
            </div>
          </div>
          <p className="text-[10px] text-[var(--text-muted)] mt-4 max-w-xs">
            Qwen2.5 0.5B · Prima installazione · Funziona al 100% offline
          </p>
          <button
            onClick={onClose}
            className="mt-6 px-6 py-2.5 bg-[var(--surface-variant)] hover:bg-[var(--border)] active:scale-95 text-[var(--text-main)] rounded-2xl font-bold text-xs transition-all flex items-center gap-2 border border-[var(--border)] shadow-sm"
          >
            Nascondi e continua in background
          </button>
        </div>
      ) : status === 'error' ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <WifiOff className="w-12 h-12 text-red-500 mb-4" />
          <h2 className="text-lg font-black text-[var(--text-main)] mb-2">Download non completato</h2>
          <p className="text-sm text-[var(--text-muted)] max-w-xs mb-6">
            Verifica la connessione internet e riprova. Serve solo per scaricare il modello la prima volta.
          </p>
          <button
            onClick={downloadModel}
            className="px-6 py-3 bg-[var(--accent)] text-white rounded-2xl font-bold hover:opacity-90 transition-all flex items-center gap-2"
          >
            <Download className="w-5 h-5" /> Riprova
          </button>
        </div>
      ) : (
        <>
          <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-3">
            {messages.map((m, i) => {
              const isUser = m.role === 'user';
              const isAssistantStreaming = !isUser && busy && i === messages.length - 1;

              // Se l'assistente ha contenuto vuoto ed è in attesa iniziale
              if (!isUser && !m.content && isAssistantStreaming) {
                return (
                  <div key={i} className="flex justify-start">
                    <div className="flex items-center gap-2 px-3.5 py-2.5 bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl shadow-sm">
                      <Loader2 className="w-4 h-4 text-teal-500 animate-spin" />
                      <span className="text-xs text-[var(--text-muted)] font-medium">Chelona sta elaborando…</span>
                    </div>
                  </div>
                );
              }

              if (!m.content) return null;

              return (
                <div key={i} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex items-start gap-2 max-w-[85%] ${isUser ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                      isUser
                        ? 'bg-[var(--surface-variant)] text-[var(--text-main)]'
                        : 'bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-sm'
                    }`}>
                      {isUser ? <User className="w-4 h-4" /> : <Sparkles className="w-3.5 h-3.5" />}
                    </div>
                    <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      isUser
                        ? 'bg-[var(--accent)] text-white rounded-tr-sm shadow-sm'
                        : 'bg-[var(--card-bg)] border border-[var(--border)] text-[var(--text-main)] rounded-tl-sm shadow-sm'
                    }`}>
                      <p className="whitespace-pre-wrap break-words">
                        {m.content}
                        {isAssistantStreaming && (
                          <span className="inline-block w-1.5 h-4 ml-1 align-middle bg-teal-500 animate-pulse rounded-xs" />
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Suggerimenti (solo all'inizio) */}
          {messages.length <= 1 && !busy && (
            <div className="px-4 pb-2 flex gap-2 overflow-x-auto hide-scrollbar">
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="shrink-0 text-[11px] font-semibold text-[var(--text-muted)] bg-[var(--card-bg)] border border-[var(--border)] rounded-full px-3 py-1.5 hover:bg-[var(--surface-variant)] hover:text-[var(--text-main)] transition-colors active:scale-95"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Barra Input */}
          <div className="px-4 pb-[max(env(safe-area-inset-bottom),12px)] pt-2 shrink-0">
            <form
              onSubmit={e => { e.preventDefault(); send(); }}
              className="flex items-center gap-2 bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl px-3 py-2 focus-within:border-teal-500/50 transition-colors shadow-sm"
            >
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder={busy ? "Chelona sta rispondendo…" : "Chiedi a Chelona…"}
                disabled={busy}
                className="flex-1 min-w-0 bg-transparent outline-none text-sm text-[var(--text-main)] placeholder:text-[var(--text-muted)] disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={busy || !input.trim()}
                className="p-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 text-white disabled:opacity-40 hover:opacity-90 transition-all shrink-0 active:scale-95"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </form>
          </div>
        </>
      )}
    </motion.div>
  );
}
