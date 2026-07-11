import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';


export const dynamic = 'force-dynamic';

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
  for (const [canonical, aliases] of Object.entries(teamNameAliases)) {
    if (lower === canonical || aliases.includes(lower)) {
      return canonical;
    }
  }
  return lower;
}

function teamsMatch(dbName: string | null | undefined, apiName: string | null | undefined): boolean {
  if (!dbName || !apiName) return false;
  const norm1 = normalizeTeamName(dbName);
  const norm2 = normalizeTeamName(apiName);
  if (norm1 === norm2) return true;
  if (norm1.includes(norm2) || norm2.includes(norm1)) return true;
  return false;
}

export async function GET(request: Request) {
  try {
    // 1. Check if sync is enabled
    const { data: tickerSettings, error: tickerError } = await supabase
      .from('ticker_settings')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (tickerError && tickerError.code !== 'PGRST116') {
      console.error('Error fetching ticker settings:', tickerError);
      return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
    }

    const fetchFootball = tickerSettings?.auto_fetch_football || false;
    const fetchFootballAll = tickerSettings?.auto_fetch_football_all || false;
    const fetchCricket = tickerSettings?.auto_fetch_cricket || false;

    if (!fetchFootball && !fetchCricket) {
      return NextResponse.json({ message: 'Auto-sync is disabled for both football and cricket in settings.' });
    }

    // 2. Fetch all matches from the database to map them
    const { data: dbMatches, error: dbMatchesError } = await supabase
      .from('matches')
      .select(`
        id,
        match_date,
        home_team_custom_name,
        away_team_custom_name,
        home_team_id,
        away_team_id,
        home_team:home_team_id (name),
        away_team:away_team_id (name)
      `);

    if (dbMatchesError) {
      console.error('Error fetching db matches:', dbMatchesError);
      return NextResponse.json({ error: 'Failed to fetch database matches' }, { status: 500 });
    }

    const syncLog: string[] = [];
    const categories = [];
    if (fetchFootball) categories.push('football');
    if (fetchCricket) categories.push('cricket');

    for (const category of categories) {
      try {
        syncLog.push(`Fetching ${category} matches from API...`);
        const response = await fetch(`https://streamed.pk/api/matches/${category}`);
        if (!response.ok) {
          throw new Error(`API returned ${response.status} for ${category}`);
        }
        
        const matches = await response.json();
        syncLog.push(`Found ${matches.length} matches for ${category}.`);

        for (const match of matches) {
          // Parse timestamp (it's in ms)
          const matchTimestamp = new Date(match.date);
          const matchDate = matchTimestamp.toISOString().split('T')[0];
          
          const homeName = match.teams?.home?.name;
          const awayName = match.teams?.away?.name;
          
          if (!homeName || !awayName) continue;

          // Find matching match in our database
          const dbMatch = dbMatches?.find(dbM => {
            const dbHome = (dbM.home_team as any)?.name || dbM.home_team_custom_name;
            const dbAway = (dbM.away_team as any)?.name || dbM.away_team_custom_name;
            
            const homeMatches = teamsMatch(dbHome, homeName);
            const awayMatches = teamsMatch(dbAway, awayName);
            
            if (!homeMatches || !awayMatches) return false;
            
            // Check date proximity (within 2 days)
            const d1 = new Date(dbM.match_date);
            const d2 = new Date(matchDate);
            const diffDays = Math.abs(d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24);
            return diffDays <= 2;
          });

          if (!dbMatch) {
            syncLog.push(`Skipped ${homeName} vs ${awayName} (No matching World Cup match in DB).`);
            continue;
          }

          const matchId = dbMatch.id;
          syncLog.push(`Mapped ${homeName} vs ${awayName} to DB Match ID: ${matchId}`);

          // Process streams
          if (match.sources && match.sources.length > 0) {
            for (const source of match.sources) {
              try {
                // We fetch stream details from API
                const streamResponse = await fetch(`https://streamed.pk/api/stream/${source.source}/${source.id}`);
                if (!streamResponse.ok) continue;
                
                const streamsData = await streamResponse.json();
                
                // Group streams by streamNo or just take all embeds
                for (const streamItem of streamsData) {
                  const embedUrl = streamItem.embedUrl;
                  if (!embedUrl) continue;

                  // Check if this stream URL already exists for this match
                  const { data: existingStreams, error: streamSearchError } = await supabase
                    .from('streams')
                    .select('id')
                    .eq('match_id', matchId)
                    .eq('primary_url', embedUrl)
                    .limit(1);

                  if (!existingStreams || existingStreams.length === 0) {
                    const lang = streamItem.language || 'English';
                    const isHd = streamItem.hd ? ' HD' : '';
                    const streamName = `${source.source.toUpperCase()} ${lang}${isHd} [${streamItem.streamNo}]`;

                    const { error: insertStreamError } = await supabase
                      .from('streams')
                      .insert([{
                        match_id: matchId,
                        stream_name: streamName,
                        primary_url: embedUrl,
                        is_enabled: true
                      }]);
                    
                    if (insertStreamError) {
                      syncLog.push(`Failed to add stream ${streamName}: ${insertStreamError.message}`);
                    } else {
                      syncLog.push(`Added stream ${streamName} for match ${matchId}`);
                    }
                  }
                }
              } catch (streamError: any) {
                syncLog.push(`Error fetching streams for ${source.id}: ${streamError.message}`);
              }
            }
          }
        }
      } catch (err: any) {
        syncLog.push(`Failed to process ${category}: ${err.message}`);
      }
    }

    return NextResponse.json({ message: 'Sync complete', log: syncLog });
  } catch (error: any) {
    console.error('Error in sync-matches cron:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


