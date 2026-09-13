import type { GoalEvent, IGoalRepository } from '../../../core/domain/index.ts';
import { loadDB, saveDB } from './FileDB.ts';

export class InMemoryGoalRepository implements IGoalRepository {
  private goals: GoalEvent[];

  constructor(initialGoals: GoalEvent[] = []) {
    const db = loadDB();
    if (db && db.goals && db.goals.length > 0) {
      this.goals = db.goals.map((g) => ({ ...g }));
    } else {
      this.goals = initialGoals.map((g) => ({ ...g }));
      saveDB({ goals: this.goals });
    }
  }

  private persist() {
    saveDB({ goals: this.goals });
  }

  async recordGoal(goal: GoalEvent): Promise<void> {
    this.goals.push({ ...goal });
    this.persist();
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
      this.persist();
    }
  }
}
