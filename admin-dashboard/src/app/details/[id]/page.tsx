'use client';

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import AdsterraAd from '@/components/AdsterraAd';
import { 
  ArrowLeft, 
  Tv, 
  MapPin, 
  Calendar as CalendarIcon, 
  Loader2, 
  Info,
  Trophy,
  AlertTriangle,
  Clock
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

export default function MatchDetailsPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();

  // Fetch match details
  const { data: match, isLoading, error } = useQuery<Match>({
    queryKey: ['match-details', id],
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
      return data as unknown as Match;
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

  const getTeamName = (side: 'home' | 'away') => {
    if (!match) return '';
    if (side === 'home') {
      return match.home_team_id ? (match.home_team?.name) : match.home_team_custom_name;
    } else {
      return match.away_team_id ? (match.away_team?.name) : match.away_team_custom_name;
    }
  };

  const getTeamFlag = (side: 'home' | 'away') => {
    if (!match) return '';
    if (side === 'home') {
      return match.home_team_id ? match.home_team?.flag_url : match.home_team_custom_flag;
    } else {
      return match.away_team_id ? match.away_team?.flag_url : match.away_team_custom_flag;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#090c10] flex flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 text-emerald-accent animate-spin" />
        <p className="text-sm text-slate-400 mt-4 font-semibold">Fetching match profiles...</p>
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="min-h-screen bg-[#090c10] text-[#f0f3f8] flex flex-col items-center justify-center p-6 text-center">
        <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-xl font-black uppercase">Match Not Found</h3>
        <p className="text-sm text-slate-400 mt-1 max-w-md">The match ID you are trying to view does not exist or has been removed from the database.</p>
        <Link href="/" className="mt-6 px-6 py-3 bg-slate-800 hover:bg-slate-700 font-bold rounded-xl text-xs uppercase tracking-wider transition-all">
          Back to Home
        </Link>
      </div>
    );
  }

  const homeName = getTeamName('home') || 'Home Team';
  const awayName = getTeamName('away') || 'Away Team';
  const homeFlag = getTeamFlag('home');
  const awayFlag = getTeamFlag('away');

  const isLive = match.status === 'live' || match.status === 'half_time';
  const isUpcoming = match.status === 'upcoming';
  const isFinished = match.status === 'finished';

  return (
    <div className="min-h-screen bg-[#090c10] text-[#f0f3f8] flex flex-col font-sans">
      {/* Adsterra Popunder & Social Bar (Details Page) */}
      <AdsterraAd 
        htmlCode={adsterra?.popunder_script} 
        enabled={!!adsterra?.is_enabled && adsterra?.custom_scripts?.detailsPage?.popunder !== false} 
      />
      <AdsterraAd 
        htmlCode={adsterra?.social_bar_script} 
        enabled={!!adsterra?.is_enabled && adsterra?.custom_scripts?.detailsPage?.socialBar !== false} 
      />

      {/* Header bar */}
      <header className="glass-panel border-b border-card-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.back()}
              className="p-2 bg-slate-900 border border-card-border hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
            >
              <ArrowLeft className="h-5 w-5 text-white" />
            </button>
            <div>
              <h2 className="font-extrabold text-[10px] text-emerald-accent uppercase tracking-widest">{match.tournament_name}</h2>
              <h1 className="font-black text-sm md:text-base text-white mt-0.5">Match Details</h1>
            </div>
          </div>
          <div className="flex items-center">
            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
              isLive 
                ? 'bg-red-500/10 text-red-400 border-red-500/25 animate-pulse'
                : isUpcoming 
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}>
              {match.status}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto w-full px-6 py-8 flex-1 space-y-8">
        
        {/* Match Header Hero Card */}
        <section className="glass-panel p-8 md:p-12 rounded-3xl relative overflow-hidden bg-gradient-to-br from-[#10b981]/5 to-transparent border border-card-border">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/5 rounded-full blur-[90px] pointer-events-none" />
          
          <div className="flex flex-col items-center justify-center space-y-8 relative z-10">
            {/* Tournament badge */}
            <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-950/80 border border-card-border text-xs font-bold rounded-full text-slate-300">
              <Trophy className="h-3.5 w-3.5 text-emerald-accent" />
              <span>{match.tournament_name}</span>
            </div>

            {/* Teams Matchup display */}
            <div className="w-full flex items-center justify-between gap-1.5">
              {/* Home Team */}
              <div className="w-[38%] shrink-0 flex flex-col items-center gap-4 text-center min-w-0">
                <div className="h-20 w-28 bg-slate-900/80 rounded-2xl overflow-hidden border border-card-border flex items-center justify-center p-1.5 shadow-xl transition-transform hover:scale-[1.03]">
                  {homeFlag ? (
                    <img src={homeFlag} alt={homeName} className="h-full w-full object-cover rounded-lg" />
                  ) : (
                    <span className="text-xs text-slate-500 font-black">HOME</span>
                  )}
                </div>
                <h3 className="text-base md:text-xl font-black text-white w-full truncate">{homeName}</h3>
              </div>

              {/* Score or VS */}
              <div className="w-[24%] shrink-0 flex flex-col items-center justify-center">
                {(isLive || (isFinished && (match.home_score > 0 || match.away_score > 0))) ? (
                  <div className="flex flex-col items-center">
                    <span className="text-2xl md:text-5xl lg:text-6xl font-black text-white tracking-tighter whitespace-nowrap">
                      {match.home_score} - {match.away_score}
                    </span>
                    {isLive && (
                      <span className="text-[10px] font-black text-red-500 uppercase tracking-widest mt-2 animate-pulse whitespace-nowrap">
                        LIVE NOW
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="px-4 py-2 bg-slate-950 border border-card-border text-sm font-black rounded-xl text-slate-400 shadow whitespace-nowrap">
                    VS
                  </div>
                )}
              </div>

              {/* Away Team */}
              <div className="w-[38%] shrink-0 flex flex-col items-center gap-4 text-center min-w-0">
                <div className="h-20 w-28 bg-slate-900/80 rounded-2xl overflow-hidden border border-card-border flex items-center justify-center p-1.5 shadow-xl transition-transform hover:scale-[1.03]">
                  {awayFlag ? (
                    <img src={awayFlag} alt={awayName} className="h-full w-full object-cover rounded-lg" />
                  ) : (
                    <span className="text-xs text-slate-500 font-black">AWAY</span>
                  )}
                </div>
                <h3 className="text-base md:text-xl font-black text-white w-full truncate">{awayName}</h3>
              </div>
            </div>

            {/* Countdown for Upcoming */}
            {isUpcoming && (
              <div className="w-full pt-4 border-t border-card-border/60">
                <DetailsCountdown targetTime={match.match_timestamp} />
              </div>
            )}
          </div>
        </section>

        {/* Action Button: Watch Live */}
        {(isLive || isUpcoming) && (
          <Link
            href={`/watch/${match.id}`}
            className="w-full py-4 bg-emerald-accent hover:bg-emerald-500 text-black font-extrabold uppercase tracking-wider rounded-2xl transition-all shadow-lg shadow-emerald-500/10 hover:scale-[1.01] flex items-center justify-center gap-2.5 text-sm cursor-pointer"
          >
            <Tv className="h-5 w-5" />
            {isLive ? 'Watch Live Stream Feed' : 'Pre-join Video Channel'}
          </Link>
        )}

        {/* Match Details info list */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Information Card */}
          <div className="glass-panel p-6 rounded-2xl border border-card-border space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 border-b border-card-border pb-3 flex items-center gap-2">
              <Info className="h-4 w-4 text-emerald-accent" />
              Venue & Kickoff Info
            </h3>
            
            <div className="space-y-4 text-xs font-bold">
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-slate-500 shrink-0" />
                <div>
                  <span className="text-slate-500 block uppercase text-[10px]">Stadium Venue</span>
                  <span className="text-white text-sm mt-0.5 block">{match.stadium_name}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <CalendarIcon className="h-5 w-5 text-slate-500 shrink-0" />
                <div>
                  <span className="text-slate-500 block uppercase text-[10px]">Kickoff Date</span>
                  <span className="text-white text-sm mt-0.5 block">{match.match_date}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-slate-500 shrink-0" />
                <div>
                  <span className="text-slate-500 block uppercase text-[10px]">Local Kickoff Time</span>
                  <span className="text-white text-sm mt-0.5 block">{match.match_time.substring(0, 5)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Tournament Overview Card */}
          <div className="glass-panel p-6 rounded-2xl border border-card-border space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 border-b border-card-border pb-3 flex items-center gap-2">
              <Trophy className="h-4 w-4 text-emerald-accent" />
              Broadcasting info
            </h3>
            
            <div className="space-y-3 text-xs font-bold text-slate-300">
              <p>📺 Standard Quality: <span className="text-white">1080p Full HD (60fps)</span></p>
              <p>🌐 Fallback Links: <span className="text-white">Yes, 3 Backup servers configured</span></p>
              <p>🎙️ Audio Languages: <span className="text-white">English, Arabic, Spanish</span></p>
              <p>⚡ Latency Delay: <span className="text-emerald-accent">~2.8 seconds (Ultra Low Latency)</span></p>
              <p>🔓 Access Restriction: <span className="text-emerald-accent">None (Open Public Feed)</span></p>
            </div>
          </div>
        </div>

        {/* Details Page Middle Ad */}
        {getAdForPlacement('detailsMiddle')}

        {/* Rich Text Match description section */}
        {match.description && (
          <div className="glass-panel p-6 rounded-2xl border border-card-border space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 border-b border-card-border pb-3">
              Match Preview & Team News
            </h3>
            <div 
              className="text-sm text-slate-300 leading-relaxed font-medium prose prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: match.description }}
            />
          </div>
        )}
      </main>
    </div>
  );
}

function DetailsCountdown({ targetTime }: { targetTime: string }) {
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
      <div className="text-center text-sm font-black text-emerald-accent uppercase tracking-widest animate-pulse">
        🔴 Broadcast is currently active!
      </div>
    );
  }

  const seconds = Math.floor((timeRemaining / 1000) % 60);
  const minutes = Math.floor((timeRemaining / (1000 * 60)) % 60);
  const hours = Math.floor((timeRemaining / (1000 * 60 * 60)) % 24);
  const days = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));

  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Countdown to Kickoff</span>
      <div className="flex items-center gap-1.5 text-base md:text-xl font-black text-white">
        <span className="px-3 py-1.5 bg-slate-950 border border-slate-900 rounded-xl shadow">{String(days).padStart(2, '0')}d</span>
        <span className="text-emerald-accent">:</span>
        <span className="px-3 py-1.5 bg-slate-950 border border-slate-900 rounded-xl shadow">{String(hours).padStart(2, '0')}h</span>
        <span className="text-emerald-accent">:</span>
        <span className="px-3 py-1.5 bg-slate-950 border border-slate-900 rounded-xl shadow">{String(minutes).padStart(2, '0')}m</span>
        <span className="text-emerald-accent">:</span>
        <span className="px-3 py-1.5 bg-slate-950 border border-slate-900 rounded-xl shadow">{String(seconds).padStart(2, '0')}s</span>
      </div>
    </div>
  );
}
