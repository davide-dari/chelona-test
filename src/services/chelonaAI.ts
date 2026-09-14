/*
 * Chelona — assistente AI locale (on-device).
 *
 * Usa transformers.js (WebAssembly) per eseguire un piccolo modello
 * linguistico interamente sul dispositivo: nessuna API esterna, nessun
 * invio di dati. Il modello viene scaricato una sola volta alla prima
 * esecuzione e poi resta in cache locale (funziona anche offline).
 *
 * Modello: onnx-community/Qwen3-0.6B-ONNX (quantizzato q4f16, ~350 MB).
 */
import type { Module, Folder } from '../types';
import { storage } from './storage';

const MODEL_ID = 'onnx-community/Qwen3-0.6B-ONNX';

export interface ChelonaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChelonaProgress {
  status: string;      // 'initiate' | 'download' | 'progress' | 'done'
  file: string;
  progress: number;    // 0..100
}

let generator: any = null;
let loadPromise: Promise<void> | null = null;

export const chelonaAI = {
  isLoaded: () => generator !== null,

  /* Carica il modello (una sola volta). onProgress riceve lo stato di download. */
  async loadModel(onProgress?: (p: ChelonaProgress) => void): Promise<void> {
    if (generator) return;
    if (!loadPromise) {
      loadPromise = (async () => {
        const { pipeline, env } = await import('@huggingface/transformers');
        env.allowRemoteModels = true;
        env.useBrowserCache = true;
        env.useFSCache = true;
        generator = await pipeline('text-generation', MODEL_ID, {
          dtype: 'q4f16',
          device: 'wasm',
          progress_callback: (p: any) => {
            if (p && p.status) {
              onProgress?.({ status: String(p.status), file: p.file || '', progress: p.progress ?? 0 });
            }
          },
        });
      })();
    }
    await loadPromise;
  },

  /* Genera una risposta a partire dalla cronologia dei messaggi. */
  async generate(messages: ChelonaMessage[]): Promise<string> {
    if (!generator) throw new Error('Modello non caricato');
    const out = await generator(messages, {
      max_new_tokens: 256,
      do_sample: true,
      temperature: 0.6,
      top_p: 0.9,
    });
    const reply = out?.[0]?.generated_text?.at?.(-1)?.content;
    if (typeof reply === 'string') return reply;
    return '';
  },
};

/* ═══════════════════════════════════════════════════════════════════
   Contesto: riassume i dati dell'utente da passare al modello.
   Tutto viene elaborato localmente, senza inviare nulla.
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

export const CHELONA_SYSTEM_PROMPT = `Sei Chelona, l'assistente AI integrata nell'app Chelona. Sei gentile, concisa e utile.
Rispondi SEMPRE in italiano, in modo breve e diretto (2-4 frasi al massimo).
Hai accesso ai dati dell'utente riportati qui sotto come "Contesto". Usali per rispondere a domande sulla lista della spesa, la dispensa, i documenti, le note, le auto, le spese, ecc.
Se la domanda riguarda dati che non sono nel contesto, dillo chiaramente.
Non inventare dati che non sono nel contesto.`;
