'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ShieldCheck, Lock } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sessionToken = localStorage.getItem('admin_session');
    if (sessionToken === '823163') {
      router.push('/admin/dashboard');
    } else {
      setChecking(false);
    }
  }, [router]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Bounded check for password
    setTimeout(() => {
      if (password === '823163') {
        localStorage.setItem('admin_session', '823163');
        router.push('/admin/dashboard');
      } else {
        setError('Authentication Failed: Invalid admin password.');
        setLoading(false);
      }
    }, 600);
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 text-emerald-accent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-gold-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md glass-panel p-8 rounded-3xl relative z-10">
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="h-16 w-16 bg-emerald-accent/15 border border-emerald-accent/25 rounded-2xl flex items-center justify-center text-3xl mb-4 shadow-lg shadow-emerald-500/5">
            🏆
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white uppercase">World Cup 2026</h1>
          <p className="text-slate-400 text-xs font-semibold uppercase mt-1 tracking-wider">Control Room Login</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          {error && (
            <div className="p-4 bg-red-950/30 border border-red-500/25 rounded-2xl text-red-400 text-sm font-medium">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Admin Security Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password..."
                className="w-full pl-12 pr-4 py-3.5 glass-input rounded-xl text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-emerald-accent hover:bg-emerald-500 text-black font-extrabold uppercase tracking-wider rounded-xl transition-all duration-200 shadow-lg shadow-emerald-500/20 hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <ShieldCheck className="h-5 w-5" />
                Unlock Control Room
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-card-border text-center">
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
            Secure Session Gateway • Authorized Access Only
          </p>
        </div>
      </div>
    </div>
  );
}
