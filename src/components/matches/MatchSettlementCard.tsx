'use client';

import * as React from 'react';
import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card.tsx';
import { Badge } from '../ui/badge.tsx';
import { Button } from '../ui/button.tsx';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../ui/table.tsx';
import { settleMatchAction, type SettleMatchActionResult } from '../../app/actions/match-actions.ts';
import {
  registerAttendanceAction,
  cancelAttendanceAction,
  checkinAttendanceAction,
} from '../../app/actions/rsvp-actions.ts';
import type { Match, Attendance, Player } from '../../core/domain/index.ts';
import {
  Calendar,
  MapPin,
  Users,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Lock,
  ShieldCheck,
  UserPlus,
  UserCheck,
  UserX,
  Wallet,
  Trophy,
} from 'lucide-react';

interface MatchSettlementCardProps {
  initialMatch: Match;
  initialAttendances: Attendance[];
  players: Player[];
  estimatedFee: number;
}

export function MatchSettlementCard({
  initialMatch,
  initialAttendances,
  players,
  estimatedFee,
}: MatchSettlementCardProps) {
  const [match, setMatch] = useState<Match>(initialMatch);
  const [attendances, setAttendances] = useState<Attendance[]>(initialAttendances);
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  // State for adding a guest (+1)
  const [selectedHostPlayerId, setSelectedHostPlayerId] = useState<string>(players[0]?.id || '');
  const [guestName, setGuestName] = useState<string>('');

  const isSettled = match.status === 'SETTLED';
  const totalCost = match.pitchRentalCost + match.extraCosts;
  const attendedCount = attendances.filter((a) => a.status === 'ATTENDED').length;
  const confirmedCount = attendances.filter((a) => a.status === 'CONFIRMED' || a.status === 'ATTENDED').length;
  const waitlistCount = attendances.filter((a) => a.status === 'WAITLIST').length;

  const currentFee = isSettled
    ? match.settledFeePerPlayer ?? 0
    : attendedCount > 0
    ? Math.ceil(totalCost / attendedCount)
    : estimatedFee;

  const handleSettle = () => {
    startTransition(async () => {
      const res = await settleMatchAction(match.id);
      setFeedback(res);
      if (res.success && res.data) {
        setMatch((prev) => ({
          ...prev,
          status: 'SETTLED',
          settledFeePerPlayer: res.data!.settledFeePerPlayer,
          updatedAt: new Date(res.data!.updatedAt),
        }));
      }
    });
  };

  const handleAddGuest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim()) return;

    startTransition(async () => {
      const res = await registerAttendanceAction(match.id, selectedHostPlayerId, guestName.trim());
      setFeedback(res);
      if (res.success && res.data) {
        const newAtt = (res.data as any).attendance;
        setAttendances((prev) => [...prev, newAtt]);
        setGuestName('');
      }
    });
  };

  const handleCheckinToggle = (attendanceId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'ATTENDED' ? 'CONFIRMED' : 'ATTENDED';
    startTransition(async () => {
      const res = await checkinAttendanceAction(attendanceId, nextStatus);
      setFeedback(res);
      if (res.success && res.data) {
        setAttendances((prev) =>
          prev.map((a) => (a.id === attendanceId ? { ...a, status: nextStatus } : a))
        );
      }
    });
  };

  const handleCancelAttendance = (attendanceId: string) => {
    startTransition(async () => {
      const res = await cancelAttendanceAction(attendanceId);
      setFeedback(res);
      if (res.success && res.data) {
        const { cancelledAttendance, promotedAttendance } = res.data as any;
        setAttendances((prev) =>
          prev.map((a) => {
            if (a.id === cancelledAttendance.id) return { ...a, status: 'CANCELLED' };
            if (promotedAttendance && a.id === promotedAttendance.id) return { ...a, status: 'CONFIRMED' };
            return a;
          })
        );
      }
    });
  };

  const getPlayer = (playerId: string) => players.find((p) => p.id === playerId);

  const renderAttendanceName = (att: Attendance) => {
    const hostPlayer = getPlayer(att.playerId);
    if (att.guestName) {
      return (
        <div>
          <span className="font-semibold text-emerald-300">👥 {att.guestName}</span>
          <span className="ml-2 text-xs text-zinc-400">
            (Invitado +1 de {hostPlayer?.fullName || att.playerId})
          </span>
        </div>
      );
    }
    return (
      <span className="font-medium text-zinc-100">
        ⚽ {hostPlayer ? `${hostPlayer.fullName} (${hostPlayer.alias || 'Jugador'})` : att.playerId}
      </span>
    );
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
              ⚽ Gestión de Partido, RSVP & Liquidación
            </h1>
            <Badge
              variant={isSettled ? 'success' : match.status === 'OPEN_REGISTRATION' ? 'default' : 'warning'}
              className="text-xs uppercase tracking-wider"
            >
              {match.status}
            </Badge>
          </div>
          <p className="text-zinc-400 mt-1 flex items-center gap-4 text-sm">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-emerald-400" />
              {match.location}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-emerald-400" />
              {new Date(match.date).toLocaleDateString('es-CO', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </p>
        </div>

        {/* Action Button Card Header */}
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/wallet">
            <Button
              variant="outline"
              size="lg"
              className="border-zinc-700 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 gap-2 font-medium"
            >
              <Wallet className="w-4 h-4 text-emerald-400" /> Billetera
            </Button>
          </Link>
          <Link href="/stats">
            <Button
              variant="outline"
              size="lg"
              className="border-zinc-700 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 gap-2 font-medium"
            >
              <Trophy className="w-4 h-4 text-amber-400" /> Estadísticas & Ranking
            </Button>
          </Link>
          <Button
            onClick={handleSettle}
            disabled={isSettled || isPending || attendedCount === 0}
            variant={isSettled ? 'secondary' : 'default'}
            size="lg"
            className="w-full md:w-auto font-medium transition-all"
          >
            {isPending ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin">⏳</span> Procesando...
              </span>
            ) : isSettled ? (
              <span className="flex items-center gap-2 text-emerald-400">
                <Lock className="w-4 h-4" /> Cuota Congelada
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" /> Liquidar y Congelar Cuota
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Status Feedback Banner */}
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
            <p className="font-semibold">{feedback.success ? 'Operación Exitosa' : 'Aviso de Dominio'}</p>
            <p className="text-sm opacity-90">{feedback.message}</p>
          </div>
        </div>
      )}

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Cost Breakdown */}
        <Card className="border-zinc-800 bg-zinc-900/60">
          <CardHeader className="pb-2">
            <CardDescription className="text-zinc-400 flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-emerald-400" /> Desglose de Costos
            </CardDescription>
            <CardTitle className="text-2xl font-mono text-white">
              ${totalCost.toLocaleString('es-CO')} COP
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-zinc-400 space-y-1">
            <div className="flex justify-between py-1 border-b border-zinc-800">
              <span>Alquiler Cancha:</span>
              <span className="text-zinc-200 font-mono">${match.pitchRentalCost.toLocaleString('es-CO')}</span>
            </div>
            <div className="flex justify-between py-1">
              <span>Costos Extras (Balón/Hidratación):</span>
              <span className="text-zinc-200 font-mono">${match.extraCosts.toLocaleString('es-CO')}</span>
            </div>
          </CardContent>
        </Card>

        {/* Attendees Count */}
        <Card className="border-zinc-800 bg-zinc-900/60">
          <CardHeader className="pb-2">
            <CardDescription className="text-zinc-400 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-blue-400" /> Capacidad & RSVP
            </CardDescription>
            <CardTitle className="text-2xl font-mono text-white">
              {confirmedCount} / {match.maxPlayers}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-zinc-400 space-y-1">
            <div className="flex justify-between py-1 border-b border-zinc-800">
              <span>Presentes en Cancha (Check-in):</span>
              <span className="text-emerald-400 font-semibold">{attendedCount} jugadores</span>
            </div>
            <div className="flex justify-between py-1">
              <span>Lista de Espera (Waitlist):</span>
              <span className="text-amber-400 font-medium">{waitlistCount} en espera</span>
            </div>
          </CardContent>
        </Card>

        {/* Settlement Fee */}
        <Card className={`border-zinc-800 ${isSettled ? 'bg-emerald-950/20 border-emerald-800/40' : 'bg-zinc-900/60'}`}>
          <CardHeader className="pb-2">
            <CardDescription className="text-zinc-400 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              {isSettled ? 'Cuota Liquidada (Congelada)' : 'Cuota Estimada'}
            </CardDescription>
            <CardTitle className="text-2xl font-mono text-emerald-400">
              ${currentFee.toLocaleString('es-CO')} COP
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-zinc-400 space-y-1">
            <div className="flex justify-between py-1 border-b border-zinc-800">
              <span>Fórmula Prorrateo:</span>
              <span className="font-mono text-zinc-300">Math.ceil(Total / Presentes)</span>
            </div>
            <div className="flex justify-between py-1">
              <span>Estado Contable:</span>
              <span className={isSettled ? 'text-emerald-400 font-semibold' : 'text-amber-400'}>
                {isSettled ? '🔒 Débitos Aplicados' : '⏳ Pendiente de Cierre'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Register Guest (+1) Form */}
      {!isSettled && (
        <Card className="border-zinc-800 bg-zinc-900/40 border-dashed">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-zinc-200">
              <UserPlus className="w-4 h-4 text-emerald-400" /> Registrar Invitado (+1) para este Partido
            </CardTitle>
            <CardDescription className="text-xs text-zinc-400">
              Un jugador puede registrar invitados (+1, +2). La cuota del invitado se cargará al jugador anfitrión responsable al liquidar el partido.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddGuest} className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <label className="text-xs text-zinc-400 block mb-1">Jugador Anfitrión:</label>
                <select
                  value={selectedHostPlayerId}
                  onChange={(e) => setSelectedHostPlayerId(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  {players.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.fullName} ({p.alias || 'Jugador'})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="text-xs text-zinc-400 block mb-1">Nombre del Invitado (+1):</label>
                <input
                  type="text"
                  placeholder="Ej: Camilo Andrés (Amigo)"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div className="flex items-end">
                <Button
                  type="submit"
                  disabled={isPending || !guestName.trim()}
                  variant="default"
                  className="w-full sm:w-auto"
                >
                  {isPending ? 'Agregando...' : '+ Registrar Invitado (+1)'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Attendees Table */}
      <Card className="border-zinc-800 bg-zinc-900/60">
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-400" /> Lista de Jugadores & Convocatoria
            </span>
            <span className="text-xs font-normal text-zinc-400">
              {attendances.length} registros en total
            </span>
          </CardTitle>
          <CardDescription>
            Control de asistencia en cancha, lista de espera automática y cuota imputada.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Jugador / Invitado</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Cuota Asignada</TableHead>
                {!isSettled && <TableHead className="text-right">Acciones de Cancha</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {attendances.map((att) => {
                const isAttended = att.status === 'ATTENDED';
                const isWaitlist = att.status === 'WAITLIST';
                const isCancelled = att.status === 'CANCELLED';

                const badgeVariant = isAttended
                  ? 'success'
                  : isWaitlist
                  ? 'warning'
                  : isCancelled
                  ? 'destructive'
                  : 'default';

                return (
                  <TableRow key={att.id} className={isCancelled ? 'opacity-50' : ''}>
                    <TableCell className="align-middle">
                      {renderAttendanceName(att)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={badgeVariant} className="text-xs">
                        {att.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-emerald-400">
                      {isAttended
                        ? `$${currentFee.toLocaleString('es-CO')}`
                        : isCancelled
                        ? '$0'
                        : '(Pendiente check-in)'}
                    </TableCell>
                    {!isSettled && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {!isCancelled && !isWaitlist && (
                            <Button
                              onClick={() => handleCheckinToggle(att.id, att.status)}
                              disabled={isPending}
                              variant={isAttended ? 'secondary' : 'default'}
                              size="sm"
                              className="text-xs h-7 px-2"
                            >
                              <UserCheck className="w-3.5 h-3.5 mr-1" />
                              {isAttended ? 'Marcar Ausente' : 'Marcar Presente'}
                            </Button>
                          )}
                          {!isCancelled && (
                            <Button
                              onClick={() => handleCancelAttendance(att.id)}
                              disabled={isPending}
                              variant="destructive"
                              size="sm"
                              className="text-xs h-7 px-2"
                            >
                              <UserX className="w-3.5 h-3.5 mr-1" />
                              Cancelar
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
