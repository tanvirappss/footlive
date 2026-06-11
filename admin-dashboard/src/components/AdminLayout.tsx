'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  Tv, 
  DollarSign, 
  Megaphone, 
  LogOut, 
  Loader2,
  Menu,
  X
} from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const sessionToken = localStorage.getItem('admin_session');
    if (sessionToken !== '823163') {
      router.push('/admin');
    } else {
      setAuthenticated(true);
    }
    setLoading(false);
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('admin_session');
    router.push('/admin');
  };

  const navItems = [
    { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Teams', href: '/admin/teams', icon: Users },
    { name: 'Matches', href: '/admin/matches', icon: Calendar },
    { name: 'Streams', href: '/admin/streams', icon: Tv },
    { name: 'TV Channels', href: '/admin/channels', icon: Tv },
    { name: 'Earnings', href: '/admin/earnings', icon: DollarSign },
    { name: 'Announcements', href: '/admin/announcements', icon: Megaphone },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 text-emerald-accent animate-spin" />
        <p className="mt-4 text-slate-400 font-medium">Verifying credentials...</p>
      </div>
    );
  }

  if (!authenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex md:flex-col md:w-64 glass-panel border-r border-card-border shrink-0">
        <div className="p-6">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 bg-emerald-accent/20 rounded-lg flex items-center justify-center border border-emerald-accent/30">
              <span className="text-emerald-accent font-bold text-lg">⚽</span>
            </div>
            <div>
              <h1 className="font-extrabold text-sm tracking-wider uppercase text-white">WORLD CUP 2026</h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Control Center</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group text-sm font-semibold ${
                  isActive 
                    ? 'bg-emerald-accent/15 text-emerald-accent border border-emerald-accent/20' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/40 border border-transparent'
                }`}
              >
                <Icon className={`h-5 w-5 transition-transform duration-200 group-hover:scale-110 ${
                  isActive ? 'text-emerald-accent' : 'text-slate-400 group-hover:text-white'
                }`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-card-border">
          <div className="mb-4 px-4">
            <p className="text-xs text-slate-300 font-medium truncate">Authorized Admin</p>
            <p className="text-[10px] text-emerald-accent font-bold">Full Access Privileges</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 rounded-xl transition-all duration-200 text-sm font-semibold cursor-pointer"
          >
            <LogOut className="h-5 w-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden glass-panel border-b border-card-border flex items-center justify-between p-4 sticky top-0 z-50">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚽</span>
            <span className="font-extrabold text-sm tracking-wider uppercase text-white">WC 2026</span>
          </div>
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-slate-400 hover:text-white transition-colors"
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </header>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="md:hidden fixed inset-0 top-[65px] bg-background/95 backdrop-blur-md z-40 flex flex-col border-b border-card-border">
            <nav className="flex-1 px-4 py-6 space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-4 px-4 py-4 rounded-xl text-base font-semibold ${
                      isActive 
                        ? 'bg-emerald-accent/15 text-emerald-accent border border-emerald-accent/20' 
                        : 'text-slate-400 border border-transparent'
                    }`}
                  >
                    <Icon className="h-6 w-6" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
            <div className="p-6 border-t border-card-border">
              <p className="text-sm text-slate-400 mb-2">Authorized Admin</p>
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  handleLogout();
                }}
                className="w-full flex items-center justify-center gap-2 py-4 bg-red-600/10 border border-red-500/25 hover:bg-red-600/20 text-red-400 rounded-xl font-bold transition-all duration-200"
              >
                <LogOut className="h-5 w-5" />
                Sign Out
              </button>
            </div>
          </div>
        )}

        <main className="flex-1 p-6 md:p-10 overflow-y-auto max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
