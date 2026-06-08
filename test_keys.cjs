const fs = require('fs');
const content = fs.readFileSync('src/components/RomeTransport.tsx', 'utf8');

const stationsMatch = content.match(/export const ROME_STATIONS[^]+?};\n/);
const seqMatch = content.match(/export const LINE_SEQUENCES[^]+?};\n/);

if (!stationsMatch || !seqMatch) {
  console.log('regex fail');
  process.exit(1);
}

const stationsStr = stationsMatch[0].replace('export const ROME_STATIONS: Record<string, MetroStation> = ', '');
const seqStr = seqMatch[0].replace('export const LINE_SEQUENCES: Record<number, string[]> = ', '');

// We can't easily eval without transpiling or stripping TS types, but we can extract keys.
const stationKeys = [...stationsStr.matchAll(/^\s+([a-zA-Z0-9_]+):/gm)].map(m => m[1]);

const seqKeys = [...seqStr.matchAll(/'([^']+)'/g)].map(m => m[1]);

seqKeys.forEach(k => {
  if (!stationKeys.includes(k)) {
    console.log("Missing key in ROME_STATIONS: ", k);
  }
});
console.log("Done checking.");
