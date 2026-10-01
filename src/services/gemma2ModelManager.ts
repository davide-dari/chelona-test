/**
 * Gemma 4 & Ultra-Fast On-Device Models Manager
 * Gestione download, verifica, selezione e stato dei modelli GGUF per Android
 * 
 * Supporta:
 * - Gemma 4 E2B (Consigliato - Google DeepMind nuova generazione)
 * - Qwen 2.5 1.5B Speed (Più veloce in assoluto per CPU mobile, latenza minima)
 * - Gemma 2 2B (Classico legacy)
 * 
 * Download solo su WiFi • Protezione batteria • Preservazione totale della Semantic Cache & RAG
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

export interface ModelPreset {
  id: string;
  name: string;
  version: string;
  family: 'gemma4' | 'gemma2' | 'qwen2.5';
  tag: string;
  badgeColor: 'emerald' | 'amber' | 'indigo';
  description: string;
  url: string;
  filename: string;
  sizeBytes: number;
  sizeDisplay: string;
  speedRating: string;
  tokensPerSecEstimate: string;
}

export const AVAILABLE_MODELS: ModelPreset[] = [
  {
    id: 'gemma-4-e2b',
    name: 'Gemma 4 E2B',
    version: '4.0',
    family: 'gemma4',
    tag: 'Consigliato',
    badgeColor: 'emerald',
    description: 'Nuova generazione Google DeepMind Mobile. Multi-Token Prediction (MTP), precisione superiore su 8GB RAM e risposte concise in italiano.',
    url: 'https://huggingface.co/bartowski/gemma-4-e2b-it-GGUF/resolve/main/gemma-4-e2b-it-Q4_K_M.gguf',
    filename: 'gemma-4-e2b-it-Q4_K_M.gguf',
    sizeBytes: 1_450_000_000,
    sizeDisplay: '~1.45 GB',
    speedRating: '⚡⚡⚡⚡ Ultra Veloce',
    tokensPerSecEstimate: '~25-35 tok/s'
  },
  {
    id: 'qwen-2.5-1.5b',
    name: 'Qwen 2.5 1.5B Speed',
    version: '2.5',
    family: 'qwen2.5',
    tag: 'Più Veloce in Assoluto',
    badgeColor: 'amber',
    description: 'Il modello più scattante in assoluto per CPU mobile. Latenza minima (< 50ms) e risposte istantanee con ottima conoscenza dell\'italiano.',
    url: 'https://huggingface.co/bartowski/Qwen2.5-1.5B-Instruct-GGUF/resolve/main/Qwen2.5-1.5B-Instruct-Q4_K_M.gguf',
    filename: 'Qwen2.5-1.5B-Instruct-Q4_K_M.gguf',
    sizeBytes: 1_050_000_000,
    sizeDisplay: '~1.05 GB',
    speedRating: '⚡⚡⚡⚡⚡ Fulmineo',
    tokensPerSecEstimate: '~40-55 tok/s'
  },
  {
    id: 'gemma-2-2b',
    name: 'Gemma 2 2B',
    version: '2.0',
    family: 'gemma2',
    tag: 'Classico',
    badgeColor: 'indigo',
    description: 'Versione standard Google DeepMind precedente con pesi bilanciati 4-bit.',
    url: 'https://huggingface.co/bartowski/gemma-2-2b-it-GGUF/resolve/main/gemma-2-2b-it-Q4_K_M.gguf',
    filename: 'gemma-2-2b-it-Q4_K_M.gguf',
    sizeBytes: 1_630_000_000,
    sizeDisplay: '~1.55 GB',
    speedRating: '⚡⚡ Standard',
    tokensPerSecEstimate: '~15-20 tok/s'
  }
];

export interface ModelInfo {
  status: ModelStatus;
  progress: number;       // 0-100
  filePath: string | null;
  fileSize: number | null; // bytes
  errorMessage: string | null;
  downloadedAt: number | null;
  activeModelId: string;
}

export interface DownloadProgress {
  progress: number;    // 0-100
  downloaded: number;  // bytes
  total: number;       // bytes
  speed: number;       // bytes/sec
}

const ACTIVE_MODEL_STORAGE_KEY = 'chelona_active_model_id';
const MODEL_STATUS_PREFIX = 'chelona_model_status_';
const BATTERY_THRESHOLD = 20; // % sotto cui limitare il download

export type DownloadProgressCallback = (progress: DownloadProgress) => void;
export type StatusChangeCallback = (info: ModelInfo) => void;

class Gemma2ModelManager {
  private _activeModelId: string = 'gemma-4-e2b';
  private _info: ModelInfo = {
    status: 'not_downloaded',
    progress: 0,
    filePath: null,
    fileSize: null,
    errorMessage: null,
    downloadedAt: null,
    activeModelId: 'gemma-4-e2b',
  };

  private _listeners: StatusChangeCallback[] = [];
  private _abortController: AbortController | null = null;

  constructor() {
    this.initActiveModel();
  }

  private initActiveModel(): void {
    try {
      const savedId = localStorage.getItem(ACTIVE_MODEL_STORAGE_KEY);
      if (savedId && AVAILABLE_MODELS.some(m => m.id === savedId)) {
        this._activeModelId = savedId;
      } else {
        // Se c'è già il file legacy gemma-2 scaricato, mantienilo inizialmente, altrimenti default gemma-4-e2b
        const legacyStatus = localStorage.getItem('chelona_gemma2_model_status');
        if (legacyStatus) {
          try {
            const parsed = JSON.parse(legacyStatus);
            if (parsed.status === 'ready' || parsed.status === 'loaded') {
              this._activeModelId = 'gemma-2-2b';
            }
          } catch {}
        }
      }
    } catch {}
    this._info.activeModelId = this._activeModelId;
    this.loadPersistedStatusForActiveModel();
  }

  get activeModel(): ModelPreset {
    return AVAILABLE_MODELS.find(m => m.id === this._activeModelId) || AVAILABLE_MODELS[0];
  }

  get activeModelId(): string {
    return this._activeModelId;
  }

  /**
   * Cambia il modello attivo. La Semantic Cache e il RAG NON vengono intaccati.
   */
  async setActiveModel(modelId: string): Promise<void> {
    const target = AVAILABLE_MODELS.find(m => m.id === modelId);
    if (!target) return;
    this._activeModelId = modelId;
    this._info.activeModelId = modelId;
    try {
      localStorage.setItem(ACTIVE_MODEL_STORAGE_KEY, modelId);
    } catch {}
    this.loadPersistedStatusForActiveModel();
    await this.checkLocalFile();
    this.notify();
  }

  private loadPersistedStatusForActiveModel(): void {
    try {
      const raw = localStorage.getItem(`${MODEL_STATUS_PREFIX}${this._activeModelId}`) ||
                  (this._activeModelId === 'gemma-2-2b' ? localStorage.getItem('chelona_gemma2_model_status') : null);
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved.status === 'downloading' || saved.status === 'verifying' || saved.status === 'loading') {
          saved.status = 'not_downloaded';
          saved.progress = 0;
        }
        this._info = { ...this._info, ...saved, activeModelId: this._activeModelId };
      } else {
        this._info = {
          status: 'not_downloaded',
          progress: 0,
          filePath: null,
          fileSize: null,
          errorMessage: null,
          downloadedAt: null,
          activeModelId: this._activeModelId,
        };
      }
    } catch {}
  }

  private persistStatus(): void {
    try {
      localStorage.setItem(`${MODEL_STATUS_PREFIX}${this._activeModelId}`, JSON.stringify(this._info));
      if (this._activeModelId === 'gemma-2-2b') {
        localStorage.setItem('chelona_gemma2_model_status', JSON.stringify(this._info));
      }
    } catch {}
  }

  private notify(): void {
    for (const cb of this._listeners) cb({ ...this._info });
    this.persistStatus();
  }

  subscribe(cb: StatusChangeCallback): () => void {
    this._listeners.push(cb);
    cb({ ...this._info });
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

  async isOnWifi(): Promise<boolean> {
    try {
      const status = await Network.getStatus();
      return status.connected && status.connectionType === 'wifi';
    } catch {
      const nav = navigator as any;
      if (nav.connection) {
        return nav.connection.effectiveType === '4g' || nav.connection.type === 'wifi';
      }
      return true;
    }
  }

  async getBatteryLevel(): Promise<number> {
    try {
      const nav = navigator as any;
      if (nav.getBattery) {
        const battery = await nav.getBattery();
        return Math.round(battery.level * 100);
      }
    } catch {}
    return 100;
  }

  /**
   * Verifica se un determinato file modello esiste sul filesystem
   */
  async checkModelExists(model: ModelPreset): Promise<boolean> {
    if (typeof window !== 'undefined' && (window as any).ChelonaNative?.getModelInfo) {
      try {
        const info = await (window as any).ChelonaNative.getModelInfo(model.filename);
        if (info.exists && info.size > 80_000_000) {
          return true;
        }
      } catch {}
    }
    try {
      const result = await Filesystem.stat({
        path: model.filename,
        directory: Directory.Data,
      });
      if (result.size && result.size > 80_000_000) {
        return true;
      }
    } catch {}
    return false;
  }

  /**
   * Verifica se il modello attivo esiste già sul filesystem
   */
  async checkLocalFile(): Promise<boolean> {
    const active = this.activeModel;
    if (typeof window !== 'undefined' && (window as any).ChelonaNative?.getModelInfo) {
      try {
        const info = await (window as any).ChelonaNative.getModelInfo(active.filename);
        if (info.exists && info.size > 80_000_000) {
          this._info.filePath = info.path;
          this._info.fileSize = info.size;
          this._info.status = 'ready';
          this._info.progress = 100;
          this.notify();
          return true;
        }
      } catch (e) {
        console.warn('Native getModelInfo failed', e);
      }
    }

    try {
      const result = await Filesystem.stat({
        path: active.filename,
        directory: Directory.Data,
      });
      if (result.size && result.size > 80_000_000) {
        this._info.filePath = result.uri;
        this._info.fileSize = result.size;
        this._info.status = 'ready';
        this._info.progress = 100;
        this.notify();
        return true;
      }
    } catch {}

    if (this._info.status === 'ready' && !this._info.filePath) {
      this._info.status = 'not_downloaded';
      this._info.progress = 0;
      this.notify();
    }
    return false;
  }

  /**
   * Avvia il download del modello attivo (solo su WiFi)
   */
  async downloadModel(onProgress?: DownloadProgressCallback): Promise<boolean> {
    const active = this.activeModel;

    // 1. Verifica WiFi
    const wifi = await this.isOnWifi();
    if (!wifi) {
      this._info.status = 'error';
      this._info.errorMessage = 'Download disponibile solo su connessione WiFi per risparmio dati.';
      this.notify();
      return false;
    }

    // 2. Verifica batteria
    const battery = await this.getBatteryLevel();
    if (battery < BATTERY_THRESHOLD) {
      this._info.status = 'error';
      this._info.errorMessage = `Batteria troppo scarica (${battery}%). Ricarica il dispositivo prima di scaricare il modello.`;
      this.notify();
      return false;
    }

    // 3. Controlla se già presente
    const exists = await this.checkLocalFile();
    if (exists) return true;

    this._info.status = 'downloading';
    this._info.progress = 0;
    this._info.errorMessage = null;
    this.notify();

    // Native stream download (Android background service, zero WebView crash)
    if (typeof window !== 'undefined' && (window as any).ChelonaNative?.startModelDownload) {
      return new Promise<boolean>((resolve) => {
        let cleanup = () => {};

        const onProgressEvt = (e: any) => {
          const d = e.detail;
          if (d && typeof d.progress === 'number') {
            this._info.progress = d.progress;
            this.notify();
            if (onProgress) {
              onProgress({
                progress: d.progress,
                downloaded: d.downloaded || 0,
                total: d.total || active.sizeBytes,
                speed: d.speed || 0,
              });
            }
          }
        };

        const onCompleteEvt = (e: any) => {
          cleanup();
          const d = e.detail;
          this._info.status = 'ready';
          this._info.progress = 100;
          this._info.filePath = d?.filePath || active.filename;
          this._info.fileSize = d?.fileSize || active.sizeBytes;
          this._info.downloadedAt = Date.now();
          this._info.errorMessage = null;
          this.notify();
          resolve(true);
        };

        const onErrorEvt = (e: any) => {
          cleanup();
          const d = e.detail;
          this._info.status = 'error';
          this._info.errorMessage = d?.error || 'Errore durante il download nativo';
          this.notify();
          resolve(false);
        };

        const onCanceledEvt = () => {
          cleanup();
          this._info.status = 'not_downloaded';
          this._info.progress = 0;
          this._info.errorMessage = 'Download annullato';
          this.notify();
          resolve(false);
        };

        cleanup = () => {
          window.removeEventListener('chelona_model_download_progress', onProgressEvt);
          window.removeEventListener('chelona_model_download_complete', onCompleteEvt);
          window.removeEventListener('chelona_model_download_error', onErrorEvt);
          window.removeEventListener('chelona_model_download_canceled', onCanceledEvt);
        };

        window.addEventListener('chelona_model_download_progress', onProgressEvt);
        window.addEventListener('chelona_model_download_complete', onCompleteEvt);
        window.addEventListener('chelona_model_download_error', onErrorEvt);
        window.addEventListener('chelona_model_download_canceled', onCanceledEvt);

        try {
          (window as any).ChelonaNative.startModelDownload(active.url, active.filename);
        } catch (err: any) {
          cleanup();
          this._info.status = 'error';
          this._info.errorMessage = err?.message || 'Avvio download fallito';
          this.notify();
          resolve(false);
        }
      });
    }

    // Web / Browser test mode fallback
    this._abortController = new AbortController();
    const startTime = Date.now();

    try {
      const response = await fetch(active.url, {
        signal: this._abortController.signal,
        headers: { 'Accept': 'application/octet-stream' },
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);

      const contentLength = Number(response.headers.get('content-length')) || active.sizeBytes;
      const reader = response.body?.getReader();
      if (!reader) throw new Error('Streaming non supportato');

      let received = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        received += value.length;

        const progress = Math.min(99, Math.round((received / contentLength) * 100));
        const elapsed = (Date.now() - startTime) / 1000;
        const speed = received / Math.max(elapsed, 1);

        this._info.progress = progress;
        this.notify();

        if (onProgress) {
          onProgress({ progress, downloaded: received, total: contentLength, speed });
        }
      }

      this._info.status = 'ready';
      this._info.progress = 100;
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

  cancelDownload(): void {
    if (typeof window !== 'undefined' && (window as any).ChelonaNative?.cancelModelDownload) {
      try {
        (window as any).ChelonaNative.cancelModelDownload();
      } catch {}
    }
    this._abortController?.abort();
  }

  async deleteModel(modelId?: string): Promise<void> {
    const target = modelId ? AVAILABLE_MODELS.find(m => m.id === modelId) || this.activeModel : this.activeModel;
    if (typeof window !== 'undefined' && (window as any).ChelonaNative?.deleteModelFile) {
      try {
        (window as any).ChelonaNative.deleteModelFile(target.filename);
      } catch {}
    }
    try {
      await Filesystem.deleteFile({
        path: target.filename,
        directory: Directory.Data,
      });
    } catch {}

    if (target.id === this._activeModelId) {
      this._info = {
        status: 'not_downloaded',
        progress: 0,
        filePath: null,
        fileSize: null,
        errorMessage: null,
        downloadedAt: null,
        activeModelId: this._activeModelId,
      };
      this.notify();
    } else {
      localStorage.removeItem(`${MODEL_STATUS_PREFIX}${target.id}`);
    }
  }

  formatSize(bytes: number): string {
    if (bytes > 1_000_000_000) return `${(bytes / 1_000_000_000).toFixed(2)} GB`;
    if (bytes > 1_000_000) return `${(bytes / 1_000_000).toFixed(0)} MB`;
    return `${Math.round(bytes / 1000)} KB`;
  }
}

export const gemma2ModelManager = new Gemma2ModelManager();
