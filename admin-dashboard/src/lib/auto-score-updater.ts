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
}

// Client-triggered sync checker to verify and update the Supabase match score/scorers using real ESPN data
export async function syncLiveMatchScores(
  supabase: SupabaseClient, 
  matches: any[], 
  systemConfig: any
): Promise<boolean> {
  const autoUpdateScores = systemConfig?.custom_scripts?.auto_update_scores !== false;
  if (!autoUpdateScores) return false;

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

    if (scoreDiffers || scorersDiffer || statusDiffers) {
      console.log(`ESPN Sync [${homeName} vs ${awayName}]: Score ${match.home_score}-${match.away_score} → ${targetHomeScore}-${targetAwayScore}, Status: ${match.status} → ${targetStatus}`);

      const updateData: any = {
        home_score: targetHomeScore,
        away_score: targetAwayScore,
        home_scorers: targetHomeScorers || null,
        away_scorers: targetAwayScorers || null,
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
