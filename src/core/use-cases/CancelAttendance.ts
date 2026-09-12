import type {
  Attendance,
  IMatchRepository,
  IAttendanceRepository,
} from '../domain/index.ts';
import {
  MatchNotFoundError,
  MatchAlreadySettledError,
} from '../domain/index.ts';

export interface CancelAttendanceInput {
  attendanceId: string;
}

export interface CancelAttendanceResult {
  cancelledAttendance: Attendance;
  promotedAttendance: Attendance | null;
}

export class CancelAttendanceUseCase {
  private readonly matchRepository: IMatchRepository;
  private readonly attendanceRepository: IAttendanceRepository;

  constructor(
    matchRepository: IMatchRepository,
    attendanceRepository: IAttendanceRepository
  ) {
    this.matchRepository = matchRepository;
    this.attendanceRepository = attendanceRepository;
  }

  async execute(input: CancelAttendanceInput): Promise<CancelAttendanceResult> {
    const { attendanceId } = input;

    // 1. Buscar la asistencia a cancelar
    const attendance = await this.attendanceRepository.findById(attendanceId);
    if (!attendance) {
      throw new Error(`Attendance with ID '${attendanceId}' not found.`);
    }

    if (attendance.status === 'CANCELLED') {
      return {
        cancelledAttendance: attendance,
        promotedAttendance: null,
      };
    }

    // 2. Validar que el partido no esté cerrado/liquidado
    const match = await this.matchRepository.findById(attendance.matchId);
    if (!match) {
      throw new MatchNotFoundError(`Match '${attendance.matchId}' not found.`);
    }

    if (match.status === 'SETTLED') {
      throw new MatchAlreadySettledError(
        `Cannot cancel attendance: Match '${match.id}' is already settled.`
      );
    }

    const wasActiveSpot =
      attendance.status === 'CONFIRMED' || attendance.status === 'ATTENDED';

    // 3. Marcar como CANCELLED
    const cancelledAttendance: Attendance = {
      ...attendance,
      status: 'CANCELLED',
    };
    await this.attendanceRepository.update(cancelledAttendance);

    let promotedAttendance: Attendance | null = null;

    // 4. Promoción automática de lista de espera si liberó un cupo
    if (wasActiveSpot) {
      const matchAttendances = await this.attendanceRepository.findByMatchId(match.id);
      const waitlist = matchAttendances
        .filter((a) => a.id !== attendanceId && a.status === 'WAITLIST')
        .sort((a, b) => a.registeredAt.getTime() - b.registeredAt.getTime());

      if (waitlist.length > 0) {
        const nextInLine = waitlist[0];
        promotedAttendance = {
          ...nextInLine,
          status: 'CONFIRMED',
        };
        await this.attendanceRepository.update(promotedAttendance);
      }
    }

    return {
      cancelledAttendance,
      promotedAttendance,
    };
  }
}
