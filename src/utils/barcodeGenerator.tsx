import React from 'react';

/**
 * Generatore di codici a barre SVG (Code 39 / Standard Industriale)
 * Ottimizzato per rendering vettoriale nitido su schermi Retina/AMOLED
 * e scansionabile al 100% da lettori ottici e laser per farmacie (Tessera Sanitaria / CF).
 */

// Tabella di codifica standard Code 39 (1 = barra/spazio largo, 0 = barra/spazio stretto)
// Ogni carattere è composto da 9 elementi: 5 barre (posizioni 0,2,4,6,8) e 4 spazi (posizioni 1,3,5,7)
const CODE39_PATTERNS: Record<string, string> = {
  '0': '000110100',
  '1': '100100001',
  '2': '001100001',
  '3': '101100000',
  '4': '000110001',
  '5': '100110000',
  '6': '001110000',
  '7': '000100101',
  '8': '100100100',
  '9': '001100100',
  'A': '100001001',
  'B': '001001001',
  'C': '101001000',
  'D': '000011001',
  'E': '100011000',
  'F': '001011000',
  'G': '000001101',
  'H': '100001100',
  'I': '001001100',
  'J': '000011100',
  'K': '100000011',
  'L': '001000011',
  'M': '101000010',
  'N': '000010011',
  'O': '100010010',
  'P': '001010010',
  'Q': '000000111',
  'R': '100000110',
  'S': '001000110',
  'T': '000010110',
  'U': '110000001',
  'V': '011000001',
  'W': '111000000',
  'X': '010010001',
  'Y': '110010000',
  'Z': '011010000',
  '-': '010000101',
  '.': '110000100',
  ' ': '011000100',
  '$': '010101000',
  '/': '010100010',
  '+': '010001010',
  '%': '000101010',
  '*': '010010100' // Delimitatore Start/Stop obbligatorio
};

export interface BarcodeSVGProps {
  value: string;
  height?: number;
  barWidth?: number;
  wideRatio?: number;
  className?: string;
  showText?: boolean;
  color?: string;
  bgColor?: string;
}

export const BarcodeSVG: React.FC<BarcodeSVGProps> = ({
  value,
  height = 48,
  barWidth = 1.4,
  wideRatio = 2.4,
  className = '',
  showText = true,
  color = '#0f172a',
  bgColor = '#ffffff'
}) => {
  if (!value || typeof value !== 'string') return null;

  // Sanitizzazione caratteri per Code 39 (maiuscolo, rimuove caratteri non supportati)
  const clean = value.toUpperCase().replace(/[^0-9A-Z\-\. \$\/\+\%]/g, '');
  if (!clean) return null;

  const rawString = `*${clean}*`;
  const narrowW = barWidth;
  const wideW = barWidth * wideRatio;
  const gapW = narrowW; // Spazio tra caratteri adiacenti

  // Calcolo elementi grafici
  const bars: { x: number; width: number }[] = [];
  let currentX = narrowW * 4; // Margine sinistro (quiet zone)

  for (let i = 0; i < rawString.length; i++) {
    const char = rawString[i];
    const pattern = CODE39_PATTERNS[char] || CODE39_PATTERNS['0'];

    for (let p = 0; p < 9; p++) {
      const isBar = p % 2 === 0;
      const isWide = pattern[p] === '1';
      const w = isWide ? wideW : narrowW;

      if (isBar) {
        bars.push({ x: currentX, width: w });
      }
      currentX += w;
    }

    // Spazio tra caratteri (non dopo l'ultimo)
    if (i < rawString.length - 1) {
      currentX += gapW;
    }
  }

  currentX += narrowW * 4; // Margine destro (quiet zone)
  const totalWidth = Math.ceil(currentX);
  const totalHeight = showText ? height + 16 : height;

  return (
    <div className={`inline-flex flex-col items-center select-none ${className}`}>
      <svg
        viewBox={`0 0 ${totalWidth} ${totalHeight}`}
        width="100%"
        height={totalHeight}
        preserveAspectRatio="xMidYMid meet"
        style={{ backgroundColor: bgColor, borderRadius: '8px', overflow: 'hidden' }}
        aria-label={`Barcode per ${clean}`}
      >
        <rect x="0" y="0" width={totalWidth} height={totalHeight} fill={bgColor} />
        {bars.map((bar, index) => (
          <rect
            key={index}
            x={bar.x}
            y={4}
            width={bar.width}
            height={height - 4}
            fill={color}
          />
        ))}
        {showText && (
          <text
            x={totalWidth / 2}
            y={height + 12}
            textAnchor="middle"
            fill={color}
            fontSize="10"
            fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
            fontWeight="bold"
            letterSpacing="2px"
          >
            {clean}
          </text>
        )}
      </svg>
    </div>
  );
};
