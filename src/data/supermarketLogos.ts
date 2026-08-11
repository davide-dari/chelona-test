import cadoro from '../assets/logos/cadoro.svg';
import carrefour from '../assets/logos/carrefour.svg';
import conad from '../assets/logos/conad.svg';
import coop from '../assets/logos/coop.svg';
import despar from '../assets/logos/despar.png';
import esselunga from '../assets/logos/esselunga.svg';
import famila from '../assets/logos/famila.svg';
import iperal from '../assets/logos/iperal.png';
import lidl from '../assets/logos/lidl.svg';
import penny from '../assets/logos/penny.svg';
import todis from '../assets/logos/todis.svg';
import acquaesapone from '../assets/logos/acquaesapone.svg';
import maurys from '../assets/logos/maurys.svg';
import tigota from '../assets/logos/tigota.svg';
import eurospin from '../assets/logos/eurospin.svg';
import aldi from '../assets/logos/aldi.svg';
import md from '../assets/logos/md.svg';
import crai from '../assets/logos/crai.svg';
import bennet from '../assets/logos/bennet.svg';
import unes from '../assets/logos/unes.svg';
import ilgigante from '../assets/logos/ilgigante.svg';
import deco from '../assets/logos/deco.svg';
import risparmiocasa from '../assets/logos/risparmiocasa.svg';
import ins from '../assets/logos/ins.svg';

/** Logo ufficiali scaricati dalle proprietà dei rispettivi siti (bundle). */
export const SUPERMARKET_LOGOS: Record<string, string> = {
  cadoro,
  carrefour,
  conad,
  coop,
  despar,
  esselunga,
  famila,
  iperal,
  lidl,
  penny,
  todis,
  'acqua-e-sapone': acquaesapone,
  maurys,
  tigota,
  eurospin,
  aldi,
  md,
  crai,
  bennet,
  unes,
  ilgigante,
  deco,
  'risparmio-casa': risparmiocasa,
  ins,
};

export function gotStoreLogo(id: string): boolean {
  return id in SUPERMARKET_LOGOS || id in SUPER_LOGO_FALLBACKS;
}

export const logoFor = (id: string): string | undefined => SUPERMARKET_LOGOS[id];

/** Id per i quali esiste già un fallback SVG personalizzato in StoreLogo. */
export const SUPER_LOGO_FALLBACKS: Record<string, { text: string; hex: string }> = {
  lidl: { text: 'Lidl', hex: '#0B4DA2' },
  aldi: { text: 'ALDI', hex: '#0057A8' },
  conad: { text: 'CONAD', hex: '#D71920' },
  coop: { text: 'COOP', hex: '#E4001B' },
  esselunga: { text: 'Esse', hex: '#F37B21' },
  penny: { text: 'PENNY', hex: '#0050AA' },
  eurospin: { text: 'EUROSPIN', hex: '#00923F' },
  carrefour: { text: 'CARREFOUR', hex: '#003399' },
  despar: { text: 'Despar', hex: '#E4001B' },
  tigre: { text: 'TIGRE', hex: '#FFB81C' },
  gros: { text: 'GROS', hex: '#009A44' },
  ipergros: { text: 'IPERGROS', hex: '#86B817' },
  grosmarket: { text: 'GROS M.', hex: '#008F8C' },
  megamarket: { text: 'MM', hex: '#C026D3' },
  familycenter: { text: 'FC', hex: '#EC4899' },
  todis: { text: 'TODIS', hex: '#E5001B' },
  'acqua-e-sapone': { text: 'A&S', hex: '#003B73' },
  maurys: { text: "Maury's", hex: '#003876' },
  tigota: { text: 'Tigotà', hex: '#008080' },
  md: { text: 'MD', hex: '#E30613' },
  crai: { text: 'CRAI', hex: '#E5001B' },
  bennet: { text: 'Bennet', hex: '#581C87' },
  unes: { text: 'Unes', hex: '#DC2626' },
  ilgigante: { text: 'Gigante', hex: '#0F172A' },
  deco: { text: 'Decò', hex: '#15803D' },
  'risparmio-casa': { text: 'R. Casa', hex: '#EA580C' },
  ins: { text: "IN's", hex: '#1E40AF' },
};