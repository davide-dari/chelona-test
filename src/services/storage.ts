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
const PUBLIC_PASSWORD = 'chelona_public_vault_key_2026';
const PUBLIC_SALT = 'public_salt_123';

const encryptText = (text: string): string => {
  return CryptoJS.AES.encrypt(text, ENCRYPTION_PASSWORD).toString();
};

const decryptText = (ciphertext: string): string | null => {
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, ENCRYPTION_PASSWORD);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    return decrypted || null;
  } catch (e) {
    console.error('Failed to decrypt generic text', e);
    return null;
  }
};

export interface AppState {
  modules: Module[];
  folders: Folder[];
}

// In-memory runtime cache
let profilesCache: ProfileConfig[] = [];
let profilesEncCache: string = '';
let stateEncCache: Record<string, string> = {};
let addressBookCache: any[] = [];
let notificationPrefsCache: any[] = [];
let notifFiredCache: Record<string, string> = {};

// Helper to save to external file asynchronously
const saveToExternalFile = async (filename: string, content: string) => {
  if (!Capacitor.isNativePlatform()) return;
  // Try Documents first, fallback to Directory.Data (which is always permitted without special permissions on Android)
  try {
    await Filesystem.writeFile({
      path: `Chelona/${filename}`,
      data: content,
      directory: Directory.Documents,
      encoding: Encoding.UTF8,
      recursive: true
    });
    console.log(`[Storage] Saved to external file Chelona/${filename} (Documents)`);
  } catch (err) {
    try {
      await Filesystem.writeFile({
        path: `Chelona/${filename}`,
        data: content,
        directory: Directory.Data,
        encoding: Encoding.UTF8,
        recursive: true
      });
      console.log(`[Storage] Saved to internal file Chelona/${filename} (Data)`);
    } catch (err2) {
      console.warn(`[Storage] Failed to save external file Chelona/${filename}`, err2);
    }
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
    return result.data as string;
  } catch {
    try {
      const result = await Filesystem.readFile({
        path: `Chelona/${filename}`,
        directory: Directory.Data,
        encoding: Encoding.UTF8
      });
      return result.data as string;
    } catch {
      return null;
    }
  }
};

export const storage = {
  // Runs at app startup to sync external filesystem to in-memory cache
  initStorage: async () => {
    try {
      // 1. Load Profiles list (check localStorage first as guaranteed storage, then check external file)
      let profilesEnc: string | null = localStorage.getItem(PROFILES_ENC_KEY);
      if (Capacitor.isNativePlatform()) {
        const fileEnc = await loadFromExternalFile('profiles.enc');
        if (fileEnc) {
          profilesEnc = fileEnc;
          // Keep localStorage in sync with external file
          localStorage.setItem(PROFILES_ENC_KEY, fileEnc);
        } else if (profilesEnc) {
          // Backup existing localStorage to external file
          saveToExternalFile('profiles.enc', profilesEnc).catch(() => {});
        }
      }

      if (profilesEnc) {
        profilesEncCache = profilesEnc;
        const decrypted = decryptText(profilesEnc);
        if (decrypted) {
          try {
            profilesCache = JSON.parse(decrypted);
          } catch {
            profilesCache = [];
          }
        }
      } else {
        // Migrate old plaintext profiles
        const plaintextSaved = localStorage.getItem(PROFILES_KEY);
        if (plaintextSaved) {
          try {
            const parsed = JSON.parse(plaintextSaved);
            const encrypted = encryptText(plaintextSaved);
            profilesCache = parsed;
            profilesEncCache = encrypted;
            localStorage.setItem(PROFILES_ENC_KEY, encrypted);
            if (Capacitor.isNativePlatform()) {
              await saveToExternalFile('profiles.enc', encrypted);
            }
            localStorage.removeItem(PROFILES_KEY);
          } catch {}
        } else {
          // Migration check for legacy single user configuration
          const legacySaved = localStorage.getItem(LEGACY_AUTH_KEY);
          if (legacySaved) {
            try {
              const legacyConfig = JSON.parse(legacySaved);
              const defaultProfile: ProfileConfig = {
                id: 'default',
                ...legacyConfig
              };
              profilesCache = [defaultProfile];
              const encrypted = encryptText(JSON.stringify(profilesCache));
              profilesEncCache = encrypted;
              localStorage.setItem(PROFILES_ENC_KEY, encrypted);
              if (Capacitor.isNativePlatform()) {
                await saveToExternalFile('profiles.enc', encrypted);
              }
              localStorage.removeItem(LEGACY_AUTH_KEY);
            } catch {}
          }
        }
      }

      // 1b. Migration: If any profile has biometrics enabled but lacks biometricServerKey, assign legacy 'chelona.app'
      let migrated = false;
      profilesCache = profilesCache.map(p => {
        if (p.isBiometricEnabled && !p.biometricServerKey) {
          p.biometricServerKey = 'chelona.app';
          migrated = true;
        }
        return p;
      });
      if (migrated) {
        const encrypted = encryptText(JSON.stringify(profilesCache));
        profilesEncCache = encrypted;
        localStorage.setItem(PROFILES_ENC_KEY, encrypted);
        if (Capacitor.isNativePlatform()) {
          saveToExternalFile('profiles.enc', encrypted).catch(() => {});
        }
      }

      // 2. Load States for all loaded profiles
      for (const p of profilesCache) {
        const storageKey = getStorageKey(p.id);
        let stateEnc: string | null = localStorage.getItem(storageKey);
        
        if (Capacitor.isNativePlatform()) {
          const fileEnc = await loadFromExternalFile(`state_${p.id}.enc`);
          if (fileEnc) {
            stateEnc = fileEnc;
            localStorage.setItem(storageKey, fileEnc);
          } else if (stateEnc) {
            saveToExternalFile(`state_${p.id}.enc`, stateEnc).catch(() => {});
          }
        }

        if (!stateEnc) {
          // MIGRATION fallback for old lifemod dashboard state
          if (p.id === 'default') {
            stateEnc = localStorage.getItem('chelona_dashboard_state_enc') || localStorage.getItem('lifemod_dashboard_state_enc_default');
          }
          if (!stateEnc) {
            const legacyStateKey = `lifemod_dashboard_state_enc_${p.id}`;
            stateEnc = localStorage.getItem(legacyStateKey);
          }

          if (stateEnc) {
            localStorage.setItem(storageKey, stateEnc);
            if (Capacitor.isNativePlatform()) {
              saveToExternalFile(`state_${p.id}.enc`, stateEnc).catch(() => {});
            }
          }
        }

        if (stateEnc) {
          stateEncCache[p.id] = stateEnc;
        }
      }

      // 3. Load Address Book
      let addressBookEnc: string | null = null;
      if (Capacitor.isNativePlatform()) {
        addressBookEnc = await loadFromExternalFile('address_book.enc');
        // Also check localStorage as fallback (guaranteed storage on Android WebView)
        if (!addressBookEnc) {
          addressBookEnc = localStorage.getItem('chelona_address_book_enc');
        }
      }
      if (!addressBookEnc) {
        // Fallback/Migration: old AddressBook was stored as plaintext JSON in 'chelona_address_book'
        const legacyAddressBook = localStorage.getItem('chelona_address_book');
        if (legacyAddressBook) {
          try {
            const encrypted = encryptText(legacyAddressBook);
            addressBookEnc = encrypted;
            if (Capacitor.isNativePlatform()) {
              await saveToExternalFile('address_book.enc', encrypted);
              localStorage.removeItem('chelona_address_book');
            } else {
              localStorage.setItem('chelona_address_book_enc', encrypted);
              localStorage.removeItem('chelona_address_book');
            }
          } catch {}
        } else {
          // Web fallback check if chelona_address_book_enc is present
          addressBookEnc = localStorage.getItem('chelona_address_book_enc');
        }
      }
      if (addressBookEnc) {
        const decrypted = decryptText(addressBookEnc);
        if (decrypted) {
          try {
            addressBookCache = JSON.parse(decrypted);
          } catch {}
        }
      }

      // 4. Load Notification Prefs
      let notifPrefsEnc: string | null = null;
      if (Capacitor.isNativePlatform()) {
        notifPrefsEnc = await loadFromExternalFile('notification_prefs.enc');
        // Also check localStorage as fallback (guaranteed storage on Android WebView)
        if (!notifPrefsEnc) {
          notifPrefsEnc = localStorage.getItem('chelona_notification_prefs_enc');
        }
      }
      if (!notifPrefsEnc) {
        // Fallback/Migration: diari_notification_prefs / chelona_notification_prefs was stored in plaintext
        let legacyPrefs = localStorage.getItem('diari_notification_prefs') || localStorage.getItem('chelona_notification_prefs');
        if (legacyPrefs) {
          try {
            const encrypted = encryptText(legacyPrefs);
            notifPrefsEnc = encrypted;
            if (Capacitor.isNativePlatform()) {
              await saveToExternalFile('notification_prefs.enc', encrypted);
              localStorage.removeItem('diari_notification_prefs');
              localStorage.removeItem('chelona_notification_prefs');
            } else {
              localStorage.setItem('chelona_notification_prefs_enc', encrypted);
              localStorage.removeItem('diari_notification_prefs');
              localStorage.removeItem('chelona_notification_prefs');
            }
          } catch {}
        } else {
          // Web fallback
          notifPrefsEnc = localStorage.getItem('chelona_notification_prefs_enc');
        }
      }
      if (notifPrefsEnc) {
        const decrypted = decryptText(notifPrefsEnc);
        if (decrypted) {
          try {
            notificationPrefsCache = JSON.parse(decrypted);
          } catch {}
        }
      }

      // 5. Load Notification Fired list
      let notifFiredEnc: string | null = null;
      if (Capacitor.isNativePlatform()) {
        notifFiredEnc = await loadFromExternalFile('notif_fired.enc');
      }
      if (!notifFiredEnc) {
        // Fallback/Migration: scan localStorage for keys matching 'notif_fired_*'
        const legacyFired: Record<string, string> = {};
        let hasLegacy = false;
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('notif_fired_')) {
            const val = localStorage.getItem(key);
            if (val) {
              legacyFired[key] = val;
              hasLegacy = true;
            }
          }
        }
        if (hasLegacy) {
          try {
            const encrypted = encryptText(JSON.stringify(legacyFired));
            notifFiredEnc = encrypted;
            if (Capacitor.isNativePlatform()) {
              await saveToExternalFile('notif_fired.enc', encrypted);
              // Clean up localStorage keys
              Object.keys(legacyFired).forEach(k => localStorage.removeItem(k));
            } else {
              localStorage.setItem('chelona_notif_fired_enc', encrypted);
              Object.keys(legacyFired).forEach(k => localStorage.removeItem(k));
            }
          } catch {}
        } else {
          // Web fallback
          notifFiredEnc = localStorage.getItem('chelona_notif_fired_enc');
        }
      }
      if (notifFiredEnc) {
        const decrypted = decryptText(notifFiredEnc);
        if (decrypted) {
          try {
            notifFiredCache = JSON.parse(decrypted);
          } catch {}
        }
      }

      console.log('[Storage] Native/External storage initialization complete.');
      // Notify the application that profiles list has loaded
      window.dispatchEvent(new Event('chelona_profiles_updated'));
    } catch (e) {
      console.error('[Storage] Error initializing storage', e);
      // Still dispatch update event to avoid blockages
      window.dispatchEvent(new Event('chelona_profiles_updated'));
    }
  },

  saveRawProfiles: async (profilesEnc: string) => {
    profilesEncCache = profilesEnc;
    const decrypted = decryptText(profilesEnc);
    if (decrypted) {
      try {
        profilesCache = JSON.parse(decrypted);
      } catch {}
    }
    // Always persist to localStorage
    try {
      localStorage.setItem(PROFILES_ENC_KEY, profilesEnc);
    } catch (e) {
      console.error('[Storage] Error saving raw profiles to localStorage', e);
    }
    if (Capacitor.isNativePlatform()) {
      saveToExternalFile('profiles.enc', profilesEnc).catch(() => {});
    }
    window.dispatchEvent(new Event('chelona_profiles_updated'));
  },

  saveRawState: async (profileId: string, rawEncryptedState: string) => {
    stateEncCache[profileId] = rawEncryptedState;
    try {
      localStorage.setItem(getStorageKey(profileId), rawEncryptedState);
    } catch (e) {
      console.error('[Storage] Error saving raw state to localStorage', e);
    }
    if (Capacitor.isNativePlatform()) {
      saveToExternalFile(`state_${profileId}.enc`, rawEncryptedState).catch(() => {});
    }
  },

  saveState: async (state: AppState, key: CryptoKey, profileId: string) => {
    const encrypted = await encryption.encrypt(state, key);
    stateEncCache[profileId] = encrypted;
    try {
      localStorage.setItem(getStorageKey(profileId), encrypted);
    } catch (e) {
      console.error('[Storage] Error saving state to localStorage', e);
    }
    if (Capacitor.isNativePlatform()) {
      saveToExternalFile(`state_${profileId}.enc`, encrypted).catch(() => {});
    }
  },

  getPublicKey: async (): Promise<CryptoKey> => {
    return await encryption.deriveKey(PUBLIC_PASSWORD, PUBLIC_SALT);
  },

  savePublicState: async (state: AppState, profileId: string) => {
    const key = await storage.getPublicKey();
    const encrypted = await encryption.encrypt(state, key);
    try {
      localStorage.setItem(`chelona_public_state_${profileId}`, encrypted);
    } catch (e) {}
    if (Capacitor.isNativePlatform()) {
      saveToExternalFile(`state_public_${profileId}.enc`, encrypted).catch(() => {});
    }
  },

  loadPublicState: async (profileId: string): Promise<AppState> => {
    let encrypted: string | null = localStorage.getItem(`chelona_public_state_${profileId}`);
    if (!encrypted && Capacitor.isNativePlatform()) {
      encrypted = await loadFromExternalFile(`state_public_${profileId}.enc`);
    }
    if (!encrypted) return { modules: [], folders: [] };
    try {
      const key = await storage.getPublicKey();
      const decrypted = await encryption.decrypt(encrypted, key);
      return (decrypted as AppState) || { modules: [], folders: [] };
    } catch {
      return { modules: [], folders: [] };
    }
  },

  savePrivateState: async (privateModules: Module[], key: CryptoKey, profileId: string) => {
    const encrypted = await encryption.encrypt(privateModules, key);
    try {
      localStorage.setItem(`chelona_private_state_${profileId}`, encrypted);
    } catch (e) {}
    if (Capacitor.isNativePlatform()) {
      saveToExternalFile(`state_private_${profileId}.enc`, encrypted).catch(() => {});
    }
  },

  loadPrivateState: async (key: CryptoKey, profileId: string): Promise<Module[]> => {
    let encrypted: string | null = localStorage.getItem(`chelona_private_state_${profileId}`);
    if (!encrypted && Capacitor.isNativePlatform()) {
      encrypted = await loadFromExternalFile(`state_private_${profileId}.enc`);
    }
    if (!encrypted) return [];
    try {
      const decrypted = await encryption.decrypt(encrypted, key);
      return (decrypted as Module[]) || [];
    } catch {
      return [];
    }
  },

  loadState: async (key: CryptoKey, profileId: string): Promise<AppState> => {
    let encrypted = stateEncCache[profileId];
    if (!encrypted) {
      encrypted = localStorage.getItem(getStorageKey(profileId)) || undefined;
      if (!encrypted && Capacitor.isNativePlatform()) {
        encrypted = (await loadFromExternalFile(`state_${profileId}.enc`)) || undefined;
      }
      if (encrypted) {
        stateEncCache[profileId] = encrypted;
      }
    }
    if (!encrypted) return { modules: [], folders: [] };

    const decrypted = await encryption.decrypt(encrypted, key);
    if (!decrypted) return { modules: [], folders: [] };

    if (Array.isArray(decrypted)) {
      return { modules: decrypted, folders: [] };
    }
    return decrypted as AppState;
  },

  saveProfiles: (profiles: ProfileConfig[]) => {
    profilesCache = profiles;
    const encrypted = encryptText(JSON.stringify(profiles));
    profilesEncCache = encrypted;
    try {
      localStorage.setItem(PROFILES_ENC_KEY, encrypted);
    } catch (e) {
      console.error('[Storage] Error saving profiles to localStorage', e);
    }
    if (Capacitor.isNativePlatform()) {
      saveToExternalFile('profiles.enc', encrypted).catch(() => {});
    }
    window.dispatchEvent(new Event('chelona_profiles_updated'));
  },

  loadProfiles: (): ProfileConfig[] => {
    return profilesCache;
  },

  clearAll: () => {
    profilesCache = [];
    profilesEncCache = '';
    stateEncCache = {};
    addressBookCache = [];
    notificationPrefsCache = [];
    notifFiredCache = {};
    localStorage.clear();
  },

  getRawProfiles: (): string => {
    return profilesEncCache;
  },

  getRawState: (profileId: string): string => {
    return stateEncCache[profileId] || '';
  },

  loadAddressBook: (): any[] => {
    return addressBookCache;
  },

  saveAddressBook: (addresses: any[]) => {
    addressBookCache = addresses;
    const encrypted = encryptText(JSON.stringify(addresses));
    // Always write to localStorage first (guaranteed on Android WebView)
    try {
      localStorage.setItem('chelona_address_book_enc', encrypted);
    } catch (e) {
      console.error('[Storage] Error saving address book to localStorage', e);
    }
    if (Capacitor.isNativePlatform()) {
      saveToExternalFile('address_book.enc', encrypted).catch(console.error);
    }
  },

  loadNotificationPrefs: (): any[] => {
    return notificationPrefsCache;
  },

  saveNotificationPrefs: (prefs: any[]) => {
    notificationPrefsCache = prefs;
    const encrypted = encryptText(JSON.stringify(prefs));
    // Always write to localStorage first (guaranteed on Android WebView)
    try {
      localStorage.setItem('chelona_notification_prefs_enc', encrypted);
    } catch (e) {
      console.error('[Storage] Error saving notification prefs to localStorage', e);
    }
    if (Capacitor.isNativePlatform()) {
      saveToExternalFile('notification_prefs.enc', encrypted).catch(console.error);
    }
  },

  loadNotifFired: (prefId: string): string | null => {
    const key = `notif_fired_${prefId}`;
    return notifFiredCache[key] || null;
  },

  saveNotifFired: (prefId: string, fireKey: string) => {
    const key = `notif_fired_${prefId}`;
    notifFiredCache[key] = fireKey;
    const encrypted = encryptText(JSON.stringify(notifFiredCache));
    // Always write to localStorage first (guaranteed on Android WebView)
    try {
      localStorage.setItem('chelona_notif_fired_enc', encrypted);
    } catch (e) {
      console.error('[Storage] Error saving notif fired to localStorage', e);
    }
    if (Capacitor.isNativePlatform()) {
      saveToExternalFile('notif_fired.enc', encrypted).catch(console.error);
    }
  }
};
