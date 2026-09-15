import type { TopScorerEntry } from '../domain/types.ts';
import type {
  IGoalRepository,
  IAttendanceRepository,
  IMatchRepository,
} from '../domain/repositories.ts';
import { GetTopScorersUseCase } from './GetTopScorers.ts';

export interface AttendanceRankingEntry {
  playerId: string;
  matchesPlayed: number;
  currentStreak: number;
  bestStreak: number;
}

export interface MvpRankingEntry {
  playerId: string;
  mvpCount: number;
}

export interface LeaderboardOverview {
  topScorers: TopScorerEntry[];
  attendanceRankings: AttendanceRankingEntry[];
  mvpRankings: MvpRankingEntry[];
  totalGoalsScored: number;
  totalMatchesPlayed: number;
}

export class GetLeaderboardOverviewUseCase {
  private readonly getTopScorersUseCase: GetTopScorersUseCase;
  private readonly goalRepository: IGoalRepository;
  private readonly attendanceRepository: IAttendanceRepository;
  private readonly matchRepository: IMatchRepository;

  constructor(
    goalRepository: IGoalRepository,
    attendanceRepository: IAttendanceRepository,
    matchRepository: IMatchRepository
  ) {
    this.goalRepository = goalRepository;
    this.attendanceRepository = attendanceRepository;
    this.matchRepository = matchRepository;
    this.getTopScorersUseCase = new GetTopScorersUseCase(goalRepository, attendanceRepository);
  }

  async execute(allPlayerIds: string[] = []): Promise<LeaderboardOverview> {
    const topScorers = await this.getTopScorersUseCase.execute();

    const allMatches = await this.matchRepository.findAll();
    const playedMatches = allMatches
      .filter((m) => m.status === 'PLAYED' || m.status === 'SETTLED')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // 1. Attendance streaks and matches played per player
    const attendanceRankings: AttendanceRankingEntry[] = [];
    const safePlayerIds = Array.isArray(allPlayerIds) ? allPlayerIds : [];

    for (const playerId of safePlayerIds) {
      const attendances = await this.attendanceRepository.findByPlayerId(playerId);
      const attendedMatchIds = new Set(
        attendances.filter((a) => a.status === 'ATTENDED').map((a) => a.matchId)
      );

      const matchesPlayed = attendedMatchIds.size;

      let currentStreak = 0;
      let bestStreak = 0;

      for (const match of playedMatches) {
        if (attendedMatchIds.has(match.id)) {
          currentStreak += 1;
          if (currentStreak > bestStreak) {
            bestStreak = currentStreak;
          }
        } else {
          currentStreak = 0;
        }
      }

      attendanceRankings.push({
        playerId,
        matchesPlayed,
        currentStreak,
        bestStreak,
      });
    }

    // Sort attendance ranking: 1) matchesPlayed desc, 2) currentStreak desc
    attendanceRankings.sort((a, b) => {
      if (b.matchesPlayed !== a.matchesPlayed) {
        return b.matchesPlayed - a.matchesPlayed;
      }
      return b.currentStreak - a.currentStreak;
    });

    // 2. MVP Rankings
    const mvpCounts = new Map<string, number>();
    for (const match of playedMatches) {
      if (match.mvpPlayerId) {
        mvpCounts.set(match.mvpPlayerId, (mvpCounts.get(match.mvpPlayerId) ?? 0) + 1);
      }
    }

    const mvpRankings: MvpRankingEntry[] = Array.from(mvpCounts.entries())
      .map(([playerId, mvpCount]) => ({ playerId, mvpCount }))
      .sort((a, b) => b.mvpCount - a.mvpCount);

    // 3. Totals
    const allGoals = await this.goalRepository.getAll();
    const totalGoalsScored = allGoals.filter((g) => g.type !== 'OWN_GOAL').length;
    const totalMatchesPlayed = playedMatches.length;

    return {
      topScorers,
      attendanceRankings,
      mvpRankings,
      totalGoalsScored,
      totalMatchesPlayed,
    };
  }
}
