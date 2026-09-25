import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { type VolantiniZone } from './zoneService';

export interface NearbySupermarketResult {
  nearbySlugs: string[];
  nearbyStoresCount: number;
  detectedBrands: string[];
  source: 'maps' | 'cached' | 'regional_db';
}

// Mappatura tra brand/insegne trovate su OpenStreetMap / Maps e gli slug di VolantiniDb
const CHAIN_BRAND_MAP: Array<{ regex: RegExp; slug: string; name: string }> = [
  { regex: /\b(conad|margherita)\b/i, slug: 'conad', name: 'Conad' },
  { regex: /\b(coop|ipercoop)\b/i, slug: 'coop', name: 'Coop' },
  { regex: /\b(esselunga)\b/i, slug: 'esselunga', name: 'Esselunga' },
  { regex: /\b(carrefour)\b/i, slug: 'carrefour', name: 'Carrefour' },
  { regex: /\b(lidl)\b/i, slug: 'lidl', name: 'Lidl' },
  { regex: /\b(eurospin)\b/i, slug: 'eurospin', name: 'Eurospin' },
  { regex: /\b(pam)\b/i, slug: 'pam', name: 'Pam' },
  { regex: /\b(panorama)\b/i, slug: 'panorama', name: 'Panorama' },
  { regex: /\b(penny)\b/i, slug: 'penny-market', name: 'Penny Market' },
  { regex: /\b(todis)\b/i, slug: 'todis', name: 'Todis' },
  { regex: /\b(despar|eurospar|interspar)\b/i, slug: 'despar', name: 'Despar' },
  { regex: /\b(dem)\b/i, slug: 'dem', name: 'Dem Supermercati (Gruppo Gros)' },
  { regex: /\b(pewex)\b/i, slug: 'pewex', name: 'Pewex (Gruppo Gros)' },
  { regex: /\b(pim)\b/i, slug: 'pim', name: 'Pim (Gruppo Gros)' },
  { regex: /\b(cts)\b/i, slug: 'cts', name: 'CTS Supermercati (Gruppo Gros)' },
  { regex: /\b(castoro|il castoro)\b/i, slug: 'il-castoro', name: 'Il Castoro (Gruppo Gros)' },
  { regex: /\b(ipercarni)\b/i, slug: 'ipercarni', name: 'Ipercarni (Gruppo Gros)' },
  { regex: /\b(ipertriscount)\b/i, slug: 'ipertriscount', name: 'Ipertriscount (Gruppo Gros)' },
  { regex: /\b(idromarket)\b/i, slug: 'idromarket', name: 'Idromarket (Gruppo Gros)' },
  { regex: /\b(effepiu|effepiù)\b/i, slug: 'effepiu', name: 'Effepiù (Gruppo Gros)' },
  { regex: /\b(sacoph)\b/i, slug: 'sacoph', name: 'Sacoph (Gruppo Gros)' },
  { regex: /\b(gros|cedigros|maestri del fresco)\b/i, slug: 'gros', name: 'Gros - Maestri del Fresco' },
  { regex: /\b(crai)\b/i, slug: 'crai', name: 'Crai' },
  { regex: /\b(bennet)\b/i, slug: 'bennet', name: 'Bennet' },
  { regex: /\b(basko)\b/i, slug: 'basko', name: 'Basko' },
  { regex: /\b(gigante|il gigante)\b/i, slug: 'il-gigante', name: 'Il Gigante' },
  { regex: /\b(iperal)\b/i, slug: 'iperal', name: 'Iperal' },
  { regex: /\b(iper|la grande i)\b/i, slug: 'iper-la-grande-i', name: 'Iper, La grande i' },
  { regex: /\b(in's|ins mercato)\b/i, slug: 'ins', name: "iN's Mercato" },
  { regex: /\b(ali|alì)\b/i, slug: 'ali-supermercati', name: 'Alì Supermercati' },
  { regex: /\b(tigre)\b/i, slug: 'tigre', name: 'Tigre' },
  { regex: /\b(oasi)\b/i, slug: 'oasi', name: 'Oasi' },
  { regex: /\b(md)\b/i, slug: 'md-discount', name: 'MD' },
  { regex: /\b(aldi)\b/i, slug: 'aldi', name: 'Aldi' },
  { regex: /\b(deco|decò)\b/i, slug: 'deco', name: 'Decò' },
  { regex: /\b(famila)\b/i, slug: 'famila', name: 'Famila' },
  { regex: /\b(emisfero)\b/i, slug: 'emisfero-ipermercati', name: 'Emisfero Ipermercati' },
  { regex: /\b(tigros)\b/i, slug: 'tigros', name: 'Tigros' },
  { regex: /\b(unes)\b/i, slug: 'unes', name: 'Unes' },
  { regex: /\b(italmark)\b/i, slug: 'italmark', name: 'Italmark' },
  { regex: /\b(migross)\b/i, slug: 'migross', name: 'Migross' },
  { regex: /\b(prix)\b/i, slug: 'prix', name: 'Prix' },
  { regex: /\b(dpiu|dipiù)\b/i, slug: 'dpiu', name: 'Dpiù' },
  { regex: /\b(hardis)\b/i, slug: 'hardis', name: 'HarDis' },
  { regex: /\b(acqua.*sapone)\b/i, slug: 'acqua-e-sapone', name: 'Acqua e Sapone' },
  { regex: /\b(tigota|tigotà)\b/i, slug: 'tigota', name: 'Tigotà' },
  { regex: /\b(maury|maurys)\b/i, slug: 'magazzini-maurys', name: "Maury's" },
  { regex: /\b(risparmio.*casa)\b/i, slug: 'risparmiocasa', name: 'Risparmio Casa' },
  { regex: /\b(bricofer)\b/i, slug: 'bricofer', name: 'Bricofer' },
  { regex: /\b(leroy.*merlin)\b/i, slug: 'leroy-merlin', name: 'Leroy Merlin' },
  { regex: /\b(euronics)\b/i, slug: 'euronics', name: 'Euronics' },
  { regex: /\b(expert)\b/i, slug: 'expert-italia', name: 'Expert' },
  { regex: /\b(mediaworld)\b/i, slug: 'mediaworld-italia', name: 'MediaWorld' },
  { regex: /\b(unieuro)\b/i, slug: 'unieuro', name: 'Unieuro' },
  { regex: /\b(trony)\b/i, slug: 'trony', name: 'Trony' },
  { regex: /\b(comet)\b/i, slug: 'comet', name: 'Comet' }
];

// Presenza regionale e provinciale garantita per fallback istantaneo ed estensione
const REGIONAL_SUPERMARKETS: Record<string, string[]> = {
  'Lazio': [
    'gros', 'dem', 'pewex', 'pim', 'cts', 'il-castoro', 'ipercarni', 'ipertriscount',
    'idromarket', 'effepiu', 'sacoph', 'todis', 'conad', 'coop', 'carrefour', 'lidl',
    'eurospin', 'pam', 'panorama', 'penny-market', 'tigre', 'crai', 'acqua-e-sapone',
    'magazzini-maurys', 'risparmiocasa', 'bricofer', 'leroy-merlin', 'euronics', 'unieuro', 'mediaworld-italia'
  ],
  'Lombardia': [
    'esselunga', 'bennet', 'il-gigante', 'iperal', 'iper-la-grande-i', 'tigros', 'unes',
    'carrefour', 'conad', 'coop', 'lidl', 'eurospin', 'pam', 'penny-market', 'ins',
    'aldi', 'md-discount', 'italmark', 'tigota', 'acqua-e-sapone', 'leroy-merlin',
    'mediaworld-italia', 'unieuro', 'euronics', 'comet', 'trony'
  ],
  'Piemonte': [
    'carrefour', 'bennet', 'basko', 'conad', 'coop', 'lidl', 'eurospin', 'pam',
    'penny-market', 'ins', 'esselunga', 'il-gigante', 'aldi', 'md-discount',
    'tigota', 'acqua-e-sapone', 'leroy-merlin', 'unieuro', 'mediaworld-italia'
  ],
  'Veneto': [
    'ali-supermercati', 'famila', 'emisfero-ipermercati', 'despar', 'migross', 'italmark',
    'prix', 'conad', 'coop', 'lidl', 'eurospin', 'pam', 'penny-market', 'aldi',
    'tigota', 'acqua-e-sapone', 'leroy-merlin', 'unieuro', 'mediaworld-italia'
  ],
  'Emilia-Romagna': [
    'conad', 'coop', 'esselunga', 'despar', 'famila', 'carrefour', 'lidl', 'eurospin',
    'pam', 'penny-market', 'aldi', 'comet', 'tigota', 'acqua-e-sapone', 'leroy-merlin', 'unieuro'
  ],
  'Campania': [
    'deco', 'conad', 'md-discount', 'eurospin', 'carrefour', 'crai', 'lidl',
    'acqua-e-sapone', 'risparmiocasa', 'euronics', 'expert-italia', 'unieuro'
  ],
  'Toscana': [
    'coop', 'conad', 'esselunga', 'carrefour', 'pam', 'penny-market', 'lidl',
    'eurospin', 'magazzini-maurys', 'acqua-e-sapone', 'unieuro', 'euronics'
  ],
  'Sicilia': [
    'deco', 'conad', 'crai', 'eurospin', 'lidl', 'md-discount', 'penny-market',
    'acqua-e-sapone', 'expert-italia', 'euronics', 'unieuro'
  ],
  'Puglia': [
    'famila', 'dok', 'conad', 'coop', 'eurospin', 'lidl', 'penny-market', 'md-discount',
    'despar', 'acqua-e-sapone', 'expert-italia', 'euronics', 'unieuro'
  ]
};

class NearbySupermarketService {
  private memoryCache = new Map<string, NearbySupermarketResult>();

  async getNearbySupermarkets(zone: VolantiniZone | null): Promise<NearbySupermarketResult> {
    if (!zone || zone.kind === 'all') {
      return { nearbySlugs: [], nearbyStoresCount: 0, detectedBrands: [], source: 'regional_db' };
    }

    const cacheKey = `chelona_nearby_stores_${zone.cap || zone.city || zone.region}`;

    // 1. Controlla cache in memoria
    if (this.memoryCache.has(cacheKey)) {
      return this.memoryCache.get(cacheKey)!;
    }

    // 2. Controlla localStorage
    try {
      const stored = localStorage.getItem(cacheKey);
      if (stored) {
        const parsed = JSON.parse(stored) as NearbySupermarketResult;
        this.memoryCache.set(cacheKey, parsed);
        return parsed;
      }
    } catch {
      // Ignora errori di storage
    }

    // Baseline di sicurezza basata sulla regione del CAP
    const regionalBaseline = zone.region && REGIONAL_SUPERMARKETS[zone.region] 
      ? [...REGIONAL_SUPERMARKETS[zone.region]] 
      : [];

    let mapSlugs: string[] = [];
    let detectedBrands: string[] = [];
    let totalStoresCount = 0;
    let source: 'maps' | 'regional_db' = 'regional_db';

    // 3. Esegui interrogazione geografica Nominatim / Maps se abbiamo il CAP
    if (zone.cap) {
      try {
        const geoUrl = `https://nominatim.openstreetmap.org/search?postalcode=${encodeURIComponent(zone.cap)}&country=Italy&format=json&limit=1`;
        let geoData: any = null;

        if (Capacitor.isNativePlatform()) {
          const res = await CapacitorHttp.get({
            url: geoUrl,
            headers: { 'User-Agent': 'ChelonaApp/1.30 (https://chelona.app)' }
          });
          geoData = res.data;
        } else {
          const res = await fetch(geoUrl, {
            headers: { 'Accept': 'application/json', 'User-Agent': 'ChelonaApp/1.30' }
          });
          geoData = await res.json();
        }

        if (Array.isArray(geoData) && geoData[0] && geoData[0].lat && geoData[0].lon) {
          const lat = parseFloat(geoData[0].lat);
          const lon = parseFloat(geoData[0].lon);

          // Interroga Overpass API per i supermercati nel raggio di 4km dalle coordinate del CAP
          const overpassQuery = `[out:json][timeout:4];(node["shop"="supermarket"](around:4500,${lat},${lon});way["shop"="supermarket"](around:4500,${lat},${lon}););out tags 40;`;
          
          let opData: any = null;
          if (Capacitor.isNativePlatform()) {
            const opRes = await CapacitorHttp.post({
              url: 'https://overpass-api.de/api/interpreter',
              headers: { 
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'ChelonaApp/1.30' 
              },
              data: `data=${encodeURIComponent(overpassQuery)}`
            });
            opData = opRes.data;
          } else {
            const opRes = await fetch('https://overpass-api.de/api/interpreter', {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'ChelonaApp/1.30'
              },
              body: `data=${encodeURIComponent(overpassQuery)}`
            });
            opData = await opRes.json();
          }

          if (opData && Array.isArray(opData.elements) && opData.elements.length > 0) {
            totalStoresCount = opData.elements.length;
            source = 'maps';

            const matchedSlugs = new Set<string>();
            const brands = new Set<string>();

            for (const elem of opData.elements) {
              const tags = elem.tags || {};
              const nameText = `${tags.name || ''} ${tags.brand || ''} ${tags.operator || ''}`.trim();
              
              if (tags.name) brands.add(tags.name);
              if (tags.brand) brands.add(tags.brand);

              for (const mapItem of CHAIN_BRAND_MAP) {
                if (mapItem.regex.test(nameText)) {
                  matchedSlugs.add(mapItem.slug);
                  // Se è del Gruppo Gros, aggiungi anche il raccoglitore generale gros
                  if (mapItem.name.includes('Gruppo Gros')) {
                    matchedSlugs.add('gros');
                  }
                }
              }
            }

            mapSlugs = Array.from(matchedSlugs);
            detectedBrands = Array.from(brands).slice(0, 15);
          }
        }
      } catch (err) {
        console.warn('[NearbySupermarketService] Maps Overpass fetch failed, using regional database:', err);
      }
    }

    // Combina: le catene individuate da Maps hanno priorità massima, completate dalla presenza territoriale
    const combinedSlugsSet = new Set<string>([...mapSlugs, ...regionalBaseline]);
    const finalSlugs = Array.from(combinedSlugsSet);

    const result: NearbySupermarketResult = {
      nearbySlugs: finalSlugs,
      nearbyStoresCount: totalStoresCount > 0 ? totalStoresCount : finalSlugs.length,
      detectedBrands,
      source: totalStoresCount > 0 ? 'maps' : 'regional_db'
    };

    // Salva in cache
    this.memoryCache.set(cacheKey, result);
    try {
      localStorage.setItem(cacheKey, JSON.stringify(result));
    } catch {
      // Ignora quota piena
    }

    return result;
  }
}

export const nearbySupermarketService = new NearbySupermarketService();
