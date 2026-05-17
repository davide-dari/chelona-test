package com.davidedari.chelona;

import android.content.Intent;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Espone l'interfaccia Javascript ChelonaNative per sincronizzare la rubrica indirizzi nativamente
        this.getBridge().getWebView().post(new Runnable() {
            @Override
            public void run() {
                MainActivity.this.getBridge().getWebView().addJavascriptInterface(new Object() {
                    @android.webkit.JavascriptInterface
                    public void saveAddresses(String json) {
                        android.content.SharedPreferences prefs = getApplicationContext().getSharedPreferences("ChelonaPrefs", android.content.Context.MODE_PRIVATE);
                        prefs.edit().putString("address_book", json).apply();
                    }
                }, "ChelonaNative");
            }
        });

        handleIntent(getIntent());
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
