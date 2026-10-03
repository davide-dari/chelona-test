import { validateFiscalCode } from '../services/cfValidator';

export interface ParsedDocumentData {
  documentType: 'tax_code' | 'identity' | 'driving_license' | 'generic';
  title?: string;
  number?: string;
  issueDate?: string; // YYYY-MM-DD
  expiryDate?: string; // YYYY-MM-DD
  issuedBy?: string;
  confidence: {
    documentType: number;
    number: number;
    dates: number;
  };
  rawText: string;
}

export interface ExpirationCountdown {
  status: 'expired' | 'urgent' | 'warning' | 'valid' | 'none';
  label: string;
  detail: string;
  badgeClass: string;
  dotClass: string;
  icon: string;
  diffDays?: number;
}

const MONTH_NAMES_IT: Record<string, string> = {
  gen: '01', gennaio: '01',
  feb: '02', febbraio: '02',
  mar: '03', marzo: '03',
  apr: '04', aprile: '04',
  mag: '05', maggio: '05',
  giu: '06', giugno: '06',
  lug: '07', luglio: '07',
  ago: '08', agosto: '08',
  set: '09', settembre: '09',
  ott: '10', ottobre: '10',
  nov: '11', novembre: '11',
  dic: '12', dicembre: '12',
};

/**
 * Normalizza una stringa data (DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY, o con nome mese) in formato ISO YYYY-MM-DD
 */
export function normalizeDateToIso(dateStr: string): string | null {
  if (!dateStr) return null;
  const clean = dateStr.trim();

  // Caso ISO già valido YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    const d = new Date(clean);
    return isNaN(d.getTime()) ? null : clean;
  }

  // Caso standard DD/MM/YYYY o DD-MM-YYYY o DD.MM.YYYY
  const numMatch = clean.match(/^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{2,4})$/);
  if (numMatch) {
    let day = parseInt(numMatch[1], 10);
    let month = parseInt(numMatch[2], 10);
    let year = parseInt(numMatch[3], 10);

    if (year < 100) {
      year += year > 50 ? 1900 : 2000;
    }

    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const mm = String(month).padStart(2, '0');
      const dd = String(day).padStart(2, '0');
      return `${year}-${mm}-${dd}`;
    }
  }

  // Caso data con nome mese: 15 Ott 2028 o 15 Ottobre 2028
  const textMatch = clean.match(/^(\d{1,2})\s+([a-zA-Z]{3,9})\s+(\d{2,4})$/i);
  if (textMatch) {
    const day = parseInt(textMatch[1], 10);
    const monthKey = textMatch[2].toLowerCase().substring(0, 3);
    const month = MONTH_NAMES_IT[monthKey];
    let year = parseInt(textMatch[3], 10);
    if (year < 100) year += year > 50 ? 1900 : 2000;

    if (month && day >= 1 && day <= 31) {
      const dd = String(day).padStart(2, '0');
      return `${year}-${month}-${dd}`;
    }
  }

  return null;
}

/**
 * Calcola lo stato del countdown di scadenza stile Apple Wallet
 */
export function getExpirationCountdown(expiryDateStr?: string): ExpirationCountdown {
  if (!expiryDateStr) {
    return {
      status: 'none',
      label: 'SENZA SCADENZA',
      detail: 'Nessuna data di scadenza',
      badgeClass: 'bg-zinc-500/20 text-zinc-300 border-zinc-500/30',
      dotClass: 'bg-zinc-400',
      icon: '⚪'
    };
  }

  const expiry = new Date(expiryDateStr);
  if (isNaN(expiry.getTime())) {
    return {
      status: 'none',
      label: 'DATA NON VALIDA',
      detail: expiryDateStr,
      badgeClass: 'bg-zinc-500/20 text-zinc-300 border-zinc-500/30',
      dotClass: 'bg-zinc-400',
      icon: '⚪'
    };
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(expiry.getFullYear(), expiry.getMonth(), expiry.getDate());
  const diffMs = target.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const pastDays = Math.abs(diffDays);
    const pastMonths = Math.floor(pastDays / 30.4);
    const detail = pastDays === 1
      ? '🚨 Scaduto ieri'
      : pastMonths >= 2
        ? `🚨 Scaduto da ${pastMonths} mesi (${pastDays} gg fa)`
        : `🚨 Scaduto da ${pastDays} giorni`;

    return {
      status: 'expired',
      label: 'SCADUTO',
      detail,
      badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-sm shadow-rose-950/40',
      dotClass: 'bg-rose-500 animate-ping',
      icon: '🚨',
      diffDays
    };
  }

  if (diffDays === 0) {
    return {
      status: 'urgent',
      label: 'SCADE OGGI',
      detail: '⚠️ Scade oggi!',
      badgeClass: 'bg-amber-500/25 text-amber-200 border-amber-500/60 shadow-sm',
      dotClass: 'bg-amber-400 animate-pulse',
      icon: '⚠️',
      diffDays: 0
    };
  }

  if (diffDays === 1) {
    return {
      status: 'urgent',
      label: 'SCADE DOMANI',
      detail: '⚠️ Scade domani!',
      badgeClass: 'bg-amber-500/25 text-amber-200 border-amber-500/60 shadow-sm',
      dotClass: 'bg-amber-400 animate-pulse',
      icon: '⚠️',
      diffDays: 1
    };
  }

  if (diffDays <= 30) {
    return {
      status: 'urgent',
      label: `SCADE IN ${diffDays} GG`,
      detail: `⚠️ Scade tra ${diffDays} giorni`,
      badgeClass: 'bg-amber-500/20 text-amber-200 border-amber-500/50 shadow-sm',
      dotClass: 'bg-amber-400 animate-pulse',
      icon: '⚠️',
      diffDays
    };
  }

  if (diffDays <= 90) {
    const months = Math.ceil(diffDays / 30.4);
    return {
      status: 'warning',
      label: `SCADE IN ${months} MESI`,
      detail: `⏳ Scade tra ${months} mesi (${diffDays} gg)`,
      badgeClass: 'bg-yellow-500/15 text-yellow-200 border-yellow-500/40',
      dotClass: 'bg-yellow-400',
      icon: '⏳',
      diffDays
    };
  }

  // Valido per oltre 3 mesi
  const months = Math.floor(diffDays / 30.4);
  const years = Math.floor(months / 12);
  const remMonths = months % 12;
  const timeDesc = years >= 1
    ? `${years} ${years === 1 ? 'anno' : 'anni'}${remMonths > 0 ? ` e ${remMonths} mesi` : ''}`
    : `${months} mesi`;

  return {
    status: 'valid',
    label: 'VALIDO',
    detail: `✅ Valido (${timeDesc} rimanenti)`,
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    dotClass: 'bg-emerald-400',
    icon: '✅',
    diffDays
  };
}

/**
 * Motore di parsing testuale client-side specializzato per documenti italiani:
 * - Tessera Sanitaria / Codice Fiscale (TS-CNS)
 * - Carta d'Identità Elettronica (CIE)
 * - Patente di Guida
 * - Passaporto e Documenti Generici
 */
export function parseDocumentText(rawText: string): ParsedDocumentData {
  const cleanText = rawText.replace(/\r\n/g, '\n');
  const upper = cleanText.toUpperCase();
  const lines = cleanText.split('\n').map(l => l.trim()).filter(Boolean);

  let docType: 'tax_code' | 'identity' | 'driving_license' | 'generic' = 'generic';
  let title: string | undefined = undefined;
  let number: string | undefined = undefined;
  let issueDate: string | undefined = undefined;
  let expiryDate: string | undefined = undefined;
  let issuedBy: string | undefined = undefined;

  let typeConfidence = 0.5;
  let numConfidence = 0.5;
  let dateConfidence = 0.5;

  // -------------------------------------------------------------------------
  // 1. CODICE FISCALE / TESSERA SANITARIA DETECTION
  // -------------------------------------------------------------------------
  const cfPattern = /[A-Z]{6}[0-9LMNPQRSTUV]{2}[A-EHLMPR-T][0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{3}[A-Z]/g;
  const cfMatches = upper.match(cfPattern);

  if (cfMatches && cfMatches.length > 0) {
    // Valuta validità matematica del CF
    for (const candidate of cfMatches) {
      const val = validateFiscalCode(candidate);
      if (val.isValid) {
        docType = 'tax_code';
        number = candidate;
        typeConfidence = 0.95;
        numConfidence = 0.98;
        title = title || 'Codice Fiscale';
        break;
      }
    }

    if (!number && cfMatches[0]) {
      // Se nessun match passa la convalida del checksum ma c'è un candidato forte
      docType = 'tax_code';
      number = cfMatches[0];
      typeConfidence = 0.8;
      numConfidence = 0.7;
      title = title || 'Codice Fiscale';
    }
  }

  // -------------------------------------------------------------------------
  // 2. CARTA D'IDENTITÀ ELETTRONICA (CIE) DETECTION
  // -------------------------------------------------------------------------
  const cieKeywords = ['CARTA D\'IDENTITA', 'CARTA IDENTITA', 'IDENTITY CARD', 'CIE', 'MINISTERO DELL\'INTERNO'];
  const hasCieKeyword = cieKeywords.some(kw => upper.includes(kw));

  // Formato CIE moderno: 2 lettere, 5 cifre, 2 lettere (es. CA12345AA o CA 12345 AA)
  const cieRegex = /\b([A-Z]{2})\s*([0-9]{5})\s*([A-Z]{2})\b/g;
  const cieMatches = [...upper.matchAll(cieRegex)];

  if (hasCieKeyword || (cieMatches.length > 0 && docType === 'generic')) {
    if (cieMatches.length > 0) {
      const match = cieMatches[0];
      number = `${match[1]}${match[2]}${match[3]}`;
      numConfidence = 0.95;
    }
    docType = 'identity';
    typeConfidence = hasCieKeyword ? 0.95 : 0.8;
    title = title || 'Carta d\'Identità';
  }

  // -------------------------------------------------------------------------
  // 3. PATENTE DI GUIDA DETECTION
  // -------------------------------------------------------------------------
  const licenseKeywords = ['PATENTE DI GUIDA', 'DRIVING LICENCE', 'DRIVING LICENSE', 'MIT-UCO', 'MCTC', 'REPUBBLICA ITALIANA PATENTE'];
  const hasLicenseKeyword = licenseKeywords.some(kw => upper.includes(kw));

  // Formato Patente italiana tipico: 10 caratteri (es. U12345678X o RM1234567A)
  const licenseRegex = /\b(U1[0-9A-Z]{7}[0-9A-Z]|[A-Z]{2}[0-9]{7}[A-Z])\b/g;
  const licenseMatches = [...upper.matchAll(licenseRegex)];

  if (hasLicenseKeyword) {
    docType = 'driving_license';
    typeConfidence = 0.95;
    title = title || 'Patente di Guida';

    if (licenseMatches.length > 0) {
      number = licenseMatches[0][1];
      numConfidence = 0.9;
    } else {
      // Cerca il campo 5. (numero patente nel formato UE standard)
      const field5Match = upper.match(/5\s*[\.:\-]\s*([A-Z0-9]{8,12})/);
      if (field5Match) {
        number = field5Match[1];
        numConfidence = 0.88;
      }
    }
  } else if (licenseMatches.length > 0 && docType === 'generic') {
    docType = 'driving_license';
    number = licenseMatches[0][1];
    typeConfidence = 0.75;
    numConfidence = 0.85;
    title = title || 'Patente di Guida';
  }

  // -------------------------------------------------------------------------
  // 4. PASSAPORTO O ALTRO
  // -------------------------------------------------------------------------
  if (upper.includes('PASSAPORTO') || upper.includes('PASSPORT')) {
    docType = 'generic';
    title = 'Passaporto';
    typeConfidence = 0.9;

    const passRegex = /\b([A-Z]{2}\s*[0-9]{7})\b/;
    const pMatch = upper.match(passRegex);
    if (pMatch) {
      number = pMatch[1].replace(/\s+/g, '');
      numConfidence = 0.9;
    }
  }

  // -------------------------------------------------------------------------
  // 5. ESTRAZIONE DATE (SCADENZA E RILASCIO)
  // -------------------------------------------------------------------------
  // Cerca pattern date nel testo
  const dateCandidates: { dateStr: string; iso: string; index: number; line: string }[] = [];
  const genericDateRegex = /\b(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4})\b/g;
  let dMatch;

  while ((dMatch = genericDateRegex.exec(cleanText)) !== null) {
    const iso = normalizeDateToIso(dMatch[1]);
    if (iso) {
      const lineStart = Math.max(0, cleanText.lastIndexOf('\n', dMatch.index));
      const lineEnd = cleanText.indexOf('\n', dMatch.index);
      const line = cleanText.substring(lineStart, lineEnd === -1 ? cleanText.length : lineEnd);
      dateCandidates.push({
        dateStr: dMatch[1],
        iso,
        index: dMatch.index,
        line: line.toUpperCase()
      });
    }
  }

  // Cerca anche date con mese testuale (es. 15 OTT 2030)
  const textDateRegex = /\b(\d{1,2}\s+[a-zA-Z]{3,9}\s+\d{2,4})\b/g;
  while ((dMatch = textDateRegex.exec(cleanText)) !== null) {
    const iso = normalizeDateToIso(dMatch[1]);
    if (iso) {
      const lineStart = Math.max(0, cleanText.lastIndexOf('\n', dMatch.index));
      const lineEnd = cleanText.indexOf('\n', dMatch.index);
      const line = cleanText.substring(lineStart, lineEnd === -1 ? cleanText.length : lineEnd);
      dateCandidates.push({
        dateStr: dMatch[1],
        iso,
        index: dMatch.index,
        line: line.toUpperCase()
      });
    }
  }

  // Assegna date in base al contesto
  const expiryKeywords = ['SCADENZA', 'SCAD', 'EXPIRY', 'VALIDITA', 'VALIDA FINO', '4B', 'VAL'];
  const issueKeywords = ['RILASCIO', 'RIL', 'EMISSIONE', 'EMESSO', 'DATA DI RILASCIO', 'ISSUE', '4A'];

  for (const cand of dateCandidates) {
    const isExpContext = expiryKeywords.some(kw => cand.line.includes(kw));
    const isIssueContext = issueKeywords.some(kw => cand.line.includes(kw));

    if (isExpContext && !expiryDate) {
      expiryDate = cand.iso;
    } else if (isIssueContext && !issueDate) {
      issueDate = cand.iso;
    }
  }

  // Fallback logico per date non assegnate: se troviamo 2 date, la più futura è scadenza, la più antica è rilascio
  if ((!expiryDate || !issueDate) && dateCandidates.length >= 2) {
    const sorted = [...dateCandidates].sort((a, b) => new Date(a.iso).getTime() - new Date(b.iso).getTime());
    if (!issueDate) issueDate = sorted[0].iso;
    if (!expiryDate) expiryDate = sorted[sorted.length - 1].iso;
    dateConfidence = 0.75;
  } else if (!expiryDate && dateCandidates.length === 1) {
    const cand = dateCandidates[0];
    const candYear = new Date(cand.iso).getFullYear();
    const currentYear = new Date().getFullYear();
    // Se la data è futura, molto probabilmente è scadenza
    if (candYear >= currentYear) {
      expiryDate = cand.iso;
      dateConfidence = 0.7;
    } else {
      issueDate = cand.iso;
      dateConfidence = 0.6;
    }
  } else if (expiryDate) {
    dateConfidence = 0.9;
  }

  // -------------------------------------------------------------------------
  // 6. ESTRAZIONE ENTE DI EMISSIONE
  // -------------------------------------------------------------------------
  const municipalityMatch = cleanText.match(/Comune di[ \t]+([A-Za-zÀ-ÿ\'-]+(?:[ \t]+[A-Za-zÀ-ÿ\'-]+)*)/i);
  if (municipalityMatch) {
    issuedBy = `Comune di ${municipalityMatch[1].trim()}`;
  } else if (upper.includes('MINISTERO DELL\'INTERNO')) {
    issuedBy = 'Ministero dell\'Interno';
  } else if (upper.includes('MINISTERO DELLE FINANZE') || upper.includes('AGENZIA DELLE ENTRATE')) {
    issuedBy = 'Agenzia delle Entrate';
  } else if (upper.includes('MIT') || upper.includes('MCTC') || upper.includes('UCO') || upper.includes('MINISTERO DEI TRASPORTI')) {
    issuedBy = 'Ministero delle Infrastrutture e dei Trasporti';
  } else if (upper.includes('QUESTURA')) {
    const qMatch = cleanText.match(/Questura di[ \t]+([A-Za-zÀ-ÿ\'-]+(?:[ \t]+[A-Za-zÀ-ÿ\'-]+)*)/i);
    issuedBy = qMatch ? `Questura di ${qMatch[1].trim()}` : 'Questura';
  }

  // -------------------------------------------------------------------------
  // 7. ESTRAZIONE INTESTATARIO (NOME E COGNOME)
  // -------------------------------------------------------------------------
  const surnameMatch = cleanText.match(/\b(?:Cognome|Surname|1\.)(?:\s*\/\s*Surname)?\s*[:\.\-]?\s*([A-Za-zÀ-ÿ\'-]+(?:\s+[A-Za-zÀ-ÿ\'-]+)?)/i);
  const nameMatch = cleanText.match(/\b(?:Nome|Name|2\.)(?:\s*\/\s*Name)?\s*[:\.\-]?\s*([A-Za-zÀ-ÿ\'-]+(?:\s+[A-Za-zÀ-ÿ\'-]+)?)/i);

  if (surnameMatch && nameMatch) {
    const s = surnameMatch[1].split('\n')[0].trim();
    const n = nameMatch[1].split('\n')[0].trim();
    title = `${s} ${n}`;
  } else if (surnameMatch) {
    const s = surnameMatch[1].split('\n')[0].trim();
    title = s;
  }

  if (!title) {
    if (docType === 'tax_code') title = 'Tessera Sanitaria';
    else if (docType === 'identity') title = 'Carta d\'Identità';
    else if (docType === 'driving_license') title = 'Patente di Guida';
    else title = 'Documento';
  }

  return {
    documentType: docType,
    title,
    number,
    issueDate,
    expiryDate,
    issuedBy,
    confidence: {
      documentType: typeConfidence,
      number: numConfidence,
      dates: dateConfidence
    },
    rawText
  };
}
