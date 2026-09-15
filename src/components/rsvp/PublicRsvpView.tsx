'use client';

import * as React from 'react';
import { useState, useTransition } from 'react';
import { Badge } from '../ui/badge.tsx';
import { Button } from '../ui/button.tsx';
import {
  registerAttendanceAction,
  createPlayerAction,
} from '../../app/actions/rsvp-actions.ts';
import { recordPlayerCreditAction } from '../../app/actions/finance-actions.ts';
import { ReceiptUploader } from '../wallet/ReceiptUploader.tsx';
import {
  formatColombianPlate,
  formatPlateBadge,
  getVehicleIcon,
} from '../../core/utils/plate-formatter.ts';
import { copyToClipboard } from '../../core/utils/clipboard.ts';
import type { Match, Attendance, Player, ReceiptOcrResult } from '../../core/domain/types.ts';
import {
  Calendar,
  MapPin,
  Users,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Share2,
  Copy,
  Check,
  UserPlus,
  Clock,
  UserCheck,
  User,
  Car,
  ShieldCheck,
  Phone,
  CreditCard,
  ArrowRight,
  ArrowLeft,
  ChevronDown,
  Info,
  Sparkles,
  Smartphone,
  QrCode,
  Zap,
  X,
} from 'lucide-react';

interface PublicRsvpViewProps {
  match: Match;
  initialAttendances: Attendance[];
  players: Player[];
}

export function PublicRsvpView({
  match,
  initialAttendances,
  players: initialPlayers,
}: PublicRsvpViewProps) {
  const [attendances, setAttendances] = useState<Attendance[]>(initialAttendances);
  const [players, setPlayers] = useState<Player[]>(initialPlayers);

  // Registration form mode: 'new' or 'existing'
  const [registerMode, setRegisterMode] = useState<'new' | 'existing'>('new');

  // Typeform Step for new player flow: 1 (Google Email), 2 (Name), 3 (Document & Phone), 4 (Vehicle & Guest), 5 (Summary & Confirm), 'completed'
  const [step, setStep] = useState<number | 'completed'>(1);

  // Match details modal / drawer
  const [showMatchDetails, setShowMatchDetails] = useState<boolean>(false);
  const [showRosterModal, setShowRosterModal] = useState<boolean>(false);

  // Find players already registered in the match (matching by ID, documentId, or email)
  const registeredPlayerIds = new Set<string>();
  const registeredDocumentIds = new Set<string>();
  const registeredEmails = new Set<string>();

  attendances
    .filter((a) => (a.status === 'CONFIRMED' || a.status === 'WAITLIST' || a.status === 'ATTENDED') && !a.guestName)
    .forEach((a) => {
      registeredPlayerIds.add(a.playerId);
      const host = players.find((p) => p.id === a.playerId);
      if (host?.documentId) registeredDocumentIds.add(host.documentId.trim().toLowerCase());
      if (host?.email) registeredEmails.add(host.email.trim().toLowerCase());
    });

  const isPlayerRegistered = (p: Player): boolean => {
    if (registeredPlayerIds.has(p.id)) return true;
    if (p.documentId && registeredDocumentIds.has(p.documentId.trim().toLowerCase())) return true;
    if (p.email && registeredEmails.has(p.email.trim().toLowerCase())) return true;
    return false;
  };

  const availablePlayers = players.filter((p) => !isPlayerRegistered(p));

  const [selectedPlayerId, setSelectedPlayerId] = useState<string>(
    availablePlayers[0]?.id || players[0]?.id || ''
  );

  // New Player form fields
  const [newPlayerName, setNewPlayerName] = useState<string>('');
  const [newPlayerDocumentId, setNewPlayerDocumentId] = useState<string>('');
  const [newPlayerPhone, setNewPlayerPhone] = useState<string>('');

  // Vehicle confirmation fields
  const [hasVehicle, setHasVehicle] = useState<boolean>(false);
  const [vehiclePlate, setVehiclePlate] = useState<string>('');

  // Guest (+1) fields
  const [hasGuest, setHasGuest] = useState<boolean>(false);
  const [guestName, setGuestName] = useState<string>('');
  const [guestType, setGuestType] = useState<'PLAYER' | 'COMPANION'>('PLAYER');

  // Google / Gmail Verification State
  const [gmailAddress, setGmailAddress] = useState<string>('');
  const [isGmailVerified, setIsGmailVerified] = useState<boolean>(false);
  const [recognizedPlayer, setRecognizedPlayer] = useState<Player | null>(null);

  // Self-Service Payment & Completion States
  const [completedPlayerId, setCompletedPlayerId] = useState<string>('');
  const [paymentReceiptUrl, setPaymentReceiptUrl] = useState<string>('');
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentNote, setPaymentNote] = useState<string>('');
  const [paymentFeedback, setPaymentFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const [isPaymentPending, startPaymentTransition] = useTransition();
  const [paymentSuccess, setPaymentSuccess] = useState<boolean>(false);
  const [copiedBankId, setCopiedBankId] = useState<string | null>(null);

  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [origin, setOrigin] = useState<string>('');

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
  }, []);

  const confirmedList = attendances.filter(
    (a) => (a.status === 'CONFIRMED' || a.status === 'ATTENDED') && a.guestType !== 'COMPANION'
  );
  const companionList = attendances.filter(
    (a) => (a.status === 'CONFIRMED' || a.status === 'ATTENDED') && a.guestType === 'COMPANION'
  );
  const waitlistList = attendances.filter((a) => a.status === 'WAITLIST' && a.guestType !== 'COMPANION');
  const maxPlayers = match.maxPlayers || 18;
  const isFull = confirmedList.length >= maxPlayers;
  const isRegistrationOpen = match.status === 'OPEN_REGISTRATION' || match.status === 'DRAFT';
  const openSpots = Math.max(0, maxPlayers - confirmedList.length);

  const durationHours = match.durationHours || 2;
  const parkingFeePerHour = match.parkingFeePerHour ?? 1000;
  const parkingFee = durationHours * parkingFeePerHour;

  // Real-time dynamic fee: Costo Cancha / Jugadores Inscritos (en nómina confirmada)
  const confirmedPlayersCount = confirmedList.length;
  const currentInscribedDivider = confirmedPlayersCount > 0 ? confirmedPlayersCount : 1;
  const dynamicPitchFee = Math.ceil(match.pitchRentalCost / currentInscribedDivider);
  const estPitchFee = dynamicPitchFee;
  
  // Total fee calculated for this user
  const guestPitchFee = hasGuest && guestType === 'PLAYER' ? dynamicPitchFee : 0;
  const totalEstimatedForUser = dynamicPitchFee + guestPitchFee + (hasVehicle ? parkingFee : 0);

  const getPlayer = (id: string) => players.find((p) => p.id === id);

  const formattedDate = new Date(match.date).toLocaleString('es-CO', {
    timeZone: 'America/Bogota',
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

  const rsvpLink = `${(origin || process.env.NEXT_PUBLIC_SITE_URL || 'https://mizpa-fc.vercel.app').replace(/\/+$/, '')}/rsvp/${match.id}`;

  const shareText =
    `⚽ *CONVOCATORIA • MIZPA FC* ⚽\n\n` +
    `Convocatoria abierta. Confirma tu cupo en el link oficial:\n\n` +
    `📅 *Fecha:* ${formattedDate}\n` +
    `📍 *Cancha:* ${match.location}${match.locationAddress ? ` (${match.locationAddress})` : ''}\n` +
    `👥 *Cupos:* ${maxPlayers} jugadores\n` +
    `💵 *Cuota:* $${estPitchFee.toLocaleString('es-CO')} COP\n` +
    (mapsUrlToUse ? `🗺️ *Ubicación:* ${mapsUrlToUse}\n` : '') +
    `\n👟 *Calzado:* Zapatillas para sintética (sin taches / cero guayos).\n\n` +
    `🔗 *Inscríbete aquí:*\n` +
    `👉 ${rsvpLink}\n\n` +
    `⚠️ _Cupos por orden de llegada. Los siguientes pasan a lista de espera._`;

  const handleShareWhatsApp = () => {
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank');
  };

  const handleCopyLink = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : `/rsvp/${match.id}`;
    const ok = await copyToClipboard(url);
    if (ok) {
      setFeedback({ success: true, message: 'Enlace del formulario copiado al portapapeles.' });
    } else {
      setFeedback({ success: false, message: 'No se pudo copiar automáticamente.' });
    }
  };

  // Step 1: Validate Google Email & Intelligent Auto-recognition
  const handleStep1Submit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanEmail = gmailAddress.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      setFeedback({ success: false, message: 'Por favor ingresa un correo de Google válido (ej: tu.nombre@gmail.com).' });
      return;
    }

    setIsGmailVerified(true);
    setFeedback(null);

    // Look for existing player with matching email
    const matchedPlayer = players.find(
      (p) => p.email && p.email.trim().toLowerCase() === cleanEmail
    );

    if (matchedPlayer) {
      // Check if already registered in this match
      if (registeredPlayerIds.has(matchedPlayer.id)) {
        const att = attendances.find((a) => a.playerId === matchedPlayer.id && !a.guestName);
        const statusText =
          att?.status === 'CONFIRMED' || att?.status === 'ATTENDED'
            ? 'CONFIRMADO en nómina'
            : 'en LISTA DE ESPERA';
        setFeedback({
          success: false,
          message: `⚠️ ¡Hola, ${matchedPlayer.fullName}! Ya te encuentras registrado en este partido como ${statusText}. No es necesario inscribirte de nuevo.`,
        });
        setRecognizedPlayer(matchedPlayer);
        setSelectedPlayerId(matchedPlayer.id);
        setRegisterMode('existing');
        setNewPlayerName(matchedPlayer.fullName);
        setNewPlayerDocumentId(matchedPlayer.documentId || '');
        setNewPlayerPhone(matchedPlayer.phone || '');
        setShowRosterModal(true);
        return;
      }

      // Autocomplete details
      setRecognizedPlayer(matchedPlayer);
      setSelectedPlayerId(matchedPlayer.id);
      setRegisterMode('existing');
      setNewPlayerName(matchedPlayer.fullName);
      setNewPlayerDocumentId(matchedPlayer.documentId || '');
      setNewPlayerPhone(matchedPlayer.phone || '');
      setFeedback({
        success: true,
        message: `⚡ ¡Hola, ${matchedPlayer.fullName}! Reconocimos tu cuenta de Google (${matchedPlayer.email}). Tus datos fueron vinculados automáticamente.`,
      });
      // Skip directly to Step 4 (Logistics / Vehicle & Guest)
      setStep(4);
      return;
    }

    // Auto-derive suggested name if empty and player not registered
    if (!newPlayerName.trim()) {
      const namePart = cleanEmail.split('@')[0].replace(/[._-]/g, ' ');
      const capitalized = namePart
        .split(' ')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
      setNewPlayerName(capitalized);
    }

    setRecognizedPlayer(null);
    setStep(2);
  };

  // Step 2: Validate Name
  const handleStep2Submit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newPlayerName.trim()) {
      setFeedback({ success: false, message: 'Por favor ingresa tu Nombre y Apellido completo.' });
      return;
    }
    setFeedback(null);
    setStep(3);
  };

  // Handle Document Input Change with Live Auto-recognition
  const handleDocumentChange = (docVal: string) => {
    setNewPlayerDocumentId(docVal);
    const cleanDoc = docVal.trim();
    if (cleanDoc.length >= 5) {
      const matched = players.find(
        (p) => p.documentId && p.documentId.trim() === cleanDoc
      );
      if (matched && (!recognizedPlayer || recognizedPlayer.id !== matched.id)) {
        setRecognizedPlayer(matched);
        setSelectedPlayerId(matched.id);
        setRegisterMode('existing');
        if (matched.fullName) setNewPlayerName(matched.fullName);
        if (matched.phone) setNewPlayerPhone(matched.phone);
        if (matched.email && !gmailAddress) setGmailAddress(matched.email);
        setFeedback({
          success: true,
          message: `⚡ Cédula identificada: ¡Hola, ${matched.fullName}! Tus datos fueron vinculados automáticamente.`,
        });
      }
    }
  };

  // Step 3: Validate Document & Phone
  const handleStep3Submit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanDoc = newPlayerDocumentId.trim();
    if (!cleanDoc) {
      setFeedback({ success: false, message: 'Por favor ingresa tu Cédula / Documento de Identidad.' });
      return;
    }
    if (!newPlayerPhone.trim()) {
      setFeedback({ success: false, message: 'Por favor ingresa tu número de WhatsApp.' });
      return;
    }

    // Check if doc matches a player
    const matched = players.find((p) => p.documentId && p.documentId.trim() === cleanDoc);
    if (matched) {
      if (registeredPlayerIds.has(matched.id)) {
        const att = attendances.find((a) => a.playerId === matched.id && !a.guestName);
        const statusText =
          att?.status === 'CONFIRMED' || att?.status === 'ATTENDED'
            ? 'CONFIRMADO en nómina'
            : 'en LISTA DE ESPERA';
        setFeedback({
          success: false,
          message: `⚠️ ¡Hola, ${matched.fullName}! Esta cédula ya se encuentra registrada en este partido como ${statusText}.`,
        });
        setShowRosterModal(true);
        return;
      }
      setRecognizedPlayer(matched);
      setSelectedPlayerId(matched.id);
      setRegisterMode('existing');
      if (matched.fullName) setNewPlayerName(matched.fullName);
      if (matched.phone) setNewPlayerPhone(matched.phone);
    }

    setFeedback(null);
    setStep(4);
  };

  // Step 4: Validate Vehicle & Guest
  const handleStep4Submit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (hasVehicle && !vehiclePlate.trim()) {
      setFeedback({ success: false, message: 'Por favor ingresa la placa de tu vehículo.' });
      return;
    }
    if (hasGuest && !guestName.trim()) {
      setFeedback({ success: false, message: 'Por favor ingresa el nombre de tu invitado (+1).' });
      return;
    }
    setFeedback(null);
    setStep(5);
  };

  // Final Submit Handler
  const handleFinalSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let playerIdToUse = selectedPlayerId || recognizedPlayer?.id || '';
    let displayName = '';

    // Safety deduplication check against in-memory players list
    const cleanEmail = gmailAddress.trim().toLowerCase();
    const cleanDoc = newPlayerDocumentId.trim();
    const matchedExisting = players.find(
      (p) =>
        (cleanEmail && p.email && p.email.trim().toLowerCase() === cleanEmail) ||
        (cleanDoc && p.documentId && p.documentId.trim() === cleanDoc)
    );

    if (matchedExisting) {
      playerIdToUse = matchedExisting.id;
      displayName = matchedExisting.fullName;
    } else if (registerMode === 'new') {
      displayName = newPlayerName.trim();
    } else {
      if (!playerIdToUse) {
        setFeedback({ success: false, message: 'Por favor selecciona tu nombre de la lista.' });
        return;
      }
      const p = getPlayer(playerIdToUse);
      displayName = p ? p.fullName : playerIdToUse;
    }

    startTransition(async () => {
      try {
        if (!matchedExisting && registerMode === 'new') {
          const playerRes = await createPlayerAction({
            fullName: newPlayerName.trim(),
            documentId: newPlayerDocumentId.trim(),
            phone: newPlayerPhone.trim(),
            email: gmailAddress.trim() || undefined,
          });

          if (!playerRes.success || !playerRes.data) {
            setFeedback({ success: false, message: playerRes.message || 'Error al guardar jugador.' });
            return;
          }

          playerIdToUse = playerRes.data.id;
          setPlayers((prev) => {
            const exists = prev.some((p) => p.id === playerRes.data!.id);
            return exists ? prev : [...prev, playerRes.data!];
          });
        }

        const plateToRegister = hasVehicle ? vehiclePlate.trim().toUpperCase() : undefined;

        // 1. Register the host player himself
        const resPlayer = await registerAttendanceAction(
          match.id,
          playerIdToUse,
          undefined,
          hasVehicle,
          plateToRegister,
          undefined
        );

        if (!resPlayer.success) {
          if (resPlayer.errorCode === 'ALREADY_REGISTERED') {
            setFeedback({
              success: false,
              message: '⚠️ Este jugador ya se encuentra formalmente inscrito y confirmado en la nómina oficial. Puedes revisar su posición abajo.',
            });
            setShowRosterModal(true);
          } else {
            setFeedback(resPlayer);
          }
          return;
        }

        const newAttendancesToAdd: Attendance[] = [];
        if (resPlayer.data) {
          const playerAtt = (resPlayer.data as any).attendance;
          newAttendancesToAdd.push(playerAtt);
        }

        // 2. If user also specified a guest, register the guest record
        if (hasGuest && guestName.trim()) {
          const resGuest = await registerAttendanceAction(
            match.id,
            playerIdToUse,
            guestName.trim(),
            false,
            undefined,
            guestType
          );
          if (resGuest.success && resGuest.data) {
            const guestAtt = (resGuest.data as any).attendance;
            newAttendancesToAdd.push(guestAtt);
          }
        }

        setFeedback(resPlayer);
        setAttendances((prev) => {
          let updated = [...prev];
          for (const newAtt of newAttendancesToAdd) {
            if (!updated.some((a) => a.id === newAtt.id)) {
              updated.push(newAtt);
            }
          }
          return updated;
        });

        // Compute exact dynamic fee with newly enrolled attendees
        const existingPlayingCount = attendances.filter(
          (a) => (a.status === 'CONFIRMED' || a.status === 'ATTENDED') && a.guestType !== 'COMPANION'
        ).length;
        const newlyAddedPlayingCount = newAttendancesToAdd.filter((a) => a.guestType !== 'COMPANION').length;
        const totalPlayingCountAfterEnrollment = Math.max(1, existingPlayingCount + newlyAddedPlayingCount);
        const dynamicCostPerPlayer = Math.ceil(match.pitchRentalCost / totalPlayingCountAfterEnrollment);
        const dynamicGuestCost = hasGuest && guestType === 'PLAYER' ? dynamicCostPerPlayer : 0;
        const exactUserTotal = dynamicCostPerPlayer + dynamicGuestCost + (hasVehicle ? parkingFee : 0);

        setCompletedPlayerId(playerIdToUse);
        setPaymentAmount(exactUserTotal);
        setPaymentNote(`Cuota partido - ${match.location}`);
        setStep('completed');
      } catch (err) {
        setFeedback({ success: false, message: 'Error al conectar con el servidor.' });
      }
    });
  };

  // QR Code Modal State
  const [showQrModal, setShowQrModal] = useState<boolean>(false);

  const RSVP_BANK_CHANNELS = [
    {
      id: 'nequi',
      name: 'Nequi',
      number: '312 357 8415',
      rawNumber: '3123578415',
      owner: 'Cesar Tellez',
      badge: '🟣 Nequi',
      color: 'border-fuchsia-500/40 bg-fuchsia-950/20 text-fuchsia-300',
    },
    {
      id: 'daviplata',
      name: 'Daviplata',
      number: '312 357 8415',
      rawNumber: '3123578415',
      owner: 'Cesar Tellez',
      badge: '🔴 Daviplata',
      color: 'border-red-500/40 bg-red-950/20 text-red-300',
    },
    {
      id: 'breb_qr',
      name: 'Llave Bre-B / QR',
      number: '@3123578415',
      rawNumber: '@3123578415',
      owner: 'Cesar Tellez (Bre-B / QR)',
      badge: '⚡ Llave @ Bre-B / QR',
      color: 'border-cyan-500/40 bg-cyan-950/20 text-cyan-300',
      isQr: true,
    },
  ];

  const handleCopyBank = async (text: string, id: string) => {
    await copyToClipboard(text);
    setCopiedBankId(id);
    setTimeout(() => setCopiedBankId(null), 2500);
  };

  const handleSelfServiceReceiptLoaded = (data: {
    receiptUrl: string;
    ocrResult?: ReceiptOcrResult;
    suggestedAmount?: number;
    suggestedNote?: string;
  }) => {
    setPaymentReceiptUrl(data.receiptUrl);
    if (data.suggestedAmount && data.suggestedAmount > 0) {
      setPaymentAmount(data.suggestedAmount);
    }
    if (data.suggestedNote) {
      setPaymentNote(data.suggestedNote);
    }
  };

  const handleSelfServicePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pid = completedPlayerId || selectedPlayerId;
    if (!pid) {
      setPaymentFeedback({ success: false, message: 'No se encontró el identificador del jugador.' });
      return;
    }
    if (paymentAmount <= 0) {
      setPaymentFeedback({ success: false, message: 'El monto a transferir debe ser mayor a $0.' });
      return;
    }

    startPaymentTransition(async () => {
      try {
        const res = await recordPlayerCreditAction(
          pid,
          paymentAmount,
          paymentNote.trim() || `Abono partido - ${match.location}`,
          paymentReceiptUrl || undefined
        );
        if (res.success) {
          setPaymentSuccess(true);
          setPaymentFeedback(res);
        } else {
          setPaymentFeedback(res);
        }
      } catch (err) {
        setPaymentFeedback({ success: false, message: 'Error al registrar el comprobante en tesorería.' });
      }
    });
  };

  // -------------------------------------------------------------
  // RENDER: COMPLETED / SUCCESS SCREEN
  // -------------------------------------------------------------
  if (step === 'completed') {
    return (
      <div className="max-w-2xl mx-auto space-y-6 pb-16 pt-4 animate-in fade-in duration-300">
        {/* Success Hero Banner */}
        <div className="bg-gradient-to-b from-emerald-950/80 to-zinc-900 border border-emerald-500/40 rounded-3xl p-6 sm:p-8 text-center space-y-4 shadow-2xl">
          <div className="w-16 h-16 bg-emerald-500/20 border border-emerald-400/40 rounded-full flex items-center justify-center mx-auto text-3xl shadow-inner">
            ⚽
          </div>
          <div>
            <Badge variant="success" className="text-xs px-3 py-1 font-mono uppercase mb-2">
              {isFull ? 'En Lista de Espera' : 'Cupo Confirmado ✓'}
            </Badge>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              ¡Inscripción Exitosa!
            </h1>
            <p className="text-sm text-emerald-300/90 max-w-md mx-auto mt-1">
              Tu registro ha sido procesado de forma oficial en la nómina de Mizpa FC.
            </p>
          </div>

          <div className="bg-zinc-950/60 border border-zinc-800 rounded-2xl p-4 text-left text-xs space-y-2 max-w-lg mx-auto">
            <div className="flex justify-between items-center text-zinc-300 border-b border-zinc-800 pb-2">
              <span className="text-zinc-400">Jugador:</span>
              <strong className="text-white text-sm font-semibold">
                {registerMode === 'new' ? newPlayerName : getPlayer(selectedPlayerId)?.fullName}
              </strong>
            </div>
            <div className="flex justify-between items-center text-zinc-300 border-b border-zinc-800 pb-2">
              <span className="text-zinc-400">Cancha:</span>
              <span className="text-zinc-200">{match.location}</span>
            </div>
            <div className="flex justify-between items-center text-zinc-300 border-b border-zinc-800 pb-2">
              <span className="text-zinc-400">Fecha & Hora:</span>
              <span className="text-zinc-200 capitalize">{formattedDate}</span>
            </div>
            {hasVehicle && (
              <div className="flex justify-between items-center text-zinc-300 border-b border-zinc-800 pb-2">
                <span className="text-zinc-400">Vehículo Registrado:</span>
                <span className="text-emerald-400 font-mono font-bold">
                  {formatPlateBadge(vehiclePlate)}
                </span>
              </div>
            )}
            {hasGuest && (
              <div className="flex justify-between items-center text-zinc-300 border-b border-zinc-800 pb-2">
                <span className="text-zinc-400">Invitado (+1):</span>
                <span className="text-emerald-400 font-semibold">{guestName}</span>
              </div>
            )}
            <div className="flex justify-between items-center text-zinc-300 pt-1">
              <div>
                <span className="text-zinc-400 block">Cuota Total Estimada:</span>
                <span className="text-[10px] text-zinc-500">
                  {confirmedPlayersCount > 0
                    ? `Cuota: $${dynamicPitchFee.toLocaleString('es-CO')} COP (${confirmedPlayersCount} inscritos confirmados)`
                    : `Cuota: $${dynamicPitchFee.toLocaleString('es-CO')} COP`}
                </span>
              </div>
              <span className="text-emerald-400 font-mono font-bold text-sm">
                ${totalEstimatedForUser.toLocaleString('es-CO')} COP
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Button
              onClick={handleShareWhatsApp}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-2 text-xs py-3 px-5 rounded-xl shadow-lg"
            >
              <Share2 className="w-4 h-4" /> Reenviar Convocatoria a WhatsApp
            </Button>
            <a
              href={mapsUrlToUse}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 text-xs text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 px-4 py-2.5 rounded-xl border border-zinc-700 font-medium transition-all"
            >
              <MapPin className="w-4 h-4 text-emerald-400" /> Ver Mapa en Google Maps ↗
            </a>
          </div>
        </div>

        {/* SELF-SERVICE PLAYER PAYMENT & RECEIPT UPLOAD CARD */}
        <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 border border-emerald-500/30 rounded-3xl p-5 sm:p-6 space-y-5 shadow-xl">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 text-base">💳</span>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  Pagar mi Cuota por Transferencia
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full uppercase font-mono">
                    Autogestión
                  </span>
                </h2>
                <p className="text-xs text-zinc-400">
                  Transfiere y sube tu comprobante para acreditar tu pago de inmediato.
                </p>
              </div>
            </div>
          </div>

          {paymentSuccess ? (
            <div className="bg-emerald-950/50 border border-emerald-500/50 rounded-2xl p-5 text-center space-y-3 animate-in zoom-in-95">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 text-2xl flex items-center justify-center mx-auto">
                ✓
              </div>
              <div>
                <h3 className="text-base font-bold text-white">¡Comprobante Registrado en Tesorería!</h3>
                <p className="text-xs text-emerald-300 mt-1">
                  Tu abono de <strong className="font-mono text-white">${paymentAmount.toLocaleString('es-CO')} COP</strong> fue registrado exitosamente.
                </p>
              </div>
              <p className="text-[11px] text-zinc-400">
                El administrador ya tiene tu comprobante guardado en el balance del partido.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Bank quick copy buttons */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                    1. Cuentas oficiales (Toca para copiar):
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowQrModal(true)}
                    className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 font-semibold bg-cyan-950/60 hover:bg-cyan-900/60 px-2.5 py-1 rounded-lg border border-cyan-500/40 transition-all"
                  >
                    <QrCode className="w-3.5 h-3.5" /> Ver Código QR 📷
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {RSVP_BANK_CHANNELS.map((ch) => {
                    const isCopied = copiedBankId === ch.id;
                    return (
                      <div
                        key={ch.id}
                        onClick={() => handleCopyBank(ch.rawNumber, ch.id)}
                        className={`border rounded-xl p-2.5 cursor-pointer transition-all hover:scale-[1.02] flex flex-col justify-between ${ch.color}`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold">{ch.badge}</span>
                          {isCopied ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5 opacity-60" />
                          )}
                        </div>
                        <div className="font-mono font-bold text-xs text-white">
                          {ch.number}
                        </div>
                        <span className="text-[9px] text-zinc-400 truncate mt-0.5">
                          {isCopied ? '¡Copiado!' : ch.owner}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* QR Code Modal */}
              {showQrModal && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
                  <div className="bg-zinc-900 border border-cyan-500/40 rounded-3xl p-6 max-w-sm w-full space-y-4 text-center shadow-2xl relative">
                    <button
                      type="button"
                      onClick={() => setShowQrModal(false)}
                      className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 rounded-full bg-zinc-800"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <div className="space-y-1">
                      <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest block">
                        ⚡ Bre-B • Nequi
                      </span>
                      <h3 className="text-lg font-black text-white">Cesar Tellez</h3>
                      <p className="text-xs font-mono text-zinc-300">Llave: <strong className="text-cyan-400">@3123578415</strong></p>
                    </div>

                    <div className="bg-white p-3 rounded-2xl inline-block shadow-inner mx-auto">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="/images/qr-payment.jpg"
                        alt="Código QR Bre-B Nequi Cesar Tellez @3123578415"
                        className="w-56 h-auto rounded-xl object-contain mx-auto"
                      />
                    </div>

                    <div className="pt-1 flex justify-center gap-2">
                      <Button
                        type="button"
                        onClick={() => {
                          handleCopyBank('@3123578415', 'modal_llave');
                        }}
                        className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs py-2 px-4 rounded-xl gap-1.5 shadow"
                      >
                        <Copy className="w-3.5 h-3.5" /> Copiar Llave @3123578415
                      </Button>
                      <Button
                        type="button"
                        onClick={() => setShowQrModal(false)}
                        variant="outline"
                        className="border-zinc-700 text-zinc-300 hover:text-white text-xs py-2 px-4 rounded-xl"
                      >
                        Cerrar
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Receipt uploader with OCR */}
              <div className="space-y-2 pt-2 border-t border-zinc-800/80">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                  2. Sube o pega la captura de tu transferencia (Lectura Automática OCR):
                </span>
                <ReceiptUploader
                  onReceiptLoaded={handleSelfServiceReceiptLoaded}
                  currentReceiptUrl={paymentReceiptUrl}
                  onClearReceipt={() => setPaymentReceiptUrl('')}
                />
              </div>

              {/* Amount and confirm */}
              <form onSubmit={handleSelfServicePaymentSubmit} className="space-y-3 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-zinc-400 block mb-1">Monto transferido ($ COP):</label>
                    <input
                      type="number"
                      required
                      min={1000}
                      step={1000}
                      value={paymentAmount || totalEstimatedForUser}
                      onChange={(e) => setPaymentAmount(Number(e.target.value))}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-sm font-mono font-bold text-emerald-400 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-zinc-400 block mb-1">Detalle / Nota:</label>
                    <input
                      type="text"
                      value={paymentNote}
                      onChange={(e) => setPaymentNote(e.target.value)}
                      placeholder="Ej: Cuota partido viernes"
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {paymentFeedback && (
                  <div
                    className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
                      paymentFeedback.success
                        ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
                        : 'bg-red-950/60 border-red-500/40 text-red-200'
                    }`}
                  >
                    {paymentFeedback.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                    )}
                    <span>{paymentFeedback.message}</span>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={isPaymentPending}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl shadow-md text-xs gap-2"
                >
                  {isPaymentPending ? (
                    'Registrando comprobante...'
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Acreditar Mi Pago de ${(paymentAmount || totalEstimatedForUser).toLocaleString('es-CO')} COP
                    </>
                  )}
                </Button>
              </form>
            </div>
          )}
        </div>

        {/* Live Confirmed Squad Roster */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <h2 className="text-sm font-bold text-zinc-200">
                Nómina Oficial Confirmada ({confirmedList.length}/{maxPlayers})
              </h2>
            </div>
            <span className="text-xs text-zinc-400 font-mono">
              {openSpots > 0 ? `${openSpots} cupos libres` : 'Cupo Lleno'}
            </span>
          </div>

          <div className="divide-y divide-zinc-800/60 text-xs">
            {confirmedList.map((att, idx) => {
              const host = getPlayer(att.playerId);
              return (
                <div key={att.id} className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-emerald-400 font-mono font-bold w-5">#{idx + 1}</span>
                    <div>
                      {att.guestName ? (
                        <span className="font-semibold text-emerald-300">⚽ {att.guestName} (Invitado de {host?.fullName || 'Jugador'})</span>
                      ) : (
                        <span className="font-medium text-zinc-100">⚽ {host?.fullName || att.playerId}</span>
                      )}
                      {att.vehiclePlate && (
                        <span className="ml-2 font-mono text-[11px] text-zinc-300 bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700/60">
                          {formatPlateBadge(att.vehiclePlate)}
                        </span>
                      )}
                    </div>
                  </div>
                  <Badge variant="success" className="text-[10px]">Confirmado</Badge>
                </div>
              );
            })}
          </div>

          {/* Companions / Spectators list */}
          {companionList.length > 0 && (
            <div className="pt-3 border-t border-zinc-800 space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-400" />
                <h3 className="text-xs font-bold text-blue-300">
                  👥 Acompañantes / Barra ({companionList.length}) — No ocupan cupo
                </h3>
              </div>
              <div className="divide-y divide-zinc-800/40 text-xs">
                {companionList.map((att) => {
                  const host = getPlayer(att.playerId);
                  return (
                    <div key={att.id} className="py-2 flex items-center justify-between text-zinc-300">
                      <div className="flex items-center gap-2">
                        <span className="text-blue-400 font-semibold">👥 {att.guestName || 'Acompañante'}</span>
                        <span className="text-[11px] text-zinc-500">(con {host?.fullName || 'Jugador'})</span>
                        {att.vehiclePlate && (
                          <span className="font-mono text-[10px] text-zinc-300 bg-zinc-800 px-1.5 py-0.5 rounded">
                            {formatPlateBadge(att.vehiclePlate)}
                          </span>
                        )}
                      </div>
                      <Badge variant="info" className="text-[10px]">Acompañante</Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="text-center text-xs text-zinc-500 pt-2">
          © {new Date().getFullYear()} Mizpa FC • Formulario Oficial
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER: MINIMALIST TYPEFORM EXPERIENCE (STEPS 1 to 5 & EXISTING)
  // -------------------------------------------------------------
  const progressPercent =
    registerMode === 'existing'
      ? 100
      : step === 1
      ? 20
      : step === 2
      ? 40
      : step === 3
      ? 60
      : step === 4
      ? 80
      : 100;

  return (
    <div className="min-h-[85vh] flex flex-col justify-between max-w-xl mx-auto px-4 py-6">
      {/* Top Minimal Header & Progress Bar */}
      <div className="space-y-4">
        {/* Progress bar */}
        <div className="w-full bg-zinc-800/80 h-1 rounded-full overflow-hidden">
          <div
            className="bg-emerald-500 h-full transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-xs text-zinc-400 pt-1">
          <div className="flex items-center gap-2">
            <span className="text-base">⚽</span>
            <span className="font-bold tracking-wider text-zinc-200 uppercase">MIZPA FC</span>
            <span className="text-zinc-600">•</span>
            <span className="text-emerald-400 font-medium">Inscripción Oficial</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowRosterModal(true)}
              className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-semibold bg-emerald-950/60 hover:bg-emerald-900/60 px-2.5 py-1 rounded-lg border border-emerald-500/40 transition-all cursor-pointer shadow-sm"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Ver Nómina ({confirmedList.length}/{maxPlayers})</span>
            </button>
            {registerMode === 'new' && (
              <span className="font-mono text-zinc-400 text-xs">Paso {step} de 5</span>
            )}
          </div>
        </div>
      </div>

      {/* Alert / Feedback */}
      {feedback && (
        <div
          className={`my-4 p-3.5 rounded-xl text-xs flex items-center gap-2.5 border ${
            feedback.success
              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
              : 'bg-red-950/60 border-red-500/40 text-red-200'
          }`}
        >
          {feedback.success ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Centered Typeform Hero Body */}
      <div className="my-auto py-8">
        {/* MODE: EXISTING REGISTERED PLAYER */}
        {registerMode === 'existing' ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-300">
            <div className="space-y-2">
              <span className="text-xs font-mono font-semibold text-emerald-400 uppercase tracking-wider block">
                JUGADOR REGISTRADO
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Selecciona tu Nombre:
              </h2>
              <p className="text-xs text-zinc-400">
                Elige tu perfil de la lista oficial de jugadores de Mizpa FC.
              </p>
            </div>

            <div className="space-y-4">
              <select
                value={selectedPlayerId}
                onChange={(e) => setSelectedPlayerId(e.target.value)}
                className="w-full bg-zinc-900 border-2 border-zinc-700 focus:border-emerald-500 rounded-2xl px-4 py-3 text-base text-zinc-100 focus:outline-none transition-all"
              >
                {players.map((p) => {
                  const isRegistered = isPlayerRegistered(p);
                  return (
                    <option
                      key={p.id}
                      value={p.id}
                      disabled={isRegistered}
                      className={isRegistered ? 'text-zinc-500 bg-zinc-900' : 'text-zinc-100'}
                    >
                      {p.fullName} {p.documentId ? `(CC: ${p.documentId})` : ''} {isRegistered ? '— (Ya Inscrito en Nómina ✓)' : '— [Disponible]'}
                    </option>
                  );
                })}
              </select>

              {/* Vehicle option */}
              <label className="flex items-center gap-2.5 cursor-pointer text-xs text-zinc-300 bg-zinc-900/60 p-3 rounded-xl border border-zinc-800 hover:border-zinc-700 select-none">
                <input
                  type="checkbox"
                  checked={hasVehicle}
                  onChange={(e) => setHasVehicle(e.target.checked)}
                  className="rounded border-zinc-700 bg-zinc-800 text-emerald-500 focus:ring-emerald-500 w-4 h-4"
                />
                <Car className="w-4 h-4 text-emerald-400" />
                <span>¿Llevas vehículo (carro / moto)?</span>
              </label>

              {hasVehicle && (
                <div className="space-y-1">
                  <input
                    type="text"
                    placeholder="Placa del vehículo (Ej: ABC-123 o ABC-12D)"
                    value={vehiclePlate}
                    onChange={(e) => setVehiclePlate(formatColombianPlate(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-700 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-sm text-zinc-100 uppercase tracking-widest font-mono font-bold"
                  />
                  {vehiclePlate && (
                    <span className="text-[11px] font-mono text-emerald-400 font-semibold block px-1">
                      {formatPlateBadge(vehiclePlate)}
                    </span>
                  )}
                </div>
              )}

              {/* Guest option */}
              <label className="flex items-center gap-2.5 cursor-pointer text-xs text-zinc-300 bg-zinc-900/60 p-3 rounded-xl border border-zinc-800 hover:border-zinc-700 select-none">
                <input
                  type="checkbox"
                  checked={hasGuest}
                  onChange={(e) => setHasGuest(e.target.checked)}
                  className="rounded border-zinc-700 bg-zinc-800 text-emerald-500 focus:ring-emerald-500 w-4 h-4"
                />
                <User className="w-4 h-4 text-emerald-400" />
                <span>Voy con un acompañante / invitado (+1)</span>
              </label>

              {hasGuest && (
                <div className="space-y-3 bg-zinc-950/60 p-3.5 rounded-xl border border-zinc-800">
                  <input
                    type="text"
                    placeholder="Nombre completo de tu invitado"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500"
                  />
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-400 block mb-1.5">
                      ¿Qué rol tendrá tu invitado?
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setGuestType('PLAYER')}
                        className={`p-2.5 rounded-xl text-xs font-medium border text-left flex flex-col gap-0.5 transition-all ${
                          guestType === 'PLAYER'
                            ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                        }`}
                      >
                        <span className="font-bold flex items-center gap-1 text-emerald-300">⚽ Invitado Jugador</span>
                        <span className="text-[10px] text-zinc-400">Juega fútbol, ocupa cupo en nómina (${estPitchFee.toLocaleString('es-CO')})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setGuestType('COMPANION')}
                        className={`p-2.5 rounded-xl text-xs font-medium border text-left flex flex-col gap-0.5 transition-all ${
                          guestType === 'COMPANION'
                            ? 'bg-blue-950/80 border-blue-500 text-blue-200'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                        }`}
                      >
                        <span className="font-bold flex items-center gap-1 text-blue-300">👥 Acompañante / Barra</span>
                        <span className="text-[10px] text-zinc-400">No juega en cancha, cuota cancha $0</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <Button
                onClick={handleFinalSubmit}
                disabled={isPending}
                size="lg"
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 rounded-xl gap-2 text-sm shadow-lg transition-all"
              >
                {isPending ? 'Inscribiendo...' : 'Confirmar mi Inscripción ⚽'}
              </Button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setRegisterMode('new');
                    setStep(1);
                  }}
                  className="text-xs text-zinc-400 hover:text-emerald-400 transition-colors"
                >
                  ← Registrarme como jugador nuevo con Google
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* MODE: NEW PLAYER TYPEFORM STEPS */
          <div>
            {/* STEP 1: GOOGLE (GMAIL) IDENTIFICATION */}
            {step === 1 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center shadow-sm">
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                      </svg>
                    </div>
                    <span className="text-xs font-mono font-semibold text-emerald-400 uppercase tracking-wider">
                      01 → Identificación con Google
                    </span>
                  </div>

                  <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-tight">
                    ¿Cuál es tu correo de Google (Gmail)?
                  </h1>
                  <p className="text-xs sm:text-sm text-zinc-400">
                    Validamos tu identidad con Google para precargar tus datos y asegurar tu cupo oficial.
                  </p>
                </div>

                <form onSubmit={handleStep1Submit} className="space-y-4">
                  <div className="relative">
                    <input
                      type="email"
                      required
                      autoFocus
                      placeholder="tu.nombre@gmail.com"
                      value={gmailAddress}
                      onChange={(e) => setGmailAddress(e.target.value)}
                      className="w-full bg-zinc-900 border-2 border-zinc-700 focus:border-emerald-500 rounded-2xl px-4 py-3.5 text-base sm:text-lg text-zinc-100 placeholder-zinc-500 focus:outline-none transition-all shadow-inner"
                    />

                    {/* Live smart match suggestion hint when typing */}
                    {gmailAddress.trim().length >= 3 && !isGmailVerified && (() => {
                      const cleanSearch = gmailAddress.trim().toLowerCase();
                      const suggestions = players
                        .filter(
                          (p) =>
                            (p.email && p.email.toLowerCase().includes(cleanSearch)) ||
                            p.fullName.toLowerCase().includes(cleanSearch)
                        )
                        .slice(0, 3);
                      if (suggestions.length === 0) return null;
                      return (
                        <div className="mt-2 bg-zinc-900/90 border border-emerald-500/30 rounded-xl p-2.5 space-y-1.5 shadow-xl animate-in fade-in">
                          <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-semibold px-1">
                            ⚡ ¿Eres alguno de estos jugadores registrados?
                          </span>
                          <div className="space-y-1">
                            {suggestions.map((sp) => (
                              <button
                                key={sp.id}
                                type="button"
                                onClick={() => {
                                  if (sp.email) setGmailAddress(sp.email);
                                  setRecognizedPlayer(sp);
                                  setSelectedPlayerId(sp.id);
                                  setNewPlayerName(sp.fullName);
                                  setNewPlayerDocumentId(sp.documentId || '');
                                  setNewPlayerPhone(sp.phone || '');
                                  setIsGmailVerified(true);
                                  setFeedback({
                                    success: true,
                                    message: `⚡ ¡Hola, ${sp.fullName}! Datos precargados automáticamente.`,
                                  });
                                  setStep(4);
                                }}
                                className="w-full text-left px-2.5 py-1.5 rounded-lg bg-zinc-800/80 hover:bg-emerald-950/60 hover:border-emerald-500/40 border border-transparent transition-all flex items-center justify-between text-xs text-zinc-200"
                              >
                                <span className="font-semibold text-emerald-300">⚽ {sp.fullName}</span>
                                <span className="text-[10px] text-zinc-400 font-mono">{sp.email || (sp.documentId ? `CC: ${sp.documentId}` : '')}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  <div className="flex items-center gap-3">
                    <Button
                      type="submit"
                      size="lg"
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-3.5 rounded-xl gap-2 text-sm shadow-md transition-all"
                    >
                      <span>Continuar con Google</span>
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                    <span className="text-[11px] text-zinc-500 hidden sm:inline-block">
                      Presiona <strong>Enter ↵</strong>
                    </span>
                  </div>
                </form>

                <div className="pt-6 border-t border-zinc-800/80">
                  <button
                    type="button"
                    onClick={() => setRegisterMode('existing')}
                    className="text-xs text-zinc-400 hover:text-emerald-400 transition-colors flex items-center gap-1.5"
                  >
                    <span>¿Ya juegas habitualmente en Mizpa FC?</span>
                    <strong className="underline font-medium text-zinc-200 hover:text-emerald-300">
                      Seleccionar mi nombre ➔
                    </strong>
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: FULL NAME */}
            {step === 2 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="space-y-2">
                  <span className="text-xs font-mono font-semibold text-emerald-400 uppercase tracking-wider block">
                    02 → Tu Nombre Oficial
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                    ¿Cómo te llamas?
                  </h2>
                  <p className="text-xs text-zinc-400">
                    Tu nombre y apellido para el listado de nómina del partido.
                  </p>
                </div>

                <form onSubmit={handleStep2Submit} className="space-y-4">
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="Ej: Daniel Moreno Silva"
                    value={newPlayerName}
                    onChange={(e) => setNewPlayerName(e.target.value)}
                    className="w-full bg-zinc-900 border-2 border-zinc-700 focus:border-emerald-500 rounded-2xl px-4 py-3.5 text-base sm:text-lg text-zinc-100 placeholder-zinc-500 focus:outline-none transition-all shadow-inner"
                  />

                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStep(1)}
                      className="border-zinc-700 text-zinc-400 hover:text-zinc-200 rounded-xl"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      type="submit"
                      size="lg"
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-3 rounded-xl gap-2 text-sm shadow-md"
                    >
                      <span>Siguiente</span>
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                    <span className="text-[11px] text-zinc-500 hidden sm:inline-block">
                      Presiona <strong>Enter ↵</strong>
                    </span>
                  </div>
                </form>
              </div>
            )}

            {/* STEP 3: DOCUMENT ID & PHONE */}
            {step === 3 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="space-y-2">
                  <span className="text-xs font-mono font-semibold text-emerald-400 uppercase tracking-wider block">
                    03 → Identificación y Contacto
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                    Documento & WhatsApp
                  </h2>
                  <p className="text-xs text-zinc-400">
                    Requerido para el control de acceso en cancha y el grupo de convocatoria.
                  </p>
                </div>

                <form onSubmit={handleStep3Submit} className="space-y-4">
                  <div>
                    <label className="text-xs text-zinc-400 block mb-1 font-medium flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-emerald-400" /> Cédula / Documento de Identidad:
                    </label>
                    <input
                      type="text"
                      required
                      autoFocus
                      placeholder="Ej: 1020304050"
                      value={newPlayerDocumentId}
                      onChange={(e) => handleDocumentChange(e.target.value)}
                      className="w-full bg-zinc-900 border-2 border-zinc-700 focus:border-emerald-500 rounded-2xl px-4 py-3 text-base text-zinc-100 font-mono placeholder-zinc-500 focus:outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-zinc-400 block mb-1 font-medium flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-emerald-400" /> Teléfono Celular / WhatsApp:
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="Ej: 3101234567"
                      value={newPlayerPhone}
                      onChange={(e) => setNewPlayerPhone(e.target.value)}
                      className="w-full bg-zinc-900 border-2 border-zinc-700 focus:border-emerald-500 rounded-2xl px-4 py-3 text-base text-zinc-100 font-mono placeholder-zinc-500 focus:outline-none transition-all"
                    />
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStep(2)}
                      className="border-zinc-700 text-zinc-400 hover:text-zinc-200 rounded-xl"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      type="submit"
                      size="lg"
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-3 rounded-xl gap-2 text-sm shadow-md"
                    >
                      <span>Siguiente</span>
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {/* STEP 4: VEHICLE & GUEST */}
            {step === 4 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="space-y-2">
                  <span className="text-xs font-mono font-semibold text-emerald-400 uppercase tracking-wider block">
                    04 → Logística & Acompañante
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                    ¿Llevas vehículo o vienes acompañado?
                  </h2>
                  <p className="text-xs text-zinc-400">
                    Configura tu acceso vehicular y cupos adicionales si aplica.
                  </p>
                </div>

                {/* Auto-recognized Player Banner */}
                {recognizedPlayer && (
                  <div className="bg-emerald-950/60 border border-emerald-500/40 rounded-2xl p-3.5 sm:p-4 flex items-center justify-between gap-3 shadow-inner">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center text-emerald-400 font-bold shrink-0">
                        ⚡
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-white truncate">{recognizedPlayer.fullName}</span>
                          <Badge variant="success" className="text-[9px] uppercase font-mono px-1.5 py-0">
                            Jugador Habitual
                          </Badge>
                        </div>
                        <p className="text-xs text-zinc-400 truncate">
                          CC: <span className="font-mono text-zinc-300">{newPlayerDocumentId || recognizedPlayer.documentId}</span> • Tel: <span className="font-mono text-zinc-300">{newPlayerPhone || recognizedPlayer.phone}</span>
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setRecognizedPlayer(null);
                        setStep(2);
                      }}
                      className="text-xs text-emerald-400 hover:text-emerald-300 underline font-medium shrink-0"
                    >
                      Editar datos
                    </button>
                  </div>
                )}

                <form onSubmit={handleStep4Submit} className="space-y-4">
                  {/* Vehicle Card */}
                  <div className="p-4 bg-zinc-900/80 border border-zinc-800 rounded-2xl space-y-3">
                    <label className="flex items-center justify-between cursor-pointer select-none">
                      <div className="flex items-center gap-2.5">
                        <Car className="w-5 h-5 text-emerald-400" />
                        <div>
                          <span className="text-sm font-semibold text-zinc-100 block">
                            ¿Llevas Carro o Moto?
                          </span>
                          <span className="text-[11px] text-zinc-400">
                            Parqueadero: ${parkingFee.toLocaleString('es-CO')} COP ({durationHours}h)
                          </span>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={hasVehicle}
                        onChange={(e) => setHasVehicle(e.target.checked)}
                        className="w-5 h-5 rounded border-zinc-700 bg-zinc-800 text-emerald-500 focus:ring-emerald-500"
                      />
                    </label>

                    {hasVehicle && (
                      <div className="pt-2 border-t border-zinc-800 space-y-1">
                        <label className="text-xs text-emerald-300 block font-medium">
                          Placa del Vehículo (control de portería):
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Ej: ABC-123 o ABC-12D"
                          value={vehiclePlate}
                          onChange={(e) => setVehiclePlate(formatColombianPlate(e.target.value))}
                          className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2 text-sm text-zinc-100 uppercase tracking-widest font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        {vehiclePlate && (
                          <span className="text-[11px] font-mono text-emerald-400 font-semibold block px-1">
                            {formatPlateBadge(vehiclePlate)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Guest Card */}
                  <div className="p-4 bg-zinc-900/80 border border-zinc-800 rounded-2xl space-y-3">
                    <label className="flex items-center justify-between cursor-pointer select-none">
                      <div className="flex items-center gap-2.5">
                        <Users className="w-5 h-5 text-blue-400" />
                        <div>
                          <span className="text-sm font-semibold text-zinc-100 block">
                            ¿Registras a un Invitado (+1)?
                          </span>
                          <span className="text-[11px] text-zinc-400">
                            Se agregará un cupo adicional a tu nombre.
                          </span>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={hasGuest}
                        onChange={(e) => setHasGuest(e.target.checked)}
                        className="w-5 h-5 rounded border-zinc-700 bg-zinc-800 text-emerald-500 focus:ring-emerald-500"
                      />
                    </label>

                    {hasGuest && (
                      <div className="pt-2 border-t border-zinc-800 space-y-3">
                        <div>
                          <label className="text-xs text-blue-300 block mb-1 font-medium">
                            Nombre completo del Invitado (+1):
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Ej: Camilo Andrés Rodríguez"
                            value={guestName}
                            onChange={(e) => setGuestName(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-zinc-400 block mb-1.5">
                            ¿Tu invitado jugará en cancha o es acompañante?
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => setGuestType('PLAYER')}
                              className={`p-2.5 rounded-xl text-xs font-medium border text-left flex flex-col gap-1 transition-all ${
                                guestType === 'PLAYER'
                                  ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200'
                                  : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                              }`}
                            >
                              <span className="font-bold flex items-center gap-1 text-emerald-300">⚽ Invitado Jugador</span>
                              <span className="text-[10px] text-zinc-400">Juega fútbol, ocupa cupo (${estPitchFee.toLocaleString('es-CO')})</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setGuestType('COMPANION')}
                              className={`p-2.5 rounded-xl text-xs font-medium border text-left flex flex-col gap-1 transition-all ${
                                guestType === 'COMPANION'
                                  ? 'bg-blue-950/80 border-blue-500 text-blue-200'
                                  : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                              }`}
                            >
                              <span className="font-bold flex items-center gap-1 text-blue-300">👥 Acompañante / Barra</span>
                              <span className="text-[10px] text-zinc-400">No juega en cancha, cuota cancha $0</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        if (recognizedPlayer) {
                          setStep(1);
                        } else {
                          setStep(3);
                        }
                      }}
                      className="border-zinc-700 text-zinc-400 hover:text-zinc-200 rounded-xl"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      type="submit"
                      size="lg"
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-3 rounded-xl gap-2 text-sm shadow-md"
                    >
                      <span>Revisar y Confirmar</span>
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {/* STEP 5: SUMMARY & FINAL CONFIRMATION */}
            {step === 5 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="space-y-2">
                  <span className="text-xs font-mono font-semibold text-emerald-400 uppercase tracking-wider block">
                    05 → Confirmación Final
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                    ¡Listo para jugar! Revisa los detalles:
                  </h2>
                </div>

                {/* Match Summary Card */}
                <div className="p-4 bg-zinc-900/90 border border-emerald-900/40 rounded-2xl text-xs space-y-2.5 shadow-xl">
                  <div className="flex justify-between items-center text-zinc-300 border-b border-zinc-800 pb-2">
                    <span className="text-zinc-400">Sede / Cancha:</span>
                    <strong className="text-white text-sm">{match.location}</strong>
                  </div>
                  <div className="flex justify-between items-center text-zinc-300 border-b border-zinc-800 pb-2">
                    <span className="text-zinc-400">Fecha & Hora:</span>
                    <span className="text-zinc-200 capitalize">{formattedDate}</span>
                  </div>
                  <div className="flex justify-between items-center text-zinc-300 border-b border-zinc-800 pb-2">
                    <span className="text-zinc-400">Jugador:</span>
                    <span className="text-emerald-300 font-semibold">{newPlayerName} ({newPlayerDocumentId})</span>
                  </div>
                  <div className="flex justify-between items-center text-zinc-300 border-b border-zinc-800 pb-2">
                    <span className="text-zinc-400">Google / Gmail:</span>
                    <span className="text-zinc-200 font-mono text-[11px]">{gmailAddress}</span>
                  </div>
                  {hasVehicle && (
                    <div className="flex justify-between items-center text-zinc-300 border-b border-zinc-800 pb-2">
                      <span className="text-zinc-400">Vehículo:</span>
                      <span className="text-emerald-400 font-mono font-bold">
                        {formatPlateBadge(vehiclePlate)}
                      </span>
                    </div>
                  )}
                  {hasGuest && (
                    <div className="flex justify-between items-center text-zinc-300 border-b border-zinc-800 pb-2">
                      <span className="text-zinc-400">Invitado (+1):</span>
                      <span className={guestType === 'COMPANION' ? 'text-blue-400 font-semibold' : 'text-emerald-400 font-semibold'}>
                        {guestName} ({guestType === 'COMPANION' ? 'Acompañante • Cuota Cancha $0' : 'Jugador • Cuota Cancha'})
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-zinc-300 pt-1">
                    <div>
                      <span className="text-zinc-400 block">Cuota Total Estimada:</span>
                      <span className="text-[10px] text-zinc-500">
                        {confirmedPlayersCount > 0
                          ? `Cuota: $${dynamicPitchFee.toLocaleString('es-CO')} COP (${confirmedPlayersCount} inscritos confirmados)`
                          : `Cuota: $${dynamicPitchFee.toLocaleString('es-CO')} COP`}
                      </span>
                    </div>
                    <span className="text-emerald-400 font-mono font-bold text-sm">
                      ${totalEstimatedForUser.toLocaleString('es-CO')} COP
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(4)}
                    className="border-zinc-700 text-zinc-400 hover:text-zinc-200 rounded-xl"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={handleFinalSubmit}
                    disabled={isPending}
                    size="lg"
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl gap-2 text-sm shadow-xl transition-all"
                  >
                    {isPending ? 'Inscribiendo...' : isFull ? 'Entrar a Lista de Espera ⚽' : 'Confirmar mi Inscripción Oficial ⚽'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Floating Pill: Quick Match Details Toggle */}
      <div className="text-center pt-4">
        <button
          type="button"
          onClick={() => setShowMatchDetails(!showMatchDetails)}
          className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 bg-zinc-900/80 px-3.5 py-1.5 rounded-full border border-zinc-800 transition-all shadow-sm"
        >
          <Info className="w-3.5 h-3.5 text-emerald-400" />
          <span>{showMatchDetails ? 'Ocultar detalles de la convocatoria' : 'Ver resumen del partido (Cancha / Hora / Cupos)'}</span>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showMatchDetails ? 'rotate-180' : ''}`} />
        </button>

        {/* Collapsible Match Drawer */}
        {showMatchDetails && (
          <div className="mt-4 p-4 bg-zinc-900/95 border border-zinc-800 rounded-2xl text-left text-xs space-y-3 animate-in fade-in duration-200 shadow-xl">
            <div className="grid grid-cols-2 gap-2 text-zinc-300">
              <div>
                <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Cancha</span>
                <span className="font-semibold text-zinc-100">{match.location}</span>
                {match.locationAddress && <span className="text-[11px] text-zinc-400 block">{match.locationAddress}</span>}
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Fecha</span>
                <span className="font-semibold text-zinc-100 capitalize">{formattedDate}</span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Cuota Cancha (Dinámica)</span>
                <span className="font-semibold text-emerald-400 font-mono">${dynamicPitchFee.toLocaleString('es-CO')} COP</span>
                <span className="text-[10px] text-zinc-500 block">({confirmedPlayersCount} confirmados)</span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Cupos</span>
                <span className="font-semibold text-zinc-200">{confirmedList.length}/{maxPlayers} confirmados</span>
              </div>
            </div>
            <div className="pt-2 border-t border-zinc-800/80 text-[11px] text-zinc-400">
              👟 <strong>Calzado:</strong> Tenis o zapatillas para sintética (cero guayos).
            </div>
          </div>
        )}
      </div>

      {/* Live Roster Convocatoria Modal */}
      {showRosterModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-zinc-900 border border-zinc-700/80 rounded-3xl p-5 sm:p-6 max-w-lg w-full max-h-[90vh] flex flex-col space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    Nómina Oficial Convocada
                    <Badge variant={isFull ? 'default' : 'secondary'} className="text-[10px]">
                      {confirmedList.length}/{maxPlayers} Cupos
                    </Badge>
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Jugadores confirmados y estado de la nómina en vivo
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRosterModal(false)}
                className="text-zinc-400 hover:text-white p-1.5 rounded-full bg-zinc-800 hover:bg-zinc-700 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable list */}
            <div className="overflow-y-auto space-y-4 pr-1 text-xs divide-y divide-zinc-800/60 flex-1">
              {/* Confirmed Squad */}
              <div className="space-y-2 pt-1">
                <div className="flex justify-between items-center text-zinc-400 font-semibold uppercase text-[10px] tracking-wider">
                  <span>⚽ Jugadores Confirmados ({confirmedList.length})</span>
                  <span className="text-emerald-400 font-mono">
                    ${dynamicPitchFee.toLocaleString('es-CO')} c/u
                  </span>
                </div>
                {confirmedList.length === 0 ? (
                  <p className="text-zinc-500 italic py-2">No hay jugadores confirmados aún.</p>
                ) : (
                  <div className="grid grid-cols-1 gap-1.5">
                    {confirmedList.map((att, idx) => {
                      const host = getPlayer(att.playerId);
                      const isGuest = Boolean(att.guestName && att.guestName.trim().length > 0);
                      const companion = !isGuest
                        ? attendances.find(
                            (a) =>
                              a.playerId === att.playerId &&
                              a.guestName &&
                              a.guestType === 'COMPANION' &&
                              a.id !== att.id &&
                              (a.status === 'CONFIRMED' || a.status === 'ATTENDED')
                          )
                        : null;
                      return (
                        <div
                          key={att.id}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950/50 border border-zinc-800/80 hover:border-zinc-700 transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="font-mono text-[11px] font-bold text-emerald-400 w-5 text-center shrink-0">
                              #{idx + 1}
                            </span>
                            <div className="truncate">
                              {isGuest ? (
                                <div>
                                  <span className="font-semibold text-emerald-300 block truncate">
                                    ⚽ {att.guestName}
                                  </span>
                                  <span className="text-[10px] text-zinc-400">
                                    Invitado de <strong className="text-zinc-300">{host?.fullName || 'Jugador'}</strong>
                                  </span>
                                </div>
                              ) : (
                                <div>
                                  <span className="font-semibold text-zinc-100 block truncate">
                                    ⚽ {host?.fullName || att.playerId}
                                  </span>
                                  {companion && (
                                    <span className="text-[10px] text-blue-300 flex items-center gap-1">
                                      <span>+ Acompañante:</span>
                                      <strong className="text-blue-200">{companion.guestName}</strong>
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {att.vehiclePlate && (
                              <span className="text-[10px] font-mono font-bold bg-zinc-800 text-amber-300 px-2 py-0.5 rounded border border-amber-500/20">
                                {formatPlateBadge(att.vehiclePlate)}
                              </span>
                            )}
                            <Badge variant="outline" className="text-[10px] bg-emerald-950/40 border-emerald-500/30 text-emerald-300">
                              Confirmado
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Waitlist (if any) */}
              {waitlistList.length > 0 && (
                <div className="space-y-2 pt-3">
                  <div className="text-zinc-400 font-semibold uppercase text-[10px] tracking-wider">
                    ⏳ Lista de Espera ({waitlistList.length})
                  </div>
                  <div className="grid grid-cols-1 gap-1.5">
                    {waitlistList.map((att, idx) => {
                      const host = getPlayer(att.playerId);
                      const isGuest = Boolean(att.guestName && att.guestName.trim().length > 0);
                      return (
                        <div
                          key={att.id}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950/30 border border-amber-500/20"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-mono text-[11px] font-bold text-amber-400 w-5 text-center shrink-0">
                              W{idx + 1}
                            </span>
                            <div className="truncate">
                              {isGuest ? (
                                <div>
                                  <span className="font-semibold text-amber-300 truncate block">
                                    ⚽ {att.guestName}
                                  </span>
                                  <span className="text-[10px] text-zinc-400">
                                    Invitado de {host?.fullName || 'Jugador'}
                                  </span>
                                </div>
                              ) : (
                                <span className="font-semibold text-zinc-200 truncate block">
                                  ⚽ {host?.fullName || att.playerId}
                                </span>
                              )}
                            </div>
                          </div>
                          <Badge variant="outline" className="text-[10px] bg-amber-950/40 border-amber-500/30 text-amber-300">
                            En Espera
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer with live fee info */}
            <div className="pt-3 border-t border-zinc-800 flex items-center justify-between">
              <div className="text-xs">
                <span className="text-zinc-500 block text-[10px]">Cuota Cancha en Vivo:</span>
                <span className="text-emerald-400 font-mono font-bold">
                  ${dynamicPitchFee.toLocaleString('es-CO')} COP
                </span>
                <span className="text-zinc-500 text-[10px] ml-1">
                  ({confirmedPlayersCount} confirmados)
                </span>
              </div>
              <Button
                type="button"
                onClick={() => setShowRosterModal(false)}
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs px-4 py-2 rounded-xl"
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
