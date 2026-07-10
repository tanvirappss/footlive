package com.worldcup2026.streaming.data.local;

import androidx.annotation.NonNull;
import androidx.room.DatabaseConfiguration;
import androidx.room.InvalidationTracker;
import androidx.room.RoomDatabase;
import androidx.room.RoomOpenHelper;
import androidx.room.migration.AutoMigrationSpec;
import androidx.room.migration.Migration;
import androidx.room.util.DBUtil;
import androidx.room.util.TableInfo;
import androidx.sqlite.db.SupportSQLiteDatabase;
import androidx.sqlite.db.SupportSQLiteOpenHelper;
import java.lang.Class;
import java.lang.Override;
import java.lang.String;
import java.lang.SuppressWarnings;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import javax.annotation.processing.Generated;

@Generated("androidx.room.RoomProcessor")
@SuppressWarnings({"unchecked", "deprecation"})
public final class AppDatabase_Impl extends AppDatabase {
  private volatile AppDao _appDao;

  @Override
  @NonNull
  protected SupportSQLiteOpenHelper createOpenHelper(@NonNull final DatabaseConfiguration config) {
    final SupportSQLiteOpenHelper.Callback _openCallback = new RoomOpenHelper(config, new RoomOpenHelper.Delegate(1) {
      @Override
      public void createAllTables(@NonNull final SupportSQLiteDatabase db) {
        db.execSQL("CREATE TABLE IF NOT EXISTS `teams` (`id` TEXT NOT NULL, `name` TEXT NOT NULL, `shortName` TEXT NOT NULL, `countryName` TEXT NOT NULL, `countryCode` TEXT NOT NULL, `flagUrl` TEXT, `logoUrl` TEXT, `region` TEXT, `isEnabled` INTEGER NOT NULL, PRIMARY KEY(`id`))");
        db.execSQL("CREATE TABLE IF NOT EXISTS `matches` (`id` TEXT NOT NULL, `homeTeamId` TEXT, `awayTeamId` TEXT, `homeTeamCustomName` TEXT, `homeTeamCustomFlag` TEXT, `awayTeamCustomName` TEXT, `awayTeamCustomFlag` TEXT, `tournamentName` TEXT NOT NULL, `matchDate` TEXT NOT NULL, `matchTime` TEXT NOT NULL, `matchTimestamp` INTEGER NOT NULL, `stadiumName` TEXT NOT NULL, `status` TEXT NOT NULL, `homeScore` INTEGER NOT NULL, `awayScore` INTEGER NOT NULL, `homeScorers` TEXT, `awayScorers` TEXT, `bannerUrl` TEXT, `description` TEXT, PRIMARY KEY(`id`))");
        db.execSQL("CREATE TABLE IF NOT EXISTS `streams` (`id` TEXT NOT NULL, `matchId` TEXT NOT NULL, `streamName` TEXT NOT NULL, `primaryUrl` TEXT NOT NULL, `backupUrl1` TEXT, `backupUrl2` TEXT, `backupUrl3` TEXT, `isEnabled` INTEGER NOT NULL, PRIMARY KEY(`id`))");
        db.execSQL("CREATE TABLE IF NOT EXISTS `announcements` (`id` TEXT NOT NULL, `title` TEXT NOT NULL, `message` TEXT NOT NULL, `icon` TEXT, `priority` TEXT NOT NULL, `status` TEXT NOT NULL, `scheduledFor` INTEGER, `createdAt` INTEGER NOT NULL, PRIMARY KEY(`id`))");
        db.execSQL("CREATE TABLE IF NOT EXISTS `ad_configs` (`id` TEXT NOT NULL, `networkName` TEXT NOT NULL, `isEnabled` INTEGER NOT NULL, `verificationCode` TEXT, `headerScript` TEXT, `footerScript` TEXT, `bannerScript` TEXT, `nativeScript` TEXT, `socialBarScript` TEXT, `popunderScript` TEXT, PRIMARY KEY(`id`))");
        db.execSQL("CREATE TABLE IF NOT EXISTS room_master_table (id INTEGER PRIMARY KEY,identity_hash TEXT)");
        db.execSQL("INSERT OR REPLACE INTO room_master_table (id,identity_hash) VALUES(42, '6229af935b088e4cb4da95b466b2e926')");
      }

      @Override
      public void dropAllTables(@NonNull final SupportSQLiteDatabase db) {
        db.execSQL("DROP TABLE IF EXISTS `teams`");
        db.execSQL("DROP TABLE IF EXISTS `matches`");
        db.execSQL("DROP TABLE IF EXISTS `streams`");
        db.execSQL("DROP TABLE IF EXISTS `announcements`");
        db.execSQL("DROP TABLE IF EXISTS `ad_configs`");
        final List<? extends RoomDatabase.Callback> _callbacks = mCallbacks;
        if (_callbacks != null) {
          for (RoomDatabase.Callback _callback : _callbacks) {
            _callback.onDestructiveMigration(db);
          }
        }
      }

      @Override
      public void onCreate(@NonNull final SupportSQLiteDatabase db) {
        final List<? extends RoomDatabase.Callback> _callbacks = mCallbacks;
        if (_callbacks != null) {
          for (RoomDatabase.Callback _callback : _callbacks) {
            _callback.onCreate(db);
          }
        }
      }

      @Override
      public void onOpen(@NonNull final SupportSQLiteDatabase db) {
        mDatabase = db;
        internalInitInvalidationTracker(db);
        final List<? extends RoomDatabase.Callback> _callbacks = mCallbacks;
        if (_callbacks != null) {
          for (RoomDatabase.Callback _callback : _callbacks) {
            _callback.onOpen(db);
          }
        }
      }

      @Override
      public void onPreMigrate(@NonNull final SupportSQLiteDatabase db) {
        DBUtil.dropFtsSyncTriggers(db);
      }

      @Override
      public void onPostMigrate(@NonNull final SupportSQLiteDatabase db) {
      }

      @Override
      @NonNull
      public RoomOpenHelper.ValidationResult onValidateSchema(
          @NonNull final SupportSQLiteDatabase db) {
        final HashMap<String, TableInfo.Column> _columnsTeams = new HashMap<String, TableInfo.Column>(9);
        _columnsTeams.put("id", new TableInfo.Column("id", "TEXT", true, 1, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsTeams.put("name", new TableInfo.Column("name", "TEXT", true, 0, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsTeams.put("shortName", new TableInfo.Column("shortName", "TEXT", true, 0, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsTeams.put("countryName", new TableInfo.Column("countryName", "TEXT", true, 0, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsTeams.put("countryCode", new TableInfo.Column("countryCode", "TEXT", true, 0, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsTeams.put("flagUrl", new TableInfo.Column("flagUrl", "TEXT", false, 0, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsTeams.put("logoUrl", new TableInfo.Column("logoUrl", "TEXT", false, 0, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsTeams.put("region", new TableInfo.Column("region", "TEXT", false, 0, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsTeams.put("isEnabled", new TableInfo.Column("isEnabled", "INTEGER", true, 0, null, TableInfo.CREATED_FROM_ENTITY));
        final HashSet<TableInfo.ForeignKey> _foreignKeysTeams = new HashSet<TableInfo.ForeignKey>(0);
        final HashSet<TableInfo.Index> _indicesTeams = new HashSet<TableInfo.Index>(0);
        final TableInfo _infoTeams = new TableInfo("teams", _columnsTeams, _foreignKeysTeams, _indicesTeams);
        final TableInfo _existingTeams = TableInfo.read(db, "teams");
        if (!_infoTeams.equals(_existingTeams)) {
          return new RoomOpenHelper.ValidationResult(false, "teams(com.worldcup2026.streaming.data.local.CachedTeam).\n"
                  + " Expected:\n" + _infoTeams + "\n"
                  + " Found:\n" + _existingTeams);
        }
        final HashMap<String, TableInfo.Column> _columnsMatches = new HashMap<String, TableInfo.Column>(19);
        _columnsMatches.put("id", new TableInfo.Column("id", "TEXT", true, 1, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsMatches.put("homeTeamId", new TableInfo.Column("homeTeamId", "TEXT", false, 0, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsMatches.put("awayTeamId", new TableInfo.Column("awayTeamId", "TEXT", false, 0, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsMatches.put("homeTeamCustomName", new TableInfo.Column("homeTeamCustomName", "TEXT", false, 0, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsMatches.put("homeTeamCustomFlag", new TableInfo.Column("homeTeamCustomFlag", "TEXT", false, 0, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsMatches.put("awayTeamCustomName", new TableInfo.Column("awayTeamCustomName", "TEXT", false, 0, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsMatches.put("awayTeamCustomFlag", new TableInfo.Column("awayTeamCustomFlag", "TEXT", false, 0, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsMatches.put("tournamentName", new TableInfo.Column("tournamentName", "TEXT", true, 0, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsMatches.put("matchDate", new TableInfo.Column("matchDate", "TEXT", true, 0, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsMatches.put("matchTime", new TableInfo.Column("matchTime", "TEXT", true, 0, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsMatches.put("matchTimestamp", new TableInfo.Column("matchTimestamp", "INTEGER", true, 0, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsMatches.put("stadiumName", new TableInfo.Column("stadiumName", "TEXT", true, 0, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsMatches.put("status", new TableInfo.Column("status", "TEXT", true, 0, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsMatches.put("homeScore", new TableInfo.Column("homeScore", "INTEGER", true, 0, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsMatches.put("awayScore", new TableInfo.Column("awayScore", "INTEGER", true, 0, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsMatches.put("homeScorers", new TableInfo.Column("homeScorers", "TEXT", false, 0, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsMatches.put("awayScorers", new TableInfo.Column("awayScorers", "TEXT", false, 0, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsMatches.put("bannerUrl", new TableInfo.Column("bannerUrl", "TEXT", false, 0, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsMatches.put("description", new TableInfo.Column("description", "TEXT", false, 0, null, TableInfo.CREATED_FROM_ENTITY));
        final HashSet<TableInfo.ForeignKey> _foreignKeysMatches = new HashSet<TableInfo.ForeignKey>(0);
        final HashSet<TableInfo.Index> _indicesMatches = new HashSet<TableInfo.Index>(0);
        final TableInfo _infoMatches = new TableInfo("matches", _columnsMatches, _foreignKeysMatches, _indicesMatches);
        final TableInfo _existingMatches = TableInfo.read(db, "matches");
        if (!_infoMatches.equals(_existingMatches)) {
          return new RoomOpenHelper.ValidationResult(false, "matches(com.worldcup2026.streaming.data.local.CachedMatch).\n"
                  + " Expected:\n" + _infoMatches + "\n"
                  + " Found:\n" + _existingMatches);
        }
        final HashMap<String, TableInfo.Column> _columnsStreams = new HashMap<String, TableInfo.Column>(8);
        _columnsStreams.put("id", new TableInfo.Column("id", "TEXT", true, 1, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsStreams.put("matchId", new TableInfo.Column("matchId", "TEXT", true, 0, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsStreams.put("streamName", new TableInfo.Column("streamName", "TEXT", true, 0, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsStreams.put("primaryUrl", new TableInfo.Column("primaryUrl", "TEXT", true, 0, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsStreams.put("backupUrl1", new TableInfo.Column("backupUrl1", "TEXT", false, 0, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsStreams.put("backupUrl2", new TableInfo.Column("backupUrl2", "TEXT", false, 0, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsStreams.put("backupUrl3", new TableInfo.Column("backupUrl3", "TEXT", false, 0, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsStreams.put("isEnabled", new TableInfo.Column("isEnabled", "INTEGER", true, 0, null, TableInfo.CREATED_FROM_ENTITY));
        final HashSet<TableInfo.ForeignKey> _foreignKeysStreams = new HashSet<TableInfo.ForeignKey>(0);
        final HashSet<TableInfo.Index> _indicesStreams = new HashSet<TableInfo.Index>(0);
        final TableInfo _infoStreams = new TableInfo("streams", _columnsStreams, _foreignKeysStreams, _indicesStreams);
        final TableInfo _existingStreams = TableInfo.read(db, "streams");
        if (!_infoStreams.equals(_existingStreams)) {
          return new RoomOpenHelper.ValidationResult(false, "streams(com.worldcup2026.streaming.data.local.CachedStream).\n"
                  + " Expected:\n" + _infoStreams + "\n"
                  + " Found:\n" + _existingStreams);
        }
        final HashMap<String, TableInfo.Column> _columnsAnnouncements = new HashMap<String, TableInfo.Column>(8);
        _columnsAnnouncements.put("id", new TableInfo.Column("id", "TEXT", true, 1, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsAnnouncements.put("title", new TableInfo.Column("title", "TEXT", true, 0, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsAnnouncements.put("message", new TableInfo.Column("message", "TEXT", true, 0, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsAnnouncements.put("icon", new TableInfo.Column("icon", "TEXT", false, 0, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsAnnouncements.put("priority", new TableInfo.Column("priority", "TEXT", true, 0, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsAnnouncements.put("status", new TableInfo.Column("status", "TEXT", true, 0, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsAnnouncements.put("scheduledFor", new TableInfo.Column("scheduledFor", "INTEGER", false, 0, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsAnnouncements.put("createdAt", new TableInfo.Column("createdAt", "INTEGER", true, 0, null, TableInfo.CREATED_FROM_ENTITY));
        final HashSet<TableInfo.ForeignKey> _foreignKeysAnnouncements = new HashSet<TableInfo.ForeignKey>(0);
        final HashSet<TableInfo.Index> _indicesAnnouncements = new HashSet<TableInfo.Index>(0);
        final TableInfo _infoAnnouncements = new TableInfo("announcements", _columnsAnnouncements, _foreignKeysAnnouncements, _indicesAnnouncements);
        final TableInfo _existingAnnouncements = TableInfo.read(db, "announcements");
        if (!_infoAnnouncements.equals(_existingAnnouncements)) {
          return new RoomOpenHelper.ValidationResult(false, "announcements(com.worldcup2026.streaming.data.local.CachedAnnouncement).\n"
                  + " Expected:\n" + _infoAnnouncements + "\n"
                  + " Found:\n" + _existingAnnouncements);
        }
        final HashMap<String, TableInfo.Column> _columnsAdConfigs = new HashMap<String, TableInfo.Column>(10);
        _columnsAdConfigs.put("id", new TableInfo.Column("id", "TEXT", true, 1, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsAdConfigs.put("networkName", new TableInfo.Column("networkName", "TEXT", true, 0, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsAdConfigs.put("isEnabled", new TableInfo.Column("isEnabled", "INTEGER", true, 0, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsAdConfigs.put("verificationCode", new TableInfo.Column("verificationCode", "TEXT", false, 0, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsAdConfigs.put("headerScript", new TableInfo.Column("headerScript", "TEXT", false, 0, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsAdConfigs.put("footerScript", new TableInfo.Column("footerScript", "TEXT", false, 0, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsAdConfigs.put("bannerScript", new TableInfo.Column("bannerScript", "TEXT", false, 0, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsAdConfigs.put("nativeScript", new TableInfo.Column("nativeScript", "TEXT", false, 0, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsAdConfigs.put("socialBarScript", new TableInfo.Column("socialBarScript", "TEXT", false, 0, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsAdConfigs.put("popunderScript", new TableInfo.Column("popunderScript", "TEXT", false, 0, null, TableInfo.CREATED_FROM_ENTITY));
        final HashSet<TableInfo.ForeignKey> _foreignKeysAdConfigs = new HashSet<TableInfo.ForeignKey>(0);
        final HashSet<TableInfo.Index> _indicesAdConfigs = new HashSet<TableInfo.Index>(0);
        final TableInfo _infoAdConfigs = new TableInfo("ad_configs", _columnsAdConfigs, _foreignKeysAdConfigs, _indicesAdConfigs);
        final TableInfo _existingAdConfigs = TableInfo.read(db, "ad_configs");
        if (!_infoAdConfigs.equals(_existingAdConfigs)) {
          return new RoomOpenHelper.ValidationResult(false, "ad_configs(com.worldcup2026.streaming.data.local.CachedAdConfig).\n"
                  + " Expected:\n" + _infoAdConfigs + "\n"
                  + " Found:\n" + _existingAdConfigs);
        }
        return new RoomOpenHelper.ValidationResult(true, null);
      }
    }, "6229af935b088e4cb4da95b466b2e926", "95af4027af32d0cac357d0b87047a488");
    final SupportSQLiteOpenHelper.Configuration _sqliteConfig = SupportSQLiteOpenHelper.Configuration.builder(config.context).name(config.name).callback(_openCallback).build();
    final SupportSQLiteOpenHelper _helper = config.sqliteOpenHelperFactory.create(_sqliteConfig);
    return _helper;
  }

  @Override
  @NonNull
  protected InvalidationTracker createInvalidationTracker() {
    final HashMap<String, String> _shadowTablesMap = new HashMap<String, String>(0);
    final HashMap<String, Set<String>> _viewTables = new HashMap<String, Set<String>>(0);
    return new InvalidationTracker(this, _shadowTablesMap, _viewTables, "teams","matches","streams","announcements","ad_configs");
  }

  @Override
  public void clearAllTables() {
    super.assertNotMainThread();
    final SupportSQLiteDatabase _db = super.getOpenHelper().getWritableDatabase();
    try {
      super.beginTransaction();
      _db.execSQL("DELETE FROM `teams`");
      _db.execSQL("DELETE FROM `matches`");
      _db.execSQL("DELETE FROM `streams`");
      _db.execSQL("DELETE FROM `announcements`");
      _db.execSQL("DELETE FROM `ad_configs`");
      super.setTransactionSuccessful();
    } finally {
      super.endTransaction();
      _db.query("PRAGMA wal_checkpoint(FULL)").close();
      if (!_db.inTransaction()) {
        _db.execSQL("VACUUM");
      }
    }
  }

  @Override
  @NonNull
  protected Map<Class<?>, List<Class<?>>> getRequiredTypeConverters() {
    final HashMap<Class<?>, List<Class<?>>> _typeConvertersMap = new HashMap<Class<?>, List<Class<?>>>();
    _typeConvertersMap.put(AppDao.class, AppDao_Impl.getRequiredConverters());
    return _typeConvertersMap;
  }

  @Override
  @NonNull
  public Set<Class<? extends AutoMigrationSpec>> getRequiredAutoMigrationSpecs() {
    final HashSet<Class<? extends AutoMigrationSpec>> _autoMigrationSpecsSet = new HashSet<Class<? extends AutoMigrationSpec>>();
    return _autoMigrationSpecsSet;
  }

  @Override
  @NonNull
  public List<Migration> getAutoMigrations(
      @NonNull final Map<Class<? extends AutoMigrationSpec>, AutoMigrationSpec> autoMigrationSpecs) {
    final List<Migration> _autoMigrations = new ArrayList<Migration>();
    return _autoMigrations;
  }

  @Override
  public AppDao appDao() {
    if (_appDao != null) {
      return _appDao;
    } else {
      synchronized(this) {
        if(_appDao == null) {
          _appDao = new AppDao_Impl(this);
        }
        return _appDao;
      }
    }
  }
}
