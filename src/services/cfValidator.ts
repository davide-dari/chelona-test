/**
 * Validatore e decodificatore matematico del Codice Fiscale italiano.
 * Algoritmo ufficiale dell'Agenzia delle Entrate con calcolo carattere di controllo (mod 26).
 */

const ODD_VALUES: Record<string, number> = {
  '0': 1,  '1': 0,  '2': 5,  '3': 7,  '4': 9,  '5': 13, '6': 15, '7': 17, '8': 19, '9': 21,
  'A': 1,  'B': 0,  'C': 5,  'D': 7,  'E': 9,  'F': 13, 'G': 15, 'H': 17, 'I': 19, 'J': 21,
  'K': 2,  'L': 4,  'M': 18, 'N': 20, 'O': 11, 'P': 3,  'Q': 6,  'R': 8,  'S': 12, 'T': 14,
  'U': 16, 'V': 10, 'W': 22, 'X': 25, 'Y': 24, 'Z': 23
};

const EVEN_VALUES: Record<string, number> = {
  '0': 0,  '1': 1,  '2': 2,  '3': 3,  '4': 4,  '5': 5,  '6': 6,  '7': 7,  '8': 8,  '9': 9,
  'A': 0,  'B': 1,  'C': 2,  'D': 3,  'E': 4,  'F': 5,  'G': 6,  'H': 7,  'I': 8,  'J': 9,
  'K': 10, 'L': 11, 'M': 12, 'N': 13, 'O': 14, 'P': 15, 'Q': 16, 'R': 17, 'S': 18, 'T': 19,
  'U': 20, 'V': 21, 'W': 22, 'X': 23, 'Y': 24, 'Z': 25
};

const MONTH_CODES: Record<string, number> = {
  'A': 0, 'B': 1, 'C': 2, 'D': 3, 'E': 4, 'H': 5,
  'L': 6, 'M': 7, 'P': 8, 'R': 9, 'S': 10, 'T': 11
};

export interface CfValidationResult {
  isValid: boolean;
  message?: string;
  expectedCheckChar?: string;
  birthDate?: string;
  gender?: 'M' | 'F';
}

/**
 * Verifica la validità formale e matematica di un Codice Fiscale italiano (16 caratteri alfanumerici)
 */
export function validateFiscalCode(cfRaw: string): CfValidationResult {
  if (!cfRaw) {
    return { isValid: false, message: 'Codice fiscale vuoto' };
  }

  const cf = cfRaw.trim().toUpperCase();

  if (cf.length !== 16) {
    return { isValid: false, message: `Lunghezza errata (${cf.length}/16 caratteri)` };
  }

  const cfRegex = /^[A-Z]{6}[0-9LMNPQRSTUV]{2}[A-EHLMPR-T][0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{3}[A-Z]$/;
  if (!cfRegex.test(cf)) {
    return { isValid: false, message: 'Formato o caratteri non validi' };
  }

  // Calcolo matematico del carattere di controllo (16° carattere)
  let sum = 0;
  for (let i = 0; i < 15; i++) {
    const char = cf[i];
    // Posizione 1-based: posizioni dispari (1, 3, 5...) hanno indice i pari (0, 2, 4...)
    if (i % 2 === 0) {
      sum += ODD_VALUES[char] ?? 0;
    } else {
      sum += EVEN_VALUES[char] ?? 0;
    }
  }

  const expectedCheckChar = String.fromCharCode(65 + (sum % 26));
  const actualCheckChar = cf[15];

  if (expectedCheckChar !== actualCheckChar) {
    return {
      isValid: false,
      expectedCheckChar,
      message: `Carattere di controllo errato (trovato ${actualCheckChar}, atteso ${expectedCheckChar})`
    };
  }

  // Estrazione data di nascita e genere (se non omocodico numerico)
  try {
    const yearDigits = parseInt(cf.substring(6, 8), 10);
    const monthChar = cf[8];
    const rawDay = parseInt(cf.substring(9, 11), 10);

    let gender: 'M' | 'F' = 'M';
    let day = rawDay;
    if (rawDay > 40) {
      gender = 'F';
      day = rawDay - 40;
    }

    const month = MONTH_CODES[monthChar];
    if (month !== undefined && !isNaN(yearDigits) && !isNaN(day)) {
      // Anno: se > anno corrente % 100 assume 1900, altrimenti 2000
      const currentYearTwoDigits = new Date().getFullYear() % 100;
      const fullYear = yearDigits > currentYearTwoDigits ? 1900 + yearDigits : 2000 + yearDigits;
      const birthDate = `${String(day).padStart(2, '0')}/${String(month + 1).padStart(2, '0')}/${fullYear}`;
      return { isValid: true, expectedCheckChar, gender, birthDate };
    }
  } catch {
    // fallback
  }

  return { isValid: true, expectedCheckChar };
}
