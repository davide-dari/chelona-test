const fs = require('fs');
let content = fs.readFileSync('src/components/RomeTransport.tsx', 'utf8');

// Fix initial state
content = content.replace(/useState<string \| null>\('syntagma'\);/, "useState<string | null>('termini');");

// Fix SVG nodes
content = content.replace(/setSelectedStation\('piraeus'\); setSelectedLine\(3\);/g, "setSelectedStation('laurentina'); setSelectedLine(2);");
content = content.replace(/>Piraeus \(M1\)</g, ">Laurentina (M2)<");

content = content.replace(/setSelectedStation\('kifisia'\); setSelectedLine\(1\);/g, "setSelectedStation('battistini'); setSelectedLine(1);");
content = content.replace(/>Kifisia \(M1\)</g, ">Battistini (M1)<");

content = content.replace(/setSelectedStation\('omonia'\); setSelectedLine\(2\);/g, "setSelectedStation('repubblica'); setSelectedLine(1);");
content = content.replace(/>Omonia \(M1, M2\)</g, ">Repubblica (M1)<");

content = content.replace(/setSelectedStation\('monastiraki'\); setSelectedLine\(3\);/g, "setSelectedStation('spagna'); setSelectedLine(1);");
content = content.replace(/>Monastiraki \(M1, M3\)</g, ">Spagna (M1)<");

content = content.replace(/setSelectedStation\('syntagma'\); setSelectedLine\(3\);/g, "setSelectedStation('termini'); setSelectedLine(1);");
content = content.replace(/>Syntagma \(M2, M3\)</g, ">Termini (M1, M2)<");

content = content.replace(/setSelectedStation\('akropoli'\); setSelectedLine\(2\);/g, "setSelectedStation('colosseo'); setSelectedLine(2);");
content = content.replace(/>Akropoli \(M2\)</g, ">Colosseo (M2)<");

content = content.replace(/setSelectedStation\('kerameikos'\); setSelectedLine\(3\);/g, "setSelectedStation('san_giovanni'); setSelectedLine(3);");
content = content.replace(/>Kerameikos \(M3\)</g, ">San Giovanni (M1, M3)<");

content = content.replace(/setSelectedStation\('airport'\); setSelectedLine\(3\);/g, "setSelectedStation('pantano'); setSelectedLine(3);");
content = content.replace(/>Airport \(M3\)</g, ">Pantano (M3)<");

fs.writeFileSync('src/components/RomeTransport.tsx', content);
console.log('Fixed SVG map in RomeTransport.tsx');
