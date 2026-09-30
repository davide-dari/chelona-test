/**
 * Servizio per l'integrazione di Google Gemini Nano On-Device
 * tramite Chrome Built-in AI / Prompt API (window.ai / ai.languageModel).
 * 
 * 100% Locale sul dispositivo • Zero Cloud • Privacy Totale • Hardware Acceleration
 */

export interface GeminiNanoStatus {
  supported: boolean;
  available: 'readily' | 'after-download' | 'no' | 'unsupported';
  engineName: 'Gemini Nano On-Device' | 'Motore Locale Chelona';
  details: string;
}

let activeSession: any = null;
let cachedStatus: GeminiNanoStatus | null = null;
let lastCheckTime = 0;

/**
 * Rileva se sul dispositivo è presente e utilizzabile Gemini Nano
 * tramite la Prompt API di Google Chrome / Android WebView (window.ai).
 */
export async function checkGeminiNanoStatus(): Promise<GeminiNanoStatus> {
  const now = Date.now();
  if (cachedStatus && (now - lastCheckTime) < 30000) {
    return cachedStatus;
  }

  try {
    if (typeof window === 'undefined') {
      cachedStatus = {
        supported: false,
        available: 'unsupported',
        engineName: 'Motore Locale Chelona',
        details: 'Ambiente non-browser',
      };
      lastCheckTime = now;
      return cachedStatus;
    }

    const ai = (window as any).ai;
    const model = (window as any).model;

    // Standard Chrome Prompt API (ai.languageModel)
    const lm = ai?.languageModel || model?.languageModel || ai?.assistant;

    if (!lm) {
      cachedStatus = {
        supported: false,
        available: 'unsupported',
        engineName: 'Motore Locale Chelona',
        details: 'Prompt API (window.ai) non rilevata sul dispositivo',
      };
      lastCheckTime = now;
      return cachedStatus;
    }

    // Verifica capabilities / availability
    let availability: 'readily' | 'after-download' | 'no' = 'no';

    if (typeof lm.capabilities === 'function') {
      const caps = await lm.capabilities();
      availability = caps?.available || 'no';
    } else if (typeof lm.availability === 'function') {
      const av = await lm.availability();
      availability = av || 'no';
    } else {
      availability = 'readily';
    }

    if (availability === 'readily') {
      cachedStatus = {
        supported: true,
        available: 'readily',
        engineName: 'Gemini Nano On-Device',
        details: 'Gemini Nano attivo e pronto all\'uso locale su hardware',
      };
    } else if (availability === 'after-download') {
      cachedStatus = {
        supported: true,
        available: 'after-download',
        engineName: 'Gemini Nano On-Device',
        details: 'Gemini Nano supportato (in download sul dispositivo)',
      };
    } else {
      cachedStatus = {
        supported: false,
        available: 'no',
        engineName: 'Motore Locale Chelona',
        details: 'Modello non disponibile al momento',
      };
    }

    lastCheckTime = now;
    return cachedStatus;
  } catch (err: any) {
    console.warn('[GeminiNano] Errore verifica disponibilità:', err);
    cachedStatus = {
      supported: false,
      available: 'unsupported',
      engineName: 'Motore Locale Chelona',
      details: err?.message || 'Errore durante la verifica',
    };
    lastCheckTime = now;
    return cachedStatus;
  }
}

/**
 * Ottiene o inizializza una sessione on-device con Gemini Nano
 */
async function getOrCreateSession(systemPrompt?: string): Promise<any | null> {
  if (activeSession) return activeSession;

  try {
    const ai = (window as any).ai;
    const model = (window as any).model;
    const lm = ai?.languageModel || model?.languageModel || ai?.assistant;

    if (!lm || typeof lm.create !== 'function') return null;

    const defaultSystemPrompt = 
      "Sei Chelona AI, l'assistente personale intelligente, preciso, discreto ed empatico dell'applicazione Chelona. " +
      "Rispondi sempre in italiano naturale, chiaro e sintetico. " +
      "Se l'utente ti chiede consigli, ricette, informazioni o aiuto, rispondi con cortesia ed efficacia.";

    activeSession = await lm.create({
      systemPrompt: systemPrompt || defaultSystemPrompt,
      temperature: 0.6,
      topK: 3,
    });

    return activeSession;
  } catch (err) {
    console.warn('[GeminiNano] Creazione sessione fallita:', err);
    activeSession = null;
    return null;
  }
}

/**
 * Invia una richiesta a Gemini Nano on-device.
 * Se non disponibile o se si verifica un errore, restituisce null per fallback automatico.
 */
export async function queryGeminiNanoOnDevice(
  promptText: string,
  context?: string
): Promise<string | null> {
  try {
    const status = await checkGeminiNanoStatus();
    if (!status.supported || status.available !== 'readily') {
      return null;
    }

    const session = await getOrCreateSession();
    if (!session || typeof session.prompt !== 'function') {
      return null;
    }

    let fullPrompt = promptText;
    if (context && context.trim().length > 0) {
      fullPrompt = `[CONTESTO UTENTE CHELONA]:\n${context}\n\n[RICHIESTA UTENTE]:\n${promptText}`;
    }

    // Timeout di sicurezza di 10 secondi per evitare blocchi
    const promptPromise = session.prompt(fullPrompt);
    const timeoutPromise = new Promise<null>((_, reject) => 
      setTimeout(() => reject(new Error('Gemini Nano prompt timeout')), 10000)
    );

    const result = await Promise.race([promptPromise, timeoutPromise]);
    if (typeof result === 'string' && result.trim().length > 0) {
      return result.trim();
    }

    return null;
  } catch (err) {
    console.warn('[GeminiNano] Errore inferenza on-device (fallback sul motore locale):', err);
    // Se la sessione è andata in errore, resettiamola per la prossima volta
    activeSession = null;
    return null;
  }
}

/**
 * Resetta la sessione attiva
 */
export function resetGeminiNanoSession(): void {
  if (activeSession && typeof activeSession.destroy === 'function') {
    try {
      activeSession.destroy();
    } catch {
      // Ignora errori di distruzione
    }
  }
  activeSession = null;
}
