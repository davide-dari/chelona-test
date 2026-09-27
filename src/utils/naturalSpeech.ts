/**
 * Natural Speech Synthesis Utility for Chelona AI
 * 
 * 100% On-Device • Zero External APIs
 * Transforms raw markdown, technical counters, dates, and abbreviations
 * into warm, fluent, conversational Italian with natural breathing pauses.
 */

const MESI_ITALIANI = [
  'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
  'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'
];

/**
 * Pulisce e trasforma un testo grezzo/markdown in italiano parlato naturale e umano.
 */
export function prepareNaturalSpeech(text: string): string {
  if (!text) return '';

  let s = text;

  // 1. Rimuovi blocchi di codice o snippet tecnici
  s = s.replace(/```[\s\S]*?```/g, '');
  s = s.replace(/`([^`]+)`/g, '$1');

  // 2. Rimuovi link markdown [testo](url) -> testo
  s = s.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

  // 3. Rimuovi hashtag e formattazione markdown
  s = s.replace(/[*_~>#]/g, '');

  // 4. Rimuovi emoji e variation selectors (es. ⚠️ \u26A0\uFE0F) per evitare letture robot
  s = s.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1FA70}-\u{1FAFF}\u{FE00}-\u{FE0F}]/gu, '');

  // 5. Normalizza importi in Euro: € 150, 150€, 150,00 € -> 150 euro
  s = s.replace(/€\s*(\d+(?:[.,]\d+)?)/g, '$1 euro');
  s = s.replace(/(\d+(?:[.,]\d+)?)\s*€/g, '$1 euro');
  s = s.replace(/(\d+),00\s*euro/g, '$1 euro');

  // 6. Normalizza date italiane: gg/mm/aaaa o gg-mm-aaaa -> gg mese aaaa
  s = s.replace(/\b(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{4})\b/g, (match, d, m, y) => {
    const day = parseInt(d, 10);
    const monthIdx = parseInt(m, 10) - 1;
    if (monthIdx >= 0 && monthIdx < 12) {
      return `${day === 1 ? 'primo' : day} ${MESI_ITALIANI[monthIdx]} ${y}`;
    }
    return match;
  });

  // 7. Scadenze e offset di giorni
  // (-15 gg) -> , scaduto da 15 giorni,
  s = s.replace(/\(\s*-\s*(\d+)\s*(?:gg|giorni)\s*\)/gi, ', scaduto da $1 giorni,');
  // (+15 gg) o (tra 15 gg) -> , tra 15 giorni,
  s = s.replace(/\(\s*(?:\+?|tra\s+)(\d+)\s*(?:gg|giorni)\s*\)/gi, ', tra $1 giorni,');
  // (scade tra 15 gg) -> , scade tra 15 giorni,
  s = s.replace(/\(\s*scade\s+tra\s+(\d+)\s*(?:gg|giorni)\s*\)/gi, ', scade tra $1 giorni,');

  // 8. Targhe automobilistiche italiane (evita di raddoppiare "targa")
  s = s.replace(/\b(?:targa\s+)?([A-Z]{2})\s*(\d{3})\s*([A-Z]{2})\b/g, (_match, l1, num, l2) => {
    return `targa ${l1[0]} ${l1[1]}, ${num}, ${l2[0]} ${l2[1]}`;
  });

  // 9. Abbreviazioni comuni italiane
  s = s.replace(/\bkm\/h\b/gi, 'chilometri orari');
  s = s.replace(/\bkm\b/gi, 'chilometri');
  s = s.replace(/\bgg\b/gi, 'giorni');
  s = s.replace(/\bcv\b/gi, 'cavalli');
  s = s.replace(/\bkw\b/gi, 'chilowatt');
  s = s.replace(/\bmin\b/gi, 'minuti');
  s = s.replace(/\bsec\b/gi, 'secondi');
  s = s.replace(/\bscad\.\b/gi, 'scadenza');
  s = s.replace(/\bpol\.\b/gi, 'polizza');
  s = s.replace(/\bnum\.\b/gi, 'numero');
  s = s.replace(/\bn\.\b/gi, 'numero');
  s = s.replace(/\btel\.\b/gi, 'telefono');
  s = s.replace(/\bca\.\b/gi, 'circa');
  s = s.replace(/\be\/o\b/gi, 'e oppure o');
  s = s.replace(/\bvs\b/gi, 'contro');
  s = s.replace(/%/g, ' per cento');

  // 10. Normalizza elenchi e punteggiatura
  // Due punti prima di a capo: punto
  s = s.replace(/:\s*\n+/g, '.\n');
  // Due punti in linea: virgola
  s = s.replace(/:\s+/g, ', ');

  // Trattini ed elenchi puntati: trasformali in pause con punto
  s = s.replace(/\n\s*[-•*]\s*/g, '.\n');
  s = s.replace(/^\s*[-•*]\s*/g, '');

  // Parentesi tonde residue non numeriche: ammorbidisci con virgole
  s = s.replace(/\(([^)]+)\)/g, ', $1,');

  // Pulisci spazi prima di virgole e punti
  s = s.replace(/\s+,/g, ',');
  s = s.replace(/\s+\./g, '.');

  // Spaziature virgola (non tra cifre numeriche es. 84,50)
  s = s.replace(/(?<=\D),(?=\S)/g, ', ');
  s = s.replace(/(?<=\S),(?=\D)/g, ', ');

  // Spaziature punto
  s = s.replace(/\s*\.\s*/g, '. ');

  // Rimuovi punteggiatura anomala o combinata
  s = s.replace(/,\s*,+/g, ',');
  s = s.replace(/\.[\s\.]*\./g, '.');
  s = s.replace(/,\s*\./g, '.');
  s = s.replace(/\.\s*,/g, '.');
  s = s.replace(/([!?])\s*\./g, '$1');
  s = s.replace(/\.\s*([!?])/g, '$1');
  s = s.replace(/\s+/g, ' ');
  s = s.replace(/,\s*$/g, '.');
  s = s.trim();

  // Assicura punteggiatura finale
  if (s && !/[.!?]$/.test(s)) {
    s += '.';
  }

  return s;
}

/**
 * Suddivide un testo lungo in singole frasi per evitare blocchi o interruzioni
 * nei motori SpeechSynthesis su Android WebView e mobile.
 */
export function splitIntoSentences(text: string): string[] {
  if (!text) return [];
  const rawSentences = text
    .split(/(?<=[.!?])\s+|\n+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);

  const finalSentences: string[] = [];
  for (const s of rawSentences) {
    if (s.length <= 180) {
      finalSentences.push(s);
    } else {
      // Se una frase supera i 180 caratteri, spezza per virgole per dare respiro al motore
      const subParts = s.split(/(?<=,)\s+/);
      let current = '';
      for (const part of subParts) {
        if ((current + ' ' + part).length > 180 && current) {
          finalSentences.push(current.trim());
          current = part;
        } else {
          current = current ? current + ' ' + part : part;
        }
      }
      if (current.trim()) {
        finalSentences.push(current.trim());
      }
    }
  }

  return finalSentences;
}

/**
 * Filtra solo le voci in lingua italiana presenti sul dispositivo.
 */
export function filterItalianVoices(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice[] {
  if (!voices || voices.length === 0) return [];
  return voices.filter(v => {
    const l = (v.lang || '').toLowerCase().replace('_', '-');
    return l.startsWith('it');
  });
}

/**
 * Seleziona la voce italiana a più alta fedeltà/naturalezza sul dispositivo.
 */
export function getBestItalianVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (!voices || voices.length === 0) return null;

  const italianVoices = filterItalianVoices(voices);
  const pool = italianVoices.length > 0 ? italianVoices : voices;

  const scored = pool.map(v => {
    let score = 0;
    const name = (v.name || '').toLowerCase();
    const uri = (v.voiceURI || '').toLowerCase();
    const lang = (v.lang || '').toLowerCase().replace('_', '-');

    if (lang.startsWith('it')) score += 100;
    if (name.includes('natural') || name.includes('naturale')) score += 60;
    if (name.includes('neural') || uri.includes('neural')) score += 50;
    if (name.includes('online') || uri.includes('network')) score += 40;
    if (name.includes('google')) score += 35; // Google Italian voice su Android e Chrome è molto fluida
    if (name.includes('premium') || name.includes('enhanced')) score += 30;
    if (
      name.includes('alice') ||
      name.includes('federica') ||
      name.includes('luca') ||
      name.includes('cosimo') ||
      name.includes('elsa')
    ) {
      score += 25;
    }
    if (v.default) score += 5;

    return { voice: v, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.length > 0 ? scored[0].voice : null;
}

/**
 * Genera un nome descrittivo e pulito per la voce nella UI.
 */
export function getVoiceFriendlyName(v: SpeechSynthesisVoice): string {
  if (!v) return 'Voce Naturale';
  const name = v.name || '';
  const lower = name.toLowerCase();

  if (lower.includes('google') && lower.includes('it')) {
    return 'Google Italiano (Naturale HD)';
  }
  if (lower.includes('alice')) {
    return 'Alice (Alta Fedeltà)';
  }
  if (lower.includes('federica')) {
    return 'Federica (Alta Fedeltà)';
  }
  if (lower.includes('luca')) {
    return 'Luca (Alta Fedeltà)';
  }
  if (lower.includes('cosimo')) {
    return 'Cosimo (Naturale)';
  }
  if (lower.includes('elsa')) {
    return 'Elsa (Naturale)';
  }

  // Pulisci sigle it-IT o parentesi tecniche
  const clean = name
    .replace(/\(it[-_]it\)/gi, '')
    .replace(/italian\s*\(italy\)/gi, '')
    .replace(/italiano\s*\(italia\)/gi, '')
    .replace(/#.*$/g, '')
    .trim();

  return clean || v.name || 'Italiano Naturale';
}
