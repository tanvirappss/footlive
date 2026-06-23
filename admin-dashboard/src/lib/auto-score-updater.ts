// auto-score-updater.ts
// Deterministic real-time live score and scorer updates for FIFA World Cup 2026

import { SupabaseClient } from '@supabase/supabase-js';

// Comprehensive famous players mapping for all 48 national teams
const teamPlayersMap: { [key: string]: string[] } = {
  'United States': ['C. Pulisic', 'F. Balogun', 'T. Weah', 'W. McKennie', 'G. Reyna'],
  'Mexico': ['S. Giménez', 'H. Martín', 'U. Antuna', 'Edson Álvarez', 'L. Chávez'],
  'Canada': ['J. David', 'A. Davies', 'C. Larin', 'T. Buchanan', 'S. Eustáquio'],
  'Argentina': ['L. Messi', 'L. Martínez', 'J. Álvarez', 'Enzo Fernández', 'A. Di María'],
  'Brazil': ['Vinícius Jr', 'Rodrygo', 'Neymar Jr', 'Raphinha', 'G. Martinelli'],
  'France': ['K. Mbappé', 'A. Griezmann', 'O. Dembélé', 'M. Thuram', 'R. Kolo Muani'],
  'Germany': ['J. Musiala', 'F. Wirtz', 'K. Havertz', 'N. Füllkrug', 'L. Sané'],
  'Spain': ['Á. Morata', 'Lamine Yamal', 'Nico Williams', 'Dani Olmo', 'Pedri'],
  'Portugal': ['C. Ronaldo', 'B. Fernandes', 'R. Leão', 'J. Félix', 'B. Silva'],
  'England': ['H. Kane', 'J. Bellingham', 'B. Saka', 'P. Foden', 'C. Palmer'],
  'Netherlands': ['M. Depay', 'C. Gakpo', 'X. Simons', 'D. Malen', 'W. Weghorst'],
  'Italy': ['F. Chiesa', 'N. Barella', 'G. Scamacca', 'L. Pellegrini', 'M. Retegui'],
  'Belgium': ['R. Lukaku', 'K. De Bruyne', 'L. Trossard', 'J. Doku', 'L. Openda'],
  'Croatia': ['L. Modrić', 'A. Kramarić', 'I. Perišić', 'M. Kovačić', 'M. Pašalić'],
  'Uruguay': ['D. Núñez', 'L. Suárez', 'F. Valverde', 'F. Pellistri', 'G. De Arrascaeta'],
  'Colombia': ['L. Díaz', 'J. Rodríguez', 'R. S. Borré', 'J. Durán', 'L. Muriel'],
  'Morocco': ['Y. En-Nesyri', 'H. Ziyech', 'Brahim Díaz', 'A. El Kaabi', 'S. Boufal'],
  'Japan': ['K. Mitoma', 'T. Minamino', 'A. Ueda', 'R. Doan', 'D. Kamada'],
  'Senegal': ['Sadio Mané', 'N. Jackson', 'I. Sarr', 'B. Dia'],
  'South Korea': ['Son Heung-min', 'Hwang Hee-chan', 'Lee Kang-in', 'Cho Gue-sung'],
  'Australia': ['M. Duke', 'C. Goodwin', 'J. Irvine', 'N. Irankunda'],
  'Saudi Arabia': ['Salem Al-Dawsari', 'Firas Al-Buraikan', 'Saleh Al-Shehri'],
  'Iran': ['M. Taremi', 'S. Azmoun', 'A. Jahanbakhsh', 'S. Ghoddos'],
  'Ecuador': ['E. Valencia', 'Kendry Páez', 'J. Caicedo', 'M. Caicedo'],
  'Switzerland': ['B. Embolo', 'X. Shaqiri', 'Z. Amdouni', 'R. Vargas', 'G. Xhaka'],
  'Denmark': ['R. Højlund', 'C. Eriksen', 'J. Wind', 'P. Højbjerg', 'Y. Poulsen'],
  'Poland': ['R. Lewandowski', 'K. Świderski', 'A. Buksa', 'P. Zieliński', 'S. Szymański'],
  'Ukraine': ['A. Dovbyk', 'R. Yaremchuk', 'M. Mudryk', 'V. Tsygankov', 'O. Zinchenko'],
  'Sweden': ['A. Isak', 'V. Gyökeres', 'D. Kulusevski', 'E. Forsberg'],
  'Wales': ['B. Johnson', 'H. Wilson', 'D. James', 'K. Moore'],
  'Scotland': ['S. McTominay', 'J. McGinn', 'C. Adams', 'L. Shankland'],
  'Turkey': ['Arda Güler', 'Kenan Yıldız', 'H. Çalhanoğlu', 'B. A. Yılmaz', 'C. Tosun'],
  'Austria': ['M. Sabitzer', 'C. Baumgartner', 'M. Arnautović', 'M. Gregoritsch'],
  'Chile': ['A. Sánchez', 'E. Vargas', 'B. Brereton', 'V. Dávila'],
  'Peru': ['G. Lapadula', 'P. Guerrero', 'E. Flores', 'B. Reyna'],
  'Egypt': ['M. Salah', 'Mostafa Mohamed', 'Trezeguet', 'O. Marmoush'],
  'Nigeria': ['V. Osimhen', 'A. Lookman', 'V. Boniface', 'K. Iheanacho', 'A. Iwobi'],
  'Cameroon': ['V. Aboubakar', 'K. Toko Ekambi', 'B. Mbeumo', 'F. Magri'],
  'Ghana': ['M. Kudus', 'J. Ayew', 'I. Williams', 'A. Semenyo'],
  'Algeria': ['R. Mahrez', 'B. Bounedjah', 'A. Gouiri', 'S. Benrahma', 'H. Aouar'],
  'Tunisia': ['Y. Msakni', 'E. Achouri', 'S. Jaziri', 'W. Khazri'],
  'Costa Rica': ['J. Campbell', 'A. Contreras', 'M. Ugalde', 'A. Zamora'],
  'Jamaica': ['M. Antonio', 'L. Bailey', 'D. Gray', 'S. Nicholson'],
  'Panama': ['C. Waterman', 'J. Fajardo', 'I. Díaz', 'E. Bárcenas'],
  'New Zealand': ['Chris Wood', 'Ben Waine', 'K. Barbarouses', 'E. Just'],
  'Qatar': ['Akram Afif', 'Almoez Ali', 'H. Al-Haydos', 'Y. Abdurisag'],
  'Ivory Coast': ['S. Haller', 'S. Adingra', 'F. Kessié', 'K. Konaté', 'N. Pépé'],
  'South Africa': ['Percy Tau', 'T. Zwane', 'E. Makgopa', 'T. Mokoena']
};

const fallbackNames = ['M. Silva', 'J. Santos', 'R. Garcia', 'A. Jones', 'J. Miller', 'A. Becker', 'L. Lopez', 'P. Rossi', 'H. Schmidt', 'M. Novak'];

function getTeamPlayers(teamName: string): string[] {
  if (!teamName) return fallbackNames;
  const match = Object.keys(teamPlayersMap).find(key => 
    key.toLowerCase() === teamName.trim().toLowerCase() ||
    teamName.trim().toLowerCase().includes(key.toLowerCase())
  );
  return match ? teamPlayersMap[match] : fallbackNames;
}

export interface MatchEvent {
  minute: number;
  team: 'home' | 'away';
  player: string;
}

// Generates deterministic live events (goals) for a match based on its unique ID
export function getDeterministicMatchEvents(
  matchId: string, 
  homeTeamName: string, 
  awayTeamName: string, 
  matchDurationMins: number
) {
  // Convert UUID to a simple numeric seed
  const seed = matchId.split('-').reduce((acc, part) => acc + parseInt(part, 16), 0);
  
  // Deterministic goal count (0 to 5 goals total)
  const totalGoals = seed % 6; 
  
  let homeGoals = 0;
  let awayGoals = 0;
  if (totalGoals > 0) {
    homeGoals = (seed + 2) % (totalGoals + 1);
    awayGoals = totalGoals - homeGoals;
  }
  
  // Simple LCG pseudo-random number generator
  function pseudoRandom(s: number) {
    const x = Math.sin(s) * 10000;
    return x - Math.floor(x);
  }
  
  const events: MatchEvent[] = [];
  
  const homePlayers = getTeamPlayers(homeTeamName);
  const awayPlayers = getTeamPlayers(awayTeamName);
  
  // Home Goals
  for (let i = 0; i < homeGoals; i++) {
    const minuteSeed = seed + i * 17 + 5;
    const minute = Math.floor(pseudoRandom(minuteSeed) * (matchDurationMins - 5)) + 3; // 3 to 90+ mins
    const playerIndex = Math.floor(pseudoRandom(minuteSeed + 3) * homePlayers.length);
    events.push({
      minute,
      team: 'home',
      player: homePlayers[playerIndex]
    });
  }
  
  // Away Goals
  for (let i = 0; i < awayGoals; i++) {
    const minuteSeed = seed + i * 31 + 13;
    const minute = Math.floor(pseudoRandom(minuteSeed) * (matchDurationMins - 5)) + 3;
    const playerIndex = Math.floor(pseudoRandom(minuteSeed + 7) * awayPlayers.length);
    events.push({
      minute,
      team: 'away',
      player: awayPlayers[playerIndex]
    });
  }
  
  // Sort events chronologically by minute
  events.sort((a, b) => a.minute - b.minute);
  
  return {
    homeGoals,
    awayGoals,
    events
  };
}

// Client-triggered sync checker to verify and update the Supabase match score/scorers in real-time
export async function syncLiveMatchScores(
  supabase: SupabaseClient, 
  matches: any[], 
  systemConfig: any
) {
  const autoUpdateScores = systemConfig?.custom_scripts?.auto_update_scores !== false;
  if (!autoUpdateScores) return;

  const autoFinishEnabled = systemConfig?.custom_scripts?.auto_finish_enabled !== false;
  const liveOffsetMins = systemConfig?.custom_scripts?.match_live_before_minutes !== undefined 
    ? Number(systemConfig.custom_scripts.match_live_before_minutes) 
    : 10;
  const durationHours = systemConfig?.custom_scripts?.match_duration_hours !== undefined 
    ? Number(systemConfig.custom_scripts.match_duration_hours) 
    : 1;
  const durationMins = systemConfig?.custom_scripts?.match_duration_minutes !== undefined 
    ? Number(systemConfig.custom_scripts.match_duration_minutes) 
    : 45;
  const matchDurationMins = durationHours * 60 + durationMins;

  const now = Date.now();

  for (const match of matches) {
    const isFinishedDB = match.status === 'finished';
    const isCancelledOrPostponed = match.status === 'cancelled' || match.status === 'postponed';
    
    if (isCancelledOrPostponed) continue;

    const kickoff = new Date(match.match_timestamp).getTime();
    
    // Resolve team names
    const homeName = match.home_team_id ? (match.home_team?.name) : match.home_team_custom_name || 'Home Team';
    const awayName = match.away_team_id ? (match.away_team?.name) : match.away_team_custom_name || 'Away Team';

    // Get deterministic events for the entire match
    const { events } = getDeterministicMatchEvents(match.id, homeName, awayName, matchDurationMins);

    if (isFinishedDB) {
      // For finished matches, check if they need an initial sync (home_scorers and away_scorers are null)
      const needsSync = match.home_scorers === null && match.away_scorers === null;
      if (!needsSync) continue;

      // Calculate final scores and scorers
      const targetHomeScore = events.filter(e => e.team === 'home').length;
      const targetAwayScore = events.filter(e => e.team === 'away').length;

      const formatScorers = (team: 'home' | 'away') => {
        const teamEvents = events.filter(e => e.team === team);
        const playerGoalsMap: { [player: string]: number[] } = {};
        
        teamEvents.forEach(e => {
          if (!playerGoalsMap[e.player]) playerGoalsMap[e.player] = [];
          playerGoalsMap[e.player].push(e.minute);
        });

        return Object.keys(playerGoalsMap)
          .map(player => {
            const mins = playerGoalsMap[player].map(m => `${m}'`).join(', ');
            return `${player} (${mins})`;
          })
          .join(', ');
      };

      const targetHomeScorers = formatScorers('home') || ""; // Use empty string instead of null to mark it as synced
      const targetAwayScorers = formatScorers('away') || "";

      console.log(`AutoSync Finished Match [${homeName} vs ${awayName}]: Score -> ${targetHomeScore}-${targetAwayScore}`);
      
      supabase.from('matches').update({
        home_score: targetHomeScore,
        away_score: targetAwayScore,
        home_scorers: targetHomeScorers,
        away_scorers: targetAwayScorers
      }).eq('id', match.id).then(({ error }) => {
        if (error) {
          console.error(`AutoSync finished match failed for ${match.id}:`, error);
        }
      });
      continue;
    }

    // Check if the match is currently in its active timeline (starting from live offset before kickoff up to full duration)
    const isLiveTimeline = now >= (kickoff - liveOffsetMins * 60 * 1000);
    if (!isLiveTimeline) continue;

    // Calculate current match minute (0 to matchDurationMins)
    let elapsedMins = Math.floor((now - kickoff) / 60000);
    if (elapsedMins < 0) elapsedMins = 0; // Warmup / pre-match live state

    const isOver = elapsedMins >= matchDurationMins;

    // Resolve team names
    const homeName = match.home_team_id ? (match.home_team?.name) : match.home_team_custom_name || 'Home Team';
    const awayName = match.away_team_id ? (match.away_team?.name) : match.away_team_custom_name || 'Away Team';

    // Get deterministic events for the entire match
    const { events } = getDeterministicMatchEvents(match.id, homeName, awayName, matchDurationMins);

    // Filter events that have happened up to the current minute
    const occurredEvents = events.filter(e => e.minute <= elapsedMins);
    const targetHomeScore = occurredEvents.filter(e => e.team === 'home').length;
    const targetAwayScore = occurredEvents.filter(e => e.team === 'away').length;

    // Group scorers (e.g. "Messi 12', 45'")
    const formatScorers = (team: 'home' | 'away') => {
      const teamEvents = occurredEvents.filter(e => e.team === team);
      const playerGoalsMap: { [player: string]: number[] } = {};
      
      teamEvents.forEach(e => {
        if (!playerGoalsMap[e.player]) playerGoalsMap[e.player] = [];
        playerGoalsMap[e.player].push(e.minute);
      });

      return Object.keys(playerGoalsMap)
        .map(player => {
          const mins = playerGoalsMap[player].map(m => `${m}'`).join(', ');
          return `${player} (${mins})`;
        })
        .join(', ');
    };

    const targetHomeScorers = formatScorers('home');
    const targetAwayScorers = formatScorers('away');

    // Determine target status
    let targetStatus = match.status;
    if (isOver) {
      if (autoFinishEnabled) {
        targetStatus = 'finished';
      }
    } else {
      // Transition dynamically to live if it was upcoming
      if (match.status === 'upcoming') {
        targetStatus = 'live';
      }
      // Set to half_time between minute 45 and 55
      if (elapsedMins >= 45 && elapsedMins <= 55) {
        targetStatus = 'half_time';
      } else if (elapsedMins > 55 && match.status === 'half_time') {
        targetStatus = 'live';
      }
    }

    // Check if the current database values differ from targets
    const scoreDiffers = match.home_score !== targetHomeScore || match.away_score !== targetAwayScore;
    const scorersDiffer = (match.home_scorers || '') !== targetHomeScorers || (match.away_scorers || '') !== targetAwayScorers;
    const statusDiffers = match.status !== targetStatus;

    if (scoreDiffers || scorersDiffer || statusDiffers) {
      console.log(`AutoSync [${homeName} vs ${awayName}]: Score ${match.home_score}-${match.away_score} -> ${targetHomeScore}-${targetAwayScore}, Status: ${match.status} -> ${targetStatus}`);
      
      // Update database using non-blocking API call
      supabase.from('matches').update({
        home_score: targetHomeScore,
        away_score: targetAwayScore,
        home_scorers: targetHomeScorers || null,
        away_scorers: targetAwayScorers || null,
        status: targetStatus
      }).eq('id', match.id).then(({ error }) => {
        if (error) {
          console.error(`AutoSync failed for match ${match.id}:`, error);
        }
      });
    }
  }
}
