/**
 * Local Database — Archiviazione Dati e Preferenze Locale
 * 
 * 100% Offline • Zero Cloud • Totale Isolamento e Privacy sul Dispositivo.
 * Utilizza IndexedDB come database locale strutturato con fallback resiliente
 * a localStorage per garantire compatibilità universale su tutti i dispositivi Android e Web.
 */

import { AiMemory } from './chelonaEngine';
import { VectorDocument } from './ragEngine';

const DB_NAME = 'chelona_local_db';
const DB_VERSION = 1;

export interface UserPreference {
  key: string;
  value: any;
  updatedAt: number;
}

export interface CachedSemanticItem {
  id: string;
  query: string;
  normalizedQuery: string;
  queryTokens: string[];
  embedding: number[];
  response: {
    text: string;
    actions?: any[];
    learnedFact?: string;
    autoAction?: any;
  };
  contextHash: string;
  timestamp: number;
  hits: number;
}

class LocalDatabase {
  private db: IDBDatabase | null = null;
  private isSupported: boolean = typeof window !== 'undefined' && 'indexedDB' in window;
  private initPromise: Promise<boolean> | null = null;

  constructor() {
    this.init();
  }

  public async init(): Promise<boolean> {
    if (this.initPromise) return this.initPromise;
    if (!this.isSupported) return false;

    this.initPromise = new Promise((resolve) => {
      try {
        const request = window.indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
          const db = (event.target as IDBOpenDBRequest).result;

          if (!db.objectStoreNames.contains('preferences')) {
            db.createObjectStore('preferences', { keyPath: 'key' });
          }
          if (!db.objectStoreNames.contains('memories')) {
            const memStore = db.createObjectStore('memories', { keyPath: 'id' });
            memStore.createIndex('category', 'category', { unique: false });
            memStore.createIndex('key', 'key', { unique: false });
          }
          if (!db.objectStoreNames.contains('vector_documents')) {
            const vecStore = db.createObjectStore('vector_documents', { keyPath: 'id' });
            vecStore.createIndex('source', 'metadata.source', { unique: false });
          }
          if (!db.objectStoreNames.contains('semantic_cache')) {
            const cacheStore = db.createObjectStore('semantic_cache', { keyPath: 'id' });
            cacheStore.createIndex('contextHash', 'contextHash', { unique: false });
            cacheStore.createIndex('timestamp', 'timestamp', { unique: false });
          }
        };

        request.onsuccess = () => {
          this.db = request.result;
          resolve(true);
        };

        request.onerror = () => {
          console.warn('[LocalDatabase] Errore apertura IndexedDB, utilizzo fallback localStorage.');
          this.db = null;
          resolve(false);
        };
      } catch (err) {
        console.warn('[LocalDatabase] IndexedDB non disponibile:', err);
        this.db = null;
        resolve(false);
      }
    });

    return this.initPromise;
  }

  // =========================================================================
  // PREFERENZE UTENTE
  // =========================================================================

  public async setPreference<T>(key: string, value: T): Promise<void> {
    await this.init();
    const item: UserPreference = { key, value, updatedAt: Date.now() };

    if (this.db) {
      try {
        const tx = this.db.transaction('preferences', 'readwrite');
        tx.objectStore('preferences').put(item);
      } catch (e) {
        console.warn('[LocalDatabase] Errore salvataggio preferenza IndexedDB', e);
      }
    }

    // Backup di sicurezza in localStorage
    try {
      localStorage.setItem(`chelona_pref_${key}`, JSON.stringify(value));
    } catch {}
  }

  public async getPreference<T>(key: string, defaultValue: T): Promise<T> {
    await this.init();

    if (this.db) {
      try {
        const result = await new Promise<UserPreference | null>((resolve) => {
          const tx = this.db!.transaction('preferences', 'readonly');
          const req = tx.objectStore('preferences').get(key);
          req.onsuccess = () => resolve(req.result || null);
          req.onerror = () => resolve(null);
        });

        if (result && result.value !== undefined) {
          return result.value as T;
        }
      } catch {}
    }

    // Fallback localStorage
    try {
      const raw = localStorage.getItem(`chelona_pref_${key}`);
      if (raw !== null) {
        return JSON.parse(raw) as T;
      }
    } catch {}

    return defaultValue;
  }

  // =========================================================================
  // MEMORIE E FATTI UTENTE (AI MEMORY)
  // =========================================================================

  public async saveMemories(memories: AiMemory[]): Promise<void> {
    await this.init();
    if (this.db) {
      try {
        const tx = this.db.transaction('memories', 'readwrite');
        const store = tx.objectStore('memories');
        store.clear();
        for (const mem of memories) {
          store.put(mem);
        }
      } catch (e) {
        console.warn('[LocalDatabase] Errore salvataggio memorie IndexedDB', e);
      }
    }

    try {
      localStorage.setItem('chelona_ai_memories', JSON.stringify(memories));
      localStorage.setItem('chelona_learned_memories', JSON.stringify(memories));
    } catch {}
  }

  public async getAllMemories(): Promise<AiMemory[]> {
    await this.init();

    if (this.db) {
      try {
        const list = await new Promise<AiMemory[]>((resolve) => {
          const tx = this.db!.transaction('memories', 'readonly');
          const req = tx.objectStore('memories').getAll();
          req.onsuccess = () => resolve(req.result || []);
          req.onerror = () => resolve([]);
        });
        if (list && list.length > 0) return list;
      } catch {}
    }

    try {
      const raw = localStorage.getItem('chelona_ai_memories') || localStorage.getItem('chelona_learned_memories');
      if (raw) return JSON.parse(raw);
    } catch {}

    return [];
  }

  // =========================================================================
  // DOCUMENTI VETTORIALI RAG
  // =========================================================================

  public async saveVectorDocuments(docs: VectorDocument[]): Promise<void> {
    await this.init();
    if (this.db) {
      try {
        const tx = this.db.transaction('vector_documents', 'readwrite');
        const store = tx.objectStore('vector_documents');
        store.clear();
        for (const doc of docs) {
          store.put(doc);
        }
      } catch (e) {
        console.warn('[LocalDatabase] Errore salvataggio vettori IndexedDB', e);
      }
    }
  }

  public async getVectorDocuments(): Promise<VectorDocument[]> {
    await this.init();
    if (this.db) {
      try {
        const docs = await new Promise<VectorDocument[]>((resolve) => {
          const tx = this.db!.transaction('vector_documents', 'readonly');
          const req = tx.objectStore('vector_documents').getAll();
          req.onsuccess = () => resolve(req.result || []);
          req.onerror = () => resolve([]);
        });
        if (docs && docs.length > 0) return docs;
      } catch {}
    }
    return [];
  }

  // =========================================================================
  // CACHE SEMANTICA PERSISTITA
  // =========================================================================

  public async saveSemanticCache(entries: CachedSemanticItem[]): Promise<void> {
    await this.init();
    if (this.db) {
      try {
        const tx = this.db.transaction('semantic_cache', 'readwrite');
        const store = tx.objectStore('semantic_cache');
        store.clear();
        for (const entry of entries) {
          store.put(entry);
        }
      } catch (e) {
        console.warn('[LocalDatabase] Errore salvataggio cache semantica IndexedDB', e);
      }
    }

    try {
      // Salva un subset in sessionStorage per warm cache
      sessionStorage.setItem('chelona_semantic_cache_fast', JSON.stringify(entries.slice(0, 50)));
    } catch {}
  }

  public async getSemanticCache(): Promise<CachedSemanticItem[]> {
    await this.init();
    if (this.db) {
      try {
        const list = await new Promise<CachedSemanticItem[]>((resolve) => {
          const tx = this.db!.transaction('semantic_cache', 'readonly');
          const req = tx.objectStore('semantic_cache').getAll();
          req.onsuccess = () => resolve(req.result || []);
          req.onerror = () => resolve([]);
        });
        if (list && list.length > 0) return list;
      } catch {}
    }

    try {
      const raw = sessionStorage.getItem('chelona_semantic_cache_fast');
      if (raw) return JSON.parse(raw);
    } catch {}

    return [];
  }
}

export const localDb = new LocalDatabase();
