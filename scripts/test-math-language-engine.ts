import { 
  normalizeItalianText, 
  italianStem, 
  tokenFuzzySimilarity, 
  extractFoodEntities, 
  resolveCanonicalFood, 
  getOrLoadAllRecipes, 
  matchRecipesByIngredients, 
  formatRecipeMatchResponse, 
  searchRecipeByDishTitle, 
  formatSingleRecipeResponse, 
  extractExpenseQuery, 
  extractVehicleQuery, 
  extractDocumentQuery, 
  extractDoctorQuery, 
  extractRecessoQuery 
} from '../src/services/mathLanguageEngine';
import { queryChelonaAi } from '../src/services/chelonaEngine';
import { Module } from '../src/types';

async function main() {
  console.log('🐢 === TEST IL MATEMATICO (MathLanguageEngine) ===');

  // 1. Text normalization & stemming
  console.log('\n1. Test Normalization & Stemming:');
  const norm1 = normalizeItalianText('Pomodorini & Zucchine fresche!');
  if (norm1 !== 'pomodorini zucchine fresche') throw new Error(`Normalization error: ${norm1}`);
  console.log('  Normalized:', norm1);

  const stemUova = italianStem('uova');
  const stemUovo = italianStem('uovo');
  if (stemUova !== stemUovo) throw new Error(`Stemming mismatch: uova (${stemUova}) vs uovo (${stemUovo})`);
  console.log('  Stem uova/uovo:', stemUova);

  const stemZucchine = italianStem('zucchine');
  const stemZucchina = italianStem('zucchina');
  if (stemZucchine !== stemZucchina) throw new Error(`Stemming mismatch: zucchine (${stemZucchine}) vs zucchina (${stemZucchina})`);
  console.log('  Stem zucchine/zucchina:', stemZucchine);

  // 2. Fuzzy similarity with typos (user's example: ingrendiente / tonnoo)
  console.log('\n2. Test Fuzzy Similarity with typos:');
  const simTonno = tokenFuzzySimilarity('tonnoo', 'tonno');
  console.log(`  Similarity tonnoo vs tonno: ${simTonno.toFixed(3)}`);
  if (simTonno < 0.85) throw new Error('Fuzzy similarity for typo tonnoo failed');

  const simPollo = tokenFuzzySimilarity('poloo', 'pollo');
  console.log(`  Similarity poloo vs pollo: ${simPollo.toFixed(3)}`);
  if (simPollo < 0.85) throw new Error('Fuzzy similarity for typo poloo failed');

  // 3. Resolving canonical food & extracting entities from conversational queries
  console.log('\n3. Test Food Entity Extraction:');
  const query1 = "ho del pollo avanzato, due carote e delle zucchine in frigo cosa posso cucinare?";
  const entities1 = extractFoodEntities(query1);
  console.log('  Entities for:', query1);
  console.log('  Found:', entities1.map(e => e.canonical));
  if (entities1.length < 3) throw new Error(`Expected at least 3 entities, got ${entities1.length}`);
  if (!entities1.some(e => e.canonical === 'pollo')) throw new Error('Missing pollo');
  if (!entities1.some(e => e.canonical === 'carote')) throw new Error('Missing carote');
  if (!entities1.some(e => e.canonical === 'zucchine')) throw new Error('Missing zucchine');

  // Test typo "ingrendienti: pasta e tonno"
  const queryTypo = "ho questi ingrendienti: pasta e tonnoo cosa posso fare?";
  const entitiesTypo = extractFoodEntities(queryTypo);
  console.log('  Entities for typo query:', queryTypo);
  console.log('  Found:', entitiesTypo.map(e => e.canonical));
  if (!entitiesTypo.some(e => e.canonical === 'pasta')) throw new Error('Missing pasta');
  if (!entitiesTypo.some(e => e.canonical === 'tonno')) throw new Error('Missing tonno');
  // Ensure "ingrendienti" is NOT an entity
  if (entitiesTypo.some(e => e.raw.includes('ingrend'))) throw new Error('Typo ingrendienti was mistakenly treated as food!');

  // 4. Recipe matching against 617 database
  console.log('\n4. Test Recipe Matching:');
  const catalog = await getOrLoadAllRecipes();
  console.log(`  Catalog recipes loaded: ${catalog.length}`);
  if (catalog.length < 10) throw new Error(`Catalog too small: ${catalog.length}`);

  const matches = matchRecipesByIngredients(entities1, catalog);
  console.log(`  Matches found for pollo + carote + zucchine: ${matches.length}`);
  if (matches.length === 0) throw new Error('No matches found for common ingredients');
  console.log(`  Top match: "${matches[0].recipe.title}" (Score: ${matches[0].score}, Coverage: ${matches[0].userCoveragePercent}%)`);
  if (!matches[0].recipe.title) throw new Error('Invalid top match recipe');

  const formatted = formatRecipeMatchResponse(entities1, matches);
  if (!formatted.text.includes('pollo') || !formatted.actions || formatted.actions.length === 0) {
    throw new Error('Formatted response missing expected contents');
  }
  console.log('  Formatted actions count:', formatted.actions.length);

  // 5. Dish search by title
  console.log('\n5. Test Dish Search by Title:');
  const dishCarbonara = searchRecipeByDishTitle('come fare la carbonara', catalog);
  if (dishCarbonara) {
    console.log(`  Found dish: "${dishCarbonara.title}" (${dishCarbonara.category})`);
    const dishResp = formatSingleRecipeResponse(dishCarbonara);
    if (!dishResp.text.includes(dishCarbonara.title)) throw new Error('Single dish response missing title');
  } else {
    // If exact carbonara isn't in world recipes, test with another title from catalog
    const firstDish = catalog[0];
    const foundFirst = searchRecipeByDishTitle(`ricetta ${firstDish.title}`, catalog);
    if (!foundFirst) throw new Error(`Could not find dish ${firstDish.title} by title query`);
    console.log(`  Found dish: "${foundFirst.title}"`);
  }

  // 6. Expense extraction
  console.log('\n6. Test Expense Extraction:');
  const exp1 = extractExpenseQuery('ho speso 15 euro in farmacia');
  if (!exp1 || exp1.amount !== 15 || exp1.category !== 'Salute & Farmacia') {
    throw new Error(`Expense extraction failed: ${JSON.stringify(exp1)}`);
  }
  console.log(`  Expense extracted: €${exp1.amount} (${exp1.description}) -> ${exp1.category}`);

  const exp2 = extractExpenseQuery('45 euro per benzina');
  if (!exp2 || exp2.amount !== 45 || exp2.category !== 'Trasporti & Auto') {
    throw new Error(`Expense extraction failed: ${JSON.stringify(exp2)}`);
  }
  console.log(`  Expense extracted: €${exp2.amount} (${exp2.description}) -> ${exp2.category}`);

  // 7. Doctor query extraction
  console.log('\n7. Test Doctor Query Extraction:');
  const docStatus = extractDoctorQuery('a che ora apre lo studio del dottore?');
  if (!docStatus || docStatus.intent !== 'status') {
    throw new Error(`Doctor query status failed: ${JSON.stringify(docStatus)}`);
  }
  console.log('  Doctor status intent detected successfully');

  const docPrescription = extractDoctorQuery('mi serve la ricetta per la tachipirina');
  if (!docPrescription || docPrescription.intent !== 'prescription') {
    throw new Error(`Doctor query prescription failed: ${JSON.stringify(docPrescription)}`);
  }
  console.log(`  Doctor prescription intent detected for: ${docPrescription.medicineName}`);

  // 8. Recesso query extraction
  console.log('\n8. Test Recesso Query Extraction:');
  const recVodafone = extractRecessoQuery('voglio disdire Vodafone');
  if (!recVodafone || !recVodafone.provider || !recVodafone.provider.name.toLowerCase().includes('vodafone')) {
    throw new Error(`Recesso query for Vodafone failed: ${JSON.stringify(recVodafone)}`);
  }
  console.log(`  Recesso provider matched: ${recVodafone.provider.name} (PEC: ${recVodafone.provider.pec})`);

  // 9. Full queryChelonaAi end-to-end test
  console.log('\n9. Test queryChelonaAi End-to-End:');
  const mockModules: Module[] = [
    {
      id: 'auto_1',
      type: 'auto',
      title: 'Fiat Punto',
      brand: 'Fiat',
      model: 'Punto',
      plate: 'ZA111BB',
      fuel: 'benzina',
      km: 120000,
      taxDate: '2026-11-15',
      insuranceDate: '2026-12-01',
      inspectionDate: '2026-10-25',
      x: 0, y: 0, w: 3, h: 3
    } as any,
    {
      id: 'doc_1',
      type: 'document',
      title: 'Patente di Guida',
      documentType: 'patente',
      expiryDate: '2026-11-20',
      x: 0, y: 0, w: 3, h: 3
    } as any
  ];

  // Test recipe natural query in general chat
  const aiRecipeRes = await queryChelonaAi('ho del pollo, carote e zucchine cosa posso cucinare?', mockModules, 'Davide');
  console.log('  queryChelonaAi recipe response text preview:\n  ', aiRecipeRes.text.split('\n')[0]);
  if (!aiRecipeRes.actions || aiRecipeRes.actions.length === 0) {
    throw new Error('queryChelonaAi did not return recipe actions!');
  }

  // Test doctor natural query in general chat
  const aiDocRes = await queryChelonaAi('a che ora apre lo studio del medico?', mockModules, 'Davide');
  console.log('  queryChelonaAi doctor response text preview:\n  ', aiDocRes.text.split('\n')[0]);
  if (!aiDocRes.text.includes('Studio Medico') && !aiDocRes.text.includes('Dott.')) {
    throw new Error('queryChelonaAi did not return doctor info!');
  }

  // Test recesso natural query in general chat
  const aiRecRes = await queryChelonaAi('voglio disdire Sky', mockModules, 'Davide');
  console.log('  queryChelonaAi recesso response text preview:\n  ', aiRecRes.text.split('\n')[0]);
  if (!aiRecRes.text.includes('Disdetta Sky')) {
    throw new Error('queryChelonaAi did not return Sky recesso info!');
  }

  console.log('\n✨ === TUTTI I TEST DE "IL MATEMATICO" COMPLETATI CON SUCCESSO! === ✨');
}

main().catch(err => {
  console.error('\n❌ TEST RUNNER FAILED:', err);
  process.exit(1);
});
