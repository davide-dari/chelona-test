import { useSyncExternalStore } from 'react';
import {
  getDcDataVersion, subscribeDcData, applyLiveDcData,
  type DcFlyer
} from '../data/doveconvieneDb';

const DC_DATA_URL = 'https://raw.githubusercontent.com/davide-dari/chelona-test/dc-data/dc-data.json';
const CACHE_KEY = 'chelona_dc_data_v1';
const CACHE_MAX_AGE_MS = 12 * 60 * 60 * 1000; // 12h
const FETCH_TIMEOUT_MS = 30000;

interface DcDataFile {
  g?: number;
  f?: Record<string, DcFlyer>;
  c?: Record<string, Record<string, string>>;
  k?: Record<string, string>;
}

/* Il JSON è ~4 MB: supererebbe la quota di localStorage (5 MB, raddoppiata
   in UTF-16), quindi la cache viene compressa con gzip via CompressionStream
   (disponibile da Chrome 80). */
async function compress(s: string): Promise<string | null> {
  try {
    const cs = new CompressionStream('gzip');
    const stream = new Blob([s]).stream().pipeThrough(cs);
    const buf = await new Response(stream).arrayBuffer();
    const bytes = new Uint8Array(buf);
    let bin = '';
    const CHUNK = 0x8000;
    for (let i = 0; i < bytes.length; i += CHUNK) {
      bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
    }
    return btoa(bin);
  } catch {
    return null;
  }
}

async function decompress(s: string): Promise<string | null> {
  try {
    const bin = atob(s);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const ds = new DecompressionStream('gzip');
    const stream = new Blob([bytes]).stream().pipeThrough(ds);
    const buf = await new Response(stream).arrayBuffer();
    return new TextDecoder().decode(buf);
  } catch {
    return null;
  }
}

let lastFetchAt = 0;
let fetchInFlight: Promise<boolean> | null = null;

async function readCache(): Promise<DcDataFile | null> {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { t: number; z: string };
    if (!parsed || !parsed.z || typeof parsed.z !== 'string') return null;
    if (Date.now() - parsed.t > CACHE_MAX_AGE_MS) return null;
    const text = await decompress(parsed.z);
    if (!text) return null;
    const d = JSON.parse(text) as DcDataFile;
    if (!d.f || Object.keys(d.f).length < 100) return null;
    return d;
  } catch {
    return null;
  }
}

async function writeCache(d: DcDataFile): Promise<void> {
  try {
    const z = await compress(JSON.stringify(d));
    if (!z) return;
    localStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), z }));
  } catch (e) {
    console.warn('[dcData] cache non salvata', e);
  }
}

async function fetchLive(): Promise<DcDataFile | null> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    const r = await fetch(DC_DATA_URL, {
      signal: ctrl.signal,
      cache: 'no-cache',
    });
    clearTimeout(timer);
    if (!r.ok) return null;
    const d = (await r.json()) as DcDataFile;
    if (!d.f || Object.keys(d.f).length < 100) return null;
    if (!d.c || Object.keys(d.c).length < 50) return null;
    return d;
  } catch (e) {
    console.warn('[dcData] fetch fallita', e);
    return null;
  }
}

function apply(d: DcDataFile): void {
  applyLiveDcData({ f: d.f, c: d.c, k: d.k });
  writeCache(d);
}

/** Carica i dati live: cache locale immediata + fetch GitHub.
 *  Ritorna true se i dati sono stati aggiornati (live o cache). */
export async function initDcData(force = false): Promise<boolean> {
  if (fetchInFlight) return fetchInFlight;
  fetchInFlight = (async () => {
    const cached = await readCache();
    if (cached) {
      apply(cached);
      lastFetchAt = Date.now();
      return true;
    }
    const live = await fetchLive();
    if (live) {
      apply(live);
      lastFetchAt = Date.now();
      return true;
    }
    return false;
  })();
  try {
    return await fetchInFlight;
  } finally {
    fetchInFlight = null;
  }
}

/** Forza un aggiornamento dal GitHub anche se la cache è fresca. */
export async function refreshDcData(): Promise<boolean> {
  const live = await fetchLive();
  if (live) {
    apply(live);
    lastFetchAt = Date.now();
    return true;
  }
  return false;
}

/** Hook React: fa ri-renderizzare i componenti quando i dati volantini cambiano. */
export function useDcDataVersion(): number {
  return useSyncExternalStore(subscribeDcData, getDcDataVersion, getDcDataVersion);
}

export function dcDataLastFetch(): number {
  return lastFetchAt;
}
