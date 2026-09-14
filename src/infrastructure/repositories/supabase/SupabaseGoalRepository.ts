import type { SupabaseClient } from '@supabase/supabase-js';
import type { GoalEvent, IGoalRepository, GoalType } from '../../../core/domain/index.ts';

interface GoalRow {
  id: string;
  match_id: string;
  player_id: string;
  minute: number | null;
  type: string;
  created_at: string;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function ensureUUID(id?: string | null): string {
  if (id && UUID_REGEX.test(id)) return id;
  return crypto.randomUUID();
}

export class SupabaseGoalRepository implements IGoalRepository {
  private client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  private mapRowToEntity(row: GoalRow): GoalEvent {
    return {
      id: row.id,
      matchId: row.match_id,
      playerId: row.player_id,
      minute: row.minute !== null && row.minute !== undefined ? Number(row.minute) : undefined,
      type: row.type as GoalType,
      createdAt: new Date(row.created_at),
    };
  }

  private mapEntityToRow(goal: GoalEvent): Partial<GoalRow> {
    const validId = ensureUUID(goal.id);
    goal.id = validId;
    return {
      id: validId,
      match_id: ensureUUID(goal.matchId),
      player_id: ensureUUID(goal.playerId),
      minute: goal.minute ?? null,
      type: goal.type,
      created_at: goal.createdAt ? goal.createdAt.toISOString() : new Date().toISOString(),
    };
  }

  async recordGoal(goal: GoalEvent): Promise<void> {
    const row = this.mapEntityToRow(goal);
    const { error } = await this.client.from('goal_events').insert(row);

    if (error) {
      throw new Error(`Failed to record goal event '${goal.id}': ${error.message}`);
    }
  }

  async findByMatchId(matchId: string): Promise<GoalEvent[]> {
    if (!matchId || !UUID_REGEX.test(matchId)) {
      return [];
    }
    try {
      const { data, error } = await this.client
        .from('goal_events')
        .select('*')
        .eq('match_id', matchId)
        .order('minute', { ascending: true, nullsFirst: false });

      if (error) {
        console.warn(`Supabase findByMatchId goals warning for '${matchId}':`, error.message);
        return [];
      }

      if (!data) return [];
      return (data as GoalRow[]).map((r) => this.mapRowToEntity(r));
    } catch (err) {
      console.warn(`Supabase findByMatchId goals exception for '${matchId}':`, err);
      return [];
    }
  }

  async findByPlayerId(playerId: string): Promise<GoalEvent[]> {
    if (!playerId || !UUID_REGEX.test(playerId)) {
      return [];
    }
    try {
      const { data, error } = await this.client
        .from('goal_events')
        .select('*')
        .eq('player_id', playerId)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn(`Supabase findByPlayerId goals warning for '${playerId}':`, error.message);
        return [];
      }

      if (!data) return [];
      return (data as GoalRow[]).map((r) => this.mapRowToEntity(r));
    } catch (err) {
      console.warn(`Supabase findByPlayerId goals exception for '${playerId}':`, err);
      return [];
    }
  }

  async getAll(): Promise<GoalEvent[]> {
    try {
      const { data, error } = await this.client
        .from('goal_events')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Supabase getAll goals warning:', error.message);
        return [];
      }

      if (!data) return [];
      return (data as GoalRow[]).map((r) => this.mapRowToEntity(r));
    } catch (err) {
      console.warn('Supabase getAll goals exception:', err);
      return [];
    }
  }

  async deleteGoal(id: string): Promise<void> {
    const { error } = await this.client.from('goal_events').delete().eq('id', id);

    if (error) {
      throw new Error(`Failed to delete goal event '${id}': ${error.message}`);
    }
  }
}
