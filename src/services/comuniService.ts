/*
 * Ricerca comuni italiani: autocomplete per nome o CAP.
 * Dataset bundle: src/data/comuni.ts (~7.9k comuni).
 */
import { COMUNI, PROVINCE_REGIONS } from '../data/comuni';
import type { Comune } from '../data/comuni';

const deaccent = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export interface ComuneSuggestion extends Comune {
  region: string;
}

/** Normalizza il nome del comune (rimuove "Comune di", normalizza spazi). */
const normName = (s: string) =>
  deaccent(s)
    .replace(/^(comune di|comune)\s+/, '')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Suggerimenti per prefisso del nome (max `limit`). */
export function searchComuni(query: string, limit = 8): ComuneSuggestion[] {
  const q = normName(query);
  if (!q) return [];
  const out: ComuneSuggestion[] = [];
  // prima i match esatti/prefix, poi i match contenuti (per non far scattare il limite)
  for (const c of COMUNI) {
    const n = normName(c.n);
    if (n.startsWith(q)) {
      out.push({ ...c, region: PROVINCE_REGIONS[c.p] ?? '' });
      if (out.length >= limit) break;
    }
  }
  if (out.length < limit) {
    for (const c of COMUNI) {
      const n = normName(c.n);
      if (out.some(x => x.n === c.n && x.p === c.p)) continue;
      if (n.includes(q) && !n.startsWith(q)) {
        out.push({ ...c, region: PROVINCE_REGIONS[c.p] ?? '' });
        if (out.length >= limit) break;
      }
    }
  }
  return out;
}

/** Comune esatto per nome (o null). */
export function findComune(name: string): ComuneSuggestion | null {
  const q = normName(name);
  if (!q) return null;
  const exact = COMUNI.find(c => normName(c.n) === q);
  if (exact) return { ...exact, region: PROVINCE_REGIONS[exact.p] ?? '' };
  return null;
}

/** Comune/i per CAP (match per prefisso: "20100" → Milano 20121). */
export function comuniByCap(cap: string): ComuneSuggestion[] {
  const c = cap.trim();
  if (!/^\d{5}$/.test(c)) return [];
  const hits = COMUNI.filter(x => x.c.startsWith(c.slice(0, 3)) || x.c === c).slice(0, 5);
  return hits.map(x => ({ ...x, region: PROVINCE_REGIONS[x.p] ?? '' }));
}

/** Lista dei capoluoghi di provincia per suggerimenti rapidi. */
export function capoluoghi(): ComuneSuggestion[] {
  const out: ComuneSuggestion[] = [];
  const seen = new Set<string>();
  for (const c of COMUNI) {
    const key = `${c.n}|${c.p}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ ...c, region: PROVINCE_REGIONS[c.p] ?? '' });
  }
  return out;
}