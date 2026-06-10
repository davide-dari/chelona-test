import { Filesystem, Directory } from '@capacitor/filesystem';
import { ApkInstaller } from '@bixbyte/capacitor-apk-installer';
import { CapacitorHttp } from '@capacitor/core';
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
    console.log('[UpdateService] Checking install permission...');
    const { hasPermission } = await ApkInstaller.checkInstallPermission();
    if (!hasPermission) {
      console.log('[UpdateService] Permission not granted — redirecting to Settings...');
      await ApkInstaller.requestInstallPermission();
      throw new Error("Abilita l'installazione da questa sorgente nelle Impostazioni, poi premi di nuovo 'Installa Ora'.");
    }
    console.log('[UpdateService] Install permission OK.');

    if (onProgress) onProgress(5);

    // ── STEP 2: Resolve redirect via native CapacitorHttp HEAD ──────────────
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
      }
    } catch (headErr) {
      console.warn('[UpdateService] HEAD failed, using original URL:', headErr);
    }

    if (onProgress) onProgress(10);

    // ── STEP 3: Download binary via CapacitorHttp GET (arraybuffer) ──────────
    // Key fix: CapacitorHttp runs native (OkHttp on Android), bypasses WebView CORS
    // and the deprecated+broken Filesystem.downloadFile.
    const fileName = `chelona_v${updateInfo.latestVersion}.apk`;
    console.log(`[UpdateService] Downloading APK from: ${downloadUrl}`);

    let base64Data: string;
    const dlResp = await CapacitorHttp.request({
      method: 'GET',
      url: downloadUrl,
      responseType: 'arraybuffer',
      headers: { 'User-Agent': 'Chelona-App-Updater' }
    });
    console.log(`[UpdateService] GET status: ${dlResp.status}`);
    if (dlResp.status < 200 || dlResp.status >= 300) {
      throw new Error(`Il server ha risposto con errore ${dlResp.status}`);
    }

    // On native Android, CapacitorHttp arraybuffer response comes back as a base64 string
    base64Data = typeof dlResp.data === 'string'
      ? dlResp.data
      : btoa(String.fromCharCode(...new Uint8Array(dlResp.data as ArrayBuffer)));

    if (onProgress) onProgress(80);
    console.log(`[UpdateService] Download complete. Writing to disk...`);

    // ── STEP 4: Write to cache using Filesystem.writeFile (stable, not deprecated) ──
    await Filesystem.deleteFile({ path: fileName, directory: Directory.Cache }).catch(() => {});
    await Filesystem.writeFile({
      path: fileName,
      data: base64Data,
      directory: Directory.Cache
      // No encoding property = base64 binary mode
    });
    if (onProgress) onProgress(95);
    console.log(`[UpdateService] APK written to cache: ${fileName}`);

    // ── STEP 5: Resolve absolute path & install ──────────────────────────────
    const { uri } = await Filesystem.getUri({ path: fileName, directory: Directory.Cache });
    // uri = "file:///data/.../cache/chelona_vX.apk" — strip scheme for ApkInstaller
    const absolutePath = uri.replace(/^file:\/\//, '');
    console.log(`[UpdateService] Installing from: ${absolutePath}`);

    if (onProgress) onProgress(98);
    await ApkInstaller.installApk({ filePath: absolutePath });

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
