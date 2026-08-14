import React from 'react';
import { brandImageUrl } from '../data/brandImages';

interface StoreLogoProps {
  id: string;
  short?: string;
  size?: number;
  logo?: string;
  hex?: string;
  /** Slug catena volantini: se non c'è logo locale usa il logo openfoodfacts. */
  brandSlug?: string;
}

const F = 'Arial, Helvetica, sans-serif';

export function StoreLogo({ id, short, size = 40, logo: logoUrl, hex, brandSlug }: StoreLogoProps) {
  const ofUrl = !logoUrl && brandSlug ? brandImageUrl(brandSlug) : undefined;

  if (logoUrl || ofUrl) {
    return (
      <span
        style={{ width: size, height: size, aspectRatio: '1 / 1' }}
        className="inline-flex items-center justify-center shrink-0 rounded-[14px] bg-white ring-1 ring-[var(--border)] overflow-hidden"
      >
        <img
          src={logoUrl ?? ofUrl}
          alt={short || id}
          style={{ width: size * 0.82, height: size * 0.82, objectFit: 'contain' }}
          className="shrink-0"
          loading="lazy"
        />
      </span>
    );
  }
  let content: React.ReactNode;
  switch (id) {
    case 'lidl':
      content = (
        <>
          <rect width="64" height="64" rx="14" fill="#0B4DA2" />
          <circle cx="32" cy="32" r="27" fill="#FFD600" />
          <text x="32" y="43" textAnchor="middle" fontFamily={F} fontWeight="900" fontSize="23" fill="#0B4DA2">Lidl</text>
        </>
      );
      break;
    case 'aldi':
      content = (
        <>
          <rect width="64" height="64" rx="14" fill="#0057A8" />
          <ellipse cx="32" cy="18" rx="24" ry="10" fill="#FF7F00" />
          <text x="32" y="52" textAnchor="middle" fontFamily={F} fontWeight="900" fontSize="24" fill="#FFFFFF">ALDI</text>
        </>
      );
      break;
    case 'conad':
      content = (
        <>
          <rect width="64" height="64" rx="14" fill="#D71920" />
          <g fill="#FFFFFF">
            <circle cx="32" cy="15" r="7" />
            <circle cx="32" cy="49" r="7" />
            <circle cx="15" cy="32" r="7" />
            <circle cx="49" cy="32" r="7" />
            <circle cx="20.5" cy="20.5" r="7" />
            <circle cx="43.5" cy="43.5" r="7" />
            <circle cx="43.5" cy="20.5" r="7" />
            <circle cx="20.5" cy="43.5" r="7" />
          </g>
          <circle cx="32" cy="32" r="9" fill="#009639" />
        </>
      );
      break;
    case 'coop':
      content = (
        <>
          <rect width="64" height="64" rx="14" fill="#FFFFFF" />
          <rect x="2" y="2" width="60" height="60" rx="12" fill="none" stroke="#E3E3E3" strokeWidth="2" />
          <text x="32" y="41" textAnchor="middle" fontFamily={F} fontWeight="900" fontSize="20" fill="#E4001B">COOP</text>
        </>
      );
      break;
    case 'esselunga':
      content = (
        <>
          <rect width="64" height="64" rx="14" fill="#F37B21" />
          <text x="32" y="42" textAnchor="middle" fontFamily={F} fontWeight="900" fontSize="22" fill="#FFFFFF">ESSE</text>
          <rect x="20" y="50" width="24" height="3" rx="1.5" fill="#FFFFFF" opacity="0.7" />
        </>
      );
      break;
    case 'penny':
      content = (
        <>
          <rect width="64" height="64" rx="14" fill="#FFFFFF" />
          <rect x="2" y="2" width="60" height="60" rx="12" fill="none" stroke="#E3E3E3" strokeWidth="2" />
          <text x="32" y="42" textAnchor="middle" fontFamily={F} fontWeight="900" fontSize="20" fill="#0050AA">PENNY</text>
          <circle cx="50" cy="14" r="6" fill="#E4001B" />
        </>
      );
      break;
    case 'eurospin':
      content = (
        <>
          <rect width="64" height="64" rx="14" fill="#00923F" />
          <text x="32" y="48" textAnchor="middle" fontFamily={F} fontWeight="900" fontSize="34" fill="#FFFFFF">€</text>
          <text x="32" y="12" textAnchor="middle" fontFamily={F} fontWeight="900" fontSize="9" fill="#FFFFFF" opacity="0.85">EUROSPIN</text>
        </>
      );
      break;
    case 'carrefour':
    case 'carrefourmarket':
    case 'carrefourexpress':
      content = (
        <>
          <rect width="64" height="64" rx="14" fill="#FFFFFF" />
          <rect x="2" y="2" width="60" height="60" rx="12" fill="none" stroke="#E3E3E3" strokeWidth="2" />
          <circle cx="21" cy="28" r="16" fill="#003399" />
          <circle cx="43" cy="36" r="16" fill="#E70013" />
          <rect x="27" y="24" width="10" height="16" fill="#FFFFFF" />
        </>
      );
      break;
    case 'despar':
      content = (
        <>
          <rect width="64" height="64" rx="14" fill="#FFFFFF" />
          <rect x="2" y="2" width="60" height="60" rx="12" fill="none" stroke="#E3E3E3" strokeWidth="2" />
          <text x="24" y="45" textAnchor="middle" fontFamily={F} fontWeight="900" fontSize="30" fill="#E4001B">D</text>
          <text x="46" y="40" textAnchor="middle" fontFamily={F} fontWeight="900" fontSize="11" fill="#0050AA">espar</text>
        </>
      );
      break;
    case 'tigre':
      content = (
        <>
          <rect width="64" height="64" rx="14" fill="#FFB81C" />
          <path d="M10 18 h44 v4 h-44 z M10 42 h44 v4 h-44 z" fill="#1A1A1A" opacity="0.85" />
          <text x="32" y="35" textAnchor="middle" fontFamily={F} fontWeight="900" fontSize="15" fill="#1A1A1A">TIGRE</text>
        </>
      );
      break;
    case 'gros':
      content = (
        <>
          <rect width="64" height="64" rx="14" fill="#009A44" />
          <text x="32" y="43" textAnchor="middle" fontFamily={F} fontWeight="900" fontSize="22" fill="#FFFFFF">GROS</text>
        </>
      );
      break;
    case 'ipergros':
      content = (
        <>
          <rect width="64" height="64" rx="14" fill="#86B817" />
          <text x="32" y="29" textAnchor="middle" fontFamily={F} fontWeight="900" fontSize="10" fill="#FFFFFF">IPER</text>
          <text x="32" y="50" textAnchor="middle" fontFamily={F} fontWeight="900" fontSize="20" fill="#FFFFFF">GROS</text>
        </>
      );
      break;
    case 'grosmarket':
      content = (
        <>
          <rect width="64" height="64" rx="14" fill="#008F8C" />
          <text x="32" y="44" textAnchor="middle" fontFamily={F} fontWeight="900" fontSize="26" fill="#FFFFFF">GM</text>
        </>
      );
      break;
    case 'megamarket':
      content = (
        <>
          <rect width="64" height="64" rx="14" fill="#C026D3" />
          <path d="M32 10 l1.8 4.2 4.5 .4 -3.4 3 1 4.4 -3.9-2.4 -3.9 2.4 1-4.4 -3.4-3 4.5-.4z" fill="#FFD600" />
          <text x="32" y="50" textAnchor="middle" fontFamily={F} fontWeight="900" fontSize="22" fill="#FFFFFF">MM</text>
        </>
      );
      break;
    case 'familycenter':
      content = (
        <>
          <rect width="64" height="64" rx="14" fill="#EC4899" />
          <path d="M51 10c-1.7-2.2-5-2.2-6.7 0l-1.1 1.3-1.1-1.3c-1.7-2.2-5-2.2-6.7 0-1.9 2.3-1.7 5.7.4 7.7l7.4 7 7.4-7c2.1-2 2.3-5.4.3-7.7z" fill="#FFD600" />
          <text x="32" y="53" textAnchor="middle" fontFamily={F} fontWeight="900" fontSize="24" fill="#FFFFFF">FC</text>
        </>
      );
      break;
    case 'todis':
      content = (
        <>
          <rect width="64" height="64" rx="14" fill="#E5001B" />
          <text x="32" y="43" textAnchor="middle" fontFamily={F} fontWeight="900" fontSize="18" fill="#FFFFFF">TODIS</text>
        </>
      );
      break;
    default:
      content = (
        <>
          <rect width="64" height="64" rx="14" fill={hex || '#475569'} />
          <text x="32" y="43" textAnchor="middle" fontFamily={F} fontWeight="900" fontSize="22" fill="#FFFFFF">
            {(short || id).slice(0, 2).toUpperCase()}
          </text>
        </>
      );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className="shrink-0" style={{ borderRadius: 14 * (size / 64) }} aria-hidden>
      {content}
    </svg>
  );
}