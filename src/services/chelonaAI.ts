/*
 * Chelona — assistente AI locale (on-device).
 *
 * Esegue il modello linguistico in un Web Worker dedicato, sfruttando:
 *   - WebGPU per accelerazione hardware su GPU mobile (Adreno / Mali)
 *   - WASM SIMD multi-thread (CPU) come fallback
 *   - Web Cache API nativa per memorizzare i pesi del modello in modo permanente
 *   - Streaming in tempo reale dei token (nessun freeze dell'interfaccia)
 *
 * Modello: onnx-community/Qwen2.5-0.5B-Instruct (~350-480 MB, eccellente in italiano).
 */
import type { Module, Folder } from '../types';
import { storage } from './storage';
import { chelonaMemory } from './chelonaMemory';
import { notificationService } from './notificationService';

export const MODEL_ID = 'onnx-community/Qwen2.5-0.5B-Instruct';
const LS_MODEL_READY_KEY = 'chelona_ai_model_ready_v2';

export interface ChelonaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChelonaProgress {
  status: string;
  file: string;
  progress?: number;
  loaded?: number;
  total?: number;
}

let workerInstance: Worker | null = null;
let isModelReady = false;
let activeDevice: 'webgpu' | 'wasm' = 'wasm';
let loadPromise: Promise<void> | null = null;

/* ─── Global Download State ─────────────────────────────────────────── */
type DownloadEvent =
  | { type: 'phase'; phase: string }
  | { type: 'progress'; progress: number; loaded: number; total: number }
  | { type: 'done' }
  | { type: 'error' };

type DownloadListener = (e: DownloadEvent) => void;

export const downloadState = {
  active: false,
  progress: 0,
  loaded: 0,
  total: 0,
  phase: '',
  listeners: new Set<DownloadListener>(),
  subscribe(fn: DownloadListener): () => void {
    this.listeners.add(fn);
    return () => { this.listeners.delete(fn); };
  },
};

function getWorker(): Worker {
  if (!workerInstance) {
    workerInstance = new Worker(new URL('../workers/aiWorker.ts', import.meta.url), {
      type: 'module',
    });
  }
  return workerInstance;
}

const fileProgressMap = new Map<string, { loaded: number; total: number }>();
let lastReportedPercent = 0;

export const chelonaAI = {
  isLoaded: () => isModelReady,
  getDevice: () => activeDevice,

  /* Verifica se il modello è memorizzato in OPFS (persistente su Android). */
  async isCached(): Promise<boolean> {
    // Check rapido: localStorage flag scritto dopo download completato
    try {
      if (localStorage.getItem(LS_MODEL_READY_KEY) === MODEL_ID) return true;
    } catch {}

    // Fallback: interroga il worker per verifica via OPFS
    return new Promise<boolean>((resolve) => {
      const worker = getWorker();
      const handler = (e: MessageEvent) => {
        if (e.data?.type === 'check_cached_result') {
          worker.removeEventListener('message', handler);
          resolve(e.data.cached === true);
        }
      };
      worker.addEventListener('message', handler);
      worker.postMessage({ type: 'check_cached', payload: { modelId: MODEL_ID } });
      // Timeout di sicurezza: se il worker non risponde in 3s, assume non cached
      setTimeout(() => {
        worker.removeEventListener('message', handler);
        resolve(false);
      }, 3000);
    });
  },

  /* Carica o inizializza il modello tramite il Web Worker. */
  loadModel(
    onProgress?: (p: ChelonaProgress) => void,
    onPhase?: (phase: string) => void,
  ): Promise<void> {
    if (isModelReady) return Promise.resolve();
    if (loadPromise) {
      // Se il download è già in corso, aggancia listener extra senza riavviare
      if (onProgress || onPhase) {
        const extraHandler = (event: MessageEvent) => {
          const { type, phase, status, file, progress, loaded, total } = event.data || {};
          if (type === 'phase') onPhase?.(phase);
          else if (type === 'progress') onProgress?.({ status, file, progress, loaded, total });
          else if (type === 'ready' || type === 'error') {
            getWorker().removeEventListener('message', extraHandler);
          }
        };
        getWorker().addEventListener('message', extraHandler);
      }
      return loadPromise;
    }

    // Inizia il download — aggiorna lo stato globale
    downloadState.active = true;
    downloadState.progress = 0;
    downloadState.loaded = 0;
    downloadState.total = 0;
    lastReportedPercent = 0;
    fileProgressMap.clear();

    // Attiva wake lock nativo Android se disponibile
    if ((window as any).ChelonaNative?.setDownloadActive) {
      try {
        (window as any).ChelonaNative.setDownloadActive(true);
      } catch (err) {
        console.warn('[ChelonaAI] Errore attivazione ChelonaNative download lock:', err);
      }
    }

    // Inizializza notifica di download su Android
    notificationService.updateDownloadProgress(0, 0, 0);

    loadPromise = new Promise<void>((resolve, reject) => {
      const worker = getWorker();

      const messageHandler = (event: MessageEvent) => {
        const { type, phase, device, status, file, loaded, total, error } = event.data || {};

        if (type === 'phase') {
          onPhase?.(phase);
          downloadState.phase = phase;
          downloadState.listeners.forEach(l => l({ type: 'phase', phase }));
        } else if (type === 'progress') {
          // Traccia byte caricati per questo file
          if (file) {
            fileProgressMap.set(file, {
              loaded: Number(loaded) || 0,
              total: Number(total) || 0,
            });
          }

          let sumLoaded = 0;
          let sumTotal = 0;
          let hasBigFile = false;

          for (const item of fileProgressMap.values()) {
            sumLoaded += item.loaded;
            sumTotal += item.total;
            if (item.total > 50 * 1024 * 1024) {
              hasBigFile = true;
            }
          }

          // Il modello pesa ~750MB-1GB. Finché non compare il file onnx principale, usiamo 750MB come riferimento
          // in modo che i file piccoli di configurazione non facciano saltare la percentuale al 100%.
          const effectiveTotal = hasBigFile ? sumTotal : Math.max(sumTotal, 750 * 1024 * 1024);
          let calculatedPercent = Math.round((sumLoaded / effectiveTotal) * 100);

          // Monotonicità garantita: la percentuale non retrocede mai
          calculatedPercent = Math.min(99, Math.max(lastReportedPercent, calculatedPercent));
          lastReportedPercent = calculatedPercent;

          // Aggiorna lo stato globale — NESSUN NOME DI FILE esposto
          downloadState.progress = calculatedPercent;
          downloadState.loaded = sumLoaded;
          downloadState.total = effectiveTotal;
          downloadState.active = true;

          downloadState.listeners.forEach(l => l({
            type: 'progress',
            progress: calculatedPercent,
            loaded: sumLoaded,
            total: effectiveTotal,
          }));

          onProgress?.({
            status: status || 'progress',
            file: '', // NON esporre il nome del file
            progress: calculatedPercent,
            loaded: sumLoaded,
            total: effectiveTotal,
          });

          // Notifica continua in background per Android
          notificationService.updateDownloadProgress(calculatedPercent, sumLoaded, effectiveTotal);
        } else if (type === 'ready') {
          worker.removeEventListener('message', messageHandler);
          isModelReady = true;
          activeDevice = device || 'wasm';
          loadPromise = null;
          downloadState.active = false;
          downloadState.progress = 100;
          downloadState.listeners.forEach(l => l({ type: 'done' }));

          try { localStorage.setItem(LS_MODEL_READY_KEY, MODEL_ID); } catch {}

          // Rilascia wake lock nativo Android
          if ((window as any).ChelonaNative?.setDownloadActive) {
            try {
              (window as any).ChelonaNative.setDownloadActive(false);
            } catch {}
          }

          // Notifica download completato
          notificationService.completeDownloadNotification();

          console.log(`[ChelonaAI] Modello pronto su device: ${activeDevice}`);
          resolve();
        } else if (type === 'error') {
          worker.removeEventListener('message', messageHandler);
          loadPromise = null;
          downloadState.active = false;
          downloadState.progress = 0;
          downloadState.listeners.forEach(l => l({ type: 'error' }));
          
          try { localStorage.removeItem(LS_MODEL_READY_KEY); } catch {}

          // Rilascia wake lock nativo Android
          if ((window as any).ChelonaNative?.setDownloadActive) {
            try {
              (window as any).ChelonaNative.setDownloadActive(false);
            } catch {}
          }

          // Cancella notifica progress
          notificationService.cancelDownloadNotification();

          reject(new Error(error || 'Errore durante il caricamento del modello'));
        }
      };

      worker.addEventListener('message', messageHandler);
      worker.postMessage({ type: 'load', payload: { modelId: MODEL_ID } });
    });

    return loadPromise;
  },

  /* Genera testo con streaming dei token in tempo reale (evita il freeze della UI). */
  generateStream(
    messages: ChelonaMessage[],
    onToken?: (token: string) => void,
  ): Promise<string> {
    if (!isModelReady) {
      return Promise.reject(new Error('Modello non pronto'));
    }

    return new Promise<string>((resolve, reject) => {
      const worker = getWorker();
      let fullReply = '';

      const messageHandler = (event: MessageEvent) => {
        const { type, token, reply, error } = event.data || {};

        if (type === 'token' && typeof token === 'string') {
          fullReply += token;
          onToken?.(token);
        } else if (type === 'complete') {
          worker.removeEventListener('message', messageHandler);
          resolve(reply || fullReply);
        } else if (type === 'error') {
          worker.removeEventListener('message', messageHandler);
          reject(new Error(error || 'Errore durante la generazione'));
        }
      };

      worker.addEventListener('message', messageHandler);
      worker.postMessage({
        type: 'generate',
        payload: {
          messages,
          maxTokens: 200,
        },
      });
    });
  },

  /* Fallback sincrono-promise: genera e restituisce il testo finale. */
  async generate(messages: ChelonaMessage[]): Promise<string> {
    return chelonaAI.generateStream(messages);
  },
};

/* ═══════════════════════════════════════════════════════════════════
   Contesto: riassume i dati dell'utente per AI locali (ottimizzato)
   Usa tag XML semplici — Qwen2.5 li processa meglio dei modelli più piccoli.
   IMPORTANTE: mantieni il contesto < 800 caratteri per evitare OOM su Android.
   ═══════════════════════════════════════════════════════════════════ */
const MAX_CONTEXT_CHARS = 800;

const readJson = (key: string): any[] => {
  try {
    const raw = localStorage.getItem(key);
    const v = raw ? JSON.parse(raw) : [];
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
};

const moduleSummary = (m: Module): string => {
  const t = (m as any).title || m.type;
  switch (m.type) {
    case 'generic':
      // Tronca contenuto a 80 chars per risparmiare spazio
      return `[Nota]: "${t}"${(m as any).content ? ': ' + String((m as any).content).slice(0, 80) : ''}`;
    case 'auto':
      return `[Auto]: ${(m as any).brand || ''} ${(m as any).model || ''}${(m as any).plate ? ' targa ' + (m as any).plate : ''}`;
    case 'supermarket': {
      const items = ((m as any).data?.items || []) as any[];
      // Mostra solo i primi 8 articoli
      const preview = items.slice(0, 8).map((i: any) => i.name).join(', ');
      return `[Spesa]: ${preview}${items.length > 8 ? '…' : ''}`;
    }
    case 'document':
      return `[Doc]: "${t}"`;
    case 'installments':
      return `[Rate]: "${t}"`;
    case 'split':
      return `[Spese]: "${t}"`;
    case 'auto':
      return `[Auto]: "${t}"`;
    default:
      return `[${m.type}]: "${t}"`;
  }
};

export function buildUserContext(modules: Module[], folders: Folder[], username: string): string {
  let ctx = `<DATI>\nUtente: ${username || 'Utente'}\n`;

  // Cibo disponibile (compatto)
  const fridge = readJson('chelona_fridge_ingredients').slice(0, 10);
  const pantry = readJson('chelona_pantry_ingredients').slice(0, 10);
  if (fridge.length || pantry.length) {
    ctx += `<CIBO>`;
    if (fridge.length) ctx += `Frigo: ${fridge.join(', ')}. `;
    if (pantry.length) ctx += `Dispensa: ${pantry.join(', ')}.`;
    ctx += `</CIBO>\n`;
  }

  // Moduli (max 20, riassunti brevi)
  if (modules.length) {
    ctx += `<MODULI>\n`;
    for (const m of modules.slice(0, 20)) {
      ctx += `- ${moduleSummary(m)}\n`;
    }
    ctx += `</MODULI>\n`;
  }

  // Memoria continua
  const memoryPrompt = chelonaMemory.buildMemoryPrompt();
  if (memoryPrompt) ctx += `${memoryPrompt}\n`;

  ctx += `</DATI>`;

  // Hard cap: tronca se supera il limite per evitare OOM
  if (ctx.length > MAX_CONTEXT_CHARS) {
    ctx = ctx.slice(0, MAX_CONTEXT_CHARS) + '\n…(troncato)</DATI>';
  }

  return ctx;
}

export const CHELONA_SYSTEM_PROMPT = `Sei Chelona, l'assistente AI di questa app. Rispondi in italiano, in modo conciso e utile.
Usa i dati in <DATI> per rispondere con precisione. Se l'informazione non c'è, dillo chiaramente.`;
