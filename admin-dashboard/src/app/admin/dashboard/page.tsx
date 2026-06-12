'use client';

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import AdminLayout from '@/components/AdminLayout';
import { 
  Users, 
  Calendar, 
  Tv, 
  Eye, 
  TrendingUp, 
  TrendingDown, 
  BellRing,
  Upload,
  Check,
  Volume2
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';

const mockChartData = [
  { name: '00:00', users: 120, streams: 2 },
  { name: '04:00', users: 90, streams: 2 },
  { name: '08:00', users: 210, streams: 4 },
  { name: '12:00', users: 560, streams: 8 },
  { name: '16:00', users: 1200, streams: 12 },
  { name: '20:00', users: 2400, streams: 15 },
  { name: '24:00', users: 1800, streams: 10 },
];

const mockMatchesData = [
  { name: 'Argentina vs France', viewers: 1420, color: '#10b981' },
  { name: 'Brazil vs Germany', viewers: 980, color: '#fbbf24' },
  { name: 'Spain vs England', viewers: 840, color: '#3b82f6' },
  { name: 'USA vs Mexico', viewers: 750, color: '#ec4899' },
];

export default function DashboardPage() {
  // Fetch ticker settings
  const { data: tickerData, refetch: refetchTicker } = useQuery({
    queryKey: ['ticker-settings'],
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

  const [tickerText, setTickerText] = useState('');
  const [isTickerEnabled, setIsTickerEnabled] = useState(true);
  const [updatingTicker, setUpdatingTicker] = useState(false);
  const [tickerSuccess, setTickerSuccess] = useState(false);

  // Site Identity States
  const [siteName, setSiteName] = useState('WORLD CUP 2026');
  const [siteLogoUrl, setSiteLogoUrl] = useState('');
  const [siteLogoFile, setSiteLogoFile] = useState<File | null>(null);
  const [siteBannerUrl, setSiteBannerUrl] = useState('');
  const [siteBannerFile, setSiteBannerFile] = useState<File | null>(null);
  const [showCounters, setShowCounters] = useState(true);
  const [updatingBranding, setUpdatingBranding] = useState(false);
  const [brandingSuccess, setBrandingSuccess] = useState(false);

  // Visitor Offsets States
  const [viewsOffset, setViewsOffset] = useState(0);
  const [viewersOffset, setViewersOffset] = useState(0);
  const [updatingCounts, setUpdatingCounts] = useState(false);
  const [countsSuccess, setCountsSuccess] = useState(false);

  // Audio Announcement States
  const [audioUrl, setAudioUrl] = useState('');
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [updatingAudio, setUploadingAudio] = useState(false);
  const [audioSuccess, setAudioSuccess] = useState(false);

  // Default Streams States
  const [defaultStreams, setDefaultStreams] = useState<{ label: string; url: string }[]>([]);
  const [updatingDefaultStreams, setUpdatingDefaultStreams] = useState(false);
  const [defaultStreamsSuccess, setDefaultStreamsSuccess] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Fetch real database traffic statistics using optimized RPCs
  const { data: trafficStats } = useQuery({
    queryKey: ['dashboard-traffic-stats'],
    queryFn: async () => {
      // 1. Fetch total analytics rows
      const { data: realViews, error: viewsErr } = await supabase.rpc('get_total_views_count');
      if (viewsErr) throw viewsErr;

      // 2. Fetch unique active viewers
      const { data: realViewers, error: viewersErr } = await supabase.rpc('get_active_viewers_count');
      if (viewersErr) throw viewersErr;

      return {
        realViews: realViews || 0,
        realViewers: realViewers || 0
      };
    },
    refetchInterval: 15000 // refetch every 15 seconds (optimized for high traffic)
  });

  useEffect(() => {
    if (tickerData) {
      setTickerText(tickerData.ticker_text || '');
      setIsTickerEnabled(tickerData.is_enabled !== false); // default to true
      setSiteName(tickerData.site_name || 'WORLD CUP 2026');
      setSiteLogoUrl(tickerData.logo_url || '');
      setSiteBannerUrl(tickerData.banner_url || '');
      setShowCounters(tickerData.show_counters !== false); // default to true
      setViewsOffset(tickerData.views_offset || 0);
      setViewersOffset(tickerData.viewers_offset || 0);
      setAudioUrl(tickerData.audio_url || '');
      setIsAudioEnabled(tickerData.audio_enabled !== false);
      if (Array.isArray((tickerData as any).default_streams)) {
        setDefaultStreams((tickerData as any).default_streams);
      } else {
        setDefaultStreams([]);
      }
    }
  }, [tickerData]);

  const handleAudioSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadingAudio(true);
    setAudioSuccess(false);

    try {
      let uploadedUrl = audioUrl;

      if (audioFile) {
        const fileExt = audioFile.name.split('.').pop();
        const fileName = `announcements/audio_${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('teams')
          .upload(fileName, audioFile, { upsert: true });

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from('teams').getPublicUrl(fileName);
        uploadedUrl = data.publicUrl;
        setAudioUrl(uploadedUrl);
        setAudioFile(null);
      }

      const updateData = {
        audio_url: uploadedUrl,
        audio_enabled: isAudioEnabled,
        updated_at: new Date().toISOString()
      };

      if (tickerData?.id) {
        const { error } = await supabase
          .from('ticker_settings')
          .update(updateData)
          .eq('id', tickerData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('ticker_settings')
          .insert([updateData]);
        if (error) throw error;
      }

      setAudioSuccess(true);
      refetchTicker();
      setTimeout(() => setAudioSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      alert('Failed to update audio announcement settings');
    } finally {
      setUploadingAudio(false);
    }
  };

  const handleTickerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdatingTicker(true);
    setTickerSuccess(false);

    try {
      const updateData = { 
        ticker_text: tickerText, 
        is_enabled: isTickerEnabled,
        updated_at: new Date().toISOString() 
      };

      if (tickerData?.id) {
        const { error } = await supabase
          .from('ticker_settings')
          .update(updateData)
          .eq('id', tickerData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('ticker_settings')
          .insert([updateData]);
        if (error) throw error;
      }
      setTickerSuccess(true);
      refetchTicker();
      setTimeout(() => setTickerSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      alert('Failed to update ticker settings');
    } finally {
      setUpdatingTicker(false);
    }
  };

  const handleCountSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdatingCounts(true);
    setCountsSuccess(false);

    try {
      const updateData = {
        views_offset: Number(viewsOffset),
        viewers_offset: Number(viewersOffset),
        updated_at: new Date().toISOString()
      };

      if (tickerData?.id) {
        const { error } = await supabase
          .from('ticker_settings')
          .update(updateData)
          .eq('id', tickerData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('ticker_settings')
          .insert([updateData]);
        if (error) throw error;
      }

      setCountsSuccess(true);
      refetchTicker();
      setTimeout(() => setCountsSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      alert('Failed to update visitor offset settings');
    } finally {
      setUpdatingCounts(false);
    }
  };

  // Drag and Drop Helpers for Default Stream List
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const list = [...defaultStreams];
    const draggedItem = list[draggedIndex];
    list.splice(draggedIndex, 1);
    list.splice(index, 0, draggedItem);
    
    setDraggedIndex(index);
    setDefaultStreams(list);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const moveStreamItem = (index: number, direction: 'up' | 'down') => {
    const list = [...defaultStreams];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (newIndex < 0 || newIndex >= list.length) return;
    
    const temp = list[index];
    list[index] = list[newIndex];
    list[newIndex] = temp;
    
    setDefaultStreams(list);
  };

  const handleDefaultStreamsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdatingDefaultStreams(true);
    setDefaultStreamsSuccess(false);

    try {
      const filteredStreams = defaultStreams.filter(item => item.label.trim() && item.url.trim());

      const updateData = {
        default_streams: filteredStreams,
        updated_at: new Date().toISOString()
      };

      if (tickerData?.id) {
        const { error } = await supabase
          .from('ticker_settings')
          .update(updateData)
          .eq('id', tickerData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('ticker_settings')
          .insert([updateData]);
        if (error) throw error;
      }

      setDefaultStreamsSuccess(true);
      refetchTicker();
      setTimeout(() => setDefaultStreamsSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      alert('Failed to save default stream links.');
    } finally {
      setUpdatingDefaultStreams(false);
    }
  };

  const uploadSiteLogo = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_logo_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `site/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('teams')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from('teams').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const uploadSiteBanner = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_banner_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `site/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('teams')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from('teams').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleBrandingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdatingBranding(true);
    setBrandingSuccess(false);

    try {
      let finalLogoUrl = siteLogoUrl;
      let finalBannerUrl = siteBannerUrl;

      if (siteLogoFile) {
        finalLogoUrl = await uploadSiteLogo(siteLogoFile);
      }

      if (siteBannerFile) {
        finalBannerUrl = await uploadSiteBanner(siteBannerFile);
      }

      const updateData = {
        site_name: siteName,
        logo_url: finalLogoUrl || null,
        banner_url: finalBannerUrl || null,
        show_counters: showCounters,
        updated_at: new Date().toISOString()
      };

      if (tickerData?.id) {
        const { error } = await supabase
          .from('ticker_settings')
          .update(updateData)
          .eq('id', tickerData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('ticker_settings')
          .insert([updateData]);
        if (error) throw error;
      }

      setBrandingSuccess(true);
      refetchTicker();
      setSiteLogoFile(null);
      setSiteBannerFile(null);
      setTimeout(() => setBrandingSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      alert('Failed to update website branding settings');
    } finally {
      setUpdatingBranding(false);
    }
  };

  // Fetch real database statistics
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const [teamsRes, matchesRes, streamsRes, announcementsRes] = await Promise.all([
        supabase.from('teams').select('*', { count: 'exact', head: true }),
        supabase.from('matches').select('*', { count: 'exact', head: true }),
        supabase.from('streams').select('*', { count: 'exact', head: true }),
        supabase.from('announcements').select('*', { count: 'exact', head: true })
      ]);

      const liveMatches = await supabase
        .from('matches')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'live');

      return {
        teamsCount: teamsRes.count || 0,
        matchesCount: matchesRes.count || 0,
        streamsCount: streamsRes.count || 0,
        announcementsCount: announcementsRes.count || 0,
        liveMatchesCount: liveMatches.count || 0,
      };
    },
    refetchInterval: 10000 // refresh every 10s
  });

  const cards = [
    { 
      name: 'Total Teams', 
      value: stats?.teamsCount ?? 0, 
      desc: 'Active participating nations', 
      icon: Users,
      color: 'from-blue-500/20 to-indigo-500/5', 
      border: 'border-blue-500/20',
      iconColor: 'text-blue-400'
    },
    { 
      name: 'Scheduled Matches', 
      value: stats?.matchesCount ?? 0, 
      desc: 'Total tournament schedule', 
      icon: Calendar,
      color: 'from-amber-500/20 to-gold-500/5', 
      border: 'border-amber-500/20',
      iconColor: 'text-amber-400'
    },
    { 
      name: 'Active Streams', 
      value: stats?.streamsCount ?? 0, 
      desc: 'Live M3U8 transmission feeds', 
      icon: Tv,
      color: 'from-emerald-500/20 to-teal-500/5', 
      border: 'border-emerald-500/20',
      iconColor: 'text-emerald-400'
    },
    { 
      name: 'Live Now', 
      value: stats?.liveMatchesCount ?? 0, 
      desc: 'Matches broadcasting currently', 
      icon: Eye,
      color: 'from-red-500/20 to-rose-500/5', 
      border: 'border-red-500/20',
      iconColor: 'text-red-400',
      pulse: true
    },
    { 
      name: 'Total Views', 
      value: ((trafficStats?.realViews || 0) + viewsOffset).toLocaleString(), 
      desc: `Real: ${trafficStats?.realViews || 0} + Offset: ${viewsOffset}`, 
      icon: Eye,
      color: 'from-purple-500/20 to-fuchsia-500/5', 
      border: 'border-purple-500/20',
      iconColor: 'text-purple-400'
    },
    { 
      name: 'Concurrent Viewers', 
      value: ((trafficStats?.realViewers || 0) + viewersOffset).toLocaleString(), 
      desc: `Real: ${trafficStats?.realViewers || 0} + Offset: ${viewersOffset}`, 
      icon: Users,
      color: 'from-sky-500/20 to-blue-500/5', 
      border: 'border-sky-500/20',
      iconColor: 'text-sky-400',
      pulse: true
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Page title */}
        <div>
          <h1 className="text-3xl font-extrabold text-white uppercase tracking-tight">System Overview</h1>
          <p className="text-slate-400 text-sm mt-1">Real-time status updates and telemetry metrics.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <div 
                key={card.name} 
                className={`glass-panel p-6 rounded-2xl border ${card.border} bg-gradient-to-br ${card.color} relative overflow-hidden`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{card.name}</p>
                    <h3 className="text-3xl font-black text-white mt-2 tracking-tight">
                      {isLoading ? '...' : card.value}
                    </h3>
                  </div>
                  <div className={`p-3 rounded-xl bg-slate-900/60 border border-slate-800 ${card.iconColor}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                </div>
                <p className="text-xs text-slate-400 mt-4 flex items-center gap-1 font-medium">
                  {card.pulse && <span className="h-2 w-2 rounded-full bg-red-500 animate-ping inline-block mr-1" />}
                  {card.desc}
                </p>
              </div>
            );
          })}
        </div>

        {/* Headline Ticker Settings Form */}
        <div className="glass-panel p-6 rounded-2xl border border-card-border space-y-4">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <div>
              <h3 className="text-lg font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <BellRing className="h-5 w-5 text-emerald-accent" />
                Animated TV Headline Ticker
              </h3>
              <p className="text-xs text-slate-400 mt-1">Update the marquee text scrolling under the main header on the user homepage and watch page.</p>
            </div>

            <div className="flex items-center gap-2.5 p-2 bg-slate-950/40 border border-slate-900 rounded-xl">
              <button
                type="button"
                onClick={() => setIsTickerEnabled(!isTickerEnabled)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isTickerEnabled ? 'bg-emerald-505 bg-emerald-500' : 'bg-slate-800'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    isTickerEnabled ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
              <span className="text-[10px] font-extrabold text-white uppercase">Enable Ticker</span>
            </div>
          </div>
          
          <form onSubmit={handleTickerSubmit} className="space-y-4">
            <textarea
              rows={3}
              required
              value={tickerText}
              onChange={(e) => setTickerText(e.target.value)}
              className="w-full px-4 py-3 glass-input rounded-xl text-sm"
              placeholder="e.g. 📢 Welcome to the FIFA World Cup 2026 Live Streaming Portal! Enjoy HD streams! 📢 (No word limitation)"
            />
            <div className="flex justify-between items-center">
              {tickerSuccess ? (
                <p className="text-xs text-emerald-accent font-bold animate-pulse">✓ Ticker settings updated successfully!</p>
              ) : <div />}
              <button
                type="submit"
                disabled={updatingTicker}
                className="px-6 py-3 bg-emerald-accent hover:bg-emerald-500 text-black font-extrabold uppercase text-xs tracking-wider rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {updatingTicker ? 'Saving...' : 'Save Ticker'}
              </button>
            </div>
          </form>
        </div>

        {/* Audio Announcement Settings Form */}
        <div className="glass-panel p-6 rounded-2xl border border-card-border space-y-4">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <div>
              <h3 className="text-lg font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Volume2 className="h-5 w-5 text-emerald-accent" />
                Audio Announcement Settings
              </h3>
              <p className="text-xs text-slate-400 mt-1">Upload an audio announcement (.mp3, .wav) that will play automatically when users first enter or refresh the website.</p>
            </div>

            <div className="flex items-center gap-2.5 p-2 bg-slate-950/40 border border-slate-900 rounded-xl">
              <button
                type="button"
                onClick={() => setIsAudioEnabled(!isAudioEnabled)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isAudioEnabled ? 'bg-emerald-500' : 'bg-slate-800'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    isAudioEnabled ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
              <span className="text-[10px] font-extrabold text-white uppercase">Enable Audio</span>
            </div>
          </div>

          <form onSubmit={handleAudioSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Upload Audio File</label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 px-4 py-3 bg-slate-900 hover:bg-slate-800 border border-card-border text-slate-300 font-bold uppercase text-xs tracking-wider rounded-xl cursor-pointer transition-colors">
                  <Upload className="h-4 w-4 text-emerald-accent" />
                  <span>{audioFile ? audioFile.name : 'Choose Audio File'}</span>
                  <input
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        setAudioFile(e.target.files[0]);
                      }
                    }}
                  />
                </label>
                {audioUrl && (
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-400 truncate">
                      Current: <a href={audioUrl} target="_blank" rel="noopener noreferrer" className="text-emerald-accent underline decoration-dotted">{audioUrl.split('/').pop()}</a>
                    </p>
                  </div>
                )}
              </div>
            </div>

            {audioUrl && (
              <div className="p-3 bg-slate-950/40 border border-slate-900 rounded-xl flex items-center gap-2">
                <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Preview Player:</span>
                <audio src={audioUrl} controls className="h-8 max-w-full flex-1" />
              </div>
            )}

            <div className="flex justify-between items-center">
              {audioSuccess ? (
                <p className="text-xs text-emerald-accent font-bold animate-pulse">✓ Audio settings saved successfully!</p>
              ) : <div />}
              <button
                type="submit"
                disabled={updatingAudio || (!audioFile && audioUrl === tickerData?.audio_url && isAudioEnabled === tickerData?.audio_enabled)}
                className="px-6 py-3 bg-emerald-accent hover:bg-emerald-500 text-black font-extrabold uppercase text-xs tracking-wider rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {updatingAudio ? 'Saving...' : 'Save Audio'}
              </button>
            </div>
          </form>
        </div>

        {/* User Count Settings */}
        <div className="glass-panel p-6 rounded-2xl border border-card-border space-y-4">
          <div>
            <h3 className="text-lg font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Users className="h-5 w-5 text-emerald-accent" />
              Visitor Count & Viewers Offset
            </h3>
            <p className="text-xs text-slate-400 mt-1">Configure offset values to add to the authentic (real) view and viewer counters.</p>
          </div>
          
          <form onSubmit={handleCountSettingsSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Total Views Offset</label>
              <input
                type="number"
                min={0}
                value={viewsOffset}
                onChange={(e) => setViewsOffset(Number(e.target.value))}
                className="w-full px-4 py-3 glass-input rounded-xl text-sm"
                placeholder="0"
              />
              <p className="text-[10px] text-slate-500 font-medium">Added to real database analytics events count (currently {trafficStats?.realViews || 0})</p>
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Live Viewers Offset</label>
              <input
                type="number"
                min={0}
                value={viewersOffset}
                onChange={(e) => setViewersOffset(Number(e.target.value))}
                className="w-full px-4 py-3 glass-input rounded-xl text-sm"
                placeholder="0"
              />
              <p className="text-[10px] text-slate-500 font-medium">Added to real concurrent viewers count in last 5 mins (currently {trafficStats?.realViewers || 0})</p>
            </div>
            
            <div className="sm:col-span-2 flex justify-between items-center border-t border-card-border pt-4">
              {countsSuccess ? (
                <p className="text-xs text-emerald-accent font-bold animate-pulse">✓ Visitor offsets saved successfully!</p>
              ) : <div />}
              <button
                type="submit"
                disabled={updatingCounts}
                className="px-6 py-3 bg-emerald-accent hover:bg-emerald-500 text-black font-extrabold uppercase text-xs tracking-wider rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {updatingCounts ? 'Saving...' : 'Save Offsets'}
              </button>
            </div>
          </form>
        </div>

        {/* Default m3u8 Links Priority Configuration */}
        <div className="glass-panel p-6 rounded-2xl border border-card-border space-y-4">
          <div>
            <h3 className="text-lg font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Tv className="h-5 w-5 text-emerald-accent" />
              Default m3u8 Stream Links
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Configure your default streaming servers and fallbacks. These can be auto-copied when adding new match streams. Drag-and-drop or use the arrows to set their priority list order.
            </p>
          </div>

          <form onSubmit={handleDefaultStreamsSubmit} className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Priority List ({defaultStreams.length} links)</span>
              <button
                type="button"
                onClick={() => setDefaultStreams([...defaultStreams, { label: `Server ${defaultStreams.length + 1}`, url: '' }])}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-emerald-accent border border-slate-800 text-[10px] font-black uppercase rounded-lg transition-colors cursor-pointer"
              >
                + Add More Link
              </button>
            </div>

            <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
              {defaultStreams.length === 0 ? (
                <div className="text-center py-6 border border-dashed border-card-border rounded-xl">
                  <p className="text-xs text-slate-500 font-medium">No default links configured yet. Click "+ Add More Link" to begin.</p>
                </div>
              ) : (
                defaultStreams.map((item, idx) => (
                  <div
                    key={idx}
                    draggable
                    onDragStart={() => handleDragStart(idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDragEnd={handleDragEnd}
                    className={`flex gap-2 items-center p-2.5 bg-slate-950/40 border border-slate-900/60 rounded-xl cursor-move transition-all ${
                      draggedIndex === idx ? 'opacity-40 scale-[0.99] border-emerald-500/40' : 'hover:border-slate-800'
                    }`}
                  >
                    {/* Drag Handle & Ordering Indicator */}
                    <div className="flex flex-col items-center justify-center text-slate-600 px-1 select-none">
                      <span className="text-[10px] font-black text-slate-500 mb-0.5">#{idx + 1}</span>
                      <span className="text-[9px]">☰</span>
                    </div>

                    {/* Form Fields */}
                    <input
                      type="text"
                      required
                      value={item.label}
                      onChange={(e) => {
                        const list = [...defaultStreams];
                        list[idx].label = e.target.value;
                        setDefaultStreams(list);
                      }}
                      placeholder="Label (e.g. Server 1)"
                      className="w-1/3 px-3 py-2 glass-input rounded-xl text-xs"
                    />
                    <input
                      type="url"
                      required
                      value={item.url}
                      onChange={(e) => {
                        const list = [...defaultStreams];
                        list[idx].url = e.target.value;
                        setDefaultStreams(list);
                      }}
                      placeholder="M3U8 Streaming URL"
                      className="flex-1 px-3 py-2 glass-input rounded-xl text-xs"
                    />

                    {/* Reordering & Control Actions */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => moveStreamItem(idx, 'up')}
                        className="p-1.5 bg-slate-950 border border-slate-900 hover:border-slate-800 text-slate-400 rounded-lg disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                        title="Move Up"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        disabled={idx === defaultStreams.length - 1}
                        onClick={() => moveStreamItem(idx, 'down')}
                        className="p-1.5 bg-slate-950 border border-slate-900 hover:border-slate-800 text-slate-400 rounded-lg disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                        title="Move Down"
                      >
                        ▼
                      </button>
                      <button
                        type="button"
                        onClick={() => setDefaultStreams(defaultStreams.filter((_, i) => i !== idx))}
                        className="p-1.5 bg-slate-950 border border-slate-900 hover:border-red-500/25 hover:text-red-400 hover:bg-red-500/10 rounded-lg cursor-pointer"
                        title="Delete Link"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-between items-center border-t border-card-border pt-4">
              {defaultStreamsSuccess ? (
                <p className="text-xs text-emerald-accent font-bold animate-pulse">✓ Default stream priority list saved!</p>
              ) : <div />}
              <button
                type="submit"
                disabled={updatingDefaultStreams}
                className="px-6 py-3 bg-emerald-accent hover:bg-emerald-500 text-black font-extrabold uppercase text-xs tracking-wider rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {updatingDefaultStreams ? 'Saving...' : 'Save Default Links'}
              </button>
            </div>
          </form>
        </div>

        {/* Website Identity & Branding Settings Form */}
        <div className="glass-panel p-6 rounded-2xl border border-card-border space-y-6">
          <div>
            <h3 className="text-lg font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Tv className="h-5 w-5 text-emerald-accent" />
              Website Branding & Analytics Settings
            </h3>
            <p className="text-xs text-slate-400 mt-1">Configure your website's name, logo icon, and real-time statistics counters.</p>
          </div>

          <form onSubmit={handleBrandingSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Site Name and Counters Toggle */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Website Name</label>
                  <input
                    type="text"
                    required
                    value={siteName}
                    onChange={(e) => setSiteName(e.target.value)}
                    placeholder="e.g. WORLD CUP 2026"
                    className="w-full px-4 py-3 glass-input rounded-xl text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Total Views & Live Viewers Count</label>
                  <div className="flex items-center gap-3 p-3 bg-slate-950/60 border border-slate-900 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setShowCounters(!showCounters)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-0 ${
                        showCounters ? 'bg-emerald-500' : 'bg-slate-800'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          showCounters ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                    <div>
                      <span className="text-xs font-extrabold text-white block">Enable Real-Time Counters</span>
                      <span className="text-[10px] text-slate-500 block">Show total views and active concurrent viewers on footer</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Logo Settings */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Custom Logo URL</label>
                    <input
                      type="text"
                      value={siteLogoUrl}
                      onChange={(e) => {
                        setSiteLogoUrl(e.target.value);
                        setSiteLogoFile(null); // Clear file upload if manually entering URL
                      }}
                      placeholder="https://example.com/logo.png"
                      className="w-full px-4 py-3 glass-input rounded-xl text-sm"
                    />
                  </div>

                  <div className="flex items-end justify-center">
                    <div className="h-12 w-12 bg-slate-950/60 border border-slate-900 rounded-xl flex items-center justify-center overflow-hidden shrink-0">
                      {siteLogoFile ? (
                        <img
                          src={URL.createObjectURL(siteLogoFile)}
                          alt="Preview"
                          className="h-full w-full object-contain p-1"
                        />
                      ) : siteLogoUrl ? (
                        <img
                          src={siteLogoUrl}
                          alt="Site Logo"
                          className="h-full w-full object-contain p-1"
                        />
                      ) : (
                        <span className="text-xs text-slate-600 font-extrabold">No Logo</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Or Upload Logo Icon File</label>
                  <label className="flex items-center gap-3 px-4 py-3 bg-slate-950/60 border border-dashed border-slate-800 rounded-xl cursor-pointer hover:border-slate-700 hover:bg-slate-900/50 transition-all duration-150">
                    <Upload className="h-5 w-5 text-slate-500 shrink-0" />
                    <span className="text-xs text-slate-400 font-semibold truncate">
                      {siteLogoFile ? siteLogoFile.name : 'Upload logo file (PNG/SVG recommended)'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        setSiteLogoFile(file);
                        if (file) setSiteLogoUrl(''); // Clear text input if uploading file
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Custom Banner Upload / Delete */}
            <div className="border-t border-card-border pt-6 mt-6">
              <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">📢 Hero Section Banner Design</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2 space-y-1.5">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Custom Banner URL</label>
                      <input
                        type="text"
                        value={siteBannerUrl}
                        onChange={(e) => {
                          setSiteBannerUrl(e.target.value);
                          setSiteBannerFile(null); // Clear file upload if manually entering URL
                        }}
                        placeholder="https://example.com/banner.png"
                        className="w-full px-4 py-3 glass-input rounded-xl text-sm"
                      />
                    </div>

                    <div className="flex items-end justify-center">
                      <div className="h-12 w-24 bg-slate-950/60 border border-slate-900 rounded-xl flex items-center justify-center overflow-hidden shrink-0">
                        {siteBannerFile ? (
                          <img
                            src={URL.createObjectURL(siteBannerFile)}
                            alt="Preview"
                            className="h-full w-full object-contain p-1"
                          />
                        ) : siteBannerUrl ? (
                          <img
                            src={siteBannerUrl}
                            alt="Site Banner"
                            className="h-full w-full object-contain p-1"
                          />
                        ) : (
                          <span className="text-[10px] text-slate-600 font-extrabold text-center leading-none">Default Banner (/banner.png)</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Or Upload Banner File</label>
                    <label className="flex items-center gap-3 px-4 py-3 bg-slate-950/60 border border-dashed border-slate-800 rounded-xl cursor-pointer hover:border-slate-700 hover:bg-slate-900/50 transition-all duration-150">
                      <Upload className="h-5 w-5 text-slate-500 shrink-0" />
                      <span className="text-xs text-slate-400 font-semibold truncate">
                        {siteBannerFile ? siteBannerFile.name : 'Upload banner image file (1200x300 recommended)'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          setSiteBannerFile(file);
                          if (file) setSiteBannerUrl(''); // Clear text input if uploading file
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                <div className="space-y-4 flex flex-col justify-end">
                  <div className="p-4 bg-slate-950/40 border border-slate-900 rounded-2xl flex flex-col gap-2">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Active Banner Action</span>
                    <p className="text-xs text-slate-500">You can delete the custom uploaded banner to reset the hero section back to the default designed image.</p>
                    <button
                      type="button"
                      onClick={() => {
                        setSiteBannerUrl('');
                        setSiteBannerFile(null);
                        alert('Banner cleared. Remember to click "Save Branding" to save changes.');
                      }}
                      className="px-4 py-2 border border-red-500/25 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold uppercase text-[10px] tracking-wide rounded-xl transition-all cursor-pointer w-full text-center"
                    >
                      Delete Banner (Reset to Default)
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Recommendations Alert Box */}
            <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl space-y-2.5">
              <span className="text-[10px] text-emerald-accent font-black uppercase tracking-wider block">💡 LOGO & BANNER SIZE GUIDANCE</span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <p className="font-extrabold text-white">Worldwide Standard Branding Sizes:</p>
                  <ul className="list-disc pl-4 space-y-0.5 text-slate-400 font-medium">
                    <li>Landscape Header Logo: <strong className="text-slate-300">250px × 150px</strong></li>
                    <li>Square Icon / Favicon: <strong className="text-slate-300">512px × 512px</strong></li>
                    <li>Landscape Hero Banner: <strong className="text-slate-300">1200px × 300px</strong></li>
                  </ul>
                </div>
                <div className="space-y-1">
                  <p className="font-extrabold text-white">Recommended for this Website's Layout:</p>
                  <ul className="list-disc pl-4 space-y-0.5 text-slate-400 font-medium">
                    <li>Header Square Icon: <strong className="text-emerald-accent">32px × 32px</strong></li>
                    <li>Header Banner/Logo: <strong className="text-emerald-accent">120px × 32px</strong></li>
                    <li>Hero Section Banner: <strong className="text-emerald-accent">1200px × 300px</strong> (Aspect Ratio `4:1` for responsive fitting)</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Form footer */}
            <div className="flex items-center justify-between border-t border-card-border pt-4">
              {brandingSuccess ? (
                <p className="text-xs text-emerald-accent font-bold flex items-center gap-1 animate-pulse">
                  <Check className="h-4 w-4" /> Branding settings saved successfully!
                </p>
              ) : (
                <div />
              )}
              <button
                type="submit"
                disabled={updatingBranding}
                className="px-6 py-3 bg-emerald-accent hover:bg-emerald-500 text-black font-extrabold uppercase text-xs tracking-wider rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {updatingBranding ? 'Saving Settings...' : 'Save Branding'}
              </button>
            </div>
          </form>
        </div>

        {/* Graphs section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main User traffic chart */}
          <div className="glass-panel p-6 rounded-2xl lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white uppercase tracking-wider">User Engagement</h3>
                <p className="text-xs text-slate-400">Total active users on the mobile platform today.</p>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold rounded-lg">
                <TrendingUp className="h-4 w-4" />
                +14.2%
              </div>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={mockChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#0f172a', 
                      borderColor: '#334155',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '12px'
                    }} 
                  />
                  <Area type="monotone" dataKey="users" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorUsers)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Most viewed streams chart */}
          <div className="glass-panel p-6 rounded-2xl space-y-6">
            <div>
              <h3 className="text-lg font-bold text-white uppercase tracking-wider">Top Stream Traffic</h3>
              <p className="text-xs text-slate-400">Live viewers by match broadcast channel.</p>
            </div>

            <div className="h-72 w-full flex flex-col justify-between">
              <div className="flex-1 min-h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={mockMatchesData} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={11} tickLine={false} width={120} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#0f172a', 
                        borderColor: '#334155',
                        borderRadius: '12px',
                        color: '#fff',
                        fontSize: '12px'
                      }} 
                    />
                    <Bar dataKey="viewers" radius={[0, 8, 8, 0]} barSize={16}>
                      {mockMatchesData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="border-t border-card-border pt-4 mt-2">
                <div className="flex justify-between items-center text-xs text-slate-400 font-bold uppercase">
                  <span>Target Broadcaster</span>
                  <span className="text-white">World Cup Scale Traffic</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
