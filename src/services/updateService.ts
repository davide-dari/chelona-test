import { Filesystem, Directory } from '@capacitor/filesystem';
import { ApkInstaller } from '@bixbyte/capacitor-apk-installer';
import { CapacitorHttp, Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { APP_VERSION } from '../constants/version';

const GITHUB_OWNER = 'davide-dari';
const GITHUB_REPO = 'chelona-test';

export interface UpdateInfo {
  available: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseNotes: string;
  downloadUrl: string;
}

class UpdateService {
  private currentVersion = APP_VERSION;

  async checkForUpdates(): Promise<UpdateInfo | null> {
    if (Capacitor.isNativePlatform()) {
      try {
        const info = await CapacitorApp.getInfo();
        if (info && info.version) {
          this.currentVersion = info.version;
        }
      } catch (e) {
        console.warn('[UpdateService] Impossibile recuperare versione nativa', e);
      }
    }

    console.log(`[UpdateService] Checking for updates... Current version: ${this.currentVersion}`);
    try {
      const response = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`, {
        cache: 'no-store',
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Chelona-App-Updater',
          'Cache-Control': 'no-cache'
        }
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'No error body');
        console.error(`[UpdateService] GitHub API error: ${response.status} ${response.statusText} - ${errorText}`);
        return null;
      }

      const data = await response.json();
      if (!data || !data.tag_name) {
        console.error('[UpdateService] Unexpected GitHub API response format (no tag_name)');
        return null;
      }

      const latestVersion = data.tag_name.replace('v', '');
      console.log(`[UpdateService] Latest version on GitHub: ${latestVersion}`);

      const comparison = this.compareVersions(latestVersion, this.currentVersion);
      console.log(`[UpdateService] Comparison: ${comparison} (1=update available)`);

      if (comparison > 0) {
        const apkAsset = data.assets?.find((asset: any) => asset.name.endsWith('.apk'));
        if (!apkAsset) {
          console.warn('[UpdateService] No APK found in release assets.');
          return null;
        }
        console.log(`[UpdateService] Update found! APK URL: ${apkAsset.browser_download_url}`);
        return {
          available: true,
          currentVersion: this.currentVersion,
          latestVersion,
          releaseNotes: data.body || '',
          downloadUrl: apkAsset.browser_download_url
        };
      } else {
        console.log('[UpdateService] App is up to date.');
      }
    } catch (error: any) {
      console.error('[UpdateService] Error checking for updates:', error);
    }
    return null;
  }

  async downloadAndInstall(updateInfo: UpdateInfo, onProgress?: (p: number) => void) {
    if (!updateInfo.downloadUrl) {
      throw new Error("L'URL di download non è valido.");
    }

    console.log(`[UpdateService] Starting update flow for v${updateInfo.latestVersion}`);

    // ── STEP 1: Check & request install permission ──────────────────────────
    if (Capacitor.isNativePlatform()) {
      console.log('[UpdateService] Checking install permission...');
      const { hasPermission } = await ApkInstaller.checkInstallPermission();
      if (!hasPermission) {
        console.log('[UpdateService] Permission not granted — redirecting to Settings...');
        await ApkInstaller.requestInstallPermission();
        throw new Error("Abilita l'installazione da questa sorgente nelle Impostazioni, poi premi di nuovo 'Installa Ora'.");
      }
      console.log('[UpdateService] Install permission OK.');
    }

    if (onProgress) onProgress(5);

    // ── STEP 2: Download APK via Filesystem.downloadFile ──
    const fileName = `chelona_v${updateInfo.latestVersion}.apk`;
    const downloadUrl = updateInfo.downloadUrl;

    console.log(`[UpdateService] Downloading APK via Filesystem.downloadFile from: ${downloadUrl}`);
    if (onProgress) onProgress(10);

    try {
      // Clean up any old file before downloading
      await Filesystem.deleteFile({ path: fileName, directory: Directory.Cache }).catch(() => {});

      let actualUrl = downloadUrl;
      try {
        // Try to resolve the redirect natively
        const headRes = await CapacitorHttp.request({ url: downloadUrl, method: 'HEAD' });
        if (headRes.url && headRes.url !== downloadUrl) actualUrl = headRes.url;
        else if (headRes.headers?.Location) actualUrl = headRes.headers.Location;
        else if (headRes.headers?.location) actualUrl = headRes.headers.location;
      } catch (e) {
        console.warn('[UpdateService] Redirect resolution failed:', e);
      }

      let progressListener: any;
      if (onProgress) {
        progressListener = await Filesystem.addListener('progress', (status: any) => {
          if (status.contentLength > 0) {
            const percent = status.bytes / status.contentLength;
            onProgress(10 + Math.floor(percent * 80));
          }
        });
      }

      // Race the download against a timeout
      const downloadPromise = Filesystem.downloadFile({
        url: actualUrl,
        path: fileName,
        directory: Directory.Cache,
        progress: true,
        connectTimeout: 30000,
        readTimeout: 120000
      });

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('TIMEOUT')), 300000); // 5 minutes total
      });

      try {
        await Promise.race([downloadPromise, timeoutPromise]);
      } catch (primaryDlError) {
        console.warn('[UpdateService] Filesystem.downloadFile failed, trying fetch fallback...', primaryDlError);
        
        // Base64 Fetch Fallback
        const response = await fetch(downloadUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const blob = await response.blob();
        const reader = new FileReader();
        const base64Data = await new Promise<string>((resolve, reject) => {
          reader.onloadend = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });

        await Filesystem.writeFile({
          path: fileName,
          directory: Directory.Cache,
          data: base64Data
        });
      }
      
      if (progressListener) {
        progressListener.remove();
      }

      if (onProgress) onProgress(90);
      console.log(`[UpdateService] APK written to cache: ${fileName}`);

    } catch (dlError: any) {
      console.error('[UpdateService] All download methods failed:', dlError);

      // ── FALLBACK: Open in system browser ──────────────────────────────────
      console.log('[UpdateService] Falling back to system browser download...');
      window.open(downloadUrl, '_system');
      throw new Error(
        "Il download in-app non è riuscito. " +
        "L'APK si sta scaricando nel browser. " +
        "Una volta completato, tocca la notifica per installarlo."
      );
    }

    // ── STEP 4: Resolve absolute file path ──────────────────────────────────
    let absolutePath: string;
    try {
      const { uri } = await Filesystem.getUri({ path: fileName, directory: Directory.Cache });
      absolutePath = uri.replace(/^file:\/\//, '');
      console.log(`[UpdateService] Resolved path: ${absolutePath}`);
    } catch (uriErr: any) {
      console.error('[UpdateService] getUri failed:', uriErr);
      throw new Error("Impossibile trovare il file scaricato.");
    }

    // ── STEP 5: Install APK ─────────────────────────────────────────────────
    if (onProgress) onProgress(95);
    console.log(`[UpdateService] Installing APK from: ${absolutePath}`);

    try {
      await ApkInstaller.installApk({ filePath: absolutePath });
      if (onProgress) onProgress(100);
      console.log('[UpdateService] Install intent triggered.');
    } catch (installErr: any) {
      console.error('[UpdateService] installApk failed:', installErr);
      throw new Error(`Errore installazione: ${installErr.message || JSON.stringify(installErr)}`);
    }
  }

  private compareVersions(v1: string, v2: string): number {
    const cleanV1 = v1.replace(/[^0-9.]/g, '');
    const cleanV2 = v2.replace(/[^0-9.]/g, '');
    const parts1 = cleanV1.split('.').map(Number);
    const parts2 = cleanV2.split('.').map(Number);
    for (let i = 0; i < 3; i++) {
      const p1 = parts1[i] || 0;
      const p2 = parts2[i] || 0;
      if (p1 > p2) return 1;
      if (p1 < p2) return -1;
    }
    return 0;
  }
}

export const updateService = new UpdateService();
