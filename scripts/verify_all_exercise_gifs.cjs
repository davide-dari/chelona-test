const fs = require('fs');
const path = require('path');

const DATASET_URL = 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/data/exercises.json';
const FITNESS_FILE = path.join(__dirname, '../src/components/FitnessScreen.tsx');

async function run() {
  console.log('Fetching hasaneyldrm dataset...');
  const res = await fetch(DATASET_URL);
  const dataset = await res.json();

  const code = fs.readFileSync(FITNESS_FILE, 'utf8');

  // Extract all { name, gifUrl } from EXERCISE_LIBRARY
  const regex = /{\s*name:\s*'([^']+)',[^{}]*gifUrl:\s*'([^']+)'/g;
  let match;
  const exercises = [];

  while ((match = regex.exec(code)) !== null) {
    exercises.push({ full: match[0], name: match[1], gifUrl: match[2] });
  }

  console.log(`Checking ${exercises.length} exercise GIF URLs...`);

  const results = [];
  for (const ex of exercises) {
    try {
      const headRes = await fetch(ex.gifUrl, { method: 'HEAD' });
      results.push({ ...ex, status: headRes.status });
      if (headRes.status !== 200) {
        console.log(`❌ 404 Not Found: "${ex.name}" -> ${ex.gifUrl}`);
      } else {
        console.log(`✅ 200 OK: "${ex.name}"`);
      }
    } catch (e) {
      results.push({ ...ex, status: 500, error: e.message });
      console.log(`⚠️ Error checking: "${ex.name}"`);
    }
  }

  const broken = results.filter(r => r.status !== 200);
  console.log(`\nFound ${broken.length} broken/404 GIF URLs.`);

  let updatedCode = code;
  let fixCount = 0;

  for (const item of broken) {
    console.log(`\n🔍 Searching fix for: "${item.name}"`);

    // Search dataset for matching exercise
    const searchTerms = item.name.toLowerCase()
      .replace(' push-up', ' pushup')
      .replace('push-up', 'push-up')
      .split(' ');

    // Look for exact/partial matches in dataset
    const candidates = dataset.filter(d => {
      const dName = (d.name || '').toLowerCase();
      if (item.name.toLowerCase().includes('push-up') || item.name.toLowerCase().includes('pushup')) {
        return dName.includes('push-up') || dName.includes('push up');
      }
      if (item.name.toLowerCase().includes('dip')) {
        return dName.includes('dip');
      }
      return searchTerms.some(t => t.length > 3 && dName.includes(t));
    });

    console.log(`Candidates for "${item.name}":`, candidates.map(c => `${c.name} (${c.gif_url || c.image})`));

    // Pick best candidate that actually exists and returns 200 OK
    let workingUrl = null;

    for (const cand of candidates) {
      const candidateGif = cand.gif_url ? `https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/${cand.gif_url}` : null;
      const candidateImg = cand.image ? `https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/${cand.image}` : null;

      const testUrls = [candidateGif, candidateImg].filter(Boolean);

      for (const u of testUrls) {
        try {
          const testRes = await fetch(u, { method: 'HEAD' });
          if (testRes.status === 200) {
            workingUrl = u;
            break;
          }
        } catch (e) {}
      }

      if (workingUrl) break;
    }

    if (workingUrl) {
      console.log(`  🎯 Fixed "${item.name}" -> ${workingUrl}`);
      const escapedName = item.name.replace(/['"\\/]/g, '\\$&');
      const replaceRegex = new RegExp(`(name:\\s*'${escapedName}'[^\\n]+gifUrl:\\s*')([^']+)(')`, 'g');
      updatedCode = updatedCode.replace(replaceRegex, `$1${workingUrl}$3`);
      fixCount++;
    } else {
      console.log(`  ⚠️ Could not find working URL for "${item.name}"`);
    }
  }

  fs.writeFileSync(FITNESS_FILE, updatedCode);
  console.log(`\n🎉 Verification complete! Fixed ${fixCount} broken exercise URLs in FitnessScreen.tsx.`);
}

run().catch(console.error);
