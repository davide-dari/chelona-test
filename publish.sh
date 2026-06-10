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

# Update version.ts to match package.json
echo "export const APP_VERSION = '$VERSION';" > src/constants/version.ts

# 1. Build Web App
echo "📦 Building Web App..."
node --max-old-space-size=4096 node_modules/vite/bin/vite.js build || { echo "❌ Build failed"; exit 1; }

# 2. Capacitor Sync
echo "🔄 Syncing Capacitor..."
node node_modules/@capacitor/cli/bin/capacitor sync android || { echo "❌ Sync failed"; exit 1; }

# 3. Build Android APK (Optional based on JDK environment)
if [ -n "$ANDROID_HOME" ] && command -v java >/dev/null 2>&1; then
    echo "🤖 Building Android APK..."
    (cd android && ./gradlew assembleRelease)
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
    echo "⚠️ Warning: java or ANDROID_HOME not found. Skipping local APK build."
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
    \"body\": \"🚀 **Chelona v$VERSION**\\n\\n### ✨ Novità e Fix in questo Rilascio:\\n- **📥 Risolto Download Aggiornamenti**: Risolto un problema di CORS e reindirizzamento HTTP durante il download dell'APK da GitHub Releases su Android, integrando CapacitorHttp per risolvere l'URL in modo nativo.\",
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

