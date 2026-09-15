import type {
  Attendance,
  AttendanceStatus,
  IMatchRepository,
  IAttendanceRepository,
  IPlayerRepository,
} from '../domain/index.ts';
import {
  MatchNotFoundError,
  MatchRegistrationClosedError,
  PlayerAlreadyRegisteredError,
} from '../domain/index.ts';

export interface RegisterAttendanceInput {
  matchId: string;
  playerId: string;
  guestName?: string;
  guestType?: 'PLAYER' | 'COMPANION';
  hasVehicle?: boolean;
  vehiclePlate?: string;
  registeredAt?: Date;
}

export interface RegisterAttendanceResult {
  attendance: Attendance;
  isWaitlist: boolean;
  activeConfirmedCount: number;
  maxPlayers: number;
}

export class RegisterAttendanceUseCase {
  private readonly matchRepository: IMatchRepository;
  private readonly attendanceRepository: IAttendanceRepository;
  private readonly playerRepository?: IPlayerRepository;
  private readonly idGenerator?: () => string;

  constructor(
    matchRepository: IMatchRepository,
    attendanceRepository: IAttendanceRepository,
    playerRepository?: IPlayerRepository,
    idGenerator?: () => string
  ) {
    this.matchRepository = matchRepository;
    this.attendanceRepository = attendanceRepository;
    this.playerRepository = playerRepository;
    this.idGenerator = idGenerator;
  }

  async execute(input: RegisterAttendanceInput): Promise<RegisterAttendanceResult> {
    const { matchId, playerId, guestName, guestType, registeredAt = new Date() } = input;

    // 1. Validar que el partido exista
    const match = await this.matchRepository.findById(matchId);
    if (!match) {
      throw new MatchNotFoundError(`Match with ID '${matchId}' not found.`);
    }

    // 2. Validar que el partido esté abierto para inscripciones
    if (match.status !== 'OPEN_REGISTRATION') {
      throw new MatchRegistrationClosedError(
        `Cannot register for match '${matchId}': Status is '${match.status}'.`
      );
    }

    // 3. Obtener asistencias actuales del partido
    const currentAttendances = await this.attendanceRepository.findByMatchId(matchId);

    const isGuest = Boolean(guestName && guestName.trim().length > 0);
    const resolvedGuestType: 'PLAYER' | 'COMPANION' | undefined = isGuest
      ? guestType || 'PLAYER'
      : undefined;

    const isCompanion = resolvedGuestType === 'COMPANION';

    // 4. Chequeo de duplicados para auto-inscripción
    if (!isGuest) {
      const existingRegistration = currentAttendances.find(
        (a) =>
          a.playerId === playerId &&
          !a.guestName &&
          (a.status === 'CONFIRMED' || a.status === 'WAITLIST' || a.status === 'ATTENDED')
      );

      if (existingRegistration) {
        throw new PlayerAlreadyRegisteredError(
          `Player '${playerId}' is already registered for match '${matchId}' with status '${existingRegistration.status}'.`
        );
      }
    } else {
      // Validar que el invitado no sea el mismo jugador anfitrión
      if (this.playerRepository) {
        const hostPlayer = await this.playerRepository.findById(playerId);
        if (hostPlayer) {
          const norm = (s: string) =>
            s
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .toLowerCase()
              .replace(/[^a-z0-9]/g, '');

          const cleanGuestNorm = norm(guestName!);
          const hostNameNorm = norm(hostPlayer.fullName || '');
          const hostAliasNorm = hostPlayer.alias ? norm(hostPlayer.alias) : '';
          const hostEmailNorm = hostPlayer.email ? norm(hostPlayer.email.split('@')[0]) : '';

          if (
            (cleanGuestNorm && cleanGuestNorm === hostNameNorm) ||
            (hostAliasNorm && cleanGuestNorm === hostAliasNorm) ||
            (hostEmailNorm && cleanGuestNorm === hostEmailNorm)
          ) {
            throw new PlayerAlreadyRegisteredError(
              `El nombre del invitado ('${guestName}') coincide con el jugador anfitrión. El invitado debe ser una persona distinta.`
            );
          }
        }
      }

      // Chequeo de duplicado de invitado con el mismo nombre para el mismo jugador
      const trimmedGuestName = guestName!.trim().toLowerCase();
      const existingGuest = currentAttendances.find(
        (a) =>
          a.registeredByPlayerId === playerId &&
          a.guestName?.trim().toLowerCase() === trimmedGuestName &&
          (a.status === 'CONFIRMED' || a.status === 'WAITLIST' || a.status === 'ATTENDED')
      );

      if (existingGuest) {
        throw new PlayerAlreadyRegisteredError(
          `Guest '${guestName}' was already registered by player '${playerId}'.`
        );
      }
    }

    // 5. Evaluar aforo disponible: SOLO los jugadores (no acompañantes) consumen cupos de cancha
    const activeConfirmedPlayersCount = currentAttendances.filter(
      (a) => (a.status === 'CONFIRMED' || a.status === 'ATTENDED') && a.guestType !== 'COMPANION'
    ).length;

    const hasSpotAvailable = isCompanion ? true : activeConfirmedPlayersCount < match.maxPlayers;
    const status: AttendanceStatus = hasSpotAvailable ? 'CONFIRMED' : 'WAITLIST';

    // 6. Generar registro de asistencia
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    let attendanceId = crypto.randomUUID();
    if (this.idGenerator) {
      const gen = this.idGenerator();
      if (UUID_REGEX.test(gen)) {
        attendanceId = gen;
      }
    }

    const newAttendance: Attendance = {
      id: attendanceId,
      matchId,
      playerId,
      status,
      registeredAt,
      registeredByPlayerId: isGuest ? playerId : undefined,
      guestName: isGuest ? guestName!.trim() : undefined,
      guestType: resolvedGuestType,
      hasVehicle: Boolean(input.hasVehicle),
      vehiclePlate: input.hasVehicle && input.vehiclePlate ? input.vehiclePlate.trim().toUpperCase() : undefined,
    };

    await this.attendanceRepository.save(newAttendance);

    const finalPlayerCount = !isCompanion && hasSpotAvailable
      ? activeConfirmedPlayersCount + 1
      : activeConfirmedPlayersCount;

    return {
      attendance: newAttendance,
      isWaitlist: !hasSpotAvailable,
      activeConfirmedCount: finalPlayerCount,
      maxPlayers: match.maxPlayers,
    };
  }
}
