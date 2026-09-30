/**
 * Semantic Cache — Cache Semantica in RAM per Gemma 2
 * 
 * Se l'utente effettua una richiesta identica o semanticamente molto simile ad una
 * già elaborata, restituisce immediatamente la risposta memorizzata nella cache in RAM,
 * bypassando del tutto l'inferenza del modello Gemma 2 per azzerare consumi di batteria e latenza.
 * 
 * Caratteristiche:
 * - Residente al 100% in RAM per risposte a latenza zero (< 1 ms).
 * - Matching esatto normalizzato (punteggio 1.0).
 * - Matching semantico vettoriale (Cosine Similarity su TF-IDF + Jaccard token overlap).
 * - Soglia semantica configurabile (default 0.85).
 * - Politica di evacuazione LRU (massimo 200 elementi in memoria).
 * - Persistenza in background sul database locale per ripristino istantaneo al riavvio.
 */

import { localDb, CachedSemanticItem } from './localDatabase';

const MAX_RAM_ENTRIES = 200;
const DEFAULT_SIMILARITY_THRESHOLD = 0.82; // 82%+ similarità semantica per bypass
const STOPWORDS = new Set([
  'il', 'lo', 'la', 'i', 'gli', 'le', 'un', 'uno', 'una',
  'di', 'del', 'della', 'dei', 'degli', 'delle', 'da', 'dal',
  'in', 'nel', 'nella', 'a', 'al', 'alla', 'con', 'su', 'per',
  'e', 'ed', 'o', 'ma', 'se', 'non', 'che', 'cosa', 'chi',
  'come', 'quando', 'dove', 'perche', 'mi', 'ti', 'ci', 'vi',
  'sono', 'sei', 'e', 'ha', 'ho', 'puoi', 'dimmi', 'mostrami',
  'fammi', 'vedere', 'vorrei', 'sapere'
]);

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
   * Estrae i token semantici escludendo le stopwords comuni italiane
   */
  public tokenize(text: string): string[] {
    const norm = this.normalize(text);
    return norm
      .split(' ')
      .filter(t => t.length > 2 && !STOPWORDS.has(t));
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
   * Calcola la similarità coseno tra due vettori densi/sparsi
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
   * Costruisce un vettore TF-IDF sintetico veloce a dimensione fissa (hash space 128)
   */
  public computeFastEmbedding(tokens: string[]): number[] {
    const dim = 128;
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

    // Normalizzazione L2
    const norm = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
    return norm > 0 ? vec.map(v => v / norm) : vec;
  }

  /**
   * Cerca una risposta identica o semanticamente molto simile nella cache in RAM.
   * Se trovata, restituisce immediatamente il risultato bypassando il modello Gemma 2.
   */
  public findMatch(
    query: string,
    contextHash = '',
    threshold = DEFAULT_SIMILARITY_THRESHOLD
  ): SemanticMatchResult | null {
    this.totalQueries++;
    const normQuery = this.normalize(query);
    if (!normQuery) return null;

    const queryTokens = this.tokenize(query);
    const queryEmbedding = this.computeFastEmbedding(queryTokens);

    // 1. FAST PATH: Matching esatto normalizzato (Latenza ~ 0.05ms)
    for (let i = 0; i < this.ramEntries.length; i++) {
      const entry = this.ramEntries[i];
      if (entry.normalizedQuery === normQuery) {
        // Se c'è un contesto RAG specificato, controlla che non sia cambiato drasticamente
        if (!contextHash || !entry.contextHash || entry.contextHash === contextHash) {
          entry.hits++;
          entry.timestamp = Date.now();
          // Muovi all'inizio (LRU)
          this.ramEntries.splice(i, 1);
          this.ramEntries.unshift(entry);
          this.cacheHits++;
          this.schedulePersist();
          return {
            hit: true,
            similarity: 1.0,
            entry,
            exactMatch: true,
          };
        }
      }
    }

    // 2. SEMANTIC PATH: Confronto vettoriale Cosine Similarity & Jaccard su token
    let bestEntry: CachedSemanticItem | null = null;
    let bestSimilarity = 0;
    let bestIndex = -1;

    for (let i = 0; i < this.ramEntries.length; i++) {
      const entry = this.ramEntries[i];

      // Salta contesti incompatibili se specificati
      if (contextHash && entry.contextHash && entry.contextHash !== contextHash) {
        continue;
      }

      const jaccard = this.jaccardSimilarity(queryTokens, entry.queryTokens);
      const cosine = this.cosineSimilarity(queryEmbedding, entry.embedding);

      // Ponderazione: 65% cosine similarity vettoriale + 35% Jaccard token overlap
      const combinedScore = (cosine * 0.65) + (jaccard * 0.35);

      if (combinedScore > bestSimilarity) {
        bestSimilarity = combinedScore;
        bestEntry = entry;
        bestIndex = i;
      }
    }

    // Se la similarità supera la soglia, è un HIT semantico!
    if (bestEntry && bestSimilarity >= threshold) {
      bestEntry.hits++;
      bestEntry.timestamp = Date.now();
      if (bestIndex >= 0) {
        this.ramEntries.splice(bestIndex, 1);
        this.ramEntries.unshift(bestEntry);
      }
      this.cacheHits++;
      this.schedulePersist();
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
   * Salva una risposta generata nella cache in RAM e programma la persistenza su disco
   */
  public set(
    query: string,
    contextHash: string,
    response: { text: string; actions?: any[]; learnedFact?: string; autoAction?: any }
  ): void {
    if (!query || !response || !response.text) return;

    const normQuery = this.normalize(query);
    const tokens = this.tokenize(query);
    const embedding = this.computeFastEmbedding(tokens);

    // Rimuovi eventuale duplicato esatto già presente
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
    }, 1500);
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
}

export const semanticCache = new SemanticCache();
