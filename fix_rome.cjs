const fs = require('fs');

let content = fs.readFileSync('src/components/RomeTransport.tsx', 'utf8');

// 1. Remove nameEl from interfaces and definitions
content = content.replace(/nameEl:\s*string;\n/g, '');
content = content.replace(/,\s*nameEl:\s*'[^']*'/g, '');

// 2. Remove nameEl from search filters
content = content.replace(/ \|\| s\.nameEl\.toLowerCase\(\)\.includes\(query\)/g, '');

// 3. Remove nameEl from add terms
content = content.replace(/terms\.add\(station\.nameEl\.toLowerCase\(\)\);\n/g, '');

// 4. Remove UI components that render nameEl
content = content.replace(/\{st\.nameEl\}/g, '');
content = content.replace(/Σταθμός: \{activeStationData\.nameEl\}/g, '');
content = content.replace(/\{station\.nameEl\}/g, '');
content = content.replace(/<p className="text-\[9px\] text-\[var\(--text-muted\)\] font-bold">\{ROME_STATIONS\[selectedStation\]\.nameEl\}<\/p>/g, '');

// Removed the dangerous curly bracket replacement

// Update Map Links
content = content.replace(/https:\/\/www\.oasa\.gr\/wp-content\/uploads\/2021\/04\/afissa_metro_may2020\.pdf/g, 'https://www.atac.roma.it/docs/default-source/mappe-tpl/mappa-metro-e-ferrovie-metropolitane.pdf');
content = content.replace(/https:\/\/www\.athensmap360\.com\/athens-metro-map/g, 'https://romamap360.com/mappa-metro-roma');

// 5. Update Metro C Stations
const oldMetroC = `  lodi: { id: 'lodi', nameIt: 'Lodi', lat: 41.8864, lng: 12.5181, lines: [3] },
  pigneto: { id: 'pigneto', nameIt: 'Pigneto', lat: 41.8889, lng: 12.5261, lines: [3], attractions: ['Quartiere Pigneto'] },
  malatesta: { id: 'malatesta', nameIt: 'Malatesta', lat: 41.8867, lng: 12.5358, lines: [3] },
  teano: { id: 'teano', nameIt: 'Teano', lat: 41.8894, lng: 12.5511, lines: [3] },
  pantano: { id: 'pantano', nameIt: 'Monte Compatri-Pantano', lat: 41.8656, lng: 12.7114, lines: [3] }`;

const newMetroC = `  lodi: { id: 'lodi', nameIt: 'Lodi', lat: 41.8864, lng: 12.5181, lines: [3] },
  pigneto: { id: 'pigneto', nameIt: 'Pigneto', lat: 41.8889, lng: 12.5261, lines: [3], attractions: ['Quartiere Pigneto'] },
  malatesta: { id: 'malatesta', nameIt: 'Malatesta', lat: 41.8867, lng: 12.5358, lines: [3] },
  teano: { id: 'teano', nameIt: 'Teano', lat: 41.8894, lng: 12.5511, lines: [3] },
  gardenie: { id: 'gardenie', nameIt: 'Gardenie', lat: 41.8833, lng: 12.5647, lines: [3] },
  mirti: { id: 'mirti', nameIt: 'Mirti', lat: 41.8801, lng: 12.5714, lines: [3] },
  parco_di_centocelle: { id: 'parco_di_centocelle', nameIt: 'Parco di Centocelle', lat: 41.8741, lng: 12.5768, lines: [3] },
  alessandrino: { id: 'alessandrino', nameIt: 'Alessandrino', lat: 41.8711, lng: 12.5833, lines: [3] },
  torre_spaccata: { id: 'torre_spaccata', nameIt: 'Torre Spaccata', lat: 41.8698, lng: 12.5901, lines: [3] },
  torre_maura: { id: 'torre_maura', nameIt: 'Torre Maura', lat: 41.8681, lng: 12.5956, lines: [3] },
  giardinetti: { id: 'giardinetti', nameIt: 'Giardinetti', lat: 41.8658, lng: 12.6053, lines: [3] },
  torrenova: { id: 'torrenova', nameIt: 'Torrenova', lat: 41.8631, lng: 12.6136, lines: [3] },
  torre_angela: { id: 'torre_angela', nameIt: 'Torre Angela', lat: 41.8647, lng: 12.6253, lines: [3] },
  torre_gaia: { id: 'torre_gaia', nameIt: 'Torre Gaia', lat: 41.8633, lng: 12.6364, lines: [3] },
  grotte_celoni: { id: 'grotte_celoni', nameIt: 'Grotte Celoni', lat: 41.8647, lng: 12.6506, lines: [3] },
  due_leoni_fontana_candida: { id: 'due_leoni_fontana_candida', nameIt: 'Due Leoni - Fontana Candida', lat: 41.8661, lng: 12.6631, lines: [3] },
  borghesiana: { id: 'borghesiana', nameIt: 'Borghesiana', lat: 41.8664, lng: 12.6733, lines: [3] },
  bolognetta: { id: 'bolognetta', nameIt: 'Bolognetta', lat: 41.8667, lng: 12.6842, lines: [3] },
  finocchio: { id: 'finocchio', nameIt: 'Finocchio', lat: 41.8633, lng: 12.6953, lines: [3] },
  graniti: { id: 'graniti', nameIt: 'Graniti', lat: 41.8636, lng: 12.7056, lines: [3] },
  pantano: { id: 'pantano', nameIt: 'Monte Compatri - Pantano', lat: 41.8656, lng: 12.7114, lines: [3] }`;

content = content.replace(oldMetroC, newMetroC);

// 6. Update Line C Sequences
const oldSeq = `'san_giovanni', 'lodi', 'pigneto', 'malatesta', 'teano', 'pantano'`;
const newSeq = `'san_giovanni', 'lodi', 'pigneto', 'malatesta', 'teano', 'gardenie', 'mirti', 'parco_di_centocelle', 'alessandrino', 'torre_spaccata', 'torre_maura', 'giardinetti', 'torrenova', 'torre_angela', 'torre_gaia', 'grotte_celoni', 'due_leoni_fontana_candida', 'borghesiana', 'bolognetta', 'finocchio', 'graniti', 'pantano'`;

content = content.replace(oldSeq, newSeq);

// Write back
fs.writeFileSync('src/components/RomeTransport.tsx', content);
console.log('Fixed RomeTransport.tsx');
