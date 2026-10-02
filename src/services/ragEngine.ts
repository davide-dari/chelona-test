/**
 * RAG Engine — Retrieval-Augmented Generation Locale
 * Database vettoriale basato su TF-IDF con cosine similarity
 * 100% On-Device • Zero cloud • Privacy assoluta
 */

const RAG_DB_KEY = 'chelona_rag_db';
const MAX_DOCUMENTS = 2000;
const STOPWORDS_IT = new Set([
  'il', 'lo', 'la', 'i', 'gli', 'le', 'un', 'uno', 'una',
  'di', 'del', 'della', 'dei', 'degli', 'delle', 'da', 'dal',
  'della', 'in', 'nel', 'nella', 'nei', 'nelle', 'a', 'al',
  'alla', 'ai', 'agli', 'alle', 'con', 'su', 'per', 'tra',
  'fra', 'e', 'ed', 'o', 'ma', 'se', 'non', 'è', 'ha', 'ho',
  'si', 'che', 'chi', 'cui', 'come', 'quando', 'dove', 'mi',
  'ti', 'ci', 'vi', 'lo', 'la', 'li', 'le', 'ne', 'sono',
  'sei', 'siamo', 'avere', 'essere', 'questo', 'questa',
  'questi', 'queste', 'quello', 'quella', 'quelli', 'quelle',
]);

export interface VectorDocument {
  id: string;
  text: string;
  embedding: number[];
  metadata: {
    source: 'auto' | 'document' | 'note' | 'expense' | 'fitness' | 'recipe' | 'travel' | 'memory' | 'parking' | 'address' | 'manual';
    moduleId?: string;
    updatedAt: number;
    title?: string;
  };
}

export interface VectorDB {
  documents: VectorDocument[];
  vocabulary: string[];
  idfScores: Record<string, number>;
  version: number;
  updatedAt: number;
}

// ---- Tokenizzazione ----

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2 && !STOPWORDS_IT.has(t));
}

// ---- TF-IDF ----

function computeTF(tokens: string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const t of tokens) counts[t] = (counts[t] || 0) + 1;
  const max = Math.max(1, ...Object.values(counts));
  const tf: Record<string, number> = {};
  for (const [t, c] of Object.entries(counts)) tf[t] = c / max;
  return tf;
}

function computeIDF(docs: string[][]): Record<string, number> {
  const n = docs.length;
  const df: Record<string, number> = {};
  for (const tokens of docs) {
    const unique = new Set(tokens);
    for (const t of unique) df[t] = (df[t] || 0) + 1;
  }
  const idf: Record<string, number> = {};
  for (const [t, count] of Object.entries(df)) {
    idf[t] = Math.log((n + 1) / (count + 1)) + 1;
  }
  return idf;
}

function textToEmbedding(text: string, vocabulary: string[], idf: Record<string, number>): number[] {
  const tokens = tokenize(text);
  const tf = computeTF(tokens);
  const vec = vocabulary.map(word => (tf[word] || 0) * (idf[word] || 1));

  // Normalizzazione L2
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
  return norm > 0 ? vec.map(v => v / norm) : vec;
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot; // vettori già normalizzati
}

// ---- Database ----

class RagEngine {
  private db: VectorDB = {
    documents: [],
    vocabulary: [],
    idfScores: {},
    version: 1,
    updatedAt: Date.now(),
  };
  private loaded = false;

  load(): void {
    if (this.loaded) return;
    try {
      if (typeof localStorage !== 'undefined' && localStorage?.getItem) {
        const raw = localStorage.getItem(RAG_DB_KEY);
        if (raw) {
          this.db = JSON.parse(raw);
        }
      }
    } catch {
      this.db = { documents: [], vocabulary: [], idfScores: {}, version: 1, updatedAt: Date.now() };
    }
    this.loaded = true;
  }

  private save(): void {
    try {
      // Mantieni massimo MAX_DOCUMENTS documenti, eliminando i più vecchi
      if (this.db.documents.length > MAX_DOCUMENTS) {
        this.db.documents = this.db.documents
          .sort((a, b) => b.metadata.updatedAt - a.metadata.updatedAt)
          .slice(0, MAX_DOCUMENTS);
      }
      if (typeof localStorage !== 'undefined' && localStorage?.setItem) {
        localStorage.setItem(RAG_DB_KEY, JSON.stringify(this.db));
      }
    } catch (e) {
      console.warn('[RAG] Impossibile salvare il database vettoriale', e);
    }
  }

  private rebuildVocabularyAndIDF(): void {
    const allTokenized = this.db.documents.map(d => tokenize(d.text));
    const allTokens = new Set(allTokenized.flat());
    this.db.vocabulary = Array.from(allTokens).slice(0, 5000); // max 5000 termini
    this.db.idfScores = computeIDF(allTokenized);

    // Ricalcola embedding per tutti i documenti con il nuovo vocabolario
    for (const doc of this.db.documents) {
      doc.embedding = textToEmbedding(doc.text, this.db.vocabulary, this.db.idfScores);
    }
  }

  private listeners: Set<(stats: { docCount: number; vocabSize: number; updatedAt: number }) => void> = new Set();

  subscribe(listener: (stats: { docCount: number; vocabSize: number; updatedAt: number }) => void): () => void {
    this.listeners.add(listener);
    listener(this.getStats());
    return () => this.listeners.delete(listener);
  }

  notifyListeners(): void {
    const stats = this.getStats();
    for (const listener of this.listeners) {
      try {
        listener(stats);
      } catch {}
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('chelona_rag_updated', { detail: stats }));
    }
  }

  getAllDocuments(): VectorDocument[] {
    this.load();
    return this.db.documents;
  }

  /**
   * Aggiunge o aggiorna un documento nel database
   */
  upsert(doc: Omit<VectorDocument, 'embedding'>): void {
    this.load();
    const existing = this.db.documents.findIndex(d => d.id === doc.id);

    const embedding = textToEmbedding(doc.text, this.db.vocabulary, this.db.idfScores);
    const newDoc: VectorDocument = { ...doc, embedding };

    if (existing >= 0) {
      this.db.documents[existing] = newDoc;
    } else {
      this.db.documents.push(newDoc);
    }

    this.rebuildVocabularyAndIDF();
    this.db.updatedAt = Date.now();
    this.save();
    this.notifyListeners();
  }

  /**
   * Indicizza in blocco un array di documenti e ricalcola il vocabolario/IDF
   */
  indexBatch(docs: Omit<VectorDocument, 'embedding'>[]): void {
    this.load();

    // Rimuovi i documenti esistenti con gli stessi ID
    const newIds = new Set(docs.map(d => d.id));
    this.db.documents = this.db.documents.filter(d => !newIds.has(d.id));

    // Aggiungi temporaneamente senza embedding
    const docsWithPlaceholder = docs.map(d => ({ ...d, embedding: [] }));
    this.db.documents.push(...docsWithPlaceholder);

    // Ricalcola vocabolario, IDF e tutti gli embedding
    this.rebuildVocabularyAndIDF();
    this.db.updatedAt = Date.now();
    this.save();
    this.notifyListeners();
  }

  /**
   * Rimozione singolo documento per ID
   */
  removeDocument(id: string): void {
    this.load();
    this.db.documents = this.db.documents.filter(d => d.id !== id);
    this.rebuildVocabularyAndIDF();
    this.db.updatedAt = Date.now();
    this.save();
    this.notifyListeners();
  }

  /**
   * Rimozione per source
   */
  removeBySource(source: VectorDocument['metadata']['source']): void {
    this.load();
    this.db.documents = this.db.documents.filter(d => d.metadata.source !== source);
    this.rebuildVocabularyAndIDF();
    this.db.updatedAt = Date.now();
    this.save();
    this.notifyListeners();
  }

  /**
   * Rimozione per moduleId
   */
  removeByModuleId(moduleId: string): void {
    this.load();
    this.db.documents = this.db.documents.filter(d => d.metadata.moduleId !== moduleId);
    this.rebuildVocabularyAndIDF();
    this.db.updatedAt = Date.now();
    this.save();
    this.notifyListeners();
  }

  /**
   * Recupera i Top-K documenti più simili alla query
   */
  retrieve(query: string, topK = 5, minScore = 0.1): VectorDocument[] {
    this.load();
    if (this.db.documents.length === 0 || this.db.vocabulary.length === 0) return [];

    const queryEmbedding = textToEmbedding(query, this.db.vocabulary, this.db.idfScores);

    const scored = this.db.documents
      .map(doc => ({
        doc,
        score: cosineSimilarity(queryEmbedding, doc.embedding),
      }))
      .filter(({ score }) => score >= minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    return scored.map(({ doc }) => doc);
  }

  /**
   * Formatta i documenti recuperati come stringa di contesto per il prompt
   */
  formatContext(docs: VectorDocument[]): string {
    if (docs.length === 0) return 'Nessun dato specifico disponibile nel database personale.';

    return docs.map((doc, i) => {
      const title = doc.metadata.title ? `[${doc.metadata.title}]` : `[${doc.metadata.source.toUpperCase()}]`;
      return `${i + 1}. ${title}: ${doc.text}`;
    }).join('\n');
  }

  getStats(): { docCount: number; vocabSize: number; updatedAt: number } {
    this.load();
    return {
      docCount: this.db.documents.length,
      vocabSize: this.db.vocabulary.length,
      updatedAt: this.db.updatedAt,
    };
  }

  clear(): void {
    this.db = { documents: [], vocabulary: [], idfScores: {}, version: 1, updatedAt: Date.now() };
    localStorage.removeItem(RAG_DB_KEY);
    this.notifyListeners();
  }
}

export const ragEngine = new RagEngine();

// ---- Indicizzazione automatica dai moduli Chelona ----

import type { Module } from '../types';

export function indexModulesIntoRAG(modules: Module[], username: string): void {
  const docs: Omit<VectorDocument, 'embedding'>[] = [];

  for (const m of modules) {
    if (!m) continue;

    if (m.type === 'auto') {
      const auto = m as any;
      const text = [
        `Veicolo: ${auto.brand || ''} ${auto.model || ''} ${auto.plate ? `(targa: ${auto.plate})` : ''}`,
        auto.fuelType ? `Alimentazione: ${auto.fuelType}` : '',
        auto.currentKm ? `Chilometri attuali: ${auto.currentKm} km` : '',
        auto.lastInsurance ? `Assicurazione scade: ${auto.lastInsurance}` : '',
        auto.lastRevision ? `Revisione scade: ${auto.lastRevision}` : '',
        auto.lastTax ? `Bollo scade: ${auto.lastTax}` : '',
        auto.lastMaintenance ? `Tagliando: ${auto.lastMaintenance}` : '',
        auto.tireChange ? `Cambio gomme: ${auto.tireChange}` : '',
        auto.notes ? `Note veicolo: ${auto.notes}` : '',
      ].filter(Boolean).join('. ');

      docs.push({
        id: `auto_${m.id}`,
        text,
        metadata: { source: 'auto', moduleId: m.id, updatedAt: Date.now(), title: `${auto.brand || ''} ${auto.model || 'Auto'}`.trim() },
      });
    }

    if (m.type === 'document') {
      const doc = m as any;
      const text = [
        `Documento: ${doc.title || doc.documentType}`,
        doc.documentType ? `Tipo: ${doc.documentType}` : '',
        doc.number ? `Numero: ${doc.number}` : '',
        doc.expiryDate ? `Scade: ${doc.expiryDate}` : '',
        doc.issueDate ? `Rilasciato: ${doc.issueDate}` : '',
        doc.issuedBy ? `Rilasciato da: ${doc.issuedBy}` : '',
        doc.notes ? `Note: ${doc.notes}` : '',
      ].filter(Boolean).join('. ');

      docs.push({
        id: `document_${m.id}`,
        text,
        metadata: { source: 'document', moduleId: m.id, updatedAt: Date.now(), title: doc.title || 'Documento' },
      });
    }

    if (m.type === 'single-expense') {
      const exp = m as any;
      const text = [
        `Spesa singola: ${exp.title}`,
        exp.amount !== undefined ? `Importo: € ${exp.amount}` : '',
        exp.category ? `Categoria: ${exp.category}` : '',
        exp.date ? `Data: ${exp.date}` : '',
        exp.paymentMethod ? `Metodo: ${exp.paymentMethod}` : '',
        exp.description ? `Descrizione: ${exp.description}` : '',
      ].filter(Boolean).join('. ');

      docs.push({
        id: `expense_${m.id}`,
        text,
        metadata: { source: 'expense', moduleId: m.id, updatedAt: Date.now(), title: exp.title || 'Spesa' },
      });
    }

    if (m.type === 'split') {
      const split = m as any;
      const members = (split.members || []).map((mb: any) => mb.name || mb).join(', ');
      const expenses = (split.expenses || []).map((e: any) => `${e.description}: €${e.amount} (pagato da ${e.paidBy})`).join('; ');
      const text = [
        `Spesa condivisa / gruppo: ${split.title}`,
        members ? `Partecipanti: ${members}` : '',
        expenses ? `Spese registrate: ${expenses}` : '',
        split.totalAmount ? `Totale gruppo: € ${split.totalAmount}` : '',
      ].filter(Boolean).join('. ');

      docs.push({
        id: `split_${m.id}`,
        text,
        metadata: { source: 'expense', moduleId: m.id, updatedAt: Date.now(), title: split.title || 'Spese condivise' },
      });
    }

    if (m.type === 'installments') {
      const inst = m as any;
      const text = [
        `Finanziamento / Rate: ${inst.title}`,
        inst.totalAmount ? `Totale: € ${inst.totalAmount}` : '',
        inst.monthlyPayment ? `Rata mensile: € ${inst.monthlyPayment}` : '',
        inst.remainingAmount ? `Residuo: € ${inst.remainingAmount}` : '',
        inst.nextDueDate ? `Prossima rata: ${inst.nextDueDate}` : '',
        inst.remainingMonths ? `Rate residue: ${inst.remainingMonths}` : '',
        inst.notes ? `Note: ${inst.notes}` : '',
      ].filter(Boolean).join('. ');

      docs.push({
        id: `installments_${m.id}`,
        text,
        metadata: { source: 'expense', moduleId: m.id, updatedAt: Date.now(), title: inst.title || 'Rata' },
      });
    }

    if (m.type === 'fitness') {
      const fit = m as any;
      const p = fit.fitnessProfile;
      const text = [
        `Fitness e allenamento: ${fit.title}`,
        p?.goal ? `Obiettivo: ${p.goal}` : '',
        p?.weight ? `Peso: ${p.weight} kg` : '',
        p?.height ? `Altezza: ${p.height} cm` : '',
        p?.daysPerWeek ? `Frequenza: ${p.daysPerWeek} giorni a settimana` : '',
        fit.targetCalories ? `Calorie target: ${fit.targetCalories} kcal` : '',
        fit.notes ? `Note: ${fit.notes}` : '',
      ].filter(Boolean).join('. ');

      docs.push({
        id: `fitness_${m.id}`,
        text,
        metadata: { source: 'fitness', moduleId: m.id, updatedAt: Date.now(), title: fit.title || 'Fitness' },
      });
    }

    if ((m as any).type === 'recipes') {
      const rec = m as any;
      const ingList = (rec.ingredients || []).map((i: any) => `${i.name} ${i.quantity || ''} ${i.unit || ''}`.trim()).join(', ');
      const text = [
        `Ricetta: ${rec.title}`,
        rec.category ? `Categoria: ${rec.category}` : '',
        rec.servings ? `Porzioni: ${rec.servings}` : '',
        ingList ? `Ingredienti: ${ingList}` : '',
        rec.instructions ? `Istruzioni: ${rec.instructions.slice(0, 300)}` : '',
      ].filter(Boolean).join('. ');

      docs.push({
        id: `recipe_${(m as any).id}`,
        text,
        metadata: { source: 'recipe', moduleId: (m as any).id, updatedAt: Date.now(), title: rec.title || 'Ricetta' },
      });
    }

    if (m.type === 'travel') {
      const tr = m as any;
      const destNames = (tr.destinations || []).map((d: any) => d.name).join(', ');
      const text = [
        `Viaggio: ${tr.title}`,
        tr.startDate ? `Partenza: ${tr.startDate}` : '',
        tr.endDate ? `Ritorno: ${tr.endDate}` : '',
        destNames ? `Destinazioni: ${destNames}` : '',
        tr.budget ? `Budget: € ${tr.budget}` : '',
        tr.notes ? `Note: ${tr.notes}` : '',
      ].filter(Boolean).join('. ');

      docs.push({
        id: `travel_${m.id}`,
        text,
        metadata: { source: 'travel', moduleId: m.id, updatedAt: Date.now(), title: tr.title || 'Viaggio' },
      });
    }

    if (m.type === 'furniture') {
      const furn = m as any;
      const itemsList = (furn.items || []).map((it: any) => `${it.name} (${it.dimensions || ''} - €${it.price || ''})`).join(', ');
      const text = [
        `Arredamento / Casa: ${furn.title}`,
        furn.room ? `Stanza: ${furn.room}` : '',
        itemsList ? `Mobili: ${itemsList}` : '',
      ].filter(Boolean).join('. ');

      docs.push({
        id: `furniture_${m.id}`,
        text,
        metadata: { source: 'manual', moduleId: m.id, updatedAt: Date.now(), title: furn.title || 'Arredo' },
      });
    }

    if (m.type === 'supermarket') {
      const sm = m as any;
      const itemsList = (sm.items || []).map((it: any) => `${it.name} (${it.quantity || '1'})`).join(', ');
      const text = [
        `Lista Spesa Supermercato: ${sm.title}`,
        sm.supermarketName ? `Negozio: ${sm.supermarketName}` : '',
        itemsList ? `Articoli: ${itemsList}` : '',
      ].filter(Boolean).join('. ');

      docs.push({
        id: `supermarket_${m.id}`,
        text,
        metadata: { source: 'manual', moduleId: m.id, updatedAt: Date.now(), title: sm.title || 'Spesa' },
      });
    }

    if (m.type === 'volantino') {
      const vol = m as any;
      const offersList = (vol.offers || []).slice(0, 8).map((o: any) => `${o.productName} a €${o.price}`).join(', ');
      const text = [
        `Volantino & Offerte: ${vol.title}`,
        vol.storeName ? `Negozio: ${vol.storeName}` : '',
        offersList ? `Offerte salvate: ${offersList}` : '',
      ].filter(Boolean).join('. ');

      docs.push({
        id: `volantino_${m.id}`,
        text,
        metadata: { source: 'manual', moduleId: m.id, updatedAt: Date.now(), title: vol.title || 'Volantino' },
      });
    }

    if (m.type === 'generic') {
      const gen = m as any;
      const content = (gen.content || '').slice(0, 500);
      if (content.length > 3 || gen.title) {
        docs.push({
          id: `generic_${m.id}`,
          text: `Nota / Appunto: ${gen.title || 'Appunto'}. ${content}`,
          metadata: { source: 'note', moduleId: m.id, updatedAt: Date.now(), title: gen.title || 'Nota' },
        });
      }
    }
  }

  // Parcheggio salvato se presente
  try {
    const rawParking = localStorage.getItem('chelona_saved_parking');
    if (rawParking) {
      const p = JSON.parse(rawParking);
      if (p && (p.address || p.latitude)) {
        docs.push({
          id: 'parking_current',
          text: `Parcheggio e posizione auto salvata: ${p.address || ''}, coordinate ${p.latitude}, ${p.longitude}. Registrato il ${new Date(p.timestamp || Date.now()).toLocaleDateString('it-IT')}.`,
          metadata: { source: 'parking', updatedAt: p.timestamp || Date.now(), title: 'Parcheggio Auto' },
        });
      }
    }
  } catch {}

  // Memorie AI apprese salvate
  try {
    const rawMemories = localStorage.getItem('chelona_ai_memories') || localStorage.getItem('chelona_learned_memories');
    if (rawMemories) {
      const memories = JSON.parse(rawMemories);
      if (Array.isArray(memories)) {
        for (const mem of memories) {
          if (!mem || !mem.fact) continue;
          docs.push({
            id: `memory_${mem.id}`,
            text: `Ricordo personale su ${username || 'utente'}: ${mem.key || 'fatto'}. ${mem.fact}${mem.category ? ` (categoria: ${mem.category})` : ''}`,
            metadata: { source: 'memory', updatedAt: new Date(mem.createdAt).getTime() || Date.now(), title: mem.key || 'Memoria' },
          });
        }
      }
    }
  } catch {}

  if (docs.length > 0) {
    ragEngine.indexBatch(docs);
    try {
      import('./localDatabase').then(({ localDb }) => {
        localDb.saveVectorDocuments(ragEngine.getAllDocuments());
      }).catch(() => {});
    } catch {}
  }
}
