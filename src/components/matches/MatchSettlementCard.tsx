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
  reconcileMatchAttendancesAction,
  deleteMatchAction,
  openMatchRegistrationAction,
} from '../../app/actions/match-actions.ts';
import {
  registerAttendanceAction,
  cancelAttendanceAction,
  checkinAttendanceAction,
  updateAttendanceGuestTypeAction,
} from '../../app/actions/rsvp-actions.ts';
import { recordPlayerCreditAction } from '../../app/actions/finance-actions.ts';
import type { Match, Attendance, Player, MatchStatus, ConfirmedRosterEntry, FinancialEntry } from '../../core/domain/index.ts';
import {
  formatWhatsAppGroupCapacityMessage,
  formatSecurityGateRosterMessage,
} from '../../core/utils/capacity-formatters.ts';
import {
  formatColombianPlate,
  formatPlateBadge,
  getVehicleIcon,
} from '../../core/utils/plate-formatter.ts';
import { copyToClipboard } from '../../core/utils/clipboard.ts';
import { MatchLiveStopwatch } from './MatchLiveStopwatch.tsx';
import { MatchGoalsTracker } from './MatchGoalsTracker.tsx';
import {
  Calendar,
  MapPin,
  Users,
  Target,
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
  RefreshCw,
  Banknote,
  Receipt,
  Check,
  Coins,
  Eye,
  History,
} from 'lucide-react';

interface MatchSettlementCardProps {
  initialMatch: Match | null;
  allMatches?: Match[];
  initialAttendances: Attendance[];
  players: Player[];
  estimatedFee: number;
  initialFinancialEntries?: FinancialEntry[];
}

export function MatchSettlementCard({
  initialMatch,
  allMatches = initialMatch ? [initialMatch] : [],
  initialAttendances,
  players,
  estimatedFee,
  initialFinancialEntries = [],
}: MatchSettlementCardProps) {
  const [matches, setMatches] = useState<Match[]>(allMatches);
  const [match, setMatch] = useState<Match | null>(initialMatch);
  const [attendances, setAttendances] = useState<Attendance[]>(initialAttendances);
  const [financialEntries, setFinancialEntries] = useState<FinancialEntry[]>(initialFinancialEntries);
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
  const [guestTypeForNewGuest, setGuestTypeForNewGuest] = useState<'PLAYER' | 'COMPANION'>('PLAYER');

  // Modal for Live Roster & Gate Access Sheet Preview / Copy
  const [showRosterShareModal, setShowRosterShareModal] = useState<boolean>(false);
  const [rosterTab, setRosterTab] = useState<'whatsapp' | 'gate'>('whatsapp');

  // Quick Cash Payment Modal State (For registering cash at the pitch)
  const [cashModalPlayer, setCashModalPlayer] = useState<{ id: string; name: string; suggestedAmount: number } | null>(null);
  const [cashAmount, setCashAmount] = useState<number>(10000);
  const [cashNote, setCashNote] = useState<string>('');

  // Payment Breakdown & History Modal State
  const [showPaymentsHistoryModal, setShowPaymentsHistoryModal] = useState<boolean>(false);

  // Minimalist active tab navigation
  const [activeTab, setActiveTab] = useState<'roster' | 'goals' | 'finances' | 'share'>('roster');

  const isSettled = match ? match.status === 'SETTLED' : false;
  const durationHours = match?.durationHours ?? 2;
  const parkingFeePerHour = match?.parkingFeePerHour ?? 1000;
  const vehicleParkingFee = durationHours * parkingFeePerHour;

  const maxPlayers = match?.maxPlayers || 18;
  const attendedCount = attendances.filter((a) => a.status === 'ATTENDED' && a.guestType !== 'COMPANION').length;
  const confirmedCount = attendances.filter((a) => (a.status === 'CONFIRMED' || a.status === 'ATTENDED') && a.guestType !== 'COMPANION').length;
  const waitlistCount = attendances.filter((a) => a.status === 'WAITLIST' && a.guestType !== 'COMPANION').length;
  const companionCount = attendances.filter((a) => (a.status === 'CONFIRMED' || a.status === 'ATTENDED') && a.guestType === 'COMPANION').length;

  const fullCapacityPitchFee = match ? Math.ceil(match.pitchRentalCost / maxPlayers) : 0;
  const dynamicPitchFee = match
    ? confirmedCount > 0
      ? Math.ceil(match.pitchRentalCost / confirmedCount)
      : fullCapacityPitchFee
    : 0;

  const basePitchFee = match
    ? isSettled
      ? match.settledFeePerPlayer ?? 0
      : attendedCount > 0
      ? Math.ceil(match.pitchRentalCost / attendedCount)
      : dynamicPitchFee
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
    
    // Format to YYYY-MM-DDTHH:mm specifically in America/Bogota timezone
    const formatter = new Intl.DateTimeFormat('es-CO', {
      timeZone: 'America/Bogota',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const parts = formatter.formatToParts(new Date(match.date));
    const getPart = (type: string) => parts.find((p) => p.type === type)?.value || '00';
    const year = getPart('year');
    const month = getPart('month');
    const day = getPart('day');
    const hour = getPart('hour');
    const minute = getPart('minute');
    setEditDate(`${year}-${month}-${day}T${hour}:${minute}`);

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
        if (res.attendances) {
          setAttendances(res.attendances);
        }
        setShowEditModal(false);
      }
    });
  };

  const handleReconcileAttendances = () => {
    if (!match) return;
    startTransition(async () => {
      const res = await reconcileMatchAttendancesAction(match.id);
      setFeedback({ success: res.success, message: res.message });
      if (res.success && res.data) {
        setAttendances(res.data.allAttendances);
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
      const res = await registerAttendanceAction(
        match.id,
        selectedHostPlayerId,
        guestName.trim(),
        false,
        undefined,
        guestTypeForNewGuest
      );
      setFeedback(res);
      if (res.success && res.data) {
        const newAtt = (res.data as any).attendance;
        setAttendances((prev) => [...prev, newAtt]);
        setGuestName('');
      }
    });
  };

  const handleToggleGuestType = (attendanceId: string, currentType?: 'PLAYER' | 'COMPANION') => {
    const nextType: 'PLAYER' | 'COMPANION' = currentType === 'COMPANION' ? 'PLAYER' : 'COMPANION';
    startTransition(async () => {
      const res = await updateAttendanceGuestTypeAction(attendanceId, nextType);
      setFeedback(res);
      if (res.success && res.data) {
        setAttendances((prev) =>
          prev.map((a) => (a.id === attendanceId ? { ...a, guestType: nextType } : a))
        );
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

  const handleRecordCashPayment = () => {
    if (!cashModalPlayer || cashAmount <= 0) return;
    startTransition(async () => {
      const res = await recordPlayerCreditAction(
        cashModalPlayer.id,
        cashAmount,
        cashNote.trim() || `Pago en efectivo cancha - ${match?.location || 'Partido'}`,
        undefined,
        match?.id
      );
      setFeedback(res);
      if (res.success) {
        if (res.data && (res.data as any).entry) {
          const entryData = (res.data as any).entry;
          const newEntry: FinancialEntry = {
            id: entryData.id,
            playerId: entryData.playerId,
            type: 'CREDIT',
            amount: entryData.amount,
            referenceDate: new Date(entryData.referenceDate),
            note: entryData.note,
            matchId: match?.id,
            receiptUrl: entryData.receiptUrl,
            createdAt: new Date(entryData.createdAt),
          };
          setFinancialEntries((prev) => [newEntry, ...prev]);
        }
        setCashModalPlayer(null);
      }
    });
  };

  const getPlayerPaymentDetails = (playerId: string, playerFee: number) => {
    const playerCredits = financialEntries.filter(
      (e) =>
        e.type === 'CREDIT' &&
        e.playerId === playerId &&
        (e.matchId === match?.id ||
          (match && e.note && e.note.toLowerCase().includes(match.location.toLowerCase())))
    );
    const totalPaid = playerCredits.reduce((sum, e) => sum + e.amount, 0);
    const isPaid = playerFee > 0 ? totalPaid >= playerFee : totalPaid > 0;
    const isPartial = totalPaid > 0 && totalPaid < playerFee;
    const pendingAmount = Math.max(0, playerFee - totalPaid);

    return {
      totalPaid,
      isPaid,
      isPartial,
      pendingAmount,
      credits: playerCredits,
    };
  };

  const playingAttendances = attendances.filter(
    (a) => a.guestType !== 'COMPANION' && a.status !== 'CANCELLED'
  );

  const totalTargetCollection = playingAttendances.reduce((acc, att) => {
    const isDriver = !!(att.hasVehicle || att.vehiclePlate);
    const fee = basePitchFee + (isDriver ? vehicleParkingFee : 0);
    return acc + fee;
  }, 0);

  const matchFinancialCredits = financialEntries.filter(
    (e) =>
      e.type === 'CREDIT' &&
      (e.matchId === match?.id ||
        (match && e.note && e.note.toLowerCase().includes(match.location.toLowerCase())))
  );

  const totalCollected = matchFinancialCredits.reduce((acc, e) => acc + e.amount, 0);
  const totalRemaining = Math.max(0, totalTargetCollection - totalCollected);
  const paidPlayersCount = playingAttendances.filter((att) => {
    const isDriver = !!(att.hasVehicle || att.vehiclePlate);
    const fee = basePitchFee + (isDriver ? vehicleParkingFee : 0);
    return getPlayerPaymentDetails(att.playerId, fee).isPaid;
  }).length;
  const collectionPercent = totalTargetCollection > 0
    ? Math.min(100, Math.round((totalCollected / totalTargetCollection) * 100))
    : 0;

  const getPlayer = (playerId: string) => players.find((p) => p.id === playerId);

  const vehicleList = attendances.filter(
    (a) => (a.hasVehicle || a.vehiclePlate) && a.status !== 'CANCELLED'
  );

  const buildLiveRosterEntries = (): ConfirmedRosterEntry[] => {
    const confirmedAttendances = attendances
      .filter((a) => a.status === 'CONFIRMED' || a.status === 'ATTENDED')
      .sort((a, b) => new Date(a.registeredAt).getTime() - new Date(b.registeredAt).getTime());

    return confirmedAttendances.map((att, idx) => {
      const host = players.find((p) => p.id === att.playerId);
      const isGuest = Boolean(att.guestName && att.guestName.trim().length > 0);
      const fullName = isGuest ? att.guestName!.trim() : (host?.fullName || 'Jugador Registrado');
      const documentId = isGuest ? undefined : host?.documentId;
      const vehiclePlate = att.vehiclePlate;
      const hasVehicle = att.hasVehicle ?? !!vehiclePlate;

      return {
        slotNumber: idx + 1,
        playerId: att.playerId,
        fullName,
        documentId,
        hasVehicle,
        vehiclePlate,
        isGuest,
        guestName: att.guestName,
        guestType: att.guestType || 'PLAYER',
        hostPlayerName: isGuest ? host?.fullName : undefined,
        registeredAt: new Date(att.registeredAt),
      };
    });
  };

  const getWhatsAppRosterText = () => {
    if (!match) return '';
    const roster = buildLiveRosterEntries();
    const playingCount = roster.filter((r) => r.guestType !== 'COMPANION').length;
    const dynamicEstFee = playingCount > 0 ? Math.ceil(match.pitchRentalCost / playingCount) : 0;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const rsvpUrl = `${origin}/rsvp/${match.id}`;

    return formatWhatsAppGroupCapacityMessage({
      matchId: match.id,
      matchLocation: match.location,
      matchLocationAddress: match.locationAddress,
      matchDate: new Date(match.date),
      googleMapsUrl: match.googleMapsUrl,
      confirmedCount: roster.length,
      totalCapacity: match.maxPlayers || 18,
      remainingSpots: Math.max(0, (match.maxPlayers || 18) - playingCount),
      roster,
      rsvpUrl,
      estFee: dynamicEstFee,
    });
  };

  const getGateRosterText = () => {
    if (!match) return '';
    const roster = buildLiveRosterEntries();
    return formatSecurityGateRosterMessage({
      matchId: match.id,
      matchLocation: match.location,
      matchLocationAddress: match.locationAddress,
      matchDate: new Date(match.date),
      durationHours: match.durationHours || 2,
      confirmedCount: roster.length,
      roster,
    });
  };

  const handleCopyWhatsAppRoster = async () => {
    const text = getWhatsAppRosterText();
    if (!text) return;
    const ok = await copyToClipboard(text);
    if (ok) {
      setFeedback({ success: true, message: '📋 Nómina para Grupo de WhatsApp copiada al portapapeles.' });
    } else {
      setFeedback({ success: false, message: 'No se pudo copiar automáticamente. Puedes seleccionar el texto y copiarlo manualmente.' });
    }
  };

  const handleCopyGateRoster = async () => {
    const text = getGateRosterText();
    if (!text) return;
    const ok = await copyToClipboard(text);
    if (ok) {
      setFeedback({ success: true, message: '🏢 Planilla de Portería / Vigilancia copiada al portapapeles.' });
    } else {
      setFeedback({ success: false, message: 'No se pudo copiar automáticamente. Puedes seleccionar el texto y copiarlo manualmente.' });
    }
  };

  const handleCopyParkingList = async () => {
    if (!match || vehicleList.length === 0) return;
    const formattedDate = new Date(match.date).toLocaleDateString('es-CO', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
    });
    const lines = vehicleList.map((a, i) => {
      const host = getPlayer(a.playerId);
      const isComp = a.guestType === 'COMPANION';
      const name = a.guestName
        ? `${a.guestName} (${isComp ? 'Acompañante' : 'Invitado'} de ${host?.fullName || 'Anfitrión'})`
        : host?.fullName || a.playerId;
      const formattedBadge = a.vehiclePlate ? formatPlateBadge(a.vehiclePlate) : '🚗 Registrado';
      return `${i + 1}. ${formattedBadge} — ${name}`;
    });
    const text = `🚗 *PLANILLA DE VEHÍCULOS / PARQUEADERO - MIZPA FC*\n📍 *Sede:* ${match.location}\n📅 *Fecha:* ${formattedDate}\n\n${lines.join('\n')}\n\nTotal autorizados: ${vehicleList.length} vehículos.`;
    const ok = await copyToClipboard(text);
    if (ok) {
      setFeedback({ success: true, message: 'Lista de parqueadero copiada al portapapeles para portería/vigilancia.' });
    } else {
      setFeedback({ success: false, message: 'No se pudo copiar automáticamente. Puedes seleccionar el texto y copiarlo manualmente.' });
    }
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
    const isCompanion = att.guestType === 'COMPANION';
    return (
      <div className="space-y-0.5">
        {att.guestName ? (
          <div>
            <span className={isCompanion ? "font-semibold text-blue-300" : "font-semibold text-emerald-300"}>
              {isCompanion ? '👥 ' : '⚽ '} {att.guestName}
            </span>
            <span className="ml-2 text-xs text-zinc-400">
              ({isCompanion ? 'Acompañante • Barra' : 'Invitado Jugador'} de {getPlayerDisplayName(hostPlayer, att.playerId)})
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
              <strong className="text-emerald-400 font-bold">{formatPlateBadge(att.vehiclePlate)}</strong>
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
                        {m.location} ({new Date(m.date).toLocaleDateString('es-CO', { timeZone: 'America/Bogota', day: 'numeric', month: 'short' })})
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
                  timeZone: 'America/Bogota',
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

              {!isSettled && (
                <Button
                  onClick={handleReconcileAttendances}
                  variant="outline"
                  size="default"
                  disabled={isPending}
                  className="border-sky-500/30 bg-sky-950/20 hover:bg-sky-900/40 text-sky-300 hover:text-sky-100 hover:border-sky-500/60 shadow-sm hover:shadow-sky-500/10 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 text-xs sm:text-sm font-semibold rounded-lg px-3.5 py-2 flex items-center gap-2 group"
                  title="Sincronizar cupos y promover lista de espera"
                >
                  <RefreshCw className={`w-4 h-4 text-sky-400 group-hover:rotate-180 transition-transform duration-500 ${isPending ? 'animate-spin' : ''}`} />
                  <span>Sincronizar Cupos</span>
                </Button>
              )}

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

              <Button
                onClick={() => setShowRosterShareModal(true)}
                variant="outline"
                size="default"
                className="border-emerald-600/70 bg-emerald-950/50 hover:bg-emerald-900/70 text-emerald-300 gap-1.5 font-semibold text-xs sm:text-sm shadow-sm"
                title="Copiar nómina actualizada para WhatsApp o planilla para Portería/Vigilancia"
              >
                <Share2 className="w-4 h-4 text-emerald-400" /> 📲 Copiar Nómina & Portería
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
                  timeZone: 'America/Bogota',
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

      {/* Modal para Compartir Nómina WhatsApp y Planilla de Portería / Vigilancia */}
      {showRosterShareModal && match && (
        <Card className="border-emerald-500/60 bg-gradient-to-b from-zinc-900 to-zinc-950 shadow-2xl animate-in fade-in duration-200">
          <CardHeader className="pb-3 border-b border-zinc-800 flex flex-row items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg flex items-center gap-2 text-white">
                <Share2 className="w-5 h-5 text-emerald-400" /> Nómina en Vivo y Planilla de Control
              </CardTitle>
              <CardDescription className="text-xs text-zinc-400">
                Generación dinámica en tiempo real con cálculo de cuota prorrateada, lista de espera y control de acceso.
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowRosterShareModal(false)}
              className="text-zinc-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </Button>
          </CardHeader>

          <CardContent className="pt-4 space-y-4">
            {/* Tabs Selector */}
            <div className="flex border-b border-zinc-800 gap-2">
              <button
                type="button"
                onClick={() => setRosterTab('whatsapp')}
                className={`pb-2.5 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
                  rosterTab === 'whatsapp'
                    ? 'border-emerald-500 text-emerald-400'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <span>💬 Grupo WhatsApp (Deportivo)</span>
                <Badge variant="outline" className="text-[10px] border-emerald-800 text-emerald-300">
                  {confirmedCount}/{maxPlayers}
                </Badge>
              </button>

              <button
                type="button"
                onClick={() => setRosterTab('gate')}
                className={`pb-2.5 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
                  rosterTab === 'gate'
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>🏢 Portería & Vigilancia (Acceso)</span>
                <Badge variant="outline" className="text-[10px] border-blue-800 text-blue-300">
                  {confirmedCount + companionCount} personas
                </Badge>
              </button>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-zinc-950/70 p-3 rounded-lg border border-zinc-800 text-xs">
              <div>
                <span className="text-zinc-400 block text-[11px]">⚽ Jugadores Cancha:</span>
                <span className="text-emerald-400 font-bold font-mono text-sm">
                  {confirmedCount} / {maxPlayers}
                </span>
              </div>
              <div>
                <span className="text-zinc-400 block text-[11px]">👥 Acompañantes:</span>
                <span className="text-blue-400 font-bold font-mono text-sm">
                  {companionCount}
                </span>
              </div>
              <div>
                <span className="text-zinc-400 block text-[11px]">💵 Cuota Dinámica:</span>
                <span className="text-amber-400 font-bold font-mono text-sm">
                  ${dynamicPitchFee.toLocaleString('es-CO')} COP
                </span>
              </div>
              <div>
                <span className="text-zinc-400 block text-[11px]">🚗 Vehículos / Placas:</span>
                <span className="text-purple-400 font-bold font-mono text-sm">
                  {vehicleList.length}
                </span>
              </div>
            </div>

            {/* Text Preview Box */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>Vista previa del mensaje generado en vivo:</span>
                <span className="font-mono text-[11px]">
                  {rosterTab === 'whatsapp' ? 'Formato WhatsApp' : 'Formato Portería'}
                </span>
              </div>

              <pre className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-xs text-zinc-200 font-mono whitespace-pre-wrap max-h-72 overflow-y-auto leading-relaxed select-all">
                {rosterTab === 'whatsapp' ? getWhatsAppRosterText() : getGateRosterText()}
              </pre>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <p className="text-[11px] text-zinc-400">
                {rosterTab === 'whatsapp'
                  ? '💡 Incluye nómina numerada, acompañantes, cuota dinámica calculada y cupos restantes.'
                  : '💡 Incluye cédulas, placas vehiculares registradas y conteo oficial para los guardas.'}
              </p>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button
                  onClick={rosterTab === 'whatsapp' ? handleCopyWhatsAppRoster : handleCopyGateRoster}
                  size="sm"
                  className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold gap-1.5 shadow-md"
                >
                  <Copy className="w-3.5 h-3.5" /> Copiar al Portapapeles
                </Button>

                {rosterTab === 'whatsapp' && (
                  <a
                    href={`https://api.whatsapp.com/send?text=${encodeURIComponent(getWhatsAppRosterText())}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex"
                  >
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-emerald-700/60 bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 text-xs gap-1.5 font-medium"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Abrir en WhatsApp
                    </Button>
                  </a>
                )}
              </div>
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
                    {/* Live Match Stopwatch Control & Timer */}
          <MatchLiveStopwatch
            matchId={match.id}
            matchLocation={match.location}
            durationHours={durationHours}
          />

          {/* Minimalist 4-KPI Metric Chips */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3 shadow-sm">
              <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-emerald-400" /> Nómina Oficial
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-xl font-black font-mono text-white">
                  {confirmedCount}
                </span>
                <span className="text-xs text-zinc-500 font-mono">/ {maxPlayers} cupos</span>
              </div>
              <div className="mt-1 text-[11px] text-zinc-400">
                {attendedCount} en cancha • {companionCount} acompañantes
              </div>
            </div>

            <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3 shadow-sm">
              <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" /> Cuota Cancha
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-xl font-black font-mono text-emerald-400">
                  ${basePitchFee.toLocaleString('es-CO')}
                </span>
                <span className="text-[10px] text-zinc-500">COP c/u</span>
              </div>
              <div className="mt-1 text-[11px] text-zinc-400 font-mono">
                Base ${fullCapacityPitchFee.toLocaleString('es-CO')} ({maxPlayers}j)
              </div>
            </div>

            <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3 shadow-sm">
              <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Car className="w-3.5 h-3.5 text-amber-400" /> Vehículos
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-xl font-black font-mono text-amber-300">
                  {vehicleList.length}
                </span>
                <span className="text-xs text-zinc-500">con parqueadero</span>
              </div>
              <div className="mt-1 text-[11px] text-zinc-400">
                +${vehicleParkingFee.toLocaleString('es-CO')} COP / vehículo
              </div>
            </div>

            <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3 shadow-sm">
              <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5 text-sky-400" /> Alquiler Cancha
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-xl font-black font-mono text-white">
                  ${match.pitchRentalCost.toLocaleString('es-CO')}
                </span>
                <span className="text-[10px] text-zinc-500">COP</span>
              </div>
              <div className="mt-1 text-[11px] text-zinc-400">
                {durationHours} horas de juego
              </div>
            </div>
          </div>

          {/* Minimalist Segmented Tabs */}
          <div className="flex items-center justify-between border-b border-zinc-800 pt-2">
            <div className="flex gap-1 sm:gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('roster')}
                className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                  activeTab === 'roster'
                    ? 'border-emerald-500 text-emerald-400'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Nómina & Asistencia</span>
                <Badge variant="outline" className="text-[10px] border-emerald-800/80 text-emerald-300 py-0 px-1.5">
                  {confirmedCount}
                </Badge>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('goals')}
                className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                  activeTab === 'goals'
                    ? 'border-emerald-500 text-emerald-400'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Target className="w-4 h-4" />
                <span>Goles & Marcador ⚽</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('finances')}
                className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                  activeTab === 'finances'
                    ? 'border-emerald-500 text-emerald-400'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <DollarSign className="w-4 h-4" />
                <span>Liquidación</span>
                {isSettled && (
                  <Badge variant="success" className="text-[9px] py-0 px-1">
                    Cerrado
                  </Badge>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('share')}
                className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                  activeTab === 'share'
                    ? 'border-emerald-500 text-emerald-400'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Share2 className="w-4 h-4" />
                <span>Difusión & Portería</span>
              </button>
            </div>

            <Link href={`/rsvp/${match.id}`} target="_blank" className="hidden sm:inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-emerald-400 transition-colors pb-2">
              <ExternalLink className="w-3.5 h-3.5" /> Link RSVP
            </Link>
          </div>

          {/* TAB 1: NÓMINA Y ASISTENCIA */}
          {activeTab === 'roster' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              {/* Guest Registration Form (+1) */}
              {!isSettled && (
                <Card className="border-zinc-800/80 bg-zinc-900/40">
                  <CardHeader className="py-3 px-4">
                    <CardTitle className="text-xs font-semibold flex items-center gap-2 text-zinc-300">
                      <UserPlus className="w-3.5 h-3.5 text-emerald-400" /> Registrar Invitado (+1)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 pt-0">
                    <form onSubmit={handleAddGuest} className="flex flex-col sm:flex-row gap-2.5 items-end">
                      <div className="w-full sm:w-1/4">
                        <label className="text-[11px] text-zinc-400 block mb-1">Anfitrión:</label>
                        <select
                          value={selectedHostPlayerId}
                          onChange={(e) => setSelectedHostPlayerId(e.target.value)}
                          className="w-full bg-zinc-800 border border-zinc-700 text-zinc-100 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        >
                          {players.map((p) => (
                            <option key={p.id} value={p.id}>
                              {getPlayerDisplayName(p)}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="w-full sm:w-1/4">
                        <label className="text-[11px] text-zinc-400 block mb-1">Tipo:</label>
                        <select
                          value={guestTypeForNewGuest}
                          onChange={(e) => setGuestTypeForNewGuest(e.target.value as 'PLAYER' | 'COMPANION')}
                          className="w-full bg-zinc-800 border border-zinc-700 text-zinc-100 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        >
                          <option value="PLAYER">⚽ Invitado Jugador (Juega)</option>
                          <option value="COMPANION">👥 Acompañante (No juega - $0)</option>
                        </select>
                      </div>
                      <div className="w-full sm:flex-1">
                        <label className="text-[11px] text-zinc-400 block mb-1">Nombre Invitado:</label>
                        <input
                          type="text"
                          placeholder="Nombre y Apellido del invitado"
                          value={guestName}
                          onChange={(e) => setGuestName(e.target.value)}
                          className="w-full bg-zinc-800 border border-zinc-700 text-zinc-100 text-xs rounded-lg px-2.5 py-1.5 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                      <Button
                        type="submit"
                        disabled={isPending || !guestName.trim()}
                        size="sm"
                        className="w-full sm:w-auto text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
                      >
                        + Agregar
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              )}

              {/* Bento Live Cash Collection & Payment Status Bar */}
              <div className="bg-gradient-to-r from-zinc-900 via-zinc-900/90 to-zinc-950 border border-emerald-500/30 rounded-2xl p-4 shadow-xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <Banknote className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                          Recaudo en Cancha (Efectivo & Abonos)
                        </h3>
                        <Badge
                          variant={paidPlayersCount === playingAttendances.length && playingAttendances.length > 0 ? 'success' : 'default'}
                          className="text-[10px] font-mono py-0 px-1.5"
                        >
                          {paidPlayersCount} / {playingAttendances.length} al día
                        </Badge>
                      </div>
                      <p className="text-xs text-zinc-400">
                        Control en tiempo real de pagos registrados por cada jugador.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => setShowPaymentsHistoryModal(true)}
                      variant="outline"
                      size="sm"
                      className="text-xs border-zinc-700 bg-zinc-800/60 hover:bg-zinc-800 text-emerald-300 gap-1.5 h-8 font-semibold shadow-sm"
                    >
                      <History className="w-3.5 h-3.5 text-emerald-400" />
                      Historial ({matchFinancialCredits.length})
                    </Button>
                  </div>
                </div>

                {/* KPI Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-2.5">
                    <span className="text-[11px] font-medium text-zinc-400 block">Total Recaudado:</span>
                    <span className="text-base sm:text-lg font-black font-mono text-emerald-400">
                      ${totalCollected.toLocaleString('es-CO')} <span className="text-[10px] text-zinc-500 font-normal">COP</span>
                    </span>
                  </div>

                  <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-2.5">
                    <span className="text-[11px] font-medium text-zinc-400 block">Pendiente por Cobrar:</span>
                    <span className={`text-base sm:text-lg font-black font-mono ${totalRemaining > 0 ? 'text-amber-400' : 'text-zinc-400'}`}>
                      ${totalRemaining.toLocaleString('es-CO')} <span className="text-[10px] text-zinc-500 font-normal">COP</span>
                    </span>
                  </div>

                  <div className="col-span-2 sm:col-span-1 bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-2.5 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-[11px] text-zinc-400">
                      <span>Meta de Cancha:</span>
                      <span className="font-mono text-zinc-300 font-bold">{collectionPercent}%</span>
                    </div>
                    <div className="w-full bg-zinc-800 rounded-full h-2 mt-1.5 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500"
                        style={{ width: `${collectionPercent}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Attendances & Playing Squad Table (ONLY PLAYERS) */}
              <Card className="border-zinc-800 bg-zinc-900/60 shadow-md overflow-hidden">
                <CardHeader className="py-3 px-4 border-b border-zinc-800 flex flex-row items-center justify-between gap-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2 text-white">
                    <Users className="w-4 h-4 text-emerald-400" /> Nómina Oficial de Jugadores ({confirmedCount}/{maxPlayers})
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={handleCopyWhatsAppRoster}
                      variant="outline"
                      size="sm"
                      className="text-xs h-7 gap-1 border-zinc-700 hover:bg-zinc-800 text-emerald-300"
                      title="Copiar nómina deportiva para WhatsApp"
                    >
                      <Copy className="w-3 h-3 text-emerald-400" />
                      WhatsApp
                    </Button>
                    <span className="text-xs font-mono text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded">
                      {attendances.filter((a) => a.guestType !== 'COMPANION').length} registrados
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {attendances.filter((a) => a.guestType !== 'COMPANION').length === 0 ? (
                    <div className="p-8 text-center text-zinc-500 text-sm">
                      Aún no hay jugadores inscritos para este partido.
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="border-zinc-800 hover:bg-transparent text-xs">
                          <TableHead className="w-8">#</TableHead>
                          <TableHead>Jugador</TableHead>
                          <TableHead>Asistencia</TableHead>
                          <TableHead>Cuota Cancha</TableHead>
                          <TableHead>Estado de Pago 💵</TableHead>
                          {!isSettled && <TableHead className="text-right">Acciones</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {attendances
                          .filter((a) => a.guestType !== 'COMPANION')
                          .map((att, idx) => {
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
                            const playerFee = isCancelled ? 0 : basePitchFee + (isVehicleDriver ? vehicleParkingFee : 0);
                            const payment = getPlayerPaymentDetails(att.playerId, playerFee);

                            return (
                              <TableRow key={att.id} className={isCancelled ? 'opacity-50 text-xs' : 'text-xs'}>
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
                                  {isCancelled ? (
                                    <span className="text-zinc-500">$0</span>
                                  ) : (
                                    <div>
                                      <span className={isAttended ? 'font-bold text-zinc-200' : 'text-zinc-400'}>
                                        ${playerFee.toLocaleString('es-CO')} COP
                                      </span>
                                      {isVehicleDriver && (
                                        <span className="text-[10px] text-amber-400 block">
                                          +${vehicleParkingFee.toLocaleString('es-CO')} Parqueadero
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {isCancelled ? (
                                    <span className="text-zinc-500 text-xs">—</span>
                                  ) : payment.isPaid ? (
                                    <div className="flex flex-col">
                                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 rounded-md w-fit">
                                        <Check className="w-3.5 h-3.5" /> Pagó ${payment.totalPaid.toLocaleString('es-CO')}
                                      </span>
                                      <span className="text-[10px] text-zinc-400 font-mono mt-0.5">
                                        {payment.credits.length > 1 ? `${payment.credits.length} abonos registrados` : 'Efectivo en cancha'}
                                      </span>
                                    </div>
                                  ) : payment.isPartial ? (
                                    <div className="flex flex-col">
                                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-400 bg-amber-950/60 border border-amber-500/40 px-2 py-0.5 rounded-md w-fit">
                                        ⚠️ Abonó ${payment.totalPaid.toLocaleString('es-CO')}
                                      </span>
                                      <span className="text-[10px] text-amber-300/80 font-mono mt-0.5">
                                        Resta: ${payment.pendingAmount.toLocaleString('es-CO')} COP
                                      </span>
                                    </div>
                                  ) : (
                                    <div className="flex flex-col">
                                      <span className="inline-flex items-center gap-1 text-xs font-medium text-rose-400 bg-rose-950/40 border border-rose-800/40 px-2 py-0.5 rounded-md w-fit">
                                        ⏳ Pendiente
                                      </span>
                                      <span className="text-[10px] text-zinc-500 font-mono mt-0.5">
                                        Debe ${playerFee.toLocaleString('es-CO')} COP
                                      </span>
                                    </div>
                                  )}
                                </TableCell>
                                {!isSettled && (
                                  <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                      {!isCancelled && (
                                        payment.isPaid ? (
                                          <Button
                                            onClick={() => {
                                              const host = getPlayer(att.playerId);
                                              setCashModalPlayer({
                                                id: att.playerId,
                                                name: host?.fullName || att.playerId,
                                                suggestedAmount: 5000,
                                              });
                                              setCashAmount(5000);
                                              setCashNote(`Abono adicional en efectivo - ${match.location}`);
                                            }}
                                            disabled={isPending}
                                            variant="outline"
                                            size="sm"
                                            className="text-xs h-7 px-2 border-emerald-700/50 text-emerald-400 hover:bg-emerald-950/50"
                                            title="Registrar abono extra"
                                          >
                                            <Coins className="w-3 h-3 mr-1 text-emerald-400" /> +Abonar
                                          </Button>
                                        ) : (
                                          <Button
                                            onClick={() => {
                                              const host = getPlayer(att.playerId);
                                              const suggested = payment.isPartial
                                                ? payment.pendingAmount
                                                : (playerFee > 0 ? playerFee : dynamicPitchFee);
                                              setCashModalPlayer({
                                                id: att.playerId,
                                                name: host?.fullName || att.playerId,
                                                suggestedAmount: suggested,
                                              });
                                              setCashAmount(suggested);
                                              setCashNote(`Pago en efectivo cancha - ${match.location}`);
                                            }}
                                            disabled={isPending}
                                            variant="default"
                                            size="sm"
                                            className="text-xs h-7 px-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-sm"
                                            title="Registrar pago recibido en efectivo"
                                          >
                                            <Banknote className="w-3.5 h-3.5 mr-1" />
                                            {payment.isPartial ? 'Completar $' : '💵 Cobrar $'}
                                          </Button>
                                        )
                                      )}
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

              {/* Companions & Spectators Section */}
              {companionCount > 0 && (
                <Card className="border-blue-900/40 bg-zinc-900/40 shadow-sm overflow-hidden">
                  <CardHeader className="py-2.5 px-4 border-b border-zinc-800 flex flex-row items-center justify-between">
                    <CardTitle className="text-xs font-semibold flex items-center gap-2 text-blue-300">
                      <Users className="w-3.5 h-3.5 text-blue-400" /> Acompañantes & Barra ({companionCount}) — No pagan cancha
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableBody>
                        {attendances
                          .filter((a) => a.guestType === 'COMPANION')
                          .map((att, idx) => {
                            const hostPlayer = getPlayer(att.playerId);
                            return (
                              <TableRow key={att.id} className="text-xs hover:bg-blue-950/10">
                                <TableCell className="text-xs font-mono text-zinc-500 w-8">
                                  #{idx + 1}
                                </TableCell>
                                <TableCell className="font-semibold text-blue-300">
                                  👥 {att.guestName || 'Acompañante'}
                                </TableCell>
                                <TableCell className="text-zinc-400">
                                  con {getPlayerDisplayName(hostPlayer, att.playerId)}
                                </TableCell>
                                <TableCell>
                                  {att.vehiclePlate ? (
                                    <span className="font-mono text-emerald-400 font-bold bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700">
                                      {formatPlateBadge(att.vehiclePlate)}
                                    </span>
                                  ) : (
                                    <span className="text-zinc-500">Sin vehículo</span>
                                  )}
                                </TableCell>
                                {!isSettled && (
                                  <TableCell className="text-right">
                                    <Button
                                      onClick={() => handleCancelAttendance(att.id)}
                                      disabled={isPending}
                                      variant="destructive"
                                      size="sm"
                                      className="text-xs h-6 px-2"
                                    >
                                      Cancelar
                                    </Button>
                                  </TableCell>
                                )}
                              </TableRow>
                            );
                          })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* TAB: GOLES Y MARCADOR */}
          {activeTab === 'goals' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <MatchGoalsTracker
                match={match}
                roster={buildLiveRosterEntries()}
                allPlayers={players}
              />
            </div>
          )}

          {/* TAB 2: LIQUIDACIÓN FINANCIERA */}
          {activeTab === 'finances' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <Card className="border-zinc-800 bg-zinc-900/60 p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-emerald-400" /> Resumen de Liquidación
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Cálculo final de cuotas, egresos y recaudación del partido.
                    </p>
                  </div>
                  <Button
                    onClick={handleSettle}
                    disabled={isSettled || isPending || attendedCount === 0}
                    variant={isSettled ? 'secondary' : 'default'}
                    size="sm"
                    className="font-bold text-xs"
                  >
                    {isPending ? 'Liquidando...' : isSettled ? '✓ Partido Liquidado' : 'Liquidar Partido'}
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
                  <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                    <span className="text-zinc-400 block mb-1">Costo Cancha:</span>
                    <span className="text-lg font-mono font-bold text-white">
                      ${match.pitchRentalCost.toLocaleString('es-CO')} COP
                    </span>
                  </div>
                  <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                    <span className="text-zinc-400 block mb-1">Cuota por Jugador:</span>
                    <span className="text-lg font-mono font-bold text-emerald-400">
                      ${basePitchFee.toLocaleString('es-CO')} COP
                    </span>
                  </div>
                  <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                    <span className="text-zinc-400 block mb-1">Total Recaudado:</span>
                    <span className="text-lg font-mono font-bold text-emerald-400">
                      ${totalCollected.toLocaleString('es-CO')} COP
                    </span>
                  </div>
                  <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                    <span className="text-zinc-400 block mb-1">Pendiente por Cobrar:</span>
                    <span className={`text-lg font-mono font-bold ${totalRemaining > 0 ? 'text-amber-400' : 'text-zinc-400'}`}>
                      ${totalRemaining.toLocaleString('es-CO')} COP
                    </span>
                  </div>
                </div>

                {/* Per-player payment breakdown in Finances tab */}
                <div className="pt-2">
                  <h4 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                    Desglose Individual de Pagos
                  </h4>
                  <div className="border border-zinc-800 rounded-xl overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-zinc-800 text-xs">
                          <TableHead>Jugador</TableHead>
                          <TableHead>Cuota Liquidada</TableHead>
                          <TableHead>Pagado</TableHead>
                          <TableHead>Saldo Pendiente</TableHead>
                          <TableHead>Estado</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {playingAttendances.map((att) => {
                          const host = getPlayer(att.playerId);
                          const isDriver = !!(att.hasVehicle || att.vehiclePlate);
                          const fee = basePitchFee + (isDriver ? vehicleParkingFee : 0);
                          const pay = getPlayerPaymentDetails(att.playerId, fee);
                          const name = att.guestName ? `${att.guestName} (Invitado)` : host?.fullName || att.playerId;

                          return (
                            <TableRow key={att.id} className="text-xs">
                              <TableCell className="font-medium text-zinc-200">
                                ⚽ {name}
                              </TableCell>
                              <TableCell className="font-mono">${fee.toLocaleString('es-CO')} COP</TableCell>
                              <TableCell className="font-mono text-emerald-400 font-bold">
                                ${pay.totalPaid.toLocaleString('es-CO')} COP
                              </TableCell>
                              <TableCell className="font-mono">
                                {pay.pendingAmount > 0 ? (
                                  <span className="text-amber-400">${pay.pendingAmount.toLocaleString('es-CO')} COP</span>
                                ) : (
                                  <span className="text-zinc-500">$0 COP</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {pay.isPaid ? (
                                  <Badge variant="success" className="text-[10px]">Al Día ✅</Badge>
                                ) : pay.isPartial ? (
                                  <Badge variant="warning" className="text-[10px]">Abono Parcial</Badge>
                                ) : (
                                  <Badge variant="destructive" className="text-[10px]">Pendiente</Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* TAB 3: DIFUSIÓN Y PORTERÍA */}
          {activeTab === 'share' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <Card className="border-zinc-800 bg-zinc-900/60 p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-3">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Share2 className="w-5 h-5 text-emerald-400" /> Convocatoria & Acceso a Portería
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Textos formateados listos para copiar con 1 toque.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleCopyWhatsAppRoster}
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold gap-1.5"
                    >
                      <Copy className="w-3.5 h-3.5" /> Copiar WhatsApp
                    </Button>
                    <Button
                      onClick={handleCopyGateRoster}
                      variant="outline"
                      size="sm"
                      className="border-blue-700/60 text-blue-300 hover:bg-blue-950 text-xs font-bold gap-1.5"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" /> Copiar Portería
                    </Button>
                  </div>
                </div>

                <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-xs font-mono text-zinc-300 space-y-2">
                  <div className="text-[11px] text-zinc-500 uppercase font-bold tracking-wider">
                    Enlace de inscripción directa (RSVP):
                  </div>
                  <div className="text-emerald-400 break-all select-all">
                    /rsvp/{match.id}
                  </div>
                </div>
              </Card>
            </div>
          )}
        </>
      )}

      {/* Quick Cash Payment Modal */}
      {cashModalPlayer && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-zinc-900 border border-emerald-500/40 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Registrar Efectivo</h3>
                  <p className="text-xs text-zinc-400">{cashModalPlayer.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCashModalPlayer(null)}
                className="text-zinc-400 hover:text-white p-1 rounded-full bg-zinc-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-zinc-400 block mb-1 font-semibold">Monto Recibido ($ COP):</label>
                <input
                  type="number"
                  min="1000"
                  step="1000"
                  value={cashAmount}
                  onChange={(e) => setCashAmount(Number(e.target.value))}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-base font-mono font-bold text-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="text-zinc-400 block mb-1 font-semibold">Concepto / Nota:</label>
                <input
                  type="text"
                  value={cashNote}
                  onChange={(e) => setCashNote(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-zinc-800">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setCashModalPlayer(null)}
                className="flex-1 text-zinc-400"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                disabled={isPending || cashAmount <= 0}
                onClick={handleRecordCashPayment}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-1"
              >
                {isPending ? 'Guardando...' : 'Confirmar 💵'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Match Cash Payments History Modal */}
      {showPaymentsHistoryModal && match && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-zinc-900 border border-emerald-500/40 rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl relative max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    Historial de Pagos en Cancha
                  </h3>
                  <p className="text-xs text-zinc-400">
                    {match.location} • {matchFinancialCredits.length} pagos registrados
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPaymentsHistoryModal(false)}
                className="text-zinc-400 hover:text-white p-1.5 rounded-full bg-zinc-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* List of Registered Payments */}
            <div className="overflow-y-auto flex-1 pr-1 space-y-2.5">
              {matchFinancialCredits.length === 0 ? (
                <div className="py-12 text-center text-zinc-500 text-xs space-y-2">
                  <div className="text-3xl">🪙</div>
                  <p>Aún no se han registrado pagos en efectivo para este partido.</p>
                  <p className="text-zinc-600 text-[11px]">
                    Haz clic en el botón <strong>&quot;💵 Cobrar $&quot;</strong> en la tabla de nómina para registrar pagos.
                  </p>
                </div>
              ) : (
                matchFinancialCredits.map((credit, idx) => {
                  const player = getPlayer(credit.playerId);
                  return (
                    <div
                      key={credit.id || idx}
                      className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-3 flex items-center justify-between gap-3 text-xs hover:border-zinc-700 transition-colors"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-zinc-100">
                            ⚽ {player?.fullName || credit.playerId}
                          </span>
                          {player?.alias && (
                            <span className="text-[10px] text-zinc-400 font-normal">
                              ({player.alias.replace(/^\(+|\)+$/g, '')})
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-zinc-400 flex items-center gap-2">
                          <span>{credit.note || 'Pago en efectivo cancha'}</span>
                        </div>
                        <div className="text-[10px] text-zinc-500">
                          {new Date(credit.referenceDate || credit.createdAt).toLocaleDateString('es-CO', {
                            timeZone: 'America/Bogota',
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="font-mono font-bold text-sm text-emerald-400 block">
                          +${credit.amount.toLocaleString('es-CO')}
                        </span>
                        <Badge variant="success" className="text-[9px] py-0 px-1.5 font-mono">
                          Efectivo
                        </Badge>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Total Footer */}
            <div className="border-t border-zinc-800 pt-3 shrink-0 flex items-center justify-between text-xs">
              <div>
                <span className="text-zinc-400 block text-[11px]">Total Recaudado:</span>
                <span className="text-base font-black font-mono text-emerald-400">
                  ${totalCollected.toLocaleString('es-CO')} COP
                </span>
              </div>
              <Button
                type="button"
                onClick={() => setShowPaymentsHistoryModal(false)}
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs"
              >
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
