/**
 * Chelona Voice Intelligence & Speech Recognition Service
 * 
 * Sostituisce il trascrittore popup di Google con un'esperienza vocale
 * moderna, fluida e integrata in-app:
 * - Zero popup esterni Google
 * - Riconoscimento On-Device su Android 13+ (senza cloud, privacy 100%)
 * - Trascrizione in streaming in tempo reale (partial results mentre parli)
 * - Visualizzatore forma d'onda audio live (RMS decibel / Web Audio API)
 * - Rilevamento automatico fine parlato (Voice Activity Detection)
 */
import { SpeechRecognition as CapSpeechRecognition } from '@capacitor-community/speech-recognition';

export interface VoiceServiceOptions {
  lang?: string;
  onPartial?: (text: string) => void;
  onResult?: (text: string) => void;
  onRms?: (normalizedVolume: number) => void;
  onError?: (error: string) => void;
  onStart?: () => void;
  onEnd?: () => void;
  autoStopSilenceMs?: number; // millisecondi di silenzio prima di inviare automaticamente
}

class VoiceRecognitionService {
  private isListening = false;
  private resultFired = false;
  private currentOptions: VoiceServiceOptions | null = null;
  private currentTranscript = '';
  private silenceTimer: any = null;
  private webRecognition: any = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private micStream: MediaStream | null = null;
  private animFrameId: number | null = null;

  constructor() {
    this.setupNativeListeners();
  }

  private setupNativeListeners() {
    if (typeof window === 'undefined') return;

    window.addEventListener('chelona_speech_ready', () => {
      this.isListening = true;
      this.currentOptions?.onStart?.();
    });

    window.addEventListener('chelona_speech_start', () => {
      this.isListening = true;
      this.currentOptions?.onStart?.();
    });

    window.addEventListener('chelona_speech_rms', (e: any) => {
      const rawRms = e.detail?.rms;
      if (typeof rawRms === 'number' && this.currentOptions?.onRms) {
        // RMS va tipicamente da -2 a 10 dB. Normalizziamo da 0.05 a 1.0
        const norm = Math.max(0.05, Math.min(1, (rawRms + 2) / 10));
        this.currentOptions.onRms(norm);
      }
    });

    window.addEventListener('chelona_speech_partial', (e: any) => {
      const text = e.detail?.text || '';
      if (text) {
        this.currentTranscript = text;
        this.currentOptions?.onPartial?.(text);
        this.resetSilenceTimer();
      }
    });

    window.addEventListener('chelona_speech_result', (e: any) => {
      const text = e.detail?.text || this.currentTranscript;
      this.clearSilenceTimer();
      this.isListening = false;
      if (!this.resultFired && text && text.trim().length > 0) {
        this.resultFired = true;
        this.currentOptions?.onResult?.(text.trim());
      }
    });

    window.addEventListener('chelona_speech_end', () => {
      this.clearSilenceTimer();
      const text = this.currentTranscript.trim();
      this.isListening = false;
      if (!this.resultFired && text.length > 0) {
        this.resultFired = true;
        this.currentOptions?.onResult?.(text);
      }
      this.currentOptions?.onEnd?.();
    });

    window.addEventListener('chelona_speech_error', (e: any) => {
      this.clearSilenceTimer();
      this.isListening = false;
      const err = e.detail?.error;
      const text = this.currentTranscript.trim();
      if (!this.resultFired && text.length > 1) {
        this.resultFired = true;
        this.currentOptions?.onResult?.(text);
        this.currentOptions?.onEnd?.();
      } else {
        let msg = 'Errore ascolto vocale';
        if (err === 7 || err === '7') {
          msg = 'Nessuna voce rilevata. Riprova.';
        } else if (err === 9 || err === '9' || err === 'permission_denied') {
          msg = 'Permesso microfono non concesso.';
        } else if (typeof err === 'string' && err !== '5' && err !== '8') {
          msg = err;
        }
        this.currentOptions?.onError?.(msg);
        this.currentOptions?.onEnd?.();
      }
    });
  }

  private resetSilenceTimer() {
    this.clearSilenceTimer();
    const timeout = this.currentOptions?.autoStopSilenceMs || 1800;
    this.silenceTimer = setTimeout(() => {
      if (this.isListening && this.currentTranscript.trim().length > 0) {
        const text = this.currentTranscript.trim();
        if (!this.resultFired && this.currentOptions?.onResult) {
          this.resultFired = true;
          this.currentOptions.onResult(text);
        }
        this.stop();
      }
    }, timeout);
  }

  private clearSilenceTimer() {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
  }

  /**
   * Avvia il riconoscimento vocale in-app con architettura multi-tier:
   * 1. ChelonaNative in-app engine
   * 2. Capacitor Community SpeechRecognition plugin
   * 3. Web Speech API (webkitSpeechRecognition)
   */
  public async start(options: VoiceServiceOptions = {}): Promise<boolean> {
    this.stop();
    this.currentOptions = options;
    this.currentTranscript = '';
    this.resultFired = false;
    this.isListening = true;

    const lang = options.lang || 'it-IT';
    const native = (window as any)?.ChelonaNative;

    // 1. Prova il recognizer nativo in-app ChelonaNative
    if (native && typeof native.startSpeechRecognition === 'function') {
      try {
        const started = native.startSpeechRecognition(lang);
        if (started) {
          options.onStart?.();
          return true;
        }
      } catch (err) {
        console.warn('[VoiceService] Native start failed, trying Capacitor plugin fallback...', err);
      }
    }

    // 2. Fallback su Capacitor Community Speech Recognition plugin
    try {
      const isCapAvailable = await CapSpeechRecognition.available().catch(() => ({ available: false }));
      if (isCapAvailable && isCapAvailable.available) {
        const perm = await CapSpeechRecognition.checkPermissions().catch(() => null);
        if (perm?.speechRecognition !== 'granted') {
          await CapSpeechRecognition.requestPermissions().catch(() => {});
        }

        await CapSpeechRecognition.removeAllListeners().catch(() => {});
        await CapSpeechRecognition.addListener('partialResults', (data: { matches: string[] }) => {
          if (data.matches && data.matches.length > 0) {
            const text = data.matches[0];
            this.currentTranscript = text;
            options.onPartial?.(text);
            this.resetSilenceTimer();
          }
        });

        await CapSpeechRecognition.start({
          language: lang,
          maxResults: 1,
          prompt: 'Parla con Chelona AI...',
          partialResults: true,
          popup: false,
        });

        this.isListening = true;
        options.onStart?.();
        this.startWebAudioAnalyser(options.onRms);
        return true;
      }
    } catch (capErr) {
      console.warn('[VoiceService] CapSpeechRecognition start failed, trying Web Speech API...', capErr);
    }

    // 3. Fallback su Web Speech API (Chromium / Webkit)
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRec) {
      try {
        const rec = new SpeechRec();
        this.webRecognition = rec;
        rec.lang = lang;
        rec.continuous = false;
        rec.interimResults = true; // Abilita streaming in tempo reale

        rec.onstart = () => {
          this.isListening = true;
          options.onStart?.();
          this.startWebAudioAnalyser(options.onRms);
        };

        rec.onresult = (evt: any) => {
          let interim = '';
          let final = '';
          for (let i = 0; i < evt.results.length; i++) {
            const item = evt.results[i];
            const transcript = item[0]?.transcript || '';
            if (item.isFinal) {
              final += transcript;
            } else {
              interim += transcript;
            }
          }
          const text = (final || interim).trim();
          if (text) {
            this.currentTranscript = text;
            options.onPartial?.(text);
            this.resetSilenceTimer();
          }
          if (final && options.onResult) {
            this.clearSilenceTimer();
            this.stopWebAudioAnalyser();
            options.onResult(final.trim());
          }
        };

        rec.onerror = (evt: any) => {
          this.stopWebAudioAnalyser();
          this.isListening = false;
          if (this.currentTranscript.trim().length > 1) {
            options.onResult?.(this.currentTranscript);
          } else {
            options.onError?.(evt.error || 'Errore microfono');
          }
          options.onEnd?.();
        };

        rec.onend = () => {
          this.stopWebAudioAnalyser();
          this.isListening = false;
          const text = this.currentTranscript.trim();
          if (!this.resultFired && text.length > 0 && options.onResult) {
            this.resultFired = true;
            options.onResult(text);
          }
          options.onEnd?.();
        };

        rec.start();
        return true;
      } catch (e: any) {
        console.warn('[VoiceService] Web Speech start failed', e);
      }
    }

    this.isListening = false;
    options.onError?.('Microfono non disponibile su questo dispositivo.');
    return false;
  }

  /**
   * Ferma l'ascolto e finalizza la trascrizione
   */
  public stop() {
    this.clearSilenceTimer();
    this.stopWebAudioAnalyser();

    const native = (window as any)?.ChelonaNative;
    if (native && typeof native.stopSpeechRecognition === 'function') {
      try {
        native.stopSpeechRecognition();
      } catch (ignored) {}
    }

    try {
      CapSpeechRecognition.stop().catch(() => {});
      CapSpeechRecognition.removeAllListeners().catch(() => {});
    } catch (ignored) {}

    if (this.webRecognition) {
      try {
        this.webRecognition.stop();
      } catch (ignored) {}
      this.webRecognition = null;
    }

    this.isListening = false;
  }

  /**
   * Avvia l'analizzatore di volume audio per la visualizzazione dell'onda sonora
   */
  private async startWebAudioAnalyser(onRms?: (val: number) => void) {
    if (!onRms || typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) return;

    try {
      this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioCtx();
      const source = this.audioContext.createMediaStreamSource(this.micStream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 64;
      source.connect(this.analyser);

      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateVolume = () => {
        if (!this.analyser || !this.isListening) return;
        this.analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const avg = sum / bufferLength;
        const normalized = Math.max(0.08, Math.min(1, avg / 128));
        onRms(normalized);
        this.animFrameId = requestAnimationFrame(updateVolume);
      };

      updateVolume();
    } catch {
      // Ignora silenziosamente se Web Audio non è consentito (ad es. mic già occupato)
    }
  }

  private stopWebAudioAnalyser() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.micStream) {
      this.micStream.getTracks().forEach(t => t.stop());
      this.micStream = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
    this.analyser = null;
  }

  /**
   * Annulla l'ascolto scartando il testo parziale senza emettere onResult
   */
  public cancel() {
    this.clearSilenceTimer();
    this.stopWebAudioAnalyser();
    this.resultFired = true;
    this.currentTranscript = '';

    const native = (window as any)?.ChelonaNative;
    if (native && typeof native.stopSpeechRecognition === 'function') {
      try {
        native.stopSpeechRecognition();
      } catch (ignored) {}
    }

    try {
      CapSpeechRecognition.stop().catch(() => {});
      CapSpeechRecognition.removeAllListeners().catch(() => {});
    } catch (ignored) {}

    if (this.webRecognition) {
      try {
        this.webRecognition.stop();
      } catch (ignored) {}
      this.webRecognition = null;
    }

    this.isListening = false;
  }

  public getIsListening(): boolean {
    return this.isListening;
  }

  public isOnDeviceAvailable(): boolean {
    const native = (window as any)?.ChelonaNative;
    if (native && typeof native.isOnDeviceSpeechAvailable === 'function') {
      try {
        return Boolean(native.isOnDeviceSpeechAvailable());
      } catch {
        return false;
      }
    }
    return false;
  }
}

export const voiceRecognitionService = new VoiceRecognitionService();

export const STORAGE_KEY_VOICE_AUTO_SEND = 'chelona_voice_auto_send';

/**
 * Restituisce se l'invio automatico vocale da microfono è abilitato (default: true).
 */
export const getVoiceAutoSendEnabled = (): boolean => true;

/**
 * Imposta la preferenza di invio automatico vocale e notifica l'app via evento.
 */
export const setVoiceAutoSendEnabled = (enabled: boolean): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_VOICE_AUTO_SEND, String(enabled));
    window.dispatchEvent(new CustomEvent('chelona_voice_auto_send_changed', { detail: { enabled } }));
  } catch (err) {
    console.warn('[VoiceService] Failed to save voice auto-send setting:', err);
  }
};

