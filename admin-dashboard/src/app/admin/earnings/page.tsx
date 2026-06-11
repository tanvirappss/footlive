'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import AdminLayout from '@/components/AdminLayout';
import { 
  Check, 
  Loader2, 
  DollarSign, 
  Power, 
  Layers, 
  Plus, 
  Trash2,
  AlertTriangle,
  X
} from 'lucide-react';

interface AdNetwork {
  id: string;
  network_name: string;
  is_enabled: boolean;
  verification_code: string | null;
  header_script: string | null;
  footer_script: string | null;
  banner_script: string | null;
  native_script: string | null;
  social_bar_script: string | null;
  popunder_script: string | null;
  custom_scripts: any | null;
}

export default function EarningsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'adsense' | 'adsterra' | 'custom'>('adsense');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);

  // Form states for AdSense
  const [adsenseEnabled, setAdsenseEnabled] = useState(false);
  const [adsenseVerify, setAdsenseVerify] = useState('');
  const [adsenseHeader, setAdsenseHeader] = useState('');
  const [adsenseFooter, setAdsenseFooter] = useState('');

  // Form states for Adsterra
  const [adsterraEnabled, setAdsterraEnabled] = useState(false);
  const [adsterraBanner, setAdsterraBanner] = useState('');
  const [adsterraNative, setAdsterraNative] = useState('');
  const [adsterraSocial, setAdsterraSocial] = useState('');
  const [adsterraPopunder, setAdsterraPopunder] = useState('');

  // Form states for Custom Networks
  const [customNetworks, setCustomNetworks] = useState<AdNetwork[]>([]);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [newNetworkName, setNewNetworkName] = useState('');
  const [newNetworkVerify, setNewNetworkVerify] = useState('');
  const [newNetworkHeader, setNewNetworkHeader] = useState('');
  const [newNetworkFooter, setNewNetworkFooter] = useState('');

  // Fetch Ad Configurations Query
  const { isLoading } = useQuery<AdNetwork[]>({
    queryKey: ['ad-networks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ad_networks')
        .select('*');
      
      if (error) throw error;
      
      const networks = data || [];
      
      // Populate states
      const adsense = networks.find(n => n.network_name === 'Google AdSense');
      if (adsense) {
        setAdsenseEnabled(adsense.is_enabled);
        setAdsenseVerify(adsense.verification_code || '');
        setAdsenseHeader(adsense.header_script || '');
        setAdsenseFooter(adsense.footer_script || '');
      }

      const adsterra = networks.find(n => n.network_name === 'Adsterra');
      if (adsterra) {
        setAdsterraEnabled(adsterra.is_enabled);
        setAdsterraBanner(adsterra.banner_script || '');
        setAdsterraNative(adsterra.native_script || '');
        setAdsterraSocial(adsterra.social_bar_script || '');
        setAdsterraPopunder(adsterra.popunder_script || '');
      }

      const customs = networks.filter(n => n.network_name !== 'Google AdSense' && n.network_name !== 'Adsterra');
      setCustomNetworks(customs);

      return networks;
    }
  });

  // Save AdSense / Adsterra Mutation
  const saveNetworkMutation = useMutation({
    mutationFn: async ({ name, data }: { name: string; data: Partial<AdNetwork> }) => {
      setSaving(true);
      setSaveSuccess(false);
      setMutationError(null);

      // Check if it exists, otherwise insert
      const { data: existing } = await supabase
        .from('ad_networks')
        .select('id')
        .eq('network_name', name)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('ad_networks')
          .update(data)
          .eq('network_name', name);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('ad_networks')
          .insert([{ network_name: name, ...data }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ad-networks'] });
      setSaving(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    },
    onError: (err: any) => {
      setMutationError(err.message);
      setSaving(false);
    }
  });

  // Custom Network Actions Mutation
  const createCustomMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('ad_networks')
        .insert([{
          network_name: newNetworkName,
          is_enabled: true,
          verification_code: newNetworkVerify || null,
          header_script: newNetworkHeader || null,
          footer_script: newNetworkFooter || null,
        }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ad-networks'] });
      setIsCustomModalOpen(false);
      setNewNetworkName('');
      setNewNetworkVerify('');
      setNewNetworkHeader('');
      setNewNetworkFooter('');
    }
  });

  const deleteNetworkMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ad_networks')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ad-networks'] });
    }
  });

  const toggleNetworkMutation = useMutation({
    mutationFn: async ({ id, isEnabled }: { id: string; isEnabled: boolean }) => {
      const { error } = await supabase
        .from('ad_networks')
        .update({ is_enabled: isEnabled })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ad-networks'] });
    }
  });

  const handleSaveAdsense = (e: React.FormEvent) => {
    e.preventDefault();
    saveNetworkMutation.mutate({
      name: 'Google AdSense',
      data: {
        is_enabled: adsenseEnabled,
        verification_code: adsenseVerify,
        header_script: adsenseHeader,
        footer_script: adsenseFooter
      }
    });
  };

  const handleSaveAdsterra = (e: React.FormEvent) => {
    e.preventDefault();
    saveNetworkMutation.mutate({
      name: 'Adsterra',
      data: {
        is_enabled: adsterraEnabled,
        banner_script: adsterraBanner,
        native_script: adsterraNative,
        social_bar_script: adsterraSocial,
        popunder_script: adsterraPopunder
      }
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-extrabold text-white uppercase tracking-tight">Earnings Config</h1>
            <p className="text-slate-400 text-sm mt-1">Manage advertising scripts and dynamic verification codes.</p>
          </div>
          <div className="h-10 w-10 bg-emerald-accent/15 border border-emerald-accent/25 rounded-xl flex items-center justify-center text-emerald-accent">
            <DollarSign className="h-6 w-6" />
          </div>
        </div>

        {/* Warning Banner */}
        <div className="p-4 bg-slate-900/40 border border-card-border rounded-2xl flex gap-3 text-slate-300 text-xs font-semibold">
          <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
          <div>
            <p className="font-bold text-white uppercase">Dynamic Scripts Injection</p>
            <p className="mt-0.5 text-slate-400 font-medium">Injecting banner, header, or native codes will deploy them instantly to users. Make sure your scripts do not contain syntax errors that could disrupt the mobile webview integration.</p>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-card-border">
          <button
            onClick={() => setActiveTab('adsense')}
            className={`px-6 py-3 font-bold uppercase text-xs tracking-wider border-b-2 transition-all cursor-pointer ${
              activeTab === 'adsense'
                ? 'border-emerald-accent text-emerald-accent'
                : 'border-transparent text-slate-500 hover:text-white'
            }`}
          >
            Google AdSense
          </button>
          <button
            onClick={() => setActiveTab('adsterra')}
            className={`px-6 py-3 font-bold uppercase text-xs tracking-wider border-b-2 transition-all cursor-pointer ${
              activeTab === 'adsterra'
                ? 'border-emerald-accent text-emerald-accent'
                : 'border-transparent text-slate-500 hover:text-white'
            }`}
          >
            Adsterra
          </button>
          <button
            onClick={() => setActiveTab('custom')}
            className={`px-6 py-3 font-bold uppercase text-xs tracking-wider border-b-2 transition-all cursor-pointer ${
              activeTab === 'custom'
                ? 'border-emerald-accent text-emerald-accent'
                : 'border-transparent text-slate-500 hover:text-white'
            }`}
          >
            Custom Networks
          </button>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <Loader2 className="h-8 w-8 text-emerald-accent animate-spin" />
            <p className="text-slate-400 text-sm mt-4">Fetching monetization scripts...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Save alerts */}
            {saveSuccess && (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-bold rounded-2xl flex items-center gap-2">
                <Check className="h-5 w-5" />
                Script configurations updated successfully! Changes applied instantly.
              </div>
            )}
            {mutationError && (
              <div className="p-4 bg-red-950/20 border border-red-500/25 text-red-400 text-sm font-bold rounded-2xl">
                {mutationError}
              </div>
            )}

            {/* Google AdSense Tab */}
            {activeTab === 'adsense' && (
              <form onSubmit={handleSaveAdsense} className="glass-panel p-8 rounded-3xl space-y-6">
                <div className="flex items-center justify-between border-b border-card-border pb-4">
                  <div>
                    <h3 className="text-lg font-bold text-white uppercase tracking-wider">Google AdSense Integration</h3>
                    <p className="text-xs text-slate-400">Configure global tags and validation scripts.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAdsenseEnabled(!adsenseEnabled)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl border font-bold uppercase text-[10px] tracking-wide transition-all cursor-pointer ${
                      adsenseEnabled
                        ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                        : 'border-slate-800 text-slate-500 hover:bg-slate-800'
                    }`}
                  >
                    <Power className="h-3.5 w-3.5" />
                    {adsenseEnabled ? 'Enabled' : 'Disabled'}
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Verification Code (Meta Tag)</label>
                    <textarea
                      rows={2}
                      value={adsenseVerify}
                      onChange={(e) => setAdsenseVerify(e.target.value)}
                      placeholder='<meta name="google-adsense-account" content="ca-pub-XXXXXXXXXXXXXXXX">'
                      className="w-full px-4 py-3 bg-slate-950/60 border border-slate-800 rounded-xl text-sm font-mono text-slate-300 placeholder:text-slate-700"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Header Insertion Script</label>
                    <textarea
                      rows={4}
                      value={adsenseHeader}
                      onChange={(e) => setAdsenseHeader(e.target.value)}
                      placeholder='<script async src="https://pagead2.googlesyndication.com/..."></script>'
                      className="w-full px-4 py-3 bg-slate-950/60 border border-slate-800 rounded-xl text-sm font-mono text-slate-300 placeholder:text-slate-700"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Footer Insertion Script</label>
                    <textarea
                      rows={4}
                      value={adsenseFooter}
                      onChange={(e) => setAdsenseFooter(e.target.value)}
                      placeholder="<!-- Adsense footer execution code -->"
                      className="w-full px-4 py-3 bg-slate-950/60 border border-slate-800 rounded-xl text-sm font-mono text-slate-300 placeholder:text-slate-700"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-3.5 bg-emerald-accent hover:bg-emerald-500 text-black font-extrabold uppercase text-xs tracking-wider rounded-xl transition-all duration-150 cursor-pointer disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    Save Config
                  </button>
                </div>
              </form>
            )}

            {/* Adsterra Tab */}
            {activeTab === 'adsterra' && (
              <form onSubmit={handleSaveAdsterra} className="glass-panel p-8 rounded-3xl space-y-6">
                <div className="flex items-center justify-between border-b border-card-border pb-4">
                  <div>
                    <h3 className="text-lg font-bold text-white uppercase tracking-wider">Adsterra Settings</h3>
                    <p className="text-xs text-slate-400">Manage banner scripts, popunder redirects, and social bars.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAdsterraEnabled(!adsterraEnabled)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl border font-bold uppercase text-[10px] tracking-wide transition-all cursor-pointer ${
                      adsterraEnabled
                        ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                        : 'border-slate-800 text-slate-500 hover:bg-slate-800'
                    }`}
                  >
                    <Power className="h-3.5 w-3.5" />
                    {adsterraEnabled ? 'Enabled' : 'Disabled'}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Banner Ad Script</label>
                    <textarea
                      rows={5}
                      value={adsterraBanner}
                      onChange={(e) => setAdsterraBanner(e.target.value)}
                      placeholder="<!-- Adsterra Banner Script -->"
                      className="w-full px-4 py-3 bg-slate-950/60 border border-slate-800 rounded-xl text-sm font-mono text-slate-300 placeholder:text-slate-700"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Native Banner Script</label>
                    <textarea
                      rows={5}
                      value={adsterraNative}
                      onChange={(e) => setAdsterraNative(e.target.value)}
                      placeholder="<!-- Adsterra Native Banner Script -->"
                      className="w-full px-4 py-3 bg-slate-950/60 border border-slate-800 rounded-xl text-sm font-mono text-slate-300 placeholder:text-slate-700"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Social Bar Script</label>
                    <textarea
                      rows={5}
                      value={adsterraSocial}
                      onChange={(e) => setAdsterraSocial(e.target.value)}
                      placeholder="<!-- Adsterra Social Bar Script -->"
                      className="w-full px-4 py-3 bg-slate-950/60 border border-slate-800 rounded-xl text-sm font-mono text-slate-300 placeholder:text-slate-700"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Popunder Script</label>
                    <textarea
                      rows={5}
                      value={adsterraPopunder}
                      onChange={(e) => setAdsterraPopunder(e.target.value)}
                      placeholder="<!-- Adsterra Popunder Script -->"
                      className="w-full px-4 py-3 bg-slate-950/60 border border-slate-800 rounded-xl text-sm font-mono text-slate-300 placeholder:text-slate-700"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-3.5 bg-emerald-accent hover:bg-emerald-500 text-black font-extrabold uppercase text-xs tracking-wider rounded-xl transition-all duration-150 cursor-pointer disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    Save Config
                  </button>
                </div>
              </form>
            )}

            {/* Custom Networks Tab */}
            {activeTab === 'custom' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center bg-slate-900/40 p-4 border border-card-border rounded-2xl">
                  <div>
                    <h3 className="font-bold text-white uppercase">Additional Ad Networks</h3>
                    <p className="text-xs text-slate-400">Configure secondary script systems.</p>
                  </div>
                  <button
                    onClick={() => setIsCustomModalOpen(true)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-accent hover:bg-emerald-500 text-black font-extrabold uppercase text-[10px] tracking-wide rounded-xl cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Custom Network
                  </button>
                </div>

                {customNetworks.length === 0 ? (
                  <div className="glass-panel p-12 text-center rounded-2xl border border-card-border">
                    <Layers className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-white uppercase">No Custom Networks</h3>
                    <p className="text-slate-400 text-sm mt-1">Monetization relies solely on Google AdSense and Adsterra unless you register custom networks.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {customNetworks.map((net) => (
                      <div 
                        key={net.id} 
                        className={`glass-panel p-6 rounded-2xl border flex flex-col justify-between gap-4 transition-all duration-200 ${
                          net.is_enabled ? 'border-card-border' : 'border-red-950/20 opacity-60'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-extrabold text-white text-base uppercase">{net.network_name}</h4>
                            <p className="text-slate-500 text-[10px] uppercase font-bold mt-0.5">Custom Ad Network</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => toggleNetworkMutation.mutate({ id: net.id, isEnabled: !net.is_enabled })}
                              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                                net.is_enabled 
                                  ? 'border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10' 
                                  : 'border-slate-800 text-slate-500 hover:bg-slate-800'
                              }`}
                            >
                              <Power className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Delete ${net.network_name}?`)) {
                                  deleteNetworkMutation.mutate(net.id);
                                }
                              }}
                              className="p-2 rounded-xl border border-slate-800 text-slate-400 hover:border-red-500/20 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        <div className="pt-2 text-[10px] font-bold text-slate-400 uppercase space-y-1">
                          <p>✓ Header Script: {net.header_script ? 'Configured' : 'Empty'}</p>
                          <p>✓ Footer Script: {net.footer_script ? 'Configured' : 'Empty'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Custom Network Dialog */}
        {isCustomModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-lg glass-panel p-8 rounded-3xl space-y-6">
              <div className="flex justify-between items-center pb-4 border-b border-card-border">
                <h3 className="text-xl font-extrabold text-white uppercase">Register Custom Ad Network</h3>
                <button 
                  onClick={() => setIsCustomModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); createCustomMutation.mutate(); }} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Network Name</label>
                  <input
                    type="text"
                    required
                    value={newNetworkName}
                    onChange={(e) => setNewNetworkName(e.target.value)}
                    placeholder="e.g. PropellerAds"
                    className="w-full px-4 py-3 glass-input rounded-xl text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Verification Tag (Optional)</label>
                  <textarea
                    rows={2}
                    value={newNetworkVerify}
                    onChange={(e) => setNewNetworkVerify(e.target.value)}
                    placeholder="<!-- verification code -->"
                    className="w-full px-4 py-3 bg-slate-950/60 border border-slate-800 rounded-xl text-sm font-mono text-slate-300 placeholder:text-slate-700"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Header Script</label>
                  <textarea
                    rows={3}
                    value={newNetworkHeader}
                    onChange={(e) => setNewNetworkHeader(e.target.value)}
                    placeholder="<!-- Header Script code -->"
                    className="w-full px-4 py-3 bg-slate-950/60 border border-slate-800 rounded-xl text-sm font-mono text-slate-300 placeholder:text-slate-700"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Footer Script</label>
                  <textarea
                    rows={3}
                    value={newNetworkFooter}
                    onChange={(e) => setNewNetworkFooter(e.target.value)}
                    placeholder="<!-- Footer Script code -->"
                    className="w-full px-4 py-3 bg-slate-950/60 border border-slate-800 rounded-xl text-sm font-mono text-slate-300 placeholder:text-slate-700"
                  />
                </div>

                <div className="pt-4 flex justify-end gap-3 border-t border-card-border">
                  <button
                    type="button"
                    onClick={() => setIsCustomModalOpen(false)}
                    className="px-5 py-3 border border-slate-800 hover:bg-slate-800 text-slate-300 font-bold uppercase text-xs tracking-wider rounded-xl transition-all duration-150 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3 bg-emerald-accent hover:bg-emerald-500 text-black font-extrabold uppercase text-xs tracking-wider rounded-xl transition-all duration-150 cursor-pointer"
                  >
                    Register Network
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
