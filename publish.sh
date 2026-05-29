#!/bin/bash

# Chelona Auto-Publisher
# This script automates: Bumping version, Building, Syncing, Pushing to Git, 
# and creating a GitHub Release with APK attachment.

# Load environment variables
export PATH=$PATH:/opt/homebrew/bin
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
else
    echo "❌ Error: .env file not found. Please create one based on .env.example"
    exit 1
fi

if [ -z "$GITHUB_TOKEN" ]; then
    echo "❌ Error: GITHUB_TOKEN is not set in .env"
    exit 1
fi

OWNER=${GITHUB_OWNER:-"davide-dari"}
REPO=${GITHUB_REPO:-"chelona-test"}

# Get current version from package.json
VERSION=$(node -p "require('./package.json').version")
TAG="v$VERSION"

echo "🚀 Starting deployment for $TAG..."

# 1. Build Web App
echo "📦 Building Web App..."
node node_modules/vite/bin/vite.js build || { echo "❌ Build failed"; exit 1; }

# 2. Capacitor Sync
echo "🔄 Syncing Capacitor..."
node node_modules/@capacitor/cli/bin/capacitor sync android || { echo "❌ Sync failed"; exit 1; }

# 3. Build Android APK (Optional based on JDK environment)
if command -v java >/dev/null 2>&1; then
    echo "🤖 Building Android APK..."
    cd android && ./gradlew assembleRelease && cd ..
    # Check for both signed and unsigned outputs
    if [ -f "android/app/build/outputs/apk/release/app-release.apk" ]; then
        APK_PATH="android/app/build/outputs/apk/release/app-release.apk"
    elif [ -f "android/app/build/outputs/apk/release/app-release-unsigned.apk" ]; then
        APK_PATH="android/app/build/outputs/apk/release/app-release-unsigned.apk"
    else
        echo "⚠️ Warning: APK release not found, skipping asset upload"
        APK_PATH=""
    fi
else
    echo "⚠️ Warning: java not found. Skipping APK build."
    APK_PATH=""
fi

# 4. Git Push
echo "⬆️ Pushing to GitHub..."
git add .
git commit -m "Release $TAG"
git push origin main
git tag -a "$TAG" -m "Release $TAG"
git push origin "$TAG"

# 5. Create GitHub Release
echo "🚀 Creating GitHub Release..."
RELEASE_JSON=$(curl -s -X POST \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/repos/$OWNER/$REPO/releases \
  -d "{
    \"tag_name\": \"$TAG\",
    \"name\": \"Release $TAG\",
    \"body\": \"🚀 **Chelona v$VERSION**\\n\\n### ✨ Novità e Fix in questo Rilascio:\\n- **🚌 Nuova Sezione Atene (Grecia > Trasporti)**: Aggiunta la rete metropolitana di Atene con le relative 3 linee M1, M2, M3 in dettaglio (nomi delle stazioni in italiano e greco con attrazioni e monumenti adiacenti). Integra un calcolatore di percorsi (Route Planner) interamente offline, una mappa topografica interattiva cliccabile in formato SVG, le principali linee bus urbane ed espressi per l'aeroporto (X95, X96, 040, 224) ed integrazione con il portale ufficiale di telemetria in tempo reale OASA.\\n- **⭐ Preferiti nei Percorsi**: Aggiunto un comodo tasto con icona a forma di stella per salvare e gestire i tuoi percorsi preferiti all'interno di Atene nel calcolatore di percorsi, per un accesso rapido e immediato offline.\\n- **🔒 Sicurezza e Privacy**: Impedito lo screenshot dell'applicazione e oscurata l'anteprima dell'applicazione nella schermata delle app recenti di Android per una privacy assoluta della tua roccaforte digitale.\\n- **🚗 Gestione Auto e Targa**: Rimossa la garanzia della batteria 12V, rinominato il campo batteria ibrida in Scad. Garanzia. Abilitato il copia-veloce della targa dell'auto con feedback di vibrazione e toast a scorrimento.\\n- **🗣️ Assistente Vocale Semantico**: Potenziata la ricerca vocale dell'app per rispondere a voce in italiano alle scadenze dell'auto (assicurazione, bollo, tagliando, revisione) calcolando i giorni/km rimanenti.\\n- **🧹 Pulizia UI**: Rimossa la categoria Trasporti dal drawer di inserimento e nascosti gli header superiori (titolo, contatore, pulsante indietro) per le singole categorie filtrate per un design più fluido e pulito.\\n\\n### ⚠️ Avviso installazione APK (App Sconosciuta / Play Protect):\\nTrattandosi di un'applicazione compilata e distribuita manualmente (sideloaded) e non tramite Google Play Store, al momento dell'installazione o dell'aggiornamento Android potrebbe mostrare un avviso di sicurezza (*App Sconosciuta* o *Play Protect*).\\n\\nPer procedere:\\n1. Se appare il blocco di Google Play Protect, premi su **Ulteriori dettagli** e successivamente su **Installa comunque**.\\n2. Se richiesto, abilita l'opzione **Consenti l'installazione da questa sorgente** o **Installa app sconosciute** nelle impostazioni di Android per l'app Chelona (o il browser).\",

    \"draft\": false,
    \"prerelease\": false
  }")


RELEASE_ID=$(echo $RELEASE_JSON | node -p "JSON.parse(process.argv[1]).id" "$(cat)")

if [ "$RELEASE_ID" == "undefined" ] || [ -z "$RELEASE_ID" ]; then
    echo "❌ Failed to create release: $RELEASE_JSON"
    exit 1
fi

echo "✅ Release created with ID: $RELEASE_ID"

# 6. Upload APK Asset (Optional based on compiled APK)
if [ -n "$APK_PATH" ] && [ -f "$APK_PATH" ]; then
    echo "📁 Uploading APK to Release..."
    UPLOAD_URL="https://uploads.github.com/repos/$OWNER/$REPO/releases/$RELEASE_ID/assets?name=Chelona_$TAG.apk"

    curl -s -X POST \
      -H "Authorization: token $GITHUB_TOKEN" \
      -H "Content-Type: application/vnd.android.package-archive" \
      --data-binary @"$APK_PATH" \
      "$UPLOAD_URL"
else
    echo "⚠️ Skipping APK asset upload (no APK path found or compiled)"
fi

echo "🎉 Deployment for $TAG finished successfully!"

