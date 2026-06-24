'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { ArrowLeft, RefreshCw, AlertTriangle, Activity, Check, Loader2, Trophy, MessageSquare, MapPin, Users } from 'lucide-react';
import HlsPlayer from '@/components/HlsPlayer';
import PremiumPlayer from '@/components/PremiumPlayer';
import PotPlayer from '@/components/PotPlayer';
import AdsterraAd from '@/components/AdsterraAd';

interface Team {
  id: string;
  name: string;
  short_name: string;
  flag_url: string;
  logo_url: string;
}

interface Match {
  id: string;
  home_team_id: string | null;
  away_team_id: string | null;
  home_team_custom_name: string | null;
  home_team_custom_flag: string | null;
  away_team_custom_name: string | null;
  away_team_custom_flag: string | null;
  tournament_name: string;
  match_date: string;
  match_time: string;
  match_timestamp: string;
  stadium_name: string;
  status: string;
  home_score: number;
  away_score: number;
  home_scorers?: string | null;
  away_scorers?: string | null;
  live_minute?: string | null;
  banner_url: string | null;
  description: string | null;
  home_team?: Team;
  away_team?: Team;
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

function teamsMatch(dbName: string, espnName: string): boolean {
  const norm1 = normalizeTeamName(dbName);
  const norm2 = normalizeTeamName(espnName);
  if (norm1 === norm2) return true;
  if (norm1.includes(norm2) || norm2.includes(norm1)) return true;
  return false;
}

function playCelebrationSound(type: 'goal' | 'card' | 'foul') {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    if (type === 'goal') {
      const playHorn = (freq: number, detuneVal: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        osc.detune.setValueAtTime(detuneVal, ctx.currentTime);
        
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.2, ctx.currentTime + 1.2);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.0);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 2.0);
      };
      
      playHorn(220, -10);
      playHorn(220, 10);
      playHorn(330, 0);
    } else if (type === 'card' || type === 'foul') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1000, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(1200, ctx.currentTime + 0.15);
      
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.05);
      gain.gain.setValueAtTime(0.15, ctx.currentTime + 0.2);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.25);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
      
      if (type === 'card') {
        setTimeout(() => {
          const ctx2 = new AudioContextClass();
          const osc2 = ctx2.createOscillator();
          const gain2 = ctx2.createGain();
          osc2.type = 'sine';
          osc2.frequency.setValueAtTime(1100, ctx2.currentTime);
          osc2.frequency.linearRampToValueAtTime(1300, ctx2.currentTime + 0.15);
          gain2.gain.setValueAtTime(0, ctx2.currentTime);
          gain2.gain.linearRampToValueAtTime(0.15, ctx2.currentTime + 0.05);
          gain2.gain.setValueAtTime(0.15, ctx2.currentTime + 0.2);
          gain2.gain.linearRampToValueAtTime(0, ctx2.currentTime + 0.25);
          osc2.connect(gain2);
          gain2.connect(ctx2.destination);
          osc2.start();
          osc2.stop(ctx2.currentTime + 0.3);
        }, 350);
      }
    }
  } catch (e) {
    console.warn('Audio Context failed to play sound:', e);
  }
}

export default function UserWatchPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();

  // States
  const [currentUrlIndex, setCurrentUrlIndex] = useState(0);
  const [playError, setPlayError] = useState<string | null>(null);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [activeSideTab, setActiveSideTab] = useState<'commentary' | 'events' | 'telemetry' | 'lineup'>('commentary');
  const [playerKey, setPlayerKey] = useState(0);
  const [sessionId, setSessionId] = useState('web_session');
  const fallbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const processedEventsRef = useRef<Set<string>>(new Set());
  const [isCommentaryInitialized, setIsCommentaryInitialized] = useState(false);
  const [notification, setNotification] = useState<{
    id: string;
    text: string;
    type: 'goal' | 'card' | 'foul';
    clock: string;
  } | null>(null);

  // Health stats
  const [latency, setLatency] = useState('80ms');
  const [bufferState, setBufferState] = useState('Healthy');

  // Cleanup fallback timeout on unmount
  useEffect(() => {
    return () => {
      if (fallbackTimeoutRef.current) {
        clearTimeout(fallbackTimeoutRef.current);
      }
    };
  }, []);

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

  // Fetch real-time live score updates for this match date to get espnEventId and latest live scores
  const matchDateStr = match ? (() => {
    const d = new Date(match.match_timestamp);
    return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`;
  })() : null;

  const { data: espnScores = [] } = useQuery<any[]>({
    queryKey: ['watch-espn-scores', matchDateStr],
    queryFn: async () => {
      if (!matchDateStr) return [];
      try {
        const res = await fetch(`/api/live-scores?date=${matchDateStr}`);
        if (!res.ok) return [];
        const data = await res.json();
        return data.scores || [];
      } catch (e) {
        return [];
      }
    },
    enabled: !!matchDateStr,
    refetchInterval: 15 * 1000, // Refetch every 15 seconds for live matches score tracking!
  });

  // Find the matching ESPN score record
  const matchedEspnScore = match ? espnScores.find(es => {
    const homeName = match.home_team_id ? match.home_team?.name : match.home_team_custom_name;
    const awayName = match.away_team_id ? match.away_team?.name : match.away_team_custom_name;
    if (!homeName || !awayName) return false;
    return (teamsMatch(homeName, es.homeTeam) && teamsMatch(awayName, es.awayTeam)) ||
           (teamsMatch(homeName, es.awayTeam) && teamsMatch(awayName, es.homeTeam));
  }) : null;

  const espnEventId = matchedEspnScore?.espnEventId;

  // Fetch live play-by-play commentary from ESPN summary endpoint proxy
  const { data: commentaryData, isLoading: loadingCommentary } = useQuery({
    queryKey: ['live-commentary', espnEventId],
    queryFn: async () => {
      if (!espnEventId) return null;
      try {
        const res = await fetch(`/api/live-commentary?event=${espnEventId}`);
        if (!res.ok) return null;
        return await res.json();
      } catch (e) {
        return null;
      }
    },
    enabled: !!espnEventId,
    refetchInterval: 5 * 1000, // Query every 5 seconds for fast updates!
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

  // Fetch Adsterra configuration settings
  const { data: adsterra } = useQuery({
    queryKey: ['adsterra-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ad_networks')
        .select('*')
        .eq('network_name', 'Adsterra')
        .maybeSingle();
      if (error) throw error;
      return data || null;
    }
  });

  // Fetch SystemConfig settings
  const { data: systemConfig } = useQuery({
    queryKey: ['system-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ad_networks')
        .select('*')
        .eq('network_name', 'SystemConfig')
        .maybeSingle();
      if (error) throw error;
      return data || null;
    }
  });

  useEffect(() => {
    if (systemConfig?.custom_scripts?.enable_live_notifications === false) return;
    if (!commentaryData?.keyEvents) return;
    
    // On first load, record all existing event IDs so we don't fire old notifications
    if (!isCommentaryInitialized) {
      const initialIds = new Set<string>();
      for (const ev of commentaryData.keyEvents) {
        initialIds.add(ev.id);
      }
      processedEventsRef.current = initialIds;
      setIsCommentaryInitialized(true);
      return;
    }

    // Check for new events we haven't processed yet
    for (const event of commentaryData.keyEvents) {
      if (processedEventsRef.current.has(event.id)) continue;
      
      // Use the enhanced 'category' field from the API
      const cat = event.category || '';
      const isGoal = cat === 'goal';
      const isCard = cat === 'card' || cat === 'yellow_card' || cat === 'red_card';
      const isFoul = cat === 'foul';
      
      // Fallback: also check type/text for backward compatibility
      const textLower = (event.text || '').toLowerCase();
      const typeLower = (event.type || '').toLowerCase();
      const fallbackGoal = event.scoringPlay || typeLower.includes('goal') || textLower.includes('goal!');
      const fallbackCard = typeLower.includes('card') || typeLower.includes('booking') || textLower.includes('yellow card') || textLower.includes('red card');
      const fallbackFoul = typeLower.includes('foul') || textLower.includes('foul');
      
      const isNotifiable = isGoal || isCard || isFoul || fallbackGoal || fallbackCard || fallbackFoul;
      
      if (isNotifiable) {
        const type: 'goal' | 'card' | 'foul' = (isGoal || fallbackGoal) ? 'goal' : (isCard || fallbackCard) ? 'card' : 'foul';
        setNotification({
          id: event.id,
          text: event.text,
          type,
          clock: event.clock || "0'"
        });
        playCelebrationSound(type);

        const t = setTimeout(() => {
          setNotification(prev => prev?.id === event.id ? null : prev);
        }, 4000);
      }
      
      processedEventsRef.current.add(event.id);
    }
  }, [commentaryData, isCommentaryInitialized, systemConfig]);

  const getAdForPlacement = (placementKey: string) => {
    const config = adsterra?.custom_scripts?.placements?.[placementKey];
    if (!config || !config.enabled || !adsterra?.is_enabled) return null;

    const type = config.type;
    
    if (type === 'banner') {
      return <AdsterraAd htmlCode={adsterra?.banner_script} enabled={true} />;
    }
    if (type === 'banner_2') {
      return <AdsterraAd htmlCode={adsterra?.custom_scripts?.banner_2_script} enabled={true} />;
    }
    if (type === 'native') {
      return <AdsterraAd htmlCode={adsterra?.native_script} enabled={true} />;
    }
    if (type === 'social_bar') {
      return <AdsterraAd htmlCode={adsterra?.social_bar_script} enabled={true} />;
    }
    if (type === 'popunder') {
      return <AdsterraAd htmlCode={adsterra?.popunder_script} enabled={true} />;
    }
    if (type === 'interstitial') {
      return <AdsterraAd htmlCode={adsterra?.custom_scripts?.interstitial_script} enabled={true} />;
    }
    if (type === 'display_link') {
      const url = adsterra?.custom_scripts?.display_link;
      if (!url) return null;
      return (
        <div className="w-full flex justify-center py-2">
          <a 
            href={url} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="w-full max-w-[468px] py-4 bg-slate-900/40 hover:bg-slate-900/60 border border-emerald-500/25 rounded-2xl flex flex-col items-center justify-center text-center gap-1 hover:border-emerald-500/50 transition-all duration-200"
          >
            <span className="text-[10px] text-emerald-accent font-black tracking-widest uppercase">SPONSORED FEED AD</span>
            <span className="text-sm text-white font-extrabold px-4">⚡ Click here to watch backup stream in 1080p Ultra HD</span>
          </a>
        </div>
      );
    }

    return null;
  };

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

    // Read play mode from system config
    const playMode = systemConfig?.custom_scripts?.audio_play_mode || 'session_limit';
    const selectedAudioId = systemConfig?.custom_scripts?.selected_audio_id;

    if (playMode === 'off') return;

    // In 'refresh' mode: play every time (skip all guards)
    // In 'session_limit' mode: max 2 plays per browser session
    // In 'limit_5' mode: max 5 plays per calendar day
    
    if (playMode !== 'refresh') {
      // Check if audio has already played in this client-side JS load context
      if (typeof window !== 'undefined' && (window as any).__audioPlayedInCurrentLoad) {
        return;
      }
    }

    if (playMode === 'limit_5') {
      const todayStr = new Date().toISOString().split('T')[0];
      let dailyPlay = { date: todayStr, count: 0 };
      try {
        const stored = localStorage.getItem('daily_audio_play');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && parsed.date === todayStr) {
            dailyPlay = parsed;
          }
        }
      } catch (e) {}
      if (dailyPlay.count >= 5) return;
    } else if (playMode === 'session_limit') {
      let playCount = 0;
      try {
        const stored = sessionStorage.getItem('audio_play_count');
        if (stored) playCount = parseInt(stored, 10);
      } catch (e) {}
      if (playCount >= 2) return;
    }

    let activeAudio: any = null;
    if (selectedAudioId) {
      activeAudio = audioAnnouncements.find((a: any) => a.id === selectedAudioId);
    }
    // Fallback to the latest past audio if selected one is not found or not set
    if (!activeAudio) {
      activeAudio = audioAnnouncements
        .filter((a: any) => new Date(a.play_at).getTime() <= Date.now())
        .pop(); // Get the most recently scheduled past audio
    }

    let currentAudioElement: HTMLAudioElement | null = null;
    let playTimeout: NodeJS.Timeout | null = null;
    const futureTimeouts: NodeJS.Timeout[] = [];

    const playAudioUrl = (url: string) => {
      // Check play count limit again before playing
      if (playMode === 'limit_5') {
        const todayStr = new Date().toISOString().split('T')[0];
        let dailyPlay = { date: todayStr, count: 0 };
        try {
          const stored = localStorage.getItem('daily_audio_play');
          if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed && parsed.date === todayStr) dailyPlay = parsed;
          }
        } catch (e) {}
        if (dailyPlay.count >= 5) return;
      } else if (playMode === 'session_limit') {
        let currentPlayCount = 0;
        try {
          const stored = sessionStorage.getItem('audio_play_count');
          if (stored) currentPlayCount = parseInt(stored, 10);
        } catch (e) {}
        if (currentPlayCount >= 2) return;
      }

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
              if (playMode === 'limit_5') {
                const todayStr = new Date().toISOString().split('T')[0];
                let dailyPlay = { date: todayStr, count: 0 };
                const stored = localStorage.getItem('daily_audio_play');
                if (stored) {
                  const parsed = JSON.parse(stored);
                  if (parsed && parsed.date === todayStr) dailyPlay = parsed;
                }
                dailyPlay.count += 1;
                localStorage.setItem('daily_audio_play', JSON.stringify(dailyPlay));
              } else if (playMode === 'session_limit') {
                let currentPlayCount = 0;
                const stored = sessionStorage.getItem('audio_play_count');
                if (stored) currentPlayCount = parseInt(stored, 10);
                sessionStorage.setItem('audio_play_count', String(currentPlayCount + 1));
              }
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
  }, [audioAnnouncements, systemConfig]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#090c10] flex flex-col items-center justify-center">
        <LoaderComponent message="Connecting to live stream feeds..." />
      </div>
    );
  }

  const uiTexts = systemConfig?.custom_scripts?.app_ui_texts || {};
  const noStreamsTitle = uiTexts.no_streams_title || (ticker as any)?.no_streams_title || 'No Streams Configured';
  const noStreamsDesc = uiTexts.no_streams_desc || (ticker as any)?.no_streams_desc || 'There are no active video links bound to this match yet. Check back closer to game kickoff.';

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

    // Clear any pending switch
    if (fallbackTimeoutRef.current) {
      clearTimeout(fallbackTimeoutRef.current);
    }

    // Switch to next backup stream after 3 seconds (giving stream time to try loaded fallback internally)
    fallbackTimeoutRef.current = setTimeout(() => {
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
      fallbackTimeoutRef.current = null;
    }, 3000);
  };

  const handlePlaying = () => {
    // Clear any pending fallback timeout since the stream is playing successfully!
    if (fallbackTimeoutRef.current) {
      clearTimeout(fallbackTimeoutRef.current);
      fallbackTimeoutRef.current = null;
    }
    setPlayError(null);
    setIsReconnecting(false);
    setBufferState('Healthy');
  };

  const homeName = match?.home_team_id ? match.home_team?.name : match?.home_team_custom_name;
  const awayName = match?.away_team_id ? match.away_team?.name : match?.away_team_custom_name;

  const getMatchTitle = () => {
    if (!match) return 'Live Match Broadcast';
    return `${homeName} vs ${awayName}`;
  };

  return (
    <div className="min-h-screen bg-[#090c10] text-[#f0f3f8] flex flex-col">
      {/* Adsterra Popunder & Social Bar (Watch Page) */}
      <AdsterraAd 
        htmlCode={adsterra?.popunder_script} 
        enabled={!!adsterra?.is_enabled && adsterra?.custom_scripts?.watchPage?.popunder !== false} 
      />
      <AdsterraAd 
        htmlCode={adsterra?.social_bar_script} 
        enabled={!!adsterra?.is_enabled && adsterra?.custom_scripts?.watchPage?.socialBar !== false} 
      />

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
          {/* Watch Page Above Player Ad */}
          {getAdForPlacement('watchAbovePlayer')}

          <div className="aspect-video w-full relative">
            {systemConfig?.custom_scripts?.active_player === 'player_2' ? (
              <PremiumPlayer 
                key={playerKey}
                url={activeUrl} 
                onError={handleStreamError} 
                onPlaying={handlePlaying}
              />
            ) : systemConfig?.custom_scripts?.active_player === 'pot_player' ? (
              <PotPlayer 
                key={playerKey}
                url={activeUrl} 
                onError={handleStreamError} 
                onPlaying={handlePlaying}
              />
            ) : (
              <HlsPlayer 
                key={playerKey}
                url={activeUrl} 
                onError={handleStreamError} 
                onPlaying={handlePlaying}
              />
            )}
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

          {/* Watch Page Below Player Ad */}
          {getAdForPlacement('watchBelowPlayer')}
        </div>

        {/* Live Match Center & Commentary Sidebar */}
        <div className="space-y-6 flex flex-col h-[calc(100vh-140px)] min-h-[500px]">
          {/* Match Score Card (Like Screenshot) */}
          <div className="glass-panel p-5 rounded-2xl border border-card-border bg-gradient-to-b from-slate-900/40 to-slate-950/20">
            <div className="flex justify-between items-center text-center gap-1">
              {/* Home Team */}
              <div className="w-[35%] flex flex-col items-center gap-1.5 min-w-0">
                <div className="h-10 w-14 bg-slate-950/80 rounded-lg overflow-hidden border border-card-border flex items-center justify-center p-0.5 shadow">
                  {(match?.home_team_id ? match.home_team?.flag_url : match?.home_team_custom_flag) ? (
                    <img 
                      src={match?.home_team_id ? match.home_team?.flag_url : match?.home_team_custom_flag || ''} 
                      alt={homeName || 'Home'} 
                      className="h-full w-full object-cover rounded" 
                    />
                  ) : (
                    <span className="text-[10px] text-slate-500 font-bold">HOME</span>
                  )}
                </div>
                <span className="font-bold text-white text-xs truncate w-full">{homeName}</span>
              </div>

              {/* Score display */}
              <div className="w-[30%] flex flex-col items-center justify-center">
                <div className="flex items-center gap-1.5">
                  <span className="text-2xl font-black text-white tracking-tight">
                    {matchedEspnScore ? matchedEspnScore.homeScore : (match?.home_score ?? 0)}
                  </span>
                  <span className="text-slate-600 font-bold text-xs">-</span>
                  <span className="text-2xl font-black text-white tracking-tight">
                    {matchedEspnScore ? matchedEspnScore.awayScore : (match?.away_score ?? 0)}
                  </span>
                </div>
                <span className="px-2 py-0.5 bg-red-500/10 text-red-400 border border-red-500/25 rounded-md text-[9px] font-black uppercase tracking-wider mt-1.5 animate-pulse">
                  {matchedEspnScore?.liveMinute || match?.live_minute || 'LIVE'}
                </span>
              </div>

              {/* Away Team */}
              <div className="w-[35%] flex flex-col items-center gap-1.5 min-w-0">
                <div className="h-10 w-14 bg-slate-950/80 rounded-lg overflow-hidden border border-card-border flex items-center justify-center p-0.5 shadow">
                  {(match?.away_team_id ? match.away_team?.flag_url : match?.away_team_custom_flag) ? (
                    <img 
                      src={match?.away_team_id ? match.away_team?.flag_url : match?.away_team_custom_flag || ''} 
                      alt={awayName || 'Away'} 
                      className="h-full w-full object-cover rounded" 
                    />
                  ) : (
                    <span className="text-[10px] text-slate-500 font-bold">AWAY</span>
                  )}
                </div>
                <span className="font-bold text-white text-xs truncate w-full">{awayName}</span>
              </div>
            </div>

            {/* Scorers info below (Exactly like screenshot) */}
            {((matchedEspnScore ? matchedEspnScore.homeScorers : match?.home_scorers) || 
              (matchedEspnScore ? matchedEspnScore.awayScorers : match?.away_scorers)) && (
              <div className="text-[10px] text-slate-400 bg-slate-950/60 p-2.5 rounded-xl border border-slate-900/80 flex justify-between gap-3 mt-4">
                <div className="w-[45%] text-left text-slate-300 font-medium leading-relaxed">
                  {matchedEspnScore ? matchedEspnScore.homeScorers : match?.home_scorers || ""}
                </div>
                <div className="w-[10%] text-center text-slate-500 font-bold">⚽</div>
                <div className="w-[45%] text-right text-slate-300 font-medium leading-relaxed">
                  {matchedEspnScore ? matchedEspnScore.awayScorers : match?.away_scorers || ""}
                </div>
              </div>
            )}
          </div>

          {/* Interactive tabs */}
          <div className="glass-panel rounded-2xl border border-card-border flex-1 flex flex-col overflow-hidden">
            <div className="flex border-b border-card-border p-1 bg-slate-950/40">
              <button
                onClick={() => setActiveSideTab('commentary')}
                className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeSideTab === 'commentary'
                    ? 'bg-emerald-accent text-black font-extrabold shadow'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
                }`}
              >
                <MessageSquare className="h-3.5 w-3.5" />
                Commentary
              </button>
              <button
                onClick={() => setActiveSideTab('events')}
                className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeSideTab === 'events'
                    ? 'bg-emerald-accent text-black font-extrabold shadow'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
                }`}
              >
                <Trophy className="h-3.5 w-3.5" />
                Events
              </button>
              <button
                onClick={() => setActiveSideTab('telemetry')}
                className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeSideTab === 'telemetry'
                    ? 'bg-emerald-accent text-black font-extrabold shadow'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
                }`}
              >
                <Activity className="h-3.5 w-3.5" />
                Health
              </button>
              <button
                onClick={() => setActiveSideTab('lineup')}
                className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeSideTab === 'lineup'
                    ? 'bg-emerald-accent text-black font-extrabold shadow'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
                }`}
              >
                <Users className="h-3.5 w-3.5" />
                Lineup
              </button>
            </div>

            {/* Tab content panel */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              {activeSideTab === 'commentary' && (
                <div className="space-y-4">
                  {!espnEventId ? (
                    <div className="text-center py-10 text-slate-500 font-bold uppercase text-[10px]">
                      Commentary feed waiting to connect...
                    </div>
                  ) : loadingCommentary ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <Loader2 className="h-5 w-5 text-emerald-accent animate-spin" />
                      <span className="text-[10px] text-slate-500 uppercase font-black mt-2">Loading commentary...</span>
                    </div>
                  ) : !commentaryData?.commentary || commentaryData.commentary.length === 0 ? (
                    <div className="text-center py-10 text-slate-500 font-bold uppercase text-[10px]">
                      No commentary entries recorded yet
                    </div>
                  ) : (
                    <div className="space-y-3.5">
                      {commentaryData.commentary.map((c: any, i: number) => {
                        const isGoal = c.type?.toLowerCase().includes('goal');
                        const isCard = c.type?.toLowerCase().includes('card') || c.type?.toLowerCase().includes('booking');
                        return (
                          <div 
                            key={i} 
                            className={`p-3 rounded-xl border flex gap-3 text-xs leading-relaxed transition-all ${
                              isGoal 
                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' 
                                : isCard 
                                  ? 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                                  : 'bg-slate-950/40 border-slate-900 text-slate-300'
                            }`}
                          >
                            <span className="font-black text-emerald-accent shrink-0 min-w-[28px] text-left">
                              {c.clock || '0\''}
                            </span>
                            <div className="space-y-1">
                              <p className="font-medium">{c.text}</p>
                              {c.type && (
                                <span className="text-[9px] font-black uppercase tracking-wider opacity-60 flex items-center gap-1">
                                  {isGoal ? '⚽ ' : isCard ? '🟨 ' : ''}{c.type}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {activeSideTab === 'events' && (
                <div className="space-y-4">
                  {!espnEventId ? (
                    <div className="text-center py-10 text-slate-500 font-bold uppercase text-[10px]">
                      Key events waiting to connect...
                    </div>
                  ) : loadingCommentary ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <Loader2 className="h-5 w-5 text-emerald-accent animate-spin" />
                      <span className="text-[10px] text-slate-500 uppercase font-black mt-2">Loading events...</span>
                    </div>
                  ) : !commentaryData?.keyEvents || commentaryData.keyEvents.length === 0 ? (
                    <div className="text-center py-10 text-slate-500 font-bold uppercase text-[10px]">
                      No key events registered yet
                    </div>
                  ) : (
                    <div className="space-y-3.5">
                      {commentaryData.keyEvents.map((e: any, i: number) => {
                        const isGoal = e.type?.toLowerCase().includes('goal');
                        const isCard = e.type?.toLowerCase().includes('card') || e.type?.toLowerCase().includes('booking');
                        return (
                          <div 
                            key={i} 
                            className={`p-3 rounded-xl border flex gap-3 text-xs leading-relaxed transition-all ${
                              isGoal 
                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300 font-bold' 
                                : isCard 
                                  ? 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                                  : 'bg-slate-950/40 border-slate-900 text-slate-300'
                            }`}
                          >
                            <span className="font-black text-emerald-accent shrink-0 min-w-[28px] text-left">
                              {e.clock || '0\''}
                            </span>
                            <div className="space-y-1">
                              <p className="font-semibold">{e.text}</p>
                              <span className="text-[9px] font-black uppercase tracking-wider opacity-60 flex items-center gap-1">
                                {isGoal ? '⚽ ' : isCard ? '🟨 ' : ''}{e.type}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {activeSideTab === 'telemetry' && (
                <div className="space-y-6">
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
                    <div className="flex justify-between items-center py-2 border-b border-slate-900">
                      <span className="text-slate-500">Buffer state:</span>
                      <span className={bufferState === 'Healthy' ? 'text-emerald-accent' : 'text-amber-500'}>{bufferState}</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-slate-500">Score Sync API:</span>
                      <span className={espnEventId ? 'text-emerald-accent flex items-center gap-1.5' : 'text-amber-500'}>
                        {espnEventId ? (
                          <>
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-accent animate-pulse" />
                            CONNECTED ({espnEventId})
                          </>
                        ) : 'NOT CONNECTED'}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-900 flex gap-2.5 text-[10px] text-slate-500 font-bold uppercase leading-relaxed">
                    <Check className="h-4 w-4 text-emerald-accent shrink-0" />
                    Adaptive bitrate engine is active and adjusting to your bandwidth speeds automatically.
                  </div>
                </div>
              )}

              {activeSideTab === 'lineup' && (
                <div className="space-y-6">
                  {!espnEventId ? (
                    <div className="text-center py-10 text-slate-500 font-bold uppercase text-[10px]">
                      Lineup feed waiting to connect...
                    </div>
                  ) : loadingCommentary ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <Loader2 className="h-5 w-5 text-emerald-accent animate-spin" />
                      <span className="text-[10px] text-slate-500 uppercase font-black mt-2">Loading lineups...</span>
                    </div>
                  ) : !commentaryData?.rosters ? (
                    <div className="text-center py-10 text-slate-500 font-bold uppercase text-[10px]">
                      No lineup details available for this match
                    </div>
                  ) : (() => {
                    const values = Object.values(commentaryData.rosters);
                    const homeRoster = values.find((r: any) => r.homeAway === 'home') as any;
                    const awayRoster = values.find((r: any) => r.homeAway === 'away') as any;

                    if (!homeRoster && !awayRoster) {
                      return (
                        <div className="text-center py-10 text-slate-500 font-bold uppercase text-[10px]">
                          Lineups are not posted yet
                        </div>
                      );
                    }

                    const renderTeamLineup = (rosterData: any, teamName: string) => {
                      if (!rosterData) return null;
                      const players = rosterData.roster || [];
                      const starters = players.filter((p: any) => p.starter);
                      const subs = players.filter((p: any) => !p.starter);

                      return (
                        <div className="space-y-4">
                          <div className="flex justify-between items-center border-b border-slate-900 pb-2">
                            <h3 className="font-extrabold text-white text-xs uppercase tracking-wider">{teamName}</h3>
                            {rosterData.formation && (
                              <span className="px-2 py-0.5 bg-slate-900 text-slate-400 text-[10px] font-black rounded-md border border-slate-800">
                                Formation: {rosterData.formation}
                              </span>
                            )}
                          </div>
                          
                          <div className="space-y-3">
                            <div>
                              <h4 className="text-[9px] text-emerald-accent font-black uppercase tracking-widest mb-1.5">Starters</h4>
                              <div className="grid grid-cols-1 gap-1.5">
                                {starters.map((p: any, idx: number) => (
                                  <div key={idx} className="flex items-center justify-between text-xs py-1.5 px-2 bg-slate-950/30 rounded-lg border border-slate-900/50">
                                    <div className="flex items-center gap-2">
                                      <span className="w-5 text-slate-500 font-bold text-right text-[10px]">#{p.jersey}</span>
                                      <span className="text-slate-200 font-extrabold">{p.athlete?.displayName}</span>
                                    </div>
                                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{p.position?.displayName}</span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {subs.length > 0 && (
                              <div>
                                <h4 className="text-[9px] text-amber-500 font-black uppercase tracking-widest mb-1.5 mt-3">Substitutes</h4>
                                <div className="grid grid-cols-1 gap-1.5">
                                  {subs.map((p: any, idx: number) => (
                                    <div key={idx} className="flex items-center justify-between text-xs py-1.5 px-2 bg-slate-950/20 rounded-lg border border-slate-900/20">
                                      <div className="flex items-center gap-2">
                                        <span className="w-5 text-slate-600 font-bold text-right text-[10px]">#{p.jersey}</span>
                                        <span className="text-slate-400 font-bold">{p.athlete?.displayName}</span>
                                      </div>
                                      <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">{p.position?.displayName}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    };

                    return (
                      <div className="space-y-6">
                        {renderTeamLineup(homeRoster, homeName || 'Home')}
                        {renderTeamLineup(awayRoster, awayName || 'Away')}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {notification && (
        <div 
          className="fixed top-4 left-1/2 -translate-x-1/2 max-w-md w-[calc(100%-2rem)] bg-slate-950/95 border rounded-2xl p-3.5 shadow-2xl backdrop-blur-xl z-[9999] flex items-start gap-3 animate-slideDown"
          style={{ borderColor: notification.type === 'goal' ? '#10b981' : notification.type === 'card' ? '#f59e0b' : '#64748b' }}
        >
          <span className="text-2xl shrink-0">
            {notification.type === 'goal' ? '⚽' : notification.type === 'card' ? '🟨' : '🔔'}
          </span>
          <div className="flex-1 space-y-1 min-w-0">
            <div className="flex justify-between items-center">
              <span className={`text-[10px] font-black uppercase tracking-widest ${
                notification.type === 'goal' ? 'text-emerald-accent' : notification.type === 'card' ? 'text-amber-500' : 'text-slate-400'
              }`}>
                {notification.type === 'goal' ? '⚡ GOAL ALERT!' : notification.type === 'card' ? '🟡 CARD ISSUED' : '📢 FOUL REGISTERED'} ({notification.clock})
              </span>
              <button 
                onClick={() => setNotification(null)}
                className="text-slate-500 hover:text-white text-xs font-bold px-1.5 py-0.5 rounded cursor-pointer ml-2 shrink-0"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-200 font-medium leading-relaxed font-bangla">{notification.text}</p>
          </div>
        </div>
      )}
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
