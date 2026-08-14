/*
 * Loghi insegne dal repo openfoodfacts/brand-images (CC-BY-SA / ODbL).
 * I file sono PNG/SVG nella cartella xx/stores del repo, serviti via
 * raw.githubusercontent.com. Mappa: slug catena volantini → nome file.
 */

const OF_BASE = 'https://raw.githubusercontent.com/openfoodfacts/brand-images/main/xx/stores';

/** slug catena volantini (volantiniDb) → nome file nel repo openfoodfacts. */
export const OF_BRAND_IMAGES: Record<string, string> = {
  'carrefour': 'carrefour.svg',
  'coop': 'coop.svg',
  'conad': 'conad.png',
  'acqua-e-sapone': 'acqua-sapone.png',
  'lidl': 'lidl.svg',
  'esselunga': 'esselunga.png',
  'aldi': 'aldi.svg',
  'despar': 'despar.png',
  'eurospin': 'eurospin.png',
  'md-discount': 'md-italia.svg',
  'il-gigante': 'il-gigante.png',
  'penny-market': 'penny.svg',
  'famila': 'famila-italia.png',
  'expert-italia': 'expert.svg',
  'euronics': 'euronics-2017.svg',
  'ipercoop': 'ipercoop.svg',
  'mondo-convenienza': 'mondo-convenienza.png',
  'leroy-merlin': 'leroy-merlin.svg',
  'panorama': 'panorama-pam.svg',
  'iper-la-grande-i': 'iper-la-grande-i.svg',
  'comet': 'comet.png',
  'tecnomat': 'bricoman.svg',
  'metro': 'metro.svg',
  'brico-io': 'brico-io.png',
  'bricofer': 'bricofer.png',
  'emisfero-ipermercati': 'emisfero.png',
};

/** URL del logo openfoodfacts per lo slug catena, se disponibile. */
export function brandImageUrl(slug: string): string | undefined {
  const file = OF_BRAND_IMAGES[slug];
  return file ? `${OF_BASE}/${file}` : undefined;
}