'use client';

import React, { useState, useEffect } from 'react';
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
  Send, 
  BellRing, 
  Settings,
  AlertCircle
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
  
  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPushModalOpen, setIsPushModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Form states - Announcement
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [icon, setIcon] = useState('bell');
  const [priority, setPriority] = useState('medium');
  const [status, setStatus] = useState('published');
  const [scheduledFor, setScheduledFor] = useState('');
  const [mutationError, setMutationError] = useState<string | null>(null);

  // Form states - Push Notification
  const [pushTitle, setPushTitle] = useState('');
  const [pushMessage, setPushMessage] = useState('');
  const [pushSending, setPushSending] = useState(false);
  const [pushSuccess, setPushSuccess] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);

  // OneSignal Settings state (Stored in LocalStorage for simplicity)
  const [oneSignalAppId, setOneSignalAppId] = useState('');
  const [oneSignalApiKey, setOneSignalApiKey] = useState('');

  useEffect(() => {
    setOneSignalAppId(localStorage.getItem('onesignal_app_id') || '');
    setOneSignalApiKey(localStorage.getItem('onesignal_api_key') || '');
  }, []);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('onesignal_app_id', oneSignalAppId);
    localStorage.setItem('onesignal_api_key', oneSignalApiKey);
    setIsSettingsOpen(false);
  };

  // Queries
  const { data: announcements = [], isLoading } = useQuery<Announcement[]>({
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

  const handlePushClick = () => {
    setPushTitle('');
    setPushMessage('');
    setPushSuccess(false);
    setPushError(null);
    setIsPushModalOpen(true);
  };

  // Create Announcement Mutation
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

  // Delete Announcement Mutation
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

  // Submit announcement
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate();
  };

  // Send Push Notification via Proxy API
  const handleSendPush = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oneSignalAppId || !oneSignalApiKey) {
      setPushError('Please configure OneSignal App ID and API Key in the settings first.');
      return;
    }

    setPushSending(true);
    setPushError(null);
    setPushSuccess(false);

    try {
      const response = await fetch('/api/notify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: pushTitle,
          message: pushMessage,
          appId: oneSignalAppId,
          apiKey: oneSignalApiKey,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to dispatch notification.');
      }

      setPushSuccess(true);
      setTimeout(() => setIsPushModalOpen(false), 2000);
    } catch (err: any) {
      setPushError(err.message);
    } finally {
      setPushSending(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-white uppercase tracking-tight">Announcement Center</h1>
            <p className="text-slate-400 text-sm mt-1">Publish notices, update app maintenance, and send push alerts.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center gap-2 px-4 py-3 border border-slate-800 hover:bg-slate-800 text-slate-300 font-bold uppercase text-xs tracking-wider rounded-xl transition-all duration-200 cursor-pointer"
            >
              <Settings className="h-4.5 w-4.5" />
              OneSignal Config
            </button>
            <button
              onClick={handlePushClick}
              className="flex items-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white font-extrabold uppercase text-xs tracking-wider rounded-xl transition-all duration-200 cursor-pointer shadow-lg shadow-blue-500/10"
            >
              <BellRing className="h-4.5 w-4.5" />
              Broadcast Push
            </button>
            <button
              onClick={handleAddClick}
              className="flex items-center gap-2 px-4 py-3 bg-emerald-accent hover:bg-emerald-500 text-black font-extrabold uppercase text-xs tracking-wider rounded-xl transition-all duration-200 cursor-pointer shadow-lg shadow-emerald-500/10"
            >
              <Plus className="h-4.5 w-4.5" />
              New Announcement
            </button>
          </div>
        </div>

        {/* Credentials Warning */}
        {(!oneSignalAppId || !oneSignalApiKey) && (
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex gap-3 text-amber-400 text-xs font-semibold">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <div>
              <p className="font-bold text-white uppercase">OneSignal Settings Required</p>
              <p className="mt-0.5 text-slate-400 font-medium">To send push alerts, click "OneSignal Config" to register your App ID and REST API Key. This will be stored locally in your browser.</p>
            </div>
          </div>
        )}

        {/* Announcements List */}
        {isLoading ? (
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

        {/* Announcement Modal */}
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
                    placeholder="Provide details about app updates, scheduled downtimes, or general matches news..."
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

        {/* Broadcast Push Modal */}
        {isPushModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-lg glass-panel p-8 rounded-3xl space-y-6">
              <div className="flex justify-between items-center pb-4 border-b border-card-border">
                <h3 className="text-xl font-extrabold text-white uppercase">OneSignal Broadcast</h3>
                <button 
                  onClick={() => setIsPushModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleSendPush} className="space-y-4">
                {pushSuccess && (
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-bold rounded-2xl flex items-center gap-2">
                    <Check className="h-5 w-5" />
                    Notification broadcasted successfully!
                  </div>
                )}
                {pushError && (
                  <div className="p-4 bg-red-950/20 border border-red-500/25 text-red-400 text-sm font-bold rounded-2xl">
                    {pushError}
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Push Title</label>
                  <input
                    type="text"
                    required
                    value={pushTitle}
                    onChange={(e) => setPushTitle(e.target.value)}
                    placeholder="e.g. 🏆 Match Kickoff Alert!"
                    className="w-full px-4 py-3 glass-input rounded-xl text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Push Body Message</label>
                  <textarea
                    rows={3}
                    required
                    value={pushMessage}
                    onChange={(e) => setPushMessage(e.target.value)}
                    placeholder="e.g. Argentina vs France is live now! Tap here to watch in premium HD."
                    className="w-full px-4 py-3 glass-input rounded-xl text-sm"
                  />
                </div>

                <div className="pt-4 flex justify-end gap-3 border-t border-card-border">
                  <button
                    type="button"
                    onClick={() => setIsPushModalOpen(false)}
                    className="px-5 py-3 border border-slate-800 hover:bg-slate-800 text-slate-300 font-bold uppercase text-xs tracking-wider rounded-xl transition-all duration-150 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={pushSending}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-extrabold uppercase text-xs tracking-wider rounded-xl transition-all duration-150 cursor-pointer disabled:opacity-50"
                  >
                    {pushSending ? (
                      <Loader2 className="h-4.5 w-4.5 animate-spin" />
                    ) : (
                      <Send className="h-4.5 w-4.5" />
                    )}
                    Send Broadcast
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* OneSignal Settings Modal */}
        {isSettingsOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-lg glass-panel p-8 rounded-3xl space-y-6">
              <div className="flex justify-between items-center pb-4 border-b border-card-border">
                <h3 className="text-xl font-extrabold text-white uppercase">OneSignal Settings</h3>
                <button 
                  onClick={() => setIsSettingsOpen(false)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleSaveSettings} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">OneSignal App ID</label>
                  <input
                    type="text"
                    required
                    value={oneSignalAppId}
                    onChange={(e) => setOneSignalAppId(e.target.value)}
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    className="w-full px-4 py-3 glass-input rounded-xl text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">OneSignal REST API Key</label>
                  <input
                    type="password"
                    required
                    value={oneSignalApiKey}
                    onChange={(e) => setOneSignalApiKey(e.target.value)}
                    placeholder="os_v2_app_xxxxxxxxxxxxxxxxxxxxxxxx"
                    className="w-full px-4 py-3 glass-input rounded-xl text-sm"
                  />
                </div>

                <div className="pt-4 flex justify-end gap-3 border-t border-card-border">
                  <button
                    type="button"
                    onClick={() => setIsSettingsOpen(false)}
                    className="px-5 py-3 border border-slate-800 hover:bg-slate-800 text-slate-300 font-bold uppercase text-xs tracking-wider rounded-xl transition-all duration-150 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3 bg-emerald-accent hover:bg-emerald-500 text-black font-extrabold uppercase text-xs tracking-wider rounded-xl transition-all duration-150 cursor-pointer"
                  >
                    Save Credentials
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
