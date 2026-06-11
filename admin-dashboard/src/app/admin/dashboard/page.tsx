'use client';

import React from 'react';
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
  BellRing
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
