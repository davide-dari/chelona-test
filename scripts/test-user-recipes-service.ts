import assert from 'node:assert';
import { 
  parseDurationISO, 
  parseServings, 
  parseCalories, 
  parseInstructions, 
  parseIngredients, 
  extractRecipeFromHtml, 
  extractAllRecipesFromHtml,
  extractSourceName,
  mapToChelonaCategory,
  saveUserRecipe,
  saveUserRecipes,
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

// 11. Test Multi-Recipe Extraction from ItemList
console.log('11. Testing Multi-Recipe Extraction from ItemList (Schema.org)...');
const mockItemListHtml = `
<!DOCTYPE html>
<html>
<head>
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "Le migliori 3 ricette estive",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "item": {
          "@type": "Recipe",
          "name": "Pasta Fredda alla Caprese",
          "image": "https://images.unsplash.com/photo-pasta1",
          "recipeIngredient": ["320g fusilli", "200g mozzarella", "200g pomodorini"],
          "recipeInstructions": ["Cuocere i fusilli", "Tagliare la mozzarella"],
          "prepTime": "PT15M",
          "recipeYield": "4"
        }
      },
      {
        "@type": "ListItem",
        "position": 2,
        "item": {
          "@type": "Recipe",
          "name": "Insalata di Riso Classica",
          "image": "https://images.unsplash.com/photo-rice1",
          "recipeIngredient": ["300g riso", "150g condiriso", "2 uova sode"],
          "recipeInstructions": ["Lessare il riso", "Unire tutti gli ingredienti"],
          "prepTime": "PT20M",
          "recipeYield": "4"
        }
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": "Couscous con Verdure Grigliate",
        "url": "https://example.com/couscous-verdure",
        "image": "https://images.unsplash.com/photo-couscous"
      }
    ]
  }
  </script>
</head>
<body></body>
</html>
`;
const itemListRecipes = extractAllRecipesFromHtml(mockItemListHtml, 'https://example.com/raccolte/estate');
assert.strictEqual(itemListRecipes.length, 3);
assert.strictEqual(itemListRecipes[0].title, 'Pasta Fredda alla Caprese');
assert.strictEqual(itemListRecipes[0].category, 'Primi');
assert.strictEqual(itemListRecipes[0].ingredients.length, 3);
assert.strictEqual(itemListRecipes[1].title, 'Insalata di Riso Classica');
assert.strictEqual(itemListRecipes[1].category, 'Primi');
assert.strictEqual(itemListRecipes[2].title, 'Couscous con Verdure Grigliate');
assert.strictEqual(itemListRecipes[2].sourceUrl, 'https://example.com/couscous-verdure');
console.log('✓ Multi-recipe ItemList extraction passed');

// 12. Test Multi-Recipe Extraction from @graph
console.log('12. Testing Multi-Recipe Extraction from @graph...');
const mockMultiGraphHtml = `
<!DOCTYPE html>
<html>
<head>
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "name": "Blog di Cucina"
      },
      {
        "@type": "Recipe",
        "name": "Gnocchi alla Sorrentina",
        "recipeCategory": "Primi",
        "recipeIngredient": ["500g gnocchi", "400g passata", "200g fior di latte"],
        "recipeInstructions": ["Cuocere la passata", "Infornare a 200°C"]
      },
      {
        "@type": "Recipe",
        "name": "Polpette al Sugo della Nonna",
        "recipeCategory": "Secondi",
        "recipeIngredient": ["500g macinato", "1 uovo", "pangrattato"],
        "recipeInstructions": ["Impastare", "Friggere e cuocere nel sugo"]
      }
    ]
  }
  </script>
</head>
</html>
`;
const graphRecipes = extractAllRecipesFromHtml(mockMultiGraphHtml, 'https://example.com/menu-domenica');
assert.strictEqual(graphRecipes.length, 2);
assert.strictEqual(graphRecipes[0].title, 'Gnocchi alla Sorrentina');
assert.strictEqual(graphRecipes[0].category, 'Primi');
assert.strictEqual(graphRecipes[1].title, 'Polpette al Sugo della Nonna');
assert.strictEqual(graphRecipes[1].category, 'Secondi');
console.log('✓ Multi-recipe @graph extraction passed');

// 13. Test Multi-Recipe from Multiple <script type="application/ld+json"> tags
console.log('13. Testing Multiple <script type="application/ld+json"> tags...');
const mockMultiScriptHtml = `
<!DOCTYPE html>
<html>
<head>
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Recipe",
    "name": "Bruschetta al Pomodoro",
    "recipeCategory": "Antipasti"
  }
  </script>
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Recipe",
    "name": "Panna Cotta ai Frutti di Bosco",
    "recipeCategory": "Dolci"
  }
  </script>
</head>
</html>
`;
const multiScriptRecipes = extractAllRecipesFromHtml(mockMultiScriptHtml, 'https://example.com/cena-due');
assert.strictEqual(multiScriptRecipes.length, 2);
assert.strictEqual(multiScriptRecipes[0].title, 'Bruschetta al Pomodoro');
assert.strictEqual(multiScriptRecipes[0].category, 'Antipasti');
assert.strictEqual(multiScriptRecipes[1].title, 'Panna Cotta ai Frutti di Bosco');
assert.strictEqual(multiScriptRecipes[1].category, 'Dolci');
console.log('✓ Multiple JSON-LD script tags extraction passed');

// 14. Test Multi-Recipe from Multiple HTML Microdata blocks
console.log('14. Testing Multiple HTML Microdata blocks...');
const mockMultiMicrodataHtml = `
<!DOCTYPE html>
<html>
<body>
  <div itemscope itemtype="http://schema.org/Recipe">
    <h2 itemprop="name">Risotto allo Zafferano</h2>
    <span itemprop="recipeCategory">Primi</span>
    <ul>
      <li itemprop="recipeIngredient">320g riso carnaroli</li>
      <li itemprop="recipeIngredient">1 bustina di zafferano</li>
    </ul>
    <div itemprop="recipeInstructions">Tostare il riso e unire lo zafferano sciolto in brodo.</div>
  </div>
  <div itemscope itemtype="http://schema.org/Recipe">
    <h2 itemprop="name">Filetto di Spigola al Forno</h2>
    <span itemprop="recipeCategory">Secondi</span>
    <ul>
      <li itemprop="recipeIngredient">2 filetti di spigola</li>
      <li itemprop="recipeIngredient">1 limone</li>
    </ul>
    <div itemprop="recipeInstructions">Disporre i filetti su carta forno e cuocere per 15 min.</div>
  </div>
</body>
</html>
`;
const multiMicroRecipes = extractAllRecipesFromHtml(mockMultiMicrodataHtml, 'https://example.com/menu-pesce');
assert.strictEqual(multiMicroRecipes.length, 2);
assert.strictEqual(multiMicroRecipes[0].title, 'Risotto allo Zafferano');
assert.strictEqual(multiMicroRecipes[0].category, 'Primi');
assert.strictEqual(multiMicroRecipes[0].ingredients.length, 2);
assert.strictEqual(multiMicroRecipes[1].title, 'Filetto di Spigola al Forno');
assert.strictEqual(multiMicroRecipes[1].category, 'Secondi');
assert.strictEqual(multiMicroRecipes[1].ingredients.length, 2);
console.log('✓ Multiple HTML Microdata blocks extraction passed');

// 15. Test Bulk Saving with saveUserRecipes
console.log('15. Testing Bulk Saving with saveUserRecipes...');
const bulkSaved = saveUserRecipes([
  { title: 'Ricetta Multipla 1', category: 'Primi', ingredients: ['Ing 1'], steps: ['Step 1'] },
  { title: 'Ricetta Multipla 2', category: 'Dolci', ingredients: ['Ing 2'], steps: ['Step 2'] }
]);
assert.strictEqual(bulkSaved.length, 2);
const loadedAll = loadUserRecipes();
assert(loadedAll.some(r => r.title === 'Ricetta Multipla 1'));
assert(loadedAll.some(r => r.title === 'Ricetta Multipla 2'));
console.log('✓ Bulk saveUserRecipes passed');

// 16. Test extractRecipeFromHtml returns first recipe from multi-recipe page
console.log('16. Testing extractRecipeFromHtml returns first recipe...');
const firstRecipe = extractRecipeFromHtml(mockMultiScriptHtml, 'https://example.com/cena-due');
assert.strictEqual(firstRecipe.title, 'Bruschetta al Pomodoro');
console.log('✓ extractRecipeFromHtml backward-compatibility passed');

// 17. Test WordPress / Yoast SEO CDATA wrapped JSON-LD
console.log('17. Testing WordPress / Yoast SEO CDATA wrapped JSON-LD...');
const mockYoastCdataHtml = `
<!DOCTYPE html>
<html>
<head>
  <script type="application/ld+json" class="yoast-schema-graph">
  /* <![CDATA[ */
  {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Recipe",
        "name": "Torta Margherita Soffice",
        "recipeCategory": "Dolci",
        "recipeIngredient": ["200g farina", "150g fecola", "4 uova"]
      }
    ]
  }
  /* ]]> */
  </script>
</head>
</html>
`;
const cdataRecipes = extractAllRecipesFromHtml(mockYoastCdataHtml, 'https://blog.giallozafferano.it/torta-margherita');
assert.strictEqual(cdataRecipes.length, 1);
assert.strictEqual(cdataRecipes[0].title, 'Torta Margherita Soffice');
assert.strictEqual(cdataRecipes[0].category, 'Dolci');
assert.strictEqual(cdataRecipes[0].ingredients.length, 3);
console.log('✓ WordPress/Yoast CDATA JSON-LD extraction passed');

// 18. Test Schema.org ItemList with string URLs (ListItem.item as URL string)
console.log('18. Testing Schema.org ItemList with string URLs...');
const mockItemListStringUrls = `
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "ItemList",
  "name": "Le migliori paste",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Spaghetti alla Carbonara",
      "item": "https://example.com/ricette/carbonara"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "Bucatini all'Amatriciana",
      "url": "https://example.com/ricette/amatriciana"
    }
  ]
}
</script>
`;
const stringUrlRecipes = extractAllRecipesFromHtml(mockItemListStringUrls, 'https://example.com/raccolte/paste');
assert.strictEqual(stringUrlRecipes.length, 2);
assert.strictEqual(stringUrlRecipes[0].title, 'Spaghetti alla Carbonara');
assert.strictEqual(stringUrlRecipes[0].sourceUrl, 'https://example.com/ricette/carbonara');
assert.strictEqual(stringUrlRecipes[1].title, "Bucatini all'Amatriciana");
console.log('✓ ItemList string URLs extraction passed');

// 19. Test Nested ItemList (e.g. Menu with course categories)
console.log('19. Testing Nested ItemList extraction...');
const mockNestedItemListHtml = `
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "ItemList",
  "name": "Menu della Domenica",
  "itemListElement": [
    {
      "@type": "ListItem",
      "item": {
        "@type": "ItemList",
        "name": "Primi Piatti",
        "itemListElement": [
          { "@type": "Recipe", "name": "Lasagna al Forno Classica" }
        ]
      }
    },
    {
      "@type": "ListItem",
      "item": {
        "@type": "ItemList",
        "name": "Secondi Piatti",
        "itemListElement": [
          { "@type": "Recipe", "name": "Arrosto di Vitello con Patate" }
        ]
      }
    }
  ]
}
</script>
`;
const nestedRecipes = extractAllRecipesFromHtml(mockNestedItemListHtml, 'https://example.com/menu');
assert.strictEqual(nestedRecipes.length, 2);
assert.strictEqual(nestedRecipes[0].title, 'Lasagna al Forno Classica');
assert.strictEqual(nestedRecipes[1].title, 'Arrosto di Vitello con Patate');
console.log('✓ Nested ItemList extraction passed');

// 20. Test Microdata with <meta itemprop="name" content="..."> and nested heading tags
console.log('20. Testing Microdata with meta content and nested heading tags...');
const mockAdvancedMicrodata = `
<div itemscope itemtype="http://schema.org/Recipe">
  <meta itemprop="name" content="Torta Salata con Ricotta e Spinaci" />
  <meta itemprop="recipeCategory" content="Antipasti" />
  <meta itemprop="recipeYield" content="6 porzioni" />
  <meta itemprop="recipeIngredient" content="1 rotolo pasta sfoglia" />
  <meta itemprop="recipeIngredient" content="300g ricotta" />
  <meta itemprop="recipeIngredient" content="250g spinaci" />
</div>
<div itemscope itemtype="http://schema.org/Recipe">
  <h2 itemprop="name"><a href="/focaccia"><span>Focaccia Pugliese con Pomodorini</span></a></h2>
  <span itemprop="recipeCategory">Lievitati</span>
  <ul>
    <li itemprop="recipeIngredient">500g farina</li>
    <li itemprop="recipeIngredient">10 pomodorini ciliegino</li>
  </ul>
</div>
`;
const advancedMicro = extractAllRecipesFromHtml(mockAdvancedMicrodata, 'https://example.com/ricette-forno');
assert.strictEqual(advancedMicro.length, 2);
assert.strictEqual(advancedMicro[0].title, 'Torta Salata con Ricotta e Spinaci');
assert.strictEqual(advancedMicro[0].servings, 6);
assert.strictEqual(advancedMicro[0].ingredients.length, 3);
assert.strictEqual(advancedMicro[1].title, 'Focaccia Pugliese con Pomodorini');
assert.strictEqual(advancedMicro[1].ingredients.length, 2);
console.log('✓ Advanced Microdata extraction passed');

// 21. Test Microdata Multi-step instructions inside <div itemprop="recipeInstructions">
console.log('21. Testing Microdata Multi-step instructions...');
const mockMicroInstructions = `
<div itemscope itemtype="http://schema.org/Recipe">
  <h1 itemprop="name">Torta Soffice di Mele</h1>
  <div itemprop="recipeInstructions">
    <p>Passo 1: Mescolare le uova con lo zucchero fino a renderle spumose.</p>
    <p>Passo 2: Aggiungere la farina setacciata, il latte e il lievito.</p>
    <p>Passo 3: Disporre le fette di mela a raggiera e infornare a 180 gradi per 40 minuti.</p>
  </div>
</div>
`;
const instructionsRecipe = extractAllRecipesFromHtml(mockMicroInstructions, 'https://example.com/torta-mele');
assert.strictEqual(instructionsRecipe.length, 1);
assert.strictEqual(instructionsRecipe[0].steps.length, 3);
assert(instructionsRecipe[0].steps[0].includes('Passo 1'));
assert(instructionsRecipe[0].steps[2].includes('Passo 3'));
console.log('✓ Microdata multi-step instructions passed');

// 22. Test Collection article with numbered headings (e.g. "10 ricette veloci con le zucchine")
console.log('22. Testing Collection article with numbered headings...');
const mockCollectionArticleHtml = `
<!DOCTYPE html>
<html>
<head><title>10 Ricette Veloci con le Zucchine - Blog Cucina</title></head>
<body>
  <h1>10 Ricette Veloci con le Zucchine</h1>
  <div class="article-body">
    <h2>1. Pasta con Crema di Zucchine e Noci</h2>
    <img src="https://images.unsplash.com/photo-pasta" />
    <p>Un primo piatto fresco, pronto nel tempo di cottura della pasta.</p>

    <h2>2. Polpette di Zucchine e Ricotta al Forno</h2>
    <img src="https://images.unsplash.com/photo-polpette" />
    <p>Morbide e gustose, perfette per i bambini o un aperitivo.</p>

    <h2>3. Zucchine Trifolate in Padella</h2>
    <img src="https://images.unsplash.com/photo-trifolate" />
    <p>Il contorno classico che si adatta ad ogni secondo.</p>
  </div>
</body>
</html>
`;
const collectionRecipes = extractAllRecipesFromHtml(mockCollectionArticleHtml, 'https://example.com/10-ricette-zucchine');
assert.strictEqual(collectionRecipes.length, 3);
assert.strictEqual(collectionRecipes[0].title, 'Pasta con Crema di Zucchine e Noci');
assert.strictEqual(collectionRecipes[1].title, 'Polpette di Zucchine e Ricotta al Forno');
assert.strictEqual(collectionRecipes[2].title, 'Zucchine Trifolate in Padella');
assert(collectionRecipes[0].image.includes('photo-pasta'));
console.log('✓ Numbered headings collection article passed');

// 23. Test Recipe cards list wrapped in <li> elements
console.log('23. Testing Recipe cards list wrapped in <li> elements...');
const mockLiCardsHtml = `
<ul class="recipe-grid">
  <li class="recipe-item">
    <a href="/ricette/risotto-asparagi" class="recipe-title">Risotto Cremoso agli Asparagi</a>
    <img src="https://images.unsplash.com/photo-risotto" />
  </li>
  <li class="recipe-item">
    <a href="/ricette/vellutata-piselli" class="recipe-title">Vellutata di Piselli e Menta</a>
    <img src="https://images.unsplash.com/photo-vellutata" />
  </li>
</ul>
`;
const liCardRecipes = extractAllRecipesFromHtml(mockLiCardsHtml, 'https://example.com/primavera');
assert.strictEqual(liCardRecipes.length, 2);
assert.strictEqual(liCardRecipes[0].title, 'Risotto Cremoso agli Asparagi');
assert.strictEqual(liCardRecipes[0].sourceUrl, 'https://example.com/ricette/risotto-asparagi');
assert.strictEqual(liCardRecipes[1].title, 'Vellutata di Piselli e Menta');
console.log('✓ <li> recipe cards list passed');

console.log('🎉 ALL 23 USER RECIPES SERVICE TESTS PASSED PERFECTLY!');

