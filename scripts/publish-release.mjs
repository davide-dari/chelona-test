import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let TOKEN = process.env.GITHUB_TOKEN;
if (!TOKEN && fs.existsSync(path.join(__dirname, '../.env'))) {
  const envContent = fs.readFileSync(path.join(__dirname, '../.env'), 'utf-8');
  const match = envContent.match(/GITHUB_TOKEN=([^\r\n]+)/);
  if (match) TOKEN = match[1].trim();
}
const REPO = process.env.GITHUB_REPO ? `${process.env.GITHUB_OWNER || 'davide-dari'}/${process.env.GITHUB_REPO}` : 'davide-dari/chelona-test';
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf-8'));
const VERSION = `v${packageJson.version}`;
const APK_PATH = path.join(__dirname, '../android/app/build/outputs/apk/release/app-release.apk');

async function run() {
  console.log(`Creating release for ${VERSION}`);
  const res = await fetch(`https://api.github.com/repos/${REPO}/releases`, {
    method: 'POST',
    headers: {
      'Authorization': `token ${TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      tag_name: VERSION,
      name: `Release ${VERSION}`,
      draft: false,
      prerelease: false
    })
  });
  
  if (!res.ok) {
    const err = await res.text();
    console.error('Failed to create release:', err);
    process.exit(1);
  }
  
  const release = await res.json();
  console.log('Release created. Uploading APK...');
  
  const apkStats = fs.statSync(APK_PATH);
  const apkStream = fs.createReadStream(APK_PATH);
  
  const uploadRes = await fetch(`${release.upload_url.split('{')[0]}?name=app-release.apk`, {
    method: 'POST',
    headers: {
      'Authorization': `token ${TOKEN}`,
      'Content-Type': 'application/vnd.android.package-archive',
      'Content-Length': apkStats.size
    },
    body: apkStream,
    duplex: 'half'
  });
  
  if (!uploadRes.ok) {
    const err = await uploadRes.text();
    console.error('Failed to upload APK:', err);
    process.exit(1);
  }
  
  console.log('✅ APK Uploaded successfully!');
}

run().catch(console.error);
