import fs from 'fs';
import path from 'path';

export const UNSPLASH_BASE = 'https://images.unsplash.com/';

// Exact verified photo mappings (100% verified 200 HTTP OK)
export const SPECIFIC_DISH_IMAGES = [
  // 1. Eccezioni specifiche e piatti ad alto rischio di mismatch
  { regex: /zuppa inglese/i, img: 'photo-1551024601-bec78aea704b?w=800' },
  { regex: /pasta di mandorle|pizzicotti|amarett/i, img: 'photo-1582293041079-7814c2f12063?w=800' },
  { regex: /pasta choux|bign[eè]|profiterol/i, img: 'photo-1587314168485-3236d6710814?w=800' },
  { regex: /bastoncini di pasta sfoglia|sfogliatine/i, img: 'photo-1509440159596-0249088772ff?w=800' },
  { regex: /pasta sfoglia|pasta bris[eè]|pasta frolla|impasto/i, img: 'photo-1509440159596-0249088772ff?w=800' },
  { regex: /canederli|kn[öo]del/i, img: 'photo-1589301760014-d929f3979dbc?w=800' },
  { regex: /baba['’]?\s*al\s*rum|savarin/i, img: 'photo-1587314168485-3236d6710814?w=800' },
  { regex: /vin brul[eè]|mulled wine/i, img: 'photo-1543362906-acfc16c67564?w=800' },
  { regex: /golden milk|latte d['’]oro/i, img: 'photo-1544787219-7f47ccb76574?w=800' },
  { regex: /acqua aromatizzata|detox/i, img: 'photo-1556881286-fc6915169721?w=800' },
  { regex: /limonata|cedrata|citronette/i, img: 'photo-1513558161293-cdaf765ed2fd?w=800' },
  { regex: /insalata di mare|insalata.*polpo|polpo.*patate/i, img: 'photo-1559742811-822873691df8?w=800' },
  { regex: /moussaka|mousakas/i, img: 'photo-1574894709920-11b28e7367e3?w=800' },
  { regex: /giardiniera|sott['’]aceto|sottaceti/i, img: 'photo-1590080875515-8a3a8dc5735e?w=800' },
  { regex: /crescione|cassone/i, img: 'photo-1509440159596-0249088772ff?w=800' },
  { regex: /torta di patate|gateau|frico/i, img: 'photo-1565299624946-b28f40a0ae38?w=800' },
  { regex: /fish and chips/i, img: 'photo-1579208575657-c595a05383b7?w=800' },
  { regex: /besciamella|tzatziki|maionese|salsa verde|crema al parmigiano/i, img: 'photo-1577906096429-f73c2c312435?w=800' },

  // 2. Cucine internazionali e piatti iconici mondiali
  { regex: /sushi|onigiri|maki|sashimi|uramaki/i, img: 'photo-1579871494447-9811cf80d66c?w=800' },
  { regex: /ramen|pho|noodles/i, img: 'photo-1569718212165-3a8278d5f624?w=800' },
  { regex: /gyoza|jiaozi|baozi|dumpling|ravioli cin|ravioli gia/i, img: 'photo-1496116218417-1a781b1c416c?w=800' },
  { regex: /involtini primavera|spring rolls/i, img: 'photo-1541529086526-db283c563270?w=800' },
  { regex: /tempura/i, img: 'photo-1615361200141-f45040f367be?w=800' },
  { regex: /teriyaki|yakitori/i, img: 'photo-1580822184713-fc5400e7fe10?w=800' },
  { regex: /taco|birria/i, img: 'photo-1565299585323-38d6b0865b47?w=800' },
  { regex: /quesadilla|nacho/i, img: 'photo-1513456852971-30c0b8199d4d?w=800' },
  { regex: /burrito|fajita|wrap/i, img: 'photo-1626700051175-6818013e1d4f?w=800' },
  { regex: /empanada/i, img: 'photo-1565299585323-38d6b0865b47?w=800' },
  { regex: /paella/i, img: 'photo-1534080564583-6be75777b70a?w=800' },
  { regex: /tortilla de patatas/i, img: 'photo-1568584711271-6c929fb49b60?w=800' },
  { regex: /curry|tikka masala|korma/i, img: 'photo-1588166524941-3bf61a9c41db?w=800' },
  { regex: /tajine|couscous/i, img: 'photo-1541518763669-27fef04b14ea?w=800' },
  { regex: /cantonese|riso fritto|bibimbap/i, img: 'photo-1603133872878-684f208fb84b?w=800' },
  { regex: /pad thai/i, img: 'photo-1559847844-5315695dadae?w=800' },
  { regex: /samosa|naan|pita/i, img: 'photo-1601050690597-df0568f70950?w=800' },
  { regex: /ceviche/i, img: 'photo-1519708227418-c8fd9a32b7a2?w=800' },
  { regex: /baba ganoush|hummus|falafel|tabboul/i, img: 'photo-1577906096429-f73c2c312435?w=800' },
  { regex: /guacamole/i, img: 'photo-1541544741938-0af808871cc0?w=800' },
  { regex: /baklava/i, img: 'photo-1519869325930-281384150729?w=800' },

  // 3. Piatti della tradizione italiana e ricette storiche
  { regex: /carbonara/i, img: 'photo-1612874742237-6526221588e3?w=800' },
  { regex: /vongole|cozze|pescatora|frutti di mare|scoglio|marinara|tiella/i, img: 'photo-1563379091339-03b21ab4a4f8?w=800' },
  { regex: /ostrich|capesant/i, img: 'photo-1534422298391-e4f8c172dddb?w=800' },
  { regex: /lasagn|timballo|anelletti|pasta al forno|pasticciata|cannelloni|parmigiana/i, img: 'photo-1574894709920-11b28e7367e3?w=800' },
  { regex: /pesto/i, img: 'photo-1598866594230-a7c12756260f?w=800' },
  { regex: /bolognese|rag[uù]/i, img: 'photo-1608897013039-887f21d8c804?w=800' },
  { regex: /amatriciana|arrabbiata|puttanesca|assassina/i, img: 'photo-1551183053-bf91a1d81141?w=800' },
  { regex: /cacio e pepe|gricia|alla checca/i, img: 'photo-1551183053-bf91a1d81141?w=800' },
  { regex: /gnocchi|gnocchetti/i, img: 'photo-1589301760014-d929f3979dbc?w=800' },
  { regex: /ravioli|tortelli|tortellini|cappelletti|culurgiones/i, img: 'photo-1589301760014-d929f3979dbc?w=800' },
  { regex: /risotto/i, img: 'photo-1633964913295-ceb43826e7c9?w=800' },
  { regex: /zuppa|minestr|vellutat|brodo|ribollita|passatelli|caciucco|cacciucco|harira|gazpacho|tom yum/i, img: 'photo-1547592166-23ac45744acd?w=800' },
  { regex: /vitello tonnato/i, img: 'photo-1544025162-d76694265947?w=800' },
  { regex: /ossobuco|bourguignon|spezzatino|gulasch/i, img: 'photo-1544025162-d76694265947?w=800' },
  { regex: /arrosticini|bratwurst/i, img: 'photo-1529193591184-b1d58069ecdd?w=800' },
  { regex: /caponata|ratatouille|peperonata/i, img: 'photo-1572449043416-55f4685c9bb7?w=800' },

  // 4. Pizza, Pane, Lievitati & Rustici
  { regex: /pizza|pinsa/i, img: 'photo-1513104890138-7c749659a591?w=800' },
  { regex: /focaccia|schiacciata/i, img: 'photo-1509440159596-0249088772ff?w=800' },
  { regex: /bretzel|pretzel/i, img: 'photo-1589367920969-ab8e050bbb04?w=800' },
  { regex: /bruschett|crostin/i, img: 'photo-1572656631137-7935297eff55?w=800' },
  { regex: /arancin|panzerott|gnocco fritto/i, img: 'photo-1565299585323-38d6b0865b47?w=800' },
  { regex: /torta.*salat|quiche|plumcake salato|strudel salato|torta pasqualina|torta rustica/i, img: 'photo-1565299624946-b28f40a0ae38?w=800' },
  { regex: /pane|panini|bagel|parigina|danubio|casatiello|tortano|grissini|crackers/i, img: 'photo-1509440159596-0249088772ff?w=800' },
  { regex: /burger|hamburger/i, img: 'photo-1568901346375-23c9450c58cd?w=800' },
  { regex: /sandwich|toast|croque/i, img: 'photo-1528735602780-2552fd46c7af?w=800' },
  { regex: /frittata|omelette/i, img: 'photo-1525351484163-7529414344d8?w=800' },

  // 5. Dolci & Dessert specifici
  { regex: /tiramis[uù]/i, img: 'photo-1571877227200-a0d98ea607e9?w=800' },
  { regex: /cheesecake/i, img: 'photo-1533134242443-d4fd215305ad?w=800' },
  { regex: /cioccolat|brownie|sacher|tenerina|caprese.*cioccolat|tortino.*cioccolato|nutella|nutellotti/i, img: 'photo-1578985545062-69928b1d9587?w=800' },
  { regex: /crostat|tarte/i, img: 'photo-1519869325930-281384150729?w=800' },
  { regex: /torta di mele|apple pie/i, img: 'photo-1568571780765-9276ac8b75a2?w=800' },
  { regex: /acai/i, img: 'photo-1590301157890-4810ed352733?w=800' },
  { regex: /chia/i, img: 'photo-1587314168485-3236d6710814?w=800' },
  { regex: /cookies|biscott|cantucci|savoiardi|canestrelli|baci di dama|lingue di gatto/i, img: 'photo-1499636136210-6f4ee915583e?w=800' },
  { regex: /macaron/i, img: 'photo-1569864358642-9d1684040f43?w=800' },
  { regex: /muffin|cupcake/i, img: 'photo-1558961363-fa8fdf82db35?w=800' },
  { regex: /pancake/i, img: 'photo-1567620905732-2d1ec7ab7445?w=800' },
  { regex: /waffle/i, img: 'photo-1562376552-0d160a2f238d?w=800' },
  { regex: /crepe|cr[eè]pes/i, img: 'photo-1519676867240-f03562e64548?w=800' },
  { regex: /donut|ciambell|bombolon|krapfen|graffe/i, img: 'photo-1527515862127-a4fc05baf7a5?w=800' },
  { regex: /flan|creme caramel|bonet|crema catalana/i, img: 'photo-1528975604071-b4dc52a2d18c?w=800' },
  { regex: /panna cotta|crema|mousse|budino|bavarese|semifreddo/i, img: 'photo-1488477181946-6428a0291777?w=800' },
  { regex: /gelato|sorbetto|granita|ghiacciol/i, img: 'photo-1501443762994-82bd5dace89a?w=800' },
  { regex: /marmellat|confettur|composta/i, img: 'photo-1584308666744-24d5c474f2ae?w=800' },
  { regex: /torta/i, img: 'photo-1565958011703-44f9829ba187?w=800' },

  // 6. Bevande & Colazione
  { regex: /spritz|hugo/i, img: 'photo-1560512823-829485b8bf24?w=800' },
  { regex: /mojito/i, img: 'photo-1551538827-9c037cb4f32a?w=800' },
  { regex: /sangria/i, img: 'photo-1510812431401-41d2bd2722f3?w=800' },
  { regex: /limoncello/i, img: 'photo-1527661591475-527312dd65f5?w=800' },
  { regex: /cocktail|margarita|negroni|caipirinha|pina colada/i, img: 'photo-1514362545857-3bc16c4c7d1b?w=800' },
  { regex: /cioccolata calda/i, img: 'photo-1542990253-0d0f5be5f0ed?w=800' },
  { regex: /brioche|cornett/i, img: 'photo-1555507036-ab1f4038808a?w=800' },
  { regex: /caff[eè]|cappuccino|latte/i, img: 'photo-1514432324607-a09d9b4aefdd?w=800' },
  { regex: /smoothie|frullato|succo|frapp[eè]|milkshake/i, img: 'photo-1553530666-ba11a7da3888?w=800' },
  { regex: /porridge|avena|m[uü]sli/i, img: 'photo-1517673400267-0251440c45dc?w=800' },
  { regex: /french toast/i, img: 'photo-1484723091739-30a097e8f929?w=800' },

  // 7. Proteine principali (Pesce & Carne)
  { regex: /salmon/i, img: 'photo-1467003909585-2f8a72700288?w=800' },
  { regex: /tonno/i, img: 'photo-1501595091296-3aa970afb3ff?w=800' },
  { regex: /polpo|calamar|seppi/i, img: 'photo-1559742811-822873691df8?w=800' },
  { regex: /gamber|scamp|crostacei/i, img: 'photo-1559742811-822873691df8?w=800' },
  { regex: /orata|spigola|branzino|merluzz|pesce spada|baccal[aà]|corvina/i, img: 'photo-1519708227418-c8fd9a32b7a2?w=800' },
  { regex: /pollo|tacchino|coq au vin|shish/i, img: 'photo-1598515214211-89d3c73ae83b?w=800' },
  { regex: /manzo|bistecc|tagliata|filetto|bife/i, img: 'photo-1544025162-d76694265947?w=800' },
  { regex: /maiale|salsicci|costine/i, img: 'photo-1529193591184-b1d58069ecdd?w=800' },
  { regex: /polpett/i, img: 'photo-1529042410759-befb1204b468?w=800' },
  { regex: /cotolett|schnitzel|katsu|saltimbocca|scaloppin/i, img: 'photo-1532550907401-a500c9a57435?w=800' },

  // 8. Contorni, Verdure & Insalate
  { regex: /patate fritte|chips|francesine/i, img: 'photo-1573080496219-bb080dd4f877?w=800' },
  { regex: /patat.*forno|patate arrosto|patatas bravas|rosti|pure|pur[eè]|patate/i, img: 'photo-1568584711271-6c929fb49b60?w=800' },
  { regex: /caesar salad/i, img: 'photo-1546793665-c74683f339c1?w=800' },
  { regex: /insalat/i, img: 'photo-1540420773420-3366772f4999?w=800' },
  { regex: /spaghetti|pasta|penne|rigatoni|fusilli|tagliatelle|vermicelli|tagliolini|orecchiette|malloreddus|pizzoccheri|spätzle/i, img: 'photo-1546549032-9571cd6b27df?w=800' },
  { regex: /zucchin|melanzan|peperon|fungh|verdure|spinaci|carciofi|finocchi|fave|edamame/i, img: 'photo-1546069901-ba9599a7e63c?w=800' },
];

export function getExactPhotoForDish(title, category) {
  for (const m of SPECIFIC_DISH_IMAGES) {
    if (m.regex.test(title)) {
      return `${UNSPLASH_BASE}${m.img}`;
    }
  }
  if (category === 'Primi') return `${UNSPLASH_BASE}photo-1546549032-9571cd6b27df?w=800`;
  if (category === 'Secondi') return `${UNSPLASH_BASE}photo-1544025162-d76694265947?w=800`;
  if (category === 'Antipasti') return `${UNSPLASH_BASE}photo-1572656631137-7935297eff55?w=800`;
  if (category === 'Dolci') return `${UNSPLASH_BASE}photo-1565958011703-44f9829ba187?w=800`;
  if (category === 'Colazione') return `${UNSPLASH_BASE}photo-1567620905732-2d1ec7ab7445?w=800`;
  return `${UNSPLASH_BASE}photo-1546069901-ba9599a7e63c?w=800`;
}
