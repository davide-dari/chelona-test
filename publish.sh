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
node --max-old-space-size=1024 node_modules/vite/bin/vite.js build || { echo "❌ Build failed"; exit 1; }

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
    \"body\": \"🚀 **Chelona v$VERSION**\\n\\n### ✨ Novità e Fix in questo Rilascio:\\n- **🛠️ Fix Condivisione QR (RangeError)**: Risolto un bug critico che causava il crash dell'applicazione (*RangeError: Data too long*) durante la generazione del QR Code per la condivisione del Gruppo Spese in presenza di allegati pesanti (scontrini base64 o avatar). Ora gli allegati grafici vengono opportunamente rimossi dal QR Code durante la condivisione per mantenere la densità del codice ottimale ed evitare errori di overflow.\\n- **👥 Gruppo Spese Intelligente**: Durante la creazione di un nuovo gruppo di spese, il sistema ora richiede all'utente il numero totale dei partecipanti e i loro rispettivi nomi. All'avvio del gruppo, l'utente viene reindirizzato istantaneamente e in automatico al modulo per l'inserimento della prima spesa per un'esperienza d'uso fluida e guidata.\\n- **📲 Condivisione QR Gruppo Spese**: Aggiunta la possibilità di condividere l'intero gruppo spese tramite QR Code sia direttamente dall'homepage (accanto ai controlli di modifica/eliminazione della card del gruppo) sia dall'header interno del gruppo spese. Il codice QR generato consente ad altri dispositivi di importare l'intero gruppo di spese all'istante tramite scansione.\\n- **🚌 Nuova Sezione Atene (Grecia > Trasporti)**: Aggiunta la rete metropolitana di Atene con le relative 3 linee M1, M2, M3 in dettaglio (nomi delle stazioni in italiano e greco con attrazioni e monumenti adiacenti). Integra un calcolatore di percorsi (Route Planner) interamente offline, una mappa topografica interattiva cliccabile in formato SVG, le principali linee bus urbane ed espressi per l'aeroporto (X95, X96, 040, 224) ed integrazione con il portale ufficiale di telemetria in tempo reale OASA.\\n- **⭐ Preferiti nei Percorsi**: Spostato il tasto con la stella dei preferiti direttamente a destra del titolo della schermata di pianificazione, per un'interazione ed un salvataggio delle tratte ancora più immediato.\\n- **🛣️ Ricerca Stradale Autocomplete**: Sostituite le vecchie select con due completi campi di testo ad autocompletamento (Partenza ed Arrivo). Digitando qualsiasi nome di via o stazione (es. Via Ermou, Plaka, Via Patission, Pireo, ecc.), il sistema consiglia e risolve istantaneamente le migliori corrispondenze geografiche interamente offline, suggerendo i percorsi, i cambi linea, le indicazioni pedonali in metri e i mezzi da prendere.\\n- **🔒 Sicurezza e Privacy**: Impedito lo screenshot dell'applicazione e oscurata l'anteprima dell'applicazione nella schermata delle app recenti di Android per una privacy assoluta della tua roccaforte digitale.\\n- **🚗 Gestione Auto e Targa**: Rimossa la garanzia della batteria 12V, rinominato il campo batteria ibrida in Scad. Garanzia. Abilitato il copia-veloce della targa dell'auto con feedback di vibrazione e toast a scorrimento.\\n- **🗣️ Assistente Vocale Semantico**: Potenziata la ricerca vocale dell'app per rispondere a voce in italiano alle scadenze dell'auto (assicurazione, bollo, tagliando, revisione) calcolando i giorni/km rimanenti.\\n- **🧹 Pulizia UI**: Rimossa la categoria Trasporti dal drawer di inserimento e nascosti gli header superiori (titolo, contatore, pulsante indietro) per le singole categorie filtrate per un design più fluido e pulito.\\n\\n### ⚠️ Avviso installazione APK (App Sconosciuta / Play Protect):\\nTrattandosi di un'applicazione compilata e distribuita manualmente (sideloaded) e non tramite Google Play Store, al momento dell'installazione o dell'aggiornamento Android potrebbe mostrare un avviso di sicurezza (*App Sconosciuta* o *Play Protect*).\\n\\nPer procedere:\\n1. Se appare il blocco di Google Play Protect, premi su **Ulteriori dettagli** e successivamente su **Installa comunque**.\\n2. Se richiesto, abilita l'opzione **Consenti l'installazione da questa sorgente** o **Installa app sconosciute** nelle impostazioni di Android per l'app Chelona (o il browser).\",
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

