import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { VOLANTINI_DB, VolantiniDb, VolantinoFlyer, VolantinoChain } from '../data/volantiniDb';

const CACHE_KEY = 'chelona_volantini_cache_v2';
const LAST_SYNC_KEY = 'chelona_volantini_last_sync_check';

const REMOTE_URLS = [
  'https://raw.githubusercontent.com/davide-dari/chelona-test/main/public/volantiniDb.json',
  'https://cdn.jsdelivr.net/gh/davide-dari/chelona-test@main/public/volantiniDb.json',
  '/volantiniDb.json',
];

export interface FlyerExpiryInfo {
  status: 'expired' | 'today' | 'tomorrow' | 'soon' | 'active' | 'unknown';
  daysLeft: number;
  label: string;
  shortLabel: string;
  badgeBg: string;
  textColor: string;
  borderColor: string;
  iconType: 'alert' | 'clock' | 'calendar';
}

/**
 * Calcola lo stato di scadenza di un volantino rispetto alla data corrente.
 */
export function getFlyerExpiryInfo(flyer?: VolantinoFlyer): FlyerExpiryInfo {
  if (!flyer?.to) {
    return {
      status: 'unknown',
      daysLeft: 999,
      label: 'Offerta in corso',
      shortLabel: 'In corso',
      badgeBg: 'bg-zinc-500/10 dark:bg-zinc-500/20',
      textColor: 'text-zinc-600 dark:text-zinc-400',
      borderColor: 'border-zinc-500/20',
      iconType: 'calendar',
    };
  }

  const toDate = new Date(flyer.to);
  const now = new Date();

  // Confronto calcolato sul midnight locale per contare i giorni esatti
  const toMidnight = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate()).getTime();
  const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  const diffDays = Math.round((toMidnight - nowMidnight) / (1000 * 60 * 60 * 24));
  const formattedTo = toDate.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });

  if (diffDays < 0) {
    return {
      status: 'expired',
      daysLeft: diffDays,
      label: `Scaduto il ${formattedTo}`,
      shortLabel: 'Scaduto',
      badgeBg: 'bg-red-500/15',
      textColor: 'text-red-600 dark:text-red-400',
      borderColor: 'border-red-500/30',
      iconType: 'alert',
    };
  }

  if (diffDays === 0) {
    return {
      status: 'today',
      daysLeft: 0,
      label: '⏳ Scade OGGI!',
      shortLabel: 'Scade oggi',
      badgeBg: 'bg-rose-500/20 animate-pulse',
      textColor: 'text-rose-600 dark:text-rose-400 font-black',
      borderColor: 'border-rose-500/40',
      iconType: 'alert',
    };
  }

  if (diffDays === 1) {
    return {
      status: 'tomorrow',
      daysLeft: 1,
      label: '⚠️ Scade DOMANI!',
      shortLabel: 'Scade domani',
      badgeBg: 'bg-amber-500/20',
      textColor: 'text-amber-700 dark:text-amber-300 font-bold',
      borderColor: 'border-amber-500/40',
      iconType: 'clock',
    };
  }

  if (diffDays <= 3) {
    return {
      status: 'soon',
      daysLeft: diffDays,
      label: `⏳ Scade tra ${diffDays} giorni (${formattedTo})`,
      shortLabel: `Tra ${diffDays} gg`,
      badgeBg: 'bg-orange-500/15',
      textColor: 'text-orange-700 dark:text-orange-400 font-semibold',
      borderColor: 'border-orange-500/30',
      iconType: 'clock',
    };
  }

  return {
    status: 'active',
    daysLeft: diffDays,
    label: `Fino al ${formattedTo}`,
    shortLabel: formattedTo,
    badgeBg: 'bg-emerald-500/10',
    textColor: 'text-emerald-700 dark:text-emerald-400 font-medium',
    borderColor: 'border-emerald-500/20',
    iconType: 'calendar',
  };
}

/**
 * Formatta la data di aggiornamento del database in formato italiano leggibile.
 */
export function formatUpdateDate(isoDateString?: string): string {
  if (!isoDateString) return 'Data non disponibile';
  try {
    const d = new Date(isoDateString);
    if (isNaN(d.getTime())) return 'Data non disponibile';
    return d.toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'Data non disponibile';
  }
}

/**
 * Recupera il database volantini effettivo (cache locale se più recente, altrimenti bundled).
 */
export function getLiveVolantiniDb(): VolantiniDb {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as VolantiniDb;
        if (parsed?.updatedAt && parsed?.chains?.length) {
          const cachedDate = new Date(parsed.updatedAt).getTime();
          const bundledDate = new Date(VOLANTINI_DB.updatedAt).getTime();
          if (cachedDate > bundledDate) {
            return parsed;
          }
        }
      }
    }
  } catch (e) {
    console.warn('[VolantiniSync] Errore lettura cache locale:', e);
  }
  return VOLANTINI_DB;
}

/**
 * Salva il database aggiornato nella cache locale.
 */
export function saveLiveVolantiniDb(db: VolantiniDb) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(CACHE_KEY, JSON.stringify(db));
      localStorage.setItem(LAST_SYNC_KEY, String(Date.now()));
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('chelona_volantini_updated', { detail: db }));
    }
  } catch (e) {
    console.warn('[VolantiniSync] Errore salvataggio cache:', e);
  }
}

let syncInProgress = false;

/**
 * Sincronizza i volantini da remoto (GitHub raw o CDN) senza dover aggiornare l'APK.
 * Supporta CapacitorHttp per mobile nativo e fallback rapidi CDN.
 */
export async function syncVolantiniRemote(options: { silent?: boolean; force?: boolean } = {}): Promise<{
  success: boolean;
  updated: boolean;
  message: string;
  db: VolantiniDb;
}> {
  const currentDb = getLiveVolantiniDb();
  if (syncInProgress) {
    return {
      success: true,
      updated: false,
      message: 'Sincronizzazione già in corso…',
      db: currentDb,
    };
  }

  syncInProgress = true;
  try {
    let remoteDb: VolantiniDb | null = null;
    const cacheBuster = `t=${Date.now()}`;

    // 1. Prova prima su ambiente nativo con CapacitorHttp (zero CORS, massima affidabilità)
    if (Capacitor.isNativePlatform()) {
      for (const baseUrl of REMOTE_URLS) {
        if (baseUrl.startsWith('/')) continue;
        try {
          const res = await CapacitorHttp.get({
            url: `${baseUrl}?${cacheBuster}`,
            headers: { 'Cache-Control': 'no-cache' },
            connectTimeout: 7000,
            readTimeout: 7000,
          });
          if (res.status === 200 && res.data && typeof res.data === 'object' && res.data.chains) {
            remoteDb = res.data as VolantiniDb;
            break;
          }
        } catch (nativeErr) {
          console.warn('[VolantiniSync] CapacitorHttp fetch fallito su', baseUrl, nativeErr);
        }
      }
    }

    // 2. Se ancora null o su browser web, prova con fetch standard
    if (!remoteDb) {
      for (const baseUrl of REMOTE_URLS) {
        try {
          const sep = baseUrl.includes('?') ? '&' : '?';
          const res = await fetch(`${baseUrl}${sep}${cacheBuster}`, {
            headers: { 'Cache-Control': 'no-cache' },
            signal: AbortSignal.timeout(6000),
          });
          if (res.ok) {
            const data = await res.json();
            if (data?.chains && data?.updatedAt) {
              remoteDb = data as VolantiniDb;
              break;
            }
          }
        } catch {
          // Prova il prossimo URL
        }
      }
    }

    if (!remoteDb?.chains || !remoteDb?.updatedAt) {
      return {
        success: false,
        updated: false,
        message: 'Impossibile raggiungere i server dei volantini al momento',
        db: currentDb,
      };
    }

    const remoteTime = new Date(remoteDb.updatedAt).getTime();
    const currentTime = new Date(currentDb.updatedAt).getTime();

    if (remoteTime > currentTime || options.force) {
      saveLiveVolantiniDb(remoteDb);
      const totalFlyers = remoteDb.chains.reduce((s, c) => s + c.flyers.length, 0);
      return {
        success: true,
        updated: true,
        message: `Catalogo volantini aggiornato! (${remoteDb.chains.length} catene, ${totalFlyers} volantini)`,
        db: remoteDb,
      };
    }

    return {
      success: true,
      updated: false,
      message: 'I volantini sono già aggiornati all\'ultima versione!',
      db: currentDb,
    };
  } catch (err: any) {
    return {
      success: false,
      updated: false,
      message: err?.message || 'Impossibile verificare gli aggiornamenti al momento',
      db: currentDb,
    };
  } finally {
    syncInProgress = false;
  }
}

/**
 * Restituisce l'URL corretto per il reader incorporato (Calaméo embed o CeDiGros).
 * Costruisce i parametri query in modo robusto con `&`, evitando doppi '?' che causano "Incorrect parameter" su Calaméo.
 */
export function getFlyerUrl(f: VolantinoFlyer, page?: number): string {
  const targetPage = typeof page === 'number' && page >= 1 ? Math.floor(page) : 1;
  if (f.directUrl) {
    if (targetPage > 1) {
      const sep = f.directUrl.includes('?') ? '&' : '?';
      return `${f.directUrl}${sep}page=${targetPage}#page/${targetPage}`;
    }
    return f.directUrl;
  }
  const cleanBkcode = (f.bkcode || '').trim();
  const url = new URL('https://v.calameo.com/');
  if (cleanBkcode) {
    url.searchParams.set('bkcode', cleanBkcode);
  }
  if (f.authid && f.authid.trim()) {
    url.searchParams.set('authid', f.authid.trim());
  }
  if (targetPage > 1) {
    url.searchParams.set('page', String(targetPage));
  }
  return url.toString();
}

/**
 * Restituisce l'URL per aprire il volantino nel browser esterno (Calaméo reader o CeDiGros).
 */
export function getBrowserUrl(f: VolantinoFlyer, page?: number): string {
  const targetPage = typeof page === 'number' && page >= 1 ? Math.floor(page) : 1;
  if (f.directUrl) {
    if (targetPage > 1) {
      const sep = f.directUrl.includes('?') ? '&' : '?';
      return `${f.directUrl}${sep}page=${targetPage}#page/${targetPage}`;
    }
    return f.directUrl;
  }
  const cleanBkcode = (f.bkcode || '').trim();
  const url = new URL(`https://www.calameo.com/read/${cleanBkcode}`);
  if (f.authid && f.authid.trim()) {
    url.searchParams.set('authid', f.authid.trim());
  }
  if (targetPage > 1) {
    url.searchParams.set('page', String(targetPage));
    url.searchParams.set('p', String(targetPage));
    url.hash = `page/${targetPage}`;
  }
  return url.toString();
}
