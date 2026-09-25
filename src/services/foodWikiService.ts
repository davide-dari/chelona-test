/**
 * Service per il recupero di informazioni nutrizionali ed enciclopediche sugli alimenti
 * Fonte: Wikipedia API italiana (CC BY-SA 4.0, royalty-free e open source) + Database Nutrizionale Integrato
 */

export interface FoodNutrientInfo {
  caloriesPer100g: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  keyNutrients: string[];
  healthBenefits: string[];
  category: 'superfood' | 'cereali' | 'proteine' | 'grassi_buoni' | 'frutta_verdura' | 'latticini' | 'legumi';
  funFact?: string;
  localDescription: string;
}

export interface FoodDetail {
  rawName: string;
  title: string;
  displayTitle: string;
  extract: string;
  description?: string;
  thumbnailUrl?: string;
  wikiUrl?: string;
  nutrients?: FoodNutrientInfo;
  source: 'Wikipedia (CC BY-SA 4.0)' | 'Database Nutrizionale Chelona';
  isOfflineFallback?: boolean;
}

// Mappatura nomi ingredienti culinari -> Pagina Wikipedia e profilo nutrizionale
const FOOD_KNOWLEDGE_BASE: Record<string, { wikiTitle: string; info: FoodNutrientInfo }> = {
  acai: {
    wikiTitle: 'Euterpe_oleracea',
    info: {
      category: 'superfood',
      caloriesPer100g: 70,
      protein: 1.5,
      carbs: 4.0,
      fat: 5.0,
      fiber: 3.5,
      keyNutrients: ['Antociani', 'Omega-9', 'Vitamina A', 'Calcio'],
      healthBenefits: [
        'Altissimo potere antiossidante che contrasta lo stress ossidativo',
        'Supporta la salute cardiovascolare e il colesterolo',
        'Fornisce energia a rilascio graduale senza picchi glicemici'
      ],
      funFact: 'Le bacche di açai crescono spontaneamente nella foresta amazzonica e sono considerate un frutto sacro dalle popolazioni indigene.',
      localDescription: "L'Açai è una palma amazzonica i cui frutti a bacca violacea sono rinomati in tutto il mondo per l'altissima concentrazione di antociani e acidi grassi essenziali."
    }
  },
  granola: {
    wikiTitle: 'Granola',
    info: {
      category: 'cereali',
      caloriesPer100g: 470,
      protein: 10.0,
      carbs: 64.0,
      fat: 20.0,
      fiber: 7.0,
      keyNutrients: ['Fibre solubili (Beta-glucani)', 'Magnesio', 'Ferro', 'Fosforo'],
      healthBenefits: [
        'Eccellente fonte di energia a lenta cessione per l\'allenamento',
        'Prolunga il senso di sazietà per tutta la mattinata',
        'Favorisce la regolare motilità intestinale grazie alle fibre'
      ],
      funFact: 'La granola fu inventata a New York nel 1863 dal Dr. James Caleb Jackson come alimento salutare per gli ospiti del suo sanatorio.',
      localDescription: 'Miscela croccante cotta al forno a base di fiocchi d\'avena, frutta secca, semi e miele o sciroppo d\'acero, ideale per la colazione e gli spuntini energetici.'
    }
  },
  avena: {
    wikiTitle: 'Avena_sativa',
    info: {
      category: 'cereali',
      caloriesPer100g: 389,
      protein: 16.9,
      carbs: 66.3,
      fat: 6.9,
      fiber: 10.6,
      keyNutrients: ['Beta-glucani', 'Zinco', 'Vitamina B1', 'Manganese'],
      healthBenefits: [
        'Aiuta a ridurre il colesterolo LDL grazie ai beta-glucani',
        'Indice glicemico moderato che stabilizza la glicemia',
        'Altissimo potere saziante e benefico per il microbiota'
      ],
      localDescription: 'Cereale nobile ricco di proteine vegetali e fibre solubili. È la base ideale del porridge e delle colazioni fitness per sportivi.'
    }
  },
  chia: {
    wikiTitle: 'Salvia_hispanica',
    info: {
      category: 'superfood',
      caloriesPer100g: 486,
      protein: 16.5,
      carbs: 42.1,
      fat: 30.7,
      fiber: 34.4,
      keyNutrients: ['Omega-3 vegetale (ALA)', 'Calcio', 'Antiossidanti', 'Magnesio'],
      healthBenefits: [
        'Fonte eccezionale di Omega-3 essenziali per il benessere cellulare',
        'Trattiene fino a 10 volte il proprio peso in acqua, favorendo l\'idratazione',
        'Supporta il transito intestinale e riduce l\'infiammazione'
      ],
      funFact: 'I guerrieri Aztechi usavano i semi di chia come razione di sopravvivenza da campo per sostenere marce e battaglie prolungate.',
      localDescription: 'Semi ricavati dalla pianta Salvia hispanica. Formano un gel gelatinoso a contatto con i liquidi, ottimo per budini, smoothie e yogurt.'
    }
  },
  cocco: {
    wikiTitle: 'Cocos_nucifera',
    info: {
      category: 'grassi_buoni',
      caloriesPer100g: 354,
      protein: 3.3,
      carbs: 15.2,
      fat: 33.5,
      fiber: 9.0,
      keyNutrients: ['Trigliceridi a catena media (MCT)', 'Manganese', 'Rame', 'Ferro'],
      healthBenefits: [
        'Gli acidi grassi MCT vengono rapidamente convertiti in energia dal fegato',
        'Sostiene la funzione cerebrale e il metabolismo',
        'Dona gusto, croccantezza e sazietà ai piatti dolci e salati'
      ],
      localDescription: 'Frutto della palma da cocco. La polpa essiccata (rapè) è ricca di grassi saturi vegetali a catena media e fibre benefiche.'
    }
  },
  pollo: {
    wikiTitle: 'Carne_di_pollo',
    info: {
      category: 'proteine',
      caloriesPer100g: 110,
      protein: 23.3,
      carbs: 0.0,
      fat: 1.2,
      fiber: 0.0,
      keyNutrients: ['Proteine nobili', 'Vitamina B6', 'Niacina (B3)', 'Selenio'],
      healthBenefits: [
        'Proteina magra ad altissimo valore biologico per la crescita muscolare',
        'Facilmente digeribile e a bassissimo contenuto di grassi saturi',
        'Supporta la sintesi proteica e la rigenerazione tissutale'
      ],
      localDescription: 'Il petto di pollo è il pilastro delle diete per atleti: carne bianca ipocalorica, ricca di amminoacidi ramificati essenziali.'
    }
  },
  riso: {
    wikiTitle: 'Riso_basmati',
    info: {
      category: 'cereali',
      caloriesPer100g: 360,
      protein: 8.5,
      carbs: 78.0,
      fat: 0.9,
      fiber: 1.4,
      keyNutrients: ['Amido resistente', 'Vitamine del gruppo B', 'Magnesio'],
      healthBenefits: [
        'Carboidrato pulito e altamente digeribile, senza glutine',
        'Il riso basmati ha un indice glicemico più basso rispetto al riso bianco comune',
        'Fornisce glicogeno rapido per il recupero post-workout'
      ],
      localDescription: 'Varietà di riso a grana lunga profumata originaria dell\'India. Ha chicchi sodi che restano sgranati, perfetta per piatti freddi e caldi.'
    }
  },
  salmone: {
    wikiTitle: 'Salmo_salar',
    info: {
      category: 'proteine',
      caloriesPer100g: 208,
      protein: 20.4,
      carbs: 0.0,
      fat: 13.4,
      fiber: 0.0,
      keyNutrients: ['Omega-3 (EPA e DHA)', 'Vitamina D', 'Vitamina B12', 'Selenio'],
      healthBenefits: [
        'Straordinaria fonte di acidi grassi polinsaturi Omega-3 antinfiammatori',
        'Favorisce la salute cardiovascolare e delle articolazioni',
        'Supporta l\'umore, la memoria e l\'equilibrio ormonale'
      ],
      localDescription: 'Pesce grasso d\'acqua fredda dalle carni rosee e gustose. È considerato tra i superalimenti marini più completi e salutari.'
    }
  },
  uova: {
    wikiTitle: 'Uovo_(alimento)',
    info: {
      category: 'proteine',
      caloriesPer100g: 143,
      protein: 12.6,
      carbs: 0.7,
      fat: 9.5,
      fiber: 0.0,
      keyNutrients: ['Colina', 'Luteina', 'Zeaxantina', 'Vitamina D', 'Vitamina B12'],
      healthBenefits: [
        'Proteina di riferimento (valore biologico 100) contenente tutti gli amminoacidi',
        'La colina è fondamentale per il cervello e la salute del fegato',
        'Gli antiossidanti nel tuorlo proteggono la vista'
      ],
      localDescription: 'Alimento completo e versatile per eccellenza. L\'albume apporta proteine pure senza grassi, mentre il tuorlo è ricco di micronutrienti essenziali.'
    }
  },
  yogurt_greco: {
    wikiTitle: 'Yogurt',
    info: {
      category: 'latticini',
      caloriesPer100g: 59,
      protein: 10.0,
      carbs: 3.6,
      fat: 0.4,
      fiber: 0.0,
      keyNutrients: ['Calcio', 'Probiotici vivi', 'Fosforo', 'Vitamina B12'],
      healthBenefits: [
        'Ha il doppio delle proteine rispetto allo yogurt tradizionale',
        'I fermenti lattici vivi favoriscono l\'equilibrio della flora batterica',
        'Basso contenuto di lattosio grazie alla colatura del siero'
      ],
      localDescription: 'Yogurt colato ad alta concentrazione proteica e consistenza densa e cremosa, privo di zuccheri aggiunti.'
    }
  },
  avocado: {
    wikiTitle: 'Persea_americana',
    info: {
      category: 'grassi_buoni',
      caloriesPer100g: 160,
      protein: 2.0,
      carbs: 8.5,
      fat: 14.7,
      fiber: 6.7,
      keyNutrients: ['Acido oleico (Omega-9)', 'Potassio', 'Vitamina E', 'Folati'],
      healthBenefits: [
        'Contiene più potassio di una banana, aiutando a regolare la pressione arteriosa',
        'I grassi monoinsaturi migliorano l\'assorbimento delle vitamine liposolubili',
        'Protegge la pelle e contrasta i processi infiammatori'
      ],
      localDescription: 'Frutto tropicale ricco di acidi grassi monoinsaturi e fibre alimentari. La polpa vellutata è ideale per toast, insalate e guacamole.'
    }
  },
  pasta: {
    wikiTitle: 'Pasta',
    info: {
      category: 'cereali',
      caloriesPer100g: 350,
      protein: 13.0,
      carbs: 68.0,
      fat: 2.0,
      fiber: 7.0,
      keyNutrients: ['Carboidrati complessi', 'Fibre', 'Ferro', 'Magnesio'],
      healthBenefits: [
        'La versione integrale rallenta l\'assorbimento degli zuccheri',
        'Carica energetica ottimale prima di sessioni di allenamento impegnative',
        'Favorisce la produzione di serotonina e il rilassamento serale'
      ],
      localDescription: 'Alimento simbolo della dieta mediterranea. Ricavata dalla semola di grano duro, assicura una digestione graduale e performance costante.'
    }
  },
  tonno: {
    wikiTitle: 'Tonno',
    info: {
      category: 'proteine',
      caloriesPer100g: 105,
      protein: 24.0,
      carbs: 0.0,
      fat: 0.8,
      fiber: 0.0,
      keyNutrients: ['Fosforo', 'Selenio', 'Vitamina B3', 'Proteine magre'],
      healthBenefits: [
        'Densità proteica eccezionale con pochissimi grassi',
        'Pratico e veloce da consumare sia fresco che conservato al naturale',
        'Supporta il recupero muscolare immediato dopo l\'attività fisica'
      ],
      localDescription: 'Pesce azzurro pelagico dalle carni sode e nutrienti. La versione al naturale è ipocalorica e priva di oli aggiunti.'
    }
  },
  ricotta: {
    wikiTitle: 'Ricotta',
    info: {
      category: 'latticini',
      caloriesPer100g: 140,
      protein: 11.5,
      carbs: 3.5,
      fat: 8.5,
      fiber: 0.0,
      keyNutrients: ['Sieroproteine nobili', 'Calcio', 'Fosforo'],
      healthBenefits: [
        'Le sieroproteine della ricotta vantano una digeribilità e biodisponibilità altissima',
        'Leggera e saziante, con meno calorie dei formaggi stagionati',
        'Ideale per colazioni dolci o per condire primi piatti proteici'
      ],
      localDescription: 'Prodotto caseario fresco ottenuto dal siero di latte riscaldato. Morbida, delicata e naturalmente ricca di proteine del siero.'
    }
  },
  mirtilli: {
    wikiTitle: 'Vaccinium_myrtillus',
    info: {
      category: 'frutta_verdura',
      caloriesPer100g: 57,
      protein: 0.7,
      carbs: 14.5,
      fat: 0.3,
      fiber: 2.4,
      keyNutrients: ['Antocianine', 'Vitamina C', 'Vitamina K', 'Manganese'],
      healthBenefits: [
        'Tra i frutti con la più alta concentrazione di antiossidanti al mondo',
        'Favorisce la microcircolazione e protegge la retina e la vista',
        'Supporta la memoria, le funzioni cognitive e il recupero muscolare'
      ],
      localDescription: 'Piccole bacche blu scuro selvatiche o coltivate, celebri per il loro sapore fresco e le straordinarie proprietà protettive per i vasi sanguigni.'
    }
  },
  olio_oliva: {
    wikiTitle: "Olio_d'oliva",
    info: {
      category: 'grassi_buoni',
      caloriesPer100g: 884,
      protein: 0.0,
      carbs: 0.0,
      fat: 100.0,
      fiber: 0.0,
      keyNutrients: ['Polifenoli', 'Acido oleico', 'Vitamina E'],
      healthBenefits: [
        'Il re dei grassi salutari: potente antiossidante e cardioprotettivo',
        'Riduce il colesterolo cattivo LDL e preserva l\'HDL buono',
        'Esalta i sapori e migliora l\'assorbimento dei nutrienti nei pasti'
      ],
      localDescription: 'Olio extravergine d\'oliva estratto a freddo mediante soli procedimenti meccanici. È l\'oro liquido della dieta mediterranea.'
    }
  },
  mandorle: {
    wikiTitle: 'Prunus_dulcis',
    info: {
      category: 'grassi_buoni',
      caloriesPer100g: 579,
      protein: 21.2,
      carbs: 21.6,
      fat: 49.9,
      fiber: 12.5,
      keyNutrients: ['Vitamina E', 'Magnesio', 'Calcio', 'Rame'],
      healthBenefits: [
        'Eccellente fonte di Vitamina E per contrastare l\'invecchiamento cellulare',
        'Il magnesio aiuta a ridurre la stanchezza e i crampi muscolari',
        'Spuntino ideale per spezzare la fame senza picchi insulinici'
      ],
      localDescription: 'Semi commestibili dell\'albero del mandorlo. Ricche di grassi buoni, proteine vegetali e fibre croccanti.'
    }
  },
  cioccolato: {
    wikiTitle: 'Cioccolato',
    info: {
      category: 'superfood',
      caloriesPer100g: 546,
      protein: 7.8,
      carbs: 45.9,
      fat: 31.3,
      fiber: 10.9,
      keyNutrients: ['Flavonoidi', 'Teobromina', 'Ferro', 'Magnesio'],
      healthBenefits: [
        'Il cacao fondente (>75%) stimola le endorfine e l\'energia mentale',
        'I flavonoidi migliorano il flusso sanguigno e abbassano la pressione arteriosa',
        'Soddisfa la voglia di dolce apportando minerali essenziali'
      ],
      localDescription: 'Prodotto a base di pasta di cacao e burro di cacao. Quando consumato fondente, rappresenta un vero elisir di benessere per mente e cuore.'
    }
  }
};

class FoodWikiService {
  private cache = new Map<string, FoodDetail>();

  // Normalizza il nome dell'ingrediente per la ricerca
  private normalizeName(raw: string): string {
    return raw
      .toLowerCase()
      .replace(/\(.*?\)/g, '') // rimuove parentesi es: (a crudo), (peso cotto)
      .replace(/100%.*?frutta/g, '')
      .replace(/fresco|fresca|freschi|fresche/g, '')
      .replace(/al naturale|sgocciolato|a fette|a rondelle/g, '')
      .replace(/essiccato|croccante|grigliato|integrale/g, '')
      .replace(/biologico|bio|isolato|isolate/g, '')
      .trim();
  }

  // Trova la chiave di conoscenza interna o il titolo Wikipedia più vicino
  private resolveKey(cleanName: string): { key?: string; wikiTitle: string; displayTitle: string } {
    const s = cleanName.toLowerCase();

    if (s.includes('acai') || s.includes('açai')) return { key: 'acai', wikiTitle: 'Euterpe_oleracea', displayTitle: 'Açai' };
    if (s.includes('granola')) return { key: 'granola', wikiTitle: 'Granola', displayTitle: 'Granola' };
    if (s.includes('avena') || s.includes('porridge') || s.includes('müsli') || s.includes('musli')) return { key: 'avena', wikiTitle: 'Avena_sativa', displayTitle: 'Avena' };
    if (s.includes('chia')) return { key: 'chia', wikiTitle: 'Salvia_hispanica', displayTitle: 'Semi di Chia' };
    if (s.includes('cocco')) return { key: 'cocco', wikiTitle: 'Cocos_nucifera', displayTitle: 'Cocco' };
    if (s.includes('pollo')) return { key: 'pollo', wikiTitle: 'Carne_di_pollo', displayTitle: 'Petto di Pollo' };
    if (s.includes('riso') || s.includes('basmati')) return { key: 'riso', wikiTitle: 'Riso_basmati', displayTitle: 'Riso Basmati' };
    if (s.includes('salmone')) return { key: 'salmone', wikiTitle: 'Salmo_salar', displayTitle: 'Salmone' };
    if (s.includes('uov') || s.includes('uovo') || s.includes('omelette')) return { key: 'uova', wikiTitle: 'Uovo_(alimento)', displayTitle: 'Uova' };
    if (s.includes('yogurt')) return { key: 'yogurt_greco', wikiTitle: 'Yogurt', displayTitle: 'Yogurt Greco' };
    if (s.includes('avocado')) return { key: 'avocado', wikiTitle: 'Persea_americana', displayTitle: 'Avocado' };
    if (s.includes('pasta')) return { key: 'pasta', wikiTitle: 'Pasta', displayTitle: 'Pasta Integrale' };
    if (s.includes('tonno')) return { key: 'tonno', wikiTitle: 'Tonno', displayTitle: 'Tonno' };
    if (s.includes('ricotta')) return { key: 'ricotta', wikiTitle: 'Ricotta', displayTitle: 'Ricotta' };
    if (s.includes('mirtill') || s.includes('frutti di bosco') || s.includes('frutti rossi')) return { key: 'mirtilli', wikiTitle: 'Vaccinium_myrtillus', displayTitle: 'Mirtilli & Frutti di Bosco' };
    if (s.includes('olio')) return { key: 'olio_oliva', wikiTitle: "Olio_d'oliva", displayTitle: "Olio Extravergine d'Oliva" };
    if (s.includes('mandorl')) return { key: 'mandorle', wikiTitle: 'Prunus_dulcis', displayTitle: 'Mandorle' };
    if (s.includes('cioccolat')) return { key: 'cioccolato', wikiTitle: 'Cioccolato', displayTitle: 'Cioccolato Fondente' };

    // Fallback generico: usa il nome pulito capitalizzato per interrogare Wikipedia
    const formatted = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
    return { wikiTitle: encodeURIComponent(formatted.replace(/\s+/g, '_')), displayTitle: formatted };
  }

  async getFoodDetail(rawIngredientName: string): Promise<FoodDetail> {
    const clean = this.normalizeName(rawIngredientName);
    const cacheKey = `chelona_food_${clean}`;

    // 1. Controlla cache in memoria
    if (this.cache.has(clean)) {
      return this.cache.get(clean)!;
    }

    // 2. Controlla localStorage
    try {
      const saved = localStorage.getItem(cacheKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        this.cache.set(clean, parsed);
        return parsed;
      }
    } catch {
      // Ignora errori di parsing
    }

    const { key, wikiTitle, displayTitle } = this.resolveKey(clean);
    const curatedData = key ? FOOD_KNOWLEDGE_BASE[key] : undefined;

    let wikiExtract = '';
    let wikiThumb: string | undefined = undefined;
    let wikiPageUrl = `https://it.wikipedia.org/wiki/${wikiTitle}`;
    let wikiDescription = '';
    let source: 'Wikipedia (CC BY-SA 4.0)' | 'Database Nutrizionale Chelona' = 'Wikipedia (CC BY-SA 4.0)';

    try {
      // Chiama la REST API ufficiale di Wikipedia Italia
      const apiUrl = `https://it.wikipedia.org/api/rest_v1/page/summary/${wikiTitle}`;
      const res = await fetch(apiUrl, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'ChelonaApp/1.30 (https://github.com/davide-dari/chelona-test; contact@chelona.app)'
        }
      });

      if (res.ok) {
        const data = await res.json();
        wikiExtract = data.extract || '';
        wikiDescription = data.description || '';
        if (data.thumbnail && data.thumbnail.source) {
          wikiThumb = data.thumbnail.source;
        }
        if (data.content_urls?.desktop?.page) {
          wikiPageUrl = data.content_urls.desktop.page;
        }
      } else {
        // Tentativo con OpenSearch se il titolo diretto non esiste
        const searchUrl = `https://it.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(clean)}&limit=1&namespace=0&format=json&origin=*`;
        const sRes = await fetch(searchUrl);
        if (sRes.ok) {
          const sData = await sRes.json();
          if (Array.isArray(sData) && sData[1] && sData[1][0]) {
            const resolvedTitle = sData[1][0];
            const fallbackRes = await fetch(`https://it.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(resolvedTitle)}`);
            if (fallbackRes.ok) {
              const fbData = await fallbackRes.json();
              wikiExtract = fbData.extract || '';
              wikiDescription = fbData.description || '';
              if (fbData.thumbnail?.source) wikiThumb = fbData.thumbnail.source;
              if (fbData.content_urls?.desktop?.page) wikiPageUrl = fbData.content_urls.desktop.page;
            }
          }
        }
      }
    } catch (e) {
      console.warn('[FoodWikiService] Network Wikipedia fetch failed, using curated DB:', e);
      source = 'Database Nutrizionale Chelona';
    }

    // Se Wikipedia non ha fornito una descrizione o siamo offline, usa quella locale curata
    if (!wikiExtract && curatedData) {
      wikiExtract = curatedData.info.localDescription;
      source = 'Database Nutrizionale Chelona';
    }

    const detail: FoodDetail = {
      rawName: rawIngredientName,
      title: displayTitle,
      displayTitle,
      extract: wikiExtract || `Alimento naturale utilizzato nelle preparazioni alimentari della dieta.`,
      description: wikiDescription || (curatedData ? curatedData.info.category : undefined),
      thumbnailUrl: wikiThumb,
      wikiUrl: wikiPageUrl,
      nutrients: curatedData ? curatedData.info : undefined,
      source,
      isOfflineFallback: source === 'Database Nutrizionale Chelona'
    };

    // Salva in cache
    this.cache.set(clean, detail);
    try {
      localStorage.setItem(cacheKey, JSON.stringify(detail));
    } catch {
      // LocalStorage pieno, ignora
    }

    return detail;
  }
}

export const foodWikiService = new FoodWikiService();
