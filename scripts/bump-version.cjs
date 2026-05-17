#!/usr/bin/env node
/**
 * bump-version.js
 * Aggiorna la versione in modo sincronizzato in:
 *   - package.json         (version)
 *   - src/constants/version.ts (APP_VERSION)
 *   - android/app/build.gradle (versionName + versionCode auto-increment)
 *
 * Usage:
 *   node scripts/bump-version.js [nuovo-numero-versione]
 *   node scripts/bump-version.js          ← incrementa automaticamente patch
 *
 * Esempi:
 *   node scripts/bump-version.js 1.14.0
 *   node scripts/bump-version.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PKG_PATH = path.join(ROOT, 'package.json');
const VERSION_TS_PATH = path.join(ROOT, 'src', 'constants', 'version.ts');
const GRADLE_PATH = path.join(ROOT, 'android', 'app', 'build.gradle');

// ── Leggi versione attuale da package.json ───────────────────────────────────
const pkg = JSON.parse(fs.readFileSync(PKG_PATH, 'utf8'));
const currentVersion = pkg.version;
console.log(`\n📦 Versione attuale: ${currentVersion}`);

// ── Determina nuova versione ─────────────────────────────────────────────────
let newVersion = process.argv[2];
if (!newVersion) {
  const parts = currentVersion.split('.').map(Number);
  parts[2] += 1;
  newVersion = parts.join('.');
  console.log(`🔢 Nessuna versione specificata → patch auto-increment: ${newVersion}`);
} else {
  console.log(`🔢 Versione specificata: ${newVersion}`);
}

// Validazione formato semver
if (!/^\d+\.\d+\.\d+$/.test(newVersion)) {
  console.error(`❌ Formato versione non valido: "${newVersion}". Usa il formato X.Y.Z`);
  process.exit(1);
}

// ── Calcola versionCode (es. 1.13.6 → 11306, 1.14.0 → 11400) ───────────────
// Il versionCode è monotonicamente crescente: sommiamo i parts con pesi fissi
const [major, minor, patch] = newVersion.split('.').map(Number);
const newVersionCode = major * 10000 + minor * 100 + patch;
console.log(`🔢 Nuovo versionCode Android: ${newVersionCode}`);

// ── 1. Aggiorna package.json ─────────────────────────────────────────────────
pkg.version = newVersion;
fs.writeFileSync(PKG_PATH, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
console.log(`✅ package.json aggiornato → ${newVersion}`);

// ── 2. Aggiorna src/constants/version.ts ────────────────────────────────────
const versionTs = `export const APP_VERSION = '${newVersion}';\n`;
fs.writeFileSync(VERSION_TS_PATH, versionTs, 'utf8');
console.log(`✅ version.ts aggiornato → ${newVersion}`);

// ── 3. Aggiorna android/app/build.gradle ────────────────────────────────────
let gradle = fs.readFileSync(GRADLE_PATH, 'utf8');

// Sostituisce versionCode e versionName in modo sicuro (regex)
gradle = gradle.replace(/versionCode\s+\d+/, `versionCode ${newVersionCode}`);
gradle = gradle.replace(/versionName\s+"[^"]+"/, `versionName "${newVersion}"`);

fs.writeFileSync(GRADLE_PATH, gradle, 'utf8');
console.log(`✅ build.gradle aggiornato → versionName "${newVersion}", versionCode ${newVersionCode}`);

console.log(`\n🎉 Versione bumped con successo: ${currentVersion} → ${newVersion}\n`);
