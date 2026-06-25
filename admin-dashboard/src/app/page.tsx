'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { 
  Tv, 
  Info, 
  MapPin, 
  Calendar as CalendarIcon, 
  Loader2, 
  Bell, 
  ShieldAlert,
  X,
  ArrowLeft,
  Search
} from 'lucide-react';
import HlsPlayer from '@/components/HlsPlayer';
import PremiumPlayer from '@/components/PremiumPlayer';
import PotPlayer from '@/components/PotPlayer';
import AdsterraAd from '@/components/AdsterraAd';
import { syncLiveMatchScores } from '@/lib/auto-score-updater';

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

interface Announcement {
  id: string;
  title: string;
  message: string;
  priority: string;
}

export default function UserHomePage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'live' | 'upcoming' | 'finished' | 'channels'>('live');
  const [isNoticeModalOpen, setIsNoticeModalOpen] = useState(false);
  const [showNotificationToast, setShowNotificationToast] = useState(false);
  const [dismissedAnnouncements, setDismissedAnnouncements] = useState<Record<string, boolean>>({});
  const [selectedChannelUrl, setSelectedChannelUrl] = useState<string | null>(null);
  const [selectedChannelName, setSelectedChannelName] = useState<string>('');
  const [notification, setNotification] = useState<{
    id: string;
    text: string;
    type: 'goal' | 'card' | 'foul';
    clock: string;
  } | null>(null);

  // M3U Playlist States
  const [selectedPlaylist, setSelectedPlaylist] = useState<any | null>(null);
  const [playlistChannels, setPlaylistChannels] = useState<any[]>([]);
  const [loadingPlaylist, setLoadingPlaylist] = useState(false);
  const [playlistError, setPlaylistError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [upcomingSearchQuery, setUpcomingSearchQuery] = useState('');
  const [finishedSearchQuery, setFinishedSearchQuery] = useState('');

  const handleChannelSelect = async (chan: any) => {
    const isM3u = chan.url.toLowerCase().includes('.m3u') && !chan.url.toLowerCase().includes('.m3u8');
    
    if (isM3u) {
      setSelectedPlaylist(chan);
      setLoadingPlaylist(true);
      setPlaylistError(null);
      setPlaylistChannels([]);
      setSearchQuery('');
      
      try {
        const response = await fetch(`/api/proxy-m3u?url=${encodeURIComponent(chan.url)}`);
        const data = await response.json();
        
        if (data.success && data.channels && data.channels.length > 0) {
          setPlaylistChannels(data.channels);
          // Auto-play first sub-channel
          setSelectedChannelUrl(data.channels[0].url);
          setSelectedChannelName(`${chan.name} - ${data.channels[0].name}`);
        } else {
          throw new Error(data.error || 'No channels found in playlist.');
        }
      } catch (err: any) {
        console.error(err);
        setPlaylistError(err.message || 'Failed to fetch or parse M3U playlist.');
        setSelectedChannelUrl(chan.url);
        setSelectedChannelName(chan.name);
      } finally {
        setLoadingPlaylist(false);
      }
    } else {
      setSelectedPlaylist(null);
      setPlaylistChannels([]);
      setSelectedChannelUrl(chan.url);
      setSelectedChannelName(chan.name);
    }
  };

  // Fetch M3U TV channels
  const { data: channels = [], isLoading: isLoadingChannels } = useQuery<any[]>({
    queryKey: ['user-channels'],
    queryFn: async () => {
      const { data, error } = await supabase
          .from('m3u_channels')
          .select('*')
          .eq('is_enabled', true)
          .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: activeTab === 'channels'
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

  // Query total views from analytics table using optimized RPC
  const { data: totalViews = 0 } = useQuery({
    queryKey: ['total-views', ticker?.views_offset],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_total_views_count');
      if (error) throw error;
      const offset = ticker?.views_offset !== undefined ? ticker.views_offset : 0;
      return (data || 0) + offset;
    },
    refetchInterval: 60000 // optimized to 60s for high traffic performance
  });

  // Query live concurrent viewers from analytics using optimized RPC
  const { data: liveCount = 0 } = useQuery({
    queryKey: ['live-viewers-count', ticker?.viewers_offset],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_active_viewers_count');
      if (error) throw error;
      const offset = ticker?.viewers_offset !== undefined ? ticker.viewers_offset : 0;
      return (data || 0) + offset;
    },
    refetchInterval: 45000 // optimized to 45s for high traffic performance
  });

  // Fetch announcements
  const { data: announcements = [] } = useQuery<Announcement[]>({
    queryKey: ['user-announcements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('status', 'published')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
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
    },
    refetchInterval: 10000,
  });

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

  // Auto-select first channel when tab changes to channels
  useEffect(() => {
    if (activeTab === 'channels' && channels.length > 0 && !selectedChannelUrl) {
      handleChannelSelect(channels[0]);
    }
  }, [activeTab, channels, selectedChannelUrl]);

  // Show direct slide-in notice after 1.5s if not already dismissed in this session
  useEffect(() => {
    if (announcements.length > 0) {
      const dismissedId = sessionStorage.getItem('dismissed_announcement_id');
      if (dismissedId !== announcements[0].id) {
        const timer = setTimeout(() => {
          setShowNotificationToast(true);
        }, 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [announcements]);

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
      // Check if audio has already played in this JS load context
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
    // 'refresh' mode: no count check, always proceed

    let activeAudio: any = null;
    if (selectedAudioId) {
      activeAudio = audioAnnouncements.find((a: any) => a.id === selectedAudioId);
    }
    // Fallback to the latest past audio if selected one is not found or not set
    if (!activeAudio) {
      activeAudio = audioAnnouncements
        .filter((a: any) => new Date(a.play_at).getTime() <= Date.now())
        .pop();
    }

    let currentAudioElement: HTMLAudioElement | null = null;
    let playTimeout: NodeJS.Timeout | null = null;
    const futureTimeouts: NodeJS.Timeout[] = [];

    const playAudioUrl = (url: string) => {
      // Re-check limits before playing
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
              // Only set the "already played" flag for non-refresh modes
              if (playMode !== 'refresh') {
                (window as any).__audioPlayedInCurrentLoad = true;
              }
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

  // Fetch matches
  const { data: matches = [], isLoading } = useQuery<Match[]>({
    queryKey: ['user-matches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('matches')
        .select(`
          *,
          home_team:teams!matches_home_team_id_fkey(*),
          away_team:teams!matches_away_team_id_fkey(*)
        `)
        .order('match_timestamp', { ascending: true });
      if (error) throw error;
      return (data || []) as Match[];
    },
    refetchInterval: 5000, // Query matches list every 5 seconds for fast live updates!
  });

  const { data: espnScores = [] } = useQuery<any[]>({
    queryKey: ['homepage-espn-scores'],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/live-scores`);
        if (!res.ok) return [];
        const data = await res.json();
        return data.scores || [];
      } catch (e) {
        return [];
      }
    },
    refetchInterval: 5000, // Query scoreboard every 5 seconds for instant updates!
  });

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

  const isMatchLive = (m: Match) => {
    if (m.status === 'finished' || m.status === 'cancelled' || m.status === 'postponed') return false;
    const kickoff = new Date(m.match_timestamp).getTime();
    if (autoFinishEnabled && Date.now() >= (kickoff + matchDurationMins * 60 * 1000)) return false; // Finished dynamically

    if (systemConfig?.custom_scripts?.force_all_live && m.status === 'upcoming') return true;
    if (m.status === 'live' || m.status === 'half_time') return true;
    if (m.status === 'upcoming') {
      return Date.now() >= (kickoff - liveOffsetMins * 60 * 1000);
    }
    return false;
  };

  const isMatchUpcoming = (m: Match) => {
    if (m.status !== 'upcoming') return false;
    if (systemConfig?.custom_scripts?.force_all_live) return false;
    const kickoff = new Date(m.match_timestamp).getTime();
    
    // If it is live dynamically, it is not upcoming anymore
    if (Date.now() >= (kickoff - liveOffsetMins * 60 * 1000)) {
      if (!autoFinishEnabled || Date.now() < (kickoff + matchDurationMins * 60 * 1000)) {
        return false;
      }
    }
    return Date.now() < (kickoff - liveOffsetMins * 60 * 1000);
  };

  const liveList = matches.filter(m => isMatchLive(m));
  const upcomingList = matches.filter(m => isMatchUpcoming(m));
  const finishedList = matches
    .filter(m => 
      m.status === 'finished' || 
      m.status === 'cancelled' || 
      m.status === 'postponed' ||
      (autoFinishEnabled && m.status !== 'finished' && m.status !== 'cancelled' && m.status !== 'postponed' && Date.now() >= (new Date(m.match_timestamp).getTime() + matchDurationMins * 60 * 1000))
    )
    .sort((a, b) => new Date(b.match_timestamp).getTime() - new Date(a.match_timestamp).getTime());

  const filterMatches = (list: Match[], query: string) => {
    if (!query) return list;
    const lowerQuery = query.toLowerCase().trim();
    return list.filter(m => {
      const homeName = (m.home_team?.name || m.home_team_custom_name || '').toLowerCase();
      const awayName = (m.away_team?.name || m.away_team_custom_name || '').toLowerCase();
      const tournament = (m.tournament_name || '').toLowerCase();
      const matchDate = (m.match_date || '').toLowerCase();
      return homeName.includes(lowerQuery) || 
             awayName.includes(lowerQuery) || 
             tournament.includes(lowerQuery) || 
             matchDate.includes(lowerQuery);
    });
  };

  const filteredUpcoming = filterMatches(upcomingList, upcomingSearchQuery);
  const filteredFinished = filterMatches(finishedList, finishedSearchQuery);

  const currentList = whenTab(activeTab, liveList, filteredUpcoming, filteredFinished);

  function whenTab(tab: string, live: Match[], upcoming: Match[], finished: Match[]) {
    if (tab === 'live') return live;
    if (tab === 'upcoming') return upcoming;
    return finished;
  }

  const getTeamName = (match: Match, side: 'home' | 'away') => {
    if (side === 'home') {
      return match.home_team_id ? (match.home_team?.name) : match.home_team_custom_name;
    } else {
      return match.away_team_id ? (match.away_team?.name) : match.away_team_custom_name;
    }
  };

  const getTeamFlag = (match: Match, side: 'home' | 'away') => {
    if (side === 'home') {
      return match.home_team_id ? match.home_team?.flag_url : match.home_team_custom_flag;
    } else {
      return match.away_team_id ? match.away_team?.flag_url : match.away_team_custom_flag;
    }
  };

  // Auto-Update score and goals for active/live matches
  useEffect(() => {
    if (matches.length > 0 && systemConfig) {
      syncLiveMatchScores(supabase, matches, systemConfig).then((updated) => {
        if (updated) {
          queryClient.invalidateQueries({ queryKey: ['user-matches'] });
        }
      });
    }
  }, [matches, systemConfig, queryClient]);

  const uiTexts = systemConfig?.custom_scripts?.app_ui_texts || {};
  const noMatchesTitle = uiTexts.no_matches_title || (ticker as any)?.no_matches_title || "No Matches Broadcasts";
  const noMatchesDesc = uiTexts.no_matches_desc || (ticker as any)?.no_matches_desc || "There are no active matches in this tab. Tune in during kickoff schedules.";
  const headerSubtitle = uiTexts.header_subtitle || (ticker as any)?.header_subtitle || 'Premium Streaming Portal';
  const tickerBadge = uiTexts.ticker_badge || (ticker as any)?.ticker_badge || '⚡ NEWS TICKER';
  const tabLiveName = uiTexts.tab_live_name || (ticker as any)?.tab_live_name || '🔴 Live Now';
  const tabUpcomingName = uiTexts.tab_upcoming_name || (ticker as any)?.tab_upcoming_name || '📅 Upcoming Fixtures';
  const tabFinishedName = uiTexts.tab_finished_name || (ticker as any)?.tab_finished_name || '🏁 Finished Matches';
  const tabChannelsName = uiTexts.tab_channels_name || (ticker as any)?.tab_channels_name || '📺 Live Channels';

  return (
    <div className="min-h-screen bg-[#090c10] text-[#f0f3f8] flex flex-col font-sans">
      {/* Adsterra Popunder & Social Bar (Homepage) */}
      <AdsterraAd 
        htmlCode={adsterra?.popunder_script} 
        enabled={!!adsterra?.is_enabled && adsterra?.custom_scripts?.homepage?.popunder !== false} 
      />
      <AdsterraAd 
        htmlCode={adsterra?.social_bar_script} 
        enabled={!!adsterra?.is_enabled && adsterra?.custom_scripts?.homepage?.socialBar !== false} 
      />

      {/* Header Bar */}
      <header className="glass-panel border-b border-card-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 md:py-4 flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4">
          <div className="flex items-center justify-between w-full md:w-auto">
            <Link 
              href="/" 
              onClick={(e) => {
                if (window.location.pathname === '/') {
                  e.preventDefault();
                  window.location.reload();
                }
              }}
              className="flex items-center gap-3 cursor-pointer select-none"
            >
              {ticker?.use_logo_image && ticker?.logo_url ? (
                <img 
                  src={ticker.logo_url} 
                  alt={ticker?.site_name || "Site Logo"} 
                  className="h-10 md:h-14 w-auto max-w-[200px] md:max-w-[280px] object-contain hover:scale-[1.02] transition-transform duration-200" 
                />
              ) : (
                <div className="flex items-center gap-3">
                  {ticker?.logo_url ? (
                    <img 
                      src={ticker.logo_url} 
                      alt="Site Logo" 
                      className="h-8 w-8 object-contain rounded-lg border border-card-border" 
                    />
                  ) : (
                    <span className="text-2xl">🏆</span>
                  )}
                  <div>
                    <h1 className="font-black text-sm tracking-wider uppercase text-white">
                      {ticker?.site_name || 'WORLD CUP 2026'}
                    </h1>
                    <p className="text-[9px] text-emerald-accent font-bold uppercase tracking-widest">
                      {headerSubtitle}
                    </p>
                  </div>
                </div>
              )}
            </Link>

            {/* Mobile-only Bell Button */}
            <div className="flex items-center gap-2 md:hidden">
              <button
                onClick={() => setIsNoticeModalOpen(true)}
                className="relative p-2 bg-slate-900 hover:bg-slate-800 text-white border border-card-border rounded-xl transition-all flex items-center justify-center cursor-pointer"
                title="Announcements"
              >
                <Bell className="h-4.5 w-4.5 text-emerald-accent" />
                {announcements.filter(ann => !dismissedAnnouncements[ann.id]).length > 0 && (
                  <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-red-600 border border-[#090c10] text-[8px] font-black text-white flex items-center justify-center">
                    {announcements.filter(ann => !dismissedAnnouncements[ann.id]).length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Navigation and Bell container */}
          <div className="flex items-center gap-3 overflow-x-auto md:overflow-visible w-full md:w-auto pb-1 md:pb-0 scrollbar-none justify-start md:justify-end">
            <nav className="flex items-center gap-1 bg-slate-950/40 p-1 border border-card-border rounded-2xl shrink-0">
              {(['live', 'upcoming', 'finished', 'channels'] as const).map((tab) => {
                const isActive = activeTab === tab;
                const tabLabel = tab === 'live' 
                  ? '🔴 Live Now'
                  : tab === 'upcoming' 
                    ? '📅 Upcoming' 
                    : tab === 'finished'
                      ? '🏁 Finished'
                      : '📺 Channels';
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-2 py-1.5 rounded-xl text-[9px] md:text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                      isActive
                        ? 'bg-emerald-accent text-black font-extrabold shadow-sm'
                        : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
                    }`}
                  >
                    {tabLabel}
                  </button>
                );
              })}
            </nav>

            {/* Desktop-only Bell Button */}
            <button
              onClick={() => setIsNoticeModalOpen(true)}
              className="hidden md:flex relative p-2.5 bg-slate-900 hover:bg-slate-800 text-white border border-card-border rounded-xl transition-all items-center justify-center gap-1.5 cursor-pointer"
              title="View Announcements"
            >
              <Bell className="h-5 w-5 text-emerald-accent" />
              {announcements.filter(ann => !dismissedAnnouncements[ann.id]).length > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-600 border border-[#090c10] text-[9px] font-black text-white flex items-center justify-center">
                  {announcements.filter(ann => !dismissedAnnouncements[ann.id]).length}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Ticker Marquee Headline */}
      {ticker && ticker.is_enabled && (
        <div className="bg-gradient-to-r from-red-950/80 via-[#0f1422] to-red-950/80 border-b border-card-border py-2 relative overflow-hidden flex items-center h-9 z-40">
          <div className="absolute left-0 top-0 bottom-0 px-3.5 bg-red-600 text-white font-black uppercase tracking-wider text-[9px] flex items-center justify-center z-10 shadow-md">
            {tickerBadge}
          </div>
          
          <div className="w-full whitespace-nowrap overflow-hidden">
            <span className="animate-marquee text-xs font-bold text-white tracking-wide font-bangla">
              {ticker.ticker_text}
            </span>
          </div>
        </div>
      )}

      {/* Announcements Slider */}
      {(() => {
        const activeAnnouncement = announcements.find(ann => !dismissedAnnouncements[ann.id]);
        if (!activeAnnouncement) return null;
        return (
          <div className="max-w-7xl mx-auto w-full px-6 pt-6 animate-in fade-in duration-300">
            <div className="bg-gradient-to-r from-emerald-500/10 to-gold-accent/5 border border-emerald-500/20 p-4 rounded-2xl flex items-center justify-between gap-3 relative pr-12">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 shrink-0 bg-emerald-500/20 border border-emerald-500/30 rounded-xl flex items-center justify-center text-emerald-accent">
                  <Bell className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black uppercase text-white tracking-wide font-bangla">
                    {activeAnnouncement.title}
                  </h4>
                  <p className="text-xs text-slate-300 font-medium mt-0.5 font-bangla">
                    {activeAnnouncement.message}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDismissedAnnouncements(prev => ({ ...prev, [activeAnnouncement.id]: true }))}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-white hover:bg-slate-900/60 rounded-xl border border-transparent hover:border-slate-800 transition-all cursor-pointer"
                title="Dismiss Notice"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>
          </div>
        );
      })()}

      {/* Main Container */}
      <main className="max-w-7xl mx-auto w-full px-6 py-8 flex-1 space-y-8">
        
        {/* Header Top Ad */}
        {getAdForPlacement('headerTop')}
        
        {/* Banner Section */}
        <section className="w-full rounded-3xl overflow-hidden border border-card-border shadow-2xl bg-[#090c10]">
          <img 
            src={ticker?.banner_url || "/banner.png"} 
            alt="Live Sports Broadcasts - Watch FIFA World Cup 2026 Live Streams" 
            className="w-full h-auto block" 
          />
        </section>

        {/* Ad after Hero Banner */}
        {getAdForPlacement('afterBanner')}

        {/* Tab Row */}
        <div className="flex border-b border-card-border overflow-x-auto">
          {(['live', 'upcoming', 'finished', 'channels'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3.5 font-black uppercase text-xs tracking-wider border-b-2 transition-all cursor-pointer shrink-0 ${
                activeTab === tab
                  ? 'border-emerald-accent text-emerald-accent'
                  : 'border-transparent text-slate-500 hover:text-white'
              }`}
            >
              {tab === 'live' 
                ? tabLiveName
                : tab === 'upcoming' 
                  ? tabUpcomingName 
                  : tab === 'finished'
                    ? tabFinishedName
                    : tabChannelsName}
            </button>
          ))}
        </div>

        {/* Adsterra Native Banner (Homepage) */}
        <AdsterraAd 
          htmlCode={adsterra?.native_script} 
          enabled={!!adsterra?.is_enabled && adsterra?.custom_scripts?.homepage?.nativeBanner !== false} 
        />

        {/* Tab Content */}
        {activeTab !== 'channels' ? (
          isLoading ? (
            <div className="flex flex-col items-center justify-center py-24">
              <Loader2 className="h-8 w-8 text-emerald-accent animate-spin" />
              <p className="text-sm text-slate-400 mt-4">Loading streaming schedule...</p>
            </div>
          ) : (
            <>
              {/* Search Bar for Upcoming or Finished Matches */}
              {(activeTab === 'upcoming' || activeTab === 'finished') && (
                <div className="mb-6 relative">
                  <input
                    type="text"
                    value={activeTab === 'upcoming' ? upcomingSearchQuery : finishedSearchQuery}
                    onChange={(e) => {
                      if (activeTab === 'upcoming') {
                        setUpcomingSearchQuery(e.target.value);
                      } else {
                        setFinishedSearchQuery(e.target.value);
                      }
                    }}
                    placeholder={activeTab === 'upcoming' ? "অনুসন্ধান করুন (যেমন: Brazil, Group-A, 2026-06-25)..." : "অনুসন্ধান করুন (যেমন: Argentina, Brazil)..."}
                    className="w-full px-5 py-3.5 pl-12 glass-input rounded-2xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-slate-700 transition-all border border-card-border shadow-inner font-bangla"
                  />
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                  {(activeTab === 'upcoming' ? upcomingSearchQuery : finishedSearchQuery) && (
                    <button
                      onClick={() => {
                        if (activeTab === 'upcoming') {
                          setUpcomingSearchQuery('');
                        } else {
                          setFinishedSearchQuery('');
                        }
                      }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-all text-xs font-bold uppercase tracking-wider bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1"
                    >
                      Clear
                    </button>
                  )}
                </div>
              )}

              {currentList.length === 0 ? (
                <div className="glass-panel p-16 text-center rounded-3xl border border-card-border">
                  <Tv className="h-12 w-12 text-slate-700 mx-auto mb-4" />
                  <h3 className="text-lg font-black text-white uppercase font-bangla">
                    {((activeTab === 'upcoming' && upcomingSearchQuery) || (activeTab === 'finished' && finishedSearchQuery))
                      ? "অনুসন্ধানের সাথে মিল পাওয়া যায়নি!"
                      : noMatchesTitle}
                  </h3>
                  <p className="text-sm text-slate-400 mt-1 font-bangla">
                    {((activeTab === 'upcoming' && upcomingSearchQuery) || (activeTab === 'finished' && finishedSearchQuery))
                      ? "দয়া করে অন্য কোনো দলের নাম বা কি-ওয়ার্ড দিয়ে চেষ্টা করুন।"
                      : noMatchesDesc}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {currentList.flatMap((match, index) => {
                    const homeFlag = getTeamFlag(match, 'home');
                    const awayFlag = getTeamFlag(match, 'away');
                    const homeName = getTeamName(match, 'home') || 'Home Team';
                    const awayName = getTeamName(match, 'away') || 'Away Team';
                    
                    const isLive = isMatchLive(match);
                    const isUpcoming = isMatchUpcoming(match);

                    const elements = [
                      <div 
                        key={match.id} 
                        className="glass-panel p-6 rounded-3xl border border-card-border flex flex-col justify-between gap-6 hover:border-slate-800 transition-all duration-200"
                      >
                        <div className="flex justify-between items-start">
                          <span className="px-2.5 py-0.5 bg-slate-900 border border-slate-800 rounded-lg text-[9px] font-black uppercase tracking-wider text-slate-400">
                            {match.tournament_name}
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                            isLive 
                              ? 'bg-red-500/10 text-red-400 border-red-500/25 animate-pulse'
                              : isUpcoming 
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                                : 'bg-slate-800 text-slate-500 border-slate-700'
                          }`}>
                            {isLive ? `LIVE ${match.live_minute ? `• ${match.live_minute}` : ''}` : match.status}
                          </span>
                        </div>

                        {/* Teams and scores */}
                        <div className="flex items-center justify-between text-center gap-1.5">
                          <div className="w-[38%] shrink-0 flex flex-col items-center gap-2 min-w-0">
                            <div className="h-14 w-20 bg-slate-900/60 rounded-2xl overflow-hidden border border-card-border flex items-center justify-center p-1 shadow">
                              {homeFlag ? (
                                <img src={homeFlag} alt={homeName} className="h-full w-full object-cover rounded-lg" />
                              ) : (
                                <span className="text-xs text-slate-500 font-black">HOME</span>
                              )}
                            </div>
                            <span className="font-extrabold text-white text-sm line-clamp-1 w-full">{homeName}</span>
                          </div>

                          <div className="w-[24%] shrink-0 flex flex-col items-center justify-center">
                            {(isLive || match.status === 'finished' || (autoFinishEnabled && Date.now() >= (new Date(match.match_timestamp).getTime() + matchDurationMins * 60 * 1000))) ? (
                              <span className="text-2xl md:text-3xl font-black text-white tracking-tight whitespace-nowrap">{match.home_score} - {match.away_score}</span>
                            ) : (
                              <span className="px-2.5 py-1 bg-slate-950 border border-slate-800 text-xs font-black rounded-lg text-slate-500 whitespace-nowrap">VS</span>
                            )}
                          </div>

                          <div className="w-[38%] shrink-0 flex flex-col items-center gap-2 min-w-0">
                            <div className="h-14 w-20 bg-slate-900/60 rounded-2xl overflow-hidden border border-card-border flex items-center justify-center p-1 shadow">
                              {awayFlag ? (
                                <img src={awayFlag} alt={awayName} className="h-full w-full object-cover rounded-lg" />
                              ) : (
                                <span className="text-xs text-slate-500 font-black">AWAY</span>
                              )}
                            </div>
                            <span className="font-extrabold text-white text-sm line-clamp-1 w-full">{awayName}</span>
                          </div>
                        </div>

                        {/* Goal Scorers details */}
                        {(match.home_scorers || match.away_scorers) && (
                          <div className="text-[10px] text-slate-400 bg-slate-950/40 p-2 rounded-xl border border-slate-900/50 flex justify-between gap-2 mt-1">
                            <div className="w-[45%] text-left text-slate-300 font-medium break-words">
                              {match.home_scorers || ""}
                            </div>
                            <div className="w-[10%] text-center text-slate-500 font-bold">⚽</div>
                            <div className="w-[45%] text-right text-slate-300 font-medium break-words">
                              {match.away_scorers || ""}
                            </div>
                          </div>
                        )}

                        {/* Countdown Timer for Upcoming Matches */}
                        {isUpcoming && <WebCountdown targetTime={match.match_timestamp} />}

                        {/* Stadium & Kickoff Info */}
                        <div className="text-center space-y-1">
                          <p className="text-slate-400 text-xs font-bold flex items-center justify-center gap-1">
                            <MapPin className="h-3.5 w-3.5 text-emerald-accent" />
                            {match.stadium_name}
                          </p>
                          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1">
                            <CalendarIcon className="h-3 w-3" />
                            {match.match_date} • {match.match_time.substring(0, 5)}
                          </p>
                        </div>

                        {/* Controls */}
                        <div className="flex gap-4 border-t border-card-border pt-4">
                          <Link
                            href={`/details/${match.id}`}
                            className="flex-1 py-3 border border-slate-850 hover:bg-slate-800 text-slate-300 font-bold uppercase text-xs tracking-wider rounded-xl transition-all flex items-center justify-center gap-2"
                          >
                            <Info className="h-4 w-4" />
                            Details
                          </Link>
                          {(isLive || isUpcoming) && (
                            <Link
                              href={`/watch/${match.id}`}
                              className="flex-1 py-3 bg-emerald-accent hover:bg-emerald-500 text-black font-black uppercase text-xs tracking-wider rounded-xl transition-all flex items-center justify-center gap-2"
                            >
                              <Tv className="h-4 w-4" />
                              {isLive ? 'Watch Live' : 'Watch Feed'}
                            </Link>
                          )}
                        </div>
                      </div>
                    ];

                    if ((index + 1) % 4 === 0) {
                      const ad = getAdForPlacement('betweenMatches');
                      if (ad) {
                        elements.push(
                          <div key={`ad-${index}`} className="md:col-span-2 w-full flex justify-center py-4">
                            {ad}
                          </div>
                        );
                      }
                    }
                    return elements;
                  })}
                </div>
              )}
            </>
          )
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* TV Stream Player */}
          <div className="lg:col-span-2 space-y-4">
            <div className="aspect-video w-full relative bg-black rounded-3xl overflow-hidden border border-card-border shadow-2xl">
              {selectedChannelUrl ? (
                systemConfig?.custom_scripts?.active_player === 'player_2' ? (
                  <PremiumPlayer 
                    url={selectedChannelUrl} 
                    onError={(err) => console.error(err)} 
                  />
                ) : systemConfig?.custom_scripts?.active_player === 'pot_player' ? (
                  <PotPlayer 
                    url={selectedChannelUrl} 
                    onError={(err) => console.error(err)} 
                  />
                ) : (
                  <HlsPlayer 
                    url={selectedChannelUrl} 
                    onError={(err) => console.error(err)} 
                  />
                )
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500">
                  <Tv className="h-12 w-12 mb-3 animate-pulse text-slate-600" />
                  <span className="text-xs uppercase font-black tracking-widest">Select a channel to play</span>
                </div>
              )}
            </div>
            {selectedChannelName && (
              <div className="flex items-center justify-between p-4 glass-panel rounded-2xl border border-card-border">
                <div>
                  <span className="text-[10px] text-emerald-accent font-black uppercase tracking-widest">Now Broadcasting</span>
                  <h3 className="text-base font-black text-white mt-0.5">{selectedChannelName}</h3>
                </div>
                <span className="px-2.5 py-0.5 bg-red-500/10 text-red-400 border border-red-500/25 rounded-full text-[9px] font-black uppercase tracking-wider animate-pulse flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                  Live TV Feed
                </span>
              </div>
            )}
          </div>

          {/* TV Channels List / M3U Playlist Browser */}
          <div className="glass-panel p-6 rounded-3xl border border-card-border flex flex-col gap-4">
            {selectedPlaylist ? (
              // Playlist Browser Mode
              <>
                <div className="space-y-3">
                  <button 
                    onClick={() => {
                      setSelectedPlaylist(null);
                      setPlaylistChannels([]);
                      setPlaylistError(null);
                    }}
                    className="flex items-center gap-1.5 text-xs text-emerald-accent hover:text-emerald-400 font-extrabold uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Streams
                  </button>
                  <div>
                    <h3 className="font-black text-sm text-white uppercase tracking-wider truncate">
                      {selectedPlaylist.name}
                    </h3>
                    <p className="text-[9px] text-slate-500 font-bold uppercase mt-0.5">
                      {loadingPlaylist 
                        ? 'Loading channel list...' 
                        : playlistError 
                          ? 'Error loading channels' 
                          : `${playlistChannels.length} channels available`}
                    </p>
                  </div>

                  {playlistChannels.length > 0 && (
                    <div className="relative mt-2">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                      <input
                        type="text"
                        placeholder="Search channels..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-slate-950/60 border border-slate-900 focus:border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none transition-all"
                      />
                    </div>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 max-h-[350px] pr-1">
                  {loadingPlaylist ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 text-emerald-accent animate-spin" />
                      <span className="text-[10px] text-slate-500 font-bold uppercase mt-2">Parsing Playlist...</span>
                    </div>
                  ) : playlistError ? (
                    <div className="text-center py-8 text-red-400 text-xs font-bold uppercase border border-red-950/20 bg-red-950/5 rounded-2xl p-4">
                      {playlistError}
                    </div>
                  ) : (
                    (() => {
                      const filtered = playlistChannels.filter(c => 
                        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (c.group && c.group.toLowerCase().includes(searchQuery.toLowerCase()))
                      );

                      if (filtered.length === 0) {
                        return (
                          <div className="text-center py-12 text-slate-500 text-xs font-bold uppercase tracking-wide">
                            No channels match search.
                          </div>
                        );
                      }

                      return filtered.map((subChan, idx) => {
                        const isSubPlaying = selectedChannelUrl === subChan.url;
                        return (
                          <button
                            key={idx}
                            onClick={() => {
                              setSelectedChannelUrl(subChan.url);
                              setSelectedChannelName(`${selectedPlaylist.name} - ${subChan.name}`);
                            }}
                            className={`w-full p-2.5 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                              isSubPlaying 
                                ? 'bg-emerald-500/10 border-emerald-accent text-white' 
                                : 'bg-slate-950/30 border-slate-900/60 text-slate-400 hover:border-slate-800 hover:text-white'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="h-7 w-9 bg-slate-900/80 rounded-lg overflow-hidden border border-card-border/60 flex items-center justify-center shrink-0">
                                {subChan.logo ? (
                                  <img 
                                    src={subChan.logo} 
                                    alt="" 
                                    className="h-full w-full object-cover" 
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src = '';
                                    }}
                                  />
                                ) : (
                                  <Tv className="h-3.5 w-3.5 text-slate-500" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <span className="text-[11px] font-extrabold truncate block">{subChan.name}</span>
                                {subChan.group && (
                                  <span className="text-[8px] text-slate-500 font-bold block uppercase tracking-wide truncate">{subChan.group}</span>
                                )}
                              </div>
                            </div>
                            {isSubPlaying && (
                              <span className="text-[8px] font-black text-emerald-accent uppercase tracking-widest shrink-0">
                                Playing
                              </span>
                            )}
                          </button>
                        );
                      });
                    })()
                  )}
                </div>
              </>
            ) : (
              // Main Channels List Mode
              <>
                <div>
                  <h3 className="font-black text-xs text-white uppercase tracking-wider">M3U TV Channels</h3>
                  <p className="text-[9px] text-slate-500 font-bold uppercase mt-0.5">Click server to load player</p>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[350px] pr-1">
                  {isLoadingChannels ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 text-emerald-accent animate-spin" />
                    </div>
                  ) : channels.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 text-xs font-bold uppercase tracking-wide">
                      No TV channels active.
                    </div>
                  ) : (
                    channels.map((chan) => {
                      const isPlaying = selectedChannelUrl === chan.url || (selectedPlaylist && selectedPlaylist.id === chan.id);
                      const isM3u = chan.url.toLowerCase().includes('.m3u') && !chan.url.toLowerCase().includes('.m3u8');
                      
                      return (
                        <button
                          key={chan.id}
                          onClick={() => handleChannelSelect(chan)}
                          className={`w-full p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                            isPlaying 
                              ? 'bg-emerald-500/10 border-emerald-accent text-white shadow-lg shadow-emerald-500/5' 
                              : 'bg-slate-950/40 border-slate-900 text-slate-400 hover:border-slate-800 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-8 w-11 bg-slate-900/60 rounded-xl overflow-hidden border border-card-border flex items-center justify-center shrink-0">
                              {chan.logo_url ? (
                                <img src={chan.logo_url} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <Tv className="h-4.5 w-4.5 text-slate-500" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <span className="text-xs font-black truncate block">{chan.name}</span>
                              <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider block mt-0.5">
                                {isM3u ? '📁 M3U Playlist' : '📺 Direct Stream'}
                              </span>
                            </div>
                          </div>
                          {isPlaying && (
                            <span className="text-[9px] font-black text-emerald-accent uppercase tracking-widest shrink-0">
                              Active
                            </span>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
      </main>

      {/* Before Footer Ad */}
      {getAdForPlacement('beforeFooter')}

      {/* Real-time counters panel */}
      {ticker && ticker.show_counters && (
        <div className="max-w-7xl mx-auto w-full px-6 mt-8">
          <div className="glass-panel p-6 rounded-3xl border border-card-border flex flex-col sm:flex-row justify-around items-center gap-6 text-center bg-gradient-to-r from-emerald-500/5 via-slate-900/40 to-emerald-500/5">
            <div className="space-y-1">
              <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest block">Total Platform Views</span>
              <span className="text-3xl font-black text-white tracking-tight">{totalViews.toLocaleString()}</span>
            </div>
            
            <div className="h-px w-12 sm:h-12 sm:w-px bg-card-border" />
            
            <div className="space-y-1">
              <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest block flex items-center justify-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
                Active Concurrent Viewers
              </span>
              <span className="text-3xl font-black text-emerald-accent tracking-tight">{liveCount.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}

      {/* Footer credits */}
      <footer className="border-t border-card-border bg-[#07090d]/60 py-6 text-center text-xs font-bold text-slate-500 uppercase tracking-widest mt-auto">
        Developed by{' '}
        <a 
          href="https://tanvirtossar.netlify.app/" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-emerald-accent hover:text-emerald-400 underline decoration-dotted transition-colors"
        >
          Tanvir Hossain
        </a>
      </footer>

      {/* Notifications / Announcements Modal */}
      {isNoticeModalOpen && (() => {
        const visibleAnnouncements = announcements.filter(ann => !dismissedAnnouncements[ann.id]);
        return (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-lg glass-panel p-6 rounded-3xl space-y-6 relative border border-card-border shadow-2xl">
              <div className="flex justify-between items-center pb-3 border-b border-card-border">
                <div className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-emerald-accent" />
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">
                    Important Broadcasts ({visibleAnnouncements.length})
                  </h3>
                </div>
                <button 
                  onClick={() => setIsNoticeModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent hover:border-slate-800 rounded-xl transition-all cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="max-h-[300px] overflow-y-auto pr-1 space-y-4">
                {visibleAnnouncements.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-xs font-semibold uppercase">
                    No active broadcasts found.
                  </div>
                ) : (
                  visibleAnnouncements.map((ann) => {
                    const isHighPriority = ann.priority === 'high';
                    return (
                      <div 
                        key={ann.id} 
                        className={`p-4 rounded-2xl border transition-all relative pr-10 ${
                          isHighPriority 
                            ? 'bg-red-500/5 border-red-500/20' 
                            : 'bg-slate-950/40 border-slate-900'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <h4 className="text-sm font-black text-white tracking-wide font-bangla">{ann.title}</h4>
                          {isHighPriority && (
                            <span className="px-2 py-0.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded text-[8px] font-black uppercase tracking-wider shrink-0">
                              Urgent
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-300 font-medium mt-1.5 leading-relaxed font-bangla">
                          {ann.message}
                        </p>
                        <button
                          onClick={() => setDismissedAnnouncements(prev => ({ ...prev, [ann.id]: true }))}
                          className="absolute right-3 top-3 p-1 text-slate-500 hover:text-slate-300 hover:bg-slate-900/60 rounded-lg transition-all cursor-pointer"
                          title="Dismiss notice"
                        >
                          <X className="h-4.5 w-4.5" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

            <div className="pt-4 border-t border-card-border flex justify-end">
              <button
                onClick={() => setIsNoticeModalOpen(false)}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold uppercase text-xs tracking-wider rounded-xl transition-all border border-card-border cursor-pointer"
              >
                Dismiss
              </button>
            </div>
            </div>
          </div>
        );
      })()}

      {/* Slide-in Notice Toast */}
      {showNotificationToast && announcements.length > 0 && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-[#0d131f]/90 backdrop-blur-md border border-emerald-500/30 rounded-2xl shadow-2xl p-4 animate-slide-in flex gap-3 text-white">
          <div className="h-9 w-9 shrink-0 bg-emerald-500/20 border border-emerald-500/30 rounded-xl flex items-center justify-center text-emerald-accent">
            <Bell className="h-4.5 w-4.5 animate-bounce" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h4 className="text-xs font-black uppercase tracking-wider truncate">
                {announcements[0].title}
              </h4>
              <button 
                onClick={() => {
                  setShowNotificationToast(false);
                  sessionStorage.setItem('dismissed_announcement_id', announcements[0].id);
                }}
                className="text-slate-400 hover:text-white p-0.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="text-[11px] text-slate-300 font-medium mt-1.5 leading-relaxed line-clamp-3">
              {announcements[0].message}
            </p>
          </div>
        </div>
      )}

      {/* Background commentary event trackers for live matches */}
      {systemConfig?.custom_scripts?.enable_live_notifications !== false && 
        matches.filter(isMatchLive).map((m) => {
          const homeN = m.home_team_id ? m.home_team?.name : m.home_team_custom_name;
          const awayN = m.away_team_id ? m.away_team?.name : m.away_team_custom_name;
          const esScore = espnScores.find(es => 
            (teamsMatch(homeN || '', es.homeTeam) && teamsMatch(awayN || '', es.awayTeam)) ||
            (teamsMatch(homeN || '', es.awayTeam) && teamsMatch(awayN || '', es.homeTeam))
          );
          const eventId = esScore?.espnEventId;
          if (!eventId) return null;
          
          return (
            <LiveMatchEventTracker 
              key={m.id}
              espnEventId={eventId}
              enableNotifications={systemConfig?.custom_scripts?.enable_live_notifications !== false}
              onEventTriggered={(event) => {
                setNotification(event);
                playCelebrationSound(event.type);
                
                setTimeout(() => {
                  setNotification(prev => prev?.id === event.id ? null : prev);
                }, 4000);
              }}
            />
          );
        })
      }

      {/* Live event notification popup - top of page */}
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

// Client Countdown React Component
function WebCountdown({ targetTime }: { targetTime: string }) {
  const targetTimestamp = new Date(targetTime).getTime();
  const [timeRemaining, setTimeRemaining] = useState(0);

  useEffect(() => {
    setTimeRemaining(targetTimestamp - Date.now());
    const interval = setInterval(() => {
      const remaining = targetTimestamp - Date.now();
      setTimeRemaining(remaining);
      if (remaining <= 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [targetTimestamp]);

  if (timeRemaining <= 0) {
    return (
      <div className="text-center text-xs font-black text-emerald-accent uppercase tracking-widest">
        Match Started!
      </div>
    );
  }

  const seconds = Math.floor((timeRemaining / 1000) % 60);
  const minutes = Math.floor((timeRemaining / (1000 * 60)) % 60);
  const hours = Math.floor((timeRemaining / (1000 * 60 * 60)) % 24);
  const days = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));

  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Starts In</span>
      <div className="flex items-center gap-1 text-sm font-black text-white">
        <span className="px-2 py-1 bg-slate-950 border border-slate-900 rounded-lg">{String(days).padStart(2, '0')}d</span>
        <span>:</span>
        <span className="px-2 py-1 bg-slate-950 border border-slate-900 rounded-lg">{String(hours).padStart(2, '0')}h</span>
        <span>:</span>
        <span className="px-2 py-1 bg-slate-950 border border-slate-900 rounded-lg">{String(minutes).padStart(2, '0')}m</span>
        <span>:</span>
        <span className="px-2 py-1 bg-slate-950 border border-slate-900 rounded-lg">{String(seconds).padStart(2, '0')}s</span>
      </div>
    </div>
  );
}

function LiveMatchEventTracker({ 
  espnEventId, 
  enableNotifications,
  onEventTriggered
}: { 
  espnEventId: string; 
  enableNotifications: boolean;
  onEventTriggered: (event: any) => void;
}) {
  const { data } = useQuery({
    queryKey: ['live-commentary-tracker', espnEventId],
    queryFn: async () => {
      const res = await fetch(`/api/live-commentary?event=${espnEventId}`);
      if (!res.ok) throw new Error('Failed to fetch tracker commentary');
      return res.json();
    },
    enabled: !!espnEventId && enableNotifications,
    refetchInterval: 4000, // Poll every 4 seconds for fastest updates
  });

  const processedEventsRef = useRef<Set<string>>(new Set());
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (!data?.keyEvents) return;
    
    // On first load, record all existing event IDs so we don't fire old notifications
    if (!isInitialized) {
      const initialIds = new Set<string>();
      for (const ev of data.keyEvents) {
        initialIds.add(ev.id);
      }
      processedEventsRef.current = initialIds;
      setIsInitialized(true);
      return;
    }

    // Check for new events we haven't processed yet
    for (const event of data.keyEvents) {
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
        if (enableNotifications) {
          onEventTriggered({
            id: event.id,
            text: event.text,
            type,
            clock: event.clock || "0'"
          });
        }
      }
      
      processedEventsRef.current.add(event.id);
    }
  }, [data, isInitialized, enableNotifications]);

  return null;
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

// Shared AudioContext for mobile compatibility (reuse instead of creating new ones)
let _sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    if (_sharedAudioCtx && _sharedAudioCtx.state !== 'closed') {
      // Resume if suspended (mobile browsers suspend after tab switch)
      if (_sharedAudioCtx.state === 'suspended') {
        _sharedAudioCtx.resume().catch(() => {});
      }
      return _sharedAudioCtx;
    }
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return null;
    _sharedAudioCtx = new AudioContextClass();
    return _sharedAudioCtx;
  } catch (e) {
    return null;
  }
}

// Initialize AudioContext on first user interaction (required for mobile)
if (typeof window !== 'undefined') {
  const initAudioOnInteraction = () => {
    getAudioContext();
    window.removeEventListener('touchstart', initAudioOnInteraction);
    window.removeEventListener('click', initAudioOnInteraction);
  };
  window.addEventListener('touchstart', initAudioOnInteraction, { once: true });
  window.addEventListener('click', initAudioOnInteraction, { once: true });
}

function playCelebrationSound(type: 'goal' | 'card' | 'foul') {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    
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
          const osc2 = ctx.createOscillator();
          const gain2 = ctx.createGain();
          osc2.type = 'sine';
          osc2.frequency.setValueAtTime(1100, ctx.currentTime);
          osc2.frequency.linearRampToValueAtTime(1300, ctx.currentTime + 0.15);
          gain2.gain.setValueAtTime(0, ctx.currentTime);
          gain2.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.05);
          gain2.gain.setValueAtTime(0.15, ctx.currentTime + 0.2);
          gain2.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.25);
          osc2.connect(gain2);
          gain2.connect(ctx.destination);
          osc2.start();
          osc2.stop(ctx.currentTime + 0.3);
        }, 350);
      }
    }
  } catch (e) {
    console.warn('Audio Context failed to play sound:', e);
  }
}
