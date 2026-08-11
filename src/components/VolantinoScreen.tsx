import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft, X, MapPin, History, ExternalLink, CalendarDays, FileUp,
  Link2, FileText, Loader2, Check, Sparkles, Globe, Store, ChevronLeft, CalendarClock, Pencil,
  ShoppingBag, Tag, Search, Plus, CheckCircle2
} from 'lucide-react';
import { CapacitorHttp, Capacitor } from '@capacitor/core';
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

interface VolantinoScreenProps {
  module: VolantinoModule;
  onSave: (m: VolantinoModule) => void;
  onClose: () => void;
  shoppingItems?: SupermarketItem[];
  onAddShoppingItem?: (item: SupermarketItem) => void;
}

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

export default function VolantinoScreen({ module, onSave, onClose, shoppingItems = [], onAddShoppingItem }: VolantinoScreenProps) {
  const [query, setQuery] = useState('');
  const [activeZone, setActiveZone] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>(loadHistory());
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'offers' | 'flyer'>('offers');
  const [offerSearch, setOfferSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [editingFlyer, setEditingFlyer] = useState<VolantinoFlyer | null>(null);
  const [flyerForm, setFlyerForm] = useState({ label: '', updatedAt: '', validTo: '', pdfUrl: '', pdfAttachment: '' });
  const [opening, setOpening] = useState(false);

  const flyers = module.flyers ?? [];
  const flyerFor = (storeId: string) => flyers.find(f => f.storeId === storeId);
  const saveFlyers = (next: VolantinoFlyer[]) => onSave({ ...module, offers: module.offers, flyers: next });

  /* Rinnovo automatico dei volantini in base alle scadenze */
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

  /* ── zona / filtri ─────────────────────────────────────────────── */
  const updateQuery = (v: string) => {
    setQuery(v);
    setSuggestions(v.trim().length >= 1 ? suggestZones(v, 7) : []);
  };

  const commitZone = (z: string) => {
    const clean = z.trim();
    if (!clean) return;
    setActiveZone(clean);
    setQuery('');
    setSuggestions([]);
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

  const lastUpdatedAt = useMemo(() => {
    const times = flyers.map(f => f.updatedAt).filter(Boolean) as string[];
    return times.length ? times.sort().reverse()[0] : undefined;
  }, [flyers]);

  /* ── catena selezionata & offerte scraped ────────────────────────── */
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
        await Filesystem.downloadFile({
          url,
          path: fileName,
          directory: Directory.Cache,
          connectTimeout: 30000,
          readTimeout: 120000
        });
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

  const handleAddOfferToShoppingList = (offer: ScrapedOffer) => {
    if (onAddShoppingItem) {
      const newItem: SupermarketItem = {
        id: generateUUID(),
        name: offer.productName,
        category: offer.category,
        completed: false,
        quantity: 1,
        isPromo: true,
        promoPrice: offer.discountPrice
      };
      onAddShoppingItem(newItem);
    }
  };

  const isItemInShoppingList = (productName: string) => {
    return shoppingItems.some(i => i.name.toLowerCase() === productName.toLowerCase() && !i.completed);
  };

  /* ── config volantino ──────────────────────────────────────────── */
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

  /* ───────────────────────── RENDER ─────────────────────────────── */
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed inset-0 z-[150] flex flex-col h-[100dvh] w-full max-w-6xl mx-auto bg-[var(--bg)] relative overflow-hidden"
    >
      {/* HEADER */}
      <header className="flex items-center justify-between gap-3 pt-[max(env(safe-area-inset-top),16px)] px-4 lg:px-5 pb-4 bg-[var(--card-bg)] border-b border-[var(--border)] shrink-0 z-30">
        <button
          onClick={() => (chain ? setSelectedId(null) : onClose())}
          className="p-2.5 -ml-2 hover:bg-[var(--surface-variant)] rounded-full text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors shrink-0 cursor-pointer"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl lg:text-2xl font-black text-[var(--text-main)] truncate flex items-center gap-2">
            <Sparkles className="w-5 h-5 lg:w-6 lg:h-6 text-amber-500 shrink-0" />
            {chain ? chain.label : 'Volantini & Offerte'}
          </h1>
          <p className="text-[11px] lg:text-xs text-[var(--text-muted)] font-medium truncate">
            {chain
              ? (chain.flyerUrl ? `Volantino Ufficiale: ${chain.flyerUrl}` : 'Offerte e volantino promozionale')
              : `${stores.length} supermercati ed insegne` + (lastUpdatedAt ? ` · aggiornato ${fmtTimestamp(lastUpdatedAt)}` : '')}
          </p>
        </div>
      </header>

      {/* MAIN SCROLL AREA */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain custom-scrollbar scroll-smooth pb-[max(env(safe-area-inset-bottom),8px)]">
        {chain ? (
          /* ─────────── DETTAGLIO CATENA + SCRAPING OFFERTE ─────────── */
          <div className="p-4 lg:p-6 space-y-5">
            <button
              onClick={() => setSelectedId(null)}
              className="flex items-center gap-1.5 text-sm font-bold text-[var(--text-muted)] hover:text-amber-500 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" /> Tutti i supermercati ed insegne
            </button>

            {/* Info insegna & URL Volantino */}
            <section className="bg-[var(--card-bg)] rounded-[2rem] border border-[var(--border)] p-4 lg:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
              <div className="flex items-center gap-3">
                <StoreLogo id={chain.id} short={chain.short} hex={chain.color} logo={logoFor(chain.id)} size={60} />
                <div className="flex-1 min-w-0">
                  <p className="font-black text-[var(--text-main)] text-xl truncate flex items-center gap-2">
                    {chain.label}
                    {chain.discount && (
                      <span className="text-[10px] font-black uppercase tracking-wide text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2.5 py-0.5 shrink-0">
                        Risparmio
                      </span>
                    )}
                  </p>
                  <p className="text-[11px] text-[var(--text-muted)] font-medium truncate mt-0.5">
                    {[chain.group, chain.points ? `${chain.points} punti vendita` : null, chain.regions.includes('Italia') ? 'Nazionale' : chain.regions.join(', ')].filter(Boolean).join(' · ')}
                  </p>
                  {chain.flyerUrl && (
                    <a
                      href={chain.flyerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-bold text-amber-500 hover:underline flex items-center gap-1 mt-1 truncate"
                    >
                      <Globe className="w-3.5 h-3.5 shrink-0" />
                      {chain.flyerUrl}
                    </a>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => openInSystem(chain.flyerUrl || chain.website || '')}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4" />
                  Sito Volantino Online
                </button>
              </div>
            </section>

            {/* SELETTORE TAB: Offerte Scraped vs Reader Volantino */}
            <div className="flex items-center gap-2 p-1.5 bg-[var(--surface-variant)] rounded-2xl border border-[var(--border)]">
              <button
                onClick={() => setActiveTab('offers')}
                className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  activeTab === 'offers'
                    ? 'bg-amber-500 text-white shadow-md'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                <Tag className="w-4 h-4" />
                Offerte Volantino ({filteredOffers.length})
              </button>
              <button
                onClick={() => setActiveTab('flyer')}
                className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  activeTab === 'flyer'
                    ? 'bg-amber-500 text-white shadow-md'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                <FileText className="w-4 h-4" />
                Anteprima Volantino / PDF
              </button>
            </div>

            {activeTab === 'offers' ? (
              /* ────────── TAB 1: OFFERTE SCRAPED DEL VOLANTINO ────────── */
              <div className="space-y-4">
                {/* Ricerca ed abbonamento filtri offerte */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                    <input
                      value={offerSearch}
                      onChange={e => setOfferSearch(e.target.value)}
                      placeholder={`Cerca in offerte ${chain.label} (es. Dash, Caffè, Pasta)…`}
                      className="w-full pl-11 pr-4 py-3 bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl outline-none focus:border-amber-500 font-medium text-xs text-[var(--text-main)] shadow-sm"
                    />
                  </div>

                  <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-1">
                    {['all', 'pulizia', 'igiene', 'dispensa', 'latticini-uova', 'carne-pesce', 'bevande'].map(cat => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border cursor-pointer ${
                          selectedCategory === cat
                            ? 'bg-amber-500/10 border-amber-500/50 text-amber-500'
                            : 'bg-[var(--card-bg)] border-[var(--border)] text-[var(--text-muted)] hover:border-amber-500/40'
                        }`}
                      >
                        {CATEGORY_LABELS[cat] || cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* GRIGLIA OFFERTE SCRAPED */}
                {filteredOffers.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {filteredOffers.map(offer => {
                      const added = isItemInShoppingList(offer.productName);
                      return (
                        <div
                          key={offer.id}
                          className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-4 flex flex-col justify-between shadow-sm hover:border-amber-500/50 transition-all relative overflow-hidden group"
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <span className="text-2xl">{offer.icon}</span>
                              <div className="flex items-center gap-1.5">
                                {offer.badge && (
                                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                                    {offer.badge}
                                  </span>
                                )}
                                <span className="text-[10px] font-black text-rose-500 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full">
                                  {offer.discountPercent}
                                </span>
                              </div>
                            </div>

                            <p className="font-bold text-sm text-[var(--text-main)] leading-snug line-clamp-2 mb-1">
                              {offer.productName}
                            </p>
                            {offer.brand && (
                              <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                                {offer.brand}
                              </p>
                            )}
                          </div>

                          <div className="mt-4 pt-3 border-t border-[var(--border)] flex items-center justify-between gap-2">
                            <div>
                              <span className="text-xs text-[var(--text-muted)] line-through mr-1.5 font-medium">
                                €{offer.originalPrice.toFixed(2)}
                              </span>
                              <span className="text-base font-black text-emerald-600">
                                €{offer.discountPrice.toFixed(2)}
                              </span>
                            </div>

                            <button
                              onClick={() => handleAddOfferToShoppingList(offer)}
                              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer ${
                                added
                                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-600'
                                  : 'bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/20'
                              }`}
                            >
                              {added ? (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Aggiunto</span>
                                </>
                              ) : (
                                <>
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>+ Spesa</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center bg-[var(--card-bg)] rounded-3xl border border-[var(--border)] p-6">
                    <ShoppingBag className="w-10 h-10 text-amber-500/50 mb-3" />
                    <p className="font-bold text-[var(--text-main)]">Nessuna offerta trovata</p>
                    <p className="text-xs text-[var(--text-muted)] mt-1">Prova a cambiare parola chiave o filtro categoria.</p>
                  </div>
                )}
              </div>
            ) : (
              /* ────────── TAB 2: ANTEPRIMA VOLANTINO / PDF READER ────────── */
              <section className="rounded-[2rem] overflow-hidden border border-[var(--border)] bg-[var(--card-bg)] shadow-sm">
                {hasPdf ? (
                  <div className="h-96 lg:h-[28rem] relative bg-white">
                    <iframe
                      src={flyer!.pdfAttachment || flyer!.pdfUrl}
                      className="absolute inset-0 w-full h-full border-none bg-white"
                      title={`Volantino ${chain.label}`}
                    />
                  </div>
                ) : (
                  <FlyerCover chain={chain} />
                )}

                <footer className="px-4 lg:px-5 py-4 flex flex-wrap items-center gap-2.5 border-t border-[var(--border)]">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[var(--text-main)] text-sm truncate">
                      {flyer?.label || 'Volantino settimanale'}
                    </p>
                    <p className="text-[10px] text-[var(--text-muted)] font-medium truncate">
                      {flyer?.updatedAt ? `aggiornato ${fmtTimestamp(flyer.updatedAt)}` : 'volantino attivo'}
                    </p>
                  </div>

                  <button
                    onClick={() => openFlyerForm(flyer)}
                    title="Configura volantino"
                    className="p-2.5 rounded-xl text-[var(--text-muted)] hover:text-amber-500 hover:bg-amber-500/10 transition-colors shrink-0 cursor-pointer"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => (hasPdf ? openNativePdf(flyer!) : openInSystem(chain.flyerUrl || chain.website || ''))}
                    disabled={opening}
                    className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-lg shadow-amber-500/25 shrink-0 cursor-pointer"
                  >
                    {opening ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                    {hasPdf ? 'Apri con il reader' : 'Vai al volantino online'}
                  </button>
                </footer>
              </section>
            )}
          </div>
        ) : (
          /* ────────── HOME: ZONA + LISTA SUPERMERCATI ────────── */
          <div className="p-4 lg:p-6 space-y-5">
            {/* Ricerca zona */}
            <section className="bg-[var(--card-bg)] rounded-[2rem] border border-[var(--border)] p-4 lg:p-5 shadow-sm">
              <p className="text-sm font-black text-[var(--text-muted)] uppercase tracking-wider mb-3 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-amber-500" /> Dove fai la spesa?
              </p>
              <div className="relative">
                <MapPin className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  value={query}
                  onChange={e => updateQuery(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') commitZone(query); }}
                  placeholder="Città o regione, es. Milano, Lazio…"
                  className="w-full pl-11 pr-4 py-3.5 bg-[var(--surface-variant)] border border-[var(--border)] rounded-2xl outline-none focus:border-amber-500 transition-all font-medium text-[var(--text-main)]"
                />
              </div>

              {/* suggerimenti */}
              <AnimatePresence>
                {query.trim() && suggestions.length > 0 ? (
                  <motion.ul
                    key="sugg"
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="mt-2 bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl shadow-xl overflow-hidden custom-scrollbar max-h-64 overflow-y-auto"
                  >
                    {suggestions.map((s, i) => (
                      <li key={`${s}-${i}`}>
                        <button
                          onClick={() => commitZone(s)}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--surface-variant)] transition-colors text-left"
                        >
                          <MapPin className="w-4 h-4 text-amber-500 shrink-0" />
                          <span className="font-semibold text-[var(--text-main)] text-sm flex-1">{s}</span>
                          {cityRegion(s) && <span className="text-[10px] font-bold text-[var(--text-muted)]">{cityRegion(s)}</span>}
                        </button>
                      </li>
                    ))}
                  </motion.ul>
                ) : !query.trim() ? (
                  <motion.div key="chips" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <div className="flex flex-wrap gap-2 mt-4">
                      {SUGGESTED_ZONES.map(z => (
                        <button
                          key={z}
                          onClick={() => commitZone(z)}
                          className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all ${
                            activeZone === z
                              ? 'bg-amber-500/10 border-amber-500/50 text-amber-500'
                              : 'bg-[var(--surface-variant)] border-[var(--border)] text-[var(--text-main)] hover:border-amber-500/50'
                          }`}
                        >
                          {z}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </section>

            {/* Cronologia */}
            {history.length > 0 && (
              <section>
                <p className="text-sm font-black text-[var(--text-muted)] uppercase tracking-wider mb-2 flex items-center gap-2">
                  <History className="w-4 h-4 text-[var(--text-muted)]" /> Recenti
                </p>
                <div className="flex flex-wrap gap-2">
                  {history.map(z => (
                    <button
                      key={z}
                      onClick={() => commitZone(z)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface-variant)] text-[var(--text-main)] text-sm font-semibold hover:border-amber-500/50 transition-all"
                    >
                      <MapPin className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                      {z}
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Zona attiva */}
            {activeZone && (
              <div className="flex items-center justify-between gap-3">
                <p className="text-lg font-black text-[var(--text-main)] flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-amber-500" /> {resolvedZoneText}
                </p>
                <button
                  onClick={() => setActiveZone(null)}
                  className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-muted)] hover:text-rose-500 transition-colors shrink-0"
                >
                  <X className="w-3.5 h-3.5" /> Rimuovi filtro
                </button>
              </div>
            )}

            {/* Griglia supermercati */}
            <section>
              <p className="text-sm font-black text-[var(--text-muted)] uppercase tracking-wider mb-3">
                {activeZone ? `${stores.length} insegne disponibili` : 'Tutti i supermercati ed insegne'}
              </p>
              {stores.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 lg:gap-4">
                  {stores.map(ch => {
                    const f = flyerFor(ch.id);
                    const hasP = !!(f?.pdfUrl || f?.pdfAttachment);
                    return (
                      <button
                        key={ch.id}
                        onClick={() => { setSelectedId(ch.id); setActiveTab('offers'); }}
                        className="group bg-[var(--card-bg)] rounded-[2rem] border border-[var(--border)] p-4 lg:p-5 flex flex-col items-center text-center gap-2 hover:border-amber-500/60 hover:bg-amber-500/5 transition-all shadow-sm cursor-pointer"
                      >
                        <span className="relative">
                          <StoreLogo id={ch.id} short={ch.short} hex={ch.color} logo={logoFor(ch.id)} size={64} />
                          {hasP ? (
                            <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-2 border-[var(--card-bg)] rounded-full flex items-center justify-center">
                              <Check className="w-3 h-3 text-white" />
                            </span>
                          ) : ch.discount ? (
                            <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white rounded-full flex items-center justify-center text-[9px] font-black">%</span>
                          ) : null}
                        </span>
                        <span className="w-full">
                          <span className="block font-black text-[var(--text-main)] text-sm leading-tight truncate">{ch.label}</span>
                          <span className="block text-[10px] text-[var(--text-muted)] font-medium truncate mt-0.5">
                            {ch.points ? `${ch.points} punti vendita` : 'presenza diffusa'}
                          </span>
                          {f && (
                            <span className="block text-[10px] font-bold mt-1 flex items-center justify-center gap-1 truncate">
                              <CalendarClock className={`w-3 h-3 shrink-0 ${f.validTo && new Date(f.validTo).getTime() < Date.now() ? 'text-rose-500' : 'text-amber-500'}`} />
                              <ValidityLabel flyer={f} />
                            </span>
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center text-center py-12 gap-3">
                  <div className="w-16 h-16 bg-amber-500/10 text-amber-500 rounded-3xl flex items-center justify-center">
                    <Store className="w-8 h-8" />
                  </div>
                  <p className="font-black text-[var(--text-main)]">Nessuna insegna trovata</p>
                  <p className="text-sm text-[var(--text-muted)] max-w-xs">Prova un'altra città o regione, oppure rimuovi il filtro.</p>
                </div>
              )}
            </section>

            <p className="text-[11px] text-[var(--text-muted)] text-center px-4 leading-relaxed">
              Tocca il logo di una catena per consultare le offerte del volantino ed aggiungerle direttamente alla tua lista della spesa.
            </p>
          </div>
        )}
      </div>

      {/* CONFIG VOLANTINO MODAL */}
      <AnimatePresence>
        {editingFlyer && chain && (
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
                className="absolute top-4 right-4 p-2 rounded-xl text-[var(--text-muted)] hover:bg-[var(--surface-variant)] transition-colors shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="w-12 h-12 bg-amber-500/10 text-amber-500 rounded-2xl flex items-center justify-center mb-4">
                <CalendarDays className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-[var(--text-main)] mb-1">Volantino {chain.label}</h3>
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
                    <label className="block text-xs font-bold text-[var(--text-muted)] mb-1.5">Valido fino al</label>
                    <input
                      type="date"
                      value={flyerForm.validTo}
                      onChange={e => setFlyerForm(f => ({ ...f, validTo: e.target.value }))}
                      className="w-full px-4 py-3.5 bg-[var(--surface-variant)] border border-[var(--border)] rounded-2xl outline-none focus:border-amber-500 transition-all font-medium text-[var(--text-main)]"
                    />
                    <p className="text-[10px] text-[var(--text-muted)] mt-1">Se vuoto, l'app imposta la scadenza del ciclo settimanale e rinnova da sola il volantino.</p>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--text-muted)] mb-1.5">PDF del volantino</label>
                    <label className="flex items-center justify-center gap-2 px-4 py-3.5 bg-[var(--surface-variant)] border border-[var(--border)] rounded-2xl cursor-pointer hover:border-amber-500 transition-all text-sm font-semibold text-[var(--text-main)]">
                      <FileUp className="w-4 h-4 text-amber-500" />
                      {flyerForm.pdfAttachment ? 'Sostituisci PDF' : 'Carica PDF'}
                      <input type="file" accept="application/pdf,.pdf" className="hidden" onChange={onFlyerPdfSelect} />
                    </label>
                  </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--text-muted)] mb-1.5">Link PDF (URL)</label>
                  <div className="relative">
                    <Link2 className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                    <input
                      value={flyerForm.pdfUrl}
                      onChange={e => setFlyerForm(f => ({ ...f, pdfUrl: e.target.value }))}
                      placeholder="https://www.…/volantino.pdf"
                      className="w-full pl-11 pr-4 py-3.5 bg-[var(--surface-variant)] border border-[var(--border)] rounded-2xl outline-none focus:border-amber-500 transition-all font-medium text-[var(--text-main)]"
                    />
                  </div>
                  <p className="text-[10px] text-[var(--text-muted)] mt-1">Il PDF allegato ha la precedenza, altrimenti viene scaricato il link prima dell'apertura.</p>
                </div>

                {(flyerForm.pdfAttachment || flyerForm.pdfUrl) && (
                  <div className="flex items-center justify-between gap-2 text-xs font-bold text-emerald-600 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl px-4 py-2.5">
                    <span className="truncate flex items-center gap-1.5">
                      <FileText className="w-4 h-4 shrink-0" />
                      {flyerForm.pdfAttachment ? 'PDF allegato pronto' : flyerForm.pdfUrl}
                    </span>
                    <button
                      onClick={() => setFlyerForm(f => ({ ...f, pdfAttachment: '', pdfUrl: '' }))}
                      className="text-rose-500 hover:text-rose-600 font-bold shrink-0 cursor-pointer"
                    >
                      Rimuovi
                    </button>
                  </div>
                )}

                <button
                  onClick={saveFlyer}
                  className="w-full bg-amber-500 hover:bg-amber-600 text-white py-4 rounded-2xl font-bold transition-all active:scale-[0.99] shadow-lg shadow-amber-500/25 cursor-pointer"
                >
                  Salva volantino
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ── Etichetta validità volantino ── */
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

/* ── Copertina grafica quando il volantino non ha ancora un PDF ── */
function FlyerCover({ chain }: { chain: ItalianSupermarket }) {
  return (
    <div
      className="relative h-96 lg:h-[26rem] flex flex-col items-center justify-center p-8 text-center overflow-hidden"
      style={{ background: `linear-gradient(150deg, ${chain.color} 0%, ${chain.color}90 55%, #ffffff22 100%)` }}
    >
      <span className="bg-white/95 rounded-3xl p-5 shadow-2xl mb-5 inline-block">
        <StoreLogo id={chain.id} short={chain.short} hex={chain.color} logo={logoFor(chain.id)} size={72} />
      </span>
      <p className="font-black text-[var(--text-main)] text-xl text-shadow-sm">{chain.label}</p>
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/80 mt-1">Volantino settimanale</p>
      <span className="mt-6 inline-flex items-center gap-2 bg-black/55 text-white text-xs font-bold px-4 py-2.5 rounded-full backdrop-blur-sm">
        <FileText className="w-3.5 h-3.5" /> Anteprima volantino
      </span>
    </div>
  );
}