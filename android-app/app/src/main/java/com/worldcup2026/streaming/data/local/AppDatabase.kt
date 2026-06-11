package com.worldcup2026.streaming.data.local

import androidx.room.*
import kotlinx.coroutines.flow.Flow

@Dao
interface AppDao {
    // Teams
    @Query("SELECT * FROM teams WHERE isEnabled = 1")
    fun getAllTeams(): Flow<List<CachedTeam>>
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertTeams(teams: List<CachedTeam>)
    
    @Query("DELETE FROM teams")
    suspend fun clearTeams()

    // Matches
    @Query("SELECT * FROM matches ORDER BY matchTimestamp ASC")
    fun getAllMatches(): Flow<List<CachedMatch>>
    
    @Query("SELECT * FROM matches WHERE id = :id")
    suspend fun getMatchById(id: String): CachedMatch?
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertMatches(matches: List<CachedMatch>)
    
    @Query("DELETE FROM matches")
    suspend fun clearMatches()

    // Streams
    @Query("SELECT * FROM streams WHERE matchId = :matchId AND isEnabled = 1")
    fun getStreamsForMatch(matchId: String): Flow<List<CachedStream>>
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertStreams(streams: List<CachedStream>)
    
    @Query("DELETE FROM streams")
    suspend fun clearStreams()

    // Announcements
    @Query("SELECT * FROM announcements ORDER BY createdAt DESC")
    fun getAllAnnouncements(): Flow<List<CachedAnnouncement>>
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAnnouncements(announcements: List<CachedAnnouncement>)
    
    @Query("DELETE FROM announcements")
    suspend fun clearAnnouncements()

    // Ads
    @Query("SELECT * FROM ad_configs WHERE isEnabled = 1")
    fun getAllAdConfigs(): Flow<List<CachedAdConfig>>
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAdConfigs(configs: List<CachedAdConfig>)
    
    @Query("DELETE FROM ad_configs")
    suspend fun clearAdConfigs()
}

@Database(
    entities = [
        CachedTeam::class,
        CachedMatch::class,
        CachedStream::class,
        CachedAnnouncement::class,
        CachedAdConfig::class
    ],
    version = 1,
    exportSchema = false
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun appDao(): AppDao
}
