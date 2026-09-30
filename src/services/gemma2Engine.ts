/**
 * Gemma 2 Engine — Motore AI Locale On-Device con RAG
 * 
 * Architettura:
 * 1. Plugin Capacitor Nativo (@chelona/capacitor-llm) per Android con llama.cpp
 * 2. Fallback: chelonaEngine (rule-based, istantaneo) se il modello non è disponibile
 * 
 * Features:
 * - RAG locale (TF-IDF vector DB)
 * - Prompt/Response caching (LRU)
 * - KV cache dei token di sistema (prefix caching)
 * - Battery check (< 20% → limita, < 10% → fallback)
 * - WiFi check per download
 * - Streaming token-by-token
 */

import { ragEngine, indexModulesIntoRAG } from './ragEngine';
import { promptCache } from './promptCache';
import { gemma2ModelManager } from './gemma2ModelManager';
import type { Module } from '../types';
import type { AiMessage, AiAction, AiMemory } from './chelonaEngine';

// ---- Plugin Bridge ----
// Il plugin nativo @chelona/capacitor-llm viene caricato dinamicamente
// In ambiente web (PWA) usa il chelonaEngine come fallback.
let nativePlugin: ChelonaLlmPlugin | null = null;

interface ChelonaLlmPlugin {
  loadModel(options: { path: string; params: ModelParams }): Promise<void>;
  generate(options: GenerateOptions): Promise<{ text: string }>;
  generateStream(options: GenerateOptions & { onToken: (token: string) => void }): Promise<void>;
  unloadModel(): Promise<void>;
  getStatus(): Promise<{ loaded: boolean; contextUsed: number; contextMax: number }>;
  getBatteryLevel(): Promise<{ level: number; charging: boolean }>;
}

interface ModelParams {
  n_ctx: number;
  n_threads: number;
  n_batch: number;
  n_gpu_layers: number;
}

interface GenerateOptions {
  prompt: string;
  maxTokens: number;
  temperature: number;
  top_p: number;
  top_k: number;
  repeat_penalty: number;
  stop: string[];
}

// Parametri ottimizzati per dispositivi mobili con 8GB RAM
const DEFAULT_MODEL_PARAMS: ModelParams = {
  n_ctx: 4096,
  n_threads: 4,
  n_batch: 128,
  n_gpu_layers: 0, // CPU inference - più stabile su Android
};

const DEFAULT_GENERATE_PARAMS: Omit<GenerateOptions, 'prompt'> = {
  maxTokens: 512,
  temperature: 0.3,
  top_p: 0.9,
  top_k: 40,
  repeat_penalty: 1.1,
  stop: ['<end_of_turn>', '<start_of_turn>user', '<start_of_turn>system', '\n\n\n'],
};

const BATTERY_WARN_THRESHOLD = 20;
const BATTERY_BLOCK_THRESHOLD = 10;
const INFERENCE_TIMEOUT_MS = 30_000;
const RAG_TOP_K = 5;

// ---- Stato Engine ----

type EngineState = 'idle' | 'loading' | 'ready' | 'generating' | 'error';

let engineState: EngineState = 'idle';
let lastIndexedModulesHash = '';

export interface Gemma2Response {
  text: string;
  actions?: AiAction[];
  learnedFact?: string;
  createdModule?: Module;
  autoAction?: AiAction;
  engineUsed: 'gemma2-local' | 'chelona-engine';
  ragDocsUsed?: number;
  cached?: boolean;
}

// ---- Template Prompt Gemma 2 ----

function buildGemmaPrompt(userQuery: string, ragContext: string, username: string): string {
  const today = new Date().toLocaleDateString('it-IT', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  return `<start_of_turn>user
Sei Chelona AI, un assistente personale italiano completamente locale e privato.
Rispondi SOLO basandoti sul contesto personale fornito di seguito.
Se le informazioni non sono nel contesto, dillo chiaramente senza inventare.
Non inventare mai dati, date, numeri o informazioni non presenti nel contesto.
Rispondi in italiano, in modo naturale, conciso e utile. Evita ripetizioni.

CONTESTO PERSONALE DI ${username.toUpperCase()}:
${ragContext}

DATA ODIERNA: ${today}
<end_of_turn>
<start_of_turn>user
${userQuery}
<end_of_turn>
<start_of_turn>model
`;
}

// ---- Inizializzazione Plugin Nativo ----

async function loadNativePlugin(): Promise<ChelonaLlmPlugin | null> {
  try {
    const { registerPlugin } = await import('@capacitor/core');
    const plugin = registerPlugin<ChelonaLlmPlugin>('ChelonaLlm');
    if (plugin && typeof plugin.generate === 'function') {
      return plugin;
    }
  } catch {}
  return null;
}

async function ensurePluginLoaded(): Promise<boolean> {
  if (nativePlugin) return true;
  nativePlugin = await loadNativePlugin();
  return nativePlugin !== null;
}

// ---- Caricamento Modello ----

async function ensureModelLoaded(): Promise<boolean> {
  const pluginAvailable = await ensurePluginLoaded();
  if (!pluginAvailable || !nativePlugin) return false;

  const modelPath = gemma2ModelManager.localPath;
  if (!modelPath) return false;

  if (engineState === 'ready' || engineState === 'generating') return true;
  if (engineState === 'loading') {
    // Attendi che il caricamento termini
    return new Promise(resolve => {
      const check = setInterval(() => {
        if (engineState === 'ready') { clearInterval(check); resolve(true); }
        if (engineState === 'error') { clearInterval(check); resolve(false); }
      }, 200);
    });
  }

  engineState = 'loading';
  try {
    await nativePlugin.loadModel({
      path: modelPath,
      params: DEFAULT_MODEL_PARAMS,
    });
    engineState = 'ready';
    return true;
  } catch (err) {
    console.error('[Gemma2] Errore caricamento modello:', err);
    engineState = 'error';
    return false;
  }
}

// ---- Controllo Batteria ----

async function getBatteryLevel(): Promise<number> {
  if (nativePlugin) {
    try {
      const { level } = await nativePlugin.getBatteryLevel();
      return level;
    } catch {}
  }
  try {
    const nav = navigator as any;
    if (nav.getBattery) {
      const battery = await nav.getBattery();
      return Math.round(battery.level * 100);
    }
  } catch {}
  return 100;
}

// ---- Hash dei moduli per invalidazione RAG cache ----

function computeModulesHash(modules: Module[]): string {
  return modules.map(m => `${m.id}:${m.type}`).join(',');
}

// ---- Inferenza Gemma 2 ----

async function runGemmaInference(
  prompt: string,
  onToken?: (token: string) => void
): Promise<string> {
  if (!nativePlugin) throw new Error('Plugin nativo non disponibile');

  return new Promise<string>(async (resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Timeout inferenza (30s)'));
    }, INFERENCE_TIMEOUT_MS);

    try {
      let fullText = '';

      if (onToken) {
        // Streaming mode
        await nativePlugin!.generateStream({
          ...DEFAULT_GENERATE_PARAMS,
          prompt,
          onToken: (token: string) => {
            fullText += token;
            onToken(token);
          },
        });
      } else {
        const result = await nativePlugin!.generate({
          ...DEFAULT_GENERATE_PARAMS,
          prompt,
        });
        fullText = result.text;
      }

      clearTimeout(timeout);
      // Pulizia: rimuovi eventuali stop token dal testo
      const cleaned = fullText
        .replace(/<end_of_turn>/g, '')
        .replace(/<start_of_turn>user[\s\S]*/g, '')
        .trim();
      resolve(cleaned);
    } catch (err) {
      clearTimeout(timeout);
      reject(err);
    }
  });
}

// ---- Query Principale ----

/**
 * Interroga Gemma 2 con RAG locale.
 * Se il modello non è disponibile, delega al chelonaEngine.
 */
export async function queryGemma2(
  userQuery: string,
  modules: Module[],
  username: string,
  onToken?: (token: string) => void
): Promise<Gemma2Response> {

  // 1. Controlla batteria
  const battery = await getBatteryLevel();
  if (battery < BATTERY_BLOCK_THRESHOLD) {
    // Fallback al motore regole
    const { queryChelonaAi } = await import('./chelonaEngine');
    const result = await queryChelonaAi(userQuery, modules, username);
    return {
      ...result,
      engineUsed: 'chelona-engine',
    };
  }

  // Limita i token se la batteria è scarica
  if (battery < BATTERY_WARN_THRESHOLD) {
    DEFAULT_GENERATE_PARAMS.maxTokens = 128;
  } else {
    DEFAULT_GENERATE_PARAMS.maxTokens = 512;
  }

  // 2. Verifica disponibilità modello
  const modelReady = await ensureModelLoaded();
  if (!modelReady) {
    // Fallback al motore regole
    const { queryChelonaAi } = await import('./chelonaEngine');
    const result = await queryChelonaAi(userQuery, modules, username);
    return {
      ...result,
      engineUsed: 'chelona-engine',
    };
  }

  // 3. Aggiorna indice RAG se i moduli sono cambiati
  const modulesHash = computeModulesHash(modules);
  if (modulesHash !== lastIndexedModulesHash) {
    indexModulesIntoRAG(modules, username);
    lastIndexedModulesHash = modulesHash;
  }

  // 4. RAG Retrieval
  const ragDocs = ragEngine.retrieve(userQuery, RAG_TOP_K);
  const ragContext = ragEngine.formatContext(ragDocs);

  // 5. Controlla la cache (solo per query senza streaming)
  if (!onToken) {
    const cached = promptCache.get(userQuery, ragContext);
    if (cached) {
      return {
        text: cached.text,
        actions: cached.actions as AiAction[] | undefined,
        engineUsed: 'gemma2-local',
        ragDocsUsed: ragDocs.length,
        cached: true,
      };
    }
  }

  // 6. Costruisci il prompt con template Gemma 2
  const prompt = buildGemmaPrompt(userQuery, ragContext, username);

  // 7. Inferenza
  engineState = 'generating';
  let responseText = '';

  try {
    responseText = await runGemmaInference(prompt, onToken);
  } catch (err) {
    console.error('[Gemma2] Errore inferenza, fallback a chelonaEngine:', err);
    engineState = 'ready';

    const { queryChelonaAi } = await import('./chelonaEngine');
    const result = await queryChelonaAi(userQuery, modules, username);
    return {
      ...result,
      engineUsed: 'chelona-engine',
    };
  }

  engineState = 'ready';

  // Se la risposta è vuota o insufficiente, delega al motore rule-based di Chelona
  if (!responseText || responseText.length < 5) {
    const { queryChelonaAi } = await import('./chelonaEngine');
    const result = await queryChelonaAi(userQuery, modules, username);
    return {
      ...result,
      engineUsed: 'chelona-engine',
    };
  }

  // 8. Memorizzazione in cache
  if (!onToken && responseText) {
    promptCache.set(userQuery, ragContext, { text: responseText });
  }

  return {
    text: responseText,
    engineUsed: 'gemma2-local',
    ragDocsUsed: ragDocs.length,
    cached: false,
  };
}

// ---- Utilità esportate ----

export function getGemma2State(): {
  engineState: EngineState;
  modelInfo: import('./gemma2ModelManager').ModelInfo;
  ragStats: ReturnType<typeof ragEngine['getStats']>;
  cacheStats: ReturnType<typeof promptCache['getStats']>;
} {
  return {
    engineState,
    modelInfo: gemma2ModelManager.info as any,
    ragStats: ragEngine.getStats(),
    cacheStats: promptCache.getStats(),
  };
}

export async function unloadGemma2Model(): Promise<void> {
  if (nativePlugin && engineState !== 'idle') {
    try {
      await nativePlugin.unloadModel();
    } catch {}
  }
  engineState = 'idle';
}

export { ragEngine, promptCache, gemma2ModelManager };
export type { AiMessage, AiAction, AiMemory };
