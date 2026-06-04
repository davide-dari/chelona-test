const fs = require('fs');

const LETTERS = 'abcdefghijklmnopqrstuvwxyz'.split('');
const API_URL = 'https://www.themealdb.com/api/json/v1/1/search.php?f=';

const translateTexts = async (texts) => {
  if (!texts || texts.length === 0) return [];
  const safeTexts = texts.map(t => (t || '').replace(/\n/g, ' ~NL~ ').replace(/\r/g, ''));
  const joinedText = safeTexts.join('\n');
  try {
    const res = await fetch('https://translate.googleapis.com/translate_a/single?client=gtx&dt=t&sl=en&tl=it', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'q=' + encodeURIComponent(joinedText)
    });
    const data = await res.json();
    const fullTranslated = data[0].map(item => item[0]).join('');
    
    const tArray = fullTranslated.split('\n').map(s => {
      return s.replace(/~ NL ~/gi, '\n')
              .replace(/~NL~/gi, '\n')
              .replace(/~ Nl ~/gi, '\n')
              .replace(/~ nl ~/gi, '\n')
              .replace(/~nl~/gi, '\n')
              .trim();
    });
    
    return texts.map((_, i) => tArray[i] || texts[i]);
  } catch (err) {
    console.error('Translation error', err);
    return texts;
  }
};

async function fetchAllMeals() {
  const allMeals = [];
  console.log("Fetching meals...");
  for (const letter of LETTERS) {
    try {
      const res = await fetch(API_URL + letter);
      const data = await res.json();
      if (data.meals) {
        allMeals.push(...data.meals);
      }
    } catch (e) {
      console.error(`Error fetching letter ${letter}`);
    }
  }
  
  // Deduplicate just in case
  const uniqueMeals = [];
  const ids = new Set();
  for (const meal of allMeals) {
    if (!ids.has(meal.idMeal)) {
      ids.add(meal.idMeal);
      uniqueMeals.push(meal);
    }
  }
  return uniqueMeals;
}

function formatRecipe(meal) {
  const ingredienti = [];
  for (let i = 1; i <= 20; i++) {
    const ingredient = meal[`strIngredient${i}`];
    const measure = meal[`strMeasure${i}`];
    if (ingredient && ingredient.trim() !== "") {
      ingredienti.push(`${measure ? measure.trim() : ''} ${ingredient.trim()}`.trim());
    }
  }

  return {
    id: meal.idMeal,
    nomeOriginale: meal.strMeal,
    procedimentoOriginale: meal.strInstructions,
    categoriaOriginale: meal.strCategory,
    provenienzaOriginale: meal.strArea,
    ingredientiOriginale: ingredienti,
    image: meal.strMealThumb
  };
}

async function main() {
  const meals = await fetchAllMeals();
  console.log(`Found ${meals.length} unique meals. Formatting...`);
  
  const formattedMeals = meals.map(formatRecipe);
  
  // We will translate in batches to avoid huge requests
  const BATCH_SIZE = 10;
  const translatedMeals = [];
  
  console.log("Translating to Italian...");
  
  for (let i = 0; i < formattedMeals.length; i += BATCH_SIZE) {
    console.log(`Translating batch ${i} to ${i + BATCH_SIZE}...`);
    const batch = formattedMeals.slice(i, i + BATCH_SIZE);
    
    // For each meal we need to translate: nome, categoria, provenienza, procedimento, and ALL ingredienti.
    // To minimize requests, we pack everything into one array per meal, then flatten.
    const textsToTranslate = [];
    batch.forEach(m => {
      textsToTranslate.push(m.nomeOriginale);
      textsToTranslate.push(m.categoriaOriginale);
      textsToTranslate.push(m.provenienzaOriginale);
      textsToTranslate.push(m.procedimentoOriginale);
      textsToTranslate.push(...m.ingredientiOriginale);
    });
    
    const translatedTexts = await translateTexts(textsToTranslate);
    
    let textIndex = 0;
    for (const m of batch) {
      const nome = translatedTexts[textIndex++];
      const categoria = translatedTexts[textIndex++];
      const provenienza = translatedTexts[textIndex++];
      const procedimento = translatedTexts[textIndex++];
      
      const ingredienti = [];
      for (let j = 0; j < m.ingredientiOriginale.length; j++) {
        ingredienti.push(translatedTexts[textIndex++]);
      }
      
      translatedMeals.push({
        nome,
        categoria,
        provenienza,
        procedimento,
        ingredienti,
        image: m.image
      });
    }
  }
  
  fs.writeFileSync('public/ricette_mondo.json', JSON.stringify(translatedMeals, null, 2));
  console.log(`Successfully written ${translatedMeals.length} translated recipes!`);
}

main();
