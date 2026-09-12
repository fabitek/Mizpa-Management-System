import type { Match } from '../domain/types.ts';
import type { IMatchRepository, IAttendanceRepository } from '../domain/repositories.ts';
import { MatchNotFoundError, InvalidAttendanceStateError } from '../domain/exceptions.ts';

export interface AssignMatchMvpDTO {
  matchId: string;
  playerId: string;
}

export class AssignMatchMvpUseCase {
  private readonly matchRepository: IMatchRepository;
  private readonly attendanceRepository: IAttendanceRepository;

  constructor(
    matchRepository: IMatchRepository,
    attendanceRepository: IAttendanceRepository
  ) {
    this.matchRepository = matchRepository;
    this.attendanceRepository = attendanceRepository;
  }

  async execute(dto: AssignMatchMvpDTO): Promise<Match> {
    const match = await this.matchRepository.findById(dto.matchId);
    if (!match) {
      throw new MatchNotFoundError(`Match with ID ${dto.matchId} does not exist.`);
    }

    if (match.status === 'CANCELLED') {
      throw new InvalidAttendanceStateError('Cannot assign MVP for a cancelled match.');
    }

    // Verify player actually attended or participated in the match
    const attendances = await this.attendanceRepository.findByMatchId(dto.matchId);
    const participated = attendances.some(
      (a) =>
        (a.playerId === dto.playerId || a.registeredByPlayerId === dto.playerId) &&
        (a.status === 'ATTENDED' || a.status === 'CONFIRMED')
    );

    if (!participated) {
      throw new InvalidAttendanceStateError(
        `Player ${dto.playerId} did not participate in match ${dto.matchId}.`
      );
    }

    const updatedMatch: Match = {
      ...match,
      mvpPlayerId: dto.playerId,
      updatedAt: new Date(),
    };

    await this.matchRepository.update(updatedMatch);
    return updatedMatch;
  }
}
