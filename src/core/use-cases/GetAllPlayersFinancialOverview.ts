import type { IFinanceRepository, IOperatingExpenseRepository } from '../domain/index.ts';

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
  totalOperatingExpenses: number;
  netPettyCashBalance: number;
  playerBalances: PlayerBalanceItem[];
}

export class GetAllPlayersFinancialOverviewUseCase {
  private readonly financeRepository: IFinanceRepository;
  private readonly expenseRepository?: IOperatingExpenseRepository;

  constructor(
    financeRepository: IFinanceRepository,
    expenseRepository?: IOperatingExpenseRepository
  ) {
    this.financeRepository = financeRepository;
    this.expenseRepository = expenseRepository;
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

    let totalOperatingExpenses = 0;
    if (this.expenseRepository) {
      try {
        const expenses = await this.expenseRepository.findAll();
        totalOperatingExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
      } catch (err) {
        console.warn('Could not fetch operating expenses for overview:', err);
      }
    }

    const totalTreasuryBalance = totalCreditsCollected - totalDebitsIssued;
    const netPettyCashBalance = totalCreditsCollected - totalOperatingExpenses;

    return {
      totalTreasuryBalance,
      totalOutstandingDebt,
      totalCreditsCollected,
      totalDebitsIssued,
      totalOperatingExpenses,
      netPettyCashBalance,
      playerBalances,
    };
  }
}

