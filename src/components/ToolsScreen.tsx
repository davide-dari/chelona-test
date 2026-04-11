import React, { useState } from 'react';
import { FileUp, FileDown, Layers, SplitSquareHorizontal, RotateCw, Image as ImageIcon, Type, X, FileCheck, ArrowRight, Percent, Scan, ArrowLeft } from 'lucide-react';
import { DocumentScanner } from './DocumentScanner';
import { PDFDocument, rgb, degrees } from 'pdf-lib';

import { motion, AnimatePresence } from 'motion/react';

export const TOOLS_PDF = [
  { id: 'merge', title: 'Unisci PDF', desc: 'Unisci più PDF e organizzali nel modo che preferisci.', icon: Layers, color: 'var(--danger)', bg: 'var(--danger-bg)' },
  { id: 'split', title: 'Dividi PDF', desc: 'Estrai una o varie pagine di un PDF in documenti separati.', icon: SplitSquareHorizontal, color: 'var(--warning)', bg: 'var(--warning-bg)' },
  { id: 'img2pdf', title: 'JPG in PDF', desc: 'Converti le tue immagini JPG o PNG in un documento PDF.', icon: ImageIcon, color: 'var(--accent)', bg: 'rgba(245, 158, 11, 0.1)' },
  { id: 'rotate', title: 'Ruota PDF', desc: 'Ruota i PDF come vuoi. Ruota molti documenti allo stesso tempo.', icon: RotateCw, color: 'var(--info)', bg: 'var(--info-bg)' },
  { id: 'watermark', title: 'Filigrana', desc: 'Aggiungi un testo trasparente sopra un PDF come filigrana.', icon: Type, color: 'var(--success)', bg: 'var(--success-bg)' },
];

export const TOOLS_UTILITY = [
  { id: 'scanner', title: 'Scanner Documenti', desc: 'Scansiona documenti con la fotocamera e trasforma in PDF.', icon: Scan, color: 'var(--accent)', bg: 'rgba(245, 158, 11, 0.1)' },
  { id: 'percent', title: 'Calcolo Percentuale', desc: 'Calcola facilmente sconti, ricarichi e proporzioni percentuali.', icon: Percent, color: 'var(--success)', bg: 'var(--success-bg)' }
];

export const TOOLS = [...TOOLS_PDF, ...TOOLS_UTILITY];

export const ToolsScreen = ({ showToast, onSaveToSandbox, initialToolId, onReset }: { showToast: (m: string, t?: 'success'|'error'|'info') => void, onSaveToSandbox?: (title: string, base64: string) => void, initialToolId?: string | null, onReset?: () => void }) => {
  const [activeTool, setActiveTool] = useState<string | null>(initialToolId || null);
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [percentMode, setPercentMode] = useState<'of'|'discount'|'increase'>('of');
  const [percentVal1, setPercentVal1] = useState('');
  const [percentVal2, setPercentVal2] = useState('');

  React.useEffect(() => {
    if (initialToolId) {
      setActiveTool(initialToolId);
    }
  }, [initialToolId]);

  const bytesToBase64 = (bytes: Uint8Array): string => {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const processMerge = async (saveToSandbox: boolean) => {
    if (files.length < 2) return showToast('Seleziona almeno 2 file PDF da unire.', 'error');
    setIsProcessing(true);
    try {
      const mergedPdf = await PDFDocument.create();
      for (const file of files) {
        const bytes = await file.arrayBuffer();
        const pdf = await PDFDocument.load(bytes);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach(page => mergedPdf.addPage(page));
      }
      const mergedBytes = await mergedPdf.save();
      
      if (saveToSandbox && onSaveToSandbox) {
        onSaveToSandbox('PDF Unito', `data:application/pdf;base64,${bytesToBase64(mergedBytes)}`);
      } else {
        downloadFile(mergedBytes, 'unito.pdf', 'application/pdf');
        showToast('PDF scaricato con successo!');
      }
      reset();
    } catch (e) {
      console.error(e);
      showToast("Errore durante l'unione dei PDF.", 'error');
    }
    setIsProcessing(false);
  };

  const processImg2Pdf = async (saveToSandbox: boolean) => {
    if (files.length === 0) return showToast("Seleziona almeno un'immagine.", 'error');
    setIsProcessing(true);
    try {
      const pdf = await PDFDocument.create();
      for (const file of files) {
        const bytes = await file.arrayBuffer();
        let image;
        if (file.type === 'image/jpeg') image = await pdf.embedJpg(bytes);
        else if (file.type === 'image/png') image = await pdf.embedPng(bytes);
        else continue;

        const page = pdf.addPage([image.width, image.height]);
        page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
      }
      const pdfBytes = await pdf.save();
      if (saveToSandbox && onSaveToSandbox) {
        onSaveToSandbox('Immagini in PDF', `data:application/pdf;base64,${bytesToBase64(pdfBytes)}`);
      } else {
        downloadFile(pdfBytes, 'immagini.pdf', 'application/pdf');
        showToast('PDF scaricato con successo!');
      }
      reset();
    } catch (e) {
      console.error(e);
      showToast('Errore durante la conversione in PDF.', 'error');
    }
    setIsProcessing(false);
  };

  const processRotate = async (saveToSandbox: boolean) => {
     if (files.length === 0) return showToast('Seleziona un PDF.', 'error');
     setIsProcessing(true);
     try {
       for (const file of files) {
         const bytes = await file.arrayBuffer();
         const pdf = await PDFDocument.load(bytes);
         const pages = pdf.getPages();
         pages.forEach(page => page.setRotation(degrees(page.getRotation().angle + 90)));
         const pdfBytes = await pdf.save();
         
         if (saveToSandbox && onSaveToSandbox) {
           onSaveToSandbox(`Ruotato_${file.name}`, `data:application/pdf;base64,${bytesToBase64(pdfBytes)}`);
         } else {
           downloadFile(pdfBytes, `ruotato_${file.name}`, 'application/pdf');
         }
       }
       if (!saveToSandbox) showToast('PDF ruotati e scaricati!');
       reset();
     } catch (e) {
       console.error(e);
       showToast('Errore durante la rotazione.', 'error');
     }
     setIsProcessing(false);
  }

  const downloadFile = (bytes: Uint8Array, filename: string, type: string) => {
    const blob = new Blob([bytes as BlobPart], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const reset = () => {
    setFiles([]);
    setActiveTool(null);
    setPercentVal1('');
    setPercentVal2('');
    if (onReset) onReset();
  };

  const executeTool = (saveToSandbox: boolean = false) => {
    switch(activeTool) {
      case 'merge': return processMerge(saveToSandbox);
      case 'img2pdf': return processImg2Pdf(saveToSandbox);
      case 'rotate': return processRotate(saveToSandbox);
      default: return showToast('Questo strumento è in fase di sviluppo (offline).', 'info');
    }
  };

  return (
    <div className="h-full flex flex-col p-4 lg:p-8 overflow-y-auto">
      <div className="max-w-[1200px] mx-auto w-full">
        {!activeTool ? (
          <>
            <div className="mb-10 text-center pt-8">
              <h2 className="text-3xl lg:text-5xl font-extrabold text-[var(--text-main)] mb-4 tracking-tight">I Tuoi Strumenti</h2>
              <p className="text-[var(--text-muted)] text-lg max-w-2xl mx-auto">Tutto ciò di cui hai bisogno a portata di mano. Completamente offline, sicuro e privato.</p>
            </div>
            
            <h3 className="text-xl font-bold text-[var(--text-main)] mb-6 drop-shadow-sm border-b border-[var(--border)] pb-2">PDF</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
              {TOOLS_PDF.map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveTool(t.id)}
                  className="bg-[var(--card-bg)] backdrop-blur-3xl border border-[var(--border)] p-6 rounded-[2rem] hover:border-amber-500 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_12px_40px_rgb(0,0,0,0.08)] transition-all group flex flex-col items-start text-left h-full"
                >
                  <div 
                    className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-sm"
                    style={{ backgroundColor: t.bg, color: t.color }}
                  >
                    <t.icon className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold text-[var(--text-main)] mb-2">{t.title}</h3>
                  <p className="text-sm text-[var(--text-muted)] flex-1">{t.desc}</p>
                </button>
              ))}
            </div>

            <h3 className="text-xl font-bold text-[var(--text-main)] mb-6 drop-shadow-sm border-b border-[var(--border)] pb-2">Utilità</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-40">
              {TOOLS_UTILITY.map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveTool(t.id)}
                  className="bg-[var(--card-bg)] backdrop-blur-3xl border border-[var(--border)] p-6 rounded-[2rem] hover:border-amber-500 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_12px_40px_rgb(0,0,0,0.08)] transition-all group flex flex-col items-start text-left h-full"
                >
                  <div 
                    className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-sm"
                    style={{ backgroundColor: t.bg, color: t.color }}
                  >
                    <t.icon className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold text-[var(--text-main)] mb-2">{t.title}</h3>
                  <p className="text-sm text-[var(--text-muted)] flex-1">{t.desc}</p>
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="bg-[var(--card-bg)] rounded-3xl p-8 border border-[var(--border)] shadow-sm max-w-2xl mx-auto text-center mt-10">
            <div className="flex items-center gap-4 mb-8 pb-4 border-b border-[var(--border)] text-left">
              <button onClick={reset} className="p-2 hover:bg-[var(--bg)] rounded-xl transition-colors text-[var(--accent)] group" title="Torna agli strumenti">
                <ArrowLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
              </button>
              <h2 className="text-2xl font-bold text-[var(--text-main)] flex items-center gap-3">
                {TOOLS.find(t => t.id === activeTool)?.title}
              </h2>
            </div>

            {activeTool === 'scanner' ? (
              <DocumentScanner 
                onClose={reset} 
                downloadOnly={!onSaveToSandbox}
                onCapture={(pdf) => {
                  if (onSaveToSandbox) onSaveToSandbox("Scansione Documento", pdf);
                  else showToast("Documento acquisito!");
                  reset();
                }}
              />
            ) : activeTool === 'percent' ? (
              <div className="py-8 flex flex-col items-center">
                <div className="w-full text-left bg-[var(--bg)] rounded-[2rem] p-6 lg:p-8 border border-[var(--border)]">
                  <div className="flex flex-col sm:flex-row gap-4 mb-8">
                     <div className="flex-1">
                       <label className="text-xs font-bold text-[var(--text-muted)] uppercase mb-2 block">Percentuale (%)</label>
                       <input type="number" value={percentVal1} onChange={e => setPercentVal1(e.target.value)} className="w-full p-5 bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl outline-none focus:border-amber-500 transition-all font-bold text-xl shadow-sm placeholder:text-[var(--text-muted)] text-[var(--text-main)]" placeholder="Es. 20" />
                     </div>
                     <div className="flex-1">
                       <label className="text-xs font-bold text-[var(--text-muted)] uppercase mb-2 block">Valore Originale</label>
                       <input type="number" value={percentVal2} onChange={e => setPercentVal2(e.target.value)} className="w-full p-5 bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl outline-none focus:border-amber-500 transition-all font-bold text-xl shadow-sm placeholder:text-[var(--text-muted)] text-[var(--text-main)]" placeholder="Es. 150" />
                     </div>
                  </div>

                  <div className="bg-gradient-to-tr from-amber-500/20 to-orange-500/20 rounded-2xl p-8 text-center border border-amber-500/30 shadow-inner">
                     <p className="text-sm font-bold text-amber-500/60 uppercase mb-2 tracking-widest leading-tight">Risultato Finale</p>
                     <p className="text-5xl lg:text-6xl font-black tracking-tight text-amber-500 drop-shadow-md">
                       {(() => {
                         const v1 = parseFloat(percentVal1) || 0;
                         const v2 = parseFloat(percentVal2) || 0;
                         return ((v1 / 100) * v2).toLocaleString('it-IT', { maximumFractionDigits: 2 });
                       })()}
                     </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-12 flex flex-col items-center justify-center border-2 border-dashed border-[var(--border)] rounded-[2.5rem] bg-[var(--bg)] relative hover:bg-[var(--card-bg)] transition-colors cursor-pointer group hover:border-amber-300">
                <input
                  type="file"
                  multiple={activeTool === 'merge' || activeTool === 'img2pdf' || activeTool === 'rotate'}
                  accept={activeTool === 'img2pdf' ? 'image/jpeg, image/png' : 'application/pdf'}
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="w-20 h-20 bg-[var(--accent-bg)] rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <FileUp className="w-10 h-10 text-amber-500" />
                </div>
                <p className="text-xl font-bold text-[var(--text-main)] mb-2">Seleziona i file {activeTool === 'img2pdf' ? 'immagini' : 'PDF'}</p>
                <p className="text-sm text-[var(--text-muted)]">oppure trascinali e rilasciali qui</p>
              </div>
            )}

            {files.length > 0 && (
              <div className="mt-8 text-left">
                <h4 className="text-sm font-bold text-[var(--text-muted)] uppercase mb-4">File selezionati ({files.length})</h4>
                <div className="space-y-2 mb-8 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                  {files.map((f, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-[var(--bg)] rounded-xl border border-[var(--border)]">
                      <FileCheck className="w-5 h-5 text-green-500 shrink-0" />
                      <span className="text-sm font-medium text-[var(--text-main)] truncate">{f.name}</span>
                    </div>
                  ))}
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    onClick={() => executeTool(false)}
                    disabled={isProcessing}
                    className="flex-1 py-4 bg-[var(--card-bg)] border-2 border-amber-500 text-amber-600 hover:bg-amber-500/10 disabled:opacity-50 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all shadow-sm"
                  >
                    <FileDown className="w-5 h-5" />
                    {isProcessing ? 'Elaborazione...' : 'Scarica PDF'}
                  </button>
                  {onSaveToSandbox && (
                    <button
                      onClick={() => executeTool(true)}
                      disabled={isProcessing}
                      className="flex-1 py-4 bg-gradient-to-tr from-amber-500 to-amber-400 hover:from-amber-600 hover:to-amber-500 disabled:opacity-50 text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-500/20 hover:scale-[1.02] active:scale-[0.98]"
                    >
                      {isProcessing ? 'Elaborazione...' : 'Salva in Sandbox'}
                      <ArrowRight className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
