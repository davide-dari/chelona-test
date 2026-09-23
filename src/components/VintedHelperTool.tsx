import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Shirt, Ruler, Camera, Upload, Download, Share2, Copy, Check, 
  Sparkles, Tag, ArrowRight, RefreshCw, X, Image as ImageIcon,
  CheckCircle2, Info, Eye, Layers, ChevronRight, Sliders, ShoppingBag,
  ExternalLink, ArrowDownToLine, Package, ShieldCheck, Truck, MessageCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { generateUUID } from '../utils/uuid';

interface VintedHelperToolProps {
  onClose: () => void;
  onSaveToSandbox?: (title: string, data: string, folderName?: string) => Promise<void> | void;
  showToast: (m: string, t?: 'success' | 'error' | 'info') => void;
}

export interface GarmentCategory {
  id: string;
  name: string;
  icon: string;
  measurements: {
    key: string;
    label: string;
    hint: string;
  }[];
}

const CATEGORIES: GarmentCategory[] = [
  {
    id: 'tshirt',
    name: 'T-Shirt / Top / Polo',
    icon: '👕',
    measurements: [
      { key: 'spalle', label: 'Spalle (Spalla-Spalla)', hint: 'Da cucitura a cucitura della spalla' },
      { key: 'petto', label: 'Petto (Ascella-Ascella)', hint: 'Subito sotto l\'attaccatura della manica' },
      { key: 'lunghezza', label: 'Lunghezza Totale', hint: 'Dal punto più alto della spalla al fondo' },
      { key: 'manica', label: 'Lunghezza Manica', hint: 'Dalla cucitura della spalla al polsino' },
    ]
  },
  {
    id: 'sweatshirt',
    name: 'Felpa / Maglione / Cardigan',
    icon: '🧥',
    measurements: [
      { key: 'spalle', label: 'Spalle (Spalla-Spalla)', hint: 'Da cucitura a cucitura' },
      { key: 'petto', label: 'Petto (Ascella-Ascella)', hint: 'In piano da ascella ad ascella' },
      { key: 'lunghezza', label: 'Lunghezza Totale', hint: 'Dalla base del collo/spalla al fondo' },
      { key: 'manica', label: 'Lunghezza Manica', hint: 'Dalla spalla al polsino' },
    ]
  },
  {
    id: 'jacket',
    name: 'Giacca / Giubbotto / Cappotto',
    icon: '🧥',
    measurements: [
      { key: 'spalle', label: 'Spalla a Spalla', hint: 'Distanza tra le due spalle' },
      { key: 'petto', label: 'Petto (Ascella-Ascella)', hint: 'Con giacca chiusa' },
      { key: 'vita', label: 'Vita Giacca', hint: 'All\'altezza del bottone centrale' },
      { key: 'lunghezza', label: 'Lunghezza Totale', hint: 'Dal colletto al fondo della giacca' },
      { key: 'manica', label: 'Lunghezza Manica', hint: 'Dalla spalla all\'estremità manica' },
    ]
  },
  {
    id: 'shirt',
    name: 'Camicia',
    icon: '👔',
    measurements: [
      { key: 'collo', label: 'Circonferenza Collo', hint: 'Con colletto disteso' },
      { key: 'spalle', label: 'Spalle (Spalla-Spalla)', hint: 'Da cucitura a cucitura spalla' },
      { key: 'petto', label: 'Petto (Ascella-Ascella)', hint: 'Sotto il giro manica' },
      { key: 'lunghezza', label: 'Lunghezza Totale', hint: 'Dal colletto al fondo' },
      { key: 'manica', label: 'Lunghezza Manica', hint: 'Dalla spalla al polsino' },
    ]
  },
  {
    id: 'pants',
    name: 'Pantaloni / Jeans / Tuta',
    icon: '👖',
    measurements: [
      { key: 'vita', label: 'Larghezza Vita (in piano)', hint: 'Da bordo a bordo della cintura (mezzo giro)' },
      { key: 'cavallo', label: 'Cavallo / Altezza Vita', hint: 'Dall\'incrocio cuciture al bordo superiore' },
      { key: 'fianchi', label: 'Larghezza Fianchi / Bacino', hint: 'Nella parte più larga sotto la zip' },
      { key: 'coscia', label: 'Larghezza Coscia', hint: 'Subito sotto l\'attaccatura del cavallo' },
      { key: 'inseam', label: 'Gamba Interna (Cavallo-Fondo)', hint: 'Dall\'inforcatura all\'orlo inferiore' },
      { key: 'lunghezza_tot', label: 'Lunghezza Esterna Totale', hint: 'Dalla vita fino all\'orlo inferiore' },
      { key: 'fondo', label: 'Fondo Gamba / Caviglia', hint: 'Larghezza dell\'orlo inferiore' },
    ]
  },
  {
    id: 'shorts',
    name: 'Shorts / Bermuda / Pantaloncini',
    icon: '🩳',
    measurements: [
      { key: 'vita', label: 'Larghezza Vita (in piano)', hint: 'Da bordo a bordo cintura' },
      { key: 'cavallo', label: 'Cavallo / Altezza Vita', hint: 'Dall\'incrocio al bordo vita' },
      { key: 'lunghezza_tot', label: 'Lunghezza Totale', hint: 'Dalla vita all\'orlo' },
      { key: 'fondo', label: 'Larghezza Fondo Gamba', hint: 'Orlo coscia' },
    ]
  },
  {
    id: 'dress',
    name: 'Vestito / Abito / Salopette',
    icon: '👗',
    measurements: [
      { key: 'spalle', label: 'Spalle', hint: 'Da spalla a spalla (se presenti)' },
      { key: 'petto', label: 'Seno / Petto', hint: 'Ascella-Ascella' },
      { key: 'vita', label: 'Girovita in piano', hint: 'Punto vita più stretto' },
      { key: 'fianchi', label: 'Fianchi in piano', hint: 'Punto più largo del bacino' },
      { key: 'lunghezza', label: 'Lunghezza Totale', hint: 'Dalla spalla all\'orlo inferiore' },
    ]
  },
  {
    id: 'skirt',
    name: 'Gonna',
    icon: '👗',
    measurements: [
      { key: 'vita', label: 'Larghezza Vita (in piano)', hint: 'Da bordo a bordo' },
      { key: 'fianchi', label: 'Fianchi', hint: 'Parte più larga del bacino' },
      { key: 'lunghezza', label: 'Lunghezza Totale', hint: 'Dalla cintura al fondo' },
    ]
  },
  {
    id: 'shoes',
    name: 'Scarpe / Sneakers / Stivali',
    icon: '👟',
    measurements: [
      { key: 'taglia_eu', label: 'Taglia EU / US', hint: 'Taglia indicata sulla linguetta o suola' },
      { key: 'soletta', label: 'Lunghezza Soletta Interna', hint: 'Misura fondamentale per acquirenti esigenti' },
      { key: 'suola', label: 'Altezza Suola / Tacco', hint: 'Altezza al tallone' },
      { key: 'gambale', label: 'Altezza Gambale (se stivale)', hint: 'Dalla suola alla sommità' },
    ]
  },
  {
    id: 'bag',
    name: 'Borsa / Zaino / Pochette',
    icon: '👜',
    measurements: [
      { key: 'larghezza', label: 'Larghezza (Base)', hint: 'Larghezza orizzontale alla base' },
      { key: 'altezza', label: 'Altezza', hint: 'Dal fondo alla sommità esclusi manici' },
      { key: 'profondita', label: 'Profondità / Spessore', hint: 'Spessore della base' },
      { key: 'tracolla', label: 'Luce Tracolla / Manici', hint: 'Lunghezza o altezza manici' },
    ]
  },
  {
    id: 'accessory',
    name: 'Accessori (Sciarpe, Cinture, Cappelli)',
    icon: '🧢',
    measurements: [
      { key: 'lunghezza', label: 'Lunghezza Totale', hint: 'Lunghezza lineare' },
      { key: 'larghezza', label: 'Larghezza', hint: 'Altezza/Spessore' },
      { key: 'circonferenza', label: 'Circonferenza', hint: 'Per cappelli o cinture al foro centrale' },
    ]
  },
  {
    id: 'other',
    name: 'Altro Oggetto',
    icon: '📦',
    measurements: [
      { key: 'larghezza', label: 'Larghezza', hint: 'Misura orizzontale in cm' },
      { key: 'altezza', label: 'Altezza', hint: 'Misura verticale in cm' },
      { key: 'profondita', label: 'Profondità / Spessore', hint: 'Profondità in cm' },
    ]
  }
];

const CONDITIONS = [
  { id: 'new_with_tag', label: 'Nuovo con cartellino', badge: '✨ Nuovo con cartellino' },
  { id: 'new_without_tag', label: 'Nuovo senza cartellino', badge: '🌟 Nuovo mai indossato' },
  { id: 'very_good', label: 'Ottime condizioni', badge: '👌 Ottime condizioni' },
  { id: 'good', label: 'Buone condizioni', badge: '👍 Buone condizioni' },
  { id: 'vintage_fair', label: 'Vintage con segni del tempo', badge: '🕰️ Vintage d\'epoca' }
];

const POPULAR_BRANDS = [
  'Zara', 'Nike', 'Levi\'s', 'Adidas', 'Ralph Lauren', 'Tommy Hilfiger', 
  'Vintage', 'Carhartt', 'H&M', 'Mango', 'Stradivarius', 'Pull&Bear', 
  'Massimo Dutti', 'North Face', 'Calvin Klein', 'Lacoste', 'Diesel'
];

const STYLES = [
  'Casual', 'Streetwear', 'Vintage / Y2K', 'Elegante / Chic', 
  'Minimal / Old Money', 'Sportivo', 'Boho / Indie', 'Oversize'
];

const FABRICS = [
  '100% Cotone', 'Denim / Jeans', 'Lana', 'Cachemire', 'Lino', 
  'Seta', 'Poliestere / Tecnico', 'Pelle vera', 'Ecopelle', 'Misto Cotone'
];

export const VintedHelperTool: React.FC<VintedHelperToolProps> = ({
  onClose,
  onSaveToSandbox,
  showToast
}) => {
  // Navigation tabs inside the tool
  const [activeTab, setActiveTab] = useState<'details' | 'image' | 'listing'>('details');

  // Photo
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const originalImageRef = useRef<HTMLImageElement | null>(null);

  // Garment info
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('tshirt');
  const [measurements, setMeasurements] = useState<Record<string, string>>({});
  
  // Listing details
  const [brand, setBrand] = useState<string>('');
  const [size, setSize] = useState<string>('');
  const [condition, setCondition] = useState<string>('very_good');
  const [color, setColor] = useState<string>('');
  const [fabric, setFabric] = useState<string>('');
  const [style, setStyle] = useState<string>('Casual');
  const [defects, setDefects] = useState<string>('');
  const [gender, setGender] = useState<'unisex' | 'uomo' | 'donna' | 'bambino'>('unisex');

  // Canvas & Image Generation
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imageStyle, setImageStyle] = useState<'card' | 'overlay'>('card');
  const [isGeneratingImage, setIsGeneratingImage] = useState<boolean>(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [copiedTitleIndex, setCopiedTitleIndex] = useState<number | null>(null);
  const [copiedDescription, setCopiedDescription] = useState<boolean>(false);

  const selectedCategory = useMemo(() => {
    return CATEGORIES.find(c => c.id === selectedCategoryId) || CATEGORIES[0];
  }, [selectedCategoryId]);

  // Handle image upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        originalImageRef.current = img;
        setImageSrc(dataUrl);
        setGeneratedImageUrl(null);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleMeasurementChange = (key: string, value: string) => {
    setMeasurements(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Helper: Count filled measurements
  const filledMeasurementsCount = useMemo(() => {
    return Object.values(measurements).filter(v => v && v.trim().length > 0).length;
  }, [measurements]);

  // ==========================================
  // CANVAS IMAGE GENERATOR (ZERO AI / NO TOKENS)
  // ==========================================
  const generateMeasurementImage = () => {
    if (!imageSrc || !originalImageRef.current) {
      showToast('Carica prima una foto dell\'articolo!', 'error');
      return;
    }

    setIsGeneratingImage(true);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = originalImageRef.current;

    // We build a crisp 1080x1080 square card (ideal for Vinted & Instagram)
    const W = 1080;
    const H = 1080;
    canvas.width = W;
    canvas.height = H;

    // Filter valid measurements
    const activeEntries = selectedCategory.measurements
      .map(m => ({ label: m.label, value: measurements[m.key] }))
      .filter(item => item.value && item.value.trim().length > 0);

    if (imageStyle === 'card') {
      // ----------------------------------------------------
      // STYLE 1: "SCHEDA LOOKBOOK MODERNA" (Split Layout)
      // ----------------------------------------------------
      
      // 1. Dark professional background with gradient
      const bgGrad = ctx.createLinearGradient(0, 0, W, H);
      bgGrad.addColorStop(0, '#0F172A');
      bgGrad.addColorStop(1, '#020617');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      // Subtle ambient glow
      const radialGlow = ctx.createRadialGradient(W * 0.75, H * 0.4, 50, W * 0.75, H * 0.4, 400);
      radialGlow.addColorStop(0, 'rgba(9, 177, 186, 0.15)'); // Vinted teal glow
      radialGlow.addColorStop(1, 'rgba(9, 177, 186, 0)');
      ctx.fillStyle = radialGlow;
      ctx.fillRect(0, 0, W, H);

      // 2. Left side / Framed photo
      const photoX = 40;
      const photoY = 40;
      const photoW = 460;
      const photoH = H - 80;

      // Draw photo container with rounded corners and shadow
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.shadowBlur = 30;
      ctx.shadowOffsetY = 15;
      
      ctx.beginPath();
      ctx.roundRect(photoX, photoY, photoW, photoH, 28);
      ctx.fillStyle = '#1E293B';
      ctx.fill();
      ctx.restore();

      // Clip and draw image maintaining aspect ratio (cover)
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(photoX, photoY, photoW, photoH, 28);
      ctx.clip();

      const imgAspect = img.width / img.height;
      const targetAspect = photoW / photoH;
      let sW, sH, sX, sY;

      if (imgAspect > targetAspect) {
        sH = img.height;
        sW = img.height * targetAspect;
        sX = (img.width - sW) / 2;
        sY = 0;
      } else {
        sW = img.width;
        sH = img.width / targetAspect;
        sX = 0;
        sY = (img.height - sH) / 2;
      }

      ctx.drawImage(img, sX, sY, sW, sH, photoX, photoY, photoW, photoH);

      // Inner subtle border on photo
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();

      // 3. Right Side: Measurement Dashboard
      const rightX = 540;
      let curY = 65;

      // Top Vinted-style brand header pill
      ctx.fillStyle = 'rgba(9, 177, 186, 0.15)';
      ctx.beginPath();
      ctx.roundRect(rightX, curY, 220, 36, 12);
      ctx.fill();
      ctx.strokeStyle = '#09B1BA';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = '#09B1BA';
      ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('📐 SCHEDA MISURE VINTED', rightX + 16, curY + 23);

      curY += 65;

      // Garment Category & Brand
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '900 34px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      const mainTitle = brand ? `${brand.toUpperCase()}` : selectedCategory.name.toUpperCase();
      ctx.fillText(mainTitle, rightX, curY, 490);

      curY += 34;

      ctx.fillStyle = '#94A3B8';
      ctx.font = '600 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(selectedCategory.name, rightX, curY);

      curY += 45;

      // Badges Row: Size & Condition
      let badgeX = rightX;
      if (size) {
        const sizeText = `TG. ${size.toUpperCase()}`;
        ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        const sizeW = ctx.measureText(sizeText).width + 32;

        ctx.fillStyle = '#F59E0B';
        ctx.beginPath();
        ctx.roundRect(badgeX, curY - 24, sizeW, 36, 10);
        ctx.fill();

        ctx.fillStyle = '#000000';
        ctx.fillText(sizeText, badgeX + 16, curY);
        badgeX += sizeW + 12;
      }

      const condObj = CONDITIONS.find(c => c.id === condition);
      if (condObj) {
        ctx.font = '600 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        const condW = ctx.measureText(condObj.badge).width + 28;

        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.beginPath();
        ctx.roundRect(badgeX, curY - 24, condW, 36, 10);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = '#E2E8F0';
        ctx.fillText(condObj.badge, badgeX + 14, curY);
      }

      curY += 40;

      // Divider line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(rightX, curY);
      ctx.lineTo(W - 40, curY);
      ctx.stroke();

      curY += 35;

      // Measurements List
      const maxRows = 6;
      const displayRows = activeEntries.slice(0, maxRows);

      displayRows.forEach((item) => {
        // Measurement row background pill
        ctx.fillStyle = 'rgba(30, 41, 59, 0.7)';
        ctx.beginPath();
        ctx.roundRect(rightX, curY - 26, 490, 52, 14);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Icon dot
        ctx.fillStyle = '#09B1BA';
        ctx.beginPath();
        ctx.arc(rightX + 24, curY, 5, 0, Math.PI * 2);
        ctx.fill();

        // Label
        ctx.fillStyle = '#E2E8F0';
        ctx.font = '600 17px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText(item.label, rightX + 42, curY + 6, 290);

        // Value in Teal/White badge
        const valFormatted = `${item.value} cm`;
        ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        const valW = ctx.measureText(valFormatted).width;

        ctx.fillStyle = '#09B1BA';
        ctx.fillText(valFormatted, rightX + 470 - valW, curY + 7);

        curY += 66;
      });

      if (activeEntries.length === 0) {
        ctx.fillStyle = '#64748B';
        ctx.font = 'italic 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText('Nessuna misura compilata al momento.', rightX, curY + 20);
        curY += 50;
      }

      // Bottom Guarantee Footer
      const footerY = H - 85;
      ctx.fillStyle = 'rgba(9, 177, 186, 0.08)';
      ctx.beginPath();
      ctx.roundRect(rightX, footerY, 490, 45, 12);
      ctx.fill();
      ctx.strokeStyle = 'rgba(9, 177, 186, 0.2)';
      ctx.stroke();

      ctx.fillStyle = '#38BDF8';
      ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('✓ Misure prese in piano (flat) • 100% Affidabile', rightX + 20, footerY + 28);

    } else {
      // ----------------------------------------------------
      // STYLE 2: "OVERLAY DIRETTO SU FOTO" (Full Cover)
      // ----------------------------------------------------
      // 1. Draw full image cover
      const imgAspect = img.width / img.height;
      const targetAspect = W / H;
      let sW, sH, sX, sY;

      if (imgAspect > targetAspect) {
        sH = img.height;
        sW = img.height * targetAspect;
        sX = (img.width - sW) / 2;
        sY = 0;
      } else {
        sW = img.width;
        sH = img.width / targetAspect;
        sX = 0;
        sY = (img.height - sH) / 2;
      }
      ctx.drawImage(img, sX, sY, sW, sH, 0, 0, W, H);

      // 2. Dark gradient overlay from bottom
      const gradient = ctx.createLinearGradient(0, H * 0.35, 0, H);
      gradient.addColorStop(0, 'rgba(2, 6, 23, 0)');
      gradient.addColorStop(0.3, 'rgba(2, 6, 23, 0.65)');
      gradient.addColorStop(1, 'rgba(2, 6, 23, 0.96)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, W, H);

      // 3. Top Floating Brand Tag
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
      ctx.shadowBlur = 15;
      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.roundRect(40, 40, 320, 60, 18);
      ctx.fill();
      ctx.strokeStyle = '#09B1BA';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#09B1BA';
      ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('📐 MISURE VINTED', 65, 68);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = '900 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText((brand || selectedCategory.name).toUpperCase(), 65, 88, 270);
      ctx.restore();

      // 4. Bottom Measurement Grid Cards
      const boxX = 40;
      const boxY = H - 420;
      const boxW = W - 80;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.beginPath();
      ctx.roundRect(boxX, boxY, boxW, 360, 24);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Title inside bottom box
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(`Guida alle Taglie • ${size ? `Taglia ${size.toUpperCase()}` : selectedCategory.name}`, boxX + 24, boxY + 40);

      // Grid of 2 columns for measurements
      let gridCol = 0;
      let gridRowY = boxY + 80;

      activeEntries.slice(0, 8).forEach((item, idx) => {
        const colX = gridCol === 0 ? boxX + 24 : boxX + (boxW / 2) + 12;
        const colW = (boxW / 2) - 36;

        ctx.fillStyle = 'rgba(30, 41, 59, 0.9)';
        ctx.beginPath();
        ctx.roundRect(colX, gridRowY, colW, 54, 12);
        ctx.fill();
        ctx.strokeStyle = 'rgba(9, 177, 186, 0.2)';
        ctx.stroke();

        ctx.fillStyle = '#CBD5E1';
        ctx.font = '600 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText(item.label, colX + 16, gridRowY + 33, colW - 100);

        const valText = `${item.value} cm`;
        ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        const vw = ctx.measureText(valText).width;
        ctx.fillStyle = '#09B1BA';
        ctx.fillText(valText, colX + colW - vw - 14, gridRowY + 34);

        if (gridCol === 0) {
          gridCol = 1;
        } else {
          gridCol = 0;
          gridRowY += 64;
        }
      });

      // Bottom Note
      ctx.fillStyle = '#94A3B8';
      ctx.font = 'italic 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('📏 Misure reali in centimetri prese in piano (half-measure dove applicabile)', boxX + 24, boxY + 335);
    }

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setGeneratedImageUrl(dataUrl);
    setIsGeneratingImage(false);
    showToast('Immagine misure generata con successo!', 'success');
  };

  // Trigger regeneration when style changes or tab changes to image
  useEffect(() => {
    if (activeTab === 'image' && imageSrc && !generatedImageUrl) {
      generateMeasurementImage();
    }
  }, [activeTab, imageStyle]);

  // Download image (Web & Capacitor Native)
  const handleDownloadImage = async () => {
    if (!generatedImageUrl) return;

    const fileName = `vinted_misure_${(brand || 'capo').toLowerCase().replace(/\s+/g, '_')}_${generateUUID().substring(0, 5)}.jpg`;

    if (Capacitor.isNativePlatform()) {
      try {
        await Filesystem.writeFile({
          path: `Download/${fileName}`,
          data: generatedImageUrl.split(',')[1],
          directory: Directory.ExternalStorage
        });
        showToast('Immagine salvata nei Download dello smartphone!', 'success');
      } catch {
        await Filesystem.writeFile({
          path: fileName,
          data: generatedImageUrl.split(',')[1],
          directory: Directory.Documents
        });
        showToast('Immagine salvata nei Documenti!', 'success');
      }
    } else {
      const a = document.createElement('a');
      a.href = generatedImageUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      showToast('Download avviato!', 'success');
    }
  };

  // Share image
  const handleShareImage = async () => {
    if (!generatedImageUrl) return;
    try {
      if (Capacitor.isNativePlatform()) {
        const fileName = `vinted_share_${Date.now()}.jpg`;
        const result = await Filesystem.writeFile({
          path: fileName,
          data: generatedImageUrl.split(',')[1],
          directory: Directory.Cache
        });
        await Share.share({
          title: 'Scheda Misure Vinted',
          text: `Ecco la scheda misure di ${brand || selectedCategory.name} per Vinted!`,
          url: result.uri
        });
      } else if (navigator.share) {
        const blob = await (await fetch(generatedImageUrl)).blob();
        const file = new File([blob], 'misure_vinted.jpg', { type: 'image/jpeg' });
        await navigator.share({
          files: [file],
          title: 'Scheda Misure Vinted',
          text: 'Misure per annuncio Vinted'
        });
      } else {
        handleDownloadImage();
      }
    } catch (e) {
      console.warn('Share error or cancelled', e);
    }
  };

  // Save to Chelona sandbox / Appunti
  const handleSaveToSandbox = async () => {
    if (!generatedImageUrl || !onSaveToSandbox) return;
    const title = `Misure Vinted - ${brand || selectedCategory.name} ${size ? `(Tg. ${size})` : ''}`.trim();
    await onSaveToSandbox(title, generatedImageUrl, 'Vinted');
    showToast('Salvato negli Appunti di Chelona!', 'success');
  };

  // ==========================================
  // TITLE & DESCRIPTION GENERATOR (ZERO AI / NO TOKENS)
  // ==========================================
  const generatedTitles = useMemo(() => {
    const b = brand ? brand.trim() : '';
    const cat = selectedCategory.name.split('/')[0].trim();
    const sz = size ? `Tg. ${size.toUpperCase()}` : '';
    const col = color ? color.trim() : '';
    const condObj = CONDITIONS.find(c => c.id === condition);
    const condLabel = condObj ? condObj.label : '';

    return [
      // 1. High SEO / Algorithm Optimized
      [b, cat, col, sz, style !== 'Casual' ? style : '', condLabel].filter(Boolean).join(' '),
      // 2. Direct & Clean
      [cat, b, col ? `(${col})` : '', sz ? `- ${sz}` : '', `• ${condLabel}`].filter(Boolean).join(' '),
      // 3. Catchy with Hook / Trend
      `✨ ${b || 'Stiloso'} ${cat} ${col} ${sz} • ${condLabel}`.trim()
    ];
  }, [brand, selectedCategory, size, color, condition, style]);

  const generatedDescription = useMemo(() => {
    const b = brand ? brand.trim() : 'Non specificato';
    const cat = selectedCategory.name.split('/')[0].trim();
    const sz = size ? size.toUpperCase() : 'Non indicata';
    const col = color ? color.trim() : 'Come da foto';
    const fab = fabric ? fabric.trim() : 'Morbido e confortevole';
    const condObj = CONDITIONS.find(c => c.id === condition);
    const condLabel = condObj ? condObj.label : 'Ottime condizioni';

    // Hook based on condition / style
    let openingHook = `✨ Splendido articolo firmato ${b !== 'Non specificato' ? b : ''}, perfetto per arricchire il tuo guardaroba!`;
    if (condition === 'new_with_tag') {
      openingHook = `💎 NUOVO CON CARTELLINO! Bellissimo ${cat} ${b !== 'Non specificato' ? b : ''}, mai indossato, impeccabile. Occasione unica!`;
    } else if (style.includes('Vintage')) {
      openingHook = `🕰️ VINTAGE GEM! Favoloso ${cat} ${b !== 'Non specificato' ? b : ''}, pezzo unico con un fascino d'altri tempi e qualità straordinaria.`;
    } else if (style.includes('Streetwear') || style.includes('Oversize')) {
      openingHook = `🔥 Streetwear must-have! Iconico ${cat} ${b !== 'Non specificato' ? b : ''}, fit pazzesco e comodissimo per tutti i giorni.`;
    }

    // Measurement block
    const activeEntries = selectedCategory.measurements
      .map(m => ({ label: m.label, value: measurements[m.key] }))
      .filter(item => item.value && item.value.trim().length > 0);

    let measurementsText = '';
    if (activeEntries.length > 0) {
      measurementsText = `📐 MISURE PRESE IN PIANO (FLAT):\n(Consiglio sempre di confrontarle con un tuo capo per una vestibilità ideale!)\n` +
        activeEntries.map(e => `• ${e.label}: ${e.value} cm`).join('\n') +
        `\n(Nota: vedi anche la foto con la scheda grafica completa delle misure inclusa nell'annuncio!)`;
    } else {
      measurementsText = `📐 MISURE:\nDisponibile per fornirti tutte le misure esatte in centimetri su richiesta in chat!`;
    }

    // Defects / Status note
    let defectText = `• Condizioni: ${condLabel} - capo tenuto con estrema cura.`;
    if (defects && defects.trim().length > 0) {
      defectText += `\n• Note / Segni particolari: ${defects.trim()} (segnalato per massima onestà e trasparenza).`;
    } else {
      defectText += `\n• Difetti: Nessun difetto o segno di usura evidente riscontrato.`;
    }

    // Hashtags
    const tags = [
      '#vinteditalia',
      '#vinted',
      b !== 'Non specificato' ? `#${b.toLowerCase().replace(/[^a-z0-9]/g, '')}` : '',
      `#${cat.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
      color ? `#${color.toLowerCase().replace(/[^a-z0-9]/g, '')}` : '',
      style.includes('Vintage') ? '#vintage #y2k #90s' : '#outfit #secondhand #moda',
      '#occasione'
    ].filter(Boolean).join(' ');

    return `${openingHook}

🔍 DETTAGLI ARTICOLO:
• Tipologia: ${cat}
• Brand / Marca: ${b}
• Taglia sull'etichetta: ${sz}
• Colore principale: ${col}
• Materiale: ${fab}
• Stile: ${style}
• Genere: ${gender.toUpperCase()}
${defectText}

${measurementsText}

💡 PERCHÉ SCEGLIERLO:
Capo estremamente versatile e curato nei minimi dettagli. Facile da abbinare su qualsiasi outfit per un look sempre impeccabile!

📦 SPEDIZIONE & ACQUISTO:
⚡ Spedizione super rapida in 24/48h con imballaggio sicuro e protettivo.
🧼 Capo igienizzato, pulito e pronto da indossare subito!
🛍️ SCONTO LOTTI ATTIVO: fai un giro nel mio armadio, se acquisti più capi risparmi subito su prezzo e spedizione!
💬 Scrivimi pure in chat per qualsiasi domanda, dubbio o foto extra!

${tags}`;
  }, [brand, selectedCategory, size, color, fabric, style, condition, defects, gender, measurements]);

  const copyToClipboard = async (text: string, isDescription = false, titleIndex?: number) => {
    try {
      await navigator.clipboard.writeText(text);
      if (isDescription) {
        setCopiedDescription(true);
        setTimeout(() => setCopiedDescription(false), 2500);
      } else if (titleIndex !== undefined) {
        setCopiedTitleIndex(titleIndex);
        setTimeout(() => setCopiedTitleIndex(null), 2500);
      }
      showToast('Copiato negli appunti! Incollalo su Vinted.', 'success');
    } catch (e) {
      showToast('Impossibile copiare, seleziona il testo manualmente.', 'error');
    }
  };

  return (
    <div className="flex flex-col h-full bg-[var(--bg)] overflow-hidden">
      {/* Hidden canvas for image generation */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Inputs for file upload */}
      <input 
        type="file" 
        ref={fileInputRef} 
        accept="image/*" 
        onChange={handleFileChange} 
        className="hidden" 
      />
      <input 
        type="file" 
        ref={cameraInputRef} 
        accept="image/*" 
        capture="environment" 
        onChange={handleFileChange} 
        className="hidden" 
      />

      {/* Sub-Navigation Tabs */}
      <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-2 mb-2 shadow-sm shrink-0">
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-[var(--surface-variant)] rounded-xl border border-[var(--border)]">
          <button
            onClick={() => setActiveTab('details')}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'details' 
                ? 'bg-teal-500 text-white shadow-md shadow-teal-500/20' 
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>1. Misure & Capo</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('image');
              if (imageSrc) generateMeasurementImage();
            }}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'image' 
                ? 'bg-teal-500 text-white shadow-md shadow-teal-500/20' 
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>2. Foto Misure</span>
          </button>

          <button
            onClick={() => setActiveTab('listing')}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'listing' 
                ? 'bg-teal-500 text-white shadow-md shadow-teal-500/20' 
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>3. Annuncio Vinted</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-28 space-y-6">
        {/* ========================================================================= */}
        {/* TAB 1: CAPO, FOTO & MISURE                                               */}
        {/* ========================================================================= */}
        {activeTab === 'details' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto space-y-6"
          >
            {/* Photo Upload Section */}
            <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-3xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-2">
                  <Camera className="w-4 h-4 text-teal-500" />
                  Foto Articolo (Necessaria per la scheda misure)
                </label>
                {imageSrc && (
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs font-bold text-teal-500 hover:underline flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" /> Cambia foto
                  </button>
                )}
              </div>

              {!imageSrc ? (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => cameraInputRef.current?.click()}
                    className="flex flex-col items-center justify-center gap-2 p-6 rounded-2xl border-2 border-dashed border-teal-500/30 bg-teal-500/5 hover:bg-teal-500/10 text-teal-600 dark:text-teal-400 transition-all group"
                  >
                    <div className="w-12 h-12 rounded-full bg-teal-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Camera className="w-6 h-6 text-teal-500" />
                    </div>
                    <span className="text-xs font-bold">Scatta Foto</span>
                  </button>

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center justify-center gap-2 p-6 rounded-2xl border-2 border-dashed border-[var(--border)] bg-[var(--surface-variant)] hover:border-teal-500/50 text-[var(--text-main)] transition-all group"
                  >
                    <div className="w-12 h-12 rounded-full bg-[var(--card-bg)] flex items-center justify-center group-hover:scale-110 transition-transform border border-[var(--border)]">
                      <Upload className="w-6 h-6 text-[var(--text-muted)] group-hover:text-teal-500" />
                    </div>
                    <span className="text-xs font-bold">Dalla Galleria</span>
                  </button>
                </div>
              ) : (
                <div className="relative rounded-2xl overflow-hidden border border-[var(--border)] bg-black/20 aspect-[4/3] flex items-center justify-center">
                  <img 
                    src={imageSrc} 
                    alt="Articolo Vinted" 
                    className="w-full h-full object-contain"
                  />
                  <button
                    onClick={() => setImageSrc(null)}
                    className="absolute top-3 right-3 p-2 bg-black/60 backdrop-blur-md rounded-full text-white hover:bg-black/80 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Category Selector */}
            <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-3xl p-5 shadow-sm space-y-3">
              <label className="text-xs font-black uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-2">
                <Shirt className="w-4 h-4 text-teal-500" />
                Tipo di Indumento o Oggetto
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1 scrollbar-none">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategoryId(cat.id)}
                    className={`flex items-center gap-2 p-2.5 rounded-2xl border text-left text-xs font-bold transition-all ${
                      selectedCategoryId === cat.id
                        ? 'border-teal-500 bg-teal-500/10 text-teal-600 dark:text-teal-400 shadow-sm'
                        : 'border-[var(--border)] bg-[var(--surface-variant)] text-[var(--text-main)] hover:border-teal-500/40'
                    }`}
                  >
                    <span className="text-base shrink-0">{cat.icon}</span>
                    <span className="truncate">{cat.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Measurements Input Section (Dynamic based on selected category) */}
            <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-3xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                <div>
                  <h3 className="text-sm font-black text-[var(--text-main)] flex items-center gap-2">
                    <Ruler className="w-4 h-4 text-teal-500" />
                    Misure in Piano ({selectedCategory.name})
                  </h3>
                  <p className="text-[11px] text-[var(--text-muted)]">Inserisci i centimetri (cm) misurando il capo disteso</p>
                </div>
                <span className="text-xs font-bold text-teal-500 bg-teal-500/10 px-2.5 py-1 rounded-full">
                  {filledMeasurementsCount} / {selectedCategory.measurements.length} compilate
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {selectedCategory.measurements.map((m) => (
                  <div key={m.key} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-[var(--text-main)]">
                        {m.label}
                      </label>
                      <span className="text-[10px] text-[var(--text-muted)]">cm</span>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.5"
                        placeholder="es. 50"
                        value={measurements[m.key] || ''}
                        onChange={(e) => handleMeasurementChange(m.key, e.target.value)}
                        className="w-full pl-3 pr-10 py-2.5 bg-[var(--surface-variant)] border border-[var(--border)] focus:border-teal-500 rounded-xl outline-none text-sm font-bold text-[var(--text-main)] transition-colors"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--text-muted)]">
                        cm
                      </span>
                    </div>
                    <p className="text-[10px] text-[var(--text-muted)] pl-1">{m.hint}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Listing Details (Brand, Size, Condition, Material) */}
            <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-3xl p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-black text-[var(--text-main)] flex items-center gap-2 border-b border-[var(--border)] pb-3">
                <Tag className="w-4 h-4 text-teal-500" />
                Dettagli Articolo per Titolo & Descrizione
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Brand */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[var(--text-muted)] uppercase">Marca / Brand</label>
                  <input
                    type="text"
                    placeholder="es. Levi's, Nike, Zara, Vintage..."
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[var(--surface-variant)] border border-[var(--border)] focus:border-teal-500 rounded-xl outline-none text-sm font-bold text-[var(--text-main)]"
                  />
                  {/* Quick brand chips */}
                  <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                    {POPULAR_BRANDS.slice(0, 6).map(b => (
                      <button
                        key={b}
                        onClick={() => setBrand(b)}
                        className="text-[10px] px-2 py-0.5 rounded-lg bg-[var(--surface-variant)] border border-[var(--border)] text-[var(--text-muted)] hover:text-teal-500 hover:border-teal-500 whitespace-nowrap"
                      >
                        {b}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Size */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[var(--text-muted)] uppercase">Taglia sull'etichetta</label>
                  <input
                    type="text"
                    placeholder="es. S, M, L, 42, 32/34, 40 EU..."
                    value={size}
                    onChange={(e) => setSize(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[var(--surface-variant)] border border-[var(--border)] focus:border-teal-500 rounded-xl outline-none text-sm font-bold text-[var(--text-main)]"
                  />
                  <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                    {['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Unica'].map(s => (
                      <button
                        key={s}
                        onClick={() => setSize(s)}
                        className="text-[10px] px-2 py-0.5 rounded-lg bg-[var(--surface-variant)] border border-[var(--border)] text-[var(--text-muted)] hover:text-teal-500 hover:border-teal-500 whitespace-nowrap"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Condition */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[var(--text-muted)] uppercase">Condizioni</label>
                  <select
                    value={condition}
                    onChange={(e) => setCondition(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[var(--surface-variant)] border border-[var(--border)] focus:border-teal-500 rounded-xl outline-none text-sm font-bold text-[var(--text-main)]"
                  >
                    {CONDITIONS.map(c => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </div>

                {/* Color */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[var(--text-muted)] uppercase">Colore Principale</label>
                  <input
                    type="text"
                    placeholder="es. Nero, Blu scuro, Beige, Grigio melange..."
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[var(--surface-variant)] border border-[var(--border)] focus:border-teal-500 rounded-xl outline-none text-sm font-bold text-[var(--text-main)]"
                  />
                </div>

                {/* Fabric */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[var(--text-muted)] uppercase">Tessuto / Materiale</label>
                  <input
                    type="text"
                    placeholder="es. 100% Cotone, Denim, Lana..."
                    value={fabric}
                    onChange={(e) => setFabric(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[var(--surface-variant)] border border-[var(--border)] focus:border-teal-500 rounded-xl outline-none text-sm font-bold text-[var(--text-main)]"
                  />
                </div>

                {/* Style */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[var(--text-muted)] uppercase">Stile / Mood</label>
                  <select
                    value={style}
                    onChange={(e) => setStyle(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[var(--surface-variant)] border border-[var(--border)] focus:border-teal-500 rounded-xl outline-none text-sm font-bold text-[var(--text-main)]"
                  >
                    {STYLES.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Defects / Particularities */}
              <div className="space-y-1.5 pt-1">
                <label className="text-xs font-bold text-[var(--text-muted)] uppercase">
                  Eventuali difetti o segni di usura (lascia vuoto se nessuno)
                </label>
                <input
                  type="text"
                  placeholder="es. Piccolo pallino di usura poco visibile, orlo accorciato..."
                  value={defects}
                  onChange={(e) => setDefects(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[var(--surface-variant)] border border-[var(--border)] focus:border-teal-500 rounded-xl outline-none text-sm text-[var(--text-main)]"
                />
              </div>
            </div>

            {/* Bottom Proceed Buttons */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => {
                  setActiveTab('image');
                  generateMeasurementImage();
                }}
                className="py-4 bg-teal-500 hover:bg-teal-600 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-teal-500/20 flex items-center justify-center gap-2 transition-all"
              >
                <span>Genera Foto Misure</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => setActiveTab('listing')}
                className="py-4 bg-[var(--card-bg)] border-2 border-teal-500 text-teal-600 dark:text-teal-400 rounded-2xl font-black text-xs uppercase tracking-wider shadow-sm flex items-center justify-center gap-2 hover:bg-teal-500/10 transition-all"
              >
                <span>Crea Annuncio</span>
                <Sparkles className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: GENERATED MEASUREMENTS IMAGE                                       */}
        {/* ========================================================================= */}
        {activeTab === 'image' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto space-y-6"
          >
            {!imageSrc ? (
              <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-3xl p-10 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-teal-500/10 text-teal-500 flex items-center justify-center mx-auto">
                  <Camera className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-[var(--text-main)]">Foto non ancora caricata</h3>
                <p className="text-sm text-[var(--text-muted)] max-w-sm mx-auto">
                  Carica prima una foto dell'indumento per generare la scheda grafica con le misure sovraimposte!
                </p>
                <button
                  onClick={() => setActiveTab('details')}
                  className="px-6 py-3 bg-teal-500 text-white rounded-xl font-bold text-xs uppercase tracking-wider"
                >
                  Torna al passo 1 e carica foto
                </button>
              </div>
            ) : (
              <>
                {/* Style selector */}
                <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-2 flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--text-muted)] pl-2">Layout Scheda:</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setImageStyle('card');
                        setTimeout(generateMeasurementImage, 50);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        imageStyle === 'card' 
                          ? 'bg-teal-500 text-white shadow-md' 
                          : 'bg-[var(--surface-variant)] text-[var(--text-muted)]'
                      }`}
                    >
                      Scheda Lookbook Pro
                    </button>
                    <button
                      onClick={() => {
                        setImageStyle('overlay');
                        setTimeout(generateMeasurementImage, 50);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        imageStyle === 'overlay' 
                          ? 'bg-teal-500 text-white shadow-md' 
                          : 'bg-[var(--surface-variant)] text-[var(--text-muted)]'
                      }`}
                    >
                      Overlay Diretto
                    </button>
                  </div>
                </div>

                {/* Image Preview Box */}
                <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-3xl p-4 shadow-xl overflow-hidden flex flex-col items-center">
                  {generatedImageUrl ? (
                    <div className="w-full max-w-[480px] rounded-2xl overflow-hidden shadow-2xl border border-[var(--border)]">
                      <img 
                        src={generatedImageUrl} 
                        alt="Scheda Misure Vinted" 
                        className="w-full h-auto object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-full h-80 flex flex-col items-center justify-center gap-3">
                      <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
                      <p className="text-xs font-bold text-[var(--text-muted)]">Generazione grafica in corso...</p>
                    </div>
                  )}

                  <div className="w-full mt-4 flex items-center justify-between text-xs text-[var(--text-muted)] px-2">
                    <span className="flex items-center gap-1 text-teal-500 font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5" /> 1080x1080px HD ottimizzata per Vinted
                    </span>
                    <button
                      onClick={generateMeasurementImage}
                      className="flex items-center gap-1 font-bold hover:text-teal-500 transition-colors"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Rigenera
                    </button>
                  </div>
                </div>

                {/* Actions: Download, Share, Save */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    onClick={handleDownloadImage}
                    className="py-4 bg-teal-500 hover:bg-teal-600 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-teal-500/20 flex items-center justify-center gap-2 transition-all"
                  >
                    <ArrowDownToLine className="w-4 h-4" />
                    <span>Scarica Immagine</span>
                  </button>

                  <button
                    onClick={handleShareImage}
                    className="py-4 bg-[var(--card-bg)] border-2 border-teal-500 text-teal-600 dark:text-teal-400 rounded-2xl font-black text-xs uppercase tracking-wider shadow-sm flex items-center justify-center gap-2 hover:bg-teal-500/10 transition-all"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>Condividi</span>
                  </button>

                  {onSaveToSandbox && (
                    <button
                      onClick={handleSaveToSandbox}
                      className="py-4 bg-[var(--surface-variant)] border border-[var(--border)] text-[var(--text-main)] rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:border-teal-500 transition-all"
                    >
                      <Package className="w-4 h-4 text-teal-500" />
                      <span>Salva in Chelona</span>
                    </button>
                  )}
                </div>

                {/* Pro tip card */}
                <div className="p-4 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-start gap-3 text-xs text-[var(--text-main)]">
                  <Info className="w-5 h-5 text-teal-500 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-teal-600 dark:text-teal-400 block mb-1">Consiglio Pro per Vinted:</strong>
                    Carica questa scheda come <strong>2ª foto</strong> dell'annuncio. Gli acquirenti la adorano perché non dovranno chiederti le misure in chat e riduce i resi del 95%!
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: LISTING TITLE & DESCRIPTION GENERATOR                              */}
        {/* ========================================================================= */}
        {activeTab === 'listing' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto space-y-6"
          >
            {/* Titles section */}
            <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-3xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                <h3 className="text-sm font-black text-[var(--text-main)] flex items-center gap-2">
                  <Tag className="w-4 h-4 text-teal-500" />
                  Titoli Ottimizzati per Vinted (Tocca per copiare)
                </h3>
                <span className="text-[10px] uppercase font-bold text-teal-500 bg-teal-500/10 px-2 py-0.5 rounded-full">
                  SEO & Trend
                </span>
              </div>

              <div className="space-y-2.5">
                {generatedTitles.map((t, idx) => {
                  const isCopied = copiedTitleIndex === idx;
                  return (
                    <div 
                      key={idx}
                      onClick={() => copyToClipboard(t, false, idx)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 group ${
                        isCopied 
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600' 
                          : 'border-[var(--border)] bg-[var(--surface-variant)] hover:border-teal-500'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase block mb-0.5">
                          {idx === 0 ? 'Opzione 1 (SEO Keyword Ricerca)' : idx === 1 ? 'Opzione 2 (Classico & Diretto)' : 'Opzione 3 (Accattivante con Emoji)'}
                        </span>
                        <p className="text-xs font-bold text-[var(--text-main)] truncate">{t}</p>
                      </div>
                      <button className="p-2 rounded-xl bg-[var(--card-bg)] border border-[var(--border)] text-[var(--text-muted)] group-hover:text-teal-500 group-hover:border-teal-500 shrink-0">
                        {isCopied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Description Section */}
            <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-3xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                <div>
                  <h3 className="text-sm font-black text-[var(--text-main)] flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-teal-500" />
                    Descrizione Completa Magnetica
                  </h3>
                  <p className="text-[11px] text-[var(--text-muted)]">Include dettagli, misure in piano, garanzie spedizione e hashtag</p>
                </div>
                <button
                  onClick={() => copyToClipboard(generatedDescription, true)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm ${
                    copiedDescription
                      ? 'bg-emerald-500 text-white'
                      : 'bg-teal-500 hover:bg-teal-600 text-white shadow-teal-500/20'
                  }`}
                >
                  {copiedDescription ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Copiato!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copia Descrizione</span>
                    </>
                  )}
                </button>
              </div>

              <div className="bg-[var(--surface-variant)] border border-[var(--border)] rounded-2xl p-4 text-xs font-medium text-[var(--text-main)] whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto font-mono">
                {generatedDescription}
              </div>
            </div>

            {/* Seller Checklist & Guarantees info */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="p-3 bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl text-center space-y-1">
                <Truck className="w-4 h-4 text-teal-500 mx-auto" />
                <span className="text-[10px] font-bold text-[var(--text-main)] block">Spedizione 24/48h</span>
                <span className="text-[9px] text-[var(--text-muted)] block">Aumenta vendite</span>
              </div>
              <div className="p-3 bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl text-center space-y-1">
                <Ruler className="w-4 h-4 text-teal-500 mx-auto" />
                <span className="text-[10px] font-bold text-[var(--text-main)] block">Misure in Piano</span>
                <span className="text-[9px] text-[var(--text-muted)] block">-90% domande noiose</span>
              </div>
              <div className="p-3 bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl text-center space-y-1">
                <ShoppingBag className="w-4 h-4 text-teal-500 mx-auto" />
                <span className="text-[10px] font-bold text-[var(--text-main)] block">Sconto Lotti</span>
                <span className="text-[9px] text-[var(--text-muted)] block">Ordini multipli</span>
              </div>
              <div className="p-3 bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl text-center space-y-1">
                <ShieldCheck className="w-4 h-4 text-teal-500 mx-auto" />
                <span className="text-[10px] font-bold text-[var(--text-main)] block">Zero Reclami</span>
                <span className="text-[9px] text-[var(--text-muted)] block">Massima trasparenza</span>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};
