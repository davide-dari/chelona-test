import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';
import { SupermarketModule, SupermarketItem, SupermarketCategory } from '../types';
import {
  ArrowLeft, Plus, Trash2, CheckCircle2, ShoppingCart, Refrigerator,
  Apple, Milk, Drumstick, Croissant, PackageCheck, CupSoda, SprayCan,
  ShowerHead, ShoppingBasket, RotateCcw, ChevronDown, Share2, X, Search, GlassWater
} from 'lucide-react';
import { generateUUID } from '../utils/uuid';
import {
  CatalogProduct, findProductMatches, guessEmoji,
  PRODUCT_CATEGORY_LABEL, normalizeProduct
} from '../data/supermarketProducts';
import { getProductImage } from '../services/productImageService';

interface SupermarketScreenProps {
  module: SupermarketModule;
  onSave: (m: SupermarketModule) => void;
  onClose: () => void;
  onShare: (m: SupermarketModule) => void;
}

interface FridgePanelProps {
  fridgeIngredients: string[];
  open: boolean;
  onToggle: () => void;
  onAdd: (ingredient: string) => void;
  onRemove: (ingredient: string) => void;
  onShare: () => void;
}

const FRIDGE_STORAGE_KEY = 'chelona_fridge_ingredients';

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

const isOnline = () => typeof navigator !== 'undefined' && navigator.onLine;

function ProductThumb({ name, emoji, size = 44 }: { name: string; emoji?: string; size?: number }) {
  const [img, setImg] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const e = emoji || guessEmoji(name);

  useEffect(() => {
    if (!isOnline()) return;
    let mounted = true;
    getProductImage(name).then((url) => {
      if (mounted && url) setImg(url);
    });
    return () => { mounted = false; };
  }, [name]);

  if (img && !failed) {
    return (
      <img
        src={img}
        alt={name}
        loading="lazy"
        style={{ width: size, height: size }}
        onError={() => setFailed(true)}
        className="rounded-xl object-cover bg-[var(--bg)] shrink-0 ring-1 ring-[var(--border)]"
      />
    );
  }
  return (
    <span
      style={{ width: size, height: size }}
      className="flex items-center justify-center text-2xl shrink-0 rounded-xl bg-[var(--surface-variant)] ring-1 ring-[var(--border)]"
    >
      {e}
    </span>
  );
}

function FridgePanel({ fridgeIngredients, open, onToggle, onAdd, onRemove, onShare }: FridgePanelProps) {
  return (
    <div className="bg-[var(--card-bg)] rounded-3xl border border-[var(--border)] overflow-hidden shadow-sm">
      <button onClick={onToggle} className="w-full flex items-center gap-3 p-4 text-left hover:bg-[var(--surface-variant)] transition-colors">
        <div className="w-10 h-10 rounded-2xl bg-sky-500/10 text-sky-500 flex items-center justify-center shrink-0">
          <Refrigerator className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-black text-[var(--text-main)]">Frigorifero</h3>
          <p className="text-xs text-[var(--text-muted)] font-medium">
            {fridgeIngredients.length > 0 ? `${fridgeIngredients.length} ingredienti in casa` : 'Nessun ingrediente in frigo'}
          </p>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onShare(); }}
          title="Condividi frigorifero"
          className="p-2 rounded-xl text-sky-500 hover:bg-sky-500/10 shrink-0 transition-colors"
        >
          <Share2 className="w-4 h-4" />
        </button>
        <span className={`p-1.5 rounded-lg text-[var(--text-muted)] transition-transform ${open ? 'rotate-180' : ''}`}>
          <ChevronDown className="w-4 h-4" />
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-3 pt-0">
              {fridgeIngredients.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)] font-medium bg-[var(--bg)] rounded-2xl p-4 border border-dashed border-[var(--border)]">
                  Nessun ingrediente in frigo. Spunta un articolo acquistato e premi "In frigo" per ritrovarlo qui.
                </p>
              ) : (
                <div className="max-h-56 overflow-y-auto custom-scrollbar space-y-1.5 pr-0.5">
                  {fridgeIngredients.map((ing, idx) => (
                    <div key={`${ing}-${idx}`} className="flex items-center gap-2.5 bg-[var(--bg)] border border-[var(--border)] rounded-2xl px-2.5 py-2">
                      <ProductThumb name={ing} size={32} />
                      <span className="flex-1 min-w-0 font-bold text-sm text-[var(--text-main)] truncate">{ing}</span>
                      <button
                        onClick={() => onAdd(ing)}
                        title="Aggiungi alla lista della spesa"
                        className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 shrink-0 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onRemove(ing)}
                        title="Rimuovi dal frigorifero"
                        className="p-2 rounded-xl text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-500/10 shrink-0 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export const SupermarketScreen = ({ module, onSave, onClose, onShare }: SupermarketScreenProps) => {
  const [data, setData] = useState<SupermarketModule>(module);
  const [itemName, setItemName] = useState('');
  const [itemQty, setItemQty] = useState('');
  const [fridgeIngredients, setFridgeIngredients] = useState<string[]>(loadFridge);
  const [fridgeOpen, setFridgeOpen] = useState(true);
  const [suggestions, setSuggestions] = useState<CatalogProduct[]>([]);
  const [highlighted, setHighlighted] = useState(0);
  const [selectedSuggestion, setSelectedSuggestion] = useState<CatalogProduct | null>(null);
  const [dupeMsg, setDupeMsg] = useState<string | null>(null);
  const [shareFridgeOpen, setShareFridgeOpen] = useState(false);
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
    setItemQty(p.q || '');
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

    const item: SupermarketItem = {
      id: generateUUID(),
      name,
      quantity: itemQty.trim() || selectedSuggestion?.q || undefined,
      category: cat,
      checked: false
    };
    update({ ...data, items: [...data.items, item] });
    setItemName('');
    setItemQty('');
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
  };

  const addFromFridge = (ingredient: string) => {
    if (data.items.some(i => normalize(i.name) === normalize(ingredient))) {
      setDupeMsg(`"${ingredient}" è già nella lista`);
      setTimeout(() => setDupeMsg(null), 2500);
      return;
    }
    const item: SupermarketItem = {
      id: generateUUID(),
      name: ingredient,
      category: fallbackClassify(ingredient),
      checked: false
    };
    update({ ...data, items: [...data.items, item] });
  };

  const removeFromFridge = (ingredient: string) => {
    setFridgeIngredients(prev => prev.filter(f => f !== ingredient));
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
      (map.get(item.category) || map.get('altro')!).push(item);
    }
    return CATEGORY_META.map(c => ({
      ...c,
      items: (map.get(c.id) || []).sort((a, b) => Number(a.checked) - Number(b.checked))
    })).filter(c => c.items.length > 0);
  }, [data.items]);

  const miniCount = grouped.reduce((acc, c) => acc + c.items.filter(i => !i.checked).length, 0);

  const fridgePanel = (
    <FridgePanel
      fridgeIngredients={fridgeIngredients}
      open={fridgeOpen}
      onToggle={() => setFridgeOpen(o => !o)}
      onAdd={addFromFridge}
      onRemove={removeFromFridge}
      onShare={() => setShareFridgeOpen(true)}
    />
  );

  const qrModal = createPortal(
    <AnimatePresence>
      {shareFridgeOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setShareFridgeOpen(false)}
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 16 }}
            className="relative w-full max-w-sm bg-[var(--card-bg)] rounded-[2.5rem] p-6 shadow-2xl border border-[var(--border)] max-h-[88vh] overflow-y-auto custom-scrollbar"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setShareFridgeOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-xl text-[var(--text-muted)] hover:bg-[var(--surface-variant)] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="w-14 h-14 bg-sky-500/10 text-sky-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Refrigerator className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-[var(--text-main)] text-center mb-1">Condividi Frigorifero</h3>
            <p className="text-sm text-[var(--text-muted)] text-center mb-6">
              {fridgeIngredients.length > 0
                ? `${fridgeIngredients.length} ingredienti. Scansiona il QR per riceverli sul tuo frigo.`
                : 'Il frigorifero è vuoto: aggiungi ingredienti per condividerli.'}
            </p>
            {fridgeIngredients.length > 0 ? (
              <div className="flex justify-center bg-white rounded-3xl p-5 border border-[var(--border)]">
                <QRCodeSVG value={JSON.stringify({ t: 'shared_fridge', d: fridgeIngredients })} size={230} level="M" marginSize={1} />
              </div>
            ) : (
              <div className="py-6 flex flex-col items-center text-center gap-2">
                <ShoppingBasket className="w-8 h-8 text-[var(--text-muted)] opacity-40" />
                <span className="text-xs text-[var(--text-muted)] font-medium">Aggiungi ingredienti al frigo per condividere</span>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col h-full w-full max-w-6xl mx-auto bg-[var(--bg)] relative overflow-hidden">
      {/* HEADER */}
      <header className="flex items-center justify-between gap-3 p-4 lg:p-5 bg-[var(--card-bg)] border-b border-[var(--border)] shrink-0 z-30">
        <button onClick={onClose} className="p-2.5 -ml-2 hover:bg-[var(--surface-variant)] rounded-full text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors shrink-0">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl lg:text-2xl font-black text-[var(--text-main)] truncate">{data.title || 'Lista della Spesa'}</h1>
          <p className="text-[11px] lg:text-xs text-[var(--text-muted)] font-medium">
            {total > 0 ? `${pending} da comprare · ${done} acquistati` : 'Crea la tua lista della spesa'}
          </p>
        </div>
        <button
          onClick={() => onShare(data)}
          title="Condividi lista della spesa"
          disabled={total === 0}
          className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 disabled:opacity-40 transition-colors shrink-0"
        >
          <Share2 className="w-5 h-5" />
        </button>
      </header>

      <div className="flex-1 min-h-0 flex flex-col">
        {/* STICKY ADD BAR */}
        <div className="shrink-0 sticky top-0 z-40 px-4 lg:px-6 pt-3 pb-2 bg-[var(--bg)]/95 backdrop-blur-lg border-b border-[var(--border)]">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[var(--text-muted)] pointer-events-none" />
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
                placeholder="Cerca o scrivi un alimento..."
                className="w-full pl-11 pr-4 py-3.5 bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all font-medium text-[var(--text-main)] placeholder:text-[var(--text-muted)]"
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

            <div className="flex gap-2">
              <input
                type="text"
                value={itemQty}
                onChange={e => setItemQty(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addItem(); }}
                placeholder="Quantità"
                className="w-24 sm:w-28 px-4 py-3.5 bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl outline-none focus:border-emerald-500 transition-all font-medium text-[var(--text-main)] placeholder:text-[var(--text-muted)] text-center"
              />
              <button
                onClick={addItem}
                className="flex items-center justify-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-3.5 rounded-2xl font-bold transition-all active:scale-95 shadow-lg shadow-emerald-500/25 shrink-0"
              >
                <Plus className="w-5 h-5" />
                <span className="hidden sm:inline">Aggiungi</span>
              </button>
            </div>
          </div>

          {/* INLINE STATUS */}
          {(itemName.trim().length >= 2 || selectedSuggestion || dupeMsg) && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs font-medium">
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

        {/* SUMMARY + PROGRESS */}
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

        {/* MAIN SCROLL AREA */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain custom-scrollbar scroll-smooth">
          <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_330px] lg:gap-6 px-4 lg:px-6 pt-3">
            {/* LIST */}
            <div className="min-w-0 pb-4 lg:pb-10">
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
                  className="py-14 flex flex-col items-center justify-center text-center px-4"
                >
                  <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mb-5">
                    <ShoppingBasket className="w-10 h-10 text-emerald-500" />
                  </div>
                  <h3 className="text-xl font-bold text-[var(--text-main)] mb-1.5">Lista vuota</h3>
                  <p className="text-sm text-[var(--text-muted)] max-w-sm">
                    Scrivi un alimento o un oggetto: i suggerimenti dei supermercati ti aiutano, tutto è ordinato automaticamente per categoria.
                  </p>
                </motion.div>
              )}
            </div>

            {/* FRIDGE — DESKTOP */}
            <aside className="hidden lg:block">
              <div className="lg:sticky lg:top-3 lg:h-fit">{fridgePanel}</div>
            </aside>
          </div>

          {/* FRIDGE — MOBILE */}
          <div className="lg:hidden px-4 lg:px-6 pb-10 pt-1">{fridgePanel}</div>
        </div>
      </div>

      {qrModal}
    </motion.div>
  );
};