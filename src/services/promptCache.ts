/**
 * Prompt Cache — Eliminata da Chelona (AI cache disabled)
 * 
 * Tutte le interrogazioni vengono elaborate direttamente e in tempo reale dal motore AI.
 */

const CACHE_KEY = 'chelona_prompt_cache';

class PromptCache {
  constructor() {
    this.invalidate();
  }

  get(_prompt: string, _ragContext: string): { text: string; actions?: unknown[] } | null {
    // Risposte in cache eliminate: sempre null
    return null;
  }

  set(_prompt: string, _ragContext: string, _response: { text: string; actions?: unknown[] }): void {
    // No-op: nessuna memorizzazione in cache
  }

  invalidate(): void {
    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem(CACHE_KEY);
      }
    } catch {}
  }

  getStats(): { size: number; maxSize: number; ttlMinutes: number } {
    return {
      size: 0,
      maxSize: 0,
      ttlMinutes: 0,
    };
  }
}

export const promptCache = new PromptCache();

try {
  promptCache.invalidate();
} catch {}
