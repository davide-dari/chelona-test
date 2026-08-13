import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft, ExternalLink, CalendarDays, FileUp,
  Link2, FileText, Loader2, Check, Sparkles, Globe, ChevronLeft,
  Pencil, Tag, Search, Plus, CheckCircle2, Trophy, TrendingDown,
  BarChart3, ShoppingCart, ArrowRight, MapPin, History, X, Star,
  ChevronDown, ChevronUp, Zap, Award, BadgePercent, Store
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { CapacitorHttp } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { FileOpener } from '@capawesome-team/capacitor-file-opener';
import { VolantinoModule, VolantinoFlyer, SupermarketItem, SupermarketCategory } from '../types';
import { generateUUID } from '../utils/uuid';
import { flyerWindowISO, daysUntil } from '../utils/flyerCycle';
import {
  ITALIAN_SUPERMARKETS, supermarketsForZone, suggestZones, supermarketById,
  cityRegion, ItalianSupermarket
} from '../data/italianSupermarkets';
import { logoFor } from '../data/supermarketLogos';
import { StoreLogo } from './StoreLogo';
import { getScrapedFlyerOffers, ScrapedOffer } from '../data/flyerScraper';
import {
  searchProducts, getAllProducts, getTopDeals, getFlashDeals,
  getStoreStats, getAvailableCategories, getProductsByCategory,
  compareProduct, compareBestBasket,
  type ComparisonResult, type ProductCategory,
  PRODUCT_CATEGORY_LABELS, PRODUCT_CATEGORY_EMOJI
} from '../data/priceComparisonEngine';

interface VolantinoScreenProps {
  module: VolantinoModule;
  onSave: (m: VolantinoModule) => void;
  onClose: () => void;
  shoppingItems?: SupermarketItem[];
  onAddShoppingItem?: (item: SupermarketItem) => void;
}

type ViewMode = 'home' | 'store' | 'search' | 'compare';

const HISTORY_KEY = 'chelona_volantino_zones';
const SUGGESTED_ZONES = ['Tutta Italia', 'Lombardia', 'Lazio', 'Veneto', 'Piemonte', 'Campania', 'Sicilia', 'Toscana', 'Emilia-Romagna'];

const CATEGORY_LABELS: Record<string, string> = {
  all: 'Tutte le Offerte',
  pulizia: 'Pulizia Casa',
  igiene: 'Igiene Personale',
  dispensa: 'Dispensa & Alimentari',
  'latticini-uova': 'Latticini & Uova',
  'carne-pesce': 'Carne & Pesce',
  bevande: 'Bevande'
};

const loadHistory = (): string[] => {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter((z: unknown) => typeof z === 'string') : [];
  } catch {
    return [];
  }
};

const normZone = (z: string) => z.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

const fmtTimestamp = (iso?: string): string | null => {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
};

const fmtPrice = (n: number) => n.toFixed(2).replace('.', ',');

/* ════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════════════════════════════════ */

export default function VolantinoScreen({ module, onSave, onClose, shoppingItems = [], onAddShoppingItem }: VolantinoScreenProps) {
  const [view, setView] = useState<ViewMode>('home');
  const [query, setQuery] = useState('');
  const [activeZone, setActiveZone] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>(loadHistory());
  const [zoneSuggestions, setZoneSuggestions] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'offers' | 'flyer'>('offers');
  const [offerSearch, setOfferSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [editingFlyer, setEditingFlyer] = useState<VolantinoFlyer | null>(null);
  const [flyerForm, setFlyerForm] = useState({ label: '', updatedAt: '', validTo: '', pdfUrl: '', pdfAttachment: '' });
  const [opening, setOpening] = useState(false);

  // Search view
  const [productSearch, setProductSearch] = useState('');
  const [searchResults, setSearchResults] = useState<ComparisonResult[]>([]);

  // Compare view
  const [compareCategory, setCompareCategory] = useState<ProductCategory | 'all'>('all');
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);

  const flyers = module.flyers ?? [];
  const flyerFor = (storeId: string) => flyers.find(f => f.storeId === storeId);
  const saveFlyers = (next: VolantinoFlyer[]) => onSave({ ...module, offers: module.offers, flyers: next });

  /* ── Rinnovo automatico volantini ── */
  useEffect(() => {
    const now = new Date();
    let changed = false;
    const next = ITALIAN_SUPERMARKETS.map(ch => {
      const w = flyerWindowISO(ch.renewalWeekday, now);
      const existing = flyers.find(f => f.storeId === ch.id);
      if (existing) {
        const expired = existing.validTo ? new Date(existing.validTo).getTime() < now.getTime() : true;
        if (expired) {
          changed = true;
          return { ...existing, validFrom: w.validFrom, validTo: w.validTo, updatedAt: now.toISOString() };
        }
        return existing;
      }
      changed = true;
      return {
        id: generateUUID(),
        storeId: ch.id,
        label: 'Volantino settimanale',
        updatedAt: now.toISOString(),
        validFrom: w.validFrom,
        validTo: w.validTo,
      };
    });
    if (changed) saveFlyers(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Zona / filtri ── */
  const updateZoneQuery = (v: string) => {
    setQuery(v);
    setZoneSuggestions(v.trim().length >= 1 ? suggestZones(v, 7) : []);
  };

  const commitZone = (z: string) => {
    const clean = z.trim();
    if (!clean) return;
    setActiveZone(clean);
    setQuery('');
    setZoneSuggestions([]);
    setHistory(prev => {
      const next = [clean, ...prev.filter(x => normZone(x) !== normZone(clean))].slice(0, 8);
      try { localStorage.setItem(HISTORY_KEY, JSON.stringify(next)); } catch { /* noop */ }
      return next;
    });
  };

  const stores = useMemo(() => {
    if (!activeZone || activeZone === 'Tutta Italia') return [...ITALIAN_SUPERMARKETS];
    return supermarketsForZone(activeZone);
  }, [activeZone]);

  const resolvedZoneText = useMemo(() => {
    if (!activeZone || activeZone === 'Tutta Italia') return 'Tutta Italia';
    const reg = cityRegion(activeZone);
    return reg ? `${activeZone} · ${reg}` : activeZone;
  }, [activeZone]);

  /* ── Dettaglio catena ── */
  const chain = selectedId ? supermarketById(selectedId) : undefined;
  const flyer = chain ? flyerFor(chain.id) : undefined;
  const hasPdf = !!(flyer?.pdfUrl || flyer?.pdfAttachment);

  const scrapedOffers = useMemo(() => {
    if (!chain) return [];
    return getScrapedFlyerOffers(chain.id);
  }, [chain]);

  const filteredOffers = useMemo(() => {
    return scrapedOffers.filter(offer => {
      const catMatch = selectedCategory === 'all' || offer.category === selectedCategory;
      const searchMatch = !offerSearch.trim() ||
        offer.productName.toLowerCase().includes(offerSearch.toLowerCase()) ||
        (offer.brand && offer.brand.toLowerCase().includes(offerSearch.toLowerCase()));
      return catMatch && searchMatch;
    });
  }, [scrapedOffers, selectedCategory, offerSearch]);

  /* ── Product search ── */
  useEffect(() => {
    if (productSearch.trim().length >= 2) {
      setSearchResults(searchProducts(productSearch, 25));
    } else {
      setSearchResults([]);
    }
  }, [productSearch]);

  /* ── Precomputed data ── */
  const topDeals = useMemo(() => getTopDeals(6), []);
  const flashDeals = useMemo(() => getFlashDeals(8), []);
  const categories = useMemo(() => getAvailableCategories(), []);

  const compareProducts = useMemo(() => {
    if (compareCategory === 'all') return getAllProducts();
    return getProductsByCategory(compareCategory as ProductCategory);
  }, [compareCategory]);

  /* ── PDF helpers ── */
  const openInSystem = (url: string) => {
    if (!url) return;
    if (Capacitor.isNativePlatform()) window.open(url, '_system');
    else window.open(url, '_blank');
  };

  const openNativePdf = async (f: VolantinoFlyer) => {
    if (!chain) return;
    if (!f?.pdfUrl && !f?.pdfAttachment) {
      openInSystem(chain.flyerUrl || chain.website || '');
      return;
    }
    if (!Capacitor.isNativePlatform()) {
      openInSystem(f.pdfUrl || chain.flyerUrl || chain.website || '');
      return;
    }
    setOpening(true);
    try {
      const fileName = `volantino_${chain.id}.pdf`;
      if (f.pdfAttachment) {
        const base64Data = f.pdfAttachment.includes(',') ? f.pdfAttachment.split(',')[1] : f.pdfAttachment;
        await Filesystem.writeFile({ path: fileName, data: base64Data, directory: Directory.Cache });
      } else if (f.pdfUrl) {
        let url = f.pdfUrl;
        try {
          const head = await CapacitorHttp.request({ url, method: 'HEAD' });
          if (head.url && /^\w+:\/\//.test(head.url) && head.url !== url) url = head.url;
        } catch { /* keep url */ }
        await Filesystem.deleteFile({ path: fileName, directory: Directory.Cache }).catch(() => {});
        await Filesystem.downloadFile({ url, path: fileName, directory: Directory.Cache, connectTimeout: 30000, readTimeout: 120000 });
      }
      const { uri } = await Filesystem.getUri({ path: fileName, directory: Directory.Cache });
      await FileOpener.openFile({ path: uri });
    } catch (err) {
      console.error('[Volantino] Apertura reader nativa fallita:', err);
      openInSystem(f.pdfUrl || chain.flyerUrl || chain.website || '');
    } finally {
      setOpening(false);
    }
  };

  /* ── Shopping list helpers ── */
  const handleAddOfferToShoppingList = (offer: ScrapedOffer) => {
    if (onAddShoppingItem) {
      const newItem: SupermarketItem = {
        id: generateUUID(),
        name: offer.productName,
        category: offer.category,
        checked: false,
      };
      onAddShoppingItem(newItem);
    }
  };

  const isItemInShoppingList = (productName: string) => {
    return shoppingItems.some(i => i.name.toLowerCase() === productName.toLowerCase() && !i.checked);
  };

  /* ── Flyer form ── */
  const openFlyerForm = (existing?: VolantinoFlyer) => {
    if (!chain) return;
    const f = existing ?? flyerFor(chain.id);
    if (!f) {
      const created: VolantinoFlyer = {
        id: generateUUID(), storeId: chain.id, label: 'Volantino settimanale', updatedAt: new Date().toISOString()
      };
      saveFlyers([...flyers, created]);
      return;
    }
    setEditingFlyer(f);
    setFlyerForm({
      label: f.label || 'Volantino settimanale',
      updatedAt: f.updatedAt ? f.updatedAt.slice(0, 10) : '',
      validTo: f.validTo ? f.validTo.slice(0, 10) : '',
      pdfUrl: f.pdfUrl || '',
      pdfAttachment: f.pdfAttachment || ''
    });
  };

  const saveFlyer = () => {
    if (!editingFlyer) return;
    const next = flyers.map(f => f.id === editingFlyer.id ? {
      ...f,
      label: flyerForm.label.trim() || 'Volantino settimanale',
      updatedAt: flyerForm.updatedAt
        ? new Date(`${flyerForm.updatedAt}T12:00:00`).toISOString()
        : f.updatedAt ?? new Date().toISOString(),
      validTo: flyerForm.validTo
        ? new Date(`${flyerForm.validTo}T23:59:59`).toISOString()
        : f.validTo,
      pdfUrl: flyerForm.pdfUrl.trim() || undefined,
      pdfAttachment: flyerForm.pdfAttachment || undefined
    } : f);
    saveFlyers(next);
    setEditingFlyer(null);
  };

  /* ── Navigation ── */
  const goStore = (id: string) => {
    setSelectedId(id);
    setView('store');
    setActiveTab('offers');
    setOfferSearch('');
    setSelectedCategory('all');
  };

  const goBack = () => {
    if (view === 'store') { setSelectedId(null); setView('home'); }
    else if (view === 'search' || view === 'compare') setView('home');
    else onClose();
  };

  const headerTitle = () => {
    if (view === 'store' && chain) return chain.label;
    if (view === 'search') return 'Cerca Prodotto';
    if (view === 'compare') return 'Confronta Prezzi';
    return 'Volantini & Offerte';
  };

  const headerSubtitle = () => {
    if (view === 'store' && chain) return chain.flyerUrl ? 'Offerte e confronto prezzi' : 'Offerte promozionali';
    if (view === 'search') return 'Trova il prezzo migliore tra tutti i supermercati';
    if (view === 'compare') return 'Tabella comparativa prezzi';
    return `${stores.length} supermercati · ${resolvedZoneText}`;
  };

  /* ═══════════════ RENDER ═══════════════ */
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed inset-0 z-[150] flex flex-col h-[100dvh] w-full bg-[var(--bg)] overflow-hidden"
    >
      {/* ═══ HEADER ═══ */}
      <header className="flex items-center gap-3 pt-[max(env(safe-area-inset-top),16px)] px-4 pb-3 bg-[var(--card-bg)] border-b border-[var(--border)] shrink-0 z-30">
        <button
          onClick={goBack}
          className="p-2.5 -ml-2 hover:bg-[var(--surface-variant)] rounded-full text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors shrink-0"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex-1 min-w-0 text-center">
          <h1 className="text-lg font-black text-[var(--text-main)] truncate flex items-center justify-center gap-2">
            {view === 'store' && chain ? (
              <StoreLogo id={chain.id} short={chain.short} hex={chain.color} logo={logoFor(chain.id)} size={24} />
            ) : (
              <Sparkles className="w-5 h-5 text-amber-500 shrink-0" />
            )}
            {headerTitle()}
          </h1>
          <p className="text-[11px] text-[var(--text-muted)] font-medium truncate">{headerSubtitle()}</p>
        </div>
        {view === 'home' && (
          <div className="flex items-center gap-1.5 shrink-0">
            <button onClick={() => setView('search')} className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 transition-colors" title="Cerca Prodotto">
              <Search className="w-5 h-5" />
            </button>
            <button onClick={() => setView('compare')} className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-colors" title="Confronta Prezzi">
              <BarChart3 className="w-5 h-5" />
            </button>
          </div>
        )}
        {view === 'store' && chain?.flyerUrl && (
          <button onClick={() => openInSystem(chain.flyerUrl!)} className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 transition-colors shrink-0" title="Sito ufficiale">
            <Globe className="w-5 h-5" />
          </button>
        )}
      </header>

      {/* ═══ CONTENT ═══ */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain custom-scrollbar scroll-smooth pb-[max(env(safe-area-inset-bottom),8px)]">
        <AnimatePresence mode="wait">
          {view === 'home' && <HomeView key="home" />}
          {view === 'store' && <StoreView key="store" />}
          {view === 'search' && <SearchView key="search" />}
          {view === 'compare' && <CompareView key="compare" />}
        </AnimatePresence>
      </div>

      {/* ═══ FLYER EDIT MODAL ═══ */}
      <AnimatePresence>
        {editingFlyer && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] flex items-end justify-center bg-black/50 backdrop-blur-sm" onClick={() => setEditingFlyer(null)}>
            <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="w-full max-w-lg bg-[var(--card-bg)] rounded-t-3xl border-t border-x border-[var(--border)] shadow-2xl p-5 space-y-4" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h3 className="font-black text-[var(--text-main)]">Configura Volantino</h3>
                <button onClick={() => setEditingFlyer(null)} className="p-2 rounded-xl hover:bg-[var(--surface-variant)] text-[var(--text-muted)]"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-[var(--text-muted)] mb-1 block">Etichetta</label>
                  <input value={flyerForm.label} onChange={e => setFlyerForm(p => ({ ...p, label: e.target.value }))} className="w-full px-3 py-2.5 bg-[var(--bg)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-main)] outline-none focus:border-amber-500" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-[var(--text-muted)] mb-1 block">Aggiornato il</label>
                    <input type="date" value={flyerForm.updatedAt} onChange={e => setFlyerForm(p => ({ ...p, updatedAt: e.target.value }))} className="w-full px-3 py-2.5 bg-[var(--bg)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-main)] outline-none focus:border-amber-500" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-[var(--text-muted)] mb-1 block">Valido fino al</label>
                    <input type="date" value={flyerForm.validTo} onChange={e => setFlyerForm(p => ({ ...p, validTo: e.target.value }))} className="w-full px-3 py-2.5 bg-[var(--bg)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-main)] outline-none focus:border-amber-500" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-[var(--text-muted)] mb-1 block">URL Volantino PDF</label>
                  <div className="flex gap-2">
                    <input value={flyerForm.pdfUrl} onChange={e => setFlyerForm(p => ({ ...p, pdfUrl: e.target.value }))} placeholder="https://..." className="flex-1 px-3 py-2.5 bg-[var(--bg)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-main)] outline-none focus:border-amber-500" />
                    <label className="p-2.5 bg-amber-500/10 text-amber-500 rounded-xl hover:bg-amber-500/20 transition-colors cursor-pointer shrink-0">
                      <FileUp className="w-5 h-5" />
                      <input type="file" accept="application/pdf" className="hidden" onChange={e => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = () => setFlyerForm(p => ({ ...p, pdfAttachment: reader.result as string }));
                        reader.readAsDataURL(file);
                      }} />
                    </label>
                  </div>
                </div>
              </div>
              <button onClick={saveFlyer} className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition-colors">Salva</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );

  /* ═══════════════════════════════════════════════════════════════════
     VIEW 1: HOME — Catalogo, Ricerca Rapida, Offerte Flash, Top Deals
     ═══════════════════════════════════════════════════════════════════ */
  function HomeView() {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="px-4 pt-3 pb-6 max-w-2xl mx-auto w-full space-y-4">

        {/* ── Ricerca Globale Prodotto ── */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-500 pointer-events-none" />
          <input
            type="text"
            value={productSearch}
            onChange={e => {
              setProductSearch(e.target.value);
              if (e.target.value.trim().length >= 2) setView('search');
            }}
            placeholder="Cerca prodotto... (es. Nutella, Pasta Barilla)"
            className="w-full pl-11 pr-4 py-3.5 bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all font-medium text-[var(--text-main)] placeholder:text-[var(--text-muted)] text-[15px]"
          />
        </div>

        {/* ── Zona Filter ── */}
        <div className="relative">
          <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
          <input
            value={query}
            onChange={e => updateZoneQuery(e.target.value)}
            placeholder={activeZone || 'Filtra per zona...'}
            className="w-full pl-10 pr-4 py-2.5 bg-[var(--card-bg)] border border-[var(--border)] rounded-xl outline-none focus:border-amber-500 text-sm text-[var(--text-main)] placeholder:text-[var(--text-muted)]"
          />
          {activeZone && (
            <button onClick={() => { setActiveZone(null); setQuery(''); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-main)]">
              <X className="w-4 h-4" />
            </button>
          )}
          <AnimatePresence>
            {zoneSuggestions.length > 0 && (
              <motion.ul initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                className="absolute left-0 right-0 top-full mt-1 bg-[var(--card-bg)] border border-[var(--border)] rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto">
                {zoneSuggestions.map(z => (
                  <li key={z}><button onClick={() => commitZone(z)} className="w-full text-left px-4 py-2 text-sm hover:bg-amber-500/10 text-[var(--text-main)] transition-colors">{z}</button></li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>

        {/* ── Zone chips ── */}
        {!activeZone && (
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTED_ZONES.map(z => (
              <button key={z} onClick={() => commitZone(z)} className="px-2.5 py-1 bg-[var(--card-bg)] border border-[var(--border)] rounded-full text-[11px] font-bold text-[var(--text-muted)] hover:text-amber-500 hover:border-amber-500/40 transition-colors">{z}</button>
            ))}
            {history.filter(h => !SUGGESTED_ZONES.includes(h)).slice(0, 3).map(h => (
              <button key={h} onClick={() => commitZone(h)} className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full text-[11px] font-bold text-amber-600 flex items-center gap-1">
                <History className="w-3 h-3" /> {h}
              </button>
            ))}
          </div>
        )}

        {/* ── Quick Actions ── */}
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => setView('search')} className="flex items-center gap-3 p-3.5 bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-2xl text-left hover:border-amber-500/40 transition-colors">
            <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center shrink-0"><Search className="w-5 h-5 text-amber-500" /></div>
            <div>
              <p className="text-sm font-bold text-[var(--text-main)]">Cerca Prodotto</p>
              <p className="text-[10px] text-[var(--text-muted)]">Dove costa meno?</p>
            </div>
          </button>
          <button onClick={() => setView('compare')} className="flex items-center gap-3 p-3.5 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-2xl text-left hover:border-emerald-500/40 transition-colors">
            <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center shrink-0"><BarChart3 className="w-5 h-5 text-emerald-500" /></div>
            <div>
              <p className="text-sm font-bold text-[var(--text-main)]">Confronta Prezzi</p>
              <p className="text-[10px] text-[var(--text-muted)]">Tabella comparativa</p>
            </div>
          </button>
        </div>

        {/* ── Offerte Flash (sconti > 30%) ── */}
        {flashDeals.length > 0 && (
          <div>
            <h3 className="text-sm font-black text-[var(--text-main)] flex items-center gap-2 mb-2"><Zap className="w-4 h-4 text-amber-500" /> Offerte Flash</h3>
            <div className="flex gap-2.5 overflow-x-auto custom-scrollbar pb-1">
              {flashDeals.map(deal => (
                <div key={deal.productName} className="shrink-0 w-36 bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-3 space-y-1.5">
                  <div className="text-2xl text-center">{deal.emoji}</div>
                  <p className="text-xs font-bold text-[var(--text-main)] truncate text-center">{deal.productName}</p>
                  <div className="text-center">
                    <span className="text-sm font-black text-emerald-500">€{fmtPrice(deal.bestPrice)}</span>
                    {deal.worstPrice > deal.bestPrice && (
                      <span className="text-[10px] text-[var(--text-muted)] line-through ml-1">€{fmtPrice(deal.worstPrice)}</span>
                    )}
                  </div>
                  <p className="text-[10px] text-center font-bold text-amber-600">{deal.bestStoreName}</p>
                  {deal.savingsPercent > 0 && (
                    <span className="block text-center text-[9px] font-bold text-rose-500 bg-rose-500/10 rounded-full px-2 py-0.5">-{deal.savingsPercent}%</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Top Deals (maggior risparmio) ── */}
        {topDeals.length > 0 && (
          <div>
            <h3 className="text-sm font-black text-[var(--text-main)] flex items-center gap-2 mb-2"><Trophy className="w-4 h-4 text-emerald-500" /> Dove Risparmi di Più</h3>
            <div className="space-y-1.5">
              {topDeals.slice(0, 4).map((deal, i) => (
                <button key={deal.productName} onClick={() => { setProductSearch(deal.productName); setView('search'); }} className="w-full flex items-center gap-3 p-3 bg-[var(--card-bg)] border border-[var(--border)] rounded-xl hover:border-emerald-500/40 transition-colors text-left">
                  <span className="text-xl shrink-0">{deal.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[var(--text-main)] truncate">{deal.productName}</p>
                    <p className="text-[10px] text-[var(--text-muted)]">{deal.quantity} · {deal.brand}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-black text-emerald-500">€{fmtPrice(deal.bestPrice)}</p>
                    <p className="text-[10px] text-[var(--text-muted)]">Risparmi €{fmtPrice(deal.savings)}</p>
                  </div>
                  {i === 0 && <Trophy className="w-4 h-4 text-amber-500 shrink-0" />}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Griglia Supermercati ── */}
        <div>
          <h3 className="text-sm font-black text-[var(--text-main)] flex items-center gap-2 mb-2"><Store className="w-4 h-4 text-amber-500" /> Supermercati {activeZone && activeZone !== 'Tutta Italia' ? `— ${activeZone}` : ''}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {stores.map(s => {
              const f = flyerFor(s.id);
              const stats = getStoreStats(s.id);
              const days = daysUntil(f?.validTo);
              return (
                <button key={s.id} onClick={() => goStore(s.id)} className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-3 text-left hover:border-amber-500/40 transition-all active:scale-[0.97] space-y-2">
                  <div className="flex items-center gap-2.5">
                    <StoreLogo id={s.id} short={s.short} hex={s.color} logo={logoFor(s.id)} size={36} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-[var(--text-main)] truncate">{s.label}</p>
                      {s.discount && <span className="text-[9px] font-bold text-amber-600 bg-amber-500/10 rounded px-1">💰 Discount</span>}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {stats.promoProducts > 0 && (
                      <span className="text-[9px] font-bold text-emerald-600 bg-emerald-500/10 rounded-full px-1.5 py-0.5">{stats.promoProducts} offerte</span>
                    )}
                    {stats.bestDealsCount > 0 && (
                      <span className="text-[9px] font-bold text-amber-600 bg-amber-500/10 rounded-full px-1.5 py-0.5">🏆 {stats.bestDealsCount}</span>
                    )}
                  </div>
                  {f && (
                    <p className="text-[9px] text-[var(--text-muted)]">
                      <ValidityLabel flyer={f} />
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </motion.div>
    );
  }

  /* ═══════════════════════════════════════════════════════════════════
     VIEW 2: STORE — Dettaglio Catena con Offerte e Badge Comparativi
     ═══════════════════════════════════════════════════════════════════ */
  function StoreView() {
    if (!chain) return null;
    const stats = getStoreStats(chain.id);

    return (
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="px-4 pt-3 pb-6 max-w-2xl mx-auto w-full space-y-4">

        {/* ── Store Banner ── */}
        <div className="relative overflow-hidden rounded-2xl p-4" style={{ background: `linear-gradient(135deg, ${chain.color}20 0%, ${chain.color}08 100%)` }}>
          <div className="flex items-center gap-3">
            <div className="bg-white/90 rounded-2xl p-2.5 shadow-lg">
              <StoreLogo id={chain.id} short={chain.short} hex={chain.color} logo={logoFor(chain.id)} size={48} />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-black text-[var(--text-main)]">{chain.label}</h2>
              <p className="text-xs text-[var(--text-muted)]">{chain.points ? `${chain.points} punti vendita` : ''} {chain.group ? `· ${chain.group}` : ''}</p>
              {flyer && <p className="text-[10px] mt-0.5"><ValidityLabel flyer={flyer} /></p>}
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {stats.promoProducts > 0 && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/15 rounded-full px-2 py-0.5">{stats.promoProducts} offerte attive</span>}
            {stats.avgSavings > 0 && <span className="text-[10px] font-bold text-amber-600 bg-amber-500/15 rounded-full px-2 py-0.5">Sconto medio -{stats.avgSavings}%</span>}
            {stats.bestDealsCount > 0 && <span className="text-[10px] font-bold text-blue-600 bg-blue-500/15 rounded-full px-2 py-0.5">🏆 Miglior prezzo su {stats.bestDealsCount} prodotti</span>}
          </div>
          {/* Quick actions */}
          <div className="flex gap-2 mt-3">
            {chain.flyerUrl && (
              <button onClick={() => openInSystem(chain.flyerUrl!)} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-white/80 dark:bg-white/10 rounded-xl text-xs font-bold text-[var(--text-main)] hover:bg-white/95 transition-colors">
                <Globe className="w-3.5 h-3.5" /> Sito Volantino
              </button>
            )}
            {hasPdf && flyer && (
              <button onClick={() => openNativePdf(flyer)} disabled={opening} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-amber-500 rounded-xl text-xs font-bold text-white hover:bg-amber-600 transition-colors disabled:opacity-50">
                {opening ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />} Apri PDF
              </button>
            )}
          </div>
        </div>

        {/* ── DoveConviene Banner ── */}
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
          <p className="text-xs text-[var(--text-main)] leading-relaxed">
            <strong className="text-emerald-600 block mb-0.5">Volantino digitalizzato in tempo reale</strong>
            Offerte e reparti estratti e sincronizzati tramite il database di DoveConviene.it
          </p>
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-1 bg-[var(--surface-variant)] rounded-xl p-1">
          <button onClick={() => setActiveTab('offers')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors ${activeTab === 'offers' ? 'bg-amber-500 text-white' : 'text-[var(--text-muted)]'}`}>
            <Tag className="w-3.5 h-3.5 inline -mt-0.5 mr-1" /> Offerte ({scrapedOffers.length})
          </button>
          <button onClick={() => setActiveTab('flyer')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors ${activeTab === 'flyer' ? 'bg-amber-500 text-white' : 'text-[var(--text-muted)]'}`}>
            <FileText className="w-3.5 h-3.5 inline -mt-0.5 mr-1" /> Volantino
          </button>
        </div>

        {activeTab === 'offers' ? (
          <>
            {/* ── Offers Search ── */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
              <input value={offerSearch} onChange={e => setOfferSearch(e.target.value)} placeholder="Cerca tra le offerte..." className="w-full pl-9 pr-3 py-2.5 bg-[var(--card-bg)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-main)] placeholder:text-[var(--text-muted)] outline-none focus:border-amber-500" />
            </div>

            {/* ── Category pills ── */}
            <div className="flex gap-1.5 overflow-x-auto custom-scrollbar pb-1">
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                <button key={k} onClick={() => setSelectedCategory(k)} className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors ${selectedCategory === k ? 'bg-amber-500 text-white border-amber-500' : 'bg-[var(--card-bg)] text-[var(--text-muted)] border-[var(--border)]'}`}>{v}</button>
              ))}
            </div>

            {/* ── Offer cards ── */}
            <div className="space-y-2">
              {filteredOffers.map(offer => {
                const comparison = compareProduct(offer.productName);
                const isBestPrice = comparison && comparison.bestStore === chain.id;
                const cheaperStore = comparison && !isBestPrice ? comparison.bestStoreName : null;
                const priceDiff = comparison && !isBestPrice ? offer.discountPrice - comparison.bestPrice : 0;
                const inList = isItemInShoppingList(offer.productName);

                return (
                  <div key={offer.id} className="flex items-center gap-3 p-3 bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl">
                    <span className="text-2xl shrink-0">{offer.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-[var(--text-main)] truncate">{offer.productName}</p>
                      <div className="flex flex-wrap items-center gap-1 mt-0.5">
                        {offer.brand && <span className="text-[10px] text-[var(--text-muted)]">{offer.brand}</span>}
                        {offer.badge && <span className="text-[9px] font-bold text-amber-600 bg-amber-500/10 rounded px-1">{offer.badge}</span>}
                        {isBestPrice && <span className="text-[9px] font-bold text-emerald-600 bg-emerald-500/10 rounded px-1">🏆 Miglior prezzo</span>}
                        {cheaperStore && priceDiff > 0.01 && (
                          <span className="text-[9px] font-bold text-blue-600 bg-blue-500/10 rounded px-1">-€{fmtPrice(priceDiff)} da {cheaperStore}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-black text-emerald-500">€{fmtPrice(offer.discountPrice)}</p>
                      <p className="text-[10px] text-[var(--text-muted)] line-through">€{fmtPrice(offer.originalPrice)}</p>
                      <span className="text-[9px] font-bold text-rose-500">{offer.discountPercent}</span>
                    </div>
                    <button
                      onClick={() => !inList && handleAddOfferToShoppingList(offer)}
                      className={`p-2 rounded-xl shrink-0 transition-colors ${inList ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20'}`}
                    >
                      {inList ? <CheckCircle2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    </button>
                  </div>
                );
              })}
              {filteredOffers.length === 0 && (
                <p className="text-center text-sm text-[var(--text-muted)] py-8">Nessuna offerta trovata per questa categoria</p>
              )}
            </div>
          </>
        ) : (
          /* ── Flyer Tab ── */
          <div className="space-y-3">
            {hasPdf && flyer?.pdfUrl && !flyer.pdfAttachment ? (
              <div className="rounded-2xl overflow-hidden border border-[var(--border)] bg-white">
                <iframe src={flyer.pdfUrl} className="w-full h-[60vh] border-0" title={`Volantino ${chain.label}`} />
              </div>
            ) : (
              <FlyerCover chain={chain} />
            )}
            <div className="flex gap-2">
              {chain.flyerUrl && (
                <button onClick={() => openInSystem(chain.flyerUrl!)} className="flex-1 flex items-center justify-center gap-2 py-3 bg-[var(--card-bg)] border border-[var(--border)] rounded-xl text-sm font-bold text-[var(--text-main)] hover:border-amber-500/40 transition-colors">
                  <ExternalLink className="w-4 h-4" /> Apri nel browser
                </button>
              )}
              <button onClick={() => openFlyerForm()} className="flex-1 flex items-center justify-center gap-2 py-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-sm font-bold text-amber-600 hover:bg-amber-500/20 transition-colors">
                <Pencil className="w-4 h-4" /> Configura PDF
              </button>
            </div>
          </div>
        )}
      </motion.div>
    );
  }

  /* ═══════════════════════════════════════════════════════════════════
     VIEW 3: SEARCH — Ricerca Prodotto Cross-Store
     ═══════════════════════════════════════════════════════════════════ */
  function SearchView() {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="px-4 pt-3 pb-6 max-w-2xl mx-auto w-full space-y-4">

        {/* ── Search bar ── */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-500 pointer-events-none" />
          <input
            autoFocus
            type="text"
            value={productSearch}
            onChange={e => setProductSearch(e.target.value)}
            placeholder="Cerca prodotto... (es. Pasta, Latte, Nutella)"
            className="w-full pl-11 pr-4 py-3.5 bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all font-medium text-[var(--text-main)] placeholder:text-[var(--text-muted)] text-[15px]"
          />
        </div>

        {/* ── Results summary ── */}
        {searchResults.length > 0 && (
          <p className="text-xs font-bold text-[var(--text-muted)]">
            {searchResults.length} prodott{searchResults.length === 1 ? 'o' : 'i'} trovat{searchResults.length === 1 ? 'o' : 'i'}
          </p>
        )}

        {/* ── Result cards ── */}
        <div className="space-y-3">
          {searchResults.map(result => (
            <div key={result.productName} className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl overflow-hidden">
              {/* Product header */}
              <div className="flex items-center gap-3 p-3 border-b border-[var(--border)]">
                <span className="text-2xl shrink-0">{result.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[var(--text-main)]">{result.productName}</p>
                  <p className="text-[10px] text-[var(--text-muted)]">{result.quantity} {result.brand ? `· ${result.brand}` : ''}</p>
                </div>
                <div className="text-right shrink-0">
                  {result.savings > 0 && (
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 rounded-full px-2 py-0.5">
                      Risparmi fino a €{fmtPrice(result.savings)}
                    </span>
                  )}
                </div>
              </div>
              {/* Price list */}
              <div className="divide-y divide-[var(--border)]">
                {result.prices.map((p, i) => (
                  <div key={p.storeId} className={`flex items-center gap-2.5 px-3 py-2 ${i === 0 ? 'bg-emerald-500/5' : ''}`}>
                    <StoreLogo id={p.storeId} short={p.storeId.slice(0, 2).toUpperCase()} hex="#888" logo={logoFor(p.storeId)} size={28} />
                    <span className="flex-1 text-xs font-medium text-[var(--text-main)]">{p.storeName}</span>
                    {i === 0 && <Trophy className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                    {i > 0 && result.bestPrice > 0 && (
                      <span className="text-[9px] font-bold text-rose-500">+€{fmtPrice(p.price - result.bestPrice)}</span>
                    )}
                    <span className={`text-sm font-black shrink-0 ${i === 0 ? 'text-emerald-500' : 'text-[var(--text-main)]'}`}>€{fmtPrice(p.price)}</span>
                    {p.isPromo && <span className="text-[8px] font-bold text-amber-600 bg-amber-500/10 rounded px-1 shrink-0">PROMO</span>}
                    <button onClick={() => goStore(p.storeId)} className="p-1 rounded text-[var(--text-muted)] hover:text-amber-500 shrink-0"><ArrowRight className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {productSearch.trim().length >= 2 && searchResults.length === 0 && (
            <div className="text-center py-12">
              <Search className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3 opacity-30" />
              <p className="text-sm text-[var(--text-muted)]">Nessun prodotto trovato per "{productSearch}"</p>
            </div>
          )}

          {productSearch.trim().length < 2 && (
            <div className="text-center py-12">
              <Search className="w-12 h-12 text-amber-500 mx-auto mb-3 opacity-30" />
              <p className="text-sm text-[var(--text-muted)]">Digita almeno 2 caratteri per cercare</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">Es: "Pasta", "Latte", "Nutella", "Birra"</p>
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  /* ═══════════════════════════════════════════════════════════════════
     VIEW 4: COMPARE — Tabella Comparativa Prezzi
     ═══════════════════════════════════════════════════════════════════ */
  function CompareView() {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="px-4 pt-3 pb-6 max-w-2xl mx-auto w-full space-y-4">

        {/* ── Category filter ── */}
        <div className="flex gap-1.5 overflow-x-auto custom-scrollbar pb-1">
          <button
            onClick={() => setCompareCategory('all')}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${compareCategory === 'all' ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-[var(--card-bg)] text-[var(--text-muted)] border-[var(--border)]'}`}
          >
            Tutti ({getAllProducts().length})
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setCompareCategory(cat.id)}
              className={`shrink-0 px-2.5 py-1.5 rounded-full text-[11px] font-bold border transition-colors ${compareCategory === cat.id ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-[var(--card-bg)] text-[var(--text-muted)] border-[var(--border)]'}`}
            >
              {cat.emoji} {cat.count}
            </button>
          ))}
        </div>

        {/* ── Product comparison cards ── */}
        <div className="space-y-2">
          {compareProducts.map(product => {
            const isExpanded = expandedProduct === product.productName;
            return (
              <div key={product.productName} className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl overflow-hidden">
                <button onClick={() => setExpandedProduct(isExpanded ? null : product.productName)} className="w-full flex items-center gap-2.5 p-3 text-left">
                  <span className="text-xl shrink-0">{product.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[var(--text-main)] truncate">{product.productName}</p>
                    <p className="text-[10px] text-[var(--text-muted)]">{product.quantity} {product.brand ? `· ${product.brand}` : ''}</p>
                  </div>
                  <div className="text-right shrink-0 mr-1">
                    <p className="text-sm font-black text-emerald-500">€{fmtPrice(product.bestPrice)}</p>
                    <p className="text-[9px] text-[var(--text-muted)]">{product.bestStoreName}</p>
                  </div>
                  {product.savings > 0 && (
                    <span className="text-[9px] font-bold text-rose-500 bg-rose-500/10 rounded-full px-1.5 py-0.5 shrink-0">
                      -€{fmtPrice(product.savings)}
                    </span>
                  )}
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-[var(--text-muted)] shrink-0" /> : <ChevronDown className="w-4 h-4 text-[var(--text-muted)] shrink-0" />}
                </button>
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                      <div className="border-t border-[var(--border)] divide-y divide-[var(--border)]">
                        {product.prices.map((p, i) => (
                          <div key={p.storeId} className={`flex items-center gap-2.5 px-3 py-2 ${i === 0 ? 'bg-emerald-500/5' : ''}`}>
                            <StoreLogo id={p.storeId} short={p.storeId.slice(0, 2).toUpperCase()} hex="#888" logo={logoFor(p.storeId)} size={24} />
                            <span className="flex-1 text-xs text-[var(--text-main)]">{p.storeName}</span>
                            {i === 0 && <Trophy className="w-3 h-3 text-amber-500" />}
                            <span className={`text-sm font-bold ${i === 0 ? 'text-emerald-500' : i === product.prices.length - 1 ? 'text-rose-400' : 'text-[var(--text-main)]'}`}>
                              €{fmtPrice(p.price)}
                            </span>
                            {i > 0 && <span className="text-[9px] text-rose-500 font-bold">+€{fmtPrice(p.price - product.bestPrice)}</span>}
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        {compareProducts.length === 0 && (
          <div className="text-center py-12">
            <BarChart3 className="w-12 h-12 text-emerald-500 mx-auto mb-3 opacity-30" />
            <p className="text-sm text-[var(--text-muted)]">Nessun prodotto in questa categoria</p>
          </div>
        )}
      </motion.div>
    );
  }
}

/* ═══════════════════════════════════════════════════════════════════════
   HELPER COMPONENTS
   ═══════════════════════════════════════════════════════════════════════ */

function ValidityLabel({ flyer }: { flyer: VolantinoFlyer }) {
  const days = daysUntil(flyer?.validTo);
  if (flyer?.validTo && days !== null && days < 0) {
    return <span className="text-rose-500">scaduto · si rinnova automaticamente</span>;
  }
  if (days === 0) return <span className="text-amber-600">scade oggi</span>;
  if (days === 1) return <span className="text-amber-600">scade domani</span>;
  if (days !== null && days > 1) return <span className="text-[var(--text-muted)]">fino al {fmtTimestamp(flyer.validTo)}</span>;
  return <span className="text-[var(--text-muted)]">volantino attivo</span>;
}

function FlyerCover({ chain }: { chain: ItalianSupermarket }) {
  return (
    <div
      className="relative h-80 flex flex-col items-center justify-center p-8 text-center overflow-hidden rounded-2xl"
      style={{ background: `linear-gradient(150deg, ${chain.color} 0%, ${chain.color}90 55%, #ffffff22 100%)` }}
    >
      <span className="bg-white/95 rounded-3xl p-5 shadow-2xl mb-5 inline-block">
        <StoreLogo id={chain.id} short={chain.short} hex={chain.color} logo={logoFor(chain.id)} size={72} />
      </span>
      <p className="font-black text-white text-xl">{chain.label}</p>
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/80 mt-1">Volantino settimanale</p>
      <span className="mt-6 inline-flex items-center gap-2 bg-black/55 text-white text-xs font-bold px-4 py-2.5 rounded-full backdrop-blur-sm">
        <FileText className="w-3.5 h-3.5" /> Anteprima volantino
      </span>
    </div>
  );
}