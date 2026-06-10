import { Filesystem, Directory } from '@capacitor/filesystem';
import { ApkInstaller } from '@bixbyte/capacitor-apk-installer';
import { CapacitorHttp, Capacitor } from '@capacitor/core';
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

    // ── STEP 2: Resolve the final direct download URL via HEAD ───────────────
    let downloadUrl = updateInfo.downloadUrl;
    try {
      console.log(`[UpdateService] Resolving redirect for: ${downloadUrl}`);
      const headResp = await CapacitorHttp.request({
        method: 'HEAD',
        url: downloadUrl,
        headers: { 'User-Agent': 'Chelona-App-Updater' }
      });
      console.log(`[UpdateService] HEAD status: ${headResp.status}, resolved: ${headResp.url}`);
      if (headResp.url && headResp.url !== downloadUrl) {
        downloadUrl = headResp.url;
        console.log(`[UpdateService] Using resolved URL: ${downloadUrl}`);
      }
    } catch (headErr) {
      console.warn('[UpdateService] HEAD failed, using original URL:', headErr);
    }

    if (onProgress) onProgress(15);

    // ── STEP 3: Download via Filesystem.downloadFile with resolved direct URL ──
    // We use the direct Azure/S3 URL (no redirect) which Filesystem.downloadFile
    // can handle reliably. The HEAD step above ensures we have the final URL.
    const fileName = `chelona_v${updateInfo.latestVersion}.apk`;

    // Pre-cleanup
    await Filesystem.deleteFile({ path: fileName, directory: Directory.Cache }).catch(() => {});

    console.log(`[UpdateService] Downloading APK via Filesystem from: ${downloadUrl}`);

    // Progress via listener
    let progressListener: any = null;
    try {
      progressListener = await (Filesystem as any).addListener('progress', (evt: any) => {
        if (evt.bytes && evt.contentLength && evt.contentLength > 0) {
          const pct = Math.min(95, 15 + Math.round((evt.bytes / evt.contentLength) * 80));
          if (onProgress) onProgress(pct);
        }
      });
    } catch (_) { /* listener not critical */ }

    let downloadResult: { path?: string };
    try {
      downloadResult = await Filesystem.downloadFile({
        url: downloadUrl,
        path: fileName,
        directory: Directory.Cache,
        progress: true,
        headers: { 'User-Agent': 'Chelona-App-Updater' }
      });
    } catch (dlErr: any) {
      if (progressListener) progressListener.remove().catch(() => {});
      const msg = dlErr.message || JSON.stringify(dlErr);
      throw new Error(`Download fallito: ${msg}`);
    }

    if (progressListener) progressListener.remove().catch(() => {});

    if (onProgress) onProgress(96);

    const filePath = downloadResult.path;
    if (!filePath) {
      throw new Error('Download completato ma il percorso del file non è disponibile.');
    }

    console.log(`[UpdateService] APK downloaded to: ${filePath}`);

    // ── STEP 4: Install ──────────────────────────────────────────────────────
    if (onProgress) onProgress(98);
    console.log(`[UpdateService] Installing from: ${filePath}`);
    await ApkInstaller.installApk({ filePath });

    if (onProgress) onProgress(100);
    console.log('[UpdateService] Installation triggered successfully.');
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
