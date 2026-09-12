import type {
  MatchStatus,
  FinancialEntry,
  IMatchRepository,
  IFinanceRepository,
  IAttendanceRepository,
} from '../domain/index.ts';
import { MatchNotFoundError } from '../domain/index.ts';

export interface MatchFinancialSummary {
  matchId: string;
  location: string;
  date: Date;
  status: MatchStatus;
  pitchRentalCost: number;
  extraCosts: number;
  totalMatchCost: number;
  attendedPlayersCount: number;
  settledFeePerPlayer: number | null;
  totalDebitedAmount: number;
  roundingSurplus: number;
  isSettled: boolean;
  entries: FinancialEntry[];
}

export class GetMatchFinancialSummaryUseCase {
  private readonly matchRepository: IMatchRepository;
  private readonly financeRepository: IFinanceRepository;
  private readonly attendanceRepository: IAttendanceRepository;

  constructor(
    matchRepository: IMatchRepository,
    financeRepository: IFinanceRepository,
    attendanceRepository: IAttendanceRepository
  ) {
    this.matchRepository = matchRepository;
    this.financeRepository = financeRepository;
    this.attendanceRepository = attendanceRepository;
  }

  async execute(matchId: string): Promise<MatchFinancialSummary> {
    const match = await this.matchRepository.findById(matchId);
    if (!match) {
      throw new MatchNotFoundError(`Match with ID '${matchId}' not found.`);
    }

    const [entries, attendances] = await Promise.all([
      this.financeRepository.getEntriesByMatchId(matchId),
      this.attendanceRepository.findByMatchId(matchId),
    ]);

    const totalMatchCost = match.pitchRentalCost + match.extraCosts;
    const attendedPlayersCount = attendances.filter(
      (a) => a.status === 'ATTENDED'
    ).length;

    const totalDebitedAmount = entries
      .filter((e) => e.type === 'DEBIT')
      .reduce((sum, e) => sum + e.amount, 0);

    const isSettled = match.status === 'SETTLED';
    const roundingSurplus = isSettled
      ? Math.max(0, totalDebitedAmount - totalMatchCost)
      : 0;

    return {
      matchId: match.id,
      location: match.location,
      date: match.date,
      status: match.status,
      pitchRentalCost: match.pitchRentalCost,
      extraCosts: match.extraCosts,
      totalMatchCost,
      attendedPlayersCount,
      settledFeePerPlayer: match.settledFeePerPlayer,
      totalDebitedAmount,
      roundingSurplus,
      isSettled,
      entries,
    };
  }
}
