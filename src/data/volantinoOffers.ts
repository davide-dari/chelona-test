import type { VolantinoOffer } from '../types';

export type StoreId =
  | 'conad' | 'coop' | 'esselunga' | 'lidl' | 'aldi'
  | 'penny' | 'eurospin' | 'carrefour' | 'despar' | 'tigre'
  | 'gros' | 'ipergros' | 'grosmarket' | 'megamarket' | 'familycenter'
  | 'todis' | 'carrefourmarket' | 'carrefourexpress';

export interface VolantinoStore {
  id: StoreId;
  label: string;
  short: string;
  text: string;
  bg: string;
  border: string;
  budget?: boolean;
}

export const VOLANTINO_STORES: VolantinoStore[] = [
  { id: 'conad', label: 'Conad', short: 'CO', text: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/40' },
  { id: 'coop', label: 'Coop', short: 'CC', text: 'text-orange-400', bg: 'bg-orange-400/10', border: 'border-orange-400/40' },
  { id: 'esselunga', label: 'Esselunga', short: 'ES', text: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/40', budget: false },
  { id: 'lidl', label: 'Lidl', short: 'LI', text: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/40', budget: true },
  { id: 'aldi', label: 'Aldi', short: 'AL', text: 'text-cyan-400', bg: 'bg-cyan-400/10', border: 'border-cyan-400/40', budget: true },
  { id: 'penny', label: 'Penny Market', short: 'PM', text: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/40', budget: true },
  { id: 'eurospin', label: 'Eurospin', short: 'EU', text: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/40', budget: true },
  { id: 'carrefour', label: 'Carrefour', short: 'CA', text: 'text-sky-400', bg: 'bg-sky-400/10', border: 'border-sky-400/40' },
  { id: 'despar', label: 'Despar', short: 'DE', text: 'text-teal-400', bg: 'bg-teal-400/10', border: 'border-teal-400/40' },
  { id: 'tigre', label: 'Tigre', short: 'TI', text: 'text-pink-400', bg: 'bg-pink-400/10', border: 'border-pink-400/40', budget: true },
  { id: 'gros', label: 'Gros', short: 'GR', text: 'text-green-600', bg: 'bg-green-600/10', border: 'border-green-600/40' },
  { id: 'ipergros', label: 'IperGros', short: 'IG', text: 'text-lime-500', bg: 'bg-lime-500/10', border: 'border-lime-500/40' },
  { id: 'grosmarket', label: 'Gros Market', short: 'GM', text: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/40' },
  { id: 'megamarket', label: 'Megamarket', short: 'MM', text: 'text-fuchsia-500', bg: 'bg-fuchsia-500/10', border: 'border-fuchsia-500/40', budget: true },
  { id: 'familycenter', label: 'Family Center', short: 'FC', text: 'text-rose-400', bg: 'bg-rose-400/10', border: 'border-rose-400/40' },
  { id: 'todis', label: 'Todis', short: 'TD', text: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/40', budget: true },
  { id: 'carrefourmarket', label: 'Carrefour Market', short: 'CM', text: 'text-sky-500', bg: 'bg-sky-500/10', border: 'border-sky-500/40' },
  { id: 'carrefourexpress', label: 'Carrefour Express', short: 'CE', text: 'text-sky-600', bg: 'bg-sky-600/10', border: 'border-sky-600/40' },
];

export function storeById(id: string): VolantinoStore {
  return VOLANTINO_STORES.find(s => s.id === id) ?? { id: id as StoreId, label: id, short: id.slice(0, 2).toUpperCase(), text: 'text-slate-300', bg: 'bg-slate-300/10', border: 'border-slate-300/40' };
}

type Row = [productName: string, quantity: string, offers: [StoreId, number][]];

const DEMO: Row[] = [
  ['Latte intero', '1 L', [['conad', 1.19], ['coop', 1.25], ['esselunga', 1.15], ['lidl', 1.09], ['aldi', 1.05], ['penny', 1.15], ['eurospin', 1.09], ['carrefour', 1.29]]],
  ['Uova', '6 pz', [['conad', 1.99], ['coop', 2.29], ['esselunga', 2.19], ['lidl', 1.79], ['aldi', 1.69], ['penny', 1.89], ['eurospin', 1.59]]],
  ['Pane in cassetta', '450 g', [['conad', 1.39], ['coop', 1.49], ['esselunga', 1.29], ['lidl', 1.19], ['aldi', 1.15], ['penny', 1.29], ['carrefour', 1.45]]],
  ['Spaghetti', '500 g', [['conad', 0.89], ['coop', 0.99], ['esselunga', 0.79], ['lidl', 0.69], ['aldi', 0.65], ['penny', 0.79], ['eurospin', 0.59]]],
  ['Penne rigate', '500 g', [['conad', 0.89], ['coop', 0.99], ['esselunga', 0.85], ['lidl', 0.69], ['aldi', 0.65], ['penny', 0.75], ['eurospin', 0.62]]],
  ['Riso Carnaroli', '1 kg', [['conad', 3.49], ['coop', 3.29], ['esselunga', 2.99], ['lidl', 2.79], ['aldi', 2.59], ['penny', 3.19], ['eurospin', 2.69]]],
  ['Passata di pomodoro', '700 g', [['conad', 1.29], ['coop', 1.39], ['esselunga', 1.19], ['lidl', 0.99], ['aldi', 0.95], ['penny', 1.09], ['eurospin', 0.89]]],
  ['Pomodori pelati', '400 g', [['conad', 0.99], ['coop', 1.09], ['esselunga', 0.95], ['lidl', 0.79], ['aldi', 0.75], ['penny', 0.85], ['eurospin', 0.72]]],
  ['Olio extravergine di oliva', '1 L', [['conad', 9.99], ['coop', 10.49], ['esselunga', 9.49], ['lidl', 8.99], ['aldi', 8.49], ['penny', 9.29], ['eurospin', 8.79]]],
  ['Tonno in scatola', '160 g', [['conad', 1.99], ['coop', 2.09], ['esselunga', 1.89], ['lidl', 1.59], ['aldi', 1.49], ['penny', 1.69], ['eurospin', 1.39]]],
  ['Mozzarella', '125 g', [['conad', 1.29], ['coop', 1.39], ['esselunga', 1.19], ['lidl', 0.99], ['aldi', 0.95], ['penny', 1.09], ['eurospin', 0.89]]],
  ['Parmigiano Reggiano', '200 g', [['conad', 5.49], ['coop', 5.29], ['esselunga', 4.99], ['lidl', 4.79], ['aldi', 4.59], ['penny', 4.99], ['eurospin', 4.49]]],
  ['Yogurt bianco', '4x125 g', [['conad', 2.29], ['coop', 2.49], ['esselunga', 2.19], ['lidl', 1.79], ['aldi', 1.69], ['penny', 1.99], ['eurospin', 1.59]]],
  ['Burro', '250 g', [['conad', 2.99], ['coop', 3.19], ['esselunga', 2.79], ['lidl', 2.49], ['aldi', 2.39], ['penny', 2.69], ['eurospin', 2.29]]],
  ['Petto di pollo', '500 g', [['conad', 5.49], ['coop', 5.29], ['esselunga', 4.99], ['lidl', 4.79], ['aldi', 4.69], ['penny', 4.99], ['carrefour', 5.29]]],
  ['Filetto di salmone', '300 g', [['conad', 7.99], ['coop', 8.49], ['esselunga', 7.49], ['lidl', 6.99], ['aldi', 6.49], ['penny', 7.29], ['eurospin', 6.79]]],
  ['Macinato di manzo', '500 g', [['conad', 5.99], ['coop', 6.29], ['esselunga', 5.49], ['lidl', 4.99], ['aldi', 4.79], ['penny', 5.29], ['eurospin', 4.89]]],
  ['Prosciutto cotto', '100 g', [['conad', 2.29], ['coop', 2.49], ['esselunga', 2.19], ['lidl', 1.79], ['aldi', 1.69], ['penny', 1.99], ['eurospin', 1.59]]],
  ['Bresaola', '80 g', [['conad', 3.29], ['coop', 3.49], ['esselunga', 2.99], ['lidl', 2.79], ['aldi', 2.69], ['penny', 2.99], ['eurospin', 2.59]]],
  ['Banana', '1 kg', [['conad', 1.29], ['coop', 1.39], ['esselunga', 1.19], ['lidl', 0.99], ['aldi', 0.95], ['penny', 1.09], ['eurospin', 0.99]]],
  ['Mele Golden', '1 kg', [['conad', 1.99], ['coop', 2.09], ['esselunga', 1.79], ['lidl', 1.49], ['aldi', 1.39], ['penny', 1.59], ['carrefour', 1.89]]],
  ['Arancia', '1 kg', [['conad', 1.49], ['coop', 1.59], ['esselunga', 1.39], ['lidl', 1.19], ['aldi', 1.09], ['penny', 1.29], ['eurospin', 1.19]]],
  ['Patate', '1 kg', [['conad', 1.19], ['coop', 1.29], ['esselunga', 1.09], ['lidl', 0.89], ['aldi', 0.79], ['penny', 0.99], ['eurospin', 0.79]]],
  ['Pomodori cuore di bue', '500 g', [['conad', 2.19], ['coop', 2.39], ['esselunga', 1.99], ['lidl', 1.69], ['aldi', 1.59], ['penny', 1.89], ['eurospin', 1.69]]],
  ['Insalata iceberg', '1 pz', [['conad', 1.29], ['coop', 1.39], ['esselunga', 1.19], ['lidl', 0.99], ['aldi', 0.89], ['penny', 1.09], ['eurospin', 0.99]]],
  ['Carote', '1 kg', [['conad', 1.09], ['coop', 1.19], ['esselunga', 0.99], ['lidl', 0.79], ['aldi', 0.69], ['penny', 0.89], ['eurospin', 0.75]]],
  ['Caffè macinato', '250 g', [['conad', 3.49], ['coop', 3.69], ['esselunga', 3.29], ['lidl', 2.99], ['aldi', 2.79], ['penny', 3.19], ['eurospin', 2.89]]],
  ['Zucchero', '1 kg', [['conad', 1.19], ['coop', 1.29], ['esselunga', 1.09], ['lidl', 0.89], ['aldi', 0.85], ['penny', 0.99], ['eurospin', 0.79]]],
  ['Farina 00', '1 kg', [['conad', 1.09], ['coop', 1.19], ['esselunga', 0.99], ['lidl', 0.79], ['aldi', 0.69], ['penny', 0.89], ['eurospin', 0.69]]],
  ['Fette biscottate', '350 g', [['conad', 1.79], ['coop', 1.89], ['esselunga', 1.59], ['lidl', 1.29], ['aldi', 1.19], ['penny', 1.39], ['eurospin', 1.09]]],
  ['Biscotti secchi', '500 g', [['conad', 2.49], ['coop', 2.69], ['esselunga', 2.29], ['lidl', 1.79], ['aldi', 1.69], ['penny', 1.99], ['eurospin', 1.59]]],
  ['Cioccolato fondente', '100 g', [['conad', 1.79], ['coop', 1.89], ['esselunga', 1.59], ['lidl', 1.29], ['aldi', 1.19], ['penny', 1.49], ['eurospin', 1.29]]],
  ['Nutella', '750 g', [['conad', 4.49], ['coop', 4.69], ['esselunga', 4.29], ['lidl', 3.99], ['aldi', 3.89], ['penny', 4.19], ['eurospin', 3.99]]],
  ['Acqua minerale', '6x1.5 L', [['conad', 1.99], ['coop', 2.19], ['esselunga', 1.89], ['lidl', 1.49], ['aldi', 1.39], ['penny', 1.59], ['eurospin', 1.29]]],
  ['Bibita cola', '1.5 L', [['conad', 2.19], ['coop', 2.29], ['esselunga', 1.99], ['lidl', 1.79], ['aldi', 1.69], ['penny', 1.89], ['eurospin', 1.59]]],
  ['Birra', '6x33 cl', [['conad', 5.49], ['coop', 5.99], ['esselunga', 5.19], ['lidl', 4.49], ['aldi', 4.29], ['penny', 4.99], ['eurospin', 4.49]]],
  ['Detersivo piatti', '750 ml', [['conad', 1.99], ['coop', 2.09], ['esselunga', 1.79], ['lidl', 1.49], ['aldi', 1.39], ['penny', 1.59], ['eurospin', 1.49]]],
  ['Carta igienica', '8 rotoli', [['conad', 3.49], ['coop', 3.69], ['esselunga', 3.29], ['lidl', 2.79], ['aldi', 2.59], ['penny', 2.99], ['eurospin', 2.69]]],
  ['Dentifricio', '75 ml', [['conad', 1.99], ['coop', 2.19], ['esselunga', 1.89], ['lidl', 1.59], ['aldi', 1.49], ['penny', 1.69], ['eurospin', 1.39]]],
  ['Scottex', '4 rotoli', [['conad', 2.29], ['coop', 2.49], ['esselunga', 2.19], ['lidl', 1.79], ['aldi', 1.69], ['penny', 1.99], ['eurospin', 1.59]]],
  ['Sapone mani', '250 ml', [['conad', 1.49], ['coop', 1.59], ['esselunga', 1.39], ['lidl', 1.19], ['aldi', 1.09], ['penny', 1.29], ['carrefour', 1.49]]],

  ['Latte intero', '1 L', [['gros', 1.12], ['ipergros', 1.10], ['grosmarket', 1.18], ['megamarket', 1.15], ['familycenter', 1.19], ['todis', 1.09], ['carrefourmarket', 1.24], ['carrefourexpress', 1.29]]],
  ['Spaghetti', '500 g', [['gros', 0.79], ['ipergros', 0.75], ['grosmarket', 0.85], ['megamarket', 0.82], ['familycenter', 0.89], ['todis', 0.69], ['carrefourmarket', 0.99], ['carrefourexpress', 1.05]]],
  ['Riso Carnaroli', '1 kg', [['gros', 2.89], ['ipergros', 2.79], ['grosmarket', 3.09], ['megamarket', 2.99], ['familycenter', 3.19], ['todis', 2.69], ['carrefourmarket', 3.39], ['carrefourexpress', 3.59]]],
  ['Passata di pomodoro', '700 g', [['gros', 1.09], ['ipergros', 1.05], ['grosmarket', 1.19], ['megamarket', 1.12], ['familycenter', 1.25], ['todis', 0.99], ['carrefourmarket', 1.29], ['carrefourexpress', 1.39]]],
  ['Olio extravergine di oliva', '1 L', [['gros', 8.99], ['ipergros', 8.79], ['grosmarket', 9.49], ['megamarket', 9.19], ['familycenter', 9.79], ['todis', 8.49], ['carrefourmarket', 9.99], ['carrefourexpress', 10.49]]],
  ['Tonno in scatola', '160 g', [['gros', 1.69], ['ipergros', 1.59], ['grosmarket', 1.79], ['megamarket', 1.75], ['familycenter', 1.85], ['todis', 1.49], ['carrefourmarket', 1.99], ['carrefourexpress', 2.09]]],
  ['Mozzarella', '125 g', [['gros', 1.09], ['ipergros', 1.05], ['grosmarket', 1.19], ['megamarket', 1.12], ['familycenter', 1.25], ['todis', 0.99], ['carrefourmarket', 1.35], ['carrefourexpress', 1.45]]],
  ['Petto di pollo', '500 g', [['gros', 4.99], ['ipergros', 4.89], ['grosmarket', 5.19], ['megamarket', 5.09], ['familycenter', 5.29], ['todis', 4.79], ['carrefourmarket', 5.39], ['carrefourexpress', 5.59]]],
  ['Banana', '1 kg', [['gros', 1.09], ['ipergros', 1.05], ['grosmarket', 1.19], ['megamarket', 1.15], ['familycenter', 1.25], ['todis', 0.99], ['carrefourmarket', 1.29], ['carrefourexpress', 1.35]]],
  ['Caffè macinato', '250 g', [['gros', 3.19], ['ipergros', 3.09], ['grosmarket', 3.39], ['megamarket', 3.29], ['familycenter', 3.49], ['todis', 2.99], ['carrefourmarket', 3.59], ['carrefourexpress', 3.79]]],
  ['Carta igienica', '8 rotoli', [['gros', 2.99], ['ipergros', 2.89], ['grosmarket', 3.19], ['megamarket', 3.09], ['familycenter', 3.29], ['todis', 2.79], ['carrefourmarket', 3.39], ['carrefourexpress', 3.59]]],
  ['Nutella', '750 g', [['gros', 4.09], ['ipergros', 3.99], ['grosmarket', 4.29], ['megamarket', 4.19], ['familycenter', 4.39], ['todis', 3.89], ['carrefourmarket', 4.49], ['carrefourexpress', 4.69]]],
  ['Acqua minerale', '6x1.5 L', [['gros', 1.69], ['ipergros', 1.59], ['grosmarket', 1.79], ['megamarket', 1.75], ['familycenter', 1.89], ['todis', 1.49], ['carrefourmarket', 1.99], ['carrefourexpress', 2.19]]],
  ['Birra', '6x33 cl', [['gros', 4.99], ['ipergros', 4.79], ['grosmarket', 5.29], ['megamarket', 5.19], ['familycenter', 5.49], ['todis', 4.49], ['carrefourmarket', 5.69], ['carrefourexpress', 5.99]]],
];

export const PRODUCT_BRANDS: Record<string, string> = {
  'Latte intero': 'Centrale del Latte',
  'Pane in cassetta': 'Mulino Bianco',
  'Spaghetti': 'Barilla',
  'Penne rigate': 'Barilla',
  'Riso Carnaroli': 'Riso Scotti',
  'Passata di pomodoro': 'Mutti',
  'Pomodori pelati': 'Mutti',
  'Olio extravergine di oliva': 'Carapelli',
  'Tonno in scatola': 'Rio Mare',
  'Mozzarella': 'Galbani',
  'Parmigiano Reggiano': 'Parmareggio',
  'Yogurt bianco': 'Danone',
  'Burro': 'Vallelata',
  'Prosciutto cotto': 'Rovagnati',
  'Bresaola': 'Negroni',
  'Caffè macinato': 'Lavazza',
  'Zucchero': 'Eridania',
  'Farina 00': 'Molino Grassi',
  'Fette biscottate': 'Mulino Bianco',
  'Biscotti secchi': 'Pavesi',
  'Cioccolato fondente': 'Novi',
  'Nutella': 'Ferrero',
  'Acqua minerale': 'Norda',
  'Bibita cola': 'Coca-Cola',
  'Birra': 'Peroni',
  'Detersivo piatti': 'Sole',
  'Carta igienica': 'Tenderly',
  'Dentifricio': 'Aquafresh',
  'Scottex': 'Scottex',
  'Sapone mani': 'Nivea',
};

export const DEFAULT_VOLANTINO_OFFERS: VolantinoOffer[] = DEMO.flatMap(([productName, quantity, offers], rowIdx) =>
  offers.map(([storeId, price], offerIdx) => ({
    id: `vol-${rowIdx}-${offerIdx}`,
    productName,
    storeId,
    price,
    brand: PRODUCT_BRANDS[productName],
    quantity,
    isPromo: true,
  })),
);