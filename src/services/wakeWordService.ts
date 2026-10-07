/**
 * Chelona AI - On-Device Wake Word Detection Service
 * Permette l'attivazione a mani libere pronunciando frasi come "Hey Chelona", "Ehi Chelona", "Ok Chelona" o "Chelona".
 * 100% on-device, zero crash, zero loop ricorsivi, massima privacy ed efficienza della batteria.
 */

const STORAGE_KEY_ENABLED = 'chelona_wake_word_enabled';

export interface WakeWordState {
  isSupported: boolean;
  isEnabled: boolean;
  isListening: boolean;
  lastTriggeredAt: number | null;
}

type TriggerCallback = () => void;
type StateListener = (state: WakeWordState) => void;

class WakeWordService {
  private isEnabled: boolean = false;
  private isListening: boolean = false;
  private isPaused: boolean = false;
  private isPermissionDenied: boolean = false;
  private lastTriggeredAt: number | null = null;
  private lastTriggerTimestamp: number = 0;
  private onTriggerCallback: TriggerCallback | null = null;
  private listeners: Set<StateListener> = new Set();

  private webRecognition: any = null;
  private currentSessionId: number = 0;
  private restartTimeout: any = null;
  private consecutiveErrors: number = 0;
  private lastNotifiedState: string = '';

  constructor() {
    this.isEnabled = this.loadStoredEnabled();
  }

  private loadStoredEnabled(): boolean {
    try {
      if (typeof localStorage !== 'undefined') {
        return localStorage.getItem(STORAGE_KEY_ENABLED) === 'true';
      }
    } catch {}
    return false;
  }

  public isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    return !!SpeechRec;
  }

  public getEnabled(): boolean {
    return this.isEnabled;
  }

  public getState(): WakeWordState {
    return {
      isSupported: this.isSupported(),
      isEnabled: this.isEnabled,
      isListening: this.isListening && !this.isPaused,
      lastTriggeredAt: this.lastTriggeredAt,
    };
  }

  public subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    try {
      listener(this.getState());
    } catch (err) {
      console.warn('[WakeWord] Error in initial subscribe callback:', err);
    }
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyIfChanged(): void {
    const state = this.getState();
    const serialized = `${state.isSupported}_${state.isEnabled}_${state.isListening}_${state.lastTriggeredAt}`;
    if (serialized === this.lastNotifiedState) {
      return;
    }
    this.lastNotifiedState = serialized;

    this.listeners.forEach((listener) => {
      try {
        listener(state);
      } catch (err) {
        console.warn('[WakeWord] Listener notification error:', err);
      }
    });
  }

  /**
   * Richiede il permesso microfono necessario per l'ascolto continuo
   */
  public async requestPermission(): Promise<boolean> {
    if (typeof navigator === 'undefined') return false;

    // 1. Prova navigator.mediaDevices.getUserMedia
    if (navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((t) => {
          try {
            t.stop();
          } catch {}
        });
        this.isPermissionDenied = false;
        return true;
      } catch (e) {
        console.warn('[WakeWord] Permesso microfono negato tramite getUserMedia:', e);
        this.isPermissionDenied = true;
        return false;
      }
    }

    // 2. Fallback Web Speech API
    const SpeechRec = (window as any)?.SpeechRecognition || (window as any)?.webkitSpeechRecognition;
    return !!SpeechRec;
  }

  /**
   * Abilita o disabilita il comando vocale con persistenza
   */
  public async setEnabled(enabled: boolean): Promise<boolean> {
    if (enabled === this.isEnabled) return true;

    if (enabled) {
      const granted = await this.requestPermission();
      if (!granted) {
        this.isPermissionDenied = true;
        this.isEnabled = false;
        try {
          localStorage.setItem(STORAGE_KEY_ENABLED, 'false');
        } catch {}
        this.notifyIfChanged();
        return false;
      }

      this.isPermissionDenied = false;
      this.consecutiveErrors = 0;
      this.isEnabled = true;
      try {
        localStorage.setItem(STORAGE_KEY_ENABLED, 'true');
      } catch {}
      this.notifyIfChanged();

      if (this.onTriggerCallback && !this.isPaused) {
        this.startEngine();
      }
      return true;
    } else {
      this.isEnabled = false;
      try {
        localStorage.setItem(STORAGE_KEY_ENABLED, 'false');
      } catch {}
      this.stopEngine();
      this.notifyIfChanged();
      return true;
    }
  }

  /**
   * Registra il callback di trigger e avvia il motore se abilitato
   */
  public start(onTrigger: TriggerCallback): void {
    this.onTriggerCallback = onTrigger;
    if (this.isEnabled && !this.isPaused && !this.isPermissionDenied) {
      this.startEngine();
    }
  }

  /**
   * Ferma completamente il motore di ascolto
   */
  public stop(): void {
    this.stopEngine();
    this.onTriggerCallback = null;
  }

  /**
   * Mette in pausa l'ascolto (es. mentre l'app è in background o la modale AI è aperta)
   */
  public pause(): void {
    if (this.isPaused) return;
    this.isPaused = true;
    this.stopEngine();
    this.notifyIfChanged();
  }

  /**
   * Riprende l'ascolto quando l'app torna in primo piano o la chat AI si chiude
   */
  public resume(): void {
    if (!this.isPaused) return;
    this.isPaused = false;
    this.consecutiveErrors = 0;
    this.notifyIfChanged();
    if (this.isEnabled && this.onTriggerCallback && !this.isPermissionDenied) {
      this.startEngine();
    }
  }

  /**
   * Riconosce la wake word "Hey Chelona" e varianti fonetiche
   */
  public matchWakeWord(rawText: string): boolean {
    if (!rawText || typeof rawText !== 'string') return false;

    const clean = rawText
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!clean) return false;

    // 1. Varianti dirette con chelona o che lona
    if (/\bchelona\b/i.test(clean) || /\bche\s+lona\b/i.test(clean)) {
      return true;
    }

    // 2. STT fonetiche comuni in italiano ("hey chelona", "ehi chelona", "ok chelona", "ciao chelona")
    if (/\b(?:hey|ehi|hei|ay|ei|hi|ok|ciao|apri|salve|ascolta|attiva)\s*(?:chelona|che\s*lona|kelona|chilona|celona|colona|corona)\b/i.test(clean)) {
      return true;
    }

    // 3. Kelona, chilona isolati
    if (/\bkelona\b/i.test(clean) || /\bchilona\b/i.test(clean)) {
      return true;
    }

    // 4. Celona isolato (evitando barcellona)
    if (/\bcelona\b/i.test(clean) && !clean.includes('barcellona')) {
      return true;
    }

    return false;
  }

  private handleWakeWordDetected(sourceText: string) {
    const now = Date.now();
    // Debounce di 4 secondi per evitare trigger multipli
    if (now - this.lastTriggerTimestamp < 4000) {
      return;
    }
    this.lastTriggerTimestamp = now;
    this.lastTriggeredAt = now;
    this.consecutiveErrors = 0;

    console.log(`[WakeWord] Trigger rilevato! "${sourceText}"`);

    // Feedback aptico leggero
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      try {
        navigator.vibrate([60, 40, 80]);
      } catch {}
    }

    // Pausa temporanea per liberare il microfono a Chelona AI
    this.pause();

    if (this.onTriggerCallback) {
      try {
        this.onTriggerCallback();
      } catch (err) {
        console.error('[WakeWord] Errore nel callback di trigger:', err);
      }
    }

    this.notifyIfChanged();
  }

  private clearRestartTimer() {
    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
      this.restartTimeout = null;
    }
  }

  private scheduleRestart(delayMs: number = 1500) {
    if (!this.isEnabled || this.isPaused || this.isPermissionDenied || this.consecutiveErrors >= 3) {
      return;
    }
    this.clearRestartTimer();

    this.restartTimeout = setTimeout(() => {
      this.restartTimeout = null;
      if (this.isEnabled && !this.isPaused && !this.isListening && !this.isPermissionDenied) {
        this.startEngine();
      }
    }, delayMs);
  }

  private startEngine() {
    if (this.isListening || this.isPaused || !this.isEnabled || this.isPermissionDenied) {
      return;
    }
    this.clearRestartTimer();

    // Non avviare se il documento è in background
    if (typeof document !== 'undefined' && document.hidden) {
      return;
    }

    const SpeechRec = typeof window !== 'undefined' &&
      ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

    if (!SpeechRec) {
      // Web Speech API non supportata su questo ambiente, arresto pulito senza errori
      return;
    }

    const sessionId = ++this.currentSessionId;

    try {
      if (this.webRecognition) {
        try {
          this.webRecognition.onstart = null;
          this.webRecognition.onresult = null;
          this.webRecognition.onerror = null;
          this.webRecognition.onend = null;
          this.webRecognition.abort();
        } catch {}
        this.webRecognition = null;
      }

      const rec = new SpeechRec();
      this.webRecognition = rec;

      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'it-IT';
      rec.maxAlternatives = 2;

      rec.onstart = () => {
        if (sessionId !== this.currentSessionId) return;
        this.isListening = true;
        this.consecutiveErrors = 0;
        this.notifyIfChanged();
      };

      rec.onresult = (event: any) => {
        if (sessionId !== this.currentSessionId) return;
        this.consecutiveErrors = 0;
        try {
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const res = event.results[i];
            for (let a = 0; a < res.length; ++a) {
              const transcript = res[a]?.transcript || '';
              if (this.matchWakeWord(transcript)) {
                this.handleWakeWordDetected(transcript);
                return;
              }
            }
          }
        } catch (err) {
          console.warn('[WakeWord] Errore elaborazione risultato:', err);
        }
      };

      rec.onerror = (event: any) => {
        if (sessionId !== this.currentSessionId) return;
        const error = event?.error || 'unknown';

        // Errori fatali di permesso: fermati subito senza loop di riavvio
        if (error === 'not-allowed' || error === 'service-not-allowed' || error === 'audio-capture') {
          console.warn(`[WakeWord] Permesso microfono revocato o non consentito: ${error}`);
          this.isPermissionDenied = true;
          this.stopEngine();
          return;
        }

        // Errori transitori (no-speech, network, ecc.)
        if (error !== 'aborted') {
          this.consecutiveErrors++;
          if (this.consecutiveErrors >= 3) {
            console.warn('[WakeWord] Troppi errori consecutivi, ascolto in pausa temporanea.');
            this.stopEngine();
          }
        }
      };

      rec.onend = () => {
        if (sessionId !== this.currentSessionId) return;
        this.isListening = false;
        this.notifyIfChanged();

        if (!this.isEnabled || this.isPaused || this.isPermissionDenied || this.consecutiveErrors >= 3) {
          return;
        }

        // Backoff sicuro proporzionale agli errori
        const delay = this.consecutiveErrors === 0 ? 1200 : this.consecutiveErrors === 1 ? 3000 : 6000;
        this.scheduleRestart(delay);
      };

      rec.start();
    } catch (err) {
      console.warn('[WakeWord] Errore istanziazione Web Speech Engine:', err);
      this.isListening = false;
      this.notifyIfChanged();
      this.consecutiveErrors++;
      if (this.consecutiveErrors < 3) {
        this.scheduleRestart(3000);
      }
    }
  }

  private stopEngine() {
    this.clearRestartTimer();
    const sessionId = ++this.currentSessionId;

    if (this.webRecognition) {
      try {
        this.webRecognition.onstart = null;
        this.webRecognition.onresult = null;
        this.webRecognition.onerror = null;
        this.webRecognition.onend = null;
        this.webRecognition.abort();
      } catch {}
      this.webRecognition = null;
    }

    this.isListening = false;
    this.notifyIfChanged();
  }
}

export const wakeWordService = new WakeWordService();

export function isWakeWordMatch(text: string): boolean {
  return wakeWordService.matchWakeWord(text);
}
