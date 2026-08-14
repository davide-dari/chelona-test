/*
 * Zona dell'utente per i volantini: CAP (offline) o posizione GPS
 * (reverse-geocoding Nominatim, gratuito e senza chiave API).
 */
import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { capToRegion } from '../data/capRegions';
import { CITY_REGIONS, ITALIAN_REGIONS } from '../data/italianSupermarkets';
import type { VolantinoFlyer } from '../data/volantiniDb';
import { COMUNI, PROVINCE_REGIONS } from '../data/comuni';

export interface VolantiniZone {
  kind: 'cap' | 'gps' | 'all';
  region?: string;
  city?: string;
  cap?: string;
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

/* ═══════════════════════════════════════════════════════════════════
   Matching regionale dei volantini (dal titolo/sottotitolo)
   ═══════════════════════════════════════════════════════════════════ */

const deaccent = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

/** Regex con \b per trovare una parola/frase (spazi/trattini flessibili). */
const SEP = String.raw`[\s\-']+`;
const word = (k: string) =>
  new RegExp(String.raw`\b` + deaccent(k).replace(/[\s\-']+/g, SEP) + String.raw`\b`);

/* Indice città→regione costruito una sola volta dal dataset comuni. */
let cityIndex: Map<string, string> | null = null;
let cityRegex: RegExp | null = null;
function getCityIndex(): { map: Map<string, string>; re: RegExp } {
  if (cityIndex && cityRegex) return { map: cityIndex, re: cityRegex };
  cityIndex = new Map();
  for (const c of COMUNI) {
    const cn = deaccent(c.n).replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
    if (cn.length < 3) continue;
    const region = PROVINCE_REGIONS[c.p];
    if (!region) continue;
    // ignora nomi troppo generici (anche se comuni): es. "rocca", "monte"
    if (cn.length < 4 && cn.includes(' ')) continue;
    if (!cityIndex.has(cn)) cityIndex.set(cn, region);
  }
  // regex alternata: nomi ordinati per lunghezza descrescente, boundaries \b
  const keys = [...cityIndex.keys()].sort((a, b) => b.length - a.length);
  const esc = (k: string) => k.split(' ').join(String.raw`[\s\-']+`);
  const maxLen = 80;
  const parts = keys.filter(k => k.length <= maxLen).map(esc);
  cityRegex = new RegExp(String.raw`\b(?:${parts.join('|')})\b`, 'i');
  return { map: cityIndex, re: cityRegex };
}

/** Macro-aree italiane → regioni. */
const MACRO_REGIONS: Record<string, string[]> = {
  'nordest': ['Veneto', 'Friuli-Venezia Giulia', 'Trentino-Alto Adige', 'Emilia-Romagna'],
  'nordovest': ['Piemonte', "Valle d'Aosta", 'Lombardia', 'Liguria'],
  'norditalia': ['Piemonte', "Valle d'Aosta", 'Lombardia', 'Liguria', 'Trentino-Alto Adige', 'Veneto', 'Friuli-Venezia Giulia', 'Emilia-Romagna'],
  'centronord': ['Emilia-Romagna', 'Toscana', 'Umbria', 'Marche', 'Lazio', 'Liguria'],
  'suditalia': ['Abruzzo', 'Molise', 'Campania', 'Puglia', 'Basilicata', 'Calabria', 'Sicilia'],
  'sud': ['Abruzzo', 'Molise', 'Campania', 'Puglia', 'Basilicata', 'Calabria', 'Sicilia'],
  'isole': ['Sicilia', 'Sardegna'],
  'centroitalia': ['Toscana', 'Umbria', 'Marche', 'Lazio'],
  'centro': ['Toscana', 'Umbria', 'Marche', 'Lazio'],
};

/** Nomi brevi / varianti di regioni → regione canonica. */
const REGION_ALIASES: Record<string, string> = {
  'emilia': 'Emilia-Romagna',
  'romagna': 'Emilia-Romagna',
  'trentino': 'Trentino-Alto Adige',
  'altoadige': 'Trentino-Alto Adige',
  'sudtirol': 'Trentino-Alto Adige',
  'friuli': 'Friuli-Venezia Giulia',
  'aosta': "Valle d'Aosta",
};

/** Regioni a cui si riferisce il volantino (dal testo). null = nazionale/ovunque. */
export function flyerRegions(flyer: VolantinoFlyer): Set<string> | null {
  return textRegions(`${flyer.title} ${flyer.subtitle ?? ''}`);
}

/**
 * Regioni a cui si riferisce un testo libero (nome volantino tuttiprezzi,
 * es. "ROMA- BUFALOTTA", "COOP Distribuzione Roma-UNICOOP ETRURIA").
 * null = nazionale/ovunque.
 */
export function textRegions(text: string): Set<string> | null {
  const t = deaccent(text);
  const regions = new Set<string>();
  const addRegion = (r: string) => regions.add(r);

  for (const r of ITALIAN_REGIONS) {
    if (word(r).test(t)) addRegion(r);
  }
  for (const [city, region] of Object.entries(CITY_REGIONS)) {
    if (word(city).test(t)) addRegion(region);
  }
  for (const [macro, rs] of Object.entries(MACRO_REGIONS)) {
    if (word(macro).test(t)) rs.forEach(addRegion);
  }
  for (const [alias, region] of Object.entries(REGION_ALIASES)) {
    if (word(alias).test(t)) addRegion(region);
  }
  // Città dal dataset comuni (indice compilato una volta, regex alternata)
  const { map, re } = getCityIndex();
  const hits = t.match(re);
  if (hits) {
    for (const hit of hits) {
      const key = deaccent(hit).replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
      const region = map.get(key);
      if (region) addRegion(region);
    }
  }
  return regions.size > 0 ? regions : null;
}

/** Il testo è rilevante per la zona dell'utente? (volantini tuttiprezzi) */
export function textMatchesZone(zone: VolantiniZone | null, text: string): boolean {
  if (!zone || zone.kind === 'all' || !zone.region) return true;
  const regions = textRegions(text);
  if (!regions) return true; // nazionale
  return regions.has(zone.region);
}

/** Il volantino è rilevante per la zona dell'utente? */
export function flyerMatchesZone(zone: VolantiniZone | null, flyer: VolantinoFlyer): boolean {
  if (!zone || zone.kind === 'all' || !zone.region) return true;
  const regions = flyerRegions(flyer);
  if (!regions) return true; // nazionale
  return regions.has(zone.region);
}
