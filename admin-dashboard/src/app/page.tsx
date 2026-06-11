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
  ShieldAlert
} from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState<'live' | 'upcoming' | 'finished'>('live');

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

  const liveList = matches.filter(m => m.status === 'live' || m.status === 'half_time');
  const upcomingList = matches.filter(m => m.status === 'upcoming');
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
            <span className="text-2xl">🏆</span>
            <div>
              <h1 className="font-black text-sm tracking-wider uppercase text-white">WORLD CUP 2026</h1>
              <p className="text-[9px] text-emerald-accent font-bold uppercase tracking-widest">Premium Streaming Portal</p>
            </div>
          </div>

          <Link
            href="/admin"
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold rounded-xl transition-all"
          >
            <ShieldAlert className="h-4 w-4 text-emerald-accent" />
            Admin Console
          </Link>
        </div>
      </header>

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
        <section className="glass-panel p-8 md:p-12 rounded-3xl relative overflow-hidden bg-gradient-to-br from-[#10b981]/10 to-transparent border border-card-border">
          <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-80 h-80 bg-emerald-500/5 rounded-full blur-[80px] pointer-events-none" />
          <div className="max-w-xl space-y-4 relative z-10">
            <span className="px-3 py-1 bg-emerald-accent/20 border border-emerald-accent/30 text-emerald-accent text-[10px] font-black uppercase tracking-wider rounded-lg">
              Live Sports Broadcasts
            </span>
            <h2 className="text-3xl md:text-5xl font-black text-white leading-tight uppercase tracking-tight">
              Watch FIFA World Cup 2026 Live streams
            </h2>
            <p className="text-sm md:text-base text-slate-300 font-medium">
              Free, instant access to all matches in ultra high quality. No sign-ups required. Connect your players and enjoy latency-free soccer feeds.
            </p>
          </div>
        </section>

        {/* Tab Row */}
        <div className="flex border-b border-card-border">
          {(['live', 'upcoming', 'finished'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3.5 font-black uppercase text-xs tracking-wider border-b-2 transition-all cursor-pointer ${
                activeTab === tab
                  ? 'border-emerald-accent text-emerald-accent'
                  : 'border-transparent text-slate-500 hover:text-white'
              }`}
            >
              {tab === 'live' ? '🔴 Live Now' : tab === 'upcoming' ? '📅 Upcoming Fixtures' : '🏁 Finished Matches'}
            </button>
          ))}
        </div>

        {/* Matches lists */}
        {isLoading ? (
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
        )}
      </main>
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
