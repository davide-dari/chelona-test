import React, { useState, useRef, useCallback } from 'react';
import { Mic, Upload, FileAudio, Download, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';

interface GiorgioneToolProps {
  onSaveToSandbox?: (title: string, content: string, folderName?: string) => void;
  showToast: (m: string, t?: 'success' | 'error' | 'info') => void;
}

type Status = 'idle' | 'loading-model' | 'decoding' | 'transcribing' | 'done' | 'error';

const WHISPER_CDN = 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2';

const GiorgioneTool: React.FC<GiorgioneToolProps> = ({ onSaveToSandbox, showToast }) => {
  const [status, setStatus] = useState<Status>('idle');
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');
  const [transcribedText, setTranscribedText] = useState('');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');

  const pipelineRef = useRef<any>(null);
  const fileRef = useRef<File | null>(null);

  const loadPipelineIfNeeded = useCallback(async () => {
    if (pipelineRef.current) return pipelineRef.current;

    setStatus('loading-model');
    setProgress(0);
    setProgressLabel('Download modello Whisper...');

    // Import dinamico dal CDN — zero impatto sul bundle principale
    const { pipeline, env } = await import(
      /* @vite-ignore */
      `${WHISPER_CDN}/src/transformers.js`
    );

    env.allowLocalModels = false;
    env.useBrowserCache = true;

    pipelineRef.current = await pipeline(
      'automatic-speech-recognition',
      'Xenova/whisper-small',
      {
        progress_callback: (p: any) => {
          if (p.status === 'progress' && p.total > 0) {
            const pct = Math.round((p.loaded / p.total) * 100);
            setProgress(pct);
            setProgressLabel(`Download modello: ${pct}%`);
          }
          if (p.status === 'ready') {
            setProgressLabel('Modello pronto!');
          }
        },
      }
    );

    return pipelineRef.current;
  }, []);

  const handleFile = useCallback((file: File) => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    const url = URL.createObjectURL(file);
    setAudioUrl(url);
    setFileName(file.name);
    fileRef.current = file;
    setTranscribedText('');
    setStatus('idle');
  }, [audioUrl]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const startTranscription = async () => {
    if (!fileRef.current) return showToast('Carica prima un file audio.', 'error');

    try {
      const transcriber = await loadPipelineIfNeeded();

      setStatus('decoding');
      setProgressLabel('Decodifica audio...');

      const arrayBuffer = await fileRef.current.arrayBuffer();
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      const audioData = audioBuffer.getChannelData(0);

      setStatus('transcribing');
      setProgressLabel('Trascrizione in corso...');

      const result = await transcriber(audioData, {
        chunk_length_s: 30,
        stride_length_s: 5,
        return_timestamps: false,
      });

      setTranscribedText(result.text?.trim() ?? '');
      setStatus('done');
      showToast('Trascrizione completata!', 'success');

    } catch (err: any) {
      console.error('[Giorgione]', err);
      setStatus('error');
      showToast('Errore durante la trascrizione.', 'error');
    }
  };

  const downloadTxt = () => {
    if (!transcribedText) return;
    const blob = new Blob([transcribedText], { type: 'text/plain; charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Trascrizione_${fileName.replace(/\.[^.]+$/, '')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const saveToSandbox = () => {
    if (!transcribedText || !onSaveToSandbox) return;
    onSaveToSandbox(`Trascrizione – ${fileName}`, transcribedText);
    showToast('Salvato nella Sandbox!', 'success');
  };

  const isWorking = status === 'loading-model' || status === 'decoding' || status === 'transcribing';

  return (
    <div className="w-full space-y-5 animate-scale-up">

      {/* Header */}
      <div className="flex items-center gap-4 p-5 bg-orange-500/10 rounded-3xl border border-orange-500/20">
        <div className="p-3 bg-orange-500 rounded-2xl text-white shadow-lg shadow-orange-500/30 shrink-0">
          <Mic className="w-7 h-7" />
        </div>
        <div>
          <h2 className="text-xl font-black text-[var(--text-main)]">Giorgione</h2>
          <p className="text-sm text-[var(--text-muted)]">Trascrizione audio offline · Nessun dato in rete</p>
        </div>
      </div>

      {/* Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className="relative flex flex-col items-center justify-center min-h-[160px] rounded-3xl border-2 border-dashed border-[var(--border)] bg-[var(--surface-variant)] hover:border-orange-400 hover:bg-orange-500/5 transition-all cursor-pointer group"
      >
        <input
          type="file"
          accept="audio/*,video/mp4,video/webm"
          onChange={handleInputChange}
          disabled={isWorking}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div className="flex flex-col items-center gap-3 pointer-events-none p-6">
          {fileName ? (
            <>
              <FileAudio className="w-10 h-10 text-orange-500" />
              <p className="font-bold text-[var(--text-main)] text-center break-all">{fileName}</p>
              <p className="text-xs text-[var(--text-muted)]">Tocca per cambiare file</p>
            </>
          ) : (
            <>
              <Upload className="w-10 h-10 text-[var(--text-muted)] group-hover:text-orange-400 transition-colors" />
              <p className="font-bold text-[var(--text-main)]">Trascina o tocca per selezionare</p>
              <p className="text-xs text-[var(--text-muted)]">MP3, WAV, M4A, OGG, MP4...</p>
            </>
          )}
        </div>
      </div>

      {/* Audio player */}
      {audioUrl && (
        <audio src={audioUrl} controls className="w-full rounded-2xl h-12" />
      )}

      {/* Bottone Trascrivi */}
      {fileRef.current && !isWorking && status !== 'done' && (
        <button
          onClick={startTranscription}
          className="w-full py-4 bg-orange-500 hover:bg-orange-600 active:scale-95 text-white font-black rounded-2xl shadow-lg shadow-orange-500/30 transition-all"
        >
          🎙️ Avvia Trascrizione
        </button>
      )}

      {/* Progress */}
      {isWorking && (
        <div className="p-5 bg-[var(--card-bg)] rounded-3xl border border-[var(--border)] space-y-3">
          <div className="flex items-center gap-3">
            <RefreshCw className="w-5 h-5 text-orange-500 animate-spin shrink-0" />
            <p className="font-semibold text-[var(--text-main)] text-sm">{progressLabel}</p>
          </div>
          {progress > 0 && (
            <div className="w-full bg-[var(--surface-variant)] rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-orange-500 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
          <p className="text-xs text-[var(--text-muted)]">
            {status === 'loading-model'
              ? 'Il modello viene scaricato una volta sola e poi è disponibile offline.'
              : status === 'transcribing'
              ? 'Analisi in corso... Attendere.'
              : 'Elaborazione audio...'}
          </p>
        </div>
      )}

      {/* Error */}
      {status === 'error' && (
        <div className="flex items-center gap-3 p-4 bg-red-500/10 rounded-2xl border border-red-500/20 text-red-500">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-sm font-semibold">Trascrizione fallita. Verifica che il file audio sia valido e riprova.</p>
        </div>
      )}

      {/* Risultato */}
      {status === 'done' && transcribedText && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-[var(--success)]">
            <CheckCircle className="w-5 h-5" />
            <span className="font-black text-sm">Trascrizione completata</span>
          </div>

          <div className="p-5 bg-[var(--surface-variant)] rounded-2xl max-h-64 overflow-y-auto">
            <p className="text-sm text-[var(--text-main)] leading-relaxed whitespace-pre-wrap font-mono">
              {transcribedText}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={downloadTxt}
              className="flex items-center justify-center gap-2 py-3 bg-[var(--card-bg)] border border-[var(--border)] hover:border-orange-400 rounded-2xl font-bold text-sm text-[var(--text-main)] transition-all active:scale-95"
            >
              <Download className="w-4 h-4" /> Scarica .txt
            </button>
            {onSaveToSandbox && (
              <button
                onClick={saveToSandbox}
                className="flex items-center justify-center gap-2 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-bold text-sm transition-all active:scale-95 shadow-lg shadow-orange-500/20"
              >
                <FileAudio className="w-4 h-4" /> Salva in Sandbox
              </button>
            )}
          </div>

          <button
            onClick={() => { setStatus('idle'); setTranscribedText(''); }}
            className="w-full py-3 text-sm text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
          >
            ↩ Nuova trascrizione
          </button>
        </div>
      )}
    </div>
  );
};

export default GiorgioneTool;
