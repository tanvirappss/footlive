'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import AdminLayout from '@/components/AdminLayout';
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  Check, 
  X, 
  Upload, 
  Loader2, 
  Globe,
  Power
} from 'lucide-react';

interface Team {
  id: string;
  name: string;
  short_name: string;
  country_name: string;
  country_code: string;
  flag_url: string;
  logo_url: string;
  region: string;
  is_enabled: boolean;
}

export default function TeamsPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [regionFilter, setRegionFilter] = useState('');
  
  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  
  // Form state
  const [name, setName] = useState('');
  const [shortName, setShortName] = useState('');
  const [countryName, setCountryName] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [region, setRegion] = useState('UEFA');
  const [flagFile, setFlagFile] = useState<File | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);

  // Fetch teams query
  const { data: teams = [], isLoading } = useQuery<Team[]>({
    queryKey: ['teams'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      return data || [];
    }
  });

  // Open modal for adding a new team
  const handleAddClick = () => {
    setEditingTeam(null);
    setName('');
    setShortName('');
    setCountryName('');
    setCountryCode('');
    setRegion('UEFA');
    setFlagFile(null);
    setLogoFile(null);
    setMutationError(null);
    setIsModalOpen(true);
  };

  // Open modal for editing a team
  const handleEditClick = (team: Team) => {
    setEditingTeam(team);
    setName(team.name);
    setShortName(team.short_name);
    setCountryName(team.country_name);
    setCountryCode(team.country_code);
    setRegion(team.region);
    setFlagFile(null);
    setLogoFile(null);
    setMutationError(null);
    setIsModalOpen(true);
  };

  // Upload file helper
  const uploadImage = async (file: File, type: 'flag' | 'logo'): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${type}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `assets/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('teams')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from('teams').getPublicUrl(filePath);
    return data.publicUrl;
  };

  // Create or Update mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      setUploading(true);
      let flagUrl = editingTeam?.flag_url || '';
      let logoUrl = editingTeam?.logo_url || '';

      if (flagFile) {
        flagUrl = await uploadImage(flagFile, 'flag');
      }
      if (logoFile) {
        logoUrl = await uploadImage(logoFile, 'logo');
      }

      const teamData = {
        name,
        short_name: shortName.toUpperCase(),
        country_name: countryName,
        country_code: countryCode.toUpperCase(),
        region,
        flag_url: flagUrl,
        logo_url: logoUrl || flagUrl, // Default logo to flag if empty
      };

      if (editingTeam) {
        // Update
        const { error } = await supabase
          .from('teams')
          .update(teamData)
          .eq('id', editingTeam.id);
        if (error) throw error;
      } else {
        // Create
        const { error } = await supabase
          .from('teams')
          .insert([teamData]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      setIsModalOpen(false);
      setUploading(false);
    },
    onError: (err: any) => {
      setMutationError(err.message);
      setUploading(false);
    }
  });

  // Toggle status mutation
  const toggleMutation = useMutation({
    mutationFn: async ({ id, isEnabled }: { id: string; isEnabled: boolean }) => {
      const { error } = await supabase
        .from('teams')
        .update({ is_enabled: isEnabled })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('teams')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate();
  };

  const filteredTeams = teams.filter((team) => {
    const matchesSearch = team.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          team.short_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          team.country_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRegion = regionFilter === '' || team.region === regionFilter;
    return matchesSearch && matchesRegion;
  });

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-white uppercase tracking-tight">Teams Directory</h1>
            <p className="text-slate-400 text-sm mt-1">Add, modify, or disable competing national teams.</p>
          </div>
          <button
            onClick={handleAddClick}
            className="flex items-center gap-2 px-5 py-3 bg-emerald-accent hover:bg-emerald-500 text-black font-extrabold uppercase text-xs tracking-wider rounded-xl transition-all duration-200 cursor-pointer shadow-lg shadow-emerald-500/10"
          >
            <Plus className="h-4.5 w-4.5" />
            Add New Team
          </button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="relative sm:col-span-2">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
            <input
              type="text"
              placeholder="Search by team name, country, short code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 glass-input rounded-xl text-sm"
            />
          </div>
          <div>
            <select
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
              className="w-full px-4 py-3.5 glass-input rounded-xl text-sm appearance-none cursor-pointer"
            >
              <option value="">All Regions / Confederations</option>
              <option value="UEFA">UEFA (Europe)</option>
              <option value="CONMEBOL">CONMEBOL (South America)</option>
              <option value="CONCACAF">CONCACAF (North America)</option>
              <option value="CAF">CAF (Africa)</option>
              <option value="AFC">AFC (Asia)</option>
              <option value="OFC">OFC (Oceania)</option>
            </select>
          </div>
        </div>

        {/* Teams List */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <Loader2 className="h-8 w-8 text-emerald-accent animate-spin" />
            <p className="text-slate-400 text-sm mt-4">Loading teams list...</p>
          </div>
        ) : filteredTeams.length === 0 ? (
          <div className="glass-panel p-12 text-center rounded-2xl border border-card-border">
            <Globe className="h-12 w-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white uppercase">No Teams Found</h3>
            <p className="text-slate-400 text-sm mt-1">Create custom teams manually or adjust search criteria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTeams.map((team) => (
              <div 
                key={team.id} 
                className={`glass-panel p-5 rounded-2xl flex items-center justify-between border transition-all duration-200 ${
                  team.is_enabled ? 'border-card-border hover:border-slate-700' : 'border-red-950/20 opacity-60'
                }`}
              >
                <div className="flex items-center gap-4">
                  {/* Flag Display */}
                  <div className="h-12 w-16 bg-slate-900/60 rounded-lg overflow-hidden border border-card-border flex items-center justify-center shrink-0">
                    {team.flag_url ? (
                      <img 
                        src={team.flag_url} 
                        alt={`${team.name} Flag`} 
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-lg font-bold text-slate-500">{team.short_name}</span>
                    )}
                  </div>

                  <div>
                    <h3 className="font-extrabold text-white text-base flex items-center gap-1.5">
                      {team.name}
                      <span className="text-slate-500 font-medium text-xs">({team.short_name})</span>
                    </h3>
                    <p className="text-slate-400 text-xs mt-0.5 flex items-center gap-1 font-medium">
                      <span className="px-1.5 py-0.5 bg-slate-800 rounded text-[9px] uppercase tracking-wider text-slate-300">
                        {team.region}
                      </span>
                      • Code: {team.country_code}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleMutation.mutate({ id: team.id, isEnabled: !team.is_enabled })}
                    title={team.is_enabled ? 'Disable Team' : 'Enable Team'}
                    className={`p-2 rounded-xl border transition-all duration-150 cursor-pointer ${
                      team.is_enabled 
                        ? 'border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10' 
                        : 'border-slate-800 text-slate-500 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <Power className="h-4.5 w-4.5" />
                  </button>
                  <button
                    onClick={() => handleEditClick(team)}
                    title="Edit Team"
                    className="p-2 rounded-xl border border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white transition-all duration-150 cursor-pointer"
                  >
                    <Edit3 className="h-4.5 w-4.5" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Are you sure you want to delete ${team.name}?`)) {
                        deleteMutation.mutate(team.id);
                      }
                    }}
                    title="Delete Team"
                    className="p-2 rounded-xl border border-slate-800 text-slate-400 hover:border-red-500/20 hover:text-red-400 hover:bg-red-500/10 transition-all duration-150 cursor-pointer"
                  >
                    <Trash2 className="h-4.5 w-4.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Creation/Edit Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-lg glass-panel p-8 rounded-3xl space-y-6">
              <div className="flex justify-between items-center pb-4 border-b border-card-border">
                <h3 className="text-xl font-extrabold text-white uppercase">
                  {editingTeam ? 'Edit Team Details' : 'Register New Team'}
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
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Team Name</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Argentina"
                      className="w-full px-4 py-3 glass-input rounded-xl text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Short Code (3 letters)</label>
                    <input
                      type="text"
                      required
                      maxLength={3}
                      value={shortName}
                      onChange={(e) => setShortName(e.target.value)}
                      placeholder="e.g. ARG"
                      className="w-full px-4 py-3 glass-input rounded-xl text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Country Name</label>
                    <input
                      type="text"
                      required
                      value={countryName}
                      onChange={(e) => setCountryName(e.target.value)}
                      placeholder="e.g. Argentina"
                      className="w-full px-4 py-3 glass-input rounded-xl text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Country Code (2 letters)</label>
                    <input
                      type="text"
                      required
                      maxLength={2}
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      placeholder="e.g. AR"
                      className="w-full px-4 py-3 glass-input rounded-xl text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Confederation Region</label>
                  <select
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className="w-full px-4 py-3 glass-input rounded-xl text-sm appearance-none cursor-pointer"
                  >
                    <option value="UEFA">UEFA (Europe)</option>
                    <option value="CONMEBOL">CONMEBOL (South America)</option>
                    <option value="CONCACAF">CONCACAF (North America)</option>
                    <option value="CAF">CAF (Africa)</option>
                    <option value="AFC">AFC (Asia)</option>
                    <option value="OFC">OFC (Oceania)</option>
                  </select>
                </div>

                {/* Uploads */}
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Official Flag File</label>
                    <label className="flex flex-col items-center justify-center px-4 py-5 bg-slate-950/60 border border-dashed border-slate-800 rounded-xl cursor-pointer hover:border-slate-700 hover:bg-slate-900/50 transition-all duration-150">
                      <Upload className="h-5 w-5 text-slate-500 mb-1" />
                      <span className="text-xs text-slate-400 font-semibold truncate max-w-full">
                        {flagFile ? flagFile.name : 'Upload Flag'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setFlagFile(e.target.files?.[0] || null)}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Team Logo File</label>
                    <label className="flex flex-col items-center justify-center px-4 py-5 bg-slate-950/60 border border-dashed border-slate-800 rounded-xl cursor-pointer hover:border-slate-700 hover:bg-slate-900/50 transition-all duration-150">
                      <Upload className="h-5 w-5 text-slate-500 mb-1" />
                      <span className="text-xs text-slate-400 font-semibold truncate max-w-full">
                        {logoFile ? logoFile.name : 'Upload Logo'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* Submit button */}
                <div className="pt-4 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-3 border border-slate-800 hover:bg-slate-800 text-slate-300 font-bold uppercase text-xs tracking-wider rounded-xl transition-all duration-150 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploading || saveMutation.isPending}
                    className="flex items-center gap-2 px-6 py-3 bg-emerald-accent hover:bg-emerald-500 text-black font-extrabold uppercase text-xs tracking-wider rounded-xl transition-all duration-150 cursor-pointer disabled:opacity-50"
                  >
                    {(uploading || saveMutation.isPending) ? (
                      <Loader2 className="h-4.5 w-4.5 animate-spin" />
                    ) : (
                      <Check className="h-4.5 w-4.5" />
                    )}
                    Save Team
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
