import type { FinancialEntry, IFinanceRepository } from '../domain/index.ts';

export interface PlayerFinancialStatement {
  playerId: string;
  entries: FinancialEntry[];
  totalCredits: number;
  totalDebits: number;
  netBalance: number;
  status: 'SOLVENT' | 'DEBTOR';
  debtAmount: number;
}

export class GetPlayerStatementUseCase {
  private readonly financeRepository: IFinanceRepository;

  constructor(financeRepository: IFinanceRepository) {
    this.financeRepository = financeRepository;
  }

  async execute(playerId: string): Promise<PlayerFinancialStatement> {
    const rawEntries = await this.financeRepository.getEntriesByPlayerId(playerId);

    // Sort chronologically (earliest to latest)
    const entries = [...rawEntries].sort(
      (a, b) => a.referenceDate.getTime() - b.referenceDate.getTime()
    );

    let totalCredits = 0;
    let totalDebits = 0;

    for (const entry of entries) {
      if (entry.type === 'CREDIT') {
        totalCredits += entry.amount;
      } else if (entry.type === 'DEBIT') {
        totalDebits += entry.amount;
      }
    }

    const netBalance = totalCredits - totalDebits;
    const isSolvent = netBalance >= 0;

    return {
      playerId,
      entries,
      totalCredits,
      totalDebits,
      netBalance,
      status: isSolvent ? 'SOLVENT' : 'DEBTOR',
      debtAmount: isSolvent ? 0 : Math.abs(netBalance),
    };
  }
}
