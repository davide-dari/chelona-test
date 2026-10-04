import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Download, Wifi, WifiOff, BatteryLow, BatteryMedium, BatteryFull,
  CheckCircle, XCircle, AlertCircle, Trash2, Cpu, Brain, RefreshCw,
  Zap, HardDrive, Clock, ShieldCheck, Sparkles, Check
} from 'lucide-react';
import {
  gemma2ModelManager, AVAILABLE_MODELS, type ModelInfo, type DownloadProgress, type ModelPreset
} from '../services/gemma2ModelManager';
import { ragEngine, indexModulesIntoRAG } from '../services/ragEngine';
import type { Module } from '../types';

interface Gemma2SetupScreenProps {
  onClose: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  modules?: Module[];
  username?: string;
}

export const Gemma2SetupScreen: React.FC<Gemma2SetupScreenProps> = ({ onClose, showToast, modules = [], username = '' }) => {
  const [modelInfo, setModelInfo] = useState<ModelInfo>(gemma2ModelManager.info);
  const [activeModel, setActiveModel] = useState<ModelPreset>(gemma2ModelManager.activeModel);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
  const [isOnWifi, setIsOnWifi] = useState<boolean | null>(null);
  const [batteryLevel, setBatteryLevel] = useState<number>(100);
  const [ragStats, setRagStats] = useState(ragEngine.getStats());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [allowCellular, setAllowCellular] = useState(false);

  // Sottoscrivi ai cambiamenti di stato del modello
  useEffect(() => {
    const unsubscribe = gemma2ModelManager.subscribe((info) => {
      setModelInfo(info);
      setActiveModel(gemma2ModelManager.activeModel);
    });
    return unsubscribe;
  }, []);

  // Sottoscrivi alle statistiche del Database Personale (RAG) in tempo reale
  useEffect(() => {
    return ragEngine.subscribe(setRagStats);
  }, []);

  // Sincronizza ed indicizza immediatamente tutti i moduli e ricordi personali nel RAG
  useEffect(() => {
    indexModulesIntoRAG(modules, username);
    setRagStats(ragEngine.getStats());
  }, [modules, username]);

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

  const handleSelectModel = useCallback(async (preset: ModelPreset) => {
    if (preset.id === activeModel.id) return;
    await gemma2ModelManager.setActiveModel(preset.id);
    setActiveModel(preset);
    showToast(`Modello attivo impostato su: ${preset.name}`, 'info');
  }, [activeModel.id, showToast]);

  const handleDownload = useCallback(async () => {
    const success = await gemma2ModelManager.downloadModel((progress) => {
      setDownloadProgress(progress);
    }, allowCellular);
    if (success) {
      showToast(`Modello ${activeModel.name} scaricato con successo! 🎉`, 'success');
      setDownloadProgress(null);
    } else {
      showToast(gemma2ModelManager.info.errorMessage || 'Errore durante il download', 'error');
      setDownloadProgress(null);
    }
  }, [activeModel.name, allowCellular, showToast]);

  const handleCancelDownload = useCallback(() => {
    gemma2ModelManager.cancelDownload();
    setDownloadProgress(null);
    showToast('Download annullato', 'info');
  }, [showToast]);

  const handleDeleteModel = useCallback(async () => {
    await gemma2ModelManager.deleteModel();
    setShowDeleteConfirm(false);
    showToast(`Modello ${activeModel.name} eliminato dal dispositivo`, 'info');
  }, [activeModel.name, showToast]);

  const handleClearRAGCache = useCallback(() => {
    ragEngine.clear();
    setRagStats(ragEngine.getStats());
    showToast('Database vettoriale RAG ripulito', 'info');
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
  const isDownloadBlocked = (!isOnWifi && !allowCellular) || batteryLevel < 10;

  return (
    <div className="fixed inset-0 z-[200] flex flex-col" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--border)] shrink-0 bg-[var(--card-bg)]">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 flex items-center justify-center">
          <Brain className="w-5 h-5 text-violet-500" />
        </div>
        <div className="flex-1">
          <h2 className="text-base font-black text-[var(--text-main)]">Gemma 4 & Modelli Locali</h2>
          <p className="text-xs text-[var(--text-muted)]">Motore di inferenza on-device ad altissima velocità</p>
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

        {/* ── BANNER GARANZIA ZERO PERDITA DATI ── */}
        <div className="flex items-start gap-3 p-3.5 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-indigo-500/10 rounded-2xl border border-emerald-500/20">
          <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="font-bold text-[var(--text-main)]">Zero Perdita di Dati</p>
            <p className="text-[var(--text-muted)] mt-0.5">
              I <strong>ricordi personali</strong> e il <strong>Database RAG</strong> sono separati dai pesi del modello. Cambiando modello, tutte le informazioni rimangono intatte al 100%!
            </p>
          </div>
        </div>

        {/* Stato sistema (WiFi, Batteria, On-Device) */}
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
            <p className="text-[10px] text-[var(--text-muted)]">Target 8GB RAM</p>
          </div>
        </div>

        {/* ── SELETTORE MODELLI (Gemma 4 E2B, Qwen 2.5 1.5B Speed, Gemma 2 2B) ── */}
        <div className="bg-[var(--card-bg)] rounded-2xl p-4 border border-[var(--border)] space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-[var(--text-main)] flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Seleziona Modello di Inferenza
            </h3>
            <span className="text-[11px] font-bold text-[var(--text-muted)]">{AVAILABLE_MODELS.length} disponibili</span>
          </div>

          <div className="space-y-2.5">
            {AVAILABLE_MODELS.map((preset) => {
              const isSelected = preset.id === activeModel.id;
              const isReady = isSelected && (modelInfo.status === 'ready' || modelInfo.status === 'loaded');

              return (
                <div
                  key={preset.id}
                  onClick={() => handleSelectModel(preset)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-500/5 ring-1 ring-indigo-500/30 shadow-xs'
                      : 'border-[var(--border)] bg-[var(--surface-variant)] hover:border-[var(--text-muted)]/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-black text-sm text-[var(--text-main)]">{preset.name}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                          preset.badgeColor === 'emerald'
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                            : preset.badgeColor === 'amber'
                            ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                            : 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30'
                        }`}>
                          {preset.tag}
                        </span>
                        <span className="text-[10px] text-[var(--text-muted)] font-mono">{preset.sizeDisplay}</span>
                      </div>
                      <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                        {preset.description}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-[10px] font-bold text-[var(--text-muted)]">
                        <span className="text-amber-600 dark:text-amber-400">{preset.speedRating}</span>
                        <span>Velocità stimata: {preset.tokensPerSecEstimate}</span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      {isSelected ? (
                        <div className="w-6 h-6 rounded-full bg-indigo-500 text-white flex items-center justify-center shadow-xs">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full border border-[var(--border)]" />
                      )}
                      {isReady && (
                        <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-md">
                          Scaricato
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── STATO DEL MODELLO SELEZIONATO & DOWNLOAD ── */}
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
              <p className="text-sm font-black text-[var(--text-main)]">{activeModel.filename}</p>
              <p className="text-xs text-[var(--text-muted)]">
                {modelInfo.status === 'not_downloaded' && `Non scaricato · ${activeModel.sizeDisplay}`}
                {modelInfo.status === 'downloading' && 'Download in corso...'}
                {modelInfo.status === 'verifying' && 'Verifica integrità...'}
                {(modelInfo.status === 'ready' || modelInfo.status === 'loaded') && `Pronto all'uso · ${modelInfo.fileSize ? formatSize(modelInfo.fileSize) : activeModel.sizeDisplay}`}
                {modelInfo.status === 'loading' && 'Caricamento in memoria...'}
                {modelInfo.status === 'error' && 'Errore'}
              </p>
            </div>
            {modelInfo.status === 'not_downloaded' && (
              <span className="px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] font-black uppercase tracking-wide">
                Da scaricare
              </span>
            )}
            {(modelInfo.status === 'ready' || modelInfo.status === 'loaded') && (
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-wide">
                Attivo & Pronto
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

          {/* Opzione Rete Dati Cellulare se non connesso a WiFi */}
          {!isOnWifi && (modelInfo.status === 'not_downloaded' || modelInfo.status === 'error') && (
            <div className="mt-3 p-3 bg-amber-500/10 rounded-xl border border-amber-500/25 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="text-xs text-[var(--text-main)] font-semibold truncate">
                  WiFi non rilevato
                </span>
              </div>
              <label className="flex items-center gap-2 text-xs font-bold text-indigo-500 dark:text-indigo-400 cursor-pointer select-none shrink-0">
                <input
                  type="checkbox"
                  checked={allowCellular}
                  onChange={(e) => setAllowCellular(e.target.checked)}
                  className="w-4 h-4 rounded accent-indigo-500 cursor-pointer"
                />
                Consenti con rete dati ({activeModel.sizeDisplay})
              </label>
            </div>
          )}

          {/* Avviso Batteria */}
          {batteryLevel < 20 && batteryLevel >= 10 && (modelInfo.status === 'not_downloaded' || modelInfo.status === 'error') && (
            <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-amber-500/10 rounded-xl text-[11px] text-amber-600 dark:text-amber-400">
              <BatteryLow className="w-3.5 h-3.5 shrink-0" />
              <span>Batteria al {batteryLevel}%. Si consiglia di collegare il caricatore prima del download.</span>
            </div>
          )}

          {batteryLevel < 10 && (modelInfo.status === 'not_downloaded' || modelInfo.status === 'error') && (
            <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-red-500/10 rounded-xl text-[11px] text-red-600 dark:text-red-400">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>Batteria critica (&lt; 10%). Collega il caricatore per avviare il download.</span>
            </div>
          )}

          {/* Pulsanti Azione */}
          <div className="mt-3 flex gap-2">
            {(modelInfo.status === 'not_downloaded' || modelInfo.status === 'error') && (
              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                onClick={handleDownload}
                disabled={isDownloadBlocked}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  isDownloadBlocked
                    ? 'bg-[var(--surface-variant)] text-[var(--text-muted)] cursor-not-allowed opacity-60'
                    : 'bg-gradient-to-r from-violet-500 to-indigo-500 text-white shadow-md shadow-indigo-500/20 hover:opacity-90'
                }`}
              >
                <Download className="w-4 h-4" />
                {!isOnWifi && allowCellular
                  ? `Scarica con Rete Dati (${activeModel.sizeDisplay})`
                  : `Scarica ${activeModel.name} (${activeModel.sizeDisplay})`}
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
                Elimina Modello
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

        {/* Info tecnica dinamica */}
        <div className="bg-[var(--card-bg)] rounded-2xl p-4 border border-[var(--border)] space-y-3">
          <h3 className="text-sm font-black text-[var(--text-main)]">Specifiche Tecniche {activeModel.name}</h3>
          <div className="space-y-2">
            {[
              { label: 'Architettura', value: activeModel.name },
              { label: 'Formato', value: 'GGUF Q4_K_M (Quantizzazione 4-bit)' },
              { label: 'Dimensione su disco', value: activeModel.sizeDisplay },
              { label: 'Velocità di inferenza', value: activeModel.speedRating },
              { label: 'Inferenza hardware', value: 'CPU / NPU nativa Android (ARMv8)' },
              { label: 'Database RAG', value: 'Condiviso al 100%, zero perdita' },
              { label: 'Privacy', value: '100% locale sul dispositivo, zero cloud' },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between text-xs">
                <span className="text-[var(--text-muted)]">{label}</span>
                <span className="font-semibold text-[var(--text-main)]">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* RAG stats */}
        <div className="bg-[var(--card-bg)] rounded-2xl p-4 border border-[var(--border)] space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-[var(--text-main)]">Database Personale (RAG)</h3>
            <button
              type="button"
              onClick={handleClearRAGCache}
              className="text-xs text-red-500 hover:text-red-400 font-semibold cursor-pointer"
            >
              Ripulisci indice RAG
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-2 bg-[var(--surface-variant)] rounded-xl">
              <p className="text-base font-black text-[var(--text-main)]">{ragStats.docCount}</p>
              <p className="text-[10px] text-[var(--text-muted)]">Documenti RAG</p>
            </div>
            <div className="text-center p-2 bg-[var(--surface-variant)] rounded-xl">
              <p className="text-base font-black text-[var(--text-main)]">{ragStats.vocabSize}</p>
              <p className="text-[10px] text-[var(--text-muted)]">Vocabolario</p>
            </div>
          </div>
        </div>

        {/* Nota di sicurezza e privacy */}
        <div className="flex items-start gap-2 p-3 bg-[var(--surface-variant)] rounded-xl text-[var(--text-muted)]">
          <Zap className="w-4 h-4 shrink-0 mt-0.5 text-[var(--accent)]" />
          <p className="text-xs leading-relaxed">
            Se il modello selezionato non è ancora scaricato, Chelona AI utilizza automaticamente il motore locale ad alta velocità integrato nell'app, garantendo sempre risposte istantanee senza alcuna chiamata esterna.
          </p>
        </div>
      </div>
    </div>
  );
};
