package com.davidedari.chelona;

import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.BatteryManager;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@CapacitorPlugin(name = "ChelonaLlm")
public class ChelonaLlmPlugin extends Plugin {

    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private long nativeContextPtr = 0L;
    private boolean isModelLoaded = false;
    private int contextMax = 4096;
    private int contextUsed = 0;

    public static boolean isNativeLibAvailable = false;

    static {
        try {
            System.loadLibrary("chelona_llm");
            isNativeLibAvailable = true;
        } catch (Throwable e) {
            android.util.Log.w("ChelonaLlm", "llama.cpp native library not present or failed to load: " + e.getMessage());
            isNativeLibAvailable = false;
        }
    }

    // JNI Declarations
    public native long nativeLoadModel(String modelPath, int nCtx, int nThreads, int nBatch, int nGpuLayers);
    public native String nativeGenerate(long ctxPtr, String prompt, int maxTokens, float temperature, float topP, int topK, float repeatPenalty, String[] stopTokens);
    public native void nativeUnloadModel(long ctxPtr);
    public native int nativeGetContextUsed(long ctxPtr);

    @PluginMethod
    public void loadModel(final PluginCall call) {
        if (!isNativeLibAvailable) {
            call.reject("Native LLM engine library not installed on device");
            return;
        }

        final String path = call.getString("path");
        if (path == null) {
            call.reject("path is required");
            return;
        }

        final JSObject params = call.getObject("params", new JSObject());
        final int nCtx = params.optInt("n_ctx", 4096);
        final int nThreads = params.optInt("n_threads", 4);
        final int nBatch = params.optInt("n_batch", 128);
        final int nGpuLayers = params.optInt("n_gpu_layers", 0);

        executor.execute(new Runnable() {
            @Override
            public void run() {
                try {
                    File file = new File(path);
                    if (!file.exists()) {
                        call.reject("Model file not found at: " + path);
                        return;
                    }

                    if (isModelLoaded && nativeContextPtr != 0L) {
                        try {
                            nativeUnloadModel(nativeContextPtr);
                        } catch (Throwable ignored) {}
                        isModelLoaded = false;
                        nativeContextPtr = 0L;
                    }

                    contextMax = nCtx;
                    try {
                        nativeContextPtr = nativeLoadModel(path, nCtx, nThreads, nBatch, nGpuLayers);
                    } catch (Throwable t) {
                        nativeContextPtr = 0L;
                    }

                    if (nativeContextPtr == 0L) {
                        call.reject("Failed to load model — out of memory or corrupt file");
                        return;
                    }

                    isModelLoaded = true;
                    JSObject ret = new JSObject();
                    ret.put("loaded", true);
                    call.resolve(ret);
                } catch (Exception e) {
                    call.reject("loadModel error: " + e.getMessage());
                }
            }
        });
    }

    @PluginMethod
    public void generate(final PluginCall call) {
        if (!isModelLoaded || nativeContextPtr == 0L) {
            call.reject("Model not loaded");
            return;
        }

        final String prompt = call.getString("prompt");
        if (prompt == null) {
            call.reject("prompt is required");
            return;
        }

        final int maxTokens = call.getInt("maxTokens", 512);
        final float temperature = call.getFloat("temperature", 0.3f);
        final float topP = call.getFloat("top_p", 0.9f);
        final int topK = call.getInt("top_k", 40);
        final float repeatPenalty = call.getFloat("repeat_penalty", 1.1f);

        JSArray stopArray = call.getArray("stop");
        final String[] stopTokens;
        if (stopArray != null) {
            stopTokens = new String[stopArray.length()];
            for (int i = 0; i < stopArray.length(); i++) {
                try {
                    stopTokens[i] = stopArray.getString(i);
                } catch (Exception ignored) {
                    stopTokens[i] = "";
                }
            }
        } else {
            stopTokens = new String[0];
        }

        executor.execute(new Runnable() {
            @Override
            public void run() {
                try {
                    String result = nativeGenerate(
                        nativeContextPtr,
                        prompt,
                        maxTokens,
                        temperature,
                        topP,
                        topK,
                        repeatPenalty,
                        stopTokens
                    );

                    contextUsed = nativeGetContextUsed(nativeContextPtr);
                    JSObject ret = new JSObject();
                    ret.put("text", result);
                    call.resolve(ret);
                } catch (Exception e) {
                    call.reject("generate error: " + e.getMessage());
                }
            }
        });
    }

    @PluginMethod
    public void unloadModel(final PluginCall call) {
        executor.execute(new Runnable() {
            @Override
            public void run() {
                if (nativeContextPtr != 0L) {
                    try {
                        nativeUnloadModel(nativeContextPtr);
                    } catch (Exception e) {
                        android.util.Log.w("ChelonaLlm", "unloadModel error: " + e.getMessage());
                    }
                    nativeContextPtr = 0L;
                    isModelLoaded = false;
                    contextUsed = 0;
                }
                call.resolve();
            }
        });
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("loaded", isModelLoaded);
        ret.put("contextUsed", contextUsed);
        ret.put("contextMax", contextMax);
        call.resolve(ret);
    }

    @PluginMethod
    public void getBatteryLevel(PluginCall call) {
        try {
            Context ctx = getContext();
            if (ctx == null) {
                ctx = getActivity();
            }
            if (ctx == null) {
                JSObject ret = new JSObject();
                ret.put("level", 100);
                ret.put("charging", true);
                call.resolve(ret);
                return;
            }

            Intent batteryIntent = ctx.registerReceiver(null, new IntentFilter(Intent.ACTION_BATTERY_CHANGED));
            int level = batteryIntent != null ? batteryIntent.getIntExtra(BatteryManager.EXTRA_LEVEL, -1) : -1;
            int scale = batteryIntent != null ? batteryIntent.getIntExtra(BatteryManager.EXTRA_SCALE, -1) : -1;
            int status = batteryIntent != null ? batteryIntent.getIntExtra(BatteryManager.EXTRA_STATUS, -1) : -1;

            int batteryPct = (level >= 0 && scale > 0) ? (level * 100 / scale) : 100;
            boolean charging = status == BatteryManager.BATTERY_STATUS_CHARGING || status == BatteryManager.BATTERY_STATUS_FULL;

            JSObject ret = new JSObject();
            ret.put("level", batteryPct);
            ret.put("charging", charging);
            call.resolve(ret);
        } catch (Exception e) {
            JSObject ret = new JSObject();
            ret.put("level", 100);
            ret.put("charging", false);
            call.resolve(ret);
        }
    }

    @Override
    protected void handleOnDestroy() {
        if (nativeContextPtr != 0L) {
            try {
                nativeUnloadModel(nativeContextPtr);
            } catch (Exception ignored) {}
            nativeContextPtr = 0L;
        }
        executor.shutdown();
        super.handleOnDestroy();
    }
}
