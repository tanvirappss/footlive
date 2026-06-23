package com.worldcup2026.streaming.data.remote

import com.worldcup2026.streaming.domain.repository.AppRepository
import kotlinx.coroutines.*
import okhttp3.*
import java.util.concurrent.TimeUnit
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class RealtimeClient @Inject constructor(
    private val repository: AppRepository,
    private val okHttpClient: OkHttpClient
) {
    private var webSocket: WebSocket? = null
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private var heartbeatJob: Job? = null
    private var isConnected = false

    private val WS_URL = "wss://wkikuysbirrcmbextkvp.supabase.co/realtime/v1/websocket?apikey=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndraWt1eXNiaXJyY21iZXh0a3ZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExODIzNDEsImV4cCI6MjA5Njc1ODM0MX0.eNrSGZFdjNEoy1OE1w9Zj3OwyIw1lZCRdOHIRiP-IBA&vsn=1.0.0"

    fun connect() {
        if (isConnected) return

        val request = Request.Builder()
            .url(WS_URL)
            .build()

        webSocket = okHttpClient.newWebSocket(request, object : WebSocketListener() {
            override fun onOpen(webSocket: WebSocket, response: Response) {
                isConnected = true
                startHeartbeat(webSocket)
                joinChannels(webSocket)
                
                // Immediately sync on connection to ensure latest data
                scope.launch {
                    repository.syncAllData()
                }
            }

            override fun onMessage(webSocket: WebSocket, text: String) {
                // On receiving any change message from phoenix channels, sync postgrest data
                if (text.contains("postgres_changes") || text.contains("UPDATE") || text.contains("INSERT") || text.contains("DELETE")) {
                    scope.launch {
                        repository.syncAllData()
                    }
                }
            }

            override fun onClosing(webSocket: WebSocket, code: Int, reason: String) {
                isConnected = false
                stopHeartbeat()
            }

            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                isConnected = false
                stopHeartbeat()
                // Auto reconnect after 5 seconds
                scope.launch {
                    delay(5000)
                    connect()
                }
            }
        })
    }

    private fun startHeartbeat(ws: WebSocket) {
        heartbeatJob?.cancel()
        heartbeatJob = scope.launch {
            while (isActive && isConnected) {
                delay(30000) // 30s heartbeat
                val heartbeatJson = """
                    {"topic":"phoenix","event":"heartbeat","payload":{},"ref":"hb_${System.currentTimeMillis()}"}
                """.trimIndent()
                ws.send(heartbeatJson)
            }
        }
    }

    private fun stopHeartbeat() {
        heartbeatJob?.cancel()
    }

    private fun joinChannels(ws: WebSocket) {
        val joinMatches = """
            {"topic":"realtime:public:matches","event":"phx_join","payload":{"config":{"postgres_changes":[{"event":"*","schema":"public","table":"matches"}]}},"ref":"join_matches"}
        """.trimIndent()

        val joinTeams = """
            {"topic":"realtime:public:teams","event":"phx_join","payload":{"config":{"postgres_changes":[{"event":"*","schema":"public","table":"teams"}]}},"ref":"join_teams"}
        """.trimIndent()

        val joinStreams = """
            {"topic":"realtime:public:streams","event":"phx_join","payload":{"config":{"postgres_changes":[{"event":"*","schema":"public","table":"streams"}]}},"ref":"join_streams"}
        """.trimIndent()

        val joinAnnouncements = """
            {"topic":"realtime:public:announcements","event":"phx_join","payload":{"config":{"postgres_changes":[{"event":"*","schema":"public","table":"announcements"}]}},"ref":"join_announcements"}
        """.trimIndent()

        ws.send(joinMatches)
        ws.send(joinTeams)
        ws.send(joinStreams)
        ws.send(joinAnnouncements)
    }

    fun disconnect() {
        webSocket?.close(1000, "App Disconnect")
        isConnected = false
        stopHeartbeat()
    }
}
