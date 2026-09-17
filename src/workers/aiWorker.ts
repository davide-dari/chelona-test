/*
 * Chelona AI Web Worker
 * Esegue il modello linguistico on-device in un thread separato.
 * La UI rimane al 100% libera e reattiva (nessun freeze).
 */
import { pipeline, env, TextStreamer } from '@huggingface/transformers';

const DEFAULT_MODEL_ID = 'onnx-community/Llama-3.2-1B-Instruct';

let generator: any = null;
let currentDevice: 'webgpu' | 'wasm' = 'wasm';
let isInitializing = false;

// Configura la cache del browser nativa (Web Cache API)
env.allowRemoteModels = true;
env.useBrowserCache = true;
env.useCustomCache = false;
env.useFSCache = false;

// Throttle progress events per non intasare postMessage
let lastProgressTime = 0;

self.onmessage = async (event: MessageEvent) => {
  const { type, payload } = event.data || {};

  switch (type) {
    case 'check_cached': {
      try {
        const modelId = payload?.modelId || DEFAULT_MODEL_ID;
        let cached = false;
        if (typeof caches !== 'undefined') {
          const cache = await caches.open('transformers-cache');
          const requests = await cache.keys();
          const urls = requests.map(r => r.url);
          const hasConfig = urls.some(u => u.includes(modelId) && u.includes('config.json'));
          const hasWeights = urls.some(u => u.includes(modelId) && (u.includes('.onnx') || u.includes('model_')));
          cached = hasConfig && hasWeights;
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

        // Rileva supporto WebGPU (GPU smartphone)
        let device: 'webgpu' | 'wasm' = 'wasm';
        let dtype: 'q4f16' | 'q4' = 'q4';

        if (typeof navigator !== 'undefined' && 'gpu' in navigator && (navigator as any).gpu) {
          try {
            const adapter = await (navigator as any).gpu.requestAdapter();
            if (adapter) {
              device = 'webgpu';
              dtype = 'q4f16';
            }
          } catch (gpuErr) {
            console.warn('[AI Worker] WebGPU non disponibile, fallback su WASM', gpuErr);
          }
        }

        currentDevice = device;

        if (device === 'wasm') {
          // Ottimizza WASM CPU per SIMD e multi-core
          if (env.backends?.onnx?.wasm) {
            const threads = Math.min(navigator.hardwareConcurrency || 4, 4);
            env.backends.onnx.wasm.numThreads = threads;
            env.backends.onnx.wasm.proxy = false; // Nel worker dedicato non serve proxy
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

      const { messages, maxTokens = 300 } = payload || {};
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
          temperature: 0.6,
          top_p: 0.9,
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

    default:
      console.warn('[AI Worker] Tipo messaggio sconosciuto', type);
  }
};
