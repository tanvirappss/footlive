package com.worldcup2026.streaming.data.local;

import android.database.Cursor;
import android.os.CancellationSignal;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.room.CoroutinesRoom;
import androidx.room.EntityInsertionAdapter;
import androidx.room.RoomDatabase;
import androidx.room.RoomSQLiteQuery;
import androidx.room.SharedSQLiteStatement;
import androidx.room.util.CursorUtil;
import androidx.room.util.DBUtil;
import androidx.sqlite.db.SupportSQLiteStatement;
import java.lang.Class;
import java.lang.Exception;
import java.lang.Long;
import java.lang.Object;
import java.lang.Override;
import java.lang.String;
import java.lang.SuppressWarnings;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.Callable;
import javax.annotation.processing.Generated;
import kotlin.Unit;
import kotlin.coroutines.Continuation;
import kotlinx.coroutines.flow.Flow;

@Generated("androidx.room.RoomProcessor")
@SuppressWarnings({"unchecked", "deprecation"})
public final class AppDao_Impl implements AppDao {
  private final RoomDatabase __db;

  private final EntityInsertionAdapter<CachedTeam> __insertionAdapterOfCachedTeam;

  private final EntityInsertionAdapter<CachedMatch> __insertionAdapterOfCachedMatch;

  private final EntityInsertionAdapter<CachedStream> __insertionAdapterOfCachedStream;

  private final EntityInsertionAdapter<CachedAnnouncement> __insertionAdapterOfCachedAnnouncement;

  private final EntityInsertionAdapter<CachedAdConfig> __insertionAdapterOfCachedAdConfig;

  private final SharedSQLiteStatement __preparedStmtOfClearTeams;

  private final SharedSQLiteStatement __preparedStmtOfClearMatches;

  private final SharedSQLiteStatement __preparedStmtOfClearStreams;

  private final SharedSQLiteStatement __preparedStmtOfClearAnnouncements;

  private final SharedSQLiteStatement __preparedStmtOfClearAdConfigs;

  public AppDao_Impl(@NonNull final RoomDatabase __db) {
    this.__db = __db;
    this.__insertionAdapterOfCachedTeam = new EntityInsertionAdapter<CachedTeam>(__db) {
      @Override
      @NonNull
      protected String createQuery() {
        return "INSERT OR REPLACE INTO `teams` (`id`,`name`,`shortName`,`countryName`,`countryCode`,`flagUrl`,`logoUrl`,`region`,`isEnabled`) VALUES (?,?,?,?,?,?,?,?,?)";
      }

      @Override
      protected void bind(@NonNull final SupportSQLiteStatement statement,
          @NonNull final CachedTeam entity) {
        statement.bindString(1, entity.getId());
        statement.bindString(2, entity.getName());
        statement.bindString(3, entity.getShortName());
        statement.bindString(4, entity.getCountryName());
        statement.bindString(5, entity.getCountryCode());
        if (entity.getFlagUrl() == null) {
          statement.bindNull(6);
        } else {
          statement.bindString(6, entity.getFlagUrl());
        }
        if (entity.getLogoUrl() == null) {
          statement.bindNull(7);
        } else {
          statement.bindString(7, entity.getLogoUrl());
        }
        if (entity.getRegion() == null) {
          statement.bindNull(8);
        } else {
          statement.bindString(8, entity.getRegion());
        }
        final int _tmp = entity.isEnabled() ? 1 : 0;
        statement.bindLong(9, _tmp);
      }
    };
    this.__insertionAdapterOfCachedMatch = new EntityInsertionAdapter<CachedMatch>(__db) {
      @Override
      @NonNull
      protected String createQuery() {
        return "INSERT OR REPLACE INTO `matches` (`id`,`homeTeamId`,`awayTeamId`,`homeTeamCustomName`,`homeTeamCustomFlag`,`awayTeamCustomName`,`awayTeamCustomFlag`,`tournamentName`,`matchDate`,`matchTime`,`matchTimestamp`,`stadiumName`,`status`,`homeScore`,`awayScore`,`homeScorers`,`awayScorers`,`bannerUrl`,`description`) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)";
      }

      @Override
      protected void bind(@NonNull final SupportSQLiteStatement statement,
          @NonNull final CachedMatch entity) {
        statement.bindString(1, entity.getId());
        if (entity.getHomeTeamId() == null) {
          statement.bindNull(2);
        } else {
          statement.bindString(2, entity.getHomeTeamId());
        }
        if (entity.getAwayTeamId() == null) {
          statement.bindNull(3);
        } else {
          statement.bindString(3, entity.getAwayTeamId());
        }
        if (entity.getHomeTeamCustomName() == null) {
          statement.bindNull(4);
        } else {
          statement.bindString(4, entity.getHomeTeamCustomName());
        }
        if (entity.getHomeTeamCustomFlag() == null) {
          statement.bindNull(5);
        } else {
          statement.bindString(5, entity.getHomeTeamCustomFlag());
        }
        if (entity.getAwayTeamCustomName() == null) {
          statement.bindNull(6);
        } else {
          statement.bindString(6, entity.getAwayTeamCustomName());
        }
        if (entity.getAwayTeamCustomFlag() == null) {
          statement.bindNull(7);
        } else {
          statement.bindString(7, entity.getAwayTeamCustomFlag());
        }
        statement.bindString(8, entity.getTournamentName());
        statement.bindString(9, entity.getMatchDate());
        statement.bindString(10, entity.getMatchTime());
        statement.bindLong(11, entity.getMatchTimestamp());
        statement.bindString(12, entity.getStadiumName());
        statement.bindString(13, entity.getStatus());
        statement.bindLong(14, entity.getHomeScore());
        statement.bindLong(15, entity.getAwayScore());
        if (entity.getHomeScorers() == null) {
          statement.bindNull(16);
        } else {
          statement.bindString(16, entity.getHomeScorers());
        }
        if (entity.getAwayScorers() == null) {
          statement.bindNull(17);
        } else {
          statement.bindString(17, entity.getAwayScorers());
        }
        if (entity.getBannerUrl() == null) {
          statement.bindNull(18);
        } else {
          statement.bindString(18, entity.getBannerUrl());
        }
        if (entity.getDescription() == null) {
          statement.bindNull(19);
        } else {
          statement.bindString(19, entity.getDescription());
        }
      }
    };
    this.__insertionAdapterOfCachedStream = new EntityInsertionAdapter<CachedStream>(__db) {
      @Override
      @NonNull
      protected String createQuery() {
        return "INSERT OR REPLACE INTO `streams` (`id`,`matchId`,`streamName`,`primaryUrl`,`backupUrl1`,`backupUrl2`,`backupUrl3`,`isEnabled`) VALUES (?,?,?,?,?,?,?,?)";
      }

      @Override
      protected void bind(@NonNull final SupportSQLiteStatement statement,
          @NonNull final CachedStream entity) {
        statement.bindString(1, entity.getId());
        statement.bindString(2, entity.getMatchId());
        statement.bindString(3, entity.getStreamName());
        statement.bindString(4, entity.getPrimaryUrl());
        if (entity.getBackupUrl1() == null) {
          statement.bindNull(5);
        } else {
          statement.bindString(5, entity.getBackupUrl1());
        }
        if (entity.getBackupUrl2() == null) {
          statement.bindNull(6);
        } else {
          statement.bindString(6, entity.getBackupUrl2());
        }
        if (entity.getBackupUrl3() == null) {
          statement.bindNull(7);
        } else {
          statement.bindString(7, entity.getBackupUrl3());
        }
        final int _tmp = entity.isEnabled() ? 1 : 0;
        statement.bindLong(8, _tmp);
      }
    };
    this.__insertionAdapterOfCachedAnnouncement = new EntityInsertionAdapter<CachedAnnouncement>(__db) {
      @Override
      @NonNull
      protected String createQuery() {
        return "INSERT OR REPLACE INTO `announcements` (`id`,`title`,`message`,`icon`,`priority`,`status`,`scheduledFor`,`createdAt`) VALUES (?,?,?,?,?,?,?,?)";
      }

      @Override
      protected void bind(@NonNull final SupportSQLiteStatement statement,
          @NonNull final CachedAnnouncement entity) {
        statement.bindString(1, entity.getId());
        statement.bindString(2, entity.getTitle());
        statement.bindString(3, entity.getMessage());
        if (entity.getIcon() == null) {
          statement.bindNull(4);
        } else {
          statement.bindString(4, entity.getIcon());
        }
        statement.bindString(5, entity.getPriority());
        statement.bindString(6, entity.getStatus());
        if (entity.getScheduledFor() == null) {
          statement.bindNull(7);
        } else {
          statement.bindLong(7, entity.getScheduledFor());
        }
        statement.bindLong(8, entity.getCreatedAt());
      }
    };
    this.__insertionAdapterOfCachedAdConfig = new EntityInsertionAdapter<CachedAdConfig>(__db) {
      @Override
      @NonNull
      protected String createQuery() {
        return "INSERT OR REPLACE INTO `ad_configs` (`id`,`networkName`,`isEnabled`,`verificationCode`,`headerScript`,`footerScript`,`bannerScript`,`nativeScript`,`socialBarScript`,`popunderScript`) VALUES (?,?,?,?,?,?,?,?,?,?)";
      }

      @Override
      protected void bind(@NonNull final SupportSQLiteStatement statement,
          @NonNull final CachedAdConfig entity) {
        statement.bindString(1, entity.getId());
        statement.bindString(2, entity.getNetworkName());
        final int _tmp = entity.isEnabled() ? 1 : 0;
        statement.bindLong(3, _tmp);
        if (entity.getVerificationCode() == null) {
          statement.bindNull(4);
        } else {
          statement.bindString(4, entity.getVerificationCode());
        }
        if (entity.getHeaderScript() == null) {
          statement.bindNull(5);
        } else {
          statement.bindString(5, entity.getHeaderScript());
        }
        if (entity.getFooterScript() == null) {
          statement.bindNull(6);
        } else {
          statement.bindString(6, entity.getFooterScript());
        }
        if (entity.getBannerScript() == null) {
          statement.bindNull(7);
        } else {
          statement.bindString(7, entity.getBannerScript());
        }
        if (entity.getNativeScript() == null) {
          statement.bindNull(8);
        } else {
          statement.bindString(8, entity.getNativeScript());
        }
        if (entity.getSocialBarScript() == null) {
          statement.bindNull(9);
        } else {
          statement.bindString(9, entity.getSocialBarScript());
        }
        if (entity.getPopunderScript() == null) {
          statement.bindNull(10);
        } else {
          statement.bindString(10, entity.getPopunderScript());
        }
      }
    };
    this.__preparedStmtOfClearTeams = new SharedSQLiteStatement(__db) {
      @Override
      @NonNull
      public String createQuery() {
        final String _query = "DELETE FROM teams";
        return _query;
      }
    };
    this.__preparedStmtOfClearMatches = new SharedSQLiteStatement(__db) {
      @Override
      @NonNull
      public String createQuery() {
        final String _query = "DELETE FROM matches";
        return _query;
      }
    };
    this.__preparedStmtOfClearStreams = new SharedSQLiteStatement(__db) {
      @Override
      @NonNull
      public String createQuery() {
        final String _query = "DELETE FROM streams";
        return _query;
      }
    };
    this.__preparedStmtOfClearAnnouncements = new SharedSQLiteStatement(__db) {
      @Override
      @NonNull
      public String createQuery() {
        final String _query = "DELETE FROM announcements";
        return _query;
      }
    };
    this.__preparedStmtOfClearAdConfigs = new SharedSQLiteStatement(__db) {
      @Override
      @NonNull
      public String createQuery() {
        final String _query = "DELETE FROM ad_configs";
        return _query;
      }
    };
  }

  @Override
  public Object insertTeams(final List<CachedTeam> teams,
      final Continuation<? super Unit> $completion) {
    return CoroutinesRoom.execute(__db, true, new Callable<Unit>() {
      @Override
      @NonNull
      public Unit call() throws Exception {
        __db.beginTransaction();
        try {
          __insertionAdapterOfCachedTeam.insert(teams);
          __db.setTransactionSuccessful();
          return Unit.INSTANCE;
        } finally {
          __db.endTransaction();
        }
      }
    }, $completion);
  }

  @Override
  public Object insertMatches(final List<CachedMatch> matches,
      final Continuation<? super Unit> $completion) {
    return CoroutinesRoom.execute(__db, true, new Callable<Unit>() {
      @Override
      @NonNull
      public Unit call() throws Exception {
        __db.beginTransaction();
        try {
          __insertionAdapterOfCachedMatch.insert(matches);
          __db.setTransactionSuccessful();
          return Unit.INSTANCE;
        } finally {
          __db.endTransaction();
        }
      }
    }, $completion);
  }

  @Override
  public Object insertStreams(final List<CachedStream> streams,
      final Continuation<? super Unit> $completion) {
    return CoroutinesRoom.execute(__db, true, new Callable<Unit>() {
      @Override
      @NonNull
      public Unit call() throws Exception {
        __db.beginTransaction();
        try {
          __insertionAdapterOfCachedStream.insert(streams);
          __db.setTransactionSuccessful();
          return Unit.INSTANCE;
        } finally {
          __db.endTransaction();
        }
      }
    }, $completion);
  }

  @Override
  public Object insertAnnouncements(final List<CachedAnnouncement> announcements,
      final Continuation<? super Unit> $completion) {
    return CoroutinesRoom.execute(__db, true, new Callable<Unit>() {
      @Override
      @NonNull
      public Unit call() throws Exception {
        __db.beginTransaction();
        try {
          __insertionAdapterOfCachedAnnouncement.insert(announcements);
          __db.setTransactionSuccessful();
          return Unit.INSTANCE;
        } finally {
          __db.endTransaction();
        }
      }
    }, $completion);
  }

  @Override
  public Object insertAdConfigs(final List<CachedAdConfig> configs,
      final Continuation<? super Unit> $completion) {
    return CoroutinesRoom.execute(__db, true, new Callable<Unit>() {
      @Override
      @NonNull
      public Unit call() throws Exception {
        __db.beginTransaction();
        try {
          __insertionAdapterOfCachedAdConfig.insert(configs);
          __db.setTransactionSuccessful();
          return Unit.INSTANCE;
        } finally {
          __db.endTransaction();
        }
      }
    }, $completion);
  }

  @Override
  public Object clearTeams(final Continuation<? super Unit> $completion) {
    return CoroutinesRoom.execute(__db, true, new Callable<Unit>() {
      @Override
      @NonNull
      public Unit call() throws Exception {
        final SupportSQLiteStatement _stmt = __preparedStmtOfClearTeams.acquire();
        try {
          __db.beginTransaction();
          try {
            _stmt.executeUpdateDelete();
            __db.setTransactionSuccessful();
            return Unit.INSTANCE;
          } finally {
            __db.endTransaction();
          }
        } finally {
          __preparedStmtOfClearTeams.release(_stmt);
        }
      }
    }, $completion);
  }

  @Override
  public Object clearMatches(final Continuation<? super Unit> $completion) {
    return CoroutinesRoom.execute(__db, true, new Callable<Unit>() {
      @Override
      @NonNull
      public Unit call() throws Exception {
        final SupportSQLiteStatement _stmt = __preparedStmtOfClearMatches.acquire();
        try {
          __db.beginTransaction();
          try {
            _stmt.executeUpdateDelete();
            __db.setTransactionSuccessful();
            return Unit.INSTANCE;
          } finally {
            __db.endTransaction();
          }
        } finally {
          __preparedStmtOfClearMatches.release(_stmt);
        }
      }
    }, $completion);
  }

  @Override
  public Object clearStreams(final Continuation<? super Unit> $completion) {
    return CoroutinesRoom.execute(__db, true, new Callable<Unit>() {
      @Override
      @NonNull
      public Unit call() throws Exception {
        final SupportSQLiteStatement _stmt = __preparedStmtOfClearStreams.acquire();
        try {
          __db.beginTransaction();
          try {
            _stmt.executeUpdateDelete();
            __db.setTransactionSuccessful();
            return Unit.INSTANCE;
          } finally {
            __db.endTransaction();
          }
        } finally {
          __preparedStmtOfClearStreams.release(_stmt);
        }
      }
    }, $completion);
  }

  @Override
  public Object clearAnnouncements(final Continuation<? super Unit> $completion) {
    return CoroutinesRoom.execute(__db, true, new Callable<Unit>() {
      @Override
      @NonNull
      public Unit call() throws Exception {
        final SupportSQLiteStatement _stmt = __preparedStmtOfClearAnnouncements.acquire();
        try {
          __db.beginTransaction();
          try {
            _stmt.executeUpdateDelete();
            __db.setTransactionSuccessful();
            return Unit.INSTANCE;
          } finally {
            __db.endTransaction();
          }
        } finally {
          __preparedStmtOfClearAnnouncements.release(_stmt);
        }
      }
    }, $completion);
  }

  @Override
  public Object clearAdConfigs(final Continuation<? super Unit> $completion) {
    return CoroutinesRoom.execute(__db, true, new Callable<Unit>() {
      @Override
      @NonNull
      public Unit call() throws Exception {
        final SupportSQLiteStatement _stmt = __preparedStmtOfClearAdConfigs.acquire();
        try {
          __db.beginTransaction();
          try {
            _stmt.executeUpdateDelete();
            __db.setTransactionSuccessful();
            return Unit.INSTANCE;
          } finally {
            __db.endTransaction();
          }
        } finally {
          __preparedStmtOfClearAdConfigs.release(_stmt);
        }
      }
    }, $completion);
  }

  @Override
  public Flow<List<CachedTeam>> getAllTeams() {
    final String _sql = "SELECT * FROM teams WHERE isEnabled = 1";
    final RoomSQLiteQuery _statement = RoomSQLiteQuery.acquire(_sql, 0);
    return CoroutinesRoom.createFlow(__db, false, new String[] {"teams"}, new Callable<List<CachedTeam>>() {
      @Override
      @NonNull
      public List<CachedTeam> call() throws Exception {
        final Cursor _cursor = DBUtil.query(__db, _statement, false, null);
        try {
          final int _cursorIndexOfId = CursorUtil.getColumnIndexOrThrow(_cursor, "id");
          final int _cursorIndexOfName = CursorUtil.getColumnIndexOrThrow(_cursor, "name");
          final int _cursorIndexOfShortName = CursorUtil.getColumnIndexOrThrow(_cursor, "shortName");
          final int _cursorIndexOfCountryName = CursorUtil.getColumnIndexOrThrow(_cursor, "countryName");
          final int _cursorIndexOfCountryCode = CursorUtil.getColumnIndexOrThrow(_cursor, "countryCode");
          final int _cursorIndexOfFlagUrl = CursorUtil.getColumnIndexOrThrow(_cursor, "flagUrl");
          final int _cursorIndexOfLogoUrl = CursorUtil.getColumnIndexOrThrow(_cursor, "logoUrl");
          final int _cursorIndexOfRegion = CursorUtil.getColumnIndexOrThrow(_cursor, "region");
          final int _cursorIndexOfIsEnabled = CursorUtil.getColumnIndexOrThrow(_cursor, "isEnabled");
          final List<CachedTeam> _result = new ArrayList<CachedTeam>(_cursor.getCount());
          while (_cursor.moveToNext()) {
            final CachedTeam _item;
            final String _tmpId;
            _tmpId = _cursor.getString(_cursorIndexOfId);
            final String _tmpName;
            _tmpName = _cursor.getString(_cursorIndexOfName);
            final String _tmpShortName;
            _tmpShortName = _cursor.getString(_cursorIndexOfShortName);
            final String _tmpCountryName;
            _tmpCountryName = _cursor.getString(_cursorIndexOfCountryName);
            final String _tmpCountryCode;
            _tmpCountryCode = _cursor.getString(_cursorIndexOfCountryCode);
            final String _tmpFlagUrl;
            if (_cursor.isNull(_cursorIndexOfFlagUrl)) {
              _tmpFlagUrl = null;
            } else {
              _tmpFlagUrl = _cursor.getString(_cursorIndexOfFlagUrl);
            }
            final String _tmpLogoUrl;
            if (_cursor.isNull(_cursorIndexOfLogoUrl)) {
              _tmpLogoUrl = null;
            } else {
              _tmpLogoUrl = _cursor.getString(_cursorIndexOfLogoUrl);
            }
            final String _tmpRegion;
            if (_cursor.isNull(_cursorIndexOfRegion)) {
              _tmpRegion = null;
            } else {
              _tmpRegion = _cursor.getString(_cursorIndexOfRegion);
            }
            final boolean _tmpIsEnabled;
            final int _tmp;
            _tmp = _cursor.getInt(_cursorIndexOfIsEnabled);
            _tmpIsEnabled = _tmp != 0;
            _item = new CachedTeam(_tmpId,_tmpName,_tmpShortName,_tmpCountryName,_tmpCountryCode,_tmpFlagUrl,_tmpLogoUrl,_tmpRegion,_tmpIsEnabled);
            _result.add(_item);
          }
          return _result;
        } finally {
          _cursor.close();
        }
      }

      @Override
      protected void finalize() {
        _statement.release();
      }
    });
  }

  @Override
  public Flow<List<CachedMatch>> getAllMatches() {
    final String _sql = "SELECT * FROM matches ORDER BY matchTimestamp ASC";
    final RoomSQLiteQuery _statement = RoomSQLiteQuery.acquire(_sql, 0);
    return CoroutinesRoom.createFlow(__db, false, new String[] {"matches"}, new Callable<List<CachedMatch>>() {
      @Override
      @NonNull
      public List<CachedMatch> call() throws Exception {
        final Cursor _cursor = DBUtil.query(__db, _statement, false, null);
        try {
          final int _cursorIndexOfId = CursorUtil.getColumnIndexOrThrow(_cursor, "id");
          final int _cursorIndexOfHomeTeamId = CursorUtil.getColumnIndexOrThrow(_cursor, "homeTeamId");
          final int _cursorIndexOfAwayTeamId = CursorUtil.getColumnIndexOrThrow(_cursor, "awayTeamId");
          final int _cursorIndexOfHomeTeamCustomName = CursorUtil.getColumnIndexOrThrow(_cursor, "homeTeamCustomName");
          final int _cursorIndexOfHomeTeamCustomFlag = CursorUtil.getColumnIndexOrThrow(_cursor, "homeTeamCustomFlag");
          final int _cursorIndexOfAwayTeamCustomName = CursorUtil.getColumnIndexOrThrow(_cursor, "awayTeamCustomName");
          final int _cursorIndexOfAwayTeamCustomFlag = CursorUtil.getColumnIndexOrThrow(_cursor, "awayTeamCustomFlag");
          final int _cursorIndexOfTournamentName = CursorUtil.getColumnIndexOrThrow(_cursor, "tournamentName");
          final int _cursorIndexOfMatchDate = CursorUtil.getColumnIndexOrThrow(_cursor, "matchDate");
          final int _cursorIndexOfMatchTime = CursorUtil.getColumnIndexOrThrow(_cursor, "matchTime");
          final int _cursorIndexOfMatchTimestamp = CursorUtil.getColumnIndexOrThrow(_cursor, "matchTimestamp");
          final int _cursorIndexOfStadiumName = CursorUtil.getColumnIndexOrThrow(_cursor, "stadiumName");
          final int _cursorIndexOfStatus = CursorUtil.getColumnIndexOrThrow(_cursor, "status");
          final int _cursorIndexOfHomeScore = CursorUtil.getColumnIndexOrThrow(_cursor, "homeScore");
          final int _cursorIndexOfAwayScore = CursorUtil.getColumnIndexOrThrow(_cursor, "awayScore");
          final int _cursorIndexOfHomeScorers = CursorUtil.getColumnIndexOrThrow(_cursor, "homeScorers");
          final int _cursorIndexOfAwayScorers = CursorUtil.getColumnIndexOrThrow(_cursor, "awayScorers");
          final int _cursorIndexOfBannerUrl = CursorUtil.getColumnIndexOrThrow(_cursor, "bannerUrl");
          final int _cursorIndexOfDescription = CursorUtil.getColumnIndexOrThrow(_cursor, "description");
          final List<CachedMatch> _result = new ArrayList<CachedMatch>(_cursor.getCount());
          while (_cursor.moveToNext()) {
            final CachedMatch _item;
            final String _tmpId;
            _tmpId = _cursor.getString(_cursorIndexOfId);
            final String _tmpHomeTeamId;
            if (_cursor.isNull(_cursorIndexOfHomeTeamId)) {
              _tmpHomeTeamId = null;
            } else {
              _tmpHomeTeamId = _cursor.getString(_cursorIndexOfHomeTeamId);
            }
            final String _tmpAwayTeamId;
            if (_cursor.isNull(_cursorIndexOfAwayTeamId)) {
              _tmpAwayTeamId = null;
            } else {
              _tmpAwayTeamId = _cursor.getString(_cursorIndexOfAwayTeamId);
            }
            final String _tmpHomeTeamCustomName;
            if (_cursor.isNull(_cursorIndexOfHomeTeamCustomName)) {
              _tmpHomeTeamCustomName = null;
            } else {
              _tmpHomeTeamCustomName = _cursor.getString(_cursorIndexOfHomeTeamCustomName);
            }
            final String _tmpHomeTeamCustomFlag;
            if (_cursor.isNull(_cursorIndexOfHomeTeamCustomFlag)) {
              _tmpHomeTeamCustomFlag = null;
            } else {
              _tmpHomeTeamCustomFlag = _cursor.getString(_cursorIndexOfHomeTeamCustomFlag);
            }
            final String _tmpAwayTeamCustomName;
            if (_cursor.isNull(_cursorIndexOfAwayTeamCustomName)) {
              _tmpAwayTeamCustomName = null;
            } else {
              _tmpAwayTeamCustomName = _cursor.getString(_cursorIndexOfAwayTeamCustomName);
            }
            final String _tmpAwayTeamCustomFlag;
            if (_cursor.isNull(_cursorIndexOfAwayTeamCustomFlag)) {
              _tmpAwayTeamCustomFlag = null;
            } else {
              _tmpAwayTeamCustomFlag = _cursor.getString(_cursorIndexOfAwayTeamCustomFlag);
            }
            final String _tmpTournamentName;
            _tmpTournamentName = _cursor.getString(_cursorIndexOfTournamentName);
            final String _tmpMatchDate;
            _tmpMatchDate = _cursor.getString(_cursorIndexOfMatchDate);
            final String _tmpMatchTime;
            _tmpMatchTime = _cursor.getString(_cursorIndexOfMatchTime);
            final long _tmpMatchTimestamp;
            _tmpMatchTimestamp = _cursor.getLong(_cursorIndexOfMatchTimestamp);
            final String _tmpStadiumName;
            _tmpStadiumName = _cursor.getString(_cursorIndexOfStadiumName);
            final String _tmpStatus;
            _tmpStatus = _cursor.getString(_cursorIndexOfStatus);
            final int _tmpHomeScore;
            _tmpHomeScore = _cursor.getInt(_cursorIndexOfHomeScore);
            final int _tmpAwayScore;
            _tmpAwayScore = _cursor.getInt(_cursorIndexOfAwayScore);
            final String _tmpHomeScorers;
            if (_cursor.isNull(_cursorIndexOfHomeScorers)) {
              _tmpHomeScorers = null;
            } else {
              _tmpHomeScorers = _cursor.getString(_cursorIndexOfHomeScorers);
            }
            final String _tmpAwayScorers;
            if (_cursor.isNull(_cursorIndexOfAwayScorers)) {
              _tmpAwayScorers = null;
            } else {
              _tmpAwayScorers = _cursor.getString(_cursorIndexOfAwayScorers);
            }
            final String _tmpBannerUrl;
            if (_cursor.isNull(_cursorIndexOfBannerUrl)) {
              _tmpBannerUrl = null;
            } else {
              _tmpBannerUrl = _cursor.getString(_cursorIndexOfBannerUrl);
            }
            final String _tmpDescription;
            if (_cursor.isNull(_cursorIndexOfDescription)) {
              _tmpDescription = null;
            } else {
              _tmpDescription = _cursor.getString(_cursorIndexOfDescription);
            }
            _item = new CachedMatch(_tmpId,_tmpHomeTeamId,_tmpAwayTeamId,_tmpHomeTeamCustomName,_tmpHomeTeamCustomFlag,_tmpAwayTeamCustomName,_tmpAwayTeamCustomFlag,_tmpTournamentName,_tmpMatchDate,_tmpMatchTime,_tmpMatchTimestamp,_tmpStadiumName,_tmpStatus,_tmpHomeScore,_tmpAwayScore,_tmpHomeScorers,_tmpAwayScorers,_tmpBannerUrl,_tmpDescription);
            _result.add(_item);
          }
          return _result;
        } finally {
          _cursor.close();
        }
      }

      @Override
      protected void finalize() {
        _statement.release();
      }
    });
  }

  @Override
  public Object getMatchById(final String id, final Continuation<? super CachedMatch> $completion) {
    final String _sql = "SELECT * FROM matches WHERE id = ?";
    final RoomSQLiteQuery _statement = RoomSQLiteQuery.acquire(_sql, 1);
    int _argIndex = 1;
    _statement.bindString(_argIndex, id);
    final CancellationSignal _cancellationSignal = DBUtil.createCancellationSignal();
    return CoroutinesRoom.execute(__db, false, _cancellationSignal, new Callable<CachedMatch>() {
      @Override
      @Nullable
      public CachedMatch call() throws Exception {
        final Cursor _cursor = DBUtil.query(__db, _statement, false, null);
        try {
          final int _cursorIndexOfId = CursorUtil.getColumnIndexOrThrow(_cursor, "id");
          final int _cursorIndexOfHomeTeamId = CursorUtil.getColumnIndexOrThrow(_cursor, "homeTeamId");
          final int _cursorIndexOfAwayTeamId = CursorUtil.getColumnIndexOrThrow(_cursor, "awayTeamId");
          final int _cursorIndexOfHomeTeamCustomName = CursorUtil.getColumnIndexOrThrow(_cursor, "homeTeamCustomName");
          final int _cursorIndexOfHomeTeamCustomFlag = CursorUtil.getColumnIndexOrThrow(_cursor, "homeTeamCustomFlag");
          final int _cursorIndexOfAwayTeamCustomName = CursorUtil.getColumnIndexOrThrow(_cursor, "awayTeamCustomName");
          final int _cursorIndexOfAwayTeamCustomFlag = CursorUtil.getColumnIndexOrThrow(_cursor, "awayTeamCustomFlag");
          final int _cursorIndexOfTournamentName = CursorUtil.getColumnIndexOrThrow(_cursor, "tournamentName");
          final int _cursorIndexOfMatchDate = CursorUtil.getColumnIndexOrThrow(_cursor, "matchDate");
          final int _cursorIndexOfMatchTime = CursorUtil.getColumnIndexOrThrow(_cursor, "matchTime");
          final int _cursorIndexOfMatchTimestamp = CursorUtil.getColumnIndexOrThrow(_cursor, "matchTimestamp");
          final int _cursorIndexOfStadiumName = CursorUtil.getColumnIndexOrThrow(_cursor, "stadiumName");
          final int _cursorIndexOfStatus = CursorUtil.getColumnIndexOrThrow(_cursor, "status");
          final int _cursorIndexOfHomeScore = CursorUtil.getColumnIndexOrThrow(_cursor, "homeScore");
          final int _cursorIndexOfAwayScore = CursorUtil.getColumnIndexOrThrow(_cursor, "awayScore");
          final int _cursorIndexOfHomeScorers = CursorUtil.getColumnIndexOrThrow(_cursor, "homeScorers");
          final int _cursorIndexOfAwayScorers = CursorUtil.getColumnIndexOrThrow(_cursor, "awayScorers");
          final int _cursorIndexOfBannerUrl = CursorUtil.getColumnIndexOrThrow(_cursor, "bannerUrl");
          final int _cursorIndexOfDescription = CursorUtil.getColumnIndexOrThrow(_cursor, "description");
          final CachedMatch _result;
          if (_cursor.moveToFirst()) {
            final String _tmpId;
            _tmpId = _cursor.getString(_cursorIndexOfId);
            final String _tmpHomeTeamId;
            if (_cursor.isNull(_cursorIndexOfHomeTeamId)) {
              _tmpHomeTeamId = null;
            } else {
              _tmpHomeTeamId = _cursor.getString(_cursorIndexOfHomeTeamId);
            }
            final String _tmpAwayTeamId;
            if (_cursor.isNull(_cursorIndexOfAwayTeamId)) {
              _tmpAwayTeamId = null;
            } else {
              _tmpAwayTeamId = _cursor.getString(_cursorIndexOfAwayTeamId);
            }
            final String _tmpHomeTeamCustomName;
            if (_cursor.isNull(_cursorIndexOfHomeTeamCustomName)) {
              _tmpHomeTeamCustomName = null;
            } else {
              _tmpHomeTeamCustomName = _cursor.getString(_cursorIndexOfHomeTeamCustomName);
            }
            final String _tmpHomeTeamCustomFlag;
            if (_cursor.isNull(_cursorIndexOfHomeTeamCustomFlag)) {
              _tmpHomeTeamCustomFlag = null;
            } else {
              _tmpHomeTeamCustomFlag = _cursor.getString(_cursorIndexOfHomeTeamCustomFlag);
            }
            final String _tmpAwayTeamCustomName;
            if (_cursor.isNull(_cursorIndexOfAwayTeamCustomName)) {
              _tmpAwayTeamCustomName = null;
            } else {
              _tmpAwayTeamCustomName = _cursor.getString(_cursorIndexOfAwayTeamCustomName);
            }
            final String _tmpAwayTeamCustomFlag;
            if (_cursor.isNull(_cursorIndexOfAwayTeamCustomFlag)) {
              _tmpAwayTeamCustomFlag = null;
            } else {
              _tmpAwayTeamCustomFlag = _cursor.getString(_cursorIndexOfAwayTeamCustomFlag);
            }
            final String _tmpTournamentName;
            _tmpTournamentName = _cursor.getString(_cursorIndexOfTournamentName);
            final String _tmpMatchDate;
            _tmpMatchDate = _cursor.getString(_cursorIndexOfMatchDate);
            final String _tmpMatchTime;
            _tmpMatchTime = _cursor.getString(_cursorIndexOfMatchTime);
            final long _tmpMatchTimestamp;
            _tmpMatchTimestamp = _cursor.getLong(_cursorIndexOfMatchTimestamp);
            final String _tmpStadiumName;
            _tmpStadiumName = _cursor.getString(_cursorIndexOfStadiumName);
            final String _tmpStatus;
            _tmpStatus = _cursor.getString(_cursorIndexOfStatus);
            final int _tmpHomeScore;
            _tmpHomeScore = _cursor.getInt(_cursorIndexOfHomeScore);
            final int _tmpAwayScore;
            _tmpAwayScore = _cursor.getInt(_cursorIndexOfAwayScore);
            final String _tmpHomeScorers;
            if (_cursor.isNull(_cursorIndexOfHomeScorers)) {
              _tmpHomeScorers = null;
            } else {
              _tmpHomeScorers = _cursor.getString(_cursorIndexOfHomeScorers);
            }
            final String _tmpAwayScorers;
            if (_cursor.isNull(_cursorIndexOfAwayScorers)) {
              _tmpAwayScorers = null;
            } else {
              _tmpAwayScorers = _cursor.getString(_cursorIndexOfAwayScorers);
            }
            final String _tmpBannerUrl;
            if (_cursor.isNull(_cursorIndexOfBannerUrl)) {
              _tmpBannerUrl = null;
            } else {
              _tmpBannerUrl = _cursor.getString(_cursorIndexOfBannerUrl);
            }
            final String _tmpDescription;
            if (_cursor.isNull(_cursorIndexOfDescription)) {
              _tmpDescription = null;
            } else {
              _tmpDescription = _cursor.getString(_cursorIndexOfDescription);
            }
            _result = new CachedMatch(_tmpId,_tmpHomeTeamId,_tmpAwayTeamId,_tmpHomeTeamCustomName,_tmpHomeTeamCustomFlag,_tmpAwayTeamCustomName,_tmpAwayTeamCustomFlag,_tmpTournamentName,_tmpMatchDate,_tmpMatchTime,_tmpMatchTimestamp,_tmpStadiumName,_tmpStatus,_tmpHomeScore,_tmpAwayScore,_tmpHomeScorers,_tmpAwayScorers,_tmpBannerUrl,_tmpDescription);
          } else {
            _result = null;
          }
          return _result;
        } finally {
          _cursor.close();
          _statement.release();
        }
      }
    }, $completion);
  }

  @Override
  public Flow<List<CachedStream>> getStreamsForMatch(final String matchId) {
    final String _sql = "SELECT * FROM streams WHERE matchId = ? AND isEnabled = 1";
    final RoomSQLiteQuery _statement = RoomSQLiteQuery.acquire(_sql, 1);
    int _argIndex = 1;
    _statement.bindString(_argIndex, matchId);
    return CoroutinesRoom.createFlow(__db, false, new String[] {"streams"}, new Callable<List<CachedStream>>() {
      @Override
      @NonNull
      public List<CachedStream> call() throws Exception {
        final Cursor _cursor = DBUtil.query(__db, _statement, false, null);
        try {
          final int _cursorIndexOfId = CursorUtil.getColumnIndexOrThrow(_cursor, "id");
          final int _cursorIndexOfMatchId = CursorUtil.getColumnIndexOrThrow(_cursor, "matchId");
          final int _cursorIndexOfStreamName = CursorUtil.getColumnIndexOrThrow(_cursor, "streamName");
          final int _cursorIndexOfPrimaryUrl = CursorUtil.getColumnIndexOrThrow(_cursor, "primaryUrl");
          final int _cursorIndexOfBackupUrl1 = CursorUtil.getColumnIndexOrThrow(_cursor, "backupUrl1");
          final int _cursorIndexOfBackupUrl2 = CursorUtil.getColumnIndexOrThrow(_cursor, "backupUrl2");
          final int _cursorIndexOfBackupUrl3 = CursorUtil.getColumnIndexOrThrow(_cursor, "backupUrl3");
          final int _cursorIndexOfIsEnabled = CursorUtil.getColumnIndexOrThrow(_cursor, "isEnabled");
          final List<CachedStream> _result = new ArrayList<CachedStream>(_cursor.getCount());
          while (_cursor.moveToNext()) {
            final CachedStream _item;
            final String _tmpId;
            _tmpId = _cursor.getString(_cursorIndexOfId);
            final String _tmpMatchId;
            _tmpMatchId = _cursor.getString(_cursorIndexOfMatchId);
            final String _tmpStreamName;
            _tmpStreamName = _cursor.getString(_cursorIndexOfStreamName);
            final String _tmpPrimaryUrl;
            _tmpPrimaryUrl = _cursor.getString(_cursorIndexOfPrimaryUrl);
            final String _tmpBackupUrl1;
            if (_cursor.isNull(_cursorIndexOfBackupUrl1)) {
              _tmpBackupUrl1 = null;
            } else {
              _tmpBackupUrl1 = _cursor.getString(_cursorIndexOfBackupUrl1);
            }
            final String _tmpBackupUrl2;
            if (_cursor.isNull(_cursorIndexOfBackupUrl2)) {
              _tmpBackupUrl2 = null;
            } else {
              _tmpBackupUrl2 = _cursor.getString(_cursorIndexOfBackupUrl2);
            }
            final String _tmpBackupUrl3;
            if (_cursor.isNull(_cursorIndexOfBackupUrl3)) {
              _tmpBackupUrl3 = null;
            } else {
              _tmpBackupUrl3 = _cursor.getString(_cursorIndexOfBackupUrl3);
            }
            final boolean _tmpIsEnabled;
            final int _tmp;
            _tmp = _cursor.getInt(_cursorIndexOfIsEnabled);
            _tmpIsEnabled = _tmp != 0;
            _item = new CachedStream(_tmpId,_tmpMatchId,_tmpStreamName,_tmpPrimaryUrl,_tmpBackupUrl1,_tmpBackupUrl2,_tmpBackupUrl3,_tmpIsEnabled);
            _result.add(_item);
          }
          return _result;
        } finally {
          _cursor.close();
        }
      }

      @Override
      protected void finalize() {
        _statement.release();
      }
    });
  }

  @Override
  public Flow<List<CachedAnnouncement>> getAllAnnouncements() {
    final String _sql = "SELECT * FROM announcements ORDER BY createdAt DESC";
    final RoomSQLiteQuery _statement = RoomSQLiteQuery.acquire(_sql, 0);
    return CoroutinesRoom.createFlow(__db, false, new String[] {"announcements"}, new Callable<List<CachedAnnouncement>>() {
      @Override
      @NonNull
      public List<CachedAnnouncement> call() throws Exception {
        final Cursor _cursor = DBUtil.query(__db, _statement, false, null);
        try {
          final int _cursorIndexOfId = CursorUtil.getColumnIndexOrThrow(_cursor, "id");
          final int _cursorIndexOfTitle = CursorUtil.getColumnIndexOrThrow(_cursor, "title");
          final int _cursorIndexOfMessage = CursorUtil.getColumnIndexOrThrow(_cursor, "message");
          final int _cursorIndexOfIcon = CursorUtil.getColumnIndexOrThrow(_cursor, "icon");
          final int _cursorIndexOfPriority = CursorUtil.getColumnIndexOrThrow(_cursor, "priority");
          final int _cursorIndexOfStatus = CursorUtil.getColumnIndexOrThrow(_cursor, "status");
          final int _cursorIndexOfScheduledFor = CursorUtil.getColumnIndexOrThrow(_cursor, "scheduledFor");
          final int _cursorIndexOfCreatedAt = CursorUtil.getColumnIndexOrThrow(_cursor, "createdAt");
          final List<CachedAnnouncement> _result = new ArrayList<CachedAnnouncement>(_cursor.getCount());
          while (_cursor.moveToNext()) {
            final CachedAnnouncement _item;
            final String _tmpId;
            _tmpId = _cursor.getString(_cursorIndexOfId);
            final String _tmpTitle;
            _tmpTitle = _cursor.getString(_cursorIndexOfTitle);
            final String _tmpMessage;
            _tmpMessage = _cursor.getString(_cursorIndexOfMessage);
            final String _tmpIcon;
            if (_cursor.isNull(_cursorIndexOfIcon)) {
              _tmpIcon = null;
            } else {
              _tmpIcon = _cursor.getString(_cursorIndexOfIcon);
            }
            final String _tmpPriority;
            _tmpPriority = _cursor.getString(_cursorIndexOfPriority);
            final String _tmpStatus;
            _tmpStatus = _cursor.getString(_cursorIndexOfStatus);
            final Long _tmpScheduledFor;
            if (_cursor.isNull(_cursorIndexOfScheduledFor)) {
              _tmpScheduledFor = null;
            } else {
              _tmpScheduledFor = _cursor.getLong(_cursorIndexOfScheduledFor);
            }
            final long _tmpCreatedAt;
            _tmpCreatedAt = _cursor.getLong(_cursorIndexOfCreatedAt);
            _item = new CachedAnnouncement(_tmpId,_tmpTitle,_tmpMessage,_tmpIcon,_tmpPriority,_tmpStatus,_tmpScheduledFor,_tmpCreatedAt);
            _result.add(_item);
          }
          return _result;
        } finally {
          _cursor.close();
        }
      }

      @Override
      protected void finalize() {
        _statement.release();
      }
    });
  }

  @Override
  public Flow<List<CachedAdConfig>> getAllAdConfigs() {
    final String _sql = "SELECT * FROM ad_configs WHERE isEnabled = 1";
    final RoomSQLiteQuery _statement = RoomSQLiteQuery.acquire(_sql, 0);
    return CoroutinesRoom.createFlow(__db, false, new String[] {"ad_configs"}, new Callable<List<CachedAdConfig>>() {
      @Override
      @NonNull
      public List<CachedAdConfig> call() throws Exception {
        final Cursor _cursor = DBUtil.query(__db, _statement, false, null);
        try {
          final int _cursorIndexOfId = CursorUtil.getColumnIndexOrThrow(_cursor, "id");
          final int _cursorIndexOfNetworkName = CursorUtil.getColumnIndexOrThrow(_cursor, "networkName");
          final int _cursorIndexOfIsEnabled = CursorUtil.getColumnIndexOrThrow(_cursor, "isEnabled");
          final int _cursorIndexOfVerificationCode = CursorUtil.getColumnIndexOrThrow(_cursor, "verificationCode");
          final int _cursorIndexOfHeaderScript = CursorUtil.getColumnIndexOrThrow(_cursor, "headerScript");
          final int _cursorIndexOfFooterScript = CursorUtil.getColumnIndexOrThrow(_cursor, "footerScript");
          final int _cursorIndexOfBannerScript = CursorUtil.getColumnIndexOrThrow(_cursor, "bannerScript");
          final int _cursorIndexOfNativeScript = CursorUtil.getColumnIndexOrThrow(_cursor, "nativeScript");
          final int _cursorIndexOfSocialBarScript = CursorUtil.getColumnIndexOrThrow(_cursor, "socialBarScript");
          final int _cursorIndexOfPopunderScript = CursorUtil.getColumnIndexOrThrow(_cursor, "popunderScript");
          final List<CachedAdConfig> _result = new ArrayList<CachedAdConfig>(_cursor.getCount());
          while (_cursor.moveToNext()) {
            final CachedAdConfig _item;
            final String _tmpId;
            _tmpId = _cursor.getString(_cursorIndexOfId);
            final String _tmpNetworkName;
            _tmpNetworkName = _cursor.getString(_cursorIndexOfNetworkName);
            final boolean _tmpIsEnabled;
            final int _tmp;
            _tmp = _cursor.getInt(_cursorIndexOfIsEnabled);
            _tmpIsEnabled = _tmp != 0;
            final String _tmpVerificationCode;
            if (_cursor.isNull(_cursorIndexOfVerificationCode)) {
              _tmpVerificationCode = null;
            } else {
              _tmpVerificationCode = _cursor.getString(_cursorIndexOfVerificationCode);
            }
            final String _tmpHeaderScript;
            if (_cursor.isNull(_cursorIndexOfHeaderScript)) {
              _tmpHeaderScript = null;
            } else {
              _tmpHeaderScript = _cursor.getString(_cursorIndexOfHeaderScript);
            }
            final String _tmpFooterScript;
            if (_cursor.isNull(_cursorIndexOfFooterScript)) {
              _tmpFooterScript = null;
            } else {
              _tmpFooterScript = _cursor.getString(_cursorIndexOfFooterScript);
            }
            final String _tmpBannerScript;
            if (_cursor.isNull(_cursorIndexOfBannerScript)) {
              _tmpBannerScript = null;
            } else {
              _tmpBannerScript = _cursor.getString(_cursorIndexOfBannerScript);
            }
            final String _tmpNativeScript;
            if (_cursor.isNull(_cursorIndexOfNativeScript)) {
              _tmpNativeScript = null;
            } else {
              _tmpNativeScript = _cursor.getString(_cursorIndexOfNativeScript);
            }
            final String _tmpSocialBarScript;
            if (_cursor.isNull(_cursorIndexOfSocialBarScript)) {
              _tmpSocialBarScript = null;
            } else {
              _tmpSocialBarScript = _cursor.getString(_cursorIndexOfSocialBarScript);
            }
            final String _tmpPopunderScript;
            if (_cursor.isNull(_cursorIndexOfPopunderScript)) {
              _tmpPopunderScript = null;
            } else {
              _tmpPopunderScript = _cursor.getString(_cursorIndexOfPopunderScript);
            }
            _item = new CachedAdConfig(_tmpId,_tmpNetworkName,_tmpIsEnabled,_tmpVerificationCode,_tmpHeaderScript,_tmpFooterScript,_tmpBannerScript,_tmpNativeScript,_tmpSocialBarScript,_tmpPopunderScript);
            _result.add(_item);
          }
          return _result;
        } finally {
          _cursor.close();
        }
      }

      @Override
      protected void finalize() {
        _statement.release();
      }
    });
  }

  @NonNull
  public static List<Class<?>> getRequiredConverters() {
    return Collections.emptyList();
  }
}
