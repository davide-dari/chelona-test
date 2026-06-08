const fs = require('fs');
let content = fs.readFileSync('src/components/RomeTransport.tsx', 'utf8');

// 1. Add Porta Metronia to ROME_STATIONS, just before san_giovanni or at the start of Line C
const portaMetroniaObj = `  porta_metronia: { id: 'porta_metronia', nameIt: 'Porta Metronia', lat: 41.883, lng: 12.497, lines: [3] },
  san_giovanni:`;
content = content.replace(/  san_giovanni:/, portaMetroniaObj);

// 2. Update Colosseo to lines: [2, 3] and isTransfer: true
content = content.replace(
  /colosseo: { id: 'colosseo', nameIt: 'Colosseo', lat: 41.8914, lng: 12.4912, lines: \[2\], attractions: \['Colosseo', 'Fori Imperiali', 'Arco di Costantino'\] }/,
  "colosseo: { id: 'colosseo', nameIt: 'Colosseo', lat: 41.8914, lng: 12.4912, lines: [2, 3], isTransfer: true, attractions: ['Colosseo', 'Fori Imperiali', 'Arco di Costantino'] }"
);

// 3. Update LINE_SEQUENCES[3] to prepend colosseo and porta_metronia
content = content.replace(
  /'san_giovanni', 'lodi', 'pigneto'/,
  "'colosseo', 'porta_metronia', 'san_giovanni', 'lodi', 'pigneto'"
);

// 4. Fix SVG map texts
content = content.replace(/>Pireo \(M1\/M3\)</g, ">Laurentina (M2)<");
content = content.replace(/>Omonia \(M1\/M2\)</g, ">Repubblica (M1)<");
content = content.replace(/>Monastiraki \(M1\/M3\)</g, ">Spagna (M1)<");
content = content.replace(/>Syntagma \(M2\/M3\)</g, ">Termini (M1, M2)<");
content = content.replace(/>Acropoli \(M2\)</g, ">Colosseo (M2, M3)<");

// Remove the comments that say "Pireo (Linea 1 e 3)" etc
content = content.replace(/\{\/\* Pireo \(Linea 1 e 3\) \*\/\}/g, "{/* Laurentina (Linea 2) */}");
content = content.replace(/\{\/\* Kifisia \(Linea 1\) \*\/\}/g, "{/* Battistini (Linea 1) */}");
content = content.replace(/\{\/\* Omonia \(Linea 1 e 2\) - Intersezione Verde\/Rosso \*\/\}/g, "{/* Repubblica (Linea 1) */}");
content = content.replace(/\{\/\* Monastiraki \(Linea 1 e 3\) - Intersezione Verde\/Blu \*\/\}/g, "{/* Spagna (Linea 1) */}");
content = content.replace(/\{\/\* Syntagma \(Linea 2 e 3\) - Intersezione Rosso\/Blu \*\/\}/g, "{/* Termini (Linea 1 e 2) */}");
content = content.replace(/\{\/\* Acropoli \(Linea 2\) \*\/\}/g, "{/* Colosseo (Linea 2 e 3) */}");
content = content.replace(/\{\/\* Kerameikos \(Linea 3\) \*\/\}/g, "{/* San Giovanni (Linea 1 e 3) */}");
content = content.replace(/\{\/\* Aeroporto \(Linea 3\) \*\/\}/g, "{/* Pantano (Linea 3) */}");

fs.writeFileSync('src/components/RomeTransport.tsx', content);
console.log("Updated Metro C and fixed SVG texts!");
