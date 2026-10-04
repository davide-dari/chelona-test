import assert from 'node:assert';
import { 
  parseDurationISO, 
  parseServings, 
  parseCalories, 
  parseInstructions, 
  parseIngredients, 
  extractRecipeFromHtml, 
  extractSourceName,
  mapToChelonaCategory,
  saveUserRecipe,
  loadUserRecipes,
  deleteUserRecipe,
  USER_RECIPES_STORAGE_KEY,
  CULINARY_PRESETS
} from '../src/services/userRecipesService.ts';

console.log('🧪 === TEST USER RECIPES SERVICE & WEB IMPORTER ===');

// Setup mock window & localStorage for Node testing
const mockStorage: Record<string, string> = {};
(global as any).window = {
  dispatchEvent: (event: any) => {
    // Event dispatched
  }
};
(global as any).localStorage = {
  getItem: (key: string) => mockStorage[key] || null,
  setItem: (key: string, value: string) => { mockStorage[key] = value; },
  removeItem: (key: string) => { delete mockStorage[key]; },
  clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); }
};
(global as any).CustomEvent = class CustomEvent {
  type: string;
  constructor(type: string, params?: any) {
    this.type = type;
  }
};

// 1. Test Duration Parsing
console.log('1. Testing Duration Parsing (ISO 8601 & Text)...');
assert.strictEqual(parseDurationISO('PT20M'), 20);
assert.strictEqual(parseDurationISO('PT1H'), 60);
assert.strictEqual(parseDurationISO('PT1H15M'), 75);
assert.strictEqual(parseDurationISO('PT2H30M'), 150);
assert.strictEqual(parseDurationISO('PT1.5H'), 90);
assert.strictEqual(parseDurationISO('PT45S'), 1); // 45s rounded to 1 min
assert.strictEqual(parseDurationISO('P0DT0H25M'), 25);
assert.strictEqual(parseDurationISO('30 min'), 30);
assert.strictEqual(parseDurationISO('1 ora e 10 minuti'), 70);
assert.strictEqual(parseDurationISO('mezzora'), 30);
assert.strictEqual(parseDurationISO('mezz\'ora'), 30);
assert.strictEqual(parseDurationISO(45), 45);
assert.strictEqual(parseDurationISO(undefined), undefined);
console.log('✓ Duration parsing passed');

// 2. Test Servings Parsing
console.log('2. Testing Servings Parsing...');
assert.strictEqual(parseServings(4), 4);
assert.strictEqual(parseServings('4 porzioni'), 4);
assert.strictEqual(parseServings('Per 6 persone'), 6);
assert.strictEqual(parseServings(['8']), 8);
assert.strictEqual(parseServings([4]), 4); // Array with number
assert.strictEqual(parseServings(null), undefined);
console.log('✓ Servings parsing passed');

// 3. Test Calories Parsing
console.log('3. Testing Calories Parsing...');
assert.strictEqual(parseCalories('450 kcal'), 450);
assert.strictEqual(parseCalories('320 calories'), 320);
assert.strictEqual(parseCalories(500), 500);
assert.strictEqual(parseCalories(['450 kcal']), 450);
assert.strictEqual(parseCalories({ value: 520 }), 520);
assert.strictEqual(parseCalories(undefined), undefined);
console.log('✓ Calories parsing passed');

// 4. Test Instructions Parsing
console.log('4. Testing Instructions Parsing (HowToStep, HowToSection, strings)...');
const stepsHowTo = parseInstructions([
  { '@type': 'HowToStep', text: 'Rosolare il guanciale in padella senza olio.' },
  { '@type': 'HowToStep', text: 'Sbattere i tuorli d uovo con il pecorino romano.' },
  { '@type': 'HowToStep', text: 'Scolare la pasta al dente e mantecare.' }
]);
assert.strictEqual(stepsHowTo.length, 3);
assert(stepsHowTo[0].includes('Rosolare il guanciale'));

const stepsSections = parseInstructions([
  {
    '@type': 'HowToSection',
    name: 'Preparazione del Condimento',
    itemListElement: [
      { '@type': 'HowToStep', text: 'Tagliare le zucchine a rondelle sottili.' }
    ]
  },
  {
    '@type': 'HowToSection',
    name: 'Cottura',
    itemListElement: [
      { '@type': 'HowToStep', text: 'Cuocere la pasta in abbondante acqua salata.' }
    ]
  }
]);
assert.strictEqual(stepsSections.length, 4); // 2 headers + 2 steps
assert(stepsSections[0].includes('Preparazione del Condimento'));
assert(stepsSections[1].includes('Tagliare le zucchine'));

const stepsText = parseInstructions("Fase 1: Preparare l'impasto.\nFase 2: Far lievitare per 2 ore.\nFase 3: Infornare a 220°C.");
assert.strictEqual(stepsText.length, 3);
console.log('✓ Instructions parsing passed');

// 5. Test Ingredients Parsing
console.log('5. Testing Ingredients Parsing...');
const ingredientsRaw = [
  '320g spaghetti trafilati al bronzo',
  '150g guanciale di Amatrice',
  '4 tuorli di uova fresche',
  '50g pecorino romano DOP'
];
const parsedIngs = parseIngredients(ingredientsRaw);
assert.strictEqual(parsedIngs.length, 4);
assert.strictEqual(parsedIngs[0], '320g spaghetti trafilati al bronzo');
console.log('✓ Ingredients parsing passed');

// 6. Test Source Name & Category Mapping
console.log('6. Testing Source Name & Category Mapping...');
assert.strictEqual(extractSourceName('https://ricette.giallozafferano.it/Spaghetti-alla-Carbonara.html'), 'Giallozafferano');
assert.strictEqual(extractSourceName('https://www.cookist.it/torta-alle-mele/'), 'Cookist');
assert.strictEqual(extractSourceName('https://blog.giallozafferano.it/ricettefacili/lasagna/'), 'Giallozafferano');

assert.strictEqual(mapToChelonaCategory('Primi piatti', 'Italiana'), 'Primi');
assert.strictEqual(mapToChelonaCategory('Secondi di pesce', 'Italiana'), 'Secondi');
assert.strictEqual(mapToChelonaCategory('Dolci e dessert'), 'Dolci');
assert.strictEqual(mapToChelonaCategory('Main Course', 'Messicana'), 'Cucine dal Mondo');
assert.strictEqual(mapToChelonaCategory('Insalate e antipasti'), 'Antipasti');
console.log('✓ Source and category mapping passed');

// 7. Test Schema.org JSON-LD Full HTML Extraction
console.log('7. Testing Full HTML Schema.org JSON-LD Extraction...');
const mockGialloZafferanoHtml = `
<!DOCTYPE html>
<html>
<head>
  <title>Spaghetti alla Carbonara - Ricetta Originale</title>
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "url": "https://ricette.giallozafferano.it/"
      },
      {
        "@type": "Recipe",
        "name": "Spaghetti alla Carbonara",
        "image": "https://images.unsplash.com/photo-1612874742237-6526221588e3?w=800",
        "description": "I veri spaghetti alla carbonara romani con guanciale e pecorino.",
        "recipeYield": "4 porzioni",
        "prepTime": "PT15M",
        "cookTime": "PT15M",
        "recipeCategory": "Primi piatti",
        "recipeCuisine": "Italiana",
        "recipeIngredient": [
          "320 g spaghetti",
          "150 g guanciale",
          "4 tuorli d'uovo freschi",
          "50 g pecorino romano",
          "pepe nero q.b."
        ],
        "recipeInstructions": [
          {
            "@type": "HowToStep",
            "text": "Tagliare il guanciale a striscioline e rosolarlo a fuoco medio."
          },
          {
            "@type": "HowToStep",
            "text": "Battere i tuorli con il pecorino romano grattugiato e il pepe nero."
          },
          {
            "@type": "HowToStep",
            "text": "Scolare gli spaghetti al dente e mantecare lontano dal fuoco."
          }
        ],
        "nutrition": {
          "@type": "NutritionInformation",
          "calories": "620 kcal"
        }
      }
    ]
  }
  </script>
</head>
<body></body>
</html>
`;

const extracted = extractRecipeFromHtml(mockGialloZafferanoHtml, 'https://ricette.giallozafferano.it/Spaghetti-alla-Carbonara.html');
assert.strictEqual(extracted.title, 'Spaghetti alla Carbonara');
assert.strictEqual(extracted.category, 'Primi');
assert.strictEqual(extracted.servings, 4);
assert.strictEqual(extracted.prepTimeMinutes, 15);
assert.strictEqual(extracted.cookTimeMinutes, 15);
assert.strictEqual(extracted.calories, 620);
assert.strictEqual(extracted.ingredients.length, 5);
assert.strictEqual(extracted.steps.length, 3);
assert.strictEqual(extracted.sourceName, 'Giallozafferano');
assert.strictEqual(extracted.isCustom, true);
console.log('✓ Full HTML extraction passed');

// 8. Test OpenGraph Fallback HTML Extraction
console.log('8. Testing OpenGraph Fallback HTML Extraction...');
const mockOgHtml = `
<!DOCTYPE html>
<html>
<head>
  <title>Torta Paradiso della Nonna</title>
  <meta property="og:title" content="Torta Paradiso Soffice" />
  <meta property="og:image" content="https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800" />
</head>
<body>
  <h1>Torta Paradiso Soffice</h1>
</body>
</html>
`;
const extractedOg = extractRecipeFromHtml(mockOgHtml, 'https://www.cookist.it/torta-paradiso');
assert.strictEqual(extractedOg.title, 'Torta Paradiso Soffice');
assert(extractedOg.image.includes('photo-1578985545062-69928b1d9587'));
assert.strictEqual(extractedOg.sourceName, 'Cookist');
console.log('✓ OpenGraph fallback passed');

// 8b. Test HTML Microdata Fallback Extraction
console.log('8b. Testing HTML Microdata Fallback Extraction...');
const mockMicrodataHtml = `
<!DOCTYPE html>
<html>
<head><title>Lasagna Tradizionale</title></head>
<body>
  <div itemscope itemtype="http://schema.org/Recipe">
    <h1 itemprop="name">Lasagne alla Bolognese</h1>
    <img itemprop="image" src="https://images.unsplash.com/photo-1574894709920-11b28e7367e3?w=800" />
    <span itemprop="recipeYield">6 porzioni</span>
    <meta itemprop="prepTime" content="PT30M" />
    <meta itemprop="cookTime" content="PT45M" />
    <span itemprop="recipeCategory">Primi</span>
    <ul>
      <li itemprop="recipeIngredient">500g pasta all uovo</li>
      <li itemprop="recipeIngredient">700g ragù bolognese</li>
      <li itemprop="recipeIngredient">500ml besciamella</li>
    </ul>
    <div itemprop="recipeInstructions">Stendere il ragù e la besciamella tra gli strati di pasta.</div>
    <div itemprop="recipeInstructions">Infornare a 180 gradi per 40 minuti fino a doratura.</div>
  </div>
</body>
</html>
`;
const extractedMicro = extractRecipeFromHtml(mockMicrodataHtml, 'https://www.cucinaitaliana.it/lasagne');
assert.strictEqual(extractedMicro.title, 'Lasagne alla Bolognese');
assert.strictEqual(extractedMicro.servings, 6);
assert.strictEqual(extractedMicro.prepTimeMinutes, 30);
assert.strictEqual(extractedMicro.cookTimeMinutes, 45);
assert.strictEqual(extractedMicro.ingredients.length, 3);
assert.strictEqual(extractedMicro.steps.length, 2);
assert(extractedMicro.image.includes('photo-1574894709920-11b28e7367e3'));
console.log('✓ HTML Microdata extraction passed');

// 9. Test LocalStorage Persistence (CRUD)
console.log('9. Testing LocalStorage Persistence (Save, Load, Update, Delete)...');
mockStorage[USER_RECIPES_STORAGE_KEY] = '[]';

const saved1 = saveUserRecipe({
  title: 'Risotto ai Funghi Porcini Fatto in Casa',
  category: 'Primi',
  country: 'Italia',
  servings: 4,
  prepTimeMinutes: 10,
  cookTimeMinutes: 25,
  calories: 410,
  ingredients: ['320g riso carnaroli', '300g funghi porcini freschi', '1 scalogno', '1l brodo vegetale'],
  steps: [
    'Tostare il riso a secco per 2 minuti.',
    'Aggiungere il brodo bollente poco alla volta.',
    'Mantecare a fuoco spento con burro e parmigiano.'
  ]
});

assert(saved1.id.startsWith('user_rec_'));
let all = loadUserRecipes();
assert.strictEqual(all.length, 1);
assert.strictEqual(all[0].title, 'Risotto ai Funghi Porcini Fatto in Casa');
assert.strictEqual(all[0].isCustom, true);

// Update
const updated = saveUserRecipe({
  ...saved1,
  title: 'Risotto Cremoso ai Funghi Porcini e Tartufo'
});
all = loadUserRecipes();
assert.strictEqual(all.length, 1);
assert.strictEqual(all[0].title, 'Risotto Cremoso ai Funghi Porcini e Tartufo');

// Delete
const remaining = deleteUserRecipe(saved1.id);
assert.strictEqual(remaining.length, 0);
assert.strictEqual(loadUserRecipes().length, 0);
console.log('✓ LocalStorage CRUD operations passed');

// 10. Test Culinary Presets Integrity
console.log('10. Testing Culinary Presets Integrity...');
assert(CULINARY_PRESETS.length >= 10);
for (const preset of CULINARY_PRESETS) {
  assert(preset.id && preset.name && preset.category && preset.image && preset.emoji);
  assert(preset.image.startsWith('https://'));
}
console.log(`✓ All ${CULINARY_PRESETS.length} culinary presets validated`);

console.log('🎉 ALL USER RECIPES SERVICE TESTS PASSED PERFECTLY!');
