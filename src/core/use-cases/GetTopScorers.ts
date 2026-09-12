import type { TopScorerEntry } from '../domain/types.ts';
import type { IGoalRepository, IAttendanceRepository } from '../domain/repositories.ts';

export class GetTopScorersUseCase {
  private readonly goalRepository: IGoalRepository;
  private readonly attendanceRepository: IAttendanceRepository;

  constructor(
    goalRepository: IGoalRepository,
    attendanceRepository: IAttendanceRepository
  ) {
    this.goalRepository = goalRepository;
    this.attendanceRepository = attendanceRepository;
  }

  async execute(): Promise<TopScorerEntry[]> {
    const allGoals = await this.goalRepository.getAll();

    // Group valid goals (OPEN_PLAY and PENALTY) by player
    const validGoals = allGoals.filter((g) => g.type === 'OPEN_PLAY' || g.type === 'PENALTY');

    const goalsByPlayer = new Map<string, { total: number; penalties: number; openPlay: number }>();

    for (const goal of validGoals) {
      const current = goalsByPlayer.get(goal.playerId) ?? { total: 0, penalties: 0, openPlay: 0 };
      current.total += 1;
      if (goal.type === 'PENALTY') {
        current.penalties += 1;
      } else {
        current.openPlay += 1;
      }
      goalsByPlayer.set(goal.playerId, current);
    }

    const ranking: TopScorerEntry[] = [];

    for (const [playerId, counts] of goalsByPlayer.entries()) {
      const attendances = await this.attendanceRepository.findByPlayerId(playerId);
      const matchesPlayed = attendances.filter((a) => a.status === 'ATTENDED').length;

      const ratio = matchesPlayed > 0 ? Number((counts.total / matchesPlayed).toFixed(2)) : counts.total;

      ranking.push({
        playerId,
        goals: counts.total,
        matchesPlayed,
        ratio,
        penalties: counts.penalties,
        openPlayGoals: counts.openPlay,
      });
    }

    // Sort: 1) Most goals desc, 2) Fewest matches played asc (efficiency), 3) Most open play goals desc
    ranking.sort((a, b) => {
      if (b.goals !== a.goals) {
        return b.goals - a.goals;
      }
      if (a.matchesPlayed !== b.matchesPlayed) {
        return a.matchesPlayed - b.matchesPlayed;
      }
      return b.openPlayGoals - a.openPlayGoals;
    });

    return ranking;
  }
}
