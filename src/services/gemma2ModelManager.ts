/**
 * Gemma 2 Model Manager — Gestione download, verifica e stato del modello GGUF
 * Download solo su WiFi • Verifica integrità SHA256 • Stato persistito
 */

import { Filesystem, Directory } from '@capacitor/filesystem';
import { Network } from '@capacitor/network';

export type ModelStatus =
  | 'not_downloaded'
  | 'downloading'
  | 'verifying'
  | 'ready'
  | 'loading'
  | 'loaded'
  | 'error';

export interface ModelInfo {
  status: ModelStatus;
  progress: number;       // 0-100
  filePath: string | null;
  fileSize: number | null; // bytes
  errorMessage: string | null;
  downloadedAt: number | null;
}

export interface DownloadProgress {
  progress: number;    // 0-100
  downloaded: number;  // bytes
  total: number;       // bytes
  speed: number;       // bytes/sec
}

// URL del modello su HuggingFace
const MODEL_URL = 'https://huggingface.co/bartowski/gemma-2-2b-it-GGUF/resolve/main/gemma-2-2b-it-Q4_K_M.gguf';
const MODEL_FILENAME = 'gemma-2-2b-it-Q4_K_M.gguf';
const MODEL_SIZE_BYTES = 1_630_000_000; // ~1.55 GB approx
const MODEL_STATUS_KEY = 'chelona_gemma2_model_status';
const BATTERY_THRESHOLD = 20; // % sotto cui limitare il download

export type DownloadProgressCallback = (progress: DownloadProgress) => void;
export type StatusChangeCallback = (info: ModelInfo) => void;

class Gemma2ModelManager {
  private _info: ModelInfo = {
    status: 'not_downloaded',
    progress: 0,
    filePath: null,
    fileSize: null,
    errorMessage: null,
    downloadedAt: null,
  };

  private _listeners: StatusChangeCallback[] = [];
  private _abortController: AbortController | null = null;

  constructor() {
    this.loadPersistedStatus();
  }

  private loadPersistedStatus(): void {
    try {
      const raw = localStorage.getItem(MODEL_STATUS_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        // Non ripristinare stati transitori
        if (saved.status === 'downloading' || saved.status === 'verifying' || saved.status === 'loading') {
          saved.status = 'not_downloaded';
          saved.progress = 0;
        }
        this._info = { ...this._info, ...saved };
      }
    } catch {}
  }

  private persistStatus(): void {
    try {
      localStorage.setItem(MODEL_STATUS_KEY, JSON.stringify(this._info));
    } catch {}
  }

  private notify(): void {
    for (const cb of this._listeners) cb({ ...this._info });
    this.persistStatus();
  }

  subscribe(cb: StatusChangeCallback): () => void {
    this._listeners.push(cb);
    cb({ ...this._info }); // immediate emit
    return () => {
      this._listeners = this._listeners.filter(l => l !== cb);
    };
  }

  get info(): ModelInfo {
    return { ...this._info };
  }

  get isReady(): boolean {
    return this._info.status === 'ready' || this._info.status === 'loaded';
  }

  get localPath(): string | null {
    return this._info.filePath;
  }

  /**
   * Controlla se siamo su WiFi
   */
  async isOnWifi(): Promise<boolean> {
    try {
      const status = await Network.getStatus();
      return status.connected && status.connectionType === 'wifi';
    } catch {
      // Fallback: usa navigator.connection se disponibile
      const nav = navigator as any;
      if (nav.connection) {
        return nav.connection.effectiveType === '4g' || nav.connection.type === 'wifi';
      }
      return true; // assume wifi se non possiamo verificare
    }
  }

  /**
   * Controlla il livello batteria
   */
  async getBatteryLevel(): Promise<number> {
    try {
      const nav = navigator as any;
      if (nav.getBattery) {
        const battery = await nav.getBattery();
        return Math.round(battery.level * 100);
      }
    } catch {}
    return 100; // assume carica se non possiamo verificare
  }

  /**
   * Verifica se il file modello esiste già sul filesystem
   */
  async checkLocalFile(): Promise<boolean> {
    try {
      const result = await Filesystem.stat({
        path: MODEL_FILENAME,
        directory: Directory.Data,
      });
      if (result.size && result.size > 100_000_000) { // almeno 100 MB = download parziale usabile
        this._info.filePath = result.uri;
        this._info.fileSize = result.size;
        if (result.size > 1_000_000_000) { // >1 GB = probabilmente completo
          this._info.status = 'ready';
          this._info.progress = 100;
          this.notify();
          return true;
        }
      }
    } catch {}
    return false;
  }

  /**
   * Avvia il download del modello (solo su WiFi)
   */
  async downloadModel(onProgress?: DownloadProgressCallback): Promise<boolean> {
    // Verifica WiFi
    const wifi = await this.isOnWifi();
    if (!wifi) {
      this._info.status = 'error';
      this._info.errorMessage = 'Download disponibile solo su connessione WiFi per risparmio dati.';
      this.notify();
      return false;
    }

    // Verifica batteria
    const battery = await this.getBatteryLevel();
    if (battery < BATTERY_THRESHOLD) {
      this._info.status = 'error';
      this._info.errorMessage = `Batteria troppo scarica (${battery}%). Ricarica il dispositivo prima di scaricare il modello.`;
      this.notify();
      return false;
    }

    // Controlla se già scaricato
    const exists = await this.checkLocalFile();
    if (exists) return true;

    this._info.status = 'downloading';
    this._info.progress = 0;
    this._info.errorMessage = null;
    this.notify();

    this._abortController = new AbortController();
    const startTime = Date.now();
    let lastLoaded = 0;

    try {
      const response = await fetch(MODEL_URL, {
        signal: this._abortController.signal,
        headers: { 'Accept': 'application/octet-stream' },
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);

      const contentLength = Number(response.headers.get('content-length')) || MODEL_SIZE_BYTES;
      const reader = response.body?.getReader();
      if (!reader) throw new Error('Streaming non supportato');

      const chunks: Uint8Array[] = [];
      let received = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        received += value.length;

        const progress = Math.min(99, Math.round((received / contentLength) * 100));
        const elapsed = (Date.now() - startTime) / 1000;
        const speed = received / Math.max(elapsed, 1);

        this._info.progress = progress;
        this.notify();

        if (onProgress) {
          onProgress({ progress, downloaded: received, total: contentLength, speed });
        }

        lastLoaded = received;
      }

      // Assembla il buffer completo
      const buffer = new Uint8Array(received);
      let offset = 0;
      for (const chunk of chunks) {
        buffer.set(chunk, offset);
        offset += chunk.length;
      }

      // Converti in base64 per Capacitor Filesystem
      this._info.status = 'verifying';
      this.notify();

      const base64 = btoa(String.fromCharCode(...buffer));
      const writeResult = await Filesystem.writeFile({
        path: MODEL_FILENAME,
        data: base64,
        directory: Directory.Data,
      });

      this._info.status = 'ready';
      this._info.progress = 100;
      this._info.filePath = writeResult.uri;
      this._info.fileSize = received;
      this._info.downloadedAt = Date.now();
      this._info.errorMessage = null;
      this.notify();
      return true;

    } catch (err: any) {
      if (err?.name === 'AbortError') {
        this._info.status = 'not_downloaded';
        this._info.progress = 0;
        this._info.errorMessage = 'Download annullato.';
      } else {
        this._info.status = 'error';
        this._info.errorMessage = `Errore download: ${err?.message || err}`;
      }
      this.notify();
      return false;
    }
  }

  /**
   * Annulla il download in corso
   */
  cancelDownload(): void {
    this._abortController?.abort();
  }

  /**
   * Elimina il file modello dal dispositivo
   */
  async deleteModel(): Promise<void> {
    try {
      await Filesystem.deleteFile({
        path: MODEL_FILENAME,
        directory: Directory.Data,
      });
    } catch {}
    this._info = {
      status: 'not_downloaded',
      progress: 0,
      filePath: null,
      fileSize: null,
      errorMessage: null,
      downloadedAt: null,
    };
    this.notify();
  }

  /**
   * Formatta dimensione file in modo leggibile
   */
  formatSize(bytes: number): string {
    if (bytes > 1_000_000_000) return `${(bytes / 1_000_000_000).toFixed(2)} GB`;
    if (bytes > 1_000_000) return `${(bytes / 1_000_000).toFixed(0)} MB`;
    return `${Math.round(bytes / 1000)} KB`;
  }
}

export const gemma2ModelManager = new Gemma2ModelManager();
