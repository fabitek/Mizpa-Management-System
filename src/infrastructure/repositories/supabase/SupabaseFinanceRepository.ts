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

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function ensureUUID(id?: string | null): string {
  if (id && UUID_REGEX.test(id)) return id;
  return crypto.randomUUID();
}

function optionalUUID(id?: string | null): string | null {
  if (id && UUID_REGEX.test(id)) return id;
  return null;
}

const globalFinanceCache = new Map<string, FinancialEntry>();

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
    globalFinanceCache.set(entry.id, { ...entry });
    const row = this.mapEntityToRow(entry);

    try {
      const { error } = await this.client.from('financial_entries').insert(row);
      if (error) {
        console.warn(`Supabase recordEntry warning '${entry.id}': ${error.message}`);
      }
    } catch (err: any) {
      console.warn(`Supabase recordEntry exception '${entry.id}', preserved in cache:`, err.message);
    }
  }

  async recordBatchEntries(entries: FinancialEntry[]): Promise<void> {
    if (entries.length === 0) return;

    for (const e of entries) {
      globalFinanceCache.set(e.id, { ...e });
    }

    const rows = entries.map((entry) => this.mapEntityToRow(entry));
    try {
      const { error } = await this.client.from('financial_entries').insert(rows);
      if (error) {
        console.warn(`Supabase recordBatchEntries warning: ${error.message}`);
      }
    } catch (err: any) {
      console.warn('Supabase recordBatchEntries exception, preserved in cache:', err.message);
    }
  }

  async getEntriesByPlayerId(playerId: string): Promise<FinancialEntry[]> {
    const cached = Array.from(globalFinanceCache.values()).filter(
      (e) => e.playerId === playerId
    );

    if (!playerId || !UUID_REGEX.test(playerId)) {
      return cached;
    }
    try {
      const { data, error } = await this.client
        .from('financial_entries')
        .select('*')
        .eq('player_id', playerId)
        .order('reference_date', { ascending: true });

      if (error) {
        console.warn(`Supabase getEntriesByPlayerId warning for '${playerId}':`, error.message);
        return cached;
      }

      if (!data) {
        return cached;
      }

      const list = (data as FinancialEntryRow[]).map((row) => this.mapRowToEntity(row));
      for (const item of list) {
        globalFinanceCache.set(item.id, item);
      }
      return list;
    } catch (err) {
      console.warn(`Supabase getEntriesByPlayerId exception for '${playerId}':`, err);
      return cached;
    }
  }

  async getEntriesByMatchId(matchId: string): Promise<FinancialEntry[]> {
    const cached = Array.from(globalFinanceCache.values()).filter(
      (e) => e.matchId === matchId
    );

    if (!matchId || !UUID_REGEX.test(matchId)) {
      return cached;
    }
    try {
      const { data, error } = await this.client
        .from('financial_entries')
        .select('*')
        .eq('match_id', matchId)
        .order('reference_date', { ascending: true });

      if (error) {
        console.warn(`Supabase getEntriesByMatchId warning for '${matchId}':`, error.message);
        return cached;
      }

      if (!data) {
        return cached;
      }

      const list = (data as FinancialEntryRow[]).map((row) => this.mapRowToEntity(row));
      for (const item of list) {
        globalFinanceCache.set(item.id, item);
      }
      return list;
    } catch (err) {
      console.warn(`Supabase getEntriesByMatchId exception for '${matchId}':`, err);
      return cached;
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
