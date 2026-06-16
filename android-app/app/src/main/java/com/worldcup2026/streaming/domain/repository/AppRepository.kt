package com.worldcup2026.streaming.domain.repository

import com.worldcup2026.streaming.domain.model.*
import kotlinx.coroutines.flow.Flow

interface AppRepository {
    fun getTeams(): Flow<List<Team>>
    fun getMatches(): Flow<List<Match>>
    fun getStreamsForMatch(matchId: String): Flow<List<Stream>>
    fun getAnnouncements(): Flow<List<Announcement>>
    fun getAdConfigs(): Flow<List<AdConfig>>
    
    fun getActivePlayer(): String
    fun getMatchDurationMins(): Int
    fun getMatchLiveBeforeMins(): Int

    suspend fun syncAllData()
    suspend fun recordAnalyticsEvent(eventName: String, metadata: Map<String, Any> = emptyMap())
}
