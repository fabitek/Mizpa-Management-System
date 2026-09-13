'use client';

import * as React from 'react';
import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card.tsx';
import { Badge } from '../ui/badge.tsx';
import { Button } from '../ui/button.tsx';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../ui/table.tsx';
import {
  settleMatchAction,
  createMatchAction,
  openMatchRegistrationAction,
} from '../../app/actions/match-actions.ts';
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
  Share2,
  ExternalLink,
  PlusCircle,
  ChevronDown,
  Sparkles,
  Clock,
  X,
} from 'lucide-react';

interface MatchSettlementCardProps {
  initialMatch: Match;
  allMatches?: Match[];
  initialAttendances: Attendance[];
  players: Player[];
  estimatedFee: number;
}

export function MatchSettlementCard({
  initialMatch,
  allMatches = [initialMatch],
  initialAttendances,
  players,
  estimatedFee,
}: MatchSettlementCardProps) {
  const [matches, setMatches] = useState<Match[]>(allMatches);
  const [match, setMatch] = useState<Match>(initialMatch);
  const [attendances, setAttendances] = useState<Attendance[]>(initialAttendances);
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  // New Match Form Modal State
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [newLocation, setNewLocation] = useState<string>('Cancha Sintética Los Sauces');
  const [newLocationAddress, setNewLocationAddress] = useState<string>('Cra. 30 #57-60, Bogotá');
  const [newGoogleMapsUrl, setNewGoogleMapsUrl] = useState<string>('');
  
  // Default date: tomorrow at 19:00
  const defaultDateStr = () => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    d.setHours(19, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  };
  
  const [newDate, setNewDate] = useState<string>(defaultDateStr());
  const [newPitchCost, setNewPitchCost] = useState<number>(180000);
  const [newExtraCosts, setNewExtraCosts] = useState<number>(20000);
  const [newMaxPlayers, setNewMaxPlayers] = useState<number>(18);
  const [newOpenImmediately, setNewOpenImmediately] = useState<boolean>(true);

  // State for adding a guest (+1)
  const [selectedHostPlayerId, setSelectedHostPlayerId] = useState<string>(players[0]?.id || '');
  const [guestName, setGuestName] = useState<string>('');

  const isSettled = match.status === 'SETTLED';
  const totalCost = match.pitchRentalCost + match.extraCosts;
  const maxPlayers = match.maxPlayers || 18;
  const attendedCount = attendances.filter((a) => a.status === 'ATTENDED').length;
  const confirmedCount = attendances.filter((a) => a.status === 'CONFIRMED' || a.status === 'ATTENDED').length;
  const waitlistCount = attendances.filter((a) => a.status === 'WAITLIST').length;

  const currentFee = isSettled
    ? match.settledFeePerPlayer ?? 0
    : attendedCount > 0
    ? Math.ceil(totalCost / attendedCount)
    : estimatedFee;

  const handleMatchSwitch = (matchId: string) => {
    const selected = matches.find((m) => m.id === matchId);
    if (selected) {
      setMatch(selected);
      // Filter attendances belonging to this match
      setAttendances(initialAttendances.filter((a) => a.matchId === selected.id));
      setFeedback(null);
    }
  };

  const handleCreateMatchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocation.trim()) {
      setFeedback({ success: false, message: 'La sede/cancha no puede estar vacía.' });
      return;
    }

    startTransition(async () => {
      const res = await createMatchAction({
        location: newLocation.trim(),
        locationAddress: newLocationAddress.trim() || undefined,
        googleMapsUrl: newGoogleMapsUrl.trim() || undefined,
        date: newDate,
        pitchRentalCost: Number(newPitchCost) || 0,
        extraCosts: Number(newExtraCosts) || 0,
        maxPlayers: Number(newMaxPlayers) || 18,
        openImmediately: newOpenImmediately,
      });

      setFeedback(res);
      if (res.success && res.data) {
        const created = res.data;
        setMatches((prev) => [created, ...prev]);
        setMatch(created);
        setAttendances([]); // Brand new match with 0 attendees
        setShowCreateModal(false);
      }
    });
  };

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
      {/* Header with Title and Create Match Action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
              ⚽ Gestión de Partidos & Convocatorias
            </h1>
            <Badge
              variant={isSettled ? 'success' : match.status === 'OPEN_REGISTRATION' ? 'default' : 'warning'}
              className="text-xs uppercase tracking-wider font-mono"
            >
              {match.status}
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-zinc-400 mt-2 text-sm">
            {/* Match Selector Dropdown */}
            {matches.length > 1 && (
              <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-700 px-2 py-1 rounded-md text-xs text-zinc-200">
                <span className="text-zinc-400">Partido:</span>
                <select
                  value={match.id}
                  onChange={(e) => handleMatchSwitch(e.target.value)}
                  className="bg-transparent text-emerald-400 font-medium focus:outline-none cursor-pointer"
                >
                  {matches.map((m) => (
                    <option key={m.id} value={m.id} className="bg-zinc-900 text-zinc-100">
                      {m.location} ({new Date(m.date).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <span className="inline-flex items-center gap-1.5 font-medium text-zinc-200">
              <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
              {match.location}
              {match.locationAddress && (
                <span className="text-zinc-400 font-normal">({match.locationAddress})</span>
              )}
            </span>

            {match.googleMapsUrl && (
              <a
                href={match.googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-700/60 text-emerald-300 px-2.5 py-1 rounded-md transition-colors"
              >
                <ExternalLink className="w-3 h-3" /> Ver en Google Maps
              </a>
            )}

            <span className="inline-flex items-center gap-1.5" suppressHydrationWarning>
              <Calendar className="w-4 h-4 text-emerald-400" />
              {new Date(match.date).toLocaleDateString('es-CO', {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
        </div>

        {/* Action Button Card Header */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Button
            onClick={() => setShowCreateModal(true)}
            size="default"
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-2 text-sm shadow-md"
          >
            <PlusCircle className="w-4 h-4" /> Crear Nuevo Partido
          </Button>

          <Link href="/notifications">
            <Button
              variant="outline"
              size="default"
              className="border-emerald-700/60 bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 gap-1.5 font-medium text-xs sm:text-sm"
            >
              <Share2 className="w-4 h-4 text-emerald-400" /> Convocatoria WhatsApp
            </Button>
          </Link>

          <Button
            onClick={handleSettle}
            disabled={isSettled || isPending || attendedCount === 0}
            variant={isSettled ? 'secondary' : 'default'}
            size="default"
            className="font-medium text-xs sm:text-sm transition-all"
          >
            {isPending ? (
              <span className="flex items-center gap-1.5">
                <span className="animate-spin">⏳</span> Liquidando...
              </span>
            ) : isSettled ? (
              <span className="flex items-center gap-1.5 text-emerald-400">
                <Lock className="w-4 h-4" /> Cuota Congelada
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <DollarSign className="w-4 h-4" /> Liquidar Partido
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Modal / Card para Crear Nuevo Partido desde Cero */}
      {showCreateModal && (
        <Card className="border-emerald-600/50 bg-gradient-to-b from-zinc-900 to-zinc-950 shadow-2xl animate-in fade-in duration-200">
          <CardHeader className="pb-3 border-b border-zinc-800 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2 text-white">
                <Sparkles className="w-5 h-5 text-emerald-400" /> Crear Nuevo Partido desde Cero
              </CardTitle>
              <CardDescription className="text-xs text-zinc-400">
                Configura la sede, dirección con enlace a Google Maps, fecha, costos y cupo oficial de 18 jugadores para abrir la convocatoria al grupo de WhatsApp.
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCreateModal(false)}
              className="text-zinc-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={handleCreateMatchSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">
                    📍 Nombre de la Sede / Cancha:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Cancha El Campín 5"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">
                    🗺️ Dirección de la Cancha (para Google Maps):
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Cra. 30 #57-60, Bogotá"
                    value={newLocationAddress}
                    onChange={(e) => setNewLocationAddress(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">
                    🔗 Enlace de Google Maps (Opcional - se genera automáticamente si se deja vacío):
                  </label>
                  <input
                    type="url"
                    placeholder="Ej: https://maps.app.goo.gl/Vz5sFySMVhGJFrc3A?g_st=ic"
                    value={newGoogleMapsUrl}
                    onChange={(e) => setNewGoogleMapsUrl(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">
                    📅 Fecha y Hora del Partido:
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">
                    💵 Costo Alquiler Cancha (COP):
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={newPitchCost}
                    onChange={(e) => setNewPitchCost(Number(e.target.value))}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">
                    🥤 Costos Extras (Balón / Hidratación):
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={newExtraCosts}
                    onChange={(e) => setNewExtraCosts(Number(e.target.value))}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">
                    👥 Cupo Máximo de Jugadores:
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={newMaxPlayers}
                    onChange={(e) => setNewMaxPlayers(Number(e.target.value))}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <p className="text-[11px] text-zinc-400 mt-1">
                    Estándar oficial Mizpa FC: <strong>18 jugadores</strong>.
                  </p>
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-200 select-none">
                    <input
                      type="checkbox"
                      checked={newOpenImmediately}
                      onChange={(e) => setNewOpenImmediately(e.target.checked)}
                      className="rounded border-zinc-700 bg-zinc-800 text-emerald-500 focus:ring-emerald-500"
                    />
                    <span>Abrir inscripciones (Convocatoria activa) inmediatamente</span>
                  </label>
                </div>
              </div>

              {/* Submit buttons */}
              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowCreateModal(false)}
                  className="text-zinc-400"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isPending}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-2"
                >
                  {isPending ? 'Creando Partido...' : '⚽ Guardar y Abrir Convocatoria'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

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
            <p className="font-semibold text-sm">{feedback.success ? 'Operación Exitosa' : 'Aviso'}</p>
            <p className="text-xs opacity-90">{feedback.message}</p>
          </div>
        </div>
      )}

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Cost Breakdown */}
        <Card className="border-zinc-800 bg-zinc-900/60 shadow-md">
          <CardHeader className="pb-2">
            <CardDescription className="text-zinc-400 flex items-center gap-1.5 text-xs">
              <DollarSign className="w-4 h-4 text-emerald-400" /> Presupuesto del Encuentro
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
        <Card className="border-zinc-800 bg-zinc-900/60 shadow-md">
          <CardHeader className="pb-2">
            <CardDescription className="text-zinc-400 flex items-center gap-1.5 text-xs">
              <Users className="w-4 h-4 text-blue-400" /> Nómina & Cupo Oficial
            </CardDescription>
            <CardTitle className="text-2xl font-mono text-white">
              {confirmedCount} / {maxPlayers}
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
        <Card className={`border-zinc-800 shadow-md ${isSettled ? 'bg-emerald-950/20 border-emerald-800/40' : 'bg-zinc-900/60'}`}>
          <CardHeader className="pb-2">
            <CardDescription className="text-zinc-400 flex items-center gap-1.5 text-xs">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              {isSettled ? 'Cuota Liquidada (Congelada)' : 'Cuota Estimada por Jugador'}
            </CardDescription>
            <CardTitle className="text-2xl font-mono text-emerald-400">
              ${currentFee.toLocaleString('es-CO')} COP
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-zinc-400 space-y-1">
            <div className="flex justify-between py-1 border-b border-zinc-800">
              <span>Cálculo:</span>
              <span className="font-mono text-zinc-300">Total / {attendedCount > 0 ? `${attendedCount} presentes` : `${maxPlayers} cupos`}</span>
            </div>
            <div className="flex justify-between py-1">
              <span>Estado Contable:</span>
              <span className={isSettled ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-medium'}>
                {isSettled ? '🔒 Débitos Aplicados' : '⏳ Pendiente de Cierre'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Link Banner to WhatsApp / RSVP Page */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-950 border border-emerald-800 flex items-center justify-center shrink-0">
            <Share2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white flex items-center gap-2">
              Link de Inscripción para Jugadores (RSVP)
            </h4>
            <p className="text-xs text-zinc-400 font-mono">
              /rsvp/{match.id}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/rsvp/${match.id}`} target="_blank">
            <Button size="sm" variant="outline" className="border-zinc-700 text-xs gap-1.5">
              <ExternalLink className="w-3.5 h-3.5" /> Abrir Formulario de Registro
            </Button>
          </Link>
          <Link href="/notifications">
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs gap-1.5 font-semibold">
              <Share2 className="w-3.5 h-3.5" /> Compartir en WhatsApp
            </Button>
          </Link>
        </div>
      </div>

      {/* Register Guest (+1) Form */}
      {!isSettled && (
        <Card className="border-zinc-800 bg-zinc-900/40 border-dashed">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-zinc-200">
              <UserPlus className="w-4 h-4 text-emerald-400" /> Registrar Invitado (+1) para este Partido
            </CardTitle>
            <CardDescription className="text-xs text-zinc-400">
              Un jugador anfitrión puede registrar acompañantes (+1, +2). La cuota del invitado se cargará al jugador anfitrión al liquidar.
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
                  className="w-full sm:w-auto text-xs"
                >
                  {isPending ? 'Agregando...' : '+ Registrar Invitado (+1)'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Attendees Table */}
      <Card className="border-zinc-800 bg-zinc-900/60 shadow-lg">
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-400" /> Nómina Oficial de Jugadores ({confirmedCount}/{maxPlayers})
            </span>
            <span className="text-xs font-normal text-zinc-400 font-mono">
              {attendances.length} registros
            </span>
          </CardTitle>
          <CardDescription className="text-xs">
            Control de asistencia en cancha, lista de espera automática a partir de 18 jugadores y liquidación individual.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {attendances.length === 0 ? (
            <div className="py-8 text-center text-zinc-500 text-xs">
              Aún no hay inscripciones para este partido. ¡Comparte la convocatoria en WhatsApp para que los jugadores se anoten!
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Jugador / Invitado</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Cuota Asignada</TableHead>
                  {!isSettled && <TableHead className="text-right">Acciones de Cancha</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendances.map((att, idx) => {
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
                      <TableCell className="text-xs font-mono text-zinc-500 w-8">
                        #{idx + 1}
                      </TableCell>
                      <TableCell className="align-middle">
                        {renderAttendanceName(att)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={badgeVariant} className="text-[10px]">
                          {att.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-emerald-400 text-xs">
                        {isAttended
                          ? `$${currentFee.toLocaleString('es-CO')}`
                          : isCancelled
                          ? '$0'
                          : '(Pendiente check-in)'}
                      </TableCell>
                      {!isSettled && (
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {!isCancelled && !isWaitlist && (
                              <Button
                                onClick={() => handleCheckinToggle(att.id, att.status)}
                                disabled={isPending}
                                variant={isAttended ? 'secondary' : 'default'}
                                size="sm"
                                className="text-xs h-7 px-2"
                              >
                                <UserCheck className="w-3.5 h-3.5 mr-1" />
                                {isAttended ? 'Ausente' : 'Presente'}
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
