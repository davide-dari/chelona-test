import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft, Loader2, MapPin, Crosshair, X, ChevronRight,
  CalendarDays, Store, ChevronLeft, BarChart3, Search, Star
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
import { comuniCaps } from '../data/comuniCaps';
import { OFFER_GROUPS, OFFER_DATE, type OfferEntry, type OfferCategory } from '../data/offerStats';
import { initDcData, useDcDataVersion } from '../services/dcData';

interface VolantinoScreenProps {
  module: VolantinoModule;
  onClose: () => void;
  initialOffer?: { fid: string; pg: number };
}

type ViewMode = 'home' | 'flyer' | 'stats';

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
function PinchZoom({ children, onScale }: { children: React.ReactNode; onScale?: (s: number) => void }) {
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
    onScale?.(s);
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
      className="w-full h-full will-change-transform select-none"
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

/* Prezzo unitario normalizzato (€/kg, €/litro o €/pezzo) */
const unitPrice = (e: OfferEntry) => (e.u === 'pz' ? e.p / e.q : e.p / e.q);

const fmtUnit = (u: OfferEntry['u']) => (u === 'kg' ? '€/kg' : u === 'l' ? '€/litro' : '€/pezzo');

const fmtPrice = (n: number) => `${n.toFixed(2).replace('.', ',')} €`;

/* ═══════════════════════════════════════════════════════════════════
   VIEW 1: HOME — categorie + volantini della città
   ═══════════════════════════════════════════════════════════════════ */
function HomeView(props: {
  zone: VolantiniZone | null;
  cityLabel: string;
  catCount: number;
  cat: string;
  onCat: (c: string) => void;
  favCats: Set<string>;
  onToggleFav: (c: string) => void;
  flyerQuery: string;
  onFlyerQuery: (q: string) => void;
  shownCards: DcCard[];
  onOpenFlyer: (c: DcCard) => void;
  onZone: () => void;
  onStats: () => void;
}) {
  const { zone, cityLabel, catCount, cat, onCat, favCats, onToggleFav, flyerQuery, onFlyerQuery, shownCards, onOpenFlyer, onZone, onStats } = props;

  /* Le categorie preferite compaiono per prime, in ordine di preferenza */
  const orderedCats = useMemo(() => {
    const favs = DC_CATEGORIES.filter(c => favCats.has(c.slug));
    const others = DC_CATEGORIES.filter(c => !favCats.has(c.slug));
    return [...favs, ...others];
  }, [favCats]);
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="px-4 pt-4 pb-8 max-w-2xl mx-auto w-full space-y-5">
      {/* ── Banner zona ── */}
      <button
        onClick={onZone}
        className="w-full flex items-center gap-2.5 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-left transition-colors hover:bg-emerald-500/15"
      >
        <MapPin className="w-4 h-4 text-emerald-500 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-[var(--text-main)]">
            {zone && zone.cap ? `Volantini per ${zone.label}` : cityLabel ? `Volantini per ${cityLabel}` : zone && zone.kind !== 'all' ? `Volantini per ${zone.label}` : 'Volantini per tutta Italia'}
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
        <button
          onClick={onStats}
          className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold transition-colors ${
            'bg-amber-500/10 border border-amber-500/25 text-amber-600 hover:bg-amber-500/20'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          Confronta prezzi
        </button>
        {orderedCats.map(c => {
          const isFav = favCats.has(c.slug);
          return (
            <div key={c.slug} className="shrink-0 inline-flex items-center gap-1 rounded-full border transition-colors overflow-hidden ${
              cat === c.slug
                ? 'border-emerald-500 bg-emerald-500'
                : 'border-[var(--border)] bg-[var(--card-bg)]'
            }">
              <button
                onClick={() => onCat(c.slug)}
                className={`pl-3.5 py-2 text-xs font-bold transition-colors ${
                  cat === c.slug ? 'text-white' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                {c.name}
              </button>
              <button
                onClick={() => onToggleFav(c.slug)}
                title={isFav ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti'}
                className={`pr-2 py-2 transition-colors ${
                  cat === c.slug ? 'text-white' : isFav ? 'text-amber-500' : 'text-[var(--text-muted)] opacity-50 hover:opacity-100'
                }`}
              >
                <Star className={`w-3.5 h-3.5 ${isFav ? 'fill-current' : ''}`} />
              </button>
            </div>
          );
        })}
      </div>

      {/* ── Ricerca supermercato ── */}
      <div className="relative">
        <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          value={flyerQuery}
          onChange={e => onFlyerQuery(e.target.value)}
          placeholder="Cerca il volantino di un supermercato (es. Esselunga, Lidl, Trony…)"
          className="w-full pl-11 pr-10 py-3 rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] text-[var(--text-main)] font-semibold text-sm outline-none focus:border-emerald-500/60 transition-colors"
        />
        {flyerQuery && (
          <button
            onClick={() => onFlyerQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
            title="Cancella"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {flyerQuery && (
        <p className="text-[11px] text-[var(--text-muted)] font-medium">
          {shownCards.length === 0
            ? `Nessun volantino per "${flyerQuery}" in ${cityLabel || 'tutta Italia'}`
            : `${shownCards.length} volantini per "${flyerQuery}" (in tutte le categorie)`}
        </p>
      )}

      {/* ── Volantini della categoria ── */}
      {shownCards.length === 0 ? (
        <div className="py-16 text-center">
          <Store className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-3 opacity-40" />
          <p className="text-sm font-semibold text-[var(--text-muted)]">
            {flyerQuery
              ? `Nessun volantino trovato per "${flyerQuery}".`
              : `Nessun volantino in questa categoria per ${cityLabel || 'la tua zona'}.`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {shownCards.map(c => (
            <button
              key={c.fid}
              onClick={() => onOpenFlyer(c)}
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
function FlyerView(props: {
  activeFlyer: { fid: string; flyer: DcFlyer };
  cityLabel: string;
  onFullPage: (i: number) => void;
}) {
  const { fid, flyer } = props.activeFlyer;
  const { cityLabel, onFullPage } = props;
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
            <div key={`${fid}-${i}`} className="w-full relative group">
              <img
                src={dcPageUrl(fid, i, 4)}
                alt={`${flyer.n} pagina ${i + 1}`}
                loading={i === 0 ? 'eager' : 'lazy'}
                onError={e => { e.currentTarget.style.display = 'none'; }}
                className="w-full h-auto block cursor-pointer"
                draggable={false}
                onClick={() => onFullPage(i)}
              />
            </div>
          ))
        )}
        {flyer.p.length > 0 && (
          <p className="py-4 text-center text-xs font-semibold text-[var(--text-muted)]">Fine del volantino</p>
        )}
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   VIEW 4: CONFRONTA PREZZI — statistiche da articolo o marca specifica
   ═══════════════════════════════════════════════════════════════════ */
function StatsView(props: {
  query: string;
  onQuery: (q: string) => void;
  onOfferPage: (fid: string, pg: number) => void;
}) {
  const { query, onQuery, onOfferPage } = props;
  const q = query.trim().toLowerCase();

  /* Confronto completo su tutti i volantini attivi, raggruppati per categoria */
  const groups = useMemo(() => {
    return OFFER_GROUPS.filter(g =>
      !q ||
      g.g.toLowerCase().includes(q) ||
      g.o.some(e => e.n.toLowerCase().includes(q) || e.b.toLowerCase().includes(q))
    );
  }, [q]);

  const categories = useMemo(() => {
    const cats: { id: OfferCategory; label: string; emoji: string; groups: typeof groups }[] = [
      { id: 'alimentari', label: 'Alimentari', emoji: '🛒', groups: [] },
      { id: 'casa', label: 'Casa e cura', emoji: '🧼', groups: [] },
    ];
    for (const g of groups) {
      const cat = cats.find(c => c.id === g.c) ?? cats[0];
      cat.groups.push(g);
    }
    return cats.filter(c => c.groups.length > 0);
  }, [groups]);

  const best = (o: OfferEntry[]) => o.reduce((a, b) => (unitPrice(b) < unitPrice(a) ? b : a), o[0]);
  const avg = (o: OfferEntry[]) => o.reduce((s, e) => s + unitPrice(e), 0) / o.length;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="px-4 pt-4 pb-8 max-w-2xl mx-auto w-full space-y-4">
      {/* ── Ricerca ── */}
      <div className="relative">
        <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          value={query}
          onChange={e => onQuery(e.target.value)}
          placeholder="Cerca un alimento o una marca (es. salmone, tonno, Lavazza…)"
          className="w-full pl-11 pr-10 py-3 rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] text-[var(--text-main)] font-semibold text-sm outline-none focus:border-amber-500/60 transition-colors"
        />
        {query && (
          <button
            onClick={() => onQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
            title="Cancella"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <p className="text-[11px] text-[var(--text-muted)] font-medium">
        {groups.length === OFFER_GROUPS.length
          ? `${OFFER_GROUPS.length} articoli confrontati su tutti i volantini · tocca un prezzo per vederlo nel volantino`
          : `${groups.length} risultati per "${query}"`}
      </p>

      {/* ── Gruppi per categoria ── */}
      {groups.length === 0 ? (
        <div className="py-16 text-center">
          <BarChart3 className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-3 opacity-40" />
          <p className="text-sm font-semibold text-[var(--text-muted)]">
            Nessun articolo trovato per "{query}".
          </p>
          <p className="text-xs text-[var(--text-muted)] font-medium mt-1">Prova con: salmone, tonno, prosciutto, gelato, birra…</p>
        </div>
      ) : (
        categories.map(cat => (
          <section key={cat.id}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-base leading-none">{cat.emoji}</span>
              <h2 className="flex-1 min-w-0 text-xs font-black uppercase tracking-wider text-[var(--text-muted)]">
                {cat.label}
                <span className="ml-1.5 font-bold text-[10px] text-[var(--text-muted)] opacity-70">({cat.groups.length})</span>
              </h2>
              <div className="flex-1 h-px bg-[var(--border)]" />
            </div>
            <div className="space-y-4">
              {cat.groups.map(g => {
                const b = best(g.o);
                const a = avg(g.o);
                return (
                  <div key={g.id} className="rounded-3xl bg-[var(--card-bg)] border border-[var(--border)] overflow-hidden">
                    <div className="flex items-center gap-2 px-4 pt-3.5 pb-2">
                      <span className="text-lg leading-none">{g.e}</span>
                      <h3 className="flex-1 min-w-0 font-black text-[var(--text-main)] text-sm truncate">{g.g}</h3>
                      {g.o.length > 1 && (
                        <span className="shrink-0 text-[10px] font-bold text-amber-600 bg-amber-500/10 rounded-full px-2 py-0.5">
                          {Math.round((1 - unitPrice(b) / a) * 100)}% sotto la media
                        </span>
                      )}
                    </div>
                    <div className="px-2 pb-2 space-y-0.5">
                      {g.o.map((e, i) => {
                        const isBest = g.o.length > 1 && e === b;
                        return (
                          <button
                            key={`${e.s}-${i}`}
                            onClick={() => onOfferPage(e.fid, e.pg)}
                            title="Apri il volantino alla pagina dell'offerta"
                            className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-2xl text-left transition-colors ${
                              isBest
                                ? 'bg-emerald-500/10 ring-1 ring-emerald-500/25 hover:bg-emerald-500/15 active:bg-emerald-500/20'
                                : 'hover:bg-[var(--surface-variant)]/60 active:bg-[var(--surface-variant)]'
                            }`}
                          >
                            <span className={`shrink-0 w-2 h-2 rounded-full ${isBest ? 'bg-emerald-500' : 'bg-[var(--border)]'}`} />
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs font-bold truncate ${isBest ? 'text-emerald-600' : 'text-[var(--text-main)]'}`}>
                                {e.s} {e.b !== e.s ? `· ${e.b}` : ''}
                                {isBest && <span className="ml-1.5 text-[9px] font-black uppercase tracking-wide bg-emerald-500 text-white rounded-full px-1.5 py-0.5 align-middle">Migliore</span>}
                              </p>
                              <p className="text-[10px] text-[var(--text-muted)] font-medium truncate">{e.n}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className={`text-sm font-black ${isBest ? 'text-emerald-600' : 'text-[var(--text-main)]'}`}>{fmtPrice(e.p)}</p>
                              <p className="text-[10px] text-[var(--text-muted)] font-semibold">
                                {unitPrice(e).toFixed(2).replace('.', ',')} {fmtUnit(e.u)}
                              </p>
                            </div>
                            {isBest ? <Store className="w-4 h-4 text-emerald-500 shrink-0" /> : <ChevronRight className="w-4 h-4 text-[var(--text-muted)] shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))
      )}

      <p className="text-[10px] text-[var(--text-muted)] font-medium text-center pt-1">
        Prezzi rilevati dai volantini attivi ({OFFER_DATE}). Possono variare per punto vendita: verifica sempre in negozio.
      </p>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   VIEW 3: PAGINA A TUTTO SCHERMO — zoom (pinch/doppio tap) e swipe
   ═══════════════════════════════════════════════════════════════════ */
function PageViewer(props: {
  activeFlyer: { fid: string; flyer: DcFlyer };
  fullPage: number;
  onFullPage: (n: number | null) => void;
}) {
  const { fid, flyer } = props.activeFlyer;
  const { fullPage, onFullPage } = props;
  const total = Math.max(flyer.p.length, 1);
  const scaleRef = useRef(1);
  const swipeStart = useRef<number | null>(null);

  const setPage = (n: number) => onFullPage(Math.min(Math.max(n, 0), total - 1));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex flex-col bg-black"
      onTouchStart={e => { if (e.touches.length === 1 && scaleRef.current <= 1.01) swipeStart.current = e.touches[0].clientX; else swipeStart.current = null; }}
      onTouchEnd={e => {
        if (swipeStart.current === null) return;
        const dx = e.changedTouches[0].clientX - swipeStart.current;
        swipeStart.current = null;
        if (Math.abs(dx) > 60) setPage(fullPage + (dx < 0 ? 1 : -1));
      }}
    >
      <header className="flex items-center gap-3 pt-[max(env(safe-area-inset-top),16px)] px-4 pb-3 shrink-0 z-30">
        <button
          onClick={() => onFullPage(null)}
          className="p-2.5 -ml-2 hover:bg-white/10 rounded-full text-white transition-colors shrink-0"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex-1 min-w-0 text-center">
          <h1 className="text-base font-black text-white truncate">{flyer.n}</h1>
          <p className="text-[11px] text-white/60 font-semibold">
            Pagina {fullPage + 1} di {total} · pizzica per zoomare
          </p>
        </div>
        <div className="w-9 shrink-0" />
      </header>

      <div className="flex-1 min-h-0 relative flex items-center justify-center overflow-hidden">
        <PinchZoom key={`${fid}-${fullPage}`} onScale={s => { scaleRef.current = s; }}>
          <img
            src={dcPageUrl(fid, fullPage, 4)}
            alt={`${flyer.n} pagina ${fullPage + 1}`}
            className="w-full h-full object-contain select-none"
            draggable={false}
          />
        </PinchZoom>

        {total > 1 && (
          <>
            <button
              onClick={() => setPage(fullPage - 1)}
              disabled={fullPage === 0}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-white/10 text-white hover:bg-white/20 disabled:opacity-30 transition-colors"
              title="Pagina precedente"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={() => setPage(fullPage + 1)}
              disabled={fullPage === total - 1}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-white/10 text-white hover:bg-white/20 disabled:opacity-30 transition-colors"
              title="Pagina successiva"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}
      </div>
    </motion.div>
  );
}

export default function VolantinoScreen({ module, onClose, initialOffer }: VolantinoScreenProps) {
  const [view, setView] = useState<ViewMode>('home');
  const [activeFlyer, setActiveFlyer] = useState<{ fid: string; flyer: DcFlyer } | null>(null);
  const [fullPage, setFullPage] = useState<number | null>(null);

  /* Dati volantini: fallback sul bundle, poi aggiornati dal servizio live */
  const dcVer = useDcDataVersion();
  useEffect(() => { initDcData(); }, []);

  /* Apre direttamente l'offerta richiesta da un altro modulo (es. Lista della Spesa) */
  useEffect(() => {
    if (!initialOffer) return;
    const flyer = DC_FLYERS[initialOffer.fid];
    if (!flyer) return;
    setActiveFlyer({ fid: initialOffer.fid, flyer });
    setView('flyer');
    setFullPage(initialOffer.pg);
    setFromBadge(true);
  }, [initialOffer]);

  /* Il volantino è stato aperto dalla Lista della Spesa: al back si torna alla lista */
  const [fromBadge, setFromBadge] = useState(false);

  /* ── Zona dell'utente ── */
  const [zone, setZone] = useState<VolantiniZone | null>(() => loadZone());
  const [zoneModalOpen, setZoneModalOpen] = useState<boolean>(() => !loadZone());
  const [capInput, setCapInput] = useState('');
  const [cityInput, setCityInput] = useState('');
  const [pickedComune, setPickedComune] = useState<ReturnType<typeof searchComuni>[number] | null>(null);
  const [citySuggestions, setCitySuggestions] = useState<ReturnType<typeof searchComuni>>([]);
  const [capSuggestions, setCapSuggestions] = useState<ReturnType<typeof comuniByCap>>([]);
  const [zoneBusy, setZoneBusy] = useState<'gps' | null>(null);
  const [zoneError, setZoneError] = useState<string | null>(null);

  /* ── Categoria selezionata ── */
  const [cat, setCat] = useState<string>('iper-e-super');

  /* ── Categorie preferite (stella), persistite ── */
  const [favCats, setFavCats] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem('chelona:dc:favCats');
      return new Set(raw ? JSON.parse(raw) : []);
    } catch { return new Set(); }
  });
  const toggleFav = (slug: string) => {
    setFavCats(prev => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug); else next.add(slug);
      try { localStorage.setItem('chelona:dc:favCats', JSON.stringify([...next])); } catch {}
      return next;
    });
  };

  /* ── Ricerca statistiche ── */
  const [statsQuery, setStatsQuery] = useState('');
  const [statsOrigin, setStatsOrigin] = useState(false);

  /* ── Ricerca volantino per supermercato ── */
  const [flyerQuery, setFlyerQuery] = useState('');

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
    setPickedComune(s);
    setCapInput(s.c);
    setCapSuggestions(comuniByCap(s.c));
    const z = resolveCity(s.n);
    if (!z) return;
    setZone({ ...z, cap: undefined });
    setZoneError(null);
    if (comuniCaps(s.n)) {
      saveZone({ ...z, cap: undefined });
    } else {
      applyZone({ ...z, cap: undefined });
    }
  };

  /* Applica una zona con un CAP specifico della città (es. 20121 per Milano) */
  const applySpecificCap = (s: ReturnType<typeof searchComuni>[number], cap: string) => {
    const base = resolveCap(cap);
    if (!base) return;
    applyZone({
      kind: 'cap',
      cap,
      region: base.region,
      city: s.n,
      provincia: s.p,
      label: `${cap} · ${s.n}`,
    });
  };

  /* All'apertura della modal, precompila città/CAP dalla zona salvata */
  useEffect(() => {
    if (!zoneModalOpen) return;
    if (zone && zone.city) {
      const f = findComune(zone.city);
      if (f) {
        setCityInput(`${f.n} (${f.p})`);
        setPickedComune(f);
        setCapInput(zone.cap ?? f.c);
      } else {
        setCityInput(zone.city);
      }
    } else {
      setCityInput('');
      setCapInput('');
      setPickedComune(null);
    }
  }, [zoneModalOpen, zone]);

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
  }, [dcSlug, cat, dcVer]);

  /* Tutti i volantini della città (tutte le categorie) per la ricerca supermercato */
  const allCards = useMemo(() => {
    const data = dcSlug && DC_CITY_FLYERS[dcSlug] ? DC_CITY_FLYERS[dcSlug] : DC_CITY_FLYERS['--nazionale--'];
    const out: DcCard[] = [];
    for (const c of DC_CATEGORIES) out.push(...parseCards(data[c.slug] ?? ''));
    const seen = new Set<string>();
    return out.filter(c => (seen.has(c.fid) ? false : (seen.add(c.fid), true)));
  }, [dcSlug, dcVer]);

  const shownCards = useMemo(() => {
    const q = flyerQuery.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (!q) return cards;
    return allCards.filter(c => c.flyer.n.toLowerCase().includes(q));
  }, [flyerQuery, cards, allCards]);

  const cityLabel = useMemo(() => {
    if (dcSlug && DC_CITY_SLUGS[dcSlug]) return DC_CITY_SLUGS[dcSlug];
    return '';
  }, [dcSlug]);

  const catCount = useMemo(() => {
    const data = dcSlug && DC_CITY_FLYERS[dcSlug] ? DC_CITY_FLYERS[dcSlug] : DC_CITY_FLYERS['--nazionale--'];
    let n = 0;
    for (const c of DC_CATEGORIES) n += parseCards(data[c.slug] ?? '').length;
    return n;
  }, [dcSlug, dcVer]);

  const openFlyer = (card: DcCard) => {
    setActiveFlyer({ fid: card.fid, flyer: card.flyer });
    setFullPage(null);
    setStatsOrigin(false);
    setView('flyer');
  };

  /* Apre il volantino direttamente alla pagina dell'offerta (vista confronto) */
  const openOfferPage = (fid: string, pg: number) => {
    const flyer = DC_FLYERS[fid];
    if (!flyer) return;
    setActiveFlyer({ fid, flyer });
    setView('flyer');
    setFullPage(pg);
    setStatsOrigin(true);
  };

  const goBack = () => {
    if (fullPage !== null) {
      setFullPage(null);
      return;
    }
    if (fromBadge) {
      setFromBadge(false);
      onClose();
      return;
    }
    if (view === 'flyer') {
      setActiveFlyer(null);
      setView(statsOrigin ? 'stats' : 'home');
      setStatsOrigin(false);
    } else if (view === 'stats') {
      setView('home');
    } else onClose();
  };

  // Back hardware Android: chiude un livello alla volta (come le altre sezioni)
  useEffect(() => {
    const onBack = () => goBack();
    window.addEventListener('volantino-back', onBack);
    return () => window.removeEventListener('volantino-back', onBack);
  });

  const headerSubtitle = () => {
    if (view === 'flyer' && activeFlyer) {
      return `${activeFlyer.flyer.n} · ${activeFlyer.flyer.p.length} pagine · tocca una pagina per ingrandire`;
    }
    if (view === 'stats') {
      return `Confronto prezzi · rilevati dai volantini del ${OFFER_DATE}`;
    }
    const base = cityLabel ? `${cityLabel} · ${shownCards.length} volantini` : `${shownCards.length} volantini · tutta Italia`;
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
          {view === 'home' && (
            <HomeView
              key="home"
              zone={zone}
              cityLabel={cityLabel}
              catCount={catCount}
              cat={cat}
              onCat={setCat}
              favCats={favCats}
              onToggleFav={toggleFav}
              flyerQuery={flyerQuery}
              onFlyerQuery={setFlyerQuery}
              shownCards={shownCards}
              onOpenFlyer={openFlyer}
              onZone={() => setZoneModalOpen(true)}
              onStats={() => { setStatsQuery(''); setView('stats'); }}
            />
          )}
          {view === 'flyer' && activeFlyer && (
            <FlyerView key={activeFlyer.fid} activeFlyer={activeFlyer} cityLabel={cityLabel} onFullPage={setFullPage} />
          )}
          {view === 'stats' && (
            <StatsView
              key="stats"
              query={statsQuery}
              onQuery={setStatsQuery}
              onOfferPage={openOfferPage}
            />
          )}
        </AnimatePresence>
      </div>

      {/* ═══ PAGINA A TUTTO SCHERMO ═══ */}
      <AnimatePresence>
        {view === 'flyer' && fullPage !== null && activeFlyer && (
          <PageViewer key={`page-${activeFlyer?.fid}-${fullPage}`} activeFlyer={activeFlyer} fullPage={fullPage} onFullPage={setFullPage} />
        )}
      </AnimatePresence>

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

              {/* ── CAP specifico della città (per le città con più CAP) ── */}
              {pickedComune && comuniCaps(pickedComune.n) && (
                <div className="mb-3">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
                    CAP specifico {pickedComune.n} · {pickedComune.p}
                  </label>
                  <div className="flex gap-1.5 overflow-x-auto custom-scrollbar pb-1 -mx-4 px-4">
                    <button
                      onClick={() => {
                        setCapInput(pickedComune.c);
                        const z = resolveCity(pickedComune.n);
                        if (z) applyZone({ ...z, cap: undefined });
                      }}
                      className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold transition-colors ${
                        zone && zone.city === pickedComune.n && !zone.cap
                          ? 'bg-emerald-500 text-white'
                          : 'bg-[var(--bg)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
                      }`}
                    >
                      Tutta la città
                    </button>
                    {comuniCaps(pickedComune.n)!.map(cap => (
                      <button
                        key={cap}
                        onClick={() => {
                          setCapInput(cap);
                          applySpecificCap(pickedComune, cap);
                        }}
                        className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold tracking-wide transition-colors ${
                          zone && zone.city === pickedComune.n && zone.cap === cap
                            ? 'bg-emerald-500 text-white'
                            : 'bg-[var(--bg)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
                        }`}
                      >
                        {cap}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-[var(--text-muted)] font-medium mt-1">
                    {zone && zone.city === pickedComune.n && zone.cap
                      ? `Volantini per ${zone.cap} · ${pickedComune.n}`
                      : `Volantini per tutta ${pickedComune.n}`}
                  </p>
                </div>
              )}

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
                        setPickedComune(s);
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
                          setPickedComune(s);
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
}

