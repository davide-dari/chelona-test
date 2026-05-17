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
export PATH=$PATH:/opt/homebrew/bin
npm run build || { echo "❌ Build failed"; exit 1; }

# 2. Capacitor Sync
echo "🔄 Syncing Capacitor..."
npx cap sync android || { echo "❌ Sync failed"; exit 1; }

# 3. Build Android APK
echo "🤖 Building Android APK..."
cd android && ./gradlew assembleRelease && cd ..
# Check for both signed and unsigned outputs
if [ -f "android/app/build/outputs/apk/release/app-release.apk" ]; then
    APK_PATH="android/app/build/outputs/apk/release/app-release.apk"
elif [ -f "android/app/build/outputs/apk/release/app-release-unsigned.apk" ]; then
    APK_PATH="android/app/build/outputs/apk/release/app-release-unsigned.apk"
else
    echo "❌ APK release not found"
    exit 1
fi

if [ ! -f "$APK_PATH" ]; then
    echo "❌ APK not found at $APK_PATH"
    exit 1
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
    \"name\": \"Chelona $TAG\",
    \"body\": \"🚀 **Chelona v$VERSION**\\n\\n### ✨ Novità e Fix:\\n- **🗂️ Menu ed Esclusività Luogo/Itinerario**: Rimossi i selettori ridondanti all'interno dei relativi modal: la scheda per Luogo non mostra più l'opzione Itinerario e viceversa!\\n- **✨ Semplificazione Dashboard**: Eliminati i pulsanti Nuovo, Modifica ed Elimina dalla testata principale dei Paesi per dare un tocco più minimalista alla UI.\\n- **📱 Gestione cartelle tramite Long-Press**: Implementata la rilevazione del tocco prolungato (long-press/hold) sulle cartelle dei Paesi per far apparire un elegante menu ad azione dal basso (Action Sheet) da cui poterle modificare o eliminare.\\n- **🌍 Globe Zoom & Focus**: Selezionando un Paese, il mappamondo 3D esegue automaticamente una magnifica transizione ruotando e zoomando sul primo punto/destinazione precisa presente all'interno di quella cartella!\\n- **🏷️ Nomi Pulsanti FAB Punchy**: Rimosso il termine \\\"Nuovo\\\" dalle opzioni del FAB, semplificandole in \\\"Paese\\\", \\\"Luogo\\\" ed \\\"Itinerario\\\".\",
    \"draft\": false,
    \"prerelease\": false
  }")


RELEASE_ID=$(echo $RELEASE_JSON | node -p "JSON.parse(process.argv[1]).id" "$(cat)")

if [ "$RELEASE_ID" == "undefined" ] || [ -z "$RELEASE_ID" ]; then
    echo "❌ Failed to create release: $RELEASE_JSON"
    exit 1
fi

echo "✅ Release created with ID: $RELEASE_ID"

# 6. Upload APK Asset
echo "📁 Uploading APK to Release..."
UPLOAD_URL="https://uploads.github.com/repos/$OWNER/$REPO/releases/$RELEASE_ID/assets?name=Chelona_$TAG.apk"

curl -s -X POST \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Content-Type: application/vnd.android.package-archive" \
  --data-binary @"$APK_PATH" \
  "$UPLOAD_URL"

echo "🎉 Deployment for $TAG finished successfully!"
