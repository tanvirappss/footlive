import { NextResponse } from 'next/server';

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
        next: { revalidate: 15 } // cache for 15 seconds to prevent rate limiting but keep it realtime
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`ESPN summary API returned ${res.status}`);
      }

      const data = await res.json();
      
      // Extract keyEvents and commentary
      const keyEvents = (data.keyEvents || []).map((e: any) => ({
        clock: e.clock?.displayValue || '',
        type: e.type?.text || '',
        text: e.text || '',
      }));

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
