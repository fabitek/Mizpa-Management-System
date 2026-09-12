import type {
  Attendance,
  AttendanceStatus,
  IMatchRepository,
  IAttendanceRepository,
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
  private readonly idGenerator?: () => string;

  constructor(
    matchRepository: IMatchRepository,
    attendanceRepository: IAttendanceRepository,
    idGenerator?: () => string
  ) {
    this.matchRepository = matchRepository;
    this.attendanceRepository = attendanceRepository;
    this.idGenerator = idGenerator;
  }

  async execute(input: RegisterAttendanceInput): Promise<RegisterAttendanceResult> {
    const { matchId, playerId, guestName, registeredAt = new Date() } = input;

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

    // 5. Evaluar aforo disponible
    const activeConfirmedCount = currentAttendances.filter(
      (a) => a.status === 'CONFIRMED' || a.status === 'ATTENDED'
    ).length;

    const hasSpotAvailable = activeConfirmedCount < match.maxPlayers;
    const status: AttendanceStatus = hasSpotAvailable ? 'CONFIRMED' : 'WAITLIST';

    // 6. Generar registro de asistencia
    const attendanceId = this.idGenerator
      ? this.idGenerator()
      : `att-${matchId}-${isGuest ? 'guest' : playerId}-${Date.now()}`;

    const newAttendance: Attendance = {
      id: attendanceId,
      matchId,
      playerId,
      status,
      registeredAt,
      registeredByPlayerId: isGuest ? playerId : undefined,
      guestName: isGuest ? guestName!.trim() : undefined,
    };

    await this.attendanceRepository.save(newAttendance);

    return {
      attendance: newAttendance,
      isWaitlist: !hasSpotAvailable,
      activeConfirmedCount: hasSpotAvailable ? activeConfirmedCount + 1 : activeConfirmedCount,
      maxPlayers: match.maxPlayers,
    };
  }
}
