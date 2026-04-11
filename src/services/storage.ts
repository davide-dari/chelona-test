import { Module, ProfileConfig, Folder } from '../types';
import { encryption } from './encryption';

const getStorageKey = (profileId: string) => `chelona_dashboard_state_enc_${profileId}`;
const PROFILES_KEY = 'chelona_profiles';
const LEGACY_AUTH_KEY = 'chelona_auth_config';

export interface AppState {
  modules: Module[];
  folders: Folder[];
}

export const storage = {
  saveState: async (state: AppState, key: CryptoKey, profileId: string) => {
    const encrypted = await encryption.encrypt(state, key);
    localStorage.setItem(getStorageKey(profileId), encrypted);
  },
  
  loadState: async (key: CryptoKey, profileId: string): Promise<AppState> => {
    let encrypted = localStorage.getItem(getStorageKey(profileId));
    
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
    localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
  },

  loadProfiles: (): ProfileConfig[] => {
    let saved = localStorage.getItem(PROFILES_KEY);
    
    // 🚚 MIGRATION: Se non ci sono profili Chelona, prova a cercarli sotto LifeMod
    if (!saved) {
      const legacyProfiles = localStorage.getItem('lifemod_profiles');
      if (legacyProfiles) {
        console.log('📦 Migration: Found legacy LifeMod profiles, migrating to Chelona...');
        localStorage.setItem(PROFILES_KEY, legacyProfiles);
        saved = legacyProfiles;
        
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

    if (saved) {
      try {
        return JSON.parse(saved);
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
        // Automatically save new format and remove old
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
