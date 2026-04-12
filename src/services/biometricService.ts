import { NativeBiometric, BiometryType } from '@capgo/capacitor-native-biometric';

/**
 * Biometric Authentication Service using Native Capacitor Plugin (@capgo/capacitor-native-biometric)
 */
export const biometricService = {
  // Check if Biometrics/FaceID is supported and available
  async isSupported(): Promise<boolean> {
    try {
      const result = await NativeBiometric.isAvailable();
      return result.isAvailable;
    } catch (e) {
      return false;
    }
  },

  // Get biometry type
  async getBiometryType(): Promise<string> {
    try {
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
    await NativeBiometric.setCredentials({
      username: profileId,
      password: masterKeyStr,
      server: 'chelona.app',
    });
  },

  // Retrieve the master key using biometrics
  async getMasterKey(profileId: string): Promise<string | null> {
    try {
      const credentials = await NativeBiometric.getCredentials({
        server: 'chelona.app',
      });
      
      // The plugin might return multiple or we check the username
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
    await NativeBiometric.deleteCredentials({
      server: 'chelona.app',
    });
  }
};
