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
  Search,
  Plus,
  Upload,
  Link as LinkIcon,
  Trash2,
  MessageSquare,
  Trophy,
  Activity,
  Users,
  Check,
  RefreshCw
} from 'lucide-react';
import HlsPlayer from '@/components/HlsPlayer';
import PremiumPlayer from '@/components/PremiumPlayer';
import PotPlayer from '@/components/PotPlayer';
import Engine4Player from '@/components/Engine4Player';
import AdsterraAd from '@/components/AdsterraAd';
import { useBlackScreenDetector } from '@/components/useBlackScreenDetector';
import { syncLiveMatchScores, fetchESPNScoresDirect, teamsMatch, normalizeTeamName } from '@/lib/auto-score-updater';

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
  const [activeTab, setActiveTab] = useState<'streaming' | 'live' | 'upcoming' | 'finished' | 'channels'>('live');
  const [isNoticeModalOpen, setIsNoticeModalOpen] = useState(false);
  const [showNotificationToast, setShowNotificationToast] = useState(false);
  const [dismissedAnnouncements, setDismissedAnnouncements] = useState<Record<string, boolean>>({});
  const [selectedChannelUrl, setSelectedChannelUrl] = useState<string | null>(null);
  const [selectedChannelName, setSelectedChannelName] = useState<string>('');
  const [notificationsList, setNotificationsList] = useState<any[]>([]);
  const [activeToasts, setActiveToasts] = useState<any[]>([]);

  // Streaming Now tab states
  const [streamingUrlIndex, setStreamingUrlIndex] = useState(0);
  const [streamingPlayError, setStreamingPlayError] = useState<string | null>(null);
  const [isStreamingReconnecting, setIsStreamingReconnecting] = useState(false);
  const [streamingBufferState, setStreamingBufferState] = useState<'Healthy' | 'Stalled'>('Healthy');
  const [streamingPlayerKey, setStreamingPlayerKey] = useState(0);
  const [activeSideTab, setActiveSideTab] = useState<'commentary' | 'events' | 'telemetry' | 'lineup'>('commentary');
  const [hasInitializedTab, setHasInitializedTab] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [timeUntilKickoff, setTimeUntilKickoff] = useState<number>(Infinity);

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('live_notifications_history');
        if (stored) {
          setNotificationsList(JSON.parse(stored));
        }
      } catch (e) {
        console.error('Failed to load notifications from localStorage', e);
      }
    }
  }, []);

  // Save to localStorage
  const saveNotifications = (list: any[] | ((prev: any[]) => any[])) => {
    if (typeof list === 'function') {
      setNotificationsList(prev => {
        const updated = list(prev);
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('live_notifications_history', JSON.stringify(updated));
          } catch (e) {}
        }
        return updated;
      });
    } else {
      setNotificationsList(list);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('live_notifications_history', JSON.stringify(list));
        } catch (e) {}
      }
    }
  };

  const handleEventTriggered = (event: { id: string; text: string; type: 'goal' | 'card' | 'foul'; clock: string; matchTitle?: string }) => {
    const newItem = {
      id: event.id,
      text: event.text,
      type: event.type,
      clock: event.clock,
      matchTitle: event.matchTitle,
      timestamp: Date.now()
    };

    // Play sound
    playCelebrationSound(event.type);

    // Save to history list
    saveNotifications(prev => {
      if (prev.some(item => item.id === event.id)) return prev;
      return [newItem, ...prev].slice(0, 50);
    });

    // Add to active toasts
    setActiveToasts(prev => {
      if (prev.some(toast => toast.id === event.id)) return prev;
      return [...prev, newItem];
    });

    // Auto dismiss after 5 seconds
    setTimeout(() => {
      setActiveToasts(prev => prev.filter(toast => toast.id !== event.id));
    }, 5000);
  };


  // M3U Playlist States
  const [selectedPlaylist, setSelectedPlaylist] = useState<any | null>(null);
  const [playlistChannels, setPlaylistChannels] = useState<any[]>([]);
  const [loadingPlaylist, setLoadingPlaylist] = useState(false);
  const [playlistError, setPlaylistError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [upcomingSearchQuery, setUpcomingSearchQuery] = useState('');
  const [finishedSearchQuery, setFinishedSearchQuery] = useState('');

  // User M3U Upload States
  const [isAddChannelModalOpen, setIsAddChannelModalOpen] = useState(false);
  const [addChannelName, setAddChannelName] = useState('');
  const [addChannelUrl, setAddChannelUrl] = useState('');
  const [addChannelSubmitting, setAddChannelSubmitting] = useState(false);
  const [addChannelError, setAddChannelError] = useState<string | null>(null);

  const handleAddChannelSubmit = async () => {
    if (!addChannelName.trim() || !addChannelUrl.trim()) {
      setAddChannelError('Name and URL are required.');
      return;
    }
    setAddChannelSubmitting(true);
    setAddChannelError(null);
    try {
      const { error } = await supabase
        .from('m3u_channels')
        .insert([{
          name: addChannelName.trim(),
          url: addChannelUrl.trim(),
          logo_url: '',
          is_enabled: true
        }]);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['user-channels'] });
      setIsAddChannelModalOpen(false);
      setAddChannelName('');
      setAddChannelUrl('');
    } catch (err: any) {
      setAddChannelError(err.message || 'Failed to add channel.');
    } finally {
      setAddChannelSubmitting(false);
    }
  };

  const handleM3uFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAddChannelSubmitting(true);
    setAddChannelError(null);
    try {
      const text = await file.text();
      const lines = text.split('\n');
      const entries: { name: string; url: string }[] = [];
      let currentName = '';
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('#EXTINF:')) {
          const commaIdx = line.lastIndexOf(',');
          currentName = commaIdx !== -1 ? line.substring(commaIdx + 1).trim() : 'Unnamed Channel';
        } else if (line && !line.startsWith('#')) {
          entries.push({ name: currentName || `Channel ${entries.length + 1}`, url: line });
          currentName = '';
        }
      }
      if (entries.length === 0) {
        setAddChannelError('No valid channels found in the M3U file.');
        return;
      }
      const rows = entries.map(e => ({
        name: e.name,
        url: e.url,
        logo_url: '',
        is_enabled: true
      }));
      const { error } = await supabase.from('m3u_channels').insert(rows);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['user-channels'] });
      setIsAddChannelModalOpen(false);
      setAddChannelName('');
      setAddChannelUrl('');
    } catch (err: any) {
      setAddChannelError(err.message || 'Failed to import M3U file.');
    } finally {
      setAddChannelSubmitting(false);
      e.target.value = '';
    }
  };

  const handleDeleteUserChannel = async (channelId: string) => {
    try {
      await supabase.from('m3u_channels').delete().eq('id', channelId);
      queryClient.invalidateQueries({ queryKey: ['user-channels'] });
    } catch (err) {
      console.error('Failed to delete channel:', err);
    }
  };

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
      const rawMatches = (data || []) as Match[];
      const seen = new Set<string>();
      const deduped: Match[] = [];
      for (const m of rawMatches) {
        const homeName = m.home_team?.name || m.home_team_custom_name || '';
        const awayName = m.away_team?.name || m.away_team_custom_name || '';
        const date = m.match_date || '';
        const teams = [homeName, awayName].sort().join(' vs ');
        const key = `${teams}_${date}`;
        if (!seen.has(key)) {
          seen.add(key);
          deduped.push(m);
        }
      }
      return deduped;
    },
    refetchInterval: 5000, // Query matches list every 5 seconds for fast live updates!
  });

  // Helper to get dates of the streaming match to fetch scoreboard
  const scoreDates = (() => {
    if (!matches || matches.length === 0) return null;
    // Replicate selection logic
    const live = matches.filter(m => {
      const start = new Date(m.match_timestamp).getTime();
      const liveOffsetMins = systemConfig?.custom_scripts?.match_live_offset_mins || 15;
      const kickoff = start - liveOffsetMins * 60 * 1000;
      const durationMins = systemConfig?.custom_scripts?.match_duration_mins || 135;
      const autoFinishEnabled = systemConfig?.custom_scripts?.enable_auto_finish !== false;
      const isPast = Date.now() >= (start + durationMins * 60 * 1000);
      if (m.status === 'live' || m.status === 'half_time') return true;
      if (m.status === 'finished' || m.status === 'cancelled' || m.status === 'postponed') return false;
      if (autoFinishEnabled && isPast) return false;
      return Date.now() >= kickoff;
    });
    
    let targetMatch: Match | null = null;
    if (live.length > 0) {
      targetMatch = live[0];
    } else {
      const upcoming = matches.filter(m => {
        const kickoff = new Date(m.match_timestamp).getTime();
        const liveOffsetMins = systemConfig?.custom_scripts?.match_live_offset_mins || 15;
        if (m.status === 'finished' || m.status === 'cancelled' || m.status === 'postponed') return false;
        const durationMins = systemConfig?.custom_scripts?.match_duration_mins || 135;
        const autoFinishEnabled = systemConfig?.custom_scripts?.enable_auto_finish !== false;
        const isPast = Date.now() >= (kickoff + durationMins * 60 * 1000);
        if (autoFinishEnabled && isPast) return false;
        return Date.now() < (kickoff - liveOffsetMins * 60 * 1000);
      });
      if (upcoming.length > 0) {
        targetMatch = upcoming[0];
      } else if (matches.length > 0) {
        targetMatch = matches[0];
      }
    }

    if (!targetMatch) return null;
    
    const d = new Date(targetMatch.match_timestamp);
    const mStr = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`;
    
    const adj = new Date(d);
    if (d.getUTCHours() < 12) {
      adj.setUTCDate(adj.getUTCDate() - 1);
    } else {
      adj.setUTCDate(adj.getUTCDate() + 1);
    }
    const aStr = `${adj.getUTCFullYear()}${String(adj.getUTCMonth() + 1).padStart(2, '0')}${String(adj.getUTCDate()).padStart(2, '0')}`;
    
    return { main: mStr, adj: aStr };
  })();

  const streamingMatchDateStr = scoreDates?.main || null;
  const adjacentStreamingDateStr = scoreDates?.adj || null;

  const { data: espnScores = [] } = useQuery<any[]>({
    queryKey: ['homepage-espn-scores', streamingMatchDateStr, adjacentStreamingDateStr],
    queryFn: async () => {
      try {
        const [mainScores, adjScores] = await Promise.all([
          fetchESPNScoresDirect(streamingMatchDateStr || undefined),
          adjacentStreamingDateStr ? fetchESPNScoresDirect(adjacentStreamingDateStr).catch(() => []) : Promise.resolve([])
        ]);

        const seen = new Set<string>();
        const combined: any[] = [];
        for (const s of [...mainScores, ...adjScores]) {
          if (!seen.has(s.espnEventId)) {
            seen.add(s.espnEventId);
            combined.push(s);
          }
        }
        return combined;
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

    // Direct ESPN live status override
    const homeN = m.home_team_id ? m.home_team?.name : m.home_team_custom_name;
    const awayN = m.away_team_id ? m.away_team?.name : m.away_team_custom_name;
    const esScore = espnScores.find(es => 
      (teamsMatch(homeN || '', es.homeTeam) && teamsMatch(awayN || '', es.awayTeam)) ||
      (teamsMatch(homeN || '', es.awayTeam) && teamsMatch(awayN || '', es.homeTeam))
    );
    if (esScore && esScore.status === 'in') {
      return true;
    }

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
    if (tab === 'finished') return finished;
    return [];
  }

  // Priority: 1. Live, 2. Upcoming, 3. Finished
  const streamingMatch = liveList.length > 0 
    ? liveList[0] 
    : (upcomingList.length > 0 
        ? upcomingList[0] 
        : (finishedList.length > 0 ? finishedList[0] : null));

  // Update timeUntilKickoff dynamically for upcoming streaming match
  useEffect(() => {
    if (!streamingMatch || streamingMatch.status !== 'upcoming') {
      setTimeUntilKickoff(Infinity);
      return;
    }
    const updateTime = () => {
      const start = new Date(streamingMatch.match_timestamp).getTime();
      const diff = start - Date.now();
      setTimeUntilKickoff(diff);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [streamingMatch]);

  // Fetch streams for streamingMatch
  const { data: streamingMatchStreams = [] } = useQuery<any[]>({
    queryKey: ['streaming-match-streams', streamingMatch?.id],
    queryFn: async () => {
      if (!streamingMatch) return [];
      const { data, error } = await supabase
        .from('streams')
        .select('*')
        .eq('match_id', streamingMatch.id)
        .eq('is_enabled', true);
      if (error) throw error;
      return data || [];
    },
    enabled: activeTab === 'streaming' && !!streamingMatch
  });

  const matchedEspnScoreForStreaming = streamingMatch ? espnScores.find(es => {
    const homeName = streamingMatch.home_team_id ? streamingMatch.home_team?.name : streamingMatch.home_team_custom_name;
    const awayName = streamingMatch.away_team_id ? streamingMatch.away_team?.name : streamingMatch.away_team_custom_name;
    if (!homeName || !awayName) return false;
    return (teamsMatch(homeName, es.homeTeam) && teamsMatch(awayName, es.awayTeam)) ||
           (teamsMatch(homeName, es.awayTeam) && teamsMatch(awayName, es.homeTeam));
  }) : null;

  const streamingEspnEventId = matchedEspnScoreForStreaming?.espnEventId;

  // Fetch live play-by-play commentary from ESPN summary endpoint proxy for streaming match
  const { data: streamingCommentaryData, isLoading: loadingStreamingCommentary } = useQuery({
    queryKey: ['streaming-live-commentary', streamingEspnEventId],
    queryFn: async () => {
      if (!streamingEspnEventId) return null;
      try {
        const res = await fetch(`/api/live-commentary?event=${streamingEspnEventId}`);
        if (!res.ok) return null;
        return await res.json();
      } catch (e) {
        return null;
      }
    },
    enabled: activeTab === 'streaming' && !!streamingEspnEventId,
    refetchInterval: 5 * 1000,
  });

  // Gather database streams for homepage streaming
  let homepageStreamItems: { label: string; url: string }[] = [];
  if (streamingMatchStreams.length > 0) {
    const stream = streamingMatchStreams[0];
    homepageStreamItems = Array.isArray(stream.urls) && stream.urls.length > 0
      ? stream.urls
      : [
          { label: 'Primary', url: stream.primary_url },
          { label: 'Backup 1', url: stream.backup_url_1 },
          { label: 'Backup 2', url: stream.backup_url_2 },
          { label: 'Backup 3', url: stream.backup_url_3 }
        ].filter((item): item is { label: string; url: string } => !!item.url);
  }

  // Add YouTube stream if enabled
  if (systemConfig?.custom_scripts?.youtube_live_enabled && systemConfig?.custom_scripts?.youtube_live_url) {
    homepageStreamItems.push({ 
      label: systemConfig.custom_scripts.youtube_live_label || 'robeeee', 
      url: systemConfig.custom_scripts.youtube_live_url 
    });
  }

  const streamingUrls = homepageStreamItems.map(item => item.url);
  const streamingLabels = homepageStreamItems.map(item => item.label || 'Server');
  const activeStreamingUrl = streamingUrls[streamingUrlIndex] || streamingUrls[0];

  const handleStreamingError = (errorMsg: string) => {
    console.warn(`[Homepage Stream Fallback] Error: ${errorMsg}`);
    
    if (streamingUrls.length <= 1) {
      setStreamingPlayError(errorMsg);
      return;
    }

    const homeN = streamingMatch?.home_team_id ? streamingMatch.home_team?.name : streamingMatch?.home_team_custom_name;
    const awayN = streamingMatch?.away_team_id ? streamingMatch.away_team?.name : streamingMatch?.away_team_custom_name;

    // Find all indices of streams whose labels match the match name (homeN vs awayN)
    const matchedIndices: number[] = [];
    if (homeN && awayN) {
      streamingLabels.forEach((label, idx) => {
        if (matchChannelWithTeams(label, homeN, awayN)) {
          matchedIndices.push(idx);
        }
      });
    }

    let nextIndex = (streamingUrlIndex + 1) % streamingUrls.length;

    // Prioritize switching to matched channel
    if (matchedIndices.length > 0) {
      const nextMatched = matchedIndices.find(idx => idx > streamingUrlIndex);
      if (nextMatched !== undefined) {
        nextIndex = nextMatched;
      } else {
        nextIndex = matchedIndices[0];
      }
    }

    setStreamingBufferState('Stalled');
    setTimeout(() => {
      setStreamingUrlIndex(nextIndex);
    }, 150);
  };

  const handleStreamingPlaying = () => {
    setStreamingPlayError(null);
    setIsStreamingReconnecting(false);
    setStreamingBufferState('Healthy');
  };

  // 10 minutes kickoff check and activeTab landing initialization
  useEffect(() => {
    if (systemConfig && !hasInitializedTab) {
      const showStreaming = systemConfig.custom_scripts?.enable_streaming_now !== false;
      setActiveTab(showStreaming ? 'streaming' : 'live');
      setHasInitializedTab(true);
    }
  }, [systemConfig, hasInitializedTab]);

  useEffect(() => {
    if (!systemConfig || !matches.length) return;

    const autoSwitchEnabled = systemConfig.custom_scripts?.enable_live_tab_auto_switch !== false;
    if (!autoSwitchEnabled) return;

    const liveOffsetMins = 10;
    const hasMatchCloseToKickoff = matches.some((m) => {
      if (m.status !== 'upcoming') return false;
      const kickoff = new Date(m.match_timestamp).getTime();
      const timeDiff = kickoff - Date.now();
      return timeDiff > 0 && timeDiff <= liveOffsetMins * 60 * 1000;
    });

    if (hasMatchCloseToKickoff) {
      if (activeTab !== 'live') {
        console.log('[Auto Switch] Match starting in <= 10 minutes. Switching to Live Now tab.');
        setActiveTab('live');
      }
    }
  }, [matches, systemConfig, activeTab]);

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
  const showStreamingTab = systemConfig?.custom_scripts?.enable_streaming_now !== false;
  const noMatchesTitle = uiTexts.no_matches_title || (ticker as any)?.no_matches_title || "No Matches Broadcasts";
  const noMatchesDesc = uiTexts.no_matches_desc || (ticker as any)?.no_matches_desc || "There are no active matches in this tab. Tune in during kickoff schedules.";
  const noStreamsTitle = uiTexts.no_streams_title || (ticker as any)?.no_streams_title || "No Streams Configured";
  const noStreamsDesc = uiTexts.no_streams_desc || (ticker as any)?.no_streams_desc || "There are no active video links bound to this match yet. Check back closer to game kickoff.";
  const headerSubtitle = uiTexts.header_subtitle || (ticker as any)?.header_subtitle || 'Premium Streaming Portal';
  const tickerBadge = uiTexts.ticker_badge || (ticker as any)?.ticker_badge || '⚡ NEWS TICKER';
  const tabStreamingName = uiTexts.tab_streaming_name || (ticker as any)?.tab_streaming_name || '📺 Streaming Now';
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
              {(showStreamingTab 
                ? (['streaming', 'live', 'upcoming', 'finished', 'channels'] as const)
                : (['live', 'upcoming', 'finished', 'channels'] as const)
              ).map((tab) => {
                const isActive = activeTab === tab;
                const tabLabel = tab === 'streaming'
                  ? (uiTexts.tab_streaming_name || '📺 Streaming').replace(/[^\w\s]|_/g, "").trim().split(" ").slice(-1)[0] || 'Streaming'
                  : tab === 'live' 
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
                    {tab === 'streaming' ? (uiTexts.tab_streaming_name || '📺 Streaming') : tabLabel}
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
          {(showStreamingTab 
            ? (['streaming', 'live', 'upcoming', 'finished', 'channels'] as const)
            : (['live', 'upcoming', 'finished', 'channels'] as const)
          ).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3.5 font-black uppercase text-xs tracking-wider border-b-2 transition-all cursor-pointer shrink-0 ${
                activeTab === tab
                  ? 'border-emerald-accent text-emerald-accent'
                  : 'border-transparent text-slate-500 hover:text-white'
              }`}
            >
              {tab === 'streaming'
                ? tabStreamingName
                : tab === 'live' 
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
        {/* Tab Content */}
        {activeTab === 'streaming' ? (
          !streamingMatch ? (
            <div className="glass-panel p-16 text-center rounded-3xl border border-card-border">
              <Tv className="h-12 w-12 text-slate-700 mx-auto mb-4" />
              <h3 className="text-lg font-black text-white uppercase">No Streaming Now</h3>
              <p className="text-sm text-slate-400 mt-1">There are no matches scheduled for streaming at this moment. Check back during kickoff schedules.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Video Player Column */}
              <div className="lg:col-span-2 space-y-6">
                {getAdForPlacement('watchAbovePlayer')}
                
                {(() => {
                  const showCarouselInPlayer = !!systemConfig?.custom_scripts?.hero_carousel?.enabled && 
                    Array.isArray(systemConfig?.custom_scripts?.hero_carousel?.slides) && 
                    systemConfig.custom_scripts.hero_carousel.slides.length > 0 && 
                    streamingMatch.status === 'upcoming' && 
                    timeUntilKickoff > 5 * 60 * 1000;

                  const isUpcomingCountdown = streamingMatch.status === 'upcoming' && homepageStreamItems.length === 0;

                  if (showCarouselInPlayer) {
                    return (
                      <div className="aspect-video w-full rounded-3xl overflow-hidden border border-card-border shadow-2xl bg-[#090c10]">
                        <HomepageHeroCarousel 
                          slides={systemConfig.custom_scripts.hero_carousel.slides} 
                          matches={matches} 
                          fallbackBannerUrl={ticker?.banner_url || "/banner.png"} 
                          isInsidePlayer={true}
                        />
                      </div>
                    );
                  }

                  if (isUpcomingCountdown) {
                    return (
                      <div className="aspect-video w-full relative bg-slate-950 border border-card-border rounded-3xl flex flex-col items-center justify-center p-6 text-center gap-4">
                        <CalendarIcon className="h-16 w-16 text-emerald-accent animate-pulse" />
                        <div>
                          <span className="text-[10px] text-emerald-accent font-black uppercase tracking-widest block font-sans">MATCH NOT STARTED YET</span>
                          <h3 className="text-xl font-black text-white mt-1 uppercase">
                            {getTeamName(streamingMatch, 'home')} vs {getTeamName(streamingMatch, 'away')}
                          </h3>
                          <p className="text-xs text-slate-400 mt-1 font-sans">
                            Live broadcast will begin automatically at match kickoff: {streamingMatch.match_date} • {streamingMatch.match_time.substring(0, 5)}
                          </p>
                        </div>
                        <WebCountdown targetTime={streamingMatch.match_timestamp} />
                      </div>
                    );
                  }

                  if (homepageStreamItems.length === 0) {
                    return (
                      <div className="aspect-video w-full relative bg-slate-950 border border-card-border rounded-3xl flex flex-col items-center justify-center p-6 text-center gap-2">
                        <ShieldAlert className="h-10 w-10 text-amber-500 mb-2 animate-bounce" />
                        <h3 className="text-base font-black text-white uppercase">{noStreamsTitle}</h3>
                        <p className="text-xs text-slate-400 max-w-sm">{noStreamsDesc}</p>
                      </div>
                    );
                  }

                  return (
                    <>
                      <div className="aspect-video w-full relative">
                        {activeStreamingUrl && (activeStreamingUrl.includes('youtube.com') || activeStreamingUrl.includes('youtu.be')) ? (
                          <iframe
                            key={streamingPlayerKey}
                            src={getYouTubeEmbedUrl(activeStreamingUrl)}
                            title="YouTube Video Player"
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            allowFullScreen
                            className="w-full h-full rounded-2xl overflow-hidden border border-card-border"
                            onLoad={handleStreamingPlaying}
                          />
                        ) : systemConfig?.custom_scripts?.active_player === 'player_2' ? (
                          <PremiumPlayer 
                            key={streamingPlayerKey}
                            url={activeStreamingUrl} 
                            onError={handleStreamingError} 
                            onPlaying={handleStreamingPlaying}
                          />
                        ) : systemConfig?.custom_scripts?.active_player === 'pot_player' ? (
                          <PotPlayer 
                            key={streamingPlayerKey}
                            url={activeStreamingUrl} 
                            onError={handleStreamingError} 
                            onPlaying={handleStreamingPlaying}
                          />
                        ) : systemConfig?.custom_scripts?.active_player === 'player_4' ? (
                          <Engine4Player 
                            key={streamingPlayerKey}
                            url={activeStreamingUrl} 
                            onError={handleStreamingError} 
                            onPlaying={handleStreamingPlaying}
                          />
                        ) : (
                          <HlsPlayer 
                            key={streamingPlayerKey}
                            url={activeStreamingUrl} 
                            onError={handleStreamingError} 
                            onPlaying={handleStreamingPlaying}
                          />
                        )}
                        {!(activeStreamingUrl && (activeStreamingUrl.includes('youtube.com') || activeStreamingUrl.includes('youtu.be'))) && isStreamingReconnecting && (
                          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-3 rounded-2xl">
                            <Loader2 className="h-6 w-6 text-emerald-accent animate-spin" />
                            <span className="text-[10px] text-slate-500 uppercase font-black">Reconnecting stream feed...</span>
                          </div>
                        )}
                      </div>

                      {!(activeStreamingUrl && (activeStreamingUrl.includes('youtube.com') || activeStreamingUrl.includes('youtu.be'))) && streamingPlayError && (
                        <div className="p-4 bg-red-950/20 border border-red-500/25 rounded-2xl text-red-400 text-xs font-bold flex flex-col gap-1">
                          <span className="uppercase text-red-500">Stream Connection Error</span>
                          <p className="font-medium text-slate-300">{streamingPlayError}. Attempting automated backup switch...</p>
                        </div>
                      )}

                      {/* Fallback Channels selector */}
                      <div className="glass-panel p-6 rounded-2xl border border-card-border space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-black uppercase text-xs text-slate-400 tracking-wider">Fallback Channels</h3>
                            <p className="text-[10px] text-slate-500 font-bold uppercase mt-0.5">Toggle feeds if experience lag</p>
                          </div>
                          <button 
                            onClick={() => {
                              setStreamingPlayerKey(prev => prev + 1);
                              setStreamingPlayError(null);
                              setIsStreamingReconnecting(false);
                              setStreamingBufferState('Healthy');
                            }}
                            className="p-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                          >
                            <RefreshCw className="h-4 w-4 text-emerald-accent" />
                          </button>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                          {streamingUrls.map((url, idx) => {
                            const isSelected = streamingUrlIndex === idx;
                            return (
                              <button
                                key={url}
                                onClick={() => {
                                  setStreamingUrlIndex(idx);
                                  setStreamingPlayError(null);
                                  setIsStreamingReconnecting(false);
                                  setStreamingBufferState('Healthy');
                                }}
                                className={`py-3 px-2 rounded-xl border text-xs font-black uppercase tracking-wider transition-all cursor-pointer truncate ${
                                  isSelected
                                    ? 'bg-emerald-accent border-emerald-accent text-black'
                                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                                }`}
                                title={streamingLabels[idx]}
                              >
                                {streamingLabels[idx]}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  );
                })()}

                {getAdForPlacement('watchBelowPlayer')}
              </div>

              {/* Live Match Center Sidebar Column */}
              <div className="space-y-6 flex flex-col h-[calc(100vh-140px)] min-h-[500px]">
                {/* Match Score Card */}
                <div className="glass-panel p-5 rounded-2xl border border-card-border bg-gradient-to-b from-slate-900/40 to-slate-950/20">
                  <div className="flex justify-between items-center text-center gap-1">
                    {/* Home Team */}
                    <div className="w-[35%] flex flex-col items-center gap-1.5 min-w-0">
                      <div className="h-10 w-14 bg-slate-950/80 rounded-lg overflow-hidden border border-card-border flex items-center justify-center p-0.5 shadow">
                        {(streamingMatch.home_team_id ? streamingMatch.home_team?.flag_url : streamingMatch.home_team_custom_flag) ? (
                          <img 
                            src={streamingMatch.home_team_id ? streamingMatch.home_team?.flag_url : streamingMatch.home_team_custom_flag || ''} 
                            alt={getTeamName(streamingMatch, 'home') || 'Home'} 
                            className="h-full w-full object-cover rounded" 
                          />
                        ) : (
                          <span className="text-[10px] text-slate-500 font-bold">HOME</span>
                        )}
                      </div>
                      <span className="font-bold text-white text-xs truncate w-full">{getTeamName(streamingMatch, 'home')}</span>
                    </div>

                    {/* Score display */}
                    <div className="w-[30%] flex flex-col items-center justify-center">
                      <div className="flex items-center gap-1.5">
                        <span className="text-2xl font-black text-white tracking-tight">
                          {matchedEspnScoreForStreaming ? matchedEspnScoreForStreaming.homeScore : (streamingMatch.home_score ?? 0)}
                        </span>
                        <span className="text-slate-600 font-bold text-xs">-</span>
                        <span className="text-2xl font-black text-white tracking-tight">
                          {matchedEspnScoreForStreaming ? matchedEspnScoreForStreaming.awayScore : (streamingMatch.away_score ?? 0)}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 bg-red-500/10 text-red-400 border border-red-500/25 rounded-md text-[9px] font-black uppercase tracking-wider mt-1.5 animate-pulse">
                        {matchedEspnScoreForStreaming?.liveMinute || streamingMatch.live_minute || (streamingMatch.status === 'upcoming' ? 'UPCOMING' : streamingMatch.status === 'live' ? 'LIVE' : 'FINISHED')}
                      </span>
                    </div>

                    {/* Away Team */}
                    <div className="w-[35%] flex flex-col items-center gap-1.5 min-w-0">
                      <div className="h-10 w-14 bg-slate-950/80 rounded-lg overflow-hidden border border-card-border flex items-center justify-center p-0.5 shadow">
                        {(streamingMatch.away_team_id ? streamingMatch.away_team?.flag_url : streamingMatch.away_team_custom_flag) ? (
                          <img 
                            src={streamingMatch.away_team_id ? streamingMatch.away_team?.flag_url : streamingMatch.away_team_custom_flag || ''} 
                            alt={getTeamName(streamingMatch, 'away') || 'Away'} 
                            className="h-full w-full object-cover rounded" 
                          />
                        ) : (
                          <span className="text-[10px] text-slate-500 font-bold">AWAY</span>
                        )}
                      </div>
                      <span className="font-bold text-white text-xs truncate w-full">{getTeamName(streamingMatch, 'away')}</span>
                    </div>
                  </div>

                  {/* Scorers info below */}
                  {((matchedEspnScoreForStreaming ? matchedEspnScoreForStreaming.homeScorers : streamingMatch.home_scorers) || 
                    (matchedEspnScoreForStreaming ? matchedEspnScoreForStreaming.awayScorers : streamingMatch.away_scorers)) && (
                    <div className="text-[10px] text-slate-400 bg-slate-950/60 p-2.5 rounded-xl border border-slate-900/80 flex justify-between gap-3 mt-4">
                      <div className="w-[45%] text-left text-slate-300 font-medium leading-relaxed font-sans">
                        {matchedEspnScoreForStreaming ? matchedEspnScoreForStreaming.homeScorers : streamingMatch.home_scorers || ""}
                      </div>
                      <div className="w-[10%] text-center text-slate-500 font-bold">⚽</div>
                      <div className="w-[45%] text-right text-slate-300 font-medium leading-relaxed font-sans">
                        {matchedEspnScoreForStreaming ? matchedEspnScoreForStreaming.awayScorers : streamingMatch.away_scorers || ""}
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
                        {!streamingEspnEventId ? (
                          <div className="text-center py-10 text-slate-500 font-bold uppercase text-[10px]">
                            Commentary feed waiting to connect...
                          </div>
                        ) : loadingStreamingCommentary ? (
                          <div className="flex flex-col items-center justify-center py-12">
                            <Loader2 className="h-5 w-5 text-emerald-accent animate-spin" />
                            <span className="text-[10px] text-slate-500 uppercase font-black mt-2">Loading commentary...</span>
                          </div>
                        ) : !streamingCommentaryData?.commentary || streamingCommentaryData.commentary.length === 0 ? (
                          <div className="text-center py-10 text-slate-500 font-bold uppercase text-[10px]">
                            No commentary entries recorded yet
                          </div>
                        ) : (
                          <div className="space-y-3.5">
                            {streamingCommentaryData.commentary.map((c: any, i: number) => {
                              const isGoal = c.type?.toLowerCase().includes('goal');
                              const isCard = c.type?.toLowerCase().includes('card') || c.type?.toLowerCase().includes('booking');
                              return (
                                <div 
                                  key={i} 
                                  className={`p-3 rounded-xl border flex gap-3 text-xs leading-relaxed transition-all ${
                                    isGoal 
                                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300 font-sans' 
                                      : isCard 
                                        ? 'bg-amber-500/10 border-amber-500/20 text-amber-300 font-sans'
                                        : 'bg-slate-950/40 border-slate-900 text-slate-300 font-sans'
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
                        {!streamingEspnEventId ? (
                          <div className="text-center py-10 text-slate-500 font-bold uppercase text-[10px]">
                            Key events waiting to connect...
                          </div>
                        ) : loadingStreamingCommentary ? (
                          <div className="flex flex-col items-center justify-center py-12">
                            <Loader2 className="h-5 w-5 text-emerald-accent animate-spin" />
                            <span className="text-[10px] text-slate-500 uppercase font-black mt-2">Loading events...</span>
                          </div>
                        ) : !streamingCommentaryData?.keyEvents || streamingCommentaryData.keyEvents.length === 0 ? (
                          <div className="text-center py-10 text-slate-500 font-bold uppercase text-[10px]">
                            No key events registered yet
                          </div>
                        ) : (
                          <div className="space-y-3.5">
                            {streamingCommentaryData.keyEvents.map((e: any, i: number) => {
                              const isGoal = e.type?.toLowerCase().includes('goal');
                              const isCard = e.type?.toLowerCase().includes('card') || e.type?.toLowerCase().includes('booking');
                              return (
                                <div 
                                  key={i} 
                                  className={`p-3 rounded-xl border flex gap-3 text-xs leading-relaxed transition-all ${
                                    isGoal 
                                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300 font-bold font-sans' 
                                      : isCard 
                                        ? 'bg-amber-500/10 border-amber-500/20 text-amber-300 font-sans'
                                        : 'bg-slate-950/40 border-slate-900 text-slate-300 font-sans'
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
                            <span className="text-white uppercase">{streamingUrlIndex === 0 ? 'Primary Feed' : `Backup Feed ${streamingUrlIndex}`}</span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-slate-900">
                            <span className="text-slate-500">Codec Type:</span>
                            <span className="text-white font-mono">H.264 / AAC</span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-slate-900">
                            <span className="text-slate-500">Network Latency:</span>
                            <span className="text-white">1.8s (Low Delay)</span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-slate-900">
                            <span className="text-slate-500">Buffer state:</span>
                            <span className={streamingBufferState === 'Healthy' ? 'text-emerald-accent' : 'text-amber-500'}>{streamingBufferState}</span>
                          </div>
                          <div className="flex justify-between items-center py-2">
                            <span className="text-slate-500">Score Sync API:</span>
                            <span className={streamingEspnEventId ? 'text-emerald-accent flex items-center gap-1.5' : 'text-amber-500'}>
                              {streamingEspnEventId ? (
                                <>
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-accent animate-pulse" />
                                  CONNECTED ({streamingEspnEventId})
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
                        {!streamingEspnEventId ? (
                          <div className="text-center py-10 text-slate-500 font-bold uppercase text-[10px]">
                            Lineup feed waiting to connect...
                          </div>
                        ) : loadingStreamingCommentary ? (
                          <div className="flex flex-col items-center justify-center py-12">
                            <Loader2 className="h-5 w-5 text-emerald-accent animate-spin" />
                            <span className="text-[10px] text-slate-500 uppercase font-black mt-2">Loading lineups...</span>
                          </div>
                        ) : !streamingCommentaryData?.rosters ? (
                          <div className="text-center py-10 text-slate-500 font-bold uppercase text-[10px]">
                            No lineup details available for this match
                          </div>
                        ) : (() => {
                          const values = Object.values(streamingCommentaryData.rosters);
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
                            if (players.length === 0) return null;
                            return (
                              <div className="space-y-2.5">
                                <h4 className="text-xs font-black uppercase text-emerald-accent tracking-wider border-b border-slate-900 pb-1">{teamName} Lineup</h4>
                                <div className="space-y-1.5">
                                  {players.map((p: any, idx: number) => (
                                    <div key={idx} className="flex justify-between items-center text-xs text-slate-300 py-1 font-medium font-sans">
                                      <div className="flex items-center gap-2">
                                        {p.jersey && <span className="font-bold text-[10px] text-slate-500 bg-slate-950 w-5 h-5 rounded-full flex items-center justify-center border border-card-border">{p.jersey}</span>}
                                        <span>{p.athlete?.displayName || p.athlete?.name || 'Player'}</span>
                                      </div>
                                      <span className="text-[10px] uppercase text-slate-500 font-bold">{p.position?.abbreviation || p.position?.name}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          };

                          return (
                            <div className="space-y-6">
                              {renderTeamLineup(homeRoster, getTeamName(streamingMatch, 'home') || 'Home')}
                              {renderTeamLineup(awayRoster, getTeamName(streamingMatch, 'away') || 'Away')}
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        ) : activeTab !== 'channels' ? (
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
                              <>
                                <span className="text-2xl md:text-3xl font-black text-white tracking-tight whitespace-nowrap">{match.home_score} - {match.away_score}</span>
                                {match.live_minute && match.live_minute.includes('PEN') && (
                                  <span className="text-[10px] font-black text-emerald-accent uppercase mt-1 tracking-wider bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 whitespace-nowrap animate-pulse">
                                    {match.live_minute}
                                  </span>
                                )}
                              </>
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
                ) : systemConfig?.custom_scripts?.active_player === 'player_4' ? (
                  <Engine4Player 
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
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-black text-xs text-white uppercase tracking-wider">M3U TV Channels</h3>
                    <p className="text-[9px] text-slate-500 font-bold uppercase mt-0.5">Click server to load player</p>
                  </div>
                  <button
                    onClick={() => { setAddChannelError(null); setAddChannelName(''); setAddChannelUrl(''); setIsAddChannelModalOpen(true); }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[10px] font-black uppercase tracking-wider hover:bg-emerald-500/20 transition-all cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Channel
                  </button>
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
                        <div
                          key={chan.id}
                          className={`w-full p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between ${
                            isPlaying 
                              ? 'bg-emerald-500/10 border-emerald-accent text-white shadow-lg shadow-emerald-500/5' 
                              : 'bg-slate-950/40 border-slate-900 text-slate-400 hover:border-slate-800 hover:text-white'
                          }`}
                        >
                          <button
                            onClick={() => handleChannelSelect(chan)}
                            className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer text-left"
                          >
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
                          </button>
                          <div className="flex items-center gap-2 shrink-0">
                            {isPlaying && (
                              <span className="text-[9px] font-black text-emerald-accent uppercase tracking-widest">
                                Active
                              </span>
                            )}
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteUserChannel(chan.id); }}
                              className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-600 hover:text-red-400 transition-all cursor-pointer"
                              title="Remove channel"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
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

      {/* Add Channel Modal */}
      {isAddChannelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 w-full max-w-md space-y-5 shadow-2xl shadow-black/50">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black text-white uppercase tracking-wider">Add Channel / M3U</h2>
              <button onClick={() => setIsAddChannelModalOpen(false)} className="p-2 rounded-xl hover:bg-slate-800 transition-all cursor-pointer">
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>

            {addChannelError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-xs font-bold">
                {addChannelError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">Channel Name</label>
                <input
                  type="text"
                  value={addChannelName}
                  onChange={(e) => setAddChannelName(e.target.value)}
                  placeholder="e.g. Sports HD, BTV Live"
                  className="w-full px-4 py-3 rounded-xl bg-slate-900/60 border border-slate-800 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 transition-all"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">Stream URL or M3U Link</label>
                <input
                  type="url"
                  value={addChannelUrl}
                  onChange={(e) => setAddChannelUrl(e.target.value)}
                  placeholder="https://example.com/stream.m3u or .m3u8"
                  className="w-full px-4 py-3 rounded-xl bg-slate-900/60 border border-slate-800 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 transition-all"
                />
              </div>
            </div>

            <button
              onClick={handleAddChannelSubmit}
              disabled={addChannelSubmitting}
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black font-black text-xs uppercase tracking-wider transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {addChannelSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <LinkIcon className="h-4 w-4" />}
              Add Link
            </button>

            <div className="relative flex items-center gap-3">
              <div className="flex-1 h-px bg-slate-800" />
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">or upload file</span>
              <div className="flex-1 h-px bg-slate-800" />
            </div>

            <label className="w-full py-3 rounded-xl bg-slate-900/60 border border-dashed border-slate-700 hover:border-emerald-500/50 text-slate-400 hover:text-emerald-400 font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer">
              <Upload className="h-4 w-4" />
              Upload M3U File
              <input
                type="file"
                accept=".m3u,.m3u8,.txt"
                onChange={handleM3uFileUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>
      )}

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
              matchTitle={`${homeN} vs ${awayN}`}
              enableNotifications={systemConfig?.custom_scripts?.enable_live_notifications !== false}
              onEventTriggered={handleEventTriggered}
            />
          );
        })
      }

      {/* Floating active toasts overlay - top-right (won't cover central elements) */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 max-w-md w-[calc(100%-2rem)] sm:w-[380px] pointer-events-none">
        {activeToasts.map((toast) => (
          <div 
            key={toast.id}
            className="pointer-events-auto bg-slate-950/95 border rounded-2xl p-3.5 shadow-2xl backdrop-blur-xl flex items-start gap-3 animate-slide-in"
            style={{ 
              borderColor: toast.type === 'goal' ? '#10b981' : toast.type === 'card' ? '#f59e0b' : '#64748b' 
            }}
          >
            <span className="text-2xl shrink-0">
              {toast.type === 'goal' ? '⚽' : toast.type === 'card' ? '🟨' : '🔔'}
            </span>
            <div className="flex-1 space-y-1 min-w-0">
              <div className="flex justify-between items-start gap-2">
                <div className="flex flex-col">
                  <span className={`text-[10px] font-black uppercase tracking-widest leading-none ${
                    toast.type === 'goal' ? 'text-emerald-400' : toast.type === 'card' ? 'text-amber-500' : 'text-slate-400'
                  }`}>
                    {toast.type === 'goal' ? '⚡ GOAL ALERT!' : toast.type === 'card' ? '🟡 CARD ISSUED' : '📢 FOUL REGISTERED'}
                  </span>
                  {toast.matchTitle && (
                    <span className="text-[9px] text-slate-400 font-bold uppercase mt-0.5 leading-none">
                      {toast.matchTitle} ({toast.clock})
                    </span>
                  )}
                </div>
                <button 
                  onClick={() => setActiveToasts(prev => prev.filter(t => t.id !== toast.id))}
                  className="text-slate-500 hover:text-white text-xs font-bold px-1.5 py-0.5 rounded cursor-pointer shrink-0"
                >
                  ✕
                </button>
              </div>
              <p className="text-xs text-slate-200 font-medium leading-relaxed font-bangla">{toast.text}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Floating Notification History Button */}
      {systemConfig?.custom_scripts?.enable_live_notifications !== false && (
        <button
          onClick={() => setIsPanelOpen(true)}
          className="fixed right-4 bottom-24 z-[999] bg-slate-900/90 border border-slate-800 text-white rounded-full p-3.5 shadow-2xl hover:bg-slate-850 hover:scale-105 active:scale-95 transition-all flex items-center justify-center cursor-pointer group"
          title="Notification History"
        >
          <span className="text-xl">🔔</span>
          {notificationsList.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-[10px] font-black text-white rounded-full min-w-5 h-5 px-1.5 flex items-center justify-center border border-slate-950 animate-pulse">
              {notificationsList.length}
            </span>
          )}
        </button>
      )}

      {/* Notification Drawer Sidebar */}
      <div 
        className={`fixed inset-y-0 right-0 w-80 sm:w-96 bg-slate-950/95 border-l border-slate-900 shadow-2xl z-[10000] p-5 flex flex-col backdrop-blur-xl transition-transform duration-300 ${
          isPanelOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-900">
          <div className="flex items-center gap-2">
            <span className="text-xl">🔔</span>
            <h3 className="text-sm font-black text-white uppercase tracking-wider">Live Match Alerts</h3>
            {notificationsList.length > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 bg-slate-900 border border-slate-800 text-slate-400 rounded-full">
                {notificationsList.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {notificationsList.length > 0 && (
              <button
                onClick={() => saveNotifications([])}
                className="text-[10px] text-red-400 hover:text-red-300 font-bold uppercase transition-colors cursor-pointer"
              >
                Clear All
              </button>
            )}
            <button
              onClick={() => setIsPanelOpen(false)}
              className="text-slate-500 hover:text-white text-base font-bold p-1 cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-3 scrollbar-thin">
          {notificationsList.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 gap-3">
              <span className="text-4xl opacity-20">🔔</span>
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">No Alerts Yet</p>
                <p className="text-[10px] text-slate-600 leading-normal max-w-[200px]">
                  Real-time goals, cards, and fouls will appear here as they happen in live matches.
                </p>
              </div>
            </div>
          ) : (
            notificationsList.map((item) => (
              <div
                key={item.id}
                className="p-3 bg-slate-900/40 border border-slate-900/60 rounded-xl relative group flex gap-2.5 items-start"
                style={{
                  borderLeft: `3px solid ${
                    item.type === 'goal' ? '#10b981' : item.type === 'card' ? '#f59e0b' : '#64748b'
                  }`
                }}
              >
                <span className="text-lg shrink-0 mt-0.5">
                  {item.type === 'goal' ? '⚽' : item.type === 'card' ? '🟨' : '🔔'}
                </span>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex justify-between items-start gap-2">
                    <span className={`text-[9px] font-black uppercase tracking-wider leading-none ${
                      item.type === 'goal' ? 'text-emerald-400' : item.type === 'card' ? 'text-amber-500' : 'text-slate-400'
                    }`}>
                      {item.type === 'goal' ? 'Goal Alert' : item.type === 'card' ? 'Card Alert' : 'Foul Registered'}
                    </span>
                    <button
                      onClick={() => saveNotifications(notificationsList.filter(n => n.id !== item.id))}
                      className="text-slate-650 hover:text-white text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer absolute top-2 right-2"
                    >
                      ✕
                    </button>
                  </div>
                  {item.matchTitle && (
                    <p className="text-[9px] text-slate-500 font-bold uppercase leading-none">
                      {item.matchTitle} ({item.clock})
                    </p>
                  )}
                  <p className="text-xs text-slate-300 font-medium leading-relaxed font-bangla pr-4">{item.text}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
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
  onEventTriggered,
  matchTitle
}: { 
  espnEventId: string; 
  enableNotifications: boolean;
  onEventTriggered: (event: any) => void;
  matchTitle: string;
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
            clock: event.clock || "0'",
            matchTitle
          });
        }
      }
      
      processedEventsRef.current.add(event.id);
    }
  }, [data, isInitialized, enableNotifications, matchTitle]);

  return null;
}

// teamsMatch and normalizeTeamName imported from '@/lib/auto-score-updater'

const HomepageHeroCarousel = ({ 
  slides, 
  matches, 
  fallbackBannerUrl,
  isInsidePlayer = false
}: { 
  slides: any[], 
  matches: any[], 
  fallbackBannerUrl: string,
  isInsidePlayer?: boolean
}) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [colors, setColors] = useState<Record<string, string>>({});

  // Auto-slide effect
  useEffect(() => {
    if (slides.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIdx((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [slides]);

  // Color extraction effect
  useEffect(() => {
    slides.forEach((slide) => {
      if (colors[slide.id]) return;
      
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = slide.image_url;
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = 1;
          canvas.height = 1;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, 1, 1);
            const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
            
            const rgbToHsl = (r: number, g: number, b: number) => {
              r /= 255; g /= 255; b /= 255;
              const max = Math.max(r, g, b), min = Math.min(r, g, b);
              let h = 0, s = 0, l = (max + min) / 2;
              if (max !== min) {
                const d = max - min;
                s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
                switch (max) {
                  case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                  case g: h = (b - r) / d + 2; break;
                  case b: h = (r - g) / d + 4; break;
                }
                h /= 6;
              }
              return [Math.floor(h * 360), Math.floor(s * 100), Math.floor(l * 100)];
            };
            
            const [h, s] = rgbToHsl(r, g, b);
            const vibrantColor = `hsl(${h}, 90%, 65%)`;
            setColors((prev) => ({ ...prev, [slide.id]: vibrantColor }));
          }
        } catch (e) {
          setColors((prev) => ({ ...prev, [slide.id]: getVibrantColorFromHash(slide.name) }));
        }
      };
      img.onerror = () => {
        setColors((prev) => ({ ...prev, [slide.id]: getVibrantColorFromHash(slide.name) }));
      };
    });
  }, [slides]);

  const getVibrantColorFromHash = (str: string): string => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash) % 360;
    return `hsl(${h}, 90%, 65%)`;
  };

  return (
    <section className={`relative w-full overflow-hidden border border-card-border shadow-2xl bg-[#090c10] ${
      isInsidePlayer 
        ? 'w-full h-full aspect-video rounded-3xl' 
        : 'h-[220px] sm:h-[300px] md:h-[360px] rounded-3xl'
    }`}>
      {slides.map((slide, idx) => {
        const isCurrent = idx === currentIdx;
        const color = colors[slide.id] || '#10b981';
        const match = matches.find(m => m.id === slide.match_id);

        return (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              isCurrent ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
            }`}
          >
            <img
              src={slide.image_url}
              alt={slide.name}
              className="w-full h-full object-cover block"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
            <div className="absolute bottom-6 left-6 right-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <span className="text-[10px] uppercase font-black tracking-widest px-2.5 py-1 bg-slate-900/80 border border-slate-800 rounded-full text-slate-400">
                  FEATURED MATCH
                </span>
                <h3 className="text-lg sm:text-2xl md:text-3xl font-extrabold text-white uppercase tracking-wider mt-2.5 drop-shadow-md">
                  {slide.name}
                </h3>
              </div>
              {match && (
                <div className="shrink-0 bg-slate-950/80 border border-slate-900 rounded-2xl p-3 backdrop-blur-md shadow-lg max-w-[280px]">
                  <MatchCountdown match={match} color={color} />
                </div>
              )}
            </div>
          </div>
        );
      })}
      {slides.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIdx(idx)}
              className={`h-2 rounded-full transition-all duration-300 ${
                idx === currentIdx ? 'w-6 bg-emerald-accent' : 'w-2 bg-slate-700 hover:bg-slate-600'
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
};

const MatchCountdown = ({ match, color }: { match: any, color: string }) => {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isLive: boolean;
    isFinished: boolean;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0, isLive: false, isFinished: false });

  useEffect(() => {
    const calculateTime = () => {
      const start = new Date(match.match_timestamp).getTime();
      const now = Date.now();
      const diff = start - now;

      const isFinished = match.status === 'finished' || match.status === 'cancelled' || match.status === 'postponed';
      const isLive = match.status === 'live' || match.status === 'half_time' || (diff <= 0 && !isFinished);

      if (isFinished) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isLive: false, isFinished: true });
        return;
      }

      if (isLive) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isLive: true, isFinished: false });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / 1000 / 60) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      setTimeLeft({ days, hours, minutes, seconds, isLive: false, isFinished: false });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [match]);

  if (timeLeft.isFinished) {
    return (
      <span className="text-xs uppercase font-extrabold text-slate-500">
        🏁 MATCH COMPLETED
      </span>
    );
  }

  if (timeLeft.isLive) {
    return (
      <span className="text-xs uppercase font-extrabold text-red-500 flex items-center gap-1.5 animate-pulse">
        <span className="h-2 w-2 rounded-full bg-red-500" />
        🔴 TRANSMITTING LIVE NOW
      </span>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider">
        KICKOFF COUNTDOWN
      </span>
      <div className="flex gap-2 items-center text-center">
        <div>
          <span className="text-base sm:text-lg font-black block leading-none" style={{ color }}>
            {String(timeLeft.days).padStart(2, '0')}
          </span>
          <span className="text-[7px] text-slate-500 font-bold uppercase tracking-wider">days</span>
        </div>
        <span className="text-xs text-slate-600 font-bold">:</span>
        <div>
          <span className="text-base sm:text-lg font-black block leading-none" style={{ color }}>
            {String(timeLeft.hours).padStart(2, '0')}
          </span>
          <span className="text-[7px] text-slate-500 font-bold uppercase tracking-wider">hours</span>
        </div>
        <span className="text-xs text-slate-600 font-bold">:</span>
        <div>
          <span className="text-base sm:text-lg font-black block leading-none" style={{ color }}>
            {String(timeLeft.minutes).padStart(2, '0')}
          </span>
          <span className="text-[7px] text-slate-500 font-bold uppercase tracking-wider">mins</span>
        </div>
        <span className="text-xs text-slate-600 font-bold">:</span>
        <div>
          <span className="text-base sm:text-lg font-black block leading-none" style={{ color }}>
            {String(timeLeft.seconds).padStart(2, '0')}
          </span>
          <span className="text-[7px] text-slate-500 font-bold uppercase tracking-wider">secs</span>
        </div>
      </div>
    </div>
  );
};

function matchChannelWithTeams(channelName: string, homeTeam: string, awayTeam: string): boolean {
  const nameLower = channelName.toLowerCase();
  const homeLower = homeTeam.toLowerCase();
  const awayLower = awayTeam.toLowerCase();

  // 1. Direct match: check if both full team names (or normalized names) are in the channel name
  if (nameLower.includes(homeLower) && nameLower.includes(awayLower)) {
    return true;
  }

  // Check with normalized names if different
  const normHome = normalizeTeamName(homeTeam);
  const normAway = normalizeTeamName(awayTeam);
  if (normHome && normAway) {
    if (nameLower.includes(normHome) && nameLower.includes(normAway)) {
      return true;
    }
  }

  // 2. Abbreviation match: check if 3-letter prefixes are in the channel name
  const homeShort = homeLower.substring(0, 3);
  const awayShort = awayLower.substring(0, 3);
  if (homeShort.length >= 3 && awayShort.length >= 3) {
    if (nameLower.includes(homeShort) && nameLower.includes(awayShort)) {
      return true;
    }
  }

  // 3. Split team names by spaces/dashes and check if any part of the name is present
  const homeWords = homeLower.split(/[\s-]+/).filter(w => w.length > 2);
  const awayWords = awayLower.split(/[\s-]+/).filter(w => w.length > 2);
  if (homeWords.length > 0 && awayWords.length > 0) {
    const hasHomeWord = homeWords.some(w => nameLower.includes(w));
    const hasAwayWord = awayWords.some(w => nameLower.includes(w));
    if (hasHomeWord && hasAwayWord) {
      return true;
    }
  }

  return false;
}

function getYouTubeEmbedUrl(url: string): string {
  if (!url) return '';
  let videoId = '';
  try {
    if (url.includes('youtube.com/embed/')) {
      return url;
    }
    if (url.includes('youtu.be/')) {
      videoId = url.split('youtu.be/')[1]?.split(/[?#]/)[0] || '';
    } else if (url.includes('youtube.com/watch')) {
      const urlParams = new URLSearchParams(url.split('?')[1] || '');
      videoId = urlParams.get('v') || '';
    } else if (url.includes('youtube.com/v/')) {
      videoId = url.split('/v/')[1]?.split(/[?#]/)[0] || '';
    }
  } catch (e) {
    console.error(e);
  }
  return videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=0` : url;
}

// Global/local audio elements for chime
let _audioUnlocked = false;

function generateNotificationWav(type: 'goal' | 'card' | 'foul' | 'silent') {
  const sampleRate = 11025;
  let duration = 0.3; // seconds
  if (type === 'goal') duration = 0.8;
  else if (type === 'card') duration = 0.4;
  else duration = 0.3;

  const numSamples = Math.floor(sampleRate * duration);
  const buffer = new Uint8Array(44 + numSamples);

  // RIFF header
  buffer[0] = 0x52; // 'R'
  buffer[1] = 0x49; // 'I'
  buffer[2] = 0x46; // 'F'
  buffer[3] = 0x46; // 'F'
  
  const fileSize = 36 + numSamples;
  buffer[4] = fileSize & 0xff;
  buffer[5] = (fileSize >> 8) & 0xff;
  buffer[6] = (fileSize >> 16) & 0xff;
  buffer[7] = (fileSize >> 24) & 0xff;

  buffer[8] = 0x57;  // 'W'
  buffer[9] = 0x41;  // 'A'
  buffer[10] = 0x56; // 'V'
  buffer[11] = 0x45; // 'E'

  // fmt chunk
  buffer[12] = 0x66; // 'f'
  buffer[13] = 0x6d; // 'm'
  buffer[14] = 0x74; // 't'
  buffer[15] = 0x20; // ' '
  
  buffer[16] = 16;   // Subchunk1Size (16)
  buffer[17] = 0;
  buffer[18] = 0;
  buffer[19] = 0;

  buffer[20] = 1;    // AudioFormat (1 = PCM)
  buffer[21] = 0;
  buffer[22] = 1;    // NumChannels (1 = Mono)
  buffer[23] = 0;

  buffer[24] = sampleRate & 0xff; // SampleRate
  buffer[25] = (sampleRate >> 8) & 0xff;
  buffer[26] = (sampleRate >> 16) & 0xff;
  buffer[27] = (sampleRate >> 24) & 0xff;

  const byteRate = sampleRate;
  buffer[28] = byteRate & 0xff;
  buffer[29] = (byteRate >> 8) & 0xff;
  buffer[30] = (byteRate >> 16) & 0xff;
  buffer[31] = (byteRate >> 24) & 0xff;

  buffer[32] = 1;    // BlockAlign
  buffer[33] = 0;
  buffer[34] = 8;    // BitsPerSample (8)
  buffer[35] = 0;

  // data chunk
  buffer[36] = 0x64; // 'd'
  buffer[37] = 0x61; // 'a'
  buffer[38] = 0x74; // 't'
  buffer[39] = 0x61; // 'a'

  buffer[40] = numSamples & 0xff; // Subchunk2Size
  buffer[41] = (numSamples >> 8) & 0xff;
  buffer[42] = (numSamples >> 16) & 0xff;
  buffer[43] = (numSamples >> 24) & 0xff;

  // Generate sound samples (8-bit PCM, 128 is silence)
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let sampleVal = 128;

    if (type === 'silent') {
      sampleVal = 128;
    } else if (type === 'goal') {
      // Goal: Whistle followed by a celebratory double-beep
      if (t < 0.2) {
        // Whistle
        const freq = 1500 + Math.sin(2 * Math.PI * 20 * t) * 150;
        const amplitude = 1 - (t / 0.2);
        sampleVal = 128 + Math.round(amplitude * 60 * Math.sin(2 * Math.PI * freq * t));
      } else if (t >= 0.25 && t < 0.45) {
        // High beep
        const t2 = t - 0.25;
        const freq = 1200;
        const amplitude = 1 - (t2 / 0.2);
        sampleVal = 128 + Math.round(amplitude * 70 * Math.sin(2 * Math.PI * freq * t2));
      } else if (t >= 0.5 && t < 0.75) {
        // Second high beep
        const t3 = t - 0.5;
        const freq = 1200;
        const amplitude = 1 - (t3 / 0.25);
        sampleVal = 128 + Math.round(amplitude * 70 * Math.sin(2 * Math.PI * freq * t3));
      }
    } else if (type === 'card') {
      // Card: double alert tone (warning pitch)
      if (t < 0.15) {
        const freq = 900;
        const amplitude = 1 - (t / 0.15);
        sampleVal = 128 + Math.round(amplitude * 60 * Math.sin(2 * Math.PI * freq * t));
      } else if (t >= 0.2 && t < 0.35) {
        const t2 = t - 0.2;
        const freq = 1000;
        const amplitude = 1 - (t2 / 0.15);
        sampleVal = 128 + Math.round(amplitude * 60 * Math.sin(2 * Math.PI * freq * t2));
      }
    } else {
      // Foul: simple clean chime
      const freq = 650;
      const amplitude = 1 - (t / 0.3);
      sampleVal = 128 + Math.round(amplitude * 50 * Math.sin(2 * Math.PI * freq * t));
    }

    buffer[44 + i] = Math.max(0, Math.min(255, sampleVal));
  }

  // Convert buffer to base64
  let binary = '';
  const len = buffer.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(buffer[i]);
  }
  return 'data:audio/wav;base64,' + btoa(binary);
}

function unlockAudio() {
  if (_audioUnlocked) return;
  try {
    const silentUrl = generateNotificationWav('silent');
    const audio = new Audio(silentUrl);
    audio.play().then(() => {
      _audioUnlocked = true;
    }).catch(e => {
      console.warn("Audio unlock failed:", e);
    });
  } catch (e) {
    console.warn("Audio unlock error:", e);
  }
}

// Setup passive interaction triggers
if (typeof window !== 'undefined') {
  const initAudioOnInteraction = () => {
    unlockAudio();
    window.removeEventListener('touchstart', initAudioOnInteraction);
    window.removeEventListener('click', initAudioOnInteraction);
    window.removeEventListener('mousedown', initAudioOnInteraction);
    window.removeEventListener('keydown', initAudioOnInteraction);
  };
  window.addEventListener('touchstart', initAudioOnInteraction, { once: true, passive: true });
  window.addEventListener('click', initAudioOnInteraction, { once: true, passive: true });
  window.addEventListener('mousedown', initAudioOnInteraction, { once: true, passive: true });
  window.addEventListener('keydown', initAudioOnInteraction, { once: true, passive: true });
}

function playCelebrationSound(type: 'goal' | 'card' | 'foul') {
  try {
    const soundUrl = generateNotificationWav(type);
    const audio = new Audio(soundUrl);
    audio.volume = 0.8;
    audio.play().catch(err => {
      console.warn('Procedural WAV play failed, attempting Web Audio API context fallback:', err);
      // Fallback: Web Audio API context
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          const ctx = new AudioContextClass();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = type === 'goal' ? 'sawtooth' : 'sine';
          osc.frequency.setValueAtTime(type === 'goal' ? 330 : type === 'card' ? 900 : 650, ctx.currentTime);
          gain.gain.setValueAtTime(0, ctx.currentTime);
          gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (type === 'goal' ? 0.8 : 0.3));
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + (type === 'goal' ? 0.8 : 0.3));
        }
      } catch (innerErr) {
        console.error('All audio fallbacks failed:', innerErr);
      }
    });
  } catch (e) {
    console.warn('Audio play error:', e);
  }
}
