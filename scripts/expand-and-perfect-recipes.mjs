import fs from 'fs';
import path from 'path';
import { getExactPhotoForDish, SPECIFIC_DISH_IMAGES } from './dish-photos.mjs';

const UNSPLASH_BASE = 'https://images.unsplash.com/';

// Heritage public-domain recipes to add
const HERITAGE_RECIPES = [
  // 🇮🇹 ITALIA - SPECIALITÀ REGIONALI
  {
    id: 'it_reg_ossobuco_milanese',
    title: 'Ossobuco alla Milanese con Gremolada',
    nome: 'Ossobuco alla Milanese con Gremolada',
    category: 'Secondi',
    categoria: 'Secondi',
    country: 'Italia',
    countryCode: 'IT',
    flag: '🇮🇹',
    image: `${UNSPLASH_BASE}photo-1544025162-d76694265947?w=800`,
    calories: 580,
    protein: 48,
    carbs: 8,
    fat: 36,
    tags: ['Italia', 'Lombardia', 'Secondi', 'Carne', 'Tradizione'],
    ingredients: [
      '4 fette di ossobuco di vitello (con midollo intatto)',
      '1 cipolla bionda tritata fine',
      '50g burro e 2 cucchiai olio EVO',
      '1 bicchiere vino bianco secco',
      '500ml brodo di carne caldo',
      'Farina 00 q.b. per infarinare',
      'Scorza grattugiata di 1 limone non trattato',
      '1 ciuffo di prezzemolo fresco tritato',
      '1 spicchio d\'aglio tritato fine',
      'Sale fino e pepe nero macinato q.b.'
    ],
    ingredienti: [
      '4 fette di ossobuco di vitello (con midollo intatto)',
      '1 cipolla bionda tritata fine',
      '50g burro e 2 cucchiai olio EVO',
      '1 bicchiere vino bianco secco',
      '500ml brodo di carne caldo',
      'Farina 00 q.b. per infarinare',
      'Scorza grattugiata di 1 limone non trattato',
      '1 ciuffo di prezzemolo fresco tritato',
      '1 spicchio d\'aglio tritato fine',
      'Sale fino e pepe nero macinato q.b.'
    ],
    steps: [
      'Incidi i bordi esterni degli ossibuchi con delle forbici per evitare che si arriccino in cottura.',
      'Infarina leggermente la carne eliminando la farina in eccesso.',
      'In una casseruola ampia sciogli il burro con l\'olio EVO e rosola la cipolla tritata a fuoco dolce.',
      'Aggiungi gli ossibuchi e falli dorare uniformemente da entrambi i lati per circa 4 minuti per lato.',
      'Sfuma a fiamma vivace con il vino bianco e lascia evaporare l\'alcol.',
      'Regola di sale e pepe, copri a filo con brodo caldo, metti il coperchio e cuoci a fuoco lentissimo per circa 1 ora e mezza fino a rendere la carne tenerissima.',
      'Prepara la gremolada tritando insieme prezzemolo, aglio e scorza di limone, e aggiungila in casseruola negli ultimi 5 minuti prima di servire caldo.'
    ],
    procedimento: 'Incidi i bordi degli ossibuchi, infarina e rosola in casseruola con burro e cipolla.\nSfuma col vino bianco, aggiungi brodo caldo e cuoci coperto a fuoco dolce per 90 minuti.\nUnisci la gremolada di prezzemolo, aglio e scorza di limone negli ultimi 5 minuti.'
  },
  {
    id: 'it_reg_ribollita_toscana',
    title: 'Ribollita Tradizionale Toscana',
    nome: 'Ribollita Tradizionale Toscana',
    category: 'Primi',
    categoria: 'Primi',
    country: 'Italia',
    countryCode: 'IT',
    flag: '🇮🇹',
    image: `${UNSPLASH_BASE}photo-1547592166-23ac45744acd?w=800`,
    calories: 390,
    protein: 16,
    carbs: 62,
    fat: 9,
    tags: ['Italia', 'Toscana', 'Primi', 'Zuppa', 'Legumi', 'Tradizione'],
    ingredients: [
      '300g fagioli cannellini secchi (ammollati e lessati)',
      '1 mazzo cavolo nero toscano',
      '1/2 verza riccia',
      '1 mazzo bietole a coste',
      '1 cipolla, 1 carota, 1 costa di sedano',
      '2 patate medie a cubetti',
      '2 cucchiai concentrato di pomodoro',
      '250g pane toscano raffermo cotto a legna',
      'Olio extravergine d\'oliva toscano q.b.',
      'Sale, pepe e rametti di timo'
    ],
    ingredienti: [
      '300g fagioli cannellini secchi (ammollati e lessati)',
      '1 mazzo cavolo nero toscano',
      '1/2 verza riccia',
      '1 mazzo bietole a coste',
      '1 cipolla, 1 carota, 1 costa di sedano',
      '2 patate medie a cubetti',
      '2 cucchiai concentrato di pomodoro',
      '250g pane toscano raffermo cotto a legna',
      'Olio extravergine d\'oliva toscano q.b.',
      'Sale, pepe e rametti di timo'
    ],
    steps: [
      'Frulla metà dei fagioli cannellini lessati tenendo da parte l\'acqua di cottura.',
      'In una pentola di coccio rosola un soffritto di cipolla, carota e sedano in abbondante olio EVO.',
      'Aggiungi le patate a dadini, il cavolo nero spezzettato, la verza e le bietole a listarelle.',
      'Unisci il pomodoro concentrato sciolto in poca acqua calda e copri le verdure con il brodo di fagioli.',
      'Cuoci a fuoco lento per circa 1 ora finché le verdure non saranno morbidissime.',
      'Aggiungi la crema di fagioli e i fagioli interi rimasti.',
      'In una pirofila alterna strati di pane raffermo a fette sottili con mestoli di zucca e verdure calde. Fai riposare qualche ora e ribolli in padella con un filo d\'olio crudo prima di servire.'
    ],
    procedimento: 'Soffriggi odori con olio EVO in coccio, unisci cavolo nero, verza, bietole e patate.\nCopri con brodo di fagioli e cuoci per 1 ora.\nUnisci cannellini interi e frullati.\nAlterna a strati con pane toscano raffermo, lascia riposare e "ribolli" prima di servire con olio crudo.'
  },
  {
    id: 'it_reg_caciucco_livornese',
    title: 'Cacciucco alla Livornese Tradizionale',
    nome: 'Cacciucco alla Livornese Tradizionale',
    category: 'Secondi',
    categoria: 'Secondi',
    country: 'Italia',
    countryCode: 'IT',
    flag: '🇮🇹',
    image: `${UNSPLASH_BASE}photo-1547592166-23ac45744acd?w=800`,
    calories: 460,
    protein: 44,
    carbs: 28,
    fat: 14,
    tags: ['Italia', 'Toscana', 'Pesce', 'Zuppa', 'Secondi'],
    ingredients: [
      '400g polpo verace e seppie a pezzi',
      '300g palombo o nocciolo a tranci',
      '300g scorfano e gallinella da zuppa',
      '200g cicale di mare (canocchie)',
      '200g cozze sgusciate',
      '500g pomodori pelati passati',
      '1 bicchiere vino rosso corposo',
      'Peperoncino piccante e 3 spicchi d\'aglio',
      'Fette di pane toscano tostate e agliate'
    ],
    ingredienti: [
      '400g polpo verace e seppie a pezzi',
      '300g palombo o nocciolo a tranci',
      '300g scorfano e gallinella da zuppa',
      '200g cicale di mare (canocchie)',
      '200g cozze sgusciate',
      '500g pomodori pelati passati',
      '1 bicchiere vino rosso corposo',
      'Peperoncino piccante e 3 spicchi d\'aglio',
      'Fette di pane toscano tostate e agliate'
    ],
    steps: [
      'In un tegame di coccio rosola l\'aglio con peperoncino e abbondante olio EVO.',
      'Aggiungi per primi il polpo e le seppie tagliati a tocchetti, lasciandoli rosolare per 10 minuti.',
      'Sfuma col vino rosso a fuoco vivo fino a completa evaporazione.',
      'Aggiungi la passata di pomodoro e cuoci a fuoco dolce per 40 minuti aggiungendo acqua calda se necessario.',
      'Unisci i pesci a tranci (scorfano, palombo) e le cicale di mare, cuocendo altri 15 minuti senza mescolare con cucchiaio ma muovendo il tegame.',
      'Completa con le cozze negli ultimi 5 minuti finché non si aprono.',
      'Servi ben caldo versando la zuppa su fette di pane toscano tostato e strofinato generosamente d\'aglio fresco.'
    ],
    procedimento: 'Rosola aglio, olio e peperoncino; unisci polpo e seppie e sfuma col vino rosso.\nAggiungi pomodoro e stufa per 40 minuti.\nUnisci i pesci da taglio, le cicale e infine le cozze.\nServi nei cocci con pane toscano tostato all\'aglio.'
  },
  {
    id: 'it_reg_spaghetti_assassina',
    title: 'Spaghetti all\'Assassina Baresi',
    nome: 'Spaghetti all\'Assassina Baresi',
    category: 'Primi',
    categoria: 'Primi',
    country: 'Italia',
    countryCode: 'IT',
    flag: '🇮🇹',
    image: `${UNSPLASH_BASE}photo-1551183053-bf91a1d81141?w=800`,
    calories: 480,
    protein: 14,
    carbs: 76,
    fat: 14,
    tags: ['Italia', 'Puglia', 'Primi', 'Pasta', 'Piccante', 'Tradizione'],
    ingredients: [
      '320g spaghetti di grano duro trafilati al bronzo crudi',
      '150g passata di pomodoro densa',
      '2 cucchiai concentrato doppio di pomodoro',
      '800ml brodo leggero di pomodoro caldo',
      '3 spicchi d\'aglio tritati',
      '2 peperoncini piccanti freschi o secchi sbriciolati',
      '60ml olio extravergine d\'oliva pugliese'
    ],
    ingredienti: [
      '320g spaghetti di grano duro trafilati al bronzo crudi',
      '150g passata di pomodoro densa',
      '2 cucchiai concentrato doppio di pomodoro',
      '800ml brodo leggero di pomodoro caldo',
      '3 spicchi d\'aglio tritati',
      '2 peperoncini piccanti freschi o secchi sbriciolati',
      '60ml olio extravergine d\'oliva pugliese'
    ],
    steps: [
      'In una padella di ferro pesante versa l\'olio EVO con l\'aglio e il peperoncino.',
      'Fai soffriggere a calore moderato finché l\'aglio non prende colore senza bruciare.',
      'Aggiungi la passata di pomodoro e fai sfrigolare a fiamma viva per 2 minuti.',
      'Metti gli spaghetti crudi direttamente nella padella, distribuendoli a ventaglio.',
      'Lascia tostare la pasta a fuoco alto finché non inizia ad attaccarsi e a bruciacchiarsi leggermente creando una crosticina croccante caratteristica.',
      'Gira delicatamente la pasta con una spatola e bagna poco alla volta col brodo di pomodoro caldo come se fosse un risotto.',
      'Prosegui la cottura "risottando" e lasciando asciugare finché gli spaghetti non risultano cotti, filanti e intensamente croccanti e piccanti.'
    ],
    procedimento: 'In padella di ferro soffriggi aglio, olio e peperoncino con passata di pomodoro.\nDisponi gli spaghetti crudi e falli tostare fino a formare la crosticina bruciacchiata.\nRisotta versando il brodo caldo di pomodoro finché gli spaghetti non saranno cotti e croccanti.'
  },
  {
    id: 'it_reg_tiella_barese',
    title: 'Tiella Barese (Riso, Patate e Cozze)',
    nome: 'Tiella Barese (Riso, Patate e Cozze)',
    category: 'Primi',
    categoria: 'Primi',
    country: 'Italia',
    countryCode: 'IT',
    flag: '🇮🇹',
    image: `${UNSPLASH_BASE}photo-1563379091339-03b21ab4a4f8?w=800`,
    calories: 520,
    protein: 26,
    carbs: 68,
    fat: 16,
    tags: ['Italia', 'Puglia', 'Primi', 'Riso', 'Pesce', 'Forno'],
    ingredients: [
      '300g riso Carnaroli o Arborio',
      '1 kg cozze fresche aperte a metà guscio',
      '600g patate a pasta gialla tagliate a fette sottili',
      '300g pomodorini ciliegino maturi a spicchi',
      '1 cipolla bianca affettata sottile',
      '50g pecorino romano grattugiato',
      '1 ciuffo di prezzemolo fresco tritato',
      '2 spicchi d\'aglio tritati',
      'Olio extravergine d\'oliva pugliese q.b.',
      'Acqua delle cozze filtrata e sale q.b.'
    ],
    ingredienti: [
      '300g riso Carnaroli o Arborio',
      '1 kg cozze fresche aperte a metà guscio',
      '600g patate a pasta gialla tagliate a fette sottili',
      '300g pomodorini ciliegino maturi a spicchi',
      '1 cipolla bianca affettata sottile',
      '50g pecorino romano grattugiato',
      '1 ciuffo di prezzemolo fresco tritato',
      '2 spicchi d\'aglio tritati',
      'Olio extravergine d\'oliva pugliese q.b.',
      'Acqua delle cozze filtrata e sale q.b.'
    ],
    steps: [
      'Ungi con olio EVO il fondo di una teglia rotonda (tiella) e fai un primo strato con cipolle affettate e pezzetti di pomodoro.',
      'Disponi uno strato ordinato di fette di patate spolverando con pecorino, aglio e prezzemolo.',
      'Disponi le cozze col mezzo guscio rivolto verso l\'alto in cerchi concentrici.',
      'Distribuisci il riso crudo a pioggia dentro le valve delle cozze e nelle fessure.',
      'Condisci con altro prezzemolo, aglio, pecorino e un filo d\'olio.',
      'Copri con un ultimo strato compatto di fette di patate, pomodorini e pecorino.',
      'Versa delicatamente lungo il bordo l\'acqua delle cozze filtrata fino a lambire l\'ultimo strato.',
      'Inforna a 200°C per 45-50 minuti finché le patate in superficie non formano una crosticina dorata e il riso ha assorbito il liquido.'
    ],
    procedimento: 'In una teglia componi a strati: cipolle e pomodorini, patate a fette sottili con pecorino ed erbe.\nDisponi le cozze aperte col guscio, versa il riso crudo sopra.\nChiudi con un ultimo strato di patate, formaggio e pomodorini.\nVersa acqua delle cozze e cuoci in forno a 200°C per 45 minuti.'
  },
  {
    id: 'it_reg_trofie_pesto_pra',
    title: 'Trofie Liguri al Pesto Fresco di Prà con Patate e Fagiolini',
    nome: 'Trofie Liguri al Pesto Fresco di Prà con Patate e Fagiolini',
    category: 'Primi',
    categoria: 'Primi',
    country: 'Italia',
    countryCode: 'IT',
    flag: '🇮🇹',
    image: `${UNSPLASH_BASE}photo-1598866594230-a7c12756260f?w=800`,
    calories: 510,
    protein: 15,
    carbs: 66,
    fat: 22,
    tags: ['Italia', 'Liguria', 'Primi', 'Pasta', 'Pesto', 'Vegetariano'],
    ingredients: [
      '350g trofie fresche liguri',
      '60g foglie di basilico genovese DOP fresco',
      '30g pinoli pisani di prima scelta',
      '60g Parmigiano Reggiano DOP 24 mesi grattugiato',
      '30g Pecorino Sardo DOP grattugiato',
      '1 spicchio d\'aglio di Vessalico privo dell\'anima',
      '80ml olio extravergine d\'oliva ligure dolce (Taggiasco)',
      '1 pizzico di sale grosso marino',
      '1 patata media pelata e tagliata a tocchetti',
      '100g fagiolini freschi spuntati e tagliati a metà'
    ],
    ingredienti: [
      '350g trofie fresche liguri',
      '60g foglie di basilico genovese DOP fresco',
      '30g pinoli pisani di prima scelta',
      '60g Parmigiano Reggiano DOP 24 mesi grattugiato',
      '30g Pecorino Sardo DOP grattugiato',
      '1 spicchio d\'aglio di Vessalico privo dell\'anima',
      '80ml olio extravergine d\'oliva ligure dolce (Taggiasco)',
      '1 pizzico di sale grosso marino',
      '1 patata media pelata e tagliata a tocchetti',
      '100g fagiolini freschi spuntati e tagliati a metà'
    ],
    steps: [
      'Pesta nel mortaio di marmo con pestello di legno l\'aglio e i pinoli con qualche grano di sale grosso.',
      'Aggiungi gradualmente le foglie di basilico fresco lavate e asciugate delicatamente, pestando con movimento rotatorio continuo contro le pareti del mortaio.',
      'Incorpora i formaggi grattugiati e versa l\'olio EVO a filo fino a ottenere una crema densa e vellutata di colore verde brillante.',
      'In una pentola di abbondante acqua bollente salata cala prima i fagiolini e i cubetti di patata.',
      'Dopo 5 minuti di cottura aggiungi le trofie fresche nella stessa pentola e cuoci per 4 minuti.',
      'Scola pasta, patate e fagiolini tenendo da parte mezza tazzina di acqua di cottura.',
      'Trasferisci in una zuppiera, unisci il pesto fresco stemperato con un cucchiaio d\'acqua di cottura, amalgama delicatamente a crudo e servi subito.'
    ],
    procedimento: 'Pesta al mortaio aglio, pinoli, basilico genovese DOP, pecorino, parmigiano e olio EVO a filo.\nLessa patate e fagiolini insieme nell\'acqua della pasta, cala poi le trofie fresche.\nScola e manteca fuori dal fuoco con il pesto a crudo.'
  },
  {
    id: 'it_reg_vitello_tonnato_tradizionale',
    title: 'Vitello Tonnato della Tradizione Piemontese all\'Antica',
    nome: 'Vitello Tonnato della Tradizione Piemontese all\'Antica',
    category: 'Secondi',
    categoria: 'Secondi',
    country: 'Italia',
    countryCode: 'IT',
    flag: '🇮🇹',
    image: `${UNSPLASH_BASE}photo-1544025162-d76694265947?w=800`,
    calories: 440,
    protein: 48,
    carbs: 4,
    fat: 26,
    tags: ['Italia', 'Piemonte', 'Secondi', 'Carne', 'Tradizione', 'Antipasti'],
    ingredients: [
      '800g magatello o girello di vitello legato',
      '1 cipolla chiodata con 2 chiodi di garofano',
      '1 carota e 1 costa di sedano',
      '1 foglia di alloro',
      '1 bicchiere di vino bianco secco piemontese (Cortese o Arneis)',
      '160g tonno sott\'olio sgocciolato di qualità',
      '4 filetti di acciughe dissalate',
      '20g capperi sott\'aceto dissalati',
      '3 tuorli d\'uovo sodo',
      'Olio extravergine d\'oliva e poco brodo di cottura filtrato'
    ],
    ingredienti: [
      '800g magatello o girello di vitello legato',
      '1 cipolla chiodata con 2 chiodi di garofano',
      '1 carota e 1 costa di sedano',
      '1 foglia di alloro',
      '1 bicchiere di vino bianco secco piemontese (Cortese o Arneis)',
      '160g tonno sott\'olio sgocciolato di qualità',
      '4 filetti di acciughe dissalate',
      '20g capperi sott\'aceto dissalati',
      '3 tuorli d\'uovo sodo',
      'Olio extravergine d\'oliva e poco brodo di cottura filtrato'
    ],
    steps: [
      'In una casseruola metti il vitello con le verdure aromatiche, alloro, vino bianco e copri con acqua fredda.',
      'Porta a ebollizione, sala leggermente e fai sobbollire a fuoco bassissimo per circa 50 minuti fino a temperatura interna di 60°C al cuore.',
      'Fai raffreddare completamente la carne immersa nel suo brodo per mantenerla morbida e succosa.',
      'Prepara la salsa all\'antica: nel mixer frulla i tuorli sodi con il tonno, le acciughe e metà dei capperi, versando olio EVO a filo e qualche cucchiaio di brodo filtrato fino a consistenza vellutata.',
      'Taglia il girello freddo a fette sottilissime con un\'affettatrice o un coltello a lama liscia.',
      'Disponi le fette su un piatto da portata, nappa generosamente con la salsa tonnata e guarnisci con capperi interi e zeste di limone. Fai riposare in frigo 1 ora prima di servire.'
    ],
    procedimento: 'Lessa il girello di vitello con odori, alloro e vino bianco per 50 minuti.\nFai raffreddare la carne nel suo brodo.\nFrulla tuorli sodi, tonno, acciughe, capperi, olio e brodo per la salsa tonnata tradizionale senza maionese.\nAffetta sottile e vela di salsa.'
  },
  {
    id: 'it_reg_arrosticini_abruzzesi',
    title: 'Arrosticini Abruzzesi Tradizionali alla Brace',
    nome: 'Arrosticini Abruzzesi Tradizionali alla Brace',
    category: 'Secondi',
    categoria: 'Secondi',
    country: 'Italia',
    countryCode: 'IT',
    flag: '🇮🇹',
    image: `${UNSPLASH_BASE}photo-1529193591184-b1d58069ecdd?w=800`,
    calories: 470,
    protein: 42,
    carbs: 0,
    fat: 34,
    tags: ['Italia', 'Abruzzo', 'Secondi', 'Carne', 'Griglia', 'Tradizione'],
    ingredients: [
      '800g carne di pecora o castrato (taglio tenero alternato a cubetti di grasso nobile)',
      'Spiedini di legno di betulla da 20 cm',
      'Sale grosso macinato fresco q.b.',
      'Fette di pane casereccio abruzzese tostate',
      'Olio extravergine d\'oliva d\'Abruzzo e rametti di rosmarino'
    ],
    ingredienti: [
      '800g carne di pecora o castrato (taglio tenero alternato a cubetti di grasso nobile)',
      'Spiedini di legno di betulla da 20 cm',
      'Sale grosso macinato fresco q.b.',
      'Fette di pane casereccio abruzzese tostate',
      'Olio extravergine d\'oliva d\'Abruzzo e rametti di rosmarino'
    ],
    steps: [
      'Taglia la carne di pecora a cubetti uniformi di circa 1 cm di lato, lasciando una percentuale di grasso di circa il 25% per garantire morbidezza assoluta.',
      'Infila i cubetti negli spiedini di legno alternando un pezzetto di grasso ogni 3 pezzetti di magro.',
      'Accendi la tradizionale canalina abruzzese (furnacella) a carbone dolce fino a brace viva senza fiamma viva.',
      'Disponi gli spiedini sulla fornacella girandoli velocemente per circa 5-7 minuti affinché il grasso sciolto profumi la carne.',
      'Sala abbondantemente solo a fine cottura appena tolti dalla brace.',
      'Servi avvolti nel classico coccio o carta paglia, accompagnati da fette di pane unte con olio EVO e rosmarino.'
    ],
    procedimento: 'Infila carne e grasso di pecora a cubetti su spiedini di legno.\nCuoci sulla fornacella a brace viva per circa 6 minuti girandoli spesso.\nSala solo a fine cottura e gusta caldissimi con pane casereccio all\'olio.'
  },
  {
    id: 'it_reg_caponata_siciliana',
    title: 'Caponata di Melanzane Siciliana alla Palermitana',
    nome: 'Caponata di Melanzane Siciliana alla Palermitana',
    category: 'Antipasti',
    categoria: 'Antipasti',
    country: 'Italia',
    countryCode: 'IT',
    flag: '🇮🇹',
    image: `${UNSPLASH_BASE}photo-1572449043416-55f4685c9bb7?w=800`,
    calories: 280,
    protein: 5,
    carbs: 32,
    fat: 16,
    tags: ['Italia', 'Sicilia', 'Antipasti', 'Verdure', 'Agrodolce', 'Tradizione'],
    ingredients: [
      '800g melanzane tonde viola a cubetti',
      '200g coste di sedano a tocchetti sbollentate',
      '1 cipolla dorata affettata',
      '150g passata di pomodoro fresco',
      '80g olive verdi denocciolate in salamoia',
      '40g capperi dissalati di Pantelleria',
      '30g pinoli tostati',
      '50ml aceto di vino bianco',
      '30g zucchero semolato per l\'agrodolce',
      'Olio EVO per friggere, sale e foglie di basilico'
    ],
    ingredienti: [
      '800g melanzane tonde viola a cubetti',
      '200g coste di sedano a tocchetti sbollentate',
      '1 cipolla dorata affettata',
      '150g passata di pomodoro fresco',
      '80g olive verdi denocciolate in salamoia',
      '40g capperi dissalati di Pantelleria',
      '30g pinoli tostati',
      '50ml aceto di vino bianco',
      '30g zucchero semolato per l\'agrodolce',
      'Olio EVO per friggere, sale e foglie di basilico'
    ],
    steps: [
      'Taglia le melanzane a cubi di 2 cm e friggile in abbondante olio EVO caldo finché non sono ben dorate, poi scolale su carta assorbente.',
      'Sbollenta il sedano in acqua salata per 4 minuti.',
      'In una padella stufa la cipolla con poco olio, unisci il sedano, le olive a rondelle e i capperi.',
      'Aggiungi la passata di pomodoro e cuoci per 10 minuti.',
      'Versa l\'aceto con lo zucchero mescolato bene e lascia sfumare a fiamma vivace l\'agrodolce.',
      'Unisci le melanzane fritte e i pinoli tostati, mescola delicatamente e spegni il fuoco.',
      'Fai riposare la caponata a temperatura ambiente per almeno 4 ore (o meglio fino al giorno successivo) prima di servire con foglie di basilico fresco.'
    ],
    procedimento: 'Friggi le melanzane a cubetti in olio EVO.\nStufa cipolla, sedano sbollentato, olive e capperi col pomodoro per 10 minuti.\nSfuma con aceto e zucchero per il perfetto agrodolce.\nUnisci le melanzane fritte, pinoli e fai riposare ore prima di servire.'
  },
  {
    id: 'it_reg_cannoli_siciliani',
    title: 'Cannoli Siciliani Tradizionali alla Ricotta di Pecora',
    nome: 'Cannoli Siciliani Tradizionali alla Ricotta di Pecora',
    category: 'Dolci',
    categoria: 'Dolci',
    country: 'Italia',
    countryCode: 'IT',
    flag: '🇮🇹',
    image: `${UNSPLASH_BASE}photo-1565958011703-44f9829ba187?w=800`,
    calories: 360,
    protein: 9,
    carbs: 42,
    fat: 18,
    tags: ['Italia', 'Sicilia', 'Dolci', 'Dessert', 'Tradizione'],
    ingredients: [
      '200g farina 00',
      '20g strutto morbido',
      '20g zucchero semolato',
      '1 cucchiaino di cacao amaro in polvere',
      '50ml vino Marsala secco',
      '1 cucchiaio aceto bianco',
      '600g ricotta di pecora fresca ben scolata',
      '200g zucchero a velo',
      '60g gocce di cioccolato fondente',
      'Scorze d\'arancia candite e granella di pistacchio di Bronte per guarnire',
      'Olio per friggere le scorze'
    ],
    ingredienti: [
      '200g farina 00',
      '20g strutto morbido',
      '20g zucchero semolato',
      '1 cucchiaino di cacao amaro in polvere',
      '50ml vino Marsala secco',
      '1 cucchiaio aceto bianco',
      '600g ricotta di pecora fresca ben scolata',
      '200g zucchero a velo',
      '60g gocce di cioccolato fondente',
      'Scorze d\'arancia candite e granella di pistacchio di Bronte per guarnire',
      'Olio per friggere le scorze'
    ],
    steps: [
      'Impasta farina, strutto, cacao, zucchero, marsala e aceto fino ad ottenere un panetto sodo e liscio.',
      'Fai riposare l\'impasto in frigo avvolto in pellicola per 1 ora.',
      'Stendi la pasta sottilissima (1 mm), ricava dei cerchi ovali e avvolgili intorno ai cilindri metallici spennellando la giunzione con poco albume.',
      'Friggi le cialde in olio caldo a 175°C per circa 1 minuto finché non si formano le tipiche bolle dorate e friabili.',
      'Scola su carta assorbente e sfila i cannelli metallici quando sono tiepidi.',
      'Setaccia la ricotta di pecora con lo zucchero a velo due volte, quindi incorpora le gocce di cioccolato fondente.',
      'Farcisci le cialde con la crema di ricotta solo poco prima di servire per mantenere la cialda croccante, e guarnisci con scorzette d\'arancia e pistacchio.'
    ],
    procedimento: 'Impasta e stendi la sfoglia sottile con Marsala e cacao, avvolgi sui tubi metallici e friggi fino alle bolle caratteristiche.\nSetaccia la ricotta di pecora con zucchero a velo e gocce di cioccolato.\nFarcisci al momento del servizio e rifinisci con pistacchi e arancia candita.'
  },

  // 🌍 CUCINE DAL MONDO - SPECIALITÀ INTERNAZIONALI
  {
    id: 'world_th_tom_yum_goong',
    title: 'Tom Yum Goong Tradizionale Thailandese con Gamberi e Lemongrass',
    nome: 'Tom Yum Goong Tradizionale Thailandese con Gamberi e Lemongrass',
    category: 'Cucine dal Mondo',
    categoria: 'Cucine dal Mondo',
    country: 'Thailandia',
    countryCode: 'TH',
    flag: '🇹🇭',
    image: `${UNSPLASH_BASE}photo-1547592166-23ac45744acd?w=800`,
    calories: 310,
    protein: 28,
    carbs: 12,
    fat: 8,
    tags: ['Thailandia', 'Zuppa', 'Gamberi', 'Speziato', 'Cucine dal Mondo'],
    ingredients: [
      '300g gamberi tigre freschi con guscio e testa',
      '750ml brodo di pesce o dashi leggero',
      '2 gambi di lemongrass (citronella) schiacciati e tagliati a rondelle',
      '4 foglie di kaffir lime spezzate a mano',
      '3 cm di galanga o zenzero fresco a fettine',
      '150g funghi paglia o champignon a quarti',
      '2 cucchiai salsa di pesce (Nam Pla)',
      '2 cucchiai succo di lime fresco spremuto',
      '1 cucchiaio pasta di peperoncino thai (Nam Prik Pao)',
      'Peperoncini freschi thai (bird\'s eye) e coriandolo fresco per servire'
    ],
    ingredienti: [
      '300g gamberi tigre freschi con guscio e testa',
      '750ml brodo di pesce o dashi leggero',
      '2 gambi di lemongrass (citronella) schiacciati e tagliati a rondelle',
      '4 foglie di kaffir lime spezzate a mano',
      '3 cm di galanga o zenzero fresco a fettine',
      '150g funghi paglia o champignon a quarti',
      '2 cucchiai salsa di pesce (Nam Pla)',
      '2 cucchiai succo di lime fresco spremuto',
      '1 cucchiaio pasta di peperoncino thai (Nam Prik Pao)',
      'Peperoncini freschi thai (bird\'s eye) e coriandolo fresco per servire'
    ],
    steps: [
      'Pulisci i gamberi togliendo il budello ma conservando teste e gusci per insaporire il brodo.',
      'Porta a ebollizione il brodo con lemongrass, galanga e foglie di kaffir lime lasciando sobbollire per 5 minuti a fuoco medio per rilasciare tutti gli oli essenziali profumati.',
      'Aggiungi i funghi a pezzi e la pasta di peperoncino Nam Prik Pao mescolando fino a scioglierla.',
      'Tuffa i gamberi e cuocili per non più di 2-3 minuti finché diventano rosa e teneri.',
      'Spegni il fuoco e condisci con la salsa di pesce e il succo di lime fresco.',
      'Servi nei piatti con peperoncino affettato e abbondante coriandolo fresco tritato.'
    ],
    procedimento: 'Bollisci il brodo profumato con lemongrass, kaffir lime e galanga.\nUnisci i funghi e la pasta di peperoncino Nam Prik Pao.\nCuoci i gamberi per 2 minuti a fiamma viva.\nSpegni, condisci con succo di lime fresco e salsa di pesce, e servi con coriandolo.'
  },
  {
    id: 'world_pe_ceviche_classico',
    title: 'Ceviche Classico Peruviano con Leche de Tigre',
    nome: 'Ceviche Classico Peruviano con Leche de Tigre',
    category: 'Cucine dal Mondo',
    categoria: 'Cucine dal Mondo',
    country: 'Perù',
    countryCode: 'PE',
    flag: '🇵🇪',
    image: `${UNSPLASH_BASE}photo-1519708227418-c8fd9a32b7a2?w=800`,
    calories: 290,
    protein: 34,
    carbs: 22,
    fat: 5,
    tags: ['Perù', 'Pesce', 'Fresco', 'Lime', 'Cucine dal Mondo'],
    ingredients: [
      '400g filetto di corvina fresca o orata abbattuta',
      'Succo di 6-8 lime freschi spremuti delicatamente a mano',
      '1 peperoncino ají limo o ají amarillo tritato fine',
      '1 cipolla rossa tagliata a piuma (julienne fine) e sciacquata in acqua ghiacciata',
      '1 ciuffo di coriandolo fresco tritato',
      '1 patata dolce (camote) lessata e affettata',
      '50g mais tostato peruviano (cancha serrana)',
      '1 spicchio d\'aglio grattugiato e 1 tocchetto di zenzero pressato',
      'Sale fino q.b.'
    ],
    ingredienti: [
      '400g filetto di corvina fresca o orata abbattuta',
      'Succo di 6-8 lime freschi spremuti delicatamente a mano',
      '1 peperoncino ají limo o ají amarillo tritato fine',
      '1 cipolla rossa tagliata a piuma (julienne fine) e sciacquata in acqua ghiacciata',
      '1 ciuffo di coriandolo fresco tritato',
      '1 patata dolce (camote) lessata e affettata',
      '50g mais tostato peruviano (cancha serrana)',
      '1 spicchio d\'aglio grattugiato e 1 tocchetto di zenzero pressato',
      'Sale fino q.b.'
    ],
    steps: [
      'Taglia il pesce abbattuto a cubetti di circa 1,5 cm e mettili in una ciotola di vetro fredda.',
      'Sala il pesce mescolando per 1 minuto per favorire l\'apertura delle fibre.',
      'Aggiungi aglio, zenzero grattugiato e l\'ají limo tritato.',
      'Spremi i lime a mano senza strizzare fino alla scorza per evitare il sapore amaro, e versa il succo sul pesce.',
      'Aggiungi la cipolla rossa sfogliata e il coriandolo, mescolando delicatamente per 2 minuti finché il pesce non assume una velatura opaca.',
      'Servi immediatamente accompagnato dalle fette di camote (patata dolce) e chicchi di mais cancha tostato.'
    ],
    procedimento: 'Taglia il pesce fresco a cubetti e sala delicatamente.\nUnisci ají limo, aglio, zenzero e succo di lime fresco appena spremuto.\nMescola con cipolla rossa a piuma e coriandolo.\nServi all\'istante con patata dolce lessata e mais cancha croccante.'
  },
  {
    id: 'world_fr_boeuf_bourguignon',
    title: 'Boeuf Bourguignon Tradizionale alla Borgognona',
    nome: 'Boeuf Bourguignon Tradizionale alla Borgognona',
    category: 'Cucine dal Mondo',
    categoria: 'Cucine dal Mondo',
    country: 'Francia',
    countryCode: 'FR',
    flag: '🇫🇷',
    image: `${UNSPLASH_BASE}photo-1544025162-d76694265947?w=800`,
    calories: 610,
    protein: 48,
    carbs: 16,
    fat: 38,
    tags: ['Francia', 'Carne', 'Secondi', 'Vino', 'Cucine dal Mondo'],
    ingredients: [
      '800g spalla o campanello di manzo a bocconcini da 4 cm',
      '150g lardo affumicato a listarelle',
      '750ml vino rosso di Borgogna (Pinot Nero corposo)',
      '300ml brodo di manzo scuro',
      '2 carote e 1 cipolla a dadoni',
      '200g cipolline borettane sbucciate',
      '250g funghi champignon a quarti',
      '2 cucchiai concentrato di pomodoro',
      '30g farina 00 e bouquet garni (timo, alloro, prezzemolo)',
      'Burro e olio EVO per dorare'
    ],
    ingredienti: [
      '800g spalla o campanello di manzo a bocconcini da 4 cm',
      '150g lardo affumicato a listarelle',
      '750ml vino rosso di Borgogna (Pinot Nero corposo)',
      '300ml brodo di manzo scuro',
      '2 carote e 1 cipolla a dadoni',
      '200g cipolline borettane sbucciate',
      '250g funghi champignon a quarti',
      '2 cucchiai concentrato di pomodoro',
      '30g farina 00 e bouquet garni (timo, alloro, prezzemolo)',
      'Burro e olio EVO per dorare'
    ],
    steps: [
      'In una casseruola di ghisa rosola il lardo con un filo d\'olio finché diventa croccante, poi prelevalo tenendolo da parte.',
      'Nel grasso fuso rosola i bocconcini di manzo a fiamma vivace su tutti i lati finché formano una crosticina scura dorata.',
      'Togli la carne e rosola cipolla e carote per 4 minuti.',
      'Rimetti carne e lardo in casseruola, spolvera con la farina e mescola 2 minuti per tostare.',
      'Versa l\'intera bottiglia di vino rosso e il brodo di carne fino a coprire.',
      'Aggiungi concentrato di pomodoro, bouquet garni, sale e pepe. Copri e stufa in forno a 160°C o a fuoco lentissimo per circa 2 ore e mezza.',
      'Nel frattempo salta a parte i funghi e le cipolline nel burro, e uniscili alla carne negli ultimi 25 minuti di cottura fino a ottenere una salsa scura e vellutata.'
    ],
    procedimento: 'Rosola lardo e bocconcini di manzo in coccio di ghisa.\nTosta con poca farina, versa una bottiglia di vino rosso di Borgogna e brodo di manzo.\nAggiungi bouquet garni e stufa coperto per 2 ore e mezza.\nUnisci cipolline e champignon trifolati e servi caldo.'
  },
  {
    id: 'world_gb_fish_and_chips',
    title: 'Fish and Chips Tradizionale Britannico con Salsa Tartara',
    nome: 'Fish and Chips Tradizionale Britannico con Salsa Tartara',
    category: 'Cucine dal Mondo',
    categoria: 'Cucine dal Mondo',
    country: 'Regno Unito',
    countryCode: 'GB',
    flag: '🇬🇧',
    image: `${UNSPLASH_BASE}photo-1519708227418-c8fd9a32b7a2?w=800`,
    calories: 650,
    protein: 36,
    carbs: 62,
    fat: 28,
    tags: ['Regno Unito', 'Pesce', 'Fritti', 'Street Food', 'Cucine dal Mondo'],
    ingredients: [
      '600g filetti spessi di merluzzo fresco o eglefino (cod or haddock)',
      '800g patate a pasta farinosa (tagliate a bastoncini spessi)',
      '200g farina 00',
      '1 cucchiaino di lievito istantaneo',
      '250ml birra chiara freddissima o ale frizzante',
      'Olio di semi d\'arachidi per friggere',
      'Sale grosso e aceto di malto per condire',
      'Salsa tartara e piselli schiacciati (mushy peas) per servire'
    ],
    ingredienti: [
      '600g filetti spessi di merluzzo fresco o eglefino (cod or haddock)',
      '800g patate a pasta farinosa (tagliate a bastoncini spessi)',
      '200g farina 00',
      '1 cucchiaino di lievito istantaneo',
      '250ml birra chiara freddissima o ale frizzante',
      'Olio di semi d\'arachidi per friggere',
      'Sale grosso e aceto di malto per condire',
      'Salsa tartara e piselli schiacciati (mushy peas) per servire'
    ],
    steps: [
      'Lava e taglia le patate a bastoni spessi, sbollentale per 4 minuti in acqua salata, scolale e asciugale bene.',
      'Prepara la pastella mescolando farina, lievito, pizzico di sale e birra ghiacciata fino a consistenza fluida e spumosa.',
      'Prima frittura patate: cuoci i bastoncini d\'olio a 140°C per 5 minuti senza farli scurire, poi scolali.',
      'Infarina leggermente i filetti di merluzzo, immergili nella pastella alla birra e calali nell\'olio caldo a 180°C.',
      'Friggi il pesce per 5-6 minuti girandolo finché la crosta non risulta gonfia, doratissima e incredibilmente croccante.',
      'Seconda frittura patate: tuffale per 2 minuti a 190°C fino a perfetta croccantezza dorata.',
      'Scola su carta paglia, sala generosamente e servi con salsa tartara, spicchi di limone e aceto di malto.'
    ],
    procedimento: 'Prepara la pastella spumosa con farina e birra ghiacciata.\nFai la doppia frittura delle patate tagliate spesse.\nInfarina i filetti di merluzzo, passa nella pastella e friggi a 180°C fino a doratura croccante.\nServi con salsa tartara e spicchi di limone.'
  },
  {
    id: 'world_jp_yakitori_pollo',
    title: 'Yakitori Spiedini di Pollo Giapponesi Glassati alla Salsa Tare',
    nome: 'Yakitori Spiedini di Pollo Giapponesi Glassati alla Salsa Tare',
    category: 'Cucine dal Mondo',
    categoria: 'Cucine dal Mondo',
    country: 'Giappone',
    countryCode: 'JP',
    flag: '🇯🇵',
    image: `${UNSPLASH_BASE}photo-1598515214211-89d3c73ae83b?w=800`,
    calories: 390,
    protein: 38,
    carbs: 14,
    fat: 18,
    tags: ['Giappone', 'Pollo', 'Spiedini', 'Griglia', 'Cucine dal Mondo'],
    ingredients: [
      '500g cosce di pollo disossate con la pelle tagliate a bocconcini',
      '3 cipollotti freschi tagliati a cilindri da 3 cm (Negima)',
      '100ml salsa di soia giapponese',
      '80ml mirin',
      '50ml sakè per cucinare',
      '2 cucchiai zucchero di canna',
      'Spiedini di bambù messi a bagno in acqua per 30 minuti'
    ],
    ingredienti: [
      '500g cosce di pollo disossate con la pelle tagliate a bocconcini',
      '3 cipollotti freschi tagliati a cilindri da 3 cm (Negima)',
      '100ml salsa di soia giapponese',
      '80ml mirin',
      '50ml sakè per cucinare',
      '2 cucchiai zucchero di canna',
      'Spiedini di bambù messi a bagno in acqua per 30 minuti'
    ],
    steps: [
      'In un pentolino prepara la salsa Tare riducendo soia, mirin, sakè e zucchero a fuoco dolce per 10 minuti fino a consistenza sciropposa e lucida.',
      'Infila negli spiedini alternando un bocconcino di pollo e un pezzo di cipollotto.',
      'Scalda una griglia o piastra in ghisa a temperatura vivace.',
      'Griglia gli spiedini per 4 minuti girandoli regolarmente.',
      'Spennella generosamente con la salsa Tare glassata su entrambi i lati continuando a grigliare per altri 2 minuti finché il pollo non è cotto e caramellato all\'esterno.',
      'Servi subito caldi spolverando con semi di sesamo tostato e shichimi togarashi (spezie giapponesi).'
    ],
    procedimento: 'Prepara la salsa tare riducendo soia, mirin, sakè e zucchero fino a sciroppo.\nInfilza pollo e cipollotti sugli spiedini di bambù.\nGriglia sulla piastra rovente spennellando ripetutamente con la salsa fino a caramellatura.'
  },
  {
    id: 'world_mx_tacos_pastor',
    title: 'Tacos al Pastor Messicani con Ananas e Cipolla',
    nome: 'Tacos al Pastor Messicani con Ananas e Cipolla',
    category: 'Cucine dal Mondo',
    categoria: 'Cucine dal Mondo',
    country: 'Messico',
    countryCode: 'MX',
    flag: '🇲🇽',
    image: `${UNSPLASH_BASE}photo-1565299585323-38d6b0865b47?w=800`,
    calories: 450,
    protein: 32,
    carbs: 38,
    fat: 18,
    tags: ['Messico', 'Tacos', 'Carne', 'Street Food', 'Cucine dal Mondo'],
    ingredients: [
      '500g lonza o capocollo di maiale a fette sottili',
      '2 cucchiai pasta di achiote',
      '2 peperoncini guajillo secchi reidratati',
      '100ml succo d\'arancia amara o ananas fresco',
      '2 cucchiai aceto di mele',
      '2 fette di ananas fresco a cubetti arrostiti',
      '12 tortillas di mais morbide',
      '1 cipolla bianca tritata e coriandolo fresco',
      'Spicchi di lime e salsa verde o roja'
    ],
    ingredienti: [
      '500g lonza o capocollo di maiale a fette sottili',
      '2 cucchiai pasta di achiote',
      '2 peperoncini guajillo secchi reidratati',
      '100ml succo d\'arancia amara o ananas fresco',
      '2 cucchiai aceto di mele',
      '2 fette di ananas fresco a cubetti arrostiti',
      '12 tortillas di mais morbide',
      '1 cipolla bianca tritata e coriandolo fresco',
      'Spicchi di lime e salsa verde o roja'
    ],
    steps: [
      'Frulla achiote, peperoncini guajillo ammorbiditi, succo di frutta, aceto, aglio e cumino fino a una marinata densa e rossa.',
      'Spennella la carne di maiale e lasciala marinare in frigo per almeno 4 ore.',
      'Cuoci le fette di carne su piastra rovente finché sono ben cotte e leggermente bruciacchiate, poi tritala al coltello.',
      'Griglia l\'ananas fino a caramellare i bordi e taglialo a piccoli tocchetti.',
      'Scalda le tortillas di mais sulla piastra.',
      'Farcisci ogni taco con la carne al pastor, ananas caramellato, cipolla bianca cruda e coriandolo tritato, terminando con qualche goccia di succo di lime fresco.'
    ],
    procedimento: 'Marina la carne di maiale in salsa rossa di achiote, guajillo e arancia.\nGriglia su piastra rovente e sminuzza al coltello.\nServi sulle tortillas calde con cubetti di ananas grigliato, cipolla, coriandolo e lime.'
  }
];

export function runFullExpansionAndAudit() {
  const filePath = path.join(process.cwd(), 'public', 'ricette_mondo.json');
  const raw = fs.readFileSync(filePath, 'utf-8');
  const recipes = JSON.parse(raw);
  console.log(`Original recipes count: ${recipes.length}`);

  // List of old generic fallback images that were overused 50-77 times
  const OVERUSED_GENERIC_IMAGES = new Set([
    'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=800',
    'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=800',
    'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=800',
    'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=800',
    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800'
  ]);

  let replacedCount = 0;
  const updatedRecipes = recipes.map(r => {
    const title = r.title || r.nome || '';
    const cat = r.category || r.categoria || 'Primi';
    
    // Check if the recipe uses one of the generic overused placeholders or has no image
    if (!r.image || OVERUSED_GENERIC_IMAGES.has(r.image) || r.image.includes('giallozafferano')) {
      const specificImg = getExactPhotoForDish(title, cat);
      if (specificImg !== r.image) {
        r.image = specificImg;
        replacedCount++;
      }
    }

    // Ensure all mirror fields are populated
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

    return r;
  });

  console.log(`Replaced ${replacedCount} generic placeholders with exact matching dish photos!`);

  // Append new heritage recipes if not already present
  const existingIds = new Set(updatedRecipes.map(r => r.id));
  const existingTitles = new Set(updatedRecipes.map(r => (r.title || '').toLowerCase().trim()));
  let addedHeritage = 0;

  for (const hr of HERITAGE_RECIPES) {
    if (!existingIds.has(hr.id) && !existingTitles.has(hr.title.toLowerCase().trim())) {
      updatedRecipes.push(hr);
      existingIds.add(hr.id);
      addedHeritage++;
    }
  }

  console.log(`Added ${addedHeritage} authentic traditional heritage recipes.`);
  console.log(`Total final recipes count: ${updatedRecipes.length}`);

  // Write to public/ricette_mondo.json
  fs.writeFileSync(filePath, JSON.stringify(updatedRecipes, null, 2), 'utf-8');

  // Also write to android assets if directory exists
  const androidAssetPath = path.join(process.cwd(), 'android', 'app', 'src', 'main', 'assets', 'public', 'ricette_mondo.json');
  if (fs.existsSync(path.dirname(androidAssetPath))) {
    fs.writeFileSync(androidAssetPath, JSON.stringify(updatedRecipes, null, 2), 'utf-8');
    console.log('✅ Synchronized android/app/src/main/assets/public/ricette_mondo.json');
  }

  console.log('✅ Expansion and audit complete!');
}

runFullExpansionAndAudit();
