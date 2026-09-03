import type { Match, Attendance, FinancialEntry } from './types.ts';

export interface IMatchRepository {
  findById(id: string): Promise<Match | null>;
  save(match: Match): Promise<void>;
  update(match: Match): Promise<void>;
}

export interface IAttendanceRepository {
  findByMatchId(matchId: string): Promise<Attendance[]>;
  save(attendance: Attendance): Promise<void>;
  update(attendance: Attendance): Promise<void>;
}

export interface IFinanceRepository {
  recordEntry(entry: FinancialEntry): Promise<void>;
  recordBatchEntries(entries: FinancialEntry[]): Promise<void>;
  getEntriesByPlayerId(playerId: string): Promise<FinancialEntry[]>;
  getPlayerBalance(playerId: string): Promise<number>;
}
