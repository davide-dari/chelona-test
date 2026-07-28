const fs = require('fs');
const path = require('path');

const DATASET_URL = 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/data/exercises.json';
const FITNESS_FILE = path.join(__dirname, '../src/components/FitnessScreen.tsx');

async function run() {
  const res = await fetch(DATASET_URL);
  const dataset = await res.json();
  const code = fs.readFileSync(FITNESS_FILE, 'utf8');

  // Extract all exercises from EXERCISE_LIBRARY in FitnessScreen.tsx
  const regex = /{\s*name:\s*'([^']+)',\s*muscleGroup:\s*'([^']+)',\s*equipment:\s*\[([^\]]+)\],\s*gifUrl:\s*'([^']+)'/g;

  let match;
  const missing = [];
  const allInCode = [];

  while ((match = regex.exec(code)) !== null) {
    const [full, name, muscleGroup, equipmentStr, currentGif] = match;
    allInCode.push({ full, name, muscleGroup, equipmentStr, currentGif });

    if (!currentGif.includes('hasaneyldrm/exercises-dataset')) {
      missing.push({ name, muscleGroup, equipmentStr, currentGif });
    }
  }

  console.log(`Total exercises in code: ${allInCode.length}`);
  console.log(`Exercises missing hasaneyldrm dataset GIF: ${missing.length}`);

  missing.forEach(item => {
    console.log(`\n🔍 Searching for: "${item.name}" (muscle: ${item.muscleGroup})`);

    // Search dataset for matching keywords
    const nameLower = item.name.toLowerCase();
    const matches = dataset.filter(d => {
      const dName = (d.name || '').toLowerCase();
      
      // Keywords mapping
      if (nameLower.includes('elastico') || nameLower.includes('mini-band')) {
        if (d.equipment !== 'band' && d.equipment !== 'resistance band' && !dName.includes('band')) return false;
      }

      if (nameLower.includes('manubri') || nameLower.includes('manubrio')) {
        if (d.equipment !== 'dumbbell' && !dName.includes('dumbbell')) return false;
      }

      if (nameLower.includes('bilanciere')) {
        if (d.equipment !== 'barbell' && d.equipment !== 'olympic barbell' && !dName.includes('barbell')) return false;
      }

      if (nameLower.includes('cavi') || nameLower.includes('cavo')) {
        if (d.equipment !== 'cable' && !dName.includes('cable')) return false;
      }

      return true;
    });

    // Score matches
    const words = nameLower.replace(/con|ai|alla|su|a|per|mini-band|elastico|manubri|manubrio|bilanciere|cavi|cavo/g, '').trim().split(/\s+/);
    
    let bestMatch = null;
    let bestScore = -1;

    matches.forEach(m => {
      let score = 0;
      const mName = (m.name || '').toLowerCase();
      words.forEach(w => {
        if (w.length > 2 && mName.includes(w)) score += 2;
      });
      if (score > bestScore) {
        bestScore = score;
        bestMatch = m;
      }
    });

    if (bestMatch) {
      console.log(`  -> Candidate: "${bestMatch.name}" (${bestMatch.equipment}) | GIF: https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/${bestMatch.gif_url}`);
    } else {
      console.log(`  -> No candidate found`);
    }
  });
}

run().catch(console.error);
