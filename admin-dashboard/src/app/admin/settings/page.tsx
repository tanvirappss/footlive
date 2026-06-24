'use client';

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import AdminLayout from '@/components/AdminLayout';
import { 
  Upload, 
  Check, 
  Tv, 
  Users, 
  BellRing,
  Globe,
  Sliders,
  Sparkles,
  MessageSquareCode,
  Star
} from 'lucide-react';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'branding' | 'seo' | 'ticker' | 'offsets' | 'streams' | 'apptexts'>('branding');

  // Fetch ticker settings
  const { data: tickerData, refetch: refetchTicker } = useQuery({
    queryKey: ['ticker-settings-full-v2'],
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

  // Ticker States
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
  const [useLogoImage, setUseLogoImage] = useState(false);

  // Visitor Offsets States
  const [viewsOffset, setViewsOffset] = useState(0);
  const [viewersOffset, setViewersOffset] = useState(0);
  const [updatingCounts, setUpdatingCounts] = useState(false);
  const [countsSuccess, setCountsSuccess] = useState(false);

  // Default Streams States
  const [defaultStreams, setDefaultStreams] = useState<{ label: string; url: string }[]>([]);
  const [updatingDefaultStreams, setUpdatingDefaultStreams] = useState(false);
  const [defaultStreamsSuccess, setDefaultStreamsSuccess] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // SystemConfig States for Auto-Populate Toggle
  const [systemConfigId, setSystemConfigId] = useState<string | null>(null);
  const [systemConfigData, setSystemConfigData] = useState<any>(null);
  const [autoPopulateDefaultStreams, setAutoPopulateDefaultStreams] = useState(true);
  const [forceAllLive, setForceAllLive] = useState(false);
  const [autoScheduleEnabled, setAutoScheduleEnabled] = useState(false);

  // Social Share & SEO Meta States
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [metaImageUrl, setMetaImageUrl] = useState('');
  const [metaImageFile, setMetaImageFile] = useState<File | null>(null);
  const [updatingMeta, setUpdatingMeta] = useState(false);
  const [metaSuccess, setMetaSuccess] = useState(false);

  // App UI Texts States
  const [tickerBadge, setTickerBadge] = useState('⚡ NEWS TICKER');
  const [headerSubtitle, setHeaderSubtitle] = useState('Premium Streaming Portal');
  const [tabLiveName, setTabLiveName] = useState('🔴 Live Now');
  const [tabUpcomingName, setTabUpcomingName] = useState('📅 Upcoming Fixtures');
  const [tabFinishedName, setTabFinishedName] = useState('🏁 Finished Matches');
  const [tabChannelsName, setTabChannelsName] = useState('📺 Live Channels');
  const [noMatchesTitle, setNoMatchesTitle] = useState('NO MATCHES BROADCASTS');
  const [noMatchesDesc, setNoMatchesDesc] = useState('There are no active matches in this tab. Tune in during kickoff schedules.');
  const [noStreamsTitle, setNoStreamsTitle] = useState('No Streams Configured');
  const [noStreamsDesc, setNoStreamsDesc] = useState('There are no active video links bound to this match yet. Check back closer to game kickoff.');
  const [updatingAppTexts, setUpdatingAppTexts] = useState(false);
  const [appTextsSuccess, setAppTextsSuccess] = useState(false);

  useEffect(() => {
    if (tickerData) {
      setTickerText(tickerData.ticker_text || '');
      setIsTickerEnabled(tickerData.is_enabled !== false);
      setSiteName(tickerData.site_name || 'WORLD CUP 2026');
      setSiteLogoUrl(tickerData.logo_url || '');
      setSiteBannerUrl(tickerData.banner_url || '');
      setShowCounters(tickerData.show_counters !== false);
      setViewsOffset(tickerData.views_offset || 0);
      setViewersOffset(tickerData.viewers_offset || 0);
      if (Array.isArray((tickerData as any).default_streams)) {
        setDefaultStreams((tickerData as any).default_streams);
      } else {
        setDefaultStreams([]);
      }
      setMetaTitle((tickerData as any).meta_title || '');
      setMetaDescription((tickerData as any).meta_description || '');
      setMetaImageUrl((tickerData as any).meta_image || '');
      setUseLogoImage((tickerData as any).use_logo_image === true);

      // Only fall back to tickerData for App UI Texts if SystemConfig doesn't have them yet
      const hasSystemUiTexts = !!systemConfigData?.custom_scripts?.app_ui_texts;
      if (!hasSystemUiTexts) {
        setTickerBadge((tickerData as any).ticker_badge || '⚡ NEWS TICKER');
        setHeaderSubtitle((tickerData as any).header_subtitle || 'Premium Streaming Portal');
        setTabLiveName((tickerData as any).tab_live_name || '🔴 Live Now');
        setTabUpcomingName((tickerData as any).tab_upcoming_name || '📅 Upcoming Fixtures');
        setTabFinishedName((tickerData as any).tab_finished_name || '🏁 Finished Matches');
        setTabChannelsName((tickerData as any).tab_channels_name || '📺 Live Channels');
        setNoMatchesTitle((tickerData as any).no_matches_title || 'NO MATCHES BROADCASTS');
        setNoMatchesDesc((tickerData as any).no_matches_desc || 'There are no active matches in this tab. Tune in during kickoff schedules.');
        setNoStreamsTitle((tickerData as any).no_streams_title || 'No Streams Configured');
        setNoStreamsDesc((tickerData as any).no_streams_desc || 'There are no active video links bound to this match yet. Check back closer to game kickoff.');
      }
    }
  }, [tickerData, systemConfigData]);

  // Load SystemConfig for Default Stream Auto-Populate Toggle
  const fetchSystemConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('ad_networks')
        .select('*')
        .eq('network_name', 'SystemConfig')
        .maybeSingle();
      if (!error && data) {
        setSystemConfigId(data.id);
        setSystemConfigData(data);
        setForceAllLive(!!data.custom_scripts?.force_all_live);
        setAutoScheduleEnabled(!!data.custom_scripts?.auto_schedule_enabled);
        setAutoPopulateDefaultStreams(data.custom_scripts?.auto_populate_default_streams !== false);
        
        const uiTexts = data.custom_scripts?.app_ui_texts;
        if (uiTexts) {
          setTickerBadge(uiTexts.ticker_badge || '⚡ NEWS TICKER');
          setHeaderSubtitle(uiTexts.header_subtitle || 'Premium Streaming Portal');
          setTabLiveName(uiTexts.tab_live_name || '🔴 Live Now');
          setTabUpcomingName(uiTexts.tab_upcoming_name || '📅 Upcoming Fixtures');
          setTabFinishedName(uiTexts.tab_finished_name || '🏁 Finished Matches');
          setTabChannelsName(uiTexts.tab_channels_name || '📺 Live Channels');
          setNoMatchesTitle(uiTexts.no_matches_title || 'NO MATCHES BROADCASTS');
          setNoMatchesDesc(uiTexts.no_matches_desc || 'There are no active matches in this tab. Tune in during kickoff schedules.');
          setNoStreamsTitle(uiTexts.no_streams_title || 'No Streams Configured');
          setNoStreamsDesc(uiTexts.no_streams_desc || 'There are no active video links bound to this match yet. Check back closer to game kickoff.');
        }
      }
    } catch (err) {
      console.error('Failed to load SystemConfig:', err);
    }
  };

  useEffect(() => {
    fetchSystemConfig();
  }, []);

  const handleToggleAutoPopulateDefaultStreams = async () => {
    const nextVal = !autoPopulateDefaultStreams;
    setAutoPopulateDefaultStreams(nextVal);
    try {
      const existingScripts = systemConfigData?.custom_scripts || {};
      const updatedScripts = {
        ...existingScripts,
        force_all_live: forceAllLive,
        auto_schedule_enabled: autoScheduleEnabled,
        auto_populate_default_streams: nextVal
      };
      if (systemConfigId) {
        await supabase
          .from('ad_networks')
          .update({
            custom_scripts: updatedScripts
          })
          .eq('id', systemConfigId);
      } else {
        const { data: created } = await supabase
          .from('ad_networks')
          .insert([{
            network_name: 'SystemConfig',
            is_enabled: true,
            custom_scripts: updatedScripts
          }])
          .select()
          .single();
        if (created) setSystemConfigId(created.id);
      }
      await fetchSystemConfig();
    } catch (err) {
      console.error('Failed to update SystemConfig:', err);
    }
  };

  // Submit Headline Ticker Settings
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

  // Submit Telemetry Count Settings
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

  // Default stream priorities priority syncing
  const saveAndSyncDefaultStreams = async (updatedStreams: { label: string; url: string }[]) => {
    try {
      const filteredStreams = updatedStreams.filter(item => item.label.trim() && item.url.trim());
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

      const { data: allStreams, error: fetchErr } = await supabase
        .from('streams')
        .select('id');

      if (!fetchErr && allStreams && allStreams.length > 0) {
        const updatePromises = allStreams.map(s => {
          return supabase
            .from('streams')
            .update({
              primary_url: filteredStreams[0]?.url || '',
              backup_url_1: filteredStreams[1]?.url || null,
              backup_url_2: filteredStreams[2]?.url || null,
              backup_url_3: filteredStreams[3]?.url || null,
              urls: filteredStreams
            })
            .eq('id', s.id);
        });
        await Promise.all(updatePromises);
      }
      refetchTicker();
    } catch (err) {
      console.error('Failed to auto-sync default stream links:', err);
    }
  };

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
    saveAndSyncDefaultStreams(defaultStreams);
  };

  const moveStreamItem = (index: number, direction: 'up' | 'down') => {
    const list = [...defaultStreams];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= list.length) return;
    const temp = list[index];
    list[index] = list[newIndex];
    list[newIndex] = temp;
    setDefaultStreams(list);
    saveAndSyncDefaultStreams(list);
  };

  const deleteStreamItem = (index: number) => {
    const list = defaultStreams.filter((_, i) => i !== index);
    setDefaultStreams(list);
    saveAndSyncDefaultStreams(list);
  };

  const handleDefaultStreamsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdatingDefaultStreams(true);
    setDefaultStreamsSuccess(false);
    try {
      await saveAndSyncDefaultStreams(defaultStreams);
      setDefaultStreamsSuccess(true);
      setTimeout(() => setDefaultStreamsSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      alert('Failed to save default stream links.');
    } finally {
      setUpdatingDefaultStreams(false);
    }
  };

  // SEO metadata logo upload
  const uploadMetaImage = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_meta_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `site/${fileName}`;
    const { error: uploadError } = await supabase.storage
      .from('teams')
      .upload(filePath, file);
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from('teams').getPublicUrl(filePath);
    return data.publicUrl;
  };

  // Submit SEO Meta Settings
  const handleMetaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdatingMeta(true);
    setMetaSuccess(false);
    try {
      let finalImageUrl = metaImageUrl;
      if (metaImageFile) {
        finalImageUrl = await uploadMetaImage(metaImageFile);
        setMetaImageUrl(finalImageUrl);
        setMetaImageFile(null);
      }
      const updateData = {
        meta_title: metaTitle,
        meta_description: metaDescription,
        meta_image: finalImageUrl || null,
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
      setMetaSuccess(true);
      refetchTicker();
      setTimeout(() => setMetaSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      alert('Failed to update social share meta settings');
    } finally {
      setUpdatingMeta(false);
    }
  };

  // Branding images uploads
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

  // Submit Branding Settings
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
        use_logo_image: useLogoImage,
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

  // Submit App UI Texts (Dynamic UI options)
  const handleAppTextsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdatingAppTexts(true);
    setAppTextsSuccess(false);
    try {
      const uiTexts = {
        ticker_badge: tickerBadge,
        header_subtitle: headerSubtitle,
        tab_live_name: tabLiveName,
        tab_upcoming_name: tabUpcomingName,
        tab_finished_name: tabFinishedName,
        tab_channels_name: tabChannelsName,
        no_matches_title: noMatchesTitle,
        no_matches_desc: noMatchesDesc,
        no_streams_title: noStreamsTitle,
        no_streams_desc: noStreamsDesc
      };

      const existingScripts = systemConfigData?.custom_scripts || {};

      if (systemConfigId) {
        const { error } = await supabase
          .from('ad_networks')
          .update({
            custom_scripts: {
              ...existingScripts,
              app_ui_texts: uiTexts
            }
          })
          .eq('id', systemConfigId);
        if (error) throw error;
      } else {
        const { data: created, error } = await supabase
          .from('ad_networks')
          .insert([{
            network_name: 'SystemConfig',
            is_enabled: true,
            custom_scripts: {
              force_all_live: forceAllLive,
              auto_schedule_enabled: autoScheduleEnabled,
              auto_populate_default_streams: autoPopulateDefaultStreams,
              app_ui_texts: uiTexts
            }
          }])
          .select()
          .single();
        if (error) throw error;
        if (created) setSystemConfigId(created.id);
      }

      // Also try to update ticker_settings for backwards compatibility, but ignore errors
      try {
        const updateData = {
          ticker_badge: tickerBadge,
          header_subtitle: headerSubtitle,
          tab_live_name: tabLiveName,
          tab_upcoming_name: tabUpcomingName,
          tab_finished_name: tabFinishedName,
          tab_channels_name: tabChannelsName,
          no_matches_title: noMatchesTitle,
          no_matches_desc: noMatchesDesc,
          no_streams_title: noStreamsTitle,
          no_streams_desc: noStreamsDesc,
          updated_at: new Date().toISOString()
        };
        if (tickerData?.id) {
          await supabase
            .from('ticker_settings')
            .update(updateData)
            .eq('id', tickerData.id);
        } else {
          await supabase
            .from('ticker_settings')
            .insert([updateData]);
        }
      } catch (tickerErr) {
        console.warn('Failed to update ticker_settings columns, this is fine since it is saved in SystemConfig', tickerErr);
      }

      setAppTextsSuccess(true);
      await fetchSystemConfig();
      refetchTicker();
      setTimeout(() => setAppTextsSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      alert('Failed to save UI texts settings.');
    } finally {
      setUpdatingAppTexts(false);
    }
  };

  // Tab configurations
  const tabs = [
    { id: 'branding', label: 'Branding & Info', icon: Sparkles },
    { id: 'seo', label: 'SEO & Metadata', icon: Globe },
    { id: 'ticker', label: 'News Ticker', icon: BellRing },
    { id: 'offsets', label: 'Telemetry Offsets', icon: Users },
    { id: 'streams', label: 'Stream Priorities', icon: Tv },
    { id: 'apptexts', label: 'App UI Texts', icon: MessageSquareCode },
  ] as const;

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-extrabold text-white uppercase tracking-tight">System Settings</h1>
          <p className="text-slate-400 text-sm mt-1">Configure branding details, news headlines, and technical app parameters.</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-card-border overflow-x-auto gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-3.5 font-bold uppercase text-[11px] tracking-wider border-b-2 transition-all cursor-pointer shrink-0 ${
                  isSelected
                    ? 'border-emerald-accent text-emerald-accent bg-emerald-500/5'
                    : 'border-transparent text-slate-500 hover:text-white hover:bg-slate-800/10'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab panels */}
        <div className="mt-6">
          {/* BRANDING TAB */}
          {activeTab === 'branding' && (
            <div className="glass-panel p-6 rounded-2xl border border-card-border space-y-6">
              <div>
                <h3 className="text-lg font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-emerald-accent" />
                  Website Branding & Identity Settings
                </h3>
                <p className="text-xs text-slate-400 mt-1">Configure your website name, custom header logos, and hero section banner.</p>
              </div>

              <form onSubmit={handleBrandingSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Site Name and Counters */}
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
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Real-Time Traffic Counters</label>
                      <div className="flex items-center gap-3 p-3 bg-slate-950/60 border border-slate-900 rounded-xl">
                        <button
                          type="button"
                          onClick={() => setShowCounters(!showCounters)}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
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

                  {/* Logo Config */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="sm:col-span-2 space-y-1.5">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Custom Logo URL</label>
                        <input
                          type="text"
                          value={siteLogoUrl}
                          onChange={(e) => {
                            setSiteLogoUrl(e.target.value);
                            setSiteLogoFile(null);
                          }}
                          placeholder="https://example.com/logo.png"
                          className="w-full px-4 py-3 glass-input rounded-xl text-sm"
                        />
                      </div>

                      <div className="flex items-end justify-center">
                        <div className="h-12 w-32 bg-slate-950/60 border border-slate-900 rounded-xl flex items-center justify-center overflow-hidden shrink-0">
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
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Or Upload Full Logo File (120px x 32px recommended)</label>
                      <div className="flex items-center gap-3">
                        <label className="flex-1 flex items-center gap-3 px-4 py-3 bg-slate-950/60 border border-dashed border-slate-800 rounded-xl cursor-pointer hover:border-slate-700 hover:bg-slate-900/50 transition-all duration-150">
                          <Upload className="h-5 w-5 text-slate-500 shrink-0" />
                          <span className="text-xs text-slate-400 font-semibold truncate text-left">
                            {siteLogoFile ? siteLogoFile.name : 'Upload logo image file'}
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0] || null;
                              setSiteLogoFile(file);
                              if (file) setSiteLogoUrl('');
                            }}
                            className="hidden"
                          />
                        </label>

                        {(siteLogoUrl || siteLogoFile) && (
                          <button
                            type="button"
                            onClick={() => {
                              setSiteLogoUrl('');
                              setSiteLogoFile(null);
                            }}
                            className="px-4 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/25 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                          >
                            Delete Logo
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Logo Display Method</label>
                      <div className="flex items-center gap-3 p-3 bg-slate-950/60 border border-slate-900 rounded-xl">
                        <button
                          type="button"
                          onClick={() => setUseLogoImage(!useLogoImage)}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-0 ${
                            useLogoImage ? 'bg-emerald-500' : 'bg-slate-800'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              useLogoImage ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                        <div>
                          <span className="text-xs font-extrabold text-white block">Use Uploaded Logo Image</span>
                          <span className="text-[10px] text-slate-500 block">Show the uploaded logo image instead of text brand</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Banner Section */}
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
                              setSiteBannerFile(null);
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
                              if (file) setSiteBannerUrl('');
                            }}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>

                    <div className="space-y-4 flex flex-col justify-end">
                      <div className="p-4 bg-slate-950/40 border border-slate-900 rounded-2xl flex flex-col gap-2">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Active Banner Action</span>
                        <p className="text-xs text-slate-500">You can reset the custom header design to its standard default look.</p>
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

                {/* Form Footer */}
                <div className="flex items-center justify-between border-t border-card-border pt-4">
                  {brandingSuccess ? (
                    <p className="text-xs text-emerald-accent font-bold flex items-center gap-1 animate-pulse">
                      <Check className="h-4 w-4" /> Branding settings saved successfully!
                    </p>
                  ) : <div />}
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
          )}

          {/* SEO TAB */}
          {activeTab === 'seo' && (
            <div className="glass-panel p-6 rounded-2xl border border-card-border space-y-6">
              <div>
                <h3 className="text-lg font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Globe className="h-5 w-5 text-emerald-accent" />
                  Social Share & SEO Metadata Settings
                </h3>
                <p className="text-xs text-slate-400 mt-1">Configure metadata that generates automatically when users share your links on Facebook, WhatsApp, etc.</p>
              </div>

              <form onSubmit={handleMetaSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Meta Title and Description */}
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Share Title (Meta Title)</label>
                      <input
                        type="text"
                        required
                        value={metaTitle}
                        onChange={(e) => setMetaTitle(e.target.value)}
                        placeholder="e.g. FIFA World Cup 2026 Live Streaming"
                        className="w-full px-4 py-3 glass-input rounded-xl text-sm"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Share Description (Meta Description)</label>
                      <textarea
                        required
                        rows={4}
                        value={metaDescription}
                        onChange={(e) => setMetaDescription(e.target.value)}
                        placeholder="Provide SEO details..."
                        className="w-full px-4 py-3 glass-input rounded-xl text-sm resize-none"
                      />
                    </div>
                  </div>

                  {/* Share Image URL & File Uploader */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="sm:col-span-2 space-y-1.5">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Preview Image URL (Meta Image)</label>
                        <input
                          type="text"
                          value={metaImageUrl}
                          onChange={(e) => {
                            setMetaImageUrl(e.target.value);
                            setMetaImageFile(null);
                          }}
                          placeholder="https://example.com/share-preview.png"
                          className="w-full px-4 py-3 glass-input rounded-xl text-sm"
                        />
                      </div>

                      <div className="flex items-end justify-center">
                        <div className="h-12 w-24 bg-slate-950/60 border border-slate-900 rounded-xl flex items-center justify-center overflow-hidden shrink-0">
                          {metaImageFile ? (
                            <img
                              src={URL.createObjectURL(metaImageFile)}
                              alt="Preview"
                              className="h-full w-full object-contain p-1"
                            />
                          ) : metaImageUrl ? (
                            <img
                              src={metaImageUrl}
                              alt="Share Preview"
                              className="h-full w-full object-contain p-1"
                            />
                          ) : (
                            <span className="text-[10px] text-slate-600 font-extrabold text-center leading-none">No Preview Image</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Or Upload Share Image File</label>
                      <label className="flex-1 flex items-center gap-3 px-4 py-3 bg-slate-950/60 border border-dashed border-slate-800 rounded-xl cursor-pointer hover:border-slate-700 hover:bg-slate-900/50 transition-all duration-150">
                        <Upload className="h-5 w-5 text-slate-500 shrink-0" />
                        <span className="text-xs text-slate-400 font-semibold truncate">
                          {metaImageFile ? metaImageFile.name : 'Upload preview image file (1200x630 recommended)'}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0] || null;
                            setMetaImageFile(file);
                            if (file) setMetaImageUrl('');
                          }}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                </div>

                {/* Form Footer */}
                <div className="flex items-center justify-between border-t border-card-border pt-4">
                  {metaSuccess ? (
                    <p className="text-xs text-emerald-accent font-bold flex items-center gap-1 animate-pulse">
                      <Check className="h-4 w-4" /> SEO metadata saved successfully!
                    </p>
                  ) : <div />}
                  <button
                    type="submit"
                    disabled={updatingMeta}
                    className="px-6 py-3 bg-emerald-accent hover:bg-emerald-500 text-black font-extrabold uppercase text-xs tracking-wider rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {updatingMeta ? 'Saving Settings...' : 'Save Meta Settings'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TICKER TAB */}
          {activeTab === 'ticker' && (
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
                      isTickerEnabled ? 'bg-emerald-500' : 'bg-slate-800'
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
                  placeholder="e.g. 📢 Welcome to the FIFA World Cup 2026 Live Streaming Portal! Enjoy HD streams! 📢"
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
          )}

          {/* TELEMETRY OFFSETS TAB */}
          {activeTab === 'offsets' && (
            <div className="glass-panel p-6 rounded-2xl border border-card-border space-y-4">
              <div>
                <h3 className="text-lg font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Sliders className="h-5 w-5 text-emerald-accent" />
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
                  <p className="text-[10px] text-slate-500 font-medium">This number will be added to the live views calculation</p>
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
                  <p className="text-[10px] text-slate-500 font-medium">This number will be added to active concurrent viewers</p>
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
          )}

          {/* STREAM CONFIG TAB */}
          {activeTab === 'streams' && (
            <div className="glass-panel p-6 rounded-2xl border border-card-border space-y-4">
              <div>
                <h3 className="text-lg font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Tv className="h-5 w-5 text-emerald-accent" />
                  Default m3u8 Stream Links
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Configure default streaming fallbacks. Drag-and-drop or use the arrows to set their priority list order.
                </p>
              </div>

              <div className="flex justify-between items-center p-4 bg-slate-950/40 border border-slate-900 rounded-xl">
                <div>
                  <span className="text-xs font-extrabold text-white uppercase tracking-wider block">🔗 Auto-Populate Streams</span>
                  <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
                    Automatically link 'Default m3u8 Stream Links' when creating auto-scheduled matches.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleToggleAutoPopulateDefaultStreams}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    autoPopulateDefaultStreams ? 'bg-emerald-500' : 'bg-slate-800'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      autoPopulateDefaultStreams ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
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
                      <p className="text-xs text-slate-500 font-medium">No default links configured yet.</p>
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
                        <div className="flex flex-col items-center justify-center text-slate-600 px-1 select-none">
                          <span className="text-[10px] font-black text-slate-500 mb-0.5">#{idx + 1}</span>
                          <span className="text-[9px]">☰</span>
                        </div>

                        <input
                          type="text"
                          required
                          value={item.label}
                          onChange={(e) => {
                            const list = [...defaultStreams];
                            list[idx].label = e.target.value;
                            setDefaultStreams(list);
                          }}
                          onBlur={() => saveAndSyncDefaultStreams(defaultStreams)}
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
                          onBlur={() => saveAndSyncDefaultStreams(defaultStreams)}
                          placeholder="M3U8 Streaming URL"
                          className="flex-1 px-3 py-2 glass-input rounded-xl text-xs"
                        />

                        <div className="flex items-center gap-1.5 shrink-0">
                          <input
                            type="number"
                            min="1"
                            max={defaultStreams.length}
                            value={idx + 1}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              if (!isNaN(val) && val >= 1 && val <= defaultStreams.length) {
                                const targetIdx = val - 1;
                                if (targetIdx !== idx) {
                                  const list = [...defaultStreams];
                                  const [selected] = list.splice(idx, 1);
                                  list.splice(targetIdx, 0, selected);
                                  setDefaultStreams(list);
                                  saveAndSyncDefaultStreams(list);
                                }
                              }
                            }}
                            className="w-12 px-1 py-1.5 text-center bg-slate-950 border border-slate-900 rounded-lg text-xs text-white font-extrabold focus:outline-none focus:border-slate-850"
                            title="Set Priority Number"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (idx === 0) return;
                              const list = [...defaultStreams];
                              const [selected] = list.splice(idx, 1);
                              list.unshift(selected);
                              setDefaultStreams(list);
                              saveAndSyncDefaultStreams(list);
                            }}
                            className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                              idx === 0
                                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                                : 'bg-slate-950 border-slate-900 text-slate-500 hover:text-amber-400 hover:border-amber-500/20'
                            }`}
                            title={idx === 0 ? "Active Top Server" : "Set as Top Server (Move to top)"}
                          >
                            <Star className="h-3.5 w-3.5" fill={idx === 0 ? "currentColor" : "none"} />
                          </button>
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
                            onClick={() => deleteStreamItem(idx)}
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
          )}

          {/* APP UI TEXTS TAB */}
          {activeTab === 'apptexts' && (
            <div className="glass-panel p-6 rounded-2xl border border-card-border space-y-6">
              <div>
                <h3 className="text-lg font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <MessageSquareCode className="h-5 w-5 text-emerald-accent" />
                  Website App UI Dynamic Texts
                </h3>
                <p className="text-xs text-slate-400 mt-1">Configure all main placeholder messages, subtitles, and labels shown on the user-facing site.</p>
              </div>

              <form onSubmit={handleAppTextsSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* General Header Subtitle and Ticker Badge */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-black text-white uppercase tracking-widest border-b border-card-border pb-1.5">1. Header & Marquee Titles</h4>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Header Bar Subtitle</label>
                      <input
                        type="text"
                        required
                        value={headerSubtitle}
                        onChange={(e) => setHeaderSubtitle(e.target.value)}
                        placeholder="e.g. Premium Streaming Portal"
                        className="w-full px-4 py-3 glass-input rounded-xl text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">News Ticker Prefix/Badge</label>
                      <input
                        type="text"
                        required
                        value={tickerBadge}
                        onChange={(e) => setTickerBadge(e.target.value)}
                        placeholder="e.g. ⚡ NEWS TICKER"
                        className="w-full px-4 py-3 glass-input rounded-xl text-sm"
                      />
                    </div>
                  </div>

                  {/* Fixtures Tab Labels */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-black text-white uppercase tracking-widest border-b border-card-border pb-1.5">2. Match Tab Labels</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Live Now Tab</label>
                        <input
                          type="text"
                          required
                          value={tabLiveName}
                          onChange={(e) => setTabLiveName(e.target.value)}
                          className="w-full px-3 py-2.5 glass-input rounded-xl text-xs"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Upcoming Tab</label>
                        <input
                          type="text"
                          required
                          value={tabUpcomingName}
                          onChange={(e) => setTabUpcomingName(e.target.value)}
                          className="w-full px-3 py-2.5 glass-input rounded-xl text-xs"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Finished Tab</label>
                        <input
                          type="text"
                          required
                          value={tabFinishedName}
                          onChange={(e) => setTabFinishedName(e.target.value)}
                          className="w-full px-3 py-2.5 glass-input rounded-xl text-xs"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Channels Tab</label>
                        <input
                          type="text"
                          required
                          value={tabChannelsName}
                          onChange={(e) => setTabChannelsName(e.target.value)}
                          className="w-full px-3 py-2.5 glass-input rounded-xl text-xs"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-card-border pt-6">
                  {/* Empty Match Placeholders */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-black text-white uppercase tracking-widest border-b border-card-border pb-1.5">3. Empty Matches Placeholder (Home)</h4>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Empty Matches Title</label>
                      <input
                        type="text"
                        required
                        value={noMatchesTitle}
                        onChange={(e) => setNoMatchesTitle(e.target.value)}
                        className="w-full px-4 py-3 glass-input rounded-xl text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Empty Matches Description</label>
                      <textarea
                        rows={3}
                        required
                        value={noMatchesDesc}
                        onChange={(e) => setNoMatchesDesc(e.target.value)}
                        className="w-full px-4 py-3 glass-input rounded-xl text-sm resize-none"
                      />
                    </div>
                  </div>

                  {/* Empty Stream Placeholders */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-black text-white uppercase tracking-widest border-b border-card-border pb-1.5">4. Empty Streams Placeholder (Watch Page)</h4>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Empty Streams Title</label>
                      <input
                        type="text"
                        required
                        value={noStreamsTitle}
                        onChange={(e) => setNoStreamsTitle(e.target.value)}
                        className="w-full px-4 py-3 glass-input rounded-xl text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Empty Streams Description</label>
                      <textarea
                        rows={3}
                        required
                        value={noStreamsDesc}
                        onChange={(e) => setNoStreamsDesc(e.target.value)}
                        className="w-full px-4 py-3 glass-input rounded-xl text-sm resize-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Form Footer */}
                <div className="flex justify-between items-center border-t border-card-border pt-4">
                  {appTextsSuccess ? (
                    <p className="text-xs text-emerald-accent font-bold animate-pulse">✓ All UI texts saved successfully!</p>
                  ) : <div />}
                  <button
                    type="submit"
                    disabled={updatingAppTexts}
                    className="px-6 py-3 bg-emerald-accent hover:bg-emerald-500 text-black font-extrabold uppercase text-xs tracking-wider rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {updatingAppTexts ? 'Saving...' : 'Save App UI Texts'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
