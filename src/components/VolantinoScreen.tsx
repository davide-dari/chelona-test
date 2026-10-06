import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { 
  ArrowLeft, Search, X, ChevronLeft, BarChart3, ExternalLink, 
  Star, Sparkles, MapPin, Clock, AlertTriangle, RefreshCw, CheckCircle2,
  Plus, Check, BookOpen, Store
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { StoreLogo } from './StoreLogo';
import { VOLANTINI_DB, type VolantiniDb, type VolantinoChain, type VolantinoFlyer } from '../data/volantiniDb';
import { OFFER_GROUPS, OFFER_DATE, FIDELITY_CARDS, STORE_SLUG_MAP, type OfferEntry, type OfferCategory } from '../data/offerStats';
import { loadZone, saveZone, resolveCap, type VolantiniZone } from '../services/zoneService';
import { nearbySupermarketService } from '../services/nearbySupermarketService';
import { 
  getLiveVolantiniDb, syncVolantiniRemote, formatUpdateDate, 
  getFlyerExpiryInfo, getFlyerUrl, getBrowserUrl 
} from '../services/volantiniSync';
import { detectSupermarketCategory } from '../services/mathLanguageEngine';
import { VolantinoModule } from '../types';

interface VolantinoScreenProps {
  module: VolantinoModule;
  onClose: () => void;
  initialOffer?: { fid: string; pg: number; store?: string };
  initialChain?: string;
  onAddToShoppingList?: (items: { name: string; quantity?: string; category?: string }[]) => void;
}

type TabType = 'volantini' | 'offerte';

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

function cleanTitle(title: string): string {
  if (!title) return '';
  return title
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

function openExternalUrl(url: string) {
  if (!url) return;
  try {
    if (typeof window !== 'undefined') {
      window.open(url, '_system');
    }
  } catch {
    try {
      window.open(url, '_blank');
    } catch {}
  }
}

// ── Categorie filtri veloci ──
export const DC_INDEX_CATEGORIES = [
  { slug: 'all', name: 'Tutti', icon: '🛒' },
  { slug: 'fav', name: 'Preferiti', icon: '⭐' },
  { slug: 'nearby', name: 'Vicini a te', icon: '📍' },
  { slug: 'expiring', name: 'In scadenza', icon: '⏳' },
  { slug: 'iper-e-super', name: 'Supermercati', icon: '🏪' },
  { slug: 'discount', name: 'Discount', icon: '🏷️' },
  { slug: 'gros', name: 'Gruppo GROS', icon: '🏛️' },
  { slug: 'cura-casa-e-corpo', name: 'Casa & Cura', icon: '🧼' },
  { slug: 'elettronica', name: 'Elettronica', icon: '📱' },
] as const;

// ── Mappatura Catene → Categoria ──
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
  'leroy-merlin': 'cura-casa-e-corpo',
  'tecnomat': 'cura-casa-e-corpo',
  'bricofer': 'cura-casa-e-corpo',
  'brico-io': 'cura-casa-e-corpo',
  'mondo-convenienza': 'cura-casa-e-corpo',
};

// Re-export getFlyerUrl e getBrowserUrl centralizzati e conformi agli standard Calaméo
export { getFlyerUrl, getBrowserUrl } from '../services/volantiniSync';

/* ═══════════════════════════════════════════════════════════════════
   CAP MODAL: Selezione CAP non invasiva
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
      setError('CAP non valido. Inserisci 5 cifre.');
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
    <div className="fixed inset-0 z-[220] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-sm rounded-3xl bg-[var(--card-bg)] border border-[var(--border)] p-6 space-y-4 shadow-2xl">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-[var(--text-main)]">Imposta il tuo CAP</h2>
              <p className="text-[11px] text-[var(--text-muted)] font-medium">Trova supermercati e volantini vicini a te</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-full text-[var(--text-muted)] hover:text-[var(--text-main)]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div>
          <label className="text-xs font-bold text-[var(--text-muted)] block mb-1.5">CAP di 5 cifre:</label>
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
              className="flex-1 px-4 py-2.5 rounded-xl bg-[var(--surface-variant)] border border-[var(--border)] font-bold text-sm text-[var(--text-main)] outline-none focus:border-emerald-500"
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
          <p className="text-[11px] font-bold text-[var(--text-muted)] mb-2">Città principali:</p>
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
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   RESILIENT FLYER COVER (Multi-CDN resolution with branding fallback)
   ═══════════════════════════════════════════════════════════════════ */
interface FlyerCardCoverProps {
  flyer: VolantinoFlyer;
  chain: VolantinoChain;
}

function FlyerCardCover({ flyer, chain }: FlyerCardCoverProps) {
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [allFailed, setAllFailed] = useState(false);

  // Reset resolution state whenever flyer changes
  useEffect(() => {
    setCandidateIndex(0);
    setAllFailed(false);
  }, [flyer.id, flyer.coverUrl, flyer.fallbackCoverUrl, flyer.bkcode]);

  const candidates = useMemo(() => {
    const list: string[] = [];

    // 1. Primary configured CDN cover
    if (flyer.coverUrl) {
      list.push(flyer.coverUrl);
    }

    // 2. High-res Calaméo social CDN cover
    if (flyer.bkcode) {
      const calameoSocial = `https://www.calameo.com/books/social/cover/${flyer.bkcode}${flyer.authid ? `?authid=${encodeURIComponent(flyer.authid)}` : ''}`;
      if (!list.includes(calameoSocial)) list.push(calameoSocial);
    }

    // 3. Fallback CDN thumbnail (e.g. CentroVolantini original)
    if (flyer.fallbackCoverUrl && !list.includes(flyer.fallbackCoverUrl)) {
      list.push(flyer.fallbackCoverUrl);
    }

    // 4. Working Calaméo thumbnail CDN URLs (https://p.calameoassets.com/...)
    if (flyer.bkcode) {
      const assetLarge = `https://p.calameoassets.com/${flyer.bkcode}/p1.large.jpg`;
      const assetMedium = `https://p.calameoassets.com/${flyer.bkcode}/p1.jpg`;
      const assetThumb = `https://p.calameoassets.com/${flyer.bkcode}/thumb.jpg`;
      if (!list.includes(assetLarge)) list.push(assetLarge);
      if (!list.includes(assetMedium)) list.push(assetMedium);
      if (!list.includes(assetThumb)) list.push(assetThumb);
    }

    // 5. CeDiGros CDN cover for GROS flyers
    if ((flyer.directUrl && flyer.directUrl.includes('cedigros.com')) || chain.slug === 'gros' || flyer.id > 10000) {
      const cedigrosCover = `https://www.cedigros.com/images/covers/cover-flyer_${flyer.id}.jpg`;
      if (!list.includes(cedigrosCover)) list.push(cedigrosCover);
    }

    return list;
  }, [flyer.coverUrl, flyer.fallbackCoverUrl, flyer.bkcode, flyer.authid, flyer.directUrl, flyer.id, chain.slug]);

  const currentSrc = candidates[candidateIndex];

  const handleError = () => {
    if (candidateIndex + 1 < candidates.length) {
      setCandidateIndex((prev) => prev + 1);
    } else {
      setAllFailed(true);
    }
  };

  if (!currentSrc || allFailed) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-between p-3.5 text-center bg-gradient-to-br from-emerald-500/10 via-[var(--surface-variant)] to-emerald-500/5 select-none">
        <div className="w-full flex justify-end">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
            Volantino
          </span>
        </div>
        <div className="flex flex-col items-center gap-1.5 my-auto">
          <div className="w-12 h-12 rounded-xl bg-white dark:bg-zinc-800 p-1.5 shadow-xs ring-1 ring-black/5 flex items-center justify-center">
            <StoreLogo 
              id={chain.slug} 
              short={chain.name.slice(0, 2)} 
              brandSlug={chain.slug.replace('md-discount', 'md').replace('-italia', '').replace('iper-', '').replace('-market', '')} 
              size={36} 
            />
          </div>
          <span className="text-xs font-black text-[var(--text-main)] line-clamp-1">{chain.name}</span>
        </div>
        <div className="w-full flex items-center justify-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
          <BookOpen className="w-3 h-3" />
          <span>Sfoglia offerte</span>
        </div>
      </div>
    );
  }

  return (
    <img
      src={currentSrc}
      alt={flyer.title}
      loading="lazy"
      onError={handleError}
      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
    />
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN SCREEN COMPONENT (Unified, Minimalist Single-Screen Hub)
   ═══════════════════════════════════════════════════════════════════ */
export default function VolantinoScreen({ 
  module, 
  onClose, 
  initialOffer, 
  initialChain,
  onAddToShoppingList
}: VolantinoScreenProps) {
  // Main view state
  const [tab, setTab] = useState<TabType>('volantini');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [selectedChainSlug, setSelectedChainSlug] = useState<string | null>(null);


  // Best Offers filter state
  const [offersFavOnly, setOffersFavOnly] = useState(false);
  const [offersCategory, setOffersCategory] = useState<'all' | OfferCategory>('all');
  const [addedOfferIds, setAddedOfferIds] = useState<Set<string>>(new Set());

  // Database and Sync state
  const [db, setDb] = useState<VolantiniDb>(getLiveVolantiniDb);
  const [isSyncing, setIsSyncing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Zone & Nearby state
  const [zone, setZone] = useState<VolantiniZone | null>(() => loadZone());
  const [showCapModal, setShowCapModal] = useState<boolean>(false);
  const [nearbySlugs, setNearbySlugs] = useState<string[]>([]);

  // Image load error cache
  const [brokenImages, setBrokenImages] = useState<Set<number>>(new Set());

  // Favorites state
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('chelona_fav_chains');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  }, []);

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
    showToast(`CAP impostato su ${newZone.city || newZone.cap}`);
  }, [showToast]);

  // Sync data with remote (forced by user tap)
  const handleSync = async () => {
    setIsSyncing(true);
    const res = await syncVolantiniRemote({ force: true });
    setIsSyncing(false);
    if (res.updated) {
      setDb(res.db);
    }
    showToast(res.message);
  };


  // Auto-sync on mount if needed
  useEffect(() => {
    const lastCheck = Number(localStorage.getItem('chelona_volantini_last_sync_check') || 0);
    const now = Date.now();
    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);
    const hasExpiredFlyers = db.chains.some(c =>
      c.flyers.some(f => f.to && new Date(f.to).getTime() < todayMidnight.getTime())
    );

    if (now - lastCheck > 10 * 60 * 1000 || hasExpiredFlyers) {
      localStorage.setItem('chelona_volantini_last_sync_check', String(now));
      syncVolantiniRemote({ silent: true, force: hasExpiredFlyers })
        .then(res => {
          if (res.updated) {
            setDb(res.db);
            showToast(`✨ Volantini aggiornati! (${res.db.chains.length} catene)`);
          }
        })
        .catch(() => {});
    }
  }, []);

  // Periodic background sync and on-resume sync
  useEffect(() => {
    const interval = setInterval(() => {
      syncVolantiniRemote({ silent: true })
        .then(res => {
          if (res.updated) {
            setDb(res.db);
          }
        })
        .catch(() => {});
    }, 30 * 60 * 1000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        const lastCheck = Number(localStorage.getItem('chelona_volantini_last_sync_check') || 0);
        if (Date.now() - lastCheck > 20 * 60 * 1000) {
          localStorage.setItem('chelona_volantini_last_sync_check', String(Date.now()));
          syncVolantiniRemote({ silent: true })
            .then(res => {
              if (res.updated) {
                setDb(res.db);
              }
            })
            .catch(() => {});
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  // Maps integration for nearby supermarkets
  useEffect(() => {
    if (!zone || zone.kind === 'all') {
      setNearbySlugs([]);
      return;
    }
    let isCurrent = true;
    nearbySupermarketService.getNearbySupermarkets(zone)
      .then(res => {
        if (isCurrent) {
          setNearbySlugs(res.nearbySlugs);
        }
      })
      .catch(() => {
        if (isCurrent) setNearbySlugs([]);
      });

    return () => { isCurrent = false; };
  }, [zone]);

  // Listen for db updates
  useEffect(() => {
    const handleUpdated = (e: any) => {
      if (e.detail?.chains) setDb(e.detail);
    };
    window.addEventListener('chelona_volantini_updated', handleUpdated);
    return () => window.removeEventListener('chelona_volantini_updated', handleUpdated);
  }, []);

  // Compute all chains with flyers
  const allChains = useMemo(() => {
    return db.chains.filter(c => c.flyers.length > 0);
  }, [db]);

  const totalFlyersCount = useMemo(() => {
    return allChains.reduce((sum, c) => sum + c.flyers.length, 0);
  }, [allChains]);

  const favChains = useMemo(() => {
    return allChains.filter(c => favorites.includes(c.slug));
  }, [allChains, favorites]);

  const nearbyChains = useMemo(() => {
    if (nearbySlugs.length === 0) return [];
    return allChains.filter(c => nearbySlugs.includes(c.slug));
  }, [allChains, nearbySlugs]);

  const expiringChains = useMemo(() => {
    return allChains.filter(c =>
      c.flyers.some(f => {
        const info = getFlyerExpiryInfo(f);
        return info.status === 'today' || info.status === 'tomorrow' || info.status === 'soon';
      })
    );
  }, [allChains]);

  // Target flyer finder helper
  const findTargetFlyerAndChain = useCallback((
    fidStr?: string,
    storeName?: string
  ): { chain?: VolantinoChain; flyer?: VolantinoFlyer } => {
    let targetChain: VolantinoChain | undefined;
    let targetFlyer: VolantinoFlyer | undefined;

    if (fidStr) {
      for (const c of db.chains) {
        const found = c.flyers.find(f => String(f.id) === fidStr || f.bkcode === fidStr);
        if (found) {
          return { chain: c, flyer: found };
        }
      }
    }

    if (storeName) {
      const cleanStore = storeName.trim().toLowerCase();
      const slug = STORE_SLUG_MAP[storeName] || 
        STORE_SLUG_MAP[Object.keys(STORE_SLUG_MAP).find(k => k.toLowerCase() === cleanStore) || ''] || 
        cleanStore;
      const chain = db.chains.find(c => 
        c.slug === slug || 
        c.slug.toLowerCase() === cleanStore || 
        c.name.toLowerCase() === cleanStore ||
        c.name.toLowerCase().includes(cleanStore) ||
        cleanStore.includes(c.name.toLowerCase())
      );
      if (chain && chain.flyers.length > 0) {
        const active = chain.flyers.filter(f => !f.to || new Date(f.to) >= new Date());
        return { chain, flyer: (active.length ? active : chain.flyers)[0] };
      }
    }

    return { chain: targetChain, flyer: targetFlyer };
  }, [db]);

  // Direct flyer opener - opens immediately via external browser reader (just like the ExternalLink button in the top right)
  const openFlyer = useCallback((flyer: VolantinoFlyer, _chain?: VolantinoChain, page: number = 1) => {
    const targetPage = page >= 1 ? page : 1;
    const url = getBrowserUrl(flyer, targetPage);
    if (url) {
      openExternalUrl(url);
    }
  }, []);

  // Direct offer / flyer launch from outside
  const handledInitialOfferRef = useRef<string | null>(null);
  useEffect(() => {
    if (initialOffer && (initialOffer.fid || typeof initialOffer.pg === 'number' || (initialOffer as any).page || initialOffer.store || initialChain)) {
      const fidStr = initialOffer.fid ? String(initialOffer.fid) : '';
      const storeStr = initialOffer.store || initialChain || '';
      const offerKey = `${fidStr}-${initialOffer.pg ?? ''}-${storeStr}`;
      if (handledInitialOfferRef.current !== offerKey) {
        handledInitialOfferRef.current = offerKey;
        const { chain: targetChain, flyer: targetFlyer } = findTargetFlyerAndChain(fidStr, storeStr);
        if (targetFlyer) {
          const targetPage = typeof initialOffer.pg === 'number' 
            ? Math.max(1, initialOffer.pg + 1) 
            : (typeof (initialOffer as any).page === 'number' ? Math.max(1, (initialOffer as any).page) : 1);
          openFlyer(targetFlyer, targetChain, targetPage);
        }
      }
    } else if (initialChain) {
      const targetSlug = STORE_SLUG_MAP[initialChain] || initialChain.toLowerCase();
      const chain = db.chains.find(c => c.slug === targetSlug || c.name.toLowerCase().includes(targetSlug));
      if (chain && chain.flyers.length > 0) {
        const active = chain.flyers.filter(f => !f.to || new Date(f.to) >= new Date());
        openFlyer((active.length ? active : chain.flyers)[0], chain, 1);
      }
    }
  }, [initialOffer, initialChain, findTargetFlyerAndChain, openFlyer, db]);

  // Custom events
  useEffect(() => {
    const handleFlyerOffer = (e: any) => {
      const d = e.detail;
      if (!d) return;
      const fidStr = String(d.fid || d.flyerId || '');
      const storeName = String(d.store || d.chain || '');
      const pageNum = typeof d.page === 'number' 
        ? Math.max(1, d.page) 
        : (typeof d.pg === 'number' ? Math.max(1, d.pg + 1) : 1);
      
      const { chain: targetChain, flyer: targetFlyer } = findTargetFlyerAndChain(fidStr, storeName);
      if (targetFlyer) {
        openFlyer(targetFlyer, targetChain, pageNum);
      }
    };
    window.addEventListener('open-flyer-offer', handleFlyerOffer);
    return () => window.removeEventListener('open-flyer-offer', handleFlyerOffer);
  }, [findTargetFlyerAndChain, openFlyer]);

  // Back handling (single unified exit path)
  const handleBack = useCallback(() => {
    if (selectedChainSlug) {
      setSelectedChainSlug(null);
      return;
    }
    if (searchQuery) {
      setSearchQuery('');
      return;
    }
    if (activeCategory !== 'all') {
      setActiveCategory('all');
      return;
    }
    onClose();
  }, [selectedChainSlug, searchQuery, activeCategory, onClose]);

  // Listen to Android hardware back
  useEffect(() => {
    const handler = () => handleBack();
    window.addEventListener('volantino-back', handler);
    return () => window.removeEventListener('volantino-back', handler);
  }, [handleBack]);

  // Filtered Chains
  const filteredChains = useMemo(() => {
    let list = allChains;
    if (activeCategory === 'fav') {
      list = favChains;
    } else if (activeCategory === 'nearby') {
      list = nearbyChains.length > 0 ? nearbyChains : allChains;
    } else if (activeCategory === 'expiring') {
      list = expiringChains;
    } else if (activeCategory !== 'all') {
      list = allChains.filter(c => (CHAIN_CATEGORY_MAP[c.slug] || 'iper-e-super') === activeCategory);
    }

    const q = searchQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter(c => {
      const catSlug = CHAIN_CATEGORY_MAP[c.slug] || '';
      return (
        c.name.toLowerCase().includes(q) ||
        c.slug.includes(q) ||
        catSlug.includes(q)
      );
    });
  }, [activeCategory, allChains, favChains, nearbyChains, expiringChains, searchQuery]);

  // Selected chain object
  const activeSelectedChain = useMemo(() => {
    if (!selectedChainSlug) return null;
    return allChains.find(c => c.slug === selectedChainSlug) || null;
  }, [selectedChainSlug, allChains]);

  // Display flyers (active flyers prioritized at top)
  const displayFlyers = useMemo(() => {
    let list: { flyer: VolantinoFlyer; chain: VolantinoChain }[] = [];
    if (activeSelectedChain) {
      list = activeSelectedChain.flyers.map(f => ({ flyer: f, chain: activeSelectedChain }));
    } else {
      const q = searchQuery.trim().toLowerCase();
      for (const c of filteredChains) {
        for (const f of c.flyers) {
          if (!q) {
            list.push({ flyer: f, chain: c });
          } else {
            const matchFlyer = f.title.toLowerCase().includes(q) || (f.subtitle && f.subtitle.toLowerCase().includes(q));
            const matchChain = c.name.toLowerCase().includes(q) || c.slug.includes(q);
            if (matchFlyer || matchChain) {
              list.push({ flyer: f, chain: c });
            }
          }
        }
      }
    }

    const active = list.filter(r => getFlyerExpiryInfo(r.flyer).status !== 'expired');
    const expired = list.filter(r => getFlyerExpiryInfo(r.flyer).status === 'expired');
    return [...active, ...expired];
  }, [activeSelectedChain, filteredChains, searchQuery]);

  // Best Offers comparison filtering
  const favSlugSet = useMemo(() => new Set(favorites), [favorites]);
  const isStoreFav = useCallback((storeName: string) => {
    const slug = STORE_SLUG_MAP[storeName]?.toLowerCase();
    if (slug && favSlugSet.has(slug)) return true;
    const lower = storeName.toLowerCase();
    return favorites.some(f => f.toLowerCase() === lower || lower.includes(f.toLowerCase()));
  }, [favSlugSet, favorites]);

  const filteredOfferGroups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return OFFER_GROUPS.map(g => {
      let offers = g.o;
      if (offersFavOnly && favorites.length > 0) {
        offers = offers.filter(e => isStoreFav(e.s));
      }
      return { ...g, o: offers };
    }).filter(g => {
      if (g.o.length === 0) return false;
      if (offersCategory !== 'all' && g.c !== offersCategory) return false;
      if (!q) return true;
      return g.g.toLowerCase().includes(q) || g.o.some(e => e.n.toLowerCase().includes(q) || e.b.toLowerCase().includes(q) || e.s.toLowerCase().includes(q));
    });
  }, [searchQuery, offersFavOnly, favorites.length, offersCategory, isStoreFav]);

  // Is universal search active with a non-empty query?
  const isSearching = searchQuery.trim().length > 0;

  // Add offer directly to Shopping List
  const handleAddOfferToCart = useCallback((offer: OfferEntry, _groupName: string) => {
    const offerKey = `${offer.s}-${offer.n}-${offer.p}`;
    const itemName = `${offer.n}${offer.b && offer.b !== offer.s ? ` (${offer.b})` : ''} - ${offer.s}`;
    const qtyStr = `${offer.q} ${offer.u}`;
    const cat = detectSupermarketCategory(offer.n);

    if (onAddToShoppingList) {
      onAddToShoppingList([{
        name: itemName,
        quantity: qtyStr,
        category: cat
      }]);
    } else {
      window.dispatchEvent(new CustomEvent('chelona_add_shopping_items', {
        detail: [{ name: itemName, quantity: qtyStr, category: cat }]
      }));
    }

    setAddedOfferIds(prev => new Set(prev).add(offerKey));
    showToast(`Aggiunto "${offer.n}" alla Lista della Spesa!`);
  }, [onAddToShoppingList, showToast]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      className="fixed inset-0 z-[150] flex flex-col h-[100dvh] w-full bg-[var(--bg)] overflow-hidden"
    >
      {/* ═══════════════════════════════════════════════════════════════
          MAIN UNIFIED MINIMAL HUB (Single-Screen, Zero Clutter)
          ═══════════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col h-full w-full overflow-hidden">
          {/* ── Top Bar Minimal & Clean (Single Back Arrow, No Redundant X) ── */}
          <header className="flex items-center justify-between gap-3 pt-[max(env(safe-area-inset-top),14px)] px-4 pb-3 bg-[var(--card-bg)] border-b border-[var(--border)] shrink-0 z-20">
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                onClick={handleBack}
                className="p-2 -ml-2 rounded-full hover:bg-[var(--surface-variant)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer shrink-0"
                title="Torna indietro"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="min-w-0">
                <h1 className="text-base sm:text-lg font-black text-[var(--text-main)] flex items-center gap-2 leading-tight">
                  <span>{module.title || 'Volantini'}</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                </h1>
                <p className="text-[11px] text-[var(--text-muted)] font-medium truncate">
                  {allChains.length} catene · {totalFlyersCount} volantini attivi
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Location Badge (Tap to change CAP smoothly) */}
              <button
                onClick={() => setShowCapModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-700 dark:text-emerald-300 text-xs font-bold hover:bg-emerald-500/20 active:scale-95 transition-all cursor-pointer"
                title="Cambia CAP / Posizione"
              >
                <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="max-w-[85px] sm:max-w-[130px] truncate">
                  {zone?.city || (zone?.cap ? `CAP ${zone.cap}` : 'Tutta Italia')}
                </span>
              </button>

              {/* Quick Sync */}
              <button
                onClick={handleSync}
                disabled={isSyncing}
                className="p-2 rounded-full bg-[var(--surface-variant)] hover:bg-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all disabled:opacity-50 cursor-pointer"
                title="Verifica aggiornamenti online"
              >
                <RefreshCw className={`w-4 h-4 text-emerald-600 ${isSyncing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </header>

          {/* ── Hero Search Bar (Universal: Finds Stores, Flyers, AND Discount Products) ── */}
          <div className="px-4 pt-3.5 pb-3 bg-[var(--card-bg)]/90 backdrop-blur-md border-b border-[var(--border)] shrink-0 z-10 max-w-2xl mx-auto w-full space-y-3">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/15 via-teal-500/15 to-amber-500/15 rounded-2xl sm:rounded-3xl blur-md opacity-60 group-focus-within:opacity-100 transition-opacity pointer-events-none" />
              <div className="relative flex items-center bg-[var(--card-bg)] border-2 border-[var(--border)] focus-within:border-emerald-500 rounded-2xl sm:rounded-3xl shadow-sm transition-all px-3.5 sm:px-4 py-3 sm:py-3.5">
                <Search className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-500 shrink-0 mr-3 pointer-events-none" />
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Cerca negozio o prodotto (es. Conad, pasta, caffè…)"
                  className="w-full bg-transparent text-[var(--text-main)] font-semibold text-sm sm:text-base outline-none placeholder:text-[var(--text-muted)] placeholder:font-normal"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="p-1 rounded-full hover:bg-[var(--surface-variant)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer ml-1 shrink-0"
                    title="Cancella ricerca"
                  >
                    <X className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                )}
              </div>
            </div>

            {/* When NOT searching: Segmented Tab Bar for Mode Switching */}
            {!isSearching && (
              <div className="flex p-1 rounded-2xl bg-[var(--surface-variant)] border border-[var(--border)] gap-1">
                <button
                  onClick={() => { setTab('volantini'); setSelectedChainSlug(null); }}
                  className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    tab === 'volantini'
                      ? 'bg-[var(--card-bg)] text-emerald-600 dark:text-emerald-400 shadow-xs border border-[var(--border)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                  }`}
                >
                  <Store className="w-3.5 h-3.5" />
                  <span>Volantini</span>
                  <span className="text-[10px] font-semibold opacity-70">({displayFlyers.length})</span>
                </button>

                <button
                  onClick={() => { setTab('offerte'); setSelectedChainSlug(null); }}
                  className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    tab === 'offerte'
                      ? 'bg-[var(--card-bg)] text-amber-600 dark:text-amber-400 shadow-xs border border-[var(--border)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Migliori Offerte</span>
                  <span className="text-[10px] font-semibold opacity-70">({filteredOfferGroups.length})</span>
                </button>
              </div>
            )}
          </div>

          {/* ── Main Scrollable View ── */}
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain custom-scrollbar scroll-smooth px-4 py-3 max-w-2xl mx-auto w-full space-y-4 pb-[max(env(safe-area-inset-bottom),16px)]">
            {isSearching ? (
              /* ═══════════════════════════════════════════════════════════
                 SMART UNIFIED SEARCH RESULTS (Shows Flyers + Offers together)
                 ═══════════════════════════════════════════════════════════ */
              <div className="space-y-5">
                <div className="flex items-center justify-between text-xs font-bold text-[var(--text-muted)] border-b border-[var(--border)] pb-2">
                  <span>Risultati per "{searchQuery}":</span>
                  <span>{displayFlyers.length} volantini · {filteredOfferGroups.length} offerte</span>
                </div>

                {displayFlyers.length === 0 && filteredOfferGroups.length === 0 ? (
                  <div className="py-16 flex flex-col items-center justify-center text-center px-4">
                    <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-3">
                      <Search className="w-8 h-8 text-emerald-500 opacity-70" />
                    </div>
                    <h3 className="text-base font-bold text-[var(--text-main)] mb-1">
                      Nessun risultato trovato
                    </h3>
                    <p className="text-xs text-[var(--text-muted)] max-w-xs mb-3">
                      Non abbiamo trovato volantini o offerte per "{searchQuery}". Prova con un'altra parola chiave.
                    </p>
                    <button
                      onClick={() => setSearchQuery('')}
                      className="px-4 py-2 rounded-xl bg-[var(--surface-variant)] text-[var(--text-main)] text-xs font-bold hover:bg-[var(--border)] cursor-pointer"
                    >
                      Azzera ricerca
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Section 1: Matching Flyers */}
                    {displayFlyers.length > 0 && (
                      <div className="space-y-2.5">
                        <h2 className="text-xs font-black uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
                          <Store className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Volantini Supermercati ({displayFlyers.length})</span>
                        </h2>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {displayFlyers.map(({ flyer: f, chain: c }) => {
                            const expiry = getFlyerExpiryInfo(f);
                            const showExpiryBadge = expiry.status === 'today' || expiry.status === 'tomorrow' || expiry.status === 'soon' || expiry.status === 'expired';
                            const isFav = favorites.includes(c.slug);
                            const isBroken = brokenImages.has(f.id);

                            return (
                              <div
                                key={`search-flyer-${c.slug}-${f.id}`}
                                onClick={() => openFlyer(f, c, 1)}
                                className="group flex flex-col rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] hover:border-emerald-500/50 hover:shadow-md transition-all overflow-hidden cursor-pointer active:scale-[0.98]"
                              >
                                <div className="relative aspect-[3/4] w-full bg-[var(--surface-variant)] overflow-hidden">
                                  <FlyerCardCover flyer={f} chain={c} />

                                  <div className="absolute top-2 left-2 z-10 w-7 h-7 rounded-lg bg-white ring-1 ring-black/10 flex items-center justify-center shadow-xs overflow-hidden">
                                    <StoreLogo 
                                      id={c.slug} 
                                      short={c.name.slice(0, 2)} 
                                      brandSlug={c.slug.replace('md-discount', 'md').replace('-italia', '').replace('iper-', '').replace('-market', '')} 
                                      size={22} 
                                    />
                                  </div>

                                  {showExpiryBadge && (
                                    <div className="absolute top-2 right-2 z-10">
                                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black border backdrop-blur-md shadow-xs ${expiry.badgeBg} ${expiry.textColor} ${expiry.borderColor}`}>
                                        {expiry.iconType === 'alert' ? <AlertTriangle className="w-2.5 h-2.5" /> : <Clock className="w-2.5 h-2.5" />}
                                        <span>{expiry.shortLabel}</span>
                                      </span>
                                    </div>
                                  )}

                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleFavorite(c.slug);
                                    }}
                                    className={`absolute bottom-2 right-2 p-2 sm:p-2.5 rounded-full backdrop-blur-md transition-all z-10 cursor-pointer shadow-md active:scale-90 ${
                                      isFav ? 'bg-amber-500 text-white shadow-amber-500/30' : 'bg-black/60 text-white/90 hover:text-white hover:bg-black/80'
                                    }`}
                                    title={isFav ? "Rimuovi preferito" : "Aggiungi preferito"}
                                  >
                                    <Star className={`w-5 h-5 sm:w-5.5 sm:h-5.5 ${isFav ? 'fill-current' : ''}`} />
                                  </button>
                                </div>

                                <div className="p-2.5 flex-1 flex flex-col justify-between gap-1">
                                  <div>
                                    <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider truncate">
                                      {c.name}
                                    </p>
                                    <p className="text-xs font-bold text-[var(--text-main)] line-clamp-1 group-hover:text-emerald-600 transition-colors">
                                      {cleanTitle(f.title)}
                                    </p>
                                  </div>

                                  <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] pt-1 border-t border-[var(--border)]">
                                    <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                      <span>Sfoglia</span>
                                      <ExternalLink className="w-3 h-3" />
                                    </span>
                                    {f.to && (
                                      <span className="truncate">
                                        Fino al {new Date(f.to).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Section 2: Matching Offers in Supermarkets */}
                    {filteredOfferGroups.length > 0 && (
                      <div className="space-y-2.5 pt-2">
                        <h2 className="text-xs font-black uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                          <span>Migliori Offerte a confronto ({filteredOfferGroups.length})</span>
                        </h2>

                        <div className="space-y-3">
                          {filteredOfferGroups.map(g => {
                            const bestOffer = g.o.reduce((a, b) => (unitPrice(b) < unitPrice(a) ? b : a), g.o[0]);
                            const avgPrice = g.o.reduce((s, e) => s + unitPrice(e), 0) / g.o.length;

                            return (
                              <div
                                key={`search-group-${g.id}`}
                                className="rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] overflow-hidden shadow-xs"
                              >
                                <div className="flex items-center justify-between gap-2 px-3.5 pt-3 pb-2 border-b border-[var(--border)]/60 bg-[var(--surface-variant)]/40">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="text-base leading-none">{g.e}</span>
                                    <h3 className="font-black text-xs sm:text-sm text-[var(--text-main)] truncate">
                                      {g.g}
                                    </h3>
                                  </div>
                                  {g.o.length > 1 && (
                                    <span className="text-[10px] font-bold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full shrink-0">
                                      {Math.round((1 - unitPrice(bestOffer) / avgPrice) * 100)}% sotto la media
                                    </span>
                                  )}
                                </div>

                                <div className="divide-y divide-[var(--border)]/50">
                                  {g.o.map((offer, idx) => {
                                    const isBest = g.o.length > 1 && offer === bestOffer;
                                    const offerKey = `${offer.s}-${offer.n}-${offer.p}`;
                                    const isAdded = addedOfferIds.has(offerKey);
                                    const targetPage = typeof offer.pg === 'number' ? offer.pg + 1 : 1;

                                    return (
                                      <div
                                        key={`search-offer-${offer.s}-${idx}`}
                                        className={`p-2.5 sm:p-3 flex items-center justify-between gap-3 transition-colors ${
                                          isBest ? 'bg-emerald-500/[0.04]' : ''
                                        }`}
                                      >
                                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                          <div className="w-8 h-8 rounded-xl bg-white ring-1 ring-[var(--border)] flex items-center justify-center overflow-hidden shrink-0">
                                            <StoreLogo
                                              id={STORE_SLUG_MAP[offer.s] || offer.s.toLowerCase()}
                                              short={offer.s.slice(0, 2)}
                                              brandSlug={offer.s.toLowerCase().replace('md-discount', 'md')}
                                              size={28}
                                            />
                                          </div>
                                          <div className="min-w-0">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                              <span className="text-xs font-black text-[var(--text-main)] truncate">
                                                {offer.s}
                                              </span>
                                              {offer.b && offer.b !== offer.s && (
                                                <span className="text-[10px] font-semibold text-[var(--text-muted)] truncate">
                                                  · {offer.b}
                                                </span>
                                              )}
                                              {isBest && (
                                                <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded-md bg-emerald-500 text-white">
                                                  Migliore
                                                </span>
                                              )}
                                            </div>
                                            <p className="text-[11px] text-[var(--text-muted)] font-medium truncate mt-0.5">
                                              {offer.n}
                                            </p>
                                          </div>
                                        </div>

                                        <div className="text-right shrink-0">
                                          <p className={`text-xs sm:text-sm font-black ${isBest ? 'text-emerald-600' : 'text-[var(--text-main)]'}`}>
                                            {fmtPrice(offer.p)}
                                          </p>
                                          <p className="text-[9px] text-[var(--text-muted)] font-semibold">
                                            {unitPrice(offer).toFixed(2).replace('.', ',')} {fmtUnit(offer.u)}
                                          </p>
                                        </div>

                                        <div className="flex items-center gap-1 shrink-0">
                                          <button
                                            type="button"
                                            onClick={() => handleAddOfferToCart(offer, g.g)}
                                            className={`p-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                                              isAdded
                                                ? 'bg-emerald-500 text-white'
                                                : 'bg-[var(--surface-variant)] text-[var(--text-main)] hover:bg-emerald-500/15 hover:text-emerald-600'
                                            }`}
                                            title="Aggiungi alla Lista della Spesa"
                                          >
                                            {isAdded ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                                            <span className="hidden sm:inline">{isAdded ? 'Aggiunto' : 'Spesa'}</span>
                                          </button>

                                          <button
                                            type="button"
                                            onClick={() => {
                                              const { chain: targetChain, flyer: targetFlyer } = findTargetFlyerAndChain(offer.fid, offer.s);
                                              if (targetFlyer) {
                                                openFlyer(targetFlyer, targetChain, targetPage);
                                              }
                                            }}
                                            className="p-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                                            title={`Sfoglia volantino a Pag. ${targetPage}`}
                                          >
                                            <ExternalLink className="w-3.5 h-3.5" />
                                            <span className="text-[10px]">p.{targetPage}</span>
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : tab === 'volantini' ? (
              /* ═══════════════════════════════════════════════════════════
                 TAB 1: VOLANTINI (Clean Filter Row + Store Chips + Grid)
                 ═══════════════════════════════════════════════════════════ */
              <div className="space-y-3.5">
                {/* Unified Horizontal Filter Bar: Smart Filters + Store Brands */}
                <div className="space-y-2">
                  <div className="flex gap-1.5 overflow-x-auto custom-scrollbar pb-1 -mx-4 px-4">
                    {DC_INDEX_CATEGORIES.map(cat => {
                      const isActive = activeCategory === cat.slug;
                      return (
                        <button
                          key={cat.slug}
                          onClick={() => {
                            setActiveCategory(cat.slug);
                            setSelectedChainSlug(null);
                          }}
                          className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                            isActive
                              ? cat.slug === 'fav'
                                ? 'bg-amber-500 text-white shadow-xs'
                                : cat.slug === 'expiring'
                                  ? 'bg-orange-500 text-white shadow-xs'
                                  : 'bg-emerald-500 text-white shadow-xs'
                              : 'bg-[var(--card-bg)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--surface-variant)]'
                          }`}
                        >
                          <span className="text-xs">{cat.icon}</span>
                          <span>{cat.name}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Compact, Ergonomic Supermarket Brand Chips */}
                  <div className="flex gap-1.5 overflow-x-auto custom-scrollbar pb-1 -mx-4 px-4 pt-0.5">
                    {filteredChains.map(c => {
                      const isSelected = selectedChainSlug === c.slug;
                      return (
                        <button
                          key={`store-pill-${c.slug}`}
                          onClick={() => setSelectedChainSlug(isSelected ? null : c.slug)}
                          className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-2xl border text-xs font-bold transition-all cursor-pointer select-none ${
                            isSelected
                              ? 'bg-emerald-500 text-white border-emerald-500 shadow-xs'
                              : 'bg-[var(--card-bg)] border-[var(--border)] text-[var(--text-main)] hover:border-emerald-500/40 hover:bg-[var(--surface-variant)]'
                          }`}
                        >
                          <div className="w-4 h-4 rounded-md bg-white ring-1 ring-black/10 flex items-center justify-center overflow-hidden shrink-0">
                            <StoreLogo 
                              id={c.slug} 
                              short={c.name.slice(0, 2)} 
                              brandSlug={c.slug.replace('md-discount', 'md').replace('-italia', '').replace('iper-', '').replace('-market', '')} 
                              size={14} 
                            />
                          </div>
                          <span>{c.name}</span>
                          <span className={`text-[10px] ${isSelected ? 'text-white/80' : 'text-[var(--text-muted)]'}`}>
                            {c.flyers.length}
                          </span>
                          {isSelected && <X className="w-3 h-3 ml-0.5" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Section Title */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] font-black uppercase tracking-wider text-[var(--text-muted)]">
                    {activeSelectedChain 
                      ? `Volantini di ${activeSelectedChain.name} (${displayFlyers.length})` 
                      : `Tutti i Volantini Attivi (${displayFlyers.length})`}
                  </span>
                  {selectedChainSlug && (
                    <button
                      onClick={() => setSelectedChainSlug(null)}
                      className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                    >
                      Mostra tutti
                    </button>
                  )}
                </div>

                {/* Flyers Grid */}
                {displayFlyers.length === 0 ? (
                  <div className="py-16 text-center space-y-2">
                    <Store className="w-10 h-10 text-[var(--text-muted)] mx-auto opacity-40" />
                    <p className="text-xs font-bold text-[var(--text-muted)]">
                      Nessun volantino trovato con i filtri attuali.
                    </p>
                    <button
                      onClick={() => { setActiveCategory('all'); setSelectedChainSlug(null); }}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-500 text-white text-xs font-bold cursor-pointer"
                    >
                      Azzera filtri
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {displayFlyers.map(({ flyer: f, chain: c }) => {
                      const expiry = getFlyerExpiryInfo(f);
                      const showExpiryBadge = expiry.status === 'today' || expiry.status === 'tomorrow' || expiry.status === 'soon' || expiry.status === 'expired';
                      const isFav = favorites.includes(c.slug);
                      const isBroken = brokenImages.has(f.id);

                      return (
                        <div
                          key={`flyer-${c.slug}-${f.id}`}
                          onClick={() => openFlyer(f, c, 1)}
                          className="group flex flex-col rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] hover:border-emerald-500/50 hover:shadow-md transition-all overflow-hidden cursor-pointer active:scale-[0.98]"
                        >
                          <div className="relative aspect-[3/4] w-full bg-[var(--surface-variant)] overflow-hidden">
                            <FlyerCardCover flyer={f} chain={c} />

                            <div className="absolute top-2 left-2 z-10 w-7 h-7 rounded-lg bg-white ring-1 ring-black/10 flex items-center justify-center shadow-xs overflow-hidden">
                              <StoreLogo 
                                id={c.slug} 
                                short={c.name.slice(0, 2)} 
                                brandSlug={c.slug.replace('md-discount', 'md').replace('-italia', '').replace('iper-', '').replace('-market', '')} 
                                size={22} 
                              />
                            </div>

                            {showExpiryBadge && (
                              <div className="absolute top-2 right-2 z-10">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black border backdrop-blur-md shadow-xs ${expiry.badgeBg} ${expiry.textColor} ${expiry.borderColor}`}>
                                  {expiry.iconType === 'alert' ? <AlertTriangle className="w-2.5 h-2.5" /> : <Clock className="w-2.5 h-2.5" />}
                                  <span>{expiry.shortLabel}</span>
                                </span>
                              </div>
                            )}

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFavorite(c.slug);
                              }}
                              className={`absolute bottom-2 right-2 p-2 sm:p-2.5 rounded-full backdrop-blur-md transition-all z-10 cursor-pointer shadow-md active:scale-90 ${
                                isFav ? 'bg-amber-500 text-white shadow-amber-500/30' : 'bg-black/60 text-white/90 hover:text-white hover:bg-black/80'
                              }`}
                              title={isFav ? "Rimuovi preferito" : "Aggiungi preferito"}
                            >
                              <Star className={`w-5 h-5 sm:w-5.5 sm:h-5.5 ${isFav ? 'fill-current' : ''}`} />
                            </button>
                          </div>

                          <div className="p-2.5 flex-1 flex flex-col justify-between gap-1">
                            <div>
                              <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider truncate">
                                {c.name}
                              </p>
                              <p className="text-xs font-bold text-[var(--text-main)] line-clamp-1 group-hover:text-emerald-600 transition-colors">
                                {cleanTitle(f.title)}
                              </p>
                            </div>

                            <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] pt-1 border-t border-[var(--border)]">
                              <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                <span>Sfoglia</span>
                                <ExternalLink className="w-3 h-3" />
                              </span>
                              {f.to && (
                                <span className="truncate">
                                  Fino al {new Date(f.to).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              /* ═══════════════════════════════════════════════════════════
                 TAB 2: MIGLIORI OFFERTE & CONFRONTA PREZZI
                 ═══════════════════════════════════════════════════════════ */
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setOffersFavOnly(false)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                        !offersFavOnly
                          ? 'bg-amber-500 text-white shadow-xs'
                          : 'bg-[var(--card-bg)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
                      }`}
                    >
                      Tutti i negozi
                    </button>
                    {favorites.length > 0 && (
                      <button
                        onClick={() => setOffersFavOnly(true)}
                        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                          offersFavOnly
                            ? 'bg-amber-500 text-white shadow-xs'
                            : 'bg-[var(--card-bg)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
                        }`}
                      >
                        <Star className="w-3 h-3 fill-current" />
                        <span>I tuoi preferiti ({favorites.length})</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setOffersCategory('all')}
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-colors cursor-pointer ${
                        offersCategory === 'all'
                          ? 'bg-[var(--text-main)] text-[var(--card-bg)]'
                          : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                      }`}
                    >
                      Tutto
                    </button>
                    <button
                      onClick={() => setOffersCategory('alimentari')}
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-colors cursor-pointer ${
                        offersCategory === 'alimentari'
                          ? 'bg-[var(--text-main)] text-[var(--card-bg)]'
                          : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                      }`}
                    >
                      🛒 Cibo
                    </button>
                    <button
                      onClick={() => setOffersCategory('casa')}
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-colors cursor-pointer ${
                        offersCategory === 'casa'
                          ? 'bg-[var(--text-main)] text-[var(--card-bg)]'
                          : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                      }`}
                    >
                      🧼 Casa
                    </button>
                  </div>
                </div>

                <p className="text-[11px] text-[var(--text-muted)] font-medium">
                  {filteredOfferGroups.length} prodotti a confronto rilevati dai volantini nazionali ({OFFER_DATE})
                </p>

                {filteredOfferGroups.length === 0 ? (
                  <div className="py-16 text-center space-y-2">
                    <BarChart3 className="w-10 h-10 text-[var(--text-muted)] mx-auto opacity-40" />
                    <p className="text-xs font-bold text-[var(--text-muted)]">
                      Nessun prodotto trovato.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredOfferGroups.map(g => {
                      const bestOffer = g.o.reduce((a, b) => (unitPrice(b) < unitPrice(a) ? b : a), g.o[0]);
                      const avgPrice = g.o.reduce((s, e) => s + unitPrice(e), 0) / g.o.length;

                      return (
                        <div
                          key={`group-${g.id}`}
                          className="rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] overflow-hidden shadow-xs"
                        >
                          <div className="flex items-center justify-between gap-2 px-3.5 pt-3 pb-2 border-b border-[var(--border)]/60 bg-[var(--surface-variant)]/40">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-base leading-none">{g.e}</span>
                              <h3 className="font-black text-xs sm:text-sm text-[var(--text-main)] truncate">
                                {g.g}
                              </h3>
                            </div>
                            {g.o.length > 1 && (
                              <span className="text-[10px] font-bold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full shrink-0">
                                {Math.round((1 - unitPrice(bestOffer) / avgPrice) * 100)}% sotto la media
                              </span>
                            )}
                          </div>

                          <div className="divide-y divide-[var(--border)]/50">
                            {g.o.map((offer, idx) => {
                              const isBest = g.o.length > 1 && offer === bestOffer;
                              const offerKey = `${offer.s}-${offer.n}-${offer.p}`;
                              const isAdded = addedOfferIds.has(offerKey);
                              const targetPage = typeof offer.pg === 'number' ? offer.pg + 1 : 1;

                              return (
                                <div
                                  key={`offer-${offer.s}-${idx}`}
                                  className={`p-2.5 sm:p-3 flex items-center justify-between gap-3 transition-colors ${
                                    isBest ? 'bg-emerald-500/[0.04]' : ''
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                    <div className="w-8 h-8 rounded-xl bg-white ring-1 ring-[var(--border)] flex items-center justify-center overflow-hidden shrink-0">
                                      <StoreLogo
                                        id={STORE_SLUG_MAP[offer.s] || offer.s.toLowerCase()}
                                        short={offer.s.slice(0, 2)}
                                        brandSlug={offer.s.toLowerCase().replace('md-discount', 'md')}
                                        size={28}
                                      />
                                    </div>
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="text-xs font-black text-[var(--text-main)] truncate">
                                          {offer.s}
                                        </span>
                                        {offer.b && offer.b !== offer.s && (
                                          <span className="text-[10px] font-semibold text-[var(--text-muted)] truncate">
                                            · {offer.b}
                                          </span>
                                        )}
                                        {isBest && (
                                          <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded-md bg-emerald-500 text-white">
                                            Migliore
                                          </span>
                                        )}
                                        {FIDELITY_CARDS[offer.s] && (
                                          <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded-md bg-[var(--surface-variant)] text-[var(--text-muted)] hidden sm:inline">
                                            {FIDELITY_CARDS[offer.s]}
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-[11px] text-[var(--text-muted)] font-medium truncate mt-0.5">
                                        {offer.n}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="text-right shrink-0">
                                    <p className={`text-xs sm:text-sm font-black ${isBest ? 'text-emerald-600' : 'text-[var(--text-main)]'}`}>
                                      {fmtPrice(offer.p)}
                                    </p>
                                    <p className="text-[9px] text-[var(--text-muted)] font-semibold">
                                      {unitPrice(offer).toFixed(2).replace('.', ',')} {fmtUnit(offer.u)}
                                    </p>
                                  </div>

                                  <div className="flex items-center gap-1 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => handleAddOfferToCart(offer, g.g)}
                                      className={`p-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                                        isAdded
                                          ? 'bg-emerald-500 text-white'
                                          : 'bg-[var(--surface-variant)] text-[var(--text-main)] hover:bg-emerald-500/15 hover:text-emerald-600'
                                      }`}
                                      title="Aggiungi alla Lista della Spesa"
                                    >
                                      {isAdded ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                                      <span className="hidden sm:inline">{isAdded ? 'Aggiunto' : 'Spesa'}</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        const { chain: targetChain, flyer: targetFlyer } = findTargetFlyerAndChain(offer.fid, offer.s);
                                        if (targetFlyer) {
                                          openFlyer(targetFlyer, targetChain, targetPage);
                                        }
                                      }}
                                      className="p-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                                      title={`Sfoglia volantino a Pag. ${targetPage}`}
                                    >
                                      <ExternalLink className="w-3.5 h-3.5" />
                                      <span className="text-[10px]">p.{targetPage}</span>
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

      {/* Floating Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[250] px-4 py-2 rounded-2xl bg-zinc-900/90 text-white border border-white/15 backdrop-blur-md shadow-xl flex items-center gap-2 text-xs font-bold pointer-events-none"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sleek Non-Intrusive CAP Modal */}
      <CapModal
        isOpen={showCapModal}
        currentZone={zone}
        onSave={handleSaveZone}
        onClose={() => setShowCapModal(false)}
      />
    </motion.div>
  );
}
