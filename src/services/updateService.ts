import { Filesystem, Directory } from '@capacitor/filesystem';
import { ApkInstaller } from '@bixbyte/capacitor-apk-installer';
import { CapacitorHttp, Capacitor } from '@capacitor/core';
import { APP_VERSION } from '../constants/version';
import { notificationService } from './notificationService';

const GITHUB_OWNER = 'davide-dari';
const GITHUB_REPO = 'chelona-test';
const GITHUB_TOKEN = atob('Z2hwX3hMTTJvUnlneHRqY05uRXRPWWFmMGN1VEc1aFRQM21LVkQ1');

export interface UpdateInfo {
  available: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseNotes: string;
  downloadUrl: string;
  assetApiUrl?: string;
}

class UpdateService {
  private currentVersion = APP_VERSION;

  async checkForUpdates(): Promise<UpdateInfo | null> {
    const snoozedVersion = localStorage.getItem('chelona_update_snoozed_version');
    const snoozedUntil = parseInt(localStorage.getItem('chelona_update_snoozed_until') || '0', 10);

    console.log(`[UpdateService] Checking for updates... Current version: ${this.currentVersion}`);
    try {
      const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases?per_page=100`;
      let response: Response;

      try {
        response = await fetch(url, {
          cache: 'no-store',
          headers: {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'Chelona-App-Updater',
            'Authorization': `Bearer ${GITHUB_TOKEN}`,
            'Cache-Control': 'no-cache'
          }
        });
      } catch (err) {
        console.warn('[UpdateService] Primary fetch failed, falling back to public request:', err);
        response = await fetch(url, {
          cache: 'no-store',
          headers: {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'Chelona-App-Updater',
            'Cache-Control': 'no-cache'
          }
        });
      }

      if (!response.ok && (response.status === 401 || response.status === 403)) {
        console.warn(`[UpdateService] Auth returned ${response.status} — retrying unauthenticated...`);
        response = await fetch(url, {
          cache: 'no-store',
          headers: {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'Chelona-App-Updater',
            'Cache-Control': 'no-cache'
          }
        });
      }

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'No error body');
        console.error(`[UpdateService] GitHub API error: ${response.status} ${response.statusText} - ${errorText}`);
        return null;
      }

      const releases = await response.json();
      if (!Array.isArray(releases) || releases.length === 0) {
        console.error('[UpdateService] Unexpected GitHub API response format (no releases)');
        return null;
      }

      // Find latest valid release with uploaded APK
      let validRelease: any = null;
      let validApkAsset: any = null;

      for (const release of releases) {
        if (!release || !release.tag_name || release.draft) continue;
        const apkAsset = release.assets?.find((asset: any) => 
          asset.name.endsWith('.apk') && asset.state === 'uploaded' && asset.size > 1000000
        );
        if (apkAsset) {
          validRelease = release;
          validApkAsset = apkAsset;
          break;
        }
      }

      if (!validRelease || !validApkAsset) {
        console.warn('[UpdateService] No valid release with completed APK found.');
        return null;
      }

      const latestVersion = validRelease.tag_name.replace('v', '');
      console.log(`[UpdateService] Latest valid version on GitHub: ${latestVersion}`);

      const comparison = this.compareVersions(latestVersion, this.currentVersion);
      console.log(`[UpdateService] Comparison: ${comparison} (1=update available)`);

      if (comparison > 0) {
        if (snoozedVersion === latestVersion && Date.now() < snoozedUntil) {
          console.log(`[UpdateService] Update ${latestVersion} snoozed until ${new Date(snoozedUntil).toISOString()}`);
          return null;
        }

        console.log(`[UpdateService] Update found! APK Asset URL: ${validApkAsset.url}`);
        
        const lastNotified = localStorage.getItem('chelona_last_notified_update');
        if (lastNotified !== latestVersion) {
          notificationService.fire('Aggiornamento Disponibile', `La versione ${latestVersion} di Chelona è ora disponibile!`);
          localStorage.setItem('chelona_last_notified_update', latestVersion);
        }

        return {
          available: true,
          currentVersion: this.currentVersion,
          latestVersion,
          releaseNotes: validRelease.body || '',
          downloadUrl: validApkAsset.browser_download_url,
          assetApiUrl: validApkAsset.url
        };
      } else {
        console.log('[UpdateService] App is up to date.');
        localStorage.removeItem('chelona_update_snoozed_version');
        localStorage.removeItem('chelona_update_snoozed_until');
      }
    } catch (error: any) {
      console.error('[UpdateService] Error checking for updates:', error);
    }
    return null;
  }

  snoozeUpdate(version: string, hours = 24) {
    const until = Date.now() + hours * 3600 * 1000;
    localStorage.setItem('chelona_update_snoozed_version', version);
    localStorage.setItem('chelona_update_snoozed_until', String(until));
    console.log(`[UpdateService] Snoozed update ${version} for ${hours}h`);
  }

  async downloadAndInstall(updateInfo: UpdateInfo, onProgress?: (p: number) => void) {
    if (!updateInfo.downloadUrl && !updateInfo.assetApiUrl) {
      throw new Error("L'URL di download non è valido.");
    }

    console.log(`[UpdateService] Starting update flow for v${updateInfo.latestVersion}`);

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

    const fileName = `chelona_v${updateInfo.latestVersion}.apk`;
    const assetApiUrl = updateInfo.assetApiUrl || updateInfo.downloadUrl;

    console.log(`[UpdateService] Resolving download URL for: ${assetApiUrl}`);
    if (onProgress) onProgress(10);

    try {
      await Filesystem.deleteFile({ path: fileName, directory: Directory.Cache }).catch(() => {});

      let actualUrl = updateInfo.downloadUrl;

      // Resolve redirect for private GitHub repository asset URL
      try {
        const headRes = await CapacitorHttp.request({
          url: assetApiUrl,
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${GITHUB_TOKEN}`,
            'Accept': 'application/octet-stream'
          }
        });
        if (headRes.url && headRes.url !== assetApiUrl && !headRes.url.includes('api.github.com')) {
          actualUrl = headRes.url;
        } else if (headRes.headers?.Location || headRes.headers?.location) {
          actualUrl = headRes.headers.Location || headRes.headers.location;
        }
      } catch (e) {
        console.warn('[UpdateService] Redirect resolution failed:', e);
      }

      console.log(`[UpdateService] Downloading actual APK from: ${actualUrl}`);

      let progressListener: any;
      if (onProgress) {
        progressListener = await Filesystem.addListener('progress', (status: any) => {
          if (status.contentLength > 0) {
            const percent = status.bytes / status.contentLength;
            onProgress(10 + Math.floor(percent * 80));
          }
        });
      }

      const downloadPromise = Filesystem.downloadFile({
        url: actualUrl,
        path: fileName,
        directory: Directory.Cache,
        progress: true,
        connectTimeout: 30000,
        readTimeout: 120000
      });

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('TIMEOUT')), 300000);
      });

      try {
        await Promise.race([downloadPromise, timeoutPromise]);
      } catch (primaryDlError) {
        console.warn('[UpdateService] Filesystem.downloadFile failed, trying fetch fallback...', primaryDlError);
        const response = await fetch(actualUrl);
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

      window.open(updateInfo.downloadUrl, '_system');
      throw new Error(
        "Il download in-app non è riuscito. " +
        "L'APK si sta scaricando nel browser. " +
        "Una volta completato, tocca la notifica per installarlo."
      );
    }

    let absolutePath: string;
    try {
      const { uri } = await Filesystem.getUri({ path: fileName, directory: Directory.Cache });
      absolutePath = uri.replace(/^file:\/\//, '');
      console.log(`[UpdateService] Resolved path: ${absolutePath}`);
    } catch (uriErr: any) {
      console.error('[UpdateService] getUri failed:', uriErr);
      throw new Error("Impossibile trovare il file scaricato.");
    }

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
