/*
 * Chelona AI Web Worker
 * Esegue il modello linguistico on-device in un thread separato.
 * La UI rimane al 100% libera e reattiva (nessun freeze).
 *
 * Modello: onnx-community/Qwen2.5-0.5B-Instruct
 *   - ~460 MB (q4) — ideale per Android mobile (< 1 GB RAM in WASM)
 *   - Eccellente qualità in italiano, context window 131K token
 *
 * Storage: OPFS (Origin Private File System)
 *   - Persistente tra riavvii dell'app (non svuotato da Android)
 *   - Più affidabile della Cache API su Android WebView
 */
import { pipeline, env, TextStreamer } from '@huggingface/transformers';

const DEFAULT_MODEL_ID = 'onnx-community/Qwen2.5-0.5B-Instruct';

let generator: any = null;
let currentDevice: 'webgpu' | 'wasm' = 'wasm';
let isInitializing = false;

// ─── Storage: IndexedDB Custom Cache (Persistente e non svuotato da Android) ────────
env.allowRemoteModels = true;
env.useBrowserCache = false;
env.useFSCache = false;

const DB_NAME = 'chelona_ai_idb_cache';
const STORE_NAME = 'models';

function getDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

const idbCache = {
  async match(request: any): Promise<Response | undefined> {
    try {
      const url = typeof request === 'string' ? request : request.url;
      const db = await getDB();
      return await new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(url);
        req.onsuccess = () => {
          if (req.result) {
            const headers = new Headers(req.result.headers || {});
            resolve(new Response(req.result.buffer, { headers }));
          } else {
            resolve(undefined);
          }
        };
        req.onerror = () => resolve(undefined);
      });
    } catch (e) {
      console.warn('[AI Worker] IDB match error', e);
      return undefined;
    }
  },
  async put(request: any, response: Response): Promise<void> {
    try {
      const url = typeof request === 'string' ? request : request.url;
      const buffer = await response.clone().arrayBuffer();
      const headers: Record<string, string> = {};
      response.headers.forEach((v, k) => { headers[k] = v; });
      const db = await getDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put({ buffer, headers }, url);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.warn('[AI Worker] IDB put error', e);
    }
  }
};

env.useCustomCache = true;
env.customCache = idbCache;

// Throttle progress events per non intasare postMessage
let lastProgressTime = 0;

self.onmessage = async (event: MessageEvent) => {
  const { type, payload } = event.data || {};

  switch (type) {
    case 'check_cached': {
      try {
        const modelId = payload?.modelId || DEFAULT_MODEL_ID;

        let cached = false;
        try {
          const db = await getDB();
          cached = await new Promise<boolean>((resolve) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const req = store.getAllKeys();
            req.onsuccess = () => {
              const keys = req.result as string[];
              const hasConfig = keys.some(k => k.includes(modelId) && k.includes('config.json'));
              const hasWeights = keys.some(k => k.includes(modelId) && (k.includes('.onnx') || k.includes('model_')));
              resolve(hasConfig && hasWeights);
            };
            req.onerror = () => resolve(false);
          });
        } catch {
          cached = false;
        }

        self.postMessage({ type: 'check_cached_result', cached, modelId });
      } catch (e: any) {
        self.postMessage({ type: 'check_cached_result', cached: false, error: e?.message });
      }
      break;
    }

    case 'load': {
      if (generator) {
        self.postMessage({ type: 'ready', device: currentDevice });
        return;
      }
      if (isInitializing) return;
      isInitializing = true;

      const modelId = payload?.modelId || DEFAULT_MODEL_ID;
      try {
        self.postMessage({ type: 'phase', phase: 'device_detection' });

        // Su Android WASM: q4f16 pesa solo 460MB (contro i 750MB di q4), risparmia molta RAM e previene crash
        // WebGPU su Android WebView non è stabile — usiamo WASM come default
        let device: 'webgpu' | 'wasm' = 'wasm';
        const dtype = 'q4f16';

        // Prova WebGPU solo se disponibile (dispositivi flagship)
        if (typeof navigator !== 'undefined' && 'gpu' in navigator && (navigator as any).gpu) {
          try {
            const adapter = await (navigator as any).gpu.requestAdapter();
            if (adapter) {
              device = 'webgpu';
            }
          } catch (gpuErr) {
            console.warn('[AI Worker] WebGPU non disponibile, fallback su WASM', gpuErr);
          }
        }

        currentDevice = device;

        if (device === 'wasm') {
          // Ottimizza WASM CPU per SIMD e multi-core ARM
          if (env.backends?.onnx?.wasm) {
            const threads = Math.min(navigator.hardwareConcurrency || 4, 4);
            env.backends.onnx.wasm.numThreads = threads;
            env.backends.onnx.wasm.proxy = false;
          }
        }

        self.postMessage({ type: 'phase', phase: 'loading_model', device, dtype });

        generator = await pipeline('text-generation', modelId, {
          dtype,
          device,
          progress_callback: (p: any) => {
            if (!p || !p.status) return;
            const now = Date.now();
            if (p.status === 'progress' && now - lastProgressTime < 150) return;
            lastProgressTime = now;

            self.postMessage({
              type: 'progress',
              status: String(p.status),
              file: p.file || '',
              progress: typeof p.progress === 'number' ? Math.round(p.progress) : undefined,
              loaded: p.loaded,
              total: p.total,
            });
          },
        });

        isInitializing = false;
        self.postMessage({ type: 'ready', device: currentDevice, modelId });
      } catch (err: any) {
        isInitializing = false;
        generator = null;
        console.error('[AI Worker] Errore caricamento modello', err);
        self.postMessage({ type: 'error', error: err?.message || 'Impossibile caricare il modello' });
      }
      break;
    }

    case 'generate': {
      if (!generator) {
        self.postMessage({ type: 'error', error: 'Modello non pronto' });
        return;
      }

      const { messages, maxTokens = 200 } = payload || {};
      let fullText = '';

      try {
        const streamer = new TextStreamer(generator.tokenizer, {
          skip_prompt: true,
          skip_special_tokens: true,
          callback_function: (chunk: string) => {
            fullText += chunk;
            self.postMessage({ type: 'token', token: chunk });
          },
        });

        const output = await generator(messages, {
          max_new_tokens: maxTokens,
          do_sample: true,
          temperature: 0.7,
          top_p: 0.9,
          repetition_penalty: 1.1,
          streamer,
        });

        const finalContent = output?.[0]?.generated_text?.at?.(-1)?.content || fullText;
        self.postMessage({ type: 'complete', reply: finalContent });
      } catch (genErr: any) {
        console.error('[AI Worker] Errore generazione', genErr);
        self.postMessage({ type: 'error', error: genErr?.message || 'Errore durante la risposta' });
      }
      break;
    }

    case 'reset': {
      // Resetta il modello per forzare un re-download
      if (generator) {
        try { await generator.dispose(); } catch {}
        generator = null;
      }
      isInitializing = false;
      self.postMessage({ type: 'reset_done' });
      break;
    }

    default:
      console.warn('[AI Worker] Tipo messaggio sconosciuto', type);
  }
};
