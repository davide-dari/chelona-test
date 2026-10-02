/**
 * Servizio per la gestione dello Studio Medico, Orari in tempo reale e Richiesta Ricette.
 * Include calcolo matematico dello stato apertura/chiusura studio e countdown live.
 */

export interface DoctorSlot {
  start: string; // "09:00"
  end: string;   // "12:30"
}

export interface DoctorDaySchedule {
  closed: boolean;
  slots: DoctorSlot[];
}

export interface DoctorProfile {
  firstName: string;
  lastName: string;
  gender: 'M' | 'F';
  specialization: string;
  address: string;
  city: string;
  cap: string;
  email: string;
  landline: string;
  mobile: string;
  landlines?: string[];
  mobiles?: string[];
  notes: string;
  schedule: Record<number, DoctorDaySchedule>; // 0 = Domenica, 1 = Lunedì ... 6 = Sabato
}

export interface MedicineItem {
  id: string;
  name: string;
  type: 'farmaco' | 'visita';
  posology?: string;
  notes?: string;
  lastRequestedAt?: string;
}

export interface DoctorState {
  doctor: DoctorProfile;
  medicines: MedicineItem[];
  configured: boolean;
}

export const DAYS_NAMES: { id: number; name: string; short: string }[] = [
  { id: 1, name: 'Lunedì', short: 'Lun' },
  { id: 2, name: 'Martedì', short: 'Mar' },
  { id: 3, name: 'Mercoledì', short: 'Mer' },
  { id: 4, name: 'Giovedì', short: 'Gio' },
  { id: 5, name: 'Venerdì', short: 'Ven' },
  { id: 6, name: 'Sabato', short: 'Sab' },
  { id: 0, name: 'Domenica', short: 'Dom' },
];

export const DEFAULT_DOCTOR_STATE: DoctorState = {
  configured: false,
  doctor: {
    firstName: '',
    lastName: '',
    gender: 'M',
    specialization: 'Medico di Medicina Generale',
    address: '',
    city: '',
    cap: '',
    email: '',
    landline: '',
    mobile: '',
    notes: 'Per visite domiciliari chiamare entro le 10:00.',
    schedule: {
      1: { closed: false, slots: [{ start: '09:00', end: '12:30' }, { start: '16:00', end: '19:00' }] }, // Lunedì
      2: { closed: false, slots: [{ start: '09:00', end: '12:30' }] },                                      // Martedì
      3: { closed: false, slots: [{ start: '15:30', end: '19:00' }] },                                      // Mercoledì
      4: { closed: false, slots: [{ start: '09:00', end: '12:30' }, { start: '16:00', end: '19:00' }] }, // Giovedì
      5: { closed: false, slots: [{ start: '09:00', end: '12:30' }] },                                      // Venerdì
      6: { closed: true, slots: [] },                                                                       // Sabato
      0: { closed: true, slots: [] },                                                                       // Domenica
    },
  },
  medicines: [
    { id: 'sample-1', name: 'Cardioaspirina 100mg', type: 'farmaco', posology: '1 cpr al giorno dopo pranzo' },
    { id: 'sample-2', name: 'Esami del sangue di routine (Assetto lipidico, Glicemia, Creatinina)', type: 'visita' },
  ],
};

const STORAGE_KEY = 'chelona_doctor_state_v1';

export function loadDoctorState(): DoctorState {
  try {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined' || !localStorage?.getItem) {
      return DEFAULT_DOCTOR_STATE;
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_DOCTOR_STATE,
        ...parsed,
        doctor: {
          ...DEFAULT_DOCTOR_STATE.doctor,
          ...parsed.doctor,
          schedule: {
            ...DEFAULT_DOCTOR_STATE.doctor.schedule,
            ...(parsed.doctor?.schedule || {}),
          },
        },
      };
    }
  } catch (e) {
    console.error('Error loading doctor state:', e);
  }
  return DEFAULT_DOCTOR_STATE;
}

export function saveDoctorState(state: DoctorState): void {
  try {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined' && localStorage?.setItem) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  } catch (e) {
    console.error('Error saving doctor state:', e);
  }
}

export interface StudioStatusResult {
  isOpen: boolean;
  isClosingSoon: boolean;
  minutesRemaining?: number;
  currentSlot?: DoctorSlot;
  label: 'APERTO' | 'CHIUDE A BREVE' | 'CHIUSO';
  statusColor: 'emerald' | 'amber' | 'rose';
  detail: string;
  nextOpeningText?: string;
}

/**
 * Calcolo matematico in tempo reale dello stato dello studio medico
 * Data l'ora corrente t, confronta gli intervalli [s, e] e determina:
 * - Aperto vs Chiuso
 * - Minuti alla chiusura e alert "Chiude a breve" (< 30 min)
 * - Prossima apertura ciclica su modulo 7 giorni (10080 minuti)
 */
export function computeDoctorStudioStatus(
  schedule: Record<number, DoctorDaySchedule>,
  now: Date = new Date()
): StudioStatusResult {
  const currentDay = now.getDay(); // 0..6
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const parseMinutes = (timeStr: string): number => {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  const todaySchedule = schedule[currentDay];

  // 1. Verifica se lo studio è attualmente aperto in uno dei suoi slot
  if (todaySchedule && !todaySchedule.closed && Array.isArray(todaySchedule.slots)) {
    for (const slot of todaySchedule.slots) {
      const s = parseMinutes(slot.start);
      const e = parseMinutes(slot.end);
      if (currentMinutes >= s && currentMinutes < e) {
        const remaining = e - currentMinutes;
        const isClosingSoon = remaining <= 30;

        return {
          isOpen: true,
          isClosingSoon,
          minutesRemaining: remaining,
          currentSlot: slot,
          label: isClosingSoon ? 'CHIUDE A BREVE' : 'APERTO',
          statusColor: isClosingSoon ? 'amber' : 'emerald',
          detail: `Fino alle ${slot.end} (${remaining > 60 ? `${Math.floor(remaining / 60)}h ${remaining % 60}m` : `${remaining} min`})`,
        };
      }
    }
  }

  // 2. Se non è aperto, calcola matematicamente il prossimo slot di apertura nei prossimi 7 giorni
  let foundOffsetDays: number | null = null;
  let foundSlot: DoctorSlot | null = null;
  let minutesToNext = Infinity;

  for (let offset = 0; offset < 7; offset++) {
    const checkDay = (currentDay + offset) % 7;
    const daySched = schedule[checkDay];
    if (!daySched || daySched.closed || !daySched.slots || daySched.slots.length === 0) {
      continue;
    }

    // Ordina gli slot del giorno per ora di inizio
    const sortedSlots = [...daySched.slots].sort((a, b) => parseMinutes(a.start) - parseMinutes(b.start));

    for (const slot of sortedSlots) {
      const s = parseMinutes(slot.start);
      const slotAbsoluteMinutes = offset * 1440 + s;
      const diff = slotAbsoluteMinutes - currentMinutes;

      if (diff > 0 && diff < minutesToNext) {
        minutesToNext = diff;
        foundOffsetDays = offset;
        foundSlot = slot;
        break;
      }
    }

    if (foundSlot) break;
  }

  if (foundSlot && foundOffsetDays !== null) {
    let nextText = '';
    const dayObj = DAYS_NAMES.find(d => d.id === (currentDay + foundOffsetDays) % 7);
    const dayLabel = dayObj ? dayObj.name : '';

    if (foundOffsetDays === 0) {
      const hours = Math.floor(minutesToNext / 60);
      const mins = minutesToNext % 60;
      nextText = `Apre oggi alle ${foundSlot.start} (tra ${hours > 0 ? `${hours}h ` : ''}${mins}m)`;
    } else if (foundOffsetDays === 1) {
      nextText = `Apre domani (${dayLabel}) alle ${foundSlot.start}`;
    } else {
      nextText = `Apre ${dayLabel} alle ${foundSlot.start}`;
    }

    return {
      isOpen: false,
      isClosingSoon: false,
      label: 'CHIUSO',
      statusColor: 'rose',
      detail: nextText,
      nextOpeningText: nextText,
    };
  }

  return {
    isOpen: false,
    isClosingSoon: false,
    label: 'CHIUSO',
    statusColor: 'rose',
    detail: 'Nessun orario di apertura programmato',
  };
}

/**
 * Genera il testo formale della richiesta ricetta via email
 */
export function buildPrescriptionEmail(
  doctor: DoctorProfile,
  patientName: string,
  patientFiscalCode: string,
  selectedMedicines: MedicineItem[],
  additionalNotes?: string
): { subject: string; body: string; mailtoUrl: string } {
  const isMorning = new Date().getHours() < 13;
  const greeting = isMorning ? 'Buongiorno' : 'Buonasera';
  const docTitle = doctor.gender === 'F' ? 'Dott.ssa' : 'Dott.';
  const docSurname = doctor.lastName || doctor.firstName || 'Dottore';

  const meds = selectedMedicines.filter(m => m.type === 'farmaco');
  const visits = selectedMedicines.filter(m => m.type === 'visita');

  let body = `${greeting} ${docTitle} ${docSurname},\n\n`;
  body += `Le trasmetto la richiesta per il rinnovo delle seguenti prescrizioni per il paziente:\n`;
  body += `Paziente: ${patientName || 'Assistito'}\n`;
  if (patientFiscalCode) {
    body += `Codice Fiscale: ${patientFiscalCode}\n`;
  }
  body += `\n`;

  if (meds.length > 0) {
    body += `FARMACI RICHIESTI:\n`;
    meds.forEach((m, idx) => {
      body += `${idx + 1}. ${m.name}${m.posology ? ` (Posologia: ${m.posology})` : ''}\n`;
    });
    body += `\n`;
  }

  if (visits.length > 0) {
    body += `VISITE / ESAMI RICHIESTI:\n`;
    visits.forEach((v, idx) => {
      body += `${idx + 1}. ${v.name}${v.notes ? ` (${v.notes})` : ''}\n`;
    });
    body += `\n`;
  }

  if (additionalNotes && additionalNotes.trim()) {
    body += `NOTE AGGIUNTIVE:\n${additionalNotes.trim()}\n\n`;
  }

  body += `La ringrazio cordialmente per la consueta disponibilità.\n\n`;
  body += `Cordiali saluti,\n${patientName || ''}`;

  const subject = `Richiesta ricette / prescrizioni - ${patientName || 'Paziente'}${patientFiscalCode ? ` - CF: ${patientFiscalCode}` : ''}`;
  const mailtoUrl = `mailto:${doctor.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  return { subject, body, mailtoUrl };
}
