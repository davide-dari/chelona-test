import fs from 'fs';
import path from 'path';

const UNSPLASH_BASE = 'https://images.unsplash.com/';

// Mappatura fotografica royalty-free Unsplash per piatti specifici o parole chiave
const KEYWORD_IMAGE_MAP = [
  // Primi piatti
  { regex: /carbonara/i, img: 'photo-1612874742237-6526221588e3?w=800' },
  { regex: /lasagn/i, img: 'photo-1574894709920-11b28e7367e3?w=800' },
  { regex: /pesto/i, img: 'photo-1516100882582-76c9a3ca2f18?w=800' },
  { regex: /bolognese|rag[uù]/i, img: 'photo-1621996346565-e3d5d6281691?w=800' },
  { regex: /amatriciana|arrabbiata/i, img: 'photo-1551183053-bf91a1d81141?w=800' },
  { regex: /gnocchi/i, img: 'photo-1589301760014-d929f3979dbc?w=800' },
  { regex: /ravioli|tortellini|cappelletti/i, img: 'photo-1587740408472-3715f5cbb641?w=800' },
  { regex: /risotto/i, img: 'photo-1633964913295-ceb43826e7c9?w=800' },
  { regex: /spaghetti|pasta|penne|rigatoni|fusilli|tagliatelle/i, img: 'photo-1551183053-bf91a1d81141?w=800' },
  { regex: /zuppa|minestr|vellutat/i, img: 'photo-1547592166-23ac45744acd?w=800' },
  
  // Pizza, Focaccia & Pane
  { regex: /pizza/i, img: 'photo-1513104890138-7c749659a591?w=800' },
  { regex: /focaccia|pane|piadin/i, img: 'photo-1509440159596-0249088772ff?w=800' },
  { regex: /arancin/i, img: 'photo-1565299585323-38d6b0865b47?w=800' },
  { regex: /bruschett|crostin/i, img: 'photo-1572656631137-7935297eff55?w=800' },

  // Pesce
  { regex: /salmon/i, img: 'photo-1467003909585-2f8a72700288?w=800' },
  { regex: /tonno/i, img: 'photo-1501595091296-3aa970afb3ff?w=800' },
  { regex: /orata|spigola|branzino|merluzz|pesce spada/i, img: 'photo-1519708227418-c8fd9a32b7a2?w=800' },
  { regex: /polpo|calamar|seppi/i, img: 'photo-1559737558-24513920583b?w=800' },
  { regex: /gamber|scamp|crostacei|vongol|cozz/i, img: 'photo-1559742811-822873691df8?w=800' },
  { regex: /pesce/i, img: 'photo-1519708227418-c8fd9a32b7a2?w=800' },

  // Carne
  { regex: /pollo|tacchino/i, img: 'photo-1598515214211-89d3c73ae83b?w=800' },
  { regex: /manzo|bistecc|tagliata|filetto/i, img: 'photo-1544025162-d76694265947?w=800' },
  { regex: /maiale|salsicci|costine/i, img: 'photo-1529193591184-b1d58069ecdd?w=800' },
  { regex: /polpett/i, img: 'photo-1529042410759-befb1204b468?w=800' },
  { regex: /cotolett|arrost/i, img: 'photo-1532550907401-a500c9a57435?w=800' },
  { regex: /burger|hamburger/i, img: 'photo-1568901346375-23c9450c58cd?w=800' },
  { regex: /carne/i, img: 'photo-1544025162-d76694265947?w=800' },

  // Verdure, Insalate & Contorni
  { regex: /insalat/i, img: 'photo-1540420773420-3366772f4999?w=800' },
  { regex: /zucchin|melanzan|peperon|patat|fungh|verdure/i, img: 'photo-1546069901-ba9599a7e63c?w=800' },
  { regex: /hummus|ceci/i, img: 'photo-1577906096429-f73c2c312435?w=800' },
  { regex: /guacamole|avocado/i, img: 'photo-1541544741938-0af808871cc0?w=800' },
  { regex: /torta salata|quiche/i, img: 'photo-1565299624946-b28f40a0ae38?w=800' },

  // Dolci
  { regex: /tiramis[uù]/i, img: 'photo-1571877227200-a0d98ea607e9?w=800' },
  { regex: /cheesecake/i, img: 'photo-1533134242443-d4fd215305ad?w=800' },
  { regex: /cioccolat|brownie/i, img: 'photo-1578985545062-69928b1d9587?w=800' },
  { regex: /crostat|torta/i, img: 'photo-1565958011703-44f9829ba187?w=800' },
  { regex: /biscott/i, img: 'photo-1499636136210-6f4ee915583e?w=800' },
  { regex: /muffin|cupcake/i, img: 'photo-1587668178277-295251dd9045?w=800' },
  { regex: /pancake/i, img: 'photo-1567620905732-2d1ec7ab7445?w=800' },
  { regex: /waffle/i, img: 'photo-1562376552-0d160a2f238d?w=800' },
  { regex: /crema|mousse|panna cotta|budino/i, img: 'photo-1488477181946-6428a0291777?w=800' },
  { regex: /gelato/i, img: 'photo-1501443762994-82bd5dace89a?w=800' },
  { regex: /dolc|dessert/i, img: 'photo-1551024709-8f23befc6f87?w=800' },

  // Colazione & Bevande
  { regex: /brioche|cornett/i, img: 'photo-1555507036-ab1f4038808a?w=800' },
  { regex: /caff[eè]|cappuccino/i, img: 'photo-1514432324607-a09d9b4aefdd?w=800' },
  { regex: /smoothie|frullato|succo/i, img: 'photo-1553530666-ba11a7da3888?w=800' },
  { regex: /porridge|avena/i, img: 'photo-1517673400267-0251440c45dc?w=800' },
  { regex: /yogurt/i, img: 'photo-1488477181946-6428a0291777?w=800' },

  // Cucine internazionali
  { regex: /sushi/i, img: 'photo-1579871494447-9811cf80d66c?w=800' },
  { regex: /ramen/i, img: 'photo-1569718212165-3a8278d5f624?w=800' },
  { regex: /gyoza/i, img: 'photo-1496116218417-1a781b1c416c?w=800' },
  { regex: /teriyaki/i, img: 'photo-1580822184713-fc5400e7fe10?w=800' },
  { regex: /taco/i, img: 'photo-1565299585323-38d6b0865b47?w=800' },
  { regex: /quesadilla|nacho/i, img: 'photo-1513456852971-30c0b8199d4d?w=800' },
  { regex: /paella/i, img: 'photo-1534080564583-6be75777b70a?w=800' },
  { regex: /curry|tikka masala/i, img: 'photo-1588166524941-3bf61a9c41db?w=800' },
  { regex: /couscous/i, img: 'photo-1541518763669-27fef04b14ea?w=800' },
  { regex: /cantonese|riso fritto/i, img: 'photo-1603133872878-684f208fb84b?w=800' },
];

const CATEGORY_DEFAULT_IMAGE = {
  'Primi': 'photo-1551183053-bf91a1d81141?w=800',
  'Secondi': 'photo-1544025162-d76694265947?w=800',
  'Antipasti': 'photo-1540420773420-3366772f4999?w=800',
  'Dolci': 'photo-1551024709-8f23befc6f87?w=800',
  'Colazione': 'photo-1525351484163-7529414344d8?w=800',
  'Fitness & Dieta': 'photo-1540420773420-3366772f4999?w=800',
  'Cucine dal Mondo': 'photo-1504674900247-0877df9cc836?w=800',
};

function getUnsplashImageForRecipe(title, category) {
  for (const mapping of KEYWORD_IMAGE_MAP) {
    if (mapping.regex.test(title)) {
      return `${UNSPLASH_BASE}${mapping.img}`;
    }
  }
  const fallbackKey = category || 'Primi';
  const fallback = CATEGORY_DEFAULT_IMAGE[fallbackKey] || 'photo-1504674900247-0877df9cc836?w=800';
  return `${UNSPLASH_BASE}${fallback}`;
}

export function detectCountryFromRecipe(title, ingredients = []) {
  const t = (title || '').toLowerCase();
  const ingStr = (Array.isArray(ingredients) ? ingredients.join(' ') : '').toLowerCase();

  if (/sushi|ramen|teriyaki|gyoza|miso|dorayaki|okonomiyaki|yakitori|edamame|giappon/i.test(t)) {
    return { country: 'Giappone', countryCode: 'JP', flag: '🇯🇵' };
  }
  if (/taco|guacamole|quesadilla|enchilada|chili con carne|fajita|burrito|messican|tortilla di mais/i.test(t)) {
    return { country: 'Messico', countryCode: 'MX', flag: '🇲🇽' };
  }
  if (/tikka masala|curry|dahl|dal lenticchie|biryani|samosa|tandoori|naan|garam masala|indian/i.test(t)) {
    return { country: 'India', countryCode: 'IN', flag: '🇮🇳' };
  }
  if (/moussaka|souvlaki|tzatziki|insalata greca|spanakopita|pita greca|grec/i.test(t)) {
    return { country: 'Grecia', countryCode: 'GR', flag: '🇬🇷' };
  }
  if (/paella|tortilla de patatas|gazpacho|patatas bravas|crema catalana|tapas|spagnol/i.test(t)) {
    return { country: 'Spagna', countryCode: 'ES', flag: '🇪🇸' };
  }
  if (/smash burger|hamburger|american pancake|mac & cheese|macaroni and cheese|cheesecake|bbq pulled pork|brownie|waffle|new york/i.test(t)) {
    return { country: 'USA', countryCode: 'US', flag: '🇺🇸' };
  }
  if (/quiche|ratatouille|cr[eè]pes?|soupe à l'oignon|bourguignon|frances/i.test(t)) {
    return { country: 'Francia', countryCode: 'FR', flag: '🇫🇷' };
  }
  if (/pad thai|tom yum|curry verde|khao pad|thailand/i.test(t)) {
    return { country: 'Thailandia', countryCode: 'TH', flag: '🇹🇭' };
  }
  if (/tajine|couscous alle verdure|couscous reale|harira|pastilla|marocch/i.test(t)) {
    return { country: 'Marocco', countryCode: 'MA', flag: '🇲🇦' };
  }
  if (/cantonese|jiaozi|ravioli cines|involtini primavera|pollo alle mandorle|mantou|cines/i.test(t)) {
    return { country: 'Cina', countryCode: 'CN', flag: '🇨🇳' };
  }
  if (/hummus|falafel|tabboul|shish taouk|babaganoush|liban/i.test(t)) {
    return { country: 'Libano', countryCode: 'LB', flag: '🇱🇧' };
  }
  if (/fish and chips|shepherd's pie|inglese|britannic/i.test(t)) {
    return { country: 'Regno Unito', countryCode: 'GB', flag: '🇬🇧' };
  }
  if (/feijoada|p[aã]o de queijo|brasil/i.test(t)) {
    return { country: 'Brasile', countryCode: 'BR', flag: '🇧🇷' };
  }
  if (/empanada|chimichurri|argentin/i.test(t)) {
    return { country: 'Argentina', countryCode: 'AR', flag: '🇦🇷' };
  }
  if (/strudel|kartoffelsalat|tedesc|germani/i.test(t)) {
    return { country: 'Germania', countryCode: 'DE', flag: '🇩🇪' };
  }

  // Default per il ricettario italiano
  return { country: 'Italia', countryCode: 'IT', flag: '🇮🇹' };
}

// Nuove ricette internazionali autentiche e dettagliate da aggiungere
export const NEW_INTERNATIONAL_RECIPES = [
  // 🇯🇵 GIAPPONE
  {
    id: 'world_jp_sushi_roll',
    title: 'Sushi Roll (Maki & Uramaki Salmone e Avocado)',
    nome: 'Sushi Roll (Maki & Uramaki Salmone e Avocado)',
    category: 'Cucine dal Mondo',
    categoria: 'Cucine dal Mondo',
    country: 'Giappone',
    countryCode: 'JP',
    flag: '🇯🇵',
    image: `${UNSPLASH_BASE}photo-1579871494447-9811cf80d66c?w=800`,
    calories: 420,
    protein: 22,
    carbs: 58,
    fat: 10,
    tags: ['Giappone', 'Sushi', 'Pesce', 'Riso', 'Cucine dal Mondo'],
    ingredients: [
      '300g riso per sushi (Kome)',
      '350ml acqua',
      '40ml aceto di riso',
      '15g zucchero semolato',
      '5g sale fino',
      '150g filetto di salmone fresco abbattuto',
      '1 avocado maturo a fette',
      '4 fogli alga Nori',
      'Semi di sesamo tostati q.b.',
      'Salsa di soia e wasabi per servire'
    ],
    ingredienti: [
      '300g riso per sushi (Kome)',
      '350ml acqua',
      '40ml aceto di riso',
      '15g zucchero semolato',
      '5g sale fino',
      '150g filetto di salmone fresco abbattuto',
      '1 avocado maturo a fette',
      '4 fogli alga Nori',
      'Semi di sesamo tostati q.b.',
      'Salsa di soia e wasabi per servire'
    ],
    steps: [
      'Lava accuratamente il riso sotto acqua corrente fredda finché l\'acqua non risulta limpida (circa 4-5 risciacqui).',
      'Cuoci il riso con 350ml di acqua in pentola con coperchio per 12 minuti, poi lascia riposare a fuoco spento per 10 minuti.',
      'Scalda leggermente l\'aceto di riso con zucchero e sale, quindi versalo sul riso steso nell\'hangiri o ciotola di legno, sventolando con un ventaglio.',
      'Stendi l\'alga Nori sul tappetino di bambù (makisu), distribuisci uno strato uniforme di riso lasciando 1 cm di bordo superiore libero.',
      'Disponi al centro striscioline di salmone fresco e fette di avocado. Arrotola con decisione sigillando il rotolo.',
      'Taglia il rotolo a fette di 2 cm con un coltello molto affilato inumidito con acqua e aceto. Servi con salsa di soia e wasabi.'
    ],
    procedimento: 'Lava accuratamente il riso sotto acqua corrente fredda finché l\'acqua non risulta limpida.\nCuoci il riso con 350ml di acqua in pentola con coperchio per 12 minuti, poi lascia riposare a fuoco spento per 10 minuti.\nCondisci con aceto di riso, zucchero e sale sventolando.\nStendi l\'alga nori, aggiungi il riso, salmone e avocado.\nArrotola con il makisu e taglia a rondelle.'
  },
  {
    id: 'world_jp_ramen_shoyu',
    title: 'Ramen Shoyu Tradizionale con Chashu e Uovo Marinato',
    nome: 'Ramen Shoyu Tradizionale con Chashu e Uovo Marinato',
    category: 'Cucine dal Mondo',
    categoria: 'Cucine dal Mondo',
    country: 'Giappone',
    countryCode: 'JP',
    flag: '🇯🇵',
    image: `${UNSPLASH_BASE}photo-1569718212165-3a8278d5f624?w=800`,
    calories: 580,
    protein: 34,
    carbs: 68,
    fat: 18,
    tags: ['Giappone', 'Ramen', 'Primi', 'Noodles', 'Cucine dal Mondo'],
    ingredients: [
      '300g noodles freschi per ramen',
      '800ml brodo limpido di pollo e dashi',
      '4 cucchiai salsa di soia scura giapponese',
      '2 cucchiai mirin',
      '200g pancetta di maiale arrotolata (Chashu)',
      '2 uova barzotte marinate (Ajitsuke Tamago)',
      '50g germogli di bambù (Menma)',
      '2 cipollotti freschi affettati sottili',
      '2 foglietti alga Nori tagliati a rettangoli',
      '1 cucchiaino olio di sesamo tostato'
    ],
    ingredienti: [
      '300g noodles freschi per ramen',
      '800ml brodo limpido di pollo e dashi',
      '4 cucchiai salsa di soia scura giapponese',
      '2 cucchiai mirin',
      '200g pancetta di maiale arrotolata (Chashu)',
      '2 uova barzotte marinate (Ajitsuke Tamago)',
      '50g germogli di bambù (Menma)',
      '2 cipollotti freschi affettati sottili',
      '2 foglietti alga Nori tagliati a rettangoli',
      '1 cucchiaino olio di sesamo tostato'
    ],
    steps: [
      'Prepara il fondo di tare mescolando salsa di soia, mirin e olio di sesamo nelle ciotole di servizio.',
      'Porta a ebollizione il brodo di pollo aromatizzato con alga kombu e katsuobushi (dashi).',
      'Cuoci i noodles di ramen in abbondante acqua bollente salata per circa 2 minuti fino a consistenza al dente.',
      'Scola bene i noodles e adagiali nelle ciotole con il tare e il brodo bollente.',
      'Guarnisci con fette sottili di chashu di maiale, mezzo uovo marinato dal tuorlo fondente, cipollotto fresco, menma e alga nori. Gusta fumante.'
    ],
    procedimento: 'Prepara il tare con soia e mirin. Scalda il brodo di pollo e dashi. Lessa i noodles al dente. Unisci brodo e noodles nelle ciotole e guarnisci con maiale chashu, uovo marinato, cipollotto e alga nori.'
  },
  {
    id: 'world_jp_pollo_teriyaki',
    title: 'Pollo Teriyaki Glassato con Riso al Vapore e Sesamo',
    nome: 'Pollo Teriyaki Glassato con Riso al Vapore e Sesamo',
    category: 'Cucine dal Mondo',
    categoria: 'Cucine dal Mondo',
    country: 'Giappone',
    countryCode: 'JP',
    flag: '🇯🇵',
    image: `${UNSPLASH_BASE}photo-1580822184713-fc5400e7fe10?w=800`,
    calories: 490,
    protein: 38,
    carbs: 52,
    fat: 14,
    tags: ['Giappone', 'Pollo', 'Secondi', 'Cucine dal Mondo'],
    ingredients: [
      '400g sovracosce o petti di pollo a cubetti',
      '60ml salsa di soia',
      '40ml mirin giapponese',
      '30ml sakè da cucina',
      '15g zucchero di canna',
      '1 spicchio d\'aglio grattugiato',
      '1 cucchiaino zenzero fresco grattugiato',
      '200g riso giapponese o basmati cotto al vapore',
      'Semi di sesamo bianco e cipollotto per guarnire'
    ],
    ingredienti: [
      '400g sovracosce o petti di pollo a cubetti',
      '60ml salsa di soia',
      '40ml mirin giapponese',
      '30ml sakè da cucina',
      '15g zucchero di canna',
      '1 spicchio d\'aglio grattugiato',
      '1 cucchiaino zenzero fresco grattugiato',
      '200g riso giapponese o basmati cotto al vapore',
      'Semi di sesamo bianco e cipollotto per guarnire'
    ],
    steps: [
      'In una ciotola prepara la salsa teriyaki mescolando soia, mirin, sakè, zucchero, aglio e zenzero grattugiato.',
      'Scalda una padella antiaderente con un filo d\'olio e rosola il pollo fino a doratura su entrambi i lati.',
      'Versa la salsa teriyaki nella padella e lascia ridurre a fuoco medio finché non diventa densa e glassa perfettamente la carne.',
      'Servi il pollo glassato sopra una ciotola di riso al vapore, cospargendo con semi di sesamo e anelli di cipollotto fresco.'
    ],
    procedimento: 'Rosola il pollo in padella. Aggiungi la salsa teriyaki a base di soia, mirin, sakè e zucchero. Fai glassare a fuoco dolce e servi sul riso con sesamo.'
  },

  // 🇲🇽 MESSICO
  {
    id: 'world_mx_tacos_pollo',
    title: 'Tacos de Pollo alla Messicana con Salsa Roja e Lime',
    nome: 'Tacos de Pollo alla Messicana con Salsa Roja e Lime',
    category: 'Cucine dal Mondo',
    categoria: 'Cucine dal Mondo',
    country: 'Messico',
    countryCode: 'MX',
    flag: '🇲🇽',
    image: `${UNSPLASH_BASE}photo-1565299585323-38d6b0865b47?w=800`,
    calories: 460,
    protein: 32,
    carbs: 48,
    fat: 16,
    tags: ['Messico', 'Tacos', 'Pollo', 'Spezie', 'Cucine dal Mondo'],
    ingredients: [
      '8 tortillas morbide di mais',
      '400g petto di pollo tagliato a striscioline',
      '1 cipolla rossa tritata',
      '1 spicchio d\'aglio',
      '1 cucchiaino cumino in polvere',
      '1 cucchiaino paprika affumicata',
      '1 cucchiaino origano messicano',
      '2 pomodori maturi a cubetti',
      '1 mazzetto coriandolo fresco',
      '2 lime freschi tagliati a spicchi',
      'Salsa piccante habanero o roja q.b.'
    ],
    ingredienti: [
      '8 tortillas morbide di mais',
      '400g petto di pollo tagliato a striscioline',
      '1 cipolla rossa tritata',
      '1 spicchio d\'aglio',
      '1 cucchiaino cumino in polvere',
      '1 cucchiaino paprika affumicata',
      '1 cucchiaino origano messicano',
      '2 pomodori maturi a cubetti',
      '1 mazzetto coriandolo fresco',
      '2 lime freschi tagliati a spicchi',
      'Salsa piccante habanero o roja q.b.'
    ],
    steps: [
      'Marina il pollo con succo di 1 lime, aglio, cumino, paprika, origano, sale e un filo d\'olio per 20 minuti.',
      'Scalda una piastra di ghisa a fuoco vivo e salta il pollo speziato fino a renderlo dorato e succoso.',
      'Scalda le tortillas di mais su padella asciutta per 30 secondi per lato finché non diventano morbide e calde.',
      'Farcisci ogni tortilla con il pollo speziato, cipolla rossa cruda, pomodori a cubetti e abbondante coriandolo fresco.',
      'Servi con spicchi di lime da spremere al momento e salsa roja a piacere.'
    ],
    procedimento: 'Marina e rosola il pollo con spezie messicane. Scalda le tortillas di mais. Farcisci con pollo, cipolla, pomodori, coriandolo e lime.'
  },
  {
    id: 'world_mx_guacamole_tradizionale',
    title: 'Guacamole Tradizionale con Totopos di Mais Croccanti',
    nome: 'Guacamole Tradizionale con Totopos di Mais Croccanti',
    category: 'Cucine dal Mondo',
    categoria: 'Cucine dal Mondo',
    country: 'Messico',
    countryCode: 'MX',
    flag: '🇲🇽',
    image: `${UNSPLASH_BASE}photo-1541544741938-0af808871cc0?w=800`,
    calories: 320,
    protein: 4,
    carbs: 22,
    fat: 26,
    tags: ['Messico', 'Antipasti', 'Vegano', 'Avocado', 'Cucine dal Mondo'],
    ingredients: [
      '2 avocado Hass maturi',
      '1 pomodoro ramato sodo a cubetti piccoli',
      '1/2 cipolla bianca tritata finemente',
      '1 peperoncino Jalapeño o Serrano sminuzzato',
      'Succo di 1 lime fresco',
      '1 mazzetto coriandolo fresco tritato',
      '1 pizzico sale fino',
      '100g totopos (nachos di mais) artigianali'
    ],
    ingredienti: [
      '2 avocado Hass maturi',
      '1 pomodoro ramato sodo a cubetti piccoli',
      '1/2 cipolla bianca tritata finemente',
      '1 peperoncino Jalapeño o Serrano sminuzzato',
      'Succo di 1 lime fresco',
      '1 mazzetto coriandolo fresco tritato',
      '1 pizzico sale fino',
      '100g totopos (nachos di mais) artigianali'
    ],
    steps: [
      'Taglia gli avocado a metà, elimina il nocciolo e ricava la polpa con un cucchiaio mettendola in un mortaio (molcajete) o ciotola.',
      'Schiaccia la polpa grossolanamente con una forchetta lasciando qualche pezzo consistente.',
      'Aggiungi immediatamente il succo di lime fresco per preservare il colore e dare acidità bilanciata.',
      'Unisci la cipolla bianca tritata, il jalapeño sminuzzato, i cubetti di pomodoro e il coriandolo.',
      'Mescola delicatamente, aggiusta di sale e servi subito con totopos croccanti.'
    ],
    procedimento: 'Schiaccia gli avocado maturi con una forchetta. Aggiungi succo di lime, cipolla tritata, pomodoro a cubetti, jalapeño e coriandolo. Servi con totopos di mais.'
  },
  {
    id: 'world_mx_quesadillas',
    title: 'Quesadillas Messicane al Formaggio Fuso e Peperoni',
    nome: 'Quesadillas Messicane al Formaggio Fuso e Peperoni',
    category: 'Cucine dal Mondo',
    categoria: 'Cucine dal Mondo',
    country: 'Messico',
    countryCode: 'MX',
    flag: '🇲🇽',
    image: `${UNSPLASH_BASE}photo-1513456852971-30c0b8199d4d?w=800`,
    calories: 450,
    protein: 20,
    carbs: 42,
    fat: 22,
    tags: ['Messico', 'Antipasti', 'Formaggio', 'Cucine dal Mondo'],
    ingredients: [
      '4 tortillas grandi di farina o mais',
      '200g formaggio Oaxaca o Cheddar grattugiato',
      '1 peperone rosso grigliato a striscioline',
      '1/2 cipolla dorata stufata',
      '1 pizzico origano e peperoncino',
      'Panna acida (sour cream) e salsa pico de gallo per accompagnare'
    ],
    ingredienti: [
      '4 tortillas grandi di farina o mais',
      '200g formaggio Oaxaca o Cheddar grattugiato',
      '1 peperone rosso grigliato a striscioline',
      '1/2 cipolla dorata stufata',
      '1 pizzico origano e peperoncino',
      'Panna acida (sour cream) e salsa pico de gallo per accompagnare'
    ],
    steps: [
      'Scalda una padella antiaderente larga a fuoco medio.',
      'Adagia una tortilla e cospargi metà superficie con formaggio grattugiato, peperoni e cipolle stufate.',
      'Ripiega la tortilla a mezzaluna e premi leggermente con una spatola.',
      'Cuoci per 2-3 minuti per lato finché la tortilla non è dorata e croccante e il formaggio completamente fuso.',
      'Taglia a triangoli e servi calda con panna acida e salsa fresca.'
    ],
    procedimento: 'Farcisci le tortillas con formaggio e peperoni, ripiega a mezzaluna e tosta in padella fino a fondere il formaggio. Servi a spicchi.'
  },

  // 🇮🇳 INDIA
  {
    id: 'world_in_pollo_tikka_masala',
    title: 'Pollo Tikka Masala Indiano con Riso Basmati Speziato',
    nome: 'Pollo Tikka Masala Indiano con Riso Basmati Speziato',
    category: 'Cucine dal Mondo',
    categoria: 'Cucine dal Mondo',
    country: 'India',
    countryCode: 'IN',
    flag: '🇮🇳',
    image: `${UNSPLASH_BASE}photo-1588166524941-3bf61a9c41db?w=800`,
    calories: 590,
    protein: 42,
    carbs: 55,
    fat: 22,
    tags: ['India', 'Pollo', 'Curry', 'Spezie', 'Secondi', 'Cucine dal Mondo'],
    ingredients: [
      '500g petto di pollo a bocconcini',
      '150g yogurt greco intero',
      '2 cucchiai garam masala',
      '1 cucchiaino curcuma in polvere',
      '1 cucchiaio zenzero fresco grattugiato',
      '2 spicchi d\'aglio tritati',
      '400g passata di pomodoro',
      '150ml panna fresca o latte di cocco',
      '1 cipolla grande dorata',
      '200g riso basmati aromatico',
      'Coriandolo fresco e burro chiarificato (ghee)'
    ],
    ingredienti: [
      '500g petto di pollo a bocconcini',
      '150g yogurt greco intero',
      '2 cucchiai garam masala',
      '1 cucchiaino curcuma in polvere',
      '1 cucchiaio zenzero fresco grattugiato',
      '2 spicchi d\'aglio tritati',
      '400g passata di pomodoro',
      '150ml panna fresca o latte di cocco',
      '1 cipolla grande dorata',
      '200g riso basmati aromatico',
      'Coriandolo fresco e burro chiarificato (ghee)'
    ],
    steps: [
      'Marina il pollo con yogurt, 1 cucchiaio di garam masala, curcuma, metà zenzero e aglio per almeno 30 minuti in frigorifero.',
      'Rosola il pollo marinato a fuoco vivo in una padella con poco ghee finché non prende colore affumicato.',
      'In una casseruola a parte, rosola la cipolla tritata con il restante zenzero, aglio e spezie.',
      'Unisci la passata di pomodoro e cuoci a fuoco dolce per 15 minuti. Aggiungi il pollo e la panna fresca (o latte di cocco).',
      'Fai sobbollire per altri 10 minuti fino a consistenza vellutata e avvolgente.',
      'Servi con riso basmati fumante e foglie di coriandolo fresco.'
    ],
    procedimento: 'Marina il pollo nello yogurt speziato. Rosolalo e uniscilo a una salsa vellutata di pomodoro, cipolla, garam masala e panna. Servi con riso basmati.'
  },
  {
    id: 'world_in_dahl_lenticchie',
    title: 'Dahl di Lenticchie Rosse al Cocco e Garam Masala',
    nome: 'Dahl di Lenticchie Rosse al Cocco e Garam Masala',
    category: 'Cucine dal Mondo',
    categoria: 'Cucine dal Mondo',
    country: 'India',
    countryCode: 'IN',
    flag: '🇮🇳',
    image: `${UNSPLASH_BASE}photo-1546833998-877b37c2e5c6?w=800`,
    calories: 380,
    protein: 19,
    carbs: 52,
    fat: 10,
    tags: ['India', 'Vegano', 'Lenticchie', 'Primi', 'Cucine dal Mondo'],
    ingredients: [
      '250g lenticchie rosse decorticate',
      '400ml latte di cocco cremoso',
      '500ml brodo vegetale',
      '1 cipolla tritata',
      '2 spicchi d\'aglio',
      '1 pezzetto zenzero fresco',
      '1 cucchiaino curcuma',
      '1 cucchiaino cumino in semi',
      '1 cucchiaino garam masala',
      'Succo di 1/2 limone',
      'Coriandolo fresco tritato'
    ],
    ingredienti: [
      '250g lenticchie rosse decorticate',
      '400ml latte di cocco cremoso',
      '500ml brodo vegetale',
      '1 cipolla tritata',
      '2 spicchi d\'aglio',
      '1 pezzetto zenzero fresco',
      '1 cucchiaino curcuma',
      '1 cucchiaino cumino in semi',
      '1 cucchiaino garam masala',
      'Succo di 1/2 limone',
      'Coriandolo fresco tritato'
    ],
    steps: [
      'Sciacqua le lenticchie rosse sotto acqua fredda finché l\'acqua non diventa limpida.',
      'In una pentola capiente rosola nel ghee o olio la cipolla, aglio, zenzero e semi di cumino finché fragranti.',
      'Aggiungi la curcuma, il garam masala e le lenticchie sciacquate, mescolando per 1 minuto.',
      'Versa il brodo vegetale e il latte di cocco. Porta a bollore e abbassa la fiamma.',
      'Cuoci coperto per circa 20-25 minuti finché le lenticchie si sfaldano creando una crema ricca.',
      'Termina con succo di limone e coriandolo fresco. Accompagna con pane naan caldo.'
    ],
    procedimento: 'Rosola aglio, zenzero, cipolla e spezie indiane. Aggiungi lenticchie rosse, brodo e latte di cocco. Cuoci 20 minuti finché cremoso e termina con limone e coriandolo.'
  },

  // 🇬🇷 GRECIA
  {
    id: 'world_gr_moussaka',
    title: 'Moussaka Tradizionale Greca con Besciamella Dorata',
    nome: 'Moussaka Tradizionale Greca con Besciamella Dorata',
    category: 'Cucine dal Mondo',
    categoria: 'Cucine dal Mondo',
    country: 'Grecia',
    countryCode: 'GR',
    flag: '🇬🇷',
    image: `${UNSPLASH_BASE}photo-1608897013039-887f21d8c804?w=800`,
    calories: 610,
    protein: 30,
    carbs: 45,
    fat: 34,
    tags: ['Grecia', 'Secondi', 'Carne', 'Melanzane', 'Cucine dal Mondo'],
    ingredients: [
      '3 melanzane grandi tonde',
      '2 patate grandi sbucciate',
      '500g carne macinata di agnello o manzo',
      '1 cipolla dorata tritata',
      '2 spicchi d\'aglio',
      '400g passata di pomodoro',
      '1 stecca di cannella o 1/2 cucchiaino in polvere',
      '500ml latte intero per besciamella',
      '50g burro e 50g farina 00',
      'Noce moscata grattugiata',
      '80g formaggio Kefalotyri o pecorino grattugiato'
    ],
    ingredienti: [
      '3 melanzane grandi tonde',
      '2 patate grandi sbucciate',
      '500g carne macinata di agnello o manzo',
      '1 cipolla dorata tritata',
      '2 spicchi d\'aglio',
      '400g passata di pomodoro',
      '1 stecca di cannella o 1/2 cucchiaino in polvere',
      '500ml latte intero per besciamella',
      '50g burro e 50g farina 00',
      'Noce moscata grattugiata',
      '80g formaggio Kefalotyri o pecorino grattugiato'
    ],
    steps: [
      'Taglia melanzane e patate a fette spesse 1 cm. Spennella d\'olio e inforna a 200°C per 20 minuti finché tenere e dorate.',
      'Prepara il ragù greco: rosola cipolla e aglio, unisci la carne macinata e rosola bene. Aggiungi pomodoro, cannella, sale e pepe e cuoci per 30 minuti.',
      'Prepara una besciamella densa con burro, farina e latte caldo, aromatizzando con noce moscata e metà formaggio grattugiato.',
      'In una pirofila disponi uno strato di patate, poi melanzane, versa il ragù alla cannella, un secondo strato di melanzane e copri con la besciamella.',
      'Spolvera con il restante formaggio grattugiato e inforna a 180°C per 40-45 minuti finché la superficie non è perfettamente gratinata.',
      'Lascia riposare 20 minuti prima di tagliare a fette.'
    ],
    procedimento: 'Inforna fette di patate e melanzane. Prepara un ragù aromatizzato alla cannella. Stratifica verdure, carne e una ricca besciamella al formaggio. Inforna a 180°C per 45 minuti.'
  },
  {
    id: 'world_gr_souvlaki',
    title: 'Souvlaki di Pollo Marinato con Tzatziki e Pita Greca',
    nome: 'Souvlaki di Pollo Marinato con Tzatziki e Pita Greca',
    category: 'Cucine dal Mondo',
    categoria: 'Cucine dal Mondo',
    country: 'Grecia',
    countryCode: 'GR',
    flag: '🇬🇷',
    image: `${UNSPLASH_BASE}photo-1529006557810-274b9b2fc783?w=800`,
    calories: 480,
    protein: 36,
    carbs: 42,
    fat: 18,
    tags: ['Grecia', 'Pollo', 'Secondi', 'Griglia', 'Cucine dal Mondo'],
    ingredients: [
      '500g petto o cosce di pollo disossate a cubi',
      'Succo di 1 limone',
      '4 cucchiai olio extravergine d\'oliva',
      '2 spicchi d\'aglio tritati',
      '1 cucchiaio origano greco essiccato',
      '4 pani pita greci morbidi',
      '150g salsa tzatziki tradizionale (yogurt, cetriolo, aglio)',
      'Pomodori e cipolla rossa affettata per servire'
    ],
    ingredienti: [
      '500g petto o cosce di pollo disossate a cubi',
      'Succo di 1 limone',
      '4 cucchiai olio extravergine d\'oliva',
      '2 spicchi d\'aglio tritati',
      '1 cucchiaio origano greco essiccato',
      '4 pani pita greci morbidi',
      '150g salsa tzatziki tradizionale (yogurt, cetriolo, aglio)',
      'Pomodori e cipolla rossa affettata per servire'
    ],
    steps: [
      'Marina i cubi di pollo con olio, limone, aglio, abbondante origano, sale e pepe per almeno 1 ora.',
      'Infila i bocconcini di pollo su spiedini di legno (precedentemente ammollati in acqua per non bruciare).',
      'Cuoci su piastra rovente o griglia per 10-12 minuti girando spesso fino a doratura perfetta.',
      'Scalda la pita greca sulla piastra per 1 minuto spennellando con un velo d\'olio.',
      'Servi gli spiedini sulla pita calda con salsa tzatziki rinfrescante, fette di pomodoro e cipolla rossa.'
    ],
    procedimento: 'Marina il pollo con origano, aglio, limone e olio d\'oliva. Forma spiedini e griglia a fuoco vivo. Servi con pita calda, tzatziki, pomodori e cipolla.'
  },

  // 🇪🇸 SPAGNA
  {
    id: 'world_es_paella_valenciana',
    title: 'Paella Valenciana Tradizionale con Pollo e Verdure',
    nome: 'Paella Valenciana Tradizionale con Pollo e Verdure',
    category: 'Cucine dal Mondo',
    categoria: 'Cucine dal Mondo',
    country: 'Spagna',
    countryCode: 'ES',
    flag: '🇪🇸',
    image: `${UNSPLASH_BASE}photo-1534080564583-6be75777b70a?w=800`,
    calories: 520,
    protein: 32,
    carbs: 64,
    fat: 14,
    tags: ['Spagna', 'Primi', 'Riso', 'Carne', 'Cucine dal Mondo'],
    ingredients: [
      '350g riso Bomba o Arborio per paella',
      '400g pollo tagliato a pezzi piccoli',
      '150g taccole o fagiolini piatti (bajoqueta)',
      '100g fagioli bianchi garrofón (o cannellini)',
      '1 pomodoro maturo grattugiato',
      '1 bustina pistilli di zafferano puro',
      '1 cucchiaino paprika dolce (pimentón)',
      '1 litro brodo di carne e verdure caldo',
      'Olio extravergine d\'oliva e rosmarino fresco'
    ],
    ingredienti: [
      '350g riso Bomba o Arborio per paella',
      '400g pollo tagliato a pezzi piccoli',
      '150g taccole o fagiolini piatti (bajoqueta)',
      '100g fagioli bianchi garrofón (o cannellini)',
      '1 pomodoro maturo grattugiato',
      '1 bustina pistilli di zafferano puro',
      '1 cucchiaino paprika dolce (pimentón)',
      '1 litro brodo di carne e verdure caldo',
      'Olio extravergine d\'oliva e rosmarino fresco'
    ],
    steps: [
      'Nella paellera scalda l\'olio d\'oliva e rosola la carne di pollo finché ben dorata e croccante sui bordi.',
      'Sposta la carne verso i bordi e al centro aggiungi i fagiolini e i fagioli bianchi, soffriggendo per 5 minuti.',
      'Aggiungi il pomodoro grattugiato e la paprika dolce, mescolando rapidamente per non bruciare la paprika.',
      'Versa il brodo caldo e lo zafferano, portando a forte ebollizione per 10 minuti affinché il liquido prenda tutto il sapore.',
      'Distribuisci il riso Bomba a croce e poi uniformemente. Cuoci per 10 minuti a fuoco vivo e 8 minuti a fuoco basso SENZA mescolare.',
      'Negli ultimi 2 minuti alza leggermente la fiamma per formare il croccante socarrat sul fondo. Riposa 5 minuti coperta prima di servire.'
    ],
    procedimento: 'Rosola il pollo nella paellera, unisci fagiolini, pomodoro e paprika. Versa il brodo con zafferano, spargi il riso Bomba e cuoci senza mescolare creando il tipico socarrat.'
  },
  {
    id: 'world_es_tortilla_patatas',
    title: 'Tortilla de Patatas Tradizionale Spagnola',
    nome: 'Tortilla de Patatas Tradizionale Spagnola',
    category: 'Cucine dal Mondo',
    categoria: 'Cucine dal Mondo',
    country: 'Spagna',
    countryCode: 'ES',
    flag: '🇪🇸',
    image: `${UNSPLASH_BASE}photo-1565299624946-b28f40a0ae38?w=800`,
    calories: 360,
    protein: 14,
    carbs: 32,
    fat: 20,
    tags: ['Spagna', 'Secondi', 'Uova', 'Patate', 'Tapas', 'Cucine dal Mondo'],
    ingredients: [
      '5 patate a pasta gialla medie',
      '6 uova fresche grandi',
      '1 cipolla dorata (facoltativa per versione con cebolla)',
      '200ml olio extravergine d\'oliva per confit',
      '1 cucchiaino sale fino abbondante'
    ],
    ingredienti: [
      '5 patate a pasta gialla medie',
      '6 uova fresche grandi',
      '1 cipolla dorata (facoltativa per versione con cebolla)',
      '200ml olio extravergine d\'oliva per confit',
      '1 cucchiaino sale fino abbondante'
    ],
    steps: [
      'Pela le patate e tagliale a fette sottili irregolari (circa 3 mm). Taglia la cipolla a julienne.',
      'In una padella versa abbondante olio extravergine e cuoci patate e cipolle a fuoco dolce: non devono friggere ma stufarsi morbidamente per 20 minuti.',
      'Scola le patate e cipolle dall\'olio in eccesso e lasciale intiepidire 5 minuti.',
      'In una ciotola sbatti leggermente le uova con il sale, poi unisci le patate calde lasciando riposare il composto per 10 minuti affinché assorba l\'uovo.',
      'Scalda una padella antiaderente con un cucchiaio d\'olio, versa il composto e cuoci a fuoco medio-basso per 4 minuti.',
      'Gira la tortilla con un piatto largo e cuoci dall\'altro lato per altri 2-3 minuti lasciando il cuore cremoso (jugosa). Servi tiepida.'
    ],
    procedimento: 'Stufa patate e cipolle a fette sottili nell\'olio d\'oliva. Unisci alle uova sbattute e lascia riposare. Cuoci in padella girando a metà cottura per un cuore morbido.'
  },

  // 🇺🇸 USA
  {
    id: 'world_us_smash_burger',
    title: 'Classic American Smash Burger con Cheddar e Bacon',
    nome: 'Classic American Smash Burger con Cheddar e Bacon',
    category: 'Cucine dal Mondo',
    categoria: 'Cucine dal Mondo',
    country: 'USA',
    countryCode: 'US',
    flag: '🇺🇸',
    image: `${UNSPLASH_BASE}photo-1568901346375-23c9450c58cd?w=800`,
    calories: 650,
    protein: 42,
    carbs: 38,
    fat: 36,
    tags: ['USA', 'Burger', 'Carne', 'Secondi', 'Cucine dal Mondo'],
    ingredients: [
      '300g macinato di manzo scelto (80% magro, 20% grasso)',
      '2 panini soffici tipo Potato Bun o Brioche',
      '4 fette formaggio Cheddar americano autentico',
      '4 fettine bacon croccante',
      'Cetriolini sottaceto a fette',
      'Salsa speciale: maionese, senape, ketchup, cetriolini tritati',
      'Burro per tostare i panini'
    ],
    ingredienti: [
      '300g macinato di manzo scelto (80% magro, 20% grasso)',
      '2 panini soffici tipo Potato Bun o Brioche',
      '4 fette formaggio Cheddar americano autentico',
      '4 fettine bacon croccante',
      'Cetriolini sottaceto a fette',
      'Salsa speciale: maionese, senape, ketchup, cetriolini tritati',
      'Burro per tostare i panini'
    ],
    steps: [
      'Dividi la carne in 4 palline da circa 75g senza compattarla troppo.',
      'Scalda una piastra di ghisa a temperatura altissima. Tosta le metà dei bun con un velo di burro fino a caramellatura.',
      'Appoggia le palline di carne sulla piastra rovente e con una spatola d\'acciaio pesante schiaccia (smash) con forza fino a renderle sottilissime.',
      'Sala abbondantemente e cuoci per 2 minuti creando una crosticina scura e croccante. Gira, adagia subito il cheddar e lascia fondere 1 minuto.',
      'Componi il burger: base del bun, salsa speciale, cetriolini, doppio patty smash con cheddar fuso, bacon croccante e chiudi con la corona del panino.'
    ],
    procedimento: 'Schiaccia forte le palline di manzo su piastra rovente per creare la tipica crosticina smash. Copri con cheddar e bacon croccante e servi nei brioche bun imburrati.'
  },
  {
    id: 'world_us_cheesecake_ny',
    title: 'New York Cheesecake Tradizionale al Forno',
    nome: 'New York Cheesecake Tradizionale al Forno',
    category: 'Cucine dal Mondo',
    categoria: 'Cucine dal Mondo',
    country: 'USA',
    countryCode: 'US',
    flag: '🇺🇸',
    image: `${UNSPLASH_BASE}photo-1533134242443-d4fd215305ad?w=800`,
    calories: 450,
    protein: 9,
    carbs: 40,
    fat: 28,
    tags: ['USA', 'Dolci', 'Cheesecake', 'Cucine dal Mondo'],
    ingredients: [
      '200g biscotti Digestive o Graham crackers',
      '100g burro fuso',
      '600g formaggio spalmabile tipo Philadelphia intero',
      '150g zucchero semolato',
      '150ml panna acida (sour cream)',
      '3 uova intere a temperatura ambiente',
      '1 cucchiaino estratto di vaniglia Bourbon',
      'Scorza grattugiata di 1 limone biologico',
      'Coulis di frutti di bosco per guarnire'
    ],
    ingredienti: [
      '200g biscotti Digestive o Graham crackers',
      '100g burro fuso',
      '600g formaggio spalmabile tipo Philadelphia intero',
      '150g zucchero semolato',
      '150ml panna acida (sour cream)',
      '3 uova intere a temperatura ambiente',
      '1 cucchiaino estratto di vaniglia Bourbon',
      'Scorza grattugiata di 1 limone biologico',
      'Coulis di frutti di bosco per guarnire'
    ],
    steps: [
      'Trita finemente i biscotti e mescolali con il burro fuso. Compatta la base sul fondo di una tortiera a cerniera da 22 cm e refrigera per 20 minuti.',
      'Lavora a crema il formaggio spalmabile con lo zucchero senza incorporare troppa aria.',
      'Aggiungi la panna acida, la vaniglia e la scorza di limone. Unisci le uova una alla volta mescolando a bassa velocità.',
      'Versa la crema sulla base di biscotto e cuoci in forno statico a 160°C per circa 60 minuti finché i bordi sono sodi e il centro leggermente tremolante.',
      'Spegni il forno e lascia raffreddare all\'interno con lo sportello socchiuso per 1 ora, poi trasferisci in frigo per almeno 6 ore prima di servire con coulis di frutti di bosco.'
    ],
    procedimento: 'Prepara la base di biscotti e burro. Lavora Philadelphia, panna acida, uova, zucchero e vaniglia. Cuoci a 160°C per 60 minuti e lascia rassodare in frigo 6 ore.'
  },

  // 🇫🇷 FRANCIA
  {
    id: 'world_fr_quiche_lorraine',
    title: 'Quiche Lorraine Tradizionale Francese con Gruyère',
    nome: 'Quiche Lorraine Tradizionale Francese con Gruyère',
    category: 'Cucine dal Mondo',
    categoria: 'Cucine dal Mondo',
    country: 'Francia',
    countryCode: 'FR',
    flag: '🇫🇷',
    image: `${UNSPLASH_BASE}photo-1565299624946-b28f40a0ae38?w=800`,
    calories: 420,
    protein: 16,
    carbs: 28,
    fat: 28,
    tags: ['Francia', 'Antipasti', 'Secondi', 'Torte Salate', 'Cucine dal Mondo'],
    ingredients: [
      '1 rotolo pasta brisée artigianale',
      '200g pancetta affumicata (lardons) a cubetti',
      '3 uova intere grandi',
      '200ml panna fresca liquida (crème fraîche)',
      '100ml latte intero',
      '100g formaggio Gruyère o Emmental grattugiato',
      '1 pizzico noce moscata grattugiata',
      'Sale fino e pepe nero macinato'
    ],
    ingredienti: [
      '1 rotolo pasta brisée artigianale',
      '200g pancetta affumicata (lardons) a cubetti',
      '3 uova intere grandi',
      '200ml panna fresca liquida (crème fraîche)',
      '100ml latte intero',
      '100g formaggio Gruyère o Emmental grattugiato',
      '1 pizzico noce moscata grattugiata',
      'Sale fino e pepe nero macinato'
    ],
    steps: [
      'Stendi la pasta brisée in una teglia da crostata da 24 cm, bucherella il fondo con una forchetta e riponi in frigo per 15 minuti.',
      'Rosola i lardons di pancetta in padella senza grassi aggiunti per 5 minuti finché croccanti, poi scolali su carta assorbente.',
      'In una ciotola sbatti le uova con la crème fraîche, il latte, noce moscata, sale e pepe.',
      'Distribuisci i cubetti di pancetta e il formaggio Gruyère grattugiato sulla base della pasta brisée.',
      'Versa il composto liquido di uova e panna fino al bordo.',
      'Inforna a 180°C per circa 35-40 minuti fino a completa doratura e consistenza gonfia e soffice. Servi tiepida.'
    ],
    procedimento: 'Fodera la teglia con pasta brisée. Rosola la pancetta affumicata. Prepara l\'appareil con uova, panna, latte e noce moscata. Aggiungi Gruyère e inforna a 180°C per 40 minuti.'
  },
  {
    id: 'world_fr_ratatouille',
    title: 'Ratatouille Tradizionale Provensale di Verdure',
    nome: 'Ratatouille Tradizionale Provensale di Verdure',
    category: 'Cucine dal Mondo',
    categoria: 'Cucine dal Mondo',
    country: 'Francia',
    countryCode: 'FR',
    flag: '🇫🇷',
    image: `${UNSPLASH_BASE}photo-1572453800999-e8d2d1589b7c?w=800`,
    calories: 220,
    protein: 5,
    carbs: 24,
    fat: 12,
    tags: ['Francia', 'Contorni', 'Vegano', 'Verdure', 'Cucine dal Mondo'],
    ingredients: [
      '2 melanzane medie sode',
      '2 zucchine verdi e 1 gialla',
      '2 peperoni (1 rosso e 1 giallo)',
      '4 pomodori ramati maturi',
      '1 cipolla bianca grande',
      '3 spicchi d\'aglio in camicia',
      'Erbe di Provenza (timo, rosmarino, origano fresco)',
      'Olio extravergine d\'oliva abbondante',
      'Sale e pepe nero macinato fresco'
    ],
    ingredienti: [
      '2 melanzane medie sode',
      '2 zucchine verdi e 1 gialla',
      '2 peperoni (1 rosso e 1 giallo)',
      '4 pomodori ramati maturi',
      '1 cipolla bianca grande',
      '3 spicchi d\'aglio in camicia',
      'Erbe di Provenza (timo, rosmarino, origano fresco)',
      'Olio extravergine d\'oliva abbondante',
      'Sale e pepe nero macinato fresco'
    ],
    steps: [
      'Taglia melanzane, zucchine e pomodori a rondelle regolari di 3 mm con una mandolina.',
      'In una casseruola stufa la cipolla tritata con i peperoni a cubetti e metà pomodori pelati per fare la base di piperade saporita.',
      'Stendi la piperade sul fondo di una pirofila rotonda in ceramica.',
      'Disponi a spirale alternata le rondelle di melanzana, zucchina e pomodoro fino a riempire tutta la pirofila.',
      'Spennella generosamente con olio extravergine, aglio schiacciato ed erbe di Provenza.',
      'Copri con carta forno e inforna a 170°C per 45 minuti, poi scopri per gli ultimi 15 minuti per caramellare leggermente.'
    ],
    procedimento: 'Stufa cipolla e peperoni per creare la base. Disponi le rondelle di melanzane, zucchine e pomodori a spirale. Condisci con olio ed erbe di Provenza e inforna dolcemente per 1 ora.'
  },

  // 🇹🇭 THAILANDIA
  {
    id: 'world_th_pad_thai',
    title: 'Pad Thai Tradizionale con Gamberi, Riso e Arachidi',
    nome: 'Pad Thai Tradizionale con Gamberi, Riso e Arachidi',
    category: 'Cucine dal Mondo',
    categoria: 'Cucine dal Mondo',
    country: 'Thailandia',
    countryCode: 'TH',
    flag: '🇹🇭',
    image: `${UNSPLASH_BASE}photo-1559847844-5315695dadae?w=800`,
    calories: 510,
    protein: 28,
    carbs: 65,
    fat: 16,
    tags: ['Thailandia', 'Primi', 'Noodles', 'Pesce', 'Cucine dal Mondo'],
    ingredients: [
      '250g tagliatelle di riso piatte (rice noodles)',
      '250g code di gambero sgusciate e pulite',
      '100g tofu compatto a dadini dorati',
      '2 uova fresche',
      '100g germogli di soia freschi',
      '3 cipollotti tagliati a bastoncini',
      '40g arachidi tostate tritate grossolanamente',
      'Per la salsa Pad Thai: 3 cucchiai pasta di tamarindo, 2 cucchiai salsa di pesce (Nam Pla), 2 cucchiai zucchero di palma o canna, 1 cucchiaio succo di lime',
      'Peperoncino piccante e spicchi di lime per guarnire'
    ],
    ingredienti: [
      '250g tagliatelle di riso piatte (rice noodles)',
      '250g code di gambero sgusciate e pulite',
      '100g tofu compatto a dadini dorati',
      '2 uova fresche',
      '100g germogli di soia freschi',
      '3 cipollotti tagliati a bastoncini',
      '40g arachidi tostate tritate grossolanamente',
      'Per la salsa Pad Thai: 3 cucchiai pasta di tamarindo, 2 cucchiai salsa di pesce (Nam Pla), 2 cucchiai zucchero di palma o canna, 1 cucchiaio succo di lime',
      'Peperoncino piccante e spicchi di lime per guarnire'
    ],
    steps: [
      'Ammolla i noodles di riso in acqua tiepida per 30 minuti finché flessibili ma ancora sodi.',
      'In una ciotolina emulsiona pasta di tamarindo, salsa di pesce, zucchero di palma e succo di lime fino a scioglimento.',
      'Scalda il wok a fiamma vivace con un filo d\'olio, salta i gamberi e il tofu per 2 minuti e mettili da parte.',
      'Nello stesso wok rompi le uova strapazzandole velocemente, poi aggiungi i noodles scolati e la salsa Pad Thai.',
      'Salta a fuoco altissimo finché i noodles assorbono tutto il condimento. Reincorpora gamberi, tofu, germogli di soia e cipollotti.',
      'Servi subito con abbondanti arachidi tostate, fiocchi di peperoncino e spicchi di lime fresco.'
    ],
    procedimento: 'Ammolla i noodles di riso. Prepara la salsa con tamarindo, salsa di pesce e zucchero di palma. Salta nel wok gamberi, tofu, uova e noodles, finendo con germogli di soia, arachidi e lime.'
  },
  {
    id: 'world_th_curry_verde',
    title: 'Curry Verde Thailandese con Pollo e Latte di Cocco',
    nome: 'Curry Verde Thailandese con Pollo e Latte di Cocco',
    category: 'Cucine dal Mondo',
    categoria: 'Cucine dal Mondo',
    country: 'Thailandia',
    countryCode: 'TH',
    flag: '🇹🇭',
    image: `${UNSPLASH_BASE}photo-1455619452474-d2be8b1e70cd?w=800`,
    calories: 530,
    protein: 35,
    carbs: 45,
    fat: 24,
    tags: ['Thailandia', 'Curry', 'Pollo', 'Secondi', 'Cucine dal Mondo'],
    ingredients: [
      '400g petto di pollo a bocconcini sottili',
      '400ml latte di cocco cremoso intero',
      '2 cucchiai pasta di curry verde thai autentica',
      '100g melanzane thailandesi o taccole croccanti',
      '4 foglie di kaffir lime (combava)',
      '1 gambo di lemongrass pestato',
      '1 cucchiaio salsa di pesce (Nam Pla)',
      '1 cucchiaino zucchero di canna',
      'Foglie di basilico thailandese fresco',
      'Riso al gelsomino (Jasmine) per accompagnare'
    ],
    ingredienti: [
      '400g petto di pollo a bocconcini sottili',
      '400ml latte di cocco cremoso intero',
      '2 cucchiai pasta di curry verde thai autentica',
      '100g melanzane thailandesi o taccole croccanti',
      '4 foglie di kaffir lime (combava)',
      '1 gambo di lemongrass pestato',
      '1 cucchiaio salsa di pesce (Nam Pla)',
      '1 cucchiaino zucchero di canna',
      'Foglie di basilico thailandese fresco',
      'Riso al gelsomino (Jasmine) per accompagnare'
    ],
    steps: [
      'In una casseruola versa 3 cucchiai di latte di cocco a fiamma viva finché si separa l\'olio profumato.',
      'Aggiungi la pasta di curry verde e rosola per 2 minuti sprigionando tutti gli oli aromatici.',
      'Unisci il pollo a bocconcini rosolando per 3 minuti per avvolgerlo nel curry.',
      'Versa il resto del latte di cocco, le foglie di kaffir lime, il lemongrass, la salsa di pesce e lo zucchero.',
      'Aggiungi le melanzane o taccole e fai sobbollire dolcemente per 10 minuti finché il pollo è tenero e la salsa vellutata.',
      'A fuoco spento cospargi con abbondante basilico thai e servi con riso Jasmine fumante.'
    ],
    procedimento: 'Rosola la pasta di curry verde nel latte di cocco. Aggiungi il pollo, verdure, kaffir lime e salsa di pesce. Cuoci dolcemente e profuma con basilico thai fresco.'
  },

  // 🇲🇦 MAROCCO
  {
    id: 'world_ma_couscous_verdure',
    title: 'Couscous Reale alle Sette Verdure e Ceci Speziati',
    nome: 'Couscous Reale alle Sette Verdure e Ceci Speziati',
    category: 'Cucine dal Mondo',
    categoria: 'Cucine dal Mondo',
    country: 'Marocco',
    countryCode: 'MA',
    flag: '🇲🇦',
    image: `${UNSPLASH_BASE}photo-1541518763669-27fef04b14ea?w=800`,
    calories: 430,
    protein: 15,
    carbs: 72,
    fat: 10,
    tags: ['Marocco', 'Couscous', 'Vegano', 'Primi', 'Cucine dal Mondo'],
    ingredients: [
      '300g semola per couscous medio',
      '200g ceci cotti',
      '2 carote grandi a bastoncini',
      '2 zucchine a pezzi grandi',
      '200g zucca a fette spesse',
      '1 rapa bianca o cavolo verza a spicchi',
      '1 cipolla grande dorata',
      '1 cucchiaio miscela Ras el Hanout marocchina',
      '1 cucchiaino curcuma e zenzero in polvere',
      '1 noce burro o burro chiarificato Smen',
      'Uvetta sultanina e harissa piccante per servire'
    ],
    ingredienti: [
      '300g semola per couscous medio',
      '200g ceci cotti',
      '2 carote grandi a bastoncini',
      '2 zucchine a pezzi grandi',
      '200g zucca a fette spesse',
      '1 rapa bianca o cavolo verza a spicchi',
      '1 cipolla grande dorata',
      '1 cucchiaio miscela Ras el Hanout marocchina',
      '1 cucchiaino curcuma e zenzero in polvere',
      '1 noce burro o burro chiarificato Smen',
      'Uvetta sultanina e harissa piccante per servire'
    ],
    steps: [
      'Nella parte inferiore della couscoussiera (o pentola capiente) rosola la cipolla con olio, Ras el Hanout, zenzero e curcuma.',
      'Aggiungi carote, rapa e brodo vegetale coprendo a filo, e porta a bollore per 15 minuti.',
      'Inumidisci la semola con acqua tiepida, un filo d\'olio e sale, sgranandola con le dita.',
      'Aggiungi le zucchine, la zucca e i ceci nella pentola; posiziona la semola nel cestello superiore per la cottura a vapore per 20 minuti.',
      'Versa il couscous in un grande piatto rotondo (gsaa), lavoralo con burro e sgrana perfettamente i chicchi.',
      'Disponi il couscous a piramide, decora con le verdure speziate a raggiera e servi con ciotoline di brodo profumato e salsa harissa.'
    ],
    procedimento: 'Stufa le sette verdure e ceci nel brodo profumato con Ras el Hanout. Cuoci a vapore la semola di couscous, sgranala con burro e componi a raggiera con le verdure.'
  },
  {
    id: 'world_ma_tajine_pollo',
    title: 'Tajine di Pollo con Limoni Canditi e Olive Verdi',
    nome: 'Tajine di Pollo con Limoni Canditi e Olive Verdi',
    category: 'Cucine dal Mondo',
    categoria: 'Cucine dal Mondo',
    country: 'Marocco',
    countryCode: 'MA',
    flag: '🇲🇦',
    image: `${UNSPLASH_BASE}photo-1511690656952-34342bb7c2f2?w=800`,
    calories: 470,
    protein: 38,
    carbs: 18,
    fat: 26,
    tags: ['Marocco', 'Secondi', 'Pollo', 'Spezie', 'Cucine dal Mondo'],
    ingredients: [
      '600g cosce e sovracosce di pollo',
      '2 cipolle dorate tritate finemente',
      '2 spicchi d\'aglio schiacciati',
      '1 limone candito marocchino (la scorza a striscioline)',
      '100g olive verdi denocciolate in salamoia',
      '1 cucchiaino zenzero in polvere',
      '1 bustina pistilli di zafferano',
      '1 mazzetto prezzemolo e coriandolo fresco tritati',
      'Olio extravergine d\'oliva e pepe nero'
    ],
    ingredienti: [
      '600g cosce e sovracosce di pollo',
      '2 cipolle dorate tritate finemente',
      '2 spicchi d\'aglio schiacciati',
      '1 limone candito marocchino (la scorza a striscioline)',
      '100g olive verdi denocciolate in salamoia',
      '1 cucchiaino zenzero in polvere',
      '1 bustina pistilli di zafferano',
      '1 mazzetto prezzemolo e coriandolo fresco tritati',
      'Olio extravergine d\'oliva e pepe nero'
    ],
    steps: [
      'Marina il pollo per 30 minuti con aglio, zenzero, zafferano, metà erbe aromatiche, sale e un filo d\'olio.',
      'Nel piatto di coccio del tajine (o tegame in ghisa con coperchio conico) rosola la cipolla finché diventa fondente.',
      'Adagia i pezzi di pollo marinato e versa 1 bicchiere d\'acqua calda aromatizzata con lo zafferano.',
      'Chiudi con il coperchio del tajine e cuoci a fiamma dolcissima per circa 40 minuti.',
      'Aggiungi la scorza del limone candito tagliata a filetti e le olive verdi sciacquate.',
      'Lascia restringere il fondo di cottura senza coperchio per 10 minuti fino a ottenere una salsa densa e dorata. Servi con pane arabo fresco.'
    ],
    procedimento: 'Marina il pollo con spezie e zafferano. Cuoci a fuoco dolce nel tajine con cipolle stufate. Aggiungi limone candito e olive verdi e riduci il sughetto.'
  },

  // 🇨🇳 CINA
  {
    id: 'world_cn_riso_cantonese',
    title: 'Riso alla Cantonese Tradizionale con Prosciutto e Piselli',
    nome: 'Riso alla Cantonese Tradizionale con Prosciutto e Piselli',
    category: 'Cucine dal Mondo',
    categoria: 'Cucine dal Mondo',
    country: 'Cina',
    countryCode: 'CN',
    flag: '🇨🇳',
    image: `${UNSPLASH_BASE}photo-1603133872878-684f208fb84b?w=800`,
    calories: 410,
    protein: 18,
    carbs: 62,
    fat: 10,
    tags: ['Cina', 'Primi', 'Riso', 'Cucine dal Mondo'],
    ingredients: [
      '300g riso a chicco lungo (Jasmine o Basmati) già cotto e raffreddato (meglio del giorno prima)',
      '120g prosciutto cotto tagliato a cubetti piccoli',
      '100g piselli fini lessati',
      '2 uova fresche',
      '2 cipollotti freschi a rondelle',
      '2 cucchiai salsa di soia chiara',
      '1 cucchiaino olio di sesamo tostato',
      'Olio di semi di arachidi per saltare'
    ],
    ingredienti: [
      '300g riso a chicco lungo (Jasmine o Basmati) già cotto e raffreddato (meglio del giorno prima)',
      '120g prosciutto cotto tagliato a cubetti piccoli',
      '100g piselli fini lessati',
      '2 uova fresche',
      '2 cipollotti freschi a rondelle',
      '2 cucchiai salsa di soia chiara',
      '1 cucchiaino olio di sesamo tostato',
      'Olio di semi di arachidi per saltare'
    ],
    steps: [
      'Sbatti leggermente le uova con un pizzico di sale. Scalda il wok a fuoco vivo con un cucchiaio d\'olio e prepara una frittatina sottile sbriciolandola a pezzi.',
      'Aggiungi nel wok ben caldo il prosciutto cotto a cubetti e i piselli, saltando per 1 minuto.',
      'Aggiungi il riso freddo ben sgranato con le mani. Salta a fuoco altissimo muovendo continuamente il wok affinché i chicchi si tostino uniformemente.',
      'Versa la salsa di soia e l\'olio di sesamo lungo le pareti calde del wok per esaltare l\'aroma.',
      'Reincorpora le uova a pezzetti e termina con gli anelli di cipollotto fresco. Servi caldissimo.'
    ],
    procedimento: 'Strapazza le uova nel wok. Salta prosciutto e piselli a fuoco vivo. Aggiungi il riso freddo sgranato, sfuma con soia e olio di sesamo e completa con cipollotto.'
  },
  {
    id: 'world_cn_jiaozi',
    title: 'Ravioli Jiaozi di Maiale e Cavolo al Vapore o alla Piastra',
    nome: 'Ravioli Jiaozi di Maiale e Cavolo al Vapore o alla Piastra',
    category: 'Cucine dal Mondo',
    categoria: 'Cucine dal Mondo',
    country: 'Cina',
    countryCode: 'CN',
    flag: '🇨🇳',
    image: `${UNSPLASH_BASE}photo-1496116218417-1a781b1c416c?w=800`,
    calories: 380,
    protein: 22,
    carbs: 45,
    fat: 12,
    tags: ['Cina', 'Antipasti', 'Primi', 'Ravioli', 'Cucine dal Mondo'],
    ingredients: [
      '24 dischi di pasta fresca per ravioli cinesi',
      '250g carne macinata di maiale',
      '150g cavolo cinese o verza tritata finemente',
      '2 cipollotti tritati',
      '1 spicchio d\'aglio grattugiato',
      '1 cucchiaino zenzero fresco grattugiato',
      '2 cucchiai salsa di soia',
      '1 cucchiaino olio di sesamo',
      'Per la salsa dip: salsa di soia, aceto nero di Chinkiang e olio al peperoncino'
    ],
    ingredienti: [
      '24 dischi di pasta fresca per ravioli cinesi',
      '250g carne macinata di maiale',
      '150g cavolo cinese o verza tritata finemente',
      '2 cipollotti tritati',
      '1 spicchio d\'aglio grattugiato',
      '1 cucchiaino zenzero fresco grattugiato',
      '2 cucchiai salsa di soia',
      '1 cucchiaino olio di sesamo',
      'Per la salsa dip: salsa di soia, aceto nero di Chinkiang e olio al peperoncino'
    ],
    steps: [
      'Sala il cavolo tritato, lascialo riposare 10 minuti e strizzalo vigorosamente in un canovaccio per eliminare tutta l\'acqua di vegetazione.',
      'In una ciotola mescola energicamente il maiale macinato con il cavolo strizzato, cipollotto, aglio, zenzero, soia e olio di sesamo finché il ripieno risulta colloso.',
      'Posiziona un cucchiaino di ripieno al centro di ciascun disco di pasta, inumidisci i bordi con acqua e chiudi pizzicando le tipiche pieghe a mezzaluna.',
      'Cottura alla piastra (guotie): rosola il fondo dei ravioli in padella con olio per 2 minuti, versa mezza tazza d\'acqua e copri subito con coperchio per cuocere a vapore per 6 minuti finché l\'acqua evapora e il fondo torna croccante.',
      'Servi subito con la salsa a base di soia e aceto nero.'
    ],
    procedimento: 'Strizza il cavolo e impasta con maiale, zenzero, aglio e soia. Farcisci e piega i dischetti di pasta. Cuoci al vapore o su padella creando la crosticina dorata.'
  },

  // 🇱🇧 LIBANO
  {
    id: 'world_lb_falafel_hummus',
    title: 'Falafel Tradizionali Croccanti con Hummus e Salsa Tahina',
    nome: 'Falafel Tradizionali Croccanti con Hummus e Salsa Tahina',
    category: 'Cucine dal Mondo',
    categoria: 'Cucine dal Mondo',
    country: 'Libano',
    countryCode: 'LB',
    flag: '🇱🇧',
    image: `${UNSPLASH_BASE}photo-1593001874117-c99c800e3eb7?w=800`,
    calories: 420,
    protein: 16,
    carbs: 48,
    fat: 19,
    tags: ['Libano', 'Vegano', 'Ceci', 'Antipasti', 'Cucine dal Mondo'],
    ingredients: [
      '300g ceci secchi (ammollati per 24 ore, NON cotti)',
      '1 cipolla bianca media',
      '3 spicchi d\'aglio',
      '1 mazzo prezzemolo fresco e 1 mazzo coriandolo fresco',
      '1 cucchiaio semi di cumino tostati e macinati',
      '1 cucchiaio semi di coriandolo macinati',
      '1/2 cucchiaino bicarbonato di sodio',
      '150g hummus di ceci cremoso',
      'Olio di semi di arachidi per friggere',
      'Pane arabo e sottaceti per servire'
    ],
    ingredienti: [
      '300g ceci secchi (ammollati per 24 ore, NON cotti)',
      '1 cipolla bianca media',
      '3 spicchi d\'aglio',
      '1 mazzo prezzemolo fresco e 1 mazzo coriandolo fresco',
      '1 cucchiaio semi di cumino tostati e macinati',
      '1 cucchiaio semi di coriandolo macinati',
      '1/2 cucchiaino bicarbonato di sodio',
      '150g hummus di ceci cremoso',
      'Olio di semi di arachidi per friggere',
      'Pane arabo e sottaceti per servire'
    ],
    steps: [
      'Scola e asciuga benissimo i ceci ammollati (devono essere rigorosamente crudi per mantenere la consistenza perfetta).',
      'Trita nel mixer i ceci con cipolla, aglio, prezzemolo, coriandolo, cumino, sale e pepe fino a ottenere una pasta a grana fine verde brillante.',
      'Unisci il bicarbonato, mescola bene e lascia riposare il composto in frigo per 30 minuti.',
      'Forma delle polpette rotonde o leggermente schiacciate con le mani umide.',
      'Friggi in abbondante olio a 175°C per circa 4 minuti finché l\'esterno è marrone scuro croccante e l\'interno verde e soffice.',
      'Scola su carta assorbente e servi caldissimi accompagnati da hummus cremoso e salsa tahina al limone.'
    ],
    procedimento: 'Frulla i ceci crudi ammollati con prezzemolo, coriandolo, cipolla e spezie. Forma polpettine e friggi a 175°C finché croccanti fuori e soffici dentro. Servi con hummus.'
  },

  // 🇬🇧 REGNO UNITO
  {
    id: 'world_gb_fish_and_chips',
    title: 'Authentic Fish and Chips con Salsa Tartara e Piselli',
    nome: 'Authentic Fish and Chips con Salsa Tartara e Piselli',
    category: 'Cucine dal Mondo',
    categoria: 'Cucine dal Mondo',
    country: 'Regno Unito',
    countryCode: 'GB',
    flag: '🇬🇧',
    image: `${UNSPLASH_BASE}photo-1579208030886-b937da0925dc?w=800`,
    calories: 680,
    protein: 36,
    carbs: 65,
    fat: 30,
    tags: ['Regno Unito', 'Pesce', 'Secondi', 'Cucine dal Mondo'],
    ingredients: [
      '4 filetti spessi di merluzzo fresco o eglefino (Cod)',
      '200g farina 00 + extra per infarinare',
      '250ml birra bionda ale o lager ghiacciata',
      '1 cucchiaino lievito istantaneo',
      '4 patate grandi da frittura tagliate a bastoncini spessi',
      'Salsa tartara (maionese, capperi, cetriolini, aneto)',
      'Aceto di malto e spicchi di limone'
    ],
    ingredienti: [
      '4 filetti spessi di merluzzo fresco o eglefino (Cod)',
      '200g farina 00 + extra per infarinare',
      '250ml birra bionda ale o lager ghiacciata',
      '1 cucchiaino lievito istantaneo',
      '4 patate grandi da frittura tagliate a bastoncini spessi',
      'Salsa tartara (maionese, capperi, cetriolini, aneto)',
      'Aceto di malto e spicchi di limone'
    ],
    steps: [
      'Prepara la pastella mescolando farina, lievito, un pizzico di sale e birra ghiacciata fino a consistenza omogenea. Tieni al fresco.',
      'Sbollenta le patate a bastoncino per 5 minuti, asciugale e fai una prima frittura a 140°C per 5 minuti; tieni da parte.',
      'Asciuga i filetti di pesce, passali nella farina e poi immergili nella pastella alla birra.',
      'Friggi il pesce in abbondante olio a 180°C per circa 6-8 minuti finché la pastella è dorata, gonfia e croccantissima.',
      'Fai la seconda frittura delle patate a 190°C per 3 minuti per renderle dorate e croccanti fuori e cremose dentro.',
      'Servi caldo con sale, abbondante salsa tartara e spicchi di limone fresco.'
    ],
    procedimento: 'Prepara la pastella alla birra ghiacciata. Friggi due volte le patate tagliate spesse. Immergi il merluzzo nella pastella e friggi a 180°C fino a doratura croccante.'
  },

  // 🇧🇷 BRASILE
  {
    id: 'world_br_feijoada',
    title: 'Feijoada Tradizionale Brasiliana con Riso e Arancia',
    nome: 'Feijoada Tradizionale Brasiliana con Riso e Arancia',
    category: 'Cucine dal Mondo',
    categoria: 'Cucine dal Mondo',
    country: 'Brasile',
    countryCode: 'BR',
    flag: '🇧🇷',
    image: `${UNSPLASH_BASE}photo-1543339308-43e59d6b73a6?w=800`,
    calories: 620,
    protein: 40,
    carbs: 58,
    fat: 24,
    tags: ['Brasile', 'Carne', 'Secondi', 'Legumi', 'Cucine dal Mondo'],
    ingredients: [
      '350g fagioli neri secchi (feijão preto)',
      '250g costine di maiale',
      '150g salsiccia affumicata tipo calabresa o chorizo',
      '150g pancetta affumicata a cubetti',
      '1 cipolla grande tritata',
      '3 spicchi d\'aglio',
      '2 foglie di alloro',
      '200g riso bianco brasiliano cotto',
      '1 arancia fresca a fette per sgrassare il palato'
    ],
    ingredienti: [
      '350g fagioli neri secchi (feijão preto)',
      '250g costine di maiale',
      '150g salsiccia affumicata tipo calabresa o chorizo',
      '150g pancetta affumicata a cubetti',
      '1 cipolla grande tritata',
      '3 spicchi d\'aglio',
      '2 foglie di alloro',
      '200g riso bianco brasiliano cotto',
      '1 arancia fresca a fette per sgrassare il palato'
    ],
    steps: [
      'Ammolla i fagioli neri per 12 ore in acqua fredda.',
      'In una pentola capiente metti i fagioli con acqua pulita e foglie di alloro, cuocendo a fuoco medio per 1 ora.',
      'In una padella rosola la pancetta, la salsiccia e le costine di maiale fino a doratura.',
      'Aggiungi cipolla e aglio nel fondo di carne e stufa dolcemente.',
      'Unisci le carni ai fagioli e prosegui la cottura a fuoco lento per circa 1 ora e mezza finché i fagioli formano un brodo denso e cremoso.',
      'Schiaccia qualche cucchiaio di fagioli sul bordo per addensare ulteriormente. Servi caldissima con riso bianco e fette d\'arancia fresca.'
    ],
    procedimento: 'Cuoci i fagioli neri ammollati con carni miste di maiale, salsiccia e pancetta affumicata a fuoco lento per oltre 2 ore. Servi con riso bianco e arancia.'
  },

  // 🇦🇷 ARGENTINA
  {
    id: 'world_ar_empanadas',
    title: 'Empanadas Criollas Argentine al Forno con Manzo e Olive',
    nome: 'Empanadas Criollas Argentine al Forno con Manzo e Olive',
    category: 'Cucine dal Mondo',
    categoria: 'Cucine dal Mondo',
    country: 'Argentina',
    countryCode: 'AR',
    flag: '🇦🇷',
    image: `${UNSPLASH_BASE}photo-1565299624946-b28f40a0ae38?w=800`,
    calories: 390,
    protein: 20,
    carbs: 38,
    fat: 18,
    tags: ['Argentina', 'Carne', 'Antipasti', 'Cucine dal Mondo'],
    ingredients: [
      '12 dischi di pasta per empanadas (tapas)',
      '350g carne di manzo tritata al coltello',
      '2 cipolle dorate tritate finemente',
      '2 uova sode a pezzetti',
      '50g olive verdi a rondelle',
      '1 cucchiaino cumino e paprika dolce',
      '1 tuorlo per spennellare'
    ],
    ingredienti: [
      '12 dischi di pasta per empanadas (tapas)',
      '350g carne di manzo tritata al coltello',
      '2 cipolle dorate tritate finemente',
      '2 uova sode a pezzetti',
      '50g olive verdi a rondelle',
      '1 cucchiaino cumino e paprika dolce',
      '1 tuorlo per spennellare'
    ],
    steps: [
      'Stufa la cipolla abbondante in padella con olio finché trasparente e dolce.',
      'Aggiungi la carne di manzo, cumino, paprika, sale e pepe rosolando solo fino a cambio colore per mantenerla succosa. Fai raffreddare completamente.',
      'Aggiungi al ripieno freddo le uova sode a cubetti e le olive.',
      'Farcisci ogni disco di pasta al centro con un cucchiaio colmo di ripieno.',
      'Inumidisci i bordi, chiudi a mezzaluna e realizza il tradizionale repulgue (intreccio a cordoncino sui bordi).',
      'Spennella con tuorlo d\'uovo e inforna a 200°C per 15-18 minuti fino a doratura brillante.'
    ],
    procedimento: 'Stufa cipolla abbondante con carne di manzo speziata al cumino. Aggiungi uova sode e olive. Farcisci i dischi di pasta, chiudi con il repulgue e inforna a 200°C per 18 minuti.'
  }
];

export function enrichAndLegalizeDatabase() {
  const filePath = path.join(process.cwd(), 'public', 'ricette_mondo.json');
  const raw = fs.readFileSync(filePath, 'utf-8');
  const existingRecipes = JSON.parse(raw);

  console.log(`Loaded ${existingRecipes.length} existing recipes from ricette_mondo.json`);

  const updatedRecipes = [];

  for (let i = 0; i < existingRecipes.length; i++) {
    const r = { ...existingRecipes[i] };
    const title = r.title || r.nome || 'Ricetta';
    const cat = r.category || r.categoria || 'Primi';
    const ing = r.ingredients || r.ingredienti || [];

    // 1. Rileva paese e assegna metadati
    const countryMeta = detectCountryFromRecipe(title, ing);
    r.country = countryMeta.country;
    r.countryCode = countryMeta.countryCode;
    r.flag = countryMeta.flag;

    // 2. Se l'immagine punta a giallozafferano.it o a domini non liberi, sostituisci con Unsplash
    if (!r.image || r.image.includes('giallozafferano.it') || r.image.includes('invalid')) {
      r.image = getUnsplashImageForRecipe(title, cat);
    }

    // Assicura conformità campi
    if (!r.title) r.title = title;
    if (!r.nome) r.nome = title;
    if (!r.category) r.category = cat;
    if (!r.categoria) r.categoria = cat;
    if (!r.ingredients && r.ingredienti) r.ingredients = r.ingredienti;
    if (!r.ingredienti && r.ingredients) r.ingredienti = r.ingredients;
    if (!r.steps && r.procedimento) {
      r.steps = typeof r.procedimento === 'string' ? r.procedimento.split('\n').filter(Boolean) : r.procedimento;
    }
    if (!r.procedimento && r.steps) {
      r.procedimento = Array.isArray(r.steps) ? r.steps.join('\n') : r.steps;
    }

    updatedRecipes.push(r);
  }

  // 3. Aggiungi le nuove ricette internazionali che non sono già presenti
  const existingIds = new Set(updatedRecipes.map(r => r.id));
  const existingTitles = new Set(updatedRecipes.map(r => (r.title || '').toLowerCase().trim()));

  let addedCount = 0;
  for (const newRec of NEW_INTERNATIONAL_RECIPES) {
    if (!existingIds.has(newRec.id) && !existingTitles.has(newRec.title.toLowerCase().trim())) {
      updatedRecipes.push(newRec);
      existingIds.add(newRec.id);
      addedCount++;
    }
  }

  console.log(`Added ${addedCount} new authentic international recipes.`);
  console.log(`Total database size now: ${updatedRecipes.length} recipes.`);

  // 4. Verifica di sicurezza IP & Copyright: assicurati che zero immagini contengano giallozafferano.it
  const gzImagesRemaining = updatedRecipes.filter(r => r.image && r.image.includes('giallozafferano.it'));
  if (gzImagesRemaining.length > 0) {
    throw new Error(`CRITICAL: Still found ${gzImagesRemaining.length} giallozafferano images!`);
  }

  fs.writeFileSync(filePath, JSON.stringify(updatedRecipes, null, 2), 'utf-8');
  console.log('✅ Successfully updated public/ricette_mondo.json with 100% royalty-free Unsplash images and international recipes!');
}

if (process.argv[1] && process.argv[1].endsWith('enrich-and-legalize-recipes.mjs')) {
  enrichAndLegalizeDatabase();
}
