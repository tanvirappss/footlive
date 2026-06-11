package com.worldcup2026.streaming.data.repository

import android.os.Build
import com.worldcup2026.streaming.data.local.*
import com.worldcup2026.streaming.data.remote.*
import com.worldcup2026.streaming.domain.model.*
import com.worldcup2026.streaming.domain.repository.AppRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.map
import java.text.SimpleDateFormat
import java.util.Locale
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AppRepositoryImpl @Inject constructor(
    private val dao: AppDao,
    private val api: SupabaseApi
) : AppRepository {

    private val sessionId = UUID.randomUUID().toString()

    override fun getTeams(): Flow<List<Team>> {
        return dao.getAllTeams().map { list -> list.map { it.toDomain() } }
    }

    override fun getMatches(): Flow<List<Match>> {
        return combine(
            dao.getAllMatches(),
            dao.getAllTeams()
        ) { cachedMatches, cachedTeams ->
            val teamsMap = cachedTeams.associateBy { it.id }.mapValues { it.value.toDomain() }
            cachedMatches.map { cachedMatch ->
                cachedMatch.toDomain(
                    home = cachedMatch.homeTeamId?.let { teamsMap[it] },
                    away = cachedMatch.awayTeamId?.let { teamsMap[it] }
                )
            }
        }
    }

    override fun getStreamsForMatch(matchId: String): Flow<List<Stream>> {
        return dao.getStreamsForMatch(matchId).map { list -> list.map { it.toDomain() } }
    }

    override fun getAnnouncements(): Flow<List<Announcement>> {
        return dao.getAllAnnouncements().map { list -> list.map { it.toDomain() } }
    }

    override fun getAdConfigs(): Flow<List<AdConfig>> {
        return dao.getAllAdConfigs().map { list -> list.map { it.toDomain() } }
    }

    override suspend fun syncAllData() {
        try {
            // Fetch everything from Supabase
            val teams = api.getTeams()
            val matches = api.getMatches()
            val streams = api.getStreams()
            val announcements = api.getAnnouncements()
            val ads = api.getAdConfigs()

            // Update local Room database cache
            dao.clearTeams()
            dao.insertTeams(teams.map { it.toEntity() })

            dao.clearMatches()
            dao.insertMatches(matches.map { it.toEntity() })

            dao.clearStreams()
            dao.insertStreams(streams.map { it.toEntity() })

            dao.clearAnnouncements()
            dao.insertAnnouncements(announcements.map { it.toEntity() })

            dao.clearAdConfigs()
            dao.insertAdConfigs(ads.map { it.toEntity() })

        } catch (e: Exception) {
            e.printStackTrace()
            // In case of error (e.g. offline), app continues running on Room cache
        }
    }

    override suspend fun recordAnalyticsEvent(eventName: String, metadata: Map<String, Any>) {
        try {
            api.postAnalytics(
                AnalyticsPayload(
                    eventName = eventName,
                    metadata = metadata,
                    sessionId = sessionId
                )
            )
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    // Helper functions for parsing timestamps
    private fun parseIsoTimestamp(isoString: String): Long {
        return try {
            val formats = arrayOf(
                "yyyy-MM-dd'T'HH:mm:ss.SSSXXX",
                "yyyy-MM-dd'T'HH:mm:ssXXX",
                "yyyy-MM-dd'T'HH:mm:ss",
                "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
                "yyyy-MM-dd'T'HH:mm:ss'Z'"
            )
            var parsedTime = 0L
            for (format in formats) {
                try {
                    val sdf = SimpleDateFormat(format, Locale.US)
                    val date = sdf.parse(isoString)
                    if (date != null) {
                        parsedTime = date.time
                        break
                    }
                } catch (e: Exception) {}
            }
            parsedTime
        } catch (e: Exception) {
            0L
        }
    }

    // Mappers: DTO to Entity
    private fun TeamDto.toEntity() = CachedTeam(
        id = id, name = name, shortName = shortName, countryName = countryName,
        countryCode = countryCode, flagUrl = flagUrl, logoUrl = logoUrl,
        region = region, isEnabled = isEnabled
    )

    private fun MatchDto.toEntity() = CachedMatch(
        id = id, homeTeamId = homeTeamId, awayTeamId = awayTeamId,
        homeTeamCustomName = homeTeamCustomName, homeTeamCustomFlag = homeTeamCustomFlag,
        awayTeamCustomName = awayTeamCustomName, awayTeamCustomFlag = awayTeamCustomFlag,
        tournamentName = tournamentName, matchDate = matchDate, matchTime = matchTime,
        matchTimestamp = parseIsoTimestamp(matchTimestamp), stadiumName = stadiumName,
        status = status, homeScore = homeScore, awayScore = awayScore,
        bannerUrl = bannerUrl, description = description
    )

    private fun StreamDto.toEntity() = CachedStream(
        id = id, matchId = matchId, streamName = streamName, primaryUrl = primaryUrl,
        backupUrl1 = backupUrl1, backupUrl2 = backupUrl2, backupUrl3 = backupUrl3,
        isEnabled = isEnabled
    )

    private fun AnnouncementDto.toEntity() = CachedAnnouncement(
        id = id, title = title, message = message, icon = icon,
        priority = priority, status = status,
        scheduledFor = scheduledFor?.let { parseIsoTimestamp(it) },
        createdAt = parseIsoTimestamp(createdAt)
    )

    private fun AdNetworkDto.toEntity() = CachedAdConfig(
        id = id, networkName = networkName, isEnabled = isEnabled,
        verificationCode = verificationCode, headerScript = headerScript,
        footerScript = footerScript, bannerScript = bannerScript,
        nativeScript = nativeScript, socialBarScript = socialBarScript,
        popunderScript = popunderScript
    )

    // Mappers: Entity to Domain
    private fun CachedTeam.toDomain() = Team(
        id = id, name = name, shortName = shortName, countryName = countryName,
        countryCode = countryCode, flagUrl = flagUrl, logoUrl = logoUrl,
        region = region, isEnabled = isEnabled
    )

    private fun CachedMatch.toDomain(home: Team?, away: Team?) = Match(
        id = id, homeTeamId = homeTeamId, awayTeamId = awayTeamId,
        homeTeamCustomName = homeTeamCustomName, homeTeamCustomFlag = homeTeamCustomFlag,
        awayTeamCustomName = awayTeamCustomName, awayTeamCustomFlag = awayTeamCustomFlag,
        tournamentName = tournamentName, matchDate = matchDate, matchTime = matchTime,
        matchTimestamp = matchTimestamp, stadiumName = stadiumName, status = status,
        homeScore = homeScore, awayScore = awayScore, bannerUrl = bannerUrl,
        description = description, homeTeam = home, awayTeam = away
    )

    private fun CachedStream.toDomain() = Stream(
        id = id, matchId = matchId, streamName = streamName, primaryUrl = primaryUrl,
        backupUrl1 = backupUrl1, backupUrl2 = backupUrl2, backupUrl3 = backupUrl3,
        isEnabled = isEnabled
    )

    private fun CachedAnnouncement.toDomain() = Announcement(
        id = id, title = title, message = message, icon = icon,
        priority = priority, status = status, scheduledFor = scheduledFor,
        createdAt = createdAt
    )

    private fun CachedAdConfig.toDomain() = AdConfig(
        id = id, networkName = networkName, isEnabled = isEnabled,
        verificationCode = verificationCode, headerScript = headerScript,
        footerScript = footerScript, bannerScript = bannerScript,
        nativeScript = nativeScript, socialBarScript = socialBarScript,
        popunderScript = popunderScript
    )
}
