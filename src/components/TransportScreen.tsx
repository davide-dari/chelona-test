import React, { useState, useEffect } from 'react';
import { ArrowLeft, RefreshCw, Bus, MapPin, ExternalLink, Calendar, Info, Clock, DollarSign, Compass, Navigation } from 'lucide-react';
import { TransportModule } from '../types';
import { fetchLiveAeginaTransport, AeginaTransportData, FALLBACK_TRANSPORT_DATA, BusRoute, BusTrip } from '../services/transportParser';

interface TransportScreenProps {
  module: TransportModule;
  onClose: () => void;
  onSave?: (m: TransportModule) => void;
  onDelete?: (id: string) => void;
}

export const TransportScreen = ({ module, onClose, onSave, onDelete }: TransportScreenProps) => {
  const [currentLevel, setCurrentLevel] = useState<'countries' | 'locations' | 'schedule'>('countries');
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  
  // Schedule state
  const [transportData, setTransportData] = useState<AeginaTransportData>(FALLBACK_TRANSPORT_DATA);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'weekdays' | 'weekends'>('weekdays');
  const [selectedRoute, setSelectedRoute] = useState<BusRoute | null>(null);
  const [direction, setDirection] = useState<'departure' | 'return'>('departure');
  const [selectedTrip, setSelectedTrip] = useState<BusTrip | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Carichiamo i dati all'avvio
  useEffect(() => {
    if (selectedLocation === 'aegina') {
      handleRefresh(true); // Carica silenziosamente all'avvio di Egina
    }
  }, [selectedLocation]);

  const handleRefresh = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await fetchLiveAeginaTransport();
      setTransportData(data);
      if (!silent) {
        showToast('Orari aggiornati in tempo reale!', 'success');
      }
      
      // Se c'è una rotta selezionata, aggiorniamo il riferimento con i nuovi dati
      if (selectedRoute) {
        const updatedRoute = data.routes.find(r => r.id === selectedRoute.id);
        if (updatedRoute) {
          setSelectedRoute(updatedRoute);
          // Aggiorna anche il trip selezionato se ce n'era uno
          if (selectedTrip) {
            const trips = direction === 'departure' ? updatedRoute.departureTrips : updatedRoute.returnTrips;
            const updatedTrip = trips.find(t => t.time === selectedTrip.time);
            if (updatedTrip) setSelectedTrip(updatedTrip);
          }
        }
      }
    } catch (e) {
      if (!silent) showToast('Errore di connessione. Usati dati offline.', 'error');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleBack = () => {
    if (selectedRoute) {
      setSelectedRoute(null);
      setSelectedTrip(null);
    } else if (currentLevel === 'schedule') {
      setCurrentLevel('locations');
      setSelectedLocation(null);
    } else if (currentLevel === 'locations') {
      setCurrentLevel('countries');
      setSelectedCountry(null);
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[150] bg-[var(--bg)] flex flex-col h-full font-sans transition-colors duration-300">
      
      {/* Toast interno */}
      {toastMessage && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[200] px-6 py-3 rounded-2xl shadow-xl flex items-center gap-3 border animate-fade-in ${
          toastMessage.includes('Errore') ? 'bg-red-50 border-red-100 text-red-700' : 'bg-green-50 border-green-100 text-green-700'
        }`}>
          <Info className="w-5 h-5" />
          <span className="font-bold text-sm">{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <header className="min-h-16 lg:min-h-20 border-b border-[var(--border)] bg-[var(--header-bg)] backdrop-blur-2xl px-4 flex items-center justify-between shrink-0 sticky top-0 z-20 safe-area-header">
        <div className="flex items-center gap-3">
          <button onClick={handleBack} className="p-2.5 bg-[var(--card-bg)] border border-[var(--border)] hover:bg-[var(--border)] rounded-xl transition-all">
            <ArrowLeft className="w-5 h-5 text-[var(--text-main)]" />
          </button>
          <div className="flex flex-col">
            <h1 className="text-xl lg:text-2xl font-bold text-[var(--text-main)] outline-none">
              {selectedRoute ? selectedRoute.title : selectedLocation === 'aegina' ? 'Egina - Orari Bus KTEL' : 'Trasporti'}
            </h1>
            <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
              {currentLevel === 'countries' && 'Seleziona Paese'}
              {currentLevel === 'locations' && `Paese: ${selectedCountry}`}
              {currentLevel === 'schedule' && !selectedRoute && 'Linee e Tratte'}
              {selectedRoute && `${selectedRoute.dayType === 'weekdays' ? 'Lunedì - Venerdì' : 'Sabato - Domenica'}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {currentLevel === 'schedule' && (
            <button 
              onClick={() => handleRefresh(false)} 
              disabled={loading}
              className="p-2.5 bg-[var(--card-bg)] border border-[var(--border)] hover:bg-[var(--border)] rounded-xl transition-all flex items-center justify-center text-[var(--text-main)] disabled:opacity-50"
              title="Aggiorna Orari"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin text-cyan-500' : ''}`} />
            </button>
          )}
          {onDelete && (
            <button 
              onClick={() => { if(window.confirm('Eliminare definitivamente questa sezione trasporti?')) { onDelete(module.id); onClose(); } }}
              className="p-2.5 text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
              title="Elimina Modulo"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
          )}
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 overflow-y-auto w-full max-w-2xl mx-auto p-4 custom-scrollbar">
        
        {/* LIVELLO 1: PAESI */}
        {currentLevel === 'countries' && (
          <div className="space-y-6 fade-in">
            <h3 className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-wider text-center py-2">Seleziona un Paese per visualizzare i trasporti</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button 
                onClick={() => { setSelectedCountry('Grecia'); setCurrentLevel('locations'); }}
                className="flex items-center gap-5 p-6 bg-[var(--card-bg)] hover:bg-[var(--surface-variant)] border border-[var(--border)] hover:border-cyan-500/50 rounded-[2rem] text-left transition-all active:scale-[0.98] group shadow-sm"
              >
                <span className="text-4xl">🇬🇷</span>
                <div className="flex-1 min-w-0">
                  <h4 className="font-black text-lg text-[var(--text-main)] group-hover:text-cyan-500 transition-colors">Grecia</h4>
                  <p className="text-xs text-[var(--text-muted)] mt-1">Orari bus locali, traghetti e fermate GPS.</p>
                </div>
                <ChevronRight className="w-5 h-5 text-[var(--text-muted)] group-hover:translate-x-1 transition-transform shrink-0" />
              </button>

              <div 
                className="flex items-center gap-5 p-6 bg-[var(--card-bg)]/40 border border-dashed border-[var(--border)] rounded-[2rem] text-left opacity-60 cursor-not-allowed"
              >
                <span className="text-4xl filter grayscale">🇮🇹</span>
                <div className="flex-1 min-w-0">
                  <h4 className="font-black text-lg text-[var(--text-muted)]">Italia</h4>
                  <p className="text-xs text-[var(--text-muted)] mt-1">Altre destinazioni in arrivo nei prossimi aggiornamenti.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* LIVELLO 2: LOCALITA' (GRECIA) */}
        {currentLevel === 'locations' && selectedCountry === 'Grecia' && (
          <div className="space-y-6 fade-in">
            <h3 className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-wider text-center py-2">Seleziona una località</h3>
            <div className="grid grid-cols-1 gap-4">
              <button 
                onClick={() => { setSelectedLocation('aegina'); setCurrentLevel('schedule'); }}
                className="flex flex-col sm:flex-row gap-5 p-6 bg-[var(--card-bg)] hover:bg-[var(--surface-variant)] border border-[var(--border)] hover:border-cyan-500/50 rounded-[2rem] text-left transition-all active:scale-[0.98] group shadow-sm"
              >
                <div className="w-full sm:w-28 aspect-[1.5] sm:aspect-square rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-800 flex items-center justify-center text-white shrink-0 relative overflow-hidden">
                  <span className="text-4xl relative z-10">🏝️</span>
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_20%,_rgba(0,0,0,0.4)_100%)]" />
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <h4 className="font-black text-xl text-[var(--text-main)] group-hover:text-cyan-500 transition-colors">Egina (Aegina)</h4>
                  <p className="text-xs text-[var(--text-muted)] mt-1.5 leading-relaxed">
                    Orari e fermate della rete bus KTEL Aegina. Linee per Perdika, Agia Marina, Tempio di Afaia, Souvala, Vagia e Monastero di San Nettario.
                  </p>
                </div>
                <div className="self-center shrink-0 hidden sm:block">
                  <ChevronRight className="w-6 h-6 text-[var(--text-muted)] group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            </div>
          </div>
        )}

        {/* LIVELLO 3: SCHERMO ORARI E LINEE (EGINA) */}
        {currentLevel === 'schedule' && selectedLocation === 'aegina' && !selectedRoute && (
          <div className="space-y-6 fade-in">
            
            {/* Banner info agg */}
            <div className="bg-[var(--card-bg)] rounded-[2rem] border border-[var(--border)] p-5 flex items-center justify-between shadow-sm relative overflow-hidden">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-cyan-500/10 border border-cyan-500/20 rounded-xl flex items-center justify-center text-cyan-500 shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-[var(--text-main)] uppercase tracking-wide">Orari Ufficiali KTEL</h4>
                  <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Aggiornati al: <span className="font-bold text-[var(--text-main)]">{transportData.lastUpdated}</span></p>
                </div>
              </div>
              <button 
                onClick={() => handleRefresh(false)}
                disabled={loading}
                className="text-xs font-bold bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-600 border border-cyan-500/20 px-3.5 py-2 rounded-xl transition-all active:scale-95"
              >
                Aggiorna Ora
              </button>
            </div>

            {/* Tab weekdays / weekends */}
            <div className="flex bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-1 shrink-0">
              <button
                onClick={() => setActiveTab('weekdays')}
                className={`flex-1 py-3 text-center text-xs font-black uppercase tracking-wider rounded-xl transition-all ${
                  activeTab === 'weekdays' ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                Lunedì - Venerdì
              </button>
              <button
                onClick={() => setActiveTab('weekends')}
                className={`flex-1 py-3 text-center text-xs font-black uppercase tracking-wider rounded-xl transition-all ${
                  activeTab === 'weekends' ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                Sabato - Domenica
              </button>
            </div>

            {/* Lista Rotte */}
            <div className="space-y-3">
              <h3 className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest px-2">Linee Disponibili</h3>
              {transportData.routes
                .filter(r => r.dayType === activeTab)
                .map((route) => (
                  <button
                    key={route.id}
                    onClick={() => { setSelectedRoute(route); setSelectedTrip(null); }}
                    className="w-full flex items-center justify-between p-5 bg-[var(--card-bg)] hover:bg-[var(--surface-variant)] border border-[var(--border)] hover:border-cyan-500/40 rounded-[2rem] text-left transition-all group shadow-sm active:scale-[0.99]"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-11 h-11 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 flex items-center justify-center shrink-0">
                        <Bus className="w-5 h-5 group-hover:scale-110 transition-transform" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-sm text-[var(--text-main)] truncate">{route.title}</h4>
                        <div className="flex items-center gap-x-2 mt-1 flex-wrap text-[10px] text-[var(--text-muted)]">
                          <span>{route.departureTimes.length} corse andata</span>
                          <span>•</span>
                          <span>{route.returnTimes.length} corse ritorno</span>
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-[var(--text-muted)] group-hover:translate-x-1 transition-transform shrink-0" />
                  </button>
              ))}
            </div>

            {/* Info addizionali stazioni */}
            <div className="bg-[var(--card-bg)]/60 rounded-[2.5rem] border border-[var(--border)] p-6 space-y-4">
              <h4 className="text-xs font-black text-[var(--text-main)] uppercase tracking-wider flex items-center gap-2">
                <Info className="w-4 h-4 text-cyan-500" /> Informazioni Utili
              </h4>
              <div className="space-y-3 text-xs leading-relaxed text-[var(--text-muted)]">
                <p>
                  🎟️ <strong>Biglietti:</strong> Il costo del biglietto varia tra 1.80€ e 2.00€ a seconda della tratta. I biglietti possono essere acquistati al capolinea di Egina Town o direttamente a bordo dell'autobus.
                </p>
                <p>
                  📍 <strong>Stazione Principale:</strong> Si trova proprio di fronte al porto di Egina Town, a sinistra dell'uscita dei traghetti. Da lì partono tutte le linee.
                </p>
                <p>
                  ⚠️ <strong>Orari:</strong> Gli orari possono subire variazioni stagionali o a causa del traffico. Clicca sul tasto di aggiornamento in alto per scaricare le ultime tabelle caricate in tempo reale dal portale ufficiale.
                </p>
              </div>
            </div>

          </div>
        )}

        {/* LIVELLO 4: DETTAGLIO ROTTA SELEZIONATA (ORARI E MAPPE) */}
        {currentLevel === 'schedule' && selectedRoute && (
          <div className="space-y-6 fade-in pb-20">
            
            {/* Selettore direzione */}
            <div className="flex bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-1 shrink-0">
              <button
                onClick={() => { setDirection('departure'); setSelectedTrip(null); }}
                className={`flex-1 py-3 text-center text-xs font-black uppercase tracking-wider rounded-xl transition-all ${
                  direction === 'departure' ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                Andata (Da Egina)
              </button>
              <button
                onClick={() => { setDirection('return'); setSelectedTrip(null); }}
                className={`flex-1 py-3 text-center text-xs font-black uppercase tracking-wider rounded-xl transition-all ${
                  direction === 'return' ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                Ritorno (A Egina)
              </button>
            </div>

            {/* Tabella Orari in griglia */}
            <div className="bg-[var(--card-bg)] rounded-[2.5rem] border border-[var(--border)] p-6 shadow-sm">
              <h3 className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest mb-4">
                Seleziona un orario per vedere la fermata
              </h3>
              
              {((direction === 'departure' ? selectedRoute.departureTimes : selectedRoute.returnTimes).length === 0) ? (
                <div className="text-center py-6 text-xs text-[var(--text-muted)] font-bold">
                  Nessuna corsa programmata per questa direzione.
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2.5">
                  {(direction === 'departure' ? selectedRoute.departureTrips : selectedRoute.returnTrips).map((trip) => {
                    const isSelected = selectedTrip?.time === trip.time;
                    return (
                      <button
                        key={trip.time}
                        onClick={() => setSelectedTrip(trip)}
                        className={`py-3 rounded-2xl border text-xs font-black tracking-wider transition-all active:scale-95 ${
                          isSelected 
                            ? 'bg-gradient-to-tr from-cyan-500 to-blue-500 text-white border-cyan-400 shadow-md shadow-cyan-500/20' 
                            : 'bg-[var(--bg)] text-[var(--text-main)] border-[var(--border)] hover:border-cyan-500/40'
                        }`}
                      >
                        {trip.time}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Dettagli della corsa selezionata */}
            {selectedTrip && (
              <div className="space-y-4 fade-in">
                <h3 className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest px-2">Dettagli ed Indicazioni Stradali</h3>
                
                <div className="bg-[var(--card-bg)] rounded-[2.5rem] border border-[var(--border)] p-6 space-y-6 shadow-md">
                  
                  {/* Tracciato fermate */}
                  <div className="relative pl-6 space-y-6">
                    {/* Linea verticale */}
                    <div className="absolute top-2.5 bottom-2.5 left-2 w-0.5 bg-gradient-to-b from-cyan-500 to-blue-500" />
                    
                    {/* Partenza */}
                    <div className="relative">
                      <div className="absolute -left-5 top-1 w-2.5 h-2.5 rounded-full bg-cyan-500 border-2 border-white ring-4 ring-cyan-500/20" />
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h4 className="text-[10px] font-black text-cyan-500 uppercase tracking-wider leading-none">Partenza ({selectedTrip.time})</h4>
                          <h5 className="font-bold text-xs text-[var(--text-main)] mt-1.5 leading-tight">{selectedTrip.originStop.name}</h5>
                          <p className="text-[10px] text-[var(--text-muted)] mt-1 leading-relaxed">{selectedTrip.originStop.description}</p>
                        </div>
                        <a 
                          href={selectedTrip.originStop.mapsUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 text-[10px] font-black bg-[var(--bg)] hover:bg-[var(--border)] text-cyan-600 px-2.5 py-1.5 rounded-lg border border-[var(--border)] transition-colors shrink-0"
                        >
                          <MapPin className="w-3.5 h-3.5" /> Mappa
                        </a>
                      </div>
                    </div>

                    {/* Arrivo */}
                    <div className="relative">
                      <div className="absolute -left-5 top-1 w-2.5 h-2.5 rounded-full bg-blue-500 border-2 border-white ring-4 ring-blue-500/20" />
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-wider leading-none">Arrivo</h4>
                          <h5 className="font-bold text-xs text-[var(--text-main)] mt-1.5 leading-tight">{selectedTrip.destinationStop.name}</h5>
                          <p className="text-[10px] text-[var(--text-muted)] mt-1 leading-relaxed">{selectedTrip.destinationStop.description}</p>
                        </div>
                        <a 
                          href={selectedTrip.destinationStop.mapsUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 text-[10px] font-black bg-[var(--bg)] hover:bg-[var(--border)] text-cyan-600 px-2.5 py-1.5 rounded-lg border border-[var(--border)] transition-colors shrink-0"
                        >
                          <MapPin className="w-3.5 h-3.5" /> Mappa
                        </a>
                      </div>
                    </div>

                  </div>

                  <hr className="border-[var(--border)]" />

                  {/* Info di viaggio */}
                  <div className="grid grid-cols-2 gap-4 bg-[var(--bg)] p-4 rounded-2xl border border-[var(--border)]">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-600 flex items-center justify-center shrink-0">
                        <Clock className="w-4.5 h-4.5" />
                      </div>
                      <div>
                        <p className="text-[9px] uppercase font-black text-[var(--text-muted)] tracking-wider leading-none">Durata Appross.</p>
                        <p className="text-xs font-bold text-[var(--text-main)] mt-1 leading-none">{selectedTrip.duration}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                        <DollarSign className="w-4.5 h-4.5" />
                      </div>
                      <div>
                        <p className="text-[9px] uppercase font-black text-[var(--text-muted)] tracking-wider leading-none">Prezzo indicativo</p>
                        <p className="text-xs font-bold text-[var(--text-main)] mt-1 leading-none">{selectedTrip.price}</p>
                      </div>
                    </div>
                  </div>

                  {/* Pulsante Navigazione Maps */}
                  <a 
                    href={selectedTrip.directionsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-tr from-cyan-500 to-blue-500 text-white py-4 rounded-2xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-cyan-500/20 active:scale-[0.98] hover:brightness-110 transition-all text-center"
                  >
                    <Navigation className="w-4 h-4 shrink-0" />
                    Ottieni Indicazioni su Google Maps
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                  </a>

                </div>
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
};

// Funzione interna per generare un loader
const ChevronRightIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
);
