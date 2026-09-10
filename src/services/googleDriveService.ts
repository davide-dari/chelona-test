/*
 * Servizio Google Drive: backup e ripristino dei dati dell'app.
 *
 * Flusso OAuth 2.0 (Authorization Code + PKCE):
 *   1. authorize() genera code_verifier/challenge e apre l'URL di consenso.
 *   2. Google reindirizza a com.davidedari.chelona://oauth2redirect?code=...
 *   3. handleRedirect() scambia il code con access_token/refresh_token.
 *   4. I token vengono salvati in localStorage e rinnovati automaticamente.
 *
 * Drive REST API (scope drive.file): solo i file creati dall'app sono visibili.
 */
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { GOOGLE_OAUTH, GDRIVE_TOKEN_KEY, GDRIVE_PENDING_KEY } from '../constants/googleConfig';

export interface GDriveToken {
  access_token: string;
  refresh_token?: string;
  expires_at: number; // ms epoch
}

interface DriveFile {
  id: string;
  name: string;
  modifiedTime?: string;
  size?: string;
}

/* ── utility base64url ── */
const bufToB64url = (buf: ArrayBuffer): string => {
  const bytes = new Uint8Array(buf);
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const randomB64url = (len: number): string => {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  return bufToB64url(bytes.buffer);
};

const sha256 = async (str: string): Promise<ArrayBuffer> =>
  await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));

/* ── stato OAuth in corso (PKCE) ── */
let pendingVerifier: string | null = null;
let pendingState: string | null = null;
let redirectHandler: (() => void) | null = null;

const loadToken = (): GDriveToken | null => {
  try {
    const raw = localStorage.getItem(GDRIVE_TOKEN_KEY);
    return raw ? (JSON.parse(raw) as GDriveToken) : null;
  } catch {
    return null;
  }
};

const saveToken = (t: GDriveToken | null) => {
  if (t) localStorage.setItem(GDRIVE_TOKEN_KEY, JSON.stringify(t));
  else localStorage.removeItem(GDRIVE_TOKEN_KEY);
};

export const isDriveConfigured = (): boolean => Boolean(GOOGLE_OAUTH.clientId);

export const googleDrive = {
  isConfigured: (): boolean => isDriveConfigured(),

  isSignedIn: (): boolean => {
    const t = loadToken();
    return Boolean(t && (t.refresh_token || t.expires_at > Date.now()));
  },

  /* Ottiene un access_token valido (rinnovandolo se scaduto). */
  async getAccessToken(): Promise<string | null> {
    const t = loadToken();
    if (!t) return null;
    if (t.expires_at > Date.now() + 60_000) return t.access_token;

    // rinnovo con refresh_token
    if (t.refresh_token) {
      try {
        const res = await fetch(GOOGLE_OAUTH.tokenEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: GOOGLE_OAUTH.clientId,
            grant_type: 'refresh_token',
            refresh_token: t.refresh_token,
          }).toString(),
        });
        if (res.ok) {
          const d = await res.json();
          const next: GDriveToken = {
            access_token: d.access_token,
            refresh_token: t.refresh_token,
            expires_at: Date.now() + (d.expires_in ?? 3600) * 1000,
          };
          saveToken(next);
          return next.access_token;
        }
      } catch {}
    }
    return null;
  },

  /* Avvia il flusso di autorizzazione (apertura browser + callback appUrlOpen). */
  async authorize(): Promise<GDriveToken | null> {
    if (!isDriveConfigured()) throw new Error('Client ID Google non configurato.');

    pendingVerifier = randomB64url(48);
    pendingState = randomB64url(16);
    const challenge = bufToB64url(await sha256(pendingVerifier));

    const params = new URLSearchParams({
      client_id: GOOGLE_OAUTH.clientId,
      redirect_uri: GOOGLE_OAUTH.redirectUri,
      response_type: 'code',
      scope: GOOGLE_OAUTH.scope,
      code_challenge: challenge,
      code_challenge_method: 'S256',
      state: pendingState,
      access_type: 'offline',
      prompt: 'consent',
    });

    const url = `${GOOGLE_OAUTH.authEndpoint}?${params.toString()}`;
    localStorage.setItem(GDRIVE_PENDING_KEY, '1');

    // Ritorna la promessa risolta quando handleRedirect completa lo scambio.
    return new Promise<GDriveToken | null>((resolve, reject) => {
      const timeout = setTimeout(() => { cleanup(); reject(new Error('Timeout autorizzazione.')); }, 120_000);
      redirectHandler = () => {
        clearTimeout(timeout);
        const t = loadToken();
        cleanup();
        resolve(t);
      };

      if (Capacitor.isNativePlatform()) {
        // Naviga la WebView verso il consenso; il redirect rientra via appUrlOpen.
        window.location.href = url;
      } else {
        // Browser web: popup/pagina corrente.
        window.open(url, '_blank', 'noopener');
      }
    });

    function cleanup() {
      redirectHandler = null;
      pendingVerifier = null;
      pendingState = null;
      localStorage.removeItem(GDRIVE_PENDING_KEY);
    }
  },

  /* Gestisce l'URL di redirect (chiamato da appUrlOpen). Restituisce true se gestito. */
  async handleRedirect(url: string): Promise<boolean> {
    if (!url.startsWith(GOOGLE_OAUTH.redirectUri.split(':')[0])) return false;
    try {
      const u = new URL(url);
      const code = u.searchParams.get('code');
      const state = u.searchParams.get('state');
      if (!code || !pendingVerifier || (pendingState && state !== pendingState)) return false;

      const res = await fetch(GOOGLE_OAUTH.tokenEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: GOOGLE_OAUTH.clientId,
          redirect_uri: GOOGLE_OAUTH.redirectUri,
          grant_type: 'authorization_code',
          code,
          code_verifier: pendingVerifier,
        }).toString(),
      });
      if (!res.ok) return false;
      const d = await res.json();
      const token: GDriveToken = {
        access_token: d.access_token,
        refresh_token: d.refresh_token,
        expires_at: Date.now() + (d.expires_in ?? 3600) * 1000,
      };
      saveToken(token);
      redirectHandler?.();
      return true;
    } catch {
      return false;
    }
  },

  async signOut(): Promise<void> {
    const t = loadToken();
    if (t?.access_token) {
      try {
        await fetch(GOOGLE_OAUTH.revokeEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ token: t.access_token }).toString(),
        });
      } catch {}
    }
    saveToken(null);
  },

  /* Trova (o crea) la cartella "Chelona Backup". */
  async ensureFolder(accessToken: string): Promise<string> {
    const list = await fetch(
      `${GOOGLE_OAUTH.driveApiBase}/files?q=${encodeURIComponent(`name='${GOOGLE_OAUTH.appFolderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`)}&fields=files(id)`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    ).then(r => r.json());
    const existing = (list.files as DriveFile[] | undefined)?.[0];
    if (existing) return existing.id;

    const created = await fetch(`${GOOGLE_OAUTH.driveApiBase}/files`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: GOOGLE_OAUTH.appFolderName,
        mimeType: 'application/vnd.google-apps.folder',
      }),
    }).then(r => r.json());
    return created.id;
  },

  /* Carica un file di backup (multipart: metadati + contenuto). */
  async uploadBackup(content: Blob | string, filename: string): Promise<string> {
    const accessToken = await this.getAccessToken();
    if (!accessToken) throw new Error('Non autorizzato. Effettua prima il login.');

    let folderId: string;
    try {
      folderId = await this.ensureFolder(accessToken);
    } catch {
      folderId = 'root';
    }

    const metadata = {
      name: filename,
      parents: folderId && folderId !== 'root' ? [folderId] : undefined,
      mimeType: 'application/zip',
    };

    const body = new FormData();
    body.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    body.append('file', content instanceof Blob ? content : new Blob([content], { type: 'application/zip' }));

    const res = await fetch(
      `${GOOGLE_OAUTH.driveUploadBase}/files?uploadType=multipart&fields=id,name`,
      { method: 'POST', headers: { Authorization: `Bearer ${accessToken}` }, body }
    );
    if (!res.ok) throw new Error(`Upload fallito (${res.status}).`);
    const d = await res.json();
    return d.id;
  },

  /* Elenca i backup disponibili. */
  async listBackups(): Promise<DriveFile[]> {
    const accessToken = await this.getAccessToken();
    if (!accessToken) throw new Error('Non autorizzato.');
    const res = await fetch(
      `${GOOGLE_OAUTH.driveApiBase}/files?q=${encodeURIComponent("name contains 'chelona_backup' and trashed=false")}&orderBy=modifiedTime desc&fields=files(id,name,size,modifiedTime)&pageSize=50`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!res.ok) throw new Error(`Lettura elenco fallita (${res.status}).`);
    const d = await res.json();
    return (d.files as DriveFile[]) ?? [];
  },

  /* Scarica il contenuto di un backup. */
  async downloadBackup(fileId: string): Promise<Blob> {
    const accessToken = await this.getAccessToken();
    if (!accessToken) throw new Error('Non autorizzato.');
    const res = await fetch(
      `${GOOGLE_OAUTH.driveApiBase}/files/${fileId}?alt=media`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!res.ok) throw new Error(`Download fallito (${res.status}).`);
    return await res.blob();
  },

  async deleteBackup(fileId: string): Promise<void> {
    const accessToken = await this.getAccessToken();
    if (!accessToken) throw new Error('Non autorizzato.');
    await fetch(`${GOOGLE_OAUTH.driveApiBase}/files/${fileId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  },

  /* Registra il listener appUrlOpen (chiamato una volta all'avvio). */
  registerRedirectListener(): void {
    if (!Capacitor.isNativePlatform() || !CapApp || typeof CapApp.addListener !== 'function') return;
    CapApp.addListener('appUrlOpen', ({ url }) => {
      googleDrive.handleRedirect(url);
    });
    // Gestisce anche il cold start (app aperta direttamente dal redirect).
    CapApp.getLaunchUrl?.().then(launch => {
      if (launch?.url) googleDrive.handleRedirect(launch.url);
    }).catch(() => {});
  },
};
