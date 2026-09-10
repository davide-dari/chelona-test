/*
 * Configurazione Google Drive (backup/ripristino).
 *
 * ── COME OTTENERE IL CLIENT ID ──────────────────────────────────────────────
 * 1. Vai su https://console.cloud.google.com/ e crea (o seleziona) un progetto.
 * 2. Abilita l'API "Google Drive API" (APIs & Services → Library → "Google Drive API").
 * 3. Vai su "APIs & Services → OAuth consent screen":
 *    - User type: Esterno (External), aggiungi la tua email come test user.
 * 4. Vai su "APIs & Services → Credentials → Create credentials → OAuth client ID":
 *    - Application type: "Web application"
 *    - Authorized redirect URIs: aggiungi "com.davidedari.chelona://oauth2redirect"
 * 5. Copia il "Client ID" qui sotto in `clientId`.
 *
 * Ogni utente poi farà il login con il PROPRIO account Google e salverà i
 * backup nel PROPRIO Google Drive (non serve altro: il client ID identifica
 * solo l'app, non l'utente).
 * ─────────────────────────────────────────────────────────────────────────────
 */
export const GOOGLE_OAUTH = {
  // TODO: sostituisci con il tuo Client ID OAuth 2.0 di Google Cloud.
  clientId: '',

  // Custom scheme dell'app (redirect dopo il consenso Google).
  redirectUri: 'com.davidedari.chelona://oauth2redirect',

  // Scopo "drive.file": accesso solo ai file creati/condivisi con l'app.
  scope: 'https://www.googleapis.com/auth/drive.file',

  authEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revokeEndpoint: 'https://oauth2.googleapis.com/revoke',

  driveApiBase: 'https://www.googleapis.com/drive/v3',
  driveUploadBase: 'https://www.googleapis.com/upload/drive/v3',

  // Cartella Drive usata per i backup (nome).
  appFolderName: 'Chelona Backup',
};

/* Nome del file di backup su Drive */
export const GDRIVE_BACKUP_NAME = 'chelona_backup.zip';

export const GDRIVE_TOKEN_KEY = 'chelona_gdrive_token';
export const GDRIVE_PENDING_KEY = 'chelona_gdrive_pending_auth';
