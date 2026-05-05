import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Anchor, ArrowLeft, MapPin, Plus, Navigation, Trash2, Map, Edit2, X, MoreVertical } from 'lucide-react';
import { generateUUID } from '../utils/uuid';

interface Address {
  id: string;
  title: string;
  query: string;
}

interface AddressBookScreenProps {
  onClose: () => void;
}

const STORAGE_KEY = 'chelona_address_book';

export const AddressBookScreen = ({ onClose }: AddressBookScreenProps) => {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingAddr, setEditingAddr] = useState<Address | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newQuery, setNewQuery] = useState('');
  
  const [contextMenuId, setContextMenuId] = useState<string | null>(null);
  const pressTimer = useRef<any>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setAddresses(JSON.parse(saved));
    } catch {}
  }, []);

  const saveAddresses = (updated: Address[]) => {
    setAddresses(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const handleAddOrEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newQuery.trim()) return;

    if (editingAddr) {
      const updated = addresses.map(a => a.id === editingAddr.id ? { ...a, title: newTitle.trim(), query: newQuery.trim() } : a);
      saveAddresses(updated);
      setEditingAddr(null);
    } else {
      const updated = [
        { id: generateUUID(), title: newTitle.trim(), query: newQuery.trim() },
        ...addresses
      ];
      saveAddresses(updated);
    }
    
    setIsAdding(false);
    setNewTitle('');
    setNewQuery('');
  };

  const handleDelete = (id: string) => {
    if (confirm('Vuoi davvero eliminare questo indirizzo?')) {
      saveAddresses(addresses.filter(a => a.id !== id));
      setContextMenuId(null);
    }
  };

  const handleNavigate = (query: string) => {
    const mapUrl = `https://maps.google.com/?q=${encodeURIComponent(query)}`;
    window.open(mapUrl, '_blank', 'noopener,noreferrer');
  };

  const handleStartPress = (id: string) => {
    pressTimer.current = setTimeout(() => {
      setContextMenuId(id);
      if (window.navigator.vibrate) window.navigator.vibrate(50);
    }, 600);
  };

  const handleEndPress = () => {
    clearTimeout(pressTimer.current);
  };

  const openEdit = (addr: Address) => {
    setEditingAddr(addr);
    setNewTitle(addr.title);
    setNewQuery(addr.query);
    setIsAdding(true);
    setContextMenuId(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 100 }}
      className="fixed inset-0 z-[200] bg-[var(--bg)] flex flex-col pt-[var(--safe-top)]"
    >
      <header className="flex items-center justify-between px-6 py-5 border-b border-[var(--border)] bg-[var(--header-bg)] backdrop-blur-3xl shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-2.5 bg-[var(--surface-variant)] hover:bg-[var(--border)] rounded-2xl text-[var(--text-main)] transition-all">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-[var(--text-main)] flex items-center gap-2">
              <MapPin className="w-5 h-5 text-emerald-500" />
              Rubrica Indirizzi
            </h2>
            <p className="text-[10px] uppercase font-black tracking-widest text-[var(--text-muted)]">Gestione rapida indirizzi</p>
          </div>
        </div>
        <button
          onClick={() => { setEditingAddr(null); setNewTitle(''); setNewQuery(''); setIsAdding(true); }}
          className="p-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl shadow-lg shadow-emerald-500/20 transition-all font-bold"
        >
          <Plus className="w-5 h-5" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
        {addresses.length === 0 && !isAdding ? (
          <div className="py-20 flex flex-col items-center justify-center text-center">
            <div className="w-24 h-24 bg-[var(--surface-variant)] rounded-full flex items-center justify-center text-[var(--text-muted)] mb-6">
              <Map className="w-12 h-12 opacity-50" />
            </div>
            <h3 className="text-xl font-bold text-[var(--text-main)] mb-2">Nessun Indirizzo</h3>
            <p className="text-[var(--text-muted)] max-w-sm mb-8">
              Tieni premuto su un indirizzo per modificarlo o eliminarlo.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
             <AnimatePresence>
                {addresses.map(addr => (
                  <motion.div
                    key={addr.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    onMouseDown={() => handleStartPress(addr.id)}
                    onMouseUp={handleEndPress}
                    onMouseLeave={handleEndPress}
                    onTouchStart={() => handleStartPress(addr.id)}
                    onTouchEnd={handleEndPress}
                    className={`bg-[var(--card-bg)] border ${contextMenuId === addr.id ? 'border-emerald-500 shadow-emerald-500/10' : 'border-[var(--border)]'} rounded-[2rem] overflow-hidden shadow-sm flex flex-col relative group transition-all`}
                  >
                     {/* iFrame Map Preview */}
                     <div className="w-full h-32 bg-[var(--surface-variant)] relative">
                         <iframe 
                            width="100%" 
                            height="100%" 
                            frameBorder="0" 
                            scrolling="no" 
                            src={`https://maps.google.com/maps?q=${encodeURIComponent(addr.query)}&t=&z=14&ie=UTF8&iwloc=&output=embed`}
                         />
                         <div className="absolute inset-0 bg-transparent" />
                     </div>
                     
                     <div className="p-5 flex-1 flex flex-col">
                        <div className="flex justify-between items-start mb-4">
                           <div className="min-w-0 pr-8">
                             <h4 className="font-bold text-lg text-[var(--text-main)] mb-1 truncate">{addr.title}</h4>
                             <p className="text-xs font-semibold text-[var(--text-muted)] line-clamp-2 leading-relaxed">{addr.query}</p>
                           </div>
                           <button 
                             onClick={(e) => { e.stopPropagation(); setContextMenuId(addr.id === contextMenuId ? null : addr.id); }}
                             className="absolute top-4 right-4 p-2 bg-white/80 backdrop-blur rounded-xl shadow-sm text-[var(--text-muted)] md:opacity-0 group-hover:opacity-100 transition-all"
                           >
                             <MoreVertical className="w-4 h-4" />
                           </button>
                        </div>
                        
                        <div className="mt-auto pt-2">
                           <button
                             onClick={() => handleNavigate(addr.query)}
                             className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] text-white rounded-2xl font-bold tracking-wide flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-500/20"
                           >
                             <Navigation className="w-5 h-5" />
                             Naviga 
                           </button>
                        </div>
                     </div>

                     {/* Context Menu Overlay */}
                     <AnimatePresence>
                        {contextMenuId === addr.id && (
                          <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/40 backdrop-blur-sm z-10 flex items-center justify-center gap-4 p-6"
                          >
                             <button 
                               onClick={() => openEdit(addr)}
                               className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-blue-600 shadow-xl active:scale-90 transition-all"
                             >
                                <Edit2 className="w-6 h-6" />
                             </button>
                             <button 
                               onClick={() => handleDelete(addr.id)}
                               className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-red-600 shadow-xl active:scale-90 transition-all"
                             >
                                <Trash2 className="w-6 h-6" />
                             </button>
                             <button 
                               onClick={() => setContextMenuId(null)}
                               className="absolute top-4 right-4 w-10 h-10 bg-black/20 rounded-full flex items-center justify-center text-white"
                             >
                                <X className="w-5 h-5" />
                             </button>
                          </motion.div>
                        )}
                     </AnimatePresence>
                  </motion.div>
                ))}
             </AnimatePresence>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-[250] flex flex-col justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAdding(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="relative bg-[var(--card-bg)] border-t border-[var(--border)] rounded-t-[2.5rem] p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl"
            >
               <h3 className="text-xl font-bold text-[var(--text-main)] mb-6">
                 {editingAddr ? 'Modifica Indirizzo' : 'Nuovo Indirizzo'}
               </h3>
               <form onSubmit={handleAddOrEdit} className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] block mb-1.5">Titolo</label>
                    <input
                      type="text"
                      value={newTitle}
                      onChange={e => setNewTitle(e.target.value)}
                      placeholder="Es. Casa, Lavoro, Ospedale..."
                      className="w-full p-4 bg-[var(--bg)] border border-[var(--border)] rounded-2xl outline-none focus:border-emerald-500 transition-all font-bold text-[var(--text-main)]"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] block mb-1.5">Indirizzo o Coordinate</label>
                    <input
                      type="text"
                      value={newQuery}
                      onChange={e => setNewQuery(e.target.value)}
                      placeholder="Es. Via Roma 1, Milano"
                      className="w-full p-4 bg-[var(--bg)] border border-[var(--border)] rounded-2xl outline-none focus:border-emerald-500 transition-all font-bold text-[var(--text-main)]"
                    />
                  </div>
                  
                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setIsAdding(false)}
                      className="flex-1 py-4 bg-[var(--surface-variant)] text-[var(--text-main)] rounded-2xl font-bold"
                    >
                      Annulla
                    </button>
                    <button
                      type="submit"
                      disabled={!newTitle.trim() || !newQuery.trim()}
                      className="flex-1 py-4 bg-emerald-500 disabled:opacity-50 text-white rounded-2xl font-bold shadow-lg shadow-emerald-500/20"
                    >
                      {editingAddr ? 'Aggiorna' : 'Salva Indirizzo'}
                    </button>
                  </div>
               </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
