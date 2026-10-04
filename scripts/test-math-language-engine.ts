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
  extractRecessoQuery,
  searchRecipesByCountryOrCuisine,
  formatCountryRecipesResponse
} from '../src/services/mathLanguageEngine';
import { queryChelonaAi } from '../src/services/chelonaEngine';
import { 
  semanticCache, 
  getSemanticCacheEntries, 
  deleteSemanticCacheEntry, 
  deleteSemanticCacheEntries, 
  clearSemanticCache,
  getLearnedMemories,
  saveLearnedMemory,
  deleteLearnedMemory,
  clearAllLearnedMemories
} from '../src/services/gemma2Engine';
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

  // Test typo "ingrendinte: melanzane e pomodori"
  const queryIngrendinte = "ho questi ingrendinte: melanzane e pomodori";
  const entitiesIngrendinte = extractFoodEntities(queryIngrendinte);
  console.log('  Entities for ingrendinte typo:', queryIngrendinte);
  console.log('  Found:', entitiesIngrendinte.map(e => e.canonical));
  if (!entitiesIngrendinte.some(e => e.canonical === 'melanzane')) throw new Error('Missing melanzane in ingrendinte test');
  if (!entitiesIngrendinte.some(e => e.canonical === 'pomodori')) throw new Error('Missing pomodori in ingrendinte test');

  // Test vegetables, meats, seafood
  const querySeafood = "ho funghi e salsiccia";
  const entitiesSeafood = extractFoodEntities(querySeafood);
  if (!entitiesSeafood.some(e => e.canonical === 'funghi') || !entitiesSeafood.some(e => e.canonical === 'salsiccia')) {
    throw new Error(`Failed to extract funghi and salsiccia: ${JSON.stringify(entitiesSeafood)}`);
  }
  console.log('  Extracted funghi e salsiccia:', entitiesSeafood.map(e => e.canonical));

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
  if (formatted.autoAction) {
    throw new Error('Recipe match response should NOT have autoAction to avoid auto-closing user chat!');
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

  // Test user request about "Il Matematico", sentience, and 1000% app usage
  const matematicoPrompt = "vorrei chiedere al matematico se è possibile usare il modello per farlo diventare senziente o comunque che riesca a comunicare bene con l'utente a tutte le richieste inerenti all'app, che possa sfruttare al 1000% l'app come se fosse un utente vero, come ti facevo prima l'esempio degli ingrendienti e trovi le ricette corrispondenti, quindi che riesca a capire il nome dell'ingrendinte che scrivi in chat o comunque il linguaggio che si usa";
  const matematicoRes = await queryChelonaAi(matematicoPrompt, mockModules, 'Davide');
  console.log('  Matematico sentience query reply preview:\n  ', matematicoRes.text.split('\n')[0]);
  if (!matematicoRes.text.includes('Il Matematico') || !matematicoRes.text.includes('Senzienza')) {
    throw new Error('queryChelonaAi did not address Il Matematico sentience inquiry!');
  }
  if (!matematicoRes.actions || matematicoRes.actions.length === 0) {
    throw new Error('queryChelonaAi should provide cross-app navigation actions for Matematico query!');
  }

  // Test recipe natural query in general chat with typo "ingrendinte"
  const aiRecipeRes = await queryChelonaAi('ho questi ingrendinte: melanzane e pomodori cosa posso cucinare?', mockModules, 'Davide');
  console.log('  queryChelonaAi recipe response text preview:\n  ', aiRecipeRes.text.split('\n')[0]);
  if (!aiRecipeRes.actions || aiRecipeRes.actions.length === 0) {
    throw new Error('queryChelonaAi did not return recipe actions for ingrendinte query!');
  }
  if (aiRecipeRes.autoAction) {
    throw new Error('queryChelonaAi should NOT return autoAction on recipe recommendations!');
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

  // Test 10: Specific verification of the prompt task
  console.log('\n10. Test Recipe Advice with typos & clean search bar:');
  const lunchAdviceQuery = "consigliami ricette a base di un ingrediente per il pranzo di domani";
  const lunchAdviceRes = await queryChelonaAi(lunchAdviceQuery, mockModules, 'Davide');
  console.log('  lunchAdviceRes text preview:\n  ', lunchAdviceRes.text.split('\n')[0]);
  if (!lunchAdviceRes.text.includes('pranzo') || !lunchAdviceRes.actions || lunchAdviceRes.actions.length === 0) {
    throw new Error('Lunch advice query did not return expected curated recipes');
  }
  if (lunchAdviceRes.autoAction) {
    throw new Error('Lunch advice query must NEVER have autoAction (must not kick user out of chat)!');
  }
  // Check that no action has search property
  for (const act of lunchAdviceRes.actions) {
    if ((act as any).search) {
      throw new Error(`Action has forbidden search property: ${(act as any).search}`);
    }
  }
  // Check that recipe actions have recipe objects
  const recipeActs = lunchAdviceRes.actions.filter(a => a.type === 'recipes' && (a as any).recipe);
  if (recipeActs.length < 3) {
    throw new Error(`Expected at least 3 recipe actions with recipe objects, found ${recipeActs.length}`);
  }
  // Verify minimalist text output (short intro, no giant walls of preparation text or ingredient dumps)
  if (lunchAdviceRes.text.includes('Preparazione') || lunchAdviceRes.text.includes('preparazione')) {
    throw new Error('Lunch advice text must NOT include long preparation steps in body!');
  }
  if (lunchAdviceRes.text.length > 250) {
    throw new Error(`Lunch advice text should be concise and minimalist, but length was ${lunchAdviceRes.text.length}`);
  }
  // Verify that recipes have metadata (title, category) in the action buttons
  for (const act of recipeActs) {
    const r = (act as any).recipe;
    if (!r.title || !r.category) {
      throw new Error(`Recipe action missing title or category: ${JSON.stringify(r)}`);
    }
  }

  // Test typo "ingrandienti" with meal query
  const typoMealQuery = "quando chiedo gli ingrandienti consigliami ricette a base di un ingrediente per il pranzo di domani";
  const typoMealRes = await queryChelonaAi(typoMealQuery, mockModules, 'Davide');
  if (typoMealRes.autoAction) {
    throw new Error('Typo query must not have autoAction!');
  }
  for (const act of typoMealRes.actions || []) {
    if ((act as any).search) {
      throw new Error(`Typo query action has forbidden search property: ${(act as any).search}`);
    }
  }

  // Test ingredient matching with typo "ingrandienti: zucchine e pollo"
  const typoIngrQuery = "consigliami ricette per pranzo con gli ingrandienti: zucchine e pollo";
  const typoIngrRes = await queryChelonaAi(typoIngrQuery, mockModules, 'Davide');
  if (typoIngrRes.autoAction) {
    throw new Error('Ingredient matching query must not have autoAction!');
  }
  for (const act of typoIngrRes.actions || []) {
    if ((act as any).search) {
      throw new Error(`Ingredient matching action has forbidden search property: ${(act as any).search}`);
    }
  }
  if (!typoIngrRes.text.includes('zucchine') && !typoIngrRes.text.includes('pollo')) {
    throw new Error('Ingredient matching query text missing matched ingredients!');
  }

  // Test 11: Asking about ingredients of a dish with typos ("quando chiedo gli ingrandienti della carbonara")
  console.log('\n11. Test Dish Ingredients Inquiries:');
  const dishIngrQuery = "quando chiedo gli ingrandienti della carbonara";
  const dishIngrRes = await queryChelonaAi(dishIngrQuery, mockModules, 'Davide');
  if (!dishIngrRes.text.includes('Carbonara') && !dishIngrRes.text.includes('Spaghetti alla Carbonara')) {
    throw new Error(`Dish ingredients query failed to find Carbonara: ${dishIngrRes.text.slice(0, 100)}`);
  }
  if (!dishIngrRes.text.includes('Guanciale') && !dishIngrRes.text.includes('Uova') && !dishIngrRes.text.includes('Pecorino')) {
    throw new Error(`Dish ingredients query failed to display Carbonara ingredients: ${dishIngrRes.text}`);
  }
  if (dishIngrRes.autoAction) {
    throw new Error('Dish ingredients query must not have autoAction!');
  }
  for (const act of dishIngrRes.actions || []) {
    if ((act as any).search) {
      throw new Error(`Dish ingredients action has forbidden search property: ${(act as any).search}`);
    }
  }

  // Test 12: General ingredient query ("chiedo gli ingrandienti")
  console.log('\n12. Test General Ingredient Query:');
  const generalIngrQuery = "chiedo gli ingrandienti";
  const generalIngrRes = await queryChelonaAi(generalIngrQuery, mockModules, 'Davide');
  if (!generalIngrRes.text.includes('Matematico') || !generalIngrRes.text.includes('ricette')) {
    throw new Error(`General ingredient inquiry failed: ${generalIngrRes.text.slice(0, 100)}`);
  }
  if (generalIngrRes.autoAction) {
    throw new Error('General ingredient query must not have autoAction!');
  }
  for (const act of generalIngrRes.actions || []) {
    if ((act as any).search) {
      throw new Error(`General ingredient action has forbidden search property: ${(act as any).search}`);
    }
  }

  // Test 13: Corresponding or similar ingredients
  console.log('\n13. Test Corresponding or Similar Ingredients:');
  const similarQuery = "trova ricette con ingredienti corrispondenti o simili a pomodoro";
  const similarRes = await queryChelonaAi(similarQuery, mockModules, 'Davide');
  if (!similarRes.text.includes('pomodoro') && !similarRes.text.includes('Pomodoro')) {
    throw new Error(`Similar ingredients query did not match pomodoro: ${similarRes.text.slice(0, 100)}`);
  }
  for (const act of similarRes.actions || []) {
    if ((act as any).search) {
      throw new Error(`Similar ingredients action has forbidden search property: ${(act as any).search}`);
    }
  }

  // Test 14: Cache Elimination Verification
  console.log('\n14. Test Cache Elimination & Direct Execution:');
  clearSemanticCache();
  if (getSemanticCacheEntries().length !== 0) {
    throw new Error('getSemanticCacheEntries must be empty');
  }
  semanticCache.set('come fare la pasta al pomodoro', 'hash1', { text: 'Ecco la ricetta semplice per la pasta al pomodoro fresco.' });
  if (getSemanticCacheEntries().length !== 0) {
    throw new Error('Cache entries must not be stored after elimination');
  }
  if (semanticCache.findMatch('come fare la pasta al pomodoro') !== null) {
    throw new Error('findMatch must return null when cache is eliminated');
  }
  console.log('  Cache elimination verified: no entries stored, direct live execution enforced.');

  // Test 15: Learned Memory Management
  console.log('\n15. Test Learned Memories Functional Management:');
  clearAllLearnedMemories();
  const initialMems = getLearnedMemories();
  if (initialMems.length !== 0) {
    throw new Error('clearAllLearnedMemories failed to clear memories');
  }

  const m1 = saveLearnedMemory({ key: 'Codice Cancello', fact: 'Il codice del cancello è 4821' });
  const m2 = saveLearnedMemory({ key: 'Taglia Scarpe', fact: 'La taglia di scarpe è 43' });
  const allMems = getLearnedMemories();
  if (allMems.length !== 2) {
    throw new Error(`Expected 2 learned memories, got ${allMems.length}`);
  }

  deleteLearnedMemory(m1.id);
  const remainingMems = getLearnedMemories();
  if (remainingMems.length !== 1 || remainingMems[0].key !== 'Taglia Scarpe') {
    throw new Error('deleteLearnedMemory failed to delete single memory');
  }

  clearAllLearnedMemories();
  if (getLearnedMemories().length !== 0) {
    throw new Error('clearAllLearnedMemories failed to reset memories');
  }
  console.log('  Learned memories add, query, delete single, and clear all passed!');

  // 16. International Cuisines & Countries (Cucine dal Mondo)
  console.log('\n16. Test International Cuisines & Countries (Cucine dal Mondo):');
  const japanMatch = searchRecipesByCountryOrCuisine('ricette giapponesi', catalog);
  if (!japanMatch || japanMatch.country !== 'Giappone' || japanMatch.flag !== '🇯🇵' || japanMatch.recipes.length === 0) {
    throw new Error(`Japan cuisine matching failed: ${JSON.stringify(japanMatch)}`);
  }
  console.log(`  Matched Japanese recipes (${japanMatch.recipes.length}):`, japanMatch.recipes.map(r => r.title));

  const mexicoMatch = searchRecipesByCountryOrCuisine('cucina messicana', catalog);
  if (!mexicoMatch || mexicoMatch.country !== 'Messico' || mexicoMatch.flag !== '🇲🇽' || mexicoMatch.recipes.length === 0) {
    throw new Error(`Mexico cuisine matching failed: ${JSON.stringify(mexicoMatch)}`);
  }
  console.log(`  Matched Mexican recipes (${mexicoMatch.recipes.length}):`, mexicoMatch.recipes.map(r => r.title));

  const greeceMatch = searchRecipesByCountryOrCuisine('piatti tipici greci', catalog);
  if (!greeceMatch || greeceMatch.country !== 'Grecia' || greeceMatch.flag !== '🇬🇷' || greeceMatch.recipes.length === 0) {
    throw new Error(`Greece cuisine matching failed: ${JSON.stringify(greeceMatch)}`);
  }
  console.log(`  Matched Greek recipes (${greeceMatch.recipes.length}):`, greeceMatch.recipes.map(r => r.title));

  const nonCountryMatch = searchRecipesByCountryOrCuisine('pasta al pomodoro fresco', catalog);
  if (nonCountryMatch !== null) {
    throw new Error('Standard recipe query should not match country cuisine search');
  }

  const formattedJapan = formatCountryRecipesResponse(japanMatch);
  if (!formattedJapan.text.includes('🇯🇵') || !formattedJapan.text.includes('Giappone') || !formattedJapan.actions || formattedJapan.actions.length === 0) {
    throw new Error('Formatted country recipes response missing flag or action buttons');
  }
  console.log('  Formatted Japan response action count:', formattedJapan.actions.length);

  // Test dishes explicitly mentioned in requirements
  const testDishes = [
    { query: 'moussaka', expectedCountry: 'Grecia', flag: '🇬🇷' },
    { query: 'guacamole', expectedCountry: 'Messico', flag: '🇲🇽' },
    { query: 'tajine', expectedCountry: 'Marocco', flag: '🇲🇦' },
    { query: 'curry', expectedCountry: 'India', flag: '🇮🇳' },
    { query: 'falafel', expectedCountry: 'Libano', flag: '🇱🇧' },
    { query: 'gazpacho', expectedCountry: 'Spagna', flag: '🇪🇸' },
    { query: 'bibimbap', expectedCountry: 'Corea del Sud', flag: '🇰🇷' },
    { query: 'kebab', expectedCountry: 'Turchia', flag: '🇹🇷' },
    { query: 'pho', expectedCountry: 'Vietnam', flag: '🇻🇳' },
    { query: 'ceviche', expectedCountry: 'Perù', flag: '🇵🇪' }
  ];

  for (const item of testDishes) {
    const match = searchRecipesByCountryOrCuisine(item.query, catalog);
    if (!match || match.country !== item.expectedCountry || match.flag !== item.flag) {
      throw new Error(`Country cuisine matching failed for "${item.query}": expected ${item.expectedCountry} (${item.flag}), got ${JSON.stringify(match)}`);
    }
    const aiRes = await queryChelonaAi(item.query, mockModules, 'Davide');
    if (!aiRes.text.includes(item.expectedCountry) && !aiRes.text.includes(item.flag)) {
      throw new Error(`queryChelonaAi failed to resolve "${item.query}" to ${item.expectedCountry}: ${aiRes.text.slice(0, 100)}`);
    }
  }
  console.log(`  Successfully verified ${testDishes.length} authentic international dishes across ${testDishes.length} countries with Il Matematico!`);

  // Verify explicit required recipes in catalog
  const gazpachoInDb = catalog.find(r => r.title.toLowerCase().includes('gazpacho'));
  if (!gazpachoInDb || gazpachoInDb.country !== 'Spagna') {
    throw new Error('Gazpacho Andaluso missing or incorrectly tagged in catalog');
  }
  const curryVerdureInDb = catalog.find(r => r.title.toLowerCase().includes('curry di verdure'));
  if (!curryVerdureInDb || curryVerdureInDb.country !== 'India') {
    throw new Error('Curry di Verdure missing or incorrectly tagged in catalog');
  }
  console.log('  Verified Gazpacho Andaluso (Spagna) and Curry di Verdure (India) in database!');

  // End-to-end AI query for world recipes
  const aiWorldQuery = await queryChelonaAi('vorrei cucinare qualcosa di giapponese', mockModules, 'Davide');
  if (!aiWorldQuery.text.includes('Giappone') || !aiWorldQuery.text.includes('🇯🇵') || !aiWorldQuery.actions || aiWorldQuery.actions.length === 0) {
    throw new Error(`queryChelonaAi world cuisine intent failed: ${JSON.stringify(aiWorldQuery)}`);
  }
  console.log('  queryChelonaAi correctly answered with Japanese recipes and actions!');

  console.log('\n✨ === TUTTI I TEST DE "IL MATEMATICO" COMPLETATI CON SUCCESSO! === ✨');
}

main().then(() => {
  process.exit(0);
}).catch(err => {
  console.error('\n❌ TEST RUNNER FAILED:', err);
  process.exit(1);
});
