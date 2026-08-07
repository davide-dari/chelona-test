/*
 * Ciclo di validità dei volantini: ogni catena pubblica il volantino in un
 * giorno della settimana fisso (renewalWeekday) e resta valido per 7 giorni.
 * L'app calcola la finestra corrente e, quando scade, passa automaticamente
 * alla finestra successiva.
 */

export interface FlyerWindow {
  /** Inizio validità del volantino corrente */
  start: Date;
  /** Scadenza del volantino corrente */
  end: Date;
  /** Inizio del prossimo volantino */
  next: Date;
  /** Il volantino corrente è ancora valido oggi */
  isCurrent: boolean;
}

export const DEFAULT_RENEWAL_WEEKDAY = 4; // giovedì

/**
 * Finestra di validità corrente per una catena con il dato giorno di
 * pubblicazione (0=domenica … 6=sabato).
 */
export function flyerWindow(renewalWeekday: number = DEFAULT_RENEWAL_WEEKDAY, now: Date = new Date()): FlyerWindow {
  const day = now.getDay();
  const diff = ((day - renewalWeekday) % 7 + 7) % 7;
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(now.getDate() - diff);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const next = new Date(start);
  next.setDate(start.getDate() + 7);
  const current = now >= start && now <= end;
  return { start, end, next, isCurrent: current };
}

/** Finestra correnta serializzata per il modello VolantinoFlyer. */
export function flyerWindowISO(renewalWeekday?: number, now: Date = new Date()) {
  const w = flyerWindow(renewalWeekday, now);
  return {
    validFrom: w.start.toISOString(),
    validTo: w.end.toISOString(),
    nextFrom: w.next.toISOString(),
    isCurrent: w.isCurrent,
  };
}

/** Numero di giorni rimanenti fino alla scadenza (può essere negativo). */
export function daysUntil(iso?: string, now: Date = new Date()): number | null {
  if (!iso) return null;
  const end = new Date(iso);
  if (isNaN(end.getTime())) return null;
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const endDay = new Date(end);
  endDay.setHours(0, 0, 0, 0);
  return Math.round((endDay.getTime() - start.getTime()) / 86400000);
}