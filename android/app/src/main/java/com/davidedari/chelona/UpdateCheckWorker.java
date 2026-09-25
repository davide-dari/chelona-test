package com.davidedari.chelona;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;

public class UpdateCheckWorker extends Worker {

    private static final String TAG = "UpdateCheckWorker";
    private static final String CHANNEL_ID = "chelona_updates";
    private static final String PREFS_NAME = "ChelonaUpdatePrefs";
    private static final String KEY_LAST_NOTIFIED = "last_notified_release";

    public UpdateCheckWorker(@NonNull Context context, @NonNull WorkerParameters workerParams) {
        super(context, workerParams);
    }

    @NonNull
    @Override
    public Result doWork() {
        Log.d(TAG, "Starting background update check...");
        try {
            Context appContext = getApplicationContext();
            String currentVersion = appContext.getPackageManager().getPackageInfo(appContext.getPackageName(), 0).versionName;
            URL url = new URL("https://api.github.com/repos/davide-dari/chelona-test/releases?per_page=5");
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("GET");
            conn.setRequestProperty("Accept", "application/vnd.github.v3+json");
            conn.setRequestProperty("User-Agent", "Chelona-UpdateCheckWorker");
            conn.setConnectTimeout(10000);
            conn.setReadTimeout(10000);

            int responseCode = conn.getResponseCode();
            if (responseCode != 200) {
                Log.w(TAG, "GitHub API returned response code: " + responseCode);
                return Result.retry();
            }

            BufferedReader reader = new BufferedReader(new InputStreamReader(conn.getInputStream()));
            StringBuilder response = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                response.append(line);
            }
            reader.close();
            conn.disconnect();

            JSONArray releases = new JSONArray(response.toString());
            for (int i = 0; i < releases.length(); i++) {
                JSONObject release = releases.getJSONObject(i);
                if (release.optBoolean("draft", false)) continue;
                String tagName = release.optString("tag_name", "");
                if (tagName.isEmpty()) continue;

                // Check for valid APK asset
                boolean hasApk = false;
                JSONArray assets = release.optJSONArray("assets");
                if (assets != null) {
                    for (int j = 0; j < assets.length(); j++) {
                        JSONObject asset = assets.getJSONObject(j);
                        String name = asset.optString("name", "");
                        long size = asset.optLong("size", 0);
                        if (name.endsWith(".apk") && size > 1000000) {
                            hasApk = true;
                            break;
                        }
                    }
                }

                if (!hasApk) continue;

                String latestVersion = tagName.startsWith("v") ? tagName.substring(1) : tagName;
                if (isNewerVersion(latestVersion, currentVersion)) {
                    SharedPreferences prefs = getApplicationContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
                    String lastNotified = prefs.getString(KEY_LAST_NOTIFIED, "");
                    if (lastNotified.equals(latestVersion)) {
                        Log.d(TAG, "Update " + latestVersion + " was already notified to the user.");
                        return Result.success();
                    }

                    showUpdateNotification(latestVersion);
                    prefs.edit().putString(KEY_LAST_NOTIFIED, latestVersion).apply();
                    Log.i(TAG, "Notified user of new version: " + latestVersion);
                    break;
                }
            }

            return Result.success();
        } catch (Exception e) {
            Log.e(TAG, "Error checking updates in background", e);
            return Result.retry();
        }
    }

    private void showUpdateNotification(String latestVersion) {
        Context context = getApplicationContext();
        NotificationManager notificationManager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (notificationManager == null) return;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Aggiornamenti Applicazione",
                    NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Notifiche per nuove versioni disponibili di Chelona");
            channel.enableVibration(true);
            notificationManager.createNotificationChannel(channel);
        }

        Intent intent = new Intent(context, MainActivity.class);
        intent.setAction(Intent.ACTION_VIEW);
        intent.putExtra("route", "update");
        intent.putExtra("version", latestVersion);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);

        int pendingIntentFlags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            pendingIntentFlags |= PendingIntent.FLAG_IMMUTABLE;
        }

        PendingIntent pendingIntent = PendingIntent.getActivity(context, 1001, intent, pendingIntentFlags);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle("🚀 Aggiornamento Disponibile!")
                .setContentText("La nuova versione v" + latestVersion + " di Chelona è pronta. Tocca per aggiornare!")
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setAutoCancel(true)
                .setContentIntent(pendingIntent);

        notificationManager.notify(9999, builder.build());
    }

    private boolean isNewerVersion(String latest, String current) {
        try {
            String[] v1Parts = latest.split("\\.");
            String[] v2Parts = current.split("\\.");
            int maxLen = Math.max(v1Parts.length, v2Parts.length);
            for (int i = 0; i < maxLen; i++) {
                int p1 = i < v1Parts.length ? Integer.parseInt(v1Parts[i]) : 0;
                int p2 = i < v2Parts.length ? Integer.parseInt(v2Parts[i]) : 0;
                if (p1 > p2) return true;
                if (p1 < p2) return false;
            }
            return false;
        } catch (Exception e) {
            return false;
        }
    }
}
