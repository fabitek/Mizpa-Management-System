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
    return {
      id: goal.id,
      match_id: goal.matchId,
      player_id: goal.playerId,
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
    const { data, error } = await this.client
      .from('goal_events')
      .select('*')
      .eq('match_id', matchId)
      .order('minute', { ascending: true, nullsFirst: false });

    if (error) {
      throw new Error(`Failed to fetch goals for match '${matchId}': ${error.message}`);
    }

    if (!data) return [];
    return (data as GoalRow[]).map((r) => this.mapRowToEntity(r));
  }

  async findByPlayerId(playerId: string): Promise<GoalEvent[]> {
    const { data, error } = await this.client
      .from('goal_events')
      .select('*')
      .eq('player_id', playerId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch goals for player '${playerId}': ${error.message}`);
    }

    if (!data) return [];
    return (data as GoalRow[]).map((r) => this.mapRowToEntity(r));
  }

  async getAll(): Promise<GoalEvent[]> {
    const { data, error } = await this.client
      .from('goal_events')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch all goals: ${error.message}`);
    }

    if (!data) return [];
    return (data as GoalRow[]).map((r) => this.mapRowToEntity(r));
  }

  async deleteGoal(id: string): Promise<void> {
    const { error } = await this.client.from('goal_events').delete().eq('id', id);

    if (error) {
      throw new Error(`Failed to delete goal event '${id}': ${error.message}`);
    }
  }
}
