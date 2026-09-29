import React from 'react';
import { motion } from 'motion/react';
import { X, Check, Mic } from 'lucide-react';

interface VoiceAudioWaveformProps {
  isListening: boolean;
  transcript?: string;
  volume?: number; // 0 to 1
  onCancel: () => void;
  onConfirm: () => void;
  title?: string;
  compact?: boolean;
}

export const VoiceAudioWaveform: React.FC<VoiceAudioWaveformProps> = ({
  isListening,
  transcript = '',
  volume = 0.2,
  onCancel,
  onConfirm,
  title = 'Chelona Voice',
  compact = false
}) => {
  if (!isListening && !transcript) return null;

  // 6 barre verticali per l'onda sonora
  const bars = [0.4, 0.7, 1.0, 0.85, 0.6, 0.35];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.98 }}
      className={`relative w-full rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-[var(--card-bg)] to-indigo-500/10 backdrop-blur-md shadow-lg overflow-hidden flex items-center justify-between gap-3 ${
        compact ? 'p-2.5 sm:p-3' : 'p-3.5 sm:p-4'
      }`}
    >
      {/* Sfondo luminoso animato */}
      <div 
        className="absolute inset-0 bg-gradient-to-r from-amber-500/5 via-rose-500/5 to-indigo-500/5 pointer-events-none animate-pulse"
        style={{ animationDuration: '2.5s' }}
      />

      {/* Sinistra: Visualizzatore onda sonora */}
      <div className="flex items-center gap-3 min-w-0 flex-1 z-10">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center text-white shrink-0 shadow-md shadow-amber-500/20">
          <Mic className="w-4 h-4 animate-pulse" />
        </div>

        {/* Barre dell'onda sonora */}
        <div className="flex items-center gap-1 h-6 shrink-0 px-1">
          {bars.map((mult, idx) => {
            const h = Math.max(6, Math.min(24, volume * 24 * mult));
            return (
              <motion.span
                key={idx}
                animate={{ height: `${h}px` }}
                transition={{ type: 'spring', damping: 15, stiffness: 400 }}
                className="w-1 rounded-full bg-gradient-to-t from-amber-500 via-rose-500 to-indigo-500"
              />
            );
          })}
        </div>

        {/* Testo in tempo reale */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500 font-mono">
              {title}
            </span>
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
          </div>
          <p className="text-xs sm:text-sm font-semibold text-[var(--text-main)] truncate mt-0.5">
            {transcript ? `"${transcript}"` : 'In ascolto, parla pure...'}
          </p>
        </div>
      </div>

      {/* Destra: Azioni Annulla / Invia */}
      <div className="flex items-center gap-1.5 shrink-0 z-10">
        <button
          type="button"
          onClick={onCancel}
          className="p-2 rounded-xl bg-[var(--surface-variant)] hover:bg-rose-500/10 text-[var(--text-muted)] hover:text-rose-500 border border-[var(--border)] transition-all active:scale-95 cursor-pointer"
          title="Annulla registrazione"
        >
          <X className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={onConfirm}
          className="px-3 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white font-bold text-xs shadow-md shadow-amber-500/20 flex items-center gap-1 active:scale-95 transition-all cursor-pointer"
          title="Invia trascrizione"
        >
          <Check className="w-4 h-4 stroke-[2.5]" />
          <span className="hidden sm:inline">Invia</span>
        </button>
      </div>
    </motion.div>
  );
};
