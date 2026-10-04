/**
 * Semantic Cache — Eliminata da Chelona (AI cache disabled)
 * 
 * Le risposte dell'AI non vengono più salvate in cache in RAM o disco.
 * Tutte le interrogazioni vengono elaborate direttamente e in tempo reale dal motore AI.
 */

import { localDb } from './localDatabase';

export const CACHE_ENABLED_KEY = 'chelona_ai_cache_enabled';

// La cache è permanentemente disattivata
export function isCacheEnabled(): boolean {
  return false;
}

export function setCacheEnabled(_enabled: boolean): void {
  // No-op: cache disattivata
}

export interface SemanticCacheHit {
  entry: {
    query: string;
    response: {
      text: string;
      actions?: unknown[];
      learnedFact?: string;
      autoAction?: unknown;
    };
  };
  similarity: number;
  exactMatch: boolean;
}

export class SemanticCache {
  private ramEntries: any[] = [];
  private cacheHits = 0;

  constructor() {
    this.clearAllCache();
  }

  public isEnabled(): boolean {
    return false;
  }

  public setEnabled(_enabled: boolean): void {
    // No-op
  }

  public async init(): Promise<void> {
    this.clearAllCache();
  }

  public findMatch(_userQuery: string): SemanticCacheHit | null {
    // Risposte in cache eliminate: sempre null per elaborazione live
    return null;
  }

  public set(
    _userQuery: string,
    _modulesHash: string,
    _response: { text: string; actions?: unknown[]; learnedFact?: string; autoAction?: unknown }
  ): void {
    // No-op: nessuna memorizzazione in cache
  }

  public clear(): void {
    this.ramEntries = [];
    this.cacheHits = 0;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(CACHE_ENABLED_KEY);
        localStorage.removeItem('chelona_semantic_cache_fast');
      }
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem('chelona_semantic_cache_fast');
        sessionStorage.removeItem('chelona_prompt_cache');
      }
      localDb.saveSemanticCache([]);
    } catch {}
  }

  public getStats(): { ramCount: number; hits: number } {
    return { ramCount: 0, hits: 0 };
  }

  public getCacheEntries(): Array<{ query: string; responsePreview: string; responseText: string; timestamp: number; hits: number }> {
    return [];
  }

  public deleteCacheEntry(_query: string): void {
    // No-op
  }

  public deleteCacheEntries(_queries: string[]): void {
    // No-op
  }

  public clearAllCache(): void {
    this.clear();
  }
}

export const semanticCache = new SemanticCache();

// Pulizia immediata all'avvio
try {
  semanticCache.clearAllCache();
} catch {}

export function getSemanticCacheEntries(): Array<{ query: string; responsePreview: string; responseText: string; timestamp: number; hits: number }> {
  return semanticCache.getCacheEntries();
}

export function deleteSemanticCacheEntry(query: string): void {
  semanticCache.deleteCacheEntry(query);
}

export function deleteSemanticCacheEntries(queries: string[]): void {
  semanticCache.deleteCacheEntries(queries);
}

export function clearSemanticCache(): void {
  semanticCache.clearAllCache();
}
