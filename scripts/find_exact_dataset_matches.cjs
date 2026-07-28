const fs = require('fs');
const path = require('path');

const DATASET_URL = 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/data/exercises.json';

async function run() {
  const res = await fetch(DATASET_URL);
  const dataset = await res.json();

  const queries = [
    { label: 'Croci ai Cavi', test: e => e.equipment === 'cable' && e.name.includes('fly') },
    { label: 'Pectoral Machine', test: e => e.name.includes('pec') || e.name.includes('butterfly') },
    { label: 'Rematore con Manubrio', test: e => e.equipment === 'dumbbell' && e.name.includes('row') },
    { label: 'Pulley Basso / Rematore Cavi', test: e => e.equipment === 'cable' && e.name.includes('seated') && e.name.includes('row') },
    { label: 'Face Pull', test: e => e.name.includes('face pull') },
    { label: 'Alzate 90 Gradi', test: e => e.name.includes('rear') || e.name.includes('bent over lateral') },
    { label: 'Tricipiti Cavi Corda', test: e => e.equipment === 'cable' && e.name.includes('triceps') },
    { label: 'Kick-back Cavi / Glutei', test: e => e.name.includes('kickback') || e.name.includes('glute') },
    { label: 'Abduzioni Glutei', test: e => e.name.includes('abduction') || e.name.includes('abductor') },
    { label: 'Nordic / Leg Curl', test: e => e.name.includes('curl') && (e.name.includes('hamstring') || e.name.includes('leg')) },
    { label: 'Croci Elastico', test: e => (e.equipment === 'band' || e.equipment === 'resistance band') && e.name.includes('chest') },
    { label: 'Rematore Elastico', test: e => (e.equipment === 'band' || e.equipment === 'resistance band') && e.name.includes('row') },
    { label: 'Alzate Laterali Elastico', test: e => (e.equipment === 'band' || e.equipment === 'resistance band') && e.name.includes('lateral') },
    { label: 'Pushdown Tricipiti Elastico', test: e => (e.equipment === 'band' || e.equipment === 'resistance band') && e.name.includes('triceps') },
    { label: 'Glute Kickback Elastico', test: e => (e.equipment === 'band' || e.equipment === 'resistance band') && (e.name.includes('kickback') || e.name.includes('hip')) }
  ];

  queries.forEach(q => {
    console.log(`\n=== Query: ${q.label} ===`);
    const matches = dataset.filter(q.test);
    matches.slice(0, 4).forEach(m => {
      console.log(`- [${m.id}] "${m.name}" (${m.equipment}, ${m.target}) -> https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/${m.gif_url}`);
    });
  });
}

run().catch(console.error);
