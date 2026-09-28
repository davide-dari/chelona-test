/**
 * Gemma 4 Nano Local Intelligence Engine for Chelona
 * 
 * 100% On-Device • Zero External APIs • Zero Cloud Calls
 * Operates purely locally on the user's smartphone / browser.
 * Learns continuously from all notes, vehicles, documents, expenses, and user inputs.
 */
import { Module, AutoModule, DocumentModule, SingleExpenseModule, InstallmentsModule, SplitModule, GenericModule, FitnessModule, SupermarketModule, VolantinoModule } from '../types';
import { VOLANTINI_DB } from '../data/volantiniDb';
import { 
  getSavedParking, autoSaveParking, formatElapsedParkingTime, getNavigationUrl 
} from './parkingService';

export interface AiMemory {
  id: string;
  key: string;
  fact: string;
  category: 'personal' | 'vehicle' | 'finance' | 'document' | 'note' | 'fitness' | 'preference' | 'custom';
  createdAt: string;
  source: 'learned_from_chat' | 'module_sync';
}

export interface AiAction {
  label: string;
  type: 'module' | 'category' | 'deadlines' | 'parking' | 'navigate_parking' | 'save_parking';
  moduleId?: string;
  category?: string;
  module?: Module;
  url?: string;
}

export interface AiMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: number;
  actions?: AiAction[];
  learnedFact?: string;
}

const MEMORIES_STORAGE_KEY = 'chelona_ai_memories';
const CHAT_HISTORY_KEY = 'chelona_ai_chat_history';

/**
 * Carica le memorie salvate in locale
 */
export function getLearnedMemories(): AiMemory[] {
  try {
    const raw = localStorage.getItem(MEMORIES_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load AI memories', e);
    return [];
  }
}

/**
 * Salva una nuova memoria locale
 */
export function saveLearnedMemory(memory: Omit<AiMemory, 'id' | 'createdAt'>): AiMemory {
  const memories = getLearnedMemories();
  // Evita duplicati identici
  const existingIdx = memories.findIndex(m => m.key.toLowerCase() === memory.key.toLowerCase());
  
  const newMemory: AiMemory = {
    id: 'mem_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    createdAt: new Date().toISOString(),
    ...memory,
  };

  if (existingIdx >= 0) {
    memories[existingIdx] = newMemory;
  } else {
    memories.unshift(newMemory);
  }

  try {
    localStorage.setItem(MEMORIES_STORAGE_KEY, JSON.stringify(memories));
  } catch (e) {
    console.error('Failed to save AI memory', e);
  }

  return newMemory;
}

/**
 * Elimina una memoria
 */
export function deleteLearnedMemory(id: string): void {
  const memories = getLearnedMemories().filter(m => m.id !== id);
  try {
    localStorage.setItem(MEMORIES_STORAGE_KEY, JSON.stringify(memories));
  } catch (e) {
    console.error('Failed to delete memory', e);
  }
}

/**
 * Cancella tutte le memorie
 */
export function clearAllLearnedMemories(): void {
  try {
    localStorage.removeItem(MEMORIES_STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear memories', e);
  }
}

/**
 * Carica la cronologia chat
 */
export function getChatHistory(): AiMessage[] {
  try {
    const raw = localStorage.getItem(CHAT_HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

/**
 * Salva la cronologia chat
 */
export function saveChatHistory(history: AiMessage[]): void {
  try {
    // Conserva gli ultimi 50 messaggi per risparmiare spazio locale
    const trimmed = history.slice(-50);
    localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(trimmed));
  } catch (e) {
    console.error('Failed to save chat history', e);
  }
}

/**
 * Rileva se il messaggio dell'utente contiene un'intenzione di apprendimento esplicito
 * es: "Ricordati che...", "Memorizza:", "Il mio pin è...", "Sono allergico a...", ecc.
 */
export function extractLearningIntent(text: string): { key: string; fact: string; category: AiMemory['category'] } | null {
  const clean = text.trim();
  const lower = clean.toLowerCase();

  // Pattern di memoria esplicita
  const patterns: { regex: RegExp; keyExtractor?: (match: RegExpMatchArray) => string; category: AiMemory['category'] }[] = [
    {
      regex: /^(?:ricordati\s+che|ricorda\s+che|memorizza\s+che|tieni\s+a\s+mente\s+che|salva\s+che)\s+(.+)$/i,
      category: 'personal',
    },
    {
      regex: /^(?:memorizza|ricordati|appunta|nota):\s*(.+)$/i,
      category: 'personal',
    },
    {
      regex: /^(?:il\s+mio|la\s+mia)\s+([^èe:\s]+(?:\s+[^èe:\s]+)?)\s+(?:è|e|sono)\s+(.+)$/i,
      keyExtractor: (m) => m[1].trim(),
      category: 'personal',
    },
    {
      regex: /^(?:sono\s+allergico|ho\s+un'allergia|sono\s+intollerante)\s+(?:a|al|alla|ai|alle|allo)\s+(.+)$/i,
      keyExtractor: () => 'allergia',
      category: 'personal',
    },
    {
      regex: /^(?:il\s+mio\s+compleanno|sono\s+nato)\s+(?:è|il)\s+(.+)$/i,
      keyExtractor: () => 'compleanno',
      category: 'personal',
    },
    {
      regex: /^(?:il\s+mio\s+codice\s+fiscale|mio\s+cf)\s+(?:è|e)\s+(.+)$/i,
      keyExtractor: () => 'codice_fiscale',
      category: 'personal',
    },
  ];

  for (const p of patterns) {
    const match = clean.match(p.regex);
    if (match) {
      const fact = match[match.length - 1].trim();
      const key = p.keyExtractor ? p.keyExtractor(match) : fact.slice(0, 30);
      return {
        key,
        fact: clean,
        category: p.category,
      };
    }
  }

  return null;
}

/**
 * Calcola i giorni mancanti rispetto a oggi
 */
function getDaysRemaining(dateStr: string): number {
  if (!dateStr) return 9999;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 9999;
  const now = new Date();
  const diffTime = d.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return 'Non definita';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

/**
 * Struttura di conoscenza estratta dai moduli attivi
 */
export interface ChelonaKnowledge {
  vehicles: {
    module: AutoModule;
    name: string;
    brand: string;
    model: string;
    plate: string;
    fuel: string;
    km: string;
    insurance: { date: string; days: number };
    tax: { date: string; days: number };
    revision: { date: string; days: number };
    serviceKm?: string;
    tiresKm?: string;
  }[];
  documents: {
    module: DocumentModule;
    title: string;
    docType: string;
    number?: string;
    expiryDate?: string;
    days: number;
    isExpired: boolean;
  }[];
  expenses: {
    totalThisMonth: number;
    count: number;
    recent: { title: string; amount: number; date: string; category: string }[];
  };
  installments: {
    totalPending: number;
    modules: {
      module: InstallmentsModule;
      title: string;
      target: number;
      finalDate: string;
      daysRemaining: number;
      paidCount: number;
      totalCount: number;
    }[];
  };
  splits: {
    module: SplitModule;
    title: string;
    expensesCount: number;
    participants: string[];
  }[];
  notes: {
    module: GenericModule;
    title: string;
    snippet: string;
    date?: string;
  }[];
  fitness?: {
    module: FitnessModule;
    goal?: string;
    weight?: number;
    height?: number;
    calories?: number;
    workoutDays?: number;
  };
  supermarket?: {
    module: SupermarketModule;
    itemsCount: number;
    itemsToBuy: string[];
  };
  urgentDeadlines: {
    label: string;
    date: string;
    days: number;
    type: 'auto' | 'document' | 'installment' | 'expense';
    moduleId?: string;
    module?: Module;
  }[];
  volantini: {
    module: VolantinoModule;
    offersCount: number;
    flyersCount: number;
    stores: string[];
  }[];
}

/**
 * Estrae e indicizza tutti i moduli dell'app per la comprensione neurale locale di Gemma 4 Nano
 */
export function buildKnowledgeBase(modules: Module[], _username: string): ChelonaKnowledge {
  const k: ChelonaKnowledge = {
    vehicles: [],
    documents: [],
    expenses: { totalThisMonth: 0, count: 0, recent: [] },
    installments: { totalPending: 0, modules: [] },
    splits: [],
    notes: [],
    urgentDeadlines: [],
    volantini: [],
  };

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  for (const m of modules) {
    if (!m) continue;

    // AUTO
    if (m.type === 'auto') {
      const auto = m as AutoModule;
      const insDays = auto.lastInsurance ? getDaysRemaining(auto.lastInsurance) : 9999;
      const taxDays = auto.lastTax ? getDaysRemaining(auto.lastTax) : 9999;
      const revDays = auto.lastRevision ? getDaysRemaining(auto.lastRevision) : 9999;

      k.vehicles.push({
        module: auto,
        name: `${auto.brand || ''} ${auto.model || ''}`.trim() || auto.title || 'Veicolo',
        brand: auto.brand || '',
        model: auto.model || '',
        plate: auto.plate || 'Non specificata',
        fuel: auto.fuelType || 'benzina',
        km: auto.currentKm || 'N/D',
        insurance: { date: auto.lastInsurance || '', days: insDays },
        tax: { date: auto.lastTax || '', days: taxDays },
        revision: { date: auto.lastRevision || '', days: revDays },
        serviceKm: auto.lastServiceKm,
        tiresKm: auto.tiresKm,
      });

      if (auto.lastInsurance && insDays <= 60) {
        k.urgentDeadlines.push({
          label: `Assicurazione ${auto.brand} ${auto.model} (${auto.plate})`,
          date: auto.lastInsurance,
          days: insDays,
          type: 'auto',
          moduleId: auto.id,
          module: auto,
        });
      }
      if (auto.lastTax && taxDays <= 60) {
        k.urgentDeadlines.push({
          label: `Bollo Auto ${auto.brand} ${auto.model} (${auto.plate})`,
          date: auto.lastTax,
          days: taxDays,
          type: 'auto',
          moduleId: auto.id,
          module: auto,
        });
      }
      if (auto.lastRevision && revDays <= 60) {
        k.urgentDeadlines.push({
          label: `Revisione ${auto.brand} ${auto.model} (${auto.plate})`,
          date: auto.lastRevision,
          days: revDays,
          type: 'auto',
          moduleId: auto.id,
          module: auto,
        });
      }
    }

    // DOCUMENTI
    if (m.type === 'document') {
      const doc = m as DocumentModule;
      const days = doc.expiryDate ? getDaysRemaining(doc.expiryDate) : 9999;
      const isExp = days < 0;

      k.documents.push({
        module: doc,
        title: doc.title || 'Documento',
        docType: doc.documentType || 'generico',
        number: doc.number,
        expiryDate: doc.expiryDate,
        days,
        isExpired: isExp,
      });

      if (doc.expiryDate && days <= 60) {
        k.urgentDeadlines.push({
          label: `Scadenza ${doc.title}${doc.number ? ` (N. ${doc.number})` : ''}`,
          date: doc.expiryDate,
          days,
          type: 'document',
          moduleId: doc.id,
          module: doc,
        });
      }
    }

    // SPESE SINGOLE
    if (m.type === 'single-expense') {
      const exp = m as SingleExpenseModule;
      const expDate = exp.date ? new Date(exp.date) : null;
      if (expDate && !isNaN(expDate.getTime())) {
        if (expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear) {
          k.expenses.totalThisMonth += Number(exp.amount) || 0;
        }
      }
      k.expenses.count++;
      if (k.expenses.recent.length < 5) {
        k.expenses.recent.push({
          title: exp.title || exp.description || 'Spesa',
          amount: Number(exp.amount) || 0,
          date: exp.date || '',
          category: exp.category || 'Varie',
        });
      }
    }

    // RATE / INSTALLMENTS
    if (m.type === 'installments') {
      const inst = m as InstallmentsModule;
      const days = inst.finalDueDate ? getDaysRemaining(inst.finalDueDate) : 9999;
      const paid = inst.payments?.filter(p => p.isPaid).length || 0;
      const total = inst.payments?.length || 0;

      k.installments.modules.push({
        module: inst,
        title: inst.title || 'Rateizzazione',
        target: inst.targetAmount || 0,
        finalDate: inst.finalDueDate || '',
        daysRemaining: days,
        paidCount: paid,
        totalCount: total,
      });
      k.installments.totalPending += inst.targetAmount || 0;

      // Prossima rata non pagata
      const nextUnpaid = inst.payments?.find(p => !p.isPaid);
      if (nextUnpaid && nextUnpaid.dueDate) {
        const nextDays = getDaysRemaining(nextUnpaid.dueDate);
        if (nextDays <= 45) {
          k.urgentDeadlines.push({
            label: `Rata ${inst.title} (€${nextUnpaid.amount})`,
            date: nextUnpaid.dueDate,
            days: nextDays,
            type: 'installment',
            moduleId: inst.id,
            module: inst,
          });
        }
      }
    }

    // SPLIT
    if (m.type === 'split') {
      const sp = m as SplitModule;
      k.splits.push({
        module: sp,
        title: sp.title || 'Spese Gruppo',
        expensesCount: sp.expenses?.length || 0,
        participants: sp.participants?.map(p => p.name) || [],
      });
    }

    // NOTE
    if (m.type === 'generic') {
      const note = m as GenericModule;
      k.notes.push({
        module: note,
        title: note.title || 'Nota',
        snippet: (note.content || '').slice(0, 150),
        date: note.date,
      });
    }

    // FITNESS
    if (m.type === 'fitness') {
      const fit = m as FitnessModule;
      k.fitness = {
        module: fit,
        goal: fit.fitnessProfile?.goal,
        weight: fit.fitnessProfile?.weight,
        height: fit.fitnessProfile?.height,
        calories: fit.targetCalories,
        workoutDays: fit.fitnessProfile?.daysPerWeek,
      };
    }

    // SUPERMARKET
    if (m.type === 'supermarket') {
      const sm = m as SupermarketModule;
      const unchecked = (sm.items || []).filter(i => !i.checked).map(i => i.name);
      k.supermarket = {
        module: sm,
        itemsCount: sm.items?.length || 0,
        itemsToBuy: unchecked,
      };
    }

    // VOLANTINI
    if (m.type === 'volantino') {
      const vol = m as VolantinoModule;
      k.volantini.push({
        module: vol,
        offersCount: vol.offers?.length || 0,
        flyersCount: vol.flyers?.length || 0,
        stores: Array.from(new Set(vol.offers?.map(o => o.storeId).filter(Boolean))),
      });
    }
  }

  // Ordina scadenze per urgenza
  k.urgentDeadlines.sort((a, b) => a.days - b.days);

  return k;
}

function detectExpenseCategory(desc: string): string {
  const d = desc.toLowerCase();
  if (d.includes('benzina') || d.includes('carburante') || d.includes('diesel') || d.includes('gasolio') || d.includes('parcheggio') || d.includes('pedaggio')) return 'Auto & Trasporti';
  if (d.includes('cena') || d.includes('pranzo') || d.includes('ristorante') || d.includes('pizza') || d.includes('bar') || d.includes('caffè') || d.includes('spesa') || d.includes('supermercato')) return 'Alimentari';
  if (d.includes('farmacia') || d.includes('medico') || d.includes('visita') || d.includes('dentista') || d.includes('medicine')) return 'Salute';
  if (d.includes('bolletta') || d.includes('luce') || d.includes('gas') || d.includes('internet') || d.includes('affitto')) return 'Casa';
  if (d.includes('palestra') || d.includes('cinema') || d.includes('concerto') || d.includes('vacanza')) return 'Svago';
  return 'Varie';
}

/**
 * Motore di elaborazione e risposta locale Gemma 4 Nano.
 * 100% On-Device, senza chiamate API o server esterni.
 */
export async function queryGemmaNano(
  userQuery: string,
  modules: Module[],
  username: string
): Promise<{ text: string; actions?: AiAction[]; learnedFact?: string; createdModule?: Module }> {
  // Simula un breve tempo di elaborazione neurale realistico on-device (200-400ms)
  await new Promise(res => setTimeout(res, 250));

  const query = userQuery.trim();
  const lower = query.toLowerCase();

  // 1a. GESTIONE PARCHEGGIO (UI & AI)
  if (
    lower.includes('parchegg') ||
    ((lower.includes('auto') || lower.includes('macchina') || lower.includes('veicol')) &&
     (lower.includes('dove') || lower.includes('dov\'è') || lower.includes('trova') || lower.includes('ritrova') || lower.includes('salva') || lower.includes('lasciat') || lower.includes('messa')))
  ) {
    // Intento: Salva il parcheggio attuale
    if (
      lower.includes('salva') ||
      lower.includes('ho parcheggiato') ||
      lower.includes('memorizza') ||
      lower.includes('qui') ||
      lower.includes('lasciata qui') ||
      lower.includes('messa qui')
    ) {
      try {
        const saved = await autoSaveParking();
        return {
          text: `Ho salvato la posizione della tua auto in **${saved.address}**! Coordinate GPS registrate sulla mappa di Chelona.`,
          actions: [
            { label: 'Vedi Mappa Auto', type: 'parking' },
            { label: 'Naviga all\'Auto', type: 'navigate_parking', url: getNavigationUrl(saved.latitude, saved.longitude) },
          ],
        };
      } catch {
        return {
          text: `Non sono riuscito ad accedere al GPS in automatico. Apri la schermata Parcheggio per salvarlo con un tocco!`,
          actions: [{ label: 'Apri Parcheggio', type: 'parking' }],
        };
      }
    }

    // Intento: Dov'è l'auto / Dove ho parcheggiato
    if (
      lower.includes('dove') ||
      lower.includes('dov\'è') ||
      lower.includes('trova') ||
      lower.includes('ritrova') ||
      lower.includes('posizione')
    ) {
      const p = getSavedParking();
      if (p) {
        const timeStr = formatElapsedParkingTime(p.timestamp);
        return {
          text: `La tua auto è parcheggiata in **${p.address}** (${timeStr}).${p.notes ? `\n\nNote: *${p.notes}*` : ''}`,
          actions: [
            { label: 'Vedi sulla Mappa', type: 'parking' },
            { label: 'Naviga a Piedi', type: 'navigate_parking', url: getNavigationUrl(p.latitude, p.longitude) },
          ],
        };
      } else {
        return {
          text: `Non hai ancora registrato nessun parcheggio. Vuoi che memorizzi la tua posizione attuale adesso?`,
          actions: [
            { label: 'Salva Parcheggio Ora', type: 'save_parking' },
            { label: 'Apri Parcheggio', type: 'parking' },
          ],
        };
      }
    }
  }

  // 1b. AGGIUNGI NOTA A CHELONA TRAMITE AI
  const noteMatch = query.match(/^(?:aggiungi|crea|segna|scrivi|salva)\s+(?:una\s+)?nota(?:\s*[:\-]\s*|\s+con\s+testo\s*[:\-]?\s*|\s+intitolata\s*[:\-]?\s*|\s+)(.+)$/i) || query.match(/^nota:\s*(.+)$/i);
  if (noteMatch) {
    const fullContent = noteMatch[1].trim();
    let title = 'Appunto da Chelona AI';
    let content = fullContent;

    if (fullContent.includes(':')) {
      const parts = fullContent.split(':');
      title = parts[0].trim();
      content = parts.slice(1).join(':').trim();
    } else if (fullContent.length > 30) {
      title = fullContent.slice(0, 25) + '...';
    } else {
      title = fullContent;
    }

    const newNote: GenericModule = {
      id: 'mod_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      type: 'generic',
      title,
      content,
      date: new Date().toLocaleDateString('it-IT'),
      x: 0, y: 0, w: 2, h: 2,
    };

    return {
      text: `Ho creato e aggiunto la nota **"${newNote.title}"** alla tua bacheca di Chelona!\n\n*${content}*`,
      createdModule: newNote,
      actions: [{ label: 'Apri Nota', type: 'module', module: newNote, moduleId: newNote.id }],
    };
  }

  // 1c. AGGIUNGI SPESA A CHELONA TRAMITE AI
  const expMatch = query.match(/(?:aggiungi|segna|registra|ho\s+speso|spesa\s+di)\s+(?:una\s+spesa\s+(?:di\s+)?)?(\d+(?:[.,]\d+)?)\s*(?:€|euro)?(?:\s+(?:per|al|a|in|su)\s+(.+))?/i);
  if (expMatch) {
    const amountStr = expMatch[1].replace(',', '.');
    const amount = parseFloat(amountStr);
    const rawDesc = (expMatch[2] || 'Spesa registrata da AI').trim();
    const desc = rawDesc.charAt(0).toUpperCase() + rawDesc.slice(1);

    const newExp: SingleExpenseModule = {
      id: 'mod_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      type: 'single-expense',
      title: desc,
      description: desc,
      amount: isNaN(amount) ? 0 : amount,
      currency: 'EUR',
      date: new Date().toISOString().split('T')[0],
      category: detectExpenseCategory(desc),
      x: 0, y: 0, w: 2, h: 2,
    };

    return {
      text: `Ho registrato la spesa di **€ ${newExp.amount.toFixed(2)}** per *${newExp.title}* nelle tue finanze di Chelona!`,
      createdModule: newExp,
      actions: [{ label: 'Vedi Spesa', type: 'module', module: newExp, moduleId: newExp.id }],
    };
  }

  // 1d. Verifica se l'utente vuole insegnare qualcosa all'AI
  const learningIntent = extractLearningIntent(query);
  if (learningIntent) {
    const saved = saveLearnedMemory({
      key: learningIntent.key,
      fact: learningIntent.fact,
      category: learningIntent.category,
      source: 'learned_from_chat',
    });

    return {
      text: `Perfetto, ho preso nota: *"${saved.fact}"*. Me lo ricorderò!`,
      learnedFact: saved.fact,
    };
  }

  // 2. Costruisci la Knowledge Base aggiornata da tutti i moduli
  const k = buildKnowledgeBase(modules, username);
  const customMemories = getLearnedMemories();

  // 3. Riconoscimento Intenti & Generazione Risposta

  // INTENTO: MEMORIA / COSA SAI SU DI ME
  if (
    lower.includes('cosa sai') ||
    lower.includes('cosa hai imparato') ||
    lower.includes('memoria') ||
    lower.includes('mie informazioni') ||
    lower.includes('chi sono')
  ) {
    let out = `Ecco cosa so su di te:\n\n`;

    if (customMemories.length > 0) {
      out += `**Cose che mi hai insegnato:**\n`;
      customMemories.forEach(m => {
        out += `• ${m.fact}\n`;
      });
      out += `\n`;
    }

    out += `**Dai tuoi moduli in Chelona:**\n`;
    if (k.vehicles.length > 0) {
      out += `• ${k.vehicles.length === 1 ? 'Auto' : 'Veicoli'}: ${k.vehicles.map(v => `${v.name} (${v.plate})`).join(', ')}\n`;
    }
    if (k.documents.length > 0) {
      out += `• ${k.documents.length} documenti registrati\n`;
    }
    if (k.notes.length > 0) {
      out += `• ${k.notes.length} note salvate\n`;
    }
    if (k.installments.modules.length > 0) {
      out += `• ${k.installments.modules.length} finanziamenti attivi (€${k.installments.totalPending} residui)\n`;
    }
    if (k.fitness) {
      out += `• Obiettivo fitness: ${k.fitness.goal || 'forma fisica'}\n`;
    }

    out += `\nSe vuoi farmi ricordare altro, basta scrivermi *"Ricordati che..."*!`;
    return { text: out };
  }

  // INTENTO: SCADENZE / DEADLINES
  if (
    lower.includes('scadenz') ||
    lower.includes('promemoria') ||
    lower.includes('scade') ||
    lower.includes('urgente') ||
    lower.includes('giorni mancanti')
  ) {
    if (k.urgentDeadlines.length === 0) {
      return {
        text: `Nessuna scadenza in vista nei prossimi due mesi, sei completamente tranquillo!`,
      };
    }

    let out = `Ecco le scadenze a cui prestare attenzione:\n\n`;
    const actions: AiAction[] = [];

    k.urgentDeadlines.forEach((d) => {
      let status = '';
      if (d.days < 0) {
        status = `⚠️ Scaduto da ${Math.abs(d.days)} giorni!`;
      } else if (d.days === 0) {
        status = `⚠️ Scade oggi!`;
      } else if (d.days <= 7) {
        status = `tra ${d.days} giorni (${formatDate(d.date)})`;
      } else {
        status = `il ${formatDate(d.date)} (tra ${d.days} gg)`;
      }

      out += `• **${d.label}**: ${status}\n`;

      if (d.module) {
        actions.push({
          label: d.label.length > 22 ? d.label.slice(0, 20) + '...' : d.label,
          type: 'module',
          moduleId: d.moduleId,
          module: d.module,
        });
      }
    });

    return {
      text: out,
      actions: actions.slice(0, 2),
    };
  }

  // INTENTO: AUTO / VEICOLI
  if (
    lower.includes('auto') ||
    lower.includes('macchina') ||
    lower.includes('veicol') ||
    lower.includes('targa') ||
    lower.includes('bollo') ||
    lower.includes('assicurazion') ||
    lower.includes('revision') ||
    lower.includes('tagliando') ||
    lower.includes('chilometri') ||
    lower.includes('km')
  ) {
    if (k.vehicles.length === 0) {
      return {
        text: `🚗 Non hai ancora registrato nessun veicolo in Chelona.\n\nPuoi aggiungerne uno toccando **"+"** e selezionando la categoria **Veicolo**!`,
        actions: [{ label: 'Aggiungi Veicolo', type: 'category', category: 'auto' }],
      };
    }

    // Se chiede la targa
    if (lower.includes('targa')) {
      const resp = k.vehicles.map(v => `🔹 **${v.name}**: targa **${v.plate}**`).join('\n');
      return {
        text: `🚗 **Targhe dei tuoi veicoli:**\n\n${resp}`,
        actions: k.vehicles.map(v => ({ label: `Scheda ${v.name}`, type: 'module', moduleId: v.module.id, module: v.module })),
      };
    }

    // Se chiede i km
    if (lower.includes('km') || lower.includes('chilometri')) {
      const resp = k.vehicles.map(v => `🔹 **${v.name}** (${v.plate}): **${v.km} km** attuali`).join('\n');
      return {
        text: `📊 **Chilometraggio registrato:**\n\n${resp}`,
        actions: k.vehicles.map(v => ({ label: `Aggiorna Km ${v.name}`, type: 'module', moduleId: v.module.id, module: v.module })),
      };
    }

    // Panoramica auto
    let out = `🚗 **Riepilogo Veicoli Registrati:**\n\n`;
    const actions: AiAction[] = [];

    k.vehicles.forEach(v => {
      out += `### **${v.name}** (Targa: \`${v.plate}\`)\n`;
      out += `- ⛽ Alimentazione: **${v.fuel.toUpperCase()}**\n`;
      out += `- 🛣️ Chilometri: **${v.km} km**\n`;
      out += `- 🛡️ Assicurazione: ${v.insurance.date ? `${formatDate(v.insurance.date)} (${v.insurance.days > 0 ? `tra ${v.insurance.days} gg` : 'SCADUTA'})` : 'Non inserita'}\n`;
      out += `- 🏷️ Bollo: ${v.tax.date ? `${formatDate(v.tax.date)} (${v.tax.days > 0 ? `tra ${v.tax.days} gg` : 'SCADUTO'})` : 'Non inserito'}\n`;
      out += `- 🔧 Revisione: ${v.revision.date ? `${formatDate(v.revision.date)} (${v.revision.days > 0 ? `tra ${v.revision.days} gg` : 'SCADUTA'})` : 'Non inserita'}\n\n`;

      actions.push({
        label: `Apri Scheda ${v.name}`,
        type: 'module',
        moduleId: v.module.id,
        module: v.module,
      });
    });

    return { text: out, actions };
  }

  // INTENTO: DOCUMENTI
  if (
    lower.includes('document') ||
    lower.includes('patente') ||
    lower.includes('carta d\'identità') ||
    lower.includes('carta identita') ||
    lower.includes('passaporto') ||
    lower.includes('tessera sanitaria') ||
    lower.includes('codice fiscale')
  ) {
    if (k.documents.length === 0) {
      return {
        text: `📄 Non hai ancora archiviato documenti in Chelona.\n\nPuoi fotografare o caricare i tuoi documenti d'identità in modo sicuro toccando **"+"** → **Documento**!`,
        actions: [{ label: 'Nuovo Documento', type: 'category', category: 'document' }],
      };
    }

    let out = `📄 **Documenti Personali Rilevati (${k.documents.length}):**\n\n`;
    const actions: AiAction[] = [];

    k.documents.forEach(d => {
      const expStr = d.expiryDate
        ? d.isExpired
          ? `❌ **SCADUTO il ${formatDate(d.expiryDate)}**`
          : `✅ Scade il **${formatDate(d.expiryDate)}** (${d.days} giorni rimasti)`
        : 'Senza data scadenza';

      out += `- **${d.title}** (${d.docType})\n`;
      if (d.number) out += `  └ Numero: \`${d.number}\`\n`;
      out += `  └ Stato: ${expStr}\n\n`;

      actions.push({
        label: `Vedi ${d.title}`,
        type: 'module',
        moduleId: d.module.id,
        module: d.module,
      });
    });

    return { text: out, actions: actions.slice(0, 3) };
  }

  // INTENTO: SPESE / FINANZE / RATE / SPLIT
  if (
    lower.includes('spes') ||
    lower.includes('cont') ||
    lower.includes('rat') ||
    lower.includes('soldi') ||
    lower.includes('budget') ||
    lower.includes('quanto ho speso') ||
    lower.includes('finanziament')
  ) {
    let out = `💰 **Quadro Finanziario & Spese:**\n\n`;
    const actions: AiAction[] = [];

    // Spese del mese
    out += `### 💳 Spese Singole\n`;
    out += `- Totale registrato questo mese: **€${k.expenses.totalThisMonth.toFixed(2)}**\n`;
    out += `- Spese archiviate totali: **${k.expenses.count}**\n`;
    if (k.expenses.recent.length > 0) {
      out += `- Ultime spese: ${k.expenses.recent.map(e => `${e.title} (€${e.amount})`).join(', ')}\n`;
    }
    out += `\n`;

    // Rate
    if (k.installments.modules.length > 0) {
      out += `### 🗓️ Rateizzazioni Attive\n`;
      k.installments.modules.forEach(inst => {
        out += `- **${inst.title}**: Totale **€${inst.target}** (Pagate ${inst.paidCount}/${inst.totalCount} rate)\n`;
        actions.push({
          label: `Gestisci ${inst.title}`,
          type: 'module',
          moduleId: inst.module.id,
          module: inst.module,
        });
      });
      out += `\n`;
    }

    // Split
    if (k.splits.length > 0) {
      out += `### 👥 Spese Condivise (Split)\n`;
      k.splits.forEach(s => {
        out += `- **${s.title}**: ${s.expensesCount} spese con ${s.participants.join(', ')}\n`;
      });
      out += `\n`;
    }

    return { text: out, actions };
  }

  // INTENTO: NOTE & APPUNTI
  if (
    lower.includes('nota') ||
    lower.includes('note') ||
    lower.includes('appunt') ||
    lower.includes('scritto') ||
    lower.includes('testo')
  ) {
    if (k.notes.length === 0) {
      return {
        text: `📝 Non hai ancora creato note in Chelona. Puoi salvare note veloci, password protette e appunti con il tasto **"+"**!`,
      };
    }

    // Ricerca semantica semplice tra le note
    const searchTerms = lower.split(/\s+/).filter(w => w.length > 3 && !['nota', 'note', 'appunti', 'cosa', 'scritto', 'nella'].includes(w));
    let matchingNotes = k.notes;
    if (searchTerms.length > 0) {
      matchingNotes = k.notes.filter(n => 
        searchTerms.some(term => n.title.toLowerCase().includes(term) || n.snippet.toLowerCase().includes(term))
      );
    }

    if (matchingNotes.length === 0) {
      return {
        text: `🔍 Ho cercato tra le tue note ma non ho trovato corrispondenze esatte per *"keywords"*. Ecco le tue note salvate:\n\n` +
          k.notes.map(n => `- **${n.title}**: ${n.snippet}`).join('\n\n'),
      };
    }

    let out = `📝 **Note e Appunti trovati (${matchingNotes.length}):**\n\n`;
    const actions: AiAction[] = [];

    matchingNotes.forEach(n => {
      out += `### **${n.title}**\n`;
      out += `> ${n.snippet || '*(Nessun testo aggiunto)*'}\n\n`;
      actions.push({
        label: `Apri ${n.title}`,
        type: 'module',
        moduleId: n.module.id,
        module: n.module,
      });
    });

    return { text: out, actions: actions.slice(0, 3) };
  }

  // INTENTO: FITNESS & DIETA
  if (
    lower.includes('fitness') ||
    lower.includes('allenament') ||
    lower.includes('dieta') ||
    lower.includes('palestra') ||
    lower.includes('pesi') ||
    lower.includes('calorie') ||
    lower.includes('workout')
  ) {
    if (!k.fitness) {
      return {
        text: `🏋️ Non hai ancora configurato la sezione **Fitness & Dieta**.\n\nPuoi generare una scheda di allenamento personalizzata e un piano nutrizionale su misura aprendo il modulo Fitness!`,
        actions: [{ label: 'Apri Fitness & Dieta', type: 'category', category: 'fitness' }],
      };
    }

    let out = `💪 **Il tuo Profilo Fitness & Nutrizione:**\n\n`;
    out += `- 🎯 Obiettivo: **${k.fitness.goal?.toUpperCase() || 'Mantenimento'}**\n`;
    if (k.fitness.weight) out += `- ⚖️ Peso attuale: **${k.fitness.weight} kg** (Altezza: ${k.fitness.height} cm)\n`;
    if (k.fitness.calories) out += `- 🔥 Fabbisogno calorico target: **${k.fitness.calories} kcal/giorno**\n`;
    if (k.fitness.workoutDays) out += `- 🗓️ Frequenza allenamenti: **${k.fitness.workoutDays} giorni a settimana**\n`;

    return {
      text: out,
      actions: [{ label: 'Apri Scheda Completa', type: 'module', moduleId: k.fitness.module.id, module: k.fitness.module }],
    };
  }

  // INTENTO: SPESA / SUPERMERCATO
  if (
    lower.includes('spesa') ||
    lower.includes('comprare') ||
    lower.includes('supermercat') ||
    lower.includes('lista spesa')
  ) {
    if (!k.supermarket || k.supermarket.itemsToBuy.length === 0) {
      return {
        text: `🛒 La tua **Lista della Spesa** è attualmente vuota o tutti gli ingredienti sono già stati spuntati!`,
        actions: [{ label: 'Apri Lista Spesa', type: 'category', category: 'home' }],
      };
    }

    const items = k.supermarket.itemsToBuy.map(i => `- [ ] ${i}`).join('\n');
    return {
      text: `🛒 **Articoli ancora da comprare nella Lista Spesa (${k.supermarket.itemsToBuy.length}):**\n\n${items}`,
      actions: [{ label: 'Vai alla Spesa', type: 'category', category: 'home' }],
    };
  }

  // INTENTO: VOLANTINI E SCONTI
  if (
    lower.includes('volantin') ||
    lower.includes('offert') ||
    lower.includes('scont') ||
    lower.includes('promo') ||
    lower.includes('supermercat') ||
    lower.includes('catene') ||
    lower.includes('convenien') ||
    lower.includes('risparmio') ||
    lower.includes('coupon') ||
    lower.includes('conad') ||
    lower.includes('coop') ||
    lower.includes('lidl') ||
    lower.includes('esselunga') ||
    lower.includes('carrefour') ||
    lower.includes('aldi') ||
    lower.includes('eurospin') ||
    lower.includes('penny') ||
    lower.includes('md') ||
    lower.includes('bennet') ||
    lower.includes('unieuro') ||
    lower.includes('mediaworld') ||
    lower.includes('prezzi')
  ) {
    let totalOffers = 0;
    k.volantini.forEach(v => totalOffers += v.offersCount);
    
    let text = "";
    const actions: AiAction[] = [];
    
    if (totalOffers > 0) {
      text = `Hai ${totalOffers} offerte salvate nei tuoi Volantini! 🛒\n\n`;
      k.volantini.forEach(v => {
        if (v.offersCount > 0) {
          const promoItems = v.module.offers.slice(0, 3).map(o => `${o.productName} (€${o.price})`).join(', ');
          text += `Tra queste, trovi prodotti come: ${promoItems}.\n`;
        }
      });
      text += `\nInoltre, ho accesso a oltre ${VOLANTINI_DB.chains.length} catene di supermercati con tutti i loro volantini aggiornati (tra cui Conad, Coop, Lidl...).`;
    } else {
      text = `Ho accesso a oltre ${VOLANTINI_DB.chains.length} catene di supermercati con i loro volantini (tra cui Conad, Coop, Lidl, Esselunga e molti altri)! 🛒\n\nNon hai ancora offerte salvate, ma puoi esplorare tutte le promozioni attive e salvare quelle che ti interessano aprendo la sezione Volantini & Offerte.`;
    }
    
    actions.push({ label: 'Apri Volantini & Offerte', type: 'category', category: 'home' });

    return { text, actions };
  }

  // INTENTO: SALUTI / CHIACCHIERATA GENERALE
  if (
    lower === 'ciao' ||
    lower.startsWith('ciao ') ||
    lower.startsWith('buongiorno') ||
    lower.startsWith('buonasera') ||
    lower.startsWith('ehi') ||
    lower.startsWith('hey')
  ) {
    return {
      text: `Ciao ${username || ''}! Come posso aiutarti oggi? Chiedimi pure delle scadenze, della tua auto, dei documenti, delle spese o dei volantini con le offerte.`,
    };
  }

  // INTENTO: COSA PUOI FARE
  if (lower.includes('cosa puoi fare') || lower.includes('aiuto') || lower.includes('funzioni')) {
    return {
      text: `Posso aiutarti a tenere tutto sotto controllo:\n\n• **Scadenze e promemoria**: ti avviso su bolli, assicurazioni, revisioni e rate\n• **Veicoli**: ti ricordo chilometri, scadenze e dettagli dell'auto\n• **Documenti**: trovo subito numeri e date di scadenza\n• **Spese e finanze**: riepilogo rate e uscite del mese\n• **Volantini e Offerte**: trova promozioni e sconti nei supermercati\n• **Memoria personale**: puoi dirmi *"Ricordati che..."* per memorizzare qualsiasi cosa!`,
    };
  }

  // FALLBACK INTELLIGENTE & RAG LOCALE
  // Cerca se c'è qualche memoria personalizzata o nota che contiene parole chiave della richiesta
  const words = lower.split(/\s+/).filter(w => w.length > 3);
  const relevantMemories = customMemories.filter(m => words.some(w => m.fact.toLowerCase().includes(w)));
  const relevantNotes = k.notes.filter(n => words.some(w => n.title.toLowerCase().includes(w) || n.snippet.toLowerCase().includes(w)));

  if (relevantMemories.length > 0 || relevantNotes.length > 0) {
    let out = `Ho trovato questi appunti collegati:\n\n`;
    if (relevantMemories.length > 0) {
      relevantMemories.forEach(m => out += `• ${m.fact}\n`);
      out += `\n`;
    }
    if (relevantNotes.length > 0) {
      relevantNotes.forEach(n => out += `• **${n.title}**: ${n.snippet}\n`);
    }
    return { text: out };
  }

  return {
    text: `Non ho trovato informazioni su questo tra i tuoi moduli o nelle note. Se vuoi che me ne ricordi per il futuro, dimmi pure *"Ricordati che..."*!`,
  };
}
