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
    console.log(`[UpdateService] Checking for updates... Current version: ${this.currentVersion}`);
    try {
      const response = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Chelona-App-Updater'
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

    // ── STEP 2: Download APK via CapacitorHttp (native OkHttp, no CORS, no redirect issues) ──
    // CapacitorHttp.request with responseType 'arraybuffer' downloads natively and
    // returns the binary data as a base64 string. This bypasses WebView entirely and
    // avoids the broken/deprecated Filesystem.downloadFile.
    const fileName = `chelona_v${updateInfo.latestVersion}.apk`;
    const downloadUrl = updateInfo.downloadUrl;

    console.log(`[UpdateService] Downloading APK via CapacitorHttp from: ${downloadUrl}`);
    if (onProgress) onProgress(10);

    let base64Data: string;
    try {
      // Race the download against a 2-minute timeout
      const downloadPromise = CapacitorHttp.request({
        method: 'GET',
        url: downloadUrl,
        responseType: 'arraybuffer',
        headers: { 'User-Agent': 'Chelona-App-Updater' },
        connectTimeout: 30000,
        readTimeout: 120000
      });

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('TIMEOUT')), 150000); // 2.5 min total
      });

      const dlResp = await Promise.race([downloadPromise, timeoutPromise]);

      console.log(`[UpdateService] CapacitorHttp GET status: ${dlResp.status}, url: ${dlResp.url}`);

      if (dlResp.status < 200 || dlResp.status >= 300) {
        throw new Error(`Server responded with ${dlResp.status}`);
      }

      // On native Android, CapacitorHttp returns arraybuffer data as base64 string
      if (typeof dlResp.data === 'string' && dlResp.data.length > 0) {
        base64Data = dlResp.data;
      } else {
        throw new Error('Response data is empty or not in expected format');
      }

      if (onProgress) onProgress(75);
      console.log(`[UpdateService] Download complete (${Math.round(base64Data.length / 1024)}KB base64). Writing to cache...`);

    } catch (dlError: any) {
      console.error('[UpdateService] CapacitorHttp download failed:', dlError);

      // ── FALLBACK: Open in system browser ──────────────────────────────────
      // If the native download fails for any reason, open the URL in the system
      // browser which uses Android's DownloadManager — always works.
      console.log('[UpdateService] Falling back to system browser download...');
      window.open(downloadUrl, '_system');
      throw new Error(
        "Il download in-app non è riuscito. " +
        "L'APK si sta scaricando nel browser. " +
        "Una volta completato, tocca la notifica per installarlo."
      );
    }

    // ── STEP 3: Write to cache via Filesystem.writeFile (stable, NOT deprecated) ──
    try {
      await Filesystem.deleteFile({ path: fileName, directory: Directory.Cache }).catch(() => {});

      await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: Directory.Cache
        // No encoding = base64 binary write mode
      });

      if (onProgress) onProgress(90);
      console.log(`[UpdateService] APK written to cache: ${fileName}`);
    } catch (writeErr: any) {
      console.error('[UpdateService] writeFile failed:', writeErr);
      window.open(downloadUrl, '_system');
      throw new Error(
        "Errore nella scrittura del file. " +
        "L'APK si sta scaricando nel browser."
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
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);
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
