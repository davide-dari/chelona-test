
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Device } from '@capacitor/device';
import { ApkInstaller } from '@bixbyte/capacitor-apk-installer';

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
  private currentVersion = '1.12.53';

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
      console.log(`[UpdateService] Latest version available on GitHub: ${latestVersion}`);
      
      const comparison = this.compareVersions(latestVersion, this.currentVersion);
      console.log(`[UpdateService] Comparison result: ${comparison} (1: update available, 0/ -1: up to date)`);

      if (comparison > 0) {
        // Find APK in assets
        const apkAsset = data.assets?.find((asset: any) => asset.name.endsWith('.apk'));
        if (!apkAsset) {
          console.warn('[UpdateService] Update available but no APK found in release assets.');
          return null;
        }

        console.log(`[UpdateService] New update found! Downloading from: ${apkAsset.browser_download_url}`);
        return {
          available: true,
          currentVersion: this.currentVersion,
          latestVersion: latestVersion,
          releaseNotes: data.body || '',
          downloadUrl: apkAsset.browser_download_url
        };
      } else {
        console.log('[UpdateService] App is up to date.');
      }
    } catch (error: any) {
      console.error('[UpdateService] Error checking for updates:', error);
      // Optional: re-throw if you want the UI to handle it, but usually check is silent
    }
    return null;
  }

  async downloadAndInstall(updateInfo: UpdateInfo, onProgress?: (p: number) => void) {
    try {
      if (!updateInfo.downloadUrl) {
        throw new Error("L'URL di download non è valido.");
      }

      console.log(`[UpdateService] Downloading update from: ${updateInfo.downloadUrl}`);
      
      const fileName = `chelona_v${updateInfo.latestVersion}.apk`;
      
      if (onProgress) onProgress(0);

      try {
        // Pre-delete to avoid "File already exists" or corrupted states
        try {
          await Filesystem.deleteFile({
            path: fileName,
            directory: Directory.Cache
          }).catch(() => {});
        } catch (e) {}

        // 1. Download the APK
        let progressListener: any = null;
        if (onProgress) {
          // Note: for Filesystem.downloadFile, the event is indeed 'progress'
          progressListener = await (Filesystem as any).addListener('progress', (progress: any) => {
            if (progress.bytes && progress.contentLength) {
              const p = Math.round((progress.bytes / progress.contentLength) * 100);
              onProgress(p);
            }
          });
        }

        console.log(`[UpdateService] Starting download from: ${updateInfo.downloadUrl}`);
        const downloadResult = await Filesystem.downloadFile({
          url: updateInfo.downloadUrl,
          path: fileName,
          directory: Directory.Cache,
          progress: true
        });

        if (progressListener) {
          await progressListener.remove();
        }

        if (onProgress) onProgress(100);
        console.log(`[UpdateService] Download finished: ${downloadResult.path}`);

        // 2. Install the APK
        console.log('[UpdateService] Starting installation...');
        await ApkInstaller.installApk({ filePath: downloadResult.path });
      } catch (innerError: any) {
        console.error('[UpdateService] Native download/install failed:', innerError);
        
        // If it's a fetch-related error on Android, it might be due to CapacitorHttp interference.
        // We throw a more descriptive error for the UI.
        const msg = innerError.message || JSON.stringify(innerError);
        throw new Error(`Errore durante il download: ${msg}`);
      }

    } catch (error: any) {
      console.error('[UpdateService] Error during update installation:', error);
      throw error;
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
