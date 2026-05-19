import { Module, ProfileConfig, Folder } from '../types';
import { encryption } from './encryption';
import CryptoJS from 'crypto-js';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

const getStorageKey = (profileId: string) => `chelona_dashboard_state_enc_${profileId}`;
const PROFILES_ENC_KEY = 'chelona_profiles_enc';
const PROFILES_KEY = 'chelona_profiles';
const LEGACY_AUTH_KEY = 'chelona_auth_config';

const ENCRYPTION_PASSWORD = 'chelona_secure_vault_salt_2026';

const encryptText = (text: string): string => {
  return CryptoJS.AES.encrypt(text, ENCRYPTION_PASSWORD).toString();
};

const decryptText = (ciphertext: string): string | null => {
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, ENCRYPTION_PASSWORD);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    return decrypted || null;
  } catch (e) {
    console.error('Failed to decrypt profiles list', e);
    return null;
  }
};

export interface AppState {
  modules: Module[];
  folders: Folder[];
}

// Helper to save to external file asynchronously
const saveToExternalFile = async (filename: string, content: string) => {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await Filesystem.writeFile({
      path: `Chelona/${filename}`,
      data: content,
      directory: Directory.Documents,
      encoding: Encoding.UTF8,
      recursive: true
    });
    console.log(`[Storage] Saved to external file Chelona/${filename}`);
  } catch (err) {
    console.error(`[Storage] Error saving to external file Chelona/${filename}`, err);
  }
};

// Helper to load from external file asynchronously
const loadFromExternalFile = async (filename: string): Promise<string | null> => {
  if (!Capacitor.isNativePlatform()) return null;
  try {
    const result = await Filesystem.readFile({
      path: `Chelona/${filename}`,
      directory: Directory.Documents,
      encoding: Encoding.UTF8
    });
    console.log(`[Storage] Loaded from external file Chelona/${filename}`);
    return result.data as string;
  } catch (err) {
    console.warn(`[Storage] Error loading external file Chelona/${filename} (might not exist yet)`);
    return null;
  }
};

export const storage = {
  // Runs at app startup to sync external filesystem to localStorage cache
  initStorage: async () => {
    if (!Capacitor.isNativePlatform()) return;
    try {
      const cachedProfiles = localStorage.getItem(PROFILES_ENC_KEY);
      if (!cachedProfiles) {
        const extProfiles = await loadFromExternalFile('profiles.enc');
        if (extProfiles) {
          localStorage.setItem(PROFILES_ENC_KEY, extProfiles);
          console.log('[Storage] Restored profiles from external file system');
          window.dispatchEvent(new Event('chelona_profiles_updated'));
        }
      }
    } catch (e) {
      console.error('[Storage] Error initializing storage', e);
    }
  },

  saveRawProfiles: async (profilesEnc: string) => {
    localStorage.setItem(PROFILES_ENC_KEY, profilesEnc);
    await saveToExternalFile('profiles.enc', profilesEnc);
  },

  saveRawState: async (profileId: string, rawEncryptedState: string) => {
    localStorage.setItem(getStorageKey(profileId), rawEncryptedState);
    await saveToExternalFile(`state_${profileId}.enc`, rawEncryptedState);
  },

  saveState: async (state: AppState, key: CryptoKey, profileId: string) => {
    const encrypted = await encryption.encrypt(state, key);
    localStorage.setItem(getStorageKey(profileId), encrypted);
    // Asynchronously replicate to external filesystem
    saveToExternalFile(`state_${profileId}.enc`, encrypted).catch(console.error);
  },
  
  loadState: async (key: CryptoKey, profileId: string): Promise<AppState> => {
    let encrypted = localStorage.getItem(getStorageKey(profileId));
    
    // If not in localStorage, try reading from the external file
    if (!encrypted && Capacitor.isNativePlatform()) {
      encrypted = await loadFromExternalFile(`state_${profileId}.enc`);
      if (encrypted) {
        localStorage.setItem(getStorageKey(profileId), encrypted);
      }
    }
    
    // Migration fallback for old storage key
    if (!encrypted && profileId === 'default') {
      encrypted = localStorage.getItem('chelona_dashboard_state_enc');
    }

    if (!encrypted) return { modules: [], folders: [] };
    
    const decrypted = await encryption.decrypt(encrypted, key);
    if (!decrypted) return { modules: [], folders: [] };

    // Handle legacy state where decrypted is just an array of modules
    if (Array.isArray(decrypted)) {
      return { modules: decrypted, folders: [] };
    }

    return decrypted as AppState;
  },

  saveProfiles: (profiles: ProfileConfig[]) => {
    const encrypted = encryptText(JSON.stringify(profiles));
    localStorage.setItem(PROFILES_ENC_KEY, encrypted);
    // Asynchronously replicate to external filesystem
    saveToExternalFile('profiles.enc', encrypted).catch(console.error);
  },

  loadProfiles: (): ProfileConfig[] => {
    // Try encrypted profiles first
    let saved = localStorage.getItem(PROFILES_ENC_KEY);
    if (saved) {
      const decrypted = decryptText(saved);
      if (decrypted) {
        try {
          return JSON.parse(decrypted);
        } catch {
          return [];
        }
      }
    }
    
    // Fallback: Check old plaintext profiles key
    let plaintextSaved = localStorage.getItem(PROFILES_KEY);
    
    // MIGRATION: Se non ci sono profili Chelona, prova a cercarli sotto LifeMod
    if (!plaintextSaved && !saved) {
      const legacyProfiles = localStorage.getItem('lifemod_profiles');
      if (legacyProfiles) {
        console.log('📦 Migration: Found legacy LifeMod profiles, migrating to Chelona...');
        localStorage.setItem(PROFILES_KEY, legacyProfiles);
        plaintextSaved = legacyProfiles;
        
        // Per ogni profilo, migra anche il suo stato individuale (Dashboard)
        try {
          const profiles: ProfileConfig[] = JSON.parse(legacyProfiles);
          profiles.forEach(p => {
            const legacyStateKey = `lifemod_dashboard_state_enc_${p.id}`;
            const newStateKey = `chelona_dashboard_state_enc_${p.id}`;
            const legacyState = localStorage.getItem(legacyStateKey);
            if (legacyState && !localStorage.getItem(newStateKey)) {
              localStorage.setItem(newStateKey, legacyState);
              console.log(`✅ Migrated state for profile: ${p.username}`);
            }
          });
        } catch (e) {
          console.error('Migration failed for individual profiles', e);
        }
      }
    }

    if (plaintextSaved) {
      try {
        const parsed = JSON.parse(plaintextSaved);
        // Migrate to encrypted structure
        const encrypted = encryptText(plaintextSaved);
        localStorage.setItem(PROFILES_ENC_KEY, encrypted);
        localStorage.removeItem(PROFILES_KEY);
        saveToExternalFile('profiles.enc', encrypted).catch(console.error);
        return parsed;
      } catch {
        return [];
      }
    }
    
    // Migration check for legacy single user configuration
    const legacySaved = localStorage.getItem(LEGACY_AUTH_KEY);
    if (legacySaved) {
      try {
        const legacyConfig = JSON.parse(legacySaved);
        const defaultProfile: ProfileConfig = {
          id: 'default',
          ...legacyConfig
        };
        storage.saveProfiles([defaultProfile]);
        localStorage.removeItem(LEGACY_AUTH_KEY);
        return [defaultProfile];
      } catch {
        return [];
      }
    }
    
    return [];
  },

  clearAll: () => {
    localStorage.clear();
  }
};
