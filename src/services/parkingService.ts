/**
 * Parking Service for Chelona
 * 
 * 100% On-Device & Privacy-Preserving
 * Manages vehicle parking spot, automatic GPS coordinates acquisition,
 * reverse geocoding via OpenStreetMap, walking distance calculation,
 * and direct maps navigation.
 */

import { Geolocation } from '@capacitor/geolocation';
import { Capacitor, CapacitorHttp } from '@capacitor/core';

export interface SavedParking {
  id: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  address?: string;
  city?: string;
  cap?: string;
  notes?: string;
  photoUrl?: string;
  timestamp: number;
  expiresAt?: number; // per parchimetro o disco orario
  vehicleName?: string;
}

const STORAGE_KEY = 'chelona_saved_parking';
export const PARKING_EVENT = 'chelona-parking-updated';

/**
 * Legge l'ultimo parcheggio salvato
 */
export function getSavedParking(): SavedParking | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.error('Errore lettura parcheggio', e);
    return null;
  }
}

/**
 * Salva o aggiorna il parcheggio
 */
export function saveParking(parking: SavedParking): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(parking));
    window.dispatchEvent(new CustomEvent(PARKING_EVENT, { detail: parking }));
  } catch (e) {
    console.error('Errore salvataggio parcheggio', e);
  }
}

/**
 * Cancella il parcheggio salvato
 */
export function clearSavedParking(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent(PARKING_EVENT, { detail: null }));
  } catch (e) {
    console.error('Errore rimozione parcheggio', e);
  }
}

/**
 * Ottiene la posizione GPS attuale (tramite Capacitor o Fallback Browser)
 */
export async function getCurrentGpsPosition(): Promise<{ latitude: number; longitude: number; accuracy?: number }> {
  try {
    const pos = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 12000,
    });
    return {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
    };
  } catch (err) {
    console.warn('Capacitor Geolocation non disponibile o fallita, provo fallback browser...', err);
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            resolve({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
            });
          },
          (error) => reject(error),
          { enableHighAccuracy: true, timeout: 12000 }
        );
      });
    }
    throw new Error('Impossibile ottenere la posizione GPS attuale.');
  }
}

/**
 * Reverse geocoding OpenStreetMap / Nominatim per ottenere via e civico
 */
export async function reverseGeocodeCoordinates(lat: number, lon: number): Promise<{ address: string; city?: string; cap?: string }> {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=jsonv2&addressdetails=1&accept-language=it`;
  try {
    let data: any = null;
    if (Capacitor.isNativePlatform()) {
      const res = await CapacitorHttp.get({
        url,
        headers: { 'User-Agent': 'ChelonaApp/1.0' },
      });
      data = res.data;
    } else {
      const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
      data = await res.json();
    }

    if (data && data.address) {
      const a = data.address;
      const road = a.road || a.pedestrian || a.suburb || a.neighbourhood || '';
      const houseNumber = a.house_number || '';
      const city = a.city || a.town || a.village || a.municipality || a.county || '';
      const cap = a.postcode || '';

      let address = road;
      if (houseNumber) address += ` ${houseNumber}`;
      if (!address) {
        address = data.display_name?.split(',')[0] || `Posizione GPS`;
      }

      return { address, city, cap };
    }
  } catch (e) {
    console.warn('Reverse geocode fallback', e);
  }

  return {
    address: `Coordinate GPS (${lat.toFixed(4)}, ${lon.toFixed(4)})`,
  };
}

/**
 * Salva automaticamente il parcheggio acquisendo le coordinate GPS attuali e l'indirizzo
 */
export async function autoSaveParking(notes?: string, vehicleName?: string, expiresAt?: number): Promise<SavedParking> {
  const coords = await getCurrentGpsPosition();
  const geo = await reverseGeocodeCoordinates(coords.latitude, coords.longitude);

  const parking: SavedParking = {
    id: 'park_' + Date.now(),
    latitude: coords.latitude,
    longitude: coords.longitude,
    accuracy: coords.accuracy,
    address: geo.address,
    city: geo.city,
    cap: geo.cap,
    notes: notes || '',
    timestamp: Date.now(),
    expiresAt,
    vehicleName: vehicleName || '',
  };

  saveParking(parking);
  return parking;
}

/**
 * Calcola la distanza tra due punti GPS in metri (Formula dell'emisenoverso)
 */
export function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // raggio Terra in metri
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

/**
 * Formatta la distanza in metri o km in italiano
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${meters} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

/**
 * Calcola il tempo trascorso dal parcheggio (es. "35 min fa", "2h 10m fa")
 */
export function formatElapsedParkingTime(timestamp: number): string {
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 60) return 'Proprio ora';
  const min = Math.floor(diffSec / 60);
  if (min < 60) return `${min} min fa`;
  const hours = Math.floor(min / 60);
  const remMin = min % 60;
  if (hours < 24) return `${hours}h ${remMin > 0 ? `${remMin}m ` : ''}fa`;
  const days = Math.floor(hours / 24);
  return `${days} ${days === 1 ? 'giorno' : 'giorni'} fa`;
}

/**
 * Genera il link per aprire la navigazione a piedi in Google Maps / Apple Maps
 */
export function getNavigationUrl(lat: number, lon: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}&travelmode=walking`;
}

/**
 * Genera l'URL per l'anteprima mappa OpenStreetMap (embed sicuro senza chiavi API)
 */
export function getOpenStreetMapEmbedUrl(lat: number, lon: number): string {
  const deltaLon = 0.0035;
  const deltaLat = 0.0025;
  const bbox = `${lon - deltaLon},${lat - deltaLat},${lon + deltaLon},${lat + deltaLat}`;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lon}`;
}
