import type { FinancialEntry, IFinanceRepository } from '../../../core/domain/index.ts';
import { loadDB, saveDB } from './FileDB.ts';

export class InMemoryFinanceRepository implements IFinanceRepository {
  private entries: FinancialEntry[];

  constructor(initialEntries: FinancialEntry[] = []) {
    const db = loadDB();
    if (db && db.financialEntries && db.financialEntries.length > 0) {
      this.entries = db.financialEntries.map((e) => ({ ...e }));
    } else {
      this.entries = initialEntries.map((e) => ({ ...e }));
      saveDB({ financialEntries: this.entries });
    }
  }

  private persist() {
    saveDB({ financialEntries: this.entries });
  }

  async recordEntry(entry: FinancialEntry): Promise<void> {
    this.entries.push({ ...entry });
    this.persist();
  }

  async recordBatchEntries(entries: FinancialEntry[]): Promise<void> {
    this.entries.push(...entries.map((e) => ({ ...e })));
    this.persist();
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
