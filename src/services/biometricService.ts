import { NativeBiometric, BiometryType } from '@capgo/capacitor-native-biometric';

/**
 * Biometric Authentication Service using Native Capacitor Plugin (@capgo/capacitor-native-biometric)
 */
export const biometricService = {
  // Check if Biometrics/FaceID is supported and available
  async isSupported(): Promise<boolean> {
    try {
      if (!NativeBiometric || typeof NativeBiometric.isAvailable !== 'function') {
        console.warn('[BiometricService] NativeBiometric plugin is not initialized.');
        return false;
      }
      const result = await NativeBiometric.isAvailable();
      return result.isAvailable;
    } catch (e) {
      console.error('[BiometricService] isSupported error:', e);
      return false;
    }
  },

  // Get biometry type
  async getBiometryType(): Promise<string> {
    try {
      if (!NativeBiometric || typeof NativeBiometric.isAvailable !== 'function') return 'None';
      const result = await NativeBiometric.isAvailable();
      if (!result.isAvailable) return 'None';
      
      switch (result.biometryType) {
        case BiometryType.FACE_ID:
        case BiometryType.FACE_AUTHENTICATION:
          return 'FaceID';
        case BiometryType.TOUCH_ID:
        case BiometryType.FINGERPRINT:
          return 'Impronta';
        default:
          return 'Biometria';
      }
    } catch (e) {
      return 'Biometria';
    }
  },

  // Save the master key securely using biometrics
  async saveMasterKey(profileId: string, masterKeyStr: string, serverKey?: string): Promise<void> {
    if (!NativeBiometric || typeof NativeBiometric.setCredentials !== 'function') {
      throw new Error('Servizio biometrico non disponibile.');
    }
    
    const key = serverKey || 'chelona.app.' + profileId;
    
    // Su Android, se esiste già una chiave per il server, setCredentials può fallire
    // ("failed to save credentials"). Tentiamo sempre di svuotare lo slot prima.
    try {
      if (typeof NativeBiometric.deleteCredentials === 'function') {
        await NativeBiometric.deleteCredentials({ server: key });
      }
    } catch (e) {
      console.warn('[BiometricService] fallback deleteCredentials', e);
    }

    await NativeBiometric.setCredentials({
      username: profileId,
      password: masterKeyStr,
      server: key,
    });
  },

  // Retrieve the master key using biometrics
  async getMasterKey(profileId: string, serverKey?: string): Promise<string | null> {
    try {
      if (!NativeBiometric || typeof NativeBiometric.getCredentials !== 'function') return null;
      
      const key = serverKey || 'chelona.app.' + profileId;
      
      const credentials = await NativeBiometric.getCredentials({
        server: key,
      });
      
      if (credentials && credentials.username === profileId) {
        return credentials.password;
      }
      return null;
    } catch (e: any) {
      console.error('[BiometricService] Failed to retrieve credentials', e);
      // Specific error handling for user cancellation or no biometrics
      if (e.message?.includes('User canceled') || e.code === 'USER_CANCELED') {
        return null;
      }
      return null;
    }
  },

  // Verify identity using biometrics (shows native prompt)
  async verifyIdentity(reason: string = 'Verifica la tua identità'): Promise<boolean> {
    try {
      if (!NativeBiometric || typeof NativeBiometric.verifyIdentity !== 'function') return false;
      await NativeBiometric.verifyIdentity({
        reason,
        title: 'Chelona — Accesso Sicuro',
        subtitle: reason,
        description: 'Usa la tua impronta digitale per accedere.',
        useDevicePasscode: true, // Allow fallback to PIN/Pattern/Password
      } as any);
      return true;
    } catch (e) {
      console.error('[BiometricService] verifyIdentity error:', e);
      return false;
    }
  },

  // Delete credentials
  async deleteCredentials(profileId: string, serverKey?: string): Promise<void> {
    if (!NativeBiometric || typeof NativeBiometric.deleteCredentials !== 'function') return;
    const key = serverKey || 'chelona.app.' + profileId;
    try {
      await NativeBiometric.deleteCredentials({
        server: key,
      });
    } catch (e) {
      console.warn('[BiometricService] Failed to delete credentials for ' + profileId, e);
    }
  }
};
