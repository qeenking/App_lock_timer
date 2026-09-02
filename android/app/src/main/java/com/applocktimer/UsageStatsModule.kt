package com.applocktimer

import android.app.AppOpsManager
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.drawable.BitmapDrawable
import android.graphics.drawable.Drawable
import android.os.Process
import android.provider.Settings
import android.util.Base64
import com.facebook.react.bridge.*
import java.io.ByteArrayOutputStream
import java.util.*

class UsageStatsModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "UsageStatsModule"

    @ReactMethod
    fun hasUsagePermission(promise: Promise) {
        val appOps = reactApplicationContext.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
        val mode = appOps.checkOpNoThrow(
            AppOpsManager.OPSTR_GET_USAGE_STATS,
            Process.myUid(),
            reactApplicationContext.packageName
        )
        promise.resolve(mode == AppOpsManager.MODE_ALLOWED)
    }

    @ReactMethod
    fun openUsageAccessSettings() {
        val intent = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS)
        intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
        reactApplicationContext.startActivity(intent)
    }

    @ReactMethod
    fun getForegroundApp(promise: Promise) {
        val usageStatsManager = reactApplicationContext
            .getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
        val endTime = System.currentTimeMillis()
        val beginTime = endTime - 10000

        val events = usageStatsManager.queryEvents(beginTime, endTime)
        var lastPackage: String? = null
        val event = android.app.usage.UsageEvents.Event()

        while (events.hasNextEvent()) {
            events.getNextEvent(event)
            if (event.eventType == android.app.usage.UsageEvents.Event.MOVE_TO_FOREGROUND) {
                lastPackage = event.packageName
            }
        }
        promise.resolve(lastPackage)
    }

    private fun drawableToBase64(drawable: Drawable): String {
        val bitmap = if (drawable is BitmapDrawable && drawable.bitmap != null) {
            drawable.bitmap
        } else {
            val w = if (drawable.intrinsicWidth > 0) drawable.intrinsicWidth else 96
            val h = if (drawable.intrinsicHeight > 0) drawable.intrinsicHeight else 96
            val bmp = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888)
            val canvas = Canvas(bmp)
            drawable.setBounds(0, 0, canvas.width, canvas.height)
            drawable.draw(canvas)
            bmp
        }
        val scaled = Bitmap.createScaledBitmap(bitmap, 96, 96, true)
        val stream = ByteArrayOutputStream()
        scaled.compress(Bitmap.CompressFormat.PNG, 90, stream)
        return Base64.encodeToString(stream.toByteArray(), Base64.NO_WRAP)
    }

    @ReactMethod
    fun getInstalledApps(promise: Promise) {
        val pm = reactApplicationContext.packageManager
        val apps = pm.getInstalledApplications(android.content.pm.PackageManager.GET_META_DATA)
        val result = WritableNativeArray()

        for (app in apps) {
            if (pm.getLaunchIntentForPackage(app.packageName) != null) {
                val map = WritableNativeMap()
                map.putString("packageName", app.packageName)
                map.putString("appName", pm.getApplicationLabel(app).toString())
                try {
                    val icon = pm.getApplicationIcon(app.packageName)
                    map.putString("icon", drawableToBase64(icon))
                } catch (e: Exception) {
                    map.putString("icon", "")
                }
                result.pushMap(map)
            }
        }
        promise.resolve(result)
    }

    @ReactMethod
    fun startMonitoring(packageName: String, limitMinutes: Int) {
        val intent = Intent(reactApplicationContext, AppUsageMonitorService::class.java)
        intent.action = "ADD_LIMIT"
        intent.putExtra("packageName", packageName)
        intent.putExtra("limitMinutes", limitMinutes)
        reactApplicationContext.startForegroundService(intent)
    }

    @ReactMethod
    fun removeLimit(packageName: String) {
        val intent = Intent(reactApplicationContext, AppUsageMonitorService::class.java)
        intent.action = "REMOVE_LIMIT"
        intent.putExtra("packageName", packageName)
        reactApplicationContext.startForegroundService(intent)
    }

    @ReactMethod
    fun getLimitedApps(promise: Promise) {
        val prefs = reactApplicationContext.getSharedPreferences("app_limits", Context.MODE_PRIVATE)
        val result = WritableNativeArray()
        for ((key, value) in prefs.all) {
            val map = WritableNativeMap()
            map.putString("packageName", key)
            map.putInt("limitMinutes", ((value as? Long) ?: 0L).toInt())
            result.pushMap(map)
        }
        promise.resolve(result)
    }

    @ReactMethod
    fun getTodayUsageStats(promise: Promise) {
        try {
            val usm = reactApplicationContext.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
            val cal = Calendar.getInstance()
            cal.set(Calendar.HOUR_OF_DAY, 0)
            cal.set(Calendar.MINUTE, 0)
            cal.set(Calendar.SECOND, 0)
            cal.set(Calendar.MILLISECOND, 0)
            val startTime = cal.timeInMillis
            val endTime = System.currentTimeMillis()

            // 방법 1: 시스템이 내부 집계한 일일 통계 (제조사별로 더 안정적일 수 있음)
            val dailyStats = usm.queryUsageStats(UsageStatsManager.INTERVAL_DAILY, startTime, endTime)
            val statsTotal = mutableMapOf<String, Long>()
            if (dailyStats != null) {
                for (stat in dailyStats) {
                    val t = stat.totalTimeInForeground
                    if (t > 0) {
                        statsTotal[stat.packageName] = (statsTotal[stat.packageName] ?: 0L) + t
                    }
                }
            }

            val events = usm.queryEvents(startTime, endTime)
            val totals = mutableMapOf<String, Long>()
            val lastForegroundTime = mutableMapOf<String, Long>()
            val event = android.app.usage.UsageEvents.Event()

            while (events.hasNextEvent()) {
                events.getNextEvent(event)
                val pkg = event.packageName ?: continue
                when (event.eventType) {
                    android.app.usage.UsageEvents.Event.MOVE_TO_FOREGROUND,
                    android.app.usage.UsageEvents.Event.ACTIVITY_RESUMED -> {
                        lastForegroundTime[pkg] = event.timeStamp
                    }
                    android.app.usage.UsageEvents.Event.MOVE_TO_BACKGROUND,
                    android.app.usage.UsageEvents.Event.ACTIVITY_PAUSED -> {
                        val start = lastForegroundTime.remove(pkg)
                        if (start != null && event.timeStamp > start) {
                            totals[pkg] = (totals[pkg] ?: 0L) + (event.timeStamp - start)
                        }
                    }
                }
            }
            for ((pkg, start) in lastForegroundTime) {
                if (endTime > start) {
                    totals[pkg] = (totals[pkg] ?: 0L) + (endTime - start)
                }
            }

            // 두 방식 중 더 큰 값을 사용 (기기별로 한쪽이 비어있을 수 있음)
            for ((pkg, t) in statsTotal) {
                val existing = totals[pkg] ?: 0L
                if (t > existing) {
                    totals[pkg] = t
                }
            }

            val pm = reactApplicationContext.packageManager
            val result = WritableNativeArray()

            for ((pkg, timeMs) in totals) {
                if (pm.getLaunchIntentForPackage(pkg) == null) continue
                val minutes = (timeMs / 60000L).toInt()
                if (minutes <= 0) continue
                try {
                    val appInfo = pm.getApplicationInfo(pkg, 0)
                    val map = WritableNativeMap()
                    map.putString("packageName", pkg)
                    map.putString("appName", pm.getApplicationLabel(appInfo).toString())
                    map.putInt("usedMinutes", minutes)
                    try {
                        map.putString("icon", drawableToBase64(pm.getApplicationIcon(pkg)))
                    } catch (e: Exception) {
                        map.putString("icon", "")
                    }
                    result.pushMap(map)
                } catch (e: Exception) {
                    // 삭제된 앱 등은 스킵
                }
            }
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("USAGE_STATS_ERROR", e.message)
        }
    }
}
