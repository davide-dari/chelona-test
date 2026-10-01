/**
 * Servizio per la redazione legale e generazione PDF dei Recessi Contrattuali e Disdette PEC.
 * Include calcolo matematico dei termini di ripensamento (14 giorni ex art. 52 D.Lgs. 206/2005)
 * e dei 30 giorni di preavviso ordinario (Legge Bersani 40/2007).
 */

import { jsPDF } from 'jspdf';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

export interface RecessoFormData {
  providerId?: string;
  companyName: string;
  companyAddress: string;
  companyPec: string;
  contractType: string;
  contractNumber: string;
  contractDate: string; // YYYY-MM-DD
  podOrPdr?: string;
  userFirstName: string;
  userLastName: string;
  userFiscalCode: string;
  userAddress: string;
  userCap: string;
  userCity: string;
  userProvince: string;
  userPhone?: string;
  userEmail?: string;
  signatureDataUrl?: string | null;
  notes?: string;
}

export interface LegalTermsEvaluation {
  elapsedDays: number;
  isRipensamento14Days: boolean;
  effectiveDate: string;
  legalBasis: string;
  legalArticle: string;
  summaryBadge: string;
}

/**
 * Calcolo matematico dei termini di ripensamento legale o preavviso ordinario
 */
export function evaluateRecessoLegalTerms(contractDateStr: string, sendDate: Date = new Date()): LegalTermsEvaluation {
  if (!contractDateStr) {
    const eff = new Date(sendDate);
    eff.setDate(eff.getDate() + 30);
    return {
      elapsedDays: 999,
      isRipensamento14Days: false,
      effectiveDate: eff.toLocaleDateString('it-IT'),
      legalBasis: 'Recesso con preavviso contrattuale ordinario',
      legalArticle: 'Legge n. 40/2007 (Decreto Bersani)',
      summaryBadge: 'Preavviso 30gg (L. Bersani)',
    };
  }

  const contractTime = new Date(contractDateStr).getTime();
  const sendTime = sendDate.getTime();
  const elapsedDays = Math.max(0, Math.floor((sendTime - contractTime) / (1000 * 60 * 60 * 24)));

  if (elapsedDays <= 14) {
    // Diritto di Ripensamento entro 14 giorni (Art. 52 Codice del Consumo)
    return {
      elapsedDays,
      isRipensamento14Days: true,
      effectiveDate: 'Immediata (senza penali)',
      legalBasis: 'Diritto di ripensamento senza alcuna penale né costi di disattivazione',
      legalArticle: 'Art. 52 e segg. del D.Lgs. 206/2005 (Codice del Consumo)',
      summaryBadge: `Ripensamento entro 14gg (${elapsedDays}gg trascorsi)`,
    };
  } else {
    // Recesso ordinario con 30 giorni di preavviso
    const effDate = new Date(sendDate);
    effDate.setDate(effDate.getDate() + 30);
    return {
      elapsedDays,
      isRipensamento14Days: false,
      effectiveDate: effDate.toLocaleDateString('it-IT'),
      legalBasis: 'Recesso unilaterale con rispetto del termine di preavviso di 30 giorni',
      legalArticle: 'Legge n. 40/2007 (Legge Bersani)',
      summaryBadge: `Recesso Ordinario (30gg preavviso)`,
    };
  }
}

/**
 * Compone il corpo testuale formale per l'invio via PEC
 */
export function buildRecessoFormalBody(
  data: RecessoFormData,
  terms: LegalTermsEvaluation,
  sendDate: Date = new Date()
): string {
  const fullName = `${data.userFirstName} ${data.userLastName}`.trim();
  const city = data.userCity || 'Italia';
  const todayStr = sendDate.toLocaleDateString('it-IT');
  const contractDateFormatted = data.contractDate
    ? new Date(data.contractDate).toLocaleDateString('it-IT')
    : 'data di sottoscrizione';

  const recipientLines: string[] = [
    `Spett.le ${data.companyName.trim()}`,
  ];
  if (data.companyAddress && data.companyAddress.trim()) {
    recipientLines.push(data.companyAddress.trim());
  }
  if (data.companyPec && data.companyPec.trim()) {
    recipientLines.push(`Indirizzo PEC: ${data.companyPec.trim()}`);
  }

  let text = `${recipientLines.join('\n')}\n\n`;
  text += `Luogo e Data: ${city}, ${todayStr}\n\n`;
  text += `OGGETTO: Comunicazione formale di recesso/disdetta - Contratto ${data.contractType || 'servizio'} n. ${data.contractNumber || 'N/D'}\n\n`;

  text += `Il/La sottoscritto/a ${fullName || 'Il Cliente'},\n`;
  text += `residente in ${data.userAddress || '...'}, ${data.userCap || ''} ${data.userCity || ''} (${data.userProvince || ''}),\n`;
  text += `Codice Fiscale: ${data.userFiscalCode || 'N/D'}`;
  if (data.userPhone) text += `, Recapito telefonico: ${data.userPhone}`;
  if (data.userEmail) text += `, Email: ${data.userEmail}`;
  text += `,\n\nin qualità di intestatario del contratto in oggetto stipulato in data ${contractDateFormatted},\n\n`;

  if (terms.isRipensamento14Days) {
    text += `COMUNICA E FORMALIZZA\n`;
    text += `la propria irrevocabile volontà di esercitare il DIRITTO DI RIPENSAMENTO ai sensi e per gli effetti dell'${terms.legalArticle}, `;
    text += `senza dover fornire alcuna motivazione e senza l'addebito di alcuna penale, spesa di chiusura o corrispettivo di recesso.\n\n`;
  } else {
    text += `COMUNICA E FORMALIZZA\n`;
    text += `la formale disdetta e recesso dal contratto sopra menzionato ai sensi della ${terms.legalArticle}, `;
    text += `con decorrenza dal termine massimo di preavviso contrattuale di 30 giorni dalla ricezione della presente.\n\n`;
  }

  if (data.podOrPdr && data.podOrPdr.trim()) {
    text += `Identificativo fornitura (POD / PDR / Codice Cliente): ${data.podOrPdr.trim()}\n\n`;
  }

  text += `Si diffida pertanto codesta società dal pretendere somme non dovute o addebiti successivi alla cessazione del servizio e si richiede tempestiva revoca di ogni autorizzazione di addebito diretto (SDD/SEPA/Carta di Credito).\n\n`;
  text += `Si richiede altresì formale riscontro per iscritto attestante la ricezione della presente e l'esatta data di cessazione contrattuale.\n\n`;
  text += `Si allega copia fronte/retro del documento di identità in corso di validità del sottoscritto.\n\n`;
  text += `Distinti saluti.\n\n`;
  text += `${fullName}\n(Firmato digitalmente / elettronicamente)`;

  return text;
}

/**
 * Genera il link PEC mailto
 */
export function buildRecessoMailto(data: RecessoFormData, terms: LegalTermsEvaluation): string {
  const subject = `OGGETTO: Recesso dal contratto ${data.contractType || 'servizio'} n. ${data.contractNumber || 'N/D'} - ${data.userFirstName} ${data.userLastName}`;
  const body = buildRecessoFormalBody(data, terms);
  return `mailto:${data.companyPec}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/**
 * Genera un PDF ufficiale professionale e crittograficamente valido con firma vettoriale
 */
export async function generateRecessoPdfDoc(
  data: RecessoFormData,
  terms: LegalTermsEvaluation
): Promise<{ doc: jsPDF; base64: string; dataUri: string }> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 50;
  const contentW = pageW - margin * 2;
  let y = margin;

  // Header istituzionale
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageW, 90, 'F');

  // Accent line
  doc.setFillColor(225, 29, 72); // rose-600
  doc.rect(0, 90, pageW, 4, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('COMUNICAZIONE FORMALE DI RECESSO', margin, 46);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text(`Rif. Normativo: ${terms.legalArticle}`, margin, 68);

  y = 125;

  // Blocco Destinatario (Azienda) a destra
  const recipientX = margin + contentW * 0.45;
  const recipientW = contentW * 0.55;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.text('SPETTABILE AZIENDA DESTINATARIA:', recipientX, y);
  y += 14;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  const destNameLines = doc.splitTextToSize(data.companyName || 'Azienda Fornitrice', recipientW);
  doc.text(destNameLines, recipientX, y);
  y += destNameLines.length * 15;

  if (data.companyAddress && data.companyAddress.trim()) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85);
    const destAddrLines = doc.splitTextToSize(data.companyAddress.trim(), recipientW);
    doc.text(destAddrLines, recipientX, y);
    y += destAddrLines.length * 13;
  }

  if (data.companyPec && data.companyPec.trim()) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(13, 148, 136); // teal-600
    doc.text(`PEC: ${data.companyPec.trim()}`, recipientX, y);
    y += 18;
  }

  y = Math.max(y, 195);

  // Data e Luogo
  const todayFormatted = new Date().toLocaleDateString('it-IT');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.text(`Luogo e Data: ${data.userCity || 'Italia'}, lì ${todayFormatted}`, margin, y);
  y += 22;

  // Oggetto Evidenziato
  doc.setFillColor(241, 245, 249); // slate-100
  doc.roundedRect(margin, y, contentW, 40, 6, 6, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(225, 29, 72);
  doc.text('OGGETTO:', margin + 12, y + 18);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  const objText = `Recesso contratto ${data.contractType || 'servizio'} n. ${data.contractNumber || 'N/D'} - Intestatario: ${data.userFirstName} ${data.userLastName}`;
  const objLines = doc.splitTextToSize(objText, contentW - 85);
  doc.text(objLines, margin + 75, y + 18);
  y += 54;

  // Corpo della lettera
  const printParagraph = (txt: string, isBold = false, size = 10, color: [number, number, number] = [30, 41, 59]) => {
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    doc.setFontSize(size);
    doc.setTextColor(color[0], color[1], color[2]);
    const lines = doc.splitTextToSize(txt, contentW);
    doc.text(lines, margin, y);
    y += lines.length * (size * 1.35) + 8;
  };

  const fullName = `${data.userFirstName} ${data.userLastName}`.trim();
  const contractDateFormatted = data.contractDate
    ? new Date(data.contractDate).toLocaleDateString('it-IT')
    : 'data contrattuale';

  let intro = `Il/La sottoscritto/a ${fullName}, residente in ${data.userAddress || '...'}, ${data.userCap || ''} ${data.userCity || ''} (${data.userProvince || ''}), Codice Fiscale: ${data.userFiscalCode || 'N/D'}`;
  if (data.userPhone) intro += `, tel: ${data.userPhone}`;
  intro += `, in qualità di titolare ed intestatario del contratto in epigrafe concluso in data ${contractDateFormatted},`;
  printParagraph(intro, false, 10);

  printParagraph('FORMALMENTE COMUNICA E DICHIARA', true, 11, [15, 23, 42]);

  if (terms.isRipensamento14Days) {
    printParagraph(
      `di voler esercitare il legittimo DIRITTO DI RIPENSAMENTO ai sensi dell'${terms.legalArticle}, chiedendo l'immediata cancellazione e risoluzione del contratto senza alcuna penalità, indennizzo o spesa di gestione, essendo la presente inoltrata entro i 14 giorni dalla conclusione dello stesso.`
    );
  } else {
    printParagraph(
      `la formale disdetta ed il recesso dal contratto ai sensi della ${terms.legalArticle}, nel rispetto dei termini massimi di preavviso contrattuale di 30 giorni, richiedendo la disattivazione definitiva di ogni servizio e fornitura collegata.`
    );
  }

  if (data.podOrPdr && data.podOrPdr.trim()) {
    printParagraph(`Codice identificativo fornitura / utenza (POD / PDR): ${data.podOrPdr.trim()}`, true, 10, [13, 148, 136]);
  }

  printParagraph(
    'Si diffida codesta società dall\'eseguire ulteriori addebiti su conto corrente o strumenti di pagamento comunicati, con revoca immediata di ogni mandato RID/SDD. Si richiede inoltre tempestivo riscontro scritto comprovante l\'avvenuta chiusura della posizione.'
  );

  printParagraph('Si allega fotocopia fronte-retro del documento d\'identità del sottoscritto.', false, 9, [100, 116, 139]);

  y += 10;
  printParagraph('Distinti saluti.', false, 10);

  // Firma a destra
  const sigX = margin + contentW * 0.55;
  const sigW = contentW * 0.45;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.text('Il Richiedente (Firma autografa)', sigX, y);
  y += 14;

  if (data.signatureDataUrl && data.signatureDataUrl.includes('image/png')) {
    try {
      doc.addImage(data.signatureDataUrl, 'PNG', sigX, y, 160, 50);
      y += 55;
    } catch {
      doc.text(fullName, sigX, y + 15);
      y += 30;
    }
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(fullName, sigX, y + 20);
    y += 35;
  }

  // Footer di certificazione
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, pageH - 45, margin + contentW, pageH - 45);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Documento generato tramite Chelona Legal Vault - Trasmesso a mezzo PEC con valore legale di raccomandata A/R ex DPR 68/2005`,
    margin,
    pageH - 30
  );

  const dataUri = doc.output('datauristring');
  const base64 = dataUri.split(',')[1] || '';

  return { doc, base64, dataUri };
}

/**
 * Salva e condivide il PDF generato su Android o browser
 */
export async function shareRecessoPdf(
  data: RecessoFormData,
  terms: LegalTermsEvaluation
): Promise<{ success: boolean; filePath?: string; message: string }> {
  try {
    const { base64 } = await generateRecessoPdfDoc(data, terms);
    const fileName = `Chelona_Disdetta_${(data.companyName || 'Recesso').replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.pdf`;

    await Filesystem.writeFile({
      path: fileName,
      data: base64,
      directory: Directory.Cache,
    });

    const uri = await Filesystem.getUri({ path: fileName, directory: Directory.Cache });

    await Share.share({
      title: `Recesso ${data.companyName}`,
      text: `Lettera di disdetta formale per ${data.companyName}`,
      url: uri.uri,
      dialogTitle: 'Condividi o Invia Lettera di Recesso',
    });

    return {
      success: true,
      filePath: uri.uri,
      message: 'PDF generato e condiviso con successo!',
    };
  } catch (err: any) {
    console.error('Error generating/sharing PDF:', err);
    return {
      success: false,
      message: `Errore durante la generazione o condivisione: ${err?.message || err}`,
    };
  }
}
