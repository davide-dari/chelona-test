const fs = require('fs');
const path = require('path');

async function main() {
  console.log('Fetching hasaneyldrm/exercises-dataset...');
  const res = await fetch('https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/data/exercises.json');
  const dataset = await res.json();

  console.log(`Total exercises loaded from dataset: ${dataset.length}`);

  // Inspect categories and equipment
  const categories = new Set(dataset.map(e => e.category));
  const equipments = new Set(dataset.map(e => e.equipment));
  console.log('Categories:', Array.from(categories));
  console.log('Equipments:', Array.from(equipments));

  // Filter band exercises
  const bandExercises = dataset.filter(e => 
    e.category === 'band' || 
    e.equipment === 'band' || 
    (e.name?.en || '').toLowerCase().includes('band')
  );

  console.log('Dataset item keys:', Object.keys(dataset[0]));
}

main().catch(console.error);
