package com.worldcup2026.streaming.data.local

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "teams")
data class CachedTeam(
    @PrimaryKey val id: String,
    val name: String,
    val shortName: String,
    val countryName: String,
    val countryCode: String,
    val flagUrl: String?,
    val logoUrl: String?,
    val region: String?,
    val isEnabled: Boolean
)

@Entity(tableName = "matches")
data class CachedMatch(
    @PrimaryKey val id: String,
    val homeTeamId: String?,
    val awayTeamId: String?,
    val homeTeamCustomName: String?,
    val homeTeamCustomFlag: String?,
    val awayTeamCustomName: String?,
    val awayTeamCustomFlag: String?,
    val tournamentName: String,
    val matchDate: String,
    val matchTime: String,
    val matchTimestamp: Long, // timestamp in millis
    val stadiumName: String,
    val status: String,
    val homeScore: Int,
    val awayScore: Int,
    val homeScorers: String?,
    val awayScorers: String?,
    val bannerUrl: String?,
    val description: String?
)

@Entity(tableName = "streams")
data class CachedStream(
    @PrimaryKey val id: String,
    val matchId: String,
    val streamName: String,
    val primaryUrl: String,
    val backupUrl1: String?,
    val backupUrl2: String?,
    val backupUrl3: String?,
    val isEnabled: Boolean
)

@Entity(tableName = "announcements")
data class CachedAnnouncement(
    @PrimaryKey val id: String,
    val title: String,
    val message: String,
    val icon: String?,
    val priority: String,
    val status: String,
    val scheduledFor: Long?,
    val createdAt: Long
)

@Entity(tableName = "ad_configs")
data class CachedAdConfig(
    @PrimaryKey val id: String,
    val networkName: String,
    val isEnabled: Boolean,
    val verificationCode: String?,
    val headerScript: String?,
    val footerScript: String?,
    val bannerScript: String?,
    val nativeScript: String?,
    val socialBarScript: String?,
    val popunderScript: String?
)
