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
  ALL_ITALY_ZONE, flyerMatchesZone, loadZone, resolveCap, resolveGps, saveZone,
  type VolantiniZone
} from '../services/zoneService';

interface VolantinoScreenProps {
  module: VolantinoModule;
  onClose: () => void;
}

type ViewMode = 'home' | 'chain' | 'flyer';

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
  const [zoneBusy, setZoneBusy] = useState<'gps' | null>(null);
  const [zoneError, setZoneError] = useState<string | null>(null);

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
    return module.title || 'Volantini & Offerte';
  };

  const headerSubtitle = () => {
    if (view === 'flyer' && activeFlyer) return formatValidity(activeFlyer) ?? 'Sfoglia il volantino';
    if (view === 'chain' && chain) return `${chain.flyers.length} volantini disponibili`;
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
                Inserisci il CAP o usa la tua posizione per mostrare i volantini della tua zona.
              </p>

              <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
                Codice di avviamento postale
              </label>
              <div className="flex gap-2">
                <input
                  value={capInput}
                  onChange={e => setCapInput(e.target.value.replace(/\D/g, '').slice(0, 5))}
                  onKeyDown={e => { if (e.key === 'Enter') submitCap(); }}
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
}
