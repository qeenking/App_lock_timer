package com.applocktimer

import android.content.Context
import com.facebook.react.bridge.*

class PasswordModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "PasswordModule"

    private val prefs by lazy {
        reactApplicationContext.getSharedPreferences("app_lock_pw", Context.MODE_PRIVATE)
    }

    @ReactMethod
    fun hasPassword(promise: Promise) {
        promise.resolve(prefs.contains("pw"))
    }

    @ReactMethod
    fun setPassword(pw: String, promise: Promise) {
        prefs.edit().putString("pw", pw).apply()
        promise.resolve(true)
    }

    @ReactMethod
    fun verifyPassword(pw: String, promise: Promise) {
        val saved = prefs.getString("pw", null)
        promise.resolve(saved != null && saved == pw)
    }
}
