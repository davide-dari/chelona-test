import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SupermarketModule, SupermarketItem, SupermarketCategory } from '../types';
import {
  ArrowLeft, Plus, Trash2, CheckCircle2,
  Apple, Milk, Drumstick, Croissant, PackageCheck, GlassWater, SprayCan,
  ShowerHead, ShoppingBasket, Share2, Search, AlertTriangle, X, Scale,
  Store, Info, Fish, Snowflake, Coffee, ChevronDown, ChevronUp
} from 'lucide-react';
import { generateUUID } from '../utils/uuid';
import {
  CatalogProduct, findProductMatches, guessEmoji,
  PRODUCT_CATEGORY_LABEL, normalizeProduct
} from '../data/supermarketProducts';
import { findOffersForName } from '../data/offerStats';
import { IngredientModal } from './IngredientModal';
import { detectSupermarketCategory } from '../services/mathLanguageEngine';



interface SupermarketScreenProps {
  module: SupermarketModule;
  onSave: (m: SupermarketModule) => void;
  onClose: () => void;
  onShare: (m: SupermarketModule) => void;
}

const UNIT_OPTIONS = ['kg', 'g', 'lt', 'ml', 'pz', 'etto', 'busta', 'lattina', 'barattolo', 'bottiglia', 'confezione', 'mazzo', 'fetta', 'scatola', 'pacco', 'vasetto'] as const;

const UNIT_PLURAL: Record<string, string> = {
  kg: 'kg', g: 'g', lt: 'lt', ml: 'ml', pz: 'pz',
  etto: 'etti', busta: 'buste', lattina: 'lattine', barattolo: 'barattoli',
  bottiglia: 'bottiglie', confezione: 'confezioni', mazzo: 'mazzi',
  fetta: 'fette', scatola: 'scatole', pacco: 'pacchi', vasetto: 'vasetti'
};

const formatQuantity = (qty: string, unit: string): string => {
  const q = qty.trim();
  if (!q) return '';
  return unit ? `${q} ${UNIT_PLURAL[unit] ?? unit}` : q;
};

const parseSuggestionQ = (q?: string): { qty: string; unit: string } => {
  if (!q) return { qty: '', unit: '' };
  const m = q.trim().match(/^([\d.,/]+)\s*([a-zà-ù]+)$/i);
  if (!m) return { qty: '', unit: '' };
  const tok = m[2].toLowerCase();
  const match = UNIT_OPTIONS.find(u => u === tok || UNIT_PLURAL[u] === tok);
  return match ? { qty: m[1], unit: match } : { qty: m[1], unit: '' };
};

/* Detect if a product is a liquid based on name, category, or suggested quantity */
const isLiquidProduct = (name: string, category?: SupermarketCategory, suggestedQty?: string): boolean => {
  const t = name.toLowerCase();
  // Check if suggested quantity already uses liquid units
  if (suggestedQty) {
    const sq = suggestedQty.toLowerCase();
    if (/\d\s*(lt|ml|litri|litro)/.test(sq)) return true;
  }
  // Liquid categories
  if (category === 'bevande') return true;
  // Liquid product names
  if (/(acqua|vino|birra|succo|latte|olio|aceto|spremuta|smoothie|frullato|sciroppo|aranciata|coca|cola|chinotto|gassosa|tonica|prosecco|champagne|spumante|grappa|whisky|rum|vodka|gin|cognac|liquore|vermouth|campari|bitter|amaro|aperol|spritz|sambuca|brandy|limoncello|nocino|mirto|marsala|sangria|sidro|idromele|redbull|energetica|bibita|soda|ginger|kombucha|kefir|brodo|passata|panna|detersivo|candeggina|ammorbidente|bagnoschiuma|shampoo|balsamo|collutorio|detergente|sgrassatore|sapone liquido|gel doccia)/i.test(t)) return true;
  return false;
};

/* Suggest default unit based on product type */
const getDefaultUnit = (name: string, category?: SupermarketCategory, suggestedQty?: string): string => {
  if (suggestedQty) {
    const parsed = parseSuggestionQ(suggestedQty);
    if (parsed.unit) return parsed.unit;
  }
  if (isLiquidProduct(name, category, suggestedQty)) return 'lt';
  // For most solid foods, default to g
  const t = name.toLowerCase();
  if (/(pane|focaccia|pizza|torta|croissant|brioche|grissini|crackers|biscott|merendin|barretta|cioccolat)/i.test(t)) return 'pz';
  if (/(uova|uovo)/i.test(t)) return 'pz';
  if (/(mela|banana|arancia|limone|pera|pesca|kiwi|ananas|mango|avocado|melanzana|zucchina|peperone|cipolla|aglio|carciofo|finocchio|cetriolo|sedano|porro|barbabietola|ravanello|melograno|cocco|pompelmo)/i.test(t)) return 'pz';
  if (/(lattina|birra|coca|red bull|energy)/i.test(t)) return 'pz';
  if (/(carta igienica|scottex|rotoloni|pannolini|assorbenti|fazzoletti|sacchi|sacchetti)/i.test(t)) return 'pz';
  return 'g';
};

export interface SupermarketAisle {
  id: SupermarketCategory;
  label: string;
  emoji: string;
  icon: any;
  color: string;
  badgeColor: string;
}

export const SUPERMARKET_AISLES: SupermarketAisle[] = [
  { id: 'ortofrutta', label: 'Ortofrutta', emoji: '🍏', icon: Apple, color: 'text-emerald-500 bg-emerald-500/10', badgeColor: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' },
  { id: 'macelleria', label: 'Macelleria & Salumi', emoji: '🥩', icon: Drumstick, color: 'text-rose-500 bg-rose-500/10', badgeColor: 'bg-rose-500/15 text-rose-700 dark:text-rose-300' },
  { id: 'pescheria', label: 'Pescheria', emoji: '🐟', icon: Fish, color: 'text-cyan-500 bg-cyan-500/10', badgeColor: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300' },
  { id: 'latticini-uova', label: 'Latticini & Uova', emoji: '🧀', icon: Milk, color: 'text-amber-500 bg-amber-500/10', badgeColor: 'bg-amber-500/15 text-amber-700 dark:text-amber-300' },
  { id: 'panetteria', label: 'Panetteria & Pasticceria', emoji: '🥖', icon: Croissant, color: 'text-orange-500 bg-orange-500/10', badgeColor: 'bg-orange-500/15 text-orange-700 dark:text-orange-400' },
  { id: 'dispensa', label: 'Dispensa & Secco', emoji: '🍝', icon: PackageCheck, color: 'text-yellow-600 bg-yellow-500/10', badgeColor: 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-300' },
  { id: 'colazione-snack', label: 'Colazione & Snack', emoji: '☕', icon: Coffee, color: 'text-amber-700 bg-amber-700/10', badgeColor: 'bg-amber-700/15 text-amber-800 dark:text-amber-300' },
  { id: 'surgelati', label: 'Surgelati', emoji: '❄️', icon: Snowflake, color: 'text-sky-500 bg-sky-500/10', badgeColor: 'bg-sky-500/15 text-sky-700 dark:text-sky-300' },
  { id: 'bevande', label: 'Bevande', emoji: '🥤', icon: GlassWater, color: 'text-blue-500 bg-blue-500/10', badgeColor: 'bg-blue-500/15 text-blue-700 dark:text-blue-300' },
  { id: 'igiene-cura', label: 'Igiene Casa & Persona', emoji: '🧼', icon: SprayCan, color: 'text-teal-500 bg-teal-500/10', badgeColor: 'bg-teal-500/15 text-teal-700 dark:text-teal-300' },
  { id: 'altro', label: 'Altro Reparto', emoji: '🛒', icon: ShoppingBasket, color: 'text-slate-500 bg-slate-500/10', badgeColor: 'bg-slate-500/15 text-slate-700 dark:text-slate-300' }
];

export const mapToAisle = (category?: string, name?: string): SupermarketCategory => {
  const n = (name || '').trim();

  // 1. Rilevamento intelligente prioritario dal nome del prodotto
  if (n) {
    const detected = detectSupermarketCategory(n);
    if (detected !== 'dispensa') {
      return detected;
    }
  }

  // 2. Se è presente una categoria esplicita valida tra i 10 reparti universali
  if (category === 'ortofrutta' || category === 'macelleria' || category === 'pescheria' ||
      category === 'latticini-uova' || category === 'panetteria' || category === 'dispensa' ||
      category === 'colazione-snack' || category === 'surgelati' || category === 'bevande' ||
      category === 'igiene-cura') {
    return category;
  }

  // 3. Compatibilità categorie legacy
  if (category === 'frutta-verdura') return 'ortofrutta';
  if (category === 'pane-pasticceria') return 'panetteria';
  if (category === 'pulizia' || category === 'igiene') return 'igiene-cura';
  if (category === 'carne-pesce') {
    return n && detectSupermarketCategory(n) === 'pescheria' ? 'pescheria' : 'macelleria';
  }

  if (n) {
    return detectSupermarketCategory(n);
  }

  return 'dispensa';
};

const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

function ProductThumb({ name, emoji, size = 44 }: { name: string; emoji?: string; size?: number }) {
  const e = emoji || guessEmoji(name);
  return (
    <span
      style={{ width: size, height: size, fontSize: Math.round(size * 0.5) }}
      className="flex items-center justify-center shrink-0 rounded-xl bg-[var(--surface-variant)] ring-1 ring-[var(--border)]"
    >
      {e}
    </span>
  );
}

export const SupermarketScreen = ({ module, onSave, onClose, onShare }: SupermarketScreenProps) => {
  const [data, setData] = useState<SupermarketModule>(module);
  const [itemName, setItemName] = useState('');
  const [itemQty, setItemQty] = useState('');
  const [itemUnit, setItemUnit] = useState('');
  const [suggestions, setSuggestions] = useState<CatalogProduct[]>([]);
  const [highlighted, setHighlighted] = useState(0);
  const [selectedSuggestion, setSelectedSuggestion] = useState<CatalogProduct | null>(null);
  const [dupeMsg, setDupeMsg] = useState<string | null>(null);
  const [catFilter, setCatFilter] = useState<SupermarketCategory | null>(null);
  const [collapsedAisles, setCollapsedAisles] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [previewIngredient, setPreviewIngredient] = useState<{ name: string; amount?: number; unit?: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const qtyRef = useRef<HTMLInputElement>(null);

  /* Gestione tasto back / gesture swipe di sistema da App.tsx */
  useEffect(() => {
    const onSupermarketBack = () => {
      if (previewIngredient) {
        setPreviewIngredient(null);
        return;
      }
      if (showDeleteConfirm) {
        setShowDeleteConfirm(false);
        return;
      }
      onClose();
    };
    window.addEventListener('supermarket-back', onSupermarketBack);
    return () => window.removeEventListener('supermarket-back', onSupermarketBack);
  }, [previewIngredient, showDeleteConfirm, onClose]);

  /* Dati volantini: fallback sul bundle, poi aggiornati dal servizio live */
  

  useEffect(() => {
    setDupeMsg(null);
    const q = itemName.trim().length >= 2;
    setSuggestions(q && !selectedSuggestion ? findProductMatches(itemName, 7) : []);
    setHighlighted(0);
  }, [itemName, selectedSuggestion]);

  const update = (updated: SupermarketModule) => {
    setData(updated);
    onSave(updated);
  };

  const applySuggestion = (p: CatalogProduct) => {
    setItemName(p.n);
    const parsed = parseSuggestionQ(p.q);
    setItemQty(parsed.qty);
    // Auto-detect unit: liquid → lt/ml, solid → g/kg/pz
    const autoUnit = parsed.unit || getDefaultUnit(p.n, p.c, p.q);
    setItemUnit(autoUnit);
    setSelectedSuggestion(p);
    setSuggestions([]);
    // Focus on qty field so user can adjust quantity before pressing +
    setTimeout(() => qtyRef.current?.focus(), 50);
  };

  const addItem = () => {
    const name = itemName.trim();
    if (!name) return;

    if (data.items.some(i => normalize(i.name) === normalize(name))) {
      setDupeMsg(`"${name}" è già nella lista`);
      setTimeout(() => setDupeMsg(null), 2500);
      return;
    }

    const cat: SupermarketCategory = selectedSuggestion
      ? mapToAisle(selectedSuggestion.c, name)
      : mapToAisle(undefined, name);

    const quantity = itemQty.trim() ? formatQuantity(itemQty, itemUnit) : selectedSuggestion?.q || undefined;

    const item: SupermarketItem = {
      id: generateUUID(),
      name,
      quantity,
      category: cat,
      checked: false
    };
    // Save automatically when pressing +
    update({ ...data, items: [...data.items, item] });
    setItemName('');
    setItemQty('');
    setItemUnit('');
    setSelectedSuggestion(null);
    setSuggestions([]);
    inputRef.current?.focus();
  };

  const toggleCollapseAisle = (aisleId: string) => {
    setCollapsedAisles(prev => {
      const next = new Set(prev);
      if (next.has(aisleId)) next.delete(aisleId);
      else next.add(aisleId);
      return next;
    });
  };

  const toggleChecked = (id: string) => {
    update({ ...data, items: data.items.map(i => i.id === id ? { ...i, checked: !i.checked } : i) });
  };

  const removeItem = (id: string) => {
    update({ ...data, items: data.items.filter(i => i.id !== id) });
  };

  const confirmDeleteList = () => {
    update({ ...data, items: [] });
    setShowDeleteConfirm(false);
  };

  const total = data.items.length;
  const done = data.items.filter(i => i.checked).length;
  const pending = total - done;
  const progress = total > 0 ? Math.round((done / total) * 100) : 0;

  const grouped = useMemo(() => {
    const map = new Map<SupermarketCategory, SupermarketItem[]>();
    for (const aisle of SUPERMARKET_AISLES) map.set(aisle.id, []);
    for (const item of data.items) {
      const aisleId = mapToAisle(item.category, item.name);
      if (catFilter && aisleId !== catFilter) continue;
      (map.get(aisleId) || map.get('altro')!).push(item);
    }
    return SUPERMARKET_AISLES.map(aisle => ({
      ...aisle,
      items: (map.get(aisle.id) || []).sort((a, b) => Number(a.checked) - Number(b.checked))
    })).filter(aisle => aisle.items.length > 0);
  }, [data.items, catFilter]);

  /* Miglior prezzo per ogni articolo della lista, dalle offerte dei volantini */
  const bestOffers = useMemo(() => {
    const map = new Map<string, { price: string; store: string; fid: string; pg: number } | null>();
    for (const item of data.items) {
      const matches = findOffersForName(item.name);
      if (!matches.length) { map.set(item.id, null); continue; }
      const best = matches[0];
      map.set(item.id, {
        price: best.p.toFixed(2).replace('.', ','),
        store: best.s,
        fid: best.fid,
        pg: best.pg,
      });
    }
    return map;
  }, [data.items]);

  const openOfferFlyer = (fid: string, pg: number, store?: string) => {
    window.dispatchEvent(new CustomEvent('open-flyer-offer', { detail: { fid, pg, store, chain: store } }));
  };

  const catCounts = useMemo(() => {
    const map = new Map<SupermarketCategory, number>();
    for (const item of data.items) {
      const aisleId = mapToAisle(item.category, item.name);
      map.set(aisleId, (map.get(aisleId) || 0) + 1);
    }
    return map;
  }, [data.items]);

  /* Clear selection when user modifies text after selecting a suggestion */
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setItemName(val);
    if (selectedSuggestion && val !== selectedSuggestion.n) {
      setSelectedSuggestion(null);
      setItemUnit('');
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="fixed inset-0 z-[150] flex flex-col h-[100dvh] w-full bg-[var(--bg)] overflow-hidden">

      {/* ═══════ DELETE CONFIRMATION POPUP ═══════ */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm px-6"
            onClick={() => setShowDeleteConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-sm bg-[var(--card-bg)] rounded-3xl border border-[var(--border)] shadow-2xl overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-rose-500/10 flex items-center justify-center">
                  <AlertTriangle className="w-8 h-8 text-rose-500" />
                </div>
                <h3 className="text-lg font-black text-[var(--text-main)] mb-2">Eliminare la lista?</h3>
                <p className="text-sm text-[var(--text-muted)]">
                  {total === 1
                    ? 'Verrà eliminato 1 prodotto dalla lista della spesa.'
                    : `Verranno eliminati ${total} prodotti dalla lista della spesa.`}
                  <br />Questa azione non può essere annullata.
                </p>
              </div>
              <div className="flex border-t border-[var(--border)]">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-4 text-sm font-bold text-[var(--text-muted)] hover:bg-[var(--surface-variant)] transition-colors"
                >
                  Annulla
                </button>
                <div className="w-px bg-[var(--border)]" />
                <button
                  onClick={confirmDeleteList}
                  className="flex-1 py-4 text-sm font-bold text-rose-500 hover:bg-rose-500/10 transition-colors"
                >
                  Elimina tutto
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════ HEADER ═══════ */}
      <header className="flex items-center justify-between pt-[max(env(safe-area-inset-top),16px)] px-4 pb-3 bg-[var(--card-bg)] border-b border-[var(--border)] shrink-0 z-30">
        <div className="flex items-center gap-3 min-w-0">
          <button 
            type="button" 
            onClick={onClose} 
            className="p-2.5 -ml-2 hover:bg-[var(--surface-variant)] rounded-full text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors shrink-0 cursor-pointer"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center shrink-0">
              <ShoppingBasket className="w-5 h-5" />
            </div>
            <h1 className="text-xl lg:text-2xl font-bold text-[var(--text-main)] truncate">{data.title || 'Lista della Spesa'}</h1>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onShare(data)}
            title="Condividi lista"
            disabled={total === 0}
            className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 disabled:opacity-40 transition-colors cursor-pointer"
          >
            <Share2 className="w-5 h-5" />
          </button>
        </div>
      </header>

      {(() => {
        const hasActiveView = total > 0;

        return (
          <main className={`flex-1 flex flex-col ${
            !hasActiveView
              ? 'h-full justify-center items-center overflow-y-auto p-4 sm:p-6 pb-10 sm:pb-16 custom-scrollbar'
              : 'overflow-y-auto p-4 md:p-8 custom-scrollbar overscroll-contain scroll-smooth pb-[max(env(safe-area-inset-bottom),16px)]'
          }`}>
            {/* HERO BARRA & TITOLO (Perfettamente centrato quando la lista è vuota) */}
            <div className={`w-full transition-all duration-200 ${
              !hasActiveView
                ? 'max-w-xl mx-auto space-y-6 text-center my-auto flex flex-col items-center'
                : 'max-w-3xl mx-auto space-y-3 mb-4 shrink-0'
            }`}>
              {/* TITOLO AL CENTRO */}
              <div className="text-center space-y-1.5">
                <h2 className={`font-black text-[var(--text-main)] tracking-tight transition-all ${
                  !hasActiveView ? 'text-3xl sm:text-4xl' : 'text-xl sm:text-2xl'
                }`}>
                  Cosa dobbiamo comprare?
                </h2>
                {!hasActiveView && (
                  <p className="text-xs sm:text-sm text-[var(--text-muted)] font-medium max-w-sm mx-auto">
                    Aggiungi prodotti alla spesa per organizzarli per reparto
                  </p>
                )}
              </div>

              {/* BARRA DI RICERCA ED AGGIUNTA PRODOTTO */}
              <div className="w-full">
                <div className="relative group w-full">
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-cyan-500/20 rounded-2xl sm:rounded-3xl blur-xl opacity-70 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none" />
                  <div className="relative flex items-center gap-2.5 sm:gap-3 bg-[var(--card-bg)] border-2 border-[var(--border)] focus-within:border-emerald-500 rounded-2xl sm:rounded-3xl px-3.5 sm:px-5 py-3 sm:py-4 shadow-lg transition-all">
                    <Search className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-500 shrink-0" />
                    <input
                      ref={inputRef}
                      type="text"
                      value={itemName}
                      onChange={handleNameChange}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          if (suggestions.length > 0) applySuggestion(suggestions[Math.min(highlighted, suggestions.length - 1)]);
                          else addItem();
                        } else if (e.key === 'ArrowDown' && suggestions.length > 0) {
                          e.preventDefault();
                          setHighlighted(h => (h + 1) % suggestions.length);
                        } else if (e.key === 'ArrowUp' && suggestions.length > 0) {
                          e.preventDefault();
                          setHighlighted(h => (h - 1 + suggestions.length) % suggestions.length);
                        } else if (e.key === 'Escape') {
                          setSuggestions([]);
                        }
                      }}
                      placeholder="Cerca prodotto (es. Pane, Latte, Mele)..."
                      className="flex-1 bg-transparent text-[var(--text-main)] placeholder-[var(--text-muted)] outline-none text-sm sm:text-base font-medium min-w-0"
                    />
                    {itemName && (
                      <button 
                        type="button" 
                        onClick={() => { setItemName(''); setSelectedSuggestion(null); setItemQty(''); setItemUnit(''); setSuggestions([]); }} 
                        className="p-1 rounded-full hover:bg-[var(--surface-variant)] text-[var(--text-muted)] cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                    <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider px-2 py-0.5 sm:py-1 rounded-lg bg-emerald-500/15 text-emerald-600 border border-emerald-500/20 shrink-0 hidden sm:inline-block">
                      Reparti
                    </span>
                  </div>

                  {/* SUGGESTIONS DROPDOWN */}
                  <AnimatePresence>
                    {suggestions.length > 0 && (
                      <motion.ul
                        initial={{ opacity: 0, y: -6, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.98 }}
                        transition={{ duration: 0.12 }}
                        className="absolute left-0 right-0 top-full mt-2 bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden max-h-64 overflow-y-auto custom-scrollbar z-50 text-left"
                      >
                        {suggestions.map((s, i) => (
                          <li key={s.n + i}>
                            <button
                              type="button"
                              onMouseDown={(e) => { e.preventDefault(); applySuggestion(s); }}
                              onMouseEnter={() => setHighlighted(i)}
                              className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-left transition-colors cursor-pointer ${highlighted === i ? 'bg-emerald-500/10' : ''}`}
                            >
                              <ProductThumb name={s.n} emoji={s.e} size={36} />
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-sm text-[var(--text-main)] truncate">{s.n}</p>
                                <p className="text-[10px] text-[var(--text-muted)] font-medium">{PRODUCT_CATEGORY_LABEL[s.c]}</p>
                              </div>
                              {s.q && (
                                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 rounded-full px-2 py-0.5 shrink-0">
                                  {s.q}
                                </span>
                              )}
                            </button>
                          </li>
                        ))}
                      </motion.ul>
                    )}
                  </AnimatePresence>
                </div>

                {/* Quantity + Unit + Add button row — shown when a product is selected or typed */}
                {(selectedSuggestion || itemName.trim().length >= 2) && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex flex-wrap items-center gap-2 mt-3"
                  >
                    {/* Selected product badge */}
                    {selectedSuggestion && (
                      <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-2.5 py-2 min-w-0 shrink">
                        <span className="text-sm shrink-0">{selectedSuggestion.e || guessEmoji(selectedSuggestion.n)}</span>
                        <span className="text-xs font-bold text-emerald-600 truncate">{selectedSuggestion.n}</span>
                        <button type="button" onClick={() => { setSelectedSuggestion(null); setItemName(''); setItemQty(''); setItemUnit(''); inputRef.current?.focus(); }} className="ml-0.5 text-emerald-500 hover:text-emerald-700 shrink-0 cursor-pointer">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {/* Quantity input */}
                    <input
                      ref={qtyRef}
                      type="text"
                      inputMode="decimal"
                      value={itemQty}
                      onChange={e => setItemQty(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') addItem(); }}
                      placeholder="Qtà"
                      className="flex-1 min-w-[60px] max-w-[80px] px-2.5 py-2.5 bg-[var(--card-bg)] border border-[var(--border)] rounded-xl outline-none focus:border-emerald-500 transition-all font-medium text-[var(--text-main)] placeholder:text-[var(--text-muted)] text-center text-sm"
                    />

                    {/* Unit selector */}
                    <div className="relative flex-1 min-w-[80px]">
                      <Scale className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)] pointer-events-none" />
                      <select
                        value={itemUnit}
                        onChange={e => setItemUnit(e.target.value)}
                        className="w-full pl-8 pr-3 py-2.5 bg-[var(--card-bg)] border border-[var(--border)] rounded-xl outline-none focus:border-emerald-500 transition-all font-medium text-[var(--text-main)] text-sm appearance-none cursor-pointer"
                      >
                        <option value="">Unità</option>
                        <optgroup label="Peso">
                          <option value="g">g</option>
                          <option value="kg">kg</option>
                          <option value="etto">etto</option>
                        </optgroup>
                        <optgroup label="Liquidi">
                          <option value="ml">ml</option>
                          <option value="lt">lt</option>
                        </optgroup>
                        <optgroup label="Quantità">
                          <option value="pz">pz</option>
                          <option value="busta">busta</option>
                          <option value="lattina">lattina</option>
                          <option value="barattolo">barattolo</option>
                          <option value="bottiglia">bottiglia</option>
                          <option value="confezione">confezione</option>
                          <option value="mazzo">mazzo</option>
                          <option value="fetta">fetta</option>
                          <option value="scatola">scatola</option>
                          <option value="pacco">pacco</option>
                          <option value="vasetto">vasetto</option>
                        </optgroup>
                      </select>
                    </div>

                    {/* + Add button */}
                    <button
                      type="button"
                      onClick={addItem}
                      title="Aggiungi alla lista"
                      className="w-12 h-12 flex items-center justify-center bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold transition-all active:scale-95 shadow-lg shadow-emerald-500/25 shrink-0 ml-auto cursor-pointer"
                    >
                      <Plus className="w-6 h-6" />
                    </button>
                  </motion.div>
                )}

                {/* Dupe warning */}
                <AnimatePresence>
                  {dupeMsg && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="text-center text-xs font-bold text-amber-600 bg-amber-500/10 border border-amber-500/20 rounded-xl py-2 px-3 mt-2"
                    >
                      {dupeMsg}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* STATO VUOTO ELEGANTE (CENTRATO SOTTO LA BARRA COME IN RICETTARIO) */}
              {!hasActiveView && !selectedSuggestion && suggestions.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="pt-8 sm:pt-12 flex flex-col items-center justify-center text-center px-4"
                >
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4 sm:mb-5 border border-emerald-500/20 shadow-xs">
                    <ShoppingBasket className="w-8 h-8 sm:w-10 sm:h-10 text-emerald-500" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-[var(--text-main)] mb-1.5 sm:mb-2">
                    Lista della spesa vuota
                  </h3>
                  <p className="text-xs sm:text-sm text-[var(--text-muted)] max-w-xs leading-relaxed">
                    Cerca un prodotto nella barra in alto per iniziare ad aggiungere articoli alla tua spesa, organizzati automaticamente per reparto.
                  </p>
                </motion.div>
              )}
            </div>

            {/* SE CI SONO ARTICOLI: PROGRESS, FILTRI REPARTI E LISTA ARTICOLI */}
            {hasActiveView && (
              <div className="max-w-3xl mx-auto w-full space-y-4">
                {/* ═══════ PROGRESS + DELETE LIST ═══════ */}
                <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-3.5 shadow-xs">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs font-bold text-[var(--text-muted)] flex items-center gap-1">
                        <ShoppingBasket className="w-3.5 h-3.5 text-emerald-500" /> {total} prodotti
                      </span>
                      {pending > 0 && (
                        <span className="text-[10px] font-bold text-amber-600 bg-amber-500/10 border border-amber-500/20 rounded-full px-2 py-0.5">{pending} da comprare</span>
                      )}
                      {done > 0 && (
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2 py-0.5">✓ {done}</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="text-[11px] font-bold text-[var(--text-muted)] hover:text-rose-500 flex items-center gap-1 transition-colors px-2 py-1 rounded-lg hover:bg-rose-500/10 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Elimina tutto
                    </button>
                  </div>
                  {/* Progress bar */}
                  <div className="h-1.5 bg-[var(--surface-variant)] rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"
                      initial={false}
                      animate={{ width: `${progress}%` }}
                      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    />
                  </div>
                </div>

                {/* ═══════ CATEGORY / AISLE FILTER ═══════ */}
                <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1">
                  <button
                    type="button"
                    onClick={() => setCatFilter(null)}
                    className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors cursor-pointer ${
                      !catFilter
                        ? 'bg-emerald-500 text-white border-emerald-500 shadow-xs'
                        : 'bg-[var(--card-bg)] text-[var(--text-muted)] border-[var(--border)] hover:text-[var(--text-main)]'
                    }`}
                  >
                    Tutti i Reparti
                  </button>
                  {SUPERMARKET_AISLES.filter(c => catCounts.get(c.id)).map(c => {
                    const count = catCounts.get(c.id) || 0;
                    const active = catFilter === c.id;
                    return (
                      <button
                        type="button"
                        key={c.id}
                        onClick={() => setCatFilter(active ? null : c.id)}
                        className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border transition-colors cursor-pointer ${
                          active
                            ? 'bg-emerald-500 text-white border-emerald-500 shadow-xs'
                            : 'bg-[var(--card-bg)] text-[var(--text-muted)] border-[var(--border)] hover:text-[var(--text-main)]'
                        }`}
                      >
                        <span>{c.emoji}</span>
                        <span className="hidden sm:inline">{c.label}</span>
                        <span className={`${active ? 'text-white/90' : 'text-[var(--text-muted)]/70'}`}>{count}</span>
                      </button>
                    );
                  })}
                </div>

                {/* ═══════ MAIN LIST BY SUPERMARKET AISLE ═══════ */}
                <div className="space-y-3">
                  {grouped.map(cat => {
                    const isCollapsed = collapsedAisles.has(cat.id);
                    const doneInAisle = cat.items.filter(i => i.checked).length;
                    const totalInAisle = cat.items.length;
                    const isAisleComplete = doneInAisle === totalInAisle;

                    return (
                      <div key={cat.id} className="bg-[var(--card-bg)] rounded-2xl border border-[var(--border)] overflow-hidden shadow-sm transition-all">
                        {/* Reparto Supermercato Header (Collapsible) */}
                        <button
                          type="button"
                          onClick={() => toggleCollapseAisle(cat.id)}
                          className="w-full flex items-center justify-between gap-2.5 px-4 py-3 border-b border-[var(--border)] bg-[var(--surface-variant)]/20 hover:bg-[var(--surface-variant)]/50 transition-colors text-left cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="text-xl shrink-0">{cat.emoji}</span>
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${cat.color}`}>
                              <cat.icon className="w-4 h-4" />
                            </div>
                            <h4 className="font-black text-xs uppercase tracking-wider text-[var(--text-main)] truncate">
                              {cat.label}
                            </h4>
                          </div>
                          
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                              isAisleComplete
                                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                : cat.badgeColor
                            }`}>
                              {doneInAisle}/{totalInAisle} {isAisleComplete ? '✓' : ''}
                            </span>
                            {isCollapsed ? (
                              <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
                            ) : (
                              <ChevronUp className="w-4 h-4 text-[var(--text-muted)]" />
                            )}
                          </div>
                        </button>

                        {/* Items */}
                        {!isCollapsed && (
                          <ul className="divide-y divide-[var(--border)]">
                            <AnimatePresence initial={false}>
                              {cat.items.map(item => {
                                return (
                                  <motion.li
                                    key={item.id}
                                    layout
                                    initial={{ opacity: 0, y: -8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, x: 24 }}
                                    transition={{ duration: 0.15 }}
                                    className={`flex items-center gap-2.5 px-3 py-2.5 transition-opacity ${item.checked ? 'opacity-40' : ''}`}
                                  >
                                    {/* Checkbox */}
                                    <button
                                      type="button"
                                      onClick={() => toggleChecked(item.id)}
                                      aria-label={item.checked ? 'Rimuovi spunta' : 'Segna acquistato'}
                                      className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all active:scale-90 cursor-pointer ${
                                        item.checked
                                          ? 'bg-emerald-500 border-emerald-500 text-white'
                                          : 'border-[var(--border)] hover:border-emerald-500 text-transparent'
                                      }`}
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                    </button>
                                    {/* Emoji */}
                                    <button
                                      type="button"
                                      onClick={() => setPreviewIngredient({ name: item.name })}
                                      className="cursor-pointer hover:scale-105 active:scale-95 transition-transform shrink-0"
                                      title="Visualizza informazioni alimento"
                                    >
                                      <ProductThumb name={item.name} size={36} />
                                    </button>
                                    {/* Name + Qty */}
                                    <div className="flex-1 min-w-0">
                                      <button
                                        type="button"
                                        onClick={() => setPreviewIngredient({ name: item.name })}
                                        className="text-left group/name flex items-center gap-1.5 max-w-full cursor-pointer"
                                        title="Visualizza scheda alimento Wikipedia"
                                      >
                                        <p className={`font-bold text-sm text-[var(--text-main)] truncate group-hover/name:text-emerald-500 transition-colors ${item.checked ? 'line-through' : ''}`}>
                                          {item.name}
                                        </p>
                                        <span className="p-0.5 rounded-full text-[var(--text-muted)] group-hover/name:text-emerald-500 opacity-60 group-hover/name:opacity-100 transition-all shrink-0">
                                          <Info className="w-3.5 h-3.5" />
                                        </span>
                                      </button>
                                      {item.quantity && <p className="text-[11px] text-[var(--text-muted)] font-medium">{item.quantity}</p>}
                                      {/* Dove costa meno — offre dai volantini */}
                                      {bestOffers.get(item.id) && (
                                        <button
                                          type="button"
                                          onClick={() => { const o = bestOffers.get(item.id); if (o) openOfferFlyer(o.fid, o.pg, o.store); }}
                                          title={`Dove costa meno: ${bestOffers.get(item.id)!.store} · ${bestOffers.get(item.id)!.price} € · apri il volantino alla pagina dell'offerta`}
                                          className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2 py-0.5 hover:bg-emerald-500/20 transition-colors cursor-pointer"
                                        >
                                          <Store className="w-2.5 h-2.5" />
                                          {bestOffers.get(item.id)!.price} € · {bestOffers.get(item.id)!.store}
                                          <span className="underline decoration-dotted">vedi nel volantino</span>
                                        </button>
                                      )}
                                    </div>
                                    {/* Delete single item */}
                                    <button
                                      type="button"
                                      onClick={() => removeItem(item.id)}
                                      aria-label="Rimuovi"
                                      className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-500/10 shrink-0 transition-colors cursor-pointer"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </motion.li>
                                );
                              })}
                            </AnimatePresence>
                          </ul>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </main>
        );
      })()}

      {/* Modale Wikipedia / Scheda Enciclopedica Alimento */}
      <IngredientModal
        ingredient={previewIngredient}
        onClose={() => setPreviewIngredient(null)}
      />
    </motion.div>
  );
};
