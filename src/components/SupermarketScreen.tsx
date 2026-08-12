import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SupermarketModule, SupermarketItem, SupermarketCategory } from '../types';
import {
  ArrowLeft, Plus, Trash2, CheckCircle2, Refrigerator,
  Apple, Milk, Drumstick, Croissant, PackageCheck, GlassWater, SprayCan,
  ShowerHead, ShoppingBasket, Share2, Search, AlertTriangle, X, Scale
} from 'lucide-react';
import { generateUUID } from '../utils/uuid';
import {
  CatalogProduct, findProductMatches, guessEmoji,
  PRODUCT_CATEGORY_LABEL, normalizeProduct
} from '../data/supermarketProducts';

interface SupermarketScreenProps {
  module: SupermarketModule;
  onSave: (m: SupermarketModule) => void;
  onClose: () => void;
  onShare: (m: SupermarketModule) => void;
}

const FRIDGE_STORAGE_KEY = 'chelona_fridge_ingredients';

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

const CATEGORY_META: { id: SupermarketCategory; label: string; icon: any; color: string }[] = [
  { id: 'frutta-verdura', label: 'Frutta & Verdura', icon: Apple, color: 'text-green-500 bg-green-500/10' },
  { id: 'latticini-uova', label: 'Latticini & Uova', icon: Milk, color: 'text-sky-500 bg-sky-500/10' },
  { id: 'carne-pesce', label: 'Carne & Pesce', icon: Drumstick, color: 'text-rose-500 bg-rose-500/10' },
  { id: 'pane-pasticceria', label: 'Pane & Pasticceria', icon: Croissant, color: 'text-amber-500 bg-amber-500/10' },
  { id: 'dispensa', label: 'Dispensa', icon: PackageCheck, color: 'text-orange-500 bg-orange-500/10' },
  { id: 'bevande', label: 'Bevande', icon: GlassWater, color: 'text-blue-500 bg-blue-500/10' },
  { id: 'pulizia', label: 'Pulizia Casa', icon: SprayCan, color: 'text-teal-500 bg-teal-500/10' },
  { id: 'igiene', label: 'Igiene Personale', icon: ShowerHead, color: 'text-purple-500 bg-purple-500/10' },
  { id: 'altro', label: 'Altro', icon: ShoppingBasket, color: 'text-slate-500 bg-slate-500/10' }
];

const fallbackClassify = (name: string): SupermarketCategory => {
  const t = name.toLowerCase();
  if (/(mela|banana|arancia|limone|pomodoro|insalata|patat|cipoll|aglio|carot|zucchin|peperon|melanzan|broccol|spinaci|fung|fragol|uva|pera|pesca|albicocc|cilieg|anguria|melone|kiwi|ananas|mango|avocado|asparag|porro|sedano|finocchi|rucola|lattuga|radicchio|minestrone|verdur|frutt|basilic|prezzemol|rosmarin|timo|salvia|menta|origano|alloro)/i.test(t)) return 'frutta-verdura';
  if (/(latte|formaggi|mozzarell|parmigian|grana|pecorin|ricott|burro|yogurt|panna|stracchin|gorgonzol|taleggio|provolon|scamorz|uova|uovo|fontina|emmental|brie|feta|mascarpone|sottilette)/i.test(t)) return 'latticini-uova';
  if (/(pollo|manzo|maiale|tacchin|vitello|agnello|salsiccia|salame|prosciutt|pancetta|bacon|wurstel|bistecca|carne|salmone|tonno|merluzz|orata|branzin|sogliola|gamber|calamar|polpo|mussol|vongol|cozze|pesce|mortadell|speck|hamburger|stinco|coscia|fesa|arrosto|spezzatino)/i.test(t)) return 'carne-pesce';
  if (/(pane|panino|focaccia|grissin|biscott|crackers|croissant|brioche|merendin|torta|dolc|pandoro|panettone|piadina|pizza)/i.test(t)) return 'pane-pasticceria';
  if (/(pasta|riso|farina|zucchero|sale|olio|aceto|legum|lenticchi|ceci|fagioli|scatolam|pelati|sugo|passata|caff|te|the|tisana|cioccolato|miele|marmellat|nutella|sottolio|sottaceti|maionese|senape|ketchup|brodo|semi|mandorle|noci|pistacchi|avena|muesli|polenta|gnocchi|dadi|surgelat|gelato|amido|lievito|bicarbonato|vanillina|cacao)/i.test(t)) return 'dispensa';
  if (/(acqua|vino|birra|succo|aranciate|cola|coca|spumante|prosecco|champagne|aperitiv|amaro|whisky|grappa|frizzante|redbull|smoothie)/i.test(t)) return 'bevande';
  if (/(detersivo|candeggina|sapone|spugna|carta igienica|scottex|rotoloni|ammorbidente|vetri|lavastovigli|multiuso|panni|sacchetto|sturalavandino|igienizzante|ammoniaca|paglietta|guanti)/i.test(t)) return 'pulizia';
  if (/(shampoo|balsamo|dentifricio|spazzolino|deodorante|doccia|crema|fazzoletti|pannolini|assorbenti|rasoio|cotone|salviett|collutorio|bagnoschiuma|cerotti|gel)/i.test(t)) return 'igiene';
  return 'altro';
};

const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

const loadFridge = (): string[] => {
  try {
    const saved = localStorage.getItem(FRIDGE_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

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

const openFridge = () => {
  window.dispatchEvent(new CustomEvent('open-recipes', { detail: { category: 'fridge' } }));
};

export const SupermarketScreen = ({ module, onSave, onClose, onShare }: SupermarketScreenProps) => {
  const [data, setData] = useState<SupermarketModule>(module);
  const [itemName, setItemName] = useState('');
  const [itemQty, setItemQty] = useState('');
  const [itemUnit, setItemUnit] = useState('');
  const [fridgeIngredients, setFridgeIngredients] = useState<string[]>(loadFridge);
  const [suggestions, setSuggestions] = useState<CatalogProduct[]>([]);
  const [highlighted, setHighlighted] = useState(0);
  const [selectedSuggestion, setSelectedSuggestion] = useState<CatalogProduct | null>(null);
  const [dupeMsg, setDupeMsg] = useState<string | null>(null);
  const [catFilter, setCatFilter] = useState<SupermarketCategory | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const qtyRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = () => setFridgeIngredients(loadFridge());
    window.addEventListener('chelona_fridge_updated', handler);
    return () => window.removeEventListener('chelona_fridge_updated', handler);
  }, []);

  useEffect(() => {
    localStorage.setItem(FRIDGE_STORAGE_KEY, JSON.stringify(fridgeIngredients));
  }, [fridgeIngredients]);

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

  const inFridge = (name: string): boolean => {
    const n = normalize(name);
    if (n.length < 3) return false;
    return fridgeIngredients.some(f => {
      const fn = normalize(f);
      return fn === n || (n.length >= 4 && (fn.includes(n) || n.includes(fn)));
    });
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
      ? selectedSuggestion.c
      : fallbackClassify(name);

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

  const toggleChecked = (id: string) => {
    update({ ...data, items: data.items.map(i => i.id === id ? { ...i, checked: !i.checked } : i) });
  };

  const removeItem = (id: string) => {
    update({ ...data, items: data.items.filter(i => i.id !== id) });
  };

  const moveToFridge = (id: string) => {
    const item = data.items.find(i => i.id === id);
    if (!item) return;
    const name = normalize(item.name);
    setFridgeIngredients(prev => prev.some(f => normalize(f) === name) ? prev : [...prev, item.name.trim()]);
    update({ ...data, items: data.items.filter(i => i.id !== id) });
    window.dispatchEvent(new CustomEvent('chelona_fridge_updated'));
  };

  const confirmDeleteList = () => {
    update({ ...data, items: [] });
    setShowDeleteConfirm(false);
  };

  const total = data.items.length;
  const done = data.items.filter(i => i.checked).length;
  const alreadyInFridge = data.items.filter(i => !i.checked && inFridge(i.name)).length;
  const pending = total - done;
  const progress = total > 0 ? Math.round((done / total) * 100) : 0;

  const grouped = useMemo(() => {
    const map = new Map<SupermarketCategory, SupermarketItem[]>();
    for (const cat of CATEGORY_META) map.set(cat.id, []);
    for (const item of data.items) {
      if (catFilter && item.category !== catFilter) continue;
      (map.get(item.category) || map.get('altro')!).push(item);
    }
    return CATEGORY_META.map(c => ({
      ...c,
      items: (map.get(c.id) || []).sort((a, b) => Number(a.checked) - Number(b.checked))
    })).filter(c => c.items.length > 0);
  }, [data.items, catFilter]);

  const catCounts = useMemo(() => {
    const map = new Map<SupermarketCategory, number>();
    for (const item of data.items) {
      map.set(item.category, (map.get(item.category) || 0) + 1);
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
      <header className="flex items-center gap-3 pt-[max(env(safe-area-inset-top),16px)] px-4 pb-3 bg-[var(--card-bg)] border-b border-[var(--border)] shrink-0 z-30">
        <button onClick={onClose} className="p-2.5 -ml-2 hover:bg-[var(--surface-variant)] rounded-full text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors shrink-0">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex-1 min-w-0 text-center">
          <h1 className="text-lg font-black text-[var(--text-main)] truncate">{data.title || 'Lista della Spesa'}</h1>
          <p className="text-[11px] text-[var(--text-muted)] font-medium">
            {total > 0 ? `${pending} da comprare · ${done} acquistati` : 'Cerca e aggiungi prodotti'}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={openFridge}
            title={`Frigorifero (${fridgeIngredients.length})`}
            className="relative p-2.5 rounded-2xl bg-sky-500/10 text-sky-500 hover:bg-sky-500/20 transition-colors"
          >
            <Refrigerator className="w-5 h-5" />
            {fridgeIngredients.length > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-sky-500 text-white text-[9px] font-black flex items-center justify-center shadow">
                {fridgeIngredients.length}
              </span>
            )}
          </button>
          <button
            onClick={() => onShare(data)}
            title="Condividi lista"
            disabled={total === 0}
            className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 disabled:opacity-40 transition-colors"
          >
            <Share2 className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="flex-1 min-h-0 flex flex-col">
        {/* ═══════ ADD BAR ═══════ */}
        <div className="shrink-0 sticky top-0 z-40 px-4 pt-3 pb-2 bg-[var(--bg)]/95 backdrop-blur-lg border-b border-[var(--border)]">
          <div className="max-w-lg mx-auto space-y-2">
            {/* Search input */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)] pointer-events-none" />
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
                placeholder="Cerca prodotto..."
                className="w-full pl-11 pr-4 py-3.5 bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all font-medium text-[var(--text-main)] placeholder:text-[var(--text-muted)] text-[15px]"
              />

              {/* SUGGESTIONS DROPDOWN — clicking selects */}
              <AnimatePresence>
                {suggestions.length > 0 && (
                  <motion.ul
                    initial={{ opacity: 0, y: -6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.98 }}
                    transition={{ duration: 0.12 }}
                    className="absolute left-0 right-0 top-full mt-1.5 bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden max-h-64 overflow-y-auto custom-scrollbar z-50"
                  >
                    {suggestions.map((s, i) => (
                      <li key={s.n + i}>
                        <button
                          onMouseDown={(e) => { e.preventDefault(); applySuggestion(s); }}
                          onMouseEnter={() => setHighlighted(i)}
                          className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-left transition-colors ${highlighted === i ? 'bg-emerald-500/10' : ''}`}
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
                className="flex items-center gap-2"
              >
                {/* Selected product badge */}
                {selectedSuggestion && (
                  <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-2.5 py-2 shrink-0">
                    <span className="text-sm">{selectedSuggestion.e || guessEmoji(selectedSuggestion.n)}</span>
                    <span className="text-xs font-bold text-emerald-600 max-w-[80px] truncate">{selectedSuggestion.n}</span>
                    <button onClick={() => { setSelectedSuggestion(null); setItemName(''); setItemQty(''); setItemUnit(''); inputRef.current?.focus(); }} className="ml-0.5 text-emerald-500 hover:text-emerald-700">
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
                  className="w-16 px-2.5 py-2.5 bg-[var(--card-bg)] border border-[var(--border)] rounded-xl outline-none focus:border-emerald-500 transition-all font-medium text-[var(--text-main)] placeholder:text-[var(--text-muted)] text-center text-sm shrink-0"
                />

                {/* Unit selector */}
                <div className="relative shrink-0">
                  <Scale className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)] pointer-events-none" />
                  <select
                    value={itemUnit}
                    onChange={e => setItemUnit(e.target.value)}
                    className="pl-8 pr-3 py-2.5 bg-[var(--card-bg)] border border-[var(--border)] rounded-xl outline-none focus:border-emerald-500 transition-all font-medium text-[var(--text-main)] text-sm appearance-none cursor-pointer min-w-[80px]"
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
                  onClick={addItem}
                  title="Aggiungi alla lista"
                  className="w-12 h-12 flex items-center justify-center bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold transition-all active:scale-95 shadow-lg shadow-emerald-500/25 shrink-0 ml-auto"
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
                  className="text-center text-xs font-bold text-amber-600 bg-amber-500/10 border border-amber-500/20 rounded-xl py-2 px-3"
                >
                  {dupeMsg}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ═══════ PROGRESS + CATEGORY FILTER ═══════ */}
        {total > 0 && (
          <div className="shrink-0 px-4 pt-3 pb-1">
            <div className="max-w-lg mx-auto">
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
                  {alreadyInFridge > 0 && (
                    <span className="text-[10px] font-bold text-sky-600 bg-sky-500/10 border border-sky-500/20 rounded-full px-2 py-0.5">in frigo</span>
                  )}
                </div>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-[11px] font-bold text-[var(--text-muted)] hover:text-rose-500 flex items-center gap-1 transition-colors px-2 py-1 rounded-lg hover:bg-rose-500/10"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Elimina
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
          </div>
        )}

        {/* CATEGORY FILTER */}
        {total > 0 && (
          <div className="shrink-0 px-4 pt-2 pb-1">
            <div className="max-w-lg mx-auto flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1">
              <button
                onClick={() => setCatFilter(null)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                  !catFilter
                    ? 'bg-emerald-500 text-white border-emerald-500'
                    : 'bg-[var(--card-bg)] text-[var(--text-muted)] border-[var(--border)] hover:text-[var(--text-main)]'
                }`}
              >
                Tutti
              </button>
              {CATEGORY_META.filter(c => catCounts.get(c.id)).map(c => {
                const count = catCounts.get(c.id) || 0;
                const active = catFilter === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => setCatFilter(active ? null : c.id)}
                    className={`shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-bold border transition-colors ${
                      active
                        ? 'bg-emerald-500 text-white border-emerald-500'
                        : 'bg-[var(--card-bg)] text-[var(--text-muted)] border-[var(--border)] hover:text-[var(--text-main)]'
                    }`}
                  >
                    <span className={active ? '' : c.color.split(' ')[0]}><c.icon className="w-3.5 h-3.5" /></span>
                    <span className="hidden sm:inline">{c.label}</span>
                    <span className={`${active ? 'text-white/80' : 'text-[var(--text-muted)]/70'}`}>{count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ═══════ MAIN LIST ═══════ */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain custom-scrollbar scroll-smooth pb-[max(env(safe-area-inset-bottom),8px)]">
          <div className="px-4 pt-3 pb-6 max-w-lg mx-auto w-full">
            {total > 0 ? (
              <div className="space-y-3">
                {grouped.map(cat => (
                  <div key={cat.id} className="bg-[var(--card-bg)] rounded-2xl border border-[var(--border)] overflow-hidden shadow-sm">
                    {/* Category header */}
                    <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-[var(--border)]">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${cat.color}`}>
                        <cat.icon className="w-4 h-4" />
                      </div>
                      <h4 className="font-black text-xs uppercase tracking-wider text-[var(--text-main)] flex-1">{cat.label}</h4>
                      <span className="text-[10px] font-bold text-[var(--text-muted)]">
                        {cat.items.filter(i => i.checked).length}/{cat.items.length}
                      </span>
                    </div>
                    {/* Items */}
                    <ul className="divide-y divide-[var(--border)]">
                      <AnimatePresence initial={false}>
                        {cat.items.map(item => {
                          const inFridgeFlag = !item.checked && inFridge(item.name);
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
                                onClick={() => toggleChecked(item.id)}
                                aria-label={item.checked ? 'Rimuovi spunta' : 'Segna acquistato'}
                                className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all active:scale-90 ${
                                  item.checked
                                    ? 'bg-emerald-500 border-emerald-500 text-white'
                                    : 'border-[var(--border)] hover:border-emerald-500 text-transparent'
                                }`}
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              </button>
                              {/* Emoji */}
                              <ProductThumb name={item.name} size={36} />
                              {/* Name + Qty */}
                              <div className="flex-1 min-w-0">
                                <p className={`font-bold text-sm text-[var(--text-main)] truncate ${item.checked ? 'line-through' : ''}`}>{item.name}</p>
                                {item.quantity && <p className="text-[11px] text-[var(--text-muted)] font-medium">{item.quantity}</p>}
                              </div>
                              {/* Badges */}
                              {inFridgeFlag && (
                                <span className="text-[9px] font-bold text-sky-600 bg-sky-500/10 border border-sky-500/20 rounded-full px-1.5 py-0.5 shrink-0 flex items-center gap-0.5">
                                  <Refrigerator className="w-2.5 h-2.5" /> Frigo
                                </span>
                              )}
                              {item.checked && (
                                <button
                                  onClick={() => moveToFridge(item.id)}
                                  title="Sposta nel frigorifero"
                                  className="text-[9px] font-bold text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 rounded-full px-2 py-1 flex items-center gap-0.5 shrink-0 transition-colors"
                                >
                                  <Refrigerator className="w-3 h-3" /> Frigo
                                </button>
                              )}
                              {/* Delete single item */}
                              <button
                                onClick={() => removeItem(item.id)}
                                aria-label="Rimuovi"
                                className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-500/10 shrink-0 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </motion.li>
                          );
                        })}
                      </AnimatePresence>
                    </ul>
                  </div>
                ))}
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-16 flex flex-col items-center justify-center text-center px-6"
              >
                <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mb-5">
                  <ShoppingBasket className="w-10 h-10 text-emerald-500" />
                </div>
                <h3 className="text-xl font-bold text-[var(--text-main)] mb-2">Lista vuota</h3>
                <p className="text-sm text-[var(--text-muted)] max-w-xs leading-relaxed">
                  Cerca un prodotto, selezionalo dalla lista suggerimenti, imposta la quantità e premi <b className="text-emerald-500">+</b> per aggiungerlo.
                  <br/>Il salvataggio è automatico.
                </p>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
