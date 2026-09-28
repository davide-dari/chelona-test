/**
 * Parking Service for Chelona
 * 
 * 100% On-Device & Privacy-Preserving
 * Manages vehicle parking spot, automatic GPS coordinates acquisition,
 * manual parking entry, interactive parking meter with alarm notifications,
 * reverse & forward geocoding via OpenStreetMap, walking distance calculation,
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
  expiresAt?: number; // timestamp scadenza parchimetro / disco orario
  meterStartedAt?: number; // timestamp avvio parchimetro
  meterDurationMinutes?: number; // durata sosta in minuti
  hourlyRate?: number; // tariffa oraria es. 1.50 €/h
  estimatedCost?: number; // costo totale calcolato in €
  vehicleName?: string;
  isManualLocation?: boolean; // vero se inserito manualmente senza GPS
}

const STORAGE_KEY = 'chelona_saved_parking';
export const PARKING_EVENT = 'chelona-parking-updated';

/**
 * Notifiche locali per il parchimetro
 */
export async function scheduleParkingNotifications(expiresAt: number, address?: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      // Cancella eventuali notifiche precedenti del parchimetro
      await LocalNotifications.cancel({ notifications: [{ id: 9991 }, { id: 9992 }] }).catch(() => {});

      const notifications: any[] = [];
      const now = Date.now();
      const tenMinutesBefore = expiresAt - 10 * 60 * 1000;

      // Notifica 10 minuti prima della scadenza
      if (tenMinutesBefore > now) {
        notifications.push({
          id: 9991,
          title: '⚠️ Parchimetro in scadenza',
          body: `La sosta auto${address ? ` a ${address}` : ''} scade tra 10 minuti. Prolungala o riprendi l'auto!`,
          schedule: { at: new Date(tenMinutesBefore) },
          channelId: 'chelona_high_importance_v2',
        });
      }

      // Notifica al momento della scadenza esatta
      if (expiresAt > now) {
        notifications.push({
          id: 9992,
          title: '🚨 Parchimetro scaduto!',
          body: `Il tempo del parcheggio${address ? ` a ${address}` : ''} è terminato.`,
          schedule: { at: new Date(expiresAt) },
          channelId: 'chelona_high_importance_v2',
        });
      }

      if (notifications.length > 0) {
        await LocalNotifications.schedule({ notifications });
      }
    } catch (e) {
      console.warn('Errore programmazione notifica parchimetro', e);
    }
  }
}

export async function cancelParkingNotifications(): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      await LocalNotifications.cancel({ notifications: [{ id: 9991 }, { id: 9992 }] }).catch(() => {});
    } catch (e) {
      console.warn('Errore cancellazione notifica parchimetro', e);
    }
  }
}

/**
 * Legge l'ultimo parcheggio salvato
 */
export function getSavedParking(): SavedParking | null {
  try {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined' || !localStorage?.getItem) return null;
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

    // Programma o cancella notifiche promemoria
    if (parking.expiresAt && parking.expiresAt > Date.now()) {
      scheduleParkingNotifications(parking.expiresAt, parking.address);
    } else {
      cancelParkingNotifications();
    }
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
    cancelParkingNotifications();
  } catch (e) {
    console.error('Errore rimozione parcheggio', e);
  }
}

/**
 * Prolunga il tempo del parchimetro (+15m, +30m, +1h, ecc.)
 */
export function extendParkingMeter(additionalMinutes: number): SavedParking | null {
  const current = getSavedParking();
  if (!current) return null;

  const now = Date.now();
  const baseTime = (current.expiresAt && current.expiresAt > now) ? current.expiresAt : now;
  const newExpiresAt = baseTime + additionalMinutes * 60 * 1000;
  const newDuration = (current.meterDurationMinutes || 0) + additionalMinutes;
  
  let newCost = current.estimatedCost;
  if (current.hourlyRate && current.hourlyRate > 0) {
    newCost = Math.round((newDuration / 60) * current.hourlyRate * 100) / 100;
  }

  const updated: SavedParking = {
    ...current,
    expiresAt: newExpiresAt,
    meterDurationMinutes: newDuration,
    estimatedCost: newCost,
  };

  saveParking(updated);
  return updated;
}

/**
 * Modifica manualmente l'orario di fine del parchimetro (es. impostando le 19:30)
 */
export function setParkingMeterEndTime(newEndTime: number, hourlyRate?: number): SavedParking | null {
  const current = getSavedParking();
  if (!current) return null;

  const start = current.meterStartedAt || current.timestamp || Date.now();
  const diffMinutes = Math.max(1, Math.round((newEndTime - start) / (60 * 1000)));
  const rate = hourlyRate !== undefined ? hourlyRate : (current.hourlyRate || 0);

  let newCost = current.estimatedCost;
  if (rate > 0) {
    newCost = Math.round((diffMinutes / 60) * rate * 100) / 100;
  }

  const updated: SavedParking = {
    ...current,
    expiresAt: newEndTime,
    meterDurationMinutes: diffMinutes,
    hourlyRate: rate,
    estimatedCost: newCost,
  };

  saveParking(updated);
  return updated;
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
 * Reverse geocoding OpenStreetMap / Nominatim per ottenere via e civico da coordinate
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
 * Forward geocoding OpenStreetMap / Nominatim per ottenere coordinate da testo indirizzo
 */
export async function geocodeAddress(query: string): Promise<{ latitude: number; longitude: number; displayName: string } | null> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&accept-language=it`;
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

    if (data && Array.isArray(data) && data.length > 0) {
      return {
        latitude: parseFloat(data[0].lat),
        longitude: parseFloat(data[0].lon),
        displayName: data[0].display_name,
      };
    }
  } catch (e) {
    console.warn('Forward geocode fallback', e);
  }
  return null;
}

/**
 * Salva automaticamente il parcheggio acquisendo le coordinate GPS attuali
 */
export async function autoSaveParking(
  notes?: string, 
  vehicleName?: string, 
  expiresAt?: number,
  meterDurationMinutes?: number,
  hourlyRate?: number,
  estimatedCost?: number
): Promise<SavedParking> {
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
    meterStartedAt: expiresAt ? Date.now() : undefined,
    meterDurationMinutes,
    hourlyRate,
    estimatedCost,
    vehicleName: vehicleName || '',
    isManualLocation: false,
  };

  saveParking(parking);
  return parking;
}

/**
 * Salva manualmente il parcheggio specificando indirizzo/luogo a mano o selezionandolo da Rubrica
 */
export async function manualSaveParking(params: {
  address: string;
  notes?: string;
  vehicleName?: string;
  expiresAt?: number;
  meterDurationMinutes?: number;
  hourlyRate?: number;
  estimatedCost?: number;
  coords?: { latitude: number; longitude: number; accuracy?: number };
}): Promise<SavedParking> {
  let lat = params.coords?.latitude;
  let lon = params.coords?.longitude;
  let accuracy = params.coords?.accuracy;

  // Se le coordinate non sono fornite, proviamo a risolverle con geocoding
  if (lat === undefined || lon === undefined) {
    const geo = await geocodeAddress(params.address);
    if (geo) {
      lat = geo.latitude;
      lon = geo.longitude;
      accuracy = 10;
    } else {
      // Fallback coordinate zero se geocoding non va a buon fine
      lat = 0;
      lon = 0;
    }
  }

  const parking: SavedParking = {
    id: 'park_' + Date.now(),
    latitude: lat,
    longitude: lon,
    accuracy,
    address: params.address.trim(),
    notes: params.notes || '',
    timestamp: Date.now(),
    expiresAt: params.expiresAt,
    meterStartedAt: params.expiresAt ? Date.now() : undefined,
    meterDurationMinutes: params.meterDurationMinutes,
    hourlyRate: params.hourlyRate,
    estimatedCost: params.estimatedCost,
    vehicleName: params.vehicleName || '',
    isManualLocation: true,
  };

  saveParking(parking);
  return parking;
}

/**
 * Calcola la distanza tra due punti GPS in metri (Formula dell'emisenoverso)
 */
export function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  if (lat1 === 0 && lon1 === 0) return 0;
  if (lat2 === 0 && lon2 === 0) return 0;

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
export function getNavigationUrl(lat: number, lon: number, address?: string): string {
  if (lat !== 0 && lon !== 0) {
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}&travelmode=walking`;
  }
  if (address) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}&travelmode=walking`;
  }
  return `https://www.google.com/maps`;
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
