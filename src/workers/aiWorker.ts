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
// Flag localStorage: identifica quale modello è stato scaricato con successo
const LS_MODEL_READY_KEY = 'chelona_ai_model_ready_v2';

let generator: any = null;
let currentDevice: 'webgpu' | 'wasm' = 'wasm';
let isInitializing = false;

// ─── Storage: OPFS persistente (non svuotato da Android tra riavvii) ────────
env.allowRemoteModels = true;
env.useBrowserCache = false;   // Cache API non è persistente su Android WebView
env.useCustomCache = false;
env.useFSCache = true;         // OPFS: storage permanente su disco

// Throttle progress events per non intasare postMessage
let lastProgressTime = 0;

self.onmessage = async (event: MessageEvent) => {
  const { type, payload } = event.data || {};

  switch (type) {
    case 'check_cached': {
      try {
        const modelId = payload?.modelId || DEFAULT_MODEL_ID;

        // Check rapido via localStorage flag (scritto dopo download completato)
        let cached = false;
        try {
          cached = localStorage.getItem(LS_MODEL_READY_KEY) === modelId;
        } catch {}

        // Se il flag non c'è, verifica OPFS come fallback
        if (!cached && typeof navigator !== 'undefined' && navigator.storage) {
          try {
            const root = await navigator.storage.getDirectory();
            const modelDirName = `models--${modelId.replace('/', '--')}`;
            const hfDir = await root.getDirectoryHandle('huggingface', { create: false });
            const hubDir = await hfDir.getDirectoryHandle('hub', { create: false });
            const modelDir = await hubDir.getDirectoryHandle(modelDirName, { create: false });
            // Verifica che esistano file nella directory (modello presente)
            let fileCount = 0;
            for await (const _ of (modelDir as any).values()) {
              fileCount++;
              if (fileCount > 0) break;
            }
            cached = fileCount > 0;
            if (cached) {
              try { localStorage.setItem(LS_MODEL_READY_KEY, modelId); } catch {}
            }
          } catch {
            cached = false;
          }
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

        // Su Android WASM: q4 è il bilanciamento ottimale qualità/RAM (~460MB)
        // WebGPU su Android WebView non è stabile — usiamo WASM come default
        let device: 'webgpu' | 'wasm' = 'wasm';
        const dtype = 'q4';

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

        // Scrivi il flag: il modello è ora memorizzato in OPFS
        try { localStorage.setItem(LS_MODEL_READY_KEY, modelId); } catch {}

        isInitializing = false;
        self.postMessage({ type: 'ready', device: currentDevice, modelId });
      } catch (err: any) {
        isInitializing = false;
        generator = null;
        try { localStorage.removeItem(LS_MODEL_READY_KEY); } catch {}
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
      try { localStorage.removeItem(LS_MODEL_READY_KEY); } catch {}
      self.postMessage({ type: 'reset_done' });
      break;
    }

    default:
      console.warn('[AI Worker] Tipo messaggio sconosciuto', type);
  }
};
