package com.davidedari.chelona

import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.BatteryManager
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import kotlinx.coroutines.*
import java.io.File

/**
 * ChelonaLlmPlugin — Capacitor Native Plugin per inferenza Gemma 2 via llama.cpp
 *
 * Espone a TypeScript:
 *  - loadModel(path, params)
 *  - generate(prompt, params) → { text }
 *  - unloadModel()
 *  - getStatus() → { loaded, contextUsed, contextMax }
 *  - getBatteryLevel() → { level, charging }
 *
 * NOTA: Richiede llama.cpp Android JNI library (.so) compilata e inclusa nel progetto.
 * La libreria viene caricata tramite System.loadLibrary("llama").
 *
 * Per costruire la libreria nativa:
 * 1. Clona llama.cpp: git clone https://github.com/ggerganov/llama.cpp
 * 2. Compila per Android con NDK: cmake -DCMAKE_TOOLCHAIN_FILE=... -DLLAMA_ANDROID=ON
 * 3. Copia le .so in android/app/src/main/jniLibs/arm64-v8a/
 */
@CapacitorPlugin(name = "ChelonaLlm")
class ChelonaLlmPlugin : Plugin() {

    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private var nativeContextPtr: Long = 0L
    private var isModelLoaded = false
    private var contextMax = 4096
    private var contextUsed = 0

    // ---- JNI Declarations ----
    external fun nativeLoadModel(
        modelPath: String,
        nCtx: Int,
        nThreads: Int,
        nBatch: Int,
        nGpuLayers: Int
    ): Long

    external fun nativeGenerate(
        ctxPtr: Long,
        prompt: String,
        maxTokens: Int,
        temperature: Float,
        topP: Float,
        topK: Int,
        repeatPenalty: Float,
        stopTokens: Array<String>
    ): String

    external fun nativeUnloadModel(ctxPtr: Long)
    external fun nativeGetContextUsed(ctxPtr: Long): Int

    companion object {
        init {
            try {
                System.loadLibrary("chelona_llm")
            } catch (e: UnsatisfiedLinkError) {
                android.util.Log.e("ChelonaLlm", "llama.cpp native library not found: ${e.message}")
            }
        }
    }

    @PluginMethod
    fun loadModel(call: PluginCall) {
        val path = call.getString("path") ?: run {
            call.reject("path is required")
            return
        }

        val params = call.getObject("params") ?: JSObject()
        val nCtx = params.optInt("n_ctx", 4096)
        val nThreads = params.optInt("n_threads", 4)
        val nBatch = params.optInt("n_batch", 128)
        val nGpuLayers = params.optInt("n_gpu_layers", 0)

        scope.launch {
            try {
                // Verifica che il file esista
                val file = File(path)
                if (!file.exists()) {
                    call.reject("Model file not found at: $path")
                    return@launch
                }

                if (isModelLoaded && nativeContextPtr != 0L) {
                    nativeUnloadModel(nativeContextPtr)
                    isModelLoaded = false
                    nativeContextPtr = 0L
                }

                contextMax = nCtx
                nativeContextPtr = nativeLoadModel(
                    path, nCtx, nThreads, nBatch, nGpuLayers
                )

                if (nativeContextPtr == 0L) {
                    call.reject("Failed to load model — out of memory or corrupt file")
                    return@launch
                }

                isModelLoaded = true
                val ret = JSObject()
                ret.put("loaded", true)
                call.resolve(ret)

            } catch (e: Exception) {
                call.reject("loadModel error: ${e.message}")
            }
        }
    }

    @PluginMethod
    fun generate(call: PluginCall) {
        if (!isModelLoaded || nativeContextPtr == 0L) {
            call.reject("Model not loaded")
            return
        }

        val prompt = call.getString("prompt") ?: run {
            call.reject("prompt is required")
            return
        }

        val maxTokens = call.getInt("maxTokens", 512) ?: 512
        val temperature = call.getFloat("temperature", 0.3f) ?: 0.3f
        val topP = call.getFloat("top_p", 0.9f) ?: 0.9f
        val topK = call.getInt("top_k", 40) ?: 40
        val repeatPenalty = call.getFloat("repeat_penalty", 1.1f) ?: 1.1f

        val stopArray = call.getArray("stop")
        val stopTokens = (0 until (stopArray?.length() ?: 0))
            .map { stopArray!!.getString(it) }
            .filterNotNull()
            .toTypedArray()

        scope.launch {
            try {
                val result = nativeGenerate(
                    nativeContextPtr,
                    prompt,
                    maxTokens,
                    temperature,
                    topP,
                    topK,
                    repeatPenalty,
                    stopTokens
                )

                contextUsed = nativeGetContextUsed(nativeContextPtr)

                val ret = JSObject()
                ret.put("text", result)
                call.resolve(ret)

            } catch (e: Exception) {
                call.reject("generate error: ${e.message}")
            }
        }
    }

    @PluginMethod
    fun unloadModel(call: PluginCall) {
        scope.launch {
            if (nativeContextPtr != 0L) {
                try {
                    nativeUnloadModel(nativeContextPtr)
                } catch (e: Exception) {
                    android.util.Log.w("ChelonaLlm", "unloadModel error: ${e.message}")
                }
                nativeContextPtr = 0L
                isModelLoaded = false
                contextUsed = 0
            }
            call.resolve()
        }
    }

    @PluginMethod
    fun getStatus(call: PluginCall) {
        val ret = JSObject()
        ret.put("loaded", isModelLoaded)
        ret.put("contextUsed", contextUsed)
        ret.put("contextMax", contextMax)
        call.resolve(ret)
    }

    @PluginMethod
    fun getBatteryLevel(call: PluginCall) {
        try {
            val ctx = context ?: activity ?: run {
                val ret = JSObject()
                ret.put("level", 100)
                ret.put("charging", true)
                call.resolve(ret)
                return
            }

            val batteryIntent = ctx.registerReceiver(
                null,
                IntentFilter(Intent.ACTION_BATTERY_CHANGED)
            )

            val level = batteryIntent?.getIntExtra(BatteryManager.EXTRA_LEVEL, -1) ?: -1
            val scale = batteryIntent?.getIntExtra(BatteryManager.EXTRA_SCALE, -1) ?: -1
            val status = batteryIntent?.getIntExtra(BatteryManager.EXTRA_STATUS, -1) ?: -1

            val batteryPct = if (level >= 0 && scale > 0) (level * 100 / scale) else 100
            val charging = status == BatteryManager.BATTERY_STATUS_CHARGING ||
                    status == BatteryManager.BATTERY_STATUS_FULL

            val ret = JSObject()
            ret.put("level", batteryPct)
            ret.put("charging", charging)
            call.resolve(ret)

        } catch (e: Exception) {
            val ret = JSObject()
            ret.put("level", 100)
            ret.put("charging", false)
            call.resolve(ret)
        }
    }

    override fun handleOnDestroy() {
        if (nativeContextPtr != 0L) {
            try {
                nativeUnloadModel(nativeContextPtr)
            } catch (_: Exception) {}
            nativeContextPtr = 0L
        }
        scope.cancel()
        super.handleOnDestroy()
    }
}
