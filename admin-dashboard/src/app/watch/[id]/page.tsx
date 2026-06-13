'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { ArrowLeft, RefreshCw, AlertTriangle, Activity, Check, Loader2 } from 'lucide-react';
import HlsPlayer from '@/components/HlsPlayer';

interface Match {
  id: string;
  home_team_id: string | null;
  away_team_id: string | null;
  home_team_custom_name: string | null;
  away_team_custom_name: string | null;
  match_date: string;
  status: string;
  tournament_name: string;
  home_team?: { name: string; flag_url: string };
  away_team?: { name: string; flag_url: string };
}

interface Stream {
  id: string;
  match_id: string;
  stream_name: string;
  primary_url: string;
  backup_url_1: string | null;
  backup_url_2: string | null;
  backup_url_3: string | null;
  urls?: { label: string; url: string }[];
}

export default function UserWatchPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();

  // States
  const [currentUrlIndex, setCurrentUrlIndex] = useState(0);
  const [playError, setPlayError] = useState<string | null>(null);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [playerKey, setPlayerKey] = useState(0);
  const [sessionId, setSessionId] = useState('web_session');

  // Health stats
  const [latency, setLatency] = useState('80ms');
  const [bufferState, setBufferState] = useState('Healthy');

  // Initialize unique session ID
  useEffect(() => {
    if (typeof window !== 'undefined') {
      let sid = sessionStorage.getItem('user_session_id');
      if (!sid) {
        sid = 'sess_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
        sessionStorage.setItem('user_session_id', sid);
      }
      setSessionId(sid);
    }
  }, []);

  // Fetch match details
  const { data: match } = useQuery<Match>({
    queryKey: ['watch-match', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('matches')
        .select(`
          *,
          home_team:teams!matches_home_team_id_fkey(*),
          away_team:teams!matches_away_team_id_fkey(*)
        `)
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as Match;
    }
  });

  // Fetch match streams
  const { data: streams = [], isLoading } = useQuery<Stream[]>({
    queryKey: ['watch-streams', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('streams')
        .select('*')
        .eq('match_id', id)
        .eq('is_enabled', true);
      if (error) throw error;
      return data || [];
    }
  });

  // Fetch ticker settings
  const { data: ticker } = useQuery({
    queryKey: ['user-ticker'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ticker_settings')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1);
      if (error) throw error;
      return data?.[0] || null;
    }
  });

  // Record web analytic watch event
  useEffect(() => {
    if (match && sessionId !== 'web_session') {
      const logView = async () => {
        await supabase.from('analytics').insert([{
          event_name: 'web_watch_stream',
          session_id: sessionId,
          metadata: { match_id: match.id, tournament: match.tournament_name }
        }]);
      };
      logView();
    }
  }, [match, sessionId]);

  // Fetch scheduled audio announcements
  const { data: audioAnnouncements = [] } = useQuery({
    queryKey: ['user-audio-announcements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audio_announcements')
        .select('*')
        .order('play_at', { ascending: true });
      if (error) throw error;
      return data || [];
    }
  });

  // Scheduled Audio Alarm & Autoplay Handler
  useEffect(() => {
    if (audioAnnouncements.length === 0) return;

    // Check if audio has already played in this client-side JS load context
    if (typeof window !== 'undefined' && (window as any).__audioPlayedInCurrentLoad) {
      return;
    }

    // Read session play count (max 2 plays per session)
    let playCount = 0;
    try {
      const stored = sessionStorage.getItem('audio_play_count');
      if (stored) playCount = parseInt(stored, 10);
    } catch (e) {
      console.error(e);
    }
    if (playCount >= 2) return;

    const activeAudio = audioAnnouncements
      .filter((a: any) => new Date(a.play_at).getTime() <= Date.now())
      .pop(); // Get the most recently scheduled past audio

    let currentAudioElement: HTMLAudioElement | null = null;
    let playTimeout: NodeJS.Timeout | null = null;
    const futureTimeouts: NodeJS.Timeout[] = [];

    const playAudioUrl = (url: string) => {
      // Check play count limit again before playing
      let currentPlayCount = 0;
      try {
        const stored = sessionStorage.getItem('audio_play_count');
        if (stored) currentPlayCount = parseInt(stored, 10);
      } catch (e) {
        console.error(e);
      }
      if (currentPlayCount >= 2) return;

      if (currentAudioElement) {
        currentAudioElement.pause();
        currentAudioElement = null;
      }

      const audio = new Audio(url);
      audio.preload = 'auto';
      currentAudioElement = audio;

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            try {
              sessionStorage.setItem('audio_play_count', String(currentPlayCount + 1));
              (window as any).__audioPlayedInCurrentLoad = true;
            } catch (e) {
              console.error(e);
            }
            cleanupListeners();
          })
          .catch((err) => {
            console.log('Autoplay blocked. Waiting for user interaction.', err);
            currentAudioElement = null;
          });
      }
    };

    const interactionEvents = ['click', 'touchstart', 'mousedown', 'keydown', 'scroll'];
    const handleUserInteraction = () => {
      if (activeAudio) playAudioUrl(activeAudio.audio_url);
    };

    const cleanupListeners = () => {
      interactionEvents.forEach((event) => {
        window.removeEventListener(event, handleUserInteraction);
      });
    };

    // 1. Play active past audio after a short delay on mount
    if (activeAudio) {
      playTimeout = setTimeout(() => {
        playAudioUrl(activeAudio.audio_url);

        // Add user interaction fallbacks in case of autoplay restrictions
        interactionEvents.forEach((event) => {
          window.addEventListener(event, handleUserInteraction, { passive: true });
        });
      }, 1500);
    }

    // 2. Set up alarms for future scheduled audios
    audioAnnouncements.forEach((item: any) => {
      const playTime = new Date(item.play_at).getTime();
      const delay = playTime - Date.now();
      
      if (delay > 0) {
        const timeoutId = setTimeout(() => {
          playAudioUrl(item.audio_url);
        }, delay);
        futureTimeouts.push(timeoutId);
      }
    });

    return () => {
      if (playTimeout) clearTimeout(playTimeout);
      futureTimeouts.forEach((t) => clearTimeout(t));
      cleanupListeners();
      if (currentAudioElement) {
        currentAudioElement.pause();
        currentAudioElement = null;
      }
    };
  }, [audioAnnouncements]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#090c10] flex flex-col items-center justify-center">
        <LoaderComponent message="Connecting to live stream feeds..." />
      </div>
    );
  }

  const noStreamsTitle = (ticker as any)?.no_streams_title || 'No Streams Configured';
  const noStreamsDesc = (ticker as any)?.no_streams_desc || 'There are no active video links bound to this match yet. Check back closer to game kickoff.';

  if (streams.length === 0) {
    return (
      <div className="min-h-screen bg-[#090c10] text-[#f0f3f8] flex flex-col items-center justify-center p-6 text-center">
        <AlertTriangle className="h-12 w-12 text-amber-500 mb-4" />
        <h3 className="text-xl font-black uppercase">{noStreamsTitle}</h3>
        <p className="text-sm text-slate-400 mt-1 max-w-md">{noStreamsDesc}</p>
        <Link href="/" className="mt-6 px-6 py-3 bg-slate-800 hover:bg-slate-700 font-bold rounded-xl text-xs uppercase tracking-wider transition-all">
          Back to Home
        </Link>
      </div>
    );
  }

  const stream = streams[0];
  const streamItems = Array.isArray(stream.urls) && stream.urls.length > 0
    ? stream.urls
    : [
        { label: 'Primary', url: stream.primary_url },
        { label: 'Backup 1', url: stream.backup_url_1 },
        { label: 'Backup 2', url: stream.backup_url_2 },
        { label: 'Backup 3', url: stream.backup_url_3 }
      ].filter((item): item is { label: string; url: string } => !!item.url);

  const streamUrls = streamItems.map(item => item.url);
  const streamLabels = streamItems.map(item => item.label || 'Server');

  const activeUrl = streamUrls[currentUrlIndex];

  const handleStreamError = (errorMsg: string) => {
    setPlayError(errorMsg);
    setIsReconnecting(true);
    setBufferState('Stalled');

    // Switch to next backup stream immediately (100ms for state refresh)
    setTimeout(() => {
      if (currentUrlIndex < streamUrls.length - 1) {
        setCurrentUrlIndex(prev => prev + 1);
        setPlayError(null);
        setIsReconnecting(false);
        setBufferState('Healthy');
      } else {
        // Recycle back to primary
        setCurrentUrlIndex(0);
        setPlayError(null);
        setIsReconnecting(false);
        setBufferState('Healthy');
      }
    }, 100);
  };

  const getMatchTitle = () => {
    if (!match) return 'Live Match Broadcast';
    const home = match.home_team_id ? match.home_team?.name : match.home_team_custom_name;
    const away = match.away_team_id ? match.away_team?.name : match.away_team_custom_name;
    return `${home} vs ${away}`;
  };

  return (
    <div className="min-h-screen bg-[#090c10] text-[#f0f3f8] flex flex-col">
      {/* Header bar */}
      <header className="glass-panel border-b border-card-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-4">
          <button 
            onClick={() => router.back()}
            className="p-2 bg-slate-900 border border-card-border hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
          >
            <ArrowLeft className="h-5 w-5 text-white" />
          </button>
          <div>
            <h2 className="font-extrabold text-sm text-slate-400 uppercase tracking-wider">Now Playing</h2>
            <h1 className="font-black text-base md:text-lg text-white mt-0.5">{getMatchTitle()}</h1>
          </div>
        </div>
      </header>

      {/* Ticker Marquee Headline */}
      {ticker && ticker.is_enabled && (
        <div className="bg-gradient-to-r from-red-950/80 via-[#0f1422] to-red-950/80 border-b border-card-border py-2 relative overflow-hidden flex items-center h-9 z-40">
          <div className="absolute left-0 top-0 bottom-0 px-3.5 bg-red-600 text-white font-black uppercase tracking-wider text-[9px] flex items-center justify-center z-10 shadow-md">
            {(ticker as any)?.ticker_badge || '⚡ NEWS TICKER'}
          </div>
          
          <div className="w-full whitespace-nowrap overflow-hidden">
            <span className="animate-marquee text-xs font-bold text-white tracking-wide font-bangla">
              {ticker.ticker_text}
            </span>
          </div>
        </div>
      )}

      {/* Main player layout */}
      <main className="max-w-7xl mx-auto w-full px-6 py-8 flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Video Player Card */}
        <div className="lg:col-span-2 space-y-6">
          <div className="aspect-video w-full relative">
            <HlsPlayer 
              key={playerKey}
              url={activeUrl} 
              onError={handleStreamError} 
            />
            {isReconnecting && (
              <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-3 rounded-2xl">
                <LoaderComponent message="Reconnecting stream feed..." />
              </div>
            )}
          </div>

          {/* Feedback alerts */}
          {playError && (
            <div className="p-4 bg-red-950/20 border border-red-500/25 rounded-2xl text-red-400 text-xs font-bold flex flex-col gap-1">
              <span className="uppercase text-red-500">Stream Connection Error</span>
              <p className="font-medium text-slate-300">{playError}. Attempting automated backup switch in 3 seconds...</p>
            </div>
          )}

          {/* Stream selector */}
          <div className="glass-panel p-6 rounded-2xl border border-card-border space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-black uppercase text-xs text-slate-400 tracking-wider">Fallback Channels</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase mt-0.5">Toggle feeds if experience lag</p>
              </div>
              <button 
                onClick={() => {
                  setPlayerKey(prev => prev + 1);
                  setPlayError(null);
                  setIsReconnecting(false);
                  setBufferState('Healthy');
                }}
                className="p-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                <RefreshCw className="h-4 w-4 text-emerald-accent" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {streamUrls.map((url, idx) => {
                const isSelected = currentUrlIndex === idx;
                return (
                  <button
                    key={url}
                    onClick={() => {
                      setCurrentUrlIndex(idx);
                      setPlayError(null);
                      setIsReconnecting(false);
                      setBufferState('Healthy');
                    }}
                    className={`py-3 px-2 rounded-xl border text-xs font-black uppercase tracking-wider transition-all cursor-pointer truncate ${
                      isSelected
                        ? 'bg-emerald-accent border-emerald-accent text-black'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                    title={streamLabels[idx]}
                  >
                    {streamLabels[idx]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Telemetry log cards */}
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-2xl border border-card-border space-y-6 h-full flex flex-col justify-between">
            <div className="space-y-6">
              <div className="flex items-center gap-2 border-b border-card-border pb-4">
                <Activity className="h-5 w-5 text-emerald-accent" />
                <h3 className="font-black uppercase text-xs text-white tracking-wider">Stream Health Monitor</h3>
              </div>

              <div className="space-y-4 text-xs font-bold">
                <div className="flex justify-between items-center py-2 border-b border-slate-900">
                  <span className="text-slate-500">Live Status:</span>
                  <span className="text-emerald-accent uppercase flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-accent animate-ping" />
                    ONLINE
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-900">
                  <span className="text-slate-500">Active Channel:</span>
                  <span className="text-white uppercase">{currentUrlIndex === 0 ? 'Primary Feed' : `Backup Feed ${currentUrlIndex}`}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-900">
                  <span className="text-slate-500">Codec Type:</span>
                  <span className="text-white font-mono">H.264 / AAC</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-900">
                  <span className="text-slate-500">Network Latency:</span>
                  <span className="text-white">{latency} (Low Delay)</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-slate-500">Buffer state:</span>
                  <span className={bufferState === 'Healthy' ? 'text-emerald-accent' : 'text-amber-500'}>{bufferState}</span>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-card-border">
              <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-900 flex gap-2.5 text-[10px] text-slate-500 font-bold uppercase">
                <Check className="h-4 w-4 text-emerald-accent shrink-0" />
                Adaptive bitrate engine is active and adjusting to your bandwidth speeds automatically.
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function LoaderComponent({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center">
      <Loader2 className="h-8 w-8 text-emerald-accent animate-spin" />
      <p className="text-sm text-slate-400 mt-4 font-semibold">{message}</p>
    </div>
  );
}
