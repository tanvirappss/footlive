'use client';

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
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
  const [activeTab, setActiveTab] = useState<'live' | 'upcoming' | 'finished' | 'channels'>('live');
  const [isNoticeModalOpen, setIsNoticeModalOpen] = useState(false);
  const [showNotificationToast, setShowNotificationToast] = useState(false);
  const [selectedChannelUrl, setSelectedChannelUrl] = useState<string | null>(null);
  const [selectedChannelName, setSelectedChannelName] = useState<string>('');

  // M3U Playlist States
  const [selectedPlaylist, setSelectedPlaylist] = useState<any | null>(null);
  const [playlistChannels, setPlaylistChannels] = useState<any[]>([]);
  const [loadingPlaylist, setLoadingPlaylist] = useState(false);
  const [playlistError, setPlaylistError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

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

  // Audio announcement autoplay handler
  useEffect(() => {
    if (!ticker || !ticker.audio_enabled || !ticker.audio_url) return;

    // Check if audio has already played in this client-side JS load context
    if (typeof window !== 'undefined' && (window as any).__audioPlayedInCurrentLoad) {
      return;
    }

    let playCount = 0;
    try {
      const stored = sessionStorage.getItem('audio_play_count');
      if (stored) {
        playCount = parseInt(stored, 10);
      }
    } catch (e) {
      console.error('Failed to read session storage', e);
    }

    if (playCount >= 2) return;

    let audio: HTMLAudioElement | null = null;
    let playTimeout: NodeJS.Timeout | null = null;

    const startAudioPlay = () => {
      if (audio) return; // already playing or trying to play

      audio = new Audio(ticker.audio_url);
      audio.preload = 'auto'; // load asynchronously in the background
      
      const playPromise = audio.play();

      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            try {
              sessionStorage.setItem('audio_play_count', String(playCount + 1));
              (window as any).__audioPlayedInCurrentLoad = true;
            } catch (e) {
              console.error(e);
            }
            cleanupListeners();
          })
          .catch((err) => {
            console.log('Autoplay blocked. Waiting for user interaction to trigger audio play.', err);
            audio = null;
          });
      }
    };

    const interactionEvents = ['click', 'touchstart', 'mousedown', 'keydown', 'scroll'];

    const handleUserInteraction = () => {
      startAudioPlay();
    };

    const cleanupListeners = () => {
      interactionEvents.forEach((event) => {
        window.removeEventListener(event, handleUserInteraction);
      });
    };

    // Delay start of play to ensure zero impact on initial page speed/interactive time
    playTimeout = setTimeout(() => {
      startAudioPlay();
      
      // Setup interaction listeners in case autoplay is blocked by default browser policies
      interactionEvents.forEach((event) => {
        window.addEventListener(event, handleUserInteraction, { passive: true });
      });
    }, 1500);

    return () => {
      if (playTimeout) clearTimeout(playTimeout);
      cleanupListeners();
      if (audio) {
        audio.pause();
        audio = null;
      }
    };
  }, [ticker]);

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
    }
  });

  const isMatchLive = (m: Match) => {
    if (m.status === 'live' || m.status === 'half_time') return true;
    if (m.status === 'upcoming') {
      const kickoff = new Date(m.match_timestamp).getTime();
      return Date.now() >= (kickoff - 10 * 60 * 1000);
    }
    return false;
  };

  const isMatchUpcoming = (m: Match) => {
    if (m.status !== 'upcoming') return false;
    const kickoff = new Date(m.match_timestamp).getTime();
    return Date.now() < (kickoff - 10 * 60 * 1000);
  };

  const liveList = matches.filter(m => isMatchLive(m));
  const upcomingList = matches.filter(m => isMatchUpcoming(m));
  const finishedList = matches.filter(m => m.status === 'finished' || m.status === 'cancelled' || m.status === 'postponed');

  const currentList = whenTab(activeTab, liveList, upcomingList, finishedList);

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

  return (
    <div className="min-h-screen bg-[#090c10] text-[#f0f3f8] flex flex-col font-sans">
      {/* Header Bar */}
      <header className="glass-panel border-b border-card-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
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
              <p className="text-[9px] text-emerald-accent font-bold uppercase tracking-widest">Premium Streaming Portal</p>
            </div>
          </div>

          <button
            onClick={() => setIsNoticeModalOpen(true)}
            className="relative p-2.5 bg-slate-900 hover:bg-slate-800 text-white border border-card-border rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            title="View Announcements"
          >
            <Bell className="h-5 w-5 text-emerald-accent" />
            {announcements.length > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-600 border border-[#090c10] text-[9px] font-black text-white flex items-center justify-center">
                {announcements.length}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Ticker Marquee Headline */}
      {ticker && ticker.is_enabled && (
        <div className="bg-gradient-to-r from-red-950/80 via-[#0f1422] to-red-950/80 border-b border-card-border py-2 relative overflow-hidden flex items-center h-9 z-40">
          <div className="absolute left-0 top-0 bottom-0 px-3.5 bg-red-600 text-white font-black uppercase tracking-wider text-[9px] flex items-center justify-center z-10 shadow-md">
            ⚡ NEWS TICKER
          </div>
          
          <div className="w-full whitespace-nowrap overflow-hidden">
            <span className="animate-marquee text-xs font-extrabold text-white tracking-wide">
              {ticker.ticker_text}
            </span>
          </div>
        </div>
      )}

      {/* Announcements Slider */}
      {announcements.length > 0 && (
        <div className="max-w-7xl mx-auto w-full px-6 pt-6">
          <div className="bg-gradient-to-r from-emerald-500/10 to-gold-accent/5 border border-emerald-500/20 p-4 rounded-2xl flex items-center gap-3">
            <div className="h-10 w-10 shrink-0 bg-emerald-500/20 border border-emerald-500/30 rounded-xl flex items-center justify-center text-emerald-accent">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-black uppercase text-white tracking-wide">
                {announcements[0].title}
              </h4>
              <p className="text-xs text-slate-300 font-medium mt-0.5">
                {announcements[0].message}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="max-w-7xl mx-auto w-full px-6 py-8 flex-1 space-y-8">
        
        {/* Banner Section */}
        <section className="w-full rounded-3xl overflow-hidden border border-card-border shadow-2xl bg-[#090c10]">
          <img 
            src={ticker?.banner_url || "/banner.png"} 
            alt="Live Sports Broadcasts - Watch FIFA World Cup 2026 Live Streams" 
            className="w-full h-auto block" 
          />
        </section>

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
                ? '🔴 Live Now' 
                : tab === 'upcoming' 
                  ? '📅 Upcoming Fixtures' 
                  : tab === 'finished'
                    ? '🏁 Finished Matches'
                    : '📺 Live Channels'}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab !== 'channels' ? (
          isLoading ? (
            <div className="flex flex-col items-center justify-center py-24">
              <Loader2 className="h-8 w-8 text-emerald-accent animate-spin" />
              <p className="text-sm text-slate-400 mt-4">Loading streaming schedule...</p>
            </div>
          ) : currentList.length === 0 ? (
            <div className="glass-panel p-16 text-center rounded-3xl border border-card-border">
              <Tv className="h-12 w-12 text-slate-700 mx-auto mb-4" />
              <h3 className="text-lg font-black text-white uppercase">No Matches Broadcasts</h3>
              <p className="text-sm text-slate-400 mt-1">There are no active matches in this tab. Tune in during kickoff schedules.</p>
            </div>
          ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {currentList.map((match) => {
              const homeFlag = getTeamFlag(match, 'home');
              const awayFlag = getTeamFlag(match, 'away');
              const homeName = getTeamName(match, 'home') || 'Home Team';
              const awayName = getTeamName(match, 'away') || 'Away Team';
              
              const isLive = match.status === 'live' || match.status === 'half_time';
              const isUpcoming = match.status === 'upcoming';

              return (
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
                      {match.status}
                    </span>
                  </div>

                  {/* Teams and scores */}
                  <div className="flex items-center justify-between text-center">
                    <div className="w-5/12 flex flex-col items-center gap-2">
                      <div className="h-14 w-20 bg-slate-900/60 rounded-2xl overflow-hidden border border-card-border flex items-center justify-center p-1 shadow">
                        {homeFlag ? (
                          <img src={homeFlag} alt={homeName} className="h-full w-full object-cover rounded-lg" />
                        ) : (
                          <span className="text-xs text-slate-500 font-black">HOME</span>
                        )}
                      </div>
                      <span className="font-extrabold text-white text-sm line-clamp-1">{homeName}</span>
                    </div>

                    <div className="w-2/12 flex flex-col items-center justify-center">
                      {(isLive || match.status === 'finished') ? (
                        <span className="text-3xl font-black text-white tracking-tight">{match.home_score} - {match.away_score}</span>
                      ) : (
                        <span className="px-2.5 py-1 bg-slate-950 border border-slate-800 text-xs font-black rounded-lg text-slate-500">VS</span>
                      )}
                    </div>

                    <div className="w-5/12 flex flex-col items-center gap-2">
                      <div className="h-14 w-20 bg-slate-900/60 rounded-2xl overflow-hidden border border-card-border flex items-center justify-center p-1 shadow">
                        {awayFlag ? (
                          <img src={awayFlag} alt={awayName} className="h-full w-full object-cover rounded-lg" />
                        ) : (
                          <span className="text-xs text-slate-500 font-black">AWAY</span>
                        )}
                      </div>
                      <span className="font-extrabold text-white text-sm line-clamp-1">{awayName}</span>
                    </div>
                  </div>

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
              );
            })}
          </div>
        )
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* TV Stream Player */}
          <div className="lg:col-span-2 space-y-4">
            <div className="aspect-video w-full relative bg-black rounded-3xl overflow-hidden border border-card-border shadow-2xl">
              {selectedChannelUrl ? (
                <HlsPlayer 
                  url={selectedChannelUrl} 
                  onError={(err) => console.error(err)} 
                />
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
          href="https://www.tanvirh.pro" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-emerald-accent hover:text-emerald-400 underline decoration-dotted transition-colors"
        >
          Tanvir Hossain
        </a>
      </footer>

      {/* Notifications / Announcements Modal */}
      {isNoticeModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg glass-panel p-6 rounded-3xl space-y-6 relative border border-card-border shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-card-border">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-emerald-accent" />
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  Important Broadcasts ({announcements.length})
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
              {announcements.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs font-semibold uppercase">
                  No active broadcasts found.
                </div>
              ) : (
                announcements.map((ann) => {
                  const isHighPriority = ann.priority === 'high';
                  return (
                    <div 
                      key={ann.id} 
                      className={`p-4 rounded-2xl border transition-all ${
                        isHighPriority 
                          ? 'bg-red-500/5 border-red-500/20' 
                          : 'bg-slate-950/40 border-slate-900'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <h4 className="text-sm font-black text-white tracking-wide">{ann.title}</h4>
                        {isHighPriority && (
                          <span className="px-2 py-0.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded text-[8px] font-black uppercase tracking-wider">
                            Urgent
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-300 font-medium mt-1.5 leading-relaxed">
                        {ann.message}
                      </p>
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
      )}

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
