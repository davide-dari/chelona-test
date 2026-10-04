/**
 * Auto Deadlines Utilities — Chelona
 * Centralized calculation of automotive deadlines, intervals, and compliance dates.
 */

import type { AutoModule } from '../types.ts';

export interface TaxCalculationResult {
  powerKw: number;
  euroClass: string;
  amount: number;
  amount2026: number;
  amount2027: number;
  isExempt2027: boolean;
  rateBase: number;
  rateExcess: number;
  badgeText: string;
  details: string;
}

export interface AutoDeadlineItem {
  id: string;
  field: string;
  label: string;
  subtitle: string;
  isKmBased: boolean;
  date?: string;               // ISO date of the deadline (calculated)
  originalDate?: string;       // Original user-entered date (e.g. date of last revision)
  km?: number;                 // Target km for next service/tires
  curKm?: number;
  kmLeft?: number;
  daysLeft?: number;
  docKey?: keyof AutoModule;
  hasDoc: boolean;
  isConfigured: boolean;
  status: 'valid' | 'urgent' | 'expired' | 'unconfigured';
  statusText: string;
  isFeminine: boolean;
  taxCalculation?: TaxCalculationResult;
}

/**
 * Calcolo del Bollo Auto in Italia (Regole 2026 e Novità Legge 2027 per veicoli <= 80 kW).
 * - Fino a 53 kW tariffa base, oltre 53 kW tariffa eccedente.
 * - Novità 2027: veicoli con potenza <= 80 kW sono totalmente esenti (0 €)!
 */
export function calculateBolloAuto(
  powerKw: number,
  euroClass: string = 'Euro 6',
  fuelType: string = 'benzina',
  year: number = 2026
): TaxCalculationResult {
  const kw = Math.max(0, powerKw);
  const normEuro = euroClass ? euroClass.trim() : 'Euro 6';

  let rateBase = 2.58;
  let rateExcess = 3.87;

  if (normEuro.includes('0')) {
    rateBase = 3.00;
    rateExcess = 4.50;
  } else if (normEuro.includes('1')) {
    rateBase = 2.90;
    rateExcess = 4.35;
  } else if (normEuro.includes('2')) {
    rateBase = 2.80;
    rateExcess = 4.20;
  } else if (normEuro.includes('3')) {
    rateBase = 2.70;
    rateExcess = 4.05;
  } else {
    // Euro 4, 5, 6
    rateBase = 2.58;
    rateExcess = 3.87;
  }

  let calcAmount = 0;
  if ((fuelType || '').toLowerCase() === 'elettrica') {
    // Elettriche: esenzione per 5 anni, poi riduzione al 25% della tariffa Euro 6
    calcAmount = Math.round((Math.min(kw, 53) * rateBase + Math.max(0, kw - 53) * rateExcess) * 0.25 * 100) / 100;
  } else {
    if (kw <= 53) {
      calcAmount = Math.round(kw * rateBase * 100) / 100;
    } else {
      calcAmount = Math.round((53 * rateBase + (kw - 53) * rateExcess) * 100) / 100;
    }
  }

  const amount2026 = calcAmount;

  // Nuova legge Bollo 2027: veicoli fino a 80 kW (<= 80 kW) sono esenti dal pagamento!
  const isExempt2027 = kw <= 80;
  const amount2027 = isExempt2027 ? 0 : amount2026;

  const currentYearAmount = year >= 2027 ? amount2027 : amount2026;

  let badgeText = '';
  let details = '';

  if (isExempt2027) {
    badgeText = 'Esenzione Bollo 2027: veicolo sotto 80 kW';
    if (year >= 2027) {
      details = `Esenzione totale applicata (0,00 €) per nuova legge 2027: veicolo con potenza ${kw} kW (<= 80 kW).`;
    } else {
      details = `Importo 2026: € ${amount2026.toFixed(2)}. Dal 2027: ESENZIONE TOTALE (0,00 €) per veicoli <= 80 kW!`;
    }
  } else {
    badgeText = `Bollo ordinario (${kw} kW)`;
    details = `Tariffa ordinaria: € ${amount2026.toFixed(2)} / anno (veicolo con ${kw} kW > 80 kW).`;
  }

  return {
    powerKw: kw,
    euroClass: normEuro,
    amount: currentYearAmount,
    amount2026,
    amount2027,
    isExempt2027,
    rateBase,
    rateExcess,
    badgeText,
    details,
  };
}

/**
 * Calculates the exact future deadline expiration date from user input.
 * In Italy:
 * - Revisione: 2 years after last revision (last day of the month), or 4 years after registration year
 * - Bombola GPL: 10 years after installation / replacement date
 * - Bombola Metano: 4 years (standard) or 5 years (R110) after last inspection
 * - Assicurazione, Bollo, Batterie: user enters the expiration date directly
 */
export function getAutoDeadlineTargetDate(
  field: string,
  val: string | undefined,
  module?: { fuelType?: string; methaneType?: string; registrationYear?: string }
): Date | null {
  if (!val) {
    if (field === 'lastRevision' && module?.registrationYear) {
      const year = Number(module.registrationYear);
      if (!isNaN(year) && year >= 1970) {
        // First revision: 4 years after registration year, on December 31
        return new Date(year + 4, 11, 31);
      }
    }
    return null;
  }

  const d = new Date(val);
  if (isNaN(d.getTime())) return null;

  if (field === 'lastRevision') {
    // 2 years after last inspection date, expiring at the end of the month
    return new Date(d.getFullYear() + 2, d.getMonth() + 1, 0);
  }

  if (field === 'lastGplCylinder') {
    // 10 years validity
    return new Date(d.getFullYear() + 10, d.getMonth(), d.getDate());
  }

  if (field === 'lastMethaneCylinder') {
    const years = module?.methaneType === 'r110' ? 5 : 4;
    return new Date(d.getFullYear() + years, d.getMonth(), d.getDate());
  }

  return d;
}

/**
 * Returns true if the Italian noun for this deadline is grammatically feminine
 * (e.g. "Assicurazione Scaduta", "Revisione Scaduta", but "Bollo Scaduto").
 */
export function isDeadlineFeminine(field: string): boolean {
  return [
    'lastInsurance',
    'lastRevision',
    'battery12vExpiryDate',
    'hybridBatteryExpiryDate',
    'lastGplCylinder',
    'lastMethaneCylinder',
  ].includes(field);
}

/**
 * Format human-readable countdown in Italian
 */
export function formatDeadlineCountdown(daysLeft: number, isFeminine: boolean = false): {
  status: 'valid' | 'urgent' | 'expired';
  text: string;
} {
  const genderSuffix = isFeminine ? 'a' : 'o';
  if (daysLeft < 0) {
    const abs = Math.abs(daysLeft);
    return {
      status: 'expired',
      text: `Scadut${genderSuffix} da ${abs} ${abs === 1 ? 'giorno' : 'gg'}`
    };
  }
  if (daysLeft === 0) {
    return {
      status: 'urgent',
      text: 'Scade oggi!'
    };
  }
  if (daysLeft === 1) {
    return {
      status: 'urgent',
      text: 'Scade domani (1 gg)'
    };
  }
  if (daysLeft <= 30) {
    return {
      status: 'urgent',
      text: `Scade tra ${daysLeft} gg`
    };
  }
  return {
    status: 'valid',
    text: `Valido (${daysLeft} gg)`
  };
}

/**
 * Computes all deadlines for a vehicle, including unconfigured core pillars
 */
export function computeVehicleDeadlines(module: AutoModule): AutoDeadlineItem[] {
  const list: AutoDeadlineItem[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const curKm = module.currentKm ? Number(String(module.currentKm).replace(/\D/g, '')) : undefined;

  // 1. Assicurazione RCA
  const insTarget = getAutoDeadlineTargetDate('lastInsurance', module.lastInsurance, module);
  if (insTarget) {
    const daysLeft = Math.round((insTarget.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const countdown = formatDeadlineCountdown(daysLeft, true);
    list.push({
      id: 'ins',
      field: 'lastInsurance',
      label: 'Assicurazione RCA',
      subtitle: 'Polizza auto e carta verde',
      isKmBased: false,
      date: insTarget.toISOString().split('T')[0],
      originalDate: module.lastInsurance,
      daysLeft,
      docKey: 'insuranceDoc',
      hasDoc: Boolean(module.insuranceDoc),
      isConfigured: true,
      status: countdown.status,
      statusText: countdown.text,
      isFeminine: true,
    });
  } else {
    list.push({
      id: 'ins',
      field: 'lastInsurance',
      label: 'Assicurazione RCA',
      subtitle: 'Polizza obbligatoria di circolazione',
      isKmBased: false,
      docKey: 'insuranceDoc',
      hasDoc: Boolean(module.insuranceDoc),
      isConfigured: false,
      status: 'unconfigured',
      statusText: 'Da impostare',
      isFeminine: true,
    });
  }

  // 2. Bollo Auto
  const kwNum = module.powerKw !== undefined && module.powerKw !== '' 
    ? Number(String(module.powerKw).replace(/[^\d.]/g, '')) 
    : undefined;
  const taxTarget = getAutoDeadlineTargetDate('lastTax', module.lastTax, module);
  const taxTargetYear = taxTarget ? taxTarget.getFullYear() : 2026;
  const taxCalc = (kwNum !== undefined && !isNaN(kwNum))
    ? calculateBolloAuto(kwNum, module.euroClass || 'Euro 6', module.fuelType || 'benzina', taxTargetYear)
    : undefined;

  let taxSubtitle = 'Tassa automobilistica regionale';
  if (taxCalc) {
    if (taxCalc.isExempt2027) {
      taxSubtitle = taxTargetYear >= 2027
        ? `Esenzione Bollo 2027 (< 80 kW) · 0,00 €`
        : `2026: € ${taxCalc.amount2026.toFixed(2)} · Esenzione 2027: 0 € (< 80 kW)`;
    } else {
      taxSubtitle = `Stima: € ${taxCalc.amount2026.toFixed(2)} / anno (${taxCalc.powerKw} kW · ${taxCalc.euroClass})`;
    }
  }

  if (taxTarget) {
    const daysLeft = Math.round((taxTarget.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const countdown = formatDeadlineCountdown(daysLeft, false);
    list.push({
      id: 'tax',
      field: 'lastTax',
      label: 'Bollo Auto',
      subtitle: taxSubtitle,
      isKmBased: false,
      date: taxTarget.toISOString().split('T')[0],
      originalDate: module.lastTax,
      daysLeft,
      docKey: 'taxDoc',
      hasDoc: Boolean(module.taxDoc),
      isConfigured: true,
      status: countdown.status,
      statusText: countdown.text,
      isFeminine: false,
      taxCalculation: taxCalc,
    });
  } else {
    list.push({
      id: 'tax',
      field: 'lastTax',
      label: 'Bollo Auto',
      subtitle: taxCalc ? taxSubtitle : 'Tassa automobilistica regionale (imposta kW per calcolo)',
      isKmBased: false,
      docKey: 'taxDoc',
      hasDoc: Boolean(module.taxDoc),
      isConfigured: false,
      status: 'unconfigured',
      statusText: 'Da impostare',
      isFeminine: false,
      taxCalculation: taxCalc,
    });
  }

  // 3. Revisione Ministeriale
  const revTarget = getAutoDeadlineTargetDate('lastRevision', module.lastRevision, module);
  if (revTarget) {
    const daysLeft = Math.round((revTarget.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const countdown = formatDeadlineCountdown(daysLeft, true);
    const subtitle = module.lastRevision 
      ? 'Controllo periodico biennale (+2 anni da ultima)'
      : `Prima revisione (+4 anni da immatricolazione ${module.registrationYear})`;

    list.push({
      id: 'rev',
      field: 'lastRevision',
      label: 'Revisione Ministeriale',
      subtitle,
      isKmBased: false,
      date: revTarget.toISOString().split('T')[0],
      originalDate: module.lastRevision,
      daysLeft,
      docKey: 'revisionDoc',
      hasDoc: Boolean(module.revisionDoc),
      isConfigured: true,
      status: countdown.status,
      statusText: countdown.text,
      isFeminine: true,
    });
  } else {
    list.push({
      id: 'rev',
      field: 'lastRevision',
      label: 'Revisione Ministeriale',
      subtitle: 'Controllo periodico biennale / 4 anni se nuova',
      isKmBased: false,
      docKey: 'revisionDoc',
      hasDoc: Boolean(module.revisionDoc),
      isConfigured: false,
      status: 'unconfigured',
      statusText: 'Da impostare',
      isFeminine: true,
    });
  }

  // 4. Tagliando (Km-based)
  if (module.lastServiceKm) {
    const lastSvc = Number(String(module.lastServiceKm).replace(/\D/g, ''));
    const nextSvc = lastSvc + 15000;
    if (curKm !== undefined && !isNaN(curKm)) {
      const kmLeft = nextSvc - curKm;
      let status: 'valid' | 'urgent' | 'expired' = 'valid';
      let statusText = `${kmLeft.toLocaleString('it-IT')} km rimasti`;
      if (kmLeft <= 0) {
        status = 'expired';
        statusText = `Superato di ${Math.abs(kmLeft).toLocaleString('it-IT')} km`;
      } else if (kmLeft <= 1500) {
        status = 'urgent';
        statusText = `Tra ${kmLeft.toLocaleString('it-IT')} km`;
      } else {
        statusText = `Valido (${kmLeft.toLocaleString('it-IT')} km)`;
      }

      list.push({
        id: 'svc',
        field: 'lastServiceKm',
        label: 'Prossimo Tagliando',
        subtitle: `Scadenza a ${nextSvc.toLocaleString('it-IT')} km (ogni 15.000 km)`,
        km: nextSvc,
        curKm,
        kmLeft,
        isKmBased: true,
        docKey: 'serviceDoc',
        hasDoc: Boolean(module.serviceDoc),
        isConfigured: true,
        status,
        statusText,
        isFeminine: false,
      });
    } else {
      list.push({
        id: 'svc',
        field: 'lastServiceKm',
        label: 'Prossimo Tagliando',
        subtitle: `Previsto a ${nextSvc.toLocaleString('it-IT')} km`,
        km: nextSvc,
        isKmBased: true,
        docKey: 'serviceDoc',
        hasDoc: Boolean(module.serviceDoc),
        isConfigured: true,
        status: 'valid',
        statusText: `A ${nextSvc.toLocaleString('it-IT')} km`,
        isFeminine: false,
      });
    }
  } else {
    list.push({
      id: 'svc',
      field: 'lastServiceKm',
      label: 'Prossimo Tagliando',
      subtitle: 'Manutenzione ordinaria olio e filtri (ogni 15.000 km)',
      isKmBased: true,
      docKey: 'serviceDoc',
      hasDoc: Boolean(module.serviceDoc),
      isConfigured: false,
      status: 'unconfigured',
      statusText: 'Da impostare',
      isFeminine: false,
    });
  }

  // 5. Controllo Gomme / Pneumatici
  if (module.tiresKm) {
    const lastTires = Number(String(module.tiresKm).replace(/\D/g, ''));
    const offset = module.tiresSuggestedOffsetKm ? Number(module.tiresSuggestedOffsetKm) : 0;
    const nextTires = lastTires + 10000 + offset;
    if (curKm !== undefined && !isNaN(curKm)) {
      const kmLeft = nextTires - curKm;
      let status: 'valid' | 'urgent' | 'expired' = 'valid';
      let statusText = `${kmLeft.toLocaleString('it-IT')} km rimasti`;
      if (kmLeft <= 0) {
        status = 'expired';
        statusText = `Superato di ${Math.abs(kmLeft).toLocaleString('it-IT')} km`;
      } else if (kmLeft <= 1500) {
        status = 'urgent';
        statusText = `Tra ${kmLeft.toLocaleString('it-IT')} km`;
      } else {
        statusText = `Valido (${kmLeft.toLocaleString('it-IT')} km)`;
      }

      list.push({
        id: 'tires',
        field: 'tiresKm',
        label: 'Controllo / Inversione Gomme',
        subtitle: `Scadenza a ${nextTires.toLocaleString('it-IT')} km`,
        km: nextTires,
        curKm,
        kmLeft,
        isKmBased: true,
        docKey: 'tireDoc',
        hasDoc: Boolean(module.tireDoc),
        isConfigured: true,
        status,
        statusText,
        isFeminine: false,
      });
    } else {
      list.push({
        id: 'tires',
        field: 'tiresKm',
        label: 'Controllo / Inversione Gomme',
        subtitle: `Previsto a ${nextTires.toLocaleString('it-IT')} km`,
        km: nextTires,
        isKmBased: true,
        docKey: 'tireDoc',
        hasDoc: Boolean(module.tireDoc),
        isConfigured: true,
        status: 'valid',
        statusText: `A ${nextTires.toLocaleString('it-IT')} km`,
        isFeminine: false,
      });
    }
  } else {
    list.push({
      id: 'tires',
      field: 'tiresKm',
      label: 'Controllo / Inversione Gomme',
      subtitle: 'Inversione assi e verifica battistrada (ogni 10.000 km)',
      isKmBased: true,
      docKey: 'tireDoc',
      hasDoc: Boolean(module.tireDoc),
      isConfigured: false,
      status: 'unconfigured',
      statusText: 'Da impostare',
      isFeminine: false,
    });
  }

  // 6. Batteria 12V (optional / date-based)
  const batTarget = getAutoDeadlineTargetDate('battery12vExpiryDate', module.battery12vExpiryDate, module);
  if (batTarget) {
    const daysLeft = Math.round((batTarget.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const countdown = formatDeadlineCountdown(daysLeft, true);
    list.push({
      id: 'bat12',
      field: 'battery12vExpiryDate',
      label: 'Batteria 12V',
      subtitle: 'Scadenza garanzia batteria di avviamento',
      isKmBased: false,
      date: batTarget.toISOString().split('T')[0],
      originalDate: module.battery12vExpiryDate,
      daysLeft,
      docKey: 'battery12vDoc',
      hasDoc: Boolean(module.battery12vDoc),
      isConfigured: true,
      status: countdown.status,
      statusText: countdown.text,
      isFeminine: true,
    });
  }

  // 7. Garanzia Batteria Ibrida / Elettrica
  const isElectrified = module.fuelType === 'ibrida' || module.fuelType === 'elettrica';
  if (isElectrified) {
    const hybridTarget = getAutoDeadlineTargetDate('hybridBatteryExpiryDate', module.hybridBatteryExpiryDate, module);
    if (hybridTarget) {
      const daysLeft = Math.round((hybridTarget.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const countdown = formatDeadlineCountdown(daysLeft, true);
      list.push({
        id: 'hybrid',
        field: 'hybridBatteryExpiryDate',
        label: 'Batteria Ibrida / EV',
        subtitle: 'Controllo o garanzia costruttore',
        isKmBased: false,
        date: hybridTarget.toISOString().split('T')[0],
        originalDate: module.hybridBatteryExpiryDate,
        daysLeft,
        docKey: 'hybridBatteryDoc',
        hasDoc: Boolean(module.hybridBatteryDoc),
        isConfigured: true,
        status: countdown.status,
        statusText: countdown.text,
        isFeminine: true,
      });
    } else {
      list.push({
        id: 'hybrid',
        field: 'hybridBatteryExpiryDate',
        label: 'Batteria Ibrida / EV',
        subtitle: 'Garanzia costruttore pacco batterie',
        isKmBased: false,
        docKey: 'hybridBatteryDoc',
        hasDoc: Boolean(module.hybridBatteryDoc),
        isConfigured: false,
        status: 'unconfigured',
        statusText: 'Da impostare',
        isFeminine: true,
      });
    }
  }

  // 8. Bombola GPL
  if (module.fuelType === 'gpl') {
    const gplTarget = getAutoDeadlineTargetDate('lastGplCylinder', module.lastGplCylinder, module);
    if (gplTarget) {
      const daysLeft = Math.round((gplTarget.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const countdown = formatDeadlineCountdown(daysLeft, true);
      list.push({
        id: 'gpl',
        field: 'lastGplCylinder',
        label: 'Sostituzione Bombola GPL',
        subtitle: 'Validità decennale (10 anni da installazione)',
        isKmBased: false,
        date: gplTarget.toISOString().split('T')[0],
        originalDate: module.lastGplCylinder,
        daysLeft,
        isConfigured: true,
        hasDoc: false,
        status: countdown.status,
        statusText: countdown.text,
        isFeminine: true,
      });
    } else {
      list.push({
        id: 'gpl',
        field: 'lastGplCylinder',
        label: 'Sostituzione Bombola GPL',
        subtitle: 'Validità decennale normativa ECE/ONU',
        isKmBased: false,
        isConfigured: false,
        hasDoc: false,
        status: 'unconfigured',
        statusText: 'Da impostare',
        isFeminine: true,
      });
    }
  }

  // 9. Bombola Metano
  if (module.fuelType === 'metano') {
    const cngTarget = getAutoDeadlineTargetDate('lastMethaneCylinder', module.lastMethaneCylinder, module);
    if (cngTarget) {
      const daysLeft = Math.round((cngTarget.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const countdown = formatDeadlineCountdown(daysLeft, true);
      const isR110 = module.methaneType === 'r110';
      list.push({
        id: 'cng',
        field: 'lastMethaneCylinder',
        label: 'Revisione Bombola Metano',
        subtitle: isR110 ? 'Omologazione Europea R110 (5 anni)' : 'Omologazione Standard (4 anni)',
        isKmBased: false,
        date: cngTarget.toISOString().split('T')[0],
        originalDate: module.lastMethaneCylinder,
        daysLeft,
        isConfigured: true,
        hasDoc: false,
        status: countdown.status,
        statusText: countdown.text,
        isFeminine: true,
      });
    } else {
      list.push({
        id: 'cng',
        field: 'lastMethaneCylinder',
        label: 'Revisione Bombola Metano',
        subtitle: 'Omologazione 4 anni (standard) o 5 anni (R110)',
        isKmBased: false,
        isConfigured: false,
        hasDoc: false,
        status: 'unconfigured',
        statusText: 'Da impostare',
        isFeminine: true,
      });
    }
  }

  // Sort logic: expired first, then urgent, then valid (ordered by days/km), then unconfigured
  return list.sort((a, b) => {
    const rank = { expired: 0, urgent: 1, valid: 2, unconfigured: 3 };
    if (rank[a.status] !== rank[b.status]) {
      return rank[a.status] - rank[b.status];
    }
    const valA = a.daysLeft ?? (a.kmLeft ? a.kmLeft / 40 : 99999);
    const valB = b.daysLeft ?? (b.kmLeft ? b.kmLeft / 40 : 99999);
    return valA - valB;
  });
}
