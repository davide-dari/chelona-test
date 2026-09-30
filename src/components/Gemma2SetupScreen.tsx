import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Download, Wifi, WifiOff, BatteryLow, BatteryMedium, BatteryFull,
  CheckCircle, XCircle, AlertCircle, Trash2, Cpu, Brain, RefreshCw,
  Zap, HardDrive, Clock, ChevronRight
} from 'lucide-react';
import { gemma2ModelManager, type ModelInfo, type DownloadProgress } from '../services/gemma2ModelManager';
import { ragEngine } from '../services/ragEngine';
import { promptCache } from '../services/promptCache';

interface Gemma2SetupScreenProps {
  onClose: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const Gemma2SetupScreen: React.FC<Gemma2SetupScreenProps> = ({ onClose, showToast }) => {
  const [modelInfo, setModelInfo] = useState<ModelInfo>(gemma2ModelManager.info);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
  const [isOnWifi, setIsOnWifi] = useState<boolean | null>(null);
  const [batteryLevel, setBatteryLevel] = useState<number>(100);
  const [ragStats, setRagStats] = useState(ragEngine.getStats());
  const [cacheStats, setCacheStats] = useState(promptCache.getStats());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Sottoscrivi ai cambiamenti di stato del modello
  useEffect(() => {
    const unsubscribe = gemma2ModelManager.subscribe(setModelInfo);
    return unsubscribe;
  }, []);

  // Controlla WiFi e batteria
  useEffect(() => {
    const checkStatus = async () => {
      const wifi = await gemma2ModelManager.isOnWifi();
      setIsOnWifi(wifi);
      const battery = await gemma2ModelManager.getBatteryLevel();
      setBatteryLevel(battery);
    };
    checkStatus();
    const interval = setInterval(checkStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  // Controlla se il file esiste già
  useEffect(() => {
    gemma2ModelManager.checkLocalFile();
  }, []);

  const handleDownload = useCallback(async () => {
    const success = await gemma2ModelManager.downloadModel((progress) => {
      setDownloadProgress(progress);
    });
    if (success) {
      showToast('Modello Gemma 2 scaricato con successo! 🎉', 'success');
      setDownloadProgress(null);
    } else {
      showToast(gemma2ModelManager.info.errorMessage || 'Errore durante il download', 'error');
      setDownloadProgress(null);
    }
  }, [showToast]);

  const handleCancelDownload = useCallback(() => {
    gemma2ModelManager.cancelDownload();
    setDownloadProgress(null);
    showToast('Download annullato', 'info');
  }, [showToast]);

  const handleDeleteModel = useCallback(async () => {
    await gemma2ModelManager.deleteModel();
    promptCache.invalidate();
    setShowDeleteConfirm(false);
    showToast('Modello eliminato dal dispositivo', 'info');
  }, [showToast]);

  const handleClearRAGCache = useCallback(() => {
    ragEngine.clear();
    promptCache.invalidate();
    setRagStats(ragEngine.getStats());
    setCacheStats(promptCache.getStats());
    showToast('Database vettoriale e cache ripuliti', 'info');
  }, [showToast]);

  const formatSpeed = (bytesPerSec: number): string => {
    if (bytesPerSec > 1_000_000) return `${(bytesPerSec / 1_000_000).toFixed(1)} MB/s`;
    return `${Math.round(bytesPerSec / 1000)} KB/s`;
  };

  const formatSize = (bytes: number): string => {
    if (bytes > 1_000_000_000) return `${(bytes / 1_000_000_000).toFixed(2)} GB`;
    if (bytes > 1_000_000) return `${(bytes / 1_000_000).toFixed(0)} MB`;
    return `${Math.round(bytes / 1000)} KB`;
  };

  const getEstimatedTimeRemaining = (progress: DownloadProgress): string => {
    if (progress.speed <= 0) return '...';
    const remaining = progress.total - progress.downloaded;
    const seconds = Math.round(remaining / progress.speed);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  };

  const BatteryIcon = batteryLevel >= 60 ? BatteryFull : batteryLevel >= 30 ? BatteryMedium : BatteryLow;
  const batteryColor = batteryLevel >= 60 ? 'text-emerald-500' : batteryLevel >= 30 ? 'text-amber-500' : 'text-red-500';
  const isDownloadBlocked = !isOnWifi || batteryLevel < 20;

  return (
    <div className="fixed inset-0 z-[200] flex flex-col" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--border)] shrink-0">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 flex items-center justify-center">
          <Brain className="w-5 h-5 text-violet-500" />
        </div>
        <div className="flex-1">
          <h2 className="text-base font-black text-[var(--text-main)]">Gemma 2 AI Locale</h2>
          <p className="text-xs text-[var(--text-muted)]">Motore di inferenza on-device</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-9 h-9 rounded-xl bg-[var(--surface-variant)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
        >
          <XCircle className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">

        {/* Stato sistema */}
        <div className="bg-[var(--card-bg)] rounded-2xl p-4 border border-[var(--border)] flex gap-4">
          {/* WiFi */}
          <div className="flex-1 text-center">
            <div className={`w-10 h-10 rounded-xl mx-auto mb-1.5 flex items-center justify-center ${
              isOnWifi ? 'bg-emerald-500/15' : 'bg-red-500/15'
            }`}>
              {isOnWifi ? (
                <Wifi className="w-5 h-5 text-emerald-500" />
              ) : (
                <WifiOff className="w-5 h-5 text-red-500" />
              )}
            </div>
            <p className="text-xs font-bold text-[var(--text-main)]">{isOnWifi ? 'WiFi' : 'No WiFi'}</p>
            <p className="text-[10px] text-[var(--text-muted)]">{isOnWifi ? 'Connesso' : 'Necessario'}</p>
          </div>

          {/* Batteria */}
          <div className="flex-1 text-center">
            <div className={`w-10 h-10 rounded-xl mx-auto mb-1.5 flex items-center justify-center ${
              batteryLevel >= 30 ? 'bg-emerald-500/15' : 'bg-amber-500/15'
            }`}>
              <BatteryIcon className={`w-5 h-5 ${batteryColor}`} />
            </div>
            <p className="text-xs font-bold text-[var(--text-main)]">{batteryLevel}%</p>
            <p className="text-[10px] text-[var(--text-muted)]">{batteryLevel >= 20 ? 'OK' : 'Scarica'}</p>
          </div>

          {/* RAM/Dispositivo */}
          <div className="flex-1 text-center">
            <div className="w-10 h-10 rounded-xl mx-auto mb-1.5 flex items-center justify-center bg-indigo-500/15">
              <Cpu className="w-5 h-5 text-indigo-500" />
            </div>
            <p className="text-xs font-bold text-[var(--text-main)]">On-Device</p>
            <p className="text-[10px] text-[var(--text-muted)]">100% Locale</p>
          </div>
        </div>

        {/* Stato modello */}
        <div className="bg-[var(--card-bg)] rounded-2xl p-4 border border-[var(--border)]">
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              modelInfo.status === 'ready' || modelInfo.status === 'loaded'
                ? 'bg-emerald-500/15'
                : modelInfo.status === 'error'
                ? 'bg-red-500/15'
                : modelInfo.status === 'downloading'
                ? 'bg-blue-500/15'
                : 'bg-[var(--surface-variant)]'
            }`}>
              {modelInfo.status === 'ready' || modelInfo.status === 'loaded' ? (
                <CheckCircle className="w-5 h-5 text-emerald-500" />
              ) : modelInfo.status === 'error' ? (
                <XCircle className="w-5 h-5 text-red-500" />
              ) : modelInfo.status === 'downloading' || modelInfo.status === 'verifying' ? (
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                  <RefreshCw className="w-5 h-5 text-blue-500" />
                </motion.div>
              ) : (
                <HardDrive className="w-5 h-5 text-[var(--text-muted)]" />
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm font-black text-[var(--text-main)]">gemma-2-2b-it-Q4_K_M.gguf</p>
              <p className="text-xs text-[var(--text-muted)]">
                {modelInfo.status === 'not_downloaded' && 'Non scaricato · ~1.55 GB'}
                {modelInfo.status === 'downloading' && 'Download in corso...'}
                {modelInfo.status === 'verifying' && 'Verifica integrità...'}
                {(modelInfo.status === 'ready' || modelInfo.status === 'loaded') && `Pronto · ${modelInfo.fileSize ? formatSize(modelInfo.fileSize) : '~1.55 GB'}`}
                {modelInfo.status === 'loading' && 'Caricamento in memoria...'}
                {modelInfo.status === 'error' && 'Errore'}
              </p>
            </div>
            {modelInfo.status === 'not_downloaded' && (
              <span className="px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] font-black uppercase tracking-wide">
                Non attivo
              </span>
            )}
            {(modelInfo.status === 'ready' || modelInfo.status === 'loaded') && (
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-wide">
                Attivo
              </span>
            )}
          </div>

          {/* Barra progresso download */}
          <AnimatePresence>
            {modelInfo.status === 'downloading' && downloadProgress && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 space-y-2"
              >
                <div className="w-full h-2 bg-[var(--surface-variant)] rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
                    animate={{ width: `${downloadProgress.progress}%` }}
                    transition={{ ease: 'linear' }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)]">
                  <span>{downloadProgress.progress}% · {formatSize(downloadProgress.downloaded)} / {formatSize(downloadProgress.total)}</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {getEstimatedTimeRemaining(downloadProgress)} · {formatSpeed(downloadProgress.speed)}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Messaggio errore */}
          {modelInfo.status === 'error' && modelInfo.errorMessage && (
            <div className="mt-3 flex items-start gap-2 p-3 bg-red-500/10 rounded-xl border border-red-500/20">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-xs text-red-600 dark:text-red-400">{modelInfo.errorMessage}</p>
            </div>
          )}

          {/* Avviso WiFi/Batteria */}
          {isDownloadBlocked && modelInfo.status === 'not_downloaded' && (
            <div className="mt-3 flex items-start gap-2 p-3 bg-amber-500/10 rounded-xl border border-amber-500/20">
              <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 dark:text-amber-300">
                {!isOnWifi ? 'Connetti al WiFi per scaricare il modello (risparmio dati).' : ''}
                {batteryLevel < 20 ? ' Carica il dispositivo sopra il 20% prima di scaricare.' : ''}
              </p>
            </div>
          )}

          {/* Pulsanti */}
          <div className="mt-3 flex gap-2">
            {(modelInfo.status === 'not_downloaded' || modelInfo.status === 'error') && (
              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                onClick={handleDownload}
                disabled={isDownloadBlocked}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  isDownloadBlocked
                    ? 'bg-[var(--surface-variant)] text-[var(--text-muted)] cursor-not-allowed'
                    : 'bg-gradient-to-r from-violet-500 to-indigo-500 text-white shadow-md shadow-indigo-500/20 hover:opacity-90'
                }`}
              >
                <Download className="w-4 h-4" />
                Scarica Modello (~1.55 GB)
              </motion.button>
            )}

            {modelInfo.status === 'downloading' && (
              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                onClick={handleCancelDownload}
                className="flex-1 py-2.5 rounded-xl bg-red-500/15 text-red-600 dark:text-red-400 text-sm font-bold flex items-center justify-center gap-2 cursor-pointer"
              >
                <XCircle className="w-4 h-4" />
                Annulla Download
              </motion.button>
            )}

            {(modelInfo.status === 'ready' || modelInfo.status === 'loaded') && !showDeleteConfirm && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="py-2.5 px-4 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 text-sm font-bold flex items-center gap-1.5 cursor-pointer hover:bg-red-500/20 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Elimina
              </button>
            )}

            {showDeleteConfirm && (
              <>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl bg-[var(--surface-variant)] text-[var(--text-main)] text-sm font-bold cursor-pointer"
                >
                  Annulla
                </button>
                <button
                  type="button"
                  onClick={handleDeleteModel}
                  className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold cursor-pointer"
                >
                  Conferma Eliminazione
                </button>
              </>
            )}
          </div>
        </div>

        {/* Info tecnica */}
        <div className="bg-[var(--card-bg)] rounded-2xl p-4 border border-[var(--border)] space-y-3">
          <h3 className="text-sm font-black text-[var(--text-main)]">Specifiche Tecniche</h3>
          <div className="space-y-2">
            {[
              { label: 'Modello', value: 'Gemma 2 2B Instruct' },
              { label: 'Formato', value: 'GGUF Q4_K_M (quantizzato 4-bit)' },
              { label: 'Dimensione', value: '~1.55 GB su disco' },
              { label: 'Memoria richiesta', value: '~2 GB RAM attivi' },
              { label: 'Inferenza', value: 'CPU nativa Android (ARMv8)' },
              { label: 'Lingua', value: 'Italiano (fine-tuned)' },
              { label: 'Privacy', value: '100% locale, zero cloud' },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between text-xs">
                <span className="text-[var(--text-muted)]">{label}</span>
                <span className="font-semibold text-[var(--text-main)]">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* RAG & Cache stats */}
        <div className="bg-[var(--card-bg)] rounded-2xl p-4 border border-[var(--border)] space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-[var(--text-main)]">Database Personale (RAG)</h3>
            <button
              type="button"
              onClick={handleClearRAGCache}
              className="text-xs text-red-500 hover:text-red-400 font-semibold cursor-pointer"
            >
              Ripulisci cache
            </button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-2 bg-[var(--surface-variant)] rounded-xl">
              <p className="text-base font-black text-[var(--text-main)]">{ragStats.docCount}</p>
              <p className="text-[10px] text-[var(--text-muted)]">Documenti</p>
            </div>
            <div className="text-center p-2 bg-[var(--surface-variant)] rounded-xl">
              <p className="text-base font-black text-[var(--text-main)]">{ragStats.vocabSize}</p>
              <p className="text-[10px] text-[var(--text-muted)]">Vocabolario</p>
            </div>
            <div className="text-center p-2 bg-[var(--surface-variant)] rounded-xl">
              <p className="text-base font-black text-[var(--text-main)]">{cacheStats.size}</p>
              <p className="text-[10px] text-[var(--text-muted)]">Cache hit</p>
            </div>
          </div>
        </div>

        {/* Nota */}
        <div className="flex items-start gap-2 p-3 bg-[var(--surface-variant)] rounded-xl text-[var(--text-muted)]">
          <Zap className="w-4 h-4 shrink-0 mt-0.5 text-[var(--accent)]" />
          <p className="text-xs leading-relaxed">
            Quando il modello non è scaricato, Chelona AI utilizza automaticamente il motore locale ad alta velocità integrato nell'app, senza mai ricorrere a servizi cloud.
          </p>
        </div>
      </div>
    </div>
  );
};
