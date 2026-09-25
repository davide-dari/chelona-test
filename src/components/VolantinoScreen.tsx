import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  Store, Search, X, ChevronLeft, BarChart3, ExternalLink, CalendarDays, 
  Star, Sparkles, MapPin, Navigation, Clock, AlertTriangle, RefreshCw, CheckCircle2 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { StoreLogo } from './StoreLogo';
import { VOLANTINI_DB, type VolantiniDb, type VolantinoChain, type VolantinoFlyer } from '../data/volantiniDb';
import { OFFER_GROUPS, OFFER_DATE, FIDELITY_CARDS, type OfferEntry, type OfferCategory } from '../data/offerStats';
import { loadZone, saveZone, resolveCap, type VolantiniZone } from '../services/zoneService';
import { 
  getLiveVolantiniDb, syncVolantiniRemote, formatUpdateDate, 
  getFlyerExpiryInfo, type FlyerExpiryInfo 
} from '../services/volantiniSync';
import { VolantinoModule } from '../types';

interface VolantinoScreenProps {
  module: VolantinoModule;
  onClose: () => void;
  initialOffer?: { fid: string; pg: number };
}

type ViewMode = 'centro' | 'chain' | 'stats' | 'calameo';

function fmtPrice(n: number) {
  return n.toFixed(2).replace('.', ',') + ' €';
}

function unitPrice(e: OfferEntry) {
  return e.p / e.q;
}

function fmtUnit(u: string) {
  if (u === 'kg') return 'al kg';
  if (u === 'l') return 'al litro';
  if (u === 'pz') return 'al pezzo';
  return '';
}

// ── Categorie Stile Doveconviene con Gruppo GROS e In Scadenza ──
export const DC_INDEX_CATEGORIES = [
  { slug: 'all', name: 'Tutti', icon: '🛒' },
  { slug: 'fav', name: 'Preferiti', icon: '⭐' },
  { slug: 'expiring', name: 'In scadenza', icon: '⏳' },
  { slug: 'gros', name: 'Gruppo GROS', icon: '🏛️' },
  { slug: 'iper-e-super', name: 'Iper e Super', icon: '🏪' },
  { slug: 'discount', name: 'Discount', icon: '🏷️' },
  { slug: 'elettronica', name: 'Elettronica', icon: '📱' },
  { slug: 'cura-casa-e-corpo', name: 'Cura casa e corpo', icon: '🧼' },
  { slug: 'bricolage', name: 'Bricolage', icon: '🔨' },
  { slug: 'arredamento', name: 'Arredamento', icon: '🛋️' },
] as const;

// ── Mappatura Catene → Categoria Doveconviene ──
const CHAIN_CATEGORY_MAP: Record<string, string> = {
  // Gruppo GROS (Roma e Lazio)
  'pewex': 'gros',
  'pim': 'gros',
  'dem': 'gros',
  'il-castoro': 'gros',
  'ipertriscount': 'gros',
  'ipercarni': 'gros',
  'cts': 'gros',
  'top': 'gros',
  'effepiu': 'gros',
  'sir': 'gros',
  'sacoph': 'gros',
  'idromarket': 'gros',
  'ma': 'gros',
  'gros': 'gros',

  // Iper e Super
  'conad': 'iper-e-super',
  'coop': 'iper-e-super',
  'ipercoop': 'iper-e-super',
  'esselunga': 'iper-e-super',
  'carrefour': 'iper-e-super',
  'pam': 'iper-e-super',
  'panorama': 'iper-e-super',
  'despar': 'iper-e-super',
  'bennet': 'iper-e-super',
  'famila': 'iper-e-super',
  'il-gigante': 'iper-e-super',
  'iper-la-grande-i': 'iper-e-super',
  'iperal': 'iper-e-super',
  'basko': 'iper-e-super',
  'tigros': 'iper-e-super',
  'ali-supermercati': 'iper-e-super',
  'migross': 'iper-e-super',
  'unes': 'iper-e-super',
  'oasi': 'iper-e-super',
  'tigre': 'iper-e-super',
  'coal': 'iper-e-super',
  'italmark': 'iper-e-super',
  'deco': 'iper-e-super',
  'crai': 'iper-e-super',
  'cc': 'iper-e-super',
  'pan-iperpan-e-superpan': 'iper-e-super',
  'emisfero-ipermercati': 'iper-e-super',
  'aeo': 'iper-e-super',
  'metro': 'iper-e-super',
  'naturasi': 'iper-e-super',
  'picard': 'iper-e-super',

  // Discount
  'lidl': 'discount',
  'eurospin': 'discount',
  'md-discount': 'discount',
  'aldi': 'discount',
  'penny-market': 'discount',
  'todis': 'discount',
  'ins': 'discount',
  'dpiu': 'discount',
  'prix': 'discount',
  'hardis': 'discount',

  // Elettronica
  'mediaworld-italia': 'elettronica',
  'unieuro': 'elettronica',
  'euronics': 'elettronica',
  'expert-italia': 'elettronica',
  'trony': 'elettronica',
  'comet': 'elettronica',

  // Cura casa e corpo
  'acqua-e-sapone': 'cura-casa-e-corpo',
  'tigota': 'cura-casa-e-corpo',
  'risparmiocasa': 'cura-casa-e-corpo',
  'magazzini-maurys': 'cura-casa-e-corpo',

  // Bricolage
  'leroy-merlin': 'bricolage',
  'tecnomat': 'bricolage',
  'bricofer': 'bricolage',
  'brico-io': 'bricolage',

  // Arredamento
  'mondo-convenienza': 'arredamento',
};

// Mappa nomi insegna (da confronto prezzi) → slug (volantiniDb)
const STORE_SLUG_MAP: Record<string, string> = {
  'Pewex': 'pewex',
  'Pim': 'pim',
  'Dem': 'dem',
  'Il Castoro': 'il-castoro',
  'Ipertriscount': 'ipertriscount',
  'Ipercarni': 'ipercarni',
  'CTS': 'cts',
  'Top': 'top',
  'Effepiù': 'effepiu',
  'Sir': 'sir',
  'Sacoph': 'sacoph',
  'Idromarket': 'idromarket',
  'MA': 'ma',
  'Gros': 'gros',
  'Crai': 'crai',
  'Decò': 'deco',
  'Esselunga': 'esselunga',
  'Eurospin': 'eurospin',
  'Interspar': 'despar',
  'Despar': 'despar',
  'Lidl': 'lidl',
  'MD': 'md-discount',
  'Pam': 'pam',
  'Todis': 'todis',
  'Conad': 'conad',
  'Coop': 'coop',
  'Ipercoop': 'ipercoop',
  'Aldi': 'aldi',
  'Carrefour': 'carrefour',
  'Penny': 'penny-market',
  'Bennet': 'bennet',
  'Famila': 'famila',
  'Il Gigante': 'il-gigante',
  'Iperal': 'iperal',
  'Tigros': 'tigros',
  'Basko': 'basko',
  'Migross': 'migross',
  'Alì': 'ali-supermercati',
  'Unes': 'unes',
  'Acqua e Sapone': 'acqua-e-sapone',
  'Acqua & Sapone': 'acqua-e-sapone',
  'Tigotà': 'tigota',
  'Risparmio Casa': 'risparmiocasa',
  'NaturaSì': 'naturasi',
  'In\'s': 'ins',
  'Dpiù': 'dpiu',
  'Oasi': 'oasi',
  'Tigre': 'tigre',
  'Coal': 'coal',
  'Italmark': 'italmark',
  'Prix': 'prix',
  'Metro': 'metro',
};

// Helper URL volantino: apre direttamente il reader completo Calaméo (esattamente il link del tasto in alto a destra)
const getFlyerUrl = (f: VolantinoFlyer) => {
  if (f.directUrl) return f.directUrl;
  return `https://www.calameo.com/read/${f.bkcode}${f.authid ? `?authid=${f.authid}` : ''}`;
};

// URL per apertura nel browser esterno
const getBrowserUrl = (f: VolantinoFlyer) => {
  return getFlyerUrl(f);
};

/* ═══════════════════════════════════════════════════════════════════
   CAP MODAL: Selezione CAP e Geolocalizzazione
   ═══════════════════════════════════════════════════════════════════ */
function CapModal(props: {
  isOpen: boolean;
  currentZone: VolantiniZone | null;
  onSave: (z: VolantiniZone) => void;
  onClose: () => void;
}) {
  const { isOpen, currentZone, onSave, onClose } = props;
  const [capInput, setCapInput] = useState(currentZone?.cap || '');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSave = (capVal: string) => {
    const res = resolveCap(capVal);
    if (res) {
      setError('');
      onSave(res);
      onClose();
    } else {
      setError('CAP non valido. Inserisci un CAP italiano di 5 cifre.');
    }
  };

  const QUICK_CAPS = [
    { city: 'Roma', cap: '00100' },
    { city: 'Milano', cap: '20100' },
    { city: 'Napoli', cap: '80100' },
    { city: 'Torino', cap: '10100' },
    { city: 'Firenze', cap: '50100' },
    { city: 'Bologna', cap: '40100' },
    { city: 'Palermo', cap: '90100' },
    { city: 'Bari', cap: '70100' },
  ];

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-3xl bg-[var(--card-bg)] border border-[var(--border)] p-6 space-y-4 shadow-xl">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-[var(--text-main)]">Imposta il tuo CAP</h2>
              <p className="text-[11px] text-[var(--text-muted)] font-medium">Trova i supermercati e i volantini vicini</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-full text-[var(--text-muted)] hover:text-[var(--text-main)]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div>
          <label className="text-xs font-bold text-[var(--text-muted)] block mb-1.5">Inserisci il tuo CAP (5 cifre):</label>
          <div className="flex gap-2">
            <input
              type="text"
              maxLength={5}
              value={capInput}
              onChange={(e) => {
                setCapInput(e.target.value.replace(/\D/g, ''));
                setError('');
              }}
              placeholder="es. 00100"
              className="flex-1 px-4 py-2.5 rounded-xl bg-[var(--surface-variant)] border border-[var(--border)] font-bold text-sm text-[var(--text-main)] outline-none focus:border-emerald-500/60"
            />
            <button
              onClick={() => handleSave(capInput)}
              className="px-4 py-2.5 rounded-xl bg-emerald-500 text-white font-bold text-xs hover:bg-emerald-600 active:scale-95 transition-all"
            >
              Conferma
            </button>
          </div>
          {error && <p className="text-[11px] text-red-500 font-semibold mt-1.5">{error}</p>}
        </div>

        <div>
          <p className="text-[11px] font-bold text-[var(--text-muted)] mb-2">Città veloci:</p>
          <div className="grid grid-cols-4 gap-1.5">
            {QUICK_CAPS.map(q => (
              <button
                key={q.cap}
                onClick={() => {
                  setCapInput(q.cap);
                  handleSave(q.cap);
                }}
                className={`py-1.5 px-2 rounded-xl text-[11px] font-bold border transition-colors ${
                  capInput === q.cap
                    ? 'bg-emerald-500 text-white border-emerald-500'
                    : 'bg-[var(--surface-variant)] border-[var(--border)] text-[var(--text-main)] hover:border-emerald-500/50'
                }`}
              >
                {q.city}
              </button>
            ))}
          </div>
        </div>

        <div className="pt-2 border-t border-[var(--border)]">
          <button
            onClick={() => {
              const q = encodeURIComponent(`supermercati vicino a ${currentZone?.city || (capInput ? `CAP ${capInput}` : 'me')}`);
              window.open(`https://www.google.com/maps/search/${q}`, '_blank');
            }}
            className="w-full py-2.5 rounded-xl bg-blue-500/10 border border-blue-500/25 text-blue-600 font-bold text-xs flex items-center justify-center gap-2 hover:bg-blue-500/15 transition-colors"
          >
            <Navigation className="w-4 h-4" />
            Cerca supermercati su Google Maps
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   CENTRO VIEW: Indice Categorie + Volantini + Integrazione Google Maps
   ═══════════════════════════════════════════════════════════════════ */
function CentroView(props: {
  db: VolantiniDb;
  onChain: (slug: string) => void;
  onStats: (favOnly?: boolean) => void;
  onBack: () => void;
  favorites: string[];
  onToggleFavorite: (slug: string) => void;
  zone: VolantiniZone | null;
  onOpenCapModal: () => void;
  isSyncing: boolean;
  onSync: () => void;
  syncFeedback: string | null;
}) {
  const { 
    db, onChain, onStats, onBack, favorites, onToggleFavorite, 
    zone, onOpenCapModal, isSyncing, onSync, syncFeedback 
  } = props;
  const [query, setQuery] = useState('');
  const [activeCat, setActiveCat] = useState<string>('all');
  const q = query.trim().toLowerCase();

  const allChains = useMemo(() => {
    return db.chains.filter(c => c.flyers.length > 0);
  }, [db]);

  const favChains = useMemo(() => {
    return allChains.filter(c => favorites.includes(c.slug));
  }, [allChains, favorites]);

  // Catene con volantini in scadenza (oggi, domani o entro 3 giorni)
  const expiringChains = useMemo(() => {
    return allChains.filter(c =>
      c.flyers.some(f => {
        const info = getFlyerExpiryInfo(f);
        return info.status === 'today' || info.status === 'tomorrow' || info.status === 'soon';
      })
    );
  }, [allChains]);

  const totalFlyersCount = useMemo(() => {
    return allChains.reduce((sum, c) => sum + c.flyers.length, 0);
  }, [allChains]);

  // Conteggio per ogni categoria
  const catCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: allChains.length,
      fav: favorites.length,
      expiring: expiringChains.length,
    };
    for (const c of allChains) {
      const cat = CHAIN_CATEGORY_MAP[c.slug] || 'iper-e-super';
      counts[cat] = (counts[cat] || 0) + 1;
    }
    return counts;
  }, [allChains, favorites.length, expiringChains.length]);

  // Filtro catene per categoria selezionata e barra di ricerca
  const chains = useMemo(() => {
    let list = allChains;
    if (activeCat === 'fav') {
      list = favChains;
    } else if (activeCat === 'expiring') {
      list = expiringChains;
    } else if (activeCat !== 'all') {
      list = allChains.filter(c => (CHAIN_CATEGORY_MAP[c.slug] || 'iper-e-super') === activeCat);
    }
    if (!q) return list;
    return list.filter(c => {
      const catSlug = CHAIN_CATEGORY_MAP[c.slug] || '';
      return (
        c.name.toLowerCase().includes(q) ||
        c.slug.includes(q) ||
        catSlug.includes(q)
      );
    });
  }, [activeCat, favChains, expiringChains, allChains, q]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="px-4 pt-4 pb-8 max-w-2xl mx-auto w-full space-y-4">
      {/* ── Top Bar con Azioni ── */}
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={onBack}
          className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold bg-[var(--card-bg)] border border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--surface-variant)] transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Esci
        </button>

        <button
          onClick={() => onStats(false)}
          className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold bg-amber-500/10 border border-amber-500/25 text-amber-600 hover:bg-amber-500/20 transition-colors"
        >
          <BarChart3 className="w-3.5 h-3.5" />
          Confronta prezzi
        </button>
      </div>

      {/* ── BARRA CAP E GOOGLE MAPS ── */}
      <div className="flex items-center justify-between gap-2 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/25">
        <button
          onClick={onOpenCapModal}
          className="flex items-center gap-2.5 min-w-0 text-left hover:opacity-80 transition-opacity"
        >
          <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-bold text-[var(--text-main)] truncate">
              {zone ? zone.label : 'Nessun CAP impostato'}
            </p>
            <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold">
              {zone ? 'Tocca per cambiare CAP o zona' : 'Tocca qui per inserire il tuo CAP'}
            </p>
          </div>
        </button>

        <button
          onClick={() => {
            const loc = zone?.city || (zone?.cap ? `CAP ${zone.cap}` : 'me');
            const q = encodeURIComponent(`supermercati vicino a ${loc}`);
            window.open(`https://www.google.com/maps/search/${q}`, '_blank');
          }}
          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-800 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-bold text-xs hover:bg-emerald-500/10 transition-colors shadow-xs"
          title="Cerca supermercati vicini su Google Maps"
        >
          <Navigation className="w-3.5 h-3.5 text-emerald-600" />
          Google Maps
        </button>
      </div>

      {/* ── BARRA STATO CATALOGO & DATA AGGIORNAMENTO + SYNC ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 p-3 rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] shadow-xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-bold text-[var(--text-main)] truncate">
              Volantini aggiornati al {formatUpdateDate(db.updatedAt)}
            </p>
            <p className="text-[10px] text-[var(--text-muted)] font-medium truncate">
              {allChains.length} catene attive · {totalFlyersCount} volantini ufficiali
            </p>
          </div>
        </div>

        <button
          onClick={onSync}
          disabled={isSyncing}
          className="shrink-0 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--surface-variant)] hover:bg-[var(--border)] text-[var(--text-main)] text-xs font-bold transition-all disabled:opacity-50"
          title="Verifica se ci sono nuovi volantini online"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-emerald-600 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>{isSyncing ? 'Verifica in corso…' : 'Aggiorna'}</span>
        </button>
      </div>

      {syncFeedback && (
        <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{syncFeedback}</span>
        </div>
      )}

      {/* ── AVVISO VOLANTINI IN SCADENZA (Se presenti e non siamo già nella scheda) ── */}
      {expiringChains.length > 0 && activeCat !== 'expiring' && (
        <div
          onClick={() => setActiveCat('expiring')}
          className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-transparent border border-amber-500/30 flex items-center justify-between gap-3 cursor-pointer hover:border-amber-500 transition-all shadow-xs"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-600 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 animate-pulse" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-[var(--text-main)] truncate">
                ⚠️ {expiringChains.length} catene con offerte in scadenza!
              </p>
              <p className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold truncate">
                Volantini che terminano oggi o nei prossimi giorni. Tocca per vederli
              </p>
            </div>
          </div>
          <span className="shrink-0 text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
            Vedi tutti →
          </span>
        </div>
      )}

      {/* ── Barra di Ricerca ── */}
      <div className="relative">
        <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Cerca supermercato, Gruppo Gros o marca…"
          className="w-full pl-11 pr-10 py-3 rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] text-[var(--text-main)] font-semibold text-sm outline-none focus:border-emerald-500/60 transition-colors"
        />
        {query && (
          <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* ── INDICE CATEGORIE STILE DOVECONVIENE (Scroll Orizzontale) ── */}
      <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-1 -mx-4 px-4 pt-1">
        {DC_INDEX_CATEGORIES.map(cat => {
          const isActive = activeCat === cat.slug;
          const count = catCounts[cat.slug] || 0;
          return (
            <button
              key={cat.slug}
              onClick={() => setActiveCat(cat.slug)}
              className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold transition-all ${
                isActive
                  ? cat.slug === 'fav'
                    ? 'bg-amber-500 text-white shadow-sm'
                    : cat.slug === 'expiring'
                      ? 'bg-orange-500 text-white shadow-sm'
                      : 'bg-emerald-500 text-white shadow-sm'
                  : 'bg-[var(--card-bg)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--surface-variant)]'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.name}</span>
              {count > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                  isActive ? 'bg-black/20 text-white' : 'bg-[var(--surface-variant)] text-[var(--text-muted)]'
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── SEZIONE PREFERITI IN PRIMO PIANO (Se in vista "Tutti" e ci sono preferiti) ── */}
      {activeCat === 'all' && !query && favChains.length > 0 && (
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 fill-current" />
              I tuoi Supermercati Preferiti ({favChains.length})
            </h2>
            <button
              onClick={() => setActiveCat('fav')}
              className="text-[11px] font-bold text-[var(--text-muted)] hover:text-[var(--text-main)]"
            >
              Vedi solo questi →
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {favChains.map(c => {
              const activeFlyers = c.flyers.filter(f => !f.to || new Date(f.to) >= new Date());
              const primaryFlyer = (activeFlyers.length ? activeFlyers : c.flyers)[0];
              const expiry = getFlyerExpiryInfo(primaryFlyer);
              const isExpiringSoon = expiry.status === 'today' || expiry.status === 'tomorrow' || expiry.status === 'soon';

              return (
                <div
                  key={`fav-${c.slug}`}
                  onClick={() => onChain(c.slug)}
                  className="relative flex flex-col items-center gap-2 p-3.5 rounded-2xl bg-[var(--card-bg)] border-2 border-amber-500/30 hover:border-amber-500 hover:bg-[var(--surface-variant)] active:scale-[0.97] transition-all cursor-pointer shadow-sm"
                >
                  {/* Badge Scadenza se vicino */}
                  {isExpiringSoon && (
                    <div className="absolute top-2 left-2 z-10">
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold border backdrop-blur-md shadow-xs ${expiry.badgeBg} ${expiry.textColor} ${expiry.borderColor}`}>
                        {expiry.iconType === 'alert' ? <AlertTriangle className="w-2.5 h-2.5" /> : <Clock className="w-2.5 h-2.5" />}
                        <span>{expiry.shortLabel}</span>
                      </span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(c.slug);
                    }}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-amber-500/15 text-amber-500 hover:bg-amber-500/30 transition-all z-10"
                    title="Rimuovi dai preferiti"
                  >
                    <Star className="w-3.5 h-3.5 fill-amber-500" />
                  </button>
                  <div className="w-12 h-12 rounded-xl bg-white ring-1 ring-[var(--border)] flex items-center justify-center overflow-hidden mt-1">
                    <StoreLogo id={c.slug} short={c.name.slice(0, 2)} brandSlug={c.slug.replace('md-discount', 'md').replace('-italia', '').replace('iper-', '').replace('-market', '')} size={40} />
                  </div>
                  <p className="text-xs font-bold text-[var(--text-main)] text-center w-full truncate">{c.name}</p>
                  <p className={`text-[10px] font-semibold text-center truncate w-full ${isExpiringSoon ? expiry.textColor : 'text-amber-600'}`}>
                    {isExpiringSoon ? expiry.label : `${c.flyers.length} volantini`}
                  </p>
                </div>
              );
            })}
          </div>

          {/* ── CARD CONFRONTA PREZZI SUI PREFERITI ── */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/25 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 flex items-center justify-center shrink-0">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-black text-[var(--text-main)]">Confronta prezzi tra i tuoi preferiti</p>
                <p className="text-[11px] text-[var(--text-muted)] font-medium">
                  Scopri chi vende al prezzo più basso tra {favChains.slice(0, 3).map(c => c.name).join(', ')}{favChains.length > 3 ? ` e altri ${favChains.length - 3}` : ''}!
                </p>
              </div>
            </div>
            <button
              onClick={() => onStats(true)}
              className="w-full sm:w-auto shrink-0 px-4 py-2 rounded-xl bg-amber-500 text-white font-bold text-xs hover:bg-amber-600 active:scale-95 transition-all shadow-sm flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Confronta subito
            </button>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <h2 className="text-xs font-black uppercase tracking-wider text-[var(--text-muted)]">
              Tutti i Supermercati e Negozi ({allChains.length})
            </h2>
            <div className="flex-1 h-px bg-[var(--border)]" />
          </div>
        </div>
      )}

      {/* ── SE NESSUN PREFERITO E IN TAB PREFERITI ── */}
      {activeCat === 'fav' && favChains.length === 0 && (
        <div className="p-6 rounded-3xl bg-[var(--card-bg)] border border-[var(--border)] text-center space-y-3">
          <Star className="w-10 h-10 text-amber-500 mx-auto opacity-50" />
          <p className="text-sm font-bold text-[var(--text-main)]">Non hai ancora aggiunto negozi ai preferiti</p>
          <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
            Tocca la stella ⭐ su qualunque catena per aggiungerla ai tuoi preferiti e visualizzarla subito qui!
          </p>
          <button
            onClick={() => setActiveCat('all')}
            className="px-4 py-2 rounded-xl bg-emerald-500 text-white text-xs font-bold"
          >
            Sfoglia tutti i negozi
          </button>
        </div>
      )}

      {/* ── SE NESSUN VOLANTINO IN SCADENZA E IN TAB IN SCADENZA ── */}
      {activeCat === 'expiring' && expiringChains.length === 0 && (
        <div className="p-6 rounded-3xl bg-[var(--card-bg)] border border-[var(--border)] text-center space-y-3">
          <Clock className="w-10 h-10 text-emerald-500 mx-auto opacity-50" />
          <p className="text-sm font-bold text-[var(--text-main)]">Nessuna offerta in scadenza immediata</p>
          <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
            Tutti i volantini attivi sono validi ancora per diversi giorni!
          </p>
          <button
            onClick={() => setActiveCat('all')}
            className="px-4 py-2 rounded-xl bg-emerald-500 text-white text-xs font-bold"
          >
            Torna a tutti i volantini
          </button>
        </div>
      )}

      {/* ── ELENCO CATENE FILTRATO ── */}
      {chains.length === 0 ? (
        activeCat !== 'fav' && activeCat !== 'expiring' && (
          <div className="py-16 text-center">
            <Store className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-3 opacity-40" />
            <p className="text-sm font-semibold text-[var(--text-muted)]">
              Nessun negozio trovato per "{query}".
            </p>
          </div>
        )
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {chains.map(c => {
            const isFav = favorites.includes(c.slug);
            const activeFlyers = c.flyers.filter(f => !f.to || new Date(f.to) >= new Date());
            const primaryFlyer = (activeFlyers.length ? activeFlyers : c.flyers)[0];
            const expiry = getFlyerExpiryInfo(primaryFlyer);
            const isExpiringSoon = expiry.status === 'today' || expiry.status === 'tomorrow' || expiry.status === 'soon';

            return (
              <div
                key={c.slug}
                onClick={() => onChain(c.slug)}
                className={`relative flex flex-col items-center gap-2 p-3.5 rounded-2xl bg-[var(--card-bg)] border transition-all cursor-pointer active:scale-[0.97] ${
                  isFav
                    ? 'border-amber-500/40 bg-amber-500/[0.02] shadow-sm'
                    : isExpiringSoon
                      ? 'border-orange-500/40 hover:border-orange-500 hover:bg-[var(--surface-variant)]'
                      : 'border-[var(--border)] hover:border-emerald-500/40 hover:bg-[var(--surface-variant)]'
                }`}
              >
                {/* Badge Scadenza rapido a video */}
                {isExpiringSoon && (
                  <div className="absolute top-2 left-2 z-10">
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold border backdrop-blur-md shadow-xs ${expiry.badgeBg} ${expiry.textColor} ${expiry.borderColor}`}>
                      {expiry.iconType === 'alert' ? <AlertTriangle className="w-2.5 h-2.5" /> : <Clock className="w-2.5 h-2.5" />}
                      <span>{expiry.shortLabel}</span>
                    </span>
                  </div>
                )}

                {/* Stella Preferiti rapida con stopPropagation */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite(c.slug);
                  }}
                  className={`absolute top-2 right-2 p-1.5 rounded-full transition-all z-10 ${
                    isFav
                      ? 'bg-amber-500/20 text-amber-500 hover:bg-amber-500/30'
                      : 'bg-black/5 dark:bg-white/5 text-[var(--text-muted)] hover:text-amber-500 hover:bg-amber-500/10'
                  }`}
                  title={isFav ? "Rimuovi dai preferiti" : "Aggiungi ai preferiti"}
                >
                  <Star className={`w-3.5 h-3.5 ${isFav ? 'fill-amber-500' : ''}`} />
                </button>

                {/* Tasto Google Maps rapido per la catena */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const loc = zone?.city || (zone?.cap ? `CAP ${zone.cap}` : 'me');
                    const q = encodeURIComponent(`${c.name} supermercato ${loc}`);
                    window.open(`https://www.google.com/maps/search/${q}`, '_blank');
                  }}
                  className="absolute bottom-2 right-2 p-1.5 rounded-full bg-black/5 dark:bg-white/5 text-[var(--text-muted)] hover:text-emerald-600 hover:bg-emerald-500/10 transition-all z-10"
                  title={`Trova ${c.name} su Google Maps`}
                >
                  <MapPin className="w-3.5 h-3.5" />
                </button>

                <div className="w-12 h-12 rounded-xl bg-white ring-1 ring-[var(--border)] flex items-center justify-center overflow-hidden mt-1">
                  <StoreLogo id={c.slug} short={c.name.slice(0, 2)} brandSlug={c.slug.replace('md-discount', 'md').replace('-italia', '').replace('iper-', '').replace('-market', '')} size={40} />
                </div>
                <p className="text-xs font-bold text-[var(--text-main)] text-center w-full truncate">{c.name}</p>
                <p className={`text-[10px] font-semibold text-center truncate w-full ${isExpiringSoon ? expiry.textColor : 'text-[var(--text-muted)]'}`}>
                  {isExpiringSoon ? expiry.label : `${c.flyers.length} volantini`}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   CHAIN VIEW: Volantini di una singola catena
   ═══════════════════════════════════════════════════════════════════ */
function CentroChainView(props: {
  chain: VolantinoChain;
  onOpen: (f: VolantinoFlyer) => void;
  onBack: () => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  zone: VolantiniZone | null;
}) {
  const { chain, onOpen, onBack, isFavorite, onToggleFavorite, zone } = props;
  const active = chain.flyers.filter(f => !f.to || new Date(f.to) >= new Date());
  const list = active.length ? active : chain.flyers;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="px-4 pt-4 pb-8 max-w-2xl mx-auto w-full space-y-4">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors">
        <ChevronLeft className="w-4 h-4" /> Tutte le catene
      </button>

      <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-[var(--card-bg)] border border-[var(--border)]">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-12 h-12 rounded-xl bg-white ring-1 ring-[var(--border)] flex items-center justify-center overflow-hidden shrink-0">
            <StoreLogo id={chain.slug} short={chain.name.slice(0, 2)} brandSlug={chain.slug.replace('md-discount', 'md').replace('-italia', '').replace('iper-', '').replace('-market', '')} size={40} />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-black text-[var(--text-main)] truncate">{chain.name}</h2>
            <p className="text-[11px] text-[var(--text-muted)] font-medium">{list.length} volantin{list.length === 1 ? 'o' : 'i'}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => {
              const loc = zone?.city || (zone?.cap ? `CAP ${zone.cap}` : 'me');
              const q = encodeURIComponent(`${chain.name} supermercato ${loc}`);
              window.open(`https://www.google.com/maps/search/${q}`, '_blank');
            }}
            className="p-2 rounded-full bg-[var(--surface-variant)] text-[var(--text-muted)] hover:text-emerald-500 transition-colors"
            title="Trova negozio su Google Maps"
          >
            <MapPin className="w-4 h-4" />
          </button>

          <button
            onClick={onToggleFavorite}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
              isFavorite
                ? 'bg-amber-500/15 text-amber-600 border border-amber-500/30'
                : 'bg-[var(--surface-variant)] text-[var(--text-muted)] hover:text-amber-500'
            }`}
          >
            <Star className={`w-3.5 h-3.5 ${isFavorite ? 'fill-amber-500' : ''}`} />
            {isFavorite ? 'Preferito' : 'Salva'}
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {list.map(f => {
          const expiry = getFlyerExpiryInfo(f);
          return (
            <button
              key={f.id}
              onClick={() => onOpen(f)}
              className="w-full flex items-center gap-3 p-3 rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] hover:border-emerald-500/40 hover:bg-[var(--surface-variant)] active:scale-[0.99] transition-all text-left"
            >
              {f.coverUrl && (
                <img src={f.coverUrl} alt={f.title} loading="lazy" onError={e => { e.currentTarget.style.display = 'none'; }} className="w-14 h-20 object-cover rounded-lg bg-white ring-1 ring-[var(--border)] shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-[var(--text-main)] truncate">{f.title}</p>
                {f.subtitle && <p className="text-[11px] text-[var(--text-muted)] truncate mt-0.5">{f.subtitle}</p>}
                
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${expiry.badgeBg} ${expiry.textColor} ${expiry.borderColor}`}>
                    {expiry.iconType === 'alert' ? <AlertTriangle className="w-2.5 h-2.5" /> : <Clock className="w-2.5 h-2.5" />}
                    <span>{expiry.label}</span>
                  </span>
                  {(f.from || f.to) && (
                    <span className="text-[10px] text-[var(--text-muted)] font-medium">
                      {f.from ? new Date(f.from).toLocaleDateString('it-IT') : '…'} → {f.to ? new Date(f.to).toLocaleDateString('it-IT') : '…'}
                    </span>
                  )}
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   STATS VIEW: Confronto Prezzi (con filtro Preferiti)
   ═══════════════════════════════════════════════════════════════════ */
function StatsView(props: {
  db: VolantiniDb;
  query: string;
  onQuery: (q: string) => void;
  onOpenFlyer: (storeName: string) => void;
  favorites: string[];
  initialFilterFavorites?: boolean;
}) {
  const { db, query, onQuery, onOpenFlyer, favorites, initialFilterFavorites = false } = props;
  const [onlyFavorites, setOnlyFavorites] = useState(initialFilterFavorites || (favorites.length > 0));
  const q = query.trim().toLowerCase();

  // Set di slug preferiti
  const favSlugSet = useMemo(() => new Set(favorites), [favorites]);

  // Funzione per capire se un'insegna è tra i preferiti dell'utente
  const isStoreFav = useCallback((storeName: string) => {
    const slug = STORE_SLUG_MAP[storeName]?.toLowerCase();
    if (slug && favSlugSet.has(slug)) return true;
    const lower = storeName.toLowerCase();
    return favorites.some(f => f.toLowerCase() === lower || lower.includes(f.toLowerCase()));
  }, [favSlugSet, favorites]);

  const groups = useMemo(() => {
    return OFFER_GROUPS.map(g => {
      // Se filtro preferiti attivo, tieni solo le offerte dei negozi preferiti
      const offers = onlyFavorites && favorites.length > 0
        ? g.o.filter(e => isStoreFav(e.s))
        : g.o;
      return { ...g, o: offers };
    }).filter(g => {
      if (g.o.length === 0) return false;
      if (!q) return true;
      return g.g.toLowerCase().includes(q) || g.o.some(e => e.n.toLowerCase().includes(q) || e.b.toLowerCase().includes(q));
    });
  }, [q, onlyFavorites, favorites.length, isStoreFav]);

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

      {/* ── Filtro Preferiti ── */}
      {favorites.length > 0 && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => setOnlyFavorites(true)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
              onlyFavorites
                ? 'bg-amber-500 text-white shadow-sm'
                : 'bg-[var(--card-bg)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            <Star className="w-3.5 h-3.5 fill-current" />
            I tuoi preferiti ({favorites.length})
          </button>
          <button
            onClick={() => setOnlyFavorites(false)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
              !onlyFavorites
                ? 'bg-amber-500 text-white shadow-sm'
                : 'bg-[var(--card-bg)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            Tutti i negozi
          </button>
        </div>
      )}

      <p className="text-[11px] text-[var(--text-muted)] font-medium">
        {onlyFavorites && favorites.length > 0
          ? `${groups.length} prodotti confrontati tra i tuoi supermercati preferiti`
          : `${groups.length} prodotti confrontati sui volantini nazionali`}
      </p>

      {groups.length === 0 ? (
        <div className="py-16 text-center space-y-3">
          <BarChart3 className="w-10 h-10 text-[var(--text-muted)] mx-auto opacity-40" />
          <p className="text-sm font-semibold text-[var(--text-muted)]">
            {onlyFavorites && favorites.length > 0
              ? 'Nessun prodotto trovato tra i tuoi preferiti.'
              : `Nessun articolo trovato per "${query}".`}
          </p>
          {onlyFavorites && favorites.length > 0 && (
            <button
              onClick={() => setOnlyFavorites(false)}
              className="px-4 py-2 rounded-xl bg-amber-500 text-white font-bold text-xs"
            >
              Vedi offerte di tutte le catene
            </button>
          )}
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
                        const isFav = isStoreFav(e.s);
                        const hasFlyer = !!(STORE_SLUG_MAP[e.s] && db.chains.find(c => c.slug === STORE_SLUG_MAP[e.s])?.flyers.length);
                        return (
                          <button
                            key={`${e.s}-${i}`}
                            onClick={() => hasFlyer && onOpenFlyer(e.s)}
                            title={hasFlyer ? `Apri volantino ${e.s}` : undefined}
                            className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-2xl text-left transition-colors ${
                              isBest
                                ? 'bg-emerald-500/10 ring-1 ring-emerald-500/25 active:bg-emerald-500/20'
                                : isFav
                                  ? 'bg-amber-500/5 ring-1 ring-amber-500/20 hover:bg-amber-500/10'
                                  : hasFlyer ? 'hover:bg-[var(--surface-variant)] active:bg-[var(--surface-variant)]' : 'bg-transparent'
                            }`}
                          >
                            <span className={`shrink-0 w-2 h-2 rounded-full ${isBest ? 'bg-emerald-500' : isFav ? 'bg-amber-500' : 'bg-[var(--border)]'}`} />
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs font-bold truncate flex items-center gap-1.5 ${isBest ? 'text-emerald-600' : 'text-[var(--text-main)]'}`}>
                                <span>{e.s} {e.b !== e.s ? `· ${e.b}` : ''}</span>
                                {isFav && (
                                  <span className="text-[9px] font-bold text-amber-600 bg-amber-500/15 rounded-full px-1.5 py-0.2">
                                    ★ Preferito
                                  </span>
                                )}
                                {FIDELITY_CARDS[e.s] && (
                                  <span className={`text-[9px] font-bold rounded-full px-1.5 py-0.5 ${isBest ? 'bg-emerald-500/15 text-emerald-700' : 'bg-[var(--surface-variant)] text-[var(--text-muted)]'}`}>
                                    {FIDELITY_CARDS[e.s]}
                                  </span>
                                )}
                                {isBest && <span className="text-[9px] font-black uppercase tracking-wide bg-emerald-500 text-white rounded-full px-1.5 py-0.5">Migliore</span>}
                              </p>
                              <p className="text-[10px] text-[var(--text-muted)] font-medium truncate">{e.n}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className={`text-sm font-black ${isBest ? 'text-emerald-600' : 'text-[var(--text-main)]'}`}>{fmtPrice(e.p)}</p>
                              <p className="text-[10px] text-[var(--text-muted)] font-semibold">
                                {unitPrice(e).toFixed(2).replace('.', ',')} {fmtUnit(e.u)}
                              </p>
                            </div>
                            {isBest
                              ? <Store className="w-4 h-4 shrink-0 text-emerald-500" />
                              : hasFlyer
                                ? <ExternalLink className="w-3.5 h-3.5 shrink-0 text-emerald-500 opacity-60" />
                                : <Store className="w-4 h-4 shrink-0 text-[var(--text-muted)]" />
                            }
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
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN SCREEN COMPONENT
   ═══════════════════════════════════════════════════════════════════ */
export default function VolantinoScreen({ module, onClose, initialOffer }: VolantinoScreenProps) {
  const [view, setView] = useState<ViewMode>('centro');
  const [centroChain, setCentroChain] = useState<VolantinoChain | null>(null);
  const [calameoFlyer, setCalameoFlyer] = useState<VolantinoFlyer | null>(null);
  const [statsQuery, setStatsQuery] = useState('');
  const [statsFavOnly, setStatsFavOnly] = useState(false);

  // Database sincronizzato (cache locale o bundled)
  const [db, setDb] = useState<VolantiniDb>(getLiveVolantiniDb);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const [dismissExpiryAlert, setDismissExpiryAlert] = useState(false);

  // Reset alert di scadenza quando cambia volantino
  useEffect(() => {
    setDismissExpiryAlert(false);
  }, [calameoFlyer]);

  // Ascolta aggiornamenti del database da eventi globali
  useEffect(() => {
    const handleUpdated = (e: any) => {
      if (e.detail?.chains) setDb(e.detail);
    };
    window.addEventListener('chelona_volantini_updated', handleUpdated);
    return () => window.removeEventListener('chelona_volantini_updated', handleUpdated);
  }, []);

  // Gestione sincronizzazione manuale con il server remoto
  const handleSync = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    const res = await syncVolantiniRemote();
    setIsSyncing(false);
    if (res.updated) {
      setDb(res.db);
    }
    setSyncFeedback(res.message);
    setTimeout(() => setSyncFeedback(null), 4500);
  };

  // Zona / CAP dell'utente
  const [zone, setZone] = useState<VolantiniZone | null>(() => loadZone());
  const [showCapModal, setShowCapModal] = useState<boolean>(() => !loadZone());

  // Preferiti salvati in localStorage
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('chelona_fav_chains');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const toggleFavorite = useCallback((slug: string) => {
    setFavorites(prev => {
      const next = prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug];
      try {
        localStorage.setItem('chelona_fav_chains', JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const handleSaveZone = useCallback((newZone: VolantiniZone) => {
    setZone(newZone);
    saveZone(newZone);
  }, []);

  const goBack = useCallback(() => {
    if (view === 'calameo') {
      setCalameoFlyer(null);
      const active = centroChain?.flyers.filter(f => !f.to || new Date(f.to) >= new Date()) || [];
      const list = active.length ? active : (centroChain?.flyers || []);
      if (list.length <= 1) {
        setCentroChain(null);
        setView('centro');
      } else {
        setView('chain');
      }
    } else if (view === 'chain') {
      setCentroChain(null);
      setView('centro');
    } else if (view === 'stats') {
      setView('centro');
    } else {
      onClose();
    }
  }, [view, centroChain, onClose]);

  // Ascolta il tasto back di Android (gestito da App.tsx → dispatch 'volantino-back')
  useEffect(() => {
    const handler = () => goBack();
    window.addEventListener('volantino-back', handler);
    return () => window.removeEventListener('volantino-back', handler);
  }, [goBack]);

  // Apri il volantino di una catena a partire dal nome negozio (es. "Lidl")
  const onOpenFlyer = useCallback((storeName: string) => {
    const slug = STORE_SLUG_MAP[storeName];
    if (!slug) return;
    const chain = db.chains.find(c => c.slug === slug);
    if (!chain || chain.flyers.length === 0) return;
    const active = chain.flyers.filter(f => !f.to || new Date(f.to) >= new Date());
    const flyer = (active.length ? active : chain.flyers)[0];
    setCentroChain(chain);
    setCalameoFlyer(flyer);
    setView('calameo');
  }, [db]);

  const headerSubtitle = () => {
    if (view === 'calameo' && calameoFlyer) {
      const expiry = getFlyerExpiryInfo(calameoFlyer);
      return `${expiry.label} · ${calameoFlyer.subtitle || 'Volantino Digitale'}`;
    }
    if (view === 'chain' && centroChain) {
      return `${centroChain.flyers.length} volantini`;
    }
    if (view === 'stats') {
      return `Confronto prezzi · rilevati dai volantini del ${OFFER_DATE}`;
    }
    return `${db.chains.length} catene disponibili · ${zone ? zone.label : 'Tutta Italia'}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed inset-0 z-[150] flex flex-col h-[100dvh] w-full bg-[var(--bg)] overflow-hidden"
    >
      <header className="flex items-center gap-3 pt-[max(env(safe-area-inset-top),16px)] px-4 pb-3 bg-[var(--card-bg)] border-b border-[var(--border)] shrink-0 z-30">
        <button
          onClick={goBack}
          className="p-2.5 -ml-2 hover:bg-[var(--surface-variant)] rounded-full text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors shrink-0"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="flex-1 min-w-0 text-center">
          <h1 className="text-base font-black text-[var(--text-main)] flex items-center justify-center gap-2">
            {view === 'calameo' && calameoFlyer ? (
              <span className="truncate">{calameoFlyer.title}</span>
            ) : view === 'chain' && centroChain ? (
              <>
                <span className="w-6 h-6 rounded-md bg-white ring-1 ring-[var(--border)] flex items-center justify-center overflow-hidden shrink-0">
                  <StoreLogo id={centroChain.slug} short={centroChain.name.slice(0, 2)} brandSlug={centroChain.slug.replace('md-discount', 'md').replace('-italia', '').replace('iper-', '').replace('-market', '')} size={20} />
                </span>
                <span className="truncate">{centroChain.name}</span>
              </>
            ) : (
              <>
                <Store className="w-5 h-5 text-emerald-500 shrink-0" />
                <span className="truncate">{module.title || 'Volantini & Offerte'}</span>
              </>
            )}
          </h1>
          <p className="text-[11px] text-[var(--text-muted)] font-medium truncate">{headerSubtitle()}</p>
        </div>
        
        {view === 'calameo' && calameoFlyer ? (
          <div className="flex items-center gap-1 shrink-0">
            {centroChain && (
              <>
                <button
                  onClick={() => {
                    const loc = zone?.city || (zone?.cap ? `CAP ${zone.cap}` : 'me');
                    const q = encodeURIComponent(`${centroChain.name} supermercato ${loc}`);
                    window.open(`https://www.google.com/maps/search/${q}`, '_blank');
                  }}
                  className="p-2.5 rounded-full hover:bg-[var(--surface-variant)] text-[var(--text-muted)] hover:text-emerald-500 transition-colors"
                  title="Trova negozio su Google Maps"
                >
                  <MapPin className="w-5 h-5" />
                </button>
                <button
                  onClick={() => toggleFavorite(centroChain.slug)}
                  className={`p-2.5 rounded-full hover:bg-[var(--surface-variant)] transition-colors ${
                    favorites.includes(centroChain.slug) ? 'text-amber-500' : 'text-[var(--text-muted)] hover:text-amber-500'
                  }`}
                  title={favorites.includes(centroChain.slug) ? "Rimuovi dai preferiti" : "Aggiungi ai preferiti"}
                >
                  <Star className={`w-5 h-5 ${favorites.includes(centroChain.slug) ? 'fill-amber-500' : ''}`} />
                </button>
              </>
            )}
            <button
              onClick={() => window.open(getBrowserUrl(calameoFlyer), '_blank')}
              className="p-2.5 -mr-2 hover:bg-[var(--surface-variant)] rounded-full text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
              title="Apri nel browser esterno"
            >
              <ExternalLink className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <div className="w-9 shrink-0" />
        )}
      </header>

      {view !== 'calameo' ? (
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain custom-scrollbar scroll-smooth pb-[max(env(safe-area-inset-bottom),8px)]">
          <AnimatePresence mode="wait">
            {view === 'centro' && (
              <CentroView
                key="centro"
                db={db}
                onChain={(slug) => { 
                  const c = db.chains.find(x => x.slug === slug); 
                  if (c) { 
                    setCentroChain(c); 
                    const active = c.flyers.filter(f => !f.to || new Date(f.to) >= new Date());
                    const list = active.length ? active : c.flyers;
                    if (list.length > 0) {
                      setCalameoFlyer(list[0]);
                      setView('calameo');
                    } else {
                      setView('chain'); 
                    }
                  } 
                }}
                onStats={(favOnly) => {
                  setStatsFavOnly(!!favOnly);
                  setStatsQuery('');
                  setView('stats');
                }}
                onBack={onClose}
                favorites={favorites}
                onToggleFavorite={toggleFavorite}
                zone={zone}
                onOpenCapModal={() => setShowCapModal(true)}
                isSyncing={isSyncing}
                onSync={handleSync}
                syncFeedback={syncFeedback}
              />
            )}
            {view === 'chain' && centroChain && (
              <CentroChainView
                key={`chain-${centroChain.slug}`}
                chain={centroChain}
                onOpen={(f) => { setCalameoFlyer(f); setView('calameo'); }}
                onBack={() => setView('centro')}
                isFavorite={favorites.includes(centroChain.slug)}
                onToggleFavorite={() => toggleFavorite(centroChain.slug)}
                zone={zone}
              />
            )}
            {view === 'stats' && (
              <StatsView
                key="stats"
                db={db}
                query={statsQuery}
                onQuery={setStatsQuery}
                onOpenFlyer={onOpenFlyer}
                favorites={favorites}
                initialFilterFavorites={statsFavOnly}
              />
            )}
          </AnimatePresence>
        </div>
      ) : calameoFlyer ? (
        <div className="flex-1 min-h-0 flex flex-col relative bg-[var(--bg)]">
          {/* ── AVVISO DI SCADENZA A VIDEO NEL LETTORE VOLANTINO ── */}
          {!dismissExpiryAlert && (() => {
            const expiry = getFlyerExpiryInfo(calameoFlyer);
            if (expiry.status === 'today' || expiry.status === 'tomorrow' || expiry.status === 'soon') {
              return (
                <div className={`px-4 py-2 flex items-center justify-between text-xs border-b shrink-0 transition-all ${expiry.badgeBg} ${expiry.textColor} ${expiry.borderColor}`}>
                  <div className="flex items-center gap-2 min-w-0">
                    {expiry.iconType === 'alert' ? (
                      <AlertTriangle className="w-4 h-4 shrink-0 animate-bounce" />
                    ) : (
                      <Clock className="w-4 h-4 shrink-0 animate-pulse" />
                    )}
                    <p className="min-w-0 truncate">
                      <span className="font-black uppercase tracking-wide mr-1.5 px-2 py-0.5 rounded-full bg-black/10 dark:bg-white/10">
                        {expiry.status === 'today' ? 'Scade Oggi' : expiry.status === 'tomorrow' ? 'Scade Domani' : `Scade tra ${expiry.daysLeft} gg`}
                      </span>
                      <span className="font-semibold">{calameoFlyer.title}</span>
                      {calameoFlyer.to && (
                        <span className="opacity-80 ml-1 hidden sm:inline">· Offerte valide fino al {new Date(calameoFlyer.to).toLocaleDateString('it-IT')}</span>
                      )}
                    </p>
                  </div>
                  <button
                    onClick={() => setDismissExpiryAlert(true)}
                    className="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 shrink-0 ml-2"
                    title="Chiudi avviso"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              );
            }
            return null;
          })()}

          <div className="flex-1 min-h-0 relative">
            <iframe
              key={`flyer-frame-${calameoFlyer.id}-${calameoFlyer.bkcode || ''}`}
              src={getFlyerUrl(calameoFlyer)}
              title={calameoFlyer.title}
              className="w-full h-full border-0"
              allow="fullscreen"
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-popups-to-escape-sandbox"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      ) : null}

      {/* Modal di richiesta / cambio CAP */}
      <CapModal
        isOpen={showCapModal}
        currentZone={zone}
        onSave={handleSaveZone}
        onClose={() => setShowCapModal(false)}
      />
    </motion.div>
  );
}
