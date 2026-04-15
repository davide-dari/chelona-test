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
    \"body\": \"🚀 **Chelona v$VERSION** - UI Restructuring & Expense Sync\n\n### ✨ Novità in questa release:\n- **📄 Word to PDF**: Convertitore offline da .docx a PDF integrato negli strumenti.\n- **⚡ UI Streamlining**: Rimosse le scorciatoie dalla Dashboard per un design più pulito. Le azioni di aggiunta sono ora localizzate nelle rispettive categorie.\n- **🎯 Contextual Actions**: Nuovo tasto 'Aggiungi' dinamico filtrato per categoria e pulsante FAB intelligente.\n- **🎨 Spese Sync**: Sincronizzato il design della lista spese con lo stile premium delle card 'Recenti'.\n\n*Rilasciato con ❤️ dal Chelona Deploy Script.*\",
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
