import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';
import { SupermarketModule, SupermarketItem, SupermarketCategory } from '../types';
import {
  ArrowLeft, Plus, Trash2, CheckCircle2, ShoppingCart, Refrigerator,
  Apple, Milk, Drumstick, Croissant, PackageCheck, CupSoda, SprayCan,
  ShowerHead, ShoppingBasket, RotateCcw, ChevronDown, ChevronUp, Share2, X
} from 'lucide-react';
import { generateUUID } from '../utils/uuid';
import {
  CatalogProduct, SUPERMARKET_PRODUCTS, findProductMatches, guessEmoji,
  PRODUCT_CATEGORY_LABEL, normalizeProduct
} from '../data/supermarketProducts';
import { getProductImage } from '../services/productImageService';

interface SupermarketScreenProps {
  module: SupermarketModule;
  onSave: (m: SupermarketModule) => void;
  onClose: () => void;
  onShare: (m: SupermarketModule) => void;
}

const FRIDGE_STORAGE_KEY = 'chelona_fridge_ingredients';

const CATEGORY_META: { id: SupermarketCategory; label: string; icon: any; color: string }[] = [
  { id: 'frutta-verdura', label: 'Frutta & Verdura', icon: Apple, color: 'text-green-500 bg-green-500/10' },
  { id: 'latticini-uova', label: 'Latticini & Uova', icon: Milk, color: 'text-sky-500 bg-sky-500/10' },
  { id: 'carne-pesce', label: 'Carne & Pesce', icon: Drumstick, color: 'text-rose-500 bg-rose-500/10' },
  { id: 'pane-pasticceria', label: 'Pane & Pasticceria', icon: Croissant, color: 'text-amber-500 bg-amber-500/10' },
  { id: 'dispensa', label: 'Dispensa', icon: PackageCheck, color: 'text-orange-500 bg-orange-500/10' },
  { id: 'bevande', label: 'Bevande', icon: CupSoda, color: 'text-blue-500 bg-blue-500/10' },
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
  if (/(acqua|vino|birra|succo|aranciata|cola|coca|spumante|prosecco|champagne|aperitiv|amaro|whisky|grappa|frizzante|redbull|smoothie)/i.test(t)) return 'bevande';
  if (/(detersivo|candeggina|sapone|spugna|carta igienica|scottex|rotoloni|ammorbidente|vetri|lavastovigli|multiuso|panni|saccho|sturalavandino|igienizza|ammoniaca|paglietta|guanti)/i.test(t)) return 'pulizia';
  if (/(shampoo|balsamo|dentifricio|spazzolino|deodorante|doccia|crema|fazzoletti|pannolin|assorbenti|rasoio|cotone|salviett|colluttorio|bagnoschiuma|cerotti)/i.test(t)) return 'igiene';
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
        style={{ width: size, height: size }}
        onError={() => setFailed(true)}
        className="rounded-xl object-cover bg-[var(--bg)] shrink-0"
      />
    );
  }
  return (
    <span style={{ width: size, height: size }} className="flex items-center justify-center text-[26px] shrink-0">
      {e}
    </span>
  );
}

export const SupermarketScreen = ({ module, onSave, onClose, onShare }: SupermarketScreenProps) => {
  const [data, setData] = useState<SupermarketModule>(module);
  const [itemName, setItemName] = useState('');
  const [itemQty, setItemQty] = useState('');
  const [fridgeIngredients, setFridgeIngredients] = useState<string[]>(loadFridge);
  const [fridgeOpen, setFridgeOpen] = useState(true);
  const [suggestions, setSuggestions] = useState<CatalogProduct[]>([]);
  const [highlighted, setHighlighted] = useState(-1);
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
    if (itemName.trim().length >= 2) {
      setSuggestions(findProductMatches(itemName, 8));
    } else {
      setSuggestions([]);
    }
    setHighlighted(-1);
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

  const grouped = useMemo(() => {
    const map = new Map<SupermarketCategory, SupermarketItem[]>();
    for (const cat of CATEGORY_META) map.set(cat.id, []);
    for (const item of data.items) {
      (map.get(item.category) || map.get('altro')!).push(item);
    }
    return CATEGORY_META.map(c => ({ ...c, items: (map.get(c.id) || []).sort((a, b) => Number(a.checked) - Number(b.checked)) })).filter(c => c.items.length > 0);
  }, [data.items]);

  const selectedCat = selectedSuggestion
    ? selectedSuggestion.c
    : itemName.length >= 2 ? fallbackClassify(itemName) : null;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col h-full w-full max-w-6xl mx-auto bg-[var(--bg)] relative overflow-hidden">
      {/* HEADER */}
      <header className="flex items-center justify-between p-4 lg:p-6 bg-[var(--card-bg)] border-b border-[var(--border)] shrink-0 z-20">
        <div className="flex items-center gap-4 w-full">
          <button onClick={onClose} className="p-2.5 hover:bg-[var(--surface-variant)] rounded-full text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex-1">
            <input
              type="text"
              value={data.title}
              onChange={e => update({ ...data, title: e.target.value })}
              className="text-xl lg:text-2xl font-black bg-transparent border-none outline-none text-[var(--text-main)] w-full placeholder:text-[var(--text-muted)] focus:ring-0"
              placeholder="Lista della Spesa..."
            />
          </div>
          <button
            onClick={() => onShare(data)}
            title="Condividi lista della spesa"
            className="p-2.5 hover:bg-[var(--surface-variant)] rounded-full text-[var(--text-muted)] hover:text-emerald-500 transition-colors shrink-0"
          >
            <Share2 className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* ADD ITEM */}
        <div className="p-4 lg:p-6 shrink-0 relative z-10">
          <div className="bg-[var(--card-bg)] rounded-3xl border border-[var(--border)] p-4 lg:p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <h3 className="font-black text-[var(--text-main)]">Aggiungi alla lista</h3>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={itemName}
                  onChange={e => setItemName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      if (suggestions.length > 0 && highlighted >= 0) {
                        applySuggestion(suggestions[highlighted]);
                      } else {
                        addItem();
                      }
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
                  placeholder="Cerca o scrivi l'alimento/oggetto..."
                  className="w-full p-4 bg-[var(--bg)] border border-[var(--border)] rounded-2xl outline-none focus:border-emerald-500 transition-all font-medium text-[var(--text-main)] placeholder:text-[var(--text-muted)]"
                />
                <AnimatePresence>
                  {suggestions.length > 0 && (
                    <motion.ul
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="absolute left-0 right-0 top-full mt-2 bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden max-h-80 overflow-y-auto custom-scrollbar z-50"
                    >
                      {suggestions.map((s, i) => (
                        <li key={s.n + i}>
                          <button
                            onMouseEnter={() => setHighlighted(i)}
                            onClick={() => applySuggestion(s)}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${highlighted === i ? 'bg-emerald-500/10' : ''}`}
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
                value={itemQty}
                onChange={e => setItemQty(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addItem(); }}
                placeholder="Quantità (es. 1kg, 2)"
                className="w-full sm:w-44 p-4 bg-[var(--bg)] border border-[var(--border)] rounded-2xl outline-none focus:border-emerald-500 transition-all font-medium text-[var(--text-main)] placeholder:text-[var(--text-muted)]"
              />
              <button
                onClick={addItem}
                className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-4 rounded-2xl font-bold transition-all active:scale-95 shadow-lg shadow-emerald-500/20 shrink-0"
              >
                <Plus className="w-5 h-5" /> Aggiungi
              </button>
            </div>

            {(itemName.trim().length >= 2 || dupeMsg) && (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3 text-xs font-medium text-[var(--text-muted)]">
                {selectedCat && !dupeMsg && !selectedSuggestion && (
                  <span>
                    Categoria rilevata:{' '}
                    <span className="font-bold text-emerald-500">{PRODUCT_CATEGORY_LABEL[selectedCat]}</span>
                  </span>
                )}
                {selectedSuggestion && (
                  <span>
                    {selectedSuggestion.e} <b className="text-[var(--text-main)]">{selectedSuggestion.n}</b> · {PRODUCT_CATEGORY_LABEL[selectedSuggestion.c]}
                    {selectedSuggestion.q && <> · qty suggerita: <b className="text-emerald-500">{selectedSuggestion.q}</b></>}
                  </span>
                )}
                {!itemName.trim() && !dupeMsg && <span className="text-[var(--text-muted)]">Inizia a digitare per vedere i suggerimenti dal catalogo dei supermercati</span>}
                {dupeMsg && <span className="font-bold text-amber-600">{dupeMsg}</span>}
                {!dupeMsg && itemName.trim().length >= 2 && inFridge(itemName) && (
                  <span className="text-sky-500 font-bold">· Già presente nel frigorifero</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* SUMMARY */}
        {total > 0 && (
          <div className="px-4 lg:px-6 pb-2 flex flex-wrap items-center gap-2 shrink-0">
            <span className="text-xs font-bold text-[var(--text-muted)] bg-[var(--card-bg)] border border-[var(--border)] rounded-full px-3 py-1.5 flex items-center gap-1.5">
              <ShoppingBasket className="w-3.5 h-3.5 text-emerald-500" /> {total} elementi
            </span>
            {pending > 0 && (
              <span className="text-xs font-bold text-amber-600 bg-amber-500/10 border border-amber-500/20 rounded-full px-3 py-1.5">
                {pending} da comprare
              </span>
            )}
            {done > 0 && (
              <span className="text-xs font-bold text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1.5 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> {done} acquistati
              </span>
            )}
            {alreadyInFridge > 0 && (
              <span className="text-xs font-bold text-sky-600 bg-sky-500/10 border border-sky-500/20 rounded-full px-3 py-1.5 flex items-center gap-1">
                <Refrigerator className="w-3.5 h-3.5" /> {alreadyInFridge} già in frigorifero
              </span>
            )}
            <button
              onClick={clearList}
              className="ml-auto text-xs font-bold text-[var(--text-muted)] hover:text-rose-500 bg-[var(--card-bg)] border border-[var(--border)] rounded-full px-3 py-1.5 flex items-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Svuota lista
            </button>
          </div>
        )}

        {/* ITEMS BY CATEGORY */}
        {total > 0 ? (
          <div className="p-4 lg:px-6 space-y-4">
            {grouped.map(cat => (
              <div key={cat.id} className="bg-[var(--card-bg)] rounded-3xl border border-[var(--border)] overflow-hidden">
                <div className={`flex items-center gap-3 px-4 lg:px-5 py-3 border-b border-[var(--border)] ${cat.color.split(' ').find(c => c.startsWith('text-'))}`}>
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${cat.color}`}>
                    <cat.icon className="w-4.5 h-4.5" />
                  </div>
                  <h4 className="font-black text-sm uppercase tracking-wider text-[var(--text-main)]">{cat.label}</h4>
                  <span className="text-xs font-bold text-[var(--text-muted)] ml-auto">
                    {cat.items.filter(i => i.checked).length}/{cat.items.length}
                  </span>
                </div>
                <ul className="divide-y divide-[var(--border)]">
                  {cat.items.map(item => {
                    const inFridgeFlag = !item.checked && inFridge(item.name);
                    return (
                      <li key={item.id} className={`flex items-center gap-3 px-4 lg:px-5 py-3.5 transition-colors ${item.checked ? 'opacity-50' : ''}`}>
                        <button
                          onClick={() => toggleChecked(item.id)}
                          className={`w-7 h-7 rounded-xl border-2 flex items-center justify-center shrink-0 transition-all ${
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
                          <span className="text-[10px] font-bold text-sky-600 bg-sky-500/10 border border-sky-500/20 rounded-full px-2.5 py-1 flex items-center gap-1 shrink-0">
                            <Refrigerator className="w-3 h-3" /> Già in frigo
                          </span>
                        )}
                        {item.checked && (
                          <button
                            onClick={() => moveToFridge(item.id)}
                            title="Sposta nel frigorifero"
                            className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 rounded-full px-2.5 py-1.5 flex items-center gap-1 transition-colors shrink-0"
                          >
                            <Refrigerator className="w-3 h-3" /> In frigo
                          </button>
                        )}
                        <button
                          onClick={() => removeItem(item.id)}
                          className="p-2 rounded-xl text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-500/10 transition-colors shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 flex flex-col items-center justify-center text-center px-4">
            <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6">
              <ShoppingBasket className="w-10 h-10 text-emerald-500 opacity-70" />
            </div>
            <h3 className="text-2xl font-bold text-[var(--text-main)] mb-2">Lista vuota</h3>
            <p className="text-[var(--text-muted)] mb-8 max-w-sm mx-auto">Scrivi quello che ti serve: appariranno i suggerimenti dei supermercati italiani, ordinati automaticamente per categoria.</p>
          </div>
        )}

        {/* FRIDGE PANEL */}
        <div className="p-4 lg:px-6 pb-8 shrink-0">
          <div className="bg-[var(--card-bg)] rounded-3xl border border-[var(--border)] overflow-hidden shadow-sm">
            <button
              onClick={() => setFridgeOpen(o => !o)}
              className="w-full flex items-center gap-3 p-4 lg:p-5 text-left hover:bg-[var(--surface-variant)] transition-colors"
            >
              <div className="w-10 h-10 rounded-2xl bg-sky-500/10 text-sky-500 flex items-center justify-center shrink-0">
                <Refrigerator className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-black text-[var(--text-main)]">Frigorifero</h3>
                <p className="text-xs text-[var(--text-muted)] font-medium">
                  {fridgeIngredients.length > 0
                    ? `${fridgeIngredients.length} ingredienti in casa`
                    : 'Nessun ingrediente in frigo'}
                </p>
              </div>
              <span className="text-xs font-bold text-[var(--text-muted)] flex items-center gap-1">
                {fridgeOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); setShareFridgeOpen(true); }}
                title="Condividi frigorifero"
                className="p-2 rounded-xl text-sky-500 hover:bg-sky-500/10 transition-colors"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </button>

            <AnimatePresence initial={false}>
              {fridgeOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="p-4 lg:p-5 pt-0">
                    {fridgeIngredients.length === 0 ? (
                      <p className="text-sm text-[var(--text-muted)] font-medium bg-[var(--bg)] rounded-2xl p-4 border border-dashed border-[var(--border)]">
                        Nessun ingrediente in frigorifero. Quando acquisti un articolo, spuntalo e premi "In frigo" per tenerlo d'occhio qui.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                        {fridgeIngredients.map((ing, idx) => (
                          <div
                            key={`${ing}-${idx}`}
                            className="flex items-center gap-3 bg-[var(--bg)] border border-[var(--border)] rounded-2xl px-3 py-2.5"
                          >
                            <ProductThumb name={ing} size={36} />
                            <span className="flex-1 min-w-0 font-bold text-sm text-[var(--text-main)] truncate">{ing}</span>
                            <button
                              onClick={() => addFromFridge(ing)}
                              title="Aggiungi alla lista della spesa"
                              className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 shrink-0 transition-colors"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => removeFromFridge(ing)}
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
        </div>
      </div>

      {/* FRIDGE SHARE MODAL */}
      <AnimatePresence>
        {shareFridgeOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShareFridgeOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-sm bg-[var(--card-bg)] rounded-[2.5rem] p-6 shadow-2xl border border-[var(--border)]"
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
                  ? `${fridgeIngredients.length} ingredienti. Scansiona il QR per riceverli.`
                  : 'Il frigorifero è vuoto: aggiungi ingredienti per poterli condividere.'}
              </p>
              {fridgeIngredients.length > 0 ? (
                <div className="flex justify-center bg-white rounded-3xl p-5 border border-[var(--border)]">
                  <QRCodeSVG
                    value={JSON.stringify({ t: 'shared_fridge', d: fridgeIngredients })}
                    size={220}
                    level="M"
                    marginSize={1}
                  />
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
      </AnimatePresence>
    </motion.div>
  );
};