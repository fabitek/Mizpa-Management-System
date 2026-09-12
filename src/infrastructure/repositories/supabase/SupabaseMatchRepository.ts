import type { SupabaseClient } from '@supabase/supabase-js';
import type { Match, IMatchRepository, MatchStatus } from '../../../core/domain/index.ts';

interface MatchRow {
  id: string;
  date: string;
  location: string;
  pitch_rental_cost: number | string;
  extra_costs: number | string;
  max_players: number;
  settled_fee_per_player: number | string | null;
  status: string;
  mvp_player_id?: string | null;
  created_at: string;
  updated_at: string;
}

export class SupabaseMatchRepository implements IMatchRepository {
  private client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  private mapRowToEntity(row: MatchRow): Match {
    return {
      id: row.id,
      date: new Date(row.date),
      location: row.location,
      pitchRentalCost: Number(row.pitch_rental_cost),
      extraCosts: Number(row.extra_costs),
      maxPlayers: Number(row.max_players),
      settledFeePerPlayer:
        row.settled_fee_per_player !== null && row.settled_fee_per_player !== undefined
          ? Number(row.settled_fee_per_player)
          : null,
      status: row.status as MatchStatus,
      mvpPlayerId: row.mvp_player_id ?? null,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private mapEntityToRow(match: Match): Partial<MatchRow> {
    return {
      id: match.id,
      date: match.date.toISOString(),
      location: match.location,
      pitch_rental_cost: match.pitchRentalCost,
      extra_costs: match.extraCosts,
      max_players: match.maxPlayers,
      settled_fee_per_player: match.settledFeePerPlayer,
      status: match.status,
      mvp_player_id: match.mvpPlayerId ?? null,
      created_at: match.createdAt.toISOString(),
      updated_at: match.updatedAt.toISOString(),
    };
  }

  async findById(id: string): Promise<Match | null> {
    const { data, error } = await this.client
      .from('matches')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to find match by ID '${id}': ${error.message}`);
    }

    if (!data) {
      return null;
    }

    return this.mapRowToEntity(data as MatchRow);
  }

  async save(match: Match): Promise<void> {
    const row = this.mapEntityToRow(match);
    const { error } = await this.client.from('matches').insert(row);

    if (error) {
      throw new Error(`Failed to save match '${match.id}': ${error.message}`);
    }
  }

  async update(match: Match): Promise<void> {
    const row = this.mapEntityToRow(match);
    const { error } = await this.client
      .from('matches')
      .update(row)
      .eq('id', match.id);

    if (error) {
      throw new Error(`Failed to update match '${match.id}': ${error.message}`);
    }
  }

  async findAll(): Promise<Match[]> {
    const { data, error } = await this.client
      .from('matches')
      .select('*')
      .order('date', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch matches: ${error.message}`);
    }

    return (data as MatchRow[]).map((row) => this.mapRowToEntity(row));
  }
}
