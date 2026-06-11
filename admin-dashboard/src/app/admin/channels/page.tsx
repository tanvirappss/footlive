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
  Power
} from 'lucide-react';

interface Channel {
  id: string;
  name: string;
  url: string;
  is_enabled: boolean;
  created_at: string;
}

export default function ChannelsPage() {
  const queryClient = useQueryClient();
  
  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [mutationError, setMutationError] = useState<string | null>(null);

  // Fetch channels query
  const { data: channels = [], isLoading } = useQuery<Channel[]>({
    queryKey: ['channels-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('m3u_channels')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    }
  });

  const handleAddClick = () => {
    setEditingChannel(null);
    setName('');
    setUrl('');
    setMutationError(null);
    setIsModalOpen(true);
  };

  const handleEditClick = (channel: Channel) => {
    setEditingChannel(channel);
    setName(channel.name);
    setUrl(channel.url);
    setMutationError(null);
    setIsModalOpen(true);
  };

  // Create or Update Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const channelData = {
        name,
        url,
      };

      if (editingChannel) {
        const { error } = await supabase
          .from('m3u_channels')
          .update(channelData)
          .eq('id', editingChannel.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('m3u_channels')
          .insert([channelData]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels-admin'] });
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
        .from('m3u_channels')
        .update({ is_enabled: isEnabled })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels-admin'] });
    }
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('m3u_channels')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels-admin'] });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate();
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-white uppercase tracking-tight">Live TV Channels</h1>
            <p className="text-slate-400 text-sm mt-1">Configure global M3U/M3U8 TV stream links to play in the homepage Live TV section.</p>
          </div>
          <button
            onClick={handleAddClick}
            className="flex items-center gap-2 px-5 py-3 bg-emerald-accent hover:bg-emerald-500 text-black font-extrabold uppercase text-xs tracking-wider rounded-xl transition-all duration-200 cursor-pointer shadow-lg shadow-emerald-500/10"
          >
            <Plus className="h-4.5 w-4.5" />
            Add TV Channel
          </button>
        </div>

        {/* Channels List */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <Loader2 className="h-8 w-8 text-emerald-accent animate-spin" />
            <p className="text-slate-400 text-sm mt-4">Loading TV channels...</p>
          </div>
        ) : channels.length === 0 ? (
          <div className="glass-panel p-12 text-center rounded-2xl border border-card-border">
            <Tv className="h-12 w-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white uppercase">No TV Channels Configured</h3>
            <p className="text-slate-400 text-sm mt-1">Add custom M3U/M3U8 links for live feeds to show on the front page.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {channels.map((channel) => (
              <div 
                key={channel.id} 
                className={`glass-panel p-6 rounded-2xl border flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all duration-200 ${
                  channel.is_enabled ? 'border-card-border hover:border-slate-700' : 'border-red-950/20 opacity-60'
                }`}
              >
                <div className="flex items-center gap-4 w-full md:w-auto">
                  <div className={`p-4 bg-slate-900/60 border border-slate-800 rounded-2xl shrink-0 ${
                    channel.is_enabled ? 'text-emerald-accent' : 'text-slate-500'
                  }`}>
                    <Tv className="h-8 w-8" />
                  </div>

                  <div className="space-y-1 min-w-0">
                    <h3 className="font-extrabold text-white text-base truncate">
                      {channel.name}
                    </h3>
                    <p className="text-slate-400 text-xs font-mono truncate max-w-[280px] sm:max-w-md md:max-w-lg">
                      🔗 {channel.url}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 self-end md:self-auto shrink-0">
                  <button
                    onClick={() => toggleMutation.mutate({ id: channel.id, isEnabled: !channel.is_enabled })}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl border font-bold uppercase text-[10px] tracking-wide transition-all cursor-pointer ${
                      channel.is_enabled
                        ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                        : 'border-slate-800 text-slate-500 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <Power className="h-3.5 w-3.5" />
                    {channel.is_enabled ? 'Active' : 'Disabled'}
                  </button>
                  <button
                    onClick={() => handleEditClick(channel)}
                    className="p-2.5 rounded-xl border border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white transition-all cursor-pointer"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Delete this TV channel?')) {
                        deleteMutation.mutate(channel.id);
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
                  {editingChannel ? 'Modify TV Channel' : 'Register TV Channel'}
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

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Channel Name / Title</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Fox Sports HD"
                    className="w-full px-4 py-3 glass-input rounded-xl text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-white uppercase tracking-wider block">M3U / M3U8 Stream URL</label>
                  <input
                    type="url"
                    required
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://server.com/live/tv.m3u8"
                    className="w-full px-4 py-3 glass-input rounded-xl text-sm"
                  />
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
                    Save Channel
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
