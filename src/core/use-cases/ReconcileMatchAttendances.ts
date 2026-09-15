import type {
  Match,
  IMatchRepository,
  IAttendanceRepository,
  Attendance,
} from '../domain/index.ts';
import { MatchNotFoundError } from '../domain/exceptions.ts';

export interface ReconcileMatchAttendancesResult {
  match: Match;
  promotedCount: number;
  promotedAttendances: Attendance[];
  activeConfirmedCount: number;
  waitlistCount: number;
  maxPlayers: number;
  allAttendances: Attendance[];
}

/**
 * Use Case to reconcile and synchronize attendance waitlists against match capacity.
 * Ensures that if maxPlayers was increased or if spots became open,
 * waitlisted players are promoted in chronological order (FIFO) up to maxPlayers.
 */
export class ReconcileMatchAttendancesUseCase {
  private readonly matchRepository: IMatchRepository;
  private readonly attendanceRepository: IAttendanceRepository;

  constructor(
    matchRepository: IMatchRepository,
    attendanceRepository: IAttendanceRepository
  ) {
    this.matchRepository = matchRepository;
    this.attendanceRepository = attendanceRepository;
  }

  async execute(matchId: string): Promise<ReconcileMatchAttendancesResult> {
    const match = await this.matchRepository.findById(matchId);
    if (!match) {
      throw new MatchNotFoundError(`Match with ID '${matchId}' not found.`);
    }

    const attendances = await this.attendanceRepository.findByMatchId(matchId);

    // Filter confirmed playing attendees (excluding non-playing companions)
    const activeConfirmed = attendances.filter(
      (a) => (a.status === 'CONFIRMED' || a.status === 'ATTENDED') && a.guestType !== 'COMPANION'
    );

    const availableSpots = Math.max(0, match.maxPlayers - activeConfirmed.length);
    const promotedAttendances: Attendance[] = [];

    if (availableSpots > 0) {
      const waitlist = attendances
        .filter((a) => a.status === 'WAITLIST')
        .sort((a, b) => a.registeredAt.getTime() - b.registeredAt.getTime());

      const toPromote = waitlist.slice(0, availableSpots);

      for (const item of toPromote) {
        const promoted: Attendance = {
          ...item,
          status: 'CONFIRMED',
        };
        await this.attendanceRepository.update(promoted);
        promotedAttendances.push(promoted);
      }
    }

    const updatedAttendances = await this.attendanceRepository.findByMatchId(matchId);
    const finalConfirmed = updatedAttendances.filter(
      (a) => (a.status === 'CONFIRMED' || a.status === 'ATTENDED') && a.guestType !== 'COMPANION'
    ).length;
    const finalWaitlist = updatedAttendances.filter(
      (a) => a.status === 'WAITLIST' && a.guestType !== 'COMPANION'
    ).length;

    return {
      match,
      promotedCount: promotedAttendances.length,
      promotedAttendances,
      activeConfirmedCount: finalConfirmed,
      waitlistCount: finalWaitlist,
      maxPlayers: match.maxPlayers,
      allAttendances: updatedAttendances,
    };
  }
}
