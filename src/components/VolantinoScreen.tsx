import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft, Plus, Trash2, Pencil, X, Search, Trophy, Store,
  RotateCcw, ShoppingBasket, BadgePercent, Sparkles, ChevronRight, Scale,
  FileText, ExternalLink, Link, Calendar, FileUp
} from 'lucide-react';
import { VolantinoModule, VolantinoOffer, VolantinoFlyer, SupermarketItem } from '../types';
import { generateUUID } from '../utils/uuid';
import { guessEmoji, findProductMatches, normalizeProduct } from '../data/supermarketProducts';
import { VOLANTINO_STORES, storeById, DEFAULT_VOLANTINO_OFFERS, StoreId } from '../data/volantinoOffers';
import { StoreLogo } from './StoreLogo';

interface VolantinoScreenProps {
  module: VolantinoModule;
  onSave: (m: VolantinoModule) => void;
  onClose: () => void;
  shoppingItems?: SupermarketItem[];
}

const euro = (n: number) => n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });

function parseQuantity(q?: string): { total: number; kind: 'g' | 'l' | 'pz' } | null {
  if (!q) return null;
  const s = q.trim().toLowerCase().replace(/\s+/g, '');
  let count = 1;
  let amountStr = s;
  let unit = '';
  let m = s.match(/^(\d+)[x×]([\d.,]+)(g|kg|ml|cl|l|pz)$/);
  if (m) {
    count = parseInt(m[1]);
    amountStr = m[2];
    unit = m[3];
  } else {
    m = s.match(/^([\d.,]+)(g|kg|ml|cl|l|pz)$/);
    if (!m) return null;
    amountStr = m[1];
    unit = m[2];
  }
  const amount = parseFloat(amountStr.replace(',', '.'));
  if (isNaN(amount) || amount <= 0) return null;
  if (unit === 'kg') return { total: count * amount * 1000, kind: 'g' };
  if (unit === 'g') return { total: count * amount, kind: 'g' };
  if (unit === 'l') return { total: count * amount, kind: 'l' };
  if (unit === 'ml') return { total: count * (amount / 1000), kind: 'l' };
  if (unit === 'cl') return { total: count * (amount / 100), kind: 'l' };
  return { total: count * amount, kind: 'pz' };
}

function unitPriceLabel(price: number, qty?: string): string | null {
  const parsed = parseQuantity(qty);
  if (!parsed || parsed.total <= 0) return null;
  const per = price / parsed.total;
  if (parsed.kind === 'g') {
    if (parsed.total >= 1000) return `${euro(per)}/kg`;
    if (parsed.total >= 100) return `${euro(per * 100)}/100 g`;
    return `${euro(per)}/g`;
  }
  if (parsed.kind === 'l') return `${euro(per)}/L`;
  return `${euro(per)}/pezzo`;
}

function thumbGradient(name: string): string {
  const t = name.toLowerCase();
  if (/(mela|banana|arancia|limone|pomodoro|insalata|lattuga|patat|cipoll|aglio|carot|zucchin|peperon|melanzan|broccol|spinaci|fung|fragol|uva|pera|pesca|kiwi|avocado|verdur|frutt|rucola|zucchino)/.test(t)) return 'from-green-500/30 to-lime-500/10';
  if (/(latte|formaggi|mozzarell|parmigian|grana|yogurt|burro|panna|uova|ricott|prosciutt|bresaola|salame|mortadell|speck)/.test(t)) return 'from-rose-500/30 to-orange-500/10';
  if (/(pollo|manzo|maiale|tacchin|vitello|agnello|carne|salmone|tonno|pesce|merluzz|orata|gamber|hamburger)/.test(t)) return 'from-red-500/30 to-rose-500/10';
  if (/(pane|panino|biscott|crackers|fette|croissant|pasta|spaghetti|penne|riso|farina|zucchero|caff|cioccolato|nutella|dolc|miele|marmellat)/.test(t)) return 'from-amber-500/30 to-yellow-500/10';
  if (/(acqua|vino|birra|succo|cola|aranciata|bibita|prosecco)/.test(t)) return 'from-blue-500/30 to-cyan-500/10';
  if (/(detersivo|sapone|igienica|scottex|dentifricio|shampoo|pulizia|igiene|rotoli)/.test(t)) return 'from-teal-500/30 to-emerald-500/10';
  return 'from-slate-500/30 to-slate-500/10';
}

function OfferThumb({ name, size = 44 }: { name: string; size?: number }) {
  return (
    <span
      style={{ width: size, height: size, fontSize: Math.round(size * 0.5) }}
      className={`flex items-center justify-center shrink-0 rounded-xl bg-gradient-to-br ${thumbGradient(name)} ring-1 ring-[var(--border)] shadow-sm`}
    >
      {guessEmoji(name)}
    </span>
  );
}

const emptyForm = { productName: '', brand: '', storeId: '' as string, price: '', quantity: '', validTo: '', isPromo: true };

const fmtDateTime = (iso?: string): string | null => {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return `${d.toLocaleDateString('it-IT')} · ${d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`;
};

export default function VolantinoScreen({ module, onSave, onClose, shoppingItems }: VolantinoScreenProps) {
  const [tab, setTab] = useState<'offers' | 'compare'>('offers');
  const [compareMode, setCompareMode] = useState<'single' | 'basket'>('single');
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [basket, setBasket] = useState<string[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [suggestions, setSuggestions] = useState<ReturnType<typeof findProductMatches>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [editingFlyer, setEditingFlyer] = useState<VolantinoFlyer | null>(null);
  const [pdfFlyer, setPdfFlyer] = useState<VolantinoFlyer | null>(null);
  const [flyerForm, setFlyerForm] = useState({ label: '', updatedAt: '', pdfUrl: '', pdfAttachment: '' });

  const offers = module.offers;
  const flyers = module.flyers ?? [];

  const update = (next: VolantinoOffer[]) => onSave({ ...module, offers: next });

  const saveFlyers = (next: VolantinoFlyer[]) => onSave({ ...module, offers, flyers: next });

  const getFlyer = (storeId: string) => flyers.find(f => f.storeId === storeId);

  const touchFlyer = (storeId: string): VolantinoFlyer[] => {
    const now = new Date().toISOString();
    const existing = getFlyer(storeId);
    if (existing) return flyers.map(f => f.storeId === storeId ? { ...f, updatedAt: now } : f);
    return [...flyers, { id: generateUUID(), storeId, label: 'Volantino settimanale', updatedAt: now }];
  };

  const lastUpdate = useMemo(() => {
    const times = flyers.map(f => f.updatedAt).filter(Boolean) as string[];
    return times.length > 0 ? times.sort().reverse()[0] : undefined;
  }, [flyers]);

  const uniqueProducts = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const o of offers) {
      const k = normalizeProduct(o.productName);
      if (!seen.has(k)) { seen.add(k); list.push(o.productName); }
    }
    return list.sort((a, b) => a.localeCompare(b, 'it'));
  }, [offers]);

  const offersByStore = useMemo(() => {
    const map = new Map<string, VolantinoOffer[]>();
    for (const s of VOLANTINO_STORES) map.set(s.id, []);
    for (const o of offers) {
      const list = map.get(o.storeId) || [];
      list.push(o);
      map.set(o.storeId, list);
    }
    return VOLANTINO_STORES.map(s => ({ store: s, offers: map.get(s.id) || [] })).filter(g => g.offers.length > 0);
  }, [offers]);

  const offersByProduct = useMemo(() => {
    const map = new Map<string, VolantinoOffer[]>();
    for (const o of offers) {
      const k = normalizeProduct(o.productName);
      const list = map.get(k) || [];
      list.push(o);
      map.set(k, list);
    }
    return map;
  }, [offers]);

  const matchedShopping = useMemo(() => {
    if (!shoppingItems?.length) return [];
    const offerKeys = new Set(offers.map(o => normalizeProduct(o.productName)));
    return shoppingItems.filter(i => !i.checked && offerKeys.has(normalizeProduct(i.name)));
  }, [shoppingItems, offers]);

  const importFromShoppingList = () => {
    setBasket(prev => {
      const next = new Set(prev);
      for (const o of offers) {
        if (matchedShopping.some(i => normalizeProduct(i.name) === normalizeProduct(o.productName))) {
          next.add(o.productName);
        }
      }
      return Array.from(next);
    });
    setCompareMode('basket');
  };

  const toggleBasketProduct = (name: string) => {
    setBasket(prev => prev.includes(name) ? prev.filter(p => p !== name) : [...prev, name]);
  };

  const basketProductsFiltered = uniqueProducts.filter(p =>
    !searchQuery.trim() || normalizeProduct(p).includes(normalizeProduct(searchQuery))
  );

  const basketMatrix = useMemo(() => {
    if (basket.length === 0) return null;
    const rows = basket.map(name => ({
      name,
      qty: offersByProduct.get(normalizeProduct(name))?.[0]?.quantity,
      offers: offersByProduct.get(normalizeProduct(name)) || []
    }));
    const stores = new Set<string>();
    for (const r of rows) for (const o of r.offers) stores.add(o.storeId);
    const storeTotals = new Map<string, { total: number; missing: number; wins: number }>();
    const storeList = Array.from(stores).sort((a, b) => storeById(a).label.localeCompare(storeById(b).label, 'it'));
    for (const s of storeList) {
      let total = 0; let missing = 0; let wins = 0;
      for (const r of rows) {
        const best = r.offers.reduce<VolantinoOffer | null>((acc, o) => (!acc || o.price < acc.price) ? o : acc, null);
        const o = r.offers.find(x => x.storeId === s);
        if (o) {
          total += o.price;
          if (best && Math.abs(o.price - best.price) < 0.005) wins++;
        } else missing++;
      }
      storeTotals.set(s, { total, missing, wins });
    }
    const full = storeList.filter(s => storeTotals.get(s)!.missing === 0);
    const candidates = full.length > 0 ? full : storeList;
    const winner = candidates.reduce<{ id: string; total: number; missing: number; wins: number } | null>(
      (acc, s) => {
        const v = storeTotals.get(s)!;
        return !acc || v.total < acc.total ? { id: s, ...v } : acc;
      },
      null
    );
    const maxTotal = storeList.reduce((max, s) => Math.max(max, storeTotals.get(s)!.total), 0);
    return { rows, stores: storeList, totals: storeTotals, winner, maxTotal };
  }, [basket, offersByProduct]);

  const openAddForm = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEditForm = (offer: VolantinoOffer) => {
    setEditingId(offer.id);
    setForm({
      productName: offer.productName,
      brand: offer.brand || '',
      storeId: offer.storeId,
      price: String(offer.price),
      quantity: offer.quantity || '',
      validTo: offer.validTo || '',
      isPromo: offer.isPromo ?? true
    });
    setFormOpen(true);
  };

  const onProductInput = (v: string) => {
    setForm(f => ({ ...f, productName: v }));
    if (v.trim().length >= 2) {
      setSuggestions(findProductMatches(v, 6));
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const pickSuggestion = (name: string, qty?: string) => {
    setForm(f => ({ ...f, productName: name, quantity: f.quantity || qty || '' }));
    setShowSuggestions(false);
  };

  const saveOffer = () => {
    const productName = form.productName.trim();
    const price = parseFloat(String(form.price).replace(',', '.'));
    if (!productName || isNaN(price) || price <= 0) return;
    const offer: VolantinoOffer = {
      id: editingId || generateUUID(),
      productName,
      storeId: form.storeId,
      price: Math.round(price * 100) / 100,
      brand: form.brand.trim() || undefined,
      quantity: form.quantity.trim() || undefined,
      validTo: form.validTo || undefined,
      isPromo: form.isPromo
    };
    const nextOffers = editingId ? offers.map(o => o.id === editingId ? offer : o) : [offer, ...offers];
    onSave({ ...module, offers: nextOffers, flyers: touchFlyer(form.storeId) });
    setFormOpen(false);
  };

  const removeOffer = (id: string) => {
    const offer = offers.find(o => o.id === id);
    onSave({ ...module, offers: offers.filter(o => o.id !== id), flyers: offer ? touchFlyer(offer.storeId) : flyers });
  };

  const openFlyerForm = (storeId: string, existing?: VolantinoFlyer) => {
    const flyer = existing ?? getFlyer(storeId);
    if (!flyer) {
      const created: VolantinoFlyer = { id: generateUUID(), storeId, label: 'Volantino settimanale', updatedAt: new Date().toISOString() };
      saveFlyers([...flyers, created]);
      return;
    }
    setEditingFlyer(flyer);
    setFlyerForm({
      label: flyer.label || 'Volantino settimanale',
      updatedAt: flyer.updatedAt ? flyer.updatedAt.slice(0, 10) : '',
      pdfUrl: flyer.pdfUrl || '',
      pdfAttachment: flyer.pdfAttachment || ''
    });
  };

  const onFlyerPdfSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf'))) return;
    const reader = new FileReader();
    reader.onload = () => setFlyerForm(f => ({ ...f, pdfAttachment: String(reader.result) }));
    reader.readAsDataURL(file);
  };

  const saveFlyer = () => {
    if (!editingFlyer) return;
    const next = flyers.map(f => f.id === editingFlyer.id ? {
      ...f,
      label: flyerForm.label.trim() || 'Volantino settimanale',
      updatedAt: flyerForm.updatedAt
        ? new Date(`${flyerForm.updatedAt}T12:00:00`).toISOString()
        : f.updatedAt ?? new Date().toISOString(),
      pdfUrl: flyerForm.pdfUrl.trim() || undefined,
      pdfAttachment: flyerForm.pdfAttachment || undefined
    } : f);
    saveFlyers(next);
    setEditingFlyer(null);
  };

  const restoreDemo = () => update(DEFAULT_VOLANTINO_OFFERS.map(o => ({ ...o })));

  const unitPreview = useMemo(() => {
    const price = parseFloat(String(form.price).replace(',', '.'));
    return !isNaN(price) && price > 0 ? unitPriceLabel(price, form.quantity) : null;
  }, [form.price, form.quantity]);

  const formatDate = (d?: string) => {
    if (!d) return null;
    const [y, m, day] = d.split('-');
    return `fino al ${day}/${m}`;
  };

  const compareProductOffers = selectedProduct ? offersByProduct.get(normalizeProduct(selectedProduct)) || [] : [];

  const sortedCompare = useMemo(() => {
    return [...compareProductOffers].sort((a, b) => a.price - b.price);
  }, [compareProductOffers]);

  const best = sortedCompare[0];
  const worst = sortedCompare[sortedCompare.length - 1];
  const maxPrice = worst?.price || 0;

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="fixed inset-0 z-[150] flex flex-col h-[100dvh] w-full max-w-6xl mx-auto bg-[var(--bg)] relative overflow-hidden">
      {/* HEADER */}
      <header className="flex items-center justify-between gap-3 pt-[max(env(safe-area-inset-top),16px)] px-4 lg:px-5 pb-4 bg-[var(--card-bg)] border-b border-[var(--border)] shrink-0 z-30">
        <button onClick={onClose} className="p-2.5 -ml-2 hover:bg-[var(--surface-variant)] rounded-full text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors shrink-0">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl lg:text-2xl font-black text-[var(--text-main)] truncate flex items-center gap-2">
            <BadgePercent className="w-5 h-5 lg:w-6 lg:h-6 text-amber-500 shrink-0" />
            Volantino
          </h1>
          <p className="text-[11px] lg:text-xs text-[var(--text-muted)] font-medium">
            {offers.length} offerte · {offersByStore.length} catene{lastUpdate ? ` · aggiornato ${fmtDateTime(lastUpdate)}` : ''}
          </p>
        </div>
        <button
          onClick={() => setConfirmReset(true)}
          title="Ripristina offerte demo"
          className="p-2.5 -mr-1 hover:bg-[var(--surface-variant)] rounded-full text-[var(--text-muted)] hover:text-amber-500 transition-colors shrink-0"
        >
          <RotateCcw className="w-5 h-5" />
        </button>
      </header>

      {/* TABS */}
      <div className="shrink-0 px-4 lg:px-5 py-3 border-b border-[var(--border)] bg-[var(--card-bg)]">
        <div className="flex gap-1 p-1 bg-[var(--surface-variant)] rounded-2xl">
          {([
            { id: 'offers', label: 'Offerte', icon: Store },
            { id: 'compare', label: 'Confronta', icon: Trophy }
          ] as const).map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                tab === t.id ? 'bg-[var(--card-bg)] shadow text-amber-500' : 'text-[var(--text-muted)]'
              }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* MAIN SCROLL AREA */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain custom-scrollbar scroll-smooth pb-[max(env(safe-area-inset-bottom),8px)]">
        {tab === 'offers' ? (
          <div className="p-4 lg:p-6 space-y-4">
            {offersByStore.length === 0 ? (
              <div className="flex flex-col items-center text-center py-16 gap-4">
                <div className="w-20 h-20 bg-amber-500/10 text-amber-500 rounded-3xl flex items-center justify-center">
                  <Store className="w-10 h-10" />
                </div>
                <div>
                  <p className="font-black text-[var(--text-main)] text-lg">Nessuna offerta</p>
                  <p className="text-sm text-[var(--text-muted)] mt-1">Aggiungi le offerte dei volantini o ripristina i dati demo</p>
                </div>
                <button
                  onClick={restoreDemo}
                  className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-5 py-3 rounded-2xl font-bold transition-all active:scale-95 shadow-lg shadow-amber-500/25"
                >
                  <Sparkles className="w-5 h-5" /> Ripristina offerte demo
                </button>
              </div>
            ) : (
              <>
                {offersByStore.map(({ store, offers: list }) => {
                const flyer = getFlyer(store.id);
                const hasPdf = !!(flyer?.pdfUrl || flyer?.pdfAttachment);
                return (
                  <section key={store.id} className="bg-[var(--card-bg)] rounded-[1.75rem] border border-[var(--border)] overflow-hidden">
                    <header className="flex items-center gap-3 px-4 lg:px-5 py-3.5 border-b border-[var(--border)] bg-[var(--surface-variant)]/50">
                      <StoreLogo id={store.id} short={store.short} size={40} />
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-[var(--text-main)] truncate">{store.label}</p>
                        <p className="text-[11px] text-[var(--text-muted)] font-medium truncate">
                          {flyer?.label || 'Volantino settimanale'}
                          {flyer?.updatedAt ? ` · agg. ${fmtDateTime(flyer.updatedAt)}` : ''}
                          {!flyer && ' · non configurato'}
                        </p>
                      </div>
                      <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${store.bg} ${store.text} shrink-0`}>
                        {euro(list.reduce((a, o) => a + o.price, 0))}
                      </span>
                      <div className="flex gap-1 shrink-0">
                        {hasPdf && (
                          <button
                            onClick={() => setPdfFlyer(flyer!)}
                            title="Visualizza volantino PDF"
                            className="p-2 rounded-xl text-[var(--text-muted)] hover:text-amber-500 hover:bg-amber-500/10 transition-colors"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => openFlyerForm(store.id, flyer)}
                          title="Configura volantino"
                          className="p-2 rounded-xl text-[var(--text-muted)] hover:text-amber-500 hover:bg-amber-500/10 transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      </div>
                    </header>
                  <ul className="divide-y divide-[var(--border)]">
                    {list.map(o => (
                      <li key={o.id} className="flex items-center gap-3 px-4 lg:px-5 py-3 group">
                        <OfferThumb name={o.productName} />
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-[var(--text-main)] text-sm truncate flex items-center gap-2">
                            {o.productName}
                            {o.brand && <span className="text-[10px] font-bold text-amber-600 bg-amber-500/10 border border-amber-500/20 rounded-full px-2 py-0.5 shrink-0">{o.brand}</span>}
                            {o.isPromo && <BadgePercent className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                          </p>
                          <p className="text-[11px] text-[var(--text-muted)] font-medium truncate">
                            {[o.quantity, unitPriceLabel(o.price, o.quantity), formatDate(o.validTo)].filter(Boolean).join(' · ')}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-black text-amber-500">{euro(o.price)}</p>
                        </div>
                        <div className="flex gap-1 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => openEditForm(o)}
                            className="p-2 rounded-xl text-[var(--text-muted)] hover:text-amber-500 hover:bg-amber-500/10 transition-colors"
                            aria-label="Modifica offerta"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => removeOffer(o.id)}
                            className="p-2 rounded-xl text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                            aria-label="Elimina offerta"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
                );
                })}

              <button
                onClick={openAddForm}
                className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white py-4 rounded-2xl font-bold transition-all active:scale-[0.99] shadow-lg shadow-amber-500/25 sticky bottom-2"
              >
                <Plus className="w-5 h-5" /> Aggiungi offerta
              </button>
              </>
            )}
          </div>
        ) : (
          <div className="p-4 lg:p-6 space-y-4">
            {/* MODE SWITCH */}
            <div className="flex gap-1 p-1 bg-[var(--surface-variant)] rounded-2xl">
              {([
                { id: 'single', label: 'Singolo prodotto', icon: Scale },
                { id: 'basket', label: 'Cestino completo', icon: ShoppingBasket }
              ] as const).map(m => (
                <button
                  key={m.id}
                  onClick={() => { setCompareMode(m.id); if (m.id === 'single') setBasket([]); }}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                    compareMode === m.id ? 'bg-[var(--card-bg)] shadow text-amber-500' : 'text-[var(--text-muted)]'
                  }`}
                >
                  <m.icon className="w-4 h-4" />
                  {m.label}
                </button>
              ))}
            </div>

            {compareMode === 'single' ? (
              <>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Cerca un prodotto tra le offerte…"
                    className="w-full pl-11 pr-4 py-3.5 bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl outline-none focus:border-amber-500 transition-all font-medium text-[var(--text-main)]"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {uniqueProducts.filter(p => !searchQuery.trim() || normalizeProduct(p).includes(normalizeProduct(searchQuery))).slice(0, 14).map(p => (
                    <button
                      key={p}
                      onClick={() => setSelectedProduct(selectedProduct === p ? '' : p)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-semibold transition-all ${
                        selectedProduct === p
                          ? 'bg-amber-500/10 border-amber-500/50 text-amber-500'
                          : 'bg-[var(--card-bg)] border-[var(--border)] text-[var(--text-main)]'
                      }`}
                    >
                      {guessEmoji(p)} {p}
                    </button>
                  ))}
                </div>

                {selectedProduct && sortedCompare.length > 0 && (
                  <div className="bg-[var(--card-bg)] rounded-[1.75rem] border border-[var(--border)] overflow-hidden">
                    <header className="px-4 lg:px-5 py-4 border-b border-[var(--border)] flex items-center gap-3">
                      <OfferThumb name={selectedProduct} size={48} />
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-[var(--text-main)]">{selectedProduct}</p>
                        <p className="text-xs text-[var(--text-muted)] font-medium truncate">
                          {sortedCompare[0].brand && <span className="text-amber-600 font-bold">{sortedCompare[0].brand} · </span>}
                          {sortedCompare.length} catene in offerta
                          {sortedCompare[0].quantity ? ` · ${sortedCompare[0].quantity}` : ''}
                        </p>
                      </div>
                      {best && worst && worst.price > best.price && (
                        <span className="text-xs font-bold text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1.5 shrink-0">
                          Risparmi fino a {euro(worst.price - best.price)}
                        </span>
                      )}
                    </header>
                    <ul className="divide-y divide-[var(--border)]">
                      {sortedCompare.map((o, idx) => {
                        const st = storeById(o.storeId);
                        const isBest = idx === 0;
                        const pct = maxPrice > 0 ? Math.round((o.price / maxPrice) * 100) : 100;
                        return (
                          <li key={o.id} className={`px-4 lg:px-5 py-3.5 ${isBest ? 'bg-emerald-500/5' : ''}`}>
                            <div className="flex items-center gap-3">
                              <StoreLogo id={o.storeId} short={st.short} size={36} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="font-bold text-[var(--text-main)] text-sm truncate">{st.label}</p>
                                  {isBest && (
                                    <span className="flex items-center gap-1 text-[10px] font-black text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2 py-0.5 shrink-0">
                                      <Trophy className="w-3 h-3" /> MIGLIOR PREZZO
                                    </span>
                                  )}
                                </div>
                                <div className="h-1.5 mt-2 bg-[var(--surface-variant)] rounded-full overflow-hidden">
                                  <div className="h-full bg-amber-500 rounded-full" style={{ width: `${pct}%` }} />
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <p className={`font-black ${isBest ? 'text-emerald-500' : 'text-[var(--text-main)]'}`}>{euro(o.price)}</p>
                                {unitPriceLabel(o.price, o.quantity) && (
                                  <p className="text-[10px] text-[var(--text-muted)] font-medium">{unitPriceLabel(o.price, o.quantity)}</p>
                                )}
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                {!selectedProduct && (
                  <p className="text-center text-sm text-[var(--text-muted)] py-10 flex items-center justify-center gap-2">
                    <Trophy className="w-4 h-4 text-amber-500" /> Seleziona un prodotto per confrontare i prezzi tra le catene
                  </p>
                )}
              </>
            ) : (
              <>
                {matchedShopping.length > 0 && (
                  <button
                    onClick={importFromShoppingList}
                    className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white py-3.5 rounded-2xl font-bold transition-all active:scale-[0.99] shadow-lg shadow-emerald-500/25"
                  >
                    <ShoppingBasket className="w-5 h-5" /> Confronta la mia lista della spesa ({matchedShopping.length} prodotti)
                  </button>
                )}

                <div className="relative">
                  <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Filtra prodotti…"
                    className="w-full pl-11 pr-4 py-3.5 bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl outline-none focus:border-amber-500 transition-all font-medium text-[var(--text-main)]"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  {basketProductsFiltered.map(p => {
                    const active = basket.includes(p);
                    return (
                      <button
                        key={p}
                        onClick={() => toggleBasketProduct(p)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-semibold transition-all ${
                          active
                            ? 'bg-amber-500/10 border-amber-500/50 text-amber-500'
                            : 'bg-[var(--card-bg)] border-[var(--border)] text-[var(--text-muted)]'
                        }`}
                      >
                        {active && <ChevronRight className="w-3.5 h-3.5" />}
                        {guessEmoji(p)} {p}
                      </button>
                    );
                  })}
                  {basketProductsFiltered.length === 0 && (
                    <p className="text-sm text-[var(--text-muted)] py-4">Nessun prodotto trovato</p>
                  )}
                </div>

                {basketMatrix && basketMatrix.rows.length > 0 && basketMatrix.winner && (
                  <>
                    <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-[1.75rem] p-5 text-white shadow-lg shadow-amber-500/25">
                      <p className="text-xs font-bold uppercase tracking-wider opacity-80 flex items-center gap-1.5">
                        <Trophy className="w-4 h-4" /> Dove conviene andare
                      </p>
                      <p className="text-2xl font-black mt-1">{storeById(basketMatrix.winner.id).label}</p>
                      <p className="text-sm font-medium mt-1 opacity-90">
                        Totale {euro(basketMatrix.winner.total)} · {basketMatrix.winner.wins} prodotti al miglior prezzo
                        {basketMatrix.winner.missing > 0 && ` · ${basketMatrix.winner.missing} prezzi mancanti`}
                      </p>
                      {basketMatrix.maxTotal > basketMatrix.winner.total && (
                        <p className="text-sm font-bold mt-2 bg-white/20 rounded-xl px-3 py-2 inline-block">
                          Risparmi {euro(basketMatrix.maxTotal - basketMatrix.winner.total)} rispetto alla catena più cara
                        </p>
                      )}
                    </div>

                    <div className="bg-[var(--card-bg)] rounded-[1.75rem] border border-[var(--border)] overflow-x-auto custom-scrollbar">
                      <table className="w-full text-sm min-w-[560px]">
                        <thead>
                          <tr className="border-b border-[var(--border)]">
                            <th className="text-left px-4 py-3 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider sticky left-0 bg-[var(--card-bg)]">Prodotto</th>
                            {basketMatrix.stores.map(s => (
                              <th key={s} className="px-3 py-3 text-center">
                                <span className={`inline-flex items-center justify-center ${storeById(s).text}`}>
                                  <StoreLogo id={s} short={storeById(s).short} size={26} />
                                </span>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {basketMatrix.rows.map(r => {
                            const bestOffer = r.offers.reduce<VolantinoOffer | null>((acc, o) => (!acc || o.price < acc.price) ? o : acc, null);
                            return (
                              <tr key={normalizeProduct(r.name)} className="border-b border-[var(--border)] last:border-0">
                                <td className="px-4 py-3 font-semibold text-[var(--text-main)] sticky left-0 bg-[var(--card-bg)] whitespace-nowrap">
                                  {guessEmoji(r.name)} {r.name}
                                  {r.qty && <span className="text-[10px] text-[var(--text-muted)] font-medium ml-1">({r.qty})</span>}
                                </td>
                                {basketMatrix.stores.map(s => {
                                  const o = r.offers.find(x => x.storeId === s);
                                  const isBest = !!o && !!bestOffer && Math.abs(o.price - bestOffer.price) < 0.005;
                                  return (
                                    <td key={s} className={`px-3 py-3 text-center font-bold ${isBest ? 'text-emerald-500' : 'text-[var(--text-main)]'}`}>
                                      {o ? euro(o.price) : <span className="text-[var(--text-muted)] opacity-40">—</span>}
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })}
                          <tr className="bg-amber-500/5">
                            <td className="px-4 py-3 font-black text-[var(--text-main)] sticky left-0 bg-[var(--card-bg)]">Totale</td>
                            {basketMatrix.stores.map(s => {
                              const v = basketMatrix.totals.get(s)!;
                              const isWin = basketMatrix.winner!.id === s;
                              return (
                                <td key={s} className={`px-3 py-3 text-center font-black ${isWin ? 'text-amber-500' : 'text-[var(--text-main)]'}`}>
                                  {euro(v.total)}
                                  {v.missing > 0 && <span className="block text-[9px] font-medium text-[var(--text-muted)]">{v.missing} mancanti</span>}
                                </td>
                              );
                            })}
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <p className="text-[11px] text-[var(--text-muted)] text-center px-4">
                      Prezzi di volantino, potrebbero variare in negozio. Modifica o aggiungi offerte dalla scheda Offerte.
                    </p>
                  </>
                )}

                {basket.length === 0 && (
                  <p className="text-center text-sm text-[var(--text-muted)] py-8">
                    Seleziona i prodotti da confrontare o importa la tua lista della spesa
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* OFFER FORM MODAL */}
      <AnimatePresence>
        {formOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setFormOpen(false)}
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="relative w-full max-w-lg bg-[var(--card-bg)] rounded-t-[2.5rem] sm:rounded-[2.5rem] p-6 shadow-2xl border border-[var(--border)] max-h-[88vh] overflow-y-auto custom-scrollbar pb-[max(env(safe-area-inset-bottom),16px)]"
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={() => setFormOpen(false)}
                className="absolute top-4 right-4 p-2 rounded-xl text-[var(--text-muted)] hover:bg-[var(--surface-variant)] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="w-12 h-12 bg-amber-500/10 text-amber-500 rounded-2xl flex items-center justify-center mb-4">
                <BadgePercent className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-[var(--text-main)] mb-1">
                {editingId ? 'Modifica offerta' : 'Nuova offerta'}
              </h3>
              <p className="text-sm text-[var(--text-muted)] mb-5">Aggiungi un prezzo trovato nei volantini</p>

              {form.productName.trim() && (
                <div className="flex items-center gap-3 mb-5 p-3 bg-[var(--surface-variant)]/50 border border-[var(--border)] rounded-2xl">
                  <OfferThumb name={form.productName} size={52} />
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-[var(--text-main)] text-sm truncate">{form.productName}</p>
                    <p className="text-[11px] text-[var(--text-muted)] font-medium truncate">
                      {[form.brand.trim() || '—', form.quantity || '—'].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  {unitPreview && (
                    <div className="text-right shrink-0">
                      <p className="font-black text-emerald-500">{unitPreview}</p>
                      <p className="text-[10px] text-[var(--text-muted)] font-medium">prezzo unitario</p>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-4">
                <div className="relative">
                  <label className="block text-xs font-bold text-[var(--text-muted)] mb-1.5">Prodotto</label>
                  <input
                    value={form.productName}
                    onChange={e => onProductInput(e.target.value)}
                    onFocus={() => form.productName.trim().length >= 2 && setShowSuggestions(true)}
                    placeholder="es. Spaghetti"
                    className="w-full px-4 py-3.5 bg-[var(--surface-variant)] border border-[var(--border)] rounded-2xl outline-none focus:border-amber-500 transition-all font-medium text-[var(--text-main)]"
                  />
                  <AnimatePresence>
                    {showSuggestions && suggestions.length > 0 && (
                      <motion.ul
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        className="absolute z-20 w-full mt-2 bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl shadow-xl overflow-hidden custom-scrollbar max-h-56 overflow-y-auto"
                      >
                        {suggestions.map(s => (
                          <li key={s.n}>
                            <button
                              onClick={() => pickSuggestion(s.n, s.q)}
                              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--surface-variant)] transition-colors text-left"
                            >
                              <span className="text-xl">{s.e}</span>
                              <span className="font-semibold text-[var(--text-main)] text-sm flex-1">{s.n}</span>
                              {s.q && <span className="text-[11px] font-bold text-amber-500">{s.q}</span>}
                            </button>
                          </li>
                        ))}
                      </motion.ul>
                    )}
                  </AnimatePresence>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--text-muted)] mb-1.5">Marca</label>
                  <input
                    value={form.brand}
                    onChange={e => setForm(f => ({ ...f, brand: e.target.value }))}
                    placeholder="es. Barilla, Galbani… (opzionale)"
                    className="w-full px-4 py-3.5 bg-[var(--surface-variant)] border border-[var(--border)] rounded-2xl outline-none focus:border-amber-500 transition-all font-medium text-[var(--text-main)]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[var(--text-muted)] mb-1.5">Catena</label>
                    <select
                      value={form.storeId}
                      onChange={e => setForm(f => ({ ...f, storeId: e.target.value }))}
                      className="w-full px-4 py-3.5 bg-[var(--surface-variant)] border border-[var(--border)] rounded-2xl outline-none focus:border-amber-500 transition-all font-medium text-[var(--text-main)] cursor-pointer"
                    >
                      <option value="">Scegli…</option>
                      {VOLANTINO_STORES.map(s => (
                        <option key={s.id} value={s.id}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[var(--text-muted)] mb-1.5">Prezzo (€)</label>
                    <input
                      value={form.price}
                      onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                      inputMode="decimal"
                      placeholder="0.99"
                      className="w-full px-4 py-3.5 bg-[var(--surface-variant)] border border-[var(--border)] rounded-2xl outline-none focus:border-amber-500 transition-all font-medium text-[var(--text-main)]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[var(--text-muted)] mb-1.5">Quantità</label>
                    <input
                      value={form.quantity}
                      onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
                      placeholder="es. 1 L, 500 g, 6x1.5 L"
                      className="w-full px-4 py-3.5 bg-[var(--surface-variant)] border border-[var(--border)] rounded-2xl outline-none focus:border-amber-500 transition-all font-medium text-[var(--text-main)]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[var(--text-muted)] mb-1.5">Valido fino al</label>
                    <input
                      type="date"
                      value={form.validTo}
                      onChange={e => setForm(f => ({ ...f, validTo: e.target.value }))}
                      className="w-full px-4 py-3.5 bg-[var(--surface-variant)] border border-[var(--border)] rounded-2xl outline-none focus:border-amber-500 transition-all font-medium text-[var(--text-main)]"
                    />
                  </div>
                </div>

                {unitPreview && (
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl px-4 py-2.5">
                    <Scale className="w-4 h-4" /> Prezzo unitario stimato: {unitPreview}
                  </div>
                )}

                <button
                  onClick={saveOffer}
                  disabled={!form.productName.trim() || !form.storeId || !(parseFloat(String(form.price).replace(',', '.')) > 0)}
                  className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white py-4 rounded-2xl font-bold transition-all active:scale-[0.99] shadow-lg shadow-amber-500/25"
                >
                  {editingId ? 'Salva modifiche' : 'Aggiungi offerta'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* RESET CONFIRM MODAL */}
      <AnimatePresence>
        {confirmReset && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setConfirmReset(false)}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 16 }}
              className="relative w-full max-w-sm bg-[var(--card-bg)] rounded-[2.5rem] p-6 shadow-2xl border border-[var(--border)] text-center"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-14 h-14 bg-amber-500/10 text-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <RotateCcw className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-[var(--text-main)] mb-1">Ripristinare le offerte demo?</h3>
              <p className="text-sm text-[var(--text-muted)] mb-6">
                Le offerte personalizzate verranno sostituite con il catalogo di esempio.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmReset(false)}
                  className="flex-1 py-3 rounded-2xl font-bold text-[var(--text-muted)] bg-[var(--surface-variant)] hover:bg-[var(--surface-variant)]/70 transition-colors"
                >
                  Annulla
                </button>
                <button
                  onClick={() => { restoreDemo(); setConfirmReset(false); }}
                  className="flex-1 py-3 rounded-2xl font-bold text-white bg-amber-500 hover:bg-amber-600 transition-colors"
                >
                  Ripristina
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FLYER CONFIG MODAL */}
      <AnimatePresence>
        {editingFlyer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setEditingFlyer(null)}
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="relative w-full max-w-lg bg-[var(--card-bg)] rounded-t-[2.5rem] sm:rounded-[2.5rem] p-6 shadow-2xl border border-[var(--border)] max-h-[88vh] overflow-y-auto custom-scrollbar pb-[max(env(safe-area-inset-bottom),16px)]"
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={() => setEditingFlyer(null)}
                className="absolute top-4 right-4 p-2 rounded-xl text-[var(--text-muted)] hover:bg-[var(--surface-variant)] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="w-12 h-12 bg-amber-500/10 text-amber-500 rounded-2xl flex items-center justify-center mb-4">
                <Calendar className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-[var(--text-main)] mb-1">Volantino {storeById(editingFlyer.storeId).label}</h3>
              <p className="text-sm text-[var(--text-muted)] mb-5">Riferimento del volantino per questa catena</p>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[var(--text-muted)] mb-1.5">Nome volantino</label>
                  <input
                    value={flyerForm.label}
                    onChange={e => setFlyerForm(f => ({ ...f, label: e.target.value }))}
                    placeholder="es. Volantino settimana 4–10 agosto"
                    className="w-full px-4 py-3.5 bg-[var(--surface-variant)] border border-[var(--border)] rounded-2xl outline-none focus:border-amber-500 transition-all font-medium text-[var(--text-main)]"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[var(--text-muted)] mb-1.5">Data aggiornamento</label>
                    <input
                      type="date"
                      value={flyerForm.updatedAt}
                      onChange={e => setFlyerForm(f => ({ ...f, updatedAt: e.target.value }))}
                      className="w-full px-4 py-3.5 bg-[var(--surface-variant)] border border-[var(--border)] rounded-2xl outline-none focus:border-amber-500 transition-all font-medium text-[var(--text-main)]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[var(--text-muted)] mb-1.5">PDF del volantino</label>
                    <label className="flex items-center justify-center gap-2 px-4 py-3.5 bg-[var(--surface-variant)] border border-[var(--border)] rounded-2xl cursor-pointer hover:border-amber-500 transition-all text-sm font-semibold text-[var(--text-main)]">
                      <FileUp className="w-4 h-4 text-amber-500" />
                      {flyerForm.pdfAttachment ? 'Sostituisci PDF' : 'Carica PDF'}
                      <input type="file" accept="application/pdf,.pdf" className="hidden" onChange={onFlyerPdfSelect} />
                    </label>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--text-muted)] mb-1.5">Link PDF (URL)</label>
                  <div className="relative">
                    <Link className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                    <input
                      value={flyerForm.pdfUrl}
                      onChange={e => setFlyerForm(f => ({ ...f, pdfUrl: e.target.value }))}
                      placeholder="https://www.…/volantino.pdf"
                      className="w-full pl-11 pr-4 py-3.5 bg-[var(--surface-variant)] border border-[var(--border)] rounded-2xl outline-none focus:border-amber-500 transition-all font-medium text-[var(--text-main)]"
                    />
                  </div>
                  <p className="text-[10px] text-[var(--text-muted)] mt-1">Allegato o URL: puoi inserire entrambi, il PDF caricato ha la precedenza.</p>
                </div>

                {(flyerForm.pdfAttachment || flyerForm.pdfUrl) && (
                  <div className="flex items-center justify-between gap-2 text-xs font-bold text-emerald-600 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl px-4 py-2.5">
                    <span className="truncate flex items-center gap-1.5">
                      <FileText className="w-4 h-4 shrink-0" />
                      {flyerForm.pdfAttachment ? 'PDF allegato pronto' : flyerForm.pdfUrl}
                    </span>
                    <button
                      onClick={() => setFlyerForm(f => ({ ...f, pdfAttachment: '', pdfUrl: '' }))}
                      className="text-rose-500 hover:text-rose-600 font-bold shrink-0"
                    >
                      Rimuovi
                    </button>
                  </div>
                )}

                <button
                  onClick={saveFlyer}
                  className="w-full bg-amber-500 hover:bg-amber-600 text-white py-4 rounded-2xl font-bold transition-all active:scale-[0.99] shadow-lg shadow-amber-500/25"
                >
                  Salva volantino
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PDF VIEWER MODAL */}
      <AnimatePresence>
        {pdfFlyer && (pdfFlyer.pdfAttachment || pdfFlyer.pdfUrl) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[99999] flex flex-col bg-black/80 backdrop-blur-sm"
            onClick={() => setPdfFlyer(null)}
          >
            <div
              className="flex flex-col h-full w-full max-w-4xl mx-auto bg-[var(--card-bg)] overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 px-4 pt-[max(env(safe-area-inset-top),12px)] pb-3 border-b border-[var(--border)] shrink-0">
                <button
                  onClick={() => setPdfFlyer(null)}
                  className="p-2 rounded-xl text-[var(--text-muted)] hover:bg-[var(--surface-variant)] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-[var(--text-main)] truncate">
                    {pdfFlyer.label || 'Volantino'} · {storeById(pdfFlyer.storeId).label}
                  </p>
                  {pdfFlyer.updatedAt && (
                    <p className="text-[11px] text-[var(--text-muted)] font-medium">
                      Aggiornato {fmtDateTime(pdfFlyer.updatedAt)}
                    </p>
                  )}
                </div>
                {pdfFlyer.pdfUrl && (
                  <button
                    onClick={() => window.open(pdfFlyer.pdfUrl!, '_system')}
                    className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white px-3 py-2 rounded-xl text-xs font-bold transition-colors shrink-0"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Apri esternamente
                  </button>
                )}
              </div>
              <iframe
                src={pdfFlyer.pdfAttachment || pdfFlyer.pdfUrl || undefined}
                className="flex-1 w-full border-none bg-white"
                title={`Volantino ${storeById(pdfFlyer.storeId).label}`}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}