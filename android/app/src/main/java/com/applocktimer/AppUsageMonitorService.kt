package com.applocktimer

import android.app.*
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Handler
import android.os.Looper
import androidx.core.app.NotificationCompat
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.*

class AppUsageMonitorService : Service() {

    private val handler = Handler(Looper.getMainLooper())
    private var running = false

    private val limitedApps = mutableMapOf<String, Long>()
    private val usedTime = mutableMapOf<String, Long>()

    private var lastKnownForeground: String? = null
    private var lastCheckTime = System.currentTimeMillis()
    private var lastLockShownTime = 0L

    // 오늘 하루 자정 리셋을 판단하기 위한 마지막 리셋 날짜 (yyyy-MM-dd)
    private var lastResetDate: String = ""

    // ── 휴식 시간(시계 시각 기준 차단) ──
    private data class RestConfig(
        val packages: Set<String>,
        val enabled: Boolean,
        val days: Set<Int>, // Calendar.DAY_OF_WEEK 값 (1=일요일 ... 7=토요일)
        val startMinute: Int,
        val endMinute: Int,
        val applyMode: String
    )
    private var restConfig: RestConfig? = null

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        loadLimitsFromPrefs()
        loadRestConfigFromPrefs()
        loadLastResetDate()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        startForeground(1, buildNotification())

        when (intent?.action) {
            "ADD_LIMIT" -> {
                intent.getStringExtra("packageName")?.let { pkg ->
                    val limitMinutes = intent.getIntExtra("limitMinutes", 0)
                    val newLimitMs = limitMinutes * 60 * 1000L
                    val prevLimitMs = limitedApps[pkg]
                    // 제한 값이 처음 설정되었거나 실제로 바뀐 경우에만 누적 사용시간을 리셋한다.
                    // (동일한 값으로 반복 호출될 때마다 리셋되면 홈 화면을 자주 열 때마다
                    //  제한이 사실상 풀리는 문제가 있었음)
                    if (prevLimitMs == null || prevLimitMs != newLimitMs) {
                        usedTime[pkg] = 0L
                    }
                    limitedApps[pkg] = newLimitMs
                    savePrefs(pkg, limitMinutes.toLong())
                }
            }
            "REMOVE_LIMIT" -> {
                intent.getStringExtra("packageName")?.let { pkg ->
                    limitedApps.remove(pkg)
                    usedTime.remove(pkg)
                    removePref(pkg)
                }
            }
            "SET_REST_CONFIG" -> {
                intent.getStringExtra("configJson")?.let { json ->
                    restConfig = parseRestConfig(json)
                    saveRestConfigToPrefs(json)
                }
            }
            "CLEAR_REST_CONFIG" -> {
                restConfig = null
                clearRestConfigPrefs()
            }
        }

        if (!running) {
            running = true
            lastCheckTime = System.currentTimeMillis()
            startMonitoring()
        }
        return START_STICKY
    }

    // 표시 전용: 자정부터 지금까지의 실제 총 사용시간 (초과 판정에는 쓰지 않음)
    private fun queryTodayUsageMs(packageName: String): Long {
        return try {
            val usm = getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
            val cal = Calendar.getInstance()
            cal.set(Calendar.HOUR_OF_DAY, 0)
            cal.set(Calendar.MINUTE, 0)
            cal.set(Calendar.SECOND, 0)
            cal.set(Calendar.MILLISECOND, 0)
            val startTime = cal.timeInMillis
            val endTime = System.currentTimeMillis()

            val events = usm.queryEvents(startTime, endTime)
            var total = 0L
            var openTime: Long? = null
            val event = UsageEvents.Event()

            while (events.hasNextEvent()) {
                events.getNextEvent(event)
                if (event.packageName != packageName) continue
                when (event.eventType) {
                    UsageEvents.Event.MOVE_TO_FOREGROUND,
                    UsageEvents.Event.ACTIVITY_RESUMED -> {
                        openTime = event.timeStamp
                    }
                    UsageEvents.Event.MOVE_TO_BACKGROUND,
                    UsageEvents.Event.ACTIVITY_PAUSED -> {
                        val start = openTime
                        if (start != null && event.timeStamp > start) {
                            total += (event.timeStamp - start)
                        }
                        openTime = null
                    }
                }
            }
            if (openTime != null && endTime > openTime!!) {
                total += (endTime - openTime!!)
            }

            val dailyStats = usm.queryUsageStats(UsageStatsManager.INTERVAL_DAILY, startTime, endTime)
            var statsTotal = 0L
            if (dailyStats != null) {
                for (stat in dailyStats) {
                    if (stat.packageName == packageName) {
                        statsTotal += stat.totalTimeInForeground
                    }
                }
            }
            maxOf(total, statsTotal)
        } catch (e: Exception) {
            0L
        }
    }

    private fun loadLimitsFromPrefs() {
        val prefs = getSharedPreferences("app_limits", Context.MODE_PRIVATE)
        for ((key, value) in prefs.all) {
            val minutes = (value as? Long) ?: 0L
            limitedApps[key] = minutes * 60 * 1000L
            usedTime[key] = 0L
        }
    }

    private fun savePrefs(packageName: String, minutes: Long) {
        val prefs = getSharedPreferences("app_limits", Context.MODE_PRIVATE)
        prefs.edit().putLong(packageName, minutes).apply()
    }

    private fun removePref(packageName: String) {
        val prefs = getSharedPreferences("app_limits", Context.MODE_PRIVATE)
        prefs.edit().remove(packageName).apply()
    }

    // ── 하루 자정 리셋 ──
    private fun todayDateString(): String {
        val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.US)
        return sdf.format(Date())
    }

    private fun loadLastResetDate() {
        val prefs = getSharedPreferences("usage_reset_prefs", Context.MODE_PRIVATE)
        val saved = prefs.getString("lastResetDate", null)
        if (saved != null) {
            lastResetDate = saved
        } else {
            // 처음 실행이라면 오늘 날짜로 기준을 잡아, 기존에 쌓인 사용시간을 불필요하게 지우지 않는다.
            lastResetDate = todayDateString()
            saveLastResetDate(lastResetDate)
        }
    }

    private fun saveLastResetDate(date: String) {
        val prefs = getSharedPreferences("usage_reset_prefs", Context.MODE_PRIVATE)
        prefs.edit().putString("lastResetDate", date).apply()
    }

    // 자정이 지났으면(날짜가 바뀌었으면) 모든 앱의 누적 사용시간을 0으로 초기화한다.
    // 요일별 설정으로 걸린 제한뿐 아니라, 홈 화면에서 직접 건 "하루 N분" 제한도
    // 이 로직으로 매일 자정에 자동으로 리셋된다.
    private fun checkAndResetDaily() {
        val today = todayDateString()
        if (lastResetDate != today) {
            for (key in usedTime.keys.toList()) {
                usedTime[key] = 0L
            }
            lastResetDate = today
            saveLastResetDate(today)
        }
    }

    // ── 휴식 시간 설정 저장/불러오기/파싱 ──
    private fun loadRestConfigFromPrefs() {
        val prefs = getSharedPreferences("rest_time_prefs", Context.MODE_PRIVATE)
        val json = prefs.getString("config", null) ?: return
        restConfig = parseRestConfig(json)
    }

    private fun saveRestConfigToPrefs(json: String) {
        val prefs = getSharedPreferences("rest_time_prefs", Context.MODE_PRIVATE)
        prefs.edit().putString("config", json).apply()
    }

    private fun clearRestConfigPrefs() {
        val prefs = getSharedPreferences("rest_time_prefs", Context.MODE_PRIVATE)
        prefs.edit().remove("config").apply()
    }

    private fun parseRestConfig(json: String): RestConfig? {
        return try {
            val obj = JSONObject(json)

            val packagesArr = obj.getJSONArray("packages")
            val packages = mutableSetOf<String>()
            for (i in 0 until packagesArr.length()) packages.add(packagesArr.getString(i))

            val dayMap = mapOf(
                "sun" to Calendar.SUNDAY, "mon" to Calendar.MONDAY, "tue" to Calendar.TUESDAY,
                "wed" to Calendar.WEDNESDAY, "thu" to Calendar.THURSDAY, "fri" to Calendar.FRIDAY,
                "sat" to Calendar.SATURDAY
            )
            val daysArr = obj.getJSONArray("days")
            val days = mutableSetOf<Int>()
            for (i in 0 until daysArr.length()) {
                dayMap[daysArr.getString(i)]?.let { days.add(it) }
            }

            fun toMinute(hhmm: String): Int {
                val parts = hhmm.split(":")
                return parts[0].toInt() * 60 + parts[1].toInt()
            }

            RestConfig(
                packages = packages,
                enabled = obj.optBoolean("enabled", true),
                days = days,
                startMinute = toMinute(obj.getString("startTime")),
                endMinute = toMinute(obj.getString("endTime")),
                applyMode = obj.optString("applyMode", "block")
            )
        } catch (e: Exception) {
            null
        }
    }

    // 지금 이 순간이 휴식 시간대에 해당하는지 확인 (자정을 넘기는 구간 포함)
    private fun isRestActiveNow(config: RestConfig): Boolean {
        if (!config.enabled) return false
        val cal = Calendar.getInstance()
        if (!config.days.contains(cal.get(Calendar.DAY_OF_WEEK))) return false

        val nowMinute = cal.get(Calendar.HOUR_OF_DAY) * 60 + cal.get(Calendar.MINUTE)
        val start = config.startMinute
        val end = config.endMinute
        if (start == end) return false
        return if (start < end) {
            nowMinute in start until end
        } else {
            // 자정을 넘기는 경우 (예: 22:00 ~ 07:00)
            nowMinute >= start || nowMinute < end
        }
    }

    private fun startMonitoring() {
        handler.post(object : Runnable {
            override fun run() {
                checkForegroundApp()
                handler.postDelayed(this, 2000)
            }
        })
    }

    private fun checkForegroundApp() {
        checkAndResetDaily()

        val usageStatsManager = getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
        val now = System.currentTimeMillis()

        val queryStart = minOf(lastCheckTime - 3000, now - 10000)
        val events = usageStatsManager.queryEvents(queryStart, now)
        var latestForeground: String? = null
        val event = UsageEvents.Event()

        while (events.hasNextEvent()) {
            events.getNextEvent(event)
            if (event.eventType == UsageEvents.Event.MOVE_TO_FOREGROUND) {
                latestForeground = event.packageName
            }
        }

        val current = latestForeground ?: lastKnownForeground
        val elapsed = now - lastCheckTime
        val justCameToForeground = latestForeground != null && latestForeground == current
        val cooldownPassed = (now - lastLockShownTime) > 1500

        if (current != null && limitedApps.containsKey(current)) {
            // 초과 판정은 "제한 설정 이후" 누적시간 기준 (의도된 동작, 변경 없음)
            usedTime[current] = (usedTime[current] ?: 0L) + elapsed

            val used = usedTime[current] ?: 0L
            val limit = limitedApps[current] ?: 0L

            if (used >= limit && justCameToForeground && cooldownPassed) {
                lastLockShownTime = now
                // 화면 표시용으로만 하루 총 사용시간을 별도 조회
                val todayTotalMs = queryTodayUsageMs(current)

                val lockIntent = Intent(this, LockActivity::class.java)
                lockIntent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
                lockIntent.putExtra("lockedPackage", current)
                lockIntent.putExtra("usedMinutes", (todayTotalMs / 60000L).toInt())
                lockIntent.putExtra("limitMinutes", (limit / 60000L).toInt())
                startActivity(lockIntent)
            }
        }

        // 휴식 시간(시계 시각 기준) 차단 — 하루 누적 사용시간과 무관하게, 지금이 휴식 시간대이면 즉시 차단
        val rc = restConfig
        if (current != null && rc != null && rc.applyMode == "block" &&
            rc.packages.contains(current) && isRestActiveNow(rc)
        ) {
            if (justCameToForeground && cooldownPassed) {
                lastLockShownTime = now

                val lockIntent = Intent(this, LockActivity::class.java)
                lockIntent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
                lockIntent.putExtra("lockedPackage", current)
                lockIntent.putExtra("isRestTime", true)
                lockIntent.putExtra("restStartMinute", rc.startMinute)
                lockIntent.putExtra("restEndMinute", rc.endMinute)
                startActivity(lockIntent)
            }
        }

        lastKnownForeground = current
        lastCheckTime = now
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                "usage_monitor",
                "앱 사용시간 감시",
                NotificationManager.IMPORTANCE_LOW
            )
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }
    }

    private fun buildNotification(): Notification {
        return NotificationCompat.Builder(this, "usage_monitor")
            .setContentTitle("AppLockTimer 실행 중")
            .setContentText("앱 사용시간을 감시하고 있어요")
            .setSmallIcon(android.R.drawable.ic_lock_idle_lock)
            .build()
    }

    override fun onBind(intent: Intent?) = null
}
