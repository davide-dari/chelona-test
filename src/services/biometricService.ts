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
  async saveMasterKey(profileId: string, masterKeyStr: string): Promise<void> {
    if (!NativeBiometric || typeof NativeBiometric.setCredentials !== 'function') {
      throw new Error('Servizio biometrico non disponibile.');
    }
    await NativeBiometric.setCredentials({
      username: profileId,
      password: masterKeyStr,
      server: 'chelona.app',
    });
  },

  // Retrieve the master key using biometrics
  async getMasterKey(profileId: string): Promise<string | null> {
    try {
      if (!NativeBiometric || typeof NativeBiometric.getCredentials !== 'function') return null;
      const credentials = await NativeBiometric.getCredentials({
        server: 'chelona.app',
      });
      
      if (credentials && credentials.username === profileId) {
        return credentials.password;
      }
      return null;
    } catch (e) {
      console.error('[BiometricService] Failed to retrieve credentials', e);
      return null;
    }
  },

  // Delete credentials
  async deleteCredentials(profileId: string): Promise<void> {
    if (!NativeBiometric || typeof NativeBiometric.deleteCredentials !== 'function') return;
    await NativeBiometric.deleteCredentials({
      server: 'chelona.app',
    });
  }
};
