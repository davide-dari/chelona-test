import fs from 'fs';
import path from 'path';

const UNSPLASH_BASE = 'https://images.unsplash.com/';

export const ADDITIONAL_WORLD_RECIPES = [
  // 🇪🇸 SPAGNA
  {
    id: 'world_es_gazpacho',
    title: 'Gazpacho Andaluso Tradizionale con Crostini',
    nome: 'Gazpacho Andaluso Tradizionale con Crostini',
    category: 'Cucine dal Mondo',
    categoria: 'Cucine dal Mondo',
    country: 'Spagna',
    countryCode: 'ES',
    flag: '🇪🇸',
    image: `${UNSPLASH_BASE}photo-1541544741938-0af808871cc0?w=800`,
    calories: 180,
    protein: 4,
    carbs: 22,
    fat: 9,
    tags: ['Spagna', 'Gazpacho', 'Antipasti', 'Vegetariano', 'Cucine dal Mondo'],
    ingredients: [
      '1kg pomodori ramati ben maturi',
      '1 cetriolo medio sbucciato',
      '1 peperone verde dolce (tipo cornetto)',
      '1 spicchio d\'aglio privato dell\'anima',
      '50g pane raffermo ammollato in acqua e aceto',
      '50ml olio extravergine d\'oliva spagnolo',
      '20ml aceto di sherry o di vino bianco',
      'Sale fino e cubetti di ghiaccio q.b.'
    ],
    ingredienti: [
      '1kg pomodori ramati ben maturi',
      '1 cetriolo medio sbucciato',
      '1 peperone verde dolce (tipo cornetto)',
      '1 spicchio d\'aglio privato dell\'anima',
      '50g pane raffermo ammollato in acqua e aceto',
      '50ml olio extravergine d\'oliva spagnolo',
      '20ml aceto di sherry o di vino bianco',
      'Sale fino e cubetti di ghiaccio q.b.'
    ],
    steps: [
      'Lava accuratamente i pomodori e il peperone verde, sbuccia il cetriolo e taglia tutto a pezzi grossolani.',
      'Ammolla il pane raffermo con un cucchiaio d\'aceto di sherry e poca acqua.',
      'Trasferisci pomodori, peperone, cetriolo, aglio e il pane strizzato nel boccale del frullatore.',
      'Frulla alla massima velocità per 3 minuti fino a ottenere una consistenza liscia e vellutata.',
      'Aggiungi a filo l\'olio extravergine d\'oliva e il sale continuando a frullare per emulsionare.',
      'Passa il composto attraverso un colino a maglie fini per rimuovere semi e bucce.',
      'Riponi in frigorifero per almeno 2 ore e servi freschissimo con dadini di cetriolo e crostini tostati.'
    ],
    procedimento: 'Frulla pomodori maturi, cetriolo, peperone verde, aglio e pane ammollato. Emulsiona con olio extravergine d\'oliva e aceto di sherry. Filtra al colino e servi ghiacciato.'
  },
  {
    id: 'world_es_patatas_bravas',
    title: 'Patatas Bravas Tradizionali con Salsa Alioli e Salsa Brava',
    nome: 'Patatas Bravas Tradizionali con Salsa Alioli e Salsa Brava',
    category: 'Cucine dal Mondo',
    categoria: 'Cucine dal Mondo',
    country: 'Spagna',
    countryCode: 'ES',
    flag: '🇪🇸',
    image: `${UNSPLASH_BASE}photo-1546069901-ba9599a7e63c?w=800`,
    calories: 320,
    protein: 5,
    carbs: 45,
    fat: 14,
    tags: ['Spagna', 'Tapas', 'Patate', 'Antipasti', 'Cucine dal Mondo'],
    ingredients: [
      '600g patate a pasta gialla',
      '2 cucchiai salsa brava al pomodoro e paprika piccante',
      '2 cucchiai salsa alioli all\'aglio fresco',
      '1 cucchiaino paprika affumicata (pimentón de la Vera)',
      'Olio per friggere q.b.',
      'Sale fino q.b.'
    ],
    ingredienti: [
      '600g patate a pasta gialla',
      '2 cucchiai salsa brava al pomodoro e paprika piccante',
      '2 cucchiai salsa alioli all\'aglio fresco',
      '1 cucchiaino paprika affumicata (pimentón de la Vera)',
      'Olio per friggere q.b.',
      'Sale fino q.b.'
    ],
    steps: [
      'Pela le patate e tagliale a cubi irregolari di circa 3 cm.',
      'Sbollenta i cubi di patata in acqua salata per 5 minuti, poi scolali e asciugali accuratamente.',
      'Friggi le patate in olio caldo a 160°C finché tenere all\'interno, poi scolale.',
      'Alza la temperatura dell\'olio a 190°C e friggi una seconda volta per 2-3 minuti fino a renderle dorate e croccanti.',
      'Scola su carta assorbente, sala e servi subito guarnendo con salsa brava piccante e salsa alioli.'
    ],
    procedimento: 'Taglia le patate a cubi, fai una doppia frittura per massima croccantezza e servi calde con salsa brava alla paprika e alioli.'
  },
  {
    id: 'world_es_crema_catalana',
    title: 'Crema Catalana Tradizionale con Crosta Caramellata al Cannello',
    nome: 'Crema Catalana Tradizionale con Crosta Caramellata al Cannello',
    category: 'Cucine dal Mondo',
    categoria: 'Cucine dal Mondo',
    country: 'Spagna',
    countryCode: 'ES',
    flag: '🇪🇸',
    image: `${UNSPLASH_BASE}photo-1551024709-8f23befc6f87?w=800`,
    calories: 290,
    protein: 6,
    carbs: 38,
    fat: 12,
    tags: ['Spagna', 'Dolci', 'Dessert', 'Cucine dal Mondo'],
    ingredients: [
      '500ml latte intero fresco',
      '4 tuorli d\'uovo freschi',
      '100g zucchero semolato',
      '25g amido di mais (maizena)',
      'Scorza di 1 limone biologico',
      '1 stecca di cannella',
      'Zucchero di canna per caramellare la superficie'
    ],
    ingredienti: [
      '500ml latte intero fresco',
      '4 tuorli d\'uovo freschi',
      '100g zucchero semolato',
      '25g amido di mais (maizena)',
      'Scorza di 1 limone biologico',
      '1 stecca di cannella',
      'Zucchero di canna per caramellare la superficie'
    ],
    steps: [
      'Porta a bollore il latte con la scorza di limone e la stecca di cannella, poi spegni e lascia in infusione per 15 minuti.',
      'In una ciotola sbatti i tuorli con lo zucchero semolato e l\'amido di mais fino a ottenere un composto chiaro.',
      'Filtra il latte tiepido e versalo a filo sul composto di tuorli mescolando continuamente.',
      'Riporta il tutto sul fuoco dolce mescolando con una frusta fino a quando la crema si addensa.',
      'Versa la crema nelle tipiche pirofile di terracotta basse e lascia raffreddare in frigorifero per almeno 3 ore.',
      'Prima di servire cospargi con zucchero di canna e brucia con il cannello fino a formare un disco croccante di caramello.'
    ],
    procedimento: 'Cuoci latte aromatizzato a limone e cannella con tuorli, zucchero e amido fino a densità. Raffredda nelle ciotoline e caramella la superficie con zucchero di canna al cannello.'
  },

  // 🇮🇳 INDIA
  {
    id: 'world_in_curry_verdure',
    title: 'Curry di Verdure Miste e Spezie Tradizionale (Navratan Korma)',
    nome: 'Curry di Verdure Miste e Spezie Tradizionale (Navratan Korma)',
    category: 'Cucine dal Mondo',
    categoria: 'Cucine dal Mondo',
    country: 'India',
    countryCode: 'IN',
    flag: '🇮🇳',
    image: `${UNSPLASH_BASE}photo-1588166524941-3bf61a9c41db?w=800`,
    calories: 270,
    protein: 7,
    carbs: 32,
    fat: 13,
    tags: ['India', 'Curry', 'Vegetariano', 'Secondi', 'Cucine dal Mondo'],
    ingredients: [
      '1 cavolfiore piccolo diviso in cimette',
      '2 carote a rondelle',
      '150g piselli fini freschi o surgelati',
      '1 patata media a cubetti',
      '200ml latte di cocco cremoso',
      '200g polpa di pomodoro fine',
      '1 cipolla dorata tritata',
      '2 spicchi d\'aglio e 1 cucchiaino zenzero fresco grattugiato',
      '1 cucchiaino ciascuno di curcuma, cumino, coriandolo macinato e Garam Masala',
      'Coriandolo fresco tritato per guarnire'
    ],
    ingredienti: [
      '1 cavolfiore piccolo diviso in cimette',
      '2 carote a rondelle',
      '150g piselli fini freschi o surgelati',
      '1 patata media a cubetti',
      '200ml latte di cocco cremoso',
      '200g polpa di pomodoro fine',
      '1 cipolla dorata tritata',
      '2 spicchi d\'aglio e 1 cucchiaino zenzero fresco grattugiato',
      '1 cucchiaino ciascuno di curcuma, cumino, coriandolo macinato e Garam Masala',
      'Coriandolo fresco tritato per guarnire'
    ],
    steps: [
      'In una casseruola scalda due cucchiai di olio e soffriggi cipolla, aglio e zenzero per 4 minuti.',
      'Aggiungi curcuma, cumino, coriandolo macinato e tosta le spezie a fuoco vivace per 1 minuto sprigionando gli aromi.',
      'Aggiungi le patate, le carote e il cavolfiore, mescolando per insaporire tutte le verdure.',
      'Versa la polpa di pomodoro e il latte di cocco, aggiungi il sale e copri con coperchio cuocendo a fuoco lento per 20 minuti.',
      'Unisci i piselli e il Garam Masala negli ultimi 5 minuti di cottura finché la salsa è ricca e corposa.',
      'Guarnisci con foglie di coriandolo fresco e servi con riso basmati fumante.'
    ],
    procedimento: 'Rosola aglio, cipolla, zenzero e spezie indiane. Aggiungi verdure miste, pomodoro e latte di cocco. Stufa dolcemente e completa con Garam Masala e coriandolo fresco.'
  },
  {
    id: 'world_in_samosa',
    title: 'Samosa Croccanti alle Verdure e Patate Speziate con Chutney di Menta',
    nome: 'Samosa Croccanti alle Verdure e Patate Speziate con Chutney di Menta',
    category: 'Cucine dal Mondo',
    categoria: 'Cucine dal Mondo',
    country: 'India',
    countryCode: 'IN',
    flag: '🇮🇳',
    image: `${UNSPLASH_BASE}photo-1540420773420-3366772f4999?w=800`,
    calories: 260,
    protein: 6,
    carbs: 34,
    fat: 11,
    tags: ['India', 'Samosa', 'Antipasti', 'Vegetariano', 'Cucine dal Mondo'],
    ingredients: [
      '250g farina 00',
      '50ml olio o burro chiarificato (ghee)',
      '1 cucchiaino semi di cumino o ajwain',
      '300g patate lesse a cubetti',
      '100g piselli cotti',
      '1 cucchiaino Garam Masala e zenzero tritato',
      '1 peperoncino verde fresco tritato',
      'Olio per friggere q.b.'
    ],
    ingredienti: [
      '250g farina 00',
      '50ml olio o burro chiarificato (ghee)',
      '1 cucchiaino semi di cumino o ajwain',
      '300g patate lesse a cubetti',
      '100g piselli cotti',
      '1 cucchiaino Garam Masala e zenzero tritato',
      '1 peperoncino verde fresco tritato',
      'Olio per friggere q.b.'
    ],
    steps: [
      'Impasta farina, olio, sale e poca acqua fino a formare una pasta liscia e compatta. Fai riposare 20 minuti.',
      'Prepara il ripieno soffriggendo cumino, zenzero, peperoncino, patate e piselli con garam masala e sale.',
      'Stendi l\'impasto in cerchi, taglia ciascun cerchio a metà e modella un cono bagnando i bordi.',
      'Farcisci il cono con il ripieno di patate e sigilla bene la base ripiegando il bordo.',
      'Friggi i triangoli di samosa in olio a fuoco medio-basso per circa 8-10 minuti finché dorati e friabili.'
    ],
    procedimento: 'Impasta la frolla speziata con cumino. Farcisci coni di pasta con patate, piselli e spezie aromatiche e friggi fino a perfetta doratura croccante.'
  },

  // 🇺🇸 USA
  {
    id: 'world_us_pancakes_american',
    title: 'Pancakes Tradizionali Americani Soffici con Sciroppo d\'Acero',
    nome: 'Pancakes Tradizionali Americani Soffici con Sciroppo d\'Acero',
    category: 'Cucine dal Mondo',
    categoria: 'Cucine dal Mondo',
    country: 'USA',
    countryCode: 'US',
    flag: '🇺🇸',
    image: `${UNSPLASH_BASE}photo-1567620905732-2d1ec7ab7445?w=800`,
    calories: 340,
    protein: 8,
    carbs: 52,
    fat: 10,
    tags: ['USA', 'Pancakes', 'Colazione', 'Dolci', 'Cucine dal Mondo'],
    ingredients: [
      '200g farina 00',
      '250ml latte intero fresco o latticello (buttermilk)',
      '2 uova fresche medie',
      '30g burro fuso tiepido',
      '30g zucchero semolato',
      '8g lievito per dolci (mezza bustina)',
      '1 pizzico di sale e 1 cucchiaino estratto di vaniglia',
      'Sciroppo d\'acero puro canadese per servire'
    ],
    ingredienti: [
      '200g farina 00',
      '250ml latte intero fresco o latticello (buttermilk)',
      '2 uova fresche medie',
      '30g burro fuso tiepido',
      '30g zucchero semolato',
      '8g lievito per dolci (mezza bustina)',
      '1 pizzico di sale e 1 cucchiaino estratto di vaniglia',
      'Sciroppo d\'acero puro canadese per servire'
    ],
    steps: [
      'Separa i tuorli dagli albumi. Monta gli albumi a neve ferma con metà dello zucchero.',
      'In un\'altra ciotola sbatti i tuorli con il latte, il burro fuso e la vaniglia.',
      'Setaccia la farina con il lievito e il pizzico di sale e uniscila alla ciotola dei liquidi mescolando brevemente.',
      'Incorpora gli albumi montati con movimenti delicati dal basso verso l\'alto per non smontarli.',
      'Scalda una padella antiaderente unta leggermente di burro.',
      'Versa un mestolo piccolo di impasto per ciascun pancake. Quando compaiono bollicine in superficie (circa 2 minuti), gira e cuoci per 1 minuto l\'altro lato.',
      'Impila i pancake caldi e servi con abbondante sciroppo d\'acero e riccioli di burro.'
    ],
    procedimento: 'Prepara una pastella soffice montando gli albumi a parte. Cuoci i dischi in padella calda fino a doratura e servili impilati con autentico sciroppo d\'acero.'
  },
  {
    id: 'world_us_mac_cheese',
    title: 'Mac and Cheese Filante al Forno alla Newyorkese con Cheddar',
    nome: 'Mac and Cheese Filante al Forno alla Newyorkese con Cheddar',
    category: 'Cucine dal Mondo',
    categoria: 'Cucine dal Mondo',
    country: 'USA',
    countryCode: 'US',
    flag: '🇺🇸',
    image: `${UNSPLASH_BASE}photo-1551183053-bf91a1d81141?w=800`,
    calories: 520,
    protein: 22,
    carbs: 58,
    fat: 22,
    tags: ['USA', 'Pasta', 'Primi', 'Formaggio', 'Cucine dal Mondo'],
    ingredients: [
      '320g maccheroncini o gomiti rigati',
      '200g formaggio Cheddar stagionato grattugiato',
      '100g formaggio Gruyère o Fontina grattugiata',
      '500ml latte intero caldo',
      '40g burro e 40g farina 00 (per il roux)',
      '1 pizzico di noce moscata e senape in polvere',
      '30g pangrattato tostato con burro per la crosticina'
    ],
    ingredienti: [
      '320g maccheroncini o gomiti rigati',
      '200g formaggio Cheddar stagionato grattugiato',
      '100g formaggio Gruyère o Fontina grattugiata',
      '500ml latte intero caldo',
      '40g burro e 40g farina 00 (per il roux)',
      '1 pizzico di noce moscata e senape in polvere',
      '30g pangrattato tostato con burro per la crosticina'
    ],
    steps: [
      'Lessa la pasta in abbondante acqua salata scolandola molto al dente (circa 3 minuti prima del tempo).',
      'In una casseruola prepara la besciamella sciogliendo il burro con la farina e versando il latte a filo.',
      'Spegni il fuoco e unisci tre quarti del formaggio Cheddar e Gruyère mescolando finché sciolti.',
      'Condisci la pasta con la crema di formaggio e trasferiscila in una pirofila da forno imburrata.',
      'Cospargi la superficie con il restante formaggio e il pangrattato aromatizzato.',
      'Inforna a 200°C per 20 minuti finché la superficie è dorata, croccante e gorgogliante.'
    ],
    procedimento: 'Amalgama la pasta con una ricca fonduta di Cheddar stagionato e spezie. Spolvera con formaggio e pangrattato e gratina al forno fino a formare una crosticina dorata.'
  },

  // 🇫🇷 FRANCIA
  {
    id: 'world_fr_crepes_tradition',
    title: 'Crêpes Tradizionali Francesi alla Nutella e Zucchero a Velo',
    nome: 'Crêpes Tradizionali Francesi alla Nutella e Zucchero a Velo',
    category: 'Cucine dal Mondo',
    categoria: 'Cucine dal Mondo',
    country: 'Francia',
    countryCode: 'FR',
    flag: '🇫🇷',
    image: `${UNSPLASH_BASE}photo-1565958011703-44f9829ba187?w=800`,
    calories: 280,
    protein: 7,
    carbs: 38,
    fat: 11,
    tags: ['Francia', 'Crêpes', 'Dolci', 'Colazione', 'Cucine dal Mondo'],
    ingredients: [
      '250g farina 00 setacciata',
      '500ml latte intero a temperatura ambiente',
      '3 uova intere fresche',
      '40g burro fuso tiepido',
      '1 pizzico di sale e 1 cucchiaio zucchero vanigliato',
      'Nutella o confettura a scelta per farcire',
      'Zucchero a velo per guarnire'
    ],
    ingredienti: [
      '250g farina 00 setacciata',
      '500ml latte intero a temperatura ambiente',
      '3 uova intere fresche',
      '40g burro fuso tiepido',
      '1 pizzico di sale e 1 cucchiaio zucchero vanigliato',
      'Nutella o confettura a scelta per farcire',
      'Zucchero a velo per guarnire'
    ],
    steps: [
      'In una ciotola capiente sbatti le uova con un pizzico di sale e lo zucchero vanigliato.',
      'Aggiungi gradualmente la farina setacciata alternandola al latte per evitare la formazione di grumi.',
      'Unisci il burro fuso tiepido e mescola fino a ottenere una pastella fluida e vellutata.',
      'Copri con pellicola e lascia riposare a temperatura ambiente per almeno 30 minuti.',
      'Ungi leggermente una crepiera calda con burro, versa un mestolo di pastella e ruota rapidamente per coprire il fondo.',
      'Cuoci per 1 minuto finché i bordi si staccano, gira e cuoci per altri 30 secondi.',
      'Farcisci a metà con Nutella, ripiega a triangolo e spolvera con zucchero a velo.'
    ],
    procedimento: 'Prepara una pastella liscia di farina, latte e uova e falla riposare. Cuoci cialde sottilissime nella crepiera, farcisci e chiudi a fazzoletto.'
  },
  {
    id: 'world_fr_soupe_oignon',
    title: 'Soupe à l\'Oignon Tradizionale Francese Gratinata al Gruyère',
    nome: 'Soupe à l\'Oignon Tradizionale Francese Gratinata al Gruyère',
    category: 'Cucine dal Mondo',
    categoria: 'Cucine dal Mondo',
    country: 'Francia',
    countryCode: 'FR',
    flag: '🇫🇷',
    image: `${UNSPLASH_BASE}photo-1547592166-23ac45744acd?w=800`,
    calories: 340,
    protein: 14,
    carbs: 32,
    fat: 16,
    tags: ['Francia', 'Zuppa', 'Primi', 'Cucine dal Mondo'],
    ingredients: [
      '800g cipolle dorate affettate finemente',
      '40g burro e 1 cucchiaio olio d\'oliva',
      '1 cucchiaio farina 00',
      '100ml vino bianco secco',
      '1 litro brodo di manzo saporito',
      '8 fette di baguette francese tostate',
      '150g formaggio Gruyère o Comté grattugiato',
      'Foglia di alloro e timo fresco'
    ],
    ingredienti: [
      '800g cipolle dorate affettate finemente',
      '40g burro e 1 cucchiaio olio d\'oliva',
      '1 cucchiaio farina 00',
      '100ml vino bianco secco',
      '1 litro brodo di manzo saporito',
      '8 fette di baguette francese tostate',
      '150g formaggio Gruyère o Comté grattugiato',
      'Foglia di alloro e timo fresco'
    ],
    steps: [
      'In una casseruola pesante sciogli il burro con l\'olio e cuoci le cipolle a fuoco dolce per 35-40 minuti mescolando regolarmente finché profondamente caramellate e dorate.',
      'Spolvera con la farina, mescola per 2 minuti e sfuma con il vino bianco lasciando evaporare.',
      'Aggiungi il brodo di manzo caldo, il timo e l\'alloro, lasciando sobbollire a fuoco basso per altri 25 minuti.',
      'Distribuisci la zuppa calda in cocotte di ceramica adatte al forno.',
      'Adagia sopra ciascuna cocotte due fette di baguette tostata e copri generosamente con il Gruyère grattugiato.',
      'Passa sotto il grill del forno a 220°C per 6-8 minuti fino a quando il formaggio è completamente fuso e dorato con crosta bruna.'
    ],
    procedimento: 'Caramella le cipolle lentamente per 40 minuti, unisci brodo di manzo e vino bianco. Servi in ciotole con pane tostato e gratina sotto il grill con formaggio Gruyère abbondante.'
  },

  // 🇹🇭 THAILANDIA
  {
    id: 'world_th_som_tam',
    title: 'Som Tam (Insalata Tradizionale Thailandese di Papaya e Arachidi)',
    nome: 'Som Tam (Insalata Tradizionale Thailandese di Papaya e Arachidi)',
    category: 'Cucine dal Mondo',
    categoria: 'Cucine dal Mondo',
    country: 'Thailandia',
    countryCode: 'TH',
    flag: '🇹🇭',
    image: `${UNSPLASH_BASE}photo-1540420773420-3366772f4999?w=800`,
    calories: 160,
    protein: 5,
    carbs: 22,
    fat: 6,
    tags: ['Thailandia', 'Insalata', 'Antipasti', 'Piccante', 'Cucine dal Mondo'],
    ingredients: [
      '300g papaya verde (o carote fresche a julienne croccante)',
      '10 pomodorini ciliegino tagliati a metà',
      '50g fagiolini freschi spezzettati',
      '30g arachidi tostate non salate',
      '2 spicchi d\'aglio e 1-2 peperoncini Thai Bird\'s Eye',
      '2 cucchiai salsa di pesce (Nam Pla) o soia chiara',
      '2 cucchiai succo di lime fresco spremuto',
      '1 cucchiaio zucchero di palma o canna'
    ],
    ingredienti: [
      '300g papaya verde (o carote fresche a julienne croccante)',
      '10 pomodorini ciliegino tagliati a metà',
      '50g fagiolini freschi spezzettati',
      '30g arachidi tostate non salate',
      '2 spicchi d\'aglio e 1-2 peperoncini Thai Bird\'s Eye',
      '2 cucchiai salsa di pesce (Nam Pla) o soia chiara',
      '2 cucchiai succo di lime fresco spremuto',
      '1 cucchiaio zucchero di palma o canna'
    ],
    steps: [
      'In un mortaio pestare aglio e peperoncini Thai fino a sminuzzarli.',
      'Aggiungi i fagiolini crudi e pestali leggermente per romperne le fibre.',
      'Unisci succo di lime, salsa di pesce e zucchero di palma, mescolando bene per sciogliere lo zucchero.',
      'Aggiungi la papaya verde a julienne e i pomodorini pestando dolcemente e rimestando con un cucchiaio per far assorbire il condimento.',
      'Trasferisci l\'insalata sul piatto da portata, guarnisci con abbondanti arachidi tostate croccanti e servi subito.'
    ],
    procedimento: 'Pesta aglio, peperoncino, lime e salsa di pesce nel mortaio. Condisci la papaya a julienne con pomodorini e fagiolini e completa con arachidi tostate.'
  },
  {
    id: 'world_th_tom_yum',
    title: 'Tom Yum Kung (Zuppa Thailandese Piccante di Gamberi e Lemongrass)',
    nome: 'Tom Yum Kung (Zuppa Thailandese Piccante di Gamberi e Lemongrass)',
    category: 'Cucine dal Mondo',
    categoria: 'Cucine dal Mondo',
    country: 'Thailandia',
    countryCode: 'TH',
    flag: '🇹🇭',
    image: `${UNSPLASH_BASE}photo-1547592166-23ac45744acd?w=800`,
    calories: 220,
    protein: 20,
    carbs: 12,
    fat: 9,
    tags: ['Thailandia', 'Zuppa', 'Pesce', 'Gamberi', 'Piccante', 'Cucine dal Mondo'],
    ingredients: [
      '350g gamberi freschi sgusciati con codina',
      '600ml brodo aromatizzato ai crostacei o vegetale',
      '2 bastoncini di lemongrass tagliati a rondelle e pestati',
      '4 foglie di lime kaffir strappate',
      '3 fette di galanga o zenzero fresco',
      '150g funghi champignon o funghi paglia a spicchi',
      '2 cucchiai pasta di peperoncino Thai (Nam Prik Pao)',
      '2 cucchiai salsa di pesce e succo di 1 lime',
      'Coriandolo fresco per servire'
    ],
    ingredienti: [
      '350g gamberi freschi sgusciati con codina',
      '600ml brodo aromatizzato ai crostacei o vegetale',
      '2 bastoncini di lemongrass tagliati a rondelle e pestati',
      '4 foglie di lime kaffir strappate',
      '3 fette di galanga o zenzero fresco',
      '150g funghi champignon o funghi paglia a spicchi',
      '2 cucchiai pasta di peperoncino Thai (Nam Prik Pao)',
      '2 cucchiai salsa di pesce e succo di 1 lime',
      'Coriandolo fresco per servire'
    ],
    steps: [
      'Porta a bollore il brodo in una pentola con lemongrass, galanga e foglie di kaffir lime per estrarre tutti i profumi.',
      'Aggiungi i funghi a pezzi e la pasta di peperoncino Thai, cuocendo a fuoco medio per 3 minuti.',
      'Aggiungi i gamberi e cuocili per soli 2 minuti fino a quando diventano rosa e teneri.',
      'Spegni la fiamma e condisci con salsa di pesce e succo fresco di lime (il lime non va bollito per preservare freschezza).',
      'Servi nei piatti fumante guarnendo con foglie fresche di coriandolo.'
    ],
    procedimento: 'Sobbolli lemongrass, galanga e lime kaffir nel brodo. Unisci funghi, gamberi e pasta di peperoncino, completando a fuoco spento con salsa di pesce e succo di lime.'
  },

  // 🇲🇦 MAROCCO
  {
    id: 'world_ma_harira',
    title: 'Harira Tradizionale Marocchina (Zuppa di Ceci, Lenticchie e Pomodoro)',
    nome: 'Harira Tradizionale Marocchina (Zuppa di Ceci, Lenticchie e Pomodoro)',
    category: 'Cucine dal Mondo',
    categoria: 'Cucine dal Mondo',
    country: 'Marocco',
    countryCode: 'MA',
    flag: '🇲🇦',
    image: `${UNSPLASH_BASE}photo-1547592166-23ac45744acd?w=800`,
    calories: 310,
    protein: 16,
    carbs: 46,
    fat: 7,
    tags: ['Marocco', 'Zuppa', 'Legumi', 'Primi', 'Cucine dal Mondo'],
    ingredients: [
      '200g ceci lessati',
      '100g lenticchie brune o verdi',
      '150g polpa di manzo o agnello a dadini piccoli (opzionale)',
      '400g passata di pomodoro densa',
      '1 cipolla tritata e 1 costa di sedano a tocchetti',
      '1 mazzetto ciascuno di coriandolo e prezzemolo fresco tritato',
      '1 cucchiaino zenzero in polvere, curcuma e cannella',
      '50g vermicelli o spaghettini spezzati',
      'Spicchi di limone e datteri per servire'
    ],
    ingredienti: [
      '200g ceci lessati',
      '100g lenticchie brune o verdi',
      '150g polpa di manzo o agnello a dadini piccoli (opzionale)',
      '400g passata di pomodoro densa',
      '1 cipolla tritata e 1 costa di sedano a tocchetti',
      '1 mazzetto ciascuno di coriandolo e prezzemolo fresco tritato',
      '1 cucchiaino zenzero in polvere, curcuma e cannella',
      '50g vermicelli o spaghettini spezzati',
      'Spicchi di limone e datteri per servire'
    ],
    steps: [
      'In una casseruola capiente rosola la cipolla, il sedano e la carne con le erbe aromatiche e le spezie.',
      'Aggiungi la passata di pomodoro, le lenticchie e 1 litro d\'acqua calda. Porta a bollore e cuoci per 30 minuti.',
      'Unisci i ceci cotti e fai sobbollire per altri 10 minuti per amalgamare i sapori.',
      'Aggiungi i vermicelli spezzati cuocendo per 4 minuti fino a cottura.',
      'Se desideri una consistenza più vellutata sciogli un cucchiaio di farina in mezzo bicchiere d\'acqua e aggiungilo alla zuppa mescolando.',
      'Servi caldissima accompagnata da spicchi di limone da spremere al momento e datteri dolci.'
    ],
    procedimento: 'Stufa cipolla, sedano e spezie marocchine con pomodoro e lenticchie. Aggiungi ceci cotti e vermicelli, servendo fumante con limone fresco e datteri.'
  },
  {
    id: 'world_ma_pastilla',
    title: 'Pastilla Tradizionale Marocchina di Pollo e Mandorle Speziate',
    nome: 'Pastilla Tradizionale Marocchina di Pollo e Mandorle Speziate',
    category: 'Cucine dal Mondo',
    categoria: 'Cucine dal Mondo',
    country: 'Marocco',
    countryCode: 'MA',
    flag: '🇲🇦',
    image: `${UNSPLASH_BASE}photo-1598515214211-89d3c73ae83b?w=800`,
    calories: 430,
    protein: 26,
    carbs: 38,
    fat: 20,
    tags: ['Marocco', 'Pollo', 'Secondi', 'Cucine dal Mondo'],
    ingredients: [
      '500g cosce di pollo disossate a tocchetti',
      '8 fogli di pasta fillo o warka',
      '3 cipolle dorate tritate',
      '3 uova fresche sbattute',
      '100g mandorle tostate e tritate con un pizzico di cannella',
      '1 bustina zafferano, 1 cucchiaino zenzero e cannella',
      '50g burro fuso per spennellare',
      'Zucchero a velo e cannella per decorare la superficie'
    ],
    ingredienti: [
      '500g cosce di pollo disossate a tocchetti',
      '8 fogli di pasta fillo o warka',
      '3 cipolle dorate tritate',
      '3 uova fresche sbattute',
      '100g mandorle tostate e tritate con un pizzico di cannella',
      '1 bustina zafferano, 1 cucchiaino zenzero e cannella',
      '50g burro fuso per spennellare',
      'Zucchero a velo e cannella per decorare la superficie'
    ],
    steps: [
      'Stufa il pollo con le cipolle, burro, zafferano, zenzero e cannella con un bicchiere d\'acqua per 25 minuti.',
      'Sfilaccia il pollo cotto. Nel fondo di cottura delle cipolle versa le uova sbattute mescolando fino a formare una crema asciutta.',
      'In una teglia rotonda disponi i fogli di pasta fillo sovrapposti spennellandoli generosamente di burro fuso.',
      'Crea gli strati alternando il pollo sfilacciato, la crema di uova e cipolle e le mandorle tritate alla cannella.',
      'Chiudi i fogli di fillo verso il centro sigillando con un ultimo foglio imburrato.',
      'Inforna a 190°C per 25 minuti finché la crosta è dorata e croccante.',
      'Spolvera la superficie con linee di zucchero a velo e cannella prima di servire a fette.'
    ],
    procedimento: 'Stufa pollo speziato con cipolle e zafferano. Stratifica in crosta di pasta fillo con crema di uova e mandorle croccanti alla cannella e inforna fino a doratura.'
  },

  // 🇨🇳 CINA
  {
    id: 'world_cn_pollo_mandorle',
    title: 'Pollo alle Mandorle Tradizionale Cinese con Salsa di Soia e Zenzero',
    nome: 'Pollo alle Mandorle Tradizionale Cinese con Salsa di Soia e Zenzero',
    category: 'Cucine dal Mondo',
    categoria: 'Cucine dal Mondo',
    country: 'Cina',
    countryCode: 'CN',
    flag: '🇨🇳',
    image: `${UNSPLASH_BASE}photo-1598515214211-89d3c73ae83b?w=800`,
    calories: 360,
    protein: 32,
    carbs: 14,
    fat: 19,
    tags: ['Cina', 'Pollo', 'Secondi', 'Mandorle', 'Cucine dal Mondo'],
    ingredients: [
      '500g petto di pollo tagliato a bocconcini',
      '80g mandorle pelate tostate',
      '1 cipolla bianca tagliata a petali',
      '2 cucchiai salsa di soia scura e 1 cucchiaio salsa di soia chiara',
      '1 cucchiaio fecola di patate o amido di mais',
      '1 cucchiaio zenzero fresco grattugiato',
      '150ml brodo vegetale o di pollo',
      '2 cucchiai olio di semi per il wok'
    ],
    ingredienti: [
      '500g petto di pollo tagliato a bocconcini',
      '80g mandorle pelate tostate',
      '1 cipolla bianca tagliata a petali',
      '2 cucchiai salsa di soia scura e 1 cucchiaio salsa di soia chiara',
      '1 cucchiaio fecola di patate o amido di mais',
      '1 cucchiaio zenzero fresco grattugiato',
      '150ml brodo vegetale o di pollo',
      '2 cucchiai olio di semi per il wok'
    ],
    steps: [
      'Passa i bocconcini di pollo nella fecola di patate scuotendo l\'eccesso.',
      'Tosta le mandorle a secco in padella per 3 minuti finché dorate e fragranti.',
      'Scalda l\'olio nel wok a fiamma vivace e salta il pollo per 4-5 minuti fino a renderlo dorato su tutti i lati.',
      'Aggiungi la cipolla e lo zenzero grattugiato continuando a saltare per 2 minuti.',
      'Versa la salsa di soia e il brodo caldo, lasciando addensare il fondo per 3 minuti fino a ottenere una glassa lucida.',
      'Aggiungi le mandorle tostate, salta il tutto per un minuto e servi caldo con riso al vapore.'
    ],
    procedimento: 'Infina il pollo nell\'amido, saltalo nel wok vivace con cipolla e zenzero. Sfuma con soia e brodo creando una salsa vellutata e unisci mandorle tostate.'
  },
  {
    id: 'world_cn_involtini_primavera',
    title: 'Involtini Primavera Croccanti alle Verdure con Salsa Agrodolce',
    nome: 'Involtini Primavera Croccanti alle Verdure con Salsa Agrodolce',
    category: 'Cucine dal Mondo',
    categoria: 'Cucine dal Mondo',
    country: 'Cina',
    countryCode: 'CN',
    flag: '🇨🇳',
    image: `${UNSPLASH_BASE}photo-1496116218417-1a781b1c416c?w=800`,
    calories: 210,
    protein: 5,
    carbs: 26,
    fat: 9,
    tags: ['Cina', 'Antipasti', 'Vegetariano', 'Cucine dal Mondo'],
    ingredients: [
      '8 fogli di pasta per involtini primavera (spring roll wrappers)',
      '200g cavolo cappuccio o verza a listarelle sottili',
      '2 carote medie a julienne',
      '1 cipollotto fresco affettato',
      '50g germogli di soia freschi',
      '2 cucchiai salsa di soia e 1 cucchiaio olio di sesamo',
      'Olio per friggere o spennellare q.b.',
      'Salsa agrodolce cinese per servire'
    ],
    ingredienti: [
      '8 fogli di pasta per involtini primavera (spring roll wrappers)',
      '200g cavolo cappuccio o verza a listarelle sottili',
      '2 carote medie a julienne',
      '1 cipollotto fresco affettato',
      '50g germogli di soia freschi',
      '2 cucchiai salsa di soia e 1 cucchiaio olio di sesamo',
      'Olio per friggere o spennellare q.b.',
      'Salsa agrodolce cinese per servire'
    ],
    steps: [
      'Salta a fuoco vivace nel wok il cavolo, le carote, il cipollotto e i germogli di soia per soli 3 minuti con soia e olio di sesamo, mantenendoli croccanti. Fai raffreddare.',
      'Disponi un foglio di pasta a rombo, metti due cucchiai di ripieno nel terzo inferiore.',
      'Ripiega l\'angolo inferiore sul ripieno, ripiega verso l\'interno i due angoli laterali e arrotola stretto verso l\'alto.',
      'Spennella la punta finale con poca acqua e amido per sigillare l\'involtino.',
      'Friggi in olio caldo a 180°C per 4 minuti fino a doratura uniforme e croccantezza.',
      'Scola su carta assorbente e servi caldissimi con salsa agrodolce.'
    ],
    procedimento: 'Salta le verdure croccanti nel wok con salsa di soia. Avvolgi nei fogli di pasta sigillando bene e friggi fino a perfetta doratura fragrante.'
  },

  // 🇱🇧 LIBANO
  {
    id: 'world_lb_baba_ganoush',
    title: 'Baba Ganoush (Crema Libanese di Melanzane Affumicate e Sesamo)',
    nome: 'Baba Ganoush (Crema Libanese di Melanzane Affumicate e Sesamo)',
    category: 'Cucine dal Mondo',
    categoria: 'Cucine dal Mondo',
    country: 'Libano',
    countryCode: 'LB',
    flag: '🇱🇧',
    image: `${UNSPLASH_BASE}photo-1577906096429-f73c2c312435?w=800`,
    calories: 190,
    protein: 5,
    carbs: 16,
    fat: 12,
    tags: ['Libano', 'Antipasti', 'Melanzane', 'Vegetariano', 'Cucine dal Mondo'],
    ingredients: [
      '2 melanzane tonde grandi (circa 800g)',
      '3 cucchiai pasta tahina di sesamo',
      'Succo di 1 limone fresco spremuto',
      '2 spicchi d\'aglio schiacciati',
      '3 cucchiai olio extravergine d\'oliva',
      'Chicchi di melograno e prezzemolo fresco per guarnire',
      '1 cucchiaino sale fino e un pizzico di cumino'
    ],
    ingredienti: [
      '2 melanzane tonde grandi (circa 800g)',
      '3 cucchiai pasta tahina di sesamo',
      'Succo di 1 limone fresco spremuto',
      '2 spicchi d\'aglio schiacciati',
      '3 cucchiai olio extravergine d\'oliva',
      'Chicchi di melograno e prezzemolo fresco per guarnire',
      '1 cucchiaino sale fino e un pizzico di cumino'
    ],
    steps: [
      'Buca le melanzane con una forchetta e infornale intere a 220°C per 45 minuti finché la buccia è raggrinzita e la polpa morbidissima.',
      'Taglia le melanzane a metà e preleva la polpa con un cucchiaio scolandola in un colino per 15 minuti per eliminare l\'acqua amara.',
      'In una ciotola schiaccia la polpa con una forchetta (per mantenere una piacevole texture rustica).',
      'Unisci la tahina, il succo di limone, l\'aglio schiacciato, il sale e l\'olio.',
      'Mescola energicamente fino a ottenere una crema densa e omogenea.',
      'Impiatta stendendo la crema a spirale, versa un filo d\'olio evo e decora con chicchi di melograno e prezzemolo.'
    ],
    procedimento: 'Cuoci le melanzane intere al forno fino ad affumicatura. Schiaccia la polpa scolata e mescola con tahina, aglio, limone e olio evo, guarnendo con melograno fresco.'
  },
  {
    id: 'world_lb_tabbouleh',
    title: 'Tabbouleh Libanese Tradizionale al Prezzemolo, Menta e Bulgur',
    nome: 'Tabbouleh Libanese Tradizionale al Prezzemolo, Menta e Bulgur',
    category: 'Cucine dal Mondo',
    categoria: 'Cucine dal Mondo',
    country: 'Libano',
    countryCode: 'LB',
    flag: '🇱🇧',
    image: `${UNSPLASH_BASE}photo-1540420773420-3366772f4999?w=800`,
    calories: 180,
    protein: 4,
    carbs: 24,
    fat: 8,
    tags: ['Libano', 'Insalata', 'Antipasti', 'Vegetariano', 'Cucine dal Mondo'],
    ingredients: [
      '3 mazzetti grandi di prezzemolo fresco liscio',
      '1 mazzetto di menta fresca',
      '50g bulgur fine',
      '3 pomodori maturi sodi a cubetti piccolissimi',
      '3 cipollotti freschi tritati finemente',
      '60ml olio extravergine d\'oliva',
      'Succo di 2 limoni freschi',
      'Sale fino e un pizzico di cannella/pimento'
    ],
    ingredienti: [
      '3 mazzetti grandi di prezzemolo fresco liscio',
      '1 mazzetto di menta fresca',
      '50g bulgur fine',
      '3 pomodori maturi sodi a cubetti piccolissimi',
      '3 cipollotti freschi tritati finemente',
      '60ml olio extravergine d\'oliva',
      'Succo di 2 limoni freschi',
      'Sale fino e un pizzico di cannella/pimento'
    ],
    steps: [
      'Ammolla il bulgur fine nel succo di limone per 20 minuti finché si ammorbidisce assorbendo l\'acidità.',
      'Lava e asciuga perfettamente il prezzemolo e la menta con una centrifuga (devono essere completamente asciutti).',
      'Trita finissimamente a coltello le erbe senza pestarle per non far uscire i succhi.',
      'Taglia i pomodori e i cipollotti a cubetti minuscoli.',
      'Unisci le erbe tritate, il bulgur ammollato, i pomodori e i cipollotti in una ciotola capiente.',
      'Condisci con abbondante olio extravergine d\'oliva e sale, mescola delicatamente e servi con foglie di lattuga fresca.'
    ],
    procedimento: 'Ammolla il bulgur nel limone. Trita a mano prezzemolo freschissimo e menta con pomodori a cubetti fini. Condisci con olio evo generoso e servi con foglie di lattuga.'
  },

  // 🇰🇷 COREA DEL SUD
  {
    id: 'world_kr_bibimbap',
    title: 'Bibimbap Tradizionale Coreano con Riso, Verdure, Uovo e Salsa Gochujang',
    nome: 'Bibimbap Tradizionale Coreano con Riso, Verdure, Uovo e Salsa Gochujang',
    category: 'Cucine dal Mondo',
    categoria: 'Cucine dal Mondo',
    country: 'Corea del Sud',
    countryCode: 'KR',
    flag: '🇰🇷',
    image: `${UNSPLASH_BASE}photo-1553163147-622ab57be1c7?w=800`,
    calories: 460,
    protein: 20,
    carbs: 64,
    fat: 14,
    tags: ['Corea del Sud', 'Bibimbap', 'Riso', 'Primi', 'Cucine dal Mondo'],
    ingredients: [
      '300g riso a chicco corto cotto al vapore',
      '150g carne di manzo a listarelle marinata con soia e olio di sesamo',
      '1 carota a julienne saltata',
      '1 zucchina a mezzaluna saltata',
      '100g spinaci sbollentati e conditi con sesamo',
      '100g germogli di soia sbollentati',
      '2 uova fresche con tuorlo morbido',
      '2 cucchiai salsa piccante Gochujang',
      'Semi di sesamo tostati e olio di sesamo'
    ],
    ingredienti: [
      '300g riso a chicco corto cotto al vapore',
      '150g carne di manzo a listarelle marinata con soia e olio di sesamo',
      '1 carota a julienne saltata',
      '1 zucchina a mezzaluna saltata',
      '100g spinaci sbollentati e conditi con sesamo',
      '100g germogli di soia sbollentati',
      '2 uova fresche con tuorlo morbido',
      '2 cucchiai salsa piccante Gochujang',
      'Semi di sesamo tostati e olio di sesamo'
    ],
    steps: [
      'Cuoci il riso a chicco corto al vapore e tienilo caldo.',
      'Salta separatamente in padella le carote, le zucchine, gli spinaci e i germogli di soia con poche gocce di olio di sesamo.',
      'Salta il manzo marinato a fuoco vivo per 3 minuti.',
      'In una ciotola capiente (o ciotola di pietra calda Dolsot) adagia il riso al centro.',
      'Disponi tutte le verdure e la carne a raggiera sopra il riso creando uno spettacolare contrasto cromatico.',
      'Posiziona al centro un uovo fritto all\'occhio di bue o tuorlo fresco, un cucchiaio di salsa Gochujang e semi di sesamo.',
      'Mescola energicamente tutto prima di gustare amalgamando sapori caldi e piccanti.'
    ],
    procedimento: 'Disponi su una base di riso caldo verdure colorate saltate, carne di manzo marinata e uovo al tegamino. Condisci con salsa fermentata Gochujang e mescola tutto prima di mangiare.'
  },
  {
    id: 'world_kr_kimchi_rice',
    title: 'Kimchi Bokkeumbap (Riso Saltato Tradizionale con Kimchi Coreano)',
    nome: 'Kimchi Bokkeumbap (Riso Saltato Tradizionale con Kimchi Coreano)',
    category: 'Cucine dal Mondo',
    categoria: 'Cucine dal Mondo',
    country: 'Corea del Sud',
    countryCode: 'KR',
    flag: '🇰🇷',
    image: `${UNSPLASH_BASE}photo-1603133872878-684f208fb84b?w=800`,
    calories: 390,
    protein: 12,
    carbs: 62,
    fat: 10,
    tags: ['Corea del Sud', 'Kimchi', 'Riso', 'Primi', 'Piccante', 'Cucine dal Mondo'],
    ingredients: [
      '300g riso cotto raffreddato (del giorno prima)',
      '150g Kimchi fermentato coreano sminuzzato',
      '2 cucchiai succo di kimchi',
      '1 cipollotto a rondelle',
      '1 cucchiaio salsa di soia e 1 cucchiaio olio di sesamo',
      '1 uovo fritto all\'occhio di bue',
      'Striscioline di alga Nori tostata e semi di sesamo per guarnire'
    ],
    ingredienti: [
      '300g riso cotto raffreddato (del giorno prima)',
      '150g Kimchi fermentato coreano sminuzzato',
      '2 cucchiai succo di kimchi',
      '1 cipollotto a rondelle',
      '1 cucchiaio salsa di soia e 1 cucchiaio olio di sesamo',
      '1 uovo fritto all\'occhio di bue',
      'Striscioline di alga Nori tostata e semi di sesamo per guarnire'
    ],
    steps: [
      'In una padella antiaderente o wok scalda un filo d\'olio e salta il kimchi con il cipollotto per 3 minuti fino a renderlo aromatico.',
      'Aggiungi il riso freddo sgranandolo con il cucchiaio di legno.',
      'Versa il succo di kimchi e la salsa di soia, saltando a fiamma viva per 4 minuti fino a quando il riso è uniformemente arancione e leggermente tostato alla base.',
      'Spegni il fuoco e manteca con l\'olio di sesamo tostato.',
      'Servi nella ciotola coprendo con l\'uovo fritto, fili di alga nori e semi di sesamo.'
    ],
    procedimento: 'Salta kimchi fermentato e cipollotto in padella, aggiungi riso del giorno prima e succo di kimchi. Completa con olio di sesamo, uovo all\'occhio di bue e alga nori croccante.'
  },

  // 🇹🇷 TURCHIA
  {
    id: 'world_tr_shish_kebab',
    title: 'Shish Kebab Tradizionale Turco con Carne Speziata e Verdure Grigliate',
    nome: 'Shish Kebab Tradizionale Turco con Carne Speziata e Verdure Grigliate',
    category: 'Cucine dal Mondo',
    categoria: 'Cucine dal Mondo',
    country: 'Turchia',
    countryCode: 'TR',
    flag: '🇹🇷',
    image: `${UNSPLASH_BASE}photo-1555939594-58d7cb561ad1?w=800`,
    calories: 410,
    protein: 36,
    carbs: 12,
    fat: 24,
    tags: ['Turchia', 'Kebab', 'Carne', 'Secondi', 'Cucine dal Mondo'],
    ingredients: [
      '500g carne di manzo o agnello a cubi di 3cm',
      '1 vasetto yogurt greco per la marinatura',
      '2 cucchiai olio d\'oliva e succo di mezzo limone',
      '2 spicchi d\'aglio tritati',
      '1 cucchiaino cumino, coriandolo, origano e paprika dolce',
      '1 peperone rosso e 1 cipolla rossa a quarti per gli spiedini',
      'Pane pita caldo e cipolle al sommacco per servire'
    ],
    ingredienti: [
      '500g carne di manzo o agnello a cubi di 3cm',
      '1 vasetto yogurt greco per la marinatura',
      '2 cucchiai olio d\'oliva e succo di mezzo limone',
      '2 spicchi d\'aglio tritati',
      '1 cucchiaino cumino, coriandolo, origano e paprika dolce',
      '1 peperone rosso e 1 cipolla rossa a quarti per gli spiedini',
      'Pane pita caldo e cipolle al sommacco per servire'
    ],
    steps: [
      'Prepara la marinata mescolando yogurt greco, olio, succo di limone, aglio e spezie.',
      'Immergi i bocconcini di carne nella marinata, copri e lascia riposare in frigorifero per almeno 4 ore.',
      'Infilza la carne marinata sugli spiedi alternandola con pezzi di cipolla e peperone.',
      'Cuoci su una griglia o bistecchiera rovente per circa 10-12 minuti girando su tutti i lati fino a perfetta doratura con striature scure.',
      'Servi caldissimo su pane pita morbido accompagnato da cipolle crude condite con polvere di sommacco (sumac).'
    ],
    procedimento: 'Marina bocconcini di carne in yogurt greco, aglio e spezie turche per 4 ore. Componi gli spiedini con peperoni e cipolle e griglia al sangue con pane pita.'
  },
  {
    id: 'world_tr_baklava',
    title: 'Baklava al Pistacchio Tradizionale Turca con Miele e Sciroppo di Zucchero',
    nome: 'Baklava al Pistacchio Tradizionale Turca con Miele e Sciroppo di Zucchero',
    category: 'Cucine dal Mondo',
    categoria: 'Cucine dal Mondo',
    country: 'Turchia',
    countryCode: 'TR',
    flag: '🇹🇷',
    image: `${UNSPLASH_BASE}photo-1551024709-8f23befc6f87?w=800`,
    calories: 380,
    protein: 7,
    carbs: 48,
    fat: 19,
    tags: ['Turchia', 'Dolci', 'Dessert', 'Pistacchio', 'Cucine dal Mondo'],
    ingredients: [
      '16 fogli di pasta fillo sottilissima',
      '200g pistacchi non salati tritati finemente',
      '150g burro chiarificato fuso per spennellare',
      '200g zucchero e 150ml acqua per lo sciroppo',
      '2 cucchiai miele millefiori e 1 cucchiaio succo di limone',
      '1 cucchiaio acqua di fiori d\'arancio (opzionale)'
    ],
    ingredienti: [
      '16 fogli di pasta fillo sottilissima',
      '200g pistacchi non salati tritati finemente',
      '150g burro chiarificato fuso per spennellare',
      '200g zucchero e 150ml acqua per lo sciroppo',
      '2 cucchiai miele millefiori e 1 cucchiaio succo di limone',
      '1 cucchiaio acqua di fiori d\'arancio (opzionale)'
    ],
    steps: [
      'Prepara lo sciroppo facendo bollire acqua, zucchero, miele e succo di limone per 10 minuti, poi lascialo raffreddare completamente.',
      'In una teglia rettangolare sovrapponi 8 fogli di pasta fillo spennellando accuratamente ogni singolo foglio con burro fuso chiarificato.',
      'Distribuisci uniformemente i pistacchi tritati sulla superficie.',
      'Copri con gli altri 8 fogli di pasta fillo, continuando a imburrare ogni foglio.',
      'Con un coltello affilato taglia la baklava prima della cottura incidendo rombi o quadrati regolari.',
      'Inforna a 170°C per 40-45 minuti fino a quando la superficie è dorata e croccantissima.',
      'Versa subito lo sciroppo freddo sulla baklava appena sfornata bollente (lo shock termico garantisce croccantezza senza renderla molliccia).',
      'Fai riposare almeno 4 ore prima di servire.'
    ],
    procedimento: 'Stratifica fogli di pasta fillo imburrati con granella di pistacchi. Taglia a rombi e inforna a 170°C. Bagna la baklava bollente con sciroppo freddo al miele.'
  },

  // 🇻🇳 VIETNAM
  {
    id: 'world_vn_pho',
    title: 'Zuppa Pho Bo Tradizionale Vietnamita con Manzo, Tagliolini e Anice Stellato',
    nome: 'Zuppa Pho Bo Tradizionale Vietnamita con Manzo, Tagliolini e Anice Stellato',
    category: 'Cucine dal Mondo',
    categoria: 'Cucine dal Mondo',
    country: 'Vietnam',
    countryCode: 'VN',
    flag: '🇻🇳',
    image: `${UNSPLASH_BASE}photo-1569718212165-3a8278d5f624?w=800`,
    calories: 380,
    protein: 28,
    carbs: 48,
    fat: 9,
    tags: ['Vietnam', 'Pho', 'Zuppa', 'Manzo', 'Primi', 'Cucine dal Mondo'],
    ingredients: [
      '200g tagliolini piatti di riso per Pho',
      '250g filetto di manzo a fettine sottilissime (tagliate a freddo)',
      '1 litro brodo di manzo chiarificato ricco e aromatico',
      '2 stelle di anice stellato e 1 stecca di cannella tostate',
      '1 pezzetto di zenzero fresco tostato a fiamma viva',
      '100g germogli di soia freschi',
      'Cipollotto, peperoncino fresco a rondelle, coriandolo e menta',
      'Spicchi di lime e salsa Sriracha per condire'
    ],
    ingredienti: [
      '200g tagliolini piatti di riso per Pho',
      '250g filetto di manzo a fettine sottilissime (tagliate a freddo)',
      '1 litro brodo di manzo chiarificato ricco e aromatico',
      '2 stelle di anice stellato e 1 stecca di cannella tostate',
      '1 pezzetto di zenzero fresco tostato a fiamma viva',
      '100g germogli di soia freschi',
      'Cipollotto, peperoncino fresco a rondelle, coriandolo e menta',
      'Spicchi di lime e salsa Sriracha per condire'
    ],
    steps: [
      'Tosta in padella l\'anice stellato, la cannella e lo zenzero, poi aggiungili al brodo di manzo e lascia sobbollire per 30 minuti filtrando il tutto.',
      'Cuoci i tagliolini di riso in acqua bollente per 3 minuti, scolali e distribuiscili nelle ciotole.',
      'Disponi sui tagliolini le fettine crude sottilissime di filetto di manzo e il cipollotto affettato.',
      'Versa il brodo bollentissimo direttamente sopra la carne: il calore cuocerà all\'istante il manzo mantenendolo morbido e rosato.',
      'Aggiungi i germogli di soia, il coriandolo fresco, la menta e servi con spicchi di lime e peperoncino.'
    ],
    procedimento: 'Profuma il brodo di manzo con anice stellato, cannella e zenzero tostato. Versa il brodo bollente sui tagliolini di riso e manzo crudo a velo che cuoce all\'istante.'
  },

  // 🇬🇧 REGNO UNITO
  {
    id: 'world_uk_fish_chips',
    title: 'Fish and Chips Tradizionale Britannico con Salsa Tartara e Pastella alla Birra',
    nome: 'Fish and Chips Tradizionale Britannico con Salsa Tartara e Pastella alla Birra',
    category: 'Cucine dal Mondo',
    categoria: 'Cucine dal Mondo',
    country: 'Regno Unito',
    countryCode: 'GB',
    flag: '🇬🇧',
    image: `${UNSPLASH_BASE}photo-1519708227418-c8fd9a32b7a2?w=800`,
    calories: 580,
    protein: 34,
    carbs: 56,
    fat: 24,
    tags: ['Regno Unito', 'Pesce', 'Secondi', 'Cucine dal Mondo'],
    ingredients: [
      '500g filetti di merluzzo fresco o eglefino senza pelle',
      '150g farina 00 e 50g maizena',
      '200ml birra chiara o ale freddissima gassata',
      '1 cucchiaino lievito istantaneo e 1 pizzico di sale',
      '4 patate grandi tagliate a bastoncini spessi',
      'Olio per friggere q.b.',
      'Salsa tartara e spicchi di limone per servire'
    ],
    ingredienti: [
      '500g filetti di merluzzo fresco o eglefino senza pelle',
      '150g farina 00 e 50g maizena',
      '200ml birra chiara o ale freddissima gassata',
      '1 cucchiaino lievito istantaneo e 1 pizzico di sale',
      '4 patate grandi tagliate a bastoncini spessi',
      'Olio per friggere q.b.',
      'Salsa tartara e spicchi di limone per servire'
    ],
    steps: [
      'Prepara la pastella mescolando farina, amido, lievito e versando la birra ghiacciata fino a ottenere una pastella liscia.',
      'Friggi le patate una prima volta a 150°C per 6 minuti finché tenere, poi scolale.',
      'Asciuga i filetti di merluzzo, passali in poca farina e immergili completamente nella pastella alla birra.',
      'Tuffa il pesce nell\'olio a 185°C e friggi per circa 5-6 minuti fino a pastella gonfia, dorata e croccantissima.',
      'Friggi nuovamente le patate a 190°C per 2 minuti per renderle super croccanti.',
      'Servi caldo avvolto tradizionalmente con salsa tartara, piselli e sale al malto.'
    ],
    procedimento: 'Immergi i filetti di merluzzo in pastella ghiacciata alla birra e friggi fino a croccantezza dorata. Accompagna con patatine spesse a doppia cottura e salsa tartara.'
  },

  // 🇩🇪 GERMANIA
  {
    id: 'world_de_bratwurst',
    title: 'Bratwurst Tradizionale Tedesco con Crauti Caldi e Senape Dolce Bavarese',
    nome: 'Bratwurst Tradizionale Tedesco con Crauti Caldi e Senape Dolce Bavarese',
    category: 'Cucine dal Mondo',
    categoria: 'Cucine dal Mondo',
    country: 'Germania',
    countryCode: 'DE',
    flag: '🇩🇪',
    image: `${UNSPLASH_BASE}photo-1529193591184-b1d58069ecdd?w=800`,
    calories: 460,
    protein: 22,
    carbs: 18,
    fat: 34,
    tags: ['Germania', 'Carne', 'Secondi', 'Cucine dal Mondo'],
    ingredients: [
      '4 salsicce bratwurst tradizionali tedesche',
      '400g crauti fermentati (Sauerkraut) scolati',
      '1 cipolla bianca tritata e 1 cucchiaio burro',
      '1 mela sbucciata e grattugiata',
      '1 cucchiaino bacche di ginepro e semi di cumino',
      '100ml birra chiara tedesca o brodo',
      'Senape dolce bavarese e bretzel per servire'
    ],
    ingredienti: [
      '4 salsicce bratwurst tradizionali tedesche',
      '400g crauti fermentati (Sauerkraut) scolati',
      '1 cipolla bianca tritata e 1 cucchiaio burro',
      '1 mela sbucciata e grattugiata',
      '1 cucchiaino bacche di ginepro e semi di cumino',
      '100ml birra chiara tedesca o brodo',
      'Senape dolce bavarese e bretzel per servire'
    ],
    steps: [
      'In una casseruola rosola la cipolla nel burro con le bacche di ginepro e il cumino.',
      'Aggiungi i crauti e la mela grattugiata, sfuma con la birra e cuoci coperto a fuoco dolce per 25 minuti.',
      'Incidi leggermente i bratwurst in superficie con tagli trasversali.',
      'Griglia le salsicce su piastra rovente per circa 8-10 minuti girandole regolarmente fino a doratura uniforme.',
      'Servi i bratwurst caldi sopra il letto di crauti fumanti con senape dolce bavarese e bretzel fragrante.'
    ],
    procedimento: 'Stufa i crauti con mela, ginepro e birra. Griglia i bratwurst fino a doratura e servili caldi con autentica senape bavarese e bretzel.'
  },

  // 🇧🇷 BRASILE
  {
    id: 'world_br_feijoada',
    title: 'Feijoada Tradizionale Brasiliana con Fagioli Neri, Carne e Riso al Vapore',
    nome: 'Feijoada Tradizionale Brasiliana con Fagioli Neri, Carne e Riso al Vapore',
    category: 'Cucine dal Mondo',
    categoria: 'Cucine dal Mondo',
    country: 'Brasile',
    countryCode: 'BR',
    flag: '🇧🇷',
    image: `${UNSPLASH_BASE}photo-1544025162-d76694265947?w=800`,
    calories: 520,
    protein: 34,
    carbs: 48,
    fat: 22,
    tags: ['Brasile', 'Carne', 'Legumi', 'Secondi', 'Cucine dal Mondo'],
    ingredients: [
      '400g fagioli neri secchi ammollati per 12 ore',
      '200g costine di maiale a pezzetti',
      '150g salsiccia affumicata (tipo calabresa o chorizo)',
      '100g pancetta o bacon a dadini',
      '1 cipolla grande tritata e 4 spicchi d\'aglio',
      '2 foglie d\'alloro',
      'Fette d\'arancia fresca, riso bianco e farofa per servire'
    ],
    ingredienti: [
      '400g fagioli neri secchi ammollati per 12 ore',
      '200g costine di maiale a pezzetti',
      '150g salsiccia affumicata (tipo calabresa o chorizo)',
      '100g pancetta o bacon a dadini',
      '1 cipolla grande tritata e 4 spicchi d\'aglio',
      '2 foglie d\'alloro',
      'Fette d\'arancia fresca, riso bianco e farofa per servire'
    ],
    steps: [
      'Lessa i fagioli neri in abbondante acqua con le foglie d\'alloro per 40 minuti.',
      'In una padella a parte rosola la pancetta, le costine di maiale e la salsiccia a fette fino a renderle ben dorate.',
      'Aggiungi la cipolla e l\'aglio tritati facendo soffriggere nel grasso delle carni.',
      'Unisci le carni e il soffritto nella pentola dei fagioli neri, mescola bene e lascia sobbollire a fuoco dolce per 45 minuti fino a quando il brodo è denso e cremoso.',
      'Preleva due mestoli di fagioli, schiacciali con la forchetta e riversali nella pentola per rendere lo stufato irresistibilmente vellutato.',
      'Servi caldissima con riso bianco al vapore, farina di manioca tostata (farofa) e fettine d\'arancia fresca.'
    ],
    procedimento: 'Stufa fagioli neri con costine, salsiccia affumicata e alloro fino a ottenere un sugo denso e cremoso. Accompagna tradizionalmente con riso bianco e fette d\'arancia.'
  }
];

export function runAppendWorldRecipes() {
  const filePath = path.join(process.cwd(), 'public', 'ricette_mondo.json');
  const raw = fs.readFileSync(filePath, 'utf-8');
  const recipes = JSON.parse(raw);

  console.log(`Initial recipes in DB: ${recipes.length}`);

  // Normalizza e corregge i paesi esistenti se errati
  for (const r of recipes) {
    const t = (r.title || r.nome || '').toLowerCase();
    if (/pancake/i.test(t)) {
      r.country = 'USA';
      r.countryCode = 'US';
      r.flag = '🇺🇸';
    } else if (/crepe/i.test(t)) {
      r.country = 'Francia';
      r.countryCode = 'FR';
      r.flag = '🇫🇷';
    } else if (/couscous/i.test(t) && r.country === 'Italia') {
      r.country = 'Marocco';
      r.countryCode = 'MA';
      r.flag = '🇲🇦';
    }
  }

  const existingIds = new Set(recipes.map(r => r.id));
  const existingTitles = new Set(recipes.map(r => (r.title || '').toLowerCase().trim()));

  let added = 0;
  for (const newRec of ADDITIONAL_WORLD_RECIPES) {
    if (!existingIds.has(newRec.id) && !existingTitles.has(newRec.title.toLowerCase().trim())) {
      recipes.push(newRec);
      existingIds.add(newRec.id);
      added++;
    }
  }

  console.log(`Added ${added} new authentic international recipes!`);
  console.log(`Total database size now: ${recipes.length} recipes.`);

  // Controllo di conformità IP: Nessuna immagine da domini non liberi
  for (const r of recipes) {
    if (!r.image || !r.image.startsWith('https://images.unsplash.com/')) {
      r.image = 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800';
    }
  }

  fs.writeFileSync(filePath, JSON.stringify(recipes, null, 2), 'utf-8');
  console.log('✅ Successfully enriched public/ricette_mondo.json!');
}

if (process.argv[1] && process.argv[1].endsWith('append-world-recipes.mjs')) {
  runAppendWorldRecipes();
}
