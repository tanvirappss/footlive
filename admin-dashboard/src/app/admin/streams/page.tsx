'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import AdminLayout from '@/components/AdminLayout';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Check, 
  X, 
  Loader2, 
  Tv, 
  Play, 
  Power,
  AlertTriangle
} from 'lucide-react';

interface Match {
  id: string;
  home_team_id: string | null;
  away_team_id: string | null;
  home_team_custom_name: string | null;
  away_team_custom_name: string | null;
  match_date: string;
  status: string;
  home_team?: any;
  away_team?: any;
}

interface Stream {
  id: string;
  match_id: string;
  stream_name: string;
  primary_url: string;
  backup_url_1: string | null;
  backup_url_2: string | null;
  backup_url_3: string | null;
  is_enabled: boolean;
  match?: Match;
}

export default function StreamsPage() {
  const queryClient = useQueryClient();
  
  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStream, setEditingStream] = useState<Stream | null>(null);

  // Form states
  const [matchId, setMatchId] = useState('');
  const [streamName, setStreamName] = useState('');
  const [primaryUrl, setPrimaryUrl] = useState('');
  const [backupUrl1, setBackupUrl1] = useState('');
  const [backupUrl2, setBackupUrl2] = useState('');
  const [backupUrl3, setBackupUrl3] = useState('');
  const [mutationError, setMutationError] = useState<string | null>(null);

  // Queries
  const { data: matches = [] } = useQuery<Match[]>({
    queryKey: ['matches-for-streams'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('matches')
        .select(`
          id,
          home_team_id,
          away_team_id,
          home_team_custom_name,
          away_team_custom_name,
          match_date,
          status,
          home_team:teams!matches_home_team_id_fkey(name),
          away_team:teams!matches_away_team_id_fkey(name)
        `)
        .neq('status', 'finished') // Only show active/upcoming matches
        .order('match_timestamp', { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as Match[];
    }
  });

  const { data: streams = [], isLoading } = useQuery<Stream[]>({
    queryKey: ['streams-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('streams')
        .select(`
          *,
          match:matches(
            id,
            home_team_id,
            away_team_id,
            home_team_custom_name,
            away_team_custom_name,
            match_date,
            status,
            home_team:teams!matches_home_team_id_fkey(name),
            away_team:teams!matches_away_team_id_fkey(name)
          )
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as Stream[];
    }
  });

  const handleAddClick = () => {
    setEditingStream(null);
    setMatchId(matches[0]?.id || '');
    setStreamName('Primary English Broadcast');
    setPrimaryUrl('');
    setBackupUrl1('');
    setBackupUrl2('');
    setBackupUrl3('');
    setMutationError(null);
    setIsModalOpen(true);
  };

  const handleEditClick = (stream: Stream) => {
    setEditingStream(stream);
    setMatchId(stream.match_id);
    setStreamName(stream.stream_name);
    setPrimaryUrl(stream.primary_url);
    setBackupUrl1(stream.backup_url_1 || '');
    setBackupUrl2(stream.backup_url_2 || '');
    setBackupUrl3(stream.backup_url_3 || '');
    setMutationError(null);
    setIsModalOpen(true);
  };

  // Create or Update Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const streamData = {
        match_id: matchId,
        stream_name: streamName,
        primary_url: primaryUrl,
        backup_url_1: backupUrl1 || null,
        backup_url_2: backupUrl2 || null,
        backup_url_3: backupUrl3 || null,
      };

      if (editingStream) {
        const { error } = await supabase
          .from('streams')
          .update(streamData)
          .eq('id', editingStream.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('streams')
          .insert([streamData]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['streams-admin'] });
      setIsModalOpen(false);
    },
    onError: (err: any) => {
      setMutationError(err.message);
    }
  });

  // Toggle Mutation
  const toggleMutation = useMutation({
    mutationFn: async ({ id, isEnabled }: { id: string; isEnabled: boolean }) => {
      const { error } = await supabase
        .from('streams')
        .update({ is_enabled: isEnabled })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['streams-admin'] });
    }
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('streams')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['streams-admin'] });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate();
  };

  const getMatchTitle = (match?: Match) => {
    if (!match) return 'Unknown Match';
    const homeTeam = Array.isArray(match.home_team) ? match.home_team[0] : match.home_team;
    const awayTeam = Array.isArray(match.away_team) ? match.away_team[0] : match.away_team;
    const home = match.home_team_id ? (homeTeam?.name) : match.home_team_custom_name;
    const away = match.away_team_id ? (awayTeam?.name) : match.away_team_custom_name;
    return `${home || 'Home'} vs ${away || 'Away'} (${match.match_date})`;
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-white uppercase tracking-tight">Stream Configurator</h1>
            <p className="text-slate-400 text-sm mt-1">Configure live M3U8 transmission links for active matches.</p>
          </div>
          <button
            onClick={handleAddClick}
            disabled={matches.length === 0}
            className="flex items-center gap-2 px-5 py-3 bg-emerald-accent hover:bg-emerald-500 text-black font-extrabold uppercase text-xs tracking-wider rounded-xl transition-all duration-200 cursor-pointer shadow-lg shadow-emerald-500/10 disabled:opacity-50"
          >
            <Plus className="h-4.5 w-4.5" />
            Add Match Stream
          </button>
        </div>

        {matches.length === 0 && (
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex gap-3 text-amber-400 text-xs font-semibold">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <div>
              <p className="font-bold">No Active Matches Available</p>
              <p className="mt-0.5 text-slate-400 font-medium">To register a live stream, you must first schedule a match fixture on the Match Center page that is not yet Finished.</p>
            </div>
          </div>
        )}

        {/* Streams List */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <Loader2 className="h-8 w-8 text-emerald-accent animate-spin" />
            <p className="text-slate-400 text-sm mt-4">Loading active streaming feeds...</p>
          </div>
        ) : streams.length === 0 ? (
          <div className="glass-panel p-12 text-center rounded-2xl border border-card-border">
            <Tv className="h-12 w-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white uppercase">No Active Streams</h3>
            <p className="text-slate-400 text-sm mt-1">Configure M3U8 sources to enable streaming playback on the mobile application.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {streams.map((stream) => (
              <div 
                key={stream.id} 
                className={`glass-panel p-6 rounded-2xl border flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all duration-200 ${
                  stream.is_enabled ? 'border-card-border hover:border-slate-700' : 'border-red-950/20 opacity-60'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`p-4 bg-slate-900/60 border border-slate-800 rounded-2xl shrink-0 ${
                    stream.is_enabled ? 'text-emerald-accent' : 'text-slate-500'
                  }`}>
                    <Tv className="h-8 w-8" />
                  </div>

                  <div className="space-y-1">
                    <h3 className="font-extrabold text-white text-base">
                      {stream.stream_name}
                    </h3>
                    <p className="text-slate-300 text-sm font-semibold flex items-center gap-1.5">
                      ⚽ {getMatchTitle(stream.match)}
                      <span className={`h-2 w-2 rounded-full inline-block ${
                        stream.match?.status === 'live' ? 'bg-red-500 animate-ping' : 'bg-slate-600'
                      }`} />
                    </p>
                    <div className="pt-2 flex flex-wrap gap-2 text-[10px] font-bold text-slate-400 uppercase">
                      <span className="px-2 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-300">
                        Primary: {stream.primary_url.substring(0, 45)}...
                      </span>
                      {stream.backup_url_1 && (
                        <span className="px-2 py-0.5 bg-slate-800/60 rounded border border-slate-800/80">
                          Backup 1
                        </span>
                      )}
                      {stream.backup_url_2 && (
                        <span className="px-2 py-0.5 bg-slate-800/60 rounded border border-slate-800/80">
                          Backup 2
                        </span>
                      )}
                      {stream.backup_url_3 && (
                        <span className="px-2 py-0.5 bg-slate-800/60 rounded border border-slate-800/80">
                          Backup 3
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 self-end md:self-auto">
                  <button
                    onClick={() => toggleMutation.mutate({ id: stream.id, isEnabled: !stream.is_enabled })}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl border font-bold uppercase text-[10px] tracking-wide transition-all cursor-pointer ${
                      stream.is_enabled
                        ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                        : 'border-slate-800 text-slate-500 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <Power className="h-3.5 w-3.5" />
                    {stream.is_enabled ? 'Active' : 'Disabled'}
                  </button>
                  <button
                    onClick={() => handleEditClick(stream)}
                    className="p-2.5 rounded-xl border border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white transition-all cursor-pointer"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Delete this streaming configuration?')) {
                        deleteMutation.mutate(stream.id);
                      }
                    }}
                    className="p-2.5 rounded-xl border border-slate-800 text-slate-400 hover:border-red-500/20 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal Form */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-xl glass-panel p-8 rounded-3xl space-y-6">
              <div className="flex justify-between items-center pb-4 border-b border-card-border">
                <h3 className="text-xl font-extrabold text-white uppercase">
                  {editingStream ? 'Modify Stream Feed' : 'Attach Stream Source'}
                </h3>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {mutationError && (
                  <div className="p-4 bg-red-950/20 border border-red-500/25 rounded-2xl text-red-400 text-sm">
                    {mutationError}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Link to Match Event</label>
                    <select
                      value={matchId}
                      onChange={(e) => setMatchId(e.target.value)}
                      disabled={!!editingStream}
                      className="w-full px-4 py-3 glass-input rounded-xl text-sm appearance-none cursor-pointer disabled:opacity-50"
                    >
                      {matches.map((m) => (
                        <option key={m.id} value={m.id}>{getMatchTitle(m)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Stream Title / Label</label>
                    <input
                      type="text"
                      required
                      value={streamName}
                      onChange={(e) => setStreamName(e.target.value)}
                      placeholder="e.g. Primary English HD"
                      className="w-full px-4 py-3 glass-input rounded-xl text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-white uppercase tracking-wider block">Primary Stream URL (M3U8 / M3U)</label>
                  <input
                    type="url"
                    required
                    value={primaryUrl}
                    onChange={(e) => setPrimaryUrl(e.target.value)}
                    placeholder="https://server.com/live/stream.m3u8"
                    className="w-full px-4 py-3 glass-input rounded-xl text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Backup Stream URL 1 (Optional)</label>
                  <input
                    type="url"
                    value={backupUrl1}
                    onChange={(e) => setBackupUrl1(e.target.value)}
                    placeholder="https://backup1.com/live/stream.m3u8"
                    className="w-full px-4 py-3 glass-input rounded-xl text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Backup URL 2 (Optional)</label>
                    <input
                      type="url"
                      value={backupUrl2}
                      onChange={(e) => setBackupUrl2(e.target.value)}
                      placeholder="https://backup2.com/live/stream.m3u8"
                      className="w-full px-4 py-3 glass-input rounded-xl text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Backup URL 3 (Optional)</label>
                    <input
                      type="url"
                      value={backupUrl3}
                      onChange={(e) => setBackupUrl3(e.target.value)}
                      placeholder="https://backup3.com/live/stream.m3u8"
                      className="w-full px-4 py-3 glass-input rounded-xl text-sm"
                    />
                  </div>
                </div>

                {/* Buttons */}
                <div className="pt-4 flex justify-end gap-3 border-t border-card-border">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-3 border border-slate-800 hover:bg-slate-800 text-slate-300 font-bold uppercase text-xs tracking-wider rounded-xl transition-all duration-150 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saveMutation.isPending}
                    className="flex items-center gap-2 px-6 py-3 bg-emerald-accent hover:bg-emerald-500 text-black font-extrabold uppercase text-xs tracking-wider rounded-xl transition-all duration-150 cursor-pointer"
                  >
                    {saveMutation.isPending ? (
                      <Loader2 className="h-4.5 w-4.5 animate-spin" />
                    ) : (
                      <Check className="h-4.5 w-4.5" />
                    )}
                    Save Stream Source
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
