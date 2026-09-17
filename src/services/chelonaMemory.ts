/**
 * Chelona Memory Engine
 * Fornisce all'AI locale una memoria continua e dinamica:
 * ogni dato aggiunto o aggiornato (spesa, frigo, note, spese)
 * viene indicizzato e memorizzato in locale per essere richiamato
 * istantaneamente durante le conversazioni.
 */

export interface MemoryEntry {
  id: string;
  category: string;
  content: string;
  timestamp: number;
}

const MEMORIES_KEY = 'chelona_ai_memories';
const MAX_MEMORIES = 40;

export const chelonaMemory = {
  /**
   * Registra un nuovo fatto o modifica appresa dall'app.
   */
  learn(category: string, content: string): void {
    try {
      const raw = localStorage.getItem(MEMORIES_KEY);
      const list: MemoryEntry[] = raw ? JSON.parse(raw) : [];

      // Evita duplicati identici ravvicinati
      const isDuplicate = list.some(
        m => m.category === category && m.content.trim().toLowerCase() === content.trim().toLowerCase()
      );
      if (isDuplicate) return;

      const newEntry: MemoryEntry = {
        id: Math.random().toString(36).substring(2, 9),
        category,
        content: content.trim(),
        timestamp: Date.now(),
      };

      const updated = [newEntry, ...list].slice(0, MAX_MEMORIES);
      localStorage.setItem(MEMORIES_KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event('chelona_memory_updated'));
    } catch (e) {
      console.warn('[ChelonaMemory] Impossibile salvare memoria:', e);
    }
  },

  /**
   * Recupera i ricordi memorizzati.
   */
  getMemories(): MemoryEntry[] {
    try {
      const raw = localStorage.getItem(MEMORIES_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  /**
   * Formatta i ricordi per il prompt del modello linguistico.
   */
  buildMemoryPrompt(): string {
    const memories = this.getMemories();
    if (!memories.length) return '';

    const lines = memories.slice(0, 20).map(m => `- [${m.category.toUpperCase()}]: ${m.content}`);
    return `<MEMORIA_CONTINUA>\n${lines.join('\n')}\n</MEMORIA_CONTINUA>`;
  },

  /**
   * Cancella tutti i ricordi.
   */
  clear(): void {
    localStorage.removeItem(MEMORIES_KEY);
  },
};
