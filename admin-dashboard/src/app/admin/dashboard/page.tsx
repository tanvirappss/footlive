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
  Check
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
  const [updatingTicker, setUpdatingTicker] = useState(false);
  const [tickerSuccess, setTickerSuccess] = useState(false);

  // Site Identity States
  const [siteName, setSiteName] = useState('WORLD CUP 2026');
  const [siteLogoUrl, setSiteLogoUrl] = useState('');
  const [siteLogoFile, setSiteLogoFile] = useState<File | null>(null);
  const [showCounters, setShowCounters] = useState(true);
  const [updatingBranding, setUpdatingBranding] = useState(false);
  const [brandingSuccess, setBrandingSuccess] = useState(false);

  useEffect(() => {
    if (tickerData) {
      setTickerText(tickerData.ticker_text || '');
      setSiteName(tickerData.site_name || 'WORLD CUP 2026');
      setSiteLogoUrl(tickerData.logo_url || '');
      setShowCounters(tickerData.show_counters !== false); // default to true
    }
  }, [tickerData]);

  const handleTickerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdatingTicker(true);
    setTickerSuccess(false);

    try {
      if (tickerData?.id) {
        const { error } = await supabase
          .from('ticker_settings')
          .update({ ticker_text: tickerText, updated_at: new Date().toISOString() })
          .eq('id', tickerData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('ticker_settings')
          .insert([{ ticker_text: tickerText }]);
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

  const handleBrandingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdatingBranding(true);
    setBrandingSuccess(false);

    try {
      let finalLogoUrl = siteLogoUrl;

      if (siteLogoFile) {
        finalLogoUrl = await uploadSiteLogo(siteLogoFile);
      }

      const updateData = {
        site_name: siteName,
        logo_url: finalLogoUrl || null,
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
                    <h3 className="text-4xl font-black text-white mt-2 tracking-tight">
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
          <div>
            <h3 className="text-lg font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <BellRing className="h-5 w-5 text-emerald-accent" />
              Animated TV Headline Ticker
            </h3>
            <p className="text-xs text-slate-400 mt-1">Update the marquee text scrolling under the main header on the user homepage.</p>
          </div>
          
          <form onSubmit={handleTickerSubmit} className="flex flex-col sm:flex-row gap-4">
            <input
              type="text"
              required
              value={tickerText}
              onChange={(e) => setTickerText(e.target.value)}
              className="flex-1 px-4 py-3.5 glass-input rounded-xl text-sm"
              placeholder="e.g. 📢 Welcome to the FIFA World Cup 2026 Live Streaming Portal! Enjoy HD streams! 📢"
            />
            <button
              type="submit"
              disabled={updatingTicker}
              className="px-6 py-3.5 bg-emerald-accent hover:bg-emerald-500 text-black font-extrabold uppercase text-xs tracking-wider rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {updatingTicker ? 'Saving...' : 'Save Ticker'}
            </button>
          </form>
          {tickerSuccess && (
            <p className="text-xs text-emerald-accent font-bold animate-pulse">✓ Ticker text updated successfully!</p>
          )}
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

            {/* Recommendations Alert Box */}
            <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl space-y-2.5">
              <span className="text-[10px] text-emerald-accent font-black uppercase tracking-wider block">💡 LOGO SIZE GUIDANCE & RECOMMENDATIONS</span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <p className="font-extrabold text-white">Worldwide Standard Branding Sizes:</p>
                  <ul className="list-disc pl-4 space-y-0.5 text-slate-400 font-medium">
                    <li>Landscape Header Logo: <strong className="text-slate-300">250px × 150px</strong> or <strong className="text-slate-300">400px × 100px</strong></li>
                    <li>Square App / Favicon Icon: <strong className="text-slate-300">512px × 512px</strong> (High-DPI display standard)</li>
                  </ul>
                </div>
                <div className="space-y-1">
                  <p className="font-extrabold text-white">Recommended for this Website's Layout:</p>
                  <ul className="list-disc pl-4 space-y-0.5 text-slate-400 font-medium">
                    <li>Header Square Icon: <strong className="text-emerald-accent">32px × 32px</strong> or <strong className="text-emerald-accent">48px × 48px</strong></li>
                    <li>Header Banner/Logo: <strong className="text-emerald-accent">120px × 32px</strong> (Height is limited to 32px for spacing)</li>
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
