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
node --max-old-space-size=1024 node_modules/vite/bin/vite.js build || { echo "❌ Build failed"; exit 1; }

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
    \"body\": \"🚀 **Chelona v$VERSION**\\n\\n### ✨ Novità e Fix in questo Rilascio:\\n- **🛠️ Fix Compilazione APK**: Risolto il problema che causava il fallimento della build e del caricamento dell'APK in ambiente CI (GitHub Actions) a causa di librerie SDK deprecate. La pipeline di rilascio è ora ripristinata e performante.\\n- **🥬 Varianti Ortaggi Autocompletamento**: Espanso enormemente il database dell'autocompletamento del frigo per includere centinaia di varianti specifiche di ortaggi e legumi (es: *zucchine tonde, pomodori datterini, cipolla di tropea, cavolo nero, funghi porcini, asparagi selvatici, radicchio trevigiano, lenticchie rosse, ecc.*).\\n- **⌨️ Autocompletamento Ingredienti**: Inserita un'intelligenza predittiva nel campo di ricerca del Frigo. Ora, mentre digiti, l'app ti suggerirà in tempo reale un menu a tendina contenente centinaia di ingredienti comuni, uniti a *tutti* gli ingredienti estratti dinamicamente dall'intero database delle ricette (oltre 1000 ricette analizzate e filtrate per parole chiave). Aggiungere ingredienti al frigo non è mai stato così veloce!\\n- **❄️ Smart Fridge UI**: Rivoluzionata l'intelligenza de 'Il mio Frigo'. Inserendo gli ingredienti verranno mostrate *tutte* le ricette compatibili (ordinate per quantità di match), introducendo un sistema UI intelligente che ti avvisa se **'Hai tutto'** o ti elenca esplicitamente (evidenziandoli in rosso e con l'etichetta 'Manca') gli ingredienti mancanti necessari per completare la ricetta!\\n- **🐞 Fix Ingredienti**: Ripristinato il database esteso corretto (oltre 1000 ricette) che include la lista completa degli ingredienti, prima mancanti in alcune schede.\\n- **🗑️ UI Custom Eliminazione Universale**: Sostituiti tutti gli alert nativi di sistema con un elegante popup di conferma in stile Chelona per l'eliminazione di qualsiasi elemento dell'app (veicoli, documenti, appunti, spese, destinazioni, cartelle o profili).\\n- **🧭 Navigazione Ricettario Intelligente**: Corretto il pulsante 'Indietro' nel ricettario: ora uscendo da una ricetta tornerai esattamente alla categoria che stavi esplorando, senza dover ricominciare dalla home.\\n- **👥 Spesi per Partecipante**: Ora nella sezione 'Chi' del Gruppo Spese è visibile in tempo reale il totale dei soldi spesi da ciascun partecipante, per avere un quadro immediato della situazione.\\n- **📅 Ordinamento Cronologico**: Le spese all'interno del Gruppo Spese sono ora ordinate rigorosamente per data cronologica (dalla meno recente alla più recente) facilitando la consultazione.\\n- **🍝 Ricettario Aggiornato**: Rimossa navigazione superflua all'interno delle categorie, rinominato il titolo della pagina in 'Ricettario' e potenziato lo scraper per recuperare oltre 100 ricette sfogliando più pagine di Giallo Zafferano in background.\\n- **💰 Auto-Salvataggio Budget**: Il budget inserito nel Gruppo Spese viene ora salvato automaticamente in tempo reale (con debounce di 800ms). Non è più necessario premere \\\"Salva\\\" per conservare il budget impostato: qualsiasi modifica al budget, al titolo, alla valuta, ai partecipanti o alle spese viene persistita automaticamente in background senza interrompere il flusso di lavoro.\\n- **⚡ Compressione QR LZW (RangeError)**: Attivata la compressione LZW nativa sui QR Code dei moduli Spese di Gruppo (sia da dashboard che da interno schermata). Questo riduce la dimensione dei dati fino al 60%, permettendo la corretta e stabile condivisione di gruppi spese anche molto numerosi (fino a 25-30 spese per gruppo) senza incorrere in alcun errore di eccedenza dati.\\n- **🛠️ Fix Condivisione QR (RangeError)**: Risolto un bug critico che causava il crash dell'applicazione (*RangeError: Data too long*) durante la generazione del QR Code per la condivisione del Gruppo Spese in presenza di allegati pesanti (scontrini base64 o avatar). Ora gli allegati grafici vengono opportunamente rimossi dal QR Code durante la condivisione per mantenere la densità del codice ottimale ed evitare errori di overflow.\\n- **👥 Gruppo Spese Intelligente**: Durante la creazione di un nuovo gruppo di spese, il sistema ora richiede all'utente il numero totale dei partecipanti e i loro rispettivi nomi. All'avvio del gruppo, l'utente viene reindirizzato istantaneamente e in automatico al modulo per l'inserimento della prima spesa per un'esperienza d'uso fluida e guidata.\\n- **📲 Condivisione QR Gruppo Spese**: Aggiunta la possibilità di condividere l'intero gruppo spese tramite QR Code sia direttamente dall'homepage (accanto ai controlli di modifica/eliminazione della card del gruppo) sia dall'header interno del gruppo spese. Il codice QR generato consente ad altri dispositivi di importare l'intero gruppo di spese all'istante tramite scansione.\\n- **🚌 Nuova Sezione Atene (Grecia > Trasporti)**: Aggiunta la rete metropolitana di Atene con le relative 3 linee M1, M2, M3 in dettaglio (nomi delle stazioni in italiano e greco con attrazioni e monumenti adiacenti). Integra un calcolatore di percorsi (Route Planner) interamente offline, una mappa topografica interattiva cliccabile in formato SVG, le principali linee bus urbane ed espressi per l'aeroporto (X95, X96, 040, 224) ed integrazione con il portale ufficiale di telemetria in tempo reale OASA.\\n- **⭐ Preferiti nei Percorsi**: Spostato il tasto con la stella dei preferiti direttamente a destra del titolo della schermata di pianificazione, per un'interazione ed un salvataggio delle tratte ancora più immediato.\\n- **🛣️ Ricerca Stradale Autocomplete**: Sostituite le vecchie select con due completi campi di testo ad autocompletamento (Partenza ed Arrivo). Digitando qualsiasi nome di via o stazione (es. Via Ermou, Plaka, Via Patission, Pireo, ecc.), il sistema consiglia e risolve istantaneamente le migliori corrispondenze geografiche interamente offline, suggerendo i percorsi, i cambi linea, le indicazioni pedonali in metri e i mezzi da prendere.\\n- **🔒 Sicurezza e Privacy**: Impedito lo screenshot dell'applicazione e oscurata l'anteprima dell'applicazione nella schermata delle app recenti di Android per una privacy assoluta della tua roccaforte digitale.\\n- **🚗 Gestione Auto e Targa**: Rimossa la garanzia della batteria 12V, rinominato il campo batteria ibrida in Scad. Garanzia. Abilitato il copia-veloce della targa dell'auto con feedback di vibrazione e toast a scorrimento.\\n- **🗣️ Assistente Vocale Semantico**: Potenziata la ricerca vocale dell'app per rispondere a voce in italiano alle scadenze dell'auto (assicurazione, bollo, tagliando, revisione) calcolando i giorni/km rimanenti.\\n- **🧹 Pulizia UI**: Rimossa la categoria Trasporti dal drawer di inserimento e nascosti gli header superiori (titolo, contatore, pulsante indietro) per le singole categorie filtrate per un design più fluido e pulito.\\n\\n### ⚠️ Avviso installazione APK (App Sconosciuta / Play Protect):\\nTrattandosi di un'applicazione compilata e distribuita manualmente (sideloaded) e non tramite Google Play Store, al momento dell'installazione o dell'aggiornamento Android potrebbe mostrare un avviso di sicurezza (*App Sconosciuta* o *Play Protect*).\\n\\nPer procedere:\\n1. Se appare il blocco di Google Play Protect, premi su **Ulteriori dettagli** e successivamente su **Installa comunque**.\\n2. Se richiesto, abilita l'opzione **Consenti l'installazione da questa sorgente** o **Installa app sconosciute** nelle impostazioni di Android per l'app Chelona (o il browser).\",
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

