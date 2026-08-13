import { Capacitor } from '@capacitor/core';
import { CapacitorHttp } from '@capacitor/core';
import { VOLANTINI_DB } from '../data/volantiniDb';
import type { VolantiniDb, VolantinoChain, VolantinoFlyer } from '../data/volantiniDb';

const BASE = 'https://www.centrovolantini.it';
const UA =
  'Mozilla/5.0 (Linux; Android 14; Chelona) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Mobile Safari/537.36';
const CACHE_KEY = 'chelona_volantini_db_v1';
const CACHE_TTL = 6 * 60 * 60 * 1000;

interface DbCache {
  savedAt: number;
  db: VolantiniDb;
}

function loadCache(): DbCache | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DbCache;
    if (!parsed?.db?.chains?.length) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveCache(db: VolantiniDb) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), db } satisfies DbCache));
  } catch {
    /* quota */
  }
}

/** GET html con CapacitorHttp su nativo (bypassa CORS), fetch su web. */
export async function fetchHtml(url: string): Promise<string | null> {
  try {
    if (Capacitor.isNativePlatform()) {
      const res = await CapacitorHttp.get({
        url,
        headers: { 'user-agent': UA, accept: 'text/html' },
        connectTimeout: 20000,
        readTimeout: 60000,
      });
      if (res.status >= 200 && res.status < 300 && typeof res.data === 'string') return res.data;
    } else {
      const res = await fetch(url, { headers: { 'user-agent': UA } });
      if (res.ok) return await res.text();
    }
  } catch (e) {
    console.warn('[Volantini] fetch fallito:', url, e);
  }
  return null;
}

const humanize = (slug: string) =>
  slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

export interface NovitaItem {
  slug: string;
  id: number;
  coverUrl: string;
  subtitle?: string;
}

/** Estrae le righe della vista "Novità" dalla pagina /volantini. */
export function parseNovita(html: string): NovitaItem[] {
  const out: NovitaItem[] = [];
  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
  let m: RegExpExecArray | null;
  while ((m = rowRe.exec(html))) {
    const row = m[1];
    if (!/views-field-field-copertina/.test(row)) continue;
    const slug = /href="\/volantino-([a-z0-9-]+)"/.exec(row)?.[1];
    const idM = /href="\/node\/(\d+)"/.exec(row);
    const cover =
      /src="([^"]+)"[^>]*alt="Copertina[^"]*"/.exec(row) ||
      /<img[^>]*class="image-style-thumb-copertina"[^>]*src="([^"]+)"/.exec(row);
    const sub = /views-field-field-subtitle">[\s\S]*?field-content">([^<]+)</.exec(row);
    if (slug && idM) {
      out.push({
        slug,
        id: Number(idM[1]),
        coverUrl: cover?.[1] ?? cover?.[2] ?? '',
        subtitle: sub?.[1]?.trim(),
      });
    }
  }
  return out;
}

const mergeDb = (target: VolantiniDb, source: VolantiniDb) => {
  const bySlug = new Map(target.chains.map((c) => [c.slug, c]));
  for (const srcChain of source.chains) {
    const chain = bySlug.get(srcChain.slug);
    if (chain) {
      for (const srcF of srcChain.flyers) {
        const existing = chain.flyers.find((f) => f.id === srcF.id);
        if (existing) {
          if (srcF.bkcode) existing.bkcode = srcF.bkcode;
          if (srcF.authid) existing.authid = srcF.authid;
        } else {
          chain.flyers.unshift(srcF);
        }
      }
    } else {
      target.chains.push(srcChain);
      bySlug.set(srcChain.slug, srcChain);
    }
  }
};

/**
 * Dataset volantini: snapshot bundled se la cache è scadente,
 * altrimenti l'ultimo refresh salvato in locale.
 */
export function getVolantiniDb(): VolantiniDb {
  const cached = loadCache();
  if (cached && Date.now() - cached.savedAt < CACHE_TTL) return cached.db;
  return VOLANTINI_DB;
}

/**
 * Aggiorna il dataset da centrovolantini.it (pagine /volantini),
 * conservando titoli/date/bkcode noti e aggiungendo i volantini nuovi.
 */
export async function refreshVolantini(): Promise<VolantiniDb> {
  const base: VolantiniDb = JSON.parse(JSON.stringify(VOLANTINI_DB));
  const cached = loadCache();
  if (cached?.db) mergeDb(base, cached.db);

  let html = '';
  for (const page of [0, 1]) {
    const h = await fetchHtml(`${BASE}/volantini${page > 0 ? `?page=${page}` : ''}`);
    if (h) html += h;
  }
  if (!html) return cached?.db ?? base;

  const bySlug = new Map(base.chains.map((c) => [c.slug, c]));
  for (const item of parseNovita(html)) {
    const chain = bySlug.get(item.slug);
    if (chain) {
      const existing = chain.flyers.find((f) => f.id === item.id);
      if (existing) {
        existing.coverUrl = item.coverUrl;
        existing.subtitle = item.subtitle;
      } else {
        chain.flyers.unshift({
          id: item.id,
          title: 'Volantino',
          subtitle: item.subtitle,
          coverUrl: item.coverUrl,
        });
      }
    } else {
      const fresh: VolantinoChain = {
        slug: item.slug,
        name: humanize(item.slug),
        flyers: [
          {
            id: item.id,
            title: 'Volantino',
            subtitle: item.subtitle,
            coverUrl: item.coverUrl,
          },
        ],
      };
      base.chains.unshift(fresh);
      bySlug.set(item.slug, fresh);
    }
  }
  base.updatedAt = new Date().toISOString();
  saveCache(base);
  return base;
}

/** Risolve bkcode/authid Calameo per un volantino (pagina /node/<id>). */
export async function ensureBkcode(flyer: VolantinoFlyer): Promise<VolantinoFlyer> {
  if (flyer.bkcode) return flyer;
  const html = await fetchHtml(`${BASE}/node/${flyer.id}`);
  if (html) {
    const bk = /bkcode=([0-9a-f]+)/.exec(html);
    const auth = /authid=([A-Za-z0-9]+)/.exec(html);
    if (bk) {
      const updated: VolantinoFlyer = {
        ...flyer,
        bkcode: bk[1],
        authid: auth?.[1],
      };
      const cached = loadCache();
      if (cached?.db) {
        for (const c of cached.db.chains) {
          const f = c.flyers.find((x) => x.id === flyer.id);
          if (f) {
            f.bkcode = updated.bkcode;
            f.authid = updated.authid;
          }
        }
        saveCache(cached.db);
      }
      return updated;
    }
  }
  return flyer;
}

export const volantinoViewerUrl = (flyer: VolantinoFlyer) =>
  `https://v.calameo.com/?bkcode=${flyer.bkcode}${flyer.authid ? `&authid=${flyer.authid}` : ''}&mobiledirect=1`;

export const volantinoNodeUrl = (id: number) => `${BASE}/node/${id}`;

const fmtShort = (iso?: string) => {
  if (!iso) return undefined;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return undefined;
  return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
};

export const formatValidity = (flyer: VolantinoFlyer) => {
  const from = fmtShort(flyer.from);
  const to = fmtShort(flyer.to);
  if (!from && !to) return undefined;
  if (from && to) return `Dal ${from} al ${to}`;
  return from ? `Dal ${from}` : `Al ${to}`;
};
