import { queryChelonaAi, buildKnowledgeBase, calculateSplitSettlements } from '../src/services/chelonaEngine';
import { Module } from '../src/types';

async function runTests() {
  console.log('--- STARTING COMPREHENSIVE 17-DOMAIN TESTS ---');

  // 1. TEST SPLIT SETTLEMENT WITH SHARES
  console.log('Testing Split calculation with shares...');
  const splitTest = calculateSplitSettlements(
    ['Alice', 'Bob'],
    [
      {
        id: '1',
        title: 'Cena',
        amount: 30,
        paidBy: 'Alice',
        date: '2026-09-01',
        splitType: 'shares',
        splitValues: { 'Alice': 1, 'Bob': 2 } // Total 3 shares: Alice 10, Bob 20
      }
    ]
  );
  if (splitTest.settlements.length !== 1 || splitTest.settlements[0].from !== 'Bob' || splitTest.settlements[0].to !== 'Alice' || Math.round(splitTest.settlements[0].amount) !== 20) {
    throw new Error(`Split shares calculation failed: ${JSON.stringify(splitTest.settlements)}`);
  }
  console.log('✅ Split shares calculation passed');

  // 2. MOCK MODULES FOR KNOWLEDGE BASE
  const mockModules: Module[] = [
    // 1. Auto
    {
      id: 'auto_1',
      type: 'auto',
      title: 'Panda Natural Power',
      brand: 'Fiat',
      model: 'Panda',
      plate: 'AB123CD',
      fuel: 'metano',
      km: 145000,
      serviceKm: 140000,
      tiresKm: 130000,
      taxDate: '2026-10-15',
      taxAmount: 120,
      insuranceDate: '2026-11-01',
      insuranceCompany: 'Allianz',
      insuranceCost: 450,
      inspectionDate: '2026-10-20',
      lastMethaneCylinder: '2026-10-10',
      battery12vExpiryDate: '2026-10-25',
      interventions: [
        { id: 'int_1', date: '2026-05-01', km: 140000, description: 'Tagliando e candele', cost: 180, invoicePdf: 'invoice.pdf' }
      ],
      x: 0, y: 0, w: 3, h: 3
    } as any,

    // 2. Documenti
    {
      id: 'doc_1',
      type: 'document',
      title: 'Patente di Guida',
      documentType: 'patente',
      number: 'U1234567X',
      expiryDate: '2026-10-30',
      x: 0, y: 0, w: 3, h: 3
    } as any,
    {
      id: 'doc_expired',
      type: 'document',
      title: 'Carta d\'Identità Vecchia',
      documentType: 'identita',
      number: 'CA99999',
      expiryDate: '2025-01-01',
      x: 0, y: 0, w: 3, h: 3
    } as any,

    // 3. Split
    {
      id: 'split_1',
      type: 'split',
      title: 'Coinquilini',
      participants: ['Davide', 'Marco', 'Giulia'],
      currency: '€',
      expenses: [
        { id: 'sp_1', title: 'Spesa Esselunga', amount: 90, paidBy: 'Davide', date: '2026-09-10', splitType: 'equal' }
      ],
      x: 0, y: 0, w: 3, h: 3
    } as any,

    // 4. Single Expense
    {
      id: 'exp_1',
      type: 'single-expense',
      title: 'Pranzo Ristorante',
      amount: 45,
      date: new Date().toISOString(),
      category: 'Ristorazione',
      x: 0, y: 0, w: 3, h: 2
    } as any,

    // 5. Installments
    {
      id: 'inst_1',
      type: 'installments',
      title: 'Finanziamento MacBook',
      targetAmount: 1200,
      payments: [
        { id: 'p1', amount: 100, dueDate: '2026-08-01', isPaid: true },
        { id: 'p2', amount: 100, dueDate: '2026-10-05', isPaid: false }
      ],
      x: 0, y: 0, w: 3, h: 3
    } as any,

    // 7. Supermarket
    {
      id: 'sm_1',
      type: 'supermarket',
      title: 'Lista Spesa Settimanale',
      items: [
        { id: 'i1', name: 'Latte', checked: false, category: 'latticini' },
        { id: 'i2', name: 'Biscotti', checked: true, category: 'colazione' }
      ],
      x: 0, y: 0, w: 3, h: 3
    } as any,

    // 8. Recipes
    {
      id: 'rec_1',
      type: 'recipes',
      title: 'Ricettario',
      recipes: [
        { id: 'r1', title: 'Pasta alla Carbonara', category: 'Primi', isFavorite: true }
      ],
      x: 0, y: 0, w: 3, h: 3
    } as any,

    // 9. Fitness
    {
      id: 'fit_1',
      type: 'fitness',
      title: 'Scheda Palestra',
      fitnessProfile: {
        goal: 'ipertrofia',
        weight: 75,
        height: 180,
        daysPerWeek: 4,
        level: 'intermedio'
      },
      targetCalories: 2600,
      workoutPlan: [
        { dayLabel: 'Lunedì', focus: 'Petto e Tricipiti', exercises: [{ name: 'Panca Piana', sets: 4, reps: 8 }] }
      ],
      mealPlanWeekly: [
        { dayLabel: 'Lunedì', meals: [{ mealType: 'Pranzo', name: 'Riso e Pollo', calories: 650 }] }
      ],
      x: 0, y: 0, w: 3, h: 3
    } as any,

    // 10. Travel
    {
      id: 'tr_1',
      type: 'travel',
      title: 'Viaggi',
      destinations: [
        { id: 'd1', name: 'Giappone Tour', city: 'Tokyo', nation: 'Giappone', type: 'itinerary' }
      ],
      x: 0, y: 0, w: 3, h: 3
    } as any,

    // 11. Furniture
    {
      id: 'furn_1',
      type: 'furniture',
      title: 'Casa',
      rooms: [
        { id: 'rm_1', name: 'Salone', dimensions: '5x4m', items: [{ id: 'it_1', title: 'Divano angolare', price: '850' }] }
      ],
      x: 0, y: 0, w: 3, h: 3
    } as any,

    // 12. Notes
    {
      id: 'note_1',
      type: 'generic',
      title: 'Note Riunione Progetto',
      content: 'Discutere architettura e scadenze di rilascio',
      x: 0, y: 0, w: 3, h: 2
    } as any
  ];

  // 3. VERIFY KNOWLEDGE BASE
  console.log('Testing buildKnowledgeBase...');
  const kb = buildKnowledgeBase(mockModules, 'Davide');
  if (kb.vehicles.length !== 1 || !kb.vehicles[0].lastMethaneCylinder) throw new Error('KB Vehicles check failed');
  if (kb.documents.length !== 2) throw new Error('KB Documents check failed');
  if (kb.splits.length !== 1) throw new Error('KB Splits check failed');
  if (kb.installments.modules.length !== 1) throw new Error('KB Installments check failed');
  if (!kb.fitness || kb.fitness.workoutRoutines.length !== 1) throw new Error('KB Fitness check failed');
  if (kb.supermarket?.itemsToBuy.length !== 1 || kb.supermarket?.checkedItems.length !== 1) throw new Error('KB Supermarket check failed');
  if (kb.urgentDeadlines.length === 0) throw new Error('KB Deadlines check failed');
  console.log(`✅ Knowledge base built: ${kb.urgentDeadlines.length} urgent deadlines detected.`);

  // 4. VERIFY QUERIES ACROSS ALL 17 DOMAINS
  const tests = [
    { domain: 'Auto - Bombole', query: 'Quando scadono le bombole metano?', expect: 'Bombole Metano' },
    { domain: 'Auto - Batteria', query: 'Stato batteria auto', expect: 'Batteria' },
    { domain: 'Auto - Manutenzione', query: 'Tagliando e documenti auto', expect: 'Manutenzione' },
    { domain: 'Documenti - Scaduti', query: 'Ci sono documenti scaduti?', expect: 'Scaduti' },
    { domain: 'Split - Persona', query: 'Quanto deve Marco?', expect: 'Marco' },
    { domain: 'Spese - Categoria', query: 'Quanto ho speso in Ristorazione?', expect: 'Ristorazione' },
    { domain: 'Rate - Mensili', query: 'Quanto pago al mese di rate?', expect: '/ mese' },
    { domain: 'Volantini - Catena', query: 'Apri volantino Lidl', expect: 'Lidl' },
    { domain: 'Spesa - Già comprato', query: 'Cosa ho già comprato nella spesa?', expect: 'già acquistati' },
    { domain: 'Ricette - Ricettario', query: 'Quali sono le mie ricette?', expect: 'Ricette' },
    { domain: 'Fitness - Pasti', query: 'Cosa devo mangiare lunedì?', expect: 'Riso e Pollo' },
    { domain: 'Viaggi - Checklist', query: 'Checklist per la valigia', expect: 'Valigia' },
    { domain: 'Casa - Arredo', query: 'Riepilogo mobili salone e arredo', expect: 'Salone' },
    { domain: 'Note - Ricerca', query: 'Cerca nota architettura', expect: 'architettura' },
    { domain: 'Parcheggio - Radar', query: 'Dov\'è la mia macchina?', expect: 'parcheggi' },
    { domain: 'Rubrica - Indirizzi', query: 'Mostrami gli indirizzi in rubrica', expect: 'Rubrica' },
    { domain: 'Scadenze - Imminenti', query: 'Quali scadenze ho nei prossimi 60 giorni?', expect: 'Scadenze' },
    { domain: 'Tools - Comprimi', query: 'Comprimi PDF', expect: 'Comprimi PDF' },
    { domain: 'Tools - Word in PDF', query: 'Converti Word in PDF', expect: 'Word in PDF' },
    { domain: 'Profilo - Backup', query: 'Come faccio il backup crittografato?', expect: 'Backup' },
    { domain: 'Profilo - Biometria', query: 'Come funziona l\'impronta digitale e la sicurezza?', expect: 'Vault' },
    { domain: 'Capabilities generali', query: 'Cosa puoi fare?', expect: 'Sono Chelona AI' }
  ];

  for (const t of tests) {
    console.log(`Checking [${t.domain}]: "${t.query}"`);
    const res = await queryChelonaAi(t.query, mockModules, 'Davide');
    if (!res.text.includes(t.expect)) {
      throw new Error(`Test failed for ${t.domain}: expected text to include "${t.expect}", got: ${res.text.slice(0, 150)}...`);
    }
    console.log(`  -> Passed! (Returned actions: ${res.actions?.length || 0})`);
  }

  console.log('--- ALL 17 DOMAINS VERIFIED SUCCESSFULLY! ---');
}

runTests().catch(err => {
  console.error('TEST RUNNER FAILED:', err);
  process.exit(1);
});
