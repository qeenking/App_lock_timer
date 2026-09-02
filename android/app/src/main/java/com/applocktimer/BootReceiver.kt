package com.applocktimer

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build

/**
 * 기기 재부팅 후 감시 서비스를 다시 시작한다.
 * 이게 없으면 재부팅 시 모든 제한(요일별/휴식시간/일반 제한)이
 * 사용자가 앱을 직접 한 번 열기 전까지 무력화된다.
 */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED) {
            val serviceIntent = Intent(context, AppUsageMonitorService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent)
            } else {
                context.startService(serviceIntent)
            }
        }
    }
}
