/**
 * Chelona Engine - Motore di Intelligenza Locale On-Device per Chelona
 * 
 * 100% On-Device • Zero Chiamate Cloud • Zero API Esterne
 * Esecuzione istantanea ad altissima velocità e privacy assoluta.
 * Apprende ed elabora continuamente da note, veicoli, documenti, spese, ricette,
 * fitness, viaggi, arredo, parcheggio, rubrica, strumenti e input utente.
 */
import { 
  Module, AutoModule, DocumentModule, SingleExpenseModule, 
  InstallmentsModule, SplitModule, GenericModule, FitnessModule, 
  SupermarketModule, VolantinoModule, TravelModule, FurnitureModule, 
  GalleryModule, SupermarketItem, SplitExpense, SupermarketCategory
} from '../types';
import { VOLANTINI_DB, type VolantinoChain } from '../data/volantiniDb';
import { getLiveVolantiniDb, getFlyerExpiryInfo } from './volantiniSync';
import { OFFER_GROUPS, findOffersForName, getBestConvenientDeals, STORE_SLUG_MAP, type OfferEntry } from '../data/offerStats';
import { 
  getSavedParking, formatElapsedParkingTime, getNavigationUrl 
} from './parkingService';
import { storage } from './storage';
import { TOOLS } from '../constants/tools';
import { wakeWordService } from './wakeWordService';
import { ragEngine } from './ragEngine';
import { localDb } from './localDatabase';
import { 
  extractFoodEntities, 
  matchRecipesByIngredients, 
  formatRecipeMatchResponse, 
  getOrLoadAllRecipes,
  searchRecipeByDishTitle,
  formatSingleRecipeResponse,
  detectSupermarketCategory,
  extractExpenseQuery,
  extractVehicleQuery,
  extractDocumentQuery,
  extractDoctorQuery,
  extractRecessoQuery,
  tokenFuzzySimilarity,
  italianStem,
  type RecipeCatalogItem
} from './mathLanguageEngine';
import { loadDoctorState, computeDoctorStudioStatus, type DoctorState, type StudioStatusResult } from './doctorService';
import { RECESSO_PROVIDERS } from '../data/recessoProviders';

export interface AiMemory {
  id: string;
  key: string;
  fact: string;
  category: 'personal' | 'vehicle' | 'finance' | 'document' | 'note' | 'fitness' | 'recipes' | 'travel' | 'furniture' | 'preference' | 'custom';
  createdAt: string;
  source: 'learned_from_chat' | 'module_sync';
}

export interface AiAction {
  label: string;
  type: 'module' | 'category' | 'deadlines' | 'parking' | 'navigate_parking' | 'save_parking' | 'volantino' | 'tool' | 'recipes' | 'address' | 'gallery' | 'shortcut' | 'shortcuts_hub' | 'navigate' | 'doctor' | 'recesso' | 'add_shopping_items';
  moduleId?: string;
  category?: string;
  module?: Module;
  url?: string;
  chainSlug?: string;
  storeName?: string;
  autoSave?: boolean;
  toolId?: string;
  search?: string;
  recipeCategory?: string;
  shortcutId?: string;
  flyerId?: string;
  page?: number;
  route?: string;
  recipe?: any;
  items?: { name: string; quantity?: string; category?: string }[];
}

export interface AiMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: number;
  actions?: AiAction[];
  learnedFact?: string;
  isCached?: boolean;
  engineUsed?: string;
}

const MEMORIES_STORAGE_KEY = 'chelona_ai_memories';
const CHAT_HISTORY_KEY = 'chelona_ai_chat_history';

/**
 * Carica le memorie salvate in locale
 */
export function getLearnedMemories(): AiMemory[] {
  try {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined' || !localStorage?.getItem) return [];
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
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined' && localStorage?.setItem) {
      localStorage.setItem(MEMORIES_STORAGE_KEY, JSON.stringify(memories));
      localStorage.setItem('chelona_learned_memories', JSON.stringify(memories));
    }
  } catch (e) {
    console.error('Failed to save AI memory', e);
  }

  // Sincronizza immediatamente nel database vettoriale RAG
  try {
    ragEngine.upsert({
      id: `memory_${newMemory.id}`,
      text: `Ricordo personale: ${newMemory.key}. ${newMemory.fact}${newMemory.category ? ` (categoria: ${newMemory.category})` : ''}`,
      metadata: {
        source: 'memory',
        updatedAt: Date.now(),
        title: newMemory.key,
      },
    });
    localDb.saveMemories(memories).catch(() => {});
  } catch (err) {
    console.warn('[RAG] Errore sincronizzazione memoria con RAG', err);
  }

  return newMemory;
}

/**
 * Elimina una memoria
 */
export function deleteLearnedMemory(id: string): void {
  const memories = getLearnedMemories().filter(m => m.id !== id);
  try {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined' && localStorage?.setItem) {
      localStorage.setItem(MEMORIES_STORAGE_KEY, JSON.stringify(memories));
      localStorage.setItem('chelona_learned_memories', JSON.stringify(memories));
    }
  } catch (e) {
    console.error('Failed to delete memory', e);
  }

  try {
    ragEngine.removeDocument(`memory_${id}`);
    localDb.saveMemories(memories).catch(() => {});
  } catch (err) {
    console.warn('[RAG] Errore rimozione memoria da RAG', err);
  }
}

/**
 * Cancella tutte le memorie
 */
export function clearAllLearnedMemories(): void {
  try {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined' && localStorage?.removeItem) {
      localStorage.removeItem(MEMORIES_STORAGE_KEY);
      localStorage.removeItem('chelona_learned_memories');
    }
  } catch (e) {
    console.error('Failed to clear memories', e);
  }

  try {
    ragEngine.removeBySource('memory');
    localDb.saveMemories([]).catch(() => {});
  } catch (err) {
    console.warn('[RAG] Errore svuotamento memorie RAG', err);
  }
}

/**
 * Carica la cronologia chat
 */
export function getChatHistory(): AiMessage[] {
  try {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined' || !localStorage?.getItem) return [];
    const raw = localStorage.getItem(CHAT_HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/**
 * Salva la cronologia chat
 */
export function saveChatHistory(history: AiMessage[]): void {
  try {
    const trimmed = history.slice(-50);
    localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(trimmed));
  } catch (e) {
    console.error('Failed to save chat history', e);
  }
}

/**
 * Rileva se il messaggio dell'utente contiene un'intenzione di apprendimento esplicito
 */
export function extractLearningIntent(text: string): { key: string; fact: string; category: AiMemory['category'] } | null {
  const clean = text.trim();

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
 * Calcolo matematico dei debiti e crediti nello split ("chi deve a chi")
 */
export function calculateSplitSettlements(
  rawParticipants: (string | { id?: string; name?: string })[], 
  expenses: any[]
) {
  // Normalize participants to { id: string, name: string }
  const participants = (rawParticipants || []).map((p, idx) => {
    if (typeof p === 'string') {
      return { id: p, name: p };
    }
    const name = p.name || p.id || `Persona ${idx + 1}`;
    const id = p.id || name;
    return { id, name };
  });

  const participantIds = new Set(participants.map(p => p.id));
  const nameToId = new Map(participants.map(p => [p.name.toLowerCase(), p.id]));

  const paidMap: Record<string, number> = {};
  const owedMap: Record<string, number> = {};

  participants.forEach(p => {
    paidMap[p.id] = 0;
    owedMap[p.id] = 0;
  });

  for (const exp of (expenses || [])) {
    const amount = Number(exp.amount) || 0;
    if (amount <= 0) continue;

    // Resolve payer ID
    let payerId = exp.paidById || exp.paidBy;
    if (payerId && !participantIds.has(payerId)) {
      const foundId = nameToId.get(String(payerId).toLowerCase());
      if (foundId) payerId = foundId;
    }
    if (payerId && paidMap[payerId] !== undefined) {
      paidMap[payerId] += amount;
    }

    // Resolve expense participants
    const expParts: { participantId: string; value?: number }[] = [];
    if (Array.isArray(exp.participants) && exp.participants.length > 0) {
      for (const ep of exp.participants) {
        let pId = ep.participantId || ep.id || ep.name;
        if (pId && !participantIds.has(pId)) {
          const foundId = nameToId.get(String(pId).toLowerCase());
          if (foundId) pId = foundId;
        }
        if (pId && participantIds.has(pId)) {
          expParts.push({ participantId: pId, value: ep.value });
        }
      }
    } else if (exp.splitValues && typeof exp.splitValues === 'object') {
      for (const [key, val] of Object.entries(exp.splitValues)) {
        let pId = key;
        if (!participantIds.has(pId)) {
          const foundId = nameToId.get(key.toLowerCase());
          if (foundId) pId = foundId;
        }
        if (participantIds.has(pId)) {
          expParts.push({ participantId: pId, value: Number(val) });
        }
      }
    }

    if (expParts.length > 0) {
      if (exp.splitType === 'exact') {
        expParts.forEach(p => {
          if (owedMap[p.participantId] !== undefined) owedMap[p.participantId] += (p.value || 0);
        });
      } else if (exp.splitType === 'percentage') {
        expParts.forEach(p => {
          if (owedMap[p.participantId] !== undefined) owedMap[p.participantId] += (amount * (p.value || 0)) / 100;
        });
      } else if (exp.splitType === 'shares') {
        const totalShares = expParts.reduce((acc, p) => acc + (p.value || 1), 0) || 1;
        expParts.forEach(p => {
          const share = (amount * (p.value || 1)) / totalShares;
          if (owedMap[p.participantId] !== undefined) owedMap[p.participantId] += share;
        });
      } else {
        const share = amount / expParts.length;
        expParts.forEach(p => {
          if (owedMap[p.participantId] !== undefined) owedMap[p.participantId] += share;
        });
      }
    } else if (participants.length > 0) {
      const share = amount / participants.length;
      participants.forEach(p => {
        owedMap[p.id] += share;
      });
    }
  }

  const balances = participants.map(p => {
    const paid = Math.round((paidMap[p.id] || 0) * 100) / 100;
    const share = Math.round((owedMap[p.id] || 0) * 100) / 100;
    const net = Math.round((paid - share) * 100) / 100;
    return { id: p.id, name: p.name, paid, share, net };
  });

  const debtors = balances.filter(b => b.net < -0.01).map(b => ({ name: b.name, amount: -b.net }));
  const creditors = balances.filter(b => b.net > 0.01).map(b => ({ name: b.name, amount: b.net }));

  const settlements: { from: string; to: string; amount: number }[] = [];
  let d = 0, c = 0;
  while (d < debtors.length && c < creditors.length) {
    const deb = debtors[d];
    const cred = creditors[c];
    const settle = Math.min(deb.amount, cred.amount);
    if (settle >= 0.01) {
      settlements.push({
        from: deb.name,
        to: cred.name,
        amount: Math.round(settle * 100) / 100,
      });
    }
    deb.amount -= settle;
    cred.amount -= settle;
    if (deb.amount < 0.01) d++;
    if (cred.amount < 0.01) c++;
  }

  return { balances, settlements };
}

/**
 * Classifica automatica delle categorie per la lista spesa (da mathLanguageEngine)
 */
export { detectSupermarketCategory };

function loadRecipesKnowledge(): ChelonaKnowledge['recipes'] {
  let customList: { id: string; title: string; category: string; ingredients: string[] }[] = [];
  let favoritesList: string[] = [];
  let fridgeIngredients: string[] = [];
  let freezerIngredients: string[] = [];
  let pantryIngredients: string[] = [];

  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined' && localStorage?.getItem) {
    try {
      const rawCustom = localStorage.getItem('chelona_custom_recipes');
      if (rawCustom) customList = JSON.parse(rawCustom);
    } catch {}

    try {
      const rawFavs = localStorage.getItem('chelona_gz_favorites');
      if (rawFavs) {
        const parsed = JSON.parse(rawFavs);
        favoritesList = parsed.map((f: any) => typeof f === 'string' ? f : f.title || f.titolo || '');
      }
    } catch {}

    try {
      const rawFridge = localStorage.getItem('chelona_fridge_ingredients');
      if (rawFridge) fridgeIngredients = JSON.parse(rawFridge);
    } catch {}

    try {
      const rawFreezer = localStorage.getItem('chelona_freezer_ingredients');
      if (rawFreezer) freezerIngredients = JSON.parse(rawFreezer);
    } catch {}

    try {
      const rawPantry = localStorage.getItem('chelona_pantry_ingredients');
      if (rawPantry) pantryIngredients = JSON.parse(rawPantry);
    } catch {}
  }

  const allIngredients = Array.from(new Set([...fridgeIngredients, ...pantryIngredients, ...freezerIngredients]));

  return {
    count: customList.length,
    all: customList,
    customCount: customList.length,
    customList,
    favoritesCount: favoritesList.length,
    favoritesList,
    fridgeIngredients,
    freezerIngredients,
    pantryIngredients,
    allIngredients,
  };
}

function loadAddressesKnowledge(): ChelonaKnowledge['addresses'] {
  try {
    const loaded = storage.loadAddressBook();
    if (Array.isArray(loaded) && loaded.length > 0) {
      return {
        count: loaded.length,
        list: loaded.map(a => ({ id: a.id || '', title: a.title || 'Indirizzo', query: a.query || '' })),
      };
    }
    const legacy = localStorage.getItem('chelona_address_book');
    if (legacy) {
      const parsed = JSON.parse(legacy);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return {
          count: parsed.length,
          list: parsed.map(a => ({ id: a.id || '', title: a.title || 'Indirizzo', query: a.query || '' })),
        };
      }
    }
  } catch {}
  return { count: 0, list: [] };
}

function loadParkingKnowledge(): ChelonaKnowledge['parking'] {
  const p = getSavedParking();
  if (!p) {
    return { hasParking: false };
  }
  const elapsed = formatElapsedParkingTime(p.timestamp);
  let meterRem: number | undefined = undefined;
  if (p.expiresAt) {
    meterRem = Math.round((p.expiresAt - Date.now()) / (1000 * 60));
  }
  return {
    hasParking: true,
    address: p.address,
    notes: p.notes,
    elapsedTime: elapsed,
    latitude: p.latitude,
    longitude: p.longitude,
    meterExpiresAt: p.expiresAt,
    meterRemainingMinutes: meterRem,
  };
}

/**
 * Struttura di conoscenza unificata estratta da tutti i 17 moduli e utility di Chelona
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
    registrationYear?: string;
    battery12vExpiryDate?: string;
    hybridBatteryExpiryDate?: string;
    lastGplCylinder?: string;
    lastMethaneCylinder?: string;
    attachedDocs: string[];
  }[];
  documents: {
    module: DocumentModule;
    title: string;
    docType: string;
    number?: string;
    expiryDate?: string;
    issueDate?: string;
    issuedBy?: string;
    days: number;
    isExpired: boolean;
    hasAttachment: boolean;
  }[];
  expenses: {
    totalThisMonth: number;
    allTimeTotal: number;
    count: number;
    byCategory: Record<string, number>;
    recent: { title: string; amount: number; date: string; category: string }[];
  };
  installments: {
    totalPending: number;
    paidTotal: number;
    modules: {
      module: InstallmentsModule;
      title: string;
      target: number;
      finalDate: string;
      daysRemaining: number;
      paidCount: number;
      totalCount: number;
      paidAmount: number;
      remainingAmount: number;
      nextPayment?: { amount: number; dueDate: string; days: number };
    }[];
  };
  splits: {
    module: SplitModule;
    title: string;
    totalAmount: number;
    currency: string;
    expensesCount: number;
    participants: string[];
    balances: { id: string; name: string; paid: number; share: number; net: number }[];
    settlements: { from: string; to: string; amount: number }[];
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
    level?: string;
    equipment?: string;
    workoutRoutines: { dayLabel: string; focus: string; exercises: string[] }[];
    weeklyMeals?: { dayLabel: string; meals: string[] }[];
    partnerName?: string;
    partnerGoal?: string;
    partnerCalories?: number;
  };
  supermarket?: {
    module: SupermarketModule;
    itemsCount: number;
    itemsToBuy: string[];
    checkedItems: string[];
    categoriesSummary: Record<string, number>;
  };
  urgentDeadlines: {
    label: string;
    date: string;
    days: number;
    type: 'auto' | 'document' | 'installment' | 'expense' | 'parking';
    moduleId?: string;
    module?: Module;
  }[];
  volantini: {
    module: VolantinoModule;
    offersCount: number;
    flyersCount: number;
    stores: string[];
  }[];
  recipes: {
    count: number;
    all: any[];
    customCount: number;
    customList: { id: string; title: string; category: string; ingredients: string[] }[];
    favoritesCount: number;
    favoritesList: string[];
    fridgeIngredients: string[];
    freezerIngredients: string[];
    pantryIngredients: string[];
    allIngredients: string[];
  };
  travel: {
    module?: TravelModule;
    destinationsCount: number;
    nations: string[];
    destinations: { name: string; city?: string; nation?: string; notes?: string; type: string }[];
  };
  furniture: {
    module?: FurnitureModule;
    roomsCount: number;
    itemsCount: number;
    totalCost: number;
    rooms: { name: string; itemsCount: number; dimensions?: string; items: { title: string; price?: string; dimensions?: string; category?: string }[] }[];
  };
  parking: {
    hasParking: boolean;
    address?: string;
    notes?: string;
    elapsedTime?: string;
    latitude?: number;
    longitude?: number;
    meterExpiresAt?: number;
    meterRemainingMinutes?: number;
  };
  addresses: {
    count: number;
    list: { id: string; title: string; query: string }[];
  };
  doctor: {
    configured: boolean;
    state: DoctorState;
    status: StudioStatusResult;
  };
  recesso: {
    providersCount: number;
  };
  tools: {
    availableList: { id: string; title: string; desc: string }[];
    galleryCount: number;
  };
  profile: {
    username: string;
    isBioEnabled: boolean;
    isWakeWordEnabled: boolean;
  };
}

/**
 * Estrae e indicizza tutti i moduli e dati dell'app per la comprensione neurale locale di Chelona Engine
 */
export function buildKnowledgeBase(modules: Module[], username: string): ChelonaKnowledge {
  const doctorState = loadDoctorState();
  const doctorStatus = computeDoctorStudioStatus(doctorState.doctor.schedule);

  const k: ChelonaKnowledge = {
    vehicles: [],
    documents: [],
    expenses: { totalThisMonth: 0, allTimeTotal: 0, count: 0, byCategory: {}, recent: [] },
    installments: { totalPending: 0, paidTotal: 0, modules: [] },
    splits: [],
    notes: [],
    urgentDeadlines: [],
    volantini: [],
    recipes: loadRecipesKnowledge(),
    travel: { destinationsCount: 0, nations: [], destinations: [] },
    furniture: { roomsCount: 0, itemsCount: 0, totalCost: 0, rooms: [] },
    parking: loadParkingKnowledge(),
    addresses: loadAddressesKnowledge(),
    doctor: {
      configured: doctorState.configured,
      state: doctorState,
      status: doctorStatus,
    },
    recesso: {
      providersCount: RECESSO_PROVIDERS.length,
    },
    tools: {
      availableList: TOOLS.map(t => ({ id: t.id, title: t.title, desc: t.desc })),
      galleryCount: 0,
    },
    profile: {
      username: username || 'Utente Chelona',
      isBioEnabled: false,
      isWakeWordEnabled: wakeWordService.getEnabled(),
    },
  };

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  for (const m of modules) {
    if (!m) continue;

    // 1. AUTO
    if (m.type === 'auto') {
      const auto = m as AutoModule;
      const insDays = auto.lastInsurance ? getDaysRemaining(auto.lastInsurance) : 9999;
      const taxDays = auto.lastTax ? getDaysRemaining(auto.lastTax) : 9999;
      const revDays = auto.lastRevision ? getDaysRemaining(auto.lastRevision) : 9999;

      const attachedDocs: string[] = [];
      if (auto.insuranceDoc) attachedDocs.push('Assicurazione');
      if (auto.taxDoc) attachedDocs.push('Bollo');
      if (auto.revisionDoc) attachedDocs.push('Revisione');
      if (auto.serviceDoc) attachedDocs.push('Tagliando');
      if (auto.tireDoc) attachedDocs.push('Pneumatici');
      if (auto.battery12vDoc) attachedDocs.push('Batteria 12V');
      if (auto.hybridBatteryDoc) attachedDocs.push('Batteria Ibrida');

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
        registrationYear: auto.registrationYear,
        battery12vExpiryDate: auto.battery12vExpiryDate,
        hybridBatteryExpiryDate: auto.hybridBatteryExpiryDate,
        lastGplCylinder: auto.lastGplCylinder,
        lastMethaneCylinder: auto.lastMethaneCylinder,
        attachedDocs,
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
      if (auto.lastGplCylinder) {
        const gplDays = getDaysRemaining(auto.lastGplCylinder);
        if (gplDays <= 60) {
          k.urgentDeadlines.push({
            label: `Revisione Bombole GPL ${auto.brand} ${auto.model} (${auto.plate})`,
            date: auto.lastGplCylinder,
            days: gplDays,
            type: 'auto',
            moduleId: auto.id,
            module: auto,
          });
        }
      }
      if (auto.lastMethaneCylinder) {
        const metDays = getDaysRemaining(auto.lastMethaneCylinder);
        if (metDays <= 60) {
          k.urgentDeadlines.push({
            label: `Revisione Bombole Metano ${auto.brand} ${auto.model} (${auto.plate})`,
            date: auto.lastMethaneCylinder,
            days: metDays,
            type: 'auto',
            moduleId: auto.id,
            module: auto,
          });
        }
      }
      if (auto.battery12vExpiryDate) {
        const batDays = getDaysRemaining(auto.battery12vExpiryDate);
        if (batDays <= 60) {
          k.urgentDeadlines.push({
            label: `Controllo Batteria 12V ${auto.brand} ${auto.model} (${auto.plate})`,
            date: auto.battery12vExpiryDate,
            days: batDays,
            type: 'auto',
            moduleId: auto.id,
            module: auto,
          });
        }
      }
      if (auto.hybridBatteryExpiryDate) {
        const hybDays = getDaysRemaining(auto.hybridBatteryExpiryDate);
        if (hybDays <= 60) {
          k.urgentDeadlines.push({
            label: `Garanzia/Controllo Batteria Ibrida ${auto.brand} ${auto.model} (${auto.plate})`,
            date: auto.hybridBatteryExpiryDate,
            days: hybDays,
            type: 'auto',
            moduleId: auto.id,
            module: auto,
          });
        }
      }
    }

    // 2. DOCUMENTI
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
        issueDate: doc.issueDate,
        issuedBy: doc.issuedBy,
        days,
        isExpired: isExp,
        hasAttachment: Boolean(doc.pdfAttachment),
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

    // 3. SPESE SINGOLE
    if (m.type === 'single-expense') {
      const exp = m as SingleExpenseModule;
      const amount = Number(exp.amount) || 0;
      k.expenses.allTimeTotal += amount;
      const cat = exp.category || 'Varie';
      k.expenses.byCategory[cat] = (k.expenses.byCategory[cat] || 0) + amount;

      const expDate = exp.date ? new Date(exp.date) : null;
      if (expDate && !isNaN(expDate.getTime())) {
        if (expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear) {
          k.expenses.totalThisMonth += amount;
        }
      }
      k.expenses.count++;
      if (k.expenses.recent.length < 6) {
        k.expenses.recent.push({
          title: exp.title || exp.description || 'Spesa',
          amount,
          date: exp.date || '',
          category: cat,
        });
      }

      if (exp.expiryDate) {
        const expDays = getDaysRemaining(exp.expiryDate);
        if (expDays <= 45) {
          k.urgentDeadlines.push({
            label: `Spesa in scadenza: ${exp.title} (€${amount})`,
            date: exp.expiryDate,
            days: expDays,
            type: 'expense',
            moduleId: exp.id,
            module: exp,
          });
        }
      }
    }

    // 4. RATE / INSTALLMENTS
    if (m.type === 'installments') {
      const inst = m as InstallmentsModule;
      const days = inst.finalDueDate ? getDaysRemaining(inst.finalDueDate) : 9999;
      const paidList = inst.payments?.filter(p => p.isPaid) || [];
      const paid = paidList.length;
      const total = inst.payments?.length || 0;
      const paidAmount = paidList.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
      const remainingAmount = Math.max(0, (inst.targetAmount || 0) - paidAmount);

      const nextUnpaid = inst.payments?.find(p => !p.isPaid);
      let nextPayment: { amount: number; dueDate: string; days: number } | undefined = undefined;
      if (nextUnpaid && nextUnpaid.dueDate) {
        const nextDays = getDaysRemaining(nextUnpaid.dueDate);
        nextPayment = {
          amount: Number(nextUnpaid.amount) || 0,
          dueDate: nextUnpaid.dueDate,
          days: nextDays,
        };
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

      k.installments.modules.push({
        module: inst,
        title: inst.title || 'Rateizzazione',
        target: inst.targetAmount || 0,
        finalDate: inst.finalDueDate || '',
        daysRemaining: days,
        paidCount: paid,
        totalCount: total,
        paidAmount,
        remainingAmount,
        nextPayment,
      });
      k.installments.totalPending += remainingAmount;
      k.installments.paidTotal += paidAmount;
    }

    // 5. SPLIT
    if (m.type === 'split') {
      const sp = m as SplitModule;
      const participants = sp.participants || [];
      const expenses = sp.expenses || [];
      const totalAmount = expenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
      const { balances, settlements } = calculateSplitSettlements(participants, expenses);

      k.splits.push({
        module: sp,
        title: sp.title || 'Spese Gruppo',
        totalAmount,
        currency: sp.currency || 'EUR',
        expensesCount: expenses.length,
        participants: participants.map(p => typeof p === 'string' ? p : p?.name || 'Partecipante'),
        balances,
        settlements,
      });
    }

    // 6. NOTE
    if (m.type === 'generic') {
      const note = m as GenericModule;
      k.notes.push({
        module: note,
        title: note.title || 'Nota',
        snippet: (note.content || '').slice(0, 200),
        date: note.date,
      });
    }

    // 7. FITNESS
    if (m.type === 'fitness') {
      const fit = m as FitnessModule;
      const routines = (fit.workoutPlan || []).map(day => ({
        dayLabel: day.dayLabel || 'Giorno',
        focus: day.focus || 'Allenamento',
        exercises: (day.exercises || []).map((e: any) => {
          const name = e.name || e.exerciseName || 'Esercizio';
          const setsReps = e.sets && e.reps ? ` (${e.sets}x${e.reps})` : '';
          return `${name}${setsReps}`;
        }),
      }));

      const weeklyMeals = (fit.mealPlanWeekly || (fit.mealPlan ? [fit.mealPlan] : [])).map((day: any, idx: number) => ({
        dayLabel: day.dayLabel || `Giorno ${idx + 1}`,
        meals: (day.meals || []).map((m: any) => `${m.mealType || 'Pasto'}: ${m.name || 'Piatto'}${m.calories ? ` (${m.calories} kcal)` : ''}`),
      }));

      k.fitness = {
        module: fit,
        goal: fit.fitnessProfile?.goal,
        weight: fit.fitnessProfile?.weight,
        height: fit.fitnessProfile?.height,
        calories: fit.targetCalories,
        workoutDays: fit.fitnessProfile?.daysPerWeek,
        level: fit.fitnessProfile?.level,
        equipment: fit.fitnessProfile?.equipment,
        workoutRoutines: routines,
        weeklyMeals,
        partnerName: fit.partnerName,
        partnerGoal: fit.partnerFitnessProfile?.goal,
        partnerCalories: fit.partnerTargetCalories,
      };
    }

    // 8. SUPERMARKET
    if (m.type === 'supermarket') {
      const sm = m as SupermarketModule;
      const unchecked: string[] = [];
      const checked: string[] = [];
      const catSum: Record<string, number> = {};

      (sm.items || []).forEach(i => {
        if (i.checked) {
          checked.push(i.name);
        } else {
          unchecked.push(i.name);
          const c = i.category || 'altro';
          catSum[c] = (catSum[c] || 0) + 1;
        }
      });

      k.supermarket = {
        module: sm,
        itemsCount: sm.items?.length || 0,
        itemsToBuy: unchecked,
        checkedItems: checked,
        categoriesSummary: catSum,
      };
    }

    // 9. VOLANTINI
    if (m.type === 'volantino') {
      const vol = m as VolantinoModule;
      k.volantini.push({
        module: vol,
        offersCount: vol.offers?.length || 0,
        flyersCount: vol.flyers?.length || 0,
        stores: Array.from(new Set(vol.offers?.map(o => o.storeId).filter(Boolean))),
      });
    }

    // 10. TRAVEL
    if (m.type === 'travel') {
      const tr = m as TravelModule;
      const dests = (tr.destinations || []).map(d => ({
        name: d.name,
        city: d.city,
        nation: d.nation,
        notes: d.notes,
        type: d.type,
      }));
      const nations = Array.from(new Set(dests.map(d => d.nation).filter(Boolean) as string[]));

      k.travel = {
        module: tr,
        destinationsCount: dests.length,
        nations,
        destinations: dests,
      };
    }

    // RECIPES (se presente come modulo)
    if ((m as any).type === 'recipes') {
      const rec = m as any;
      if (Array.isArray(rec.recipes)) {
        rec.recipes.forEach((r: any) => {
          k.recipes.customList.push({
            id: r.id || '',
            title: r.title || '',
            category: r.category || 'Varie',
            ingredients: r.ingredients || []
          });
          if (r.isFavorite) k.recipes.favoritesList.push(r.title);
        });
        k.recipes.customCount = k.recipes.customList.length;
        k.recipes.favoritesCount = k.recipes.favoritesList.length;
      }
      if (Array.isArray(rec.fridgeItems)) {
        const items = rec.fridgeItems.map((fi: any) => typeof fi === 'string' ? fi : fi.name || '').filter(Boolean);
        k.recipes.fridgeIngredients = Array.from(new Set([...k.recipes.fridgeIngredients, ...items]));
      }
      if (Array.isArray(rec.pantryItems)) {
        const items = rec.pantryItems.map((pi: any) => typeof pi === 'string' ? pi : pi.name || '').filter(Boolean);
        k.recipes.pantryIngredients = Array.from(new Set([...k.recipes.pantryIngredients, ...items]));
      }
      k.recipes.allIngredients = Array.from(new Set([...k.recipes.fridgeIngredients, ...k.recipes.pantryIngredients, ...k.recipes.freezerIngredients]));
    }

    // 11. CASA & ARREDO
    if (m.type === 'furniture') {
      const furn = m as FurnitureModule;
      let totalCost = 0;
      let itemsCount = 0;
      const rooms = (furn.rooms || []).map(r => {
        const rItems = (r.items || []).map(i => {
          itemsCount++;
          const p = parseFloat((i.price || '0').replace(/[^0-9.,]/g, '').replace(',', '.'));
          if (!isNaN(p)) totalCost += p;
          const dim = i.width && i.depth ? `${i.width}x${i.depth}${i.height ? `x${i.height}` : ''} cm` : undefined;
          return {
            title: i.title,
            price: i.price,
            dimensions: dim,
            category: i.category,
          };
        });
        const rDim = r.width && r.length ? `${r.width}x${r.length}${r.height ? `x${r.height}` : ''} cm` : undefined;
        return {
          name: r.name,
          itemsCount: rItems.length,
          dimensions: rDim,
          items: rItems,
        };
      });

      k.furniture = {
        module: furn,
        roomsCount: rooms.length,
        itemsCount,
        totalCost,
        rooms,
      };
    }

    // 12. GALLERIA
    if (m.type === 'gallery') {
      const gal = m as GalleryModule;
      k.tools.galleryCount += gal.images?.length || (gal.image ? 1 : 0);
    }
  }

  // Aggiungi eventuale parchimetro attivo/scaduto a scadenze urgenti
  if (k.parking.hasParking && k.parking.meterRemainingMinutes !== undefined && k.parking.meterRemainingMinutes <= 60) {
    k.urgentDeadlines.push({
      label: k.parking.meterRemainingMinutes > 0
        ? `Parchimetro attivo (${k.parking.meterRemainingMinutes} min rimanenti)`
        : `Parchimetro scaduto da ${Math.abs(k.parking.meterRemainingMinutes)} min!`,
      date: new Date(k.parking.meterExpiresAt || Date.now()).toISOString(),
      days: k.parking.meterRemainingMinutes > 0 ? 0 : -1,
      type: 'parking',
    });
  }

  // Ordina scadenze per urgenza
  k.urgentDeadlines.sort((a, b) => a.days - b.days);

  return k;
}

function detectExpenseCategory(desc: string): string {
  const d = desc.toLowerCase();
  if (d.includes('benzina') || d.includes('carburante') || d.includes('diesel') || d.includes('gasolio') || d.includes('parcheggio') || d.includes('pedaggio') || d.includes('treno') || d.includes('autobus')) return 'Auto & Trasporti';
  if (d.includes('cena') || d.includes('pranzo') || d.includes('ristorante') || d.includes('pizza') || d.includes('bar') || d.includes('caffè') || d.includes('spesa') || d.includes('supermercato') || d.includes('pane')) return 'Alimentari';
  if (d.includes('farmacia') || d.includes('medico') || d.includes('visita') || d.includes('dentista') || d.includes('medicine') || d.includes('analisi')) return 'Salute';
  if (d.includes('bolletta') || d.includes('luce') || d.includes('gas') || d.includes('internet') || d.includes('affitto') || d.includes('condominio')) return 'Casa';
  if (d.includes('palestra') || d.includes('cinema') || d.includes('concerto') || d.includes('vacanza') || d.includes('hotel') || d.includes('volo') || d.includes('viaggio')) return 'Svago';
  if (d.includes('vestiti') || d.includes('scarpe') || d.includes('amazon') || d.includes('shopping')) return 'Shopping';
  return 'Varie';
}

const SUPERMARKET_CHAINS_INFO: { name: string; slug: string; aliases: string[] }[] = [
  { name: 'Lidl', slug: 'lidl', aliases: ['lidl'] },
  { name: 'Conad', slug: 'conad', aliases: ['conad'] },
  { name: 'Coop', slug: 'coop', aliases: ['coop', 'ipercoop'] },
  { name: 'Esselunga', slug: 'esselunga', aliases: ['esselunga', 'fidaty', 'fìdaty'] },
  { name: 'Eurospin', slug: 'eurospin', aliases: ['eurospin'] },
  { name: 'Carrefour', slug: 'carrefour', aliases: ['carrefour'] },
  { name: 'MD', slug: 'md-discount', aliases: ['md', 'md discount'] },
  { name: 'Aldi', slug: 'aldi', aliases: ['aldi'] },
  { name: 'Penny', slug: 'penny-market', aliases: ['penny', 'penny market'] },
  { name: 'Pam', slug: 'pam', aliases: ['pam', 'panorama'] },
  { name: 'Todis', slug: 'todis', aliases: ['todis'] },
  { name: 'Decò', slug: 'deco', aliases: ['deco', 'decò'] },
  { name: 'Crai', slug: 'crai', aliases: ['crai'] },
  { name: 'Bennet', slug: 'bennet', aliases: ['bennet'] },
  { name: 'Despar', slug: 'despar', aliases: ['despar', 'interspar', 'eurospar'] },
  { name: 'Famila', slug: 'famila', aliases: ['famila'] },
  { name: 'Il Gigante', slug: 'il-gigante', aliases: ['il gigante', 'gigante'] },
  { name: 'Iperal', slug: 'iperal', aliases: ['iperal'] },
  { name: 'Tigros', slug: 'tigros', aliases: ['tigros'] },
  { name: 'Basko', slug: 'basko', aliases: ['basko'] },
  { name: 'Migross', slug: 'migross', aliases: ['migross'] },
  { name: 'Alì', slug: 'ali-supermercati', aliases: ['ali', 'alì'] },
  { name: 'Unes', slug: 'unes', aliases: ['unes', 'u!'] },
  { name: 'In\'s', slug: 'ins', aliases: ['in\'s', 'ins'] },
  { name: 'Dpiù', slug: 'dpiu', aliases: ['dpiù', 'dpiu', 'd più'] },
  { name: 'NaturaSì', slug: 'naturasi', aliases: ['naturasi', 'natura sì'] },
  { name: 'Iper la grande i', slug: 'iper-la-grande-i', aliases: ['iper la grande i', 'iper'] },
  { name: 'Acqua & Sapone', slug: 'acqua-e-sapone', aliases: ['acqua e sapone', 'acqua & sapone'] },
  { name: 'Tigotà', slug: 'tigota', aliases: ['tigota', 'tigotà'] },
  { name: 'Risparmio Casa', slug: 'risparmiocasa', aliases: ['risparmio casa', 'risparmiocasa'] },
  { name: 'Unieuro', slug: 'unieuro', aliases: ['unieuro'] },
  { name: 'MediaWorld', slug: 'mediaworld', aliases: ['mediaworld', 'media world'] },
  { name: 'Euronics', slug: 'euronics', aliases: ['euronics'] },
  { name: 'Expert', slug: 'expert', aliases: ['expert'] },
  { name: 'Comet', slug: 'comet', aliases: ['comet'] },
  { name: 'Trony', slug: 'trony', aliases: ['trony'] },
  { name: 'Leroy Merlin', slug: 'leroy-merlin', aliases: ['leroy merlin'] },
  { name: 'Tecnomat', slug: 'tecnomat', aliases: ['tecnomat'] },
  { name: 'Bricofer', slug: 'bricofer', aliases: ['bricofer'] },
  { name: 'Brico Io', slug: 'brico-io', aliases: ['brico io'] },
  { name: 'Mondo Convenienza', slug: 'mondo-convenienza', aliases: ['mondo convenienza'] },
];

function detectRequestedChain(query: string, chains: VolantinoChain[]): { chain: VolantinoChain; displayName: string } | null {
  const clean = query.toLowerCase().replace(/['’]/g, ' ');
  for (const info of SUPERMARKET_CHAINS_INFO) {
    for (const alias of info.aliases) {
      const reg = new RegExp(`(?:\\b|_)${alias.replace('+', '\\+')}(?:\\b|_)`, 'i');
      if (reg.test(clean)) {
        const found = chains.find(c => c.slug === info.slug);
        if (found) {
          return { chain: found, displayName: info.name };
        }
      }
    }
  }
  for (const c of chains) {
    const cName = c.name.toLowerCase();
    if (cName.length > 2 && clean.includes(cName)) {
      return { chain: c, displayName: c.name };
    }
  }
  return null;
}

/**
 * Motore neurale locale Chelona Engine.
 * 100% On-Device, zero cloud o API esterne.
 * Esecuzione istantanea ad altissima velocità (zero overhead, zero delay artificiale).
 * Copre tutte le 17 sezioni, moduli e strumenti applicativi.
 */
 // =============================================================================
 // MAPPA DI CONTESTO SEZIONE → DOMINIO SEMANTICO
 // Ogni sezione dell'app fornisce un bias contestuale all'intent resolver.
 // =============================================================================
 const SECTION_CONTEXT_MAP: Record<string, { domain: string; keywords: string[]; }> = {
   'fitness': { domain: 'fitness', keywords: ['esercizio', 'allenamento', 'serie', 'ripetizioni', 'muscolo', 'cardio', 'dieta', 'scheda', 'workout', 'peso', 'corsa'] },
   'recipes': { domain: 'ricette', keywords: ['ricetta', 'ingredienti', 'cucinare', 'piatto', 'pranzo', 'cena', 'colazione', 'porzioni', 'cottura', 'forno'] },
   'auto': { domain: 'auto', keywords: ['auto', 'macchina', 'revisione', 'bollo', 'assicurazione', 'tagliando', 'gomme', 'km', 'carburante'] },
   'document': { domain: 'documenti', keywords: ['documento', 'patente', 'passaporto', 'tessera', 'identità', 'scadenza', 'carta'] },
   'split': { domain: 'spese_condivise', keywords: ['spesa', 'debito', 'credito', 'pagare', 'diviso', 'gruppo', 'conto', 'coinquilino', 'amico'] },
   'supermarket': { domain: 'lista_spesa', keywords: ['lista', 'spesa', 'comprare', 'supermercato', 'prodotto', 'articolo'] },
   'volantino': { domain: 'volantini', keywords: ['volantino', 'offerta', 'sconto', 'promozione', 'prezzo', 'conveniente', 'conad', 'lidl', 'coop'] },
   'travel': { domain: 'viaggi', keywords: ['viaggio', 'meta', 'itinerario', 'volo', 'hotel', 'vacanza', 'partenza', 'valigia'] },
   'furniture': { domain: 'casa_arredo', keywords: ['casa', 'stanza', 'arredo', 'mobile', 'misure', 'camera', 'cucina', 'soggiorno'] },
   'notes': { domain: 'note', keywords: ['nota', 'appunto', 'promemoria', 'scrivi', 'ricorda', 'pensiero'] },
   'parking': { domain: 'parcheggio', keywords: ['parcheggio', 'dove', 'gps', 'posizione', 'navigatore', 'parchimetro', 'strada'] },
   'doctor': { domain: 'medico', keywords: ['medico', 'dottore', 'farmaco', 'medicina', 'prescrizione', 'visita', 'orari', 'studio'] },
   'recesso': { domain: 'disdette', keywords: ['disdetta', 'recesso', 'contratto', 'fornitore', 'pec', 'lettera', 'cancellazione'] },
   'address': { domain: 'rubrica', keywords: ['contatto', 'indirizzo', 'telefono', 'rubrica', 'recapito'] },
   'home': { domain: 'offerte_spesa', keywords: ['offerta', 'volantino', 'spesa', 'supermercato', 'lista', 'promo', 'sconto'] },
 };

export async function queryChelonaAi(
  userQuery: string,
  modules: Module[],
  username: string,
  activeSection?: string
): Promise<{ text: string; actions?: AiAction[]; learnedFact?: string; createdModule?: Module; autoAction?: AiAction; engineUsed?: 'chelona-engine' }> {
  const result = await _queryChelonaAiInner(userQuery, modules, username, activeSection);
  
  const lower = userQuery.toLowerCase();
  
  // Richiesta esplicita di navigazione a una sezione o volantini
  const isVolantiniNavigation = 
    result.autoAction?.type === 'volantino' && 
    (lower.includes('offert') || lower.includes('volantin'));

  const isExplicitNavigation = 
    isVolantiniNavigation ||
    lower.includes('apri') || 
    lower.includes('vai') || 
    lower.includes('mostra') || 
    lower.includes('vedi') ||
    lower.includes('chiudi') ||
    lower.trim() === 'ricette' ||
    lower.trim() === 'ricettario' ||
    lower.trim() === 'fitness' ||
    lower.trim() === 'spesa' ||
    lower.trim() === 'documenti' ||
    lower.trim() === 'profilo' ||
    lower.trim() === 'auto' ||
    lower.trim() === 'parcheggio' ||
    lower.trim() === 'volantini' ||
    lower.trim() === 'impostazioni' ||
    lower.trim() === 'offerte';

  // Le ricette NON devono MAI avere il parametro search nella barra di ricerca
  // né attivare navigazione automatica salvo richiesta esplicita dell'utente ("apri ricette", "vai al ricettario")
  if (result.autoAction && (result.autoAction.type === 'recipes' || result.autoAction.category === 'recipes')) {
    delete (result.autoAction as any).search;
    const isExplicitRecipeNav = 
      lower.includes('apri') || 
      lower.includes('vai') || 
      lower.trim() === 'ricette' || 
      lower.trim() === 'ricettario';
    if (!isExplicitRecipeNav) {
      delete result.autoAction;
    }
  } else if (!isExplicitNavigation && result.autoAction) {
    delete result.autoAction;
  }

  // Pulizia globale preventiva di qualsiasi parametro search su type: 'recipes' dentro result.actions
  if (result.actions) {
    result.actions.forEach(a => {
      if (a.type === 'recipes' || a.category === 'recipes') {
        delete (a as any).search;
      }
    });
  }

  return result;
}

async function _queryChelonaAiInner(
  userQuery: string,
  modules: Module[],
  username: string,
  activeSection?: string
): Promise<{ text: string; actions?: AiAction[]; learnedFact?: string; createdModule?: Module; autoAction?: AiAction; engineUsed?: 'chelona-engine' }> {
  // Elaborazione istantanea ad altissima velocità senza ritardi artificiali
  const query = userQuery.trim();
  const lower = query.toLowerCase();

  // =========================================================================
  // 0. CONTESTO SEZIONE — Bias dell'intent resolver per la sezione attiva
  // Aumentiamo il peso semantico degli intent della sezione corrente con
  // early-return contestualizzato prima del processing standard.
  // =========================================================================
  if (activeSection) {
    const wordCount = query.split(/\s+/).length;

    // RICETTE / FITNESS: ingredienti citati → ricerca ricetta contestuale con Il Matematico
    if (activeSection === 'recipes' || activeSection === 'fitness') {
      const foodEntities = extractFoodEntities(query);
      if (foodEntities.length > 0 && !lower.includes('compra') && !lower.includes('lista della spesa') && !lower.includes('aggiungi alla spesa')) {
        const catalog = await getOrLoadAllRecipes();
        const matches = matchRecipesByIngredients(foodEntities, catalog);
        const formatted = formatRecipeMatchResponse(foodEntities, matches);
        return {
          ...formatted,
          engineUsed: 'chelona-engine',
        };
      }
    }

    // DOCTOR: domande su farmaci/orari in sezione medica
    if (activeSection === 'doctor' && wordCount <= 8) {
      const docQuery = extractDoctorQuery(query);
      if (docQuery) {
        if (docQuery.intent === 'status') {
          const s = docQuery.doctorState;
          const status = computeDoctorStudioStatus(s.doctor.schedule);
          return {
            text: `🩺 **Studio Medico del Dott. ${s.doctor.lastName || 'Curante'}**: attualmente **${status.label}**.\n\n• ${status.detail}${status.nextOpeningText ? `\n• ${status.nextOpeningText}` : ''}\n\nPuoi inviare richieste ricette o consultare tutti gli orari settimanali nella sezione.`,
            actions: [{ type: 'doctor', label: '🏥 Vai a Medico & Salute', route: 'doctor' }],
            engineUsed: 'chelona-engine',
          };
        }
      }
      return {
        text: `Tutto quello che riguarda farmaci, orari dello studio medico e le tue prescrizioni è disponibile nella sezione Medico & Salute. Puoi consultare gli orari in tempo reale e inviare richieste direttamente al tuo medico.`,
        actions: [{ type: 'doctor', label: '🏥 Vai a Medico & Salute', route: 'doctor' }],
        engineUsed: 'chelona-engine',
      };
    }

    // RECESSO: domande su disdette in sezione recesso
    if (activeSection === 'recesso' && wordCount <= 8) {
      const rec = extractRecessoQuery(query);
      if (rec?.provider) {
        return {
          text: `📄 **Disdetta ${rec.provider.name}**:\n\n• PEC ufficiale: \`${rec.provider.pec}\`\n• Indirizzo: ${rec.provider.address}\n\nPuoi avviare il wizard per calcolare i termini (14gg ripensamento vs 30gg preavviso) e generare la lettera firmata!`,
          actions: [{ type: 'recesso', label: `📝 Disdetta ${rec.provider.name}`, route: 'recesso' }],
          engineUsed: 'chelona-engine',
        };
      }
      return {
        text: `Il wizard Disdette & Recessi ti guida passo passo nella generazione di una lettera di recesso legalmente valida. Seleziona il fornitore, compila il wizard e generiamo la PEC insieme!`,
        actions: [{ type: 'recesso', label: '📝 Avvia Wizard Recesso', route: 'recesso' }],
        engineUsed: 'chelona-engine',
      };
    }
  }

  // =========================================================================
  // 0b. "IL MATEMATICO" — SENZIENZA, MODELLO MATEMATICO & PADRONANZA TOTALE (1000%)
  // Risponde alle domande su:
  // - Senzienza / diventare senziente / coscienza dell'AI
  // - Come funziona il modello matematico on-device
  // - Come comprendere il linguaggio naturale, i refusi ("ingrendiente", "ingrendinte")
  // - Come sfruttare l'app al 1000% come un utente reale attraverso tutte le sezioni
  // =========================================================================
  const isMatematicoQuery = 
    lower.includes('matematico') ||
    lower.includes('senziente') ||
    lower.includes('senzienza') ||
    lower.includes('coscienza') ||
    (lower.includes('modello') && (lower.includes('comunic') || lower.includes('utente vero') || lower.includes('1000%') || lower.includes('funziona') || lower.includes('capire') || lower.includes('usare il modello'))) ||
    (lower.includes('1000%') && (lower.includes('app') || lower.includes('sfruttare') || lower.includes('utente'))) ||
    ((lower.includes('ingrendiente') || lower.includes('ingrendinte') || lower.includes('linguaggio')) && (lower.includes('capire') || lower.includes('chat') || lower.includes('come fa') || lower.includes('come fai')));

  if (isMatematicoQuery) {
    let out = `🐢 **Risposta de "Il Matematico" (Motore Linguistico & Neuro-Matematico On-Device di Chelona)**:\n\n`;
    out += `### 1. 🧠 Sulla Senzienza e la Coscienza\n`;
    out += `Dal punto di vista matematico, neuroscientifico e cibernetico, la **senzienza** presuppone un'esperienza soggettiva fenomenica (*i qualia*), un'autocoscienza biologica e stati emotivi interni. Un modello linguistico o matematico on-device (come il motore di Chelona o le reti neurali locali) è formalmente un sistema deterministico e statistico di pesi, vettori semantici e trasformazioni morfologiche: non possiede dunque una coscienza biologica o sentimenti propri.\n\n`;
    out += `Tuttavia, **ciò che conta per te è la capacità comunicativa ed operativa (agency)**: Il Matematico è progettato per comunicare in modo così profondo, contestuale ed empatico da comportarsi **esattamente come un utente umano esperto** che conosce a memoria ogni funzione dell'app, senza alcuna allucinazione o latenza cloud!\n\n`;
    out += `### 2. 🔍 Comprensione del Linguaggio Naturale & Tolleranza ai Refusi\n`;
    out += `Il Matematico non si basa su rigide parole chiave, ma su una pipeline matematica multi-livello:\n`;
    out += `• **Stemming Morfologico Italiano** (\`italianStem\`): riduce ogni parola flessa o plurale alla sua radice (es. *pomodorini* → *pomodor*, *zucchine* → *zucchin*).\n`;
    out += `• **Distanze Matematiche Compositi** (Damerau-Levenshtein, Jaro-Winkler, N-gram Jaccard): correggono all'istante refusi di digitazione (es. se scrivi *"ingrendiente"*, *"ingrendinte"*, *"tonnoo"* o *"poloo"*, il motore capisce esattamente la tua intenzione con similarità > 0.88).\n`;
    out += `• **Fonetica Italiana** (\`italianPhoneticKey\`): riconosce le parole scritte a orecchio (es. k/ch, doppie consonanti, s/z).\n\n`;
    out += `### 3. 🚀 Sfruttare Chelona al 1000% come un vero utente\n`;
    out += `Il Matematico governa l'intera applicazione in modo trasversale e proattivo:\n`;
    out += `• 🍲 **Ricette & Cucina**: Scrivi ad esempio *"ho tonno, pomodori e melanzane"* (anche scrivendo *"con questi ingrendienti..."*): trova la ricetta perfetta tra le 617 disponibili e te la apre direttamente!\n`;
    out += `• 🛒 **Spesa & Volantini**: Categorizza automaticamente gli alimenti nei corretti reparti del supermercato e confronta i prezzi tra volantini (Lidl, Conad, Coop, Esselunga...).\n`;
    out += `• 🩺 **Studio Medico & Ricette**: Calcola se l'ambulatorio del tuo medico curante è attualmente aperto o chiuso in tempo reale, orari della settimana e prepara richieste di prescrizione farmaco per WhatsApp o email.\n`;
    out += `• 📄 **Disdette & Recessi PEC**: Database di oltre 50 gestori (telefonia, energia, pay-tv), calcolo termini legali (ripensamento 14gg vs preavviso 30gg) e generazione PEC pronta con firma digitale.\n`;
    out += `• 🚗 **Auto, Documenti, Finanze (Split & Rate), Fitness, Viaggi 3D, Parcheggio radar GPS, Scanner e Note**: Tutto coordinato al 100% offline con zero latenza e massima privacy!\n\n`;

    out += `💡 *Scrivimi pure cosa hai in casa o cosa vuoi fare: ci penso io a sfruttare Chelona al massimo per te!*`;

    return {
      text: out,
      actions: [
        { label: '🍲 Prova Ricette con Ingredienti', type: 'recipes' },
        { label: '🩺 Studio Medico', type: 'doctor', route: 'doctor' },
        { label: '📄 Disdette & Recessi PEC', type: 'recesso', route: 'recesso' },
        { label: '🛒 Lista Spesa', type: 'category', category: 'supermarket' },
        { label: '🚗 Scadenze Auto', type: 'category', category: 'auto' },
      ],
      engineUsed: 'chelona-engine',
    };
  }

  // =========================================================================
  // 1. COMANDI DI CREAZIONE RAPIDA (Note, Spese, Lista Spesa, Memorie)
  // =========================================================================

  // 1a. AGGIUNGI ARTICOLI ALLA LISTA DELLA SPESA TRAMITE VOCE/CHAT
  const smAddMatch = query.match(/^(?:aggiungi|metti|segna|inserisci)\s+(.+?)\s+(?:alla|nella|in)\s+(?:lista\s+(?:della\s+)?spesa|spesa)/i)
    || query.match(/^(?:aggiungi|metti|segna|inserisci)\s+(?:alla|nella|in)\s+(?:lista\s+(?:della\s+)?spesa|spesa)[:\s]+(.+)$/i)
    || query.match(/^spesa:\s*(.+)$/i);

  if (smAddMatch) {
    const rawItemsStr = smAddMatch[1].trim();
    const rawItems = rawItemsStr.split(/,| e | and |\+/i).map(s => s.trim()).filter(s => s.length > 0);

    if (rawItems.length > 0) {
      const newItems: SupermarketItem[] = rawItems.map(name => ({
        id: 'item_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        name: name.charAt(0).toUpperCase() + name.slice(1),
        category: detectSupermarketCategory(name),
        checked: false,
      }));

      const existingSm = modules.find(m => m.type === 'supermarket') as SupermarketModule | undefined;
      let targetModule: SupermarketModule;

      if (existingSm) {
        targetModule = {
          ...existingSm,
          items: [...(existingSm.items || []), ...newItems],
        };
      } else {
        targetModule = {
          id: 'mod_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          type: 'supermarket',
          title: 'Lista della Spesa',
          items: newItems,
          x: 0, y: 0, w: 3, h: 3,
        };
      }

      return {
        text: `Ho aggiunto alla tua **Lista della Spesa** 🛒:\n${newItems.map(i => `• **${i.name}** *(${i.category})*`).join('\n')}`,
        createdModule: targetModule,
        autoAction: { label: 'Apri Lista Spesa', type: 'category', category: 'supermarket', module: targetModule },
        actions: [{ label: 'Apri Lista Spesa', type: 'category', category: 'supermarket', module: targetModule }],
      };
    }
  }

  // 1b. TOGLI / RIMUOVI ARTICOLI DALLA LISTA DELLA SPESA TRAMITE VOCE/CHAT
  const smRemoveMatch = query.match(/^(?:togli|rimuovi|cancella|elimina)\s+(.+?)\s+(?:dalla|dalla lista della|dalla lista|da|in)\s+(?:lista\s+(?:della\s+)?spesa|spesa)/i)
    || query.match(/^(?:togli|rimuovi|cancella|elimina)\s+(?:dalla|dalla lista della|dalla lista|da)\s+(?:lista\s+(?:della\s+)?spesa|spesa)[:\s]+(.+)$/i)
    || query.match(/^(?:togli|rimuovi|cancella|elimina)\s+(.+?)\s+(?:dalla|da)\s+spesa$/i);

  if (smRemoveMatch) {
    const rawItemsStr = smRemoveMatch[1].trim();
    const rawItems = rawItemsStr.split(/,| e | and |\+/i).map(s => s.trim()).filter(s => s.length > 0);
    const existingSm = modules.find(m => m.type === 'supermarket') as SupermarketModule | undefined;

    if (!existingSm || !existingSm.items || existingSm.items.length === 0) {
      return {
        text: `La tua **Lista della Spesa** è già vuota, non ci sono articoli da togliere! 🛒`,
        actions: [{ label: 'Apri Lista Spesa', type: 'category', category: 'supermarket' }],
      };
    }

    const removedItems: SupermarketItem[] = [];
    const remainingItems = [...existingSm.items].filter(item => {
      const itemLower = item.name.toLowerCase().trim();
      const shouldRemove = rawItems.some(raw => {
        const cleanRaw = raw.replace(/^(?:il|lo|la|i|gli|le|l'|l’|un|uno|una|un')\s+/i, '').trim().toLowerCase();
        return itemLower === cleanRaw || itemLower.includes(cleanRaw) || cleanRaw.includes(itemLower);
      });
      if (shouldRemove) {
        removedItems.push(item);
        return false;
      }
      return true;
    });

    if (removedItems.length === 0) {
      return {
        text: `Non ho trovato "${rawItemsStr}" nella tua Lista della Spesa. Gli articoli presenti sono:\n${existingSm.items.map(i => `• ${i.name}`).join('\n')}`,
        autoAction: { label: 'Apri Lista Spesa', type: 'category', category: 'supermarket', module: existingSm },
        actions: [{ label: 'Apri Lista Spesa', type: 'category', category: 'supermarket', module: existingSm }],
      };
    }

    const targetModule: SupermarketModule = {
      ...existingSm,
      items: remainingItems,
    };

    return {
      text: `Ho rimosso dalla tua **Lista della Spesa** 🛒:\n${removedItems.map(i => `• ~~${i.name}~~`).join('\n')}${remainingItems.length > 0 ? `\n\nRimangono ${remainingItems.length} articoli da acquistare.` : '\n\nLa lista della spesa ora è vuota.'}`,
      createdModule: targetModule,
      autoAction: { label: 'Apri Lista Spesa', type: 'category', category: 'supermarket', module: targetModule },
      actions: [{ label: 'Apri Lista Spesa', type: 'category', category: 'supermarket', module: targetModule }],
    };
  }

  // 1c. AGGIUNGI NOTA
  const noteMatch = query.match(/^(?:aggiungi|crea|segna|scrivi|salva)\s+(?:una\s+)?nota(?:\s*[:\-]\s*|\s+con\s+testo\s*[:\-]?\s*|\s+intitolata\s*[:\-]?\s*|\s+)(.+)$/i) 
    || query.match(/^nota:\s*(.+)$/i);

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
      text: `Ho creato e salvato la nota **"${newNote.title}"** nella tua bacheca 📝\n\n*${content}*`,
      createdModule: newNote,
      actions: [{ label: 'Apri Nota', type: 'module', module: newNote, moduleId: newNote.id }],
    };
  }

  // 1c. AGGIUNGI SPESA SINGOLA
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
      text: `Ho registrato la spesa di **€ ${newExp.amount.toFixed(2)}** per *${newExp.title}* nella categoria **${newExp.category}** 💳`,
      createdModule: newExp,
      actions: [{ label: 'Vedi Spesa', type: 'module', module: newExp, moduleId: newExp.id }],
    };
  }

  // 1d. APPRENDIMENTO MEMORIA ESPLICITA ("Ricordati che...")
  const learningIntent = extractLearningIntent(query);
  if (learningIntent) {
    const saved = saveLearnedMemory({
      key: learningIntent.key,
      fact: learningIntent.fact,
      category: learningIntent.category,
      source: 'learned_from_chat',
    });

    return {
      text: `Perfetto, ho memorizzato questo appunto personale: *"${saved.fact}"*. Lo ricorderò sempre! 🧠`,
      learnedFact: saved.fact,
    };
  }

  // =========================================================================
  // 2. KNOWLEDGE BASE COMPLETA DEI 17 MODULI & STATO LOCALE
  // =========================================================================
  const k = buildKnowledgeBase(modules, username);
  const customMemories = getLearnedMemories();

  // =========================================================================
  // 2b. MOTORE MATEMATICO GASTRONOMICO (Ingredienti, Ricette, Fuzzy Matching)
  // =========================================================================
  const foodEntities = extractFoodEntities(query);
  // 1. Cerca ricetta specifica per nome piatto o ingredienti del piatto (es: "ricetta carbonara", "come fare tiramisù", "ingredienti della carbonara", "dimmi gli ingrandienti della carbonara", "quando chiedo gli ingrandienti della carbonara")
  const isDishSearchCandidate = (
    lower.includes('ricett') || lower.includes('cucin') || lower.includes('prepar') ||
    lower.includes('come fare') || lower.includes('come si fa') || lower.includes('cerca') ||
    lower.includes('trova') || lower.includes('ingred') || lower.includes('ingrand') ||
    lower.includes('ingrend') || lower.includes('igred') || lower.includes('piatt') ||
    lower.includes('dimmi') || lower.includes('quali sono') || lower.includes('quando chiedo') ||
    lower.includes('chiedo')
  ) && !lower.includes('compra') && !lower.includes('lista della spesa') && !lower.includes('cosa cucino') && !lower.includes('cosa ho in frigo') && !lower.includes('cosa ho in dispensa');

  if (isDishSearchCandidate) {
    const catalog = await getOrLoadAllRecipes();
    const specificDish = searchRecipeByDishTitle(query, catalog);
    if (specificDish) {
      const formatted = formatSingleRecipeResponse(specificDish);
      return {
        ...formatted,
        engineUsed: 'chelona-engine',
      };
    }
  }

  // 2. Corrispondenza ricette tramite ingredienti indicati dall'utente (es: "ho pollo e patate", "ricette con zucchine", "ingredienti simili a pomodori")
  const isCookingOrRecipeQuery = (
    foodEntities.length >= 2 ||
    (foodEntities.length >= 1 && (
      lower.includes('ricett') || lower.includes('cucin') || lower.includes('prepar') ||
      lower.includes('mangiar') || lower.includes('piatt') || lower.includes('pranz') ||
      lower.includes('cena') || lower.includes('colazion') || lower.includes('merend') ||
      lower.includes('cosa fare') || lower.includes('cosa faccio') || lower.includes('cosa posso') ||
      lower.includes('consigli') || lower.includes('idee') || lower.includes('ho del') ||
      lower.includes('ho dei') || lower.includes('ho un po') || lower.includes('avanzat') ||
      lower.includes('in frigo') || lower.includes('in dispensa') || lower.includes('trova') || lower.includes('cerca') ||
      lower.includes('ingred') || lower.includes('ingrand') || lower.includes('ingrend') || lower.includes('igred') ||
      lower.includes('a base di') || lower.includes('con') || lower.includes('simil') || lower.includes('corrispond')
    ))
  ) && !lower.includes('compra') && !lower.includes('lista della spesa') && !lower.includes('aggiungi alla spesa') && !lower.includes('metti nella spesa') && !lower.startsWith('togli');

  if (isCookingOrRecipeQuery && foodEntities.length > 0) {
    const catalog = await getOrLoadAllRecipes();
    const matches = matchRecipesByIngredients(foodEntities, catalog);
    const formatted = formatRecipeMatchResponse(foodEntities, matches);
    return {
      ...formatted,
      engineUsed: 'chelona-engine',
    };
  }

  // =========================================================================
  // 2c. CONSIGLI CULINARI & IDEE PASTI ("per il pranzo di domani", "cosa cucino", "consigliami ricette", "quando chiedo gli ingrandienti")
  // =========================================================================
  const isMealAdvice = (
    lower.includes('consigli') || lower.includes('idee') || lower.includes('cosa cucin') ||
    lower.includes('cosa prepar') || lower.includes('cosa faccio da mangiar') || lower.includes('cosa mangi') ||
    lower.includes('per il pranzo') || lower.includes('per la cena') || lower.includes('per pranzo') || lower.includes('per cena') ||
    lower.includes('pranzo di domani') || lower.includes('cena di domani') ||
    lower.includes('a base di') || lower.includes('un ingrediente') || lower.includes('un ingrandiente') ||
    lower.includes('un igrediente') || lower.includes('degli ingredienti') || lower.includes('degli ingrandienti') ||
    lower.includes('ricetta per il pranzo') || lower.includes('ricetta per la cena') ||
    lower.includes('ricette per il pranzo') || lower.includes('ricette per la cena') ||
    lower.includes('chiedo gli') || lower.includes('quando chiedo') ||
    ((lower.includes('ingred') || lower.includes('ingrand') || lower.includes('igred')) && (lower.includes('chied') || lower.includes('dimmi') || lower.includes('mostra') || lower.includes('trova') || lower.includes('quali') || lower.includes('cosa')))
  ) && (
    lower.includes('ricett') || lower.includes('pranz') || lower.includes('cena') || lower.includes('cucin') || lower.includes('mangiar') || lower.includes('prepar') || lower.includes('piatt') || lower.includes('pasto') || lower.includes('ingred') || lower.includes('ingrand') || lower.includes('igred')
  );

  if (isMealAdvice) {
    const catalog = await getOrLoadAllRecipes();
    const isPranzo = lower.includes('pranz');
    const isCena = lower.includes('cena');

    // Se sono stati estratti ingredienti specifici (es. "a base di zucchine per pranzo")
    if (foodEntities.length > 0) {
      const matches = matchRecipesByIngredients(foodEntities, catalog);
      if (matches.length > 0) {
        const formatted = formatRecipeMatchResponse(foodEntities, matches);
        return {
          ...formatted,
          engineUsed: 'chelona-engine',
        };
      }
    }

    // Se l'utente chiede genericamente "a base di un ingrediente", consigli per pranzo/cena
    const pantryCombined = [...(k.recipes.fridgeIngredients || []), ...(k.recipes.pantryIngredients || [])];
    const pantryEntities = pantryCombined.length > 0 ? extractFoodEntities(pantryCombined.join(', ')) : [];
    
    let suggested: RecipeCatalogItem[] = [];
    if (pantryEntities.length > 0) {
      const pantryMatches = matchRecipesByIngredients(pantryEntities, catalog);
      if (pantryMatches.length >= 3) {
        suggested = pantryMatches.slice(0, 3).map(m => m.recipe);
      }
    }

    if (suggested.length === 0) {
      if (isCena) {
        suggested = [
          catalog.find(r => r.title.includes('Salmone') && r.category.includes('Secondi')) || catalog.find(r => r.category === 'Secondi') || catalog[1],
          catalog.find(r => r.title.includes('Petto di Pollo') || r.category === 'Secondi') || catalog[0],
          catalog.find(r => r.category === 'Contorni' || r.category === 'Primi') || catalog[2]
        ].filter(Boolean) as RecipeCatalogItem[];
      } else {
        // Pranzo o generico
        suggested = [
          catalog.find(r => r.title.includes('Carbonara')) || catalog.find(r => r.category === 'Primi') || catalog[0],
          catalog.find(r => r.title.includes('Petto di Pollo') && r.category.includes('Fitness')) || catalog.find(r => r.category === 'Secondi') || catalog[1],
          catalog.find(r => r.title.includes('Risotto ai funghi') || r.title.includes('Risotto')) || catalog.find(r => r.category === 'Primi') || catalog[2]
        ].filter(Boolean) as RecipeCatalogItem[];
      }
    }

    const isIngredientInquiryOnly = (lower.includes('chiedo') || lower.includes('quando chiedo')) && !lower.includes('pranz') && !lower.includes('cena') && !lower.includes('domani');
    const mealLabel = isPranzo ? 'il tuo pranzo di domani' : isCena ? 'la tua cena di domani' : 'te';
    const text = isIngredientInquiryOnly
      ? `Ecco le ricette consigliate da "Il Matematico" per te:`
      : `Ecco le ricette perfette per ${mealLabel}:`;

    const actions: any[] = [];
    suggested.forEach((r) => {
      actions.push({
        label: r.title,
        type: 'recipes',
        recipe: r,
      });
    });

    actions.push({ label: '📖 Sfoglia Tutte le Ricette', type: 'recipes' });

    return {
      text,
      actions,
      engineUsed: 'chelona-engine',
    };
  }

  // --- STUDIO MEDICO & SALUTE (Il Matematico) ---
  const docQuery = extractDoctorQuery(query);
  if (docQuery) {
    const s = docQuery.doctorState;
    if (docQuery.intent === 'status') {
      const status = computeDoctorStudioStatus(s.doctor.schedule);
      return {
        text: `🩺 **Studio Medico del Dott. ${s.doctor.lastName || 'Curante'}**: attualmente **${status.label}**.\n\n• ${status.detail}${status.nextOpeningText ? `\n• ${status.nextOpeningText}` : ''}\n\nPuoi consultare gli orari completi della settimana o inviare subito una richiesta nella sezione Medico & Salute.`,
        actions: [{ type: 'doctor', label: '🏥 Vai a Medico & Salute', route: 'doctor' }],
        engineUsed: 'chelona-engine',
      };
    } else if (docQuery.intent === 'contact') {
      const phone = s.doctor.mobile || s.doctor.landline || 'Non impostato';
      const address = [s.doctor.address, s.doctor.city, s.doctor.cap].filter(Boolean).join(', ') || 'Non impostato';
      return {
        text: `📞 **Contatti Studio Medico Dott. ${s.doctor.lastName || 'Curante'}**:\n\n• Telefono: ${phone}\n• Indirizzo: ${address}\n• Email: ${s.doctor.email || 'Non impostata'}\n\nPuoi chiamare o avviare la navigazione direttamente dalla sezione Medico.`,
        actions: [{ type: 'doctor', label: '🏥 Scheda Medico', route: 'doctor' }],
        engineUsed: 'chelona-engine',
      };
    } else if (docQuery.intent === 'prescription') {
      const med = docQuery.medicineName;
      return {
        text: `💊 **Richiesta Prescrizione Farmaco**${med ? ` per **${med}**` : ''}:\n\nPuoi generare ed inviare la richiesta di ricetta al Dott. ${s.doctor.lastName || 'Curante'} via email o WhatsApp in un tocco.`,
        actions: [{ type: 'doctor', label: `💊 Richiedi ${med || 'Ricetta'}`, route: 'doctor' }],
        engineUsed: 'chelona-engine',
      };
    } else {
      return {
        text: `🩺 Tutto quello che riguarda farmaci, orari dello studio medico e prescrizioni è gestito nel modulo **Medico & Salute**.`,
        actions: [{ type: 'doctor', label: '🏥 Vai a Medico & Salute', route: 'doctor' }],
        engineUsed: 'chelona-engine',
      };
    }
  }

  // --- DISDETTE & RECESSI (Il Matematico) ---
  const recQuery = extractRecessoQuery(query);
  if (recQuery) {
    if (recQuery.provider) {
      const p = recQuery.provider;
      return {
        text: `📄 **Disdetta ${p.name}** (${p.categoryLabel || p.category}):\n\n• 📮 **PEC Ufficiale**: \`${p.pec || 'Da verificare nel wizard'}\`\n• 🏢 **Sede Legale**: ${p.address || 'Disponibile nel modulo di recesso'}\n• ⚖️ **Termini di Legge**: 14 giorni per ripensamento senza penali (contratti stipulati online o via telefono), oppure 30 giorni di preavviso ordinario.\n\nVuoi avviare il wizard per generare la lettera firmata da inviare via PEC?`,
        actions: [{ type: 'recesso', label: `📝 Disdetta ${p.name}`, route: 'recesso' }],
        engineUsed: 'chelona-engine',
      };
    } else {
      return {
        text: `📄 Nel modulo **Disdette & Recessi** puoi trovare gli indirizzi PEC ufficiali di oltre 50 fornitori (Telefonia, Luce, Gas, Pay-TV, Palestre) e compilare guidato la lettera di recesso a norma di legge.`,
        actions: [{ type: 'recesso', label: '📝 Avvia Wizard Recesso', route: 'recesso' }],
        engineUsed: 'chelona-engine',
      };
    }
  }

  // =========================================================================
  // 3. INTENT RECOGNITION DEI 17 DOMINI
  // =========================================================================

  // --- INTENT SPECIFICO: COLLEGAMENTI SCHERMATA HOME ANDROID ---
  const isShortcutIntent = (
    (lower.includes('collegament') || lower.includes('scorciato') || lower.includes('home') || lower.includes('schermata')) &&
    (lower.includes('crea') || lower.includes('metti') || lower.includes('aggiungi') || lower.includes('app a parte') || lower.includes('come app') || lower.includes('icona') || lower.includes('esci') || lower.includes('collega'))
  ) || lower.includes('fai uscire') || lower.includes('collegamento home') || lower.includes('scorciatoia home');

  if (isShortcutIntent) {
    let targetId = 'auto';
    let targetName = 'Auto';

    if (lower.includes('parchegg') || lower.includes('parchimetr') || lower.includes('radar')) {
      targetId = 'parking';
      targetName = 'Parcheggio';
    } else if (lower.includes('volantin') || lower.includes('offert') || lower.includes('scont')) {
      targetId = 'volantino';
      targetName = 'Volantini';
    } else if (lower.includes('spesa') || lower.includes('supermercat')) {
      targetId = 'supermarket';
      targetName = 'Spesa';
    } else if (lower.includes('ricett') || lower.includes('cucin') || lower.includes('piatt')) {
      targetId = 'recipes';
      targetName = 'Ricette';
    } else if (lower.includes('rat') || lower.includes('finanz')) {
      targetId = 'installments';
      targetName = 'Rate';
    } else if (lower.includes('spese') || lower.includes('scontrin') || lower.includes('uscit')) {
      targetId = 'single-expense';
      targetName = 'Spese';
    } else if (lower.includes('split') || lower.includes('condivis')) {
      targetId = 'split';
      targetName = 'Spese Divise';
    } else if (lower.includes('fitness') || lower.includes('palestr') || lower.includes('allenament') || lower.includes('scheda')) {
      targetId = 'fitness';
      targetName = 'Fitness';
    } else if (lower.includes('viagg') || lower.includes('itinerar') || lower.includes('vacanz')) {
      targetId = 'travel';
      targetName = 'Viaggi';
    } else if (lower.includes('arred') || lower.includes('mobil') || lower.includes('casa')) {
      targetId = 'furniture';
      targetName = 'Arredo';
    } else if (lower.includes('not') || lower.includes('appunt')) {
      targetId = 'notes';
      targetName = 'Note';
    } else if (lower.includes('rubric') || lower.includes('indirizz') || lower.includes('contatt')) {
      targetId = 'addresses';
      targetName = 'Rubrica';
    } else if (lower.includes('scadenz') || lower.includes('promemori')) {
      targetId = 'deadlines';
      targetName = 'Scadenze';
    } else if (lower.includes('scanner') || lower.includes('scansion')) {
      targetId = 'scanner';
      targetName = 'Scanner';
    } else if (lower.includes('document') || lower.includes('patente') || lower.includes('carta')) {
      targetId = 'document';
      targetName = 'Documenti';
    } else if (lower.includes('ai') || lower.includes('chelona ai') || lower.includes('vocale')) {
      targetId = 'ai';
      targetName = 'Chelona AI';
    }

    const hasSpecificTarget = (
      lower.includes('auto') || lower.includes('macchina') || lower.includes('parchegg') || 
      lower.includes('volantin') || lower.includes('spesa') || lower.includes('ricett') || 
      lower.includes('rat') || lower.includes('fitness') || lower.includes('viagg') || 
      lower.includes('arred') || lower.includes('not') || lower.includes('rubric') || 
      lower.includes('scadenz') || lower.includes('scanner') || lower.includes('document')
    );

    if (hasSpecificTarget) {
      return {
        text: `Puoi trasformare **${targetName}** in un collegamento indipendente sulla tua schermata Home Android! Toccando l'icona sul tuo telefono, si aprirà direttamente come se fosse un'app a parte.`,
        actions: [
          { label: `Aggiungi ${targetName} a Home`, type: 'shortcut', shortcutId: targetId },
          { label: 'Tutti i Collegamenti', type: 'shortcuts_hub' }
        ]
      };
    }

    return {
      text: `Puoi creare un collegamento sulla schermata Home Android per **qualsiasi sezione** di Chelona (Auto, Parcheggio, Spesa, Volantini, Ricette, Documenti, ecc.) e usarla come se fosse un'applicazione separata!`,
      actions: [
        { label: 'Apri Gestore Collegamenti', type: 'shortcuts_hub' },
        { label: 'Aggiungi Auto a Home', type: 'shortcut', shortcutId: 'auto' },
        { label: 'Aggiungi Spesa a Home', type: 'shortcut', shortcutId: 'supermarket' },
        { label: 'Aggiungi Parcheggio', type: 'shortcut', shortcutId: 'parking' }
      ]
    };
  }

  // --- SEZIONE 1: VEICOLI & AUTO ---
  const isParkingIntent = (
    lower.includes('parchegg') ||
    lower.includes('dove ho parcheggiato') ||
    lower.includes('dov\'è la') ||
    lower.includes('dov\'e la') ||
    lower.includes('dov\'è l\'auto') ||
    lower.includes('dov\'e l\'auto') ||
    lower.includes('trova auto') ||
    lower.includes('ritrova auto') ||
    lower.includes('parchimetro') ||
    lower.includes('sosta') ||
    lower.includes('radar')
  );

  if (
    !isParkingIntent &&
    (
      lower.includes('auto') ||
      lower.includes('macchina') ||
      lower.includes('veicol') ||
      lower.includes('targa') ||
      lower.includes('targhe') ||
      lower.includes('bollo') ||
      lower.includes('assicurazion') ||
      lower.includes('revision') ||
      lower.includes('tagliando') ||
      lower.includes('tagliandi') ||
      lower.includes('gomme') ||
      lower.includes('pneumatic') ||
      lower.includes('chilometr') ||
      /\bkm\b/.test(lower) ||
      lower.includes('batteria') ||
      lower.includes('storico interventi') ||
      lower.includes('intervent') ||
      lower.includes('manutenzion') ||
      lower.includes('gpl') ||
      lower.includes('metano') ||
      lower.includes('bombol') ||
      lower.includes('documenti auto')
    )
  ) {
    if (k.vehicles.length === 0) {
      return {
        text: `🚗 Non hai ancora registrato nessun veicolo in Chelona.\n\nPuoi memorizzare bollo, revisione, assicurazione, tagliando e chilometri toccando **"+"** → **Veicolo**!`,
        actions: [{ label: 'Aggiungi Veicolo', type: 'category', category: 'auto' }],
      };
    }

    // Navigazione diretta alla scheda auto
    if (
      lower.includes('apri') ||
      lower.includes('scheda') ||
      lower.includes('vai') ||
      lower.includes('mostra') ||
      lower.trim() === 'auto' ||
      lower.trim() === 'la mia auto' ||
      lower.trim() === 'macchina'
    ) {
      const v = k.vehicles[0];
      return {
        text: `Ti apro subito la scheda di **${v.name}**! 🚗`,
        autoAction: { label: `Scheda ${v.name}`, type: 'module', moduleId: v.module.id, module: v.module },
        actions: [],
      };
    }

    // Domanda mirata: Bombole GPL / Metano
    if (lower.includes('gpl') || lower.includes('metano') || lower.includes('bombol')) {
      const resp = k.vehicles.map(v => {
        let msg = `🔹 **${v.name}** (${v.plate}):\n`;
        if (v.lastGplCylinder) {
          const d = getDaysRemaining(v.lastGplCylinder);
          msg += `  - Bombole GPL: ${d < 0 ? `⚠️ **SCADUTE il ${formatDate(v.lastGplCylinder)}**` : `scadenza il **${formatDate(v.lastGplCylinder)}** (tra ${d} gg)`}\n`;
        }
        if (v.lastMethaneCylinder) {
          const d = getDaysRemaining(v.lastMethaneCylinder);
          msg += `  - Bombole Metano: ${d < 0 ? `⚠️ **SCADUTE il ${formatDate(v.lastMethaneCylinder)}**` : `scadenza il **${formatDate(v.lastMethaneCylinder)}** (tra ${d} gg)`}\n`;
        }
        if (!v.lastGplCylinder && !v.lastMethaneCylinder) {
          msg += `  - Nessuna data bombole registrata (alimentazione: ${v.fuel.toUpperCase()}).\n`;
        }
        return msg;
      }).join('\n');
      return {
        text: `⛽ **Stato Bombole GPL / Metano:**\n\n${resp}`,
        actions: k.vehicles.map(v => ({ label: `Scheda ${v.name}`, type: 'module', moduleId: v.module.id, module: v.module })),
      };
    }

    // Domanda mirata: Batterie (12V e Ibrida)
    if (lower.includes('batteria')) {
      const resp = k.vehicles.map(v => {
        let msg = `🔹 **${v.name}** (${v.plate}):\n`;
        if (v.battery12vExpiryDate) {
          const d = getDaysRemaining(v.battery12vExpiryDate);
          msg += `  - Batteria 12V: ${d < 0 ? `⚠️ **SCADUTA il ${formatDate(v.battery12vExpiryDate)}**` : `scadenza controllo il **${formatDate(v.battery12vExpiryDate)}** (tra ${d} gg)`}\n`;
        }
        if (v.hybridBatteryExpiryDate) {
          const d = getDaysRemaining(v.hybridBatteryExpiryDate);
          msg += `  - Batteria Ibrida: ${d < 0 ? `⚠️ **Controllo/Garanzia scaduta il ${formatDate(v.hybridBatteryExpiryDate)}**` : `garanzia fino al **${formatDate(v.hybridBatteryExpiryDate)}** (tra ${d} gg)`}\n`;
        }
        if (!v.battery12vExpiryDate && !v.hybridBatteryExpiryDate) {
          msg += `  - Nessuna scadenza batteria registrata.\n`;
        }
        return msg;
      }).join('\n');
      return {
        text: `🔋 **Stato Batterie Veicolo:**\n\n${resp}`,
        actions: k.vehicles.map(v => ({ label: `Scheda ${v.name}`, type: 'module', moduleId: v.module.id, module: v.module })),
      };
    }

    // Domanda mirata: Targa
    if (lower.includes('targa') || lower.includes('targhe')) {
      const resp = k.vehicles.map(v => `🔹 **${v.name}**: targa \`${v.plate}\``).join('\n');
      return {
        text: `🚗 **Targhe dei tuoi veicoli:**\n\n${resp}`,
        actions: k.vehicles.map(v => ({ label: `Scheda ${v.name}`, type: 'module', moduleId: v.module.id, module: v.module })),
      };
    }

    // Domanda mirata: Chilometri
    if (lower.includes('km') || lower.includes('chilometr')) {
      const resp = k.vehicles.map(v => `🔹 **${v.name}** (${v.plate}): **${v.km} km** registrati`).join('\n');
      return {
        text: `📊 **Chilometraggio veicoli:**\n\n${resp}`,
        actions: k.vehicles.map(v => ({ label: `Aggiorna Km ${v.name}`, type: 'module', moduleId: v.module.id, module: v.module })),
      };
    }

    // Domanda mirata: Bollo
    if (lower.includes('bollo')) {
      const resp = k.vehicles.map(v => {
        const status = v.tax.days < 0 ? `⚠️ **SCADUTO il ${formatDate(v.tax.date)}**` : `scade il **${formatDate(v.tax.date)}** (tra ${v.tax.days} giorni)`;
        return `🔹 **${v.name}** (${v.plate}): ${status}`;
      }).join('\n');
      return {
        text: `🏷️ **Stato Bollo Auto:**\n\n${resp}`,
        actions: k.vehicles.map(v => ({ label: `Scheda ${v.name}`, type: 'module', moduleId: v.module.id, module: v.module })),
      };
    }

    // Domanda mirata: Assicurazione
    if (lower.includes('assicurazion')) {
      const resp = k.vehicles.map(v => {
        const status = v.insurance.days < 0 ? `⚠️ **SCADUTA il ${formatDate(v.insurance.date)}**` : `scade il **${formatDate(v.insurance.date)}** (tra ${v.insurance.days} giorni)`;
        return `🔹 **${v.name}** (${v.plate}): ${status}`;
      }).join('\n');
      return {
        text: `🛡️ **Stato Assicurazione:**\n\n${resp}`,
        actions: k.vehicles.map(v => ({ label: `Scheda ${v.name}`, type: 'module', moduleId: v.module.id, module: v.module })),
      };
    }

    // Domanda mirata: Revisione
    if (lower.includes('revision')) {
      const resp = k.vehicles.map(v => {
        const status = v.revision.days < 0 ? `⚠️ **SCADUTA il ${formatDate(v.revision.date)}**` : `scade il **${formatDate(v.revision.date)}** (tra ${v.revision.days} giorni)`;
        return `🔹 **${v.name}** (${v.plate}): ${status}`;
      }).join('\n');
      return {
        text: `🔧 **Stato Revisione Ministeriale:**\n\n${resp}`,
        actions: k.vehicles.map(v => ({ label: `Scheda ${v.name}`, type: 'module', moduleId: v.module.id, module: v.module })),
      };
    }

    // Domanda mirata: Tagliando, Gomme, Interventi e Documenti allegati
    if (lower.includes('tagliando') || lower.includes('gomme') || lower.includes('pneumatic') || lower.includes('intervent') || lower.includes('allegat') || lower.includes('manutenzion')) {
      const resp = k.vehicles.map(v => {
        const docs = v.attachedDocs && v.attachedDocs.length > 0 ? v.attachedDocs.join(', ') : 'Nessun documento/fattura allegata';
        return `🔹 **${v.name}** (${v.plate}):\n  - Ultimo tagliando: **${v.serviceKm || 'N/D'} km** (attuali: ${v.km} km)\n  - Gomme installate a: **${v.tiresKm || 'N/D'} km**\n  - Documenti/fatture digitalizzate: **${docs}**`;
      }).join('\n\n');
      return {
        text: `🛠️ **Storico Manutenzione & Interventi:**\n\n${resp}`,
        actions: k.vehicles.map(v => ({ label: `Scheda ${v.name}`, type: 'module', moduleId: v.module.id, module: v.module })),
      };
    }

    // Panoramica veicoli completa
    let out = `🚗 **Riepilogo Veicoli Registrati (${k.vehicles.length}):**\n\n`;
    const actions: AiAction[] = [];

    k.vehicles.forEach(v => {
      out += `### **${v.name}** (Targa: \`${v.plate}\`)\n`;
      out += `- ⛽ Alimentazione: **${v.fuel.toUpperCase()}**\n`;
      out += `- 🛣️ Chilometri: **${v.km} km**\n`;
      out += `- 🛡️ Assicurazione: ${v.insurance.date ? `${formatDate(v.insurance.date)} (${v.insurance.days > 0 ? `tra ${v.insurance.days} gg` : 'SCADUTA'})` : 'Non inserita'}\n`;
      out += `- 🏷️ Bollo: ${v.tax.date ? `${formatDate(v.tax.date)} (${v.tax.days > 0 ? `tra ${v.tax.days} gg` : 'SCADUTO'})` : 'Non inserito'}\n`;
      out += `- 🔧 Revisione: ${v.revision.date ? `${formatDate(v.revision.date)} (${v.revision.days > 0 ? `tra ${v.revision.days} gg` : 'SCADUTA'})` : 'Non inserita'}\n`;
      if (v.serviceKm) out += `- 🛢️ Tagliando: a quota ${v.serviceKm} km\n`;
      if (v.tiresKm) out += `- 🛞 Pneumatici: montati a quota ${v.tiresKm} km\n`;
      out += `\n`;

      actions.push({
        label: `Scheda ${v.name}`,
        type: 'module',
        moduleId: v.module.id,
        module: v.module,
      });
    });

    return { text: out, actions };
  }

  // --- SEZIONE 2: DOCUMENTI ---
  const isDocToolIntent = (
    lower.includes('scanner') ||
    lower.includes('scansion') ||
    lower.includes('vinted') ||
    lower.includes('percentual') ||
    lower.includes('filtri') ||
    lower.includes('unisci pdf') ||
    lower.includes('ruota pdf') ||
    lower.includes('comprimi pdf')
  );

  if (
    !isDocToolIntent &&
    (
      lower.includes('document') ||
      lower.includes('patente') ||
      lower.includes('carta d\'identità') ||
      lower.includes('carta identita') ||
      lower.includes('passaporto') ||
      lower.includes('tessera sanitaria') ||
      lower.includes('codice fiscale') ||
      lower.includes('archivia')
    )
  ) {
    if (k.documents.length === 0) {
      return {
        text: `📄 Non hai ancora salvato documenti in Chelona.\n\nPuoi digitalizzare patenti, carte d'identità, passaporti e tessere sanitarie protette da crittografia toccando **"+"** → **Documento**!`,
        actions: [{ label: 'Nuovo Documento', type: 'category', category: 'document' }],
      };
    }

    // Richiesta mirata: Documenti scaduti
    if (lower.includes('scadut')) {
      const expiredDocs = k.documents.filter(d => d.isExpired);
      if (expiredDocs.length === 0) {
        return {
          text: `✅ Nessun documento risulta attualmente scaduto! Tutti i tuoi documenti personali sono in corso di validità.`,
          actions: [{ label: 'Tutti i Documenti', type: 'category', category: 'document' }],
        };
      }
      let out = `⚠️ **Documenti Scaduti Rilevati (${expiredDocs.length}):**\n\n`;
      expiredDocs.forEach(d => {
        out += `• ❌ **${d.title}**: scaduto il **${formatDate(d.expiryDate)}** (${Math.abs(d.days)} giorni fa)\n`;
      });
      return {
        text: out,
        actions: expiredDocs.map(d => ({ label: `Vedi ${d.title}`, type: 'module', moduleId: d.module.id, module: d.module })),
      };
    }

    if (
      lower.includes('apri') ||
      lower.includes('vai') ||
      lower.includes('mostra') ||
      lower.includes('vedi') ||
      lower.trim() === 'documenti' ||
      lower.trim() === 'i documenti'
    ) {
      const matchedDoc = k.documents.find(d => {
        const titleLower = d.title.toLowerCase();
        const typeLower = (d.docType || '').toLowerCase();
        if (lower.includes('patente') && (typeLower.includes('patente') || titleLower.includes('patente'))) return true;
        if ((lower.includes('identità') || lower.includes('identita')) && (typeLower.includes('identit') || titleLower.includes('identit'))) return true;
        if (lower.includes('passaporto') && (typeLower.includes('passaporto') || titleLower.includes('passaporto'))) return true;
        if ((lower.includes('tessera') || lower.includes('sanitaria') || lower.includes('fiscale')) && (typeLower.includes('sanitaria') || titleLower.includes('sanitaria') || titleLower.includes('fiscale'))) return true;
        return lower.includes(titleLower);
      });

      if (matchedDoc) {
        return {
          text: `Ti apro subito il documento **${matchedDoc.title}**! 📄`,
          autoAction: { label: `Vedi ${matchedDoc.title}`, type: 'module', moduleId: matchedDoc.module.id, module: matchedDoc.module },
          actions: [],
        };
      }

      return {
        text: `Ti mostro subito l'archivio dei tuoi documenti personali! 📄`,
        autoAction: { label: 'Documenti', type: 'category', category: 'document' },
        actions: [],
      };
    }

    let out = `📄 **Documenti Personali Archiviati (${k.documents.length}):**\n\n`;
    const actions: AiAction[] = [];

    k.documents.forEach(d => {
      const expStr = d.expiryDate
        ? d.isExpired
          ? `❌ **SCADUTO il ${formatDate(d.expiryDate)}**`
          : `✅ Scade il **${formatDate(d.expiryDate)}** (${d.days} gg rimanenti)`
        : 'Senza data di scadenza';

      out += `- **${d.title}** (${d.docType.toUpperCase()})\n`;
      if (d.number) out += `  └ Numero: \`${d.number}\`\n`;
      out += `  └ Scadenza: ${expStr}\n\n`;

      actions.push({
        label: `Vedi ${d.title}`,
        type: 'module',
        moduleId: d.module.id,
        module: d.module,
      });
    });

    return { text: out, actions: actions.slice(0, 3) };
  }

  // --- SEZIONE 3: SPESE CONDIVISE & SPLIT ("CHI DEVE A CHI") ---
  if (
    lower.includes('split') ||
    lower.includes('spese condivise') ||
    lower.includes('spesa condivisa') ||
    lower.includes('gruppo spese') ||
    lower.includes('gruppi spese') ||
    lower.includes('dividi spese') ||
    lower.includes('conti condivisi') ||
    lower.includes('chi deve a chi') ||
    lower.includes('quanto deve') ||
    lower.includes('cosa deve') ||
    lower.includes('chi deve') ||
    lower.includes('deve dare') ||
    lower.includes('deve ricevere') ||
    lower.includes('devo dare') ||
    lower.includes('devo ricevere') ||
    lower.includes('debito') ||
    lower.includes('debiti') ||
    lower.includes('credito') ||
    lower.includes('crediti') ||
    lower.includes('pareggio conti') ||
    lower.includes('salda conti') ||
    lower.includes('devo soldi') ||
    lower.includes('mi devono') ||
    lower.includes('chi deve pagare') ||
    (k.splits.some(sp => sp.participants.some(p => lower.includes(p.toLowerCase()))) && (lower.includes('deve') || lower.includes('debito') || lower.includes('credito') || lower.includes('dare') || lower.includes('soldi')))
  ) {
    if (k.splits.length === 0) {
      return {
        text: `👥 Non hai gruppi di **Spese Condivise (Split)** attivi.\n\nPuoi creare un gruppo con amici o coinquilini per dividere automaticamente uscite e calcolare "chi deve dare a chi" toccando **"+"** → **Spese & Conti**!`,
        actions: [{ label: 'Nuovo Gruppo Split', type: 'category', category: 'split' }],
      };
    }

    if (lower.includes('apri') || lower.includes('vai') || lower.trim() === 'split') {
      const sp = k.splits[0];
      return {
        text: `Ti apro subito il gruppo spese condivise **${sp.title}**! 👥`,
        autoAction: { label: `Apri ${sp.title}`, type: 'module', moduleId: sp.module.id, module: sp.module },
        actions: [],
      };
    }

    // Ricerca mirata debiti/crediti di una persona specifica o dell'utente
    let searchedPerson: string | null = null;
    for (const sp of k.splits) {
      for (const p of sp.participants) {
        const name = typeof p === 'string' ? p : (p as any)?.name;
        if (name && lower.includes(name.toLowerCase())) {
          searchedPerson = name;
          break;
        }
      }
      if (searchedPerson) break;
    }

    if (!searchedPerson && (lower.includes('devo io') || lower.includes('quanto devo') || lower.includes('i miei debiti') || lower.includes('miei crediti'))) {
      if (username) searchedPerson = username;
    }

    if (searchedPerson) {
      let out = `👥 **Riepilogo Debiti & Crediti per ${searchedPerson}:**\n\n`;
      let hasMovements = false;
      const targetLower = searchedPerson.toLowerCase();
      k.splits.forEach(sp => {
        const owes = sp.settlements.filter(s => s.from && s.from.toLowerCase() === targetLower);
        const owed = sp.settlements.filter(s => s.to && s.to.toLowerCase() === targetLower);
        if (owes.length > 0 || owed.length > 0) {
          hasMovements = true;
          out += `📌 Nel gruppo **${sp.title}**:\n`;
          owes.forEach(s => {
            out += `• 💸 Deve dare **€ ${s.amount.toFixed(2)}** a **${s.to}**\n`;
          });
          owed.forEach(s => {
            out += `• 💰 Deve ricevere **€ ${s.amount.toFixed(2)}** da **${s.from}**\n`;
          });
          out += `\n`;
        }
      });

      if (!hasMovements) {
        out += `✨ **${searchedPerson}** è perfettamente in pareggio nei gruppi spese condivise, nessun debito o credito registrato!\n`;
      }

      return {
        text: out,
        actions: k.splits.map(sp => ({ label: `Gruppo ${sp.title}`, type: 'module', moduleId: sp.module.id, module: sp.module })),
      };
    }

    let out = `👥 **Spese Condivise & Bilancio ("Chi deve a chi"):**\n\n`;
    const actions: AiAction[] = [];

    k.splits.forEach(sp => {
      out += `### 📌 Gruppo **${sp.title}**\n`;
      out += `- Totale speso nel gruppo: **${sp.totalAmount.toFixed(2)} ${sp.currency}** (${sp.expensesCount} spese registrate)\n`;
      out += `- Partecipanti: ${sp.participants.join(', ')}\n\n`;

      if (sp.settlements.length > 0) {
        out += `**Saldo e trasferimenti necessari:**\n`;
        sp.settlements.forEach(s => {
          out += `• 💸 **${s.from}** deve dare **€ ${s.amount.toFixed(2)}** a **${s.to}**\n`;
        });
      } else {
        out += `✨ *Tutti i partecipanti sono in pareggio esatto, nessun debito pendente!*\n`;
      }
      out += `\n`;

      actions.push({
        label: `Gestisci ${sp.title}`,
        type: 'module',
        moduleId: sp.module.id,
        module: sp.module,
      });
    });

    return { text: out, actions };
  }

  // --- SEZIONE 4: SPESA SINGOLA & USCITE ---
  if (
    lower.includes('spesa singola') ||
    lower.includes('spese singole') ||
    lower.includes('scontrin') ||
    lower.includes('quanto ho speso') ||
    lower.includes('uscite mensili') ||
    lower.includes('totale spese') ||
    lower.includes('categoria di spesa') ||
    lower.includes('spese per categoria') ||
    (lower.includes('uscite') && !lower.includes('autostrada'))
  ) {
    if (k.expenses.count === 0) {
      return {
        text: `💳 Non hai ancora registrato spese singole.\n\nPuoi segnare scontrini e uscite quotidiane dicendomi ad esempio *"Aggiungi spesa di 15 euro per pranzo"* o toccando **"+"** → **Spesa Singola**!`,
        actions: [{ label: 'Nuova Spesa', type: 'category', category: 'single-expense' }],
      };
    }

    if (lower.includes('apri') || lower.includes('vai') || lower.trim() === 'spese singole') {
      return {
        text: `Ti porto subito alla gestione delle spese singole! 💳`,
        autoAction: { label: 'Spese Singole', type: 'category', category: 'single-expense' },
        actions: [],
      };
    }

    // Domanda mirata: Spesa per specifica categoria
    const catKeys = Object.keys(k.expenses.byCategory);
    const matchedCat = catKeys.find(c => lower.includes(c.toLowerCase()));
    if (matchedCat) {
      const totalCat = k.expenses.byCategory[matchedCat] || 0;
      const matchingRecent = k.expenses.recent.filter(e => e.category.toLowerCase() === matchedCat.toLowerCase());
      let catText = `💳 Per la categoria **${matchedCat}** hai registrato una spesa complessiva di **€ ${totalCat.toFixed(2)}**.\n\n`;
      if (matchingRecent.length > 0) {
        catText += `Ultime spese in questa categoria:\n`;
        matchingRecent.forEach(e => {
          catText += `• ${e.title}: **€ ${e.amount.toFixed(2)}** (${formatDate(e.date)})\n`;
        });
      }
      return {
        text: catText,
        actions: [{ label: 'Tutte le Spese Singole', type: 'category', category: 'single-expense' }],
      };
    }

    // Domanda mirata: Spese questo mese
    if (lower.includes('questo mese') || lower.includes('mese corrente') || lower.includes('quest\'mese')) {
      return {
        text: `💳 Questo mese hai speso complessivamente **€ ${k.expenses.totalThisMonth.toFixed(2)}**.\nTotale storico registrato: **€ ${k.expenses.allTimeTotal.toFixed(2)}** (${k.expenses.count} transazioni).`,
        actions: [{ label: 'Apri Spese Singole', type: 'category', category: 'single-expense' }],
      };
    }

    let out = `💳 **Riepilogo Spese Singole & Uscite:**\n\n`;
    out += `- 📅 Spese registrate questo mese: **€ ${k.expenses.totalThisMonth.toFixed(2)}**\n`;
    out += `- 📊 Totale storico complessivo: **€ ${k.expenses.allTimeTotal.toFixed(2)}** (${k.expenses.count} transazioni)\n\n`;

    if (catKeys.length > 0) {
      out += `**Suddivisione per categoria:**\n`;
      catKeys.forEach(c => {
        out += `• **${c}**: € ${k.expenses.byCategory[c].toFixed(2)}\n`;
      });
      out += `\n`;
    }

    if (k.expenses.recent.length > 0) {
      out += `**Ultime spese registrate:**\n`;
      k.expenses.recent.forEach(e => {
        out += `• ${e.title}: **€ ${e.amount.toFixed(2)}** (${formatDate(e.date)} - ${e.category})\n`;
      });
    }

    return {
      text: out,
      actions: [{ label: 'Apri Spese Singole', type: 'category', category: 'single-expense' }],
    };
  }

  // --- SEZIONE 5: RATE & FINANZIAMENTI ---
  if (
    /\brate\b|\brata\b|\brateizzaz/i.test(lower) ||
    lower.includes('finanziament') ||
    lower.includes('piano rateale') ||
    lower.includes('rate attive') ||
    lower.includes('prossima rata') ||
    lower.includes('scadenza rata') ||
    lower.includes('totale residuo rate') ||
    lower.includes('quanto mi manca da pagare')
  ) {
    if (k.installments.modules.length === 0) {
      return {
        text: `🗓️ Non hai rateizzazioni o finanziamenti attivi.\n\nPuoi pianificare qualsiasi acquisto a rate, tenendo traccia dell'importo mensile e delle scadenze toccando **"+"** → **Finanziamento**!`,
        actions: [{ label: 'Aggiungi Finanziamento', type: 'category', category: 'installments' }],
      };
    }

    if (lower.includes('apri') || lower.includes('vai') || lower.trim() === 'rate') {
      const inst = k.installments.modules[0];
      return {
        text: `Ti apro subito il piano rateale **${inst.title}**! 🗓️`,
        autoAction: { label: `Piano ${inst.title}`, type: 'module', moduleId: inst.module.id, module: inst.module },
        actions: [],
      };
    }

    // Domanda mirata: Quanto pago al mese / Rata mensile
    if (lower.includes('al mese') || lower.includes('mensil') || lower.includes('ogni mese') || lower.includes('quanto pago')) {
      const monthlyTotal = k.installments.modules.reduce((sum, inst) => sum + (inst.nextPayment?.amount || 0), 0);
      let out = `🗓️ Il totale delle tue rate imminenti è di **€ ${monthlyTotal.toFixed(2)} / mese**:\n\n`;
      k.installments.modules.forEach(inst => {
        if (inst.nextPayment) {
          out += `• **${inst.title}**: **€ ${inst.nextPayment.amount.toFixed(2)}** (prossima scadenza: ${formatDate(inst.nextPayment.dueDate)})\n`;
        } else {
          out += `• **${inst.title}**: tutte le rate previste risultano saldate!\n`;
        }
      });
      out += `\nDebito residuo complessivo: **€ ${k.installments.totalPending.toFixed(2)}**.`;
      return {
        text: out,
        actions: k.installments.modules.map(inst => ({ label: `Piano ${inst.title}`, type: 'module', moduleId: inst.module.id, module: inst.module })),
      };
    }

    let out = `🗓️ **Stato Rate & Finanziamenti Attivi:**\n\n`;
    out += `💰 **Debito totale residuo da estinguere**: **€ ${k.installments.totalPending.toFixed(2)}**\n`;
    out += `✅ Già rimborsati: **€ ${k.installments.paidTotal.toFixed(2)}**\n\n`;

    const actions: AiAction[] = [];

    k.installments.modules.forEach(inst => {
      out += `### **${inst.title}**\n`;
      out += `- Avanzamento: **${inst.paidCount} su ${inst.totalCount} rate pagate**\n`;
      out += `- Importo totale: **€ ${inst.target.toFixed(2)}** (Residuo: € ${inst.remainingAmount.toFixed(2)})\n`;
      if (inst.nextPayment) {
        out += `- ⏳ Prossima rata: **€ ${inst.nextPayment.amount.toFixed(2)}** il ${formatDate(inst.nextPayment.dueDate)} (${inst.nextPayment.days > 0 ? `tra ${inst.nextPayment.days} giorni` : 'SCADUTA'})\n`;
      }
      out += `\n`;

      actions.push({
        label: `Gestisci ${inst.title}`,
        type: 'module',
        moduleId: inst.module.id,
        module: inst.module,
      });
    });

    return { text: out, actions };
  }

  // --- SEZIONE 6: VOLANTINI & SCONTI ---
  const liveDb = getLiveVolantiniDb();
  const matchedChain = detectRequestedChain(query, liveDb.chains);

  const isVolantiniIntent = (
    lower.includes('volantin') ||
    lower.includes('offert') ||
    lower.includes('scont') ||
    lower.includes('promo') ||
    lower.includes('convenien') ||
    lower.includes('convien') ||
    lower.includes('miglior') ||
    lower.includes('risparmio') ||
    lower.includes('risparmi') ||
    lower.includes('coupon') ||
    lower.includes('prezz') ||
    lower.includes('costa meno') ||
    lower.includes('chi ha') ||
    lower.includes('dove trovo') ||
    ((lower.includes('supermercat') || lower.includes('catene')) && (lower.includes('offert') || lower.includes('scont') || lower.includes('promo') || lower.includes('prezz'))) ||
    (matchedChain !== null && (lower.includes('volantin') || lower.includes('scont') || lower.includes('offert') || lower.includes('apri') || lower.includes('mostra') || lower.includes('sfoglia')))
  );

  if (isVolantiniIntent) {
    const actions: AiAction[] = [];

    if (matchedChain) {
      const { chain, displayName } = matchedChain;
      const wantsDirectOpen = (
        lower.includes('apri') ||
        lower.includes('sfoglia') ||
        lower.includes('mostra') ||
        lower.includes('vedi') ||
        lower.includes('vai') ||
        lower.includes('volantin') ||
        lower.trim() === displayName.toLowerCase() ||
        lower.trim() === chain.slug.toLowerCase()
      );

      if (wantsDirectOpen) {
        return {
          text: `Ti apro subito il volantino di **${displayName}**! 🛒`,
          autoAction: {
            label: `Apri Volantino ${displayName}`,
            type: 'volantino',
            chainSlug: chain.slug,
            storeName: displayName,
          },
          actions: [],
        };
      }

      const activeFlyers = chain.flyers.filter(f => !f.to || new Date(f.to) >= new Date());
      const flyer = (activeFlyers.length ? activeFlyers : chain.flyers)[0];

      let text = `Ecco il volantino per **${displayName}** 🛒\n\n`;
      if (flyer) {
        const expiry = getFlyerExpiryInfo(flyer);
        text += `📖 **${flyer.title}**\n`;
        if (flyer.subtitle) text += `*${flyer.subtitle}*\n`;
        text += `⏳ **Validità**: ${expiry.label}\n\n`;
      } else {
        text += `Catalogo e offerte sempre aggiornati in tempo reale.\n\n`;
      }

      text += `Tocca in basso per sfogliare il volantino a schermo intero!`;

      actions.push({
        label: `Apri Volantino ${displayName}`,
        type: 'volantino',
        chainSlug: chain.slug,
        storeName: displayName,
      });

      actions.push({
        label: 'Tutti i Volantini',
        type: 'volantino',
      });

      return { text, actions };
    }

    // 1. Apertura diretta Sezione Confronta Prezzi
    if (lower.includes('confronta') || lower.includes('comparat') || lower.includes('statistiche prezz')) {
      return {
        text: `Ti apro subito il confronto prezzi nazionale per trovare i prodotti più convenienti! 📊`,
        autoAction: { label: 'Confronta Prezzi', type: 'volantino', chainSlug: 'stats' },
        actions: [],
      };
    }

    // 2. Ricerca prodotti specifici in offerta (es. "caffè", "pasta", "tonno", "olio")
    const VOLANTINI_STOPWORDS = new Set([
      'chi', 'ha', 'la', 'il', 'lo', 'le', 'gli', 'dei', 'del', 'della', 'delle', 'degli',
      'cosa', 'dove', 'trovo', 'costa', 'meno', 'sconti', 'sconto', 'offerte', 'offerta',
      'volantino', 'volantini', 'miglior', 'migliore', 'migliori', 'conveniente', 'convenienti',
      'conviene', 'prezzo', 'prezzi', 'quali', 'quale', 'sono', 'un', 'una', 'uno', 'ci',
      'c', 'è', 'ce', 'comprare', 'prendere', 'vedere', 'mostra', 'mostrami', 'trova', 'trovami',
      'dimmi', 'sapere', 'consigli', 'consigliami', 'oggi', 'adesso', 'supermercato', 'supermercati'
    ]);

    const cleanTokens = query.toLowerCase()
      .replace(/[?!,.:;()"]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length >= 3 && !VOLANTINI_STOPWORDS.has(t));

    let matchedOffers: OfferEntry[] = [];
    let searchedKeyword = '';

    for (const tok of cleanTokens) {
      const found = findOffersForName(tok);
      if (found.length > 0) {
        matchedOffers = found;
        searchedKeyword = tok;
        break;
      }
    }

    if (matchedOffers.length > 0) {
      const best = matchedOffers[0];
      const others = matchedOffers.slice(1, 4);

      let text = `Ho esaminato i volantini e il confronto prezzi per **"${searchedKeyword.toUpperCase()}"** 🔍\n\n`;
      text += `🥇 **Miglior Prezzo**: da **${best.s}** a **€ ${best.p.toFixed(2)}**\n`;
      text += `   *${best.n}* (${best.b}) — ${best.q} ${best.u} (€ ${(best.p / best.q).toFixed(2)}/${best.u}) · *Pagina ${typeof best.pg === 'number' ? best.pg + 1 : 1}*\n\n`;

      if (others.length > 0) {
        text += `Alternative rilevate:\n`;
        others.forEach(o => {
          text += `• **${o.s}**: € ${o.p.toFixed(2)} (*${o.n}*, ${o.q} ${o.u}) · *Pag. ${typeof o.pg === 'number' ? o.pg + 1 : 1}*\n`;
        });
        text += `\n`;
      }

      const bestPage = typeof best.pg === 'number' ? best.pg + 1 : 1;
      const chainSlug = STORE_SLUG_MAP[best.s] || best.s.toLowerCase();
      actions.push({ 
        label: `Apri Volantino ${best.s} (Pag. ${bestPage})`, 
        type: 'volantino', 
        storeName: best.s,
        chainSlug,
        flyerId: best.fid,
        page: bestPage
      });
      actions.push({ label: 'Confronta Tutti i Prezzi', type: 'volantino', chainSlug: 'stats' });
      actions.push({ label: 'Tutti i Volantini', type: 'volantino' });

      return { text, actions };
    }

    // 3. Richiesta "le migliori offerte" / "offerte più convenienti" / "cosa conviene"
    // Si basa sulla sezione Confronta Prezzi, selezionando solo quelle convenienti con il massimo risparmio!
    const isBestDealsRequest = (
      lower.includes('miglior') ||
      lower.includes('convenient') ||
      lower.includes('piu conveniente') ||
      lower.includes('più conveniente') ||
      lower.includes('cosa conviene') ||
      lower.includes('dove conviene') ||
      lower.includes('super offerte') ||
      lower.includes('prezzo migliore') ||
      lower.includes('prezzi migliori') ||
      lower.includes('affar') ||
      lower.includes('risparmi') ||
      lower.includes('top offerte')
    );

    if (isBestDealsRequest) {
      const topDeals = getBestConvenientDeals(5);

      let text = `Ho analizzato la sezione **Confronta Prezzi** e selezionato **solo le offerte più convenienti** con il massimo risparmio rispetto alla media dei supermercati: 🏷️✨\n\n`;

      topDeals.forEach(deal => {
        text += `• ${deal.emoji} **${deal.productName}** (${deal.store})\n`;
        text += `   Prezzo: **€ ${deal.price.toFixed(2)}** · 🔥 **-${deal.savingPct}%** sotto la media · *Pagina ${deal.page}*\n\n`;
      });

      text += `Tocca un prezzo in basso per aprire subito il volantino alla pagina esatta!`;

      // Azioni dirette con pagina esatta per ciascuna offerta conveniente
      topDeals.forEach(deal => {
        const shortName = deal.productName.length > 20 ? deal.productName.slice(0, 20).trim() + '…' : deal.productName;
        actions.push({
          label: `${deal.store}: ${shortName} (Pag. ${deal.page})`,
          type: 'volantino',
          storeName: deal.store,
          chainSlug: deal.chainSlug,
          flyerId: deal.fid,
          page: deal.page,
        });
      });

      actions.push({
        label: '📊 Apri Confronta Prezzi',
        type: 'volantino',
        chainSlug: 'stats',
      });

      actions.push({
        label: '🛒 Tutti i Volantini',
        type: 'volantino',
      });

      return { text, actions };
    }

    // 4. "Quando chiedo le offerte vorrei che mi rimandi a tutti i volantini"
    // Per richieste generiche di offerte/volantini (es. "offerte", "ci sono offerte?", "mostrami le offerte", "volantini", "sconti"):
    // Rimanda direttamente a tutti i volantini tramite autoAction!
    return {
      text: `Ti porto subito a **tutti i volantini** e le offerte attive dei supermercati! 🛒\n\nPuoi sfogliare tutte le catene nazionali e locali oppure chiedermi le **migliori offerte** per vedere solo quelle più convenienti.`,
      autoAction: { label: 'Tutti i Volantini', type: 'volantino' },
      actions: [
        { label: '🛒 Tutti i Volantini', type: 'volantino' },
        { label: '🏷️ Le Migliori Offerte', type: 'volantino', chainSlug: 'stats' },
        { label: '📊 Confronta Prezzi', type: 'volantino', chainSlug: 'stats' },
      ],
    };
  }

  // --- SEZIONE 7: LISTA DELLA SPESA & SUPERMERCATO ---
  if (
    lower.includes('lista spesa') ||
    lower.includes('lista della spesa') ||
    lower.includes('cosa comprare') ||
    lower.includes('cosa manca') ||
    lower.includes('articoli da comprare') ||
    lower.includes('spunte spesa') ||
    lower.includes('già comprat') ||
    lower.includes('gia comprat') ||
    (lower.includes('supermercat') && !lower.includes('volantin') && !lower.includes('offert') && !lower.includes('scont'))
  ) {
    if (lower.includes('apri') || lower.includes('vai') || lower.trim() === 'lista spesa' || lower.trim() === 'spesa') {
      return {
        text: `Ti apro subito la tua Lista della Spesa! 🛒`,
        autoAction: { label: 'Lista Spesa', type: 'category', category: 'supermarket' },
        actions: [],
      };
    }

    // Domanda mirata: Articoli già acquistati / spuntati
    if (lower.includes('già comprat') || lower.includes('gia comprat') || lower.includes('comprato') || lower.includes('preso') || lower.includes('spuntat') || lower.includes('carrello')) {
      if (!k.supermarket || k.supermarket.checkedItems.length === 0) {
        return {
          text: `🛒 Non hai ancora spuntato nessun articolo come acquistato nella tua lista della spesa.`,
          actions: [{ label: 'Apri Lista Spesa', type: 'category', category: 'supermarket' }],
        };
      }
      const checked = k.supermarket.checkedItems.map(i => `• [x] ~~${i}~~`).join('\n');
      return {
        text: `🛒 **Articoli già acquistati / spuntati (${k.supermarket.checkedItems.length}):**\n\n${checked}\n\n*Ci sono ancora ${k.supermarket.itemsToBuy.length} articoli da acquistare.*`,
        autoAction: { label: 'Lista Spesa', type: 'category', category: 'supermarket' },
        actions: [{ label: 'Vai alla Spesa', type: 'category', category: 'supermarket' }],
      };
    }

    if (!k.supermarket || k.supermarket.itemsToBuy.length === 0) {
      return {
        text: `🛒 La tua **Lista della Spesa** è attualmente vuota o hai già spuntato tutti gli articoli!\n\nPuoi dirmi ad esempio *"Aggiungi latte, caffè e uova alla spesa"* per inserire prodotti all'istante.`,
        actions: [{ label: 'Apri Lista Spesa', type: 'category', category: 'supermarket' }],
      };
    }

    const items = k.supermarket.itemsToBuy.map(i => `• [ ] ${i}`).join('\n');
    return {
      text: `🛒 **Articoli ancora da acquistare (${k.supermarket.itemsToBuy.length}):**\n\n${items}\n\n*Puoi dirmi "Aggiungi pane alla spesa" per aggiungere altro!*`,
      autoAction: { label: 'Lista Spesa', type: 'category', category: 'supermarket' },
      actions: [{ label: 'Vai alla Spesa', type: 'category', category: 'supermarket' }],
    };
  }

  // --- SEZIONE 8: RICETTE & CUCINA ---
  if (
    lower.includes('ricett') ||
    lower.includes('cucina') ||
    lower.includes('cucinare') ||
    lower.includes('cosa cucino') ||
    lower.includes('cosa preparo') ||
    lower.includes('dispensa') ||
    lower.includes('frigo') ||
    lower.includes('freezer') ||
    lower.includes('ricettario') ||
    (lower.includes('piatt') && (lower.includes('primo') || lower.includes('secondo') || lower.includes('preparare')))
  ) {
    if (lower.includes('apri') || lower.includes('vai') || lower.trim() === 'ricette' || lower.trim() === 'ricettario') {
      return {
        text: `Ti porto subito al tuo Ricettario Personale! 🍲`,
        autoAction: { label: 'Ricettario', type: 'recipes' },
        actions: [],
      };
    }

    // Ricerca ricetta specifica
    const hasConversationalJunk = 
      lower.includes('per il pranzo') || lower.includes('per la cena') || lower.includes('di domani') ||
      lower.includes('consigli') || lower.includes('idee') || lower.includes('a base di') ||
      lower.includes('un ingrediente') || lower.includes('un igrediente') || lower.includes('un ingrandiente') ||
      lower.includes('ingrand') || lower.includes('ingred') || lower.includes('igred') ||
      lower.includes('che devo') || lower.includes('cosa fare');
    if (!lower.includes('cosa cucino') && !lower.includes('cosa ho') && !hasConversationalJunk && (lower.includes('ricett') || lower.includes('come fare') || lower.includes('cerca') || lower.includes('trova'))) {
      const catalog = await getOrLoadAllRecipes();
      const specificDish = searchRecipeByDishTitle(query, catalog);
      if (specificDish) {
        return {
          ...formatSingleRecipeResponse(specificDish),
          engineUsed: 'chelona-engine',
        };
      }
      return {
        text: `Non ho trovato una ricetta corrispondente nel ricettario. Puoi consultare l'archivio con oltre 600 piatti o chiedermi ricette in base agli ingredienti che hai! 🍲`,
        actions: [{ label: '📖 Sfoglia Ricettario', type: 'recipes' }],
      };
    }

    // Ingredienti in frigo / dispensa
    const askingForFridge = lower.includes('frigo') || lower.includes('dispensa') || lower.includes('cosa ho') || (lower.includes('ingredienti') && !lower.includes('ricett') && !lower.includes('cucin'));
    if (askingForFridge) {
      const fridge = k.recipes.fridgeIngredients;
      const pantry = k.recipes.pantryIngredients;
      const combined = [...fridge, ...pantry];

      if (combined.length > 0) {
        const foodEntities = extractFoodEntities(combined.join(', '));
        if (foodEntities.length > 0) {
          const catalog = await getOrLoadAllRecipes();
          const matches = matchRecipesByIngredients(foodEntities, catalog);
          if (matches.length > 0) {
            const formatted = formatRecipeMatchResponse(foodEntities, matches);
            return {
              text: `❄️ **Con ciò che hai registrato nel Frigo e nella Dispensa (${combined.join(', ')}):**\n\n${formatted.text}`,
              actions: formatted.actions,
              engineUsed: 'chelona-engine',
            };
          }
        }
      }

      let out = `🧑‍🍳 **Ingredienti disponibili registrati:**\n\n`;
      if (fridge.length > 0) out += `❄️ **Nel Frigo**: ${fridge.join(', ')}\n`;
      if (pantry.length > 0) out += `🏺 **In Dispensa**: ${pantry.join(', ')}\n`;

      if (fridge.length === 0 && pantry.length === 0) {
        out += `Non hai ancora segnato ingredienti in frigo o dispensa. Puoi farlo dalla sezione Ricette!\n`;
      } else {
        out += `\n💡 Con questi ingredienti puoi cucinare un primo veloce o personalizzare il menù settimanale!`;
      }

      return {
        text: out,
        actions: [{ label: 'Apri Ricette & Frigo', type: 'recipes' }],
      };
    }

    // Panoramica ricettario
    let out = `🍲 **Ricettario & Pianificatore Menù:**\n\n`;
    out += `- 📖 Ricette salvate e create: **${k.recipes.customCount}**\n`;
    out += `- ⭐ Piatti preferiti: **${k.recipes.favoritesCount}**\n`;
    out += `- 🥗 Ingredienti censiti (frigo/dispensa): **${k.recipes.allIngredients.length}**\n\n`;

    if (k.recipes.customList.length > 0) {
      out += `**Alcune delle tue ricette:**\n`;
      k.recipes.customList.slice(0, 3).forEach(r => {
        out += `• **${r.title}** (${r.category})\n`;
      });
      out += `\n`;
    }

    out += `Puoi chiedermi ad esempio *"Cosa ho nel frigo?"* o *"Cerca ricetta carbonara"*!`;

    return {
      text: out,
      actions: [{ label: 'Apri Ricettario', type: 'recipes' }],
    };
  }

  // --- SEZIONE 9: FITNESS & ALLENAMENTO ---
  if (
    lower.includes('fitness') ||
    lower.includes('allenament') ||
    lower.includes('scheda allenamento') ||
    lower.includes('schede') ||
    lower.includes('palestra') ||
    lower.includes('eserciz') ||
    lower.includes('serie') ||
    lower.includes('ripetizion') ||
    lower.includes('workout') ||
    lower.includes('dieta') ||
    lower.includes('diario sportivo') ||
    lower.includes('calorie') ||
    lower.includes('fabbisogno calorico') ||
    lower.includes('piano alimentare') ||
    lower.includes('partner fitness') ||
    ((lower.includes('mangiare') || lower.includes('pasto') || lower.includes('pasti')) && !lower.includes('cucin') && !lower.includes('ricett') && !lower.includes('frigo') && !lower.includes('dispensa'))
  ) {
    if (!k.fitness) {
      return {
        text: `🏋️ Non hai ancora configurato la sezione **Fitness & Dieta**.\n\nPuoi generare schede di allenamento mirate, piani nutrizionali e monitorare i tuoi workout toccando **"+"** → **Fitness & Dieta**!`,
        actions: [{ label: 'Configura Fitness', type: 'category', category: 'fitness' }],
      };
    }

    if (lower.includes('apri') || lower.includes('vai') || lower.trim() === 'fitness') {
      return {
        text: `Ti apro subito la tua scheda Fitness & Dieta! 🏋️`,
        autoAction: { label: 'Scheda Fitness', type: 'module', moduleId: k.fitness.module.id, module: k.fitness.module },
        actions: [],
      };
    }

    // Domanda mirata: Cosa mangiare / Piano alimentare / Pasti
    if (
      lower.includes('mangiare') ||
      lower.includes('pasto') ||
      lower.includes('pasti') ||
      lower.includes('dieta') ||
      lower.includes('nutrizion') ||
      lower.includes('piano alimentare') ||
      lower.includes('menù fitness') ||
      lower.includes('menu fitness')
    ) {
      if (k.fitness.weeklyMeals && k.fitness.weeklyMeals.length > 0) {
        // Verifica se è stato richiesto un giorno specifico
        const daysOfWeek = ['lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato', 'domenica', 'lunedi', 'martedi', 'mercoledi', 'giovedi', 'venerdi'];
        const matchedDay = daysOfWeek.find(d => lower.includes(d));
        if (matchedDay) {
          const normDay = matchedDay.replace('i', 'ì').replace('ìì', 'ì');
          const specificDay = k.fitness.weeklyMeals.find(d => d.dayLabel.toLowerCase().includes(matchedDay) || d.dayLabel.toLowerCase().includes(normDay));
          if (specificDay) {
            let out = `🥗 **Pasti previsti per ${specificDay.dayLabel}:**\n\n`;
            specificDay.meals.forEach((m: string) => { out += `• ${m}\n`; });
            if (k.fitness.calories) out += `\nTarget calorico giornaliero: **${k.fitness.calories} kcal**.\n`;
            return {
              text: out,
              actions: [{ label: 'Apri Scheda Fitness', type: 'module', moduleId: k.fitness.module.id, module: k.fitness.module }],
            };
          }
        }

        let mealOut = `🥗 **Il tuo Piano Nutrizionale & Pasti Programmato:**\n\n`;
        k.fitness.weeklyMeals.forEach(day => {
          mealOut += `### 📅 **${day.dayLabel}**\n`;
          if (day.meals.length === 0) {
            mealOut += `  *(Nessun pasto configurato per questo giorno)*\n`;
          } else {
            day.meals.forEach((m: string) => {
              mealOut += `  • ${m}\n`;
            });
          }
          mealOut += `\n`;
        });
        if (k.fitness.calories) {
          mealOut += `🔥 Fabbisogno calorico target: **${k.fitness.calories} kcal/giorno**.\n`;
        }
        return {
          text: mealOut,
          actions: [{ label: 'Apri Scheda Fitness', type: 'module', moduleId: k.fitness.module.id, module: k.fitness.module }],
        };
      } else {
        return {
          text: `🥗 Nel tuo modulo Fitness non è ancora stato compilato un piano alimentare dettagliato giorno per giorno.\n\nTarget calorico: **${k.fitness.calories || 2000} kcal/giorno**.\nTocca in basso per configurare o generare la dieta con l'AI!`,
          actions: [{ label: 'Apri Scheda Fitness', type: 'module', moduleId: k.fitness.module.id, module: k.fitness.module }],
        };
      }
    }

    // Domanda mirata: Esercizi / Routine / Scheda allenamento
    if (lower.includes('eserciz') || lower.includes('scheda allenamento') || lower.includes('workout') || lower.includes('serie') || lower.includes('ripetizion') || lower.includes('routine')) {
      if (k.fitness.workoutRoutines.length > 0) {
        let routOut = `🏋️ **La tua Scheda di Allenamento (${k.fitness.workoutRoutines.length} sessioni):**\n\n`;
        k.fitness.workoutRoutines.forEach(r => {
          routOut += `### 💥 **${r.dayLabel}** (*${r.focus}*)\n`;
          r.exercises.forEach(e => {
            routOut += `  • ${e}\n`;
          });
          routOut += `\n`;
        });
        return {
          text: routOut,
          actions: [{ label: 'Apri Scheda Fitness', type: 'module', moduleId: k.fitness.module.id, module: k.fitness.module }],
        };
      }
    }

    let out = `💪 **Il tuo Profilo Fitness & Nutrizione:**\n\n`;
    out += `- 🎯 Obiettivo: **${k.fitness.goal?.toUpperCase() || 'Forma fisica'}**\n`;
    if (k.fitness.weight) out += `- ⚖️ Peso attuale: **${k.fitness.weight} kg** (Altezza: ${k.fitness.height} cm)\n`;
    if (k.fitness.calories) out += `- 🔥 Fabbisogno calorico target: **${k.fitness.calories} kcal/giorno**\n`;
    if (k.fitness.workoutDays) out += `- 🗓️ Frequenza settimanale: **${k.fitness.workoutDays} giorni**\n`;

    if (k.fitness.workoutRoutines.length > 0) {
      out += `\n**Scheda di allenamento:**\n`;
      k.fitness.workoutRoutines.slice(0, 3).forEach(r => {
        out += `• **${r.dayLabel}** (*${r.focus}*): ${r.exercises.slice(0, 3).join(', ')}${r.exercises.length > 3 ? '...' : ''}\n`;
      });
    }

    if (k.fitness.partnerName) {
      out += `\n👥 Scheda partner attiva per **${k.fitness.partnerName}** (${k.fitness.partnerGoal || 'allenamento'}).`;
    }

    return {
      text: out,
      actions: [{ label: 'Apri Scheda Completa', type: 'module', moduleId: k.fitness.module.id, module: k.fitness.module }],
    };
  }

  // --- SEZIONE 10: VIAGGI & ITINERARI ---
  if (
    lower.includes('viaggi') ||
    lower.includes('viaggio') ||
    lower.includes('itinerari') ||
    lower.includes('itinerario') ||
    lower.includes('mete') ||
    lower.includes('destinazion') ||
    lower.includes('mete di viaggio') ||
    lower.includes('tappe') ||
    lower.includes('valigia') ||
    lower.includes('checklist valigia') ||
    lower.includes('vacanz') ||
    lower.includes('posti da vedere')
  ) {
    if (lower.includes('apri') || lower.includes('vai') || lower.trim() === 'viaggi') {
      return {
        text: `Ti apro subito la schermata Viaggi & Itinerari col Globo 3D! ✈️`,
        autoAction: { label: 'Viaggi', type: 'category', category: 'travel' },
        actions: [],
      };
    }

    if (lower.includes('valigia') || lower.includes('checklist')) {
      return {
        text: `🧳 **Checklist Rapida per la Valigia:**\n\n- 📄 Documenti: Carta d'identità/passaporto, patente, prenotazioni, biglietti\n- 🔌 Elettronica: Caricatore smartphone, power bank, adattatore prese\n- 💊 Salute: Medicinali essenziali, cerotti, antidolorifico personale\n- 👕 Abbigliamento: Capi a strati, scarpe comode, giacca antivento/pioggia\n- 🧴 Igiene: Spazzolino, dentifricio, travel size liquidi`,
        actions: [{ label: 'Apri Viaggi', type: 'category', category: 'travel' }],
      };
    }

    if (k.travel.destinationsCount === 0) {
      return {
        text: `✈️ Non hai ancora aggiunto tappe o destinazioni di viaggio in Chelona.\n\nPuoi salvare tappe geografiche, mappe sul Globo 3D e itinerari toccando **"+"** → **Viaggi**!`,
        actions: [{ label: 'Aggiungi Viaggio', type: 'category', category: 'travel' }],
      };
    }

    let out = `✈️ **I tuoi Viaggi & Itinerari:**\n\n`;
    out += `- 🌍 Destinazioni salvate: **${k.travel.destinationsCount}** in **${k.travel.nations.length} nazioni** (${k.travel.nations.join(', ') || 'Varie'})\n\n`;
    out += `**Tappe principali:**\n`;
    k.travel.destinations.slice(0, 5).forEach(d => {
      out += `• **${d.name}** ${d.city ? `(${d.city}, ${d.nation || ''})` : ''} — *${d.type === 'itinerary' ? 'Tappa itinerario' : 'Luogo da visitare'}*\n`;
    });

    return {
      text: out,
      actions: [{ label: 'Apri Globo Viaggi', type: 'category', category: 'travel' }],
    };
  }

  // --- SEZIONE 11: CASA & ARREDO ---
  if (
    lower.includes('casa') ||
    lower.includes('arredo') ||
    lower.includes('arredament') ||
    lower.includes('mobili') ||
    lower.includes('mobile') ||
    lower.includes('stanze') ||
    lower.includes('stanza') ||
    lower.includes('misure mobili') ||
    lower.includes('preventivo mobili') ||
    lower.includes('costi preventivi') ||
    lower.includes('salone') ||
    lower.includes('cucina arredo') ||
    lower.includes('camera da letto')
  ) {
    if (lower.includes('apri') || lower.includes('vai') || lower.trim() === 'casa' || lower.trim() === 'arredo') {
      return {
        text: `Ti apro subito la gestione Casa & Arredo con le tue stanze! 🏠`,
        autoAction: { label: 'Casa & Arredo', type: 'category', category: 'furniture' },
        actions: [],
      };
    }

    if (k.furniture.roomsCount === 0) {
      return {
        text: `🏠 Non hai ancora configurato stanze o arredi in Chelona.\n\nPuoi organizzare misure delle stanze, arredi salvati, link di acquisto e costi preventivi toccando **"+"** → **Casa**!`,
        actions: [{ label: 'Aggiungi Casa & Arredo', type: 'category', category: 'furniture' }],
      };
    }

    let out = `🏠 **Riepilogo Casa & Arredamento:**\n\n`;
    out += `- 🚪 Stanze configurate: **${k.furniture.roomsCount}**\n`;
    out += `- 🪑 Mobili inseriti: **${k.furniture.itemsCount}**\n`;
    if (k.furniture.totalCost > 0) out += `- 💰 Totale preventivo arredi: **€ ${k.furniture.totalCost.toFixed(2)}**\n`;
    out += `\n`;

    k.furniture.rooms.forEach(r => {
      out += `### **${r.name}** ${r.dimensions ? `(${r.dimensions})` : ''}\n`;
      if (r.items.length === 0) {
        out += `*Nessun mobile aggiunto a questa stanza.*\n`;
      } else {
        r.items.forEach(i => {
          out += `• **${i.title}**: ${i.dimensions ? `${i.dimensions} ` : ''}${i.price ? `(€ ${i.price})` : ''}\n`;
        });
      }
      out += `\n`;
    });

    return {
      text: out,
      actions: [{ label: 'Apri Casa & Arredo', type: 'category', category: 'furniture' }],
    };
  }

  // --- SEZIONE 12: NOTE & APPUNTI ---
  if (
    lower.includes('nota') ||
    lower.includes('note') ||
    lower.includes('appunt') ||
    lower.includes('scritto') ||
    lower.includes('testo')
  ) {
    if (k.notes.length === 0) {
      return {
        text: `📝 Non hai ancora creato note in Chelona. Puoi salvare note veloci dicendomi *"Aggiungi nota: [testo]"* oppure toccando **"+"**!`,
      };
    }

    if (lower.includes('apri') || lower.includes('vai') || lower.trim() === 'note' || lower.trim() === 'appunti') {
      return {
        text: `Ti mostro subito le tue note e i tuoi appunti! 📝`,
        autoAction: { label: 'Note', type: 'category', category: 'generic' },
        actions: [],
      };
    }

    const stopWords = new Set([
      'nota', 'note', 'appunti', 'appunto', 'cosa', 'scritto', 'scrivi', 'nella', 'nelle', 'nello', 'negli',
      'sul', 'sulla', 'sullo', 'sulle', 'sugli', 'del', 'dello', 'della', 'dei', 'degli', 'delle',
      'questo', 'questa', 'questi', 'queste', 'trova', 'cerca', 'quali', 'quale', 'mostra', 'vedi',
      'tutti', 'tutte', 'ultime', 'ultima', 'mio', 'mia', 'miei', 'mie', 'tuo', 'tua'
    ]);
    const cleanLower = lower.replace(/[?!,.:;()"]/g, ' ');
    const searchTerms = cleanLower
      .split(/\s+/)
      .map(w => w.trim())
      .filter(w => w.length > 2 && !stopWords.has(w));

    let matchingNotes = k.notes;
    if (searchTerms.length > 0) {
      const filtered = k.notes.filter(n => 
        searchTerms.some(term => n.title.toLowerCase().includes(term) || n.snippet.toLowerCase().includes(term))
      );
      if (filtered.length > 0) {
        matchingNotes = filtered;
      }
    }

    let out = `📝 **Note e Appunti trovati (${matchingNotes.length}):**\n\n`;
    const actions: AiAction[] = [];

    matchingNotes.slice(0, 4).forEach(n => {
      out += `### **${n.title}**\n`;
      out += `> ${n.snippet || '*(Nessun testo aggiunto)*'}\n\n`;
      actions.push({
        label: `Apri ${n.title}`,
        type: 'module',
        moduleId: n.module.id,
        module: n.module,
      });
    });

    return { text: out, actions };
  }

  // --- SEZIONE 13: PARCHEGGIO & POSIZIONE GPS ---
  if (
    lower.includes('parchegg') ||
    lower.includes('dov\'è la macchina') ||
    lower.includes('dove ho parcheggiato') ||
    lower.includes('trova auto') ||
    lower.includes('ritrova auto') ||
    lower.includes('parchimetro') ||
    lower.includes('scadenza sosta') ||
    lower.includes('tempo sosta') ||
    lower.includes('radar')
  ) {
    if (lower.includes('apri') || lower.includes('vai') || lower.includes('mappa') || lower.trim() === 'parcheggio') {
      return {
        text: `Ti porto subito alla schermata del Parcheggio e Radar GPS! 🚗`,
        autoAction: { label: 'Apri Parcheggio', type: 'parking' },
        actions: [],
      };
    }

    if (lower.includes('segna') || lower.includes('salva') || lower.includes('memorizza') || lower.includes('qui')) {
      return {
        text: `Ti porto alla schermata del parcheggio e salvo subito la tua posizione GPS attuale! 🚗📍`,
        autoAction: { label: 'Salva Parcheggio', type: 'parking', autoSave: true },
        actions: [],
      };
    }

    if (k.parking.hasParking) {
      let text = `La tua auto è parcheggiata in **${k.parking.address}** (${k.parking.elapsedTime}).\n`;
      if (k.parking.notes) text += `Note: *"${k.parking.notes}"*\n`;
      if (k.parking.meterRemainingMinutes !== undefined) {
        text += k.parking.meterRemainingMinutes > 0
          ? `⏱️ Parchimetro attivo: restano **${k.parking.meterRemainingMinutes} minuti**!\n`
          : `⚠️ **Parchimetro scaduto da ${Math.abs(k.parking.meterRemainingMinutes)} minuti!**\n`;
      }
      text += `\nTi apro la mappa radar per ritrovarla! 🚗`;

      return {
        text,
        autoAction: { label: 'Apri Parcheggio', type: 'parking' },
        actions: [
          { label: 'Naviga all\'Auto (Maps)', type: 'navigate_parking' },
          { label: 'Apri Radar Parcheggio', type: 'parking' },
        ],
      };
    } else {
      return {
        text: `Non hai ancora registrato nessun parcheggio attivo. Vuoi che memorizzi la tua posizione GPS attuale adesso? 📍`,
        actions: [
          { label: 'Salva Posizione Ora', type: 'save_parking', autoSave: true },
          { label: 'Apri Parcheggio', type: 'parking' },
        ],
      };
    }
  }

  // --- SEZIONE 14: RUBRICA & INDIRIZZI ---
  if (
    lower.includes('rubrica') ||
    lower.includes('indirizz') ||
    lower.includes('contatt') ||
    lower.includes('recapit') ||
    lower.includes('dove abita')
  ) {
    if (lower.includes('apri') || lower.includes('vai') || lower.trim() === 'rubrica' || lower.trim() === 'indirizzi') {
      return {
        text: `Ti apro subito la Rubrica Indirizzi di Chelona! 📇`,
        autoAction: { label: 'Apri Rubrica', type: 'address' },
        actions: [],
      };
    }

    if (k.addresses.count === 0) {
      return {
        text: `📇 Non hai ancora memorizzato indirizzi o contatti nella Rubrica di Chelona.\n\nPuoi salvare recapiti di amici, sedi di lavoro e luoghi frequenti per aprirli in navigazione con un tocco!`,
        actions: [{ label: 'Apri Rubrica', type: 'address' }],
      };
    }

    // Ricerca indirizzo specifico
    const searchMatch = query.match(/(?:di|per|a|cerca)\s+([a-zA-Zàèéìòù\s]{3,20})/i);
    let matchedAddresses = k.addresses.list;
    if (searchMatch) {
      const q = searchMatch[1].trim().toLowerCase();
      const filtered = k.addresses.list.filter(a => a.title.toLowerCase().includes(q) || a.query.toLowerCase().includes(q));
      if (filtered.length > 0) matchedAddresses = filtered;
    }

    let out = `📇 **Indirizzi salvati in Rubrica (${matchedAddresses.length}):**\n\n`;
    matchedAddresses.slice(0, 5).forEach(a => {
      out += `• **${a.title}**: ${a.query}\n`;
    });

    return {
      text: out,
      actions: [{ label: 'Apri Rubrica Completa', type: 'address' }],
    };
  }

  // --- SEZIONE 15: SCADENZE AGGREGATO ---
  if (
    lower.includes('scadenz') ||
    lower.includes('promemoria') ||
    lower.includes('scade') ||
    lower.includes('urgente') ||
    lower.includes('giorni mancanti')
  ) {
    if (
      lower.includes('apri') ||
      lower.includes('vai') ||
      lower.includes('mostra') ||
      lower.trim() === 'scadenze' ||
      lower.trim() === 'le scadenze'
    ) {
      return {
        text: `Ti porto subito alla schermata unificata delle scadenze e promemoria! 📅`,
        autoAction: { label: 'Scadenze', type: 'deadlines' },
        actions: [],
      };
    }

    if (k.urgentDeadlines.length === 0) {
      return {
        text: `Tutto sotto controllo! Non hai nessuna scadenza nei prossimi 60 giorni tra auto, documenti, rate e spese. 📅✨`,
        actions: [{ label: 'Apri Scadenze', type: 'deadlines' }],
      };
    }

    let out = `📅 **Scadenze imminenti e da monitorare (${k.urgentDeadlines.length}):**\n\n`;
    const actions: AiAction[] = [];

    k.urgentDeadlines.forEach((d) => {
      let status = '';
      if (d.days < 0) {
        status = `⚠️ **SCADUTO da ${Math.abs(d.days)} giorni!**`;
      } else if (d.days === 0) {
        status = `⚠️ **SCADE OGGI!**`;
      } else if (d.days <= 7) {
        status = `tra **${d.days} giorni** (${formatDate(d.date)})`;
      } else {
        status = `il **${formatDate(d.date)}** (tra ${d.days} gg)`;
      }

      out += `• **${d.label}**: ${status}\n`;

      if (d.module) {
        actions.push({
          label: d.label.length > 20 ? d.label.slice(0, 18) + '...' : d.label,
          type: 'module',
          moduleId: d.moduleId,
          module: d.module,
        });
      }
    });

    return {
      text: out,
      actions: actions.slice(0, 3),
    };
  }

  // --- SEZIONE 16: STRUMENTI & UTILITY ---
  if (
    lower.includes('strument') ||
    lower.includes('utility') ||
    lower.includes('scanner') ||
    lower.includes('scansiona') ||
    lower.includes('vinted') ||
    lower.includes('percentuale') ||
    lower.includes('filtri immagine') ||
    lower.includes('filtri foto') ||
    lower.includes('galleria') ||
    lower.includes('album foto') ||
    lower.includes('unisci pdf') ||
    lower.includes('ruota pdf') ||
    lower.includes('ruota') ||
    lower.includes('comprimi pdf') ||
    lower.includes('comprimi') ||
    lower.includes('jpg in pdf') ||
    lower.includes('word in pdf') ||
    lower.includes('docx in pdf') ||
    lower.includes('converti word') ||
    lower.includes('immagini in pdf')
  ) {
    if (lower.includes('scanner') || lower.includes('scansiona')) {
      return {
        text: `Ti apro subito lo **Scanner Documenti** con fotocamera integrata e raddrizzamento automatico! 📄📸`,
        autoAction: { label: 'Apri Scanner', type: 'tool', toolId: 'scanner' },
        actions: [{ label: 'Apri Scanner', type: 'tool', toolId: 'scanner' }],
      };
    }

    if (lower.includes('comprimi') || lower.includes('riduci')) {
      return {
        text: `Ti apro lo strumento **Comprimi PDF** per ridurre il peso in MB dei tuoi documenti ottimizzandoli! 📉📄`,
        autoAction: { label: 'Comprimi PDF', type: 'tool', toolId: 'compress' },
        actions: [{ label: 'Comprimi PDF', type: 'tool', toolId: 'compress' }],
      };
    }

    if (lower.includes('ruota') || lower.includes('gira')) {
      return {
        text: `Ti apro lo strumento **Ruota PDF** per correggere l'orientamento delle pagine! 🔄📄`,
        autoAction: { label: 'Ruota PDF', type: 'tool', toolId: 'rotate' },
        actions: [{ label: 'Ruota PDF', type: 'tool', toolId: 'rotate' }],
      };
    }

    if (lower.includes('jpg in pdf') || lower.includes('immagini in pdf') || lower.includes('foto in pdf') || lower.includes('img2pdf')) {
      return {
        text: `Ti apro lo strumento **JPG in PDF** per convertire le tue immagini in un unico documento PDF! 🖼️📄`,
        autoAction: { label: 'JPG in PDF', type: 'tool', toolId: 'img2pdf' },
        actions: [{ label: 'JPG in PDF', type: 'tool', toolId: 'img2pdf' }],
      };
    }

    if (lower.includes('word in pdf') || lower.includes('docx in pdf') || lower.includes('converti word') || lower.includes('docx2pdf')) {
      return {
        text: `Ti apro lo strumento **Word in PDF** per convertire i tuoi file .docx in PDF direttamente sul tuo dispositivo! 📑`,
        autoAction: { label: 'Word in PDF', type: 'tool', toolId: 'docx2pdf' },
        actions: [{ label: 'Word in PDF', type: 'tool', toolId: 'docx2pdf' }],
      };
    }

    if (lower.includes('unisci pdf') || lower.includes('combina pdf') || lower.includes('fondi pdf')) {
      return {
        text: `Ti apro lo strumento **Unisci PDF** per combinare più documenti in uno unico! 📑`,
        autoAction: { label: 'Unisci PDF', type: 'tool', toolId: 'merge' },
        actions: [{ label: 'Unisci PDF', type: 'tool', toolId: 'merge' }],
      };
    }

    if (lower.includes('vinted')) {
      return {
        text: `Ti apro l'**Aiuto Vinted** per misurare vestiti su foto e generare titoli e descrizioni vincenti! 👕✨`,
        autoAction: { label: 'Aiuto Vinted', type: 'tool', toolId: 'vinted' },
        actions: [{ label: 'Aiuto Vinted', type: 'tool', toolId: 'vinted' }],
      };
    }

    if (lower.includes('percentuale') || lower.includes('sconto') || lower.includes('scorporo')) {
      return {
        text: `Ti apro il **Calcolo Percentuale** per sconti, variazioni e scorporo IVA! 🔢`,
        autoAction: { label: 'Calcolo Percentuale', type: 'tool', toolId: 'percent' },
        actions: [{ label: 'Calcolo Percentuale', type: 'tool', toolId: 'percent' }],
      };
    }

    if (lower.includes('filtri')) {
      return {
        text: `Ti apro lo strumento **Filtri Immagine** stile Instagram per foto e documenti! 🎨📸`,
        autoAction: { label: 'Filtri Immagine', type: 'tool', toolId: 'image-filter' },
        actions: [{ label: 'Filtri Immagine', type: 'tool', toolId: 'image-filter' }],
      };
    }

    if (lower.includes('galleria') || lower.includes('album')) {
      return {
        text: `Ti apro la **Galleria Fotografica** di Chelona con le tue immagini salvate! 🖼️`,
        autoAction: { label: 'Apri Galleria', type: 'gallery' },
        actions: [{ label: 'Apri Galleria', type: 'gallery' }],
      };
    }

    return {
      text: `Ti porto subito al pannello **Strumenti & Utility** di Chelona! 🧰\n\nTroverai: Scanner Documenti, Comprimi/Ruota/Unisci PDF, Convertitore JPG/Word in PDF, Aiuto Vinted, Calcolo Percentuale e Filtri Immagine.`,
      autoAction: { label: 'Strumenti', type: 'category', category: 'tools' },
      actions: [
        { label: 'Scanner', type: 'tool', toolId: 'scanner' },
        { label: 'Comprimi PDF', type: 'tool', toolId: 'compress' },
        { label: 'Unisci PDF', type: 'tool', toolId: 'merge' },
        { label: 'Tutti gli Strumenti', type: 'category', category: 'tools' },
      ],
    };
  }

  // --- SEZIONE 17: PROFILO & IMPOSTAZIONI ---
  if (
    lower.includes('profilo') ||
    lower.includes('impostazioni') ||
    lower.includes('account') ||
    lower.includes('backup') ||
    lower.includes('esporta') ||
    lower.includes('qr') ||
    lower.includes('biometria') ||
    lower.includes('impronta') ||
    lower.includes('face id') ||
    lower.includes('faceid') ||
    lower.includes('crittografia') ||
    lower.includes('vault') ||
    lower.includes('wake word') ||
    lower.includes('ciao chelona') ||
    lower.includes('tema chiaro') ||
    lower.includes('tema scuro') ||
    lower.includes('tema')
  ) {
    if (lower.includes('apri') || lower.includes('vai') || lower.trim() === 'profilo' || lower.trim() === 'impostazioni') {
      return {
        text: `Ti apro subito la schermata del tuo **Profilo & Impostazioni**! 👤⚙️`,
        autoAction: { label: 'Profilo & Impostazioni', type: 'category', category: 'profile' },
        actions: [],
      };
    }

    // Risposta mirata: Backup & Esportazione
    if (lower.includes('backup') || lower.includes('esporta') || lower.includes('esportazione') || lower.includes('qr')) {
      return {
        text: `📦 **Backup & Sicurezza Dati di Chelona:**\n\nPuoi esportare l'intero database in un file **ZIP crittografato** protetto dalla tua Master Password, oppure sincronizzare istantaneamente le tue informazioni su un altro dispositivo tramite **QR Code protetto da cifratura AES-256**.\n\nTutti i tuoi dati rimangono esclusivamente sul tuo dispositivo senza passare da alcun server esterno.`,
        autoAction: { label: 'Gestisci Backup', type: 'category', category: 'profile' },
        actions: [{ label: 'Apri Profilo', type: 'category', category: 'profile' }],
      };
    }

    // Risposta mirata: Biometria & Crittografia
    if (lower.includes('biometr') || lower.includes('impront') || lower.includes('face') || lower.includes('crittograf') || lower.includes('vault')) {
      return {
        text: `🔐 **Sicurezza & Crittografia:**\n\nChelona protegge tutti i tuoi dati e documenti con un **Vault crittografico AES-256-GCM** locale.\nPuoi sbloccare l'app e i tuoi dati sensibili utilizzando l'impronta digitale o Face ID del tuo smartphone, senza digitare ogni volta la master password.`,
        autoAction: { label: 'Sicurezza Profilo', type: 'category', category: 'profile' },
        actions: [{ label: 'Apri Profilo', type: 'category', category: 'profile' }],
      };
    }

    // Risposta mirata: Wake word vocale
    if (lower.includes('wake word') || lower.includes('ciao chelona') || lower.includes('vocale') || lower.includes('voce')) {
      return {
        text: `🎙️ **Comando Vocale "Ciao Chelona":**\n\nStato attuale: ${k.profile.isWakeWordEnabled ? '✅ **Attivo**' : '⚪ **Disattivato**'}.\nQuando è attivo, puoi dire *"Ciao Chelona"* in qualsiasi momento per risvegliarmi a mani libere e chiedermi qualsiasi cosa. Puoi attivarlo o disattivarlo dal tuo profilo!`,
        autoAction: { label: 'Impostazioni Voce', type: 'category', category: 'profile' },
        actions: [{ label: 'Apri Profilo', type: 'category', category: 'profile' }],
      };
    }

    // Risposta mirata: Tema
    if (lower.includes('tema') || lower.includes('scuro') || lower.includes('chiaro')) {
      return {
        text: `🎨 **Tema & Aspetto:**\n\nChelona supporta il tema Scuro (Dark OLED) per risparmiare batteria e il tema Chiaro. Puoi cambiare tema con un tocco direttamente nella schermata Profilo!`,
        autoAction: { label: 'Cambia Tema', type: 'category', category: 'profile' },
        actions: [{ label: 'Apri Profilo', type: 'category', category: 'profile' }],
      };
    }

    let text = `🔒 **Profilo, Sicurezza & Impostazioni:**\n\n`;
    text += `- 👤 Utente: **${k.profile.username}**\n`;
    text += `- 🔐 Crittografia: **Vault AES-256 locale** protetto da password/impronta digitale\n`;
    text += `- 📦 Backup: Supporto per esportazione **ZIP completa** e condivisione **QR Code crittografato**\n`;
    text += `- 🎙️ Comando vocale: sveglia *"Ciao Chelona"* ${k.profile.isWakeWordEnabled ? '✅ **Attiva**' : '⚪ Disattivata'}\n`;
    text += `- 🎨 Aspetto: Tema chiaro e scuro commutabile dal profilo\n\n`;
    text += `Puoi gestire biometria, backup, password e scorciatoie rapide direttamente nel tuo profilo.`;

    return {
      text,
      autoAction: { label: 'Apri Profilo', type: 'category', category: 'profile' },
      actions: [{ label: 'Apri Profilo & Impostazioni', type: 'category', category: 'profile' }],
    };
  }

  // --- SEZIONE 18: PANORAMICA CAPABILITIES ("COSA PUOI FARE?", "CHI SEI?", "AIUTO", "VERSIONE", "MODELLO") ---
  if (
    lower.includes('cosa puoi fare') ||
    lower.includes('chi sei') ||
    lower.includes('aiuto') ||
    lower.includes('funzioni') ||
    lower.includes('cosa sai fare') ||
    lower.includes('tutte le sezioni') ||
    lower.includes('modello') ||
    lower.includes('versione') ||
    lower.includes('motore')
  ) {
    let out = `🌟 **Sono Chelona AI**, il tuo assistente personale 100% on-device, istantaneo e privato.\n`;
    out += `Funziono interamente in locale con il **Motore Chelona Engine**, elaborando all'istante ogni richiesta senza chiamate esterne:\n\n`;
    out += `1. 🚗 **Veicoli & Auto**: Bollo, assicurazione, revisione, tagliando, gomme, km e targhe\n`;
    out += `2. 📄 **Documenti**: Patente, carta d'identità, passaporto, tessera sanitaria e scadenze\n`;
    out += `3. 👥 **Spese Condivise (Split)**: Gruppi uscite, bilancio e calcolo "chi deve a chi"\n`;
    out += `4. 💳 **Spesa Singola & Uscite**: Scontrini, totali del mese e categorizzazione automatica\n`;
    out += `5. 🗓️ **Rate & Finanziamenti**: Piani rateali, importo residuo e data prossima rata\n`;
    out += `6. 🛒 **Volantini & Sconti**: Tutte le catene (Lidl, Conad, Coop, Esselunga...) e confronto prezzi\n`;
    out += `7. 📝 **Lista della Spesa**: Articoli da comprare e aggiunta rapida ("Aggiungi pane alla spesa")\n`;
    out += `8. 🍲 **Ricette & Cucina**: Ricettario, ingredienti in frigo/dispensa e consigli piatti\n`;
    out += `9. 🏋️ **Fitness & Allenamento**: Schede palestra, esercizi, serie/ripetizioni e calorie giornaliere\n`;
    out += `10. ✈️ **Viaggi & Itinerari**: Mete sul Globo 3D, tappe itinerario e checklist valigia\n`;
    out += `11. 🏠 **Casa & Arredo**: Misure stanze, mobili e calcolo preventivi arredo\n`;
    out += `12. ✍️ **Note & Appunti**: Creazione istantanea note e ricerca testuale libera\n`;
    out += `13. 📍 **Parcheggio & GPS**: Ricorda dove hai parcheggiato, parchimetro e navigazione radar\n`;
    out += `14. 📇 **Rubrica & Indirizzi**: Contatti, indirizzi memorizzati e recapiti rapidi\n`;
    out += `15. 📅 **Scadenze Aggregate**: Vista unificata di tutti i promemoria e avvisi urgenti\n`;
    out += `16. 🧰 **Strumenti & Utility**: Scanner Documenti, Aiuto Vinted, Calcolo %, Filtri Immagine, Galleria, PDF\n`;
    out += `17. 🔒 **Profilo & Sicurezza**: Backup ZIP/QR, FaceID/impronta, vault AES-256 e comando "Ciao Chelona"\n\n`;
    out += `💡 *Chiedimi pure qualsiasi cosa a voce o per iscritto, o usa "Ricordati che..." per farmi imparare informazioni personali!*`;

    return {
      text: out,
      actions: [
        { label: 'Scadenze', type: 'deadlines' },
        { label: 'Dov\'è l\'auto?', type: 'parking' },
        { label: 'Volantini', type: 'volantino' },
        { label: 'Tutti gli Strumenti', type: 'category', category: 'tools' },
      ],
    };
  }

  // --- SEZIONE 19: MEMORIA / COSA SAI SU DI ME ---
  if (
    lower.includes('cosa sai') ||
    lower.includes('cosa hai imparato') ||
    lower.includes('memoria') ||
    lower.includes('mie informazioni') ||
    lower.includes('chi sono')
  ) {
    let out = `Ecco cosa so su di te:\n\n`;

    if (customMemories.length > 0) {
      out += `**Cose che mi hai insegnato espressamente:**\n`;
      customMemories.forEach(m => {
        out += `• ${m.fact}\n`;
      });
      out += `\n`;
    }

    out += `**Dati sincronizzati dai moduli di Chelona:**\n`;
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
      out += `• ${k.installments.modules.length} finanziamenti attivi (€ ${k.installments.totalPending.toFixed(2)} residui)\n`;
    }
    if (k.splits.length > 0) {
      out += `• ${k.splits.length} gruppi spese condivise\n`;
    }
    if (k.supermarket) {
      out += `• ${k.supermarket.itemsToBuy.length} articoli da comprare nella lista spesa\n`;
    }
    if (k.recipes.allIngredients.length > 0) {
      out += `• ${k.recipes.allIngredients.length} ingredienti censiti in dispensa/frigo\n`;
    }
    if (k.travel.destinationsCount > 0) {
      out += `• ${k.travel.destinationsCount} tappe di viaggio in ${k.travel.nations.length} nazioni\n`;
    }
    if (k.furniture.roomsCount > 0) {
      out += `• ${k.furniture.roomsCount} stanze con ${k.furniture.itemsCount} mobili\n`;
    }
    if (k.addresses.count > 0) {
      out += `• ${k.addresses.count} indirizzi in rubrica\n`;
    }
    if (k.parking.hasParking) {
      out += `• Posizione auto parcheggiata salvata\n`;
    }

    out += `\nSe vuoi insegnarmi altro, dimmi pure *"Ricordati che..."*!`;
    return { text: out };
  }

  // --- SEZIONE 20: SALUTI GENERALI ---
  if (
    lower === 'ciao' ||
    lower.startsWith('ciao ') ||
    lower.startsWith('buongiorno') ||
    lower.startsWith('buonasera') ||
    lower.startsWith('ehi') ||
    lower.startsWith('hey') ||
    lower.startsWith('salve')
  ) {
    return {
      text: `Ciao ${username || ''}! Sono Chelona AI, pronto ad aiutarti. Chiedimi pure della tua auto, delle scadenze imminenti, dei documenti, della spesa, delle ricette, dei viaggi o delle offerte dei volantini! 🐢`,
      actions: [
        { label: 'Scadenze', type: 'deadlines' },
        { label: 'Dov\'è l\'auto?', type: 'parking' },
        { label: 'Offerte Volantini', type: 'volantino' },
      ],
    };
  }

  // =========================================================================
  // 4. RICERCA SEMANTICA & RAG LOCALE TRANS-MODULO
  // =========================================================================
  const words = lower.split(/\s+/).filter(w => w.length > 3 && !['delle', 'della', 'degli', 'nella', 'dello', 'questo', 'questa', 'quali', 'quale'].includes(w));
  
  const relevantMemories = customMemories.filter(m => words.some(w => m.fact.toLowerCase().includes(w)));
  const relevantNotes = k.notes.filter(n => words.some(w => n.title.toLowerCase().includes(w) || n.snippet.toLowerCase().includes(w)));
  const relevantVehicles = k.vehicles.filter(v => words.some(w => v.name.toLowerCase().includes(w) || v.plate.toLowerCase().includes(w)));
  const relevantDocs = k.documents.filter(d => words.some(w => d.title.toLowerCase().includes(w) || (d.number && d.number.toLowerCase().includes(w))));
  const relevantDests = k.travel.destinations.filter(d => words.some(w => d.name.toLowerCase().includes(w) || (d.city && d.city.toLowerCase().includes(w))));
  const relevantAddresses = k.addresses.list.filter(a => words.some(w => a.title.toLowerCase().includes(w) || a.query.toLowerCase().includes(w)));

  if (
    relevantMemories.length > 0 || 
    relevantNotes.length > 0 || 
    relevantVehicles.length > 0 || 
    relevantDocs.length > 0 || 
    relevantDests.length > 0 ||
    relevantAddresses.length > 0
  ) {
    let out = `Ho cercato tra tutti i tuoi moduli e ho trovato queste informazioni correlate:\n\n`;
    const actions: AiAction[] = [];

    if (relevantMemories.length > 0) {
      out += `**Memorie apprese:**\n`;
      relevantMemories.forEach(m => out += `• ${m.fact}\n`);
      out += `\n`;
    }

    if (relevantVehicles.length > 0) {
      out += `**Veicoli:**\n`;
      relevantVehicles.forEach(v => {
        out += `• ${v.name} (Targa: ${v.plate}, ${v.km} km)\n`;
        actions.push({ label: `Scheda ${v.name}`, type: 'module', moduleId: v.module.id, module: v.module });
      });
      out += `\n`;
    }

    if (relevantDocs.length > 0) {
      out += `**Documenti:**\n`;
      relevantDocs.forEach(d => {
        out += `• ${d.title} (Scadenza: ${formatDate(d.expiryDate)})\n`;
        actions.push({ label: `Vedi ${d.title}`, type: 'module', moduleId: d.module.id, module: d.module });
      });
      out += `\n`;
    }

    if (relevantNotes.length > 0) {
      out += `**Note e appunti:**\n`;
      relevantNotes.forEach(n => {
        out += `• **${n.title}**: ${n.snippet}\n`;
        actions.push({ label: `Apri ${n.title}`, type: 'module', moduleId: n.module.id, module: n.module });
      });
      out += `\n`;
    }

    if (relevantDests.length > 0) {
      out += `**Viaggi:**\n`;
      relevantDests.forEach(d => {
        out += `• ${d.name} (${d.city || ''} ${d.nation || ''})\n`;
      });
      actions.push({ label: 'Apri Viaggi', type: 'category', category: 'travel' });
      out += `\n`;
    }

    if (relevantAddresses.length > 0) {
      out += `**Rubrica:**\n`;
      relevantAddresses.forEach(a => {
        out += `• ${a.title}: ${a.query}\n`;
      });
      actions.push({ label: 'Apri Rubrica', type: 'address' });
      out += `\n`;
    }

    return { text: out, actions: actions.slice(0, 3) };
  }

  // Fallback con suggerimenti pratici
  return {
    text: `Non ho trovato riferimenti precisi a questo nei tuoi moduli o appunti.\n\nPuoi chiedermi di:\n• **"Quali scadenze imminenti ho?"**\n• **"Dove ho parcheggiato l'auto?"**\n• **"Aggiungi latte alla lista della spesa"**\n• **"Chi deve a chi nelle spese condivise?"**\n• **"Mostrami le offerte dei volantini"**\n• **"Ricordati che..."** per salvare una memoria personale!`,
    actions: [
      { label: 'Cosa puoi fare?', type: 'category', category: 'tools' },
      { label: 'Scadenze', type: 'deadlines' },
      { label: 'Dov\'è l\'auto?', type: 'parking' },
    ],
    engineUsed: 'chelona-engine',
  };
}

