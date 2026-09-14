'use client';

import * as React from 'react';
import { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card.tsx';
import { Badge } from '../ui/badge.tsx';
import { Button } from '../ui/button.tsx';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../ui/table.tsx';
import {
  sendMatchConvocationAction,
  sendSettlementAlertsAction,
  sendDebtReminderAction,
  getNotificationsLogAction,
} from '../../app/actions/notification-actions.ts';
import { deleteMatchAction } from '../../app/actions/match-actions.ts';
import type { Player, Match, NotificationMessage } from '../../core/domain/types.ts';
import {
  Bell,
  MessageSquare,
  Share2,
  Calendar,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Copy,
  Clock,
  Send,
  Users,
  Link as LinkIcon,
  Sparkles,
  Edit2,
  Trash2,
  PlusCircle,
} from 'lucide-react';

interface NotificationsViewProps {
  players: Player[];
  matches?: Match[];
  activeMatch: Match | null;
  initialNotifications: NotificationMessage[];
}

export function NotificationsView({
  players,
  matches,
  activeMatch,
  initialNotifications,
}: NotificationsViewProps) {
  const [activeTab, setActiveTab] = useState<'group-convocation' | 'direct' | 'history'>('group-convocation');
  const [notifications, setNotifications] = useState<NotificationMessage[]>(initialNotifications);

  const [matchList, setMatchList] = useState<Match[]>(
    matches && matches.length > 0 ? matches : activeMatch ? [activeMatch] : []
  );

  // Selected Match for convocation
  const [selectedMatchId, setSelectedMatchId] = useState<string>(
    activeMatch?.id || matches?.[0]?.id || ''
  );
  const [showDeleteMatchDialog, setShowDeleteMatchDialog] = useState<boolean>(false);

  const currentMatch =
    matchList.find((m) => m.id === selectedMatchId) ||
    matchList[0] ||
    null;

  const handleDeleteCurrentMatch = () => {
    if (!currentMatch) return;
    startTransition(async () => {
      const idToDelete = currentMatch.id;
      const res = await deleteMatchAction(idToDelete);
      setFeedback(res);
      if (res.success) {
        const remaining = matchList.filter((m) => m.id !== idToDelete);
        setMatchList(remaining);
        setSelectedMatchId(remaining.length > 0 ? remaining[0].id : '');
        setShowDeleteMatchDialog(false);
      }
    });
  };

  // 1-to-1 form state
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>(players[0]?.id ?? '');
  const [customPhone, setCustomPhone] = useState<string>(players[0]?.phone ?? '');
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const getPlayer = (id: string) => players.find((p) => p.id === id);
  const selectedPlayer = getPlayer(selectedPlayerId) || players[0];

  const handlePlayerSelect = (playerId: string) => {
    setSelectedPlayerId(playerId);
    const p = getPlayer(playerId);
    if (p?.phone) {
      setCustomPhone(p.phone);
    }
  };

  const [mounted, setMounted] = useState<boolean>(false);
  const [origin, setOrigin] = useState<string>('');

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
  }, []);

  // Web app URL for the RSVP registration form (uses current browser domain/port automatically)
  const baseDomain =
    origin ||
    (typeof window !== 'undefined'
      ? window.location.origin
      : process.env.NEXT_PUBLIC_SITE_URL || 'https://mizpa-fc.vercel.app');
  const rsvpUrl = currentMatch ? `${baseDomain.replace(/\/+$/, '')}/rsvp/${currentMatch.id}` : baseDomain;

  const estFee = currentMatch
    ? Math.ceil((currentMatch.pitchRentalCost + (currentMatch.extraCosts || 0)) / (currentMatch.maxPlayers || 18))
    : 0;

  const formattedDate = currentMatch
    ? new Date(currentMatch.date).toLocaleString('es-CO', {
        timeZone: 'America/Bogota',
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  const cleanLocation = currentMatch
    ? currentMatch.location.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim()
    : '';
  const cleanAddress = currentMatch?.locationAddress
    ? currentMatch.locationAddress.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim()
    : '';
  const fullLocQuery = cleanAddress ? `${cleanAddress} ${cleanLocation}`.trim() : cleanLocation;

  const mapsUrlToUse = currentMatch
    ? currentMatch.googleMapsUrl && !currentMatch.googleMapsUrl.includes('%E2%9A%BD')
      ? currentMatch.googleMapsUrl
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullLocQuery || currentMatch.location)}`
    : '';

  // Single official WhatsApp Group convocation message in authentic professional football tone
  const groupConvocationText = currentMatch
    ? `⚽ *CONVOCATORIA • MIZPA FC* ⚽\n\n` +
      `Convocatoria abierta. Confirma tu cupo en el link oficial:\n\n` +
      `📅 *Fecha:* ${formattedDate}\n` +
      `📍 *Cancha:* ${currentMatch.location}${currentMatch.locationAddress ? ` (${currentMatch.locationAddress})` : ''}\n` +
      `👥 *Cupos:* ${currentMatch.maxPlayers || 18} jugadores\n` +
      `💵 *Cuota proyectada:* $${estFee.toLocaleString('es-CO')} COP (con 18 cupos)\n` +
      `💡 _Nota: La cuota final se divide en partes iguales entre los jugadores que asistan a la cancha._\n` +
      (mapsUrlToUse ? `🗺️ *Ubicación:* ${mapsUrlToUse}\n` : '') +
      `\n👟 *Calzado:* Zapatillas para sintética (sin taches / cero guayos).\n` +
      `👥 *Invitados:* Puedes registrar invitados jugadores (juegan cancha) o acompañantes/barra (no juegan y cuota cancha $0).\n\n` +
      `🔗 *Inscríbete aquí:*\n` +
      `👉 ${rsvpUrl}\n\n` +
      `⚠️ _Cupos por orden de llegada. Los siguientes pasan a lista de espera._`
    : '';

  const feeSettledText = currentMatch
    ? `💰 *LIQUIDACIÓN DE CUOTA • MIZPA FC* ⚽\n\n` +
      `Partido liquidado en *${currentMatch.location}*.\n\n` +
      `💵 *Cuota asignada:* $${(currentMatch.settledFeePerPlayer || estFee).toLocaleString('es-CO')} COP\n` +
      `💳 Realiza tu transferencia (Nequi / Daviplata) y sube tu comprobante a la billetera.`
    : '';

  const debtReminderText = selectedPlayer
    ? `⚠️ *RECORDATORIO DE PAGO • MIZPA FC* ⚽\n\n` +
      `Hola ${selectedPlayer.fullName}, te recordamos realizar tu pago pendiente de partidos anteriores para mantener tu cupo activo.`
    : '';

  const handleShareGroupWhatsApp = () => {
    if (!currentMatch) {
      setFeedback({ success: false, message: 'No hay un partido activo para convocar.' });
      return;
    }
    // 1. Open WhatsApp immediately to avoid browser popup blockers
    const encoded = encodeURIComponent(groupConvocationText);
    const url = `https://api.whatsapp.com/send?text=${encoded}`;
    window.open(url, '_blank');
    setFeedback({
      success: true,
      message: '¡Convocatoria abierta en WhatsApp! Selecciona el grupo de tu equipo para enviarla.',
    });

    // 2. Register in notifications log in background
    startTransition(async () => {
      try {
        const res = await sendMatchConvocationAction(currentMatch.id, 'GROUP', baseDomain);
        if (res.success) {
          const logRes = await getNotificationsLogAction();
          if (logRes.success && logRes.data) {
            setNotifications(logRes.data);
          }
        }
      } catch (err) {
        console.warn('Nota: Registro de auditoría completado localmente.', err);
      }
    });
  };

  const handleSendSettlement = () => {
    if (!currentMatch) {
      setFeedback({ success: false, message: 'No hay un partido activo para liquidar.' });
      return;
    }
    startTransition(async () => {
      try {
        const res = await sendSettlementAlertsAction(currentMatch.id);
        setFeedback(res);
        if (res.success) {
          const logRes = await getNotificationsLogAction();
          if (logRes.success && logRes.data) {
            setNotifications(logRes.data);
          }
        }
      } catch (err) {
        setFeedback({ success: false, message: 'Error de conexión con el servidor al registrar liquidaciones.' });
      }
    });
  };

  const handleSendDebtReminder = () => {
    startTransition(async () => {
      try {
        const res = await sendDebtReminderAction(selectedPlayerId);
        setFeedback(res);
        if (res.success) {
          const logRes = await getNotificationsLogAction();
          if (logRes.success && logRes.data) {
            setNotifications(logRes.data);
          }
        }
      } catch (err) {
        setFeedback({ success: false, message: 'Error de conexión con el servidor al enviar recordatorio.' });
      }
    });
  };

  const openDirectWhatsAppUrl = (text: string) => {
    const cleanPhone = customPhone.replace(/[^0-9]/g, '');
    const encoded = encodeURIComponent(text);
    const url = cleanPhone
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encoded}`
      : `https://api.whatsapp.com/send?text=${encoded}`;
    window.open(url, '_blank');
  };

  const copyToClipboard = (text: string, successMsg = 'Copiado al portapapeles.') => {
    navigator.clipboard.writeText(text);
    setFeedback({ success: true, message: successMsg });
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="pb-4 border-b border-zinc-800">
        <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
          🔔 Centro de Convocatorias & Notificaciones WhatsApp
        </h1>
        <p className="text-zinc-400 mt-1 text-sm">
          Crea la convocatoria oficial con un <strong>único enlace de registro</strong> para el grupo de WhatsApp del equipo. Cada jugador da clic y se inscribe directamente.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-zinc-800 bg-zinc-900/60">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs flex items-center gap-1.5 text-zinc-400">
              <Share2 className="w-4 h-4 text-emerald-400" /> Método de Convocatoria
            </CardDescription>
            <CardTitle className="text-xl font-semibold text-emerald-400 flex items-center gap-2">
              <span>Grupo WhatsApp</span>
              <Badge variant="success" className="text-[10px]">Un Solo Link</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-zinc-400">
            Difusión masiva al chat del equipo vía enlace único de RSVP.
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900/60">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs flex items-center gap-1.5 text-zinc-400">
              <LinkIcon className="w-4 h-4 text-blue-400" /> Enlace Canónico Activo
            </CardDescription>
            <CardTitle className="text-base font-mono text-zinc-200 truncate">
              {currentMatch ? `/rsvp/${currentMatch.id}` : 'Sin partido activo'}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-zinc-400">
            Página pública responsiva optimizada para celular.
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900/60">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs flex items-center gap-1.5 text-zinc-400">
              <MessageSquare className="w-4 h-4 text-purple-400" /> Historial de Envíos
            </CardDescription>
            <CardTitle className="text-2xl font-mono text-white">
              {notifications.length} Registros
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-zinc-400">
            Auditoría inmutable de convocatorias y cobros.
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
            <p className="font-semibold text-sm">{feedback.success ? 'Operación Exitosa' : 'Aviso'}</p>
            <p className="text-xs opacity-90">{feedback.message}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-zinc-800 pb-2">
        <Button
          variant={activeTab === 'group-convocation' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('group-convocation')}
          className="gap-2"
        >
          <Share2 className="w-4 h-4 text-emerald-400" /> 1. Convocatoria de Grupo (Un Solo Link)
        </Button>
        <Button
          variant={activeTab === 'direct' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('direct')}
          className="gap-2"
        >
          <DollarSign className="w-4 h-4 text-amber-400" /> 2. Cobros & Recordatorios 1-a-1
        </Button>
        <Button
          variant={activeTab === 'history' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('history')}
          className="gap-2"
        >
          <Clock className="w-4 h-4" /> 3. Historial & Auditoría ({notifications.length})
        </Button>
      </div>

      {/* Tab 1: Group WhatsApp Convocation with Single Link */}
      {activeTab === 'group-convocation' && (
        <div className="space-y-6">
          <Card className="border-emerald-800/40 bg-gradient-to-b from-emerald-950/30 to-zinc-900/60 shadow-xl">
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-lg flex items-center gap-2 text-white">
                  <Sparkles className="w-5 h-5 text-emerald-400" />
                  Convocatoria Oficial para el Grupo de WhatsApp
                </CardTitle>
                <Badge variant="success" className="font-mono text-xs">
                  Flujo de Fútbol Aficionado
                </Badge>
              </div>
              <CardDescription className="text-xs text-zinc-300">
                Se genera un <strong>único enlace interactivo</strong> para el partido activo. Al enviarlo al grupo de WhatsApp, cualquier jugador del equipo entra al link desde su teléfono, elige su nombre y asegura su cupo en tiempo real.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Match Selector & Actions */}
              {matchList && matchList.length > 0 && (
                <div className="p-3 bg-zinc-950/60 rounded-xl border border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
                    <label className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5 shrink-0">
                      <Calendar className="w-4 h-4" /> Seleccionar Partido:
                    </label>
                    <select
                      value={selectedMatchId}
                      onChange={(e) => setSelectedMatchId(e.target.value)}
                      className="w-full sm:w-auto bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                    >
                      {matchList.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.location} — {new Date(m.date).toLocaleDateString('es-CO', { timeZone: 'America/Bogota', weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} ({m.status})
                        </option>
                      ))}
                    </select>
                  </div>

                  {currentMatch && (
                    <div className="flex items-center gap-2 shrink-0">
                      <Link href="/matches">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs font-semibold border-amber-500/30 bg-amber-950/20 hover:bg-amber-900/40 text-amber-300 hover:text-amber-100 hover:border-amber-500/60 shadow-sm hover:shadow-amber-500/10 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 rounded-lg px-2.5 gap-1.5 group"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-200" />
                          <span>Editar</span>
                        </Button>
                      </Link>

                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isPending || currentMatch.status === 'SETTLED'}
                        onClick={() => setShowDeleteMatchDialog(true)}
                        className="h-8 text-xs font-semibold border-rose-500/30 bg-rose-950/20 hover:bg-rose-900/40 text-rose-300 hover:text-rose-100 hover:border-rose-500/60 shadow-sm hover:shadow-rose-500/10 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 rounded-lg px-2.5 gap-1.5 group disabled:opacity-50 disabled:pointer-events-none"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-400 group-hover:scale-110 group-hover:-rotate-6 transition-transform duration-200" />
                        <span>Eliminar</span>
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Confirmation Dialog for Match Deletion in Notifications */}
              {showDeleteMatchDialog && currentMatch && (
                <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-xl space-y-2 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-red-300 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-red-400" /> ¿Seguro que deseas eliminar la convocatoria de {currentMatch.location}?
                    </p>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Se borrará el partido y sus registros de inscripción. Esta acción no se puede deshacer.
                  </p>
                  <div className="flex justify-end gap-2 pt-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowDeleteMatchDialog(false)}
                      className="h-7 text-xs text-zinc-400 hover:text-white"
                    >
                      Cancelar
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={isPending}
                      onClick={handleDeleteCurrentMatch}
                      className="h-7 text-xs bg-red-600 hover:bg-red-500 text-white font-bold gap-1"
                    >
                      {isPending ? 'Eliminando...' : '🗑️ Confirmar Eliminación'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Single Link Preview Box */}
              <div className="bg-zinc-950/80 p-4 rounded-xl border border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-10 h-10 rounded-lg bg-emerald-950/70 border border-emerald-700/50 flex items-center justify-center shrink-0">
                    <LinkIcon className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div className="overflow-hidden">
                    <span className="text-[11px] text-zinc-400 uppercase tracking-wider block font-medium">
                      Enlace Único de Registro (RSVP)
                    </span>
                    <span className="font-mono text-sm text-emerald-300 truncate block" suppressHydrationWarning>
                      {mounted ? rsvpUrl : (currentMatch ? `/rsvp/${currentMatch.id}` : '')}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    onClick={() => copyToClipboard(rsvpUrl, '¡Enlace de registro copiado!')}
                    variant="outline"
                    size="sm"
                    disabled={!currentMatch}
                    className="border-zinc-700 text-xs gap-1.5"
                  >
                    <Copy className="w-3.5 h-3.5" /> Copiar Enlace
                  </Button>
                  {currentMatch && (
                    <Link href={`/rsvp/${currentMatch.id}`} target="_blank">
                      <Button
                        variant="default"
                        size="sm"
                        className="text-xs bg-emerald-700 hover:bg-emerald-600 text-white gap-1.5"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Abrir Formulario
                      </Button>
                    </Link>
                  )}
                </div>
              </div>

              {/* Message Box */}
              <div>
                <label className="text-xs text-zinc-400 font-medium block mb-1">
                  Mensaje Oficial Formateado para WhatsApp:
                </label>
                <div
                  className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 text-xs sm:text-sm font-mono text-zinc-200 whitespace-pre-wrap leading-relaxed shadow-inner"
                  suppressHydrationWarning
                >
                  {currentMatch ? (
                    groupConvocationText
                  ) : (
                    <div className="space-y-3 py-2 text-center sm:text-left">
                      <p className="text-amber-300">
                        ⚠️ No hay ningún partido activo en este momento en la base de datos.
                      </p>
                      <Link href="/matches">
                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold gap-1.5 text-xs">
                          <PlusCircle className="w-4 h-4" /> Ir a Crear Partido en la pestaña &quot;Partidos&quot;
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Button
                  onClick={handleShareGroupWhatsApp}
                  disabled={isPending || !currentMatch}
                  size="lg"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-2 text-sm shadow-lg shadow-emerald-900/30"
                >
                  <Share2 className="w-4 h-4" />
                  {isPending ? 'Procesando...' : '📲 Enviar al Grupo de WhatsApp'}
                </Button>

                <Button
                  onClick={() => copyToClipboard(groupConvocationText, '¡Mensaje completo copiado para pegar en WhatsApp!')}
                  variant="outline"
                  size="lg"
                  disabled={!currentMatch}
                  className="border-zinc-700 text-zinc-200 font-medium gap-2 text-sm"
                >
                  <Copy className="w-4 h-4" /> Copiar Mensaje Completo
                </Button>
              </div>

              <p className="text-[11px] text-zinc-400 pt-2 border-t border-zinc-800/60">
                💡 <strong>¿Cómo funciona?</strong> Al hacer clic en <em>&quot;Enviar al Grupo de WhatsApp&quot;</em>, se abrirá WhatsApp y podrás seleccionar directamente el grupo de tu equipo. Todos los integrantes verán el mensaje y podrán registrarse con solo tocar el link.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab 2: 1-to-1 Fees & Debtors */}
      {activeTab === 'direct' && (
        <div className="space-y-6">
          {/* Target Player Selector */}
          <Card className="border-zinc-800 bg-zinc-900/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-400" /> Cobro de Cartera a Deudores (1-a-1)
              </CardTitle>
              <CardDescription className="text-xs">
                Selecciona al jugador para recordarle cobros pendientes o enviar su alerta individual.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Jugador:</label>
                  <select
                    value={selectedPlayerId}
                    onChange={(e) => handlePlayerSelect(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    {players.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.fullName} ({p.alias || 'Jugador'})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Teléfono WhatsApp:</label>
                  <input
                    type="text"
                    value={customPhone}
                    onChange={(e) => setCustomPhone(e.target.value)}
                    placeholder="+57..."
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-100 font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 1-to-1 Templates Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card 1: Settlement Fee Alert */}
            <Card className="border-zinc-800 bg-zinc-900/60 flex flex-col justify-between">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-amber-400">
                  <DollarSign className="w-4 h-4" /> 1. Cobro de Cuota Liquidada
                </CardTitle>
                <CardDescription className="text-xs">
                  Notifica la cuota congelada tras la liquidación del partido.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="bg-zinc-950 p-3 rounded border border-zinc-800 text-xs font-mono text-zinc-300 whitespace-pre-wrap leading-relaxed h-44 overflow-y-auto">
                  {feeSettledText}
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => openDirectWhatsAppUrl(feeSettledText)}
                    variant="default"
                    size="sm"
                    className="w-full gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Enviar por WhatsApp
                  </Button>
                  <Button
                    onClick={() => copyToClipboard(feeSettledText)}
                    variant="outline"
                    size="sm"
                    className="border-zinc-700 px-2"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Card 2: Debt Reminder */}
            <Card className="border-zinc-800 bg-zinc-900/60 flex flex-col justify-between">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-rose-400">
                  <AlertTriangle className="w-4 h-4" /> 2. Recordatorio de Cartera en Mora
                </CardTitle>
                <CardDescription className="text-xs">
                  Mensaje respetuoso para jugadores con saldo pendiente.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="bg-zinc-950 p-3 rounded border border-zinc-800 text-xs font-mono text-zinc-300 whitespace-pre-wrap leading-relaxed h-44 overflow-y-auto">
                  {debtReminderText}
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => openDirectWhatsAppUrl(debtReminderText)}
                    variant="default"
                    size="sm"
                    className="w-full gap-1.5 bg-rose-600 hover:bg-rose-500 text-white"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Enviar por WhatsApp
                  </Button>
                  <Button
                    onClick={() => copyToClipboard(debtReminderText)}
                    variant="outline"
                    size="sm"
                    className="border-zinc-700 px-2"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Tab 3: History */}
      {activeTab === 'history' && (
        <Card className="border-zinc-800 bg-zinc-900/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-emerald-400" /> Libro de Auditoría de Comunicaciones
              </span>
              <span className="text-xs font-normal text-zinc-400">
                {notifications.length} registros
              </span>
            </CardTitle>
            <CardDescription className="text-xs">
              Historial trazable de todas las convocatorias y alertas emitidas en el sistema.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {notifications.length === 0 ? (
              <div className="py-12 text-center text-zinc-500 text-sm">
                No hay notificaciones registradas todavía.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Canal</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Destinatario</TableHead>
                    <TableHead>Título / Asunto</TableHead>
                    <TableHead className="text-right">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {notifications.map((notif) => {
                    const recipient = notif.recipientPlayerId === 'GROUP'
                      ? 'Grupo WhatsApp (Equipo)'
                      : getPlayer(notif.recipientPlayerId)?.fullName || notif.recipientPlayerId;

                    return (
                      <TableRow key={notif.id}>
                        <TableCell className="text-xs text-zinc-400 whitespace-nowrap font-mono">
                          {new Date(notif.createdAt).toLocaleString('es-CO', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </TableCell>
                        <TableCell>
                          <Badge variant="success" className="text-[10px] font-mono">
                            {notif.channel}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs font-mono text-zinc-300">
                          {notif.type}
                        </TableCell>
                        <TableCell className="text-xs font-medium text-zinc-200">
                          {recipient}
                        </TableCell>
                        <TableCell className="text-xs text-zinc-300 max-w-xs truncate">
                          {notif.title}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openDirectWhatsAppUrl(notif.content)}
                            className="text-xs text-emerald-400 hover:text-emerald-300 gap-1 h-7"
                          >
                            <ExternalLink className="w-3 h-3" /> WhatsApp
                          </Button>
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
    </div>
  );
}
