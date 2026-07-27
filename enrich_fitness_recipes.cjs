const fs = require('fs');
const path = require('path');

const RECIPES_FILE = path.join(__dirname, 'public', 'ricette_mondo.json');

const FITNESS_RECIPES = [
  {
    id: 'fit_porridge_avena',
    title: 'Porridge di Avena con Banana e Miele',
    nome: 'Porridge di Avena con Banana e Miele',
    category: 'Fitness & Dieta',
    categoria: 'Fitness & Dieta',
    image: 'https://images.unsplash.com/photo-1517673400267-0251440c45dc?w=800',
    ingredients: [
      '50g fiocchi d\'avena integrali',
      '200ml latte parzialmente scremato o bevanda d\'avena',
      '1 banana matura a fette',
      '1 cucchiaino di miele millefiori (10g)',
      '1 pizzico di cannella in polvere'
    ],
    ingredienti: [
      '50g fiocchi d\'avena integrali',
      '200ml latte parzialmente scremato o bevanda d\'avena',
      '1 banana matura a fette',
      '1 cucchiaino di miele millefiori (10g)',
      '1 pizzico di cannella in polvere'
    ],
    steps: [
      'In un pentolino versa i fiocchi d\'avena e il latte.',
      'Cuoci a fuoco medio per circa 5-7 minuti mescolando fino ad ottenere una consistenza cremosa.',
      'Versa il porridge caldo in una ciotola.',
      'Guarnisci con la banana affettata, un filo di miele e una spolverata di cannella. Servire subito.'
    ],
    procedimento: 'In un pentolino versa i fiocchi d\'avena e il latte.\nCuoci a fuoco medio per circa 5-7 minuti mescolando fino ad ottenere una consistenza cremosa.\nVersa il porridge caldo in una ciotola.\nGuarnisci con la banana affettata, un filo di miele e una spolverata di cannella. Servire subito.',
    calories: 400,
    protein: 15,
    carbs: 65,
    fat: 8,
    tags: ['Fitness', 'Colazione', 'Proteico', 'Sano']
  },
  {
    id: 'fit_yogurt_greco',
    title: 'Yogurt Greco con Frutta Secca e Mirtilli',
    nome: 'Yogurt Greco con Frutta Secca e Mirtilli',
    category: 'Fitness & Dieta',
    categoria: 'Fitness & Dieta',
    image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=800',
    ingredients: [
      '170g yogurt greco 0% o 2%',
      '80g mirtilli freschi lavati',
      '15g noci sgusciate',
      '10g mandorle pelate',
      '1 cucchiaio di semi di chia'
    ],
    ingredienti: [
      '170g yogurt greco 0% o 2%',
      '80g mirtilli freschi lavati',
      '15g noci sgusciate',
      '10g mandorle pelate',
      '1 cucchiaio di semi di chia'
    ],
    steps: [
      'Versa lo yogurt greco in una ciotola capiente.',
      'Aggiungi i mirtilli freschi ben lavati.',
      'Trita finemente noci e mandorle ed uniscile allo yogurt.',
      'Completa con i semi di chia per un apporto extra di Omega-3 e servi subito.'
    ],
    procedimento: 'Versa lo yogurt greco in una ciotola capiente.\nAggiungi i mirtilli freschi ben lavati.\nTrita finemente noci e mandorle ed uniscile allo yogurt.\nCompleta con i semi di chia per un apporto extra di Omega-3 e servi subito.',
    calories: 350,
    protein: 20,
    carbs: 30,
    fat: 15,
    tags: ['Fitness', 'Colazione', 'Proteico', 'Gluten-Free']
  },
  {
    id: 'fit_uova_strapazzate',
    title: 'Uova Strapazzate con Pane Integrale',
    nome: 'Uova Strapazzate con Pane Integrale',
    category: 'Fitness & Dieta',
    categoria: 'Fitness & Dieta',
    image: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=800',
    ingredients: [
      '3 uova fresche (o 2 uova + 100ml albume)',
      '2 fette di pane integrale o di segale (60g)',
      '1 cucchiaino di olio extravergine d\'oliva',
      'Sale fino e pepe nero q.b.',
      'Erba cipollina fresca tritata'
    ],
    ingredienti: [
      '3 uova fresche (o 2 uova + 100ml albume)',
      '2 fette di pane integrale o di segale (60g)',
      '1 cucchiaino di olio extravergine d\'oliva',
      'Sale fino e pepe nero q.b.',
      'Erba cipollina fresca tritata'
    ],
    steps: [
      'Sbatte leggermente le uova in una ciotolina con sale, pepe ed erba cipollina.',
      'Scalda una padella antiaderente con il cucchiaino di olio EVO.',
      'Versa le uova e mescola delicatamente a fuoco basso con una spatola di silicone fino a quando risultano morbide e cremose.',
      'Tosta le fette di pane integrale nel tostapane ed accompagna le uova strapazzate calde.'
    ],
    procedimento: 'Sbatte leggermente le uova in una ciotolina con sale, pepe ed erba cipollina.\nScalda una padella antiaderente con il cucchiaino di olio EVO.\nVersa le uova e mescola delicatamente a fuoco basso con una spatola di silicone fino a quando risultano morbide e cremose.\nTosta le fette di pane integrale nel tostapane ed accompagna le uova strapazzate calde.',
    calories: 450,
    protein: 25,
    carbs: 35,
    fat: 20,
    tags: ['Fitness', 'Colazione', 'Proteico']
  },
  {
    id: 'fit_pancake_proteici',
    title: 'Pancake Proteici con Sciroppo d\'Acero',
    nome: 'Pancake Proteici con Sciroppo d\'Acero',
    category: 'Fitness & Dieta',
    categoria: 'Fitness & Dieta',
    image: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800',
    ingredients: [
      '60g farina d\'avena',
      '100ml albume d\'uovo',
      '30g proteine whey in polvere',
      '50ml latte parzialmente scremato o vegetale',
      '1/2 cucchiaino di lievito per dolci',
      '1 cucchiaio di sciroppo d\'acero puro'
    ],
    ingredienti: [
      '60g farina d\'avena',
      '100ml albume d\'uovo',
      '30g proteine whey in polvere',
      '50ml latte parzialmente scremato o vegetale',
      '1/2 cucchiaino di lievito per dolci',
      '1 cucchiaio di sciroppo d\'acero puro'
    ],
    steps: [
      'In una ciotola frulla la farina d\'avena, le proteine, l\'albume, il latte e il lievito fino ad ottenere una pastella omogenea.',
      'Scalda una padellina antiaderente leggermente unta.',
      'Versa un mestolino di pastella formando dei dischi di circa 10cm.',
      'Cuoci a fuoco medio fino alla comparsa delle prime bollicine in superficie, poi gira e cuoci l\'altro lato per 1 minuto.',
      'Impila i pancake e versa sopra lo sciroppo d\'acero prima di servire.'
    ],
    procedimento: 'In una ciotola frulla la farina d\'avena, le proteine, l\'albume, il latte e il lievito fino ad ottenere una pastella omogenea.\nScalda una padellina antiaderente leggermente unta.\nVersa un mestolino di pastella formando dei dischi di circa 10cm.\nCuoci a fuoco medio fino alla comparsa delle prime bollicine in superficie, poi gira e cuoci l\'altro lato per 1 minuto.\nImpila i pancake e versa sopra lo sciroppo d\'acero prima di servire.',
    calories: 380,
    protein: 30,
    carbs: 45,
    fat: 6,
    tags: ['Fitness', 'Colazione', 'Proteico']
  },
  {
    id: 'fit_toast_avocado_uovo',
    title: 'Toast Avocado e Uovo',
    nome: 'Toast Avocado e Uovo',
    category: 'Fitness & Dieta',
    categoria: 'Fitness & Dieta',
    image: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=800',
    ingredients: [
      '2 fette di pane integrale tostato',
      '1/2 avocado maturo',
      '1 uovo grande',
      '1 cucchiaino di succo di limone',
      'Sale rosa, pepe nero e fiocchi di peperoncino q.b.'
    ],
    ingredienti: [
      '2 fette di pane integrale tostato',
      '1/2 avocado maturo',
      '1 uovo grande',
      '1 cucchiaino di succo di limone',
      'Sale rosa, pepe nero e fiocchi di peperoncino q.b.'
    ],
    steps: [
      'Schiaccia la polpa dell\'avocado in una ciotolina con succo di limone, sale e pepe.',
      'Tosta il pane fino a renderlo croccante.',
      'In un pentolino d\'acqua bollente acidulata con un goccio d\'aceto, crea un vortice e cuoci l\'uovo in camicia per 3 minuti (o cuocilo all\'occhio di bue in padella).',
      'Spalma l\'avocado sul pane tostato, adagia sopra l\'uovo e completa con fiocchi di peperoncino.'
    ],
    procedimento: 'Schiaccia la polpa dell\'avocado in una ciotolina con succo di limone, sale e pepe.\nTosta il pane fino a renderlo croccante.\nIn un pentolino d\'acqua bollente acidulata con un goccio d\'aceto, crea un vortice e cuoci l\'uovo in camicia per 3 minuti (o cuocilo all\'occhio di bue in padella).\nSpalma l\'avocado sul pane tostato, adagia sopra l\'uovo e completa con fiocchi di peperoncino.',
    calories: 420,
    protein: 18,
    carbs: 30,
    fat: 24,
    tags: ['Fitness', 'Colazione', 'Sano']
  },
  {
    id: 'fit_smoothie_proteico',
    title: 'Smoothie Proteico alla Frutta',
    nome: 'Smoothie Proteico alla Frutta',
    category: 'Fitness & Dieta',
    categoria: 'Fitness & Dieta',
    image: 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=800',
    ingredients: [
      '200ml latte di mandorla senza zuccheri aggiunti',
      '30g proteine whey alla vaniglia o neutre',
      '1 banana congelata a rondelle',
      '50g frutti di bosco misti',
      '3 cubetti di ghiaccio'
    ],
    ingredienti: [
      '200ml latte di mandorla senza zuccheri aggiunti',
      '30g proteine whey alla vaniglia o neutre',
      '1 banana congelata a rondelle',
      '50g frutti di bosco misti',
      '3 cubetti di ghiaccio'
    ],
    steps: [
      'Inserisci tutti gli ingredienti nel bicchiere del frullatore.',
      'Frulla ad alta velocità per 45-60 secondi fino ad ottenere uno smoothie denso e vellutato.',
      'Versa in un bicchiere alto e gusta immediatamente post-workout o a colazione.'
    ],
    procedimento: 'Inserisci tutti gli ingredienti nel bicchiere del frullatore.\nFrulla ad alta velocità per 45-60 secondi fino ad ottenere uno smoothie denso e vellutato.\nVersa in un bicchiere alto e gusta immediatamente post-workout o a colazione.',
    calories: 300,
    protein: 25,
    carbs: 40,
    fat: 4,
    tags: ['Fitness', 'Colazione', 'Proteico', 'Gluten-Free']
  },
  {
    id: 'fit_fette_biscottate_ricotta',
    title: 'Fette Biscottate con Marmellata e Ricotta',
    nome: 'Fette Biscottate con Marmellata e Ricotta',
    category: 'Fitness & Dieta',
    categoria: 'Fitness & Dieta',
    image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800',
    ingredients: [
      '4 fette biscottate integrali o ai 5 cereali',
      '80g ricotta fresca vaccina o di pecora',
      '30g marmellata extra al 100% frutta (es. mirtilli o fragole)'
    ],
    ingredienti: [
      '4 fette biscottate integrali o ai 5 cereali',
      '80g ricotta fresca vaccina o di pecora',
      '30g marmellata extra al 100% frutta (es. mirtilli o fragole)'
    ],
    steps: [
      'Spalma uniformemente la ricotta fresca su ciascuna fetta biscottata.',
      'Aggiungi sopra un velo di marmellata al 100% frutta.',
      'Servi con una tazza di tè verde o caffè espresso senza zucchero.'
    ],
    procedimento: 'Spalma uniformemente la ricotta fresca su ciascuna fetta biscottata.\nAggiungi sopra un velo di marmellata al 100% frutta.\nServi con una tazza di tè verde o caffè espresso senza zucchero.',
    calories: 320,
    protein: 12,
    carbs: 50,
    fat: 8,
    tags: ['Fitness', 'Colazione', 'Sano']
  },
  {
    id: 'fit_acai_bowl',
    title: 'Bowl di Acai',
    nome: 'Bowl di Acai',
    category: 'Fitness & Dieta',
    categoria: 'Fitness & Dieta',
    image: 'https://images.unsplash.com/photo-1590301157890-4810ed352733?w=800',
    ingredients: [
      '100g polpa di acai congelata (o 2 cucchiai di polvere di acai)',
      '1 banana congelata',
      '50ml latte di cocco o mandorla',
      '20g granola croccante senza zucchero',
      '10g scaglie di cocco disidratato',
      '10g mirtilli e fragole fresche'
    ],
    ingredienti: [
      '100g polpa di acai congelata (o 2 cucchiai di polvere di acai)',
      '1 banana congelata',
      '50ml latte di cocco o mandorla',
      '20g granola croccante senza zucchero',
      '10g scaglie di cocco disidratato',
      '10g mirtilli e fragole fresche'
    ],
    steps: [
      'Frulla l\'acai con la banana congelata e il latte fino ad ottenere una crema densa come un sorbetto.',
      'Versa la crema ottenuta in una ciotola ampia.',
      'Decora la superficie creando file ordinate con granola, scaglie di cocco e frutta fresca a fette.'
    ],
    procedimento: 'Frulla l\'acai con la banana congelata e il latte fino ad ottenere una crema densa come un sorbetto.\nVersa la crema ottenuta in una ciotola ampia.\nDecora la superficie creando file ordinate con granola, scaglie di cocco e frutta fresca a fette.',
    calories: 360,
    protein: 8,
    carbs: 60,
    fat: 10,
    tags: ['Fitness', 'Colazione', 'Vegan', 'Superfood']
  },
  {
    id: 'fit_musli_latte_mandorla',
    title: 'Müsli con Latte di Mandorla',
    nome: 'Müsli con Latte di Mandorla',
    category: 'Fitness & Dieta',
    categoria: 'Fitness & Dieta',
    image: 'https://images.unsplash.com/photo-1517673400267-0251440c45dc?w=800',
    ingredients: [
      '60g müsli integrale croccante con frutta secca e uvetta',
      '200ml latte di mandorla senza zuccheri',
      '1 cucchiaio di semi di girasole o zucca'
    ],
    ingredienti: [
      '60g müsli integrale croccante con frutta secca e uvetta',
      '200ml latte di mandorla senza zuccheri',
      '1 cucchiaio di semi di girasole o zucca'
    ],
    steps: [
      'Versa il müsli integrale in una ciotola.',
      'Aggiungi il latte di mandorla freddo o tiepido.',
      'Arricchisci con i semi tostati e lascia riposare 2 minuti prima di consumare.'
    ],
    procedimento: 'Versa il müsli integrale in una ciotola.\nAggiungi il latte di mandorla freddo o tiepido.\nArricchisci con i semi tostati e lascia riposare 2 minuti prima di consumare.',
    calories: 340,
    protein: 10,
    carbs: 55,
    fat: 12,
    tags: ['Fitness', 'Colazione', 'Vegan']
  },
  {
    id: 'fit_petto_pollo_basmati',
    title: 'Petto di Pollo alla Griglia con Riso Basmati',
    nome: 'Petto di Pollo alla Griglia con Riso Basmati',
    category: 'Fitness & Dieta',
    categoria: 'Fitness & Dieta',
    image: 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=800',
    ingredients: [
      '180g petto di pollo a fettine',
      '80g riso basmati',
      '1 cucchiaio di olio extravergine d\'oliva (10g)',
      'Erbe aromatiche (rosmarino, timo, origano)',
      'Succo di 1/2 limone',
      'Sale e pepe q.b.'
    ],
    ingredienti: [
      '180g petto di pollo a fettine',
      '80g riso basmati',
      '1 cucchiaio di olio extravergine d\'oliva (10g)',
      'Erbe aromatiche (rosmarino, timo, origano)',
      'Succo di 1/2 limone',
      'Sale e pepe q.b.'
    ],
    steps: [
      'Lessa il riso basmati in abbondante acqua salata per 10-12 minuti, poi scolalo.',
      'Marina il pollo per 10 minuti con succo di limone, olio, sale, pepe ed erbe aromatiche.',
      'Scalda una piastra o padella in ghisa e cuoci il pollo 3-4 minuti per lato fino a doratura.',
      'Servi il petto di pollo tagliato a striscioline affiancato dal riso basmati caldo.'
    ],
    procedimento: 'Lessa il riso basmati in abbondante acqua salata per 10-12 minuti, poi scolalo.\nMarina il pollo per 10 minuti con succo di limone, olio, sale, pepe ed erbe aromatiche.\nScalda una piastra o padella in ghisa e cuoci il pollo 3-4 minuti per lato fino a doratura.\nServi il petto di pollo tagliato a striscioline affiancato dal riso basmati caldo.',
    calories: 600,
    protein: 45,
    carbs: 70,
    fat: 10,
    tags: ['Fitness', 'Primi', 'Proteico', 'Gluten-Free', 'Lactose-Free']
  },
  {
    id: 'fit_pasta_integrale_tonno',
    title: 'Pasta Integrale al Tonno',
    nome: 'Pasta Integrale al Tonno',
    category: 'Fitness & Dieta',
    categoria: 'Fitness & Dieta',
    image: 'https://images.unsplash.com/photo-1621996346565-e3def6166739?w=800',
    ingredients: [
      '90g penne o spaghetti integrali',
      '112g tonno al naturale in scatola (2 scatolette)',
      '150g pomodorini ciliegino',
      '1 spicchio d\'aglio',
      '1 cucchiaio di olio EVO',
      'Prezzemolo fresco tritato',
      'Sale e peperoncino q.b.'
    ],
    ingredienti: [
      '90g penne o spaghetti integrali',
      '112g tonno al naturale in scatola (2 scatolette)',
      '150g pomodorini ciliegino',
      '1 spicchio d\'aglio',
      '1 cucchiaio di olio EVO',
      'Prezzemolo fresco tritato',
      'Sale e peperoncino q.b.'
    ],
    steps: [
      'Cuoci la pasta integrale in acqua bollente salata.',
      'In una padella fai soffriggere l\'aglio con l\'olio EVO e il peperoncino, poi aggiungi i pomodorini spaccati a metà e cuoci 5 minuti.',
      'Unisci il tonno al naturale sgocciolato e lascia insaporire per 2 minuti.',
      'Scola la pasta al dente, saltala in padella con il merletto di tonno e completa con prezzemolo fresco.'
    ],
    procedimento: 'Cuoci la pasta integrale in acqua bollente salata.\nIn una padella fai soffriggere l\'aglio con l\'olio EVO e il peperoncino, poi aggiungi i pomodorini spaccati a metà e cuoci 5 minuti.\nUnisci il tonno al naturale sgocciolato e lascia insaporire per 2 minuti.\nScola la pasta al dente, saltala in padella con il merletto di tonno e completa con prezzemolo fresco.',
    calories: 650,
    protein: 35,
    carbs: 85,
    fat: 15,
    tags: ['Fitness', 'Primi', 'Proteico', 'Lactose-Free']
  },
  {
    id: 'fit_insalatona_quinoa_feta',
    title: 'Insalatona con Quinoa e Feta',
    nome: 'Insalatona con Quinoa e Feta',
    category: 'Fitness & Dieta',
    categoria: 'Fitness & Dieta',
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800',
    ingredients: [
      '70g quinoa mista o bianca',
      '60g formaggio feta greco D.O.P. sbriciolato',
      '100g pomodorini',
      '1/2 cetriolo a dadini',
      '30g olive nere denocciolate',
      '1 cucchiaio di olio EVO',
      'Foglie di menta e succo di limone'
    ],
    ingredienti: [
      '70g quinoa mista o bianca',
      '60g formaggio feta greco D.O.P. sbriciolato',
      '100g pomodorini',
      '1/2 cetriolo a dadini',
      '30g olive nere denocciolate',
      '1 cucchiaio di olio EVO',
      'Foglie di menta e succo di limone'
    ],
    steps: [
      'Sciacqua accuratamente la quinoa sotto acqua corrente, poi lessala in 140ml di acqua salata con coperchio per 15 minuti finché assorbe il liquido.',
      'Lascia raffreddare la quinoa sgranandola con una forchetta.',
      'In un\'insalatiera unisci i pomodorini a spicchi, il cetriolo, le olive e la quinoa.',
      'Sbriciola sopra la feta, condisci con olio EVO, succo di limone e foglie di menta fresca.'
    ],
    procedimento: 'Sciacqua accuratamente la quinoa sotto acqua corrente, poi lessala in 140ml di acqua salata con coperchio per 15 minuti finché assorbe il liquido.\nLascia raffreddare la quinoa sgranandola con una forchetta.\nIn un\'insalatiera unisci i pomodorini a spicchi, il cetriolo, le olive e la quinoa.\nSbriciola sopra la feta, condisci con olio EVO, succo di limone e foglie di menta fresca.',
    calories: 550,
    protein: 20,
    carbs: 60,
    fat: 25,
    tags: ['Fitness', 'Primi', 'Vegetariano', 'Gluten-Free']
  },
  {
    id: 'fit_bowl_salmone_avocado',
    title: 'Bowl di Riso con Salmone e Avocado',
    nome: 'Bowl di Riso con Salmone e Avocado',
    category: 'Fitness & Dieta',
    categoria: 'Fitness & Dieta',
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800',
    ingredients: [
      '80g riso per sushi o basmati',
      '120g filetto di salmone fresco (o affumicato)',
      '1/2 avocado a fette',
      '50g edamame sgranati',
      '1 cucchiaio di salsa di soia a basso contenuto di sodio',
      '1 cucchiaino di semi di sesamo tostate'
    ],
    ingredienti: [
      '80g riso per sushi o basmati',
      '120g filetto di salmone fresco (o affumicato)',
      '1/2 avocado a fette',
      '50g edamame sgranati',
      '1 cucchiaio di salsa di soia a basso contenuto di sodio',
      '1 cucchiaino di semi di sesamo tostate'
    ],
    steps: [
      'Cuoci il riso e lascialo intiepidire.',
      'Se usi il salmone fresco, taglialo a dadini e scottalo in padella per 3-4 minuti (o servilo crudo da abbattitore).',
      'Disponi il riso alla base di una bowl capiente.',
      'Sistemaci sopra a settori ordinati il salmone, le fette di avocado e gli edamame.',
      'Condisci con salsa di soia e guarnisci con semi di sesamo.'
    ],
    procedimento: 'Cuoci il riso e lascialo intiepidire.\nSe usi il salmone fresco, taglialo a dadini e scottalo in padella per 3-4 minuti (o servilo crudo da abbattitore).\nDisponi il riso alla base di una bowl capiente.\nSistemaci sopra a settori ordinati il salmone, le fette di avocado e gli edamame.\nCondisci con salsa di soia e guarnisci con semi di sesamo.',
    calories: 700,
    protein: 35,
    carbs: 65,
    fat: 30,
    tags: ['Fitness', 'Primi', 'Proteico', 'Gluten-Free', 'Lactose-Free']
  },
  {
    id: 'fit_wrap_tacchino',
    title: 'Wrap Integrale con Tacchino',
    nome: 'Wrap Integrale con Tacchino',
    category: 'Fitness & Dieta',
    categoria: 'Fitness & Dieta',
    image: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=800',
    ingredients: [
      '1 tortilla o piadina integrale (70g)',
      '100g fesa di tacchino al naturale a fette',
      '50g insalata iceberg o lattughino',
      '1/2 pomodoro a fette',
      '30g maionese light o yogurt greco alla senape'
    ],
    ingredienti: [
      '1 tortilla o piadina integrale (70g)',
      '100g fesa di tacchino al naturale a fette',
      '50g insalata iceberg o lattughino',
      '1/2 pomodoro a fette',
      '30g maionese light o yogurt greco alla senape'
    ],
    steps: [
      'Scalda la tortilla integrale per 30 secondi su padella calda.',
      'Spalma un velo di salsa allo yogurt o maionese light al centro.',
      'Disponi le fette di fesa di tacchino, l\'insalata croccante e le fettine di pomodoro.',
      'Arrotola strettamente il wrap chiudendo i bordi inferiori e taglialo a metà in diagonale prima di servire.'
    ],
    procedimento: 'Scalda la tortilla integrale per 30 secondi su padella calda.\nSpalma un velo di salsa allo yogurt o maionese light al centro.\nDisponi le fette di fesa di tacchino, l\'insalata croccante e le fettine di pomodoro.\nArrotola strettamente il wrap chiudendo i bordi inferiori e taglialo a metà in diagonale prima di servire.',
    calories: 500,
    protein: 35,
    carbs: 50,
    fat: 15,
    tags: ['Fitness', 'Secondi', 'Proteico', 'Lactose-Free']
  },
  {
    id: 'fit_ragu_lenticchie',
    title: 'Pasta con Ragù di Lenticchie',
    nome: 'Pasta con Ragù di Lenticchie',
    category: 'Fitness & Dieta',
    categoria: 'Fitness & Dieta',
    image: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=800',
    ingredients: [
      '80g pasta integrale (es. rigatoni o fusilli)',
      '150g lenticchie lesse in scatola sciacquate',
      '200g passata di pomodoro',
      '1/2 carota, 1/2 costa di sedano, 1/2 cipolla tritata',
      '1 cucchiaio di olio EVO',
      'Sale, pepe e basilico fresco'
    ],
    ingredienti: [
      '80g pasta integrale (es. rigatoni o fusilli)',
      '150g lenticchie lesse in scatola sciacquate',
      '200g passata di pomodoro',
      '1/2 carota, 1/2 costa di sedano, 1/2 cipolla tritata',
      '1 cucchiaio di olio EVO',
      'Sale, pepe e basilico fresco'
    ],
    steps: [
      'Prepara un soffritto leggero in padella con olio EVO, carota, sedano e cipolla tritati finemente.',
      'Aggiungi le lenticchie sciacquate e fai insaporire per 2 minuti.',
      'Versa la passata di pomodoro, regola di sale e pepe e lascia cuocere a fuoco lento per 15-20 minuti.',
      'Lessa la pasta integrale, scolala al dente ed incorporala al ragù vegetale di lenticchie con abbondante basilico fresco.'
    ],
    procedimento: 'Prepara un soffritto leggero in padella con olio EVO, carota, sedano e cipolla tritati finemente.\nAggiungi le lenticchie sciacquate e fai insaporire per 2 minuti.\nVersa la passata di pomodoro, regola di sale e pepe e lascia cuocere a fuoco lento per 15-20 minuti.\nLessa la pasta integrale, scolala al dente ed incorporala al ragù vegetale di lenticchie con abbondante basilico fresco.',
    calories: 620,
    protein: 25,
    carbs: 90,
    fat: 12,
    tags: ['Fitness', 'Primi', 'Vegetariano', 'Vegan']
  },
  {
    id: 'fit_poke_edamame',
    title: 'Poke Bowl con Riso e Edamame',
    nome: 'Poke Bowl con Riso e Edamame',
    category: 'Fitness & Dieta',
    categoria: 'Fitness & Dieta',
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800',
    ingredients: [
      '80g riso basmati o venere',
      '100g tofu al naturale a cubetti',
      '60g edamame bolliti',
      '50g carote a julienne',
      '50g cavolo cappuccio rosso affettato finemente',
      '1 cucchiaio di olio di sesamo e salsa di soia'
    ],
    ingredienti: [
      '80g riso basmati o venere',
      '100g tofu al naturale a cubetti',
      '60g edamame bolliti',
      '50g carote a julienne',
      '50g cavolo cappuccio rosso affettato finemente',
      '1 cucchiaio di olio di sesamo e salsa di soia'
    ],
    steps: [
      'Cuoci il riso basmati o venere e risciacqualo sotto acqua fredda per sgranarlo.',
      'Marina i cubetti di tofu con salsa di soia e olio di sesamo per 10 minuti, poi scottali in padella finché dorati.',
      'Componi la bowl ponendo il riso al centro.',
      'Disponi intorno il tofu croccante, gli edamame, le carote a julienne e il cavolo rosso.',
      'Condisci con il fondo di marinatura.'
    ],
    procedimento: 'Cuoci il riso basmati o venere e risciacqualo sotto acqua fredda per sgranarlo.\nMarina i cubetti di tofu con salsa di soia e olio di sesamo per 10 minuti, poi scottali in padella finché dorati.\nComponi la bowl ponendo il riso al centro.\nDisponi intorno il tofu croccante, gli edamame, le carote a julienne e il cavolo rosso.\nCondisci con il fondo di marinatura.',
    calories: 580,
    protein: 25,
    carbs: 75,
    fat: 18,
    tags: ['Fitness', 'Primi', 'Vegetariano', 'Vegan']
  },
  {
    id: 'fit_salmone_patate_dolci',
    title: 'Salmone al Forno con Patate Dolci',
    nome: 'Salmone al Forno con Patate Dolci',
    category: 'Fitness & Dieta',
    categoria: 'Fitness & Dieta',
    image: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800',
    ingredients: [
      '180g trancio di salmone fresco',
      '200g patate dolci americane (batate)',
      '1 cucchiaio di olio EVO',
      '1 rametto di rosmarino fresco',
      'Sale fino e pepe nero tritato al momento'
    ],
    ingredienti: [
      '180g trancio di salmone fresco',
      '200g patate dolci americane (batate)',
      '1 cucchiaio di olio EVO',
      '1 rametto di rosmarino fresco',
      'Sale fino e pepe nero tritato al momento'
    ],
    steps: [
      'Preriscalda il forno a 200°C e fodera una teglia con carta forno.',
      'Lava e taglia le patate dolci a tocchetti o bastoncino. Condiscile con olio, sale e rosmarino.',
      'Disponi le patate sulla teglia ed inforna per 15 minuti.',
      'Aggiungi il trancio di salmone salato e pepato al centro della teglia e prosegui la cottura per altri 10-12 minuti finché il salmone è morbido e le patate croccanti.'
    ],
    procedimento: 'Preriscalda il forno a 200°C e fodera una teglia con carta forno.\nLava e taglia le patate dolci a tocchetti o bastoncino. Condiscile con olio, sale e rosmarino.\nDisponi le patate sulla teglia ed inforna per 15 minuti.\nAggiungi il trancio di salmone salato e pepato al centro della teglia e prosegui la cottura per altri 10-12 minuti finché il salmone è morbido e le patate croccanti.',
    calories: 650,
    protein: 40,
    carbs: 50,
    fat: 28,
    tags: ['Fitness', 'Secondi', 'Proteico', 'Gluten-Free', 'Lactose-Free']
  },
  {
    id: 'fit_tacchino_verdure_vapore',
    title: 'Petto di Tacchino con Verdure al Vapore',
    nome: 'Petto di Tacchino con Verdure al Vapore',
    category: 'Fitness & Dieta',
    categoria: 'Fitness & Dieta',
    image: 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=800',
    ingredients: [
      '200g petto di tacchino a fette',
      '150g cimette di broccoli freschi',
      '100g carote a rondelle',
      '1 cucchiaio d\'olio EVO a crudo',
      'Succo di limone, origano e sale'
    ],
    ingredienti: [
      '200g petto di tacchino a fette',
      '150g cimette di broccoli freschi',
      '100g carote a rondelle',
      '1 cucchiaio d\'olio EVO a crudo',
      'Succo di limone, origano e sale'
    ],
    steps: [
      'Disponi i broccoli e le carote nel cestello per la cottura al vapore e cuoci per 10-12 minuti finché sono teneri ma croccanti.',
      'Nel frattempo scalda una piastra ghisa e cuoci le fette di tacchino 3 minuti per lato.',
      'Impiatta il tacchino e le verdure al vapore.',
      'Condisci tutto a crudo con l\'olio EVO, succo di limone, sale e origano.'
    ],
    procedimento: 'Disponi i broccoli e le carote nel cestello per la cottura al vapore e cuoci per 10-12 minuti finché sono teneri ma croccanti.\nNel frattempo scalda una piastra ghisa e cuoci le fette di tacchino 3 minuti per lato.\nImpiatta il tacchino e le verdure al vapore.\nCondisci tutto a crudo con l\'olio EVO, succo di limone, sale e origano.',
    calories: 450,
    protein: 45,
    carbs: 20,
    fat: 18,
    tags: ['Fitness', 'Secondi', 'Proteico', 'Gluten-Free', 'Lactose-Free']
  },
  {
    id: 'fit_omelette_spinaci_feta',
    title: 'Omelette con Spinaci e Feta',
    nome: 'Omelette con Spinaci e Feta',
    category: 'Fitness & Dieta',
    categoria: 'Fitness & Dieta',
    image: 'https://images.unsplash.com/photo-1510693206972-df098062cb71?w=800',
    ingredients: [
      '3 uova medie',
      '80g spinaci freschi novelli',
      '40g feta sbriciolata',
      '1 cucchiaino di olio EVO',
      'Sale e pepe q.b.'
    ],
    ingredienti: [
      '3 uova medie',
      '80g spinaci freschi novelli',
      '40g feta sbriciolata',
      '1 cucchiaino di olio EVO',
      'Sale e pepe q.b.'
    ],
    steps: [
      'In una ciotola sbatte le uova con un pizzico di sale e pepe.',
      'Scalda l\'olio in una padella antiaderente e fai appassire gli spinaci freschi per 2 minuti.',
      'Versa le uova sbattute sugli spinaci coprendo bene il fondo.',
      'Quando la superficie comincia a rapprendersi, cospargi la feta sbriciolata su una metà dell\'omelette.',
      'Piega a libro l\'omelette e cuoci ancora 1 minuto prima di servire calda.'
    ],
    procedimento: 'In una ciotola sbatte le uova con un pizzico di sale e pepe.\nScalda l\'olio in una padella antiaderente e fai appassire gli spinaci freschi per 2 minuti.\nVersa le uova sbattute sugli spinaci coprendo bene il fondo.\nQuando la superficie comincia a rapprendersi, cospargi la feta sbriciolata su una metà dell\'omelette.\nPiega a libro l\'omelette e cuoci ancora 1 minuto prima di servire calda.',
    calories: 400,
    protein: 25,
    carbs: 10,
    fat: 28,
    tags: ['Fitness', 'Secondi', 'Vegetariano', 'Gluten-Free']
  },
  {
    id: 'fit_merluzzo_cartoccio',
    title: 'Merluzzo al Cartoccio con Zucchine',
    nome: 'Merluzzo al Cartoccio con Zucchine',
    category: 'Fitness & Dieta',
    categoria: 'Fitness & Dieta',
    image: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=800',
    ingredients: [
      '200g filetto di merluzzo fresco o decongelato',
      '1 zucchina media a rondelle sottili',
      '8 pomodorini ciliegino spaccati',
      '1 cucchiaio di olio EVO',
      '1 spicchio d\'aglio affettato',
      'Origano, sale e prezzemolo'
    ],
    ingredienti: [
      '200g filetto di merluzzo fresco o decongelato',
      '1 zucchina media a rondelle sottili',
      '8 pomodorini ciliegino spaccati',
      '1 cucchiaio di olio EVO',
      '1 spicchio d\'aglio affettato',
      'Origano, sale e prezzemolo'
    ],
    steps: [
      'Preriscalda il forno a 190°C e prepara un foglio capiente di carta forno o alluminio.',
      'Crea un letto di zucchine ed aglio al centro del foglio.',
      'Adagia sopra il filetto di merluzzo, i pomodorini spaccati, origano e sale.',
      'Irrora con l\'olio EVO e chiudi ereticamente il cartoccio sigillando i bordi.',
      'Inforna per 18-20 minuti. Apri il cartoccio a tavola profumando con prezzemolo fresco.'
    ],
    procedimento: 'Preriscalda il forno a 190°C e prepara un foglio capiente di carta forno o alluminio.\nCrea un letto di zucchine ed aglio al centro del foglio.\nAdagia sopra il filetto di merluzzo, i pomodorini spaccati, origano e sale.\nIrrora con l\'olio EVO e chiudi ereticamente il cartoccio sigillando i bordi.\nInforna per 18-20 minuti. Apri il cartoccio a tavola profumando con prezzemolo fresco.',
    calories: 420,
    protein: 35,
    carbs: 15,
    fat: 20,
    tags: ['Fitness', 'Secondi', 'Proteico', 'Gluten-Free', 'Lactose-Free']
  },
  {
    id: 'fit_hamburger_tacchino',
    title: 'Hamburger di Tacchino con Insalata',
    nome: 'Hamburger di Tacchino con Insalata',
    category: 'Fitness & Dieta',
    categoria: 'Fitness & Dieta',
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800',
    ingredients: [
      '180g macinato di tacchino magro',
      '1 panino integrale per hamburger (60g)',
      '50g insalata e 2 fette di pomodoro',
      '1 cucchiaino di senape forte',
      'Prezzemolo, sale e pepe'
    ],
    ingredienti: [
      '180g macinato di tacchino magro',
      '1 panino integrale per hamburger (60g)',
      '50g insalata e 2 fette di pomodoro',
      '1 cucchiaino di senape forte',
      'Prezzemolo, sale e pepe'
    ],
    steps: [
      'Impasta la carne macinata di tacchino con prezzemolo tritato, sale e pepe facendone un medaglione ben compatto.',
      'Scalda una piastra rovente e cuoci l\'hamburger di tacchino 4-5 minuti per lato a fuoco medio.',
      'Tosta leggermente le due metà del panino integrale.',
      'Componi il panino spalmando la senape sulla base, aggiungendo l\'hamburger di tacchino caldo, il pomodoro e l\'insalata croccante.'
    ],
    procedimento: 'Impasta la carne macinata di tacchino con prezzemolo tritato, sale e pepe facendone un medaglione ben compatto.\nScalda una piastra rovente e cuoci l\'hamburger di tacchino 4-5 minuti per lato a fuoco medio.\nTosta leggermente le due metà del panino integrale.\nComponi il panino spalmando la senape sulla base, aggiungendo l\'hamburger di tacchino caldo, il pomodoro e l\'insalata croccante.',
    calories: 500,
    protein: 40,
    carbs: 35,
    fat: 20,
    tags: ['Fitness', 'Secondi', 'Proteico', 'Lactose-Free']
  },
  {
    id: 'fit_filetto_orata_ratatouille',
    title: 'Filetto di Orata con Ratatouille',
    nome: 'Filetto di Orata con Ratatouille',
    category: 'Fitness & Dieta',
    categoria: 'Fitness & Dieta',
    image: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=800',
    ingredients: [
      '200g filetto di orata con pelle',
      '1/2 zucchina, 1/2 melanzana, 1/2 peperone rosso',
      '1/2 cipolla rossa',
      '1 cucchiaio di olio EVO',
      'Timo fresco, sale e pepe'
    ],
    ingredienti: [
      '200g filetto di orata con pelle',
      '1/2 zucchina, 1/2 melanzana, 1/2 peperone rosso',
      '1/2 cipolla rossa',
      '1 cucchiaio di olio EVO',
      'Timo fresco, sale e pepe'
    ],
    steps: [
      'Taglia tutte le verdure della ratatouille a dadini uniformi.',
      'In una padella capiente scalda metà dell\'olio EVO e salta le verdure per 15 minuti a fuoco vivo con timo, sale e pepe finché saranno dorate.',
      'In un\'altra padella antiaderente cuoci il filetto d\'orata dalla parte della pelle per 4 minuti fino a renderla croccante, poi gira per altri 2 minuti.',
      'Servi l\'orata croccante adagiata sul letto di ratatouille di verdure calde.'
    ],
    procedimento: 'Taglia tutte le verdure della ratatouille a dadini uniformi.\nIn una padella capiente scalda metà dell\'olio EVO e salta le verdure per 15 minuti a fuoco vivo con timo, sale e pepe finché saranno dorate.\nIn un\'altra padella antiaderente cuoci il filetto d\'orata dalla parte della pelle per 4 minuti fino a renderla croccante, poi gira per altri 2 minuti.\nServi l\'orata croccante adagiata sul letto di ratatouille di verdure calde.',
    calories: 480,
    protein: 38,
    carbs: 25,
    fat: 22,
    tags: ['Fitness', 'Secondi', 'Proteico', 'Gluten-Free', 'Lactose-Free']
  },
  {
    id: 'fit_tofu_saltato_verdure',
    title: 'Tofu Saltato con Verdure e Riso',
    nome: 'Tofu Saltato con Verdure e Riso',
    category: 'Fitness & Dieta',
    categoria: 'Fitness & Dieta',
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800',
    ingredients: [
      '150g tofu al naturale pressato',
      '80g riso basmati o jasmine',
      '1/2 zucchina a fette, 1/2 peperone a listarelle, 50g broccoli',
      '1 cucchiaio di salsa di soia tamari',
      '1 cucchiaino di olio di sesamo',
      '1 spicchio d\'aglio e zenzero fresco grattugiato'
    ],
    ingredienti: [
      '150g tofu al naturale pressato',
      '80g riso basmati o jasmine',
      '1/2 zucchina a fette, 1/2 peperone a listarelle, 50g broccoli',
      '1 cucchiaio di salsa di soia tamari',
      '1 cucchiaino di olio di sesamo',
      '1 spicchio d\'aglio e zenzero fresco grattugiato'
    ],
    steps: [
      'Lessa il riso e tienilo in caldo.',
      'Taglia il tofu a cubetti e marinalo con salsa di soia e zenzero per 10 minuti.',
      'Scalda l\'olio di sesamo in un wok o padella e soffriggi l\'aglio tritato.',
      'Aggiungi il tofu e salta a fuoco vivo per 5 minuti finché dorato su tutti i lati.',
      'Unisci le verdure croccanti e continua la saltatura per 5 minuti versando un goccio d\'acqua.',
      'Servi il tofu e le verdure sopra una porzione di riso fumante.'
    ],
    procedimento: 'Lessa il riso e tienilo in caldo.\nTaglia il tofu a cubetti e marinalo con salsa di soia e zenzero per 10 minuti.\nScalda l\'olio di sesamo in un wok o padella e soffriggi l\'aglio tritato.\nAggiungi il tofu e salta a fuoco vivo per 5 minuti finché dorato su tutti i lati.\nUnisci le verdure croccanti e continua la saltatura per 5 minuti versando un goccio d\'acqua.\nServi il tofu e le verdure sopra una porzione di riso fumante.',
    calories: 550,
    protein: 25,
    carbs: 70,
    fat: 18,
    tags: ['Fitness', 'Primi', 'Vegetariano', 'Vegan', 'Gluten-Free']
  },
  {
    id: 'fit_mix_frutta_secca',
    title: 'Mix di Frutta Secca',
    nome: 'Mix di Frutta Secca',
    category: 'Fitness & Dieta',
    categoria: 'Fitness & Dieta',
    image: 'https://images.unsplash.com/photo-1543158181-e6f9f676239d?w=800',
    ingredients: [
      '10g noci sgusciate',
      '10g mandorle naturali sgusciate',
      '10g nocciole tostate'
    ],
    ingredienti: [
      '10g noci sgusciate',
      '10g mandorle naturali sgusciate',
      '10g nocciole tostate'
    ],
    steps: [
      'Pesa la dose consigliata di frutta secca (circa 30g totali).',
      'Consuma come spuntino spezza-fame ad alto valore energetico e ricchissimo di grassi sani Omega-3 e Omega-6.'
    ],
    procedimento: 'Pesa la dose consigliata di frutta secca (circa 30g totali).\nConsuma come spuntino spezza-fame ad alto valore energetico e ricchissimo di grassi sani Omega-3 e Omega-6.',
    calories: 200,
    protein: 5,
    carbs: 8,
    fat: 18,
    tags: ['Fitness', 'Snack', 'Vegan', 'Gluten-Free', 'Lactose-Free']
  },
  {
    id: 'fit_barretta_proteica_casa',
    title: 'Barretta Proteica Fatta in Casa',
    nome: 'Barretta Proteica Fatta in Casa',
    category: 'Fitness & Dieta',
    categoria: 'Fitness & Dieta',
    image: 'https://images.unsplash.com/photo-1622484210800-8851025a1768?w=800',
    ingredients: [
      '100g fiocchi d\'avena macinati',
      '60g proteine whey in polvere gusto cioccolato o vaniglia',
      '50g burro di arachidi 100%',
      '60ml latte parzialmente scremato o vegetale',
      '1 cucchiaio di miele'
    ],
    ingredienti: [
      '100g fiocchi d\'avena macinati',
      '60g proteine whey in polvere gusto cioccolato o vaniglia',
      '50g burro di arachidi 100%',
      '60ml latte parzialmente scremato o vegetale',
      '1 cucchiaio di miele'
    ],
    steps: [
      'In una ciotola mescola l\'avena macinata e le proteine in polvere.',
      'Aggiungi il burro di arachidi, il miele e versa il latte poco alla volta mescolando fino ad ottenere un impasto denso e modellabile.',
      'Fodera una teglietta rettangolare con carta forno e compatti l\'impasto a uno spessore di circa 1,5cm.',
      'Metti in freezer per 1 ora, poi taglia l\'impasto in 4 barrette rettangolari. Conserva in frigorifero in un contenitore eretico.'
    ],
    procedimento: 'In una ciotola mescola l\'avena macinata e le proteine in polvere.\nAggiungi il burro di arachidi, il miele e versa il latte poco alla volta mescolando fino ad ottenere un impasto denso e modellabile.\nFodera una teglietta rettangolare con carta forno e compatti l\'impasto a uno spessore di circa 1,5cm.\nMetti in freezer per 1 ora, poi taglia l\'impasto in 4 barrette rettangolari. Conserva in frigorifero in un contenitore eretico.',
    calories: 250,
    protein: 15,
    carbs: 30,
    fat: 8,
    tags: ['Fitness', 'Snack', 'Proteico']
  },
  {
    id: 'fit_mela_burro_arachidi',
    title: 'Mela con Burro di Arachidi',
    nome: 'Mela con Burro di Arachidi',
    category: 'Fitness & Dieta',
    categoria: 'Fitness & Dieta',
    image: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=800',
    ingredients: [
      '1 mela fresca croccante',
      '20g burro di arachidi 100% naturale',
      'Un pizzico di cannella in polvere'
    ],
    ingredienti: [
      '1 mela fresca croccante',
      '20g burro di arachidi 100% naturale',
      'Un pizzico di cannella in polvere'
    ],
    steps: [
      'Lava accuratamente la mela e tagliala a fette o spicchi rimuovendo il torsolo.',
      'Disponi gli spicchi di mela su un piattino.',
      'Spalma su ciascuna fetta un velo di burro di arachidi al 100%.',
      'Spolvera con cannella in polvere per uno spuntino croccante, dolce e proteico.'
    ],
    procedimento: 'Lava accuratamente la mela e tagliala a fette o spicchi rimuovendo il torsolo.\nDisponi gli spicchi di mela su un piattino.\nSpalma su ciascuna fetta un velo di burro di arachidi al 100%.\nSpolvera con cannella in polvere per uno spuntino croccante, dolce e proteico.',
    calories: 220,
    protein: 6,
    carbs: 25,
    fat: 12,
    tags: ['Fitness', 'Snack', 'Vegan', 'Gluten-Free', 'Lactose-Free']
  },
  {
    id: 'fit_crackers_hummus',
    title: 'Crackers Integrali con Hummus',
    nome: 'Crackers Integrali con Hummus',
    category: 'Fitness & Dieta',
    categoria: 'Fitness & Dieta',
    image: 'https://images.unsplash.com/photo-1541544741938-0af808871cc0?w=800',
    ingredients: [
      '4 crackers integrali o gallette di segale',
      '50g hummus classico di ceci',
      'Paprika dolce e un filo di olio EVO'
    ],
    ingredienti: [
      '4 crackers integrali o gallette di segale',
      '50g hummus classico di ceci',
      'Paprika dolce e un filo di olio EVO'
    ],
    steps: [
      'Disponi i crackers integrali sul piatto.',
      'Spalma generosamente l\'hummus di ceci sopra i crackers.',
      'Decorare con una spolverata di paprika dolce per completare lo snack salato sano e saziante.'
    ],
    procedimento: 'Disponi i crackers integrali sul piatto.\nSpalma generosamente l\'hummus di ceci sopra i crackers.\nDecorare con una spolverata di paprika dolce per completare lo snack salato sano e saziante.',
    calories: 240,
    protein: 8,
    carbs: 30,
    fat: 10,
    tags: ['Fitness', 'Snack', 'Vegan', 'Lactose-Free']
  },
  {
    id: 'fit_cottage_cheese_miele',
    title: 'Cottage Cheese con Miele',
    nome: 'Cottage Cheese con Miele',
    category: 'Fitness & Dieta',
    categoria: 'Fitness & Dieta',
    image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=800',
    ingredients: [
      '150g fiocchi di latte magri (Cottage Cheese)',
      '1 cucchiaino di miele millefiori o d\'acacia (10g)',
      '1 pizzico di cannella o granella di pistacchi'
    ],
    ingredienti: [
      '150g fiocchi di latte magri (Cottage Cheese)',
      '1 cucchiaino di miele millefiori o d\'acacia (10g)',
      '1 pizzico di cannella o granella di pistacchi'
    ],
    steps: [
      'Versa i fiocchi di latte freschi in una coppetta.',
      'Aggiungi il cucchiaino di miele colando a filo.',
      'Guarnisci a piacere con un pizzico di cannella o granella di pistacchi per un dessert/spuntino leggero ricchissimo di proteine.'
    ],
    procedimento: 'Versa i fiocchi di latte freschi in una coppetta.\nAggiungi il cucchiaino di miele colando a filo.\nGuarnisci a piacere con un pizzico di cannella o granella di pistacchi per un dessert/spuntino leggero ricchissimo di proteine.',
    calories: 180,
    protein: 18,
    carbs: 15,
    fat: 6,
    tags: ['Fitness', 'Snack', 'Proteico', 'Gluten-Free']
  },
  {
    id: 'fit_banana_cioccolato_fondente',
    title: 'Banana con Cioccolato Fondente',
    nome: 'Banana con Cioccolato Fondente',
    category: 'Fitness & Dieta',
    categoria: 'Fitness & Dieta',
    image: 'https://images.unsplash.com/photo-1528825871115-3581a5387919?w=800',
    ingredients: [
      '1 banana matura',
      '15g cioccolato fondente 85% cacao'
    ],
    ingredienti: [
      '1 banana matura',
      '15g cioccolato fondente 85% cacao'
    ],
    steps: [
      'Sbuccia la banana e tagliala a rondelle sottili.',
      'Sciogli il cioccolato fondente a bagnomaria o nel microonde per 30 secondi.',
      'Colata il cioccolato fondente fuso sulle fette di banana e consuma subito.'
    ],
    procedimento: 'Sbuccia la banana e tagliala a rondelle sottili.\nSciogli il cioccolato fondente a bagnomaria o nel microonde per 30 secondi.\nColata il cioccolato fondente fuso sulle fette di banana e consuma subito.',
    calories: 200,
    protein: 3,
    carbs: 35,
    fat: 7,
    tags: ['Fitness', 'Snack', 'Vegan', 'Gluten-Free']
  },
  {
    id: 'fit_edamame',
    title: 'Edamame',
    nome: 'Edamame',
    category: 'Fitness & Dieta',
    categoria: 'Fitness & Dieta',
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800',
    ingredients: [
      '150g baccelli di edamame surgelati',
      '1 pizzico di sale marino in fiocchi'
    ],
    ingredienti: [
      '150g baccelli di edamame surgelati',
      '1 pizzico di sale marino in fiocchi'
    ],
    steps: [
      'Tuffa i baccelli di edamame congelati in acqua bollente salata e cuoci per 4-5 minuti.',
      'Scola bene gli edamame e trasferiscili in una ciotola.',
      'Cospargi con sale marino in fiocchi e consuma sgranando i baccelli direttamente.'
    ],
    procedimento: 'Tuffa i baccelli di edamame congelati in acqua bollente salata e cuoci per 4-5 minuti.\nScola bene gli edamame e trasferiscili in una ciotola.\nCospargi con sale marino in fiocchi e consuma sgranando i baccelli direttamente.',
    calories: 150,
    protein: 12,
    carbs: 10,
    fat: 6,
    tags: ['Fitness', 'Snack', 'Vegan', 'Gluten-Free', 'Lactose-Free']
  },
  {
    id: 'fit_carote_guacamole',
    title: 'Carote con Guacamole',
    nome: 'Carote con Guacamole',
    category: 'Fitness & Dieta',
    categoria: 'Fitness & Dieta',
    image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=800',
    ingredients: [
      '2 carote medie biologiche fresche',
      '60g guacamole fresco'
    ],
    ingredienti: [
      '2 carote medie biologiche fresche',
      '60g guacamole fresco'
    ],
    steps: [
      'Pela le carote e spuntale, poi tagliale a bastoncini regolari (crudités).',
      'Versa la salsa guacamole fresco in una ciotolina al centro.',
      'Intingi i bastoncini di carota croccante nel guacamole per uno spuntino vegetale freschissimo.'
    ],
    procedimento: 'Pela le carote e spuntale, poi tagliale a bastoncini regolari (crudités).\nVersa la salsa guacamole fresco in una ciotolina al centro.\nIntingi i bastoncini di carota croccante nel guacamole per uno spuntino vegetale freschissimo.',
    calories: 180,
    protein: 3,
    carbs: 15,
    fat: 14,
    tags: ['Fitness', 'Snack', 'Vegan', 'Gluten-Free', 'Lactose-Free']
  },
  {
    id: 'fit_couscous_verdure_ceci',
    title: 'Couscous con Verdure Grigliate e Ceci',
    nome: 'Couscous con Verdure Grigliate e Ceci',
    category: 'Fitness & Dieta',
    categoria: 'Fitness & Dieta',
    image: 'https://images.unsplash.com/photo-1541544741938-0af808871cc0?w=800',
    ingredients: [
      '70g couscous integrale',
      '120g ceci precotti in scatola',
      '1/2 zucchina e 1/2 melanzana a dadini',
      '1/2 peperone rosso a listarelle',
      '1 cucchiaio di olio EVO',
      'Mentuccia, cumino, sale e pepe'
    ],
    ingredienti: [
      '70g couscous integrale',
      '120g ceci precotti in scatola',
      '1/2 zucchina e 1/2 melanzana a dadini',
      '1/2 peperone rosso a listarelle',
      '1 cucchiaio di olio EVO',
      'Mentuccia, cumino, sale e pepe'
    ],
    steps: [
      'Griglia le zucchine, melanzane e peperoni su piastra rovente con un pizzico di sale e cumino.',
      'Metti il couscous in una ciotola, versa 80ml di acqua bollente salata con un filo d\'olio, copri e lascia riposare 5 minuti.',
      'Sgrana il couscous con una forchetta.',
      'Unisci le verdure grigliate a dadini e i ceci sciacquati.',
      'Mescola bene e completa con mentuccia fresca tritata.'
    ],
    procedimento: 'Griglia le zucchine, melanzane e peperoni su piastra rovente con un pizzico di sale e cumino.\nMetti il couscous in una ciotola, versa 80ml di acqua bollente salata con un filo d\'olio, copri e lascia riposare 5 minuti.\nSgrana il couscous con una forchetta.\nUnisci le verdure grigliate a dadini e i ceci sciacquati.\nMescola bene e completa con mentuccia fresca tritata.',
    calories: 550,
    protein: 20,
    carbs: 80,
    fat: 15,
    tags: ['Fitness', 'Primi', 'Vegetariano', 'Vegan']
  },
  {
    id: 'fit_pollo_curry_riso',
    title: 'Pollo al Curry con Riso',
    nome: 'Pollo al Curry con Riso',
    category: 'Fitness & Dieta',
    categoria: 'Fitness & Dieta',
    image: 'https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=800',
    ingredients: [
      '180g bocconcini di petto di pollo',
      '80g riso basmati',
      '1 cucchiaio colmo di curry in polvere',
      '100ml latte di cocco leggero (o yogurt magro)',
      '1/2 cipolla tritata',
      '1 cucchiaio di olio EVO',
      'Sale'
    ],
    ingredienti: [
      '180g bocconcini di petto di pollo',
      '80g riso basmati',
      '1 cucchiaio colmo di curry in polvere',
      '100ml latte di cocco leggero (o yogurt magro)',
      '1/2 cipolla tritata',
      '1 cucchiaio di olio EVO',
      'Sale'
    ],
    steps: [
      'Lessa il riso basmati e tienilo al caldo.',
      'In una padella rosolare la cipolla con l\'olio EVO, unisci i bocconcini di pollo e rosola per 5 minuti.',
      'Aggiungi il curry e mescola per tostarlo 1 minuto.',
      'Versa il latte di cocco e regola di sale. Fai sobbollire 8-10 minuti a fuoco basso finché il pollo è tenero e la salsa cremosa.',
      'Servi il pollo al curry ben caldo affiancato dal riso basmati.'
    ],
    procedimento: 'Lessa il riso basmati e tienilo al caldo.\nIn una padella rosolare la cipolla con l\'olio EVO, unisci i bocconcini di pollo e rosola per 5 minuti.\nAggiungi il curry e mescola per tostarlo 1 minuto.\nVersa il latte di cocco e regola di sale. Fai sobbollire 8-10 minuti a fuoco basso finché il pollo è tenero e la salsa cremosa.\nServi il pollo al curry ben caldo affiancato dal riso basmati.',
    calories: 680,
    protein: 45,
    carbs: 75,
    fat: 20,
    tags: ['Fitness', 'Primi', 'Proteico', 'Gluten-Free']
  },
  {
    id: 'fit_zuppa_legumi',
    title: 'Zuppa di Legumi',
    nome: 'Zuppa di Legumi',
    category: 'Fitness & Dieta',
    categoria: 'Fitness & Dieta',
    image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800',
    ingredients: [
      '150g mix di ceci, fagioli cannellini e lenticchie lesse',
      '1/2 carota, 1/2 sedano, 1/2 cipolla',
      '100g polpa di pomodoro',
      '1 foglia d\'alloro e 1 rametto di rosmarino',
      '1 cucchiaio di olio EVO a crudo',
      'Crostoni di pane integrale (30g)'
    ],
    ingredienti: [
      '150g mix di ceci, fagioli cannellini e lenticchie lesse',
      '1/2 carota, 1/2 sedano, 1/2 cipolla',
      '100g polpa di pomodoro',
      '1 foglia d\'alloro e 1 rametto di rosmarino',
      '1 cucchiaio di olio EVO a crudo',
      'Crostoni di pane integrale (30g)'
    ],
    steps: [
      'Prepara un soffritto leggero in casseruola con l\'olio EVO e il trito di carota, sedano e cipolla.',
      'Aggiungi i legumi risciacquati, il pomodoro e le erbe aromatiche.',
      'Copri con 400ml di acqua calda o brodo vegetale e lascia cuocere a fuoco lento per 20 minuti.',
      'Elimina l\'alloro e il rosmarino, aggiusta di sale e povere di pepe.',
      'Servi nei piatti con un filo d\'olio EVO a crudo e accompagnando con crostoni di pane tostato.'
    ],
    procedimento: 'Prepara un soffritto leggero in casseruola con l\'olio EVO e il trito di carota, sedano e cipolla.\nAggiungi i legumi risciacquati, il pomodoro e le erbe aromatiche.\nCopri con 400ml di acqua calda o brodo vegetale e lascia cuocere a fuoco lento per 20 minuti.\nElimina l\'alloro e il rosmarino, aggiusta di sale e povere di pepe.\nServi nei piatti con un filo d\'olio EVO a crudo e accompagnando con crostoni di pane tostato.',
    calories: 450,
    protein: 25,
    carbs: 65,
    fat: 10,
    tags: ['Fitness', 'Primi', 'Vegetariano', 'Vegan', 'Gluten-Free']
  },
  {
    id: 'fit_risotto_funghi',
    title: 'Risotto ai Funghi',
    nome: 'Risotto ai Funghi',
    category: 'Fitness & Dieta',
    categoria: 'Fitness & Dieta',
    image: 'https://images.unsplash.com/photo-1633964913295-ceb43826e7c9?w=800',
    ingredients: [
      '80g riso Carnaroli o Arborio',
      '200g funghi porcini o champignon freschi affettati',
      '500ml brodo vegetale caldo',
      '1/2 cipolla bianca tritata',
      '1 cucchiaio di olio EVO',
      '15g parmigiano reggiano grattugiato',
      'Prezzemolo fresco tritato'
    ],
    ingredienti: [
      '80g riso Carnaroli o Arborio',
      '200g funghi porcini o champignon freschi affettati',
      '500ml brodo vegetale caldo',
      '1/2 cipolla bianca tritata',
      '1 cucchiaio di olio EVO',
      '15g parmigiano reggiano grattugiato',
      'Prezzemolo fresco tritato'
    ],
    steps: [
      'Trita la cipolla e rosolala in casseruola con mezzo cucchiaio di olio EVO.',
      'Aggiungi i funghi affettati e cuoci per 5 minuti a fuoco vivo.',
      'Aggiungi il riso e tostalo per 2 minuti mescolando.',
      'Bagna man mano con il brodo vegetale bollente portando a cottura in circa 16-18 minuti.',
      'Togli dal fuoco, manteca con il rimanente olio EVO e il parmigiano, guarnisci con prezzemolo fresco.'
    ],
    procedimento: 'Trita la cipolla e rosolala in casseruola con mezzo cucchiaio di olio EVO.\nAggiungi i funghi affettati e cuoci per 5 minuti a fuoco vivo.\nAggiungi il riso e tostalo per 2 minuti mescolando.\nBagna man mano con il brodo vegetale bollente portando a cottura in circa 16-18 minuti.\nTogli dal fuoco, manteca con il rimanente olio EVO e il parmigiano, guarnisci con prezzemolo fresco.',
    calories: 600,
    protein: 15,
    carbs: 85,
    fat: 20,
    tags: ['Fitness', 'Primi', 'Vegetariano', 'Gluten-Free']
  }
];

try {
  let existing = [];
  if (fs.existsSync(RECIPES_FILE)) {
    existing = JSON.parse(fs.readFileSync(RECIPES_FILE, 'utf8'));
  }

  // Remove previous fit_ items if present to avoid duplication
  const filtered = existing.filter(r => !r.id || !r.id.startsWith('fit_'));
  
  // Combine fit recipes at the top of the array
  const updated = [...FITNESS_RECIPES, ...filtered];

  fs.writeFileSync(RECIPES_FILE, JSON.stringify(updated, null, 2));
  console.log(`✅ Success! Added ${FITNESS_RECIPES.length} Fitness & Dieta recipes to ${RECIPES_FILE}. Total recipes: ${updated.length}`);
} catch (e) {
  console.error('Error writing fitness recipes:', e);
}
