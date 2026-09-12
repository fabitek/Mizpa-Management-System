import type {
  Attendance,
  IMatchRepository,
  IAttendanceRepository,
} from '../domain/index.ts';
import {
  MatchNotFoundError,
  MatchAlreadySettledError,
  InvalidAttendanceStateError,
} from '../domain/index.ts';

export interface CheckinAttendanceInput {
  attendanceId: string;
  status: 'ATTENDED' | 'CONFIRMED';
}

export class CheckinAttendanceUseCase {
  private readonly matchRepository: IMatchRepository;
  private readonly attendanceRepository: IAttendanceRepository;

  constructor(
    matchRepository: IMatchRepository,
    attendanceRepository: IAttendanceRepository
  ) {
    this.matchRepository = matchRepository;
    this.attendanceRepository = attendanceRepository;
  }

  async execute(input: CheckinAttendanceInput): Promise<Attendance> {
    const { attendanceId, status } = input;

    const attendance = await this.attendanceRepository.findById(attendanceId);
    if (!attendance) {
      throw new Error(`Attendance with ID '${attendanceId}' not found.`);
    }

    const match = await this.matchRepository.findById(attendance.matchId);
    if (!match) {
      throw new MatchNotFoundError(`Match '${attendance.matchId}' not found.`);
    }

    if (match.status === 'SETTLED') {
      throw new MatchAlreadySettledError(
        `Cannot change attendance check-in: Match '${match.id}' is already settled.`
      );
    }

    if (attendance.status === 'CANCELLED') {
      throw new InvalidAttendanceStateError(
        `Cannot check-in attendance '${attendanceId}' because it was cancelled.`
      );
    }

    const updatedAttendance: Attendance = {
      ...attendance,
      status,
    };

    await this.attendanceRepository.update(updatedAttendance);

    return updatedAttendance;
  }
}
