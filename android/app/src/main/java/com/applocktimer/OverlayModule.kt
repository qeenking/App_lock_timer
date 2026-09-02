package com.applocktimer

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import com.facebook.react.bridge.*

class OverlayModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "OverlayModule"

    @ReactMethod
    fun hasOverlayPermission(promise: Promise) {
        val granted = Settings.canDrawOverlays(reactApplicationContext)
        promise.resolve(granted)
    }

    @ReactMethod
    fun requestOverlayPermission() {
        val intent = Intent(
            Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
            Uri.parse("package:" + reactApplicationContext.packageName)
        )
        intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
        reactApplicationContext.startActivity(intent)
    }

    @ReactMethod
    fun showLockScreen(packageName: String) {
        val intent = Intent(reactApplicationContext, LockActivity::class.java)
        intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
        intent.putExtra("lockedPackage", packageName)
        reactApplicationContext.startActivity(intent)
    }

    // 휴식 시간 설정(JSON 문자열)을 감시 서비스로 전달합니다.
    // JSON 형식: {"packages":[...], "enabled":true, "days":["mon",...], "startTime":"22:00", "endTime":"07:00", "applyMode":"block"}
    @ReactMethod
    fun setRestTimeConfig(configJson: String) {
        val intent = Intent(reactApplicationContext, AppUsageMonitorService::class.java)
        intent.action = "SET_REST_CONFIG"
        intent.putExtra("configJson", configJson)
        startServiceCompat(intent)
    }

    @ReactMethod
    fun clearRestTimeConfig() {
        val intent = Intent(reactApplicationContext, AppUsageMonitorService::class.java)
        intent.action = "CLEAR_REST_CONFIG"
        startServiceCompat(intent)
    }

    // 배터리 최적화 예외 여부 확인 — 예외로 등록돼 있어야 백그라운드에서 감시 서비스가
    // 시스템에 의해 죽지 않고 안정적으로 계속 동작한다.
    @ReactMethod
    fun hasBatteryOptimizationExemption(promise: Promise) {
        val pm = reactApplicationContext.getSystemService(Context.POWER_SERVICE) as PowerManager
        val isIgnoring = pm.isIgnoringBatteryOptimizations(reactApplicationContext.packageName)
        promise.resolve(isIgnoring)
    }

    @ReactMethod
    fun requestBatteryOptimizationExemption() {
        val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS)
        intent.data = Uri.parse("package:" + reactApplicationContext.packageName)
        intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
        reactApplicationContext.startActivity(intent)
    }

    private fun startServiceCompat(intent: Intent) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            reactApplicationContext.startForegroundService(intent)
        } else {
            reactApplicationContext.startService(intent)
        }
    }
}
