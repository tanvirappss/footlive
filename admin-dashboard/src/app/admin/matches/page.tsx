'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import AdminLayout from '@/components/AdminLayout';
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  Check, 
  X, 
  Upload, 
  Loader2, 
  Calendar as CalendarIcon, 
  Info,
  Tv,
  Zap,
  Sparkles,
  Clock
} from 'lucide-react';
import { wc2026Schedule, getStadiumForTeam } from '@/lib/wc2026-schedule';
import { syncLiveMatchScores } from '@/lib/auto-score-updater';

interface Team {
  id: string;
  name: string;
  short_name: string;
  flag_url: string;
  logo_url: string;
  is_enabled: boolean;
}

interface Match {
  id: string;
  home_team_id: string | null;
  away_team_id: string | null;
  home_team_custom_name: string | null;
  home_team_custom_flag: string | null;
  home_team_custom_logo: string | null;
  away_team_custom_name: string | null;
  away_team_custom_flag: string | null;
  away_team_custom_logo: string | null;
  tournament_name: string;
  match_date: string;
  match_time: string;
  match_timestamp: string;
  stadium_name: string;
  status: string;
  home_score: number;
  away_score: number;
  home_scorers?: string | null;
  away_scorers?: string | null;
  live_minute?: string | null;
  banner_url: string | null;
  description: string | null;
  home_team?: Team;
  away_team?: Team;
}

const standardStadiums = [
  'MetLife Stadium (New York/New Jersey)',
  'SoFi Stadium (Los Angeles)',
  'AT&T Stadium (Dallas)',
  'Arrowhead Stadium (Kansas City)',
  'Mercedes-Benz Stadium (Atlanta)',
  'Lincoln Financial Field (Philadelphia)',
  'Lumen Field (Seattle)',
  'Levi\'s Stadium (San Francisco)',
  'Gillette Stadium (Boston)',
  'NRG Stadium (Houston)',
  'Hard Rock Stadium (Miami)',
  'Estadio Azteca (Mexico City)',
  'Estadio BBVA (Monterrey)',
  'Estadio Akron (Guadalajara)',
  'BC Place (Vancouver)',
  'BMO Field (Toronto)'
];

export default function MatchesPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);

  // Form states
  const [tournamentName, setTournamentName] = useState('FIFA World Cup 2026');
  const [homeTeamType, setHomeTeamType] = useState<'existing' | 'custom'>('existing');
  const [awayTeamType, setAwayTeamType] = useState<'existing' | 'custom'>('existing');
  
  const [homeTeamId, setHomeTeamId] = useState('');
  const [awayTeamId, setAwayTeamId] = useState('');
  
  const [homeCustomName, setHomeCustomName] = useState('');
  const [homeCustomFlagUrl, setHomeCustomFlagUrl] = useState('');
  
  const [awayCustomName, setAwayCustomName] = useState('');
  const [awayCustomFlagUrl, setAwayCustomFlagUrl] = useState('');

  const [matchDate, setMatchDate] = useState('');
  const [matchTime, setMatchTime] = useState('');
  const [stadiumName, setStadiumName] = useState('');
  const [selectedStadiumSelect, setSelectedStadiumSelect] = useState('custom');
  const [status, setStatus] = useState('upcoming');
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [homeScorers, setHomeScorers] = useState('');
  const [awayScorers, setAwayScorers] = useState('');
  const [autoUpdateScores, setAutoUpdateScores] = useState(true);
  const [description, setDescription] = useState('');
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);

  // SystemConfig States
  const [systemConfigId, setSystemConfigId] = useState<string | null>(null);
  const [forceAllLive, setForceAllLive] = useState(false);
  const [autoScheduleEnabled, setAutoScheduleEnabled] = useState(false);
  const [autoPopulateDefaultStreams, setAutoPopulateDefaultStreams] = useState(true);
  const [matchDurationHours, setMatchDurationHours] = useState(1);
  const [matchDurationMinutes, setMatchDurationMinutes] = useState(45);
  const [matchLiveBeforeMinutes, setMatchLiveBeforeMinutes] = useState(10);
  const [autoFinishEnabled, setAutoFinishEnabled] = useState(true);
  const [populating, setPopulating] = useState(false);
  const [populateSuccess, setPopulateSuccess] = useState<string | null>(null);

  // Queries
  const { data: teams = [] } = useQuery<Team[]>({
    queryKey: ['teams'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .eq('is_enabled', true)
        .order('name', { ascending: true });
      if (error) throw error;
      return data || [];
    }
  });

  const { data: matches = [], isLoading } = useQuery<Match[]>({
    queryKey: ['matches-admin'],
    queryFn: async () => {
      // Get matches along with home/away team details
      const { data, error } = await supabase
        .from('matches')
        .select(`
          *,
          home_team:teams!matches_home_team_id_fkey(*),
          away_team:teams!matches_away_team_id_fkey(*)
        `)
        .order('match_timestamp', { ascending: false });
      if (error) throw error;
      return (data || []) as Match[];
    }
  });

  // SystemConfig queries & mutations
  const { data: systemConfig } = useQuery({
    queryKey: ['system-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ad_networks')
        .select('*')
        .eq('network_name', 'SystemConfig')
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        // Create default SystemConfig
        const { data: created, error: createError } = await supabase
          .from('ad_networks')
          .insert([{
            network_name: 'SystemConfig',
            is_enabled: true,
            custom_scripts: {
              force_all_live: false,
              auto_schedule_enabled: false,
              auto_populate_default_streams: true
            }
          }])
          .select()
          .single();
        if (!createError && created) {
          return created;
        }
      }
      return data;
    }
  });

  React.useEffect(() => {
    if (systemConfig) {
      setSystemConfigId(systemConfig.id);
      setForceAllLive(!!systemConfig.custom_scripts?.force_all_live);
      setAutoScheduleEnabled(!!systemConfig.custom_scripts?.auto_schedule_enabled);
      setAutoPopulateDefaultStreams(systemConfig.custom_scripts?.auto_populate_default_streams !== false);
      setMatchDurationHours(systemConfig.custom_scripts?.match_duration_hours !== undefined ? systemConfig.custom_scripts.match_duration_hours : 1);
      setMatchDurationMinutes(systemConfig.custom_scripts?.match_duration_minutes !== undefined ? systemConfig.custom_scripts.match_duration_minutes : 45);
      setMatchLiveBeforeMinutes(systemConfig.custom_scripts?.match_live_before_minutes !== undefined ? systemConfig.custom_scripts.match_live_before_minutes : 10);
      setAutoFinishEnabled(systemConfig.custom_scripts?.auto_finish_enabled !== false);
      setAutoUpdateScores(systemConfig.custom_scripts?.auto_update_scores !== false);
    }
  }, [systemConfig]);

  const updateSystemConfigMutation = useMutation({
    mutationFn: async (updatedScripts: any) => {
      const existingScripts = systemConfig?.custom_scripts || {};
      const mergedScripts = {
        ...existingScripts,
        ...updatedScripts
      };

      if (systemConfigId) {
        const { error } = await supabase
          .from('ad_networks')
          .update({
            custom_scripts: mergedScripts
          })
          .eq('id', systemConfigId);
        if (error) throw error;
      } else {
        const { data: created, error } = await supabase
          .from('ad_networks')
          .insert([{
            network_name: 'SystemConfig',
            is_enabled: true,
            custom_scripts: mergedScripts
          }])
          .select()
          .single();
        if (error) throw error;
        if (created) setSystemConfigId(created.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-config'] });
    }
  });

  const handleToggleForceAllLive = () => {
    const nextVal = !forceAllLive;
    setForceAllLive(nextVal);
    updateSystemConfigMutation.mutate({
      force_all_live: nextVal,
      auto_schedule_enabled: autoScheduleEnabled,
      auto_populate_default_streams: autoPopulateDefaultStreams
    });
  };

  const handleToggleAutoSchedule = () => {
    const nextVal = !autoScheduleEnabled;
    setAutoScheduleEnabled(nextVal);
    updateSystemConfigMutation.mutate({
      force_all_live: forceAllLive,
      auto_schedule_enabled: nextVal,
      auto_populate_default_streams: autoPopulateDefaultStreams
    });
  };

  const handleToggleAutoPopulateDefaultStreams = () => {
    const nextVal = !autoPopulateDefaultStreams;
    setAutoPopulateDefaultStreams(nextVal);
    updateSystemConfigMutation.mutate({
      force_all_live: forceAllLive,
      auto_schedule_enabled: autoScheduleEnabled,
      auto_populate_default_streams: nextVal
    });
  };

  const handleSaveLifecycleSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateSystemConfigMutation.mutate({
      match_duration_hours: matchDurationHours,
      match_duration_minutes: matchDurationMinutes,
      match_live_before_minutes: matchLiveBeforeMinutes,
      auto_finish_enabled: autoFinishEnabled,
      auto_update_scores: autoUpdateScores
    });
    alert('Match lifecycle settings saved successfully!');
  };

  const handleBulkPopulate = async () => {
    setPopulating(true);
    setPopulateSuccess(null);
    setMutationError(null);

    try {
      // 1. Fetch current teams
      const { data: dbTeams, error: teamsError } = await supabase
        .from('teams')
        .select('*');
      if (teamsError) throw teamsError;

      const teamsList = dbTeams || [];

      // Fetch default streams if auto-populating
      let defaultStreamsList: any[] = [];
      if (autoPopulateDefaultStreams) {
        const { data: tickerData } = await supabase
          .from('ticker_settings')
          .select('default_streams')
          .limit(1)
          .maybeSingle();
        if (tickerData && Array.isArray(tickerData.default_streams)) {
          defaultStreamsList = tickerData.default_streams;
        }
      }

      // Helper to find team by name
      const findTeamByName = (name: string) => {
        const normalized = name.toLowerCase().trim();
        return teamsList.find(t => {
          const tName = t.name.toLowerCase().trim();
          if (tName === normalized) return true;
          // Aliases
          if (normalized === 'usa' && tName === 'united states') return true;
          if (normalized === 'united states' && tName === 'usa') return true;
          if (normalized === 'turkey' && tName === 'türkiye') return true;
          if (normalized === 'türkiye' && tName === 'turkey') return true;
          if (normalized === 'cape verde' && tName === 'cabo verde') return true;
          if (normalized === 'cabo verde' && tName === 'cape verde') return true;
          return false;
        });
      };

      // 2. Fetch current matches
      const { data: dbMatches, error: matchesError } = await supabase
        .from('matches')
        .select('*');
      if (matchesError) throw matchesError;

      const matchesList = dbMatches || [];

      let insertedCount = 0;
      let skippedCount = 0;

      // 3. Country code map
      const countryCodeMap: Record<string, { code: string; region: string; short: string }> = {
        'iraq': { code: 'iq', region: 'AFC', short: 'IRQ' },
        'norway': { code: 'no', region: 'UEFA', short: 'NOR' },
        'jordan': { code: 'jo', region: 'AFC', short: 'JOR' },
        'dr congo': { code: 'cd', region: 'CAF', short: 'COD' },
        'uzbekistan': { code: 'uz', region: 'AFC', short: 'UZB' },
        'haiti': { code: 'ht', region: 'CONCACAF', short: 'HAI' },
        'usa': { code: 'us', region: 'CONCACAF', short: 'USA' },
        'united states': { code: 'us', region: 'CONCACAF', short: 'USA' },
        'turkey': { code: 'tr', region: 'UEFA', short: 'TUR' },
        'türkiye': { code: 'tr', region: 'UEFA', short: 'TUR' },
        'cape verde': { code: 'cv', region: 'CAF', short: 'CPV' },
        'cabo verde': { code: 'cv', region: 'CAF', short: 'CPV' },
      };

      for (const m of wc2026Schedule) {
        // Resolve home team
        let homeTeam = findTeamByName(m.home_team);
        if (!homeTeam) {
          const normHome = m.home_team.toLowerCase();
          const mapInfo = countryCodeMap[normHome] || { code: 'XX', region: 'Custom', short: m.home_team.substring(0, 3).toUpperCase() };
          const flagUrl = mapInfo.code !== 'XX' ? `https://flagcdn.com/w320/${mapInfo.code}.png` : null;
          
          const newTeam = {
            name: m.home_team,
            short_name: mapInfo.short,
            country_name: m.home_team,
            country_code: mapInfo.code.toUpperCase(),
            flag_url: flagUrl,
            logo_url: flagUrl,
            region: mapInfo.region,
            is_enabled: true
          };

          const { data: created, error } = await supabase
            .from('teams')
            .insert([newTeam])
            .select()
            .single();

          if (error) throw error;
          homeTeam = created;
          teamsList.push(created);
        }

        // Resolve away team
        let awayTeam = findTeamByName(m.away_team);
        if (!awayTeam) {
          const normAway = m.away_team.toLowerCase();
          const mapInfo = countryCodeMap[normAway] || { code: 'XX', region: 'Custom', short: m.away_team.substring(0, 3).toUpperCase() };
          const flagUrl = mapInfo.code !== 'XX' ? `https://flagcdn.com/w320/${mapInfo.code}.png` : null;

          const newTeam = {
            name: m.away_team,
            short_name: mapInfo.short,
            country_name: m.away_team,
            country_code: mapInfo.code.toUpperCase(),
            flag_url: flagUrl,
            logo_url: flagUrl,
            region: mapInfo.region,
            is_enabled: true
          };

          const { data: created, error } = await supabase
            .from('teams')
            .insert([newTeam])
            .select()
            .single();

          if (error) throw error;
          awayTeam = created;
          teamsList.push(created);
        }

        // Check if match already exists
        const timestampString = new Date(`${m.match_date}T${m.match_time}:00+06:00`).toISOString();
        const duplicate = matchesList.find(dm => {
          const homeMatch = dm.home_team_id === homeTeam?.id;
          const awayMatch = dm.away_team_id === awayTeam?.id;
          const timeMatch = dm.match_date === m.match_date;
          return homeMatch && awayMatch && timeMatch;
        });

        if (duplicate) {
          skippedCount++;
          continue;
        }

        // Insert Match
        const matchData = {
          tournament_name: m.tournament_name,
          home_team_id: homeTeam.id,
          away_team_id: awayTeam.id,
          match_date: m.match_date,
          match_time: `${m.match_time}:00`,
          match_timestamp: timestampString,
          stadium_name: getStadiumForTeam(m.tournament_name),
          status: 'upcoming',
          home_score: 0,
          away_score: 0,
          description: `FIFA World Cup 2026 Group Stage match between ${m.home_team} and ${m.away_team}.`
        };

        const { data: createdMatch, error: insertMatchError } = await supabase
          .from('matches')
          .insert([matchData])
          .select()
          .single();

        if (insertMatchError) throw insertMatchError;

        // Auto-create stream record
        if (createdMatch) {
          const streamData = {
            match_id: createdMatch.id,
            stream_name: 'Main Server',
            primary_url: autoPopulateDefaultStreams ? (defaultStreamsList[0]?.url || '') : '',
            backup_url_1: autoPopulateDefaultStreams ? (defaultStreamsList[1]?.url || null) : null,
            backup_url_2: autoPopulateDefaultStreams ? (defaultStreamsList[2]?.url || null) : null,
            backup_url_3: autoPopulateDefaultStreams ? (defaultStreamsList[3]?.url || null) : null,
            is_enabled: true,
            urls: autoPopulateDefaultStreams ? defaultStreamsList : []
          };
          const { error: streamError } = await supabase
            .from('streams')
            .insert([streamData]);
          if (streamError) console.error('Auto stream creation failed:', streamError);
        }

        insertedCount++;
      }

      setPopulateSuccess(`Successfully populated ${insertedCount} matches! (Skipped ${skippedCount} duplicates)`);
      queryClient.invalidateQueries({ queryKey: ['matches-admin'] });
      queryClient.invalidateQueries({ queryKey: ['teams'] });
    } catch (err: any) {
      setMutationError(err.message || 'An error occurred during auto-population.');
    } finally {
      setPopulating(false);
    }
  };

  const handleClearAutoScheduled = async () => {
    if (!confirm('Are you sure you want to clear all auto-scheduled WC 2026 matches starting from June 15?')) return;
    setPopulating(true);
    setPopulateSuccess(null);
    setMutationError(null);

    try {
      const { error } = await supabase
        .from('matches')
        .delete()
        .like('tournament_name', 'FIFA WORLD CUP 2026, GROUP-%')
        .gte('match_date', '2026-06-15');

      if (error) throw error;
      setPopulateSuccess('Successfully cleared auto-scheduled matches!');
      queryClient.invalidateQueries({ queryKey: ['matches-admin'] });
    } catch (err: any) {
      setMutationError(err.message || 'An error occurred during clearing.');
    } finally {
      setPopulating(false);
    }
  };

  // Run once when matches and teams load to clean up any legacy custom teams in existing matches
  React.useEffect(() => {
    if (matches.length > 0 && teams.length > 0) {
      const migrateLegacyCustomTeams = async () => {
        const legacyMatches = matches.filter(
          m => m.home_team_custom_name || m.away_team_custom_name
        );

        if (legacyMatches.length === 0) return;

        let migratedAny = false;

        for (const match of legacyMatches) {
          const updatedFields: any = {};

          if (match.home_team_custom_name) {
            const customName = match.home_team_custom_name.trim();
            // Check if team already exists in teams list (case-insensitive)
            let team = teams.find(t => t.name.toLowerCase() === customName.toLowerCase());
            let teamId = team?.id;

            if (!teamId) {
              // Create it
              const { data: created, error } = await supabase
                .from('teams')
                .insert([{
                  name: customName,
                  short_name: customName.substring(0, 3).toUpperCase(),
                  country_name: customName,
                  country_code: 'XX',
                  flag_url: match.home_team_custom_flag || null,
                  logo_url: match.home_team_custom_flag || null,
                  region: 'Custom',
                  is_enabled: true
                }])
                .select('id')
                .single();

              if (!error && created) {
                teamId = created.id;
              }
            }

            if (teamId) {
              updatedFields.home_team_id = teamId;
              updatedFields.home_team_custom_name = null;
              updatedFields.home_team_custom_flag = null;
              updatedFields.home_team_custom_logo = null;
            }
          }

          if (match.away_team_custom_name) {
            const customName = match.away_team_custom_name.trim();
            // Check if team already exists in teams list (case-insensitive)
            let team = teams.find(t => t.name.toLowerCase() === customName.toLowerCase());
            let teamId = team?.id;

            if (!teamId) {
              // Create it
              const { data: created, error } = await supabase
                .from('teams')
                .insert([{
                  name: customName,
                  short_name: customName.substring(0, 3).toUpperCase(),
                  country_name: customName,
                  country_code: 'XX',
                  flag_url: match.away_team_custom_flag || null,
                  logo_url: match.away_team_custom_flag || null,
                  region: 'Custom',
                  is_enabled: true
                }])
                .select('id')
                .single();

              if (!error && created) {
                teamId = created.id;
              }
            }

            if (teamId) {
              updatedFields.away_team_id = teamId;
              updatedFields.away_team_custom_name = null;
              updatedFields.away_team_custom_flag = null;
              updatedFields.away_team_custom_logo = null;
            }
          }

          if (Object.keys(updatedFields).length > 0) {
            const { error } = await supabase
              .from('matches')
              .update(updatedFields)
              .eq('id', match.id);
            if (!error) {
              migratedAny = true;
            }
          }
        }

        if (migratedAny) {
          queryClient.invalidateQueries({ queryKey: ['matches-admin'] });
          queryClient.invalidateQueries({ queryKey: ['teams'] });
        }
      };

      migrateLegacyCustomTeams();
    }
  }, [matches, teams, queryClient]);

  // Auto-finish matches that have been playing for more than configured duration
  React.useEffect(() => {
    const autoFinishEnabledVal = systemConfig?.custom_scripts?.auto_finish_enabled !== false;
    if (!autoFinishEnabledVal) return;

    if (matches.length > 0) {
      const autoFinishOldMatches = async () => {
        const now = Date.now();
        const durationMins = matchDurationHours * 60 + matchDurationMinutes;
        const matchDuration = durationMins * 60 * 1000;
        const matchesToFinish = matches.filter(m => {
          if (m.status === 'finished' || m.status === 'cancelled' || m.status === 'postponed') return false;
          const kickoff = new Date(m.match_timestamp).getTime();
          return now >= (kickoff + matchDuration);
        });

        if (matchesToFinish.length > 0) {
          let updatedAny = false;
          for (const m of matchesToFinish) {
            const { error } = await supabase
              .from('matches')
              .update({ status: 'finished' })
              .eq('id', m.id);
            if (!error) updatedAny = true;
          }
          if (updatedAny) {
            queryClient.invalidateQueries({ queryKey: ['matches-admin'] });
          }
        }
      };

      autoFinishOldMatches();
    }
  }, [matches, systemConfig, matchDurationHours, matchDurationMinutes, queryClient]);

  // Auto-Update score and goals for active/live matches
  React.useEffect(() => {
    if (matches.length > 0 && systemConfig) {
      syncLiveMatchScores(supabase, matches, systemConfig).then((updated) => {
        if (updated) {
          queryClient.invalidateQueries({ queryKey: ['matches-admin'] });
        }
      });
    }
  }, [matches, systemConfig, queryClient]);

  const handleAddClick = () => {
    setEditingMatch(null);
    setTournamentName('FIFA World Cup 2026');
    setHomeTeamType('existing');
    setAwayTeamType('existing');
    setHomeTeamId(teams[0]?.id || '');
    setAwayTeamId(teams[1]?.id || '');
    setHomeCustomName('');
    setHomeCustomFlagUrl('');
    setAwayCustomName('');
    setAwayCustomFlagUrl('');
    // Default today's date/time
    const now = new Date();
    setMatchDate(now.toISOString().split('T')[0]);
    setMatchTime(now.toTimeString().split(' ')[0].substring(0, 5));
    setSelectedStadiumSelect('MetLife Stadium (New York/New Jersey)');
    setStadiumName('MetLife Stadium (New York/New Jersey)');
    setStatus('upcoming');
    setHomeScore(0);
    setAwayScore(0);
    setHomeScorers('');
    setAwayScorers('');
    setDescription('');
    setBannerFile(null);
    setMutationError(null);
    setIsModalOpen(true);
  };

  const handleEditClick = (match: Match) => {
    setEditingMatch(match);
    setTournamentName(match.tournament_name);
    setHomeTeamType(match.home_team_id ? 'existing' : 'custom');
    setAwayTeamType(match.away_team_id ? 'existing' : 'custom');
    setHomeTeamId(match.home_team_id || '');
    setAwayTeamId(match.away_team_id || '');
    setHomeCustomName(match.home_team_custom_name || '');
    setHomeCustomFlagUrl(match.home_team_custom_flag || '');
    setAwayCustomName(match.away_team_custom_name || '');
    setAwayCustomFlagUrl(match.away_team_custom_flag || '');
    setMatchDate(match.match_date);
    setMatchTime(match.match_time.substring(0, 5));
    setHomeScorers(match.home_scorers || '');
    setAwayScorers(match.away_scorers || '');
    setStadiumName(match.stadium_name);
    
    const isStandard = standardStadiums.includes(match.stadium_name);
    if (isStandard) {
      setSelectedStadiumSelect(match.stadium_name);
    } else {
      setSelectedStadiumSelect('custom');
    }

    setStatus(match.status);
    setHomeScore(match.home_score);
    setAwayScore(match.away_score);
    setDescription(match.description || '');
    setBannerFile(null);
    setMutationError(null);
    setIsModalOpen(true);
  };

  // Image Upload helper
  const uploadBanner = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_banner_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `banners/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('teams')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from('teams').getPublicUrl(filePath);
    return data.publicUrl;
  };

  // Create or Update Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      setUploading(true);
      let bannerUrl = editingMatch?.banner_url || '';

      if (bannerFile) {
        bannerUrl = await uploadBanner(bannerFile);
      }

      // Combine Date + Time to ISO string for timestamptz in Bangladesh Time (GMT+6)
      const timestampString = new Date(`${matchDate}T${matchTime}:00+06:00`).toISOString();

      // Resolve Home Team
      let resolvedHomeTeamId = null;
      if (homeTeamType === 'custom' && homeCustomName.trim()) {
        const customName = homeCustomName.trim();
        const { data: existingTeam, error: searchError } = await supabase
          .from('teams')
          .select('id')
          .eq('name', customName)
          .maybeSingle();

        if (searchError) throw searchError;

        if (existingTeam) {
          resolvedHomeTeamId = existingTeam.id;
        } else {
          const newTeamData = {
            name: customName,
            short_name: customName.substring(0, 3).toUpperCase(),
            country_name: customName,
            country_code: 'XX',
            flag_url: homeCustomFlagUrl.trim() || null,
            logo_url: homeCustomFlagUrl.trim() || null,
            region: 'Custom',
            is_enabled: true
          };
          const { data: createdTeam, error: insertError } = await supabase
            .from('teams')
            .insert([newTeamData])
            .select('id')
            .single();

          if (insertError) throw insertError;
          resolvedHomeTeamId = createdTeam.id;
        }
      } else if (homeTeamType === 'existing') {
        resolvedHomeTeamId = homeTeamId || null;
      }

      // Resolve Away Team
      let resolvedAwayTeamId = null;
      if (awayTeamType === 'custom' && awayCustomName.trim()) {
        const customName = awayCustomName.trim();
        const { data: existingTeam, error: searchError } = await supabase
          .from('teams')
          .select('id')
          .eq('name', customName)
          .maybeSingle();

        if (searchError) throw searchError;

        if (existingTeam) {
          resolvedAwayTeamId = existingTeam.id;
        } else {
          const newTeamData = {
            name: customName,
            short_name: customName.substring(0, 3).toUpperCase(),
            country_name: customName,
            country_code: 'XX',
            flag_url: awayCustomFlagUrl.trim() || null,
            logo_url: awayCustomFlagUrl.trim() || null,
            region: 'Custom',
            is_enabled: true
          };
          const { data: createdTeam, error: insertError } = await supabase
            .from('teams')
            .insert([newTeamData])
            .select('id')
            .single();

          if (insertError) throw insertError;
          resolvedAwayTeamId = createdTeam.id;
        }
      } else if (awayTeamType === 'existing') {
        resolvedAwayTeamId = awayTeamId || null;
      }

      const matchData = {
        tournament_name: tournamentName,
        home_team_id: resolvedHomeTeamId,
        away_team_id: resolvedAwayTeamId,
        home_team_custom_name: null,
        home_team_custom_flag: null,
        home_team_custom_logo: null,
        away_team_custom_name: null,
        away_team_custom_flag: null,
        away_team_custom_logo: null,
        match_date: matchDate,
        match_time: `${matchTime}:00`,
        match_timestamp: timestampString,
        stadium_name: stadiumName,
        status,
        home_score: Number(homeScore),
        away_score: Number(awayScore),
        home_scorers: homeScorers || null,
        away_scorers: awayScorers || null,
        banner_url: bannerUrl || null,
        description: description || null
      };

      if (editingMatch) {
        const { error } = await supabase
          .from('matches')
          .update(matchData)
          .eq('id', editingMatch.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('matches')
          .insert([matchData])
          .select()
          .single();
        if (error) throw error;

        // Auto-create stream record in the streams table for immediate configuration
        if (data) {
          const { error: streamError } = await supabase
            .from('streams')
            .insert([{
              match_id: data.id,
              stream_name: 'Main Server',
              primary_url: '',
              backup_url_1: '',
              backup_url_2: '',
              backup_url_3: '',
              is_enabled: true,
              urls: []
            }]);
          if (streamError) console.error('Auto stream creation failed:', streamError);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matches-admin'] });
      setIsModalOpen(false);
      setUploading(false);
    },
    onError: (err: any) => {
      setMutationError(err.message);
      setUploading(false);
    }
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('matches')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matches-admin'] });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate();
  };

  const getTeamName = (match: Match, side: 'home' | 'away') => {
    if (side === 'home') {
      return match.home_team_id ? (match.home_team?.name || 'Loading...') : (match.home_team_custom_name || 'Custom Home');
    } else {
      return match.away_team_id ? (match.away_team?.name || 'Loading...') : (match.away_team_custom_name || 'Custom Away');
    }
  };

  const getTeamFlag = (match: Match, side: 'home' | 'away') => {
    if (side === 'home') {
      return match.home_team_id ? match.home_team?.flag_url : match.home_team_custom_flag;
    } else {
      return match.away_team_id ? match.away_team?.flag_url : match.away_team_custom_flag;
    }
  };

  const filteredMatches = matches.filter((match) => {
    const homeName = getTeamName(match, 'home').toLowerCase();
    const awayName = getTeamName(match, 'away').toLowerCase();
    const query = searchTerm.toLowerCase();
    return homeName.includes(query) || awayName.includes(query) || match.stadium_name.toLowerCase().includes(query);
  });

  // Helper to insert markdown elements into the description textarea
  const insertText = (before: string, after: string) => {
    const textarea = document.getElementById('desc-textarea') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selected = text.substring(start, end);
    const replacement = before + (selected || 'text') + after;

    setDescription(text.substring(0, start) + replacement + text.substring(end));
    
    // Focus back
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + (selected || 'text').length);
    }, 50);
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-white uppercase tracking-tight">Match Center</h1>
            <p className="text-slate-400 text-sm mt-1">Schedule matches, manage statuses, and configure previews.</p>
          </div>
          <button
            onClick={handleAddClick}
            className="flex items-center gap-2 px-5 py-3 bg-emerald-accent hover:bg-emerald-500 text-black font-extrabold uppercase text-xs tracking-wider rounded-xl transition-all duration-200 cursor-pointer shadow-lg shadow-emerald-500/10"
          >
            <Plus className="h-4.5 w-4.5" />
            Schedule Match
          </button>
        </div>

        {/* System & Populate Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Force All Live Toggle Card */}
          <div className="glass-panel p-6 rounded-3xl border border-card-border flex flex-col justify-between gap-4 bg-slate-900/10 hover:border-slate-800 transition-all duration-200">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2">
                  <Zap className={`h-5 w-5 ${forceAllLive ? 'text-amber-400 fill-amber-400/20' : 'text-slate-500'}`} />
                  <span className="text-sm font-extrabold text-white uppercase tracking-wider">⚡ Force All Live Now</span>
                </div>
                <p className="text-xs text-slate-400 mt-2 font-medium">
                  Forces all scheduled upcoming matches to immediately appear in the user-facing "Live Now" tab, bypassing time constraints.
                </p>
              </div>
              <button
                type="button"
                onClick={handleToggleForceAllLive}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  forceAllLive ? 'bg-amber-500' : 'bg-slate-800'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    forceAllLive ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-950/40 border border-slate-900 rounded-xl text-[10px] text-slate-400 font-semibold">
              <Info className="h-3.5 w-3.5 text-slate-500 shrink-0" />
              <span>Status: {forceAllLive ? 'ACTIVE (ALL LIVE)' : 'NORMAL OPERATION'}</span>
            </div>
          </div>

          {/* Auto Schedule Settings Card */}
          <div className="glass-panel p-6 rounded-3xl border border-card-border flex flex-col justify-between gap-4 bg-slate-900/10 hover:border-slate-800 transition-all duration-200">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2">
                  <CalendarIcon className={`h-5 w-5 ${autoScheduleEnabled ? 'text-emerald-400' : 'text-slate-500'}`} />
                  <span className="text-sm font-extrabold text-white uppercase tracking-wider">📅 Auto-Schedule WC 2026</span>
                </div>
                <p className="text-xs text-slate-400 mt-2 font-medium">
                  Enable auto-scheduled World Cup matches (June 15-28) in Bangladesh Time (BST).
                </p>
              </div>
              <button
                type="button"
                onClick={handleToggleAutoSchedule}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  autoScheduleEnabled ? 'bg-emerald-500' : 'bg-slate-800'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    autoScheduleEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {autoScheduleEnabled && (
              <div className="space-y-4 border-t border-slate-900/60 pt-4 mt-2">
                <div className="flex justify-between items-center bg-slate-950/20 border border-slate-900/60 p-3 rounded-2xl">
                  <div>
                    <span className="text-xs font-extrabold text-white uppercase tracking-wider block">🔗 Auto-Populate Streams</span>
                    <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
                      Automatically link 'Default m3u8 Stream Links' when creating auto-scheduled matches.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleAutoPopulateDefaultStreams}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      autoPopulateDefaultStreams ? 'bg-emerald-500' : 'bg-slate-800'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        autoPopulateDefaultStreams ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
                
                <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-900/40">
                  <button
                    type="button"
                    disabled={populating}
                    onClick={handleBulkPopulate}
                    className="flex items-center gap-1.5 px-3 py-2 bg-emerald-accent hover:bg-emerald-500 text-black font-extrabold uppercase text-[10px] tracking-wider rounded-xl transition-all duration-150 cursor-pointer disabled:opacity-50"
                  >
                    {populating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                    Populate Fixtures
                  </button>
                  <button
                    type="button"
                    disabled={populating}
                    onClick={handleClearAutoScheduled}
                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-950 border border-slate-850 hover:bg-red-950/20 hover:border-red-500/30 text-slate-400 hover:text-red-400 font-extrabold uppercase text-[10px] tracking-wider rounded-xl transition-all duration-150 cursor-pointer disabled:opacity-50"
                  >
                    Clear Auto-Scheduled
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Match Lifecycle Settings Card */}
          <div className="glass-panel p-6 rounded-3xl border border-card-border flex flex-col justify-between gap-4 bg-slate-900/10 hover:border-slate-800 transition-all duration-200">
            <div>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-emerald-400" />
                <span className="text-sm font-extrabold text-white uppercase tracking-wider">⏱️ Match Lifecycle Settings</span>
              </div>
              <p className="text-xs text-slate-400 mt-2 font-medium">
                Set how long matches remain active before moving to Finished, and when upcoming matches go Live.
              </p>

              <form onSubmit={handleSaveLifecycleSettings} className="space-y-3 mt-4">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wide block">Duration Hours</label>
                    <input
                      type="number"
                      min="0"
                      max="12"
                      value={matchDurationHours}
                      onChange={(e) => setMatchDurationHours(parseInt(e.target.value) || 0)}
                      className="w-full bg-slate-950 border border-card-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-accent"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wide block">Duration Mins</label>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={matchDurationMinutes}
                      onChange={(e) => setMatchDurationMinutes(parseInt(e.target.value) || 0)}
                      className="w-full bg-slate-950 border border-card-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-accent"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wide block">Live offset before kickoff (Mins)</label>
                  <input
                    type="number"
                    min="0"
                    max="180"
                    value={matchLiveBeforeMinutes}
                    onChange={(e) => setMatchLiveBeforeMinutes(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-card-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-accent"
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-950/60 border border-slate-900 rounded-xl my-2">
                  <div>
                    <span className="text-[10px] font-extrabold text-white uppercase tracking-wider block">🏁 Auto-Finish Matches</span>
                    <span className="text-[9px] text-slate-500 block">Move matches to Finished when duration ends</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAutoFinishEnabled(!autoFinishEnabled)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      autoFinishEnabled ? 'bg-emerald-500' : 'bg-slate-800'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        autoFinishEnabled ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-950/60 border border-slate-900 rounded-xl my-2">
                  <div>
                    <span className="text-[10px] font-extrabold text-white uppercase tracking-wider block">⚽ Auto-Update Scores</span>
                    <span className="text-[9px] text-slate-500 block">Auto update match scores and scorers in real-time</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAutoUpdateScores(!autoUpdateScores)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      autoUpdateScores ? 'bg-emerald-500' : 'bg-slate-800'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        autoUpdateScores ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={updateSystemConfigMutation.isPending}
                  className="w-full py-2 bg-emerald-accent hover:bg-emerald-500 text-black text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-md"
                >
                  {updateSystemConfigMutation.isPending ? 'Saving...' : 'Save Durations'}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Feedback alerts for auto-populate actions */}
        {(populateSuccess || mutationError) && (
          <div className="space-y-4">
            {populateSuccess && (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-bold rounded-2xl flex items-center gap-2">
                <Check className="h-5 w-5" />
                {populateSuccess}
              </div>
            )}
            {mutationError && (
              <div className="p-4 bg-red-950/20 border border-red-500/25 text-red-400 text-sm font-bold rounded-2xl">
                {mutationError}
              </div>
            )}
          </div>
        )}

        {/* Filter bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
          <input
            type="text"
            placeholder="Search matches by home team, away team, stadium..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 glass-input rounded-xl text-sm"
          />
        </div>

        {/* Matches Grid */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <Loader2 className="h-8 w-8 text-emerald-accent animate-spin" />
            <p className="text-slate-400 text-sm mt-4">Loading matches schedule...</p>
          </div>
        ) : filteredMatches.length === 0 ? (
          <div className="glass-panel p-12 text-center rounded-2xl border border-card-border">
            <CalendarIcon className="h-12 w-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white uppercase">No Scheduled Matches</h3>
            <p className="text-slate-400 text-sm mt-1">Add details of upcoming fixtures to populate the system.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {filteredMatches.map((match) => {
              const homeFlag = getTeamFlag(match, 'home');
              const awayFlag = getTeamFlag(match, 'away');
              const homeName = getTeamName(match, 'home');
              const awayName = getTeamName(match, 'away');
              
              const isLive = match.status === 'live' || match.status === 'half_time';
              const isFinished = match.status === 'finished';

              return (
                <div 
                  key={match.id} 
                  className={`glass-panel p-6 rounded-3xl border border-card-border flex flex-col justify-between gap-6 hover:border-slate-700 transition-all duration-200`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="px-2 py-0.5 bg-slate-800 rounded-md text-[9px] uppercase tracking-wider text-slate-300 font-bold border border-slate-700">
                        {match.tournament_name}
                      </span>
                      <p className="text-slate-500 text-xs mt-1.5 font-bold uppercase tracking-wide">🏟️ {match.stadium_name}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider ${
                        isLive 
                          ? 'bg-red-500/15 text-red-400 border border-red-500/20 animate-pulse'
                          : isFinished 
                            ? 'bg-slate-800 text-slate-400 border border-slate-700'
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}>
                        {isLive ? `LIVE ${match.live_minute ? `• ${match.live_minute}` : ''}` : match.status}
                      </span>
                    </div>
                  </div>

                  {/* Versus Display */}
                  <div className="flex items-center justify-between py-2 text-center gap-1.5">
                    {/* Home Team */}
                    <div className="flex flex-col items-center gap-2 w-[38%] shrink-0 min-w-0">
                      <div className="h-12 w-18 bg-slate-900/60 rounded-xl overflow-hidden border border-card-border flex items-center justify-center shadow">
                        {homeFlag ? (
                          <img src={homeFlag} alt={homeName} className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-slate-500 text-sm font-bold">HOME</span>
                        )}
                      </div>
                      <span className="font-extrabold text-white text-sm line-clamp-1 w-full">{homeName}</span>
                    </div>

                    {/* Score or VS */}
                    <div className="w-[24%] shrink-0 flex flex-col items-center justify-center">
                      {(isLive || isFinished) ? (
                        <div className="flex items-center gap-1.5 whitespace-nowrap">
                          <span className="text-2xl font-black text-white">{match.home_score}</span>
                          <span className="text-slate-600 font-bold">-</span>
                          <span className="text-2xl font-black text-white">{match.away_score}</span>
                        </div>
                      ) : (
                        <span className="text-slate-500 text-xs font-black uppercase bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800/80 whitespace-nowrap">VS</span>
                      )}
                    </div>

                    {/* Away Team */}
                    <div className="flex flex-col items-center gap-2 w-[38%] shrink-0 min-w-0">
                      <div className="h-12 w-18 bg-slate-900/60 rounded-xl overflow-hidden border border-card-border flex items-center justify-center shadow">
                        {awayFlag ? (
                          <img src={awayFlag} alt={awayName} className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-slate-500 text-sm font-bold">AWAY</span>
                        )}
                      </div>
                      <span className="font-extrabold text-white text-sm line-clamp-1 w-full">{awayName}</span>
                    </div>
                  </div>

                  {/* Goal Scorers details */}
                  {(match.home_scorers || match.away_scorers) && (
                    <div className="text-[10px] text-slate-400 bg-slate-950/40 p-2 rounded-xl border border-slate-900/50 flex justify-between gap-2 mt-1 mb-2">
                      <div className="w-[45%] text-left text-slate-300 font-medium break-words">
                        {match.home_scorers || ""}
                      </div>
                      <div className="w-[10%] text-center text-slate-500 font-bold">⚽</div>
                      <div className="w-[45%] text-right text-slate-300 font-medium break-words">
                        {match.away_scorers || ""}
                      </div>
                    </div>
                  )}

                  {/* Footer Stats and Actions */}
                  <div className="flex justify-between items-center border-t border-card-border pt-4 text-xs">
                    <span className="text-slate-400 font-bold">
                      📅 {match.match_date} • ⏰ {match.match_time.substring(0, 5)}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEditClick(match)}
                        title="Edit Details"
                        className="p-2 rounded-xl border border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white transition-all cursor-pointer"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Delete this match and all its streaming configurations?')) {
                            deleteMutation.mutate(match.id);
                          }
                        }}
                        title="Delete Match"
                        className="p-2 rounded-xl border border-slate-800 text-slate-400 hover:border-red-500/25 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Create/Edit Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="w-full max-w-2xl glass-panel p-8 rounded-3xl space-y-6 my-8">
              <div className="flex justify-between items-center pb-4 border-b border-card-border">
                <h3 className="text-xl font-extrabold text-white uppercase">
                  {editingMatch ? 'Modify Match Config' : 'Schedule Match Event'}
                </h3>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {mutationError && (
                  <div className="p-4 bg-red-950/20 border border-red-500/25 rounded-2xl text-red-400 text-sm">
                    {mutationError}
                  </div>
                )}

                {/* Tournament & Stadium */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Tournament / League</label>
                    <input
                      type="text"
                      required
                      value={tournamentName}
                      onChange={(e) => setTournamentName(e.target.value)}
                      className="w-full px-4 py-3 glass-input rounded-xl text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Stadium Name</label>
                    <select
                      value={selectedStadiumSelect}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedStadiumSelect(val);
                        if (val !== 'custom') {
                          setStadiumName(val);
                        } else {
                          setStadiumName('');
                        }
                      }}
                      className="w-full px-4 py-3 glass-input rounded-xl text-sm appearance-none cursor-pointer mb-2"
                    >
                      <option value="" disabled>-- Select Stadium --</option>
                      {standardStadiums.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                      <option value="custom">✍️ Manually Enter Custom Stadium</option>
                    </select>

                    {selectedStadiumSelect === 'custom' && (
                      <input
                        type="text"
                        required
                        value={stadiumName}
                        onChange={(e) => setStadiumName(e.target.value)}
                        placeholder="Type stadium name manually..."
                        className="w-full px-4 py-3 glass-input rounded-xl text-sm animate-fadeIn"
                      />
                    )}
                  </div>
                </div>

                {/* Date & Time & Status */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Kickoff Date</label>
                    <input
                      type="date"
                      required
                      value={matchDate}
                      onChange={(e) => setMatchDate(e.target.value)}
                      className="w-full px-4 py-3 glass-input rounded-xl text-sm cursor-pointer"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Kickoff Time</label>
                    <input
                      type="time"
                      required
                      value={matchTime}
                      onChange={(e) => setMatchTime(e.target.value)}
                      className="w-full px-4 py-3 glass-input rounded-xl text-sm cursor-pointer"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Event Status</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full px-4 py-3 glass-input rounded-xl text-sm appearance-none cursor-pointer"
                    >
                      <option value="upcoming">Upcoming</option>
                      <option value="live">Live</option>
                      <option value="half_time">Half Time</option>
                      <option value="finished">Finished</option>
                      <option value="postponed">Postponed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>

                {/* Home Team Config */}
                <div className="p-4 bg-slate-900/40 border border-card-border rounded-2xl space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-white uppercase tracking-wider">🏠 Home Team Details</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setHomeTeamType('existing')}
                        className={`px-3 py-1 text-[10px] font-bold uppercase rounded-md cursor-pointer ${
                          homeTeamType === 'existing' ? 'bg-emerald-accent text-black' : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        Select Nation
                      </button>
                      <button
                        type="button"
                        onClick={() => setHomeTeamType('custom')}
                        className={`px-3 py-1 text-[10px] font-bold uppercase rounded-md cursor-pointer ${
                          homeTeamType === 'custom' ? 'bg-emerald-accent text-black' : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        Custom Team
                      </button>
                    </div>
                  </div>

                  {homeTeamType === 'existing' ? (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Select Team</label>
                      <select
                        value={homeTeamId}
                        onChange={(e) => setHomeTeamId(e.target.value)}
                        className="w-full px-4 py-3 glass-input rounded-xl text-sm appearance-none cursor-pointer"
                      >
                        <option value="" disabled>-- Choose a Team --</option>
                        {teams.map((t) => (
                          <option key={t.id} value={t.id}>{t.name} ({t.short_name})</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Custom Team Name</label>
                        <input
                          type="text"
                          required={homeTeamType === 'custom'}
                          value={homeCustomName}
                          onChange={(e) => setHomeCustomName(e.target.value)}
                          placeholder="e.g. Manchester City"
                          className="w-full px-4 py-3 glass-input rounded-xl text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Custom Flag URL</label>
                        <input
                          type="text"
                          required={homeTeamType === 'custom'}
                          value={homeCustomFlagUrl}
                          onChange={(e) => setHomeCustomFlagUrl(e.target.value)}
                          placeholder="e.g. https://domain.com/flag.png"
                          className="w-full px-4 py-3 glass-input rounded-xl text-sm"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Away Team Config */}
                <div className="p-4 bg-slate-900/40 border border-card-border rounded-2xl space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-white uppercase tracking-wider">✈️ Away Team Details</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setAwayTeamType('existing')}
                        className={`px-3 py-1 text-[10px] font-bold uppercase rounded-md cursor-pointer ${
                          awayTeamType === 'existing' ? 'bg-emerald-accent text-black' : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        Select Nation
                      </button>
                      <button
                        type="button"
                        onClick={() => setAwayTeamType('custom')}
                        className={`px-3 py-1 text-[10px] font-bold uppercase rounded-md cursor-pointer ${
                          awayTeamType === 'custom' ? 'bg-emerald-accent text-black' : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        Custom Team
                      </button>
                    </div>
                  </div>

                  {awayTeamType === 'existing' ? (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Select Team</label>
                      <select
                        value={awayTeamId}
                        onChange={(e) => setAwayTeamId(e.target.value)}
                        className="w-full px-4 py-3 glass-input rounded-xl text-sm appearance-none cursor-pointer"
                      >
                        <option value="" disabled>-- Choose a Team --</option>
                        {teams.map((t) => (
                          <option key={t.id} value={t.id}>{t.name} ({t.short_name})</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Custom Team Name</label>
                        <input
                          type="text"
                          required={awayTeamType === 'custom'}
                          value={awayCustomName}
                          onChange={(e) => setAwayCustomName(e.target.value)}
                          placeholder="e.g. Real Madrid"
                          className="w-full px-4 py-3 glass-input rounded-xl text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Custom Flag URL</label>
                        <input
                          type="text"
                          required={awayTeamType === 'custom'}
                          value={awayCustomFlagUrl}
                          onChange={(e) => setAwayCustomFlagUrl(e.target.value)}
                          placeholder="e.g. https://domain.com/flag.png"
                          className="w-full px-4 py-3 glass-input rounded-xl text-sm"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Score inputs (Visible only if status is Live/Finished/Half-time) */}
                {(status === 'live' || status === 'half_time' || status === 'finished') && (
                  <div className="space-y-4 p-4 bg-slate-900/20 border border-card-border rounded-2xl">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-white uppercase tracking-wider block">Home Score</label>
                        <input
                          type="number"
                          min={0}
                          value={homeScore}
                          onChange={(e) => setHomeScore(Number(e.target.value))}
                          className="w-full px-4 py-3 glass-input rounded-xl text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-white uppercase tracking-wider block">Away Score</label>
                        <input
                          type="number"
                          min={0}
                          value={awayScore}
                          onChange={(e) => setAwayScore(Number(e.target.value))}
                          className="w-full px-4 py-3 glass-input rounded-xl text-sm"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-white uppercase tracking-wider block">Home Scorers</label>
                        <input
                          type="text"
                          value={homeScorers}
                          onChange={(e) => setHomeScorers(e.target.value)}
                          placeholder="e.g. L. Messi (12', 45')"
                          className="w-full px-4 py-3 glass-input rounded-xl text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-white uppercase tracking-wider block">Away Scorers</label>
                        <input
                          type="text"
                          value={awayScorers}
                          onChange={(e) => setAwayScorers(e.target.value)}
                          placeholder="e.g. Neymar (70')"
                          className="w-full px-4 py-3 glass-input rounded-xl text-sm"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Optional Banner URL Upload */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Optional Match Banner / Poster</label>
                  <label className="flex items-center gap-3 px-4 py-4 bg-slate-950/60 border border-dashed border-slate-800 rounded-xl cursor-pointer hover:border-slate-700 hover:bg-slate-900/50 transition-all duration-150">
                    <Upload className="h-5 w-5 text-slate-500 shrink-0" />
                    <span className="text-xs text-slate-400 font-semibold truncate">
                      {bannerFile ? bannerFile.name : 'Upload banner file (stored in Supabase Storage)'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setBannerFile(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Rich text description */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Match Preview / Description</label>
                  <div className="border border-slate-800 rounded-xl bg-slate-950/60 overflow-hidden">
                    {/* Rich text helper buttons */}
                    <div className="flex gap-2 p-2.5 bg-slate-900 border-b border-slate-800">
                      <button
                        type="button"
                        onClick={() => insertText('<strong>', '</strong>')}
                        className="px-2.5 py-1 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white rounded cursor-pointer"
                      >
                        B
                      </button>
                      <button
                        type="button"
                        onClick={() => insertText('<em>', '</em>')}
                        className="px-2.5 py-1 text-xs italic bg-slate-800 hover:bg-slate-700 text-white rounded cursor-pointer"
                      >
                        I
                      </button>
                      <button
                        type="button"
                        onClick={() => insertText('<h2>', '</h2>')}
                        className="px-2.5 py-1 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white rounded cursor-pointer"
                      >
                        H2
                      </button>
                      <button
                        type="button"
                        onClick={() => insertText('<h3>', '</h3>')}
                        className="px-2.5 py-1 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white rounded cursor-pointer"
                      >
                        H3
                      </button>
                      <button
                        type="button"
                        onClick={() => insertText('<p>', '</p>')}
                        className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-white rounded cursor-pointer"
                      >
                        P
                      </button>
                    </div>

                    <textarea
                      id="desc-textarea"
                      rows={5}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Write a brief overview, tournament status, or key matchups..."
                      className="w-full px-4 py-3 bg-transparent text-white border-0 focus:ring-0 focus:outline-none text-sm placeholder:text-slate-600 resize-y"
                    />
                  </div>
                </div>

                {/* Submit / Cancel Buttons */}
                <div className="pt-4 flex justify-end gap-3 border-t border-card-border">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-3 border border-slate-800 hover:bg-slate-800 text-slate-300 font-bold uppercase text-xs tracking-wider rounded-xl transition-all duration-150 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploading || saveMutation.isPending}
                    className="flex items-center gap-2 px-6 py-3 bg-emerald-accent hover:bg-emerald-500 text-black font-extrabold uppercase text-xs tracking-wider rounded-xl transition-all duration-150 cursor-pointer disabled:opacity-50"
                  >
                    {(uploading || saveMutation.isPending) ? (
                      <Loader2 className="h-4.5 w-4.5 animate-spin" />
                    ) : (
                      <Check className="h-4.5 w-4.5" />
                    )}
                    Save Match Event
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
