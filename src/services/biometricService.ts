/**
 * Biometric Authentication Service using WebAuthn API
 */

export const biometricService = {
  // Check if WebAuthn is supported and biometrics are available
  async isSupported(): Promise<boolean> {
    return (
      window.PublicKeyCredential !== undefined &&
      typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function' &&
      await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
    );
  },

  // Register a new biometric credential
  async register(username: string): Promise<{ credentialId: string; publicKey: string } | null> {
    try {
      const challenge = crypto.getRandomValues(new Uint8Array(32));
      const userId = crypto.getRandomValues(new Uint8Array(16));

      const options: PublicKeyCredentialCreationOptions = {
        challenge,
        rp: {
          name: 'Chelona Secure',
          id: window.location.hostname
        },
        user: {
          id: userId,
          name: username,
          displayName: username
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' }, // ES256
          { alg: -257, type: 'public-key' } // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required'
        },
        timeout: 60000,
        attestation: 'none'
      };

      const credential = await navigator.credentials.create({ publicKey: options }) as PublicKeyCredential;

      if (!credential) return null;

      return {
        credentialId: btoa(String.fromCharCode(...new Uint8Array(credential.rawId))),
        publicKey: 'verified' // In a real server-side app, we'd store the actual public key
      };
    } catch (e: any) {
      console.error('Biometric registration failed', e);
      if (e.message && e.message.includes('publickey-credentials-create')) {
        throw new Error('Per utilizzare il FaceID/TouchID, apri l\'app in una nuova scheda cliccando l\'icona in alto a destra. L\'anteprima non supporta questa funzione di sicurezza.');
      }
      return null;
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
