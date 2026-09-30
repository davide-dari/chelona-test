/**
 * Zero Latency Location Service — Geolocalizzazione a Latenza Zero
 * 
 * Ottimizza l'acquisizione GPS su Android interfacciandosi con FusedLocationProviderClient.
 * Per ottenere la massima velocità, il sistema:
 * 1. Estrae prima la posizione istantanea tramite getLastLocation() (Latenza 0ms).
 * 2. Valuta se il dato memorizzato è valido e non troppo obsoleto (maxAgeMs).
 * 3. Avvia una nuova richiesta hardware con PRIORITY_HIGH_ACCURACY solo se assente o obsoleto.
 * 4. Fornisce fallback resilienti su @capacitor/geolocation e browser Web Geolocation.
 */

import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';

export interface ZeroLatencyPosition {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number | null;
  speed?: number | null;
  heading?: number | null;
  timestamp: number;
  fromCache: boolean;
  ageMs: number;
  provider?: string;
}

export interface ZeroLatencyLocationOptions {
  maxAgeMs?: number;       // Età massima posizione in cache in ms (default: 60.000 ms = 1 min)
  timeoutMs?: number;      // Timeout massimo per richiesta hardware (default: 8.000 ms)
  enableHighAccuracy?: boolean;
}

const DEFAULT_MAX_AGE_MS = 60_000; // 1 minuto
const DEFAULT_TIMEOUT_MS = 8_000;  // 8 secondi

class ZeroLatencyLocationService {
  private lastKnownPosition: ZeroLatencyPosition | null = null;

  /**
   * Controlla se è disponibile l'interfaccia nativa Android ChelonaNative
   */
  public isNativeBridgeAvailable(): boolean {
    return (
      typeof window !== 'undefined' &&
      typeof (window as any).ChelonaNative !== 'undefined' &&
      typeof (window as any).ChelonaNative?.getZeroLatencyLocation === 'function'
    );
  }

  /**
   * Estrazione sincrona immediata (0 ms) dell'ultima posizione nota
   */
  public getLastKnownPosition(maxAgeMs = DEFAULT_MAX_AGE_MS): ZeroLatencyPosition | null {
    // 1. Prova prima tramite bridge nativo Android
    if (this.isNativeBridgeAvailable() && typeof (window as any).ChelonaNative?.getLastKnownLocation === 'function') {
      try {
        const raw = (window as any).ChelonaNative.getLastKnownLocation(maxAgeMs);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed.latitude === 'number' && typeof parsed.longitude === 'number') {
            this.lastKnownPosition = parsed;
            return parsed;
          }
        }
      } catch (e) {
        console.warn('[ZeroLatencyLocation] Errore lettura sync nativa:', e);
      }
    }

    // 2. Controllo cache in RAM del servizio
    if (this.lastKnownPosition) {
      const age = Date.now() - this.lastKnownPosition.timestamp;
      if (age <= maxAgeMs) {
        return this.lastKnownPosition;
      }
    }

    return null;
  }

  /**
   * Ottiene la posizione con approccio ottimizzato FusedLocation:
   * - Restituisce subito il dato memorizzato se valido
   * - Richiede scansione GPS hardware ad alta precisione solo se necessario
   */
  public async getPosition(options?: ZeroLatencyLocationOptions): Promise<ZeroLatencyPosition> {
    const maxAgeMs = options?.maxAgeMs ?? DEFAULT_MAX_AGE_MS;
    const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;

    // STEP 1: Fast-path sincrono immediato (0 millisecondi)
    const cached = this.getLastKnownPosition(maxAgeMs);
    if (cached) {
      console.log(`[ZeroLatencyLocation] Hit istantaneo da cache FusedLocation (età: ${cached.ageMs}ms)`);
      return cached;
    }

    // STEP 2: Se siamo su Android con FusedLocationProviderClient nativo
    if (this.isNativeBridgeAvailable()) {
      try {
        return await this.getNativeFusedLocation(maxAgeMs, timeoutMs);
      } catch (err) {
        console.warn('[ZeroLatencyLocation] Bridge nativo fallito, procedo con fallback standard:', err);
      }
    }

    // STEP 3: Fallback Capacitor Geolocation con maximumAge ottimizzato
    return await this.getCapacitorFallbackLocation(maxAgeMs, timeoutMs);
  }

  /**
   * Richiesta tramite FusedLocationProviderClient nativo su Android
   */
  private getNativeFusedLocation(maxAgeMs: number, timeoutMs: number): Promise<ZeroLatencyPosition> {
    return new Promise((resolve, reject) => {
      let resolved = false;

      const cleanup = () => {
        window.removeEventListener('chelona-zero-latency-location', onSuccess as EventListener);
        window.removeEventListener('chelona-zero-latency-location-error', onError as EventListener);
      };

      const timer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          cleanup();
          reject(new Error(`Timeout geolocalizzazione FusedLocation (${timeoutMs}ms)`));
        }
      }, timeoutMs + 1000);

      const onSuccess = (e: CustomEvent) => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timer);
        cleanup();
        const pos: ZeroLatencyPosition = e.detail;
        this.lastKnownPosition = pos;
        resolve(pos);
      };

      const onError = (e: CustomEvent) => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timer);
        cleanup();
        reject(new Error(e.detail?.message || 'Errore FusedLocation nativo'));
      };

      window.addEventListener('chelona-zero-latency-location', onSuccess as EventListener);
      window.addEventListener('chelona-zero-latency-location-error', onError as EventListener);

      // Chiama il metodo Java esposto su MainActivity
      (window as any).ChelonaNative.getZeroLatencyLocation(maxAgeMs, timeoutMs);
    });
  }

  /**
   * Fallback su Capacitor Geolocation / Web Navigator
   */
  private async getCapacitorFallbackLocation(maxAgeMs: number, timeoutMs: number): Promise<ZeroLatencyPosition> {
    try {
      const pos = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: timeoutMs,
        maximumAge: maxAgeMs,
      });

      const result: ZeroLatencyPosition = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        altitude: pos.coords.altitude,
        speed: pos.coords.speed,
        heading: pos.coords.heading,
        timestamp: pos.timestamp || Date.now(),
        fromCache: (Date.now() - (pos.timestamp || Date.now())) < 5000,
        ageMs: Date.now() - (pos.timestamp || Date.now()),
        provider: 'capacitor',
      };

      this.lastKnownPosition = result;
      return result;
    } catch (capErr) {
      if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
        return new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const res: ZeroLatencyPosition = {
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
                accuracy: pos.coords.accuracy,
                altitude: pos.coords.altitude,
                speed: pos.coords.speed,
                heading: pos.coords.heading,
                timestamp: pos.timestamp || Date.now(),
                fromCache: false,
                ageMs: Date.now() - (pos.timestamp || Date.now()),
                provider: 'browser-html5',
              };
              this.lastKnownPosition = res;
              resolve(res);
            },
            (err) => reject(new Error(err.message || 'GPS fallito')),
            { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: maxAgeMs }
          );
        });
      }
      throw capErr;
    }
  }
}

export const zeroLatencyLocationService = new ZeroLatencyLocationService();
