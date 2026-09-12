import type { FinancialEntry, IFinanceRepository } from '../../../core/domain/index.ts';

export class InMemoryFinanceRepository implements IFinanceRepository {
  private entries: FinancialEntry[];

  constructor(initialEntries: FinancialEntry[] = []) {
    this.entries = initialEntries.map((e) => ({ ...e }));
  }

  async recordEntry(entry: FinancialEntry): Promise<void> {
    this.entries.push({ ...entry });
  }

  async recordBatchEntries(entries: FinancialEntry[]): Promise<void> {
    this.entries.push(...entries.map((e) => ({ ...e })));
  }

  async getEntriesByPlayerId(playerId: string): Promise<FinancialEntry[]> {
    return this.entries
      .filter((e) => e.playerId === playerId)
      .map((e) => ({ ...e }));
  }

  async getEntriesByMatchId(matchId: string): Promise<FinancialEntry[]> {
    return this.entries
      .filter((e) => e.matchId === matchId)
      .map((e) => ({ ...e }));
  }

  async getAllEntries(): Promise<FinancialEntry[]> {
    return this.entries.map((e) => ({ ...e }));
  }

  async getPlayerBalance(playerId: string): Promise<number> {
    const playerEntries = await this.getEntriesByPlayerId(playerId);
    return playerEntries.reduce((acc, entry) => {
      if (entry.type === 'CREDIT') {
        return acc + entry.amount;
      }
      if (entry.type === 'DEBIT') {
        return acc - entry.amount;
      }
      return acc;
    }, 0);
  }

  // Helper for UI/testing
  async findAll(): Promise<FinancialEntry[]> {
    return this.entries.map((e) => ({ ...e }));
  }
}
