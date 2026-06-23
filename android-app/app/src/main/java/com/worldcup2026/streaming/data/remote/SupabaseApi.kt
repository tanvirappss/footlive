package com.worldcup2026.streaming.data.remote

import com.google.gson.JsonObject
import com.google.gson.annotations.SerializedName
import retrofit2.http.*

// DTOs for parsing database response
data class TeamDto(
    @SerializedName("id") val id: String,
    @SerializedName("name") val name: String,
    @SerializedName("short_name") val shortName: String,
    @SerializedName("country_name") val countryName: String,
    @SerializedName("country_code") val countryCode: String,
    @SerializedName("flag_url") val flagUrl: String?,
    @SerializedName("logo_url") val logoUrl: String?,
    @SerializedName("region") val region: String?,
    @SerializedName("is_enabled") val isEnabled: Boolean
)

data class MatchDto(
    @SerializedName("id") val id: String,
    @SerializedName("home_team_id") val homeTeamId: String?,
    @SerializedName("away_team_id") val awayTeamId: String?,
    @SerializedName("home_team_custom_name") val homeTeamCustomName: String?,
    @SerializedName("home_team_custom_flag") val homeTeamCustomFlag: String?,
    @SerializedName("away_team_custom_name") val awayTeamCustomName: String?,
    @SerializedName("away_team_custom_flag") val awayTeamCustomFlag: String?,
    @SerializedName("tournament_name") val tournamentName: String,
    @SerializedName("match_date") val matchDate: String,
    @SerializedName("match_time") val matchTime: String,
    @SerializedName("match_timestamp") val matchTimestamp: String, // ISO timestamp string
    @SerializedName("stadium_name") val stadiumName: String,
    @SerializedName("status") val status: String,
    @SerializedName("home_score") val homeScore: Int,
    @SerializedName("away_score") val awayScore: Int,
    @SerializedName("home_scorers") val homeScorers: String?,
    @SerializedName("away_scorers") val awayScorers: String?,
    @SerializedName("banner_url") val bannerUrl: String?,
    @SerializedName("description") val description: String?
)

data class StreamDto(
    @SerializedName("id") val id: String,
    @SerializedName("match_id") val matchId: String,
    @SerializedName("stream_name") val streamName: String,
    @SerializedName("primary_url") val primaryUrl: String,
    @SerializedName("backup_url_1") val backupUrl1: String?,
    @SerializedName("backup_url_2") val backupUrl2: String?,
    @SerializedName("backup_url_3") val backupUrl3: String?,
    @SerializedName("is_enabled") val isEnabled: Boolean
)

data class AnnouncementDto(
    @SerializedName("id") val id: String,
    @SerializedName("title") val title: String,
    @SerializedName("message") val message: String,
    @SerializedName("icon") val icon: String?,
    @SerializedName("priority") val priority: String,
    @SerializedName("status") val status: String,
    @SerializedName("scheduled_for") val scheduledFor: String?, // ISO string
    @SerializedName("created_at") val createdAt: String // ISO string
)

data class AdNetworkDto(
    @SerializedName("id") val id: String,
    @SerializedName("network_name") val networkName: String,
    @SerializedName("is_enabled") val isEnabled: Boolean,
    @SerializedName("verification_code") val verificationCode: String?,
    @SerializedName("header_script") val headerScript: String?,
    @SerializedName("footer_script") val footerScript: String?,
    @SerializedName("banner_script") val bannerScript: String?,
    @SerializedName("native_script") val nativeScript: String?,
    @SerializedName("social_bar_script") val socialBarScript: String?,
    @SerializedName("popunder_script") val popunderScript: String?,
    @SerializedName("custom_scripts") val customScripts: JsonObject?
)

data class AnalyticsPayload(
    @SerializedName("event_name") val eventName: String,
    @SerializedName("metadata") val metadata: Map<String, Any>?,
    @SerializedName("session_id") val sessionId: String
)

interface SupabaseApi {
    @GET("rest/v1/teams")
    suspend fun getTeams(): List<TeamDto>

    @GET("rest/v1/matches")
    suspend fun getMatches(): List<MatchDto>

    @GET("rest/v1/streams")
    suspend fun getStreams(): List<StreamDto>

    @GET("rest/v1/announcements")
    suspend fun getAnnouncements(): List<AnnouncementDto>

    @GET("rest/v1/ad_networks")
    suspend fun getAdConfigs(): List<AdNetworkDto>

    @POST("rest/v1/analytics")
    suspend fun postAnalytics(@Body payload: AnalyticsPayload)
}
