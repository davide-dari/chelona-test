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

export const MODEL_ID = 'onnx-community/Llama-3.2-1B-Instruct';

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
   Contesto: riassume i dati dell'utente per AI locali (ottimizzato)
   Usa tag XML chiari perché i modelli piccoli (1.5B) li processano meglio.
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
      return `[Nota]: "${t}"${(m as any).content ? ' - Contenuto: ' + String((m as any).content).slice(0, 150) : ''}`;
    case 'auto':
      return `[Auto]: ${(m as any).brand || ''} ${(m as any).model || ''}${(m as any).plate ? ' targa ' + (m as any).plate : ''}`;
    case 'supermarket': {
      const items = ((m as any).data?.items || []) as any[];
      return `[Lista Spesa]: ${items.length} articoli -> ${items.map(i => i.name).join(', ')}`;
    }
    case 'document':
      return `[Documento]: "${t}" (${(m as any).documentType || 'generico'})`;
    case 'installments':
      return `[Rate]: "${t}"`;
    case 'split':
      return `[Spese condivise]: "${t}"`;
    case 'wallet':
      return `[Portafoglio]: "${t}"`;
    default:
      return `[${m.type.toUpperCase()}]: "${t}"`;
  }
};

export function buildUserContext(modules: Module[], folders: Folder[], username: string): string {
  let ctx = `<DATI_UTENTE>\nNome: ${username || 'Profilo'}\n`;

  const fridge = readJson('chelona_fridge_ingredients');
  const freezer = readJson('chelona_freezer_ingredients');
  const pantry = readJson('chelona_pantry_ingredients');
  
  ctx += `<CIBO_DISPONIBILE>\n`;
  if (fridge.length) ctx += `- Frigo: ${fridge.join(', ')}\n`;
  else ctx += `- Frigo: (vuoto)\n`;
  if (freezer.length) ctx += `- Freezer: ${freezer.join(', ')}\n`;
  else ctx += `- Freezer: (vuoto)\n`;
  if (pantry.length) ctx += `- Dispensa: ${pantry.join(', ')}\n`;
  else ctx += `- Dispensa: (vuota)\n`;
  ctx += `</CIBO_DISPONIBILE>\n`;

  if (modules.length) {
    ctx += `<MODULI>\n`;
    for (const m of modules.slice(0, 60)) {
      ctx += `- ${moduleSummary(m)}\n`;
    }
    ctx += `</MODULI>\n`;
  }

  const memoryPrompt = chelonaMemory.buildMemoryPrompt();
  if (memoryPrompt) {
    ctx += `${memoryPrompt}\n`;
  }

  ctx += `</DATI_UTENTE>`;
  return ctx;
}

export const CHELONA_SYSTEM_PROMPT = `Sei Chelona, l'assistente AI locale su architettura ARM. Sei rapida, intelligente e concisa.
RISPONDI SEMPRE IN ITALIANO. Non usare frasi prolisse.
Usa i dati nei tag <DATI_UTENTE> (inclusi <CIBO_DISPONIBILE>, <MODULI> e <MEMORIA_CONTINUA>) per rispondere con precisione alle domande.
Se ti viene chiesto del cibo o del frigo, consulta <CIBO_DISPONIBILE>. Se ti chiedono delle tue memorie recenti o novità apprese, consulta <MEMORIA_CONTINUA>.
Se non trovi un'informazione, dillo con chiarezza e gentilezza senza inventarla.`;

