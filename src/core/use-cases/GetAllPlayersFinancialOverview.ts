import type { IFinanceRepository } from '../domain/index.ts';

export interface PlayerBalanceItem {
  playerId: string;
  balance: number;
  totalCredits: number;
  totalDebits: number;
  status: 'SOLVENT' | 'DEBTOR';
}

export interface TreasuryOverview {
  totalTreasuryBalance: number;
  totalOutstandingDebt: number;
  totalCreditsCollected: number;
  totalDebitsIssued: number;
  playerBalances: PlayerBalanceItem[];
}

export class GetAllPlayersFinancialOverviewUseCase {
  private readonly financeRepository: IFinanceRepository;

  constructor(financeRepository: IFinanceRepository) {
    this.financeRepository = financeRepository;
  }

  async execute(playerIds: string[]): Promise<TreasuryOverview> {
    const allEntries = await this.financeRepository.getAllEntries();

    let totalCreditsCollected = 0;
    let totalDebitsIssued = 0;

    for (const entry of allEntries) {
      if (entry.type === 'CREDIT') {
        totalCreditsCollected += entry.amount;
      } else if (entry.type === 'DEBIT') {
        totalDebitsIssued += entry.amount;
      }
    }

    const playerBalances: PlayerBalanceItem[] = [];
    let totalOutstandingDebt = 0;

    for (const playerId of playerIds) {
      const playerEntries = allEntries.filter((e) => e.playerId === playerId);
      let playerCredits = 0;
      let playerDebits = 0;

      for (const entry of playerEntries) {
        if (entry.type === 'CREDIT') {
          playerCredits += entry.amount;
        } else if (entry.type === 'DEBIT') {
          playerDebits += entry.amount;
        }
      }

      const balance = playerCredits - playerDebits;
      const isSolvent = balance >= 0;

      if (!isSolvent) {
        totalOutstandingDebt += Math.abs(balance);
      }

      playerBalances.push({
        playerId,
        balance,
        totalCredits: playerCredits,
        totalDebits: playerDebits,
        status: isSolvent ? 'SOLVENT' : 'DEBTOR',
      });
    }

    const totalTreasuryBalance = totalCreditsCollected - totalDebitsIssued;

    return {
      totalTreasuryBalance,
      totalOutstandingDebt,
      totalCreditsCollected,
      totalDebitsIssued,
      playerBalances,
    };
  }
}
