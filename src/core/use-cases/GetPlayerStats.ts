import type { PlayerPerformanceStats, PlayerBadge, BadgeCode } from '../domain/types.ts';
import type {
  IGoalRepository,
  IAttendanceRepository,
  IMatchRepository,
  IFinanceRepository,
} from '../domain/repositories.ts';

export class GetPlayerStatsUseCase {
  private readonly goalRepository: IGoalRepository;
  private readonly attendanceRepository: IAttendanceRepository;
  private readonly matchRepository: IMatchRepository;
  private readonly financeRepository: IFinanceRepository;

  constructor(
    goalRepository: IGoalRepository,
    attendanceRepository: IAttendanceRepository,
    matchRepository: IMatchRepository,
    financeRepository: IFinanceRepository
  ) {
    this.goalRepository = goalRepository;
    this.attendanceRepository = attendanceRepository;
    this.matchRepository = matchRepository;
    this.financeRepository = financeRepository;
  }

  async execute(playerId: string): Promise<PlayerPerformanceStats> {
    // 1. Fetch player goals
    const playerGoals = await this.goalRepository.findByPlayerId(playerId);

    const openPlay = playerGoals.filter((g) => g.type === 'OPEN_PLAY').length;
    const penalty = playerGoals.filter((g) => g.type === 'PENALTY').length;
    const ownGoal = playerGoals.filter((g) => g.type === 'OWN_GOAL').length;
    const goalsCount = openPlay + penalty;

    // 2. Fetch matches and compute chronological attendance streak
    const allMatches = await this.matchRepository.findAll();
    const playedMatches = allMatches
      .filter((m) => m.status === 'PLAYED' || m.status === 'SETTLED')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const playerAttendances = await this.attendanceRepository.findByPlayerId(playerId);
    const attendedMatchIds = new Set(
      playerAttendances.filter((a) => a.status === 'ATTENDED').map((a) => a.matchId)
    );

    const matchesPlayed = attendedMatchIds.size;
    const goalsPerMatchRatio =
      matchesPlayed > 0 ? Number((goalsCount / matchesPlayed).toFixed(2)) : goalsCount;

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

    // 3. Count MVPs
    const mvpCount = playedMatches.filter((m) => m.mvpPlayerId === playerId).length;

    // 4. Check for Hat-trick in a single match
    const goalsByMatch = new Map<string, number>();
    for (const g of playerGoals) {
      if (g.type === 'OPEN_PLAY' || g.type === 'PENALTY') {
        goalsByMatch.set(g.matchId, (goalsByMatch.get(g.matchId) ?? 0) + 1);
      }
    }
    const hasHatTrick = Array.from(goalsByMatch.values()).some((count) => count >= 3);

    // 5. Check financial balance
    const balance = await this.financeRepository.getPlayerBalance(playerId);
    const isSolvent = balance >= 0;

    // 6. Evaluate Badges
    const badges: PlayerBadge[] = [
      {
        code: 'PICHICHI',
        title: 'Pichichi / Goleador',
        description: 'Ha marcado 3 o más goles en la temporada.',
        icon: '⚽',
        unlocked: goalsCount >= 3,
      },
      {
        code: 'IRON_MAN',
        title: 'Hombre de Hierro',
        description: 'Racha de 3 o más partidos consecutivos jugados.',
        icon: '🛡️',
        unlocked: bestStreak >= 3,
      },
      {
        code: 'HAT_TRICK_HERO',
        title: 'Héroe del Hat-Trick',
        description: 'Anotó 3 o más goles en un solo encuentro.',
        icon: '🎩',
        unlocked: hasHatTrick,
      },
      {
        code: 'FIEL_MIZPA',
        title: 'Fiel Mizpa',
        description: 'Ha disputado 5 o más partidos oficiales.',
        icon: '🎖️',
        unlocked: matchesPlayed >= 5,
      },
      {
        code: 'FAIR_PLAY_SOLVENT',
        title: 'Fair Play Financiero',
        description: 'Billetera al día y sin saldos pendientes por pagar.',
        icon: '⚖️',
        unlocked: isSolvent,
      },
    ];

    return {
      playerId,
      matchesPlayed,
      goalsCount,
      ownGoalsCount: ownGoal,
      goalsBreakdown: {
        openPlay,
        penalty,
        ownGoal,
      },
      goalsPerMatchRatio,
      currentAttendanceStreak: currentStreak,
      bestAttendanceStreak: bestStreak,
      mvpCount,
      badges,
    };
  }
}
