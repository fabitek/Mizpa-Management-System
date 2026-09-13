'use client';

import * as React from 'react';
import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card.tsx';
import { Badge } from '../ui/badge.tsx';
import { Button } from '../ui/button.tsx';
import { registerAttendanceAction, cancelAttendanceAction } from '../../app/actions/rsvp-actions.ts';
import type { Match, Attendance, Player } from '../../core/domain/types.ts';
import {
  Calendar,
  MapPin,
  Users,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Share2,
  Copy,
  UserPlus,
  Clock,
  ArrowRight,
  UserCheck,
  User,
  Sparkles,
} from 'lucide-react';

interface PublicRsvpViewProps {
  match: Match;
  initialAttendances: Attendance[];
  players: Player[];
}

export function PublicRsvpView({
  match,
  initialAttendances,
  players,
}: PublicRsvpViewProps) {
  const [attendances, setAttendances] = useState<Attendance[]>(initialAttendances);
  
  // Registration form mode: 'existing' or 'new'
  const [registerMode, setRegisterMode] = useState<'existing' | 'new'>('existing');

  // Find first available player who isn't already registered
  const registeredPlayerIds = new Set(
    attendances
      .filter((a) => a.status === 'CONFIRMED' || a.status === 'WAITLIST' || a.status === 'ATTENDED')
      .map((a) => a.playerId)
  );

  const availablePlayers = players.filter((p) => !registeredPlayerIds.has(p.id));

  const [selectedPlayerId, setSelectedPlayerId] = useState<string>(
    availablePlayers[0]?.id || players[0]?.id || ''
  );
  const [newPlayerName, setNewPlayerName] = useState<string>('');
  const [newPlayerPhone, setNewPlayerPhone] = useState<string>('');
  const [hasGuest, setHasGuest] = useState<boolean>(false);
  const [guestName, setGuestName] = useState<string>('');
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [origin, setOrigin] = useState<string>('');

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
  }, []);

  const confirmedList = attendances.filter(
    (a) => a.status === 'CONFIRMED' || a.status === 'ATTENDED'
  );
  const waitlistList = attendances.filter((a) => a.status === 'WAITLIST');
  const maxPlayers = match.maxPlayers || 18;
  const isFull = confirmedList.length >= maxPlayers;
  const isRegistrationOpen = match.status === 'OPEN_REGISTRATION' || match.status === 'DRAFT';
  const openSpots = Math.max(0, maxPlayers - confirmedList.length);

  const estFee = Math.ceil(
    (match.pitchRentalCost + match.extraCosts) / maxPlayers
  );

  const getPlayer = (id: string) => players.find((p) => p.id === id);

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();

    let playerIdToUse = selectedPlayerId;
    let displayName = '';

    if (registerMode === 'new') {
      if (!newPlayerName.trim()) {
        setFeedback({ success: false, message: 'Por favor ingresa tu nombre y apellido.' });
        return;
      }
      // Generate unique player ID based on name
      const slug = newPlayerName.trim().toLowerCase().replace(/[^a-z0-9]/g, '-');
      playerIdToUse = `guest-${slug}-${Date.now().toString().slice(-4)}`;
      displayName = newPlayerName.trim();
    } else {
      if (!selectedPlayerId) {
        setFeedback({ success: false, message: 'Por favor selecciona un jugador de la lista.' });
        return;
      }
      const p = getPlayer(selectedPlayerId);
      displayName = p ? p.fullName : selectedPlayerId;
    }

    if (hasGuest && !guestName.trim()) {
      setFeedback({ success: false, message: 'Por favor ingresa el nombre de tu invitado (+1).' });
      return;
    }

    startTransition(async () => {
      // 1. If user is registering a guest along with themselves
      const guestToRegister = hasGuest ? guestName.trim() : undefined;
      
      const res = await registerAttendanceAction(match.id, playerIdToUse, guestToRegister);

      setFeedback(res);
      if (res.success && res.data) {
        const newAtt = (res.data as any).attendance;
        
        // If it was a new player, attach their custom display name if needed
        if (registerMode === 'new' && !newAtt.guestName) {
          newAtt.guestName = displayName;
        }

        setAttendances((prev) => {
          const exists = prev.some((a) => a.id === newAtt.id);
          return exists ? prev : [...prev, newAtt];
        });

        if (hasGuest) {
          setGuestName('');
          setHasGuest(false);
        }
        if (registerMode === 'new') {
          setNewPlayerName('');
          setNewPlayerPhone('');
        }
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

  const formattedDate = new Date(match.date).toLocaleString('es-CO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const cleanLoc = match.location.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim();
  const cleanAddr = match.locationAddress ? match.locationAddress.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim() : '';
  const fullQuery = cleanAddr ? `${cleanAddr} ${cleanLoc}`.trim() : cleanLoc;

  const mapsUrlToUse =
    match.googleMapsUrl && !match.googleMapsUrl.includes('%E2%9A%BD')
      ? match.googleMapsUrl
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullQuery || match.location)}`;

  const rsvpLink = `${(process.env.NEXT_PUBLIC_SITE_URL || origin || 'https://mizpa-fc.vercel.app').replace(/\/+$/, '')}/rsvp/${match.id}`;

  const shareText =
    `⚽ *¡CONVOCATORIA OFICIAL MIZPA FC!* ⚽\n\n` +
    `🔗 *INSCRÍBETE AQUÍ (FORMULARIO OFICIAL):*\n` +
    `👉 ${rsvpLink}\n\n` +
    `📍 *Cancha:* ${match.location}${match.locationAddress ? ` (${match.locationAddress})` : ''}\n` +
    `📅 *Fecha:* ${formattedDate}\n` +
    `👥 *Cupos:* ${confirmedList.length}/${maxPlayers} (${openSpots > 0 ? `¡Quedan ${openSpots} cupos!` : 'Lista de espera'})\n` +
    `💵 *Cuota estimada:* $${estFee.toLocaleString('es-CO')} COP\n` +
    (mapsUrlToUse ? `🗺️ *Mapa / Cómo llegar:* ${mapsUrlToUse}\n` : '') +
    `\n📌 *Para tener en cuenta:*\n` +
    `👟 *Calzado:* Únicamente tenis o zapatillas para cancha sintética (sin taches / cero guayos).\n` +
    `🤝 *Ambiente:* Juego limpio, respeto y compañerismo.\n\n` +
    `¿Cómo confirmar tu cupo?\n` +
    `1️⃣ Haz clic en el enlace oficial de arriba:\n` +
    `🔗 ${rsvpLink}\n` +
    `2️⃣ Elige tu nombre o regístrate con tu invitado (+1).\n\n` +
    `⚠️ *Nota:* Al llenarse los ${maxPlayers} cupos titulares, los siguientes registros ingresarán automáticamente a Lista de Espera.`;

  const handleShareWhatsApp = () => {
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank');
  };

  const handleCopyLink = () => {
    const url = typeof window !== 'undefined' ? window.location.href : `/rsvp/${match.id}`;
    navigator.clipboard.writeText(url);
    setFeedback({ success: true, message: 'Enlace del formulario de inscripción copiado al portapapeles.' });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* Brand & Match Convocation Banner */}
      <div className="bg-gradient-to-b from-emerald-950/70 to-zinc-900/90 border border-emerald-800/40 rounded-2xl p-6 shadow-xl backdrop-blur-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-emerald-800/30">
          <div className="flex items-center gap-3">
            <span className="text-3xl">⚽</span>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white uppercase flex items-center gap-2">
                <span>MIZPA FC</span>
                <span className="text-emerald-400 font-light">• Convocatoria</span>
              </h1>
              <p className="text-xs text-emerald-300 font-medium">
                Formulario Oficial de Inscripción & RSVP
              </p>
            </div>
          </div>
          <Badge
            variant={isFull ? 'warning' : isRegistrationOpen ? 'success' : 'secondary'}
            className="text-xs px-3 py-1 font-mono uppercase"
          >
            {isFull ? 'Lista de Espera Activa' : isRegistrationOpen ? `Cupos Abiertos (${openSpots} Libres)` : match.status}
          </Badge>
        </div>

        {/* Match Key Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 text-sm">
          <div className="flex items-start gap-3 bg-zinc-950/40 p-3 rounded-lg border border-zinc-800/60">
            <MapPin className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <span className="text-xs text-zinc-400 block font-medium">Sede / Cancha</span>
              <span className="font-semibold text-zinc-100 text-base block">{match.location}</span>
              {match.locationAddress && (
                <span className="text-xs text-zinc-400 block mt-0.5">{match.locationAddress}</span>
              )}
              <a
                href={mapsUrlToUse}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 hover:underline mt-2 font-medium bg-emerald-950/50 px-2 py-1 rounded border border-emerald-800/40"
              >
                🗺️ Ver en Google Maps ↗
              </a>
            </div>
          </div>

          <div className="flex items-start gap-3 bg-zinc-950/40 p-3 rounded-lg border border-zinc-800/60">
            <Calendar className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-xs text-zinc-400 block font-medium">Fecha y Hora</span>
              <span className="font-semibold text-zinc-100 capitalize" suppressHydrationWarning>
                {formattedDate}
              </span>
            </div>
          </div>

          <div className="flex items-start gap-3 bg-zinc-950/40 p-3 rounded-lg border border-zinc-800/60">
            <DollarSign className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-xs text-zinc-400 block font-medium">Cuota Estimada</span>
              <span className="font-semibold text-emerald-400 font-mono text-base">
                ${estFee.toLocaleString('es-CO')} COP
              </span>
            </div>
          </div>

          <div className="flex items-start gap-3 bg-zinc-950/40 p-3 rounded-lg border border-zinc-800/60">
            <Users className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div className="w-full">
              <div className="flex justify-between items-center text-xs text-zinc-400 mb-1">
                <span>Cupos Nómina</span>
                <span className="font-mono text-zinc-200 font-semibold">
                  {confirmedList.length} / {maxPlayers} {openSpots > 0 ? `(${openSpots} disponibles)` : '(Lleno)'}
                </span>
              </div>
              <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    isFull ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, (confirmedList.length / maxPlayers) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Community Rules Section: Calzado y Ambiente */}
        <div className="mt-4 p-3.5 bg-zinc-950/60 rounded-xl border border-emerald-900/30 text-xs text-zinc-300 space-y-2">
          <p className="font-semibold text-emerald-300 text-xs uppercase tracking-wider flex items-center gap-1.5">
            📌 Para tener en cuenta:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="flex items-start gap-2 bg-zinc-900/80 p-2.5 rounded-lg border border-zinc-800/80">
              <span className="text-base">👟</span>
              <div>
                <strong className="text-zinc-100 block">Calzado Obligatorio:</strong>
                <span className="text-zinc-400">Únicamente tenis o zapatillas para cancha sintética (sin taches / cero guayos).</span>
              </div>
            </div>
            <div className="flex items-start gap-2 bg-zinc-900/80 p-2.5 rounded-lg border border-zinc-800/80">
              <span className="text-base">🤝</span>
              <div>
                <strong className="text-zinc-100 block">Ambiente:</strong>
                <span className="text-zinc-400">Juego limpio, respeto y compañerismo. Venimos a disfrutar y compartir.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Share Buttons */}
        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-emerald-800/20">
          <Button
            onClick={handleShareWhatsApp}
            size="sm"
            className="gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
          >
            <Share2 className="w-3.5 h-3.5" /> Reenviar Convocatoria a WhatsApp
          </Button>
          <Button
            onClick={handleCopyLink}
            variant="outline"
            size="sm"
            className="border-zinc-700 text-zinc-300 text-xs gap-1.5"
          >
            <Copy className="w-3.5 h-3.5" /> Copiar Link de Registro
          </Button>
        </div>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`p-4 rounded-xl flex items-start gap-3 border ${
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
            <p className="font-semibold text-sm">{feedback.success ? '¡Inscripción Exitosa!' : 'Atención'}</p>
            <p className="text-xs opacity-90">{feedback.message}</p>
          </div>
        </div>
      )}

      {/* RSVP Registration Form */}
      {isRegistrationOpen && (
        <Card className="border-zinc-800 bg-zinc-900/60 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2 text-white">
              <UserCheck className="w-5 h-5 text-emerald-400" />
              {isFull ? 'Inscripción en Lista de Espera' : 'Formulario de Inscripción al Partido'}
            </CardTitle>
            <CardDescription className="text-xs text-zinc-400">
              {isFull
                ? `El cupo titular de ${maxPlayers} jugadores está completo. Los nuevos registros entrarán en Lista de Espera automática y se promoverán si alguien cancela.`
                : 'Completa tus datos para asegurar tu cupo inmediatamente en la nómina titular.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Mode Switcher Tabs */}
            <div className="flex gap-2 p-1 bg-zinc-950 rounded-lg border border-zinc-800 mb-4">
              <button
                type="button"
                onClick={() => setRegisterMode('existing')}
                className={`flex-1 py-1.5 px-3 rounded-md text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                  registerMode === 'existing'
                    ? 'bg-zinc-800 text-emerald-400 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <User className="w-3.5 h-3.5" /> Jugador Registrado del Club
              </button>
              <button
                type="button"
                onClick={() => setRegisterMode('new')}
                className={`flex-1 py-1.5 px-3 rounded-md text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                  registerMode === 'new'
                    ? 'bg-zinc-800 text-emerald-400 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" /> Nuevo Jugador / Amigo
              </button>
            </div>

            <form onSubmit={handleRegister} className="space-y-4">
              {registerMode === 'existing' ? (
                <div>
                  <label className="text-xs text-zinc-300 block mb-1 font-medium">
                    Selecciona tu Nombre:
                  </label>
                  <select
                    value={selectedPlayerId}
                    onChange={(e) => setSelectedPlayerId(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {players.map((p) => {
                      const isRegistered = registeredPlayerIds.has(p.id);
                      return (
                        <option
                          key={p.id}
                          value={p.id}
                          disabled={isRegistered}
                          className={isRegistered ? 'text-zinc-500 bg-zinc-900' : 'text-zinc-100'}
                        >
                          {p.fullName} ({p.alias || 'Jugador'}) {isRegistered ? '— (Ya Inscrito ✓)' : '— [Disponible]'}
                        </option>
                      );
                    })}
                  </select>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-zinc-300 block mb-1 font-medium">
                      Nombre y Apellido:
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: Daniel Moreno"
                      value={newPlayerName}
                      onChange={(e) => setNewPlayerName(e.target.value)}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-300 block mb-1 font-medium">
                      Teléfono WhatsApp (Opcional):
                    </label>
                    <input
                      type="text"
                      placeholder="+57 300 1234567"
                      value={newPlayerPhone}
                      onChange={(e) => setNewPlayerPhone(e.target.value)}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              )}

              {/* Guest (+1) Option */}
              <div className="pt-2 border-t border-zinc-800/80">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-300 select-none">
                  <input
                    type="checkbox"
                    checked={hasGuest}
                    onChange={(e) => setHasGuest(e.target.checked)}
                    className="rounded border-zinc-700 bg-zinc-800 text-emerald-500 focus:ring-emerald-500"
                  />
                  <span>Voy a registrar a un acompañante / invitado (+1)</span>
                </label>

                {hasGuest && (
                  <div className="mt-3">
                    <label className="text-xs text-zinc-400 block mb-1">
                      Nombre completo de tu invitado (+1):
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: Camilo Andrés (Amigo)"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-zinc-500"
                    />
                    <p className="text-[11px] text-zinc-500 mt-1">
                      Nota: La cuota del invitado será asignada a tu nombre al liquidar el partido.
                    </p>
                  </div>
                )}
              </div>

              <Button
                type="submit"
                disabled={isPending}
                size="lg"
                className={`w-full font-bold gap-2 text-sm shadow-md transition-all ${
                  isFull
                    ? 'bg-amber-600 hover:bg-amber-500 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
              >
                {isPending ? (
                  'Inscribiendo...'
                ) : isFull ? (
                  <>
                    <Clock className="w-4 h-4" /> Entrar a Lista de Espera (Turno #{waitlistList.length + 1})
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" /> ¡Inscribirme al Partido! ⚽
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Squad Roster */}
      <div className="space-y-4">
        {/* Confirmed Players Card */}
        <Card className="border-zinc-800 bg-zinc-900/60 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between text-zinc-200">
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                Nómina Titular Confirmada ({confirmedList.length}/{maxPlayers})
              </span>
              <span className="text-xs font-normal text-zinc-400 font-mono">
                {isFull ? 'Cupo Completo' : `${openSpots} cupos libres`}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {confirmedList.length === 0 ? (
              <p className="text-xs text-zinc-500 py-4 text-center">
                Aún no hay jugadores confirmados. ¡Sé el primero en anotarte!
              </p>
            ) : (
              <div className="divide-y divide-zinc-800/70">
                {confirmedList.map((att, idx) => {
                  const host = getPlayer(att.playerId);
                  return (
                    <div
                      key={att.id}
                      className="py-2.5 flex items-center justify-between text-sm"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-xs font-mono text-emerald-400 font-bold w-5">
                          #{idx + 1}
                        </span>
                        <div>
                          {att.guestName ? (
                            <span className="font-semibold text-emerald-300">
                              👥 {att.guestName}{' '}
                              <span className="text-xs text-zinc-400 font-normal">
                                (+1 de {host?.fullName || 'Anfitrión'})
                              </span>
                            </span>
                          ) : (
                            <span className="font-medium text-zinc-100">
                              ⚽ {host?.fullName || att.playerId}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge variant="success" className="text-[10px]">
                          {att.status === 'ATTENDED' ? 'En Cancha' : 'Confirmado'}
                        </Badge>
                        {isRegistrationOpen && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCancelAttendance(att.id)}
                            className="text-xs text-zinc-500 hover:text-red-400 h-6 px-1.5"
                            title="Liberar cupo"
                          >
                            Ceder
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Waitlist Card */}
        {waitlistList.length > 0 && (
          <Card className="border-amber-900/40 bg-amber-950/10 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-amber-300">
                <Clock className="w-4 h-4 text-amber-400" />
                Lista de Espera por Orden de Llegada ({waitlistList.length})
              </CardTitle>
              <CardDescription className="text-xs text-amber-200/70">
                Si un jugador titular cede su cupo, la persona en el turno #1 es promovida de manera automática.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-zinc-800/70">
                {waitlistList.map((att, idx) => {
                  const host = getPlayer(att.playerId);
                  return (
                    <div
                      key={att.id}
                      className="py-2.5 flex items-center justify-between text-sm"
                    >
                      <div className="flex items-center gap-2.5">
                        <Badge variant="warning" className="text-[10px] font-mono">
                          Espera #{idx + 1}
                        </Badge>
                        <span className="font-medium text-zinc-200">
                          {att.guestName ? `👥 ${att.guestName} (+1)` : host?.fullName || att.playerId}
                        </span>
                      </div>
                      {isRegistrationOpen && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCancelAttendance(att.id)}
                          className="text-xs text-zinc-500 hover:text-red-400 h-6 px-1.5"
                        >
                          Salir
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Navigation footer */}
      <div className="pt-4 border-t border-zinc-800 text-center">
        <Link
          href="/matches"
          className="text-xs text-zinc-400 hover:text-emerald-400 inline-flex items-center gap-1 transition-colors"
        >
          Ir al Panel de Administración de Partidos <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
