'use client';

import * as React from 'react';
import { useState, useTransition } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Badge } from '../ui/badge.tsx';
import { Button } from '../ui/button.tsx';
import { switchUserAction } from '../../app/actions/auth-actions.ts';
import type { Player, UserRole } from '../../core/domain/types.ts';
import {
  ShieldAlert,
  Wallet,
  Trophy,
  Bell,
  Calendar,
  UserCheck,
  Crown,
  LogOut,
  Users,
  CreditCard,
} from 'lucide-react';
import { createClient } from '../../lib/supabase/client.ts';
import { useRouter } from 'next/navigation';

interface AppHeaderProps {
  players: Player[];
  initialPlayerId: string;
  initialRole: UserRole;
  initialFullName: string;
}

export function AppHeader({
  players,
  initialPlayerId,
  initialRole,
  initialFullName,
}: AppHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [selectedPlayerId, setSelectedPlayerId] = useState<string>(initialPlayerId);
  const [currentRole, setCurrentRole] = useState<UserRole>(initialRole);
  const [currentName, setCurrentName] = useState<string>(initialFullName);
  const [isPending, startTransition] = useTransition();

  // Completely hide header on public RSVP and login pages (AFTER declaring hooks)
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

  const handleUserSwitch = (newPlayerId: string) => {
    setSelectedPlayerId(newPlayerId);
    startTransition(async () => {
      const res = await switchUserAction(newPlayerId);
      if (res.success && res.data) {
        setCurrentRole(res.data.user.role);
        setCurrentName(res.data.user.fullName);
      }
    });
  };

  const navItems = [
    { href: '/matches', label: 'Partidos', icon: Calendar },
    { href: '/players', label: 'Nómina', icon: Users },
    { href: '/wallet', label: 'Billetera', icon: Wallet },
    { href: '/pago', label: 'Portal Pagos', icon: CreditCard },
    { href: '/stats', label: 'Estadísticas', icon: Trophy },
    { href: '/notifications', label: 'Notificaciones', icon: Bell },
  ];

  const getRoleBadgeVariant = (role: UserRole) => {
    switch (role) {
      case 'ADMIN':
        return 'warning';
      case 'CAPTAIN':
        return 'default';
      default:
        return 'secondary';
    }
  };

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand & Nav Links */}
        <div className="flex items-center gap-6">
          <Link href="/matches" className="flex items-center gap-2 font-black text-lg text-white tracking-wider">
            <span className="text-xl">⚽</span>
            <span className="hidden sm:inline bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
              MIZPA SYSTEM
            </span>
          </Link>

          <nav className="flex items-center gap-1 sm:gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-zinc-800 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-zinc-400'}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Persona & Role Switcher */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5">
            <div className="hidden md:flex flex-col items-end">
              <span className="text-xs font-semibold text-zinc-200 truncate max-w-[140px]">
                {currentName}
              </span>
              <div className="flex items-center gap-1">
                <Badge
                  variant={getRoleBadgeVariant(currentRole)}
                  className="text-[9px] px-1.5 py-0 uppercase font-mono tracking-wider"
                >
                  {currentRole === 'ADMIN' && <Crown className="w-2.5 h-2.5 mr-0.5 inline" />}
                  {currentRole}
                </Badge>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <UserCheck className="w-4 h-4 text-emerald-400 hidden sm:block" />
              <select
                value={selectedPlayerId}
                onChange={(e) => handleUserSwitch(e.target.value)}
                disabled={isPending}
                className="bg-zinc-800 border border-zinc-700 text-zinc-100 text-xs rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                title="Cambiar usuario activo"
              >
                {players.map((p) => {
                  const label = p.role === 'ADMIN' || p.fullName.toLowerCase().includes('fabian')
                    ? 'Fabián Téllez (Admin)'
                    : p.alias ? `${p.fullName} (${p.alias})` : p.fullName;
                  return (
                    <option key={p.id} value={p.id}>
                      {label}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-zinc-400 hover:text-red-400 hover:bg-red-950/30 p-2 h-9 w-9 rounded-lg"
            title="Cerrar Sesión"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
