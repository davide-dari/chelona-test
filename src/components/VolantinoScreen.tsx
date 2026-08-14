import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft, RefreshCw, Globe, ExternalLink, Loader2, CalendarDays,
  ChevronRight, Store, Sparkles, BookOpen, MapPin, Crosshair, X
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { VolantinoModule } from '../types';
import { logoFor } from '../data/supermarketLogos';
import { StoreLogo } from './StoreLogo';
import { supermarketById } from '../data/italianSupermarkets';
import { brandImageUrl } from '../data/brandImages';
import type { VolantiniDb, VolantinoChain, VolantinoFlyer } from '../data/volantiniDb';
import {
  getVolantiniDb, refreshVolantini, ensureBkcode,
  volantinoViewerUrl, volantinoNodeUrl, formatValidity
} from '../services/centrovolantini';
import {
  ALL_ITALY_ZONE, flyerMatchesZone, loadZone, resolveCap, resolveCity, resolveGps, saveZone,
  textMatchesZone,
  type VolantiniZone
} from '../services/zoneService';
import { searchComuni, comuniByCap, findComune } from '../services/comuniService';
import { TP_BROKEN_LOGOS, TP_CATEGORIES, TP_SHOPS, tpLogoUrl, tpPageUrl } from '../data/tuttiprezziDb';
import type { TpCategory, TpFlyer, TpShop } from '../data/tuttiprezziDb';

interface VolantinoScreenProps {
  module: VolantinoModule;
  onClose: () => void;
}

type ViewMode = 'home' | 'chain' | 'flyer' | 'tp-chain' | 'tp-flyer';

const fmtUpdated = (iso?: string) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' });
};

const flyerDisplayTitle = (f: VolantinoFlyer, chain: VolantinoChain) =>
  f.title && f.title !== 'Volantino' ? f.title : chain.name;

export default function VolantinoScreen({ module, onClose }: VolantinoScreenProps) {
  const [view, setView] = useState<ViewMode>('home');
  const [db, setDb] = useState<VolantiniDb>(() => getVolantiniDb());
  const [chainSlug, setChainSlug] = useState<string | null>(null);
  const [activeFlyer, setActiveFlyer] = useState<VolantinoFlyer | null>(null);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [failedCovers, setFailedCovers] = useState<Set<number>>(new Set());
  const refreshDone = useRef(false);

  /* ── Zona dell'utente ── */
  const [zone, setZone] = useState<VolantiniZone | null>(() => loadZone());
  const [zoneModalOpen, setZoneModalOpen] = useState<boolean>(() => !loadZone());
  const [capInput, setCapInput] = useState('');
  const [cityInput, setCityInput] = useState('');
  const [citySuggestions, setCitySuggestions] = useState<ReturnType<typeof searchComuni>>([]);
  const [capSuggestions, setCapSuggestions] = useState<ReturnType<typeof comuniByCap>>([]);
  const [zoneBusy, setZoneBusy] = useState<'gps' | null>(null);
  const [zoneError, setZoneError] = useState<string | null>(null);

  /* ── TuttiPrezzi ── */
  const [tpCat, setTpCat] = useState<TpCategory>('supermercati');
  const [tpShopSlug, setTpShopSlug] = useState<string | null>(null);
  const [tpFlyer, setTpFlyer] = useState<{ shop: TpShop; flyer: TpFlyer } | null>(null);

  const applyZone = (z: VolantiniZone) => {
    setZone(z);
    saveZone(z);
    setZoneModalOpen(false);
    setZoneError(null);
  };

  const submitCap = () => {
    setZoneError(null);
    const z = resolveCap(capInput);
    if (!z) {
      setZoneError('CAP non valido. Inserisci un codice di 5 cifre.');
      return;
    }
    applyZone(z);
  };

  const onCityChange = (v: string) => {
    setCityInput(v);
    setZoneError(null);
    if (v.trim().length >= 2) setCitySuggestions(searchComuni(v));
    else setCitySuggestions([]);
  };

  const pickCity = (s: ReturnType<typeof searchComuni>[number]) => {
    setCityInput(`${s.n} (${s.p})`);
    setCitySuggestions([]);
    setCapInput(s.c);
    setCapSuggestions(comuniByCap(s.c));
    const z = resolveCity(s.n);
    if (z) applyZone(z);
  };

  const onCapChange = (v: string) => {
    setCapInput(v);
    setZoneError(null);
    setCapSuggestions(v.length === 5 ? comuniByCap(v) : []);
  };

  const useGps = async () => {
    setZoneError(null);
    setZoneBusy('gps');
    const z = await resolveGps();
    setZoneBusy(null);
    if (!z) {
      setZoneError('Impossibile rilevare la posizione. Riprova o inserisci il CAP.');
      return;
    }
    applyZone(z);
  };

  const coverFailed = (id: number) => failedCovers.has(id);
  const markCoverFailed = (id: number) =>
    setFailedCovers(prev => (prev.has(id) ? prev : new Set(prev).add(id)));

  const allChains = useMemo(() => db.chains.filter(c => c.flyers.length > 0), [db]);

  /* Catene con almeno un volantino rilevante per la zona */
  const chains = useMemo(() => {
    if (!zone || zone.kind === 'all') return allChains;
    return allChains
      .map(c => ({ ...c, flyers: c.flyers.filter(f => flyerMatchesZone(zone, f)) }))
      .filter(c => c.flyers.length > 0);
  }, [allChains, zone]);

  const chain = chainSlug ? chains.find(c => c.slug === chainSlug) : undefined;

  /* Novità: volantini rilevanti ordinati dal più recente (node id desc) */
  const novita = useMemo(() => {
    const flat = chains.flatMap(c => c.flyers.map(f => ({ c, f })));
    return flat.sort((a, b) => b.f.id - a.f.id).slice(0, 60);
  }, [chains]);

  /* Refresh automatico all'apertura (solo nativo: su web CORS fallisce in silenzio) */
  useEffect(() => {
    if (refreshDone.current) return;
    refreshDone.current = true;
    let cancelled = false;
    const t = setTimeout(async () => {
      if (!Capacitor.isNativePlatform()) return;
      const fresh = await refreshVolantini();
      if (!cancelled) setDb(fresh);
    }, 800);
    return () => { cancelled = true; clearTimeout(t); };
  }, []);

  const doRefresh = async () => {
    setRefreshing(true);
    const fresh = await refreshVolantini();
    setDb(fresh);
    setRefreshing(false);
  };

  const openChain = (slug: string) => {
    setChainSlug(slug);
    setView('chain');
  };

  /* ── Navigazione TuttiPrezzi ── */
  const tpShops = useMemo(() => {
    const byCat = TP_SHOPS.filter(s => s.cat === tpCat && s.flyers.length > 0);
    if (!zone || zone.kind === 'all') return byCat;
    return byCat
      .map(s => ({
        ...s,
        flyers: s.flyers.filter(f => textMatchesZone(zone, `${f.nome} ${s.name}`)),
      }))
      .filter(s => s.flyers.length > 0);
  }, [tpCat, zone]);

  const tpShop = tpShopSlug ? TP_SHOPS.find(s => s.slug === tpShopSlug) : undefined;

  const openTpShop = (slug: string) => {
    setTpShopSlug(slug);
    setView('tp-chain');
  };

  const openTpFlyer = (shop: TpShop, flyer: TpFlyer) => {
    setTpFlyer({ shop, flyer });
    setView('tp-flyer');
  };

  const openFlyer = async (flyer: VolantinoFlyer, slug?: string) => {
    if (slug) setChainSlug(slug);
    setActiveFlyer(flyer);
    setViewerUrl(null);
    setResolving(true);
    setView('flyer');
    if (flyer.bkcode) {
      setViewerUrl(volantinoViewerUrl(flyer));
      setResolving(false);
      return;
    }
    const updated = await ensureBkcode(flyer);
    if (updated.bkcode) setViewerUrl(volantinoViewerUrl(updated));
    setResolving(false);
  };

  const goBack = () => {
    if (view === 'chain') { setChainSlug(null); setView('home'); }
    else if (view === 'flyer') { setActiveFlyer(null); setViewerUrl(null); setView(chain ? 'chain' : 'home'); }
    else if (view === 'tp-chain') { setTpShopSlug(null); setView('home'); }
    else if (view === 'tp-flyer') { setTpFlyer(null); setView('tp-chain'); }
    else onClose();
  };

  const openInSystem = (url: string) => {
    if (!url) return;
    if (Capacitor.isNativePlatform()) window.open(url, '_system');
    else window.open(url, '_blank');
  };

  const officialSite = chain && chain.logoId ? supermarketById(chain.logoId) : undefined;
  const officialUrl = officialSite?.flyerUrl || officialSite?.website;

  const headerTitle = () => {
    if (view === 'chain' && chain) return chain.name;
    if (view === 'flyer' && activeFlyer && chain) return flyerDisplayTitle(activeFlyer, chain);
    if (view === 'tp-chain' && tpShop) return tpShop.name;
    if (view === 'tp-flyer' && tpFlyer) return tpFlyer.flyer.nome || tpFlyer.shop.name;
    return module.title || 'Volantini & Offerte';
  };

  const headerSubtitle = () => {
    if (view === 'flyer' && activeFlyer) return formatValidity(activeFlyer) ?? 'Sfoglia il volantino';
    if (view === 'chain' && chain) return `${chain.flyers.length} volantini disponibili`;
    if (view === 'tp-chain' && tpShop) return `${tpShop.flyers.length} volantini disponibili`;
    if (view === 'tp-flyer' && tpFlyer) return `${tpFlyer.flyer.pages.length} pagine · scorri per sfogliare`;
    const updated = fmtUpdated(db.updatedAt);
    return `${chains.length} catene · ${novita.length} volantini · ${zone?.label ?? 'Tutta Italia'}${updated ? ` · agg. ${updated}` : ''}`;
  };

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
            {view === 'chain' && chain ? (
              <StoreLogo id={chain.logoId ?? chain.slug} short={chain.name.slice(0, 2)} logo={chain.logoId ? logoFor(chain.logoId) : undefined} brandSlug={chain.slug} size={24} />
            ) : view === 'flyer' && chain ? (
              <StoreLogo id={chain.logoId ?? chain.slug} short={chain.name.slice(0, 2)} logo={chain.logoId ? logoFor(chain.logoId) : undefined} brandSlug={chain.slug} size={24} />
            ) : (view === 'tp-chain' && tpShop) || (view === 'tp-flyer' && tpFlyer) ? (
              TP_BROKEN_LOGOS.has((tpShop ?? tpFlyer!.shop).slug) ? (
                <StoreLogo id={(tpShop ?? tpFlyer!.shop).slug} short={(tpShop ?? tpFlyer!.shop).name.slice(0, 2)} brandSlug={(tpShop ?? tpFlyer!.shop).slug} size={24} />
              ) : (
                <img src={tpLogoUrl((tpShop ?? tpFlyer!.shop).slug)} alt={(tpShop ?? tpFlyer!.shop).name} onError={e => { e.currentTarget.style.display = 'none'; }} className="w-6 h-6 rounded-md object-contain bg-white ring-1 ring-[var(--border)]" />
              )
            ) : (
              <Sparkles className="w-5 h-5 text-amber-500 shrink-0" />
            )}
            {headerTitle()}
          </h1>
          <p className="text-[11px] text-[var(--text-muted)] font-medium truncate">{headerSubtitle()}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {view === 'home' && (
            <button
              onClick={() => setZoneModalOpen(true)}
              className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-colors"
              title="Zona dei volantini"
            >
              <MapPin className="w-5 h-5" />
            </button>
          )}
          {view === 'home' && (
            <button
              onClick={doRefresh}
              disabled={refreshing}
              className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 transition-colors disabled:opacity-50"
              title="Aggiorna volantini"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          )}
          {(view === 'tp-flyer' || view === 'tp-chain') && tpShop && (
            <button onClick={() => openInSystem(`https://www.tuttiprezzi.it/${tpShop.slug}.html`)} className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 transition-colors shrink-0" title="Apri sul sito">
              <ExternalLink className="w-5 h-5" />
            </button>
          )}
          {view === 'chain' && officialUrl && (
            <button onClick={() => openInSystem(officialUrl)} className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 transition-colors shrink-0" title="Sito ufficiale">
              <Globe className="w-5 h-5" />
            </button>
          )}
          {view === 'flyer' && activeFlyer && (
            <button onClick={() => openInSystem(volantinoNodeUrl(activeFlyer.id))} className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 transition-colors shrink-0" title="Apri nel browser">
              <ExternalLink className="w-5 h-5" />
            </button>
          )}
        </div>
      </header>

      {/* ═══ CONTENT ═══ */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain custom-scrollbar scroll-smooth pb-[max(env(safe-area-inset-bottom),8px)]">
        <AnimatePresence mode="wait">
          {view === 'home' && <HomeView key="home" />}
          {view === 'chain' && chain && <ChainView key={chain.slug} />}
          {view === 'flyer' && activeFlyer && chain && <FlyerView key={`${chain.slug}-${activeFlyer.id}`} />}
          {view === 'tp-chain' && tpShop && <TpChainView key={tpShop.slug} />}
          {view === 'tp-flyer' && tpFlyer && <TpFlyerView key={`${tpFlyer.shop.slug}-${tpFlyer.flyer.pages[0] ?? 0}`} />}
        </AnimatePresence>
      </div>

      {/* ═══ MODAL ZONA ═══ */}
      <AnimatePresence>
        {zoneModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              className="w-full max-w-sm rounded-3xl bg-[var(--card-bg)] border border-[var(--border)] p-6 shadow-2xl"
            >
              <div className="flex items-start justify-between mb-1">
                <h2 className="text-lg font-black text-[var(--text-main)] flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-emerald-500" />
                  Dove fai la spesa?
                </h2>
                <button onClick={() => setZoneModalOpen(false)} className="p-1.5 -mr-1.5 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-xs text-[var(--text-muted)] font-medium mb-4">
                Inserisci il CAP o la tua città, oppure usa la posizione per mostrare i volantini della tua zona.
              </p>

              {/* ── Città con autocomplete ── */}
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
                Città
              </label>
              <div className="relative mb-3">
                <input
                  value={cityInput}
                  onChange={e => onCityChange(e.target.value)}
                  onFocus={() => { if (cityInput.trim().length >= 2) setCitySuggestions(searchComuni(cityInput)); }}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && citySuggestions.length) pickCity(citySuggestions[0]);
                  }}
                  placeholder="Es. Milano"
                  className="w-full px-4 py-3 rounded-2xl bg-[var(--bg)] border border-[var(--border)] text-[var(--text-main)] font-semibold text-base outline-none focus:border-emerald-500/60 transition-colors"
                />
                {citySuggestions.length > 0 && (
                  <div className="absolute z-20 top-full left-0 right-0 mt-1.5 rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] shadow-xl overflow-hidden max-h-56 overflow-y-auto custom-scrollbar">
                    {citySuggestions.map(s => (
                      <button
                        key={`${s.n}-${s.p}`}
                        onClick={() => pickCity(s)}
                        className="w-full flex items-center justify-between gap-2 px-4 py-2.5 text-left hover:bg-emerald-500/10 transition-colors"
                      >
                        <span className="text-sm font-semibold text-[var(--text-main)]">{s.n}</span>
                        <span className="text-[11px] font-bold text-[var(--text-muted)] shrink-0">
                          {s.p} · {s.c}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 my-2">
                <div className="flex-1 h-px bg-[var(--border)]" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">oppure</span>
                <div className="flex-1 h-px bg-[var(--border)]" />
              </div>

              <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
                Codice di avviamento postale
              </label>
              <div className="relative flex gap-2 mb-3">
                <input
                  value={capInput}
                  onChange={e => onCapChange(e.target.value.replace(/\D/g, '').slice(0, 5))}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      if (capSuggestions.length) {
                        const s = capSuggestions[0];
                        setCityInput(`${s.n} (${s.p})`);
                        setCapSuggestions([]);
                        const z = resolveCap(capInput) ?? resolveCity(s.n);
                        if (z) applyZone(z);
                      } else submitCap();
                    }
                  }}
                  inputMode="numeric"
                  placeholder="Es. 20100"
                  className="flex-1 min-w-0 px-4 py-3 rounded-2xl bg-[var(--bg)] border border-[var(--border)] text-[var(--text-main)] font-bold text-base tracking-widest outline-none focus:border-emerald-500/60 transition-colors"
                />
                <button
                  onClick={submitCap}
                  disabled={capInput.length !== 5}
                  className="shrink-0 px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm transition-colors"
                >
                  OK
                </button>
                {capSuggestions.length > 0 && (
                  <div className="absolute z-20 top-full left-0 right-0 mt-1.5 rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] shadow-xl overflow-hidden">
                    {capSuggestions.map(s => (
                      <button
                        key={`${s.n}-${s.p}`}
                        onClick={() => {
                          setCapInput(s.c);
                          setCityInput(`${s.n} (${s.p})`);
                          setCapSuggestions([]);
                          const z = resolveCap(s.c) ?? resolveCity(s.n);
                          if (z) applyZone(z);
                        }}
                        className="w-full flex items-center justify-between gap-2 px-4 py-2.5 text-left hover:bg-emerald-500/10 transition-colors"
                      >
                        <span className="text-sm font-semibold text-[var(--text-main)]">{s.n}</span>
                        <span className="text-[11px] font-bold text-[var(--text-muted)] shrink-0">{s.p} · {s.c}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-[var(--border)]" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">oppure</span>
                <div className="flex-1 h-px bg-[var(--border)]" />
              </div>

              <button
                onClick={useGps}
                disabled={zoneBusy !== null}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm transition-colors"
              >
                {zoneBusy === 'gps' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crosshair className="w-4 h-4" />}
                {zoneBusy === 'gps' ? 'Rilevamento posizione...' : 'Usa la mia posizione'}
              </button>

              {zoneError && (
                <p className="mt-3 text-xs font-semibold text-red-500 text-center">{zoneError}</p>
              )}

              <button
                onClick={() => applyZone(ALL_ITALY_ZONE)}
                className="mt-4 w-full text-center text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
              >
                Mostra tutti i volantini (tutta Italia)
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );

  /* ═══════════════════════════════════════════════════════════════════
     VIEW 1: HOME — Novità Volantini + Lista Catene
     ═══════════════════════════════════════════════════════════════════ */
  function HomeView() {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="px-4 pt-4 pb-8 max-w-2xl mx-auto w-full space-y-6">
        {/* ── Banner zona ── */}
        {zone && zone.kind !== 'all' && (
          <button
            onClick={() => setZoneModalOpen(true)}
            className="w-full flex items-center gap-2.5 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-left transition-colors hover:bg-emerald-500/15"
          >
            <MapPin className="w-4 h-4 text-emerald-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-[var(--text-main)]">
                Volantini per {zone.label}
              </p>
              <p className="text-[10px] text-[var(--text-muted)] font-medium">
                Tocca per cambiare zona
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-emerald-500 shrink-0" />
          </button>
        )}

        {/* ── Novità Volantini ── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-black uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-amber-500" />
              Novità Volantini
            </h2>
            <span className="text-[11px] font-semibold text-[var(--text-muted)]">{novita.length} volantini</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {novita.map(({ c, f }) => (
              <button
                key={f.id}
                onClick={() => openFlyer(f, c.slug)}
                className="group relative overflow-hidden rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] aspect-[3/4] focus:outline-none focus:ring-2 focus:ring-amber-500/40 flex flex-col"
              >
                <div className="flex-1 min-h-0 flex items-center justify-center p-3">
                  <div className="flex items-center justify-center w-full h-full rounded-xl bg-white ring-1 ring-[var(--border)] overflow-hidden">
                    <StoreLogo
                      id={c.logoId ?? c.slug}
                      short={c.name.slice(0, 2)}
                      logo={c.logoId ? logoFor(c.logoId) : undefined}
                      brandSlug={c.slug}
                      size={72}
                    />
                  </div>
                </div>
                <div className="px-2 pb-2.5 pt-1">
                  <span className="block text-[10px] font-extrabold text-[var(--text-main)] text-center truncate">{c.name}</span>
                  {f.subtitle && (
                    <span className="block text-[9px] leading-tight text-[var(--text-muted)] font-medium text-center line-clamp-2 mt-0.5">{f.subtitle}</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* ── Lista Catene ── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-black uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-2">
              <Store className="w-4 h-4 text-emerald-500" />
              Lista Catene
            </h2>
            <span className="text-[11px] font-semibold text-[var(--text-muted)]">{chains.length} insegne</span>
          </div>
          <div className="grid grid-cols-4 gap-2.5">
            {chains.map(c => (
              <button
                key={c.slug}
                onClick={() => openChain(c.slug)}
                className="flex flex-col items-center gap-1.5 p-2.5 rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] hover:border-amber-500/40 hover:bg-amber-500/5 transition-colors"
              >
                <StoreLogo id={c.logoId ?? c.slug} short={c.name.slice(0, 2)} logo={c.logoId ? logoFor(c.logoId) : undefined} size={48} />
                <span className="text-[10px] font-bold text-[var(--text-main)] text-center leading-tight line-clamp-2">{c.name}</span>
              </button>
            ))}
          </div>
        </section>

        {/* ── TuttiPrezzi.it ── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-black uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Più marchi
            </h2>
            <span className="text-[11px] font-semibold text-[var(--text-muted)]">tuttiprezzi.it</span>
          </div>
          <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-1 -mx-4 px-4 mb-3">
            {TP_CATEGORIES.map(c => (
              <button
                key={c.key}
                onClick={() => setTpCat(c.key)}
                className={`shrink-0 px-3.5 py-2 rounded-full text-xs font-bold transition-colors ${
                  tpCat === c.key
                    ? 'bg-amber-500 text-white'
                    : 'bg-[var(--card-bg)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-4 gap-2.5">
            {tpShops.map(s => (
              <button
                key={s.slug}
                onClick={() => openTpShop(s.slug)}
                className="flex flex-col items-center gap-1.5 p-2.5 rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] hover:border-amber-500/40 hover:bg-amber-500/5 transition-colors"
              >
                <div className="w-11 h-11 rounded-xl bg-white ring-1 ring-[var(--border)] flex items-center justify-center overflow-hidden">
                  {TP_BROKEN_LOGOS.has(s.slug) ? (
                    <StoreLogo id={s.slug} short={s.name.slice(0, 2)} brandSlug={s.slug} size={40} />
                  ) : (
                    <img src={tpLogoUrl(s.slug)} alt={s.name} onError={e => { e.currentTarget.style.display = 'none'; }} className="w-9 h-9 object-contain" />
                  )}
                </div>
                <span className="text-[10px] font-bold text-[var(--text-main)] text-center leading-tight line-clamp-2">{s.name}</span>
              </button>
            ))}
          </div>
        </section>
      </motion.div>
    );
  }

  /* ═══════════════════════════════════════════════════════════════════
     VIEW 2: CATENA — volantini dell'insegna
     ═══════════════════════════════════════════════════════════════════ */
  function ChainView() {
    if (!chain) return null;
    const sorted = [...chain.flyers].sort((a, b) => b.id - a.id);
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="px-4 pt-4 pb-8 max-w-2xl mx-auto w-full space-y-4">
        {/* ── Banner catena ── */}
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-[var(--card-bg)] border border-[var(--border)]">
          <StoreLogo id={chain.logoId ?? chain.slug} short={chain.name.slice(0, 2)} logo={chain.logoId ? logoFor(chain.logoId) : undefined} brandSlug={chain.slug} size={64} />
          <div className="flex-1 min-w-0">
            <h2 className="font-black text-[var(--text-main)] text-lg leading-tight">{chain.name}</h2>
            <p className="text-xs text-[var(--text-muted)] font-medium mt-0.5">{chain.flyers.length} volantini disponibili</p>
            {officialUrl && (
              <button onClick={() => openInSystem(officialUrl)} className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-amber-500 hover:text-amber-400 transition-colors">
                <Globe className="w-3.5 h-3.5" /> Sito ufficiale
              </button>
            )}
          </div>
        </div>

        {/* ── Volantini ── */}
        <div className="space-y-2.5">
          {sorted.map(f => {
            const validity = formatValidity(f);
            return (
              <button
                key={f.id}
                onClick={() => openFlyer(f)}
                className="w-full flex items-center gap-3 p-3 rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] hover:border-amber-500/40 hover:bg-amber-500/5 transition-colors text-left"
              >
                <div className="relative w-14 h-[4.2rem] shrink-0 rounded-xl overflow-hidden bg-[var(--bg)] border border-[var(--border)]">
                  {f.coverUrl && !coverFailed(f.id) ? (
                    <img src={f.coverUrl} alt={flyerDisplayTitle(f, chain)} loading="lazy" onError={() => markCoverFailed(f.id)} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <StoreLogo id={chain.logoId ?? chain.slug} short={chain.name.slice(0, 2)} logo={chain.logoId ? logoFor(chain.logoId) : undefined} brandSlug={chain.slug} size={32} />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-[var(--text-main)] truncate">{flyerDisplayTitle(f, chain)}</p>
                  {f.subtitle && <p className="text-xs text-[var(--text-muted)] font-medium truncate mt-0.5">{f.subtitle}</p>}
                  {validity && (
                    <p className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-500 mt-1.5">
                      <CalendarDays className="w-3 h-3" /> {validity}
                    </p>
                  )}
                </div>
                <ChevronRight className="w-5 h-5 text-[var(--text-muted)] shrink-0" />
              </button>
            );
          })}
        </div>
      </motion.div>
    );
  }

  /* ═══════════════════════════════════════════════════════════════════
     VIEW 3: VOLANTINO — viewer Calameo
     ═══════════════════════════════════════════════════════════════════ */
  function FlyerView() {
    if (!activeFlyer || !chain) return null;
    const validity = formatValidity(activeFlyer);
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col h-full max-w-2xl mx-auto w-full">
        {/* ── Copertina ── */}
        <div className="relative h-44 shrink-0 overflow-hidden">
          {activeFlyer.coverUrl && !coverFailed(activeFlyer.id) ? (
            <img src={activeFlyer.coverUrl} alt={flyerDisplayTitle(activeFlyer, chain)} onError={() => markCoverFailed(activeFlyer.id)} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-500/20 via-transparent to-emerald-500/10">
              <StoreLogo id={chain.logoId ?? chain.slug} short={chain.name.slice(0, 2)} logo={chain.logoId ? logoFor(chain.logoId) : undefined} brandSlug={chain.slug} size={72} />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg)] via-transparent to-transparent" />
          <div className="absolute left-4 bottom-3 right-4 flex items-end gap-3">
            <StoreLogo id={chain.logoId ?? chain.slug} short={chain.name.slice(0, 2)} logo={chain.logoId ? logoFor(chain.logoId) : undefined} brandSlug={chain.slug} size={36} />
            <div className="flex-1 min-w-0">
              <p className="font-black text-[var(--text-main)] text-base leading-tight truncate">{flyerDisplayTitle(activeFlyer, chain)}</p>
              <p className="text-[11px] text-[var(--text-muted)] font-semibold truncate">{chain.name}{activeFlyer.subtitle ? ` · ${activeFlyer.subtitle}` : ''}</p>
            </div>
            {validity && (
              <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 rounded-full px-2.5 py-1">
                <CalendarDays className="w-3 h-3" /> {validity}
              </span>
            )}
          </div>
        </div>

        {/* ── Viewer ── */}
        <div className="flex-1 min-h-0 relative">
          {resolving && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10">
              <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
              <p className="text-sm font-semibold text-[var(--text-muted)]">Caricamento volantino...</p>
            </div>
          )}
          {!resolving && viewerUrl && (
            <iframe
              src={viewerUrl}
              title={flyerDisplayTitle(activeFlyer, chain)}
              className="w-full h-full border-0 bg-white"
              allow="fullscreen; autoplay; clipboard-write"
            />
          )}
          {!resolving && !viewerUrl && (
            <div className="h-full flex flex-col items-center justify-center gap-3 px-8 text-center">
              <p className="text-sm font-semibold text-[var(--text-muted)]">Anteprima non disponibile</p>
              <button
                onClick={() => openInSystem(volantinoNodeUrl(activeFlyer.id))}
                className="inline-flex items-center gap-2 px-5 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition-colors"
              >
                <ExternalLink className="w-4 h-4" /> Apri il volantino
              </button>
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  /* ═══════════════════════════════════════════════════════════════════
     VIEW 4: TUTTIPREZZI — volantini di un marchio (immagini pagina)
     ═══════════════════════════════════════════════════════════════════ */
  function TpChainView() {
    if (!tpShop) return null;
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="px-4 pt-4 pb-8 max-w-2xl mx-auto w-full space-y-4">
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-[var(--card-bg)] border border-[var(--border)]">
          <div className="w-16 h-16 rounded-2xl bg-white ring-1 ring-[var(--border)] flex items-center justify-center overflow-hidden shrink-0">
            {TP_BROKEN_LOGOS.has(tpShop.slug) ? (
            <StoreLogo id={tpShop.slug} short={tpShop.name.slice(0, 2)} brandSlug={tpShop.slug} size={56} />
          ) : (
            <img src={tpLogoUrl(tpShop.slug)} alt={tpShop.name} onError={e => { e.currentTarget.style.display = 'none'; }} className="w-12 h-12 object-contain" />
          )}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-black text-[var(--text-main)] text-lg leading-tight">{tpShop.name}</h2>
            <p className="text-xs text-[var(--text-muted)] font-medium mt-0.5">
              {TP_CATEGORIES.find(c => c.key === tpShop.cat)?.label} · {tpShop.flyers.length} volantini
            </p>
          </div>
        </div>

        <div className="space-y-2.5">
          {tpShop.flyers.map((f, i) => (
            <button
              key={`${f.dir}-${f.pages[0] ?? i}`}
              onClick={() => openTpFlyer(tpShop, f)}
              className="w-full flex items-center gap-3 p-3 rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] hover:border-amber-500/40 hover:bg-amber-500/5 transition-colors text-left"
            >
              <div className="relative w-14 h-[4.2rem] shrink-0 rounded-xl overflow-hidden bg-[var(--bg)] border border-[var(--border)]">
                <img
                  src={tpPageUrl(f.dir, f.pages[0] ?? 1)}
                  alt={f.nome || tpShop.name}
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-[var(--text-main)] truncate">{f.nome || `${tpShop.name} — volantino`}</p>
                <p className="text-xs text-[var(--text-muted)] font-medium truncate mt-0.5">{f.pages.length} pagine</p>
              </div>
              <ChevronRight className="w-5 h-5 text-[var(--text-muted)] shrink-0" />
            </button>
          ))}
        </div>
      </motion.div>
    );
  }

  /* ═══════════════════════════════════════════════════════════════════
     VIEW 5: TUTTIPREZZI — viewer immagini con swipe verticale
     ═══════════════════════════════════════════════════════════════════ */
  function TpFlyerView() {
    if (!tpFlyer) return null;
    const { shop, flyer } = tpFlyer;
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col h-full max-w-2xl mx-auto w-full">
        <div className="px-4 py-3 shrink-0 flex items-center gap-3 border-b border-[var(--border)]">
          <div className="w-10 h-10 rounded-xl bg-white ring-1 ring-[var(--border)] flex items-center justify-center overflow-hidden shrink-0">
            {TP_BROKEN_LOGOS.has(shop.slug) ? (
            <StoreLogo id={shop.slug} short={shop.name.slice(0, 2)} brandSlug={shop.slug} size={32} />
          ) : (
            <img src={tpLogoUrl(shop.slug)} alt={shop.name} onError={e => { e.currentTarget.style.display = 'none'; }} className="w-8 h-8 object-contain" />
          )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-[var(--text-main)] text-sm leading-tight truncate">{flyer.nome || shop.name}</p>
            <p className="text-[11px] text-[var(--text-muted)] font-semibold truncate">{shop.name} · {flyer.pages.length} pagine</p>
          </div>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain custom-scrollbar bg-white">
          {flyer.pages.map((p, i) => (
            <div key={`${p}-${i}`} className="w-full flex justify-center">
              <img
                src={tpPageUrl(flyer.dir, p)}
                alt={`${shop.name} pagina ${i + 1}`}
                loading={i === 0 ? 'eager' : 'lazy'}
                onError={e => { e.currentTarget.style.display = 'none'; }}
                className="w-full h-auto block"
              />
            </div>
          ))}
          <p className="py-4 text-center text-xs font-semibold text-[var(--text-muted)]">Fine del volantino</p>
        </div>
      </motion.div>
    );
  }
}
