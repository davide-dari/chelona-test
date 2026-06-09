import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FurnitureModule, FurnitureRoom, FurnitureItem } from '../types';
import { ArrowLeft, Plus, Trash2, Link as LinkIcon, Image as ImageIcon, Loader2, Tag, ExternalLink, Armchair, Edit2, X } from 'lucide-react';
import { generateUUID } from '../utils/uuid';
import { CapacitorHttp } from '@capacitor/core';
import { ConfirmDialog } from './ConfirmDialog';

interface FurnitureScreenProps {
  module: FurnitureModule;
  onSave: (m: FurnitureModule) => void;
  onClose: () => void;
}

export const FurnitureScreen = ({ module, onSave, onClose }: FurnitureScreenProps) => {
  const [data, setData] = useState<FurnitureModule>(module);
  const [newRoomName, setNewRoomName] = useState('');
  const [activeRoomId, setActiveRoomId] = useState<string | null>(module.rooms.length > 0 ? module.rooms[0].id : null);
  
  const [newItemLink, setNewItemLink] = useState('');
  const [isScraping, setIsScraping] = useState(false);
  const [deleteItemConfirm, setDeleteItemConfirm] = useState<{ roomId: string; itemId: string } | null>(null);

  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [editingItem, setEditingItem] = useState<{ roomId: string; item: FurnitureItem } | null>(null);

  useEffect(() => {
    if (!activeRoomId && data.rooms.length > 0) {
      setActiveRoomId(data.rooms[0].id);
    }
  }, [data.rooms, activeRoomId]);

  const handleAddRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;
    const newRoom: FurnitureRoom = {
      id: generateUUID(),
      name: newRoomName.trim(),
      items: []
    };
    const updatedData = { ...data, rooms: [...data.rooms, newRoom] };
    setData(updatedData);
    setNewRoomName('');
    setActiveRoomId(newRoom.id);
    onSave(updatedData);
  };

  const handleScrapeAndAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemLink.trim() || !activeRoomId) return;

    let url = newItemLink.trim();
    if (!url.startsWith('http')) url = 'https://' + url;

    setIsScraping(true);
    let title = 'Nuovo Acquisto';
    let image = '';
    let price = '';
    let description = '';

    try {
      const response = await CapacitorHttp.get({ url, headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36' } });
      const html = typeof response.data === 'string' ? response.data : '';

      if (html) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        const metaTitle = doc.querySelector('meta[property="og:title"]')?.getAttribute('content') || doc.querySelector('meta[name="title"]')?.getAttribute('content');
        const titleTag = doc.querySelector('title')?.innerText;
        const amzTitle = doc.querySelector('#productTitle')?.textContent?.trim();
        title = amzTitle || metaTitle || titleTag || url;

        const metaImage = doc.querySelector('meta[property="og:image"]')?.getAttribute('content') || doc.querySelector('meta[name="image"]')?.getAttribute('content');
        const amzImage = doc.querySelector('#landingImage')?.getAttribute('src');
        const ikeaImage = doc.querySelector('.pip-image')?.getAttribute('src');
        image = amzImage || ikeaImage || metaImage || '';

        const metaDesc = doc.querySelector('meta[property="og:description"]')?.getAttribute('content') || doc.querySelector('meta[name="description"]')?.getAttribute('content');
        const amzDesc = doc.querySelector('#feature-bullets')?.textContent?.trim() || doc.querySelector('#productDescription')?.textContent?.trim();
        description = amzDesc || metaDesc || '';

        const ogPrice = doc.querySelector('meta[property="product:price:amount"]')?.getAttribute('content');
        const amzPriceWhole = doc.querySelector('.a-price-whole')?.textContent?.trim()?.replace(/[^0-9,]/g, '');
        const ikeaPrice = doc.querySelector('.pip-temp-price__integer')?.textContent?.trim();
        
        if (ogPrice) price = ogPrice;
        else if (amzPriceWhole) price = amzPriceWhole;
        else if (ikeaPrice) price = ikeaPrice;
        else {
          const genericPrice = html.match(/€\s*([0-9.,]+)/i);
          if (genericPrice) price = genericPrice[1];
        }
      }
    } catch (err) {
      console.error('Scrape failed', err);
    }

    const newItem: FurnitureItem = {
      id: generateUUID(),
      title: title.substring(0, 100) + (title.length > 100 ? '...' : ''),
      description: description.substring(0, 300) + (description.length > 300 ? '...' : ''),
      imageUrl: image,
      price: price,
      link: url
    };

    const updatedRooms = data.rooms.map(r => {
      if (r.id === activeRoomId) {
        return { ...r, items: [newItem, ...r.items] };
      }
      return r;
    });

    const updatedData = { ...data, rooms: updatedRooms };
    setData(updatedData);
    setNewItemLink('');
    setIsScraping(false);
    onSave(updatedData);
  };

  const handleDeleteItem = (roomId: string, itemId: string) => {
    const updatedRooms = data.rooms.map(r => {
      if (r.id === roomId) {
        return { ...r, items: r.items.filter(i => i.id !== itemId) };
      }
      return r;
    });
    const updatedData = { ...data, rooms: updatedRooms };
    setData(updatedData);
    onSave(updatedData);
    setDeleteItemConfirm(null);
    setEditingItem(null);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    const updatedRooms = data.rooms.map(r => {
      if (r.id === editingItem.roomId) {
        return {
          ...r,
          items: r.items.map(i => i.id === editingItem.item.id ? editingItem.item : i)
        };
      }
      return r;
    });

    const updatedData = { ...data, rooms: updatedRooms };
    setData(updatedData);
    onSave(updatedData);
    setEditingItem(null);
  };

  const handleTouchStart = (roomId: string, item: FurnitureItem) => {
    const timer = setTimeout(() => {
      setEditingItem({ roomId, item });
    }, 500);
    setLongPressTimer(timer);
  };

  const handleTouchEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, roomId: string, item: FurnitureItem) => {
    e.preventDefault();
    setEditingItem({ roomId, item });
  };

  const activeRoom = data.rooms.find(r => r.id === activeRoomId);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col h-full w-full max-w-4xl mx-auto bg-[var(--bg)] relative">
      <header className="flex items-center justify-between p-4 lg:p-6 bg-[var(--card-bg)] border-b border-[var(--border)] shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-2 hover:bg-[var(--surface-variant)] rounded-full text-[var(--text-muted)] transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <input
            type="text"
            value={data.title}
            onChange={e => {
              const updated = { ...data, title: e.target.value };
              setData(updated);
              onSave(updated);
            }}
            className="text-xl lg:text-2xl font-bold bg-transparent border-none outline-none text-[var(--text-main)] w-full placeholder:text-[var(--text-muted)]"
            placeholder="Nome Progetto Mobili..."
          />
        </div>
      </header>

      <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
        {/* Sidebar Rooms */}
        <div className="w-full lg:w-64 border-b lg:border-b-0 lg:border-r border-[var(--border)] bg-[var(--surface-variant)] flex flex-col shrink-0">
          <div className="p-4 border-b border-[var(--border)]">
            <form onSubmit={handleAddRoom} className="flex gap-2">
              <input
                type="text"
                placeholder="Nuova Stanza..."
                value={newRoomName}
                onChange={e => setNewRoomName(e.target.value)}
                className="flex-1 min-w-0 bg-[var(--bg)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm outline-none focus:border-teal-500"
              />
              <button type="submit" disabled={!newRoomName.trim()} className="p-2 bg-teal-500 text-white rounded-xl disabled:opacity-50">
                <Plus className="w-5 h-5" />
              </button>
            </form>
          </div>
          <div className="flex-1 overflow-y-auto p-2 flex lg:flex-col gap-2 custom-scrollbar">
            {data.rooms.map(room => (
              <button
                key={room.id}
                onClick={() => setActiveRoomId(room.id)}
                className={`flex-shrink-0 lg:flex-shrink w-auto lg:w-full text-left px-4 py-3 rounded-xl font-bold text-sm transition-all whitespace-nowrap lg:whitespace-normal ${activeRoomId === room.id ? 'bg-teal-500/10 text-teal-600 border border-teal-500/20' : 'text-[var(--text-muted)] hover:bg-[var(--bg)] border border-transparent'}`}
              >
                {room.name} <span className="ml-2 opacity-50 font-normal">({room.items.length})</span>
              </button>
            ))}
            {data.rooms.length === 0 && (
              <p className="p-4 text-sm text-center text-[var(--text-muted)]">Nessuna stanza creata.</p>
            )}
          </div>
        </div>

        {/* Room Content */}
        <div className="flex-1 flex flex-col bg-[var(--bg)] overflow-hidden relative">
          {activeRoom ? (
            <>
              <div className="p-4 lg:p-6 border-b border-[var(--border)] bg-[var(--card-bg)] shadow-sm z-10">
                <form onSubmit={handleScrapeAndAddItem} className="max-w-2xl mx-auto flex flex-col sm:flex-row gap-3 items-center">
                  <div className="relative flex-1 w-full flex items-center">
                    <div className="absolute left-4 text-[var(--text-muted)] pointer-events-none">
                      <LinkIcon className="w-5 h-5" />
                    </div>
                    <input
                      type="url"
                      placeholder="Incolla link prodotto (es. Amazon, IKEA...)"
                      value={newItemLink}
                      onChange={e => setNewItemLink(e.target.value)}
                      className="w-full bg-[var(--surface-variant)] border-2 border-[var(--border)] rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-teal-500 transition-colors text-[var(--text-main)] placeholder:text-[var(--text-muted)] font-medium"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!newItemLink.trim() || isScraping}
                    className="w-full sm:w-auto px-6 py-4 bg-teal-500 hover:bg-teal-600 text-white rounded-2xl font-bold transition-all disabled:opacity-50 disabled:hover:bg-teal-500 flex items-center justify-center gap-2 shrink-0"
                  >
                    {isScraping ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Aggiungi'}
                  </button>
                </form>
              </div>

              <div className="flex-1 overflow-y-auto p-4 lg:p-6 custom-scrollbar">
                {activeRoom.items.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-[var(--text-muted)] text-center px-4">
                    <Armchair className="w-16 h-16 mb-4 opacity-20" />
                    <p className="font-medium text-lg">La stanza è vuota</p>
                    <p className="text-sm mt-2 opacity-70">Incolla un link in alto per aggiungere il primo acquisto!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
                    <AnimatePresence>
                      {activeRoom.items.map(item => (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          onTouchStart={() => handleTouchStart(activeRoom.id, item)}
                          onTouchEnd={handleTouchEnd}
                          onTouchMove={handleTouchEnd}
                          onContextMenu={(e) => handleContextMenu(e, activeRoom.id, item)}
                          className="bg-[var(--card-bg)] border border-[var(--border)] rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all group flex flex-col cursor-pointer select-none"
                        >
                          <div className="h-48 bg-[var(--surface-variant)] flex items-center justify-center overflow-hidden relative">
                            {item.imageUrl ? (
                              <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover pointer-events-none" />
                            ) : (
                              <ImageIcon className="w-12 h-12 text-[var(--text-muted)] opacity-20" />
                            )}
                          </div>
                          
                          <div className="p-4 flex flex-col flex-1">
                            <h4 className="font-bold text-[var(--text-main)] text-sm line-clamp-2 leading-snug mb-1" title={item.title}>
                              {item.title}
                            </h4>
                            {item.description && (
                              <p className="text-xs text-[var(--text-muted)] line-clamp-2 mb-2 flex-1">
                                {item.description}
                              </p>
                            )}
                            
                            <div className="flex items-center justify-between mt-auto pt-3 border-t border-[var(--border)]">
                              <div className="flex items-center gap-1.5 text-teal-600 font-black">
                                <Tag className="w-4 h-4" />
                                <span>{item.price ? `€ ${item.price}` : '---'}</span>
                              </div>
                              <a
                                href={item.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 bg-[var(--surface-variant)] hover:bg-teal-500/10 hover:text-teal-600 rounded-xl transition-colors text-[var(--text-muted)] z-10"
                                onClick={e => e.stopPropagation()}
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-[var(--text-muted)]">
              <p>Seleziona o crea una stanza</p>
            </div>
          )}
        </div>
      </div>

      {/* Edit/Delete Modal */}
      <AnimatePresence>
        {editingItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-[var(--card-bg)] w-full max-w-md rounded-3xl shadow-xl overflow-hidden flex flex-col border border-[var(--border)]"
            >
              <div className="p-4 border-b border-[var(--border)] flex items-center justify-between bg-[var(--surface-variant)]">
                <h3 className="font-bold text-lg text-[var(--text-main)]">Gestisci Elemento</h3>
                <button onClick={() => setEditingItem(null)} className="p-2 text-[var(--text-muted)] hover:bg-[var(--bg)] rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="p-4 flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-bold text-[var(--text-muted)] mb-1 uppercase tracking-wider">Titolo</label>
                  <input
                    type="text"
                    value={editingItem.item.title}
                    onChange={e => setEditingItem({ ...editingItem, item: { ...editingItem.item, title: e.target.value } })}
                    className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm outline-none focus:border-teal-500 text-[var(--text-main)]"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-[var(--text-muted)] mb-1 uppercase tracking-wider">Descrizione</label>
                  <textarea
                    value={editingItem.item.description || ''}
                    onChange={e => setEditingItem({ ...editingItem, item: { ...editingItem.item, description: e.target.value } })}
                    className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm outline-none focus:border-teal-500 text-[var(--text-main)] resize-none h-20 custom-scrollbar"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[var(--text-muted)] mb-1 uppercase tracking-wider">Prezzo (€)</label>
                    <input
                      type="text"
                      value={editingItem.item.price || ''}
                      onChange={e => setEditingItem({ ...editingItem, item: { ...editingItem.item, price: e.target.value } })}
                      className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm outline-none focus:border-teal-500 text-[var(--text-main)]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[var(--text-muted)] mb-1 uppercase tracking-wider">Immagine (URL)</label>
                    <input
                      type="text"
                      value={editingItem.item.imageUrl || ''}
                      onChange={e => setEditingItem({ ...editingItem, item: { ...editingItem.item, imageUrl: e.target.value } })}
                      className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm outline-none focus:border-teal-500 text-[var(--text-main)]"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-4 pt-4 border-t border-[var(--border)]">
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteItemConfirm({ roomId: editingItem.roomId, itemId: editingItem.item.id });
                    }}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl font-bold transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                    Elimina
                  </button>
                  <button
                    type="submit"
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-teal-500 text-white hover:bg-teal-600 rounded-xl font-bold transition-colors"
                  >
                    <Edit2 className="w-5 h-5" />
                    Salva
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {deleteItemConfirm && (
        <ConfirmDialog
          isOpen={true}
          title="Elimina Acquisto"
          message="Sei sicuro di voler rimuovere questo elemento dalla stanza?"
          confirmText="Elimina"
          cancelText="Annulla"
          onConfirm={() => handleDeleteItem(deleteItemConfirm.roomId, deleteItemConfirm.itemId)}
          onCancel={() => setDeleteItemConfirm(null)}
        />
      )}
    </motion.div>
  );
};
