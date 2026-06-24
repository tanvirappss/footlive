'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import AdminLayout from '@/components/AdminLayout';
import { 
  Plus, 
  Trash2, 
  Check, 
  X, 
  Loader2, 
  Megaphone,
  Volume2,
  Upload,
  Clock,
  MessageSquare,
  Edit3,
  Settings
} from 'lucide-react';

interface Announcement {
  id: string;
  title: string;
  message: string;
  icon: string | null;
  priority: string;
  status: string;
  scheduled_for: string | null;
  created_at: string;
}

export default function AnnouncementsPage() {
  const queryClient = useQueryClient();
  const [announcementTab, setAnnouncementTab] = useState<'text' | 'audio'>('text');
  
  // Modal state - Text Announcement
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states - Text Announcement
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [icon, setIcon] = useState('bell');
  const [priority, setPriority] = useState('medium');
  const [status, setStatus] = useState('published');
  const [scheduledFor, setScheduledFor] = useState('');
  const [mutationError, setMutationError] = useState<string | null>(null);

  // Form states - Audio Alarms
  const [newAudioFile, setNewAudioFile] = useState<File | null>(null);
  const [playAtDate, setPlayAtDate] = useState('');
  const [playAtTime, setPlayAtTime] = useState('');
  const [addingAudio, setAddingAudio] = useState(false);

  // Form states - Audio Settings
  const [audioPlayMode, setAudioPlayMode] = useState<string>('session_limit');
  const [selectedAudioId, setSelectedAudioId] = useState<string>('');
  const [savingSettings, setSavingSettings] = useState(false);

  // Form states - Edit Audio Alarm
  const [isEditAudioModalOpen, setIsEditAudioModalOpen] = useState(false);
  const [editingAudio, setEditingAudio] = useState<any | null>(null);
  const [editPlayAtDate, setEditPlayAtDate] = useState('');
  const [editPlayAtTime, setEditPlayAtTime] = useState('');
  const [updatingAudio, setUpdatingAudio] = useState(false);

  // Query SystemConfig
  const { data: systemConfig, refetch: refetchSystemConfig } = useQuery({
    queryKey: ['system-config'],
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

  // Sync settings when SystemConfig loads
  React.useEffect(() => {
    if (systemConfig) {
      setAudioPlayMode(systemConfig.custom_scripts?.audio_play_mode || 'session_limit');
      setSelectedAudioId(systemConfig.custom_scripts?.selected_audio_id || '');
    }
  }, [systemConfig]);

  // Query Text Announcements
  const { data: announcements = [], isLoading: isLoadingText } = useQuery<Announcement[]>({
    queryKey: ['announcements-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    }
  });

  // Query Audio Alarms
  const { data: audioAnnouncements = [], refetch: refetchAudios, isLoading: isLoadingAudio } = useQuery({
    queryKey: ['audio-announcements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audio_announcements')
        .select('*')
        .order('play_at', { ascending: true });
      if (error) throw error;
      return data || [];
    }
  });

  // Add Click - Text
  const handleAddClick = () => {
    setTitle('');
    setMessage('');
    setIcon('bell');
    setPriority('medium');
    setStatus('published');
    setScheduledFor('');
    setMutationError(null);
    setIsModalOpen(true);
  };

  // Create Announcement Mutation - Text
  const saveMutation = useMutation({
    mutationFn: async () => {
      const data = {
        title,
        message,
        icon,
        priority,
        status,
        scheduled_for: scheduledFor ? new Date(scheduledFor).toISOString() : null,
      };
      const { error } = await supabase
        .from('announcements')
        .insert([data]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements-admin'] });
      setIsModalOpen(false);
    },
    onError: (err: any) => {
      setMutationError(err.message);
    }
  });

  // Delete Announcement Mutation - Text
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements-admin'] });
    }
  });

  // Submit announcement - Text
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate();
  };

  // Upload Scheduled Audio file
  const uploadScheduledAudio = async (file: File): Promise<string> => {
    const filePath = `announcements/audio/${Date.now()}/${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from('teams')
      .upload(filePath, file);
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from('teams').getPublicUrl(filePath);
    return data.publicUrl;
  };

  // Submit Scheduled Audio Alarm
  const handleAddScheduledAudio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAudioFile) {
      alert('Please choose an audio file first.');
      return;
    }
    if (!playAtDate || !playAtTime) {
      alert('Please select both date and time for scheduling.');
      return;
    }
    setAddingAudio(true);
    try {
      const uploadedUrl = await uploadScheduledAudio(newAudioFile);
      const scheduledDateTime = new Date(`${playAtDate}T${playAtTime}`).toISOString();
      const { error } = await supabase
        .from('audio_announcements')
        .insert([{
          name: newAudioFile.name,
          audio_url: uploadedUrl,
          play_at: scheduledDateTime
        }]);
      if (error) throw error;
      setNewAudioFile(null);
      setPlayAtDate('');
      setPlayAtTime('');
      refetchAudios();
      alert('Audio announcement scheduled successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to schedule audio announcement.');
    } finally {
      setAddingAudio(false);
    }
  };

  // Delete Scheduled Audio Alarm
  const handleDeleteScheduledAudio = async (id: string, audioUrl: string) => {
    if (!confirm('Are you sure you want to delete this scheduled audio?')) return;
    try {
      const { error } = await supabase
        .from('audio_announcements')
        .delete()
        .eq('id', id);
      if (error) throw error;

      try {
        const urlObj = new URL(audioUrl);
        const pathParts = urlObj.pathname.split('/public/teams/');
        if (pathParts.length > 1) {
          const storagePath = decodeURIComponent(pathParts[1]);
          await supabase.storage.from('teams').remove([storagePath]);
        }
      } catch (e) {
        console.error('Failed to remove audio file from storage:', e);
      }
      refetchAudios();
      alert('Audio announcement deleted successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to delete audio announcement.');
    }
  };

  // Edit Audio click handler
  const handleEditAudioClick = (audio: any) => {
    setEditingAudio(audio);
    const dateObj = new Date(audio.play_at);
    // Pre-populate with local date/time in YYYY-MM-DD and HH:MM formats
    const localDate = dateObj.getFullYear() + '-' + String(dateObj.getMonth() + 1).padStart(2, '0') + '-' + String(dateObj.getDate()).padStart(2, '0');
    const localTime = String(dateObj.getHours()).padStart(2, '0') + ':' + String(dateObj.getMinutes()).padStart(2, '0');
    setEditPlayAtDate(localDate);
    setEditPlayAtTime(localTime);
    setIsEditAudioModalOpen(true);
  };

  // Submit Update Scheduled Audio Alarm
  const handleUpdateAudioAlarm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAudio) return;
    if (!editPlayAtDate || !editPlayAtTime) {
      alert('Please select both date and time.');
      return;
    }
    setUpdatingAudio(true);
    try {
      const scheduledDateTime = new Date(`${editPlayAtDate}T${editPlayAtTime}`).toISOString();
      const { error } = await supabase
        .from('audio_announcements')
        .update({
          play_at: scheduledDateTime
        })
        .eq('id', editingAudio.id);
      if (error) throw error;
      setIsEditAudioModalOpen(false);
      refetchAudios();
      alert('Audio alarm updated successfully!');
    } catch (err: any) {
      console.error(err);
      alert(`Failed to update audio alarm: ${err.message}`);
    } finally {
      setUpdatingAudio(false);
    }
  };

  // Save Audio settings to SystemConfig
  const handleSaveAudioSettings = async () => {
    setSavingSettings(true);
    try {
      const updatedScripts = {
        ...(systemConfig?.custom_scripts || {}),
        audio_play_mode: audioPlayMode,
        selected_audio_id: selectedAudioId || null
      };
      const { error } = await supabase
        .from('ad_networks')
        .update({
          custom_scripts: updatedScripts
        })
        .eq('network_name', 'SystemConfig');
      if (error) throw error;
      refetchSystemConfig();
      alert('Audio playback settings updated successfully!');
    } catch (err: any) {
      console.error(err);
      alert(`Failed to save settings: ${err.message}`);
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-white uppercase tracking-tight">Announcement Center</h1>
            <p className="text-slate-400 text-sm mt-1">Publish notices, update app maintenance, and schedule alarm notifications.</p>
          </div>
          {announcementTab === 'text' && (
            <button
              onClick={handleAddClick}
              className="flex items-center gap-2 px-4 py-3 bg-emerald-accent hover:bg-emerald-500 text-black font-extrabold uppercase text-xs tracking-wider rounded-xl transition-all duration-200 cursor-pointer shadow-lg shadow-emerald-500/10"
            >
              <Plus className="h-4.5 w-4.5" />
              New Announcement
            </button>
          )}
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-card-border overflow-x-auto gap-2">
          <button
            onClick={() => setAnnouncementTab('text')}
            className={`flex items-center gap-2 px-5 py-3 font-bold uppercase text-[11px] tracking-wider border-b-2 transition-all cursor-pointer shrink-0 ${
              announcementTab === 'text'
                ? 'border-emerald-accent text-emerald-accent bg-emerald-500/5'
                : 'border-transparent text-slate-500 hover:text-white'
            }`}
          >
            <MessageSquare className="h-4 w-4" />
            Text Notices ({announcements.length})
          </button>
          <button
            onClick={() => setAnnouncementTab('audio')}
            className={`flex items-center gap-2 px-5 py-3 font-bold uppercase text-[11px] tracking-wider border-b-2 transition-all cursor-pointer shrink-0 ${
              announcementTab === 'audio'
                ? 'border-emerald-accent text-emerald-accent bg-emerald-500/5'
                : 'border-transparent text-slate-500 hover:text-white'
            }`}
          >
            <Volume2 className="h-4 w-4" />
            Audio Alarms ({audioAnnouncements.length})
          </button>
        </div>

        {/* TEXT NOTICES TAB */}
        {announcementTab === 'text' && (
          <div>
            {isLoadingText ? (
              <div className="flex flex-col items-center justify-center py-24">
                <Loader2 className="h-8 w-8 text-emerald-accent animate-spin" />
                <p className="text-slate-400 text-sm mt-4">Loading announcements feed...</p>
              </div>
            ) : announcements.length === 0 ? (
              <div className="glass-panel p-12 text-center rounded-2xl border border-card-border">
                <Megaphone className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-white uppercase">No Announcements</h3>
                <p className="text-slate-400 text-sm mt-1">Create updates or maintenance alerts to broadcast them on the mobile app.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {announcements.map((ann) => (
                  <div 
                    key={ann.id} 
                    className="glass-panel p-6 rounded-2xl border border-card-border flex flex-col justify-between gap-4 hover:border-slate-700 transition-all duration-150"
                  >
                    <div>
                      <div className="flex justify-between items-start gap-4">
                        <span className={`px-2 py-0.5 rounded text-[9px] uppercase tracking-wider font-bold ${
                          ann.priority === 'high' 
                            ? 'bg-red-500/10 text-red-400 border border-red-500/25'
                            : ann.priority === 'medium'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/25'
                              : 'bg-blue-500/10 text-blue-400 border border-blue-500/25'
                        }`}>
                          {ann.priority} Priority
                        </span>
                        
                        <span className="text-slate-500 text-[10px] uppercase font-bold">
                          {ann.status}
                        </span>
                      </div>

                      <h3 className="font-extrabold text-white text-lg mt-3">{ann.title}</h3>
                      <p className="text-slate-300 text-sm mt-1.5 font-medium line-clamp-3 whitespace-pre-wrap">{ann.message}</p>
                    </div>

                    <div className="border-t border-card-border pt-4 flex justify-between items-center text-xs text-slate-500 font-bold">
                      <span>
                        Posted: {new Date(ann.created_at).toLocaleDateString()}
                      </span>
                      <button
                        onClick={() => {
                          if (confirm('Delete this announcement?')) {
                            deleteMutation.mutate(ann.id);
                          }
                        }}
                        className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 rounded-xl transition-all cursor-pointer"
                      >
                        <Trash2 className="h-4.5 w-4.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* AUDIO ALARMS TAB */}
        {announcementTab === 'audio' && (
          <div className="space-y-6">
            {/* Form to add scheduled audio */}
            <div className="glass-panel p-6 rounded-2xl border border-card-border space-y-4">
              <div>
                <h3 className="text-lg font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Volume2 className="h-5 w-5 text-emerald-accent" />
                  Schedule Audio Announcement (Alarm Style)
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Upload audio files and set the exact date/time they should trigger as an alert on the client app.
                </p>
              </div>

              <form onSubmit={handleAddScheduledAudio} className="p-4 bg-slate-950/40 border border-slate-900 rounded-xl space-y-4">
                <h4 className="text-xs font-black text-slate-300 uppercase tracking-widest">+ Schedule New Audio Announcement</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* File Uploader */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Choose Audio File</label>
                    <label className="flex items-center gap-2 px-4 py-3 bg-slate-900 hover:bg-slate-800 border border-card-border text-slate-300 font-bold uppercase text-xs tracking-wider rounded-xl cursor-pointer transition-colors">
                      <Upload className="h-4 w-4 text-emerald-accent animate-pulse" />
                      <span className="truncate">{newAudioFile ? newAudioFile.name : 'Choose File'}</span>
                      <input
                        type="file"
                        accept="audio/*"
                        className="hidden"
                        required
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            setNewAudioFile(e.target.files[0]);
                          }
                        }}
                      />
                    </label>
                  </div>

                  {/* Date Selector */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Play Date</label>
                    <input
                      type="date"
                      required
                      value={playAtDate}
                      onChange={(e) => setPlayAtDate(e.target.value)}
                      className="w-full px-4 py-2.5 glass-input rounded-xl text-xs text-white"
                    />
                  </div>

                  {/* Time Selector */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Play Time</label>
                    <input
                      type="time"
                      required
                      value={playAtTime}
                      onChange={(e) => setPlayAtTime(e.target.value)}
                      className="w-full px-4 py-2.5 glass-input rounded-xl text-xs text-white"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={addingAudio}
                    className="px-5 py-2.5 bg-emerald-accent hover:bg-emerald-500 text-black font-extrabold uppercase text-xs tracking-wider rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {addingAudio ? 'Uploading...' : 'Schedule Audio Announcement'}
                  </button>
                </div>
              </form>
            </div>

            {/* Audio Playback Settings Panel */}
            <div className="glass-panel p-6 rounded-2xl border border-card-border space-y-4">
              <div>
                <h3 className="text-lg font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Settings className="h-5 w-5 text-emerald-accent" />
                  Website Audio Playback & Auto-Play Settings
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Control how uploaded audio announcements behave on the public website and select the active audio file.
                </p>
              </div>

              <div className="p-4 bg-slate-950/40 border border-slate-900 rounded-xl space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Playback Mode */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Playback Frequency / Mode</label>
                    <select
                      value={audioPlayMode}
                      onChange={(e) => setAudioPlayMode(e.target.value)}
                      className="w-full px-4 py-2.5 glass-input rounded-xl text-xs text-white appearance-none cursor-pointer"
                    >
                      <option value="off">Off / Disable Audio Alarm</option>
                      <option value="session_limit">Limit to Max 2 Plays per Session (Default)</option>
                      <option value="refresh">Play on Every Refresh / Page Load</option>
                      <option value="limit_5">Limit to Max 5 Plays per Day per User</option>
                    </select>
                  </div>

                  {/* Selected Audio */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Select Active Audio Sound</label>
                    <select
                      value={selectedAudioId}
                      onChange={(e) => setSelectedAudioId(e.target.value)}
                      className="w-full px-4 py-2.5 glass-input rounded-xl text-xs text-white appearance-none cursor-pointer"
                    >
                      <option value="">-- Play Latest Scheduled Past Sound (Default) --</option>
                      {audioAnnouncements.map((audio: any) => (
                        <option key={audio.id} value={audio.id}>
                          {audio.name} ({new Date(audio.play_at).toLocaleDateString()} {new Date(audio.play_at).toLocaleTimeString()})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={handleSaveAudioSettings}
                    disabled={savingSettings}
                    className="px-5 py-2.5 bg-emerald-accent hover:bg-emerald-500 text-black font-extrabold uppercase text-xs tracking-wider rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {savingSettings ? 'Saving...' : 'Save Settings'}
                  </button>
                </div>
              </div>
            </div>

            {/* List of scheduled alarms */}
            <div className="glass-panel p-6 rounded-2xl border border-card-border space-y-4">
              <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">Scheduled Alarms ({audioAnnouncements.length})</span>
              
              {isLoadingAudio ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 text-emerald-accent animate-spin" />
                </div>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                  {audioAnnouncements.length === 0 ? (
                    <div className="text-center py-6 border border-dashed border-card-border rounded-xl">
                      <p className="text-xs text-slate-500 font-medium">No scheduled audio announcements. Use the form above to add one.</p>
                    </div>
                  ) : (
                    audioAnnouncements.map((item: any, idx: number) => {
                      const playDate = new Date(item.play_at);
                      const isFuture = playDate.getTime() > Date.now();
                      
                      return (
                        <div
                          key={item.id}
                          className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between p-3 bg-slate-950/40 border border-slate-900 rounded-xl"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black text-slate-500">#{idx + 1}</span>
                              <span className="text-xs font-bold text-white truncate max-w-[200px]" title={item.name}>{item.name}</span>
                              <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                                isFuture ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              }`}>
                                {isFuture ? 'Scheduled' : 'Passed'}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-1">
                              <Clock className="h-3 w-3 text-emerald-accent" />
                              <span>Plays at: {playDate.toLocaleString()}</span>
                            </div>
                          </div>

                          {/* Audio Player, Edit and Delete */}
                          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                            <audio src={item.audio_url} controls className="h-7 max-w-[140px] sm:max-w-[160px] bg-slate-900 rounded-lg" />
                            <button
                              type="button"
                              onClick={() => handleEditAudioClick(item)}
                              className="p-1.5 bg-slate-950 border border-slate-900 hover:border-emerald-500/25 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg cursor-pointer transition-colors"
                              title="Edit Date/Time"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteScheduledAudio(item.id, item.audio_url)}
                              className="p-1.5 bg-slate-950 border border-slate-900 hover:border-red-500/25 hover:text-red-400 hover:bg-red-500/10 rounded-lg cursor-pointer transition-colors"
                              title="Delete Alarm"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Text Announcement Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-lg glass-panel p-8 rounded-3xl space-y-6">
              <div className="flex justify-between items-center pb-4 border-b border-card-border">
                <h3 className="text-xl font-extrabold text-white uppercase">Publish Announcement</h3>
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
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Announcement Title</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Server Maintenance Notice"
                    className="w-full px-4 py-3 glass-input rounded-xl text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Message Details</label>
                  <textarea
                    rows={4}
                    required
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Provide details..."
                    className="w-full px-4 py-3 glass-input rounded-xl text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Alert Priority</label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                      className="w-full px-4 py-3 glass-input rounded-xl text-sm appearance-none cursor-pointer"
                    >
                      <option value="low">Low Priority</option>
                      <option value="medium">Medium Priority</option>
                      <option value="high">High Priority</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Publish Status</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full px-4 py-3 glass-input rounded-xl text-sm appearance-none cursor-pointer"
                    >
                      <option value="published">Publish Immediately</option>
                      <option value="draft">Save Draft</option>
                      <option value="scheduled">Schedule Later</option>
                    </select>
                  </div>
                </div>

                {status === 'scheduled' && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-white uppercase tracking-wider block">Schedule Time</label>
                    <input
                      type="datetime-local"
                      required
                      value={scheduledFor}
                      onChange={(e) => setScheduledFor(e.target.value)}
                      className="w-full px-4 py-3 glass-input rounded-xl text-sm cursor-pointer"
                    />
                  </div>
                )}

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
                    Publish Notice
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Audio Date/Time Modal */}
        {isEditAudioModalOpen && editingAudio && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md glass-panel p-6 rounded-3xl space-y-6">
              <div className="flex justify-between items-center pb-4 border-b border-card-border">
                <h3 className="text-lg font-bold text-white uppercase tracking-wider">Edit Scheduled Alarm Date & Time</h3>
                <button 
                  onClick={() => setIsEditAudioModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleUpdateAudioAlarm} className="space-y-4">
                <div className="space-y-1 text-xs">
                  <p className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">File Name:</p>
                  <p className="text-white font-extrabold truncate text-sm">{editingAudio.name}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Date Selector */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Play Date</label>
                    <input
                      type="date"
                      required
                      value={editPlayAtDate}
                      onChange={(e) => setEditPlayAtDate(e.target.value)}
                      className="w-full px-4 py-2.5 glass-input rounded-xl text-xs text-white"
                    />
                  </div>

                  {/* Time Selector */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Play Time</label>
                    <input
                      type="time"
                      required
                      value={editPlayAtTime}
                      onChange={(e) => setEditPlayAtTime(e.target.value)}
                      className="w-full px-4 py-2.5 glass-input rounded-xl text-xs text-white"
                    />
                  </div>
                </div>

                <div className="pt-4 flex justify-end gap-3 border-t border-card-border">
                  <button
                    type="button"
                    onClick={() => setIsEditAudioModalOpen(false)}
                    className="px-5 py-3 border border-slate-800 hover:bg-slate-800 text-slate-300 font-bold uppercase text-xs tracking-wider rounded-xl transition-all duration-150 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updatingAudio}
                    className="flex items-center gap-2 px-6 py-3 bg-emerald-accent hover:bg-emerald-500 text-black font-extrabold uppercase text-xs tracking-wider rounded-xl transition-all duration-150 cursor-pointer"
                  >
                    {updatingAudio ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    Update Schedule
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
