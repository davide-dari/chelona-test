import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft, RefreshCw, Globe, ExternalLink, Loader2, CalendarDays,
  ChevronRight, Store, Sparkles, BookOpen
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { VolantinoModule } from '../types';
import { logoFor } from '../data/supermarketLogos';
import { StoreLogo } from './StoreLogo';
import { supermarketById } from '../data/italianSupermarkets';
import type { VolantiniDb, VolantinoChain, VolantinoFlyer } from '../data/volantiniDb';
import {
  getVolantiniDb, refreshVolantini, ensureBkcode,
  volantinoViewerUrl, volantinoNodeUrl, formatValidity
} from '../services/centrovolantini';

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

  const coverFailed = (id: number) => failedCovers.has(id);
  const markCoverFailed = (id: number) =>
    setFailedCovers(prev => (prev.has(id) ? prev : new Set(prev).add(id)));

  const chains = useMemo(() => db.chains.filter(c => c.flyers.length > 0), [db]);
  const chain = chainSlug ? chains.find(c => c.slug === chainSlug) : undefined;

  /* Novità: tutti i volantini ordinati dal più recente (node id desc) */
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
    return `${chains.length} catene · ${novita.length} volantini${updated ? ` · agg. ${updated}` : ''}`;
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
              <StoreLogo id={chain.logoId ?? chain.slug} short={chain.name.slice(0, 2)} logo={chain.logoId ? logoFor(chain.logoId) : undefined} size={24} />
            ) : view === 'flyer' && chain ? (
              <StoreLogo id={chain.logoId ?? chain.slug} short={chain.name.slice(0, 2)} logo={chain.logoId ? logoFor(chain.logoId) : undefined} size={24} />
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
    </motion.div>
  );

  /* ═══════════════════════════════════════════════════════════════════
     VIEW 1: HOME — Novità Volantini + Lista Catene
     ═══════════════════════════════════════════════════════════════════ */
  function HomeView() {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="px-4 pt-4 pb-8 max-w-2xl mx-auto w-full space-y-6">
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
                className="group relative overflow-hidden rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] aspect-[3/4] focus:outline-none focus:ring-2 focus:ring-amber-500/40"
              >
                {f.coverUrl && !coverFailed(f.id) ? (
                  <img
                    src={f.coverUrl}
                    alt={flyerDisplayTitle(f, c)}
                    loading="lazy"
                    onError={() => markCoverFailed(f.id)}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-amber-500/15 via-transparent to-emerald-500/10">
                    <StoreLogo id={c.logoId ?? c.slug} short={c.name.slice(0, 2)} logo={c.logoId ? logoFor(c.logoId) : undefined} size={56} />
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 p-2 pt-8 bg-gradient-to-t from-black/75 via-black/35 to-transparent">
                  <div className="flex items-center gap-1.5 mb-1">
                    <StoreLogo id={c.logoId ?? c.slug} short={c.name.slice(0, 2)} logo={c.logoId ? logoFor(c.logoId) : undefined} size={16} />
                    <span className="text-[10px] font-extrabold text-white truncate">{c.name}</span>
                  </div>
                  {f.subtitle && (
                    <p className="text-[9px] leading-tight text-white/85 font-medium line-clamp-2">{f.subtitle}</p>
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
          <StoreLogo id={chain.logoId ?? chain.slug} short={chain.name.slice(0, 2)} logo={chain.logoId ? logoFor(chain.logoId) : undefined} size={64} />
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
                      <StoreLogo id={chain.logoId ?? chain.slug} short={chain.name.slice(0, 2)} logo={chain.logoId ? logoFor(chain.logoId) : undefined} size={32} />
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
              <StoreLogo id={chain.logoId ?? chain.slug} short={chain.name.slice(0, 2)} logo={chain.logoId ? logoFor(chain.logoId) : undefined} size={72} />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg)] via-transparent to-transparent" />
          <div className="absolute left-4 bottom-3 right-4 flex items-end gap-3">
            <StoreLogo id={chain.logoId ?? chain.slug} short={chain.name.slice(0, 2)} logo={chain.logoId ? logoFor(chain.logoId) : undefined} size={36} />
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
