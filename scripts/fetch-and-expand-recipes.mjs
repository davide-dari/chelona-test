import fs from 'fs';
import path from 'path';
import { getExactPhotoForDish } from './dish-photos.mjs';

const RECIPES_FILE = path.join(process.cwd(), 'public', 'ricette_mondo.json');
const ANDROID_ASSETS_FILE = path.join(process.cwd(), 'android', 'app', 'src', 'main', 'assets', 'public', 'ricette_mondo.json');

// Country mapping
const AREA_TO_COUNTRY = {
  Italian: { country: 'Italia', countryCode: 'IT', flag: '🇮🇹' },
  French: { country: 'Francia', countryCode: 'FR', flag: '🇫🇷' },
  Mexican: { country: 'Messico', countryCode: 'MX', flag: '🇲🇽' },
  Japanese: { country: 'Giappone', countryCode: 'JP', flag: '🇯🇵' },
  Indian: { country: 'India', countryCode: 'IN', flag: '🇮🇳' },
  Chinese: { country: 'Cina', countryCode: 'CN', flag: '🇨🇳' },
  Greek: { country: 'Grecia', countryCode: 'GR', flag: '🇬🇷' },
  Spanish: { country: 'Spagna', countryCode: 'ES', flag: '🇪🇸' },
  Thai: { country: 'Thailandia', countryCode: 'TH', flag: '🇹🇭' },
  American: { country: 'Stati Uniti', countryCode: 'US', flag: '🇺🇸' },
  British: { country: 'Regno Unito', countryCode: 'GB', flag: '🇬🇧' },
  Turkish: { country: 'Turchia', countryCode: 'TR', flag: '🇹🇷' },
  Moroccan: { country: 'Marocco', countryCode: 'MA', flag: '🇲🇦' },
  Vietnamese: { country: 'Vietnam', countryCode: 'VN', flag: '🇻🇳' },
  Canadian: { country: 'Canada', countryCode: 'CA', flag: '🇨🇦' },
  Jamaican: { country: 'Giamaica', countryCode: 'JM', flag: '🇯🇲' },
  Polish: { country: 'Polonia', countryCode: 'PL', flag: '🇵🇱' },
  Portuguese: { country: 'Portogallo', countryCode: 'PT', flag: '🇵🇹' },
  Russian: { country: 'Russia', countryCode: 'RU', flag: '🇷🇺' },
  Irish: { country: 'Irlanda', countryCode: 'IE', flag: '🇮🇪' },
  Dutch: { country: 'Paesi Bassi', countryCode: 'NL', flag: '🇳🇱' },
  Egyptian: { country: 'Egitto', countryCode: 'EG', flag: '🇪🇬' },
  Croatian: { country: 'Croazia', countryCode: 'HR', flag: '🇭🇷' },
  Filipino: { country: 'Filippine', countryCode: 'PH', flag: '🇵🇭' },
  Malaysian: { country: 'Malesia', countryCode: 'MY', flag: '🇲🇾' },
  Tunisian: { country: 'Tunisia', countryCode: 'TN', flag: '🇹🇳' },
};

// Common ingredients translation dictionary
const INGREDIENT_DICT = {
  'olive oil': "olio extravergine d'oliva",
  'vegetable oil': 'olio vegetale',
  'butter': 'burro',
  'garlic': 'aglio',
  'clove garlic': "spicchio d'aglio",
  'cloves garlic': "spicchi d'aglio",
  'onion': 'cipolla',
  'red onion': 'cipolla rossa',
  'salt': 'sale fino',
  'pepper': 'pepe nero',
  'black pepper': 'pepe nero macinato',
  'water': 'acqua',
  'sugar': 'zucchero',
  'brown sugar': 'zucchero di canna',
  'flour': 'farina 00',
  'all-purpose flour': 'farina 00',
  'plain flour': 'farina 00',
  'eggs': 'uova fresche',
  'egg': 'uovo fresco',
  'egg yolk': "tuorlo d'uovo",
  'egg whites': "albumi d'uovo",
  'milk': 'latte intero',
  'heavy cream': 'panna fresca',
  'sour cream': 'panna acida',
  'tomatoes': 'pomodori maturi',
  'tomato': 'pomodoro',
  'tomato puree': 'passata di pomodoro',
  'tomato paste': 'concentrato di pomodoro',
  'chopped tomatoes': 'polpa di pomodoro a cubetti',
  'chicken breast': 'petto di pollo',
  'chicken': 'pollo a pezzi',
  'chicken thighs': 'cosce di pollo',
  'beef': 'carne di manzo',
  'ground beef': 'macinato di manzo',
  'pork': 'carne di maiale',
  'bacon': 'pancetta o bacon croccante',
  'lemon juice': 'succo di limone fresco',
  'lemon': 'limone non trattato',
  'lime juice': 'succo di lime',
  'lime': 'lime fresco',
  'soy sauce': 'salsa di soia',
  'rice': 'riso basmati o jasmine',
  'basmati rice': 'riso basmati',
  'potatoes': 'patate',
  'potato': 'patata',
  'carrots': 'carote',
  'carrot': 'carota',
  'celery': 'costa di sedano',
  'ginger': 'zenzero fresco grattugiato',
  'cilantro': 'coriandolo fresco tritato',
  'coriander': 'coriandolo',
  'parsley': 'prezzemolo fresco tritato',
  'basil': 'foglie di basilico fresco',
  'oregano': 'origano essiccato',
  'thyme': 'timo fresco',
  'rosemary': 'rosmarino fresco',
  'cumin': 'cumino in polvere',
  'paprika': 'paprika dolce',
  'chilli': 'peperoncino',
  'chili flakes': 'fiocchi di peperoncino',
  'cinnamon': 'cannella in polvere',
  'mushrooms': 'funghi champignon',
  'parmesan': 'parmigiano reggiano grattugiato',
  'cheddar cheese': 'formaggio cheddar a scaglie',
  'mozzarella': 'mozzarella fresca',
  'cucumber': 'cetriolo',
  'honey': 'miele millefiori',
  'mustard': 'senape di Digione',
  'mayonnaise': 'maionese',
  'bread': 'pane tostato',
  'breadcrumbs': 'pangrattato',
  'yeast': 'lievito di birra',
  'baking powder': 'lievito per dolci',
  'vanilla': 'estratto di vaniglia naturale',
  'dark chocolate': 'cioccolato fondente al 70%',
};

function translateIngredient(name, measure) {
  const cleanName = (name || '').toLowerCase().trim();
  const cleanMeasure = (measure || '').trim();
  let translatedName = cleanName;
  for (const [en, it] of Object.entries(INGREDIENT_DICT)) {
    if (cleanName.includes(en)) {
      translatedName = it;
      break;
    }
  }
  if (!cleanMeasure) return translatedName.charAt(0).toUpperCase() + translatedName.slice(1);
  return `${cleanMeasure} ${translatedName}`.trim();
}

function mapMealDbCategory(cat) {
  switch (cat) {
    case 'Dessert': return 'Dolci';
    case 'Breakfast': return 'Colazione';
    case 'Pasta': return 'Primi';
    case 'Starter':
    case 'Side': return 'Antipasti';
    case 'Beef':
    case 'Chicken':
    case 'Lamb':
    case 'Pork':
    case 'Seafood':
    case 'Goat': return 'Cucine dal Mondo';
    case 'Vegetarian': return 'Cucine dal Mondo';
    default: return 'Cucine dal Mondo';
  }
}

async function main() {
  console.log('📖 Loading current public/ricette_mondo.json...');
  const currentRecipes = JSON.parse(fs.readFileSync(RECIPES_FILE, 'utf8'));
  console.log(`Current recipes: ${currentRecipes.length}`);

  // 1. Audit and fix miscategorized recipes in current database
  for (const r of currentRecipes) {
    const t = r.title.toLowerCase();

    // Reclassify sauces/sughi/ragù to Primi
    if (/rag[uù]|sugo con|sugo di salsiccia|sugo di pomodoro|pesto alla|pesto di/i.test(t)) {
      if (r.category === 'Colazione') {
        r.category = 'Primi';
        r.categoria = 'Primi';
      }
    }

    // Reclassify bakery/pizza/focaccia to Antipasti
    if (/pasta per la pizza|pasta per il pane|focaccia|danubio salato|panini al latte|parigina|panzerotti|bretzel|pinsa|pizza margherita|pizza in teglia|casatiello|grissini|panini cinesi|burger buns|pane di semola|bagel|pane in cassetta|crescione|tortano/i.test(t)) {
      if (r.category === 'Colazione') {
        r.category = 'Antipasti';
        r.categoria = 'Antipasti';
      }
    }

    // Reclassify desserts to Dolci
    if (/baba['’]?\s*al\s*rum|danubio dolce|bomboloni|torta angelica|brioche col tuppo|torta delle rose|panettone|krapfen|donuts|treccia di pasta lievitata|graffe/i.test(t)) {
      if (r.category === 'Colazione') {
        r.category = 'Dolci';
        r.categoria = 'Dolci';
      }
    }

    // Reclassify savory dips to Antipasti
    if (/besciamella|tzatziki|maionese|crema al parmigiano|salsa verde|finta maionese|chupitos di melone/i.test(t)) {
      if (r.category === 'Colazione' || r.category === 'Dolci') {
        r.category = 'Antipasti';
        r.categoria = 'Antipasti';
      }
    }

    // Reclassify Giardiniera to Antipasti
    if (/giardiniera/i.test(t)) {
      r.category = 'Antipasti';
      r.categoria = 'Antipasti';
    }

    // Re-assign exact photo matching to ensure zero mismatch
    r.image = getExactPhotoForDish(r.title, r.category);
  }

  // 2. Fetch authentic international public domain recipes from TheMealDB
  console.log('🌍 Fetching authentic public domain world recipes from TheMealDB...');
  const mealCategories = ['Beef', 'Chicken', 'Dessert', 'Pasta', 'Seafood', 'Vegetarian', 'Breakfast', 'Side', 'Starter', 'Pork', 'Lamb'];
  const existingTitles = new Set(currentRecipes.map(r => r.title.toLowerCase().trim()));
  const newRecipes = [];

  for (const cat of mealCategories) {
    try {
      const res = await fetch(`https://www.themealdb.com/api/json/v1/1/filter.php?c=${cat}`);
      const data = await res.json();
      if (!data.meals) continue;

      // Take up to 12 dishes per category
      const candidates = data.meals.slice(0, 12);
      for (const item of candidates) {
        // Fetch full recipe details
        const detRes = await fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${item.idMeal}`);
        const detData = await detRes.json();
        if (!detData.meals || !detData.meals[0]) continue;
        const m = detData.meals[0];

        const mealTitle = m.strMeal.trim();
        if (existingTitles.has(mealTitle.toLowerCase())) continue;

        // Parse ingredients
        const ings = [];
        for (let i = 1; i <= 20; i++) {
          const ing = m[`strIngredient${i}`];
          const meas = m[`strMeasure${i}`];
          if (ing && ing.trim()) {
            ings.push(translateIngredient(ing, meas));
          }
        }
        if (ings.length < 3) continue;

        // Clean instructions into step paragraphs
        const rawSteps = (m.strInstructions || '')
          .split(/\r?\n+/)
          .map(s => s.trim())
          .filter(s => s.length > 20 && !s.toLowerCase().startsWith('step'));
        const steps = rawSteps.length > 0 ? rawSteps : [(m.strInstructions || '').trim()];

        const areaInfo = AREA_TO_COUNTRY[m.strArea] || { country: 'Mondo', countryCode: 'UN', flag: '🌍' };
        const chelonaCategory = mapMealDbCategory(m.strCategory);

        // Nutrition estimation based on category
        let calories = 480;
        let protein = 28;
        let carbs = 42;
        let fat = 18;
        if (chelonaCategory === 'Dolci') {
          calories = 390; protein = 6; carbs = 58; fat = 16;
        } else if (chelonaCategory === 'Primi') {
          calories = 520; protein = 18; carbs = 75; fat = 14;
        } else if (chelonaCategory === 'Colazione') {
          calories = 360; protein = 12; carbs = 50; fat = 10;
        }

        const recipeRecord = {
          id: `world_mealdb_${m.idMeal}`,
          title: mealTitle,
          nome: mealTitle,
          category: chelonaCategory,
          categoria: chelonaCategory,
          country: areaInfo.country,
          countryCode: areaInfo.countryCode,
          flag: areaInfo.flag,
          image: m.strMealThumb, // Exact authentic dish photo directly from TheMealDB
          calories,
          protein,
          carbs,
          fat,
          tags: [areaInfo.country, chelonaCategory, 'Cucina Internazionale', 'Tradizione', 'TheMealDB'],
          ingredients: ings,
          ingredienti: ings,
          steps: steps,
          procedimento: steps.join('\n')
        };

        newRecipes.push(recipeRecord);
        existingTitles.add(mealTitle.toLowerCase());
      }
    } catch (e) {
      console.warn(`Error fetching category ${cat}:`, e.message);
    }
  }

  console.log(`✅ Successfully extracted ${newRecipes.length} authentic international dishes with exact dish photos!`);
  const combinedRecipes = [...currentRecipes, ...newRecipes];
  console.log(`Total recipe dataset expanded from ${currentRecipes.length} to ${combinedRecipes.length} recipes!`);

  // Write to public/ricette_mondo.json
  fs.writeFileSync(RECIPES_FILE, JSON.stringify(combinedRecipes, null, 2), 'utf8');
  console.log(`✅ Updated ${RECIPES_FILE}`);

  // Write to android assets
  if (fs.existsSync(path.dirname(ANDROID_ASSETS_FILE))) {
    fs.writeFileSync(ANDROID_ASSETS_FILE, JSON.stringify(combinedRecipes, null, 2), 'utf8');
    console.log(`✅ Synchronized ${ANDROID_ASSETS_FILE}`);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
