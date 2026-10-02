/**
 * Semantic Cache — Cache Semantica in RAM ad Altissima Velocità
 * 
 * Se l'utente effettua una richiesta identica o semanticamente molto simile ad una
 * già elaborata, restituisce immediatamente la risposta memorizzata nella cache in RAM,
 * bypassando del tutto l'inferenza del modello Gemma 2 per azzerare consumi di batteria e latenza.
 * 
 * Caratteristiche:
 * - Residente al 100% in RAM per risposte a latenza zero (< 1 ms).
 * - Matching esatto normalizzato (punteggio 1.0).
 * - Mappatura sinonimi italiani (auto/macchina/veicolo, spesa/costi/uscite, ecc.).
 * - Matching semantico vettoriale con soglia abbassata a 0.72 per massimizzare i cache hit.
 * - Politica di evacuazione LRU (massimo 200 elementi in memoria).
 * - Persistenza in background su database locale.
 */

import { localDb, CachedSemanticItem } from './localDatabase';

const MAX_RAM_ENTRIES = 200;
const DEFAULT_SIMILARITY_THRESHOLD = 0.72; // Soglia permissiva per aumentare i cache hit (72%+)

const STOPWORDS = new Set([
  'il', 'lo', 'la', 'i', 'gli', 'le', 'un', 'uno', 'una',
  'di', 'del', 'della', 'dei', 'degli', 'delle', 'da', 'dal',
  'in', 'nel', 'nella', 'a', 'al', 'alla', 'con', 'su', 'per',
  'e', 'ed', 'o', 'ma', 'se', 'non', 'che', 'cosa', 'chi',
  'come', 'quando', 'dove', 'perche', 'mi', 'ti', 'ci', 'vi',
  'sono', 'sei', 'e', 'ha', 'ho', 'hai', 'abbiamo', 'hanno',
  'puoi', 'dimmi', 'mostrami', 'fammi', 'vedere', 'vorrei', 'sapere',
  'trova', 'dammi', 'ci', 'sono', 'un', 'po', 'mio', 'mia', 'miei', 'mie',
  'tuo', 'tua', 'tuoi', 'tue', 'nostro', 'nostra'
]);

// Mappatura semantica canonica per l'italiano
const SYNONYMS: Record<string, string> = {
  // Veicoli & Auto
  'macchina': 'auto',
  'macchine': 'auto',
  'vettura': 'auto',
  'vetture': 'auto',
  'veicolo': 'auto',
  'veicoli': 'auto',
  'automobile': 'auto',
  'automobili': 'auto',

  // Spese & Finanze
  'spese': 'spesa',
  'uscite': 'spesa',
  'uscita': 'spesa',
  'costi': 'spesa',
  'costo': 'spesa',
  'soldi': 'spesa',
  'pagamenti': 'spesa',
  'pagamento': 'spesa',
  'budget': 'spesa',
  'conti': 'spesa',
  'conto': 'spesa',

  // Scadenze
  'scadenze': 'scadenza',
  'scaduto': 'scadenza',
  'scadute': 'scadenza',
  'scaduti': 'scadenza',
  'scadenza': 'scadenza',

  // Documenti
  'documenti': 'documento',
  'documentazione': 'documento',
  'patente': 'documento',
  'passaporto': 'documento',
  'carta': 'documento',

  // Parcheggio
  'parcheggiata': 'parcheggio',
  'parcheggiai': 'parcheggio',
  'parcheggi': 'parcheggio',
  'parcheggiare': 'parcheggio',
  'parchimetro': 'parcheggio',
  'posto': 'parcheggio',

  // Ricette & Cucina
  'ricette': 'ricetta',
  'ricettario': 'ricetta',
  'cucinare': 'cucina',

  // Fitness
  'allenamento': 'fitness',
  'allenamenti': 'fitness',
  'palestra': 'fitness',
  'esercizi': 'fitness',
  'workout': 'fitness',
  'scheda': 'fitness',

  // Volantini & Offerte
  'volantini': 'offerta',
  'volantino': 'offerta',
  'offerte': 'offerta',
  'sconti': 'offerta',
  'sconto': 'offerta',
  'promozioni': 'offerta',
  'promo': 'offerta',

  // Viaggi & Mete
  'viaggi': 'viaggio',
  'vacanza': 'viaggio',
  'vacanze': 'viaggio',
  'itinerario': 'viaggio',
  'itinerari': 'viaggio',
  'tappe': 'viaggio',

  // Note & Appunti
  'appunti': 'nota',
  'appunto': 'nota',
  'note': 'nota',
  'promemoria': 'nota',
};

export interface SemanticMatchResult {
  hit: boolean;
  similarity: number;
  entry: CachedSemanticItem;
  exactMatch: boolean;
}

export class SemanticCache {
  private ramEntries: CachedSemanticItem[] = [];
  private isLoaded = false;
  private totalQueries = 0;
  private cacheHits = 0;
  private saveTimeout: any = null;

  constructor() {
    this.init();
  }

  private async init(): Promise<void> {
    if (this.isLoaded) return;
    try {
      const persisted = await localDb.getSemanticCache();
      if (persisted && persisted.length > 0) {
        this.ramEntries = persisted.slice(0, MAX_RAM_ENTRIES);
      }
    } catch (e) {
      console.warn('[SemanticCache] Inizializzazione da DB fallita, uso RAM vuota', e);
    }
    this.isLoaded = true;
  }

  /**
   * Normalizza una stringa per confronto canonico
   */
  public normalize(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Estrae i token semantici canonici applicando lemmatizzazione dei sinonimi
   */
  public tokenize(text: string): string[] {
    const norm = this.normalize(text);
    return norm
      .split(' ')
      .filter(t => t.length > 2 && !STOPWORDS.has(t))
      .map(t => SYNONYMS[t] || t);
  }

  /**
   * Calcola l'indice di sovrapposizione Jaccard tra due insiemi di token
   */
  private jaccardSimilarity(tokensA: string[], tokensB: string[]): number {
    if (tokensA.length === 0 || tokensB.length === 0) return 0;
    const setA = new Set(tokensA);
    const setB = new Set(tokensB);
    let intersection = 0;
    for (const t of setA) {
      if (setB.has(t)) intersection++;
    }
    const union = new Set([...tokensA, ...tokensB]).size;
    return union > 0 ? intersection / union : 0;
  }

  /**
   * Calcola la similarità coseno tra due vettori
   */
  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (!vecA || !vecB || vecA.length === 0 || vecA.length !== vecB.length) return 0;
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dot += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Vettore denso ad hash per comparazione rapida
   */
  public computeFastEmbedding(tokens: string[]): number[] {
    const dim = 64;
    const vec = new Array(dim).fill(0);
    if (tokens.length === 0) return vec;

    for (const token of tokens) {
      let hash = 5381;
      for (let i = 0; i < token.length; i++) {
        hash = ((hash << 5) + hash) ^ token.charCodeAt(i);
        hash = hash >>> 0;
      }
      const idx = hash % dim;
      vec[idx] += 1;
    }

    const norm = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
    return norm > 0 ? vec.map(v => v / norm) : vec;
  }

  /**
   * Cerca una risposta identica o semanticamente molto simile nella cache in RAM.
   * Restituisce immediatamente il risultato se trovato, bypassando totalmente Gemma 2.
   */
  public findMatch(
    query: string,
    threshold = DEFAULT_SIMILARITY_THRESHOLD
  ): SemanticMatchResult | null {
    this.totalQueries++;
    const normQuery = this.normalize(query);
    if (!normQuery) return null;

    const queryTokens = this.tokenize(query);
    const queryEmbedding = this.computeFastEmbedding(queryTokens);

    // 1. FAST PATH: Matching esatto normalizzato (Latenza ~ 0.02ms)
    for (let i = 0; i < this.ramEntries.length; i++) {
      const entry = this.ramEntries[i];
      if (entry.normalizedQuery === normQuery) {
        entry.hits++;
        entry.timestamp = Date.now();
        // Sposta in cima alla lista LRU
        this.ramEntries.splice(i, 1);
        this.ramEntries.unshift(entry);
        this.cacheHits++;
        this.schedulePersist();
        console.log(`[SemanticCache] ⚡ Hit Esatto (100%): "${query}"`);
        return {
          hit: true,
          similarity: 1.0,
          entry,
          exactMatch: true,
        };
      }
    }

    // 2. SEMANTIC PATH: Confronto vettoriale con sinonimi e overlap token
    let bestEntry: CachedSemanticItem | null = null;
    let bestSimilarity = 0;
    let bestIndex = -1;

    for (let i = 0; i < this.ramEntries.length; i++) {
      const entry = this.ramEntries[i];

      const jaccard = this.jaccardSimilarity(queryTokens, entry.queryTokens);
      const cosine = this.cosineSimilarity(queryEmbedding, entry.embedding);

      // Ponderazione: 50% cosine + 50% jaccard sui token canonici
      let score = (cosine * 0.5) + (jaccard * 0.5);

      // Bonus se ci sono 2 o più token semantici identici (es. 'auto' + 'scadenza')
      const sharedTokens = queryTokens.filter(t => entry.queryTokens.includes(t));
      if (sharedTokens.length >= 2) {
        score = Math.max(score, 0.85);
      } else if (sharedTokens.length === 1 && queryTokens.length === 1 && entry.queryTokens.length === 1) {
        // Query mono-termine con stesso concetto (es. "scadenze" vs "scadenza")
        score = 0.95;
      }

      if (score > bestSimilarity) {
        bestSimilarity = score;
        bestEntry = entry;
        bestIndex = i;
      }
    }

    // Se la similarità supera la soglia permissiva (es. >= 72%)
    if (bestEntry && bestSimilarity >= threshold) {
      bestEntry.hits++;
      bestEntry.timestamp = Date.now();
      if (bestIndex >= 0) {
        this.ramEntries.splice(bestIndex, 1);
        this.ramEntries.unshift(bestEntry);
      }
      this.cacheHits++;
      this.schedulePersist();
      console.log(`[SemanticCache] ⚡ Hit Semantico (${Math.round(bestSimilarity * 100)}%): "${query}" coincide con "${bestEntry.query}"`);
      return {
        hit: true,
        similarity: Math.round(bestSimilarity * 100) / 100,
        entry: bestEntry,
        exactMatch: false,
      };
    }

    return null;
  }

  /**
   * Salva una risposta generata nella cache in RAM e programma la persistenza
   */
  public set(
    query: string,
    contextHash: string,
    response: { text: string; actions?: any[]; learnedFact?: string; autoAction?: any }
  ): void {
    if (!query || !response || !response.text || response.text.trim().length === 0) return;

    const normQuery = this.normalize(query);
    const tokens = this.tokenize(query);
    const embedding = this.computeFastEmbedding(tokens);

    // Rimuovi eventuale duplicato già presente
    this.ramEntries = this.ramEntries.filter(e => e.normalizedQuery !== normQuery);

    const newItem: CachedSemanticItem = {
      id: 'sc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      query: query.trim(),
      normalizedQuery: normQuery,
      queryTokens: tokens,
      embedding,
      response,
      contextHash: contextHash || '',
      timestamp: Date.now(),
      hits: 1,
    };

    // Inserisci in cima alla RAM (LRU)
    this.ramEntries.unshift(newItem);

    // Evacua se supera il limite massimo di memoria RAM
    if (this.ramEntries.length > MAX_RAM_ENTRIES) {
      this.ramEntries = this.ramEntries.slice(0, MAX_RAM_ENTRIES);
    }

    this.schedulePersist();
  }

  /**
   * Svuota la cache in RAM
   */
  public clear(): void {
    this.ramEntries = [];
    localDb.saveSemanticCache([]);
  }

  private schedulePersist(): void {
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => {
      localDb.saveSemanticCache(this.ramEntries);
    }, 1200);
    if (this.saveTimeout && typeof this.saveTimeout.unref === 'function') {
      this.saveTimeout.unref();
    }
  }

  /**
   * Statistiche della cache in tempo reale
   */
  public getStats(): {
    ramSize: number;
    maxEntries: number;
    hitRate: number;
    totalQueries: number;
    cacheHits: number;
  } {
    const rate = this.totalQueries > 0 ? (this.cacheHits / this.totalQueries) * 100 : 0;
    return {
      ramSize: this.ramEntries.length,
      maxEntries: MAX_RAM_ENTRIES,
      hitRate: Math.round(rate * 10) / 10,
      totalQueries: this.totalQueries,
      cacheHits: this.cacheHits,
    };
  }

  /**
   * Restituisce tutte le voci della cache per la UI di gestione
   */
  public getCacheEntries(): Array<{ query: string; responsePreview: string; responseText: string; timestamp: number; hits: number }> {
    return this.ramEntries.map(e => ({
      query: e.query,
      responsePreview: (e.response.text || '').slice(0, 140),
      responseText: e.response.text || '',
      timestamp: e.timestamp,
      hits: e.hits,
    }));
  }

  /**
   * Elimina una singola voce dalla cache (per query normalizzata)
   */
  public deleteCacheEntry(query: string): void {
    const normQuery = this.normalize(query);
    this.ramEntries = this.ramEntries.filter(e => e.normalizedQuery !== normQuery);
    this.schedulePersist();
  }

  /**
   * Svuota completamente la cache in RAM e nel DB locale
   */
  public clearAllCache(): void {
    this.clear();
  }
}

export const semanticCache = new SemanticCache();

export function getSemanticCacheEntries(): Array<{ query: string; responsePreview: string; responseText: string; timestamp: number; hits: number }> {
  return semanticCache.getCacheEntries();
}

export function deleteSemanticCacheEntry(query: string): void {
  semanticCache.deleteCacheEntry(query);
}

export function clearSemanticCache(): void {
  semanticCache.clearAllCache();
}
