import type {
  Match,
  Attendance,
  Player,
  ConfirmedRosterEntry,
  WhatsAppGroupMessagePayload,
  SecurityGateRosterPayload,
  CheckAndNotifyCapacityResult,
} from '../domain/types.ts';
import type {
  IMatchRepository,
  IAttendanceRepository,
  IPlayerRepository,
  INotificationService,
} from '../domain/repositories.ts';
import type { INotificationGateway } from '../domain/ports.ts';
import { MatchNotFoundError } from '../domain/exceptions.ts';
import {
  formatWhatsAppGroupCapacityMessage,
  formatSecurityGateRosterMessage,
} from '../utils/capacity-formatters.ts';

export interface CheckAndNotifyCapacityReachedInput {
  matchId: string;
  baseUrl?: string;
  force?: boolean;
  recipientGroup?: string;
  recipientGate?: string;
}

export class CheckAndNotifyCapacityReachedUseCase {
  private readonly matchRepository: IMatchRepository;
  private readonly attendanceRepository: IAttendanceRepository;
  private readonly playerRepository: IPlayerRepository;
  private readonly notificationGateway: INotificationGateway;
  private readonly notificationService?: INotificationService;

  constructor(
    matchRepository: IMatchRepository,
    attendanceRepository: IAttendanceRepository,
    playerRepository: IPlayerRepository,
    notificationGateway: INotificationGateway,
    notificationService?: INotificationService
  ) {
    this.matchRepository = matchRepository;
    this.attendanceRepository = attendanceRepository;
    this.playerRepository = playerRepository;
    this.notificationGateway = notificationGateway;
    this.notificationService = notificationService;
  }

  async execute(
    input: CheckAndNotifyCapacityReachedInput
  ): Promise<CheckAndNotifyCapacityResult> {
    const { matchId, baseUrl, force = false, recipientGroup, recipientGate } = input;

    // 1. Validar existencia del partido
    const match = await this.matchRepository.findById(matchId);
    if (!match) {
      throw new MatchNotFoundError(`Match with ID '${matchId}' not found.`);
    }

    // 2. Control de Idempotencia: no reenviar si ya fue notificado (a menos que se fuerce)
    if (match.notificationSent10Players && !force) {
      return {
        triggered: false,
        matchId,
        confirmedCount: 0,
        reason: 'ALREADY_SENT',
      };
    }

    // 3. Obtener asistencias del partido y filtrar confirmadas
    const allAttendances = await this.attendanceRepository.findByMatchId(matchId);

    // Contar todas las confirmadas y presentes (tanto jugadores titulares como invitados/acompañantes con cupo)
    const confirmedAttendances = allAttendances
      .filter((a) => a.status === 'CONFIRMED' || a.status === 'ATTENDED')
      .sort((a, b) => a.registeredAt.getTime() - b.registeredAt.getTime());

    const confirmedCount = confirmedAttendances.length;

    // 4. Condición de Disparo: Debe haber alcanzado al menos 10 confirmados
    if (confirmedCount < 10) {
      return {
        triggered: false,
        matchId,
        confirmedCount,
        reason: 'CAPACITY_NOT_10',
      };
    }

    // 5. Construir nómina completa de todos los confirmados con datos de jugadores e invitados
    const rosterEntries: ConfirmedRosterEntry[] = [];

    // Cache de jugadores para optimizar consultas
    const playersCache = new Map<string, Player | null>();
    const getPlayer = async (id: string): Promise<Player | null> => {
      if (playersCache.has(id)) return playersCache.get(id)!;
      const p = await this.playerRepository.findById(id);
      playersCache.set(id, p);
      return p;
    };

    for (let i = 0; i < confirmedAttendances.length; i++) {
      const att = confirmedAttendances[i];
      const slotNumber = i + 1;
      const isGuest = Boolean(att.guestName && att.guestName.trim().length > 0);

      if (isGuest) {
        const hostId = att.registeredByPlayerId || att.playerId;
        const hostPlayer = hostId ? await getPlayer(hostId) : null;

        rosterEntries.push({
          slotNumber,
          playerId: att.playerId,
          fullName: att.guestName!.trim(),
          documentId: undefined, // Invitados no tienen cédula obligatoria en registro rápido
          hasVehicle: att.hasVehicle,
          vehiclePlate: att.vehiclePlate,
          isGuest: true,
          guestName: att.guestName!.trim(),
          guestType: att.guestType,
          hostPlayerName: hostPlayer?.fullName,
          registeredAt: att.registeredAt,
        });
      } else {
        const player = await getPlayer(att.playerId);
        const name = player?.fullName || `Jugador (${att.playerId.slice(0, 6)})`;

        rosterEntries.push({
          slotNumber,
          playerId: att.playerId,
          fullName: name,
          documentId: player?.documentId,
          hasVehicle: att.hasVehicle,
          vehiclePlate: att.vehiclePlate,
          isGuest: false,
          guestType: att.guestType,
          registeredAt: att.registeredAt,
        });
      }
    }

    // 6. Configurar URLs y métricas de cupos dinámicas
    const base = (
      baseUrl ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      'https://mizpa-fc.vercel.app'
    ).replace(/\/+$/, '');
    const rsvpUrl = `${base}/rsvp/${match.id}`;

    const totalCapacity = match.maxPlayers || 18;
    const playingConfirmedCount = confirmedAttendances.filter(
      (a) => a.guestType !== 'COMPANION'
    ).length;
    const remainingSpots = Math.max(0, totalCapacity - playingConfirmedCount);
    const estFee =
      playingConfirmedCount > 0
        ? Math.ceil(match.pitchRentalCost / playingConfirmedCount)
        : Math.ceil(match.pitchRentalCost / totalCapacity);

    // 7. Generar Payloads para ambos canales
    const groupPayload: WhatsAppGroupMessagePayload = {
      matchId: match.id,
      matchLocation: match.location,
      matchLocationAddress: match.locationAddress,
      matchDate: match.date,
      googleMapsUrl: match.googleMapsUrl,
      confirmedCount: playingConfirmedCount,
      totalCapacity,
      remainingSpots,
      roster: rosterEntries,
      rsvpUrl,
      recipient: recipientGroup,
      estFee,
    };

    const gatePayload: SecurityGateRosterPayload = {
      matchId: match.id,
      matchLocation: match.location,
      matchLocationAddress: match.locationAddress,
      matchDate: match.date,
      durationHours: match.durationHours || 2,
      confirmedCount: rosterEntries.length,
      roster: rosterEntries,
      recipient: recipientGate,
    };

    // 8. Formatear textos con formateadores puros
    const formattedGroupMessage = formatWhatsAppGroupCapacityMessage(groupPayload);
    const formattedGateMessage = formatSecurityGateRosterMessage(gatePayload);

    // 9. Actualizar flag de idempotencia en la entidad Match
    const updatedMatch: Match = {
      ...match,
      notificationSent10Players: true,
      updatedAt: new Date(),
    };
    await this.matchRepository.update(updatedMatch);

    // 10. Despachar a través del Gateway de Notificaciones
    const [groupResult, gateResult] = await Promise.all([
      this.notificationGateway.sendWhatsAppGroupMessage(groupPayload, formattedGroupMessage),
      this.notificationGateway.sendSecurityGateRoster(gatePayload, formattedGateMessage),
    ]);

    // 11. Auditoría opcional en servicio de notificaciones
    if (this.notificationService) {
      try {
        await this.notificationService.sendNotification({
          recipientPlayerId: 'GROUP',
          recipientPhone: recipientGroup,
          channel: 'WHATSAPP',
          type: 'CAPACITY_REACHED_10',
          title: `🔥 Quórum Alcanzado (10 Jugadores): ${match.location}`,
          content: formattedGroupMessage,
          actionUrl: `/rsvp/${match.id}`,
          sentAt: new Date(),
        });
      } catch (logErr) {
        console.warn('Auditing notification log warning:', logErr);
      }
    }

    return {
      triggered: true,
      matchId: match.id,
      confirmedCount,
      reason: 'NOTIFICATION_SENT',
      groupMessage: formattedGroupMessage,
      gateMessage: formattedGateMessage,
      groupResult,
      gateResult,
    };
  }
}
