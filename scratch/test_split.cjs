const fs = require('fs');
const data = JSON.parse(fs.readFileSync('android/app/src/main/assets/public/ricette_mondo.json', 'utf8'));

let p = data[0].procedimento;
console.log("ORIGINAL:\n", p);

// Remove the picture reference numbers like " 1 ", " 2 ", " 12 ", " 1-2 " before punctuation
let cleaned = p.replace(/\s+\d+\s*(?=[.,;:]|\s|$)/g, (match) => {
  // Check if it's just a number
  return match.replace(/\d+/, '').replace(/\s+/, ''); 
});
// A better regex for GZ picture numbers: they are usually space + number + space + punctuation.
// Actually, let's just do: text.replace(/ \d+ (?=[.,;])/g, '')

console.log("\nCLEANED:\n", cleaned);

let steps = cleaned.split(/(?<=[.!?])\s+(?=[A-Z])/).filter(s => s.trim() !== '');
console.log("\nSTEPS:");
steps.forEach((s, i) => console.log(`[${i+1}] ${s}`));
