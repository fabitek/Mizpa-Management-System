import type { SupabaseClient } from '@supabase/supabase-js';
import type { OperatingExpense, IOperatingExpenseRepository, ExpenseCategory } from '../../../core/domain/index.ts';

interface OperatingExpenseRow {
  id: string;
  category: string;
  description: string;
  amount: number | string;
  expense_date: string;
  receipt_url: string | null;
  recorded_by_player_id: string | null;
  match_id: string | null;
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

const globalExpenseCache = new Map<string, OperatingExpense>();

export class SupabaseOperatingExpenseRepository implements IOperatingExpenseRepository {
  private client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  private mapRowToEntity(row: OperatingExpenseRow): OperatingExpense {
    return {
      id: row.id,
      category: row.category as ExpenseCategory,
      description: row.description,
      amount: Number(row.amount),
      expenseDate: new Date(row.expense_date),
      receiptUrl: row.receipt_url ?? undefined,
      recordedByPlayerId: row.recorded_by_player_id ?? undefined,
      matchId: row.match_id ?? undefined,
      createdAt: new Date(row.created_at),
    };
  }

  private mapEntityToRow(expense: OperatingExpense): Partial<OperatingExpenseRow> {
    const validId = ensureUUID(expense.id);
    expense.id = validId;
    return {
      id: validId,
      category: expense.category,
      description: expense.description,
      amount: expense.amount,
      expense_date: expense.expenseDate.toISOString(),
      receipt_url: expense.receiptUrl ?? null,
      recorded_by_player_id: optionalUUID(expense.recordedByPlayerId),
      match_id: optionalUUID(expense.matchId),
      created_at: expense.createdAt.toISOString(),
    };
  }

  async recordExpense(expense: OperatingExpense): Promise<void> {
    globalExpenseCache.set(expense.id, { ...expense });
    const row = this.mapEntityToRow(expense);

    try {
      const { error } = await this.client.from('operating_expenses').insert(row);
      if (error) {
        console.warn(`Supabase recordExpense warning '${expense.id}': ${error.message}`);
      }
    } catch (err: any) {
      console.warn(`Supabase recordExpense exception '${expense.id}', cached locally:`, err.message);
    }
  }

  async findAll(): Promise<OperatingExpense[]> {
    try {
      const { data, error } = await this.client
        .from('operating_expenses')
        .select('*')
        .order('expense_date', { ascending: false });

      if (error) {
        console.warn('Supabase operating_expenses findAll warning:', error.message);
        return Array.from(globalExpenseCache.values()).sort(
          (a, b) => new Date(b.expenseDate).getTime() - new Date(a.expenseDate).getTime()
        );
      }

      if (!data) {
        return Array.from(globalExpenseCache.values());
      }

      const list = (data as OperatingExpenseRow[]).map((row) => this.mapRowToEntity(row));
      for (const item of list) {
        globalExpenseCache.set(item.id, item);
      }
      return list;
    } catch (err) {
      console.warn('Supabase operating_expenses findAll exception:', err);
      return Array.from(globalExpenseCache.values());
    }
  }

  async findByCategory(category: ExpenseCategory): Promise<OperatingExpense[]> {
    const all = await this.findAll();
    return all.filter((e) => e.category === category);
  }

  async findById(id: string): Promise<OperatingExpense | null> {
    const cached = globalExpenseCache.get(id);
    if (cached) return { ...cached };

    try {
      const { data, error } = await this.client
        .from('operating_expenses')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) {
        return null;
      }

      const entity = this.mapRowToEntity(data as OperatingExpenseRow);
      globalExpenseCache.set(entity.id, entity);
      return entity;
    } catch (err) {
      return null;
    }
  }

  async delete(id: string): Promise<void> {
    globalExpenseCache.delete(id);
    try {
      const { error } = await this.client.from('operating_expenses').delete().eq('id', id);
      if (error) {
        console.warn(`Supabase delete expense warning '${id}':`, error.message);
      }
    } catch (err) {
      console.warn(`Supabase delete expense exception '${id}':`, err);
    }
  }
}
