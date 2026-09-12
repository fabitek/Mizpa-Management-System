import type { GoalEvent, GoalType } from '../domain/types.ts';
import type { IMatchRepository, IGoalRepository } from '../domain/repositories.ts';
import { MatchNotFoundError, InvalidGoalDataError } from '../domain/exceptions.ts';

export interface RecordGoalEventDTO {
  matchId: string;
  playerId: string;
  minute?: number;
  type?: GoalType;
}

export class RecordGoalEventUseCase {
  private readonly matchRepository: IMatchRepository;
  private readonly goalRepository: IGoalRepository;

  constructor(
    matchRepository: IMatchRepository,
    goalRepository: IGoalRepository
  ) {
    this.matchRepository = matchRepository;
    this.goalRepository = goalRepository;
  }

  async execute(dto: RecordGoalEventDTO): Promise<GoalEvent> {
    if (!dto.matchId || !dto.playerId) {
      throw new InvalidGoalDataError('Match ID and Player ID are required.');
    }

    const match = await this.matchRepository.findById(dto.matchId);
    if (!match) {
      throw new MatchNotFoundError(`Match with ID ${dto.matchId} does not exist.`);
    }

    if (match.status === 'CANCELLED') {
      throw new InvalidGoalDataError('Cannot record goals for a cancelled match.');
    }

    if (dto.minute !== undefined && (dto.minute < 0 || dto.minute > 130)) {
      throw new InvalidGoalDataError('Goal minute must be between 0 and 130.');
    }

    const goalEvent: GoalEvent = {
      id: crypto.randomUUID(),
      matchId: dto.matchId,
      playerId: dto.playerId,
      minute: dto.minute,
      type: dto.type ?? 'OPEN_PLAY',
      createdAt: new Date(),
    };

    await this.goalRepository.recordGoal(goalEvent);
    return goalEvent;
  }
}
