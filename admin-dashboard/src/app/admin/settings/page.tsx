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
  Star,
  Shield,
  ChevronDown,
  ChevronUp,
  X,
  Trash2
} from 'lucide-react';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'branding' | 'seo' | 'ticker' | 'offsets' | 'streams' | 'apptexts' | 'api'>('branding');

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

  // Auto-Sync API States
  const [autoFetchFootball, setAutoFetchFootball] = useState(false);
  const [autoFetchFootballAll, setAutoFetchFootballAll] = useState(false);
  const [autoFetchCricket, setAutoFetchCricket] = useState(false);
  const [updatingAutoFetch, setUpdatingAutoFetch] = useState(false);
  const [autoFetchSuccess, setAutoFetchSuccess] = useState(false);

  // Site Identity States
  const [siteName, setSiteName] = useState('WORLD CUP 2026');
  const [siteLogoUrl, setSiteLogoUrl] = useState('');
  const [siteLogoFile, setSiteLogoFile] = useState<File | null>(null);
  const [logoPct, setLogoPct] = useState(100);
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

  interface DefaultStreamUrl {
    label: string;
    url: string;
    use_proxy?: boolean;
    proxy_headers?: Record<string, string>;
  }

  interface StreamPreset {
    id: string;
    name: string;
    is_active: boolean;
    streams: DefaultStreamUrl[];
  }

  // Default Streams States
  const [defaultStreams, setDefaultStreams] = useState<DefaultStreamUrl[]>([]);
  const [updatingDefaultStreams, setUpdatingDefaultStreams] = useState(false);
  const [defaultStreamsSuccess, setDefaultStreamsSuccess] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [expandedProxyIndex, setExpandedProxyIndex] = useState<number | null>(null);

  // Stream Presets States
  const [streamPresets, setStreamPresets] = useState<StreamPreset[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const [editingPresetName, setEditingPresetName] = useState<string>('');

  // SystemConfig States for Auto-Populate Toggle
  const [systemConfigId, setSystemConfigId] = useState<string | null>(null);
  const [systemConfigData, setSystemConfigData] = useState<any>(null);
  const [autoPopulateDefaultStreams, setAutoPopulateDefaultStreams] = useState(true);
  const [forceAllLive, setForceAllLive] = useState(false);
  const [autoScheduleEnabled, setAutoScheduleEnabled] = useState(false);

  // Hero Carousel States
  interface HeroSlide {
    id: string;
    name: string;
    image_url: string;
    match_id: string | null;
  }
  const [heroCarouselEnabled, setHeroCarouselEnabled] = useState(false);
  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>([]);
  const [savingHeroCarousel, setSavingHeroCarousel] = useState(false);
  const [heroCarouselSuccess, setHeroCarouselSuccess] = useState(false);
  // Fetch matches list for slide countdown linking
  const { data: matchesList = [] } = useQuery<any[]>({
    queryKey: ['settings-matches-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('matches')
        .select(`
          id,
          match_date,
          match_time,
          tournament_name,
          home_team:teams!matches_home_team_id_fkey(name),
          away_team:teams!matches_away_team_id_fkey(name),
          home_team_custom_name,
          away_team_custom_name
        `)
        .order('match_timestamp', { ascending: true });
      if (error) throw error;
      return data || [];
    }
  });
  // YouTube Live Stream States
  const [youtubeLiveEnabled, setYoutubeLiveEnabled] = useState(false);
  const [youtubeLiveUrl, setYoutubeLiveUrl] = useState('');
  const [youtubeLiveLabel, setYoutubeLiveLabel] = useState('robeeee');
  const [updatingYoutubeLive, setUpdatingYoutubeLive] = useState(false);
  const [youtubeLiveSuccess, setYoutubeLiveSuccess] = useState(false);

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
  const [tabStreamingName, setTabStreamingName] = useState('📺 Streaming Now');
  const [tabLiveName, setTabLiveName] = useState('🔴 Live Now');
  const [tabUpcomingName, setTabUpcomingName] = useState('📅 Upcoming Fixtures');
  const [tabFinishedName, setTabFinishedName] = useState('🏁 Finished Matches');
  const [tabChannelsName, setTabChannelsName] = useState('📺 Live Channels');
  const [enableStreamingNow, setEnableStreamingNow] = useState(true);
  const [enableLiveTabAutoSwitch, setEnableLiveTabAutoSwitch] = useState(true);
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
      const logoUrl = tickerData.logo_url || '';
      setSiteLogoUrl(logoUrl);
      try {
        const url = new URL(logoUrl);
        const pct = url.searchParams.get('logo_pct');
        setLogoPct(pct ? parseInt(pct, 10) : 100);
      } catch {
        const match = logoUrl.match(/[?&]logo_pct=(\d+)/);
        setLogoPct(match ? parseInt(match[1], 10) : 100);
      }
      setSiteBannerUrl(tickerData.banner_url || '');
      setShowCounters(tickerData.show_counters !== false);
      setViewsOffset(tickerData.views_offset || 0);
      setViewersOffset(tickerData.viewers_offset || 0);
      const rawStreams = (tickerData as any).default_streams;
      if (rawStreams && typeof rawStreams === 'object' && Array.isArray(rawStreams.presets)) {
        setStreamPresets(rawStreams.presets);
        const active = rawStreams.presets.find((p: any) => p.is_active);
        const activeId = active?.id || rawStreams.presets[0]?.id || null;
        setSelectedPresetId(activeId);
        if (activeId) {
          setDefaultStreams(rawStreams.presets.find((p: any) => p.id === activeId)?.streams || []);
        } else {
          setDefaultStreams([]);
        }
      } else if (Array.isArray(rawStreams)) {
        const defaultPreset = {
          id: 'preset-1',
          name: 'Default 1',
          is_active: true,
          streams: rawStreams
        };
        setStreamPresets([defaultPreset]);
        setSelectedPresetId('preset-1');
        setDefaultStreams(rawStreams);
      } else {
        const defaultPreset = {
          id: 'preset-1',
          name: 'Default 1',
          is_active: true,
          streams: []
        };
        setStreamPresets([defaultPreset]);
        setSelectedPresetId('preset-1');
        setDefaultStreams([]);
      }
      setAutoFetchFootball(tickerData.auto_fetch_football || false);
      setAutoFetchFootballAll(tickerData.auto_fetch_football_all || false);
      setAutoFetchCricket(tickerData.auto_fetch_cricket || false);
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
        setYoutubeLiveEnabled(!!data.custom_scripts?.youtube_live_enabled);
        setYoutubeLiveUrl(data.custom_scripts?.youtube_live_url || '');
        setYoutubeLiveLabel(data.custom_scripts?.youtube_live_label || 'robeeee');
        setEnableStreamingNow(data.custom_scripts?.enable_streaming_now !== false);
        setEnableLiveTabAutoSwitch(data.custom_scripts?.enable_live_tab_auto_switch !== false);
        
        const uiTexts = data.custom_scripts?.app_ui_texts;
        if (uiTexts) {
          setTickerBadge(uiTexts.ticker_badge || '⚡ NEWS TICKER');
          setHeaderSubtitle(uiTexts.header_subtitle || 'Premium Streaming Portal');
          setTabStreamingName(uiTexts.tab_streaming_name || '📺 Streaming Now');
          setTabLiveName(uiTexts.tab_live_name || '🔴 Live Now');
          setTabUpcomingName(uiTexts.tab_upcoming_name || '📅 Upcoming Fixtures');
          setTabFinishedName(uiTexts.tab_finished_name || '🏁 Finished Matches');
          setTabChannelsName(uiTexts.tab_channels_name || '📺 Live Channels');
          setNoMatchesTitle(uiTexts.no_matches_title || 'NO MATCHES BROADCASTS');
          setNoMatchesDesc(uiTexts.no_matches_desc || 'There are no active matches in this tab. Tune in during kickoff schedules.');
          setNoStreamsTitle(uiTexts.no_streams_title || 'No Streams Configured');
          setNoStreamsDesc(uiTexts.no_streams_desc || 'There are no active video links bound to this match yet. Check back closer to game kickoff.');
        }
        setHeroCarouselEnabled(!!data.custom_scripts?.hero_carousel?.enabled);
        setHeroSlides(data.custom_scripts?.hero_carousel?.slides || []);
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

  // Submit YouTube Live Stream Settings
  const handleYoutubeLiveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdatingYoutubeLive(true);
    setYoutubeLiveSuccess(false);
    try {
      const existingScripts = systemConfigData?.custom_scripts || {};
      const updatedScripts = {
        ...existingScripts,
        youtube_live_enabled: youtubeLiveEnabled,
        youtube_live_url: youtubeLiveUrl,
        youtube_live_label: youtubeLiveLabel || 'robeeee'
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
        const { data: created, error } = await supabase
          .from('ad_networks')
          .insert([{
            network_name: 'SystemConfig',
            is_enabled: true,
            custom_scripts: updatedScripts
          }])
          .select()
          .single();
        if (error) throw error;
        if (created) setSystemConfigId(created.id);
      }
      setYoutubeLiveSuccess(true);
      await fetchSystemConfig();
      setTimeout(() => setYoutubeLiveSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      alert('Failed to save YouTube stream settings.');
    } finally {
      setUpdatingYoutubeLive(false);
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

  // Submit Auto-Fetch API Settings
  const handleAutoFetchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdatingAutoFetch(true);
    setAutoFetchSuccess(false);
    try {
      const updateData = { 
        auto_fetch_football: autoFetchFootball,
        auto_fetch_football_all: autoFetchFootballAll,
        auto_fetch_cricket: autoFetchCricket,
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
      setAutoFetchSuccess(true);
      refetchTicker();
      setTimeout(() => setAutoFetchSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      alert('Failed to update Auto-Fetch settings');
    } finally {
      setUpdatingAutoFetch(false);
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

  // Default stream priorities presets syncing
  const saveAndSyncDefaultStreams = async (updatedStreams: DefaultStreamUrl[], presetsToSave?: StreamPreset[]) => {
    try {
      const filteredStreams = updatedStreams.filter(item => item.label.trim() && item.url.trim());
      const presetsList = presetsToSave || streamPresets.map(p => 
        p.id === selectedPresetId ? { ...p, streams: filteredStreams } : p
      );

      const updateData = {
        default_streams: { presets: presetsList },
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

      // Sync active preset's streams to all matches
      const activePreset = presetsList.find(p => p.is_active) || presetsList[0];
      const activeStreams = activePreset?.streams?.filter(item => item.label.trim() && item.url.trim()) || [];

      const { data: allStreams, error: fetchErr } = await supabase
        .from('streams')
        .select('id');

      if (!fetchErr && allStreams && allStreams.length > 0) {
        const updatePromises = allStreams.map(s => {
          return supabase
            .from('streams')
            .update({
              primary_url: activeStreams[0]?.url || '',
              backup_url_1: activeStreams[1]?.url || null,
              backup_url_2: activeStreams[2]?.url || null,
              backup_url_3: activeStreams[3]?.url || null,
              urls: activeStreams
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

  // Helper to update streams for the currently selected preset in state
  const handleUpdateStreams = (newStreams: DefaultStreamUrl[]) => {
    setDefaultStreams(newStreams);
    setStreamPresets(prev => prev.map(p => p.id === selectedPresetId ? { ...p, streams: newStreams } : p));
  };

  const handleAddPreset = () => {
    const newId = `preset-${Date.now()}`;
    const newPreset: StreamPreset = {
      id: newId,
      name: `Preset ${streamPresets.length + 1}`,
      is_active: streamPresets.length === 0,
      streams: []
    };
    const updated = [...streamPresets, newPreset];
    setStreamPresets(updated);
    setSelectedPresetId(newId);
    setDefaultStreams([]);
    saveAndSyncDefaultStreams([], updated);
  };

  const handleRenamePreset = (id: string, newName: string) => {
    if (!newName.trim()) return;
    const updated = streamPresets.map(p => p.id === id ? { ...p, name: newName } : p);
    setStreamPresets(updated);
    saveAndSyncDefaultStreams(id === selectedPresetId ? defaultStreams : (streamPresets.find(p => p.id === id)?.streams || []), updated);
  };

  const handleDeletePreset = (id: string) => {
    if (streamPresets.length <= 1) {
      alert("You must keep at least one preset.");
      return;
    }
    const targetPreset = streamPresets.find(p => p.id === id);
    const updated = streamPresets.filter(p => p.id !== id);
    
    // If the deleted preset was active, make the first remaining one active
    if (targetPreset?.is_active) {
      updated[0].is_active = true;
    }
    
    setStreamPresets(updated);
    
    let activeStreams = defaultStreams;
    // If selected was deleted, change selection
    if (selectedPresetId === id) {
      const nextId = updated[0].id;
      setSelectedPresetId(nextId);
      activeStreams = updated[0].streams || [];
      setDefaultStreams(activeStreams);
    }
    saveAndSyncDefaultStreams(activeStreams, updated);
  };

  const handleTogglePresetActive = (id: string) => {
    const updated = streamPresets.map(p => ({
      ...p,
      is_active: p.id === id
    }));
    setStreamPresets(updated);
    
    const activePreset = updated.find(p => p.id === id);
    let activeStreams = defaultStreams;
    if (selectedPresetId === id) {
      activeStreams = activePreset?.streams || [];
      setDefaultStreams(activeStreams);
    } else {
      activeStreams = streamPresets.find(p => p.id === selectedPresetId)?.streams || [];
    }
    saveAndSyncDefaultStreams(activeStreams, updated);
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
      if (finalLogoUrl) {
        try {
          const url = new URL(finalLogoUrl);
          url.searchParams.set('logo_pct', logoPct.toString());
          finalLogoUrl = url.toString();
        } catch {
          const base = finalLogoUrl.split('?')[0];
          finalLogoUrl = `${base}?logo_pct=${logoPct}`;
        }
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
  const saveHeroCarousel = async (newSlides?: HeroSlide[], newEnabled?: boolean) => {
    setSavingHeroCarousel(true);
    setHeroCarouselSuccess(false);
    try {
      const activeSlides = newSlides !== undefined ? newSlides : heroSlides;
      const isEnabled = newEnabled !== undefined ? newEnabled : heroCarouselEnabled;
      
      const existingScripts = systemConfigData?.custom_scripts || {};
      const updatedScripts = {
        ...existingScripts,
        hero_carousel: {
          enabled: isEnabled,
          slides: activeSlides
        }
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
      setHeroCarouselSuccess(true);
      setTimeout(() => setHeroCarouselSuccess(false), 3000);
      await fetchSystemConfig();
    } catch (err) {
      console.error('Failed to save Hero Carousel settings:', err);
    } finally {
      setSavingHeroCarousel(false);
    }
  };

  const handleHeroSlideUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_hero_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `hero/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('teams')
        .upload(filePath, file);
        
      if (uploadError) throw uploadError;
      
      const { data } = supabase.storage.from('teams').getPublicUrl(filePath);
      const publicUrl = data.publicUrl;
      
      const newSlide: HeroSlide = {
        id: `slide-${Date.now()}`,
        name: `Slide ${heroSlides.length + 1}`,
        image_url: publicUrl,
        match_id: null
      };
      
      const updated = [...heroSlides, newSlide];
      setHeroSlides(updated);
      await saveHeroCarousel(updated);
    } catch (err) {
      console.error('Failed to upload slide image:', err);
      alert('Failed to upload slide image');
    }
  };

  const handleDeleteHeroSlide = async (id: string) => {
    if (!confirm('Are you sure you want to delete this slide?')) return;
    const updated = heroSlides.filter(s => s.id !== id);
    setHeroSlides(updated);
    await saveHeroCarousel(updated);
  };

  const handleUpdateHeroSlide = async (id: string, updates: Partial<HeroSlide>) => {
    const updated = heroSlides.map(s => s.id === id ? { ...s, ...updates } : s);
    setHeroSlides(updated);
  };

  const handleToggleHeroCarousel = async () => {
    const nextVal = !heroCarouselEnabled;
    setHeroCarouselEnabled(nextVal);
    await saveHeroCarousel(undefined, nextVal);
  };

  const moveHeroSlide = async (index: number, direction: 'up' | 'down') => {
    const list = [...heroSlides];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= list.length) return;
    const temp = list[index];
    list[index] = list[newIndex];
    list[newIndex] = temp;
    setHeroSlides(list);
    await saveHeroCarousel(list);
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
        tab_streaming_name: tabStreamingName,
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
              enable_streaming_now: enableStreamingNow,
              enable_live_tab_auto_switch: enableLiveTabAutoSwitch,
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
              enable_streaming_now: enableStreamingNow,
              enable_live_tab_auto_switch: enableLiveTabAutoSwitch,
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
                      <div className="sm:col-span-2 space-y-3">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Custom Logo URL</label>
                          <input
                            type="text"
                            value={siteLogoUrl}
                            onChange={(e) => {
                              const val = e.target.value;
                              setSiteLogoUrl(val);
                              setSiteLogoFile(null);
                              const match = val.match(/[?&]logo_pct=(\d+)/);
                              if (match) {
                                setLogoPct(parseInt(match[1], 10));
                              }
                            }}
                            placeholder="https://example.com/logo.png"
                            className="w-full px-4 py-3 glass-input rounded-xl text-sm"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Logo Size Scale ({logoPct}%)</label>
                          </div>
                          <input
                            type="range"
                            min="30"
                            max="250"
                            value={logoPct}
                            onChange={(e) => setLogoPct(parseInt(e.target.value, 10))}
                            className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                          />
                        </div>
                      </div>

                      <div className="flex flex-col items-center justify-end gap-2">
                        <span className="text-[10px] text-slate-500 font-bold uppercase">Real-Time Preview</span>
                        <div className="h-20 w-36 bg-slate-950/60 border border-slate-900 rounded-xl flex items-center justify-center overflow-hidden shrink-0">
                          {siteLogoFile ? (
                            <img
                              src={URL.createObjectURL(siteLogoFile)}
                              alt="Preview"
                              className="h-full w-full object-contain p-1 transition-all duration-75"
                              style={{ transform: `scale(${logoPct / 100})` }}
                            />
                          ) : siteLogoUrl ? (
                            <img
                              src={siteLogoUrl}
                              alt="Site Logo"
                              className="h-full w-full object-contain p-1 transition-all duration-75"
                              style={{ transform: `scale(${logoPct / 100})` }}
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
                {/* Hero Carousel Settings */}
                <div className="border-t border-card-border pt-6 mt-6 space-y-4">
                  <div className="flex justify-between items-center p-4 bg-slate-950/60 border border-slate-900 rounded-2xl">
                    <div>
                      <span className="text-sm font-bold text-white uppercase tracking-wider block">🎠 Homepage Hero Carousel</span>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Toggle carousel slideshow on the homepage with custom images and countdown timers.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleToggleHeroCarousel}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        heroCarouselEnabled ? 'bg-emerald-500' : 'bg-slate-800'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          heroCarouselEnabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {heroCarouselEnabled && (
                    <div className="p-4 bg-slate-950/40 border border-slate-900 rounded-2xl space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Slide Images List ({heroSlides.length})</span>
                        <label className="px-3 py-1.5 bg-emerald-accent hover:bg-emerald-500 text-black text-[10px] font-black uppercase rounded-lg transition-colors cursor-pointer flex items-center gap-1">
                          <Upload className="h-3 w-3" /> Upload New Slide
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleHeroSlideUpload}
                            className="hidden"
                          />
                        </label>
                      </div>

                      <div className="space-y-3">
                        {heroSlides.length === 0 ? (
                          <div className="text-center py-8 border border-dashed border-slate-800 rounded-xl">
                            <p className="text-xs text-slate-500 font-medium">No slides uploaded yet. Upload an image to start.</p>
                          </div>
                        ) : (
                          heroSlides.map((slide, idx) => (
                            <div
                              key={slide.id}
                              className="flex flex-col sm:flex-row gap-3 p-3 bg-slate-950/60 border border-slate-900 rounded-xl items-start sm:items-center"
                            >
                              {/* Slide Thumbnail */}
                              <div className="h-16 w-28 bg-slate-900 rounded-lg overflow-hidden shrink-0 border border-slate-800">
                                <img
                                  src={slide.image_url}
                                  alt="Slide Thumbnail"
                                  className="h-full w-full object-cover"
                                />
                              </div>

                              {/* Slide Info inputs */}
                              <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-1">
                                  <label className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider block">Slide Title</label>
                                  <input
                                    type="text"
                                    value={slide.name}
                                    onChange={(e) => handleUpdateHeroSlide(slide.id, { name: e.target.value })}
                                    onBlur={() => saveHeroCarousel()}
                                    placeholder="Enter slide title"
                                    className="w-full px-3 py-2 bg-slate-950 border border-slate-900 rounded-lg text-xs text-white focus:outline-none focus:border-slate-700"
                                  />
                                </div>

                                <div className="space-y-1">
                                  <label className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider block">Link Match (For Countdown)</label>
                                  <select
                                    value={slide.match_id || ''}
                                    onChange={(e) => {
                                      const matchId = e.target.value || null;
                                      handleUpdateHeroSlide(slide.id, { match_id: matchId });
                                      const updated = heroSlides.map(s => s.id === slide.id ? { ...s, match_id: matchId } : s);
                                      saveHeroCarousel(updated);
                                    }}
                                    className="w-full px-3 py-2 bg-slate-950 border border-slate-900 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-slate-700"
                                  >
                                    <option value="">No Match Linked (Static Slide)</option>
                                    {matchesList.map((m) => {
                                      const home = m.home_team?.name || m.home_team_custom_name || 'TBD';
                                      const away = m.away_team?.name || m.away_team_custom_name || 'TBD';
                                      return (
                                        <option key={m.id} value={m.id}>
                                          {home} vs {away} ({m.match_date} {m.match_time.substring(0, 5)})
                                        </option>
                                      );
                                    })}
                                  </select>
                                </div>
                              </div>

                              {/* Slide Reorder / Delete Actions */}
                              <div className="flex items-center gap-1.5 self-end sm:self-center">
                                <button
                                  type="button"
                                  disabled={idx === 0}
                                  onClick={() => moveHeroSlide(idx, 'up')}
                                  className="p-1.5 bg-slate-950 border border-slate-900 hover:border-slate-800 text-slate-400 rounded-lg disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                                  title="Move Up"
                                >
                                  ▲
                                </button>
                                <button
                                  type="button"
                                  disabled={idx === heroSlides.length - 1}
                                  onClick={() => moveHeroSlide(idx, 'down')}
                                  className="p-1.5 bg-slate-950 border border-slate-900 hover:border-slate-800 text-slate-400 rounded-lg disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                                  title="Move Down"
                                >
                                  ▼
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteHeroSlide(slide.id)}
                                  className="p-1.5 bg-slate-950 border border-slate-900 hover:border-red-500/25 hover:text-red-400 hover:bg-red-500/10 rounded-lg cursor-pointer ml-1"
                                  title="Delete Slide"
                                >
                                  ✕
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      {heroCarouselSuccess && (
                        <p className="text-[10px] text-emerald-accent font-bold animate-pulse">✓ Hero carousel settings saved automatically!</p>
                      )}
                    </div>
                  )}
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
            <>
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

                {/* Stream Presets Manager */}
                <div className="p-4 bg-slate-950/40 border border-slate-900 rounded-xl space-y-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-xs font-extrabold text-white uppercase tracking-wider block">📋 Preset Stream Playlists</span>
                      <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
                        Create multiple presets and select which one is active. Only the active preset will sync to matches.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddPreset}
                      className="px-3 py-1.5 bg-emerald-accent/10 hover:bg-emerald-accent/20 text-emerald-accent border border-emerald-500/25 text-[10px] font-black uppercase rounded-lg transition-colors cursor-pointer"
                    >
                      + Create Preset
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    {streamPresets.map(preset => {
                      const isSelected = selectedPresetId === preset.id;
                      const isActive = preset.is_active;
                      const isEditing = editingPresetId === preset.id;

                      return (
                        <div
                          key={preset.id}
                          className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${
                            isSelected
                              ? 'bg-slate-900 border-emerald-500/30'
                              : 'bg-slate-950/60 border-slate-900 hover:border-slate-800'
                          }`}
                        >
                          {/* Active Toggle (Radio-style Indicator) */}
                          <button
                            type="button"
                            onClick={() => handleTogglePresetActive(preset.id)}
                            className={`h-4 w-4 rounded-full flex items-center justify-center border transition-all ${
                              isActive
                                ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400'
                                : 'border-slate-700 bg-slate-950 text-slate-500 hover:border-slate-600'
                            }`}
                            title={isActive ? 'Active Preset' : 'Set as Active'}
                          >
                            {isActive && <span className="h-2 w-2 rounded-full bg-emerald-400" />}
                          </button>

                          {/* Preset Name / Inline Editor */}
                          {isEditing ? (
                            <input
                              type="text"
                              value={editingPresetName}
                              onChange={e => setEditingPresetName(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  handleRenamePreset(preset.id, editingPresetName);
                                  setEditingPresetId(null);
                                } else if (e.key === 'Escape') {
                                  setEditingPresetId(null);
                                }
                              }}
                              onBlur={() => {
                                handleRenamePreset(preset.id, editingPresetName);
                                setEditingPresetId(null);
                              }}
                              className="px-1.5 py-0.5 bg-slate-950 border border-slate-800 rounded text-xs text-white max-w-[120px] focus:outline-none focus:border-emerald-500"
                              autoFocus
                            />
                          ) : (
                            <span
                              onClick={() => {
                                setSelectedPresetId(preset.id);
                                setDefaultStreams(preset.streams || []);
                              }}
                              onDoubleClick={() => {
                                setEditingPresetId(preset.id);
                                setEditingPresetName(preset.name);
                              }}
                              className={`text-xs font-bold cursor-pointer select-none ${
                                isSelected ? 'text-white' : 'text-slate-400 hover:text-white'
                              }`}
                              title="Double click to rename"
                            >
                              {preset.name}
                            </span>
                          )}

                          {/* Edit / Delete Buttons */}
                          <div className="flex items-center gap-1 ml-1 border-l border-slate-900 pl-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingPresetId(preset.id);
                                setEditingPresetName(preset.name);
                              }}
                              className="text-[10px] text-slate-500 hover:text-white transition-colors"
                              title="Rename Preset"
                            >
                              ✏️
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeletePreset(preset.id)}
                              disabled={streamPresets.length <= 1}
                              className="text-[10px] text-slate-500 hover:text-red-400 disabled:opacity-30 disabled:hover:text-slate-500 transition-colors"
                              title="Delete Preset"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
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

                  <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                    {defaultStreams.length === 0 ? (
                      <div className="text-center py-6 border border-dashed border-card-border rounded-xl">
                        <p className="text-xs text-slate-500 font-medium">No default links configured yet.</p>
                      </div>
                    ) : (
                      defaultStreams.map((item, idx) => (
                        <div key={idx} className="space-y-2">
                          <div
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
                              <span className="text-[9px]">▲▼</span>
                            </div>

                            <input
                              type="text"
                              required
                              value={item.label}
                              onChange={(e) => {
                                const list = [...defaultStreams];
                                list[idx] = { ...list[idx], label: e.target.value };
                                setDefaultStreams(list);
                              }}
                              onBlur={() => saveAndSyncDefaultStreams(defaultStreams)}
                              placeholder="Label (e.g. Server 1)"
                              className="w-1/4 px-3 py-2 glass-input rounded-xl text-xs"
                            />
                            <input
                              type="url"
                              required
                              value={item.url}
                              onChange={(e) => {
                                const list = [...defaultStreams];
                                list[idx] = { ...list[idx], url: e.target.value };
                                setDefaultStreams(list);
                              }}
                              onBlur={() => saveAndSyncDefaultStreams(defaultStreams)}
                              placeholder="M3U8 Streaming URL"
                              className="flex-1 px-3 py-2 glass-input rounded-xl text-xs"
                            />

                            <div className="flex items-center gap-1.5 shrink-0">
                              {/* Proxy Toggle */}
                              <button
                                type="button"
                                onClick={() => {
                                  const list = [...defaultStreams];
                                  const wasProxy = !!list[idx].use_proxy;
                                  list[idx] = { ...list[idx], use_proxy: !wasProxy };
                                  
                                  if (!wasProxy) {
                                    // Auto-populate default headers based on the URL domain
                                    const urlVal = list[idx].url || '';
                                    let originVal = '';
                                    let refererVal = '';
                                    try {
                                      if (urlVal.startsWith('http://') || urlVal.startsWith('https://')) {
                                        const parsed = new URL(urlVal);
                                        originVal = parsed.origin;
                                        refererVal = parsed.origin + '/';
                                      }
                                    } catch (e) {
                                      // ignore invalid URL
                                    }

                                    const autoHeaders: Record<string, string> = {
                                      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
                                    };

                                    if (originVal) {
                                      autoHeaders['Origin'] = originVal;
                                      autoHeaders['Referer'] = refererVal;
                                    }

                                    list[idx] = {
                                      ...list[idx],
                                      proxy_headers: autoHeaders
                                    };
                                    setExpandedProxyIndex(idx);
                                  }
                                  
                                  setDefaultStreams(list);
                                  saveAndSyncDefaultStreams(list);
                                }}
                                className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                  item.use_proxy
                                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                                    : 'bg-slate-950 border-slate-900 text-slate-600 hover:text-slate-455 hover:border-slate-750'
                                }`}
                                title={item.use_proxy ? 'Proxy ENABLED — Click to disable' : 'Enable Reverse Proxy'}
                              >
                                <Shield className="h-3.5 w-3.5" fill={item.use_proxy ? 'currentColor' : 'none'} />
                              </button>

                              {/* Expand proxy headers config */}
                              {item.use_proxy && (
                                <button
                                  type="button"
                                  onClick={() => setExpandedProxyIndex(expandedProxyIndex === idx ? null : idx)}
                                  className="p-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 hover:bg-emerald-500/10 transition-all cursor-pointer"
                                  title="Configure Proxy Headers"
                                >
                                  {expandedProxyIndex === idx ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                                </button>
                              )}

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
                                      setExpandedProxyIndex(null);
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
                                  setExpandedProxyIndex(null);
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

                          {/* Expanded Proxy Headers Panel for Default Stream */}
                          {item.use_proxy && expandedProxyIndex === idx && (
                            <div className="ml-8 p-3 bg-slate-950/60 border border-emerald-500/15 rounded-xl space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Shield className="h-3.5 w-3.5 text-emerald-400" />
                                  <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider">Default Stream Proxy Headers</span>
                                </div>
                                <div className="flex gap-1.5 flex-wrap">
                                  {['Authorization', 'Referer', 'Cookie', 'Origin', 'User-Agent'].map((preset) => {
                                    const headers = item.proxy_headers || {};
                                    const alreadyAdded = Object.keys(headers).some(k => k.toLowerCase() === preset.toLowerCase());
                                    return (
                                      <button
                                        key={preset}
                                        type="button"
                                        disabled={alreadyAdded}
                                        onClick={() => {
                                          const list = [...defaultStreams];
                                          const currentHeaders = { ...(list[idx].proxy_headers || {}) };
                                          currentHeaders[preset] = '';
                                          list[idx] = { ...list[idx], proxy_headers: currentHeaders };
                                          setDefaultStreams(list);
                                          saveAndSyncDefaultStreams(list);
                                        }}
                                        className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded-md border transition-all cursor-pointer ${
                                          alreadyAdded
                                            ? 'bg-slate-800/30 border-slate-800/50 text-slate-600 cursor-not-allowed'
                                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-emerald-400 hover:border-emerald-500/20'
                                        }`}
                                      >
                                        + {preset}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>

                              <div className="space-y-2">
                                {Object.entries(item.proxy_headers || {}).map(([headerKey, headerValue], hIdx) => (
                                  <div key={hIdx} className="flex gap-2 items-center">
                                    <input
                                      type="text"
                                      value={headerKey}
                                      onChange={(e) => {
                                        const list = [...defaultStreams];
                                        const currentHeaders = { ...(list[idx].proxy_headers || {}) };
                                        const entries = Object.entries(currentHeaders);
                                        entries[hIdx] = [e.target.value, headerValue];
                                        const rebuilt: Record<string, string> = {};
                                        entries.forEach(([k, v]) => { rebuilt[k] = v; });
                                        list[idx] = { ...list[idx], proxy_headers: rebuilt };
                                        setDefaultStreams(list);
                                      }}
                                      onBlur={() => saveAndSyncDefaultStreams(defaultStreams)}
                                      placeholder="Header Name"
                                      className="w-1/3 px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-[11px] text-white font-bold placeholder-slate-655 focus:outline-none focus:border-slate-700"
                                    />
                                    <input
                                      type="text"
                                      value={headerValue}
                                      onChange={(e) => {
                                        const list = [...defaultStreams];
                                        const currentHeaders = { ...(list[idx].proxy_headers || {}) };
                                        currentHeaders[headerKey] = e.target.value;
                                        list[idx] = { ...list[idx], proxy_headers: currentHeaders };
                                        setDefaultStreams(list);
                                      }}
                                      onBlur={() => saveAndSyncDefaultStreams(defaultStreams)}
                                      placeholder="Header Value"
                                      className="flex-1 px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-[11px] text-white placeholder-slate-655 focus:outline-none focus:border-slate-700"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const list = [...defaultStreams];
                                        const currentHeaders = { ...(list[idx].proxy_headers || {}) };
                                        delete currentHeaders[headerKey];
                                        list[idx] = { ...list[idx], proxy_headers: currentHeaders };
                                        setDefaultStreams(list);
                                        saveAndSyncDefaultStreams(list);
                                      }}
                                      className="p-1.5 bg-slate-950 border border-slate-900 hover:border-red-500/25 hover:text-red-400 rounded-lg transition-all cursor-pointer"
                                    >
                                      <X className="h-3 w-3 text-slate-500" />
                                    </button>
                                  </div>
                                ))}

                                {Object.keys(item.proxy_headers || {}).length === 0 && (
                                  <p className="text-[10px] text-slate-500 italic py-1">No custom headers configured.</p>
                                )}

                                <button
                                  type="button"
                                  onClick={() => {
                                    const list = [...defaultStreams];
                                    const currentHeaders = { ...(list[idx].proxy_headers || {}) };
                                    const key = `X-Custom-Header-${Object.keys(currentHeaders).length + 1}`;
                                    currentHeaders[key] = '';
                                    list[idx] = { ...list[idx], proxy_headers: currentHeaders };
                                    setDefaultStreams(list);
                                    saveAndSyncDefaultStreams(list);
                                  }}
                                  className="w-full py-1.5 text-[10px] font-bold uppercase text-slate-500 hover:text-emerald-400 bg-slate-900/50 border border-dashed border-slate-800 hover:border-emerald-500/20 rounded-lg transition-all cursor-pointer"
                                >
                                  + Add Custom Header
                                </button>
                              </div>
                            </div>
                          )}
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

              {/* YouTube Stream Config Card */}
              <div className="glass-panel p-6 rounded-2xl border border-card-border space-y-4 mt-6">
                <div>
                  <h3 className="text-lg font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Tv className="h-5 w-5 text-emerald-accent" />
                    YouTube Live Stream Settings (Robeeee)
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Enable and configure a YouTube livestream option to show up among the match transmission channels.
                  </p>
                </div>

                <form onSubmit={handleYoutubeLiveSubmit} className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-slate-950/40 border border-slate-900 rounded-xl">
                    <div>
                      <span className="text-xs font-extrabold text-white uppercase tracking-wider block">🔗 Enable YouTube Livestream</span>
                      <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
                        Toggle this option to display/embed the YouTube livestream inside match stream lists.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setYoutubeLiveEnabled(!youtubeLiveEnabled)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        youtubeLiveEnabled ? 'bg-emerald-500' : 'bg-slate-800'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          youtubeLiveEnabled ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Button/Channel Label</label>
                      <input
                        type="text"
                        required
                        value={youtubeLiveLabel}
                        onChange={(e) => setYoutubeLiveLabel(e.target.value)}
                        placeholder="e.g. robeeee"
                        className="w-full px-4 py-3 glass-input rounded-xl text-sm"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">YouTube Livestream URL</label>
                      <input
                        type="url"
                        required
                        value={youtubeLiveUrl}
                        onChange={(e) => setYoutubeLiveUrl(e.target.value)}
                        placeholder="e.g. https://www.youtube.com/watch?v=DrUMQOrLgUA"
                        className="w-full px-4 py-3 glass-input rounded-xl text-sm"
                      />
                    </div>
                  </div>

                  <div className="flex justify-between items-center border-t border-card-border pt-4">
                    {youtubeLiveSuccess ? (
                      <p className="text-xs text-emerald-accent font-bold animate-pulse">✓ YouTube stream settings saved!</p>
                    ) : <div />}
                    <button
                      type="submit"
                      disabled={updatingYoutubeLive}
                      className="px-6 py-3 bg-emerald-accent hover:bg-emerald-500 text-black font-extrabold uppercase text-xs tracking-wider rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {updatingYoutubeLive ? 'Saving...' : 'Save YouTube Stream'}
                    </button>
                  </div>
                </form>
              </div>
            </>
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
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Streaming Tab</label>
                        <input
                          type="text"
                          required
                          value={tabStreamingName}
                          onChange={(e) => setTabStreamingName(e.target.value)}
                          className="w-full px-3 py-2.5 glass-input rounded-xl text-xs"
                        />
                      </div>
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

                {/* Streaming Now & Auto-Switch settings */}
                <div className="space-y-4 border-t border-card-border pt-6 mt-6">
                  <h4 className="text-xs font-black text-white uppercase tracking-widest border-b border-card-border pb-1.5">5. Streaming Now & Auto-Switch Settings</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Streaming Now Toggle */}
                    <div className="flex justify-between items-center p-4 bg-slate-950/40 border border-slate-900 rounded-xl">
                      <div>
                        <span className="text-xs font-extrabold text-white uppercase tracking-wider block">📺 Enable 'Streaming Now' Tab</span>
                        <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
                          Show the 'Streaming Now' player as the default landing tab on the homepage.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEnableStreamingNow(!enableStreamingNow)}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          enableStreamingNow ? 'bg-emerald-500' : 'bg-slate-800'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            enableStreamingNow ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Auto Switch Live Toggles */}
                    <div className="flex justify-between items-center p-4 bg-slate-950/40 border border-slate-900 rounded-xl">
                      <div>
                        <span className="text-xs font-extrabold text-white uppercase tracking-wider block">⚡ Auto-Switch to 'Live Now' Tab</span>
                        <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
                          Automatically switch the homepage tab to 'Live Now' 10 minutes before any match starts.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEnableLiveTabAutoSwitch(!enableLiveTabAutoSwitch)}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          enableLiveTabAutoSwitch ? 'bg-emerald-500' : 'bg-slate-800'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            enableLiveTabAutoSwitch ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
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
