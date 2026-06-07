import React, { useState, useRef, useCallback } from 'react';
import { Mic, Upload, FileAudio, Download, RefreshCw, CheckCircle, AlertCircle, ArrowLeft, Play } from 'lucide-react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';

interface GiorgioneToolProps {
  onSaveToSandbox?: (title: string, content: string, folderName?: string) => void;
  showToast: (m: string, t?: 'success' | 'error' | 'info') => void;
}

import * as Vosk from 'vosk-browser';

type Screen = 'select' | 'transcribing';
type Status = 'idle' | 'loading-model' | 'decoding' | 'transcribing' | 'done' | 'error';

/* ══════════════════════════════════════════════════════════════
   Decoder audio basato su FFmpeg.wasm
   Converte qualsiasi formato (M4A, AAC, OGG, ecc.) in RAW PCM Float32 a 16kHz
   ══════════════════════════════════════════════════════════════ */

async function decodeAudioTo16kHz(file: File, setProgressLabel?: (label: string) => void): Promise<Float32Array> {
  const ffmpeg = new FFmpeg();
  
  ffmpeg.on('log', ({ message }) => {
    console.log('[FFmpeg]', message);
  });
  
  ffmpeg.on('progress', ({ progress, time }) => {
    if (setProgressLabel) {
      setProgressLabel(`Conversione formato: ${Math.round(progress * 100)}%`);
    }
  });

  if (setProgressLabel) setProgressLabel('Caricamento decoder audio...');

  await ffmpeg.load({
    coreURL: '/ffmpeg/ffmpeg-core.js',
    wasmURL: '/ffmpeg/ffmpeg-core.wasm'
  });

  const name = file.name.replace(/[^a-zA-Z0-9.]/g, '_') || 'input.audio';
  await ffmpeg.writeFile(name, await fetchFile(file));
  
  if (setProgressLabel) setProgressLabel('Estrazione traccia audio...');

  // Converte a raw float32 little-endian, 16kHz, mono
  await ffmpeg.exec([
    '-i', name,
    '-ar', '16000',
    '-ac', '1',
    '-f', 'f32le',
    'output.raw'
  ]);
  
  const data = await ffmpeg.readFile('output.raw');
  
  // Data è Uint8Array, la castiamo a Float32Array (poiché è pcm_f32le)
  const floatArray = new Float32Array(data.buffer, data.byteOffset, data.byteLength / 4);
  
  ffmpeg.terminate();
  return floatArray;
}

const GiorgioneTool: React.FC<GiorgioneToolProps> = ({ onSaveToSandbox, showToast }) => {
  const [screen, setScreen]               = useState<Screen>('select');
  const [status, setStatus]               = useState<Status>('idle');
  const [progress, setProgress]           = useState(0);
  const [progressLabel, setProgressLabel] = useState('');
  const [transcribedText, setTranscribedText] = useState('');
  const [audioUrl, setAudioUrl]           = useState<string | null>(null);
  const [fileName, setFileName]           = useState('');

  const pipelineRef = useRef<any>(null);
  const fileRef     = useRef<File | null>(null);

  /* ─── Caricamento modello Vosk ─── */
  const loadModelIfNeeded = useCallback(async () => {
    if (pipelineRef.current) return pipelineRef.current;

    setStatus('loading-model');
    setProgress(0);
    setProgressLabel('Caricamento modello Vosk Offline...');

    // Load Vosk model from public folder
    const model = await Vosk.createModel('/vosk/model.zip');
    pipelineRef.current = model;
    
    setProgressLabel('Modello pronto!');
    return model;
  }, []);

  /* ─── Gestione file ─── */
  const handleFile = useCallback((file: File) => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(URL.createObjectURL(file));
    setFileName(file.name);
    fileRef.current = file;
    setTranscribedText('');
    setStatus('idle');
  }, [audioUrl]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Reset del flag — il file picker è stato chiuso
    (window as any).__chelona_file_picker_open = false;
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  // Segnala che stiamo aprendo il file picker nativo (l'app andrà in background)
  const handleFilePickerOpen = () => {
    (window as any).__chelona_file_picker_open = true;
    // Sicurezza: se l'utente chiude il picker senza scegliere niente,
    // resettiamo il flag dopo 5 secondi
    setTimeout(() => { (window as any).__chelona_file_picker_open = false; }, 5000);
  };

  /* ─── Avvia → vai alla schermata trascrizione e parte subito ─── */
  const handleAvvia = () => {
    if (!fileRef.current) return showToast('Seleziona prima un file audio.', 'error');
    setScreen('transcribing');
    startTranscription();
  };

  /* ─── Trascrizione ─── */
  const startTranscription = async () => {
    try {
      const model = await loadModelIfNeeded();

      setStatus('decoding');
      setProgressLabel('Decodifica audio in corso...');

      const audioData = await decodeAudioTo16kHz(fileRef.current!, setProgressLabel);

      setStatus('transcribing');
      setProgressLabel('Trascrizione in corso...');

      const recognizer = new model.KaldiRecognizer(16000);
      recognizer.setWords(true);

      let fullText = "";

      // Promise for finishing transcription
      const transcriptionPromise = new Promise<string>((resolve) => {
        let textResult = "";
        
        recognizer.on("result", (msg: any) => {
          if (msg.result && msg.result.text) {
             textResult += msg.result.text + " ";
             setTranscribedText(textResult);
          }
        });

        recognizer.on("partialresult", (msg: any) => {
          if (msg.result && msg.result.partial) {
             setTranscribedText(textResult + msg.result.partial);
          }
        });

        // We will resolve it manually after all chunks are sent and final result retrieved
        // Wait for the final event? Actually `retrieveFinalResult` triggers a `result`.
        // To intercept it, we wrap it in a setTimeout
        (window as any)._resolveVosk = () => {
           resolve(textResult.trim());
        };
      });

      // Send audio in chunks to avoid UI lock
      const CHUNK_SIZE = 16000 * 2; // 2 seconds
      const totalChunks = Math.ceil(audioData.length / CHUNK_SIZE);
      for (let i = 0; i < audioData.length; i += CHUNK_SIZE) {
        recognizer.acceptWaveformFloat(audioData.slice(i, i + CHUNK_SIZE), 16000);
        setProgressLabel(`Trascrizione: ${Math.round((i / audioData.length) * 100)}%`);
        await new Promise(r => setTimeout(r, 0)); // yield to UI
      }

      recognizer.retrieveFinalResult();
      
      // Wait a moment for worker to process retrieveFinalResult
      setTimeout(() => {
        (window as any)._resolveVosk();
      }, 500);

      fullText = await transcriptionPromise;
      
      recognizer.remove();

      setTranscribedText(fullText);
      setStatus('done');
      showToast('Trascrizione completata!', 'success');

    } catch (err: any) {
      console.error('[Giorgione]', err);
      setStatus('error');
      showToast(`Errore: ${err.message || 'Trascrizione fallita'}`, 'error');
    }
  };

  /* ─── Azioni risultato ─── */
  const downloadTxt = () => {
    if (!transcribedText) return;
    const blob = new Blob([transcribedText], { type: 'text/plain; charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `Trascrizione_${fileName.replace(/\.[^.]+$/, '')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const saveToSandbox = () => {
    if (!transcribedText || !onSaveToSandbox) return;
    onSaveToSandbox(`Trascrizione – ${fileName}`, transcribedText);
    showToast('Salvato nella Sandbox!', 'success');
  };

  const resetAll = () => {
    setScreen('select');
    setStatus('idle');
    setTranscribedText('');
    setProgress(0);
    setProgressLabel('');
  };

  const isWorking = status === 'loading-model' || status === 'decoding' || status === 'transcribing';

  /* ══════════════════════════════════════════
     SCHERMATA 1 — Selezione file
  ══════════════════════════════════════════ */
  if (screen === 'select') {
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
          className="relative flex flex-col items-center justify-center min-h-[200px] rounded-3xl border-2 border-dashed border-[var(--border)] bg-[var(--surface-variant)] hover:border-orange-400 hover:bg-orange-500/5 transition-all cursor-pointer group"
        >
          <input
            type="file"
            accept="audio/*,video/mp4,video/webm"
            onChange={handleInputChange}
            onClick={handleFilePickerOpen}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div className="flex flex-col items-center gap-3 pointer-events-none p-6">
            {fileName ? (
              <>
                <FileAudio className="w-12 h-12 text-orange-500" />
                <p className="font-bold text-[var(--text-main)] text-center break-all text-base">{fileName}</p>
                <p className="text-xs text-orange-400 font-semibold">✓ File selezionato · Tocca per cambiare</p>
              </>
            ) : (
              <>
                <Upload className="w-12 h-12 text-[var(--text-muted)] group-hover:text-orange-400 transition-colors" />
                <p className="font-bold text-[var(--text-main)] text-base">Trascina o tocca per selezionare</p>
                <p className="text-xs text-[var(--text-muted)]">MP3, WAV, M4A, OGG, MP4...</p>
              </>
            )}
          </div>
        </div>

        {/* Player anteprima */}
        {audioUrl && (
          <audio src={audioUrl} controls className="w-full rounded-2xl h-12" />
        )}

        {/* Tasto AVVIA — compare solo dopo selezione file */}
        {fileName && (
          <button
            onClick={handleAvvia}
            className="w-full py-5 bg-orange-500 hover:bg-orange-600 active:scale-95 text-white font-black text-lg rounded-2xl shadow-xl shadow-orange-500/30 transition-all flex items-center justify-center gap-3"
          >
            <Play className="w-6 h-6 fill-white" />
            Avvia
          </button>
        )}
      </div>
    );
  }

  /* ══════════════════════════════════════════
     SCHERMATA 2 — Trascrizione in corso / Risultato
  ══════════════════════════════════════════ */
  return (
    <div className="w-full space-y-5 animate-scale-up">

      {/* Header con tasto indietro */}
      <div className="flex items-center gap-3">
        <button
          onClick={resetAll}
          disabled={isWorking}
          className="p-2.5 bg-[var(--surface-variant)] rounded-xl text-[var(--text-muted)] hover:text-[var(--text-main)] disabled:opacity-40 transition-all active:scale-95"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3 flex-1">
          <div className="p-2.5 bg-orange-500 rounded-xl text-white shrink-0">
            <Mic className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-black text-[var(--text-main)] truncate">Giorgione</h2>
            <p className="text-xs text-[var(--text-muted)] truncate">{fileName}</p>
          </div>
        </div>
      </div>

      {/* Stato: in elaborazione */}
      {isWorking && (
        <div className="p-6 bg-[var(--card-bg)] rounded-3xl border border-[var(--border)] space-y-4">
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-orange-500/10 flex items-center justify-center">
                <RefreshCw className="w-8 h-8 text-orange-500 animate-spin" />
              </div>
            </div>
            <p className="font-bold text-[var(--text-main)] text-center">{progressLabel}</p>
          </div>

          {progress > 0 && (
            <div className="space-y-1.5">
              <div className="w-full bg-[var(--surface-variant)] rounded-full h-3 overflow-hidden">
                <div
                  className="bg-orange-500 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-center text-[var(--text-muted)]">{progress}%</p>
            </div>
          )}

          <p className="text-xs text-center text-[var(--text-muted)]">
            {status === 'loading-model'
              ? 'Il modello AI viene scaricato una sola volta e poi funziona offline.'
              : status === 'transcribing'
              ? 'Analisi neurale dell\'audio in corso, attendere...'
              : 'Elaborazione audio...'}
          </p>
        </div>
      )}

      {/* Stato: errore */}
      {status === 'error' && (
        <div className="space-y-4">
          <div className="flex flex-col items-center gap-3 p-6 bg-red-500/10 rounded-3xl border border-red-500/20">
            <AlertCircle className="w-12 h-12 text-red-500" />
            <p className="text-base font-bold text-red-500 text-center">Trascrizione fallita</p>
            <p className="text-sm text-[var(--text-muted)] text-center">Verifica che il file audio sia valido e riprova.</p>
          </div>
          <button
            onClick={resetAll}
            className="w-full py-4 bg-[var(--surface-variant)] rounded-2xl font-bold text-[var(--text-main)] transition-all active:scale-95"
          >
            ↩ Torna alla selezione
          </button>
        </div>
      )}

      {/* Stato: completato */}
      {status === 'done' && transcribedText && (
        <div className="space-y-4">

          {/* Badge completato */}
          <div className="flex items-center gap-2 px-4 py-2 bg-[var(--success)]/10 rounded-2xl border border-[var(--success)]/20 w-fit">
            <CheckCircle className="w-4 h-4 text-[var(--success)]" />
            <span className="font-black text-sm text-[var(--success)]">Trascrizione completata</span>
          </div>

          {/* Testo trascritto */}
          <div className="p-5 bg-[var(--surface-variant)] rounded-2xl max-h-72 overflow-y-auto">
            <p className="text-sm text-[var(--text-main)] leading-relaxed whitespace-pre-wrap">
              {transcribedText}
            </p>
          </div>

          {/* Azioni */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={downloadTxt}
              className="flex items-center justify-center gap-2 py-3.5 bg-[var(--card-bg)] border border-[var(--border)] hover:border-orange-400 rounded-2xl font-bold text-sm text-[var(--text-main)] transition-all active:scale-95"
            >
              <Download className="w-4 h-4" /> Scarica .txt
            </button>
            {onSaveToSandbox && (
              <button
                onClick={saveToSandbox}
                className="flex items-center justify-center gap-2 py-3.5 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-bold text-sm transition-all active:scale-95 shadow-lg shadow-orange-500/20"
              >
                <FileAudio className="w-4 h-4" /> Salva in Sandbox
              </button>
            )}
          </div>

          {/* Nuova trascrizione */}
          <button
            onClick={resetAll}
            className="w-full py-3.5 border border-[var(--border)] hover:border-orange-400 rounded-2xl font-bold text-sm text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all active:scale-95"
          >
            🎙️ Nuova trascrizione
          </button>
        </div>
      )}
    </div>
  );
};

export default GiorgioneTool;
