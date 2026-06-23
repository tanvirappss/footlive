package com.worldcup2026.streaming.domain.model

data class Team(
    val id: String,
    val name: String,
    val shortName: String,
    val countryName: String,
    val countryCode: String,
    val flagUrl: String?,
    val logoUrl: String?,
    val region: String?,
    val isEnabled: Boolean
)

data class Match(
    val id: String,
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
    val description: String?,
    val homeTeam: Team?,
    val awayTeam: Team?
)

data class Stream(
    val id: String,
    val matchId: String,
    val streamName: String,
    val primaryUrl: String,
    val backupUrl1: String?,
    val backupUrl2: String?,
    val backupUrl3: String?,
    val isEnabled: Boolean
)

data class Announcement(
    val id: String,
    val title: String,
    val message: String,
    val icon: String?,
    val priority: String,
    val status: String,
    val scheduledFor: Long?,
    val createdAt: Long
)

data class AdConfig(
    val id: String,
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
