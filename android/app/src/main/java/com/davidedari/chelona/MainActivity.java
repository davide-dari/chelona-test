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
                }, "ChelonaNative");
            }
        });

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

            this.getBridge().getWebView().post(new Runnable() {
                @Override
                public void run() {
                    String js = "window.pendingNotificationRoute = { route: '" + route + "', version: '" + version + "', moduleId: '" + moduleId + "', action: '" + routeAction + "' }; " +
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
                        this.getBridge().getWebView().post(new Runnable() {
                            @Override
                            public void run() {
                                String js = "window.pendingNotificationRoute = { route: '" + route + "', moduleId: '" + moduleId + "', action: '" + routeAction + "' }; " +
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
}
