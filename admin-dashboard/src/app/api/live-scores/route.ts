import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// In-memory cache for ESPN scores
let scoreCache: { data: any; timestamp: number } | null = null;
const CACHE_DURATION_MS = 3 * 60 * 1000; // 3 minutes cache

// Team name normalization map: maps various spellings to a canonical lowercase key
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
  const lower = name.trim().toLowerCase();
  // Check aliases
  for (const [canonical, aliases] of Object.entries(teamNameAliases)) {
    if (lower === canonical || aliases.includes(lower)) {
      return canonical;
    }
  }
  return lower;
}

interface MatchScore {
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  homeScorers: string;
  awayScorers: string;
  status: 'pre' | 'in' | 'post';
  matchDate: string; // ISO date string
  liveMinute: string;
  espnEventId: string;
}

async function fetchESPNScores(dateStr?: string): Promise<MatchScore[]> {
  const url = dateStr
    ? `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=${dateStr}`
    : `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?limit=100`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`ESPN API returned ${res.status}`);
    }

    const data = await res.json();
    const results: MatchScore[] = [];

    for (const event of data.events || []) {
      const comp = event.competitions?.[0];
      if (!comp) continue;

      const homeComp = comp.competitors?.find((c: any) => c.homeAway === 'home');
      const awayComp = comp.competitors?.find((c: any) => c.homeAway === 'away');
      if (!homeComp || !awayComp) continue;

      const homeTeam = homeComp.team?.displayName || homeComp.team?.name || '';
      const awayTeam = awayComp.team?.displayName || awayComp.team?.name || '';
      const homeScore = parseInt(homeComp.score || '0', 10);
      const awayScore = parseInt(awayComp.score || '0', 10);
      const status = comp.status?.type?.state as 'pre' | 'in' | 'post';
      const liveMinute = comp.status?.displayClock || comp.status?.type?.shortDetail || '';
      const espnEventId = event.id || '';

      let homeScorers = '';
      let awayScorers = '';

      if (espnEventId && (status === 'in' || status === 'post')) {
        try {
          const summaryRes = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/summary?event=${espnEventId}`, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            }
          });
          if (summaryRes.ok) {
            const summaryData = await summaryRes.json();
            const goals = (summaryData.keyEvents || []).filter((e: any) => e.scoringPlay || e.type?.text?.toLowerCase().includes('goal'));
            
            const hGoals: { player: string; minute: string }[] = [];
            const aGoals: { player: string; minute: string }[] = [];

            for (const goal of goals) {
              // Extract name of scorer
              let scorer = goal.participants?.[0]?.athlete?.displayName;
              if (!scorer && goal.text) {
                const match = goal.text.match(/Goal!\s+[^.]+\.\s+([^(\n]+)/);
                if (match) scorer = match[1].trim();
              }
              if (!scorer) scorer = 'Unknown Player';
              
              const minute = goal.clock?.displayValue || '';
              
              const gTeamId = String(goal.team?.id || '');
              const hId = String(homeComp.id || homeComp.team?.id || '');
              const aId = String(awayComp.id || awayComp.team?.id || '');
              
              if (gTeamId === hId) {
                hGoals.push({ player: scorer, minute });
              } else if (gTeamId === aId) {
                aGoals.push({ player: scorer, minute });
              } else {
                // Fallback to text matching
                const textLower = (goal.text || '').toLowerCase();
                if (textLower.includes(homeTeam.toLowerCase())) {
                  hGoals.push({ player: scorer, minute });
                } else {
                  aGoals.push({ player: scorer, minute });
                }
              }
            }
            
            const formatScorers = (goalsList: { player: string; minute: string }[]) => {
              const grouped: Record<string, string[]> = {};
              for (const g of goalsList) {
                if (!grouped[g.player]) grouped[g.player] = [];
                grouped[g.player].push(g.minute);
              }
              return Object.entries(grouped)
                .map(([player, mins]) => `${player} (${mins.join(', ')})`)
                .join(', ');
            };

            homeScorers = formatScorers(hGoals);
            awayScorers = formatScorers(aGoals);
          }
        } catch (err) {
          console.error(`Failed to fetch summary for event ${espnEventId}:`, err);
        }
      }

      if (!homeScorers && !awayScorers) {
        // Fallback to scoreboard details
        const details = comp.details || [];
        const homeGoals: { player: string; minute: string }[] = [];
        const awayGoals: { player: string; minute: string }[] = [];

        for (const detail of details) {
          if (detail.type?.text === 'Goal') {
            const player = detail.athletesInvolved?.[0]?.displayName || 'Unknown';
            const minute = detail.clock?.displayValue || '';
            const teamId = detail.team?.id;

            if (teamId === homeComp.id || teamId === homeComp.team?.id) {
              homeGoals.push({ player, minute });
            } else if (teamId === awayComp.id || teamId === awayComp.team?.id) {
              awayGoals.push({ player, minute });
            } else {
              const detailText = (detail.text || '').toLowerCase();
              if (detailText.includes(homeTeam.toLowerCase())) {
                homeGoals.push({ player, minute });
              } else {
                awayGoals.push({ player, minute });
              }
            }
          }
        }

        const formatScorersFallback = (goalsList: { player: string; minute: string }[]) => {
          const grouped: Record<string, string[]> = {};
          for (const g of goalsList) {
            if (!grouped[g.player]) grouped[g.player] = [];
            grouped[g.player].push(g.minute);
          }
          return Object.entries(grouped)
            .map(([player, mins]) => `${player} (${mins.join(', ')})`)
            .join(', ');
        };

        homeScorers = formatScorersFallback(homeGoals);
        awayScorers = formatScorersFallback(awayGoals);
      }

      results.push({
        homeTeam,
        awayTeam,
        homeScore,
        awayScore,
        homeScorers,
        awayScorers,
        status,
        matchDate: event.date || comp.date || '',
        liveMinute,
        espnEventId,
      });
    }

    return results;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date'); // Optional: YYYYMMDD format
    const allDates = searchParams.get('all') === 'true'; // Fetch multiple days

    let allScores: MatchScore[] = [];

    if (allDates) {
      // Fetch scores for every day of the tournament so far
      const now = new Date();
      const tournamentStart = new Date('2026-06-11');
      const dates: string[] = [];

      for (let d = new Date(tournamentStart); d <= now; d.setDate(d.getDate() + 1)) {
        const yr = d.getFullYear();
        const mo = String(d.getMonth() + 1).padStart(2, '0');
        const dy = String(d.getDate()).padStart(2, '0');
        dates.push(`${yr}${mo}${dy}`);
      }

      // Use cache if available and fresh
      if (scoreCache && (Date.now() - scoreCache.timestamp < CACHE_DURATION_MS)) {
        return NextResponse.json({ success: true, scores: scoreCache.data, cached: true });
      }

      // Fetch all dates in parallel (with a small batch to avoid rate limits)
      const batchSize = 4;
      for (let i = 0; i < dates.length; i += batchSize) {
        const batch = dates.slice(i, i + batchSize);
        const results = await Promise.allSettled(
          batch.map(d => fetchESPNScores(d))
        );
        for (const r of results) {
          if (r.status === 'fulfilled') {
            allScores.push(...r.value);
          }
        }
      }

      // Cache the results
      scoreCache = { data: allScores, timestamp: Date.now() };
    } else if (dateParam) {
      allScores = await fetchESPNScores(dateParam);
    } else {
      // Default: fetch today's scores
      const now = new Date();
      const todayStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
      allScores = await fetchESPNScores(todayStr);
    }

    return NextResponse.json({ success: true, scores: allScores });
  } catch (err: any) {
    console.error('Live Scores API Error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Failed to fetch live scores' }, { status: 500 });
  }
}
