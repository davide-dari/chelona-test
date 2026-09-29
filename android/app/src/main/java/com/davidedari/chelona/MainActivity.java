package com.davidedari.chelona;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Prevent screenshots and hide app preview in recent switcher for privacy
        getWindow().setFlags(WindowManager.LayoutParams.FLAG_SECURE, WindowManager.LayoutParams.FLAG_SECURE);
        
        super.onCreate(savedInstanceState);

        // Disabilita swipe back/forward nativo del WebView per evitare
        // navigazioni inaspettate con le gesture Android edge-swipe
        WebView webView = this.getBridge().getWebView();
        webView.post(new Runnable() {
            @Override
            public void run() {
                // Disabilita history navigation via swipe
                webView.clearHistory();
                // Disabilita overscroll (effetto rimbalzo ai bordi)
                webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
            }
        });

        // Espone l'interfaccia Javascript ChelonaNative per sincronizzare la rubrica e gestire download in background
        this.getBridge().getWebView().post(new Runnable() {
            @Override
            public void run() {
                MainActivity.this.getBridge().getWebView().addJavascriptInterface(new Object() {
                    @android.webkit.JavascriptInterface
                    public void saveAddresses(String json) {
                        android.content.SharedPreferences prefs = getApplicationContext().getSharedPreferences("ChelonaPrefs", android.content.Context.MODE_PRIVATE);
                        prefs.edit().putString("address_book", json).apply();
                    }

                    @android.webkit.JavascriptInterface
                    public void setDownloadActive(final boolean active) {
                        isAiDownloading = active;
                        runOnUiThread(new Runnable() {
                            @Override
                            public void run() {
                                try {
                                    if (active) {
                                        if (downloadWakeLock == null) {
                                            android.os.PowerManager pm = (android.os.PowerManager) getSystemService(android.content.Context.POWER_SERVICE);
                                            if (pm != null) {
                                                downloadWakeLock = pm.newWakeLock(android.os.PowerManager.PARTIAL_WAKE_LOCK, "Chelona:AiDownload");
                                                downloadWakeLock.acquire(45 * 60 * 1000L); // 45 minuti timeout
                                            }
                                        }
                                    } else {
                                        if (downloadWakeLock != null && downloadWakeLock.isHeld()) {
                                            downloadWakeLock.release();
                                            downloadWakeLock = null;
                                        }
                                    }
                                } catch (Exception e) {
                                    android.util.Log.e("ChelonaNative", "WakeLock error", e);
                                }
                            }
                        });
                    }

                    @android.webkit.JavascriptInterface
                    public boolean isPinShortcutSupported() {
                        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                            android.content.pm.ShortcutManager shortcutManager = getSystemService(android.content.pm.ShortcutManager.class);
                            return shortcutManager != null && shortcutManager.isRequestPinShortcutSupported();
                        }
                        return false;
                    }

                    @android.webkit.JavascriptInterface
                    public boolean createPinnedShortcut(final String route, final String shortLabel, final String longLabel, final String iconBase64, final String colorHex) {
                        return MainActivity.this.createPinnedShortcutNative(route, shortLabel, longLabel, iconBase64, colorHex);
                    }

                    @android.webkit.JavascriptInterface
                    public boolean startSpeechRecognition(final String lang) {
                        return MainActivity.this.startSpeechRecognitionNative(lang);
                    }

                    @android.webkit.JavascriptInterface
                    public void stopSpeechRecognition() {
                        MainActivity.this.stopSpeechRecognitionNative();
                    }

                    @android.webkit.JavascriptInterface
                    public boolean isOnDeviceSpeechAvailable() {
                        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
                            return android.speech.SpeechRecognizer.isOnDeviceRecognitionAvailable(getApplicationContext());
                        }
                        return false;
                    }
                }, "ChelonaNative");
            }
        });

        // Configura scorciatoie dinamiche native per Android launcher
        setupDynamicShortcuts();

        // Avvia il controllo periodico degli aggiornamenti in background (ogni 4 ore)
        try {
            androidx.work.Constraints constraints = new androidx.work.Constraints.Builder()
                    .setRequiredNetworkType(androidx.work.NetworkType.CONNECTED)
                    .build();

            androidx.work.PeriodicWorkRequest updateCheckRequest =
                    new androidx.work.PeriodicWorkRequest.Builder(UpdateCheckWorker.class, 4, java.util.concurrent.TimeUnit.HOURS)
                            .setConstraints(constraints)
                            .build();

            androidx.work.WorkManager.getInstance(getApplicationContext()).enqueueUniquePeriodicWork(
                    "ChelonaPeriodicUpdateCheck",
                    androidx.work.ExistingPeriodicWorkPolicy.KEEP,
                    updateCheckRequest
            );
        } catch (Exception e) {
            android.util.Log.e("MainActivity", "Failed to schedule UpdateCheckWorker", e);
        }

        handleIntent(getIntent());
    }

    private android.os.PowerManager.WakeLock downloadWakeLock = null;
    private boolean isAiDownloading = false;

    @Override
    public void onPause() {
        super.onPause();
        if (isAiDownloading) {
            // Mantieni attivi i timer JavaScript e i WebWorker anche quando l'app va in background
            try {
                WebView webView = this.getBridge().getWebView();
                if (webView != null) {
                    webView.resumeTimers();
                }
            } catch (Exception e) {
                android.util.Log.w("ChelonaNative", "Error resuming timers in onPause", e);
            }
        }
    }

    @Override
    public void onDestroy() {
        if (nativeSpeechRecognizer != null) {
            try {
                nativeSpeechRecognizer.destroy();
            } catch (Exception ignored) {}
            nativeSpeechRecognizer = null;
        }
        if (downloadWakeLock != null && downloadWakeLock.isHeld()) {
            try {
                downloadWakeLock.release();
            } catch (Exception ignored) {}
            downloadWakeLock = null;
        }
        super.onDestroy();
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        handleIntent(intent);
    }

    private void handleIntent(Intent intent) {
        if (intent == null) return;
        String action = intent.getAction();
        String type = intent.getType();

        // 1. Notifiche native (es: UpdateCheckWorker o Intent con extra route)
        if (intent.hasExtra("route")) {
            final String route = intent.getStringExtra("route");
            final String version = intent.hasExtra("version") ? intent.getStringExtra("version") : "";
            final String moduleId = intent.hasExtra("moduleId") ? intent.getStringExtra("moduleId") : "";
            final String routeAction = intent.hasExtra("action") ? intent.getStringExtra("action") : "";
            final boolean fromShortcut = intent.getBooleanExtra("fromShortcut", false);

            this.getBridge().getWebView().post(new Runnable() {
                @Override
                public void run() {
                    String js = "window.pendingNotificationRoute = { route: '" + route + "', version: '" + version + "', moduleId: '" + moduleId + "', action: '" + routeAction + "', fromShortcut: " + fromShortcut + " }; " +
                                "window.dispatchEvent(new CustomEvent('notificationRouteReceived', { detail: window.pendingNotificationRoute }));";
                    MainActivity.this.getBridge().getWebView().evaluateJavascript(js, null);
                }
            });
        }

        // 2. Notifiche programmate di Capacitor LocalNotifications aperte da app chiusa
        if (intent.hasExtra("LocalNotficationObject")) {
            try {
                String notifJsonStr = intent.getStringExtra("LocalNotficationObject");
                if (notifJsonStr != null) {
                    org.json.JSONObject notifJson = new org.json.JSONObject(notifJsonStr);
                    org.json.JSONObject extra = notifJson.optJSONObject("extra");
                    if (extra != null && extra.has("route")) {
                        final String route = extra.optString("route");
                        final String moduleId = extra.optString("moduleId", "");
                        final String routeAction = extra.optString("action", "");
                        final boolean fromShortcut = extra.optBoolean("fromShortcut", false);
                        this.getBridge().getWebView().post(new Runnable() {
                            @Override
                            public void run() {
                                String js = "window.pendingNotificationRoute = { route: '" + route + "', moduleId: '" + moduleId + "', action: '" + routeAction + "', fromShortcut: " + fromShortcut + " }; " +
                                            "window.dispatchEvent(new CustomEvent('notificationRouteReceived', { detail: window.pendingNotificationRoute }));";
                                MainActivity.this.getBridge().getWebView().evaluateJavascript(js, null);
                            }
                        });
                    }
                }
            } catch (Exception ignored) {}
        }

        // 3. Condivisione testo da altre app
        if (Intent.ACTION_SEND.equals(action) && type != null) {
            if ("text/plain".equals(type)) {
                final String sharedText = intent.getStringExtra(Intent.EXTRA_TEXT);
                if (sharedText != null) {
                    final String safeText = sharedText.replace("'", "\\'").replace("\r", "").replace("\n", "\\n");
                    this.getBridge().getWebView().post(new Runnable() {
                        @Override
                        public void run() {
                            MainActivity.this.getBridge().getWebView().evaluateJavascript(
                                "window.pendingSharedIntent = { text: '" + safeText + "' }; " +
                                "window.dispatchEvent(new CustomEvent('sharedIntentReceived', { detail: { text: '" + safeText + "' } }));", 
                                null
                            );
                        }
                    });
                }
            }
        }
    }

    /**
     * Crea un collegamento permanente (Pinned Shortcut) sulla Home di Android
     */
    public boolean createPinnedShortcutNative(String route, String shortLabel, String longLabel, String iconBase64, String colorHex) {
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            try {
                android.content.pm.ShortcutManager shortcutManager = getSystemService(android.content.pm.ShortcutManager.class);
                if (shortcutManager == null || !shortcutManager.isRequestPinShortcutSupported()) {
                    return false;
                }

                android.content.Context context = getApplicationContext();

                Intent shortcutIntent = new Intent(context, MainActivity.class);
                shortcutIntent.setAction(Intent.ACTION_VIEW);
                shortcutIntent.putExtra("route", route != null ? route : "home");
                shortcutIntent.putExtra("fromShortcut", true);
                shortcutIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);

                android.graphics.drawable.Icon icon = null;
                if (iconBase64 != null && !iconBase64.trim().isEmpty()) {
                    try {
                        String cleanBase64 = iconBase64.trim();
                        if (cleanBase64.contains(",")) {
                            cleanBase64 = cleanBase64.substring(cleanBase64.indexOf(",") + 1);
                        }
                        byte[] decodedBytes = android.util.Base64.decode(cleanBase64, android.util.Base64.DEFAULT);
                        android.graphics.Bitmap bitmap = android.graphics.BitmapFactory.decodeByteArray(decodedBytes, 0, decodedBytes.length);
                        if (bitmap != null) {
                            icon = android.graphics.drawable.Icon.createWithAdaptiveBitmap(bitmap);
                        }
                    } catch (Exception e) {
                        android.util.Log.e("ChelonaNative", "Error decoding shortcut icon base64", e);
                    }
                }

                if (icon == null) {
                    android.graphics.Bitmap fallbackBitmap = createFallbackShortcutBitmap(shortLabel, colorHex);
                    if (fallbackBitmap != null) {
                        icon = android.graphics.drawable.Icon.createWithAdaptiveBitmap(fallbackBitmap);
                    } else {
                        icon = android.graphics.drawable.Icon.createWithResource(context, R.mipmap.ic_launcher);
                    }
                }

                String cleanRoute = (route != null ? route : "default").replaceAll("[^a-zA-Z0-9_-]", "_");
                String shortcutId = "chelona_section_" + cleanRoute;

                android.content.pm.ShortcutInfo pinShortcutInfo = new android.content.pm.ShortcutInfo.Builder(context, shortcutId)
                        .setShortLabel(shortLabel != null && !shortLabel.trim().isEmpty() ? shortLabel : "Chelona")
                        .setLongLabel(longLabel != null && !longLabel.trim().isEmpty() ? longLabel : (shortLabel != null ? shortLabel : "Chelona"))
                        .setIcon(icon)
                        .setIntent(shortcutIntent)
                        .build();

                return shortcutManager.requestPinShortcut(pinShortcutInfo, null);
            } catch (Exception e) {
                android.util.Log.e("ChelonaNative", "Failed to create pinned shortcut", e);
                return false;
            }
        }
        return false;
    }

    /**
     * Disegna una bitmap di fallback con il colore della sezione per l'icona Android
     */
    private android.graphics.Bitmap createFallbackShortcutBitmap(String label, String colorHex) {
        try {
            int size = 512;
            android.graphics.Bitmap bitmap = android.graphics.Bitmap.createBitmap(size, size, android.graphics.Bitmap.Config.ARGB_8888);
            android.graphics.Canvas canvas = new android.graphics.Canvas(bitmap);
            android.graphics.Paint paint = new android.graphics.Paint(android.graphics.Paint.ANTI_ALIAS_FLAG);

            int color = android.graphics.Color.parseColor(colorHex != null && colorHex.startsWith("#") ? colorHex : "#4F46E5");
            paint.setColor(color);
            canvas.drawRect(0, 0, size, size, paint);

            paint.setColor(android.graphics.Color.WHITE);
            paint.setTextSize(220);
            paint.setTextAlign(android.graphics.Paint.Align.CENTER);
            paint.setTypeface(android.graphics.Typeface.create(android.graphics.Typeface.DEFAULT, android.graphics.Typeface.BOLD));

            String initial = label != null && !label.trim().isEmpty() ? label.trim().substring(0, 1).toUpperCase() : "C";
            android.graphics.Rect bounds = new android.graphics.Rect();
            paint.getTextBounds(initial, 0, initial.length(), bounds);
            float y = (size / 2f) + (bounds.height() / 2f);
            canvas.drawText(initial, size / 2f, y, paint);

            return bitmap;
        } catch (Exception e) {
            android.util.Log.e("ChelonaNative", "Error generating fallback shortcut bitmap", e);
            return null;
        }
    }

    /**
     * Configura le scorciatoie dinamiche visibili tenendo premuta l'icona di Chelona
     */
    private void setupDynamicShortcuts() {
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.N_MR1) {
            try {
                android.content.pm.ShortcutManager shortcutManager = getSystemService(android.content.pm.ShortcutManager.class);
                if (shortcutManager != null) {
                    android.content.Context context = getApplicationContext();

                    Intent autoIntent = new Intent(context, MainActivity.class);
                    autoIntent.setAction(Intent.ACTION_VIEW);
                    autoIntent.putExtra("route", "auto");
                    autoIntent.putExtra("fromShortcut", true);
                    autoIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);

                    android.content.pm.ShortcutInfo autoShortcut = new android.content.pm.ShortcutInfo.Builder(context, "dynamic_auto")
                            .setShortLabel("Auto")
                            .setLongLabel("Chelona Auto")
                            .setIcon(android.graphics.drawable.Icon.createWithResource(context, R.mipmap.ic_launcher))
                            .setIntent(autoIntent)
                            .setRank(1)
                            .build();

                    Intent parkingIntent = new Intent(context, MainActivity.class);
                    parkingIntent.setAction(Intent.ACTION_VIEW);
                    parkingIntent.putExtra("route", "parking");
                    parkingIntent.putExtra("fromShortcut", true);
                    parkingIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);

                    android.content.pm.ShortcutInfo parkingShortcut = new android.content.pm.ShortcutInfo.Builder(context, "dynamic_parking")
                            .setShortLabel("Parcheggio")
                            .setLongLabel("Dov'è la mia auto")
                            .setIcon(android.graphics.drawable.Icon.createWithResource(context, R.mipmap.ic_launcher))
                            .setIntent(parkingIntent)
                            .setRank(2)
                            .build();

                    Intent spesaIntent = new Intent(context, MainActivity.class);
                    spesaIntent.setAction(Intent.ACTION_VIEW);
                    spesaIntent.putExtra("route", "supermarket");
                    spesaIntent.putExtra("fromShortcut", true);
                    spesaIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);

                    android.content.pm.ShortcutInfo spesaShortcut = new android.content.pm.ShortcutInfo.Builder(context, "dynamic_spesa")
                            .setShortLabel("Spesa")
                            .setLongLabel("Lista della Spesa")
                            .setIcon(android.graphics.drawable.Icon.createWithResource(context, R.mipmap.ic_launcher))
                            .setIntent(spesaIntent)
                            .setRank(3)
                            .build();

                    Intent volantiniIntent = new Intent(context, MainActivity.class);
                    volantiniIntent.setAction(Intent.ACTION_VIEW);
                    volantiniIntent.putExtra("route", "volantino");
                    volantiniIntent.putExtra("fromShortcut", true);
                    volantiniIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);

                    android.content.pm.ShortcutInfo volantiniShortcut = new android.content.pm.ShortcutInfo.Builder(context, "dynamic_volantini")
                            .setShortLabel("Volantini")
                            .setLongLabel("Volantini & Offerte")
                            .setIcon(android.graphics.drawable.Icon.createWithResource(context, R.mipmap.ic_launcher))
                            .setIntent(volantiniIntent)
                            .setRank(4)
                            .build();

                    java.util.List<android.content.pm.ShortcutInfo> dynamicList = new java.util.ArrayList<>();
                    dynamicList.add(autoShortcut);
                    dynamicList.add(parkingShortcut);
                    dynamicList.add(spesaShortcut);
                    dynamicList.add(volantiniShortcut);

                    shortcutManager.setDynamicShortcuts(dynamicList);
                }
            } catch (Exception e) {
                android.util.Log.w("MainActivity", "Failed to setup dynamic shortcuts", e);
            }
        }
    }

    // =========================================================================
    // RICONOSCIMENTO VOCALE NATIVO IN-APP (SENZA DIALOG GOOGLE)
    // =========================================================================
    private android.speech.SpeechRecognizer nativeSpeechRecognizer = null;
    private static final int PERMISSION_REQUEST_RECORD_AUDIO = 2001;
    private String pendingSpeechLang = "it-IT";

    public boolean startSpeechRecognitionNative(final String lang) {
        if (androidx.core.content.ContextCompat.checkSelfPermission(this, android.Manifest.permission.RECORD_AUDIO)
                != android.content.pm.PackageManager.PERMISSION_GRANTED) {
            this.pendingSpeechLang = (lang != null && !lang.isEmpty()) ? lang : "it-IT";
            androidx.core.app.ActivityCompat.requestPermissions(this,
                    new String[]{android.Manifest.permission.RECORD_AUDIO},
                    PERMISSION_REQUEST_RECORD_AUDIO);
            return true;
        }

        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                try {
                    android.content.Context context = getApplicationContext();

                    if (nativeSpeechRecognizer != null) {
                        try {
                            nativeSpeechRecognizer.cancel();
                        } catch (Exception ignored) {}
                    } else {
                        try {
                            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU &&
                                    android.speech.SpeechRecognizer.isOnDeviceRecognitionAvailable(context)) {
                                nativeSpeechRecognizer = android.speech.SpeechRecognizer.createOnDeviceSpeechRecognizer(context);
                            }
                        } catch (Exception ignored) {}

                        if (nativeSpeechRecognizer == null) {
                            try {
                                nativeSpeechRecognizer = android.speech.SpeechRecognizer.createSpeechRecognizer(context);
                            } catch (Exception e) {
                                android.util.Log.e("ChelonaNative", "Error creating speech recognizer", e);
                            }
                        }
                    }

                    if (nativeSpeechRecognizer == null) {
                        emitJsEvent("chelona_speech_error", "{ \"error\": \"not_available\" }");
                        return;
                    }

                    Intent intent = new Intent(android.speech.RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
                    intent.putExtra(android.speech.RecognizerIntent.EXTRA_LANGUAGE_MODEL, android.speech.RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
                    String speechLang = (lang != null && !lang.isEmpty()) ? lang : "it-IT";
                    intent.putExtra(android.speech.RecognizerIntent.EXTRA_LANGUAGE, speechLang);
                    intent.putExtra(android.speech.RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, speechLang);
                    intent.putExtra(android.speech.RecognizerIntent.EXTRA_PARTIAL_RESULTS, true);
                    intent.putExtra(android.speech.RecognizerIntent.EXTRA_MAX_RESULTS, 1);
                    intent.putExtra("android.speech.extra.DICTATION_MODE", true);
                    intent.putExtra(android.speech.RecognizerIntent.EXTRA_CALLING_PACKAGE, getPackageName());

                    nativeSpeechRecognizer.setRecognitionListener(new android.speech.RecognitionListener() {
                        @Override
                        public void onReadyForSpeech(Bundle params) {
                            emitJsEvent("chelona_speech_ready", "{}");
                        }

                        @Override
                        public void onBeginningOfSpeech() {
                            emitJsEvent("chelona_speech_start", "{}");
                        }

                        @Override
                        public void onRmsChanged(float rmsdB) {
                            emitJsEvent("chelona_speech_rms", "{ \"rms\": " + rmsdB + " }");
                        }

                        @Override
                        public void onBufferReceived(byte[] buffer) {}

                        @Override
                        public void onEndOfSpeech() {
                            emitJsEvent("chelona_speech_end", "{}");
                        }

                        @Override
                        public void onError(int error) {
                            try {
                                if (nativeSpeechRecognizer != null) {
                                    nativeSpeechRecognizer.cancel();
                                }
                            } catch (Exception ignored) {}
                            if (error == android.speech.SpeechRecognizer.ERROR_RECOGNIZER_BUSY || 
                                error == android.speech.SpeechRecognizer.ERROR_CLIENT) {
                                try {
                                    nativeSpeechRecognizer.destroy();
                                } catch (Exception ignored) {}
                                nativeSpeechRecognizer = null;
                            }
                            emitJsEvent("chelona_speech_error", "{ \"error\": " + error + " }");
                        }

                        @Override
                        public void onResults(Bundle results) {
                            java.util.ArrayList<String> matches = results.getStringArrayList(android.speech.SpeechRecognizer.RESULTS_RECOGNITION);
                            if (matches != null && !matches.isEmpty()) {
                                try {
                                    org.json.JSONObject obj = new org.json.JSONObject();
                                    obj.put("text", matches.get(0));
                                    obj.put("isFinal", true);
                                    emitJsEvent("chelona_speech_result", obj.toString());
                                } catch (Exception e) {
                                    emitJsEvent("chelona_speech_end", "{}");
                                }
                            } else {
                                emitJsEvent("chelona_speech_end", "{}");
                            }
                        }

                        @Override
                        public void onPartialResults(Bundle partialResults) {
                            java.util.ArrayList<String> matches = partialResults.getStringArrayList(android.speech.SpeechRecognizer.RESULTS_RECOGNITION);
                            if (matches != null && !matches.isEmpty()) {
                                try {
                                    org.json.JSONObject obj = new org.json.JSONObject();
                                    obj.put("text", matches.get(0));
                                    obj.put("isFinal", false);
                                    emitJsEvent("chelona_speech_partial", obj.toString());
                                } catch (Exception ignored) {}
                            }
                        }

                        @Override
                        public void onEvent(int eventType, Bundle params) {}
                    });

                    nativeSpeechRecognizer.startListening(intent);
                } catch (Exception e) {
                    android.util.Log.e("ChelonaNative", "startSpeechRecognitionNative failed", e);
                    try {
                        if (nativeSpeechRecognizer != null) {
                            nativeSpeechRecognizer.destroy();
                            nativeSpeechRecognizer = null;
                        }
                    } catch (Exception ignored) {}
                    emitJsEvent("chelona_speech_error", "{ \"error\": \"" + e.getMessage() + "\" }");
                }
            }
        });
        return true;
    }

    public void stopSpeechRecognitionNative() {
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                if (nativeSpeechRecognizer != null) {
                    try {
                        nativeSpeechRecognizer.stopListening();
                    } catch (Exception ignored) {}
                }
            }
        });
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == PERMISSION_REQUEST_RECORD_AUDIO) {
            if (grantResults.length > 0 && grantResults[0] == android.content.pm.PackageManager.PERMISSION_GRANTED) {
                startSpeechRecognitionNative(this.pendingSpeechLang);
            } else {
                emitJsEvent("chelona_speech_error", "{ \"error\": \"permission_denied\" }");
            }
        }
    }

    private void emitJsEvent(final String eventName, final String jsonDetail) {
        if (this.getBridge() != null && this.getBridge().getWebView() != null) {
            this.getBridge().getWebView().post(new Runnable() {
                @Override
                public void run() {
                    String js = "window.dispatchEvent(new CustomEvent('" + eventName + "', { detail: " + jsonDetail + " }));";
                    MainActivity.this.getBridge().getWebView().evaluateJavascript(js, null);
                }
            });
        }
    }
}
