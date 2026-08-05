import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { SupermarketModule, SupermarketItem, SupermarketCategory } from '../types';
import {
  ArrowLeft, Plus, Trash2, CheckCircle2, ShoppingCart, Refrigerator,
  Apple, Milk, Drumstick, Croissant, PackageCheck, CupSoda, SprayCan,
  ShowerHead, ShoppingBasket, RotateCcw, ListChecks
} from 'lucide-react';
import { generateUUID } from '../utils/uuid';

interface SupermarketScreenProps {
  module: SupermarketModule;
  onSave: (m: SupermarketModule) => void;
  onClose: () => void;
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

const classifyItem = (name: string): SupermarketCategory => {
  const t = name.toLowerCase();
  if (/(mela|banana|arancia|limone|pomodoro|insalata|patat|cipoll|aglio|carot|zucchin|peperon|melanzan|broccol|spinaci|fung|fragol|uva|pera|pesca|albicocc|cilieg|anguria|melone|kiwi|ananas|mango|avocado|asparag|porro|sedano|rapan|finocchi|cavolfior|cavol|rucola|lattuga|radicchio|minestrone|verdur|frutt|basilic|prezzemol|rosmarin|timo|salvia|menta|origano|alloro)/i.test(t)) return 'frutta-verdura';
  if (/(latte|formaggi|mozzarell|parmigian|grana|pecorin|ricott|burro|yogurt|panna|stracchin|gorgonzol|taleggio|provolon|scamorz|uova|uovo|fontina|emmental|brie|feta|mascarpone)/i.test(t)) return 'latticini-uova';
  if (/(pollo|manzo|maiale|tacchin|vitello|agnello|salsiccia|salame|prosciutt|pancetta|bacon|wurstel|bistecca|carne|salmone|tonno|merluzz|orata|branzin|sogliola|gamber|calamar|polpo|mussol|vongol|cozze|pesce|mortadell|speck|hamburger|stinco|coscia|fesa|arrosto|spezzatino)/i.test(t)) return 'carne-pesce';
  if (/(pane|panino|focaccia|grissin|biscott|crackers|croissant|brioche|merendin|torta|dolc|pandoro|panettone|piadina|pizza)/i.test(t)) return 'pane-pasticceria';
  if (/(pasta|riso|farina|zucchero|sale|olio|aceto|legum|lenticchi|ceci|fagioli|scatolam|pelati|sugo|passata|caff|tè|the|tisana|cioccolato|miele|marmellat|nutella|sottolio|sottaceti|maionese|senape|ketchup|brodo|semi|mandorle|noci|pistacchi|avena|muesli|cous cous|polenta|gnocchi|dadi|surgelat|gelato|farina 00|amido|lievito|bicarbonato|vanillina|cacao)/i.test(t)) return 'dispensa';
  if (/(acqua|vino|birra|succo|aranciata|cola|coca|spumante|prosecco|champagne|aperitiv|amaro|whisky|grappa|frizzante|redbull|smoothie)/i.test(t)) return 'bevande';
  if (/(detersiv|candeggina|sapone|spugna|carta igienica|scottex|rotoloni|ammorbidente|vetri|lavastovigli|multiuso|panni|sacchet|sturalavandino|igienizzante|ammoniaca|paglietta|guanti|pulizia)/i.test(t)) return 'pulizia';
  if (/(shampoo|balsamo|dentifricio|spazzolino|deodorante|doccia|crema|fazzoletti|pannolin|assorbenti|rasoio|cotone|salviett|colluttorio|bagnoschiuma|cerotti|igien)/i.test(t)) return 'igiene';
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

export const SupermarketScreen = ({ module, onSave, onClose }: SupermarketScreenProps) => {
  const [data, setData] = useState<SupermarketModule>(module);
  const [itemName, setItemName] = useState('');
  const [itemQty, setItemQty] = useState('');
  const [fridgeIngredients, setFridgeIngredients] = useState<string[]>(loadFridge);

  useEffect(() => {
    localStorage.setItem(FRIDGE_STORAGE_KEY, JSON.stringify(fridgeIngredients));
  }, [fridgeIngredients]);

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

  const addItem = () => {
    const name = itemName.trim();
    if (!name) return;
    const item: SupermarketItem = {
      id: generateUUID(),
      name,
      quantity: itemQty.trim() || undefined,
      category: classifyItem(name),
      checked: false
    };
    update({ ...data, items: [...data.items, item] });
    setItemName('');
    setItemQty('');
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
    if (data.items.some(i => normalize(i.name) === normalize(ingredient))) return;
    const item: SupermarketItem = {
      id: generateUUID(),
      name: ingredient,
      category: classifyItem(ingredient),
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
      const list = map.get(item.category) || [];
      list.push(item);
      map.set(item.category, list);
    }
    return CATEGORY_META.map(c => ({ ...c, items: (map.get(c.id) || []).sort((a, b) => Number(a.checked) - Number(b.checked)) })).filter(c => c.items.length > 0);
  }, [data.items]);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col h-full w-full max-w-6xl mx-auto bg-[var(--bg)] relative overflow-hidden">
      {/* HEADER */}
      <header className="flex items-center justify-between p-4 lg:p-6 bg-[var(--card-bg)] border-b border-[var(--border)] shrink-0">
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
        </div>
      </header>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* ADD ITEM */}
        <div className="p-4 lg:p-6 shrink-0">
          <div className="bg-[var(--card-bg)] rounded-3xl border border-[var(--border)] p-4 lg:p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <h3 className="font-black text-[var(--text-main)]">Aggiungi alla lista</h3>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={itemName}
                onChange={e => setItemName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addItem(); }}
                placeholder="Es. Latte, pasta, detersivo..."
                className="flex-1 p-4 bg-[var(--bg)] border border-[var(--border)] rounded-2xl outline-none focus:border-emerald-500 transition-all font-medium text-[var(--text-main)] placeholder:text-[var(--text-muted)]"
              />
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
            {itemName.trim().length > 0 && (
              <p className="text-xs text-[var(--text-muted)] mt-3 font-medium">
                Categoria rilevata:{' '}
                <span className="font-bold text-emerald-500">
                  {CATEGORY_META.find(c => c.id === classifyItem(itemName))?.label}
                </span>
                {inFridge(itemName) && <span className="ml-2 text-sky-500 font-bold">· Già presente nel frigorifero</span>}
              </p>
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
          <div className="py-16 flex flex-col items-center justify-center text-center px-4">
            <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6">
              <ShoppingBasket className="w-10 h-10 text-emerald-500 opacity-70" />
            </div>
            <h3 className="text-2xl font-bold text-[var(--text-main)] mb-2">Lista vuota</h3>
            <p className="text-[var(--text-muted)] mb-8 max-w-sm mx-auto">Aggiungi gli alimenti o gli oggetti che ti servono: verranno ordinati automaticamente in categorie.</p>
          </div>
        )}

        {/* FRIDGE PANEL */}
        <div className="p-4 lg:px-6 pb-8 shrink-0">
          <div className="bg-[var(--card-bg)] rounded-3xl border border-[var(--border)] p-4 lg:p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-2xl bg-sky-500/10 text-sky-500 flex items-center justify-center shrink-0">
                <Refrigerator className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-black text-[var(--text-main)]">Frigorifero</h3>
                <p className="text-xs text-[var(--text-muted)] font-medium">Ingredienti già in casa: se servono per la spesa, aggiungili alla lista.</p>
              </div>
            </div>
            {fridgeIngredients.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)] font-medium bg-[var(--bg)] rounded-2xl p-4 border border-dashed border-[var(--border)]">
                Nessun ingrediente in frigorifero. Gli alimenti acquistati spostati in frigo compariranno qui.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {fridgeIngredients.map((ing, idx) => (
                  <span key={`${ing}-${idx}`} className="group flex items-center gap-1.5 bg-[var(--bg)] border border-[var(--border)] rounded-full pl-3 pr-1.5 py-1.5 text-sm font-bold text-[var(--text-main)]">
                    {ing}
                    <button
                      onClick={() => addFromFridge(ing)}
                      title="Aggiungi alla lista della spesa"
                      className="p-1.5 rounded-full bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => removeFromFridge(ing)}
                      title="Rimuovi dal frigorifero"
                      className="p-1.5 rounded-full text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
