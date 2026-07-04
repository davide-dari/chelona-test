import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Plus, Trash2, CreditCard, QrCode, Type, Palette, Maximize, X } from 'lucide-react';
import Barcode from 'react-barcode';
import { QRCodeSVG } from 'qrcode.react';
import { FidelityModule, FidelityCard } from '../types';

interface FidelityScreenProps {
  module: FidelityModule;
  onClose: () => void;
  onSave: (module: FidelityModule) => void;
}

const COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', 
  '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef', '#1e293b'
];

const FORMATS: { value: FidelityCard['format'], label: string }[] = [
  { value: 'EAN13', label: 'EAN-13 (Classico Supermercato)' },
  { value: 'CODE128', label: 'CODE-128 (Universale)' },
  { value: 'CODE39', label: 'CODE-39 (Alfanumerico)' },
  { value: 'EAN8', label: 'EAN-8 (Corto)' },
  { value: 'UPC', label: 'UPC (Formato Americano)' },
  { value: 'QR', label: 'QR Code' }
];

export function FidelityScreen({ module, onClose, onSave }: FidelityScreenProps) {
  const [view, setView] = useState<'list' | 'add' | 'view'>('list');
  const [selectedCard, setSelectedCard] = useState<FidelityCard | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [format, setFormat] = useState<FidelityCard['format']>('EAN13');
  const [color, setColor] = useState(COLORS[0]);

  const cards = module.cards || [];

  const handleSaveCard = () => {
    if (!name.trim() || !code.trim()) return;
    
    const newCard: FidelityCard = {
      id: crypto.randomUUID(),
      name: name.trim(),
      code: code.trim().toUpperCase(),
      format,
      color
    };

    onSave({
      ...module,
      cards: [...cards, newCard]
    });

    setView('list');
    setName('');
    setCode('');
    setFormat('EAN13');
    setColor(COLORS[0]);
  };

  const handleDeleteCard = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (confirm('Vuoi davvero eliminare questa carta?')) {
      onSave({
        ...module,
        cards: cards.filter(c => c.id !== id)
      });
      if (selectedCard?.id === id) {
        setView('list');
      }
    }
  };

  const renderBarcode = (card: FidelityCard) => {
    if (card.format === 'QR') {
      return (
        <div className="bg-white p-4 rounded-xl shadow-sm inline-block">
          <QRCodeSVG value={card.code} size={200} level="H" />
        </div>
      );
    }

    return (
      <div className="bg-white px-6 py-4 rounded-xl shadow-sm inline-block overflow-hidden max-w-full">
        <Barcode 
          value={card.code} 
          format={card.format}
          width={2.5}
          height={100}
          displayValue={true}
          background="#ffffff"
          lineColor="#000000"
          margin={0}
        />
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[150] bg-[var(--bg)] flex flex-col h-[100dvh] overflow-hidden font-sans">
      <div className="h-20 border-b border-[var(--border)] bg-[var(--header-bg)] backdrop-blur-2xl px-6 flex items-center justify-between shrink-0 z-20 safe-area-header">
        <div className="flex flex-col">
          <h2 className="text-xl font-black text-[var(--text-main)] truncate max-w-[200px] sm:max-w-[300px]">
            {view === 'add' ? 'Nuova Carta' : view === 'view' ? selectedCard?.name : module.title || 'Carte Fedeltà'}
          </h2>
          <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
            {view === 'list' ? `${cards.length} Carte Salvate` : view === 'view' ? 'Scansiona alla cassa' : 'Aggiunta manuale'}
          </span>
        </div>
        
        {view === 'list' ? (
          <button
            onClick={onClose}
            className="w-10 h-10 bg-[var(--surface-variant)] hover:bg-[var(--border)] rounded-full flex items-center justify-center transition-all active:scale-95"
          >
            <X className="w-5 h-5 text-[var(--text-main)]" />
          </button>
        ) : (
          <button
            onClick={() => setView('list')}
            className="px-4 py-2 bg-[var(--surface-variant)] hover:bg-[var(--border)] text-[var(--text-main)] rounded-xl font-bold text-sm transition-all active:scale-95 flex items-center gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Chiudi
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden safe-area-bottom">
        <AnimatePresence mode="wait">
          {view === 'list' && (
            <motion.div
              key="list"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-6 max-w-4xl mx-auto flex flex-col gap-6"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <button
                  onClick={() => setView('add')}
                  className="h-40 border-2 border-dashed border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--accent-hover)]/5 rounded-3xl flex flex-col items-center justify-center gap-3 transition-all active:scale-95 group"
                >
                  <div className="w-12 h-12 rounded-full bg-[var(--surface-variant)] group-hover:bg-[var(--accent)] flex items-center justify-center transition-colors">
                    <Plus className="w-6 h-6 text-[var(--text-main)] group-hover:text-white" />
                  </div>
                  <span className="font-bold text-[var(--text-main)]">Aggiungi Carta</span>
                </button>

                {cards.map((card) => (
                  <motion.div
                    key={card.id}
                    layoutId={`card-${card.id}`}
                    onClick={() => {
                      setSelectedCard(card);
                      setView('view');
                    }}
                    style={{ backgroundColor: card.color }}
                    className="h-40 rounded-3xl p-6 flex flex-col justify-between cursor-pointer active:scale-95 transition-transform shadow-lg relative overflow-hidden group"
                  >
                    <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => handleDeleteCard(card.id, e)}
                        className="w-8 h-8 bg-black/20 hover:bg-black/40 rounded-full flex items-center justify-center backdrop-blur-sm transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-white" />
                      </button>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                        {card.format === 'QR' ? (
                          <QrCode className="w-5 h-5 text-white" />
                        ) : (
                          <CreditCard className="w-5 h-5 text-white" />
                        )}
                      </div>
                      <h3 className="font-black text-white text-xl truncate pr-8">{card.name}</h3>
                    </div>

                    <div>
                      <div className="bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-lg inline-flex items-center gap-2">
                        <span className="text-white/80 text-xs font-bold font-mono uppercase tracking-widest">{card.code}</span>
                      </div>
                    </div>
                    
                    {/* Decorative reflection */}
                    <div className="absolute -inset-1/2 bg-gradient-to-br from-white/20 to-transparent rotate-45 pointer-events-none transform -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {view === 'add' && (
            <motion.div
              key="add"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="p-6 max-w-xl mx-auto flex flex-col gap-6"
            >
              <div className="bg-[var(--card-bg)] rounded-3xl border border-[var(--border)] p-6 space-y-6">
                <div>
                  <label className="flex items-center gap-2 text-sm font-bold text-[var(--text-main)] mb-2">
                    <Type className="w-4 h-4 text-[var(--accent)]" />
                    Nome Negozio / Carta
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Es. Esselunga, IKEA, Palestra"
                    className="w-full bg-[var(--bg)] border border-[var(--border)] text-[var(--text-main)] rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] font-medium"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-bold text-[var(--text-main)] mb-2">
                    <QrCode className="w-4 h-4 text-[var(--accent)]" />
                    Codice Carta
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="Il numero sotto il codice a barre"
                    className="w-full bg-[var(--bg)] border border-[var(--border)] text-[var(--text-main)] rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] font-mono uppercase font-bold"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-bold text-[var(--text-main)] mb-2">
                    Formato Codice
                  </label>
                  <select
                    value={format}
                    onChange={(e) => setFormat(e.target.value as any)}
                    className="w-full bg-[var(--bg)] border border-[var(--border)] text-[var(--text-main)] rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] font-medium"
                  >
                    {FORMATS.map(f => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-bold text-[var(--text-main)] mb-3">
                    <Palette className="w-4 h-4 text-[var(--accent)]" />
                    Colore Carta
                  </label>
                  <div className="flex flex-wrap gap-3">
                    {COLORS.map(c => (
                      <button
                        key={c}
                        onClick={() => setColor(c)}
                        style={{ backgroundColor: c }}
                        className={`w-10 h-10 rounded-full transition-transform active:scale-90 ${color === c ? 'ring-4 ring-[var(--bg)] ring-offset-2 ring-offset-[var(--text-main)] scale-110' : ''}`}
                      />
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-[var(--border)]">
                  <button
                    onClick={handleSaveCard}
                    disabled={!name.trim() || !code.trim()}
                    className="w-full py-4 bg-[var(--accent)] text-white rounded-2xl font-black text-sm uppercase tracking-widest disabled:opacity-50 transition-all hover:bg-[var(--accent-hover)] active:scale-95 shadow-lg shadow-[var(--accent)]/20"
                  >
                    Salva Carta
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {view === 'view' && selectedCard && (
            <motion.div
              key="view"
              layoutId={`card-${selectedCard.id}`}
              style={{ backgroundColor: selectedCard.color }}
              className="min-h-full flex flex-col p-6 items-center justify-center relative overflow-hidden"
            >
              <div className="w-full max-w-sm flex flex-col items-center z-10">
                <div className="bg-white/20 backdrop-blur-md rounded-3xl p-8 w-full flex flex-col items-center gap-8 shadow-2xl border border-white/30">
                  <div className="text-center">
                    <h2 className="text-3xl font-black text-white mb-2">{selectedCard.name}</h2>
                    <p className="text-white/80 font-mono font-bold tracking-widest bg-black/20 px-4 py-1.5 rounded-full inline-block">
                      {selectedCard.code}
                    </p>
                  </div>

                  <div className="bg-white rounded-2xl p-4 w-full flex items-center justify-center shadow-inner overflow-hidden">
                    {/* The actual barcode */}
                    {renderBarcode(selectedCard)}
                  </div>
                  
                  <div className="flex items-center gap-2 text-white/60 text-xs font-bold uppercase tracking-wider">
                    <Maximize className="w-4 h-4" />
                    Luminosità Schermo Massima
                  </div>
                </div>
              </div>

              {/* Decorative elements */}
              <div className="absolute top-1/4 -right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-1/4 -left-20 w-80 h-80 bg-black/10 rounded-full blur-3xl pointer-events-none" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
