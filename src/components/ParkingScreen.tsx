import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, MapPin, Navigation, Trash2, Share2, 
  Car, Clock, AlertCircle, RefreshCw, Check, 
  ExternalLink, Compass, ShieldCheck, Timer, Edit3, Camera
} from 'lucide-react';
import { 
  SavedParking, getSavedParking, saveParking, clearSavedParking, 
  autoSaveParking, getCurrentGpsPosition, calculateDistanceMeters, 
  formatDistance, formatElapsedParkingTime, getNavigationUrl, 
  PARKING_EVENT 
} from '../services/parkingService';
import { Share } from '@capacitor/share';

interface ParkingScreenProps {
  onClose: () => void;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const ParkingScreen: React.FC<ParkingScreenProps> = ({ onClose, showToast }) => {
  const [parking, setParking] = useState<SavedParking | null>(() => getSavedParking());
  const [isLoadingGps, setIsLoadingGps] = useState(false);
  const [distanceToCar, setDistanceToCar] = useState<number | null>(null);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesText, setNotesText] = useState('');
  const [expiresMinutes, setExpiresMinutes] = useState<number | null>(null);
  const [now, setNow] = useState<number>(Date.now());

  // Aggiorna contatore tempo ogni 30 secondi
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  // Ascolta aggiornamenti del parcheggio da altri componenti o da Chelona AI
  useEffect(() => {
    const handleUpdate = (e: any) => {
      setParking(e.detail || getSavedParking());
    };
    window.addEventListener(PARKING_EVENT, handleUpdate);
    return () => window.removeEventListener(PARKING_EVENT, handleUpdate);
  }, []);

  // Calcola distanza dall'utente se l'auto è parcheggiata
  useEffect(() => {
    if (!parking) {
      setDistanceToCar(null);
      return;
    }

    getCurrentGpsPosition()
      .then(pos => {
        const dist = calculateDistanceMeters(
          pos.latitude,
          pos.longitude,
          parking.latitude,
          parking.longitude
        );
        setDistanceToCar(dist);
      })
      .catch(err => {
        console.warn('Impossibile calcolare distanza in tempo reale', err);
      });
  }, [parking]);

  // Salva o aggiorna il parcheggio con la posizione GPS attuale
  const handleSaveCurrentPosition = async () => {
    setIsLoadingGps(true);
    try {
      let expiresAt: number | undefined = undefined;
      if (expiresMinutes && expiresMinutes > 0) {
        expiresAt = Date.now() + expiresMinutes * 60 * 1000;
      }

      const saved = await autoSaveParking(notesText, undefined, expiresAt);
      setParking(saved);
      setIsEditingNotes(false);
      if (showToast) {
        showToast('📍 Posizione auto salvata con successo!', 'success');
      }
    } catch (e: any) {
      console.error('Errore GPS parcheggio', e);
      if (showToast) {
        showToast(e.message || 'Errore durante la geolocalizzazione GPS.', 'error');
      }
    } finally {
      setIsLoadingGps(false);
    }
  };

  // Salva solo le note aggiornate
  const handleSaveNotes = () => {
    if (!parking) return;
    const updated: SavedParking = {
      ...parking,
      notes: notesText,
    };
    saveParking(updated);
    setParking(updated);
    setIsEditingNotes(false);
    if (showToast) {
      showToast('Note parcheggio aggiornate', 'success');
    }
  };

  // Rimuove il parcheggio (l'utente ha ripreso l'auto)
  const handleClearParking = () => {
    if (confirm("Hai ripreso l'auto? Rimuovere la posizione salvata?")) {
      clearSavedParking();
      setParking(null);
      setDistanceToCar(null);
      setNotesText('');
      if (showToast) {
        showToast("Posizione parcheggio rimossa.", 'info');
      }
    }
  };

  // Condivisione posizione auto
  const handleShare = async () => {
    if (!parking) return;
    const mapLink = `https://maps.google.com/?q=${parking.latitude},${parking.longitude}`;
    const text = `La mia auto è parcheggiata qui:\n${parking.address || 'Posizione GPS'}\n${parking.notes ? `Note: ${parking.notes}\n` : ''}${mapLink}`;
    
    try {
      await Share.share({
        title: 'Posizione Parcheggio Auto',
        text,
        url: mapLink,
        dialogTitle: 'Condividi Parcheggio',
      });
    } catch {
      // Fallback appunti
      navigator.clipboard.writeText(text);
      if (showToast) showToast('Link parcheggio copiato negli appunti!', 'success');
    }
  };

  // Naviga all'auto
  const handleNavigate = () => {
    if (!parking) return;
    const url = getNavigationUrl(parking.latitude, parking.longitude);
    window.open(url, '_blank');
  };

  // Calcolo tempo residuo disco orario / ticket
  const getTicketStatus = () => {
    if (!parking?.expiresAt) return null;
    const diffMs = parking.expiresAt - now;
    const diffMin = Math.ceil(diffMs / (60 * 1000));

    if (diffMin <= 0) {
      return { expired: true, text: 'Scaduto!' };
    }
    if (diffMin < 60) {
      return { expired: false, text: `Scade tra ${diffMin} min` };
    }
    const h = Math.floor(diffMin / 60);
    const m = diffMin % 60;
    return { expired: false, text: `Scade tra ${h}h ${m}m` };
  };

  const ticketStatus = getTicketStatus();

  return (
    <div className="fixed inset-0 z-[130] bg-[var(--bg)] flex flex-col h-[100dvh] overflow-hidden font-sans transition-colors duration-300">
      {/* HEADER */}
      <header className="h-16 lg:h-20 border-b border-[var(--border)] bg-[var(--header-bg)] backdrop-blur-2xl px-4 lg:px-8 flex items-center justify-between shrink-0 z-20 safe-area-header shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 hover:bg-[var(--surface-variant)] rounded-2xl text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors active:scale-95"
            title="Torna indietro"
          >
            <ArrowLeft className="w-5 h-5 lg:w-6 lg:h-6" />
          </button>

          <div className="w-10 h-10 lg:w-11 lg:h-11 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 p-2 flex items-center justify-center shrink-0 shadow-sm text-indigo-500">
            <Car className="w-6 h-6" />
          </div>

          <div>
            <h2 className="text-base lg:text-lg font-black text-[var(--text-main)] tracking-tight">Salva Parcheggio</h2>
            <p className="text-xs text-[var(--text-muted)] font-medium">Trova la tua auto in un attimo</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {parking && (
            <>
              <button
                onClick={handleShare}
                className="p-2.5 rounded-2xl bg-[var(--surface-variant)] hover:bg-[var(--border)] text-[var(--text-muted)] hover:text-indigo-500 transition-colors border border-[var(--border)] active:scale-95"
                title="Condividi posizione auto"
              >
                <Share2 className="w-5 h-5" />
              </button>

              <button
                onClick={handleClearParking}
                className="p-2.5 rounded-2xl bg-[var(--surface-variant)] hover:bg-rose-500/10 text-[var(--text-muted)] hover:text-rose-500 transition-colors border border-[var(--border)] active:scale-95"
                title="Cancella parcheggio"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </>
          )}
        </div>
      </header>

      {/* CONTENUTO PRINCIPALE */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 lg:p-8 max-w-3xl mx-auto w-full space-y-6 pb-24">
        {parking ? (
          /* SCHERMATA PARCHEGGIO SALVATO */
          <div className="space-y-6">
            {/* ANTEPRIMA MAPPA */}
            <div className="w-full h-64 sm:h-80 rounded-3xl overflow-hidden border border-[var(--border)] shadow-md bg-[var(--surface-variant)] relative group">
              <iframe
                title="Mappa Parcheggio"
                width="100%"
                height="100%"
                frameBorder="0"
                scrolling="no"
                src={`https://maps.google.com/maps?q=${parking.latitude},${parking.longitude}&t=&z=16&ie=UTF8&iwloc=&output=embed`}
                className="w-full h-full border-0 pointer-events-none sm:pointer-events-auto"
              />
              <div className="absolute top-3 left-3 bg-[var(--bg)]/90 backdrop-blur-md border border-[var(--border)] px-3 py-1.5 rounded-full flex items-center gap-2 text-xs font-bold text-indigo-500 shadow-sm pointer-events-none">
                <MapPin className="w-3.5 h-3.5" />
                <span>Posizione Auto</span>
                {parking.accuracy && (
                  <span className="text-[10px] text-[var(--text-muted)] font-mono">
                    ±{Math.round(parking.accuracy)}m
                  </span>
                )}
              </div>
            </div>

            {/* SCHEDA DETTAGLI INDIRIZZO E DISTANZA */}
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-5 lg:p-6 shadow-sm space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[11px] font-bold">
                      Parcheggiata
                    </span>
                    <span className="text-xs text-[var(--text-muted)] font-medium">
                      {formatElapsedParkingTime(parking.timestamp)}
                    </span>
                  </div>
                  <h3 className="text-lg lg:text-xl font-black text-[var(--text-main)] truncate">
                    {parking.address || 'Posizione GPS registrata'}
                  </h3>
                  {parking.city && (
                    <p className="text-xs text-[var(--text-muted)] font-semibold">
                      {parking.city} {parking.cap ? `(${parking.cap})` : ''}
                    </p>
                  )}
                </div>

                {/* Badge distanza live */}
                {distanceToCar !== null && (
                  <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-3 text-center shrink-0">
                    <p className="text-[10px] uppercase font-bold text-indigo-500 tracking-wider">Distanza</p>
                    <p className="text-base lg:text-lg font-black text-indigo-500">
                      {formatDistance(distanceToCar)}
                    </p>
                  </div>
                )}
              </div>

              {/* DISCO ORARIO / SCADENZA PARCHIMETRO SE IMPOSTATO */}
              {ticketStatus && (
                <div className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
                  ticketStatus.expired
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-500'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-500'
                }`}>
                  <div className="flex items-center gap-2.5">
                    <Timer className="w-5 h-5 shrink-0" />
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider">Disco Orario / Sosta</p>
                      <p className="text-xs font-semibold">{ticketStatus.text}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* NOTE DEL PARCHEGGIO (es. Piano, posto, dettagli) */}
              <div className="pt-2 border-t border-[var(--border)]">
                {isEditingNotes ? (
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
                      Note Parcheggio (Piano, Pilastro, Posto)
                    </label>
                    <textarea
                      value={notesText}
                      onChange={(e) => setNotesText(e.target.value)}
                      placeholder="Es. Piano -2, Pilastro D14, vicino all'ascensore..."
                      className="w-full bg-[var(--surface-variant)] border border-[var(--border)] rounded-2xl p-3 text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-indigo-500"
                      rows={2}
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setIsEditingNotes(false)}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-[var(--text-muted)] hover:bg-[var(--surface-variant)]"
                      >
                        Annulla
                      </button>
                      <button
                        onClick={handleSaveNotes}
                        className="px-4 py-2 rounded-xl bg-indigo-500 text-white text-xs font-bold hover:bg-indigo-600 transition-colors shadow-sm"
                      >
                        Salva Note
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <p className="text-[11px] font-bold uppercase text-[var(--text-muted)] tracking-wider">
                        Dettagli & Note
                      </p>
                      <p className="text-sm text-[var(--text-main)] font-medium">
                        {parking.notes || <span className="text-[var(--text-muted)] italic">Nessuna nota (es. piano o pilastro)</span>}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setNotesText(parking.notes || '');
                        setIsEditingNotes(true);
                      }}
                      className="p-2 rounded-xl text-[var(--text-muted)] hover:text-indigo-500 hover:bg-[var(--surface-variant)] transition-colors"
                      title="Modifica note"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* PULSANTI DI AZIONE */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  onClick={handleNavigate}
                  className="py-4 px-6 rounded-2xl bg-indigo-500 hover:bg-indigo-600 active:scale-98 text-white font-bold text-sm flex items-center justify-center gap-2.5 transition-all shadow-lg shadow-indigo-500/25"
                >
                  <Navigation className="w-5 h-5" />
                  <span>Naviga a Piedi all'Auto</span>
                </button>

                <button
                  onClick={handleSaveCurrentPosition}
                  disabled={isLoadingGps}
                  className="py-4 px-6 rounded-2xl bg-[var(--surface-variant)] hover:bg-[var(--border)] active:scale-98 border border-[var(--border)] text-[var(--text-main)] font-bold text-sm flex items-center justify-center gap-2.5 transition-all disabled:opacity-50"
                >
                  <RefreshCw className={`w-5 h-5 text-indigo-500 ${isLoadingGps ? 'animate-spin' : ''}`} />
                  <span>{isLoadingGps ? 'Rilevamento GPS...' : 'Aggiorna Posizione'}</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* NESSUN PARCHEGGIO SALVATO (EMPTY STATE) */
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-6">
            <div className="w-24 h-24 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 shadow-xl shadow-indigo-500/10">
              <Car className="w-12 h-12" />
            </div>

            <div className="space-y-2 max-w-md">
              <h3 className="text-xl lg:text-2xl font-black text-[var(--text-main)]">
                Nessun Parcheggio Salvato
              </h3>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                Salva la posizione con un solo tocco quando parcheggi. Chelona memorizzerà le coordinate GPS esatte e ti mostrerà la mappa per ritrovare l'auto.
              </p>
            </div>

            {/* Note opzionali prima del salvataggio */}
            <div className="w-full max-w-md bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-5 text-left space-y-3">
              <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
                Note Opzionali (Piano, Posto, Pilastro)
              </label>
              <input
                type="text"
                value={notesText}
                onChange={(e) => setNotesText(e.target.value)}
                placeholder="Es. Piano -1, Pilastro B, Strisce blu..."
                className="w-full bg-[var(--surface-variant)] border border-[var(--border)] rounded-2xl p-3 text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-indigo-500"
              />

              <div className="pt-2">
                <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-2">
                  Timer Disco Orario / Parchimetro (Opzionale)
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: 'No timer', val: null },
                    { label: '30 min', val: 30 },
                    { label: '1 ora', val: 60 },
                    { label: '2 ore', val: 120 },
                  ].map(t => (
                    <button
                      key={t.label}
                      type="button"
                      onClick={() => setExpiresMinutes(t.val)}
                      className={`py-2 px-1 text-center rounded-xl border text-xs font-semibold transition-all ${
                        expiresMinutes === t.val
                          ? 'bg-indigo-500 text-white border-indigo-500 shadow-sm'
                          : 'bg-[var(--surface-variant)] text-[var(--text-muted)] hover:text-[var(--text-main)] border-[var(--border)]'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Pulsante Principale di Salvataggio */}
            <div className="w-full max-w-md">
              <button
                onClick={handleSaveCurrentPosition}
                disabled={isLoadingGps}
                className="w-full py-4 px-6 rounded-2xl bg-indigo-500 hover:bg-indigo-600 active:scale-98 text-white font-bold text-base flex items-center justify-center gap-3 transition-all shadow-xl shadow-indigo-500/30 disabled:opacity-50"
              >
                {isLoadingGps ? (
                  <>
                    <RefreshCw className="w-6 h-6 animate-spin" />
                    <span>Acquisizione coordinate GPS in corso...</span>
                  </>
                ) : (
                  <>
                    <MapPin className="w-6 h-6" />
                    <span>Salva Posizione Attuale dell'Auto</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
