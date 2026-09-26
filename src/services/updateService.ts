import { Filesystem, Directory } from '@capacitor/filesystem';
import { ApkInstaller } from '@bixbyte/capacitor-apk-installer';
import { CapacitorHttp, Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { APP_VERSION } from '../constants/version';
import { notificationService } from './notificationService';

const GITHUB_OWNER = 'davide-dari';
const GITHUB_REPO = 'chelona-test';

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

  async getCurrentVersion(): Promise<string> {
    if (Capacitor.isNativePlatform()) {
      try {
        const info = await CapacitorApp.getInfo();
        if (info && info.version) {
          this.currentVersion = info.version;
          return info.version;
        }
      } catch (e) {
        console.warn('[UpdateService] Failed to retrieve native version info:', e);
      }
    }
    this.currentVersion = APP_VERSION;
    return APP_VERSION;
  }

  async checkForUpdates(force = false): Promise<UpdateInfo | null> {
    await this.getCurrentVersion();
    const snoozedVersion = localStorage.getItem('chelona_update_snoozed_version');
    const snoozedUntil = parseInt(localStorage.getItem('chelona_update_snoozed_until') || '0', 10);

    if (force) {
      localStorage.removeItem('chelona_update_snoozed_version');
      localStorage.removeItem('chelona_update_snoozed_until');
    }

    console.log(`[UpdateService] Checking for updates... Current version: ${this.currentVersion} (force: ${force})`);
    try {
      const releases = await this.fetchReleases();
      if (!releases || releases.length === 0) {
        console.warn('[UpdateService] Could not fetch releases from GitHub API.');
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
        console.warn('[UpdateService] No valid release with uploaded APK found.');
        return null;
      }

      const latestVersion = validRelease.tag_name.replace(/^v/, '').trim();
      console.log(`[UpdateService] Latest valid version on GitHub: ${latestVersion}, Current: ${this.currentVersion}`);

      const comparison = this.compareVersions(latestVersion, this.currentVersion);
      console.log(`[UpdateService] Comparison: ${comparison} (1 = update available)`);

      if (comparison > 0) {
        if (!force && snoozedVersion === latestVersion && Date.now() < snoozedUntil) {
          console.log(`[UpdateService] Update ${latestVersion} snoozed until ${new Date(snoozedUntil).toISOString()}`);
          return null;
        }

        console.log(`[UpdateService] Update found! APK download URL: ${validApkAsset.browser_download_url}`);

        const lastNotified = localStorage.getItem('chelona_last_notified_update');
        if (lastNotified !== latestVersion) {
          notificationService.fire(
            'Aggiornamento Disponibile',
            `La versione v${latestVersion} di Chelona è ora disponibile!`,
            { route: 'update' }
          );
          localStorage.setItem('chelona_last_notified_update', latestVersion);
        }

        return {
          available: true,
          currentVersion: this.currentVersion,
          latestVersion,
          releaseNotes: validRelease.body || 'Miglioramenti generali e nuove funzionalità.',
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

  private async fetchReleases(): Promise<any[]> {
    const listUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases?per_page=10`;
    const latestUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;

    // 1. Native CapacitorHttp first (completely CORS-free and robust in mobile environments)
    if (Capacitor.isNativePlatform()) {
      try {
        const res = await CapacitorHttp.get({
          url: listUrl,
          headers: { 'Accept': 'application/vnd.github.v3+json' }
        });
        if (res.status === 200 && Array.isArray(res.data) && res.data.length > 0) {
          return res.data;
        }
      } catch (err) {
        console.warn('[UpdateService] CapacitorHttp list fetch failed:', err);
      }

      try {
        const latestRes = await CapacitorHttp.get({
          url: latestUrl,
          headers: { 'Accept': 'application/vnd.github.v3+json' }
        });
        if (latestRes.status === 200 && latestRes.data && latestRes.data.tag_name) {
          return [latestRes.data];
        }
      } catch (err) {
        console.warn('[UpdateService] CapacitorHttp latest fetch failed:', err);
      }
    }

    // 2. Standard fetch fallback (without headers that trigger CORS preflight rejection)
    try {
      const res = await fetch(listUrl, {
        headers: { 'Accept': 'application/vnd.github.v3+json' }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) return data;
        if (data && data.tag_name) return [data];
      }
    } catch (err) {
      console.warn('[UpdateService] Standard fetch list failed:', err);
    }

    try {
      const latestRes = await fetch(latestUrl, {
        headers: { 'Accept': 'application/vnd.github.v3+json' }
      });
      if (latestRes.ok) {
        const data = await latestRes.json();
        if (data && data.tag_name) return [data];
      }
    } catch (err) {
      console.warn('[UpdateService] Standard fetch latest failed:', err);
    }

    return [];
  }

  snoozeUpdate(version: string, hours = 24) {
    const until = Date.now() + hours * 3600 * 1000;
    localStorage.setItem('chelona_update_snoozed_version', version);
    localStorage.setItem('chelona_update_snoozed_until', String(until));
    console.log(`[UpdateService] Snoozed update ${version} for ${hours}h`);
  }

  async downloadAndInstall(updateInfo: UpdateInfo, onProgress?: (p: number) => void) {
    if (!updateInfo.downloadUrl) {
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
    const actualUrl = updateInfo.downloadUrl;

    console.log(`[UpdateService] Downloading APK from: ${actualUrl}`);
    if (onProgress) onProgress(10);

    try {
      await Filesystem.deleteFile({ path: fileName, directory: Directory.Cache }).catch(() => {});

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
