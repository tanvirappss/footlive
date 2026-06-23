'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import AdminLayout from '@/components/AdminLayout';
import { 
  Check, 
  Activity, 
  Settings, 
  Plus, 
  Trash2, 
  Loader2, 
  Key, 
  ToggleLeft, 
  ToggleRight,
  Eye,
  EyeOff
} from 'lucide-react';

interface APIKey {
  id: string;
  name: string;
  api_key: string;
  provider: string;
  is_active: boolean;
  created_at: string;
}

export default function LiveScoreAdminPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'settings' | 'keys'>('settings');

  // General Settings States
  const [systemConfigId, setSystemConfigId] = useState<string | null>(null);
  const [autoUpdateScores, setAutoUpdateScores] = useState(true);
  const [autoFinishEnabled, setAutoFinishEnabled] = useState(true);
  const [liveOffsetMins, setLiveOffsetMins] = useState(10);
  const [durationHours, setDurationHours] = useState(1);
  const [durationMins, setDurationMins] = useState(45);
  
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState(false);

  // API Key modal & list states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyValue, setNewKeyValue] = useState('');
  const [newKeyProvider, setNewKeyProvider] = useState('espn');
  const [revealedKeys, setRevealedKeys] = useState<Record<string, boolean>>({});
  const [addingKey, setAddingKey] = useState(false);

  // Fetch SystemConfig settings
  const { data: systemConfigData, refetch: refetchSystemConfig } = useQuery({
    queryKey: ['admin-system-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ad_networks')
        .select('*')
        .eq('network_name', 'SystemConfig')
        .maybeSingle();
      if (error) throw error;
      return data;
    }
  });

  // Fetch API Keys
  const { data: apiKeys = [], refetch: refetchApiKeys, isLoading: loadingKeys } = useQuery<APIKey[]>({
    queryKey: ['admin-api-keys'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('live_score_keys')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    }
  });

  // Initialize form from SystemConfig
  useEffect(() => {
    if (systemConfigData) {
      setSystemConfigId(systemConfigData.id);
      const scripts = systemConfigData.custom_scripts || {};
      setAutoUpdateScores(scripts.auto_update_scores !== false);
      setAutoFinishEnabled(scripts.auto_finish_enabled !== false);
      setLiveOffsetMins(scripts.match_live_before_minutes !== undefined ? Number(scripts.match_live_before_minutes) : 10);
      setDurationHours(scripts.match_duration_hours !== undefined ? Number(scripts.match_duration_hours) : 1);
      setDurationMins(scripts.match_duration_minutes !== undefined ? Number(scripts.match_duration_minutes) : 45);
    }
  }, [systemConfigData]);

  // Save general settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setSettingsSuccess(false);

    try {
      const existingScripts = systemConfigData?.custom_scripts || {};
      const updatedScripts = {
        ...existingScripts,
        auto_update_scores: autoUpdateScores,
        auto_finish_enabled: autoFinishEnabled,
        match_live_before_minutes: Number(liveOffsetMins),
        match_duration_hours: Number(durationHours),
        match_duration_minutes: Number(durationMins)
      };

      if (systemConfigId) {
        const { error } = await supabase
          .from('ad_networks')
          .update({
            custom_scripts: updatedScripts
          })
          .eq('id', systemConfigId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('ad_networks')
          .insert([{
            network_name: 'SystemConfig',
            is_enabled: true,
            custom_scripts: updatedScripts
          }])
          .select()
          .single();
        if (error) throw error;
        if (data) setSystemConfigId(data.id);
      }

      setSettingsSuccess(true);
      await refetchSystemConfig();
      setTimeout(() => setSettingsSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      alert('Failed to save live score settings');
    } finally {
      setSavingSettings(false);
    }
  };

  // Add a new API Key
  const handleAddKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim() || !newKeyValue.trim()) return;

    setAddingKey(true);
    try {
      const { error } = await supabase
        .from('live_score_keys')
        .insert([{
          name: newKeyName.trim(),
          api_key: newKeyValue.trim(),
          provider: newKeyProvider,
          is_active: true
        }]);

      if (error) throw error;

      setNewKeyName('');
      setNewKeyValue('');
      setIsModalOpen(false);
      await refetchApiKeys();
    } catch (err) {
      console.error(err);
      alert('Failed to add API key');
    } finally {
      setAddingKey(false);
    }
  };

  // Delete an API Key
  const handleDeleteKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to delete this API Key?')) return;

    try {
      const { error } = await supabase
        .from('live_score_keys')
        .delete()
        .eq('id', keyId);
      if (error) throw error;
      await refetchApiKeys();
    } catch (err) {
      console.error(err);
      alert('Failed to delete API Key');
    }
  };

  // Toggle API Key active state
  const handleToggleKeyStatus = async (key: APIKey) => {
    try {
      const { error } = await supabase
        .from('live_score_keys')
        .update({ is_active: !key.is_active })
        .eq('id', key.id);
      if (error) throw error;
      await refetchApiKeys();
    } catch (err) {
      console.error(err);
      alert('Failed to update status');
    }
  };

  const toggleRevealKey = (id: string) => {
    setRevealedKeys(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const maskKey = (keyVal: string) => {
    if (keyVal.length <= 8) return '********';
    return keyVal.substring(0, 4) + '...' + keyVal.substring(keyVal.length - 4);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Page Title */}
        <div>
          <h2 className="font-extrabold text-[10px] text-emerald-accent uppercase tracking-widest">Controls & Providers</h2>
          <h1 className="font-black text-xl md:text-2xl text-white mt-1">Live Score Engine Settings</h1>
        </div>

        {/* Tab Menu */}
        <div className="flex border-b border-card-border gap-6">
          <button
            onClick={() => setActiveTab('settings')}
            className={`pb-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
              activeTab === 'settings'
                ? 'border-emerald-accent text-white font-extrabold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Settings & General Configurations
          </button>
          <button
            onClick={() => setActiveTab('keys')}
            className={`pb-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
              activeTab === 'keys'
                ? 'border-emerald-accent text-white font-extrabold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Live Score API Keys
          </button>
        </div>

        {/* TAB 1: General Settings */}
        {activeTab === 'settings' && (
          <div className="glass-panel p-6 rounded-2xl border border-card-border space-y-6">
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Settings className="h-4.5 w-4.5 text-emerald-accent" />
                Score Synchronization Settings
              </h3>
              <p className="text-[11px] text-slate-400 mt-1 uppercase tracking-wide font-bold">
                Configure auto-sync engines running on the clients
              </p>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Score updater settings */}
                <div className="space-y-4">
                  {/* Auto update toggle */}
                  <div className="flex items-center justify-between p-4 bg-slate-950/40 border border-slate-900 rounded-xl">
                    <div>
                      <label className="text-xs font-bold text-white uppercase tracking-wider block">Auto-Update Scores</label>
                      <span className="text-[10px] text-slate-500 font-bold uppercase mt-0.5">Fetch real ESPN API scores in background</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAutoUpdateScores(!autoUpdateScores)}
                      className="text-emerald-accent hover:opacity-80 transition-all cursor-pointer"
                    >
                      {autoUpdateScores ? (
                        <ToggleRight className="h-8 w-8" />
                      ) : (
                        <ToggleLeft className="h-8 w-8 text-slate-600" />
                      )}
                    </button>
                  </div>

                  {/* Auto finish toggle */}
                  <div className="flex items-center justify-between p-4 bg-slate-950/40 border border-slate-900 rounded-xl">
                    <div>
                      <label className="text-xs font-bold text-white uppercase tracking-wider block">Auto-Finish Matches</label>
                      <span className="text-[10px] text-slate-500 font-bold uppercase mt-0.5">Mark matches as finished dynamically when duration ends</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAutoFinishEnabled(!autoFinishEnabled)}
                      className="text-emerald-accent hover:opacity-80 transition-all cursor-pointer"
                    >
                      {autoFinishEnabled ? (
                        <ToggleRight className="h-8 w-8" />
                      ) : (
                        <ToggleLeft className="h-8 w-8 text-slate-600" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Duration/Kickoff offsets */}
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Kickoff Live Offset (Minutes)</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={liveOffsetMins}
                      onChange={(e) => setLiveOffsetMins(Number(e.target.value))}
                      placeholder="e.g. 10"
                      className="w-full px-4 py-3 glass-input rounded-xl text-sm"
                    />
                    <span className="text-[9px] text-slate-500 uppercase font-black tracking-wide">
                      Show matches as Live this many minutes before scheduled kickoff.
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Duration Hours</label>
                      <input
                        type="number"
                        required
                        min={0}
                        value={durationHours}
                        onChange={(e) => setDurationHours(Number(e.target.value))}
                        placeholder="Hours"
                        className="w-full px-4 py-3 glass-input rounded-xl text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Duration Minutes</label>
                      <input
                        type="number"
                        required
                        min={0}
                        max={59}
                        value={durationMins}
                        onChange={(e) => setDurationMins(Number(e.target.value))}
                        placeholder="Minutes"
                        className="w-full px-4 py-3 glass-input rounded-xl text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Footer */}
              <div className="flex items-center justify-between border-t border-card-border pt-4">
                {settingsSuccess ? (
                  <p className="text-xs text-emerald-accent font-bold flex items-center gap-1 animate-pulse">
                    <Check className="h-4 w-4" /> Live Score settings saved successfully!
                  </p>
                ) : <div />}
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="px-6 py-3 bg-emerald-accent hover:bg-emerald-500 text-black font-extrabold uppercase text-xs tracking-wider rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {savingSettings ? 'Saving Settings...' : 'Save Settings'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 2: API Keys Management */}
        {activeTab === 'keys' && (
          <div className="glass-panel p-6 rounded-2xl border border-card-border space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <Key className="h-4.5 w-4.5 text-emerald-accent" />
                  API Keys configuration settings
                </h3>
                <p className="text-[11px] text-slate-400 mt-1 uppercase tracking-wide font-bold">
                  Manage external API keys (optional providers, unlimited listings)
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(true)}
                className="px-4 py-2.5 bg-emerald-accent hover:bg-emerald-500 text-black font-black uppercase text-xs tracking-wider rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <Plus className="h-4 w-4" />
                Add Key
              </button>
            </div>

            {loadingKeys ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-6 w-6 text-emerald-accent animate-spin" />
                <span className="text-[10px] text-slate-500 font-bold uppercase mt-2">Loading API Keys...</span>
              </div>
            ) : apiKeys.length === 0 ? (
              <div className="text-center py-10 text-slate-500 font-bold uppercase text-[10px]">
                No API keys added yet. Add ESPN key lists above.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-card-border text-slate-400 font-black uppercase tracking-wider text-[10px]">
                      <th className="py-4 px-4">Name</th>
                      <th className="py-4 px-4">Provider</th>
                      <th className="py-4 px-4">API Key String</th>
                      <th className="py-4 px-4 text-center">Status</th>
                      <th className="py-4 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {apiKeys.map((item) => (
                      <tr key={item.id} className="border-b border-slate-900/60 hover:bg-slate-900/20 transition-all font-semibold">
                        <td className="py-4 px-4 text-white font-extrabold">{item.name}</td>
                        <td className="py-4 px-4 text-slate-400 uppercase text-[10px] tracking-wide">{item.provider}</td>
                        <td className="py-4 px-4 font-mono text-slate-300">
                          <div className="flex items-center gap-2">
                            <span>{revealedKeys[item.id] ? item.api_key : maskKey(item.api_key)}</span>
                            <button
                              onClick={() => toggleRevealKey(item.id)}
                              className="text-slate-500 hover:text-slate-300 cursor-pointer"
                            >
                              {revealedKeys[item.id] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <button
                            onClick={() => handleToggleKeyStatus(item)}
                            className="hover:opacity-80 transition-all cursor-pointer inline-flex"
                          >
                            {item.is_active ? (
                              <ToggleRight className="h-6 w-6 text-emerald-accent" />
                            ) : (
                              <ToggleLeft className="h-6 w-6 text-slate-600" />
                            )}
                          </button>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <button
                            onClick={() => handleDeleteKey(item.id)}
                            className="p-2 hover:bg-red-500/10 text-slate-400 hover:text-red-400 rounded-lg transition-all cursor-pointer"
                            title="Delete Key"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add API Key Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-md rounded-2xl border border-card-border p-6 space-y-6 bg-slate-950/95 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider">Add Provider API Key</h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase mt-0.5">Register an unlimited API key</p>
            </div>

            <form onSubmit={handleAddKey} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Key Name / Identifier</label>
                <input
                  type="text"
                  required
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="e.g. ESPN Primary Key, RapidAPI Backup"
                  className="w-full px-4 py-3 glass-input rounded-xl text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">API Provider</label>
                <select
                  value={newKeyProvider}
                  onChange={(e) => setNewKeyProvider(e.target.value)}
                  className="w-full px-4 py-3 glass-input rounded-xl text-sm bg-slate-950"
                >
                  <option value="espn">ESPN API</option>
                  <option value="rapidapi">RapidAPI (api-football)</option>
                  <option value="custom">Custom Provider</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">API Key Value</label>
                <textarea
                  required
                  rows={3}
                  value={newKeyValue}
                  onChange={(e) => setNewKeyValue(e.target.value)}
                  placeholder="Paste your API key string here..."
                  className="w-full px-4 py-3 glass-input rounded-xl text-sm resize-none"
                />
              </div>

              <div className="flex gap-4 pt-4 border-t border-card-border">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setNewKeyName('');
                    setNewKeyValue('');
                  }}
                  className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white font-black uppercase text-xs tracking-wider rounded-xl transition-all cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingKey}
                  className="flex-1 py-3 bg-emerald-accent hover:bg-emerald-500 text-black font-black uppercase text-xs tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {addingKey ? 'Adding...' : 'Add Key'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
