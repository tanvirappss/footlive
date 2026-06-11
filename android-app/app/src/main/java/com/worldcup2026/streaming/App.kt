package com.worldcup2026.streaming

import android.app.Application
import com.onesignal.OneSignal
import dagger.hilt.android.HiltAndroidApp

@HiltAndroidApp
class App : Application() {
    override fun onCreate() {
        super.onCreate()
        
        // Verbose Logging to help debug OneSignal
        OneSignal.ConsentRequired = false
        
        // OneSignal Initialization
        // In production, replace "YOUR_ONESIGNAL_APP_ID" with your actual OneSignal App ID.
        // This handles notification permission requests and initialization.
        OneSignal.initWithContext(this, "YOUR_ONESIGNAL_APP_ID")
    }
}
