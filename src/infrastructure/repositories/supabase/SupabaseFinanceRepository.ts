import type { SupabaseClient } from '@supabase/supabase-js';
import type { FinancialEntry, IFinanceRepository, FinancialEntryType } from '../../../core/domain/index.ts';

interface FinancialEntryRow {
  id: string;
  player_id: string;
  match_id: string | null;
  type: string;
  amount: number | string;
  reference_date: string;
  receipt_url: string | null;
  note: string | null;
  created_at: string;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function ensureUUID(id?: string | null): string {
  if (id && UUID_REGEX.test(id)) return id;
  return crypto.randomUUID();
}

function optionalUUID(id?: string | null): string | null {
  if (id && UUID_REGEX.test(id)) return id;
  return null;
}

export class SupabaseFinanceRepository implements IFinanceRepository {
  private client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  private mapRowToEntity(row: FinancialEntryRow): FinancialEntry {
    return {
      id: row.id,
      playerId: row.player_id,
      matchId: row.match_id,
      type: row.type as FinancialEntryType,
      amount: Number(row.amount),
      referenceDate: new Date(row.reference_date),
      receiptUrl: row.receipt_url ?? undefined,
      note: row.note ?? undefined,
      createdAt: new Date(row.created_at),
    };
  }

  private mapEntityToRow(entry: FinancialEntry): Partial<FinancialEntryRow> {
    const validId = ensureUUID(entry.id);
    entry.id = validId;
    return {
      id: validId,
      player_id: ensureUUID(entry.playerId),
      match_id: optionalUUID(entry.matchId),
      type: entry.type,
      amount: entry.amount,
      reference_date: entry.referenceDate.toISOString(),
      receipt_url: entry.receiptUrl ?? null,
      note: entry.note ?? null,
      created_at: entry.createdAt.toISOString(),
    };
  }

  async recordEntry(entry: FinancialEntry): Promise<void> {
    const row = this.mapEntityToRow(entry);
    const { error } = await this.client.from('financial_entries').insert(row);

    if (error) {
      throw new Error(
        `Failed to record financial entry '${entry.id}': ${error.message}`
      );
    }
  }

  async recordBatchEntries(entries: FinancialEntry[]): Promise<void> {
    if (entries.length === 0) return;

    const rows = entries.map((entry) => this.mapEntityToRow(entry));
    const { error } = await this.client.from('financial_entries').insert(rows);

    if (error) {
      throw new Error(
        `Failed to record batch financial entries: ${error.message}`
      );
    }
  }

  async getEntriesByPlayerId(playerId: string): Promise<FinancialEntry[]> {
    if (!playerId || !UUID_REGEX.test(playerId)) {
      return [];
    }
    try {
      const { data, error } = await this.client
        .from('financial_entries')
        .select('*')
        .eq('player_id', playerId)
        .order('reference_date', { ascending: true });

      if (error) {
        console.warn(`Supabase getEntriesByPlayerId warning for '${playerId}':`, error.message);
        return [];
      }

      if (!data) {
        return [];
      }

      return (data as FinancialEntryRow[]).map((row) => this.mapRowToEntity(row));
    } catch (err) {
      console.warn(`Supabase getEntriesByPlayerId exception for '${playerId}':`, err);
      return [];
    }
  }

  async getEntriesByMatchId(matchId: string): Promise<FinancialEntry[]> {
    if (!matchId || !UUID_REGEX.test(matchId)) {
      return [];
    }
    try {
      const { data, error } = await this.client
        .from('financial_entries')
        .select('*')
        .eq('match_id', matchId)
        .order('reference_date', { ascending: true });

      if (error) {
        console.warn(`Supabase getEntriesByMatchId warning for '${matchId}':`, error.message);
        return [];
      }

      if (!data) {
        return [];
      }

      return (data as FinancialEntryRow[]).map((row) => this.mapRowToEntity(row));
    } catch (err) {
      console.warn(`Supabase getEntriesByMatchId exception for '${matchId}':`, err);
      return [];
    }
  }

  async getAllEntries(): Promise<FinancialEntry[]> {
    try {
      const { data, error } = await this.client
        .from('financial_entries')
        .select('*')
        .order('reference_date', { ascending: false });

      if (error) {
        console.warn('Supabase getAllEntries warning:', error.message);
        return [];
      }

      if (!data) {
        return [];
      }

      return (data as FinancialEntryRow[]).map((row) => this.mapRowToEntity(row));
    } catch (err) {
      console.warn('Supabase getAllEntries exception:', err);
      return [];
    }
  }

  async getPlayerBalance(playerId: string): Promise<number> {
    try {
      const entries = await this.getEntriesByPlayerId(playerId);

      return entries.reduce((acc, entry) => {
        if (entry.type === 'CREDIT') {
          return acc + entry.amount;
        }
        if (entry.type === 'DEBIT') {
          return acc - entry.amount;
        }
        return acc;
      }, 0);
    } catch (err) {
      console.warn(`Supabase getPlayerBalance exception for '${playerId}':`, err);
      return 0;
    }
  }
}
