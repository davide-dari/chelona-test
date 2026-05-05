import React, { useState, useMemo } from 'react';
import { Plus, X, MapPin, Calendar, Trash2, Search, Globe, ChevronLeft, Navigation, Flag, Info } from 'lucide-react';
import { TravelModule, Itinerary, Module } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Globe3D } from './Globe3D';
import { WORLD_CITIES } from '../constants/worldCities';
import { generateUUID } from '../utils/uuid';

interface TravelScreenProps {
  module: TravelModule;
  onClose: () => void;
  onUpdate: (module: Module) => void;
}

export const TravelScreen = ({ module, onClose, onUpdate }: TravelScreenProps) => {
  const [isAdding, setIsAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [itinerarySearch, setItinerarySearch] = useState('');
  const [formData, setFormData] = useState<Partial<Itinerary>>({
    date: new Date().toISOString().split('T')[0]
  });

  const filteredCities = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return WORLD_CITIES.filter(c => 
      c.name.toLowerCase().includes(query) || 
      c.country.toLowerCase().includes(query)
    ).slice(0, 5);
  }, [searchQuery]);

  const displayedItineraries = useMemo(() => {
    if (!itinerarySearch.trim()) return module.itineraries || [];
    const query = itinerarySearch.toLowerCase();
    return (module.itineraries || []).filter(it => 
      it.name.toLowerCase().includes(query) || 
      it.city.toLowerCase().includes(query) || 
      it.country.toLowerCase().includes(query)
    );
  }, [module.itineraries, itinerarySearch]);

  const handleAddItinerary = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.city) return;

    const newItinerary: Itinerary = {
      id: generateUUID(),
      name: formData.name,
      placeName: formData.placeName || '',
      city: formData.city,
      country: formData.country || '',
      lat: formData.lat || 0,
      lng: formData.lng || 0,
      date: formData.date || new Date().toISOString().split('T')[0],
      notes: formData.notes
    };

    const updatedModule: TravelModule = {
      ...module,
      itineraries: [...(module.itineraries || []), newItinerary]
    };

    onUpdate(updatedModule);
    setIsAdding(false);
    setFormData({ date: new Date().toISOString().split('T')[0] });
    setSearchQuery('');
  };

  const handleDeleteItinerary = (id: string) => {
    const updatedModule: TravelModule = {
      ...module,
      itineraries: module.itineraries.filter(it => it.id !== id)
    };
    onUpdate(updatedModule);
  };

  return (
    <>
      <div className="fixed inset-0 z-[100] bg-[var(--bg)] flex flex-col pb-[safe-area-inset-bottom]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 sm:p-6 border-b border-[var(--border)] bg-[var(--card-bg)]/80 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={onClose}
            className="p-2.5 hover:bg-[var(--surface-variant)] rounded-2xl text-[var(--text-muted)] transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div>
            <h2 className="text-xl font-black text-[var(--text-main)] tracking-tight">{module.title || 'Viaggi'}</h2>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">
                {module.itineraries?.length || 0} Destinazioni
              </p>
            </div>
          </div>
        </div>
        <div className="p-3 bg-[var(--accent-bg)] rounded-2xl border border-[var(--accent)]/20">
          <Globe className="w-6 h-6 text-[var(--accent)]" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
        {/* Globe Section */}
        <div className="bg-gradient-to-b from-[var(--card-bg)] to-transparent pt-4 overflow-hidden shrink-0 relative">
          <Globe3D itineraries={module.itineraries || []} />
        </div>

        {/* Search & Add Section */}
        <div className="px-4 mt-6 mb-8 max-w-2xl mx-auto w-full flex items-center gap-3 relative z-20">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] group-focus-within:text-[var(--accent)] transition-colors" />
            <input 
              type="text"
              placeholder="Cerca tra i tuoi viaggi..."
              className="w-full pl-11 pr-4 py-4 bg-[var(--card-bg)] border border-[var(--border)] rounded-[2rem] outline-none focus:border-[var(--accent)] transition-all font-bold text-[var(--text-main)] shadow-xl shadow-black/5"
              value={itinerarySearch}
              onChange={e => setItinerarySearch(e.target.value)}
            />
          </div>
          <button 
            onClick={() => setIsAdding(true)}
            className="p-4 bg-gradient-to-tr from-emerald-600 to-emerald-400 text-white rounded-[1.5rem] shadow-xl shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all"
            title="Nuovo Itinerario"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>

        {/* Itineraries List */}
        <div className="px-4 pb-32 max-w-2xl mx-auto w-full relative z-10">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] flex items-center gap-2">
              <Navigation className="w-4 h-4 text-emerald-500" />
              I Tuoi Itinerari {itinerarySearch && `(${displayedItineraries.length})`}
            </h3>
          </div>

          <div className="space-y-4">
            {displayedItineraries.length === 0 ? (
              <div className="py-12 text-center bg-[var(--card-bg)]/50 rounded-[2.5rem] border border-dashed border-[var(--border)]">
                <div className="w-16 h-16 bg-[var(--bg)] rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
                  <MapPin className="w-8 h-8 text-[var(--text-muted)] opacity-30" />
                </div>
                <p className="text-[var(--text-muted)] font-bold text-sm">
                  {itinerarySearch ? 'Nessun risultato trovato.' : 'Nessun itinerario aggiunto.'}
                </p>
                <p className="text-[var(--text-muted)] text-[10px] mt-1 uppercase tracking-widest">
                  {itinerarySearch ? 'Prova a cambiare ricerca' : 'Inizia cliccando il tasto +'}
                </p>
              </div>
            ) : (
              displayedItineraries.map((it) => (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={it.id}
                  className="bg-[var(--card-bg)] p-5 rounded-[2rem] border border-[var(--border)] shadow-sm hover:shadow-md transition-all group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex gap-4">
                      <div className="w-12 h-12 bg-[var(--accent-bg)] rounded-2xl flex items-center justify-center shrink-0 border border-[var(--accent)]/20">
                        <Flag className="w-6 h-6 text-[var(--accent)]" />
                      </div>
                      <div>
                        <h4 className="font-bold text-[var(--text-main)] leading-tight">{it.name}</h4>
                        <div className="flex items-center gap-2 mt-1.5">
                          <div className="flex items-center gap-1 text-[10px] font-bold text-[var(--text-muted)] uppercase bg-[var(--bg)] px-2 py-0.5 rounded-lg border border-[var(--border)]">
                            <MapPin className="w-3 h-3" />
                            {it.city}, {it.country}
                          </div>
                          <div className="flex items-center gap-1 text-[10px] font-bold text-[var(--text-muted)] uppercase bg-[var(--bg)] px-2 py-0.5 rounded-lg border border-[var(--border)]">
                            <Calendar className="w-3 h-3" />
                            {new Date(it.date).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}
                          </div>
                        </div>
                        {it.notes && (
                          <p className="mt-3 text-xs text-[var(--text-muted)] leading-relaxed italic bg-[var(--bg)]/50 p-2.5 rounded-xl border border-[var(--border)]">
                            {it.notes}
                          </p>
                        )}
                      </div>
                    </div>
                    <button 
                      onClick={() => handleDeleteItinerary(it.id)}
                      className="p-2 text-[var(--text-muted)] hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
      
      {/* Add Itinerary Modal */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAdding(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-[var(--card-bg)] border border-[var(--border)] rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-[var(--border)] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                    <Navigation className="w-6 h-6 text-emerald-500" />
                  </div>
                  <h3 className="text-xl font-black text-[var(--text-main)]">Nuovo Itinerario</h3>
                </div>
                <button 
                  onClick={() => setIsAdding(false)}
                  className="p-2 hover:bg-red-500/10 rounded-xl text-[var(--text-muted)] hover:text-red-500 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddItinerary} className="p-6 space-y-5">
                <div>
                  <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1.5 block">Nome Esperienza / Posto</label>
                  <input 
                    type="text" 
                    required
                    placeholder="es. Cena romantica, Visita Museo..."
                    className="w-full p-4 bg-[var(--bg)] border border-[var(--border)] rounded-2xl outline-none focus:border-[var(--accent)] transition-all font-bold text-[var(--text-main)] shadow-inner"
                    value={formData.name || ''}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div className="relative">
                  <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1.5 block">Città / Località</label>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                    <input 
                      type="text" 
                      required
                      placeholder="Cerca città nel mondo..."
                      className="w-full pl-11 pr-4 py-4 bg-[var(--bg)] border border-[var(--border)] rounded-2xl outline-none focus:border-[var(--accent)] transition-all font-bold text-[var(--text-main)] shadow-inner"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                    />
                  </div>
                  
                  <AnimatePresence>
                    {filteredCities.length > 0 && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute top-full left-0 right-0 mt-2 bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl shadow-xl z-50 overflow-hidden"
                      >
                        {filteredCities.map(city => (
                          <button
                            key={`${city.name}-${city.country}`}
                            type="button"
                            onClick={() => {
                              setFormData({ 
                                ...formData, 
                                city: city.name, 
                                country: city.country,
                                lat: city.lat,
                                lng: city.lng
                              });
                              setSearchQuery(`${city.name}, ${city.country}`);
                            }}
                            className="w-full p-4 text-left hover:bg-[var(--bg)] flex items-center justify-between group transition-colors"
                          >
                            <div>
                              <p className="font-bold text-[var(--text-main)]">{city.name}</p>
                              <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{city.country}</p>
                            </div>
                            <MapPin className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--accent)]" />
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1.5 block">Data</label>
                    <input 
                      type="date" 
                      required
                      className="w-full p-4 bg-[var(--bg)] border border-[var(--border)] rounded-2xl outline-none focus:border-[var(--accent)] transition-all font-bold text-[var(--text-main)] shadow-inner"
                      value={formData.date}
                      onChange={e => setFormData({ ...formData, date: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1.5 block">Attrazione (Opzionale)</label>
                    <input 
                      type="text" 
                      placeholder="es. Colosseo"
                      className="w-full p-4 bg-[var(--bg)] border border-[var(--border)] rounded-2xl outline-none focus:border-[var(--accent)] transition-all font-bold text-[var(--text-main)] shadow-inner"
                      value={formData.placeName || ''}
                      onChange={e => setFormData({ ...formData, placeName: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1.5 block">Note / Ricordi</label>
                  <textarea 
                    placeholder="Com'è stato il posto?"
                    className="w-full p-4 bg-[var(--bg)] border border-[var(--border)] rounded-2xl outline-none focus:border-[var(--accent)] transition-all font-bold text-[var(--text-main)] shadow-inner h-24 resize-none"
                    value={formData.notes || ''}
                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full py-5 bg-gradient-to-tr from-[var(--accent)] to-[var(--accent)]/80 text-white rounded-2xl font-black text-lg shadow-xl shadow-[var(--accent)]/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  Salva Itinerario
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
