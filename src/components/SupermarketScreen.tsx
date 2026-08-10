import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SupermarketModule, SupermarketItem, SupermarketCategory } from '../types';
import {
  ArrowLeft, Plus, Trash2, CheckCircle2, Refrigerator,
  Apple, Milk, Drumstick, Croissant, PackageCheck, GlassWater, SprayCan,
  ShowerHead, ShoppingBasket, RotateCcw, Share2, Search
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
  const inputRef = useRef<HTMLInputElement>(null);

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
    setSuggestions(q ? findProductMatches(itemName, 7) : []);
    setHighlighted(0);
  }, [itemName]);

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
    setItemUnit(parsed.unit);
    setSelectedSuggestion(p);
    setSuggestions([]);
    inputRef.current?.focus();
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

  const clearList = () => {
    update({ ...data, items: [] });
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

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="fixed inset-0 z-[150] flex flex-col h-[100dvh] w-full max-w-6xl mx-auto bg-[var(--bg)] relative overflow-hidden">
      {/* HEADER */}
      <header className="flex items-center justify-between gap-3 pt-[max(env(safe-area-inset-top),16px)] px-4 lg:px-5 pb-4 bg-[var(--card-bg)] border-b border-[var(--border)] shrink-0 z-30">
        <button onClick={onClose} className="p-2.5 -ml-2 hover:bg-[var(--surface-variant)] rounded-full text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors shrink-0">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl lg:text-2xl font-black text-[var(--text-main)] truncate">{data.title || 'Lista della Spesa'}</h1>
          <p className="text-[11px] lg:text-xs text-[var(--text-muted)] font-medium">
            {total > 0 ? `${pending} da comprare · ${done} acquistati` : 'Crea la tua lista della spesa'}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={openFridge}
            title={`Apri il frigorifero (${fridgeIngredients.length} ingredienti)`}
            className="relative p-3 rounded-2xl bg-sky-500/10 text-sky-500 hover:bg-sky-500/20 transition-colors"
          >
            <Refrigerator className="w-5 h-5" />
            {fridgeIngredients.length > 0 && (
              <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-sky-500 text-white text-[10px] font-black flex items-center justify-center shadow">
                {fridgeIngredients.length}
              </span>
            )}
          </button>
          <button
            onClick={() => onShare(data)}
            title="Condividi lista della spesa"
            disabled={total === 0}
            className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 disabled:opacity-40 transition-colors"
          >
            <Share2 className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="flex-1 min-h-0 flex flex-col">
        {/* STICKY ADD BAR */}
        <div className="shrink-0 sticky top-0 z-40 px-4 lg:px-6 pt-3 pb-2 bg-[var(--bg)]/95 backdrop-blur-lg border-b border-[var(--border)]">
          <div className="max-w-2xl mx-auto flex items-center gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)] pointer-events-none" />
              <input
                ref={inputRef}
                type="text"
                value={itemName}
                onChange={e => setItemName(e.target.value)}
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
                placeholder="Cerca alimento..."
                className="w-full pl-12 pr-4 py-4 bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all font-medium text-[var(--text-main)] placeholder:text-[var(--text-muted)]"
              />

              {/* SUGGESTIONS */}
              <AnimatePresence>
                {suggestions.length > 0 && (
                  <motion.ul
                    initial={{ opacity: 0, y: -6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.98 }}
                    transition={{ duration: 0.12 }}
                    className="absolute left-0 right-0 top-full mt-2 bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden max-h-72 overflow-y-auto custom-scrollbar z-50"
                  >
                    {suggestions.map((s, i) => (
                      <li key={s.n + i}>
                        <button
                          onMouseDown={(e) => { e.preventDefault(); applySuggestion(s); }}
                          onMouseEnter={() => setHighlighted(i)}
                          className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-left transition-colors ${highlighted === i ? 'bg-emerald-500/10' : ''}`}
                        >
                          <ProductThumb name={s.n} emoji={s.e} size={40} />
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm text-[var(--text-main)] truncate">{s.n}</p>
                            <p className="text-[11px] text-[var(--text-muted)] font-medium">{PRODUCT_CATEGORY_LABEL[s.c]}</p>
                          </div>
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 rounded-full px-2 py-0.5 shrink-0">
                            {s.q ? s.q : 'Aggiungi'}
                          </span>
                        </button>
                      </li>
                    ))}
                  </motion.ul>
                )}
              </AnimatePresence>
            </div>

            <input
              type="text"
              inputMode="decimal"
              value={itemQty}
              onChange={e => setItemQty(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addItem(); }}
              placeholder="Qtà"
              title="Quantità"
              className="w-20 px-3 py-4 bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl outline-none focus:border-emerald-500 transition-all font-medium text-[var(--text-main)] placeholder:text-[var(--text-muted)] text-center shrink-0"
            />
            <button
              onClick={addItem}
              title="Aggiungi alla lista"
              className="w-14 h-14 flex items-center justify-center bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-bold transition-all active:scale-95 shadow-lg shadow-emerald-500/25 shrink-0"
            >
              <Plus className="w-7 h-7" />
            </button>
          </div>

          {/* INLINE STATUS */}
          {(itemName.trim().length >= 2 || selectedSuggestion || dupeMsg) && (
            <div className="max-w-2xl mx-auto flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs font-medium">
              {selectedSuggestion ? (
                <span className="text-[var(--text-muted)]">
                  {selectedSuggestion.e} <b className="text-[var(--text-main)]">{selectedSuggestion.n}</b> · {PRODUCT_CATEGORY_LABEL[selectedSuggestion.c]}
                  {selectedSuggestion.q && <> · <b className="text-emerald-500">qty: {selectedSuggestion.q}</b></>}
                </span>
              ) : itemName.trim().length >= 2 ? (
                <span className="text-[var(--text-muted)]">
                  Categoria: <b className="text-emerald-500">{PRODUCT_CATEGORY_LABEL[fallbackClassify(itemName)]}</b>
                  {inFridge(itemName) && <b className="text-sky-500 ml-2">· già in frigorifero</b>}
                </span>
              ) : null}
              {dupeMsg && <span className="font-bold text-amber-600">{dupeMsg}</span>}
            </div>
          )}
        </div>

        {/* SUMMARY + PROGRESS + CATEGORY FILTER */}
        {total > 0 && (
          <div className="shrink-0 px-4 lg:px-6 pt-3 pb-1">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-[var(--text-muted)] flex items-center gap-1.5">
                  <ShoppingBasket className="w-3.5 h-3.5 text-emerald-500" /> {total}
                </span>
                {pending > 0 && (
                  <span className="text-xs font-bold text-amber-600 bg-amber-500/10 border border-amber-500/20 rounded-full px-2.5 py-0.5">{pending} da comprare</span>
                )}
                {done > 0 && (
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2.5 py-0.5">{done} acquistati</span>
                )}
                {alreadyInFridge > 0 && (
                  <span className="text-xs font-bold text-sky-600 bg-sky-500/10 border border-sky-500/20 rounded-full px-2.5 py-0.5">già in frigo</span>
                )}
              </div>
              <button
                onClick={clearList}
                className="text-[11px] font-bold text-[var(--text-muted)] hover:text-rose-500 flex items-center gap-1 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Svuota
              </button>
            </div>
            <div className="h-1.5 bg-[var(--surface-variant)] rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"
                initial={false}
                animate={{ width: `${progress}%` }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              />
            </div>
          </div>
        )}

        {/* CATEGORY FILTER */}
        {total > 0 && (
          <div className="shrink-0 px-4 lg:px-6 pt-2 flex items-center gap-1.5 overflow-x-auto custom-scrollbar">
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
                  className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                    active
                      ? 'bg-emerald-500 text-white border-emerald-500'
                      : 'bg-[var(--card-bg)] text-[var(--text-muted)] border-[var(--border)] hover:text-[var(--text-main)]'
                  }`}
                >
                  <span className={active ? '' : c.color.split(' ')[0]}><c.icon className="w-3.5 h-3.5" /></span>
                  {c.label}
                  <span className={`${active ? 'text-white/80' : 'text-[var(--text-muted)]/70'}`}>{count}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* MAIN SCROLL AREA */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain custom-scrollbar scroll-smooth pb-[max(env(safe-area-inset-bottom),8px)]">
          <div className="px-4 lg:px-6 pt-3 max-w-3xl mx-auto w-full">
            {total > 0 ? (
              <div className="space-y-3">
                {grouped.map(cat => (
                  <div key={cat.id} className="bg-[var(--card-bg)] rounded-3xl border border-[var(--border)] overflow-hidden shadow-sm">
                    <div className="flex items-center gap-2.5 px-4 py-3 border-b border-[var(--border)]">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${cat.color}`}>
                        <cat.icon className="w-4.5 h-4.5" />
                      </div>
                      <h4 className="font-black text-sm uppercase tracking-wider text-[var(--text-main)]">{cat.label}</h4>
                      <span className="text-[11px] font-bold text-[var(--text-muted)] ml-auto">
                        {cat.items.filter(i => i.checked).length}/{cat.items.length}
                      </span>
                    </div>
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
                              className={`flex items-center gap-3 px-3.5 py-3 transition-opacity ${item.checked ? 'opacity-45' : ''}`}
                            >
                              <button
                                onClick={() => toggleChecked(item.id)}
                                aria-label={item.checked ? 'Rimuovi spunta' : 'Segna acquistato'}
                                className={`w-7 h-7 rounded-xl border-2 flex items-center justify-center shrink-0 transition-all active:scale-90 ${
                                  item.checked
                                    ? 'bg-emerald-500 border-emerald-500 text-white'
                                    : 'border-[var(--border)] hover:border-emerald-500 text-transparent'
                                }`}
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                              <ProductThumb name={item.name} size={40} />
                              <div className="flex-1 min-w-0">
                                <p className={`font-bold text-[var(--text-main)] truncate ${item.checked ? 'line-through' : ''}`}>{item.name}</p>
                                {item.quantity && <p className="text-xs text-[var(--text-muted)] font-medium">{item.quantity}</p>}
                              </div>
                              {inFridgeFlag && (
                                <span className="text-[10px] font-bold text-sky-600 bg-sky-500/10 border border-sky-500/20 rounded-full px-2 py-1 shrink-0">
                                  <Refrigerator className="w-3 h-3 inline -mt-0.5" /> In frigo
                                </span>
                              )}
                              {item.checked && (
                                <button
                                  onClick={() => moveToFridge(item.id)}
                                  title="Sposta nel frigorifero"
                                  className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 rounded-full px-2.5 py-1.5 flex items-center gap-1 shrink-0 transition-colors"
                                >
                                  <Refrigerator className="w-3 h-3" /> In frigo
                                </button>
                              )}
                              <button
                                onClick={() => removeItem(item.id)}
                                aria-label="Rimuovi"
                                className="p-2 rounded-xl text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-500/10 shrink-0 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
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
                className="py-10 flex flex-col items-center justify-center text-center px-4"
              >
                <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mb-5">
                  <ShoppingBasket className="w-10 h-10 text-emerald-500" />
                </div>
                <h3 className="text-xl font-bold text-[var(--text-main)] mb-1.5">Lista vuota</h3>
                <p className="text-sm text-[var(--text-muted)] max-w-sm">
                  Cerca un alimento qui sopra, scegli la quantità e premi + per aggiungerlo alla lista. Tutto viene salvato automaticamente.
                </p>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
