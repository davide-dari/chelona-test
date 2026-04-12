/**
 * Biometric Authentication Service using WebAuthn API
 */

export const biometricService = {
  // Check if WebAuthn is supported
  async isSupported(): Promise<boolean> {
    const isBasicSupported = window.PublicKeyCredential !== undefined;
    
    if (!isBasicSupported) {
      console.warn('[BiometricService] WebAuthn PublicKeyCredential not found.');
      return false;
    }

    try {
      // Some WebViews return false even if biometric hardware is present until enrollment is attempted
      const isUVPAAvailable = typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function' 
        ? await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
        : false;
      
      console.log(`[BiometricService] UVPA Available: ${isUVPAAvailable}`);
      // Return true if API exists, let the enrollment attempt decide the final outcome
      return true;
    } catch (e) {
      console.error('[BiometricService] UVPA check error', e);
      return true; // Fallback to true to allow enrollment attempt
    }
  },

  // Register a new biometric credential
  async register(username: string): Promise<{ credentialId: string; publicKey: string } | null> {
    try {
      console.log(`[BiometricService] Starting registration for: ${username}`);
      const challenge = crypto.getRandomValues(new Uint8Array(32));
      const userId = crypto.getRandomValues(new Uint8Array(16));

      const options: PublicKeyCredentialCreationOptions = {
        challenge,
        rp: {
          name: 'Chelona Secure',
          id: window.location.hostname === 'localhost' ? 'localhost' : window.location.hostname
        },
        user: {
          id: userId,
          name: username,
          displayName: username
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' } // ES256 - most widely supported
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          residentKey: 'preferred',
          requireResidentKey: false
        },
        timeout: 60000,
        attestation: 'none'
      };

      console.log('[BiometricService] Calling navigator.credentials.create...');
      const credential = await navigator.credentials.create({ publicKey: options }) as PublicKeyCredential;

      if (!credential) return null;

      // Convert rawId to Base64url (cleaner than btoa)
      const credentialId = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');

      return {
        credentialId,
        publicKey: 'verified'
      };
    } catch (e: any) {
      console.error('Biometric registration failed:', e);
      if (e.name === 'NotAllowedError') {
        throw new Error('Inserimento impronta annullato o non autorizzato.');
      }
      if (e.message && e.message.includes('publickey-credentials-create')) {
        throw new Error('L\'anteprima browser non supporta la biometria. Per favore apri l\'app esternamente o installala.');
      }
      throw e;
    }
  },

  // Authenticate with biometrics
  async authenticate(credentialId: string): Promise<Uint8Array | null> {
    try {
      const challenge = crypto.getRandomValues(new Uint8Array(32));
      const idBuffer = new Uint8Array(atob(credentialId).split('').map(c => c.charCodeAt(0)));

      const options: PublicKeyCredentialRequestOptions = {
        challenge,
        allowCredentials: [{
          id: idBuffer,
          type: 'public-key'
        }],
        userVerification: 'required',
        timeout: 60000
      };

      const assertion = await navigator.credentials.get({ publicKey: options }) as PublicKeyCredential;

      if (!assertion) return null;

      // We use the signature as a seed for a key
      const response = assertion.response as AuthenticatorAssertionResponse;
      return new Uint8Array(response.signature);
    } catch (e: any) {
      console.error('Biometric authentication failed', e);
      if (e.message && e.message.includes('publickey-credentials-get')) {
        throw new Error('Per utilizzare il FaceID/TouchID, apri l\'app in una nuova scheda cliccando l\'icona in alto a destra. L\'anteprima non supporta questa funzione di sicurezza.');
      }
      return null;
    }
  }
};
