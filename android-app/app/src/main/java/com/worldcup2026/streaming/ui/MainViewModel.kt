package com.worldcup2026.streaming.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.worldcup2026.streaming.data.remote.RealtimeClient
import com.worldcup2026.streaming.domain.model.*
import com.worldcup2026.streaming.domain.repository.AppRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class MainViewModel @Inject constructor(
    private val repository: AppRepository,
    private val realtimeClient: RealtimeClient
) : ViewModel() {

    // Matches state subdivided for simple rendering
    val liveMatches: StateFlow<List<Match>> = repository.getMatches()
        .map { list -> 
            val liveBeforeMins = repository.getMatchLiveBeforeMins()
            val durationMins = repository.getMatchDurationMins()
            list.filter { 
                (it.status == "live" || 
                 it.status == "half_time" || 
                 (it.status == "upcoming" && System.currentTimeMillis() >= (it.matchTimestamp - liveBeforeMins * 60 * 1000L))) &&
                System.currentTimeMillis() < (it.matchTimestamp + durationMins * 60 * 1000L)
            } 
        }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val upcomingMatches: StateFlow<List<Match>> = repository.getMatches()
        .map { list -> 
            val liveBeforeMins = repository.getMatchLiveBeforeMins()
            list.filter { 
                it.status == "upcoming" && System.currentTimeMillis() < (it.matchTimestamp - liveBeforeMins * 60 * 1000L)
            } 
        }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val finishedMatches: StateFlow<List<Match>> = repository.getMatches()
        .map { list -> 
            val durationMins = repository.getMatchDurationMins()
            list.filter { 
                it.status == "finished" || 
                it.status == "cancelled" || 
                it.status == "postponed" ||
                ((it.status == "live" || it.status == "half_time" || it.status == "upcoming") && 
                 System.currentTimeMillis() >= (it.matchTimestamp + durationMins * 60 * 1000L))
            }.sortedByDescending { it.matchTimestamp }
        }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    // Announcements
    val announcements: StateFlow<List<Announcement>> = repository.getAnnouncements()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    // Ads Configurations
    val adConfigs: StateFlow<List<AdConfig>> = repository.getAdConfigs()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    init {
        // Start Phoenix real-time client which automatically synchronizes database changes
        realtimeClient.connect()
        refreshData()
        
        viewModelScope.launch {
            repository.recordAnalyticsEvent("app_launch", mapOf("platform" to "Android"))
        }
    }

    fun refreshData() {
        viewModelScope.launch {
            repository.syncAllData()
        }
    }

    // Get streams for a specific match
    fun getStreamsForMatch(matchId: String): Flow<List<Stream>> {
        return repository.getStreamsForMatch(matchId)
    }

    fun getActivePlayer(): String = repository.getActivePlayer()

    fun recordViewEvent(matchId: String, matchTitle: String) {
        viewModelScope.launch {
            repository.recordAnalyticsEvent(
                "watch_stream", 
                mapOf("match_id" to matchId, "match_title" to matchTitle)
            )
        }
    }

    override fun onCleared() {
        super.onCleared()
        realtimeClient.disconnect()
    }
}
