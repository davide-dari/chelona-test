/**
 * Chelona Android Home Screen Shortcuts Service
 * 
 * Permette di creare collegamenti nativi indipendenti (Pinned Shortcuts)
 * sulla schermata Home di Android per qualsiasi sezione dell'app (Auto, Documenti,
 * Parcheggio, Volantini, Spesa, Ricette, Rate, Spese, Fitness, Viaggi, ecc.),
 * trasformando ogni sezione in una vera e propria applicazione autonoma.
 */

export interface SectionShortcutDef {
  id: string;
  route: string;
  shortLabel: string;
  longLabel: string;
  description: string;
  category: 'vault' | 'finanze' | 'casa' | 'utility' | 'ai';
  colorHex: string;
  gradientFrom: string;
  gradientTo: string;
  svgInner: string;
  emoji: string;
}

export const SECTION_SHORTCUTS: SectionShortcutDef[] = [
  {
    id: 'auto',
    route: 'auto',
    shortLabel: 'Auto',
    longLabel: 'Chelona Auto & Veicoli',
    description: 'Scadenze bollo, assicurazione, revisione, tagliandi e storico km.',
    category: 'vault',
    colorHex: '#2563EB',
    gradientFrom: '#1D4ED8',
    gradientTo: '#3B82F6',
    emoji: '🚗',
    svgInner: `
      <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
      <circle cx="7" cy="17" r="2" />
      <path d="M9 17h6" />
      <circle cx="17" cy="17" r="2" />
    `
  },
  {
    id: 'document',
    route: 'document',
    shortLabel: 'Documenti',
    longLabel: 'Chelona Documenti Personali',
    description: 'Carte d\'identità, patente, passaporto e tessere sanitarie crittografate.',
    category: 'vault',
    colorHex: '#059669',
    gradientFrom: '#047857',
    gradientTo: '#10B981',
    emoji: '📄',
    svgInner: `
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <line x1="10" y1="9" x2="8" y2="9" />
    `
  },
  {
    id: 'parking',
    route: 'parking',
    shortLabel: 'Parcheggio',
    longLabel: 'Chelona Salva Parcheggio',
    description: 'Radar GPS, timer parchimetro e navigazione diretta per ritrovare l\'auto.',
    category: 'utility',
    colorHex: '#0284C7',
    gradientFrom: '#0369A1',
    gradientTo: '#0EA5E9',
    emoji: '🅿️',
    svgInner: `
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    `
  },
  {
    id: 'volantino',
    route: 'volantino',
    shortLabel: 'Volantini',
    longLabel: 'Chelona Volantini & Sconti',
    description: 'Confronta volantini di oltre 50 catene e trova le migliori offerte.',
    category: 'casa',
    colorHex: '#E11D48',
    gradientFrom: '#BE123C',
    gradientTo: '#F43F5E',
    emoji: '🛒',
    svgInner: `
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
    `
  },
  {
    id: 'supermarket',
    route: 'supermarket',
    shortLabel: 'Spesa',
    longLabel: 'Chelona Lista della Spesa',
    description: 'Lista articoli organizzata per corsie, con spunte e calcolo prezzi.',
    category: 'casa',
    colorHex: '#D97706',
    gradientFrom: '#B45309',
    gradientTo: '#F59E0B',
    emoji: '🛍️',
    svgInner: `
      <circle cx="8" cy="21" r="1" />
      <circle cx="19" cy="21" r="1" />
      <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
    `
  },
  {
    id: 'recipes',
    route: 'recipes',
    shortLabel: 'Ricette',
    longLabel: 'Chelona Ricettario & Cucina',
    description: 'Ricette salvate con dosi, ingredienti, tempi e valori nutrizionali.',
    category: 'casa',
    colorHex: '#EA580C',
    gradientFrom: '#C2410C',
    gradientTo: '#FB923C',
    emoji: '🍽️',
    svgInner: `
      <path d="m16 2-2.3 2.3a3 3 0 0 0 0 4.2l1.8 1.8a3 3 0 0 0 4.2 0L22 8Z" />
      <path d="M15 15 3.3 3.3a4.2 4.2 0 0 0 0 6l7.3 7.3c.7.7 2 .7 2.8 0L15 15Zm0 0 7 7" />
      <path d="m2.1 21.8 6.4-6.3" />
      <path d="m19 5-7 7" />
    `
  },
  {
    id: 'installments',
    route: 'installments',
    shortLabel: 'Rate',
    longLabel: 'Chelona Rate & Finanziamenti',
    description: 'Monitora piani rateali, mutui, prestiti e importi mensili residui.',
    category: 'finanze',
    colorHex: '#7C3AED',
    gradientFrom: '#6D28D9',
    gradientTo: '#8B5CF6',
    emoji: '💳',
    svgInner: `
      <rect width="20" height="14" x="2" y="5" rx="2" />
      <line x1="2" x2="22" y1="10" y2="10" />
    `
  },
  {
    id: 'single-expense',
    route: 'single-expense',
    shortLabel: 'Spese',
    longLabel: 'Chelona Spese Quotidiane',
    description: 'Registra scontrini, uscite giornaliere e statistiche mensili.',
    category: 'finanze',
    colorHex: '#16A34A',
    gradientFrom: '#15803D',
    gradientTo: '#22C55E',
    emoji: '💰',
    svgInner: `
      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
      <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
      <path d="M12 6v12" />
    `
  },
  {
    id: 'split',
    route: 'split',
    shortLabel: 'Split',
    longLabel: 'Chelona Spese Divise',
    description: 'Divisione spese tra amici o coinquilini e conteggio debiti/crediti.',
    category: 'finanze',
    colorHex: '#0891B2',
    gradientFrom: '#0E7490',
    gradientTo: '#06B6D4',
    emoji: '👥',
    svgInner: `
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    `
  },
  {
    id: 'fitness',
    route: 'fitness',
    shortLabel: 'Fitness',
    longLabel: 'Chelona Schede Allenamento',
    description: 'Schede palestra, serie, ripetizioni, cronometro recupero e dieta.',
    category: 'utility',
    colorHex: '#F97316',
    gradientFrom: '#EA580C',
    gradientTo: '#FB923C',
    emoji: '🏋️',
    svgInner: `
      <path d="m6.5 6.5 11 11" />
      <path d="m21 21-1-1" />
      <path d="m3 3 1 1" />
      <path d="m18 22 4-4" />
      <path d="m2 6 4-4" />
      <path d="m3 10 7-7" />
      <path d="m14 21 7-7" />
    `
  },
  {
    id: 'travel',
    route: 'travel',
    shortLabel: 'Viaggi',
    longLabel: 'Chelona Viaggi & Itinerari',
    description: 'Mete, date, tappe di viaggio, valigia e prenotazioni in un solo posto.',
    category: 'utility',
    colorHex: '#4F46E5',
    gradientFrom: '#4338CA',
    gradientTo: '#6366F1',
    emoji: '✈️',
    svgInner: `
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    `
  },
  {
    id: 'furniture',
    route: 'furniture',
    shortLabel: 'Arredo',
    longLabel: 'Chelona Casa & Arredamento',
    description: 'Misure mobili, stanze della casa, preventivi e foto arredi.',
    category: 'casa',
    colorHex: '#78716C',
    gradientFrom: '#57534E',
    gradientTo: '#A8A29E',
    emoji: '🛋️',
    svgInner: `
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    `
  },
  {
    id: 'notes',
    route: 'notes',
    shortLabel: 'Note',
    longLabel: 'Chelona Note & Appunti',
    description: 'Appunti veloci, liste spuntabili e testi protetti.',
    category: 'utility',
    colorHex: '#9333EA',
    gradientFrom: '#7E22CE',
    gradientTo: '#A855F7',
    emoji: '📝',
    svgInner: `
      <path d="M16 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8Z" />
      <path d="M15 3v5h5" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="12" y2="17" />
    `
  },
  {
    id: 'addresses',
    route: 'addresses',
    shortLabel: 'Rubrica',
    longLabel: 'Chelona Rubrica & Indirizzi',
    description: 'Indirizzi frequenti di amici, negozi e luoghi con avvio navigatore rapido.',
    category: 'utility',
    colorHex: '#475569',
    gradientFrom: '#334155',
    gradientTo: '#64748B',
    emoji: '📇',
    svgInner: `
      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
      <circle cx="12" cy="10" r="3" />
      <path d="M18 18h-8" />
    `
  },
  {
    id: 'deadlines',
    route: 'deadlines',
    shortLabel: 'Scadenze',
    longLabel: 'Chelona Tutte le Scadenze',
    description: 'Visione unificata delle scadenze auto, documenti, rate e contratti.',
    category: 'vault',
    colorHex: '#DC2626',
    gradientFrom: '#B91C1C',
    gradientTo: '#EF4444',
    emoji: '⏰',
    svgInner: `
      <path d="M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3.5" />
      <path d="M16 2v4" />
      <path d="M8 2v4" />
      <path d="M3 10h18" />
      <circle cx="18" cy="18" r="4" />
      <path d="M18 16.5v1.5l1 1" />
    `
  },
  {
    id: 'scanner',
    route: 'scanner',
    shortLabel: 'Scanner',
    longLabel: 'Chelona Scanner Documenti',
    description: 'Scansione smart con fotocamera, ritaglio prospettico e generazione PDF.',
    category: 'utility',
    colorHex: '#0EA5E9',
    gradientFrom: '#0284C7',
    gradientTo: '#38BDF8',
    emoji: '📷',
    svgInner: `
      <path d="M3 7V5a2 2 0 0 1 2-2h2" />
      <path d="M17 3h2a2 2 0 0 1 2 2v2" />
      <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
      <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
      <line x1="7" y1="12" x2="17" y2="12" />
    `
  },
  {
    id: 'ai',
    route: 'ai',
    shortLabel: 'Chelona AI',
    longLabel: 'Chelona AI Assistente Vocale',
    description: 'Interagisci vocalmente con l\'intelligenza locale 100% on-device.',
    category: 'ai',
    colorHex: '#9333EA',
    gradientFrom: '#F59E0B',
    gradientTo: '#8B5CF6',
    emoji: '🤖',
    svgInner: `
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      <path d="M5 3v4" />
      <path d="M19 17v4" />
      <path d="M3 5h4" />
      <path d="M17 19h4" />
    `
  },
  {
    id: 'home',
    route: 'home',
    shortLabel: 'Casa & Spesa',
    longLabel: 'Chelona Casa, Offerte & Spesa',
    description: 'Volantini sconti, lista della spesa, ricettario e arredamento.',
    category: 'casa',
    colorHex: '#0D9488',
    gradientFrom: '#0F766E',
    gradientTo: '#14B8A6',
    emoji: '🏡',
    svgInner: `
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    `
  },
  {
    id: 'tools',
    route: 'tools',
    shortLabel: 'Strumenti',
    longLabel: 'Chelona Strumenti & Utility',
    description: 'Scanner PDF, aiuto Vinted, calcolo percentuali e galleria.',
    category: 'utility',
    colorHex: '#6366F1',
    gradientFrom: '#4F46E5',
    gradientTo: '#818CF8',
    emoji: '🛠️',
    svgInner: `
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    `
  },
  {
    id: 'finance',
    route: 'split',
    shortLabel: 'Spese & Conti',
    longLabel: 'Chelona Spese & Finanze',
    description: 'Spese quotidiane, spese condivise in gruppo, rate e mutui.',
    category: 'finanze',
    colorHex: '#8B5CF6',
    gradientFrom: '#7C3AED',
    gradientTo: '#A78BFA',
    emoji: '💳',
    svgInner: `
      <rect width="20" height="14" x="2" y="5" rx="2" />
      <line x1="2" x2="22" y1="10" y2="10" />
    `
  }
];

/**
 * Verifica se l'API nativa Android Pinned Shortcuts è disponibile
 */
export function isPinShortcutSupported(): boolean {
  if (typeof window === 'undefined') return false;
  const native = (window as any).ChelonaNative;
  if (!native) return false;
  if (typeof native.isPinShortcutSupported === 'function') {
    try {
      return Boolean(native.isPinShortcutSupported());
    } catch {
      return false;
    }
  }
  return typeof native.createPinnedShortcut === 'function';
}

/**
 * Genera un'icona ad altissima risoluzione (512x512) per l'icona Android Adaptive
 */
export async function generateShortcutIconBase64(def: SectionShortcutDef): Promise<string> {
  if (typeof document === 'undefined') return '';

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  try {
    // 1. Sfondo con gradiente pieno a tutta pagina (512x512) per il rendering Adaptive Icon
    const grad = ctx.createLinearGradient(0, 0, 512, 512);
    grad.addColorStop(0, def.gradientFrom);
    grad.addColorStop(1, def.gradientTo);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    // 2. Luce radiale in alto a sinistra per profondità Material 3
    const radial = ctx.createRadialGradient(150, 130, 20, 150, 130, 320);
    radial.addColorStop(0, 'rgba(255, 255, 255, 0.35)');
    radial.addColorStop(0.6, 'rgba(255, 255, 255, 0.08)');
    radial.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = radial;
    ctx.fillRect(0, 0, 512, 512);

    // 3. Cerchio interno luminoso a protezione della safe-zone (340px)
    ctx.save();
    ctx.beginPath();
    ctx.arc(256, 256, 170, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
    ctx.stroke();
    ctx.restore();

    // 4. Disegna l'icona vettoriale SVG al centro
    if (def.svgInner && def.svgInner.trim()) {
      const svgFull = `
        <svg xmlns="http://www.w3.org/2000/svg" width="220" height="220" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
          ${def.svgInner}
        </svg>
      `;

      const img = new Image();
      const svgBlob = new Blob([svgFull], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      await new Promise<void>((resolve, reject) => {
        img.onload = () => {
          ctx.save();
          // Ombra per l'icona interna
          ctx.shadowColor = 'rgba(0, 0, 0, 0.30)';
          ctx.shadowBlur = 16;
          ctx.shadowOffsetY = 8;
          // Centra l'immagine 220x220 in un canvas 512x512
          ctx.drawImage(img, 146, 146, 220, 220);
          ctx.restore();
          URL.revokeObjectURL(url);
          resolve();
        };
        img.onerror = (err) => {
          URL.revokeObjectURL(url);
          reject(err);
        };
        img.src = url;
      });
    } else {
      // Fallback a emoji o iniziale
      ctx.save();
      ctx.font = 'bold 180px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(def.emoji || def.shortLabel.substring(0, 1), 256, 256);
      ctx.restore();
    }

    return canvas.toDataURL('image/png');
  } catch (e) {
    console.warn('Canvas icon generation error, using fallback', e);
    return '';
  }
}

/**
 * Crea la scorciatoia permanente sulla Home Android
 */
export async function createSectionShortcut(shortcutIdOrRoute: string): Promise<{
  success: boolean;
  message: string;
  shortcut?: SectionShortcutDef;
}> {
  const cleanId = (shortcutIdOrRoute || '').trim().toLowerCase();
  const shortcut = SECTION_SHORTCUTS.find(
    s => s.id === cleanId || s.route === cleanId
  ) || (
    cleanId === 'documenti' ? SECTION_SHORTCUTS.find(s => s.id === 'document') :
    cleanId === 'spese' || cleanId === 'conti' || cleanId === 'spese e conti' ? SECTION_SHORTCUTS.find(s => s.id === 'finance' || s.id === 'split') :
    cleanId === 'casa' || cleanId === 'casa offerte e spesa' ? SECTION_SHORTCUTS.find(s => s.id === 'home') :
    cleanId === 'salute' || cleanId === 'salute e fitness e dieta' || cleanId === 'dieta' ? SECTION_SHORTCUTS.find(s => s.id === 'fitness') :
    cleanId === 'viaggi' || cleanId === 'viaggi e mete' || cleanId === 'mete' ? SECTION_SHORTCUTS.find(s => s.id === 'travel') :
    cleanId === 'strumenti' || cleanId === 'utility' ? SECTION_SHORTCUTS.find(s => s.id === 'tools') :
    undefined
  );

  if (!shortcut) {
    return {
      success: false,
      message: `Sezione "${shortcutIdOrRoute}" non trovata.`
    };
  }

  // Verifica supporto nativo
  const native = (window as any)?.ChelonaNative;
  if (!native || typeof native.createPinnedShortcut !== 'function') {
    return {
      success: false,
      message: 'I collegamenti sulla schermata Home richiedono l\'app installata su Android (versione 8.0 o successiva).',
      shortcut
    };
  }

  try {
    // Genera l'icona base64 in alta risoluzione
    const iconBase64 = await generateShortcutIconBase64(shortcut);

    // Chiamata all'interfaccia nativa Android
    const result = native.createPinnedShortcut(
      shortcut.route,
      shortcut.shortLabel,
      shortcut.longLabel,
      iconBase64,
      shortcut.colorHex
    );

    if (result) {
      return {
        success: true,
        message: `Tocca "Aggiungi" o trascina l'icona nel popup Android per creare il collegamento "${shortcut.shortLabel}"!`,
        shortcut
      };
    } else {
      return {
        success: false,
        message: `Il tuo launcher Android non supporta l'aggiunta automatica di collegamenti.`,
        shortcut
      };
    }
  } catch (error: any) {
    console.error('Error creating section shortcut:', error);
    return {
      success: false,
      message: `Errore durante la creazione del collegamento: ${error?.message || error}`,
      shortcut
    };
  }
}
