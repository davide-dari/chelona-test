/**
 * Advanced Encryption Service using Web Crypto API
 * Provides KeePass-level security with AES-GCM and PBKDF2
 */

export const encryption = {
  // Derive a key from password and salt using PBKDF2
  async deriveKey(password: string, salt: string, iterations = 600000): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);
    const saltBuffer = encoder.encode(salt);

    // PBKDF2 with 600,000 iterations for military-grade protection
    const baseKey = await crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );

    // Deriving a 256-bit AES-GCM key (AES-256 Standard)
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: saltBuffer,
        iterations,
        hash: 'SHA-256'
      },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
  },

  // Export a key to a string (base64) for temporary storage if needed
  async exportKey(key: CryptoKey): Promise<string> {
    const exported = await crypto.subtle.exportKey('raw', key);
    return btoa(String.fromCharCode(...new Uint8Array(exported)));
  },

  // Import a key from a base64 string
  async importKey(keyStr: string): Promise<CryptoKey> {
    const binary = atob(keyStr);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return crypto.subtle.importKey(
      'raw',
      bytes,
      'AES-GCM',
      true,
      ['encrypt', 'decrypt']
    );
  },

  // Encrypt data with a CryptoKey
  async encrypt(data: any, key: CryptoKey): Promise<string> {
    const encoder = new TextEncoder();
    const json = JSON.stringify(data);
    const encodedData = encoder.encode(json);
    
    // Initialization Vector (IV) - 12 bytes for GCM
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    const encryptedContent = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encodedData
    );

    // Combine IV and encrypted content
    const combined = new Uint8Array(iv.length + encryptedContent.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encryptedContent), iv.length);

    return btoa(String.fromCharCode(...combined));
  },

  // Decrypt data with a CryptoKey
  async decrypt(ciphertext: string, key: CryptoKey): Promise<any> {
    try {
      const binary = atob(ciphertext);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }

      const iv = bytes.slice(0, 12);
      const data = bytes.slice(12);

      const decryptedContent = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        data
      );

      const decoder = new TextDecoder();
      return JSON.parse(decoder.decode(decryptedContent));
    } catch (e) {
      console.error('Decryption failed', e);
      return null;
    }
  },

  // Simple hash for password comparison (using SHA-256)
  async hashPassword(password: string, salt: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + salt);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  },

  // Generate a random salt
  generateSalt(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
  }
};
