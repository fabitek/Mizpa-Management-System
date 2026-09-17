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
  checkAndNotifyCapacityReachedAction,
} from '../../app/actions/notification-actions.ts';
import { copyToClipboard as safeCopyToClipboard } from '../../core/utils/clipboard.ts';
import { deleteMatchAction } from '../../app/actions/match-actions.ts';
import type { Player, Match, NotificationMessage, CheckAndNotifyCapacityResult, Attendance, FinancialEntry } from '../../core/domain/types.ts';
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
  ShieldCheck,
  FileText,
  Flame,
  Check,
  Car,
  Receipt,
  CreditCard,
} from 'lucide-react';

interface NotificationsViewProps {
  players: Player[];
  matches?: Match[];
  activeMatch: Match | null;
  initialNotifications: NotificationMessage[];
  initialAttendances?: Attendance[];
  initialFinancialEntries?: FinancialEntry[];
}

export function NotificationsView({
  players,
  matches,
  activeMatch,
  initialNotifications,
  initialAttendances = [],
  initialFinancialEntries = [],
}: NotificationsViewProps) {
  const [activeTab, setActiveTab] = useState<'group-convocation' | 'quorum-10' | 'direct' | 'history'>('group-convocation');
  const [notifications, setNotifications] = useState<NotificationMessage[]>(initialNotifications);
  const [quorumResult, setQuorumResult] = useState<CheckAndNotifyCapacityResult | null>(null);

  const [matchList, setMatchList] = useState<Match[]>(
    matches && matches.length > 0 ? matches : activeMatch ? [activeMatch] : []
  );

  const [attendances, setAttendances] = useState<Attendance[]>(initialAttendances);
  const [financialEntries, setFinancialEntries] = useState<FinancialEntry[]>(initialFinancialEntries);
  const [sentPlayerIds, setSentPlayerIds] = useState<string[]>([]);

  // Selected Match for convocation & settlement
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

  const handleTriggerQuorumCheck = (force = false) => {
    if (!currentMatch) return;
    startTransition(async () => {
      const res = await checkAndNotifyCapacityReachedAction(currentMatch.id, force, baseDomain);
      setFeedback({ success: res.success, message: res.message });
      if (res.data) {
        setQuorumResult(res.data);
        if (res.data.triggered) {
          const logsRes = await getNotificationsLogAction();
          if (logsRes.success && logsRes.data) {
            setNotifications(logsRes.data);
          }
        }
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

  // Web app URL for RSVP & Payment portal
  const baseDomain =
    origin ||
    (typeof window !== 'undefined'
      ? window.location.origin
      : process.env.NEXT_PUBLIC_SITE_URL || 'https://mizpa-fc.vercel.app');
  const rsvpUrl = currentMatch ? `${baseDomain.replace(/\/+$/, '')}/rsvp/${currentMatch.id}` : baseDomain;
  const paymentPortalUrl = `${baseDomain.replace(/\/+$/, '')}/pago`;

  // Dynamic match calculations
  const matchAttendances = attendances.filter((a) => a.matchId === currentMatch?.id);
  const playingAttendances = matchAttendances.filter(
    (a) => a.guestType !== 'COMPANION' && a.status !== 'CANCELLED'
  );
  const attendedCount = matchAttendances.filter(
    (a) => a.status === 'ATTENDED' && a.guestType !== 'COMPANION'
  ).length;
  const confirmedCount = matchAttendances.filter(
    (a) => (a.status === 'CONFIRMED' || a.status === 'ATTENDED') && a.guestType !== 'COMPANION'
  ).length;

  const durationHours = currentMatch?.durationHours ?? 2;
  const parkingFeePerHour = currentMatch?.parkingFeePerHour ?? 1000;
  const vehicleParkingFee = durationHours * parkingFeePerHour;
  const isSettled = currentMatch?.status === 'SETTLED';

  const fullCapacityPitchFee = currentMatch
    ? Math.ceil(currentMatch.pitchRentalCost / (currentMatch.maxPlayers || 18))
    : 0;

  const basePitchFee = currentMatch
    ? isSettled
      ? (currentMatch.settledFeePerPlayer ?? (attendedCount > 0 ? Math.ceil(currentMatch.pitchRentalCost / attendedCount) : fullCapacityPitchFee))
      : attendedCount > 0
      ? Math.ceil(currentMatch.pitchRentalCost / attendedCount)
      : confirmedCount > 0
      ? Math.ceil(currentMatch.pitchRentalCost / confirmedCount)
      : fullCapacityPitchFee
    : 0;

  const estFee = basePitchFee > 0 ? basePitchFee : fullCapacityPitchFee;

  // Helper to compute a player's fee, attendances, and balance
  const getPlayerMatchBreakdown = (playerId: string) => {
    const playerAtt = matchAttendances.find((a) => a.playerId === playerId && a.status !== 'CANCELLED');
    const guestAtts = matchAttendances.filter((a) => a.registeredByPlayerId === playerId && a.status !== 'CANCELLED');

    const isAttending = !!playerAtt;
    const isPlaying = playerAtt ? playerAtt.guestType !== 'COMPANION' : false;
    const hasVehicle = !!(playerAtt?.hasVehicle || playerAtt?.vehiclePlate);
    const vehiclePlate = playerAtt?.vehiclePlate;

    const pitchFee = isPlaying ? basePitchFee : 0;
    const parkingFee = hasVehicle ? vehicleParkingFee : 0;

    const guestPlayers = guestAtts.filter((g) => g.guestType !== 'COMPANION');
    const guestsFee = guestPlayers.length * basePitchFee;

    const totalTargetFee = pitchFee + parkingFee + guestsFee;

    // Credits for this player (all payments)
    const playerCredits = financialEntries.filter((e) => e.type === 'CREDIT' && e.playerId === playerId);
    const totalPaid = playerCredits.reduce((s, e) => s + e.amount, 0);

    // Debits for this player (all debts)
    const playerDebits = financialEntries.filter((e) => e.type === 'DEBIT' && e.playerId === playerId);
    const totalDebits = playerDebits.reduce((s, e) => s + e.amount, 0);
    const walletBalance = totalPaid - totalDebits;

    const isPaid = totalTargetFee > 0 ? totalPaid >= totalTargetFee : (isAttending ? totalPaid > 0 : true);
    const isPartial = totalPaid > 0 && totalPaid < totalTargetFee;
    const pendingAmount = Math.max(0, totalTargetFee - totalPaid);

    return {
      playerAtt,
      guestAtts,
      guestPlayers,
      hasVehicle,
      vehiclePlate,
      isAttending,
      isPlaying,
      pitchFee,
      parkingFee,
      guestsFee,
      totalTargetFee,
      totalPaid,
      pendingAmount,
      isPaid,
      isPartial,
      walletBalance,
    };
  };

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

  // Generate customized 1-to-1 Match Fee Notification
  const generatePlayerSettlementMessage = (player: Player) => {
    if (!currentMatch) return '';
    const info = getPlayerMatchBreakdown(player.id);
    const feeToPay = info.totalTargetFee > 0 ? info.totalTargetFee : basePitchFee;
    const playerPaymentLink = `${baseDomain.replace(/\/+$/, '')}/pago?player=${player.id}`;

    const detailLines: string[] = [];
    detailLines.push(`• Cancha: $${(info.pitchFee || basePitchFee).toLocaleString('es-CO')} COP`);
    if (info.hasVehicle) {
      detailLines.push(`• Parqueadero (${durationHours}h): $${info.parkingFee.toLocaleString('es-CO')} COP${info.vehiclePlate ? ` [Placa ${info.vehiclePlate}]` : ''}`);
    }
    if (info.guestPlayers.length > 0) {
      const guestNames = info.guestPlayers.map((g) => g.guestName || 'Invitado').join(', ');
      detailLines.push(`• Invitado(s) (${guestNames}): $${info.guestsFee.toLocaleString('es-CO')} COP`);
    }

    const statusLine = info.isPaid
      ? '✅ Pago al día'
      : info.isPartial
      ? `⚠️ Abono parcial: $${info.totalPaid.toLocaleString('es-CO')} COP (Resta $${info.pendingAmount.toLocaleString('es-CO')} COP)`
      : `🔴 Pendiente: $${feeToPay.toLocaleString('es-CO')} COP`;

    return (
      `⚽ *CUOTA DE PARTIDO • MIZPA FC* ⚽\n\n` +
      `Hola *${player.fullName}*, aquí tienes el resumen de tu cuota:\n\n` +
      `📍 *Cancha:* ${currentMatch.location}${currentMatch.locationAddress ? ` (${currentMatch.locationAddress})` : ''}\n` +
      `📅 *Fecha:* ${formattedDate}\n\n` +
      `📋 *Detalle:*\n` +
      detailLines.join('\n') + `\n` +
      `💵 *TOTAL A PAGAR:* $${feeToPay.toLocaleString('es-CO')} COP\n` +
      `📊 *Estado:* ${statusLine}\n\n` +
      `🔗 *Paga o sube tu comprobante aquí:*\n` +
      `👉 ${playerPaymentLink}\n\n` +
      `📱 *Nequi / Daviplata:* 312 357 8415 (Cesar Tellez)\n\n` +
      `_Sube el comprobante en el link para registrar tu pago de inmediato._`
    );
  };

  // Generate WhatsApp Group Broadcast with list of unpaid players (1-Click)
  const generateGroupSettlementDebtorsMessage = () => {
    if (!currentMatch) return '';
    const matchAttendees = playingAttendances.map((att) => {
      const p = getPlayer(att.playerId);
      const info = getPlayerMatchBreakdown(att.playerId);
      return { att, player: p, info };
    });

    const unpaid = matchAttendees.filter((item) => !item.info.isPaid);
    const paid = matchAttendees.filter((item) => item.info.isPaid);
    const generalPaymentLink = `${baseDomain.replace(/\/+$/, '')}/pago`;

    let text = `💰 *ESTADO DE CUOTAS Y PAGOS • MIZPA FC* ⚽\n\n`;
    text += `📍 *Partido:* ${currentMatch.location}\n`;
    text += `📅 *Fecha:* ${formattedDate}\n`;
    text += `💵 *Cuota base:* $${basePitchFee.toLocaleString('es-CO')} COP\n\n`;

    if (unpaid.length > 0) {
      text += `🔴 *PENDIENTES POR PAGAR (${unpaid.length} jugadores):*\n`;
      unpaid.forEach((item, idx) => {
        const name = item.player ? item.player.fullName : (item.att.guestName || 'Jugador');
        const amount = item.info.pendingAmount > 0 ? item.info.pendingAmount : (item.info.totalTargetFee || basePitchFee);
        const extras = item.info.hasVehicle ? ' (+Parqueadero)' : item.info.guestPlayers.length > 0 ? ' (+Invitado)' : '';
        text += `${idx + 1}. ❌ *${name}* — $${amount.toLocaleString('es-CO')} COP${extras}\n`;
      });
      text += `\n`;
    } else {
      text += `🎉 *¡EXCELENTE! TODOS LOS JUGADORES ESTÁN AL DÍA* ✅\n\n`;
    }

    if (paid.length > 0) {
      text += `✅ *PAGOS CONFIRMADOS (${paid.length}):*\n`;
      text += paid.map((item) => `• ${item.player?.fullName || item.att.guestName || 'Jugador'} ($${(item.info.totalPaid || item.info.totalTargetFee || basePitchFee).toLocaleString('es-CO')}) ✅`).join('\n') + `\n\n`;
    }

    text += `💳 *PORTAL OFICIAL DE PAGOS & TRANSFERENCIAS:*\n`;
    text += `Realiza tu transferencia y sube tu comprobante en:\n`;
    text += `👉 ${generalPaymentLink}\n\n`;
    text += `🟣 *Nequi / 🔴 Daviplata:* 312 357 8415\n`;
    text += `👤 *Titular:* Cesar Tellez\n\n`;
    text += `⚠️ _Agradecemos a los jugadores pendientes ponerse al día hoy mismo._`;

    return text;
  };

  // Generate general debt reminder message
  const generateDebtReminderMessage = (player: Player) => {
    const info = getPlayerMatchBreakdown(player.id);
    const totalDebt = info.walletBalance < 0 ? Math.abs(info.walletBalance) : info.pendingAmount > 0 ? info.pendingAmount : basePitchFee;
    const playerPaymentLink = `${baseDomain.replace(/\/+$/, '')}/pago?player=${player.id}`;

    return (
      `⚠️ *ESTADO DE CUENTA • MIZPA FC* ⚽\n\n` +
      `Hola *${player.fullName}*, registras un saldo pendiente de *$${totalDebt.toLocaleString('es-CO')} COP* de partidos anteriores.\n\n` +
      `🔗 *Paga o sube tu comprobante aquí:*\n` +
      `👉 ${playerPaymentLink}\n\n` +
      `📱 *Nequi / Daviplata:* 312 357 8415 (Cesar Tellez)\n\n` +
      `_Porfa ponte al día para poder hacer el pago de la reserva del próximo partido._`
    );
  };

  const feeSettledText = selectedPlayer ? generatePlayerSettlementMessage(selectedPlayer) : '';
  const debtReminderText = selectedPlayer ? generateDebtReminderMessage(selectedPlayer) : '';
  const groupSettlementDebtorsText = generateGroupSettlementDebtorsMessage();

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

  const openWhatsAppWithMessage = (phone: string, text: string) => {
    const cleanPhone = phone ? phone.replace(/[^0-9]/g, '') : '';
    const encoded = encodeURIComponent(text);
    const url = cleanPhone
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encoded}`
      : `https://api.whatsapp.com/send?text=${encoded}`;
    window.open(url, '_blank');
  };

  const copyToClipboard = async (text: string, successMsg = 'Copiado al portapapeles.') => {
    const ok = await safeCopyToClipboard(text);
    if (ok) {
      setFeedback({ success: true, message: successMsg });
    } else {
      setFeedback({ success: false, message: 'No se pudo copiar automáticamente.' });
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="pb-4 border-b border-zinc-800">
        <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
          🔔 Convocatorias y Avisos por WhatsApp
        </h1>
        <p className="text-zinc-400 mt-1 text-sm">
          Publica la convocatoria con un <strong>enlace directo de registro</strong> al chat del equipo. Cada jugador entra y asegura su puesto al instante.
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
          <Share2 className="w-4 h-4 text-emerald-400" /> 1. Convocatoria Inicial (Un Solo Link)
        </Button>
        <Button
          variant={activeTab === 'quorum-10' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('quorum-10')}
          className="gap-2"
        >
          <ShieldCheck className="w-4 h-4 text-cyan-400" /> 2. Quórum 10 & Portería
        </Button>
        <Button
          variant={activeTab === 'direct' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('direct')}
          className="gap-2"
        >
          <DollarSign className="w-4 h-4 text-amber-400" /> 3. Cobros & Recordatorios 1-a-1
        </Button>
        <Button
          variant={activeTab === 'history' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('history')}
          className="gap-2"
        >
          <Clock className="w-4 h-4" /> 4. Historial & Auditoría ({notifications.length})
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

      {/* Tab 2: Quórum 10 & Planilla de Portería */}
      {activeTab === 'quorum-10' && (
        <div className="space-y-6">
          <Card className="border-cyan-800/40 bg-gradient-to-b from-cyan-950/20 to-zinc-900/60 shadow-xl">
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-lg flex items-center gap-2 text-white">
                  <ShieldCheck className="w-5 h-5 text-cyan-400" />
                  Automatización de Quórum (10 Confirmados) & Control de Acceso
                </CardTitle>
                <div className="flex items-center gap-2">
                  {currentMatch?.notificationSent10Players ? (
                    <Badge variant="success" className="font-mono text-xs">
                      ✅ Notificación Despachada
                    </Badge>
                  ) : (
                    <Badge variant="warning" className="font-mono text-xs">
                      ⏳ En Espera de Quórum
                    </Badge>
                  )}
                </div>
              </div>
              <CardDescription className="text-xs text-zinc-300">
                Al confirmarse el jugador #10 (o promoverse de lista de espera), el sistema genera y despacha automáticamente dos formatos: el <strong>anuncio de partido confirmado</strong> para el grupo de WhatsApp y la <strong>planilla formal con cédulas y placas</strong> para la portería de la sede.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Match Selector */}
              {matchList && matchList.length > 0 && (
                <div className="p-3 bg-zinc-950/60 rounded-xl border border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
                    <label className="text-xs text-cyan-400 font-semibold flex items-center gap-1.5 shrink-0">
                      <Calendar className="w-4 h-4" /> Seleccionar Partido:
                    </label>
                    <select
                      value={selectedMatchId}
                      onChange={(e) => setSelectedMatchId(e.target.value)}
                      className="w-full sm:w-auto bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-100 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-medium"
                    >
                      {matchList.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.location} — {new Date(m.date).toLocaleDateString('es-CO', { timeZone: 'America/Bogota', weekday: 'short', month: 'short', day: 'numeric' })} {m.notificationSent10Players ? '(Quórum Notificado)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      onClick={() => handleTriggerQuorumCheck(false)}
                      disabled={isPending || !currentMatch}
                      size="sm"
                      className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs gap-1.5 shadow-md"
                    >
                      <Flame className="w-3.5 h-3.5" />
                      {isPending ? 'Verificando...' : 'Comprobar Quórum'}
                    </Button>
                    <Button
                      onClick={() => handleTriggerQuorumCheck(true)}
                      disabled={isPending || !currentMatch}
                      variant="outline"
                      size="sm"
                      className="border-zinc-700 text-zinc-300 hover:text-white text-xs gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5 text-cyan-400" />
                      Forzar Reenvío
                    </Button>
                  </div>
                </div>
              )}

              {/* 2 Format Panels */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Format 1: WhatsApp Group Message */}
                <div className="space-y-3 bg-zinc-950/80 p-4 rounded-xl border border-zinc-800 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <h3 className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                        <Share2 className="w-3.5 h-3.5" /> 1. Formato WhatsApp Grupo
                      </h3>
                      <Badge variant="outline" className="text-[10px] text-zinc-400">
                        Deportivo & Directo
                      </Badge>
                    </div>
                    <div className="bg-zinc-900/90 p-3 rounded-lg border border-zinc-800 text-xs font-mono text-zinc-200 whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto">
                      {quorumResult?.groupMessage || (
                        <div className="text-zinc-400 text-xs space-y-2 py-4 text-center">
                          <p>🔥 *¡QUÓRUM ALCANZADO (10/18)! PARTIDO CONFIRMADO* ⚽</p>
                          <p className="text-[11px] text-zinc-400">
                            (Haz clic en <em>&quot;Comprobar Quórum&quot;</em> para generar la nómina en vivo con los primeros 10 confirmados y cupos restantes).
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2 border-t border-zinc-800/80">
                    <Button
                      onClick={() => {
                        if (quorumResult?.groupMessage) {
                          openWhatsAppWithMessage('', quorumResult.groupMessage);
                        } else {
                          copyToClipboard('Mensaje de quórum pendiente');
                        }
                      }}
                      disabled={!quorumResult?.groupMessage}
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs gap-1.5"
                    >
                      <Share2 className="w-3.5 h-3.5" /> Enviar a WhatsApp
                    </Button>
                    <Button
                      onClick={() => {
                        if (quorumResult?.groupMessage) {
                          copyToClipboard(quorumResult.groupMessage, '¡Mensaje de quórum copiado!');
                        }
                      }}
                      disabled={!quorumResult?.groupMessage}
                      variant="outline"
                      size="sm"
                      className="border-zinc-700 text-zinc-300 hover:text-white text-xs gap-1.5"
                    >
                      <Copy className="w-3.5 h-3.5" /> Copiar Formato
                    </Button>
                  </div>
                </div>

                {/* Format 2: Security Gate Access Sheet */}
                <div className="space-y-3 bg-zinc-950/80 p-4 rounded-xl border border-zinc-800 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <h3 className="text-xs font-semibold text-cyan-400 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5" /> 2. Formato Portería / Vigilancia
                      </h3>
                      <Badge variant="outline" className="text-[10px] text-zinc-400">
                        Formal • Cédulas & Placas
                      </Badge>
                    </div>
                    <div className="bg-zinc-900/90 p-3 rounded-lg border border-zinc-800 text-xs font-mono text-zinc-200 whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto">
                      {quorumResult?.gateMessage || (
                        <div className="text-zinc-400 text-xs space-y-2 py-4 text-center">
                          <p>📋 *PLANILLA DE INGRESO Y PORTERÍA - MIZPA FC*</p>
                          <p className="text-[11px] text-zinc-400">
                            (Incluye Nombres completos, Cédulas y Placas vehiculares tabuladas formalmente para los vigilantes de la sede).
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2 border-t border-zinc-800/80">
                    <Button
                      onClick={() => {
                        if (quorumResult?.gateMessage) {
                          openWhatsAppWithMessage('', quorumResult.gateMessage);
                        }
                      }}
                      disabled={!quorumResult?.gateMessage}
                      size="sm"
                      className="bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs gap-1.5"
                    >
                      <Share2 className="w-3.5 h-3.5" /> Enviar a Portería
                    </Button>
                    <Button
                      onClick={() => {
                        if (quorumResult?.gateMessage) {
                          copyToClipboard(quorumResult.gateMessage, '¡Planilla de portería copiada!');
                        }
                      }}
                      disabled={!quorumResult?.gateMessage}
                      variant="outline"
                      size="sm"
                      className="border-zinc-700 text-zinc-300 hover:text-white text-xs gap-1.5"
                    >
                      <Copy className="w-3.5 h-3.5" /> Copiar Planilla
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab 3: 1-to-1 Fees & Debtors */}
      {activeTab === 'direct' && (
        <div className="space-y-6">
          {/* Match Selector & Overview for Settlements */}
          {matchList && matchList.length > 0 && (
            <Card className="border-amber-800/40 bg-gradient-to-b from-amber-950/20 to-zinc-900/60 shadow-xl">
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2 text-white">
                    <DollarSign className="w-5 h-5 text-amber-400" />
                    Liquidación de Cuotas, Enlaces de Pago & Cobro a Deudores
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {isSettled ? (
                      <Badge variant="success" className="font-mono text-xs">
                        ✅ Partido Liquidado
                      </Badge>
                    ) : (
                      <Badge variant="warning" className="font-mono text-xs">
                        ⏳ En Progreso / Proyectado
                      </Badge>
                    )}
                  </div>
                </div>
                <CardDescription className="text-xs text-zinc-300">
                  Calcula la cuota exacta de cada jugador (cancha + parqueadero + invitados), genera su enlace directo al <strong>Portal de Pagos</strong> y permite cobrar en <strong>1 solo clic</strong> a todo el grupo o individualmente.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 bg-zinc-950/80 rounded-xl border border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
                    <label className="text-xs text-amber-400 font-semibold flex items-center gap-1.5 shrink-0">
                      <Calendar className="w-4 h-4" /> Seleccionar Partido:
                    </label>
                    <select
                      value={selectedMatchId}
                      onChange={(e) => setSelectedMatchId(e.target.value)}
                      className="w-full sm:w-auto bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                    >
                      {matchList.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.location} — {new Date(m.date).toLocaleDateString('es-CO', { timeZone: 'America/Bogota', weekday: 'short', month: 'short', day: 'numeric' })} ({m.status === 'SETTLED' ? 'Liquidado' : 'Abierto'})
                        </option>
                      ))}
                    </select>
                  </div>

                  {currentMatch && (
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <Badge variant="outline" className="border-zinc-700 text-zinc-300 gap-1 py-1">
                        💵 Cuota Base: <strong className="text-emerald-400 font-mono">${basePitchFee.toLocaleString('es-CO')} COP</strong>
                      </Badge>
                      <Badge variant="outline" className="border-zinc-700 text-zinc-300 gap-1 py-1">
                        👥 Asistentes: <strong className="text-white font-mono">{attendedCount || confirmedCount} jug.</strong>
                      </Badge>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Section 1: 1-Click WhatsApp Group Broadcast for All Debtors */}
          <Card className="border-emerald-800/40 bg-gradient-to-b from-emerald-950/30 to-zinc-900/60 shadow-xl">
            <CardHeader className="pb-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-sm sm:text-base flex items-center gap-2 text-emerald-400 font-bold">
                  <Share2 className="w-4 h-4" /> 📢 Difusión Masiva al Grupo de WhatsApp (1 Solo Clic)
                </CardTitle>
                <Badge variant="success" className="text-[10px]">
                  Cobro Grupal Instantáneo
                </Badge>
              </div>
              <CardDescription className="text-xs text-zinc-300">
                Envía en 1 solo clic la <strong>lista consolidada de deudores y confirmados</strong> al grupo del equipo para notificar a todos los que faltan por pagar de una sola vez, con el enlace al portal de pagos.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 text-xs sm:text-sm font-mono text-zinc-200 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto shadow-inner">
                {groupSettlementDebtorsText || (
                  <p className="text-zinc-500">Selecciona un partido para generar el reporte de cobro.</p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Button
                  onClick={() => {
                    if (groupSettlementDebtorsText) {
                      openWhatsAppWithMessage('', groupSettlementDebtorsText);
                    }
                  }}
                  disabled={!currentMatch || !groupSettlementDebtorsText}
                  size="lg"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-2 text-xs sm:text-sm shadow-lg shadow-emerald-900/30"
                >
                  <Share2 className="w-4 h-4" />
                  📲 Enviar Lista de Pendientes al Grupo de WhatsApp (1 Clic)
                </Button>

                <Button
                  onClick={() => copyToClipboard(groupSettlementDebtorsText, '¡Lista de cobro grupal copiada!')}
                  variant="outline"
                  size="lg"
                  disabled={!groupSettlementDebtorsText}
                  className="border-zinc-700 text-zinc-200 font-medium gap-2 text-xs sm:text-sm"
                >
                  <Copy className="w-4 h-4" /> Copiar Formato Grupal
                </Button>

                <Link href="/pago" target="_blank">
                  <Button
                    variant="ghost"
                    size="lg"
                    className="text-emerald-400 hover:text-emerald-300 text-xs sm:text-sm gap-1.5"
                  >
                    <ExternalLink className="w-4 h-4" /> Ver Portal de Pagos (/pago)
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Section 2: Fast 1-Click Debtor Action List */}
          {(() => {
            const matchAttendeesWithPayment = playingAttendances.map((att) => {
              const p = getPlayer(att.playerId);
              const info = getPlayerMatchBreakdown(att.playerId);
              return {
                att,
                player: p,
                info,
              };
            });

            const unpaidAttendees = matchAttendeesWithPayment.filter((item) => !item.info.isPaid && item.player);
            const paidAttendees = matchAttendeesWithPayment.filter((item) => item.info.isPaid && item.player);

            return (
              <Card className="border-zinc-800 bg-zinc-900/60">
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle className="text-base flex items-center gap-2 text-white">
                      <Flame className="w-4 h-4 text-amber-400" />
                      ⚡ Cobro Rápido a Deudores del Partido ({unpaidAttendees.length} pendientes)
                    </CardTitle>
                    <div className="text-xs text-zinc-400">
                      {paidAttendees.length} de {matchAttendeesWithPayment.length} jugadores al día
                    </div>
                  </div>
                  <CardDescription className="text-xs text-zinc-400">
                    Despacha el mensaje individual con el monto exacto y el link de pago de cada jugador con un solo clic.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {unpaidAttendees.length === 0 ? (
                    <div className="p-4 bg-emerald-950/30 border border-emerald-800/40 rounded-xl flex items-center gap-3 text-emerald-200">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                      <div>
                        <p className="text-sm font-semibold">¡Todos los jugadores de este partido tienen su pago al día!</p>
                        <p className="text-xs opacity-90">No hay deudas pendientes registradas para la nómina de este partido.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {unpaidAttendees.map(({ att, player, info }) => {
                        if (!player) return null;
                        const feeToPay = info.totalTargetFee > 0 ? info.totalTargetFee : basePitchFee;
                        const debt = info.pendingAmount > 0 ? info.pendingAmount : feeToPay;
                        const wasSent = sentPlayerIds.includes(player.id);
                        const playerPaymentLink = `${baseDomain.replace(/\/+$/, '')}/pago?player=${player.id}`;

                        return (
                          <div
                            key={att.id}
                            className={`p-3 rounded-xl border transition-all ${
                              wasSent
                                ? 'bg-emerald-950/20 border-emerald-800/40'
                                : 'bg-zinc-950/80 border-zinc-800 hover:border-zinc-700'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div>
                                <h4 className="text-sm font-semibold text-white flex items-center gap-1.5">
                                  {player.fullName}
                                  {player.alias && <span className="text-xs text-zinc-400 font-normal">({player.alias})</span>}
                                </h4>
                                <p className="text-[11px] font-mono text-zinc-400">{player.phone || 'Sin teléfono'}</p>
                              </div>

                              <Badge
                                variant={info.isPartial ? 'warning' : 'destructive'}
                                className="font-mono text-xs shrink-0"
                              >
                                {info.isPartial ? `Debe $${debt.toLocaleString('es-CO')}` : `Debe $${debt.toLocaleString('es-CO')}`}
                              </Badge>
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-zinc-400 mb-3 font-mono">
                              <span>Cancha: ${info.pitchFee.toLocaleString('es-CO')}</span>
                              {info.hasVehicle && (
                                <span className="text-cyan-400 flex items-center gap-0.5">
                                  <Car className="w-3 h-3" /> +Parq (${info.parkingFee.toLocaleString('es-CO')})
                                </span>
                              )}
                              {info.guestPlayers.length > 0 && (
                                <span className="text-purple-400 flex items-center gap-0.5">
                                  <Users className="w-3 h-3" /> +{info.guestPlayers.length} Invitado (${info.guestsFee.toLocaleString('es-CO')})
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 pt-1 border-t border-zinc-800/80">
                              <Button
                                size="sm"
                                onClick={() => {
                                  const text = generatePlayerSettlementMessage(player);
                                  openWhatsAppWithMessage(player.phone || '', text);
                                  if (!sentPlayerIds.includes(player.id)) {
                                    setSentPlayerIds((prev) => [...prev, player.id]);
                                  }
                                }}
                                className={`flex-1 text-xs font-semibold gap-1.5 h-8 ${
                                  wasSent
                                    ? 'bg-emerald-700 hover:bg-emerald-600 text-white'
                                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                                }`}
                              >
                                {wasSent ? (
                                  <>
                                    <Check className="w-3.5 h-3.5" /> Reenviar WhatsApp
                                  </>
                                ) : (
                                  <>
                                    <Send className="w-3.5 h-3.5" /> 📲 Enviar WhatsApp
                                  </>
                                )}
                              </Button>

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => copyToClipboard(playerPaymentLink, `¡Link de pago para ${player.fullName} copiado!`)}
                                className="border-zinc-700 text-zinc-300 hover:text-white text-xs h-8 px-2.5 gap-1"
                                title="Copiar link directo de pago"
                              >
                                <LinkIcon className="w-3.5 h-3.5 text-blue-400" />
                              </Button>

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  const text = generatePlayerSettlementMessage(player);
                                  copyToClipboard(text, `¡Mensaje para ${player.fullName} copiado!`);
                                }}
                                className="border-zinc-700 text-zinc-300 hover:text-white text-xs h-8 px-2.5"
                                title="Copiar texto del mensaje"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })()}

          {/* Section 3: Target Player Selector & 1-to-1 Settlement Cards */}
          <Card className="border-zinc-800 bg-zinc-900/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-400" /> Cobro Individual Personalizado (1-a-1)
              </CardTitle>
              <CardDescription className="text-xs">
                Selecciona a cualquier jugador del club para consultar su cuota, saldo y generar su mensaje directo.
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
                    {players.map((p) => {
                      const breakdown = getPlayerMatchBreakdown(p.id);
                      const isUnpaid = !breakdown.isPaid;
                      return (
                        <option key={p.id} value={p.id}>
                          {p.fullName} ({p.alias || 'Jugador'}) {isUnpaid ? '— 🔴 Debe Cuota' : '— ✅ Al día'}
                        </option>
                      );
                    })}
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

              {/* Direct Payment Link Banner for Selected Player */}
              {selectedPlayer && (
                <div className="mt-3 p-3 bg-zinc-950 rounded-lg border border-zinc-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 truncate">
                    <LinkIcon className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-xs text-zinc-400 shrink-0">Link Personal de Pago:</span>
                    <span className="text-xs font-mono text-emerald-300 truncate" suppressHydrationWarning>
                      {mounted ? `${baseDomain}/pago?player=${selectedPlayer.id}` : `/pago?player=${selectedPlayer.id}`}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(`${baseDomain}/pago?player=${selectedPlayer.id}`, '¡Link de pago copiado!')}
                    className="h-7 text-xs border-zinc-700 shrink-0 gap-1"
                  >
                    <Copy className="w-3 h-3" /> Copiar Link
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 1-to-1 Templates Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card 1: Settlement Fee Alert */}
            <Card className="border-zinc-800 bg-zinc-900/60 flex flex-col justify-between">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-amber-400">
                  <DollarSign className="w-4 h-4" /> 1. Cobro de Cuota del Partido (Personalizado)
                </CardTitle>
                <CardDescription className="text-xs">
                  Notifica la cuota exacta (cancha, parqueadero, invitados) y el link del portal de pagos.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="bg-zinc-950 p-3 rounded border border-zinc-800 text-xs font-mono text-zinc-300 whitespace-pre-wrap leading-relaxed h-48 overflow-y-auto">
                  {feeSettledText}
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => openDirectWhatsAppUrl(feeSettledText)}
                    variant="default"
                    size="sm"
                    className="w-full gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Enviar por WhatsApp
                  </Button>
                  <Button
                    onClick={() => copyToClipboard(feeSettledText, '¡Mensaje de cuota copiado!')}
                    variant="outline"
                    size="sm"
                    className="border-zinc-700 px-2.5"
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
                  <AlertTriangle className="w-4 h-4" /> 2. Recordatorio de Cartera en Mora (General)
                </CardTitle>
                <CardDescription className="text-xs">
                  Mensaje con saldo acumulado de cartera y link al portal de pagos.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="bg-zinc-950 p-3 rounded border border-zinc-800 text-xs font-mono text-zinc-300 whitespace-pre-wrap leading-relaxed h-48 overflow-y-auto">
                  {debtReminderText}
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => openDirectWhatsAppUrl(debtReminderText)}
                    variant="default"
                    size="sm"
                    className="w-full gap-1.5 bg-rose-600 hover:bg-rose-500 text-white font-semibold"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Enviar por WhatsApp
                  </Button>
                  <Button
                    onClick={() => copyToClipboard(debtReminderText, '¡Recordatorio de cartera copiado!')}
                    variant="outline"
                    size="sm"
                    className="border-zinc-700 px-2.5"
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
