import { NextResponse } from 'next/server';

export const runtime = 'edge';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('event');

    if (!eventId) {
      return NextResponse.json({ success: false, error: 'Missing event parameter' }, { status: 400 });
    }

    const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/summary?event=${eventId}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        cache: 'no-store'
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`ESPN summary API returned ${res.status}`);
      }

      const data = await res.json();
      
      // Extract keyEvents with rich data for notifications
      const keyEvents = (data.keyEvents || []).map((e: any, idx: number) => {
        const typeText = e.type?.text || '';
        const eventText = e.text || '';
        const typeLower = typeText.toLowerCase();
        const textLower = eventText.toLowerCase();
        
        // Comprehensive event type detection
        const isScoringPlay = e.scoringPlay === true;
        const isGoalType = typeLower.includes('goal') || typeLower.includes('penalty - scored');
        const isGoalText = textLower.includes('goal!') || textLower.includes('scores') || textLower.includes('penalty - Loss');
        const isGoal = isScoringPlay || isGoalType || isGoalText;
        
        const isYellowCard = typeLower.includes('yellow card') || typeLower.includes('booking') || textLower.includes('yellow card');
        const isRedCard = typeLower.includes('red card') || typeLower.includes('sending off') || typeLower.includes('dismissal') || textLower.includes('red card') || textLower.includes('sent off');
        const isCard = isYellowCard || isRedCard;
        
        const isFoul = typeLower.includes('foul') || textLower.includes('foul');
        const isSubstitution = typeLower.includes('substitution') || textLower.includes('substitution');
        const isPenaltyMissed = typeLower.includes('penalty - missed') || typeLower.includes('penalty - saved') || textLower.includes('penalty miss');
        
        // Determine normalized event category
        let category = 'other';
        if (isGoal) category = 'goal';
        else if (isRedCard) category = 'red_card';
        else if (isYellowCard) category = 'yellow_card';
        else if (isCard) category = 'card';
        else if (isPenaltyMissed) category = 'penalty_missed';
        else if (isFoul) category = 'foul';
        else if (isSubstitution) category = 'substitution';
        
        // Extract player name
        let playerName = '';
        if (e.participants?.[0]?.athlete?.displayName) {
          playerName = e.participants[0].athlete.displayName;
        } else if (eventText) {
          const goalMatch = eventText.match(/Goal!\s+[^.]+\.\s+([^(\n]+)/);
          const cardMatch = eventText.match(/(?:Yellow|Red)\s+Card[^.]*\.\s*([^(\n.]+)/i);
          if (goalMatch) playerName = goalMatch[1].trim();
          else if (cardMatch) playerName = cardMatch[1].trim();
        }
        
        // Extract team info
        const teamName = e.team?.displayName || e.team?.name || '';
        const teamId = e.team?.id || '';
        
        return {
          id: e.id || `evt-${e.clock?.displayValue || ''}-${typeText}-${idx}`,
          clock: e.clock?.displayValue || '',
          type: typeText,
          text: eventText,
          category, // normalized: 'goal', 'card', 'yellow_card', 'red_card', 'foul', 'substitution', 'penalty_missed', 'other'
          scoringPlay: isScoringPlay,
          playerName,
          teamName,
          teamId: String(teamId),
        };
      });

      const commentary = (data.commentary || []).map((c: any) => ({
        sequence: c.sequence || 0,
        clock: c.time?.displayValue || '',
        text: c.text || '',
        type: c.play?.type?.text || '',
      }));

      return NextResponse.json({
        success: true,
        keyEvents,
        commentary,
        rosters: data.rosters || null,
      });

    } catch (err: any) {
      clearTimeout(timeoutId);
      throw err;
    }

  } catch (err: any) {
    console.error('Live Commentary API Error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Failed to fetch live commentary' }, { status: 500 });
  }
}

