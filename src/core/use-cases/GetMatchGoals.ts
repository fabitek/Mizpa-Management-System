import type { GoalEvent } from '../domain/types.ts';
import type { IGoalRepository } from '../domain/repositories.ts';

export class GetMatchGoalsUseCase {
  private readonly goalRepository: IGoalRepository;

  constructor(goalRepository: IGoalRepository) {
    this.goalRepository = goalRepository;
  }

  async execute(matchId: string): Promise<GoalEvent[]> {
    if (!matchId) return [];
    return this.goalRepository.findByMatchId(matchId);
  }
}
