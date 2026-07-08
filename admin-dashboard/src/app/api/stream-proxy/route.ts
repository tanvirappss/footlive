import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const maxDuration = 30; // Allow up to 30s for segment fetching

// Initialize Supabase for server-side use
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

function getSupabase() {
  return createClient(supabaseUrl, supabaseKey);
}

/**
 * Resolves a potentially relative URL against a base URL.
 * If targetUrl is already absolute, returns it as-is.
 */
function resolveUrl(targetUrl: string, baseUrl: string): string {
  try {
    // If it's already absolute
    if (targetUrl.startsWith('http://') || targetUrl.startsWith('https://')) {
      return targetUrl;
    }
    const base = new URL(baseUrl);
    if (targetUrl.startsWith('/')) {
      // Absolute path
      return `${base.protocol}//${base.host}${targetUrl}`;
    }
    // Relative path: resolve against the directory of the base URL
    const basePath = base.pathname.substring(0, base.pathname.lastIndexOf('/') + 1);
    return `${base.protocol}//${base.host}${basePath}${targetUrl}`;
  } catch {
    return targetUrl;
  }
}

/**
 * Rewrites URLs inside an M3U8 manifest so that sub-playlists, segments,
 * and encryption keys are also fetched through this proxy.
 */
function rewriteM3u8(
  manifestText: string,
  originalUrl: string,
  proxyBase: string,
  headersB64: string
): string {
  const lines = manifestText.split('\n');
  const rewritten: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Rewrite #EXT-X-KEY URI="..." 
    if (trimmed.startsWith('#EXT-X-KEY')) {
      const rewrittenLine = trimmed.replace(
        /URI="([^"]+)"/gi,
        (match, uri) => {
          const absoluteUri = resolveUrl(uri, originalUrl);
          const proxied = `${proxyBase}?url=${encodeURIComponent(absoluteUri)}&h=${headersB64}`;
          return `URI="${proxied}"`;
        }
      );
      rewritten.push(rewrittenLine);
      continue;
    }

    // Rewrite #EXT-X-MAP URI="..."
    if (trimmed.startsWith('#EXT-X-MAP')) {
      const rewrittenLine = trimmed.replace(
        /URI="([^"]+)"/gi,
        (match, uri) => {
          const absoluteUri = resolveUrl(uri, originalUrl);
          const proxied = `${proxyBase}?url=${encodeURIComponent(absoluteUri)}&h=${headersB64}`;
          return `URI="${proxied}"`;
        }
      );
      rewritten.push(rewrittenLine);
      continue;
    }

    // If it's a comment/tag line, keep as-is (unless it contains URIs handled above)
    if (trimmed.startsWith('#')) {
      rewritten.push(line);
      continue;
    }

    // If it's a non-empty line (a URL: segment, sub-playlist, etc.)
    if (trimmed.length > 0) {
      const absoluteUrl = resolveUrl(trimmed, originalUrl);
      const proxied = `${proxyBase}?url=${encodeURIComponent(absoluteUrl)}&h=${headersB64}`;
      rewritten.push(proxied);
      continue;
    }

    // Empty lines: keep as-is
    rewritten.push(line);
  }

  return rewritten.join('\n');
}

/**
 * Build the headers object from proxy_headers config.
 */
function buildHeaders(proxyHeaders: Record<string, string> | undefined): Record<string, string> {
  const headers: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  };

  if (proxyHeaders) {
    for (const [key, value] of Object.entries(proxyHeaders)) {
      if (key && value) {
        headers[key] = value;
      }
    }
  }

  return headers;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const streamId = searchParams.get('streamId');
    const urlIndexStr = searchParams.get('urlIndex');
    const directUrl = searchParams.get('url');
    const headersParam = searchParams.get('h');

    let targetUrl = '';
    let proxyHeaders: Record<string, string> = {};

    // Mode 1: Lookup from database by streamId + urlIndex
    if (streamId && urlIndexStr !== null) {
      const urlIndex = parseInt(urlIndexStr, 10);
      const sb = getSupabase();

      const { data: stream, error } = await sb
        .from('streams')
        .select('urls')
        .eq('id', streamId)
        .single();

      if (error || !stream) {
        return NextResponse.json(
          { error: 'Stream not found' },
          { status: 404 }
        );
      }

      const urls = stream.urls as Array<{
        label: string;
        url: string;
        use_proxy?: boolean;
        proxy_headers?: Record<string, string>;
      }>;

      if (!Array.isArray(urls) || !urls[urlIndex]) {
        return NextResponse.json(
          { error: 'URL index out of range' },
          { status: 400 }
        );
      }

      const urlEntry = urls[urlIndex];
      targetUrl = urlEntry.url;
      proxyHeaders = urlEntry.proxy_headers || {};
    }
    // Mode 2: Direct URL + base64 headers (for sub-resources like segments)
    else if (directUrl) {
      targetUrl = directUrl;

      if (headersParam) {
        try {
          const decoded = Buffer.from(headersParam, 'base64').toString('utf-8');
          proxyHeaders = JSON.parse(decoded);
        } catch {
          // Invalid headers, continue without custom headers
        }
      }
    } else {
      return NextResponse.json(
        { error: 'Missing required parameters. Provide streamId+urlIndex or url.' },
        { status: 400 }
      );
    }

    // Fetch the resource from the origin server
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const fetchHeaders = buildHeaders(proxyHeaders);

    const res = await fetch(targetUrl, {
      headers: fetchHeaders,
      signal: controller.signal,
      redirect: 'follow',
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      return NextResponse.json(
        { error: `Origin returned ${res.status}: ${res.statusText}` },
        { status: res.status }
      );
    }

    const contentType = res.headers.get('content-type') || '';
    const isM3u8 =
      targetUrl.toLowerCase().includes('.m3u8') ||
      contentType.includes('mpegurl') ||
      contentType.includes('x-mpegurl');

    // CORS headers to add to all responses
    const corsHeaders: Record<string, string> = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Expose-Headers': '*',
    };

    if (isM3u8) {
      // Parse and rewrite M3U8 manifest
      const text = await res.text();

      // Build the proxy base URL for rewriting sub-resource URLs
      const reqUrl = new URL(request.url);
      const proxyBase = `${reqUrl.protocol}//${reqUrl.host}/api/stream-proxy`;

      // Encode headers as base64 for passing to sub-resource requests
      const headersB64 = Buffer.from(JSON.stringify(proxyHeaders)).toString('base64');

      const rewrittenManifest = rewriteM3u8(text, targetUrl, proxyBase, headersB64);

      return new NextResponse(rewrittenManifest, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.apple.mpegurl',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          ...corsHeaders,
        },
      });
    } else {
      // Binary passthrough (TS segments, keys, etc.)
      const body = res.body;

      return new NextResponse(body, {
        status: 200,
        headers: {
          'Content-Type': contentType || 'application/octet-stream',
          'Cache-Control': 'public, max-age=5',
          ...corsHeaders,
        },
      });
    }
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Request to origin server timed out (15s)' },
        { status: 504 }
      );
    }
    console.error('[stream-proxy] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal proxy error' },
      { status: 500 }
    );
  }
}

// Handle CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Max-Age': '86400',
    },
  });
}
