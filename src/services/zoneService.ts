/*
 * Zona dell'utente per i volantini: CAP (offline) o posizione GPS
 * (reverse-geocoding Nominatim, gratuito e senza chiave API).
 */
import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { capToRegion } from '../data/capRegions';
import { ITALIAN_REGIONS } from '../data/italianSupermarkets';
import { COMUNI, PROVINCE_REGIONS } from '../data/comuni';

export interface VolantiniZone {
  kind: 'cap' | 'gps' | 'all';
  region?: string;
  city?: string;
  cap?: string;
  /** Sigla provincia (es. "MI") */
  provincia?: string;
  /** Etichetta compatta da mostrare nell'UI (es. "20100 · Milano") */
  label: string;
}

const ZONE_KEY = 'chelona_volantini_zone_v1';

export function loadZone(): VolantiniZone | null {
  try {
    const raw = localStorage.getItem(ZONE_KEY);
    if (!raw) return null;
    const z = JSON.parse(raw) as VolantiniZone;
    if (z && z.kind && z.label) return z;
  } catch { /* ignore */ }
  return null;
}

export function saveZone(zone: VolantiniZone): void {
  try { localStorage.setItem(ZONE_KEY, JSON.stringify(zone)); } catch { /* ignore */ }
}

/** Risolve un CAP in zona (tabella offline). */
export function resolveCap(cap: string): VolantiniZone | null {
  const c = cap.trim();
  const hit = capToRegion(c);
  if (!hit) return null;
  return {
    kind: 'cap',
    cap: c,
    region: hit.region,
    city: hit.city,
    provincia: hit.sigla,
    label: hit.city ? `${c} · ${hit.city}` : `${c} · ${hit.region}`,
  };
}

/**
 * Risolve una città (nome del comune) in zona, trovando CAP e regione
 * dal dataset comuni. Accetta anche "Comune di X" e nomi parziali esatti.
 */
export function resolveCity(name: string): VolantiniZone | null {
  const n = name.trim();
  if (n.length < 2) return null;
  const deaccent = (s: string) =>
    s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  const q = deaccent(n).replace(/^(comune di|comune)\s+/, '').replace(/[^a-z0-9]+/g, ' ');
  if (q.length < 2) return null;
  // Match esatto per nome comune
  let best: { n: string; p: string; c: string } | null = null;
  let bestScore = -1;
  for (const c of COMUNI) {
    const cn = deaccent(c.n).replace(/[^a-z0-9]+/g, ' ');
    if (cn === q) { best = c; bestScore = 3; break; }
    if (cn.startsWith(q) && bestScore < 2) { best = c; bestScore = 2; }
  }
  if (!best) return null;
  const region = PROVINCE_REGIONS[best.p];
  if (!region) return null;
  return {
    kind: 'cap',
    cap: best.c,
    region,
    city: best.n,
    provincia: best.p,
    label: `${best.n} · ${region}`,
  };
}

/** Normalizza il nome regione restituito da Nominatim ai nomi ITALIAN_REGIONS. */
function normalizeRegionName(raw: string): string | undefined {
  const norm = (s: string) =>
    s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  const n = norm(raw);
  const exact = ITALIAN_REGIONS.find(r => norm(r) === n);
  if (exact) return exact;
  // Varianti tipiche di Nominatim
  if (n.includes('south tirol') || n.includes('trentino alto adige') || n.includes('sudtirol')) {
    return 'Trentino-Alto Adige';
  }
  if (n.includes('valle d aosta') || n.includes("vallee d aoste") || n.includes('aosta valley')) {
    return "Valle d'Aosta";
  }
  if (n.includes('friuli')) return 'Friuli-Venezia Giulia';
  if (n.includes('emilia romagna')) return 'Emilia-Romagna';
  // "Venezia" è il nome ufficiale del Veneto in alcuni servizi
  if (n === 'venezia') return 'Veneto';
  const partial = ITALIAN_REGIONS.find(r => n.includes(norm(r)));
  return partial;
}

/** Reverse-geocoding Nominatim: coordinate → { region, city, cap }. */
async function reverseGeocode(lat: number, lon: number): Promise<{ region?: string; city?: string; cap?: string } | null> {
  const url =
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}` +
    `&format=jsonv2&addressdetails=1&accept-language=it`;
  try {
    let data: any = null;
    if (Capacitor.isNativePlatform()) {
      const res = await CapacitorHttp.get({
        url,
        headers: { 'User-Agent': 'ChelonaApp/1.0' },
      });
      data = res.data;
    } else {
      const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
      data = await res.json();
    }
    if (!data || !data.address) return null;
    const a = data.address;
    const city =
      a.city || a.town || a.village || a.municipality || a.county || a.state_district || undefined;
    const region = a.state ? normalizeRegionName(a.state) : undefined;
    const cap = typeof a.postcode === 'string' ? a.postcode.replace(/\D/g, '').slice(0, 5) : undefined;
    return { region, city, cap };
  } catch {
    return null;
  }
}

/** Posizione GPS → zona (con fallback sul CAP restituito da Nominatim). */
export async function resolveGps(): Promise<VolantiniZone | null> {
  try {
    const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 15000 });
    const { latitude, longitude } = pos.coords;
    const geo = await reverseGeocode(latitude, longitude);
    let region = geo?.region;
    let cap = geo?.cap;
    let city = geo?.city;
    if (!region && cap) {
      const hit = capToRegion(cap);
      if (hit) {
        region = hit.region;
        city = city ?? hit.city;
      }
    }
    if (!region) {
      // Ultima spiaggia: impossibile determinare la regione
      return null;
    }
    const label = city ? `${city} · ${region}` : region;
    return { kind: 'gps', region, city, cap, label };
  } catch {
    return null;
  }
}

export const ALL_ITALY_ZONE: VolantiniZone = { kind: 'all', label: 'Tutta Italia' };
