/**
 * Chelona AI - On-Device Wake Word Detection Service
 * Permette l'attivazione a mani libere pronunciando frasi come "Ciao Chelona!", "Ehi Chelona!", "Ok Chelona" o "Chelona".
 * 100% on-device, zero API esterne, massima privacy e rispetto della batteria.
 */

import { SpeechRecognition } from '@capacitor-community/speech-recognition';

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
  private lastTriggeredAt: number | null = null;
  private lastTriggerTimestamp: number = 0;
  private onTriggerCallback: TriggerCallback | null = null;
  private listeners: Set<StateListener> = new Set();

  private webRecognition: any = null;
  private nativeListenerHandle: any = null;
  private restartTimeout: any = null;
  private isRestarting: boolean = false;
  private engineType: 'web' | 'native' | null = null;

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
    const hasWeb = typeof window !== 'undefined' &&
      !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
    return hasWeb || typeof navigator !== 'undefined';
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
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const state = this.getState();
    this.listeners.forEach((listener) => {
      try {
        listener(state);
      } catch (err) {
        console.warn('[WakeWord] Listener notification error', err);
      }
    });
  }

  /**
   * Richiede il permesso microfono necessario per l'ascolto continuo
   */
  public async requestPermission(): Promise<boolean> {
    // 1. Prova con Capacitor Speech Recognition se disponibile
    try {
      const avail = await SpeechRecognition.available();
      if (avail && avail.available) {
        const perms = await SpeechRecognition.checkPermissions();
        if (perms.speechRecognition === 'granted') {
          return true;
        }
        const requested = await SpeechRecognition.requestPermissions();
        if (requested.speechRecognition === 'granted') {
          return true;
        }
      }
    } catch {
      // Procedi con getUserMedia o Web Speech API
    }

    // 2. Prova navigator.mediaDevices.getUserMedia
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((t) => t.stop());
        return true;
      } catch (e) {
        console.warn('[WakeWord] Permesso microfono negato tramite getUserMedia', e);
        return false;
      }
    }

    // 3. Fallback Web Speech API
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
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
        return false;
      }
      this.isEnabled = true;
      try {
        localStorage.setItem(STORAGE_KEY_ENABLED, 'true');
      } catch {}
      this.notify();
      if (this.onTriggerCallback) {
        this.startEngine();
      }
      return true;
    } else {
      this.isEnabled = false;
      try {
        localStorage.setItem(STORAGE_KEY_ENABLED, 'false');
      } catch {}
      this.stopEngine();
      this.notify();
      return true;
    }
  }

  /**
   * Registra il callback di trigger e avvia il riconoscimento se abilitato
   */
  public start(onTrigger: TriggerCallback): void {
    this.onTriggerCallback = onTrigger;
    if (this.isEnabled) {
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
   * Mette in pausa l'ascolto (es. mentre Chelona AI è già aperto o l'app è in background)
   */
  public pause(): void {
    if (this.isPaused) return;
    this.isPaused = true;
    this.stopEngine(false);
    this.notify();
  }

  /**
   * Riprende l'ascolto quando l'app torna visibile o Chelona AI viene chiuso
   */
  public resume(): void {
    if (!this.isPaused) return;
    this.isPaused = false;
    this.notify();
    if (this.isEnabled && this.onTriggerCallback) {
      this.startEngine();
    }
  }

  /**
   * Controlla se la frase trascritta corrisponde a un comando di attivazione
   */
  public matchWakeWord(rawText: string): boolean {
    if (!rawText) return false;

    const clean = rawText
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

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
    // Debounce 3.5 secondi per evitare trigger a raffica
    if (now - this.lastTriggerTimestamp < 3500) {
      return;
    }
    this.lastTriggerTimestamp = now;
    this.lastTriggeredAt = now;

    console.log(`[WakeWord] Trigger rilevato! "${sourceText}"`);

    // Feedback aptico leggero
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
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
        console.error('[WakeWord] Errore nel callback di trigger', err);
      }
    }
  }

  private async startEngine() {
    if (this.isListening || this.isPaused || !this.isEnabled) return;
    this.clearRestartTimer();

    // Preferisci Web Speech API se supportata nel browser / WebView per ascolto in background non-intrusivo
    const SpeechRec = typeof window !== 'undefined' &&
      ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

    if (SpeechRec) {
      this.startWebEngine(SpeechRec);
      return;
    }

    // Fallback su Capacitor nativo se disponibile
    try {
      const avail = await SpeechRecognition.available();
      if (avail && avail.available) {
        this.startNativeEngine();
        return;
      }
    } catch (e) {
      console.warn('[WakeWord] Nessun motore speech disponibile:', e);
    }
  }

  private startWebEngine(SpeechRec: any) {
    try {
      if (this.webRecognition) {
        try { this.webRecognition.abort(); } catch {}
        this.webRecognition = null;
      }

      const rec = new SpeechRec();
      this.webRecognition = rec;
      this.engineType = 'web';

      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'it-IT';
      rec.maxAlternatives = 3;

      rec.onstart = () => {
        this.isListening = true;
        this.notify();
      };

      rec.onresult = (event: any) => {
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const res = event.results[i];
          for (let a = 0; a < res.length; ++a) {
            const transcript = res[a].transcript || '';
            if (this.matchWakeWord(transcript)) {
              this.handleWakeWordDetected(transcript);
              return;
            }
          }
        }
      };

      rec.onerror = (event: any) => {
        // Errori normali di timeout silenzio (no-speech) non devono disabilitare il servizio
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          console.warn('[WakeWord] Permesso microfono revocato o non consentito');
          this.isListening = false;
          this.notify();
          return;
        }
      };

      rec.onend = () => {
        this.isListening = false;
        this.notify();
        this.scheduleRestart();
      };

      rec.start();
    } catch (err) {
      console.warn('[WakeWord] Errore avvio Web Speech Engine:', err);
      this.isListening = false;
      this.notify();
      this.scheduleRestart(1000);
    }
  }

  private consecutiveErrors = 0;

  private async startNativeEngine() {
    try {
      this.engineType = 'native';

      // Verifica disponibilità e permessi prima di chiamare il plugin nativo
      const avail = await SpeechRecognition.available().catch(() => ({ available: false }));
      if (!avail?.available) {
        this.isListening = false;
        this.notify();
        return;
      }

      const perm = await SpeechRecognition.checkPermissions().catch(() => ({ speechRecognition: 'prompt' }));
      if (perm.speechRecognition !== 'granted') {
        this.isListening = false;
        this.notify();
        return;
      }

      // Rimuovi eventuali listener precedenti
      if (this.nativeListenerHandle) {
        try { await this.nativeListenerHandle.remove(); } catch {}
        this.nativeListenerHandle = null;
      }

      this.nativeListenerHandle = await SpeechRecognition.addListener('partialResults', (data: { matches: string[] }) => {
        if (data && data.matches) {
          for (const match of data.matches) {
            if (this.matchWakeWord(match)) {
              this.handleWakeWordDetected(match);
              return;
            }
          }
        }
      });

      this.isListening = true;
      this.notify();

      SpeechRecognition.start({
        language: 'it-IT',
        maxResults: 5,
        prompt: '',
        partialResults: true,
        popup: false,
      }).then(() => {
        // Sessione completata regolarmente
        this.consecutiveErrors = 0;
        this.isListening = false;
        this.notify();
        this.scheduleRestart();
      }).catch((err) => {
        console.warn('[WakeWord] Native speech ended/error:', err);
        this.isListening = false;
        this.notify();
        this.consecutiveErrors++;
        if (this.consecutiveErrors < 3) {
          this.scheduleRestart(2000);
        } else {
          this.isEnabled = false;
        }
      });

    } catch (err) {
      console.warn('[WakeWord] Errore start native speech:', err);
      this.isListening = false;
      this.notify();
      this.consecutiveErrors++;
      if (this.consecutiveErrors < 3) {
        this.scheduleRestart(2500);
      } else {
        this.isEnabled = false;
      }
    }
  }

  private scheduleRestart(delayMs: number = 400) {
    if (!this.isEnabled || this.isPaused || this.isRestarting) return;
    this.clearRestartTimer();

    this.isRestarting = true;
    this.restartTimeout = setTimeout(() => {
      this.isRestarting = false;
      if (this.isEnabled && !this.isPaused && !this.isListening) {
        this.startEngine();
      }
    }, delayMs);
  }

  private clearRestartTimer() {
    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
      this.restartTimeout = null;
    }
  }

  private stopEngine(resetState: boolean = true) {
    this.clearRestartTimer();
    this.isRestarting = false;

    if (this.webRecognition) {
      try {
        this.webRecognition.onend = null;
        this.webRecognition.onerror = null;
        this.webRecognition.abort();
      } catch {}
      this.webRecognition = null;
    }

    if (this.nativeListenerHandle) {
      try {
        this.nativeListenerHandle.remove();
      } catch {}
      this.nativeListenerHandle = null;
    }

    try {
      SpeechRecognition.stop().catch(() => {});
    } catch {}

    this.isListening = false;
    if (resetState) {
      this.engineType = null;
    }
    this.notify();
  }
}

export const wakeWordService = new WakeWordService();

export function isWakeWordMatch(text: string): boolean {
  return wakeWordService.matchWakeWord(text);
}
