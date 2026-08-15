import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft, Loader2, MapPin, Crosshair, X, ChevronRight,
  CalendarDays, Store
} from 'lucide-react';
import { VolantinoModule } from '../types';
import { StoreLogo } from './StoreLogo';
import { ALL_ITALY_ZONE, loadZone, resolveCap, resolveCity, resolveGps, saveZone, type VolantiniZone } from '../services/zoneService';
import { searchComuni, comuniByCap, findComune } from '../services/comuniService';
import {
  DC_CATEGORIES, DC_CITY_SLUGS, DC_FLYERS, DC_CITY_FLYERS,
  dcCoverUrl, dcLogoUrl, dcPageUrl,
  type DcFlyer
} from '../data/doveconvieneDb';
import { DC_COMUNE_SLUG, DC_CAPOLUOGO_SLUG } from '../data/dcCityMap';

interface VolantinoScreenProps {
  module: VolantinoModule;
  onClose: () => void;
}

type ViewMode = 'home' | 'flyer';

interface DcCard {
  fid: string;
  dist: number; // metri
  flyer: DcFlyer;
}

const fmtDist = (m: number) => {
  if (m <= 0) return '';
  if (m < 1000) return `${m} m`;
  return `${(m / 1000).toFixed(1).replace('.', ',')} km`;
};

/* ═══ Pinch-to-zoom per le pagine del volantino ═══ */
function PinchZoom({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const st = useRef({ s: 1, x: 0, y: 0 });
  const pinch = useRef<{
    d0: number; m0x: number; m0y: number; s0: number; x0: number; y0: number;
  } | null>(null);
  const drag = useRef<{ x0: number; y0: number; sx: number; sy: number; t0: number } | null>(null);
  const lastTap = useRef<{ t: number; x: number; y: number } | null>(null);

  const apply = (s: number, x: number, y: number) => {
    const el = ref.current;
    if (!el) return;
    st.current = { s, x, y };
    el.style.transform = `translate(${x}px, ${y}px) scale(${s})`;
    el.style.touchAction = s > 1.01 ? 'none' : 'pan-y';
  };

  const maxScale = () => {
    const el = ref.current;
    const img = el?.querySelector('img');
    if (el && img && img.naturalWidth > 0) {
      return Math.min(4, Math.max(2, img.naturalWidth / Math.max(el.clientWidth, 1)));
    }
    return 3;
  };

  const onTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      drag.current = null;
      const [a, b] = [e.touches[0], e.touches[1]];
      pinch.current = {
        d0: Math.max(Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY), 1),
        m0x: (a.clientX + b.clientX) / 2,
        m0y: (a.clientY + b.clientY) / 2,
        s0: st.current.s,
        x0: st.current.x,
        y0: st.current.y,
      };
    } else if (e.touches.length === 1) {
      pinch.current = null;
      drag.current = {
        x0: e.touches[0].clientX,
        y0: e.touches[0].clientY,
        sx: st.current.x,
        sy: st.current.y,
        t0: Date.now(),
      };
    }
  };

  const onTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    const p = pinch.current;
    if (p && e.touches.length === 2) {
      const [a, b] = [e.touches[0], e.touches[1]];
      const d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      const mx = (a.clientX + b.clientX) / 2;
      const my = (a.clientY + b.clientY) / 2;
      let s = p.s0 * (d / p.d0);
      s = Math.min(Math.max(s, 1), maxScale());
      apply(s, p.x0 + (mx - p.m0x), p.y0 + (my - p.m0y));
    } else if (drag.current && e.touches.length === 1 && st.current.s > 1.01) {
      const d = drag.current;
      apply(st.current.s, d.sx + (e.touches[0].clientX - d.x0), d.sy + (e.touches[0].clientY - d.y0));
    }
  };

  const onTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    const wasPinch = pinch.current !== null;
    pinch.current = null;
    const d = drag.current;
    drag.current = null;

    // Tap (tocco breve senza movimento) → doppio tap per zoom/reset
    if (!wasPinch && d && e.changedTouches.length === 1 && Date.now() - d.t0 < 300) {
      const t = e.changedTouches[0];
      const moved = Math.hypot(t.clientX - d.x0, t.clientY - d.y0);
      if (moved < 10) {
        const now = Date.now();
        const last = lastTap.current;
        if (last && now - last.t < 300 && Math.hypot(t.clientX - last.x, t.clientY - last.y) < 40) {
          lastTap.current = null;
          const el = ref.current;
          const rect = el?.getBoundingClientRect();
          if (st.current.s > 1.01) {
            apply(1, 0, 0);
          } else if (el && rect) {
            const cx = t.clientX - rect.left;
            const cy = t.clientY - rect.top;
            const s = Math.min(2.5, maxScale());
            apply(s, rect.width / 2 - cx * s, rect.height / 2 - cy * s);
          }
        } else {
          lastTap.current = { t: now, x: t.clientX, y: t.clientY };
        }
        return;
      }
    }
    lastTap.current = null;
    if (st.current.s <= 1.01) apply(1, 0, 0);
  };

  return (
    <div
      ref={ref}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      className="w-full will-change-transform select-none"
      style={{ touchAction: 'pan-y' }}
    >
      {children}
    </div>
  );
}

/* Slug della città dell'utente (fallback: capoluogo provincia, poi nazionale) */
const dcSlugForZone = (zone: VolantiniZone | null): string => {
  if (!zone || zone.kind === 'all') return '';
  const city = zone.city ?? '';
  if (!city) return '';
  if (DC_COMUNE_SLUG[city]) return DC_COMUNE_SLUG[city];
  const sigla = zone.provincia;
  if (sigla && DC_CAPOLUOGO_SLUG[sigla]) return DC_CAPOLUOGO_SLUG[sigla];
  const comune = findComune(city);
  if (comune) {
    if (DC_COMUNE_SLUG[comune.n]) return DC_COMUNE_SLUG[comune.n];
    if (DC_CAPOLUOGO_SLUG[comune.p]) return DC_CAPOLUOGO_SLUG[comune.p];
  }
  return '';
};

const parseCards = (s: string): DcCard[] => {
  const out: DcCard[] = [];
  for (const part of s.split(',')) {
    if (!part) continue;
    const [fid, dist] = part.split(':');
    const flyer = DC_FLYERS[fid];
    if (!flyer) continue;
    out.push({ fid, dist: parseInt(dist || '0', 10) || 0, flyer });
  }
  return out;
};

export default function VolantinoScreen({ module, onClose }: VolantinoScreenProps) {
  const [view, setView] = useState<ViewMode>('home');
  const [activeFlyer, setActiveFlyer] = useState<{ fid: string; flyer: DcFlyer } | null>(null);

  /* ── Zona dell'utente ── */
  const [zone, setZone] = useState<VolantiniZone | null>(() => loadZone());
  const [zoneModalOpen, setZoneModalOpen] = useState<boolean>(() => !loadZone());
  const [capInput, setCapInput] = useState('');
  const [cityInput, setCityInput] = useState('');
  const [citySuggestions, setCitySuggestions] = useState<ReturnType<typeof searchComuni>>([]);
  const [capSuggestions, setCapSuggestions] = useState<ReturnType<typeof comuniByCap>>([]);
  const [zoneBusy, setZoneBusy] = useState<'gps' | null>(null);
  const [zoneError, setZoneError] = useState<string | null>(null);

  /* ── Categoria selezionata ── */
  const [cat, setCat] = useState<string>('iper-e-super');

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

  /* ── Volantini per la città selezionata ── */
  const dcSlug = useMemo(() => dcSlugForZone(zone), [zone]);

  const cards = useMemo(() => {
    const data = dcSlug && DC_CITY_FLYERS[dcSlug] ? DC_CITY_FLYERS[dcSlug] : DC_CITY_FLYERS['--nazionale--'];
    const list = parseCards(data[cat] ?? '');
    return list.sort((a, b) => a.dist - b.dist || (parseInt(a.fid) - parseInt(b.fid)));
  }, [dcSlug, cat]);

  const cityLabel = useMemo(() => {
    if (dcSlug && DC_CITY_SLUGS[dcSlug]) return DC_CITY_SLUGS[dcSlug];
    return '';
  }, [dcSlug]);

  const catCount = useMemo(() => {
    const data = dcSlug && DC_CITY_FLYERS[dcSlug] ? DC_CITY_FLYERS[dcSlug] : DC_CITY_FLYERS['--nazionale--'];
    let n = 0;
    for (const c of DC_CATEGORIES) n += parseCards(data[c.slug] ?? '').length;
    return n;
  }, [dcSlug]);

  const openFlyer = (card: DcCard) => {
    setActiveFlyer({ fid: card.fid, flyer: card.flyer });
    setView('flyer');
  };

  const goBack = () => {
    if (view === 'flyer') {
      setActiveFlyer(null);
      setView('home');
    } else onClose();
  };

  const headerSubtitle = () => {
    if (view === 'flyer' && activeFlyer) {
      return `${activeFlyer.flyer.n} · ${activeFlyer.flyer.p.length} pagine · scorri per sfogliare`;
    }
    const base = cityLabel ? `${cityLabel} · ${cards.length} volantini` : `${cards.length} volantini · tutta Italia`;
    return `${base} · ${DC_CATEGORIES.find(c => c.slug === cat)?.name ?? ''}`;
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
            {view === 'flyer' && activeFlyer ? (
              <img
                src={dcLogoUrl(activeFlyer.flyer.s)}
                alt={activeFlyer.flyer.n}
                onError={e => { e.currentTarget.style.display = 'none'; }}
                className="w-6 h-6 rounded-md object-contain bg-white ring-1 ring-[var(--border)]"
              />
            ) : (
              <Store className="w-5 h-5 text-emerald-500 shrink-0" />
            )}
            {view === 'flyer' && activeFlyer ? activeFlyer.flyer.n : (module.title || 'Volantini & Offerte')}
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
        </div>
      </header>

      {/* ═══ CONTENT ═══ */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain custom-scrollbar scroll-smooth pb-[max(env(safe-area-inset-bottom),8px)]">
        <AnimatePresence mode="wait">
          {view === 'home' && <HomeView key="home" />}
          {view === 'flyer' && activeFlyer && <FlyerView key={activeFlyer.fid} />}
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
     VIEW 1: HOME — categorie + volantini della città
     ═══════════════════════════════════════════════════════════════════ */
  function HomeView() {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="px-4 pt-4 pb-8 max-w-2xl mx-auto w-full space-y-5">
        {/* ── Banner zona ── */}
        <button
          onClick={() => setZoneModalOpen(true)}
          className="w-full flex items-center gap-2.5 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-left transition-colors hover:bg-emerald-500/15"
        >
          <MapPin className="w-4 h-4 text-emerald-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-[var(--text-main)]">
              {cityLabel ? `Volantini per ${cityLabel}` : zone && zone.kind !== 'all' ? `Volantini per ${zone.label}` : 'Volantini per tutta Italia'}
              {!cityLabel && zone && zone.kind !== 'all' ? ' · nazionali' : ''}
            </p>
            <p className="text-[10px] text-[var(--text-muted)] font-medium">
              {catCount} volantini · tocca per cambiare zona
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-emerald-500 shrink-0" />
        </button>

        {/* ── Categorie ── */}
        <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-1 -mx-4 px-4">
          {DC_CATEGORIES.map(c => (
            <button
              key={c.slug}
              onClick={() => setCat(c.slug)}
              className={`shrink-0 px-3.5 py-2 rounded-full text-xs font-bold transition-colors ${
                cat === c.slug
                  ? 'bg-emerald-500 text-white'
                  : 'bg-[var(--card-bg)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        {/* ── Volantini della categoria ── */}
        {cards.length === 0 ? (
          <div className="py-16 text-center">
            <Store className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-3 opacity-40" />
            <p className="text-sm font-semibold text-[var(--text-muted)]">
              Nessun volantino in questa categoria per {cityLabel || 'la tua zona'}.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {cards.map(c => (
              <button
                key={c.fid}
                onClick={() => openFlyer(c)}
                className="group relative overflow-hidden rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] aspect-[3/4] focus:outline-none focus:ring-2 focus:ring-emerald-500/40 flex flex-col hover:border-emerald-500/40"
              >
                <div className="flex-1 min-h-0 relative bg-white">
                  <img
                    src={dcCoverUrl(c.fid)}
                    alt={c.flyer.n}
                    loading="lazy"
                    onError={e => {
                      e.currentTarget.style.display = 'none';
                      const logo = e.currentTarget.nextElementSibling as HTMLElement | null;
                      if (logo) logo.style.display = 'flex';
                    }}
                    className="w-full h-full object-cover"
                  />
                  <div
                    className="absolute inset-0 items-center justify-center"
                    style={{ display: 'none' }}
                  >
                    <StoreLogo id={c.flyer.s} short={c.flyer.n.slice(0, 2)} brandSlug={c.flyer.s} size={56} />
                  </div>
                  {c.dist > 0 && (
                    <span className="absolute top-1.5 left-1.5 text-[9px] font-bold text-emerald-700 bg-emerald-500/90 rounded-full px-1.5 py-0.5 shadow">
                      {fmtDist(c.dist)}
                    </span>
                  )}
                </div>
                <div className="px-2 pb-2 pt-1.5">
                  <span className="block text-[10px] font-extrabold text-[var(--text-main)] text-center truncate">{c.flyer.n}</span>
                  <span className="block text-[9px] text-[var(--text-muted)] font-medium text-center mt-0.5">
                    {c.flyer.p.length} pagine
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </motion.div>
    );
  }

  /* ═══════════════════════════════════════════════════════════════════
     VIEW 2: VOLANTINO — pagine immagine con swipe verticale
     ═══════════════════════════════════════════════════════════════════ */
  function FlyerView() {
    if (!activeFlyer) return null;
    const { fid, flyer } = activeFlyer;
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col h-full max-w-2xl mx-auto w-full">
        <div className="px-4 py-3 shrink-0 flex items-center gap-3 border-b border-[var(--border)] bg-[var(--card-bg)]">
          <div className="w-10 h-10 rounded-xl bg-white ring-1 ring-[var(--border)] flex items-center justify-center overflow-hidden shrink-0">
            <img
              src={dcLogoUrl(flyer.s)}
              alt={flyer.n}
              onError={e => { e.currentTarget.style.display = 'none'; }}
              className="w-8 h-8 object-contain"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-[var(--text-main)] text-sm leading-tight truncate">{flyer.n}</p>
            <p className="text-[11px] text-[var(--text-muted)] font-semibold truncate">
              {cityLabel || 'Tutta Italia'} · {flyer.p.length} pagine
            </p>
          </div>
          {flyer.p.length > 1 && (
            <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 rounded-full px-2.5 py-1">
              <CalendarDays className="w-3 h-3" /> {flyer.p.length} pagine
            </span>
          )}
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain custom-scrollbar bg-white">
          {flyer.p.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm font-semibold text-[var(--text-muted)]">Anteprima non disponibile</p>
            </div>
          ) : (
            flyer.p.map((_, i) => (
              <PinchZoom key={`${fid}-${i}`}>
                <img
                  src={dcPageUrl(fid, i, 4)}
                  alt={`${flyer.n} pagina ${i + 1}`}
                  loading={i === 0 ? 'eager' : 'lazy'}
                  onError={e => { e.currentTarget.style.display = 'none'; }}
                  className="w-full h-auto block"
                  draggable={false}
                />
              </PinchZoom>
            ))
          )}
          {flyer.p.length > 0 && (
            <p className="py-4 text-center text-xs font-semibold text-[var(--text-muted)]">Fine del volantino</p>
          )}
        </div>
      </motion.div>
    );
  }
}