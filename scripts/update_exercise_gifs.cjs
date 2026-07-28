const fs = require('fs');
const path = require('path');

const DATASET_URL = 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/data/exercises.json';
const FITNESS_FILE = path.join(__dirname, '../src/components/FitnessScreen.tsx');

const MANUAL_MAPPING = [
  // Chest
  { search: 'barbell bench press', match: 'Panca Piana con Bilanciere' },
  { search: 'dumbbell incline bench press', match: 'Panca Inclinata con Manubri' },
  { search: 'cable fly', match: 'Croci ai Cavi' },
  { search: 'chest press', match: 'Chest Press' },
  { search: 'push-up', match: 'Push-up' },
  { search: 'diamond push-up', match: 'Push-up Diamante' },
  { search: 'chest dip', match: 'Dip alle Parallele' },
  { search: 'decline bench press', match: 'Panca Declinata' },
  { search: 'dumbbell fly', match: 'Croci con Manubri' },
  { search: 'pectoral machine', match: 'Pectoral Machine' },
  { search: 'band bench press', match: 'Chest Press con Elastico' },
  { search: 'band fly', match: 'Croci con Elastico' },

  // Back
  { search: 'pull-up', match: 'Trazioni alla Sbarra' },
  { search: 'lat pulldown', match: 'Lat Machine' },
  { search: 'bent over row', match: 'Rematore con Bilanciere' },
  { search: 'dumbbell row', match: 'Rematore con Manubrio' },
  { search: 'seated cable row', match: 'Pulley Basso' },
  { search: 't-bar row', match: 'T-Bar Row' },
  { search: 'wide grip pull-up', match: 'Pull-up Presa Larga' },
  { search: 'cable row', match: 'Rematore ai Cavi' },
  { search: 'dumbbell pullover', match: 'Pullover con Manubrio' },
  { search: 'inverted row', match: 'Australian Pull-up' },
  { search: 'band bent over row', match: 'Rematore con Elastico' },
  { search: 'band lat pulldown', match: 'Lat Pulldown con Elastico' },

  // Shoulders
  { search: 'military press', match: 'Military Press con Bilanciere' },
  { search: 'lateral raise', match: 'Alzate Laterali' },
  { search: 'arnold press', match: 'Arnold Press' },
  { search: 'face pull', match: 'Face Pull' },
  { search: 'front raise', match: 'Alzate Frontali' },
  { search: 'dumbbell shoulder press', match: 'Shoulder Press con Manubri' },
  { search: 'upright row', match: 'Tirate al Mento' },
  { search: 'rear delt fly', match: 'Alzate a 90 Gradi' },
  { search: 'cable lateral raise', match: 'Lateral Raise al Cavo' },
  { search: 'band face pull', match: 'Face Pull con Elastico' },
  { search: 'band lateral raise', match: 'Alzate Laterali con Elastico' },
  { search: 'band shoulder press', match: 'Shoulder Press con Elastico' },

  // Biceps
  { search: 'barbell curl', match: 'Curl con Bilanciere' },
  { search: 'dumbbell curl', match: 'Curl con Manubri' },
  { search: 'hammer curl', match: 'Curl Martello' },
  { search: 'concentration curl', match: 'Curl Concentrato' },
  { search: 'preacher curl', match: 'Curl alla Panca Scott' },
  { search: 'cable curl', match: 'Curl ai Cavi' },
  { search: 'reverse curl', match: 'Curl Inverso' },
  { search: 'band biceps curl', match: 'Curl Bicipiti con Elastico' },

  // Triceps
  { search: 'french press', match: 'French Press' },
  { search: 'triceps pushdown', match: 'Push-down ai Cavi' },
  { search: 'bench dip', match: 'Dip su Panca' },
  { search: 'rope pushdown', match: 'Tricipiti ai Cavi con Corda' },
  { search: 'dumbbell kickback', match: 'Kickback con Manubrio' },
  { search: 'overhead triceps extension', match: 'Estensioni Overhead' },
  { search: 'skull crusher', match: 'Skull Crusher' },
  { search: 'band pushdown', match: 'Pushdown Tricipiti con Elastico' },

  // Legs
  { search: 'barbell squat', match: 'Squat con Bilanciere' },
  { search: 'leg press', match: 'Pressa' },
  { search: 'leg extension', match: 'Leg Extension' },
  { search: 'dumbbell lunge', match: 'Affondi con Manubri' },
  { search: 'front squat', match: 'Squat Frontale' },
  { search: 'hack squat', match: 'Hack Squat' },
  { search: 'goblet squat', match: 'Goblet Squat' },
  { search: 'bodyweight squat', match: 'Squat a Corpo Libero' },
  { search: 'sissy squat', match: 'Sissy Squat' },
  { search: 'band squat', match: 'Squat con Elastico' },

  // Glutes & Hamstrings
  { search: 'hip thrust', match: 'Hip Thrust con Bilanciere' },
  { search: 'glute bridge', match: 'Ponte Glutei' },
  { search: 'sumo squat', match: 'Squat Sumo' },
  { search: 'romanian deadlift', match: 'Stacco Rumeno' },
  { search: 'lying leg curl', match: 'Leg Curl Sdraiato' },
  { search: 'seated leg curl', match: 'Leg Curl Seduto' },
  { search: 'single leg deadlift', match: 'Stacco a Gamba Singola' },
  { search: 'nordic ham curl', match: 'Nordic Curl' },
  { search: 'good morning', match: 'Good Morning' },
  { search: 'band hip thrust', match: 'Hip Thrust con Mini-Band' },
  { search: 'band hip abduction', match: 'Abduzioni Glutei con Mini-Band' },
  { search: 'band kickback', match: 'Glute Kickback con Elastico' },
  { search: 'band stiff leg deadlift', match: 'Stacco Rumeno con Elastico' },

  // Calves & Abs
  { search: 'standing calf raise', match: 'Calf Raise in Piedi' },
  { search: 'seated calf raise', match: 'Calf Raise Seduto' },
  { search: 'crunch', match: 'Crunch' },
  { search: 'plank', match: 'Plank' },
  { search: 'leg raise', match: 'Leg Raise' },
  { search: 'russian twist', match: 'Russian Twist' },
  { search: 'mountain climber', match: 'Mountain Climber' },
  { search: 'bicycle crunch', match: 'Bicycle Crunch' },
  { search: 'ab wheel', match: 'Ab Wheel' },

  // Full body
  { search: 'burpee', match: 'Burpee' },
  { search: 'clean and press', match: 'Clean and Press' },
  { search: 'thruster', match: 'Thruster' },
  { search: 'turkish get-up', match: 'Turkish Get-up' }
];

async function run() {
  console.log('Fetching hasaneyldrm dataset...');
  const res = await fetch(DATASET_URL);
  const dataset = await res.json();

  console.log(`Dataset size: ${dataset.length}`);

  let code = fs.readFileSync(FITNESS_FILE, 'utf8');

  let updatedCount = 0;
  MANUAL_MAPPING.forEach(item => {
    // Find matching item in dataset
    const found = dataset.find(d => 
      (d.name || '').toLowerCase().includes(item.search.toLowerCase()) ||
      (d.name || '').toLowerCase() === item.search.toLowerCase()
    );

    if (found && found.gif_url) {
      const gifFullUrl = `https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/${found.gif_url}`;
      
      // Look for line matching exercise name in FitnessScreen.tsx
      const pattern = new RegExp(`name:\\s*'${item.match.replace(/['"\\/]/g, '\\$&')}'[^\\n]+gifUrl:\\s*'[^']+'`, 'g');
      if (code.match(pattern)) {
        code = code.replace(pattern, (match) => {
          return match.replace(/gifUrl:\s*'[^']+'/, `gifUrl: '${gifFullUrl}'`);
        });
        updatedCount++;
        console.log(`✅ Mapped: "${item.match}" -> ${gifFullUrl}`);
      } else {
        console.log(`⚠️ Match name in code not found for: "${item.match}"`);
      }
    } else {
      console.log(`❌ Dataset exercise not found for search: "${item.search}"`);
    }
  });

  fs.writeFileSync(FITNESS_FILE, code);
  console.log(`\n🎉 Successfully updated ${updatedCount} exercise GIFs from hasaneyldrm/exercises-dataset!`);
}

run().catch(console.error);
