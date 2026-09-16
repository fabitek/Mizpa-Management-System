'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Badge } from '../ui/badge.tsx';
import { Button } from '../ui/button.tsx';
import type { UserRole } from '../../core/domain/types.ts';
import {
  Wallet,
  Trophy,
  Bell,
  Calendar,
  Crown,
  LogOut,
  Users,
  CreditCard,
} from 'lucide-react';
import { createClient } from '../../lib/supabase/client.ts';
import { useRouter } from 'next/navigation';

interface AppHeaderProps {
  initialRole: UserRole;
  initialFullName: string;
}

export function AppHeader({
  initialRole,
  initialFullName,
}: AppHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();

  // Completely hide header on public RSVP and login pages
  if (pathname?.startsWith('/rsvp') || pathname === '/login') {
    return null;
  }

  const handleLogout = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      // Ignore
    }
    router.push('/login');
  };

  const navItems = [
    { href: '/matches',       label: 'Partidos',       icon: Calendar  },
    { href: '/players',       label: 'Nómina',         icon: Users     },
    { href: '/wallet',        label: 'Billetera',      icon: Wallet    },
    { href: '/pago',          label: 'Portal Pagos',   icon: CreditCard},
    { href: '/stats',         label: 'Estadísticas',   icon: Trophy    },
    { href: '/notifications', label: 'Notificaciones', icon: Bell      },
  ];

  const getRoleBadgeVariant = (role: UserRole) => {
    switch (role) {
      case 'ADMIN':   return 'warning';
      case 'CAPTAIN': return 'default';
      default:        return 'secondary';
    }
  };

  // Generate avatar initials from full name
  const getInitials = (name: string) => {
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const initials = getInitials(initialFullName);

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">

        {/* ── Brand & Nav Links ──────────────────────────────────── */}
        <div className="flex items-center gap-6">
          <Link
            href="/matches"
            className="flex items-center gap-2 font-black text-lg text-white tracking-wider shrink-0"
          >
            <span className="text-xl">⚽</span>
            <span className="hidden sm:inline bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
              MIZPA SYSTEM
            </span>
          </Link>

          <nav className="flex items-center gap-1 sm:gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href || pathname?.startsWith(item.href + '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-xs sm:text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-emerald-500/10 text-emerald-400 after:absolute after:bottom-0 after:left-1/2 after:-translate-x-1/2 after:w-4/5 after:h-[2px] after:rounded-full after:bg-emerald-500'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-zinc-500'}`}
                  />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* ── User Profile (read-only) + Logout ─────────────────── */}
        <div className="flex items-center gap-2 shrink-0">

          {/* Profile pill — shows authenticated user only, no switcher */}
          <div className="flex items-center gap-2.5 bg-[#121214] border border-zinc-800 rounded-[10px] px-3 py-1.5">
            {/* Avatar circle with initials */}
            <div className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
              <span className="text-[10px] font-bold text-emerald-400 tracking-wide">
                {initials}
              </span>
            </div>

            {/* Name & Role badge */}
            <div className="hidden md:flex flex-col items-start leading-none gap-0.5">
              <span className="text-xs font-semibold text-zinc-100 truncate max-w-[130px]">
                {initialFullName}
              </span>
              <Badge
                variant={getRoleBadgeVariant(initialRole)}
                className="text-[9px] px-1.5 py-0 uppercase font-mono tracking-wider mt-0.5"
              >
                {initialRole === 'ADMIN' && (
                  <Crown className="w-2.5 h-2.5 mr-0.5 inline" />
                )}
                {initialRole}
              </Badge>
            </div>
          </div>

          {/* Logout button — redirects to /login for Google re-auth */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-zinc-500 hover:text-red-400 hover:bg-red-950/30 p-2 h-9 w-9 rounded-[10px] transition-colors"
            title="Cerrar sesión — para cambiar de perfil, inicia con tu cuenta de Google"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>

      </div>
    </header>
  );
}
