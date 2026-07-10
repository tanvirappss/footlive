import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Helper to slugify a string
const slugify = (text: string) =>
  text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w\-]+/g, '') // Remove all non-word chars
    .replace(/\-\-+/g, '-') // Replace multiple - with single -
    .replace(/^-+/, '') // Trim - from start of text
    .replace(/-+$/, ''); // Trim - from end of text

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
    const fetchCricket = tickerSettings?.auto_fetch_cricket || false;

    if (!fetchFootball && !fetchCricket) {
      return NextResponse.json({ message: 'Auto-sync is disabled for both football and cricket in settings.' });
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
          const matchTime = matchTimestamp.toISOString().split('T')[1].split('.')[0]; // HH:MM:SS
          
          const homeName = match.teams?.home?.name;
          const awayName = match.teams?.away?.name;
          
          if (!homeName || !awayName) continue;

          // Check if match already exists by team names and date
          // To be safe, we check for a match with same custom home team name and date
          const { data: existingMatches, error: existingError } = await supabase
            .from('matches')
            .select('id, status')
            .eq('home_team_custom_name', homeName)
            .eq('away_team_custom_name', awayName)
            .eq('match_date', matchDate)
            .limit(1);

          let matchId = '';

          if (existingMatches && existingMatches.length > 0) {
            matchId = existingMatches[0].id;
            syncLog.push(`Match ${homeName} vs ${awayName} already exists (${matchId}).`);
          } else {
            // Determine status based on time
            const now = new Date();
            const timeDiff = matchTimestamp.getTime() - now.getTime();
            let status = 'upcoming';
            if (timeDiff <= 0 && timeDiff > -7200000) {
              // Started within last 2 hours
              status = 'live';
            } else if (timeDiff <= -7200000) {
              status = 'finished';
            }

            // Insert new match
            const { data: newMatch, error: insertError } = await supabase
              .from('matches')
              .insert([{
                home_team_custom_name: homeName,
                away_team_custom_name: awayName,
                home_team_custom_logo: match.teams?.home?.badge ? `https://streamed.pk${match.teams.home.badge}` : null,
                away_team_custom_logo: match.teams?.away?.badge ? `https://streamed.pk${match.teams.away.badge}` : null,
                tournament_name: category === 'cricket' ? 'Cricket Match' : 'Football Match',
                match_date: matchDate,
                match_time: matchTime,
                match_timestamp: matchTimestamp.toISOString(),
                stadium_name: 'TBD',
                status: status,
              }])
              .select()
              .single();

            if (insertError) {
              syncLog.push(`Error inserting match ${homeName} vs ${awayName}: ${insertError.message}`);
              continue;
            }

            matchId = newMatch.id;
            syncLog.push(`Created match ${homeName} vs ${awayName} (${matchId}).`);
          }

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
