// auto-score-updater.ts
// Real-time live score and scorer updates from ESPN for FIFA World Cup 2026

import { SupabaseClient } from '@supabase/supabase-js';

// Team name normalization for matching ESPN names to our database team names
const teamNameAliases: Record<string, string[]> = {
  'united states': ['usa', 'us', 'united states of america', 'u.s.a.'],
  'south korea': ['korea republic', 'korea', 'korea rep.', 'republic of korea'],
  'ivory coast': ["cote d'ivoire", 'côte d\'ivoire', 'cote divoire'],
  'dr congo': ['democratic republic of congo', 'congo dr', 'dem. rep. congo', 'congo'],
  'cabo verde': ['cape verde'],
  'czech republic': ['czechia'],
  'bosnia': ['bosnia and herzegovina', 'bosnia & herzegovina', 'bosnia-herzegovina'],
  'curacao': ['curaçao'],
  'turkey': ['türkiye', 'turkiye'],
};

function normalizeTeamName(name: string): string {
  if (!name) return '';
  const lower = name.trim().toLowerCase();
  // Check aliases - find canonical name
  for (const [canonical, aliases] of Object.entries(teamNameAliases)) {
    if (lower === canonical || aliases.includes(lower)) {
      return canonical;
    }
  }
  return lower;
}

function teamsMatch(dbName: string, espnName: string): boolean {
  const norm1 = normalizeTeamName(dbName);
  const norm2 = normalizeTeamName(espnName);
  if (norm1 === norm2) return true;
  // Partial match for edge cases
  if (norm1.includes(norm2) || norm2.includes(norm1)) return true;
  return false;
}

interface ESPNScore {
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  homeScorers: string;
  awayScorers: string;
  status: 'pre' | 'in' | 'post';
  matchDate: string;
  liveMinute: string;
}

// Client-triggered sync checker to verify and update the Supabase match score/scorers using real ESPN data
export async function syncLiveMatchScores(
  supabase: SupabaseClient, 
  matches: any[], 
  systemConfig: any
): Promise<boolean> {
  const autoUpdateScores = systemConfig?.custom_scripts?.auto_update_scores !== false;
  if (!autoUpdateScores) return false;

  // Run knockout scheduler sync asynchronously in the background
  try {
    syncKnockoutMatches(supabase);
  } catch (koErr) {
    console.error('Failed to sync knockout matches:', koErr);
  }

  // Only process matches that are live or finished
  const relevantMatches = matches.filter(m => 
    m.status === 'live' || m.status === 'half_time' || m.status === 'finished' ||
    m.status === 'upcoming' // upcoming might need status transition
  );
  
  if (relevantMatches.length === 0) return false;

  // Collect all unique dates from relevant matches, including +/- 1 day for timezone safety
  const dateSet = new Set<string>();
  const getFmt = (dateObj: Date) => `${dateObj.getUTCFullYear()}${String(dateObj.getUTCMonth() + 1).padStart(2, '0')}${String(dateObj.getUTCDate()).padStart(2, '0')}`;

  for (const m of relevantMatches) {
    const d = new Date(m.match_timestamp);
    
    // Exact day
    dateSet.add(getFmt(d));
    
    // Day before
    const prev = new Date(d);
    prev.setUTCDate(d.getUTCDate() - 1);
    dateSet.add(getFmt(prev));
    
    // Day after
    const next = new Date(d);
    next.setUTCDate(d.getUTCDate() + 1);
    dateSet.add(getFmt(next));
  }

  // Fetch real scores from ESPN API via our proxy route
  let espnScores: ESPNScore[] = [];
  try {
    // Fetch each date's scores
    const fetches = Array.from(dateSet).map(async (dateStr) => {
      try {
        const res = await fetch(`/api/live-scores?date=${dateStr}`);
        if (!res.ok) return [];
        const data = await res.json();
        return (data.scores || []) as ESPNScore[];
      } catch {
        return [];
      }
    });
    
    const results = await Promise.all(fetches);
    for (const r of results) {
      espnScores.push(...r);
    }
  } catch (err) {
    console.error('Failed to fetch ESPN scores:', err);
    return false;
  }

  if (espnScores.length === 0) {
    console.log('No ESPN scores available');
    return false;
  }

  const autoFinishEnabled = systemConfig?.custom_scripts?.auto_finish_enabled !== false;
  let updatedAny = false;
  const promises: PromiseLike<any>[] = [];

  for (const match of relevantMatches) {
    const isCancelledOrPostponed = match.status === 'cancelled' || match.status === 'postponed';
    if (isCancelledOrPostponed) continue;

    // Resolve team names from our database
    const homeName = match.home_team_id ? (match.home_team?.name) : match.home_team_custom_name || '';
    const awayName = match.away_team_id ? (match.away_team?.name) : match.away_team_custom_name || '';

    if (!homeName || !awayName) continue;

    // Find matching ESPN score
    const espnMatch = espnScores.find(es => {
      return (teamsMatch(homeName, es.homeTeam) && teamsMatch(awayName, es.awayTeam)) ||
             (teamsMatch(homeName, es.awayTeam) && teamsMatch(awayName, es.homeTeam));
    });

    if (!espnMatch) {
      // No ESPN data for this match - skip
      continue;
    }

    // Determine if ESPN teams are in the same order as our DB
    const isReversed = teamsMatch(homeName, espnMatch.awayTeam) && teamsMatch(awayName, espnMatch.homeTeam);

    const targetHomeScore = isReversed ? espnMatch.awayScore : espnMatch.homeScore;
    const targetAwayScore = isReversed ? espnMatch.homeScore : espnMatch.awayScore;
    const targetHomeScorers = isReversed ? espnMatch.awayScorers : espnMatch.homeScorers;
    const targetAwayScorers = isReversed ? espnMatch.homeScorers : espnMatch.awayScorers;

    // Determine target status based on ESPN data
    let targetStatus = match.status;
    if (espnMatch.status === 'post') {
      if (autoFinishEnabled || match.status === 'finished') {
        targetStatus = 'finished';
      }
    } else if (espnMatch.status === 'in') {
      if (match.status === 'upcoming' || match.status === 'live' || match.status === 'half_time') {
        targetStatus = 'live';
      }
    }
    // Don't change 'upcoming' to anything if ESPN says 'pre'

    // Check if the current database values differ from ESPN targets
    const scoreDiffers = match.home_score !== targetHomeScore || match.away_score !== targetAwayScore;
    const scorersDiffer = (match.home_scorers || '') !== targetHomeScorers || (match.away_scorers || '') !== targetAwayScorers;
    const statusDiffers = match.status !== targetStatus;
    const minuteDiffers = (match.live_minute || '') !== (espnMatch.liveMinute || '');

    if (scoreDiffers || scorersDiffer || statusDiffers || minuteDiffers) {
      console.log(`ESPN Sync [${homeName} vs ${awayName}]: Score ${match.home_score}-${match.away_score} → ${targetHomeScore}-${targetAwayScore}, Status: ${match.status} → ${targetStatus}, Minute: ${match.live_minute} → ${espnMatch.liveMinute}`);

      const updateData: any = {
        home_score: targetHomeScore,
        away_score: targetAwayScore,
        home_scorers: targetHomeScorers || null,
        away_scorers: targetAwayScorers || null,
        live_minute: espnMatch.liveMinute || null,
      };
      
      if (statusDiffers) {
        updateData.status = targetStatus;
      }

      const p = supabase.from('matches').update(updateData)
        .eq('id', match.id).then(({ error }) => {
          if (error) {
            console.error(`ESPN Sync failed for match ${match.id}:`, error);
          } else {
            updatedAny = true;
          }
        });
      promises.push(p);
    }
  }

  if (promises.length > 0) {
    await Promise.all(promises);
  }
  return updatedAny;
}

function convertToBangladeshTime(isoString: string): { matchDate: string; matchTime: string; timestampString: string } {
  const d = new Date(isoString);
  // Add 6 hours to get BDT (Bangladesh Time is UTC+6)
  const bdtOffset = 6 * 60 * 60 * 1000;
  const bdtDate = new Date(d.getTime() + bdtOffset);
  
  const yr = bdtDate.getUTCFullYear();
  const mo = String(bdtDate.getUTCMonth() + 1).padStart(2, '0');
  const dy = String(bdtDate.getUTCDate()).padStart(2, '0');
  
  const hr = String(bdtDate.getUTCHours()).padStart(2, '0');
  const min = String(bdtDate.getUTCMinutes()).padStart(2, '0');
  
  const matchDate = `${yr}-${mo}-${dy}`;
  const matchTime = `${hr}:${min}:00`;
  const timestampString = d.toISOString();
  
  return { matchDate, matchTime, timestampString };
}

function isPlaceholderTeam(name: string): boolean {
  if (!name) return true;
  const lower = name.toLowerCase();
  return lower.includes('winner') || 
         lower.includes('runner') || 
         lower.includes('tbd') || 
         lower.includes('to be decided') || 
         lower.includes('group') ||
         /^[a-z]\d+$/.test(lower);
}

function getRoundName(event: any): string {
  const noteText = event.competitions?.[0]?.notes?.[0]?.text?.toLowerCase() || '';
  if (noteText.includes('round of 16')) return 'FIFA WORLD CUP 2026, ROUND OF 16';
  if (noteText.includes('quarter')) return 'FIFA WORLD CUP 2026, QUARTER-FINALS';
  if (noteText.includes('semi')) return 'FIFA WORLD CUP 2026, SEMI-FINALS';
  if (noteText.includes('third place') || noteText.includes('3rd place')) return 'FIFA WORLD CUP 2026, THIRD PLACE PLAY-OFF';
  if (noteText.includes('final')) return 'FIFA WORLD CUP 2026, FINAL';
  
  // Fallback by date range (UTC date)
  const d = new Date(event.date);
  const day = d.getUTCDate();
  const month = d.getUTCMonth() + 1;
  
  if (month === 7) {
    if (day >= 4 && day <= 7) return 'FIFA WORLD CUP 2026, ROUND OF 16';
    if (day >= 9 && day <= 11) return 'FIFA WORLD CUP 2026, QUARTER-FINALS';
    if (day >= 14 && day <= 15) return 'FIFA WORLD CUP 2026, SEMI-FINALS';
    if (day === 18) return 'FIFA WORLD CUP 2026, THIRD PLACE PLAY-OFF';
    if (day === 19) return 'FIFA WORLD CUP 2026, FINAL';
  }
  return 'FIFA WORLD CUP 2026, KNOCKOUT STAGE';
}

async function getOrCreateTeam(supabase: SupabaseClient, espnTeam: any): Promise<string | null> {
  const name = espnTeam.displayName || espnTeam.name || '';
  if (!name) return null;

  // 1. Try to find existing team
  const { data: existing } = await supabase
    .from('teams')
    .select('id')
    .ilike('name', name)
    .maybeSingle();

  if (existing) {
    return existing.id;
  }

  const normalized = normalizeTeamName(name);
  const { data: existingAlias } = await supabase
    .from('teams')
    .select('id')
    .ilike('name', normalized)
    .maybeSingle();

  if (existingAlias) {
    return existingAlias.id;
  }

  // 2. Not found, create it dynamically
  const abbreviation = espnTeam.abbreviation || name.substring(0, 3).toUpperCase();
  const logoUrl = espnTeam.logo || null;
  
  const nameLower = name.toLowerCase();
  const countryCodeMap: Record<string, string> = {
    'argentina': 'ar', 'brazil': 'br', 'france': 'fr', 'germany': 'de',
    'spain': 'es', 'england': 'gb-eng', 'portugal': 'pt', 'belgium': 'be',
    'netherlands': 'nl', 'italy': 'it', 'croatia': 'hr', 'uruguay': 'uy',
    'usa': 'us', 'united states': 'us', 'mexico': 'mx', 'canada': 'ca',
    'japan': 'jp', 'south korea': 'kr', 'australia': 'au', 'morocco': 'ma',
    'senegal': 'sn', 'ecuador': 'ec', 'switzerland': 'ch', 'colombia': 'co',
    'ghana': 'gh', 'chile': 'cl', 'turkey': 'tr', 'türkiye': 'tr',
    'saudi arabia': 'sa', 'egypt': 'eg', 'algeria': 'dz', 'tunisia': 'tn',
    'cabo verde': 'cv', 'cape verde': 'cv', 'cote d\'ivoire': 'ci',
    'ivory coast': 'ci', 'south africa': 'za', 'sweden': 'se',
    'norway': 'no', 'iraq': 'iq', 'jordan': 'jo', 'dr congo': 'cd',
    'uzbekistan': 'uz', 'haiti': 'ht'
  };
  const flagCode = countryCodeMap[nameLower] || countryCodeMap[normalized] || null;
  const flagUrl = flagCode ? `https://flagcdn.com/w320/${flagCode}.png` : logoUrl;

  const newTeam = {
    name,
    short_name: abbreviation,
    country_name: name,
    country_code: (flagCode || 'XX').toUpperCase(),
    flag_url: flagUrl,
    logo_url: logoUrl,
    region: 'World Cup',
    is_enabled: true
  };

  const { data: created, error } = await supabase
    .from('teams')
    .insert([newTeam])
    .select('id')
    .single();

  if (error) {
    console.error('Failed to auto-create team:', error);
    return null;
  }
  return created?.id || null;
}

export async function syncKnockoutMatches(supabase: SupabaseClient): Promise<void> {
  const isBrowser = typeof window !== 'undefined';
  const nowTime = Date.now();
  if (isBrowser) {
    const lastSyncStr = localStorage.getItem('last_knockout_sync_time');
    const lastSync = lastSyncStr ? parseInt(lastSyncStr, 10) : 0;
    if (nowTime - lastSync < 30 * 60 * 1000) {
      // Rate-limited to once every 30 minutes
      return;
    }
    localStorage.setItem('last_knockout_sync_time', String(nowTime));
  }

  try {
    // Generate dates: 10-day sliding window from today (constrained within knockout dates June 28 - July 20)
    const start = new Date();
    const minDate = new Date('2026-06-28');
    const maxDate = new Date('2026-07-20');
    const current = start < minDate ? minDate : (start > maxDate ? maxDate : start);
    
    const knockoutDates: string[] = [];
    for (let i = 0; i < 10; i++) {
      const d = new Date(current);
      d.setDate(current.getDate() + i);
      if (d > maxDate) break;
      
      const yr = d.getFullYear();
      const mo = String(d.getMonth() + 1).padStart(2, '0');
      const dy = String(d.getDate()).padStart(2, '0');
      knockoutDates.push(`${yr}${mo}${dy}`);
    }

    if (knockoutDates.length === 0) return;

    // Fetch dates in parallel
    const fetches = knockoutDates.map(async (dateStr) => {
      try {
        const res = await fetch(`/api/live-scores?date=${dateStr}`);
        if (!res.ok) return [];
        const data = await res.json();
        return data.scores || [];
      } catch {
        return [];
      }
    });

    const results = await Promise.all(fetches);
    const espnEvents: any[] = [];
    for (const r of results) {
      espnEvents.push(...r);
    }

    if (espnEvents.length === 0) return;

    // Fetch default stream template config
    const { data: tickerData } = await supabase
      .from('ticker_settings')
      .select('default_streams')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    const defaultStreamsList = Array.isArray(tickerData?.default_streams) ? tickerData.default_streams : [];

    for (const event of espnEvents) {
      const homeTeamName = event.homeTeam || '';
      const awayTeamName = event.awayTeam || '';
      
      // Only process when both teams are decided (no placeholder names like TBD or Winner of Match 50)
      if (isPlaceholderTeam(homeTeamName) || isPlaceholderTeam(awayTeamName)) {
        continue;
      }

      const homeId = await getOrCreateTeam(supabase, { displayName: homeTeamName });
      const awayId = await getOrCreateTeam(supabase, { displayName: awayTeamName });

      if (!homeId || !awayId) continue;

      // Check if match already exists by team IDs
      const { data: possibleMatches } = await supabase
        .from('matches')
        .select('*')
        .or(`home_team_id.eq.${homeId},away_team_id.eq.${homeId}`);

      const existingMatch = possibleMatches?.find(m => 
        (m.home_team_id === homeId && m.away_team_id === awayId) ||
        (m.home_team_id === awayId && m.away_team_id === homeId)
      );

      const bdt = convertToBangladeshTime(event.matchDate);

      if (existingMatch) {
        // Match exists, update date/time if changed
        const dateDiffers = existingMatch.match_date !== bdt.matchDate;
        const timeDiffers = existingMatch.match_time.substring(0, 5) !== bdt.matchTime.substring(0, 5);
        
        if (dateDiffers || timeDiffers) {
          await supabase
            .from('matches')
            .update({
              match_date: bdt.matchDate,
              match_time: bdt.matchTime,
              match_timestamp: bdt.timestampString
            })
            .eq('id', existingMatch.id);
        }
      } else {
        // Create upcoming knockout match automatically
        const roundName = getRoundName(event);
        const matchData = {
          tournament_name: roundName,
          home_team_id: homeId,
          away_team_id: awayId,
          match_date: bdt.matchDate,
          match_time: bdt.matchTime,
          match_timestamp: bdt.timestampString,
          stadium_name: 'MetLife Stadium (New York/New Jersey)',
          status: 'upcoming',
          home_score: 0,
          away_score: 0,
          description: `FIFA World Cup 2026 match between ${homeTeamName} and ${awayTeamName}.`
        };

        const { data: createdMatch } = await supabase
          .from('matches')
          .insert([matchData])
          .select()
          .single();

        if (createdMatch && defaultStreamsList.length > 0) {
          const streamData = {
            match_id: createdMatch.id,
            stream_name: 'Main Server',
            primary_url: defaultStreamsList[0]?.url || '',
            backup_url_1: defaultStreamsList[1]?.url || null,
            backup_url_2: defaultStreamsList[2]?.url || null,
            backup_url_3: defaultStreamsList[3]?.url || null,
            is_enabled: true,
            urls: defaultStreamsList
          };
          await supabase.from('streams').insert([streamData]);
        }
      }
    }
  } catch (err) {
    console.error('syncKnockoutMatches failed:', err);
  }
}
