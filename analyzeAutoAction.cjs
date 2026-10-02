const fs = require('fs');

const code = fs.readFileSync('/Users/davidedari/Documents/Progetti/app/chelona/src/services/chelonaEngine.ts', 'utf8');
const lines = code.split('\n');

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('autoAction:')) {
    console.log(`\n--- Line ${i + 1} ---`);
    for (let j = Math.max(0, i - 10); j <= i; j++) {
      console.log(`${j + 1}: ${lines[j]}`);
    }
  }
}
