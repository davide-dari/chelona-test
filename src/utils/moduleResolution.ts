import { Module } from '../types';

/**
 * Restituisce la versione più aggiornata di un modulo a partire dall'elenco corrente.
 *
 * Perché serve: i moduli sensibili (`auto`, `document`, ...) vengono scritti nella cache
 * pubblica in forma ridotta (solo id/type/title/posizione) e lo stato completo viene
 * decifrato in `modules` solo dopo lo sblocco del vault, in modo asincrono. Se la
 * schermata di modifica viene aperta nello stesso istante dello sblocco, la copia in
 * `editingXxxModule` è ancora quella ridotta: la sezione risulta vuota alla prima
 * apertura e si popola solo riaprendola. Risolvendo per `id` sull'elenco aggiornato
 * si ottiene sempre il dato completo.
 *
 * Se il modulo non è (ancora) presente nell'elenco, torna la copia passata.
 */
export function resolveLatestModule<T extends Module>(editingModule: T | null, modules: Module[]): T | null {
  if (!editingModule) return null;
  const fresh = modules.find(m => m.id === editingModule.id);
  return (fresh as T) || editingModule;
}
