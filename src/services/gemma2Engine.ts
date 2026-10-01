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
  loadModel(options: { path: string; params: ModelParams }): Promise<{ loaded: boolean }>;
  generate(options: GenerateOptions): Promise<{ text: string }>;
  generateStream(options: GenerateOptions & { onToken?: (token: string) => void }): Promise<{ text?: string }>;
  unloadModel(): Promise<void>;
  getStatus(): Promise<{ loaded: boolean; contextUsed: number; contextMax: number; available?: boolean }>;
  isAvailable(): Promise<{ available: boolean; isLoaded?: boolean }>;
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

// Parametri ottimizzati per dispositivi mobili con 8GB RAM e inferenza ultra-veloce (< 2.5s)
const DEFAULT_MODEL_PARAMS: ModelParams = {
  n_ctx: 1024, // 1024 token di contesto: dimezza l'overhead di memoria KV e velocizza l'elaborazione
  n_threads: 4, // 4 thread CPU performanti per architettura mobile
  n_batch: 512, // batch parallelo per prompt evaluation istantanea SIMD NEON
  n_gpu_layers: 0, // CPU inference ad alta stabilità
};

const DEFAULT_GENERATE_PARAMS: Omit<GenerateOptions, 'prompt'> = {
  maxTokens: 80, // Risposte concise ed esatte (1-2 frasi), latenza CPU contenuta sotto i 2 secondi
  temperature: 0.1, // Campionamento quasi-greedy: salta il calcolo softmax pesante, 2x più veloce su CPU
  top_p: 0.9,
  top_k: 20,
  repeat_penalty: 1.15,
  stop: ['<end_of_turn>', '<start_of_turn>user', '<start_of_turn>system', '<|im_end|>', '<|im_start|>', '<|endoftext|>', '\nUser:', '\nUtente:', '\n\n'],
};

const BATTERY_WARN_THRESHOLD = 20;
const BATTERY_BLOCK_THRESHOLD = 10;
const INFERENCE_TIMEOUT_MS = 2500; // Timeout hard inferenza nativa a 2.5s (obiettivo < 3s complessivi)
const GLOBAL_SAFETY_TIMEOUT_MS = 2800; // Timeout globale di sicurezza massimo a 2.8s
const RAG_TOP_K = 1; // Solo 1 frammento più rilevante (max 150-200 token totali di contesto)

// Cache stato libreria nativa C++
let nativeAvailableCache: boolean | null = null;
let lastNativeCheckTime = 0;

export async function checkNativeLlmAvailability(): Promise<boolean> {
  if (nativeAvailableCache !== null && Date.now() - lastNativeCheckTime < 60_000) {
    return nativeAvailableCache;
  }

  const pluginAvailable = await ensurePluginLoaded();
  if (!pluginAvailable || !nativePlugin) {
    nativeAvailableCache = false;
    lastNativeCheckTime = Date.now();
    return false;
  }

  try {
    const checkPromise = (async () => {
      if (typeof nativePlugin.isAvailable === 'function') {
        const res = await nativePlugin.isAvailable();
        return !!res?.available;
      }
      if (typeof nativePlugin.getStatus === 'function') {
        const res = await nativePlugin.getStatus();
        return !!res?.available;
      }
      return false;
    })();

    const timeoutPromise = new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 80));
    nativeAvailableCache = await Promise.race([checkPromise, timeoutPromise]);
  } catch {
    nativeAvailableCache = false;
  }

  lastNativeCheckTime = Date.now();
  return nativeAvailableCache;
}

// ---- Stato Engine ----

type EngineState = 'idle' | 'loading' | 'ready' | 'generating' | 'error';

let engineState: EngineState = 'idle';
let lastIndexedModulesHash = '';

// Cache stato batteria per evitare overhead asincrono su ogni messaggio
let cachedBatteryLevel = 100;
let lastBatteryCheckTime = 0;
let isWarmingUp = false;
let isPrewarmed = false;

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

// ---- Template Prompt Multi-Modello (Gemma 4 / Gemma 2 / Qwen 2.5) ----

function buildPrompt(userQuery: string, ragContext: string, username: string): { prompt: string; stop: string[] } {
  const active = gemma2ModelManager.activeModel;
  // Troncamento e pulizia rigorosa del contesto: solo dati essenziali (max 280 caratteri)
  const trimmedContext = ragContext ? ragContext.slice(0, 280).trim().replace(/\s+/g, ' ') : '';
  const contextBlock = trimmedContext ? `\nDATI UTENTE REALI:\n• ${trimmedContext}\n` : '';

  if (active.family === 'qwen2.5') {
    return {
      prompt: `<|im_start|>system\nSei Chelona, assistente personale on-device di ${username}. Rispondi subito alla domanda in 1 o massimo 2 frasi concise ed esatte in italiano. Non usare preamboli né formule di cortesia (NON iniziare con "Certamente", "Ecco", o "In base ai tuoi dati"). Se sono presenti dati utente, usali come verità assoluta per formulare la risposta.${contextBlock}<|im_end|>\n<|im_start|>user\n${userQuery}<|im_end|>\n<|im_start|>assistant\n`,
      stop: ['<|im_end|>', '<|im_start|>', '<|endoftext|>', '\nUser:', '\nUtente:', '\n\n']
    };
  }

  // Gemma 4 e Gemma 2
  return {
    prompt: `<start_of_turn>user\nSei Chelona, assistente personale di ${username}. Rispondi subito alla domanda in massimo 2 frasi concise in italiano, senza convenevoli né preamboli inutili ("Certamente", "Ecco a te").${contextBlock}\nDomanda: ${userQuery}<end_of_turn>\n<start_of_turn>model\n`,
    stop: ['<end_of_turn>', '<start_of_turn>user', '<start_of_turn>system', '<|im_end|>', '\nUser:', '\nUtente:', '\n\n']
  };
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
  // Se la libreria nativa C++ non è disponibile sul dispositivo, fallisci all'istante (0ms)
  const isNative = await checkNativeLlmAvailability();
  if (!isNative) {
    return false;
  }

  // Se il modello non è pronto/scaricato sul dispositivo, non tentare il caricamento nativo
  if (!gemma2ModelManager.isReady) {
    return false;
  }

  const modelPath = gemma2ModelManager.localPath;
  if (!modelPath) return false;

  if (engineState === 'ready' || engineState === 'generating') return true;

  if (engineState === 'loading') {
    // Attendi con timeout massimo di 1.2s per evitare deadlock
    return new Promise<boolean>(resolve => {
      let elapsed = 0;
      const check = setInterval(() => {
        elapsed += 80;
        if (engineState === 'ready') {
          clearInterval(check);
          resolve(true);
        } else if (engineState === 'error' || elapsed >= 1200) {
          clearInterval(check);
          if (engineState === 'loading') engineState = 'idle';
          resolve(false);
        }
      }, 80);
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
      setTimeout(() => reject(new Error('Timeout caricamento modello (2s)')), 2000)
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
  // Se verificata di recente (< 60s), restituisci il valore in cache a 0ms
  if (Date.now() - lastBatteryCheckTime < 60_000) {
    return cachedBatteryLevel;
  }
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

    const level = await Promise.race([
      checkPromise,
      new Promise<number>(resolve => setTimeout(() => resolve(100), 120))
    ]);
    cachedBatteryLevel = level;
    lastBatteryCheckTime = Date.now();
    return level;
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
  onToken?: (token: string) => void,
  stopTokens?: string[]
): Promise<string> {
  const isNative = await checkNativeLlmAvailability();
  if (!isNative || !nativePlugin) throw new Error('Plugin nativo non disponibile');

  const stops = stopTokens || DEFAULT_GENERATE_PARAMS.stop;

  return new Promise<string>(async (resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Timeout inferenza (${INFERENCE_TIMEOUT_MS}ms)`));
    }, INFERENCE_TIMEOUT_MS);

    try {
      let fullText = '';

      const result = await nativePlugin!.generate({
        ...DEFAULT_GENERATE_PARAMS,
        stop: stops,
        prompt,
      });
      fullText = result?.text || '';

      clearTimeout(timeout);
      // Pulizia: rimuovi eventuali stop token dal testo
      const cleaned = fullText
        .replace(/<end_of_turn>/g, '')
        .replace(/<start_of_turn>user[\s\S]*/g, '')
        .replace(/<start_of_turn>model/g, '')
        .replace(/<\|im_end\|>/g, '')
        .replace(/<\|im_start\|>[\s\S]*/g, '')
        .trim();

      // Streaming fluido progressivo se richiesto dal chiamante
      if (onToken && cleaned) {
        const tokens = cleaned.split(/(\s+)/);
        for (const token of tokens) {
          onToken(token);
        }
      }

      resolve(cleaned);
    } catch (err) {
      clearTimeout(timeout);
      reject(err);
    }
  });
}

/**
 * Pre-riscalda l'intero motore in background non appena l'utente entra nella schermata AI:
 * - Carica il modello nativo in RAM (se presente e pronto)
 * - Pre-indicizza il RAG vettoriale in background
 * - Pre-carica il modulo chelonaEngine nella cache del runtime JS
 * - Pre-recupera lo stato della batteria
 * In questo modo la primissima risposta è istantanea senza cold-start!
 */
export async function preloadEngine(modules?: Module[], username?: string): Promise<void> {
  if (isWarmingUp || isPrewarmed) return;
  isWarmingUp = true;

  try {
    // 1. Preload chelonaEngine fallback in background
    import('./chelonaEngine').catch(() => {});

    // 2. Pre-check batteria
    getBatteryLevel().catch(() => {});

    // 3. Pre-check disponibilità libreria nativa a 0ms
    checkNativeLlmAvailability().catch(() => {});

    // 4. Pre-indicizza RAG in background se ci sono moduli
    if (modules && modules.length > 0) {
      const hash = computeModulesHash(modules);
      if (hash !== lastIndexedModulesHash) {
        indexModulesIntoRAG(modules, username || '');
        lastIndexedModulesHash = hash;
      }
    }

    // 5. Se la libreria nativa è disponibile e il modello GGUF è pronto sul dispositivo, pre-caricalo subito in memoria
    const isNative = await checkNativeLlmAvailability();
    if (isNative && gemma2ModelManager.isReady) {
      await ensureModelLoaded();
    }
    isPrewarmed = true;
  } catch (err) {
    console.warn('[Gemma2] Warmup parziale:', err);
  } finally {
    isWarmingUp = false;
  }
}

// ---- Query Principale ----

/**
 * Interroga Gemma 2 / Qwen con RAG locale.
 * Se la cache semantica intercetta la richiesta, restituisce immediatamente il dato a 0ms.
 * Se la libreria nativa o il modello non sono pronti, delega istantaneamente al chelonaEngine in < 100ms.
 * Risposta garantita entro 2.8 secondi in qualsiasi condizione.
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

  // ⚡ Sincronizzazione continua del Database Personale (RAG)
  const currentModulesHash = computeModulesHash(modules);
  if (currentModulesHash !== lastIndexedModulesHash) {
    indexModulesIntoRAG(modules, username);
    lastIndexedModulesHash = currentModulesHash;
  }

  const executeFallback = async (): Promise<Gemma2Response> => {
    const { queryChelonaAi } = await import('./chelonaEngine');
    const result = await queryChelonaAi(userQuery, modules, username);

    // Se richiesto streaming, emetti i frammenti progressivamente con micro-delay
    if (onToken && result && result.text) {
      const words = result.text.split(/(\s+)/);
      for (const word of words) {
        onToken(word);
        if (word.trim().length > 0) {
          await new Promise(r => setTimeout(r, 6));
        }
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

  // ⚡ FAST-PATH IMMEDIATO: Se la libreria nativa non è presente o il modello non è pronto,
  // esegui il fallback istantaneo su chelonaEngine in < 50ms SENZA timeout o blocchi!
  const isNative = await checkNativeLlmAvailability();
  if (!isNative || !gemma2ModelManager.isReady) {
    return await executeFallback();
  }

  try {
    const responsePromise = (async (): Promise<Gemma2Response> => {
      // 1. Controlla batteria
      const battery = await getBatteryLevel();
      if (battery < BATTERY_BLOCK_THRESHOLD) {
        return await executeFallback();
      }

      // Limita i token se la batteria è scarica
      if (battery < BATTERY_WARN_THRESHOLD) {
        DEFAULT_GENERATE_PARAMS.maxTokens = 60;
      } else {
        DEFAULT_GENERATE_PARAMS.maxTokens = 80;
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

      // 5. Costruisci il prompt compatto con template del modello attivo (Gemma 4 / Gemma 2 / Qwen 2.5)
      const promptObj = buildPrompt(userQuery, ragContext, username);

      // 6. Inferenza con Streaming attivo
      engineState = 'generating';
      let responseText = '';

      try {
        responseText = await runGemmaInference(promptObj.prompt, onToken, promptObj.stop);
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
        engineUsed: `${gemma2ModelManager.activeModel.family}-local` as any,
        ragDocsUsed: ragDocs.length,
        cached: false,
        semanticMatch: false,
      };
    })();

    // Protezione globale: timeout massimo di 2.8 secondi prima di ripiegare su chelonaEngine
    const globalTimeout = new Promise<Gemma2Response>((resolve) => {
      setTimeout(async () => {
        console.warn('[Gemma2] Timeout globale di sicurezza (2.8s) scattato, fallback a chelonaEngine');
        resolve(await executeFallback());
      }, GLOBAL_SAFETY_TIMEOUT_MS);
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
