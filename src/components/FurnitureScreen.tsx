import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FurnitureModule, FurnitureRoom, FurnitureItem } from '../types';
import { 
  ArrowLeft, Plus, Trash2, Link as LinkIcon, Image as ImageIcon, Loader2, 
  Tag, ExternalLink, Armchair, Edit2, X, Compass, RotateCw, Sparkles, 
  Utensils, Tv, Bed, Bath, Layers, Grid, Sliders, Settings, Info,
  HelpCircle, Trash, Download, FileText
} from 'lucide-react';
import { generateUUID } from '../utils/uuid';
import { CapacitorHttp } from '@capacitor/core';
import { ConfirmDialog } from './ConfirmDialog';

interface FurnitureScreenProps {
  module: FurnitureModule;
  onSave: (m: FurnitureModule) => void;
  onClose: () => void;
}

const CATEGORIES = [
  "Sedie & Poltrone",
  "Tavoli & Scrivanie",
  "Letti & Materassi",
  "Contenitori & Armadi",
  "Elettrodomestici",
  "Illuminazione",
  "Decorazioni & Tessili",
  "Altro"
];

const CATEGORY_COLORS: Record<string, string> = {
  "Sedie & Poltrone": "#3b82f6", // Blue
  "Tavoli & Scrivanie": "#0d9488", // Teal
  "Letti & Materassi": "#f59e0b", // Amber
  "Contenitori & Armadi": "#8b5cf6", // Purple
  "Elettrodomestici": "#ef4444", // Red
  "Illuminazione": "#ec4899", // Pink
  "Decorazioni & Tessili": "#10b981", // Green
  "Altro": "#64748b" // Slate
};

const CATEGORY_DEFAULTS: Record<string, { w: number; d: number; h: number }> = {
  "Sedie & Poltrone": { w: 60, d: 60, h: 85 },
  "Tavoli & Scrivanie": { w: 120, d: 80, h: 75 },
  "Letti & Materassi": { w: 160, d: 200, h: 50 },
  "Contenitori & Armadi": { w: 100, d: 60, h: 200 },
  "Elettrodomestici": { w: 60, d: 60, h: 85 },
  "Illuminazione": { w: 30, d: 30, h: 150 },
  "Decorazioni & Tessili": { w: 40, d: 10, h: 40 },
  "Altro": { w: 50, d: 50, h: 50 }
};

const ROOM_TYPES = [
  { name: 'Cucina', icon: Utensils, color: 'text-orange-500 bg-orange-500/10' },
  { name: 'Salone', icon: Tv, color: 'text-indigo-500 bg-indigo-500/10' },
  { name: 'Camera da letto', icon: Bed, color: 'text-rose-500 bg-rose-500/10' },
  { name: 'Bagno', icon: Bath, color: 'text-blue-500 bg-blue-500/10' },
  { name: 'Altro', icon: Armchair, color: 'text-teal-500 bg-teal-500/10' }
];

const guessCategory = (title: string, desc: string): string => {
  const text = `${title} ${desc}`.toLowerCase();
  if (/sedia|sedie|poltron|chair|armchair|sgabell|stool/i.test(text)) return "Sedie & Poltrone";
  if (/tavolo|tavoli|table|scrivani|desk|consolle/i.test(text)) return "Tavoli & Scrivanie";
  if (/letto|letti|bed|materass|mattress|comodin|nightstand/i.test(text)) return "Letti & Materassi";
  if (/armadio|guardaroba|wardrobe|cassett|dresser|credenza|scaffal|libreri|cabinet|chest/i.test(text)) return "Contenitori & Armadi";
  if (/frigo|forno|microonde|lavatric|lavastovigli|tv|television|asciugatric/i.test(text)) return "Elettrodomestici";
  if (/lampad|lamp|luce|luci|light|lampadario|faretto|applique/i.test(text)) return "Illuminazione";
  if (/specchio|mirror|quadro|tappet|rug|tenda|curtain|vaso|cuscin|pillow|poster|piant|plant/i.test(text)) return "Decorazioni & Tessili";
  return "Altro";
};

const parseDimensions = (text: string): { width?: number; depth?: number; height?: number } => {
  // Matches e.g. 120 x 60 x 75 cm, 120x60x75cm, etc.
  const regex3D = /(\d+(?:[.,]\d+)?)\s*(?:x|×|X)\s*(\d+(?:[.,]\d+)?)\s*(?:x|×|X)\s*(\d+(?:[.,]\d+)?)\s*(?:cm|mm|m)?/i;
  const match3D = text.match(regex3D);
  if (match3D) {
    let w = parseFloat(match3D[1].replace(',', '.'));
    let d = parseFloat(match3D[2].replace(',', '.'));
    let h = parseFloat(match3D[3].replace(',', '.'));
    // If unit is meters
    if (text.includes(match3D[0]) && /[^c]m/i.test(match3D[0])) {
      w *= 100;
      d *= 100;
      h *= 100;
    } else if (text.includes(match3D[0]) && /mm/i.test(match3D[0])) {
      w /= 10;
      d /= 10;
      h /= 10;
    }
    return { width: Math.round(w), depth: Math.round(d), height: Math.round(h) };
  }

  // Matches 2D dimensions like 120x60 cm
  const regex2D = /(\d+(?:[.,]\d+)?)\s*(?:x|×|X)\s*(\d+(?:[.,]\d+)?)\s*(?:cm|mm|m)?/i;
  const match2D = text.match(regex2D);
  if (match2D) {
    let w = parseFloat(match2D[1].replace(',', '.'));
    let d = parseFloat(match2D[2].replace(',', '.'));
    if (text.includes(match2D[0]) && /[^c]m/i.test(match2D[0])) {
      w *= 100;
      d *= 100;
    } else if (text.includes(match2D[0]) && /mm/i.test(match2D[0])) {
      w /= 10;
      d /= 10;
    }
    return { width: Math.round(w), depth: Math.round(d) };
  }

  return {};
};

export const FurnitureScreen = ({ module, onSave, onClose }: FurnitureScreenProps) => {
  const [data, setData] = useState<FurnitureModule>(module);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(module.rooms.length > 0 ? module.rooms[0].id : null);
  
  // Scraper State
  const [newItemLink, setNewItemLink] = useState('');
  const [isScraping, setIsScraping] = useState(false);

  // Category Filtering
  const [activeCategory, setActiveCategory] = useState<string>('Tutti');

  // Room Modal State (Create/Edit)
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<FurnitureRoom | null>(null);
  const [roomForm, setRoomForm] = useState({
    name: '',
    roomType: 'Salone',
    width: 400,   // cm
    length: 300,  // cm
    height: 270   // cm
  });

  // Details Modal State
  const [selectedDetailsItem, setSelectedDetailsItem] = useState<FurnitureItem | null>(null);
  const [detailForm, setDetailForm] = useState<FurnitureItem | null>(null);
  const [isDeletingItem, setIsDeletingItem] = useState(false);

  // 3D Viewport Controls
  const [yaw, setYaw] = useState(-45); // orbit rotation
  const [pitch, setPitch] = useState(60); // tilt rotation
  const [zoom, setZoom] = useState(1);
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);

  // Mobile/Desktop View Toggle for mobile screens
  const [viewMode, setViewMode] = useState<'3d' | 'list'>('3d');

  useEffect(() => {
    if (!activeRoomId && data.rooms.length > 0) {
      setActiveRoomId(data.rooms[0].id);
    }
  }, [data.rooms, activeRoomId]);

  const activeRoom = useMemo(() => {
    return data.rooms.find(r => r.id === activeRoomId) || null;
  }, [data.rooms, activeRoomId]);

  // Filter items in the active room by category
  const filteredItems = useMemo(() => {
    if (!activeRoom) return [];
    if (activeCategory === 'Tutti') return activeRoom.items;
    return activeRoom.items.filter(item => item.category === activeCategory);
  }, [activeRoom, activeCategory]);

  // Open modal to add a room
  const handleOpenAddRoomModal = () => {
    setEditingRoom(null);
    setRoomForm({
      name: '',
      roomType: 'Salone',
      width: 400,
      length: 300,
      height: 270
    });
    setIsRoomModalOpen(true);
  };

  // Open modal to edit current room
  const handleOpenEditRoomModal = () => {
    if (!activeRoom) return;
    setEditingRoom(activeRoom);
    setRoomForm({
      name: activeRoom.name,
      roomType: activeRoom.roomType || 'Salone',
      width: activeRoom.width || 400,
      length: activeRoom.length || 300,
      height: activeRoom.height || 270
    });
    setIsRoomModalOpen(true);
  };

  // Save room (Create/Update)
  const handleSaveRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomForm.name.trim()) return;

    let updatedRooms: FurnitureRoom[];
    let newId = activeRoomId;

    if (editingRoom) {
      // Edit Room
      updatedRooms = data.rooms.map(r => {
        if (r.id === editingRoom.id) {
          // Adjust item coordinates to fit in case room became smaller
          const itemsFit = r.items.map(item => {
            const fitW = item.width || 50;
            const fitD = item.depth || 50;
            const maxValX = Math.max(0, roomForm.width - fitW);
            const maxValY = Math.max(0, roomForm.length - fitD);
            return {
              ...item,
              x: Math.min(item.x || 0, maxValX),
              y: Math.min(item.y || 0, maxValY)
            };
          });

          return {
            ...r,
            name: roomForm.name.trim(),
            roomType: roomForm.roomType,
            width: roomForm.width,
            length: roomForm.length,
            height: roomForm.height,
            items: itemsFit
          };
        }
        return r;
      });
    } else {
      // Create Room
      const newRoom: FurnitureRoom = {
        id: generateUUID(),
        name: roomForm.name.trim(),
        roomType: roomForm.roomType,
        width: roomForm.width,
        length: roomForm.length,
        height: roomForm.height,
        items: []
      };
      updatedRooms = [...data.rooms, newRoom];
      newId = newRoom.id;
    }

    const updatedData = { ...data, rooms: updatedRooms };
    setData(updatedData);
    setActiveRoomId(newId);
    setIsRoomModalOpen(false);
    onSave(updatedData);
  };

  // Delete current room
  const handleDeleteRoom = () => {
    if (!activeRoomId) return;
    const updatedRooms = data.rooms.filter(r => r.id !== activeRoomId);
    const updatedData = { ...data, rooms: updatedRooms };
    
    setData(updatedData);
    setActiveRoomId(updatedRooms.length > 0 ? updatedRooms[0].id : null);
    setIsRoomModalOpen(false);
    onSave(updatedData);
  };

  // Scrape and add item
  const handleScrapeAndAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemLink.trim() || !activeRoomId || !activeRoom) return;

    let url = newItemLink.trim();
    if (!url.startsWith('http')) url = 'https://' + url;

    setIsScraping(true);
    let title = 'Nuovo Oggetto';
    let image = '';
    let price = '';
    let description = '';
    let category = 'Altro';
    let width = 50;
    let depth = 50;
    let height = 50;
    let manualUrl = '';

    try {
      const response = await CapacitorHttp.get({ 
        url, 
        headers: { 
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36' 
        } 
      });
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

        // 1. Guess category
        category = guessCategory(title, description);

        // 2. Parse dimensions
        const parsedDims = parseDimensions(`${title} ${description}`);
        const defaultW = CATEGORY_DEFAULTS[category]?.w || 50;
        const defaultD = CATEGORY_DEFAULTS[category]?.d || 50;
        const defaultH = CATEGORY_DEFAULTS[category]?.h || 50;

        width = parsedDims.width || defaultW;
        depth = parsedDims.depth || defaultD;
        height = parsedDims.height || defaultH;

        // 3. Look for PDF manuals
        const pdfLink = Array.from(doc.querySelectorAll('a[href]'))
          .map(a => a.getAttribute('href'))
          .find(href => href && href.toLowerCase().endsWith('.pdf'));
        if (pdfLink) {
          if (pdfLink.startsWith('http')) {
            manualUrl = pdfLink;
          } else {
            try {
              manualUrl = new URL(pdfLink, url).toString();
            } catch {
              manualUrl = pdfLink;
            }
          }
        }
      }
    } catch (err) {
      console.error('Scrape failed', err);
    }

    // Default placement is at room center
    const roomW = activeRoom.width || 400;
    const roomL = activeRoom.length || 300;
    const itemX = Math.max(0, Math.min(roomW - width, Math.round(roomW / 2 - width / 2)));
    const itemY = Math.max(0, Math.min(roomL - depth, Math.round(roomL / 2 - depth / 2)));

    const newItem: FurnitureItem = {
      id: generateUUID(),
      title: title.substring(0, 100) + (title.length > 100 ? '...' : ''),
      description: description.substring(0, 500) + (description.length > 500 ? '...' : ''),
      imageUrl: image,
      price: price,
      link: url,
      category,
      width,
      depth,
      height,
      x: itemX,
      y: itemY,
      color: CATEGORY_COLORS[category] || '#64748b',
      manualUrl
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
    
    // Select the new item to open details immediately
    setSelectedDetailsItem(newItem);
    setDetailForm(newItem);
    
    onSave(updatedData);
  };

  // Open item details modal
  const handleSelectItem = (item: FurnitureItem) => {
    setSelectedDetailsItem(item);
    setDetailForm({ ...item });
  };

  // Handle updates to item position or detail sliders in real time
  const handleDetailChange = (field: keyof FurnitureItem, val: any) => {
    if (!detailForm || !activeRoomId) return;
    
    let updatedItem = { ...detailForm, [field]: val };

    // Handle constraints: clamp positions to room walls
    if (field === 'width' || field === 'depth' || field === 'x' || field === 'y') {
      const roomW = activeRoom?.width || 400;
      const roomL = activeRoom?.length || 300;
      const w = field === 'width' ? parseInt(val) || 10 : (detailForm.width || 50);
      const d = field === 'depth' ? parseInt(val) || 10 : (detailForm.depth || 50);
      const x = field === 'x' ? parseInt(val) || 0 : (detailForm.x || 0);
      const y = field === 'y' ? parseInt(val) || 0 : (detailForm.y || 0);

      const maxX = Math.max(0, roomW - w);
      const maxY = Math.max(0, roomL - d);

      updatedItem = {
        ...updatedItem,
        width: w,
        depth: d,
        x: Math.min(x, maxX),
        y: Math.min(y, maxY)
      };
    }

    setDetailForm(updatedItem);

    // Update locally in real time so the 3D room updates instantly!
    const updatedRooms = data.rooms.map(r => {
      if (r.id === activeRoomId) {
        return {
          ...r,
          items: r.items.map(i => i.id === updatedItem.id ? updatedItem : i)
        };
      }
      return r;
    });
    setData({ ...data, rooms: updatedRooms });
  };

  // Commit item updates and save
  const handleSaveItemDetails = () => {
    if (!detailForm || !activeRoomId) return;
    
    const updatedRooms = data.rooms.map(r => {
      if (r.id === activeRoomId) {
        return {
          ...r,
          items: r.items.map(i => i.id === detailForm.id ? detailForm : i)
        };
      }
      return r;
    });

    const updatedData = { ...data, rooms: updatedRooms };
    setData(updatedData);
    setSelectedDetailsItem(null);
    setDetailForm(null);
    onSave(updatedData);
  };

  // Dismiss detail modal without saving slider changes (revert)
  const handleCloseItemDetails = () => {
    // Revert local data to the state from when modal was opened
    setData(module);
    setSelectedDetailsItem(null);
    setDetailForm(null);
  };

  // Delete furniture item
  const handleDeleteItem = () => {
    if (!selectedDetailsItem || !activeRoomId) return;

    const updatedRooms = data.rooms.map(r => {
      if (r.id === activeRoomId) {
        return { ...r, items: r.items.filter(i => i.id !== selectedDetailsItem.id) };
      }
      return r;
    });

    const updatedData = { ...data, rooms: updatedRooms };
    setData(updatedData);
    onSave(updatedData);
    setIsDeletingItem(false);
    setSelectedDetailsItem(null);
    setDetailForm(null);
  };

  // 3D Geometry Scale Calculations
  const maxRoomDim = activeRoom 
    ? Math.max(activeRoom.width || 400, activeRoom.length || 300, activeRoom.height || 270)
    : 400;
  
  // Set scale factor to fit within 320px bounding box
  const pxScale = activeRoom ? (260 / maxRoomDim) * zoom : 0.65;
  const roomW = activeRoom ? (activeRoom.width || 400) * pxScale : 0;
  const roomL = activeRoom ? (activeRoom.length || 300) * pxScale : 0;
  const roomH = activeRoom ? (activeRoom.height || 270) * pxScale : 0;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col h-full w-full max-w-6xl mx-auto bg-[var(--bg)] relative overflow-hidden">
      {/* HEADER */}
      <header className="flex items-center justify-between p-4 lg:p-6 bg-[var(--card-bg)] border-b border-[var(--border)] shrink-0">
        <div className="flex items-center gap-4 w-full">
          <button onClick={onClose} className="p-2.5 hover:bg-[var(--surface-variant)] rounded-full text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex-1">
            <input
              type="text"
              value={data.title}
              onChange={e => {
                const updated = { ...data, title: e.target.value };
                setData(updated);
                onSave(updated);
              }}
              className="text-xl lg:text-2xl font-black bg-transparent border-none outline-none text-[var(--text-main)] w-full placeholder:text-[var(--text-muted)] focus:ring-0"
              placeholder="Nome Progetto Mobili..."
            />
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-hidden flex flex-col">
        {/* ROOMS DASHBOARD / SELECTOR */}
        <div className="p-4 bg-[var(--sidebar-bg)] border-b border-[var(--border)] shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-black uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-2">
              <Grid className="w-4 h-4 text-teal-500" /> Le Mie Stanze
            </h3>
            {activeRoom && (
              <button 
                onClick={handleOpenEditRoomModal}
                className="text-xs font-bold text-teal-600 hover:text-teal-700 bg-teal-50 hover:bg-teal-100 dark:bg-teal-500/10 dark:text-teal-400 px-3 py-1.5 rounded-full border border-teal-500/10 flex items-center gap-1.5 transition-all"
              >
                <Settings className="w-3.5 h-3.5" /> Modifica Stanza
              </button>
            )}
          </div>
          
          <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar hide-scrollbar items-center">
            {data.rooms.map(room => {
              const roomTypePreset = ROOM_TYPES.find(t => t.name === room.roomType) || ROOM_TYPES[4];
              const RoomIcon = roomTypePreset.icon;
              const isActive = activeRoomId === room.id;

              return (
                <button
                  key={room.id}
                  onClick={() => {
                    setActiveRoomId(room.id);
                    setViewMode('3d');
                  }}
                  className={`flex-shrink-0 text-left p-3.5 rounded-2xl border transition-all flex items-center gap-3 w-56 relative ${
                    isActive 
                      ? 'bg-[var(--card-bg)] border-teal-500 shadow-md ring-1 ring-teal-500/30' 
                      : 'bg-[var(--card-bg)] border-[var(--border)] hover:bg-[var(--surface-variant)] shadow-sm'
                  }`}
                >
                  <div className={`p-2.5 rounded-xl shrink-0 ${roomTypePreset.color}`}>
                    <RoomIcon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-extrabold text-[var(--text-main)] text-sm truncate leading-snug">
                      {room.name}
                    </h4>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5 font-medium">
                      {((room.width || 400)/100).toFixed(1)}m × {((room.length || 300)/100).toFixed(1)}m · {room.items.length} {room.items.length === 1 ? 'ogg' : 'ogg'}
                    </p>
                  </div>
                </button>
              );
            })}

            <button
              onClick={handleOpenAddRoomModal}
              className="flex-shrink-0 p-3.5 rounded-2xl border border-dashed border-[var(--border)] bg-transparent hover:bg-[var(--surface-variant)] transition-all flex items-center gap-3 w-56 text-teal-600 font-bold text-sm"
            >
              <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-600 shrink-0">
                <Plus className="w-5 h-5" />
              </div>
              <span>Aggiungi Stanza</span>
            </button>
          </div>
        </div>

        {/* ACTIVE ROOM VIEWPORT */}
        {activeRoom ? (
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
            
            {/* LEFT COLUMN: 3D VIEWPORT (Show side-by-side on desktop, toggle on mobile) */}
            <div className={`lg:w-5/12 border-b lg:border-b-0 lg:border-r border-[var(--border)] bg-[var(--sidebar-bg)] p-4 flex flex-col gap-4 overflow-y-auto custom-scrollbar shrink-0 ${
              viewMode === '3d' ? 'flex' : 'hidden lg:flex'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-[var(--text-main)] leading-tight flex items-center gap-2">
                    {activeRoom.name}
                    <span className="text-xs px-2.5 py-1 rounded-full bg-[var(--surface-variant)] text-[var(--text-muted)] font-bold">
                      {activeRoom.roomType || 'Altro'}
                    </span>
                  </h2>
                  <p className="text-xs text-[var(--text-muted)] mt-1 font-semibold">
                    Area: {(((activeRoom.width || 400) * (activeRoom.length || 300)) / 10000).toFixed(1)} m² · Altezza: {((activeRoom.height || 270)/100).toFixed(1)}m
                  </p>
                </div>
              </div>

              {/* 3D ROOM VIEWER */}
              <div className="relative w-full h-[320px] bg-[var(--surface-variant)] rounded-3xl border border-[var(--border)] overflow-hidden flex items-center justify-center p-4 shadow-inner">
                {/* 3D View Labels */}
                <div className="absolute top-4 left-4 right-4 flex justify-between items-center pointer-events-none z-10">
                  <div className="bg-[var(--card-bg)]/90 backdrop-blur-md px-3.5 py-2 rounded-full border border-[var(--border)] text-[10px] font-black uppercase tracking-wider text-[var(--text-main)] flex items-center gap-1.5 shadow-sm">
                    <Compass className="w-3.5 h-3.5 text-teal-500" />
                    <span>Isometric Box View</span>
                  </div>
                  <div className="flex gap-2 pointer-events-auto">
                    <button 
                      onClick={() => { setYaw(-45); setPitch(60); setZoom(1); }} 
                      className="p-2 bg-[var(--card-bg)]/90 hover:bg-[var(--card-bg)] rounded-full border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-main)] shadow-sm transition-all"
                      title="Reset Vista"
                    >
                      <RotateCw className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* 3D Controls */}
                <div className="absolute bottom-4 left-4 right-4 flex items-center gap-4 bg-[var(--card-bg)]/95 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-[var(--border)] shadow-sm z-10 text-[var(--text-muted)] text-[10px] font-black tracking-wider uppercase">
                  <div className="flex-1 flex items-center gap-2">
                    <span>Rotazione Z</span>
                    <input 
                      type="range" 
                      min="-180" 
                      max="180" 
                      value={yaw} 
                      onChange={e => setYaw(parseInt(e.target.value))}
                      className="w-full accent-teal-500 h-1 bg-[var(--surface-variant)] rounded-lg appearance-none cursor-pointer" 
                    />
                  </div>
                  <div className="flex-1 flex items-center gap-2">
                    <span>Inclinazione X</span>
                    <input 
                      type="range" 
                      min="30" 
                      max="85" 
                      value={pitch} 
                      onChange={e => setPitch(parseInt(e.target.value))}
                      className="w-full accent-teal-500 h-1 bg-[var(--surface-variant)] rounded-lg appearance-none cursor-pointer" 
                    />
                  </div>
                </div>

                {/* Render container */}
                <div 
                  style={{
                    perspective: '1200px',
                    perspectiveOrigin: '50% 35%',
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <div
                    style={{
                      position: 'relative',
                      width: `${roomW}px`,
                      height: `${roomL}px`,
                      transformStyle: 'preserve-3d',
                      transform: `rotateX(${pitch}deg) rotateZ(${yaw}deg)`,
                      transition: 'transform 0.1s ease-out',
                    }}
                  >
                    {/* Floor Plane */}
                    <div
                      style={{
                        position: 'absolute',
                        width: `${roomW}px`,
                        height: `${roomL}px`,
                        left: 0,
                        top: 0,
                        background: 'var(--card-bg)',
                        backgroundImage: 'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)',
                        backgroundSize: `${50 * pxScale}px ${50 * pxScale}px`,
                        border: '2.5px solid var(--border)',
                        transform: 'translateZ(0)',
                      }}
                    />

                    {/* Back Wall Right (Y = 0) */}
                    <div
                      style={{
                        position: 'absolute',
                        width: `${roomW}px`,
                        height: `${roomH}px`,
                        left: 0,
                        top: `-${roomH}px`,
                        transformOrigin: 'bottom',
                        transform: 'rotateX(-90deg)',
                        background: 'linear-gradient(to top, rgba(13, 148, 136, 0.08), rgba(13, 148, 136, 0.01))',
                        backgroundImage: 'linear-gradient(rgba(13, 148, 136, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(13, 148, 136, 0.1) 1px, transparent 1px)',
                        backgroundSize: `${50 * pxScale}px ${50 * pxScale}px`,
                        borderBottom: '2.5px solid var(--border)',
                        borderLeft: '1px solid rgba(13, 148, 136, 0.15)',
                        borderRight: '1px solid rgba(13, 148, 136, 0.15)',
                        borderTop: '1px dashed rgba(13, 148, 136, 0.25)',
                        pointerEvents: 'none'
                      }}
                    />

                    {/* Back Wall Left (X = 0) */}
                    <div
                      style={{
                        position: 'absolute',
                        width: `${roomH}px`,
                        height: `${roomL}px`,
                        left: `-${roomH}px`,
                        top: 0,
                        transformOrigin: 'right',
                        transform: 'rotateY(90deg)',
                        background: 'linear-gradient(to top, rgba(13, 148, 136, 0.05), rgba(13, 148, 136, 0.01))',
                        backgroundImage: 'linear-gradient(rgba(13, 148, 136, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(13, 148, 136, 0.1) 1px, transparent 1px)',
                        backgroundSize: `${50 * pxScale}px ${50 * pxScale}px`,
                        borderBottom: '2.5px solid var(--border)',
                        borderRight: '2.5px solid var(--border)',
                        borderTop: '1px dashed rgba(13, 148, 136, 0.25)',
                        pointerEvents: 'none'
                      }}
                    />

                    {/* 3D Furniture Items */}
                    {filteredItems.map(item => {
                      const itemW = (item.width || 50) * pxScale;
                      const itemD = (item.depth || 50) * pxScale;
                      const itemH = (item.height || 50) * pxScale;
                      const itemX = (item.x || 0) * pxScale;
                      const itemY = (item.y || 0) * pxScale;
                      
                      const isHovered = hoveredItemId === item.id;
                      const isSelected = selectedDetailsItem?.id === item.id;
                      const itemColor = item.color || CATEGORY_COLORS[item.category || 'Altro'] || '#64748b';

                      return (
                        <div
                          key={item.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectItem(item);
                          }}
                          onMouseEnter={() => setHoveredItemId(item.id)}
                          onMouseLeave={() => setHoveredItemId(null)}
                          className="transition-all duration-100"
                          style={{
                            position: 'absolute',
                            width: `${itemW}px`,
                            height: `${itemD}px`,
                            left: `${itemX}px`,
                            top: `${itemY}px`,
                            transformStyle: 'preserve-3d',
                            transform: 'translateZ(0)',
                          }}
                        >
                          {/* Top Face */}
                          <div
                            style={{
                              position: 'absolute',
                              width: `${itemW}px`,
                              height: `${itemD}px`,
                              left: 0,
                              top: 0,
                              background: itemColor,
                              filter: 'brightness(1.15)',
                              border: isHovered || isSelected 
                                ? '2.5px solid #2dd4bf' 
                                : '1.5px solid rgba(255, 255, 255, 0.3)',
                              transform: `translateZ(${itemH}px)`,
                              boxShadow: isHovered || isSelected 
                                ? '0 0 12px rgba(45, 212, 191, 0.9)' 
                                : '0 2px 4px rgba(0,0,0,0.1)',
                              transition: 'all 0.15s ease-out',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              overflow: 'hidden',
                              fontSize: '8px',
                              fontWeight: 'black',
                              color: '#ffffff',
                              textShadow: '0 1px 2px rgba(0,0,0,0.6)',
                              userSelect: 'none'
                            }}
                          >
                            <span className="truncate px-1 uppercase tracking-tight">{item.title}</span>
                          </div>

                          {/* Front Face (Y-facing) */}
                          <div
                            style={{
                              position: 'absolute',
                              width: `${itemW}px`,
                              height: `${itemH}px`,
                              left: 0,
                              top: `${itemD}px`,
                              transformOrigin: 'top',
                              transform: 'rotateX(-90deg)',
                              background: itemColor,
                              filter: 'brightness(0.95)',
                              border: isHovered || isSelected
                                ? '2px solid #2dd4bf'
                                : '1px solid rgba(0,0,0,0.15)',
                              borderTop: 'none',
                              transition: 'all 0.15s ease-out'
                            }}
                          />

                          {/* Side Face (X-facing) */}
                          <div
                            style={{
                              position: 'absolute',
                              width: `${itemH}px`,
                              height: `${itemD}px`,
                              left: `${itemW}px`,
                              top: 0,
                              transformOrigin: 'left',
                              transform: 'rotateY(90deg)',
                              background: itemColor,
                              filter: 'brightness(0.8)',
                              border: isHovered || isSelected
                                ? '2px solid #2dd4bf'
                                : '1px solid rgba(0,0,0,0.2)',
                              borderLeft: 'none',
                              transition: 'all 0.15s ease-out'
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Tips Section */}
              <div className="bg-[var(--card-bg)] border border-[var(--border)] p-4 rounded-2xl flex gap-3 text-xs text-[var(--text-muted)] items-start">
                <Info className="w-4 h-4 text-teal-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-extrabold text-[var(--text-main)] mb-0.5">Suggerimento 3D</p>
                  <p className="leading-relaxed">Usa gli slider in basso per ruotare o inclinare la stanza. Fai click su qualsiasi blocco colorato per modificarne le misure e posizionarlo nella griglia in tempo reale.</p>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: SCRAPER, CATEGORIES, FURNITURE LIST (Show side-by-side on desktop, toggle on mobile) */}
            <div className={`flex-1 flex flex-col bg-[var(--bg)] overflow-hidden ${
              viewMode === 'list' ? 'flex' : 'hidden lg:flex'
            }`}>
              
              {/* Scraping box */}
              <div className="p-4 border-b border-[var(--border)] bg-[var(--card-bg)] shadow-sm z-10 shrink-0">
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
                      className="w-full bg-[var(--surface-variant)] border-2 border-[var(--border)] rounded-2xl py-3.5 pl-12 pr-4 outline-none focus:border-teal-500 transition-colors text-[var(--text-main)] placeholder:text-[var(--text-muted)] font-bold text-sm"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!newItemLink.trim() || isScraping}
                    className="w-full sm:w-auto px-6 py-3.5 bg-teal-500 hover:bg-teal-600 text-white rounded-2xl font-black text-sm tracking-wide transition-all disabled:opacity-50 disabled:hover:bg-teal-500 flex items-center justify-center gap-2 shrink-0 shadow-sm"
                  >
                    {isScraping ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Aggiungi'}
                  </button>
                </form>
              </div>

              {/* Categories filters scroll list */}
              <div className="px-4 py-3 bg-[var(--sidebar-bg)] border-b border-[var(--border)] flex gap-2 overflow-x-auto shrink-0 custom-scrollbar hide-scrollbar">
                {['Tutti', ...CATEGORIES].map(cat => {
                  const isActive = activeCategory === cat;
                  return (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={`px-4 py-2 rounded-full text-xs font-extrabold whitespace-nowrap transition-all border ${
                        isActive 
                          ? 'bg-teal-500 text-white border-teal-500 shadow-sm' 
                          : 'bg-[var(--card-bg)] border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--surface-variant)]'
                      }`}
                    >
                      {cat} {cat === 'Tutti' ? `(${activeRoom.items.length})` : `(${activeRoom.items.filter(i => i.category === cat).length})`}
                    </button>
                  );
                })}
              </div>

              {/* Furniture Grid list */}
              <div className="flex-1 overflow-y-auto p-4 lg:p-6 custom-scrollbar">
                {filteredItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-[var(--text-muted)] text-center px-4">
                    <Armchair className="w-16 h-16 mb-4 opacity-25 text-teal-600" />
                    <p className="font-extrabold text-lg text-[var(--text-main)]">Nessun oggetto trovato</p>
                    <p className="text-xs mt-1.5 opacity-70 max-w-sm">
                      {activeCategory === 'Tutti' 
                        ? 'La stanza è ancora vuota! Incolla un link in alto per fare lo scraping e aggiungere il primo elemento.' 
                        : `Non ci sono ancora oggetti della categoria "${activeCategory}" in questa stanza.`}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 lg:gap-6">
                    <AnimatePresence>
                      {filteredItems.map(item => (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          onClick={() => handleSelectItem(item)}
                          onMouseEnter={() => setHoveredItemId(item.id)}
                          onMouseLeave={() => setHoveredItemId(null)}
                          className={`bg-[var(--card-bg)] border rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col p-3 group relative select-none ${
                            hoveredItemId === item.id ? 'border-teal-500/50' : 'border-[var(--border)]'
                          }`}
                        >
                          <div className="aspect-square bg-[var(--surface-variant)] rounded-2xl flex items-center justify-center overflow-hidden relative border border-[var(--border)]/50">
                            {item.imageUrl ? (
                              <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover pointer-events-none group-hover:scale-105 transition-transform duration-300" />
                            ) : (
                              <div className="flex flex-col items-center justify-center text-[var(--text-muted)]/40 p-4">
                                <ImageIcon className="w-10 h-10 mb-1" />
                                <span className="text-[10px] font-bold tracking-wider uppercase">{item.category || 'Altro'}</span>
                              </div>
                            )}
                            {item.price && (
                              <div className="absolute bottom-2 left-2 bg-teal-600 text-white font-black text-[10px] px-2 py-1 rounded-full shadow-sm flex items-center gap-0.5">
                                <Tag className="w-3 h-3" /> €{item.price}
                              </div>
                            )}
                          </div>
                          
                          <div className="mt-2.5 px-1 flex-1 flex flex-col justify-between">
                            <h4 className="font-extrabold text-[var(--text-main)] text-xs line-clamp-2 leading-snug" title={item.title}>
                              {item.title}
                            </h4>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </div>

            {/* MOBILE NAVIGATION BAR (Segmented toggler displayed only on mobile/tablet) */}
            <div className="lg:hidden border-t border-[var(--border)] p-3 bg-[var(--card-bg)] flex shrink-0 z-10">
              <div className="flex w-full bg-[var(--surface-variant)] p-1 rounded-2xl">
                <button
                  onClick={() => setViewMode('3d')}
                  className={`flex-1 py-3 text-xs font-black tracking-wider uppercase rounded-xl transition-all ${
                    viewMode === '3d' 
                      ? 'bg-teal-500 text-white shadow-sm' 
                      : 'text-[var(--text-muted)]'
                  }`}
                >
                  Vista 3D
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`flex-1 py-3 text-xs font-black tracking-wider uppercase rounded-xl transition-all ${
                    viewMode === 'list' 
                      ? 'bg-teal-500 text-white shadow-sm' 
                      : 'text-[var(--text-muted)]'
                  }`}
                >
                  Oggetti ({activeRoom.items.length})
                </button>
              </div>
            </div>
            
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-[var(--text-muted)] text-center p-8 bg-[var(--sidebar-bg)]">
            <Compass className="w-16 h-16 mb-4 text-teal-600/30 animate-spin" style={{ animationDuration: '30s' }} />
            <p className="font-black text-lg text-[var(--text-main)]">Nessuna stanza disponibile</p>
            <p className="text-xs mt-1.5 max-w-xs leading-relaxed opacity-70">Ridisegna e organizza la tua casa. Fai clic sul tasto &quot;Aggiungi Stanza&quot; per iniziare a inserire le stanze con le loro misure.</p>
            <button 
              onClick={handleOpenAddRoomModal}
              className="mt-6 px-6 py-3 bg-teal-500 hover:bg-teal-600 text-white font-extrabold text-sm rounded-2xl transition-all shadow-sm"
            >
              Crea Prima Stanza
            </button>
          </div>
        )}
      </div>

      {/* ROOM CREATION / EDITING MODAL */}
      <AnimatePresence>
        {isRoomModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[var(--card-bg)] w-full max-w-md rounded-3xl shadow-xl overflow-hidden flex flex-col border border-[var(--border)] max-h-[80vh]"
            >
              <div className="p-4.5 border-b border-[var(--border)] flex items-center justify-between bg-[var(--surface-variant)]">
                <h3 className="font-black text-base text-[var(--text-main)] uppercase tracking-wider">
                  {editingRoom ? 'Modifica Stanza' : 'Crea Nuova Stanza'}
                </h3>
                <button onClick={() => setIsRoomModalOpen(false)} className="p-2 text-[var(--text-muted)] hover:bg-[var(--bg)] rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveRoom} className="p-5 flex flex-col gap-4.5 overflow-y-auto max-h-[80vh] custom-scrollbar">
                <div>
                  <label className="block text-[10px] font-black text-[var(--text-muted)] mb-1 uppercase tracking-wider">Nome Stanza</label>
                  <input
                    type="text"
                    required
                    placeholder="es. Cucina principale, Camera ospiti..."
                    value={roomForm.name}
                    onChange={e => setRoomForm({ ...roomForm, name: e.target.value })}
                    className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm outline-none focus:border-teal-500 text-[var(--text-main)] font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-[var(--text-muted)] mb-1.5 uppercase tracking-wider">Tipologia Stanza</label>
                  <div className="grid grid-cols-5 gap-2">
                    {ROOM_TYPES.map(type => {
                      const TypeIcon = type.icon;
                      const isSelected = roomForm.roomType === type.name;
                      return (
                        <button
                          key={type.name}
                          type="button"
                          onClick={() => setRoomForm({ ...roomForm, roomType: type.name })}
                          className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all ${
                            isSelected 
                              ? 'bg-teal-500/10 border-teal-500 text-teal-600 font-extrabold' 
                              : 'bg-[var(--bg)] border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--surface-variant)]'
                          }`}
                        >
                          <TypeIcon className="w-5 h-5 mb-1" />
                          <span className="text-[9px] truncate w-full">{type.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="border-t border-[var(--border)] pt-4 flex flex-col gap-4">
                  <h4 className="text-xs font-black uppercase text-[var(--text-muted)] tracking-wider flex items-center gap-1.5">
                    <Compass className="w-4 h-4 text-teal-500" /> Misure Stanza (in metri)
                  </h4>
                  
                  {/* WIDTH */}
                  <div className="flex flex-col gap-1.5 bg-[var(--surface-variant)]/40 p-3.5 rounded-2xl border border-[var(--border)]">
                    <div className="flex justify-between text-xs font-extrabold">
                      <span className="text-[var(--text-muted)]">Larghezza (X)</span>
                      <span className="text-teal-600 text-sm">{(roomForm.width / 100).toFixed(1)} m</span>
                    </div>
                    <input
                      type="range"
                      min="150"
                      max="1000"
                      step="10"
                      value={roomForm.width}
                      onChange={e => setRoomForm({ ...roomForm, width: parseInt(e.target.value) })}
                      className="w-full accent-teal-500"
                    />
                  </div>

                  {/* LENGTH */}
                  <div className="flex flex-col gap-1.5 bg-[var(--surface-variant)]/40 p-3.5 rounded-2xl border border-[var(--border)]">
                    <div className="flex justify-between text-xs font-extrabold">
                      <span className="text-[var(--text-muted)]">Lunghezza (Y)</span>
                      <span className="text-teal-600 text-sm">{(roomForm.length / 100).toFixed(1)} m</span>
                    </div>
                    <input
                      type="range"
                      min="150"
                      max="1000"
                      step="10"
                      value={roomForm.length}
                      onChange={e => setRoomForm({ ...roomForm, length: parseInt(e.target.value) })}
                      className="w-full accent-teal-500"
                    />
                  </div>

                  {/* HEIGHT */}
                  <div className="flex flex-col gap-1.5 bg-[var(--surface-variant)]/40 p-3.5 rounded-2xl border border-[var(--border)]">
                    <div className="flex justify-between text-xs font-extrabold">
                      <span className="text-[var(--text-muted)]">Altezza (Z)</span>
                      <span className="text-teal-600 text-sm">{(roomForm.height / 100).toFixed(1)} m</span>
                    </div>
                    <input
                      type="range"
                      min="200"
                      max="400"
                      step="10"
                      value={roomForm.height}
                      onChange={e => setRoomForm({ ...roomForm, height: parseInt(e.target.value) })}
                      className="w-full accent-teal-500"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-4 pt-4 border-t border-[var(--border)]">
                  {editingRoom && (
                    <button
                      type="button"
                      onClick={handleDeleteRoom}
                      className="px-4 py-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-2xl font-black text-sm transition-colors flex items-center justify-center gap-2"
                      title="Elimina Stanza"
                    >
                      <Trash2 className="w-4 h-4" /> Elimina
                    </button>
                  )}
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-teal-500 text-white hover:bg-teal-600 rounded-2xl font-black text-sm transition-colors shadow-sm text-center"
                  >
                    Salva Stanza
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FURNITURE ITEM DETAILS MODAL */}
      <AnimatePresence>
        {selectedDetailsItem && detailForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[var(--card-bg)] w-full max-w-xl rounded-3xl shadow-xl overflow-hidden flex flex-col border border-[var(--border)] max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="p-4 border-b border-[var(--border)] flex items-center justify-between bg-[var(--surface-variant)] shrink-0">
                <h3 className="font-black text-sm text-[var(--text-main)] uppercase tracking-wider">
                  Dettagli Oggetto
                </h3>
                <button onClick={handleCloseItemDetails} className="p-2 text-[var(--text-muted)] hover:bg-[var(--bg)] rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-5">
                
                {/* Visual Overview */}
                <div className="flex flex-col sm:flex-row gap-4 bg-[var(--surface-variant)]/30 p-4 rounded-2xl border border-[var(--border)]">
                  <div className="w-full sm:w-32 h-32 rounded-xl bg-[var(--surface-variant)] border border-[var(--border)] flex-shrink-0 overflow-hidden relative flex items-center justify-center">
                    {detailForm.imageUrl ? (
                      <img src={detailForm.imageUrl} alt={detailForm.title} className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-10 h-10 text-[var(--text-muted)]/30" />
                    )}
                  </div>
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <input 
                        type="text" 
                        value={detailForm.title} 
                        onChange={e => handleDetailChange('title', e.target.value)} 
                        className="text-base font-extrabold text-[var(--text-main)] w-full bg-transparent border-b border-transparent focus:border-teal-500 pb-1 outline-none"
                      />
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs font-black uppercase text-[var(--text-muted)] bg-[var(--surface-variant)] px-2.5 py-1 rounded-full">
                          {detailForm.category || 'Altro'}
                        </span>
                        {detailForm.price && (
                          <span className="text-xs font-black text-teal-600 bg-teal-500/10 px-2.5 py-1 rounded-full flex items-center gap-1">
                            <Tag className="w-3.5 h-3.5" /> €{detailForm.price}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex gap-2.5 mt-3 sm:mt-0">
                      <a
                        href={detailForm.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 sm:flex-none px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Negozio
                      </a>
                      {detailForm.manualUrl && (
                        <a
                          href={detailForm.manualUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 sm:flex-none px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                        >
                          <FileText className="w-3.5 h-3.5" /> Manuale
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Edit Form */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Category Selection */}
                  <div>
                    <label className="block text-[10px] font-black text-[var(--text-muted)] mb-1 uppercase tracking-wider">Tipologia Oggetto</label>
                    <select
                      value={detailForm.category || 'Altro'}
                      onChange={e => handleDetailChange('category', e.target.value)}
                      className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-teal-500 font-semibold text-[var(--text-main)]"
                    >
                      {CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  {/* Price */}
                  <div>
                    <label className="block text-[10px] font-black text-[var(--text-muted)] mb-1 uppercase tracking-wider">Prezzo (€)</label>
                    <input
                      type="text"
                      value={detailForm.price || ''}
                      onChange={e => handleDetailChange('price', e.target.value)}
                      className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-teal-500 font-semibold text-[var(--text-main)]"
                      placeholder="es. 149.99"
                    />
                  </div>
                </div>

                {/* Dimensions (W, D, H) */}
                <div className="border-t border-[var(--border)] pt-4">
                  <h4 className="text-xs font-black uppercase text-[var(--text-muted)] tracking-wider mb-2 flex items-center gap-1">
                    <Sliders className="w-4 h-4 text-teal-500" /> Dimensioni Oggetto (in cm)
                  </h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="flex flex-col gap-1 bg-[var(--bg)] p-3 rounded-xl border border-[var(--border)]">
                      <span className="text-[10px] font-bold text-[var(--text-muted)]">Larghezza (X)</span>
                      <input
                        type="number"
                        min="5"
                        max="800"
                        value={detailForm.width || 50}
                        onChange={e => handleDetailChange('width', parseInt(e.target.value) || '')}
                        className="bg-transparent text-sm font-extrabold text-teal-600 outline-none w-full"
                      />
                    </div>
                    <div className="flex flex-col gap-1 bg-[var(--bg)] p-3 rounded-xl border border-[var(--border)]">
                      <span className="text-[10px] font-bold text-[var(--text-muted)]">Profondità (Y)</span>
                      <input
                        type="number"
                        min="5"
                        max="800"
                        value={detailForm.depth || 50}
                        onChange={e => handleDetailChange('depth', parseInt(e.target.value) || '')}
                        className="bg-transparent text-sm font-extrabold text-teal-600 outline-none w-full"
                      />
                    </div>
                    <div className="flex flex-col gap-1 bg-[var(--bg)] p-3 rounded-xl border border-[var(--border)]">
                      <span className="text-[10px] font-bold text-[var(--text-muted)]">Altezza (Z)</span>
                      <input
                        type="number"
                        min="5"
                        max="800"
                        value={detailForm.height || 50}
                        onChange={e => handleDetailChange('height', parseInt(e.target.value) || '')}
                        className="bg-transparent text-sm font-extrabold text-teal-600 outline-none w-full"
                      />
                    </div>
                  </div>
                </div>

                {/* 3D Floor Position Sliders */}
                <div className="border-t border-[var(--border)] pt-4">
                  <h4 className="text-xs font-black uppercase text-[var(--text-muted)] tracking-wider mb-2.5 flex items-center gap-1">
                    <Compass className="w-4 h-4 text-teal-500" /> Posizionamento sul pavimento (in cm)
                  </h4>
                  
                  <div className="flex flex-col gap-3 bg-[var(--surface-variant)]/20 p-4 rounded-2xl border border-[var(--border)]">
                    {/* Position X Slider */}
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between text-[11px] font-bold">
                        <span className="text-[var(--text-muted)]">Posizione X (Larghezza)</span>
                        <span className="text-teal-600 font-extrabold">{detailForm.x || 0} cm / {Math.max(0, (activeRoom?.width || 400) - (detailForm.width || 50))} cm</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max={Math.max(0, (activeRoom?.width || 400) - (detailForm.width || 50))}
                        value={detailForm.x || 0}
                        onChange={e => handleDetailChange('x', parseInt(e.target.value))}
                        className="w-full accent-teal-500 h-1 bg-[var(--surface-variant)] rounded-lg appearance-none cursor-pointer"
                      />
                    </div>

                    {/* Position Y Slider */}
                    <div className="flex flex-col gap-1 mt-2">
                      <div className="flex justify-between text-[11px] font-bold">
                        <span className="text-[var(--text-muted)]">Posizione Y (Lunghezza)</span>
                        <span className="text-teal-600 font-extrabold">{detailForm.y || 0} cm / {Math.max(0, (activeRoom?.length || 300) - (detailForm.depth || 50))} cm</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max={Math.max(0, (activeRoom?.length || 300) - (detailForm.depth || 50))}
                        value={detailForm.y || 0}
                        onChange={e => handleDetailChange('y', parseInt(e.target.value))}
                        className="w-full accent-teal-500 h-1 bg-[var(--surface-variant)] rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {/* Custom Color Selector */}
                <div className="border-t border-[var(--border)] pt-4">
                  <label className="block text-[10px] font-black text-[var(--text-muted)] mb-2 uppercase tracking-wider">Colore Rappresentazione 3D</label>
                  <div className="flex gap-2.5 flex-wrap">
                    {Object.entries(CATEGORY_COLORS).map(([cat, colorHex]) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => handleDetailChange('color', colorHex)}
                        className={`w-7 h-7 rounded-full border-2 transition-all shadow-sm ${
                          detailForm.color === colorHex ? 'border-teal-500 scale-110 ring-2 ring-teal-500/20' : 'border-transparent hover:scale-105'
                        }`}
                        style={{ backgroundColor: colorHex }}
                        title={cat}
                      />
                    ))}
                    <input
                      type="color"
                      value={detailForm.color || '#64748b'}
                      onChange={e => handleDetailChange('color', e.target.value)}
                      className="w-7 h-7 rounded-full border border-[var(--border)] cursor-pointer overflow-hidden p-0 bg-transparent shrink-0"
                      title="Scegli colore personalizzato"
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-[10px] font-black text-[var(--text-muted)] mb-1 uppercase tracking-wider">Descrizione</label>
                  <textarea
                    value={detailForm.description || ''}
                    onChange={e => handleDetailChange('description', e.target.value)}
                    className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-teal-500 font-semibold text-[var(--text-main)] resize-none h-24 custom-scrollbar"
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-[var(--border)] flex items-center justify-between shrink-0 bg-[var(--sidebar-bg)]">
                <button
                  type="button"
                  onClick={() => setIsDeletingItem(true)}
                  className="px-4 py-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-2xl font-black text-sm transition-all flex items-center gap-1.5 shadow-sm"
                >
                  <Trash2 className="w-4 h-4" /> Rimuovi
                </button>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleCloseItemDetails}
                    className="px-5 py-3 bg-[var(--surface-variant)] text-[var(--text-muted)] hover:text-[var(--text-main)] rounded-2xl font-black text-sm transition-all border border-[var(--border)]"
                  >
                    Annulla
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveItemDetails}
                    className="px-6 py-3 bg-teal-500 hover:bg-teal-600 text-white rounded-2xl font-black text-sm transition-all shadow-sm"
                  >
                    Salva Modifiche
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Item Confirmation Dialog */}
      {isDeletingItem && (
        <ConfirmDialog
          isOpen={isDeletingItem}
          title="Elimina Oggetto"
          message="Sei sicuro di voler rimuovere questo oggetto dalla stanza?"
          confirmText="Elimina"
          cancelText="Annulla"
          onConfirm={handleDeleteItem}
          onCancel={() => setIsDeletingItem(false)}
        />
      )}
    </motion.div>
  );
};
