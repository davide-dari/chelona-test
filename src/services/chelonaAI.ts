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

export const MODEL_ID = 'onnx-community/Qwen2.5-0.5B-Instruct';

export interface ChelonaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChelonaProgress {
  status: string;      // 'initiate' | 'download' | 'progress' | 'done'
  file: string;
  progress?: number;   // 0..100
  loaded?: number;     // bytes caricati
  total?: number;      // bytes totali
}

let workerInstance: Worker | null = null;
let isModelReady = false;
let activeDevice: 'webgpu' | 'wasm' = 'wasm';
let loadPromise: Promise<void> | null = null;

function getWorker(): Worker {
  if (!workerInstance) {
    workerInstance = new Worker(new URL('../workers/aiWorker.ts', import.meta.url), {
      type: 'module',
    });
  }
  return workerInstance;
}

export const chelonaAI = {
  isLoaded: () => isModelReady,
  getDevice: () => activeDevice,

  /* Verifica se il modello è già stato scaricato e memorizzato nella cache persistente. */
  async isCached(): Promise<boolean> {
    if (typeof caches === 'undefined') return false;
    try {
      const cache = await caches.open('transformers-cache');
      const requests = await cache.keys();
      const urls = requests.map(r => r.url);
      const hasConfig = urls.some(u => u.includes(MODEL_ID) && u.includes('config.json'));
      const hasWeights = urls.some(u => u.includes(MODEL_ID) && (u.includes('.onnx') || u.includes('model_')));
      return hasConfig && hasWeights;
    } catch {
      return false;
    }
  },

  /* Carica o inizializza il modello tramite il Web Worker. */
  loadModel(
    onProgress?: (p: ChelonaProgress) => void,
    onPhase?: (phase: string) => void,
  ): Promise<void> {
    if (isModelReady) return Promise.resolve();
    if (loadPromise) return loadPromise;

    loadPromise = new Promise<void>((resolve, reject) => {
      const worker = getWorker();

      const messageHandler = (event: MessageEvent) => {
        const { type, phase, device, status, file, progress, loaded, total, error } = event.data || {};

        if (type === 'phase') {
          onPhase?.(phase);
        } else if (type === 'progress') {
          onProgress?.({ status, file, progress, loaded, total });
        } else if (type === 'ready') {
          worker.removeEventListener('message', messageHandler);
          isModelReady = true;
          activeDevice = device || 'wasm';
          loadPromise = null;
          console.log(`[ChelonaAI] Modello pronto su device: ${activeDevice}`);
          resolve();
        } else if (type === 'error') {
          worker.removeEventListener('message', messageHandler);
          loadPromise = null;
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
          maxTokens: 300,
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
   Contesto: riassume i dati dell'utente da passare al modello.
   Tutto viene elaborato localmente sul dispositivo.
   ═══════════════════════════════════════════════════════════════════ */
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
      return `Nota "${t}"${(m as any).content ? ': ' + String((m as any).content).slice(0, 200) : ''}`;
    case 'auto':
      return `Auto ${(m as any).brand || ''} ${(m as any).model || ''}${(m as any).plate ? ' targa ' + (m as any).plate : ''}`;
    case 'supermarket': {
      const items = ((m as any).data?.items || []) as any[];
      return `Lista della spesa (${items.length} articoli): ${items.map(i => i.name).join(', ')}`;
    }
    case 'document':
      return `Documento "${t}" (${(m as any).documentType || 'generico'})`;
    case 'installments':
      return `Rate "${t}"`;
    case 'split':
      return `Spese condivise "${t}"`;
    case 'wallet':
      return `Portafoglio "${t}"`;
    case 'travel':
      return `Viaggi "${t}"`;
    case 'study':
      return `Studio "${t}"`;
    case 'fitness':
      return `Fitness "${t}"`;
    default:
      return `${m.type}: "${t}"`;
  }
};

export function buildUserContext(modules: Module[], folders: Folder[], username: string): string {
  const lines: string[] = [];
  lines.push(`Utente: ${username || 'profilo'}`);

  if (folders.length) {
    lines.push(`Cartelle (${folders.length}): ${folders.map(f => f.name).join(', ')}`);
  }
  if (modules.length) {
    lines.push(`Moduli (${modules.length}):`);
    for (const m of modules.slice(0, 120)) {
      lines.push(`- ${moduleSummary(m)}`);
    }
  }

  const fridge = readJson('chelona_fridge_ingredients');
  const freezer = readJson('chelona_freezer_ingredients');
  const pantry = readJson('chelona_pantry_ingredients');
  if (fridge.length) lines.push(`Frigo: ${fridge.join(', ')}`);
  if (freezer.length) lines.push(`Freezer: ${freezer.join(', ')}`);
  if (pantry.length) lines.push(`Dispensa: ${pantry.join(', ')}`);

  const addressBook = storage.loadAddressBook();
  if (addressBook.length) {
    lines.push(`Rubrica (${addressBook.length} contatti): ${addressBook.map((a: any) => a.name || a.label || a.nome || 'contatto').join(', ')}`);
  }

  const profiles = storage.loadProfiles();
  if (profiles.length) {
    lines.push(`Profili (${profiles.length}): ${profiles.map(p => p.username).join(', ')}`);
  }

  return lines.join('\n');
}

export const CHELONA_SYSTEM_PROMPT = `Sei Chelona, l'assistente AI personale integrata nell'app Chelona. Sei gentile, concisa, precisa e utile.
Rispondi SEMPRE in italiano, in modo chiaro e diretto (2-4 frasi al massimo, salvo richiesta esplicita).
Hai accesso ai dati dell'utente riportati sotto in "Contesto" (spesa, frigo, freezer, dispensa, note, documenti, rate, auto). Usali con precisione per rispondere.
Se un'informazione richiesta non è presente nel contesto, dillo con chiarezza e gentilezza senza inventarla.`;
