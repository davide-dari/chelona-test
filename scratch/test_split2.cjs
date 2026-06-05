const fs = require('fs');
const data = JSON.parse(fs.readFileSync('android/app/src/main/assets/public/ricette_mondo.json', 'utf8'));

let p = data[0].procedimento;
// Replace only standalone numbers before punctuation or at the end
let cleaned = p.replace(/\s+\d+\s+(?=[.,;:!?)])/g, (match) => {
  return match.replace(/\d+/, '').replace(/\s+/, ' ');
});
// also remove if they are right before \n
cleaned = cleaned.replace(/\s+\d+\s*$/gm, '');

let steps = cleaned.split(/(?<=[.!?])\s+(?=[A-Z])/).filter(s => s.trim() !== '');
console.log("STEPS:");
steps.forEach((s, i) => console.log(`[${i+1}] ${s}`));
