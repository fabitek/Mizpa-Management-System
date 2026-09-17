'use client';

import * as React from 'react';
import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card.tsx';
import { Badge } from '../ui/badge.tsx';
import { Button } from '../ui/button.tsx';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../ui/table.tsx';
import {
  recordGoalAction,
  getPlayerStatsAction,
  getLeaderboardOverviewAction,
  assignMatchMvpAction,
} from '../../app/actions/stats-actions.ts';
import type { Player, Match, GoalType, PlayerPerformanceStats, PlayerBadge } from '../../core/domain/types.ts';
import type {
  LeaderboardOverview,
} from '../../core/use-cases/index.ts';
import {
  Trophy,
  Flame,
  Medal,
  Award,
  ArrowLeft,
  Wallet,
  Calendar,
  PlusCircle,
  CheckCircle2,
  AlertCircle,
  User,
  Star,
  Target,
} from 'lucide-react';

interface LeaderboardViewProps {
  players: Player[];
  activeMatch: Match | null;
  initialOverview: LeaderboardOverview;
  initialPlayerStats: PlayerPerformanceStats;
}

export function LeaderboardView({
  players,
  activeMatch,
  initialOverview,
  initialPlayerStats,
}: LeaderboardViewProps) {
  const [activeTab, setActiveTab] = useState<'scorers' | 'streaks' | 'badges' | 'record'>('scorers');
  const [overview, setOverview] = useState<LeaderboardOverview>(initialOverview);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>(initialPlayerStats.playerId);
  const [playerStats, setPlayerStats] = useState<PlayerPerformanceStats>(initialPlayerStats);

  // Record Goal form state
  const [goalPlayerId, setGoalPlayerId] = useState<string>(players[0]?.id ?? '');
  const [goalMinute, setGoalMinute] = useState<string>('');
  const [goalType, setGoalType] = useState<GoalType>('OPEN_PLAY');

  // MVP selection state
  const [mvpPlayerId, setMvpPlayerId] = useState<string>(activeMatch?.mvpPlayerId || (players[0]?.id ?? ''));

  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const getPlayer = (id: string) => players.find((p) => p.id === id);

  const handlePlayerChange = (newPlayerId: string) => {
    setSelectedPlayerId(newPlayerId);
    startTransition(async () => {
      const res = await getPlayerStatsAction(newPlayerId);
      if (res.success && res.data) {
        setPlayerStats(res.data as PlayerPerformanceStats);
      }
    });
  };

  const handleRecordGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMatch) {
      setFeedback({ success: false, message: 'No hay un partido activo para anotar goles.' });
      return;
    }
    const minuteNum = goalMinute ? parseInt(goalMinute, 10) : undefined;
    if (minuteNum !== undefined && (isNaN(minuteNum) || minuteNum < 0 || minuteNum > 130)) {
      setFeedback({ success: false, message: 'El minuto debe estar entre 0 y 130.' });
      return;
    }

    startTransition(async () => {
      const res = await recordGoalAction(activeMatch.id, goalPlayerId, minuteNum, goalType);
      setFeedback(res);

      if (res.success) {
        // Refresh overview and selected player stats
        const playerIds = players.map((p) => p.id);
        const overviewRes = await getLeaderboardOverviewAction(playerIds);
        if (overviewRes.success && overviewRes.data) {
          setOverview(overviewRes.data as LeaderboardOverview);
        }

        const statsRes = await getPlayerStatsAction(selectedPlayerId);
        if (statsRes.success && statsRes.data) {
          setPlayerStats(statsRes.data as PlayerPerformanceStats);
        }

        setGoalMinute('');
      }
    });
  };

  const handleAssignMvp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMatch) {
      setFeedback({ success: false, message: 'No hay un partido activo para elegir la figura.' });
      return;
    }
    startTransition(async () => {
      const res = await assignMatchMvpAction(activeMatch.id, mvpPlayerId);
      setFeedback(res);
      if (res.success) {
        const playerIds = players.map((p) => p.id);
        const overviewRes = await getLeaderboardOverviewAction(playerIds);
        if (overviewRes.success && overviewRes.data) {
          setOverview(overviewRes.data as LeaderboardOverview);
        }
      }
    });
  };

  // Podium (Top 3 Scorers)
  const top1 = overview.topScorers[0];
  const top2 = overview.topScorers[1];
  const top3 = overview.topScorers[2];

  const top1Player = top1 ? getPlayer(top1.playerId) : null;
  const top2Player = top2 ? getPlayer(top2.playerId) : null;
  const top3Player = top3 ? getPlayer(top3.playerId) : null;

  const bestStreakEntry = overview.attendanceRankings.reduce(
    (max, curr) => (curr.currentStreak > max.currentStreak ? curr : max),
    overview.attendanceRankings[0] || { playerId: '', currentStreak: 0 }
  );
  const bestStreakPlayer = bestStreakEntry ? getPlayer(bestStreakEntry.playerId) : null;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header & Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/matches">
              <Button variant="ghost" size="sm" className="gap-1 text-zinc-400 hover:text-white">
                <ArrowLeft className="w-4 h-4" /> Partidos
              </Button>
            </Link>
            <Link href="/wallet">
              <Button variant="ghost" size="sm" className="gap-1 text-zinc-400 hover:text-white">
                <Wallet className="w-4 h-4" /> Billetera
              </Button>
            </Link>
            <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
              🏆 Estadísticas y Goleadores
            </h1>
          </div>
          <p className="text-zinc-400 mt-1 text-sm">
            Tabla de goleadores, rachas de asistencia, figura del partido e insignias.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-zinc-800 bg-zinc-900/60">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs flex items-center gap-1.5 text-zinc-400">
              <Target className="w-4 h-4 text-emerald-400" /> Total Goles Marcados
            </CardDescription>
            <CardTitle className="text-2xl font-mono text-emerald-400">
              {overview.totalGoalsScored} Goles
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-zinc-400">
            Goles de jugada y penal.
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900/60">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs flex items-center gap-1.5 text-zinc-400">
              <Calendar className="w-4 h-4 text-blue-400" /> Partidos Disputados
            </CardDescription>
            <CardTitle className="text-2xl font-mono text-white">
              {overview.totalMatchesPlayed} Encuentros
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-zinc-400">
            Partidos jugados y liquidados.
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900/60">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs flex items-center gap-1.5 text-zinc-400">
              <Trophy className="w-4 h-4 text-amber-400" /> Pichichi Actual
            </CardDescription>
            <CardTitle className="text-xl font-bold text-amber-400 truncate">
              {top1Player ? top1Player.fullName : 'Sin registrar'}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-zinc-400">
            {top1 ? `${top1.goals} goles (${top1.ratio} por partido)` : '0 goles'}
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900/60">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs flex items-center gap-1.5 text-zinc-400">
              <Flame className="w-4 h-4 text-rose-400" /> Mayor Racha Activa
            </CardDescription>
            <CardTitle className="text-xl font-bold text-rose-400 truncate">
              {bestStreakPlayer ? bestStreakPlayer.fullName : 'Sin datos'}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-zinc-400">
            {bestStreakEntry.currentStreak} partidos consecutivos
          </CardContent>
        </Card>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-lg flex items-start gap-3 border ${
            feedback.success
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
              : 'bg-red-950/40 border-red-500/40 text-red-200'
          }`}
        >
          {feedback.success ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          )}
          <div>
            <p className="font-semibold">{feedback.success ? 'Operación Exitosa' : 'Aviso'}</p>
            <p className="text-sm opacity-90">{feedback.message}</p>
          </div>
        </div>
      )}

      {/* Podium of Honor (Top 3 Scorers) */}
      <Card className="border-zinc-800 bg-gradient-to-b from-zinc-900/80 to-zinc-950/90 overflow-hidden">
        <CardHeader className="pb-2 text-center">
          <CardTitle className="text-lg flex items-center justify-center gap-2 text-amber-400">
            <Trophy className="w-5 h-5" /> Podio de Goleadores
          </CardTitle>
          <CardDescription className="text-xs">
            Los máximos artilleros del equipo.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4 pb-6">
          <div className="flex flex-col sm:flex-row items-end justify-center gap-4 sm:gap-6 pt-6">
            {/* 2nd Place */}
            <div className="flex flex-col items-center order-2 sm:order-1 w-full sm:w-44">
              <div className="w-14 h-14 rounded-full bg-zinc-800 border-2 border-zinc-300 flex items-center justify-center text-xl shadow-lg mb-2">
                🥈
              </div>
              <p className="font-bold text-sm text-zinc-200 truncate w-full text-center">
                {top2Player ? top2Player.fullName : 'Vacante'}
              </p>
              <p className="text-xs text-zinc-400 font-mono">
                {top2 ? `${top2.goals} Goles` : '-'}
              </p>
              <div className="w-full h-24 bg-gradient-to-t from-zinc-600/30 to-zinc-500/10 rounded-t-lg border-t border-zinc-400/40 flex items-center justify-center mt-2">
                <span className="font-bold text-zinc-300 text-lg">2°</span>
              </div>
            </div>

            {/* 1st Place */}
            <div className="flex flex-col items-center order-1 sm:order-2 w-full sm:w-48">
              <div className="w-18 h-18 rounded-full bg-zinc-800 border-4 border-amber-400 flex items-center justify-center text-3xl shadow-xl mb-2">
                🥇
              </div>
              <p className="font-extrabold text-base text-amber-300 truncate w-full text-center">
                {top1Player ? top1Player.fullName : 'Vacante'}
              </p>
              <Badge variant="default" className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[10px] mt-0.5">
                GOLEADOR
              </Badge>
              <p className="text-sm text-amber-400 font-mono font-bold mt-1">
                {top1 ? `${top1.goals} Goles` : '-'}
              </p>
              <div className="w-full h-32 bg-gradient-to-t from-amber-600/40 to-amber-500/10 rounded-t-lg border-t-2 border-amber-400 flex items-center justify-center mt-2">
                <span className="font-black text-amber-400 text-2xl">1°</span>
              </div>
            </div>

            {/* 3rd Place */}
            <div className="flex flex-col items-center order-3 w-full sm:w-44">
              <div className="w-14 h-14 rounded-full bg-zinc-800 border-2 border-amber-700 flex items-center justify-center text-xl shadow-lg mb-2">
                🥉
              </div>
              <p className="font-bold text-sm text-zinc-200 truncate w-full text-center">
                {top3Player ? top3Player.fullName : 'Vacante'}
              </p>
              <p className="text-xs text-zinc-400 font-mono">
                {top3 ? `${top3.goals} Goles` : '-'}
              </p>
              <div className="w-full h-16 bg-gradient-to-t from-amber-900/30 to-amber-800/10 rounded-t-lg border-t border-amber-700/40 flex items-center justify-center mt-2">
                <span className="font-bold text-amber-600 text-lg">3°</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-zinc-800 pb-2">
        <Button
          variant={activeTab === 'scorers' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('scorers')}
          className="gap-2"
        >
          <Trophy className="w-4 h-4" /> Tabla de Goleadores
        </Button>
        <Button
          variant={activeTab === 'streaks' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('streaks')}
          className="gap-2"
        >
          <Flame className="w-4 h-4" /> Rachas & Asistencia
        </Button>
        <Button
          variant={activeTab === 'badges' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('badges')}
          className="gap-2"
        >
          <Award className="w-4 h-4" /> Insignias y Logros
        </Button>
        <Button
          variant={activeTab === 'record' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('record')}
          className="gap-2"
        >
          <PlusCircle className="w-4 h-4" /> Anotar Gol
        </Button>
      </div>

      {/* Tab 1: Top Scorers Table */}
      {activeTab === 'scorers' && (
        <Card className="border-zinc-800 bg-zinc-900/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" /> Clasificación de Goleadores
              </span>
              <span className="text-xs font-normal text-zinc-400">
                {overview.topScorers.length} goleadores registrados
              </span>
            </CardTitle>
            <CardDescription className="text-xs">
              Goles a favor, promedio por partido y goles de jugada.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {overview.topScorers.length === 0 ? (
              <div className="py-12 text-center text-zinc-500 text-sm">
                No hay goles registrados todavía.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-center">Pos</TableHead>
                    <TableHead>Jugador</TableHead>
                    <TableHead className="text-center">Goles</TableHead>
                    <TableHead className="text-center">Jugada</TableHead>
                    <TableHead className="text-center">Penal</TableHead>
                    <TableHead className="text-center">Partidos</TableHead>
                    <TableHead className="text-right">Promedio</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overview.topScorers.map((scorer, idx) => {
                    const p = getPlayer(scorer.playerId);
                    const isPodium = idx < 3;
                    return (
                      <TableRow key={scorer.playerId}>
                        <TableCell className="text-center font-bold">
                          {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}°`}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-zinc-100 flex items-center gap-2">
                            {p ? p.fullName : scorer.playerId}
                            {p?.alias && (
                              <span className="text-xs text-zinc-400">({p.alias})</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-mono font-bold text-amber-400">
                          {scorer.goals}
                        </TableCell>
                        <TableCell className="text-center font-mono text-zinc-300">
                          {scorer.openPlayGoals}
                        </TableCell>
                        <TableCell className="text-center font-mono text-zinc-400">
                          {scorer.penalties}
                        </TableCell>
                        <TableCell className="text-center font-mono text-zinc-300">
                          {scorer.matchesPlayed}
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold text-emerald-400">
                          {scorer.ratio} G/P
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab 2: Attendance Streaks */}
      {activeTab === 'streaks' && (
        <Card className="border-zinc-800 bg-zinc-900/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-rose-400" /> Rachas de Asistencia & Fidelidad
              </span>
              <span className="text-xs font-normal text-zinc-400">
                Constancia en partidos jugados
              </span>
            </CardTitle>
            <CardDescription className="text-xs">
              Partidos consecutivos jugados por cada integrante.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-center">Pos</TableHead>
                  <TableHead>Jugador</TableHead>
                  <TableHead className="text-center">Partidos Jugados</TableHead>
                  <TableHead className="text-center">Racha Actual</TableHead>
                  <TableHead className="text-right">Mejor Racha Histórica</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overview.attendanceRankings.map((entry, idx) => {
                  const p = getPlayer(entry.playerId);
                  return (
                    <TableRow key={entry.playerId}>
                      <TableCell className="text-center font-mono text-zinc-400">
                        {idx + 1}°
                      </TableCell>
                      <TableCell className="font-medium text-zinc-100">
                        {p ? p.fullName : entry.playerId}
                      </TableCell>
                      <TableCell className="text-center font-mono text-zinc-300 font-semibold">
                        {entry.matchesPlayed}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={entry.currentStreak >= 3 ? 'success' : 'default'}
                          className="font-mono text-xs gap-1"
                        >
                          <Flame className="w-3 h-3 text-rose-400" />
                          {entry.currentStreak} seguidos
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-zinc-300">
                        {entry.bestStreak} partidos
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Tab 3: Badges & Gamification */}
      {activeTab === 'badges' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Player Selection Card */}
          <Card className="border-zinc-800 bg-zinc-900/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="w-4 h-4 text-emerald-400" /> Perfil de Jugador
              </CardTitle>
              <CardDescription className="text-xs">
                Selecciona un jugador para consultar sus logros y distinciones.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <select
                value={selectedPlayerId}
                onChange={(e) => handlePlayerChange(e.target.value)}
                disabled={isPending}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                {players.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.fullName} ({p.alias || 'Jugador'})
                  </option>
                ))}
              </select>

              {/* Player Quick Stats */}
              <div className="p-4 rounded-lg border border-zinc-800 bg-zinc-950/50 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-400">Partidos Jugados:</span>
                  <span className="font-mono font-bold text-white">{playerStats.matchesPlayed}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-400">Goles Totales:</span>
                  <span className="font-mono font-bold text-amber-400">{playerStats.goalsCount}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-400">Promedio Gol/Partido:</span>
                  <span className="font-mono font-bold text-emerald-400">{playerStats.goalsPerMatchRatio}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-400">Racha Actual:</span>
                  <span className="font-mono font-bold text-rose-400">{playerStats.currentAttendanceStreak}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-400">Premios MVP:</span>
                  <span className="font-mono font-bold text-yellow-400">{playerStats.mvpCount}</span>
                </div>
              </div>

              {/* Match MVP Voting / Assignment Form */}
              <div className="pt-2 border-t border-zinc-800">
                <form onSubmit={handleAssignMvp} className="space-y-3">
                  <div className="flex items-center gap-1.5 text-xs text-zinc-300 font-semibold">
                    <Star className="w-3.5 h-3.5 text-yellow-400" /> Elegir Figura del Partido (MVP)
                  </div>
                  <select
                    value={mvpPlayerId}
                    onChange={(e) => setMvpPlayerId(e.target.value)}
                    disabled={isPending}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-1.5 text-xs text-zinc-100"
                  >
                    {players.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.fullName}
                      </option>
                    ))}
                  </select>
                  <Button type="submit" size="sm" variant="outline" disabled={isPending} className="w-full text-xs">
                    Confirmar Figura del Partido
                  </Button>
                </form>
              </div>
            </CardContent>
          </Card>

          {/* Badges Grid */}
          <div className="lg:col-span-2">
            <Card className="border-zinc-800 bg-zinc-900/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Medal className="w-5 h-5 text-amber-400" /> Insignias y Trofeos
                  </span>
                  <span className="text-xs font-normal text-zinc-400">
                    {playerStats.badges.filter((b: PlayerBadge) => b.unlocked).length} de {playerStats.badges.length} desbloqueadas
                  </span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Logros deportivos desbloqueados según tu rendimiento.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {playerStats.badges.map((badge: PlayerBadge) => (
                    <div
                      key={badge.code}
                      className={`p-4 rounded-lg border transition-all ${
                        badge.unlocked
                          ? 'bg-zinc-800/80 border-amber-500/40 shadow-sm'
                          : 'bg-zinc-950/40 border-zinc-800/60 opacity-50 grayscale'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="text-3xl p-2 rounded-lg bg-zinc-900 border border-zinc-700/50 shrink-0">
                          {badge.icon}
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-sm text-zinc-100">{badge.title}</h4>
                            <Badge
                              variant={badge.unlocked ? 'success' : 'outline'}
                              className="text-[10px] font-mono"
                            >
                              {badge.unlocked ? 'DESBLOQUEADO' : 'BLOQUEADO'}
                            </Badge>
                          </div>
                          <p className="text-xs text-zinc-400">{badge.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Tab 4: Record Goal in Live Match */}
      {activeTab === 'record' && (
        <Card className="border-zinc-800 bg-zinc-900/60 max-w-xl mx-auto">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-emerald-400" /> Registrar Gol del Partido
            </CardTitle>
            <CardDescription className="text-xs">
              {activeMatch
                ? `Anota goles en tiempo real vinculados a ${activeMatch.location} (${new Date(activeMatch.date).toLocaleDateString('es-CO')}).`
                : 'Programa o abre un partido para registrar goles en vivo.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRecordGoal} className="space-y-4">
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Goleador:</label>
                <select
                  value={goalPlayerId}
                  onChange={(e) => setGoalPlayerId(e.target.value)}
                  disabled={isPending}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  {players.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.fullName} ({p.alias || 'Jugador'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-zinc-400 block mb-1">Minuto del Gol (Opcional):</label>
                <input
                  type="number"
                  min="0"
                  max="130"
                  placeholder="Ej: 34"
                  value={goalMinute}
                  onChange={(e) => setGoalMinute(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-400 block mb-1">Tipo de Gol:</label>
                <select
                  value={goalType}
                  onChange={(e) => setGoalType(e.target.value as GoalType)}
                  disabled={isPending}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="OPEN_PLAY">⚽ Jugada Abierta (Open Play)</option>
                  <option value="PENALTY">🎯 Penalti (Penalty)</option>
                  <option value="OWN_GOAL">🤦 Autogol (Own Goal)</option>
                </select>
              </div>

              <Button
                type="submit"
                disabled={isPending}
                variant="default"
                className="w-full font-medium"
              >
                {isPending ? 'Guardando...' : 'Guardar Gol'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
