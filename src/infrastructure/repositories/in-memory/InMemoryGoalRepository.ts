import type { GoalEvent, IGoalRepository } from '../../../core/domain/index.ts';

export class InMemoryGoalRepository implements IGoalRepository {
  private goals: GoalEvent[];

  constructor(initialGoals: GoalEvent[] = []) {
    this.goals = initialGoals.map((g) => ({ ...g }));
  }

  async recordGoal(goal: GoalEvent): Promise<void> {
    this.goals.push({ ...goal });
  }

  async findByMatchId(matchId: string): Promise<GoalEvent[]> {
    return this.goals
      .filter((g) => g.matchId === matchId)
      .map((g) => ({ ...g }));
  }

  async findByPlayerId(playerId: string): Promise<GoalEvent[]> {
    return this.goals
      .filter((g) => g.playerId === playerId)
      .map((g) => ({ ...g }));
  }

  async getAll(): Promise<GoalEvent[]> {
    return this.goals.map((g) => ({ ...g }));
  }

  async deleteGoal(id: string): Promise<void> {
    const index = this.goals.findIndex((g) => g.id === id);
    if (index !== -1) {
      this.goals.splice(index, 1);
    }
  }
}
