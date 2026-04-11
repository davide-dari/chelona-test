
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
    try {
      const response = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`);
      if (!response.ok) return null;

      const data = await response.json();
      const latestVersion = data.tag_name.replace('v', '');
      
      if (this.compareVersions(latestVersion, this.currentVersion) > 0) {
        // Find APK in assets
        const apkAsset = data.assets.find((asset: any) => asset.name.endsWith('.apk'));
        if (!apkAsset) return null;

        return {
          available: true,
          currentVersion: this.currentVersion,
          latestVersion: latestVersion,
          releaseNotes: data.body,
          downloadUrl: apkAsset.browser_download_url
        };
      }
    } catch (error) {
      console.error('Error checking for updates:', error);
    }
    return null;
  }

  async downloadAndInstall(updateInfo: UpdateInfo, onProgress?: (p: number) => void) {
    try {
      // 1. Download the file
      const fileName = `update_${updateInfo.latestVersion}.apk`;
      
      // In a real app, we would use CapacitorHttp for large files to avoid memory issues
      // but for this example we'll fetch and use Filesystem.
      const response = await fetch(updateInfo.downloadUrl);
      const reader = response.body?.getReader();
      const contentLength = +(response.headers.get('Content-Length') || 0);
      
      let receivedLength = 0;
      const chunks = [];
      
      if (reader) {
        while(true) {
          const {done, value} = await reader.read();
          if (done) break;
          chunks.push(value);
          receivedLength += value.length;
          if (onProgress && contentLength) {
            onProgress(Math.round((receivedLength / contentLength) * 100));
          }
        }
      }

      const blob = new Blob(chunks);
      const base64 = await this.blobToBase64(blob);

      const savedFile = await Filesystem.writeFile({
        path: fileName,
        data: base64,
        directory: Directory.External,
      });

      // 2. Install the APK
      await ApkInstaller.installApk({ filePath: savedFile.uri });

    } catch (error) {
      console.error('Error during update installation:', error);
      throw error;
    }
  }

  private compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);
    for (let i = 0; i < 3; i++) {
      if (parts1[i] > parts2[i]) return 1;
      if (parts1[i] < parts2[i]) return -1;
    }
    return 0;
  }

  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}

export const updateService = new UpdateService();
