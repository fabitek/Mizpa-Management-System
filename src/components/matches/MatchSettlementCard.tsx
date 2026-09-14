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
  updateMatchAction,
  deleteMatchAction,
  openMatchRegistrationAction,
} from '../../app/actions/match-actions.ts';
import {
  registerAttendanceAction,
  cancelAttendanceAction,
  checkinAttendanceAction,
} from '../../app/actions/rsvp-actions.ts';
import type { Match, Attendance, Player, MatchStatus } from '../../core/domain/index.ts';
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
  Car,
  Copy,
  Edit2,
  Trash2,
} from 'lucide-react';

interface MatchSettlementCardProps {
  initialMatch: Match | null;
  allMatches?: Match[];
  initialAttendances: Attendance[];
  players: Player[];
  estimatedFee: number;
}

export function MatchSettlementCard({
  initialMatch,
  allMatches = initialMatch ? [initialMatch] : [],
  initialAttendances,
  players,
  estimatedFee,
}: MatchSettlementCardProps) {
  const [matches, setMatches] = useState<Match[]>(allMatches);
  const [match, setMatch] = useState<Match | null>(initialMatch);
  const [attendances, setAttendances] = useState<Attendance[]>(initialAttendances);
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  // New Match Form Modal State
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [newLocation, setNewLocation] = useState<string>('Abedules de Santa Fe');
  const [newLocationAddress, setNewLocationAddress] = useState<string>('Cra. 20 #185-58, Bogotá');
  const [newGoogleMapsUrl, setNewGoogleMapsUrl] = useState<string>('');
  
  // Default date: 20:00 (8:00 p.m.) next Tuesday or upcoming match day
  const defaultDateStr = () => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    d.setHours(20, 0, 0, 0);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };
  
  const [newDate, setNewDate] = useState<string>(defaultDateStr());
  const [newPitchCost, setNewPitchCost] = useState<number>(100000);
  const [newDurationHours, setNewDurationHours] = useState<number>(2);
  const [newParkingFeePerHour, setNewParkingFeePerHour] = useState<number>(1000);
  const [newMaxPlayers, setNewMaxPlayers] = useState<number>(18);
  const [newOpenImmediately, setNewOpenImmediately] = useState<boolean>(true);

  // Edit Match State
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [editLocation, setEditLocation] = useState<string>('');
  const [editLocationAddress, setEditLocationAddress] = useState<string>('');
  const [editGoogleMapsUrl, setEditGoogleMapsUrl] = useState<string>('');
  const [editDate, setEditDate] = useState<string>('');
  const [editPitchCost, setEditPitchCost] = useState<number>(100000);
  const [editExtraCosts, setEditExtraCosts] = useState<number>(0);
  const [editDurationHours, setEditDurationHours] = useState<number>(2);
  const [editParkingFeePerHour, setEditParkingFeePerHour] = useState<number>(1000);
  const [editMaxPlayers, setEditMaxPlayers] = useState<number>(18);
  const [editStatus, setEditStatus] = useState<MatchStatus>('OPEN_REGISTRATION');

  // Delete Match State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);

  // State for adding a guest (+1)
  const [selectedHostPlayerId, setSelectedHostPlayerId] = useState<string>(players[0]?.id || '');
  const [guestName, setGuestName] = useState<string>('');

  const isSettled = match ? match.status === 'SETTLED' : false;
  const durationHours = match?.durationHours ?? 2;
  const parkingFeePerHour = match?.parkingFeePerHour ?? 1000;
  const vehicleParkingFee = durationHours * parkingFeePerHour;

  const maxPlayers = match?.maxPlayers || 18;
  const attendedCount = attendances.filter((a) => a.status === 'ATTENDED').length;
  const confirmedCount = attendances.filter((a) => a.status === 'CONFIRMED' || a.status === 'ATTENDED').length;
  const waitlistCount = attendances.filter((a) => a.status === 'WAITLIST').length;

  const basePitchFee = match
    ? isSettled
      ? match.settledFeePerPlayer ?? 0
      : attendedCount > 0
      ? Math.ceil(match.pitchRentalCost / attendedCount)
      : Math.ceil(match.pitchRentalCost / maxPlayers)
    : 0;

  const handleMatchSwitch = (matchId: string) => {
    const selected = matches.find((m) => m.id === matchId);
    if (selected) {
      setMatch(selected);
      // Filter attendances belonging to this match
      setAttendances(initialAttendances.filter((a) => a.matchId === selected.id));
      setFeedback(null);
      setShowDeleteConfirm(false);
      setShowEditModal(false);
    }
  };

  const handleOpenEditModal = () => {
    if (!match) return;
    setEditLocation(match.location);
    setEditLocationAddress(match.locationAddress || '');
    setEditGoogleMapsUrl(match.googleMapsUrl || '');
    const d = new Date(match.date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    setEditDate(`${year}-${month}-${day}T${hours}:${minutes}`);
    setEditPitchCost(match.pitchRentalCost);
    setEditExtraCosts(match.extraCosts || 0);
    setEditDurationHours(match.durationHours || 2);
    setEditParkingFeePerHour(match.parkingFeePerHour ?? 1000);
    setEditMaxPlayers(match.maxPlayers || 18);
    setEditStatus(match.status);
    setShowEditModal(true);
  };

  const handleUpdateMatchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!match) return;
    if (!editLocation.trim()) {
      setFeedback({ success: false, message: 'La sede/cancha no puede estar vacía.' });
      return;
    }

    startTransition(async () => {
      const res = await updateMatchAction({
        id: match.id,
        location: editLocation.trim(),
        locationAddress: editLocationAddress.trim() || undefined,
        googleMapsUrl: editGoogleMapsUrl.trim() || undefined,
        date: editDate,
        pitchRentalCost: Number(editPitchCost) || 0,
        extraCosts: Number(editExtraCosts) || 0,
        durationHours: Number(editDurationHours) || 2,
        parkingFeePerHour: Number(editParkingFeePerHour) ?? 1000,
        maxPlayers: Number(editMaxPlayers) || 18,
        status: editStatus,
      });

      setFeedback(res);
      if (res.success && res.data) {
        const updated = res.data;
        setMatch(updated);
        setMatches((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
        setShowEditModal(false);
      }
    });
  };

  const handleDeleteMatch = () => {
    if (!match) return;
    startTransition(async () => {
      const idToDelete = match.id;
      const res = await deleteMatchAction(idToDelete);
      setFeedback(res);
      if (res.success) {
        const remaining = matches.filter((m) => m.id !== idToDelete);
        setMatches(remaining);
        const next = remaining.length > 0 ? remaining[0] : null;
        setMatch(next);
        if (next) {
          setAttendances(initialAttendances.filter((a) => a.matchId === next.id));
        } else {
          setAttendances([]);
        }
        setShowDeleteConfirm(false);
      }
    });
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
        extraCosts: 0,
        durationHours: Number(newDurationHours) || 2,
        parkingFeePerHour: Number(newParkingFeePerHour) ?? 1000,
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
    if (!match) return;
    startTransition(async () => {
      const res = await settleMatchAction(match.id);
      setFeedback(res);
      if (res.success && res.data) {
        setMatch((prev) =>
          prev
            ? {
                ...prev,
                status: 'SETTLED',
                settledFeePerPlayer: res.data!.settledFeePerPlayer,
                updatedAt: new Date(res.data!.updatedAt),
              }
            : null
        );
      }
    });
  };

  const handleAddGuest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!match || !guestName.trim()) return;

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

  const vehicleList = attendances.filter(
    (a) => (a.hasVehicle || a.vehiclePlate) && a.status !== 'CANCELLED'
  );

  const handleCopyParkingList = () => {
    if (!match || vehicleList.length === 0) return;
    const formattedDate = new Date(match.date).toLocaleDateString('es-CO', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
    });
    const lines = vehicleList.map((a, i) => {
      const host = getPlayer(a.playerId);
      const name = a.guestName ? `${a.guestName} (+1 de ${host?.fullName || 'Anfitrión'})` : host?.fullName || a.playerId;
      return `${i + 1}. 🚗 Placa: ${a.vehiclePlate || 'Registrado'} — ${name}`;
    });
    const text = `🚗 *PLANILLA DE VEHÍCULOS / PARQUEADERO - MIZPA FC*\n📍 *Sede:* ${match.location}\n📅 *Fecha:* ${formattedDate}\n\n${lines.join('\n')}\n\nTotal autorizados: ${vehicleList.length} vehículos.`;
    navigator.clipboard.writeText(text);
    setFeedback({ success: true, message: 'Lista de parqueadero copiada al portapapeles para portería/vigilancia.' });
  };

  const getPlayerDisplayName = (player?: Player | null, fallbackId?: string) => {
    if (!player) return fallbackId || 'Jugador';
    if (player.fullName.toLowerCase().includes('fabian') || player.role === 'ADMIN') {
      return 'Fabián Téllez (Admin)';
    }
    const alias = player.alias && player.alias.trim() !== player.fullName.trim()
      ? player.alias.replace(/^\(+|\)+$/g, '').trim()
      : '';
    return alias ? `${player.fullName} (${alias})` : player.fullName;
  };

  const renderAttendanceName = (att: Attendance) => {
    const hostPlayer = getPlayer(att.playerId);
    return (
      <div className="space-y-0.5">
        {att.guestName ? (
          <div>
            <span className="font-semibold text-emerald-300">👥 {att.guestName}</span>
            <span className="ml-2 text-xs text-zinc-400">
              (Invitado +1 de {getPlayerDisplayName(hostPlayer, att.playerId)})
            </span>
          </div>
        ) : (
          <span className="font-medium text-zinc-100">
            ⚽ {getPlayerDisplayName(hostPlayer, att.playerId)}
          </span>
        )}
        {att.vehiclePlate && (
          <div>
            <span className="inline-flex items-center gap-1 text-[11px] font-mono text-zinc-300 bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700">
              🚗 Placa: <strong className="text-emerald-400 font-bold">{att.vehiclePlate}</strong>
            </span>
          </div>
        )}
      </div>
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
            {match && (
              <Badge
                variant={isSettled ? 'success' : match.status === 'OPEN_REGISTRATION' ? 'default' : 'warning'}
                className="text-xs uppercase tracking-wider font-mono"
              >
                {match.status}
              </Badge>
            )}
          </div>

          {match ? (
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
          ) : (
            <p className="text-zinc-400 text-sm mt-1">
              Panel de control y liquidación oficial de partidos Mizpa FC.
            </p>
          )}
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

          {match && (
            <>
              <Button
                onClick={handleOpenEditModal}
                variant="outline"
                size="default"
                className="border-amber-500/30 bg-amber-950/20 hover:bg-amber-900/40 text-amber-300 hover:text-amber-100 hover:border-amber-500/60 shadow-sm hover:shadow-amber-500/10 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 text-xs sm:text-sm font-semibold rounded-lg px-3.5 py-2 flex items-center gap-2 group"
              >
                <Edit2 className="w-4 h-4 text-amber-400 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-200" />
                <span>Editar Partido</span>
              </Button>

              <Button
                onClick={() => setShowDeleteConfirm(true)}
                variant="outline"
                size="default"
                disabled={isSettled || isPending}
                className="border-rose-500/30 bg-rose-950/20 hover:bg-rose-900/40 text-rose-300 hover:text-rose-100 hover:border-rose-500/60 shadow-sm hover:shadow-rose-500/10 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 text-xs sm:text-sm font-semibold rounded-lg px-3.5 py-2 flex items-center gap-2 group disabled:opacity-50 disabled:pointer-events-none"
              >
                <Trash2 className="w-4 h-4 text-rose-400 group-hover:scale-110 group-hover:-rotate-6 transition-transform duration-200" />
                <span>Eliminar</span>
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
            </>
          )}
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
                    placeholder="Ej: Abedules de Santa Fe"
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
                    placeholder="Ej: Cra. 20 #185-58, Bogotá"
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
                    ⏱️ Duración del Partido (Horas):
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="6"
                    step="0.5"
                    value={newDurationHours}
                    onChange={(e) => setNewDurationHours(Number(e.target.value))}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <p className="text-[11px] text-zinc-400 mt-1">
                    Generalmente 2 horas de juego.
                  </p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">
                    🚗 Tarifa Parqueadero por Hora (COP):
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={newParkingFeePerHour}
                    onChange={(e) => setNewParkingFeePerHour(Number(e.target.value))}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <p className="text-[11px] text-zinc-400 mt-1">
                    $1.000 COP/h = ${(newDurationHours * newParkingFeePerHour).toLocaleString('es-CO')} COP solo para quienes lleven vehículo.
                  </p>
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

      {/* Modal / Card para Editar Partido Existente */}
      {showEditModal && match && (
        <Card className="border-amber-600/50 bg-gradient-to-b from-zinc-900 to-zinc-950 shadow-2xl animate-in fade-in duration-200">
          <CardHeader className="pb-3 border-b border-zinc-800 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2 text-white">
                <Edit2 className="w-5 h-5 text-amber-400" /> Editar Convocatoria / Partido
              </CardTitle>
              <CardDescription className="text-xs text-zinc-400">
                Modifica los datos del partido, la cancha, el horario, el enlace a mapas, los costos o el cupo.
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowEditModal(false)}
              className="text-zinc-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={handleUpdateMatchSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">
                    📍 Nombre de la Sede / Cancha:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Abedules de Santa Fe"
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">
                    🗺️ Dirección de la Cancha (para Google Maps):
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Cra. 20 #185-58, Bogotá"
                    value={editLocationAddress}
                    onChange={(e) => setEditLocationAddress(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">
                    🔗 Enlace de Google Maps:
                  </label>
                  <input
                    type="url"
                    placeholder="Ej: https://maps.app.goo.gl/..."
                    value={editGoogleMapsUrl}
                    onChange={(e) => setEditGoogleMapsUrl(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">
                    📅 Fecha y Hora del Partido:
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
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
                    value={editPitchCost}
                    onChange={(e) => setEditPitchCost(Number(e.target.value))}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">
                    ➕ Costos Extras (Petos/Árbitro) (COP):
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={editExtraCosts}
                    onChange={(e) => setEditExtraCosts(Number(e.target.value))}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">
                    ⏱️ Duración del Partido (Horas):
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    step="0.5"
                    value={editDurationHours}
                    onChange={(e) => setEditDurationHours(Number(e.target.value))}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">
                    🚗 Tarifa Parqueadero por Hora (COP):
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={editParkingFeePerHour}
                    onChange={(e) => setEditParkingFeePerHour(Number(e.target.value))}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
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
                    value={editMaxPlayers}
                    onChange={(e) => setEditMaxPlayers(Number(e.target.value))}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">
                    📌 Estado del Partido:
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as MatchStatus)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="OPEN_REGISTRATION">OPEN_REGISTRATION (Convocatoria Abierta)</option>
                    <option value="DRAFT">DRAFT (Borrador)</option>
                    <option value="PLAYED">PLAYED (Jugado)</option>
                    <option value="CANCELLED">CANCELLED (Cancelado)</option>
                  </select>
                </div>
              </div>

              {/* Submit buttons */}
              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowEditModal(false)}
                  className="text-zinc-400"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isPending}
                  className="bg-amber-600 hover:bg-amber-500 text-white font-bold gap-2"
                >
                  {isPending ? 'Guardando Cambios...' : '💾 Guardar Cambios'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Confirmation Dialog / Card para Eliminar Convocatoria */}
      {showDeleteConfirm && match && (
        <Card className="border-red-600/50 bg-gradient-to-b from-red-950/40 to-zinc-950 shadow-2xl animate-in fade-in duration-200">
          <CardHeader className="pb-3 border-b border-zinc-800 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2 text-red-400">
              <Trash2 className="w-5 h-5" />
              <CardTitle className="text-base font-bold text-red-200">
                ¿Eliminar esta convocatoria?
              </CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDeleteConfirm(false)}
              className="text-zinc-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            <p className="text-sm text-zinc-300">
              Estás a punto de eliminar el partido en <strong className="text-white">{match.location}</strong> programado para el{' '}
              <strong className="text-white">
                {new Date(match.date).toLocaleDateString('es-CO', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </strong>.
            </p>
            <p className="text-xs text-red-400/90">
              ⚠️ Se eliminarán los registros de inscripción de este partido. Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDeleteConfirm(false)}
                className="text-zinc-400"
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteMatch}
                disabled={isPending}
                className="bg-red-600 hover:bg-red-500 text-white font-bold gap-1.5"
              >
                {isPending ? 'Eliminando...' : '🗑️ Sí, Eliminar Convocatoria'}
              </Button>
            </div>
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

      {!match ? (
        <Card className="border-zinc-800 bg-zinc-900/50 p-10 text-center space-y-5">
          <div className="w-16 h-16 bg-emerald-950/80 border border-emerald-700 rounded-full flex items-center justify-center mx-auto text-3xl">
            ⚽
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <h2 className="text-xl font-bold text-white">¡No hay partidos registrados aún!</h2>
            <p className="text-sm text-zinc-400">
              Comienza creando tu primer partido oficial. Se generará automáticamente el enlace de inscripción pública para compartir en tu grupo de WhatsApp.
            </p>
          </div>
          <div>
            <Button
              onClick={() => setShowCreateModal(true)}
              size="lg"
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-2 shadow-lg"
            >
              <PlusCircle className="w-5 h-5" /> Crear Primer Partido
            </Button>
          </div>
        </Card>
      ) : (
        <>
          {/* Metric Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Cost Breakdown */}
            <Card className="border-zinc-800 bg-zinc-900/60 shadow-md">
              <CardHeader className="pb-2">
                <CardDescription className="text-zinc-400 flex items-center gap-1.5 text-xs">
                  <DollarSign className="w-4 h-4 text-emerald-400" /> Alquiler de Cancha
                </CardDescription>
                <CardTitle className="text-2xl font-mono text-white">
                  ${match.pitchRentalCost.toLocaleString('es-CO')} COP
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-zinc-400 space-y-1">
                <div className="flex justify-between py-1 border-b border-zinc-800">
                  <span>Duración del Partido:</span>
                  <span className="text-zinc-200 font-semibold">{durationHours} Horas</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>Tarifa Parqueadero:</span>
                  <span className="text-emerald-400 font-mono font-medium">
                    ${parkingFeePerHour.toLocaleString('es-CO')}/h (+${vehicleParkingFee.toLocaleString('es-CO')} solo vehículos)
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Attendance Metrics */}
            <Card className="border-zinc-800 bg-zinc-900/60 shadow-md">
              <CardHeader className="pb-2">
                <CardDescription className="text-zinc-400 flex items-center gap-1.5 text-xs">
                  <Users className="w-4 h-4 text-emerald-400" /> Nómina & Cupo Oficial
                </CardDescription>
                <CardTitle className="text-2xl font-mono text-white">
                  {confirmedCount} <span className="text-sm font-sans text-zinc-500">/ {maxPlayers}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-zinc-400 space-y-1">
                <div className="flex justify-between py-1 border-b border-zinc-800">
                  <span>Presentes en Cancha (Check-In):</span>
                  <span className="text-emerald-400 font-semibold">{attendedCount} jugadores</span>
                </div>
                <div className="flex justify-between py-1 border-b border-zinc-800">
                  <span>Vehículos Registrados:</span>
                  <span className="text-zinc-200 font-semibold">{vehicleList.length} vehículos 🚗</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>Lista de Espera:</span>
                  <span className="text-amber-400 font-semibold">{waitlistCount} en espera</span>
                </div>
              </CardContent>
            </Card>

            {/* Real-time Dynamic Fee Calculation */}
            <Card className="border-zinc-800 bg-zinc-900/60 shadow-md">
              <CardHeader className="pb-2">
                <CardDescription className="text-zinc-400 flex items-center gap-1.5 text-xs">
                  <DollarSign className="w-4 h-4 text-emerald-400" /> Cuota Cancha Estimada / Jugador
                </CardDescription>
                <CardTitle className="text-2xl font-mono text-emerald-400">
                  ${basePitchFee.toLocaleString('es-CO')} COP
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-zinc-400 space-y-1">
                <div className="flex justify-between py-1 border-b border-zinc-800">
                  <span>Cálculo Cancha:</span>
                  <span className="font-mono text-zinc-300">
                    Cancha / {attendedCount > 0 ? `${attendedCount} presentes` : `${maxPlayers} cupos`}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span>Con Vehículo:</span>
                  <span className="font-mono text-emerald-400 font-bold">
                    +${vehicleParkingFee.toLocaleString('es-CO')} COP ({durationHours}h)
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Direct RSVP Shareable Banner */}
          <Card className="border-emerald-700/50 bg-gradient-to-r from-zinc-900 via-zinc-900 to-emerald-950/30">
            <CardContent className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-950/80 border border-emerald-700/50 rounded-lg text-emerald-400">
                  <Share2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    Link de Inscripción para Jugadores (RSVP)
                  </h3>
                  <p className="text-xs text-zinc-400 font-mono">
                    /rsvp/{match.id}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Link href={`/rsvp/${match.id}`} target="_blank">
                  <Button variant="outline" size="sm" className="text-xs gap-1.5">
                    <ExternalLink className="w-3.5 h-3.5" /> Abrir Formulario de Registro
                  </Button>
                </Link>
                <Link href="/notifications">
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs gap-1.5">
                    <Share2 className="w-3.5 h-3.5" /> Compartir en WhatsApp
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Guest Registration Form (+1) */}
          {!isSettled && (
            <Card className="border-zinc-800 bg-zinc-900/40">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-zinc-200">
                  <UserPlus className="w-4 h-4 text-emerald-400" /> Registrar Invitado (+1) para este Partido
                </CardTitle>
                <CardDescription className="text-xs text-zinc-400">
                  Un jugador anfitrión puede registrar acompañantes (+1, +2). La cuota del invitado se cargará al jugador anfitrión al liquidar.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddGuest} className="flex flex-col sm:flex-row gap-3 items-end">
                  <div className="w-full sm:w-1/3">
                    <label className="text-xs text-zinc-400 block mb-1">Jugador Anfitrión:</label>
                    <select
                      value={selectedHostPlayerId}
                      onChange={(e) => setSelectedHostPlayerId(e.target.value)}
                      className="w-full bg-zinc-800 border border-zinc-700 text-zinc-100 text-xs rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      {players.map((p) => (
                        <option key={p.id} value={p.id}>
                          {getPlayerDisplayName(p)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="w-full sm:flex-1">
                    <label className="text-xs text-zinc-400 block mb-1">Nombre del Invitado (+1):</label>
                    <input
                      type="text"
                      placeholder="Ej: Camilo Andrés (Amigo)"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      className="w-full bg-zinc-800 border border-zinc-700 text-zinc-100 text-xs rounded-md px-3 py-2 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={isPending || !guestName.trim()}
                    size="sm"
                    className="w-full sm:w-auto text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
                  >
                    + Registrar Invitado (+1)
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Attendances & Squad Table */}
          <Card className="border-zinc-800 bg-zinc-900/60 shadow-md overflow-hidden">
            <CardHeader className="pb-3 border-b border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2 text-white">
                  <Users className="w-4 h-4 text-emerald-400" /> Nómina Oficial de Jugadores ({confirmedCount}/{maxPlayers})
                </CardTitle>
                <CardDescription className="text-xs text-zinc-400">
                  Control de asistencia en cancha, lista de espera automática a partir de {maxPlayers} jugadores y liquidación individual.
                </CardDescription>
              </div>

              <div className="flex items-center gap-2">
                {vehicleList.length > 0 && (
                  <Button
                    onClick={handleCopyParkingList}
                    variant="outline"
                    size="sm"
                    className="text-xs h-7 gap-1 border-zinc-700 hover:bg-zinc-800 text-zinc-300"
                    title="Copiar lista de placas para la administración/portería"
                  >
                    <Car className="w-3.5 h-3.5 text-emerald-400" />
                    Copiar Lista Vehículos ({vehicleList.length})
                  </Button>
                )}
                <span className="text-xs font-mono text-zinc-400 bg-zinc-800 px-2 py-1 rounded">
                  {attendances.length} registros
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {attendances.length === 0 ? (
                <div className="p-8 text-center text-zinc-500 text-sm">
                  Aún no hay inscripciones para este partido. ¡Comparte el enlace de WhatsApp para abrir la convocatoria!
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-800 hover:bg-transparent">
                      <TableHead className="w-8">#</TableHead>
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

                      const isVehicleDriver = !!(att.hasVehicle || att.vehiclePlate);
                      const playerFee = basePitchFee + (isVehicleDriver ? vehicleParkingFee : 0);

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
                          <TableCell className="font-mono text-xs">
                            {isAttended ? (
                              <div>
                                <span className="font-bold text-emerald-400">
                                  ${playerFee.toLocaleString('es-CO')} COP
                                </span>
                                {isVehicleDriver && (
                                  <span className="text-[10px] text-zinc-400 block font-normal">
                                    (${basePitchFee.toLocaleString('es-CO')} cancha + 🚗 ${vehicleParkingFee.toLocaleString('es-CO')} parqueadero)
                                  </span>
                                )}
                              </div>
                            ) : isCancelled ? (
                              <span className="text-zinc-500">$0</span>
                            ) : (
                              <div>
                                <span className="text-zinc-400 font-medium">
                                  ${playerFee.toLocaleString('es-CO')} COP
                                </span>
                                <span className="text-[10px] text-zinc-500 block">
                                  (Pendiente check-in)
                                </span>
                              </div>
                            )}
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
        </>
      )}
    </div>
  );
}
