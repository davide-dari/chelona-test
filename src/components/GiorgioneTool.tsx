import React, { useState, useRef, useEffect } from 'react';
import { Mic, Upload, FileAudio, Play, Pause, Download, StopCircle, RefreshCw } from 'lucide-react';

interface GiorgioneToolProps {
  onSaveToSandbox?: (title: string, content: string, folderName?: string) => void;
  showToast: (m: string, t?: 'success'|'error'|'info') => void;
}

export const GiorgioneTool: React.FC<GiorgioneToolProps> = ({ onSaveToSandbox, showToast }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('In attesa di file o registrazione...');
  const [transcribedText, setTranscribedText] = useState('');
  
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Riferimento al transcriber per singleton pattern
  const transcriberRef = useRef<any>(null);

  useEffect(() => {
    // Inizializza o preload del modello se desiderato
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const initTranscriber = async () => {
    if (transcriberRef.current) return transcriberRef.current;
    
    setStatusText('Caricamento modello AI (Giorgione/Whisper)...');
    try {
      const { pipeline, env } = await import('@xenova/transformers');
      // Disabilita i modelli locali se si vuole fare fetch remoto
      env.allowLocalModels = false;
      // Abilita la cache browser
      env.useBrowserCache = true;

      // Usiamo Xenova/whisper-tiny che pesa solo ~40MB ed è perfetto per il web
      transcriberRef.current = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny', {
        progress_callback: (data: any) => {
          if (data.status === 'progress') {
            setProgress(Math.round(data.progress));
            setStatusText(`Download modello: ${Math.round(data.progress)}%`);
          }
        }
      });
      return transcriberRef.current;
    } catch (e) {
      console.error(e);
      showToast("Errore caricamento modello", "error");
      throw e;
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setAudioUrl(url);
    
    processAudioFile(file);
  };

  const processAudioFile = async (file: File) => {
    setIsProcessing(true);
    setProgress(0);
    setTranscribedText('');
    
    try {
      const transcriber = await initTranscriber();
      
      setStatusText('Decodifica audio in corso...');
      
      // Decodifica l'audio file nel formato giusto usando AudioContext
      const arrayBuffer = await file.arrayBuffer();
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      const audioData = audioBuffer.getChannelData(0); // Usa il primo canale (mono)
      
      setStatusText('Trascrizione in corso...');
      
      const result = await transcriber(audioData, {
        chunk_length_s: 30,
        stride_length_s: 5,
        return_timestamps: true,
        callback_function: (beams: any) => {
          // Possiamo intercettare risultati parziali se necessario
          setStatusText('Analizzando segmenti...');
        }
      });
      
      setTranscribedText(result.text);
      setStatusText('Completato!');
      showToast("Trascrizione completata!", "success");
      
    } catch (e) {
      console.error("Errore di trascrizione", e);
      setStatusText('Errore durante la trascrizione.');
      showToast("Si è verificato un errore", "error");
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const saveToSandbox = () => {
    if (!transcribedText) return showToast("Nessun testo da salvare.", "error");
    if (onSaveToSandbox) {
      onSaveToSandbox("Trascrizione Giorgione", transcribedText);
      showToast("Salvato nella Sandbox!", "success");
    }
  };
  
  const downloadText = () => {
    if (!transcribedText) return showToast("Nessun testo da scaricare.", "error");
    const blob = new Blob([transcribedText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "Trascrizione_Giorgione.txt";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      
      {/* Header tool */}
      <div className="bg-orange-500/10 rounded-3xl p-6 border border-orange-500/20">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-orange-500 rounded-2xl text-white shadow-lg shadow-orange-500/30">
            <Mic className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Giorgione</h2>
            <p className="text-gray-600">Trascrizione Audio Offline ad Altissima Precisione</p>
          </div>
        </div>
      </div>

      {/* Caricamento File */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Dropzone / Upload */}
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col items-center justify-center min-h-[250px] relative overflow-hidden group">
          <input 
            type="file" 
            accept="audio/*,video/mp4" 
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            onChange={handleFileUpload}
            disabled={isProcessing}
          />
          
          <div className="flex flex-col items-center text-center space-y-4">
            <div className={`p-5 rounded-full ${isProcessing ? 'bg-orange-100 text-orange-500 animate-pulse' : 'bg-gray-50 text-gray-400 group-hover:bg-orange-50 group-hover:text-orange-500 transition-colors'}`}>
              {isProcessing ? <RefreshCw className="w-10 h-10 animate-spin" /> : <Upload className="w-10 h-10" />}
            </div>
            
            <div>
              <p className="text-lg font-bold text-gray-800">Trascina un file qui</p>
              <p className="text-sm text-gray-500 mt-1">oppure clicca per cercare (MP3, WAV, MP4)</p>
            </div>
            
            {audioUrl && !isProcessing && (
              <div className="mt-4 pt-4 border-t border-gray-100 w-full">
                <audio ref={audioRef} src={audioUrl} controls className="w-full h-10" />
              </div>
            )}
          </div>
        </div>

        {/* Output e Status */}
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col relative h-[300px] md:h-auto">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <FileAudio className="w-5 h-5 text-orange-500" />
              Risultato Trascrizione
            </h3>
            
            <div className="flex gap-2">
              <button 
                onClick={downloadText}
                disabled={!transcribedText}
                className="p-2 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 disabled:opacity-50"
                title="Scarica .txt"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <div className="flex-1 bg-gray-50 rounded-2xl p-4 overflow-y-auto text-sm text-gray-700 whitespace-pre-wrap font-mono">
            {isProcessing ? (
              <div className="h-full flex flex-col items-center justify-center text-orange-500 space-y-4">
                <RefreshCw className="w-8 h-8 animate-spin" />
                <p className="font-medium text-center">{statusText}</p>
                {progress > 0 && progress < 100 && (
                  <div className="w-full max-w-xs bg-orange-100 rounded-full h-2.5 overflow-hidden">
                    <div className="bg-orange-500 h-2.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                  </div>
                )}
              </div>
            ) : (
              transcribedText || <span className="text-gray-400 italic">Il testo trascritto apparirà qui...</span>
            )}
          </div>
          
          <div className="mt-4">
            <button
              onClick={saveToSandbox}
              disabled={!transcribedText}
              className="w-full py-3 bg-gray-900 text-white rounded-2xl font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-800 transition-colors"
            >
              Salva nella Sandbox
            </button>
          </div>
        </div>
      </div>
      
    </div>
  );
};
