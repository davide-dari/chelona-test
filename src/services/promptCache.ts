/**
 * Prompt Cache — LRU Cache per risposte AI identiche
 * Riduce il consumo hardware per prompt ripetuti o frequenti.
 * Max 100 entry • TTL 30 minuti • Persist in sessionStorage
 */

const CACHE_KEY = 'chelona_prompt_cache';
const MAX_ENTRIES = 100;
const TTL_MS = 30 * 60 * 1000; // 30 minuti

interface CacheEntry {
  key: string;
  response: { text: string; actions?: unknown[] };
  timestamp: number;
  hits: number;
}

// Hash rapido e deterministico per la chiave di cache
function hashKey(prompt: string, ragContext: string): string {
  const combined = `${prompt.trim().toLowerCase()}|||${ragContext.slice(0, 200)}`;
  let hash = 5381;
  for (let i = 0; i < combined.length; i++) {
    hash = ((hash << 5) + hash) ^ combined.charCodeAt(i);
    hash = hash >>> 0; // Converte in unsigned 32-bit integer
  }
  return hash.toString(16);
}

class PromptCache {
  private entries: Map<string, CacheEntry> = new Map();
  private loaded = false;

  private load(): void {
    if (this.loaded) return;
    try {
      const raw = sessionStorage.getItem(CACHE_KEY);
      if (raw) {
        const arr: CacheEntry[] = JSON.parse(raw);
        for (const e of arr) {
          if (Date.now() - e.timestamp < TTL_MS) {
            this.entries.set(e.key, e);
          }
        }
      }
    } catch {}
    this.loaded = true;
  }

  private persist(): void {
    try {
      const arr = Array.from(this.entries.values());
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(arr));
    } catch {}
  }

  get(prompt: string, ragContext: string): { text: string; actions?: unknown[] } | null {
    this.load();
    const key = hashKey(prompt, ragContext);
    const entry = this.entries.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > TTL_MS) {
      this.entries.delete(key);
      return null;
    }
    // Aggiorna hit count e sposta in cima (LRU)
    entry.hits++;
    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry.response;
  }

  set(prompt: string, ragContext: string, response: { text: string; actions?: unknown[] }): void {
    this.load();
    const key = hashKey(prompt, ragContext);

    // Evict entry più vecchia se supera il limite (LRU eviction)
    if (this.entries.size >= MAX_ENTRIES) {
      const firstKey = this.entries.keys().next().value;
      if (firstKey) this.entries.delete(firstKey);
    }

    this.entries.set(key, {
      key,
      response,
      timestamp: Date.now(),
      hits: 0,
    });
    this.persist();
  }

  invalidate(): void {
    this.entries.clear();
    sessionStorage.removeItem(CACHE_KEY);
  }

  getStats(): { size: number; maxSize: number; ttlMinutes: number } {
    return {
      size: this.entries.size,
      maxSize: MAX_ENTRIES,
      ttlMinutes: TTL_MS / 60000,
    };
  }
}

export const promptCache = new PromptCache();
