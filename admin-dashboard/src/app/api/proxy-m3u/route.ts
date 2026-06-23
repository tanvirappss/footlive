import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
      return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
    }

    // Add a timeout of 8 seconds to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      signal: controller.signal,
      next: { revalidate: 60 } // cache for 1 minute
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Failed to fetch M3U: ${res.statusText} (${res.status})`);
    }

    const text = await res.text();
    
    // Parse M3U text
    const lines = text.split('\n');
    const channels = [];
    let currentChannel: any = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line.startsWith('#EXTM3U')) {
        continue;
      }
      
      if (line.startsWith('#EXTINF:')) {
        currentChannel = {};
        
        // Extract tvg-logo
        const logoMatch = line.match(/tvg-logo="([^"]+)"/i) || line.match(/tvg-logo=([^\s,]+)/i);
        if (logoMatch) {
          currentChannel.logo = logoMatch[1];
        }
        
        // Extract group-title
        const groupMatch = line.match(/group-title="([^"]+)"/i);
        if (groupMatch) {
          currentChannel.group = groupMatch[1];
        }

        // Extract name (it's usually the part after the last comma)
        const commaIndex = line.lastIndexOf(',');
        if (commaIndex !== -1) {
          currentChannel.name = line.substring(commaIndex + 1).trim();
        } else {
          currentChannel.name = 'Unnamed Channel';
        }
      } else if (line && !line.startsWith('#')) {
        if (currentChannel) {
          currentChannel.url = line;
          channels.push({
            name: currentChannel.name || 'Unnamed Channel',
            url: currentChannel.url,
            logo: currentChannel.logo || '',
            group: currentChannel.group || ''
          });
          currentChannel = null;
        } else {
          // Sometimes there are URLs without a preceding #EXTINF
          channels.push({
            name: `Channel ${channels.length + 1}`,
            url: line,
            logo: '',
            group: ''
          });
        }
      }
    }

    return NextResponse.json({ success: true, channels });
  } catch (err: any) {
    console.error('M3U Parsing Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
