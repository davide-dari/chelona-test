
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Device } from '@capacitor/device';
import { ApkInstaller } from '@bixbyte/capacitor-apk-installer';
import packageJson from '../../package.json';

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
  private currentVersion = packageJson.version;

  async checkForUpdates(): Promise<UpdateInfo | null> {
    console.log(`[UpdateService] Checking for updates... Current version: ${this.currentVersion}`);
    try {
      const response = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`);
      
      if (!response.ok) {
        console.log(`[UpdateService] GitHub API error: ${response.status} ${response.statusText}`);
        return null;
      }

      const data = await response.json();
      const latestVersion = data.tag_name.replace('v', '');
      console.log(`[UpdateService] Latest version available on GitHub: ${latestVersion}`);
      
      const comparison = this.compareVersions(latestVersion, this.currentVersion);
      console.log(`[UpdateService] Comparison result: ${comparison} (1: update available, 0/ -1: up to date)`);

      if (comparison > 0) {
        // Find APK in assets
        const apkAsset = data.assets.find((asset: any) => asset.name.endsWith('.apk'));
        if (!apkAsset) {
          console.warn('[UpdateService] Update available but no APK found in release assets.');
          return null;
        }

        console.log(`[UpdateService] New update found! Downloading from: ${apkAsset.browser_download_url}`);
        return {
          available: true,
          currentVersion: this.currentVersion,
          latestVersion: latestVersion,
          releaseNotes: data.body,
          downloadUrl: apkAsset.browser_download_url
        };
      } else {
        console.log('[UpdateService] App is up to date.');
      }
    } catch (error) {
      console.error('[UpdateService] Error checking for updates:', error);
    }
    return null;
  }

  async downloadAndInstall(updateInfo: UpdateInfo, onProgress?: (p: number) => void) {
    try {
      console.log(`[UpdateService] Downloading update from: ${updateInfo.downloadUrl}`);
      
      const fileName = `chelona_v${updateInfo.latestVersion}.apk`;
      
      if (onProgress) onProgress(0);

      // Use native downloadFile for stability and performance
      const downloadResult = await Filesystem.downloadFile({
        url: updateInfo.downloadUrl,
        path: fileName,
        directory: Directory.Cache,
        progress: true
      });

      if (onProgress) onProgress(100);
      
      console.log(`[UpdateService] Download finished: ${downloadResult.path}`);

      // 2. Install the APK
      await ApkInstaller.installApk({ filePath: downloadResult.path });

    } catch (error) {
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
