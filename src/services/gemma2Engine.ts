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
import { semanticCache } from './semanticCache';
import { localDb } from './localDatabase';
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
  maxTokens: 160, // Hard cap a 160 token per risposte brevi, veloci e a latenza ridotta
  temperature: 0.25,
  top_p: 0.9,
  top_k: 40,
  repeat_penalty: 1.1,
  stop: ['<end_of_turn>', '<start_of_turn>user', '<start_of_turn>system', '\n\n'],
};

const BATTERY_WARN_THRESHOLD = 20;
const BATTERY_BLOCK_THRESHOLD = 10;
const INFERENCE_TIMEOUT_MS = 15_000;
const RAG_TOP_K = 1; // Solo 1 frammento più rilevante (max 150-200 token totali di contesto)

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
  semanticMatch?: boolean;
  similarityScore?: number;
}

// ---- Template Prompt Gemma 2 Ottimizzato ----

function buildGemmaPrompt(userQuery: string, ragContext: string, username: string): string {
  // Troncamento rigido a max 350 caratteri di contesto rilevante
  const trimmedContext = ragContext ? ragContext.slice(0, 350).trim() : '';
  const contextBlock = trimmedContext ? `\nDati personali:\n${trimmedContext}\n` : '';

  return `<start_of_turn>user
Sei Chelona AI per ${username}. Rispondi in italiano in massimo 2 frasi concise ed esatte.${contextBlock}
Domanda: ${userQuery}
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
  // Se il modello non è pronto/scaricato sul dispositivo, non tentare il caricamento nativo
  if (!gemma2ModelManager.isReady) {
    return false;
  }

  const modelPath = gemma2ModelManager.localPath;
  if (!modelPath) return false;

  if (engineState === 'ready' || engineState === 'generating') return true;

  if (engineState === 'loading') {
    // Attendi con timeout massimo di 2.5s per evitare deadlock
    return new Promise<boolean>(resolve => {
      let elapsed = 0;
      const check = setInterval(() => {
        elapsed += 150;
        if (engineState === 'ready') {
          clearInterval(check);
          resolve(true);
        } else if (engineState === 'error' || elapsed >= 2500) {
          clearInterval(check);
          if (engineState === 'loading') engineState = 'idle';
          resolve(false);
        }
      }, 150);
    });
  }

  const pluginAvailable = await ensurePluginLoaded();
  if (!pluginAvailable || !nativePlugin) return false;

  engineState = 'loading';
  try {
    const loadPromise = nativePlugin.loadModel({
      path: modelPath,
      params: DEFAULT_MODEL_PARAMS,
    });
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Timeout caricamento modello (4s)')), 4000)
    );

    await Promise.race([loadPromise, timeoutPromise]);
    engineState = 'ready';
    return true;
  } catch (err) {
    console.warn('[Gemma2] Errore caricamento modello locale, fallback a chelonaEngine:', err);
    engineState = 'idle';
    return false;
  }
}

// ---- Controllo Batteria ----

async function getBatteryLevel(): Promise<number> {
  try {
    const checkPromise = (async () => {
      if (nativePlugin) {
        try {
          const res = await nativePlugin.getBatteryLevel();
          if (res && typeof res.level === 'number') return res.level;
        } catch {}
      }
      try {
        const nav = typeof navigator !== 'undefined' ? (navigator as any) : null;
        if (nav?.getBattery) {
          const battery = await nav.getBattery();
          return Math.round(battery.level * 100);
        }
      } catch {}
      return 100;
    })();

    return await Promise.race([
      checkPromise,
      new Promise<number>(resolve => setTimeout(() => resolve(100), 600))
    ]);
  } catch {
    return 100;
  }
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
      reject(new Error('Timeout inferenza (15s)'));
    }, 15_000);

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
        fullText = result?.text || '';
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
 * Se la cache semantica intercetta la richiesta, restituisce immediatamente il dato a 0ms.
 * Se il modello non è pronto, va in timeout o fallisce, delega istantaneamente al chelonaEngine.
 */
export async function queryGemma2(
  userQuery: string,
  modules: Module[],
  username: string,
  onToken?: (token: string) => void
): Promise<Gemma2Response> {

  // ⚡ STEP 0: CONTROLLO ISTANTANEO CACHE SEMANTICA IN RAM (Latenza 0ms)
  // Ignora totalmente llama.rn, caricamenti, controlli batteria e RAG se c'è un hit!
  const semanticHit = semanticCache.findMatch(userQuery);
  if (semanticHit) {
    console.log(`[SemanticCache] ⚡ HIT ISTANTANEO IN RAM (${semanticHit.exactMatch ? '100% esatto' : `similarità ${Math.round(semanticHit.similarity * 100)}%`}): "${userQuery}" -> "${semanticHit.entry.query}"`);
    
    // Se c'è un listener di streaming, emetti i token progressivamente per effetto typing fluido
    if (onToken) {
      const chunks = semanticHit.entry.response.text.split(/(\s+)/);
      for (const chunk of chunks) {
        onToken(chunk);
      }
    }

    return {
      text: semanticHit.entry.response.text,
      actions: semanticHit.entry.response.actions as AiAction[] | undefined,
      learnedFact: semanticHit.entry.response.learnedFact,
      autoAction: semanticHit.entry.response.autoAction as AiAction | undefined,
      engineUsed: 'gemma2-local',
      cached: true,
      semanticMatch: true,
      similarityScore: semanticHit.similarity,
    };
  }

  const executeFallback = async (): Promise<Gemma2Response> => {
    const { queryChelonaAi } = await import('./chelonaEngine');
    const result = await queryChelonaAi(userQuery, modules, username);

    // Se richiesto streaming, emetti i frammenti progressivamente
    if (onToken && result && result.text) {
      const chunks = result.text.split(/(\s+)/);
      for (const chunk of chunks) {
        onToken(chunk);
      }
    }

    if (result && result.text) {
      semanticCache.set(userQuery, lastIndexedModulesHash, {
        text: result.text,
        actions: result.actions,
        learnedFact: result.learnedFact,
        autoAction: result.autoAction,
      });
    }

    return {
      ...result,
      engineUsed: 'chelona-engine',
    };
  };

  try {
    const responsePromise = (async (): Promise<Gemma2Response> => {
      // 1. Controlla batteria
      const battery = await getBatteryLevel();
      if (battery < BATTERY_BLOCK_THRESHOLD) {
        return await executeFallback();
      }

      // Limita i token se la batteria è scarica
      if (battery < BATTERY_WARN_THRESHOLD) {
        DEFAULT_GENERATE_PARAMS.maxTokens = 90;
      } else {
        DEFAULT_GENERATE_PARAMS.maxTokens = 160;
      }

      // 2. Verifica disponibilità modello
      const modelReady = await ensureModelLoaded();
      if (!modelReady) {
        return await executeFallback();
      }

      // 3. Aggiorna indice RAG se i moduli sono cambiati
      const modulesHash = computeModulesHash(modules);
      if (modulesHash !== lastIndexedModulesHash) {
        indexModulesIntoRAG(modules, username);
        lastIndexedModulesHash = modulesHash;
      }

      // 4. RAG Retrieval — Massimo 1 singolo frammento più rilevante (max 150 token di contesto)
      const ragDocs = ragEngine.retrieve(userQuery, 1);
      const ragContext = ragDocs.length > 0 ? ragDocs[0].text.slice(0, 350).trim() : '';

      // 5. Costruisci il prompt compatto con template Gemma 2
      const prompt = buildGemmaPrompt(userQuery, ragContext, username);

      // 6. Inferenza con Streaming attivo
      engineState = 'generating';
      let responseText = '';

      try {
        responseText = await runGemmaInference(prompt, onToken);
      } catch (err) {
        console.warn('[Gemma2] Errore inferenza, fallback a chelonaEngine:', err);
        return await executeFallback();
      } finally {
        if (engineState === 'generating') {
          engineState = 'ready';
        }
      }

      // Se la risposta è vuota o insufficiente, delega al motore rule-based di Chelona
      if (!responseText || responseText.trim().length < 5) {
        return await executeFallback();
      }

      // 7. Memorizzazione in Cache Semantica in RAM e persistenza locale
      if (responseText) {
        promptCache.set(userQuery, ragContext, { text: responseText });
        semanticCache.set(userQuery, modulesHash, { text: responseText });
      }

      return {
        text: responseText,
        engineUsed: 'gemma2-local',
        ragDocsUsed: ragDocs.length,
        cached: false,
        semanticMatch: false,
      };
    })();

    // Protezione globale: timeout massimo di 8 secondi prima di ripiegare su chelonaEngine
    const globalTimeout = new Promise<Gemma2Response>((resolve) => {
      setTimeout(async () => {
        console.warn('[Gemma2] Timeout globale di sicurezza (8s) scattato, fallback a chelonaEngine');
        resolve(await executeFallback());
      }, 8000);
    });

    const finalRes = await Promise.race([responsePromise, globalTimeout]);
    if (!finalRes || !finalRes.text || finalRes.text.trim().length === 0) {
      return await executeFallback();
    }
    return finalRes;
  } catch (err) {
    console.error('[Gemma2] Errore critico queryGemma2, fallback a chelonaEngine:', err);
    return await executeFallback();
  }
}

// ---- Utilità esportate ----

export function getGemma2State(): {
  engineState: EngineState;
  modelInfo: import('./gemma2ModelManager').ModelInfo;
  ragStats: ReturnType<typeof ragEngine['getStats']>;
  cacheStats: ReturnType<typeof promptCache['getStats']>;
  semanticCacheStats: ReturnType<typeof semanticCache['getStats']>;
} {
  return {
    engineState,
    modelInfo: gemma2ModelManager.info as any,
    ragStats: ragEngine.getStats(),
    cacheStats: promptCache.getStats(),
    semanticCacheStats: semanticCache.getStats(),
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

export { ragEngine, promptCache, semanticCache, localDb, gemma2ModelManager };
export type { AiMessage, AiAction, AiMemory };
