'use client';

import React, { useState, useEffect } from 'react';
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
  AlertTriangle,
  Star,
  Search
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
  urls?: { label: string; url: string }[];
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
  const [streamUrls, setStreamUrls] = useState<{ label: string; url: string }[]>([{ label: 'Primary Server', url: '' }]);
  const [importPreviousLinks, setImportPreviousLinks] = useState('no');
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

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

  // Fetch default stream settings
  const { data: ticker } = useQuery({
    queryKey: ['admin-ticker-settings'],
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

  const activePlayer = systemConfig?.custom_scripts?.active_player || 'player_1';

  const updateActivePlayerMutation = useMutation({
    mutationFn: async (player: 'player_1' | 'player_2' | 'pot_player' | 'player_4') => {
      const existingScripts = systemConfig?.custom_scripts || {};
      const updatedScripts = {
        ...existingScripts,
        active_player: player
      };

      if (systemConfig?.id) {
        const { error } = await supabase
          .from('ad_networks')
          .update({
            custom_scripts: updatedScripts
          })
          .eq('id', systemConfig.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('ad_networks')
          .insert([{
            network_name: 'SystemConfig',
            is_enabled: true,
            custom_scripts: updatedScripts
          }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-config'] });
    }
  });

  const handleImportToggle = (val: 'yes' | 'no') => {
    setImportPreviousLinks(val);
    if (val === 'yes') {
      const defaultStreamsList = (ticker as any)?.default_streams;
      if (Array.isArray(defaultStreamsList) && defaultStreamsList.length > 0) {
        setStreamUrls(defaultStreamsList.map(item => ({ ...item })));
      } else {
        alert('No default stream links configured yet. Please configure them on the Admin Dashboard.');
        setTimeout(() => setImportPreviousLinks('no'), 50);
      }
    } else {
      setStreamUrls([{ label: 'Primary Server', url: '' }]);
    }
  };

  const handleAddClick = () => {
    setEditingStream(null);
    setMatchId(matches[0]?.id || '');
    setStreamName('Primary English Broadcast');
    setStreamUrls([{ label: 'Primary Server', url: '' }]);
    setImportPreviousLinks('no');
    setMutationError(null);
    setIsModalOpen(true);
  };

  const handleEditClick = (stream: Stream) => {
    setEditingStream(stream);
    setMatchId(stream.match_id);
    setStreamName(stream.stream_name);
    setImportPreviousLinks('no');
    
    // Parse JSONB list if exists, otherwise build it from static columns
    if (Array.isArray(stream.urls) && stream.urls.length > 0) {
      setStreamUrls(stream.urls);
    } else {
      const urlsList = [];
      if (stream.primary_url) urlsList.push({ label: 'Primary Server', url: stream.primary_url });
      if (stream.backup_url_1) urlsList.push({ label: 'Backup Server 1', url: stream.backup_url_1 });
      if (stream.backup_url_2) urlsList.push({ label: 'Backup Server 2', url: stream.backup_url_2 });
      if (stream.backup_url_3) urlsList.push({ label: 'Backup Server 3', url: stream.backup_url_3 });
      if (urlsList.length === 0) urlsList.push({ label: 'Primary Server', url: '' });
      setStreamUrls(urlsList);
    }
    setMutationError(null);
    setIsModalOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (streamUrls.length === 0 || !streamUrls[0].url) {
        throw new Error('You must provide at least one valid streaming feed link.');
      }

      const streamData = {
        match_id: matchId,
        stream_name: streamName,
        primary_url: streamUrls[0]?.url || '',
        backup_url_1: streamUrls[1]?.url || null,
        backup_url_2: streamUrls[2]?.url || null,
        backup_url_3: streamUrls[3]?.url || null,
        urls: streamUrls // Save full list
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

  const filteredStreams = streams.filter((stream) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase().trim();
    const matchTitle = getMatchTitle(stream.match).toLowerCase();
    const sName = (stream.stream_name || '').toLowerCase();
    return matchTitle.includes(query) || sName.includes(query);
  });

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

        {/* Active Player Toggle Card */}
        <div className="glass-panel p-6 rounded-3xl border border-card-border flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/10 hover:border-slate-800 transition-all duration-200">
          <div>
            <div className="flex items-center gap-2">
              <Tv className={`h-5 w-5 ${activePlayer !== 'player_1' ? 'text-emerald-400' : 'text-slate-400'}`} />
              <span className="text-sm font-extrabold text-white uppercase tracking-wider">📺 Active Streaming Video Player</span>
            </div>
            <p className="text-xs text-slate-400 mt-2 font-medium max-w-xl">
              Toggle between **Player 1** (Standard player), **Player 2** (Premium Super Speed Player), **Pot Player** (Futuristic clone player), and **Player 4** (Engine-4 Adaptive HLS Token Bypass). This setting affects the website and the Android application.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 bg-slate-950/40 p-1.5 rounded-2xl border border-slate-900">
            <button
              onClick={() => updateActivePlayerMutation.mutate('player_1')}
              className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
                activePlayer === 'player_1'
                  ? 'bg-slate-800 text-emerald-accent border border-card-border shadow-lg'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Player 1 (Default)
            </button>
            <button
              onClick={() => updateActivePlayerMutation.mutate('player_2')}
              className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
                activePlayer === 'player_2'
                  ? 'bg-slate-800 text-emerald-accent border border-card-border shadow-lg'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Player 2 (Premium Speed)
            </button>
            <button
              onClick={() => updateActivePlayerMutation.mutate('pot_player')}
              className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
                activePlayer === 'pot_player'
                  ? 'bg-slate-800 text-emerald-accent border border-card-border shadow-lg'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Pot Player (Clone)
            </button>
            <button
              onClick={() => updateActivePlayerMutation.mutate('player_4')}
              className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
                activePlayer === 'player_4'
                  ? 'bg-slate-800 text-emerald-accent border border-card-border shadow-lg'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Player 4 (Engine-4)
            </button>
          </div>
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
          <div className="space-y-6">
            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search streams by match or stream name..."
                className="w-full px-5 py-3.5 pl-12 glass-input rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-slate-700 transition-all border border-card-border shadow-inner"
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-all text-[10px] font-bold uppercase tracking-wider bg-slate-950 border border-slate-900 rounded-lg px-2.5 py-1 cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>

            {filteredStreams.length === 0 ? (
              <div className="glass-panel p-12 text-center rounded-2xl border border-card-border">
                <Tv className="h-12 w-12 text-slate-700 mx-auto mb-4 animate-pulse" />
                <h3 className="text-lg font-bold text-white uppercase">No Streams Match Your Query</h3>
                <p className="text-slate-400 text-sm mt-1">Try a different team name or search keyword.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                {filteredStreams.map((stream) => (
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

                {!editingStream && (
                  <div className="space-y-2 p-3.5 bg-slate-950/40 border border-slate-900 rounded-xl">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                      Do you want to add all default m3u8 links here?
                    </label>
                    <div className="flex gap-4 mt-1">
                      <label className="flex items-center gap-2 text-xs font-extrabold text-white cursor-pointer">
                        <input
                          type="radio"
                          name="importPrevious"
                          value="yes"
                          checked={importPreviousLinks === 'yes'}
                          onChange={() => handleImportToggle('yes')}
                          className="accent-emerald-accent"
                        />
                        Yes (Default list)
                      </label>
                      <label className="flex items-center gap-2 text-xs font-extrabold text-white cursor-pointer">
                        <input
                          type="radio"
                          name="importPrevious"
                          value="no"
                          checked={importPreviousLinks === 'no'}
                          onChange={() => handleImportToggle('no')}
                          className="accent-emerald-accent"
                        />
                        No (Start fresh)
                      </label>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-white uppercase tracking-wider">Streaming Channels / Fallbacks</label>
                    <button
                      type="button"
                      onClick={() => setStreamUrls([...streamUrls, { label: `Backup Server ${streamUrls.length}`, url: '' }])}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-emerald-accent border border-slate-700 text-[10px] font-black uppercase rounded-lg transition-colors cursor-pointer"
                    >
                      + Add More Link
                    </button>
                  </div>

                  <div className="space-y-3 max-h-[200px] overflow-y-auto pr-1">
                    {streamUrls.map((item, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <input
                          type="text"
                          required
                          value={item.label}
                          onChange={(e) => {
                            const newUrls = [...streamUrls];
                            newUrls[idx].label = e.target.value;
                            setStreamUrls(newUrls);
                          }}
                          placeholder="Label (e.g. Server 1)"
                          className="w-1/3 px-3 py-2.5 glass-input rounded-xl text-xs"
                        />
                        <input
                          type="url"
                          required
                          value={item.url}
                          onChange={(e) => {
                            const newUrls = [...streamUrls];
                            newUrls[idx].url = e.target.value;
                            setStreamUrls(newUrls);
                          }}
                          placeholder="M3U8 Streaming URL"
                          className="flex-1 px-3 py-2.5 glass-input rounded-xl text-xs"
                        />
                        <div className="flex items-center gap-1.5 shrink-0">
                          <input
                            type="number"
                            min="1"
                            max={streamUrls.length}
                            value={idx + 1}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              if (!isNaN(val) && val >= 1 && val <= streamUrls.length) {
                                const targetIdx = val - 1;
                                if (targetIdx !== idx) {
                                  const newUrls = [...streamUrls];
                                  const [selected] = newUrls.splice(idx, 1);
                                  newUrls.splice(targetIdx, 0, selected);
                                  setStreamUrls(newUrls);
                                }
                              }
                            }}
                            className="w-12 px-1 py-2.5 text-center bg-slate-950 border border-slate-900 rounded-xl text-xs text-white font-extrabold focus:outline-none focus:border-slate-800"
                            title="Set Priority Number"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (idx === 0) return;
                              const newUrls = [...streamUrls];
                              const [selected] = newUrls.splice(idx, 1);
                              newUrls.unshift(selected);
                              setStreamUrls(newUrls);
                            }}
                            className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                              idx === 0
                                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                                : 'bg-slate-950 border-slate-900 text-slate-500 hover:text-amber-400 hover:border-amber-500/20'
                            }`}
                            title={idx === 0 ? "Active Top Server" : "Set as Top Server (Move to top)"}
                          >
                            <Star className="h-4 w-4" fill={idx === 0 ? "currentColor" : "none"} />
                          </button>
                          {streamUrls.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setStreamUrls(streamUrls.filter((_, i) => i !== idx))}
                              className="p-2.5 bg-slate-950 border border-slate-900 hover:border-red-500/25 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all cursor-pointer"
                            >
                              <Trash2 className="h-4 w-4 text-slate-400" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
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
